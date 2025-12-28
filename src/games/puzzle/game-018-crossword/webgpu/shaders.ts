/**
 * WebGPU Shaders - Crossword
 * Cyber Cipher Theme
 * Game #018
 */

/**
 * Background Shader - Terminal/Matrix code rain effect
 */
export const backgroundShader = /* wgsl */ `
struct Uniforms {
  time: f32,
  aspectRatio: f32,
  gridCols: f32,
  gridRows: f32,
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

// Hash function
fn hash(p: vec2f) -> f32 {
  return fract(sin(dot(p, vec2f(127.1, 311.7))) * 43758.5453);
}

// Character rain effect
fn charRain(uv: vec2f, time: f32) -> f32 {
  let col = floor(uv.x * 50.0);
  let speed = hash(vec2f(col, 0.0)) * 2.0 + 0.5;
  let phase = hash(vec2f(col, 1.0)) * 6.28;

  let y = fract(uv.y * 0.5 + time * speed * 0.08 + phase);

  // Character-like blocks
  let charY = floor(y * 30.0);
  let charBrightness = hash(vec2f(col, charY + floor(time * speed * 2.0)));

  // Fade based on position in column
  let fade = smoothstep(0.0, 0.3, y) * smoothstep(1.0, 0.7, y);

  return step(0.7, charBrightness) * fade * 0.4;
}

// Grid pattern for crossword feel
fn gridLines(uv: vec2f, cols: f32, rows: f32) -> f32 {
  let gridUv = uv * vec2f(cols, rows);
  let gridX = smoothstep(0.98, 1.0, fract(gridUv.x)) + smoothstep(0.02, 0.0, fract(gridUv.x));
  let gridY = smoothstep(0.98, 1.0, fract(gridUv.y)) + smoothstep(0.02, 0.0, fract(gridUv.y));
  return (gridX + gridY) * 0.15;
}

// Scan line effect
fn scanLine(uv: vec2f, time: f32) -> f32 {
  let scanY = fract(time * 0.1);
  let dist = abs(uv.y - scanY);
  return smoothstep(0.02, 0.0, dist) * 0.3;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  let uv = input.uv;
  let time = uniforms.time;

  // Deep terminal background
  var color = vec3f(0.01, 0.02, 0.03);

  // Add subtle gradient
  color += vec3f(0.0, 0.02, 0.04) * (1.0 - uv.y);

  // Character rain (matrix style)
  let rain = charRain(uv, time);
  color += vec3f(0.0, 0.8, 0.4) * rain;

  // Grid overlay
  let grid = gridLines(uv, 20.0, 20.0);
  color += vec3f(0.0, 0.5, 0.3) * grid;

  // Scan line
  let scan = scanLine(uv, time);
  color += vec3f(0.0, 1.0, 0.5) * scan;

  // CRT curvature effect
  let curved = uv - 0.5;
  let curvature = 1.0 + dot(curved, curved) * 0.1;
  color *= 1.0 / curvature;

  // Vignette
  let vignette = 1.0 - length(uv - 0.5) * 0.8;
  color *= vignette;

  // Scan lines (horizontal)
  let scanLines = sin(uv.y * 400.0) * 0.03 + 0.97;
  color *= scanLines;

  return vec4f(color, 1.0);
}
`;

/**
 * Cell Shader - Crossword cells with cipher effect
 */
