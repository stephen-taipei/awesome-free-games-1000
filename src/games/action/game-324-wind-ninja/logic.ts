/**
 * Pure rules for Gale Cutter: hex arenas, dash geometry, foes, waves, scoring and the whole simulation.
 * No DOM or three.js here, so the tests can import it and drive it directly.
 *
 * Coordinates: each floating island is centred on its own origin, flat on y = 0. x points right on
 * screen and z towards the camera. Angles are measured from +x towards +z, as atan2(z, x).
 */

export const TAU = Math.PI * 2;
export const SQRT3 = Math.sqrt(3);

/** Circumradius of a (flat-top) hex tile. */
export const HEX = 0.9;
export const APOTHEM = (HEX * SQRT3) / 2;
export const PLAYER_R = 0.36;
/** Bodies keep their centre this far from the void, and a dash stops this far short of it. */
export const EDGE_MARGIN = 0.4;
export const MAX_DASH = 5.4;
/** Shorter aims are a cancel, not a dash. */
export const MIN_DASH = 0.6;
/** Half-width of the blade: a body whose edge comes this close to the dash line is cut. */
export const CUT_R = 0.36;
export const MAX_CHARGES = 3;
/** Simulation seconds to regrow one dash charge. Charges regrow in every phase but the island flight. */
export const CHARGE_TIME = 1.6;
/** Time scale while the player holds an aim. */
export const SLOW = 0.15;
/** Real seconds of slow motion in a full focus meter, and how much comes back per real second while not aiming. */
export const FOCUS_MAX = 2.5;
export const FOCUS_REGEN = 0.55;
export const FOCUS_PER_KILL = 0.3;
export const MAX_HEARTS = 3;
/** Invulnerability after a hit, and after every dash (the dash itself is instant). */
export const HURT_GRACE = 1.2;
export const DASH_GRACE = 0.2;
/** Seconds without a kill before the combo multiplier drops a step; above ×5 the window narrows to COMBO_MIN_TIME. */
export const COMBO_TIME = 5;
export const COMBO_MIN_TIME = 2.5;
export const MAX_COMBO = 30;
/** A shield-bearer blocks any cut that meets it within this angle of straight on (a 120 degree front). */
export const SHIELD_HALF_ARC = Math.PI / 3;
/** A shield-bearer that blocked a cut is rocked back (any wind-up broken) and cannot turn or strike for this long. */
export const STAGGER_TIME = 0.6;
/**
 * A lunge or bash reaches this much further than the island edge lets the body travel (the body leans over the
 * edge; the weapon goes on), so standing in a pocket of the rim is never out of reach.
 */
export const LUNGE_OVERREACH = 0.45;
/** Seconds a foe in range keeps repositioning for a clear line before it strikes anyway. */
export const REPOSITION_TIME = 2.5;
export const BLAST_R = 2.2;
export const ARROW_R = 0.16;
export const ARROW_SPEED = 7.2;
export const ARROW_RANGE = 15;
export const ARROW_SCORE = 30;
/** Foes drop in on a marked tile; they cannot strike or be struck until they land. */
export const SPAWN_TIME = 1.0;
export const INTRO_TIME = 1.6;
export const CLEAR_TIME = 2.2;
export const TRAVEL_TIME = 3.2;
export const WAVES_PER_ARENA = 4;
export const CAMPAIGN_WAVES = 12;
/** Fraction of a wind-up during which the foe still tracks the player; after it the strike direction is locked. */
export const AIM_LOCK = 0.65;
/** Simulation speed during a hit-stop, and its length in real seconds per dash that kills. */
export const HIT_STOP_SCALE = 0.08;
export const HIT_STOP = 0.07;

export type Kind = 'grunt' | 'archer' | 'shield' | 'bomber';
export const KINDS: readonly Kind[] = ['grunt', 'archer', 'shield', 'bomber'];

export interface KindStats {
  /** Body radius. */
  r: number;
  /** Walking speed in units per second, before the wave's speed scale. */
  speed: number;
  score: number;
  /** Wind-up (grunt lunge, shield bash), bow draw (archer) or fuse (bomber), in seconds before the wave's tempo. */
  windup: number;
  /** Distance to the player at which the wind-up starts. */
  trigger: number;
  /** Length of the lunge or bash. */
  reach: number;
  /** Seconds the lunge or bash takes. */
  strike: number;
  /** Seconds of recovery after a strike or shot. */
  recover: number;
}

export const STATS: Record<Kind, KindStats> = {
  grunt: { r: 0.42, speed: 1.75, score: 100, windup: 0.85, trigger: 2.6, reach: 3.0, strike: 0.2, recover: 0.8 },
  archer: { r: 0.4, speed: 1.6, score: 150, windup: 1.0, trigger: 11, reach: 0, strike: 0, recover: 0.55 },
  shield: { r: 0.5, speed: 1.1, score: 200, windup: 0.75, trigger: 2.0, reach: 1.7, strike: 0.18, recover: 1.0 },
  bomber: { r: 0.45, speed: 1.35, score: 80, windup: 1.25, trigger: 1.9, reach: 0, strike: 0, recover: 0 },
};
export const ARCHER_NEAR = 4.6;
export const ARCHER_FAR = 8.0;
export const ARCHER_COOLDOWN = 2.4;
/** Shield-bearer turn rate in radians per second, before the wave's turn scale. */
export const SHIELD_TURN = 1.8;

// ------------------------------------------------------------------ maths

export function wrap(angle: number): number {
  let a = (angle + Math.PI) % TAU;
  if (a < 0) a += TAU;
  return a - Math.PI;
}
export const clampNum = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
export function approach(current: number, target: number, step: number): number {
  return current < target ? Math.min(target, current + step) : Math.max(target, current - step);
}
export function turnToward(current: number, target: number, maxStep: number): number {
  return wrap(current + clampNum(wrap(target - current), -maxStep, maxStep));
}

/** Seeded PRNG (mulberry32), so waves and tests can be replayed. */
export function createRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Distance from point P to the segment AB. */
export function segmentDistance(ax: number, az: number, bx: number, bz: number, px: number, pz: number): number {
  const vx = bx - ax, vz = bz - az;
  const len2 = vx * vx + vz * vz;
  const t = len2 > 0 ? clampNum(((px - ax) * vx + (pz - az) * vz) / len2, 0, 1) : 0;
  return Math.hypot(ax + vx * t - px, az + vz * t - pz);
}

/**
 * Segment-vs-circle test for a cut. The dash starts at O and runs `length` along the unit direction D.
 * Returns how far along the dash it first comes within `radius` of C, or -1 when it never does.
 * A body whose centre lies behind the start (dashing away from it) is never cut.
 */
export function hitAlong(ox: number, oz: number, dx: number, dz: number, length: number, cx: number, cz: number, radius: number): number {
  const ex = cx - ox, ez = cz - oz;
  const along = ex * dx + ez * dz;
  if (along <= 0) return -1;
  const perp2 = Math.max(0, ex * ex + ez * ez - along * along);
  const r2 = radius * radius;
  if (perp2 > r2) return -1;
  const entry = Math.max(0, along - Math.sqrt(r2 - perp2));
  return entry <= length ? entry : -1;
}

