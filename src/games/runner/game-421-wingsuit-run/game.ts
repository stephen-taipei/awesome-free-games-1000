import { THREE, createStage, createLoop, Keys, trackPointer, clamp, damp, lerp, rng, prefersReducedMotion, type Stage } from '../../../shared/three/kit';
import {
  ROW, ROWS_PER_CHUNK, CHUNK_LENGTH, OFFSETS, GRACE_TIME, MAX_CHARGES, BURST_TIME, V_MAX,
  createCourse, createRun, stepRun, triggerBurst, ensureCourse, autopilot, multiplier, gateBasis, createWarning, updateWarning,
  chunkLattice, surfaceHeight, centerX, floorY, halfWidthAt, lineX, lineY, windAt, segmentIndex, segmentStart,
  type Course, type Run, type RunEvent, type Gate, type Controls, type CrashCause, type Warning, type WarningState,
} from './logic';

export interface Hud {
  score: number;
  distance: number;
  speed: number;
  agl: number;
  climb: number;
  chain: number;
  mult: number;
  charges: number;
  segment: number;
  wind: number;
  grace: number;
  thermalAhead: number;
  warning: Warning;
  skimming: boolean;
}
export interface Result { score: number; distance: number; gates: number; gatesTotal: number; bestChain: number; segment: number; cause: CrashCause; }
export interface Marker { x: number; y: number; onScreen: boolean; angle: number; visible: boolean; }
export interface Stick { active: boolean; x: number; y: number; dx: number; dy: number; }

const CHUNKS = 7;
const COLUMNS = OFFSETS.length;
const GATE_SLOTS = 14;
const THERMAL_SLOTS = 6;
const THERMAL_PARTICLES = 220;
const CLOUDS = 14;
const SPARKS = 320;
const DUST = 120;
const STREAKS = 70;
const TRAIL = 46;
const STICK_RADIUS = 64;
/** A second finger counts as a burst only as a quick, still tap; a resting palm or a re-placed thumb does not. */
const TAP_MS = 280;
const TAP_SLOP = 12;
/** How often the HUD warning's look-ahead runs, s. */
const WARN_EVERY = 0.05;
const TRAIL_TINT = new THREE.Color('#ff9a5c');
const TRAIL_BURST_TINT = new THREE.Color('#7ee8ff');
const FORWARD = new THREE.Vector3(0, 0, -1);
const SNOW = new THREE.Color('#f1f5fa');

/** Time-of-day palettes, one per segment: sky top, horizon (and fog), sun colour. */
const SKIES = [
  { top: '#2f6fc0', horizon: '#c9def0', sun: '#fff1d0', light: 2.4 },
  { top: '#2a63b4', horizon: '#d4e0ea', sun: '#ffe8c0', light: 2.3 },
  { top: '#3a5fa8', horizon: '#e6dccc', sun: '#ffd9a0', light: 2.2 },
  { top: '#4a5b9c', horizon: '#efcfae', sun: '#ffc27a', light: 2.1 },
  { top: '#4b4f8e', horizon: '#f0b991', sun: '#ffab5e', light: 1.9 },
  { top: '#3c3f7c', horizon: '#e7a07f', sun: '#ff9550', light: 1.7 },
  { top: '#2c2f63', horizon: '#c98a80', sun: '#ff8a4a', light: 1.5 },
];

/**
 * Ground palettes, three segments each: green meadows, autumn larches, bare alpine slopes with a lower snow
 * line, then red dusk granite. Each new one blends in over the first 220 m of its segment.
 */
interface Biome { grassA: THREE.Color; grassB: THREE.Color; forest: THREE.Color; rockA: THREE.Color; rockB: THREE.Color; scree: THREE.Color; snow: number; }
const biome = (grassA: string, grassB: string, forest: string, rockA: string, rockB: string, scree: string, snow: number): Biome => ({
  grassA: new THREE.Color(grassA), grassB: new THREE.Color(grassB), forest: new THREE.Color(forest),
  rockA: new THREE.Color(rockA), rockB: new THREE.Color(rockB), scree: new THREE.Color(scree), snow,
});
const BIOMES = [
  biome('#5f8d3b', '#86a24a', '#2e5a2e', '#80776d', '#5a544f', '#a08f73', 190),
  biome('#8d8a3a', '#b89a44', '#8c4a20', '#85796b', '#5d554c', '#a88f6a', 175),
  biome('#6c7d55', '#93946a', '#34483a', '#7f7c7a', '#545458', '#9c958a', 135),
  biome('#7c7350', '#9a845a', '#4a4432', '#a2735f', '#6c4c42', '#b58a6b', 150),
];
const biomeOf = (segment: number) => Math.min(BIOMES.length - 1, Math.floor(segment / 3));

/** Low-poly wingsuit pilot: arm wings, leg wing, torso, helmet and feet, in one flat-shaded mesh. */
function wingsuitGeometry(): THREE.BufferGeometry {
  const positions: number[] = [];
  const colors: number[] = [];
  const color = new THREE.Color();
  const tri = (a: number[], b: number[], c: number[], hex: string) => {
    positions.push(...a, ...b, ...c);
    color.set(hex);
    for (let i = 0; i < 3; i++) colors.push(color.r, color.g, color.b);
  };
  const quad = (a: number[], b: number[], c: number[], d: number[], hex: string) => { tri(a, b, c, hex); tri(a, c, d, hex); };
  const suit = '#ff5a1f', dark = '#1f2733', stripe = '#ffd23f', under = '#c43c12';
  for (const side of [-1, 1]) {
    const m = (p: number[]) => [p[0] * side, p[1], p[2]];
    // Arm wing: shoulder, wrist and hip, with a yellow leading-edge stripe and a darker underside.
    tri(m([0.16, 0.03, -0.55]), m([0.95, 0.07, -0.2]), m([0.22, 0.01, 0.42]), suit);
    tri(m([0.16, 0.02, -0.55]), m([0.22, 0, 0.42]), m([0.95, 0.06, -0.2]), under);
    tri(m([0.16, 0.05, -0.6]), m([0.96, 0.09, -0.24]), m([0.95, 0.075, -0.16]), stripe);
    tri(m([0.95, 0.07, -0.2]), m([1.0, 0.07, -0.16]), m([0.9, 0.06, -0.05]), dark);
    // Feet.
    quad(m([0.12, 0.05, 1.08]), m([0.24, 0.05, 1.08]), m([0.24, 0.0, 1.25]), m([0.12, 0.0, 1.25]), dark);
  }
  // Leg wing between the legs, with a dark chevron.
  quad([-0.22, 0.01, 0.42], [0.22, 0.01, 0.42], [0.24, 0.03, 1.1], [-0.24, 0.03, 1.1], suit);
  quad([-0.22, 0, 0.42], [-0.24, 0.02, 1.1], [0.24, 0.02, 1.1], [0.22, 0, 0.42], under);
  tri([-0.2, 0.035, 0.85], [0.2, 0.035, 0.85], [0, 0.035, 1.02], dark);
  // Torso: a low ridge along the back.
  const back = [0, 0.15, -0.35], tail = [0, 0.09, 0.45], neck = [0, 0.1, -0.62];
  tri(neck, [0.17, 0.04, -0.5], back, dark);
  tri(neck, back, [-0.17, 0.04, -0.5], dark);
  tri(back, [0.17, 0.04, -0.5], [0.2, 0.03, 0.4], suit);
  tri(back, [-0.2, 0.03, 0.4], [-0.17, 0.04, -0.5], suit);
  tri(back, [0.2, 0.03, 0.4], tail, dark);
  tri(back, tail, [-0.2, 0.03, 0.4], dark);
  // Helmet: an octahedron with a dark visor facing forward.
  const h = [0, 0.1, -0.8];
  const p = (x: number, y: number, z: number) => [h[0] + x, h[1] + y, h[2] + z];
  const top = p(0, 0.13, 0), bottom = p(0, -0.09, 0), front = p(0, 0.01, -0.17), rear = p(0, 0.02, 0.13), left = p(-0.12, 0.02, 0), right = p(0.12, 0.02, 0);
  tri(top, front, right, '#f4f1e8'); tri(top, left, front, '#f4f1e8'); tri(top, right, rear, stripe); tri(top, rear, left, stripe);
  tri(bottom, right, front, '#16202b'); tri(bottom, front, left, '#16202b'); tri(bottom, rear, right, dark); tri(bottom, left, rear, dark);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.scale(1.35, 1.35, 1.35);
  geometry.computeVertexNormals();
  return geometry;
}

