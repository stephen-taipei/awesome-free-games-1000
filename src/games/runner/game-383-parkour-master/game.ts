import { THREE, createStage, createLoop, Keys, trackPointer, clamp, damp, lerp, rng, prefersReducedMotion, type Stage } from '../../../shared/three/kit';
import {
  RunSim, HALF_WIDTH, PIPE_LOW, PIPE_HIGH, ROLL_TIME, LEAD_MAX, ZIP_HANG, districtKey,
  type SimEvent, type Input, type Cue, type Move, type Roof, type DistrictKey,
} from './logic';
import {
  PALETTES, LivePalette, BUILDING_VERTEX, BUILDING_FRAGMENT, SKY_VERTEX, SKY_FRAGMENT, SILHOUETTE_VERTEX, SILHOUETTE_FRAGMENT,
  CONE_VERTEX, CONE_FRAGMENT, PARTICLE_VERTEX, PARTICLE_FRAGMENT, CUE_VERTEX, CUE_FRAGMENT, cueAtlas, softDisc,
  acUnitGeometry, pipeRackGeometry, boomGeometry, craneTowerGeometry, zipMastGeometry, trolleyGeometry, gantryGeometry,
  wheelGeometry, wheelStandGeometry, droneGeometry, buildRunner, blankPose, blendPose, applyPose, type Rig, type Pose,
} from './art';

export interface Hud {
  distance: number;
  speed: number;
  top: number;
  floor: number;
  drone: number;
  lead: number;
  combo: number;
  district: number;
}
export interface Result { distance: number; district: number; perfects: number; bestCombo: number; topSpeed: number; cause: 'caught' | 'fell'; }
/** Sim events, plus footfalls for the step sound. */
export type GameEvent = SimEvent | { type: 'step'; x: number; y: number };

const BOTTOM = -80;
const ROOF_Z0 = -7;
const ROOF_Z1 = 2.2;
const MAX_ROOFS = 48;
const MAX_PROPS = 48;
const FOV = 50;
const JUMP_KEYS = ['Space', 'KeyW', 'ArrowUp'];
const SLIDE_KEYS = ['KeyS', 'ArrowDown'];
const ICONS: Record<Move, number> = { vault: 0, edge: 0, slide: 1, roll: 1, kick: 2, zip: 3 };

type Status = 'idle' | 'running' | 'paused' | 'dying' | 'over';

interface Particle { x: number; y: number; z: number; vx: number; vy: number; vz: number; life: number; max: number; size: number; grow: number; gravity: number; r: number; g: number; b: number; alpha: number; }

/** A pool of round particles in one draw call. */
class Particles {
  points: THREE.Points;
  private pool: Particle[] = [];
  private live: Particle[] = [];
  private geometry = new THREE.BufferGeometry();
  constructor(private count: number, additive: boolean) {
    this.geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
    this.geometry.setAttribute('aColor', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
    this.geometry.setAttribute('aSize', new THREE.BufferAttribute(new Float32Array(count), 1));
    this.geometry.setAttribute('aAlpha', new THREE.BufferAttribute(new Float32Array(count), 1));
    const material = new THREE.ShaderMaterial({
      uniforms: { uScale: { value: 300 } }, vertexShader: PARTICLE_VERTEX, fragmentShader: PARTICLE_FRAGMENT,
      transparent: true, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    });
    this.points = new THREE.Points(this.geometry, material);
    this.points.frustumCulled = false;
    for (let i = 0; i < count; i++) this.pool.push({ x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, life: 0, max: 1, size: 1, grow: 0, gravity: 0, r: 1, g: 1, b: 1, alpha: 1 });
  }
  set scale(value: number) { (this.points.material as THREE.ShaderMaterial).uniforms.uScale.value = value; }
  emit(x: number, y: number, z: number, options: { n: number; speed: number; up?: number; spread?: number; life: number; size: number; grow?: number; gravity?: number; color: THREE.Color; alpha?: number; dirX?: number }): void {
    for (let i = 0; i < options.n; i++) {
      const p = this.pool.pop() ?? this.live.shift();
      if (!p) return;
      const a = Math.random() * Math.PI * 2;
      const s = options.speed * (0.4 + Math.random() * 0.6);
      p.x = x + (Math.random() - 0.5) * (options.spread ?? 0.3);
      p.y = y;
      p.z = z + (Math.random() - 0.5) * (options.spread ?? 0.3);
      p.vx = Math.cos(a) * s + (options.dirX ?? 0);
      p.vy = Math.abs(Math.sin(a)) * s * 0.6 + (options.up ?? 0) * (0.5 + Math.random() * 0.5);
      p.vz = (Math.random() - 0.5) * s;
      p.life = p.max = options.life * (0.6 + Math.random() * 0.4);
      p.size = options.size * (0.7 + Math.random() * 0.6);
      p.grow = options.grow ?? 0;
      p.gravity = options.gravity ?? 0;
      p.r = options.color.r; p.g = options.color.g; p.b = options.color.b;
      p.alpha = options.alpha ?? 1;
      this.live.push(p);
    }
  }
  update(dt: number): void {
    const pos = this.geometry.getAttribute('position') as THREE.BufferAttribute;
    const col = this.geometry.getAttribute('aColor') as THREE.BufferAttribute;
    const size = this.geometry.getAttribute('aSize') as THREE.BufferAttribute;
    const alpha = this.geometry.getAttribute('aAlpha') as THREE.BufferAttribute;
    let w = 0;
    for (let i = 0; i < this.live.length; i++) {
      const p = this.live[i];
      p.life -= dt;
      if (p.life <= 0) { this.pool.push(p); continue; }
      p.vy -= p.gravity * dt;
      p.vx *= 1 - dt * 1.5; p.vz *= 1 - dt * 1.5;
      p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
      p.size += p.grow * dt;
      this.live[w++] = p;
    }
    this.live.length = w;
    for (let i = 0; i < this.count; i++) {
      const p = this.live[i];
      if (p) {
        pos.setXYZ(i, p.x, p.y, p.z);
        col.setXYZ(i, p.r, p.g, p.b);
        size.setX(i, p.size);
        alpha.setX(i, p.alpha * Math.min(1, (p.life / p.max) * 1.6));
      } else {
        alpha.setX(i, 0);
      }
    }
    pos.needsUpdate = col.needsUpdate = size.needsUpdate = alpha.needsUpdate = true;
    this.geometry.setDrawRange(0, Math.max(1, this.live.length));
  }
  clear(): void { this.pool.push(...this.live); this.live.length = 0; }
}

interface BackdropBuilding { x0: number; w: number; top: number; seed: number; }

/** One parallax layer of window-grid buildings, recycled around the camera. */
class Backdrop {
  mesh: THREE.InstancedMesh;
  private items: BackdropBuilding[] = [];
  private info: THREE.InstancedBufferAttribute;
  private random = rng(7 + Math.floor(Math.random() * 1000));
  constructor(material: THREE.ShaderMaterial, private count: number, private z: number, private depth: number, private width: [number, number], private height: [number, number]) {
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    geometry.translate(0, -0.5, 0);
    this.info = new THREE.InstancedBufferAttribute(new Float32Array(count * 4), 4);
    geometry.setAttribute('aInfo', this.info);
    this.mesh = new THREE.InstancedMesh(geometry, material, count);
    this.mesh.frustumCulled = false;
  }
  update(cx: number, half: number): void {
    const m = new THREE.Matrix4();
    const left = cx - half;
    const right = cx + half;
    this.items = this.items.filter(b => b.x0 + b.w > left - 10 && b.x0 < right + 60);
    let cursor = this.items.length ? this.items[this.items.length - 1].x0 + this.items[this.items.length - 1].w : left - 10;
    if (this.items.length && this.items[0].x0 > left) {
      // Camera jumped back (a restart): rebuild from the left.
      this.items = [];
      cursor = left - 10;
    }
    while (cursor < right + 10 && this.items.length < this.count) {
      const w = lerp(this.width[0], this.width[1], this.random());
      const gap = 0.5 + this.random() * 3;
      this.items.push({ x0: cursor + gap, w, top: lerp(this.height[0], this.height[1], Math.pow(this.random(), 1.3)), seed: this.random() });
      cursor += gap + w;
    }
    this.items.forEach((b, i) => {
      m.makeScale(b.w, b.top - BOTTOM, this.depth);
      m.setPosition(b.x0 + b.w / 2, b.top, this.z);
      this.mesh.setMatrixAt(i, m);
      this.info.setXYZW(i, b.seed, 0, 0, 0);
    });
    this.mesh.count = this.items.length;
    this.mesh.instanceMatrix.needsUpdate = true;
    this.info.needsUpdate = true;
  }
}

export class SkylineGetaway {
  onHud: (hud: Hud) => void = () => {};
  onOver: (result: Result) => void = () => {};
  onEvent: (event: GameEvent) => void = () => {};

