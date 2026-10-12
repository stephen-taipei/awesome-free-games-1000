/** Beastfall Trials: the three.js scene, the fixed-step duel loop, camera framing and hit feedback. */
import { THREE, createStage, createLoop, Keys, clamp, damp, prefersReducedMotion, type Stage } from '../../../shared/three/kit';
import {
  Duel, createBot, botInput, phaseOf, Hydra, Siren,
  EDGE_X, WALL_X, HERO_HP, STAMINA_MAX, FOCUS_MAX, RESPAWN_X,
  type AttackId, type BeastId, type BotMemory, type DuelEvent, type DuelStats, type Input, type Tier,
} from './logic';
import { glowTexture, buildEnvironment, Sparks, Zones, GOLD, CRIMSON, SONG, EMBER, type Environment } from './art';
import { HeroView } from './hero';
import { createView, tellColor, HydraView, type BeastView, type ViewContext } from './beasts';

/** The duel runs at a fixed 120 Hz whatever the display rate. */
const STEP = 1 / 120;
const FOV = 34;
const TAN_HALF = Math.tan((FOV / 2) * Math.PI / 180);
const OUTRO_WON = 2.4;
const OUTRO_LOST = 2;
/** Whole-body hit flashes start at most this often (seconds of real time), so they never strobe above 3 Hz. */
const FLASH_GAP = 0.34;

export type Status = 'idle' | 'running' | 'paused' | 'outro' | 'over';
export type Action = 'attack' | 'parry' | 'dodge' | 'finisher';
export type PopupKind = 'damage' | 'guarded' | 'crit' | 'finisher' | 'perfect' | 'block' | 'evade' | 'hurt' | 'stagger' | 'focus';

export interface Hud {
  hp: number;
  stamina: number;
  focus: number;
  ready: boolean;
  beastHp: number;
  enraged: boolean;
  time: number;
  /** Hydra heads, else null. */
  heads: ('alive' | 'stump' | 'gone')[] | null;
}

export interface Result {
  beast: BeastId;
  tier: Tier;
  won: boolean;
  time: number;
  hp: number;
  /** 0..1 health the beast had left. */
  beastHp: number;
  stats: DuelStats;
}

/** Which attacks mark the floor while they wind up, and how. */
const ZONES: Partial<Record<AttackId, { depth: number; disc: boolean }>> = {
  hydraSweep: { depth: 2.4, disc: false },
  hydraSpit: { depth: 2, disc: true },
  houndPounce: { depth: 2, disc: true },
  sirenShriek: { depth: 2.6, disc: false },
  sirenDive: { depth: 1.8, disc: false },
  krakenBurst: { depth: 2, disc: true },
  krakenSlam: { depth: 1.6, disc: false },
};
/** Attacks that shake the ground when they land. */
const HEAVY = new Set<AttackId>(['hydraSweep', 'houndPounce', 'krakenBurst', 'krakenSlam', 'sirenDive', 'sirenShriek']);

const WHITE = new THREE.Color(1, 0.96, 0.86);
const STEEL = new THREE.Color(0.62, 0.66, 0.78);
const DUST = new THREE.Color(0.62, 0.5, 0.4);
const SPRAY = new THREE.Color(0.55, 0.85, 1);
const VENOM = new THREE.Color(0.62, 1, 0.45);
const BLOOD = new THREE.Color(0.75, 0.08, 0.16);

export class BeastfallGame {
  onHud: (hud: Hud) => void = () => {};
  onEvent: (event: DuelEvent) => void = () => {};
  onPopup: (kind: PopupKind, x: number, y: number, value: number) => void = () => {};
  onOver: (result: Result) => void = () => {};

