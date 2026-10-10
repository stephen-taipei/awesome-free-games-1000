/**
 * Pure rules for Lighthouse Watch: beam geometry, night plans and the whole simulation.
 * No DOM or three.js here, so tests can import and drive it directly.
 *
 * Coordinates: the tower stands at the origin. Everything on the sea is polar, `angle` (radians,
 * measured from +x towards +z) and `dist` (metres from the tower axis).
 */

export const TAU = Math.PI * 2;
export const MAX_LIVES = 3;
export const OIL_MAX = 100;
/** Oil burned per second while the lens is focused. */
export const OIL_DRAIN = 12;
/** Oil the wick trickles back per second while the beam is wide. */
export const OIL_REGEN = 2;
/** A dry lamp needs this much oil, a full second of focus, before it can focus again. */
export const OIL_RELIGHT = 12;
export const BARREL_OIL = 40;
export const CRATE_OIL = 20;
export const CRATE_SCORE = 50;
/** Oil topped up between nights. */
export const NIGHT_OIL = 30;
/** Half-angle of the idle (wide) beam and of the focused beam, in radians. */
export const WIDE_HALF = 0.42;
export const FOCUS_HALF = 0.11;
/** How fast the lens narrows or widens, in full sweeps per second. */
export const FOCUS_RATE = 9;
export const BEAM_RANGE = 32;
export const SPAWN_RADIUS = 27;
/** A wraith this close to the tower axis has reached the door. */
export const DOOR_RADIUS = 2.4;
/** Where the sea meets the rock: wraiths climb from here. */
export const SHORE_RADIUS = 6.4;
/** Seconds the focused beam must hold a barrel or crate to haul it in. */
export const CATCH_TIME = 0.55;
/** Burn (seconds of focused light) a wraith sheds per second in the dark. */
export const BURN_DECAY = 0.5;
/** Fraction of normal speed for any wraith (other than watchers) inside the focused beam. */
export const FOCUS_SLOW = 0.22;
/** Turn rate of the lamp in rad/s, wide and focused (the focused lens is heavier to swing). */
export const TURN_WIDE = 2.6;
export const TURN_FOCUS = 1.5;

export type WraithKind = 'drifter' | 'skitter' | 'brute' | 'watcher';
/** 0 dark, 1 in the wide beam, 2 in the focused beam. */
export type Light = 0 | 1 | 2;

export const KINDS: readonly WraithKind[] = ['drifter', 'skitter', 'brute', 'watcher'];

export interface KindStats {
  /** Metres per second in the dark, before the night's speed scale. */
  speed: number;
  /** Seconds of focused light needed to banish it, before the night's scale. */
  hp: number;
  score: number;
  /** Radius used for beam hits, in metres. */
  size: number;
  /** Speed factor inside the wide beam. */
  slow: number;
  firstNight: number;
}

export const STATS: Record<WraithKind, KindStats> = {
  drifter: { speed: 1.55, hp: 0.7, score: 10, size: 0.6, slow: 0.4, firstNight: 1 },
  skitter: { speed: 3.2, hp: 0.45, score: 15, size: 0.5, slow: 0.6, firstNight: 2 },
  brute: { speed: 0.95, hp: 2.3, score: 35, size: 1.0, slow: 0.5, firstNight: 3 },
  // Watchers freeze in any light and rush in the dark.
  watcher: { speed: 2.7, hp: 1.0, score: 25, size: 0.6, slow: 0, firstNight: 4 },
};

export const clampNum = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/** Wraps an angle into (-PI, PI]. */
export function wrap(angle: number): number {
  let a = (angle + Math.PI) % TAU;
  if (a < 0) a += TAU;
  return a - Math.PI;
}

/** Moves `current` towards `target` by at most `step`. */
export function approach(current: number, target: number, step: number): number {
  return current < target ? Math.min(target, current + step) : Math.max(target, current - step);
}

/** Turns an angle towards a target along the short way, by at most `maxStep` radians. */
export function turnToward(current: number, target: number, maxStep: number): number {
  return wrap(current + clampNum(wrap(target - current), -maxStep, maxStep));
}

/** Current half-angle of the beam for a lens focus between 0 (wide) and 1 (focused). */
export const beamHalf = (focus: number) => WIDE_HALF + (FOCUS_HALF - WIDE_HALF) * clampNum(focus, 0, 1);