/**
 * True when a shield-bearer facing `facing` blocks a dash travelling along the unit vector (dx, dz):
 * the cut arrives from within SHIELD_HALF_ARC of straight in front. Side and back cuts land.
 */
export function shieldBlocks(facing: number, dx: number, dz: number, halfArc = SHIELD_HALF_ARC): boolean {
  // The blade comes from -D. It meets the shield when -D lies inside the frontal arc around the facing.
  return -(Math.cos(facing) * dx + Math.sin(facing) * dz) > Math.cos(halfArc) + 1e-9;
}

// ------------------------------------------------------------------ hex arenas

export interface Tile { q: number; r: number; x: number; z: number; rim: boolean; }
export interface Arena {
  index: number;
  /** Walkable tiles. */
  tiles: Tile[];
  /** Raised rock pillars around the rim: scenery, and walls for dashes and foes alike. */
  walls: Tile[];
  keys: Set<number>;
  start: { x: number; z: number };
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number };
}

/** Numeric key of a tile, for fast set lookups (|q|, |r| < 64). */
export const hexKey = (q: number, r: number) => (q + 64) * 128 + (r + 64);
export const hexDistance = (q: number, r: number) => (Math.abs(q) + Math.abs(r) + Math.abs(q + r)) / 2;
export function hexCenter(q: number, r: number): { x: number; z: number } {
  return { x: HEX * 1.5 * q, z: HEX * SQRT3 * (r + q / 2) };
}
/** Axial coordinates of the tile containing (x, z). */
export function hexAt(x: number, z: number): [number, number] {
  const qf = ((2 / 3) * x) / HEX;
  const rf = (-x / 3 + (SQRT3 / 3) * z) / HEX;
  const sf = -qf - rf;
  let q = Math.round(qf), r = Math.round(rf);
  const s = Math.round(sf);
  const dq = Math.abs(q - qf), dr = Math.abs(r - rf), ds = Math.abs(s - sf);
  if (dq > dr && dq > ds) q = -r - s;
  else if (dr > ds) r = -q - s;
  return [q + 0, r + 0];
}
export const HEX_DIRS: ReadonlyArray<readonly [number, number]> = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]];
/** Unit vectors from a tile centre towards each neighbour (and the normal of the edge they share). */
const DIR_VECS = HEX_DIRS.map(([q, r]) => {
  const c = hexCenter(q, r);
  const l = Math.hypot(c.x, c.z);
  return { x: c.x / l, z: c.z / l };
});
const isCorner = (q: number, r: number, n: number) => hexDistance(q, r) === n && (q === 0 || r === 0 || q + r === 0);

/** Island shapes: a round meadow, a two-lobed terrace, and a ring around a chasm. */
const SHAPES: ReadonlyArray<(q: number, r: number, x: number, z: number) => boolean> = [
  (q, r) => hexDistance(q, r) <= 4 && !isCorner(q, r, 4),
  (_q, _r, x, z) => Math.hypot(x, z + 2.9) <= 4.25 || Math.hypot(x, z - 2.9) <= 4.25,
  (q, r) => hexDistance(q, r) <= 4 && hexDistance(q, r) >= 2 && !isCorner(q, r, 4),
];
const STARTS = [{ x: 0, z: 0 }, { x: 0, z: 0 }, { x: 0, z: 3.1 }];

export function buildArena(index: number): Arena {
  const shape = SHAPES[index];
  const tiles: Tile[] = [];
  const keys = new Set<number>();
  for (let q = -8; q <= 8; q++) {
    for (let r = -10; r <= 10; r++) {
      const c = hexCenter(q, r);
      if (!shape(q, r, c.x, c.z)) continue;
      tiles.push({ q, r, x: c.x, z: c.z, rim: false });
      keys.add(hexKey(q, r));
    }
  }
  const random = createRng(97 + index * 31);
  const walls: Tile[] = [];
  const wallKeys = new Set<number>();
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (const tile of tiles) {
    for (const [dq, dr] of HEX_DIRS) {
      const q = tile.q + dq, r = tile.r + dr;
      const key = hexKey(q, r);
      if (keys.has(key)) continue;
      tile.rim = true;
      // Pillars rise only on the outer rim, never inside the chasm of the ring island.
      const c = hexCenter(q, r);
      if (!wallKeys.has(key) && Math.hypot(c.x, c.z) > 4 && random() < 0.34) {
        wallKeys.add(key);
        walls.push({ q, r, x: c.x, z: c.z, rim: true });
      }
    }
    minX = Math.min(minX, tile.x - HEX); maxX = Math.max(maxX, tile.x + HEX);
    minZ = Math.min(minZ, tile.z - APOTHEM); maxZ = Math.max(maxZ, tile.z + APOTHEM);
  }
  const want = STARTS[index];
  let start = tiles[0];
  for (const tile of tiles) if (Math.hypot(tile.x - want.x, tile.z - want.z) < Math.hypot(start.x - want.x, start.z - want.z)) start = tile;
  return { index, tiles, walls, keys, start: { x: start.x, z: start.z }, bounds: { minX, maxX, minZ, maxZ } };
}

export const ARENAS: readonly Arena[] = [0, 1, 2].map(buildArena);

/** Corner offsets of a flat-top tile, counter-clockwise from +x. */
const CORNERS = Array.from({ length: 6 }, (_, k) => ({ x: HEX * Math.cos((k * Math.PI) / 3), z: HEX * Math.sin((k * Math.PI) / 3) }));

/** Distance from (x, z) to the outline of the tile (q, r), for a point outside it. */
function tileDistance(q: number, r: number, x: number, z: number): number {
  const c = hexCenter(q, r);
  let best = Infinity;
  for (let k = 0; k < 6; k++) {
    const a = CORNERS[k], b = CORNERS[(k + 1) % 6];
    best = Math.min(best, segmentDistance(c.x + a.x, c.z + a.z, c.x + b.x, c.z + b.z, x, z));
  }
  return best;
}

/**
 * True when a body centred at (x, z) stands on the island with at least `margin` to the void (and to the
 * rim pillars). For a margin under one tile edge, only the six neighbours of the containing tile can be that
 * close, so it is enough to measure the distance to each missing neighbour.
 */
export function walkable(arena: Arena, x: number, z: number, margin = EDGE_MARGIN): boolean {
  const [q, r] = hexAt(x, z);
  if (!arena.keys.has(hexKey(q, r))) return false;
  if (margin <= 0) return true;
  const c = hexCenter(q, r);
  const dx = x - c.x, dz = z - c.z;
  for (let i = 0; i < 6; i++) {
    const [dq, dr] = HEX_DIRS[i];
    if (arena.keys.has(hexKey(q + dq, r + dr))) continue;
    // Cheap reject: far enough from the shared edge's line means far enough from the whole tile.
    if (APOTHEM - (dx * DIR_VECS[i].x + dz * DIR_VECS[i].z) >= margin) continue;
    if (tileDistance(q + dq, r + dr, x, z) < margin) return false;
  }
  return true;
}

