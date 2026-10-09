/**
 * Pure rules for Backrooms Escape: maze generation, grid collision, line of sight, stamina and the
 * entity's senses and pursuit. No DOM or three.js, so tests can import it directly.
 *
 * The level is a square tile grid (1 = wall, 0 = floor). Tile (x, y) covers world x in
 * [x * TILE, (x + 1) * TILE] and world z in [y * TILE, (y + 1) * TILE].
 */

export const TILE = 2.6;
export const WALL_HEIGHT = 3;
export const EYE_HEIGHT = 1.62;
export const PLAYER_RADIUS = 0.32;
export const WALK_SPEED = 3.1;
export const SPRINT_SPEED = 5.5;
export const ITEMS_PER_LEVEL = 3;
export const PICKUP_RADIUS = 1.05;
export const EXIT_RADIUS = 1.35;
export const CATCH_DISTANCE = 0.95;
export const BATTERY_REFILL = 0.45;
export const STAMINA_DRAIN = 0.24;
export const STAMINA_REGEN = 0.17;
export const STAMINA_RECOVER = 0.35;
export const WALK_NOISE = 2.6;

export type Random = () => number;
export interface Tile { x: number; y: number; }
export interface Door extends Tile { dx: number; dy: number; }
export interface Panel extends Tile { lit: boolean; flicker: boolean; }

export interface LevelParams {
  cells: number;
  litRatio: number;
  flickerRatio: number;
  ambient: number;
  fogFar: number;
  batteries: number;
  entities: number;
  patrolSpeed: number;
  searchSpeed: number;
  chaseSpeed: number;
  hearSprint: number;
  sightLight: number;
  sightDark: number;
  /** Fraction of a full battery the flashlight burns per second. */
  drain: number;
  /** Chance that a patrol leg heads for the player's neighbourhood. */
  pressure: number;
}

/** Each cleared level is larger and darker, and the entity gets faster and keener. */
export function levelParams(level: number): LevelParams {
  const d = Math.max(0, Math.floor(level) - 1);
  return {
    cells: Math.min(17, 7 + d * 2),
    litRatio: Math.max(0.2, 0.9 - d * 0.13),
    flickerRatio: Math.min(0.4, 0.1 + d * 0.06),
    ambient: Math.max(0.06, 0.5 - d * 0.09),
    fogFar: Math.max(11, 30 - d * 3.6),
    batteries: Math.min(5, 2 + Math.floor((d + 1) / 2)),
    entities: level >= 5 ? 2 : 1,
    patrolSpeed: 1.5 + Math.min(0.9, d * 0.15),
    searchSpeed: 2.6 + Math.min(0.9, d * 0.15),
    chaseSpeed: Math.min(5.0, 3.95 + d * 0.2),
    hearSprint: 14 + Math.min(8, d * 1.6),
    sightLight: 20 + Math.min(6, d),
    sightDark: 8.5 + Math.min(3, d * 0.5),
    drain: 0.0115 + Math.min(0.008, d * 0.0015),
    pressure: Math.min(0.65, 0.3 + d * 0.07),
  };
}

export interface Level {
  number: number;
  size: number;
  grid: Uint8Array;
  floors: number[];
  start: Tile;
  startYaw: number;
  items: Tile[];
  batteries: Tile[];
  exit: Door;
  spawns: Tile[];
  panels: Panel[];
}

const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]] as const;

export const index = (size: number, x: number, y: number) => y * size + x;

export function isWall(level: Pick<Level, 'size' | 'grid'>, x: number, y: number): boolean {
  if (x < 0 || y < 0 || x >= level.size || y >= level.size) return true;
  return level.grid[y * level.size + x] === 1;
}

export const tileCenter = (t: number) => (t + 0.5) * TILE;
export const toTile = (world: number) => Math.floor(world / TILE);

/** Camera yaw that looks along tile direction (dx, dy); forward is (-sin yaw, -cos yaw) in (x, z). */
export const yawFor = (dx: number, dy: number) => Math.atan2(-dx, -dy);

