import { THREE, createStage, createLoop, Keys, trackPointer, clamp, damp, lerp, prefersReducedMotion, type Stage } from '../../../shared/three/kit';
import {
  WatchSim, MAX_LIVES, TURN_WIDE, TURN_FOCUS, DOOR_RADIUS, CATCH_TIME, TAU,
  wrap, turnToward, type Wraith, type WraithKind, type Flotsam, type SimEvent,
} from './logic';

export interface Hud { score: number; night: number; lives: number; oil: number; banished: number; focused: boolean; }
export interface Result { score: number; nights: number; banished: number; night: number; }
/** An off-screen wraith, pinned to the screen edge: CSS pixel position, outward screen angle and 0..1 closeness. */
export interface Threat { x: number; y: number; angle: number; near: number; }
export type GameEvent = 'burn' | 'banish' | 'door' | 'lightning' | 'catch' | 'collect' | 'empty' | 'night' | 'clear' | 'focus' | 'sink' | 'rise';
export interface EventDetail {
  night?: number;
  intro?: WraithKind | null;
  bonus?: number;
  points?: number;
  item?: 'oil' | 'crate';
  relit?: boolean;
  kind?: WraithKind;
}

const LAMP_Y = 10.15;
const ROCK_TOP = 1.25;
const ROCK_TOP_R = 3.9;
const ROCK_BOTTOM_R = 7.4;
const ROCK_BOTTOM_Y = -1.0;
const TOWER_R = 1.62;
/** The beam volume reaches from just off the tower to the edge of the lit sea. */
const BEAM_NEAR = 1.8;
const BEAM_FAR = 30;
const PLAY_PITCH = 0.9;
const IDLE_PITCH = 0.5;
/** A finger held on the sea focuses the beam only once the beam is this close (radians) to it. */
const TOUCH_FOCUS_ARC = 0.2;

/** Swell: direction x, direction z, wavenumber, angular speed, amplitude. Shared by the shader and the CPU bobbing. */
const WAVES: ReadonlyArray<readonly [number, number, number, number, number]> = [
  [0.92, 0.39, 0.33, 1.0, 0.3],
  [-0.47, 0.88, 0.51, 1.35, 0.2],
  [0.21, -0.98, 0.93, 1.9, 0.1],
  [-0.81, -0.59, 1.6, 2.6, 0.05],
];

export function waveHeight(x: number, z: number, t: number): number {
  let h = 0;
  for (let i = 0; i < WAVES.length; i++) {
    const w = WAVES[i];
    h += w[4] * Math.sin((w[0] * x + w[1] * z) * w[2] + t * w[3]);
  }
  return h;
}

const f4 = (n: number) => n.toFixed(4);
const WAVE_GLSL = /* glsl */`
float waveHeight(vec2 p) {
  float h = 0.0;
  ${WAVES.map(([dx, dz, k, w, a]) => `h += ${f4(a)} * sin(dot(p, vec2(${f4(dx)}, ${f4(dz)})) * ${f4(k)} + uTime * ${f4(w)});`).join('\n  ')}
  return h;
}
vec3 waveNormal(vec2 p) {
  vec2 g = vec2(0.0);
  ${WAVES.map(([dx, dz, k, w, a]) => `g += ${f4(a * k)} * cos(dot(p, vec2(${f4(dx)}, ${f4(dz)})) * ${f4(k)} + uTime * ${f4(w)}) * vec2(${f4(dx)}, ${f4(dz)});`).join('\n  ')}
  return normalize(vec3(-g.x, 1.0, -g.y));
}`;

/** The beam footprint as a horizontal sector light, so the whole radial strip glows, not only the spotlight's circle. */
const BEAM_GLSL = /* glsl */`
uniform vec2 uBeamDir;
uniform float uBeamHalf;
uniform float uBeamPower;
uniform vec3 uBeamColor;
float beamLight(vec3 wp) {
  vec2 d = wp.xz;
  float r = length(d);
  float a = acos(clamp(dot(d / max(r, 0.001), uBeamDir), -1.0, 1.0));
  float edge = 1.0 - smoothstep(uBeamHalf * 0.72, uBeamHalf + 0.03, a);
  float near = smoothstep(1.4, 4.0, r);
  float far = 1.0 - smoothstep(16.0, 34.0, r);
  return edge * near * far * uBeamPower;
}`;

function glowTexture(tight = false): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(tight ? 0.12 : 0.2, tight ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.6)');
  gradient.addColorStop(tight ? 0.3 : 0.5, tight ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.12)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 64, 64);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function towerTexture(): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 512;
  const g = canvas.getContext('2d')!;
  const bands = 5;
  for (let i = 0; i < bands; i++) {
    g.fillStyle = i % 2 === 0 ? '#d6cfc0' : '#8a2a22';
    g.fillRect(0, (i * 512) / bands, 256, 512 / bands + 1);
  }
  for (let i = 0; i < 320; i++) {
    g.fillStyle = `rgba(16,20,24,${(Math.random() * 0.14).toFixed(3)})`;
    g.fillRect(Math.random() * 256, Math.random() * 512, 1 + Math.random() * 3, 18 + Math.random() * 130);
  }
  const grime = g.createLinearGradient(0, 512, 0, 280);
  grime.addColorStop(0, 'rgba(8,12,16,0.75)');
  grime.addColorStop(1, 'rgba(8,12,16,0)');
  g.fillStyle = grime;
  g.fillRect(0, 280, 256, 232);
  g.fillStyle = '#120e0b';
  for (const [u, v] of [[0.25, 0.28], [0.75, 0.5], [0.4, 0.72]]) g.fillRect(u * 256 - 7, v * 512 - 15, 14, 28);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  return texture;
}

function crateTexture(): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 64;
  const g = canvas.getContext('2d')!;
  g.fillStyle = '#6b4a2a';
  g.fillRect(0, 0, 64, 64);
  g.fillStyle = '#4a3019';
  for (let y = 0; y < 64; y += 16) g.fillRect(0, y, 64, 2);
  g.strokeStyle = '#3a2512';
  g.lineWidth = 6;
  g.strokeRect(3, 3, 58, 58);
  // A painted lantern: crates relight a lost lantern.
  g.fillStyle = '#f0b44c';
  g.fillRect(26, 22, 12, 22);
  g.fillRect(23, 18, 18, 4);
  g.fillRect(23, 44, 18, 4);
  g.fillRect(30, 12, 4, 6);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/** Hooded robe: a lathe with a tattered hem. Height about 2 m, hem at y = 0. */
function robeGeometry(): THREE.BufferGeometry {
  const profile = [
    [0.5, 0.0], [0.45, 0.32], [0.41, 0.72], [0.38, 1.04], [0.36, 1.24], [0.24, 1.37],
    [0.27, 1.5], [0.27, 1.68], [0.21, 1.84], [0.11, 1.95], [0.0, 1.99],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  const geometry = new THREE.LatheGeometry(profile, 16);
  const position = geometry.getAttribute('position') as THREE.BufferAttribute;
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i);
    const y = position.getY(i);
    const z = position.getZ(i);
    const phi = Math.atan2(x, z);
    let ny = y;
    let scale = 1;
    if (y < 0.01) {
      ny = -0.28 * (0.5 + 0.5 * Math.sin(phi * 5 + 1.3));
      scale = 1 + 0.16 * Math.sin(phi * 3 + 0.4);
    }
    // Lean forward a little, as if wading against the swell.
    position.setXYZ(i, x * scale, ny, z * scale + y * y * 0.035);
  }
  geometry.computeVertexNormals();
  return geometry;
}

interface WraithView {
  id: number;
  kind: WraithKind;
  root: THREE.Group;
  body: THREE.Group;
  material: THREE.MeshStandardMaterial;
  eyeMaterial: THREE.SpriteMaterial;
  auraMaterial: THREE.SpriteMaterial;
  limbs: THREE.Object3D[];
  limbBase: number[];
  angle: number;
  dist: number;
  age: number;
  seed: number;
  burn: number;
  light: number;
  moving: boolean;
  dying: number;
  sim: Wraith | null;
}

interface FlotsamView {
  id: number;
  kind: 'oil' | 'crate';
  root: THREE.Group;
  model: THREE.Object3D;
  ring: THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial>;
  glow: THREE.Sprite;
  angle: number;
  dist: number;
  sinking: number;
  sim: Flotsam | null;
}

const EYE_COLOR = 0x9dffbf;
/** Wraiths are drawn larger than life so they read from the high camera. */
const WRAITH_SCALE = 1.3;
const BASE_EMISSIVE = 0x2a423b;
const KIND_COLORS: Record<WraithKind, number> = { drifter: 0x93a8a0, skitter: 0x8d9b93, brute: 0x687a73, watcher: 0xaab4ae };

