/**
 * WGSL Shaders - Nonogram
 * Digital Blueprint Cyberpunk Theme
 * Game #013
 */

// Background shader - Blueprint grid pattern
export const backgroundShader = /* wgsl */`
struct Uniforms {
  time: f32,
  aspectRatio: f32,
  gridOffset: vec2f,
  gridSize: vec2f,
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

  // Deep blueprint background
  let bgDark = vec3f(0.01, 0.03, 0.08);
  let bgLight = vec3f(0.02, 0.06, 0.12);

  // Radial gradient
  let center = vec2f(0.5, 0.5);
  let dist = length(uv - center);
  var color = mix(bgLight, bgDark, dist * 1.2);

  // Blueprint grid pattern (fine)
  let gridSmall = 50.0;
  let gridUV = fract(uv * gridSmall);
  let gridLine = smoothstep(0.02, 0.0, min(gridUV.x, gridUV.y)) +
                 smoothstep(0.98, 1.0, max(gridUV.x, gridUV.y));
  color += vec3f(0.0, 0.1, 0.2) * gridLine * 0.3;

  // Blueprint grid pattern (medium)
  let gridMed = 10.0;
  let gridUV2 = fract(uv * gridMed);
  let gridLine2 = smoothstep(0.03, 0.0, min(gridUV2.x, gridUV2.y)) +
                  smoothstep(0.97, 1.0, max(gridUV2.x, gridUV2.y));
  color += vec3f(0.0, 0.15, 0.3) * gridLine2 * 0.4;

  // Scanning line effect
  let scanLine = sin(uv.y * 200.0 + time * 2.0) * 0.5 + 0.5;
  color += vec3f(0.0, 0.05, 0.1) * scanLine * 0.1;

  // Horizontal scan bar
  let scanBar = 1.0 - smoothstep(0.0, 0.02, abs(uv.y - fract(time * 0.1)));
  color += vec3f(0.0, 0.3, 0.5) * scanBar * 0.3;

  // Corner vignette
  let vignette = 1.0 - dist * 0.5;
  color *= vignette;

  return vec4f(color, 1.0);
}
`;

// Cell shader - Renders filled/empty/marked cells
export const cellShader = /* wgsl */`
struct Uniforms {
  time: f32,
  cellSize: f32,
  gridOffsetX: f32,
  gridOffsetY: f32,
}

struct CellData {
  col: f32,
  row: f32,
  state: f32,      // 0=empty, 1=filled, 2=marked
  highlight: f32,  // For hover/selection effect
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;
@group(0) @binding(1) var<storage, read> cells: array<CellData>;

struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) localUV: vec2f,
  @location(1) state: f32,
  @location(2) highlight: f32,
}

@vertex
fn vertexMain(
  @builtin(vertex_index) vertexIndex: u32,
  @builtin(instance_index) instanceIndex: u32
) -> VertexOutput {
  var corners = array<vec2f, 6>(
    vec2f(0.0, 0.0),
    vec2f(1.0, 0.0),
    vec2f(0.0, 1.0),
    vec2f(0.0, 1.0),
    vec2f(1.0, 0.0),
    vec2f(1.0, 1.0)
  );

  let cell = cells[instanceIndex];
  let corner = corners[vertexIndex];

  let x = (uniforms.gridOffsetX + cell.col * uniforms.cellSize + corner.x * uniforms.cellSize) * 2.0 - 1.0;
  let y = 1.0 - (uniforms.gridOffsetY + cell.row * uniforms.cellSize + corner.y * uniforms.cellSize) * 2.0;

  var output: VertexOutput;
  output.position = vec4f(x, y, 0.0, 1.0);
  output.localUV = corner;
  output.state = cell.state;
  output.highlight = cell.highlight;
  return output;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  let uv = input.localUV;
  let state = input.state;
  let highlight = input.highlight;
  let time = uniforms.time;

  // Cell border
  let border = 0.05;
  let inBorder = step(border, uv.x) * step(uv.x, 1.0 - border) *
                 step(border, uv.y) * step(uv.y, 1.0 - border);

  var color = vec3f(0.02, 0.05, 0.1);
  var alpha = 0.8;

  if (state > 0.5 && state < 1.5) {
    // Filled cell - Neon cyan
    let fillColor = vec3f(0.0, 0.8, 1.0);
    let pulse = sin(time * 3.0) * 0.1 + 0.9;

    // Inner glow
    let center = vec2f(0.5, 0.5);
    let dist = length(uv - center);
    let glow = 1.0 - dist * 1.2;

    color = fillColor * pulse * glow;

    // Edge glow
    let edgeDist = min(min(uv.x, 1.0 - uv.x), min(uv.y, 1.0 - uv.y));
    let edgeGlow = smoothstep(0.15, 0.0, edgeDist);
    color += vec3f(0.0, 0.5, 0.8) * edgeGlow;

    alpha = 1.0;
  } else if (state > 1.5) {
    // Marked cell (X) - Neon red
    let center = vec2f(0.5, 0.5);
    let localUV = uv - center;

    // Draw X using SDF
    let rotatedUV1 = vec2f(localUV.x + localUV.y, localUV.y - localUV.x) * 0.707;
    let rotatedUV2 = vec2f(localUV.x - localUV.y, localUV.y + localUV.x) * 0.707;

    let line1 = abs(rotatedUV1.y);
    let line2 = abs(rotatedUV2.y);

    let xShape = min(line1, line2);
    let xMask = 1.0 - smoothstep(0.05, 0.08, xShape);

    // Only show X in center area
    let inCenter = step(length(localUV), 0.4);
    xMask *= inCenter;

    color = vec3f(1.0, 0.2, 0.3) * xMask;
    color += vec3f(0.5, 0.0, 0.1) * (1.0 - xMask) * 0.3;

    // Glow effect
    let xGlow = smoothstep(0.15, 0.05, xShape) * inCenter;
    color += vec3f(0.8, 0.1, 0.2) * xGlow * 0.5;

    alpha = max(xMask * 0.9 + 0.1, 0.3);
  } else {
    // Empty cell - subtle grid
    color = vec3f(0.03, 0.08, 0.15);
    alpha = 0.6;
  }

  // Highlight effect (hover)
  if (highlight > 0.5) {
    let pulse = sin(time * 5.0) * 0.3 + 0.7;
    color += vec3f(0.2, 0.4, 0.6) * pulse * 0.3;
  }

  // Cell border glow
  let borderGlow = 1.0 - inBorder;
  color += vec3f(0.0, 0.3, 0.5) * borderGlow * 0.5;

  return vec4f(color, alpha);
}
`;

