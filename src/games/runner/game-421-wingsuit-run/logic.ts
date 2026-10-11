/**
 * Pure rules for Ridge Glider: the procedural course (terrain, racing line, ridges, thermals, wind, gates),
 * the point-mass flight model and the run's scoring. No DOM or three.js, so node tests can import it.
 *
 * Coordinates: `s` is distance down the course (forward), `x` is lateral (right positive), `y` is altitude.
 * The scene maps them to three.js as (x, y, -s).
 */

// ---------------------------------------------------------------------------------------------------------
// Flight model

export const G = 9.8;
/** Lift acceleration is K_LIFT * V^2 * cl: it grows with the square of airspeed, so a fast glider can climb. */
export const K_LIFT = 0.0105;
export const CL_MAX = 2.6;
export const CL_MIN = -0.9;
/** Structural limit on the lift acceleration (5 g). */
export const LOAD_MAX = 5 * G;
/** Parasitic drag: K_DRAG * V^2. A vertical dive would end near 90 m/s; V_MAX caps it first. */
export const K_DRAG = 0.00122;
/**
 * Induced drag of steady flight: K_INDUCED * L^2 / V^2 for lift up to 1 g. With K_DRAG it gives a best glide
 * of about 5.5 : 1 near 27 m/s, and a slow, floaty glide is no better than the trim glide.
 */
export const K_INDUCED = 6.76;
/** Extra drag for lift beyond 1 g (pulling up): K_PULL * (L^2 - g^2) / V^2, cheap enough that a zoom climb pays. */
export const K_PULL = 0.6;
export const V_MIN = 9;
export const V_MAX = 80;
export const GAMMA_MIN = -1.3;
export const GAMMA_MAX = 1.05;
export const BANK_MAX = 1.2;
export const BANK_RATE = 2.8;
export const HEADING_MAX = 1.05;
/** With the stick neutral the suit holds this flight-path angle (a steady glide near TRIM_SPEED). */
export const GLIDE_GAMMA = -0.2;
export const TRIM_SPEED = 33;
const HOLD_GAIN = 1.2;
const PITCH_RAMP = 4.5;
const ROLL_RAMP = 6;
const ASSIST_GAIN = 2.4;
export const STALL_SPEED = 19;
export const BURST_ACCEL = 13;
export const BURST_TIME = 1;
export const MAX_CHARGES = 3;
/** Every unbroken run of this many gates refills one burst charge. */
export const CHAIN_PER_CHARGE = 4;
/** Seconds at the start of a run in which touching the ground bounces the glider up instead of ending the run. */
export const GRACE_TIME = 20;
/** Height of the glider's body above the surface that counts as a crash. */
export const CLEARANCE = 0.45;
/** Hit radius of the glider for gates. */
export const PLAYER_RADIUS = 0.6;
export const SKIM_HEIGHT = 9;
export const GATE_POINTS = 50;
export const STEP = 1 / 120;

export interface Flight {
  s: number;
  x: number;
  y: number;
  /** Airspeed, m/s. */
  v: number;
  /** Flight-path angle, rad (positive climbs). */
  gamma: number;
  /** Heading relative to the course axis, rad (positive turns right). */
  heading: number;
  bank: number;
  /** Lift acceleration of the last step, m/s^2 (g-load times G). */
  lift: number;
  /** Seconds of burst thrust left. */
  burst: number;
  /** Smoothed control inputs. */
  pitchIn: number;
  rollIn: number;
  /** Vertical speed over the ground of the last step, m/s. */
  climb: number;
}

export interface Controls {
  /** -1 dive (push) .. 1 climb (pull). */
  pitch: number;
  /** -1 bank left .. 1 bank right. */
  roll: number;
}

