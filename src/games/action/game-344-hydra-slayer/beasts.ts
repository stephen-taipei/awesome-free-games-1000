/** The four beasts, built from primitives and tubes, posed every frame from their state machines in logic.ts. */
import { THREE, damp, clamp, lerp } from '../../../shared/three/kit';
import {
  EDGE_X, HYDRA_REST, HYDRA_FRONT, SWEEP_FROM, HOUND_LENGTH, HOUND_AIR, HOVER_X, HOVER_Y, KRAKEN_HEAD_X0,
  phaseOf, type Beast, type Strike, type Hydra, type Hound, type Siren, type Kraken,
} from './logic';
import { LiveTube, rimMaterial, rimOf, mergeGeometries, GOLD, CRIMSON, SONG, EMBER, type Sparks } from './art';

export interface ViewContext {
  t: number;
  dt: number;
  heroX: number;
  sparks: Sparks;
  reduced: boolean;
  /** 0..1 death animation once the beast is beaten. */
  dying: number;
  /** The beast won: it gloats. */
  gloat: boolean;
}

export interface Frame { left: number; right: number; top: number; }

const ease = (k: number) => k * k * (3 - 2 * k);
const sat = (k: number) => clamp(k, 0, 1);
export const tellColor = (s: Strike) => (s.spec.parryable ? (s.attack === 'sirenNote' ? SONG : GOLD) : CRIMSON);

/** Glow strength for a strike: grows through the windup (squared, so the last instant is brightest), flares on the hit. */
export function tellAmount(s: Strike): number {
  const phase = phaseOf(s);
  if (phase === 'queued') return 0;
  if (phase === 'windup') { const k = s.t / s.windup; return 0.25 + 0.75 * k * k; }
  if (phase === 'active') return 1.3;
  return Math.max(0, 1 - (s.t - s.windup - s.spec.active) * 4);
}

function sprite(glow: THREE.Texture, color: THREE.ColorRepresentation, scale: number): THREE.Sprite {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, color, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0 }));
  s.scale.set(scale, scale, 1);
  return s;
}

function eyeMaterial(color: THREE.ColorRepresentation): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({ color });
}

/** Sets an eye/glow pair to a telegraph colour (or back to its resting colour). */
function setTell(eye: THREE.MeshBasicMaterial, glow: THREE.Sprite, rest: THREE.Color, s: Strike | null, scale: number, pulse = 0): void {
  // Telegraph halos draw over everything: they are the most important thing on screen.
  glow.material.depthTest = false;
  glow.renderOrder = 5;
  if (s && phaseOf(s) !== 'queued') {
    const k = tellAmount(s);
    eye.color.copy(tellColor(s)).multiplyScalar(0.6 + 0.6 * Math.min(1, k));
    glow.material.color.copy(tellColor(s));
    glow.material.opacity = Math.min(1, k * 0.95);
    const size = scale * (0.8 + 1.2 * Math.min(1.2, k));
    glow.scale.set(size, size, 1);
  } else {
    eye.color.copy(rest);
    glow.material.opacity = Math.max(0, glow.material.opacity - 0.08) * (1 - pulse) + pulse * 0.25;
  }
}

export abstract class BeastView {
  readonly root = new THREE.Group();
  protected readonly materials: THREE.MeshStandardMaterial[] = [];
  protected flashT = 0;
  protected flashTint = new THREE.Color(1, 1, 1);

  constructor(protected readonly glow: THREE.Texture) {}

  abstract update(beast: Beast, ctx: ViewContext): void;
  abstract frame(beast: Beast): Frame;

  flash(color: THREE.ColorRepresentation = 0xffffff, seconds = 0.12): void {
    this.flashT = seconds;
    this.flashTint.set(color);
  }

  protected applyFlash(dt: number, reduced: boolean, extra: THREE.Color | null = null): void {
    this.flashT = Math.max(0, this.flashT - dt);
    const k = Math.min(1, this.flashT * (reduced ? 2 : 7));
    for (const m of this.materials) {
      const flash = rimOf(m).uFlash.value;
      flash.copy(this.flashTint).multiplyScalar(k * 0.8);
      if (extra) flash.add(extra);
    }
  }

  private readonly tintColor = new THREE.Color();
  /** The body takes on the colour of its most advanced telegraph as it winds up. */
  protected tellTint(strikes: readonly Strike[], strength = 0.26): THREE.Color | null {
    let best: Strike | null = null;
    let amount = 0;
    for (const s of strikes) {
      if (s.outcome === 'cancel' || phaseOf(s) === 'queued' || phaseOf(s) === 'recovery') continue;
      const k = Math.min(1, tellAmount(s));
      if (k > amount) { amount = k; best = s; }
    }
    if (!best) return null;
    return this.tintColor.copy(tellColor(best)).multiplyScalar(amount * amount * strength);
  }

  protected mat(params: THREE.MeshStandardMaterialParameters, rim: THREE.ColorRepresentation, strength = 0.9): THREE.MeshStandardMaterial {
    const m = rimMaterial(params, rim, strength);
    this.materials.push(m);
    return m;
  }
}

// ------------------------------------------------------------------ Hydra

interface HeadRig {
  group: THREE.Group;
  jaw: THREE.Group;
  eyes: THREE.MeshBasicMaterial;
  glow: THREE.Sprite;
  neck: LiveTube;
  neckMesh: THREE.Mesh;
  stump: THREE.Mesh;
  material: THREE.MeshStandardMaterial;
  base: THREE.Vector3;
  pos: THREE.Vector3;
  z: number;
  restY: number;
  scale: number;
  flash: number;
  spit: THREE.Mesh;
  points: THREE.Vector3[];
  tint: THREE.Color;
}

export class HydraView extends BeastView {
  private readonly heads: HeadRig[] = [];
  private readonly body = new THREE.Group();
  private readonly eyeRest = new THREE.Color(0xfff0a0);
  private readonly tmp = new THREE.Vector3();
  private readonly goal = new THREE.Vector3();

