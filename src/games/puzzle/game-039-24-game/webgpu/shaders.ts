/**
 * WebGPU Shaders - 24 Game
 * Mental Math Arena / Calculator Championship Theme
 * Game #039
 */

export const backgroundShader = /* wgsl */`
struct Uniforms {
  time: f32,
  aspect: f32,
  pad1: f32,
  pad2: f32,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;

struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) uv: vec2f,
}

@vertex
fn vertexMain(@builtin(vertex_index) vertexIndex: u32) -> VertexOutput {
  var pos = array<vec2f, 6>(
    vec2f(-1, -1), vec2f(1, -1), vec2f(-1, 1),
    vec2f(-1, 1), vec2f(1, -1), vec2f(1, 1)
  );

  var output: VertexOutput;
  output.position = vec4f(pos[vertexIndex], 0, 1);
  output.uv = pos[vertexIndex] * 0.5 + 0.5;
  return output;
}

fn hash(p: vec2f) -> f32 {
  var p3 = fract(vec3f(p.x, p.y, p.x) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

fn noise(p: vec2f) -> f32 {
  let i = floor(p);
  let f = fract(p);
  let u = f * f * (3.0 - 2.0 * f);

  return mix(
    mix(hash(i), hash(i + vec2f(1, 0)), u.x),
    mix(hash(i + vec2f(0, 1)), hash(i + vec2f(1, 1)), u.x),
    u.y
  );
}

// Grid pattern for calculator display
fn gridPattern(uv: vec2f, gridSize: f32) -> f32 {
  let grid = fract(uv * gridSize);
  let lineX = smoothstep(0.02, 0.0, abs(grid.x - 0.5) - 0.48);
  let lineY = smoothstep(0.02, 0.0, abs(grid.y - 0.5) - 0.48);
  return max(lineX, lineY);
}

// Digital seven-segment style decoration
fn segmentGlow(uv: vec2f, time: f32) -> f32 {
  var glow = 0.0;

  // Random segment positions
  for (var i = 0; i < 8; i++) {
    let idx = f32(i);
    let px = hash(vec2f(idx, 0.0)) * 0.8 + 0.1;
    let py = hash(vec2f(idx, 1.0)) * 0.8 + 0.1;
    let phase = hash(vec2f(idx, 2.0)) * 6.28;

    let brightness = sin(time * 2.0 + phase) * 0.5 + 0.5;
    let dist = length(uv - vec2f(px, py));
    glow += smoothstep(0.15, 0.0, dist) * brightness * 0.15;
  }

  return glow;
}

// Math symbol floating effect
fn mathSymbols(uv: vec2f, time: f32) -> f32 {
  var symbols = 0.0;

  for (var i = 0; i < 12; i++) {
    let idx = f32(i);
    let startX = hash(vec2f(idx, 0.0));
    let speed = hash(vec2f(idx, 1.0)) * 0.1 + 0.05;
    let size = hash(vec2f(idx, 2.0)) * 0.015 + 0.01;
    let phase = hash(vec2f(idx, 3.0)) * 6.28;

    let y = fract(time * speed + hash(vec2f(idx, 4.0)));
    let x = startX + sin(time + phase) * 0.05;

    let dist = length(uv - vec2f(x, y));
    let fade = smoothstep(0.0, 0.2, y) * smoothstep(1.0, 0.8, y);
    symbols += smoothstep(size, 0.0, dist) * fade * 0.3;
  }

  return symbols;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  let uv = input.uv;
  let time = uniforms.time;

  // Base calculator dark colors
  let calcBlack = vec3f(0.05, 0.05, 0.08);
  let calcGray = vec3f(0.12, 0.12, 0.16);
  let displayGreen = vec3f(0.0, 0.8, 0.4);
  let accentBlue = vec3f(0.2, 0.5, 1.0);
  let goldNumber = vec3f(1.0, 0.85, 0.3);

  // Base gradient
  var color = mix(calcBlack, calcGray, uv.y * 0.5 + 0.25);

  // Grid pattern
  let grid = gridPattern(uv, 20.0);
  color = mix(color, color * 1.3, grid * 0.3);

  // Subtle grid pulse
  let gridPulse = sin(time * 0.5) * 0.5 + 0.5;
  let fineGrid = gridPattern(uv, 40.0);
  color += vec3f(0.0, 0.3, 0.2) * fineGrid * gridPulse * 0.1;

  // Digital segment glow
  let segments = segmentGlow(uv, time);
  color += displayGreen * segments;

  // Floating math symbols
  let symbols = mathSymbols(uv, time);
  color += goldNumber * symbols;

  // Corner accent lights
  let cornerTL = smoothstep(0.4, 0.0, length(uv));
  let cornerBR = smoothstep(0.4, 0.0, length(uv - 1.0));
  color += accentBlue * cornerTL * 0.08;
  color += displayGreen * cornerBR * 0.08;

  // Scanline effect
  let scanline = sin(uv.y * 200.0 + time * 2.0) * 0.5 + 0.5;
  color *= 0.95 + scanline * 0.05;

  // Noise texture
  let n = noise(uv * 100.0 + time * 0.5) * 0.02;
  color += n;

  // Vignette
  let vignette = smoothstep(0.0, 0.7, length(uv - 0.5));
  color *= 1.0 - vignette * 0.4;

  return vec4f(color, 1.0);
}
`;

