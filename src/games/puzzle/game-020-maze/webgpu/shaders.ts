/**
 * WebGPU Shaders - Maze
 * Neural Circuit Theme
 * Game #020
 */

/**
 * Background Shader - Neural network pattern
 */
export const backgroundShader = /* wgsl */ `
struct Uniforms {
  time: f32,
  aspectRatio: f32,
  playerX: f32,
  playerY: f32,
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

// Neural node pattern
fn neuralNodes(uv: vec2f, time: f32) -> f32 {
  let scale = 8.0;
  let cellUv = uv * scale;
  let cellId = floor(cellUv);
  let cellLocal = fract(cellUv);

  // Hash for node position
  let h = fract(sin(dot(cellId, vec2f(12.9898, 78.233))) * 43758.5453);
  let nodePos = vec2f(0.3 + h * 0.4, 0.3 + fract(h * 17.3) * 0.4);

  let dist = length(cellLocal - nodePos);
  let pulse = sin(time * 2.0 + h * 6.28) * 0.3 + 0.7;

  return smoothstep(0.15, 0.0, dist) * pulse * 0.3;
}

// Connection lines
fn neuralConnections(uv: vec2f, time: f32) -> f32 {
  let scale = 20.0;
  let lineX = abs(fract(uv.x * scale + time * 0.1) - 0.5);
  let lineY = abs(fract(uv.y * scale - time * 0.08) - 0.5);

  let lines = smoothstep(0.48, 0.5, lineX) + smoothstep(0.48, 0.5, lineY);
  return lines * 0.08;
}

// Data flow effect
fn dataFlow(uv: vec2f, time: f32, playerPos: vec2f) -> f32 {
  let toPlayer = playerPos - uv;
  let dist = length(toPlayer);

  let wave = sin(dist * 30.0 - time * 4.0) * 0.5 + 0.5;
  let falloff = smoothstep(0.5, 0.0, dist);

  return wave * falloff * 0.2;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  let uv = input.uv;
  let time = uniforms.time;
  let playerPos = vec2f(uniforms.playerX, uniforms.playerY);

  // Deep circuit background
  var color = vec3f(0.02, 0.03, 0.06);

  // Subtle gradient
  color += vec3f(0.0, 0.02, 0.04) * (1.0 - uv.y);

  // Neural nodes
  let nodes = neuralNodes(uv, time);
  color += vec3f(0.5, 0.0, 1.0) * nodes;

  // Connection grid
  let connections = neuralConnections(uv, time);
  color += vec3f(0.3, 0.0, 0.6) * connections;

  // Data flow from player
  let flow = dataFlow(uv, time, playerPos);
  color += vec3f(0.0, 0.8, 1.0) * flow;

  // Subtle circuit traces
  let traceX = step(0.98, fract(uv.x * 60.0));
  let traceY = step(0.98, fract(uv.y * 60.0));
  color += vec3f(0.2, 0.0, 0.4) * (traceX + traceY) * 0.1;

  // Vignette
  let vignette = 1.0 - length(uv - 0.5) * 0.5;
  color *= vignette;

  return vec4f(color, 1.0);
}
`;

/**
 * Wall Shader - Circuit walls
 */
export const wallShader = /* wgsl */ `
struct Uniforms {
  time: f32,
  cellSize: f32,
  cols: f32,
  rows: f32,
}

struct WallSegment {
  x1: f32,
  y1: f32,
  x2: f32,
  y2: f32,
  intensity: f32,
  pad0: f32,
  pad1: f32,
  pad2: f32,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;
@group(0) @binding(1) var<storage, read> walls: array<WallSegment>;

struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) uv: vec2f,
  @location(1) @interpolate(flat) wallIndex: u32,
}

@vertex
fn vertexMain(
  @builtin(vertex_index) vertexIndex: u32,
  @builtin(instance_index) instanceIndex: u32
) -> VertexOutput {
  let wall = walls[instanceIndex];

  // Calculate wall direction and perpendicular
  let dir = vec2f(wall.x2 - wall.x1, wall.y2 - wall.y1);
  let len = length(dir);
  let normDir = dir / len;
  let perp = vec2f(-normDir.y, normDir.x);

  // Wall thickness
  let thickness = 0.008;

  // Quad vertices
  var localPos: vec2f;
  switch(vertexIndex % 6u) {
    case 0u: { localPos = vec2f(0.0, -thickness); }
    case 1u: { localPos = vec2f(1.0, -thickness); }
    case 2u: { localPos = vec2f(0.0, thickness); }
    case 3u: { localPos = vec2f(0.0, thickness); }
    case 4u: { localPos = vec2f(1.0, -thickness); }
    case 5u: { localPos = vec2f(1.0, thickness); }
    default: { localPos = vec2f(0.0, 0.0); }
  }

  let worldPos = vec2f(wall.x1, wall.y1) + normDir * localPos.x * len + perp * localPos.y;
  let clipPos = worldPos * 2.0 - 1.0;

  var output: VertexOutput;
  output.position = vec4f(clipPos.x, -clipPos.y, 0.0, 1.0);
  output.uv = localPos;
  output.wallIndex = instanceIndex;
  return output;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  let wall = walls[input.wallIndex];
  let time = uniforms.time;
  let uv = input.uv;

  // Distance from center line
  let centerDist = abs(uv.y);
  let normalizedDist = centerDist / 0.008;

  // Neon glow effect
  let core = smoothstep(0.5, 0.0, normalizedDist);
  let glow = smoothstep(1.0, 0.0, normalizedDist) * 0.5;

  // Energy pulse along wall
  let pulse = sin(uv.x * 20.0 - time * 3.0) * 0.3 + 0.7;

  // Wall color - electric purple/magenta
  var color = vec3f(0.8, 0.0, 1.0) * core * pulse;
  color += vec3f(0.5, 0.0, 0.8) * glow;

  // Intensity variation
  color *= wall.intensity;

  let alpha = (core + glow) * wall.intensity;

  return vec4f(color, alpha);
}
`;

