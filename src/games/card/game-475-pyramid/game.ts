import { THREE, createStage, createLoop, Keys, trackPointer, clamp, damp, lerp, rng, prefersReducedMotion, type Stage } from '../../../shared/three/kit';
import {
  WASTE, PYRAMID_SIZE, MAX_PASSES, ROW_BONUS, rowOf, colOf, rankOf, cardAt, isAvailable, availableSlots, canPair, canDraw,
  canRedeal, redealsLeft, pyramidLeft, rowsEmpty, isWon, isStuck, findHint, removals, finalScore, newGame, shuffleDeck, startSession,
  play, undo as undoSession, solve, WINNABLE_DEALS, type Action, type State, type Session, type FinalScore,
} from './logic';
import { buildAtlas, atlasRect, buildBack, buildFelt, buildGrain, buildGlow, buildDot, buildSlotMark, buildMiniCard, RANK_LABELS, SUIT_CHARS } from './textures';

export interface Hud { score: number; moves: number; seconds: number; deal: number; redeals: number; stock: number; left: number; canUndo: boolean; /** A draw or a redeal is possible. */ canDraw: boolean; /** The table takes moves (false during the win celebration and before the stuck result). */ canHint: boolean; }
export interface Result { won: boolean; deal: number; seconds: number; moves: number; left: number; score: FinalScore; }
export type GameEvent = 'deal' | 'draw' | 'select' | 'match' | 'king' | 'invalid' | 'redeal' | 'undo' | 'hint' | 'row' | 'win' | 'stuck';
export type Status = 'idle' | 'playing' | 'paused' | 'won' | 'stuck';

// Card size and table layout in world units (a card is 1 x 1.4, lying on the XZ plane).
const CW = 1;
const CH = 1.4;
const CT = 0.018;
const RADIUS = 0.085;
const STEP_X = 1.08;
const STEP_Z = 0.56;
const ROW_Y = 0.028;
const PILE_Y = 0.016;
const DISCARD_Y = 0.012;
const FAN_X = 0.22;
const BASE_Y = CT / 2 + 0.003;
/** Focus id for the stock pile (pyramid slots are 0..27, the waste top is WASTE). */
const STOCK = -1;
const EMERALD = new THREE.Color('#34d399');
const GOLD = new THREE.Color('#fcd34d');

type Zone = 'pyramid' | 'stock' | 'waste' | 'discard';
interface Place { zone: Zone; index: number; }

interface Layout {
  wide: boolean;
  slots: THREE.Vector3[];
  stock: THREE.Vector3;
  waste: THREE.Vector3;
  discard: THREE.Vector3;
  chips: THREE.Vector3[];
  min: THREE.Vector3;
  max: THREE.Vector3;
  center: THREE.Vector3;
}

/** Wide screens put the stock and waste in the empty top-left corner beside the apex; tall screens put them below. */
function makeLayout(wide: boolean): Layout {
  // Phones are width-bound, so tall layouts close the column gaps a little to get bigger cards.
  const stepX = wide ? STEP_X : STEP_X - 0.04;
  const slots = Array.from({ length: PYRAMID_SIZE }, (_, slot) => {
    const row = rowOf(slot);
    return new THREE.Vector3((colOf(slot) - row / 2) * stepX, BASE_Y + row * ROW_Y, row * STEP_Z);
  });
  let stock: THREE.Vector3, waste: THREE.Vector3, discard: THREE.Vector3;
  const chips: THREE.Vector3[] = [];
  if (wide) {
    stock = new THREE.Vector3(-3.95, BASE_Y, 0.15);
    waste = new THREE.Vector3(-2.72, BASE_Y, 0.15);
    discard = new THREE.Vector3(3.9, BASE_Y, 0.15);
    for (let i = 0; i < MAX_PASSES - 1; i++) chips.push(new THREE.Vector3(-4.12 + i * 0.36, 0, 1.18));
  } else {
    const z = 6 * STEP_Z + CH + 0.32;
    stock = new THREE.Vector3(-2.75, BASE_Y, z);
    waste = new THREE.Vector3(-1.5, BASE_Y, z);
    discard = new THREE.Vector3(2.75, BASE_Y, z);
    for (let i = 0; i < MAX_PASSES - 1; i++) chips.push(new THREE.Vector3(0.62 + i * 0.36, 0, z));
  }
  const min = new THREE.Vector3(Infinity, 0, Infinity);
  const max = new THREE.Vector3(-Infinity, 0.9, -Infinity);
  const grow = (p: THREE.Vector3, w = CW / 2, h = CH / 2) => {
    min.x = Math.min(min.x, p.x - w); max.x = Math.max(max.x, p.x + w);
    min.z = Math.min(min.z, p.z - h); max.z = Math.max(max.z, p.z + h);
  };
  slots.forEach(p => grow(p));
  [stock, waste, discard, waste.clone().setX(waste.x + FAN_X * 2)].forEach(p => grow(p));
  chips.forEach(p => grow(p, 0.16, 0.16));
  const center = min.clone().add(max).multiplyScalar(0.5).setY(0);
  return { wide, slots, stock, waste, discard, chips, min, max, center };
}

/** Deterministic value in [-1, 1] per card, for the messy discard pile. */
const jitter = (card: number, k: number) => {
  const v = Math.sin(card * 12.9898 + k * 78.233) * 43758.5453;
  return (v - Math.floor(v)) * 2 - 1;
};
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
export const cardLabel = (card: number) => `${RANK_LABELS[rankOf(card)]}${SUIT_CHARS[Math.floor(card / 13)]}`;

function roundedRect(w: number, h: number, r: number): THREE.Shape {
  const s = new THREE.Shape();
  const x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.absarc(x + w - r, y + r, r, -Math.PI / 2, 0, false);
  s.lineTo(x + w, y + h - r);
  s.absarc(x + w - r, y + h - r, r, 0, Math.PI / 2, false);
  s.lineTo(x + r, y + h);
  s.absarc(x + r, y + h - r, r, Math.PI / 2, Math.PI, false);
  s.lineTo(x, y + r);
  s.absarc(x + r, y + r, r, Math.PI, Math.PI * 1.5, false);
  return s;
}

interface Tween {
  from: THREE.Vector3; to: THREE.Vector3;
  flipFrom: number; flipTo: number;
  yawFrom: number; yawTo: number;
  start: number; dur: number; arc: number;
  ease: (t: number) => number;
}

class CardView {
  readonly root = new THREE.Group();
  readonly body: THREE.Mesh;
  readonly faceMat: THREE.MeshStandardMaterial;
  readonly pos = new THREE.Vector3();
  flip = Math.PI;
  yaw = 0;
  readonly endPos = new THREE.Vector3();
  endFlip = Math.PI;
  endYaw = 0;
  queue: Tween[] = [];
  hover = 0; select = 0; hint = 0; focus = 0; avail = 1; shake = 0; tilt = 0;
  /** Pose checksum of the last frame, to tell whether anything moved (Infinity forces the first update). */
  sig = Infinity;

  constructor(readonly card: number, bodyGeo: THREE.BufferGeometry, edgeMat: THREE.Material, faceGeo: THREE.BufferGeometry, faceMat: THREE.MeshStandardMaterial, backGeo: THREE.BufferGeometry, backMat: THREE.Material) {
    this.faceMat = faceMat;
    this.body = new THREE.Mesh(bodyGeo, edgeMat);
    this.body.castShadow = true;
    this.body.userData.card = card;
    const face = new THREE.Mesh(faceGeo, faceMat);
    const back = new THREE.Mesh(backGeo, backMat);
    face.receiveShadow = back.receiveShadow = true;
    this.root.add(this.body, face, back);
  }
}