const CLIP_STEP = 0.025;
/**
 * How far a body can travel from (x, z) along the unit direction (dx, dz), up to `length`, without ever leaving
 * the walkable island: the path stops at the first point where it would come within `margin` of the void or a
 * pillar. Dashes cannot jump gaps. Returns 0 when the start itself is not walkable.
 */
export function clipDash(arena: Arena, x: number, z: number, dx: number, dz: number, length: number, margin = EDGE_MARGIN): number {
  if (!(length > 0) || !walkable(arena, x, z, margin)) return 0;
  let ok = 0;
  for (let s = CLIP_STEP; ; s += CLIP_STEP) {
    const t = Math.min(s, length);
    if (!walkable(arena, x + dx * t, z + dz * t, margin)) {
      let lo = ok, hi = t;
      for (let i = 0; i < 14; i++) {
        const mid = (lo + hi) / 2;
        if (walkable(arena, x + dx * mid, z + dz * mid, margin)) lo = mid;
        else hi = mid;
      }
      return lo;
    }
    ok = t;
    if (t >= length) return length;
  }
}

// ------------------------------------------------------------------ waves

export interface Group { kind: Kind; count: number; }
export interface WavePlan {
  wave: number;
  arena: number;
  endless: boolean;
  groups: Group[];
  /** Most foes on the island at once. */
  maxAlive: number;
  /** Seconds between groups dropping in. */
  interval: number;
  /** Walking speed scale. */
  speed: number;
  /** Telegraph length scale: wind-ups, draws and fuses get shorter as the waves rise. */
  tempo: number;
  /** Shield-bearer turn rate scale. */
  turn: number;
}

const LETTER: Record<string, Kind> = { g: 'grunt', a: 'archer', s: 'shield', b: 'bomber' };
/** The twelve campaign waves: letters are foes, digits are formations dropping in together. */
const CAMPAIGN: readonly string[] = [
  'g g g2 g',
  'g2 g g3 g g2',
  'a g2 g a g3',
  'g3 a g2 a g a g3',
  'b2 g2 b g3 b2',
  'a b2 g3 a b2 g2 a b',
  's g2 s b2 g3 s a b2',
  's a b3 g3 s a s b2 g2',
  'g3 a s b2 a g3 s b3 a',
  's s a g3 b3 a g3 s b2 a g2',
  'g3 b3 s a a s g3 b3 s a g3',
  's a g3 b3 s a s g3 b3 a s g3 b2',
];
const CAMPAIGN_ALIVE = [3, 4, 5, 6, 5, 6, 6, 7, 7, 8, 8, 9];

const parseGroups = (text: string): Group[] => text.split(' ').map(token => ({ kind: LETTER[token[0]], count: Number(token.slice(1) || 1) }));

/** Campaign wave on which each foe first appears (and gets an introduction). */
export const INTRODUCED: Record<Kind, number> = { grunt: 1, archer: 3, bomber: 5, shield: 7 };

export function arenaForWave(wave: number): number {
  if (wave <= CAMPAIGN_WAVES) return Math.floor((Math.max(1, wave) - 1) / WAVES_PER_ARENA);
  return Math.floor((wave - CAMPAIGN_WAVES - 1) / 3) % 3;
}

export function wavePlan(wave: number, random: () => number = Math.random): WavePlan {
  const w = Math.max(1, Math.floor(wave));
  const endless = w > CAMPAIGN_WAVES;
  let groups: Group[];
  let maxAlive: number;
  if (!endless) {
    groups = parseGroups(CAMPAIGN[w - 1]);
    maxAlive = CAMPAIGN_ALIVE[w - 1];
  } else {
    const n = w - CAMPAIGN_WAVES;
    // Endless keeps growing for about twenty waves: longer waves, a crowd of up to 12, faster feet and shields.
    const count = Math.min(26, 11 + Math.floor(n * 0.8));
    groups = [];
    for (let i = 0; i < count; i++) {
      const roll = random();
      const kind: Kind = roll < 0.34 ? 'grunt' : roll < 0.56 ? 'archer' : roll < 0.78 ? 'bomber' : 'shield';
      const size = kind === 'grunt' || kind === 'bomber' ? 2 + (random() < 0.5 ? 1 : 0) : kind === 'shield' && random() < 0.3 ? 2 : 1;
      groups.push({ kind, count: size });
    }
    maxAlive = Math.min(12, 9 + Math.floor(n / 3));
  }
  return {
    wave: w,
    arena: arenaForWave(w),
    endless,
    groups,
    maxAlive,
    interval: Math.max(1.2, 2.6 - (w - 1) * 0.1),
    speed: endless ? Math.min(MAX_SPEED, 1.3 + (w - CAMPAIGN_WAVES) * 0.03) : 1 + (w - 1) * 0.025,
    tempo: endless ? Math.max(0.65, 0.82 - (w - CAMPAIGN_WAVES) * 0.02) : 1 - (w - 1) * 0.015,
    turn: Math.min(1.9, 1 + (w - 1) * 0.04),
  };
}

/** Top walking-speed scale (endless wave 30 and on). Arrows stop speeding up at ARROW_SPEED_CAP. */
export const MAX_SPEED = 1.84;
export const ARROW_SPEED_CAP = 1.6;

export const waveBonus = (wave: number, flawless: boolean) => 250 * wave * (flawless ? 2 : 1);

/** Clearing a campaign wave heals a heart; in endless, only every other wave does. */
export const healsAfter = (wave: number) => wave <= CAMPAIGN_WAVES || (wave - CAMPAIGN_WAVES) % 2 === 0;

/** Seconds a multiplier lasts without a kill: 5 s up to ×5, then 0.15 s less per step down to 2.5 s. */
export const comboWindow = (combo: number) => Math.max(COMBO_MIN_TIME, COMBO_TIME - 0.15 * Math.max(0, combo - 5));

/**
 * How far a lunge or bash from (x, z) along (dx, dz) moves the body (stopped by the island edge) and how far
 * its blow reaches (a little further, see LUNGE_OVERREACH). The ground telegraph shows the blow.
 */
export function lungeLength(arena: Arena, x: number, z: number, dx: number, dz: number, reach: number): { body: number; front: number } {
  const body = clipDash(arena, x, z, dx, dz, reach);
  return { body, front: Math.min(reach, body + LUNGE_OVERREACH) };
}

// ------------------------------------------------------------------ simulation

export type Phase = 'intro' | 'fight' | 'clear' | 'travel' | 'dead';
export type EnemyState = 'spawn' | 'move' | 'windup' | 'strike' | 'recover' | 'fuse' | 'dead';

export interface Enemy {
  id: number;
  kind: Kind;
  x: number;
  z: number;
  /** Where the body (and a shield) faces. */
  facing: number;
  state: EnemyState;
  /** Seconds in the current state. */
  t: number;
  /** Strike or shot direction (unit vector), locked late in the wind-up. */
  dirX: number;
  dirZ: number;
  /** Length of the current lunge, already clipped to the island, and how far its blow reaches (see LUNGE_OVERREACH). */
  reach: number;
  front: number;
  /** How far the blow has gone so far. */
  travelled: number;
  struck: boolean;
  cooldown: number;
  strafe: number;
  strafeTimer: number;
  steer: number;
  stagger: number;
  /** Seconds spent in range without a clear line for a strike. */
  reposition: number;
}
export interface Arrow { id: number; x: number; z: number; dx: number; dz: number; travelled: number; }