export interface Air {
  /** Crosswind, m/s (positive pushes right). */
  wind: number;
  /** Rising air, m/s. */
  lift: number;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** The lift bounds at this airspeed: [most negative, most positive] lift acceleration. */
export function liftRange(v: number): [number, number] {
  const q = K_LIFT * v * v;
  return [Math.max(q * CL_MIN, -LOAD_MAX * 0.6), Math.min(q * CL_MAX, LOAD_MAX)];
}

/** Lift (in the vertical plane) the neutral stick asks for: it steers the flight path toward a steady glide. */
export function holdLift(f: Flight): number {
  const target = GLIDE_GAMMA + clamp((f.v - TRIM_SPEED) * 0.012, -0.35, 0.16);
  return G * Math.cos(f.gamma) + f.v * HOLD_GAIN * (target - f.gamma);
}

/** Vertical-plane lift for a pitch input: 0 holds the glide, 1 pulls with all the lift available, -1 pushes over. */
export function liftFor(f: Flight, pitch: number): number {
  const [low, high] = liftRange(f.v);
  const hold = clamp(holdLift(f), low, high);
  return pitch >= 0 ? hold + pitch * (high - hold) : hold + pitch * (hold - low);
}

/** Inverse of liftFor: the pitch input that asks for `lift`. */
export function pitchFor(f: Flight, lift: number): number {
  const [low, high] = liftRange(f.v);
  const hold = clamp(holdLift(f), low, high);
  if (lift >= hold) return high - hold < 1e-6 ? 1 : clamp((lift - hold) / (high - hold), 0, 1);
  return hold - low < 1e-6 ? -1 : clamp((lift - hold) / (hold - low), -1, 0);
}

export function createFlight(s: number, x: number, y: number, v: number, gamma: number, heading: number): Flight {
  return { s, x, y, v, gamma, heading, bank: 0, lift: G, burst: 0, pitchIn: 0, rollIn: 0, climb: 0 };
}

/**
 * Integrates the glider for `dt` seconds (keep dt at or below STEP). Energy E = y + V^2 / 2g only falls
 * (drag), except where rising air or burst thrust adds to it. `courseHeading` is the valley's direction,
 * which the auto-level assist steers toward when the roll input is neutral.
 */
export function stepFlight(f: Flight, controls: Controls, dt: number, air: Air, courseHeading = 0): void {
  f.pitchIn += clamp(clamp(controls.pitch, -1, 1) - f.pitchIn, -PITCH_RAMP * dt, PITCH_RAMP * dt);
  f.rollIn += clamp(clamp(controls.roll, -1, 1) - f.rollIn, -ROLL_RAMP * dt, ROLL_RAMP * dt);

  // Bank: the roll input sets a bank angle; with the stick neutral the wings roll level and the suit eases
  // its heading back along the valley.
  const bankTarget = Math.abs(controls.roll) > 0.04
    ? f.rollIn * BANK_MAX
    : clamp((courseHeading - f.heading) * ASSIST_GAIN, -0.6, 0.6) * (1 - Math.abs(f.rollIn));
  f.bank += clamp(bankTarget - f.bank, -BANK_RATE * dt, BANK_RATE * dt);

  const v = f.v;
  const cosG = Math.cos(f.gamma);
  // Pitch sets the lift in the vertical plane; bank sets a sideways lift of g tan(bank), so banking always turns
  // toward the low wing, pushing or pulling. Both share the lift the wing has at this airspeed.
  let up = liftFor(f, f.pitchIn);
  let side = G * Math.tan(f.bank);
  const cap = liftRange(v)[1];
  const total = Math.hypot(up, side);
  if (total > cap) { up *= cap / total; side *= cap / total; }
  f.lift = Math.hypot(up, side);
  let gammaRate = (up - G * cosG) / v;
  // Below stall speed the wing lets go and the nose drops, whatever the stick says.
  if (v < STALL_SPEED && f.gamma > -0.7) gammaRate -= (STALL_SPEED - v) * 0.12;
  const headingRate = side / (v * Math.max(cosG, 0.25));
  const lift2 = up * up + side * side;
  const drag = K_DRAG * v * v + (K_INDUCED * Math.min(lift2, G * G) + K_PULL * Math.max(0, lift2 - G * G)) / (v * v);
  const accel = -drag - G * Math.sin(f.gamma) + (f.burst > 0 ? BURST_ACCEL : 0);

  const vh = v * cosG;
  f.s += vh * Math.cos(f.heading) * dt;
  f.x += (vh * Math.sin(f.heading) + air.wind) * dt;
  f.climb = v * Math.sin(f.gamma) + air.lift;
  f.y += f.climb * dt;

  let next = Math.min(v + accel * dt, V_MAX);
  if (next < V_MIN) {
    // Holding the floor speed must not create energy: take it from the height instead.
    f.y -= (V_MIN * V_MIN - Math.max(0, next) ** 2) / (2 * G);
    next = V_MIN;
  }
  f.v = next;
  f.gamma = clamp(f.gamma + gammaRate * dt, GAMMA_MIN, GAMMA_MAX);
  f.heading = clamp(f.heading + headingRate * dt, -HEADING_MAX, HEADING_MAX);
  f.burst = Math.max(0, f.burst - dt);
}

/** Total energy as a height: altitude plus the height the airspeed could buy. */
export const energyHeight = (f: Flight) => f.y + (f.v * f.v) / (2 * G);

// ---------------------------------------------------------------------------------------------------------
// Course: segments

export const FIRST_SEGMENT = 760;
export const SEGMENT_LENGTH = 900;
const BLEND = 220;
/** Difficulty tables, by segment (the last entry repeats). */
const DESCENT = [0.3, 0.21, 0.18, 0.16, 0.145, 0.13, 0.12, 0.112, 0.105];
const HALF_WIDTH = [92, 82, 74, 66, 58, 51, 45, 39, 34];
const GATE_RADIUS = [9, 8.4, 7.8, 7.3, 6.8, 6.4, 6, 5.7, 5.5];
const GATE_SPACING = [150, 145, 140, 135, 130, 125, 120, 115, 110];
const RIDGE_HEIGHT = [0, 22, 30, 36, 42, 47, 51, 54, 56];
const RIDGE_EVERY = [0, 620, 560, 520, 480, 450, 430, 410, 400];
const THERMAL_EVERY = [250, 270, 290, 305, 320, 335, 350, 365, 380];
const THERMAL_STRENGTH = [22, 21.5, 21, 20.5, 20, 19.5, 19, 18.5, 18];
const THERMAL_TOP = [130, 128, 126, 124, 122, 120, 118, 116, 114];
const WIND = [0, 0, 2.5, 3.5, 4.5, 5.5, 6.5, 7, 7.5];
export const SEGMENT_COUNT = DESCENT.length;

export const segmentIndex = (s: number) => (s < FIRST_SEGMENT ? 0 : 1 + Math.floor((s - FIRST_SEGMENT) / SEGMENT_LENGTH));
export const segmentStart = (index: number) => (index <= 0 ? 0 : FIRST_SEGMENT + (index - 1) * SEGMENT_LENGTH);
const tier = (index: number) => Math.min(index, SEGMENT_COUNT - 1);

/** A difficulty value at `s`, blended from the previous segment over the first BLEND metres. */
function param(table: readonly number[], s: number): number {
  const index = segmentIndex(s);
  const now = table[tier(index)];
  if (index === 0) return now;
  const t = clamp((s - segmentStart(index)) / BLEND, 0, 1);
  return lerp(table[tier(index - 1)], now, t);
}

export const halfWidthAt = (s: number) => param(HALF_WIDTH, s);
export const gateRadiusAt = (s: number) => param(GATE_RADIUS, s);
export const thermalTopAt = (s: number) => param(THERMAL_TOP, s);
export const maxWindAt = (s: number) => param(WIND, s);
export const descentAt = (s: number) => param(DESCENT, s);

export interface SegmentInfo { index: number; ridges: boolean; wind: boolean; gateRadius: number; halfWidth: number; }
export function segmentInfo(index: number): SegmentInfo {
  const k = tier(index);
  return { index, ridges: RIDGE_HEIGHT[k] > 0, wind: WIND[k] > 0, gateRadius: GATE_RADIUS[k], halfWidth: HALF_WIDTH[k] };
}

const floorAtStart: number[] = [0];
/** Height of the valley floor's reference line. It falls by DESCENT per metre, blended between segments. */
export function floorY(s: number): number {
  if (s <= 0) return -DESCENT[0] * s;
  const index = segmentIndex(s);
  while (floorAtStart.length <= index) {
    const i = floorAtStart.length;
    floorAtStart.push(floorAtStart[i - 1] - descentIntegral(i - 1, segmentStart(i) - segmentStart(i - 1)));
  }
  return floorAtStart[index] - descentIntegral(index, s - segmentStart(index));
}

function descentIntegral(index: number, u: number): number {
  const now = DESCENT[tier(index)];
  if (index === 0) return now * u;
  const before = DESCENT[tier(index - 1)];
  if (u <= BLEND) return before * u + ((now - before) * u * u) / (2 * BLEND);
  return before * BLEND + ((now - before) * BLEND) / 2 + now * (u - BLEND);
}

// ---------------------------------------------------------------------------------------------------------
// Course: noise, centre line and racing line

export type Random = () => number;
export type RandomFactory = (seed: number) => Random;

export interface Ridge {
  s: number;
  height: number;
  half: number;
  /** 0..1: how deep the saddle is cut where the racing line crosses. */
  notch: number;
  notchWidth: number;
}

export interface Thermal {
  s: number;
  x: number;
  /** Semi-axes of the column's elliptical footprint, along the course and across it. */
  rs: number;
  rx: number;
  /** Rising air at the core, m/s. */
  strength: number;
  base: number;
  top: number;
}

export interface Gate {
  id: number;
  s: number;
  x: number;
  y: number;
  r: number;
  /** Racing-line slope at the gate (dx/ds, dy/ds): the ring faces along it. */
  dx: number;
  dy: number;
}

export interface Course {
  seed: number;
  noise: (x: number, y: number) => number;
  phase: number[];
  ridges: Ridge[];
  thermals: Thermal[];
  gates: Gate[];
  ridgeCursor: number;
  thermalCursor: number;
  gateCursor: number;
  ridgeRandom: Random;
  thermalRandom: Random;
  gateRandom: Random;
}

function makeNoise(random: Random): (x: number, y: number) => number {
  const p = Array.from({ length: 256 }, (_, i) => i);
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [p[i], p[j]] = [p[j], p[i]];
  }
  const perm = new Uint8Array(512);
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
  const gx = new Float64Array(256);
  const gy = new Float64Array(256);
  for (let i = 0; i < 256; i++) { const a = (i / 256) * Math.PI * 2; gx[i] = Math.cos(a); gy[i] = Math.sin(a); }
  const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);
  // Unit gradients keep 2D gradient noise within +-sqrt(2)/2, so the result is scaled into [-1, 1].
  return (x: number, y: number) => {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const xf = x - xi;
    const yf = y - yi;
    const X = xi & 255;
    const Y = yi & 255;
    const h00 = perm[perm[X] + Y], h10 = perm[perm[X + 1] + Y], h01 = perm[perm[X] + Y + 1], h11 = perm[perm[X + 1] + Y + 1];
    const n00 = gx[h00] * xf + gy[h00] * yf;
    const n10 = gx[h10] * (xf - 1) + gy[h10] * yf;
    const n01 = gx[h01] * xf + gy[h01] * (yf - 1);
    const n11 = gx[h11] * (xf - 1) + gy[h11] * (yf - 1);
    const u = fade(xf);
    const v = fade(yf);
    return lerp(lerp(n00, n10, u), lerp(n01, n11, u), v) * Math.SQRT2;
  };
}

