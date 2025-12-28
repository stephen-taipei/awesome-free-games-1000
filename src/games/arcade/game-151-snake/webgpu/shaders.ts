/**
 * WGSL Shaders - Snake
 * Reptile / Jungle / Neon Green Theme
 * Game #151
 */

export const BACKGROUND_SHADER = /* wgsl */ `
struct Uniforms {
  time: f32,
  aspectRatio: f32,
  snakeLength: f32,
  energy: f32,
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

// Hash for noise
fn hash21(p: vec2f) -> f32 {
  var p3 = fract(vec3f(p.x, p.y, p.x) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

// Smooth noise
fn noise(p: vec2f) -> f32 {
  let i = floor(p);
  let f = fract(p);
  let u = f * f * (3.0 - 2.0 * f);

  return mix(
    mix(hash21(i + vec2f(0.0, 0.0)), hash21(i + vec2f(1.0, 0.0)), u.x),
    mix(hash21(i + vec2f(0.0, 1.0)), hash21(i + vec2f(1.0, 1.0)), u.x),
    u.y
  );
}

// FBM for jungle texture
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

// Scale pattern for reptile look
fn scalePattern(uv: vec2f, time: f32) -> f32 {
  let scale = 40.0;
  var p = uv * scale;

  // Offset every other row
  p.x += step(1.0, mod(floor(p.y), 2.0)) * 0.5;

  let cell = fract(p);
  let d = length(cell - 0.5);

  return smoothstep(0.5, 0.3, d);
}

// Jungle vine pattern
fn vinePattern(uv: vec2f, time: f32) -> f32 {
  var value = 0.0;

  for (var i = 0; i < 3; i++) {
    let offset = f32(i) * 0.3;
    let x = uv.x * (2.0 + f32(i)) + offset;
    let wave = sin(x * 6.28318 + time * 0.5) * 0.1;
    let vine = smoothstep(0.02, 0.0, abs(uv.y - 0.5 - wave - offset * 0.3));
    value += vine * 0.3;
  }

  return value;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  var uv = input.uv;
  uv.x *= uniforms.aspectRatio;
  let time = uniforms.time;

  // Dark jungle base
  var color = vec3f(0.04, 0.08, 0.04);

  // Animated jungle mist
  let mist = fbm(uv * 3.0 + time * 0.05);
  color += vec3f(0.0, 0.15, 0.08) * mist * 0.3;

  // Scale pattern overlay
  let scales = scalePattern(uv, time);
  color += vec3f(0.0, 0.1, 0.05) * scales * 0.15;

  // Moving scale shimmer
  let shimmerWave = sin(uv.x * 20.0 + uv.y * 15.0 + time * 2.0) * 0.5 + 0.5;
  color += vec3f(0.0, 0.3, 0.15) * scales * shimmerWave * 0.1 * uniforms.energy;

  // Vine shadows
  let vines = vinePattern(uv, time);
  color = mix(color, vec3f(0.02, 0.05, 0.02), vines);

  // Grid lines (subtle)
  let gridSize = 20.0;
  let gridX = smoothstep(0.02, 0.0, abs(fract(uv.x * gridSize / uniforms.aspectRatio) - 0.5) - 0.48);
  let gridY = smoothstep(0.02, 0.0, abs(fract(uv.y * gridSize) - 0.5) - 0.48);
  color += vec3f(0.0, 0.2, 0.1) * (gridX + gridY) * 0.1;

  // Neon glow pulses based on snake length
  let pulse = sin(time * 3.0) * 0.5 + 0.5;
  let lengthGlow = min(uniforms.snakeLength / 20.0, 1.0);
  color += vec3f(0.0, 0.4, 0.2) * pulse * lengthGlow * 0.1;

  // Corner vignette (jungle darkness)
  let center = vec2f(0.5 * uniforms.aspectRatio, 0.5);
  let vignette = 1.0 - smoothstep(0.3, 0.8, length(uv - center) * 0.8);
  color *= 0.6 + vignette * 0.4;

  // Leaf shadows at edges
  let edgeNoise = fbm(uv * 8.0 + time * 0.02);
  let edgeDist = min(min(uv.x, uniforms.aspectRatio - uv.x), min(input.uv.y, 1.0 - input.uv.y));
  let edgeShadow = smoothstep(0.15, 0.0, edgeDist) * edgeNoise;
  color *= 1.0 - edgeShadow * 0.5;

  return vec4f(color, 1.0);
}
`;