export interface DashPlan {
  /** False when the aim is too short or points straight off the island: releasing it cancels, for free. */
  valid: boolean;
  fromX: number;
  fromZ: number;
  dirX: number;
  dirZ: number;
  /** Requested length (capped at MAX_DASH), and the length after the island edge and any shield. */
  want: number;
  length: number;
  toX: number;
  toZ: number;
  /** The island edge shortened the dash. */
  clipped: boolean;
  /** Foes the blade passes through, nearest first. */
  cuts: Enemy[];
  /** Foes the blasts of cut bombers would catch. */
  chain: Enemy[];
  arrows: Arrow[];
  /** The shield-bearer that stops this dash, if any. */
  blocked: Enemy | null;
}

export type HurtSource = Kind | 'arrow';
export type SimEvent =
  | { type: 'wave'; wave: number; arena: number; intro: Kind | null; endless: boolean }
  | { type: 'fight'; wave: number }
  | { type: 'clear'; wave: number; bonus: number; flawless: boolean; healed: boolean; campaign: boolean }
  | { type: 'travel'; arena: number }
  | { type: 'arena'; arena: number }
  | { type: 'spawn'; id: number; kind: Kind; x: number; z: number }
  | { type: 'land'; id: number; kind: Kind }
  | { type: 'windup'; id: number; kind: Kind }
  | { type: 'strike'; id: number; kind: Kind }
  | { type: 'shoot'; id: number; arrow: number }
  | { type: 'explode'; id: number; x: number; z: number; depth: number; harmful: boolean }
  | { type: 'kill'; id: number; kind: Kind; x: number; z: number; points: number; cause: 'cut' | 'blast'; dirX: number; dirZ: number; order: number }
  | { type: 'deflect'; arrow: number; x: number; z: number; points: number }
  | { type: 'arrowGone'; arrow: number }
  | { type: 'clang'; id: number; x: number; z: number; interrupted: boolean }
  | { type: 'dash'; fromX: number; fromZ: number; toX: number; toZ: number; kills: number; blocked: boolean; arrows: number; points: number }
  | { type: 'cancel' }
  | { type: 'denied' }
  | { type: 'charge'; charges: number }
  /** The focus meter ran dry while aiming: time is back to full speed until the player lets go. */
  | { type: 'focusOut' }
  | { type: 'combo'; combo: number; kills: number }
  | { type: 'comboDrop'; combo: number }
  | { type: 'hurt'; hearts: number; source: HurtSource }
  | { type: 'dead' };

export interface SimInput {
  /** The player is holding an aim: time slows while focus lasts. */
  aiming: boolean;
  /** Release: dash towards this island point this step. */
  dash?: { x: number; z: number } | null;
}
export interface SimOptions {
  /** Tests: the player cannot be hurt. */
  god?: boolean;
  startWave?: number;
}

const IDLE: SimInput = { aiming: false };

export class Sim {
  readonly events: SimEvent[] = [];
  readonly random: () => number;
  readonly god: boolean;
  arena: Arena;
  arenaIndex: number;
  wave: number;
  plan: WavePlan;
  phase: Phase = 'intro';
  phaseTime = 0;
  time = 0;
  player = { x: 0, z: 0, facing: -Math.PI / 2 };
  hearts = MAX_HEARTS;
  charges = MAX_CHARGES;
  chargeTimer = 0;
  focus = FOCUS_MAX;
  timeScale = 1;
  aiming = false;
  hitStop = 0;
  /** Seconds of invulnerability left. */
  grace = 0;
  combo = 1;
  comboTimer = 0;
  maxCombo = 1;
  score = 0;
  kills = 0;
  bestCut = 0;
  enemies: Enemy[] = [];
  arrows: Arrow[] = [];
  queue: Group[] = [];
  spawnTimer = 0;
  hurtThisWave = false;
  /** Tests: keep the wave open even when the island is empty, to stage scenes. */
  holdWave = false;
  /** Brief freezes on kills. Off when the player prefers reduced motion. */
  hitStops = true;
  private swapped = false;
  private nextId = 1;

  constructor(seed: number | (() => number) = Date.now(), options: SimOptions = {}) {
    this.random = typeof seed === 'function' ? seed : createRng(seed);
    this.god = !!options.god;
    this.wave = Math.max(1, Math.floor(options.startWave ?? 1));
    this.plan = wavePlan(this.wave, this.random);
    this.arenaIndex = this.plan.arena;
    this.arena = ARENAS[this.arenaIndex];
    this.player.x = this.arena.start.x;
    this.player.z = this.arena.start.z;
    this.beginWave();
  }

  /** One frame: `realDt` is wall-clock seconds; the world advances by realDt times the time scale. */
  step(realDt: number, input: SimInput = IDLE): SimEvent[] {
    const events = this.events;
    events.length = 0;
    if (this.phase === 'dead') return events;
    const rdt = clampNum(realDt, 0, 0.1);
    const active = this.phase !== 'travel';
    this.aiming = active && !!input.aiming;
    if (this.aiming) {
      const had = this.focus;
      this.focus = Math.max(0, this.focus - rdt);
      if (had > 0 && this.focus === 0) events.push({ type: 'focusOut' });
    } else {
      this.focus = Math.min(FOCUS_MAX, this.focus + FOCUS_REGEN * rdt);
    }
    const target = this.aiming && this.focus > 0 ? SLOW : 1;
    this.timeScale = approach(this.timeScale, target, rdt * (target < this.timeScale ? 10 : 6));
    if (active && input.dash) this.dash(input.dash.x, input.dash.z);
    let scale = this.timeScale;
    if (this.hitStop > 0) {
      this.hitStop = Math.max(0, this.hitStop - rdt);
      scale *= HIT_STOP_SCALE;
    }
    this.advance(rdt * scale);
    return events;
  }

  /** Seconds the current multiplier lasts without a kill. */
  get comboWindow(): number { return comboWindow(this.combo); }
  /** Charge regrowth progress towards the next charge, 0..1. */
  get chargeProgress(): number { return this.charges >= MAX_CHARGES ? 1 : clampNum(this.chargeTimer / CHARGE_TIME, 0, 1); }
  get alive(): number { return this.enemies.length; }

  // -------------------------------------------------------------- dash