  private stage: Stage;
  private keys = new Keys();
  private loop = createLoop((dt, t) => this.frame(dt, t));
  private reducedMotion = prefersReducedMotion();
  private sim!: RunSim;
  private status: Status = 'idle';
  private palette = new LivePalette(PALETTES.dusk);
  private paletteKey: DistrictKey = 'dusk';

  // Scene
  private shared: Record<string, THREE.IUniform> = {};
  private sky!: THREE.Mesh<THREE.SphereGeometry, THREE.ShaderMaterial>;
  private silhouette!: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;
  private backdrops: Backdrop[] = [];
  private roofs!: THREE.InstancedMesh;
  private roofInfo!: THREE.InstancedBufferAttribute;
  private acUnits!: THREE.InstancedMesh;
  private pipes!: THREE.InstancedMesh;
  private booms!: THREE.InstancedMesh;
  private towers!: THREE.InstancedMesh;
  private panels!: THREE.InstancedMesh;
  private columns!: THREE.InstancedMesh;
  private cables!: THREE.InstancedMesh;
  private masts!: THREE.InstancedMesh;
  private trolleys!: THREE.InstancedMesh;
  private gantries!: THREE.InstancedMesh;
  private wheel = new THREE.Group();
  private wheelSpin!: THREE.Mesh;
  private hemi = new THREE.HemisphereLight();
  private key = new THREE.DirectionalLight();
  private searchlight = new THREE.SpotLight('#dff0ff', 0, 40, 0.42, 0.6, 1);
  private rig!: Rig;
  private pose: Pose = blankPose();
  private target: Pose = blankPose();
  private runPhase = 0;
  private shadow!: THREE.Mesh;
  private drone = new THREE.Group();
  private droneLights: THREE.Sprite[] = [];
  private rotors!: THREE.Mesh;
  private cone!: THREE.Mesh<THREE.ConeGeometry, THREE.ShaderMaterial>;
  private dust = new Particles(260, false);
  private sparks = new Particles(220, true);
  private rain!: THREE.LineSegments;
  private rainDrops = new Float32Array(0);
  private lines!: THREE.LineSegments;
  private cue!: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;

  // Camera and feel
  private camX = 0;
  private camY = 1.5;
  private groundY = 0;
  private shake = 0;
  private fovKick = 0;
  private boostGlow = 0;
  private cueAlpha = 0;
  private dyingTime = 0;
  private hudTimer = 0;
  private spotX = -20;
  private spotY = 0;
  private droneY = 8;
  private droneX = -20;
  private viewLeft = -20;
  private ray = new THREE.Vector3();
  /** Top band of the screen (a fraction of its height) covered by the HUD; the drone stays below it. */
  safeTop = 0.16;
  private autopilot = { hold: false, done: '' };
  private pointer = { held: false, jump: false, slide: false, swiped: false, x: 0, y: 0, t: 0 };
  private lastDistrictShown = 0;
  private decorAnchor: Record<string, number> = { cranes: -1e9, wheel: -1e9 };

  static create(host: HTMLElement): SkylineGetaway | null {
    const stage = createStage(host, { fov: FOV, near: 0.1, far: 900, maxPixelRatio: 2 });
    return stage ? new SkylineGetaway(host, stage) : null;
  }

  private constructor(host: HTMLElement, stage: Stage) {
    this.stage = stage;
    this.buildScene();
    trackPointer(host, {
      down: (x, y) => {
        if (this.status !== 'running') return;
        Object.assign(this.pointer, { held: true, jump: true, swiped: false, x, y, t: performance.now() });
      },
      drag: (_dx, _dy, x, y) => {
        const p = this.pointer;
        if (this.status !== 'running' || p.swiped || !p.held) return;
        const down = y - p.y;
        // A quick downward swipe slides (or rolls); it cancels the hold so the hop it began stays short.
        if (down > 26 && down > Math.abs(x - p.x) && performance.now() - p.t < 900) {
          p.swiped = true;
          p.held = false;
          p.slide = true;
        }
      },
      up: () => { this.pointer.held = false; },
    });
    this.newRun(false);
    this.loop.start();
  }

  get state(): Status { return this.status; }
  /** Read-only view of the simulation, for the page's own tests. */
  get simulation(): RunSim { return this.sim; }

  private newRun(chasing: boolean): void {
    this.sim = new RunSim(Math.random, { pursuit: chasing });
    this.autopilot = { hold: false, done: '' };
    this.camX = this.sim.x + 4;
    this.camY = 1.5;
    this.groundY = 0;
    this.spotX = this.sim.x - this.sim.lead;
    this.droneX = this.spotX - 4.2;
    this.droneY = 5;
    this.dyingTime = 0;
    this.shake = 0;
    this.lastDistrictShown = 0;
    this.paletteKey = 'dusk';
    this.palette.snap(PALETTES.dusk);
    this.decorAnchor = { cranes: -1e9, wheel: -1e9 };
    this.dust.clear();
    this.sparks.clear();
    this.pose = blankPose();
    this.rig.root.rotation.set(0, 0, 0);
  }

  start(): void {
    this.newRun(true);
    this.keys.clear();
    this.pointer = { held: false, jump: false, slide: false, swiped: false, x: 0, y: 0, t: 0 };
    this.status = 'running';
    this.emitHud();
  }

  pause(): void { if (this.status === 'running') this.status = 'paused'; }
  resume(): void {
    if (this.status !== 'paused') return;
    this.keys.clear();
    this.pointer.held = false;
    this.status = 'running';
  }

  // --- Scene construction --------------------------------------------------------------------------------------