/** Fractal noise in [-1, 1]. */
export function fbm(course: Course, x: number, y: number, octaves = 4): number {
  let sum = 0, norm = 0, amp = 1, freq = 1;
  for (let o = 0; o < octaves; o++) {
    sum += amp * course.noise(x * freq + o * 17.3, y * freq - o * 9.1);
    norm += amp;
    amp *= 0.5;
    freq *= 2.03;
  }
  return sum / norm;
}

const TAU = Math.PI * 2;
// Centre-line meander (amplitude m, period m) and the racing line's sway and height wave.
const MEANDER = [[70, 1600], [10, 560]] as const;
const SWAY = 13;
const SWAY_PERIODS = [800, 480] as const;
const WAVE_PERIODS = [520, 330] as const;
const WAVE_AMP = 16;
const FIRST_GATE = 220;
const FIRST_THERMAL = 470;
/** Lowest clearance of a ring's bottom above the floor noise. */
const FLOOR_NOISE = 3.5;
const FLOOR_DIP = 5;

export function createCourse(seed: number, makeRandom: RandomFactory): Course {
  const random = makeRandom(seed);
  const noise = makeNoise(random);
  const phase = Array.from({ length: 8 }, () => random() * TAU);
  // The racing line's first trough sits at the first gate, so the warm-up opens with a dive.
  phase[4] = -Math.PI / 2 - (TAU * FIRST_GATE) / WAVE_PERIODS[0];
  phase[5] = -Math.PI / 2 - (TAU * FIRST_GATE) / WAVE_PERIODS[1];
  return {
    seed, noise, phase,
    ridges: [], thermals: [], gates: [],
    ridgeCursor: FIRST_SEGMENT + 140, thermalCursor: FIRST_THERMAL, gateCursor: FIRST_GATE,
    ridgeRandom: makeRandom(seed + 101), thermalRandom: makeRandom(seed + 202), gateRandom: makeRandom(seed + 303),
  };
}

