/**
 * Pure rules for Skyline Getaway: rooftop generation, jump physics, the momentum economy and the pursuit.
 * No DOM or three.js here, so tests can import it and drive whole runs.
 *
 * Coordinates are metres. x runs along the course (the runner always moves towards +x), y is up, and the
 * runner's position is the centre of the feet. Roof tops sit around y = 0; the street is far below.
 */

/** Fixed physics step. RunSim.step splits every frame into steps no longer than this. */
export const SUB_STEP = 1 / 120;
/** Gravity while falling, or rising without the jump held. */
export const GRAVITY = 34;
/** Gravity while rising with the jump held: holding longer jumps higher and further. */
export const GRAVITY_HOLD = 15;
export const JUMP_SPEED = 9.5;
/** Releasing the jump early caps the upward speed here, which turns a tap into a hop. */
export const JUMP_CUT = 5.5;
export const MAX_FALL = 30;
export const HALF_WIDTH = 0.3;
export const STAND_HEIGHT = 1.8;
export const LOW_HEIGHT = 0.8;
/** Seconds after running off an edge in which a jump still counts. */
export const COYOTE = 0.1;
/** Seconds a press is remembered, so a jump pressed just before landing fires on landing. */
export const BUFFER = 0.13;
/** Touch: a swipe is credited at most this long before it was recognised, and takes back a hop at most this old. */
export const SWIPE_CREDIT = 0.25;
/** Touch: a hard landing waits at most this long past ROLL_LATE for a touch that may still become a swipe. */
export const SWIPE_WAIT = 0.16;
export const SLIDE_TIME = 0.6;
export const SLIDE_MAX = 1.1;
export const ROLL_TIME = 0.45;
/** A roll may also come this long after touching down. */
export const ROLL_LATE = 0.06;
/** Faces up to this height can be vaulted. */
export const VAULT_MAX = 1.3;
/** Reaching a roof edge with the feet up to this far below it ends in a scrambling mantle instead of a fall. */
export const LEDGE = 0.9;
/** A landing after a fall of this many metres is hard: roll or stumble. */
export const HARD_FALL = 4.2;
export const HARD_SPEED = Math.sqrt(2 * GRAVITY * HARD_FALL);
/** Wall-kick walls are at least this tall, beyond the reach of a jump. */
export const WALL_MIN = 3.8;
export const PIPE_LOW = 1.0;
export const PIPE_HIGH = 1.45;
export const PIPE_DEPTH = 0.5;
/** A station canopy sits this far above the deck it collapses onto. */
export const CANOPY_DROP = 4.6;
export const CRACK_TIME = 0.22;
/** Hands to feet while hanging from a zip-line. */
export const ZIP_HANG = 2.05;
export const ZIP_ACCEL = 3;
export const DISTRICT_LENGTH = 500;
/** Speeds blend into the new district over this many metres. */
export const DISTRICT_BLEND = 60;
export const LEAD_START = 18;
export const LEAD_MAX = 24;
export const LEAD_WARN = 6;
/** Timing windows for perfect moves shrink linearly from WINDOW_START to WINDOW_END over WINDOW_RAMP metres. */
export const WINDOW_START = 0.18;
export const WINDOW_END = 0.11;
export const WINDOW_RAMP = 2000;
/** Fairness margins: a gap must be clearable when the jump starts this many seconds before the edge... */
export const TAKEOFF_SLACK = 0.12;
/** ...with the feet this far above the far roof when they reach it... */
export const LAND_MARGIN = 0.15;
/** ...using only this share of a full jump's flight. */
export const GAP_SAFETY = 0.88;
/** Falling this far below the last roof stood on is a fall. */
export const FALL_LIMIT = 9;
/** Feet this close below a roof's top when meeting its face still land on it. */
export const CORNER = 0.25;
/** Speed above the district's pace bleeds off at this rate (per second); speed below it recovers faster. */
export const RELAX_DOWN = 0.35;
export const RELAX_UP = 0.5;

export const DISTRICT_KEYS = ['dusk', 'rain', 'harbour', 'park', 'station'] as const;
export type DistrictKey = typeof DISTRICT_KEYS[number];
export const districtKey = (district: number): DistrictKey => DISTRICT_KEYS[district % DISTRICT_KEYS.length];

export const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export const districtAt = (distance: number) => Math.max(0, Math.floor(distance / DISTRICT_LENGTH));

export interface Speeds {
  /** The most the runner can reach in this district. */
  top: number;
  /** The least: stumbles never push below it, and every gap is generated to be clearable at it. */
  floor: number;
  /** The drone's speed. Faster than this and the searchlight falls behind. */
  drone: number;
  /** Where speed settles without perfect moves: a little slower than the drone. */
  pace: number;
}

function districtSpeeds(d: number): Speeds {
  const top = Math.min(16, 8 + 2 * d);
  const floor = top * 0.6;
  const drone = floor + (top - floor) * Math.min(0.75, 0.5 + 0.025 * d);
  // Without perfect moves the runner settles this much slower than the drone; the gap widens each district up to the 13th.
  const pace = drone - top * (0.02 + 0.013 * Math.min(d, 12));
  return { top, floor, drone, pace };
}

/** Speeds at a distance into the run. They step up per district, blended over DISTRICT_BLEND metres, so they never fall. */
export function speedsAt(distance: number): Speeds {
  const d = districtAt(distance);
  const now = districtSpeeds(d);
  if (d === 0) return now;
  const t = clamp01((distance - d * DISTRICT_LENGTH) / DISTRICT_BLEND);
  if (t >= 1) return now;
  const before = districtSpeeds(d - 1);
  return {
    top: lerp(before.top, now.top, t),
    floor: lerp(before.floor, now.floor, t),
    drone: lerp(before.drone, now.drone, t),
    pace: lerp(before.pace, now.pace, t),
  };
}

/** Seconds of the perfect-timing window at a distance: about 180 ms at the start, 110 ms from 2 km on. */
export const timingWindow = (distance: number) => lerp(WINDOW_START, WINDOW_END, clamp01(distance / WINDOW_RAMP));

/** Speed after a perfect move: a share of the top speed that grows with the combo, capped at the top. */
export function boostedSpeed(speed: number, top: number, combo: number): number {
  const boost = top * 0.065 * (1 + 0.1 * Math.min(Math.max(combo - 1, 0), 5));
  return Math.min(top, speed + boost);
}

/** Speed after a stumble: always lower (unless already at the floor), never below the floor. */
export function stumbleSpeed(speed: number, floor: number): number {
  return Math.max(floor, speed - Math.max(1.4, speed * 0.22));
}

/** Speed relaxing towards the pace for dt seconds (exponential, slower when above the pace). */
export function relaxSpeed(speed: number, pace: number, dt: number): number {
  const rate = speed > pace ? RELAX_DOWN : RELAX_UP;
  return speed + (pace - speed) * (1 - Math.exp(-rate * dt));
}

/** The pursuit: the searchlight's distance behind the runner changes by the runner's travel minus the drone's. */
export function advanceLead(lead: number, travelled: number, droneSpeed: number, dt: number): number {
  return Math.min(LEAD_MAX, lead + travelled - droneSpeed * dt);
}

/** One airborne physics step, shared by the game and the fairness checks. */
export function airStep(state: { y: number; vy: number; holding: boolean }, held: boolean, dt: number): void {
  if (state.holding && (!held || state.vy <= 0)) {
    if (state.vy > JUMP_CUT && !held) state.vy = JUMP_CUT;
    state.holding = false;
  }
  const g = state.vy > 0 && state.holding ? GRAVITY_HOLD : GRAVITY;
  state.vy = Math.max(-MAX_FALL, state.vy - g * dt);
  state.y += state.vy * dt;
}

/**
 * Flight time of a jump from y = 0 until the feet come back down through `dh` (relative to takeoff), holding the
 * jump for `hold` seconds (a full jump by default). Infinity when the jump never gets that high.
 */
export function flightTime(dh: number, hold = Infinity): number {
  const state = { y: 0, vy: JUMP_SPEED, holding: true };
  let reached = dh <= 0;
  for (let t = SUB_STEP; t < 6; t += SUB_STEP) {
    airStep(state, t <= hold, SUB_STEP);
    if (state.y >= dh) reached = true;
    if (reached && state.vy <= 0 && state.y <= dh) return t;
    if (!reached && state.vy <= 0) break;
  }
  return Infinity;
}

/** Highest point of a full jump above its takeoff. */
export function jumpApex(): number {
  const state = { y: 0, vy: JUMP_SPEED, holding: true };
  let apex = 0;
  for (let t = 0; t < 3 && state.vy > 0; t += SUB_STEP) { airStep(state, true, SUB_STEP); apex = Math.max(apex, state.y); }
  return apex;
}

