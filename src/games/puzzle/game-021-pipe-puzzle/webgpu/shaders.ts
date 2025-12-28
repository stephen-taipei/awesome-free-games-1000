/**
 * WebGPU Shaders - Pipe Puzzle
 * Energy Conduit Theme
 * Game #021
 */

/**
 * Background Shader - Energy grid matrix
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

// Energy grid pattern
fn energyGrid(uv: vec2f, time: f32, cols: f32, rows: f32) -> f32 {
  let cellUv = uv * vec2f(cols, rows);
  let cellId = floor(cellUv);
  let cellLocal = fract(cellUv);

  // Cell borders
  let borderX = smoothstep(0.02, 0.0, cellLocal.x) + smoothstep(0.98, 1.0, cellLocal.x);
  let borderY = smoothstep(0.02, 0.0, cellLocal.y) + smoothstep(0.98, 1.0, cellLocal.y);

  let pulse = sin(time * 2.0 + cellId.x * 0.5 + cellId.y * 0.7) * 0.3 + 0.7;
  return (borderX + borderY) * 0.2 * pulse;
}

// Energy flow streams
fn energyStreams(uv: vec2f, time: f32) -> f32 {
  var streams = 0.0;

  // Horizontal streams
  for (var i = 0; i < 5; i++) {
    let y = 0.1 + f32(i) * 0.2;
    let speed = 0.3 + f32(i) * 0.1;
    let phase = fract(uv.x * 3.0 + time * speed + f32(i) * 0.7);
    let stream = smoothstep(0.0, 0.5, phase) * smoothstep(1.0, 0.5, phase);
    let dist = abs(uv.y - y);
    streams += stream * smoothstep(0.03, 0.0, dist) * 0.3;
  }

  // Vertical streams
  for (var i = 0; i < 5; i++) {
    let x = 0.1 + f32(i) * 0.2;
    let speed = 0.25 + f32(i) * 0.08;
    let phase = fract(uv.y * 3.0 - time * speed + f32(i) * 0.5);
    let stream = smoothstep(0.0, 0.5, phase) * smoothstep(1.0, 0.5, phase);
    let dist = abs(uv.x - x);
    streams += stream * smoothstep(0.03, 0.0, dist) * 0.25;
  }

  return streams;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  let uv = input.uv;
  let time = uniforms.time;

  // Deep industrial background
  var color = vec3f(0.02, 0.04, 0.06);

  // Gradient
  color += vec3f(0.01, 0.02, 0.04) * (1.0 - uv.y);

  // Energy grid
  let grid = energyGrid(uv, time, uniforms.gridCols, uniforms.gridRows);
  color += vec3f(0.0, 0.5, 0.8) * grid;

  // Energy streams
  let streams = energyStreams(uv, time);
  color += vec3f(0.0, 0.8, 1.0) * streams;

  // Hex pattern overlay
  let hexScale = 30.0;
  let hx = uv.x * hexScale;
  let hy = uv.y * hexScale * 0.866;
  let hex = step(0.9, fract(hx + floor(hy) * 0.5)) * step(0.9, fract(hy));
  color += vec3f(0.1, 0.2, 0.3) * hex * 0.1;

  // Vignette
  let vignette = 1.0 - length(uv - 0.5) * 0.6;
  color *= vignette;

  return vec4f(color, 1.0);
}
`;

/**
 * Pipe Cell Shader - Energy conduit visualization
 */