export const cellShader = /* wgsl */ `
struct Uniforms {
  time: f32,
  cellCount: f32,
  canvasWidth: f32,
  canvasHeight: f32,
}

struct CellData {
  x: f32,
  y: f32,
  width: f32,
  height: f32,
  state: f32,        // 0=empty, 1=filled, 2=correct, 3=wrong, 4=blocked
  focusProgress: f32,
  letterIndex: f32,  // Which letter (for animation)
  wordStart: f32,    // Is this start of a word (shows number)
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;
@group(0) @binding(1) var<storage, read> cells: array<CellData>;

struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) uv: vec2f,
  @location(1) @interpolate(flat) cellIndex: u32,
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

  let cell = cells[instanceIndex];
  let localPos = quadPos[vertexIndex];

  let pixelPos = vec2f(cell.x, cell.y) + localPos * vec2f(cell.width, cell.height);
  let clipPos = (pixelPos / vec2f(uniforms.canvasWidth, uniforms.canvasHeight)) * 2.0 - 1.0;

  var output: VertexOutput;
  output.position = vec4f(clipPos.x, -clipPos.y, 0.0, 1.0);
  output.uv = localPos;
  output.cellIndex = instanceIndex;
  return output;
}

// SDF rounded rectangle
fn sdRoundedRect(p: vec2f, b: vec2f, r: f32) -> f32 {
  let q = abs(p) - b + r;
  return length(max(q, vec2f(0.0))) + min(max(q.x, q.y), 0.0) - r;
}

// Cipher scramble pattern
fn cipherPattern(uv: vec2f, time: f32, letterIndex: f32) -> f32 {
  let seed = letterIndex * 17.0;
  let col = floor(uv.x * 5.0);
  let row = floor(uv.y * 5.0);

  let cell = fract(sin(dot(vec2f(col + seed, row), vec2f(12.9898, 78.233)) + time * 2.0) * 43758.5453);
  return step(0.6, cell) * 0.15;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  let uv = input.uv;
  let cell = cells[input.cellIndex];
  let time = uniforms.time;
  let state = u32(cell.state);

  let centeredUv = uv - 0.5;
  let d = sdRoundedRect(centeredUv, vec2f(0.46, 0.46), 0.04);

  // Blocked cells
  if (state == 4u) {
    if (d > 0.0) {
      discard;
    }
    // Dark blocked cell
    let blockColor = vec3f(0.05, 0.08, 0.1);
    return vec4f(blockColor, 1.0);
  }

  if (d > 0.02) {
    discard;
  }

  // Base color based on state
  var baseColor = vec3f(0.08, 0.12, 0.15); // Empty

  if (state == 1u) {
    // Filled
    baseColor = vec3f(0.1, 0.18, 0.2);
  } else if (state == 2u) {
    // Correct
    baseColor = vec3f(0.05, 0.25, 0.15);
  } else if (state == 3u) {
    // Wrong
    baseColor = vec3f(0.25, 0.08, 0.08);
  }

  // Focus glow
  let focusGlow = cell.focusProgress * 0.3;
  baseColor += vec3f(0.0, 0.4, 0.2) * focusGlow;

  // Cipher pattern overlay
  let cipher = cipherPattern(uv, time, cell.letterIndex);
  baseColor += vec3f(0.0, 0.6, 0.3) * cipher;

  // Edge glow
  let edgeGlow = smoothstep(0.02, -0.02, d);
  let innerGlow = smoothstep(-0.03, -0.1, d);

  // Correct state gets green glow
  if (state == 2u) {
    let pulseGlow = sin(time * 3.0) * 0.1 + 0.9;
    baseColor += vec3f(0.0, 0.3, 0.1) * (1.0 - innerGlow) * pulseGlow;
  }

  // Wrong state gets red pulse
  if (state == 3u) {
    let pulseGlow = sin(time * 5.0) * 0.15 + 0.85;
    baseColor += vec3f(0.3, 0.0, 0.0) * (1.0 - innerGlow) * pulseGlow;
  }

  // Border
  let border = smoothstep(0.02, 0.0, d) - smoothstep(0.0, -0.015, d);
  var borderColor = vec3f(0.0, 0.5, 0.3);

  if (state == 2u) {
    borderColor = vec3f(0.0, 0.8, 0.4);
  } else if (state == 3u) {
    borderColor = vec3f(0.8, 0.2, 0.2);
  } else if (cell.focusProgress > 0.0) {
    borderColor = vec3f(0.0, 1.0, 0.6);
  }

  baseColor = mix(baseColor, borderColor, border * 0.8);

  let alpha = smoothstep(0.02, 0.0, d);

  return vec4f(baseColor, alpha);
}
`;

