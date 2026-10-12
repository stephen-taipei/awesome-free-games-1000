/**
 * Pure rules for Beastfall Trials: hero frame data, parry and dodge resolution, the four beasts' state machines,
 * a scripted duelling bot and the ladder records. No DOM or three.js, so tests can import it and play whole fights.
 *
 * The arena is one axis: x grows from the rock wall on the left (WALL_X) to the cliff edge on the right (EDGE_X),
 * where every beast waits. Times are seconds, distances are world units (the hero is about 1.9 tall).
 */

export type Tier = 0 | 1;
export type BeastId = 'hydra' | 'hound' | 'siren' | 'kraken';
/**
 * The ladder, in order. The Hound teaches the parry rhythm, the Siren adds the edge, the Hydra makes the Focus
 * finisher a requirement, and the Kraken mixes everything for the finale.
 */
export const BEASTS: readonly BeastId[] = ['hound', 'siren', 'hydra', 'kraken'];

// ------------------------------------------------------------------ arena and hero

export const WALL_X = -5.4;
export const EDGE_X = 5.6;
/** Walking and rolling stop this far short of the edge; only the Siren's song drags you over it. */
export const EDGE_STOP = 0.18;
export const HERO_HALF = 0.35;
export const HERO_START = -2.2;
export const RESPAWN_X = -2.6;
export const WALK_SPEED = 4.3;

export const HERO_HP = 100;
export const STAMINA_MAX = 100;
export const STAMINA_REGEN = 36;
export const STAMINA_DELAY = 0.5;
export const FOCUS_MAX = 100;
export const FOCUS_PERFECT = 25;
export const FOCUS_HIT = 5;
export const FOCUS_EVADE = 8;
export const FOCUS_SEVER = 15;
/** Hacking at a Hydra stump does no damage, but it charges the blade for the finisher that burns it. */
export const FOCUS_STUMP = 4;
/** A press is remembered this long, so a button tapped slightly early still comes out. */
export const INPUT_BUFFER = 0.2;
export const HURT_TIME = 0.32;
export const KNOCKBACK = 7;
export const STAGGER_BONUS = 1.4;
/** Hits on a beast that is not open (neither recovering from an attack nor staggered) glance off its guard. */
export const GUARD_MULT = 0.35;
export const FALL_DAMAGE = 22;
export const FALL_TIME = 1.2;
export const RESPAWN_GRACE = 1;

export interface Swing { startup: number; active: number; recovery: number; damage: number; reach: number; }
/** The three-hit combo. A press during a hit queues the next one; recovery can be cancelled into a parry or a dodge. */
export const COMBO: readonly Swing[] = [
  { startup: 0.1, active: 0.08, recovery: 0.2, damage: 7, reach: 1.8 },
  { startup: 0.1, active: 0.08, recovery: 0.22, damage: 8, reach: 1.8 },
  { startup: 0.16, active: 0.1, recovery: 0.36, damage: 13, reach: 2 },
];
/** Spends a full Focus meter. The hero cannot be hit during it, and a finisher that whiffs refunds the Focus. */
export const FINISHER: Swing = { startup: 0.3, active: 0.12, recovery: 0.46, damage: 60, reach: 2.6 };
/**
 * A parry catches one gold strike. Contact in the first `perfect` seconds (per tier) is a perfect parry: no damage,
 * Focus, and the beast staggers. Later in the guard it is a block: 30% damage and some stamina.
 * A guard raised within `hasty` seconds of a whiffed one is hasty: it can only block, and if it whiffs too it
 * recovers `hastyWhiff` slower. Mashing the button therefore never earns perfects.
 */
export const PARRY = { guard: 0.38, whiff: 0.24, recover: 0.1, chip: 0.3, stamina: 16, push: 3.5, hasty: 0.5, hastyWhiff: 0.16 };
/** Rolling costs stamina; the hero cannot be hit between iStart and iEnd, and the tail after iEnd can be cancelled. */
export const DODGE = { duration: 0.46, iStart: 0.02, iEnd: 0.38, distance: 2.8, cost: 30 };

// ------------------------------------------------------------------ beasts' frame data

export interface TierRules {
  windup: number;
  damage: number;
  hp: number;
  perfect: number;
  regrow: number;
  rest: readonly [number, number];
  pull: number;
  /** Scales the spacing inside multi-strike chains. */
  gap: number;
}
export const TIERS: readonly TierRules[] = [
  { windup: 1, damage: 1, hp: 1, perfect: 0.16, regrow: 6.5, rest: [0.65, 1.2], pull: 1, gap: 1 },
  { windup: 0.8, damage: 1.45, hp: 1.3, perfect: 0.13, regrow: 4.2, rest: [0.35, 0.75], pull: 1, gap: 0.86 },
];
/** Rage (0..1) shortens windups by up to this fraction: below half health, or as the Hydra regrows. */
export const RAGE_SPEEDUP = 0.12;
/** No two beast strikes ever land closer together than this, so a hit or a parry can always be answered. */
export const MIN_ACTIVE_GAP = 0.36;
export const MIN_WINDUP = 0.3;
/** Seconds before a beast's first attack. */
export const FIRST_ATTACK = 2;
/** Rest multiplier by rung: first value minus the second per rung climbed. */
export const LADDER_REST = [1.15, 0.1] as const;

export type AttackId =
  | 'hydraBite' | 'hydraSweep' | 'hydraSpit'
  | 'houndBite' | 'houndSnap' | 'houndPounce'
  | 'sirenNote' | 'sirenShriek' | 'sirenDive'
  | 'krakenBurst' | 'krakenSlam' | 'krakenBeak';

export interface AttackSpec {
  /** Seconds from the first visible tell (glow, pose and sound) to the hit, at the normal tier without rage. */
  windup: number;
  active: number;
  recovery: number;
  damage: number;
  /** Gold tells can be parried; crimson tells cannot, so roll through them or step out of the marked zone. */
  parryable: boolean;
  /** The hitbox follows the hero until this long before the hit; Infinity pins it where the tell first appears. */
  lockLead: number;
}

export const ATTACKS: Record<AttackId, AttackSpec> = {
  hydraBite: { windup: 0.74, active: 0.12, recovery: 0.95, damage: 13, parryable: true, lockLead: 0.28 },
  hydraSweep: { windup: 0.98, active: 0.26, recovery: 0.85, damage: 17, parryable: false, lockLead: Infinity },
  hydraSpit: { windup: 0.9, active: 0.22, recovery: 0.6, damage: 12, parryable: false, lockLead: Infinity },
  houndBite: { windup: 0.6, active: 0.1, recovery: 0.45, damage: 6, parryable: true, lockLead: 0.24 },
  houndSnap: { windup: 0.56, active: 0.1, recovery: 0.75, damage: 9, parryable: true, lockLead: 0.24 },
  houndPounce: { windup: 0.9, active: 0.2, recovery: 1.1, damage: 12, parryable: false, lockLead: 0.34 },
  sirenNote: { windup: 0.72, active: 0.1, recovery: 0.15, damage: 10, parryable: true, lockLead: 0 },
  sirenShriek: { windup: 0.94, active: 0.28, recovery: 0.6, damage: 15, parryable: false, lockLead: Infinity },
  sirenDive: { windup: 0.84, active: 0.14, recovery: 1.2, damage: 16, parryable: true, lockLead: 0.32 },
  krakenBurst: { windup: 0.96, active: 0.22, recovery: 1.35, damage: 13, parryable: false, lockLead: 0.5 },
  krakenSlam: { windup: 0.84, active: 0.14, recovery: 1, damage: 17, parryable: true, lockLead: 0.32 },
  krakenBeak: { windup: 0.64, active: 0.12, recovery: 0.8, damage: 16, parryable: true, lockLead: 0.26 },
};
export const ATTACK_IDS = Object.keys(ATTACKS) as AttackId[];

