/**
 * WebGPU Shaders - Sliding Puzzle
 * Data Fragment Theme
 * Game #017
 */

/**
 * Background Shader - Quantum data stream visualization
 */
export const backgroundShader = /* wgsl */ `
struct Uniforms {
  time: f32,
  aspectRatio: f32,
  gridSize: f32,
  padding: f32,
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

// Hash function for noise
fn hash(p: vec2f) -> f32 {
  return fract(sin(dot(p, vec2f(127.1, 311.7))) * 43758.5453);
}

// Data stream effect
fn dataStream(uv: vec2f, time: f32) -> f32 {
  let col = floor(uv.x * 30.0);
  let speed = hash(vec2f(col, 0.0)) * 2.0 + 1.0;
  let phase = hash(vec2f(col, 1.0)) * 6.28;

  let y = fract(uv.y + time * speed * 0.1 + phase);
  let brightness = step(0.98, hash(vec2f(col, floor(y * 20.0 + time * speed))));

  return brightness * 0.3;
}

// Grid pattern
fn gridPattern(uv: vec2f, time: f32) -> f32 {
  let gridUv = uv * 40.0;
  let grid = step(0.95, fract(gridUv.x)) + step(0.95, fract(gridUv.y));
  let pulse = sin(time * 2.0 + uv.y * 10.0) * 0.5 + 0.5;
  return grid * 0.05 * pulse;
}

// Hexagonal pattern for quantum feel
fn hexPattern(uv: vec2f, time: f32) -> f32 {
  let scale = 15.0;
  var p = uv * scale;
  p.x *= 1.1547; // 2/sqrt(3)

  let isOdd = floor(p.y) % 2.0;
  p.x += isOdd * 0.5;

  let cell = floor(p);
  let local = fract(p) - 0.5;

  let dist = length(local);
  let hex = smoothstep(0.45, 0.4, dist);

  let pulse = sin(time * 3.0 + cell.x * 0.5 + cell.y * 0.3) * 0.5 + 0.5;
  return hex * pulse * 0.08;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  let uv = input.uv;
  let time = uniforms.time;

  // Deep space blue background
  var color = vec3f(0.02, 0.03, 0.08);

  // Data streams
  let stream = dataStream(uv, time);
  color += vec3f(0.0, 0.6, 1.0) * stream;

  // Grid overlay
  let grid = gridPattern(uv, time);
  color += vec3f(0.2, 0.5, 0.8) * grid;

  // Hexagonal quantum pattern
  let hex = hexPattern(uv, time);
  color += vec3f(0.3, 0.7, 1.0) * hex;

  // Radial gradient for depth
  let center = vec2f(0.5, 0.5);
  let dist = length(uv - center);
  color *= 1.0 - dist * 0.5;

  // Scan line
  let scanLine = sin(uv.y * 200.0 + time * 5.0) * 0.02 + 0.98;
  color *= scanLine;

  // Vignette
  let vignette = 1.0 - pow(dist * 1.2, 2.0);
  color *= vignette;

  return vec4f(color, 1.0);
}
`;

/**
 * Tile Shader - Data fragment blocks with quantum effects
 */