/** Breadth-first step distances from one tile; -1 marks walls and unreachable tiles. */
export function distances(level: Pick<Level, 'size' | 'grid'>, from: Tile): Int32Array {
  const { size } = level;
  const dist = new Int32Array(size * size).fill(-1);
  if (isWall(level, from.x, from.y)) return dist;
  const queue = new Int32Array(size * size);
  let head = 0, tail = 0;
  const start = index(size, from.x, from.y);
  dist[start] = 0;
  queue[tail++] = start;
  while (head < tail) {
    const current = queue[head++];
    const x = current % size, y = (current - x) / size;
    for (const [dx, dy] of DIRS) {
      const nx = x + dx, ny = y + dy;
      if (isWall(level, nx, ny)) continue;
      const next = index(size, nx, ny);
      if (dist[next] !== -1) continue;
      dist[next] = dist[current] + 1;
      queue[tail++] = next;
    }
  }
  return dist;
}

/** Shortest tile path (as grid indices, excluding `from`, ending at `to`), or [] when unreachable. */
export function findPath(level: Pick<Level, 'size' | 'grid'>, from: number, to: number): number[] {
  const { size } = level;
  if (from === to) return [];
  const prev = new Int32Array(size * size).fill(-1);
  const queue = new Int32Array(size * size);
  let head = 0, tail = 0;
  prev[from] = from;
  queue[tail++] = from;
  while (head < tail) {
    const current = queue[head++];
    if (current === to) break;
    const x = current % size, y = (current - x) / size;
    for (const [dx, dy] of DIRS) {
      const nx = x + dx, ny = y + dy;
      if (isWall(level, nx, ny)) continue;
      const next = index(size, nx, ny);
      if (prev[next] !== -1) continue;
      prev[next] = current;
      queue[tail++] = next;
    }
  }
  if (prev[to] === -1) return [];
  const path: number[] = [];
  for (let at = to; at !== from; at = prev[at]) path.push(at);
  return path.reverse();
}

/** Distance from a tile to the nearest wall when looking along (dx, dy), in tiles. */
function openRun(level: Pick<Level, 'size' | 'grid'>, t: Tile, dx: number, dy: number): number {
  let run = 0;
  while (!isWall(level, t.x + dx * (run + 1), t.y + dy * (run + 1))) run++;
  return run;
}

function pick<T>(list: readonly T[], random: Random): T {
  return list[Math.min(list.length - 1, Math.floor(random() * list.length))];
}

/**
 * Builds one level: a recursive-backtracker maze on odd tiles, braided with extra openings so there
 * are loops to lose the entity in, plus a few open "office halls" studded with pillars.
 */