/** Seconds the beast (or the struck head) reels after a perfect parry of each gold attack. */
export const STAGGER: Partial<Record<AttackId, number>> = {
  hydraBite: 1.7, houndSnap: 1.5, sirenNote: 1.9, sirenDive: 1.7, krakenSlam: 1.7, krakenBeak: 1.3,
};

export const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const clamp01 = (value: number) => clamp(value, 0, 1);
const toward = (value: number, goal: number, step: number) => (value < goal ? Math.min(goal, value + step) : Math.max(goal, value - step));

export function windupFor(base: number, tier: Tier, rage: number): number {
  return base * TIERS[tier].windup * (1 - RAGE_SPEEDUP * clamp01(rage));
}

// ------------------------------------------------------------------ strikes and events

export type Outcome = '' | 'hit' | 'perfect' | 'block' | 'evade' | 'miss' | 'cancel';

export interface Strike {
  id: number;
  attack: AttackId;
  spec: AttackSpec;
  /** Which head, mouth or tentacle strikes (beast specific). */
  part: number;
  /** Seconds since the tell appeared; negative while the strike is still queued behind another. */
  t: number;
  windup: number;
  /** Where the attack is aimed, and the hitbox along the arena. */
  target: number;
  x0: number;
  x1: number;
  locked: boolean;
  shown: boolean;
  struck: boolean;
  outcome: Outcome;
  /** The strike passed over the hero while a roll made them untouchable. */
  overlapped: boolean;
  /** Last strike of a chain (the Hound's triple bite). */
  last: boolean;
  /** Beast-specific extra: the second sweeping head, the dive's landing spot. */
  data: number;
}

export type StrikePhase = 'queued' | 'windup' | 'active' | 'recovery';
export function phaseOf(s: Strike): StrikePhase {
  if (s.t < 0) return 'queued';
  if (s.t < s.windup) return 'windup';
  return s.t < s.windup + s.spec.active ? 'active' : 'recovery';
}

export type EventType =
  | 'telegraph' | 'strike' | 'swing' | 'land' | 'whiff' | 'high' | 'hurt' | 'perfect' | 'block' | 'evade'
  | 'dodge' | 'tired' | 'parry' | 'finisher' | 'far' | 'noTarget' | 'ready' | 'sever' | 'burn' | 'regrow'
  | 'song' | 'sing' | 'songBreak' | 'songEnd' | 'fall' | 'respawn' | 'enrage' | 'stagger' | 'surface'
  | 'victory' | 'defeat';

export interface DuelEvent {
  type: EventType;
  strike?: Strike;
  part?: number;
  damage?: number;
  x?: number;
  y?: number;
  combo?: number;
  finisher?: boolean;
  staggered?: boolean;
  guarded?: boolean;
  /** A swing that struck a Hydra stump: no damage, `focus` gained. */
  sear?: boolean;
  focus?: number;
}

export interface Hurtbox {
  x0: number;
  x1: number;
  /** Height of the struck point, for effects. */
  y: number;
  part: number;
  mult: number;
  staggered: boolean;
  /** Not open: normal hits deal GUARD_MULT damage (finishers ignore the guard). */
  guarded: boolean;
  /** Higher wins when several boxes are in reach. */
  priority: number;
  /** A Hydra stump: normal hits only charge Focus. */
  sear?: boolean;
}

export interface Input { move: number; attack: boolean; parry: boolean; dodge: boolean; finisher: boolean; }
export const NO_INPUT: Readonly<Input> = Object.freeze({ move: 0, attack: false, parry: false, dodge: false, finisher: false });

export type HeroAction = 'idle' | 'attack' | 'parry' | 'dodge' | 'hurt' | 'finisher' | 'fall' | 'down';

export class Hero {
  x = HERO_START;
  hp = HERO_HP;
  stamina = STAMINA_MAX;
  focus = 0;
  action: HeroAction = 'idle';
  /** Seconds since the current action began. */
  t = 0;
  combo = 0;
  /** Walk input applied this step (-1..1), for animation. */
  move = 0;
  vx = 0;
  dodgeDir = -1;
  dodgeWant = -1;
  grace = 0;
  connected = false;
  parried = false;
  parryEnd = 0;
  /** This guard went up right after a whiffed one: it can only block. */
  hasty = false;
  /** Duel time when the last whiffed guard ended. */
  whiffAt = -Infinity;
  staminaWait = 0;
  readonly buffer = { attack: 0, parry: 0, dodge: 0, finisher: 0 };
}

export interface DuelStats {
  perfects: number;
  blocks: number;
  evades: number;
  hitsTaken: number;
  damageTaken: number;
  finishers: number;
  falls: number;
  landed: number;
}

// ------------------------------------------------------------------ the duel

export class Duel {
  readonly hero = new Hero();
  readonly beast: Beast;
  readonly perfectWindow: number;
  time = 0;
  state: 'fight' | 'won' | 'lost' = 'fight';
  /** Siren song: units per second dragging the hero toward the edge. */
  pull = 0;
  ids = 0;
  readonly stats: DuelStats = { perfects: 0, blocks: 0, evades: 0, hitsTaken: 0, damageTaken: 0, finishers: 0, falls: 0, landed: 0 };
  private events: DuelEvent[] = [];
  private wasReady = false;

  constructor(readonly beastId: BeastId, readonly tier: Tier, readonly random: () => number = Math.random) {
    this.perfectWindow = TIERS[tier].perfect;
    this.beast = createBeast(beastId, this);
  }

  emit(type: EventType, detail: Omit<DuelEvent, 'type'> = {}): void {
    this.events.push({ type, ...detail });
  }

  /** Advances the fight. The returned array is reused by the next step. */
  step(dt: number, input: Readonly<Input> = NO_INPUT): DuelEvent[] {
    this.events.length = 0;
    if (this.state !== 'fight') return this.events;
    this.time += dt;
    this.updateHero(dt, input);
    this.beast.update(dt);
    this.resolveStrikes();
    this.resolveSwing();
    if (this.state === 'fight' && this.beast.defeated) this.win();
    const ready = this.hero.focus >= FOCUS_MAX;
    if (ready && !this.wasReady) this.emit('ready');
    this.wasReady = ready;
    return this.events;
  }

  gainFocus(amount: number): void {
    this.hero.focus = Math.min(FOCUS_MAX, this.hero.focus + amount);
  }

  /** True when a pressed action would start this very step. */
  heroReady(): boolean {
    const h = this.hero;
    if (h.action === 'idle') return true;
    if (h.action === 'attack') { const s = COMBO[h.combo]; return h.t >= s.startup + s.active; }
    if (h.action === 'parry') return h.parried && h.t >= h.parryEnd;
    if (h.action === 'dodge') return h.t >= DODGE.iEnd;
    return false;
  }

  invulnerable(): boolean {
    const h = this.hero;
    return h.grace > 0 || h.action === 'finisher' || h.action === 'fall' || h.action === 'down'
      || (h.action === 'dodge' && h.t >= DODGE.iStart && h.t < DODGE.iEnd);
  }

  /** The box a swing with `reach` would strike now, or null. */
  targetFor(reach: number, finisher: boolean): Hurtbox | null {
    const h = this.hero;
    const from = h.x - 0.2;
    const to = h.x + HERO_HALF + reach;
    let best: Hurtbox | null = null;
    for (const box of this.beast.hurtboxes(finisher)) {
      if (box.x1 < from || box.x0 > to) continue;
      if (!best || box.priority > best.priority || (box.priority === best.priority && box.x0 < best.x0)) best = box;
    }
    return best;
  }

  swingTarget(): Hurtbox | null { return this.targetFor(COMBO[0].reach, false); }
  finisherTarget(): Hurtbox | null { return this.targetFor(FINISHER.reach, true); }