/** True when a target of radius `size` at (angle, dist) is inside a beam pointing at `beam`. */
export function inBeam(beam: number, half: number, angle: number, dist: number, size: number): boolean {
  if (dist > BEAM_RANGE) return false;
  const spread = Math.atan2(size, Math.max(dist, 0.5));
  return Math.abs(wrap(angle - beam)) <= half + spread;
}

/** Speed multiplier for a wraith given the light it stands in and whether lightning is flashing. */
export function speedFactor(kind: WraithKind, light: Light, flash = false): number {
  if (kind === 'watcher') return light === 0 && !flash ? 1 : 0;
  if (light === 2) return FOCUS_SLOW;
  if (light === 1) return STATS[kind].slow;
  return 1;
}

export interface NightPlan {
  night: number;
  /** Wraiths that rise during the night. */
  count: number;
  /** Mean seconds between risings. */
  interval: number;
  /** Speed scale for every wraith this night. */
  speed: number;
  /** Burn needed, as a multiple of each kind's base. */
  hpScale: number;
  weights: Record<WraithKind, number>;
}

export function nightPlan(night: number): NightPlan {
  const n = Math.max(1, Math.floor(night));
  return {
    night: n,
    count: 6 + Math.round(n * 2.5),
    interval: Math.max(0.8, 2.7 - (n - 1) * 0.25),
    speed: Math.min(1.6, 1 + (n - 1) * 0.07),
    hpScale: Math.min(1.35, 1 + (n - 1) * 0.04),
    weights: {
      drifter: 1,
      skitter: n >= 2 ? Math.min(0.7, 0.3 + (n - 2) * 0.08) : 0,
      brute: n >= 3 ? Math.min(0.4, 0.18 + (n - 3) * 0.05) : 0,
      watcher: n >= 4 ? Math.min(0.4, 0.22 + (n - 4) * 0.05) : 0,
    },
  };
}

/** Weighted pick of a wraith kind for a night. */
export function pickKind(plan: NightPlan, random: () => number): WraithKind {
  let total = 0;
  for (const kind of KINDS) total += plan.weights[kind];
  let roll = random() * total;
  for (const kind of KINDS) {
    roll -= plan.weights[kind];
    if (roll < 0 && plan.weights[kind] > 0) return kind;
  }
  return 'drifter';
}

/** The new kind a night introduces (its first wraith is guaranteed to be one), if any. */
export function introducedOn(night: number): WraithKind | null {
  if (night <= 1) return null;
  return KINDS.find(kind => STATS[kind].firstNight === night) ?? null;
}

export const scoreFor = (kind: WraithKind, night: number) => Math.round(STATS[kind].score * (1 + (Math.max(1, night) - 1) * 0.15));
export const nightBonus = (night: number) => 50 * night;

export interface Wraith {
  id: number;
  kind: WraithKind;
  angle: number;
  dist: number;
  /** Burn needed to banish it. */
  hp: number;
  burn: number;
  light: Light;
  /** 0..1 phase offset for its sway. */
  seed: number;
  age: number;
  moving: boolean;
}

export interface Flotsam {
  id: number;
  kind: 'oil' | 'crate';
  angle: number;
  dist: number;
  /** Angular drift in rad/s. */
  drift: number;
  /** Seconds before it sinks. */
  life: number;
  /** Seconds of focused light held on it so far. */
  pull: number;
  caught: boolean;
}

export type SimEvent =
  | { type: 'night'; night: number; intro: WraithKind | null }
  | { type: 'spawn'; wraith: Wraith }
  | { type: 'banish'; wraith: Wraith; points: number }
  | { type: 'door'; wraith: Wraith }
  | { type: 'flotsam'; item: Flotsam }
  | { type: 'caught'; item: Flotsam }
  | { type: 'collect'; item: Flotsam; relit: boolean }
  | { type: 'sink'; item: Flotsam }
  | { type: 'clear'; night: number; bonus: number }
  | { type: 'empty' }
  | { type: 'over' };

export interface SimInput {
  /** Beam heading in radians. */
  beam: number;
  /** The player is holding focus. */
  focus: boolean;
  /** Lightning is lighting the whole sea this frame. */
  flash?: boolean;
}

/** One keeper's night watch: wraiths, flotsam, oil, lanterns and score. */
export class WatchSim {
  night = 0;
  lives = MAX_LIVES;
  oil = OIL_MAX;
  score = 0;
  banished = 0;
  nightsSurvived = 0;
  /** Lens state, 0 wide to 1 focused. */
  focus = 0;
  /** True while the lens is focused and burning oil. */
  focused = false;
  phase: 'dusk' | 'night' | 'over' = 'dusk';
  wraiths: Wraith[] = [];
  flotsam: Flotsam[] = [];
  /** Events produced by the last `step`; the array is reused, so read it before stepping again. */
  readonly events: SimEvent[] = [];

