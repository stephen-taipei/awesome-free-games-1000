/**
 * WGSL Shaders - Paper Plane Puzzle
 * Origami Workshop / Japanese Zen Garden Theme
 * Game #053
 */

export const backgroundShader = /* wgsl */ `
struct Uniforms {
  time: f32,
  aspect: f32,
  _pad1: f32,
  _pad2: f32,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;

struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) uv: vec2f,
}

@vertex
fn vertexMain(@builtin(vertex_index) vertexIndex: u32) -> VertexOutput {
  var pos = array<vec2f, 6>(
    vec2f(-1.0, -1.0), vec2f(1.0, -1.0), vec2f(-1.0, 1.0),
    vec2f(-1.0, 1.0), vec2f(1.0, -1.0), vec2f(1.0, 1.0)
  );

  var output: VertexOutput;
  output.position = vec4f(pos[vertexIndex], 0.0, 1.0);
  output.uv = pos[vertexIndex] * 0.5 + 0.5;
  return output;
}

// Hash function
fn hash(p: vec2f) -> f32 {
  let k = vec2f(0.3183099, 0.3678794);
  var q = p * k + k.yx;
  return fract(16.0 * k.x * fract(q.x * q.y * (q.x + q.y)));
}

// Noise
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

// FBM for clouds
fn fbm(p: vec2f) -> f32 {
  var value = 0.0;
  var amplitude = 0.5;
  var pos = p;

  for (var i = 0; i < 4; i++) {
    value += amplitude * noise(pos);
    amplitude *= 0.5;
    pos *= 2.0;
  }
  return value;
}

// Washi paper texture
fn washiTexture(uv: vec2f) -> f32 {
  let fiber1 = noise(uv * 100.0) * 0.3;
  let fiber2 = noise(uv * 80.0 + vec2f(50.0, 30.0)) * 0.2;
  let fiber3 = noise(uv * 120.0 + vec2f(20.0, 80.0)) * 0.15;
  return fiber1 + fiber2 + fiber3;
}

// Tatami mat pattern
fn tatamiPattern(uv: vec2f) -> f32 {
  let gridSize = 0.15;
  let gx = fract(uv.x / gridSize);
  let gy = fract(uv.y / gridSize);

  // Weave pattern
  let weave = sin(gx * 30.0) * sin(gy * 30.0) * 0.5 + 0.5;

  // Border lines
  let borderX = smoothstep(0.0, 0.02, gx) * smoothstep(1.0, 0.98, gx);
  let borderY = smoothstep(0.0, 0.02, gy) * smoothstep(1.0, 0.98, gy);

  return weave * borderX * borderY;
}

// Cherry blossom branch hint
fn branchPattern(uv: vec2f, time: f32) -> f32 {
  // Curved branch
  let curve = sin(uv.x * 5.0 + time * 0.1) * 0.1;
  let branch = smoothstep(0.02, 0.0, abs(uv.y - 0.8 - curve));

  return branch * smoothstep(0.0, 0.4, uv.x) * smoothstep(1.0, 0.6, uv.x);
}

// Soft clouds
fn clouds(uv: vec2f, time: f32) -> f32 {
  let cloudUV = uv * vec2f(2.0, 1.0) + vec2f(time * 0.02, 0.0);
  let cloud = fbm(cloudUV * 3.0);
  return smoothstep(0.4, 0.7, cloud) * 0.4;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  let uv = input.uv;
  let time = uniforms.time;

  // Soft gradient sky - spring colors
  let skyTop = vec3f(0.85, 0.92, 0.98);     // Light blue
  let skyBottom = vec3f(0.95, 0.88, 0.92);  // Soft pink
  var color = mix(skyBottom, skyTop, uv.y);

  // Add soft clouds
  let cloudLayer = clouds(uv, time);
  color = mix(color, vec3f(1.0, 1.0, 1.0), cloudLayer);

  // Tatami floor hint at bottom
  let floorY = smoothstep(0.15, 0.0, uv.y);
  let tatami = tatamiPattern(uv);
  let floorColor = mix(
    vec3f(0.75, 0.68, 0.55),  // Natural tatami
    vec3f(0.82, 0.75, 0.62),  // Lighter tatami
    tatami
  );
  color = mix(color, floorColor, floorY * 0.6);

  // Washi paper overlay texture
  let washi = washiTexture(uv);
  color += vec3f(washi * 0.03);

  // Cherry blossom branch accent
  let branch = branchPattern(uv, time);
  let branchColor = vec3f(0.35, 0.25, 0.2);
  color = mix(color, branchColor, branch * 0.4);

  // Soft vignette
  let vignette = 1.0 - length(uv - 0.5) * 0.4;
  color *= vignette;

  // Subtle paper grain
  let grain = hash(uv * 500.0 + time * 0.1) * 0.02;
  color += grain;

  return vec4f(color, 1.0);
}
`;