  /** Where a release towards (tx, tz) would take the player and what it would cut. Changes nothing. */
  planDash(tx: number, tz: number): DashPlan {
    const fromX = this.player.x, fromZ = this.player.z;
    let dx = tx - fromX, dz = tz - fromZ;
    const d = Math.hypot(dx, dz);
    const plan: DashPlan = {
      valid: false, fromX, fromZ, dirX: Math.cos(this.player.facing), dirZ: Math.sin(this.player.facing),
      want: 0, length: 0, toX: fromX, toZ: fromZ, clipped: false, cuts: [], chain: [], arrows: [], blocked: null,
    };
    if (!(d >= MIN_DASH)) return plan;
    dx /= d; dz /= d;
    plan.dirX = dx; plan.dirZ = dz;
    const want = Math.min(d, MAX_DASH);
    const edge = clipDash(this.arena, fromX, fromZ, dx, dz, want);
    plan.want = want;
    plan.clipped = edge < want - 1e-6;
    let length = edge;
    const hits: Array<{ e: Enemy; s: number }> = [];
    for (const e of this.enemies) {
      if (e.state === 'spawn' || e.state === 'dead') continue;
      const s = hitAlong(fromX, fromZ, dx, dz, edge, e.x, e.z, STATS[e.kind].r + CUT_R);
      if (s >= 0) hits.push({ e, s });
    }
    hits.sort((a, b) => a.s - b.s);
    for (const hit of hits) {
      if (hit.e.kind === 'shield' && shieldBlocks(hit.e.facing, dx, dz)) {
        // The dash stops where the bodies meet the shield.
        const touch = hitAlong(fromX, fromZ, dx, dz, edge, hit.e.x, hit.e.z, STATS.shield.r + PLAYER_R);
        length = Math.max(0, Math.min(length, (touch >= 0 ? touch : hit.s) - 0.02));
        plan.blocked = hit.e;
        break;
      }
      plan.cuts.push(hit.e);
    }
    plan.length = length;
    plan.toX = fromX + dx * length;
    plan.toZ = fromZ + dz * length;
    for (const arrow of this.arrows) {
      if (segmentDistance(fromX, fromZ, plan.toX, plan.toZ, arrow.x, arrow.z) <= ARROW_R + CUT_R) plan.arrows.push(arrow);
    }
    const bombs = plan.cuts.filter(e => e.kind === 'bomber');
    if (bombs.length) plan.chain = blastChain(this.enemies, bombs, new Set(plan.cuts)).map(link => link.enemy);
    plan.valid = length >= 0.3 || !!plan.blocked || plan.cuts.length > 0 || plan.arrows.length > 0;
    return plan;
  }

  private dash(tx: number, tz: number): void {
    const plan = this.planDash(tx, tz);
    if (!plan.valid) { this.events.push({ type: 'cancel' }); return; }
    if (this.charges < 1) { this.events.push({ type: 'denied' }); return; }
    this.charges -= 1;
    this.player.x = plan.toX;
    this.player.z = plan.toZ;
    this.player.facing = Math.atan2(plan.dirZ, plan.dirX);
    this.grace = Math.max(this.grace, DASH_GRACE);
    const scoreBefore = this.score;
    let kills = 0;
    let order = 0;
    for (const e of plan.cuts) {
      if (e.state === 'dead') continue; // caught by an earlier blast of this same dash
      this.kill(e, 'cut', plan.dirX, plan.dirZ, order++);
      kills++;
      if (e.kind === 'bomber') kills += this.explode(e, false);
    }
    for (const arrow of plan.arrows) {
      const index = this.arrows.indexOf(arrow);
      if (index < 0) continue;
      this.arrows.splice(index, 1);
      const points = ARROW_SCORE * this.combo;
      this.score += points;
      this.events.push({ type: 'deflect', arrow: arrow.id, x: arrow.x, z: arrow.z, points });
    }
    if (plan.blocked && plan.blocked.state !== 'dead') {
      const shield = plan.blocked;
      shield.stagger = STAGGER_TIME;
      // Rocked back: a wind-up in progress is broken, so the block never leaves the player inside a bash.
      const interrupted = shield.state === 'windup';
      if (interrupted) this.setState(shield, 'move');
      this.events.push({ type: 'clang', id: shield.id, x: shield.x, z: shield.z, interrupted });
    }
    if (kills > 0) {
      this.charges = Math.min(MAX_CHARGES, this.charges + 1);
      this.focus = Math.min(FOCUS_MAX, this.focus + FOCUS_PER_KILL * kills);
      if (this.hitStops) this.hitStop = HIT_STOP * Math.min(3, kills);
      this.bestCut = Math.max(this.bestCut, kills);
    }
    if (kills >= 2) {
      this.combo = Math.min(MAX_COMBO, this.combo + kills - 1);
      this.maxCombo = Math.max(this.maxCombo, this.combo);
      this.events.push({ type: 'combo', combo: this.combo, kills });
    }
    if (kills > 0) this.comboTimer = comboWindow(this.combo);
    this.events.push({
      type: 'dash', fromX: plan.fromX, fromZ: plan.fromZ, toX: plan.toX, toZ: plan.toZ,
      kills, blocked: !!plan.blocked, arrows: plan.arrows.length, points: this.score - scoreBefore,
    });
  }

  private kill(e: Enemy, cause: 'cut' | 'blast', dirX: number, dirZ: number, order: number): void {
    e.state = 'dead';
    const points = STATS[e.kind].score * this.combo;
    this.score += points;
    this.kills += 1;
    this.events.push({ type: 'kill', id: e.id, kind: e.kind, x: e.x, z: e.z, points, cause, dirX, dirZ, order });
  }

  /** Detonates a bomber (already dead or about to be), chaining through every bomber its blast catches. Returns kills. */
  private explode(first: Enemy, harmful: boolean): number {
    first.state = 'dead';
    let kills = 0;
    const links = blastChain(this.enemies, [first], new Set([first]));
    const blasts = [{ enemy: first, depth: 0 }, ...links.filter(link => link.enemy.kind === 'bomber').map(link => ({ enemy: link.enemy, depth: link.depth + 1 }))];
    for (const blast of blasts) {
      const e = blast.enemy;
      this.events.push({ type: 'explode', id: e.id, x: e.x, z: e.z, depth: blast.depth, harmful });
      if (harmful && Math.hypot(this.player.x - e.x, this.player.z - e.z) <= BLAST_R + PLAYER_R * 0.5) this.hurt('bomber');
      for (let i = this.arrows.length - 1; i >= 0; i--) {
        const arrow = this.arrows[i];
        if (Math.hypot(arrow.x - e.x, arrow.z - e.z) <= BLAST_R) {
          this.arrows.splice(i, 1);
          this.events.push({ type: 'arrowGone', arrow: arrow.id });
        }
      }
    }
    for (const link of links) {
      const e = link.enemy;
      if (e.state === 'dead') continue;
      const dx = e.x - link.by.x, dz = e.z - link.by.z;
      const l = Math.hypot(dx, dz) || 1;
      this.kill(e, 'blast', dx / l, dz / l, link.depth + 1);
      kills++;
    }
    return kills;
  }

  private hurt(source: HurtSource): void {
    if (this.god || this.grace > 0 || this.phase === 'dead') return;
    this.hearts -= 1;
    this.grace = HURT_GRACE;
    this.hurtThisWave = true;
    this.combo = 1;
    this.comboTimer = 0;
    this.events.push({ type: 'hurt', hearts: this.hearts, source });
    if (this.hearts <= 0) {
      this.phase = 'dead';
      this.phaseTime = 0;
      this.aiming = false;
      this.timeScale = 1;
      this.events.push({ type: 'dead' });
    }
  }

