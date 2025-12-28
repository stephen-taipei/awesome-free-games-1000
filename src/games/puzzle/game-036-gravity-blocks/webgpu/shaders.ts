/**
 * WebGPU Shaders - Gravity Blocks
 * Space Station / Zero-G Lab Theme
 * Game #036
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

fn starField(uv: vec2f, density: f32, size: f32) -> f32 {
  let grid = floor(uv * density);
  let gridUV = fract(uv * density);

  let starPos = vec2f(hash(grid), hash(grid + vec2f(1.23, 4.56)));
  let dist = length(gridUV - starPos);

  let brightness = hash(grid + vec2f(7.89, 0.12));
  let twinkle = sin(uniforms.time * 3.0 + brightness * 10.0) * 0.3 + 0.7;

  return smoothstep(size, 0.0, dist) * brightness * twinkle;
}

fn nebula(uv: vec2f, time: f32) -> vec3f {
  var n = 0.0;
  var scale = 3.0;

  for (var i = 0; i < 4; i++) {
    n += noise(uv * scale + time * 0.02) / scale;
    scale *= 2.0;
  }

  let purple = vec3f(0.4, 0.2, 0.6);
  let blue = vec3f(0.1, 0.3, 0.6);
  let cyan = vec3f(0.2, 0.5, 0.6);

  var color = mix(purple, blue, n);
  color = mix(color, cyan, noise(uv * 5.0 - time * 0.03));

  return color * n * 0.5;
}

fn energyGrid(uv: vec2f, time: f32) -> f32 {
  let gridSize = 20.0;
  let gridUV = fract(uv * gridSize);

  let lineX = smoothstep(0.02, 0.0, abs(gridUV.x - 0.5)) +
              smoothstep(0.02, 0.0, abs(gridUV.x));
  let lineY = smoothstep(0.02, 0.0, abs(gridUV.y - 0.5)) +
              smoothstep(0.02, 0.0, abs(gridUV.y));

  let grid = max(lineX, lineY) * 0.3;

  // Energy pulse
  let pulse = sin(uv.x * 30.0 - time * 2.0) * sin(uv.y * 30.0 + time * 1.5);
  let energyPulse = smoothstep(0.8, 1.0, pulse) * 0.5;

  return grid + energyPulse * 0.3;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  let uv = input.uv;
  let time = uniforms.time;

  // Deep space base
  let spaceBlack = vec3f(0.02, 0.02, 0.05);
  let spaceDark = vec3f(0.05, 0.05, 0.12);

  var color = mix(spaceBlack, spaceDark, uv.y);

  // Nebula clouds
  let nebulaColor = nebula(uv, time);
  color += nebulaColor * 0.4;

  // Star layers
  let stars1 = starField(uv, 50.0, 0.08);
  let stars2 = starField(uv * 1.5 + vec2f(100.0), 80.0, 0.05);
  let stars3 = starField(uv * 2.0 + vec2f(200.0), 120.0, 0.03);

  color += vec3f(1.0, 1.0, 0.95) * (stars1 + stars2 * 0.7 + stars3 * 0.5);

  // Bright stars with color
  let brightStar = starField(uv, 20.0, 0.12);
  let starHue = hash(floor(uv * 20.0));
  let starColor = mix(vec3f(1.0, 0.8, 0.6), vec3f(0.6, 0.8, 1.0), starHue);
  color += starColor * brightStar * 1.5;

  // Energy grid overlay
  let grid = energyGrid(uv, time);
  let gridColor = vec3f(0.3, 0.6, 1.0);
  color = mix(color, color + gridColor, grid * 0.2);

  // Station window frame effect
  let frameStrength = smoothstep(0.0, 0.05, uv.x) * smoothstep(1.0, 0.95, uv.x) *
                      smoothstep(0.0, 0.05, uv.y) * smoothstep(1.0, 0.95, uv.y);
  let frame = 1.0 - frameStrength;
  let frameColor = vec3f(0.15, 0.18, 0.25);
  color = mix(color, frameColor, frame * 0.8);

  // Ambient glow
  let centerGlow = smoothstep(0.7, 0.0, length(uv - 0.5));
  color += vec3f(0.1, 0.2, 0.4) * centerGlow * 0.15;

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
    // Collision spark - energy burst
    let spark = smoothstep(0.5, 0.0, dist);
    let core = smoothstep(0.15, 0.0, dist);
    alpha *= spark;
    color = mix(color, vec3f(1.0, 1.0, 1.0), core);

    // Electric tendrils
    let angle = atan2(centered.y, centered.x);
    let tendrils = pow(abs(sin(angle * 6.0 + uniforms.time * 10.0)), 8.0);
    alpha = max(alpha, tendrils * smoothstep(0.5, 0.2, dist) * input.color.a);

  } else if (pType == 1) {
    // Drag trail - energy plasma
    let plasma = smoothstep(0.5, 0.1, dist);
    let swirl = sin(dist * 20.0 - uniforms.time * 5.0) * 0.3 + 0.7;
    alpha *= plasma * swirl;

    // Color shift
    color = mix(color, vec3f(0.5, 0.8, 1.0), dist);

  } else if (pType == 2) {
    // Victory - holographic confetti
    let angle = atan2(centered.y, centered.x) + uniforms.time * 2.0;
    let diamond = max(abs(centered.x), abs(centered.y));
    let shape = smoothstep(0.4, 0.3, diamond);
    alpha *= shape;

    // Holographic shimmer
    let shimmer = sin(angle * 4.0 + uniforms.time * 8.0) * 0.3 + 0.7;
    color *= shimmer;
    color += vec3f(0.2, 0.4, 0.6) * (1.0 - shimmer);

  } else if (pType == 3) {
    // Ambient - floating debris/dust
    let mote = smoothstep(0.5, 0.2, dist);
    alpha *= mote * 0.6;

    // Slight glow
    color += vec3f(0.1, 0.2, 0.3) * (1.0 - dist * 2.0);

  } else if (pType == 4) {
    // Landing - shockwave ring
    let ring = smoothstep(0.05, 0.0, abs(dist - 0.4));
    let pulse = smoothstep(0.5, 0.0, dist) * 0.3;
    alpha *= ring + pulse;

    color = mix(color, vec3f(0.4, 0.8, 1.0), ring);
  }

  // Life-based fade
  let lifeFade = smoothstep(0.0, 0.2, input.life) * smoothstep(1.0, 0.7, input.life);
  alpha *= lifeFade;

  return vec4f(color, alpha);
}
`;

export const gravityFieldShader = /* wgsl */`
struct Uniforms {
  time: f32,
  gravityX: f32,
  gravityY: f32,
  intensity: f32,
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

  // Gravity direction
  let gravDir = normalize(vec2f(uniforms.gravityX, uniforms.gravityY));
  let gravMag = length(vec2f(uniforms.gravityX, uniforms.gravityY));

  // Flow lines following gravity
  let flowOffset = dot(uv - 0.5, gravDir) - time * 0.3;
  let flowLines = sin(flowOffset * 30.0) * 0.5 + 0.5;
  let flowStrength = pow(flowLines, 4.0) * gravMag * uniforms.intensity;

  // Gravity field color
  let fieldColor = vec3f(0.8, 0.3, 0.4);

  return vec4f(fieldColor * flowStrength, flowStrength * 0.15);
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

  // Expanding energy ring
  let ringRadius = fract(time * 0.5) * 0.8;
  let ring = smoothstep(0.04, 0.0, abs(dist - ringRadius)) * (1.0 - ringRadius);

  // Rotating ray pattern
  let rays = pow(abs(sin(angle * 8.0 - time * 3.0)), 6.0);
  let rayStrength = smoothstep(0.6, 0.2, dist) * rays;

  // Holographic color shift
  let hueShift = fract(angle / 6.28318 + time * 0.5);
  var color = vec3f(0.3, 0.6, 1.0);
  if (hueShift < 0.33) {
    color = vec3f(0.3, 1.0, 0.6);
  } else if (hueShift < 0.66) {
    color = vec3f(1.0, 0.5, 0.3);
  }

  let totalGlow = (ring + rayStrength * 0.4) * intensity;

  // Bright center
  let centerFlash = smoothstep(0.3, 0.0, dist) * intensity * 0.4;
  color = mix(color, vec3f(1.0), centerFlash);

  return vec4f(color * totalGlow, totalGlow * 0.7);
}
`;