  constructor(glow: THREE.Texture) {
    super(glow);
    const scales = this.mat({ color: 0x2e5a4c, roughness: 0.55, metalness: 0.15, flatShading: true }, 0xffb07a, 1.0);
    const belly = this.mat({ color: 0x8f9a62, roughness: 0.7, flatShading: true }, 0xffc090, 0.7);
    const spikeMat = this.mat({ color: 0x1c2a28, roughness: 0.6, flatShading: true }, 0xff9a6a, 0.8);

    // The body heaves up over the cliff edge, claws dug into the lip.
    const torso = new THREE.Mesh(new THREE.SphereGeometry(1.7, 14, 10), scales);
    torso.scale.set(0.95, 1.35, 0.9);
    torso.position.set(EDGE_X + 1.55, -0.35, -1.3);
    const chest = new THREE.Mesh(new THREE.SphereGeometry(1.1, 12, 8), belly);
    chest.scale.set(0.6, 1.1, 0.75);
    chest.position.set(HYDRA_FRONT + 0.75, 0.0, -0.95);
    const spikes: THREE.BufferGeometry[] = [];
    for (let i = 0; i < 7; i++) {
      const g = new THREE.ConeGeometry(0.16, 0.7, 5);
      g.rotateZ(-0.5 - i * 0.12);
      g.translate(EDGE_X + 1.4 + i * 0.28, 1.6 - i * 0.18 + Math.sin(i) * 0.1, -1.5 + (i % 2) * 0.35);
      spikes.push(g);
    }
    for (const z of [-0.2, -2.0]) {
      const claw = new THREE.ConeGeometry(0.12, 0.55, 4);
      claw.rotateZ(Math.PI / 2 + 0.4);
      claw.translate(EDGE_X - 0.05, 0.08, z);
      spikes.push(claw);
      const claw2 = claw.clone();
      claw2.translate(0.1, 0, 0.25);
      spikes.push(claw2);
    }
    const spikeMesh = new THREE.Mesh(mergeGeometries(spikes), spikeMat);
    this.body.add(torso, chest, spikeMesh);
    this.root.add(this.body);

    const zs = [-0.45, -1.05, -1.65];
    const restY = [2.25, 3.0, 2.6];
    HYDRA_REST.forEach((restX, i) => {
      const material = this.mat({ color: 0x31604f, roughness: 0.5, metalness: 0.15, flatShading: true }, 0xffb07a, 1.0);
      const group = new THREE.Group();
      // Skull: a long cone snout plus horns and a frill, merged.
      const parts: THREE.BufferGeometry[] = [];
      const skull = new THREE.ConeGeometry(0.3, 0.95, 7);
      skull.rotateZ(Math.PI / 2);
      skull.scale(1, 0.72, 0.9);
      skull.translate(-0.25, 0.05, 0);
      parts.push(skull);
      const crown = new THREE.SphereGeometry(0.3, 8, 6);
      crown.scale(1.1, 0.85, 0.9);
      crown.translate(0.18, 0.08, 0);
      parts.push(crown);
      for (const side of [-1, 1]) {
        const horn = new THREE.ConeGeometry(0.07, 0.55, 5);
        horn.rotateZ(-1.0);
        horn.translate(0.45, 0.3, side * 0.17);
        parts.push(horn);
      }
      const frill = new THREE.ConeGeometry(0.22, 0.5, 6);
      frill.rotateZ(-1.35);
      frill.translate(0.5, 0.0, 0);
      parts.push(frill);
      group.add(new THREE.Mesh(mergeGeometries(parts), material));
      const jaw = new THREE.Group();
      jaw.position.set(0.2, -0.05, 0);
      const jawMesh = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.8, 6).rotateZ(Math.PI / 2).scale(1, 0.45, 0.85).translate(-0.4, -0.08, 0), material);
      jaw.add(jawMesh);
      group.add(jaw);
      const eyes = eyeMaterial(this.eyeRest);
      const eyeGeometry = mergeGeometries([new THREE.SphereGeometry(0.06, 6, 5).translate(-0.05, 0.2, 0.2), new THREE.SphereGeometry(0.06, 6, 5).translate(-0.05, 0.2, -0.2)]);
      group.add(new THREE.Mesh(eyeGeometry, eyes));
      const glowSprite = sprite(glow, GOLD, 1.4);
      glowSprite.position.set(-0.55, 0, 0.1);
      group.add(glowSprite);
      const neck = new LiveTube(16, 8);
      const neckMesh = neck.mesh(material);
      const stump = new THREE.Mesh(new THREE.SphereGeometry(0.26, 8, 6), this.mat({ color: 0x6a1a1a, emissive: 0x3a0800, roughness: 0.6, flatShading: true }, 0xff6a3a, 1));
      stump.visible = false;
      const spit = new THREE.Mesh(new THREE.IcosahedronGeometry(0.16, 0), new THREE.MeshBasicMaterial({ color: 0xc6ff4a }));
      spit.visible = false;
      this.root.add(group, neckMesh, stump, spit);
      const base = new THREE.Vector3(EDGE_X + 0.95, 0.9 + i * 0.25, zs[i]);
      const pos = new THREE.Vector3(restX + 0.2, restY[i], zs[i]);
      this.heads.push({
        group, jaw, eyes, glow: glowSprite, neck, neckMesh, stump, material, base, pos, z: zs[i], restY: restY[i], scale: 1, flash: 0, spit, tint: new THREE.Color(),
        points: [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()],
      });
    });
  }

  flashPart(part: number): void {
    const head = this.heads[part];
    if (head) head.flash = 0.14;
    else this.flash();
  }

  frame(): Frame { return { left: HYDRA_REST[0] - 0.6, right: EDGE_X + 1.6, top: 3.6 }; }

  update(beast: Beast, ctx: ViewContext): void {
    const hydra = beast as Hydra;
    const { t, dt } = ctx;
    this.body.position.y = Math.sin(t * 0.9) * 0.06 - ctx.dying * 5;
    this.body.rotation.z = ctx.dying * 0.4;
    hydra.heads.forEach((state, i) => {
      const rig = this.heads[i];
      const strike = hydra.strikes.find(s => s.part === i || (s.attack === 'hydraSweep' && s.data === i)) ?? null;
      const g = this.goal;
      let rate = 9;
      let jawOpen = 0.12 + 0.06 * Math.sin(t * 1.3 + i);
      const restX = state.restX + 0.2;
      g.set(restX + Math.sin(t * 0.8 + i * 2) * 0.12, rig.restY + Math.sin(t * 1.1 + i * 1.7) * 0.14, rig.z);
      if (state.state === 'alive') {
        if (strike) {
          const phase = phaseOf(strike);
          const k = sat(strike.t / strike.windup);
          if (strike.attack === 'hydraBite') {
            if (phase === 'windup') {
              g.x += 0.7 * ease(k);
              g.y += 0.65 * ease(k);
              jawOpen = 0.15 + 0.85 * k;
              if (k > 0.7 && !ctx.reduced) g.y += Math.sin(t * 40) * 0.025;
            } else if (phase === 'active') {
              g.set(strike.target + 0.55, 0.55, -0.25);
              rate = 45;
              jawOpen = 0.05;
            }
          } else if (strike.attack === 'hydraSweep') {
            const second = strike.data === i;
            const endX = SWEEP_FROM + (second ? 2.4 : 1.2);
            if (phase === 'windup') {
              g.lerp(this.tmp.set(EDGE_X - 0.5 - (second ? 0.5 : 0), 0.55, rig.z), ease(k));
              jawOpen = 0.6;
              rate = 6;
            } else if (phase === 'active') {
              const a = sat((strike.t - strike.windup) / strike.spec.active);
              g.set(lerp(EDGE_X - 0.5, endX, ease(a)), 0.5, second ? -0.6 : -0.25);
              rate = 50;
              jawOpen = 0.9;
            }
          } else if (strike.attack === 'hydraSpit') {
            if (phase === 'windup') {
              g.x += 0.35 * ease(k);
              g.y += 0.75 * ease(k);
              jawOpen = 0.2 + 0.9 * k;
            }
            // The glob arcs from the mouth to the tell in the last moments of the windup.
            const flight = 0.45;
            const ft = strike.t - (strike.windup - flight);
            rig.spit.visible = ft > 0 && ft < flight;
            if (rig.spit.visible) {
              const u = ft / flight;
              rig.spit.position.set(lerp(rig.pos.x - 0.6, strike.target, u), lerp(rig.pos.y, 0.2, u) + Math.sin(u * Math.PI) * 1.4, lerp(rig.z, 0, u));
            }
          }
        }
        if (state.low > 0 && (!strike || phaseOf(strike) === 'recovery')) {
          g.set(state.x, 0.5, -0.25 - i * 0.12);
          rate = 12;
          jawOpen = state.stagger > 0 ? 0.55 : 0.25;
          if (state.stagger > 0) { g.y += 0.08 * Math.sin(t * 2.5 + i); g.x += 0.1 * Math.sin(t * 1.7); }
        }
        if (!strike || strike.attack !== 'hydraSpit') rig.spit.visible = false;
        // A regrown head swells back in.
        rig.scale = state.age < 0.7 ? 0.3 + 0.7 * ease(sat(state.age / 0.7)) * (1 + 0.15 * Math.sin(sat(state.age / 0.7) * Math.PI)) : 1;
      } else {
        rig.spit.visible = false;
        g.set(state.restX + (state.state === 'stump' ? 0.3 : 1.4), 0.3, rig.z * 0.6);
        rig.scale = 0;
        rate = 6;
      }
      if (ctx.dying > 0) { g.y = lerp(g.y, -2, ctx.dying); g.x = lerp(g.x, EDGE_X + 0.6, ctx.dying * 0.5); }
      if (ctx.gloat && state.state === 'alive') { g.y += 0.4 + Math.sin(t * 2 + i) * 0.15; jawOpen = 0.8; }
      if (rig.pos.distanceTo(g) > 9) rig.pos.copy(g);
      rig.pos.lerp(g, damp(rate, dt));

      // Head: faces the hero, tilts with the bite, opens its jaw.
      rig.group.visible = state.state === 'alive' && rig.scale > 0.01;
      rig.group.position.copy(rig.pos);
      rig.group.scale.setScalar(Math.max(0.01, rig.scale));
      rig.group.rotation.z = clamp((g.y - rig.pos.y) * 0.4, -0.5, 0.5) - (rig.pos.y < 1 ? 0.25 : 0);
      rig.jaw.rotation.z = jawOpen * 0.75;
      setTell(rig.eyes, rig.glow, state.stagger > 0 ? new THREE.Color(0x555555) : this.eyeRest, strike, 1.2);

      // Neck: from the body, up and over, down into the back of the head.
      const [p0, p1, p2, p3] = rig.points;
      p0.copy(rig.base);
      p0.y += this.body.position.y;
      p3.set(rig.pos.x + 0.45 * Math.max(rig.scale, 0.4), rig.pos.y, rig.pos.z);
      if (state.state === 'gone') p3.set(EDGE_X + 0.35, 0.35 + this.body.position.y, rig.z);
      p1.set(p0.x - 0.35, p0.y + (state.state === 'gone' ? 0.3 : 1.1), p0.z);
      p2.set(lerp(p1.x, p3.x, 0.55) + 0.25, Math.max(p1.y, p3.y) + (state.state === 'alive' ? 0.35 : 0.1), lerp(p1.z, p3.z, 0.5));
      rig.neck.update(rig.points, u => (state.state === 'gone' ? 0.3 - 0.1 * u : 0.36 - 0.16 * u));
      rig.stump.visible = state.state !== 'alive';
      rig.stump.position.copy(p3);
      if (state.state === 'stump') {
        const near = state.regrow < 1.6 ? 1 - state.regrow / 1.6 : 0;
        rig.stump.scale.setScalar(0.9 + near * 0.35 * (0.5 + 0.5 * Math.sin(t * Math.PI * 2 * 1.2)));
        rimOf(rig.stump.material as THREE.MeshStandardMaterial).uFlash.value.setRGB(0.5 + near * 0.6, 0.12, 0.05);
      } else if (state.state === 'gone') {
        rig.stump.scale.setScalar(0.8);
        rimOf(rig.stump.material as THREE.MeshStandardMaterial).uFlash.value.setRGB(0.25 + 0.12 * Math.sin(t * 1.5 + i), 0.08, 0.02);
      }
      rig.flash = Math.max(0, rig.flash - dt);
      const live = strike && state.state === 'alive' && phaseOf(strike) !== 'queued' && phaseOf(strike) !== 'recovery';
      const k = live ? Math.min(1, tellAmount(strike)) : 0;
      rig.tint.copy(live ? tellColor(strike) : this.eyeRest).multiplyScalar(k * k * 0.18);
    });
    this.applyFlash(dt, ctx.reduced);
    for (const head of this.heads) {
      // Head materials carry their own flash and telegraph tint; re-apply them after the shared pass.
      const f = Math.min(1, head.flash * (ctx.reduced ? 2 : 7)) * 0.8;
      rimOf(head.material).uFlash.value.setRGB(f, f, f).add(head.tint);
    }
  }

  headPosition(part: number, out: THREE.Vector3): THREE.Vector3 {
    const head = this.heads[part];
    return head ? out.copy(head.pos) : out.set(HYDRA_FRONT, 1.5, -0.5);
  }
}