/** A puffy low-poly cloud made of a few merged icosahedrons. */
function cloudGeometry(): THREE.BufferGeometry {
  const parts: Array<[number, number, number, number, number]> = [[0, 0, 0, 1, 0.62], [1.1, -0.1, 0.2, 0.75, 0.5], [-1.05, -0.12, -0.1, 0.7, 0.48], [0.35, 0.3, -0.35, 0.6, 0.45]];
  const positions: number[] = [];
  for (const [x, y, z, r, sy] of parts) {
    const ico = new THREE.IcosahedronGeometry(r, 1);
    ico.scale(1, sy / r * 1.1, 1);
    ico.translate(x, y, z);
    positions.push(...(ico.getAttribute('position').array as Float32Array));
    ico.dispose();
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.computeVertexNormals();
  return geometry;
}

interface Chunk { mesh: THREE.Mesh<THREE.BufferGeometry, THREE.MeshLambertMaterial>; index: number; }
interface GateFx { gate: Gate; state: 'open' | 'passed' | 'missed'; t: number; }
interface Particle { life: number; max: number; vx: number; vy: number; vz: number; r: number; g: number; b: number; drag: number; gravity: number; }

const smoothstep = (a: number, b: number, x: number) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

export class RidgeGlider {
  onHud: (hud: Hud) => void = () => {};
  onOver: (result: Result) => void = () => {};
  onEvent: (event: RunEvent) => void = () => {};
  onMarker: (marker: Marker) => void = () => {};
  onStick: (stick: Stick) => void = () => {};
  /** Inverts the pitch input (flight-sim style: push up to dive). */
  invert = false;

  private stage: Stage;
  private keys = new Keys();
  private loop = createLoop((dt, t) => { if (!this.manual) this.frame(dt, t); });
  /** Test hook: when set, only debugAdvance moves the clock. */
  private manual = false;
  /** Test hook: the racing-line autopilot flies the run (for screenshots deep into the course). */
  private auto = false;
  private reducedMotion = prefersReducedMotion();
  private state: 'idle' | 'running' | 'paused' | 'dying' | 'over' = 'idle';
  private course!: Course;
  private run!: Run;
  private events: RunEvent[] = [];
  private time = 0;

  // Scene.
  private sky!: THREE.Mesh<THREE.SphereGeometry, THREE.ShaderMaterial>;
  private skyTop = new THREE.Color(SKIES[0].top);
  private skyHorizon = new THREE.Color(SKIES[0].horizon);
  private sunColor = new THREE.Color(SKIES[0].sun);
  private targetTop = new THREE.Color(SKIES[0].top);
  private targetHorizon = new THREE.Color(SKIES[0].horizon);
  private targetSun = new THREE.Color(SKIES[0].sun);
  private sunDir = new THREE.Vector3(-0.45, 0.42, -0.79).normalize();
  private sun = new THREE.DirectionalLight(0xffffff, SKIES[0].light);
  private hemi = new THREE.HemisphereLight(0xcfe3ff, 0x4a5a3a, 1.15);
  private fog!: THREE.Fog;
  private chunks: Chunk[] = [];
  /** The terrain lattice of one chunk (PlaneGeometry layout) and its triangle list, expanded into each chunk mesh. */
  private lattice = new Float32Array(COLUMNS * (ROWS_PER_CHUNK + 1) * 3);
  private latticeColor = new Float32Array(COLUMNS * (ROWS_PER_CHUNK + 1) * 3);
  private latticeIndex: ArrayLike<number> = [];
  private terrainMaterial = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
  private gates!: THREE.InstancedMesh;
  private halos!: THREE.InstancedMesh;
  private gateFx: GateFx[] = [];
  private thermals!: THREE.InstancedMesh;
  private thermalMaterial!: THREE.ShaderMaterial;
  private thermalDust!: THREE.Points;
  private thermalSeeds = new Float32Array(THERMAL_PARTICLES * 3);
  private clouds!: THREE.InstancedMesh;
  private cloudPlaces: Array<{ s: number; x: number; y: number; sx: number; sy: number; sz: number; spin: number }> = [];
  private player = new THREE.Group();
  private suit!: THREE.Mesh;
  private shadow!: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  private trail!: THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial>;
  /** Recent foot positions of each smoke ribbon, a ring buffer: `trailHead` is the newest sample. */
  private trailPoints = [0, 1].map(() => Array.from({ length: TRAIL }, () => new THREE.Vector3()));
  private trailHead = 0;
  private trailCount = 0;
  private trailTimer = 0;
  private streaks!: THREE.LineSegments<THREE.BufferGeometry, THREE.LineBasicMaterial>;
  private streakSeeds = new Float32Array(STREAKS * 3);
  private sparks!: THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial>;
  private sparkData: Particle[] = [];
  private sparkCursor = 0;
  private dust!: THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial>;
  private dustData: Particle[] = [];
  private dustCursor = 0;

  // Camera and feel.
  private camYaw = 0;
  private camPitch = 0;
  private camRoll = 0;
  private lookAt = new THREE.Vector3();
  private shake = 0;
  private fovKick = 0;
  private dyingTime = 0;
  private crashPoint = new THREE.Vector3();
  private crashCam = new THREE.Vector3();
  private cause: Result['cause'] = 'ground';
  private hudTimer = 0;
  private warnClock = 0;
  private warnState: WarningState = createWarning();
  private warning: Warning = null;
  private attractAngle = 0;
  private terrainFirst = NaN;
  private terrainDone = false;

  // Scratch objects, reused every frame so the hot paths allocate nothing.
  private m4 = new THREE.Matrix4();
  private quat = new THREE.Quaternion();
  private v1 = new THREE.Vector3();
  private v2 = new THREE.Vector3();
  private v3 = new THREE.Vector3();
  private v4 = new THREE.Vector3();
  private c1 = new THREE.Color();
  private c2 = new THREE.Color();
  private palette = { grassA: new THREE.Color(), grassB: new THREE.Color(), forest: new THREE.Color(), rockA: new THREE.Color(), rockB: new THREE.Color(), scree: new THREE.Color() };
  private visibleThermals: Course['thermals'] = [];

  // Input.
  private stick: Stick = { active: false, x: 0, y: 0, dx: 0, dy: 0 };
  /** Extra fingers that came down while steering: a burst if lifted again quickly without moving. */
  private taps = new Map<number, { time: number; x: number; y: number }>();
  private burstQueued = false;
  private lastControls: Controls = { pitch: 0, roll: 0 };

  static create(host: HTMLElement): RidgeGlider | null {
    const stage = createStage(host, { fov: 64, near: 0.3, far: 2400, maxPixelRatio: 1.75 });
    return stage ? new RidgeGlider(host, stage) : null;
  }

  private constructor(host: HTMLElement, stage: Stage) {
    this.stage = stage;
    stage.renderer.toneMappingExposure = 1.05;
    this.buildScene();
    // A quick tap with a second finger while steering fires the burst. Registered before trackPointer, so a
    // finger that is about to become the stick (none is active yet) is never taken for a tap.
    host.addEventListener('pointerdown', event => {
      if (this.stick.active && this.state === 'running') this.taps.set(event.pointerId, { time: performance.now(), x: event.clientX, y: event.clientY });
    });
    host.addEventListener('pointermove', event => {
      const tap = this.taps.get(event.pointerId);
      if (tap && Math.hypot(event.clientX - tap.x, event.clientY - tap.y) > TAP_SLOP) this.taps.delete(event.pointerId);
    });
    // A finger can lift over the overlay (the run ended meanwhile), so listen on the window.
    const release = (event: PointerEvent) => {
      const tap = this.taps.get(event.pointerId);
      if (!tap) return;
      this.taps.delete(event.pointerId);
      if (event.type === 'pointerup' && performance.now() - tap.time < TAP_MS && this.state === 'running') this.burstQueued = true;
    };
    window.addEventListener('pointerup', release);
    window.addEventListener('pointercancel', release);
    trackPointer(host, {
      down: (x, y) => { this.stick = { active: true, x, y, dx: 0, dy: 0 }; this.onStick(this.stick); },
      drag: (_dx, _dy, x, y) => {
        if (!this.stick.active) return;
        let dx = x - this.stick.x;
        let dy = y - this.stick.y;
        const length = Math.hypot(dx, dy);
        // A stick that drifts past its rim drags its centre along, so reversing is always quick.
        if (length > STICK_RADIUS) {
          const over = length - STICK_RADIUS;
          this.stick.x += (dx / length) * over;
          this.stick.y += (dy / length) * over;
          dx = x - this.stick.x;
          dy = y - this.stick.y;
        }
        this.stick.dx = dx / STICK_RADIUS;
        this.stick.dy = dy / STICK_RADIUS;
        this.onStick(this.stick);
      },
      up: () => { this.stick = { active: false, x: 0, y: 0, dx: 0, dy: 0 }; this.onStick(this.stick); },
    });
    this.newDemo();
    this.loop.start();
  }

  get status() { return this.state; }

  // ---------------------------------------------------------------------------------------------------
  // Scene construction

  private buildScene(): void {
    const { scene } = this.stage;
    this.fog = new THREE.Fog(this.skyHorizon.clone(), 260, 1150);
    scene.fog = this.fog;
    scene.background = this.skyHorizon.clone();

    this.sky = new THREE.Mesh(new THREE.SphereGeometry(2000, 32, 16), new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      uniforms: { uTop: { value: this.skyTop }, uHorizon: { value: this.skyHorizon }, uSun: { value: this.sunDir }, uSunColor: { value: this.sunColor } },
      vertexShader: /* glsl */`
        varying vec3 vDir;
        void main() {
          vDir = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: /* glsl */`
        uniform vec3 uTop; uniform vec3 uHorizon; uniform vec3 uSun; uniform vec3 uSunColor;
        varying vec3 vDir;
        void main() {
          vec3 d = normalize(vDir);
          vec3 col = mix(uHorizon, uTop, smoothstep(0.0, 0.5, d.y));
          float s = max(dot(d, uSun), 0.0);
          col += uSunColor * (pow(s, 900.0) * 4.0 + pow(s, 24.0) * 0.28 + pow(s, 4.0) * 0.08);
          gl_FragColor = vec4(col, 1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
    }));
    this.sky.renderOrder = -1;
    this.sky.frustumCulled = false;
    scene.add(this.sky);

    this.sun.position.copy(this.sunDir).multiplyScalar(100);
    scene.add(this.sun, this.sun.target, this.hemi);

    // Terrain chunks are non-indexed copies of the PlaneGeometry lattice's triangles (the ones logic.ts
    // surfaceHeight collides with), so every face can carry its own colour: a crisp low-poly look.
    const plane = new THREE.PlaneGeometry(1, 1, COLUMNS - 1, ROWS_PER_CHUNK);
    this.latticeIndex = plane.getIndex()!.array;
    plane.dispose();
    for (let i = 0; i < CHUNKS; i++) {
      const geometry = new THREE.BufferGeometry();
      const vertices = this.latticeIndex.length;
      geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(vertices * 3), 3));
      geometry.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(vertices * 3), 3));
      geometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(vertices * 3), 3));
      const mesh = new THREE.Mesh(geometry, this.terrainMaterial);
      scene.add(mesh);
      this.chunks.push({ mesh, index: -999 });
    }

    // Gates: glowing rings plus a soft halo, both instanced.
    // The ring's opacity rides on its colour (a fading ring fades out), on the fog distance and on the
    // distance to the camera, so the ring the glider just flew through never fills the screen.
    this.gates = new THREE.InstancedMesh(new THREE.TorusGeometry(1, 0.075, 8, 32), new THREE.ShaderMaterial({
      transparent: true, toneMapped: false,
      uniforms: { uFar: { value: 1100 } },
      vertexShader: /* glsl */`
        varying vec3 vColor; varying float vDepth;
        void main() {
          vColor = instanceColor;
          vec4 mv = modelViewMatrix * instanceMatrix * vec4(position, 1.0);
          vDepth = -mv.z;
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: /* glsl */`
        uniform float uFar;
        varying vec3 vColor; varying float vDepth;
        void main() {
          float a = clamp(max(vColor.r, max(vColor.g, vColor.b)) * 2.5, 0.0, 1.0);
          a *= (1.0 - smoothstep(uFar * 0.6, uFar, vDepth)) * smoothstep(5.0, 20.0, vDepth);
          gl_FragColor = vec4(vColor, a);
          #include <colorspace_fragment>
        }`,
    }), GATE_SLOTS);
    this.halos = new THREE.InstancedMesh(new THREE.PlaneGeometry(2.9, 2.9), new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      uniforms: { uFar: { value: 1100 } },
      vertexShader: /* glsl */`
        varying vec2 vUv; varying vec3 vColor; varying float vDepth;
        void main() {
          vUv = uv;
          vColor = instanceColor;
          vec4 mv = modelViewMatrix * instanceMatrix * vec4(position, 1.0);
          vDepth = -mv.z;
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: /* glsl */`
        uniform float uFar;
        varying vec2 vUv; varying vec3 vColor; varying float vDepth;
        void main() {
          float r = length(vUv * 2.0 - 1.0) * 1.45;
          float ring = exp(-pow((r - 1.0) / 0.16, 2.0));
          float veil = (1.0 - smoothstep(0.0, 1.0, r)) * 0.12;
          // Fades out in the fog and also right before the camera flies through, so a ring never glares over the view.
          float a = (ring * 0.85 + veil) * (1.0 - smoothstep(uFar * 0.6, uFar, vDepth)) * smoothstep(5.0, 24.0, vDepth);
          gl_FragColor = vec4(vColor, a);
          #include <colorspace_fragment>
        }`,
    }), GATE_SLOTS);
    const black = new THREE.Color(0, 0, 0);
    for (let i = 0; i < GATE_SLOTS; i++) { this.gates.setColorAt(i, black); this.halos.setColorAt(i, black); }
    for (const mesh of [this.gates, this.halos]) { mesh.frustumCulled = false; mesh.count = 0; scene.add(mesh); }

    // Thermals: translucent columns with rising bands, and warm motes rising inside them.
    const column = new THREE.CylinderGeometry(1, 1, 1, 24, 6, true);
    column.translate(0, 0.5, 0);
    this.thermalMaterial = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      uniforms: { uTime: { value: 0 }, uColor: { value: new THREE.Color('#ffb46b') }, uFar: { value: 1150 } },
      vertexShader: /* glsl */`
        varying vec2 vUv; varying float vEdge; varying float vDepth;
        void main() {
          vUv = uv;
          vec4 mv = modelViewMatrix * instanceMatrix * vec4(position, 1.0);
          vec3 n = normalize(mat3(modelViewMatrix) * mat3(instanceMatrix) * normal);
          vEdge = 1.0 - abs(dot(n, normalize(-mv.xyz)));
          vDepth = -mv.z;
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: /* glsl */`
        uniform float uTime; uniform vec3 uColor; uniform float uFar;
        varying vec2 vUv; varying float vEdge; varying float vDepth;
        void main() {
          float bands = 0.55 + 0.45 * sin((vUv.y * 9.0 - uTime * 0.9) * 6.2831 + vUv.x * 12.566);
          float height = smoothstep(0.0, 0.1, vUv.y) * (1.0 - smoothstep(0.62, 1.0, vUv.y));
          float edge = 0.18 + 0.82 * pow(vEdge, 1.6);
          // Thin out close up: inside a column the motes, the vario and the climb carry the feedback.
          float a = height * edge * bands * 0.3 * (1.0 - smoothstep(uFar * 0.55, uFar, vDepth)) * (0.15 + 0.85 * smoothstep(15.0, 90.0, vDepth));
          gl_FragColor = vec4(uColor, a);
          #include <colorspace_fragment>
        }`,
    });
    this.thermals = new THREE.InstancedMesh(column, this.thermalMaterial, THERMAL_SLOTS);
    this.thermals.frustumCulled = false;
    this.thermals.count = 0;
    scene.add(this.thermals);
    const dustPositions = new Float32Array(THERMAL_PARTICLES * 3);
    for (let i = 0; i < THERMAL_PARTICLES; i++) this.thermalSeeds.set([Math.random(), Math.random(), Math.random()], i * 3);
    const thermalGeometry = new THREE.BufferGeometry();
    thermalGeometry.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));
    // Motes with a capped on-screen size that fade out close to the camera, so flying through a column
    // never smears big blobs over the view.
    this.thermalDust = new THREE.Points(thermalGeometry, new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { uColor: { value: new THREE.Color(0xffd29a) }, uScale: { value: 400 } },
      vertexShader: /* glsl */`
        uniform float uScale; varying float vFade;
        void main() {
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          float d = max(0.1, -mv.z);
          gl_PointSize = min(2.2 * uScale / d, 14.0);
          vFade = smoothstep(5.0, 16.0, d) * (1.0 - smoothstep(650.0, 1050.0, d));
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: /* glsl */`
        uniform vec3 uColor; varying float vFade;
        void main() {
          float r = length(gl_PointCoord - 0.5) * 2.0;
          float a = 1.0 - smoothstep(0.0, 1.0, r);
          gl_FragColor = vec4(uColor * a * a * 0.8 * vFade, 1.0);
          #include <colorspace_fragment>
        }`,
    }));
    this.thermalDust.frustumCulled = false;
    scene.add(this.thermalDust);

    this.clouds = new THREE.InstancedMesh(cloudGeometry(), new THREE.MeshLambertMaterial({ color: 0xffffff, emissive: 0x6d7f96, emissiveIntensity: 0.55, flatShading: true }), CLOUDS);
    this.clouds.frustumCulled = false;
    scene.add(this.clouds);

    // Player.
    this.suit = new THREE.Mesh(wingsuitGeometry(), new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true, side: THREE.DoubleSide }));
    this.player.add(this.suit);
    this.player.rotation.order = 'YXZ';
    scene.add(this.player);

    const shadowCanvas = document.createElement('canvas');
    shadowCanvas.width = shadowCanvas.height = 64;
    const sctx = shadowCanvas.getContext('2d')!;
    const sg = sctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    sg.addColorStop(0, 'rgba(0,0,0,0.55)');
    sg.addColorStop(1, 'rgba(0,0,0,0)');
    sctx.fillStyle = sg;
    sctx.fillRect(0, 0, 64, 64);
    const shadowGeometry = new THREE.PlaneGeometry(1, 1);
    shadowGeometry.rotateX(-Math.PI / 2);
    this.shadow = new THREE.Mesh(shadowGeometry, new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(shadowCanvas), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, fog: true }));
    scene.add(this.shadow);

    // Smoke ribbons from both feet: one strip geometry, rebuilt each frame from the recent foot positions.
    const trailGeometry = new THREE.BufferGeometry();
    const count = 2 * TRAIL * 2;
    trailGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
    trailGeometry.setAttribute('alpha', new THREE.BufferAttribute(new Float32Array(count), 1));
    const indices: number[] = [];
    for (let strip = 0; strip < 2; strip++) {
      const base = strip * TRAIL * 2;
      for (let i = 0; i < TRAIL - 1; i++) {
        const a = base + i * 2;
        indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
      }
    }
    trailGeometry.setIndex(indices);
    this.trail = new THREE.Mesh(trailGeometry, new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, side: THREE.DoubleSide,
      uniforms: { uColor: { value: new THREE.Color('#ff9a5c') } },
      vertexShader: /* glsl */`
        attribute float alpha; varying float vAlpha;
        void main() { vAlpha = alpha; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: /* glsl */`
        uniform vec3 uColor; varying float vAlpha;
        void main() {
          gl_FragColor = vec4(uColor, vAlpha);
          #include <colorspace_fragment>
        }`,
    }));
    this.trail.frustumCulled = false;
    scene.add(this.trail);

    const streakGeometry = new THREE.BufferGeometry();
    streakGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(STREAKS * 6), 3));
    for (let i = 0; i < STREAKS * 3; i++) this.streakSeeds[i] = Math.random();
    this.streaks = new THREE.LineSegments(streakGeometry, new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false, fog: false }));
    this.streaks.frustumCulled = false;
    scene.add(this.streaks);

    // Soft round particles; their on-screen size is capped and they fade right next to the camera.
    const makePoints = (n: number, size: number, additive: boolean) => {
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3).fill(-1e5), 3));
      geometry.setAttribute('tint', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
      geometry.setAttribute('fade', new THREE.BufferAttribute(new Float32Array(n), 1));
      const points = new THREE.Points(geometry, new THREE.ShaderMaterial({
        transparent: true, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
        uniforms: { uSize: { value: size }, uScale: { value: 400 } },
        vertexShader: /* glsl */`
          attribute vec3 tint; attribute float fade;
          uniform float uSize; uniform float uScale;
          varying vec3 vTint; varying float vAlpha;
          void main() {
            vec4 mv = modelViewMatrix * vec4(position, 1.0);
            float d = max(0.1, -mv.z);
            gl_PointSize = min(uSize * uScale / d, 26.0);
            vTint = tint;
            vAlpha = fade * smoothstep(3.0, 10.0, d);
            gl_Position = projectionMatrix * mv;
          }`,
        fragmentShader: /* glsl */`
          varying vec3 vTint; varying float vAlpha;
          void main() {
            float r = length(gl_PointCoord - 0.5) * 2.0;
            float a = 1.0 - smoothstep(0.0, 1.0, r);
            a *= a * vAlpha;
            ${additive ? 'gl_FragColor = vec4(vTint * a, 1.0);' : 'gl_FragColor = vec4(vTint, a * 0.6);'}
            #include <colorspace_fragment>
          }`,
      }));
      points.frustumCulled = false;
      scene.add(points);
      return points;
    };
    this.sparks = makePoints(SPARKS, 1.1, true);
    this.dust = makePoints(DUST, 4.5, false);
    for (let i = 0; i < SPARKS; i++) this.sparkData.push({ life: 0, max: 1, vx: 0, vy: 0, vz: 0, r: 0, g: 0, b: 0, drag: 0, gravity: 0 });
    for (let i = 0; i < DUST; i++) this.dustData.push({ life: 0, max: 1, vx: 0, vy: 0, vz: 0, r: 0, g: 0, b: 0, drag: 0, gravity: 0 });
  }

  // ---------------------------------------------------------------------------------------------------
  // Runs

  private setCourse(seed: number): void {
    this.course = createCourse(seed, rng);
    this.run = createRun(this.course);
    this.gateFx = [];
    for (const chunk of this.chunks) chunk.index = -999;
    this.terrainFirst = NaN;
    this.cloudPlaces = [];
    this.trailCount = 0;
    const f = this.run.flight;
    this.camYaw = f.heading;
    this.camPitch = 0;
    this.camRoll = 0;
    this.setSky(0, true);
    this.updateTerrain(true);
  }

  private newDemo(): void {
    this.setCourse((Math.random() * 1e9) >>> 0);
    // The demo glides the racing line, already past the warm-up.
    this.run.time = GRACE_TIME;
    this.state = 'idle';
    this.placeCamera(true);
  }

  start(): void {
    this.setCourse((Date.now() ^ (Math.random() * 1e9)) >>> 0);
    this.keys.clear();
    this.taps.clear();
    this.burstQueued = false;
    this.warnState = createWarning();
    this.warning = null;
    this.warnClock = 0;
    this.state = 'running';
    this.time = 0;
    this.shake = 0;
    this.fovKick = 0;
    this.player.visible = true;
    this.placeCamera(true);
    this.emitHud();
    this.loop.start();
  }

  pause(): void { if (this.state === 'running') { this.state = 'paused'; this.stick.active = false; this.onStick(this.stick); } }
  resume(): void { if (this.state === 'paused') { this.keys.clear(); this.taps.clear(); this.burstQueued = false; this.state = 'running'; } }

  /** Fires a burst (keyboard Space, the on-screen button or a second finger). */
  burst(): void { if (this.state === 'running') this.burstQueued = true; }

  // ---------------------------------------------------------------------------------------------------
  // Frame

  private frame(dt: number, elapsed: number, render = true): void {
    this.time += dt;
    const running = this.state === 'running';
    if (running) {
      if (this.keys.consume('Space')) this.burstQueued = true;
      this.events.length = 0;
      if (this.burstQueued) { this.burstQueued = false; triggerBurst(this.run, this.events); }
      this.lastControls = this.controls();
      stepRun(this.run, this.lastControls, dt, this.events);
      this.handleEvents();
    } else if (this.state === 'idle') {
      this.events.length = 0;
      stepRun(this.run, autopilot(this.course, this.run.flight, { mode: 'line' }), dt, this.events);
      if (this.run.crashed || this.run.flight.s > 9000) this.newDemo();
    } else if (this.state === 'dying') {
      this.dyingTime += dt;
      if (this.dyingTime > 1.5) {
        this.state = 'over';
        this.onOver(this.result());
      }
    }

    const simulating = this.state === 'running' || this.state === 'idle' || this.state === 'dying';
    if (simulating) {
      this.updateTerrain(false);
      this.updateParticles(dt);
    }
    this.updateSky(dt);
    this.updateGates(dt);
    this.updateThermals(simulating ? dt : 0, elapsed);
    this.updateClouds();
    this.updatePlayer(dt, simulating);
    this.updateCamera(dt);
    this.updateStreaks(simulating ? dt : 0);
    if (render) this.stage.render();

    // Re-read the state: a crash during this step has already switched it to 'dying' and hidden the marker.
    if (this.state === 'running') {
      // The look-ahead assumes the pilot keeps the current input for a reaction time, then pulls all out.
      this.warnClock += dt;
      if (this.warnClock >= WARN_EVERY) {
        this.warning = updateWarning(this.warnState, this.run, this.lastControls, this.warnClock);
        this.warnClock = 0;
      }
      this.hudTimer -= dt;
      if (this.hudTimer <= 0) { this.hudTimer = 0.1; this.emitHud(); }
      this.emitMarker();
    }
  }

  private controls(): Controls {
    if (this.auto) return autopilot(this.course, this.run.flight, { mode: 'line' });
    let pitch = (this.keys.isDown('ArrowUp', 'KeyW') ? 1 : 0) - (this.keys.isDown('ArrowDown', 'KeyS') ? 1 : 0);
    let roll = (this.keys.isDown('ArrowRight', 'KeyD') ? 1 : 0) - (this.keys.isDown('ArrowLeft', 'KeyA') ? 1 : 0);
    if (this.stick.active) {
      const dead = (v: number) => (Math.abs(v) < 0.12 ? 0 : Math.sign(v) * Math.min(1, (Math.abs(v) - 0.12) / 0.88));
      // Drag up to climb, down to dive; sideways to bank.
      pitch = -dead(this.stick.dy);
      roll = dead(this.stick.dx);
    }
    return { pitch: this.invert ? -pitch : pitch, roll };
  }

  private handleEvents(): void {
    for (const event of this.events) {
      const f = this.run.flight;
      if (event.type === 'gate') {
        const fx = this.gateFx.find(g => g.gate === event.gate);
        if (fx) { fx.state = 'passed'; fx.t = 0; }
        this.emitRingSparks(event.gate, 30 + event.mult * 6, [1, 0.82, 0.35]);
        this.fovKick = Math.max(this.fovKick, this.reducedMotion ? 0 : 2.5);
      } else if (event.type === 'miss') {
        const fx = this.gateFx.find(g => g.gate === event.gate);
        if (fx) { fx.state = 'missed'; fx.t = 0; }
      } else if (event.type === 'burst') {
        this.fovKick = this.reducedMotion ? 2 : 9;
        this.emitSparks(f.x, f.y, -f.s, 40, [0.5, 0.9, 1], 14, 0.6);
      } else if (event.type === 'charge') {
        this.emitSparks(f.x, f.y + 1, -f.s, 24, [0.6, 1, 0.9], 6, 0.8);
      } else if (event.type === 'segment') {
        this.setSky(event.index, false);
      } else if (event.type === 'bounce') {
        this.shake = this.reducedMotion ? 0 : 0.6;
        this.emitDust(f.x, f.y - 6, -f.s, 26, 8);
        this.emitSparks(f.x, f.y, -f.s, 30, [1, 1, 1], 10, 0.7);
      } else if (event.type === 'crash') {
        this.crash(event.cause);
      }
      this.onEvent(event);
    }
  }

  private crash(cause: CrashCause): void {
    const f = this.run.flight;
    this.state = 'dying';
    this.dyingTime = 0;
    this.shake = this.reducedMotion ? 0 : 1.2;
    this.player.visible = false;
    this.crashPoint.set(f.x, f.y, -f.s);
    // The camera backs off along the approach and rises, so the result screen shows where the flight ended.
    const camS = f.s - Math.cos(f.heading) * 24;
    const camX = f.x - Math.sin(f.heading) * 24;
    this.crashCam.set(camX, Math.max(f.y + 11, surfaceHeight(this.course, camS, camX) + 6), -camS);
    this.cause = cause;
    this.emitSparks(f.x, f.y, -f.s, 90, [1, 0.45, 0.15], 22, 1.2);
    this.emitDust(f.x, f.y, -f.s, 60, 14);
    this.warning = null;
    this.emitHud();
    this.onMarker({ x: 0, y: 0, onScreen: false, angle: 0, visible: false });
  }

  private result(): Result {
    const run = this.run;
    return {
      score: Math.floor(run.score),
      distance: Math.floor(Math.max(0, run.flight.s)),
      gates: run.gatesPassed,
      gatesTotal: run.gatesPassed + run.gatesMissed,
      bestChain: run.bestChain,
      segment: run.segment + 1,
      cause: this.cause,
    };
  }

  // ---------------------------------------------------------------------------------------------------
  // World

  private updateTerrain(force: boolean): void {
    const first = Math.floor((this.run.flight.s - 70) / CHUNK_LENGTH);
    // Nothing to do until the glider crosses into the next chunk (or a rebuild is still pending).
    if (!force && first === this.terrainFirst && this.terrainDone) return;
    this.terrainFirst = first;
    const wanted = new Set<number>();
    for (let i = 0; i < CHUNKS; i++) wanted.add(first + i);
    const free = this.chunks.filter(chunk => !wanted.has(chunk.index));
    for (const chunk of this.chunks) wanted.delete(chunk.index);
    // Rebuild the nearest missing chunk first; outside a reset, at most one per frame.
    const missing = [...wanted].sort((a, b) => a - b);
    let budget = force ? CHUNKS : 1;
    let built = 0;
    for (const index of missing) {
      const chunk = free.shift();
      if (!chunk || budget-- <= 0) break;
      this.buildChunk(chunk, index);
      built++;
    }
    this.terrainDone = built === missing.length;
  }

  private buildChunk(chunk: Chunk, index: number): void {
    const course = this.course;
    const s0 = index * CHUNK_LENGTH;
    ensureCourse(course, s0 + CHUNK_LENGTH + 200);
    const p = chunkLattice(course, s0, ROWS_PER_CHUNK, this.lattice);
    const c = this.latticeColor;
    const { grassA, grassB, forest, rockA, rockB, scree } = this.palette;
    const snow = SNOW, tmp = this.c1, tmp2 = this.c2;
    const rows = ROWS_PER_CHUNK + 1;
    for (let iy = 0; iy < rows; iy++) {
      const snowLine = this.setPalette(s0 + (rows - 1 - iy) * ROW);
      for (let ix = 0; ix < COLUMNS; ix++) {
        const i = iy * COLUMNS + ix;
        const x = p[i * 3], y = p[i * 3 + 1], s = -p[i * 3 + 2];
        const l = Math.max(0, ix - 1), r = Math.min(COLUMNS - 1, ix + 1);
        const gx = (p[(iy * COLUMNS + r) * 3 + 1] - p[(iy * COLUMNS + l) * 3 + 1]) / Math.max(1, p[(iy * COLUMNS + r) * 3] - p[(iy * COLUMNS + l) * 3]);
        const u = Math.max(0, iy - 1), d = Math.min(rows - 1, iy + 1);
        const gs = (p[(u * COLUMNS + ix) * 3 + 1] - p[(d * COLUMNS + ix) * 3 + 1]) / Math.max(1, (d - u) * ROW);
        const steep = Math.hypot(gx, gs);
        const rel = y - floorY(s);
        const n1 = course.noise(s * 0.045, x * 0.045) * 0.5 + 0.5;
        const n2 = course.noise(s * 0.012 + 70, x * 0.012 - 30);
        tmp.copy(grassA).lerp(grassB, n1);
        if (n2 > 0.25 && rel < 70) tmp.lerp(forest, smoothstep(0.25, 0.5, n2) * 0.85);
        tmp2.copy(rockA).lerp(rockB, n1);
        tmp.lerp(scree, smoothstep(0.3, 0.55, steep) * 0.7);
        tmp.lerp(tmp2, smoothstep(0.5, 0.95, steep));
        tmp.lerp(snow, smoothstep(snowLine, snowLine + 60, rel + n2 * 45) * (1 - smoothstep(1.3, 2.2, steep) * 0.6));
        // Darker toward the valley floor's centre for depth, lighter up high.
        const shade = 0.86 + 0.14 * smoothstep(0, 60, rel);
        c[i * 3] = tmp.r * shade;
        c[i * 3 + 1] = tmp.g * shade;
        c[i * 3 + 2] = tmp.b * shade;
      }
    }
    // Expand the lattice into flat-coloured faces: each takes the mean of its corners plus a small, stable
    // brightness jitter (hashed from its place on the course, so a rebuilt chunk looks the same).
    const geometry = chunk.mesh.geometry;
    const position = geometry.getAttribute('position') as THREE.BufferAttribute;
    const color = geometry.getAttribute('color') as THREE.BufferAttribute;
    const out = position.array as Float32Array;
    const outColor = color.array as Float32Array;
    const tris = this.latticeIndex;
    for (let t = 0; t < tris.length; t += 3) {
      const a = tris[t], b = tris[t + 1], e = tris[t + 2];
      const row = index * ROWS_PER_CHUNK + (ROWS_PER_CHUNK - Math.floor(a / COLUMNS));
      const hash = Math.sin(row * 127.1 + (a % COLUMNS) * 311.7 + (t % 6) * 74.7) * 43758.5453;
      const jitter = 0.93 + 0.14 * (hash - Math.floor(hash));
      const r = ((c[a * 3] + c[b * 3] + c[e * 3]) / 3) * jitter;
      const g = ((c[a * 3 + 1] + c[b * 3 + 1] + c[e * 3 + 1]) / 3) * jitter;
      const bl = ((c[a * 3 + 2] + c[b * 3 + 2] + c[e * 3 + 2]) / 3) * jitter;
      for (let k = 0; k < 3; k++) {
        const v = tris[t + k];
        const o = (t + k) * 3;
        out[o] = p[v * 3]; out[o + 1] = p[v * 3 + 1]; out[o + 2] = p[v * 3 + 2];
        outColor[o] = r; outColor[o + 1] = g; outColor[o + 2] = bl;
      }
    }
    position.needsUpdate = true;
    color.needsUpdate = true;
    // Non-indexed: the computed normals are the face normals.
    geometry.computeVertexNormals();
    geometry.computeBoundingSphere();
    chunk.index = index;
  }

  /** Sets `palette` to the ground colours at `s` (a blend while a new biome comes in) and returns the snow line. */
  private setPalette(s: number): number {
    const segment = segmentIndex(s);
    const now = BIOMES[biomeOf(segment)];
    const before = BIOMES[biomeOf(Math.max(0, segment - 1))];
    const t = now === before ? 1 : clamp((s - segmentStart(segment)) / 220, 0, 1);
    const p = this.palette;
    for (const key of ['grassA', 'grassB', 'forest', 'rockA', 'rockB', 'scree'] as const) p[key].copy(before[key]).lerp(now[key], t);
    return lerp(before.snow, now.snow, t);
  }

  private setSky(segment: number, instant: boolean): void {
    const sky = SKIES[Math.min(segment, SKIES.length - 1)];
    this.targetTop.set(sky.top);
    this.targetHorizon.set(sky.horizon);
    this.targetSun.set(sky.sun);
    this.sun.intensity = sky.light;
    if (instant) {
      this.skyTop.copy(this.targetTop);
      this.skyHorizon.copy(this.targetHorizon);
      this.sunColor.copy(this.targetSun);
    }
  }

  private updateSky(dt: number): void {
    const k = damp(0.6, dt);
    this.skyTop.lerp(this.targetTop, k);
    this.skyHorizon.lerp(this.targetHorizon, k);
    this.sunColor.lerp(this.targetSun, k);
    this.fog.color.copy(this.skyHorizon);
    (this.stage.scene.background as THREE.Color).copy(this.skyHorizon);
    this.sun.color.copy(this.sunColor);
    this.sky.position.copy(this.stage.camera.position);
    const f = this.run.flight;
    this.sun.position.set(f.x + this.sunDir.x * 100, f.y + this.sunDir.y * 100, -f.s + this.sunDir.z * 100);
    this.sun.target.position.set(f.x, f.y, -f.s);
  }

  private updateGates(dt: number): void {
    const f = this.run.flight;
    const course = this.course;
    // Track the gates in view: from just behind the glider to the fog line.
    for (let i = this.run.nextGate; i < course.gates.length; i++) {
      const gate = course.gates[i];
      if (gate.s > f.s + 1000) break;
      if (!this.gateFx.some(fx => fx.gate === gate)) this.gateFx.push({ gate, state: 'open', t: 0 });
    }
    // Drop the rings that are behind (or done fading), in place.
    let kept = 0;
    for (const fx of this.gateFx) if (fx.state === 'open' ? fx.gate.s > f.s - 40 : fx.t < 0.7) this.gateFx[kept++] = fx;
    this.gateFx.length = kept;
    this.gateFx.sort((a, b) => a.gate.s - b.gate.s);
    const matrix = this.m4;
    const quaternion = this.quat;
    const scale = this.v1;
    const position = this.v2;
    const dir = this.v3;
    const color = this.c1;
    const halo = this.c2;
    const next = course.gates[this.run.nextGate];
    const pulse = this.reducedMotion ? 1 : 0.85 + 0.15 * Math.sin(this.time * 2 * Math.PI * 1.2);
    let n = 0;
    for (let ahead = 0; ahead < this.gateFx.length; ahead++) {
      const fx = this.gateFx[ahead];
      if (n >= GATE_SLOTS) break;
      fx.t += dt;
      const gate = fx.gate;
      dir.set(gate.dx, gate.dy, -1).normalize();
      quaternion.setFromUnitVectors(FORWARD, dir);
      position.set(gate.x, gate.y, -gate.s);
      let size = gate.r;
      if (fx.state === 'open') {
        const isNext = gate === next;
        color.setRGB(1, 0.78, 0.28).multiplyScalar(isNext ? 1.6 * pulse : Math.max(0.45, 1 - ahead * 0.12));
        halo.setRGB(1, 0.7, 0.25).multiplyScalar(isNext ? 0.9 * pulse : 0.28);
      } else if (fx.state === 'passed') {
        const k = clamp(fx.t / 0.6, 0, 1);
        size *= 1 + k * 0.25;
        color.setRGB(1, 0.95, 0.7).multiplyScalar((this.reducedMotion ? 1 : 1.5) * (1 - k));
        halo.setRGB(1, 0.9, 0.5).multiplyScalar(1.4 * (1 - k));
      } else {
        // A missed ring dims to red and shrinks away.
        const k = clamp(fx.t / 0.45, 0, 1);
        size *= 1 - k * 0.45;
        color.setRGB(1, 0.25, 0.18).multiplyScalar(0.9 * (1 - k));
        halo.setRGB(1, 0.1, 0.05).multiplyScalar(0.4 * (1 - k));
      }
      scale.set(size, size, size);
      matrix.compose(position, quaternion, scale);
      this.gates.setMatrixAt(n, matrix);
      this.halos.setMatrixAt(n, matrix);
      this.gates.setColorAt(n, color);
      this.halos.setColorAt(n, halo);
      n++;
    }
    for (const mesh of [this.gates, this.halos]) {
      mesh.count = n;
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }
  }

  private updateThermals(dt: number, elapsed: number): void {
    const f = this.run.flight;
    const visible = this.visibleThermals;
    visible.length = 0;
    for (const t of this.course.thermals) {
      if (t.s - t.rs >= f.s + 1100 || visible.length >= THERMAL_SLOTS) break;
      if (t.s + t.rs > f.s - 60) visible.push(t);
    }
    const matrix = this.m4;
    for (let i = 0; i < visible.length; i++) {
      const t = visible[i];
      matrix.makeScale(t.rx, t.top - t.base, t.rs);
      matrix.setPosition(t.x, t.base, -t.s);
      this.thermals.setMatrixAt(i, matrix);
    }
    this.thermals.count = visible.length;
    this.thermals.instanceMatrix.needsUpdate = true;
    this.thermalMaterial.uniforms.uTime.value = this.reducedMotion ? elapsed * 0.4 : elapsed;
    // Motes: each one belongs to a column by index and rises through it.
    (this.thermalDust.material as THREE.ShaderMaterial).uniforms.uScale.value = this.stage.height * this.stage.renderer.getPixelRatio() * 0.5;
    const positions = this.thermalDust.geometry.getAttribute('position') as THREE.BufferAttribute;
    for (let i = 0; i < THERMAL_PARTICLES; i++) {
      const t = visible[i % Math.max(1, visible.length)];
      if (!t) { positions.setXYZ(i, 0, -1e5, 0); continue; }
      const a = this.thermalSeeds[i * 3] * Math.PI * 2;
      const r = Math.sqrt(this.thermalSeeds[i * 3 + 1]) * 0.9;
      let h = this.thermalSeeds[i * 3 + 2];
      h += (dt * t.strength * 0.55) / (t.top - t.base);
      if (h > 1) h -= 1;
      this.thermalSeeds[i * 3 + 2] = h;
      const swirl = a + elapsed * 0.35 + h * 3;
      positions.setXYZ(i, t.x + Math.cos(swirl) * r * t.rx, t.base + 12 + h * (t.top - t.base - 30), -t.s + Math.sin(swirl) * r * t.rs);
    }
    positions.needsUpdate = true;
  }

  private updateClouds(): void {
    const f = this.run.flight;
    let kept = 0;
    let far = f.s - 100;
    for (const c of this.cloudPlaces) if (c.s > f.s - 150) { this.cloudPlaces[kept++] = c; far = Math.max(far, c.s); }
    // The clouds only move when one is recycled; skip the matrix upload otherwise.
    if (kept === CLOUDS) return;
    this.cloudPlaces.length = kept;
    while (this.cloudPlaces.length < CLOUDS) {
      far += 70 + Math.random() * 90;
      const side = Math.random() < 0.5 ? -1 : 1;
      const w = halfWidthAt(far);
      const size = 14 + Math.random() * 22;
      this.cloudPlaces.push({
        s: far,
        x: centerX(this.course, far) + side * (w + 70 + Math.random() * 230),
        y: floorY(far) + 170 + Math.random() * 160,
        sx: size * (1.6 + Math.random()), sy: size * 0.9, sz: size * (1.2 + Math.random() * 0.6),
        spin: Math.random() * Math.PI,
      });
    }
    const matrix = this.m4;
    const q = this.quat;
    const pos = this.v1;
    const scale = this.v2;
    for (let i = 0; i < this.cloudPlaces.length; i++) {
      const c = this.cloudPlaces[i];
      q.setFromAxisAngle(THREE.Object3D.DEFAULT_UP, c.spin);
      matrix.compose(pos.set(c.x, c.y, -c.s), q, scale.set(c.sx, c.sy, c.sz));
      this.clouds.setMatrixAt(i, matrix);
    }
    this.clouds.instanceMatrix.needsUpdate = true;
  }

  private updatePlayer(dt: number, simulating: boolean): void {
    const f = this.run.flight;
    this.player.position.set(f.x, f.y, -f.s);
    this.player.rotation.set(f.gamma, -f.heading, -f.bank);
    // A little flutter at speed.
    const flutter = this.reducedMotion ? 0 : Math.sin(this.time * 31) * 0.012 * clamp((f.v - 30) / 40, 0, 1);
    this.suit.rotation.z = flutter;
    const ground = this.run.agl;
    this.shadow.visible = this.player.visible && ground < 55;
    if (this.shadow.visible) {
      const gy = f.y - ground;
      const size = 2.2 + ground * 0.03;
      this.shadow.position.set(f.x, gy + 0.15, -f.s);
      this.shadow.scale.set(size, 1, size * 1.2);
      this.shadow.material.opacity = 0.8 * clamp(1 - ground / 55, 0, 1);
    }
    if (simulating && this.player.visible) {
      this.trailTimer -= dt;
      if (this.trailTimer <= 0) {
        // A new sample: advance the ring buffer (the oldest point is overwritten).
        this.trailTimer = 0.035;
        this.trailHead = (this.trailHead + 1) % TRAIL;
        this.trailCount = Math.min(TRAIL, this.trailCount + 1);
      }
      // The newest point follows the feet smoothly between samples.
      this.player.updateMatrixWorld();
      for (let side = 0; side < 2; side++) this.trailPoints[side][this.trailHead].set(side ? 0.24 : -0.24, 0.02, 1.62).applyMatrix4(this.player.matrixWorld);
    }
    this.updateTrail();
    const tint = this.trail.material.uniforms.uColor.value as THREE.Color;
    if (this.run.flight.burst > 0) tint.copy(TRAIL_BURST_TINT);
    else tint.lerp(TRAIL_TINT, damp(3, dt));
  }

  /** The i-th newest point of a smoke ribbon (0 is the feet). */
  private trailPoint(strip: number, i: number): THREE.Vector3 {
    return this.trailPoints[strip][(this.trailHead - Math.min(i, this.trailCount - 1) + TRAIL) % TRAIL];
  }

  private updateTrail(): void {
    const position = this.trail.geometry.getAttribute('position') as THREE.BufferAttribute;
    const alpha = this.trail.geometry.getAttribute('alpha') as THREE.BufferAttribute;
    const cam = this.stage.camera.position;
    const playerDistance = Math.max(4, cam.distanceTo(this.player.position));
    const tangent = this.v1;
    const toCam = this.v2;
    const side = this.v3;
    for (let strip = 0; strip < 2; strip++) {
      const base = strip * TRAIL * 2;
      for (let i = 0; i < TRAIL; i++) {
        if (this.trailCount === 0) { position.setXYZ(base + i * 2, 0, -1e5, 0); position.setXYZ(base + i * 2 + 1, 0, -1e5, 0); alpha.setX(base + i * 2, 0); alpha.setX(base + i * 2 + 1, 0); continue; }
        const p = this.trailPoint(strip, i);
        const q = this.trailPoint(strip, i + 1);
        tangent.subVectors(p, q);
        if (tangent.lengthSq() < 1e-6) tangent.set(0, 0, 1);
        toCam.subVectors(cam, p);
        side.crossVectors(tangent, toCam).normalize();
        const age = i / (TRAIL - 1);
        const width = 0.05 + age * 0.4;
        position.setXYZ(base + i * 2, p.x + side.x * width, p.y + side.y * width, p.z + side.z * width);
        position.setXYZ(base + i * 2 + 1, p.x - side.x * width, p.y - side.y * width, p.z - side.z * width);
        // Fade the old smoke out before it reaches the chase camera, so it never smears across the view.
        const near = clamp((toCam.length() - playerDistance * 0.6) / (playerDistance * 0.3), 0, 1);
        const a = i >= this.trailCount ? 0 : 0.5 * (1 - age) * (1 - age) * near;
        alpha.setX(base + i * 2, a);
        alpha.setX(base + i * 2 + 1, a);
      }
    }
    position.needsUpdate = true;
    alpha.needsUpdate = true;
  }

  private placeCamera(snap: boolean): void {
    const f = this.run.flight;
    this.camYaw = f.heading;
    this.camPitch = f.gamma * 0.5;
    if (snap) this.updateCamera(1);
  }

  private updateCamera(dt: number): void {
    const { camera } = this.stage;
    const f = this.run.flight;
    const target = this.v1.set(f.x, f.y, -f.s);
    if (this.state === 'dying' || this.state === 'over') {
      // Ease back to a three-quarter view of the crash site and look at it.
      camera.position.lerp(this.crashCam, damp(2.4, dt));
      this.lookAt.lerp(this.crashPoint, damp(3, dt));
      camera.lookAt(this.lookAt);
    } else {
      this.camYaw = lerp(this.camYaw, f.heading, damp(3.5, dt));
      // With reduced motion the horizon barely rolls and the view follows climbs and dives more gently.
      this.camPitch = lerp(this.camPitch, f.gamma * (this.reducedMotion ? 0.3 : 0.55), damp(this.reducedMotion ? 1.6 : 3, dt));
      this.camRoll = lerp(this.camRoll, f.bank * (this.reducedMotion ? 0.06 : 0.32), damp(4, dt));
      const cy = Math.cos(this.camPitch);
      const dir = this.v2.set(Math.sin(this.camYaw) * cy, Math.sin(this.camPitch), -Math.cos(this.camYaw) * cy);
      let back = 9.5 + clamp((f.v - 35) * 0.04, 0, 1.6);
      let lift = 2.6;
      if (this.state === 'idle') {
        // Attract mode: a slow swing around the glider.
        this.attractAngle += dt * 0.12;
        const swing = Math.sin(this.attractAngle) * 0.85;
        dir.applyAxisAngle(THREE.Object3D.DEFAULT_UP, swing);
        back = 13;
        lift = 3.5;
      }
      const desired = this.v3.copy(target).addScaledVector(dir, -back);
      desired.y += lift;
      const ground = surfaceHeight(this.course, -desired.z, desired.x) + 2.5;
      if (desired.y < ground) desired.y = ground;
      camera.position.lerp(desired, dt >= 1 ? 1 : damp(9, dt));
      this.lookAt.copy(target).addScaledVector(dir, 14);
      this.lookAt.y += 0.9;
      camera.lookAt(this.lookAt);
      camera.rotateZ(-this.camRoll);
    }
    if (this.shake > 0) {
      camera.position.x += (Math.random() - 0.5) * this.shake;
      camera.position.y += (Math.random() - 0.5) * this.shake;
      this.shake = Math.max(0, this.shake - dt * 1.8);
    }
    // Speed widens the view a little (less with reduced motion); a burst kicks it. On a portrait screen the
    // vertical field of view grows so the horizontal one stays near 46 degrees or more.
    const aspect = this.stage.width / Math.max(1, this.stage.height);
    const base = clamp((2 * Math.atan(Math.tan(0.45) / aspect) * 180) / Math.PI, 62, 84);
    const speedFov = clamp((f.v - 30) / 50, 0, 1) * (this.reducedMotion ? 6 : 16) * (62 / base);
    this.fovKick = Math.max(0, this.fovKick - dt * 6);
    const fov = base + speedFov + this.fovKick;
    if (Math.abs(camera.fov - fov) > 0.05) {
      camera.fov = lerp(camera.fov, fov, dt >= 1 ? 1 : damp(4, dt));
      camera.updateProjectionMatrix();
    }
  }

  private updateStreaks(dt: number): void {
    const f = this.run.flight;
    const cam = this.stage.camera.position;
    const speed = f.v;
    const wind = windAt(this.course, f.s);
    const vx = Math.sin(f.heading) * speed + wind;
    const vz = -Math.cos(f.heading) * speed;
    const vy = f.climb;
    const length = clamp(speed * 0.045, 0.6, 3.6);
    const material = this.streaks.material;
    material.opacity = clamp((speed - 28) / 50, 0.05, 0.55) * (this.state === 'running' || this.state === 'idle' ? 1 : 0);
    const positions = this.streaks.geometry.getAttribute('position') as THREE.BufferAttribute;
    const seeds = this.streakSeeds;
    const inv = 1 / Math.max(speed, 1);
    for (let i = 0; i < STREAKS; i++) {
      // Seeds hold each streak's offset in a box ahead of the camera; air rushes past at the glider's speed.
      let z = seeds[i * 3 + 2] + (dt * speed) / 70;
      if (z > 1) z -= 1;
      seeds[i * 3 + 2] = z;
      const ox = (seeds[i * 3] - 0.5) * 34;
      const oy = (seeds[i * 3 + 1] - 0.5) * 18;
      const along = -70 + z * 72;
      const px = cam.x + ox + Math.sin(f.heading) * -along;
      const py = cam.y + oy;
      const pz = cam.z + Math.cos(f.heading) * along;
      positions.setXYZ(i * 2, px, py, pz);
      positions.setXYZ(i * 2 + 1, px - vx * inv * length, py - vy * inv * length, pz - vz * inv * length);
    }
    positions.needsUpdate = true;
  }

  // ---------------------------------------------------------------------------------------------------
  // Particles

  private emitSparks(x: number, y: number, z: number, count: number, rgb: number[], speed: number, life: number): void {
    const positions = this.sparks.geometry.getAttribute('position') as THREE.BufferAttribute;
    for (let n = 0; n < count; n++) {
      const i = this.sparkCursor;
      this.sparkCursor = (this.sparkCursor + 1) % SPARKS;
      const p = this.sparkData[i];
      const a = Math.random() * Math.PI * 2;
      const b = Math.acos(Math.random() * 2 - 1);
      const v = speed * (0.4 + Math.random() * 0.6);
      p.vx = Math.sin(b) * Math.cos(a) * v; p.vy = Math.sin(b) * Math.sin(a) * v; p.vz = Math.cos(b) * v;
      p.life = p.max = life * (0.6 + Math.random() * 0.6);
      [p.r, p.g, p.b] = rgb;
      p.drag = 2.2;
      p.gravity = 3;
      positions.setXYZ(i, x, y, z);
    }
  }

  /** The ring bursts into sparks around its rim, flying outward (never a clump in the middle of the view). */
  private emitRingSparks(gate: Gate, count: number, rgb: number[]): void {
    const positions = this.sparks.geometry.getAttribute('position') as THREE.BufferAttribute;
    const { u, v } = gateBasis(gate);
    for (let n = 0; n < count; n++) {
      const i = this.sparkCursor;
      this.sparkCursor = (this.sparkCursor + 1) % SPARKS;
      const p = this.sparkData[i];
      const a = (n / count) * Math.PI * 2 + Math.random() * 0.2;
      // gateBasis vectors are in course space [x, y, s]; the scene's z is -s.
      const ox = Math.cos(a) * u[0] + Math.sin(a) * v[0];
      const oy = Math.cos(a) * u[1] + Math.sin(a) * v[1];
      const oz = -(Math.cos(a) * u[2] + Math.sin(a) * v[2]);
      const speed = 5 + Math.random() * 5;
      p.vx = ox * speed; p.vy = oy * speed; p.vz = oz * speed;
      p.life = p.max = 0.6 + Math.random() * 0.4;
      [p.r, p.g, p.b] = rgb;
      p.drag = 2.4;
      p.gravity = 2;
      positions.setXYZ(i, gate.x + ox * gate.r, gate.y + oy * gate.r, -gate.s + oz * gate.r);
    }
  }

  private emitDust(x: number, y: number, z: number, count: number, speed: number): void {
    const positions = this.dust.geometry.getAttribute('position') as THREE.BufferAttribute;
    for (let n = 0; n < count; n++) {
      const i = this.dustCursor;
      this.dustCursor = (this.dustCursor + 1) % DUST;
      const p = this.dustData[i];
      const a = Math.random() * Math.PI * 2;
      const v = speed * (0.3 + Math.random() * 0.7);
      p.vx = Math.cos(a) * v; p.vy = Math.random() * speed * 0.6; p.vz = Math.sin(a) * v;
      p.life = p.max = 1.4 + Math.random();
      p.r = 0.62; p.g = 0.56; p.b = 0.48;
      p.drag = 1.6;
      p.gravity = -0.6;
      positions.setXYZ(i, x + (Math.random() - 0.5) * 3, y, z + (Math.random() - 0.5) * 3);
    }
  }

  private updateParticles(dt: number): void {
    const scale = this.stage.height * this.stage.renderer.getPixelRatio() * 0.5;
    const step = (points: THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial>, data: Particle[], additive: boolean) => {
      points.material.uniforms.uScale.value = scale;
      const positions = points.geometry.getAttribute('position') as THREE.BufferAttribute;
      const colors = points.geometry.getAttribute('tint') as THREE.BufferAttribute;
      const fades = points.geometry.getAttribute('fade') as THREE.BufferAttribute;
      for (let i = 0; i < data.length; i++) {
        const p = data[i];
        if (p.life <= 0) { fades.setX(i, 0); continue; }
        p.life -= dt;
        const k = Math.max(0, p.life / p.max);
        const drag = Math.exp(-p.drag * dt);
        p.vx *= drag; p.vy = p.vy * drag - p.gravity * dt; p.vz *= drag;
        positions.setXYZ(i, positions.getX(i) + p.vx * dt, positions.getY(i) + p.vy * dt, positions.getZ(i) + p.vz * dt);
        const fade = additive ? k : Math.min(1, k * 1.5);
        colors.setXYZ(i, p.r, p.g, p.b);
        fades.setX(i, fade);
        if (p.life <= 0) { positions.setXYZ(i, 0, -1e5, 0); fades.setX(i, 0); }
      }
      positions.needsUpdate = true;
      colors.needsUpdate = true;
      fades.needsUpdate = true;
    };
    step(this.sparks, this.sparkData, true);
    step(this.dust, this.dustData, false);
    // Skimming kicks up a little dust behind the glider.
    if (this.state === 'running' && this.run.skimming && Math.random() < dt * 30) {
      const f = this.run.flight;
      this.emitDust(f.x, f.y - this.run.agl + 0.5, -f.s + 3, 1, 4);
    }
  }

  // ---------------------------------------------------------------------------------------------------
  // HUD

  private emitHud(): void {
    const run = this.run;
    const f = run.flight;
    const thermal = this.course.thermals.find(t => t.s + t.rs > f.s);
    this.onHud({
      score: Math.floor(run.score),
      distance: Math.floor(Math.max(0, f.s)),
      speed: Math.round(f.v * 3.6),
      agl: Math.max(0, Math.round(run.agl)),
      climb: f.climb,
      chain: run.chain,
      mult: multiplier(run.chain),
      charges: run.charges,
      segment: segmentIndex(f.s) + 1,
      wind: windAt(this.course, f.s),
      grace: Math.max(0, GRACE_TIME - run.time),
      thermalAhead: thermal ? thermal.s - thermal.rs - f.s : Infinity,
      warning: this.state === 'running' ? this.warning : null,
      skimming: run.skimming,
    });
  }

  private emitMarker(): void {
    const gate = this.course.gates[this.run.nextGate];
    const { camera } = this.stage;
    if (!gate) { this.onMarker({ x: 0, y: 0, onScreen: false, angle: 0, visible: false }); return; }
    const v = this.v4.set(gate.x, gate.y, -gate.s).project(camera);
    const behind = v.z > 1;
    const onScreen = !behind && Math.abs(v.x) < 0.92 && Math.abs(v.y) < 0.88;
    let x = v.x, y = v.y;
    if (behind) { x = -x; y = -y; }
    const angle = Math.atan2(-y, x);
    const edge = Math.max(Math.abs(x) / 0.9, Math.abs(y) / 0.82, 1e-6);
    if (!onScreen) { x /= edge; y /= edge; }
    this.onMarker({ x: (x * 0.5 + 0.5) * this.stage.width, y: (-y * 0.5 + 0.5) * this.stage.height, onScreen, angle, visible: gate.s - this.run.flight.s < 600 });
  }

  // ---------------------------------------------------------------------------------------------------
  // Test hooks (only wired by main.ts when the page URL has ?debug)

  debugState() {
    const run = this.run;
    const f = run.flight;
    return {
      state: this.state, s: f.s, x: f.x, y: f.y, v: f.v, gamma: f.gamma, heading: f.heading, agl: run.agl, time: run.time,
      score: run.score, chain: run.chain, charges: run.charges, gatesPassed: run.gatesPassed, gatesMissed: run.gatesMissed,
      lineX: lineX(this.course, f.s + 40), lineY: lineY(this.course, f.s + 40), calls: this.stage.renderer.info.render.calls,
      triangles: this.stage.renderer.info.render.triangles, burst: f.burst, controls: { ...this.lastControls }, stick: { ...this.stick }, maxSpeed: V_MAX, burstTime: BURST_TIME, maxCharges: MAX_CHARGES,
      warning: this.warning, camRoll: this.camRoll, bank: f.bank, segment: run.segment + 1, nextGate: run.nextGate,
    };
  }

  /** The autopilot's suggestion for the current state, for scripted play-throughs. */
  debugSuggest(): Controls { return autopilot(this.course, this.run.flight, { mode: 'line' }); }

  /** Lets the racing-line autopilot fly the run instead of the player's input. */
  debugAuto(on: boolean): void { this.auto = on; }

  /** Stops (or restarts) the real-time clock, so a scripted test steps the game only through debugAdvance. */
  debugManual(on: boolean): void { this.manual = on; }

  /** Advances the game clock by `seconds` in 1/60 s frames, rendering once at the end. */
  debugAdvance(seconds: number): void {
    const frames = Math.max(1, Math.round(seconds * 60));
    for (let i = 0; i < frames; i++) this.frame(1 / 60, this.time, i === frames - 1);
  }
}