  private buildScene(): void {
    const { scene } = this.stage;
    const c = this.palette.colors;
    const n = this.palette.numbers;
    scene.fog = new THREE.Fog(c.fog, n.fogNear, n.fogFar);
    this.shared = {
      uFacade: { value: c.facade }, uTop: { value: c.top }, uTrim: { value: c.trim },
      uWinA: { value: c.winA }, uWinB: { value: c.winB }, uWinC: { value: c.winC },
      uFog: { value: c.fog }, uSkyLow: { value: c.skyLow }, uAccent: { value: c.accent },
      uFogNear: { value: n.fogNear }, uFogFar: { value: n.fogFar }, uLit: { value: n.lit }, uNeon: { value: n.neon }, uWet: { value: n.wet },
      uSpot: { value: new THREE.Vector4(0, 0, 2.4, 0) }, uSpotColor: { value: new THREE.Color('#cfe6ff') }, uGround: { value: 0 },
    };
    const buildingMaterial = (layer: number) => new THREE.ShaderMaterial({
      uniforms: { ...this.shared, uLayer: { value: layer } }, vertexShader: BUILDING_VERTEX, fragmentShader: BUILDING_FRAGMENT,
    });

    this.sky = new THREE.Mesh(new THREE.SphereGeometry(600, 32, 16), new THREE.ShaderMaterial({
      uniforms: {
        uTop: { value: c.skyTop }, uMid: { value: c.skyMid }, uLow: { value: c.skyLow }, uSun: { value: c.sun },
        uSunDir: { value: this.palette.sunDir }, uSunSize: { value: n.sunSize }, uStars: { value: n.stars },
      },
      vertexShader: SKY_VERTEX, fragmentShader: SKY_FRAGMENT, side: THREE.BackSide, depthWrite: false,
    }));
    this.sky.renderOrder = -10;
    scene.add(this.sky);

    this.silhouette = new THREE.Mesh(new THREE.PlaneGeometry(1600, 220), new THREE.ShaderMaterial({
      uniforms: { uColor: { value: new THREE.Color() }, uWin: { value: c.winA }, uLit: { value: n.lit } },
      vertexShader: SILHOUETTE_VERTEX, fragmentShader: SILHOUETTE_FRAGMENT,
    }));
    this.silhouette.position.z = -230;
    this.silhouette.renderOrder = -9;
    scene.add(this.silhouette);

    this.backdrops = [
      new Backdrop(buildingMaterial(1), 44, -78, 14, [10, 22], [-4, 26]),
      new Backdrop(buildingMaterial(0.55), 44, -32, 10, [7, 15], [-12, 6]),
    ];
    for (const b of this.backdrops) scene.add(b.mesh);

    const roofGeometry = new THREE.BoxGeometry(1, 1, 1);
    roofGeometry.translate(0, -0.5, 0);
    this.roofInfo = new THREE.InstancedBufferAttribute(new Float32Array(MAX_ROOFS * 4), 4);
    roofGeometry.setAttribute('aInfo', this.roofInfo);
    this.roofs = new THREE.InstancedMesh(roofGeometry, buildingMaterial(0), MAX_ROOFS);
    this.roofs.frustumCulled = false;
    scene.add(this.roofs);

    const propMaterial = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6, metalness: 0.25 });
    const instanced = (geometry: THREE.BufferGeometry, count: number, material: THREE.Material = propMaterial) => {
      const mesh = new THREE.InstancedMesh(geometry, material, count);
      mesh.frustumCulled = false;
      mesh.count = 0;
      scene.add(mesh);
      return mesh;
    };
    this.acUnits = instanced(acUnitGeometry(), MAX_PROPS);
    this.pipes = instanced(pipeRackGeometry(PIPE_LOW, PIPE_HIGH), MAX_PROPS);
    this.booms = instanced(boomGeometry('#f2b31b'), 8);
    this.towers = instanced(craneTowerGeometry('#d99a12'), 8);
    const panelMaterial = new THREE.MeshStandardMaterial({ color: '#9fc6e8', roughness: 0.15, metalness: 0.4, transparent: true, opacity: 0.78, emissive: '#2a4a6a', emissiveIntensity: 0.4 });
    this.panels = instanced(new THREE.BoxGeometry(1, 0.18, ROOF_Z1 - ROOF_Z0), 32, panelMaterial);
    this.panels.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(32 * 3), 3);
    this.columns = instanced(new THREE.BoxGeometry(0.3, 1, 0.3), 64, new THREE.MeshStandardMaterial({ color: '#7d8796', roughness: 0.5, metalness: 0.6 }));
    this.cables = instanced(new THREE.BoxGeometry(1, 0.05, 0.05), 6, new THREE.MeshStandardMaterial({ color: '#1b1f26', roughness: 0.4, metalness: 0.8 }));
    this.masts = instanced(zipMastGeometry(), 12);
    this.trolleys = instanced(trolleyGeometry('#7affd4'), 6);
    this.gantries = instanced(gantryGeometry(), 4, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8, fog: true }));

    this.wheelSpin = new THREE.Mesh(wheelGeometry(), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6, emissive: '#ff8fd0', emissiveIntensity: 0.25 }));
    const stand = new THREE.Mesh(wheelStandGeometry(), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8 }));
    this.wheel.add(this.wheelSpin, stand);
    this.wheel.visible = false;
    scene.add(this.wheel);

    scene.add(this.hemi, this.key, this.searchlight, this.searchlight.target);
    this.key.position.set(-30, 40, 30);

    this.rig = buildRunner('#7affd4');
    scene.add(this.rig.root);
    const shadowTexture = softDisc();
    this.shadow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: shadowTexture, color: '#000000', transparent: true, opacity: 0.5, depthWrite: false }));
    this.shadow.rotation.x = -Math.PI / 2;
    scene.add(this.shadow);

    // Police drone with its searchlight.
    const hull = new THREE.Mesh(droneGeometry(), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.4, metalness: 0.5 }));
    const rotorGeometry = new THREE.CircleGeometry(0.42, 20);
    rotorGeometry.rotateX(-Math.PI / 2);
    const rotorParts: THREE.BufferGeometry[] = [];
    for (const [x, z] of [[0.75, 0.6], [-0.75, 0.6], [0.75, -0.6], [-0.75, -0.6]]) rotorParts.push(rotorGeometry.clone().translate(x, 0.22, z));
    const rotors = new THREE.BufferGeometry();
    const positions: number[] = [];
    for (const g of rotorParts) { const p = g.toNonIndexed().getAttribute('position'); for (let i = 0; i < p.count; i++) positions.push(p.getX(i), p.getY(i), p.getZ(i)); }
    rotors.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    this.rotors = new THREE.Mesh(rotors, new THREE.MeshBasicMaterial({ color: '#cfd8e8', transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide }));
    this.drone.add(hull, this.rotors);
    const glow = softDisc();
    for (const color of ['#ff2a3a', '#2a6bff']) {
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, color, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
      sprite.scale.set(1.3, 1.3, 1);
      sprite.position.set(color === '#ff2a3a' ? -0.45 : 0.45, 0.25, 0.42);
      this.drone.add(sprite);
      this.droneLights.push(sprite);
    }
    scene.add(this.drone);
    // Apex at the origin, opening towards -y over unit length.
    const apexDown = new THREE.ConeGeometry(1, 1, 28, 1, true);
    apexDown.translate(0, 0.5, 0);
    apexDown.rotateX(Math.PI);
    this.cone = new THREE.Mesh(apexDown, new THREE.ShaderMaterial({
      uniforms: { uColor: { value: new THREE.Color('#a8d4ff') }, uIntensity: { value: 0.2 } },
      vertexShader: CONE_VERTEX, fragmentShader: CONE_FRAGMENT,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    }));
    this.cone.renderOrder = 5;
    scene.add(this.cone);

    scene.add(this.dust.points, this.sparks.points);

    // Rain streaks around the camera.
    const drops = 340;
    this.rainDrops = new Float32Array(drops * 3);
    for (let i = 0; i < drops; i++) this.rainDrops.set([Math.random() * 70 - 35, Math.random() * 46 - 16, Math.random() * 18 - 12], i * 3);
    const rainGeometry = new THREE.BufferGeometry();
    rainGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(drops * 6), 3));
    this.rain = new THREE.LineSegments(rainGeometry, new THREE.LineBasicMaterial({ color: '#b8c8ff', transparent: true, opacity: 0, depthWrite: false }));
    this.rain.frustumCulled = false;
    scene.add(this.rain);

    // Speed lines behind the runner after perfect moves.
    const lineCount = 26;
    const lineGeometry = new THREE.BufferGeometry();
    lineGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(lineCount * 6), 3));
    lineGeometry.userData.seeds = Array.from({ length: lineCount }, () => [Math.random(), Math.random(), Math.random()]);
    this.lines = new THREE.LineSegments(lineGeometry, new THREE.LineBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
    this.lines.frustumCulled = false;
    scene.add(this.lines);

    this.cue = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.ShaderMaterial({
      uniforms: {
        uAtlas: { value: cueAtlas() }, uIcon: { value: 0 }, uProgress: { value: 0 }, uHot: { value: 0 }, uAlpha: { value: 0 },
        uColor: { value: new THREE.Color('#ffffff') }, uHotColor: { value: new THREE.Color('#7dff7a') },
      },
      vertexShader: CUE_VERTEX, fragmentShader: CUE_FRAGMENT, transparent: true, depthTest: false, depthWrite: false,
    }));
    this.cue.renderOrder = 20;
    scene.add(this.cue);
    this.applyPalette();
  }

  // --- Frame ---------------------------------------------------------------------------------------------------

  private readInput(): Input {
    const take = (key: 'jump' | 'slide') => { const v = this.pointer[key]; this.pointer[key] = false; return v; };
    return {
      jump: this.keys.isDown(...JUMP_KEYS) || this.pointer.held,
      slide: this.keys.isDown(...SLIDE_KEYS),
      jumpPressed: this.keys.consume(...JUMP_KEYS) || take('jump'),
      slidePressed: this.keys.consume(...SLIDE_KEYS) || take('slide'),
    };
  }

  /** Attract mode: a bot that times every move, so the menu shows the game being played well. */
  private autopilotInput(): Input {
    const sim = this.sim;
    const state = this.autopilot;
    const input: Input = { jump: state.hold, slide: false, jumpPressed: false, slidePressed: false };
    if (sim.mode === 'air' && sim.holding) {
      const landing = sim.predict(false);
      const roof = landing.landed ? sim.roofAt(landing.x) : null;
      if (landing.landed && (!roof || landing.x - roof.x0 >= 0.9)) { input.jump = false; state.hold = false; } else input.jump = true;
    }
    if (sim.mode !== 'air') state.hold = false;
    const cue = sim.cue(2.5);
    if (cue && cue.tau <= cue.window * 0.5 && cue.tau >= -cue.late) {
      const key = `${cue.move}:${Math.round(cue.x * 10)}`;
      if (state.done !== key) {
        state.done = key;
        if (cue.move === 'slide' || cue.move === 'roll') { input.slidePressed = true; input.slide = true; }
        else { input.jumpPressed = true; input.jump = true; state.hold = cue.move === 'edge' || cue.move === 'kick' || cue.move === 'zip'; }
      }
    }
    return input;
  }

  private frame(dt: number, t: number): void {
    const sim = this.sim;
    let simDt = 0;
    if (this.status === 'running') simDt = dt;
    else if (this.status === 'idle') simDt = dt * 0.9;
    else if (this.status === 'dying') simDt = dt * (this.dyingTime < 0.45 ? 0.45 : 1);

    if (simDt > 0) {
      const input = this.status === 'running' ? this.readInput() : this.status === 'idle' ? this.autopilotInput() : { jump: false, slide: false, jumpPressed: false, slidePressed: false };
      const events = sim.step(simDt, input);
      for (const event of events) this.handle(event);
      if (this.status === 'idle' && !sim.alive) this.newRun(false);
      if (this.status === 'idle' && sim.distance > 2600) this.newRun(false);
    }
    if (this.status === 'dying') {
      this.dyingTime += dt;
      if (this.dyingTime > 1.35) {
        this.status = 'over';
        this.onOver({
          distance: Math.floor(sim.distance), district: sim.district + 1, perfects: sim.perfects, bestCombo: sim.bestCombo,
          topSpeed: Math.round(sim.maxSpeed * 3.6), cause: sim.status === 'caught' ? 'caught' : 'fell',
        });
      }
    }

    const key = districtKey(sim.district);
    if (key !== this.paletteKey) { this.paletteKey = key; this.palette.set(PALETTES[key]); }
    const visualDt = this.status === 'paused' || this.status === 'over' ? 0 : dt;
    this.palette.update(damp(0.9, dt));
    this.applyPalette();
    this.updateRunner(visualDt, simDt);
    this.updateCamera(dt);
    this.syncCourse();
    this.updateDrone(dt, t);
    this.updateDecor(t);
    this.updateEffects(visualDt);
    this.updateCue(dt);
    this.stage.render();

    this.hudTimer -= dt;
    if ((this.status === 'running' || this.status === 'dying') && this.hudTimer <= 0) { this.hudTimer = 0.1; this.emitHud(); }
  }

  private handle(event: SimEvent): void {
    const sim = this.sim;
    const accent = this.palette.colors.accent;
    const dustColor = new THREE.Color('#c9bfb4').lerp(this.palette.colors.fog, 0.3);
    switch (event.type) {
      case 'perfect': {
        this.boostGlow = 1;
        if (!this.reducedMotion) this.fovKick = Math.min(4, this.fovKick + 2.2);
        const hot = new THREE.Color('#7dff7a').lerp(new THREE.Color('#ffffff'), 0.3);
        this.sparks.emit(sim.x, sim.y + 1, 0.3, { n: 14 + Math.min(event.combo ?? 1, 8) * 2, speed: 5, up: 2, life: 0.5, size: 0.22, gravity: 4, color: hot });
        break;
      }
      case 'stumble':
        this.dust.emit(sim.x + 0.4, sim.y + 0.3, 0, { n: 16, speed: 2.5, up: 1.4, life: 0.8, size: 0.6, grow: 1.2, color: dustColor, alpha: 0.65 });
        if (!this.reducedMotion) this.shake = Math.max(this.shake, 0.45);
        break;
      case 'land':
        this.dust.emit(sim.x, sim.y + 0.05, 0, { n: event.hard ? 18 : 7, speed: event.hard ? 3.5 : 1.8, up: 0.5, life: 0.6, size: 0.45, grow: 1, color: dustColor, alpha: 0.55, dirX: -1 });
        if (event.hard && !this.reducedMotion) this.shake = Math.max(this.shake, 0.3);
        break;
      case 'vault': case 'kick':
        this.dust.emit(sim.x + 0.6, sim.y + 0.8, 0, { n: 6, speed: 1.4, life: 0.5, size: 0.35, grow: 0.8, color: dustColor, alpha: 0.4 });
        break;
      case 'collapse': {
        const glass = new THREE.Color('#bfe2ff');
        this.sparks.emit(event.x, event.y, 0, { n: 30, speed: 4, up: 1, spread: 3, life: 0.9, size: 0.18, gravity: 14, color: glass });
        this.dust.emit(event.x, event.y, 0, { n: 14, speed: 2, spread: 3, life: 1.1, size: 0.9, grow: 1.5, color: dustColor, alpha: 0.5 });
        if (!this.reducedMotion) this.shake = Math.max(this.shake, 0.5);
        break;
      }
      case 'zip':
        this.sparks.emit(sim.x, sim.y + ZIP_HANG, 0, { n: 10, speed: 3, life: 0.4, size: 0.16, gravity: 8, color: new THREE.Color('#ffd27a') });
        break;
      case 'district':
        this.lastDistrictShown = event.district ?? 0;
        break;
      case 'caught': case 'fell':
        if (this.status === 'running') {
          this.status = 'dying';
          this.dyingTime = 0;
          this.emitHud();
        }
        if (event.type === 'caught') this.sparks.emit(sim.x, sim.y + 1, 0, { n: 30, speed: 3, up: 2, life: 0.9, size: 0.3, color: accent.clone().lerp(new THREE.Color('#ffffff'), 0.8) });
        break;
      default: break;
    }
    if (this.status === 'running' || this.status === 'dying') this.onEvent(event);
  }

  private applyPalette(): void {
    const c = this.palette.colors;
    const n = this.palette.numbers;
    for (const key of ['uFogNear', 'uFogFar', 'uLit', 'uNeon', 'uWet'] as const) this.shared[key].value = n[key.slice(1, 2).toLowerCase() + key.slice(2)];
    const fog = this.stage.scene.fog as THREE.Fog;
    fog.color.copy(c.fog);
    fog.near = n.fogNear;
    fog.far = n.fogFar;
    const sky = this.sky.material.uniforms;
    sky.uSunSize.value = n.sunSize;
    sky.uStars.value = n.stars;
    const sil = this.silhouette.material.uniforms;
    (sil.uColor.value as THREE.Color).copy(c.fog).lerp(c.skyMid, 0.25).multiplyScalar(0.72);
    sil.uLit.value = n.lit;
    this.hemi.color.copy(c.hemiSky);
    this.hemi.groundColor.copy(c.hemiGround);
    this.hemi.intensity = n.hemi;
    this.key.color.copy(c.key);
    this.key.intensity = n.keyIntensity;
  }

  // --- Runner --------------------------------------------------------------------------------------------------

  private updateRunner(dt: number, simDt: number): void {
    const sim = this.sim;
    const rig = this.rig;
    const p = this.target;
    const speed = sim.mode === 'zip' ? sim.zipSpeed : sim.speed;
    const prevPhase = this.runPhase;
    if (sim.grounded && sim.mode === 'run') this.runPhase += simDt * speed * 1.45;
    const ph = this.runPhase;
    const s = Math.sin(ph);
    const cs = Math.cos(ph);
    const lean = -0.18 - speed * 0.012;
    const reset = () => { p.bodyRot = 0; p.head = 0.1; p.bodyY = 0.95; };
    reset();
    let rootRot = 0;
    switch (sim.mode) {
      case 'run': {
        p.bodyY = 0.95 + Math.abs(cs) * 0.06 - 0.03;
        p.torso = lean;
        p.legL = [0.95 * s, -0.25 - 1.25 * Math.max(0, Math.cos(ph - 0.4))];
        p.legR = [-0.95 * s, -0.25 - 1.25 * Math.max(0, Math.cos(ph + Math.PI - 0.4))];
        p.armL = [-0.85 * s, 1.35];
        p.armR = [0.85 * s, 1.35];
        // A footfall every half stride.
        if (Math.floor(prevPhase / Math.PI) !== Math.floor(ph / Math.PI) && this.status === 'running') this.onEvent({ type: 'step', x: sim.x, y: sim.y });
        break;
      }
      case 'air': {
        const rising = sim.vy > 0;
        p.torso = lean * 0.6;
        if (sim.blocked) {
          p.torso = 0.3; p.bodyRot = 0.25;
          p.armL = [2.6, 0.4]; p.armR = [2.8, 0.3]; p.legL = [0.4, -0.8]; p.legR = [-0.2, -0.5];
        } else if (rising) {
          p.legL = [1.2, -1.6]; p.legR = [-0.3, -1.1]; p.armL = [-0.9, 1.2]; p.armR = [1.6, 0.6];
        } else {
          p.legL = [0.9, -0.5]; p.legR = [0.2, -0.9]; p.armL = [1.2, 0.5]; p.armR = [-0.4, 0.8];
        }
        break;
      }
      case 'slide':
        p.bodyY = 0.42;
        p.torso = 0.95;
        p.head = -0.5;
        p.legL = [1.45, -0.05]; p.legR = [0.35, -1.9];
        p.armL = [-0.5, 0.2]; p.armR = [0.9, 0.9];
        break;
      case 'roll': {
        const u = clamp(sim.modeTime / ROLL_TIME, 0, 1);
        p.bodyY = 0.55;
        rootRot = -u * Math.PI * 2;
        p.torso = -0.5;
        p.legL = [1.9, -2.3]; p.legR = [1.7, -2.2]; p.armL = [1.4, 1.4]; p.armR = [1.2, 1.5];
        break;
      }
      case 'vault':
        p.bodyY = 0.9;
        p.torso = -1.1;
        p.head = 0.6;
        p.armL = [0.35, 0.05]; p.armR = [0.9, 0.4];
        p.legL = [1.6, -0.5]; p.legR = [1.1, -1.2];
        break;
      case 'climb': {
        const w = Math.sin(sim.modeTime * 18);
        p.torso = -0.8;
        p.armL = [2.5 + w * 0.3, 0.5]; p.armR = [2.2 - w * 0.3, 0.7];
        p.legL = [0.9 + w * 0.6, -1.4]; p.legR = [0.4 - w * 0.6, -1.2];
        break;
      }
      case 'cling':
        p.torso = 0.15;
        p.armL = [2.9, 0.2]; p.armR = [2.7, 0.3];
        p.legL = [1.3, -1.4]; p.legR = [0.9, -1.0];
        break;
      case 'kick':
        p.torso = -0.15;
        p.armL = [3.0, 0.1]; p.armR = [2.4, 0.4];
        p.legL = [0.2, -0.1]; p.legR = [1.4, -1.8];
        break;
      case 'zip': {
        const swing = Math.sin(sim.clock * 3.2) * 0.12;
        p.bodyRot = swing;
        p.torso = 0.05;
        p.armL = [3.05, 0]; p.armR = [3.0, 0.05];
        p.legL = [0.5, -0.4]; p.legR = [0.3, -0.6];
        break;
      }
      case 'caught':
        p.torso = 0.08;
        p.head = 0.35;
        p.armL = [2.75, 0.5]; p.armR = [2.75, 0.5];
        p.legL = [0.15, 0]; p.legR = [-0.15, 0];
        break;
      case 'fallen': {
        p.torso = 0.4;
        p.armL = [2.6 + Math.sin(sim.clock * 9), 0.3]; p.armR = [2.2 - Math.sin(sim.clock * 9), 0.5];
        p.legL = [0.6, -0.4]; p.legR = [-0.2, -0.7];
        rootRot = sim.blocked ? 0.3 : sim.clock * 2;
        break;
      }
    }
    // Stumbles throw the upper body forward for a moment.
    const sinceStumble = sim.clock - sim.lastStumble;
    if (sinceStumble < 0.45) {
      const k = 1 - sinceStumble / 0.45;
      p.torso -= 0.55 * k;
      p.armL[0] += 1.4 * k;
      p.armR[0] -= 0.8 * k;
    }
    const snap = sim.mode === 'roll' || sim.mode === 'vault' ? 30 : 16;
    blendPose(this.pose, p, dt > 0 ? damp(snap, dt) : 0);
    applyPose(rig, this.pose);
    rig.root.position.set(sim.x, sim.y + (sim.mode === 'roll' ? 0 : 0), 0);
    if (sim.mode === 'roll') {
      // Roll about the body's centre, not the feet.
      rig.root.position.y = sim.y + 0.5;
      rig.body.position.y = 0.0;
      rig.root.rotation.z = rootRot;
    } else {
      rig.root.rotation.z = lerp(rig.root.rotation.z % (Math.PI * 2), rootRot, dt > 0 ? damp(12, dt) : 0);
      if (sim.mode === 'fallen') rig.root.rotation.z = rootRot;
    }
    // Blob shadow on the surface below.
    const below = this.surfaceBelow(sim.x, sim.y + 0.05);
    if (below !== null && sim.y - below < 12) {
      const h = sim.y - below;
      this.shadow.visible = true;
      this.shadow.position.set(sim.x, below + 0.03, 0);
      const size = 1.1 + h * 0.12;
      this.shadow.scale.set(size, size * 0.8, 1);
      (this.shadow.material as THREE.MeshBasicMaterial).opacity = clamp(0.55 - h * 0.05, 0.1, 0.55);
    } else {
      this.shadow.visible = false;
    }
  }

  /** Highest drawn surface under x at or below y, or null over a gap. */
  private surfaceBelow(x: number, y: number): number | null {
    let best: number | null = null;
    const test = (top: number, x0: number, x1: number) => {
      if (x < x0 - HALF_WIDTH || x > x1 + HALF_WIDTH || top > y) return;
      if (best === null || top > best) best = top;
    };
    for (const r of this.sim.course.roofs) test(r.top, r.x0, r.x1);
    for (const p of this.sim.course.panels) if (p.state !== 'falling') test(p.top, p.x0, p.x1);
    for (const o of this.sim.course.obstacles) if (o.kind === 'vault') test(o.y1, o.x0, o.x1);
    return best;
  }

  // --- Camera --------------------------------------------------------------------------------------------------

  private updateCamera(dt: number): void {
    const sim = this.sim;
    const { camera, width, height } = this.stage;
    const aspect = width / height;
    const portrait = aspect < 1;
    const speed = sim.mode === 'zip' ? sim.zipSpeed : sim.speed;
    const ahead = portrait ? clamp(6 + speed * 0.7, 10, 17.5) : clamp(10 + speed * 0.75, 13, 22);
    const behind = portrait ? 3.2 : 8;
    let span = ahead + behind;
    if (!portrait) span = Math.max(span, 9.5 * aspect);
    const tanHalf = Math.tan(THREE.MathUtils.degToRad(FOV) / 2);
    const dist = clamp(span / (2 * tanHalf * aspect), 9, 70);

    // Follow the roofs, and the runner when they go well above or below them.
    if (sim.alive || sim.status === 'caught') {
      let target = sim.lastTop;
      const off = sim.y - sim.lastTop;
      if (off > 1.6) target += (off - 1.6) * 0.6;
      if (off < -1) target += Math.max(off + 1, -4);
      if (sim.mode === 'zip') target = sim.y;
      this.groundY = lerp(this.groundY, target, damp(sim.mode === 'zip' ? 4 : 2.6, dt));
    }
    const centerX = sim.x + (ahead - behind) / 2;
    this.camX = lerp(this.camX, centerX, damp(8, dt));
    const centerY = this.groundY + (portrait ? 2.6 : 2.3);
    this.camY = lerp(this.camY, centerY, damp(6, dt));
    this.fovKick = Math.max(0, this.fovKick - dt * 5);
    this.shake = Math.max(0, this.shake - dt * 2.2);
    const shakeX = this.shake > 0 ? (Math.random() - 0.5) * this.shake * 0.5 : 0;
    const shakeY = this.shake > 0 ? (Math.random() - 0.5) * this.shake * 0.5 : 0;
    const fov = FOV + this.fovKick;
    if (Math.abs(camera.fov - fov) > 0.01) { camera.fov = fov; camera.updateProjectionMatrix(); }
    camera.position.set(this.camX + shakeX, this.camY + dist * 0.15 + shakeY, dist);
    camera.lookAt(this.camX, this.camY, 0);
    this.shared.uGround.value = this.groundY;

    this.sky.position.copy(camera.position);
    this.silhouette.position.x = camera.position.x;
    this.silhouette.position.y = this.groundY + 30;
    // The visible strip near the course, for keeping the drone in frame.
    this.viewLeft = camera.position.x - (dist - 1.2) * tanHalf * aspect;
    camera.updateMatrixWorld();
    const halfAt = (z: number) => (dist - z) * tanHalf * aspect + 12;
    this.backdrops[0].update(camera.position.x, halfAt(-78));
    this.backdrops[1].update(camera.position.x, halfAt(-32));
    const scale = height * 0.5 / tanHalf;
    this.dust.scale = scale;
    this.sparks.scale = scale;
  }

  // --- Course --------------------------------------------------------------------------------------------------

  private syncCourse(): void {
    const course = this.sim.course;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const v = new THREE.Vector3();
    const sc = new THREE.Vector3();
    let i = 0;
    for (const roof of course.roofs) {
      if (roof.kind === 'boom' || i >= MAX_ROOFS) continue;
      const style = roof.wall ? 2 : roof.kind === 'deck' ? 1 : districtKey(roof.district) === 'harbour' && roof.seed < 0.45 ? 3 : 0;
      m.makeScale(roof.x1 - roof.x0, roof.top - BOTTOM, ROOF_Z1 - ROOF_Z0);
      m.setPosition((roof.x0 + roof.x1) / 2, roof.top, (ROOF_Z0 + ROOF_Z1) / 2);
      this.roofs.setMatrixAt(i, m);
      this.roofInfo.setXYZW(i, roof.seed, style, 0, 0);
      i++;
    }
    this.roofs.count = i;
    this.roofs.instanceMatrix.needsUpdate = true;
    this.roofInfo.needsUpdate = true;

    let ac = 0;
    let pipe = 0;
    for (const ob of course.obstacles) {
      if (ob.kind === 'vault' && ac < MAX_PROPS) {
        m.makeScale((ob.x1 - ob.x0) / 1.4, (ob.y1 - ob.y0) / 1.0, 1);
        m.setPosition((ob.x0 + ob.x1) / 2, ob.y0, 0);
        this.acUnits.setMatrixAt(ac++, m);
      } else if (ob.kind === 'pipe' && pipe < MAX_PROPS) {
        m.makeTranslation((ob.x0 + ob.x1) / 2, ob.y0 - PIPE_LOW, 0);
        this.pipes.setMatrixAt(pipe++, m);
      }
    }
    this.acUnits.count = ac;
    this.pipes.count = pipe;
    this.acUnits.instanceMatrix.needsUpdate = this.pipes.instanceMatrix.needsUpdate = true;

    let boom = 0;
    for (const roof of course.roofs) {
      if (roof.kind !== 'boom' || boom >= 8) continue;
      m.makeScale((roof.x1 - roof.x0) / 10, 1, 1);
      m.setPosition(roof.x0, roof.top, 0);
      this.booms.setMatrixAt(boom, m);
      m.makeTranslation((roof.x0 + roof.x1) / 2, roof.top, -0.2);
      this.towers.setMatrixAt(boom, m);
      boom++;
    }
    this.booms.count = this.towers.count = boom;
    this.booms.instanceMatrix.needsUpdate = this.towers.instanceMatrix.needsUpdate = true;

    let panel = 0;
    let column = 0;
    const color = new THREE.Color();
    for (const p of course.panels) {
      if (panel >= 32) break;
      const crack = p.state === 'cracking' ? 1 : p.state === 'falling' ? 1 : 0;
      const wobble = p.state === 'cracking' && !this.reducedMotion ? Math.sin(this.sim.clock * 50 + p.x0) * 0.03 : 0;
      q.setFromAxisAngle(v.set(0, 0, 1), p.state === 'falling' ? Math.min(0.5, p.drop * 0.08) * (p.id % 2 ? 1 : -1) : wobble);
      m.compose(v.set((p.x0 + p.x1) / 2, p.top - 0.09 - p.drop, (ROOF_Z0 + ROOF_Z1) / 2), q, sc.set(p.x1 - p.x0 - 0.08, 1, 1));
      this.panels.setMatrixAt(panel, m);
      this.panels.setColorAt(panel, color.set(crack ? '#ffb0a0' : '#ffffff'));
      panel++;
      if (column < 63) {
        // Steel columns down to the deck, at the back of the canopy.
        const deckTop = p.top - 4.6;
        m.compose(v.set(p.x0 + 0.15, (p.top + deckTop) / 2, ROOF_Z0 + 0.6), q.identity(), sc.set(1, p.top - deckTop, 1));
        this.columns.setMatrixAt(column++, m);
      }
    }
    this.panels.count = panel;
    this.columns.count = column;
    this.panels.instanceMatrix.needsUpdate = this.columns.instanceMatrix.needsUpdate = true;
    if (this.panels.instanceColor) this.panels.instanceColor.needsUpdate = true;

    let cable = 0;
    let mast = 0;
    let trolley = 0;
    for (const zip of course.zips) {
      if (cable >= 6) break;
      const dx = zip.x1 - zip.x0;
      const dy = zip.y1 - zip.y0;
      const length = Math.hypot(dx, dy);
      q.setFromAxisAngle(v.set(0, 0, 1), Math.atan2(dy, dx));
      m.compose(v.set((zip.x0 + zip.x1) / 2, (zip.y0 + zip.y1) / 2, 0), q, sc.set(length + 0.6, 1, 1));
      this.cables.setMatrixAt(cable++, m);
      for (const [x, y, top] of [[zip.x0 - 0.3, zip.launchTop, zip.y0], [zip.x1 + 0.3, zip.y1 - 4.6, zip.y1]] as const) {
        m.compose(v.set(x, y, 0), q.identity(), sc.set(1, top - y + 0.1, 1));
        this.masts.setMatrixAt(mast++, m);
      }
      // The trolley waits at the top until it is ridden, then travels with the runner's hands.
      const riding = this.sim.zip === zip;
      const u = riding ? this.sim.zipS / length : zip.ridden ? 1 : 0;
      m.makeTranslation(zip.x0 + dx * u, zip.y0 + dy * u, 0);
      this.trolleys.setMatrixAt(trolley++, m);
    }
    this.cables.count = cable;
    this.masts.count = mast;
    this.trolleys.count = trolley;
    this.cables.instanceMatrix.needsUpdate = this.masts.instanceMatrix.needsUpdate = this.trolleys.instanceMatrix.needsUpdate = true;
  }

  // --- Drone and searchlight -----------------------------------------------------------------------------------

  private roofTopAt(x: number): number {
    let best = -Infinity;
    for (const r of this.sim.course.roofs) if (x >= r.x0 && x <= r.x1 && r.top > best) best = r.top;
    return Number.isFinite(best) ? best : this.groundY - 6;
  }

  private updateDrone(dt: number, t: number): void {
    const sim = this.sim;
    const caught = sim.status === 'caught';
    const lead = this.status === 'idle' ? 15 + Math.sin(t * 0.3) * 5 : sim.lead;
    const targetX = caught ? sim.x : sim.x - lead;
    this.spotX = lerp(this.spotX, targetX, damp(caught ? 3 : 10, dt));
    const ground = this.roofTopAt(this.spotX);
    this.spotY = lerp(this.spotY, ground, damp(6, dt));
    // The drone keeps pace in the top corner of the frame; its beam drags behind and swings in as it gains.
    // Below the HUD strip at the top of the frame.
    const camera = this.stage.camera;
    const ray = this.ray.set(0, 1 - 2 * clamp(this.safeTop, 0.05, 0.6), 0.5).unproject(camera).sub(camera.position);
    const below = camera.position.y + ray.y * ((1.2 - camera.position.z) / ray.z);
    const wantY = Math.min(Math.max(this.groundY, ground) + 7, below);
    this.droneY = lerp(this.droneY, wantY, damp(2.5, dt));
    const wantX = caught ? this.spotX - 1.5 : Math.min(sim.x - 2.5, Math.max(this.spotX - 4.2, this.viewLeft + 2.4));
    this.droneX = lerp(this.droneX, wantX, damp(caught ? 3 : 9, dt));
    const bob = Math.sin(t * 2.1) * 0.25;
    this.drone.position.set(this.droneX, this.droneY + bob, 1.2);
    this.drone.rotation.z = -0.12 + Math.sin(t * 1.3) * 0.04;
    this.rotors.rotation.y = t * 30;
    // Police lights alternate at about 1.2 Hz, gently (steady and dim when reduced motion is preferred).
    const phase = this.reducedMotion ? 0.5 : 0.5 + 0.5 * Math.sin(t * Math.PI * 2 * 1.2);
    this.droneLights[0].material.opacity = this.reducedMotion ? 0.6 : 0.25 + 0.75 * phase;
    this.droneLights[1].material.opacity = this.reducedMotion ? 0.6 : 0.25 + 0.75 * (1 - phase);

    const lamp = new THREE.Vector3(this.drone.position.x + 0.35, this.drone.position.y - 0.4, this.drone.position.z);
    const spot = new THREE.Vector3(this.spotX, this.spotY, 0);
    const dir = spot.clone().sub(lamp);
    const length = dir.length();
    const radius = 1.7 + (caught ? 0.4 : 0);
    this.cone.position.copy(lamp);
    this.cone.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), dir.clone().normalize());
    this.cone.scale.set(radius, length, radius);
    const closeness = 1 - clamp(lead / LEAD_MAX, 0, 1);
    this.cone.material.uniforms.uIntensity.value = 0.12 + closeness * 0.2 + (caught ? 0.25 : 0);
    this.searchlight.position.copy(lamp);
    this.searchlight.target.position.copy(spot);
    this.searchlight.intensity = 90;
    (this.shared.uSpot.value as THREE.Vector4).set(this.spotX, this.spotY, radius * 1.15, 0.9 + (caught ? 0.4 : 0));
  }

  // --- District decor ------------------------------------------------------------------------------------------

  private updateDecor(t: number): void {
    const camX = this.stage.camera.position.x;
    const key = this.paletteKey;
    // Harbour cranes stand in the water behind the skyline.
    const harbour = key === 'harbour';
    if (harbour && (this.decorAnchor.cranes < camX - 160 || this.decorAnchor.cranes > camX + 400)) this.decorAnchor.cranes = camX + 80;
    const m = new THREE.Matrix4();
    let g = 0;
    if (this.decorAnchor.cranes > camX - 220) {
      for (let i = 0; i < 4; i++) {
        const x = this.decorAnchor.cranes + i * 62;
        if (x < camX - 180 || x > camX + 260) continue;
        m.makeTranslation(x, -24, -120 - (i % 2) * 30);
        this.gantries.setMatrixAt(g++, m);
      }
    }
    this.gantries.count = harbour || g ? g : 0;
    this.gantries.instanceMatrix.needsUpdate = true;
    // A Ferris wheel over the theme park.
    const park = key === 'park';
    if (park && (this.decorAnchor.wheel < camX - 140 || this.decorAnchor.wheel > camX + 400)) this.decorAnchor.wheel = camX + 90;
    this.wheel.visible = this.decorAnchor.wheel > camX - 160 && this.decorAnchor.wheel < camX + 260;
    this.wheel.position.set(this.decorAnchor.wheel, 12, -95);
    if (!this.reducedMotion) this.wheelSpin.rotation.z = -t * 0.08;
  }

  // --- Effects -------------------------------------------------------------------------------------------------

  private updateEffects(dt: number): void {
    const sim = this.sim;
    this.dust.update(dt);
    this.sparks.update(dt);
    this.boostGlow = Math.max(0, this.boostGlow - dt * 1.6);

    // Rain falls around the camera; streak length follows the runner's speed.
    const rainAmount = this.palette.numbers.rain;
    const rainMat = this.rain.material as THREE.LineBasicMaterial;
    rainMat.opacity = rainAmount * 0.38;
    this.rain.visible = rainAmount > 0.02;
    if (this.rain.visible) {
      const pos = this.rain.geometry.getAttribute('position') as THREE.BufferAttribute;
      const cx = this.camX;
      const cy = this.camY;
      const speed = sim.speed;
      for (let i = 0; i < this.rainDrops.length / 3; i++) {
        let x = this.rainDrops[i * 3];
        let y = this.rainDrops[i * 3 + 1] - dt * 24;
        if (y < -16) { y += 46; x = Math.random() * 70 - 35; }
        this.rainDrops[i * 3] = x;
        this.rainDrops[i * 3 + 1] = y;
        const z = this.rainDrops[i * 3 + 2];
        const wx = ((x - cx * 0.0 + 1e4) % 70) - 35 + cx;
        pos.setXYZ(i * 2, wx, cy + y, z);
        pos.setXYZ(i * 2 + 1, wx + 0.12 + speed * 0.012, cy + y + 0.9, z);
      }
      pos.needsUpdate = true;
    }

    // Speed lines after perfect moves and near the top speed.
    const top = sim.speeds.top;
    const fast = clamp((sim.speed - (top - 1.2)) / 1.2, 0, 1) * 0.5;
    const amount = Math.max(this.boostGlow, fast) * (this.reducedMotion ? 0.35 : 1) * (sim.alive ? 1 : 0);
    const lineMat = this.lines.material as THREE.LineBasicMaterial;
    lineMat.opacity = amount * 0.55;
    this.lines.visible = amount > 0.01;
    if (this.lines.visible) {
      const pos = this.lines.geometry.getAttribute('position') as THREE.BufferAttribute;
      const seeds = this.lines.geometry.userData.seeds as number[][];
      const clock = sim.clock;
      seeds.forEach(([a, b, c], i) => {
        const u = (a + clock * (1.6 + b)) % 1;
        const x = sim.x + 3 - u * 12;
        const y = sim.y + 0.2 + b * 2.2;
        const z = -1.5 + c * 4;
        const len = 0.8 + c * 1.6;
        pos.setXYZ(i * 2, x, y, z);
        pos.setXYZ(i * 2 + 1, x - len, y, z);
      });
      pos.needsUpdate = true;
    }
  }

  private updateCue(dt: number): void {
    const sim = this.sim;
    const cue: Cue | null = this.status === 'running' ? sim.cue(1.6) : null;
    const show = !!cue && cue.tau < 1.25;
    this.cueAlpha = lerp(this.cueAlpha, show ? 1 : 0, damp(show ? 14 : 8, dt));
    this.cue.visible = this.cueAlpha > 0.02;
    if (!this.cue.visible) return;
    const u = this.cue.material.uniforms;
    if (cue && show) {
      u.uIcon.value = ICONS[cue.move];
      const hot = cue.tau <= cue.window + 1e-6 && cue.tau >= -cue.late;
      u.uHot.value = hot ? 1 : 0;
      u.uProgress.value = hot ? 1 : clamp(1 - (cue.tau - cue.window) / 0.9, 0, 1);
      // Above the contact point, clear of the runner's head when they arrive there.
      this.cue.position.set(cue.x, cue.y + 1.2, 0.8);
    }
    u.uAlpha.value = this.cueAlpha;
    const camera = this.stage.camera;
    this.cue.quaternion.copy(camera.quaternion);
    // A steady size on screen: about 7% of the view height, 44-68 px.
    const { height } = this.stage;
    const metresPerPx = (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2) * (camera.position.z - 0.8)) / Math.max(1, height);
    const size = clamp(height * 0.075, 44, 68) * metresPerPx * (u.uHot.value ? 1.12 : 1);
    this.cue.scale.set(size, size, 1);
  }

  private emitHud(): void {
    const sim = this.sim;
    const sp = sim.speeds;
    this.onHud({
      distance: Math.floor(sim.distance), speed: sim.mode === 'zip' ? sim.zipSpeed : sim.speed, top: sp.top, floor: sp.floor, drone: sp.drone,
      lead: sim.lead, combo: sim.combo, district: sim.district,
    });
  }
}