  private plan: NightPlan = nightPlan(1);
  private spawned = 0;
  private spawnTimer = 0;
  private breakTimer = 1.2;
  private flotsamTimer = 6;
  private lastSpawnAngle = 0;
  private pendingIntro: WraithKind | null = null;
  private dryWarned = false;
  private nextId = 1;

  constructor(private random: () => number = Math.random) {
    this.lastSpawnAngle = random() * TAU;
  }

  get half(): number { return beamHalf(this.focus); }
  get remaining(): number { return this.phase === 'night' ? this.plan.count - this.spawned + this.wraiths.length : 0; }

  step(dt: number, input: SimInput): SimEvent[] {
    this.events.length = 0;
    if (this.phase === 'over' || dt <= 0) return this.events;

    this.updateLens(dt, input.focus);
    if (this.phase === 'dusk') {
      this.breakTimer -= dt;
      if (this.breakTimer <= 0) this.beginNight();
    } else {
      this.spawnStep(dt);
    }
    if (this.updateWraiths(dt, input)) return this.events;
    this.updateFlotsam(dt, input.beam);
    if (this.phase === 'night' && this.spawned >= this.plan.count && this.wraiths.length === 0) this.clearNight();
    return this.events;
  }

  private updateLens(dt: number, wantsFocus: boolean): void {
    const canFocus = wantsFocus && (this.focused ? this.oil > 0 : this.oil >= OIL_RELIGHT);
    if (wantsFocus && !canFocus && !this.dryWarned) {
      this.dryWarned = true;
      this.events.push({ type: 'empty' });
    }
    if (!wantsFocus) this.dryWarned = false;
    this.focused = canFocus;
    this.focus = approach(this.focus, canFocus ? 1 : 0, FOCUS_RATE * dt);
    this.oil = clampNum(this.oil + (canFocus ? -OIL_DRAIN : OIL_REGEN) * dt, 0, OIL_MAX);
  }

  private beginNight(): void {
    this.night += 1;
    this.plan = nightPlan(this.night);
    this.spawned = 0;
    this.spawnTimer = 1.4;
    this.phase = 'night';
    this.pendingIntro = introducedOn(this.night);
    this.events.push({ type: 'night', night: this.night, intro: this.pendingIntro });
  }

  private spawnStep(dt: number): void {
    if (this.spawned >= this.plan.count) return;
    this.spawnTimer -= dt;
    if (this.spawnTimer > 0) return;
    const random = this.random;
    let group = 1;
    if (this.night >= 3 && random() < 0.3) group = this.night >= 5 && random() < 0.4 ? 3 : 2;
    // Each rising comes from a different quarter than the last, so the keeper has to keep sweeping.
    const base = wrap(this.lastSpawnAngle + 0.9 + random() * (TAU - 1.8));
    this.lastSpawnAngle = base;
    for (let g = 0; g < group && this.spawned < this.plan.count; g++) {
      const kind = this.pendingIntro ?? pickKind(this.plan, random);
      this.pendingIntro = null;
      this.spawnWraith(kind, wrap(base + (g - (group - 1) / 2) * 0.32));
    }
    this.spawnTimer = this.plan.interval * (0.7 + random() * 0.6) * (group > 1 ? 1.4 : 1);
  }

  /** Adds a wraith at the edge of the sea. Public so tests and the attract mode can stage scenes. */
  spawnWraith(kind: WraithKind, angle: number, dist = SPAWN_RADIUS - this.random() * 2): Wraith {
    const wraith: Wraith = {
      id: this.nextId++, kind, angle: wrap(angle), dist,
      hp: STATS[kind].hp * this.plan.hpScale, burn: 0, light: 0, seed: this.random(), age: 0, moving: true,
    };
    this.wraiths.push(wraith);
    this.spawned += 1;
    this.events.push({ type: 'spawn', wraith });
    return wraith;
  }