  private readonly stage: Stage;
  private readonly keys = new Keys();
  private readonly loop = createLoop((dt, t) => this.frame(dt, t));
  private readonly reduced = prefersReducedMotion();
  private readonly glow = glowTexture();
  private readonly env: Environment;
  private readonly sparks: Sparks;
  private readonly zones: Zones;
  private readonly heroView: HeroView;
  private readonly views = new Map<BeastId, BeastView>();
  private view!: BeastView;
  private state: Status = 'idle';
  private match!: Duel;
  private beastId: BeastId = 'hydra';
  private tier: Tier = 0;
  private acc = 0;
  private clock = 0;
  private viewClock = 0;
  private outroT = 0;
  private hitStop = 0;
  private slowT = 0;
  private slowScale = 1;
  private kick = new THREE.Vector3();
  private shake = 0;
  private stick = 0;
  private readonly pending = { attack: false, parry: false, dodge: false, finisher: false };
  private readonly input: Input = { move: 0, attack: false, parry: false, dodge: false, finisher: false };
  private bot: BotMemory | null = null;
  private insetTop = 0;
  private insetBottom = 0;
  private insetRight = 0;
  private readonly cam = { x: 0, y: 1.4, d: 14, ready: false };
  private readonly hud: Hud = { hp: 1, stamina: 1, focus: 0, ready: false, beastHp: 1, enraged: false, time: 0, heads: null };
  private readonly heads: ('alive' | 'stump' | 'gone')[] = ['alive', 'alive', 'alive'];
  private readonly ctx: ViewContext;
  private readonly tmp = new THREE.Vector3();
  private readonly tmp2 = new THREE.Vector3();
  private songPuff = 0;
  private beastFlashAt = -1;
  private heroFlashAt = -1;
  private readonly partFlashAt = [-1, -1, -1];
  private readonly hemi = new THREE.HemisphereLight(0xffc6d8, 0x2a1830, 1.25);

  static create(host: HTMLElement): BeastfallGame | null {
    const stage = createStage(host, { fov: FOV, near: 0.1, far: 900, maxPixelRatio: 1.75 });
    return stage ? new BeastfallGame(stage) : null;
  }

  private constructor(stage: Stage) {
    this.stage = stage;
    const { scene, renderer } = stage;
    renderer.toneMappingExposure = 1.05;
    scene.background = new THREE.Color(0x2a1838);

    const hemi = this.hemi;
    const key = new THREE.DirectionalLight(0xffd2a8, 2.1);
    key.position.set(-5, 9, 10);
    const rim = new THREE.DirectionalLight(0xff8a5a, 3.2);
    rim.position.set(14, 4, -16);
    const fill = new THREE.DirectionalLight(0x7f8cff, 0.7);
    fill.position.set(-10, 3, 6);
    scene.add(hemi, key, rim, fill);

    this.env = buildEnvironment(scene, this.glow);
    this.sparks = new Sparks(420, this.glow);
    scene.add(this.sparks.points);
    this.zones = new Zones(scene, 5);
    this.heroView = new HeroView(this.glow);
    scene.add(this.heroView.root, ...this.heroView.extras);
    this.ctx = { t: 0, dt: 0, heroX: 0, sparks: this.sparks, reduced: this.reduced, dying: 0, gloat: false };

    stage.onResize((_w, h) => {
      this.sparks.setScale((h * renderer.getPixelRatio()) / (2 * TAN_HALF));
      // A rotation or resize mid-fight re-frames at once: the arena itself never depends on the viewport.
      if (this.match) { this.updateCamera(0, true); this.stage.render(); }
    });

    this.preview('hydra', 0);
    this.loop.start();
  }

  get status(): Status { return this.state; }
  /** The running duel (read-only use: tests and the HUD). */
  get duel(): Duel { return this.match; }

  /** Shows a beast on the cliff behind the menu, idle. */
  preview(beast: BeastId, tier: Tier): void {
    if (this.state === 'running' || this.state === 'paused' || this.state === 'outro') return;
    this.setup(beast, tier);
    this.state = 'idle';
  }