export const pipeShader = /* wgsl */ `
struct Uniforms {
  time: f32,
  cellCount: f32,
  canvasWidth: f32,
  canvasHeight: f32,
}

struct PipeCell {
  x: f32,
  y: f32,
  width: f32,
  height: f32,
  pipeType: f32,    // 0=empty, 1=straight, 2=elbow, 3=t, 4=cross, 5=start, 6=end
  rotation: f32,    // 0, 90, 180, 270
  active: f32,      // 0=inactive, 1=active (connected)
  rotateAnim: f32,  // Rotation animation progress
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;
@group(0) @binding(1) var<storage, read> pipes: array<PipeCell>;

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

  let pipe = pipes[instanceIndex];
  let localPos = quadPos[vertexIndex];

  // Cell position in pixels
  let pixelPos = vec2f(pipe.x + localPos.x * pipe.width, pipe.y + localPos.y * pipe.height);

  // Normalize to clip space
  let clipPos = (pixelPos / vec2f(uniforms.canvasWidth, uniforms.canvasHeight)) * 2.0 - 1.0;

  var output: VertexOutput;
  output.position = vec4f(clipPos.x, -clipPos.y, 0.0, 1.0);
  output.uv = localPos;
  output.cellIndex = instanceIndex;
  return output;
}

// Draw pipe segment SDF
fn pipeSDF(uv: vec2f, pipeType: u32, rotation: f32) -> f32 {
  // Center UV
  let c = uv - 0.5;

  // Apply rotation
  let angle = rotation * 3.14159 / 180.0;
  let cosA = cos(angle);
  let sinA = sin(angle);
  let rotated = vec2f(c.x * cosA + c.y * sinA, -c.x * sinA + c.y * cosA);
  let p = rotated;

  let pipeWidth = 0.15;
  var dist = 1.0;

  // Type 1: Straight (Top-Bottom)
  if (pipeType == 1u) {
    dist = abs(p.x) - pipeWidth;
  }
  // Type 2: Elbow (Top-Right)
  else if (pipeType == 2u) {
    let topDist = abs(p.x);
    let topMask = step(0.0, p.y);
    let rightDist = abs(p.y);
    let rightMask = step(0.0, p.x);
    dist = min(topDist * topMask + 1.0 * (1.0 - topMask),
               rightDist * rightMask + 1.0 * (1.0 - rightMask)) - pipeWidth;
  }
  // Type 3: T-junction (Top-Right-Bottom)
  else if (pipeType == 3u) {
    let vertDist = abs(p.x);
    let rightDist = abs(p.y) * step(0.0, p.x) + 1.0 * (1.0 - step(0.0, p.x));
    dist = min(vertDist, rightDist) - pipeWidth;
  }
  // Type 4: Cross
  else if (pipeType == 4u) {
    dist = min(abs(p.x), abs(p.y)) - pipeWidth;
  }
  // Type 5: Start
  else if (pipeType == 5u) {
    let rightDist = abs(p.y) * step(0.0, p.x) + 1.0 * (1.0 - step(0.0, p.x));
    dist = rightDist - pipeWidth;
    // Add start marker
    let marker = length(p + vec2f(0.15, 0.0)) - 0.12;
    dist = min(dist, marker);
  }
  // Type 6: End
  else if (pipeType == 6u) {
    let leftDist = abs(p.y) * (1.0 - step(0.0, p.x)) + 1.0 * step(0.0, p.x);
    dist = leftDist - pipeWidth;
    // Add end marker
    let marker = max(abs(p.x - 0.15), abs(p.y)) - 0.1;
    dist = min(dist, marker);
  }

  return dist;
}

// Energy flow animation
fn energyFlow(uv: vec2f, time: f32, pipeType: u32, rotation: f32) -> f32 {
  let c = uv - 0.5;
  let angle = rotation * 3.14159 / 180.0;
  let cosA = cos(angle);
  let sinA = sin(angle);
  let p = vec2f(c.x * cosA + c.y * sinA, -c.x * sinA + c.y * cosA);

  var flow = 0.0;

  // Flow particles along pipe direction
  if (pipeType == 1u || pipeType == 3u || pipeType == 4u) {
    // Vertical flow
    let phase = fract(p.y * 4.0 + time * 2.0);
    let particle = smoothstep(0.0, 0.3, phase) * smoothstep(0.6, 0.3, phase);
    flow += particle * smoothstep(0.15, 0.0, abs(p.x)) * 0.6;
  }
  if (pipeType == 2u || pipeType == 3u || pipeType == 4u || pipeType == 5u) {
    // Horizontal flow
    let phase = fract(p.x * 4.0 + time * 2.0);
    let particle = smoothstep(0.0, 0.3, phase) * smoothstep(0.6, 0.3, phase);
    flow += particle * smoothstep(0.15, 0.0, abs(p.y)) * 0.6;
  }

  return flow;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  let pipe = pipes[input.cellIndex];
  let uv = input.uv;
  let time = uniforms.time;

  let pipeType = u32(pipe.pipeType);
  let rotation = pipe.rotation;
  let isActive = pipe.active > 0.5;

  if (pipeType == 0u) {
    // Empty cell - subtle grid pattern
    let gridLine = step(0.95, fract(uv.x * 4.0)) + step(0.95, fract(uv.y * 4.0));
    return vec4f(vec3f(0.05, 0.08, 0.12) + vec3f(0.02) * gridLine, 0.5);
  }

  let dist = pipeSDF(uv, pipeType, rotation);

  var color = vec3f(0.0);
  var alpha = 0.0;

  // Pipe body
  let pipeBody = smoothstep(0.02, -0.02, dist);

  if (isActive) {
    // Active pipe - glowing cyan/blue
    color = vec3f(0.0, 0.7, 1.0) * pipeBody;

    // Energy flow
    let flow = energyFlow(uv, time, pipeType, rotation);
    color += vec3f(0.3, 0.9, 1.0) * flow;

    // Glow
    let glow = smoothstep(0.15, -0.05, dist) * 0.4;
    color += vec3f(0.0, 0.5, 0.8) * glow;

    // Pulse
    let pulse = sin(time * 4.0) * 0.15 + 0.85;
    color *= pulse;

    alpha = pipeBody + glow;
  } else {
    // Inactive pipe - dim grey
    color = vec3f(0.3, 0.35, 0.4) * pipeBody;

    // Subtle edge highlight
    let edge = smoothstep(0.0, -0.03, dist) - smoothstep(-0.03, -0.06, dist);
    color += vec3f(0.1, 0.12, 0.15) * edge;

    alpha = pipeBody * 0.9;
  }

  // Start marker
  if (pipeType == 5u) {
    let c = uv - 0.5;
    let markerDist = length(c + vec2f(0.15, 0.0));
    let marker = smoothstep(0.12, 0.08, markerDist);
    color = mix(color, vec3f(1.0, 0.3, 0.2), marker);
    alpha = max(alpha, marker);
  }

  // End marker
  if (pipeType == 6u) {
    let c = uv - 0.5;
    let markerDist = max(abs(c.x - 0.15), abs(c.y));
    let marker = smoothstep(0.1, 0.07, markerDist);
    color = mix(color, vec3f(0.2, 1.0, 0.5), marker);
    alpha = max(alpha, marker);
  }

  return vec4f(color, alpha);
}
`;