interface Halo { mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>; level: number; /** Card it last lit; it keeps following it while fading out. */ last: CardView | null; stock: boolean; }
interface Popup { sprite: THREE.Sprite; ctx: CanvasRenderingContext2D; tex: THREE.CanvasTexture; age: number; base: THREE.Vector3; }
interface Confetto { p: THREE.Vector3; v: THREE.Vector3; q: THREE.Quaternion; axis: THREE.Vector3; spin: number; phase: number; landed: boolean; }

export class PyramidGame {
  onHud: (hud: Hud) => void = () => {};
  onEvent: (event: GameEvent) => void = () => {};
  onOver: (result: Result) => void = () => {};
  onToast: (key: string, params?: Record<string, string | number>, warn?: boolean) => void = () => {};
  onAnnounce: (key: string, params?: Record<string, string | number>) => void = () => {};

  private stage: Stage;
  private host: HTMLElement;
  private keys = new Keys();
  private loop = createLoop((dt, t) => this.frame(dt, t));
  private motion = prefersReducedMotion() ? 0.55 : 1;
  private raycaster = new THREE.Raycaster();
  private ndc = new THREE.Vector2();
  private tmp = new THREE.Vector3();
  private tmp2 = new THREE.Vector3();
  private stepQuat = new THREE.Quaternion();
  private dummy = new THREE.Object3D();

  private views: CardView[] = [];
  private pickables: THREE.Object3D[] = [];
  private table!: THREE.Mesh;
  private spot!: THREE.SpotLight;
  private stockMark!: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  private wasteMark!: THREE.Mesh;
  private discardMark!: THREE.Mesh;
  private markTextures!: Record<'none' | 'redeal' | 'empty', THREE.Texture>;
  private chips: THREE.Group[] = [];
  private halos!: Record<'select' | 'focus' | 'hintA' | 'hintB', Halo>;
  private burst!: THREE.Points;
  private burstVel = new Float32Array(0);
  private burstLife = new Float32Array(0);
  private burstBase = new Float32Array(0);
  private burstCursor = 0;
  private confetti!: THREE.InstancedMesh;
  private confettiState: Confetto[] = [];
  private confettiOn = false;
  private dust!: THREE.Points;
  private popups: Popup[] = [];

  private layout: Layout = makeLayout(true);
  private insets = { top: 80, bottom: 80 };
  private elevation = 1;
  private distance = 14;
  private target = new THREE.Vector3();

  private state: Status = 'idle';
  private dealNo = 1;
  private session: Session = startSession(newGame(shuffleDeck(rng(1))));
  private places: Place[] = [];
  private selected: number | null = null;
  private focus: number | null = null;
  private keyboardMode = false;
  private hovered: number | null = null;
  private hoverStock = false;
  private pointer = { x: 0, y: 0, dirty: false, inside: false };
  private hintCards: number[] = [];
  private hintStock = false;
  private hintUntil = 0;
  private time = 0;
  private lockedUntil = 0;
  private seconds = 0;
  /** performance.now() at the last frame the clock ran, or 0 when it was stopped. */
  private clockAt = 0;
  private lastSecond = -1;
  /** Bumped on every stuck position, so a stale game-over timer from before an undo does nothing. */
  private overToken = 0;
  private winStart = -1;
  private timers: Array<{ at: number; fn: () => void }> = [];
  // Render on demand: a resting card table needs no new frames (or shadow maps) every vsync.
  private moved = true;
  private effects = true;
  private needsRender = true;
  private frameCount = 0;

  static create(host: HTMLElement): PyramidGame | null {
    const stage = createStage(host, { fov: 36, near: 0.5, far: 120, shadows: true });
    return stage ? new PyramidGame(host, stage) : null;
  }

  private constructor(host: HTMLElement, stage: Stage) {
    this.host = host;
    this.stage = stage;
    // three r186 removed PCFSoftShadowMap and warns when it is requested; PCF with a blur radius looks the same.
    stage.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.buildScene();
    trackPointer(host, { tap: (x, y) => this.tap(x, y) });
    host.addEventListener('pointermove', event => {
      if (event.pointerType !== 'mouse') return;
      const rect = host.getBoundingClientRect();
      this.pointer.x = event.clientX - rect.left;
      this.pointer.y = event.clientY - rect.top;
      this.pointer.dirty = true;
      this.pointer.inside = true;
    });
    host.addEventListener('pointerleave', () => { this.pointer.inside = false; this.pointer.dirty = true; });
    stage.onResize(() => this.fit());
    this.loop.start();
  }

  get status(): Status { return this.state; }
  get deal(): number { return this.dealNo; }

  // ---------------------------------------------------------------- scene

  private buildScene(): void {
    const { scene, renderer } = this.stage;
    scene.background = new THREE.Color('#020a07');
    const anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());

    const felt = buildFelt();
    felt.anisotropy = anisotropy;
    const grain = buildGrain();
    grain.repeat.set(36, 36);
    // Felt is matte, so Lambert looks the same as a rough standard material at a fraction of the cost.
    this.table = new THREE.Mesh(
      new THREE.PlaneGeometry(22, 22),
      new THREE.MeshLambertMaterial({ map: felt, bumpMap: grain, bumpScale: 0.22 }),
    );
    this.table.rotation.x = -Math.PI / 2;
    this.table.receiveShadow = true;
    scene.add(this.table);

    scene.add(new THREE.HemisphereLight(0xfff0d8, 0x062018, 0.5));
    const fill = new THREE.DirectionalLight(0xfff4e6, 0.3);
    fill.position.set(0, 10, 12);
    scene.add(fill);
    this.spot = new THREE.SpotLight(0xffdfae, 4.2, 0, 0.66, 0.62, 0);
    this.spot.castShadow = true;
    // The table only changes when something moves, so the shadow map is redrawn on demand.
    renderer.shadowMap.autoUpdate = false;
    renderer.shadowMap.needsUpdate = true;
    const small = Math.min(window.innerWidth, window.innerHeight) < 600;
    this.spot.shadow.mapSize.set(small ? 1024 : 2048, small ? 1024 : 2048);
    this.spot.shadow.bias = -0.0004;
    this.spot.shadow.normalBias = 0.02;
    this.spot.shadow.radius = 4;
    this.spot.shadow.camera.near = 6;
    this.spot.shadow.camera.far = 32;
    scene.add(this.spot, this.spot.target);