export const PARTICLE_SHADER = /* wgsl */ `
struct Uniforms {
  time: f32,
  aspectRatio: f32,
  snakeLength: f32,
  energy: f32,
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

  var sizeMod = 1.0;
  let pType = u32(particle.particleType);

  if (pType == 0u) { // snakeTrail
    sizeMod = lifeRatio * 1.3;
  } else if (pType == 1u) { // foodEat
    sizeMod = 1.5 - lifeRatio * 0.5;
  } else if (pType == 2u) { // scaleShimmer
    sizeMod = 0.8 + sin(uniforms.time * 10.0 + particle.position.x * 20.0) * 0.3;
  } else if (pType == 3u) { // leafFloat
    sizeMod = 0.7 + lifeRatio * 0.3;
  } else if (pType == 4u) { // gameOverBurst
    sizeMod = 1.2 - lifeRatio * 0.4;
  } else if (pType == 5u) { // growPulse
    sizeMod = 1.0 + sin(uniforms.time * 8.0) * 0.4;
  }

  let size = particle.size * sizeMod * (0.5 + lifeRatio * 0.5);
  var pos = particle.position + corner * size * 0.025;
  pos.x /= uniforms.aspectRatio;

  var output: VertexOutput;
  output.position = vec4f(pos * 2.0 - 1.0, 0.0, 1.0);
  output.color = particle.color * lifeRatio;
  output.uv = corner * 0.5 + 0.5;
  output.particleType = particle.particleType;
  return output;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  let dist = length(input.uv - 0.5) * 2.0;
  let pType = u32(input.particleType);
  var alpha = 0.0;
  var color = input.color.rgb;

  if (pType == 0u) { // snakeTrail - glowing trail
    alpha = smoothstep(1.0, 0.2, dist) * 0.7;
    color = mix(color, vec3f(0.0, 1.0, 0.6), (1.0 - dist) * 0.3);
  } else if (pType == 1u) { // foodEat - burst effect
    alpha = smoothstep(1.0, 0.0, dist);
    let pulse = sin(uniforms.time * 10.0) * 0.3 + 0.7;
    color = color * pulse;
  } else if (pType == 2u) { // scaleShimmer - hexagonal shimmer
    let hex = abs(sin(atan2(input.uv.y - 0.5, input.uv.x - 0.5) * 3.0));
    alpha = smoothstep(1.0, 0.3, dist) * hex * 0.6;
    color = mix(color, vec3f(0.5, 1.0, 0.7), hex * 0.4);
  } else if (pType == 3u) { // leafFloat - soft leaf
    alpha = smoothstep(1.0, 0.3, dist) * 0.5;
    let leafShape = smoothstep(0.5, 0.3, abs(input.uv.x - 0.5) * 2.0);
    alpha *= leafShape;
  } else if (pType == 4u) { // gameOverBurst - red flash
    alpha = smoothstep(1.0, 0.0, dist) * 0.8;
    color = mix(color, vec3f(1.0, 0.2, 0.1), 0.5);
  } else if (pType == 5u) { // growPulse - expanding ring
    let ring = smoothstep(0.4, 0.35, dist) * smoothstep(0.25, 0.3, dist);
    alpha = ring * 0.8;
    color = vec3f(0.2, 1.0, 0.5);
  }

  alpha *= input.color.a;
  if (alpha < 0.01) {
    discard;
  }

  return vec4f(color, alpha);
}
`;