export const tileShader = /* wgsl */ `
struct Uniforms {
  time: f32,
  tileCount: f32,
  canvasWidth: f32,
  canvasHeight: f32,
}

struct TileData {
  x: f32,
  y: f32,
  width: f32,
  height: f32,
  value: f32,
  slideProgress: f32,
  fromX: f32,
  fromY: f32,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;
@group(0) @binding(1) var<storage, read> tiles: array<TileData>;

struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) uv: vec2f,
  @location(1) @interpolate(flat) tileIndex: u32,
}

@vertex
fn vertexMain(
  @builtin(vertex_index) vertexIndex: u32,
  @builtin(instance_index) instanceIndex: u32
) -> VertexOutput {
  var quadPos = array<vec2f, 6>(
    vec2f(0.0, 0.0),
    vec2f(1.0, 0.0),
    vec2f(0.0, 1.0),
    vec2f(0.0, 1.0),
    vec2f(1.0, 0.0),
    vec2f(1.0, 1.0)
  );

  let tile = tiles[instanceIndex];
  let localPos = quadPos[vertexIndex];

  // Interpolate position during slide
  let progress = tile.slideProgress;
  let eased = 1.0 - pow(1.0 - progress, 3.0); // easeOutCubic
  let currentX = mix(tile.fromX, tile.x, eased);
  let currentY = mix(tile.fromY, tile.y, eased);

  // Convert to clip space
  let pixelPos = vec2f(currentX, currentY) + localPos * vec2f(tile.width, tile.height);
  let clipPos = (pixelPos / vec2f(uniforms.canvasWidth, uniforms.canvasHeight)) * 2.0 - 1.0;

  var output: VertexOutput;
  output.position = vec4f(clipPos.x, -clipPos.y, 0.0, 1.0);
  output.uv = localPos;
  output.tileIndex = instanceIndex;
  return output;
}

// SDF rounded rectangle
fn sdRoundedRect(p: vec2f, b: vec2f, r: f32) -> f32 {
  let q = abs(p) - b + r;
  return length(max(q, vec2f(0.0))) + min(max(q.x, q.y), 0.0) - r;
}

// Data pattern for tile surface
fn dataPattern(uv: vec2f, time: f32, value: f32) -> f32 {
  let scale = 8.0;
  let p = uv * scale;

  // Binary-like pattern based on tile value
  let seed = value * 17.0;
  let col = floor(p.x);
  let row = floor(p.y);
  let cell = fract(sin(dot(vec2f(col + seed, row), vec2f(12.9898, 78.233))) * 43758.5453);

  let bit = step(0.5, cell);
  let pulse = sin(time * 3.0 + col * 0.5 + row * 0.3) * 0.2 + 0.8;

  return bit * pulse * 0.15;
}

// Circuit trace pattern
fn circuitTrace(uv: vec2f, time: f32, value: f32) -> f32 {
  let seed = value * 13.0;
  var trace = 0.0;

  // Horizontal traces
  for (var i = 0; i < 3; i++) {
    let y = 0.2 + f32(i) * 0.3;
    let offset = fract(sin(seed + f32(i)) * 43758.5453);
    let lineY = abs(uv.y - y);
    let brightness = smoothstep(0.02, 0.0, lineY);

    // Animated pulse along trace
    let pulsePos = fract(time * 0.5 + offset);
    let pulse = smoothstep(0.1, 0.0, abs(uv.x - pulsePos)) * 2.0;

    trace += brightness * (0.3 + pulse);
  }

  return trace;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  let uv = input.uv;
  let tile = tiles[input.tileIndex];
  let time = uniforms.time;
  let value = tile.value;

  // Center UV for SDF
  let centeredUv = uv - 0.5;

  // Tile shape with rounded corners
  let d = sdRoundedRect(centeredUv, vec2f(0.45, 0.45), 0.05);

  if (d > 0.02) {
    discard;
  }

  // Base color based on tile value (create color gradient)
  let hue = fract(value * 0.06 + 0.55);
  let sat = 0.7;
  let val = 0.6;

  // HSV to RGB
  let c = vec3f(hue, hue + 0.333, hue + 0.666);
  let rgb = clamp(abs(fract(c) * 6.0 - 3.0) - 1.0, vec3f(0.0), vec3f(1.0));
  var baseColor = mix(vec3f(1.0), rgb, sat) * val;

  // Add cyan tint for data theme
  baseColor = mix(baseColor, vec3f(0.2, 0.7, 1.0), 0.3);

  // Data pattern overlay
  let pattern = dataPattern(uv, time, value);
  baseColor += vec3f(0.3, 0.8, 1.0) * pattern;

  // Circuit traces
  let circuit = circuitTrace(uv, time, value);
  baseColor += vec3f(0.0, 1.0, 0.8) * circuit * 0.3;

  // Edge glow
  let edgeGlow = smoothstep(0.02, -0.02, d);
  let innerGlow = smoothstep(-0.05, -0.15, d);

  // Sliding effect - add energy glow
  let slideEnergy = tile.slideProgress * (1.0 - tile.slideProgress) * 4.0;
  let energyGlow = vec3f(0.3, 0.8, 1.0) * slideEnergy * 0.5;

  baseColor += energyGlow;

  // Number display area (center highlight)
  let centerDist = length(centeredUv);
  let numberArea = smoothstep(0.25, 0.15, centerDist);
  baseColor = mix(baseColor, baseColor * 1.5, numberArea * 0.3);

  // Outer glow
  let outerGlow = smoothstep(0.02, 0.0, d) - smoothstep(0.0, -0.02, d);
  baseColor += vec3f(0.3, 0.7, 1.0) * outerGlow * 0.5;

  // Alpha with soft edges
  let alpha = smoothstep(0.02, 0.0, d);

  return vec4f(baseColor, alpha);
}
`;

/**
 * Particle Shader - Quantum data particles
 */