  /** Leaves a paused fight for the menu. */
  abandon(): void {
    if (this.state !== 'paused') return;
    this.state = 'idle';
    this.setup(this.beastId, this.tier);
  }

  start(beast: BeastId, tier: Tier): void {
    this.setup(beast, tier);
    this.state = 'running';
    this.keys.clear();
    this.pending.attack = this.pending.parry = this.pending.dodge = this.pending.finisher = false;
  }

  pause(): void { if (this.state === 'running') this.state = 'paused'; }
  resume(): void {
    if (this.state !== 'paused') return;
    this.state = 'running';
    this.keys.clear();
  }

  /** Space taken by the HUD (top), touch controls (bottom or right) and navigation, in CSS pixels. */
  setInsets(top: number, bottom: number, right = 0): void {
    if (Math.abs(top - this.insetTop) < 1 && Math.abs(bottom - this.insetBottom) < 1 && Math.abs(right - this.insetRight) < 1) return;
    this.insetTop = top;
    this.insetBottom = bottom;
    this.insetRight = right;
    if (this.match) { this.updateCamera(0, true); this.stage.render(); }
  }

  /** Touch pad: -1..1. */
  setStick(value: number): void { this.stick = clamp(value, -1, 1); }
  press(action: Action): void { this.pending[action] = true; }
  /** Debug and tests: a scripted duellist plays instead of the inputs. */
  setAutoplay(on: boolean): void { this.bot = on ? createBot() : null; }

  /** Debug and tests: advances the game clock without waiting for frames. */
  advance(seconds: number): void {
    const n = Math.max(1, Math.round(seconds * 60));
    for (let i = 0; i < n; i++) this.frame(1 / 60, this.clock, i === n - 1);
  }

  /** Screen position (CSS px) of a world point. */
  project(x: number, y: number, z = 0): { x: number; y: number } {
    const v = this.tmp2.set(x, y, z).project(this.stage.camera);
    return { x: (v.x + 1) / 2 * this.stage.width, y: (1 - v.y) / 2 * this.stage.height };
  }

  private setup(beast: BeastId, tier: Tier): void {
    this.beastId = beast;
    this.tier = tier;
    this.match = new Duel(beast, tier);
    for (const [id, v] of this.views) v.root.visible = id === beast;
    let view = this.views.get(beast);
    if (!view) {
      view = createView(beast, this.glow);
      this.views.set(beast, view);
      this.stage.scene.add(view.root);
    }
    this.view = view;
    view.root.visible = true;
    // Nightmare: a bloodier haze and a darker dusk.
    const fog = this.stage.scene.fog as THREE.Fog | null;
    fog?.color.set(tier === 1 ? 0x6a1f3c : 0x8a4a6a);
    this.hemi.color.set(tier === 1 ? 0xff9fb4 : 0xffc6d8);
    this.stage.renderer.toneMappingExposure = tier === 1 ? 0.92 : 1.05;
    this.acc = 0;
    this.outroT = 0;
    this.hitStop = 0;
    this.slowT = 0;
    this.slowScale = 1;
    this.shake = 0;
    this.kick.set(0, 0, 0);
    this.sparks.clear();
    this.heroView.snap(this.match.hero.x);
    // Pose the views once so the first frame already shows the new beast in place.
    this.updateViews(1 / 60);
    this.updateCamera(0, true);
    this.publishHud();
  }

