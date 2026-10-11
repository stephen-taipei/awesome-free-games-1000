/** Procedural art for Skyline Getaway: district palettes, shaders, merged prop geometry and the runner's rig. */
import { THREE } from '../../../shared/three/kit';
import type { DistrictKey } from './logic';

// ---------------------------------------------------------------------------------------------------------------
// Palettes

export interface Palette {
  skyTop: string; skyMid: string; skyLow: string;
  fog: string; fogNear: number; fogFar: number;
  sun: string; sunDir: [number, number, number]; sunSize: number; stars: number;
  facade: string; top: string; trim: string;
  winA: string; winB: string; winC: string; lit: number;
  neon: number; rain: number; wet: number;
  hemiSky: string; hemiGround: string; hemi: number; key: string; keyIntensity: number;
  /** The district's accent, for set-piece paint and string lights. */
  accent: string;
}

export const PALETTES: Record<DistrictKey, Palette> = {
  dusk: {
    skyTop: '#2a1f52', skyMid: '#b45a7c', skyLow: '#ffb06a', fog: '#7c4a68', fogNear: 40, fogFar: 210,
    sun: '#ffcf8a', sunDir: [-0.42, 0.07, -1], sunSize: 0.07, stars: 0.25,
    facade: '#2f2643', top: '#5a4b5e', trim: '#b49aa2', winA: '#ffd28a', winB: '#ffb35c', winC: '#fff0c8', lit: 0.34,
    neon: 0, rain: 0, wet: 0, hemiSky: '#ffd2b0', hemiGround: '#3a2440', hemi: 1.5, key: '#ffb27a', keyIntensity: 2.2, accent: '#ff9a5c',
  },
  rain: {
    skyTop: '#05050f', skyMid: '#160e2e', skyLow: '#43205a', fog: '#21173a', fogNear: 28, fogFar: 160,
    sun: '#9fb7ff', sunDir: [0.4, 0.3, -1], sunSize: 0, stars: 0,
    facade: '#18142a', top: '#2c2838', trim: '#5a5478', winA: '#ff4fd8', winB: '#3be8ff', winC: '#ffe38a', lit: 0.42,
    neon: 1, rain: 1, wet: 1, hemiSky: '#9a7bff', hemiGround: '#1a0f26', hemi: 1.3, key: '#7fdcff', keyIntensity: 1.2, accent: '#ff4fd8',
  },
  harbour: {
    skyTop: '#0d2438', skyMid: '#2e6074', skyLow: '#a8d2c8', fog: '#3a6274', fogNear: 40, fogFar: 220,
    sun: '#ffe6c0', sunDir: [0.55, 0.05, -1], sunSize: 0.06, stars: 0.1,
    facade: '#20313c', top: '#43545c', trim: '#8aa6ae', winA: '#ffe9a8', winB: '#a8e6ff', winC: '#ffffff', lit: 0.24,
    neon: 0, rain: 0, wet: 0.25, hemiSky: '#c6ecff', hemiGround: '#1b2a30', hemi: 1.5, key: '#ffe0b0', keyIntensity: 2, accent: '#ffc23d',
  },
  park: {
    skyTop: '#190b30', skyMid: '#52257a', skyLow: '#ff8fa6', fog: '#51295a', fogNear: 34, fogFar: 200,
    sun: '#ffd0e0', sunDir: [-0.2, 0.05, -1], sunSize: 0, stars: 0.7,
    facade: '#271c3a', top: '#463a5a', trim: '#a68ab8', winA: '#ffd76b', winB: '#ff7ac8', winC: '#7affd4', lit: 0.46,
    neon: 0.55, rain: 0, wet: 0, hemiSky: '#ffa6d6', hemiGround: '#24123a', hemi: 1.45, key: '#ffb0d8', keyIntensity: 1.6, accent: '#7affd4',
  },
  station: {
    skyTop: '#0e1a2c', skyMid: '#3c5678', skyLow: '#c8d6ea', fog: '#5a6c8e', fogNear: 34, fogFar: 200,
    sun: '#f4f8ff', sunDir: [0.25, 0.32, -1], sunSize: 0.025, stars: 0.35,
    facade: '#222c3a', top: '#47505e', trim: '#b2c0d2', winA: '#e8f1ff', winB: '#ffd9a0', winC: '#9fd0ff', lit: 0.3,
    neon: 0.2, rain: 0.3, wet: 0.45, hemiSky: '#d6e4ff', hemiGround: '#1d2430', hemi: 1.45, key: '#e4ecff', keyIntensity: 1.7, accent: '#ffd23d',
  },
};

/** A palette as live values that ease towards a target district. */
export class LivePalette {
  colors: Record<string, THREE.Color> = {};
  numbers: Record<string, number> = {};
  sunDir = new THREE.Vector3();
  private target: Palette;
  private targetSun = new THREE.Vector3();

  constructor(start: Palette) {
    this.target = start;
    this.snap(start);
  }

  set(palette: Palette): void {
    this.target = palette;
    this.targetSun.set(...palette.sunDir).normalize();
  }