/**
 * Widest gap (edge to edge) the generator may place before a roof `dh` metres higher (negative: lower) when the
 * runner is at `speed`. The runner is supported until their centre passes the edge by HALF_WIDTH and touches the
 * next face when their centre is HALF_WIDTH short of it; the jump may start TAKEOFF_SLACK early, the feet must be
 * LAND_MARGIN above the roof at the face, and only GAP_SAFETY of the flight counts.
 */
export function maxGap(speed: number, dh: number): number {
  const t = flightTime(dh + LAND_MARGIN);
  if (!Number.isFinite(t)) return 0;
  return Math.max(0, GAP_SAFETY * speed * t + 2 * HALF_WIDTH - TAKEOFF_SLACK * speed);
}

/** How far the feet sink during coyote time, before the latest possible jump. */
const COYOTE_DROP = 0.5 * GRAVITY * COYOTE * COYOTE;

/**
 * The furthest a jump held until touchdown carries the body's centre past a roof's edge at `speed` before the feet
 * come down through `dh` (relative to the roof). The latest takeoff is at the end of coyote time. Whatever a gap
 * leads to must reach at least this far, so holding jump the whole way (as the controls teach) never sails past it.
 */
export function longestJump(speed: number, dh: number): number {
  const t = flightTime(dh + COYOTE_DROP);
  return HALF_WIDTH + speed * (COYOTE + (Number.isFinite(t) ? t : 0));
}

// ---------------------------------------------------------------------------------------------------------------
// Course

export type RoofKind = 'roof' | 'boom' | 'deck';
export interface Roof {
  id: number;
  x0: number;
  x1: number;
  top: number;
  kind: RoofKind;
  /** Taller than a jump: only a wall-kick (or a slow scramble) gets up it. */
  wall: boolean;
  /** Crane booms: land on them from above, pass under them from below. */
  oneWay: boolean;
  district: number;
  seed: number;
  /** Gap from the previous roof's end, and the height change from it. */
  gap: number;
  dh: number;
  /** Reached by zip-line, not by jumping. */
  zipIn: boolean;
  /** A zip-line starts at this roof's far edge. */
  zipOut: boolean;
}
export type ObstacleKind = 'vault' | 'pipe';
export interface Obstacle {
  id: number;
  kind: ObstacleKind;
  x0: number;
  x1: number;
  y0: number;
  y1: number;
  district: number;
  seed: number;
  /** A stumble already happened here (pipes are hit once). */
  hit: boolean;
  /** A perfect move was already scored here. */
  scored: boolean;
}
export interface Zip {
  id: number;
  /** Cable from (x0, y0) down to (x1, y1). The handle hangs at the start. */
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  /** Where the runner's centre grabs the handle. */
  grabX: number;
  launchTop: number;
  district: number;
  ridden: boolean;
}
export type PanelState = 'intact' | 'cracking' | 'falling';
export interface Panel {
  id: number;
  group: number;
  x0: number;
  x1: number;
  top: number;
  state: PanelState;
  timer: number;
  /** How far it has dropped, for drawing. */
  drop: number;
  vy: number;
  district: number;
}
export type ChunkKind = 'plain' | 'drop' | 'step' | 'wall' | 'crane' | 'zip' | 'canopy';
/** The district that introduces each set piece. */
export const SET_PIECES: Partial<Record<ChunkKind, number>> = { wall: 1, crane: 2, zip: 3, canopy: 4 };
/** Each district's own set piece, which it is guaranteed to show several times. */
const SIGNATURES: Partial<Record<DistrictKey, ChunkKind>> = { rain: 'wall', harbour: 'crane', park: 'zip', station: 'canopy' };
export const signatureOf = (district: number): ChunkKind | null => (district > 0 ? SIGNATURES[districtKey(district)] ?? null : null);
/** How many of its signature set piece a district is guaranteed: more on the first visit, when it is new. */
export const signatureCount = (district: number) => (district < DISTRICT_KEYS.length ? 3 : 2);
/** Chunks between two guaranteed signature pieces. */
const SIGNATURE_SPACING = 2;

const START_X1 = 30;
/** A chunk that cannot fit at the current height is replaced by a plain roof that heads where it can. */
type Nudge = 'up' | 'down' | null;

export class Course {
  roofs: Roof[] = [];
  obstacles: Obstacle[] = [];
  zips: Zip[] = [];
  panels: Panel[] = [];
  /** Counts of generated chunks, for tests and tuning. */
  counts: Record<ChunkKind, number> = { plain: 0, drop: 0, step: 0, wall: 0, crane: 0, zip: 0, canopy: 0 };
  cursor: number;
  private nextId = 1;
  private lastDistrict = 0;
  private lastKind: ChunkKind = 'plain';
  private pending: ChunkKind[] = [];
  private signature: ChunkKind | null = null;
  /** Guaranteed signature pieces the current district still owes, and chunks since the last one. */
  private owed = 0;
  private sinceSignature = 0;
  /** The newest roof gets its obstacles once the following chunk is known, so its run-out fits what comes next. */
  private unfilled: { roof: Roof; startClear: number } | null = null;

  constructor(private random: () => number) {
    const start = this.addRoof(-40, START_X1 + 40, 0, 'roof', 0, 0);
    this.unfilled = { roof: start, startClear: 70 };
    this.cursor = START_X1;
  }

  get last(): Roof { return this.roofs[this.roofs.length - 1]; }

  extend(untilX: number): void {
    while (this.cursor < untilX) this.chunk();
  }

  /** Drops everything that ends before `x`. */
  prune(x: number): void {
    const keep = <T extends { x1: number }>(list: T[]) => (list.length && list[0].x1 < x ? list.filter(item => item.x1 >= x) : list);
    // Keep at least the newest roof, which the generator builds on.
    if (this.roofs.length > 1) {
      const roofs = keep(this.roofs);
      this.roofs = roofs.length ? roofs : [this.last];
    }
    this.obstacles = keep(this.obstacles);
    this.zips = keep(this.zips);
    this.panels = keep(this.panels);
  }

  private id(): number { return this.nextId++; }

  private addRoof(x0: number, length: number, top: number, kind: RoofKind, gap: number, dh: number, extra: Partial<Roof> = {}): Roof {
    const roof: Roof = {
      id: this.id(), x0, x1: x0 + length, top, kind, wall: false, oneWay: kind === 'boom',
      district: districtAt(Math.max(0, x0)), seed: this.random(), gap, dh, zipIn: false, zipOut: false, ...extra,
    };
    this.roofs.push(roof);
    this.cursor = roof.x1;
    return roof;
  }

  private pickKind(d: number): ChunkKind {
    // Set pieces get denser the further the run goes: each one's weight grows for six districts after it appears.
    const grow = (kind: ChunkKind) => {
      const intro = SET_PIECES[kind] ?? 0;
      return d >= intro ? 1 + 0.25 * Math.min(d - intro, 6) : 0;
    };
    const weights: Array<[ChunkKind, number]> = [
      ['plain', Math.max(0.3, 1 - 0.12 * d)], ['drop', 0.2], ['step', 0.14],
      ['wall', 0.3 * grow('wall')], ['crane', 0.3 * grow('crane')], ['zip', 0.26 * grow('zip')], ['canopy', 0.26 * grow('canopy')],
    ];
    const top = this.last.top;
    for (const entry of weights) {
      // The district's own set piece shows up more while it is new.
      if (entry[0] === this.signature) entry[1] *= 1.6;
      // Climb out of low stretches and come down from high ones.
      if (top < -2 && (entry[0] === 'step' || entry[0] === 'wall')) entry[1] *= 1.8;
      if (top < -2 && entry[0] === 'drop') entry[1] *= 0.4;
      if (top > 3 && (entry[0] === 'drop' || entry[0] === 'zip' || entry[0] === 'canopy')) entry[1] *= 1.6;
      // No set piece twice in a row.
      if (entry[0] === this.lastKind && entry[0] !== 'plain') entry[1] = 0;
    }
    const total = weights.reduce((sum, [, w]) => sum + w, 0);
    let roll = this.random() * total;
    for (const [kind, w] of weights) { roll -= w; if (roll < 0) return kind; }
    return 'plain';
  }

  /** Why a chunk cannot go here: null when it fits, otherwise the way the skyline should head first. */
  private blocked(kind: ChunkKind, prev: Roof): { nudge: Nudge } | null {
    const top = prev.top;
    switch (kind) {
      case 'wall': return top > 5 ? { nudge: 'down' } : prev.kind !== 'roof' ? { nudge: null } : null;
      case 'drop': return top < -4 ? { nudge: 'up' } : null;
      case 'canopy': return top < -4 ? { nudge: 'up' } : null;
      case 'zip': return top < -4 ? { nudge: 'up' } : prev.kind !== 'roof' || prev.zipIn || prev.x1 - prev.x0 < 10 ? { nudge: null } : null;
      case 'step': return top > 8 ? { nudge: 'down' } : null;
      default: return null;
    }
  }