  private frame(dt: number, _elapsed: number, render = true): void {
    if (this.state === 'paused') { if (render) this.stage.render(); return; }
    this.clock += dt;
    // Poses and particles run on the duel's clock, so hit-stop freezes them and slow motion slows them.
    let viewDt = dt;
    if (this.state === 'running' || this.state === 'outro') {
      this.readKeys();
      let simDt = dt;
      if (this.hitStop > 0) {
        const used = Math.min(this.hitStop, simDt);
        this.hitStop -= used;
        simDt -= used;
      }
      if (this.slowT > 0) {
        this.slowT -= dt;
        simDt *= this.slowScale;
      }
      viewDt = simDt;
      this.acc = Math.min(this.acc + simDt, 0.25);
      while (this.acc >= STEP) {
        this.acc -= STEP;
        this.simStep();
      }
      if (this.state === 'outro') {
        this.outroT += dt;
        const won = this.match.state === 'won';
        if (this.outroT >= (won ? OUTRO_WON : OUTRO_LOST)) {
          this.state = 'over';
          this.onOver({ beast: this.beastId, tier: this.tier, won, time: this.match.time, hp: this.match.hero.hp, beastHp: this.match.beast.health(), stats: { ...this.match.stats } });
        }
      }
    }
    this.viewClock += viewDt;
    this.updateViews(viewDt);
    this.updateZones();
    this.sparks.update(viewDt);
    this.env.update(this.clock);
    this.updateCamera(dt);
    this.publishHud();
    if (render) this.stage.render();
  }

  private readKeys(): void {
    const k = this.keys;
    if (k.consume('KeyJ', 'Space')) this.pending.attack = true;
    if (k.consume('KeyK', 'ShiftLeft', 'ShiftRight')) this.pending.parry = true;
    if (k.consume('KeyL', 'ArrowDown', 'KeyS')) this.pending.dodge = true;
    if (k.consume('KeyI', 'ArrowUp', 'KeyW')) this.pending.finisher = true;
  }

  private simStep(): void {
    const duel = this.match;
    let input: Input;
    if (this.bot && duel.state === 'fight') {
      input = botInput(duel, this.bot);
    } else {
      input = this.input;
      const k = this.keys;
      const keyMove = (k.isDown('KeyD', 'ArrowRight') ? 1 : 0) - (k.isDown('KeyA', 'ArrowLeft') ? 1 : 0);
      input.move = keyMove !== 0 ? keyMove : this.stick;
      input.attack = this.pending.attack;
      input.parry = this.pending.parry;
      input.dodge = this.pending.dodge;
      input.finisher = this.pending.finisher;
    }
    this.pending.attack = this.pending.parry = this.pending.dodge = this.pending.finisher = false;
    const events = duel.step(STEP, input);
    for (const e of events) this.handle(e);
    if (this.state === 'running' && duel.state !== 'fight') {
      this.state = 'outro';
      this.outroT = 0;
    }
  }

  // ------------------------------------------------------------------ feedback

  private stop(seconds: number): void { if (!this.reduced) this.hitStop = Math.max(this.hitStop, seconds); }
  /** Flashes the whole beast, unless it flashed less than FLASH_GAP ago (sparks and popups still mark the hit). */
  private flashBeast(color: number, seconds: number): void {
    if (this.clock - this.beastFlashAt < FLASH_GAP) return;
    this.beastFlashAt = this.clock;
    this.view.flash(color, seconds);
  }
  private flashHero(color: number, seconds: number): void {
    if (this.clock - this.heroFlashAt < FLASH_GAP) return;
    this.heroFlashAt = this.clock;
    this.heroView.flash(color, seconds);
  }
  private flashPart(part: number | undefined): void {
    if (!(this.view instanceof HydraView) || part === undefined || part < 0 || part > 2) return;
    if (this.clock - this.partFlashAt[part] < FLASH_GAP) return;
    this.partFlashAt[part] = this.clock;
    this.view.flashPart(part);
  }
  private slow(scale: number, seconds: number): void {
    if (this.reduced) return;
    this.slowScale = scale;
    this.slowT = Math.max(this.slowT, seconds);
  }
  private punch(x: number, y: number, amount: number): void {
    if (this.reduced) return;
    this.kick.x += x * amount;
    this.kick.y += y * amount;
  }
  private quake(amount: number): void { if (!this.reduced) this.shake = Math.max(this.shake, amount); }

  private popup(kind: PopupKind, x: number, y: number, value = 0): void {
    const p = this.project(x, y);
    this.onPopup(kind, p.x, p.y, value);
  }