// Hint shader - Row and column hints
export const hintShader = /* wgsl */`
struct Uniforms {
  time: f32,
  cellSize: f32,
  gridOffsetX: f32,
  gridOffsetY: f32,
}

struct HintData {
  x: f32,
  y: f32,
  value: f32,
  completed: f32,  // 1.0 if this hint row/col is complete
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;
@group(0) @binding(1) var<storage, read> hints: array<HintData>;

struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) localUV: vec2f,
  @location(1) value: f32,
  @location(2) completed: f32,
}

@vertex
fn vertexMain(
  @builtin(vertex_index) vertexIndex: u32,
  @builtin(instance_index) instanceIndex: u32
) -> VertexOutput {
  var corners = array<vec2f, 6>(
    vec2f(0.0, 0.0),
    vec2f(1.0, 0.0),
    vec2f(0.0, 1.0),
    vec2f(0.0, 1.0),
    vec2f(1.0, 0.0),
    vec2f(1.0, 1.0)
  );

  let hint = hints[instanceIndex];
  let corner = corners[vertexIndex];
  let size = uniforms.cellSize * 0.8;

  let x = (hint.x + corner.x * size) * 2.0 - 1.0;
  let y = 1.0 - (hint.y + corner.y * size) * 2.0;

  var output: VertexOutput;
  output.position = vec4f(x, y, 0.0, 1.0);
  output.localUV = corner;
  output.value = hint.value;
  output.completed = hint.completed;
  return output;
}

// Simple digit rendering using SDF segments
fn drawDigit(uv: vec2f, digit: i32) -> f32 {
  let center = vec2f(0.5, 0.5);
  let p = uv - center;

  // Simplified: just draw based on digit pattern
  var result = 0.0;
  let thick = 0.08;

  // Segments: top, mid, bot, left-top, left-bot, right-top, right-bot
  let segments = array<vec4f, 10>(
    vec4f(1, 0, 1, 1),  // 0: top, bot, sides
    vec4f(0, 0, 0, 0),  // 1: right only
    vec4f(1, 1, 1, 0),  // 2
    vec4f(1, 1, 1, 0),  // 3
    vec4f(0, 1, 0, 1),  // 4
    vec4f(1, 1, 1, 0),  // 5
    vec4f(1, 1, 1, 1),  // 6
    vec4f(1, 0, 0, 0),  // 7
    vec4f(1, 1, 1, 1),  // 8
    vec4f(1, 1, 1, 0)   // 9
  );

  // Simple approach: draw as a filled circle for value
  let dist = length(p);
  result = 1.0 - smoothstep(0.25, 0.35, dist);

  return result;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  let uv = input.localUV;
  let value = input.value;
  let completed = input.completed;
  let time = uniforms.time;

  // Background
  var bgColor = vec3f(0.02, 0.05, 0.1);

  // Number indicator (simple circle for now)
  let center = vec2f(0.5, 0.5);
  let dist = length(uv - center);

  // Base color based on completion
  var numColor: vec3f;
  if (completed > 0.5) {
    // Completed - dim green
    numColor = vec3f(0.0, 0.5, 0.3);
  } else {
    // Active - bright cyan
    numColor = vec3f(0.0, 0.7, 0.9);
  }

  // Draw number background
  let numBg = 1.0 - smoothstep(0.35, 0.4, dist);
  var color = mix(bgColor, numColor * 0.3, numBg * 0.5);

  // Number glow
  let glow = 1.0 - smoothstep(0.2, 0.4, dist);
  if (completed < 0.5) {
    let pulse = sin(time * 2.0) * 0.2 + 0.8;
    color += numColor * glow * pulse * 0.5;
  } else {
    color += numColor * glow * 0.3;
  }

  // Border
  let border = smoothstep(0.38, 0.4, dist) - smoothstep(0.4, 0.42, dist);
  color += numColor * border * 0.8;

  return vec4f(color, 0.9);
}
`;