  private chunk(): void {
    const d = districtAt(this.cursor);
    if (d > this.lastDistrict) {
      this.lastDistrict = d;
      // A breather roof, then the new district's set piece, which keeps coming back until it has been seen enough.
      this.signature = signatureOf(d);
      this.owed = this.signature ? signatureCount(d) : 0;
      this.sinceSignature = SIGNATURE_SPACING - 1;
      this.pending = ['plain'];
    }
    const forced = !this.pending.length && this.owed > 0 && this.sinceSignature >= SIGNATURE_SPACING;
    let kind = this.pending.shift() ?? (forced ? this.signature! : this.pickKind(d));
    const prev = this.last;
    const top = prev.top;
    // Set pieces that need room become a plain roof that heads up or down towards where they fit.
    let nudge: Nudge = null;
    const block = this.blocked(kind, prev);
    if (block) {
      nudge = block.nudge;
      kind = 'plain';
    }
    this.counts[kind] += 1;
    this.lastKind = kind;
    if (kind === this.signature && this.signature) {
      this.owed = Math.max(0, this.owed - 1);
      this.sinceSignature = 0;
    } else {
      this.sinceSignature += 1;
    }
    const sp = speedsAt(Math.max(0, this.cursor));
    const floorV = speedsAt(Math.max(0, this.cursor - 6)).floor;
    // The fastest the runner can be anywhere in this chunk: speeds never fall, so look a blend's length ahead.
    const topV = speedsAt(Math.max(0, this.cursor + DISTRICT_BLEND)).top;

    switch (kind) {
      case 'plain': {
        this.fillPrevious(this.edgeClear(sp.top));
        const dh = nudge === 'up' ? this.pickDh(0.4, 1.2) : nudge === 'down' ? this.pickDh(-2.5, -0.8) : this.pickDh(-2.5, 1.2);
        const gap = this.pickGap(floorV, dh, d);
        const roof = this.addRoof(this.cursor + gap, Math.max(this.roofLength(d), this.reach(topV, gap, dh)), top + dh, 'roof', gap, dh);
        this.unfilled = { roof, startClear: this.landClear(gap, dh, sp.top) };
        break;
      }
      case 'drop': {
        this.fillPrevious(0.3 * sp.top + 2.5);
        const dh = -(4.4 + this.random() * 1.6);
        const gap = this.random() < 0.5 ? 0 : Math.min(maxGap(floorV, dh), 0.8 + this.random() * 1.6);
        const roof = this.addRoof(this.cursor + gap, Math.max(this.roofLength(d), this.reach(topV, gap, dh)), top + dh, 'roof', gap, dh);
        this.unfilled = { roof, startClear: this.landClear(gap, dh, sp.top) };
        break;
      }
      case 'step': {
        this.fillPrevious(0.35 * sp.top + 2.5);
        const dh = 0.5 + this.random() * 0.6;
        const roof = this.addRoof(this.cursor, Math.max(this.roofLength(d), this.reach(topV, 0, dh)), top + dh, 'roof', 0, dh);
        this.unfilled = { roof, startClear: 0.45 * sp.top + 2.5 };
        break;
      }
      case 'wall': {
        this.fillPrevious(0.4 * sp.top + 3);
        const dh = WALL_MIN + this.random();
        const roof = this.addRoof(this.cursor, this.roofLength(d), top + dh, 'roof', 0, dh, { wall: true });
        this.unfilled = { roof, startClear: 0.45 * sp.top + 3.5 };
        break;
      }
      case 'crane': {
        this.fillPrevious(this.edgeClear(sp.top));
        const dh1 = this.pickDh(-1.2, 0.3);
        const gap1 = this.pickGap(floorV, dh1, d);
        // Long enough to catch a jump held all the way at top speed, with room to line up the next one.
        const length = Math.max(Math.min(15, 8 + this.random() * 4 + d * 0.5), this.reach(topV, gap1, dh1));
        const boom = this.addRoof(this.cursor + gap1, length, top + dh1, 'boom', gap1, dh1);
        const floor2 = speedsAt(Math.max(0, boom.x1 - 6)).floor;
        const dh2 = this.pickDh(-1.5, 0.6, boom.top);
        const gap2 = this.pickGap(floor2, dh2, d);
        const roof = this.addRoof(this.cursor + gap2, Math.max(this.roofLength(d), this.reach(topV, gap2, dh2)), boom.top + dh2, 'roof', gap2, dh2);
        this.unfilled = { roof, startClear: this.landClear(gap2, dh2, sp.top) };
        break;
      }
      case 'zip': {
        this.fillPrevious(0.45 * sp.top + 4.5);
        prev.zipOut = true;
        const span = Math.min(27, 15 + this.random() * 6 + d);
        const dh = -(2.5 + this.random() * 2.5);
        const roof = this.addRoof(this.cursor + span, 24 + this.random() * 10, top + dh, 'roof', span, dh, { zipIn: true });
        this.zips.push({
          id: this.id(), x0: prev.x1 - 0.4, y0: top + 4.3, x1: roof.x0 + 3, y1: roof.top + 4.6,
          grabX: prev.x1 - 0.4, launchTop: top, district: d, ridden: false,
        });
        this.unfilled = { roof, startClear: 3 + 0.5 * (sp.top + 2) + 0.45 * sp.top + 2 };
        break;
      }
      case 'canopy': {
        this.fillPrevious(this.edgeClear(sp.top));
        const dh = this.pickDh(-1.5, 0.5);
        const gap = this.pickGap(floorV, dh, d);
        const panelTop = top + dh;
        const span = 12 + this.random() * 8;
        // Run-out past the canopy, so a fall from its far end still lands on the deck, and so does a jump held over it.
        const tail = sp.top * (CRACK_TIME + Math.sqrt(2 * CANOPY_DROP / GRAVITY)) + 3;
        const length = Math.max(span + tail, this.reach(topV, gap, dh - CANOPY_DROP));
        const deck = this.addRoof(this.cursor + gap, length, panelTop - CANOPY_DROP, 'deck', gap, dh);
        const count = Math.max(3, Math.round(span / 4));
        const width = span / count;
        const group = this.id();
        for (let i = 0; i < count; i++) {
          this.panels.push({ id: this.id(), group, x0: deck.x0 + i * width, x1: deck.x0 + (i + 1) * width, top: panelTop, state: 'intact', timer: 0, drop: 0, vy: 0, district: d });
        }
        this.unfilled = null;
        break;
      }
    }
  }

  /** Length a surface `gap` metres past an edge needs so a full-hold jump at `top` lands on it with room to spare. */
  private reach(top: number, gap: number, dh: number): number {
    return longestJump(top, dh) + 0.3 * top + 1 - gap;
  }

  private pickDh(lo: number, hi: number, from = this.last.top): number {
    // Drift back towards roof level 0, so the set pieces that need headroom or depth keep turning up.
    const shift = Math.max(-1.2, Math.min(1.2, -from * 0.22));
    lo += shift;
    hi = Math.min(hi + shift, Math.max(hi, 1.8));
    if (from > 7) hi = Math.min(hi, 0);
    if (from < -6) lo = Math.max(lo, 0);
    if (lo > hi) lo = hi;
    return lo + (hi - lo) * this.random();
  }

  private pickGap(floorV: number, dh: number, d: number): number {
    const most = maxGap(floorV, dh);
    const least = Math.min(most, 1.4 + 0.3 * Math.min(d, 5));
    const spread = Math.min(1, 0.45 + 0.14 * d);
    return least + (most - least) * this.random() * spread;
  }

  private roofLength(d: number): number {
    return 13 + this.random() * 12 + 1.5 * Math.min(d, 6);
  }

  /** Room before a gap's edge: time to come out of a vault or stumble and line up the jump. */
  private edgeClear(top: number): number { return 0.4 * top + 3.5; }

  /** Room after landing from a gap before the first obstacle, even after an over-long jump at top speed. */
  private landClear(gap: number, dh: number, top: number): number {
    const overshoot = Math.max(0, top * flightTime(dh) - (gap - 2 * HALF_WIDTH));
    return Math.max(4, 0.5 * overshoot + 0.45 * top);
  }

  private fillPrevious(endClear: number): void {
    const job = this.unfilled;
    this.unfilled = null;
    if (!job) return;
    const { roof, startClear } = job;
    const d = roof.district;
    const top = speedsAt(Math.max(0, roof.x0)).top;
    const spacing = 0.75 * top + 2;
    const chance = Math.min(0.9, 0.55 + 0.08 * d);
    const end = roof.x1 - endClear;
    let x = roof.x0 + startClear;
    while (x + 1.8 <= end) {
      if (this.random() < chance) {
        if (this.random() < 0.45) {
          this.obstacles.push({ id: this.id(), kind: 'pipe', x0: x, x1: x + PIPE_DEPTH, y0: roof.top + PIPE_LOW, y1: roof.top + PIPE_HIGH, district: d, seed: this.random(), hit: false, scored: false });
          x += PIPE_DEPTH + spacing + this.random() * 4;
        } else {
          const width = 1.1 + this.random() * 0.6;
          const height = 0.75 + this.random() * 0.35;
          if (x + width > end) break;
          this.obstacles.push({ id: this.id(), kind: 'vault', x0: x, x1: x + width, y0: roof.top, y1: roof.top + height, district: d, seed: this.random(), hit: false, scored: false });
          x += width + spacing + this.random() * 4;
        }
      } else {
        x += spacing * 0.6;
      }
    }
  }
}

