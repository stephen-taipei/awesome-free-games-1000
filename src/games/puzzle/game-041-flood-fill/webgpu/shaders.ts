/**
 * WebGPU Shaders - Flood Fill
 * Ink Spill / Watercolor Studio Theme
 * Game #041
 */

export const backgroundShader = /* wgsl */`
struct Uniforms {
  time: f32,
  aspect: f32,
  pad1: f32,
  pad2: f32,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;

struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) uv: vec2f,
}

@vertex
fn vertexMain(@builtin(vertex_index) vertexIndex: u32) -> VertexOutput {
  var pos = array<vec2f, 6>(
    vec2f(-1, -1), vec2f(1, -1), vec2f(-1, 1),
    vec2f(-1, 1), vec2f(1, -1), vec2f(1, 1)
  );

  var output: VertexOutput;
  output.position = vec4f(pos[vertexIndex], 0, 1);
  output.uv = pos[vertexIndex] * 0.5 + 0.5;
  return output;
}

fn hash(p: vec2f) -> f32 {
  var p3 = fract(vec3f(p.x, p.y, p.x) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

fn noise(p: vec2f) -> f32 {
  let i = floor(p);
  let f = fract(p);
  let u = f * f * (3.0 - 2.0 * f);

  return mix(
    mix(hash(i), hash(i + vec2f(1, 0)), u.x),
    mix(hash(i + vec2f(0, 1)), hash(i + vec2f(1, 1)), u.x),
    u.y
  );
}

fn fbm(p: vec2f) -> f32 {
  var value = 0.0;
  var amplitude = 0.5;
  var pos = p;

  for (var i = 0; i < 5; i++) {
    value += amplitude * noise(pos);
    pos *= 2.0;
    amplitude *= 0.5;
  }
  return value;
}

// Watercolor paper texture
fn paperTexture(uv: vec2f) -> f32 {
  let fine = noise(uv * 80.0) * 0.15;
  let medium = noise(uv * 30.0) * 0.2;
  let coarse = noise(uv * 10.0) * 0.1;
  return 0.85 + fine + medium + coarse;
}

// Ink stain pattern
fn inkStain(uv: vec2f, center: vec2f, size: f32, time: f32) -> f32 {
  let offset = vec2f(
    fbm(uv * 4.0 + time * 0.1) * 0.1,
    fbm(uv * 4.0 + 100.0 + time * 0.08) * 0.1
  );
  let dist = length(uv - center + offset);
  let edge = fbm(uv * 8.0 + time * 0.05) * 0.15;
  return smoothstep(size + edge, size * 0.3, dist);
}

// Watercolor bleed effect
fn watercolorBleed(uv: vec2f, time: f32) -> vec3f {
  let bleedNoise = fbm(uv * 3.0 + time * 0.02);

  // Soft color pools
  let poolRed = inkStain(uv, vec2f(0.2, 0.7), 0.25, time) * vec3f(0.9, 0.3, 0.35);
  let poolBlue = inkStain(uv, vec2f(0.7, 0.3), 0.3, time) * vec3f(0.3, 0.5, 0.85);
  let poolYellow = inkStain(uv, vec2f(0.5, 0.8), 0.2, time) * vec3f(0.95, 0.85, 0.3);
  let poolGreen = inkStain(uv, vec2f(0.8, 0.7), 0.22, time) * vec3f(0.3, 0.75, 0.5);

  return (poolRed + poolBlue + poolYellow + poolGreen) * 0.15 * bleedNoise;
}

// Water droplet ripple
fn waterRipple(uv: vec2f, center: vec2f, time: f32, delay: f32) -> f32 {
  let t = fract(time * 0.3 + delay);
  let dist = length(uv - center);
  let ring = smoothstep(0.02, 0.0, abs(dist - t * 0.4));
  return ring * (1.0 - t) * 0.3;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  let uv = input.uv;
  let time = uniforms.time;

  // Watercolor paper base - warm cream
  let paperBase = vec3f(0.98, 0.96, 0.92);
  let paperTex = paperTexture(uv);
  var color = paperBase * paperTex;

  // Subtle watercolor bleeds in background
  let bleeds = watercolorBleed(uv, time);
  color += bleeds;

  // Water ripples from color drips
  var ripples = 0.0;
  for (var i = 0; i < 5; i++) {
    let idx = f32(i);
    let cx = hash(vec2f(idx, 0.0)) * 0.6 + 0.2;
    let cy = hash(vec2f(idx, 1.0)) * 0.6 + 0.2;
    ripples += waterRipple(uv, vec2f(cx, cy), time, idx * 0.2);
  }
  color += vec3f(0.3, 0.5, 0.8) * ripples;

  // Edge vignette - like painting border
  let edgeDist = min(min(uv.x, 1.0 - uv.x), min(uv.y, 1.0 - uv.y));
  let vignette = smoothstep(0.0, 0.15, edgeDist);
  color *= 0.85 + vignette * 0.15;

  // Subtle warm lighting
  let warmLight = 1.0 + sin(time * 0.3) * 0.02;
  color *= warmLight;

  return vec4f(color, 1.0);
}
`;