    // Cards: one atlas texture shared by 52 face materials (per-card tint and glow), one back material.
    const atlas = buildAtlas();
    atlas.anisotropy = anisotropy;
    const back = buildBack();
    back.anisotropy = anisotropy;
    const shape = roundedRect(CW, CH, RADIUS);
    const bodyGeo = new THREE.ExtrudeGeometry(shape, { depth: CT, bevelEnabled: false, curveSegments: 5 });
    bodyGeo.translate(0, 0, -CT / 2);
    const edgeMat = new THREE.MeshStandardMaterial({ color: 0xd8b25e, metalness: 0.55, roughness: 0.35 });
    const backGeo = new THREE.ShapeGeometry(shape, 5);
    this.remapUV(backGeo, [0, 0, 1, 1]);
    backGeo.rotateY(Math.PI);
    backGeo.translate(0, 0, -CT / 2 - 0.0008);
    const backMat = new THREE.MeshStandardMaterial({ map: back, roughness: 0.42, metalness: 0.08, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
    for (let card = 0; card < 52; card++) {
      const faceGeo = new THREE.ShapeGeometry(shape, 5);
      this.remapUV(faceGeo, atlasRect(card));
      faceGeo.translate(0, 0, CT / 2 + 0.0008);
      const faceMat = new THREE.MeshStandardMaterial({ map: atlas, roughness: 0.62, metalness: 0, emissive: EMERALD, emissiveIntensity: 0, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
      const view = new CardView(card, bodyGeo, edgeMat, faceGeo, faceMat, backGeo, backMat);
      this.views.push(view);
      this.pickables.push(view.body);
      scene.add(view.root);
    }

    // Pile outlines on the felt.
    this.markTextures = { none: buildSlotMark('none'), redeal: buildSlotMark('redeal'), empty: buildSlotMark('empty') };
    const markGeo = new THREE.PlaneGeometry(CW * 1.04, CH * 1.04);
    const mark = (map: THREE.Texture) => {
      const mesh = new THREE.Mesh(markGeo, new THREE.MeshBasicMaterial({ map, transparent: true, depthWrite: false, opacity: 0.9 }));
      mesh.rotation.x = -Math.PI / 2;
      scene.add(mesh);
      return mesh;
    };
    this.stockMark = mark(this.markTextures.redeal);
    this.stockMark.userData.stock = true;
    this.pickables.push(this.stockMark);
    this.wasteMark = mark(this.markTextures.none);
    this.discardMark = mark(this.markTextures.none);

    // Redeal tokens: gold chips with an emerald inlay, one per redeal left.
    const chipGeo = new THREE.CylinderGeometry(0.15, 0.15, 0.05, 32);
    const inlayGeo = new THREE.CylinderGeometry(0.095, 0.095, 0.054, 32);
    const chipMat = new THREE.MeshStandardMaterial({ color: 0xe0b552, metalness: 0.85, roughness: 0.28 });
    const inlayMat = new THREE.MeshStandardMaterial({ color: 0x1fa577, metalness: 0.2, roughness: 0.3, emissive: 0x0f7a55, emissiveIntensity: 0.55 });
    for (let i = 0; i < MAX_PASSES - 1; i++) {
      const chip = new THREE.Group();
      const disc = new THREE.Mesh(chipGeo, chipMat);
      disc.castShadow = true;
      chip.add(disc, new THREE.Mesh(inlayGeo, inlayMat));
      this.chips.push(chip);
      scene.add(chip);
    }

    // Halos: soft glow planes under selected / focused / hinted cards.
    const glow = buildGlow();
    const haloGeo = new THREE.PlaneGeometry(CW * 1.56, CH * 1.43);
    const halo = (color: THREE.Color): Halo => {
      const mesh = new THREE.Mesh(haloGeo, new THREE.MeshBasicMaterial({ map: glow, color, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
      mesh.visible = false;
      scene.add(mesh);
      return { mesh, level: 0, last: null, stock: false };
    };
    this.halos = { select: halo(EMERALD), focus: halo(new THREE.Color('#fff1b8')), hintA: halo(GOLD), hintB: halo(GOLD) };

    // Sparkle bursts for matches.
    const dot = buildDot();
    const burstCount = 320;
    const burstGeo = new THREE.BufferGeometry();
    burstGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(burstCount * 3).fill(-50), 3));
    burstGeo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(burstCount * 3), 3));
    this.burstVel = new Float32Array(burstCount * 3);
    this.burstLife = new Float32Array(burstCount);
    this.burstBase = new Float32Array(burstCount * 3);
    this.burst = new THREE.Points(burstGeo, new THREE.PointsMaterial({ size: 0.2, map: dot, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    this.burst.frustumCulled = false;
    scene.add(this.burst);

    // Win confetti: tumbling miniature cards.
    const confettiCount = 170;
    this.confetti = new THREE.InstancedMesh(
      new THREE.PlaneGeometry(0.24, 0.33),
      new THREE.MeshStandardMaterial({ map: buildMiniCard(), side: THREE.DoubleSide, roughness: 0.55 }),
      confettiCount,
    );
    this.confetti.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.confetti.frustumCulled = false;
    this.confetti.visible = false;
    const tints = ['#ffffff', '#ffe7a3', '#a7f3d0', '#ffd1d6', '#fde68a'];
    for (let i = 0; i < confettiCount; i++) {
      this.confetti.setColorAt(i, new THREE.Color(tints[i % tints.length]));
      this.confettiState.push({ p: new THREE.Vector3(), v: new THREE.Vector3(), q: new THREE.Quaternion(), axis: new THREE.Vector3(1, 0, 0), spin: 0, phase: 0, landed: false });
    }
    scene.add(this.confetti);

    // Dust drifting in the spotlight.
    const dustCount = 90;
    const dustPos = new Float32Array(dustCount * 3);
    for (let i = 0; i < dustCount; i++) dustPos.set([(Math.random() - 0.5) * 10, 0.4 + Math.random() * 4.5, (Math.random() - 0.5) * 8], i * 3);
    const dustGeo = new THREE.BufferGeometry();
    dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
    this.dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({ size: 0.045, map: dot, color: 0xffe2a8, transparent: true, opacity: 0.45, depthWrite: false, blending: THREE.AdditiveBlending }));
    scene.add(this.dust);

    // Floating score popups.
    for (let i = 0; i < 4; i++) {
      const el = document.createElement('canvas');
      el.width = 256;
      el.height = 96;
      const tex = new THREE.CanvasTexture(el);
      tex.colorSpace = THREE.SRGBColorSpace;
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false }));
      sprite.scale.set(1.5, 0.56, 1);
      sprite.visible = false;
      sprite.renderOrder = 10;
      scene.add(sprite);
      this.popups.push({ sprite, ctx: el.getContext('2d')!, tex, age: 99, base: new THREE.Vector3() });
    }
  }

  private remapUV(geo: THREE.BufferGeometry, [u0, v0, u1, v1]: [number, number, number, number]): void {
    const pos = geo.getAttribute('position');
    const uv = geo.getAttribute('uv') as THREE.BufferAttribute;
    for (let i = 0; i < uv.count; i++) {
      uv.setXY(i, u0 + (pos.getX(i) / CW + 0.5) * (u1 - u0), v0 + (pos.getY(i) / CH + 0.5) * (v1 - v0));
    }
    uv.needsUpdate = true;
  }

  // ---------------------------------------------------------------- framing

  /** Screen space the HUD and toolbar leave free, in CSS pixels. */
  setInsets(top: number, bottom: number): void {
    this.insets = { top, bottom };
    this.fit();
  }

  private placeCamera(distance: number, yaw: number, elevation: number): void {
    const { camera } = this.stage;
    const t = this.target;
    camera.position.set(
      t.x + Math.sin(yaw) * Math.cos(elevation) * distance,
      t.y + Math.sin(elevation) * distance,
      t.z + Math.cos(yaw) * Math.cos(elevation) * distance,
    );
    camera.lookAt(t);
    camera.updateMatrixWorld();
  }

  /** Projected bounds of the layout in NDC: [minX, minY, maxX, maxY]. */
  private projectedBounds(): [number, number, number, number] {
    const { min, max } = this.layout;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (let i = 0; i < 8; i++) {
      this.tmp.set(i & 1 ? max.x : min.x, i & 2 ? max.y : min.y, i & 4 ? max.z : min.z).project(this.stage.camera);
      x0 = Math.min(x0, this.tmp.x); x1 = Math.max(x1, this.tmp.x);
      y0 = Math.min(y0, this.tmp.y); y1 = Math.max(y1, this.tmp.y);
    }
    return [x0, y0, x1, y1];
  }

  /** Picks the layout for the free area's shape, then the camera distance that fits it, then centres it with a view offset. */
  private fit(): void {
    const { camera, width, height } = this.stage;
    const side = width < 600 ? 10 : 24;
    const safeW = Math.max(120, width - side * 2);
    const safeH = Math.max(120, height - this.insets.top - this.insets.bottom);
    const wide = safeW / safeH > 1.2;
    if (wide !== this.layout.wide) {
      this.layout = makeLayout(wide);
      this.relayout();
    }
    // Tall screens look more top-down with a longer lens, so the upper rows are not squashed.
    camera.fov = wide ? 34 : 30;
    camera.clearViewOffset();
    this.elevation = wide ? 0.98 : 1.27;
    this.target.copy(this.layout.center);
    let lo = 2, hi = 160;
    for (let i = 0; i < 26; i++) {
      const mid = (lo + hi) / 2;
      this.placeCamera(mid, 0, this.elevation);
      const [x0, y0, x1, y1] = this.projectedBounds();
      if ((x1 - x0) / 2 * width <= safeW && (y1 - y0) / 2 * height <= safeH) hi = mid;
      else lo = mid;
    }
    this.distance = hi;
    this.placeCamera(hi, 0, this.elevation);
    const [x0, y0, x1, y1] = this.projectedBounds();
    const px = ((x0 + x1) / 2 + 1) / 2 * width;
    const py = (1 - (y0 + y1) / 2) / 2 * height;
    camera.setViewOffset(width, height, px - (side + safeW / 2), py - (this.insets.top + safeH / 2), width, height);

    const c = this.layout.center;
    this.table.position.set(c.x, 0, c.z);
    this.spot.position.set(c.x + 1.4, 14, c.z + 4.5);
    this.spot.target.position.copy(c);
    this.stockMark.position.set(this.layout.stock.x, 0.002, this.layout.stock.z);
    this.wasteMark.position.set(this.layout.waste.x, 0.002, this.layout.waste.z);
    this.discardMark.position.set(this.layout.discard.x, 0.002, this.layout.discard.z);
    this.layout.chips.forEach((p, i) => this.chips[i].position.set(p.x, 0.026, p.z));
    this.dust.position.set(c.x, 0, c.z);
    this.needsRender = true;
    this.moved = true;
  }

  // ---------------------------------------------------------------- state -> views

  private placesOf(state: State): Place[] {
    const out: Place[] = new Array(52);
    state.pyramid.forEach((card, slot) => { if (card !== null) out[card] = { zone: 'pyramid', index: slot }; });
    state.stock.forEach((card, i) => { out[card] = { zone: 'stock', index: i }; });
    state.waste.forEach((card, i) => { out[card] = { zone: 'waste', index: i }; });
    state.discard.forEach((card, i) => { out[card] = { zone: 'discard', index: i }; });
    return out;
  }

  /** Resting position, flip and yaw of a card in a state. */
  private home(card: number, place: Place, state: State, out: THREE.Vector3): { flip: number; yaw: number } {
    const L = this.layout;
    switch (place.zone) {
      case 'pyramid':
        out.copy(L.slots[place.index]);
        return { flip: 0, yaw: 0 };
      case 'stock':
        out.copy(L.stock);
        out.y += place.index * PILE_Y;
        return { flip: Math.PI, yaw: 0 };
      case 'waste': {
        const n = state.waste.length;
        const fan = Math.max(0, place.index - Math.max(0, n - 3));
        out.copy(L.waste);
        out.x += fan * FAN_X;
        out.y += place.index * PILE_Y;
        return { flip: 0, yaw: 0 };
      }
      case 'discard':
        out.copy(L.discard);
        out.x += jitter(card, 1) * 0.07;
        out.z += jitter(card, 2) * 0.07;
        out.y += place.index * DISCARD_Y;
        return { flip: 0, yaw: jitter(card, 3) * 0.2 };
    }
  }

  private tweenTo(view: CardView, to: THREE.Vector3, flip: number, yaw: number, start: number, dur: number, arc: number, append = false, ease = easeInOut): void {
    if (!append) view.queue = [];
    view.queue.push({
      from: (append ? view.endPos : view.pos).clone(), to: to.clone(),
      flipFrom: append ? view.endFlip : view.flip, flipTo: flip,
      yawFrom: append ? view.endYaw : view.yaw, yawTo: yaw,
      start, dur: Math.max(0.001, dur * this.motion), arc, ease,
    });
    view.endPos.copy(to);
    view.endFlip = flip;
    view.endYaw = yaw;
  }

  private snap(view: CardView, to: THREE.Vector3, flip: number, yaw: number): void {
    view.queue = [];
    view.pos.copy(to);
    view.endPos.copy(to);
    view.flip = view.endFlip = flip;
    view.yaw = view.endYaw = yaw;
  }

  /** Moves every card whose resting place changed; matched cards first meet in the air, then fly to the discard pile. */
  private transition(prev: State, next: State, mode: 'move' | 'undo' | 'layout'): void {
    const before = this.placesOf(prev);
    const after = this.placesOf(next);
    this.places = after;
    const now = this.time;
    const target = this.tmp2;
    const removed = mode === 'move' ? next.discard.slice(prev.discard.length) : [];
    const meet = new THREE.Vector3();
    if (removed.length) {
      let top = 0;
      for (const card of removed) { meet.add(this.views[card].pos); top = Math.max(top, this.views[card].pos.y); }
      meet.multiplyScalar(1 / removed.length);
      meet.y = top + 1.0;
      const at = meet.clone();
      const gained = next.score - prev.score;
      this.later(0.3 * this.motion, () => { this.sparkle(at, removed.length === 1 ? 46 : 36); this.popup(at, `+${gained}`); });
    }
    for (let card = 0; card < 52; card++) {
      const view = this.views[card];
      const { flip, yaw } = this.home(card, after[card], next, target);
      const unchanged = view.endPos.distanceToSquared(target) < 1e-8 && Math.abs(view.endFlip - flip) < 1e-4 && Math.abs(view.endYaw - yaw) < 1e-4;
      if (unchanged) continue;
      const from = before[card];
      const to = after[card];
      const k = removed.indexOf(card);
      if (k >= 0) {
        const side = removed.length === 2 ? (k === 0 ? -1 : 1) : 0;
        const kiss = meet.clone();
        kiss.x += side * 0.16;
        kiss.y += k * 0.03;
        const spinYaw = removed.length === 1 ? Math.PI * 2 : -side * 0.28;
        this.tweenTo(view, kiss, 0, spinYaw, now, 0.3, 0, false, easeOut);
        this.tweenTo(view, target, flip, yaw, now + (0.46 + k * 0.05) * this.motion, 0.5, 0.9, true);
        continue;
      }
      let dur = 0.34, arc = 0.25, delay = 0;
      if (from.zone === 'stock' && to.zone === 'waste') { dur = 0.42; arc = 0.68; }
      else if (from.zone === 'waste' && to.zone === 'stock') { dur = 0.36; arc = 0.62; delay = (prev.waste.length - 1 - from.index) * 0.018; }
      else if (from.zone === 'waste' && to.zone === 'waste') { dur = 0.22; arc = 0; }
      else if (from.zone === 'discard') { dur = 0.46; arc = 0.95; }
      else if (mode === 'layout') { dur = 0.5; arc = 0.1; }
      this.tweenTo(view, target, flip, yaw, now + delay * this.motion, dur, arc);
    }
  }

  private relayout(): void {
    const state = this.session.state;
    if (this.state === 'playing' && this.time < this.lockedUntil) {
      // Mid-deal: finish instantly in the new layout.
      this.lockedUntil = this.time;
      this.timers = [];
    }
    if (this.state === 'idle' || this.state === 'paused' || this.places.length === 0) {
      this.places = this.placesOf(state);
      for (let card = 0; card < 52; card++) {
        const { flip, yaw } = this.home(card, this.places[card], state, this.tmp2);
        this.snap(this.views[card], this.tmp2, flip, yaw);
      }
    } else {
      this.transition(state, state, 'layout');
    }
  }

  // ---------------------------------------------------------------- public actions

  /** A random deal number whose deal the solver proves winnable (or a known winnable deal if none is found). */
  pickDeal(): number {
    for (let i = 0; i < 60; i++) {
      const deal = 1 + Math.floor(Math.random() * 99999);
      if (solve(newGame(shuffleDeck(rng(deal))), 5000).result === 'win') return deal;
    }
    return WINNABLE_DEALS[Math.floor(Math.random() * WINNABLE_DEALS.length)];
  }

  /** Lays a deal out instantly behind the menu. */
  preview(deal: number): void {
    this.dealNo = deal;
    this.session = startSession(newGame(shuffleDeck(rng(deal))));
    this.state = 'idle';
    this.resetRound();
    this.places = [];
    this.relayout();
    this.emitHud();
  }

  /** Gathers the cards into a deck, then deals the pyramid in a cascade. */
  start(deal: number): void {
    this.dealNo = deal;
    this.session = startSession(newGame(shuffleDeck(rng(deal))));
    this.state = 'playing';
    this.resetRound();
    const state = this.session.state;
    this.places = this.placesOf(state);
    const L = this.layout;
    const now = this.time;
    const pile = new THREE.Vector3();
    const pileIndex = (card: number) => (this.places[card].zone === 'pyramid' ? 51 - this.places[card].index : this.places[card].index);
    for (let card = 0; card < 52; card++) {
      pile.copy(L.stock);
      pile.y += pileIndex(card) * PILE_Y;
      this.tweenTo(this.views[card], pile, Math.PI, 0, now + (jitter(card, 4) * 0.5 + 0.5) * 0.18 * this.motion, 0.45, 0.55);
    }
    const t0 = now + 0.78 * this.motion;
    const gap = 0.052 * this.motion;
    state.pyramid.forEach((card, slot) => {
      this.tweenTo(this.views[card!], L.slots[slot], 0, 0, t0 + slot * gap, 0.42, 0.75, true);
      if (slot % 2 === 0) this.later(t0 - now + slot * gap, () => this.onEvent('deal'));
    });
    this.lockedUntil = t0 + 27 * gap + 0.45 * this.motion;
    this.keys.clear();
    this.emitHud();
  }

  restart(): void { this.start(this.dealNo); }

  pause(): void { if (this.state === 'playing') this.state = 'paused'; }
  resume(): void { if (this.state === 'paused') { this.state = 'playing'; this.keys.clear(); } }

  private resetRound(): void {
    this.selected = null;
    this.focus = null;
    this.hovered = null;
    this.hintCards = [];
    this.hintStock = false;
    this.seconds = 0;
    this.clockAt = 0;
    this.lastSecond = -1;
    this.winStart = -1;
    this.timers = [];
    this.confettiOn = false;
    this.confetti.visible = false;
    this.lockedUntil = 0;
  }

  private get ready(): boolean { return this.state === 'playing' && this.time >= this.lockedUntil; }

  draw(): void {
    if (!this.ready) return;
    const state = this.session.state;
    if (canDraw(state)) this.act({ type: 'draw' });
    else if (canRedeal(state)) this.act({ type: 'redeal' });
    else { this.onEvent('invalid'); this.onToast(state.waste.length ? 'game.noRedeals' : 'game.nothingToDraw', undefined, true); }
  }

  undo(): void {
    if (!(this.ready || this.state === 'stuck')) return;
    const next = undoSession(this.session);
    if (!next) { this.onEvent('invalid'); this.onToast('game.nothingToUndo', undefined, true); return; }
    const prev = this.session.state;
    this.session = next;
    this.state = 'playing';
    this.selected = null;
    this.clearHint();
    this.transition(prev, next.state, 'undo');
    this.validateFocus();
    this.onEvent('undo');
    this.emitHud();
  }

  hint(): void {
    if (!this.ready) return;
    const state = this.session.state;
    const solution = solve(state, 3000);
    const action = solution.result === 'win' ? solution.line[0] : findHint(state);
    if (!action) return;
    this.clearHint();
    this.selected = null;
    this.hintUntil = this.time + 2.8;
    if (action.type === 'pair') this.hintCards = [cardAt(state, action.a)!, cardAt(state, action.b)!];
    else if (action.type === 'king') this.hintCards = [cardAt(state, action.slot)!];
    else {
      this.hintStock = true;
      // The solver may prefer drawing although a pair is free, when every free pair loses.
      this.onToast(action.type === 'redeal' ? 'game.hintRedeal' : removals(state).length ? 'game.hintDrawFirst' : 'game.hintDraw');
    }
    if (solution.result === 'lose') this.onToast('game.hintLost', undefined, true);
    this.onEvent('hint');
  }

  private clearHint(): void {
    this.hintCards = [];
    this.hintStock = false;
  }

  // ---------------------------------------------------------------- rules glue

  private act(action: Action): boolean {
    const next = play(this.session, action);
    if (!next) { this.onEvent('invalid'); return false; }
    const prev = this.session.state;
    this.session = next;
    this.selected = null;
    this.clearHint();
    this.transition(prev, next.state, 'move');
    const state = next.state;
    if (action.type === 'draw') this.onEvent('draw');
    else if (action.type === 'redeal') {
      this.onEvent('redeal');
      this.onToast('game.redealToast', { n: redealsLeft(state) });
    } else {
      const removed = state.discard.slice(prev.discard.length);
      this.onEvent(action.type === 'king' ? 'king' : 'match');
      this.onAnnounce('game.srRemoved', { cards: removed.map(cardLabel).join(' + ') });
      const rows = rowsEmpty(state.pyramid) - rowsEmpty(prev.pyramid);
      if (rows > 0 && !isWon(state)) { this.onToast('game.rowToast', { n: rows * ROW_BONUS }); this.later(0.35, () => this.onEvent('row')); }
      else if (state.streak >= 3) this.onToast('game.streakToast', { n: state.streak });
    }
    this.validateFocus();
    if (isWon(state)) this.win();
    else if (isStuck(state)) {
      this.state = 'stuck';
      const token = ++this.overToken;
      this.later(1.15, () => {
        if (this.state !== 'stuck' || token !== this.overToken) return;
        this.onEvent('stuck');
        this.onOver(this.result(false));
      });
    }
    // After the status change, so the toolbar does not offer Undo during the win celebration.
    this.emitHud();
    return true;
  }

  private choose(slot: number): void {
    const state = this.session.state;
    if (!isAvailable(state, slot)) {
      const card = cardAt(state, slot);
      if (card !== null) this.views[card].shake = 1;
      this.onEvent('invalid');
      this.onToast('game.covered', undefined, true);
      return;
    }
    const card = cardAt(state, slot)!;
    if (rankOf(card) === 13) { this.act({ type: 'king', slot }); return; }
    if (this.selected === null || cardAt(state, this.selected) === null) {
      this.selected = slot;
      this.onEvent('select');
      this.onAnnounce('game.srSelected', { card: cardLabel(card) });
      return;
    }
    if (this.selected === slot) { this.selected = null; return; }
    if (canPair(state, this.selected, slot)) { this.act({ type: 'pair', a: this.selected, b: slot }); return; }
    const first = cardAt(state, this.selected)!;
    this.views[first].shake = 1;
    this.views[card].shake = 1;
    this.onEvent('invalid');
    this.onToast('game.sumToast', { a: RANK_LABELS[rankOf(first)], b: RANK_LABELS[rankOf(card)], sum: rankOf(first) + rankOf(card) }, true);
    this.selected = slot;
    this.onAnnounce('game.srSelected', { card: cardLabel(card) });
  }

  private win(): void {
    this.state = 'won';
    this.selected = null;
    this.focus = null;
    this.clearHint();
    const result = this.result(true);
    this.later(0.75, () => { this.onEvent('win'); this.startConfetti(); this.winStart = this.time; });
    this.later(3.3, () => this.onOver(result));
  }

  private result(won: boolean): Result {
    const state = this.session.state;
    return { won, deal: this.dealNo, seconds: Math.floor(this.seconds), moves: state.moves, left: pyramidLeft(state), score: finalScore(state, this.seconds) };
  }

  private later(delay: number, fn: () => void): void { this.timers.push({ at: this.time + delay, fn }); }

  private emitHud(): void {
    const state = this.session.state;
    this.onHud({
      score: state.score, moves: state.moves, seconds: Math.floor(this.seconds), deal: this.dealNo,
      redeals: redealsLeft(state), stock: state.stock.length, left: pyramidLeft(state),
      canUndo: this.session.history.length > 0 && (this.state === 'playing' || this.state === 'stuck'),
      canDraw: this.state === 'playing' && (canDraw(state) || canRedeal(state)),
      canHint: this.state === 'playing',
    });
  }

  // ---------------------------------------------------------------- input

  private pick(x: number, y: number): { card: number; place: Place } | { stock: true } | null {
    const { width, height, camera } = this.stage;
    this.ndc.set((x / width) * 2 - 1, -(y / height) * 2 + 1);
    this.raycaster.setFromCamera(this.ndc, camera);
    for (const hit of this.raycaster.intersectObjects(this.pickables, false)) {
      if (hit.object.userData.stock) return { stock: true };
      const card = hit.object.userData.card as number;
      const place = this.places[card];
      if (!place || place.zone === 'discard') continue;
      return { card, place };
    }
    return null;
  }

  private tap(x: number, y: number): void {
    this.keyboardMode = false;
    if (!this.ready) return;
    const hit = this.pick(x, y);
    if (!hit) { this.selected = null; return; }
    if ('stock' in hit || hit.place.zone === 'stock') { this.draw(); return; }
    if (hit.place.zone === 'pyramid') this.choose(hit.place.index);
    else if (hit.place.zone === 'waste' && hit.place.index === this.session.state.waste.length - 1) this.choose(WASTE);
  }

  private updateHover(): void {
    if (!this.pointer.dirty) return;
    this.pointer.dirty = false;
    this.hovered = null;
    this.hoverStock = false;
    if (this.pointer.inside && this.ready) {
      const hit = this.pick(this.pointer.x, this.pointer.y);
      const state = this.session.state;
      if (hit && ('stock' in hit || hit.place.zone === 'stock')) this.hoverStock = canDraw(state) || canRedeal(state);
      else if (hit && 'place' in hit) {
        const { zone, index } = hit.place;
        if ((zone === 'pyramid' && isAvailable(state, index)) || (zone === 'waste' && index === state.waste.length - 1)) this.hovered = hit.card;
      }
    }
    this.host.style.cursor = this.hovered !== null || this.hoverStock ? 'pointer' : '';
  }

  private focusables(): Array<{ id: number; x: number; z: number }> {
    const state = this.session.state;
    const items = availableSlots(state).map(slot => {
      const p = slot === WASTE ? this.views[cardAt(state, WASTE)!].endPos : this.layout.slots[slot];
      return { id: slot, x: p.x, z: p.z };
    });
    items.push({ id: STOCK, x: this.layout.stock.x, z: this.layout.stock.z });
    return items;
  }

  private moveFocus(dx: number, dz: number): void {
    this.keyboardMode = true;
    const items = this.focusables();
    const current = items.find(item => item.id === this.focus);
    let next: { id: number } | undefined;
    if (!current) {
      next = items.filter(i => i.id !== STOCK).sort((a, b) => b.z - a.z || Math.abs(a.x) - Math.abs(b.x))[0] ?? items[0];
    } else {
      let bestScore = Infinity;
      for (const item of items) {
        if (item.id === current.id) continue;
        const ox = item.x - current.x, oz = item.z - current.z;
        const along = ox * dx + oz * dz;
        if (along < 0.15) continue;
        const score = along + 2.4 * Math.abs(ox * dz - oz * dx);
        if (score < bestScore) { bestScore = score; next = item; }
      }
    }
    if (!next) return;
    this.focus = next.id;
    this.announceFocus();
  }

  private announceFocus(): void {
    if (this.focus === null) return;
    if (this.focus === STOCK) { this.onAnnounce('game.srStock', { n: this.session.state.stock.length }); return; }
    const card = cardAt(this.session.state, this.focus);
    if (card !== null) this.onAnnounce('game.srFocus', { card: cardLabel(card) });
  }

  private validateFocus(): void {
    if (this.focus === null || this.focus === STOCK || isAvailable(this.session.state, this.focus)) return;
    const old = this.focus === WASTE ? this.layout.waste : this.layout.slots[this.focus];
    const items = this.focusables();
    items.sort((a, b) => Math.hypot(a.x - old.x, a.z - old.z) - Math.hypot(b.x - old.x, b.z - old.z));
    this.focus = items[0]?.id ?? null;
  }

  private activateFocus(): void {
    if (this.focus === null) { this.moveFocus(0, 1); return; }
    this.keyboardMode = true;
    if (this.focus === STOCK) this.draw();
    else this.choose(this.focus);
  }

  private handleKeys(): void {
    const k = this.keys;
    if (this.state === 'stuck') { if (k.consume('KeyZ', 'Backspace')) this.undo(); return; }
    if (!this.ready) { k.clear(); return; }
    if (k.consume('ArrowLeft')) this.moveFocus(-1, 0);
    if (k.consume('ArrowRight')) this.moveFocus(1, 0);
    if (k.consume('ArrowUp')) this.moveFocus(0, -1);
    if (k.consume('ArrowDown')) this.moveFocus(0, 1);
    if (k.consume('Enter', 'NumpadEnter', 'Space')) this.activateFocus();
    if (k.consume('KeyD')) this.draw();
    if (k.consume('KeyH')) this.hint();
    if (k.consume('KeyZ', 'Backspace')) this.undo();
  }

  // ---------------------------------------------------------------- effects

  private sparkle(at: THREE.Vector3, count: number): void {
    const pos = this.burst.geometry.getAttribute('position') as THREE.BufferAttribute;
    const palette = [[1, 0.84, 0.4], [0.3, 0.95, 0.68], [1, 0.97, 0.85]];
    for (let n = 0; n < count; n++) {
      const i = this.burstCursor;
      this.burstCursor = (this.burstCursor + 1) % this.burstLife.length;
      pos.setXYZ(i, at.x, at.y, at.z);
      const a = Math.random() * Math.PI * 2;
      const up = Math.random() * 0.9 + 0.1;
      const s = 1.6 + Math.random() * 3.2;
      this.burstVel[i * 3] = Math.cos(a) * s * (1 - up * 0.5);
      this.burstVel[i * 3 + 1] = up * s * 0.9;
      this.burstVel[i * 3 + 2] = Math.sin(a) * s * (1 - up * 0.5);
      this.burstLife[i] = 0.7 + Math.random() * 0.5;
      this.burstBase.set(palette[n % 3], i * 3);
    }
    pos.needsUpdate = true;
  }

  private updateBurst(dt: number): void {
    const pos = this.burst.geometry.getAttribute('position') as THREE.BufferAttribute;
    const col = this.burst.geometry.getAttribute('color') as THREE.BufferAttribute;
    const v = this.burstVel;
    let any = false;
    for (let i = 0; i < this.burstLife.length; i++) {
      if (this.burstLife[i] <= 0) continue;
      any = true;
      this.burstLife[i] -= dt;
      const life = Math.max(0, this.burstLife[i]);
      v[i * 3 + 1] -= 5 * dt;
      v[i * 3] *= 0.97; v[i * 3 + 1] *= 0.97; v[i * 3 + 2] *= 0.97;
      pos.setXYZ(i, pos.getX(i) + v[i * 3] * dt, pos.getY(i) + v[i * 3 + 1] * dt, pos.getZ(i) + v[i * 3 + 2] * dt);
      const fade = Math.min(1, life * 1.6);
      col.setXYZ(i, this.burstBase[i * 3] * fade, this.burstBase[i * 3 + 1] * fade, this.burstBase[i * 3 + 2] * fade);
    }
    if (any) { pos.needsUpdate = true; col.needsUpdate = true; this.effects = true; }
  }

  private popup(at: THREE.Vector3, text: string): void {
    const popup = this.popups.find(p => p.age > 1.2) ?? this.popups[0];
    const { ctx } = popup;
    ctx.clearRect(0, 0, 256, 96);
    ctx.font = "800 64px Georgia, 'Times New Roman', serif";
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 8;
    ctx.strokeStyle = 'rgba(4, 30, 22, 0.85)';
    ctx.strokeText(text, 128, 50);
    const g = ctx.createLinearGradient(0, 20, 0, 80);
    g.addColorStop(0, '#fff3c4');
    g.addColorStop(1, '#e2b04a');
    ctx.fillStyle = g;
    ctx.fillText(text, 128, 50);
    popup.tex.needsUpdate = true;
    popup.age = 0;
    popup.base.copy(at);
    popup.sprite.visible = true;
  }

  private updatePopups(dt: number): void {
    for (const p of this.popups) {
      if (!p.sprite.visible) continue;
      this.effects = true;
      p.age += dt;
      const k = p.age / 1.1;
      if (k >= 1) { p.sprite.visible = false; continue; }
      p.sprite.position.set(p.base.x, p.base.y + 0.3 + easeOut(k) * 0.9, p.base.z);
      (p.sprite.material as THREE.SpriteMaterial).opacity = k < 0.7 ? 1 : 1 - (k - 0.7) / 0.3;
    }
  }

  private startConfetti(): void {
    const { min, max } = this.layout;
    const euler = new THREE.Euler();
    for (const c of this.confettiState) {
      c.p.set(lerp(min.x - 1, max.x + 1, Math.random()), 5 + Math.random() * 7, lerp(min.z - 1, max.z + 1, Math.random()));
      c.v.set((Math.random() - 0.5) * 0.8, -1.2 - Math.random() * 1.4, (Math.random() - 0.5) * 0.8);
      c.q.setFromEuler(euler.set(Math.random() * 6, Math.random() * 6, Math.random() * 6));
      c.axis.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize();
      c.spin = 3 + Math.random() * 6;
      c.phase = Math.random() * 6;
      c.landed = false;
    }
    this.confettiOn = true;
    this.confetti.visible = true;
  }

  private updateConfetti(dt: number, t: number): void {
    if (!this.confettiOn) return;
    let falling = false;
    for (let i = 0; i < this.confettiState.length; i++) {
      const c = this.confettiState[i];
      if (!c.landed) {
        falling = true;
        c.v.y = Math.max(c.v.y - 2.2 * dt, -2.6);
        c.p.x += (c.v.x + Math.sin(t * 2.2 + c.phase) * 0.7) * dt;
        c.p.y += c.v.y * dt;
        c.p.z += (c.v.z + Math.cos(t * 1.7 + c.phase) * 0.5) * dt;
        this.stepQuat.setFromAxisAngle(c.axis, c.spin * dt);
        c.q.multiply(this.stepQuat);
        if (c.p.y < 0.03) {
          c.landed = true;
          c.p.y = 0.02 + (i % 7) * 0.002;
          this.dummy.rotation.set(-Math.PI / 2, 0, c.phase);
          c.q.setFromEuler(this.dummy.rotation);
        }
      }
      this.dummy.position.copy(c.p);
      this.dummy.quaternion.copy(c.q);
      this.dummy.updateMatrix();
      this.confetti.setMatrixAt(i, this.dummy.matrix);
    }
    this.confetti.instanceMatrix.needsUpdate = true;
    if (falling) this.effects = true;
    else this.confettiOn = false;
  }

  private updateDust(dt: number, t: number): void {
    if (dt === 0) return;
    const pos = this.dust.geometry.getAttribute('position') as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      let y = pos.getY(i) + dt * 0.06;
      if (y > 5) y = 0.4;
      pos.setXYZ(i, pos.getX(i) + Math.sin(t * 0.3 + i) * dt * 0.05, y, pos.getZ(i) + Math.cos(t * 0.25 + i * 1.7) * dt * 0.05);
    }
    pos.needsUpdate = true;
  }

