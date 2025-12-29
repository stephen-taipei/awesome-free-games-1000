/**
 * WGSL Shaders - Billiard Puzzle
 * Pool Table / Classic Theme
 * Game #116
 */

export const BACKGROUND_SHADER = /* wgsl */`
struct Uniforms {
  time: f32,
  width: f32,
  height: f32,
  intensity: f32,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;

struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) uv: vec2f,
}

@vertex
fn vertexMain(@builtin(vertex_index) vertexIndex: u32) -> VertexOutput {
  var positions = array<vec2f, 6>(
    vec2f(-1.0, -1.0),
    vec2f(1.0, -1.0),
    vec2f(-1.0, 1.0),
    vec2f(-1.0, 1.0),
    vec2f(1.0, -1.0),
    vec2f(1.0, 1.0)
  );

  var output: VertexOutput;
  output.position = vec4f(positions[vertexIndex], 0.0, 1.0);
  output.uv = positions[vertexIndex] * 0.5 + 0.5;
  return output;
}

fn hash(p: vec2f) -> f32 {
  return fract(sin(dot(p, vec2f(127.1, 311.7))) * 43758.5453);
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

// Felt texture
fn feltTexture(uv: vec2f, time: f32) -> f32 {
  let n1 = noise(uv * 80.0);
  let n2 = noise(uv * 120.0 + 50.0);
  let n3 = noise(uv * 200.0);
  return n1 * 0.5 + n2 * 0.3 + n3 * 0.2;
}

// Wood grain for border
fn woodGrain(uv: vec2f) -> f32 {
  let stretched = vec2f(uv.x * 5.0, uv.y * 0.5);
  let grain = sin(stretched.x * 30.0 + noise(stretched * 3.0) * 10.0);
  return grain * 0.5 + 0.5;
}

// Table background
fn tableBackground(uv: vec2f, time: f32) -> vec3f {
  // Define table area (central green felt)
  let tableMargin = 0.08;
  let borderWidth = 0.05;

  let inTable = step(tableMargin, uv.x) * step(uv.x, 1.0 - tableMargin) *
                step(tableMargin, uv.y) * step(uv.y, 1.0 - tableMargin);

  let inBorder = step(tableMargin - borderWidth, uv.x) * step(uv.x, 1.0 - tableMargin + borderWidth) *
                 step(tableMargin - borderWidth, uv.y) * step(uv.y, 1.0 - tableMargin + borderWidth) *
                 (1.0 - inTable);

  // Background (dark room)
  let bgColor = vec3f(0.05, 0.08, 0.1);

  // Felt color with texture
  let feltBase = vec3f(0.05, 0.45, 0.25);
  let feltTexVal = feltTexture(uv, time);
  let feltColor = feltBase * (0.9 + feltTexVal * 0.2);

  // Wood border
  let woodBase = vec3f(0.35, 0.2, 0.1);
  let woodTexVal = woodGrain(uv);
  let woodColor = woodBase * (0.8 + woodTexVal * 0.4);

  // Combine
  var color = bgColor;
  color = mix(color, woodColor, inBorder);
  color = mix(color, feltColor, inTable);

  return color;
}

// Ambient light on table
fn ambientLight(uv: vec2f, time: f32) -> f32 {
  let center = vec2f(0.5);
  let dist = distance(uv, center);

  // Overhead light effect
  let light = 1.0 - smoothstep(0.0, 0.6, dist);
  let flicker = sin(time * 0.5) * 0.02 + 1.0;

  return light * 0.3 * flicker;
}

// Pocket indicators
fn pocketGlow(uv: vec2f, time: f32) -> f32 {
  let pockets = array<vec2f, 6>(
    vec2f(0.08, 0.08),
    vec2f(0.5, 0.06),
    vec2f(0.92, 0.08),
    vec2f(0.08, 0.92),
    vec2f(0.5, 0.94),
    vec2f(0.92, 0.92)
  );

  var glow = 0.0;
  for (var i = 0; i < 6; i++) {
    let pocketDist = distance(uv, pockets[i]);
    let pulse = sin(time * 2.0 + f32(i)) * 0.3 + 0.7;
    glow += smoothstep(0.04, 0.0, pocketDist) * pulse * 0.15;
  }

  return glow;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  let uv = input.uv;
  let time = uniforms.time;
  let intensity = uniforms.intensity;

  // Table background
  var color = tableBackground(uv, time);

  // Add ambient light
  let light = ambientLight(uv, time);
  color += vec3f(1.0, 0.95, 0.8) * light * intensity;

  // Add pocket glow
  let pocketGlowVal = pocketGlow(uv, time) * intensity;
  color += vec3f(0.2, 0.8, 0.4) * pocketGlowVal;

  // Vignette
  let center = vec2f(0.5);
  let vignette = 1.0 - smoothstep(0.4, 0.9, distance(uv, center));
  color *= 0.8 + vignette * 0.2;

  return vec4f(color, 0.25);
}
`;