export const particleShader = /* wgsl */`
struct Uniforms {
  time: f32,
  aspect: f32,
  pad1: f32,
  pad2: f32,
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
  @location(2) particleType: f32,
  @location(3) life: f32,
}

@vertex
fn vertexMain(
  @builtin(vertex_index) vertexIndex: u32,
  @builtin(instance_index) instanceIndex: u32
) -> VertexOutput {
  var quad = array<vec2f, 6>(
    vec2f(-1, -1), vec2f(1, -1), vec2f(-1, 1),
    vec2f(-1, 1), vec2f(1, -1), vec2f(1, 1)
  );

  let p = particles[instanceIndex];
  let size = p.size;
  let pos = quad[vertexIndex] * size + vec2f(p.x * 2.0 - 1.0, 1.0 - p.y * 2.0);

  var output: VertexOutput;
  output.position = vec4f(pos.x / uniforms.aspect, pos.y, 0, 1);
  output.uv = quad[vertexIndex] * 0.5 + 0.5;
  output.color = vec4f(p.r, p.g, p.b, p.a);
  output.particleType = p.particleType;
  output.life = p.life / p.maxLife;
  return output;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  let uv = input.uv;
  let centered = uv - 0.5;
  let dist = length(centered);
  let pType = i32(input.particleType);
  var alpha = input.color.a;
  var color = input.color.rgb;

  if (pType == 0) {
    // Click - digital burst
    let burst = smoothstep(0.5, 0.0, dist);
    let core = smoothstep(0.15, 0.0, dist);
    alpha *= burst;
    color = mix(color, vec3f(1.0, 1.0, 1.0), core * 0.7);

    // Square pixel pattern
    let angle = atan2(centered.y, centered.x);
    let square = abs(cos(angle * 4.0));
    alpha *= 0.6 + square * 0.4;

  } else if (pType == 1) {
    // Operator - math symbol pulse
    let pulse = smoothstep(0.5, 0.1, dist);
    alpha *= pulse;

    // Cross/plus shape hint
    let crossX = smoothstep(0.08, 0.0, abs(centered.x)) * (1.0 - smoothstep(0.3, 0.4, abs(centered.y)));
    let crossY = smoothstep(0.08, 0.0, abs(centered.y)) * (1.0 - smoothstep(0.3, 0.4, abs(centered.x)));
    alpha *= 0.5 + (crossX + crossY) * 0.5;

  } else if (pType == 2) {
    // Victory - golden number celebration
    let angle = atan2(centered.y, centered.x) + uniforms.time * 3.0;
    let rays = pow(abs(sin(angle * 8.0)), 4.0);
    let glow = smoothstep(0.5, 0.0, dist);
    alpha *= glow * (0.5 + rays * 0.5);

    // Shimmer
    let shimmer = sin(uniforms.time * 10.0 + dist * 20.0) * 0.3 + 0.7;
    alpha *= shimmer;
    color = mix(color, vec3f(1.0, 1.0, 0.8), rays * 0.5);

  } else if (pType == 3) {
    // Ambient - floating digit particle
    let digit = smoothstep(0.5, 0.2, dist);
    alpha *= digit * 0.4;

    // Gentle pulse
    let pulse = sin(uniforms.time * 2.0 + dist * 5.0) * 0.2 + 0.8;
    alpha *= pulse;

  } else if (pType == 4) {
    // Calculate - computation spark
    let spark = smoothstep(0.4, 0.0, dist);
    let core = smoothstep(0.1, 0.0, dist);
    alpha *= spark;
    color = mix(color, vec3f(1.0, 1.0, 1.0), core);

    // Trail effect
    let trail = smoothstep(0.5, 0.0, abs(centered.y)) * smoothstep(0.1, 0.0, centered.x + 0.3);
    alpha += trail * 0.3;
  }

  // Life-based fade
  let lifeFade = smoothstep(0.0, 0.2, input.life) * smoothstep(1.0, 0.7, input.life);
  alpha *= lifeFade;

  return vec4f(color, alpha);
}
`;