  private handle(e: DuelEvent): void {
    const s = this.sparks;
    const hero = this.match.hero;
    const hx = hero.x;
    switch (e.type) {
      case 'land': {
        const x = e.x ?? hx + 1;
        const y = e.y ?? 1;
        if (e.sear) {
          // Hacking at a Hydra stump: no damage, but the blade drinks Focus.
          s.emit(x - 0.3, y, 0.3, 9, { color: EMBER, speed: 5, up: 0.5, life: 0.45, size: 0.2, gravity: 4 });
          s.emit(x - 0.3, y, 0.3, 4, { color: GOLD, speed: 2, up: 0.9, life: 0.6, size: 0.22, gravity: -1 });
          this.stop(0.03);
          this.punch(1, 0, 0.06);
          this.flashPart(e.part);
          this.popup('focus', x - 0.3, y + 0.8, e.focus ?? 0);
          break;
        }
        if (e.finisher) {
          s.emit(x, y, 0.3, 46, { color: EMBER, speed: 9, up: 0.4, life: 0.9, size: 0.38, gravity: 4 });
          s.emit(x, y, 0.3, 20, { color: WHITE, speed: 13, life: 0.4, size: 0.24 });
          this.stop(0.16);
          this.slow(0.35, 0.45);
          this.punch(1, -0.4, 0.45);
          this.quake(0.3);
          this.flashBeast(0xffb060, 0.28);
          this.popup('finisher', x, y + 0.7, e.damage ?? 0);
        } else if (e.guarded) {
          s.emit(x, y, 0.3, 7, { color: STEEL, speed: 5, life: 0.35, size: 0.16 });
          this.stop(0.025);
          this.punch(1, 0, 0.06);
          this.flashBeast(0x8890a8, 0.08);
          this.popup('guarded', x, y + 0.6, e.damage ?? 0);
        } else {
          const heavy = e.combo === 2;
          s.emit(x, y, 0.3, heavy ? 22 : 13, { color: WHITE, speed: heavy ? 9 : 7, life: 0.45, size: 0.2, dirX: 0.6 });
          if (e.staggered) s.emit(x, y, 0.3, 10, { color: GOLD, speed: 6, life: 0.5, size: 0.26 });
          this.stop(heavy ? 0.085 : 0.05);
          this.punch(1, -0.2, heavy ? 0.22 : 0.12);
          this.flashBeast(0xffffff, 0.12);
          this.popup(e.staggered ? 'crit' : 'damage', x, y + 0.6, e.damage ?? 0);
        }
        this.flashPart(e.part);
        break;
      }
      case 'perfect': {
        const x = e.x ?? hx + 0.6;
        s.emit(x, 1.25, 0.35, 34, { color: e.strike?.attack === 'sirenNote' ? SONG : GOLD, speed: 10, life: 0.6, size: 0.3, gravity: 3 });
        s.emit(x, 1.25, 0.35, 12, { color: WHITE, speed: 4, life: 0.3, size: 0.5, gravity: 0 });
        this.flashHero(0xffd27a, 0.22);
        this.stop(0.12);
        this.slow(0.4, 0.35);
        this.punch(1, 0, 0.18);
        this.popup('perfect', x, 2.3);
        break;
      }
      case 'block': {
        const x = e.x ?? hx + 0.6;
        s.emit(x, 1.2, 0.35, 14, { color: EMBER, speed: 7, life: 0.4, size: 0.2 });
        this.stop(0.05);
        this.punch(-1, 0, 0.14);
        this.popup('block', x, 2.2, e.damage ?? 0);
        break;
      }
      case 'hurt': {
        s.emit(hx, 1.1, 0.3, 20, { color: CRIMSON, speed: 7, life: 0.5, size: 0.24, dirX: -0.5 });
        s.emit(hx, 1.1, 0.3, 8, { color: BLOOD, speed: 4, life: 0.7, size: 0.3, gravity: 9 });
        this.flashHero(0xff3048, 0.24);
        this.stop(0.07);
        this.quake(0.22);
        this.punch(-1, 0.3, 0.2);
        this.popup('hurt', hx, 2.3, e.damage ?? 0);
        break;
      }
      case 'evade':
        s.emit(hx, 1, 0.3, 10, { color: SPRAY, speed: 4, life: 0.5, size: 0.2, gravity: -1 });
        this.popup('evade', hx, 2.2);
        break;
      case 'dodge':
        s.emit(hx, 0.08, 0.3, 9, { color: DUST, speed: 2.4, up: 0.6, life: 0.55, size: 0.36, gravity: 1.5 });
        break;
      case 'finisher':
        s.emit(hx + 0.4, 1.4, 0.3, 24, { color: EMBER, speed: 3, up: 0.8, life: 0.7, size: 0.26, gravity: -2 });
        this.slow(0.5, 0.25);
        break;
      case 'strike': {
        const st = e.strike;
        if (st && HEAVY.has(st.attack)) {
          const x = (st.x0 + st.x1) / 2;
          s.emit(x, 0.1, 0.2, 18, { color: DUST, speed: 4, up: 0.9, life: 0.7, size: 0.42, gravity: 3, jitter: Math.max(0.3, st.x1 - st.x0) });
          if (st.attack === 'krakenBurst') s.emit(st.target, 0.2, 0.2, 18, { color: SPRAY, speed: 7, up: 1.6, spread: 0.45, life: 0.8, size: 0.3, gravity: 9 });
          this.quake(st.attack === 'sirenShriek' ? 0.12 : 0.18);
        }
        if (st?.attack === 'hydraSpit') s.emit(st.target, 0.2, 0.2, 16, { color: VENOM, speed: 4, up: 0.8, life: 0.6, size: 0.3, gravity: 6 });
        break;
      }
      case 'sever': {
        const x = e.x ?? hx + 1;
        const y = e.y ?? 1;
        s.emit(x, y, 0.3, 30, { color: BLOOD, speed: 6, up: 0.4, life: 0.8, size: 0.3, gravity: 9 });
        s.emit(x, y, 0.3, 10, { color: WHITE, speed: 9, life: 0.3, size: 0.2 });
        this.stop(0.1);
        this.quake(0.15);
        break;
      }
      case 'burn': {
        const x = e.x ?? hx + 1;
        const y = e.y ?? 1;
        s.emit(x, y, 0.3, 50, { color: EMBER, speed: 6, up: 1.2, life: 1.1, size: 0.36, gravity: -1.5 });
        this.quake(0.25);
        break;
      }
      case 'regrow':
        s.emit(e.x ?? 4, e.y ?? 2.6, 0, 22, { color: VENOM, speed: 3, up: 0.5, life: 0.8, size: 0.26, gravity: 2 });
        break;
      case 'songBreak':
        s.emit(e.x ?? EDGE_X, e.y ?? 1.7, 0, 30, { color: SONG, speed: 8, life: 0.7, size: 0.3, gravity: 1 });
        this.punch(1, 0, 0.12);
        break;
      case 'fall':
        this.quake(0.2);
        break;
      case 'respawn':
        s.emit(RESPAWN_X, 0.2, 0.2, 16, { color: GOLD, speed: 2.5, up: 1.4, life: 0.8, size: 0.3, gravity: -1 });
        break;
      case 'surface':
        s.emit(EDGE_X + 0.8, 0.3, 0.2, 40, { color: SPRAY, speed: 6, up: 1.8, spread: 0.6, life: 1, size: 0.34, gravity: 8 });
        this.quake(0.2);
        break;
      case 'stagger':
        s.emit(e.x !== undefined && Number.isFinite(e.x) ? e.x : hx + 2, 2.4, 0.2, 12, { color: GOLD, speed: 2, up: 0.4, life: 0.9, size: 0.28, gravity: 0 });
        this.popup('stagger', e.x !== undefined && Number.isFinite(e.x) ? e.x + 0.4 : hx + 2, 3.3);
        break;
      case 'enrage': {
        const x = e.x !== undefined && Number.isFinite(e.x) ? e.x : EDGE_X;
        s.emit(x + 0.6, 1.6, 0, 40, { color: CRIMSON, speed: 6, up: 0.6, life: 0.9, size: 0.34, gravity: -1 });
        this.flashBeast(0xff2d4e, 0.5);
        this.quake(0.25);
        break;
      }
      case 'victory':
        this.slow(0.3, 1.1);
        this.flashBeast(0xffffff, 0.4);
        break;
      case 'defeat':
        this.slow(0.4, 0.8);
        break;
      default:
        break;
    }
    this.onEvent(e);
  }