  // -------------------------------------------------------------- waves

  private beginWave(): void {
    this.plan = wavePlan(this.wave, this.random);
    this.queue = this.plan.groups.map(group => ({ ...group }));
    this.spawnTimer = 0.4;
    this.hurtThisWave = false;
    this.phase = 'intro';
    this.phaseTime = 0;
    let intro: Kind | null = null;
    for (const kind of KINDS) if (INTRODUCED[kind] === this.wave) intro = kind;
    this.events.push({ type: 'wave', wave: this.wave, arena: this.arenaIndex, intro, endless: this.plan.endless });
  }

  private nextWave(): void {
    this.wave += 1;
    const arena = arenaForWave(this.wave);
    if (arena !== this.arenaIndex) {
      this.phase = 'travel';
      this.phaseTime = 0;
      this.swapped = false;
      this.aiming = false;
      this.events.push({ type: 'travel', arena });
    } else {
      this.beginWave();
    }
  }

  private waveCleared(): void {
    const flawless = !this.hurtThisWave;
    const bonus = waveBonus(this.wave, flawless);
    this.score += bonus;
    const healed = healsAfter(this.wave) && this.hearts < MAX_HEARTS;
    if (healed) this.hearts += 1;
    this.arrows.length = 0;
    this.phase = 'clear';
    this.phaseTime = 0;
    this.events.push({ type: 'clear', wave: this.wave, bonus, flawless, healed, campaign: this.wave === CAMPAIGN_WAVES });
  }

  private advance(dt: number): void {
    if (this.phase === 'dead') return;
    this.time += dt;
    this.phaseTime += dt;
    this.grace = Math.max(0, this.grace - dt);
    if (this.phase !== 'travel') this.regen(dt);
    switch (this.phase) {
      case 'intro':
        if (this.phaseTime >= INTRO_TIME) {
          this.phase = 'fight';
          this.phaseTime = 0;
          this.events.push({ type: 'fight', wave: this.wave });
        }
        break;
      case 'fight':
        this.fight(dt);
        break;
      case 'clear':
        if (this.phaseTime >= CLEAR_TIME) this.nextWave();
        break;
      case 'travel':
        if (!this.swapped && this.phaseTime >= TRAVEL_TIME / 2) {
          this.swapped = true;
          this.arenaIndex = arenaForWave(this.wave);
          this.arena = ARENAS[this.arenaIndex];
          this.player.x = this.arena.start.x;
          this.player.z = this.arena.start.z;
          this.player.facing = -Math.PI / 2;
          this.enemies = [];
          this.arrows = [];
          this.events.push({ type: 'arena', arena: this.arenaIndex });
        }
        if (this.phaseTime >= TRAVEL_TIME) this.beginWave();
        break;
    }
  }

  private regen(dt: number): void {
    if (this.charges >= MAX_CHARGES) { this.chargeTimer = 0; return; }
    this.chargeTimer += dt;
    while (this.chargeTimer >= CHARGE_TIME && this.charges < MAX_CHARGES) {
      this.chargeTimer -= CHARGE_TIME;
      this.charges += 1;
      this.events.push({ type: 'charge', charges: this.charges });
    }
    if (this.charges >= MAX_CHARGES) this.chargeTimer = 0;
  }

