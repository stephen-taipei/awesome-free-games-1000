/**
 * WebGPU Shaders - Snowflake Puzzle
 * Winter Wonderland / Frozen Crystal Theme
 * Game #102
 */

export const BACKGROUND_SHADER = `
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

fn winterSky(uv: vec2f, time: f32) -> vec3f {
  // Deep midnight blue gradient
  var color = mix(
    vec3f(0.02, 0.05, 0.15),
    vec3f(0.08, 0.15, 0.30),
    uv.y
  );

  // Aurora borealis
  let auroraY = uv.y * 0.5 + 0.3;
  let aurora1 = sin(uv.x * 8.0 + time * 0.3) * 0.5 + 0.5;
  let aurora2 = sin(uv.x * 12.0 - time * 0.5 + 1.0) * 0.5 + 0.5;
  let auroraBlend = aurora1 * aurora2;
  let auroraHeight = smoothstep(0.3, 0.7, auroraY) * smoothstep(0.9, 0.6, auroraY);

  let auroraColor = mix(
    vec3f(0.2, 0.8, 0.5), // Green
    vec3f(0.5, 0.3, 0.9), // Purple
    sin(uv.x * 5.0 + time * 0.2) * 0.5 + 0.5
  );

  color += auroraColor * auroraBlend * auroraHeight * 0.3;

  return color;
}

fn fallingSnow(uv: vec2f, time: f32) -> f32 {
  var snow = 0.0;

  for (var layer = 0; layer < 3; layer++) {
    let layerF = f32(layer);
    let scale = 20.0 + layerF * 10.0;
    let speed = 0.3 + layerF * 0.1;
    let size = 0.02 - layerF * 0.005;

    for (var i = 0; i < 20; i++) {
      let seed = f32(i) + layerF * 100.0;
      let x = hash(vec2f(seed, 0.0));
      let startY = hash(vec2f(seed, 1.0));
      let wobble = sin(time * 2.0 + seed * 5.0) * 0.02;

      let snowX = fract(x + wobble);
      let snowY = fract(startY - time * speed);

      let dist = length(uv - vec2f(snowX, snowY));
      let brightness = hash(vec2f(seed, 2.0)) * 0.5 + 0.5;
      snow += smoothstep(size, 0.0, dist) * brightness * (1.0 - layerF * 0.2);
    }
  }

  return snow;
}

fn crystalPattern(uv: vec2f, time: f32) -> f32 {
  let center = uv - 0.5;
  let angle = atan2(center.y, center.x);
  let dist = length(center);

  let branches = 6.0;
  let branchAngle = 6.28318 / branches;
  let normalizedAngle = (angle % branchAngle + branchAngle) % branchAngle;
  let arm = abs(normalizedAngle - branchAngle * 0.5) / (branchAngle * 0.5);

  // Crystal structure
  let crystal = sin(dist * 30.0 - time * 2.0) * 0.5 + 0.5;
  let symmetry = (1.0 - arm) * crystal;

  // Fade with distance
  let fade = smoothstep(0.5, 0.1, dist);

  return symmetry * fade * 0.15;
}

fn frostEdge(uv: vec2f, time: f32) -> f32 {
  let border = 0.05;
  let distFromEdge = min(min(uv.x, 1.0 - uv.x), min(uv.y, 1.0 - uv.y));

  if (distFromEdge < border * 2.0) {
    let frostNoise = noise(uv * 30.0 + time * 0.5);
    let intensity = smoothstep(border * 2.0, 0.0, distFromEdge);
    return intensity * frostNoise * 0.4;
  }

  return 0.0;
}

fn iceCrystals(uv: vec2f, time: f32) -> vec3f {
  var crystals = vec3f(0.0);

  for (var i = 0; i < 8; i++) {
    let seed = f32(i) * 1.234;
    let x = hash(vec2f(seed, 0.0));
    let y = hash(vec2f(seed, 1.0));
    let size = 0.02 + hash(vec2f(seed, 2.0)) * 0.02;

    let pos = vec2f(x, y);
    let dist = length(uv - pos);

    // Hexagonal crystal shape
    let angle = atan2(uv.y - y, uv.x - x);
    let hexagon = cos(angle * 6.0) * 0.3 + 0.7;

    let crystal = smoothstep(size * hexagon, 0.0, dist);
    let sparkle = sin(time * 5.0 + seed * 10.0) * 0.5 + 0.5;

    crystals += vec3f(0.7, 0.85, 1.0) * crystal * sparkle * 0.3;
  }

  return crystals;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  let uv = input.uv;
  let time = uniforms.time;

  // Winter night sky
  var color = winterSky(uv, time);

  // Crystal pattern overlay
  color += vec3f(0.5, 0.7, 1.0) * crystalPattern(uv, time);

  // Falling snow
  let snow = fallingSnow(uv, time);
  color += vec3f(1.0, 1.0, 1.0) * snow;

  // Frost on edges
  let frost = frostEdge(uv, time);
  color += vec3f(0.8, 0.9, 1.0) * frost;

  // Ice crystals
  color += iceCrystals(uv, time);

  // Overall intensity
  color *= uniforms.intensity;

  return vec4f(color, 0.25);
}
`;

