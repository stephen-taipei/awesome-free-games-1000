import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';

const source = fs.readFileSync('src/games/horror/game-589-backrooms-escape/logic.ts', 'utf8');
const js = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;
const logic = await import('data:text/javascript;base64,' + Buffer.from(js).toString('base64'));
const {
  TILE, ITEMS_PER_LEVEL, PLAYER_RADIUS, STAMINA_RECOVER, generateLevel, levelParams, isWall, distances, findPath,
  resolveCircle, lineOfSight, raycast, createStamina, stepStamina, canHear, canSee, sightRange, noiseRadius,
  createEntity, think, moveEntity, tileCenter, index,
} = logic;

function seeded(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = Math.imul(a ^ (a >>> 15), a | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

test('levels are enclosed, fully connected and place every objective on reachable floor', () => {
  for (const seed of [1, 7, 42, 2026, 99991]) {
    for (const number of [1, 2, 4, 7]) {
      const level = generateLevel(number, seeded(seed));
      const { size } = level;
      for (let i = 0; i < size; i++) {
        assert.ok(isWall(level, i, 0) && isWall(level, i, size - 1) && isWall(level, 0, i) && isWall(level, size - 1, i), 'border is solid');
      }
      const dist = distances(level, level.start);
      for (const f of level.floors) assert.ok(dist[f] >= 0, `floor ${f} unreachable (seed ${seed}, level ${number})`);
      assert.equal(level.items.length, ITEMS_PER_LEVEL);
      const spots = [level.start, level.exit, ...level.items, ...level.batteries].map(t => index(size, t.x, t.y));
      assert.equal(new Set(spots).size, spots.length, 'objectives never share a tile');
      for (const t of [level.exit, ...level.items, ...level.batteries, ...level.spawns]) assert.equal(isWall(level, t.x, t.y), false);
      assert.equal(isWall(level, level.exit.x + level.exit.dx, level.exit.y + level.exit.dy), true, 'the door is set into a wall');
      assert.equal(level.spawns.length, levelParams(number).entities);
    }
  }
});

test('generation is reproducible from the seed, and deeper levels are larger and darker', () => {
  const a = generateLevel(3, seeded(5));
  const b = generateLevel(3, seeded(5));
  assert.deepEqual(Array.from(a.grid), Array.from(b.grid));
  assert.deepEqual(a.items, b.items);
  const shallow = levelParams(1), deep = levelParams(5);
  assert.ok(deep.cells > shallow.cells);
  assert.ok(deep.litRatio < shallow.litRatio && deep.ambient < shallow.ambient && deep.fogFar < shallow.fogFar);
  assert.ok(deep.chaseSpeed > shallow.chaseSpeed);
});

test('the player circle cannot pass through a wall tile', () => {
  const level = { size: 3, grid: Uint8Array.from([1, 1, 1, 1, 0, 1, 1, 1, 1]) };
  const pos = { x: TILE * 1.5, z: TILE * 1.5 };
  for (let i = 0; i < 200; i++) { pos.x += 0.1; resolveCircle(level, pos, PLAYER_RADIUS); }
  assert.ok(pos.x <= TILE * 2 - PLAYER_RADIUS + 1e-6, `stopped at the wall, x=${pos.x}`);
  assert.ok(Math.abs(pos.z - TILE * 1.5) < 1e-6);
});

test('walls block line of sight and rays report the face they hit', () => {
  // A row of three open tiles with a wall in the middle of the second row.
  const level = { size: 5, grid: Uint8Array.from([
    1, 1, 1, 1, 1,
    1, 0, 0, 0, 1,
    1, 0, 1, 0, 1,
    1, 0, 0, 0, 1,
    1, 1, 1, 1, 1,
  ]) };
  assert.equal(lineOfSight(level, tileCenter(1), tileCenter(1), tileCenter(3), tileCenter(1)), true);
  assert.equal(lineOfSight(level, tileCenter(1), tileCenter(2), tileCenter(3), tileCenter(2)), false);
  const hit = { dist: 0, nx: 0, nz: 0 };
  assert.equal(raycast(level, tileCenter(1), tileCenter(2), 1, 0, 10, hit), true);
  assert.ok(Math.abs(hit.dist - TILE / 2) < 1e-9);
  assert.deepEqual([hit.nx, hit.nz], [-1, 0]);
  assert.equal(raycast(level, tileCenter(1), tileCenter(1), 1, 0, 1, hit), false, 'nothing within reach');
});

test('paths follow open tiles one step at a time', () => {
  const level = generateLevel(2, seeded(11));
  const from = index(level.size, level.start.x, level.start.y);
  const to = index(level.size, level.exit.x, level.exit.y);
  const path = findPath(level, from, to);
  assert.equal(path.length, distances(level, level.start)[to]);
  let prev = from;
  for (const step of path) {
    assert.equal(level.grid[step], 0);
    const dx = Math.abs((step % level.size) - (prev % level.size));
    const dy = Math.abs(Math.floor(step / level.size) - Math.floor(prev / level.size));
    assert.equal(dx + dy, 1);
    prev = step;
  }
});

test('sprinting drains stamina and exhaustion blocks it until partly refilled', () => {
  const s = createStamina();
  let t = 0;
  while (stepStamina(s, true, true, 0.05)) t += 0.05;
  assert.ok(t > 3 && t < 6, `about four seconds of sprint, got ${t}`);
  assert.equal(s.exhausted, true);
  assert.equal(stepStamina(s, true, true, 0.05), false, 'cannot sprint while exhausted');
  for (let i = 0; i < 400 && s.exhausted; i++) stepStamina(s, false, false, 0.05);
  assert.equal(s.exhausted, false);
  assert.ok(s.value >= STAMINA_RECOVER);
});

test('sprinting is heard far away, walking only up close; the flashlight makes you visible from further', () => {
  const level = { size: 12, grid: new Uint8Array(144).fill(0) };
  for (let i = 0; i < 12; i++) { level.grid[i] = level.grid[132 + i] = level.grid[i * 12] = level.grid[i * 12 + 11] = 1; }
  const p = levelParams(1);
  const ex = tileCenter(1), ez = tileCenter(5), px = tileCenter(5), pz = tileCenter(5);
  assert.equal(canHear(level, ex, ez, px, pz, noiseRadius(true, true, p)), true);
  assert.equal(canHear(level, ex, ez, px, pz, noiseRadius(false, true, p)), false);
  assert.equal(canHear(level, ex, ez, px, pz, noiseRadius(false, false, p)), false);
  const d = px - ex;
  assert.ok(d > sightRange(false, p) && d < sightRange(true, p));
  assert.equal(canSee(level, ex, ez, px, pz, sightRange(true, p)), true);
  assert.equal(canSee(level, ex, ez, px, pz, sightRange(false, p)), false);
});

test('the entity hunts a visible player down and gives up after losing them', () => {
  const level = generateLevel(1, seeded(3));
  const p = levelParams(1);
  const random = seeded(9);
  const e = createEntity(level.spawns[0], 0);
  const player = { x: tileCenter(level.start.x), z: tileCenter(level.start.y) };
  const fromPlayer = distances(level, level.start);
  const gap = () => fromPlayer[index(level.size, Math.floor(e.x / TILE), Math.floor(e.z / TILE))];
  const before = gap();
  let signal = think(e, level, p, { sees: true, hears: false, px: player.x, pz: player.z }, 0.05, random);
  assert.equal(signal, 'spotted');
  for (let i = 0; i < 40; i++) {
    think(e, level, p, { sees: true, hears: false, px: player.x, pz: player.z }, 0.05, random);
    moveEntity(e, level, p, { sees: true, hears: false, px: player.x, pz: player.z }, 0.05);
  }
  assert.ok(gap() <= before - 2, `closes in along the maze (${before} -> ${gap()} tiles)`);
  const signals = [];
  for (let i = 0; i < 80; i++) signals.push(think(e, level, p, { sees: false, hears: false, px: player.x, pz: player.z }, 0.05, random));
  assert.ok(signals.includes('lost'));
  assert.notEqual(e.mode, 'chase');
});
