/** Procedural art for Beastfall Trials: materials, live tubes, sparks, floor tells and the dusk cliff-top arena. */
import { THREE } from '../../../shared/three/kit';
import { EDGE_X, WALL_X } from './logic';

export const GOLD = new THREE.Color(0xffc247);
export const CRIMSON = new THREE.Color(0xff2d4e);
export const SONG = new THREE.Color(0x6ff0ff);
export const EMBER = new THREE.Color(0xff7a2a);
export const SUN = new THREE.Color(0xffb27a);

export function glowTexture(): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.22, 'rgba(255,255,255,0.6)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 64, 64);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/** Soft cloud puffs for the sky band. */
function cloudTexture(): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  for (let i = 0; i < 26; i++) {
    const x = 20 + Math.random() * 216;
    const y = 26 + Math.random() * 18;
    const r = 10 + Math.random() * 22;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, 'rgba(255,255,255,0.35)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export interface RimUniforms { uRim: { value: THREE.Color }; uRimStrength: { value: number }; uFlash: { value: THREE.Color }; }

/**
 * MeshStandardMaterial with a warm Fresnel rim (the low sun behind the arena) and a flash colour added to the
 * emissive term for hit flashes and telegraph glows.
 */
export function rimMaterial(params: THREE.MeshStandardMaterialParameters, rim: THREE.ColorRepresentation = SUN, strength = 0.85): THREE.MeshStandardMaterial {
  const material = new THREE.MeshStandardMaterial(params);
  const uniforms: RimUniforms = { uRim: { value: new THREE.Color(rim) }, uRimStrength: { value: strength }, uFlash: { value: new THREE.Color(0, 0, 0) } };
  material.userData.rim = uniforms;
  material.onBeforeCompile = shader => {
    Object.assign(shader.uniforms, uniforms);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform vec3 uRim;\nuniform float uRimStrength;\nuniform vec3 uFlash;')
      .replace('#include <emissivemap_fragment>', [
        '#include <emissivemap_fragment>',
        'float rimF = pow(1.0 - clamp(dot(normal, normalize(vViewPosition)), 0.0, 1.0), 2.6);',
        'totalEmissiveRadiance += uRim * rimF * uRimStrength + uFlash;',
      ].join('\n'));
  };
  material.customProgramCacheKey = () => 'afg-rim';
  return material;
}

export const rimOf = (material: THREE.Material) => material.userData.rim as RimUniforms;

/** A tube whose spine is re-shaped every frame (necks, tails, tentacles) without rebuilding geometry. */
export class LiveTube {
  readonly geometry = new THREE.BufferGeometry();
  private readonly curve = new THREE.CatmullRomCurve3([new THREE.Vector3(), new THREE.Vector3(0, 1, 0)], false, 'catmullrom', 0.5);
  private readonly samples: THREE.Vector3[];
  private readonly positions: Float32Array;
  private readonly normals: Float32Array;
  private readonly t = new THREE.Vector3();
  private readonly n = new THREE.Vector3();
  private readonly b = new THREE.Vector3();
  private readonly z = new THREE.Vector3(0, 0, 1);

  constructor(readonly segments = 18, readonly radial = 8) {
    const count = (segments + 1) * (radial + 1);
    this.positions = new Float32Array(count * 3);
    this.normals = new Float32Array(count * 3);
    this.samples = Array.from({ length: segments + 1 }, () => new THREE.Vector3());
    const uvs = new Float32Array(count * 2);
    const index: number[] = [];
    for (let i = 0; i <= segments; i++) {
      for (let j = 0; j <= radial; j++) {
        uvs[(i * (radial + 1) + j) * 2] = i / segments;
        uvs[(i * (radial + 1) + j) * 2 + 1] = j / radial;
        if (i < segments && j < radial) {
          const a = i * (radial + 1) + j;
          const b = a + radial + 1;
          index.push(a, b, a + 1, b, b + 1, a + 1);
        }
      }
    }
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3).setUsage(THREE.DynamicDrawUsage));
    this.geometry.setAttribute('normal', new THREE.BufferAttribute(this.normals, 3).setUsage(THREE.DynamicDrawUsage));
    this.geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    this.geometry.setIndex(index);
  }

  mesh(material: THREE.Material): THREE.Mesh {
    const mesh = new THREE.Mesh(this.geometry, material);
    mesh.frustumCulled = false;
    return mesh;
  }

  update(points: THREE.Vector3[], radius: (u: number) => number): void {
    this.curve.points = points;
    const { segments, radial, samples } = this;
    for (let i = 0; i <= segments; i++) this.curve.getPoint(i / segments, samples[i]);
    for (let i = 0; i <= segments; i++) {
      const a = samples[Math.max(0, i - 1)];
      const c = samples[Math.min(segments, i + 1)];
      this.t.subVectors(c, a);
      if (this.t.lengthSq() < 1e-10) this.t.set(0, 1, 0);
      this.t.normalize();
      this.n.crossVectors(this.t, this.z);
      if (this.n.lengthSq() < 1e-6) this.n.set(1, 0, 0);
      this.n.normalize();
      this.b.crossVectors(this.t, this.n);
      const r = radius(i / segments);
      const p = samples[i];
      for (let j = 0; j <= radial; j++) {
        const angle = (j / radial) * Math.PI * 2;
        const cx = Math.cos(angle);
        const sx = Math.sin(angle);
        const nx = this.n.x * cx + this.b.x * sx;
        const ny = this.n.y * cx + this.b.y * sx;
        const nz = this.n.z * cx + this.b.z * sx;
        const k = (i * (radial + 1) + j) * 3;
        this.positions[k] = p.x + nx * r;
        this.positions[k + 1] = p.y + ny * r;
        this.positions[k + 2] = p.z + nz * r;
        this.normals[k] = nx;
        this.normals[k + 1] = ny;
        this.normals[k + 2] = nz;
      }
    }
    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.normal.needsUpdate = true;
  }
}