  private updateHero(dt: number, input: Readonly<Input>): void {
    const h = this.hero;
    const b = h.buffer;
    b.attack = input.attack ? INPUT_BUFFER : Math.max(0, b.attack - dt);
    b.parry = input.parry ? INPUT_BUFFER : Math.max(0, b.parry - dt);
    b.dodge = input.dodge ? INPUT_BUFFER : Math.max(0, b.dodge - dt);
    b.finisher = input.finisher ? INPUT_BUFFER : Math.max(0, b.finisher - dt);
    if (input.dodge) h.dodgeWant = Math.abs(input.move) > 0.3 ? Math.sign(input.move) : -1;
    h.t += dt;
    h.grace = Math.max(0, h.grace - dt);
    if (h.staminaWait > 0) h.staminaWait = Math.max(0, h.staminaWait - dt);
    else h.stamina = Math.min(STAMINA_MAX, h.stamina + STAMINA_REGEN * dt);

    let walk = 0;
    switch (h.action) {
      case 'idle':
        if (!this.act(true)) walk = clamp(input.move, -1, 1);
        break;
      case 'attack': {
        const swing = COMBO[h.combo];
        const recoveryAt = swing.startup + swing.active;
        if (h.t >= recoveryAt) {
          if (b.attack > 0 && h.combo < COMBO.length - 1) { b.attack = 0; this.startAttack(h.combo + 1); }
          else if (!this.act(false) && h.t >= recoveryAt + swing.recovery) this.toIdle();
        }
        break;
      }
      case 'parry':
        if (h.parried) { if (h.t >= h.parryEnd) this.toIdle(); }
        else if (h.t >= PARRY.guard + PARRY.whiff + (h.hasty ? PARRY.hastyWhiff : 0)) {
          h.whiffAt = this.time;
          this.toIdle();
        }
        break;
      case 'dodge':
        // The roll's tail, after the i-frames, can be cancelled into anything (rolls chain).
        if (h.t >= DODGE.iEnd && !this.act(true) && h.t >= DODGE.duration) this.toIdle();
        break;
      case 'hurt':
        if (h.t >= HURT_TIME) this.toIdle();
        break;
      case 'finisher':
        if (h.t >= FINISHER.startup + FINISHER.active + FINISHER.recovery) this.toIdle();
        break;
      case 'fall':
        if (h.t >= FALL_TIME && h.hp > 0) {
          h.x = RESPAWN_X;
          h.action = 'idle';
          h.t = 0;
          h.grace = RESPAWN_GRACE;
          this.emit('respawn', { x: h.x });
        }
        break;
      case 'down':
        break;
    }
    h.move = walk;
    if (h.action === 'fall' || h.action === 'down') return;

    let dx = walk * WALK_SPEED * dt;
    if (h.action === 'dodge' && h.t < DODGE.duration) dx += h.dodgeDir * (DODGE.distance / DODGE.duration) * dt;
    if (h.vx !== 0) {
      dx += h.vx * dt;
      h.vx *= Math.exp(-9 * dt);
      if (Math.abs(h.vx) < 0.05) h.vx = 0;
    }
    let x = h.x + dx;
    // You cannot walk or roll off the cliff, but nothing stops a song from dragging you over.
    if (dx > 0) x = Math.min(x, Math.max(h.x, EDGE_X - EDGE_STOP));
    x = Math.min(x, this.beast.frontX() - HERO_HALF);
    x = Math.max(x, WALL_X + HERO_HALF);
    if (this.pull > 0) x += this.pull * dt;
    h.x = x;
    if (h.x > EDGE_X) this.fall();
  }

  private toIdle(): void {
    const h = this.hero;
    h.action = 'idle';
    h.t = 0;
    h.combo = 0;
    this.act(true);
  }

  /** Starts a buffered action. Attacks are left to the combo logic when called from an attack's recovery. */
  private act(allowAttack: boolean): boolean {
    const h = this.hero;
    const b = h.buffer;
    if (b.finisher > 0) {
      b.finisher = 0;
      if (this.startFinisher()) return true;
    }
    if (b.dodge > 0) {
      b.dodge = 0;
      if (h.stamina >= DODGE.cost) {
        h.stamina -= DODGE.cost;
        h.staminaWait = STAMINA_DELAY;
        h.action = 'dodge';
        h.t = 0;
        h.combo = 0;
        h.dodgeDir = h.dodgeWant;
        this.emit('dodge', { x: h.x });
        return true;
      }
      this.emit('tired', { x: h.x });
    }
    if (b.parry > 0) {
      b.parry = 0;
      h.action = 'parry';
      h.t = 0;
      h.combo = 0;
      h.parried = false;
      h.hasty = this.time - h.whiffAt < PARRY.hasty;
      this.emit('parry', { x: h.x });
      return true;
    }
    if (allowAttack && b.attack > 0) {
      b.attack = 0;
      this.startAttack(0);
      return true;
    }
    return false;
  }

  private startAttack(combo: number): void {
    const h = this.hero;
    h.action = 'attack';
    h.t = 0;
    h.combo = combo;
    h.connected = false;
    this.emit('swing', { combo, x: h.x });
  }

  private startFinisher(): boolean {
    const h = this.hero;
    if (h.focus < FOCUS_MAX) return false;
    if (!this.finisherTarget()) {
      // Out of reach, or nothing to strike at all (the Kraken below the edge with no tentacle out).
      this.emit(this.beast.hurtboxes(true).length ? 'far' : 'noTarget', { x: h.x });
      return false;
    }
    h.focus = 0;
    h.action = 'finisher';
    h.t = 0;
    h.combo = 0;
    h.connected = false;
    this.emit('finisher', { x: h.x });
    return true;
  }

  private fall(): void {
    const h = this.hero;
    const damage = Math.round(FALL_DAMAGE * TIERS[this.tier].damage);
    h.action = 'fall';
    h.t = 0;
    h.vx = 0;
    h.combo = 0;
    h.hp = Math.max(0, h.hp - damage);
    this.stats.hitsTaken++;
    this.stats.falls++;
    this.stats.damageTaken += damage;
    this.pull = 0;
    this.beast.onHeroFell();
    this.emit('fall', { damage, x: EDGE_X });
    if (h.hp <= 0) this.lose();
  }

  private resolveStrikes(): void {
    const h = this.hero;
    for (const s of this.beast.strikes) {
      if (s.outcome || s.t < s.windup) continue;
      if (s.t >= s.windup + s.spec.active) {
        s.outcome = s.overlapped ? 'evade' : 'miss';
        if (s.overlapped) {
          this.stats.evades++;
          this.gainFocus(FOCUS_EVADE);
          this.emit('evade', { strike: s, x: h.x });
        }
        this.beast.onResolved(s);
        continue;
      }
      if (this.state !== 'fight') continue;
      if (h.x + HERO_HALF < s.x0 || h.x - HERO_HALF > s.x1) continue;
      if (this.invulnerable()) {
        if (h.action === 'dodge') s.overlapped = true;
        continue;
      }
      if (h.action === 'parry' && !h.parried && s.spec.parryable && h.t <= PARRY.guard) {
        h.parried = true;
        h.parryEnd = h.t + PARRY.recover;
        if (h.t <= this.perfectWindow && !h.hasty) {
          s.outcome = 'perfect';
          this.stats.perfects++;
          this.gainFocus(FOCUS_PERFECT);
          this.emit('perfect', { strike: s, x: h.x + HERO_HALF + 0.3 });
          this.beast.onParry(s, true);
        } else {
          s.outcome = 'block';
          const damage = Math.max(1, Math.round(s.spec.damage * TIERS[this.tier].damage * PARRY.chip));
          h.hp = Math.max(0, h.hp - damage);
          h.stamina = Math.max(0, h.stamina - PARRY.stamina);
          h.staminaWait = STAMINA_DELAY;
          h.vx = -PARRY.push;
          this.stats.blocks++;
          this.stats.damageTaken += damage;
          this.emit('block', { strike: s, damage, x: h.x + HERO_HALF + 0.3 });
          this.beast.onParry(s, false);
          if (h.hp <= 0) this.lose();
        }
      } else {
        this.hurt(s);
      }
      this.beast.onResolved(s);
    }
  }