  private fight(dt: number): void {
    if (this.combo > 1) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) {
        this.combo -= 1;
        this.comboTimer = this.combo > 1 ? comboWindow(this.combo) : 0;
        this.events.push({ type: 'comboDrop', combo: this.combo });
      }
    }
    this.spawner(dt);
    for (const e of this.enemies) {
      if (this.phase !== 'fight') break;
      this.updateEnemy(e, dt);
    }
    if (this.phase !== 'fight') return;
    this.separate();
    this.updateArrows(dt);
    this.enemies = this.enemies.filter(e => e.state !== 'dead');
    if (this.phase === 'fight' && !this.holdWave && !this.queue.length && !this.enemies.length) this.waveCleared();
  }

  private spawner(dt: number): void {
    this.spawnTimer -= dt;
    if (!this.queue.length) return;
    const alive = this.enemies.length;
    if (this.spawnTimer > 0 && alive > 0) return;
    const group = this.queue[0];
    if (alive > 0 && alive + group.count > this.plan.maxAlive) return;
    this.queue.shift();
    this.spawnGroup(group);
    this.spawnTimer = this.plan.interval;
  }

  /** Free tiles a foe may drop onto: on the island, away from the player and from other foes. */
  private spawnSpots(minPlayer: number): Tile[] {
    return this.arena.tiles.filter(tile => {
      if (!walkable(this.arena, tile.x, tile.z)) return false;
      if (Math.hypot(tile.x - this.player.x, tile.z - this.player.z) < minPlayer) return false;
      return this.enemies.every(e => Math.hypot(e.x - tile.x, e.z - tile.z) > 1.4);
    });
  }

  private spawnGroup(group: Group): void {
    let spots = this.spawnSpots(4.5);
    if (!spots.length) spots = this.spawnSpots(3);
    if (!spots.length) spots = this.arena.tiles.filter(tile => walkable(this.arena, tile.x, tile.z));
    const rim = spots.filter(tile => tile.rim);
    const pick = () => {
      const pool = rim.length && this.random() < 0.7 ? rim : spots;
      return pool[Math.floor(this.random() * pool.length)];
    };
    if (group.count > 1) {
      // A formation: a short file of foes, which a well-aimed dash can cut in one go.
      for (let attempt = 0; attempt < 16; attempt++) {
        const anchor = pick();
        const angle = this.random() * TAU;
        const spacing = STATS[group.kind].r * 2 + 0.3;
        const points: Array<{ x: number; z: number }> = [];
        for (let i = 0; i < group.count; i++) points.push({ x: anchor.x + Math.cos(angle) * spacing * i, z: anchor.z + Math.sin(angle) * spacing * i });
        const fits = points.every(p => walkable(this.arena, p.x, p.z)
          && Math.hypot(p.x - this.player.x, p.z - this.player.z) >= 3.5
          && this.enemies.every(e => Math.hypot(e.x - p.x, e.z - p.z) > 1.1));
        if (fits) {
          for (const p of points) this.spawnEnemy(group.kind, p.x, p.z);
          return;
        }
      }
    }
    for (let i = 0; i < group.count; i++) {
      const spot = pick();
      this.spawnEnemy(group.kind, spot.x, spot.z);
      const index = spots.indexOf(spot);
      if (index >= 0 && spots.length > 1) spots.splice(index, 1);
      const r = rim.indexOf(spot);
      if (r >= 0) rim.splice(r, 1);
    }
  }

  /** Adds a foe that drops in at (x, z). Public so tests can stage scenes. */
  spawnEnemy(kind: Kind, x: number, z: number, landed = false): Enemy {
    const e: Enemy = {
      id: this.nextId++, kind, x, z,
      facing: Math.atan2(this.player.z - z, this.player.x - x),
      state: landed ? 'move' : 'spawn', t: 0, dirX: 1, dirZ: 0, reach: 0, front: 0, travelled: 0, struck: false,
      cooldown: kind === 'archer' ? 1 + this.random() * 1.2 : 0,
      strafe: this.random() < 0.5 ? -1 : 1, strafeTimer: 1.5 + this.random() * 1.5, steer: this.random() < 0.5 ? -1 : 1, stagger: 0, reposition: 0,
    };
    this.enemies.push(e);
    this.events.push({ type: 'spawn', id: e.id, kind, x, z });
    return e;
  }

  private setState(e: Enemy, state: EnemyState): void {
    e.state = state;
    e.t = 0;
  }

  private updateEnemy(e: Enemy, dt: number): void {
    if (e.state === 'dead') return;
    const s = STATS[e.kind];
    const plan = this.plan;
    e.t += dt;
    if (e.stagger > 0) e.stagger = Math.max(0, e.stagger - dt);
    const px = this.player.x - e.x, pz = this.player.z - e.z;
    const dist = Math.hypot(px, pz) || 1e-6;
    const toX = px / dist, toZ = pz / dist;
    const toAngle = Math.atan2(toZ, toX);
    const step = s.speed * plan.speed * dt;
    const windup = s.windup * plan.tempo;

    if (e.state === 'spawn') {
      if (e.t >= SPAWN_TIME) {
        this.setState(e, 'move');
        e.facing = toAngle;
        this.events.push({ type: 'land', id: e.id, kind: e.kind });
      }
      return;
    }

    switch (e.kind) {
      case 'grunt':
        if (e.state === 'move') {
          e.facing = turnToward(e.facing, toAngle, 8 * dt);
          if (dist > s.trigger) { e.reposition = 0; this.walk(e, toX, toZ, step); }
          else if (this.clearLine(e, toX, toZ, dt)) this.windup(e, toX, toZ);
          else this.walk(e, toX, toZ, step);
        } else if (e.state === 'windup') {
          if (e.t < windup * AIM_LOCK) { e.dirX = toX; e.dirZ = toZ; e.facing = toAngle; }
          if (e.t >= windup) this.strike(e, s.reach);
        } else if (e.state === 'strike') {
          this.lunge(e, dt);
        } else if (e.state === 'recover' && e.t >= s.recover) {
          this.setState(e, 'move');
        }
        break;

      case 'shield': {
        const turning = e.state === 'move' && e.stagger <= 0;
        if (turning) e.facing = turnToward(e.facing, toAngle, SHIELD_TURN * plan.turn * dt);
        if (e.state === 'move') {
          if (e.stagger > 0) break;
          const misaligned = Math.abs(wrap(toAngle - e.facing));
          const pace = step * (0.35 + 0.65 * Math.max(0, Math.cos(misaligned)));
          if (dist > s.trigger) { e.reposition = 0; this.walk(e, toX, toZ, pace); }
          else if (!this.clearLine(e, toX, toZ, dt)) this.walk(e, toX, toZ, pace);
          else if (misaligned < 0.5) this.windup(e, Math.cos(e.facing), Math.sin(e.facing));
        } else if (e.state === 'windup') {
          if (e.t >= windup) this.strike(e, s.reach);
        } else if (e.state === 'strike') {
          this.lunge(e, dt);
        } else if (e.state === 'recover' && e.t >= s.recover) {
          this.setState(e, 'move');
        }
        break;
      }

      case 'archer':
        if (e.state === 'move') {
          e.facing = turnToward(e.facing, toAngle, 6 * dt);
          e.cooldown -= dt;
          e.strafeTimer -= dt;
          if (e.strafeTimer <= 0) { e.strafe = this.random() < 0.5 ? -1 : 1; e.strafeTimer = 1.5 + this.random() * 1.5; }
          let mx = 0, mz = 0, pace = 1;
          if (dist < ARCHER_NEAR) { mx = -toX; mz = -toZ; }
          else if (dist > ARCHER_FAR) { mx = toX; mz = toZ; }
          else { mx = -toZ * e.strafe; mz = toX * e.strafe; pace = 0.5; }
          if (!this.walk(e, mx, mz, step * pace)) e.strafe = -e.strafe;
          if (e.cooldown <= 0 && dist <= s.trigger) this.windup(e, toX, toZ);
        } else if (e.state === 'windup') {
          if (e.t < windup * AIM_LOCK) { e.dirX = toX; e.dirZ = toZ; e.facing = toAngle; }
          if (e.t >= windup) {
            const arrow: Arrow = { id: this.nextId++, x: e.x + e.dirX * 0.45, z: e.z + e.dirZ * 0.45, dx: e.dirX, dz: e.dirZ, travelled: 0 };
            this.arrows.push(arrow);
            this.events.push({ type: 'shoot', id: e.id, arrow: arrow.id });
            e.cooldown = ARCHER_COOLDOWN * plan.tempo * (0.85 + this.random() * 0.3);
            this.setState(e, 'recover');
          }
        } else if (e.state === 'recover' && e.t >= s.recover) {
          this.setState(e, 'move');
        }
        break;

      case 'bomber':
        if (e.state === 'move') {
          e.facing = turnToward(e.facing, toAngle, 6 * dt);
          if (dist > s.trigger) this.walk(e, toX, toZ, step);
          else { this.setState(e, 'fuse'); this.events.push({ type: 'windup', id: e.id, kind: e.kind }); }
        } else if (e.state === 'fuse' && e.t >= windup) {
          this.explode(e, true);
        }
        break;
    }
  }

  /**
   * True when a lunge or bash towards the player from where the foe stands would reach them: the island edge does
   * not cut it short. Otherwise the foe walks round for a clear line, and strikes anyway after REPOSITION_TIME.
   */
  private clearLine(e: Enemy, dirX: number, dirZ: number, dt: number): boolean {
    const s = STATS[e.kind];
    const { front } = lungeLength(this.arena, e.x, e.z, dirX, dirZ, s.reach);
    const reaches = segmentDistance(e.x, e.z, e.x + dirX * front, e.z + dirZ * front, this.player.x, this.player.z) <= PLAYER_R + s.r * 0.85;
    if (reaches) { e.reposition = 0; return true; }
    e.reposition += dt;
    if (e.reposition < REPOSITION_TIME) return false;
    e.reposition = 0;
    return true;
  }

  private windup(e: Enemy, dirX: number, dirZ: number): void {
    this.setState(e, 'windup');
    e.dirX = dirX;
    e.dirZ = dirZ;
    this.events.push({ type: 'windup', id: e.id, kind: e.kind });
  }

  private strike(e: Enemy, reach: number): void {
    this.setState(e, 'strike');
    const length = lungeLength(this.arena, e.x, e.z, e.dirX, e.dirZ, reach);
    e.reach = length.body;
    e.front = length.front;
    e.travelled = 0;
    e.struck = false;
    e.facing = Math.atan2(e.dirZ, e.dirX);
    this.events.push({ type: 'strike', id: e.id, kind: e.kind });
  }

  /** The blow sweeps forward at full speed; the body follows it until the island edge stops the body. */
  private lunge(e: Enemy, dt: number): void {
    const s = STATS[e.kind];
    const before = e.travelled;
    const after = Math.min(e.front, before + (s.reach / s.strike) * dt);
    const moved = Math.min(e.reach, after) - Math.min(e.reach, before);
    e.x += e.dirX * moved;
    e.z += e.dirZ * moved;
    e.travelled = after;
    // Where the lunge started, then the blow's sweep this step.
    const sx = e.x - e.dirX * Math.min(e.reach, after), sz = e.z - e.dirZ * Math.min(e.reach, after);
    if (!e.struck && segmentDistance(sx + e.dirX * before, sz + e.dirZ * before, sx + e.dirX * after, sz + e.dirZ * after, this.player.x, this.player.z) <= PLAYER_R + s.r * 0.85) {
      e.struck = true;
      this.hurt(e.kind);
    }
    if (e.travelled >= e.front - 1e-9) this.setState(e, 'recover');
  }

  /** Walks a foe along (dirX, dirZ), steering around the void and pillars. Returns false when it could not move. */
  private walk(e: Enemy, dirX: number, dirZ: number, len: number): boolean {
    if (len <= 0) return false;
    const base = Math.atan2(dirZ, dirX);
    const reachR = STATS[e.kind].r + PLAYER_R;
    for (const k of [0, 1, -1, 2, -2, 3, -3, 4, -4]) {
      const a = base + k * e.steer * 0.42;
      const nx = e.x + Math.cos(a) * len, nz = e.z + Math.sin(a) * len;
      if (!walkable(this.arena, nx, nz)) continue;
      if (Math.hypot(nx - this.player.x, nz - this.player.z) < reachR) continue;
      e.x = nx;
      e.z = nz;
      if (k < 0) e.steer = -e.steer;
      return true;
    }
    return false;
  }

  /** Pushes overlapping foes apart, never off the island and never mid-strike. */
  private separate(): void {
    const list = this.enemies;
    for (let i = 0; i < list.length; i++) {
      const a = list[i];
      if (a.state === 'dead' || a.state === 'spawn') continue;
      for (let j = i + 1; j < list.length; j++) {
        const b = list[j];
        if (b.state === 'dead' || b.state === 'spawn') continue;
        const dx = b.x - a.x, dz = b.z - a.z;
        const d = Math.hypot(dx, dz);
        const overlap = (STATS[a.kind].r + STATS[b.kind].r) * 1.05 - d;
        if (overlap <= 0) continue;
        const nx = d > 1e-6 ? dx / d : 1, nz = d > 1e-6 ? dz / d : 0;
        const push = overlap / 2;
        if (a.state !== 'strike' && walkable(this.arena, a.x - nx * push, a.z - nz * push)) { a.x -= nx * push; a.z -= nz * push; }
        if (b.state !== 'strike' && walkable(this.arena, b.x + nx * push, b.z + nz * push)) { b.x += nx * push; b.z += nz * push; }
      }
    }
  }

  private updateArrows(dt: number): void {
    const len = ARROW_SPEED * Math.min(ARROW_SPEED_CAP, this.plan.speed) * dt;
    for (let i = this.arrows.length - 1; i >= 0; i--) {
      const arrow = this.arrows[i];
      const ox = arrow.x, oz = arrow.z;
      arrow.x += arrow.dx * len;
      arrow.z += arrow.dz * len;
      arrow.travelled += len;
      if (segmentDistance(ox, oz, arrow.x, arrow.z, this.player.x, this.player.z) <= PLAYER_R + ARROW_R) {
        this.arrows.splice(i, 1);
        this.events.push({ type: 'arrowGone', arrow: arrow.id });
        this.hurt('arrow');
        if (this.phase === 'dead') return;
        continue;
      }
      if (arrow.travelled > ARROW_RANGE) {
        this.arrows.splice(i, 1);
        this.events.push({ type: 'arrowGone', arrow: arrow.id });
      }
    }
  }
}