export const particleShader = /* wgsl */ `
struct Uniforms {
  time: f32,
  aspect: f32,
  _pad1: f32,
  _pad2: f32,
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
  r: f32,
  g: f32,
  b: f32,
  a: f32,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;
@group(0) @binding(1) var<storage, read> particles: array<Particle>;

struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) uv: vec2f,
  @location(1) color: vec4f,
  @location(2) life: f32,
  @location(3) particleType: f32,
  @location(4) rotation: f32,
}

@vertex
fn vertexMain(
  @builtin(vertex_index) vertexIndex: u32,
  @builtin(instance_index) instanceIndex: u32
) -> VertexOutput {
  let particle = particles[instanceIndex];

  var corner = array<vec2f, 6>(
    vec2f(-1.0, -1.0), vec2f(1.0, -1.0), vec2f(-1.0, 1.0),
    vec2f(-1.0, 1.0), vec2f(1.0, -1.0), vec2f(1.0, 1.0)
  );

  let lifeRatio = particle.life / particle.maxLife;
  var size = particle.size;

  // Type-specific size modulation
  let pType = u32(particle.particleType);
  if (pType == 0u) { // petal
    size *= 0.8 + sin(uniforms.time * 2.0 + particle.x * 10.0) * 0.2;
  } else if (pType == 1u) { // fold
    size *= lifeRatio * 1.2;
  } else if (pType == 2u) { // sparkle
    size *= 0.5 + sin(uniforms.time * 8.0 + particle.y * 20.0) * 0.5;
  } else if (pType == 3u) { // wind
    size *= 0.7 + lifeRatio * 0.3;
  } else if (pType == 4u) { // victory
    size *= 1.0 + sin(uniforms.time * 3.0) * 0.15;
  }

  // Calculate rotation for petals
  let rotation = uniforms.time * 2.0 + particle.x * 10.0 + particle.y * 7.0;

  let offset = corner[vertexIndex] * size;
  let pos = vec2f(
    (particle.x * 2.0 - 1.0) + offset.x,
    (particle.y * 2.0 - 1.0) + offset.y
  );

  var output: VertexOutput;
  output.position = vec4f(pos.x, pos.y, 0.0, 1.0);
  output.uv = corner[vertexIndex] * 0.5 + 0.5;
  output.color = vec4f(particle.r, particle.g, particle.b, particle.a * lifeRatio);
  output.life = lifeRatio;
  output.particleType = particle.particleType;
  output.rotation = rotation;
  return output;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  let uv = input.uv;
  let center = vec2f(0.5, 0.5);
  let dist = length(uv - center);

  let pType = u32(input.particleType);
  var alpha = 0.0;
  var color = input.color.rgb;

  if (pType == 0u) { // petal - sakura petal shape
    // Rotate UV for petal tumbling
    let angle = input.rotation;
    let c = cos(angle);
    let s = sin(angle);
    let rotUV = vec2f(
      (uv.x - 0.5) * c - (uv.y - 0.5) * s + 0.5,
      (uv.x - 0.5) * s + (uv.y - 0.5) * c + 0.5
    );

    // Petal shape (heart-like)
    let px = (rotUV.x - 0.5) * 2.0;
    let py = (rotUV.y - 0.5) * 2.0;
    let petal = 1.0 - length(vec2f(px, py - abs(px) * 0.5));
    alpha = smoothstep(0.2, 0.6, petal) * input.color.a;

    // Soft pink gradient
    color = mix(color, vec3f(1.0, 0.95, 0.96), 0.3);

  } else if (pType == 1u) { // fold - paper crease sparkle
    // Line-like for fold effect
    let foldDist = abs(uv.x - 0.5);
    alpha = exp(-foldDist * 8.0) * input.color.a;
    // Add shimmer
    let shimmer = sin(uniforms.time * 10.0 + uv.y * 30.0) * 0.3 + 0.7;
    color *= shimmer;

  } else if (pType == 2u) { // sparkle - gentle shimmer
    // Star-like sparkle
    let sparkle = pow(1.0 - dist * 2.0, 3.0);
    let ray = max(
      pow(abs(sin(atan2(uv.y - 0.5, uv.x - 0.5) * 4.0)), 10.0),
      0.0
    );
    alpha = (sparkle + ray * 0.3) * input.color.a;

  } else if (pType == 3u) { // wind - breeze particles
    // Elongated for wind effect
    let windDist = length(vec2f((uv.x - 0.5) * 0.3, uv.y - 0.5));
    alpha = exp(-windDist * 6.0) * input.color.a * 0.6;

  } else if (pType == 4u) { // victory - celebration burst
    // Rotating petal-like
    let angle = input.rotation * 0.5;
    let c = cos(angle);
    let s = sin(angle);
    let rotUV = vec2f(
      (uv.x - 0.5) * c - (uv.y - 0.5) * s + 0.5,
      (uv.x - 0.5) * s + (uv.y - 0.5) * c + 0.5
    );

    let px = (rotUV.x - 0.5) * 2.0;
    let py = (rotUV.y - 0.5) * 2.0;
    let shape = 1.0 - length(vec2f(px, py - abs(px) * 0.3));
    alpha = smoothstep(0.1, 0.5, shape) * input.color.a;

  } else { // ambient
    alpha = exp(-dist * 3.0) * input.color.a;
  }

  return vec4f(color, alpha);
}
`;