// ---------------------------------------------------------------------------------------------------------------
// Run simulation

export type Mode = 'run' | 'slide' | 'roll' | 'air' | 'vault' | 'climb' | 'kick' | 'cling' | 'zip' | 'caught' | 'fallen';
export type Move = 'vault' | 'slide' | 'roll' | 'kick' | 'edge' | 'zip';
export type StumbleReason = 'vault' | 'pipe' | 'hard' | 'wall' | 'ledge';
/** How a fall happened: ran off an edge without jumping, jumped and came down short, or jumped past the landing. */
export type FallReason = 'runoff' | 'short' | 'long';
export type SimEventType =
  | 'jump' | 'land' | 'perfect' | 'stumble' | 'slide' | 'roll' | 'vault' | 'kick' | 'crack' | 'collapse'
  | 'zip' | 'release' | 'district' | 'warn' | 'bonk' | 'caught' | 'fell' | 'tuck';
export interface SimEvent {
  type: SimEventType;
  x: number;
  y: number;
  move?: Move;
  reason?: StumbleReason;
  combo?: number;
  district?: number;
  hard?: boolean;
  /** Landing speed; for 'tuck', how far the hop that was taken back had risen. */
  impact?: number;
  fall?: FallReason;
}
export interface Input {
  /** Held state of the jump and slide controls. */
  jump: boolean;
  slide: boolean;
  /** A new press since the last step. */
  jumpPressed: boolean;
  slidePressed: boolean;
  /**
   * Touch only: the slide press is a swipe that began this many seconds ago. It is timed from when the swipe began,
   * not from when it was recognised (capped at SWIPE_CREDIT).
   */
  swipeAge?: number;
  /** Touch only: the swipe is the same touch that made the latest jump press, so the hop that press began is taken back. */
  sameTouch?: boolean;
  /** Touch only: a touch is down that may still turn into a swipe; a hop into a pipe or out of a hard landing waits for it. */
  undecided?: boolean;
}
/** The next thing to time, for the on-screen cue and for bots. `tau` is seconds to contact. */
export interface Cue {
  move: Move;
  x: number;
  y: number;
  tau: number;
  window: number;
  /** How late after contact the move still counts (seconds). */
  late: number;
}
export interface Landing {
  x: number;
  y: number;
  time: number;
  impact: number;
  /** Comes down on a surface. */
  landed: boolean;
  /** Meets a building face too low to mantle: a fall. */
  bonk: boolean;
  hard: boolean;
  /** Meets a face first (a wall, a ledge to mantle, a rooftop unit or a bonk). */
  face: boolean;
}
interface Key { x: number; y: number; t: number; }
interface Script { kind: 'vault' | 'climb' | 'kick'; keys: Key[]; t: number; after: Mode; }
interface Face { x0: number; x1: number; top: number; landTop: number; roof: Roof | null; obstacle: Obstacle | null; }
interface Support { top: number; roof: Roof | null; panel: Panel | null; obstacle: Obstacle | null; }

export interface SimOptions {
  /** The drone chases (default true). Tests switch it off to check pure traversal. */
  pursuit?: boolean;
  /** Hold the runner at the district's floor speed, with no boosts or penalties. */
  floorSpeed?: boolean;
}

const smooth = (t: number) => t * t * (3 - 2 * t);
const AHEAD = 160;
const BEHIND = 70;

export class RunSim {
  readonly course: Course;
  x = 0;
  y = 0;
  vy = 0;
  speed: number;
  mode: Mode = 'run';
  modeTime = 0;
  holding = false;
  coyote = 0;
  jumpBuffer = 0;
  slideBuffer = 0;
  lastJumpPress = -Infinity;
  lastSlidePress = -Infinity;
  jumpStartedAt = -Infinity;
  /** The last jump left the ground (rather than a ledge, wall or zip). */
  groundJump = false;
  /** Height of the surface the last jump left. */
  takeoffTop = 0;
  airSince = 0;
  peak = 0;
  lastTop = 0;
  /** Roof left by running off it, for coyote jumps. */
  leftRoof: Roof | null = null;
  lead = LEAD_START;
  clock = 0;
  combo = 0;
  bestCombo = 0;
  perfects = 0;
  stumbles = 0;
  district = 0;
  maxSpeed = 0;
  status: 'running' | 'caught' | 'fell' = 'running';
  /** The current ground, if any. */
  support: Support | null = null;
  script: Script | null = null;
  zip: Zip | null = null;
  zipS = 0;
  zipSpeed = 0;
  clingRoof: Roof | null = null;
  clingFloor = 0;
  /** A hard landing waiting ROLL_LATE for a late roll before it becomes a stumble. */
  pendingHard = 0;
  /** When the last hard landing happened. */
  hardAt = -Infinity;
  /** Touch: a touch is down that may still become a swipe (from the latest input). */
  undecided = false;
  /** Why the run ended in a fall. */
  fallReason: FallReason | null = null;
  /** Hit a building face too low to mantle: sliding down it into the alley. */
  blocked = false;
  lastStumble = -Infinity;
  lastPerfect = -Infinity;
  events: SimEvent[] = [];
  /** The current flight began with a jump, from this roof, and has since passed above another surface. */
  private flightJumped = false;
  private flightFrom: Roof | null = null;
  private overflew = false;
  /** Seconds the pending slide press is credited back (a touch swipe timed from when it began). */
  private slideAge = 0;
  /** A pipe met during a hop that may still be taken back by a swipe. */
  private deferredPipe: Obstacle | null = null;
  private warned = false;
  private accumulator = 0;
  private options: Required<SimOptions>;

  constructor(random: () => number, options: SimOptions = {}) {
    this.options = { pursuit: true, floorSpeed: false, ...options };
    this.course = new Course(random);
    this.course.extend(AHEAD);
    const sp = speedsAt(0);
    this.speed = this.options.floorSpeed ? sp.floor : (sp.pace + sp.top) / 2;
    this.support = this.supportAt(this.x, this.y);
  }

  get distance(): number { return Math.max(0, this.x); }
  get speeds(): Speeds { return speedsAt(this.distance); }
  get window(): number { return timingWindow(this.distance); }
  get height(): number { return this.mode === 'slide' || this.mode === 'roll' ? LOW_HEIGHT : STAND_HEIGHT; }
  get grounded(): boolean { return this.mode === 'run' || this.mode === 'slide' || this.mode === 'roll'; }
  get alive(): boolean { return this.status === 'running'; }

  /** Advances by dt seconds (split into fixed steps). Returns the events of this call; the array is reused. */
  step(dt: number, input: Input): SimEvent[] {
    this.events.length = 0;
    const wasUndecided = this.undecided;
    this.undecided = !!input.undecided && this.alive;
    if (input.jumpPressed && this.alive) {
      this.jumpBuffer = BUFFER;
      this.lastJumpPress = this.clock;
    }
    if (input.slidePressed && this.alive) {
      const age = Math.min(SWIPE_CREDIT, Math.max(0, input.swipeAge ?? 0));
      this.lastSlidePress = this.clock - age;
      this.slideAge = age;
      this.slideBuffer = Math.max(BUFFER - age, 2 * SUB_STEP);
      // A swipe begins as a touch, which reads as a jump press: the slide overrides a jump still waiting.
      this.jumpBuffer = 0;
      if (input.sameTouch) this.takeBackHop();
    }
    // A touch that turned out to be a tap: a pipe met during its hop counts after all.
    if (wasUndecided && !this.undecided) this.settlePipe();
    this.accumulator += Math.min(dt, 0.1);
    while (this.accumulator >= SUB_STEP - 1e-9) {
      this.accumulator -= SUB_STEP;
      this.substep(SUB_STEP, input);
    }
    return this.events;
  }

  private emit(type: SimEventType, extra: Partial<SimEvent> = {}): void {
    this.events.push({ type, x: this.x, y: this.y, ...extra });
  }

  private setMode(mode: Mode): void {
    this.mode = mode;
    this.modeTime = 0;
  }