  snap(palette: Palette): void {
    this.set(palette);
    for (const [key, value] of Object.entries(palette)) {
      // Copy into the existing colours: shader uniforms hold references to them.
      if (typeof value === 'string') (this.colors[key] ??= new THREE.Color()).set(value);
      else if (typeof value === 'number') this.numbers[key] = value;
    }
    this.sunDir.copy(this.targetSun);
  }

  update(t: number): void {
    const tmp = new THREE.Color();
    for (const [key, value] of Object.entries(this.target)) {
      if (typeof value === 'string') this.colors[key].lerp(tmp.set(value), t);
      else if (typeof value === 'number') this.numbers[key] += (value - this.numbers[key]) * t;
    }
    this.sunDir.lerp(this.targetSun, t).normalize();
  }
}

// ---------------------------------------------------------------------------------------------------------------
// Shaders

const HASH = /* glsl */`
float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
`;

/** Window-grid buildings, used for the course (layer 0) and the parallax skyline behind it (layers 0.5 and 1). */
export const BUILDING_VERTEX = /* glsl */`
attribute vec4 aInfo;
varying vec3 vWorld;
varying vec3 vN;
varying vec3 vLocal;
varying vec3 vSize;
varying vec4 vInfo;
void main() {
  mat4 m = modelMatrix * instanceMatrix;
  vec4 world = m * vec4(position, 1.0);
  vWorld = world.xyz;
  vN = normalize(mat3(m) * normal);
  vLocal = position;
  vSize = vec3(length(m[0].xyz), length(m[1].xyz), length(m[2].xyz));
  vInfo = aInfo;
  gl_Position = projectionMatrix * viewMatrix * world;
}`;