/** One pooled point cloud for sparks, embers, dust and spray. Additive, one draw call. */
export class Sparks {
  readonly points: THREE.Points;
  private readonly max: number;
  private readonly pos: Float32Array;
  private readonly col: Float32Array;
  private readonly size: Float32Array;
  private readonly alpha: Float32Array;
  private readonly vel: Float32Array;
  private readonly life: Float32Array;
  private readonly age: Float32Array;
  private readonly grav: Float32Array;
  private readonly base: Float32Array;
  private cursor = 0;
  private readonly material: THREE.ShaderMaterial;

  constructor(max: number, map: THREE.Texture) {
    this.max = max;
    this.pos = new Float32Array(max * 3);
    this.col = new Float32Array(max * 3);
    this.size = new Float32Array(max);
    this.alpha = new Float32Array(max);
    this.vel = new Float32Array(max * 3);
    this.life = new Float32Array(max);
    this.age = new Float32Array(max).fill(1);
    this.grav = new Float32Array(max);
    this.base = new Float32Array(max);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    geometry.setAttribute('color', new THREE.BufferAttribute(this.col, 3).setUsage(THREE.DynamicDrawUsage));
    geometry.setAttribute('aSize', new THREE.BufferAttribute(this.size, 1).setUsage(THREE.DynamicDrawUsage));
    geometry.setAttribute('aAlpha', new THREE.BufferAttribute(this.alpha, 1).setUsage(THREE.DynamicDrawUsage));
    this.material = new THREE.ShaderMaterial({
      uniforms: { uMap: { value: map }, uScale: { value: 400 } },
      vertexShader: /* glsl */`
        attribute float aSize; attribute float aAlpha; attribute vec3 color;
        varying vec3 vColor; varying float vAlpha;
        uniform float uScale;
        void main() {
          vColor = color; vAlpha = aAlpha;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = aSize * uScale / max(0.1, -mv.z);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: /* glsl */`
        uniform sampler2D uMap; varying vec3 vColor; varying float vAlpha;
        void main() {
          vec4 tex = texture2D(uMap, gl_PointCoord);
          gl_FragColor = vec4(vColor * tex.rgb * vAlpha, tex.a * vAlpha);
        }`,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.points = new THREE.Points(geometry, this.material);
    this.points.frustumCulled = false;
  }

  setScale(scale: number): void { this.material.uniforms.uScale.value = scale; }

  emit(x: number, y: number, z: number, count: number, o: { color: THREE.Color; speed: number; up?: number; spread?: number; life?: number; size?: number; gravity?: number; dirX?: number; jitter?: number }): void {
    for (let n = 0; n < count; n++) {
      const i = this.cursor;
      this.cursor = (this.cursor + 1) % this.max;
      const a = Math.random() * Math.PI * 2;
      const spread = o.spread ?? 1;
      const s = o.speed * (0.35 + Math.random() * 0.65);
      const j = o.jitter ?? 0.1;
      this.pos[i * 3] = x + (Math.random() - 0.5) * j;
      this.pos[i * 3 + 1] = y + (Math.random() - 0.5) * j;
      this.pos[i * 3 + 2] = z + (Math.random() - 0.5) * j;
      this.vel[i * 3] = (Math.cos(a) * spread + (o.dirX ?? 0)) * s;
      this.vel[i * 3 + 1] = (Math.sin(a) * spread + (o.up ?? 0)) * s;
      this.vel[i * 3 + 2] = (Math.random() - 0.5) * spread * s * 0.8;
      const tint = 0.75 + Math.random() * 0.25;
      this.col[i * 3] = o.color.r * tint;
      this.col[i * 3 + 1] = o.color.g * tint;
      this.col[i * 3 + 2] = o.color.b * tint;
      this.life[i] = (o.life ?? 0.6) * (0.6 + Math.random() * 0.6);
      this.age[i] = 0;
      this.base[i] = (o.size ?? 0.25) * (0.6 + Math.random() * 0.8);
      this.grav[i] = o.gravity ?? 6;
    }
  }

  update(dt: number): void {
    for (let i = 0; i < this.max; i++) {
      if (this.age[i] >= 1) { if (this.alpha[i] !== 0) { this.alpha[i] = 0; this.size[i] = 0; } continue; }
      this.age[i] = Math.min(1, this.age[i] + dt / this.life[i]);
      const drag = Math.exp(-2.2 * dt);
      this.vel[i * 3] *= drag;
      this.vel[i * 3 + 1] = this.vel[i * 3 + 1] * drag - this.grav[i] * dt;
      this.vel[i * 3 + 2] *= drag;
      this.pos[i * 3] += this.vel[i * 3] * dt;
      this.pos[i * 3 + 1] += this.vel[i * 3 + 1] * dt;
      this.pos[i * 3 + 2] += this.vel[i * 3 + 2] * dt;
      const k = this.age[i];
      this.alpha[i] = (1 - k) * (1 - k);
      this.size[i] = this.base[i] * (1 - 0.5 * k);
    }
    const g = this.points.geometry;
    g.attributes.position.needsUpdate = true;
    g.attributes.color.needsUpdate = true;
    g.attributes.aSize.needsUpdate = true;
    g.attributes.aAlpha.needsUpdate = true;
  }

  clear(): void { this.age.fill(1); }
}

/** Floor tells: a strip or disc on the arena floor that fills as the attack winds up. */
export class Zones {
  private readonly meshes: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>[] = [];
  private used = 0;
  constructor(scene: THREE.Scene, count: number) {
    const geometry = new THREE.PlaneGeometry(1, 1);
    geometry.rotateX(-Math.PI / 2);
    for (let i = 0; i < count; i++) {
      const material = new THREE.ShaderMaterial({
        uniforms: { uColor: { value: new THREE.Color() }, uProgress: { value: 0 }, uTime: { value: 0 }, uShape: { value: 0 }, uActive: { value: 0 } },
        vertexShader: /* glsl */`varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
        fragmentShader: /* glsl */`
          uniform vec3 uColor; uniform float uProgress; uniform float uTime; uniform float uShape; uniform float uActive;
          varying vec2 vUv;
          void main() {
            vec2 p = vUv * 2.0 - 1.0;
            float disc = length(p);
            float inside = uShape > 0.5 ? 1.0 - smoothstep(0.96, 1.0, disc) : 1.0;
            float across = uShape > 0.5 ? disc : abs(p.y);
            float body = 1.0 - smoothstep(0.55, 1.0, across);
            float edge = uShape > 0.5 ? smoothstep(0.72, 0.95, disc) : smoothstep(0.82, 1.0, abs(p.x));
            float ring = uShape > 0.5 ? smoothstep(0.08, 0.0, abs(disc - (1.0 - uProgress))) : smoothstep(0.08, 0.0, abs(abs(p.x) - (1.0 - uProgress)));
            float stripes = 0.5 + 0.5 * sin((p.x * 5.0 + p.y * 2.0 - uTime * 2.4) * 3.14159);
            float fill = body * (0.12 + 0.42 * uProgress * uProgress) * (0.7 + 0.3 * stripes);
            float a = (fill + (edge * body) * (0.35 + 0.5 * uProgress) + ring * body * 0.8) * inside;
            a = mix(a, body * inside * 0.9, uActive);
            gl_FragColor = vec4(uColor * (1.0 + uActive * 0.8), clamp(a, 0.0, 1.0));
          }`,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.y = 0.03;
      mesh.renderOrder = 2;
      mesh.visible = false;
      scene.add(mesh);
      this.meshes.push(mesh);
    }
  }
  begin(): void { this.used = 0; }
  show(x0: number, x1: number, z: number, depth: number, color: THREE.Color, progress: number, time: number, disc: boolean, active: boolean): void {
    const mesh = this.meshes[this.used++];
    if (!mesh) return;
    mesh.visible = true;
    mesh.position.set((x0 + x1) / 2, 0.03, z);
    mesh.scale.set(Math.max(0.1, x1 - x0), 1, depth);
    const u = mesh.material.uniforms;
    u.uColor.value.copy(color);
    u.uProgress.value = progress;
    u.uTime.value = time;
    u.uShape.value = disc ? 1 : 0;
    u.uActive.value = active ? 1 : 0;
  }
  end(): void { for (let i = this.used; i < this.meshes.length; i++) this.meshes[i].visible = false; }
}

/** A tiny value-noise for rock jitter (deterministic, no allocations). */
function hash(x: number, y: number, z: number): number {
  const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453;
  return s - Math.floor(s);
}

export interface Environment {
  update(t: number): void;
  braziers: THREE.Vector3[];
}

/** Sky dome, sea, the cliff-top arena, ruins, braziers and distant sea stacks. About a dozen draw calls. */
export function buildEnvironment(scene: THREE.Scene, glow: THREE.Texture): Environment {
  const sunDir = new THREE.Vector3(0.62, 0.08, -0.78).normalize();
  const skyColors = { top: new THREE.Color(0x14123a), mid: new THREE.Color(0x5b2a66), low: new THREE.Color(0xff8a52), sun: new THREE.Color(0xffd6a0) };
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(320, 32, 16),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: { uTop: { value: skyColors.top }, uMid: { value: skyColors.mid }, uLow: { value: skyColors.low }, uSun: { value: skyColors.sun }, uSunDir: { value: sunDir } },
      vertexShader: /* glsl */`varying vec3 vDir; void main() { vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: /* glsl */`
        uniform vec3 uTop; uniform vec3 uMid; uniform vec3 uLow; uniform vec3 uSun; uniform vec3 uSunDir;
        varying vec3 vDir;
        void main() {
          vec3 d = normalize(vDir);
          float h = d.y;
          vec3 c = mix(uMid, uTop, smoothstep(0.08, 0.62, h));
          c = mix(uLow, c, smoothstep(-0.04, 0.2, h));
          c = mix(c, uLow * 0.55, smoothstep(0.0, -0.25, h));
          float s = max(dot(d, uSunDir), 0.0);
          c += uSun * (pow(s, 900.0) * 3.0 + pow(s, 24.0) * 0.45 + pow(s, 4.0) * 0.18);
          gl_FragColor = vec4(c, 1.0);
        }`,
    }),
  );
  sky.renderOrder = -10;
  scene.add(sky);

  // Sea far below, with a sun glint path.
  const sea = new THREE.Mesh(
    new THREE.PlaneGeometry(900, 900, 1, 1).rotateX(-Math.PI / 2),
    new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uSunDir: { value: sunDir }, uDeep: { value: new THREE.Color(0x1a1035) }, uFar: { value: new THREE.Color(0xc0587a) }, uSun: { value: skyColors.sun } },
      vertexShader: /* glsl */`varying vec3 vWorld; void main() { vec4 w = modelMatrix * vec4(position, 1.0); vWorld = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
      fragmentShader: /* glsl */`
        uniform float uTime; uniform vec3 uSunDir; uniform vec3 uDeep; uniform vec3 uFar; uniform vec3 uSun;
        varying vec3 vWorld;
        void main() {
          vec3 toEye = normalize(cameraPosition - vWorld);
          float ripple = sin(vWorld.x * 0.35 + uTime * 0.6) * 0.5 + sin(vWorld.z * 0.5 - uTime * 0.45) * 0.5 + sin((vWorld.x + vWorld.z) * 1.3 + uTime) * 0.25;
          vec3 n = normalize(vec3(ripple * 0.06, 1.0, ripple * 0.04));
          vec3 r = reflect(-toEye, n);
          float glint = pow(max(dot(r, uSunDir), 0.0), 60.0);
          float far = smoothstep(40.0, 320.0, length(vWorld.xz - cameraPosition.xz));
          vec3 c = mix(uDeep, uFar, far * 0.85) + uSun * glint * 1.4;
          gl_FragColor = vec4(c, 1.0);
        }`,
    }),
  );
  sea.position.set(60, -34, -120);
  scene.add(sea);

  // Distant sea stacks and a ridge, merged and lost in the haze.
  const farGeometries: THREE.BufferGeometry[] = [];
  const stacks: [number, number, number, number][] = [[34, -60, 7, 30], [58, -95, 10, 42], [22, -140, 14, 55], [90, -150, 12, 36], [-30, -120, 18, 60], [120, -90, 8, 26]];
  for (const [x, z, r, h] of stacks) {
    const g = new THREE.CylinderGeometry(r * 0.55, r, h, 7, 4);
    const p = g.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i++) p.setXYZ(i, p.getX(i) * (0.85 + hash(i, x, z) * 0.3), p.getY(i), p.getZ(i) * (0.85 + hash(z, i, x) * 0.3));
    g.translate(x, -34 + h / 2, z);
    farGeometries.push(g.toNonIndexed());
  }
  const far = new THREE.Mesh(mergeGeometries(farGeometries), new THREE.MeshLambertMaterial({ color: 0x3b2440, flatShading: true }));
  scene.add(far);

  // The arena: one big cliff block. The top is flat (y = 0) up to the edge; the faces are jittered rock.
  const width = 26;
  const height = 40;
  const depth = 12;
  const cliffGeometry = new THREE.BoxGeometry(width, height, depth, 52, 40, 12);
  const pos = cliffGeometry.attributes.position as THREE.BufferAttribute;
  const colors = new Float32Array(pos.count * 3);
  const moss = new THREE.Color(0x4f5a34);
  const path = new THREE.Color(0x7a6650);
  const rock = new THREE.Color(0x4a3a4a);
  const deep = new THREE.Color(0x22182a);
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const top = y > height / 2 - 0.01;
    const worldX = x + EDGE_X - width / 2;
    const worldZ = z - 2.4;
    if (!top) {
      const k = (hash(Math.round(x * 3), Math.round(y * 3), Math.round(z * 3)) - 0.5) * 0.9;
      const nearTop = y > height / 2 - 0.6;
      const scale = nearTop ? 0.25 : 1;
      if (Math.abs(x) >= width / 2 - 0.01) pos.setX(i, x + k * scale * Math.sign(x));
      if (Math.abs(z) >= depth / 2 - 0.01) pos.setZ(i, z + k * scale * Math.sign(z));
      const depthK = Math.min(1, (height / 2 - y) / 14);
      const band = 0.85 + 0.15 * Math.sin(y * 2.3 + hash(0, Math.round(y * 2), 0) * 2);
      c.copy(rock).lerp(deep, depthK).multiplyScalar(band);
      if (nearTop) c.lerp(moss, 0.6);
    } else {
      const onPath = Math.abs(worldZ) < 1.6 && worldX > WALL_X - 0.6;
      const n = hash(Math.round(worldX * 2), 0, Math.round(worldZ * 2));
      c.copy(onPath ? path : moss).multiplyScalar(0.85 + n * 0.3);
      if (onPath && Math.abs(worldZ) > 1.1) c.lerp(moss, 0.5);
    }
    colors.set([c.r, c.g, c.b], i * 3);
  }
  cliffGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  cliffGeometry.computeVertexNormals();
  const cliff = new THREE.Mesh(cliffGeometry, new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }));
  cliff.position.set(EDGE_X - width / 2, -height / 2, -2.4);
  scene.add(cliff);

  // Rocks along the lip, boulders at the wall, grass tufts: instanced.
  const rockGeometry = new THREE.DodecahedronGeometry(1, 0);
  const rockMaterial = new THREE.MeshLambertMaterial({ color: 0x5a4656, flatShading: true });
  const rocks = new THREE.InstancedMesh(rockGeometry, rockMaterial, 22);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const s = new THREE.Vector3();
  const p = new THREE.Vector3();
  const rockSpots: [number, number, number, number][] = [
    [WALL_X - 1.1, 0.9, -0.6, 1.7], [WALL_X - 1.6, 1.8, -2.4, 2.3], [WALL_X - 0.9, 0.4, 1.4, 0.9], [WALL_X - 2.6, 2.6, 0.2, 2.6],
    [EDGE_X - 0.2, -0.1, -3.4, 0.6], [EDGE_X + 0.1, -0.4, 2.4, 0.5], [EDGE_X - 0.6, 0.05, 3.1, 0.35], [EDGE_X, -0.3, -1.9, 0.4],
    [-1.6, 0.05, 3.3, 0.35], [2.4, 0.02, 3.2, 0.3], [0.6, 0.0, -3.6, 0.45], [-3.6, 0.1, -3.9, 0.6], [3.6, 0.05, -4.2, 0.5],
    [-7.8, 3.4, -4.5, 3.4], [-6.4, 1.2, -5.6, 1.6], [WALL_X - 0.4, 0.2, 2.6, 0.5],
  ];
  rockSpots.forEach(([x, y, z, r], i) => {
    e.set(hash(i, 1, 2) * 3, hash(i, 2, 3) * 3, hash(i, 3, 4) * 3);
    q.setFromEuler(e);
    s.set(r * (0.9 + hash(i, 5, 1) * 0.4), r * (0.7 + hash(i, 6, 1) * 0.4), r);
    m.compose(p.set(x, y, z), q, s);
    rocks.setMatrixAt(i, m);
  });
  rocks.count = rockSpots.length;
  scene.add(rocks);

  // Each tuft is three thin blades fanned out.
  const blades: THREE.BufferGeometry[] = [];
  for (let b = 0; b < 3; b++) {
    const height = 0.36 - Math.abs(b - 1) * 0.1;
    const blade = new THREE.ConeGeometry(0.028, height, 3, 1);
    blade.translate(0, height / 2, 0);
    blade.rotateZ((b - 1) * 0.42);
    blade.rotateY(b * 1.1);
    blades.push(blade);
  }
  const tuftGeometry = mergeGeometries(blades);
  const tufts = new THREE.InstancedMesh(tuftGeometry, new THREE.MeshLambertMaterial({ color: 0x6f7a3c }), 90);
  for (let i = 0; i < 90; i++) {
    const x = WALL_X - 0.5 + hash(i, 9, 9) * (EDGE_X - WALL_X + 0.3);
    let z = -5 + hash(9, i, 9) * 7.4;
    if (Math.abs(z) < 1.3) z += z < 0 ? -1.4 : 1.4;
    e.set((hash(i, 1, 7) - 0.5) * 0.6, hash(i, 2, 7) * 3, (hash(i, 3, 7) - 0.5) * 0.6);
    q.setFromEuler(e);
    const k = 0.6 + hash(i, 4, 7) * 0.9;
    m.compose(p.set(x, 0, z), q, s.set(k, k, k));
    tufts.setMatrixAt(i, m);
  }
  scene.add(tufts);

  // Ruined pillars behind the wall side, and a broken arch: merged.
  const ruinParts: THREE.BufferGeometry[] = [];
  const pillar = (x: number, z: number, h: number, tilt: number) => {
    const g = new THREE.CylinderGeometry(0.42, 0.5, h, 10, 1);
    g.rotateZ(tilt);
    g.translate(x, h / 2 - 0.1, z);
    ruinParts.push(g.toNonIndexed());
    const cap = new THREE.BoxGeometry(1.2, 0.3, 1.2);
    cap.rotateZ(tilt);
    cap.translate(x - Math.sin(tilt) * h, h, z);
    if (h > 3) ruinParts.push(cap.toNonIndexed());
  };
  pillar(-6.6, -3.2, 4.6, 0.02);
  pillar(-4.2, -4.6, 2.2, -0.05);
  pillar(1.2, -5.2, 3.4, 0.04);
  pillar(4.0, -4.8, 1.3, 0);
  const lintel = new THREE.BoxGeometry(3.4, 0.45, 1);
  lintel.rotateZ(-0.12);
  lintel.translate(-5.5, 4.75, -3.2);
  ruinParts.push(lintel.toNonIndexed());
  const step = new THREE.BoxGeometry(4.5, 0.25, 1.8);
  step.translate(-1.5, 0.12, -4.4);
  ruinParts.push(step.toNonIndexed());
  const ruins = new THREE.Mesh(mergeGeometries(ruinParts), new THREE.MeshLambertMaterial({ color: 0x8a7b84, flatShading: true }));
  scene.add(ruins);

  // Braziers at either side of the duelling ground.
  const braziers = [new THREE.Vector3(WALL_X + 0.2, 0, -1.9), new THREE.Vector3(EDGE_X - 1.2, 0, -2.6)];
  const bowlGeometry = new THREE.CylinderGeometry(0.42, 0.18, 0.4, 10, 1, true);
  const standGeometry = new THREE.CylinderGeometry(0.07, 0.12, 1.1, 6);
  const iron = new THREE.MeshLambertMaterial({ color: 0x2a2026 });
  const flames: THREE.Sprite[] = [];
  const lights: THREE.PointLight[] = [];
  for (const b of braziers) {
    const stand = new THREE.Mesh(standGeometry, iron);
    stand.position.set(b.x, 0.55, b.z);
    const bowl = new THREE.Mesh(bowlGeometry, iron);
    bowl.position.set(b.x, 1.2, b.z);
    const flame = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, color: 0xff9a3a, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
    flame.position.set(b.x, 1.55, b.z);
    flame.scale.set(1.1, 1.5, 1);
    const light = new THREE.PointLight(0xff8a3a, 6, 9, 1.6);
    light.position.set(b.x, 1.9, b.z + 0.4);
    scene.add(stand, bowl, flame, light);
    flames.push(flame);
    lights.push(light);
  }

  // A few cloud bands catching the sunset.
  const cloudMap = cloudTexture();
  const clouds: THREE.Mesh[] = [];
  const cloudSpots: [number, number, number, number][] = [[40, 30, -200, 160], [-60, 46, -240, 200], [130, 18, -180, 140]];
  for (const [x, y, z, w] of cloudSpots) {
    const cloud = new THREE.Mesh(new THREE.PlaneGeometry(w, w / 4), new THREE.MeshBasicMaterial({ map: cloudMap, color: 0xffb08a, transparent: true, opacity: 0.55, depthWrite: false, fog: false }));
    cloud.position.set(x, y, z);
    scene.add(cloud);
    clouds.push(cloud);
  }

  scene.fog = new THREE.Fog(0x8a4a6a, 30, 190);

  return {
    braziers,
    update(t: number) {
      (sea.material as THREE.ShaderMaterial).uniforms.uTime.value = t;
      // Slow, soft flame breathing (well under 3 Hz).
      flames.forEach((flame, i) => {
        const k = 1 + 0.08 * Math.sin(t * 2.1 + i * 1.7) + 0.05 * Math.sin(t * 3.3 + i);
        flame.scale.set(1.05 * k, 1.5 * k, 1);
        lights[i].intensity = 5.5 + 0.8 * Math.sin(t * 1.9 + i * 2.3);
      });
      clouds.forEach((cloud, i) => { cloud.position.x = cloudSpots[i][0] + Math.sin(t * 0.01 + i) * 8; });
    },
  };
}

/** Merges non-indexed geometries with position and normal (enough for the static scenery). */
export function mergeGeometries(geometries: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const flat = geometries.map(g => (g.index ? g.toNonIndexed() : g));
  let count = 0;
  for (const g of flat) count += g.attributes.position.count;
  const position = new Float32Array(count * 3);
  const normal = new Float32Array(count * 3);
  let offset = 0;
  for (const geometry of flat) {
    if (!geometry.attributes.normal) geometry.computeVertexNormals();
    position.set(geometry.attributes.position.array as Float32Array, offset * 3);
    normal.set(geometry.attributes.normal.array as Float32Array, offset * 3);
    offset += geometry.attributes.position.count;
  }
  const merged = new THREE.BufferGeometry();
  merged.setAttribute('position', new THREE.BufferAttribute(position, 3));
  merged.setAttribute('normal', new THREE.BufferAttribute(normal, 3));
  merged.computeVertexNormals();
  return merged;
}
