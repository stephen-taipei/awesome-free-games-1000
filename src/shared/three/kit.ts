/**
 * Shared runtime for the WebGL (three.js) games: stage, loop, input, storage, sound and i18n wiring.
 * Every helper degrades instead of throwing, so a page without WebGL, audio or storage still loads.
 */
import * as THREE from './three.module.min.js';
import { i18n, LOCALES, type Locale, type Translations } from '../i18n/index';

export { THREE };

export function hasWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return !!(canvas.getContext('webgl2') || canvas.getContext('webgl'));
  } catch {
    return false;
  }
}

/** Set by createStage when the GPU is a CPU fallback (SwiftShader, llvmpipe), where every frame is expensive. */
let softwareRendering = false;

function isSoftwareRenderer(renderer: THREE.WebGLRenderer): boolean {
  try {
    const gl = renderer.getContext();
    let name = String(gl.getParameter(gl.RENDERER));
    // Chromium masks RENDERER; Firefox exposes it directly and warns when the debug extension is used.
    if (/^webkit webgl$/i.test(name)) {
      const info = gl.getExtension('WEBGL_debug_renderer_info');
      if (info) name = String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL));
    }
    return /swiftshader|llvmpipe|softpipe|software/i.test(name);
  } catch {
    return false;
  }
}

export interface Stage {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  width: number;
  height: number;
  render(): void;
  onResize(listener: (width: number, height: number) => void): void;
}