  // ------------------------------------------------------------------ views

  private updateViews(dt: number): void {
    const duel = this.match;
    const ctx = this.ctx;
    ctx.t = this.viewClock;
    ctx.dt = dt;
    ctx.heroX = duel.hero.x;
    ctx.dying = duel.state === 'won' ? clamp(this.outroT / (OUTRO_WON * 0.8), 0, 1) : 0;
    ctx.gloat = duel.state === 'lost';
    this.view.update(duel.beast, ctx);
    const outro = duel.state === 'won' ? 'won' : duel.state === 'lost' ? 'lost' : 'none';
    this.heroView.update(dt, this.viewClock, duel.hero, outro, this.reduced, duel.perfectWindow);

    // The song: a cyan current drags past the hero toward the edge.
    if (duel.pull > 0 && dt > 0) {
      this.songPuff -= dt;
      if (this.songPuff <= 0) {
        this.songPuff = 0.06;
        this.sparks.emit(duel.hero.x - 1.2 + Math.random() * 2, 0.3 + Math.random() * 1.8, 0.4, 1, { color: SONG, speed: 3.5, dirX: 2.2, spread: 0.2, life: 0.8, size: 0.2, gravity: 0, jitter: 0.4 });
      }
    }
  }

  private updateZones(): void {
    const z = this.zones;
    z.begin();
    const duel = this.match;
    for (const s of duel.beast.strikes) {
      if (s.t < 0 || s.outcome === 'cancel') continue;
      const zone = ZONES[s.attack];
      if (!zone) continue;
      const phase = phaseOf(s);
      if (phase === 'recovery') continue;
      // A tell that still follows the hero is drawn soft; once it locks, its rim hardens.
      const locked = s.locked && Number.isFinite(s.spec.lockLead);
      z.show(s.x0, Math.min(s.x1, EDGE_X), 0, zone.depth, tellColor(s), clamp(s.t / s.windup, 0, 1), this.viewClock, zone.disc, phase === 'active', locked);
    }
    // While the Siren sings, the lip of the cliff glows as a warning.
    const beast = duel.beast;
    if (beast instanceof Siren && beast.song >= 0 && duel.state === 'fight') {
      const k = clamp(beast.song / beast.songWindup, 0, 1);
      z.show(EDGE_X - 0.7, EDGE_X, 0, 3, SONG, k, this.clock, false, false, false);
    }
    z.end();
  }