/**
 * Particle Shader - Decryption particles
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

  // Type 0: Input - character spark
  if (pType == 0u) {
    let square = max(abs(uv.x), abs(uv.y));
    alpha = smoothstep(1.0, 0.3, square) * lifeRatio;

    // Digital flicker
    let flicker = step(0.4, fract(sin(uv.x * 100.0 + time * 30.0) * 43758.5453));
    alpha *= 0.6 + flicker * 0.4;
  }
  // Type 1: Correct - decryption success
  else if (pType == 1u) {
    alpha = smoothstep(1.0, 0.0, dist) * lifeRatio;

    // Ring effect
    let ring = smoothstep(0.7, 0.6, dist) - smoothstep(0.6, 0.5, dist);
    alpha = max(alpha, ring * lifeRatio);
  }
  // Type 2: Wrong - error glitch
  else if (pType == 2u) {
    // Glitch squares
    let gx = floor(uv.x * 3.0 + time * 10.0);
    let gy = floor(uv.y * 3.0);
    let glitch = fract(sin(gx * 12.9898 + gy * 78.233) * 43758.5453);
    alpha = step(0.5, glitch) * lifeRatio * smoothstep(1.0, 0.5, dist);
  }
  // Type 3: Complete - full decryption
  else if (pType == 3u) {
    // Star shape
    let angle = atan2(uv.y, uv.x);
    let star = 0.5 + 0.5 * sin(angle * 6.0 + time * 4.0);
    let starDist = dist / (0.5 + star * 0.3);
    alpha = smoothstep(1.0, 0.0, starDist) * lifeRatio;
  }
  // Type 4: Ambient - floating code
  else {
    let pulse = sin(time * 2.0 + particle.x * 10.0) * 0.3 + 0.7;
    alpha = smoothstep(1.0, 0.0, dist) * lifeRatio * pulse * 0.5;
  }

  alpha *= particle.colorA;

  return vec4f(color * alpha, alpha);
}
`;

/**
 * Victory Shader - Decryption complete effect
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

  // Expanding cipher rings
  for (var i = 0; i < 4; i++) {
    let ringRadius = progress * 0.25 * f32(i + 1);
    let ringWidth = 0.015;
    let ring = smoothstep(ringWidth, 0.0, abs(dist - ringRadius));

    // Green cipher color
    let ringColor = vec3f(0.0, 0.8 - f32(i) * 0.15, 0.4 + f32(i) * 0.1);
    color += ringColor * ring;
    alpha = max(alpha, ring * 0.7);
  }

  // Central glow
  let centralGlow = smoothstep(0.25 * progress, 0.0, dist);
  color += vec3f(0.0, 0.6, 0.3) * centralGlow * progress;
  alpha = max(alpha, centralGlow * 0.4 * progress);

  // Binary/cipher overlay
  let binaryScale = 30.0;
  let binaryUv = uv * binaryScale;
  let bx = floor(binaryUv.x);
  let by = floor(binaryUv.y);
  let binary = step(0.5, fract(sin(bx * 12.9898 + by * 78.233 + time * 5.0) * 43758.5453));
  let binaryMask = smoothstep(0.6 * progress, 0.0, dist) * (1.0 - smoothstep(0.0, 0.3 * progress, dist));
  color += vec3f(0.0, 0.5, 0.25) * binary * 0.2 * binaryMask;

  // Sparkles
  let sparkleAngle = atan2(uv.y - center.y, uv.x - center.x);
  let sparkle = pow(sin(sparkleAngle * 12.0 + time * 6.0) * 0.5 + 0.5, 5.0);
  let sparkleRing = smoothstep(0.02, 0.0, abs(dist - progress * 0.7));
  color += vec3f(0.5, 1.0, 0.7) * sparkle * sparkleRing;
  alpha = max(alpha, sparkle * sparkleRing * 0.5);

  alpha *= smoothstep(1.2, 0.0, dist);
  alpha *= progress;

  return vec4f(color, alpha);
}
`;