  private substep(dt: number, input: Input): void {
    this.clock += dt;
    this.modeTime += dt;
    this.jumpBuffer = Math.max(0, this.jumpBuffer - dt);
    this.slideBuffer = Math.max(0, this.slideBuffer - dt);
    this.coyote = Math.max(0, this.coyote - dt);
    this.updatePanels(dt);
    const x0 = this.x;

    if (!this.alive) {
      this.deadStep(dt);
    } else {
      const sp = this.speeds;
      if (this.options.floorSpeed) this.speed = sp.floor;
      else if (this.mode !== 'zip' && this.mode !== 'cling') this.speed = Math.min(sp.top, Math.max(sp.floor, relaxSpeed(this.speed, sp.pace, dt)));
      switch (this.mode) {
        case 'run': case 'slide': case 'roll': this.groundStep(dt, input); break;
        case 'air': this.airMove(dt, input); break;
        case 'vault': case 'climb': case 'kick': this.scriptStep(dt); break;
        case 'cling': this.clingStep(dt); break;
        case 'zip': this.zipStep(dt); break;
        default: break;
      }
      this.maxSpeed = Math.max(this.maxSpeed, this.mode === 'zip' ? this.zipSpeed : this.speed);
      const district = districtAt(this.distance);
      if (district > this.district) {
        this.district = district;
        this.emit('district', { district });
      }
      if (this.options.pursuit && this.alive) {
        this.lead = advanceLead(this.lead, this.x - x0, sp.drone, dt);
        if (this.lead < LEAD_WARN && !this.warned) { this.warned = true; this.emit('warn'); }
        if (this.lead > LEAD_WARN + 2) this.warned = false;
        if (this.lead <= 0) {
          this.lead = 0;
          this.status = 'caught';
          this.setMode('caught');
          this.emit('caught');
        }
      }
      if (this.alive && this.y < this.lastTop - FALL_LIMIT) {
        this.status = 'fell';
        this.fallReason = !this.flightJumped ? 'runoff' : this.overflew ? 'long' : 'short';
        this.setMode('fallen');
        this.emit('fell', { fall: this.fallReason });
      }
    }
    this.course.extend(this.x + AHEAD);
    this.course.prune(this.x - BEHIND);
  }

  // --- Queries -------------------------------------------------------------------------------------------------

  /** Highest surface at the feet (within a small tolerance) under a body centred at x. */
  supportAt(x: number, y: number): Support | null {
    let best: Support | null = null;
    const consider = (top: number, x0: number, x1: number, roof: Roof | null, panel: Panel | null, obstacle: Obstacle | null) => {
      if (x + HALF_WIDTH <= x0 || x - HALF_WIDTH >= x1) return;
      if (top > y + 0.05 || top < y - 0.3) return;
      if (!best || top > best.top) best = { top, roof, panel, obstacle };
    };
    for (const roof of this.course.roofs) consider(roof.top, roof.x0, roof.x1, roof, null, null);
    for (const panel of this.course.panels) if (panel.state !== 'falling') consider(panel.top, panel.x0, panel.x1, null, panel, null);
    for (const ob of this.course.obstacles) if (ob.kind === 'vault') consider(ob.y1, ob.x0, ob.x1, null, null, ob);
    return best;
  }

  /** The roof under (or just behind) x: the one a jump from here would leave. */
  roofAt(x: number): Roof | null {
    let found: Roof | null = null;
    for (const roof of this.course.roofs) {
      if (x + HALF_WIDTH > roof.x0 && x - HALF_WIDTH < roof.x1 + 0.01 && (!found || roof.top > found.top)) found = roof;
    }
    return found;
  }

  private nextRoof(roof: Roof): Roof | null {
    const list = this.course.roofs;
    const i = list.indexOf(roof);
    return i >= 0 && i + 1 < list.length ? list[i + 1] : null;
  }

  /** First solid face a body moving from x to nx at height y..y+height runs into. */
  private faceAhead(x: number, nx: number, y: number, height: number): Face | null {
    let best: Face | null = null;
    for (const roof of this.course.roofs) {
      if (roof.oneWay) continue;
      if (roof.x0 < x + HALF_WIDTH - 1e-6 || roof.x0 > nx + HALF_WIDTH) continue;
      if (y >= roof.top - 0.02) continue;
      if (!best || roof.x0 < best.x0) best = { x0: roof.x0, x1: roof.x0 + 0.6, top: roof.top, landTop: roof.top, roof, obstacle: null };
    }
    for (const ob of this.course.obstacles) {
      if (ob.kind !== 'vault') continue;
      if (ob.x0 < x + HALF_WIDTH - 1e-6 || ob.x0 > nx + HALF_WIDTH) continue;
      if (y >= ob.y1 - 0.02 || y + height <= ob.y0) continue;
      if (!best || ob.x0 < best.x0) best = { x0: ob.x0, x1: ob.x1, top: ob.y1, landTop: ob.y0, roof: null, obstacle: ob };
    }
    return best;
  }

  /** The next vaultable face ahead on the ground: an obstacle or a low step up to the next roof. */
  private vaultAhead(maxDistance: number): Face | null {
    let best: Face | null = null;
    const reach = this.x + HALF_WIDTH + maxDistance;
    for (const ob of this.course.obstacles) {
      if (ob.kind !== 'vault' || ob.x0 < this.x + HALF_WIDTH - 0.05 || ob.x0 > reach) continue;
      const rise = ob.y1 - this.y;
      if (rise <= 0.05 || rise > VAULT_MAX || this.y + this.height <= ob.y0) continue;
      if (!best || ob.x0 < best.x0) best = { x0: ob.x0, x1: ob.x1, top: ob.y1, landTop: ob.y0, roof: null, obstacle: ob };
    }
    for (const roof of this.course.roofs) {
      // Only a roof that joins this one: a higher roof across a gap is jumped, not vaulted.
      if (roof.oneWay || roof.wall || roof.gap >= 0.5 || roof.x0 < this.x + HALF_WIDTH - 0.05 || roof.x0 > reach) continue;
      const rise = roof.top - this.y;
      if (rise <= 0.05 || rise > VAULT_MAX) continue;
      if (!best || roof.x0 < best.x0) best = { x0: roof.x0, x1: roof.x0 + 0.6, top: roof.top, landTop: roof.top, roof, obstacle: null };
    }
    return best;
  }

  /** The next pipe ahead of a body at `from` (front within maxDistance) that the standing runner would hit. */
  private pipeAhead(maxDistance: number, from = this.x): Obstacle | null {
    let best: Obstacle | null = null;
    for (const ob of this.course.obstacles) {
      if (ob.kind !== 'pipe' || ob.hit || ob.x0 < from + HALF_WIDTH - 0.05 || ob.x0 > from + HALF_WIDTH + maxDistance) continue;
      if (this.y >= ob.y1 || this.y + STAND_HEIGHT <= ob.y0) continue;
      if (!best || ob.x0 < best.x0) best = ob;
    }
    return best;
  }

  /** The edge of a gap ahead of the roof under x (none when the next roof joins it, or a zip-line leaves from it). */
  edgeAhead(from: Roof | null = this.roofAt(this.x)): { x: number; top: number } | null {
    if (!from || from.zipOut) return null;
    const next = this.nextRoof(from);
    if (next && next.x0 - from.x1 < 0.5) return null;
    return { x: from.x1 + HALF_WIDTH, top: from.top };
  }

  private wallAhead(maxDistance: number): Roof | null {
    for (const roof of this.course.roofs) {
      if (!roof.wall || roof.x0 < this.x + HALF_WIDTH - 0.05 || roof.x0 > this.x + HALF_WIDTH + maxDistance) continue;
      if (this.y >= roof.top) continue;
      return roof;
    }
    return null;
  }

  private zipAhead(maxDistance: number): Zip | null {
    for (const zip of this.course.zips) {
      if (zip.ridden || zip.grabX < this.x - 0.05 || zip.grabX > this.x + maxDistance) continue;
      return zip;
    }
    return null;
  }

  /**
   * Where the current flight comes down if the jump is held (`hold`) or let go now, ignoring pipes. Faces count:
   * a flight that meets a face below its roof (and too low to mantle) reports `bonk`.
   */
  predict(hold = this.holding, speedScale = 1): Landing {
    const state = { y: this.y, vy: this.vy, holding: this.holding };
    let x = this.x;
    let speed = this.speed * speedScale;
    for (let t = SUB_STEP; t < 4; t += SUB_STEP) {
      const prevY = state.y;
      airStep(state, hold, SUB_STEP);
      if (!this.options.floorSpeed) {
        const sp = speedsAt(Math.max(0, x));
        speed = Math.min(sp.top, Math.max(sp.floor, relaxSpeed(speed, sp.pace, SUB_STEP)));
      }
      const nx = this.blocked ? x : x + speed * SUB_STEP;
      if (!this.blocked) {
        const face = this.faceAhead(x, nx, Math.min(prevY, state.y), STAND_HEIGHT);
        if (face && !this.stepsOver(face, state.y, state.vy)) {
          if ((face.obstacle && face.top - state.y <= 0.35) || this.cornerLands(face, state.y) || this.risesOver(face, state.y, state.vy, state.holding)) {
            return { x: face.x0, y: face.top, time: t, impact: Math.max(0, -state.vy), landed: true, bonk: false, hard: -state.vy >= HARD_SPEED, face: false };
          }
          const bonk = !!face.roof && !face.roof.wall && face.top - state.y > LEDGE;
          return { x: face.x0 - HALF_WIDTH, y: state.y, time: t, impact: 0, landed: false, bonk, hard: false, face: true };
        }
      }
      x = nx;
      if (state.vy <= 0) {
        const top = this.landingTop(x, prevY, state.y);
        if (top !== null) {
          const impact = -state.vy;
          return { x, y: top, time: t, impact, landed: true, bonk: false, hard: impact >= HARD_SPEED, face: false };
        }
      }
      if (state.y < this.lastTop - FALL_LIMIT) break;
    }
    return { x, y: state.y, time: 4, impact: 0, landed: false, bonk: false, hard: false, face: false };
  }