export function generateLevel(levelNumber: number, random: Random): Level {
  const params = levelParams(levelNumber);
  const cells = params.cells;
  const size = cells * 2 + 1;
  const grid = new Uint8Array(size * size).fill(1);
  const open = (x: number, y: number) => { grid[index(size, x, y)] = 0; };

  // 1. Perfect maze.
  const visited = new Uint8Array(cells * cells);
  const stack: number[] = [];
  const first = Math.floor(random() * cells * cells);
  visited[first] = 1;
  stack.push(first);
  open((first % cells) * 2 + 1, Math.floor(first / cells) * 2 + 1);
  const options: number[] = [];
  while (stack.length) {
    const current = stack[stack.length - 1];
    const cx = current % cells, cy = (current - cx) / cells;
    options.length = 0;
    for (let d = 0; d < 4; d++) {
      const nx = cx + DIRS[d][0], ny = cy + DIRS[d][1];
      if (nx >= 0 && ny >= 0 && nx < cells && ny < cells && !visited[ny * cells + nx]) options.push(d);
    }
    if (!options.length) { stack.pop(); continue; }
    const d = pick(options, random);
    const nx = cx + DIRS[d][0], ny = cy + DIRS[d][1];
    open(cx * 2 + 1 + DIRS[d][0], cy * 2 + 1 + DIRS[d][1]);
    open(nx * 2 + 1, ny * 2 + 1);
    visited[ny * cells + nx] = 1;
    stack.push(ny * cells + nx);
  }

  // 2. Braid: knock through some separating walls to create loops.
  for (let y = 1; y < size - 1; y++) {
    for (let x = 1; x < size - 1; x++) {
      if (grid[index(size, x, y)] !== 1 || (x % 2) === (y % 2)) continue;
      const horizontal = x % 2 === 0;
      const a = horizontal ? grid[index(size, x - 1, y)] : grid[index(size, x, y - 1)];
      const b = horizontal ? grid[index(size, x + 1, y)] : grid[index(size, x, y + 1)];
      if (a === 0 && b === 0 && random() < 0.2) open(x, y);
    }
  }

  // 3. Open halls with pillars. Clearing only removes walls, so the maze stays connected,
  // and pillars only go on lattice posts (even, even), which never separate two cells.
  const halls = 1 + Math.floor(cells / 4);
  for (let h = 0; h < halls; h++) {
    const w = 3 + Math.floor(random() * 4);
    const hh = 3 + Math.floor(random() * 3);
    const x0 = 1 + Math.floor(random() * (size - 2 - w));
    const y0 = 1 + Math.floor(random() * (size - 2 - hh));
    for (let y = y0; y < y0 + hh; y++) for (let x = x0; x < x0 + w; x++) open(x, y);
    for (let y = y0 + 1; y < y0 + hh - 1; y++) {
      for (let x = x0 + 1; x < x0 + w - 1; x++) {
        if (x % 2 === 0 && y % 2 === 0 && random() < 0.6) grid[index(size, x, y)] = 1;
      }
    }
  }

  const level: Level = {
    number: levelNumber, size, grid, floors: [], start: { x: 1, y: 1 }, startYaw: 0,
    items: [], batteries: [], exit: { x: 1, y: 1, dx: 0, dy: -1 }, spawns: [], panels: [],
  };
  for (let i = 0; i < grid.length; i++) if (grid[i] === 0) level.floors.push(i);

  // 4. Start on a random cell; face the longest open run.
  const startCell = Math.floor(random() * cells * cells);
  level.start = { x: (startCell % cells) * 2 + 1, y: Math.floor(startCell / cells) * 2 + 1 };
  let bestRun = -1;
  for (const [dx, dy] of DIRS) {
    const run = openRun(level, level.start, dx, dy);
    if (run > bestRun) { bestRun = run; level.startYaw = yawFor(dx, dy); }
  }

  const dist = distances(level, level.start);
  let maxDist = 0;
  for (const i of level.floors) maxDist = Math.max(maxDist, dist[i]);
  const tileAt = (i: number): Tile => ({ x: i % size, y: Math.floor(i / size) });
  const startIndex = index(size, level.start.x, level.start.y);
  const used = new Set<number>([startIndex]);

  // 5. Exit door: a far dead end if possible, the door set into the wall opposite the opening.
  const exitCandidates: number[] = [];
  const deadEnds: number[] = [];
  for (let reach = 0.7; !exitCandidates.length && reach >= 0; reach -= 0.35) {
    for (const i of level.floors) {
      if (i === startIndex || dist[i] < maxDist * reach) continue;
      const t = tileAt(i);
      let walls = 0;
      for (const [dx, dy] of DIRS) if (isWall(level, t.x + dx, t.y + dy)) walls++;
      if (walls === 3) deadEnds.push(i);
      if (walls >= 1) exitCandidates.push(i);
    }
  }
  const exitIndex = pick(deadEnds.length ? deadEnds : exitCandidates, random);
  const exitTile = tileAt(exitIndex);
  const wallDirs = DIRS.filter(([dx, dy]) => isWall(level, exitTile.x + dx, exitTile.y + dy));
  const openDir = DIRS.find(([dx, dy]) => !isWall(level, exitTile.x + dx, exitTile.y + dy));
  let doorDir: readonly [number, number] = wallDirs.length ? pick(wallDirs, random) : DIRS[3];
  if (openDir && wallDirs.some(([dx, dy]) => dx === -openDir[0] && dy === -openDir[1])) doorDir = [-openDir[0], -openDir[1]];
  level.exit = { x: exitTile.x, y: exitTile.y, dx: doorDir[0], dy: doorDir[1] };
  used.add(exitIndex);

  // 6. Almond water: far from the start and spread apart from each other and the exit.
  const near = (i: number, r: number) => {
    const t = tileAt(i);
    for (const u of used) {
      const o = tileAt(u);
      if (Math.abs(o.x - t.x) + Math.abs(o.y - t.y) < r) return true;
    }
    return false;
  };
  const itemPool = level.floors.filter(i => dist[i] >= Math.max(4, maxDist * 0.3) && !used.has(i));
  for (let k = 0; k < ITEMS_PER_LEVEL; k++) {
    const pool = itemPool.filter(i => !used.has(i));
    const source = pool.length ? pool : level.floors.filter(i => !used.has(i));
    // Score each candidate by its distance to everything already placed; pick among the best few.
    const scored = source.map(i => {
      const t = tileAt(i);
      let nearest = Infinity;
      for (const u of used) {
        if (u === startIndex) continue;
        const o = tileAt(u);
        nearest = Math.min(nearest, Math.hypot(o.x - t.x, o.y - t.y));
      }
      return { i, score: nearest + random() * 2 };
    }).sort((a, b) => b.score - a.score);
    const chosen = scored[Math.floor(random() * Math.min(6, scored.length))].i;
    level.items.push(tileAt(chosen));
    used.add(chosen);
  }

  // 7. Spare batteries.
  const batteryPool = level.floors.filter(i => dist[i] >= 3);
  for (let tries = 0; level.batteries.length < params.batteries && tries < 400; tries++) {
    const i = pick(batteryPool.length ? batteryPool : level.floors, random);
    if (used.has(i) || near(i, 3)) continue;
    level.batteries.push(tileAt(i));
    used.add(i);
  }

  // 8. Entity spawns: deep in the maze, away from the player.
  const spawnPool = level.floors.filter(i => dist[i] >= Math.max(8, maxDist * 0.6));
  for (let e = 0; e < params.entities; e++) {
    const pool = spawnPool.length ? spawnPool : level.floors.filter(i => i !== startIndex);
    let chosen = pick(pool, random);
    for (let tries = 0; tries < 20 && level.spawns.some(s => Math.abs(s.x - chosen % size) + Math.abs(s.y - Math.floor(chosen / size)) < 6); tries++) chosen = pick(pool, random);
    level.spawns.push(tileAt(chosen));
  }

  // 9. Ceiling panels on a checkerboard of floor tiles; deeper levels have more dead tubes.
  for (const i of level.floors) {
    const t = tileAt(i);
    if ((t.x + t.y) % 2 !== 0) continue;
    const lit = i === startIndex || random() < params.litRatio;
    level.panels.push({ x: t.x, y: t.y, lit, flicker: lit && i !== startIndex && random() < params.flickerRatio });
  }
  return level;
}

