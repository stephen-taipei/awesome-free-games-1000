/**
 * WebGPU WGSL Shaders - Rune Puzzle
 * Mystical / Ancient Runes Theme
 * Game #121
 */

export const BACKGROUND_SHADER = /* wgsl */ `
struct Uniforms {
  time: f32,
  resolution: vec2<f32>,
  runesAligned: f32,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;

struct VertexOutput {
  @builtin(position) position: vec4<f32>,
  @location(0) uv: vec2<f32>,
}

@vertex
fn vertexMain(@builtin(vertex_index) vertexIndex: u32) -> VertexOutput {
  var pos = array<vec2<f32>, 4>(
    vec2<f32>(-1.0, -1.0),
    vec2<f32>(1.0, -1.0),
    vec2<f32>(-1.0, 1.0),
    vec2<f32>(1.0, 1.0)
  );

  var output: VertexOutput;
  output.position = vec4<f32>(pos[vertexIndex], 0.0, 1.0);
  output.uv = pos[vertexIndex] * 0.5 + 0.5;
  return output;
}

// Hash function for noise
fn hash(p: vec2<f32>) -> f32 {
  var p3 = fract(vec3<f32>(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

// 2D noise
fn noise(p: vec2<f32>) -> f32 {
  let i = floor(p);
  let f = fract(p);
  let u = f * f * (3.0 - 2.0 * f);

  return mix(
    mix(hash(i + vec2<f32>(0.0, 0.0)), hash(i + vec2<f32>(1.0, 0.0)), u.x),
    mix(hash(i + vec2<f32>(0.0, 1.0)), hash(i + vec2<f32>(1.0, 1.0)), u.x),
    u.y
  );
}

// Fractal noise
fn fbm(p: vec2<f32>) -> f32 {
  var value = 0.0;
  var amplitude = 0.5;
  var frequency = 1.0;
  var pos = p;

  for (var i = 0; i < 5; i++) {
    value += amplitude * noise(pos * frequency);
    amplitude *= 0.5;
    frequency *= 2.0;
  }

  return value;
}

// Magic circle pattern
fn magicCircle(uv: vec2<f32>, center: vec2<f32>, radius: f32, time: f32) -> f32 {
  let p = uv - center;
  let dist = length(p);
  let angle = atan2(p.y, p.x);

  // Concentric rings
  let rings = sin(dist * 30.0 - time * 2.0) * 0.5 + 0.5;
  let ringMask = smoothstep(radius + 0.05, radius, dist) * smoothstep(radius * 0.3, radius * 0.4, dist);

  // Rotating runes pattern
  let runePattern = sin(angle * 8.0 + time) * 0.5 + 0.5;
  let runeRing = smoothstep(0.02, 0.0, abs(dist - radius * 0.8)) * runePattern;

  // Inner glow
  let innerGlow = smoothstep(radius * 0.4, 0.0, dist) * 0.3;

  return (rings * ringMask * 0.3 + runeRing * 0.5 + innerGlow);
}

// Ancient symbols pattern
fn runePattern(uv: vec2<f32>, time: f32) -> f32 {
  let grid = floor(uv * 6.0);
  let local = fract(uv * 6.0);

  let h = hash(grid + floor(time * 0.1));
  if (h > 0.85) {
    // Vertical line
    let line = smoothstep(0.02, 0.0, abs(local.x - 0.5)) * step(0.2, local.y) * step(local.y, 0.8);
    return line * 0.3;
  } else if (h > 0.7) {
    // Cross
    let vline = smoothstep(0.02, 0.0, abs(local.x - 0.5));
    let hline = smoothstep(0.02, 0.0, abs(local.y - 0.5));
    return max(vline, hline) * 0.2;
  }

  return 0.0;
}

// Energy flow effect
fn energyFlow(uv: vec2<f32>, time: f32) -> f32 {
  let flow1 = sin(uv.x * 10.0 + time * 2.0) * sin(uv.y * 8.0 - time * 1.5);
  let flow2 = sin(uv.x * 8.0 - time * 1.8) * sin(uv.y * 12.0 + time * 2.2);
  return (flow1 + flow2) * 0.5 + 0.5;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4<f32> {
  let uv = input.uv;
  let time = uniforms.time;
  let aligned = uniforms.runesAligned;

  // Deep mystical background
  let bgDark = vec3<f32>(0.05, 0.05, 0.10);
  let bgPurple = vec3<f32>(0.15, 0.08, 0.20);

  // Nebula-like background
  let nebula = fbm(uv * 3.0 + time * 0.05);
  var color = mix(bgDark, bgPurple, nebula * 0.5);

  // Magic circle in center
  let center = vec2<f32>(0.5, 0.5);
  let circle = magicCircle(uv, center, 0.35, time);
  let purpleGlow = vec3<f32>(0.61, 0.35, 0.71);
  let greenGlow = vec3<f32>(0.18, 0.80, 0.44);
  let circleColor = mix(purpleGlow, greenGlow, aligned);
  color += circleColor * circle;

  // Floating rune symbols
  let runes = runePattern(uv + vec2<f32>(time * 0.02, time * 0.01), time);
  color += purpleGlow * runes * (1.0 - aligned);

  // Energy flow when aligned
  let energy = energyFlow(uv, time) * aligned * 0.15;
  color += greenGlow * energy;

  // Vignette
  let vignette = 1.0 - length(uv - center) * 0.8;
  color *= vignette;

  // Starfield
  let stars = noise(uv * 100.0 + time * 0.1);
  let starMask = smoothstep(0.95, 1.0, stars);
  color += vec3<f32>(1.0, 0.95, 0.9) * starMask * 0.5;

  // Pulsing glow based on alignment
  let pulse = sin(time * 3.0) * 0.1 + 0.9;
  let glowIntensity = aligned * 0.2 * pulse;
  color += greenGlow * glowIntensity * (1.0 - length(uv - center));

  return vec4<f32>(color, 1.0);
}
`;