  private hurt(s: Strike): void {
    const h = this.hero;
    const damage = Math.round(s.spec.damage * TIERS[this.tier].damage);
    s.outcome = 'hit';
    h.hp = Math.max(0, h.hp - damage);
    h.action = 'hurt';
    h.t = 0;
    h.combo = 0;
    h.vx = -KNOCKBACK;
    this.stats.hitsTaken++;
    this.stats.damageTaken += damage;
    this.emit('hurt', { strike: s, damage, x: h.x });
    if (h.hp <= 0) this.lose();
  }

  private resolveSwing(): void {
    const h = this.hero;
    if (this.state !== 'fight' || h.connected) return;
    const finisher = h.action === 'finisher';
    if (!finisher && h.action !== 'attack') return;
    const swing = finisher ? FINISHER : COMBO[h.combo];
    if (h.t < swing.startup) return;
    const box = h.t < swing.startup + swing.active ? this.targetFor(swing.reach, finisher) : null;
    if (!box) {
      if (h.t >= swing.startup + swing.active) {
        h.connected = true;
        if (finisher) { h.focus = FOCUS_MAX; this.emit('whiff', { finisher: true, x: h.x }); }
        else if (this.beast.highOnly(h.x + HERO_HALF + swing.reach)) this.emit('high', { x: h.x });
        else this.emit('whiff', { x: h.x });
      }
      return;
    }
    h.connected = true;
    if (box.sear && !finisher) {
      this.stats.landed++;
      this.gainFocus(FOCUS_STUMP);
      this.emit('land', { damage: 0, focus: FOCUS_STUMP, sear: true, x: (box.x0 + box.x1) / 2, y: box.y, part: box.part, combo: h.combo });
      return;
    }
    const guarded = box.guarded && !finisher;
    const damage = Math.max(1, Math.round(swing.damage * box.mult * (guarded ? GUARD_MULT : 1) * (box.staggered ? STAGGER_BONUS : 1)));
    this.stats.landed++;
    if (finisher) this.stats.finishers++;
    else this.gainFocus(guarded ? FOCUS_HIT / 2 : FOCUS_HIT);
    this.emit('land', { damage, x: (Math.max(box.x0, h.x) + Math.min(box.x1, h.x + swing.reach)) / 2, y: box.y, part: box.part, combo: h.combo, finisher, staggered: box.staggered, guarded });
    this.beast.hit(box, damage, finisher);
    if (guarded) this.beast.provoke();
  }

  private win(): void {
    this.state = 'won';
    this.pull = 0;
    for (const s of this.beast.strikes) if (!s.outcome) s.outcome = 'cancel';
    this.emit('victory', { x: this.hero.x });
  }

  private lose(): void {
    this.state = 'lost';
    this.pull = 0;
    if (this.hero.action !== 'fall') { this.hero.action = 'down'; this.hero.t = 0; }
    this.emit('defeat', { x: this.hero.x });
  }
}

// ------------------------------------------------------------------ beasts

export abstract class Beast {
  abstract readonly id: BeastId;
  hp = 1;
  maxHp = 1;
  strikes: Strike[] = [];
  stagger = 0;
  staggerMax = 0;
  /** The first attack waits for the beast's entrance roar (and the intro toast). */
  cooldown = FIRST_ATTACK;
  rage = 0;
  enraged = false;

  constructor(protected readonly duel: Duel) {}

  protected get tier(): Tier { return this.duel.tier; }
  protected get hero(): Hero { return this.duel.hero; }
  protected rand(): number { return this.duel.random(); }

  /** 0..1 for the health bar. */
  health(): number { return clamp01(this.hp / this.maxHp); }
  get defeated(): boolean { return this.hp <= 0; }
  /** The hero cannot stand past this x (the beast's body blocks the way). */
  frontX(): number { return Infinity; }
  abstract hurtboxes(finisher: boolean): Hurtbox[];
  /** True when the only thing in front of a swing is out of reach overhead (the Hydra's raised heads). */
  highOnly(_reachTo: number): boolean { return false; }
  /** Open to full damage: staggered, or recovering from an attack that has landed or missed. */
  isOpen(): boolean {
    return this.stagger > 0 || this.strikes.some(s => s.outcome !== 'cancel' && s.t >= s.windup + s.spec.active);
  }
  /** Hitting a guarded beast makes it answer sooner. */
  provoke(): void {
    this.cooldown = Math.min(this.cooldown, 0.3);
  }

  hit(_box: Hurtbox, damage: number, _finisher: boolean): void {
    this.hp = Math.max(0, this.hp - damage);
    this.checkRage();
  }

  onParry(s: Strike, perfect: boolean): void {
    const stagger = STAGGER[s.attack];
    if (perfect && stagger) this.staggerFor(stagger);
  }
  onResolved(_s: Strike): void {}
  onStrikeActive(_s: Strike): void {}
  onHeroFell(): void {}

  protected abstract aim(s: Strike): void;
  protected abstract think(dt: number): void;

  update(dt: number): void {
    for (const s of this.strikes) {
      if (s.outcome === 'cancel') continue;
      s.t += dt;
      if (s.t < 0) continue;
      if (!s.shown) {
        s.shown = true;
        this.aim(s);
        this.duel.emit('telegraph', { strike: s, x: (s.x0 + s.x1) / 2 });
      }
      if (!s.locked) {
        this.aim(s);
        if (s.t >= s.windup - s.spec.lockLead) s.locked = true;
      }
      if (!s.struck && s.t >= s.windup) {
        s.struck = true;
        this.onStrikeActive(s);
        this.duel.emit('strike', { strike: s, x: (s.x0 + s.x1) / 2 });
      }
    }
    // Drop finished strikes in place (this runs 120 times a second).
    let kept = 0;
    for (const s of this.strikes) if (s.outcome !== 'cancel' && s.t < s.windup + s.spec.active + s.spec.recovery) this.strikes[kept++] = s;
    this.strikes.length = kept;
    if (this.stagger > 0) this.stagger = Math.max(0, this.stagger - dt);
    this.think(dt);
  }

  protected strike(attack: AttackId, part: number, delay = 0): Strike {
    const spec = ATTACKS[attack];
    const s: Strike = {
      id: ++this.duel.ids, attack, spec, part, t: -delay, windup: windupFor(spec.windup, this.tier, this.rage),
      target: 0, x0: 0, x1: 0, locked: false, shown: false, struck: false, outcome: '', overlapped: false, last: true, data: -1,
    };
    this.strikes.push(s);
    return s;
  }

  /** Cancels every strike that has not landed yet (optionally only some). */
  protected cancel(filter: (s: Strike) => boolean = () => true): void {
    for (const s of this.strikes) if (!s.outcome && s.t < s.windup && filter(s)) s.outcome = 'cancel';
  }

  protected staggerFor(seconds: number): void {
    this.stagger = Math.max(this.stagger, seconds);
    this.staggerMax = this.stagger;
    this.cancel();
    this.duel.emit('stagger', { x: this.frontX() });
  }

  protected rest(): number {
    const [a, b] = TIERS[this.tier].rest;
    // Later rungs rest less between attacks.
    const ladder = LADDER_REST[0] - LADDER_REST[1] * BEASTS.indexOf(this.id);
    return (a + (b - a) * this.rand()) * ladder * (1 - 0.25 * this.rage);
  }

  protected checkRage(): void {
    if (!this.enraged && this.hp <= this.maxHp / 2) {
      this.enraged = true;
      this.rage = 1;
      this.duel.emit('enrage', { x: this.frontX() });
    }
  }
}

// Hydra: heads lunge low to bite or sweep the floor, and only then are they in reach. A severed head regrows;
// a Focus finisher burns a head (or its stump) away for good. Burn all three. Hacking at a stump charges Focus,
// and while no head is left alive the stumps spit venom, so there is never nothing to do.