/** Pushes a circle out of every wall tile it overlaps. Mutates `pos`. */
export function resolveCircle(level: Pick<Level, 'size' | 'grid'>, pos: { x: number; z: number }, radius: number): void {
  for (let pass = 0; pass < 2; pass++) {
    const tx = toTile(pos.x), ty = toTile(pos.z);
    for (let y = ty - 1; y <= ty + 1; y++) {
      for (let x = tx - 1; x <= tx + 1; x++) {
        if (!isWall(level, x, y)) continue;
        const minX = x * TILE, maxX = minX + TILE, minZ = y * TILE, maxZ = minZ + TILE;
        const cx = Math.min(maxX, Math.max(minX, pos.x));
        const cz = Math.min(maxZ, Math.max(minZ, pos.z));
        const dx = pos.x - cx, dz = pos.z - cz;
        const d2 = dx * dx + dz * dz;
        if (d2 >= radius * radius) continue;
        if (d2 > 1e-10) {
          const d = Math.sqrt(d2);
          pos.x = cx + (dx / d) * radius;
          pos.z = cz + (dz / d) * radius;
        } else {
          const left = pos.x - minX, right = maxX - pos.x, top = pos.z - minZ, bottom = maxZ - pos.z;
          const m = Math.min(left, right, top, bottom);
          if (m === left) pos.x = minX - radius;
          else if (m === right) pos.x = maxX + radius;
          else if (m === top) pos.z = minZ - radius;
          else pos.z = maxZ + radius;
        }
      }
    }
  }
}