/** Creates a renderer that fills `host` and tracks its size. Returns null when WebGL is unavailable. */
export function createStage(host: HTMLElement, options: { fov?: number; near?: number; far?: number; shadows?: boolean; maxPixelRatio?: number } = {}): Stage | null {
  if (!hasWebGL()) return null;
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  } catch {
    return null;
  }
  softwareRendering = isSoftwareRenderer(renderer);
  renderer.setPixelRatio(softwareRendering ? 1 : Math.min(window.devicePixelRatio || 1, options.maxPixelRatio ?? 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.shadowMap.enabled = !!options.shadows;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.domElement.setAttribute('aria-hidden', 'true');
  host.append(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(options.fov ?? 60, 1, options.near ?? 0.1, options.far ?? 400);
  const listeners: Array<(width: number, height: number) => void> = [];
  const stage: Stage = {
    renderer, scene, camera, width: 1, height: 1,
    render: () => renderer.render(scene, camera),
    onResize: listener => { listeners.push(listener); listener(stage.width, stage.height); },
  };
  const resize = () => {
    const width = Math.max(1, host.clientWidth);
    const height = Math.max(1, host.clientHeight);
    stage.width = width;
    stage.height = height;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    listeners.forEach(listener => listener(width, height));
  };
  if (typeof ResizeObserver !== 'undefined') new ResizeObserver(resize).observe(host);
  window.addEventListener('resize', resize);
  resize();
  return stage;
}

export interface Loop { start(): void; stop(): void; readonly running: boolean; }

/** requestAnimationFrame loop with a clamped delta, so a background tab never produces a giant step. */
export function createLoop(step: (dt: number, elapsed: number) => void): Loop {
  let frame = 0;
  let last = 0;
  let idleSince = 0;
  let elapsed = 0;
  let running = false;
  const tick = (now: number) => {
    if (!running) return;
    // On a CPU-rendered GPU (SwiftShader, llvmpipe) one frame can take hundreds of milliseconds, and a
    // scene animating behind a menu starves input handling. There, while any overlay is open, step only
    // every two seconds. Play itself runs at full rate.
    if (softwareRendering && document.querySelector('.g3d-overlay:not([hidden])')) {
      if (!idleSince) idleSince = now;
      if (now - idleSince < 2000) { frame = requestAnimationFrame(tick); return; }
      idleSince = now;
    } else {
      idleSince = 0;
    }
    const dt = last ? Math.min((now - last) / 1000, 1 / 20) : 1 / 60;
    last = now;
    elapsed += dt;
    step(dt, elapsed);
    frame = requestAnimationFrame(tick);
  };
  return {
    start() {
      if (running) return;
      running = true;
      // The first frame runs synchronously, so shader compilation happens while the page is still
      // loading instead of inside the first click.
      last = idleSince = performance.now();
      step(1 / 60, elapsed);
      frame = requestAnimationFrame(tick);
    },
    stop() { running = false; cancelAnimationFrame(frame); },
    get running() { return running; },
  };
}

const GAME_KEYS = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space']);
const isFormField = (target: EventTarget | null) => target instanceof HTMLElement && !!target.closest('input, select, textarea, button, a');

/** Keyboard state. `isDown` for held keys, `consume` for one press. */
export class Keys {
  private held = new Set<string>();
  private pressed = new Set<string>();
  constructor(target: Window = window) {
    target.addEventListener('keydown', event => {
      // A game key held while an overlay button takes focus (game over, pause) keeps auto-repeating
      // onto that button. Cancel the repeats so releasing the key does not click Start or Resume.
      if (event.repeat && GAME_KEYS.has(event.code)
        && !(event.target instanceof HTMLElement && event.target.closest('input, select, textarea'))) event.preventDefault();
      if (isFormField(event.target)) return;
      if (GAME_KEYS.has(event.code)) event.preventDefault();
      if (!event.repeat) this.pressed.add(event.code);
      this.held.add(event.code);
    });
    target.addEventListener('keyup', event => { this.held.delete(event.code); });
    target.addEventListener('blur', () => { this.held.clear(); this.pressed.clear(); });
  }
  isDown(...codes: string[]): boolean { return codes.some(code => this.held.has(code)); }
  consume(...codes: string[]): boolean {
    const hit = codes.find(code => this.pressed.has(code));
    if (hit) this.pressed.delete(hit);
    return !!hit;
  }
  clear(): void { this.held.clear(); this.pressed.clear(); }
}

export type SwipeDirection = 'left' | 'right' | 'up' | 'down';

export interface PointerHandlers {
  down?(x: number, y: number): void;
  drag?(dx: number, dy: number, x: number, y: number): void;
  up?(): void;
  swipe?(direction: SwipeDirection): void;
  tap?(x: number, y: number): void;
}

/** Unified mouse/touch/pen tracking on one element. Coordinates are element-relative CSS pixels. */
export function trackPointer(el: HTMLElement, handlers: PointerHandlers): void {
  let id: number | null = null;
  let startX = 0, startY = 0, lastX = 0, lastY = 0, startTime = 0;
  const local = (event: PointerEvent) => {
    const rect = el.getBoundingClientRect();
    return [event.clientX - rect.left, event.clientY - rect.top] as const;
  };
  el.addEventListener('pointerdown', event => {
    if (id !== null || (event.pointerType === 'mouse' && event.button !== 0)) return;
    id = event.pointerId;
    try { el.setPointerCapture(event.pointerId); } catch { /* Synthetic events cannot be captured. */ }
    [startX, startY] = local(event);
    [lastX, lastY] = [startX, startY];
    startTime = performance.now();
    handlers.down?.(startX, startY);
  });
  el.addEventListener('pointermove', event => {
    if (event.pointerId !== id) return;
    const [x, y] = local(event);
    handlers.drag?.(x - lastX, y - lastY, x, y);
    [lastX, lastY] = [x, y];
  });
  const end = (event: PointerEvent) => {
    if (event.pointerId !== id) return;
    id = null;
    const dx = lastX - startX;
    const dy = lastY - startY;
    const distance = Math.hypot(dx, dy);
    // A cancelled pointer (the browser took over the touch) is neither a tap nor a swipe.
    if (event.type !== 'pointercancel') {
      if (distance > 28 && performance.now() - startTime < 600) {
        handlers.swipe?.(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
      } else if (distance < 10) {
        handlers.tap?.(startX, startY);
      }
    }
    handlers.up?.();
  };
  el.addEventListener('pointerup', end);
  el.addEventListener('pointercancel', end);
}

/**
 * Focus an overlay button (Start, Resume) only when this page already has the user's attention.
 * Embedded in another page's iframe, focusing on load would pull keyboard focus away from the host page,
 * so Space there would start the game instead of scrolling.
 */
export function focusIfActive(el: HTMLElement): void {
  if (window.top === window || document.hasFocus()) el.focus({ preventScroll: true });
}

/** Calls `pause` when the player leaves: the tab is hidden or focus moves out of the page (e.g. to the host page of an iframe). */
export function onFocusLost(pause: () => void): void {
  window.addEventListener('blur', pause);
  document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
}

/** Best scores in localStorage, validated on read and silent when storage is unavailable. */
export const best = {
  read(key: string): number {
    try {
      const value = Number(localStorage.getItem(key));
      return Number.isFinite(value) && value > 0 ? value : 0;
    } catch {
      return 0;
    }
  },
  submit(key: string, value: number): { best: number; isNew: boolean } {
    const previous = best.read(key);
    if (value <= previous) return { best: previous, isNew: false };
    try { localStorage.setItem(key, String(Math.round(value))); } catch { /* Keep the in-memory result only. */ }
    return { best: value, isNew: true };
  },
};

/**
 * Wires a mute toggle button to `sfx`. After a mouse or touch click the button gives up focus,
 * otherwise Keys would ignore every game key and Space would toggle the sound again.
 */
export function bindSoundButton(button: HTMLButtonElement, sfx: Sfx): void {
  const render = () => {
    button.setAttribute('aria-pressed', String(!sfx.muted));
    button.textContent = sfx.muted ? '♪̸' : '♪';
  };
  render();
  button.addEventListener('click', event => {
    sfx.unlock();
    sfx.setMuted(!sfx.muted);
    render();
    if (event.detail > 0) button.blur();
  });
}

/** Tiny synthesized sound effects. No audio files; silent until a user gesture unlocks the context. */
export class Sfx {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  muted = false;
  constructor(private storageKey = 'g3d-muted') {
    try { this.muted = localStorage.getItem(storageKey) === '1'; } catch { /* default on */ }
  }
  unlock(): void {
    if (this.ctx) { void this.ctx.resume().catch(() => {}); return; }
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    try {
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.5;
      this.master.connect(this.ctx.destination);
    } catch {
      this.ctx = null;
    }
  }
  setMuted(muted: boolean): void {
    this.muted = muted;
    try { localStorage.setItem(this.storageKey, muted ? '1' : '0'); } catch { /* session only */ }
    if (this.master) this.master.gain.value = muted ? 0 : 0.5;
  }
  tone(freq: number, duration = 0.12, options: { type?: OscillatorType; gain?: number; slideTo?: number; delay?: number } = {}): void {
    if (!this.ctx || !this.master || this.muted) return;
    const t = this.ctx.currentTime + (options.delay ?? 0);
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = options.type ?? 'sine';
    osc.frequency.setValueAtTime(freq, t);
    if (options.slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(1, options.slideTo), t + duration);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(options.gain ?? 0.2, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    osc.connect(gain).connect(this.master);
    osc.start(t);
    osc.stop(t + duration + 0.05);
  }
  noise(duration = 0.3, options: { gain?: number; frequency?: number; type?: BiquadFilterType } = {}): void {
    if (!this.ctx || !this.master || this.muted) return;
    const t = this.ctx.currentTime;
    const buffer = this.ctx.createBuffer(1, Math.max(1, Math.floor(this.ctx.sampleRate * duration)), this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = options.type ?? 'lowpass';
    filter.frequency.value = options.frequency ?? 1200;
    const gain = this.ctx.createGain();
    gain.gain.value = options.gain ?? 0.25;
    source.connect(filter).connect(gain).connect(this.master);
    source.start(t);
  }
}

export type Dictionary = Partial<Record<Locale, Translations>>;

/**
 * Registers the game's translations with the shared i18n instance, fills `[data-i18n]` text and
 * `[data-i18n-aria]` labels, and wires the language `<select>`. Returns a translate function.
 */
export function setupI18n(dictionary: Dictionary, select: HTMLSelectElement | null, onChange?: () => void): (key: string, params?: Record<string, string | number>) => string {
  for (const locale of LOCALES) {
    const translations = dictionary[locale];
    if (translations) void i18n.loadTranslations(locale, translations);
  }
  const t = (key: string, params?: Record<string, string | number>) => i18n.t(key, params);
  const apply = (notify = true) => {
    document.querySelectorAll<HTMLElement>('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n!); });
    document.querySelectorAll<HTMLElement>('[data-i18n-aria]').forEach(el => { el.setAttribute('aria-label', t(el.dataset.i18nAria!)); });
    const title = t('game.title');
    if (title !== 'game.title') document.title = `${title} - Awesome Free Games 1000`;
    if (select) select.value = i18n.getLocale();
    if (notify) onChange?.();
  };
  if (select) {
    // Keys ignores keys aimed at a focused select, so a language picked with a mouse or finger hands focus
    // back to the game. Keyboard users keep focus on the select and can keep arrowing through languages.
    let pointerPick = false;
    select.addEventListener('pointerdown', () => { pointerPick = true; });
    select.addEventListener('keydown', () => { pointerPick = false; });
    select.addEventListener('change', () => {
      i18n.setLocale(select.value as Locale);
      if (pointerPick) select.blur();
      pointerPick = false;
    });
  }
  i18n.onLocaleChange(() => apply());
  // The first pass runs before the caller holds `t`, so it does not call back.
  apply(false);
  return t;
}

export const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
/** Frame-rate independent smoothing factor for `lerp(current, target, damp(rate, dt))`. */
export const damp = (rate: number, dt: number) => 1 - Math.exp(-rate * dt);

/** Seeded PRNG (mulberry32) so procedural layouts can be reproduced in tests. */
export function rng(seed = Date.now()): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** True on devices whose primary input is touch, used to show on-screen controls and hints. */
export const prefersTouch = () => typeof matchMedia !== 'undefined' && matchMedia('(hover: none), (pointer: coarse)').matches;

export const prefersReducedMotion = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