/** Lateral position of the valley's centre line. */
export function centerX(course: Course, s: number): number {
  const [[a1, p1], [a2, p2]] = MEANDER;
  const ph = course.phase;
  return a1 * (Math.sin((TAU * s) / p1 + ph[0]) - Math.sin(ph[0])) + a2 * (Math.sin((TAU * s) / p2 + ph[1]) - Math.sin(ph[1]));
}

/** Direction of the valley (heading of its centre line). */
export function courseHeading(course: Course, s: number): number {
  return Math.atan((centerX(course, s + 2) - centerX(course, s - 2)) / 4);
}

/** The racing line's offset from the centre line. */
export function swayAt(course: Course, s: number): number {
  const ph = course.phase;
  return SWAY * (0.7 * Math.sin((TAU * s) / SWAY_PERIODS[0] + ph[2]) + 0.3 * Math.sin((TAU * s) / SWAY_PERIODS[1] + ph[3]));
}

/** The racing line's height wave in [-1, 1]: troughs are dive gates, crests are climb gates. */
export function waveAt(course: Course, s: number): number {
  const ph = course.phase;
  return 0.65 * Math.sin((TAU * s) / WAVE_PERIODS[0] + ph[4]) + 0.35 * Math.sin((TAU * s) / WAVE_PERIODS[1] + ph[5]);
}

/** Height of the racing line above the floor reference. Its lowest point keeps a ring clear of the ground. */
export function lineAgl(course: Course, s: number): number {
  return gateRadiusAt(s) + 6 + WAVE_AMP + WAVE_AMP * waveAt(course, s);
}

export const lineX = (course: Course, s: number) => centerX(course, s) + swayAt(course, s);
export const lineY = (course: Course, s: number) => floorY(s) + lineAgl(course, s);

// ---------------------------------------------------------------------------------------------------------
// Course: terrain

/** Terrain mesh lattice: rows every ROW metres down the course, columns at these offsets from the centre line. */
export const ROW = 8;
export const ROWS_PER_CHUNK = 20;
export const CHUNK_LENGTH = ROW * ROWS_PER_CHUNK;
export const OFFSETS = [-420, -330, -260, -205, -160, -125, -98, -78, -62, -49, -38, -29, -21, -14, -7, 0, 7, 14, 21, 29, 38, 49, 62, 78, 98, 125, 160, 205, 260, 330, 420] as const;

function wall(e: number): number {
  if (e < 260) return 0.42 * e + 0.0068 * e * e;
  return 0.42 * 260 + 0.0068 * 260 * 260 + (0.42 + 0.0136 * 260) * (e - 260);
}

const bump = (t: number) => (t > -1 && t < 1 ? (1 - t * t) * (1 - t * t) : 0);

function ridgeHeight(course: Course, s: number, d: number): number {
  let h = 0;
  const ridges = course.ridges;
  // Ridges are sorted and never overlap: start from the last one that begins before s.
  let lo = 0, hi = ridges.length - 1, start = -1;
  while (lo <= hi) { const mid = (lo + hi) >> 1; if (ridges[mid].s - ridges[mid].half <= s) { start = mid; lo = mid + 1; } else hi = mid - 1; }
  for (let i = start; i >= 0 && i >= start - 1; i--) {
    const ridge = ridges[i];
    const b = bump((s - ridge.s) / ridge.half);
    if (b <= 0) continue;
    const off = (d - swayAt(course, s)) / ridge.notchWidth;
    h += ridge.height * b * (1 - ridge.notch * Math.exp(-off * off));
  }
  return h;
}

/** Height of the terrain at a lattice point (the mesh interpolates between them; see surfaceHeight). */
export function terrainHeight(course: Course, s: number, x: number): number {
  if (course.ridgeCursor < s + 400) generateRidges(course, s + 800);
  const d = x - centerX(course, s);
  const w = halfWidthAt(s);
  const e = Math.abs(d) - w;
  let h = floorY(s);
  if (e <= 0) {
    const q = d / w;
    h -= FLOOR_DIP * (1 - q * q);
  } else {
    const side = 1 + 0.3 * course.noise(s * 0.0025, d > 0 ? 11.5 : 37.5);
    h += wall(e) * side;
  }
  const amp = FLOOR_NOISE + Math.max(0, e) * 0.2;
  h += fbm(course, s * 0.0105, x * 0.0105) * amp;
  if (e > 20) {
    const n = 1 - Math.abs(course.noise(s * 0.0061 + 40, x * 0.0061 - 40));
    h += n * n * (e - 20) * 0.35;
  }
  return h + ridgeHeight(course, s, d);
}