/** Grid traversal (Amanatides-Woo) from one world point to another; false if any wall tile lies between. */
export function lineOfSight(level: Pick<Level, 'size' | 'grid'>, x0: number, z0: number, x1: number, z1: number): boolean {
  let tx = toTile(x0), ty = toTile(z0);
  const ex = toTile(x1), ey = toTile(z1);
  if (isWall(level, tx, ty)) return false;
  const dx = x1 - x0, dz = z1 - z0;
  const stepX = dx > 0 ? 1 : -1, stepY = dz > 0 ? 1 : -1;
  const tDeltaX = dx !== 0 ? Math.abs(TILE / dx) : Infinity;
  const tDeltaY = dz !== 0 ? Math.abs(TILE / dz) : Infinity;
  let tMaxX = dx !== 0 ? (stepX > 0 ? (tx + 1) * TILE - x0 : x0 - tx * TILE) / Math.abs(dx) : Infinity;
  let tMaxY = dz !== 0 ? (stepY > 0 ? (ty + 1) * TILE - z0 : z0 - ty * TILE) / Math.abs(dz) : Infinity;
  for (let guard = 0; guard < 512 && (tx !== ex || ty !== ey); guard++) {
    if (tMaxX < tMaxY) { tMaxX += tDeltaX; tx += stepX; } else { tMaxY += tDeltaY; ty += stepY; }
    if (isWall(level, tx, ty)) return false;
  }
  return true;
}

export interface RayHit { dist: number; nx: number; nz: number; }

/** Casts a horizontal ray (unit direction) and reports the first wall face it hits within `maxDist`. */
export function raycast(level: Pick<Level, 'size' | 'grid'>, x0: number, z0: number, dx: number, dz: number, maxDist: number, out: RayHit): boolean {
  let tx = toTile(x0), ty = toTile(z0);
  const stepX = dx > 0 ? 1 : -1, stepY = dz > 0 ? 1 : -1;
  const tDeltaX = dx !== 0 ? Math.abs(TILE / dx) : Infinity;
  const tDeltaY = dz !== 0 ? Math.abs(TILE / dz) : Infinity;
  let tMaxX = dx !== 0 ? (stepX > 0 ? (tx + 1) * TILE - x0 : x0 - tx * TILE) / Math.abs(dx) : Infinity;
  let tMaxY = dz !== 0 ? (stepY > 0 ? (ty + 1) * TILE - z0 : z0 - ty * TILE) / Math.abs(dz) : Infinity;
  for (let guard = 0; guard < 512; guard++) {
    let t: number, nx = 0, nz = 0;
    if (tMaxX < tMaxY) { t = tMaxX; tMaxX += tDeltaX; tx += stepX; nx = -stepX; }
    else { t = tMaxY; tMaxY += tDeltaY; ty += stepY; nz = -stepY; }
    if (t > maxDist) return false;
    if (isWall(level, tx, ty)) { out.dist = t; out.nx = nx; out.nz = nz; return true; }
  }
  return false;
}

