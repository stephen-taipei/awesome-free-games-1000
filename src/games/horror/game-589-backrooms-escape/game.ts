import { THREE, createStage, createLoop, Keys, clamp, damp, lerp, rng, prefersTouch, type Stage } from '../../../shared/three/kit';
import {
  TILE, WALL_HEIGHT as H, EYE_HEIGHT, PLAYER_RADIUS, WALK_SPEED, SPRINT_SPEED, ITEMS_PER_LEVEL, PICKUP_RADIUS, EXIT_RADIUS,
  CATCH_DISTANCE, BATTERY_REFILL, SCORE, generateLevel, levelParams, resolveCircle, raycast, isWall, canSee, canHear,
  sightRange, noiseRadius, createStamina, stepStamina, createEntity, think, moveEntity, tileCenter, toTile,
  type Level, type LevelParams, type Entity, type RayHit,
} from './logic';

export interface Hud { level: number; items: number; stamina: number; exhausted: boolean; battery: number; light: boolean; score: number; }
export interface Result { level: number; score: number; water: number; seconds: number; }
export interface Atmos { dread: number; fade: number; flash: number; }
export type GameEvent =
  | 'step' | 'sprint-step' | 'pickup' | 'battery' | 'unlock' | 'locked' | 'clear' | 'spotted' | 'heard' | 'lost'
  | 'caught' | 'light-on' | 'light-off' | 'light-dead' | 'chalk' | 'exhausted' | 'heartbeat';

const LIGHT_POOL = 5;
const LIGHT_POWER = 9;
const CHALK_MAX = 40;
const PANEL_ON = new THREE.Color(1, 0.94, 0.68).multiplyScalar(1.7);
const PANEL_OFF = new THREE.Color(0.08, 0.075, 0.055);
const GLOW_ON = new THREE.Color(1, 0.9, 0.55).multiplyScalar(0.42);
const FOG_NEAR = new THREE.Color('#4a3f1b');
const FOG_DEEP = new THREE.Color('#0d0b05');

/** Cheap stable pseudo-random in [0, 1) for flicker patterns. */
const hash = (n: number) => { const s = Math.sin(n) * 43758.5453; return s - Math.floor(s); };

function makeCanvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  return [canvas, canvas.getContext('2d')!];
}

function texture(canvas: HTMLCanvasElement, repeat = true): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  if (repeat) tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

function grain(g: CanvasRenderingContext2D, w: number, h: number, amount: number, random: () => number): void {
  const img = g.getImageData(0, 0, w, h);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (random() - 0.5) * amount;
    d[i] += n; d[i + 1] += n; d[i + 2] += n * 0.8;
  }
  g.putImageData(img, 0, 0);
}

/** Mono-yellow striped wallpaper with a dark baseboard and faint water damage. One tile wide, full wall height. */
function wallpaperTexture(random: () => number): THREE.CanvasTexture {
  const [c, g] = makeCanvas(256, 512);
  g.fillStyle = '#c9b25c';
  g.fillRect(0, 0, 256, 512);
  for (let i = 0; i < 8; i++) {
    g.fillStyle = i % 2 ? 'rgba(255, 238, 160, 0.13)' : 'rgba(110, 86, 24, 0.07)';
    g.fillRect(i * 32, 0, 32, 512);
    g.fillStyle = 'rgba(105, 80, 22, 0.28)';
    g.fillRect(i * 32, 0, 2, 512);
  }
  // Small diamonds running down the light stripes.
  g.fillStyle = 'rgba(120, 94, 30, 0.24)';
  for (let i = 1; i < 8; i += 2) {
    for (let y = 10; y < 480; y += 22) {
      const x = i * 32 + 16;
      g.beginPath(); g.moveTo(x, y - 4); g.lineTo(x + 3, y); g.lineTo(x, y + 4); g.lineTo(x - 3, y); g.closePath(); g.fill();
    }
  }
  // Water stains seeping from the ceiling and creeping up from the damp carpet.
  for (let k = 0; k < 5; k++) {
    const x = random() * 256, top = random() < 0.5;
    const y = top ? random() * 40 : 470 - random() * 50;
    const r = 30 + random() * 70;
    const gradient = g.createRadialGradient(x, y, 0, x, y, r);
    gradient.addColorStop(0, 'rgba(96, 70, 20, 0.22)');
    gradient.addColorStop(0.7, 'rgba(96, 70, 20, 0.08)');
    gradient.addColorStop(1, 'rgba(96, 70, 20, 0)');
    g.fillStyle = gradient;
    g.fillRect(0, 0, 256, 512);
  }
  const shade = g.createLinearGradient(0, 0, 0, 60);
  shade.addColorStop(0, 'rgba(60, 45, 10, 0.25)');
  shade.addColorStop(1, 'rgba(60, 45, 10, 0)');
  g.fillStyle = shade;
  g.fillRect(0, 0, 256, 60);
  g.fillStyle = '#5a4724';
  g.fillRect(0, 486, 256, 26);
  g.fillStyle = '#7d6535';
  g.fillRect(0, 486, 256, 3);
  grain(g, 256, 512, 16, random);
  return texture(c);
}

/** Damp, worn, mustard carpet. */
function carpetTexture(random: () => number): THREE.CanvasTexture {
  const [c, g] = makeCanvas(256, 256);
  g.fillStyle = '#8b763a';
  g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 2600; i++) {
    const shade = random();
    g.fillStyle = shade < 0.5 ? `rgba(70, 54, 18, ${0.25 + random() * 0.3})` : `rgba(190, 165, 95, ${0.12 + random() * 0.2})`;
    g.fillRect(random() * 256, random() * 256, 1 + random() * 2, 1 + random() * 3);
  }
  grain(g, 256, 256, 26, random);
  return texture(c);
}

/** Drop-ceiling acoustic tiles, 2 x 2 per texture. */
function ceilingTexture(random: () => number): THREE.CanvasTexture {
  const [c, g] = makeCanvas(256, 256);
  g.fillStyle = '#d8cf9f';
  g.fillRect(0, 0, 256, 256);
  g.fillStyle = 'rgba(90, 80, 45, 0.35)';
  for (let i = 0; i < 900; i++) g.fillRect(random() * 256, random() * 256, 1.5, 1.5);
  g.fillStyle = '#8c8358';
  for (const p of [0, 128]) { g.fillRect(p, 0, 4, 256); g.fillRect(0, p, 256, 4); }
  g.fillStyle = 'rgba(255, 250, 220, 0.4)';
  for (const p of [4, 132]) { g.fillRect(p, 0, 2, 256); g.fillRect(0, p, 256, 2); }
  grain(g, 256, 256, 10, random);
  return texture(c);
}

/** Fluorescent troffer: a metal frame around a prismatic diffuser. Tinted per instance. */
function panelTexture(): THREE.CanvasTexture {
  const [c, g] = makeCanvas(128, 64);
  g.fillStyle = '#8e8770';
  g.fillRect(0, 0, 128, 64);
  g.fillStyle = '#fffaf0';
  g.fillRect(6, 6, 116, 52);
  g.fillStyle = 'rgba(190, 178, 140, 0.45)';
  for (let x = 6; x < 122; x += 6) g.fillRect(x, 6, 1, 52);
  for (let y = 6; y < 58; y += 6) g.fillRect(6, y, 116, 1);
  g.fillStyle = 'rgba(150, 140, 110, 0.6)';
  g.fillRect(63, 6, 2, 52);
  return texture(c, false);
}

