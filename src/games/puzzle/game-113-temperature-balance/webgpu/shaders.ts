/**
 * WGSL Shaders - Temperature Balance
 * Thermal / Fire & Ice Theme
 * Game #113
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

// Temperature gradient background (hot side, cold side)
fn thermalGradient(uv: vec2f, time: f32) -> vec3f {
  // Hot (red) on left, cold (blue) on right with middle transition
  let hotColor = vec3f(0.15, 0.05, 0.02);
  let coldColor = vec3f(0.02, 0.05, 0.15);
  let midColor = vec3f(0.1, 0.08, 0.1);

  let t = uv.x;
  var color: vec3f;

  if (t < 0.5) {
    color = mix(hotColor, midColor, t * 2.0);
  } else {
    color = mix(midColor, coldColor, (t - 0.5) * 2.0);
  }

  return color;
}

// Heat shimmer effect
fn heatShimmer(uv: vec2f, time: f32) -> f32 {
  let distortion = fbm(vec2f(uv.x * 10.0, uv.y * 5.0 - time * 2.0));
  return distortion * 0.02 * (1.0 - uv.x); // More on hot side
}

// Frost crystal pattern
fn frostPattern(uv: vec2f, time: f32) -> f32 {
  let center = vec2f(0.85, 0.5);
  let dist = distance(uv, center);
  let angle = atan2(uv.y - center.y, uv.x - center.x);

  let crystal = sin(angle * 6.0 + time * 0.5) * 0.5 + 0.5;
  let radial = sin(dist * 30.0 - time) * 0.5 + 0.5;

  return crystal * radial * smoothstep(0.5, 0.1, dist) * uv.x; // More on cold side
}

// Rising heat waves
fn heatWaves(uv: vec2f, time: f32) -> f32 {
  let wave1 = sin(uv.y * 20.0 - time * 3.0 + uv.x * 5.0) * 0.5 + 0.5;
  let wave2 = sin(uv.y * 15.0 - time * 2.5 + uv.x * 3.0) * 0.5 + 0.5;
  let intensity = (1.0 - uv.x) * (1.0 - uv.y);
  return wave1 * wave2 * intensity * 0.1;
}

// Falling snow/ice particles effect
fn iceParticles(uv: vec2f, time: f32) -> f32 {
  var brightness = 0.0;
  let scale = 15.0;

  for (var i = 0; i < 3; i++) {
    let layer = f32(i);
    let speed = 0.3 + layer * 0.1;
    let offset = layer * 100.0;

    let pos = vec2f(
      uv.x * scale + offset,
      (uv.y + time * speed) * scale
    );

    let cell = floor(pos);
    let cellUv = fract(pos);

    let particlePos = vec2f(
      hash(cell + offset),
      hash(cell + offset + 50.0)
    );

    let dist = distance(cellUv, particlePos);

    if (dist < 0.1) {
      let twinkle = sin(time * 5.0 + hash(cell) * 6.28) * 0.3 + 0.7;
      brightness += (1.0 - dist / 0.1) * twinkle * uv.x; // More on cold side
    }
  }

  return brightness * 0.3;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  var uv = input.uv;
  let time = uniforms.time;
  let intensity = uniforms.intensity;

  // Apply heat shimmer distortion
  uv.x += heatShimmer(uv, time);

  // Base thermal gradient
  var color = thermalGradient(uv, time);

  // Add heat waves on hot side
  let heatEffect = heatWaves(uv, time);
  color += vec3f(1.0, 0.3, 0.1) * heatEffect * intensity;

  // Add frost pattern on cold side
  let frost = frostPattern(uv, time);
  color += vec3f(0.6, 0.8, 1.0) * frost * 0.15 * intensity;

  // Add ice particles
  let ice = iceParticles(uv, time);
  color += vec3f(0.8, 0.9, 1.0) * ice * intensity;

  // Vignette
  let vignette = 1.0 - smoothstep(0.4, 0.9, distance(uv, vec2f(0.5)));
  color *= 0.8 + vignette * 0.2;

  return vec4f(color, 0.3);
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
    // Flame particle - orange/yellow with flicker
    let core = 1.0 - smoothstep(0.0, 0.3, dist);
    let outer = 1.0 - smoothstep(0.0, 0.5, dist);
    let flicker = sin(time * 15.0 + input.param1 * 10.0) * 0.2 + 0.8;

    let innerColor = vec3f(1.0, 0.9, 0.3); // Yellow core
    let outerColor = vec3f(1.0, 0.4, 0.1); // Orange outer

    color = mix(outerColor, innerColor, core) * flicker;
    alpha = outer * life;

  } else if (pType == 1) {
    // Ice crystal - blue with sparkle
    let crystal = 1.0 - smoothstep(0.0, 0.4, dist);
    let sparkle = sin(time * 8.0 + input.param1 * 20.0) * 0.3 + 0.7;
    let edges = abs(sin(atan2(uv.y - 0.5, uv.x - 0.5) * 6.0));

    color = vec3f(0.6, 0.85, 1.0) * sparkle + vec3f(1.0) * edges * 0.3;
    alpha = crystal * life * 0.9;

  } else if (pType == 2) {
    // Heat wave - distortion shimmer
    let wave = sin(uv.y * 10.0 + time * 5.0) * 0.5 + 0.5;
    let fade = 1.0 - dist * 2.0;
    color = vec3f(1.0, 0.5, 0.2) * wave;
    alpha = fade * life * 0.4;

  } else if (pType == 3) {
    // Frost particle - white/blue crystals
    let snowflake = 1.0 - smoothstep(0.0, 0.35, dist);
    let shimmer = sin(time * 4.0 + input.param1 * 15.0) * 0.2 + 0.8;
    color = vec3f(0.9, 0.95, 1.0) * shimmer;
    alpha = snowflake * life * 0.85;

  } else if (pType == 4) {
    // Spark/ember - bright point
    let spark = 1.0 - smoothstep(0.0, 0.25, dist);
    let twinkle = sin(time * 20.0 + input.param1 * 8.0) * 0.5 + 0.5;
    color = vec3f(1.0, 0.7, 0.3) * (0.8 + twinkle * 0.4);
    alpha = spark * life;

  } else {
    // Steam - white/gray wisps
    let steam = 1.0 - smoothstep(0.0, 0.5, dist);
    let drift = sin(time * 2.0 + input.param1 * 5.0) * 0.1 + 0.9;
    color = vec3f(0.9, 0.92, 0.95) * drift;
    alpha = steam * life * 0.5;
  }

  alpha *= uniforms.intensity;

  return vec4f(color, alpha);
}
`;
