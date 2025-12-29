/**
 * WebGPU Shaders - Ancient Script
 * Ancient Runes / Mystical Scrolls / Archaeology Theme
 * Game #141
 */

export const BACKGROUND_SHADER = /* wgsl */ `
struct Uniforms {
  time: f32,
  aspectRatio: f32,
  intensity: f32,
  padding: f32,
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

fn hash(p: vec2f) -> f32 {
  let k = vec2f(0.3183099, 0.3678794);
  let x = p * k + k.yx;
  return fract(16.0 * k.x * fract(x.x * x.y * (x.x + x.y)));
}

fn noise(p: vec2f) -> f32 {
  let i = floor(p);
  let f = fract(p);
  let u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i), hash(i + vec2f(1.0, 0.0)), u.x),
    mix(hash(i + vec2f(0.0, 1.0)), hash(i + vec2f(1.0, 1.0)), u.x),
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

// Parchment texture
fn parchmentTexture(p: vec2f, time: f32) -> f32 {
  var parch = 0.0;
  parch += fbm(p * 4.0) * 0.5;
  parch += fbm(p * 8.0 + time * 0.01) * 0.3;
  parch += noise(p * 20.0) * 0.2;
  return parch;
}

// Aged stain effect
fn agedStains(p: vec2f, time: f32) -> f32 {
  var stains = 0.0;
  stains += smoothstep(0.6, 0.4, fbm(p * 3.0 + vec2f(1.5, 2.3)));
  stains += smoothstep(0.7, 0.5, fbm(p * 2.5 + vec2f(4.1, 1.7))) * 0.7;
  stains += smoothstep(0.65, 0.45, fbm(p * 4.0 + vec2f(2.8, 3.9))) * 0.5;
  return stains * 0.3;
}

// Torch flicker effect
fn torchFlicker(uv: vec2f, time: f32, pos: vec2f) -> f32 {
  let dist = length(uv - pos);
  let flicker = sin(time * 8.0 + pos.x * 10.0) * 0.5 + 0.5;
  let glow = 1.0 / (dist * 8.0 + 0.5) * (0.5 + flicker * 0.5);
  return glow * 0.15;
}

// Ink drip pattern
fn inkPattern(p: vec2f, time: f32) -> f32 {
  let flow = fbm(vec2f(p.x * 2.0, p.y * 4.0 + time * 0.05));
  return smoothstep(0.6, 0.65, flow) * 0.2;
}

// Ancient rune glyph pattern
fn runePattern(p: vec2f, time: f32) -> f32 {
  let gridP = fract(p * 4.0) - 0.5;
  let cellId = floor(p * 4.0);
  let n = hash(cellId);

  // Different rune-like patterns
  var rune = 0.0;
  if (n < 0.25) {
    rune = smoothstep(0.05, 0.0, abs(gridP.x)) * smoothstep(0.3, 0.0, abs(gridP.y));
  } else if (n < 0.5) {
    rune = smoothstep(0.05, 0.0, abs(gridP.y)) * smoothstep(0.3, 0.0, abs(gridP.x));
  } else if (n < 0.75) {
    rune = smoothstep(0.1, 0.0, abs(length(gridP) - 0.15));
  } else {
    let diag = abs(gridP.x + gridP.y);
    rune = smoothstep(0.05, 0.0, diag) * 0.5;
  }

  return rune * 0.1 * (sin(time * 2.0 + n * 10.0) * 0.3 + 0.7);
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  let uv = input.uv;
  let time = uniforms.time;
  let intensity = uniforms.intensity;

  // Dark parchment base
  var color = vec3f(0.12, 0.09, 0.07);

  // Parchment texture
  let parch = parchmentTexture(uv, time);
  color += vec3f(0.08, 0.06, 0.04) * parch;

  // Aged stains
  let stains = agedStains(uv, time);
  color = mix(color, vec3f(0.15, 0.10, 0.06), stains * intensity);

  // Ink drip pattern
  let ink = inkPattern(uv, time);
  color = mix(color, vec3f(0.05, 0.04, 0.03), ink * intensity);

  // Ancient rune patterns in background
  let runeGlow = runePattern(uv, time);
  color += vec3f(0.83, 0.65, 0.45) * runeGlow * intensity;

  // Torch lighting from corners
  let torch1 = torchFlicker(uv, time, vec2f(0.0, 0.0));
  let torch2 = torchFlicker(uv, time + 1.5, vec2f(1.0, 0.0));
  let torch3 = torchFlicker(uv, time + 3.0, vec2f(0.0, 1.0));
  let torch4 = torchFlicker(uv, time + 4.5, vec2f(1.0, 1.0));

  color += vec3f(1.0, 0.6, 0.2) * (torch1 + torch2 + torch3 + torch4) * intensity;

  // Center scroll highlight
  let center = vec2f(0.5, 0.5);
  let centerDist = length(uv - center);
  let scrollGlow = smoothstep(0.5, 0.2, centerDist) * 0.1;
  color += vec3f(0.83, 0.65, 0.45) * scrollGlow * intensity;

  // Vignette
  let vignette = 1.0 - length(uv - center) * 0.7;
  color *= vignette;

  // Subtle color variation over time
  let timeShift = sin(time * 0.3) * 0.02;
  color += vec3f(timeShift, timeShift * 0.5, 0.0);

  return vec4f(color, 1.0);
}
`;

