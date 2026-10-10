import { THREE, createStage, createLoop, Keys, trackPointer, clamp, damp, lerp, prefersReducedMotion, type Stage } from '../../../shared/three/kit';
import {
  TAU, TUNNEL_RADIUS as R, TURN_SPEED, OBSTACLE_DEPTH,
  createGenerator, nextRow, overlaps, isSolid, wrap, arcAngleAt, syncRings, type Arc, type Phase,
} from './logic';

export interface Hud { distance: number; shards: number; charges: number; speed: number; phase: Phase; sector: number; }
export interface Result { distance: number; shards: number; sector: number; }
export type GameEvent = 'flip' | 'shard' | 'portal' | 'crash' | 'denied' | 'charge';

export const PHASE_COLORS = ['#2dd4bf', '#f472b6'] as const;
const SECTORS = [
  { line: '#38bdf8', bg: '#02040c' },
  { line: '#a78bfa', bg: '#05031a' },
  { line: '#34d399', bg: '#010d09' },
  { line: '#fbbf24', bg: '#0f0802' },
  { line: '#fb7185', bg: '#12020a' },
];
export const MAX_CHARGES = 3;
const SHARDS_PER_CHARGE = 4;
const TUNNEL_LENGTH = 320;
const SPAWN_AHEAD = 190;

type LivePiece = Arc | { kind: 'shard'; angle: number } | { kind: 'portal' };
interface Live { object: THREE.Object3D; z: number; piece: LivePiece; done?: boolean; }

function glowTexture(): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.25, 'rgba(255,255,255,0.55)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 64, 64);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function arcShape(span: number, outer: number, inner: number): THREE.Shape {
  const shape = new THREE.Shape();
  if (span >= TAU - 1e-6) {
    shape.absarc(0, 0, outer, 0, TAU, false);
    const hole = new THREE.Path();
    hole.absarc(0, 0, inner, 0, TAU, true);
    shape.holes.push(hole);
    return shape;
  }
  shape.absarc(0, 0, outer, -span / 2, span / 2, false);
  shape.absarc(0, 0, inner, span / 2, -span / 2, true);
  shape.closePath();
  return shape;
}

export class PortalDash {
  onHud: (hud: Hud) => void = () => {};
  onOver: (result: Result) => void = () => {};
  onSector: (sector: number) => void = () => {};
  onEvent: (event: GameEvent) => void = () => {};