export const particleShader = /* wgsl */`
struct Uniforms {
  time: f32,
  aspect: f32,
  pad1: f32,
  pad2: f32,
}

struct Particle {
  x: f32,
  y: f32,
  vx: f32,
  vy: f32,
  life: f32,
  maxLife: f32,
  size: f32,
  particleType: f32,
  r: f32,
  g: f32,
  b: f32,
  a: f32,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;
@group(0) @binding(1) var<storage, read> particles: array<Particle>;

struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) uv: vec2f,
  @location(1) color: vec4f,
  @location(2) particleType: f32,
  @location(3) life: f32,
}

@vertex
fn vertexMain(
  @builtin(vertex_index) vertexIndex: u32,
  @builtin(instance_index) instanceIndex: u32
) -> VertexOutput {
  var quad = array<vec2f, 6>(
    vec2f(-1, -1), vec2f(1, -1), vec2f(-1, 1),
    vec2f(-1, 1), vec2f(1, -1), vec2f(1, 1)
  );

  let p = particles[instanceIndex];
  let size = p.size;
  let pos = quad[vertexIndex] * size + vec2f(p.x * 2.0 - 1.0, 1.0 - p.y * 2.0);

  var output: VertexOutput;
  output.position = vec4f(pos.x / uniforms.aspect, pos.y, 0, 1);
  output.uv = quad[vertexIndex] * 0.5 + 0.5;
  output.color = vec4f(p.r, p.g, p.b, p.a);
  output.particleType = p.particleType;
  output.life = p.life / p.maxLife;
  return output;
}

fn hash(p: vec2f) -> f32 {
  var p3 = fract(vec3f(p.x, p.y, p.x) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  let uv = input.uv;
  let centered = uv - 0.5;
  let dist = length(centered);
  let pType = i32(input.particleType);
  var alpha = input.color.a;
  var color = input.color.rgb;

  if (pType == 0) {
    // Ink splash - organic blob shape
    let angle = atan2(centered.y, centered.x);
    let wobble = 1.0 + sin(angle * 5.0 + uniforms.time * 3.0) * 0.15;
    let wobble2 = 1.0 + sin(angle * 7.0 - uniforms.time * 2.0) * 0.1;
    let blobDist = dist * wobble * wobble2;

    let core = smoothstep(0.4, 0.1, blobDist);
    let edge = smoothstep(0.5, 0.35, blobDist);
    alpha *= edge;

    // Darker center
    color = mix(color * 0.7, color, 1.0 - core * 0.5);

  } else if (pType == 1) {
    // Color spread - watercolor diffusion
    let spread = smoothstep(0.5, 0.0, dist);
    let fadeEdge = smoothstep(0.5, 0.3, dist);
    alpha *= spread * fadeEdge;

    // Watercolor texture
    let tex = hash(uv * 20.0 + uniforms.time);
    alpha *= 0.7 + tex * 0.3;

    // Color variation
    color = mix(color, color * 1.2, spread * 0.3);

  } else if (pType == 2) {
    // Victory - rainbow ink celebration
    let angle = atan2(centered.y, centered.x) + uniforms.time * 2.0;
    let swirl = pow(abs(sin(angle * 4.0)), 2.0);
    let glow = smoothstep(0.5, 0.0, dist);
    alpha *= glow * (0.6 + swirl * 0.4);

    // Rainbow shift
    let hueShift = fract(uniforms.time * 0.5 + dist);
    let rainbow = vec3f(
      sin(hueShift * 6.28) * 0.5 + 0.5,
      sin(hueShift * 6.28 + 2.09) * 0.5 + 0.5,
      sin(hueShift * 6.28 + 4.19) * 0.5 + 0.5
    );
    color = mix(color, rainbow, 0.5);

  } else if (pType == 3) {
    // Ambient - floating ink droplet
    let droplet = smoothstep(0.5, 0.2, dist);
    let highlight = smoothstep(0.15, 0.0, length(centered - vec2f(-0.1, -0.1)));
    alpha *= droplet * 0.5;

    // Subtle highlight
    color = mix(color, vec3f(1.0), highlight * 0.3);

  } else if (pType == 4) {
    // Ripple - water ring
    let ring = smoothstep(0.08, 0.0, abs(dist - 0.35));
    let ring2 = smoothstep(0.05, 0.0, abs(dist - 0.25));
    alpha *= (ring + ring2 * 0.5) * 0.6;

    // Fade with life
    color *= 0.8 + input.life * 0.2;
  }

  // Life-based fade
  let lifeFade = smoothstep(0.0, 0.2, input.life) * smoothstep(1.0, 0.7, input.life);
  alpha *= lifeFade;

  return vec4f(color, alpha);
}
`;