export const PARTICLE_SHADER = /* wgsl */ `
struct Uniforms {
  time: f32,
  resolution: vec2<f32>,
  runesAligned: f32,
}

struct Particle {
  position: vec2<f32>,
  velocity: vec2<f32>,
  color: vec4<f32>,
  size: f32,
  life: f32,
  maxLife: f32,
  particleType: f32,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;
@group(0) @binding(1) var<storage, read> particles: array<Particle>;

struct VertexOutput {
  @builtin(position) position: vec4<f32>,
  @location(0) color: vec4<f32>,
  @location(1) uv: vec2<f32>,
  @location(2) particleType: f32,
  @location(3) life: f32,
}

@vertex
fn vertexMain(
  @builtin(vertex_index) vertexIndex: u32,
  @builtin(instance_index) instanceIndex: u32
) -> VertexOutput {
  let particle = particles[instanceIndex];

  var quadPos = array<vec2<f32>, 6>(
    vec2<f32>(-1.0, -1.0),
    vec2<f32>(1.0, -1.0),
    vec2<f32>(-1.0, 1.0),
    vec2<f32>(1.0, -1.0),
    vec2<f32>(1.0, 1.0),
    vec2<f32>(-1.0, 1.0)
  );

  let quad = quadPos[vertexIndex];
  let lifeRatio = particle.life / particle.maxLife;
  let size = particle.size * lifeRatio;

  let worldPos = particle.position + quad * size;
  let clipPos = vec2<f32>(
    (worldPos.x / uniforms.resolution.x) * 2.0 - 1.0,
    1.0 - (worldPos.y / uniforms.resolution.y) * 2.0
  );

  var output: VertexOutput;
  output.position = vec4<f32>(clipPos, 0.0, 1.0);
  output.color = particle.color;
  output.uv = quad * 0.5 + 0.5;
  output.particleType = particle.particleType;
  output.life = lifeRatio;
  return output;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4<f32> {
  let uv = input.uv;
  let center = vec2<f32>(0.5, 0.5);
  let dist = length(uv - center);
  let particleType = i32(input.particleType);
  let time = uniforms.time;

  var alpha = 0.0;
  var color = input.color.rgb;

  switch (particleType) {
    // Type 0: Rune symbol
    case 0: {
      // Circular rune with symbol
      let ring = smoothstep(0.45, 0.35, dist) - smoothstep(0.35, 0.25, dist);
      let inner = smoothstep(0.2, 0.0, dist);
      // Cross pattern inside
      let cross = smoothstep(0.05, 0.0, abs(uv.x - 0.5)) + smoothstep(0.05, 0.0, abs(uv.y - 0.5));
      let crossMask = smoothstep(0.3, 0.2, dist);
      alpha = (ring + inner * 0.5 + cross * crossMask * 0.3) * input.life;
    }

    // Type 1: Crystal shard
    case 1: {
      let crystal = 1.0 - smoothstep(0.0, 0.3, abs(uv.x - 0.5) + abs(uv.y - 0.5) * 1.5);
      let facet = abs(sin((uv.x + uv.y) * 10.0)) * 0.3 + 0.7;
      alpha = crystal * facet * input.life;
    }

    // Type 2: Energy orb
    case 2: {
      let core = smoothstep(0.3, 0.0, dist);
      let pulse = sin(time * 8.0 + dist * 15.0) * 0.3 + 0.7;
      let glow = smoothstep(0.5, 0.2, dist) * 0.5;
      alpha = (core + glow) * pulse * input.life;
    }

    // Type 3: Sparkle
    case 3: {
      let angle = atan2(uv.y - 0.5, uv.x - 0.5);
      let rays = pow(abs(sin(angle * 4.0)), 8.0);
      let sparkle = rays * smoothstep(0.5, 0.0, dist);
      let core = smoothstep(0.1, 0.0, dist);
      alpha = (sparkle * 0.7 + core) * input.life;
    }

    // Type 4: Arcane flame
    case 4: {
      let flame = smoothstep(0.5, 0.0, dist);
      let flicker = noise2D(uv * 5.0 + time * 3.0) * 0.4 + 0.6;
      let tip = smoothstep(0.3, 0.0, abs(uv.x - 0.5)) * (1.0 - uv.y);
      alpha = (flame * flicker + tip * 0.3) * input.life;
    }

    // Type 5: Glow orb
    case 5, default: {
      let glow = smoothstep(0.5, 0.0, dist);
      let pulse = sin(time * 4.0) * 0.15 + 0.85;
      alpha = glow * pulse * input.life;
    }
  }

  alpha *= input.color.a;

  return vec4<f32>(color, alpha);
}

fn noise2D(p: vec2<f32>) -> f32 {
  let i = floor(p);
  let f = fract(p);
  let u = f * f * (3.0 - 2.0 * f);

  let a = fract(sin(dot(i, vec2<f32>(127.1, 311.7))) * 43758.5453);
  let b = fract(sin(dot(i + vec2<f32>(1.0, 0.0), vec2<f32>(127.1, 311.7))) * 43758.5453);
  let c = fract(sin(dot(i + vec2<f32>(0.0, 1.0), vec2<f32>(127.1, 311.7))) * 43758.5453);
  let d = fract(sin(dot(i + vec2<f32>(1.0, 1.0), vec2<f32>(127.1, 311.7))) * 43758.5453);

  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}
`;