// ------------------------------------------------------------------ Three-Headed Hound

interface HoundHead { pivot: THREE.Group; jaw: THREE.Group; eyes: THREE.MeshBasicMaterial; glow: THREE.Sprite; rest: THREE.Vector3; }

export class HoundView extends BeastView {
  private readonly body = new THREE.Group();
  private readonly heads: HoundHead[] = [];
  private readonly legs: { hip: THREE.Group; knee: THREE.Group; front: boolean; side: number }[] = [];
  private readonly tail = new LiveTube(10, 6);
  private readonly tailPoints = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
  private readonly tailFlame: THREE.Sprite;
  private readonly eyeRest = new THREE.Color(0xff8a3a);
  private visualFront = 3.7;
  private gait = 0;
  private landed = 0;

  constructor(glow: THREE.Texture) {
    super(glow);
    const fur = this.mat({ color: 0x2c2329, roughness: 0.75, flatShading: true }, 0xff8a4a, 1.0);
    const hide = this.mat({ color: 0x46323a, roughness: 0.7, flatShading: true }, 0xff9a5a, 0.8);
    const bone = this.mat({ color: 0xcdbfa8, roughness: 0.6, flatShading: true }, 0xffc090, 0.5);
    this.root.add(this.body);
    // Torso, chest and haunch merged.
    const torsoParts = [
      new THREE.CapsuleGeometry(0.46, 1.2, 4, 10).rotateZ(Math.PI / 2).translate(0, 1.25, 0),
      new THREE.SphereGeometry(0.6, 10, 8).scale(1, 1.05, 0.95).translate(-0.72, 1.38, 0),
      new THREE.SphereGeometry(0.5, 10, 8).translate(0.75, 1.22, 0),
    ];
    this.body.add(new THREE.Mesh(mergeGeometries(torsoParts), fur));
    // Mane spikes and spine ridge.
    const spikes: THREE.BufferGeometry[] = [];
    for (let i = 0; i < 9; i++) {
      const g = new THREE.ConeGeometry(0.09, 0.45, 4);
      g.rotateZ(0.6 - i * 0.05);
      g.translate(-0.6 + i * 0.2, 1.85 - Math.abs(i - 2) * 0.06, (i % 2 ? 0.12 : -0.12));
      spikes.push(g);
    }
    this.body.add(new THREE.Mesh(mergeGeometries(spikes), hide));
    // Legs.
    const legSpots: [number, number, boolean][] = [[-0.62, 0.3, true], [-0.62, -0.3, true], [0.72, 0.3, false], [0.72, -0.3, false]];
    const thighGeometry = new THREE.CapsuleGeometry(0.14, 0.32, 3, 8).translate(0, -0.22, 0);
    const shinGeometry = new THREE.CapsuleGeometry(0.1, 0.38, 3, 8).translate(0, -0.25, 0);
    const pawGeometry = new THREE.BoxGeometry(0.28, 0.1, 0.18).translate(-0.06, -0.52, 0);
    for (const [x, z, front] of legSpots) {
      const hip = new THREE.Group();
      hip.position.set(x, 1.12, z);
      const knee = new THREE.Group();
      knee.position.y = -0.46;
      knee.add(new THREE.Mesh(shinGeometry, hide), new THREE.Mesh(pawGeometry, fur));
      hip.add(new THREE.Mesh(thighGeometry, fur), knee);
      this.body.add(hip);
      this.legs.push({ hip, knee, front, side: z });
    }
    // Three heads on short necks.
    const restSpots = [new THREE.Vector3(-1.25, 1.75, 0.5), new THREE.Vector3(-1.4, 2.08, 0), new THREE.Vector3(-1.25, 1.75, -0.5)];
    const neckGeometry = new THREE.CapsuleGeometry(0.2, 0.45, 3, 8).rotateZ(-0.9).translate(0.32, -0.22, 0);
    restSpots.forEach(rest => {
      const pivot = new THREE.Group();
      pivot.position.copy(rest);
      const skull = mergeGeometries([
        new THREE.BoxGeometry(0.46, 0.34, 0.34).translate(0.02, 0.02, 0),
        new THREE.BoxGeometry(0.36, 0.18, 0.22).translate(-0.36, -0.02, 0),
        new THREE.ConeGeometry(0.08, 0.26, 4).rotateZ(-0.3).translate(0.12, 0.27, 0.12),
        new THREE.ConeGeometry(0.08, 0.26, 4).rotateZ(-0.3).translate(0.12, 0.27, -0.12),
      ]);
      pivot.add(new THREE.Mesh(skull, fur), new THREE.Mesh(neckGeometry, fur));
      const jaw = new THREE.Group();
      jaw.position.set(-0.1, -0.1, 0);
      jaw.add(new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.08, 0.2).translate(-0.22, -0.04, 0), bone));
      pivot.add(jaw);
      const eyes = eyeMaterial(this.eyeRest);
      pivot.add(new THREE.Mesh(mergeGeometries([new THREE.SphereGeometry(0.045, 6, 4).translate(-0.18, 0.1, 0.13), new THREE.SphereGeometry(0.045, 6, 4).translate(-0.18, 0.1, -0.13)]), eyes));
      const glowSprite = sprite(glow, GOLD, 1);
      glowSprite.position.set(-0.45, -0.05, 0.1);
      pivot.add(glowSprite);
      this.body.add(pivot);
      this.heads.push({ pivot, jaw, eyes, glow: glowSprite, rest });
    });
    this.root.add(this.tail.mesh(fur));
    this.tailFlame = sprite(glow, EMBER, 0.7);
    this.root.add(this.tailFlame);
  }

  frame(beast: Beast): Frame {
    const front = (beast as Hound).front;
    return { left: front - 0.3, right: front + HOUND_LENGTH + 0.3, top: 2.8 };
  }

  update(beast: Beast, ctx: ViewContext): void {
    const hound = beast as Hound;
    const { t, dt } = ctx;
    const prev = this.visualFront;
    if (Math.abs(hound.front - this.visualFront) > 4) this.visualFront = hound.front;
    this.visualFront += (hound.front - this.visualFront) * damp(25, dt);
    const speed = (this.visualFront - prev) / Math.max(dt, 1e-4);
    const pounce = hound.strikes.find(s => s.attack === 'houndPounce') ?? null;
    let lift = 0;
    let crouch = 0;
    let tilt = 0;
    if (pounce) {
      const phase = phaseOf(pounce);
      const air = pounce.t - (pounce.windup - HOUND_AIR);
      if (phase === 'windup' && air < 0) crouch = ease(sat(pounce.t / (pounce.windup - HOUND_AIR)));
      else if (phase === 'windup') { const k = sat(air / HOUND_AIR); lift = 4 * 1.3 * k * (1 - k); tilt = 0.35 - k * 0.6; }
      else if (phase === 'active') { this.landed = 0.25; }
    }
    this.landed = Math.max(0, this.landed - dt);
    const staggered = hound.stagger > 0;
    const breathe = Math.sin(t * 2.4) * 0.03;
    this.root.position.set(this.visualFront + 1.3, lift - ctx.dying * 0.6, -0.5);
    this.body.position.y = -crouch * 0.32 - this.landed * 0.5 + breathe + (staggered ? -0.12 : 0);
    this.body.rotation.z = tilt + (staggered ? Math.sin(t * 2) * 0.05 : 0) - crouch * 0.12;
    this.root.rotation.x = ctx.dying * 1.35;

    // Legs: a trot while it moves, splayed in the crouch.
    const moving = Math.abs(speed) > 0.2;
    if (moving) this.gait += dt * 10;
    for (const leg of this.legs) {
      const phase = this.gait + (leg.front ? 0 : Math.PI) + (leg.side > 0 ? 0 : Math.PI / 2);
      let hip = moving ? Math.sin(phase) * 0.45 : 0;
      let knee = moving ? -Math.max(0, Math.cos(phase)) * 0.6 : 0;
      if (crouch > 0) { hip = leg.front ? -0.6 * crouch : 0.7 * crouch; knee = (leg.front ? 0.9 : -1.2) * crouch; }
      if (lift > 0.1) { hip = leg.front ? -0.9 : 0.9; knee = 0.2; }
      leg.hip.rotation.z = hip;
      leg.knee.rotation.z = knee;
    }

    // Heads: rear back on the windup, lunge on the bite.
    this.heads.forEach((head, i) => {
      const s = hound.strikes.find(st => st.part === i && st.attack !== 'houndPounce') ?? null;
      let dx = Math.sin(t * 1.3 + i * 2) * 0.04;
      let dy = Math.sin(t * 1.7 + i) * 0.05;
      let jaw = 0.1;
      let rot = 0;
      if (s) {
        const phase = phaseOf(s);
        const k = sat(s.t / s.windup);
        if (phase === 'windup') { dx += 0.38 * ease(k); dy += 0.22 * ease(k); jaw = 0.2 + 0.8 * k; rot = -0.3 * k; }
        else if (phase === 'active') { dx -= 0.95; dy -= 0.35; jaw = 0; rot = 0.25; }
        else { const r = sat((s.t - s.windup - s.spec.active) / 0.25); dx -= 0.95 * (1 - r); dy -= 0.35 * (1 - r); jaw = 0.15; }
      }
      if (pounce && phaseOf(pounce) === 'windup') { jaw = 0.5; dy -= 0.25 * crouch; }
      if (staggered) { dy -= 0.3; rot = 0.4 + Math.sin(t * 2.2 + i) * 0.15; jaw = 0.5; }
      if (ctx.gloat) { dy += 0.2; rot = -0.5; jaw = 0.9; }
      head.pivot.position.set(head.rest.x + dx, head.rest.y + dy, head.rest.z);
      head.pivot.rotation.z = rot;
      head.jaw.rotation.z = jaw * 0.6;
      const tell = s ?? (pounce && phaseOf(pounce) !== 'recovery' ? pounce : null);
      setTell(head.eyes, head.glow, staggered ? new THREE.Color(0x444444) : this.eyeRest, tell, 1);
    });

    // Tail with an ember tip.
    const base = this.root.position;
    const wag = Math.sin(t * 1.6) * 0.25;
    this.tailPoints[0].set(base.x + 1.15, base.y + this.body.position.y + 1.35, base.z);
    this.tailPoints[1].set(base.x + 1.55, base.y + this.body.position.y + 1.6, base.z);
    this.tailPoints[2].set(base.x + 1.85, base.y + this.body.position.y + 2.05 + wag * 0.3, base.z + wag * 0.3);
    this.tailPoints[3].set(base.x + 1.75 + wag * 0.4, base.y + this.body.position.y + 2.45, base.z + wag);
    this.tail.update(this.tailPoints, u => 0.12 - 0.08 * u);
    this.tailFlame.position.copy(this.tailPoints[3]);
    this.tailFlame.material.opacity = 0.75 + 0.15 * Math.sin(t * 2.2);
    if (ctx.dying > 0 && Math.random() < 0.5) ctx.sparks.emit(base.x + (Math.random() - 0.5) * 2.5, 1 + Math.random(), -0.5, 1, { color: EMBER, speed: 1.2, up: 1.5, life: 1, size: 0.25, gravity: -0.5 });
    this.applyFlash(dt, ctx.reduced, this.tellTint(beast.strikes, 0.08));
  }
}