  /** Feet just below a roof's top as they meet its face: land on the roof anyway. */
  private cornerLands(face: Face, y: number): boolean {
    return !!face.roof && !face.roof.wall && face.top - y <= CORNER;
  }

  /** A rising runner whose feet are about to clear a face goes over it instead of hitting it. */
  private stepsOver(face: Face, y: number, vy: number): boolean {
    return vy > 0 && face.top - y <= Math.min(0.6, vy * 0.12) && !face.roof?.wall;
  }

  /**
   * A runner meeting a roof's face while still rising fast enough to clear its lip (a late jump across a narrow gap to
   * a higher roof) steps off the face and over: the jump would have cleared it.
   */
  private risesOver(face: Face, y: number, vy: number, holding: boolean): boolean {
    if (!face.roof || face.roof.wall || vy <= 0) return false;
    return face.top - y <= (vy * vy) / (2 * (holding ? GRAVITY_HOLD : GRAVITY));
  }

  /** Top of the highest surface whose top lies between prevY and y (falling) under a body at x, or null. */
  private landingTop(x: number, prevY: number, y: number): number | null {
    let best: number | null = null;
    const consider = (top: number, x0: number, x1: number) => {
      if (x + HALF_WIDTH <= x0 || x - HALF_WIDTH >= x1) return;
      if (top > prevY + 1e-6 || top < y - 1e-6) return;
      if (best === null || top > best) best = top;
    };
    for (const roof of this.course.roofs) consider(roof.top, roof.x0, roof.x1);
    for (const panel of this.course.panels) if (panel.state !== 'falling') consider(panel.top, panel.x0, panel.x1);
    for (const ob of this.course.obstacles) if (ob.kind === 'vault') consider(ob.y1, ob.x0, ob.x1);
    return best;
  }

  /** The next thing to time, if any is close. */
  cue(lookAhead = 1.7): Cue | null {
    if (!this.alive) return null;
    const w = this.window;
    if (this.mode === 'cling' && this.clingRoof) {
      return { move: 'kick', x: this.clingRoof.x0, y: this.y + 2.4, tau: -this.modeTime, window: w, late: w };
    }
    // Just ran off an edge: a jump still counts (and is still perfect) until coyote time runs out.
    if (this.mode === 'air' && this.coyote > 0) {
      const edge = this.edgeAhead(this.leftRoof);
      if (edge) return { move: 'edge', x: edge.x - HALF_WIDTH, y: edge.top + 1.3, tau: (edge.x - this.x) / this.speed, window: w, late: COYOTE };
    }
    if (this.mode === 'air') {
      const landing = this.predict();
      if (landing.landed && landing.hard) return { move: 'roll', x: landing.x, y: landing.y + 0.6, tau: landing.time, window: w, late: ROLL_LATE };
    }
    if (!this.grounded && this.mode !== 'air') return null;
    const reach = this.speed * lookAhead;
    const candidates: Cue[] = [];
    const tauTo = (contact: number) => (contact - this.x) / this.speed;
    const vault = this.grounded ? this.vaultAhead(reach) : null;
    if (vault) candidates.push({ move: 'vault', x: (vault.x0 + vault.x1) / 2, y: vault.top + 0.9, tau: tauTo(vault.x0 - HALF_WIDTH), window: w, late: 0 });
    const pipe = this.grounded ? this.pipeAhead(reach) : null;
    if (pipe) candidates.push({ move: 'slide', x: (pipe.x0 + pipe.x1) / 2, y: pipe.y1 + 0.7, tau: tauTo(pipe.x0 - HALF_WIDTH), window: w, late: 0 });
    const wall = this.wallAhead(reach);
    if (wall) candidates.push({ move: 'kick', x: wall.x0, y: this.y + 2.4, tau: tauTo(wall.x0 - HALF_WIDTH), window: w, late: w });
    const zip = this.zipAhead(reach);
    if (zip) candidates.push({ move: 'zip', x: zip.x0, y: zip.y0 - 0.6, tau: tauTo(zip.grabX), window: w, late: 0 });
    if (this.grounded) {
      const edge = this.edgeAhead();
      if (edge && edge.x - this.x <= reach) candidates.push({ move: 'edge', x: edge.x - HALF_WIDTH, y: edge.top + 1.3, tau: tauTo(edge.x), window: w, late: COYOTE });
    }
    let best: Cue | null = null;
    for (const cue of candidates) if (cue.tau >= -cue.late && (!best || cue.tau < best.tau)) best = cue;
    return best;
  }

  // --- Moves ---------------------------------------------------------------------------------------------------

  private perfect(move: Move): void {
    this.combo += 1;
    this.bestCombo = Math.max(this.bestCombo, this.combo);
    this.perfects += 1;
    this.lastPerfect = this.clock;
    if (!this.options.floorSpeed) {
      if (this.mode === 'zip') this.zipSpeed = Math.min(this.speeds.top + 2, this.zipSpeed + this.speeds.top * 0.065);
      else this.speed = boostedSpeed(this.speed, this.speeds.top, this.combo);
    }
    this.emit('perfect', { move, combo: this.combo });
  }

  private stumble(reason: StumbleReason): void {
    this.combo = 0;
    this.stumbles += 1;
    this.lastStumble = this.clock;
    if (!this.options.floorSpeed) this.speed = stumbleSpeed(this.speed, this.speeds.floor);
    this.emit('stumble', { reason });
  }

  private startScript(kind: Script['kind'], keys: Key[], after: Mode = 'run'): void {
    this.script = { kind, keys, t: 0, after };
    this.setMode(kind);
    this.vy = 0;
    this.holding = false;
  }

  /** Path over a face: rise to clear it, cross it, come down past it. Horizontal speed is `pace` m/s. */
  private overPath(face: Face, clearance: number, pace: number, rise = 0): Key[] {
    const peak = face.top + clearance;
    const keys: Key[] = [{ x: this.x, y: this.y, t: 0 }];
    const ax = Math.max(this.x, face.x0 - HALF_WIDTH + 0.15);
    keys.push({ x: ax, y: peak, t: rise + (ax - this.x) / pace + 0.04 });
    const bx = face.x1 + HALF_WIDTH - 0.1;
    keys.push({ x: bx, y: peak, t: keys[1].t + (bx - ax) / pace });
    const ex = face.x1 + HALF_WIDTH + 0.35;
    keys.push({ x: ex, y: face.landTop, t: keys[2].t + (ex - bx) / pace + 0.04 });
    return keys;
  }

  private tryJump(): boolean {
    const w = this.window;
    // Jumping straight out of a hard landing skips the roll.
    if (this.pendingHard > 0) { this.pendingHard = 0; this.stumble('hard'); }
    // Close enough to a low face: vault it.
    const vault = this.vaultAhead(this.speed * w + 0.02);
    if (vault && this.grounded) {
      this.jumpBuffer = 0;
      if (vault.obstacle) vault.obstacle.scored = true;
      this.perfect('vault');
      this.startScript('vault', this.overPath(vault, 0.3, this.speed));
      this.emit('vault');
      return true;
    }
    const from = this.grounded ? this.roofAt(this.x) : this.leftRoof;
    const edge = this.edgeAhead(from);
    this.jumpBuffer = 0;
    this.vy = JUMP_SPEED;
    this.holding = true;
    this.groundJump = this.grounded;
    this.takeoffTop = this.y;
    this.startFlight(true, from);
    this.jumpStartedAt = this.clock;
    this.coyote = 0;
    this.setMode('air');
    this.airSince = this.clock;
    this.peak = this.y;
    this.support = null;
    this.emit('jump');
    if (edge) {
      const tau = (edge.x - this.x) / this.speed;
      if (tau <= w && tau >= -COYOTE - 0.01) this.perfect('edge');
    }
    return true;
  }

