/** The duellist: a rim-lit knight built from capsules, posed every frame from the duel state. */
import { THREE, damp, clamp } from '../../../shared/three/kit';
import { COMBO, DODGE, FINISHER, FOCUS_MAX, PARRY, type Hero } from './logic';
import { rimMaterial, rimOf, GOLD, EMBER } from './art';

interface Pose {
  lift: number; lean: number; roll: number; reach: number; head: number;
  armR: number; elbowR: number; wrist: number; armL: number; elbowL: number;
  hipR: number; kneeR: number; hipL: number; kneeL: number;
}
const KEYS = ['lift', 'lean', 'roll', 'reach', 'head', 'armR', 'elbowR', 'wrist', 'armL', 'elbowL', 'hipR', 'kneeR', 'hipL', 'kneeL'] as const;
const pose = (p: Partial<Pose>): Pose => ({ lift: 0, lean: 0.12, roll: 0, reach: 0, head: 0, armR: 0.5, elbowR: 1.3, wrist: 0.6, armL: -0.3, elbowL: 0.9, hipR: 0.35, kneeR: -0.3, hipL: -0.3, kneeL: -0.25, ...p });

const GUARD = pose({});
const PARRY_POSE = pose({ lift: -0.07, lean: 0.04, armR: 1.15, elbowR: 1.65, wrist: 0.2, armL: 0.7, elbowL: 1.5, hipR: 0.55, kneeR: -0.5, hipL: -0.5, kneeL: -0.35 });
const SWINGS: [Pose, Pose, Pose][] = [
  [pose({ armR: 2.7, elbowR: 0.35, wrist: 0.35, lean: -0.05 }), pose({ armR: 0.15, elbowR: 0.15, wrist: 0.95, lean: 0.38, hipR: 0.6, kneeR: -0.55, reach: 0.12 }), pose({ armR: -0.35, elbowR: 0.3, wrist: 0.8, lean: 0.3, hipR: 0.55, kneeR: -0.45 })],
  [pose({ armR: -0.7, elbowR: 0.3, wrist: -0.5, lean: 0.3, lift: -0.08, kneeR: -0.6, kneeL: -0.5 }), pose({ armR: 2.5, elbowR: 0.2, wrist: 0.15, lean: -0.08, lift: 0.04, reach: 0.12 }), pose({ armR: 2.9, elbowR: 0.4, wrist: 0.2, lean: -0.12 })],
  [pose({ armR: 3.05, elbowR: 0.55, wrist: 0.6, armL: 2.7, elbowL: 0.5, lean: -0.18, lift: 0.03 }), pose({ armR: 0.95, elbowR: 0.05, wrist: 0.65, armL: 0.95, elbowL: 0.2, lean: 0.48, hipR: 0.95, kneeR: -0.65, hipL: -0.65, reach: 0.38 }), pose({ armR: 0.55, elbowR: 0.1, wrist: 0.9, armL: 0.6, lean: 0.4, hipR: 0.9, kneeR: -0.6, hipL: -0.6, reach: 0.3 })],
];
const FINISH: [Pose, Pose, Pose] = [
  pose({ lift: -0.24, lean: 0.45, armR: -0.95, elbowR: 0.4, wrist: -0.8, armL: -0.6, elbowL: 0.6, hipR: 0.8, kneeR: -1.1, hipL: -0.5, kneeL: -0.9 }),
  pose({ lift: 0.22, lean: -0.22, armR: 3.05, elbowR: 0.15, wrist: 0.3, armL: 0.4, reach: 0.55, hipR: 0.2, kneeR: -0.1, hipL: -0.35 }),
  pose({ lift: 0.05, lean: 0.1, armR: 2.2, elbowR: 0.3, wrist: 0.5, reach: 0.4 }),
];
const TUCK = pose({ lift: -0.42, lean: 0.65, armR: 1.4, elbowR: 1.9, wrist: 1.2, armL: 1.4, elbowL: 1.9, hipR: 1.7, kneeR: -2.3, hipL: 1.5, kneeL: -2.3, head: 0.4 });
const HURT = pose({ lean: -0.45, lift: -0.05, armR: 0.15, elbowR: 0.6, wrist: 0.2, armL: -0.7, elbowL: 0.4, head: -0.35, hipR: 0.1, hipL: -0.5 });
const FALL = pose({ lean: -0.3, armR: 2.6, elbowR: 0.4, armL: 2.9, elbowL: 0.3, hipR: 0.7, kneeR: -0.9, hipL: -0.2, kneeL: -0.4, head: -0.3 });
const DOWN = pose({ roll: 1.45, lift: -0.62, lean: 0, armR: 2.2, elbowR: 0.4, wrist: 0, armL: 2.6, elbowL: 0.2, hipR: 0.2, kneeR: -0.15, hipL: 0.05, kneeL: -0.3, head: 0.2 });
const WIN = pose({ armR: 3.0, elbowR: 0.12, wrist: 0.05, armL: -0.25, elbowL: 0.5, lean: -0.06, hipR: 0.25, hipL: -0.2 });