// ------------------------------------------------------------------ Siren

export class SirenView extends BeastView {
  private readonly figure = new THREE.Group();
  private readonly armR = new THREE.Group();
  private readonly armL = new THREE.Group();
  private readonly head = new THREE.Group();
  private readonly tail = new LiveTube(14, 8);
  private readonly tailPoints = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
  private readonly fin: THREE.Mesh;
  private readonly hair: { tube: LiveTube; points: THREE.Vector3[] }[] = [];
  private readonly wings: THREE.Mesh[] = [];
  private readonly gem: THREE.MeshBasicMaterial;
  private readonly gemGlow: THREE.Sprite;
  private readonly eyes: THREE.MeshBasicMaterial;
  private readonly faceGlow: THREE.Sprite;
  private readonly rings: THREE.Mesh<THREE.TorusGeometry, THREE.MeshBasicMaterial>[] = [];
  private readonly notes: { mesh: THREE.Mesh; glow: THREE.Sprite }[] = [];
  private readonly eyeRest = new THREE.Color(0x9ff6ff);
  private readonly pos = new THREE.Vector3(HOVER_X, HOVER_Y, -0.3);
  private readonly tmp = new THREE.Vector3();

  constructor(glow: THREE.Texture) {
    super(glow);
    const skin = this.mat({ color: 0xbfe2dc, roughness: 0.45, emissive: 0x0c2a2a }, 0xffc0a0, 0.9);
    const scale = this.mat({ color: 0x23706f, roughness: 0.35, metalness: 0.3, flatShading: true }, 0xffb090, 1.1);
    const hairMat = this.mat({ color: 0x1b3f63, roughness: 0.5, emissive: 0x05162a }, 0x7ff0ff, 1.1);
    const shell = this.mat({ color: 0xf2d6c2, roughness: 0.4, flatShading: true }, 0xffd0b0, 0.7);
    this.root.add(this.figure);
    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.36, 4, 10), skin);
    torso.position.y = 0.05;
    torso.scale.set(0.9, 1, 0.8);
    this.figure.add(torso);
    this.head.position.y = 0.52;
    this.head.add(new THREE.Mesh(new THREE.SphereGeometry(0.17, 12, 10), skin));
    this.eyes = eyeMaterial(this.eyeRest);
    this.head.add(new THREE.Mesh(mergeGeometries([new THREE.SphereGeometry(0.03, 5, 4).translate(-0.14, 0.03, 0.07), new THREE.SphereGeometry(0.03, 5, 4).translate(-0.14, 0.03, -0.07)]), this.eyes));
    const crown: THREE.BufferGeometry[] = [];
    for (let i = 0; i < 5; i++) {
      const a = -0.9 + i * 0.45;
      crown.push(new THREE.ConeGeometry(0.035, 0.22, 4).rotateZ(-a * 0.6).translate(Math.sin(a) * 0.12 + 0.02, 0.17 + Math.cos(a) * 0.04, 0));
    }
    this.head.add(new THREE.Mesh(mergeGeometries(crown), shell));
    this.faceGlow = sprite(glow, CRIMSON, 0.9);
    this.faceGlow.position.set(-0.2, -0.02, 0.05);
    this.head.add(this.faceGlow);
    this.figure.add(this.head);
    for (const [arm, z] of [[this.armR, 0.22], [this.armL, -0.22]] as const) {
      arm.position.set(0, 0.3, z);
      const upper = new THREE.Mesh(new THREE.CapsuleGeometry(0.05, 0.42, 3, 6).translate(0, -0.25, 0), skin);
      arm.add(upper);
      const hand = sprite(glow, SONG, 0.4);
      hand.position.y = -0.5;
      arm.add(hand);
      this.figure.add(arm);
    }
    this.gem = new THREE.MeshBasicMaterial({ color: SONG });
    const gemMesh = new THREE.Mesh(new THREE.OctahedronGeometry(0.06, 0), this.gem);
    gemMesh.position.set(-0.17, 0.18, 0);
    this.gemGlow = sprite(glow, SONG, 0.8);
    this.gemGlow.position.copy(gemMesh.position);
    this.figure.add(gemMesh, this.gemGlow);
    // Fin-wings: translucent, catching the sun.
    const finShape = new THREE.Shape();
    finShape.moveTo(0, 0);
    finShape.quadraticCurveTo(0.5, 0.9, 1.25, 1.05);
    finShape.quadraticCurveTo(0.95, 0.55, 1.1, 0.15);
    finShape.quadraticCurveTo(0.6, 0.2, 0.75, -0.3);
    finShape.quadraticCurveTo(0.35, -0.1, 0, 0);
    const wingMaterial = new THREE.MeshBasicMaterial({ color: 0x7ff0e6, transparent: true, opacity: 0.38, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending });
    for (const z of [0.12, -0.12]) {
      const wing = new THREE.Mesh(new THREE.ShapeGeometry(finShape, 8), wingMaterial);
      wing.position.set(0.05, 0.32, z);
      this.wings.push(wing);
      this.figure.add(wing);
    }
    this.root.add(this.tail.mesh(scale));
    this.fin = new THREE.Mesh(mergeGeometries([new THREE.ConeGeometry(0.16, 0.5, 4).rotateZ(-2.2).scale(1, 1, 0.25), new THREE.ConeGeometry(0.16, 0.5, 4).rotateZ(-0.9).scale(1, 1, 0.25)]), scale);
    this.root.add(this.fin);
    for (let i = 0; i < 4; i++) {
      const tube = new LiveTube(8, 5);
      this.root.add(tube.mesh(hairMat));
      this.hair.push({ tube, points: [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()] });
    }
    for (let i = 0; i < 3; i++) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(1, 0.025, 6, 40), new THREE.MeshBasicMaterial({ color: SONG, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
      this.root.add(ring);
      this.rings.push(ring);
    }
    const noteGeometry = new THREE.OctahedronGeometry(0.13, 0);
    for (let i = 0; i < 6; i++) {
      const mesh = new THREE.Mesh(noteGeometry, new THREE.MeshBasicMaterial({ color: 0xe8ffff }));
      const g = sprite(glow, SONG, 0.9);
      g.material.opacity = 0.9;
      mesh.visible = g.visible = false;
      this.root.add(mesh, g);
      this.notes.push({ mesh, glow: g });
    }
  }

  frame(beast: Beast): Frame {
    const siren = beast as Siren;
    return { left: Math.min(siren.x - 0.7, EDGE_X - 1.2), right: Math.max(siren.x + 1.5, EDGE_X + 1.6), top: 3.4 };
  }

  update(beast: Beast, ctx: ViewContext): void {
    const siren = beast as Siren;
    const { t, dt } = ctx;
    const grounded = siren.mode === 'ground';
    const staggered = siren.stagger > 0;
    const bob = grounded ? 0 : Math.sin(t * 1.4) * 0.09;
    const goal = this.tmp.set(siren.x, siren.y + bob + (grounded ? 0.25 : 0) - ctx.dying * 4, -0.3);
    if (this.pos.distanceTo(goal) > 6) this.pos.copy(goal);
    this.pos.lerp(goal, damp(siren.mode === 'dive' ? 30 : 12, dt));
    this.root.position.set(0, 0, 0);
    this.figure.position.copy(this.pos);
    const dive = siren.strikes.find(s => s.attack === 'sirenDive') ?? null;
    const shriek = siren.strikes.find(s => s.attack === 'sirenShriek') ?? null;
    const songing = siren.song >= 0;
    const singing = siren.singing;
    let armUp = 0.35 + Math.sin(t * 1.2) * 0.1;
    let lean = 0.1;
    let wingSpread = 0.4 + Math.sin(t * 1.3) * 0.1;
    if (songing) {
      const k = sat(siren.song / siren.songWindup);
      armUp = lerp(0.4, 2.7, ease(k)) + (singing ? Math.sin(t * 2) * 0.15 : 0);
      lean = -0.2 * k;
      wingSpread = 0.9;
    }
    if (dive && phaseOf(dive) === 'windup') { wingSpread = 1.3; lean = 0.45; armUp = 1.7; }
    if (dive && phaseOf(dive) !== 'windup') { armUp = 1.3; lean = 0.3; }
    if (shriek && phaseOf(shriek) !== 'recovery') { lean = 0.6; armUp = -0.6; wingSpread = 1.1; }
    if (grounded) { wingSpread = 0.2; lean = 0.35; }
    if (staggered) { lean = 0.8 + Math.sin(t * 2) * 0.08; armUp = -0.2; wingSpread = 0.1; }
    if (ctx.gloat) { armUp = 2.8; lean = -0.3; wingSpread = 1.2; }
    this.figure.rotation.z = -lean;
    this.armR.rotation.z = armUp;
    this.armL.rotation.z = armUp * 0.9 + 0.15;
    this.armR.rotation.x = songing ? -0.5 : 0;
    this.armL.rotation.x = songing ? 0.5 : 0;
    this.wings.forEach((wing, i) => {
      wing.rotation.y = (i === 0 ? -1 : 1) * (0.25 + wingSpread * 0.55);
      wing.rotation.z = 0.2 + wingSpread * 0.3;
    });
    this.head.rotation.z = staggered ? -0.5 : songing ? 0.3 : 0;
    this.figure.scale.setScalar(1.05 * (1 - ctx.dying * 0.6));

    // Fish tail: from the hips, curling back and down (or lying on the ledge).
    const p = this.pos;
    const sway = Math.sin(t * 1.5) * 0.18;
    const c = Math.cos(lean);
    const s = Math.sin(lean);
    const hip = this.tailPoints[0].set(p.x + s * 0.2, p.y - c * 0.22, p.z);
    if (grounded) {
      this.tailPoints[1].set(hip.x + 0.35, Math.max(0.12, hip.y - 0.35), p.z);
      this.tailPoints[2].set(hip.x + 0.8, 0.15, p.z - 0.1);
      this.tailPoints[3].set(hip.x + 1.25, 0.18 + sway * 0.3, p.z - 0.2);
      this.tailPoints[4].set(hip.x + 1.55, 0.35 + sway * 0.4, p.z - 0.2);
    } else {
      this.tailPoints[1].set(hip.x + 0.15, hip.y - 0.55, p.z);
      this.tailPoints[2].set(hip.x + 0.45 + sway * 0.4, hip.y - 1.0, p.z + sway * 0.3);
      this.tailPoints[3].set(hip.x + 0.85 + sway, hip.y - 1.2, p.z + sway * 0.4);
      this.tailPoints[4].set(hip.x + 1.15 + sway, hip.y - 1.0 + sway * 0.5, p.z);
    }
    this.tail.update(this.tailPoints, u => 0.2 * (1 - u * 0.78) * (1 - ctx.dying * 0.6));
    this.fin.position.copy(this.tailPoints[4]);
    this.fin.rotation.z = sway;
    // Hair streams back from the head.
    this.head.getWorldPosition(this.tmp);
    this.hair.forEach((strand, i) => {
      const [a, b, cc, d] = strand.points;
      const z = (i - 1.5) * 0.06;
      const w = Math.sin(t * 1.8 + i) * 0.12;
      a.set(this.tmp.x + 0.08, this.tmp.y + 0.05, this.tmp.z + z);
      b.set(a.x + 0.3, a.y - 0.12 + w * 0.5, a.z + z);
      cc.set(a.x + 0.6, a.y - 0.4 + w, a.z + z * 2);
      d.set(a.x + 0.75 + w, a.y - 0.8 + w, a.z + z * 3);
      strand.tube.update(strand.points, u => 0.045 * (1 - u * 0.7));
    });

    // Telegraph glows: gold dive, crimson shriek, cyan song.
    const tell = dive ?? shriek ?? null;
    setTell(this.eyes, this.faceGlow, staggered ? new THREE.Color(0x446666) : this.eyeRest, tell, 0.9);
    const gemK = songing ? 0.6 + 0.4 * sat(siren.song / siren.songWindup) : 0.25;
    this.gem.color.copy(SONG).multiplyScalar(0.5 + gemK);
    this.gemGlow.material.opacity = gemK * 0.9;
    this.gemGlow.scale.setScalar(0.5 + gemK * 0.8);

    // Song rings ripple out while she sings.
    this.rings.forEach((ring, i) => {
      if (!singing) { ring.material.opacity = Math.max(0, ring.material.opacity - dt * 2); return; }
      const k = ((t * 0.45 + i / 3) % 1);
      ring.position.set(p.x - 0.15, p.y + 0.4, p.z);
      ring.scale.setScalar(0.4 + k * 3.2);
      ring.material.opacity = (1 - k) * 0.55;
    });
    if (singing && Math.random() < dt * 30) {
      ctx.sparks.emit(ctx.heroX - 1.5 - Math.random() * 3, 0.15 + Math.random() * 0.4, (Math.random() - 0.5) * 2, 1, { color: SONG, speed: 2.2, dirX: 1.6, up: 0.1, spread: 0.2, life: 1.1, size: 0.18, gravity: 0 });
    }

    // Notes fly from her raised hand to the hero, arriving exactly when they strike.
    let n = 0;
    for (const strike of siren.strikes) {
      if (strike.attack !== 'sirenNote' || strike.t < 0 || strike.outcome === 'cancel' || n >= this.notes.length) continue;
      const phase = phaseOf(strike);
      if (phase === 'recovery') continue;
      const note = this.notes[n++];
      const u = sat(strike.t / strike.windup);
      const sx = p.x - 0.3;
      const sy = p.y + 0.9;
      const ex = strike.target;
      const ey = 1.25;
      const x = lerp(sx, ex, u);
      const y = lerp(sy, ey, u) + Math.sin(u * Math.PI) * 1.1;
      note.mesh.visible = note.glow.visible = true;
      note.mesh.position.set(x, y, 0.15);
      note.mesh.rotation.set(t * 3, t * 4, 0);
      note.glow.position.copy(note.mesh.position);
      const near = u > 0.75 ? 1 : 0.6;
      note.glow.scale.setScalar(0.7 + near * 0.5);
    }
    for (; n < this.notes.length; n++) this.notes[n].mesh.visible = this.notes[n].glow.visible = false;
    if (ctx.dying > 0 && Math.random() < 0.6) ctx.sparks.emit(p.x + (Math.random() - 0.5), p.y, p.z, 2, { color: SONG, speed: 1.5, up: 0.5, life: 1.2, size: 0.3, gravity: 1 });
    this.applyFlash(dt, ctx.reduced, this.tellTint(beast.strikes, 0.1));
  }
}