export const BUILDING_FRAGMENT = /* glsl */`
uniform vec3 uFacade; uniform vec3 uTop; uniform vec3 uTrim;
uniform vec3 uWinA; uniform vec3 uWinB; uniform vec3 uWinC;
uniform vec3 uFog; uniform vec3 uSkyLow; uniform vec3 uAccent;
uniform float uFogNear; uniform float uFogFar; uniform float uLit; uniform float uNeon; uniform float uWet;
uniform vec4 uSpot; uniform vec3 uSpotColor; uniform float uGround; uniform float uLayer;
varying vec3 vWorld; varying vec3 vN; varying vec3 vLocal; varying vec3 vSize; varying vec4 vInfo;
${HASH}
// Windows on a facade: u metres from the left edge, v metres below the roof. Returns colour and coverage.
vec4 windowAt(float u, float v, float seed, float width, float dim) {
  float cx = 1.45 + seed * 0.9;
  float cy = 3.1;
  float cols = max(1.0, floor((width - 0.8) / cx));
  float pad = (width - cols * cx) * 0.5;
  float gu = (u - pad) / cx;
  float gv = (v - 1.25) / cy;
  if (gu < 0.0 || gu >= cols || gv < 0.0) return vec4(0.0);
  vec2 cell = vec2(floor(gu), floor(gv));
  vec2 f = vec2(fract(gu), fract(gv));
  float pane = step(0.17, f.x) * step(f.x, 0.83) * step(0.24, f.y) * step(f.y, 0.78);
  float h = hash(cell + seed * 37.0);
  float pick = hash(cell.yx + seed * 11.0);
  vec3 lit = pick < 0.45 ? uWinA : (pick < 0.85 ? uWinB : uWinC);
  float blinds = 0.8 + 0.2 * smoothstep(0.3, 0.75, f.y + (h - 0.5) * 0.3);
  vec3 glass = uSkyLow * 0.1 + uFog * 0.18;
  vec3 col = h > 1.0 - uLit ? lit * blinds * (1.35 - dim * 0.5) : glass;
  return vec4(col, pane);
}
void main() {
  vec3 n = normalize(vN);
  // Per-instance values arrive through interpolation with tiny errors that the hash would amplify into
  // stripes, so snap them back to exact steps.
  float seed = floor(vInfo.x * 512.0 + 0.5) / 512.0;
  float style = floor(vInfo.y + 0.5);
  float v = -vLocal.y * vSize.y;
  vec3 col;
  bool roof = n.y > 0.5;
  if (roof) {
    vec2 p = vWorld.xz;
    float ex = (0.5 - abs(vLocal.x)) * vSize.x;
    float ez = (0.5 - abs(vLocal.z)) * vSize.z;
    vec2 tile = abs(fract(p * 0.5) - 0.5);
    float grout = smoothstep(0.43, 0.48, max(tile.x, tile.y));
    col = uTop * (0.86 + 0.2 * hash(floor(p * 0.5) + seed)) * (1.0 - 0.16 * grout);
    if (style > 0.5 && style < 1.5) col = mix(col, vec3(0.9, 0.72, 0.12), step(0.3, ez) * step(ez, 0.55) * step(0.0, vLocal.z));
    if (style > 2.5) col = mix(col, uTrim * 0.75, 0.35);
    col = mix(uTrim * 1.1, col, smoothstep(0.14, 0.22, min(ex, ez)));
    col += uWet * (uSkyLow * 0.1 + uWinB * 0.05 * step(0.7, hash(floor(p * vec2(1.5, 0.7)))));
  } else {
    bool front = n.z > 0.5;
    float u = front ? (vLocal.x + 0.5) * vSize.x : (vLocal.z + 0.5) * vSize.z;
    float width = front ? vSize.x : vSize.z;
    float shade = front ? 1.0 : (n.z < -0.5 ? 0.4 : 0.6);
    col = uFacade * shade * mix(1.1, 0.5, smoothstep(0.0, 34.0, v));
    col *= 0.93 + 0.07 * step(0.86, fract(v / 3.1));
    if (style > 2.5) {
      // A stack of shipping containers: ribbed steel in one of four paints.
      float rib = 0.82 + 0.18 * step(0.5, fract(u * 2.6));
      vec3 paint = seed < 0.25 ? vec3(0.6, 0.15, 0.1) : seed < 0.5 ? vec3(0.1, 0.26, 0.55) : seed < 0.75 ? vec3(0.16, 0.42, 0.28) : vec3(0.78, 0.46, 0.1);
      paint = mix(paint, paint.zxy, step(0.5, fract(floor(v / 2.6) * 0.37 + seed * 3.0)));
      col = paint * rib * shade * 0.75 * (1.0 - 0.45 * step(0.94, fract(v / 2.6)));
    } else {
      vec4 w = windowAt(u, v, seed, width, uLayer);
      col = mix(col, w.rgb * (front ? 1.0 : 0.65), w.a);
      col = mix(col, uTrim * shade * 0.85, 1.0 - smoothstep(0.24, 0.3, v));
      if (front && style > 1.5 && style < 2.5) {
        // Kick walls carry a lit billboard with chevrons pointing up.
        float bu = u - 0.7;
        float bw = min(width - 1.4, 6.5);
        float inside = step(0.0, bu) * step(bu, bw) * step(0.55, v) * step(v, 3.4);
        float chev = step(0.5, fract((v + abs(bu - bw * 0.5) * 0.7) * 0.9));
        float border = 1.0 - step(0.12, bu) * step(bu, bw - 0.12) * step(0.67, v) * step(v, 3.28);
        vec3 sign = mix(uAccent * 0.55, uAccent * 1.5, chev);
        sign = mix(sign, vec3(1.0), border * 0.7);
        col = mix(col, sign, inside);
      }
      if (front && uNeon > 0.01 && fract(seed * 7.0) > 0.45 && style < 0.5) {
        // A vertical neon sign near one edge.
        float su = u - (width - 1.5);
        float len = 3.0 + fract(seed * 13.0) * 5.0;
        float sv = v - 1.6;
        float strip = step(0.0, su) * step(su, 0.6) * step(0.0, sv) * step(sv, len);
        float glyph = step(0.25, fract(sv * 1.1)) * step(0.12, su) * step(su, 0.48);
        vec3 neon = fract(seed * 5.0) > 0.5 ? uWinA : uWinB;
        col = mix(col, neon * (0.5 + 1.1 * glyph), strip * uNeon);
        float halo = (1.0 - smoothstep(0.0, 1.2, abs(su - 0.3))) * step(-0.6, sv) * step(sv, len + 0.6);
        col += neon * halo * 0.12 * uNeon;
      }
    }
  }
  if (uSpot.w > 0.001) {
    vec2 d = roof ? vec2((vWorld.x - uSpot.x) / uSpot.z, vWorld.z / (uSpot.z * 1.5)) : vec2((vWorld.x - uSpot.x) / uSpot.z, (vWorld.y - uSpot.y) / (uSpot.z * 1.3));
    float spot = (1.0 - smoothstep(0.4, 1.0, length(d))) * uSpot.w * (1.0 - uLayer);
    col += uSpotColor * spot * (roof ? 0.85 : 0.45);
  }
  float low = smoothstep(uGround - 2.0, uGround - 26.0, vWorld.y) * (1.0 - uLayer * 0.6);
  col = mix(col, uFog * 0.42, low * 0.9);
  float fog = max(smoothstep(uFogNear, uFogFar, distance(vWorld, cameraPosition)), uLayer * 0.62);
  col = mix(col, uFog, fog);
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

export const SKY_VERTEX = /* glsl */`
varying vec3 vDir;
void main() {
  vDir = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

export const SKY_FRAGMENT = /* glsl */`
uniform vec3 uTop; uniform vec3 uMid; uniform vec3 uLow; uniform vec3 uSun; uniform vec3 uSunDir;
uniform float uSunSize; uniform float uStars;
varying vec3 vDir;
${HASH}
void main() {
  vec3 d = normalize(vDir);
  float h = d.y;
  vec3 col = mix(uLow, uMid, smoothstep(-0.04, 0.2, h));
  col = mix(col, uTop, smoothstep(0.18, 0.62, h));
  float s = max(dot(d, uSunDir), 0.0);
  col += uSun * (pow(s, 10.0) * 0.28 + pow(s, 90.0) * 0.5);
  if (uSunSize > 0.0) col = mix(col, uSun * 1.5, smoothstep(cos(uSunSize) - 0.0006, cos(uSunSize), s));
  vec2 cell = floor(vec2(atan(d.x, -d.z), h) * vec2(160.0, 160.0));
  float star = step(0.9965, hash(cell)) * smoothstep(0.12, 0.45, h) * uStars;
  col += vec3(star);
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

/** The farthest skyline: flat silhouettes drawn in the shader on one wide plane. */
export const SILHOUETTE_VERTEX = /* glsl */`
varying vec2 vW;
void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  vW = world.xy;
  gl_Position = projectionMatrix * viewMatrix * world;
}`;

export const SILHOUETTE_FRAGMENT = /* glsl */`
uniform vec3 uColor; uniform vec3 uWin; uniform float uLit;
varying vec2 vW;
${HASH}
void main() {
  float column = floor(vW.x / 13.0);
  float h = 6.0 + hash(vec2(column, 3.1)) * 34.0 + step(0.82, hash(vec2(column, 9.0))) * 30.0;
  float spire = step(0.9, hash(vec2(column, 4.0))) * step(abs(fract(vW.x / 13.0) - 0.5), 0.04) * 12.0;
  if (vW.y > h + spire) discard;
  vec2 g = vec2(vW.x / 2.4, vW.y / 3.2);
  vec2 f = fract(g);
  float lit = step(1.0 - uLit * 0.25, hash(floor(g))) * step(0.3, f.x) * step(f.x, 0.7) * step(0.3, f.y) * step(f.y, 0.7);
  vec3 col = uColor + uWin * lit * 0.45;
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

/** Additive searchlight cone: brightest along the axis and near the lamp, soft at the silhouette. */
export const CONE_VERTEX = /* glsl */`
varying float vAlong;
varying vec3 vNormalV;
varying vec3 vViewDir;
void main() {
  vAlong = -position.y;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vNormalV = normalize(normalMatrix * normal);
  vViewDir = normalize(-mv.xyz);
  gl_Position = projectionMatrix * mv;
}`;

export const CONE_FRAGMENT = /* glsl */`
uniform vec3 uColor; uniform float uIntensity;
varying float vAlong; varying vec3 vNormalV; varying vec3 vViewDir;
void main() {
  float edge = pow(abs(dot(normalize(vNormalV), normalize(vViewDir))), 1.6);
  float fade = (1.0 - smoothstep(0.6, 1.0, vAlong)) * (0.25 + 0.75 * (1.0 - vAlong)) * smoothstep(0.0, 0.08, vAlong);
  gl_FragColor = vec4(uColor * edge * fade * uIntensity, 1.0);
  #include <colorspace_fragment>
}`;

/** Round soft particles with per-particle colour, size and alpha. */
export const PARTICLE_VERTEX = /* glsl */`
attribute vec3 aColor;
attribute float aSize;
attribute float aAlpha;
uniform float uScale;
varying vec3 vColor;
varying float vAlpha;
void main() {
  vColor = aColor;
  vAlpha = aAlpha;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = aSize * uScale / max(0.1, -mv.z);
  gl_Position = projectionMatrix * mv;
}`;

export const PARTICLE_FRAGMENT = /* glsl */`
varying vec3 vColor;
varying float vAlpha;
void main() {
  float d = length(gl_PointCoord - 0.5) * 2.0;
  float a = (1.0 - smoothstep(0.35, 1.0, d)) * vAlpha;
  if (a < 0.01) discard;
  gl_FragColor = vec4(vColor, a);
  #include <colorspace_fragment>
}`;

/** The timing cue: an icon inside a ring that closes as the move's window arrives and turns hot inside it. */
export const CUE_VERTEX = /* glsl */`
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

export const CUE_FRAGMENT = /* glsl */`
uniform sampler2D uAtlas; uniform float uIcon; uniform float uProgress; uniform float uHot; uniform float uAlpha;
uniform vec3 uColor; uniform vec3 uHotColor;
varying vec2 vUv;
void main() {
  vec2 p = vUv - 0.5;
  float r = length(p) * 2.0;
  float angle = atan(p.x, p.y) / 6.28318 + 0.5;
  vec3 color = mix(uColor, uHotColor, uHot);
  float disc = 1.0 - smoothstep(0.74, 0.78, r);
  float ring = smoothstep(0.8, 0.84, r) * (1.0 - smoothstep(0.95, 0.99, r));
  float track = ring * 0.25;
  float fill = ring * step(1.0 - uProgress, angle);
  vec2 iconUv = vec2((uIcon + clamp((vUv.x - 0.5) * 1.45 + 0.5, 0.0, 1.0)) / 4.0, clamp((vUv.y - 0.5) * 1.45 + 0.5, 0.0, 1.0));
  float icon = texture2D(uAtlas, iconUv).a * disc;
  float glow = (1.0 - smoothstep(0.9, 1.25, r)) * smoothstep(0.7, 0.95, r) * uHot * 0.6;
  vec3 col = vec3(0.02, 0.03, 0.06) * disc;
  float alpha = disc * 0.55;
  col = mix(col, color, icon);
  alpha = max(alpha, icon);
  col = mix(col, vec3(1.0), track);
  alpha = max(alpha, track);
  col = mix(col, color, fill);
  alpha = max(alpha, fill);
  col += color * glow;
  alpha = max(alpha, glow);
  if (alpha < 0.01) discard;
  gl_FragColor = vec4(col, alpha * uAlpha);
  #include <colorspace_fragment>
}`;

/** Icons for the cue, white on transparent: up (jump/vault), down (slide/roll), wall-kick, zip handle. */
export function cueAtlas(): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  const g = canvas.getContext('2d')!;
  g.strokeStyle = '#fff';
  g.fillStyle = '#fff';
  g.lineWidth = 7;
  g.lineCap = 'round';
  g.lineJoin = 'round';
  const chevron = (cx: number, cy: number, dir: number) => {
    g.beginPath();
    g.moveTo(cx - 14, cy + 8 * dir);
    g.lineTo(cx, cy - 7 * dir);
    g.lineTo(cx + 14, cy + 8 * dir);
    g.stroke();
  };
  chevron(32, 26, 1);
  chevron(32, 42, 1);
  chevron(96, 22, -1);
  chevron(96, 38, -1);
  // Wall-kick: a wall and a bent arrow up its face.
  g.fillRect(170, 12, 7, 42);
  g.beginPath();
  g.moveTo(150, 50);
  g.lineTo(162, 36);
  g.lineTo(162, 16);
  g.stroke();
  g.beginPath();
  g.moveTo(154, 24);
  g.lineTo(162, 14);
  g.lineTo(170, 24);
  g.stroke();
  // Zip: a cable with a handle.
  g.beginPath();
  g.moveTo(200, 18);
  g.lineTo(248, 30);
  g.stroke();
  g.beginPath();
  g.moveTo(224, 24);
  g.lineTo(224, 40);
  g.moveTo(212, 44);
  g.lineTo(236, 44);
  g.stroke();
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.NoColorSpace;
  return texture;
}

export function softDisc(): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 64;
  const g = canvas.getContext('2d')!;
  const gradient = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.3, 'rgba(255,255,255,0.55)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gradient;
  g.fillRect(0, 0, 64, 64);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// ---------------------------------------------------------------------------------------------------------------
// Merged, vertex-coloured geometry: one draw call per prop type.

export interface Part { geometry: THREE.BufferGeometry; color: THREE.ColorRepresentation; }

export function part(geometry: THREE.BufferGeometry, color: THREE.ColorRepresentation, x = 0, y = 0, z = 0, rz = 0, rx = 0): Part {
  const g = geometry.index ? geometry.toNonIndexed() : geometry.clone();
  if (rx) g.rotateX(rx);
  if (rz) g.rotateZ(rz);
  g.translate(x, y, z);
  return { geometry: g, color };
}

export const box = (w: number, h: number, d: number, color: THREE.ColorRepresentation, x = 0, y = 0, z = 0, rz = 0) =>
  part(new THREE.BoxGeometry(w, h, d), color, x, y, z, rz);

export function merge(parts: Part[]): THREE.BufferGeometry {
  const positions: number[] = [];
  const normals: number[] = [];
  const colors: number[] = [];
  const color = new THREE.Color();
  for (const { geometry, color: c } of parts) {
    const p = geometry.getAttribute('position');
    const n = geometry.getAttribute('normal');
    color.set(c);
    for (let i = 0; i < p.count; i++) {
      positions.push(p.getX(i), p.getY(i), p.getZ(i));
      normals.push(n.getX(i), n.getY(i), n.getZ(i));
      colors.push(color.r, color.g, color.b);
    }
    geometry.dispose();
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  out.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  out.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  return out;
}

/** Rooftop AC unit at 1.4 x 1 x 1.6 m, base at y = 0, front face towards +z. Scaled per instance. */
export function acUnitGeometry(): THREE.BufferGeometry {
  const body = '#b9c2cc';
  const dark = '#2a313a';
  const parts: Part[] = [
    box(1.4, 0.92, 1.6, body, 0, 0.5, 0),
    box(1.46, 0.06, 1.66, '#d8dee6', 0, 0.97, 0),
    box(1.2, 0.08, 1.4, '#7c8794', 0, 0.06, 0),
    part(new THREE.CylinderGeometry(0.42, 0.42, 0.06, 18), dark, 0, 1.0, 0),
    part(new THREE.CylinderGeometry(0.1, 0.1, 0.08, 10), '#9aa4ae', 0, 1.04, 0),
    box(0.04, 0.02, 0.8, '#9aa4ae', 0, 1.04, 0, 0),
  ];
  for (let i = 0; i < 6; i++) parts.push(box(1.1, 0.05, 0.02, dark, 0, 0.22 + i * 0.11, 0.81));
  parts.push(box(0.18, 0.5, 0.04, '#ffcf3a', 0.58, 0.55, 0.81));
  return merge(parts);
}

/** Overhead pipe rack: a pipe along z between PIPE_LOW and PIPE_HIGH above the roof, on two posts. Base at y = 0. */
export function pipeRackGeometry(low: number, high: number): THREE.BufferGeometry {
  const r = (high - low) / 2;
  const cy = low + r;
  const steel = '#8f98a3';
  const parts: Part[] = [
    part(new THREE.CylinderGeometry(r, r, 7.2, 14), '#c46a2e', 0, cy, -1.2, 0, Math.PI / 2),
    box(0.16, high + 0.25, 0.16, steel, 0, (high + 0.25) / 2, -4.2),
    box(0.16, high + 0.25, 0.16, steel, 0, (high + 0.25) / 2, 1.9),
    box(0.5, 0.08, 0.3, steel, 0, high + 0.25, -4.2),
    box(0.5, 0.08, 0.3, steel, 0, high + 0.25, 1.9),
  ];
  // Hazard bands where the pipe crosses the running line.
  for (let i = -3; i <= 3; i++) {
    parts.push(part(new THREE.CylinderGeometry(r + 0.012, r + 0.012, 0.18, 14), i % 2 ? '#1b1b1b' : '#ffd23d', 0, cy, i * 0.18, 0, Math.PI / 2));
  }
  for (const z of [-3.6, 1.2]) parts.push(part(new THREE.CylinderGeometry(r + 0.04, r + 0.04, 0.1, 14), steel, 0, cy, z, 0, Math.PI / 2));
  return merge(parts);
}

/** A 10 m crane jib (lattice girder) with its top at y = 0, spanning x 0..10. Scaled in x per instance. */
export function boomGeometry(paint: string): THREE.BufferGeometry {
  const parts: Part[] = [
    box(10, 0.14, 1.3, paint, 5, -0.07, 0),
    box(10, 0.14, 0.14, paint, 5, -0.72, 0.55),
    box(10, 0.14, 0.14, paint, 5, -0.72, -0.55),
    box(10, 0.04, 0.5, '#3a3f46', 5, 0.01, 0),
  ];
  for (let i = 0; i <= 10; i++) {
    const x = i;
    parts.push(box(0.1, 0.66, 0.1, paint, x, -0.4, 0.55), box(0.1, 0.66, 0.1, paint, x, -0.4, -0.55));
    if (i < 10) {
      parts.push(box(0.08, 1.2, 0.08, paint, x + 0.5, -0.4, 0.55, i % 2 ? 0.98 : -0.98));
      parts.push(box(0.08, 1.2, 0.08, paint, x + 0.5, -0.4, -0.55, i % 2 ? -0.98 : 0.98));
    }
  }
  return merge(parts);
}

/** Crane tower below a jib: a lattice mast from y = 0 down 60 m, a cab and a hook block. */
export function craneTowerGeometry(paint: string): THREE.BufferGeometry {
  const parts: Part[] = [];
  const h = 60;
  for (const [x, z] of [[-0.9, -0.9], [0.9, -0.9], [-0.9, 0.9], [0.9, 0.9]]) parts.push(box(0.16, h, 0.16, paint, x, -h / 2 - 0.8, z));
  for (let y = -2; y > -h; y -= 2) {
    parts.push(box(1.9, 0.08, 0.08, paint, 0, y, 0.9, y % 4 ? 0.8 : -0.8));
    parts.push(box(0.08, 0.08, 1.9, paint, 0.9, y, 0));
  }
  parts.push(box(1.8, 1.4, 1.6, '#e8eef4', 1.6, -1.6, 0.4));
  parts.push(box(1.0, 0.7, 0.05, '#7fd3ff', 1.9, -1.4, 1.22));
  // Hook on its cable, hanging in front of the mast.
  parts.push(box(0.04, 7, 0.04, '#2b2f36', 4, -4.2, 1.0));
  parts.push(box(0.5, 0.6, 0.3, '#ffcf3a', 4, -7.9, 1.0));
  parts.push(part(new THREE.TorusGeometry(0.22, 0.06, 6, 12, Math.PI * 1.4), '#3a3f46', 4, -8.45, 1.0, 2.4));
  return merge(parts);
}

/** Zip-line mast: a pole at z = -0.9 with an arm out over the running line, 1 m tall (scaled in y). */
export function zipMastGeometry(): THREE.BufferGeometry {
  return merge([
    box(0.18, 1, 0.18, '#59616b', 0, 0.5, -1.0),
    box(0.12, 0.12, 1.2, '#59616b', 0, 1, -0.45),
    box(0.4, 0.06, 0.4, '#3a4048', 0, 0.02, -1.0),
  ]);
}

export function trolleyGeometry(accent: string): THREE.BufferGeometry {
  return merge([
    box(0.36, 0.18, 0.22, '#3a4048', 0, -0.09, 0),
    part(new THREE.CylinderGeometry(0.07, 0.07, 0.26, 10), '#9aa4ae', -0.1, 0.02, 0, 0, Math.PI / 2),
    part(new THREE.CylinderGeometry(0.07, 0.07, 0.26, 10), '#9aa4ae', 0.1, 0.02, 0, 0, Math.PI / 2),
    box(0.04, 0.32, 0.04, '#2b2f36', 0, -0.34, 0),
    box(0.62, 0.07, 0.07, accent, 0, -0.5, 0),
  ]);
}

/** Background gantry crane silhouette (harbour). */
export function gantryGeometry(): THREE.BufferGeometry {
  const c = '#c23b2b';
  const parts: Part[] = [
    box(1.2, 42, 1.2, c, -8, 21, 0), box(1.2, 42, 1.2, c, 8, 21, 0),
    box(52, 2.4, 2, c, 6, 42, 0), box(2.5, 9, 2, c, -6, 47, 0),
    box(16, 1, 1, c, 0, 18, 0), box(4, 3, 3, '#e8e8e8', 10, 39.5, 0),
  ];
  parts.push(box(0.2, 30, 0.2, '#30343a', 26, 27, 0.6, 0.62), box(0.2, 30, 0.2, '#30343a', -14, 27, 0.6, -0.62));
  return merge(parts);
}

/** Ferris wheel rim, spokes and gondolas (rotating part), radius 20. */
export function wheelGeometry(): THREE.BufferGeometry {
  const parts: Part[] = [
    part(new THREE.TorusGeometry(20, 0.35, 6, 64), '#e6e0f0', 0, 0, 0),
    part(new THREE.TorusGeometry(18.6, 0.16, 6, 64), '#c8bde0', 0, 0, 0),
    part(new THREE.CylinderGeometry(1.4, 1.4, 1.4, 16), '#a89ac8', 0, 0, 0, 0, Math.PI / 2),
  ];
  const n = 18;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    parts.push(box(0.16, 20, 0.16, '#d6cce8', Math.cos(a) * 10, Math.sin(a) * 10, 0, a - Math.PI / 2));
    const colors = ['#ff6fae', '#6ff0d0', '#ffd36b'];
    parts.push(box(1.6, 1.8, 1.4, colors[i % 3], Math.cos(a) * 20, Math.sin(a) * 20 - 1.3, 0));
  }
  return merge(parts);
}

export function wheelStandGeometry(): THREE.BufferGeometry {
  return merge([
    box(0.9, 30, 0.9, '#8f86aa', -7, -13, -1.5, -0.25), box(0.9, 30, 0.9, '#8f86aa', 7, -13, -1.5, 0.25),
    box(0.9, 30, 0.9, '#8f86aa', -7, -13, 1.5, -0.25), box(0.9, 30, 0.9, '#8f86aa', 7, -13, 1.5, 0.25),
    box(18, 1.2, 5, '#5a5072', 0, -27.5, 0),
  ]);
}

/** Police drone body: hull, arms, motor pods and the searchlight housing. Faces +x. */
export function droneGeometry(): THREE.BufferGeometry {
  const hull = '#1d2330';
  const trim = '#3b4456';
  const guard = '#b7c3d6';
  // A rounded body with a white roof stripe and a lamp pod under the nose.
  const body = new THREE.SphereGeometry(0.5, 18, 10);
  body.scale(1.1, 0.42, 0.82);
  const parts: Part[] = [
    part(body, hull),
    box(0.56, 0.05, 0.86, '#e8eef6', 0.06, 0.19, 0),
    part(new THREE.CylinderGeometry(0.16, 0.2, 0.3, 12), trim, 0.35, -0.26, 0),
  ];
  // Four diagonal arms, each with a motor and a guard ring round its rotor, so it reads as a quadcopter from the side.
  for (const [x, z] of [[0.75, 0.6], [-0.75, 0.6], [0.75, -0.6], [-0.75, -0.6]]) {
    const arm = new THREE.BoxGeometry(Math.hypot(x, z), 0.07, 0.09);
    arm.rotateY(-Math.atan2(z, x));
    arm.translate(x / 2, 0.08, z / 2);
    parts.push(part(arm, trim));
    parts.push(part(new THREE.CylinderGeometry(0.09, 0.1, 0.16, 10), trim, x, 0.12, z));
    parts.push(part(new THREE.TorusGeometry(0.47, 0.035, 6, 28), guard, x, 0.21, z, 0, Math.PI / 2));
  }
  return merge(parts);
}

// ---------------------------------------------------------------------------------------------------------------
// Runner rig

export interface Rig {
  root: THREE.Group;
  body: THREE.Group;
  torso: THREE.Group;
  head: THREE.Group;
  armL: [THREE.Group, THREE.Group];
  armR: [THREE.Group, THREE.Group];
  legL: [THREE.Group, THREE.Group];
  legR: [THREE.Group, THREE.Group];
  materials: THREE.MeshStandardMaterial[];
}

/** A hooded runner about 1.8 m tall, built from capsules and boxes, facing +x. Limb pivots rotate about z. */
export function buildRunner(accent: string): Rig {
  const hoodie = new THREE.MeshStandardMaterial({ color: '#ff5a36', roughness: 0.65, emissive: '#ff3a1a', emissiveIntensity: 0.12 });
  const hoodieFar = new THREE.MeshStandardMaterial({ color: '#c23a22', roughness: 0.7, emissive: '#5a1408', emissiveIntensity: 0.12 });
  const pants = new THREE.MeshStandardMaterial({ color: '#2a3550', roughness: 0.8 });
  const pantsFar = new THREE.MeshStandardMaterial({ color: '#1a2236', roughness: 0.8 });
  const skin = new THREE.MeshStandardMaterial({ color: '#c58a64', roughness: 0.7 });
  const shoe = new THREE.MeshStandardMaterial({ color: '#f2f4f8', roughness: 0.5, emissive: accent, emissiveIntensity: 0.15 });
  const visor = new THREE.MeshStandardMaterial({ color: '#111', emissive: accent, emissiveIntensity: 1.6, roughness: 0.3 });
  const materials = [hoodie, hoodieFar, pants, pantsFar, skin, shoe, visor];

  const root = new THREE.Group();
  const body = new THREE.Group();
  body.position.y = 0.95;
  root.add(body);
  const torso = new THREE.Group();
  body.add(torso);
  const chest = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.6, 0.34), hoodie);
  chest.position.set(0, 0.3, 0);
  torso.add(chest);
  const pelvis = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.2, 0.3), pants);
  pelvis.position.y = -0.02;
  body.add(pelvis);
  const head = new THREE.Group();
  head.position.set(0.02, 0.72, 0);
  torso.add(head);
  const face = new THREE.Mesh(new THREE.SphereGeometry(0.125, 14, 10), skin);
  const hood = new THREE.Mesh(new THREE.SphereGeometry(0.15, 14, 10), hoodie);
  hood.position.set(-0.035, 0.02, 0);
  hood.scale.set(1, 1.05, 1.02);
  const band = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.05, 0.27), visor);
  band.position.set(0.11, 0.02, 0);
  head.add(hood, face, band);

  const limb = (length: number, radius: number, material: THREE.Material) => {
    const pivot = new THREE.Group();
    const mesh = new THREE.Mesh(new THREE.CapsuleGeometry(radius, length - radius * 2, 4, 8), material);
    mesh.position.y = -length / 2;
    pivot.add(mesh);
    return pivot;
  };
  const arm = (z: number, near: boolean): [THREE.Group, THREE.Group] => {
    const upper = limb(0.3, 0.06, near ? hoodie : hoodieFar);
    upper.position.set(0, 0.55, z);
    const lower = limb(0.28, 0.05, near ? hoodie : hoodieFar);
    lower.position.y = -0.3;
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 6), skin);
    hand.position.y = -0.3;
    lower.add(hand);
    upper.add(lower);
    torso.add(upper);
    return [upper, lower];
  };
  const leg = (z: number, near: boolean): [THREE.Group, THREE.Group] => {
    const thigh = limb(0.44, 0.08, near ? pants : pantsFar);
    thigh.position.set(0, -0.06, z);
    const shin = limb(0.44, 0.065, near ? pants : pantsFar);
    shin.position.y = -0.44;
    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.09, 0.12), shoe);
    foot.position.set(0.07, -0.44, 0);
    shin.add(foot);
    thigh.add(shin);
    body.add(thigh);
    return [thigh, shin];
  };
  // The near side (towards the camera, +z) is drawn brighter than the far side.
  const armR = arm(-0.22, false);
  const legR = leg(-0.09, false);
  const armL = arm(0.22, true);
  const legL = leg(0.09, true);
  return { root, body, torso, head, armL, armR, legL, legR, materials };
}

export interface Pose {
  bodyY: number;
  bodyRot: number;
  torso: number;
  head: number;
  armL: [number, number];
  armR: [number, number];
  legL: [number, number];
  legR: [number, number];
}

export const blankPose = (): Pose => ({ bodyY: 0.95, bodyRot: 0, torso: 0, head: 0, armL: [0, 0], armR: [0, 0], legL: [0, 0], legR: [0, 0] });

export function blendPose(into: Pose, target: Pose, t: number): void {
  into.bodyY += (target.bodyY - into.bodyY) * t;
  into.bodyRot += (target.bodyRot - into.bodyRot) * t;
  into.torso += (target.torso - into.torso) * t;
  into.head += (target.head - into.head) * t;
  for (const key of ['armL', 'armR', 'legL', 'legR'] as const) {
    into[key][0] += (target[key][0] - into[key][0]) * t;
    into[key][1] += (target[key][1] - into[key][1]) * t;
  }
}

export function applyPose(rig: Rig, pose: Pose): void {
  rig.body.position.y = pose.bodyY;
  rig.body.rotation.z = pose.bodyRot;
  rig.torso.rotation.z = pose.torso;
  rig.head.rotation.z = pose.head;
  rig.armL[0].rotation.z = pose.armL[0];
  rig.armL[1].rotation.z = pose.armL[1];
  rig.armR[0].rotation.z = pose.armR[0];
  rig.armR[1].rotation.z = pose.armR[1];
  rig.legL[0].rotation.z = pose.legL[0];
  rig.legL[1].rotation.z = pose.legL[1];
  rig.legR[0].rotation.z = pose.legR[0];
  rig.legR[1].rotation.z = pose.legR[1];
}
