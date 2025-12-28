/**
 * WebGPU Shaders - Gear Puzzle
 * Victorian Steampunk Workshop Theme
 * Game #034
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

fn fbm(p: vec2f) -> f32 {
  var value = 0.0;
  var amplitude = 0.5;
  var pos = p;

  for (var i = 0; i < 4; i++) {
    value += amplitude * noise(pos);
    pos *= 2.0;
    amplitude *= 0.5;
  }
  return value;
}

fn rivetPattern(uv: vec2f, size: f32) -> f32 {
  let cell = fract(uv * size);
  let d = length(cell - 0.5);
  return smoothstep(0.08, 0.04, d);
}

fn metalBrush(uv: vec2f, angle: f32) -> f32 {
  let rotated = vec2f(
    uv.x * cos(angle) - uv.y * sin(angle),
    uv.x * sin(angle) + uv.y * cos(angle)
  );
  return noise(rotated * 80.0) * 0.15 + 0.85;
}

fn gearShape(uv: vec2f, teeth: f32) -> f32 {
  let angle = atan2(uv.y, uv.x);
  let dist = length(uv);
  let toothWave = sin(angle * teeth) * 0.02;
  return dist - 0.15 - toothWave;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  let uv = input.uv;
  let aspect = uniforms.aspect;
  let time = uniforms.time;

  // Steampunk colors
  let brassBase = vec3f(0.71, 0.55, 0.25);
  let brassDark = vec3f(0.45, 0.35, 0.15);
  let copper = vec3f(0.72, 0.45, 0.20);
  let ironDark = vec3f(0.20, 0.22, 0.25);
  let woodDark = vec3f(0.25, 0.18, 0.12);
  let steamWhite = vec3f(0.9, 0.88, 0.85);

  // Base wood panel background
  let woodGrain = fbm(uv * vec2f(2.0, 8.0) + vec2f(0.0, time * 0.01));
  var color = mix(woodDark, woodDark * 1.3, woodGrain);

  // Metal plate frame
  let border = smoothstep(0.02, 0.05, uv.x) * smoothstep(0.02, 0.05, 1.0 - uv.x) *
               smoothstep(0.02, 0.05, uv.y) * smoothstep(0.02, 0.05, 1.0 - uv.y);

  let innerBorder = smoothstep(0.06, 0.08, uv.x) * smoothstep(0.06, 0.08, 1.0 - uv.x) *
                    smoothstep(0.06, 0.08, uv.y) * smoothstep(0.06, 0.08, 1.0 - uv.y);

  // Brass frame
  let frameStrength = border * (1.0 - innerBorder);
  let brushedFrame = metalBrush(uv, 0.3);
  let frameColor = mix(brassDark, brassBase, brushedFrame);
  color = mix(color, frameColor, frameStrength);

  // Corner rivets
  let cornerRivets = rivetPattern(uv, 15.0);
  let rivetArea = (1.0 - smoothstep(0.0, 0.12, uv.x)) + (1.0 - smoothstep(0.88, 1.0, uv.x)) +
                  (1.0 - smoothstep(0.0, 0.12, uv.y)) + (1.0 - smoothstep(0.88, 1.0, uv.y));
  color = mix(color, brassBase * 1.2, cornerRivets * min(rivetArea, 1.0) * frameStrength);

  // Inner work area (iron plate)
  let workArea = innerBorder;
  let ironBrush = metalBrush(uv, -0.2);
  let ironColor = mix(ironDark, ironDark * 1.4, ironBrush);

  // Grid pattern on iron
  let gridX = smoothstep(0.48, 0.5, fract(uv.x * 20.0)) + smoothstep(0.52, 0.5, fract(uv.x * 20.0));
  let gridY = smoothstep(0.48, 0.5, fract(uv.y * 15.0)) + smoothstep(0.52, 0.5, fract(uv.y * 15.0));
  let grid = max(gridX, gridY) * 0.1;
  ironColor += grid * 0.05;

  color = mix(color, ironColor, workArea);

  // Decorative gears in corners (non-rotating, background)
  let cornerUV1 = (uv - vec2f(0.1, 0.1)) * 3.0;
  let gear1 = gearShape(cornerUV1, 8.0);
  if (gear1 < 0.0) {
    let gearColor = mix(copper, brassBase, smoothstep(-0.15, 0.0, gear1));
    color = mix(color, gearColor * 0.4, 0.5);
  }

  let cornerUV2 = (uv - vec2f(0.9, 0.9)) * 3.0;
  let gear2 = gearShape(cornerUV2, 12.0);
  if (gear2 < 0.0) {
    let gearColor = mix(copper, brassBase, smoothstep(-0.15, 0.0, gear2));
    color = mix(color, gearColor * 0.4, 0.5);
  }

  // Steam pipes along edges
  let pipeY = abs(uv.y - 0.5);
  let pipeStrength = smoothstep(0.45, 0.48, pipeY) * (1.0 - innerBorder);
  let pipeHighlight = smoothstep(0.46, 0.47, pipeY) * smoothstep(0.48, 0.47, pipeY);
  let pipeColor = mix(copper * 0.8, copper * 1.2, pipeHighlight);
  color = mix(color, pipeColor, pipeStrength * 0.6);

  // Ambient lighting
  let vignette = 1.0 - length(uv - 0.5) * 0.5;
  color *= vignette;

  // Warm lamp glow from top
  let lampGlow = smoothstep(0.8, 0.0, length(vec2f(uv.x - 0.5, uv.y - 0.1) * vec2f(1.5, 1.0)));
  color += vec3f(1.0, 0.85, 0.6) * lampGlow * 0.15;

  // Steam wisps
  let steamOffset = time * 0.05;
  let steam1 = fbm(uv * 4.0 + vec2f(steamOffset, steamOffset * 0.5));
  let steam2 = fbm(uv * 6.0 - vec2f(steamOffset * 0.7, steamOffset));
  let steamMask = smoothstep(0.55, 0.7, steam1) * smoothstep(0.5, 0.65, steam2);
  color = mix(color, steamWhite, steamMask * 0.08);

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
    // Mesh spark - bright orange spark
    let spark = smoothstep(0.5, 0.0, dist);
    let core = smoothstep(0.15, 0.0, dist);
    alpha *= spark;
    color = mix(color, vec3f(1.0, 1.0, 0.9), core);

    // Spark trail
    let trail = smoothstep(0.5, 0.3, abs(centered.x)) * smoothstep(0.2, 0.0, abs(centered.y));
    alpha = max(alpha, trail * input.color.a * 0.5);

  } else if (pType == 1) {
    // Drag steam - soft cloud puff
    let puff = smoothstep(0.5, 0.2, dist);
    let cloudNoise = sin(centered.x * 20.0) * sin(centered.y * 20.0) * 0.2 + 0.8;
    alpha *= puff * cloudNoise;
    color *= 1.2; // Brighten steam

  } else if (pType == 2) {
    // Victory - brass confetti piece
    let angle = atan2(centered.y, centered.x) + uniforms.time * 3.0;
    let rect = max(abs(centered.x), abs(centered.y));
    let confetti = smoothstep(0.4, 0.35, rect);
    alpha *= confetti;

    // Metallic shimmer
    let shimmer = sin(angle * 4.0 + uniforms.time * 5.0) * 0.3 + 0.7;
    color *= shimmer;

  } else if (pType == 3) {
    // Ambient - small dust/oil droplet
    let droplet = smoothstep(0.5, 0.1, dist);
    alpha *= droplet * 0.5;

    // Oil sheen
    let sheen = sin(dist * 30.0 + uniforms.time) * 0.2 + 0.8;
    color *= sheen;

  } else if (pType == 4) {
    // Steam burst - large steam cloud
    let cloud = smoothstep(0.5, 0.0, dist);
    let turbulence = sin(centered.x * 15.0 + uniforms.time * 2.0) *
                     sin(centered.y * 15.0 - uniforms.time * 1.5) * 0.3 + 0.7;
    alpha *= cloud * turbulence;
    color = mix(color, vec3f(1.0), 0.3);
  }

  // Life-based fade
  let lifeFade = smoothstep(0.0, 0.2, input.life) * smoothstep(1.0, 0.8, input.life);
  alpha *= lifeFade;

  return vec4f(color, alpha);
}
`;

export const gearGlowShader = /* wgsl */`
struct Uniforms {
  time: f32,
  intensity: f32,
  gearX: f32,
  gearY: f32,
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
  let gearPos = vec2f(uniforms.gearX, uniforms.gearY);
  let dist = length(uv - gearPos);

  // Gear connection glow
  let glow = smoothstep(0.15, 0.0, dist) * uniforms.intensity;

  // Warm brass glow color
  let glowColor = vec3f(1.0, 0.7, 0.3);

  // Pulsing effect
  let pulse = sin(uniforms.time * 4.0) * 0.2 + 0.8;

  return vec4f(glowColor * glow * pulse, glow * 0.6);
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

fn hash(p: vec2f) -> f32 {
  var p3 = fract(vec3f(p.x, p.y, p.x) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  let uv = input.uv;
  let time = uniforms.time;
  let intensity = uniforms.intensity;

  // Center point
  let center = vec2f(0.5, 0.5);
  let dist = length(uv - center);

  // Expanding brass ring
  let ringRadius = fract(time * 0.5) * 0.8;
  let ring = smoothstep(0.05, 0.0, abs(dist - ringRadius)) * (1.0 - ringRadius);

  // Gear teeth pattern in ring
  let angle = atan2(uv.y - 0.5, uv.x - 0.5);
  let teeth = sin(angle * 12.0 + time * 3.0) * 0.3 + 0.7;

  // Golden brass color
  let brassGlow = vec3f(0.9, 0.7, 0.3);
  let copperGlow = vec3f(0.9, 0.5, 0.2);
  let glowColor = mix(brassGlow, copperGlow, sin(time * 2.0) * 0.5 + 0.5);

  // Steam burst effect
  let steamAngle = angle + time * 0.5;
  let steamRays = pow(abs(sin(steamAngle * 8.0)), 8.0);
  let steamStrength = smoothstep(0.7, 0.3, dist) * steamRays;

  // Combine effects
  let finalGlow = (ring * teeth + steamStrength * 0.3) * intensity;

  // Cog border flash
  let cogFlash = smoothstep(0.5, 0.45, dist) * smoothstep(0.35, 0.4, dist);
  let cogPattern = sin(angle * 16.0 - time * 4.0) * 0.5 + 0.5;
  let cogGlow = cogFlash * cogPattern * intensity;

  let totalGlow = finalGlow + cogGlow * 0.5;

  return vec4f(glowColor * totalGlow, totalGlow * 0.7);
}
`;