  /** Returns true when the watch ended this step. */
  private updateWraiths(dt: number, input: SimInput): boolean {
    const half = this.half;
    const burning = this.focused && this.focus > 0.5;
    for (let i = this.wraiths.length - 1; i >= 0; i--) {
      const w = this.wraiths[i];
      if (!w) continue;
      w.age += dt;
      const lit = inBeam(input.beam, half, w.angle, w.dist, STATS[w.kind].size);
      w.light = !lit ? 0 : burning ? 2 : 1;
      if (w.light === 2) w.burn += dt * this.focus;
      else w.burn = Math.max(0, w.burn - BURN_DECAY * dt);
      if (w.burn >= w.hp) {
        this.wraiths.splice(i, 1);
        const points = scoreFor(w.kind, this.night);
        this.score += points;
        this.banished += 1;
        this.events.push({ type: 'banish', wraith: w, points });
        continue;
      }
      const factor = speedFactor(w.kind, w.light, !!input.flash);
      w.moving = factor > 0;
      // They spend their first second rising out of the water before wading in.
      const rise = Math.min(1, w.age / 1.2);
      w.dist -= STATS[w.kind].speed * this.plan.speed * factor * rise * dt;
      if (factor > 0 && w.dist > DOOR_RADIUS + 1) {
        const weave = w.kind === 'skitter' ? 2.4 * Math.sin(w.age * 4.2 + w.seed * TAU) : 0.35 * Math.sin(w.age * 1.1 + w.seed * TAU);
        w.angle = wrap(w.angle + (weave * factor * dt) / Math.max(w.dist, 3));
      }
      // reachDoor may push others back but never removes more entries, so the index stays valid.
      if (w.dist <= DOOR_RADIUS && this.reachDoor(i, w)) return true;
    }
    return false;
  }

  /** Returns true when that was the last lantern. */
  private reachDoor(index: number, wraith: Wraith): boolean {
    this.wraiths.splice(index, 1);
    this.lives = Math.max(0, this.lives - 1);
    this.events.push({ type: 'door', wraith });
    // The lantern shatters in a flare that throws everything near the rock back into the surf.
    for (const other of this.wraiths) {
      if (other.dist < 9) other.dist = Math.min(SPAWN_RADIUS - 6, other.dist + 5);
    }
    if (this.lives > 0) return false;
    this.phase = 'over';
    this.focused = false;
    this.events.push({ type: 'over' });
    return true;
  }

  private updateFlotsam(dt: number, beam: number): void {
    const random = this.random;
    this.flotsamTimer -= dt * (this.oil < 35 ? 1.7 : 1);
    if (this.flotsamTimer <= 0) {
      this.flotsamTimer = 7 + random() * 5;
      if (this.flotsam.length < 2) {
        const item: Flotsam = {
          id: this.nextId++,
          kind: random() < 0.2 ? 'crate' : 'oil',
          angle: random() * TAU - Math.PI,
          dist: 11 + random() * 9,
          drift: (random() < 0.5 ? -1 : 1) * (0.05 + random() * 0.06),
          life: 16,
          pull: 0,
          caught: false,
        };
        this.flotsam.push(item);
        this.events.push({ type: 'flotsam', item });
      }
    }
    const hauling = this.focused && this.focus > 0.5;
    const half = this.half;
    for (let i = this.flotsam.length - 1; i >= 0; i--) {
      const item = this.flotsam[i];
      if (item.caught) {
        item.dist -= 6 * dt;
        if (item.dist <= SHORE_RADIUS) {
          this.flotsam.splice(i, 1);
          let relit = false;
          if (item.kind === 'oil') this.oil = Math.min(OIL_MAX, this.oil + BARREL_OIL);
          else {
            this.oil = Math.min(OIL_MAX, this.oil + CRATE_OIL);
            if (this.lives < MAX_LIVES) { this.lives += 1; relit = true; } else this.score += CRATE_SCORE;
          }
          this.events.push({ type: 'collect', item, relit });
        }
        continue;
      }
      item.life -= dt;
      item.angle = wrap(item.angle + item.drift * dt);
      const lit = hauling && inBeam(beam, half, item.angle, item.dist, 0.9);
      item.pull = lit ? item.pull + dt : Math.max(0, item.pull - dt * 0.8);
      if (item.pull >= CATCH_TIME) {
        item.caught = true;
        this.events.push({ type: 'caught', item });
      } else if (item.life <= 0) {
        this.flotsam.splice(i, 1);
        this.events.push({ type: 'sink', item });
      }
    }
  }

  private clearNight(): void {
    this.nightsSurvived = this.night;
    const bonus = nightBonus(this.night);
    this.score += bonus;
    this.oil = Math.min(OIL_MAX, this.oil + NIGHT_OIL);
    this.phase = 'dusk';
    this.breakTimer = 4.5;
    this.events.push({ type: 'clear', night: this.night, bonus });
  }
}