function glowTexture(inner: string, outer: string): THREE.CanvasTexture {
  const [c, g] = makeCanvas(64, 64);
  const gradient = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0, inner);
  gradient.addColorStop(0.35, outer);
  gradient.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gradient;
  g.fillRect(0, 0, 64, 64);
  return texture(c, false);
}

function chalkTexture(kind: 'x' | 'arrow', random: () => number): THREE.CanvasTexture {
  const [c, g] = makeCanvas(128, 128);
  g.strokeStyle = 'rgba(250, 248, 235, 0.85)';
  g.lineCap = 'round';
  const stroke = (x0: number, y0: number, x1: number, y1: number) => {
    for (let pass = 0; pass < 3; pass++) {
      g.lineWidth = 3 + random() * 4;
      g.globalAlpha = 0.45 + random() * 0.4;
      g.beginPath();
      g.moveTo(x0 + (random() - 0.5) * 6, y0 + (random() - 0.5) * 6);
      g.lineTo(x1 + (random() - 0.5) * 6, y1 + (random() - 0.5) * 6);
      g.stroke();
    }
  };
  if (kind === 'x') {
    stroke(28, 28, 100, 100);
    stroke(100, 26, 26, 102);
    g.globalAlpha = 0.6;
    g.lineWidth = 4;
    g.beginPath(); g.arc(64, 64, 54, 0, Math.PI * 2); g.stroke();
  } else {
    stroke(64, 116, 64, 18);
    stroke(64, 16, 30, 52);
    stroke(64, 16, 98, 52);
  }
  return texture(c, false);
}

function signTexture(text: string, color: string): THREE.CanvasTexture {
  const [c, g] = makeCanvas(256, 96);
  g.fillStyle = '#0b0a07';
  g.fillRect(0, 0, 256, 96);
  g.font = '800 64px ui-sans-serif, system-ui, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.shadowColor = color;
  g.shadowBlur = 18;
  g.fillStyle = color;
  g.fillText(text, 128, 52);
  g.shadowBlur = 0;
  g.fillText(text, 128, 52);
  return texture(c, false);
}

function labelTexture(): THREE.CanvasTexture {
  const [c, g] = makeCanvas(128, 64);
  g.fillStyle = '#efe6c8';
  g.fillRect(0, 0, 128, 64);
  g.fillStyle = '#8a5a2b';
  g.fillRect(0, 0, 128, 10);
  g.fillRect(0, 54, 128, 10);
  g.font = '700 15px ui-sans-serif, system-ui, sans-serif';
  g.textAlign = 'center';
  g.fillStyle = '#5a3a18';
  g.fillText('ALMOND', 64, 30);
  g.fillText('WATER', 64, 47);
  return texture(c);
}

interface Part { geo: THREE.BufferGeometry; mat: THREE.Material; y: number; }
interface Pickup { group: THREE.Group; model: THREE.Object3D; halo: THREE.Sprite; x: number; z: number; taken: boolean; phase: number; }
interface Stalker { data: Entity; mesh: THREE.Group; body: THREE.Mesh[]; eyes: THREE.Sprite[]; heading: number; }

export class BackroomsEscape {
  onHud: (hud: Hud) => void = () => {};
  onOver: (result: Result) => void = () => {};
  onEvent: (event: GameEvent, value?: number) => void = () => {};
  onLevel: (level: number) => void = () => {};
  onAtmos: (atmos: Atmos) => void = () => {};
  onLock: (locked: boolean) => void = () => {};
  onStick: (active: boolean, x: number, y: number, kx: number, ky: number) => void = () => {};

  private stage: Stage;
  private host: HTMLElement;
  private keys = new Keys();
  private loop = createLoop((dt, t) => this.frame(dt, t));
  private random = rng(Date.now());