export const foldShader = /* wgsl */ `
struct Uniforms {
  time: f32,
  foldProgress: f32,
  foldX: f32,
  foldY: f32,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;

struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) uv: vec2f,
}

@vertex
fn vertexMain(@builtin(vertex_index) vertexIndex: u32) -> VertexOutput {
  var pos = array<vec2f, 6>(
    vec2f(-1.0, -1.0), vec2f(1.0, -1.0), vec2f(-1.0, 1.0),
    vec2f(-1.0, 1.0), vec2f(1.0, -1.0), vec2f(1.0, 1.0)
  );

  var output: VertexOutput;
  output.position = vec4f(pos[vertexIndex], 0.0, 1.0);
  output.uv = pos[vertexIndex] * 0.5 + 0.5;
  return output;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  let uv = input.uv;
  let time = uniforms.time;
  let progress = uniforms.foldProgress;

  if (progress <= 0.0) {
    return vec4f(0.0, 0.0, 0.0, 0.0);
  }

  let foldCenter = vec2f(uniforms.foldX, uniforms.foldY);
  let dist = length(uv - foldCenter);

  // Fold line glow
  let lineGlow = exp(-dist * 20.0) * progress;

  // Crease shimmer
  let shimmer = sin(time * 10.0 + dist * 50.0) * 0.3 + 0.7;

  // Gold/warm color for fold line
  let foldColor = vec3f(0.95, 0.85, 0.6);

  let alpha = lineGlow * shimmer;

  return vec4f(foldColor, alpha * 0.5);
}
`;

export const victoryShader = /* wgsl */ `
struct Uniforms {
  time: f32,
  intensity: f32,
  _pad1: f32,
  _pad2: f32,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;

struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) uv: vec2f,
}

@vertex
fn vertexMain(@builtin(vertex_index) vertexIndex: u32) -> VertexOutput {
  var pos = array<vec2f, 6>(
    vec2f(-1.0, -1.0), vec2f(1.0, -1.0), vec2f(-1.0, 1.0),
    vec2f(-1.0, 1.0), vec2f(1.0, -1.0), vec2f(1.0, 1.0)
  );

  var output: VertexOutput;
  output.position = vec4f(pos[vertexIndex], 0.0, 1.0);
  output.uv = pos[vertexIndex] * 0.5 + 0.5;
  return output;
}

fn hash(p: vec2f) -> f32 {
  return fract(sin(dot(p, vec2f(127.1, 311.7))) * 43758.5453);
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  let uv = input.uv;
  let time = uniforms.time;
  let intensity = uniforms.intensity;

  if (intensity <= 0.0) {
    return vec4f(0.0, 0.0, 0.0, 0.0);
  }

  let center = vec2f(0.5, 0.5);
  let dist = length(uv - center);

  // Radial light burst - soft and warm
  let burst = exp(-dist * 2.0 * (1.0 - intensity * 0.3));

  // Gentle rays
  let angle = atan2(uv.y - 0.5, uv.x - 0.5);
  let rays = pow(abs(sin(angle * 8.0 + time)), 4.0);
  let rayFade = exp(-dist * 1.5);

  // Cherry blossom pink tones
  let pink = vec3f(1.0, 0.85, 0.88);
  let white = vec3f(1.0, 0.98, 0.95);
  let gold = vec3f(1.0, 0.92, 0.7);

  var color = mix(pink, white, burst);
  color = mix(color, gold, rays * rayFade * 0.3);

  // Petal-like patterns
  let petal = sin(dist * 20.0 - time * 3.0) * 0.5 + 0.5;

  let alpha = (burst + rays * rayFade * 0.2) * intensity * 0.6;

  return vec4f(color, alpha);
}
`;