  // ---------------------------------------------------------------- frame

  private advance(view: CardView): void {
    while (view.queue.length) {
      const tw = view.queue[0];
      if (this.time < tw.start) break;
      const p = clamp((this.time - tw.start) / tw.dur, 0, 1);
      const e = tw.ease(p);
      view.pos.lerpVectors(tw.from, tw.to, e);
      view.pos.y += tw.arc * Math.sin(Math.PI * p);
      view.flip = lerp(tw.flipFrom, tw.flipTo, e);
      view.yaw = lerp(tw.yawFrom, tw.yawTo, e);
      if (p < 1) break;
      view.queue.shift();
    }
  }

  private selectedCard(): number | null {
    return this.selected === null ? null : cardAt(this.session.state, this.selected);
  }

  private updateCards(dt: number, t: number): void {
    const state = this.session.state;
    const selectedCard = this.selectedCard();
    const focusCard = this.keyboardMode && this.focus !== null && this.focus !== STOCK ? cardAt(state, this.focus) : null;
    const hinting = this.time < this.hintUntil;
    const playing = this.state === 'playing' || this.state === 'stuck';
    for (const view of this.views) {
      this.advance(view);
      const card = view.card;
      const place = this.places[card];
      const free = !place || place.zone !== 'pyramid' || isAvailable(state, place.index);
      view.select = lerp(view.select, card === selectedCard ? 1 : 0, damp(12, dt));
      view.hover = lerp(view.hover, card === this.hovered ? 1 : 0, damp(16, dt));
      view.hint = lerp(view.hint, hinting && this.hintCards.includes(card) ? 1 : 0, damp(10, dt));
      view.focus = lerp(view.focus, card === focusCard ? 1 : 0, damp(14, dt));
      view.avail = lerp(view.avail, free || !playing ? 1 : 0, damp(5, dt));
      view.shake = Math.max(0, view.shake - dt * 2.6);
      const pulse = 0.6 + 0.4 * Math.sin(t * 6.5);
      const lift = view.hover * 0.14 + view.select * (0.42 + Math.sin(t * 3 + card) * 0.035) + view.hint * (0.16 + 0.1 * pulse) + view.focus * 0.1;
      view.tilt = view.hover * 0.1 + view.select * 0.12 + view.focus * 0.06 + view.hint * 0.08;
      view.root.position.set(view.pos.x + Math.sin(t * 48) * 0.06 * view.shake, view.pos.y + lift, view.pos.z);
      view.root.rotation.set(-Math.PI / 2 + view.tilt, view.flip, view.yaw + view.select * Math.sin(t * 2.1 + card) * 0.03);
      const shade = 0.66 + 0.34 * view.avail + view.hover * 0.05;
      view.faceMat.color.setScalar(shade);
      view.faceMat.emissiveIntensity = view.select * 0.08;
      const r = view.root;
      const sig = r.position.x + r.position.y * 3.1 + r.position.z * 7.3 + r.rotation.x * 11.7 + r.rotation.y * 13.1 + r.rotation.z * 17.9 + shade * 19.3;
      if (Math.abs(sig - view.sig) > 1e-5) { view.sig = sig; this.moved = true; }
    }
  }