  private startSlide(): void {
    this.slideBuffer = 0;
    // A swipe counts from when it began: the pipe had to be inside the window then.
    const pipe = this.pipeAhead(this.speed * this.window + 0.02, this.x - this.speed * this.slideAge);
    this.slideAge = 0;
    const wasSliding = this.mode === 'slide';
    this.setMode('slide');
    if (pipe && !pipe.scored) {
      pipe.scored = true;
      this.perfect('slide');
    }
    if (!wasSliding) this.emit('slide');
  }

  private land(top: number, impact: number): void {
    this.y = top;
    this.vy = 0;
    this.holding = false;
    this.blocked = false;
    this.lastTop = top;
    this.setMode('run');
    this.support = this.supportAt(this.x, this.y);
    this.touchPanel();
    const hard = impact >= HARD_SPEED;
    this.emit('land', { hard, impact });
    if (hard) {
      this.hardAt = this.clock;
      const pressed = this.lastSlidePress > this.airSince && this.clock - this.lastSlidePress <= this.window + 1e-6;
      this.slideBuffer = 0;
      if (pressed) this.roll();
      else this.pendingHard = ROLL_LATE;
      return;
    }
    if (this.jumpBuffer > 0) this.tryJump();
    else if (this.slideBuffer > 0) this.startSlide();
  }

  private roll(): void {
    this.pendingHard = 0;
    this.setMode('roll');
    this.perfect('roll');
    this.emit('roll');
  }

  private enterCling(roof: Roof): void {
    this.x = roof.x0 - HALF_WIDTH;
    this.clingRoof = roof;
    this.clingFloor = this.supportAt(this.x, this.y)?.top ?? Math.min(this.y, this.lastTop);
    this.vy = 0;
    this.holding = false;
    this.setMode('cling');
    // A jump pressed just before reaching the wall kicks off it on contact.
    if (this.clock - this.lastJumpPress <= this.window + 1e-6) {
      this.jumpBuffer = 0;
      this.kick();
    }
  }

  private kick(): void {
    const roof = this.clingRoof!;
    this.perfect('kick');
    this.lastTop = roof.top;
    const keys: Key[] = [
      { x: this.x, y: this.y, t: 0 },
      { x: this.x, y: roof.top + 0.6, t: 0.22 },
      { x: roof.x0 + HALF_WIDTH + 0.9, y: roof.top, t: 0.22 + 1.2 / Math.max(this.speed, 1) },
    ];
    this.startScript('kick', keys);
    this.emit('kick');
  }

  private scramble(roof: Roof, reason: StumbleReason): void {
    this.stumble(reason);
    this.lastTop = roof.top;
    const keys: Key[] = [
      { x: this.x, y: this.y, t: 0 },
      { x: this.x, y: roof.top + 0.15, t: 0.25 + 0.12 * Math.max(0, roof.top - this.y) },
    ];
    keys.push({ x: roof.x0 + HALF_WIDTH + 0.4, y: roof.top, t: keys[1].t + 0.2 });
    this.startScript('climb', keys);
  }

  private hitFace(face: Face, airborne: boolean): void {
    if (face.roof) {
      const roof = face.roof;
      if (roof.wall) { this.enterCling(roof); return; }
      if (airborne && this.cornerLands(face, this.y)) {
        this.x = face.x0 - HALF_WIDTH + 0.02;
        this.land(roof.top, Math.max(0, -this.vy));
        return;
      }
      if (airborne && this.risesOver(face, this.y, this.vy, this.holding)) {
        // One quick step up the face and over the lip, at the speed the jump was rising.
        this.lastTop = roof.top;
        const up = (roof.top + 0.1 - this.y) / Math.max(this.vy, 4);
        this.startScript('climb', [
          { x: this.x, y: this.y, t: 0 },
          { x: face.x0 - HALF_WIDTH + 0.1, y: roof.top + 0.1, t: up },
          { x: face.x0 + HALF_WIDTH + 0.3, y: roof.top, t: up + 0.6 / Math.max(this.speed, 1) },
        ]);
        return;
      }
      const rise = roof.top - this.y;
      if (!airborne && rise <= VAULT_MAX) {
        this.stumble('vault');
        this.startScript('climb', this.overPath(face, 0.15, this.speed * 0.6, 0.12));
        return;
      }
      if (rise <= LEDGE || !airborne) { this.scramble(roof, 'ledge'); return; }
      // Too low to reach the ledge: slide down the face.
      this.x = face.x0 - HALF_WIDTH;
      this.blocked = true;
      this.holding = false;
      this.vy = Math.min(this.vy, 0);
      this.emit('bonk');
      return;
    }
    // A rooftop unit.
    if (airborne && face.top - this.y <= 0.35) {
      this.x = face.x0 - HALF_WIDTH + 0.01;
      this.land(face.top, -this.vy);
      return;
    }
    if (face.obstacle) face.obstacle.hit = true;
    this.stumble('vault');
    this.startScript('climb', this.overPath(face, 0.15, this.speed * 0.6, 0.12));
  }

  private checkPipes(): void {
    for (const ob of this.course.obstacles) {
      if (ob.kind !== 'pipe' || ob.hit) continue;
      if (this.x + HALF_WIDTH <= ob.x0 || this.x - HALF_WIDTH >= ob.x1) continue;
      if (this.y >= ob.y1 || this.y + this.height <= ob.y0) continue;
      // A touch that may still become a swipe: its hop may be taken back, so the hit waits for it.
      if (this.mode === 'air' && this.undecided && this.groundJump && this.clock - this.jumpStartedAt <= SWIPE_CREDIT) {
        this.deferredPipe ??= ob;
        continue;
      }
      ob.hit = true;
      this.stumble('pipe');
      if (this.grounded) {
        // Ducked under, the hard way.
        this.setMode('slide');
        this.modeTime = SLIDE_TIME - 0.3;
      } else {
        this.vy = Math.min(this.vy, -1);
        this.holding = false;
      }
    }
  }

  private startFlight(jumped: boolean, from: Roof | null): void {
    this.flightJumped = jumped;
    this.flightFrom = from;
    this.overflew = false;
  }

  /** Over a surface (other than the one the flight left) with the feet above it: a fall from here went too far. */
  private aboveSurface(): boolean {
    for (const roof of this.course.roofs) {
      if (roof === this.flightFrom || this.x + HALF_WIDTH <= roof.x0 || this.x - HALF_WIDTH >= roof.x1) continue;
      if (this.y > roof.top + 0.05) return true;
    }
    return false;
  }

  /**
   * A touch swipe that began as the tap which started this hop: take the hop back and slide from the roof, as if the
   * swipe had been read the moment the finger came down. Not over a gap or near the roof's edge, where the jump goes on.
   */
  private takeBackHop(): void {
    if (this.mode !== 'air' || !this.groundJump || this.blocked) return;
    if (this.jumpStartedAt < this.lastJumpPress - 1e-6 || this.clock - this.jumpStartedAt > SWIPE_CREDIT + 1e-6) return;
    const top = this.takeoffTop;
    const support = this.supportAt(this.x, top);
    if (!support || Math.abs(support.top - top) > 1e-6) return;
    const edge = this.edgeAhead(this.roofAt(this.x));
    if (edge && edge.x - this.x < this.speed * 0.5 + 0.5) return;
    const rise = this.y - top;
    this.y = top;
    this.vy = 0;
    this.holding = false;
    this.coyote = 0;
    this.lastTop = top;
    this.support = support;
    this.deferredPipe = null;
    this.setMode('run');
    this.emit('tuck', { impact: rise });
    this.startSlide();
  }

  /** The touch was a tap after all: a pipe its hop met is a stumble. */
  private settlePipe(): void {
    const ob = this.deferredPipe;
    this.deferredPipe = null;
    if (!ob || ob.hit || !this.alive) return;
    ob.hit = true;
    this.stumble('pipe');
    if (!this.grounded) {
      this.vy = Math.min(this.vy, -1);
      this.holding = false;
    }
  }

  private checkZip(nx: number): boolean {
    for (const zip of this.course.zips) {
      if (zip.ridden || zip.grabX <= this.x - 1e-6 || zip.grabX > nx) continue;
      if (this.y < zip.launchTop - 1.2) continue;
      zip.ridden = true;
      this.x = zip.grabX;
      this.zip = zip;
      this.zipS = 0;
      this.zipSpeed = Math.max(this.speed, this.speeds.floor);
      this.holding = false;
      this.setMode('zip');
      this.y = zip.y0 - ZIP_HANG;
      const timely = this.clock - this.lastJumpPress <= this.window + 0.03;
      this.jumpBuffer = 0;
      this.emit('zip');
      if (timely) this.perfect('zip');
      return true;
    }
    return false;
  }

  private touchPanel(): void {
    const panel = this.support?.panel;
    if (!panel || panel.state !== 'intact') return;
    // The whole canopy gives way in a ripple from where it was touched.
    for (const other of this.course.panels) {
      if (other.group !== panel.group || other.state !== 'intact') continue;
      other.state = 'cracking';
      other.timer = CRACK_TIME + Math.abs(other.x0 - panel.x0) * 0.03;
    }
    this.emit('crack');
  }