export const victoryShader = /* wgsl */`
struct Uniforms {
  time: f32,
  intensity: f32,
  pad1: f32,
  pad2: f32,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;

struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) uv: vec2f,
}

@vertex
fn vertexMain(@builtin(vertex_index) vertexIndex: u32) -> VertexOutput {
  var pos = array<vec2f, 6>(
    vec2f(-1, -1), vec2f(1, -1), vec2f(-1, 1),
    vec2f(-1, 1), vec2f(1, -1), vec2f(1, 1)
  );

  var output: VertexOutput;
  output.position = vec4f(pos[vertexIndex], 0, 1);
  output.uv = pos[vertexIndex] * 0.5 + 0.5;
  return output;
}

fn hash(p: vec2f) -> f32 {
  var p3 = fract(vec3f(p.x, p.y, p.x) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  let uv = input.uv;
  let time = uniforms.time;
  let intensity = uniforms.intensity;

  let center = vec2f(0.5, 0.5);
  let dist = length(uv - center);
  let angle = atan2(uv.y - 0.5, uv.x - 0.5);

  // Expanding ink waves
  var waves = 0.0;
  for (var i = 0; i < 4; i++) {
    let idx = f32(i);
    let waveRadius = fract(time * 0.3 + idx * 0.25) * 0.8;
    let wave = smoothstep(0.08, 0.0, abs(dist - waveRadius)) * (1.0 - waveRadius);
    waves += wave;
  }

  // Color burst rays
  let rays = pow(abs(sin(angle * 6.0 - time * 1.5)), 3.0);
  let rayStrength = smoothstep(0.7, 0.2, dist) * rays;

  // Watercolor palette
  let inkRed = vec3f(0.9, 0.3, 0.35);
  let inkBlue = vec3f(0.3, 0.5, 0.9);
  let inkYellow = vec3f(0.95, 0.85, 0.3);
  let inkGreen = vec3f(0.3, 0.8, 0.5);
  let inkPurple = vec3f(0.6, 0.3, 0.8);

  // Rainbow cycling
  let cycle = fract(time * 0.4 + angle / 6.28);
  var color = mix(inkRed, inkBlue, smoothstep(0.0, 0.2, cycle));
  color = mix(color, inkYellow, smoothstep(0.2, 0.4, cycle));
  color = mix(color, inkGreen, smoothstep(0.4, 0.6, cycle));
  color = mix(color, inkPurple, smoothstep(0.6, 0.8, cycle));
  color = mix(color, inkRed, smoothstep(0.8, 1.0, cycle));

  let totalGlow = (waves * 0.6 + rayStrength * 0.4) * intensity;

  // Center bright flash
  let centerFlash = smoothstep(0.25, 0.0, dist) * intensity * 0.5;
  color = mix(color, vec3f(1.0, 1.0, 0.9), centerFlash);

  // Ink splatters
  for (var i = 0; i < 6; i++) {
    let idx = f32(i);
    let splatAngle = idx * 1.047 + time * 2.0;
    let splatDist = fract(time * 0.4 + idx * 0.167) * 0.5;
    let splatPos = center + vec2f(cos(splatAngle), sin(splatAngle)) * splatDist;
    let splatGlow = smoothstep(0.03, 0.0, length(uv - splatPos)) * (1.0 - splatDist * 2.0);
    color += vec3f(0.95, 0.95, 0.9) * splatGlow * intensity;
  }

  return vec4f(color * totalGlow, totalGlow * 0.7);
}
`;