export const PARTICLE_SHADER = `
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
  rotation: f32,
  particleType: f32,
  extra: f32,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;
@group(0) @binding(1) var<storage, read> particles: array<Particle>;

struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) uv: vec2f,
  @location(1) life: f32,
  @location(2) particleType: f32,
  @location(3) rotation: f32,
  @location(4) extra: f32,
}

@vertex
fn vertexMain(
  @builtin(vertex_index) vertexIndex: u32,
  @builtin(instance_index) instanceIndex: u32
) -> VertexOutput {
  let particle = particles[instanceIndex];

  var corners = array<vec2f, 6>(
    vec2f(-0.5, -0.5),
    vec2f(0.5, -0.5),
    vec2f(-0.5, 0.5),
    vec2f(-0.5, 0.5),
    vec2f(0.5, -0.5),
    vec2f(0.5, 0.5)
  );

  let corner = corners[vertexIndex];
  let cos_r = cos(particle.rotation);
  let sin_r = sin(particle.rotation);
  let rotated = vec2f(
    corner.x * cos_r - corner.y * sin_r,
    corner.x * sin_r + corner.y * cos_r
  );

  let lifeRatio = particle.life / particle.maxLife;
  let size = particle.size * (0.5 + lifeRatio * 0.5);

  let worldPos = vec2f(particle.x, particle.y) + rotated * size;
  let clipPos = vec2f(
    (worldPos.x / uniforms.width) * 2.0 - 1.0,
    1.0 - (worldPos.y / uniforms.height) * 2.0
  );

  var output: VertexOutput;
  output.position = vec4f(clipPos, 0.0, 1.0);
  output.uv = corner + 0.5;
  output.life = lifeRatio;
  output.particleType = particle.particleType;
  output.rotation = particle.rotation;
  output.extra = particle.extra;
  return output;
}

fn snowflakeShape(uv: vec2f, rotation: f32) -> f32 {
  let center = uv - 0.5;
  let angle = atan2(center.y, center.x) + rotation;
  let dist = length(center);

  let branches = 6.0;
  let branchAngle = 6.28318 / branches;
  let normalizedAngle = (angle % branchAngle + branchAngle) % branchAngle;
  let arm = abs(normalizedAngle - branchAngle * 0.5) / (branchAngle * 0.5);

  let mainArm = smoothstep(0.3, 0.0, arm) * smoothstep(0.5, 0.1, dist);
  let sideArms = smoothstep(0.5, 0.2, arm) * smoothstep(0.35, 0.15, dist) * smoothstep(0.1, 0.2, dist);

  return max(mainArm, sideArms * 0.7);
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  let uv = input.uv;
  let center = uv - 0.5;
  let dist = length(center);
  let angle = atan2(center.y, center.x);
  let pType = i32(input.particleType);

  var color: vec3f;
  var alpha: f32;

  // Type 0: Crystal - Ice crystal sparkle
  if (pType == 0) {
    let crystal = snowflakeShape(uv, input.rotation);
    let sparkle = sin(angle * 6.0 + uniforms.time * 10.0) * 0.3 + 0.7;
    alpha = crystal * sparkle * input.life;
    color = vec3f(0.85, 0.95, 1.0);
  }
  // Type 1: Snow - Soft snowflake
  else if (pType == 1) {
    let snow = snowflakeShape(uv, input.rotation);
    let softness = 1.0 - dist * 1.5;
    alpha = max(0.0, snow * softness) * input.life;
    color = vec3f(1.0, 1.0, 1.0);
  }
  // Type 2: Frost - Spreading ice
  else if (pType == 2) {
    let arms = 6.0;
    let armAngle = 6.28318 / arms;
    let normalizedAngle = (angle % armAngle + armAngle) % armAngle;
    let arm = 1.0 - abs(normalizedAngle - armAngle * 0.5) / (armAngle * 0.5);
    let frost = arm * (1.0 - dist * 2.0);
    alpha = max(0.0, frost) * input.life;
    color = vec3f(0.7, 0.85, 1.0);
  }
  // Type 3: Shimmer - Light reflection
  else if (pType == 3) {
    let sparkle = exp(-dist * 4.0);
    let twinkle = sin(uniforms.time * 15.0 + input.extra * 10.0) * 0.5 + 0.5;
    alpha = sparkle * twinkle * input.life;
    color = vec3f(1.0, 1.0, 1.0);
  }
  // Type 4: Match - Correct cell glow
  else if (pType == 4) {
    let ring = smoothstep(0.5, 0.3, dist) * smoothstep(0.1, 0.25, dist);
    let pulse = sin(uniforms.time * 8.0) * 0.2 + 0.8;
    alpha = ring * pulse * input.life;
    color = vec3f(0.5, 0.9, 1.0);
  }
  // Type 5: Burst - Victory explosion
  else if (pType == 5) {
    let crystal = snowflakeShape(uv, input.rotation + uniforms.time);
    let glow = 1.0 - dist * 2.0;
    alpha = max(0.0, max(crystal, glow * 0.5)) * input.life;
    // Rainbow ice
    let hue = fract(angle / 6.28318 + uniforms.time * 0.3);
    let h = hue * 6.0;
    let i = floor(h);
    let f = h - i;
    var r: f32; var g: f32; var b: f32;
    if (i == 0.0) { r = 1.0; g = f; b = 0.5; }
    else if (i == 1.0) { r = 1.0 - f * 0.5; g = 1.0; b = 0.5; }
    else if (i == 2.0) { r = 0.5; g = 1.0; b = 0.5 + f * 0.5; }
    else if (i == 3.0) { r = 0.5; g = 1.0 - f * 0.5; b = 1.0; }
    else if (i == 4.0) { r = 0.5 + f * 0.5; g = 0.5; b = 1.0; }
    else { r = 1.0; g = 0.5; b = 1.0 - f * 0.5; }
    color = vec3f(r, g, b);
  }
  else {
    let glow = 1.0 - dist * 2.0;
    alpha = max(0.0, glow) * input.life;
    color = vec3f(0.8, 0.9, 1.0);
  }

  alpha *= uniforms.intensity;
  return vec4f(color, alpha);
}
`;