  private updatePanels(dt: number): void {
    for (const panel of this.course.panels) {
      if (panel.state === 'cracking') {
        panel.timer -= dt;
        if (panel.timer <= 0) {
          panel.state = 'falling';
          if (this.support?.panel === panel) this.support = null;
          if (panel.x0 <= this.x + HALF_WIDTH && panel.x1 >= this.x - HALF_WIDTH) this.events.push({ type: 'collapse', x: (panel.x0 + panel.x1) / 2, y: panel.top });
        }
      } else if (panel.state === 'falling' && panel.drop < 40) {
        panel.vy += GRAVITY * 0.6 * dt;
        panel.drop += panel.vy * dt;
      }
    }
  }

  // --- Steps per mode ------------------------------------------------------------------------------------------

  private groundStep(dt: number, input: Input): void {
    // A touch that may still become a swipe holds a hard landing's verdict (and its jump) until it is read.
    let waitForSwipe = false;
    if (this.pendingHard > 0) {
      const inTime = this.lastSlidePress >= this.hardAt - Math.max(this.window, BUFFER) - 1e-6 && this.lastSlidePress <= this.hardAt + ROLL_LATE + 1e-6;
      if (this.slideBuffer > 0 && inTime) {
        this.slideBuffer = 0;
        this.roll();
      } else if (this.undecided && this.clock - this.hardAt < ROLL_LATE + SWIPE_WAIT) {
        waitForSwipe = true;
      } else {
        this.pendingHard -= dt;
        if (this.pendingHard <= 0) { this.pendingHard = 0; this.stumble('hard'); }
      }
    }
    if (this.jumpBuffer > 0 && !waitForSwipe) {
      this.tryJump();
      if (this.mode !== 'run' && this.mode !== 'slide' && this.mode !== 'roll') {
        if (this.mode === 'air') this.airMove(dt, input);
        return;
      }
    } else if (this.slideBuffer > 0 && this.pendingHard <= 0) {
      this.startSlide();
    }
    if (this.mode === 'slide') {
      const underPipe = this.course.obstacles.some(ob => ob.kind === 'pipe' && this.x + HALF_WIDTH > ob.x0 - 0.2 && this.x - HALF_WIDTH < ob.x1 && this.y < ob.y1 && this.y + STAND_HEIGHT > ob.y0);
      if (this.modeTime >= SLIDE_TIME && (!input.slide || this.modeTime >= SLIDE_MAX) && !underPipe) this.setMode('run');
    } else if (this.mode === 'roll' && this.modeTime >= ROLL_TIME) {
      this.setMode('run');
    }

    const nx = this.x + this.speed * dt;
    if (this.checkZip(nx)) return;
    const face = this.faceAhead(this.x, nx, this.y, this.height);
    if (face) { this.hitFace(face, false); return; }
    this.x = nx;
    this.checkPipes();
    const support = this.supportAt(this.x, this.y);
    if (!support) {
      // Ran off the edge (or the canopy fell away): fall, with a moment of coyote time.
      this.leftRoof = this.support?.roof ?? this.roofAt(this.x - this.speed * dt);
      this.coyote = support === null && this.support ? COYOTE : 0;
      this.support = null;
      this.startFlight(false, this.leftRoof);
      this.groundJump = false;
      this.holding = false;
      this.vy = 0;
      this.peak = this.y;
      this.airSince = this.clock;
      this.setMode('air');
      return;
    }
    if (support.top < this.y - 0.01) {
      // Stepped down off a rooftop unit.
      this.leftRoof = null;
      this.support = null;
      this.startFlight(false, this.roofAt(this.x));
      this.groundJump = false;
      this.vy = 0;
      this.peak = this.y;
      this.airSince = this.clock;
      this.setMode('air');
      return;
    }
    this.y = support.top;
    const changed = this.support?.panel !== support.panel;
    this.support = support;
    this.lastTop = support.top;
    if (changed) this.touchPanel();
  }

  private airMove(dt: number, input: Input): void {
    if (this.coyote > 0 && this.jumpBuffer > 0) {
      this.tryJump();
    }
    const prevY = this.y;
    const state = { y: this.y, vy: this.vy, holding: this.holding };
    airStep(state, input.jump, dt);
    this.vy = state.vy;
    this.holding = state.holding;
    const ny = state.y;
    const nx = this.blocked ? this.x : this.x + this.speed * dt;
    if (!this.blocked && this.checkZip(nx)) return;
    if (!this.blocked) {
      const face = this.faceAhead(this.x, nx, Math.min(prevY, ny), STAND_HEIGHT);
      if (face && this.stepsOver(face, ny, this.vy)) {
        this.x = nx;
        this.y = Math.max(ny, face.top + 0.01);
        this.peak = Math.max(this.peak, this.y);
        return;
      }
      if (face) {
        this.y = ny;
        this.hitFace(face, true);
        return;
      }
    }
    this.x = nx;
    this.y = ny;
    this.peak = Math.max(this.peak, ny);
    if (!this.overflew) this.overflew = this.aboveSurface();
    this.checkPipes();
    if (this.vy <= 0) {
      const top = this.landingTop(this.x, prevY, ny);
      if (top !== null) this.land(top, -this.vy);
    }
  }

  private scriptStep(dt: number): void {
    const script = this.script!;
    script.t += dt;
    const keys = script.keys;
    const last = keys[keys.length - 1];
    if (script.t >= last.t) {
      this.x = last.x;
      this.y = last.y;
      this.script = null;
      this.setMode(script.after);
      const support = this.supportAt(this.x, this.y);
      this.support = support;
      if (!support) {
        this.vy = 0;
        this.peak = this.y;
        this.airSince = this.clock;
        this.groundJump = false;
        this.startFlight(false, this.roofAt(this.x));
        this.setMode('air');
      } else {
        this.y = support.top;
        this.lastTop = support.top;
        this.touchPanel();
        // A jump pressed during the move fires as it ends.
        if (this.jumpBuffer > 0) this.tryJump();
        else if (this.slideBuffer > 0) this.startSlide();
      }
      return;
    }
    let i = 1;
    while (keys[i].t < script.t) i++;
    const a = keys[i - 1];
    const b = keys[i];
    const u = b.t > a.t ? (script.t - a.t) / (b.t - a.t) : 1;
    this.x = a.x + (b.x - a.x) * u;
    this.y = a.y + (b.y - a.y) * smooth(u);
  }

  private clingStep(dt: number): void {
    const roof = this.clingRoof!;
    this.y = Math.max(this.clingFloor, this.y - 1.1 * dt);
    if (this.jumpBuffer > 0 && this.modeTime <= this.window + 1e-6) {
      this.jumpBuffer = 0;
      this.kick();
      return;
    }
    if (this.modeTime > this.window) this.scramble(roof, 'wall');
  }

  private zipStep(dt: number): void {
    const zip = this.zip!;
    const dx = zip.x1 - zip.x0;
    const dy = zip.y1 - zip.y0;
    const length = Math.hypot(dx, dy);
    const sp = this.speeds;
    this.zipSpeed = Math.min(sp.top + 2, this.zipSpeed + ZIP_ACCEL * dt);
    this.zipS = Math.min(length, this.zipS + this.zipSpeed * dt);
    const u = this.zipS / length;
    this.x = zip.x0 + dx * u;
    this.y = zip.y0 + dy * u - ZIP_HANG;
    if (this.zipS >= length) {
      this.zip = null;
      this.vy = (dy / length) * this.zipSpeed;
      this.speed = this.options.floorSpeed ? sp.floor : Math.min(sp.top, Math.max(sp.floor, (dx / length) * this.zipSpeed));
      this.peak = this.y;
      this.lastTop = this.y;
      this.airSince = this.clock;
      this.groundJump = false;
      this.startFlight(false, null);
      this.holding = false;
      this.setMode('air');
      this.emit('release');
    }
  }

  private deadStep(dt: number): void {
    if (this.status === 'fell') {
      this.vy = Math.max(-MAX_FALL, this.vy - GRAVITY * dt);
      this.y += this.vy * dt;
      if (!this.blocked) this.x += this.speed * 0.4 * dt;
      return;
    }
    // Caught: stop running and put the hands up.
    this.speed = Math.max(0, this.speed - 14 * dt);
    const nx = this.x + this.speed * dt;
    if (!this.faceAhead(this.x, nx, this.y, this.height)) this.x = nx;
    const support = this.supportAt(this.x, this.y);
    if (support && Math.abs(support.top - this.y) < 0.35) {
      this.y = support.top;
      this.vy = 0;
    } else {
      const prevY = this.y;
      this.vy = Math.max(-MAX_FALL, this.vy - GRAVITY * dt);
      this.y += this.vy * dt;
      const top = this.landingTop(this.x, prevY, this.y);
      if (top !== null) { this.y = top; this.vy = 0; }
    }
  }
}