/**
 * Player Shader - Neural signal node
 */
export const playerShader = /* wgsl */ `
struct Uniforms {
  time: f32,
  x: f32,
  y: f32,
  radius: f32,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;

struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) uv: vec2f,
}

@vertex
fn vertexMain(@builtin(vertex_index) vertexIndex: u32) -> VertexOutput {
  var quadPos = array<vec2f, 6>(
    vec2f(-1.0, -1.0),
    vec2f(1.0, -1.0),
    vec2f(-1.0, 1.0),
    vec2f(-1.0, 1.0),
    vec2f(1.0, -1.0),
    vec2f(1.0, 1.0)
  );

  let localPos = quadPos[vertexIndex];
  let size = uniforms.radius * 2.5;
  let worldPos = vec2f(uniforms.x, uniforms.y) + localPos * size;
  let clipPos = worldPos * 2.0 - 1.0;

  var output: VertexOutput;
  output.position = vec4f(clipPos.x, -clipPos.y, 0.0, 1.0);
  output.uv = localPos;
  return output;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  let uv = input.uv;
  let time = uniforms.time;
  let dist = length(uv);

  // Core
  let core = smoothstep(0.4, 0.0, dist);

  // Outer rings
  let ring1 = smoothstep(0.05, 0.0, abs(dist - 0.6)) * 0.8;
  let ring2 = smoothstep(0.03, 0.0, abs(dist - 0.8)) * 0.5;

  // Pulsing
  let pulse = sin(time * 4.0) * 0.2 + 0.8;

  // Rotating segments
  let angle = atan2(uv.y, uv.x);
  let segments = step(0.5, fract(angle / 1.57 + time * 0.5));
  let segmentMask = smoothstep(0.5, 0.6, dist) * smoothstep(0.9, 0.7, dist);

  // Color: bright cyan core with purple rings
  var color = vec3f(0.0, 1.0, 1.0) * core * pulse;
  color += vec3f(0.6, 0.0, 1.0) * ring1;
  color += vec3f(0.4, 0.2, 1.0) * ring2;
  color += vec3f(0.0, 0.8, 1.0) * segments * segmentMask * 0.4;

  // Outer glow
  let outerGlow = smoothstep(1.0, 0.4, dist) * 0.3;
  color += vec3f(0.0, 0.5, 1.0) * outerGlow;

  let alpha = core + ring1 + ring2 + outerGlow + segments * segmentMask * 0.3;

  return vec4f(color, alpha);
}
`;

/**
 * Exit Shader - Goal beacon
 */