/** Pooled additive sparks and wisps. Sizes are world units; colour fades to black, which adds nothing. */
class Sparks {
  readonly points: THREE.Points;
  readonly material: THREE.ShaderMaterial;
  private readonly count = 700;
  private readonly position = new Float32Array(this.count * 3);
  private readonly color = new Float32Array(this.count * 3);
  private readonly base = new Float32Array(this.count * 3);
  private readonly size = new Float32Array(this.count);
  private readonly baseSize = new Float32Array(this.count);
  private readonly velocity = new Float32Array(this.count * 3);
  private readonly life = new Float32Array(this.count);
  private readonly maxLife = new Float32Array(this.count);
  private readonly lift = new Float32Array(this.count);
  private cursor = 0;

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
          float a = smoothstep(0.5, 0.0, d);
          gl_FragColor = vec4(vColor * a, a);
        }`,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true,
    });
    this.points = new THREE.Points(geometry, this.material);
    this.points.frustumCulled = false;
  }

  emit(x: number, y: number, z: number, vx: number, vy: number, vz: number, color: THREE.Color, size: number, life: number, lift = 0): void {
    const i = this.cursor;
    this.cursor = (this.cursor + 1) % this.count;
    const j = i * 3;
    this.position[j] = x; this.position[j + 1] = y; this.position[j + 2] = z;
    this.velocity[j] = vx; this.velocity[j + 1] = vy; this.velocity[j + 2] = vz;
    this.base[j] = color.r; this.base[j + 1] = color.g; this.base[j + 2] = color.b;
    this.baseSize[i] = size;
    this.life[i] = this.maxLife[i] = life;
    this.lift[i] = lift;
  }

  burst(x: number, y: number, z: number, n: number, speed: number, color: THREE.Color, size: number, life: number, lift = 0, up = 0): void {
    for (let k = 0; k < n; k++) {
      const a = Math.random() * TAU;
      const b = Math.acos(Math.random() * 2 - 1);
      const s = speed * (0.35 + Math.random() * 0.65);
      this.emit(x, y, z, Math.sin(b) * Math.cos(a) * s, Math.abs(Math.cos(b)) * s * 0.6 + up, Math.sin(b) * Math.sin(a) * s,
        color, size * (0.6 + Math.random() * 0.8), life * (0.6 + Math.random() * 0.6), lift);
    }
  }

  update(dt: number): void {
    const drag = Math.exp(-2.2 * dt);
    for (let i = 0; i < this.count; i++) {
      if (this.life[i] <= 0) { this.size[i] = 0; continue; }
      this.life[i] -= dt;
      const k = Math.max(0, this.life[i] / this.maxLife[i]);
      const j = i * 3;
      this.velocity[j] *= drag;
      this.velocity[j + 1] = this.velocity[j + 1] * drag + this.lift[i] * dt;
      this.velocity[j + 2] *= drag;
      this.position[j] += this.velocity[j] * dt;
      this.position[j + 1] += this.velocity[j + 1] * dt;
      this.position[j + 2] += this.velocity[j + 2] * dt;
      this.color[j] = this.base[j] * k;
      this.color[j + 1] = this.base[j + 1] * k;
      this.color[j + 2] = this.base[j + 2] * k;
      this.size[i] = this.baseSize[i] * (0.4 + 0.6 * k);
    }
    const geometry = this.points.geometry;
    geometry.getAttribute('position').needsUpdate = true;
    geometry.getAttribute('aColor').needsUpdate = true;
    geometry.getAttribute('aSize').needsUpdate = true;
  }

  clear(): void { this.life.fill(0); this.size.fill(0); }
}

export class LighthouseWatch {
  onHud: (hud: Hud) => void = () => {};
  onOver: (result: Result) => void = () => {};
  onEvent: (event: GameEvent, detail?: EventDetail) => void = () => {};
  /** Floating score text at a stage position in CSS pixels. */
  onPopup: (text: string, x: number, y: number) => void = () => {};
  /** Off-screen wraiths, about 15 times a second while a watch is on. Reads `count` entries of a reused array. */
  onThreats: (threats: readonly Threat[], count: number) => void = () => {};

  private stage: Stage;
  private keys = new Keys();
  private loop = createLoop((dt, t) => this.frame(dt, t));
  private reducedMotion = prefersReducedMotion();
  private glow = glowTexture();
  private eyeGlow = glowTexture(true);
  private sim = new WatchSim();
  private state: 'idle' | 'running' | 'paused' | 'dying' | 'over' = 'idle';

  // Shared uniforms: every beam-aware material reads the same objects.
  private time = { value: 0 };
  private beamUniforms = {
    uBeamDir: { value: new THREE.Vector2(1, 0) },
    uBeamHalf: { value: 0.42 },
    uBeamPower: { value: 0.5 },
    uBeamColor: { value: new THREE.Color(0xffb85c) },
  };

  private hemi = new THREE.HemisphereLight(0x3d5274, 0x161c26, 0.85);
  private moon = new THREE.DirectionalLight(0x7090c4, 0.8);
  private flashLight = new THREE.DirectionalLight(0xd4e2ff, 0);
  private spot = new THREE.SpotLight(0xffd8a0, 60, 70, 0.5, 0.55, 1);
  private lampLight = new THREE.PointLight(0xffc070, 8, 9, 1.4);
  private doorLight = new THREE.PointLight(0xffa850, 6, 7, 1.5);
  private fog = new THREE.FogExp2(0x070b14, 0.016);
  private background = new THREE.Color(0x05080e);
  private baseBackground = new THREE.Color(0x05080e);
  private flashBackground = new THREE.Color(0x3d4c68);
  private baseFog = new THREE.Color(0x070b14);

  private beamPivot = new THREE.Group();
  private beamVolume!: THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial>;
  private lampCore!: THREE.Mesh<THREE.SphereGeometry, THREE.MeshBasicMaterial>;
  private lampGlow!: THREE.Sprite;
  private glassMaterial!: THREE.MeshStandardMaterial;
  private lanterns: Array<{ glass: THREE.MeshStandardMaterial; glow: THREE.Sprite; position: THREE.Vector3 }> = [];
  private rain!: THREE.LineSegments<THREE.BufferGeometry, THREE.ShaderMaterial>;
  private rainDrops = new Float32Array(0);
  private bolt!: THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>;
  private boltFlash!: THREE.Sprite;
  private sparks = new Sparks();

  // Wraith and flotsam visuals, pooled by kind.
  private geometries = {
    robe: robeGeometry(),
    face: new THREE.CircleGeometry(0.19, 16),
    mask: new THREE.CircleGeometry(0.2, 18),
    arm: new THREE.ConeGeometry(0.075, 1, 5, 1).rotateX(Math.PI / 2).translate(0, 0, 0.5),
    eye: new THREE.SphereGeometry(0.05, 8, 6),
    barrel: new THREE.CylinderGeometry(0.4, 0.4, 1.0, 14),
    hoop: new THREE.TorusGeometry(0.41, 0.035, 5, 18),
    crate: new THREE.BoxGeometry(0.95, 0.8, 0.95),
    ring: new THREE.PlaneGeometry(2.6, 2.6).rotateX(-Math.PI / 2),
  };
  private faceMaterial = new THREE.MeshBasicMaterial({ color: 0x010302 });
  private eyeMaterial = new THREE.MeshBasicMaterial({ color: 0xe6fff0 });
  private maskMaterial = new THREE.MeshStandardMaterial({ color: 0xe7e2d4, roughness: 0.6, emissive: 0x1d1c18 });
  private barrelMaterial = new THREE.MeshStandardMaterial({ color: 0x6a3420, roughness: 0.55, metalness: 0.2, emissive: 0x1a0a04 });
  private hoopMaterial = new THREE.MeshStandardMaterial({ color: 0x3a3d42, roughness: 0.4, metalness: 0.8 });
  private crateMaterial = new THREE.MeshStandardMaterial({ map: crateTexture(), roughness: 0.8, emissive: 0x140c04 });
  private wraithPool: Record<WraithKind, WraithView[]> = { drifter: [], skitter: [], brute: [], watcher: [] };
  private flotsamPool: Record<'oil' | 'crate', FlotsamView[]> = { oil: [], crate: [] };
  private wraithViews = new Map<number, WraithView>();
  private dyingViews: WraithView[] = [];
  private flotsamViews = new Map<number, FlotsamView>();
  private decor: WraithView[] = [];

  // Input and presentation state.
  private beam = -Math.PI / 2;
  private beamVelocity = 0;
  private aimMode: 'keys' | 'point' = 'keys';
  private aimTarget = 0;
  private pointerHeld = false;
  /** The held pointer is a finger or pen, which aims and focuses with one press; a mouse aims by hovering first. */
  private pointerTouch = false;
  private touchLeft = false;
  private touchRight = false;
  private touchFocus = false;
  private raycaster = new THREE.Raycaster();
  private aimPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -1);
  private aimPoint = new THREE.Vector3();
  private ndc = new THREE.Vector2();
  private projected = new THREE.Vector3();
  private tmpColor = new THREE.Color();
  private burnColor = new THREE.Color(0xffb04a);
  private wispColor = new THREE.Color(0xbfffd6);
  private splashColor = new THREE.Color(0x9fc4dd);
  private emberColor = new THREE.Color(0xff9a3c);
  private whiteColor = new THREE.Color(0xdde8ff);
  private litColor = new THREE.Color(0x4a6e62);

  private seaTime = 0;
  private lampPower = 1;
  private flash = 0;
  private lightningTimer = 3;
  private lightningSeq: number[] = [];
  private shake = 0;
  private burnSoundTimer = 0;
  private hudTimer = 0;
  private threatTimer = 0;
  private threats: Threat[] = [];
  private dyingTime = 0;
  private wasFocused = false;
  private camPitch = IDLE_PITCH;
  private camDist = 30;
  private camYaw = 0;
  private camTargetY = 3.4;
  private camShift = 0;
  private cameraSnap = true;
  private playDist = 36;
  private wide = true;
  private appliedShift = NaN;
  private width = 1;
  private height = 1;

  static create(host: HTMLElement): LighthouseWatch | null {
    const stage = createStage(host, { fov: 46, far: 260, maxPixelRatio: 1.75 });
    return stage ? new LighthouseWatch(host, stage) : null;
  }

  private constructor(host: HTMLElement, stage: Stage) {
    this.stage = stage;
    this.buildScene();
    stage.onResize((width, height) => this.layout(width, height));
    trackPointer(host, {
      down: (x, y) => { this.pointerHeld = true; this.aimAt(x, y); },
      drag: (_dx, _dy, x, y) => this.aimAt(x, y),
      up: () => { this.pointerHeld = false; },
    });
    // Mouse hover aims without focusing; a held button focuses.
    host.addEventListener('pointermove', event => {
      if (event.pointerType !== 'mouse' || this.pointerHeld) return;
      const rect = host.getBoundingClientRect();
      this.aimAt(event.clientX - rect.left, event.clientY - rect.top);
    });
    host.addEventListener('pointerdown', event => { this.pointerTouch = event.pointerType !== 'mouse'; });
    host.addEventListener('contextmenu', event => event.preventDefault());
    this.stageDecor();
    this.loop.start();
  }

  get status() { return this.state; }

  /** On-screen touch buttons. */
  press(control: 'left' | 'right' | 'focus', down: boolean): void {
    if (control === 'left') this.touchLeft = down;
    else if (control === 'right') this.touchRight = down;
    else this.touchFocus = down;
    if (down && control !== 'focus') this.aimMode = 'keys';
  }

  // ---------------------------------------------------------------- scene

  private buildScene(): void {
    const { scene } = this.stage;
    scene.background = this.background;
    scene.fog = this.fog;
    this.moon.position.set(-18, 30, -14);
    this.flashLight.position.set(10, 40, -20);
    scene.add(this.hemi, this.moon, this.flashLight);
    this.buildWater();
    this.buildIsland();
    this.buildTower();
    this.buildBeam();
    this.buildRain();
    this.buildBolt();
    scene.add(this.sparks.points);
  }

  /** Injects the shared beam sector light into a standard material as extra emissive light. */
  private beamAware(material: THREE.MeshStandardMaterial, strength: string): void {
    material.onBeforeCompile = shader => {
      Object.assign(shader.uniforms, this.beamUniforms);
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vBeamWorld;')
        .replace('#include <project_vertex>', '#include <project_vertex>\nvBeamWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;');
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', `#include <common>\nvarying vec3 vBeamWorld;\n${BEAM_GLSL}`)
        .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>\ntotalEmissiveRadiance += uBeamColor * beamLight(vBeamWorld) * diffuseColor.rgb * ${strength};`);
    };
  }

  private buildWater(): void {
    const geometry = new THREE.PlaneGeometry(150, 150, 150, 150);
    geometry.rotateX(-Math.PI / 2);
    const material = new THREE.MeshStandardMaterial({ color: 0x0d2236, roughness: 0.3, metalness: 0.2 });
    material.onBeforeCompile = shader => {
      Object.assign(shader.uniforms, this.beamUniforms, { uTime: this.time });
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', `#include <common>\nuniform float uTime;\nvarying vec3 vSeaWorld;\nvarying float vWave;\n${WAVE_GLSL}`)
        .replace('#include <beginnormal_vertex>', 'vec3 objectNormal = waveNormal(position.xz);\n#ifdef USE_TANGENT\nvec3 objectTangent = vec3(tangent.xyz);\n#endif')
        .replace('#include <begin_vertex>', 'vec3 transformed = vec3(position.x, waveHeight(position.xz), position.z);\nvWave = transformed.y;')
        .replace('#include <project_vertex>', '#include <project_vertex>\nvSeaWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;');
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', `#include <common>\nuniform float uTime;\nvarying vec3 vSeaWorld;\nvarying float vWave;\n${BEAM_GLSL}`)
        .replace('#include <color_fragment>', /* glsl */`#include <color_fragment>
          float shoreR = length(vSeaWorld.xz);
          float around = atan(vSeaWorld.z, vSeaWorld.x);
          float foam = smoothstep(7.8, 5.6, shoreR + 0.5 * sin(around * 7.0 + uTime * 0.7)) * (0.55 + 0.45 * sin(shoreR * 4.5 - uTime * 2.4 + around * 3.0));
          float crest = smoothstep(0.34, 0.6, vWave);
          diffuseColor.rgb += vec3(0.32, 0.38, 0.44) * (foam * 0.55 + crest * 0.22);`)
        .replace('#include <emissivemap_fragment>', /* glsl */`#include <emissivemap_fragment>
          float sea = smoothstep(-0.2, 0.55, vWave);
          totalEmissiveRadiance += mix(uBeamColor, vec3(1.0, 0.92, 0.75), sea * 0.5) * beamLight(vSeaWorld) * (0.4 + 1.5 * sea) + vec3(0.05, 0.07, 0.08) * foam;`);
    };
    const water = new THREE.Mesh(geometry, material);
    water.frustumCulled = false;
    this.stage.scene.add(water);
  }

  private buildIsland(): void {
    const material = new THREE.MeshStandardMaterial({ color: 0x4f5963, roughness: 0.6, metalness: 0.1, flatShading: true, vertexColors: true });
    this.beamAware(material, '3.0');
    let seed = 7;
    const random = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    // Position-based noise, so the duplicated seam and cap vertices move together.
    const hash = (x: number, y: number, z: number) => {
      const h = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719) * 43758.5453;
      return h - Math.floor(h);
    };
    /** Stone colours: lichen on faces that look up, wet dark stone low down. */
    const tint = (geometry: THREE.BufferGeometry, baseY: number) => {
      const position = geometry.getAttribute('position') as THREE.BufferAttribute;
      const normal = geometry.getAttribute('normal') as THREE.BufferAttribute;
      const colors = new Float32Array(position.count * 3);
      for (let i = 0; i < position.count; i++) {
        const x = position.getX(i), y = position.getY(i), z = position.getZ(i);
        const v = 0.72 + hash(x, y, z) * 0.45;
        const moss = Math.max(0, normal.getY(i) - 0.55) * (0.5 + hash(z, x, y));
        const wet = (1 - THREE.MathUtils.smoothstep(baseY + y, -0.6, 0.6)) * 0.45;
        colors[i * 3] = v * (1 - moss * 0.35) * (1 - wet);
        colors[i * 3 + 1] = v * (1 + moss * 0.08) * (1 - wet);
        colors[i * 3 + 2] = v * (1 - moss * 0.3) * (1 - wet * 0.8);
      }
      geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    };

    const height = ROCK_TOP - ROCK_BOTTOM_Y;
    const base = new THREE.CylinderGeometry(ROCK_TOP_R, ROCK_BOTTOM_R, height, 30, 4);
    const position = base.getAttribute('position') as THREE.BufferAttribute;
    for (let i = 0; i < position.count; i++) {
      const x = position.getX(i), y = position.getY(i), z = position.getZ(i);
      if (Math.hypot(x, z) < 0.01) continue;
      const a = Math.atan2(z, x);
      const key = Math.round(a * 1000) / 1000;
      const n = 1 + 0.08 * Math.sin(a * 5 + y * 2) + 0.06 * Math.sin(a * 11 + 1.7) + (hash(key, y, 1) - 0.5) * 0.08;
      const top = y > height / 2 - 0.01;
      position.setXYZ(i, x * n, y + (hash(key, y, 2) - 0.5) * (top ? 0.1 : 0.3), z * n);
    }
    base.computeVertexNormals();
    tint(base, (ROCK_TOP + ROCK_BOTTOM_Y) / 2);
    const island = new THREE.Mesh(base, material);
    island.position.y = (ROCK_TOP + ROCK_BOTTOM_Y) / 2;
    this.stage.scene.add(island);

    // Boulders around the rim and a few outlying stacks for silhouette.
    const boulder = new THREE.DodecahedronGeometry(1, 0);
    tint(boulder, 0.4);
    const placements: Array<[number, number, number, number]> = [];
    for (let i = 0; i < 16; i++) placements.push([(i / 16) * TAU + random() * 0.3, 5.0 + random() * 1.6, 0.35 + random() * 0.4, -0.25 + random() * 0.35]);
    placements.push([0.7, 10.5, 0.9, -0.35], [2.6, 12.5, 1.2, -0.45], [4.1, 9.5, 0.7, -0.35], [5.4, 13, 1.0, -0.5]);
    for (const [a, r, s, y] of placements) {
      const rock = new THREE.Mesh(boulder, material);
      rock.position.set(Math.cos(a) * r, y, Math.sin(a) * r);
      rock.scale.set(s * (0.8 + random() * 0.6), s * (0.6 + random() * 0.5), s * (0.8 + random() * 0.6));
      rock.rotation.set(random() * 3, random() * 3, random() * 3);
      this.stage.scene.add(rock);
    }
  }

  private buildTower(): void {
    const { scene } = this.stage;
    const towerHeight = 8.2;
    const tower = new THREE.Mesh(
      new THREE.CylinderGeometry(1.15, TOWER_R, towerHeight, 36, 1),
      new THREE.MeshStandardMaterial({ map: towerTexture(), roughness: 0.85 }),
    );
    tower.position.y = ROCK_TOP + towerHeight / 2 - 0.05;
    scene.add(tower);

    const iron = new THREE.MeshStandardMaterial({ color: 0x1b1e24, roughness: 0.5, metalness: 0.7 });
    const deck = new THREE.Mesh(new THREE.CylinderGeometry(1.85, 1.5, 0.22, 32), iron);
    deck.position.y = ROCK_TOP + towerHeight + 0.05;
    scene.add(deck);
    const rail = new THREE.Mesh(new THREE.TorusGeometry(1.8, 0.035, 6, 48), iron);
    rail.rotation.x = Math.PI / 2;
    rail.position.y = deck.position.y + 0.6;
    scene.add(rail);
    const matrix = new THREE.Matrix4();
    const posts = new THREE.InstancedMesh(new THREE.BoxGeometry(0.05, 0.6, 0.05), iron, 18);
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * TAU;
      posts.setMatrixAt(i, matrix.makeTranslation(Math.cos(a) * 1.8, deck.position.y + 0.3, Math.sin(a) * 1.8));
    }
    scene.add(posts);

    this.glassMaterial = new THREE.MeshStandardMaterial({
      color: 0x2a2010, emissive: 0xffa840, emissiveIntensity: 0.7, roughness: 0.1, metalness: 0.3,
      transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false,
    });
    const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.95, 1.25, 16, 1, true), this.glassMaterial);
    glass.position.y = LAMP_Y;
    scene.add(glass);
    const mullions = new THREE.InstancedMesh(new THREE.BoxGeometry(0.06, 1.3, 0.06), iron, 8);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU;
      mullions.setMatrixAt(i, matrix.makeTranslation(Math.cos(a) * 0.96, LAMP_Y, Math.sin(a) * 0.96));
    }
    scene.add(mullions);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(1.12, 0.9, 16), new THREE.MeshStandardMaterial({ color: 0x7a2c22, roughness: 0.5, metalness: 0.2, emissive: 0x2a0b07 }));
    roof.position.y = LAMP_Y + 1.1;
    const finial = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 8), iron);
    finial.position.y = LAMP_Y + 1.65;
    scene.add(roof, finial);

    this.lampCore = new THREE.Mesh(new THREE.SphereGeometry(0.36, 16, 12), new THREE.MeshBasicMaterial({ color: 0xfff2d0 }));
    this.lampCore.position.y = LAMP_Y;
    this.lampGlow = new THREE.Sprite(new THREE.SpriteMaterial({
      map: this.glow, color: 0xffb35a, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, fog: false,
    }));
    this.lampGlow.position.y = LAMP_Y;
    this.lampGlow.scale.set(7, 7, 1);
    this.lampLight.position.set(0, LAMP_Y, 0);
    scene.add(this.lampCore, this.lampGlow, this.lampLight);

    // The door faces the camera; the three lanterns beside it are the keeper's lives.
    const doorZ = TOWER_R - 0.06;
    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.95, 1.55, 0.2), new THREE.MeshStandardMaterial({ color: 0x4a4640, roughness: 0.9 }));
    frame.position.set(0, ROCK_TOP + 0.75, doorZ);
    const door = new THREE.Mesh(new THREE.BoxGeometry(0.72, 1.35, 0.22), new THREE.MeshStandardMaterial({ color: 0x2b1a10, roughness: 0.8 }));
    door.position.set(0, ROCK_TOP + 0.67, doorZ + 0.04);
    scene.add(frame, door);
    this.doorLight.position.set(0, ROCK_TOP + 1.9, TOWER_R + 0.9);
    scene.add(this.doorLight);
    const lanternGeometry = new THREE.CylinderGeometry(0.11, 0.13, 0.26, 8);
    const capGeometry = new THREE.ConeGeometry(0.15, 0.12, 8);
    for (const [x, y] of [[-0.78, 1.5], [0, 1.95], [0.78, 1.5]]) {
      const glassMat = new THREE.MeshStandardMaterial({ color: 0x3a2a10, emissive: 0xffb050, emissiveIntensity: 1.6, roughness: 0.3 });
      const lantern = new THREE.Mesh(lanternGeometry, glassMat);
      const z = Math.sqrt(Math.max(0, TOWER_R * TOWER_R - x * x)) + 0.16;
      lantern.position.set(x, ROCK_TOP + y, z);
      const cap = new THREE.Mesh(capGeometry, iron);
      cap.position.set(x, ROCK_TOP + y + 0.18, z);
      const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.glow, color: 0xffa040, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, fog: false }));
      glow.position.copy(lantern.position);
      glow.scale.set(1.3, 1.3, 1);
      scene.add(lantern, cap, glow);
      this.lanterns.push({ glass: glassMat, glow, position: lantern.position.clone() });
    }
  }

  private buildBeam(): void {
    // The light volume: sheets of rays from the lamp to the lit strip of sea. The vertex shader lays
    // them out from the shared beam uniforms, so the volume always matches the footprint on the water.
    const radii = Array.from({ length: 17 }, (_, i) => BEAM_NEAR + (BEAM_FAR - BEAM_NEAR) * (i / 16));
    const rows: Array<Array<[number, number]>> = [];
    for (const span of [-1, -0.5, 0, 0.5, 1]) rows.push(radii.map(r => [span, r]));
    rows.push(Array.from({ length: 13 }, (_, i) => [-1 + i / 6, BEAM_FAR]));
    const steps = 10;
    const params: number[] = [];
    const index: number[] = [];
    for (const row of rows) {
      const base = params.length / 3;
      for (const [span, r] of row) for (let k = 0; k <= steps; k++) params.push(span, r, k / steps);
      for (let a = 0; a < row.length - 1; a++) {
        for (let k = 0; k < steps; k++) {
          const i0 = base + a * (steps + 1) + k;
          const i1 = i0 + steps + 1;
          index.push(i0, i1, i0 + 1, i1, i1 + 1, i0 + 1);
        }
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(params.length), 3));
    geometry.setAttribute('aBeam', new THREE.BufferAttribute(new Float32Array(params), 3));
    geometry.setIndex(index);
    this.beamVolume = new THREE.Mesh(geometry, new THREE.ShaderMaterial({
      uniforms: { ...this.beamUniforms, uIntensity: { value: 0.1 }, uTime: this.time },
      vertexShader: /* glsl */`
        uniform vec2 uBeamDir; uniform float uBeamHalf;
        attribute vec3 aBeam;
        varying vec3 vWorld; varying vec3 vBeam;
        void main() {
          float phi = atan(uBeamDir.y, uBeamDir.x) + aBeam.x * uBeamHalf;
          vec3 ground = vec3(cos(phi) * aBeam.y, 0.25, sin(phi) * aBeam.y);
          vWorld = mix(vec3(0.0, ${LAMP_Y.toFixed(2)}, 0.0), ground, aBeam.z);
          vBeam = aBeam;
          gl_Position = projectionMatrix * viewMatrix * vec4(vWorld, 1.0);
        }`,
      fragmentShader: /* glsl */`
        uniform float uIntensity; uniform float uTime; uniform vec3 uBeamColor;
        varying vec3 vWorld; varying vec3 vBeam;
        void main() {
          vec3 c = cross(dFdx(vWorld), dFdy(vWorld));
          float len = length(c);
          vec3 n = len > 1e-6 ? c / len : vec3(0.0, 1.0, 0.0);
          float facing = pow(abs(dot(n, normalize(cameraPosition - vWorld))), 0.7);
          float t = vBeam.z;
          float reach = length(vWorld.xz);
          float fade = (1.0 - smoothstep(${(BEAM_FAR * 0.42).toFixed(1)}, ${BEAM_FAR.toFixed(1)}, reach)) * smoothstep(0.0, 0.12, t);
          float motes = 0.78 + 0.22 * sin(dot(vWorld, vec3(1.7, 2.3, 1.1)) * 1.6 - uTime * 2.2);
          float a = uIntensity * facing * fade * motes * (1.0 - 0.45 * abs(vBeam.x)) * (0.55 + 0.45 * t);
          vec3 color = mix(uBeamColor, vec3(1.0, 0.95, 0.85), 0.3);
          gl_FragColor = vec4(color * a, a);
        }`,
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    }));
    this.beamVolume.frustumCulled = false;
    this.beamVolume.renderOrder = 2;
    // A dark shutter behind the lamp shows which way the lens faces.
    const shutter = new THREE.Mesh(
      new THREE.CylinderGeometry(0.62, 0.62, 1.0, 14, 1, true, Math.PI / 2, Math.PI),
      new THREE.MeshStandardMaterial({ color: 0x15161a, roughness: 0.4, metalness: 0.8, side: THREE.DoubleSide }),
    );
    this.beamPivot.add(shutter);
    this.beamPivot.position.set(0, LAMP_Y, 0);
    this.spot.position.set(0, LAMP_Y, 0);
    this.stage.scene.add(this.beamVolume, this.beamPivot, this.spot, this.spot.target);
  }

  private buildRain(): void {
    const drops = 900;
    this.rainDrops = new Float32Array(drops * 3);
    for (let i = 0; i < drops; i++) this.resetDrop(i, Math.random() * 30);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(drops * 6), 3).setUsage(THREE.DynamicDrawUsage));
    const tail = new Float32Array(drops * 2);
    for (let i = 0; i < drops; i++) tail[i * 2 + 1] = 1;
    geometry.setAttribute('aTail', new THREE.BufferAttribute(tail, 1));
    const material = new THREE.ShaderMaterial({
      uniforms: { ...this.beamUniforms, uFlash: { value: 0 } },
      vertexShader: /* glsl */`
        attribute float aTail; varying float vTail; varying vec3 vWorld;
        void main() {
          vTail = aTail;
          vWorld = position;
          gl_Position = projectionMatrix * viewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: /* glsl */`
        ${BEAM_GLSL}
        uniform float uFlash;
        varying float vTail; varying vec3 vWorld;
        void main() {
          float r = length(vWorld.xz);
          float roof = ${LAMP_Y.toFixed(2)} * (1.0 - r / ${BEAM_FAR.toFixed(1)});
          float lit = beamLight(vWorld) * (1.0 - smoothstep(-0.5, 1.5, vWorld.y - roof)) * 1.8;
          vec3 color = vec3(0.45, 0.55, 0.7) * (0.35 + uFlash * 2.0) + uBeamColor * lit;
          float a = (1.0 - vTail * 0.85) * (0.22 + lit * 0.6 + uFlash * 0.3);
          gl_FragColor = vec4(color * a, a);
        }`,
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false,
    });
    this.rain = new THREE.LineSegments(geometry, material);
    this.rain.frustumCulled = false;
    this.stage.scene.add(this.rain);
  }

  private resetDrop(i: number, y = 22 + Math.random() * 10): void {
    this.rainDrops[i * 3] = (Math.random() - 0.5) * 64;
    this.rainDrops[i * 3 + 1] = y;
    this.rainDrops[i * 3 + 2] = (Math.random() - 0.5) * 56 + 4;
  }

  private buildBolt(): void {
    const segments = 14;
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array((segments + 1) * 6), 3).setUsage(THREE.DynamicDrawUsage));
    const index: number[] = [];
    for (let i = 0; i < segments; i++) {
      const a = i * 2;
      index.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
    geometry.setIndex(index);
    this.bolt = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({
      color: 0xe8f0ff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false,
    }));
    this.bolt.frustumCulled = false;
    this.boltFlash = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.glow, color: 0xcfe0ff, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0, fog: false }));
    this.boltFlash.scale.set(14, 14, 1);
    this.stage.scene.add(this.bolt, this.boltFlash);
  }

  private strike(): void {
    const a = Math.random() * TAU;
    const r = 15 + Math.random() * 12;
    const x1 = Math.cos(a) * r, z1 = Math.sin(a) * r;
    const x0 = x1 + (Math.random() - 0.5) * 12, z0 = z1 - 10 - Math.random() * 8;
    const position = this.bolt.geometry.getAttribute('position') as THREE.BufferAttribute;
    const segments = position.count / 2 - 1;
    for (let i = 0; i <= segments; i++) {
      const k = i / segments;
      const jitter = i === 0 || i === segments ? 0 : (Math.random() - 0.5) * 3.2;
      const x = lerp(x0, x1, k) + jitter, y = lerp(46, 0, k), z = lerp(z0, z1, k) + (Math.random() - 0.5) * 1.5;
      const w = 0.22 * (1 - k * 0.6);
      position.setXYZ(i * 2, x - w, y, z);
      position.setXYZ(i * 2 + 1, x + w, y, z);
    }
    position.needsUpdate = true;
    this.boltFlash.position.set(x1, 0.5, z1);
    this.sparks.burst(x1, 0.3, z1, 26, 9, this.whiteColor, 0.35, 0.7, -6);
  }

  // ---------------------------------------------------------------- wraith visuals

  private makeWraith(kind: WraithKind): WraithView {
    const material = new THREE.MeshStandardMaterial({
      color: KIND_COLORS[kind], roughness: 0.85, emissive: BASE_EMISSIVE, transparent: true, opacity: 0.93, side: THREE.DoubleSide,
    });
    const eyeMaterial = new THREE.SpriteMaterial({ map: this.eyeGlow, color: EYE_COLOR, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, fog: false });
    const root = new THREE.Group();
    const body = new THREE.Group();
    root.add(body);
    const limbs: THREE.Object3D[] = [];
    const limbBase: number[] = [];
    const robe = new THREE.Mesh(this.geometries.robe, material);
    body.add(robe);
    // A faint pale aura so the shapes read against the black water.
    const auraMaterial = new THREE.SpriteMaterial({ map: this.glow, color: 0x7fc2a6, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.15, fog: false });
    const aura = new THREE.Sprite(auraMaterial);
    aura.position.set(0, kind === 'skitter' ? 0.6 : kind === 'watcher' ? 1.6 : 1.1, 0);
    aura.scale.set(kind === 'watcher' ? 2.6 : 3, kind === 'watcher' ? 4 : 3, 1);
    root.add(aura);
    const addEyes = (eyes: Array<[number, number, number, number]>) => {
      for (const [x, y, z, s] of eyes) {
        const eye = new THREE.Mesh(this.geometries.eye, this.eyeMaterial);
        eye.position.set(x, y, z);
        eye.scale.setScalar(s);
        const glow = new THREE.Sprite(eyeMaterial);
        glow.position.set(x, y, z + 0.03);
        glow.scale.set(1.5 * s, 1.5 * s, 1);
        body.add(eye, glow);
      }
    };
    const addLimb = (x: number, y: number, z: number, pitch: number, yaw: number, length: number, thick: number) => {
      const limb = new THREE.Mesh(this.geometries.arm, material);
      limb.position.set(x, y, z);
      limb.rotation.set(pitch, yaw, 0, 'YXZ');
      limb.scale.set(thick, thick, length);
      body.add(limb);
      limbs.push(limb);
      limbBase.push(pitch);
    };
    const face = new THREE.Mesh(this.geometries.face, this.faceMaterial);
    face.position.set(0, 1.6, 0.29);
    face.rotation.x = 0.12;

    if (kind === 'skitter') {
      // A crawling thing: the robe lies forward, head low, four spidery limbs.
      robe.rotation.x = 1.2;
      robe.position.set(0, 0.35, -0.7);
      robe.scale.set(0.85, 0.75, 0.85);
      face.position.set(0, 0.72, 0.62);
      face.rotation.x = -0.2;
      face.scale.setScalar(0.85);
      body.add(face);
      addEyes([[-0.07, 0.76, 0.66, 1], [0.07, 0.76, 0.66, 1], [-0.13, 0.66, 0.64, 0.65], [0.13, 0.66, 0.64, 0.65]]);
      addLimb(-0.3, 0.45, 0.3, 0.55, -0.8, 0.85, 0.8);
      addLimb(0.3, 0.45, 0.3, 0.55, 0.8, 0.85, 0.8);
      addLimb(-0.3, 0.45, -0.3, 0.55, -2.3, 0.85, 0.8);
      addLimb(0.3, 0.45, -0.3, 0.55, 2.3, 0.85, 0.8);
    } else if (kind === 'watcher') {
      // Tall and thin, with a pale mask and arms hanging to its knees.
      robe.scale.set(0.78, 1.42, 0.78);
      const mask = new THREE.Mesh(this.geometries.mask, this.maskMaterial);
      mask.position.set(0, 2.3, 0.26);
      mask.rotation.x = 0.1;
      mask.scale.set(0.9, 1.15, 1);
      body.add(mask);
      addEyes([[-0.075, 2.33, 0.28, 0.9], [0.075, 2.33, 0.28, 0.9]]);
      addLimb(-0.3, 1.75, 0.02, 1.38, 0, 1.55, 0.9);
      addLimb(0.3, 1.75, 0.02, 1.42, 0, 1.55, 0.9);
    } else {
      body.add(face);
      addEyes([[-0.075, 1.63, 0.31, 1], [0.075, 1.63, 0.31, 1]]);
      addLimb(-0.32, 1.24, 0.06, 0.32, 0, 0.95, 1);
      addLimb(0.32, 1.24, 0.06, 0.4, 0, 0.95, 1);
      if (kind === 'brute') {
        body.scale.set(1.45, 1.55, 1.45);
        body.rotation.x = 0.22;
      }
    }
    root.visible = false;
    this.stage.scene.add(root);
    return {
      id: 0, kind, root, body, material, eyeMaterial, auraMaterial, limbs, limbBase,
      angle: 0, dist: 0, age: 0, seed: 0, burn: 0, light: 0, moving: true, dying: 0, sim: null,
    };
  }

  private acquireWraith(kind: WraithKind): WraithView {
    const view = this.wraithPool[kind].pop() ?? this.makeWraith(kind);
    view.root.visible = true;
    view.root.scale.setScalar(WRAITH_SCALE);
    view.material.opacity = 0.93;
    view.auraMaterial.opacity = 0.15;
    view.material.emissive.setHex(BASE_EMISSIVE);
    view.eyeMaterial.opacity = 0;
    view.dying = 0;
    view.burn = 0;
    view.light = 0;
    view.moving = true;
    return view;
  }

  private releaseWraith(view: WraithView): void {
    view.root.visible = false;
    view.sim = null;
    this.wraithPool[view.kind].push(view);
  }

  private stageDecor(): void {
    // Attract mode: a ring of still figures watching the tower from the surf.
    const layout: Array<[WraithKind, number, number]> = [
      ['drifter', -0.35, 12], ['brute', 0.6, 15.5], ['drifter', 1.25, 10.5], ['watcher', 2.0, 13], ['skitter', 2.6, 11.5],
      ['drifter', 3.3, 14], ['drifter', 4.1, 11], ['watcher', 4.8, 16], ['drifter', 5.5, 12.5],
    ];
    for (const [kind, angle, dist] of layout) {
      const view = this.acquireWraith(kind);
      view.angle = angle;
      view.dist = dist;
      view.age = 3;
      view.seed = Math.random();
      view.moving = false;
      this.decor.push(view);
    }
  }

  private groundY(dist: number, x: number, z: number): number {
    const sea = waveHeight(x, z, this.seaTime) - 0.62;
    if (dist <= ROCK_TOP_R) return ROCK_TOP;
    const rock = ROCK_TOP - (dist - ROCK_TOP_R) * ((ROCK_TOP - ROCK_BOTTOM_Y) / (ROCK_BOTTOM_R - ROCK_TOP_R));
    return Math.max(sea, Math.min(ROCK_TOP, rock));
  }

  private placeWraith(view: WraithView, dt: number, t: number): void {
    const x = Math.cos(view.angle) * view.dist;
    const z = Math.sin(view.angle) * view.dist;
    const rise = clamp(view.age / 1.2, 0, 1);
    const jitter = view.burn * 0.08;
    const y = this.groundY(view.dist, x, z) - (1 - rise) * (1 - rise) * 2.4 + Math.sin(t * 2 + view.seed * 9) * 0.05;
    view.root.position.set(x + (Math.random() - 0.5) * jitter, y, z + (Math.random() - 0.5) * jitter);
    view.root.rotation.y = Math.atan2(-x, -z);
    view.body.rotation.z = Math.sin(t * 1.4 + view.seed * TAU) * (view.kind === 'skitter' ? 0.04 : 0.08);
    const skitter = view.kind === 'skitter';
    const phase = view.moving ? t * (skitter ? 16 : 1.7) : t * 0.6;
    for (let i = 0; i < view.limbs.length; i++) {
      const swing = skitter ? (view.moving ? Math.sin(phase + i * 1.7) * 0.35 : 0) : Math.sin(phase + i * 2 + view.seed * 5) * 0.12;
      view.limbs[i].rotation.x = view.limbBase[i] + swing;
    }
    // Light response: pale in the wide beam, white-hot amber while burning.
    const burnRatio = view.sim ? clamp(view.sim.burn / view.sim.hp, 0, 1) : 0;
    view.burn = lerp(view.burn, burnRatio, damp(14, dt));
    const lit = view.light === 0 ? 0 : view.light === 1 ? 0.55 : 0.85;
    this.tmpColor.setHex(BASE_EMISSIVE).lerp(this.litColor, lit).lerp(this.burnColor, view.burn * 0.9);
    view.material.emissive.copy(this.tmpColor).multiplyScalar(1 + view.burn * 2.4);
    view.root.scale.setScalar(WRAITH_SCALE * (1 - view.burn * 0.12));
    view.auraMaterial.opacity = 0.13 + (view.light ? 0.12 : 0) + view.burn * 0.3;
    view.auraMaterial.color.setHex(view.burn > 0.05 ? 0xffb066 : 0x7fc2a6);
    // Eyes fade in as they surface; a watcher's eyes go dark while it is seen.
    const seen = view.kind === 'watcher' && !view.moving;
    const flicker = 0.85 + 0.15 * Math.sin(t * 13 + view.seed * 40);
    const eye = clamp((view.age - 0.4) / 1.2, 0, 1) * (seen ? 0.12 : 1) * flicker * (1 - view.burn * 0.5);
    view.eyeMaterial.opacity = lerp(view.eyeMaterial.opacity, eye, damp(10, dt));
  }

  private makeFlotsam(kind: 'oil' | 'crate'): FlotsamView {
    const model = new THREE.Group();
    if (kind === 'oil') {
      const barrel = new THREE.Mesh(this.geometries.barrel, this.barrelMaterial);
      barrel.rotation.z = Math.PI / 2;
      const hoopA = new THREE.Mesh(this.geometries.hoop, this.hoopMaterial);
      hoopA.rotation.y = Math.PI / 2;
      hoopA.position.x = 0.28;
      const hoopB = hoopA.clone();
      hoopB.position.x = -0.28;
      model.add(barrel, hoopA, hoopB);
    } else {
      model.add(new THREE.Mesh(this.geometries.crate, this.crateMaterial));
    }
    const ring = new THREE.Mesh(this.geometries.ring, new THREE.ShaderMaterial({
      uniforms: { uProgress: { value: 0 }, uOpacity: { value: 0 }, uColor: { value: new THREE.Color(kind === 'oil' ? 0xffb04a : 0xffe08a) } },
      vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: /* glsl */`
        uniform float uProgress; uniform float uOpacity; uniform vec3 uColor; varying vec2 vUv;
        void main() {
          vec2 p = vUv - 0.5;
          float r = length(p) * 2.0;
          float ring = smoothstep(0.74, 0.8, r) * (1.0 - smoothstep(0.92, 0.98, r));
          float a = atan(p.x, -p.y) / 6.28318 + 0.5;
          float fill = step(a, uProgress);
          float alpha = ring * (0.22 + 0.78 * fill) * uOpacity;
          gl_FragColor = vec4(uColor * alpha, alpha);
        }`,
      blending: THREE.AdditiveBlending, transparent: true, depthWrite: false,
    }));
    ring.position.y = 0.1;
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.glow, color: kind === 'oil' ? 0xffa040 : 0xffe08a, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, fog: false }));
    glow.position.y = 0.9;
    glow.scale.set(1.8, 1.8, 1);
    const root = new THREE.Group();
    root.add(model, ring, glow);
    root.visible = false;
    this.stage.scene.add(root);
    return { id: 0, kind, root, model, ring, glow, angle: 0, dist: 0, sinking: 0, sim: null };
  }

  private acquireFlotsam(item: Flotsam): FlotsamView {
    const view = this.flotsamPool[item.kind].pop() ?? this.makeFlotsam(item.kind);
    view.root.visible = true;
    view.id = item.id;
    view.sim = item;
    view.angle = item.angle;
    view.dist = item.dist;
    view.sinking = 0;
    view.ring.material.uniforms.uProgress.value = 0;
    view.ring.material.uniforms.uOpacity.value = 0;
    return view;
  }

  private releaseFlotsam(view: FlotsamView): void {
    view.root.visible = false;
    view.sim = null;
    this.flotsamPool[view.kind].push(view);
  }

  // ---------------------------------------------------------------- lifecycle

  private reset(): void {
    for (const view of this.decor) this.releaseWraith(view);
    for (const view of this.wraithViews.values()) this.releaseWraith(view);
    for (const view of this.dyingViews) this.releaseWraith(view);
    for (const view of this.flotsamViews.values()) this.releaseFlotsam(view);
    this.decor = [];
    this.wraithViews.clear();
    this.dyingViews = [];
    this.flotsamViews.clear();
    this.sparks.clear();
    this.sim = new WatchSim();
    this.beamVelocity = 0;
    this.aimMode = 'keys';
    this.pointerHeld = false;
    this.touchLeft = this.touchRight = this.touchFocus = false;
    this.lampPower = 1;
    this.shake = 0;
    this.dyingTime = 0;
    this.wasFocused = false;
    this.lightningTimer = 9;
    this.setLanterns(MAX_LIVES);
    this.emitHud();
  }

  start(): void {
    this.reset();
    this.keys.clear();
    this.state = 'running';
    this.loop.start();
  }

  pause(): void { if (this.state === 'running') { this.state = 'paused'; this.pointerHeld = false; } }

  resume(): void {
    if (this.state !== 'paused') return;
    this.keys.clear();
    this.touchLeft = this.touchRight = this.touchFocus = false;
    this.state = 'running';
  }

  private setLanterns(lives: number): void {
    this.lanterns.forEach((lantern, i) => {
      const lit = i < lives;
      lantern.glass.emissiveIntensity = lit ? 1.6 : 0;
      lantern.glow.visible = lit;
    });
  }

  // ---------------------------------------------------------------- frame

  private frame(dt: number, t: number): void {
    const running = this.state === 'running';
    const paused = this.state === 'paused';
    if (!paused) {
      this.seaTime += dt;
      this.time.value = this.seaTime;
    }

    if (running) {
      this.steer(dt);
      // A finger swings the beam at the wide rate, burning no oil, and focuses once the beam has reached it.
      const pointerFocus = this.pointerHeld
        && (!this.pointerTouch || this.aimMode !== 'point' || Math.abs(wrap(this.aimTarget - this.beam)) < TOUCH_FOCUS_ARC);
      const wantsFocus = this.keys.isDown('Space', 'ArrowUp', 'KeyW') || pointerFocus || this.touchFocus;
      const events = this.sim.step(dt, { beam: this.beam, focus: wantsFocus, flash: this.flash > 0.45 });
      for (let i = 0; i < events.length; i++) this.handle(events[i]);
      if (this.sim.focused && !this.wasFocused) this.onEvent('focus');
      this.wasFocused = this.sim.focused;
    } else if (this.state === 'idle') {
      // Attract mode: the lamp sweeps on its own.
      this.beam = wrap(this.beam + dt * 0.45);
    }

    if (!paused) {
      this.updateWraiths(dt, t);
      this.updateFlotsam(dt);
      this.updateLightning(dt);
      this.updateRain(dt);
      this.sparks.update(dt);
    }
    if (this.state === 'dying') this.updateDying(dt);
    this.updateBeam(t);
    this.updateCamera(dt, t);
    this.stage.render();

    this.hudTimer -= dt;
    if (running && this.hudTimer <= 0) { this.hudTimer = 0.1; this.emitHud(); }
    this.threatTimer -= dt;
    if (this.threatTimer <= 0) { this.threatTimer = 1 / 15; this.emitThreats(running); }
  }

  /** Pins every off-screen wraith to the screen edge, inside the HUD margins. */
  private emitThreats(running: boolean): void {
    let count = 0;
    if (running) {
      const { camera } = this.stage;
      const halfW = this.width / 2, halfH = this.height / 2;
      const top = 92, side = 20, bottom = 24;
      for (const view of this.wraithViews.values()) {
        if (!view.sim || view.age < 0.8) continue;
        const p = this.projected.set(view.root.position.x, view.root.position.y + 2, view.root.position.z).project(camera);
        const px = p.x * halfW, py = -p.y * halfH;
        const maxX = halfW - side, minY = -halfH + top, maxY = halfH - bottom;
        if (Math.abs(px) <= maxX && py >= minY && py <= maxY) continue;
        const sx = Math.abs(px) > maxX ? maxX / Math.abs(px) : 1;
        const sy = py < minY ? minY / py : py > maxY ? maxY / py : 1;
        const k = Math.min(sx, sy);
        const threat = this.threats[count] ?? (this.threats[count] = { x: 0, y: 0, angle: 0, near: 0 });
        threat.x = halfW + px * k;
        threat.y = halfH + py * k;
        // Keep pins off the shell's button in the bottom-right corner.
        const zoneX = this.width - 220, zoneY = this.height - 76;
        if (threat.x > zoneX && threat.y > zoneY) {
          if (threat.x - zoneX < threat.y - zoneY) threat.x = zoneX;
          else threat.y = zoneY;
        }
        threat.angle = Math.atan2(py, px);
        threat.near = 1 - clamp((view.dist - 5) / 18, 0, 1);
        count++;
      }
    }
    this.onThreats(this.threats, count);
  }

  private steer(dt: number): void {
    const input = (this.keys.isDown('ArrowRight', 'KeyD') || this.touchRight ? 1 : 0) - (this.keys.isDown('ArrowLeft', 'KeyA') || this.touchLeft ? 1 : 0);
    const turn = this.sim.focus > 0.5 ? TURN_FOCUS : TURN_WIDE;
    if (input !== 0) {
      this.aimMode = 'keys';
      this.beamVelocity = lerp(this.beamVelocity, input * turn, damp(12, dt));
      this.beam = wrap(this.beam + this.beamVelocity * dt);
    } else if (this.aimMode === 'point') {
      this.beamVelocity = 0;
      this.beam = turnToward(this.beam, this.aimTarget, turn * 1.35 * dt);
    } else {
      this.beamVelocity = lerp(this.beamVelocity, 0, damp(10, dt));
      this.beam = wrap(this.beam + this.beamVelocity * dt);
    }
  }

  private aimAt(x: number, y: number): void {
    if (this.state !== 'running') return;
    const { camera } = this.stage;
    this.ndc.set((x / this.width) * 2 - 1, -(y / this.height) * 2 + 1);
    camera.updateMatrixWorld();
    this.raycaster.setFromCamera(this.ndc, camera);
    if (!this.raycaster.ray.intersectPlane(this.aimPlane, this.aimPoint)) return;
    if (Math.hypot(this.aimPoint.x, this.aimPoint.z) < 0.8) return;
    this.aimTarget = Math.atan2(this.aimPoint.z, this.aimPoint.x);
    this.aimMode = 'point';
  }

  private handle(event: SimEvent): void {
    switch (event.type) {
      case 'spawn': {
        const w = event.wraith;
        const view = this.acquireWraith(w.kind);
        view.id = w.id;
        view.sim = w;
        view.angle = w.angle;
        view.dist = w.dist;
        view.age = 0;
        view.seed = w.seed;
        this.wraithViews.set(w.id, view);
        this.sparks.burst(Math.cos(w.angle) * w.dist, 0.2, Math.sin(w.angle) * w.dist, 14, 3.5, this.splashColor, 0.3, 0.8, -5, 2.5);
        if (w.kind === 'brute' || w.kind === 'watcher') this.onEvent('rise', { kind: w.kind });
        break;
      }
      case 'banish': {
        const view = this.wraithViews.get(event.wraith.id);
        if (!view) break;
        this.wraithViews.delete(event.wraith.id);
        view.sim = null;
        view.dying = 0.75;
        this.dyingViews.push(view);
        const p = view.root.position;
        const big = event.wraith.kind === 'brute' ? 1.6 : 1;
        this.sparks.burst(p.x, p.y + 1.2, p.z, Math.round(26 * big), 3.2 * big, this.wispColor, 0.55, 1.4, 2.2);
        this.sparks.burst(p.x, p.y + 1, p.z, Math.round(18 * big), 6 * big, this.emberColor, 0.28, 0.8, 1);
        this.popup(`+${event.points}`, p.x, p.y + 2.4, p.z);
        this.onEvent('banish', { points: event.points, kind: event.wraith.kind });
        break;
      }
      case 'door': {
        const view = this.wraithViews.get(event.wraith.id);
        if (view) { this.wraithViews.delete(event.wraith.id); this.releaseWraith(view); }
        const lantern = this.lanterns[clamp(this.sim.lives, 0, MAX_LIVES - 1)];
        if (lantern) this.sparks.burst(lantern.position.x, lantern.position.y, lantern.position.z, 40, 7, this.emberColor, 0.35, 1.0, -4);
        this.sparks.burst(0, ROCK_TOP + 1, DOOR_RADIUS, 40, 5, this.wispColor, 0.5, 1.2, 1.5);
        this.setLanterns(this.sim.lives);
        this.shake = this.reducedMotion ? 0.25 : 1;
        this.onEvent('door', { kind: event.wraith.kind });
        this.emitHud();
        break;
      }
      case 'flotsam':
        this.flotsamViews.set(event.item.id, this.acquireFlotsam(event.item));
        break;
      case 'caught': {
        const view = this.flotsamViews.get(event.item.id);
        if (view) this.sparks.burst(view.root.position.x, 0.8, view.root.position.z, 16, 3, this.burnColor, 0.3, 0.7, 1);
        this.onEvent('catch', { item: event.item.kind });
        break;
      }
      case 'collect': {
        const view = this.flotsamViews.get(event.item.id);
        if (view) {
          this.sparks.burst(view.root.position.x, 1, view.root.position.z, 30, 4, this.burnColor, 0.35, 0.9, 2);
          this.flotsamViews.delete(event.item.id);
          this.releaseFlotsam(view);
        }
        if (event.relit) this.setLanterns(this.sim.lives);
        this.onEvent('collect', { item: event.item.kind, relit: event.relit });
        this.emitHud();
        break;
      }
      case 'sink': {
        const view = this.flotsamViews.get(event.item.id);
        if (view) { view.sinking = 0.001; view.sim = null; }
        this.onEvent('sink');
        break;
      }
      case 'night':
        this.onEvent('night', { night: event.night, intro: event.intro });
        break;
      case 'clear':
        this.onEvent('clear', { night: event.night, bonus: event.bonus });
        break;
      case 'empty':
        this.onEvent('empty');
        break;
      case 'over':
        this.state = 'dying';
        this.dyingTime = 0;
        this.emitHud();
        break;
    }
  }

  private updateWraiths(dt: number, t: number): void {
    let burning = false;
    for (const view of this.wraithViews.values()) {
      const w = view.sim;
      if (!w) continue;
      view.age += dt;
      view.light = w.light;
      view.moving = w.moving;
      view.angle = wrap(view.angle + wrap(w.angle - view.angle) * damp(10, dt));
      view.dist = lerp(view.dist, w.dist, damp(w.dist > view.dist ? 7 : 14, dt));
      if (this.state === 'dying' || this.state === 'over') {
        // With the lamp dead they close in on the door.
        view.light = 0;
        view.moving = true;
        w.dist = Math.max(DOOR_RADIUS + 0.6 + (w.id % 3) * 0.5, w.dist - dt * 1.4);
      }
      this.placeWraith(view, dt, t);
      if (view.light === 2) {
        burning = true;
        const p = view.root.position;
        if (Math.random() < dt * 40) {
          this.sparks.emit(p.x + (Math.random() - 0.5) * 0.6, p.y + 0.6 + Math.random() * 1.2, p.z + (Math.random() - 0.5) * 0.6,
            (Math.random() - 0.5) * 0.8, 1.5 + Math.random() * 1.5, (Math.random() - 0.5) * 0.8, this.emberColor, 0.22, 0.6, 1.5);
        }
      }
    }
    for (const view of this.decor) {
      view.age += dt;
      this.placeWraith(view, dt, t);
    }
    for (let i = this.dyingViews.length - 1; i >= 0; i--) {
      const view = this.dyingViews[i];
      view.dying -= dt;
      const k = clamp(view.dying / 0.75, 0, 1);
      view.root.position.y += dt * 2.2;
      view.root.scale.set(k * WRAITH_SCALE, (1 + (1 - k) * 0.8) * WRAITH_SCALE, k * WRAITH_SCALE);
      view.auraMaterial.opacity = 0.5 * k;
      view.material.opacity = 0.93 * k;
      view.material.emissive.copy(this.burnColor).multiplyScalar(2.5 * k);
      view.eyeMaterial.opacity = k;
      if (view.dying <= 0) { this.dyingViews.splice(i, 1); this.releaseWraith(view); }
    }
    this.burnSoundTimer -= dt;
    if (burning && this.state === 'running' && this.burnSoundTimer <= 0) {
      this.burnSoundTimer = 0.12;
      this.onEvent('burn');
    }
  }

  private updateFlotsam(dt: number): void {
    for (const view of this.flotsamViews.values()) {
      const item = view.sim;
      if (item) {
        view.angle = wrap(view.angle + wrap(item.angle - view.angle) * damp(8, dt));
        view.dist = lerp(view.dist, item.dist, damp(8, dt));
      }
      const x = Math.cos(view.angle) * view.dist;
      const z = Math.sin(view.angle) * view.dist;
      if (view.sinking > 0) view.sinking += dt;
      view.root.position.set(x, waveHeight(x, z, this.seaTime) - 0.12 - view.sinking * 0.9, z);
      const tiltX = waveHeight(x + 0.8, z, this.seaTime) - waveHeight(x - 0.8, z, this.seaTime);
      const tiltZ = waveHeight(x, z + 0.8, this.seaTime) - waveHeight(x, z - 0.8, this.seaTime);
      view.model.rotation.set(tiltZ * 0.5, view.angle + view.id, -tiltX * 0.5);
      const pull = item ? (item.caught ? 1 : item.pull / CATCH_TIME) : 0;
      const uniforms = view.ring.material.uniforms;
      uniforms.uProgress.value = pull;
      uniforms.uOpacity.value = lerp(uniforms.uOpacity.value as number, item && !item.caught ? 0.45 + pull * 0.55 : 0, damp(8, dt));
      const glowMaterial = view.glow.material as THREE.SpriteMaterial;
      glowMaterial.opacity = (0.55 + 0.35 * Math.sin(this.seaTime * 3 + view.id)) * (1 - Math.min(1, view.sinking));
      if (view.sinking > 1.3) {
        this.flotsamViews.delete(view.id);
        this.releaseFlotsam(view);
      }
    }
  }

  private updateLightning(dt: number): void {
    if (this.lightningSeq.length) {
      this.lightningSeq[0] -= dt;
      if (this.lightningSeq[0] <= 0) this.lightningSeq.shift();
    }
    // Flash levels follow the sequence: bright, dim, bright, then fade.
    const n = this.lightningSeq.length;
    const target = n === 4 ? 1 : n === 3 ? 0.25 : n === 2 ? 0.85 : 0;
    this.flash = n ? Math.max(target, this.flash - dt * 6) : Math.max(0, this.flash - dt * 2.2);
    this.lightningTimer -= dt;
    if (this.lightningTimer <= 0 && this.state !== 'over' && this.state !== 'dying') {
      this.lightningTimer = 8 + Math.random() * 10;
      this.lightningSeq = [0.07, 0.06, 0.09, 0.25];
      this.strike();
      if (this.state === 'running') this.onEvent('lightning');
    }
    const f = this.reducedMotion ? this.flash * 0.5 : this.flash;
    this.hemi.intensity = 0.85 + f * 3.2;
    this.flashLight.intensity = f * 3.5;
    this.fog.density = 0.016 - f * 0.011;
    this.background.copy(this.baseBackground).lerp(this.flashBackground, f * 0.75);
    this.fog.color.copy(this.baseFog).lerp(this.flashBackground, f * 0.6);
    this.rain.material.uniforms.uFlash.value = f;
    this.bolt.material.opacity = n ? f : 0;
    (this.boltFlash.material as THREE.SpriteMaterial).opacity = n ? f * 0.8 : 0;
  }

  private updateRain(dt: number): void {
    const drops = this.rainDrops;
    const count = drops.length / 3;
    const position = this.rain.geometry.getAttribute('position') as THREE.BufferAttribute;
    const array = position.array as Float32Array;
    const vx = -5, vy = -26, vz = 3.5;
    for (let i = 0; i < count; i++) {
      const j = i * 3;
      drops[j] += vx * dt;
      drops[j + 1] += vy * dt;
      drops[j + 2] += vz * dt;
      if (drops[j + 1] < -0.2) this.resetDrop(i);
      const k = i * 6;
      array[k] = drops[j]; array[k + 1] = drops[j + 1]; array[k + 2] = drops[j + 2];
      array[k + 3] = drops[j] - vx * 0.045; array[k + 4] = drops[j + 1] - vy * 0.045; array[k + 5] = drops[j + 2] - vz * 0.045;
    }
    position.needsUpdate = true;
  }

  private updateDying(dt: number): void {
    this.dyingTime += dt;
    // The lamp gutters and dies; the eyes keep coming.
    const k = clamp(1 - this.dyingTime / 1.6, 0, 1);
    this.lampPower = k * (0.6 + 0.4 * Math.random());
    if (this.dyingTime > 2.6) {
      this.state = 'over';
      this.lampPower = 0;
      const sim = this.sim;
      this.onOver({ score: sim.score, nights: sim.nightsSurvived, banished: sim.banished, night: Math.max(1, sim.night) });
    }
  }

  private updateBeam(t: number): void {
    const focus = this.state === 'running' || this.state === 'paused' ? this.sim.focus : 0;
    const half = this.sim.half;
    const sputter = this.state === 'running' && this.sim.oil < 12 && this.sim.focused ? 0.75 + 0.25 * Math.sin(t * 40) : 1;
    const power = (this.state === 'over' ? 0 : this.lampPower) * sputter;
    const dirX = Math.cos(this.beam), dirZ = Math.sin(this.beam);

    this.beamPivot.rotation.y = Math.PI / 2 - this.beam;
    this.beamVolume.material.uniforms.uIntensity.value = (0.22 + focus * 0.3) * power;
    this.beamVolume.visible = power > 0.01;

    this.beamUniforms.uBeamDir.value.set(dirX, dirZ);
    this.beamUniforms.uBeamHalf.value = half;
    this.beamUniforms.uBeamPower.value = (0.8 + focus * 0.8) * power;

    this.spot.angle = clamp(half * 1.2 + 0.06, 0.16, 0.66);
    this.spot.intensity = (55 + focus * 110) * power;
    this.spot.target.position.set(dirX * 14, 0, dirZ * 14);

    const pulse = 1 + Math.sin(t * 3) * 0.04;
    this.lampGlow.scale.setScalar((6 + focus * 3) * pulse * (0.15 + 0.85 * power));
    (this.lampGlow.material as THREE.SpriteMaterial).opacity = 0.15 + 0.85 * power;
    this.lampCore.material.color.setRGB(0.2 + 0.8 * power, (0.2 + 0.8 * power) * 0.95, (0.2 + 0.8 * power) * 0.82);
    this.lampLight.intensity = 8 * power;
    this.glassMaterial.emissiveIntensity = 0.1 + 0.6 * power;
    const lives = this.state === 'idle' ? MAX_LIVES : this.sim.lives;
    this.doorLight.intensity = (this.state === 'over' ? 0 : 2 + lives * 1.6) * (0.9 + 0.1 * Math.sin(t * 7));
  }

  private layout(width: number, height: number): void {
    this.width = width;
    this.height = height;
    const { camera } = this.stage;
    const aspect = width / height;
    camera.fov = aspect < 0.8 ? 56 : 46;
    camera.updateProjectionMatrix();
    const vHalf = THREE.MathUtils.degToRad(camera.fov / 2);
    const hHalf = Math.atan(Math.tan(vHalf) * aspect);
    // Keep the critical ring around the rock on screen; portrait screens may crop the far sides.
    const fitV = (12.5 * Math.sin(PLAY_PITCH) + 3) / Math.tan(vHalf);
    const fitH = (aspect < 0.8 ? 9.5 : 13) / Math.tan(hHalf);
    this.playDist = clamp(Math.max(fitV, fitH), 20, 60);
    this.wide = aspect > 1.15 && width >= 900;
    this.sparks.material.uniforms.uScale.value = (height * this.stage.renderer.getPixelRatio()) / (2 * Math.tan(vHalf));
    this.appliedShift = NaN;
  }

  private updateCamera(dt: number, t: number): void {
    const { camera } = this.stage;
    const idle = this.state === 'idle';
    const goalPitch = idle ? IDLE_PITCH : PLAY_PITCH;
    const goalDist = idle ? this.playDist * 1.02 : this.state === 'over' ? this.playDist * 0.95 : this.playDist;
    const goalY = idle ? 3.4 : 1.6;
    const goalShift = (idle || this.state === 'over') && this.wide ? 0.27 : 0;
    const goalYaw = idle ? Math.sin(t * 0.08) * 0.35 : 0;
    const k = this.cameraSnap ? 1 : damp(this.state === 'running' ? 2.2 : 1.6, dt);
    this.cameraSnap = false;
    this.camPitch = lerp(this.camPitch, goalPitch, k);
    this.camDist = lerp(this.camDist, goalDist, k);
    this.camTargetY = lerp(this.camTargetY, goalY, k);
    this.camYaw = lerp(this.camYaw, goalYaw, k);
    this.camShift = lerp(this.camShift, goalShift, k);
    if (this.state !== 'paused') this.shake = Math.max(0, this.shake - dt * 2.2);
    const s = this.state === 'paused' ? 0 : this.shake * this.shake * 0.7;
    const cp = Math.cos(this.camPitch);
    camera.position.set(
      Math.sin(this.camYaw) * cp * this.camDist + (Math.random() - 0.5) * s,
      Math.sin(this.camPitch) * this.camDist + this.camTargetY + (Math.random() - 0.5) * s,
      Math.cos(this.camYaw) * cp * this.camDist + (Math.random() - 0.5) * s,
    );
    camera.lookAt(0, this.camTargetY, 0);
    // On wide screens the picture slides right so the tower clears the menu panel.
    const shift = Math.round(this.camShift * this.width);
    if (shift !== this.appliedShift) {
      this.appliedShift = shift;
      if (shift === 0) camera.clearViewOffset();
      else camera.setViewOffset(this.width, this.height, -shift, 0, this.width, this.height);
    }
  }

  private popup(text: string, x: number, y: number, z: number): void {
    this.projected.set(x, y, z).project(this.stage.camera);
    if (this.projected.z > 1) return;
    this.onPopup(text, (this.projected.x * 0.5 + 0.5) * this.width, (-this.projected.y * 0.5 + 0.5) * this.height);
  }

  private emitHud(): void {
    const sim = this.sim;
    this.onHud({ score: sim.score, night: Math.max(1, sim.night), lives: sim.lives, oil: sim.oil, banished: sim.banished, focused: sim.focused });
  }
}
