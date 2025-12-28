/**
 * WGSL Shaders - Block Fit
 * Architect's Blueprint / Construction Site Theme
 * Game #054
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
  return fract(sin(dot(p, vec2f(127.1, 311.7))) * 43758.5453);
}

// Blueprint grid pattern
fn blueprintGrid(uv: vec2f, time: f32) -> f32 {
  // Major grid lines
  let majorSize = 0.1;
  let majorX = abs(fract(uv.x / majorSize) - 0.5) * 2.0;
  let majorY = abs(fract(uv.y / majorSize) - 0.5) * 2.0;
  let major = max(
    smoothstep(0.96, 1.0, majorX),
    smoothstep(0.96, 1.0, majorY)
  );

  // Minor grid lines
  let minorSize = 0.025;
  let minorX = abs(fract(uv.x / minorSize) - 0.5) * 2.0;
  let minorY = abs(fract(uv.y / minorSize) - 0.5) * 2.0;
  let minor = max(
    smoothstep(0.92, 1.0, minorX),
    smoothstep(0.92, 1.0, minorY)
  ) * 0.3;

  return major + minor;
}

// Technical drawing marks
fn technicalMarks(uv: vec2f, time: f32) -> f32 {
  var marks = 0.0;

  // Corner brackets
  let cornerDist = 0.05;
  let cornerSize = 0.03;

  // Top-left corner
  if (uv.x < cornerDist && uv.y > 1.0 - cornerDist) {
    if (uv.x < cornerSize || uv.y > 1.0 - cornerSize) {
      marks = 1.0;
    }
  }

  // Top-right corner
  if (uv.x > 1.0 - cornerDist && uv.y > 1.0 - cornerDist) {
    if (uv.x > 1.0 - cornerSize || uv.y > 1.0 - cornerSize) {
      marks = 1.0;
    }
  }

  // Measurement ticks on edges
  let tickInterval = 0.1;
  let tickSize = 0.01;

  // Bottom edge ticks
  if (uv.y < 0.02) {
    let tickPos = fract(uv.x / tickInterval);
    if (abs(tickPos - 0.5) > 0.45) {
      marks = 0.5;
    }
  }

  // Left edge ticks
  if (uv.x < 0.02) {
    let tickPos = fract(uv.y / tickInterval);
    if (abs(tickPos - 0.5) > 0.45) {
      marks = 0.5;
    }
  }

  return marks;
}

// Paper texture
fn paperTexture(uv: vec2f) -> f32 {
  let noise1 = hash(uv * 200.0) * 0.03;
  let noise2 = hash(uv * 50.0 + vec2f(100.0, 50.0)) * 0.02;
  return noise1 + noise2;
}

// Drafting compass circle hints
fn compassHint(uv: vec2f, time: f32) -> f32 {
  let center = vec2f(0.85, 0.15);
  let dist = length((uv - center) * vec2f(1.0, uniforms.aspect));
  let radius = 0.08;

  let circle = smoothstep(0.002, 0.0, abs(dist - radius));
  let fade = sin(time * 0.5) * 0.3 + 0.7;

  return circle * fade * 0.3;
}

// Construction zone warning stripes
fn warningStripes(uv: vec2f, time: f32) -> f32 {
  // Bottom edge warning stripe
  if (uv.y > 0.02) { return 0.0; }

  let stripeWidth = 0.02;
  let stripePos = (uv.x + time * 0.05) / stripeWidth;
  let stripe = step(0.5, fract(stripePos));

  return stripe * 0.3;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  let uv = input.uv;
  let time = uniforms.time;

  // Blueprint blue background
  let bgDark = vec3f(0.05, 0.12, 0.22);
  let bgLight = vec3f(0.08, 0.18, 0.32);

  // Gradient from center
  let gradientDist = length(uv - 0.5) * 0.5;
  var color = mix(bgLight, bgDark, gradientDist);

  // Paper texture
  let paper = paperTexture(uv);
  color += vec3f(paper);

  // Blueprint grid
  let grid = blueprintGrid(uv, time);
  let gridColor = vec3f(0.3, 0.5, 0.7);
  color = mix(color, gridColor, grid * 0.5);

  // Technical marks
  let marks = technicalMarks(uv, time);
  color = mix(color, vec3f(0.4, 0.6, 0.8), marks * 0.4);

  // Compass hint
  let compass = compassHint(uv, time);
  color = mix(color, vec3f(0.5, 0.7, 0.9), compass);

  // Warning stripes at bottom
  let warning = warningStripes(uv, time);
  let warningColor = mix(vec3f(0.9, 0.7, 0.1), vec3f(0.2, 0.2, 0.2), warning);
  if (uv.y < 0.02) {
    color = warningColor;
  }

  // Subtle vignette
  let vignette = 1.0 - length(uv - 0.5) * 0.4;
  color *= vignette;

  // Aged paper effect
  let aged = sin(uv.x * 100.0 + uv.y * 80.0) * 0.01;
  color += aged;

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

  // Type-specific size
  let pType = u32(particle.particleType);
  if (pType == 0u) { // dust
    size *= 0.8 + sin(uniforms.time * 3.0 + particle.x * 10.0) * 0.2;
  } else if (pType == 1u) { // place
    size *= 1.0 + (1.0 - lifeRatio) * 0.5;
  } else if (pType == 2u) { // rotate
    size *= lifeRatio;
  } else if (pType == 3u) { // blueprint
    size *= 0.6 + lifeRatio * 0.4;
  } else if (pType == 4u) { // victory
    size *= 1.0 + sin(uniforms.time * 4.0) * 0.15;
  }

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

  if (pType == 0u) { // dust - soft particles
    alpha = exp(-dist * 4.0) * input.color.a;

  } else if (pType == 1u) { // place - impact ring
    let ring = abs(dist - 0.3 * (1.0 - input.life));
    alpha = exp(-ring * 10.0) * input.color.a;
    // Add center glow
    alpha += exp(-dist * 3.0) * input.color.a * 0.3;

  } else if (pType == 2u) { // rotate - spiral dots
    let angle = atan2(uv.y - 0.5, uv.x - 0.5);
    let spiral = sin(angle * 4.0 + uniforms.time * 8.0 + dist * 10.0);
    alpha = exp(-dist * 5.0) * (spiral * 0.5 + 0.5) * input.color.a;

  } else if (pType == 3u) { // blueprint - line segments
    // Technical line effect
    let lineX = abs(uv.x - 0.5);
    let lineY = abs(uv.y - 0.5);
    let line = min(lineX, lineY);
    alpha = exp(-line * 15.0) * input.color.a * 0.8;

  } else if (pType == 4u) { // victory - bright sparkle
    // Star shape
    let angle = atan2(uv.y - 0.5, uv.x - 0.5);
    let star = pow(abs(sin(angle * 4.0 + uniforms.time * 2.0)), 8.0);
    let starShape = mix(dist, dist * (1.0 - star * 0.5), 0.5);
    alpha = exp(-starShape * 4.0) * input.color.a;

    // Color shift
    color = mix(color, vec3f(1.0, 0.95, 0.8), 0.3);

  } else { // ambient
    alpha = exp(-dist * 3.0) * input.color.a;
  }

  return vec4f(color, alpha);
}
`;

export const placeShader = /* wgsl */ `
struct Uniforms {
  time: f32,
  intensity: f32,
  placeX: f32,
  placeY: f32,
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
  let intensity = uniforms.intensity;

  if (intensity <= 0.0) {
    return vec4f(0.0, 0.0, 0.0, 0.0);
  }

  let placePos = vec2f(uniforms.placeX, uniforms.placeY);
  let dist = length(uv - placePos);

  // Impact rings
  let ring1 = sin(dist * 40.0 - time * 15.0) * 0.5 + 0.5;
  let ring2 = sin(dist * 30.0 - time * 10.0) * 0.5 + 0.5;

  let ringEffect = (ring1 + ring2) * exp(-dist * 5.0);

  // Blueprint color
  let color = vec3f(0.4, 0.6, 0.9);

  let alpha = ringEffect * intensity * 0.4;

  return vec4f(color, alpha);
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

  // Construction complete celebration
  let burst = exp(-dist * 2.5 * (1.0 - intensity * 0.3));

  // Blueprint lines radiating
  let angle = atan2(uv.y - 0.5, uv.x - 0.5);
  let rays = pow(abs(sin(angle * 12.0 + time)), 6.0);
  let rayFade = exp(-dist * 2.0);

  // Grid pattern celebration
  let gridX = sin(uv.x * 40.0 + time * 3.0);
  let gridY = sin(uv.y * 40.0 + time * 2.5);
  let grid = gridX * gridY * 0.2;

  // Blueprint to gold color transition
  let blue = vec3f(0.3, 0.5, 0.8);
  let gold = vec3f(0.95, 0.85, 0.4);
  let white = vec3f(1.0, 1.0, 0.95);

  var color = mix(blue, gold, burst);
  color = mix(color, white, rays * rayFade * 0.4);

  // Sparkles
  let sparkle = hash(uv * 80.0 + time * 0.5);
  if (sparkle > 0.97) {
    color = white;
  }

  let alpha = (burst + rays * rayFade * 0.2 + abs(grid) * 0.1) * intensity * 0.5;

  return vec4f(color, clamp(alpha, 0.0, 0.7));
}
`;