export const targetShader = /* wgsl */`
struct Uniforms {
  time: f32,
  intensity: f32,
  pad1: f32,
  pad2: f32,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;

struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) uv: vec2f,
}

@vertex
fn vertexMain(@builtin(vertex_index) vertexIndex: u32) -> VertexOutput {
  var pos = array<vec2f, 6>(
    vec2f(-1, -1), vec2f(1, -1), vec2f(-1, 1),
    vec2f(-1, 1), vec2f(1, -1), vec2f(1, 1)
  );

  var output: VertexOutput;
  output.position = vec4f(pos[vertexIndex], 0, 1);
  output.uv = pos[vertexIndex] * 0.5 + 0.5;
  return output;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  let uv = input.uv;
  let time = uniforms.time;
  let intensity = uniforms.intensity;

  // Target number "24" highlight effect
  let center = vec2f(0.5, 0.15);
  let dist = length(uv - center);

  // Pulsing ring
  let ringRadius = 0.08 + sin(time * 4.0) * 0.01;
  let ring = smoothstep(0.02, 0.0, abs(dist - ringRadius));

  // Glow
  let glow = smoothstep(0.15, 0.0, dist) * 0.5;

  // Golden color for 24
  let goldColor = vec3f(1.0, 0.85, 0.3);

  let totalGlow = (ring + glow) * intensity;

  return vec4f(goldColor * totalGlow, totalGlow * 0.6);
}
`;

export const victoryShader = /* wgsl */`
struct Uniforms {
  time: f32,
  intensity: f32,
  pad1: f32,
  pad2: f32,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;

struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) uv: vec2f,
}

@vertex
fn vertexMain(@builtin(vertex_index) vertexIndex: u32) -> VertexOutput {
  var pos = array<vec2f, 6>(
    vec2f(-1, -1), vec2f(1, -1), vec2f(-1, 1),
    vec2f(-1, 1), vec2f(1, -1), vec2f(1, 1)
  );

  var output: VertexOutput;
  output.position = vec4f(pos[vertexIndex], 0, 1);
  output.uv = pos[vertexIndex] * 0.5 + 0.5;
  return output;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  let uv = input.uv;
  let time = uniforms.time;
  let intensity = uniforms.intensity;

  let center = vec2f(0.5, 0.5);
  let dist = length(uv - center);
  let angle = atan2(uv.y - 0.5, uv.x - 0.5);

  // Expanding golden rings
  let ringRadius = fract(time * 0.5) * 0.7;
  let ring = smoothstep(0.04, 0.0, abs(dist - ringRadius)) * (1.0 - ringRadius);

  // Number rays
  let rays = pow(abs(sin(angle * 12.0 - time * 3.0)), 8.0);
  let rayStrength = smoothstep(0.6, 0.1, dist) * rays;

  // Calculator green and gold
  let greenColor = vec3f(0.0, 0.9, 0.5);
  let goldColor = vec3f(1.0, 0.85, 0.3);
  let whiteColor = vec3f(1.0, 1.0, 0.95);

  var color = mix(greenColor, goldColor, rayStrength);
  color = mix(color, whiteColor, ring);

  let totalGlow = (ring + rayStrength * 0.5) * intensity;

  // Center flash for "= 24"
  let centerFlash = smoothstep(0.2, 0.0, dist) * intensity * 0.5;
  color = mix(color, whiteColor, centerFlash);

  return vec4f(color * totalGlow, totalGlow * 0.7);
}
`;
