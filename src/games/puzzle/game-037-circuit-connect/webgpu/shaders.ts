/**
 * WebGPU Shaders - Circuit Connect
 * Neon Circuit Board / Cyberpunk Electronics Theme
 * Game #037
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

fn circuitTrace(uv: vec2f, gridSize: f32, time: f32) -> f32 {
  let gridUV = fract(uv * gridSize);
  let cellID = floor(uv * gridSize);

  let h = hash(cellID);
  let pattern = floor(h * 4.0);

  var trace = 0.0;
  let lineWidth = 0.08;

  // Horizontal line
  if (pattern == 0.0 || pattern == 2.0) {
    trace = max(trace, smoothstep(lineWidth, 0.0, abs(gridUV.y - 0.5)));
  }

  // Vertical line
  if (pattern == 1.0 || pattern == 2.0) {
    trace = max(trace, smoothstep(lineWidth, 0.0, abs(gridUV.x - 0.5)));
  }

  // Corner (L-shape)
  if (pattern == 3.0) {
    let corner = min(
      smoothstep(lineWidth, 0.0, abs(gridUV.y - 0.5)) * step(gridUV.x, 0.5),
      1.0
    ) + min(
      smoothstep(lineWidth, 0.0, abs(gridUV.x - 0.5)) * step(0.5, gridUV.y),
      1.0
    );
    trace = max(trace, min(corner, 1.0));
  }

  // Connection dots
  let dotSize = 0.12;
  let dotDist = length(gridUV - 0.5);
  let dot = smoothstep(dotSize, dotSize - 0.03, dotDist);
  trace = max(trace, dot * 0.5);

  // Energy pulse along traces
  let pulsePos = fract(time * 0.3 + h);
  let pulseDist = abs(gridUV.x - pulsePos) + abs(gridUV.y - 0.5);
  let pulse = smoothstep(0.3, 0.0, pulseDist) * trace;

  return trace * 0.3 + pulse * 0.4;
}

fn techGrid(uv: vec2f) -> f32 {
  let gridSize = 40.0;
  let gridUV = fract(uv * gridSize);

  let lineX = smoothstep(0.02, 0.0, abs(gridUV.x)) + smoothstep(0.02, 0.0, abs(gridUV.x - 1.0));
  let lineY = smoothstep(0.02, 0.0, abs(gridUV.y)) + smoothstep(0.02, 0.0, abs(gridUV.y - 1.0));

  return max(lineX, lineY) * 0.15;
}

fn viaPad(uv: vec2f, gridSize: f32) -> f32 {
  let cellID = floor(uv * gridSize);
  let gridUV = fract(uv * gridSize);
  let h = hash(cellID + vec2f(100.0));

  if (h > 0.85) {
    let dist = length(gridUV - 0.5);
    let ring = smoothstep(0.03, 0.0, abs(dist - 0.25));
    let center = smoothstep(0.1, 0.08, dist);
    return ring + center * 0.5;
  }

  return 0.0;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  let uv = input.uv;
  let time = uniforms.time;

  // Dark PCB base
  let pcbGreen = vec3f(0.02, 0.08, 0.05);
  let pcbDark = vec3f(0.01, 0.03, 0.02);

  // Substrate texture
  let texNoise = noise(uv * 100.0) * 0.03;
  var color = mix(pcbDark, pcbGreen, texNoise + 0.5);

  // Tech grid
  let grid = techGrid(uv);
  let gridColor = vec3f(0.0, 0.3, 0.2);
  color = mix(color, gridColor, grid);

  // Circuit traces
  let traces = circuitTrace(uv, 12.0, time);
  let traceColor = vec3f(0.0, 1.0, 0.8); // Neon cyan
  color = mix(color, traceColor, traces * 0.6);

  // Secondary trace layer
  let traces2 = circuitTrace(uv * 1.5 + vec2f(0.5), 8.0, time * 0.7);
  let trace2Color = vec3f(1.0, 0.8, 0.0); // Golden yellow
  color = mix(color, trace2Color, traces2 * 0.3);

  // Via pads
  let vias = viaPad(uv, 8.0);
  let viaColor = vec3f(0.8, 0.6, 0.2); // Copper
  color = mix(color, viaColor, vias * 0.7);

  // Scan line effect
  let scanLine = sin(uv.y * 200.0 + time * 2.0) * 0.02 + 0.98;
  color *= scanLine;

  // Edge vignette
  let vignette = smoothstep(0.0, 0.3, uv.x) * smoothstep(1.0, 0.7, uv.x) *
                 smoothstep(0.0, 0.3, uv.y) * smoothstep(1.0, 0.7, uv.y);
  color *= 0.7 + vignette * 0.3;

  // Corner tech decorations
  let cornerDist = min(
    min(length(uv), length(uv - vec2f(1.0, 0.0))),
    min(length(uv - vec2f(0.0, 1.0)), length(uv - vec2f(1.0, 1.0)))
  );
  let cornerGlow = smoothstep(0.15, 0.0, cornerDist);
  color += vec3f(0.0, 0.4, 0.3) * cornerGlow * 0.3;

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
    // Spark - electric arc
    let spark = smoothstep(0.5, 0.0, dist);
    let core = smoothstep(0.1, 0.0, dist);
    alpha *= spark;
    color = mix(color, vec3f(1.0, 1.0, 1.0), core);

    // Electric crackle
    let angle = atan2(centered.y, centered.x);
    let crackle = pow(abs(sin(angle * 8.0 + uniforms.time * 20.0)), 12.0);
    alpha = max(alpha, crackle * smoothstep(0.5, 0.15, dist) * input.color.a);

  } else if (pType == 1) {
    // Rotate - circular motion blur
    let angle = atan2(centered.y, centered.x);
    let arc = smoothstep(0.5, 0.3, dist) * smoothstep(0.1, 0.2, dist);
    let sweep = smoothstep(0.0, 0.3, sin(angle * 2.0 - uniforms.time * 8.0) * 0.5 + 0.5);
    alpha *= arc * sweep;

  } else if (pType == 2) {
    // Victory - data burst
    let angle = atan2(centered.y, centered.x) + uniforms.time * 3.0;
    let rays = pow(abs(sin(angle * 6.0)), 4.0);
    let glow = smoothstep(0.5, 0.0, dist);
    alpha *= glow * (0.5 + rays * 0.5);

    // Color shift
    let hueShift = fract(angle / 6.28318 + uniforms.time);
    if (hueShift < 0.5) {
      color = mix(color, vec3f(0.0, 1.0, 0.8), hueShift * 2.0);
    } else {
      color = mix(vec3f(0.0, 1.0, 0.8), color, (hueShift - 0.5) * 2.0);
    }

  } else if (pType == 3) {
    // Ambient - floating data mote
    let mote = smoothstep(0.5, 0.2, dist);
    alpha *= mote * 0.5;

    // Digital flicker
    let flicker = step(0.5, fract(uniforms.time * 5.0 + dist * 10.0));
    alpha *= 0.7 + flicker * 0.3;

  } else if (pType == 4) {
    // Power - energy pulse ring
    let ring = smoothstep(0.05, 0.0, abs(dist - 0.35));
    let fill = smoothstep(0.4, 0.0, dist) * 0.3;
    alpha *= ring + fill;

    // Pulsing glow
    let pulse = sin(uniforms.time * 10.0) * 0.2 + 0.8;
    alpha *= pulse;
  }

  // Life-based fade
  let lifeFade = smoothstep(0.0, 0.2, input.life) * smoothstep(1.0, 0.7, input.life);
  alpha *= lifeFade;

  return vec4f(color, alpha);
}
`;

export const powerFlowShader = /* wgsl */`
struct Uniforms {
  time: f32,
  powerLevel: f32,
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
  let power = uniforms.powerLevel;

  // Power flow lines
  let flowX = sin(uv.x * 20.0 + time * 3.0) * 0.5 + 0.5;
  let flowY = sin(uv.y * 20.0 + time * 2.0) * 0.5 + 0.5;
  let flow = flowX * flowY;

  // Energy color
  let energyColor = vec3f(1.0, 0.8, 0.0); // Electric yellow

  return vec4f(energyColor * flow * power, flow * power * 0.2);
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

  // Expanding circuit pattern
  let ringRadius = fract(time * 0.5) * 0.8;
  let ring = smoothstep(0.04, 0.0, abs(dist - ringRadius)) * (1.0 - ringRadius);

  // Digital rays
  let rays = pow(abs(sin(angle * 12.0 - time * 4.0)), 8.0);
  let rayStrength = smoothstep(0.6, 0.1, dist) * rays;

  // Cyber color palette
  let cyan = vec3f(0.0, 1.0, 0.8);
  let yellow = vec3f(1.0, 0.9, 0.0);
  var color = mix(cyan, yellow, fract(angle / 3.14159 + time));

  let totalGlow = (ring + rayStrength * 0.5) * intensity;

  // Center flash
  let centerFlash = smoothstep(0.2, 0.0, dist) * intensity * 0.5;
  color = mix(color, vec3f(1.0), centerFlash);

  // Binary data stream effect
  let dataStream = step(0.9, fract(dist * 20.0 - time * 5.0)) *
                   step(0.7, fract(angle * 10.0)) *
                   smoothstep(0.6, 0.2, dist);
  color += vec3f(0.0, 0.5, 0.3) * dataStream * intensity;

  return vec4f(color * totalGlow, totalGlow * 0.8);
}
`;
