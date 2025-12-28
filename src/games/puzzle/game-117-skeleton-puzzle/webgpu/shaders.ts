/**
 * WGSL Shaders - Skeleton Puzzle
 * Archaeology / Museum Theme
 * Game #117
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

// Ancient stone texture
fn stoneTexture(uv: vec2f) -> f32 {
  let n1 = noise(uv * 40.0);
  let n2 = noise(uv * 80.0 + 50.0);
  let n3 = noise(uv * 160.0);
  return n1 * 0.5 + n2 * 0.3 + n3 * 0.2;
}

// Crack pattern
fn crackPattern(uv: vec2f) -> f32 {
  let scaled = uv * 20.0;
  let cell = floor(scaled);
  let local = fract(scaled);

  let random = hash(cell);
  let crackIntensity = step(0.7, random);

  let edge = min(min(local.x, 1.0 - local.x), min(local.y, 1.0 - local.y));
  return crackIntensity * smoothstep(0.0, 0.1, edge) * (1.0 - smoothstep(0.1, 0.15, edge));
}

// Museum wall background
fn museumWall(uv: vec2f, time: f32) -> vec3f {
  // Base wall color - warm beige
  let baseColor = vec3f(0.18, 0.15, 0.12);

  // Stone texture
  let stoneTex = stoneTexture(uv);
  let wallColor = baseColor * (0.85 + stoneTex * 0.3);

  // Add subtle cracks
  let cracks = crackPattern(uv);
  let crackedWall = wallColor * (1.0 - cracks * 0.2);

  return crackedWall;
}

// Display case area
fn displayCase(uv: vec2f, time: f32) -> vec3f {
  let caseMargin = 0.05;
  let divider = 0.7;

  let inCase = step(caseMargin, uv.x) * step(uv.x, 1.0 - caseMargin) *
               step(caseMargin, uv.y) * step(uv.y, divider);

  // Glass case with slight tint
  let caseColor = vec3f(0.08, 0.08, 0.1);

  // Velvet backing
  let velvetColor = vec3f(0.12, 0.08, 0.06);

  return mix(caseColor, velvetColor, inCase * 0.8);
}

// Museum spotlights
fn spotlights(uv: vec2f, time: f32) -> f32 {
  var light = 0.0;

  // Main center spotlight
  let centerDist = distance(uv, vec2f(0.5, 0.35));
  let mainSpot = 1.0 - smoothstep(0.0, 0.4, centerDist);
  light += mainSpot * 0.5;

  // Side accent lights
  let leftDist = distance(uv, vec2f(0.2, 0.3));
  let rightDist = distance(uv, vec2f(0.8, 0.3));
  light += (1.0 - smoothstep(0.0, 0.25, leftDist)) * 0.2;
  light += (1.0 - smoothstep(0.0, 0.25, rightDist)) * 0.2;

  // Subtle flicker
  let flicker = sin(time * 0.3) * 0.02 + 1.0;

  return light * flicker;
}

// Floating dust particles (in shader)
fn dustMotes(uv: vec2f, time: f32) -> f32 {
  var dust = 0.0;

  for (var i = 0; i < 8; i++) {
    let fi = f32(i);
    let seed = fi * 1.618;

    let dustX = fract(seed * 0.7 + time * 0.01 * (0.5 + fract(seed * 3.0)));
    let dustY = fract(seed * 1.3 + time * 0.008 * (0.3 + fract(seed * 5.0)));

    let dustPos = vec2f(dustX, dustY * 0.7);
    let dustDist = distance(uv, dustPos);

    let sparkle = sin(time * (3.0 + fi) + fi * 10.0) * 0.5 + 0.5;
    dust += smoothstep(0.015, 0.0, dustDist) * sparkle * 0.3;
  }

  return dust;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  let uv = input.uv;
  let time = uniforms.time;
  let intensity = uniforms.intensity;

  // Museum wall
  var color = museumWall(uv, time);

  // Display case area
  let caseArea = displayCase(uv, time);
  let inDisplayArea = step(0.05, uv.x) * step(uv.x, 0.95) *
                      step(0.04, uv.y) * step(uv.y, 0.7);
  color = mix(color, caseArea, inDisplayArea);

  // Spotlights
  let spotLight = spotlights(uv, time) * intensity;
  let warmLight = vec3f(1.0, 0.95, 0.8);
  color += warmLight * spotLight * 0.4;

  // Ambient dust
  let dust = dustMotes(uv, time) * intensity;
  color += vec3f(1.0, 0.9, 0.7) * dust;

  // Vignette
  let center = vec2f(0.5);
  let vignette = 1.0 - smoothstep(0.3, 0.9, distance(uv, center));
  color *= 0.7 + vignette * 0.3;

  // Amber tint
  color = mix(color, color * vec3f(1.1, 0.95, 0.85), 0.2);

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
    // Dust particle - soft tan cloud
    let dust = 1.0 - smoothstep(0.0, 0.5, dist);
    let drift = sin(time * 2.0 + input.param1 * 10.0) * 0.1 + 0.9;
    color = vec3f(0.8, 0.7, 0.5) * drift;
    alpha = dust * life * 0.5;

  } else if (pType == 1) {
    // Bone shimmer - warm ivory glow
    let shimmer = 1.0 - smoothstep(0.0, 0.4, dist);
    let pulse = sin(time * 5.0 + input.param1 * 8.0) * 0.3 + 0.7;
    color = vec3f(0.95, 0.92, 0.8) * pulse;
    alpha = shimmer * life * 0.8;

  } else if (pType == 2) {
    // Discovery energy - golden burst
    let energy = 1.0 - smoothstep(0.0, 0.35, dist);
    let burst = pow(energy, 1.5);
    let sparkle = sin(time * 15.0 + input.param1 * 20.0) * 0.2 + 0.8;
    color = vec3f(1.0, 0.85, 0.4) * sparkle;
    alpha = burst * life * 0.9;

  } else if (pType == 3) {
    // Trail particle - fading dust
    let trail = 1.0 - smoothstep(0.0, 0.4, dist);
    color = vec3f(0.7, 0.6, 0.45);
    alpha = trail * life * 0.4;

  } else if (pType == 4) {
    // Excavate particle - dirt burst
    let dirt = 1.0 - smoothstep(0.0, 0.5, dist);
    let scatter = sin(time * 8.0 + input.param1 * 12.0) * 0.15 + 0.85;
    color = vec3f(0.5, 0.4, 0.3) * scatter;
    alpha = dirt * life * 0.6;

  } else {
    // Magic/ancient glow - amber mystical
    let glow = 1.0 - smoothstep(0.0, 0.3, dist);
    let pulse = sin(time * 3.0 + input.param1 * 5.0) * 0.4 + 0.6;
    let ring = smoothstep(0.2, 0.3, dist) * (1.0 - smoothstep(0.3, 0.4, dist));
    color = vec3f(1.0, 0.7, 0.3) * (0.7 + pulse * 0.3);
    alpha = (glow + ring * 0.5) * life;
  }

  alpha *= uniforms.intensity;

  return vec4f(color, alpha);
}
`;
