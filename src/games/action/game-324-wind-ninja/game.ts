import { THREE, createStage, createLoop, Keys, trackPointer, clamp, damp, lerp, prefersReducedMotion, type Stage } from '../../../shared/three/kit';
import {
  Sim, ARENAS, STATS, HEX, MAX_DASH, FOCUS_MAX, SPAWN_TIME, AIM_LOCK, BLAST_R, SHIELD_HALF_ARC, SLOW,
  TRAVEL_TIME, HIT_STOP_SCALE, TAU, CAMPAIGN_WAVES, COMBO_TIME, clipDash, wrap,
  type Enemy, type Kind, type SimEvent, type DashPlan, type HurtSource,
} from './logic';

export interface Hud {
  score: number;
  wave: number;
  endless: boolean;
  hearts: number;
  charges: number;
  chargeProgress: number;
  combo: number;
  /** Combo timer left, 0..1. */
  comboLeft: number;
  focus: number;
  /** How far into slow motion the world is, 0..1. */
  slow: number;
}
export interface Result { score: number; wave: number; kills: number; maxCombo: number; bestCut: number; }
export type GameEvent =
  | 'aim' | 'dash' | 'cut' | 'multi' | 'deflect' | 'clang' | 'explode' | 'windup' | 'strike' | 'shoot' | 'spawn' | 'land'
  | 'hurt' | 'charge' | 'denied' | 'cancel' | 'wave' | 'fight' | 'clear' | 'travel' | 'combo' | 'comboDrop' | 'dead' | 'edge';
export interface EventDetail {
  kind?: Kind;
  order?: number;
  kills?: number;
  wave?: number;
  arena?: number;
  intro?: Kind | null;
  endless?: boolean;
  bonus?: number;
  flawless?: boolean;
  healed?: boolean;
  campaign?: boolean;
  combo?: number;
  hearts?: number;
  source?: HurtSource;
  depth?: number;
  harmful?: boolean;
  first?: boolean;
}
export type PopupTone = 'cut' | 'multi' | 'deflect' | 'hurt' | 'bonus';

/** World positions of the three floating islands. The run climbs from one to the next. */
const ISLANDS = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(26, 11, -46), new THREE.Vector3(-22, 22, -92)];
/** Camera elevation: steeper on portrait screens, where the island is framed by its width. */
const PITCH = 0.98;
const PITCH_PORTRAIT = 1.12;
/** World units of aim per world unit of finger drag. */
const TOUCH_GAIN = 1.7;
/** A finger that moved less than this (CSS px) since it went down cancels instead of dashing. */
const TOUCH_DEADZONE = 14;
const KEY_AIM_SPEED = 8;
const DASH_ANIM = 0.09;
/** Characters are drawn a little larger than their hit circles so they read at whole-island zoom. */
const MODEL_SCALE = 1.2;
const ACCENT = new THREE.Color(0x9ef0ff);

interface Palette {
  grass: number[];
  soil: number;
  rock: number;
  pillarTop: number;
  leaf: number;
  skyTop: number;
  skyHorizon: number;
  skyBottom: number;
  cloud: number;
  fog: number;
  sun: number;
  hemiSky: number;
  hemiGround: number;
}
const PALETTES: Palette[] = [
  { grass: [0x86c95a, 0x74b84e, 0x9ad468], soil: 0x8a6446, rock: 0x6f6259, pillarTop: 0x7fb85a, leaf: 0x4f9e4c, skyTop: 0x4f97de, skyHorizon: 0xd6ecff, skyBottom: 0x8fbde6, cloud: 0xffffff, fog: 0xb9d8f3, sun: 0xfff2d8, hemiSky: 0xd3e8ff, hemiGround: 0x60703f },
  { grass: [0xe4aa45, 0xd98a33, 0xeec15a], soil: 0x7b5034, rock: 0x6b5446, pillarTop: 0xd99a3c, leaf: 0xd8622c, skyTop: 0xe38f62, skyHorizon: 0xffe3ba, skyBottom: 0xf0b98c, cloud: 0xfff1df, fog: 0xf4cfa6, sun: 0xffd9a8, hemiSky: 0xffe4c4, hemiGround: 0x6e4a2c },
  { grass: [0x9db8d8, 0xb0a2e0, 0x8db0cc], soil: 0x56506e, rock: 0x47425f, pillarTop: 0xa59ad8, leaf: 0x9a86e0, skyTop: 0x262a62, skyHorizon: 0x9a88c8, skyBottom: 0x454a8c, cloud: 0xd9d4f4, fog: 0x7b77b4, sun: 0xd8d0ff, hemiSky: 0xb8b4f0, hemiGround: 0x3c3658 },
];
/** Cool tint the world takes in slow motion. */
const SLOW_TINT = new THREE.Color(0x6fa8c8);

/** Telegraph quad styles; see the fragment shader. */
const S = { windup: 0, blast: 1, spawn: 2, arc: 3, mark: 4, shock: 5, lane: 6, sight: 7, aim: 8, ghost: 9, land: 10, slash: 11, streak: 12 } as const;

function glowTexture(): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.25, 'rgba(255,255,255,0.6)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 64, 64);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function shadowTexture(): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.55, 'rgba(255,255,255,0.7)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(canvas);
}

const tmpMatrix = new THREE.Matrix4();
const tmpQuat = new THREE.Quaternion();
const tmpEuler = new THREE.Euler();
const tmpPos = new THREE.Vector3();
const tmpScale = new THREE.Vector3();
const tmpColor = new THREE.Color();
const UP = new THREE.Vector3(0, 1, 0);

/** Matrix from a position, Euler rotation and scale. */
function m4(x: number, y: number, z: number, rx = 0, ry = 0, rz = 0, sx = 1, sy = sx, sz = sx): THREE.Matrix4 {
  return new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(sx, sy, sz));
}

type Part = [THREE.BufferGeometry, number, THREE.Matrix4?];
/** Merges coloured parts into one non-indexed geometry with a vertex colour attribute: one draw call per model. */
function merge(parts: Part[]): THREE.BufferGeometry {
  const prepared = parts.map(([geometry, color, matrix]) => {
    const g = geometry.index ? geometry.toNonIndexed() : geometry.clone();
    if (matrix) g.applyMatrix4(matrix);
    return { g, color: new THREE.Color(color) };
  });
  const count = prepared.reduce((n, p) => n + p.g.getAttribute('position').count, 0);
  const position = new Float32Array(count * 3);
  const color = new Float32Array(count * 3);
  let offset = 0;
  for (const { g, color: c } of prepared) {
    const p = g.getAttribute('position');
    for (let i = 0; i < p.count; i++) {
      position.set([p.getX(i), p.getY(i), p.getZ(i)], (offset + i) * 3);
      color.set([c.r, c.g, c.b], (offset + i) * 3);
    }
    offset += p.count;
    g.dispose();
  }
  const merged = new THREE.BufferGeometry();
  merged.setAttribute('position', new THREE.BufferAttribute(position, 3));
  merged.setAttribute('color', new THREE.BufferAttribute(color, 3));
  merged.computeVertexNormals();
  return merged;
}

function enemyGeometry(kind: Kind): THREE.BufferGeometry {
  const eye = new THREE.SphereGeometry(0.07, 6, 4);
  switch (kind) {
    case 'grunt':
      return merge([
        [new THREE.SphereGeometry(0.42, 10, 8), 0xc4503a, m4(0, 0.55, 0, 0, 0, 0, 1, 0.95, 0.95)],
        [new THREE.SphereGeometry(0.3, 8, 6), 0xf0c08e, m4(0, 0.47, 0.2, 0, 0, 0, 1, 0.9, 0.6)],
        [new THREE.ConeGeometry(0.09, 0.32, 5), 0xf6ead0, m4(0.2, 0.98, 0, 0, 0, -0.45)],
        [new THREE.ConeGeometry(0.09, 0.32, 5), 0xf6ead0, m4(-0.2, 0.98, 0, 0, 0, 0.45)],
        [eye, 0xffe14d, m4(0.14, 0.72, 0.35)],
        [eye, 0xffe14d, m4(-0.14, 0.72, 0.35)],
        [new THREE.SphereGeometry(0.12, 6, 4), 0x5e2a20, m4(0.2, 0.1, 0.05)],
        [new THREE.SphereGeometry(0.12, 6, 4), 0x5e2a20, m4(-0.2, 0.1, 0.05)],
        [new THREE.CylinderGeometry(0.11, 0.06, 0.75, 6), 0x7e5636, m4(0.46, 0.66, 0.18, 0.6, 0, -0.2)],
      ]);
    case 'archer':
      return merge([
        [new THREE.CylinderGeometry(0.2, 0.34, 0.85, 8), 0x4f8052, m4(0, 0.44, 0)],
        [new THREE.SphereGeometry(0.21, 8, 6), 0xe6c49c, m4(0, 0.98, 0.02)],
        [new THREE.ConeGeometry(0.29, 0.6, 8), 0x356a3c, m4(0, 1.14, -0.03, -0.12)],
        [eye, 0xfff07a, m4(0.075, 0.99, 0.18, 0, 0, 0, 0.8)],
        [eye, 0xfff07a, m4(-0.075, 0.99, 0.18, 0, 0, 0, 0.8)],
        [new THREE.TorusGeometry(0.45, 0.035, 4, 12, Math.PI), 0x8a5a2e, m4(0.32, 0.62, 0.22, 0, Math.PI / 2, -Math.PI / 2)],
        [new THREE.CylinderGeometry(0.008, 0.008, 0.9, 3), 0xf2ead8, m4(0.32, 0.62, 0.22)],
        [new THREE.BoxGeometry(0.16, 0.5, 0.14), 0x7a5236, m4(-0.08, 0.72, -0.26, 0.3)],
      ]);
    case 'shield':
      return merge([
        [new THREE.SphereGeometry(0.5, 10, 8), 0x58739a, m4(0, 0.62, 0, 0, 0, 0, 1, 1.1, 0.9)],
        [new THREE.SphereGeometry(0.31, 8, 6, 0, TAU, 0, Math.PI / 2), 0xa7b4c4, m4(0, 1.1, 0)],
        [new THREE.BoxGeometry(0.07, 0.2, 0.46), 0xd24a48, m4(0, 1.4, 0)],
        [eye, 0xffe14d, m4(0.11, 1.04, 0.27)],
        [eye, 0xffe14d, m4(-0.11, 1.04, 0.27)],
        [new THREE.BoxGeometry(1.04, 1.02, 0.08), 0x5f6e84, m4(0, 0.62, 0.5)],
        [new THREE.BoxGeometry(0.94, 0.92, 0.12), 0xe6ecf2, m4(0, 0.62, 0.55)],
        [new THREE.CylinderGeometry(0.13, 0.13, 0.08, 8), 0xd4ac48, m4(0, 0.62, 0.63, Math.PI / 2)],
      ]);
    case 'bomber':
      return merge([
        [new THREE.SphereGeometry(0.46, 10, 8), 0x3f3454, m4(0, 0.52, 0)],
        [new THREE.TorusGeometry(0.46, 0.05, 4, 16), 0xe6b642, m4(0, 0.5, 0, Math.PI / 2)],
        [new THREE.CylinderGeometry(0.04, 0.05, 0.3, 5), 0x9a8a68, m4(0, 1.06, 0)],
        [new THREE.SphereGeometry(0.09, 6, 4), 0xff7a2a, m4(0, 1.22, 0)],
        [eye, 0xffffff, m4(0.14, 0.64, 0.38, 0, 0, 0, 1.1)],
        [eye, 0xffffff, m4(-0.14, 0.64, 0.38, 0, 0, 0, 1.1)],
        [new THREE.SphereGeometry(0.12, 6, 4), 0x251d33, m4(0.2, 0.08, 0.06)],
        [new THREE.SphereGeometry(0.12, 6, 4), 0x251d33, m4(-0.2, 0.08, 0.06)],
      ]);
  }
}

function ninjaGeometry(): THREE.BufferGeometry {
  return merge([
    [new THREE.CapsuleGeometry(0.22, 0.36, 4, 10), 0x2c356e, m4(0, 0.5, 0)],
    [new THREE.TorusGeometry(0.225, 0.04, 4, 14), 0x161a38, m4(0, 0.44, 0, Math.PI / 2)],
    [new THREE.SphereGeometry(0.24, 12, 10), 0x2c356e, m4(0, 1.0, 0)],
    [new THREE.TorusGeometry(0.235, 0.035, 4, 16), 0xff5468, m4(0, 1.1, 0, Math.PI / 2 - 0.15)],
    [new THREE.BoxGeometry(0.06, 0.06, 0.2), 0xff5468, m4(0.06, 1.08, -0.3, 0.5, 0.3)],
    [new THREE.BoxGeometry(0.06, 0.06, 0.2), 0xff5468, m4(-0.04, 1.04, -0.3, 0.8, -0.2)],
    [new THREE.BoxGeometry(0.06, 0.22, 0.06), 0x161a38, m4(0.12, 0.98, -0.2, 0, 0, 0.6)],
    [new THREE.BoxGeometry(0.12, 0.1, 0.18), 0x161a38, m4(0.12, 0.06, 0.04)],
    [new THREE.BoxGeometry(0.12, 0.1, 0.18), 0x161a38, m4(-0.12, 0.06, 0.04)],
  ]);
}

function ninjaGlowGeometry(): THREE.BufferGeometry {
  return merge([
    [new THREE.BoxGeometry(0.32, 0.075, 0.08), 0xc4f8ff, m4(0, 1.02, 0.2)],
    [new THREE.BoxGeometry(0.045, 0.82, 0.02), 0xe8fbff, m4(-0.16, 1.12, -0.26, 0, 0, -0.6)],
  ]);
}