  private updateHalo(halo: Halo, view: CardView | null, stock: boolean, strength: number, dt: number): void {
    const level = lerp(halo.level, view || stock ? strength : 0, damp(12, dt));
    if (Math.abs(level - halo.level) > 1e-3) this.effects = true;
    halo.level = level;
    if (view || stock) { halo.last = view; halo.stock = stock && !view; }
    const mesh = halo.mesh;
    mesh.visible = halo.level > 0.01;
    if (!mesh.visible) { halo.last = null; return; }
    mesh.material.opacity = halo.level;
    view = halo.last;
    stock = halo.stock;
    if (view) {
      mesh.position.copy(view.root.position);
      mesh.position.y -= CT / 2 + 0.006;
      mesh.rotation.set(-Math.PI / 2 + view.tilt, 0, view.root.rotation.z);
    } else if (stock) {
      const top = this.session.state.stock.length;
      mesh.position.set(this.layout.stock.x, Math.max(0.004, BASE_Y + (top - 1) * PILE_Y - CT), this.layout.stock.z);
      mesh.rotation.set(-Math.PI / 2, 0, 0);
    }
  }

  private updateHalos(dt: number, t: number): void {
    const state = this.session.state;
    const selectedCard = this.selectedCard();
    const hinting = this.time < this.hintUntil;
    const pulse = 0.75 + 0.25 * Math.sin(t * 6.5);
    const focusOnStock = this.keyboardMode && this.focus === STOCK && this.ready;
    const focusCard = this.keyboardMode && this.focus !== null && this.focus !== STOCK && this.ready ? cardAt(state, this.focus) : null;
    this.updateHalo(this.halos.select, selectedCard !== null ? this.views[selectedCard] : null, false, 1, dt);
    this.updateHalo(this.halos.focus, focusCard !== null && focusCard !== selectedCard ? this.views[focusCard] : null, focusOnStock, 0.8, dt);
    const [a, b] = hinting ? this.hintCards : [];
    this.updateHalo(this.halos.hintA, a !== undefined ? this.views[a] : null, hinting && this.hintStock, pulse, dt);
    this.updateHalo(this.halos.hintB, b !== undefined ? this.views[b] : null, false, pulse, dt);
  }