  // ------------------------------------------------------------------ camera

  private updateCamera(dt: number, snap = false): void {
    const { width: w, height: h, camera } = this.stage;
    const duel = this.match;
    const frame = this.view.frame(duel.beast);
    const heroX = duel.hero.action === 'fall' ? EDGE_X : duel.hero.x;
    // World span to keep in view: the hero, the beast, and some ground behind the hero.
    const aspect = w / h;
    const narrow = aspect < 0.8;
    let x0 = Math.max(Math.min(heroX - (narrow ? 1.1 : 1.7), frame.left), WALL_X - 1);
    let x1 = Math.max(heroX + 1.2, frame.right);
    // Phones in portrait get a tighter shot: width is what they lack.
    const minWidth = narrow ? 7 : aspect < 1.3 ? 9 : 11;
    if (x1 - x0 < minWidth) {
      const grow = minWidth - (x1 - x0);
      const back = Math.max(0, Math.min(grow, x0 - (WALL_X - 1.2)));
      x0 -= back;
      x1 += grow - back;
    }
    const low = -0.7;
    const high = Math.max(frame.top, 2.7) + 0.5;
    // Fit that span into the part of the screen the HUD and touch controls leave free.
    const top = clamp(this.insetTop, 0, h * 0.45);
    const bottom = clamp(this.insetBottom, 0, h * 0.45);
    const right = clamp(this.insetRight, 0, w * 0.35);
    const safeH = Math.max(60, h - top - bottom);
    const safeW = Math.max(120, w - right);
    const fitW = (x1 - x0) / (2 * TAN_HALF * aspect * (safeW / w) * 0.94);
    const fitH = (high - low) / (2 * TAN_HALF * (safeH / h) * 0.9);
    let d = clamp(Math.max(fitW, fitH), 10, 90);
    // A finisher pulls the camera in a little (not under reduced motion).
    if (!this.reduced && duel.hero.action === 'finisher') d *= 0.86;
    const unitsPerPx = (2 * TAN_HALF * d) / h;
    const x = (x0 + x1) / 2 - (safeW / 2 - w / 2) * unitsPerPx;
    const y = (low + high) / 2 + (top + safeH / 2 - h / 2) * unitsPerPx;
    const c = this.cam;
    if (snap || !c.ready) {
      c.x = x; c.y = y; c.d = d; c.ready = true;
    } else {
      const k = damp(3.2, dt);
      c.x += (x - c.x) * k;
      c.y += (y - c.y) * k;
      c.d += (d - c.d) * damp(2.4, dt);
      // The easing never lets the hero slip out of the free part of the screen.
      const upp = (2 * TAN_HALF * c.d) / h;
      const seenLeft = c.x - (w / 2) * upp;
      const seenRight = c.x + (safeW - w / 2) * upp;
      if (heroX - 0.8 < seenLeft) c.x += heroX - 0.8 - seenLeft;
      else if (heroX + 0.8 > seenRight) c.x += heroX + 0.8 - seenRight;
    }
    // Kick and shake decay quickly; both are skipped entirely under reduced motion.
    this.kick.multiplyScalar(Math.exp(-14 * dt));
    this.shake = Math.max(0, this.shake - dt * 1.1);
    const sx = this.shake > 0 ? (Math.random() - 0.5) * this.shake * 0.5 : 0;
    const sy = this.shake > 0 ? (Math.random() - 0.5) * this.shake * 0.5 : 0;
    const tilt = 0.13;
    camera.position.set(c.x + this.kick.x * 0.4 + sx, c.y + c.d * tilt + this.kick.y * 0.4 + sy, c.d);
    camera.lookAt(this.tmp.set(c.x + this.kick.x * 0.25 + sx * 0.5, c.y + sy * 0.5, 0));
    camera.updateMatrixWorld();
  }

  private publishHud(): void {
    const duel = this.match;
    const hero = duel.hero;
    const hud = this.hud;
    hud.hp = clamp(hero.hp / HERO_HP, 0, 1);
    hud.stamina = clamp(hero.stamina / STAMINA_MAX, 0, 1);
    hud.focus = clamp(hero.focus / FOCUS_MAX, 0, 1);
    hud.ready = hero.focus >= FOCUS_MAX;
    hud.beastHp = duel.beast.health();
    hud.enraged = duel.beast.enraged;
    hud.time = duel.time;
    if (duel.beast instanceof Hydra) {
      duel.beast.heads.forEach((head, i) => { this.heads[i] = head.state; });
      hud.heads = this.heads;
    } else hud.heads = null;
    this.onHud(hud);
  }
}