/** Pooled additive particles with size attenuation. Sizes are world units; colours fade to black. */
class Sparks {
  readonly points: THREE.Points;
  readonly material: THREE.ShaderMaterial;
  private readonly count = 900;
  private readonly position = new Float32Array(this.count * 3);
  private readonly color = new Float32Array(this.count * 3);
  private readonly base = new Float32Array(this.count * 3);
  private readonly size = new Float32Array(this.count);
  private readonly baseSize = new Float32Array(this.count);
  private readonly velocity = new Float32Array(this.count * 3);
  private readonly life = new Float32Array(this.count);
  private readonly maxLife = new Float32Array(this.count);
  private readonly gravity = new Float32Array(this.count);
  private cursor = 0;
  private live = 0;

  constructor() {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(this.position, 3).setUsage(THREE.DynamicDrawUsage));
    geometry.setAttribute('aColor', new THREE.BufferAttribute(this.color, 3).setUsage(THREE.DynamicDrawUsage));
    geometry.setAttribute('aSize', new THREE.BufferAttribute(this.size, 1).setUsage(THREE.DynamicDrawUsage));
    this.material = new THREE.ShaderMaterial({
      uniforms: { uScale: { value: 400 } },
      vertexShader: /* glsl */`
        attribute vec3 aColor; attribute float aSize; uniform float uScale; varying vec3 vColor;
        void main() {
          vColor = aColor;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = aSize * uScale / max(0.1, -mv.z);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: /* glsl */`
        varying vec3 vColor;
        void main() {
          float d = length(gl_PointCoord - 0.5);
          float a = smoothstep(0.5, 0.1, d);
          gl_FragColor = vec4(vColor * a, a);
        }`,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true,
    });
    this.points = new THREE.Points(geometry, this.material);
    this.points.frustumCulled = false;
  }

  emit(x: number, y: number, z: number, vx: number, vy: number, vz: number, color: THREE.Color, size: number, life: number, gravity = 0): void {
    const i = this.cursor;
    this.cursor = (this.cursor + 1) % this.count;
    const j = i * 3;
    this.position[j] = x; this.position[j + 1] = y; this.position[j + 2] = z;
    this.velocity[j] = vx; this.velocity[j + 1] = vy; this.velocity[j + 2] = vz;
    this.base[j] = color.r; this.base[j + 1] = color.g; this.base[j + 2] = color.b;
    this.baseSize[i] = size;
    this.life[i] = this.maxLife[i] = life;
    this.gravity[i] = gravity;
    this.live = this.count;
  }

  burst(x: number, y: number, z: number, n: number, speed: number, color: THREE.Color, size: number, life: number, gravity = 0, up = 0): void {
    for (let k = 0; k < n; k++) {
      const a = Math.random() * TAU;
      const b = Math.acos(Math.random() * 2 - 1);
      const s = speed * (0.35 + Math.random() * 0.65);
      this.emit(x, y, z, Math.sin(b) * Math.cos(a) * s, Math.abs(Math.cos(b)) * s * 0.7 + up, Math.sin(b) * Math.sin(a) * s,
        color, size * (0.6 + Math.random() * 0.8), life * (0.6 + Math.random() * 0.6), gravity);
    }
  }

  update(dt: number): void {
    if (!this.live) return;
    let alive = 0;
    const drag = Math.exp(-2.4 * dt);
    for (let i = 0; i < this.count; i++) {
      if (this.life[i] <= 0) { this.size[i] = 0; continue; }
      alive++;
      this.life[i] -= dt;
      const k = Math.max(0, this.life[i] / this.maxLife[i]);
      const j = i * 3;
      this.velocity[j] *= drag;
      this.velocity[j + 1] = this.velocity[j + 1] * drag - this.gravity[i] * dt;
      this.velocity[j + 2] *= drag;
      this.position[j] += this.velocity[j] * dt;
      this.position[j + 1] += this.velocity[j + 1] * dt;
      this.position[j + 2] += this.velocity[j + 2] * dt;
      this.color[j] = this.base[j] * k;
      this.color[j + 1] = this.base[j + 1] * k;
      this.color[j + 2] = this.base[j + 2] * k;
      this.size[i] = this.baseSize[i] * (0.4 + 0.6 * k);
    }
    if (!alive) this.live = 0;
    const geometry = this.points.geometry;
    geometry.getAttribute('position').needsUpdate = true;
    geometry.getAttribute('aColor').needsUpdate = true;
    geometry.getAttribute('aSize').needsUpdate = true;
  }

  clear(): void { this.life.fill(0); this.size.fill(0); this.live = 1; }
}

/** Ground telegraphs, aim path, cut markers and slashes: one instanced quad, drawn by style in the shader. */
class Telegraphs {
  readonly mesh: THREE.InstancedMesh;
  readonly material: THREE.ShaderMaterial;
  private readonly cap = 128;
  private readonly style: THREE.InstancedBufferAttribute;
  private readonly progress: THREE.InstancedBufferAttribute;
  private readonly color: THREE.InstancedBufferAttribute;
  private readonly alpha: THREE.InstancedBufferAttribute;
  private readonly size: THREE.InstancedBufferAttribute;
  private n = 0;

  constructor(time: { value: number }, pulse: { value: number }) {
    const geometry = new THREE.PlaneGeometry(2, 2);
    geometry.rotateX(-Math.PI / 2);
    this.style = new THREE.InstancedBufferAttribute(new Float32Array(this.cap), 1);
    this.progress = new THREE.InstancedBufferAttribute(new Float32Array(this.cap), 1);
    this.color = new THREE.InstancedBufferAttribute(new Float32Array(this.cap * 3), 3);
    this.alpha = new THREE.InstancedBufferAttribute(new Float32Array(this.cap), 1);
    this.size = new THREE.InstancedBufferAttribute(new Float32Array(this.cap * 2), 2);
    for (const attribute of [this.style, this.progress, this.color, this.alpha, this.size]) attribute.setUsage(THREE.DynamicDrawUsage);
    geometry.setAttribute('aStyle', this.style);
    geometry.setAttribute('aProgress', this.progress);
    geometry.setAttribute('aColor', this.color);
    geometry.setAttribute('aAlpha', this.alpha);
    geometry.setAttribute('aSize', this.size);
    this.material = new THREE.ShaderMaterial({
      uniforms: { uTime: time, uPulse: pulse },
      transparent: true,
      depthWrite: false,
      vertexShader: /* glsl */`
        attribute float aStyle; attribute float aProgress; attribute vec3 aColor; attribute float aAlpha; attribute vec2 aSize;
        varying vec2 vUv; varying float vStyle; varying float vProgress; varying vec3 vColor; varying float vAlpha; varying vec2 vSize;
        void main() {
          vUv = uv; vStyle = aStyle; vProgress = aProgress; vColor = aColor; vAlpha = aAlpha; vSize = aSize;
          gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: /* glsl */`
        uniform float uTime; uniform float uPulse;
        varying vec2 vUv; varying float vStyle; varying float vProgress; varying vec3 vColor; varying float vAlpha; varying vec2 vSize;
        float band(float x, float a, float b, float s) { return smoothstep(a - s, a, x) * (1.0 - smoothstep(b, b + s, x)); }
        void main() {
          vec2 p = vUv * 2.0 - 1.0;
          float r = length(p);
          float ang = atan(p.y, p.x);
          float sweep = fract((1.5707963 - ang) / 6.2831853);
          float u = vUv.x;
          float v = abs(vUv.y - 0.5) * 2.0;
          int style = int(vStyle + 0.5);
          float a = 0.0;
          vec3 col = vColor;
          if (style == 0) {
            float outline = band(r, 0.8, 0.95, 0.03);
            float fill = outline * step(sweep, vProgress);
            float inner = (1.0 - smoothstep(0.72, 0.8, r)) * 0.22 * vProgress;
            a = outline * 0.35 + fill * 0.65 + inner;
          } else if (style == 1) {
            float pulse = 1.0 - uPulse * 0.35 * (0.5 + 0.5 * sin(uTime * 6.2831853 * (0.8 + 1.4 * vProgress)));
            float disc = (1.0 - smoothstep(0.96, 1.0, r)) * (0.1 + 0.22 * vProgress) * pulse;
            float edge = band(r, 0.9, 0.99, 0.02) * 0.85;
            float timer = band(r, vProgress - 0.05, vProgress, 0.02) * 0.6;
            a = disc + edge + timer;
          } else if (style == 2) {
            float dashes = step(0.5, fract(ang * 0.954930 + uTime * 0.6));
            a = band(r, 0.68, 0.84, 0.03) * (0.35 + 0.5 * dashes) + (1.0 - smoothstep(0.0, 0.7, r)) * 0.25 * vProgress;
          } else if (style == 3) {
            float within = 1.0 - smoothstep(${SHIELD_HALF_ARC.toFixed(4)} - 0.04, ${SHIELD_HALF_ARC.toFixed(4)}, abs(ang));
            a = within * (band(r, 0.55, 0.97, 0.03) * 0.3 + band(r, 0.88, 0.98, 0.02) * 0.8);
          } else if (style == 4) {
            float ringA = band(r, 0.74, 0.88, 0.03);
            float ticks = band(r, 0.88, 1.0, 0.02) * step(0.82, abs(cos(ang * 2.0)));
            a = (ringA + ticks) * 0.95;
          } else if (style == 5) {
            a = band(r, 0.82, 0.98, 0.04) * (1.0 - vProgress) * 0.9;
          } else if (style == 6) {
            float body = (1.0 - smoothstep(0.7, 0.95, v)) * 0.22;
            float fill = step(u, vProgress) * (1.0 - smoothstep(0.7, 0.95, v)) * 0.35;
            float c = fract(u * vSize.x / 0.55 - v * 0.45);
            float chevron = band(c, 0.1, 0.24, 0.04) * (1.0 - smoothstep(0.75, 0.95, v)) * 0.55;
            a = body + fill + chevron * (0.4 + 0.6 * step(u, vProgress));
            a *= smoothstep(0.0, 0.06, u);
          } else if (style == 7) {
            float line = 1.0 - smoothstep(0.25, 0.9, v);
            a = line * mix(0.3, 0.9, step(u, vProgress)) * (1.0 - u * 0.5);
          } else if (style == 8) {
            float core = 1.0 - smoothstep(0.1, 0.55, v);
            float glow = (1.0 - smoothstep(0.3, 1.0, v)) * 0.4;
            float flow = band(fract(u * vSize.x / 0.8 - uTime * 1.6), 0.0, 0.35, 0.08) * (1.0 - smoothstep(0.2, 0.7, v));
            a = (core * 0.75 + glow + flow * 0.35) * smoothstep(0.0, 0.04, u);
            col = mix(vColor, vec3(1.0), core * 0.45);
          } else if (style == 9) {
            float dots = band(fract(u * vSize.x / 0.45), 0.3, 0.6, 0.06);
            a = dots * (1.0 - smoothstep(0.2, 0.7, v)) * 0.45 * (1.0 - u * 0.5);
          } else if (style == 10) {
            a = band(r, 0.66, 0.86, 0.04) * 0.9 + (1.0 - smoothstep(0.12, 0.24, r)) * 0.9;
          } else if (style == 11) {
            float core = pow(max(0.0, 1.0 - v), 2.0);
            a = core * sin(u * 3.1415926) * (1.0 - vProgress);
            col = mix(vColor, vec3(1.0), core);
          } else if (style == 12) {
            a = (1.0 - smoothstep(0.1, 0.9, v)) * u * 0.7;
          }
          a *= vAlpha;
          if (a < 0.004) discard;
          gl_FragColor = vec4(col, clamp(a, 0.0, 1.0));
        }`,
    });
    this.mesh = new THREE.InstancedMesh(geometry, this.material, this.cap);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 2;
    this.mesh.count = 0;
  }

  begin(): void { this.n = 0; }

  /** A ring-like quad centred at (x, y, z) with radius `radius`, its local +x turned to `angle`. */
  ring(style: number, x: number, y: number, z: number, radius: number, progress: number, color: THREE.Color, alpha = 1, angle = 0): void {
    this.push(style, x, y, z, radius, radius, angle, progress, color, alpha, radius * 2, radius * 2);
  }

  /** A strip from (x, z) along `angle` for `length`, `width` wide. */
  lane(style: number, x: number, y: number, z: number, angle: number, length: number, width: number, progress: number, color: THREE.Color, alpha = 1): void {
    if (length <= 0.01) return;
    const cx = x + Math.cos(angle) * length / 2, cz = z + Math.sin(angle) * length / 2;
    this.push(style, cx, y, cz, length / 2, width / 2, angle, progress, color, alpha, length, width);
  }

  private push(style: number, x: number, y: number, z: number, sx: number, sz: number, angle: number, progress: number, color: THREE.Color, alpha: number, w: number, h: number): void {
    if (this.n >= this.cap) return;
    const i = this.n++;
    tmpQuat.setFromAxisAngle(UP, -angle);
    tmpMatrix.compose(tmpPos.set(x, y, z), tmpQuat, tmpScale.set(sx, 1, sz));
    this.mesh.setMatrixAt(i, tmpMatrix);
    this.style.setX(i, style);
    this.progress.setX(i, progress);
    this.color.setXYZ(i, color.r, color.g, color.b);
    this.alpha.setX(i, alpha);
    this.size.setXY(i, w, h);
  }