/**
 * Particle Shader - Energy particles
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

  // Type 0: Rotate burst
  if (pType == 0u) {
    let angle = atan2(uv.y, uv.x);
    let spiral = sin(angle * 4.0 + time * 6.0) * 0.5 + 0.5;
    alpha = smoothstep(1.0, 0.0, dist) * lifeRatio * (0.5 + spiral * 0.5);
  }
  // Type 1: Connect spark
  else if (pType == 1u) {
    let star = pow(sin(atan2(uv.y, uv.x) * 5.0 + time * 4.0) * 0.5 + 0.5, 3.0);
    alpha = smoothstep(1.0, 0.0, dist / (0.5 + star * 0.5)) * lifeRatio;
  }
  // Type 2: Complete
  else if (pType == 2u) {
    alpha = smoothstep(1.0, 0.0, dist) * lifeRatio;
    let ring = smoothstep(0.1, 0.0, abs(dist - 0.6 * lifeRatio));
    alpha = max(alpha, ring);
  }
  // Type 3: Flow
  else if (pType == 3u) {
    let stretch = length(vec2f(uv.x * 0.5, uv.y));
    alpha = smoothstep(1.0, 0.0, stretch) * lifeRatio * 0.8;
  }
  // Type 4: Ambient
  else {
    let pulse = sin(time * 3.0 + particle.x * 20.0) * 0.3 + 0.7;
    alpha = smoothstep(1.0, 0.0, dist) * lifeRatio * pulse * 0.4;
  }

  alpha *= particle.colorA;

  return vec4f(color * alpha, alpha);
}
`;

/**
 * Victory Shader - Circuit completion
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

  // Energy wave expanding
  let waveRadius = progress * 1.2;
  let wave = smoothstep(0.04, 0.0, abs(dist - waveRadius)) * (1.0 - progress * 0.3);
  color += vec3f(0.0, 0.8, 1.0) * wave;
  alpha = max(alpha, wave * 0.8);

  // Circuit lines completing
  let lineScale = 8.0;
  let lineX = smoothstep(0.02, 0.0, abs(fract(uv.x * lineScale) - 0.5)) * step(dist, progress * 1.5);
  let lineY = smoothstep(0.02, 0.0, abs(fract(uv.y * lineScale) - 0.5)) * step(dist, progress * 1.5);
  let lines = (lineX + lineY) * 0.4;
  color += vec3f(0.0, 0.6, 0.8) * lines * progress;
  alpha = max(alpha, lines * progress);

  // Central glow
  let centralGlow = smoothstep(0.3 * progress, 0.0, dist) * progress;
  color += vec3f(0.2, 0.9, 1.0) * centralGlow;
  alpha = max(alpha, centralGlow * 0.5);

  alpha *= progress;

  return vec4f(color, alpha);
}
`;