// ------------------------------------------------------------------ Deep Kraken

interface Tentacle { tube: LiveTube; mesh: THREE.Mesh; points: THREE.Vector3[]; glow: THREE.Sprite; }

export class KrakenView extends BeastView {
  private readonly mantle = new THREE.Group();
  private readonly eye: THREE.MeshBasicMaterial;
  private readonly eyeBall: THREE.Mesh;
  private readonly pupil: THREE.Mesh;
  private readonly eyeGlow: THREE.Sprite;
  private readonly edge: Tentacle[] = [];
  private readonly bursts: Tentacle[] = [];
  private readonly eyeRest = new THREE.Color(0xffd36a);
  private headY = -5;

  constructor(glow: THREE.Texture) {
    super(glow);
    const skin = this.mat({ color: 0x5a1f3e, roughness: 0.45, metalness: 0.1, flatShading: true }, 0xff9a7a, 1.1);
    const under = this.mat({ color: 0x9a4a5e, roughness: 0.5, flatShading: true }, 0xffb090, 0.8);
    const mantle = new THREE.SphereGeometry(1.2, 14, 12);
    mantle.scale(1.25, 1.9, 1.05);
    mantle.translate(0.3, 0.9, 0);
    const brow = mergeGeometries([
      new THREE.ConeGeometry(0.22, 0.7, 5).rotateZ(1.2).translate(-0.85, 0.75, 0.55),
      new THREE.ConeGeometry(0.18, 0.55, 5).rotateZ(0.9).translate(-0.6, 1.05, 0.75),
    ]);
    this.mantle.add(new THREE.Mesh(mantle, skin), new THREE.Mesh(brow, under));
    this.eyeBall = new THREE.Mesh(new THREE.SphereGeometry(0.42, 14, 10), new THREE.MeshBasicMaterial({ color: 0xfff1c0 }));
    this.eye = this.eyeBall.material as THREE.MeshBasicMaterial;
    this.eyeBall.position.set(-0.9, 0.35, 0.62);
    this.pupil = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.48, 0.1), new THREE.MeshBasicMaterial({ color: 0x120408 }));
    this.pupil.position.set(-1.25, 0.35, 0.85);
    this.eyeGlow = sprite(glow, GOLD, 1.8);
    this.eyeGlow.position.set(-1.3, 0.35, 0.9);
    this.mantle.add(this.eyeBall, this.pupil, this.eyeGlow);
    this.root.add(this.mantle);
    for (let i = 0; i < 3; i++) {
      const tube = new LiveTube(18, 7);
      const mesh = tube.mesh(i === 0 ? skin : under);
      const g = sprite(glow, GOLD, 1.2);
      this.root.add(mesh, g);
      this.edge.push({ tube, mesh, glow: g, points: Array.from({ length: 5 }, () => new THREE.Vector3()) });
    }
    for (let i = 0; i < 2; i++) {
      const tube = new LiveTube(14, 7);
      const mesh = tube.mesh(skin);
      mesh.visible = false;
      const g = sprite(glow, CRIMSON, 1);
      this.root.add(mesh, g);
      this.bursts.push({ tube, mesh, glow: g, points: Array.from({ length: 4 }, () => new THREE.Vector3()) });
    }
  }

  frame(beast: Beast): Frame {
    const kraken = beast as Kraken;
    return { left: EDGE_X - 1.5, right: EDGE_X + 2.3 + kraken.head * 0.6, top: 3.4 };
  }

  update(beast: Beast, ctx: ViewContext): void {
    const kraken = beast as Kraken;
    const { t, dt } = ctx;
    const staggered = kraken.stagger > 0;
    const beak = kraken.strikes.find(s => s.attack === 'krakenBeak') ?? null;
    const goalY = lerp(-5.2, 0.15, ease(kraken.head)) - ctx.dying * 6 + Math.sin(t * 1.1) * 0.08;
    this.headY += (goalY - this.headY) * damp(6, dt);
    let lunge = 0;
    if (beak) {
      const phase = phaseOf(beak);
      if (phase === 'windup') lunge = -0.25 * sat(beak.t / beak.windup);
      else if (phase === 'active') lunge = 0.75;
      else lunge = 0.75 * (1 - sat((beak.t - beak.windup - beak.spec.active) / 0.3));
    }
    this.mantle.position.set(KRAKEN_HEAD_X0 + 1.75 - lunge, this.headY, -1.5);
    this.mantle.rotation.z = staggered ? 0.25 + Math.sin(t * 1.6) * 0.06 : lunge * 0.15;
    this.eyeBall.scale.set(1, staggered ? 0.25 : 1, 1);
    this.pupil.scale.y = staggered ? 0.2 : 1;
    this.pupil.position.x = -1.25 + clamp((ctx.heroX - EDGE_X) * 0.01, -0.06, 0.02);
    setTell(this.eye, this.eyeGlow, this.eyeRest, beak, 1.6);
    if (!beak) this.eye.color.copy(this.eyeRest).multiplyScalar(staggered ? 0.5 : 1);

    // Edge tentacles: idle waving beyond the lip; one of them carries the slam.
    const slam = kraken.strikes.find(s => s.attack === 'krakenSlam') ?? null;
    this.edge.forEach((tent, i) => {
      const pts = tent.points;
      const baseX = EDGE_X + 0.55 + i * 0.55;
      const z = 0.9 - i * 1.1;
      const w = Math.sin(t * 0.9 + i * 2.1);
      const sink = ctx.dying * 5;
      pts[0].set(baseX + 0.4, -3.2 - sink, z);
      pts[1].set(baseX, -1.2 - sink, z);
      pts[2].set(baseX - 0.2 + w * 0.2, 0.7 - sink, z);
      pts[3].set(baseX + 0.1 + w * 0.35, 1.8 + w * 0.2 - sink, z);
      pts[4].set(baseX + 0.45 + w * 0.5, 2.4 + w * 0.3 - sink, z);
      tent.glow.material.opacity = 0;
      if (i === 0 && slam) {
        const phase = phaseOf(slam);
        const k = sat(slam.t / slam.windup);
        const tx = slam.target;
        if (phase === 'windup') {
          const r = ease(sat(k * 1.4));
          pts[2].lerp(this.tmpV(EDGE_X + 0.2, 2.6, 0.2), r);
          pts[3].lerp(this.tmpV((EDGE_X + tx) / 2 + 0.6, 4.4, 0.1), r);
          pts[4].lerp(this.tmpV(tx + 0.4, 4.2 + Math.sin(t * 3) * 0.05, 0), r);
        } else {
          const lift = phase === 'recovery' ? sat((slam.t - slam.windup - slam.spec.active - (slam.spec.recovery - 0.35)) / 0.35) : 0;
          pts[1].set(EDGE_X + 0.4, -0.8, 0.2);
          pts[2].set(EDGE_X - 0.1, 0.35 + lift * 1.5, 0.1);
          pts[3].set((EDGE_X + tx) / 2 - 0.3, 0.28 + lift * 2.2, 0);
          pts[4].set(tx - 0.9, 0.22 + lift * 2.6, 0);
        }
        tent.glow.position.copy(pts[4]);
        setTell(this.eye, tent.glow, this.eyeRest, slam, 1.4);
      }
      tent.tube.update(pts, u => 0.32 * (1 - u * 0.85));
    });

    // Floor bursts: hidden under the tell, then erupting.
    let n = 0;
    for (const strike of kraken.strikes) {
      if (strike.attack !== 'krakenBurst' || strike.outcome === 'cancel' || strike.t < 0 || n >= this.bursts.length) continue;
      const tent = this.bursts[n++];
      const phase = phaseOf(strike);
      const x = strike.target;
      if (phase === 'windup') {
        tent.mesh.visible = false;
        const k = strike.t / strike.windup;
        tent.glow.material.color.copy(CRIMSON);
        tent.glow.material.opacity = 0.3 + 0.6 * k * k;
        tent.glow.position.set(x, 0.15, 0);
        tent.glow.scale.setScalar(1 + k * 1.2);
        if (k > 0.45 && Math.random() < dt * 40) ctx.sparks.emit(x + (Math.random() - 0.5) * 1.4, 0.05, (Math.random() - 0.5) * 1.2, 1, { color: new THREE.Color(0x8a6a5a), speed: 1.5, up: 1.5, spread: 0.3, life: 0.5, size: 0.14, gravity: 5 });
        continue;
      }
      tent.mesh.visible = true;
      const since = strike.t - strike.windup;
      const rise = ease(sat(since / strike.spec.active));
      const end = strike.spec.active + strike.spec.recovery;
      const sink = sat((since - (end - 0.35)) / 0.35);
      const h = 3.1 * rise * (1 - sink);
      const w = Math.sin(t * 2 + n) * 0.25 * rise;
      const pts = tent.points;
      pts[0].set(x, -0.6, 0);
      pts[1].set(x - 0.05, h * 0.35, 0);
      pts[2].set(x + w * 0.5, h * 0.75, 0.05);
      pts[3].set(x + w - 0.35 * rise, h, 0.1);
      tent.tube.update(pts, u => 0.3 * (1 - u * 0.8) * (0.4 + 0.6 * rise));
      tent.glow.material.opacity = phase === 'active' ? 1 : Math.max(0, 0.6 - since);
      tent.glow.position.set(x, 0.3, 0.2);
      if (phase === 'active' && since < 0.05) ctx.sparks.emit(x, 0.1, 0, 14, { color: new THREE.Color(0xb08a7a), speed: 4, up: 1.2, life: 0.6, size: 0.2, gravity: 9 });
    }
    for (; n < this.bursts.length; n++) { this.bursts[n].mesh.visible = false; this.bursts[n].glow.material.opacity = 0; }
    if (ctx.dying > 0 && Math.random() < 0.5) ctx.sparks.emit(EDGE_X + 1 + Math.random(), -0.5 + Math.random() * 2, -1, 1, { color: new THREE.Color(0xbfe8ff), speed: 0.8, up: 2, life: 1, size: 0.25, gravity: -2 });
    this.applyFlash(dt, ctx.reduced, this.tellTint(beast.strikes, 0.08));
  }

  private readonly tmpVec = new THREE.Vector3();
  private tmpV(x: number, y: number, z: number): THREE.Vector3 { return this.tmpVec.set(x, y, z); }
}

export function createView(id: Beast['id'], glow: THREE.Texture): BeastView {
  if (id === 'hydra') return new HydraView(glow);
  if (id === 'hound') return new HoundView(glow);
  if (id === 'siren') return new SirenView(glow);
  return new KrakenView(glow);
}