  end(): void {
    this.mesh.count = this.n;
    this.mesh.instanceMatrix.needsUpdate = true;
    for (const attribute of [this.style, this.progress, this.color, this.alpha, this.size]) attribute.needsUpdate = true;
  }
}

interface EnemyView {
  id: number;
  kind: Kind;
  x: number;
  z: number;
  facing: number;
  state: Enemy['state'];
  t: number;
  dirX: number;
  dirZ: number;
  stagger: number;
  seed: number;
  /** Seconds left of the death animation (0 while alive). */
  dying: number;
  dieX: number;
  dieZ: number;
  flash: number;
  mark: 0 | 1 | 2 | 3;
  sim: Enemy | null;
  /** Menu backdrop only: a looping clock for its little act. */
  clock?: number;
}
interface ArrowView { id: number; x: number; z: number; dx: number; dz: number; }
interface Trail { mesh: THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial>; age: number; }
interface Flash { sprite: THREE.Sprite; age: number; life: number; size: number; }
interface Shock { x: number; y: number; z: number; age: number; life: number; radius: number; color: THREE.Color; }
interface Slash { x: number; z: number; angle: number; age: number; length: number; }
interface Ghost { x: number; z: number; facing: number; age: number; }

type AimSource = 'mouse' | 'touch' | 'keys';
interface Aim {
  source: AimSource;
  /** Island-local aim point. */
  x: number;
  z: number;
  /** Touch: where the finger went down, on the ground and on screen. */
  startX: number;
  startZ: number;
  screenX: number;
  screenY: number;
  /** Touch: the finger has not left the dead zone yet, so a release cancels. */
  dead: boolean;
}

export class GaleCutter {
  onHud: (hud: Hud) => void = () => {};
  onOver: (result: Result) => void = () => {};
  onEvent: (event: GameEvent, detail?: EventDetail) => void = () => {};
  onPopup: (text: string, x: number, y: number, tone: PopupTone) => void = () => {};

  private stage: Stage;
  private keys = new Keys();
  private loop = createLoop((dt, t) => this.frame(dt, t));
  private reducedMotion = prefersReducedMotion();
  private glow = glowTexture();
  private sim: Sim | null = null;
  private state: 'idle' | 'running' | 'paused' | 'dying' | 'over' = 'idle';

  private time = { value: 0 };
  private pulse = { value: 1 };
  private grassUniforms = {
    uTime: { value: 0 },
    uPlayer: { value: new THREE.Vector3(0, 0, 0) },
    uWake: { value: new THREE.Vector4(0, 0, 0, 0) },
    uWakeAge: { value: 10 },
    uGust: { value: 0 },
  };
  private skyUniforms = {
    uTop: { value: new THREE.Color() },
    uHorizon: { value: new THREE.Color() },
    uBottom: { value: new THREE.Color() },
  };
  private seaUniforms = {
    uTime: this.time,
    uDeep: { value: new THREE.Color() },
    uCloud: { value: new THREE.Color() },
  };
  private fog = new THREE.Fog(0xb9d8f3, 40, 150);
  private hemi = new THREE.HemisphereLight(0xd3e8ff, 0x60703f, 1.5);
  private sun = new THREE.DirectionalLight(0xfff2d8, 2.2);
  private tint = 0;
  private colorA = new THREE.Color();
  private colorB = new THREE.Color();

  private telegraphs = new Telegraphs(this.time, this.pulse);
  private sparks = new Sparks();
  private enemyMeshes = {} as Record<Kind, THREE.InstancedMesh>;
  private shadows!: THREE.InstancedMesh;
  private arrowsMesh!: THREE.InstancedMesh;
  private ghostMesh!: THREE.InstancedMesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>;
  private winds!: THREE.InstancedMesh;
  private windState: Array<{ x: number; y: number; z: number; speed: number; length: number }> = [];
  private clouds!: THREE.InstancedMesh;
  private cloudState: Array<{ base: THREE.Vector3; scale: number; drift: number }> = [];
  private player = new THREE.Group();
  private playerBody!: THREE.Mesh<THREE.BufferGeometry, THREE.MeshLambertMaterial>;
  private playerGlow!: THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>;
  private scarf!: THREE.Mesh<THREE.BufferGeometry, THREE.MeshLambertMaterial>;
  private scarfPoints: THREE.Vector3[] = [];
  private ring!: THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial>;
  private trails: Trail[] = [];
  private flashes: Flash[] = [];
  private shocks: Shock[] = [];
  private slashes: Slash[] = [];
  private ghosts: Ghost[] = [];

  private views = new Map<number, EnemyView>();
  private dyingViews: EnemyView[] = [];
  private decor: EnemyView[] = [];
  private arrowViews = new Map<number, ArrowView>();

  // Input.
  private aim: Aim | null = null;
  private pendingDash: { x: number; z: number } | null = null;
  private pointerType = 'mouse';
  private pointerCancelled = false;
  private raycaster = new THREE.Raycaster();
  private ndc = new THREE.Vector2();
  private plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  private hit = new THREE.Vector3();
  private lastPlan: DashPlan | null = null;
  private planTimer = 0;

  // Presentation state.
  private playerPos = new THREE.Vector3();
  private playerFacing = -Math.PI / 2;
  private dashAnim: { fromX: number; fromZ: number; toX: number; toZ: number; t: number } | null = null;
  private travel: { from: number; to: number; fromPos: THREE.Vector3; toPos: THREE.Vector3 } | null = null;
  private hurtFlash = 0;
  private deniedFlash = 0;
  private chargePulse = 0;
  private shake = 0;
  private kick = new THREE.Vector2();
  private dyingTime = 0;
  private hudTimer = 0;
  private visualTime = 0;
  private idleTime = 0;
  private gust = 0;
  private wakeAge = 10;
  private firstClang = true;
  private camTarget = new THREE.Vector3();
  private camDist = 30;
  private camPitch = 0.7;
  private camYaw = 0;
  private cameraSnap = true;
  private fits = [24, 24, 24];
  private fitPoints: THREE.Vector3[][] = [];
  private fitCamera = new THREE.PerspectiveCamera();
  private insets = { top: 72, right: 12, bottom: 64, left: 12 };
  private width = 1;
  private height = 1;
  private wide = false;
  private appliedOffset = '';

  static create(host: HTMLElement): GaleCutter | null {
    const stage = createStage(host, { fov: 40, near: 0.5, far: 520, maxPixelRatio: 1.75 });
    return stage ? new GaleCutter(host, stage) : null;
  }

  private constructor(host: HTMLElement, stage: Stage) {
    this.stage = stage;
    this.pulse.value = this.reducedMotion ? 0 : 1;
    this.buildScene();
    stage.onResize((width, height) => this.layout(width, height));
    host.addEventListener('pointerdown', event => {
      this.pointerType = event.pointerType || 'mouse';
      this.pointerCancelled = false;
      if (event.pointerType === 'mouse' && event.button === 2) this.cancelAim();
    }, { capture: true });
    host.addEventListener('pointercancel', () => { this.pointerCancelled = true; }, { capture: true });
    host.addEventListener('contextmenu', event => event.preventDefault());
    trackPointer(host, {
      down: (x, y) => this.pointerDown(x, y),
      drag: (_dx, _dy, x, y) => this.pointerMove(x, y),
      up: () => this.pointerUp(),
    });
    this.stageDecor();
    this.loop.start();
  }

  get status() { return this.state; }
  /** Draw calls of the last frame, for the performance budget. */
  get drawCalls() { return this.stage.renderer.info.render.calls; }
  /** The running simulation, for automated checks. */
  get simulation(): Sim | null { return this.sim; }

  /** Screen areas covered by the HUD, in CSS pixels: the island is framed inside the rest. */
  setInsets(insets: { top: number; right: number; bottom: number; left: number }): void {
    const same = (['top', 'right', 'bottom', 'left'] as const).every(k => Math.abs(this.insets[k] - insets[k]) < 0.5);
    if (same) return;
    this.insets = { ...insets };
    this.layout(this.width, this.height);
  }

  // ---------------------------------------------------------------- scene