// Grid lines shader
export const gridShader = /* wgsl */`
struct Uniforms {
  time: f32,
  cellSize: f32,
  gridOffsetX: f32,
  gridOffsetY: f32,
  rows: f32,
  cols: f32,
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

  // Convert to grid space
  let gridX = (uv.x - uniforms.gridOffsetX) / (uniforms.cols * uniforms.cellSize);
  let gridY = (uv.y - uniforms.gridOffsetY) / (uniforms.rows * uniforms.cellSize);

  // Only draw in grid area
  if (gridX < 0.0 || gridX > 1.0 || gridY < 0.0 || gridY > 1.0) {
    discard;
  }

  let cellX = fract(gridX * uniforms.cols);
  let cellY = fract(gridY * uniforms.rows);

  // Grid lines
  let lineThick = 0.03;
  let lineX = step(cellX, lineThick) + step(1.0 - lineThick, cellX);
  let lineY = step(cellY, lineThick) + step(1.0 - lineThick, cellY);
  let gridLine = max(lineX, lineY);

  // Major lines every 5 cells
  let majorX = fract(gridX * uniforms.cols / 5.0);
  let majorY = fract(gridY * uniforms.rows / 5.0);
  let majorLineThick = 0.06;
  let majorLineX = step(majorX, majorLineThick) + step(1.0 - majorLineThick, majorX);
  let majorLineY = step(majorY, majorLineThick) + step(1.0 - majorLineThick, majorY);
  let majorLine = max(majorLineX, majorLineY);

  // Colors
  let minorColor = vec3f(0.0, 0.3, 0.5);
  let majorColor = vec3f(0.0, 0.5, 0.8);

  var color = minorColor * gridLine * 0.5;
  color += majorColor * majorLine * 0.8;

  // Pulse effect on major lines
  let pulse = sin(time * 2.0) * 0.2 + 0.8;
  color *= pulse;

  let alpha = max(gridLine * 0.3, majorLine * 0.6);

  if (alpha < 0.01) {
    discard;
  }

  return vec4f(color, alpha);
}
`;