const ease = (k: number) => k * k * (3 - 2 * k);
function mix(out: Pose, a: Pose, b: Pose, k: number): Pose {
  for (const key of KEYS) out[key] = a[key] + (b[key] - a[key]) * k;
  return out;
}

export class HeroView {
  readonly root = new THREE.Group();
  private readonly pivot = new THREE.Group();
  private readonly body = new THREE.Group();
  private readonly torso = new THREE.Group();
  private readonly head = new THREE.Group();
  private readonly shoulderR = new THREE.Group();
  private readonly elbowR = new THREE.Group();
  private readonly hand = new THREE.Group();
  private readonly shoulderL = new THREE.Group();
  private readonly elbowL = new THREE.Group();
  private readonly hipR = new THREE.Group();
  private readonly kneeR = new THREE.Group();
  private readonly hipL = new THREE.Group();
  private readonly kneeL = new THREE.Group();
  private readonly cape: THREE.Mesh;
  private readonly blade: THREE.Mesh<THREE.BoxGeometry, THREE.MeshStandardMaterial>;
  private readonly tipGlow: THREE.Sprite;
  private readonly guardGlint: THREE.Sprite;
  private readonly shadow: THREE.Mesh;
  private readonly materials: THREE.MeshStandardMaterial[] = [];
  private readonly current = pose({});
  private readonly target = pose({});
  private walkPhase = 0;
  private flashT = 0;
  private flashColor = new THREE.Color();
  private visualX = 0;
  private fallY = 0;
  // Sword trail: a ribbon of recent blade positions.
  private readonly trail: THREE.Mesh;
  private readonly trailPos: Float32Array;
  private readonly trailAlpha: Float32Array;
  private readonly trailBase: THREE.Vector3[] = [];
  private readonly trailTip: THREE.Vector3[] = [];
  private readonly trailAge: number[] = [];
  private readonly trailMaterial: THREE.ShaderMaterial;
  private readonly tmpA = new THREE.Vector3();
  private readonly tmpB = new THREE.Vector3();