export const HYDRA_REST = [3.3, 4.1, 4.9] as const;
export const HYDRA_FRONT = 5.2;
export const BITE_MIN_X = -2.2;
export const BITE_HALF = 0.7;
export const SWEEP_FROM = -1.3;
export const HYDRA_DOUBLE_GAP = 0.56;
export const HYDRA_HEAD_HP = 44;
/** The Hydra spits venom at a hero who keeps out of biting range. */
export const SPIT_HALF = 0.8;
/** Extra rest after a stump spits (per tier), so there is time to hack at the stumps. */
export const HYDRA_STUMP_REST = [0.5, 0] as const;

export interface HydraHead {
  state: 'alive' | 'stump' | 'gone';
  hp: number;
  max: number;
  regrow: number;
  restX: number;
  /** Logical x of the head while it lies low. */
  x: number;
  /** Seconds the head stays low (and in reach). */
  low: number;
  stagger: number;
  /** Seconds since the head (re)grew. */
  age: number;
}

export class Hydra extends Beast {
  readonly id = 'hydra' as const;
  readonly heads: HydraHead[];
  regrowths = 0;
  burned = 0;
  private sinceSweep = 1;

  constructor(duel: Duel) {
    super(duel);
    const hp = Math.round(HYDRA_HEAD_HP * TIERS[duel.tier].hp);
    this.heads = HYDRA_REST.map(restX => ({ state: 'alive' as const, hp, max: hp, regrow: 0, restX, x: restX, low: 0, stagger: 0, age: 9 }));
    this.maxHp = hp * this.heads.length;
    this.hp = this.maxHp;
  }

  /** Burned heads are gone for good; a stump still counts for something until it is burned too. */
  health(): number {
    const left = this.heads.reduce((sum, h) => sum + (h.state === 'gone' ? 0 : h.state === 'stump' ? 0.4 : 0.4 + 0.6 * h.hp / h.max), 0);
    return clamp01(left / this.heads.length);
  }
  get defeated(): boolean { return this.heads.every(h => h.state === 'gone'); }
  frontX(): number { return HYDRA_FRONT; }

  hurtboxes(finisher: boolean): Hurtbox[] {
    const boxes: Hurtbox[] = [];
    this.heads.forEach((head, part) => {
      if (head.state === 'gone') return;
      if (head.state === 'stump') {
        // A finisher burns the stump first; a normal swing takes a live head over a stump.
        boxes.push({ x0: head.restX - 0.6, x1: head.restX + 0.6, y: 0.5, part, mult: 1, staggered: false, guarded: false, priority: finisher ? 2 : -1, sear: !finisher });
        return;
      }
      const low = head.low > 0;
      if (low || finisher) boxes.push({ x0: head.x - 0.6, x1: head.x + 0.6, y: low ? 0.6 : 2.6, part, mult: 1, staggered: head.stagger > 0, guarded: false, priority: low ? 1 : 0 });
    });
    return boxes;
  }

  highOnly(reachTo: number): boolean {
    return this.heads.some(h => h.state === 'alive' && h.low <= 0 && h.x - 0.6 <= reachTo);
  }

  hit(box: Hurtbox, damage: number, finisher: boolean): void {
    const head = this.heads[box.part];
    if (!head || head.state === 'gone') return;
    const x = head.state === 'stump' ? head.restX : head.x;
    if (finisher) {
      head.state = 'gone';
      head.hp = 0;
      head.low = 0;
      this.burned++;
      this.cancel(s => s.part === box.part);
      this.updateRage();
      this.duel.emit('burn', { part: box.part, x, y: box.y });
    } else if (head.state === 'alive') {
      head.hp = Math.max(0, head.hp - damage);
      if (head.hp <= 0) {
        head.state = 'stump';
        head.regrow = TIERS[this.tier].regrow;
        head.low = 0;
        head.stagger = 0;
        this.cancel(s => s.part === box.part || s.data === box.part);
        this.duel.gainFocus(FOCUS_SEVER);
        this.duel.emit('sever', { part: box.part, x, y: box.y });
      }
    }
    this.hp = this.heads.reduce((sum, h) => sum + (h.state === 'alive' ? h.hp : 0), 0);
  }

  private updateRage(): void {
    this.rage = Math.min(1, 0.3 * this.regrowths + 0.2 * this.burned);
  }

  protected aim(s: Strike): void {
    if (s.attack === 'hydraBite') {
      s.target = Math.max(this.hero.x, BITE_MIN_X);
      s.x0 = s.target - BITE_HALF;
      s.x1 = s.target + BITE_HALF;
    } else if (s.attack === 'hydraSpit') {
      s.target = clamp(this.hero.x, WALL_X + 0.8, 3);
      s.x0 = s.target - SPIT_HALF;
      s.x1 = s.target + SPIT_HALF;
    } else {
      s.target = SWEEP_FROM;
      s.x0 = SWEEP_FROM;
      s.x1 = EDGE_X;
    }
  }

  onStrikeActive(s: Strike): void {
    const lay = (part: number, x: number) => {
      const head = this.heads[part];
      if (!head || head.state !== 'alive') return;
      head.x = x;
      head.low = s.spec.active + s.spec.recovery;
    };
    if (s.attack === 'hydraBite') lay(s.part, s.target + 0.55);
    else if (s.attack === 'hydraSweep') {
      lay(s.part, SWEEP_FROM + 1.2);
      if (s.data >= 0) lay(s.data, SWEEP_FROM + 2.4);
    }
  }

  onParry(s: Strike, perfect: boolean): void {
    if (!perfect) return;
    const head = this.heads[s.part];
    if (!head || head.state !== 'alive') return;
    head.stagger = STAGGER.hydraBite ?? 1.7;
    head.low = Math.max(head.low, head.stagger);
    this.cooldown = Math.max(this.cooldown, 0.9);
    this.duel.emit('stagger', { part: s.part, x: head.x });
  }

  protected think(dt: number): void {
    this.heads.forEach((head, part) => {
      head.low = Math.max(0, head.low - dt);
      head.stagger = Math.max(0, head.stagger - dt);
      head.age += dt;
      if (head.state === 'stump') {
        head.regrow -= dt;
        if (head.regrow <= 0) {
          head.state = 'alive';
          head.hp = head.max;
          head.age = 0;
          head.x = head.restX;
          this.regrowths++;
          this.updateRage();
          this.duel.emit('regrow', { part, x: head.restX, y: 2.6 });
        }
      }
      if (head.state === 'alive' && head.low <= 0) head.x = head.restX;
    });
    this.hp = this.heads.reduce((sum, h) => sum + (h.state === 'alive' ? h.hp : 0), 0);
    if (this.strikes.length) return;
    this.cooldown -= dt;
    if (this.cooldown > 0) return;
    const ready = this.heads.map((h, i) => (h.state === 'alive' && h.low <= 0 && h.age > 0.7 ? i : -1)).filter(i => i >= 0);
    const pick = (list: number[]) => list[Math.floor(this.rand() * list.length) % list.length];
    if (!ready.length) {
      // No head left alive: a stump spits venom at the hero while it regrows.
      const stumps = this.heads.some(h => h.state === 'alive') ? [] : this.heads.map((h, i) => (h.state === 'stump' && h.regrow > 1 ? i : -1)).filter(i => i >= 0);
      if (!stumps.length) { this.cooldown = 0.25; return; }
      this.strike('hydraSpit', pick(stumps));
      this.cooldown = this.rest() + HYDRA_STUMP_REST[this.tier];
      return;
    }
    const sweepChance = this.sinceSweep >= 3 ? 0.65 : this.sinceSweep >= 1 ? 0.2 : 0;
    const far = this.hero.x < BITE_MIN_X + 0.4;
    if (this.rand() < (far ? 0.75 : 0.08)) {
      this.strike('hydraSpit', pick(ready));
      this.sinceSweep++;
    } else if (this.hero.x > SWEEP_FROM - 0.8 && this.rand() < sweepChance) {
      const first = pick(ready);
      const others = ready.filter(i => i !== first);
      const s = this.strike('hydraSweep', first);
      if (others.length) s.data = pick(others);
      this.sinceSweep = 0;
    } else {
      const first = pick(ready);
      this.strike('hydraBite', first);
      const others = ready.filter(i => i !== first);
      if (others.length && this.rand() < 0.4 + 0.4 * this.rage) this.strike('hydraBite', pick(others), HYDRA_DOUBLE_GAP * TIERS[this.tier].gap);
      this.sinceSweep++;
    }
    this.cooldown = this.rest();
  }
}

