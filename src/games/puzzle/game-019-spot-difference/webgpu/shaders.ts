/**
 * WebGPU Shaders - Spot Difference
 * Quantum Scanner Theme
 * Game #019
 */

/**
 * Background Shader - Quantum scanner grid
 */
export const backgroundShader = /* wgsl */ `
struct Uniforms {
  time: f32,
  aspectRatio: f32,
  scanProgress: f32,
  alertLevel: f32,
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

// Scanner grid effect
fn scannerGrid(uv: vec2f, time: f32) -> f32 {
  let gridScale = 30.0;
  let gridUv = uv * gridScale;

  let lineX = smoothstep(0.97, 1.0, fract(gridUv.x)) + smoothstep(0.03, 0.0, fract(gridUv.x));
  let lineY = smoothstep(0.97, 1.0, fract(gridUv.y)) + smoothstep(0.03, 0.0, fract(gridUv.y));

  let pulse = sin(time * 2.0 + uv.x * 5.0 + uv.y * 5.0) * 0.3 + 0.7;
  return (lineX + lineY) * 0.15 * pulse;
}

// Scan line effect
fn scanLine(uv: vec2f, time: f32, progress: f32) -> f32 {
  let scanY = fract(time * 0.15);
  let dist = abs(uv.y - scanY);
  return smoothstep(0.03, 0.0, dist) * progress;
}

// Radar sweep
fn radarSweep(uv: vec2f, time: f32) -> f32 {
  let center = vec2f(0.5, 0.5);
  let toPoint = uv - center;
  let angle = atan2(toPoint.y, toPoint.x);
  let sweepAngle = fract(time * 0.2) * 6.28 - 3.14;

  let angleDiff = abs(angle - sweepAngle);
  let minDiff = min(angleDiff, 6.28 - angleDiff);

  let dist = length(toPoint);
  let sweep = smoothstep(0.3, 0.0, minDiff) * smoothstep(0.6, 0.0, dist);
  return sweep * 0.3;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  let uv = input.uv;
  let time = uniforms.time;
  let alertLevel = uniforms.alertLevel;

  // Deep space background
  var color = vec3f(0.01, 0.02, 0.04);

  // Add gradient
  color += vec3f(0.0, 0.02, 0.05) * (1.0 - uv.y);

  // Scanner grid
  let grid = scannerGrid(uv, time);
  color += vec3f(0.0, 0.6, 0.8) * grid;

  // Scan line
  let scan = scanLine(uv, time, uniforms.scanProgress);
  color += vec3f(0.0, 1.0, 0.8) * scan * 0.5;

  // Radar sweep
  let radar = radarSweep(uv, time);
  color += vec3f(0.0, 0.8, 1.0) * radar;

  // Alert color when differences found
  if (alertLevel > 0.0) {
    let pulse = sin(time * 6.0) * 0.3 + 0.7;
    color += vec3f(1.0, 0.3, 0.0) * alertLevel * pulse * 0.1;
  }

  // Vignette
  let vignette = 1.0 - length(uv - 0.5) * 0.6;
  color *= vignette;

  // CRT scan lines
  let scanLines = sin(uv.y * 300.0) * 0.02 + 0.98;
  color *= scanLines;

  return vec4f(color, 1.0);
}
`;

/**
 * Marker Shader - Anomaly detection markers
 */
export const markerShader = /* wgsl */ `
struct Uniforms {
  time: f32,
  markerCount: f32,
  canvasWidth: f32,
  canvasHeight: f32,
}

struct MarkerData {
  x: f32,
  y: f32,
  radius: f32,
  state: f32,      // 0=hidden, 1=found, 2=hint
  pulsePhase: f32,
  foundTime: f32,
  pad0: f32,
  pad1: f32,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;
@group(0) @binding(1) var<storage, read> markers: array<MarkerData>;

struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) uv: vec2f,
  @location(1) @interpolate(flat) markerIndex: u32,
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

  let marker = markers[instanceIndex];
  let localPos = quadPos[vertexIndex];

  // Scale for marker size
  let size = marker.radius * 2.5;
  let pixelPos = vec2f(marker.x, marker.y) + localPos * size;
  let clipPos = (pixelPos / vec2f(uniforms.canvasWidth, uniforms.canvasHeight)) * 2.0 - 1.0;

  var output: VertexOutput;
  output.position = vec4f(clipPos.x, -clipPos.y, 0.0, 1.0);
  output.uv = localPos;
  output.markerIndex = instanceIndex;
  return output;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  let marker = markers[input.markerIndex];
  let uv = input.uv;
  let time = uniforms.time;
  let state = u32(marker.state);

  if (state == 0u) {
    discard;
  }

  let dist = length(uv);
  var color = vec3f(0.0);
  var alpha = 0.0;

  let pulse = sin(time * 4.0 + marker.pulsePhase) * 0.3 + 0.7;

  // Ring effect
  let ringWidth = 0.08;
  let ring = smoothstep(ringWidth, 0.0, abs(dist - 0.7)) +
             smoothstep(ringWidth, 0.0, abs(dist - 0.85));

  if (state == 1u) {
    // Found - green/cyan
    color = vec3f(0.0, 1.0, 0.7);
    alpha = ring * pulse;

    // Checkmark hint in center
    let centerGlow = smoothstep(0.4, 0.0, dist);
    color += vec3f(0.0, 0.3, 0.2) * centerGlow;
    alpha = max(alpha, centerGlow * 0.3);
  } else if (state == 2u) {
    // Hint - yellow/orange pulsing
    color = vec3f(1.0, 0.6, 0.0);
    alpha = ring * pulse;

    // Exclamation in center
    let exclaim = smoothstep(0.3, 0.0, dist);
    color += vec3f(0.3, 0.15, 0.0) * exclaim;
    alpha = max(alpha, exclaim * 0.4);
  }

  // Outer glow
  let outerGlow = smoothstep(1.0, 0.7, dist) * 0.3;
  alpha = max(alpha, outerGlow * pulse);

  // Scanning lines on marker
  let scanLine = step(0.9, fract(uv.y * 5.0 + time * 2.0));
  alpha *= 0.8 + scanLine * 0.2;

  return vec4f(color * alpha, alpha);
}
`;