/**
 * Height of the rendered terrain surface: the same triangles the mesh draws between lattice points, so a
 * crash happens exactly where the glider meets the visible ground. Rows sit at multiples of ROW; columns at
 * OFFSETS from the centre line of their row. Each lattice quad is a parallelogram split along the diagonal
 * from (column j, lower row) to (column j + 1, upper row), as three.js PlaneGeometry splits it.
 */
export function surfaceHeight(course: Course, s: number, x: number): number {
  const k = Math.floor(s / ROW);
  const s0 = k * ROW;
  const s1 = s0 + ROW;
  const t = (s - s0) / ROW;
  const c0 = centerX(course, s0);
  const c1 = centerX(course, s1);
  const off = x - (c0 + (c1 - c0) * t);
  const last = OFFSETS.length - 1;
  let j = 0;
  if (off >= OFFSETS[last]) j = last - 1;
  else if (off > OFFSETS[0]) { while (OFFSETS[j + 1] <= off) j++; }
  const f = clamp((off - OFFSETS[j]) / (OFFSETS[j + 1] - OFFSETS[j]), 0, 1);
  const h00 = terrainHeight(course, s0, c0 + OFFSETS[j]);
  const h11 = terrainHeight(course, s1, c1 + OFFSETS[j + 1]);
  if (t >= f) {
    const h01 = terrainHeight(course, s1, c1 + OFFSETS[j]);
    return h00 + t * (h01 - h00) + f * (h11 - h01);
  }
  const h10 = terrainHeight(course, s0, c0 + OFFSETS[j + 1]);
  return h00 + f * (h10 - h00) + t * (h11 - h10);
}

/**
 * Vertex positions of a terrain chunk whose near edge is row `s0` (a multiple of ROW), in the layout of a
 * three.js PlaneGeometry(1, 1, OFFSETS.length - 1, rows) laid flat: vertex (ix, iy) is column ix of the row at
 * s0 + (rows - iy) * ROW, so faces point up and quads split the way surfaceHeight assumes. Writes (x, y, -s).
 */
export function chunkLattice(course: Course, s0: number, rows: number, out: Float32Array): Float32Array {
  const columns = OFFSETS.length;
  for (let iy = 0; iy <= rows; iy++) {
    const s = s0 + (rows - iy) * ROW;
    const c = centerX(course, s);
    for (let ix = 0; ix < columns; ix++) {
      const x = c + OFFSETS[ix];
      const i = (iy * columns + ix) * 3;
      out[i] = x;
      out[i + 1] = terrainHeight(course, s, x);
      out[i + 2] = -s;
    }
  }
  return out;
}

// ---------------------------------------------------------------------------------------------------------
// Course: features (generated lazily, each kind from its own seeded stream, so the course does not depend on
// the order of queries)

function generateRidges(course: Course, upTo: number): void {
  const random = course.ridgeRandom;
  while (course.ridgeCursor < upTo) {
    const from = course.ridgeCursor;
    const k = tier(segmentIndex(from));
    // Put the ridge under a crest of the racing line, so its saddle can sit well below the line.
    let at = from, best = -Infinity;
    for (let t = from; t <= from + 260; t += 10) { const w = waveAt(course, t); if (w > best) { best = w; at = t; } }
    const height = RIDGE_HEIGHT[k] * (0.65 + 0.35 * random());
    const half = 70 + 30 * random();
    const notchWidth = 16 + 5 * random();
    // The saddle (where the racing line crosses) stays low enough that a ring on the line clears it.
    let allowed = Infinity;
    for (let u = -half; u <= half; u += 4) {
      const b = bump(u / half);
      if (b > 0.02) allowed = Math.min(allowed, (lineAgl(course, at + u) - gateRadiusAt(at + u) - 7 - FLOOR_NOISE) / b);
    }
    if (allowed > 2) {
      const notch = clamp(Math.max(0.45, 1 - allowed / height), 0, 0.95);
      course.ridges.push({ s: at, height, half, notch, notchWidth });
    }
    course.ridgeCursor = at + Math.max(2 * half + 80, RIDGE_EVERY[k] * (0.8 + 0.4 * random()));
  }
}

function generateThermals(course: Course, upTo: number): void {
  const random = course.thermalRandom;
  while (course.thermalCursor < upTo) {
    let s = course.thermalCursor;
    const k = tier(segmentIndex(s));
    generateRidges(course, s + 600);
    // A column never stands on a ridge: it moves to the run-up before it, where it helps the climb.
    for (const ridge of course.ridges) {
      if (Math.abs(s - ridge.s) < ridge.half + 40) s = ridge.s - ridge.half - 45;
    }
    const last = course.thermals[course.thermals.length - 1];
    if (last && s < last.s + 160) s = last.s + 160;
    const floor = floorY(s);
    course.thermals.push({
      s,
      x: lineX(course, s) + (random() * 2 - 1) * 6,
      rs: 48 + 16 * random(),
      rx: 18 + 5 * random(),
      strength: THERMAL_STRENGTH[k] * (0.92 + 0.16 * random()),
      base: floor - 14,
      top: floor + thermalTopAt(s),
    });
    course.thermalCursor = s + THERMAL_EVERY[k] * (0.85 + 0.3 * random());
  }
}

