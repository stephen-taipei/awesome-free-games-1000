/**
 * WGSL Shaders - Portal Puzzle
 * Portal / Dimensional Theme
 * Game #115
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

// Dark dimension background
fn dimensionBackground(uv: vec2f, time: f32) -> vec3f {
  let center = vec2f(0.5);
  let dist = distance(uv, center);

  // Deep purple void
  let voidColor = vec3f(0.1, 0.05, 0.15);
  let midColor = vec3f(0.15, 0.08, 0.2);
  let edgeColor = vec3f(0.08, 0.04, 0.12);

  var color = mix(midColor, voidColor, smoothstep(0.0, 0.5, dist));
  color = mix(color, edgeColor, smoothstep(0.4, 0.8, dist));

  return color;
}

// Dimensional rift effect
fn dimensionalRift(uv: vec2f, time: f32) -> f32 {
  let center = vec2f(0.5);
  let toCenter = uv - center;
  let dist = length(toCenter);
  let angle = atan2(toCenter.y, toCenter.x);

  // Swirling rift
  let riftNoise = fbm(vec2f(angle * 3.0 + time, dist * 5.0 - time * 0.5));
  let rift = smoothstep(0.3, 0.35, dist) * (1.0 - smoothstep(0.35, 0.5, dist));

  return rift * riftNoise * 0.3;
}

// Portal glow zones
fn portalGlow(uv: vec2f, time: f32) -> vec3f {
  // Orange portal area (left side)
  let orangeCenter = vec2f(0.2, 0.5);
  let orangeDist = distance(uv, orangeCenter);
  let orangePulse = sin(time * 3.0) * 0.1 + 0.9;
  let orangeGlow = smoothstep(0.25, 0.0, orangeDist) * orangePulse;
  let orangeColor = vec3f(1.0, 0.42, 0.21) * orangeGlow * 0.15;

  // Blue portal area (right side)
  let blueCenter = vec2f(0.8, 0.5);
  let blueDist = distance(uv, blueCenter);
  let bluePulse = sin(time * 3.0 + 3.14) * 0.1 + 0.9;
  let blueGlow = smoothstep(0.25, 0.0, blueDist) * bluePulse;
  let blueColor = vec3f(0.0, 0.71, 0.85) * blueGlow * 0.15;

  return orangeColor + blueColor;
}

// Floating particles in dimension
fn dimensionParticles(uv: vec2f, time: f32) -> f32 {
  var brightness = 0.0;

  for (var layer = 0; layer < 3; layer++) {
    let scale = 15.0 + f32(layer) * 10.0;
    let speed = 0.3 + f32(layer) * 0.2;
    let offset = vec2f(time * speed * 0.1, -time * speed * 0.05);

    let cell = floor((uv + offset) * scale);
    let cellUv = fract((uv + offset) * scale);

    let particlePos = vec2f(
      hash(cell + f32(layer) * 100.0),
      hash(cell + f32(layer) * 100.0 + 50.0)
    );

    let dist = distance(cellUv, particlePos);
    let flicker = sin(time * 5.0 + hash(cell) * 10.0) * 0.3 + 0.7;

    if (dist < 0.1) {
      let particleBright = (1.0 - dist / 0.1) * flicker;
      particleBright *= step(0.6, hash(cell + 30.0));
      brightness += particleBright * 0.3;
    }
  }

  return brightness;
}

// Grid lines (dimensional grid)
fn dimensionGrid(uv: vec2f, time: f32) -> f32 {
  let gridScale = 20.0;
  let gridUv = uv * gridScale;

  let lineX = smoothstep(0.02, 0.0, abs(fract(gridUv.x) - 0.5) - 0.48);
  let lineY = smoothstep(0.02, 0.0, abs(fract(gridUv.y) - 0.5) - 0.48);

  let grid = max(lineX, lineY);
  let pulse = sin(time * 2.0 + (gridUv.x + gridUv.y) * 0.5) * 0.3 + 0.7;

  return grid * pulse * 0.08;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  let uv = input.uv;
  let time = uniforms.time;
  let intensity = uniforms.intensity;

  // Dimension background
  var color = dimensionBackground(uv, time);

  // Add dimensional rift
  let rift = dimensionalRift(uv, time);
  color += vec3f(0.5, 0.2, 0.8) * rift;

  // Add grid
  let grid = dimensionGrid(uv, time) * intensity;
  color += vec3f(0.3, 0.5, 0.7) * grid;

  // Add portal glows
  color += portalGlow(uv, time) * intensity;

  // Add floating particles
  let particles = dimensionParticles(uv, time);
  color += vec3f(0.8, 0.7, 1.0) * particles;

  // Vignette
  let center = vec2f(0.5);
  let vignette = 1.0 - smoothstep(0.3, 0.9, distance(uv, center));
  color *= 0.7 + vignette * 0.3;

  return vec4f(color, 0.35);
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
    // Vortex particle - swirling effect
    let angle = atan2(uv.y - 0.5, uv.x - 0.5);
    let swirl = sin(angle * 6.0 + time * 8.0 - dist * 15.0) * 0.5 + 0.5;
    let ring = smoothstep(0.3, 0.4, dist) * (1.0 - smoothstep(0.4, 0.5, dist));

    // Color based on param1 (0 = orange, 1 = blue)
    if (input.param1 < 0.5) {
      color = vec3f(1.0, 0.42, 0.21);
    } else {
      color = vec3f(0.0, 0.71, 0.85);
    }
    alpha = (ring + swirl * 0.4) * life * 0.9;

  } else if (pType == 1) {
    // Energy particle - glowing orb
    let energy = 1.0 - smoothstep(0.0, 0.4, dist);
    let pulse = sin(time * 6.0 + input.param1 * 10.0) * 0.2 + 0.8;

    if (input.param2 < 0.5) {
      color = vec3f(1.0, 0.5, 0.2) * pulse;
    } else {
      color = vec3f(0.2, 0.7, 1.0) * pulse;
    }
    alpha = energy * life * 0.85;

  } else if (pType == 2) {
    // Teleport particle - flash effect
    let flash = 1.0 - smoothstep(0.0, 0.35, dist);
    let burst = pow(flash, 2.0);
    color = vec3f(1.0, 1.0, 0.9);
    alpha = burst * life;

  } else if (pType == 3) {
    // Trail particle - fading dot
    let dot = 1.0 - smoothstep(0.0, 0.35, dist);
    color = vec3f(0.8, 0.6, 1.0);
    alpha = dot * life * 0.6;

  } else if (pType == 4) {
    // Warp particle - stretched light
    let warp = 1.0 - smoothstep(0.0, 0.45, dist);
    let stretch = 1.0 - abs(uv.x - 0.5) * 1.5;
    color = vec3f(0.6, 0.4, 0.9);
    alpha = warp * stretch * life * 0.7;

  } else {
    // Spark particle - bright flash
    let spark = 1.0 - smoothstep(0.0, 0.25, dist);
    let flicker = sin(time * 20.0 + input.param1 * 15.0) * 0.3 + 0.7;

    if (input.param2 < 0.5) {
      color = vec3f(1.0, 0.7, 0.3) * flicker;
    } else {
      color = vec3f(0.3, 0.8, 1.0) * flicker;
    }
    alpha = spark * life;
  }

  alpha *= uniforms.intensity;

  return vec4f(color, alpha);
}
`;