export interface Stamina { value: number; exhausted: boolean; rest: number; }

export const createStamina = (): Stamina => ({ value: 1, exhausted: false, rest: 1 });

/**
 * Advances stamina and returns whether the player is actually sprinting this frame. Running dry
 * leaves the player exhausted (no sprint) until stamina refills to STAMINA_RECOVER.
 */
export function stepStamina(s: Stamina, wantsSprint: boolean, moving: boolean, dt: number): boolean {
  const sprinting = wantsSprint && moving && !s.exhausted && s.value > 0;
  if (sprinting) {
    s.value = Math.max(0, s.value - STAMINA_DRAIN * dt);
    s.rest = 0;
    if (s.value === 0) s.exhausted = true;
  } else {
    s.rest += dt;
    if (s.rest > 0.6) s.value = Math.min(1, s.value + STAMINA_REGEN * (moving ? 0.7 : 1) * dt);
    if (s.exhausted && s.value >= STAMINA_RECOVER) s.exhausted = false;
  }
  return sprinting;
}

/** How far the player's footsteps carry. */
export const noiseRadius = (sprinting: boolean, moving: boolean, p: LevelParams) => sprinting ? p.hearSprint : moving ? WALK_NOISE : 0;

/** The flashlight lets you see further, and lets it see you further. */
export const sightRange = (flashlightOn: boolean, p: LevelParams) => flashlightOn ? p.sightLight : p.sightDark;

export function canSee(level: Pick<Level, 'size' | 'grid'>, ex: number, ez: number, px: number, pz: number, range: number): boolean {
  const d = Math.hypot(px - ex, pz - ez);
  return d <= range && lineOfSight(level, ex, ez, px, pz);
}

/** Walls muffle sound: through walls only the nearer part of the radius carries. */
export function canHear(level: Pick<Level, 'size' | 'grid'>, ex: number, ez: number, px: number, pz: number, radius: number): boolean {
  if (radius <= 0) return false;
  const d = Math.hypot(px - ex, pz - ez);
  if (d > radius) return false;
  return d < radius * 0.6 || lineOfSight(level, ex, ez, px, pz);
}

export type EntityMode = 'dormant' | 'patrol' | 'investigate' | 'chase' | 'search';

export interface Entity {
  x: number;
  z: number;
  heading: number;
  mode: EntityMode;
  path: number[];
  timer: number;
  memory: number;
  repath: number;
  targetX: number;
  targetZ: number;
  /** True while it closes in directly on a visible, nearby player. */
  lunging: boolean;
}

export function createEntity(spawn: Tile, dormant = 4): Entity {
  const x = tileCenter(spawn.x), z = tileCenter(spawn.y);
  return { x, z, heading: 0, mode: 'dormant', path: [], timer: dormant, memory: 0, repath: 0, targetX: x, targetZ: z, lunging: false };
}

export interface Senses { sees: boolean; hears: boolean; px: number; pz: number; }
export type EntitySignal = 'spotted' | 'heard' | 'lost' | null;

function randomTileNear(level: Level, cx: number, cy: number, radius: number, random: Random): number {
  for (let tries = 0; tries < 30; tries++) {
    const i = pick(level.floors, random);
    const x = i % level.size, y = Math.floor(i / level.size);
    if (Math.abs(x - cx) <= radius && Math.abs(y - cy) <= radius) return i;
  }
  return pick(level.floors, random);
}