/** Unit vectors of a gate's ring plane: across (u) and up (v), in (x, y, s). */
export function gateBasis(gate: Gate): { n: [number, number, number]; u: [number, number, number]; v: [number, number, number] } {
  const nl = Math.hypot(gate.dx, gate.dy, 1);
  const n: [number, number, number] = [gate.dx / nl, gate.dy / nl, 1 / nl];
  const ul = Math.hypot(1, gate.dx);
  const u: [number, number, number] = [1 / ul, 0, -gate.dx / ul];
  // v = n x u
  const v: [number, number, number] = [n[1] * u[2] - n[2] * u[1], n[2] * u[0] - n[0] * u[2], n[0] * u[1] - n[1] * u[0]];
  return { n, u, v };
}

/** Lowest clearance between a ring and the surface, sampled around the ring. */
export function gateClearance(course: Course, gate: Gate, samples = 24): number {
  const { u, v } = gateBasis(gate);
  let min = Infinity;
  for (let i = 0; i < samples; i++) {
    const a = (i / samples) * TAU;
    const c = Math.cos(a) * gate.r, sn = Math.sin(a) * gate.r;
    const px = gate.x + c * u[0] + sn * v[0];
    const py = gate.y + c * u[1] + sn * v[1];
    const ps = gate.s + c * u[2] + sn * v[2];
    min = Math.min(min, py - surfaceHeight(course, ps, px));
  }
  return min;
}

function generateGates(course: Course, upTo: number): void {
  const random = course.gateRandom;
  while (course.gateCursor < upTo) {
    const s = course.gateCursor;
    const k = tier(segmentIndex(s));
    generateRidges(course, s + 600);
    const gate: Gate = {
      id: course.gates.length,
      s,
      x: lineX(course, s),
      y: lineY(course, s),
      r: gateRadiusAt(s),
      dx: (lineX(course, s + 1) - lineX(course, s - 1)) / 2,
      dy: (lineY(course, s + 1) - lineY(course, s - 1)) / 2,
    };
    // The line keeps every ring clear by construction; this guards the rule against future tuning.
    if (gateClearance(course, gate, 16) > 1) course.gates.push(gate);
    course.gateCursor = s + GATE_SPACING[k] * (0.92 + 0.16 * random());
  }
}

/** Generates every feature up to `s` (ridges and thermals further ahead). */
export function ensureCourse(course: Course, s: number): void {
  generateRidges(course, s + 900);
  generateThermals(course, s + 400);
  generateGates(course, s);
}

/** Rising air at a point: strongest in a column's core, fading out near its top. */
export function thermalLift(course: Course, s: number, x: number, y: number): number {
  let lift = 0;
  for (const t of course.thermals) {
    if (t.s - t.rs > s) break;
    if (t.s + t.rs < s) continue;
    const a = (s - t.s) / t.rs;
    const b = (x - t.x) / t.rx;
    const u = a * a + b * b;
    if (u >= 1 || y > t.top) continue;
    lift += t.strength * (1 - u * u) * clamp((t.top - y) / 30, 0, 1);
  }
  return lift;
}

/** The thermal column a point is inside (footprint and height), if any. */
export function thermalAt(course: Course, s: number, x: number, y: number): Thermal | null {
  for (const t of course.thermals) {
    if (t.s - t.rs > s) break;
    const a = (s - t.s) / t.rs;
    const b = (x - t.x) / t.rx;
    if (a * a + b * b < 1 && y < t.top && y > t.base) return t;
  }
  return null;
}

/** Crosswind at `s`: gusty, from either side, stronger in later segments. */
export function windAt(course: Course, s: number): number {
  const max = maxWindAt(s);
  if (max <= 0) return 0;
  const ph = course.phase;
  return max * (0.65 * Math.sin(s / 190 + ph[6]) + 0.35 * Math.sin(s / 83 + ph[7]));
}

// ---------------------------------------------------------------------------------------------------------
// Gates

export type GateResult = 'pass' | 'miss' | null;

/**
 * Checks the move from `a` to `b` (each [x, y, s]) against a gate's plane. Returns 'pass' when the glider
 * crosses the plane inside the ring, 'miss' when it crosses outside it, null before it reaches the plane.
 */
export function crossGate(gate: Gate, a: readonly number[], b: readonly number[]): GateResult {
  const { n } = gateBasis(gate);
  const fa = (a[0] - gate.x) * n[0] + (a[1] - gate.y) * n[1] + (a[2] - gate.s) * n[2];
  const fb = (b[0] - gate.x) * n[0] + (b[1] - gate.y) * n[1] + (b[2] - gate.s) * n[2];
  if (fb < 0) return null;
  const t = fa < 0 ? fa / (fa - fb) : 0;
  const px = a[0] + (b[0] - a[0]) * t - gate.x;
  const py = a[1] + (b[1] - a[1]) * t - gate.y;
  const ps = a[2] + (b[2] - a[2]) * t - gate.s;
  return Math.hypot(px, py, ps) <= gate.r - PLAYER_RADIUS ? 'pass' : 'miss';
}

/** Score multiplier for an unbroken chain of gates: x1, then one more every 3 gates, up to x5. */
export const multiplier = (chain: number) => Math.min(5, 1 + Math.floor(Math.max(0, chain) / 3));

// ---------------------------------------------------------------------------------------------------------
// Run

