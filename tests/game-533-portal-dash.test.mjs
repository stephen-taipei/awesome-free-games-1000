import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';

const source = fs.readFileSync('src/games/runner/game-533-portal-dash/logic.ts', 'utf8');
const js = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;
const logic = await import('data:text/javascript;base64,' + Buffer.from(js).toString('base64'));
const { TAU, PORTAL_EVERY, TURN_SPEED, PLAYER_HALF_ANGLE, OBSTACLE_DEPTH, wrap, overlaps, isSolid, arcAngleAt, syncRings, createGenerator, nextRow } = logic;

function seeded(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = Math.imul(a ^ (a >>> 15), a | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

test('wrap keeps angles in (-PI, PI]', () => {
  for (const a of [0, 1, -1, 7, -7, 100, -100]) {
    const w = wrap(a);
    assert.ok(w > -Math.PI - 1e-9 && w <= Math.PI + 1e-9);
    assert.ok(Math.abs(Math.sin(w) - Math.sin(a)) < 1e-9 && Math.abs(Math.cos(w) - Math.cos(a)) < 1e-9);
  }
});

test('overlap respects the arc span across the seam', () => {
  assert.equal(overlaps(Math.PI - 0.05, -Math.PI + 0.05, 0.3), true);
  assert.equal(overlaps(0, 1, 0.5), false);
  assert.equal(overlaps(123, 0, TAU), true);
});

test('walls in the player colour are phantoms', () => {
  const arc = { kind: 'arc', angle: 0, span: 1, phase: 1, spin: 0 };
  assert.equal(isSolid(arc, 1), false);
  assert.equal(isSolid(arc, 0), true);
});

test('every generated row leaves a gap the player can reach by steering alone', () => {
  for (const seed of [1, 2, 3, 42, 2026]) {
    const random = seeded(seed);
    const state = createGenerator();
    let previousGap = state.gapAngle;
    let expected = 0;
    for (let i = 0; i < 400; i++) {
      const speed = Math.min(62, 24 + i * 0.1);
      const row = nextRow(state, speed, random);
      const arcs = row.pieces.filter(p => p.kind === 'arc');
      if (row.pieces.some(p => p.kind === 'portal')) { expected = 1 - expected; continue; }
      const ring = arcs.find(a => a.span >= TAU - 1e-6);
      if (ring) { assert.equal(ring.phase, expected, 'closed rings match the phase the last portal gave'); continue; }
      // Some angle inside the reachable window must be free of every block (spinning blades at the angle they reach the player).
      const window = TURN_SPEED * (row.spacing / speed);
      let free = false;
      for (let k = -40; k <= 40 && !free; k++) {
        const angle = previousGap + (k / 40) * window;
        if (!arcs.some(a => overlaps(angle, a.angle, a.span, PLAYER_HALF_ANGLE))) free = true;
      }
      assert.ok(free, `row ${state.row} (seed ${seed}) has no reachable gap`);
      previousGap = state.gapAngle;
    }
  }
});

test('at top speed every row stays reachable by keyboard steering, spinning blades included', () => {
  // Sweeps the set of reachable ship angles row by row at the top speed (62), for many seeds. Between rows the
  // set grows by what keyboard steering covers from a standstill (steer() ramps up at damp(14)); every non-ring
  // block removes what it covers while it passes the ship (game.ts interact(): |z| < OBSTACLE_DEPTH / 2 + 0.45,
  // plus one 1/20 s frame of travel), with spinning blades turning as they pass.
  const SPEED = 62;
  const BINS = 720;
  const STEP = TAU / BINS;
  const HULL = OBSTACLE_DEPTH / 2 + 0.45;
  const turned = t => TURN_SPEED * (t - (1 - Math.exp(-14 * t)) / 14);
  for (let seed = 1; seed <= 100; seed++) {
    const random = seeded(seed);
    const state = createGenerator();
    let reach = new Uint8Array(BINS);
    reach[Math.round((state.gapAngle + Math.PI) / STEP)] = 1;
    let distance = 34; // the first row spawns 34 ahead of the ship
    for (let i = 0; i < 400; i++) {
      const row = nextRow(state, SPEED, random);
      const k = Math.floor(turned(distance / SPEED) / STEP);
      // A bin is reachable when a reachable bin lies within k of it, either way round the circle.
      const grown = new Uint8Array(BINS);
      for (let j = 0, last = -Infinity; j < 2 * BINS; j++) { if (reach[j % BINS]) last = j; if (j - last <= k) grown[j % BINS] = 1; }
      for (let j = 2 * BINS - 1, next = Infinity; j >= 0; j--) { if (reach[j % BINS]) next = j; if (next - j <= k) grown[j % BINS] = 1; }
      reach = grown;
      for (const arc of row.pieces) {
        if (arc.kind !== 'arc' || arc.span >= TAU - 1e-6) continue; // closed rings match the player's phase
        const from = arcAngleAt(arc, -HULL);
        const sweep = wrap(arcAngleAt(arc, HULL + SPEED / 20) - from);
        for (let j = 0; j < BINS; j++) if (reach[j] && overlaps(-Math.PI + j * STEP, from + sweep / 2, arc.span + Math.abs(sweep))) reach[j] = 0;
      }
      assert.ok(reach.some(Boolean), `row ${state.row} (seed ${seed}) cannot be reached at top speed`);
      distance = row.spacing;
    }
  }
});

test('flip once before the portal: the closed ring after it is still passable', () => {
  for (const flipRows of [[1], [3, 20], [5, 18, 40], []]) {
    const state = createGenerator();
    const random = seeded(11);
    const pieces = [];
    const flipsAt = new Set();
    for (let i = 0; i < PORTAL_EVERY * 4; i++) {
      if (flipRows.includes(state.row + 1)) flipsAt.add(pieces.length);
      pieces.push(...nextRow(state, 40, random).pieces);
    }
    let phase = 0;
    let rings = 0;
    pieces.forEach((piece, i) => {
      if (flipsAt.has(i)) phase = 1 - phase; // a manual flip just before this row
      if (piece.kind === 'portal') {
        phase = 1 - phase;
        syncRings(pieces.slice(i + 1), phase);
      } else if (piece.kind === 'arc' && piece.span >= TAU - 1e-6) {
        rings++;
        assert.equal(isSolid(piece, phase), false, `ring ${rings} is solid after manual flips at rows ${flipRows}`);
      }
    });
    assert.equal(rings, 3);
  }
  // Without the sync, one manual flip before the first portal leaves the generator's ring solid.
  const state = createGenerator();
  const random = seeded(11);
  const rows = Array.from({ length: PORTAL_EVERY + 2 }, () => nextRow(state, 40, random));
  const ring = rows[PORTAL_EVERY + 1].pieces[0];
  const playerPhase = 0; // flipped by hand to 1, then the portal flips it back to 0
  assert.equal(isSolid(ring, playerPhase), true);
  syncRings(rows.slice(PORTAL_EVERY).flatMap(row => row.pieces), playerPhase);
  assert.equal(isSolid(ring, playerPhase), false);
});

test('syncRings stops at the next portal', () => {
  const ring = phase => ({ kind: 'arc', angle: 0, span: TAU, phase, spin: 0 });
  const block = { kind: 'arc', angle: 0, span: 1, phase: 1, spin: 0 };
  const ahead = [ring(1), block, { kind: 'portal' }, ring(1)];
  syncRings(ahead, 0);
  assert.deepEqual(ahead.map(p => p.phase), [0, 1, undefined, 1]);
});

test('a spinning blade is back at its generated angle when it reaches the ship, at any speed', () => {
  const arc = { kind: 'arc', angle: 0.4, span: 1.5, phase: 0, spin: 0.03 };
  for (const speed of [24, 40, 62]) {
    // As in game.ts: spawned about 190 ahead at arcAngleAt, then turned by spin * travel each frame.
    let z = -190;
    let angle = arcAngleAt(arc, z);
    while (z < 0) { const travel = Math.min(-z, speed / 60); z += travel; angle = wrap(angle + arc.spin * travel); }
    assert.ok(Math.abs(wrap(angle - arc.angle)) < 1e-9);
  }
});

test('portals arrive on a fixed cadence and advance the sector', () => {
  const state = createGenerator();
  const random = seeded(7);
  let portals = 0;
  for (let i = 0; i < PORTAL_EVERY * 5; i++) if (nextRow(state, 30, random).pieces.some(p => p.kind === 'portal')) portals++;
  assert.equal(portals, 5);
  assert.equal(state.sector, 6);
});