  constructor(glow: THREE.Texture) {
    const armor = rimMaterial({ color: 0x66708a, metalness: 0.65, roughness: 0.42 }, 0xffc08a, 1.0);
    const cloth = rimMaterial({ color: 0x8c1f2e, roughness: 0.85 }, 0xff9a6a, 0.8);
    const skin = rimMaterial({ color: 0xd6a07c, roughness: 0.7 }, 0xffb080, 0.6);
    const dark = rimMaterial({ color: 0x2a2630, roughness: 0.8, metalness: 0.2 }, 0xffa070, 0.7);
    const gold = rimMaterial({ color: 0xd8a640, metalness: 0.8, roughness: 0.35, emissive: 0x3a2400 }, 0xffd090, 0.8);
    const steel = rimMaterial({ color: 0xdfe6f2, metalness: 0.9, roughness: 0.18, emissive: 0x000000 }, 0xffffff, 0.6);
    this.materials.push(armor, cloth, skin, dark, gold, steel);
    const cap = (r: number, len: number, m: THREE.Material) => new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 4, 10), m);

    this.root.add(this.pivot);
    this.pivot.add(this.body);
    this.body.position.y = 0.95;

    // Hips and torso.
    const pelvis = cap(0.2, 0.12, dark);
    pelvis.rotation.x = Math.PI / 2;
    pelvis.scale.set(1, 1, 0.9);
    this.body.add(pelvis, this.torso);
    const chest = cap(0.25, 0.3, armor);
    chest.position.y = 0.33;
    chest.scale.set(0.95, 1, 1.05);
    const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.08, 12), gold);
    belt.position.y = 0.08;
    const tabard = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.42, 0.34), cloth);
    tabard.position.set(0.14, -0.06, 0);
    const pauldronR = new THREE.Mesh(new THREE.SphereGeometry(0.15, 10, 8), armor);
    pauldronR.position.set(0, 0.52, 0.24);
    pauldronR.scale.set(1.1, 0.8, 1);
    const pauldronL = pauldronR.clone();
    pauldronL.position.z = -0.24;
    this.torso.add(chest, belt, tabard, pauldronR, pauldronL);

    // Cape hangs from the shoulders behind the knight.
    const capeGeometry = new THREE.PlaneGeometry(0.5, 1.0, 1, 5);
    capeGeometry.translate(0, -0.5, 0);
    capeGeometry.rotateY(Math.PI / 2);
    this.cape = new THREE.Mesh(capeGeometry, rimMaterial({ color: 0x6e1824, roughness: 0.9, side: THREE.DoubleSide }, 0xff9a6a, 0.9));
    this.cape.position.set(-0.2, 0.58, 0);
    this.torso.add(this.cape);

    // Head: helmet with a crest and a glowing visor slit.
    this.head.position.y = 0.74;
    const helm = new THREE.Mesh(new THREE.SphereGeometry(0.19, 14, 12), armor);
    helm.scale.set(1.05, 1.1, 0.95);
    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.035, 0.22), new THREE.MeshBasicMaterial({ color: 0xbff4ff }));
    visor.position.set(0.17, 0.02, 0);
    const crest = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.42, 6), cloth);
    crest.rotation.z = Math.PI / 2 + 0.5;
    crest.position.set(-0.14, 0.16, 0);
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.14, 8), skin);
    neck.position.y = -0.17;
    this.head.add(helm, visor, crest, neck);
    this.torso.add(this.head);

    // Arms: shoulder pivot, upper arm, elbow pivot, forearm, hand (sword on the near side).
    const arm = (shoulder: THREE.Group, elbow: THREE.Group, z: number) => {
      shoulder.position.set(0, 0.5, z);
      const upper = cap(0.075, 0.18, armor);
      upper.position.y = -0.15;
      elbow.position.y = -0.3;
      const fore = cap(0.07, 0.16, dark);
      fore.position.y = -0.14;
      const glove = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), cloth);
      glove.position.y = -0.29;
      elbow.add(fore, glove);
      shoulder.add(upper, elbow);
      this.torso.add(shoulder);
    };
    arm(this.shoulderR, this.elbowR, 0.27);
    arm(this.shoulderL, this.elbowL, -0.27);
    this.hand.position.y = -0.29;
    this.elbowR.add(this.hand);

    // Sword along the hand's -y.
    const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.2, 6), dark);
    grip.position.y = 0;
    const guard = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.05, 0.3), gold);
    guard.position.y = -0.12;
    this.blade = new THREE.Mesh(new THREE.BoxGeometry(0.075, 1.0, 0.022), steel);
    this.blade.position.y = -0.64;
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.038, 0.14, 4), steel);
    tip.rotation.x = Math.PI;
    tip.scale.set(1, 1, 0.3);
    tip.position.y = -1.2;
    const pommel = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 6), gold);
    pommel.position.y = 0.12;
    this.tipGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, color: GOLD, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0 }));
    this.tipGlow.position.y = -0.7;
    this.tipGlow.scale.set(0.9, 1.6, 1);
    this.hand.add(grip, guard, this.blade, tip, pommel, this.tipGlow);
    this.hand.rotation.x = 0;

    // Legs.
    const leg = (hip: THREE.Group, knee: THREE.Group, z: number) => {
      hip.position.set(0, -0.02, z);
      const thigh = cap(0.095, 0.26, cloth);
      thigh.position.y = -0.22;
      knee.position.y = -0.45;
      const shin = cap(0.085, 0.26, armor);
      shin.position.y = -0.22;
      const boot = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.09, 0.12), dark);
      boot.position.set(0.05, -0.46, 0);
      knee.add(shin, boot);
      hip.add(thigh, knee);
      this.body.add(hip);
    };
    leg(this.hipR, this.kneeR, 0.12);
    leg(this.hipL, this.kneeL, -0.12);

    this.guardGlint = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, color: GOLD, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0 }));
    this.guardGlint.scale.set(1.2, 1.8, 1);
    this.root.add(this.guardGlint);

    this.shadow = new THREE.Mesh(new THREE.CircleGeometry(0.55, 20).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: glow, color: 0x000000, transparent: true, opacity: 0.55, depthWrite: false }));
    this.shadow.position.y = 0.02;
    this.shadow.scale.set(1.3, 1, 0.8);

    // Trail ribbon (12 samples, base and tip).
    const samples = 12;
    this.trailPos = new Float32Array(samples * 2 * 3);
    this.trailAlpha = new Float32Array(samples * 2);
    const index: number[] = [];
    for (let i = 0; i < samples - 1; i++) { const a = i * 2; index.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    const trailGeometry = new THREE.BufferGeometry();
    trailGeometry.setAttribute('position', new THREE.BufferAttribute(this.trailPos, 3).setUsage(THREE.DynamicDrawUsage));
    trailGeometry.setAttribute('aAlpha', new THREE.BufferAttribute(this.trailAlpha, 1).setUsage(THREE.DynamicDrawUsage));
    trailGeometry.setIndex(index);
    this.trailMaterial = new THREE.ShaderMaterial({
      uniforms: { uColor: { value: new THREE.Color(0xfff2d0) } },
      vertexShader: /* glsl */`attribute float aAlpha; varying float vA; void main() { vA = aAlpha; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: /* glsl */`uniform vec3 uColor; varying float vA; void main() { gl_FragColor = vec4(uColor * vA, vA); }`,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    });
    this.trail = new THREE.Mesh(trailGeometry, this.trailMaterial);
    this.trail.frustumCulled = false;
    for (let i = 0; i < samples; i++) { this.trailBase.push(new THREE.Vector3()); this.trailTip.push(new THREE.Vector3()); this.trailAge.push(1); }
  }

  /** Objects that live in world space (shadow, trail). */
  get extras(): THREE.Object3D[] { return [this.shadow, this.trail]; }

  flash(color: THREE.ColorRepresentation, seconds = 0.16): void {
    this.flashColor.set(color);
    this.flashT = seconds;
  }

  snap(x: number): void { this.visualX = x; this.fallY = 0; }

  /** World position of the blade's middle, for spark effects. */
  bladePoint(out: THREE.Vector3): THREE.Vector3 {
    return this.blade.getWorldPosition(out);
  }

  update(dt: number, t: number, hero: Hero, outro: 'none' | 'won' | 'lost', reduced: boolean): void {
    const target = this.target;
    let rate = 16;
    const a = hero.action;
    if (outro === 'won' && a !== 'fall') { Object.assign(target, WIN); rate = 6; }
    else if (a === 'attack') {
      const swing = COMBO[hero.combo];
      const [wind, hit, follow] = SWINGS[hero.combo];
      if (hero.t < swing.startup) { mix(target, GUARD, wind, ease(clamp(hero.t / swing.startup, 0, 1))); rate = 30; }
      else if (hero.t < swing.startup + swing.active) { Object.assign(target, hit); rate = 60; }
      else { mix(target, follow, GUARD, ease(clamp((hero.t - swing.startup - swing.active) / swing.recovery, 0, 1))); rate = 22; }
    } else if (a === 'finisher') {
      const [wind, hit, follow] = FINISH;
      if (hero.t < FINISHER.startup) { Object.assign(target, wind); rate = 20; }
      else if (hero.t < FINISHER.startup + FINISHER.active) { Object.assign(target, hit); rate = 50; }
      else { mix(target, follow, GUARD, ease(clamp((hero.t - FINISHER.startup - FINISHER.active) / FINISHER.recovery, 0, 1))); rate = 14; }
    } else if (a === 'parry') {
      Object.assign(target, PARRY_POSE);
      if (hero.parried) target.wrist += 0.35;
      rate = 40;
    } else if (a === 'dodge') {
      const k = clamp(hero.t / DODGE.duration, 0, 1);
      Object.assign(target, k < 0.85 ? TUCK : GUARD);
      target.roll = -hero.dodgeDir * Math.PI * 2 * ease(clamp(hero.t / (DODGE.duration * 0.88), 0, 1));
      if (hero.dodgeDir === 0) target.roll = Math.PI * 2 * ease(clamp(hero.t / (DODGE.duration * 0.88), 0, 1));
      rate = 40;
    } else if (a === 'hurt') { Object.assign(target, HURT); rate = 30; }
    else if (a === 'fall') { Object.assign(target, FALL); target.armR += Math.sin(t * 9) * 0.5; target.armL += Math.cos(t * 8) * 0.5; rate = 12; }
    else if (a === 'down') { Object.assign(target, DOWN); rate = 8; }
    else {
      Object.assign(target, GUARD);
      const moving = Math.abs(hero.move) > 0.05;
      if (moving) {
        this.walkPhase += dt * 9 * Math.abs(hero.move);
        const s = Math.sin(this.walkPhase);
        const dir = Math.sign(hero.move);
        target.hipR = 0.25 + s * 0.5 * dir;
        target.hipL = -0.15 - s * 0.5 * dir;
        target.kneeR = -0.25 - Math.max(0, -s * dir) * 0.7;
        target.kneeL = -0.25 - Math.max(0, s * dir) * 0.7;
        target.lift = Math.abs(Math.cos(this.walkPhase)) * 0.035 - 0.02;
        target.armL = -0.3 + s * 0.3 * dir;
      } else {
        target.lift = Math.sin(t * 2.2) * 0.012;
      }
      rate = 14;
    }
    // Rolls are instant: the roll angle must not lag behind or the hero spins the wrong way when it ends.
    const k = damp(rate, dt);
    for (const key of KEYS) this.current[key] += (target[key] - this.current[key]) * (key === 'roll' && a === 'dodge' ? 1 : k);
    if (a !== 'dodge' && a !== 'down' && Math.abs(this.current.roll) > 3) this.current.roll = 0;
    const p = this.current;

    // Body placement.
    if (Math.abs(hero.x - this.visualX) > 2.2) this.visualX = hero.x;
    this.visualX += (hero.x - this.visualX) * damp(30, dt);
    if (a === 'fall') this.fallY -= dt * (2 + -this.fallY * 3.5); else this.fallY += (0 - this.fallY) * damp(20, dt);
    this.root.position.set(this.visualX + p.reach, this.fallY, 0);
    const tucked = a === 'dodge' || a === 'down';
    const pivotY = tucked ? 0.52 : 0.95;
    this.pivot.position.y = pivotY;
    this.body.position.y = 0.95 - pivotY + p.lift;
    this.pivot.rotation.z = p.roll;
    this.torso.rotation.z = -p.lean;
    this.head.rotation.z = -p.head;
    this.shoulderR.rotation.z = p.armR;
    this.elbowR.rotation.z = p.elbowR;
    this.hand.rotation.z = p.wrist;
    this.shoulderL.rotation.z = p.armL;
    this.elbowL.rotation.z = p.elbowL;
    this.hipR.rotation.z = p.hipR;
    this.kneeR.rotation.z = p.kneeR;
    this.hipL.rotation.z = p.hipL;
    this.kneeL.rotation.z = p.kneeL;
    this.cape.rotation.z = -0.15 - Math.min(0.6, Math.abs(hero.move) * 0.4) + Math.sin(t * 1.6) * 0.06 + p.lean * 0.5;

    this.shadow.position.x = this.visualX + p.reach;
    this.shadow.visible = a !== 'fall';
    const shadowScale = 1 - clamp(p.lift, -0.3, 0.3);
    this.shadow.scale.set(1.3 * shadowScale, 1, 0.8 * shadowScale);

    // Blade glow: ready finisher (gold), finisher (ember), parry guard glint.
    const steel = this.blade.material;
    const ready = hero.focus >= FOCUS_MAX;
    const finishing = a === 'finisher';
    const glowAmount = finishing ? 1 : ready ? 0.55 + 0.25 * Math.sin(t * 4) : 0;
    rimOf(steel).uFlash.value.copy(finishing ? EMBER : GOLD).multiplyScalar(glowAmount * 0.9);
    const tipMat = this.tipGlow.material;
    tipMat.color.copy(finishing ? EMBER : GOLD);
    tipMat.opacity = glowAmount * 0.8;
    const glint = this.guardGlint.material;
    if (a === 'parry' && !hero.parried && hero.t <= PARRY.guard) {
      glint.opacity = hero.t <= 0.16 ? 0.75 : 0.25;
      this.guardGlint.position.set(0.55, 1.35, 0.35);
    } else glint.opacity = Math.max(0, glint.opacity - dt * 4);

    // Hit flash on every hero material.
    this.flashT = Math.max(0, this.flashT - dt);
    const f = reduced ? Math.min(0.18, this.flashT * 2) : Math.min(0.3, this.flashT * 4);
    for (const m of this.materials) {
      if (m === steel) continue;
      rimOf(m).uFlash.value.copy(this.flashColor).multiplyScalar(Math.min(1, f));
    }

    this.updateTrail(dt, a === 'attack' || finishing, finishing);
  }

  private updateTrail(dt: number, swinging: boolean, finishing: boolean): void {
    const n = this.trailBase.length;
    for (let i = 0; i < n; i++) this.trailAge[i] = Math.min(1, this.trailAge[i] + dt * 5);
    if (swinging) {
      // Shift samples and push the current blade base and tip.
      for (let i = n - 1; i > 0; i--) { this.trailBase[i].copy(this.trailBase[i - 1]); this.trailTip[i].copy(this.trailTip[i - 1]); this.trailAge[i] = this.trailAge[i - 1]; }
      this.hand.localToWorld(this.tmpA.set(0, -0.3, 0));
      this.hand.localToWorld(this.tmpB.set(0, -1.22, 0));
      this.trailBase[0].copy(this.tmpA);
      this.trailTip[0].copy(this.tmpB);
      this.trailAge[0] = 0;
    }
    for (let i = 0; i < n; i++) {
      this.trailPos.set([this.trailBase[i].x, this.trailBase[i].y, this.trailBase[i].z], i * 6);
      this.trailPos.set([this.trailTip[i].x, this.trailTip[i].y, this.trailTip[i].z], i * 6 + 3);
      const alpha = (1 - this.trailAge[i]) * (1 - i / n) * 0.75;
      this.trailAlpha[i * 2] = alpha * 0.2;
      this.trailAlpha[i * 2 + 1] = alpha;
    }
    this.trailMaterial.uniforms.uColor.value.set(finishing ? 0xffb060 : 0xfff2d0);
    const g = this.trail.geometry;
    g.attributes.position.needsUpdate = true;
    g.attributes.aAlpha.needsUpdate = true;
  }
}