  private updateTable(dt: number): void {
    const state = this.session.state;
    const texture = state.stock.length ? this.markTextures.none : canRedeal(state) ? this.markTextures.redeal : this.markTextures.empty;
    if (this.stockMark.material.map !== texture) { this.stockMark.material.map = texture; this.stockMark.material.needsUpdate = true; this.needsRender = true; }
    const left = redealsLeft(state);
    this.chips.forEach((chip, i) => {
      const s = dt > 0 ? lerp(chip.scale.x, i < left ? 1 : 0.001, damp(8, dt)) : chip.scale.x;
      if (Math.abs(s - chip.scale.x) > 1e-4) this.moved = true;
      chip.scale.setScalar(s);
      chip.visible = s > 0.01;
    });
  }

  private updateCamera(t: number): void {
    let distance = this.distance;
    let yaw = this.state === 'idle' && this.motion === 1 ? Math.sin(t * 0.3) * 0.05 : 0;
    let elevation = this.elevation;
    if (this.winStart >= 0) {
      const e = easeInOut(clamp((this.time - this.winStart) / 2.6, 0, 1));
      distance *= 1 - 0.13 * e;
      yaw += 0.26 * e * this.motion;
      elevation += 0.07 * e;
      if (e < 1) this.effects = true;
    }
    if (this.state === 'idle' && this.motion === 1) this.effects = true;
    this.placeCamera(distance, yaw, elevation);
  }