/**
 * Particle Shader - Quantum detection particles
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

  // Type 0: Click - detection pulse
  if (pType == 0u) {
    let ring = smoothstep(0.8, 0.6, dist) - smoothstep(0.6, 0.4, dist);
    alpha = ring * lifeRatio;

    // Core glow
    alpha = max(alpha, smoothstep(0.3, 0.0, dist) * lifeRatio * 0.5);
  }
  // Type 1: Found - success burst
  else if (pType == 1u) {
    alpha = smoothstep(1.0, 0.0, dist) * lifeRatio;

    // Sparkle
    let angle = atan2(uv.y, uv.x);
    let star = pow(sin(angle * 6.0 + time * 3.0) * 0.5 + 0.5, 3.0);
    alpha *= 0.7 + star * 0.3;
  }
  // Type 2: Miss - error ripple
  else if (pType == 2u) {
    let ring = smoothstep(0.15, 0.0, abs(dist - 0.7 * (1.0 - lifeRatio)));
    alpha = ring * lifeRatio;
  }
  // Type 3: Complete - victory burst
  else if (pType == 3u) {
    let angle = atan2(uv.y, uv.x);
    let star = 0.5 + 0.5 * sin(angle * 8.0 + time * 4.0);
    let starDist = dist / (0.5 + star * 0.3);
    alpha = smoothstep(1.0, 0.0, starDist) * lifeRatio;
  }
  // Type 4: Ambient - scanner particles
  else {
    let pulse = sin(time * 2.0 + particle.x * 10.0) * 0.3 + 0.7;
    alpha = smoothstep(1.0, 0.0, dist) * lifeRatio * pulse * 0.5;
  }

  alpha *= particle.colorA;

  return vec4f(color * alpha, alpha);
}
`;

/**
 * Victory Shader - All anomalies detected
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

  // Expanding scan rings
  for (var i = 0; i < 4; i++) {
    let ringRadius = progress * 0.3 * f32(i + 1);
    let ringWidth = 0.02;
    let ring = smoothstep(ringWidth, 0.0, abs(dist - ringRadius));

    let ringColor = vec3f(0.0, 0.8 - f32(i) * 0.15, 1.0 - f32(i) * 0.1);
    color += ringColor * ring;
    alpha = max(alpha, ring * 0.7);
  }

  // Central glow
  let centralGlow = smoothstep(0.3 * progress, 0.0, dist);
  color += vec3f(0.0, 0.8, 0.6) * centralGlow * progress;
  alpha = max(alpha, centralGlow * 0.4 * progress);

  // Checkmark pattern
  let checkScale = 10.0;
  let checkUv = (uv - center) * checkScale;
  let checkMask = smoothstep(0.4 * progress, 0.0, dist);

  // Data overlay
  let dataScale = 40.0;
  let dataUv = uv * dataScale;
  let dx = floor(dataUv.x);
  let dy = floor(dataUv.y);
  let data = step(0.5, fract(sin(dx * 12.9898 + dy * 78.233 + time * 3.0) * 43758.5453));
  let dataMask = smoothstep(0.5 * progress, 0.0, dist) * (1.0 - smoothstep(0.0, 0.2 * progress, dist));
  color += vec3f(0.0, 0.5, 0.4) * data * 0.2 * dataMask;

  // Sparkles
  let sparkleAngle = atan2(uv.y - center.y, uv.x - center.x);
  let sparkle = pow(sin(sparkleAngle * 10.0 + time * 5.0) * 0.5 + 0.5, 4.0);
  let sparkleRing = smoothstep(0.02, 0.0, abs(dist - progress * 0.8));
  color += vec3f(0.5, 1.0, 0.8) * sparkle * sparkleRing;
  alpha = max(alpha, sparkle * sparkleRing * 0.5);

  alpha *= smoothstep(1.5, 0.0, dist);
  alpha *= progress;

  return vec4f(color, alpha);
}
`;