  private stage: Stage;
  private keys = new Keys();
  private loop = createLoop((dt, t) => this.frame(dt, t));
  private glow = glowTexture();
  private tunnel!: THREE.Mesh<THREE.CylinderGeometry, THREE.ShaderMaterial>;
  private ship = new THREE.Group();
  private shipBody!: THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>;
  private shipGlow!: THREE.Sprite;
  private light = new THREE.PointLight(0xffffff, 40, 16, 1.6);
  private dust!: THREE.Points;
  private burst!: THREE.Points;
  private burstVelocity = new Float32Array(0);
  private live: Live[] = [];
  private geometryCache = new Map<string, { solid: THREE.ExtrudeGeometry; edges: THREE.EdgesGeometry }>();
  private solidMats: THREE.MeshStandardMaterial[] = [];
  private ghostMats: THREE.MeshBasicMaterial[] = [];
  private edgeSolid: THREE.LineBasicMaterial[] = [];
  private edgeGhost: THREE.LineBasicMaterial[] = [];
  private shardGeometry = new THREE.OctahedronGeometry(0.32, 0);
  private shardMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff3b0, emissiveIntensity: 1.6, roughness: 0.2 });
  private shardGlow!: THREE.SpriteMaterial;
  private portalGeometry = new THREE.TorusGeometry(R - 0.35, 0.16, 10, 72);
  private portalVeil = new THREE.CircleGeometry(R - 0.4, 64);
  private lineColor = new THREE.Color(SECTORS[0].line);
  private bgColor = new THREE.Color(SECTORS[0].bg);
  private targetLine = new THREE.Color(SECTORS[0].line);
  private targetBg = new THREE.Color(SECTORS[0].bg);
  private reducedMotion = prefersReducedMotion();

  private generator = createGenerator();
  private state: 'idle' | 'running' | 'paused' | 'dying' | 'over' = 'idle';
  private angle = -Math.PI / 2;
  private cameraAngle = -Math.PI / 2;
  private turnVelocity = 0;
  private dragTurn = 0;
  private phase: Phase = 0;
  private speed = 24;
  private distance = 0;
  private shards = 0;
  private charges = 1;
  private sector = 1;
  private spawnCursor = 0;
  private dyingTime = 0;
  private shake = 0;
  private flash = 0;
  private hudTimer = 0;

  static create(host: HTMLElement): PortalDash | null {
    const stage = createStage(host, { fov: 72, far: 260 });
    return stage ? new PortalDash(host, stage) : null;
  }

  private constructor(host: HTMLElement, stage: Stage) {
    this.stage = stage;
    this.buildScene();
    trackPointer(host, {
      drag: dx => { if (this.state === 'running') this.dragTurn += dx * 0.011; },
      tap: () => { if (this.state === 'running') this.flip(); },
    });
    this.reset();
    // Attract mode: the tunnel keeps flowing behind the start screen.
    this.loop.start();
  }

  get status() { return this.state; }

  private buildScene(): void {
    const { scene } = this.stage;
    scene.background = this.bgColor;
    scene.fog = new THREE.Fog(this.bgColor, 40, 200);

    const tunnelGeometry = new THREE.CylinderGeometry(R + 0.02, R + 0.02, TUNNEL_LENGTH, 64, 1, true);
    tunnelGeometry.rotateX(Math.PI / 2);
    const material = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      uniforms: { uOffset: { value: 0 }, uLine: { value: this.lineColor }, uBg: { value: this.bgColor }, uFlash: { value: 0 } },
      vertexShader: /* glsl */`
        varying vec2 vUv; varying float vDepth;
        void main() {
          vUv = uv;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          vDepth = -mv.z;
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: /* glsl */`
        uniform float uOffset; uniform vec3 uLine; uniform vec3 uBg; uniform float uFlash;
        varying vec2 vUv; varying float vDepth;
        float grid(float v, float width) { float f = abs(fract(v) - 0.5); return smoothstep(0.5 - width, 0.5, f); }
        void main() {
          float around = vUv.x * 32.0;
          float along = vUv.y * 80.0 + uOffset;
          float lines = max(grid(around, 0.035), grid(along, 0.05));
          float pulse = smoothstep(0.9, 1.0, fract(along * 0.125));
          vec3 base = uBg * 1.8 + uLine * 0.05;
          vec3 color = base + uLine * (lines * 0.85 + pulse * 0.35);
          float fade = smoothstep(150.0, 10.0, vDepth);
          color = mix(uBg, color, fade) + uFlash * vec3(1.0);
          gl_FragColor = vec4(color, 1.0);
        }`,
    });
    this.tunnel = new THREE.Mesh(tunnelGeometry, material);
    this.tunnel.position.z = -TUNNEL_LENGTH / 2 + 12;
    scene.add(this.tunnel);

    scene.add(new THREE.HemisphereLight(0xbfd8ff, 0x10061a, 0.9));
    scene.add(this.light);

    for (const color of PHASE_COLORS) {
      const c = new THREE.Color(color);
      this.solidMats.push(new THREE.MeshStandardMaterial({ color: c.clone().multiplyScalar(0.25), emissive: c, emissiveIntensity: 0.55, roughness: 0.35, metalness: 0.3 }));
      this.ghostMats.push(new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.1, depthWrite: false }));
      this.edgeSolid.push(new THREE.LineBasicMaterial({ color: c.clone().lerp(new THREE.Color(0xffffff), 0.45) }));
      this.edgeGhost.push(new THREE.LineBasicMaterial({ color: c, transparent: true, opacity: 0.45 }));
    }
    this.shardGlow = new THREE.SpriteMaterial({ map: this.glow, color: 0xfff1a8, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true });

    const hull = new THREE.ConeGeometry(0.42, 1.5, 4, 1);
    hull.rotateX(-Math.PI / 2);
    hull.rotateZ(Math.PI / 4);
    hull.scale(1.5, 0.42, 1);
    this.shipBody = new THREE.Mesh(hull, new THREE.MeshStandardMaterial({ color: 0x111827, emissive: PHASE_COLORS[0], emissiveIntensity: 0.9, roughness: 0.25, metalness: 0.6 }));
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.32, 0.6), this.shipBody.material);
    fin.position.set(0, 0.16, 0.35);
    this.shipGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.glow, color: PHASE_COLORS[0], blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
    this.shipGlow.scale.set(2.4, 2.4, 1);
    this.shipGlow.position.z = 0.6;
    this.ship.add(this.shipBody, fin, this.shipGlow);
    scene.add(this.ship);

    // Speed dust: points spread through the tube that stream towards the camera.
    const dustCount = 420;
    const dustPositions = new Float32Array(dustCount * 3);
    for (let i = 0; i < dustCount; i++) {
      const a = Math.random() * TAU;
      const r = Math.sqrt(Math.random()) * (R - 0.4);
      dustPositions.set([Math.cos(a) * r, Math.sin(a) * r, -Math.random() * 160 + 8], i * 3);
    }
    const dustGeometry = new THREE.BufferGeometry();
    dustGeometry.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));
    this.dust = new THREE.Points(dustGeometry, new THREE.PointsMaterial({ size: 0.09, color: 0xcfe8ff, transparent: true, opacity: 0.7, depthWrite: false }));
    scene.add(this.dust);

    const burstCount = 160;
    const burstGeometry = new THREE.BufferGeometry();
    burstGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(burstCount * 3), 3));
    this.burstVelocity = new Float32Array(burstCount * 3);
    this.burst = new THREE.Points(burstGeometry, new THREE.PointsMaterial({ size: 0.22, map: this.glow, color: 0xffffff, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false }));
    this.burst.visible = false;
    scene.add(this.burst);
  }

  private arcGeometry(span: number) {
    const key = span.toFixed(3);
    let entry = this.geometryCache.get(key);
    if (!entry) {
      const solid = new THREE.ExtrudeGeometry(arcShape(span, R - 0.05, R - 1.75), {
        depth: OBSTACLE_DEPTH, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.06, bevelSegments: 1,
        curveSegments: Math.max(8, Math.round(span * 14)),
      });
      solid.translate(0, 0, -OBSTACLE_DEPTH / 2);
      entry = { solid, edges: new THREE.EdgesGeometry(solid, 35) };
      this.geometryCache.set(key, entry);
    }
    return entry;
  }

  private spawnRow(): void {
    const row = nextRow(this.generator, Math.max(this.speed, 20), Math.random);
    const z = -this.spawnCursor;
    for (const piece of row.pieces) {
      const group = new THREE.Group();
      if (piece.kind === 'arc') {
        const { solid, edges } = this.arcGeometry(piece.span);
        group.add(new THREE.Mesh(solid, this.solidMats[piece.phase]), new THREE.LineSegments(edges, this.edgeSolid[piece.phase]));
        const angle = arcAngleAt(piece, z);
        group.rotation.z = angle;
        this.place(group, z, { ...piece, angle });
      } else if (piece.kind === 'shard') {
        const glow = new THREE.Sprite(this.shardGlow);
        glow.scale.set(1.4, 1.4, 1);
        group.add(new THREE.Mesh(this.shardGeometry, this.shardMaterial), glow);
        group.position.set(Math.cos(piece.angle) * (R - 0.9), Math.sin(piece.angle) * (R - 0.9), 0);
        this.place(group, z + piece.offset, { kind: 'shard', angle: piece.angle });
      } else {
        const ring = new THREE.Mesh(this.portalGeometry, new THREE.MeshBasicMaterial({ color: 0xffffff }));
        const veil = new THREE.Mesh(this.portalVeil, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.08, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
        group.add(ring, veil);
        this.place(group, z, piece);
      }
    }
    this.applyPhaseMaterials();
    this.spawnCursor += row.spacing;
  }

  private place(object: THREE.Object3D, z: number, piece: LivePiece): void {
    object.position.z = z;
    this.stage.scene.add(object);
    this.live.push({ object, z, piece });
  }

  private applyPhaseMaterials(): void {
    for (const item of this.live) {
      if (item.piece.kind !== 'arc') continue;
      const arc = item.piece;
      const solid = isSolid(arc, this.phase);
      const [mesh, edges] = item.object.children as [THREE.Mesh, THREE.LineSegments];
      mesh.material = solid ? this.solidMats[arc.phase] : this.ghostMats[arc.phase];
      edges.material = solid ? this.edgeSolid[arc.phase] : this.edgeGhost[arc.phase];
    }
    const color = PHASE_COLORS[this.phase];
    this.shipBody.material.emissive.set(color);
    (this.shipGlow.material as THREE.SpriteMaterial).color.set(color);
    this.light.color.set(color);
  }

  reset(): void {
    for (const item of this.live) this.stage.scene.remove(item.object);
    this.live = [];
    this.generator = createGenerator();
    this.angle = this.cameraAngle = -Math.PI / 2;
    this.turnVelocity = this.dragTurn = 0;
    this.phase = 0;
    this.speed = 24;
    this.distance = 0;
    this.shards = 0;
    this.charges = 1;
    this.spawnCursor = 34;
    this.dyingTime = 0;
    this.shake = 0;
    this.burst.visible = false;
    this.ship.visible = true;
    this.setSector(1, true);
    while (this.spawnCursor < SPAWN_AHEAD) this.spawnRow();
    this.applyPhaseMaterials();
    this.emitHud();
  }

  start(): void {
    this.reset();
    this.keys.clear();
    this.state = 'running';
    this.loop.start();
  }

  pause(): void { if (this.state === 'running') this.state = 'paused'; }
  resume(): void { if (this.state === 'paused') { this.keys.clear(); this.state = 'running'; } }

  flip(): void {
    if (this.state !== 'running') return;
    if (this.charges < 1) { this.onEvent('denied'); return; }
    this.charges -= 1;
    this.setPhase((1 - this.phase) as Phase);
    this.onEvent('flip');
    this.emitHud();
  }

  private setPhase(phase: Phase): void {
    this.phase = phase;
    this.flash = 0.25;
    this.applyPhaseMaterials();
  }

  private setSector(sector: number, instant = false): void {
    this.sector = sector;
    const palette = SECTORS[(sector - 1) % SECTORS.length];
    this.targetLine.set(palette.line);
    this.targetBg.set(palette.bg);
    if (instant) { this.lineColor.copy(this.targetLine); this.bgColor.copy(this.targetBg); }
  }

  private frame(dt: number, t: number): void {
    const running = this.state === 'running';
    const dying = this.state === 'dying';
    const simDt = dying ? dt * 0.25 : running ? dt : this.state === 'idle' ? dt * 0.6 : 0;

    if (running) this.steer(dt);
    if (running && this.keys.consume('Space', 'ArrowUp', 'KeyW')) this.flip();

    if (simDt > 0) {
      if (running) this.speed = Math.min(62, this.speed + dt * 0.55);
      const travel = this.speed * simDt;
      if (running) this.distance += travel;
      this.spawnCursor -= travel;
      this.advance(travel, simDt, running);
      while (this.spawnCursor < SPAWN_AHEAD) this.spawnRow();
      this.tunnel.material.uniforms.uOffset.value -= travel * (80 / TUNNEL_LENGTH);
      this.moveDust(travel);
    }

    if (dying) {
      this.dyingTime += dt;
      this.updateBurst(dt);
      if (this.dyingTime > 1.1) {
        this.state = 'over';
        this.onOver({ distance: Math.floor(this.distance), shards: this.shards, sector: this.sector });
      }
    }

    // Smoothing runs in every state, so pause and game-over keep a live but frozen frame.
    this.lineColor.lerp(this.targetLine, damp(2.5, dt));
    this.bgColor.lerp(this.targetBg, damp(2.5, dt));
    this.flash = Math.max(0, this.flash - dt * 1.6);
    this.tunnel.material.uniforms.uFlash.value = this.flash * (this.reducedMotion ? 0.12 : 0.35);
    this.shake = Math.max(0, this.shake - dt * 2.5);
    if (this.state === 'idle') this.angle = wrap(this.angle + dt * 0.25);
    this.updateShip(t);
    this.updateCamera(dt);
    this.stage.render();

    this.hudTimer -= dt;
    if (running && this.hudTimer <= 0) { this.hudTimer = 0.1; this.emitHud(); }
  }

  private steer(dt: number): void {
    const input = (this.keys.isDown('ArrowRight', 'KeyD') ? 1 : 0) - (this.keys.isDown('ArrowLeft', 'KeyA') ? 1 : 0);
    this.turnVelocity = lerp(this.turnVelocity, input * TURN_SPEED, damp(14, dt));
    const dragStep = clamp(this.dragTurn, -TURN_SPEED * dt * 2.2, TURN_SPEED * dt * 2.2);
    this.dragTurn -= dragStep;
    this.angle = wrap(this.angle + this.turnVelocity * dt + dragStep);
  }

  private advance(travel: number, dt: number, running: boolean): void {
    const remaining: Live[] = [];
    for (const item of this.live) {
      const before = item.z;
      item.z += travel;
      item.object.position.z = item.z;
      const piece = item.piece;
      if (piece.kind === 'arc' && piece.spin) {
        piece.angle = wrap(piece.angle + piece.spin * travel);
        item.object.rotation.z = piece.angle;
      }
      if (piece.kind === 'shard') {
        item.object.children[0].rotation.y += dt * 4;
        item.object.children[0].rotation.x += dt * 2;
      }
      if (running && !item.done) this.interact(item, before);
      if (item.z > 14) this.stage.scene.remove(item.object);
      else remaining.push(item);
    }
    this.live = remaining;
  }

  private interact(item: Live, before: number): void {
    if (this.state !== 'running') return;
    const piece = item.piece;
    const reach = OBSTACLE_DEPTH / 2 + 0.45;
    if (piece.kind === 'arc') {
      // Swept test: the block's span this frame [before, z] overlaps the ship's hull [-reach, reach].
      if (item.z > -reach && before < reach && isSolid(piece, this.phase) && overlaps(this.angle, piece.angle, piece.span)) this.crash();
      else if (before > reach) item.done = true;
    } else if (piece.kind === 'shard') {
      if (item.z > -0.9 && before < 0.9 && Math.abs(wrap(this.angle - piece.angle)) < 0.3) {
        item.done = true;
        item.object.visible = false;
        this.shards += 1;
        this.onEvent('shard');
        if (this.shards % SHARDS_PER_CHARGE === 0 && this.charges < MAX_CHARGES) { this.charges += 1; this.onEvent('charge'); }
      }
    } else if (before < 0 && item.z >= 0) {
      item.done = true;
      const next = (1 - this.phase) as Phase;
      // Closed rings ahead take the colour this portal gives, even after manual flips. setPhase repaints them.
      syncRings(this.live.filter(other => other.z < item.z).map(other => other.piece), next);
      this.setPhase(next);
      this.setSector(this.sector + 1);
      this.speed += 1.5;
      this.onEvent('portal');
      this.onSector(this.sector);
    }
  }

  private crash(): void {
    this.state = 'dying';
    this.dyingTime = 0;
    this.shake = this.reducedMotion ? 0 : 1;
    this.flash = 0.8;
    this.ship.visible = false;
    this.onEvent('crash');
    const positions = this.burst.geometry.getAttribute('position') as THREE.BufferAttribute;
    for (let i = 0; i < positions.count; i++) {
      positions.setXYZ(i, this.ship.position.x, this.ship.position.y, 0);
      const a = Math.random() * TAU;
      const b = Math.acos(Math.random() * 2 - 1);
      const s = 6 + Math.random() * 14;
      this.burstVelocity.set([Math.sin(b) * Math.cos(a) * s, Math.sin(b) * Math.sin(a) * s, Math.cos(b) * s], i * 3);
    }
    positions.needsUpdate = true;
    (this.burst.material as THREE.PointsMaterial).color.set(PHASE_COLORS[this.phase]);
    this.burst.visible = true;
    this.emitHud();
  }

  private updateBurst(dt: number): void {
    const positions = this.burst.geometry.getAttribute('position') as THREE.BufferAttribute;
    const v = this.burstVelocity;
    for (let i = 0; i < positions.count; i++) {
      positions.setXYZ(i, positions.getX(i) + v[i * 3] * dt, positions.getY(i) + v[i * 3 + 1] * dt, positions.getZ(i) + v[i * 3 + 2] * dt);
      v[i * 3] *= 0.96; v[i * 3 + 1] *= 0.96; v[i * 3 + 2] *= 0.96;
    }
    positions.needsUpdate = true;
  }

  private moveDust(travel: number): void {
    const positions = this.dust.geometry.getAttribute('position') as THREE.BufferAttribute;
    for (let i = 0; i < positions.count; i++) {
      let z = positions.getZ(i) + travel * 1.15;
      if (z > 8) z -= 168;
      positions.setZ(i, z);
    }
    positions.needsUpdate = true;
  }

  private updateShip(t: number): void {
    const r = R - 0.62 + Math.sin(t * 6) * 0.04;
    this.ship.position.set(Math.cos(this.angle) * r, Math.sin(this.angle) * r, 0);
    this.ship.rotation.set(0, 0, this.angle + Math.PI / 2);
    this.ship.rotateZ(-this.turnVelocity * 0.09);
    this.light.position.set(Math.cos(this.angle) * (R - 2), Math.sin(this.angle) * (R - 2), -1.5);
  }

  private updateCamera(dt: number): void {
    const { camera } = this.stage;
    this.cameraAngle = wrap(this.cameraAngle + wrap(this.angle - this.cameraAngle) * damp(7, dt));
    const a = this.cameraAngle;
    const shakeX = (Math.random() - 0.5) * this.shake * 0.6;
    const shakeY = (Math.random() - 0.5) * this.shake * 0.6;
    const fov = 70 + clamp((this.speed - 24) * 0.35, 0, 14);
    if (Math.abs(camera.fov - fov) > 0.05) { camera.fov = lerp(camera.fov, fov, damp(3, dt)); camera.updateProjectionMatrix(); }
    camera.position.set(Math.cos(a) * (R - 3.1) + shakeX, Math.sin(a) * (R - 3.1) + shakeY, 4.6);
    camera.up.set(-Math.cos(a), -Math.sin(a), 0);
    camera.lookAt(Math.cos(a) * (R - 1.6), Math.sin(a) * (R - 1.6), -12);
  }

  private emitHud(): void {
    this.onHud({ distance: Math.floor(this.distance), shards: this.shards, charges: this.charges, speed: this.speed, phase: this.phase, sector: this.sector });
  }
}