export const PARTICLE_SHADER = /* wgsl */ `
struct Uniforms {
  time: f32,
  aspectRatio: f32,
  intensity: f32,
  padding: f32,
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

  // Size varies by particle type
  var size = particle.size;
  let pType = u32(particle.particleType);

  if (pType == 0u) { // runeGlow
    size *= 0.8 + 0.4 * sin(uniforms.time * 6.0 + particle.position.x * 10.0);
  } else if (pType == 1u) { // decodeSparkle
    size *= lifeRatio * 1.5;
  } else if (pType == 2u) { // ancientDust
    size *= 0.6 + 0.4 * lifeRatio;
  } else if (pType == 3u) { // scrollFlame
    size *= 0.7 + 0.5 * sin(uniforms.time * 10.0);
  } else if (pType == 4u) { // inkDrip
    size *= 0.5 + 0.5 * (1.0 - lifeRatio);
  } else if (pType == 5u) { // revealFlash
    size *= 1.0 + (1.0 - lifeRatio) * 2.0;
  }

  let worldPos = particle.position * 2.0 - 1.0;
  let offset = corner * size * 0.025;

  var output: VertexOutput;
  output.position = vec4f(
    worldPos.x + offset.x / uniforms.aspectRatio,
    worldPos.y + offset.y,
    0.0,
    1.0
  );
  output.color = particle.color;
  output.uv = corner * 0.5 + 0.5;
  output.particleType = particle.particleType;
  output.life = lifeRatio;

  return output;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  let uv = input.uv;
  let center = vec2f(0.5, 0.5);
  let dist = length(uv - center);
  let pType = u32(input.particleType);
  let life = input.life;

  var alpha = 0.0;
  var color = input.color.rgb;

  if (pType == 0u) { // runeGlow - mystical glow around runes
    alpha = smoothstep(0.5, 0.1, dist) * life * 0.7;
    let pulse = sin(uniforms.time * 4.0 + dist * 8.0) * 0.5 + 0.5;
    color = mix(color, vec3f(1.0, 0.9, 0.7), pulse * 0.3);

  } else if (pType == 1u) { // decodeSparkle - sparkles when decoded
    let star = 1.0 - dist * 2.0;
    let angle = atan2(uv.y - 0.5, uv.x - 0.5);
    let rays = cos(angle * 4.0) * 0.3 + 0.7;
    alpha = smoothstep(0.5, 0.0, dist) * rays * life;
    color += vec3f(0.3, 0.25, 0.15) * star;

  } else if (pType == 2u) { // ancientDust - floating dust particles
    alpha = smoothstep(0.5, 0.2, dist) * life * 0.4;
    let grain = fract(sin(dot(uv, vec2f(12.9898, 78.233))) * 43758.5453);
    color = mix(color, vec3f(0.9, 0.85, 0.75), grain * 0.2);

  } else if (pType == 3u) { // scrollFlame - torch/candle flames
    let flame = smoothstep(0.5, 0.0, dist);
    let flicker = sin(uniforms.time * 15.0 + uv.y * 10.0) * 0.3 + 0.7;
    alpha = flame * flicker * life;
    color = mix(vec3f(1.0, 0.3, 0.1), vec3f(1.0, 0.8, 0.3), 1.0 - dist);

  } else if (pType == 4u) { // inkDrip - ink flowing on parchment
    alpha = smoothstep(0.5, 0.1, dist) * life * 0.6;
    color = mix(color, vec3f(0.08, 0.06, 0.04), 0.5);

  } else if (pType == 5u) { // revealFlash - flash when answer revealed
    let ring = abs(dist - 0.3);
    alpha = smoothstep(0.15, 0.0, ring) * life;
    color = mix(color, vec3f(1.0, 0.95, 0.85), 0.5);
  }

  alpha *= input.color.a * uniforms.intensity;

  return vec4f(color, alpha);
}
`;