// Three-Headed Hound: prowls in close and bites with its three heads in a staggered rhythm. Parry the rhythm,
// then punish the stagger. It pounces (crimson) when you keep your distance.

export const HOUND_HOME = 3.7;
export const HOUND_LENGTH = 2.5;
export const HOUND_BITE_REACH = 2.1;
export const HOUND_GAP = 0.54;
export const HOUND_AIR = 0.3;
export const HOUND_HP = 480;

export class Hound extends Beast {
  readonly id = 'hound' as const;
  front = HOUND_HOME;
  /** Where the current pounce took off from. */
  leapFrom = HOUND_HOME;
  chainPerfects = 0;

  constructor(duel: Duel) {
    super(duel);
    this.maxHp = this.hp = Math.round(HOUND_HP * TIERS[duel.tier].hp);
  }

  frontX(): number { return this.front; }

  hurtboxes(): Hurtbox[] {
    return [{ x0: this.front, x1: this.front + HOUND_LENGTH, y: 1.3, part: 0, mult: 1, staggered: this.stagger > 0, guarded: !this.isOpen(), priority: 0 }];
  }

  protected aim(s: Strike): void {
    if (s.attack === 'houndPounce') {
      s.target = clamp(this.hero.x, WALL_X + 1.3, HOUND_HOME - 0.8);
      s.x0 = s.target - 1.15;
      s.x1 = s.target + 1.15;
    } else {
      s.target = this.front;
      s.x0 = this.front - HOUND_BITE_REACH;
      s.x1 = this.front + 0.2;
    }
  }

  /** How far apart the bites of a triple bite land. */
  chainGap(): number { return HOUND_GAP * TIERS[this.tier].gap * (1 - 0.15 * this.rage); }

  onStrikeActive(s: Strike): void {
    // Land just in front of the hero even if they moved after the leap was aimed (the hitbox stays where it was).
    if (s.attack === 'houndPounce') this.front = Math.max(s.target + HERO_HALF + 0.05, this.hero.x + HERO_HALF + 0.02);
    else this.front = Math.max(this.front - 0.3, this.hero.x + HERO_HALF + 0.02, WALL_X + 1);
  }

  onParry(s: Strike, perfect: boolean): void {
    if (s.attack === 'houndBite') { if (perfect) this.chainPerfects++; return; }
    super.onParry(s, perfect);
  }

  onResolved(s: Strike): void {
    if (s.attack === 'houndBite' && s.last && this.chainPerfects > 0) {
      this.staggerFor(0.55 + 0.45 * this.chainPerfects);
      this.chainPerfects = 0;
    }
  }

  protected think(dt: number): void {
    if (this.stagger > 0) return;
    const pounce = this.strikes.find(s => s.attack === 'houndPounce' && s.t >= s.windup - HOUND_AIR && s.t < s.windup);
    if (pounce) {
      const k = clamp01((pounce.t - (pounce.windup - HOUND_AIR)) / HOUND_AIR);
      const land = pounce.target + HERO_HALF + 0.05;
      this.front = this.leapFrom + (land - this.leapFrom) * (k * k * (3 - 2 * k));
    }
    if (this.strikes.length) return;
    this.leapFrom = this.front;
    const want = clamp(this.hero.x + HERO_HALF + 1.5, WALL_X + 1.5, HOUND_HOME);
    const step = 1.7 * dt;
    this.front = Math.max(toward(this.front, want, step), Math.min(this.front, this.hero.x + HERO_HALF + 0.02));
    this.leapFrom = this.front;
    this.cooldown -= dt;
    if (this.cooldown > 0) return;
    const gap = this.front - (this.hero.x + HERO_HALF);
    if (gap > 2.2) {
      if (this.rand() < 0.5) this.strike('houndPounce', 1);
      else { this.cooldown = 0.4; return; }
    } else {
      const r = this.rand();
      if (r < 0.45 + 0.15 * this.rage) {
        const gapT = this.chainGap();
        for (let i = 0; i < 3; i++) { const s = this.strike('houndBite', i, i * gapT); s.last = i === 2; }
        this.chainPerfects = 0;
      } else if (r < 0.78) this.strike('houndSnap', 1);
      else this.strike('houndPounce', 1);
    }
    this.cooldown = this.rest();
  }
}

// Siren: hovers past the edge. Her song drags you toward the drop and throws notes at you; parry a note to break
// the song (a perfect parry knocks her onto the ledge). She dives at you (gold) and shrieks at the edge (crimson).

export const HOVER_X = EDGE_X + 1.05;
export const HOVER_Y = 1.7;
export const SONG_WINDUP = 0.9;
export const SONG_TIME = 5.6;
export const SONG_PULL = 1.5;
export const NOTE_GAP = 1.05;
export const SHRIEK_FROM = EDGE_X - 3.1;
export const SIREN_HP = 440;

export class Siren extends Beast {
  readonly id = 'siren' as const;
  x = HOVER_X;
  y = HOVER_Y;
  mode: 'hover' | 'dive' | 'ground' | 'return' = 'hover';
  ground = 0;
  /** Seconds since the current song began, or -1. */
  song = -1;
  songWindup = SONG_WINDUP;
  songEnd = 0;
  private sinceSong = 1;

  constructor(duel: Duel) {
    super(duel);
    this.maxHp = this.hp = Math.round(SIREN_HP * TIERS[duel.tier].hp);
  }

  frontX(): number { return this.mode === 'ground' ? this.x - 0.55 : Infinity; }
  get singing(): boolean { return this.song >= this.songWindup; }

  hurtboxes(): Hurtbox[] {
    const open = this.mode === 'ground' || this.singing || this.isOpen();
    return [{ x0: this.x - 0.62, x1: this.x + 0.62, y: this.y, part: 0, mult: 1, staggered: this.stagger > 0, guarded: !open, priority: 0 }];
  }

  pullStrength(): number { return SONG_PULL * TIERS[this.tier].pull * (1 + 0.3 * this.rage); }
  noteGap(): number { return NOTE_GAP * TIERS[this.tier].gap * (1 - 0.2 * this.rage); }

  protected aim(s: Strike): void {
    if (s.attack === 'sirenNote') {
      s.target = this.hero.x;
      s.x0 = s.target - 0.4;
      s.x1 = s.target + 0.4;
    } else if (s.attack === 'sirenShriek') {
      s.target = SHRIEK_FROM;
      s.x0 = SHRIEK_FROM;
      s.x1 = EDGE_X + 0.5;
    } else {
      s.target = this.hero.x;
      s.data = clamp(s.target + 1.15, WALL_X + 1.6, EDGE_X - 0.35);
      s.x0 = s.data - 1.75;
      s.x1 = s.data + 0.2;
    }
  }

  onStrikeActive(s: Strike): void {
    if (s.attack !== 'sirenDive') return;
    this.mode = 'ground';
    // Never land on top of a hero who moved after the dive was aimed; past the edge she clings to the cliff.
    this.x = Math.min(HOVER_X, Math.max(s.data, this.hero.x + HERO_HALF + 0.57));
    this.y = this.x <= EDGE_X - 0.2 ? 0.5 : 0.9;
    this.ground = s.spec.active + s.spec.recovery;
  }