export const exitShader = /* wgsl */ `
struct Uniforms {
  time: f32,
  x: f32,
  y: f32,
  radius: f32,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;

struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) uv: vec2f,
}

@vertex
fn vertexMain(@builtin(vertex_index) vertexIndex: u32) -> VertexOutput {
  var quadPos = array<vec2f, 6>(
    vec2f(-1.0, -1.0),
    vec2f(1.0, -1.0),
    vec2f(-1.0, 1.0),
    vec2f(-1.0, 1.0),
    vec2f(1.0, -1.0),
    vec2f(1.0, 1.0)
  );

  let localPos = quadPos[vertexIndex];
  let size = uniforms.radius * 3.0;
  let worldPos = vec2f(uniforms.x, uniforms.y) + localPos * size;
  let clipPos = worldPos * 2.0 - 1.0;

  var output: VertexOutput;
  output.position = vec4f(clipPos.x, -clipPos.y, 0.0, 1.0);
  output.uv = localPos;
  return output;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  let uv = input.uv;
  let time = uniforms.time;
  let dist = length(uv);

  // Pulsing beacon
  let pulse = sin(time * 3.0) * 0.3 + 0.7;

  // Core glow
  let core = smoothstep(0.3, 0.0, dist) * pulse;

  // Expanding rings
  let ringPhase = fract(time * 0.5);
  let ring1 = smoothstep(0.03, 0.0, abs(dist - ringPhase * 0.8)) * (1.0 - ringPhase);
  let ring2 = smoothstep(0.03, 0.0, abs(dist - fract(ringPhase + 0.5) * 0.8)) * (0.5 + fract(ringPhase + 0.5) * 0.5);

  // Star shape
  let angle = atan2(uv.y, uv.x);
  let star = pow(sin(angle * 4.0 + time * 2.0) * 0.5 + 0.5, 2.0);
  let starMask = smoothstep(0.5, 0.3, dist);

  // Green/teal success color
  var color = vec3f(0.0, 1.0, 0.6) * core;
  color += vec3f(0.0, 0.8, 0.5) * ring1;
  color += vec3f(0.0, 0.6, 0.4) * ring2;
  color += vec3f(0.2, 1.0, 0.7) * star * starMask * 0.5;

  // Outer glow
  let outerGlow = smoothstep(1.0, 0.3, dist) * 0.2 * pulse;
  color += vec3f(0.0, 0.5, 0.3) * outerGlow;

  let alpha = core + ring1 + ring2 + star * starMask * 0.3 + outerGlow;

  return vec4f(color, alpha);
}
`;

/**
 * Particle Shader - Neural signals
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

  // Type 0: Move trail
  if (pType == 0u) {
    alpha = smoothstep(1.0, 0.0, dist) * lifeRatio * 0.7;
    // Elongated shape for motion
    let stretch = length(vec2f(uv.x * 0.5, uv.y));
    alpha *= smoothstep(1.0, 0.0, stretch);
  }
  // Type 1: Wall bump
  else if (pType == 1u) {
    let ring = smoothstep(0.1, 0.0, abs(dist - 0.6 * (1.0 - lifeRatio)));
    alpha = ring * lifeRatio;
  }
  // Type 2: Complete
  else if (pType == 2u) {
    let angle = atan2(uv.y, uv.x);
    let star = 0.5 + 0.5 * sin(angle * 6.0 + time * 4.0);
    let starDist = dist / (0.6 + star * 0.4);
    alpha = smoothstep(1.0, 0.0, starDist) * lifeRatio;
  }
  // Type 3: Signal pulse
  else if (pType == 3u) {
    let pulse = sin(time * 6.0 + particle.x * 20.0) * 0.3 + 0.7;
    alpha = smoothstep(1.0, 0.0, dist) * lifeRatio * pulse;
  }
  // Type 4: Ambient
  else {
    let flicker = sin(time * 3.0 + particle.y * 15.0) * 0.3 + 0.7;
    alpha = smoothstep(1.0, 0.0, dist) * lifeRatio * flicker * 0.4;
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
  exitX: f32,
  exitY: f32,
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
  let exitPos = vec2f(uniforms.exitX, uniforms.exitY);

  if (progress <= 0.0) {
    discard;
  }

  let dist = length(uv - exitPos);
  var color = vec3f(0.0);
  var alpha = 0.0;

  // Expanding energy wave
  let waveRadius = progress * 1.5;
  let wave = smoothstep(0.05, 0.0, abs(dist - waveRadius)) * (1.0 - progress * 0.5);
  color += vec3f(0.0, 1.0, 0.7) * wave;
  alpha = max(alpha, wave * 0.8);

  // Circuit completion lines
  let lineProgress = progress * 2.0;
  let lineX = smoothstep(0.02, 0.0, abs(fract(uv.x * 10.0) - 0.5)) * step(uv.x, exitPos.x * lineProgress);
  let lineY = smoothstep(0.02, 0.0, abs(fract(uv.y * 10.0) - 0.5)) * step(uv.y, exitPos.y * lineProgress);
  let lines = (lineX + lineY) * 0.3 * progress;
  color += vec3f(0.0, 0.8, 1.0) * lines;
  alpha = max(alpha, lines);

  // Central burst
  let burstDist = length(uv - exitPos);
  let burst = smoothstep(0.3 * progress, 0.0, burstDist) * progress;
  color += vec3f(0.2, 1.0, 0.6) * burst;
  alpha = max(alpha, burst * 0.6);

  // Sparkle ring
  let sparkleAngle = atan2(uv.y - exitPos.y, uv.x - exitPos.x);
  let sparkle = pow(sin(sparkleAngle * 12.0 + time * 6.0) * 0.5 + 0.5, 3.0);
  let sparkleRing = smoothstep(0.02, 0.0, abs(dist - progress * 0.8));
  color += vec3f(0.5, 1.0, 0.8) * sparkle * sparkleRing;
  alpha = max(alpha, sparkle * sparkleRing * 0.5);

  alpha *= smoothstep(2.0, 0.0, dist);
  alpha *= progress;

  return vec4f(color, alpha);
}
`;