/**
 * The foes caught by the blasts of `bombs`, breadth first: a bomber caught in a blast explodes too.
 * Shields do not stop a blast. Foes still dropping in are out of reach. `skip` lists foes that are already
 * accounted for (cut by the same dash).
 */
export function blastChain(enemies: readonly Enemy[], bombs: readonly Enemy[], skip: Set<Enemy>): Array<{ enemy: Enemy; depth: number; by: Enemy }> {
  const result: Array<{ enemy: Enemy; depth: number; by: Enemy }> = [];
  const seen = new Set<Enemy>(skip);
  let frontier = bombs.map(enemy => ({ enemy, depth: 0 }));
  while (frontier.length) {
    const next: Array<{ enemy: Enemy; depth: number }> = [];
    for (const blast of frontier) {
      for (const e of enemies) {
        if (seen.has(e) || e.state === 'dead' || e.state === 'spawn') continue;
        if (Math.hypot(e.x - blast.enemy.x, e.z - blast.enemy.z) > BLAST_R + STATS[e.kind].r * 0.5) continue;
        seen.add(e);
        result.push({ enemy: e, depth: blast.depth, by: blast.enemy });
        if (e.kind === 'bomber') next.push({ enemy: e, depth: blast.depth + 1 });
      }
    }
    frontier = next;
  }
  return result;
}

/**
 * Where a keyboard aim starts: the valid dash towards a foe that cuts the most (a blocked shield costs, distance
 * costs a little). When no line towards a foe is a valid dash (say, from a pocket of the rim), the longest valid
 * dash, leaning towards the island's starting tile. Null only when no direction at all is a valid dash.
 */
export function keyboardTarget(sim: Sim): { x: number; z: number } | null {
  const p = sim.player;
  let best: { x: number; z: number; value: number } | null = null;
  for (const e of sim.enemies) {
    if (e.state === 'spawn' || e.state === 'dead') continue;
    const dx = e.x - p.x, dz = e.z - p.z, d = Math.hypot(dx, dz) || 1;
    if (d > MAX_DASH * 1.6) continue;
    const reach = Math.min(MAX_DASH, d + 0.8);
    const tx = p.x + (dx / d) * reach, tz = p.z + (dz / d) * reach;
    const plan = sim.planDash(tx, tz);
    if (!plan.valid) continue;
    const value = (plan.cuts.length + plan.chain.length) * 10 - (plan.blocked ? 25 : 0) - d * 0.5;
    if (!best || value > best.value) best = { x: tx, z: tz, value };
  }
  if (best) return { x: best.x, z: best.z };
  const home = sim.arena.start;
  for (let k = 0; k < 24; k++) {
    const a = (k / 24) * TAU;
    const tx = p.x + Math.cos(a) * MAX_DASH, tz = p.z + Math.sin(a) * MAX_DASH;
    const plan = sim.planDash(tx, tz);
    if (!plan.valid) continue;
    const value = plan.length - 0.2 * Math.hypot(plan.toX - home.x, plan.toZ - home.z);
    if (!best || value > best.value) best = { x: tx, z: tz, value };
  }
  return best && { x: best.x, z: best.z };
}