  // Shared resources, built once and reused for every level.
  private wallMat: THREE.MeshLambertMaterial;
  private floorMat: THREE.MeshLambertMaterial;
  private ceilMat: THREE.MeshLambertMaterial;
  private panelMat = new THREE.MeshBasicMaterial({ map: panelTexture() });
  private glowMat: THREE.MeshBasicMaterial;
  private panelGeo = new THREE.BoxGeometry(1.25, 0.06, 0.62);
  private glowGeo = new THREE.PlaneGeometry(2.7, 2.1).rotateX(Math.PI / 2);
  private bottleParts: Part[] = [];
  private batteryParts: Part[] = [];
  private waterHalo: THREE.SpriteMaterial;
  private batteryHalo: THREE.SpriteMaterial;
  private entityMat = new THREE.MeshBasicMaterial({ color: 0x030201 });
  private shellMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.32, depthWrite: false });
  private entityTime = { value: 0 };
  private eyeMat: THREE.SpriteMaterial;
  private chalkX: THREE.MeshLambertMaterial;
  private chalkArrow: THREE.MeshLambertMaterial;
  private chalkGeo = new THREE.PlaneGeometry(0.62, 0.62);
  private signLocked: THREE.MeshBasicMaterial;
  private signOpen: THREE.MeshBasicMaterial;

  private world = new THREE.Group();
  private fog = new THREE.Fog(FOG_NEAR.clone(), 1.5, 30);
  private fogColor = FOG_NEAR.clone();
  private hemi = new THREE.HemisphereLight(0xfff0b0, 0x4a3c14, 0.5);
  private pool: THREE.PointLight[] = [];
  private slotPanel = new Int32Array(LIGHT_POOL).fill(-1);
  private slotFade = new Float32Array(LIGHT_POOL);
  private slotWant = new Uint8Array(LIGHT_POOL);
  private nearest = new Int32Array(LIGHT_POOL);
  private nearestD = new Float32Array(LIGHT_POOL);
  private flashlight = new THREE.SpotLight(0xfff2d8, 0, 24, 0.5, 0.55, 1.35);
  private exitLight = new THREE.PointLight(0xff3030, 0, 5.5, 1.8);
  private door = new THREE.Group();
  private sign!: THREE.Mesh;

  private walls: THREE.Mesh | null = null;
  private floor: THREE.Mesh | null = null;
  private ceiling: THREE.Mesh | null = null;
  private panels: THREE.InstancedMesh | null = null;
  private glows: THREE.InstancedMesh | null = null;
  private panelX = new Float32Array(0);
  private panelZ = new Float32Array(0);
  private panelLit = new Uint8Array(0);
  private panelFlicker = new Uint8Array(0);
  private panelBright = new Float32Array(0);
  private pickups: Pickup[] = [];
  private items: Pickup[] = [];
  private cells: Pickup[] = [];
  private stalkers: Stalker[] = [];
  private chalk: THREE.Mesh[] = [];
  private chalkCursor = 0;
  private scratch = new THREE.Color();
  private hit: RayHit = { dist: 0, nx: 0, nz: 0 };
  private atmos: Atmos = { dread: 0, fade: 0, flash: 0 };
  private senses = { sees: false, hears: false, px: 0, pz: 0 };

  private level!: Level;
  private params!: LevelParams;
  private levelNumber = 1;
  private state: 'idle' | 'running' | 'paused' | 'transition' | 'dying' | 'over' = 'idle';
  private pausedFrom: 'running' | 'transition' = 'running';
  private pos = { x: 0, z: 0 };
  private velX = 0;
  private velZ = 0;
  private yaw = 0;
  private pitch = 0;
  private idleYaw = 0;
  private bob = 0;
  private bobAmp = 0;
  private stride = 0;
  private stepLeft = false;
  private moving = false;
  private sprinting = false;
  private stamina = createStamina();
  private wasExhausted = false;
  private battery = 1;
  private lightOn = true;
  private found = 0;
  private water = 0;
  private score = 0;
  private seconds = 0;
  private unlocked = false;
  private lockedCooldown = 0;
  private spottedCooldown = 0;
  private heartTimer = 0;
  private dread = 0;
  private fade = 0;
  private flash = 0;
  private shake = 0;
  private phaseTime = 0;
  private hudTimer = 0;
  private poolTimer = 0;
  private time = 0;
  private killer: Stalker | null = null;

  // Input state.
  private locked = false;
  private lookX = 0;
  private lookY = 0;
  private mouseId: number | null = null;
  private stickId: number | null = null;
  private lookId: number | null = null;
  private stickOX = 0;
  private stickOY = 0;
  private stickX = 0;
  private stickY = 0;
  private lastX = 0;
  private lastY = 0;
  private touchSprint = false;

  static create(host: HTMLElement): BackroomsEscape | null {
    const stage = createStage(host, { fov: 74, near: 0.05, far: 40, maxPixelRatio: 1.5 });
    return stage ? new BackroomsEscape(host, stage) : null;
  }

  private constructor(host: HTMLElement, stage: Stage) {
    this.host = host;
    this.stage = stage;
    const random = rng(589);
    const maxAniso = Math.min(8, stage.renderer.capabilities.getMaxAnisotropy());
    const wallTex = wallpaperTexture(random);
    const carpet = carpetTexture(random);
    const ceilTex = ceilingTexture(random);
    for (const tex of [wallTex, carpet, ceilTex]) tex.anisotropy = maxAniso;
    this.wallMat = new THREE.MeshLambertMaterial({ map: wallTex, vertexColors: true });
    this.floorMat = new THREE.MeshLambertMaterial({ map: carpet, vertexColors: true });
    this.ceilMat = new THREE.MeshLambertMaterial({ map: ceilTex, vertexColors: true });
    this.glowMat = new THREE.MeshBasicMaterial({ map: glowTexture('rgba(255,255,255,0.9)', 'rgba(255,255,255,0.3)'), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
    this.waterHalo = new THREE.SpriteMaterial({ map: glowTexture('rgba(220,245,255,0.95)', 'rgba(160,215,255,0.35)'), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true });
    this.batteryHalo = new THREE.SpriteMaterial({ map: glowTexture('rgba(200,255,170,0.9)', 'rgba(120,230,110,0.3)'), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true });
    this.wobble(this.entityMat, 0.025);
    this.wobble(this.shellMat, 0.07);
    this.eyeMat = new THREE.SpriteMaterial({ map: glowTexture('rgba(255,250,235,1)', 'rgba(255,240,200,0.25)'), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.7 });
    const decal = { transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 };
    this.chalkX = new THREE.MeshLambertMaterial({ map: chalkTexture('x', random), ...decal });
    this.chalkArrow = new THREE.MeshLambertMaterial({ map: chalkTexture('arrow', random), ...decal });
    this.signLocked = new THREE.MeshBasicMaterial({ map: signTexture('EXIT', '#ff3b30') });
    this.signOpen = new THREE.MeshBasicMaterial({ map: signTexture('EXIT', '#4dff7a') });
    this.buildProps();
    this.buildScene();
    this.bindInput();
    this.loadLevel(1, 0x589);
    // Attract mode: the menu sits on top of a live, humming hallway.
    this.loop.start();
  }

  get status() { return this.state; }
  get pointerLocked() { return this.locked; }

  private buildProps(): void {
    // Almond water: a plastic bottle with a cream label and a white cap.
    const profile = [[0, 0], [0.055, 0], [0.062, 0.012], [0.062, 0.17], [0.05, 0.205], [0.024, 0.235], [0.024, 0.27], [0, 0.27]]
      .map(([r, y]) => new THREE.Vector2(r, y));
    const plastic = new THREE.MeshLambertMaterial({ color: 0xe9f5ff, emissive: 0x5f8096, emissiveIntensity: 0.55, transparent: true, opacity: 0.88 });
    const label = new THREE.MeshLambertMaterial({ map: labelTexture(), emissive: 0x3a3020, emissiveIntensity: 0.6 });
    const cap = new THREE.MeshLambertMaterial({ color: 0xffffff, emissive: 0x666666 });
    this.bottleParts = [
      { geo: new THREE.LatheGeometry(profile, 16), mat: plastic, y: 0 },
      { geo: new THREE.CylinderGeometry(0.064, 0.064, 0.08, 16, 1, true), mat: label, y: 0.1 },
      { geo: new THREE.CylinderGeometry(0.027, 0.027, 0.03, 12), mat: cap, y: 0.285 },
    ];
    const shell = new THREE.MeshLambertMaterial({ color: 0x1f3a24, emissive: 0x0f2a12, emissiveIntensity: 0.6 });
    const copper = new THREE.MeshLambertMaterial({ color: 0xd08a3a, emissive: 0x4a2a0a });
    const cell = new THREE.CylinderGeometry(0.05, 0.05, 0.19, 14).rotateZ(Math.PI / 2);
    const tip = new THREE.CylinderGeometry(0.05, 0.05, 0.04, 14).rotateZ(Math.PI / 2).translate(0.115, 0, 0);
    this.batteryParts = [{ geo: cell, mat: shell, y: 0.05 }, { geo: tip, mat: copper, y: 0.05 }];
  }

  private buildScene(): void {
    const { scene, camera } = this.stage;
    scene.fog = this.fog;
    scene.background = this.fogColor;
    scene.add(this.world, this.hemi);
    for (let i = 0; i < LIGHT_POOL; i++) {
      const light = new THREE.PointLight(0xffe7a6, 0, 10, 1.6);
      this.pool.push(light);
      scene.add(light);
    }
    camera.rotation.order = 'YXZ';
    scene.add(camera);
    // The flashlight sits at the right hand, aimed a little left of centre so walls catch the hot spot.
    this.flashlight.position.set(0.22, -0.22, 0.05);
    this.flashlight.target.position.set(-0.05, -0.12, -4);
    camera.add(this.flashlight, this.flashlight.target);

    // Exit door: frame, door slab with push bar, and a glowing EXIT sign above it.
    const frameMat = new THREE.MeshLambertMaterial({ color: 0x4a3b1e });
    const slabMat = new THREE.MeshLambertMaterial({ color: 0x8c7d58 });
    const barMat = new THREE.MeshLambertMaterial({ color: 0x3a3a36, emissive: 0x111111 });
    const add = (geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number) => {
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(x, y, z);
      this.door.add(mesh);
      return mesh;
    };
    add(new THREE.BoxGeometry(1.2, 2.2, 0.06), slabMat, 0, 1.1, 0.03);
    add(new THREE.BoxGeometry(0.12, 2.3, 0.12), frameMat, -0.66, 1.15, 0.04);
    add(new THREE.BoxGeometry(0.12, 2.3, 0.12), frameMat, 0.66, 1.15, 0.04);
    add(new THREE.BoxGeometry(1.44, 0.12, 0.12), frameMat, 0, 2.3, 0.04);
    add(new THREE.BoxGeometry(0.9, 0.06, 0.06), barMat, 0, 1.05, 0.09);
    add(new THREE.BoxGeometry(0.66, 0.26, 0.05), barMat, 0, 2.62, 0.04);
    this.sign = add(new THREE.PlaneGeometry(0.62, 0.22), this.signLocked, 0, 2.62, 0.067);
    this.exitLight.position.set(0, 2.45, 0.6);
    this.door.add(this.exitLight);
    scene.add(this.door);

    for (let i = 0; i < CHALK_MAX; i++) {
      const mesh = new THREE.Mesh(this.chalkGeo, this.chalkX);
      mesh.visible = false;
      mesh.renderOrder = 1;
      this.chalk.push(mesh);
      scene.add(mesh);
    }
  }

  /** Makes a material's surface boil: vertices shiver along their normals with a little world-space noise. */
  private wobble(material: THREE.Material, amount: number): void {
    material.onBeforeCompile = shader => {
      shader.uniforms.uTime = this.entityTime;
      shader.vertexShader = 'uniform float uTime;\n' + shader.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
        vec4 wobbleWorld = modelMatrix * vec4(position, 1.0);
        float wobbleN = sin(wobbleWorld.y * 9.0 + uTime * 13.0) * sin((wobbleWorld.x + wobbleWorld.z) * 7.0 + uTime * 9.0)
          + 0.5 * sin(wobbleWorld.y * 31.0 - uTime * 23.0);
        transformed += normal * wobbleN * ${amount.toFixed(3)};`);
    };
    material.customProgramCacheKey = () => `br-wobble-${amount}`;
  }

  private makeStalker(): Stalker {
    const mesh = new THREE.Group();
    const body: THREE.Mesh[] = [];
    // Each limb is drawn twice: an opaque black core and a larger translucent shell that boils around it.
    const part = (geo: THREE.BufferGeometry, x: number, y: number, z: number, rz: number, sx = 1, sy = 1, sz = 1) => {
      for (const [mat, grow] of [[this.entityMat, 1], [this.shellMat, 1.35]] as const) {
        const p = new THREE.Mesh(geo, mat);
        p.position.set(x, y, z);
        p.rotation.z = rz;
        p.scale.set(sx * grow, sy * (grow === 1 ? 1 : 1.06), sz * grow);
        if (grow !== 1) p.renderOrder = 2;
        mesh.add(p);
        body.push(p);
      }
    };
    part(new THREE.CapsuleGeometry(0.22, 1.05, 4, 10), 0, 1.72, 0, 0, 1.1, 1, 0.65);
    part(new THREE.SphereGeometry(0.16, 12, 10), 0.03, 2.62, 0.04, 0.12, 0.9, 1.3, 0.95);
    const leg = new THREE.CapsuleGeometry(0.075, 1.0, 3, 8);
    part(leg, -0.12, 0.62, 0, 0.03);
    part(leg, 0.12, 0.62, 0, -0.03);
    const arm = new THREE.CapsuleGeometry(0.05, 1.55, 3, 8);
    part(arm, -0.37, 1.42, 0.05, -0.09);
    part(arm, 0.39, 1.39, 0.02, 0.12);
    const eyes: THREE.Sprite[] = [];
    for (const x of [-0.055, 0.055]) {
      const eye = new THREE.Sprite(this.eyeMat);
      eye.position.set(x, 2.66, 0.17);
      eye.scale.set(0.07, 0.07, 1);
      eyes.push(eye);
      mesh.add(eye);
    }
    this.stage.scene.add(mesh);
    return { data: createEntity({ x: 1, y: 1 }), mesh, body, eyes, heading: 0 };
  }

  // ---------------------------------------------------------------- level construction

  private loadLevel(number: number, seed: number): void {
    this.disposeLevel();
    this.levelNumber = number;
    this.params = levelParams(number);
    this.level = generateLevel(number, rng(seed));
    const level = this.level;
    const random = rng(seed ^ 0x9e3779b9);

    this.walls = new THREE.Mesh(this.wallGeometry(level, random), this.wallMat);
    this.floor = new THREE.Mesh(this.surfaceGeometry(level.size, false, random), this.floorMat);
    this.ceiling = new THREE.Mesh(this.surfaceGeometry(level.size, true, random), this.ceilMat);
    this.floorMat.map!.repeat.set(level.size * 2, level.size * 2);
    this.ceilMat.map!.repeat.set(level.size * 2, level.size * 2);
    this.world.add(this.walls, this.floor, this.ceiling);

    // Ceiling panels: instanced boxes plus additive halos on the ceiling tiles around each one.
    const count = level.panels.length;
    this.panels = new THREE.InstancedMesh(this.panelGeo, this.panelMat, count);
    this.glows = new THREE.InstancedMesh(this.glowGeo, this.glowMat, count);
    this.panelX = new Float32Array(count);
    this.panelZ = new Float32Array(count);
    this.panelLit = new Uint8Array(count);
    this.panelFlicker = new Uint8Array(count);
    this.panelBright = new Float32Array(count);
    const m = new THREE.Matrix4();
    level.panels.forEach((p, i) => {
      const x = tileCenter(p.x), z = tileCenter(p.y);
      this.panelX[i] = x;
      this.panelZ[i] = z;
      this.panelLit[i] = p.lit ? 1 : 0;
      this.panelFlicker[i] = p.flicker ? 1 : 0;
      m.makeTranslation(x, H - 0.03, z);
      this.panels!.setMatrixAt(i, m);
      m.makeTranslation(x, H - 0.012, z);
      this.glows!.setMatrixAt(i, m);
      this.panels!.setColorAt(i, PANEL_ON);
      this.glows!.setColorAt(i, GLOW_ON);
    });
    this.glows.renderOrder = 1;
    this.world.add(this.panels, this.glows);
    this.slotPanel.fill(-1);
    this.slotFade.fill(0);
    this.slotWant.fill(0);

    // Pickups.
    this.items = level.items.map(t => this.placePickup(t.x, t.y, this.bottleParts, this.waterHalo, 0.95, random));
    this.cells = level.batteries.map(t => this.placePickup(t.x, t.y, this.batteryParts, this.batteryHalo, 0.5, random));
    this.pickups = [...this.items, ...this.cells];

    // Exit door, set into the wall face.
    const e = level.exit;
    this.door.position.set(tileCenter(e.x) + e.dx * TILE / 2, 0, tileCenter(e.y) + e.dy * TILE / 2);
    this.door.rotation.y = Math.atan2(-e.dx, -e.dy);
    this.unlocked = false;
    this.sign.material = this.signLocked;
    this.exitLight.color.set(0xff3030);

    // The entity (a second one from level 5).
    while (this.stalkers.length < level.spawns.length) this.stalkers.push(this.makeStalker());
    this.stalkers.forEach((s, i) => {
      const spawn = level.spawns[i];
      s.mesh.visible = !!spawn;
      if (spawn) { s.data = createEntity(spawn, 4 + i * 6); s.heading = 0; }
    });

    for (const c of this.chalk) c.visible = false;
    this.chalkCursor = 0;

    // Atmosphere: darker, closer fog and dimmer ambient with depth.
    const depth = Math.min(1, (number - 1) / 5);
    this.fogColor.copy(FOG_NEAR).lerp(FOG_DEEP, depth);
    this.fog.color.copy(this.fogColor);
    this.fog.far = this.params.fogFar;
    this.stage.camera.far = this.params.fogFar + 6;
    this.stage.camera.updateProjectionMatrix();

    this.pos.x = tileCenter(level.start.x);
    this.pos.z = tileCenter(level.start.y);
    this.velX = this.velZ = 0;
    this.yaw = this.idleYaw = level.startYaw;
    this.pitch = 0;
    this.found = 0;
    this.lockedCooldown = 0;
    this.poolTimer = 0;
  }

  private placePickup(tx: number, ty: number, parts: Part[], halo: THREE.SpriteMaterial, haloSize: number, random: () => number): Pickup {
    const group = new THREE.Group();
    const model = new THREE.Group();
    for (const p of parts) {
      const mesh = new THREE.Mesh(p.geo, p.mat);
      mesh.position.y = p.y;
      model.add(mesh);
    }
    model.scale.setScalar(1.6);
    const glow = new THREE.Sprite(halo.clone());
    glow.scale.set(haloSize, haloSize, 1);
    glow.position.y = 0.25;
    group.add(model, glow);
    const x = tileCenter(tx) + (random() - 0.5) * 0.9;
    const z = tileCenter(ty) + (random() - 0.5) * 0.9;
    group.position.set(x, 0, z);
    this.world.add(group);
    return { group, model, halo: glow, x, z, taken: false, phase: random() * 10 };
  }

  private disposeLevel(): void {
    for (const mesh of [this.walls, this.floor, this.ceiling]) mesh?.geometry.dispose();
    this.panels?.dispose();
    this.glows?.dispose();
    for (const p of this.pickups) (p.halo.material as THREE.SpriteMaterial).dispose();
    this.world.clear();
    this.walls = this.floor = this.ceiling = null;
    this.panels = this.glows = null;
    this.pickups = this.items = this.cells = [];
  }

  /** Merged wall faces: only the sides of wall tiles that face an open tile, with baked grime in vertex colours. */
  private wallGeometry(level: Level, random: () => number): THREE.BufferGeometry {
    const positions: number[] = [], normals: number[] = [], uvs: number[] = [], colors: number[] = [], indices: number[] = [];
    const quad = (ax: number, az: number, bx: number, bz: number, nx: number, nz: number) => {
      const i = positions.length / 3;
      positions.push(ax, 0, az, bx, 0, bz, bx, H, bz, ax, H, az);
      for (let k = 0; k < 4; k++) normals.push(nx, 0, nz);
      uvs.push(0, 0, 1, 0, 1, 1, 0, 1);
      const tint = 0.8 + random() * 0.2;
      const warm = 0.96 + random() * 0.04;
      for (const v of [0.72, 0.72, 0.96, 0.96]) colors.push(tint * v, tint * v * warm, tint * v * warm * 0.97);
      indices.push(i, i + 1, i + 2, i, i + 2, i + 3);
    };
    for (let y = 0; y < level.size; y++) {
      for (let x = 0; x < level.size; x++) {
        if (!isWall(level, x, y)) continue;
        const x0 = x * TILE, x1 = x0 + TILE, z0 = y * TILE, z1 = z0 + TILE;
        if (y > 0 && !isWall(level, x, y - 1)) quad(x1, z0, x0, z0, 0, -1);
        if (y < level.size - 1 && !isWall(level, x, y + 1)) quad(x0, z1, x1, z1, 0, 1);
        if (x > 0 && !isWall(level, x - 1, y)) quad(x0, z0, x0, z1, -1, 0);
        if (x < level.size - 1 && !isWall(level, x + 1, y)) quad(x1, z1, x1, z0, 1, 0);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geo.setIndex(indices);
    return geo;
  }

  /** Floor or ceiling plane over the whole grid; per-vertex colours give soft damp patches and water stains. */
  private surfaceGeometry(size: number, ceiling: boolean, random: () => number): THREE.BufferGeometry {
    const span = size * TILE;
    const geo = new THREE.PlaneGeometry(span, span, size, size);
    geo.rotateX(ceiling ? Math.PI / 2 : -Math.PI / 2);
    geo.translate(span / 2, ceiling ? H : 0, span / 2);
    const count = geo.getAttribute('position').count;
    const colors = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      if (ceiling) {
        const stain = random() < 0.1;
        const r = stain ? 0.78 : 0.95 + random() * 0.05;
        colors[i * 3] = r;
        colors[i * 3 + 1] = stain ? 0.66 : r;
        colors[i * 3 + 2] = stain ? 0.42 : r * 0.97;
      } else {
        const wet = random() < 0.16 ? 0.55 : 0.78 + random() * 0.22;
        colors[i * 3] = wet;
        colors[i * 3 + 1] = wet * 0.97;
        colors[i * 3 + 2] = wet * 0.9;
      }
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    return geo;
  }

  // ---------------------------------------------------------------- input

  private bindInput(): void {
    const host = this.host;
    document.addEventListener('pointerlockchange', () => {
      const locked = document.pointerLockElement === host;
      if (locked === this.locked) return;
      this.locked = locked;
      this.onLock(locked);
    });
    document.addEventListener('pointerlockerror', () => { /* Keep drag-to-look and arrow turning. */ });
    document.addEventListener('mousemove', event => {
      if (this.locked && this.state === 'running') { this.lookX += event.movementX * 0.0022; this.lookY += event.movementY * 0.0022; }
    });
    const local = (event: PointerEvent) => {
      const rect = host.getBoundingClientRect();
      return [event.clientX - rect.left, event.clientY - rect.top, rect.width] as const;
    };
    host.addEventListener('pointerdown', event => {
      if (this.state !== 'running') return;
      const [x, y, width] = local(event);
      if (event.pointerType === 'mouse') {
        if (!this.locked) this.lockPointer();
        if (this.mouseId === null) { this.mouseId = event.pointerId; this.lastX = x; this.lastY = y; }
        return;
      }
      if (x < width / 2 && this.stickId === null) {
        this.stickId = event.pointerId;
        this.stickOX = x;
        this.stickOY = y;
        this.stickX = this.stickY = 0;
        this.onStick(true, x, y, 0, 0);
      } else if (this.lookId === null) {
        this.lookId = event.pointerId;
        this.lastX = x;
        this.lastY = y;
      } else return;
      try { host.setPointerCapture(event.pointerId); } catch { /* Synthetic events cannot be captured. */ }
    });
    host.addEventListener('pointermove', event => {
      const [x, y] = local(event);
      if (event.pointerId === this.stickId) {
        const R = 52;
        let dx = x - this.stickOX, dy = y - this.stickOY;
        const d = Math.hypot(dx, dy);
        if (d > R) { dx *= R / d; dy *= R / d; }
        this.stickX = dx / R;
        this.stickY = -dy / R;
        this.onStick(true, this.stickOX, this.stickOY, dx, dy);
      } else if (event.pointerId === this.lookId || (event.pointerId === this.mouseId && !this.locked)) {
        const k = event.pointerId === this.lookId ? 0.0062 : 0.0045;
        this.lookX += (x - this.lastX) * k;
        this.lookY += (y - this.lastY) * k;
        this.lastX = x;
        this.lastY = y;
      }
    });
    const end = (event: PointerEvent) => {
      if (event.pointerId === this.stickId) { this.stickId = null; this.stickX = this.stickY = 0; this.onStick(false, 0, 0, 0, 0); }
      if (event.pointerId === this.lookId) this.lookId = null;
      if (event.pointerId === this.mouseId) this.mouseId = null;
    };
    host.addEventListener('pointerup', end);
    host.addEventListener('pointercancel', end);
    host.addEventListener('contextmenu', event => event.preventDefault());
  }

  private resetInput(): void {
    this.keys.clear();
    this.lookX = this.lookY = 0;
    this.stickX = this.stickY = 0;
    this.stickId = this.lookId = this.mouseId = null;
    this.touchSprint = false;
    this.onStick(false, 0, 0, 0, 0);
  }

  /** Captures the mouse for look-around. Silently does nothing on touch devices or when the browser refuses. */
  lockPointer(): void {
    if (prefersTouch() || this.locked || typeof this.host.requestPointerLock !== 'function') return;
    try {
      const request = this.host.requestPointerLock() as unknown;
      if (request && typeof (request as Promise<void>).catch === 'function') (request as Promise<void>).catch(() => {});
    } catch { /* Pointer lock unavailable: drag and arrow keys still turn. */ }
  }

  releasePointer(): void {
    if (this.locked && typeof document.exitPointerLock === 'function') document.exitPointerLock();
  }

  setSprint(on: boolean): void { this.touchSprint = on; }

  toggleFlashlight(): void {
    if (this.state !== 'running') return;
    if (!this.lightOn && this.battery <= 0.001) { this.onEvent('light-dead'); return; }
    this.lightOn = !this.lightOn;
    this.onEvent(this.lightOn ? 'light-on' : 'light-off');
    this.emitHud();
  }

  /** Chalks an X on the wall in front of you, or an arrow on the floor pointing the way you face. */
  markChalk(): void {
    if (this.state !== 'running') return;
    const fx = -Math.sin(this.yaw), fz = -Math.cos(this.yaw);
    const mesh = this.chalk[this.chalkCursor];
    this.chalkCursor = (this.chalkCursor + 1) % CHALK_MAX;
    if (raycast(this.level, this.pos.x, this.pos.z, fx, fz, 2.4, this.hit)) {
      const { dist, nx, nz } = this.hit;
      mesh.material = this.chalkX;
      mesh.position.set(this.pos.x + fx * dist + nx * 0.012, clamp(EYE_HEIGHT - 0.1 + this.pitch * dist * 0.8, 0.45, 2.5), this.pos.z + fz * dist + nz * 0.012);
      mesh.rotation.set(0, Math.atan2(nx, nz), (this.random() - 0.5) * 0.5, 'YXZ');
    } else {
      mesh.material = this.chalkArrow;
      mesh.position.set(this.pos.x + fx * 1.1, 0.012, this.pos.z + fz * 1.1);
      mesh.rotation.set(-Math.PI / 2, this.yaw, 0, 'YXZ');
    }
    mesh.visible = true;
    this.onEvent('chalk');
  }

  // ---------------------------------------------------------------- lifecycle

  start(): void {
    this.water = 0;
    this.score = 0;
    this.seconds = 0;
    this.battery = 1;
    this.lightOn = true;
    this.stamina = createStamina();
    this.wasExhausted = false;
    this.dread = 0;
    this.fade = 1;
    this.flash = 0;
    this.shake = 0;
    this.killer = null;
    this.spottedCooldown = 0;
    this.heartTimer = 0;
    this.loadLevel(1, Math.floor(this.random() * 2 ** 31));
    this.resetInput();
    this.state = 'running';
    this.phaseTime = 0;
    this.emitHud();
    this.loop.start();
  }

  pause(): void {
    if (this.state !== 'running' && this.state !== 'transition') return;
    this.pausedFrom = this.state;
    this.state = 'paused';
    this.resetInput();
  }

  resume(): void {
    if (this.state !== 'paused') return;
    this.resetInput();
    this.state = this.pausedFrom;
  }

  // ---------------------------------------------------------------- frame

  private frame(dt: number, t: number): void {
    this.time = t;
    switch (this.state) {
      case 'running': this.updateRunning(dt); break;
      case 'transition': this.updateTransition(dt); break;
      case 'dying': this.updateDying(dt); break;
      case 'idle': this.updateIdle(t); break;
      default: break;
    }
    if (this.state !== 'paused') {
      this.updatePanels(t);
      this.updateLights(dt);
      this.updateStalkers(dt, t);
      this.updatePickups(t);
    }
    this.updateCamera(dt);
    this.flash = Math.max(0, this.flash - dt * 2.2);
    this.atmos.dread = this.dread;
    this.atmos.fade = this.fade;
    this.atmos.flash = this.flash;
    this.onAtmos(this.atmos);
    this.stage.render();
  }

  private updateIdle(t: number): void {
    // Attract mode: stand at the start and look down the longest hall. Something stands at its end.
    this.yaw = this.idleYaw + Math.sin(t * 0.17) * 0.3;
    this.pitch = Math.sin(t * 0.11) * 0.04;
    this.fade = 0;
    const s = this.stalkers[0];
    if (s) {
      const fx = -Math.sin(this.idleYaw), fz = -Math.cos(this.idleYaw);
      let run = 0;
      while (run < 5 && !isWall(this.level, toTile(this.pos.x + fx * TILE * (run + 1)), toTile(this.pos.z + fz * TILE * (run + 1)))) run++;
      s.mesh.visible = run >= 2;
      s.data.x = this.pos.x + fx * TILE * run;
      s.data.z = this.pos.z + fz * TILE * run;
      s.data.heading = Math.atan2(-fx, -fz);
    }
    for (let i = 1; i < this.stalkers.length; i++) this.stalkers[i].mesh.visible = false;
  }

  private updateRunning(dt: number): void {
    this.seconds += dt;
    if (this.fade > 0) this.fade = Math.max(0, this.fade - dt * 1.4);
    const keys = this.keys;
    if (keys.consume('KeyF')) this.toggleFlashlight();
    if (keys.consume('KeyE')) this.markChalk();

    // Look: mouse/touch deltas plus arrow-key turning, so the game works without pointer lock.
    const turn = (keys.isDown('ArrowRight') ? 1 : 0) - (keys.isDown('ArrowLeft') ? 1 : 0);
    this.yaw -= this.lookX + turn * 2.3 * dt;
    this.pitch = clamp(this.pitch - this.lookY, -1.2, 1.2);
    this.lookX = this.lookY = 0;

    // Move.
    let forward = (keys.isDown('KeyW', 'ArrowUp') ? 1 : 0) - (keys.isDown('KeyS', 'ArrowDown') ? 1 : 0) + this.stickY;
    let strafe = (keys.isDown('KeyD') ? 1 : 0) - (keys.isDown('KeyA') ? 1 : 0) + this.stickX;
    const len = Math.hypot(forward, strafe);
    if (len > 1) { forward /= len; strafe /= len; }
    this.moving = Math.min(1, len) > 0.15;
    const wantsSprint = (keys.isDown('ShiftLeft', 'ShiftRight') || this.touchSprint) && forward > 0.3;
    this.sprinting = stepStamina(this.stamina, wantsSprint, this.moving, dt);
    if (this.stamina.exhausted && !this.wasExhausted) this.onEvent('exhausted');
    this.wasExhausted = this.stamina.exhausted;
    const speed = this.sprinting ? SPRINT_SPEED : WALK_SPEED * (this.stamina.exhausted ? 0.82 : 1);
    const sin = Math.sin(this.yaw), cos = Math.cos(this.yaw);
    const wishX = (-sin * forward + cos * strafe) * speed;
    const wishZ = (-cos * forward - sin * strafe) * speed;
    const k = damp(this.moving ? 10 : 14, dt);
    this.velX = lerp(this.velX, wishX, k);
    this.velZ = lerp(this.velZ, wishZ, k);
    const ox = this.pos.x, oz = this.pos.z;
    this.pos.x += this.velX * dt;
    this.pos.z += this.velZ * dt;
    resolveCircle(this.level, this.pos, PLAYER_RADIUS);
    const moved = Math.hypot(this.pos.x - ox, this.pos.z - oz);

    // Head bob and footsteps by distance walked.
    const strideLength = this.sprinting ? 1.25 : 0.95;
    this.stride += moved;
    this.bob += (moved / strideLength) * Math.PI;
    this.bobAmp = lerp(this.bobAmp, moved > 0.001 ? (this.sprinting ? 0.075 : 0.042) : 0, damp(8, dt));
    if (this.stride >= strideLength) {
      this.stride -= strideLength;
      this.stepLeft = !this.stepLeft;
      this.onEvent(this.sprinting ? 'sprint-step' : 'step', this.stepLeft ? 0 : 1);
    }

    // Flashlight battery.
    if (this.lightOn) {
      this.battery = Math.max(0, this.battery - this.params.drain * dt);
      if (this.battery <= 0) { this.lightOn = false; this.onEvent('light-dead'); }
    }

    this.collect();
    if (this.state === 'running') this.checkExit(dt);
    if (this.state === 'running') this.updateEntities(dt);

    this.hudTimer -= dt;
    if (this.hudTimer <= 0) { this.hudTimer = 0.1; this.emitHud(); }
  }

  private collect(): void {
    const r2 = PICKUP_RADIUS * PICKUP_RADIUS;
    for (const item of this.items) {
      if (item.taken || (item.x - this.pos.x) ** 2 + (item.z - this.pos.z) ** 2 > r2) continue;
      item.taken = true;
      item.group.visible = false;
      this.found += 1;
      this.water += 1;
      this.score += SCORE.water;
      this.flash = Math.max(this.flash, 0.25);
      this.onEvent('pickup', this.found);
      if (this.found >= ITEMS_PER_LEVEL && !this.unlocked) {
        this.unlocked = true;
        this.sign.material = this.signOpen;
        this.exitLight.color.set(0x40ff70);
        this.onEvent('unlock');
      }
      this.emitHud();
    }
    for (const cell of this.cells) {
      if (cell.taken || (cell.x - this.pos.x) ** 2 + (cell.z - this.pos.z) ** 2 > r2) continue;
      cell.taken = true;
      cell.group.visible = false;
      this.battery = Math.min(1, this.battery + BATTERY_REFILL);
      this.score += SCORE.battery;
      this.onEvent('battery');
      this.emitHud();
    }
  }

  private checkExit(dt: number): void {
    this.lockedCooldown -= dt;
    const dx = this.door.position.x - this.pos.x, dz = this.door.position.z - this.pos.z;
    if (dx * dx + dz * dz > EXIT_RADIUS * EXIT_RADIUS) return;
    if (!this.unlocked) {
      if (this.lockedCooldown <= 0) { this.lockedCooldown = 3; this.onEvent('locked', ITEMS_PER_LEVEL - this.found); }
      return;
    }
    this.score += SCORE.clear(this.levelNumber);
    this.state = 'transition';
    this.phaseTime = 0;
    this.onEvent('clear', this.levelNumber);
    this.emitHud();
  }

  private updateTransition(dt: number): void {
    const before = this.phaseTime;
    this.phaseTime += dt;
    this.fade = Math.min(1, this.phaseTime / 0.9);
    this.dread = lerp(this.dread, 0, damp(3, dt));
    if (before < 1.1 && this.phaseTime >= 1.1) {
      this.loadLevel(this.levelNumber + 1, Math.floor(this.random() * 2 ** 31));
      this.dread = 0;
      this.onLevel(this.levelNumber);
      this.emitHud();
    }
    if (this.phaseTime >= 1.2) {
      this.state = 'running';
      this.resetInput();
    }
  }

  private updateEntities(dt: number): void {
    const p = this.params;
    const sight = sightRange(this.lightOn, p);
    const noise = noiseRadius(this.sprinting, this.moving, p);
    this.spottedCooldown -= dt;
    let nearest = Infinity;
    let chasing = false;
    for (const s of this.stalkers) {
      if (!s.mesh.visible) continue;
      const e = s.data;
      const awake = e.mode !== 'dormant';
      const senses = this.senses;
      senses.sees = awake && canSee(this.level, e.x, e.z, this.pos.x, this.pos.z, sight);
      senses.hears = awake && canHear(this.level, e.x, e.z, this.pos.x, this.pos.z, noise);
      senses.px = this.pos.x;
      senses.pz = this.pos.z;
      const signal = think(e, this.level, p, senses, dt, this.random);
      if (signal === 'spotted' && this.spottedCooldown <= 0) { this.spottedCooldown = 6; this.shake = 0.6; this.onEvent('spotted'); }
      else if (signal === 'heard' || signal === 'lost') this.onEvent(signal);
      moveEntity(e, this.level, p, senses, dt);
      const d = Math.hypot(e.x - this.pos.x, e.z - this.pos.z);
      if (e.mode === 'chase') chasing = true;
      nearest = Math.min(nearest, d);
      if (d < CATCH_DISTANCE) { this.die(s); return; }
    }
    const target = Math.pow(clamp(1 - (nearest - 2) / 15, 0, 1), 1.3) + (chasing ? 0.25 : 0);
    this.dread = lerp(this.dread, clamp(target, 0, 1), damp(2.5, dt));
    if (this.dread > 0.3) {
      this.heartTimer -= dt;
      if (this.heartTimer <= 0) { this.heartTimer = lerp(1.15, 0.42, this.dread); this.onEvent('heartbeat', this.dread); }
    }
  }

  private die(s: Stalker): void {
    this.state = 'dying';
    this.killer = s;
    this.phaseTime = 0;
    this.shake = 1.2;
    this.flash = 0.7;
    this.dread = 1;
    this.resetInput();
    this.releasePointer();
    this.onEvent('caught');
    this.emitHud();
  }

  private updateDying(dt: number): void {
    this.phaseTime += dt;
    const s = this.killer;
    if (s) {
      // It is suddenly right in front of you and you turn to face it.
      const dx = s.data.x - this.pos.x, dz = s.data.z - this.pos.z;
      let delta = Math.atan2(-dx, -dz) - this.yaw;
      delta = Math.atan2(Math.sin(delta), Math.cos(delta));
      this.yaw += delta * damp(9, dt);
      this.pitch = lerp(this.pitch, 0.32, damp(6, dt));
      const d = Math.hypot(dx, dz);
      if (d > 0.75) { s.data.x -= (dx / d) * dt * 3; s.data.z -= (dz / d) * dt * 3; }
      s.data.heading = Math.atan2(-dx, -dz);
    }
    if (this.phaseTime > 0.9) this.fade = Math.min(0.85, (this.phaseTime - 0.9) * 1.6);
    if (this.phaseTime > 1.6) {
      this.state = 'over';
      this.onOver({ level: this.levelNumber, score: this.score, water: this.water, seconds: Math.round(this.seconds) });
    }
  }

  // ---------------------------------------------------------------- visuals

  private updatePanels(t: number): void {
    const panels = this.panels, glows = this.glows;
    if (!panels || !glows) return;
    const q = Math.floor(t * 14);
    const dying = this.state === 'dying' || this.state === 'over';
    const near = this.fog.near, far = this.fog.far;
    for (let i = 0; i < this.panelX.length; i++) {
      const x = this.panelX[i], z = this.panelZ[i];
      let b = this.panelLit[i] ? 1 : 0;
      if (b && this.panelFlicker[i]) {
        const h = hash(i * 7.31 + q * 0.917);
        if (h < 0.18) b = 0.1 + h; else if (h < 0.26) b = 0.55;
      }
      if (b > 0) {
        // Tubes stutter and die around the entity.
        for (const s of this.stalkers) {
          if (!s.mesh.visible) continue;
          const d2 = (s.data.x - x) ** 2 + (s.data.z - z) ** 2;
          if (d2 > 81) continue;
          const closeness = 1 - Math.sqrt(d2) / 9;
          const h = hash(i * 3.71 + q * 1.37 + 11.1);
          if (h < closeness * 0.85) b *= h * 0.35;
        }
        if (dying && hash(i * 1.9 + q * 2.3) < 0.6) b *= 0.05;
      }
      this.panelBright[i] = b;
      this.scratch.copy(PANEL_OFF).lerp(PANEL_ON, b);
      panels.setColorAt(i, this.scratch);
      const d = Math.hypot(x - this.pos.x, z - this.pos.z);
      const fogK = 1 - clamp((d - near) / (far - near), 0, 1);
      this.scratch.copy(GLOW_ON).multiplyScalar(b * fogK * fogK);
      glows.setColorAt(i, this.scratch);
    }
    panels.instanceColor!.needsUpdate = true;
    glows.instanceColor!.needsUpdate = true;
    // The whole floor browns out a little when the entity is near.
    this.hemi.intensity = this.params.ambient * 2.2 * (1 - this.dread * 0.45);
  }

  /** Light pooling: a handful of real point lights follow the nearest lit panels, fading as they hand over. */
  private updateLights(dt: number): void {
    this.poolTimer -= dt;
    if (this.poolTimer <= 0) {
      this.poolTimer = 0.15;
      this.nearest.fill(-1);
      this.nearestD.fill(Infinity);
      for (let i = 0; i < this.panelX.length; i++) {
        if (!this.panelLit[i]) continue;
        const d = (this.panelX[i] - this.pos.x) ** 2 + (this.panelZ[i] - this.pos.z) ** 2;
        if (d >= this.nearestD[LIGHT_POOL - 1]) continue;
        let k = LIGHT_POOL - 1;
        while (k > 0 && this.nearestD[k - 1] > d) { this.nearestD[k] = this.nearestD[k - 1]; this.nearest[k] = this.nearest[k - 1]; k--; }
        this.nearestD[k] = d;
        this.nearest[k] = i;
      }
      for (let s = 0; s < LIGHT_POOL; s++) this.slotWant[s] = this.slotPanel[s] >= 0 && this.nearest.includes(this.slotPanel[s]) ? 1 : 0;
      for (let k = 0; k < LIGHT_POOL; k++) {
        const panel = this.nearest[k];
        if (panel < 0 || this.slotPanel.includes(panel)) continue;
        for (let s = 0; s < LIGHT_POOL; s++) {
          if (this.slotPanel[s] >= 0 && (this.slotWant[s] || this.slotFade[s] > 0.04)) continue;
          this.slotPanel[s] = panel;
          this.slotWant[s] = 1;
          this.slotFade[s] = 0;
          this.pool[s].position.set(this.panelX[panel], H - 0.4, this.panelZ[panel]);
          break;
        }
      }
    }
    for (let s = 0; s < LIGHT_POOL; s++) {
      this.slotFade[s] = this.slotWant[s] ? Math.min(1, this.slotFade[s] + dt * 3) : Math.max(0, this.slotFade[s] - dt * 4);
      const panel = this.slotPanel[s];
      this.pool[s].intensity = panel >= 0 ? LIGHT_POWER * this.slotFade[s] * this.panelBright[panel] : 0;
    }

    // Flashlight: dims as the battery runs low and stutters near empty or when the entity is close.
    let torch = 0;
    if (this.state === 'idle') torch = 22;
    else if (this.lightOn) {
      torch = 30 * (0.45 + 0.55 * Math.min(1, this.battery / 0.3));
      if ((this.battery < 0.12 || this.dread > 0.6) && hash(Math.floor(this.time * 18) * 1.7) < 0.25) torch *= 0.15;
    }
    this.flashlight.intensity = torch;
    this.exitLight.intensity = (this.unlocked ? 2.4 : 1.8) * (0.85 + 0.15 * Math.sin(this.time * 3));
  }

  private updateStalkers(dt: number, t: number): void {
    const q = Math.floor(t * 12);
    this.entityTime.value = t;
    for (let i = 0; i < this.stalkers.length; i++) {
      const s = this.stalkers[i];
      if (!s.mesh.visible) continue;
      const e = s.data;
      const d = Math.hypot(e.x - this.pos.x, e.z - this.pos.z);
      let delta = e.heading - s.heading;
      delta = Math.atan2(Math.sin(delta), Math.cos(delta));
      s.heading += delta * damp(6, dt);
      // Never quite still and never quite there: a jittering, swaying shape that drops out for a frame.
      const glitch = hash(q * 0.77 + i * 5.3);
      const jitter = d < 8 ? 0.06 : 0.02;
      const gait = e.mode === 'chase' ? 7 : 3;
      s.mesh.position.set(e.x + (glitch - 0.5) * jitter, Math.abs(Math.sin(t * gait)) * 0.04, e.z + (hash(q * 1.31 + i) - 0.5) * jitter);
      s.mesh.rotation.set(0, s.heading, Math.sin(t * 1.3 + i) * 0.04);
      s.mesh.scale.set(1, 1 + (glitch - 0.5) * 0.05, 1);
      const show = !(d < 7 && glitch < 0.07 && this.state === 'running');
      for (const part of s.body) part.visible = show;
      const eyesOn = d < 13 && hash(q * 0.53 + i * 9.1) > 0.25;
      for (const eye of s.eyes) eye.visible = eyesOn;
    }
  }

  private updatePickups(t: number): void {
    for (const item of this.pickups) {
      if (item.taken) continue;
      item.model.rotation.y = t * 0.8 + item.phase;
      item.halo.material.opacity = 0.75 + Math.sin(t * 3 + item.phase) * 0.25;
    }
  }

  private updateCamera(dt: number): void {
    const { camera } = this.stage;
    this.shake = Math.max(0, this.shake - dt * 1.5);
    const tremor = this.state === 'paused' ? 0 : this.shake * 0.06 + this.dread * 0.006;
    const bobY = Math.abs(Math.sin(this.bob)) * this.bobAmp - this.bobAmp * 0.5;
    const swayX = Math.cos(this.bob) * this.bobAmp * 0.35;
    const cos = Math.cos(this.yaw), sin = Math.sin(this.yaw);
    camera.position.set(
      this.pos.x + cos * swayX + (this.random() - 0.5) * tremor,
      EYE_HEIGHT + bobY + (this.random() - 0.5) * tremor,
      this.pos.z - sin * swayX + (this.random() - 0.5) * tremor,
    );
    camera.rotation.set(this.pitch, this.yaw, Math.cos(this.bob) * this.bobAmp * 0.06, 'YXZ');
  }

  private emitHud(): void {
    this.onHud({
      level: this.levelNumber, items: this.found, stamina: this.stamina.value, exhausted: this.stamina.exhausted,
      battery: this.battery, light: this.lightOn, score: this.score,
    });
  }
}