  private frame(dt: number, t: number): void {
    const paused = this.state === 'paused';
    const step = paused ? 0 : dt;
    this.time += step;
    if (!paused && this.timers.length) {
      const due = this.timers.filter(timer => timer.at <= this.time);
      if (due.length) {
        this.timers = this.timers.filter(timer => timer.at > this.time);
        due.forEach(timer => timer.fn());
      }
    }
    if (this.ready) {
      // Real elapsed time, not the clamped dt, so the clock and the time bonus stay true below 20 fps.
      const now = performance.now();
      this.seconds += this.clockAt ? Math.min(now - this.clockAt, 1000) / 1000 : dt;
      this.clockAt = now;
      if (Math.floor(this.seconds) !== this.lastSecond) { this.lastSecond = Math.floor(this.seconds); this.emitHud(); }
    } else {
      this.clockAt = 0;
    }
    if (this.state === 'playing' || this.state === 'stuck') this.handleKeys();
    else this.keys.clear();
    this.updateHover();
    this.updateCards(step, t);
    this.updateHalos(step, t);
    this.updateTable(step);
    this.updateBurst(step);
    this.updatePopups(step);
    this.updateConfetti(step, t);
    this.updateDust(step, t);
    this.updateCamera(t);
    // Idle tables still redraw at a quarter rate so the dust keeps drifting.
    this.frameCount++;
    if (this.moved) this.stage.renderer.shadowMap.needsUpdate = true;
    if (this.moved || this.effects || this.needsRender || this.frameCount % 4 === 0) {
      this.stage.render();
      this.needsRender = false;
    }
    this.moved = false;
    this.effects = false;
  }
}
