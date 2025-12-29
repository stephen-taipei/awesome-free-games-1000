/**
 * WebGPU Shaders - Matchstick Puzzle
 * Cozy Fireplace / Log Cabin Night Theme
 * Game #040
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

  for (var i = 0; i < 4; i++) {
    value += amplitude * noise(pos);
    pos *= 2.0;
    amplitude *= 0.5;
  }
  return value;
}

// Wood grain pattern
fn woodGrain(uv: vec2f) -> f32 {
  let scaled = uv * vec2f(2.0, 8.0);
  let grain = sin(scaled.y * 20.0 + noise(scaled * 3.0) * 5.0) * 0.5 + 0.5;
  let knots = smoothstep(0.8, 0.9, noise(uv * 5.0));
  return grain * (1.0 - knots * 0.3);
}

// Fireplace glow
fn fireplaceGlow(uv: vec2f, time: f32) -> f32 {
  let firePos = vec2f(0.5, 1.2);
  let dist = length(uv - firePos);

  // Flickering
  let flicker = sin(time * 8.0) * 0.1 + sin(time * 12.0) * 0.05 + sin(time * 5.0) * 0.15;

  let glow = smoothstep(1.5, 0.2, dist) * (0.6 + flicker);
  return glow;
}

// Ember float
fn embers(uv: vec2f, time: f32) -> f32 {
  var total = 0.0;

  for (var i = 0; i < 10; i++) {
    let idx = f32(i);
    let startX = hash(vec2f(idx, 0.0)) * 0.6 + 0.2;
    let speed = hash(vec2f(idx, 1.0)) * 0.08 + 0.03;
    let size = hash(vec2f(idx, 2.0)) * 0.004 + 0.002;
    let sway = sin(time * 2.0 + idx * 1.5) * 0.03;

    let y = 1.0 - fract(time * speed + hash(vec2f(idx, 3.0)));
    let x = startX + sway;

    let dist = length(uv - vec2f(x, y));
    let ember = smoothstep(size, 0.0, dist);
    let fade = smoothstep(0.0, 0.3, y) * smoothstep(1.0, 0.7, y);
    total += ember * fade;
  }

  return total;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  let uv = input.uv;
  let time = uniforms.time;

  // Cabin wood colors
  let darkWood = vec3f(0.15, 0.08, 0.04);
  let mediumWood = vec3f(0.3, 0.18, 0.08);
  let lightWood = vec3f(0.45, 0.28, 0.12);

  // Night ambient
  let nightBlue = vec3f(0.02, 0.03, 0.08);

  // Base color with wood grain
  let grain = woodGrain(uv);
  var color = mix(darkWood, mediumWood, grain);

  // Fireplace warm glow
  let glow = fireplaceGlow(uv, time);
  let fireColor = vec3f(1.0, 0.5, 0.15);
  color = mix(color, fireColor, glow * 0.4);
  color += fireColor * glow * 0.2;

  // Floating embers
  let emberGlow = embers(uv, time);
  let emberColor = vec3f(1.0, 0.6, 0.2);
  color += emberColor * emberGlow * 0.8;

  // Corner shadows for cozy feel
  let cornerDist = length(uv - 0.5);
  let vignette = smoothstep(0.2, 0.8, cornerDist);
  color = mix(color, nightBlue, vignette * 0.5);

  // Subtle warm pulse
  let warmPulse = sin(time * 0.5) * 0.02 + 0.98;
  color *= warmPulse;

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

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  let uv = input.uv;
  let centered = uv - 0.5;
  let dist = length(centered);
  let pType = i32(input.particleType);
  var alpha = input.color.a;
  var color = input.color.rgb;

  if (pType == 0) {
    // Ember - glowing hot particle
    let core = smoothstep(0.3, 0.0, dist);
    let glow = smoothstep(0.5, 0.1, dist);
    alpha *= glow;
    color = mix(color, vec3f(1.0, 1.0, 0.8), core * 0.8);

    // Flicker
    let flicker = sin(uniforms.time * 15.0 + dist * 10.0) * 0.2 + 0.8;
    alpha *= flicker;

  } else if (pType == 1) {
    // Spark - match tip flash
    let spark = smoothstep(0.5, 0.0, dist);
    let core = smoothstep(0.15, 0.0, dist);
    alpha *= spark;
    color = mix(color, vec3f(1.0, 1.0, 0.9), core);

    // Star burst
    let angle = atan2(centered.y, centered.x);
    let star = pow(abs(cos(angle * 4.0)), 6.0);
    alpha *= 0.6 + star * 0.4;

  } else if (pType == 2) {
    // Victory - warm fire celebration
    let angle = atan2(centered.y, centered.x) + uniforms.time * 2.0;
    let flame = pow(abs(sin(angle * 6.0)), 3.0);
    let glow = smoothstep(0.5, 0.0, dist);
    alpha *= glow * (0.6 + flame * 0.4);

    // Color shift yellow to orange
    let colorShift = sin(uniforms.time * 5.0 + dist * 8.0) * 0.5 + 0.5;
    color = mix(vec3f(1.0, 0.8, 0.2), vec3f(1.0, 0.4, 0.1), colorShift);

  } else if (pType == 3) {
    // Ambient - floating ash
    let ash = smoothstep(0.5, 0.2, dist);
    alpha *= ash * 0.3;

    // Gentle drift
    let drift = sin(uniforms.time * 1.5 + dist * 5.0) * 0.2 + 0.8;
    alpha *= drift;

  } else if (pType == 4) {
    // Smoke - wispy trail
    let smoke = smoothstep(0.5, 0.1, dist) * 0.5;
    alpha *= smoke;

    // Curling motion
    let curl = sin(uniforms.time * 2.0 + uv.y * 10.0) * 0.1;
    alpha *= 0.8 + curl;
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

  // Expanding warm rings
  let ringRadius = fract(time * 0.4) * 0.8;
  let ring = smoothstep(0.05, 0.0, abs(dist - ringRadius)) * (1.0 - ringRadius);

  // Fire rays
  let rays = pow(abs(sin(angle * 8.0 - time * 2.0)), 4.0);
  let rayStrength = smoothstep(0.7, 0.2, dist) * rays;

  // Warm fire colors
  let orangeFlame = vec3f(1.0, 0.5, 0.1);
  let yellowFlame = vec3f(1.0, 0.9, 0.3);
  let redEmber = vec3f(1.0, 0.2, 0.05);

  var color = mix(orangeFlame, yellowFlame, rayStrength);
  color = mix(color, redEmber, ring * 0.5);

  let totalGlow = (ring + rayStrength * 0.5) * intensity;

  // Center bright flash
  let centerFlash = smoothstep(0.3, 0.0, dist) * intensity * 0.6;
  color = mix(color, vec3f(1.0, 1.0, 0.8), centerFlash);

  // Sparks
  for (var i = 0; i < 8; i++) {
    let idx = f32(i);
    let sparkAngle = idx * 0.785 + time * 3.0;
    let sparkDist = fract(time * 0.5 + idx * 0.125) * 0.5;
    let sparkPos = center + vec2f(cos(sparkAngle), sin(sparkAngle)) * sparkDist;
    let sparkGlow = smoothstep(0.02, 0.0, length(uv - sparkPos)) * (1.0 - sparkDist * 2.0);
    color += vec3f(1.0, 0.8, 0.4) * sparkGlow * intensity;
  }

  return vec4f(color * totalGlow, totalGlow * 0.8);
}
`;
