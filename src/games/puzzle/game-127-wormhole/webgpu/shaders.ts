/**
 * WebGPU Shaders - Wormhole
 * Space / Wormhole Theme
 * Game #127
 */

export const BACKGROUND_SHADER = /* wgsl */ `
struct Uniforms {
  time: f32,
  aspectRatio: f32,
  playerX: f32,
  playerY: f32,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;

struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) uv: vec2f,
}

@vertex
fn vertexMain(@builtin(vertex_index) vertexIndex: u32) -> VertexOutput {
  var pos = array<vec2f, 4>(
    vec2f(-1.0, -1.0),
    vec2f(1.0, -1.0),
    vec2f(-1.0, 1.0),
    vec2f(1.0, 1.0)
  );

  var output: VertexOutput;
  output.position = vec4f(pos[vertexIndex], 0.0, 1.0);
  output.uv = pos[vertexIndex] * 0.5 + 0.5;
  return output;
}

// Hash functions
fn hash2(p: vec2f) -> f32 {
  var p3 = fract(vec3f(p.x, p.y, p.x) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

fn hash22(p: vec2f) -> vec2f {
  var p3 = fract(vec3f(p.x, p.y, p.x) * vec3f(0.1031, 0.1030, 0.0973));
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.xx + p3.yz) * p3.zy);
}

// Value noise
fn noise(p: vec2f) -> f32 {
  let i = floor(p);
  let f = fract(p);
  let u = f * f * (3.0 - 2.0 * f);

  return mix(
    mix(hash2(i + vec2f(0.0, 0.0)), hash2(i + vec2f(1.0, 0.0)), u.x),
    mix(hash2(i + vec2f(0.0, 1.0)), hash2(i + vec2f(1.0, 1.0)), u.x),
    u.y
  );
}

// FBM
fn fbm(p: vec2f) -> f32 {
  var value = 0.0;
  var amplitude = 0.5;
  var frequency = 1.0;
  var pos = p;

  for (var i = 0; i < 5; i++) {
    value += amplitude * noise(pos * frequency);
    amplitude *= 0.5;
    frequency *= 2.0;
    pos = pos * 1.1 + vec2f(0.3, 0.7);
  }

  return value;
}

// Star field
fn stars(uv: vec2f, density: f32, brightness: f32) -> f32 {
  let p = floor(uv * density);
  let f = fract(uv * density);

  let rand = hash22(p);
  let starPos = vec2f(rand.x, rand.y);
  let dist = length(f - starPos);

  let starSize = rand.x * 0.03 + 0.01;
  let star = smoothstep(starSize, 0.0, dist);

  // Twinkle
  let twinkle = sin(uniforms.time * (rand.x * 3.0 + 1.0) + rand.y * 10.0) * 0.3 + 0.7;

  return star * twinkle * brightness * (rand.y * 0.5 + 0.5);
}

// Nebula effect
fn nebula(uv: vec2f, time: f32) -> vec3f {
  let drift = vec2f(
    sin(time * 0.05) * 0.1,
    cos(time * 0.03) * 0.08
  );

  let n1 = fbm(uv * 2.0 + drift);
  let n2 = fbm(uv * 3.0 - drift * 0.5 + 10.0);
  let n3 = fbm(uv * 4.0 + drift * 0.3 + 20.0);

  var color = vec3f(0.0);

  // Purple nebula
  color += vec3f(0.3, 0.1, 0.5) * n1 * 0.4;

  // Blue nebula
  color += vec3f(0.1, 0.2, 0.6) * n2 * 0.3;

  // Pink nebula
  color += vec3f(0.5, 0.15, 0.4) * n3 * 0.2;

  return color;
}

// Wormhole distortion effect
fn wormholeDistortion(uv: vec2f, center: vec2f, time: f32) -> f32 {
  let dist = length(uv - center);
  let swirl = sin(dist * 15.0 - time * 2.0) * 0.5 + 0.5;
  let falloff = smoothstep(0.3, 0.0, dist);

  return swirl * falloff;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  var uv = input.uv;
  uv.x *= uniforms.aspectRatio;

  let time = uniforms.time;

  // Base deep space gradient
  let vGradient = 1.0 - input.uv.y;
  var color = mix(
    vec3f(0.02, 0.01, 0.05),
    vec3f(0.08, 0.04, 0.15),
    vGradient
  );

  // Add nebula
  let neb = nebula(uv, time);
  color += neb * 0.3;

  // Multiple star layers
  let stars1 = stars(uv + vec2f(time * 0.001, 0.0), 50.0, 1.0);
  let stars2 = stars(uv * 1.3 + vec2f(0.0, time * 0.0005), 80.0, 0.7);
  let stars3 = stars(uv * 0.8 + vec2f(time * 0.0008, time * 0.0003), 120.0, 0.5);

  color += vec3f(1.0, 1.0, 1.0) * stars1;
  color += vec3f(0.8, 0.9, 1.0) * stars2;
  color += vec3f(1.0, 0.95, 0.9) * stars3;

  // Player position glow
  let playerPos = vec2f(uniforms.playerX * uniforms.aspectRatio, uniforms.playerY);
  let playerDist = length(uv - playerPos);
  let playerGlow = smoothstep(0.15, 0.0, playerDist) * 0.3;
  color += vec3f(0.6, 0.35, 0.7) * playerGlow;

  // Subtle cosmic dust movement
  let dust = fbm(uv * 5.0 + vec2f(time * 0.02, time * 0.01));
  color += vec3f(0.15, 0.1, 0.25) * dust * 0.1;

  // Vignette
  let center = vec2f(0.5 * uniforms.aspectRatio, 0.5);
  let vignette = 1.0 - length(uv - center) * 0.5;
  color *= vignette * vignette;

  return vec4f(color, 1.0);
}
`;