export const particleShader = /* wgsl */ `
struct Uniforms {
  time: f32,
  aspectRatio: f32,
  pad0: f32,
  pad1: f32,
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
  colorR: f32,
  colorG: f32,
  colorB: f32,
  colorA: f32,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;
@group(0) @binding(1) var<storage, read> particles: array<Particle>;

struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) uv: vec2f,
  @location(1) @interpolate(flat) particleIndex: u32,
}

@vertex
fn vertexMain(
  @builtin(vertex_index) vertexIndex: u32,
  @builtin(instance_index) instanceIndex: u32
) -> VertexOutput {
  var quadPos = array<vec2f, 6>(
    vec2f(-1.0, -1.0),
    vec2f(1.0, -1.0),
    vec2f(-1.0, 1.0),
    vec2f(-1.0, 1.0),
    vec2f(1.0, -1.0),
    vec2f(1.0, 1.0)
  );

  let particle = particles[instanceIndex];
  let localPos = quadPos[vertexIndex];

  let worldPos = vec2f(particle.x, particle.y) + localPos * particle.size;
  let clipPos = worldPos * 2.0 - 1.0;

  var output: VertexOutput;
  output.position = vec4f(clipPos.x, -clipPos.y, 0.0, 1.0);
  output.uv = localPos;
  output.particleIndex = instanceIndex;
  return output;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  let particle = particles[input.particleIndex];
  let uv = input.uv;
  let time = uniforms.time;

  let dist = length(uv);
  let lifeRatio = particle.life / particle.maxLife;
  let pType = u32(particle.particleType);

  var color = vec3f(particle.colorR, particle.colorG, particle.colorB);
  var alpha = 0.0;

  // Type 0: Slide - data transfer particles
  if (pType == 0u) {
    let square = max(abs(uv.x), abs(uv.y));
    alpha = smoothstep(1.0, 0.5, square) * lifeRatio;

    // Digital flicker
    let flicker = step(0.3, fract(sin(dot(uv, vec2f(12.9898, 78.233)) + time * 20.0) * 43758.5453));
    alpha *= 0.7 + flicker * 0.3;
  }
  // Type 1: Shuffle - quantum scatter
  else if (pType == 1u) {
    alpha = smoothstep(1.0, 0.0, dist) * lifeRatio;

    // Ring effect
    let ring = smoothstep(0.6, 0.5, dist) - smoothstep(0.5, 0.4, dist);
    alpha = max(alpha, ring * lifeRatio);
  }
  // Type 2: Complete - celebration sparkle
  else if (pType == 2u) {
    // Star shape
    let angle = atan2(uv.y, uv.x);
    let star = 0.5 + 0.5 * sin(angle * 4.0 + time * 5.0);
    let starDist = dist / (0.5 + star * 0.3);
    alpha = smoothstep(1.0, 0.0, starDist) * lifeRatio;

    // Sparkle
    alpha *= 0.8 + 0.2 * sin(time * 30.0 + particle.x * 100.0);
  }
  // Type 3: Trail - motion blur
  else if (pType == 3u) {
    // Elongated shape in velocity direction
    let elongation = vec2f(1.0, 0.3);
    let elongatedDist = length(uv * elongation);
    alpha = smoothstep(1.0, 0.0, elongatedDist) * lifeRatio * 0.6;
  }
  // Type 4: Ambient - floating data bits
  else {
    let pulse = sin(time * 3.0 + particle.x * 10.0) * 0.3 + 0.7;
    alpha = smoothstep(1.0, 0.0, dist) * lifeRatio * pulse * 0.4;
  }

  alpha *= particle.colorA;

  return vec4f(color * alpha, alpha);
}
`;

/**
 * Victory Shader - Quantum completion wave
 */
export const victoryShader = /* wgsl */ `
struct Uniforms {
  time: f32,
  progress: f32,
  centerX: f32,
  centerY: f32,
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

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  let uv = input.uv;
  let time = uniforms.time;
  let progress = uniforms.progress;
  let center = vec2f(uniforms.centerX, uniforms.centerY);

  if (progress <= 0.0) {
    discard;
  }

  let dist = length(uv - center);
  var color = vec3f(0.0);
  var alpha = 0.0;

  // Expanding quantum rings
  for (var i = 0; i < 5; i++) {
    let ringRadius = progress * 0.3 * f32(i + 1);
    let ringWidth = 0.02 + 0.01 * f32(i);
    let ring = smoothstep(ringWidth, 0.0, abs(dist - ringRadius));

    // Rainbow color per ring
    let hue = fract(f32(i) * 0.2 + time * 0.3);
    let ringColor = vec3f(
      sin(hue * 6.28) * 0.5 + 0.5,
      sin((hue + 0.333) * 6.28) * 0.5 + 0.5,
      sin((hue + 0.666) * 6.28) * 0.5 + 0.5
    );

    color += ringColor * ring * (1.0 - f32(i) * 0.15);
    alpha = max(alpha, ring * 0.8);
  }

  // Central glow
  let centralGlow = smoothstep(0.3 * progress, 0.0, dist);
  color += vec3f(0.3, 0.8, 1.0) * centralGlow * progress;
  alpha = max(alpha, centralGlow * 0.5 * progress);

  // Data grid overlay
  let gridScale = 20.0;
  let gridUv = uv * gridScale;
  let grid = step(0.9, fract(gridUv.x)) + step(0.9, fract(gridUv.y));
  let gridMask = smoothstep(0.5 * progress, 0.0, dist);
  color += vec3f(0.2, 0.6, 1.0) * grid * 0.3 * gridMask;

  // Sparkles
  let sparkleAngle = atan2(uv.y - center.y, uv.x - center.x);
  let sparkle = pow(sin(sparkleAngle * 8.0 + time * 5.0) * 0.5 + 0.5, 4.0);
  let sparkleRing = smoothstep(0.02, 0.0, abs(dist - progress * 0.8));
  color += vec3f(1.0, 0.9, 0.7) * sparkle * sparkleRing;
  alpha = max(alpha, sparkle * sparkleRing * 0.6);

  // Fade out at edges
  alpha *= smoothstep(1.5, 0.0, dist);
  alpha *= progress;

  return vec4f(color, alpha);
}
`;