// Particle shader
export const particleShader = /* wgsl */`
struct Uniforms {
  time: f32,
  aspectRatio: f32,
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
  type: f32,
  colorR: f32,
  colorG: f32,
  colorB: f32,
  colorA: f32,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;
@group(0) @binding(1) var<storage, read> particles: array<Particle>;

struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) localUV: vec2f,
  @location(1) life: f32,
  @location(2) color: vec4f,
  @location(3) particleType: f32,
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

  let p = particles[instanceIndex];
  let corner = corners[vertexIndex];

  let x = p.x * 2.0 - 1.0 + corner.x * p.size;
  let y = 1.0 - p.y * 2.0 + corner.y * p.size * uniforms.aspectRatio;

  var output: VertexOutput;
  output.position = vec4f(x, y, 0.0, 1.0);
  output.localUV = corner;
  output.life = p.life / p.maxLife;
  output.color = vec4f(p.colorR, p.colorG, p.colorB, p.colorA);
  output.particleType = p.type;
  return output;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  let uv = input.localUV;
  let life = input.life;
  let baseColor = input.color;
  let pType = input.particleType;
  let time = uniforms.time;

  let dist = length(uv);
  var alpha = 0.0;
  var color = baseColor.rgb;

  if (pType < 0.5) {
    // Fill particle - soft glow
    alpha = (1.0 - smoothstep(0.0, 1.0, dist)) * life;
    let pulse = sin(time * 10.0 + life * 6.28) * 0.2 + 0.8;
    color *= pulse;
  } else if (pType < 1.5) {
    // Mark particle - sharp spark
    alpha = (1.0 - dist) * life;
    alpha = pow(alpha, 2.0);
  } else if (pType < 2.5) {
    // Complete burst - star shape
    let angle = atan2(uv.y, uv.x);
    let star = abs(sin(angle * 4.0)) * 0.3 + 0.7;
    alpha = (1.0 - dist * star) * life;
    alpha = max(0.0, alpha);
  } else {
    // Error shake - square
    let sqDist = max(abs(uv.x), abs(uv.y));
    alpha = (1.0 - sqDist) * life;
  }

  alpha *= baseColor.a;

  return vec4f(color, alpha);
}
`;

// Victory overlay shader
export const victoryShader = /* wgsl */`
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

  if (progress < 0.01) {
    discard;
  }

  let dist = length(uv - center);

  // Expanding ring
  let ringRadius = progress * 1.5;
  let ringWidth = 0.05 + progress * 0.1;
  let ring = 1.0 - smoothstep(ringWidth * 0.5, ringWidth, abs(dist - ringRadius));

  // Inner glow
  let innerGlow = 1.0 - smoothstep(0.0, ringRadius, dist);
  innerGlow *= (1.0 - progress);

  // Blueprint completion color - cyan to green
  let colorA = vec3f(0.0, 0.8, 1.0);
  let colorB = vec3f(0.0, 1.0, 0.5);
  let ringColor = mix(colorA, colorB, progress);

  // Scanning lines effect
  let scanLines = sin((uv.y - time * 0.2) * 50.0) * 0.5 + 0.5;

  var color = ringColor * ring;
  color += vec3f(0.0, 0.5, 0.8) * innerGlow * 0.5;
  color += ringColor * scanLines * innerGlow * 0.2;

  let alpha = ring * 0.8 + innerGlow * 0.3;

  if (alpha < 0.01) {
    discard;
  }

  return vec4f(color, alpha * progress);
}
`;

// Timer display shader (optional enhancement)
export const timerShader = /* wgsl */`
struct Uniforms {
  time: f32,
  displayTime: f32,
  posX: f32,
  posY: f32,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;

struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) uv: vec2f,
}

@vertex
fn vertexMain(@builtin(vertex_index) vertexIndex: u32) -> VertexOutput {
  var corners = array<vec2f, 6>(
    vec2f(0.0, 0.0),
    vec2f(1.0, 0.0),
    vec2f(0.0, 1.0),
    vec2f(0.0, 1.0),
    vec2f(1.0, 0.0),
    vec2f(1.0, 1.0)
  );

  let corner = corners[vertexIndex];
  let size = vec2f(0.2, 0.08);

  let x = (uniforms.posX + corner.x * size.x) * 2.0 - 1.0;
  let y = 1.0 - (uniforms.posY + corner.y * size.y) * 2.0;

  var output: VertexOutput;
  output.position = vec4f(x, y, 0.0, 1.0);
  output.uv = corner;
  return output;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  let uv = input.uv;
  let time = uniforms.time;

  // Background panel
  let bgColor = vec3f(0.02, 0.05, 0.1);
  let borderDist = min(min(uv.x, 1.0 - uv.x), min(uv.y, 1.0 - uv.y));
  let border = 1.0 - smoothstep(0.02, 0.04, borderDist);

  var color = bgColor;
  color += vec3f(0.0, 0.4, 0.6) * border;

  // Pulse based on time
  let pulse = sin(time * 2.0) * 0.1 + 0.9;
  color *= pulse;

  return vec4f(color, 0.8);
}
`;