/** Updates the entity's mode and route from what it senses. Returns a signal when its mode changes meaningfully. */
export function think(e: Entity, level: Level, p: LevelParams, senses: Senses, dt: number, random: Random): EntitySignal {
  e.timer -= dt;
  e.repath -= dt;
  let signal: EntitySignal = null;
  const here = index(level.size, toTile(e.x), toTile(e.z));
  const route = (x: number, z: number) => {
    const to = index(level.size, toTile(x), toTile(z));
    e.targetX = x; e.targetZ = z;
    e.path = isWall(level, toTile(x), toTile(z)) ? [] : findPath(level, here, to);
  };

  if (e.mode === 'dormant') {
    if (e.timer > 0) return null;
    e.mode = 'patrol';
  }

  if (senses.sees) {
    if (e.mode !== 'chase') { signal = 'spotted'; e.repath = 0; }
    e.mode = 'chase';
    e.memory = 2.2;
  } else if (e.mode === 'chase') {
    e.memory -= dt;
    if (e.memory <= 0) {
      // Lost track: go to where it last knew you were, then search around.
      e.mode = 'investigate';
      route(e.targetX, e.targetZ);
      signal = 'lost';
    }
  } else if (senses.hears && (e.mode !== 'investigate' || e.repath <= 0)) {
    if (e.mode !== 'investigate') signal = 'heard';
    e.mode = 'investigate';
    e.repath = 0.5;
    route(senses.px, senses.pz);
  }

  if (e.mode === 'chase') {
    // While it remembers you it knows exactly where you are.
    if (e.repath <= 0) { route(senses.px, senses.pz); e.repath = 0.3; }
  } else if (e.mode === 'investigate') {
    if (!e.path.length) { e.mode = 'search'; e.timer = 5 + random() * 3; }
  }
  if (e.mode === 'search') {
    if (e.timer <= 0) e.mode = 'patrol';
    else if (!e.path.length) {
      const i = randomTileNear(level, toTile(e.x), toTile(e.z), 3, random);
      route(tileCenter(i % level.size), tileCenter(Math.floor(i / level.size)));
    }
  }
  if (e.mode === 'patrol' && !e.path.length) {
    const i = random() < p.pressure
      ? randomTileNear(level, toTile(senses.px), toTile(senses.pz), 5, random)
      : pick(level.floors, random);
    route(tileCenter(i % level.size), tileCenter(Math.floor(i / level.size)));
  }
  return signal;
}

export function entitySpeed(e: Entity, p: LevelParams): number {
  switch (e.mode) {
    case 'chase': return p.chaseSpeed;
    case 'investigate': return p.searchSpeed;
    case 'search': return p.searchSpeed * 0.75;
    case 'patrol': return p.patrolSpeed;
    default: return 0;
  }
}

/** Moves the entity along its route; in a chase with the player in sight and close, it goes straight for them. */
export function moveEntity(e: Entity, level: Level, p: LevelParams, senses: Senses, dt: number): void {
  const speed = entitySpeed(e, p);
  if (speed <= 0) return;
  let step = speed * dt;
  const direct = e.mode === 'chase' && senses.sees && Math.hypot(senses.px - e.x, senses.pz - e.z) < TILE * 1.6;
  e.lunging = direct;
  if (direct) {
    const dx = senses.px - e.x, dz = senses.pz - e.z;
    const d = Math.hypot(dx, dz);
    if (d > 1e-6) {
      const s = Math.min(step, d);
      e.x += (dx / d) * s; e.z += (dz / d) * s;
      e.heading = Math.atan2(dx, dz);
    }
    resolveCircle(level, e, 0.3);
    return;
  }
  while (step > 0 && e.path.length) {
    const next = e.path[0];
    const nx = tileCenter(next % level.size), nz = tileCenter(Math.floor(next / level.size));
    const dx = nx - e.x, dz = nz - e.z;
    const d = Math.hypot(dx, dz);
    if (d <= step) {
      e.x = nx; e.z = nz; step -= d;
      e.path.shift();
    } else {
      e.x += (dx / d) * step; e.z += (dz / d) * step;
      step = 0;
    }
    if (d > 1e-6) e.heading = Math.atan2(dx, dz);
  }
}

/** Points: every bottle, every battery, and a bonus for each cleared level that grows with depth. */
export const SCORE = { water: 100, battery: 25, clear: (level: number) => 500 * level };