export const PARTICLE_SHADER = /* wgsl */ `
struct Uniforms {
  time: f32,
  aspectRatio: f32,
  playerX: f32,
  playerY: f32,
}

struct Particle {
  position: vec2f,
  velocity: vec2f,
  color: vec4f,
  size: f32,
  life: f32,
  maxLife: f32,
  particleType: f32,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;
@group(0) @binding(1) var<storage, read> particles: array<Particle>;

struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) color: vec4f,
  @location(1) uv: vec2f,
  @location(2) particleType: f32,
  @location(3) life: f32,
}

@vertex
fn vertexMain(
  @builtin(vertex_index) vertexIndex: u32,
  @builtin(instance_index) instanceIndex: u32
) -> VertexOutput {
  let particle = particles[instanceIndex];

  var corners = array<vec2f, 4>(
    vec2f(-1.0, -1.0),
    vec2f(1.0, -1.0),
    vec2f(-1.0, 1.0),
    vec2f(1.0, 1.0)
  );

  let corner = corners[vertexIndex];
  let lifeRatio = particle.life / particle.maxLife;

  // Size by particle type
  var size = particle.size;
  let pType = u32(particle.particleType);

  // 0: star - twinkling
  // 1: wormhole - swirling vortex
  // 2: energy - glowing orb
  // 3: teleport - distortion wave
  // 4: trail - fading path
  // 5: cosmic - dust/debris

  if (pType == 0u) {
    // Star - pulsing twinkle
    size *= 0.7 + sin(uniforms.time * 5.0 + particle.position.x * 20.0) * 0.3;
    size *= smoothstep(0.0, 0.3, lifeRatio) * smoothstep(1.0, 0.7, lifeRatio);
  } else if (pType == 1u) {
    // Wormhole - rotating, pulsing
    size *= 0.8 + sin(uniforms.time * 3.0) * 0.2;
    size *= smoothstep(0.0, 0.2, lifeRatio) * smoothstep(1.0, 0.5, lifeRatio);
  } else if (pType == 2u) {
    // Energy - bright core
    size *= 0.6 + sin(uniforms.time * 8.0 + particle.position.y * 15.0) * 0.4;
    size *= smoothstep(0.0, 0.2, lifeRatio) * smoothstep(1.0, 0.6, lifeRatio);
  } else if (pType == 3u) {
    // Teleport - expanding wave
    size *= 0.3 + (1.0 - lifeRatio) * 1.5;
    size *= smoothstep(0.0, 0.1, lifeRatio) * smoothstep(1.0, 0.3, lifeRatio);
  } else if (pType == 4u) {
    // Trail - shrinking tail
    size *= lifeRatio * 0.8 + 0.2;
    size *= smoothstep(0.0, 0.1, lifeRatio) * smoothstep(1.0, 0.5, lifeRatio);
  } else if (pType == 5u) {
    // Cosmic dust
    size *= 0.5 + sin(uniforms.time * 2.0 + particle.position.x * 10.0) * 0.2;
    size *= smoothstep(0.0, 0.3, lifeRatio) * smoothstep(1.0, 0.6, lifeRatio);
  }

  var pos = particle.position + corner * size;
  pos.x /= uniforms.aspectRatio;

  var output: VertexOutput;
  output.position = vec4f(pos * 2.0 - 1.0, 0.0, 1.0);
  output.color = particle.color;
  output.uv = corner;
  output.particleType = particle.particleType;
  output.life = lifeRatio;

  return output;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  let dist = length(input.uv);
  let pType = u32(input.particleType);

  var alpha = 0.0;
  var color = input.color.rgb;

  if (pType == 0u) {
    // Star - sharp core with soft glow
    let core = smoothstep(0.4, 0.0, dist);
    let glow = smoothstep(1.0, 0.3, dist) * 0.4;
    alpha = core + glow;

    // Cross-shaped flare
    let flareX = smoothstep(0.15, 0.0, abs(input.uv.y)) * smoothstep(1.0, 0.3, abs(input.uv.x));
    let flareY = smoothstep(0.15, 0.0, abs(input.uv.x)) * smoothstep(1.0, 0.3, abs(input.uv.y));
    alpha += (flareX + flareY) * 0.3;
  } else if (pType == 1u) {
    // Wormhole - swirling vortex
    let angle = atan2(input.uv.y, input.uv.x);
    let spiral = sin(angle * 3.0 - uniforms.time * 4.0 + dist * 10.0) * 0.5 + 0.5;

    let ring = smoothstep(1.0, 0.6, dist) * smoothstep(0.2, 0.4, dist);
    let center = smoothstep(0.3, 0.0, dist);

    alpha = ring * spiral * 0.8 + center * 0.6;

    // Dark core
    let darkCore = smoothstep(0.15, 0.0, dist);
    color = mix(color, vec3f(0.0, 0.0, 0.1), darkCore);
  } else if (pType == 2u) {
    // Energy - bright glowing orb
    let glow = smoothstep(1.0, 0.0, dist);
    let core = smoothstep(0.3, 0.0, dist);
    alpha = glow * 0.5 + core * 0.7;

    // Sparkle effect
    let sparkle = sin(dist * 20.0 + uniforms.time * 10.0) * 0.15;
    color += vec3f(sparkle);
  } else if (pType == 3u) {
    // Teleport - distortion ring
    let ring = smoothstep(1.0, 0.8, dist) * smoothstep(0.5, 0.7, dist);
    let innerGlow = smoothstep(0.6, 0.0, dist) * 0.3;
    alpha = ring * 0.8 + innerGlow;

    // Chromatic aberration effect
    let shift = (1.0 - input.life) * 0.3;
    color.r += shift;
    color.b -= shift * 0.5;
  } else if (pType == 4u) {
    // Trail - soft fading
    let trail = smoothstep(1.0, 0.0, dist);
    alpha = trail * 0.6;

    // Color shift along life
    color = mix(color, vec3f(0.3, 0.2, 0.5), 1.0 - input.life);
  } else if (pType == 5u) {
    // Cosmic dust - soft fuzzy
    let dust = smoothstep(1.0, 0.3, dist);
    alpha = dust * 0.4;
  }

  alpha *= input.color.a;
  alpha *= smoothstep(1.2, 0.8, dist);

  return vec4f(color, alpha);
}
`;