  onParry(s: Strike, perfect: boolean): void {
    if (s.attack === 'sirenNote') {
      this.endSong(true);
      if (perfect) {
        this.mode = 'ground';
        this.x = Math.min(HOVER_X, Math.max(EDGE_X - 0.6, this.hero.x + 1));
        this.y = this.x <= EDGE_X ? 0.5 : 0.9;
        this.ground = STAGGER.sirenNote ?? 1.9;
        this.staggerFor(this.ground);
      } else this.cooldown = Math.max(this.cooldown, 0.9);
      return;
    }
    if (perfect) {
      this.staggerFor(STAGGER.sirenDive ?? 1.7);
      this.ground = Math.max(this.ground, this.stagger);
    }
  }

  onHeroFell(): void {
    if (this.song >= 0) this.endSong(false);
  }

  private startSong(): void {
    this.song = 0;
    this.songWindup = windupFor(SONG_WINDUP, this.tier, this.rage);
    this.songEnd = this.songWindup + SONG_TIME;
    const noteWindup = windupFor(ATTACKS.sirenNote.windup, this.tier, this.rage);
    const gap = this.noteGap();
    for (let at = this.songWindup + 0.75; at + 0.2 < this.songEnd; at += gap) this.strike('sirenNote', 0, at - noteWindup);
    this.duel.emit('song', { x: this.x, y: this.y });
  }

  private endSong(broken: boolean): void {
    if (this.song < 0) return;
    this.song = -1;
    this.duel.pull = 0;
    this.cancel(s => s.attack === 'sirenNote');
    this.cooldown = broken ? 1 : this.rest();
    this.duel.emit(broken ? 'songBreak' : 'songEnd', { x: this.x, y: this.y });
  }

  protected think(dt: number): void {
    if (this.song >= 0) {
      const before = this.song;
      this.song += dt;
      if (before < this.songWindup && this.song >= this.songWindup) this.duel.emit('sing', { x: this.x, y: this.y });
      this.duel.pull = this.song >= this.songWindup ? this.pullStrength() : 0;
      if (this.song >= this.songEnd) this.endSong(false);
      return;
    }
    if (this.mode === 'ground') {
      this.ground -= dt;
      if (this.ground <= 0 && this.stagger <= 0 && !this.strikes.some(s => s.attack === 'sirenDive')) this.mode = 'return';
      return;
    }
    if (this.mode === 'return') {
      this.x = toward(this.x, HOVER_X, 6 * dt);
      this.y = toward(this.y, HOVER_Y, 4 * dt);
      if (this.x === HOVER_X && this.y === HOVER_Y) this.mode = 'hover';
      return;
    }
    const dive = this.strikes.find(s => s.attack === 'sirenDive');
    if (dive) {
      if (dive.t >= dive.windup - 0.3 && dive.t < dive.windup) {
        const k = clamp01((dive.t - (dive.windup - 0.3)) / 0.3);
        this.x = HOVER_X + (dive.data - HOVER_X) * k;
        this.y = HOVER_Y + 0.8 + (0.5 - HOVER_Y - 0.8) * k;
      } else if (dive.t < dive.windup) this.y = toward(this.y, HOVER_Y + 0.8, 3 * dt);
      return;
    }
    if (this.strikes.length) return;
    this.cooldown -= dt;
    if (this.cooldown > 0) return;
    if (this.sinceSong >= 2 || (this.sinceSong >= 1 && this.rand() < 0.45)) {
      this.sinceSong = 0;
      this.startSong();
      return;
    }
    this.sinceSong++;
    if (this.hero.x > SHRIEK_FROM - 0.5 && this.rand() < 0.6) this.strike('sirenShriek', 0);
    else { this.strike('sirenDive', 0); this.mode = 'dive'; }
    this.cooldown = this.rest();
  }

  update(dt: number): void {
    super.update(dt);
    if (this.mode === 'dive' && !this.strikes.some(s => s.attack === 'sirenDive')) this.mode = 'return';
  }
}

// Deep Kraken, the finale: lurks below the edge. Tentacles burst from the floor where a crimson crack glows; a gold
// tentacle slams down from the edge; it mixes the two, so you must switch between rolling and parrying; now and then
// its head surfaces to snap (twice in a row once enraged) while tentacles hunt a hero who keeps away. Tentacles in the
// open can be cut.

export const KRAKEN_HEAD_X0 = EDGE_X + 0.05;
export const KRAKEN_HEAD_X1 = EDGE_X + 1.5;
export const BURST_HALF = 0.85;
export const BURST_GAP = 0.55;
/** Burst-then-slam and slam-then-burst mixes: delay of the second strike's tell. */
export const MIX_GAP = 0.62;
export const BEAK_GAP = 0.55;
export const SURFACE_TIME = 3.2;
export const KRAKEN_HP = 380;

export class Kraken extends Beast {
  readonly id = 'kraken' as const;
  /** 0 submerged .. 1 surfaced. */
  head = 0;
  /** Seconds the head stays up. */
  up = 0;
  private beaks = 0;
  private sinceSurface = 1;

  constructor(duel: Duel) {
    super(duel);
    this.maxHp = this.hp = Math.round(KRAKEN_HP * TIERS[duel.tier].hp);
  }

  hurtboxes(): Hurtbox[] {
    const boxes: Hurtbox[] = [];
    if (this.head > 0.6) boxes.push({ x0: KRAKEN_HEAD_X0, x1: KRAKEN_HEAD_X1, y: 1.1, part: 0, mult: 1.25, staggered: this.stagger > 0, guarded: !this.isOpen(), priority: 1 });
    for (const s of this.strikes) {
      if (s.outcome === 'cancel' || s.t < s.windup) continue;
      if (s.attack === 'krakenBurst') boxes.push({ x0: s.target - 0.45, x1: s.target + 0.45, y: 1.3, part: 100 + s.id, mult: 0.8, staggered: false, guarded: false, priority: 0 });
      else if (s.attack === 'krakenSlam') boxes.push({ x0: s.target - 0.1, x1: s.target + 1, y: 0.35, part: 100 + s.id, mult: 0.8, staggered: s.outcome === 'perfect', guarded: false, priority: 0 });
    }
    return boxes;
  }

  protected aim(s: Strike): void {
    if (s.attack === 'krakenBurst') {
      s.target = clamp(this.hero.x, WALL_X + 1, EDGE_X - 0.9);
      s.x0 = s.target - BURST_HALF;
      s.x1 = s.target + BURST_HALF;
    } else if (s.attack === 'krakenSlam') {
      s.target = clamp(this.hero.x, WALL_X + 1.2, EDGE_X - 0.8);
      s.x0 = s.target - 1;
      s.x1 = EDGE_X;
    } else {
      s.target = EDGE_X - 0.6;
      s.x0 = EDGE_X - 1.75;
      s.x1 = EDGE_X + 0.3;
    }
  }

  onParry(s: Strike, perfect: boolean): void {
    if (!perfect) return;
    super.onParry(s, perfect);
    this.up = Math.max(this.up, this.stagger + 0.5);
  }

  burstCount(): number {
    if (this.rage >= 1) return 2;
    return this.rand() < (this.tier === 1 ? 0.45 : 0.3) ? 2 : 1;
  }