export const PARTICLE_SHADER = /* wgsl */`
struct Uniforms {
  time: f32,
  width: f32,
  height: f32,
  intensity: f32,
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
  param1: f32,
  param2: f32,
  param3: f32,
  param4: f32,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;
@group(0) @binding(1) var<storage, read> particles: array<Particle>;

struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) uv: vec2f,
  @location(1) life: f32,
  @location(2) particleType: f32,
  @location(3) param1: f32,
  @location(4) param2: f32,
}

@vertex
fn vertexMain(
  @builtin(vertex_index) vertexIndex: u32,
  @builtin(instance_index) instanceIndex: u32
) -> VertexOutput {
  var corners = array<vec2f, 6>(
    vec2f(-1.0, -1.0),
    vec2f(1.0, -1.0),
    vec2f(-1.0, 1.0),
    vec2f(-1.0, 1.0),
    vec2f(1.0, -1.0),
    vec2f(1.0, 1.0)
  );

  let particle = particles[instanceIndex];
  let corner = corners[vertexIndex];

  let lifeRatio = particle.life / particle.maxLife;
  let size = particle.size * lifeRatio;

  let x = (particle.x / uniforms.width) * 2.0 - 1.0;
  let y = 1.0 - (particle.y / uniforms.height) * 2.0;

  let sizeX = size / uniforms.width * 2.0;
  let sizeY = size / uniforms.height * 2.0;

  var output: VertexOutput;
  output.position = vec4f(x + corner.x * sizeX, y + corner.y * sizeY, 0.0, 1.0);
  output.uv = corner * 0.5 + 0.5;
  output.life = lifeRatio;
  output.particleType = particle.particleType;
  output.param1 = particle.param1;
  output.param2 = particle.param2;

  return output;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  let uv = input.uv;
  let center = vec2f(0.5);
  let dist = distance(uv, center);
  let life = input.life;
  let pType = i32(input.particleType);
  let time = uniforms.time;

  var color: vec3f;
  var alpha: f32;

  if (pType == 0) {
    // Chalk dust - soft blue cloud
    let dust = 1.0 - smoothstep(0.0, 0.5, dist);
    let scatter = sin(time * 10.0 + input.param1 * 20.0) * 0.1 + 0.9;
    color = vec3f(0.4, 0.6, 0.9) * scatter;
    alpha = dust * life * 0.4;

  } else if (pType == 1) {
    // Ball impact - bright flash
    let impact = 1.0 - smoothstep(0.0, 0.4, dist);
    let burst = pow(impact, 1.5);
    // Color from param1 (ball color encoded)
    color = vec3f(input.param1, input.param2, 0.3);
    alpha = burst * life * 0.9;

  } else if (pType == 2) {
    // Collision spark - white flash
    let spark = 1.0 - smoothstep(0.0, 0.3, dist);
    let flash = sin(time * 30.0) * 0.2 + 0.8;
    color = vec3f(1.0, 0.95, 0.8) * flash;
    alpha = spark * life;

  } else if (pType == 3) {
    // Pocket swirl - green glow
    let angle = atan2(uv.y - 0.5, uv.x - 0.5);
    let swirl = sin(angle * 4.0 + time * 5.0 - dist * 8.0) * 0.5 + 0.5;
    let ring = smoothstep(0.3, 0.4, dist) * (1.0 - smoothstep(0.4, 0.5, dist));
    color = vec3f(0.2, 0.9, 0.4);
    alpha = (ring + swirl * 0.3) * life * 0.7;

  } else if (pType == 4) {
    // Trail particle - fading dot
    let trail = 1.0 - smoothstep(0.0, 0.4, dist);
    color = vec3f(input.param1, input.param2, 0.4);
    alpha = trail * life * 0.5;

  } else {
    // Sparkle - celebration
    let sparkle = 1.0 - smoothstep(0.0, 0.25, dist);
    let twinkle = sin(time * 15.0 + input.param1 * 10.0) * 0.5 + 0.5;
    color = vec3f(1.0, 0.9, 0.5) * (0.7 + twinkle * 0.3);
    alpha = sparkle * life;
  }

  alpha *= uniforms.intensity;

  return vec4f(color, alpha);
}
`;
