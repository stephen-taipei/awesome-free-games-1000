/**
 * WGSL Shaders - Gravity Switch
 * Space / Cosmic Theme
 * Game #114
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

// Deep space gradient
fn spaceBackground(uv: vec2f) -> vec3f {
  let center = vec2f(0.5);
  let dist = distance(uv, center);

  let deepSpace = vec3f(0.02, 0.02, 0.08);
  let midSpace = vec3f(0.08, 0.05, 0.15);
  let outerSpace = vec3f(0.05, 0.02, 0.1);

  var color = mix(midSpace, deepSpace, dist * 1.5);
  color = mix(color, outerSpace, smoothstep(0.3, 0.7, dist));

  return color;
}

// Twinkling stars
fn stars(uv: vec2f, time: f32) -> f32 {
  var brightness = 0.0;

  for (var layer = 0; layer < 3; layer++) {
    let scale = 30.0 + f32(layer) * 15.0;
    let layerOffset = f32(layer) * 100.0;

    let cell = floor(uv * scale);
    let cellUv = fract(uv * scale);

    let starPos = vec2f(hash(cell + layerOffset), hash(cell + layerOffset + 50.0));
    let dist = distance(cellUv, starPos);

    if (dist < 0.08) {
      let twinkle = sin(time * (2.0 + hash(cell) * 3.0) + hash(cell + 1.0) * 6.28) * 0.5 + 0.5;
      let starBright = (1.0 - dist / 0.08) * (0.3 + twinkle * 0.7);
      starBright *= step(0.7, hash(cell + 30.0));
      brightness += starBright;
    }
  }

  return brightness;
}

// Nebula effect
fn nebula(uv: vec2f, time: f32) -> vec3f {
  let nebulaNoise = fbm(uv * 3.0 + vec2f(time * 0.02, -time * 0.01));
  let nebulaColor1 = vec3f(0.3, 0.1, 0.5) * nebulaNoise;
  let nebulaColor2 = vec3f(0.1, 0.2, 0.4) * (1.0 - nebulaNoise);
  return (nebulaColor1 + nebulaColor2) * 0.15;
}

// Gravity field visualization
fn gravityField(uv: vec2f, time: f32) -> f32 {
  let center = vec2f(0.5);
  let dist = distance(uv, center);
  let angle = atan2(uv.y - center.y, uv.x - center.x);

  // Rotating field lines
  let fieldLines = sin(angle * 8.0 - time * 2.0) * 0.5 + 0.5;
  let radialFade = smoothstep(0.5, 0.1, dist);

  return fieldLines * radialFade * 0.05;
}

// Warp speed lines
fn warpLines(uv: vec2f, time: f32) -> f32 {
  let center = vec2f(0.5);
  let dir = normalize(uv - center);
  let dist = distance(uv, center);

  let angle = atan2(dir.y, dir.x);
  let lines = sin(angle * 20.0 + time * 5.0) * 0.5 + 0.5;
  let intensity = smoothstep(0.1, 0.4, dist) * (1.0 - smoothstep(0.4, 0.6, dist));

  return lines * intensity * 0.03;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  let uv = input.uv;
  let time = uniforms.time;
  let intensity = uniforms.intensity;

  // Space background
  var color = spaceBackground(uv);

  // Add nebula
  color += nebula(uv, time);

  // Add stars
  let starBrightness = stars(uv, time);
  color += vec3f(starBrightness * 0.9, starBrightness * 0.95, starBrightness);

  // Add gravity field
  let field = gravityField(uv, time) * intensity;
  color += vec3f(0.0, 0.8, 1.0) * field;

  // Add warp lines
  let warp = warpLines(uv, time) * intensity;
  color += vec3f(0.5, 0.8, 1.0) * warp;

  // Vignette
  let vignette = 1.0 - smoothstep(0.3, 0.9, distance(uv, vec2f(0.5)));
  color *= 0.7 + vignette * 0.3;

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
    // Star particle - bright point
    let core = 1.0 - smoothstep(0.0, 0.2, dist);
    let glow = 1.0 - smoothstep(0.0, 0.5, dist);
    let twinkle = sin(time * 10.0 + input.param1 * 5.0) * 0.2 + 0.8;
    color = vec3f(0.9, 0.95, 1.0) * twinkle;
    alpha = (core + glow * 0.3) * life;

  } else if (pType == 1) {
    // Energy particle - cyan glow
    let energy = 1.0 - smoothstep(0.0, 0.4, dist);
    let pulse = sin(time * 8.0 + input.param1 * 10.0) * 0.2 + 0.8;
    color = vec3f(0.0, 0.8, 1.0) * pulse;
    alpha = energy * life * 0.9;

  } else if (pType == 2) {
    // Warp trail - stretched light
    let trail = 1.0 - abs(uv.y - 0.5) * 2.0;
    let streak = 1.0 - smoothstep(0.0, 0.3, dist);
    color = vec3f(0.5, 0.8, 1.0);
    alpha = trail * streak * life * 0.7;

  } else if (pType == 3) {
    // Trail particle - fading dot
    let dot = 1.0 - smoothstep(0.0, 0.35, dist);
    color = vec3f(0.3, 0.7, 1.0);
    alpha = dot * life * 0.6;

  } else if (pType == 4) {
    // Portal particle - swirling
    let angle = atan2(uv.y - 0.5, uv.x - 0.5);
    let swirl = sin(angle * 4.0 + time * 5.0 - dist * 10.0) * 0.5 + 0.5;
    let ring = smoothstep(0.3, 0.4, dist) * (1.0 - smoothstep(0.4, 0.5, dist));
    color = vec3f(0.2, 0.9, 0.5);
    alpha = (ring + swirl * 0.3) * life * 0.8;

  } else {
    // Spark particle - bright flash
    let spark = 1.0 - smoothstep(0.0, 0.3, dist);
    let flash = sin(time * 15.0 + input.param1 * 8.0) * 0.5 + 0.5;
    color = vec3f(1.0, 0.9, 0.6) * (0.7 + flash * 0.3);
    alpha = spark * life;
  }

  alpha *= uniforms.intensity;

  return vec4f(color, alpha);
}
`;