  protected think(dt: number): void {
    const wantUp = this.up > 0 || this.stagger > 0;
    this.head = toward(this.head, wantUp ? 1 : 0, dt * 2.2);
    this.up = Math.max(0, this.up - dt);
    if (this.stagger > 0 || this.strikes.length) return;
    this.cooldown -= dt;
    const gap = TIERS[this.tier].gap;
    if (this.up > 0) {
      if (this.head < 1 || this.cooldown > 0) return;
      if (this.hero.x > EDGE_X - 2.3) {
        if (this.beaks >= 2) return;
        this.strike('krakenBeak', 0);
        this.beaks++;
        // Enraged, the beak snaps twice.
        if (this.rage >= 1) { this.strike('krakenBeak', 0, BEAK_GAP * gap); this.beaks++; }
        this.cooldown = 0.5;
      } else {
        // The hero keeps away from the head: a tentacle hunts them instead.
        this.strike('krakenBurst', 0);
        this.cooldown = 0.7;
      }
      return;
    }
    if (this.head > 0 || this.cooldown > 0) return;
    if (this.sinceSurface >= 3 || (this.sinceSurface >= 1 && this.rand() < 0.3)) {
      this.sinceSurface = 0;
      this.up = SURFACE_TIME;
      this.beaks = 0;
      this.cooldown = 0.6;
      this.duel.emit('surface', { x: EDGE_X + 0.8 });
      return;
    }
    this.sinceSurface++;
    const r = this.rand();
    if (r < 0.3) {
      const n = this.burstCount();
      for (let i = 0; i < n; i++) this.strike('krakenBurst', i, i * BURST_GAP * gap);
    } else if (r < 0.44) this.strike('krakenSlam', 0);
    else if (r < 0.72) {
      // Crimson then gold: roll the burst, then turn and parry the slam.
      this.strike('krakenBurst', 0);
      this.strike('krakenSlam', 0, MIX_GAP * gap);
    } else {
      this.strike('krakenSlam', 0);
      this.strike('krakenBurst', 1, MIX_GAP * gap);
    }
    this.cooldown = this.rest();
  }
}

function createBeast(id: BeastId, duel: Duel): Beast {
  if (id === 'hydra') return new Hydra(duel);
  if (id === 'hound') return new Hound(duel);
  if (id === 'siren') return new Siren(duel);
  return new Kraken(duel);
}

// ------------------------------------------------------------------ scripted duellist

export interface BotMemory {
  /** Where inside the perfect window the bot aims its parries (0 = the very start). */
  lead: number;
  /** Seconds a crimson tell must have been visible before the bot reacts to it. */
  reaction: number;
  useFinisher: boolean;
  useParry: boolean;
}

export function createBot(random: () => number = Math.random, overrides: Partial<BotMemory> = {}): BotMemory {
  return { lead: 0.3 + random() * 0.4, reaction: 0.2, useFinisher: true, useParry: true, ...overrides };
}

/**
 * One frame of input from a scripted duellist that only uses what the screen shows: tells, their timing (each
 * attack's windup is fixed, so players learn it) and where the hitboxes are marked. Used by the tests to prove every
 * beast is beatable, and as a reference for the timing a player needs.
 */
export function botInput(duel: Duel, bot: BotMemory, random: () => number = Math.random): Input {
  const out: Input = { move: 0, attack: false, parry: false, dodge: false, finisher: false };
  const h = duel.hero;
  const beast = duel.beast;
  if (duel.state !== 'fight' || h.action === 'fall' || h.action === 'down') return out;
  const ready = duel.heroReady();

  let threat: Strike | null = null;
  let eta = Infinity;
  for (const s of beast.strikes) {
    if (s.outcome || s.t < 0) continue;
    const left = s.windup - s.t;
    if (left < -s.spec.active) continue;
    if (h.x + HERO_HALF + 0.08 < s.x0 || h.x - HERO_HALF - 0.08 > s.x1) continue;
    if (left < eta) { eta = left; threat = s; }
  }

  if (threat) {
    if (threat.spec.parryable && bot.useParry) {
      if (ready && eta <= duel.perfectWindow * bot.lead) out.parry = true;
      return out;
    }
    if (threat.t < bot.reaction) return out;
    // Step out of a pinned zone when there is time, else roll through it as it lands.
    const clearLeft = h.x + HERO_HALF - threat.x0 + 0.06;
    const walkTime = clearLeft / WALK_SPEED;
    if (threat.locked && threat.spec.lockLead === Infinity && walkTime < eta - 0.04 && h.x - clearLeft > WALL_X + HERO_HALF
      && (h.action === 'idle' || h.action === 'dodge')) {
      out.move = -1;
      return out;
    }
    if (eta <= 0.05 && ready && h.stamina >= DODGE.cost) { out.dodge = true; out.move = -1; }
    else if (eta > 0.05 && h.action === 'idle') out.move = -1;
    return out;
  }

  // A song is coming or playing: keep clear of the edge.
  if (beast instanceof Siren && beast.song >= 0 && h.x > EDGE_X - 2.2) { out.move = -1; return out; }

  if (bot.useFinisher && h.focus >= FOCUS_MAX) {
    if (duel.finisherTarget()) {
      if (ready) out.finisher = true;
      return out;
    }
  }
  const box = duel.swingTarget();
  if (box) {
    if (ready) out.attack = true;
    return out;
  }
  let goal = 0;
  const full = bot.useFinisher && h.focus >= FOCUS_MAX;
  const boxes = beast.hurtboxes(full);
  if (boxes.length) {
    const nearest = boxes.reduce((a, b) => (b.priority > a.priority || (b.priority === a.priority && b.x0 < a.x0) ? b : a));
    goal = nearest.x0 - HERO_HALF - (full ? FINISHER.reach : COMBO[0].reach) + 0.5;
  } else if (beast instanceof Hound) goal = beast.front - 1.4;
  else if (beast instanceof Hydra) goal = 1.4;
  else if (beast instanceof Kraken) goal = 0.5;
  else goal = 1.5;
  if (beast instanceof Siren && beast.mode === 'hover' && beast.song < 0) goal = Math.min(goal, EDGE_X - 1.4);
  if (h.action === 'idle' && Math.abs(goal - h.x) > 0.12) out.move = Math.sign(goal - h.x) * (0.85 + 0.15 * random());
  return out;
}

// ------------------------------------------------------------------ ladder records

/** Rungs: Hound, Siren, Hydra, Kraken on Normal are 1..4, then the same four on Nightmare are 5..8. */
export const LADDER = BEASTS.length * 2;
export const PROGRESS_KEY = 'afg-beastfall-best';
export const rungOf = (beast: number, tier: Tier) => tier * BEASTS.length + beast + 1;
/** `progress` is the highest rung cleared. A rung is open once the one before it is cleared. */
const cleared = (progress: number) => (Number.isFinite(progress) ? clamp(Math.floor(progress), 0, LADDER) : 0);
export const isUnlocked = (progress: number, beast: number, tier: Tier) => rungOf(beast, tier) <= Math.min(LADDER, cleared(progress) + 1);
export const nightmareOpen = (progress: number) => cleared(progress) >= BEASTS.length;
export function rungAt(rung: number): { beast: number; tier: Tier } {
  const r = (Number.isFinite(rung) ? clamp(Math.floor(rung), 1, LADDER) : 1) - 1;
  return { beast: r % BEASTS.length, tier: (r >= BEASTS.length ? 1 : 0) as Tier };
}
/** The rung to offer next: the first one not cleared yet (or the last). */
export const nextRung = (progress: number) => rungAt(Math.min(LADDER, cleared(progress) + 1));

/** Best times are stored so that larger is better (the kit keeps the larger value). */
export const TIME_CAP = 3600;
export const encodeTime = (seconds: number) => (seconds > 0 && seconds < TIME_CAP ? Math.round((TIME_CAP - seconds) * 10) : 0);
export const decodeTime = (value: number) => (value > 0 ? Math.max(0, TIME_CAP - value / 10) : 0);
export const timeKey = (beast: BeastId, tier: Tier) => `${PROGRESS_KEY}-time-${beast}-${tier}`;
export const medalKey = (beast: BeastId, tier: Tier) => `${PROGRESS_KEY}-nohit-${beast}-${tier}`;
export function formatTime(seconds: number): string {
  const tenths = Math.max(0, Math.round(seconds * 10));
  const m = Math.floor(tenths / 600);
  const s = Math.floor((tenths % 600) / 10);
  return `${m}:${String(s).padStart(2, '0')}.${tenths % 10}`;
}
