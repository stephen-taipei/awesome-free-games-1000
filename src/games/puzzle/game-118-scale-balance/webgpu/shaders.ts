/**
 * WGSL Shaders - Scale Balance
 * Physics / Equilibrium Theme
 * Game #118
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

// Brass/metal texture
fn metalTexture(uv: vec2f, time: f32) -> f32 {
  let n1 = noise(uv * 60.0);
  let n2 = noise(uv * 120.0 + 30.0);
  let shimmer = sin(time * 0.5 + uv.x * 10.0) * 0.05 + 0.95;
  return (n1 * 0.5 + n2 * 0.5) * shimmer;
}

// Workshop background
fn workshopBackground(uv: vec2f, time: f32) -> vec3f {
  // Dark workshop atmosphere
  let baseColor = vec3f(0.08, 0.08, 0.12);

  // Wooden workbench gradient
  let benchY = 0.75;
  let onBench = step(benchY, uv.y);
  let benchColor = vec3f(0.15, 0.1, 0.07);
  let woodGrain = noise(vec2f(uv.x * 50.0, uv.y * 5.0)) * 0.1;

  var color = mix(baseColor, benchColor + woodGrain, onBench);

  // Subtle wall texture
  let wallTex = noise(uv * 80.0) * 0.03;
  color += vec3f(wallTex);

  return color;
}

// Scale stand glow
fn scaleGlow(uv: vec2f, time: f32) -> f32 {
  let centerX = 0.5;
  let centerY = 0.4;

  let dist = distance(uv, vec2f(centerX, centerY));
  let glow = 1.0 - smoothstep(0.0, 0.25, dist);

  let pulse = sin(time * 2.0) * 0.1 + 0.9;

  return glow * pulse * 0.15;
}

// Equilibrium indicator
fn equilibriumRings(uv: vec2f, time: f32) -> f32 {
  let center = vec2f(0.5, 0.4);
  let dist = distance(uv, center);

  // Concentric rings
  var rings = 0.0;
  for (var i = 0; i < 3; i++) {
    let radius = 0.08 + f32(i) * 0.05 + sin(time + f32(i)) * 0.01;
    let ring = smoothstep(radius - 0.005, radius, dist) * (1.0 - smoothstep(radius, radius + 0.005, dist));
    rings += ring * 0.3;
  }

  return rings;
}

// Weight particles in background
fn floatingMotes(uv: vec2f, time: f32) -> f32 {
  var motes = 0.0;

  for (var i = 0; i < 6; i++) {
    let fi = f32(i);
    let seed = fi * 1.618;

    let moteX = fract(seed * 0.7 + time * 0.02);
    let moteY = fract(seed * 1.3 + sin(time * 0.5 + fi) * 0.1);

    let motePos = vec2f(moteX, moteY * 0.7 + 0.1);
    let moteDist = distance(uv, motePos);

    let sparkle = sin(time * (4.0 + fi) + fi * 8.0) * 0.5 + 0.5;
    motes += smoothstep(0.01, 0.0, moteDist) * sparkle * 0.2;
  }

  return motes;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  let uv = input.uv;
  let time = uniforms.time;
  let intensity = uniforms.intensity;

  // Workshop background
  var color = workshopBackground(uv, time);

  // Scale glow
  let scaleLight = scaleGlow(uv, time) * intensity;
  color += vec3f(0.9, 0.7, 0.3) * scaleLight;

  // Equilibrium rings
  let rings = equilibriumRings(uv, time) * intensity;
  color += vec3f(0.4, 0.8, 0.6) * rings;

  // Floating motes
  let motes = floatingMotes(uv, time) * intensity;
  color += vec3f(1.0, 0.9, 0.6) * motes;

  // Vignette
  let center = vec2f(0.5);
  let vignette = 1.0 - smoothstep(0.3, 0.9, distance(uv, center));
  color *= 0.7 + vignette * 0.3;

  // Warm tint
  color = mix(color, color * vec3f(1.1, 0.95, 0.85), 0.15);

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
    // Weight particle - solid metallic
    let weight = 1.0 - smoothstep(0.0, 0.45, dist);
    let shine = sin(time * 3.0 + input.param1 * 10.0) * 0.2 + 0.8;
    color = vec3f(0.9, 0.7, 0.3) * shine; // Gold/brass
    alpha = weight * life * 0.8;

  } else if (pType == 1) {
    // Balance particle - green equilibrium
    let balance = 1.0 - smoothstep(0.0, 0.4, dist);
    let pulse = sin(time * 5.0) * 0.3 + 0.7;
    color = vec3f(0.3, 0.9, 0.5) * pulse;
    alpha = balance * life * 0.9;

  } else if (pType == 2) {
    // Tilt particle - red/orange warning
    let tilt = 1.0 - smoothstep(0.0, 0.35, dist);
    let flash = sin(time * 8.0 + input.param1 * 12.0) * 0.3 + 0.7;
    color = vec3f(1.0, 0.5, 0.2) * flash;
    alpha = tilt * life * 0.7;

  } else if (pType == 3) {
    // Trail particle - fading brass
    let trail = 1.0 - smoothstep(0.0, 0.4, dist);
    color = vec3f(0.7, 0.55, 0.25);
    alpha = trail * life * 0.4;

  } else if (pType == 4) {
    // Spark particle - bright gold flash
    let spark = 1.0 - smoothstep(0.0, 0.25, dist);
    let twinkle = sin(time * 15.0 + input.param1 * 20.0) * 0.4 + 0.6;
    color = vec3f(1.0, 0.95, 0.7) * twinkle;
    alpha = spark * life;

  } else {
    // Glow particle - warm ambient
    let glow = 1.0 - smoothstep(0.0, 0.5, dist);
    let pulse = sin(time * 2.0 + input.param1 * 5.0) * 0.2 + 0.8;
    color = vec3f(1.0, 0.8, 0.4) * pulse;
    alpha = glow * life * 0.5;
  }

  alpha *= uniforms.intensity;

  return vec4f(color, alpha);
}
`;