export type RunEvent =
  | { type: 'gate'; gate: Gate; chain: number; mult: number; points: number }
  | { type: 'miss'; gate: Gate; chain: number }
  | { type: 'mult'; mult: number }
  | { type: 'charge'; charges: number }
  | { type: 'burst'; charges: number }
  | { type: 'denied' }
  | { type: 'thermal'; on: boolean }
  | { type: 'segment'; index: number }
  | { type: 'stall'; on: boolean }
  | { type: 'skim'; on: boolean }
  | { type: 'grace-over' }
  | { type: 'bounce' }
  | { type: 'crash'; wall: boolean };

export interface Run {
  course: Course;
  flight: Flight;
  time: number;
  score: number;
  chain: number;
  bestChain: number;
  charges: number;
  gatesPassed: number;
  gatesMissed: number;
  nextGate: number;
  segment: number;
  bounces: number;
  agl: number;
  air: Air;
  inThermal: boolean;
  stalled: boolean;
  skimming: boolean;
  crashed: boolean;
}

export const START_AGL = 52;
export const START_SPEED = 36;

export function createRun(course: Course): Run {
  ensureCourse(course, 900);
  const s = 0;
  const x = lineX(course, s);
  const y = floorY(s) + START_AGL;
  const heading = Math.atan((lineX(course, s + 2) - lineX(course, s - 2)) / 4);
  const flight = createFlight(s, x, y, START_SPEED, -0.12, heading);
  return {
    course, flight, time: 0, score: 0, chain: 0, bestChain: 0, charges: MAX_CHARGES,
    gatesPassed: 0, gatesMissed: 0, nextGate: 0, segment: 0, bounces: 0,
    agl: y - surfaceHeight(course, s, x), air: { wind: 0, lift: 0 },
    inThermal: false, stalled: false, skimming: false, crashed: false,
  };
}

/** Fires a burst if a charge is left. */
export function triggerBurst(run: Run, events: RunEvent[]): boolean {
  if (run.crashed) return false;
  if (run.charges < 1 || run.flight.burst > 0) { events.push({ type: 'denied' }); return false; }
  run.charges -= 1;
  run.flight.burst = BURST_TIME;
  events.push({ type: 'burst', charges: run.charges });
  return true;
}

const scratchA = [0, 0, 0];
const scratchB = [0, 0, 0];

/** Advances a run by `dt` seconds in fixed sub-steps, appending what happened to `events`. */
export function stepRun(run: Run, controls: Controls, dt: number, events: RunEvent[]): void {
  if (run.crashed) return;
  const steps = Math.max(1, Math.ceil(dt / STEP - 1e-9));
  const h = dt / steps;
  for (let i = 0; i < steps && !run.crashed; i++) subStep(run, controls, h, events);
}

function subStep(run: Run, controls: Controls, dt: number, events: RunEvent[]): void {
  const { course, flight: f } = run;
  ensureCourse(course, f.s + 1000);
  run.air.wind = windAt(course, f.s);
  run.air.lift = thermalLift(course, f.s, f.x, f.y);
  scratchA[0] = f.x; scratchA[1] = f.y; scratchA[2] = f.s;
  const graceBefore = run.time < GRACE_TIME;
  stepFlight(f, controls, dt, run.air, courseHeading(course, f.s));
  run.time += dt;
  scratchB[0] = f.x; scratchB[1] = f.y; scratchB[2] = f.s;
  if (graceBefore && run.time >= GRACE_TIME) events.push({ type: 'grace-over' });

  const mult = multiplier(run.chain);
  const travelled = Math.max(0, scratchB[2] - scratchA[2]);
  const ground = surfaceHeight(course, f.s, f.x);
  run.agl = f.y - ground;
  const skimming = run.agl < SKIM_HEIGHT && f.v > 28;
  run.score += travelled * mult * (skimming ? 2 : 1);
  if (skimming !== run.skimming) { run.skimming = skimming; events.push({ type: 'skim', on: skimming }); }

  // Gates, in order. A gate the glider has gone past without crossing its plane (it flew far around it) counts as missed.
  while (run.nextGate < course.gates.length) {
    const gate = course.gates[run.nextGate];
    let result = crossGate(gate, scratchA, scratchB);
    if (!result && f.s > gate.s + gate.r + 30) result = 'miss';
    if (!result) break;
    run.nextGate += 1;
    if (result === 'pass') {
      run.chain += 1;
      run.bestChain = Math.max(run.bestChain, run.chain);
      run.gatesPassed += 1;
      const now = multiplier(run.chain);
      const points = GATE_POINTS * now;
      run.score += points;
      events.push({ type: 'gate', gate, chain: run.chain, mult: now, points });
      if (now > multiplier(run.chain - 1)) events.push({ type: 'mult', mult: now });
      if (run.chain % CHAIN_PER_CHARGE === 0 && run.charges < MAX_CHARGES) {
        run.charges += 1;
        events.push({ type: 'charge', charges: run.charges });
      }
    } else {
      run.gatesMissed += 1;
      const lost = run.chain;
      run.chain = 0;
      events.push({ type: 'miss', gate, chain: lost });
      if (lost >= 3) events.push({ type: 'mult', mult: 1 });
    }
  }

  const segment = segmentIndex(f.s);
  if (segment !== run.segment) { run.segment = segment; events.push({ type: 'segment', index: segment }); }
  const inThermal = run.air.lift > 1.5;
  if (inThermal !== run.inThermal) { run.inThermal = inThermal; events.push({ type: 'thermal', on: inThermal }); }
  const stalled = f.v < STALL_SPEED;
  if (stalled !== run.stalled) { run.stalled = stalled; events.push({ type: 'stall', on: stalled }); }

  if (run.agl < CLEARANCE) {
    if (graceBefore) {
      // Warm-up safety: an updraft throws the glider clear and points it back down the valley.
      f.y = ground + 7;
      f.gamma = Math.max(f.gamma, 0.3);
      f.v = Math.max(f.v * 0.8, 30);
      f.heading = courseHeading(course, f.s);
      f.bank = 0;
      run.agl = 7;
      run.bounces += 1;
      if (run.chain >= 3) events.push({ type: 'mult', mult: 1 });
      run.chain = 0;
      events.push({ type: 'bounce' });
    } else {
      run.crashed = true;
      const d = Math.abs(f.x - centerX(course, f.s));
      events.push({ type: 'crash', wall: d > halfWidthAt(f.s) });
    }
  }
}