  private buildScene(): void {
    const { scene } = this.stage;
    scene.fog = this.fog;
    this.sun.position.set(-14, 30, 18);
    scene.add(this.hemi, this.sun, this.sun.target);
    this.buildSky();
    this.buildIslands();
    this.buildClouds();
    this.buildWind();
    this.buildPlayer();
    this.buildEnemies();
    scene.add(this.telegraphs.mesh, this.sparks.points);
    for (let i = 0; i < 3; i++) {
      const material = new THREE.ShaderMaterial({
        uniforms: { uAge: { value: 1 }, uColor: { value: ACCENT.clone() } },
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        vertexShader: /* glsl */`
          varying vec2 vUv;
          void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
        fragmentShader: /* glsl */`
          uniform float uAge; uniform vec3 uColor; varying vec2 vUv;
          void main() {
            float across = 1.0 - abs(vUv.y - 0.5) * 2.0;
            float a = pow(across, 1.6) * smoothstep(0.0, 0.7, vUv.x) * (1.0 - uAge);
            gl_FragColor = vec4(mix(uColor, vec3(1.0), across * across * 0.6), a * 0.9);
          }`,
      });
      // Two crossed ribbons, one flat and one upright, stretched along the dash.
      const flat = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
      const upright = new THREE.PlaneGeometry(1, 1);
      const geometry = new THREE.BufferGeometry();
      const pos = [...(flat.toNonIndexed().getAttribute('position').array as Float32Array), ...(upright.toNonIndexed().getAttribute('position').array as Float32Array)];
      const uv = [...(flat.toNonIndexed().getAttribute('uv').array as Float32Array), ...(upright.toNonIndexed().getAttribute('uv').array as Float32Array)];
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
      const mesh = new THREE.Mesh(geometry, material);
      mesh.visible = false;
      mesh.frustumCulled = false;
      scene.add(mesh);
      this.trails.push({ mesh, age: 1 });
    }
    for (let i = 0; i < 4; i++) {
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.glow, color: 0xffb060, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, fog: false }));
      sprite.visible = false;
      scene.add(sprite);
      this.flashes.push({ sprite, age: 1, life: 1, size: 1 });
    }
    this.applyPalette(0, 0, true);
  }

  private buildSky(): void {
    const sky = new THREE.Mesh(
      new THREE.SphereGeometry(400, 24, 16),
      new THREE.ShaderMaterial({
        uniforms: this.skyUniforms,
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
        vertexShader: /* glsl */`
          varying vec3 vDir;
          void main() { vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
        fragmentShader: /* glsl */`
          uniform vec3 uTop; uniform vec3 uHorizon; uniform vec3 uBottom; varying vec3 vDir;
          void main() {
            float y = vDir.y;
            vec3 c = y > 0.0 ? mix(uHorizon, uTop, pow(y, 0.6)) : mix(uHorizon, uBottom, pow(-y, 0.5));
            gl_FragColor = vec4(c, 1.0);
          }`,
      }),
    );
    sky.renderOrder = -2;
    sky.frustumCulled = false;
    this.stage.scene.add(sky);

    // A sea of cloud far below the islands.
    const sea = new THREE.Mesh(
      new THREE.PlaneGeometry(900, 900, 1, 1).rotateX(-Math.PI / 2),
      new THREE.ShaderMaterial({
        uniforms: this.seaUniforms,
        depthWrite: false,
        transparent: true,
        vertexShader: /* glsl */`
          varying vec2 vXZ; varying float vDist;
          void main() {
            vec4 world = modelMatrix * vec4(position, 1.0);
            vXZ = world.xz;
            vec4 mv = viewMatrix * world;
            vDist = -mv.z;
            gl_Position = projectionMatrix * mv;
          }`,
        fragmentShader: /* glsl */`
          uniform float uTime; uniform vec3 uDeep; uniform vec3 uCloud; varying vec2 vXZ; varying float vDist;
          float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
          float noise(vec2 p) {
            vec2 i = floor(p), f = fract(p);
            vec2 u = f * f * (3.0 - 2.0 * f);
            return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
          }
          void main() {
            vec2 p = vXZ * 0.035 + vec2(uTime * 0.012, uTime * 0.004);
            float n = noise(p) * 0.55 + noise(p * 2.1 + 3.7) * 0.3 + noise(p * 4.3 - 1.3) * 0.15;
            float puff = smoothstep(0.38, 0.72, n);
            vec3 c = mix(uDeep, uCloud, puff * 0.85);
            float fade = 1.0 - smoothstep(180.0, 420.0, vDist);
            gl_FragColor = vec4(c, fade);
          }`,
      }),
    );
    sea.position.set(0, -34, -40);
    sea.renderOrder = -1;
    this.stage.scene.add(sea);
  }

  private buildIslands(): void {
    const { scene } = this.stage;
    const capShape = new THREE.Shape();
    for (let k = 0; k < 6; k++) {
      const a = (k * Math.PI) / 3;
      const r = HEX * 0.965;
      if (k === 0) capShape.moveTo(Math.cos(a) * r, Math.sin(a) * r);
      else capShape.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    capShape.closePath();
    const capGeometry = new THREE.ExtrudeGeometry(capShape, { depth: 0.12, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.05, bevelSegments: 1 });
    capGeometry.rotateX(Math.PI / 2);
    capGeometry.translate(0, -0.05, 0);
    const bodyGeometry = new THREE.CylinderGeometry(HEX * 0.93, HEX * 0.88, 1, 6, 1);
    bodyGeometry.rotateY(Math.PI / 2);
    bodyGeometry.translate(0, -0.5, 0);
    const rootGeometry = new THREE.ConeGeometry(HEX * 0.9, 1, 6, 1);
    rootGeometry.rotateY(Math.PI / 2);
    rootGeometry.rotateX(Math.PI);
    rootGeometry.translate(0, -0.5, 0);

    let tiles = 0, walls = 0;
    for (const a of ARENAS) { tiles += a.tiles.length; walls += a.walls.length; }
    const lambert = (flat = true) => new THREE.MeshLambertMaterial({ flatShading: flat, vertexColors: false });
    const caps = new THREE.InstancedMesh(capGeometry, lambert(), tiles + walls);
    const bodies = new THREE.InstancedMesh(bodyGeometry, lambert(), tiles + walls);
    const roots = new THREE.InstancedMesh(rootGeometry, lambert(), tiles + walls);
    // Trees grow on some of the pillars.
    const tree = merge([
      [new THREE.CylinderGeometry(0.07, 0.11, 0.6, 5), 0x6a4a36, m4(0, 0.3, 0)],
      [new THREE.ConeGeometry(0.5, 0.8, 6), 0xffffff, m4(0, 0.9, 0)],
      [new THREE.ConeGeometry(0.38, 0.65, 6), 0xffffff, m4(0, 1.32, 0, 0, 0.5)],
    ]);
    const trees = new THREE.InstancedMesh(tree, new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }), walls);
    // Grass: crossed blades, bent by wind, the player and the wake of each dash.
    const blade = merge([
      [new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute([-0.05, 0, 0, 0.05, 0, 0, 0, 0.34, 0], 3)), 0xffffff],
      [new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute([0, 0, -0.05, 0, 0, 0.05, 0, 0.3, 0.01], 3)), 0xffffff],
    ]);
    const bladeColor = blade.getAttribute('color') as THREE.BufferAttribute;
    const bladePos = blade.getAttribute('position') as THREE.BufferAttribute;
    for (let i = 0; i < bladeColor.count; i++) {
      const k = 0.55 + 0.45 * (bladePos.getY(i) / 0.34);
      bladeColor.setXYZ(i, k, k, k);
    }
    const grassMaterial = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide });
    grassMaterial.onBeforeCompile = shader => {
      Object.assign(shader.uniforms, this.grassUniforms);
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', /* glsl */`#include <common>
          uniform float uTime; uniform vec3 uPlayer; uniform vec4 uWake; uniform float uWakeAge; uniform float uGust;`)
        .replace('#include <begin_vertex>', /* glsl */`#include <begin_vertex>
          #ifdef USE_INSTANCING
          vec3 root = vec3(instanceMatrix[3][0], instanceMatrix[3][1], instanceMatrix[3][2]);
          float h = clamp(position.y / 0.34, 0.0, 1.0);
          vec2 bend = vec2(sin(uTime * 1.7 + root.x * 0.6 + root.z * 0.4), cos(uTime * 1.3 + root.z * 0.7 + root.x * 0.2)) * 0.06;
          bend.x += uGust * 0.16 * (0.7 + 0.3 * sin(uTime * 3.0 + root.z));
          vec2 away = root.xz - uPlayer.xz;
          float d = length(away);
          bend += away / max(d, 0.001) * 0.2 * (1.0 - smoothstep(0.25, 0.9, d)) * step(abs(root.y - uPlayer.y), 1.0);
          vec2 wa = uWake.xy, wb = uWake.zw, ab = wb - wa;
          float wt = clamp(dot(root.xz - wa, ab) / max(dot(ab, ab), 0.0001), 0.0, 1.0);
          vec2 off = root.xz - (wa + ab * wt);
          float wd = length(off);
          bend += off / max(wd, 0.001) * 0.28 * (1.0 - smoothstep(0.15, 1.1, wd)) * exp(-uWakeAge * 2.2) * step(abs(root.y - uPlayer.y), 1.0);
          transformed.xz += bend * h * h / max(0.4, instanceMatrix[1][1]);
          #endif`);
    };
    const bladesPerTile = 9;
    const grass = new THREE.InstancedMesh(blade, grassMaterial, tiles * bladesPerTile);

    let ci = 0, wi = 0, gi = 0;
    const random = (() => { let s = 4242; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; })();
    ARENAS.forEach((arena, index) => {
      const origin = ISLANDS[index];
      const palette = PALETTES[index];
      const radius = Math.max(arena.bounds.maxX, arena.bounds.maxZ);
      for (const tile of arena.tiles) {
        const x = origin.x + tile.x, z = origin.z + tile.z;
        const lift = (random() - 0.5) * 0.05;
        caps.setMatrixAt(ci, m4(x, origin.y + lift, z, 0, 0, 0, 1));
        caps.setColorAt(ci, tmpColor.set(palette.grass[Math.floor(random() * palette.grass.length)]).multiplyScalar(0.92 + random() * 0.12));
        const depth = 0.55 + random() * 0.35;
        bodies.setMatrixAt(ci, m4(x, origin.y + lift - 0.1, z, 0, 0, 0, 1, depth, 1));
        bodies.setColorAt(ci, tmpColor.set(palette.soil).multiplyScalar(0.85 + random() * 0.25));
        const centre = 1 - Math.min(1, Math.hypot(tile.x, tile.z) / (radius + 1));
        const rootDepth = 1.2 + centre * 5 + random() * 1.6;
        roots.setMatrixAt(ci, m4(x, origin.y + lift - 0.1 - depth, z, 0, 0, 0, 1, rootDepth, 1));
        roots.setColorAt(ci, tmpColor.set(palette.rock).multiplyScalar(0.8 + random() * 0.3));
        ci++;
        for (let b = 0; b < bladesPerTile; b++) {
          const a = random() * TAU, r = Math.sqrt(random()) * HEX * 0.7;
          const s = 0.7 + random() * 0.7;
          grass.setMatrixAt(gi, m4(x + Math.cos(a) * r, origin.y + lift + 0.06, z + Math.sin(a) * r, 0, 0, 0, 1, s, 1));
          const flower = random() < 0.05;
          grass.setColorAt(gi, flower ? tmpColor.setHSL(random(), 0.7, 0.75) : tmpColor.set(palette.grass[Math.floor(random() * palette.grass.length)]).multiplyScalar(0.8 + random() * 0.3));
          gi++;
        }
      }
      for (const wall of arena.walls) {
        const x = origin.x + wall.x, z = origin.z + wall.z;
        const height = 0.5 + random() * 1.4;
        caps.setMatrixAt(ci, m4(x, origin.y + height, z, 0, 0, 0, 1));
        caps.setColorAt(ci, tmpColor.set(palette.pillarTop).multiplyScalar(0.85 + random() * 0.2));
        bodies.setMatrixAt(ci, m4(x, origin.y + height - 0.1, z, 0, 0, 0, 1, height + 0.9, 1));
        bodies.setColorAt(ci, tmpColor.set(palette.rock).multiplyScalar(0.95 + random() * 0.25));
        roots.setMatrixAt(ci, m4(x, origin.y - 0.9, z, 0, 0, 0, 1, 1 + random() * 2.5, 1));
        roots.setColorAt(ci, tmpColor.set(palette.rock).multiplyScalar(0.8 + random() * 0.3));
        ci++;
        if (random() < 0.55) {
          const s = 0.8 + random() * 0.6;
          trees.setMatrixAt(wi, m4(x + (random() - 0.5) * 0.3, origin.y + height + 0.05, z + (random() - 0.5) * 0.3, 0, random() * TAU, 0, s));
          trees.setColorAt(wi, tmpColor.set(palette.leaf).multiplyScalar(0.85 + random() * 0.3));
          wi++;
        }
      }
    });
    caps.count = bodies.count = roots.count = ci;
    trees.count = wi;
    grass.count = gi;
    for (const mesh of [caps, bodies, roots, trees, grass]) {
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      mesh.frustumCulled = false;
      scene.add(mesh);
    }

    // Camera framing: the outline of each island, at the feet and at head height of anything standing on it.
    this.fitPoints = ARENAS.map((arena, index) => {
      const points: THREE.Vector3[] = [];
      for (const tile of arena.tiles) {
        if (!tile.rim) continue;
        for (let k = 0; k < 6; k++) {
          const a = (k * Math.PI) / 3;
          for (const y of [0, 1.5]) points.push(new THREE.Vector3(tile.x + Math.cos(a) * HEX, y, tile.z + Math.sin(a) * HEX).add(ISLANDS[index]));
        }
      }
      return points;
    });
  }

  private buildClouds(): void {
    const geometry = new THREE.IcosahedronGeometry(1, 1);
    const material = new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true, emissive: 0x6a7a8a, emissiveIntensity: 0.35 });
    const count = 70;
    this.clouds = new THREE.InstancedMesh(geometry, material, count);
    const random = (() => { let s = 99; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; })();
    for (let i = 0; i < count; i++) {
      const island = ISLANDS[i % 3];
      const cluster = new THREE.Vector3(island.x + (random() - 0.5) * 40, island.y - 6 - random() * 14, island.z + (random() - 0.5) * 34);
      for (let k = 0; k < 1; k++) {
        this.cloudState.push({ base: cluster, scale: 1.2 + random() * 2.4, drift: random() * TAU });
      }
    }
    this.clouds.frustumCulled = false;
    this.stage.scene.add(this.clouds);
    this.updateClouds(0);
  }

  private updateClouds(t: number): void {
    this.cloudState.forEach((cloud, i) => {
      const x = cloud.base.x + Math.sin(t * 0.03 + cloud.drift) * 3;
      tmpMatrix.compose(tmpPos.set(x, cloud.base.y + Math.sin(t * 0.2 + cloud.drift) * 0.3, cloud.base.z), tmpQuat.identity(), tmpScale.set(cloud.scale * 1.6, cloud.scale * 0.8, cloud.scale));
      this.clouds.setMatrixAt(i, tmpMatrix);
    });
    this.clouds.instanceMatrix.needsUpdate = true;
  }

  private buildWind(): void {
    const geometry = new THREE.PlaneGeometry(1, 0.05).rotateX(-Math.PI / 2.4);
    const material = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35, depthWrite: false, fog: false });
    const count = 28;
    this.winds = new THREE.InstancedMesh(geometry, material, count);
    for (let i = 0; i < count; i++) this.windState.push({ x: (Math.random() - 0.5) * 30, y: 0.4 + Math.random() * 4, z: (Math.random() - 0.5) * 22, speed: 5 + Math.random() * 5, length: 1.2 + Math.random() * 2.5 });
    this.winds.frustumCulled = false;
    this.stage.scene.add(this.winds);
  }

  private buildPlayer(): void {
    this.playerBody = new THREE.Mesh(ninjaGeometry(), new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true, emissive: 0x000000 }));
    this.playerGlow = new THREE.Mesh(ninjaGlowGeometry(), new THREE.MeshBasicMaterial({ vertexColors: true }));
    this.player.add(this.playerBody, this.playerGlow);
    this.stage.scene.add(this.player);

    const segments = 9;
    const scarfGeometry = new THREE.BufferGeometry();
    scarfGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array((segments + 1) * 2 * 3), 3).setUsage(THREE.DynamicDrawUsage));
    const index: number[] = [];
    for (let i = 0; i < segments; i++) index.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
    scarfGeometry.setIndex(index);
    this.scarf = new THREE.Mesh(scarfGeometry, new THREE.MeshLambertMaterial({ color: 0xff5468, side: THREE.DoubleSide, emissive: 0x501018 }));
    this.scarf.frustumCulled = false;
    this.stage.scene.add(this.scarf);
    for (let i = 0; i <= segments; i++) this.scarfPoints.push(new THREE.Vector3(0, 1, i * 0.12));

    this.ring = new THREE.Mesh(
      new THREE.PlaneGeometry(2, 2).rotateX(-Math.PI / 2),
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        uniforms: {
          uCharges: { value: 3 }, uProgress: { value: 0 }, uFocus: { value: 1 }, uAiming: { value: 0 },
          uDenied: { value: 0 }, uPulse: { value: 0 }, uGrace: { value: 0 }, uColor: { value: ACCENT.clone() },
        },
        vertexShader: /* glsl */`
          varying vec2 vUv;
          void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
        fragmentShader: /* glsl */`
          uniform float uCharges; uniform float uProgress; uniform float uFocus; uniform float uAiming;
          uniform float uDenied; uniform float uPulse; uniform float uGrace; uniform vec3 uColor;
          varying vec2 vUv;
          float band(float x, float a, float b, float s) { return smoothstep(a - s, a, x) * (1.0 - smoothstep(b, b + s, x)); }
          void main() {
            vec2 p = vUv * 2.0 - 1.0;
            float r = length(p);
            float ang = atan(p.x, p.y);
            float f = fract(ang / 6.2831853 + 1.0);
            float seg = floor(f * 3.0);
            float local = fract(f * 3.0);
            float gap = band(local, 0.06, 0.94, 0.02);
            float pips = band(r, 0.72, 0.9, 0.03) * gap;
            float full = step(seg + 0.5, uCharges);
            float growing = step(abs(seg - uCharges), 0.1) * step(local, uProgress);
            vec3 red = vec3(1.0, 0.35, 0.35);
            vec3 c = mix(uColor, red, uDenied);
            float a = pips * (0.22 + 0.7 * full + 0.4 * growing + uPulse * 0.3 * full);
            vec3 col = mix(vec3(0.85, 0.92, 1.0), c, max(full, growing));
            float focus = band(r, 0.58, 0.66, 0.02) * step(f, uFocus) * uAiming;
            col = mix(col, vec3(1.0, 0.95, 0.75), focus);
            a = max(a, focus * 0.8);
            float grace = band(r, 0.9, 1.0, 0.04) * uGrace * 0.5;
            a = max(a, grace);
            if (a < 0.01) discard;
            gl_FragColor = vec4(col, a);
          }`,
      }),
    );
    this.ring.renderOrder = 3;
    this.stage.scene.add(this.ring);
  }

  private buildEnemies(): void {
    const material = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
    for (const kind of ['grunt', 'archer', 'shield', 'bomber'] as Kind[]) {
      const mesh = new THREE.InstancedMesh(enemyGeometry(kind), material, 18);
      mesh.setColorAt(0, tmpColor.set(0xffffff));
      mesh.count = 0;
      mesh.frustumCulled = false;
      this.enemyMeshes[kind] = mesh;
      this.stage.scene.add(mesh);
    }
    const shadow = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
    this.shadows = new THREE.InstancedMesh(shadow, new THREE.MeshBasicMaterial({ color: 0x0a1020, alphaMap: shadowTexture(), transparent: true, opacity: 0.32, depthWrite: false }), 48);
    this.shadows.frustumCulled = false;
    this.shadows.renderOrder = 1;
    this.stage.scene.add(this.shadows);
    const arrow = merge([
      [new THREE.CylinderGeometry(0.02, 0.02, 0.7, 4), 0xf4e6c8, m4(0, 0, 0, 0, 0, Math.PI / 2)],
      [new THREE.ConeGeometry(0.06, 0.18, 4), 0xff4d3a, m4(0.42, 0, 0, 0, 0, -Math.PI / 2)],
      [new THREE.BoxGeometry(0.14, 0.01, 0.1), 0xffd36a, m4(-0.3, 0, 0)],
    ]);
    this.arrowsMesh = new THREE.InstancedMesh(arrow, new THREE.MeshBasicMaterial({ vertexColors: true }), 32);
    this.arrowsMesh.count = 0;
    this.arrowsMesh.frustumCulled = false;
    this.stage.scene.add(this.arrowsMesh);
    this.ghostMesh = new THREE.InstancedMesh(ninjaGeometry(), new THREE.MeshBasicMaterial({ color: 0x9ef0ff, transparent: true, opacity: 0.35, depthWrite: false }), 8);
    this.ghostMesh.count = 0;
    this.ghostMesh.frustumCulled = false;
    this.stage.scene.add(this.ghostMesh);
  }

  /** The menu backdrop: a ninja surrounded by the four foes on the first island. */
  private stageDecor(): void {
    this.decor = ([['grunt', 2.4, -1.6], ['archer', -3.2, -2.6], ['shield', -2.2, 1.6], ['bomber', 2.9, 1.9], ['grunt', 0.6, -3.6]] as Array<[Kind, number, number]>)
      .map(([kind, x, z], i) => ({
        id: -1 - i, kind, x, z, facing: Math.atan2(-z, -x), state: 'move' as const, t: 0, dirX: 1, dirZ: 0, stagger: 0,
        seed: i * 1.7, dying: 0, dieX: 0, dieZ: 0, flash: 0, mark: 0 as const, sim: null,
      }));
    this.playerPos.set(0, 0, 0);
    this.playerFacing = -Math.PI / 2;
  }

  // ---------------------------------------------------------------- lifecycle

  start(): void {
    this.sim = new Sim(Date.now());
    this.sim.hitStops = !this.reducedMotion;
    this.views.clear();
    this.dyingViews = [];
    this.arrowViews.clear();
    this.decor = [];
    this.sparks.clear();
    for (const trail of this.trails) { trail.age = 1; trail.mesh.visible = false; }
    this.flashes.forEach(f => { f.age = f.life; f.sprite.visible = false; });
    this.shocks = [];
    this.slashes = [];
    this.ghosts = [];
    this.aim = null;
    this.pendingDash = null;
    this.lastPlan = null;
    this.dashAnim = null;
    this.travel = null;
    this.hurtFlash = this.deniedFlash = this.shake = 0;
    this.dyingTime = 0;
    this.firstClang = true;
    this.playerBody.rotation.set(0, 0, 0);
    this.player.visible = this.scarf.visible = true;
    this.keys.clear();
    const start = this.sim.arena.start;
    this.playerPos.set(start.x, 0, start.z);
    this.playerFacing = -Math.PI / 2;
    this.resetScarf();
    this.state = 'running';
    // The constructor queued the first wave's announcement.
    for (const event of this.sim.events) this.handle(event);
    this.emitHud();
  }

  pause(): void {
    if (this.state !== 'running') return;
    this.state = 'paused';
    this.aim = null;
    this.pendingDash = null;
  }

  resume(): void {
    if (this.state !== 'paused') return;
    this.keys.clear();
    this.aim = null;
    this.state = 'running';
  }

  // ---------------------------------------------------------------- input

  private island(): THREE.Vector3 { return ISLANDS[this.sim ? this.sim.arenaIndex : 0]; }

  /** The island-local ground point under a screen position, or null. */
  private groundAt(x: number, y: number): { x: number; z: number } | null {
    const camera = this.stage.camera;
    this.ndc.set((x / this.width) * 2 - 1, -(y / this.height) * 2 + 1);
    this.raycaster.setFromCamera(this.ndc, camera);
    const island = this.island();
    this.plane.constant = -island.y;
    if (!this.raycaster.ray.intersectPlane(this.plane, this.hit)) return null;
    return { x: this.hit.x - island.x, z: this.hit.z - island.z };
  }

  private canAim(): boolean {
    const sim = this.sim;
    return this.state === 'running' && !!sim && sim.phase !== 'travel' && sim.phase !== 'dead';
  }

  private pointerDown(x: number, y: number): void {
    if (!this.canAim() || this.aim) return;
    const g = this.groundAt(x, y);
    if (!g) return;
    const touch = this.pointerType !== 'mouse';
    const p = this.sim!.player;
    this.aim = { source: touch ? 'touch' : 'mouse', x: touch ? p.x : g.x, z: touch ? p.z : g.z, startX: g.x, startZ: g.z, screenX: x, screenY: y, dead: touch };
    this.planTimer = 0;
    this.onEvent('aim');
  }

  private pointerMove(x: number, y: number): void {
    const aim = this.aim;
    if (!aim || aim.source === 'keys') return;
    const g = this.groundAt(x, y);
    if (!g) return;
    if (aim.source === 'mouse') { aim.x = g.x; aim.z = g.z; return; }
    const p = this.sim!.player;
    aim.dead = Math.hypot(x - aim.screenX, y - aim.screenY) < TOUCH_DEADZONE;
    let vx = (g.x - aim.startX) * TOUCH_GAIN, vz = (g.z - aim.startZ) * TOUCH_GAIN;
    const len = Math.hypot(vx, vz);
    if (len > MAX_DASH) { vx *= MAX_DASH / len; vz *= MAX_DASH / len; }
    aim.x = p.x + vx;
    aim.z = p.z + vz;
  }

  private pointerUp(): void {
    const aim = this.aim;
    if (!aim || aim.source === 'keys') return;
    this.aim = null;
    if (this.pointerCancelled || !this.canAim()) return;
    if (aim.source === 'touch' && aim.dead) { this.onEvent('cancel'); return; }
    this.pendingDash = { x: aim.x, z: aim.z };
  }

  private cancelAim(): void {
    if (!this.aim) return;
    this.aim = null;
    this.onEvent('cancel');
  }

  /** Keyboard: Space holds an aim that starts on the best target; arrows or WASD move it; releasing Space dashes. */
  private keyboard(dt: number): void {
    const sim = this.sim!;
    const k = this.keys;
    const ax = (k.isDown('ArrowRight', 'KeyD') ? 1 : 0) - (k.isDown('ArrowLeft', 'KeyA') ? 1 : 0);
    const az = (k.isDown('ArrowDown', 'KeyS') ? 1 : 0) - (k.isDown('ArrowUp', 'KeyW') ? 1 : 0);
    if (!this.aim && k.consume('Space') && this.canAim()) {
      const p = sim.player;
      let target = ax || az ? { x: p.x + (ax / Math.hypot(ax, az)) * MAX_DASH, z: p.z + (az / Math.hypot(ax, az)) * MAX_DASH } : this.autoTarget();
      if (!target) target = { x: p.x + Math.cos(p.facing) * MAX_DASH, z: p.z + Math.sin(p.facing) * MAX_DASH };
      this.aim = { source: 'keys', x: target.x, z: target.z, startX: 0, startZ: 0, screenX: 0, screenY: 0, dead: false };
      this.planTimer = 0;
      this.onEvent('aim');
    }
    const aim = this.aim;
    if (!aim || aim.source !== 'keys') return;
    if (!k.isDown('Space')) {
      this.aim = null;
      if (this.canAim()) this.pendingDash = { x: aim.x, z: aim.z };
      return;
    }
    const p = sim.player;
    if (ax || az) {
      const l = Math.hypot(ax, az);
      aim.x += (ax / l) * KEY_AIM_SPEED * dt;
      aim.z += (az / l) * KEY_AIM_SPEED * dt;
    }
    let vx = aim.x - p.x, vz = aim.z - p.z;
    const len = Math.hypot(vx, vz);
    if (len > MAX_DASH) { vx *= MAX_DASH / len; vz *= MAX_DASH / len; aim.x = p.x + vx; aim.z = p.z + vz; }
  }

  /** The aim point that cuts the most, for a keyboard aim's starting point. */
  private autoTarget(): { x: number; z: number } | null {
    const sim = this.sim!;
    const p = sim.player;
    let best: { x: number; z: number; value: number } | null = null;
    for (const e of sim.enemies) {
      if (e.state === 'spawn') continue;
      const dx = e.x - p.x, dz = e.z - p.z, d = Math.hypot(dx, dz) || 1;
      if (d > MAX_DASH * 1.6) continue;
      const reach = Math.min(MAX_DASH, d + 0.8);
      const tx = p.x + (dx / d) * reach, tz = p.z + (dz / d) * reach;
      const plan = sim.planDash(tx, tz);
      const value = (plan.cuts.length + plan.chain.length) * 10 - (plan.blocked ? 25 : 0) - d * 0.5;
      if (!best || value > best.value) best = { x: tx, z: tz, value };
    }
    return best;
  }

  // ---------------------------------------------------------------- frame

  private frame(dt: number, t: number): void {
    const sim = this.sim;
    let worldDt = dt;
    if (this.state === 'running' && sim) {
      this.keyboard(dt);
      const dash = this.pendingDash;
      this.pendingDash = null;
      const events = sim.step(dt, { aiming: !!this.aim, dash });
      for (const event of events) this.handle(event);
      worldDt = dt * sim.timeScale * (sim.hitStop > 0 ? HIT_STOP_SCALE : 1);
      if (this.aim && !this.canAim()) this.aim = null;
    } else if (this.state === 'paused') {
      worldDt = 0;
    } else if (this.state === 'dying') {
      worldDt = dt * 0.35;
      this.dyingTime += dt;
      if (this.dyingTime > 1.6 && sim) {
        this.state = 'over';
        this.onOver({ score: sim.score, wave: sim.wave, kills: sim.kills, maxCombo: sim.maxCombo, bestCut: sim.bestCut });
      }
    } else if (this.state === 'over') {
      worldDt = dt * 0.35;
    } else {
      this.idleTime += dt;
    }

    this.visualTime += worldDt;
    this.time.value = this.visualTime;
    this.updatePalette(dt);
    this.updatePlayer(dt, worldDt);
    this.updateEnemies(worldDt);
    this.updateArrows();
    this.updateEffects(dt, worldDt);
    this.drawTelegraphs(dt);
    this.updateWorld(t, worldDt);
    this.updateCamera(dt, t);
    this.stage.render();

    this.hudTimer -= dt;
    if (this.state === 'running' && this.hudTimer <= 0) { this.hudTimer = 0.08; this.emitHud(); }
  }

  private local(x: number, z: number, y = 0): THREE.Vector3 {
    const island = this.island();
    return tmpPos.set(island.x + x, island.y + y, island.z + z);
  }

  // ---------------------------------------------------------------- sim events

  private handle(event: SimEvent): void {
    const sim = this.sim!;
    switch (event.type) {
      case 'wave':
        this.onEvent('wave', { wave: event.wave, arena: event.arena, intro: event.intro, endless: event.endless, first: event.wave === 1 });
        break;
      case 'fight':
        this.onEvent('fight', { wave: event.wave });
        break;
      case 'clear':
        this.gust = 1;
        this.onEvent('clear', { wave: event.wave, bonus: event.bonus, flawless: event.flawless, healed: event.healed, campaign: event.campaign });
        this.popupAt(`+${event.bonus}`, sim.player.x, 1.8, sim.player.z, 'bonus');
        break;
      case 'travel': {
        const from = sim.arenaIndex, to = event.arena;
        const start = ARENAS[to].start;
        this.travel = {
          from, to,
          fromPos: new THREE.Vector3(sim.player.x, 0, sim.player.z).add(ISLANDS[from]),
          toPos: new THREE.Vector3(start.x, 0, start.z).add(ISLANDS[to]),
        };
        this.aim = null;
        this.dashAnim = null;
        this.onEvent('travel', { arena: to });
        break;
      }
      case 'arena':
        this.views.clear();
        this.dyingViews = [];
        this.arrowViews.clear();
        break;
      case 'spawn':
        this.onEvent('spawn', { kind: event.kind });
        break;
      case 'land': {
        const view = this.views.get(event.id);
        if (view) {
          const p = this.local(view.x, view.z, 0.1);
          this.sparks.burst(p.x, p.y, p.z, 10, 2.2, this.colorA.set(PALETTES[sim.arenaIndex].grass[0]), 0.18, 0.5, 4, 1);
        }
        this.onEvent('land', { kind: event.kind });
        break;
      }
      case 'windup':
        this.onEvent('windup', { kind: event.kind });
        break;
      case 'strike':
        this.onEvent('strike', { kind: event.kind });
        break;
      case 'shoot':
        this.onEvent('shoot');
        break;
      case 'explode': {
        const p = this.local(event.x, event.z, 0.6);
        this.flashAt(p, 3.6 + event.depth * 0.4, 0.45, event.harmful ? 0xff6040 : 0xffc070);
        this.shocks.push({ x: p.x, y: p.y - 0.55, z: p.z, age: 0, life: 0.5, radius: BLAST_R, color: new THREE.Color(event.harmful ? 0xff5a3c : 0xffd27a) });
        this.sparks.burst(p.x, p.y, p.z, 40, 7, this.colorA.set(0xffa040), 0.3, 0.7, 6, 2);
        this.sparks.burst(p.x, p.y, p.z, 16, 4, this.colorA.set(0x5a4a6a), 0.35, 0.9, 5, 1);
        this.addShake(0.45 + event.depth * 0.1);
        const view = this.views.get(event.id);
        if (view && !view.dying) this.killView(view, 0, 0);
        this.onEvent('explode', { depth: event.depth, harmful: event.harmful });
        break;
      }
      case 'kill': {
        const view = this.views.get(event.id);
        if (view) this.killView(view, event.dirX, event.dirZ);
        const p = this.local(event.x, event.z, 0.75);
        const color = this.colorA.set(event.kind === 'grunt' ? 0xff8a5c : event.kind === 'archer' ? 0x8fe38a : event.kind === 'shield' ? 0xb8d0ff : 0xc9a0ff);
        this.sparks.burst(p.x, p.y, p.z, 18, 4.5, color, 0.2, 0.6, 3, 1);
        this.sparks.burst(p.x, p.y, p.z, 10, 6, this.colorB.set(0xffffff), 0.12, 0.35, 0, 0.5);
        if (event.cause === 'cut') {
          this.slashes.push({ x: event.x, z: event.z, angle: Math.atan2(event.dirZ, event.dirX), age: -event.order * 0.04, length: 2.4 });
          this.addShake(0.12);
        }
        this.popupAt(`+${event.points}`, event.x, 1.6, event.z, 'cut');
        this.onEvent('cut', { kind: event.kind, order: event.order });
        break;
      }
      case 'deflect': {
        const p = this.local(event.x, event.z, 0.9);
        this.sparks.burst(p.x, p.y, p.z, 14, 5, this.colorA.set(0xfff2a0), 0.14, 0.4, 0, 0.5);
        this.arrowViews.delete(event.arrow);
        this.popupAt(`+${event.points}`, event.x, 1.4, event.z, 'deflect');
        this.onEvent('deflect');
        break;
      }
      case 'arrowGone':
        this.arrowViews.delete(event.arrow);
        break;
      case 'clang': {
        const p = this.local(event.x, event.z, 0.7);
        this.sparks.burst(p.x, p.y, p.z, 22, 5.5, this.colorA.set(0xfff0c0), 0.13, 0.45, 5, 1.5);
        this.addShake(0.25);
        const view = this.views.get(event.id);
        if (view) view.flash = 1;
        this.onEvent('clang', { first: this.firstClang });
        this.firstClang = false;
        break;
      }
      case 'dash': {
        this.dashAnim = { fromX: event.fromX, fromZ: event.fromZ, toX: event.toX, toZ: event.toZ, t: 0 };
        this.startTrail(event.fromX, event.fromZ, event.toX, event.toZ);
        const steps = Math.max(2, Math.min(6, Math.round(Math.hypot(event.toX - event.fromX, event.toZ - event.fromZ) / 0.9)));
        const facing = Math.atan2(event.toZ - event.fromZ, event.toX - event.fromX);
        for (let i = 0; i < steps; i++) {
          const k = i / steps;
          this.ghosts.push({ x: lerp(event.fromX, event.toX, k), z: lerp(event.fromZ, event.toZ, k), facing, age: -k * 0.05 });
        }
        this.grassUniforms.uWake.value.set(event.fromX, event.fromZ, event.toX, event.toZ).add(new THREE.Vector4(this.island().x, this.island().z, this.island().x, this.island().z));
        this.wakeAge = 0;
        this.kick.set(event.toX - event.fromX, event.toZ - event.fromZ).normalize().multiplyScalar(this.reducedMotion ? 0 : 0.18);
        this.onEvent('dash', { kills: event.kills });
        if (event.kills >= 2) this.onEvent('multi', { kills: event.kills });
        break;
      }
      case 'cancel':
        this.onEvent('edge');
        break;
      case 'denied':
        this.deniedFlash = 1;
        this.onEvent('denied');
        break;
      case 'charge':
        this.chargePulse = 1;
        this.onEvent('charge');
        break;
      case 'combo':
        this.onEvent('combo', { combo: event.combo, kills: event.kills });
        break;
      case 'comboDrop':
        this.onEvent('comboDrop', { combo: event.combo });
        break;
      case 'hurt':
        this.hurtFlash = 1;
        this.addShake(0.6);
        this.sparks.burst(this.playerPos.x, this.playerPos.y + 0.7, this.playerPos.z, 20, 4, this.colorA.set(0xff6070), 0.18, 0.5, 4, 1);
        this.onEvent('hurt', { hearts: event.hearts, source: event.source });
        break;
      case 'dead':
        this.state = 'dying';
        this.dyingTime = 0;
        this.aim = null;
        this.onEvent('dead');
        this.emitHud();
        break;
    }
  }

  private killView(view: EnemyView, dirX: number, dirZ: number): void {
    view.dying = 0.42;
    view.dieX = dirX;
    view.dieZ = dirZ;
    view.sim = null;
    this.views.delete(view.id);
    this.dyingViews.push(view);
  }

  private popupAt(text: string, x: number, y: number, z: number, tone: PopupTone): void {
    const p = this.local(x, z, y).project(this.stage.camera);
    if (p.z > 1) return;
    this.onPopup(text, (p.x * 0.5 + 0.5) * this.width, (-p.y * 0.5 + 0.5) * this.height, tone);
  }

  private addShake(amount: number): void {
    if (this.reducedMotion) return;
    this.shake = Math.min(1, this.shake + amount);
  }

  private flashAt(p: THREE.Vector3, size: number, life: number, color: number): void {
    const flash = this.flashes.reduce((a, b) => (b.age / b.life > a.age / a.life ? b : a));
    flash.sprite.position.copy(p);
    (flash.sprite.material as THREE.SpriteMaterial).color.set(color);
    flash.age = 0;
    flash.life = life;
    flash.size = size;
    flash.sprite.visible = true;
  }

  private startTrail(fromX: number, fromZ: number, toX: number, toZ: number): void {
    const trail = this.trails.reduce((a, b) => (b.age > a.age ? b : a));
    const island = this.island();
    const length = Math.hypot(toX - fromX, toZ - fromZ);
    const angle = Math.atan2(toZ - fromZ, toX - fromX);
    trail.mesh.position.set(island.x + (fromX + toX) / 2, island.y + 0.55, island.z + (fromZ + toZ) / 2);
    trail.mesh.rotation.set(0, -angle, 0);
    trail.mesh.scale.set(Math.max(0.3, length + 0.4), 1.1, 0.75);
    trail.age = 0;
    trail.mesh.visible = true;
  }

  // ---------------------------------------------------------------- per-frame updates

  private updatePlayer(dt: number, worldDt: number): void {
    const sim = this.sim;
    const island = this.island();
    let x = this.playerPos.x - 0, z = this.playerPos.z, y = 0;
    let worldX = 0, worldY = 0, worldZ = 0;
    let lean = 0, squash = 1;
    if (sim && this.travel && sim.phase === 'travel') {
      // The flight between islands: a high arc riding the wind.
      const k = clamp(sim.phaseTime / TRAVEL_TIME, 0, 1);
      const e = k * k * (3 - 2 * k);
      const from = this.travel.fromPos, to = this.travel.toPos;
      worldX = lerp(from.x, to.x, e);
      worldZ = lerp(from.z, to.z, e);
      worldY = lerp(from.y, to.y, e) + Math.sin(Math.PI * k) * 7;
      this.playerFacing = Math.atan2(to.z - from.z, to.x - from.x);
      lean = 0.5;
      if (Math.random() < 0.6) this.sparks.emit(worldX, worldY + 0.6, worldZ, (Math.random() - 0.5), (Math.random() - 0.5), (Math.random() - 0.5), ACCENT, 0.2, 0.6);
    } else {
      if (sim) {
        x = sim.player.x;
        z = sim.player.z;
        if (this.dashAnim) {
          this.dashAnim.t += dt;
          const k = clamp(this.dashAnim.t / DASH_ANIM, 0, 1);
          const e = 1 - (1 - k) * (1 - k);
          x = lerp(this.dashAnim.fromX, this.dashAnim.toX, e);
          z = lerp(this.dashAnim.fromZ, this.dashAnim.toZ, e);
          lean = 0.6 * (1 - k);
          squash = 1 - 0.15 * (1 - k);
          this.playerFacing = Math.atan2(this.dashAnim.toZ - this.dashAnim.fromZ, this.dashAnim.toX - this.dashAnim.fromX);
          if (k >= 1) this.dashAnim = null;
        } else if (this.aim && (this.aim.source !== 'touch' || !this.aim.dead)) {
          const fx = this.aim.x - x, fz = this.aim.z - z;
          if (Math.hypot(fx, fz) > 0.2) this.playerFacing = turnAngle(this.playerFacing, Math.atan2(fz, fx), 18 * dt);
          lean = 0.25;
          squash = 0.9;
        } else {
          this.playerFacing = turnAngle(this.playerFacing, sim.player.facing, 6 * dt);
        }
      } else {
        // Menu: idle stance.
        this.playerFacing = turnAngle(this.playerFacing, -Math.PI / 2 + Math.sin(this.idleTime * 0.5) * 0.6, 2 * dt);
      }
      y = Math.abs(Math.sin(this.visualTime * 3)) * 0.03;
      worldX = island.x + x;
      worldY = island.y + y;
      worldZ = island.z + z;
      this.playerPos.set(x, 0, z);
    }
    if (this.state === 'dying' || this.state === 'over') {
      const k = clamp(this.dyingTime / 0.7, 0, 1);
      lean = 0;
      this.playerBody.rotation.set(-k * 1.4, 0, 0);
      worldY -= k * 0.1;
    }
    this.player.position.set(worldX, worldY, worldZ);
    this.player.rotation.set(0, Math.PI / 2 - this.playerFacing, 0);
    if (this.state !== 'dying' && this.state !== 'over') this.playerBody.rotation.set(lean, 0, 0);
    this.playerGlow.rotation.copy(this.playerBody.rotation);
    this.player.scale.set(MODEL_SCALE / Math.sqrt(squash), MODEL_SCALE * squash, MODEL_SCALE / Math.sqrt(squash));
    this.grassUniforms.uPlayer.value.set(worldX, worldY, worldZ);
    // Hurt: a red flush that fades (no blinking).
    this.hurtFlash = Math.max(0, this.hurtFlash - dt * 1.6);
    this.playerBody.material.emissive.setRGB(this.hurtFlash * 0.8, this.hurtFlash * 0.1, this.hurtFlash * 0.15);
    this.updateScarf(worldDt > 0 ? dt : 0);
    // Charge ring under the player.
    const ring = this.ring.material.uniforms;
    const showRing = !!sim && this.state !== 'dying' && this.state !== 'over' && sim.phase !== 'travel';
    this.ring.visible = showRing;
    if (sim && showRing) {
      this.ring.position.set(worldX, island.y + 0.05, worldZ);
      ring.uCharges.value = sim.charges;
      ring.uProgress.value = sim.chargeProgress;
      ring.uFocus.value = sim.focus / FOCUS_MAX;
      ring.uAiming.value = lerp(ring.uAiming.value, this.aim || sim.focus < FOCUS_MAX ? 1 : 0, damp(10, dt));
      this.deniedFlash = Math.max(0, this.deniedFlash - dt * 2.5);
      this.chargePulse = Math.max(0, this.chargePulse - dt * 3);
      ring.uDenied.value = this.deniedFlash;
      ring.uPulse.value = this.chargePulse;
      ring.uGrace.value = sim.grace > 0.25 ? 1 : 0;
    }
  }

  private resetScarf(): void {
    const neck = this.neck(tmpPos);
    for (const p of this.scarfPoints) p.copy(neck);
  }

  private neck(out: THREE.Vector3): THREE.Vector3 {
    return out.set(0, 0.9 * this.player.scale.y, -0.12 * MODEL_SCALE).applyEuler(this.player.rotation).add(this.player.position);
  }

  /** A short chain that trails behind the neck and flutters in the wind. */
  private updateScarf(dt: number): void {
    const points = this.scarfPoints;
    const neck = this.neck(new THREE.Vector3());
    points[0].copy(neck);
    const segment = 0.13 * MODEL_SCALE;
    const t = this.visualTime;
    for (let i = 1; i < points.length; i++) {
      const p = points[i];
      if (dt > 0) {
        p.y -= dt * 0.6;
        p.x += dt * (0.8 + Math.sin(t * 7 + i) * 0.5);
        p.z += dt * Math.cos(t * 5 + i * 0.7) * 0.6;
      }
      const prev = points[i - 1];
      tmpPos.subVectors(p, prev);
      const len = tmpPos.length() || 1;
      p.copy(prev).addScaledVector(tmpPos, segment / len);
    }
    const position = this.scarf.geometry.getAttribute('position') as THREE.BufferAttribute;
    for (let i = 0; i < points.length; i++) {
      const w = 0.07 * (1 - i / points.length) + 0.02;
      position.setXYZ(i * 2, points[i].x, points[i].y + w, points[i].z);
      position.setXYZ(i * 2 + 1, points[i].x, points[i].y - w, points[i].z);
    }
    position.needsUpdate = true;
    this.scarf.geometry.computeVertexNormals();
  }

  private syncViews(): void {
    const sim = this.sim;
    if (!sim) return;
    for (const e of sim.enemies) {
      let view = this.views.get(e.id);
      if (!view) {
        view = { id: e.id, kind: e.kind, x: e.x, z: e.z, facing: e.facing, state: e.state, t: e.t, dirX: e.dirX, dirZ: e.dirZ, stagger: 0, seed: Math.random() * 10, dying: 0, dieX: 0, dieZ: 0, flash: 0, mark: 0, sim: e };
        this.views.set(e.id, view);
      }
      view.sim = e;
    }
    for (const view of this.views.values()) {
      const e = view.sim;
      if (!e || e.state === 'dead' || !sim.enemies.includes(e)) { this.views.delete(view.id); continue; }
      view.x = e.x;
      view.z = e.z;
      view.facing = e.facing;
      view.state = e.state;
      view.t = e.t;
      view.dirX = e.dirX;
      view.dirZ = e.dirZ;
      view.stagger = e.stagger;
    }
  }

  private updateEnemies(worldDt: number): void {
    this.syncViews();
    const counts: Record<Kind, number> = { grunt: 0, archer: 0, shield: 0, bomber: 0 };
    let shadows = 0;
    const island = this.island();
    const plan = this.sim?.plan;
    const tempo = plan ? plan.tempo : 1;
    const write = (view: EnemyView) => {
      const mesh = this.enemyMeshes[view.kind];
      const i = counts[view.kind]++;
      if (i >= 18) return;
      const s = STATS[view.kind];
      let y = 0, sx = 1, sy = 1, rx = 0, rz = 0, scale = 1;
      const phase = this.visualTime * 7 + view.seed;
      tmpColor.setRGB(1, 1, 1);
      const windup = s.windup * tempo;
      switch (view.state) {
        case 'spawn': {
          const k = clamp(view.t / SPAWN_TIME, 0, 1);
          y = 6 * (1 - k) * (1 - k);
          scale = 0.6 + 0.4 * k;
          tmpColor.setRGB(1.3, 1.3, 1.5);
          break;
        }
        case 'move':
          y = Math.abs(Math.sin(phase)) * 0.07;
          rz = Math.sin(phase) * 0.06;
          if (view.stagger > 0) { rx = -0.35 * view.stagger / 0.6; rz += Math.sin(this.visualTime * 30) * 0.05 * (this.reducedMotion ? 0 : 1); }
          break;
        case 'windup': {
          const k = clamp(view.t / windup, 0, 1);
          rx = -0.35 * k;
          sy = 1 - 0.1 * k;
          sx = 1 + 0.08 * k;
          tmpColor.setRGB(1 + 0.7 * k, 1 + 0.05 * k, 1 - 0.3 * k);
          break;
        }
        case 'strike':
          rx = 0.4;
          sy = 0.92;
          sx = 1.1;
          tmpColor.setRGB(1.6, 1.1, 0.8);
          break;
        case 'recover':
          sy = 0.94;
          rx = 0.15;
          tmpColor.setRGB(0.8, 0.8, 0.85);
          break;
        case 'fuse': {
          const k = clamp(view.t / windup, 0, 1);
          scale = 1 + 0.22 * k;
          const beat = this.reducedMotion ? 0.5 : 0.5 + 0.5 * Math.sin(this.visualTime * TAU * (0.8 + 1.4 * k));
          tmpColor.setRGB(1 + 0.9 * k * beat + 0.3 * k, 1 - 0.2 * k, 1 - 0.4 * k);
          break;
        }
      }
      if (view.mark === 1 || view.mark === 2) tmpColor.multiplyScalar(1.45);
      if (view.flash > 0) { tmpColor.lerp(this.colorB.setRGB(2, 2, 2), view.flash); view.flash = Math.max(0, view.flash - worldDt * 4); }
      let px = view.x, pz = view.z, ry = Math.PI / 2 - view.facing;
      if (view.dying > 0) {
        const k = 1 - view.dying / 0.42;
        px += view.dieX * k * 0.6;
        pz += view.dieZ * k * 0.6;
        y += Math.sin(k * Math.PI) * 0.5;
        rx = k * 1.8;
        scale *= 1 - k * 0.85;
        tmpColor.setRGB(2.2, 2.2, 2.2);
      }
      tmpEuler.set(rx, ry, rz, 'YXZ');
      tmpQuat.setFromEuler(tmpEuler);
      tmpMatrix.compose(tmpPos.set(island.x + px, island.y + y, island.z + pz), tmpQuat, tmpScale.set(sx * scale * MODEL_SCALE, sy * scale * MODEL_SCALE, sx * scale * MODEL_SCALE));
      mesh.setMatrixAt(i, tmpMatrix);
      mesh.setColorAt(i, tmpColor);
      if (shadows < 48) {
        const r = s.r * 2.5 * (view.state === 'spawn' ? clamp(view.t / SPAWN_TIME, 0.2, 1) : 1) * (view.dying > 0 ? view.dying / 0.42 : 1);
        tmpMatrix.compose(tmpPos.set(island.x + px, island.y + 0.04, island.z + pz), tmpQuat.identity(), tmpScale.set(r, 1, r));
        this.shadows.setMatrixAt(shadows++, tmpMatrix);
      }
    };
    if (this.sim) {
      for (const view of this.views.values()) write(view);
    } else {
      for (const view of this.decor) {
        // The menu bomber keeps lighting its fuse and the first grunt keeps winding up at the ninja.
        view.clock = (view.clock ?? view.seed) + worldDt;
        if (view.kind === 'bomber') {
          view.t = view.clock % 3.2;
          view.state = view.t < 1.2 ? 'fuse' : 'move';
        } else if (view.id === -1) {
          view.t = view.clock % 4;
          view.state = view.t < STATS.grunt.windup ? 'windup' : 'move';
          const d = Math.hypot(view.x, view.z) || 1;
          view.dirX = -view.x / d;
          view.dirZ = -view.z / d;
        }
        write(view);
      }
    }
    for (let i = this.dyingViews.length - 1; i >= 0; i--) {
      const view = this.dyingViews[i];
      view.dying -= worldDt;
      if (view.dying <= 0) { this.dyingViews.splice(i, 1); continue; }
      write(view);
    }
    for (const kind of Object.keys(counts) as Kind[]) {
      const mesh = this.enemyMeshes[kind];
      mesh.count = Math.min(18, counts[kind]);
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }
    // The player's own shadow.
    if (this.player.visible && shadows < 48 && !(this.sim && this.sim.phase === 'travel')) {
      tmpMatrix.compose(tmpPos.set(this.player.position.x, island.y + 0.04, this.player.position.z), tmpQuat.identity(), tmpScale.set(1, 1, 1));
      this.shadows.setMatrixAt(shadows++, tmpMatrix);
    }
    this.shadows.count = shadows;
    this.shadows.instanceMatrix.needsUpdate = true;
  }

  private updateArrows(): void {
    const sim = this.sim;
    let n = 0;
    if (sim) {
      const island = this.island();
      for (const arrow of sim.arrows) {
        if (n >= 32) break;
        const angle = Math.atan2(arrow.dz, arrow.dx);
        tmpQuat.setFromAxisAngle(UP, -angle);
        tmpMatrix.compose(tmpPos.set(island.x + arrow.x, island.y + 0.85, island.z + arrow.z), tmpQuat, tmpScale.set(1, 1, 1));
        this.arrowsMesh.setMatrixAt(n++, tmpMatrix);
      }
    }
    this.arrowsMesh.count = n;
    this.arrowsMesh.instanceMatrix.needsUpdate = true;
  }

  private updateEffects(dt: number, worldDt: number): void {
    this.sparks.update(worldDt);
    for (const trail of this.trails) {
      if (!trail.mesh.visible) continue;
      trail.age += dt / 0.45;
      trail.mesh.material.uniforms.uAge.value = Math.min(1, trail.age);
      if (trail.age >= 1) trail.mesh.visible = false;
    }
    for (const flash of this.flashes) {
      if (!flash.sprite.visible) continue;
      flash.age += dt;
      const k = flash.age / flash.life;
      if (k >= 1) { flash.sprite.visible = false; continue; }
      flash.sprite.scale.setScalar(flash.size * (0.6 + k * 0.8));
      (flash.sprite.material as THREE.SpriteMaterial).opacity = (1 - k) * (this.reducedMotion ? 0.5 : 1);
    }
    for (let i = this.shocks.length - 1; i >= 0; i--) {
      this.shocks[i].age += dt;
      if (this.shocks[i].age >= this.shocks[i].life) this.shocks.splice(i, 1);
    }
    for (let i = this.slashes.length - 1; i >= 0; i--) {
      this.slashes[i].age += dt;
      if (this.slashes[i].age >= 0.3) this.slashes.splice(i, 1);
    }
    let n = 0;
    const island = this.island();
    for (let i = this.ghosts.length - 1; i >= 0; i--) {
      const ghost = this.ghosts[i];
      ghost.age += dt;
      if (ghost.age >= 0.3) { this.ghosts.splice(i, 1); continue; }
      if (ghost.age < 0 || n >= 8) continue;
      const k = ghost.age / 0.3;
      tmpQuat.setFromAxisAngle(UP, Math.PI / 2 - ghost.facing);
      tmpMatrix.compose(tmpPos.set(island.x + ghost.x, island.y, island.z + ghost.z), tmpQuat, tmpScale.setScalar((1 - k * 0.3) * MODEL_SCALE));
      this.ghostMesh.setMatrixAt(n++, tmpMatrix);
    }
    this.ghostMesh.count = n;
    this.ghostMesh.instanceMatrix.needsUpdate = true;
    this.wakeAge += worldDt;
    this.grassUniforms.uWakeAge.value = this.wakeAge;
    this.gust = Math.max(0, this.gust - dt * 0.5);
    this.grassUniforms.uGust.value = this.gust;
  }

  private drawTelegraphs(dt: number): void {
    const tg = this.telegraphs;
    tg.begin();
    const sim = this.sim;
    const island = this.island();
    const ox = island.x, oy = island.y, oz = island.z;
    const orange = this.colorA.set(0xff7a3a);
    const c = new THREE.Color();
    const views: EnemyView[] = sim ? [...this.views.values()] : this.decor;
    for (const view of views) view.mark = 0;
    // Aim: the path, its landing point and what it would cut.
    let plan: DashPlan | null = null;
    if (sim && this.aim && this.canAim()) {
      this.planTimer -= dt;
      if (this.planTimer <= 0 || !this.lastPlan) { this.lastPlan = sim.planDash(this.aim.x, this.aim.z); this.planTimer = 0.03; }
      plan = this.lastPlan;
    } else {
      this.lastPlan = null;
    }
    const aimingDead = this.aim?.source === 'touch' && this.aim.dead;
    if (sim && plan && !aimingDead) {
      const angle = Math.atan2(plan.dirZ, plan.dirX);
      const ready = sim.charges >= 1;
      const pathColor = c.copy(ready ? ACCENT : this.colorB.setRGB(0.6, 0.65, 0.72));
      if (plan.valid) {
        tg.lane(S.aim, ox + plan.fromX, oy + 0.07, oz + plan.fromZ, angle, plan.length, 0.42, 1, pathColor, ready ? 1 : 0.6);
        if (plan.want > plan.length + 0.05) tg.lane(S.ghost, ox + plan.toX, oy + 0.07, oz + plan.toZ, angle, plan.want - plan.length, 0.32, 1, plan.blocked ? this.colorB.set(0xff6060) : pathColor, 0.9);
        tg.ring(S.land, ox + plan.toX, oy + 0.08, oz + plan.toZ, 0.42, 1, plan.blocked ? this.colorB.set(0xff6060) : pathColor, 1);
        for (const e of plan.cuts) { const v = this.views.get(e.id); if (v) v.mark = 1; }
        for (const e of plan.chain) { const v = this.views.get(e.id); if (v && !v.mark) v.mark = 2; }
        if (plan.blocked) { const v = this.views.get(plan.blocked.id); if (v) v.mark = 3; }
        for (const arrow of plan.arrows) tg.ring(S.mark, ox + arrow.x, oy + 0.85, oz + arrow.z, 0.35, 0, this.colorB.set(0xfff2a0), 1);
      } else {
        tg.ring(S.land, ox + plan.toX + plan.dirX * 0.4, oy + 0.08, oz + plan.toZ + plan.dirZ * 0.4, 0.3, 1, this.colorB.setRGB(0.7, 0.72, 0.8), 0.6);
      }
    }
    const tempo = sim ? sim.plan.tempo : 1;
    for (const view of views) {
      const s = STATS[view.kind];
      const x = ox + view.x, z = oz + view.z;
      const windup = s.windup * tempo;
      if (view.state === 'spawn') {
        tg.ring(S.spawn, x, oy + 0.05, z, s.r * 1.9, clamp(view.t / SPAWN_TIME, 0, 1), this.colorB.set(0xffffff), 0.9);
        continue;
      }
      if (view.kind === 'shield') {
        tg.ring(S.arc, x, oy + 0.045, z, 1.25, 0, this.colorB.set(0x3d9cff), this.aim ? 1 : 0.75, view.facing);
      }
      if (view.state === 'windup' && (view.kind === 'grunt' || view.kind === 'shield')) {
        const k = clamp(view.t / windup, 0, 1);
        tg.ring(S.windup, x, oy + 0.05, z, s.r * 1.9, k, orange, 1);
        const locked = view.t >= windup * AIM_LOCK || view.kind === 'shield';
        const reach = sim ? clipDash(sim.arena, view.x, view.z, view.dirX, view.dirZ, s.reach) : s.reach;
        tg.lane(S.lane, x, oy + 0.06, z, Math.atan2(view.dirZ, view.dirX), reach + s.r, s.r * 2, k, locked ? this.colorB.set(0xff4a2a) : orange, locked ? 1 : 0.7);
      } else if (view.state === 'strike' && (view.kind === 'grunt' || view.kind === 'shield')) {
        tg.ring(S.windup, x, oy + 0.05, z, s.r * 1.9, 1, this.colorB.set(0xff4a2a), 1);
      } else if (view.state === 'windup' && view.kind === 'archer') {
        const k = clamp(view.t / windup, 0, 1);
        const locked = view.t >= windup * AIM_LOCK;
        tg.lane(S.sight, x, oy + 0.9, z, Math.atan2(view.dirZ, view.dirX), 11, 0.24, k, locked ? this.colorB.set(0xff4a2a) : this.colorB.set(0xffd34a), 1);
        tg.ring(S.windup, x, oy + 0.05, z, s.r * 1.9, k, this.colorB.set(0xffd34a), 0.9);
      } else if (view.state === 'fuse') {
        const k = clamp(view.t / windup, 0, 1);
        tg.ring(S.blast, x, oy + 0.05, z, BLAST_R, k, this.colorB.set(0xff3a2a), 1);
      }
      if (view.mark) {
        const color = view.mark === 3 ? this.colorB.set(0xff5050) : view.mark === 2 ? this.colorB.set(0xffc070) : this.colorB.set(0xffffff);
        tg.ring(S.mark, x, oy + 0.09, z, s.r * 1.7, 0, color, 1);
      }
    }
    if (sim) {
      for (const arrow of sim.arrows) {
        tg.lane(S.streak, ox + arrow.x - arrow.dx * 1.6, oy + 0.85, oz + arrow.z - arrow.dz * 1.6, Math.atan2(arrow.dz, arrow.dx), 1.6, 0.14, 1, this.colorB.set(0xffe2a0), 0.9);
      }
    }
    for (const shock of this.shocks) {
      const k = shock.age / shock.life;
      tg.ring(S.shock, shock.x, shock.y + 0.06, shock.z, shock.radius * (0.3 + 0.9 * k), k, shock.color, 1);
    }
    for (const slash of this.slashes) {
      if (slash.age < 0) continue;
      const k = slash.age / 0.3;
      const half = slash.length / 2;
      tg.lane(S.slash, ox + slash.x - Math.cos(slash.angle) * half, oy + 0.8, oz + slash.z - Math.sin(slash.angle) * half, slash.angle, slash.length, 0.5, k, ACCENT, 1);
    }
    tg.end();
  }

  private updateWorld(t: number, worldDt: number): void {
    this.grassUniforms.uTime.value = this.visualTime;
    this.updateClouds(this.visualTime);
    // Wind streaks around the current island.
    const island = this.camTarget;
    const slow = this.sim ? this.sim.timeScale : 1;
    this.windState.forEach((w, i) => {
      w.x += w.speed * worldDt;
      if (w.x > 16) { w.x = -16 - Math.random() * 6; w.z = (Math.random() - 0.5) * 22; w.y = 0.4 + Math.random() * 4; }
      tmpMatrix.compose(tmpPos.set(island.x + w.x, island.y + w.y, island.z + w.z), tmpQuat.identity(), tmpScale.set(w.length * (slow < 0.5 ? 0.5 : 1), 1, 1));
      this.winds.setMatrixAt(i, tmpMatrix);
    });
    this.winds.instanceMatrix.needsUpdate = true;
    // Sun follows the island in view.
    this.sun.position.set(island.x - 14, island.y + 30, island.z + 18);
    this.sun.target.position.copy(island);
    void t;
  }

  private applyPalette(index: number, slow: number, instant = false): void {
    const p = PALETTES[index];
    const k = instant ? 1 : 0.06;
    const mix = (target: THREE.Color, value: number, tintAmount: number) => {
      this.colorA.set(value).lerp(SLOW_TINT, tintAmount);
      target.lerp(this.colorA, k);
    };
    mix(this.skyUniforms.uTop.value, p.skyTop, slow * 0.5);
    mix(this.skyUniforms.uHorizon.value, p.skyHorizon, slow * 0.6);
    mix(this.skyUniforms.uBottom.value, p.skyBottom, slow * 0.6);
    mix(this.seaUniforms.uDeep.value, p.skyBottom, slow * 0.45);
    mix(this.seaUniforms.uCloud.value, p.cloud, slow * 0.4);
    mix(this.fog.color, p.fog, slow * 0.7);
    mix(this.hemi.color, p.hemiSky, slow * 0.3);
    mix(this.hemi.groundColor, p.hemiGround, slow * 0.3);
    mix(this.sun.color, p.sun, slow * 0.4);
    (this.clouds?.material as THREE.MeshLambertMaterial | undefined)?.color.lerp(this.colorA.set(p.cloud), k);
  }

  private updatePalette(dt: number): void {
    const sim = this.sim;
    let index = sim ? sim.arenaIndex : 0;
    if (sim && this.travel && sim.phase === 'travel') index = sim.phaseTime > TRAVEL_TIME * 0.35 ? this.travel.to : this.travel.from;
    const slowTarget = sim && this.state === 'running' ? clamp((1 - sim.timeScale) / (1 - SLOW), 0, 1) : 0;
    this.tint = lerp(this.tint, slowTarget, damp(12, dt));
    this.applyPalette(index, this.tint);
    // Slow motion pulls the fog in, so the island stands out against a cool haze.
    this.fog.near = lerp(60, 8, this.tint);
    this.fog.far = lerp(190, 62, this.tint);
    this.stage.renderer.toneMappingExposure = lerp(1, 0.88, this.tint);
    this.hemi.intensity = lerp(1.5, 1.15, this.tint);
    this.sun.intensity = lerp(2.2, 1.6, this.tint);
  }

  // ---------------------------------------------------------------- camera

  private layout(width: number, height: number): void {
    this.width = width;
    this.height = height;
    const { camera } = this.stage;
    const aspect = width / height;
    camera.fov = aspect < 0.8 ? 46 : 38;
    this.pitch = aspect < 0.8 ? PITCH_PORTRAIT : PITCH;
    camera.updateProjectionMatrix();
    this.wide = aspect > 1.15 && width >= 900;
    const vHalf = THREE.MathUtils.degToRad(camera.fov / 2);
    this.sparks.material.uniforms.uScale.value = (height * this.stage.renderer.getPixelRatio()) / (2 * Math.tan(vHalf));
    this.fits = ARENAS.map((_, i) => this.fitDistance(i));
    this.appliedOffset = '';
  }

  /** Camera distance that frames island `index` inside the screen minus the HUD insets. */
  private fitDistance(index: number): number {
    const cam = this.fitCamera;
    const { camera } = this.stage;
    cam.fov = camera.fov;
    cam.aspect = this.width / this.height;
    cam.near = camera.near;
    cam.far = camera.far;
    const { top, right, bottom, left } = this.insets;
    const cx = (left - right) / 2, cy = (top - bottom) / 2;
    cam.setViewOffset(this.width, this.height, -cx, -cy, this.width, this.height);
    cam.updateProjectionMatrix();
    const minX = -1 + (2 * left) / this.width + 0.02, maxX = 1 - (2 * right) / this.width - 0.02;
    const minY = -1 + (2 * bottom) / this.height + 0.02, maxY = 1 - (2 * top) / this.height - 0.02;
    const target = this.frameTarget(index, new THREE.Vector3());
    const points = this.fitPoints[index];
    const fits = (d: number) => {
      cam.position.set(target.x, target.y + Math.sin(this.pitch) * d, target.z + Math.cos(this.pitch) * d);
      cam.lookAt(target);
      cam.updateMatrixWorld();
      for (const point of points) {
        const p = tmpPos.copy(point).project(cam);
        if (p.x < minX || p.x > maxX || p.y < minY || p.y > maxY || p.z > 1) return false;
      }
      return true;
    };
    let lo = 6, hi = 120;
    for (let i = 0; i < 22; i++) {
      const mid = (lo + hi) / 2;
      if (fits(mid)) hi = mid;
      else lo = mid;
    }
    return hi;
  }

  private frameTarget(index: number, out: THREE.Vector3): THREE.Vector3 {
    const b = ARENAS[index].bounds;
    return out.set((b.minX + b.maxX) / 2, 0.3, (b.minZ + b.maxZ) / 2 + 0.2).add(ISLANDS[index]);
  }

  private updateCamera(dt: number, t: number): void {
    const { camera } = this.stage;
    const sim = this.sim;
    const target = new THREE.Vector3();
    let dist: number, pitch = this.pitch, yaw = 0, shift = 0;
    if (!sim) {
      this.frameTarget(0, target);
      // On wide screens the menu covers the left: pull back so the island fits right of it.
      dist = this.fits[0] * (this.wide ? 1.32 : 1.08);
      pitch = 0.82;
      yaw = Math.sin(t * 0.07) * 0.4;
      shift = this.wide ? 0.22 : 0;
    } else if (this.travel && sim.phase === 'travel') {
      const k = clamp(sim.phaseTime / TRAVEL_TIME, 0, 1);
      const e = k * k * (3 - 2 * k);
      const a = this.frameTarget(this.travel.from, new THREE.Vector3());
      const b = this.frameTarget(this.travel.to, new THREE.Vector3());
      target.lerpVectors(a, b, e);
      target.y += Math.sin(Math.PI * k) * 4;
      dist = lerp(this.fits[this.travel.from], this.fits[this.travel.to], e) * (1 + Math.sin(Math.PI * k) * 0.35);
    } else {
      this.frameTarget(sim.arenaIndex, target);
      dist = this.fits[sim.arenaIndex];
      // Slow motion leans in a little towards the player.
      const lean = this.tint * 0.08;
      target.lerp(this.player.position, lean);
      dist *= 1 - this.tint * 0.035;
      if (this.state === 'over' || this.state === 'dying') {
        const k = clamp(this.dyingTime / 1.6, 0, 1);
        target.lerp(this.player.position, 0.25 * k);
        dist *= 1 - 0.15 * k;
        if (this.state === 'over') shift = this.wide ? 0.22 : 0;
      }
    }
    const k = this.cameraSnap ? 1 : damp(sim && sim.phase === 'travel' ? 6 : 3, dt);
    this.cameraSnap = false;
    this.camTarget.lerp(target, k);
    this.camDist = lerp(this.camDist, dist, k);
    this.camPitch = lerp(this.camPitch, pitch, k);
    this.camYaw = lerp(this.camYaw, yaw, k);
    this.shake = Math.max(0, this.shake - dt * 2.4);
    this.kick.multiplyScalar(Math.exp(-dt * 12));
    const s = this.state === 'paused' ? 0 : this.shake * this.shake * 0.35;
    const cp = Math.cos(this.camPitch);
    camera.position.set(
      this.camTarget.x + Math.sin(this.camYaw) * cp * this.camDist + (Math.random() - 0.5) * s + this.kick.x,
      this.camTarget.y + Math.sin(this.camPitch) * this.camDist + (Math.random() - 0.5) * s,
      this.camTarget.z + Math.cos(this.camYaw) * cp * this.camDist + (Math.random() - 0.5) * s + this.kick.y,
    );
    camera.lookAt(this.camTarget.x + this.kick.x, this.camTarget.y, this.camTarget.z + this.kick.y);
    // Centre the island inside the area the HUD leaves free; on wide menus slide it right of the panel.
    this.camShift = lerp(this.camShift, shift, k);
    const { top, right, bottom, left } = this.insets;
    const ox = Math.round((left - right) / 2 + this.camShift * this.width);
    const oy = Math.round((top - bottom) / 2);
    const key = `${ox},${oy},${this.width},${this.height}`;
    if (key !== this.appliedOffset) {
      this.appliedOffset = key;
      camera.setViewOffset(this.width, this.height, -ox, -oy, this.width, this.height);
    }
  }
  private camShift = 0;
  private pitch = PITCH;

  private emitHud(): void {
    const sim = this.sim;
    if (!sim) return;
    this.onHud({
      score: sim.score,
      wave: sim.wave,
      endless: sim.wave > CAMPAIGN_WAVES,
      hearts: sim.hearts,
      charges: sim.charges,
      chargeProgress: sim.chargeProgress,
      combo: sim.combo,
      comboLeft: sim.combo > 1 ? clamp(sim.comboTimer / COMBO_TIME, 0, 1) : 0,
      focus: sim.focus / FOCUS_MAX,
      slow: this.tint,
    });
  }
}

function turnAngle(current: number, target: number, step: number): number {
  return wrap(current + clamp(wrap(target - current), -step, step));
}