// ---------------------------------------------------------------------------------------------------------
// Autopilot: flies the menu's attract mode, and gives the tests a policy that proves the course is flyable.

export interface AutopilotOptions {
  /** 'line' tracks the racing line through every gate; 'survive' glides efficiently and rides thermals. */
  mode: 'line' | 'survive';
}

const slope = (fn: (s: number) => number, s: number, h = 2) => (fn(s + h) - fn(s - h)) / (2 * h);
const bend = (fn: (s: number) => number, s: number, h = 6) => (fn(s + h) - 2 * fn(s) + fn(s - h)) / (h * h);

/**
 * Lowest clearance over the ground during an all-out pull-up starting now (wings levelled), over `horizon`
 * seconds. The autopilot pulls when this recovery would come too close: the ground is never closer than the
 * glider's best escape. Uses still air and coarse steps; it is a look-ahead, not the simulation.
 */
export function escapeClearance(course: Course, f: Flight, horizon = 2.6): number {
  const probe: Flight = { ...f };
  const air: Air = { wind: windAt(course, f.s), lift: 0 };
  let min = Infinity;
  const dt = 0.1;
  for (let t = 0; t < horizon - 1e-9; t += dt) {
    stepFlight(probe, { pitch: 1, roll: 0 }, dt, air, probe.heading);
    min = Math.min(min, probe.y - surfaceHeight(course, probe.s, probe.x));
    if (probe.gamma > 0.15 && probe.climb > 0) break;
  }
  return min;
}

export function autopilot(course: Course, f: Flight, options: AutopilotOptions = { mode: 'line' }): Controls {
  const v = f.v;
  const cosG = Math.cos(f.gamma);
  const vh = v * cosG;
  const vs = vh * Math.cos(f.heading);
  const wind = windAt(course, f.s);
  const lx = (s: number) => lineX(course, s);
  const ly = (s: number) => lineY(course, s);

  // Lateral: a PD loop on the offset from the racing line (or from the core of the next thermal when a climb is
  // worth it), with the line's bend as feed-forward. Bank angle sets the lateral acceleration: g tan(bank).
  let tx = lx(f.s);
  let txSlope = slope(lx, f.s);
  let txBend = bend(lx, f.s + vs * 0.3);
  let riding = false;
  if (options.mode === 'survive') {
    const next = course.thermals.find(t => t.s + t.rs * 0.5 > f.s);
    if (next && next.s - f.s < 360 && f.y < next.top - 25) {
      const cs = (s: number) => centerX(course, s);
      const offset = next.x - cs(next.s);
      tx = cs(f.s) + offset;
      txSlope = slope(cs, f.s);
      txBend = bend(cs, f.s + vs * 0.3);
      riding = true;
    }
  }
  const ex = f.x - tx;
  const exRate = vh * Math.sin(f.heading) + wind - vs * txSlope;
  const wl = 1.2;
  const lateral = vs * vs * txBend - wl * wl * ex - 2 * 0.85 * wl * exRate;
  const roll = clamp(Math.atan(lateral / G) / BANK_MAX, -1, 1);

  // Vertical: a PD loop on the height error with the line's bend as feed-forward ('line'), or a speed hold that
  // keeps near best glide and slows down to ride a thermal longer ('survive').
  let lift: number;
  const [low, high] = liftRange(v);
  if (options.mode === 'line') {
    const ey = f.y - ly(f.s);
    const eyRate = f.climb - vs * slope(ly, f.s);
    const wv = 1.6;
    const accel = vs * vs * bend(ly, f.s + vs * 0.25) - wv * wv * ey - 2 * 0.85 * wv * eyRate;
    // Vertical acceleration of the path is cos(gamma) * (L cos(bank) - g cos(gamma)) (speed changes ignored).
    lift = accel / Math.max(cosG, 0.3) + G * cosG;
  } else {
    const speedTarget = riding && thermalLift(course, f.s, f.x, f.y) > 2 ? 25 : 31;
    const wantGamma = GLIDE_GAMMA + clamp((v - speedTarget) * 0.03, -0.25, 0.4);
    lift = 2 * (wantGamma - f.gamma) * v + G * cosG;
  }
  let pitch = pitchFor(f, clamp(lift, low, high));
  // Ground avoidance: when an all-out pull starting now would only just clear the ground, pull now.
  if (f.climb < 0 && escapeClearance(course, f) < 5) return { pitch: 1, roll: clamp(roll, -0.3, 0.3) };
  // Do not pull into a stall.
  if (v < 22 && pitch > 0) pitch = Math.min(pitch, 0.2);
  return { pitch, roll };
}
