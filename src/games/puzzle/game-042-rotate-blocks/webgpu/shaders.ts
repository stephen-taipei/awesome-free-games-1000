/**
 * WebGPU Shaders - Rotate Blocks
 * Mechanical Workshop / Steampunk Factory Theme
 * Game #042
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

// Metal brushed texture
fn metalTexture(uv: vec2f, angle: f32) -> f32 {
  let rotated = vec2f(
    uv.x * cos(angle) - uv.y * sin(angle),
    uv.x * sin(angle) + uv.y * cos(angle)
  );
  let brush = noise(rotated * vec2f(100.0, 5.0)) * 0.3;
  let scratches = pow(noise(rotated * vec2f(200.0, 2.0)), 3.0) * 0.15;
  return brush + scratches;
}

// Gear shape
fn gear(uv: vec2f, center: vec2f, radius: f32, teeth: f32, time: f32) -> f32 {
  let p = uv - center;
  let angle = atan2(p.y, p.x) + time;
  let dist = length(p);

  let teethHeight = 0.015;
  let toothAngle = angle * teeth;
  let tooth = step(0.5, fract(toothAngle / 6.28)) * teethHeight;

  let innerRadius = radius * 0.3;
  let gearShape = smoothstep(radius + tooth + 0.005, radius + tooth, dist) *
                  smoothstep(innerRadius - 0.005, innerRadius, dist);

  // Spokes
  let spokeAngle = angle * 6.0;
  let spoke = smoothstep(0.4, 0.6, abs(fract(spokeAngle / 6.28) - 0.5) * 2.0);
  let spokeRing = smoothstep(innerRadius + 0.01, innerRadius + 0.02, dist) *
                  smoothstep(radius * 0.8, radius * 0.78, dist);

  return gearShape * (1.0 - spokeRing * spoke * 0.7);
}

// Rivet pattern
fn rivets(uv: vec2f, spacing: f32) -> f32 {
  let grid = fract(uv * spacing);
  let center = vec2f(0.5, 0.5);
  let dist = length(grid - center);
  return smoothstep(0.08, 0.05, dist) * 0.8;
}

// Steam pipe
fn steamPipe(uv: vec2f, y: f32, width: f32) -> f32 {
  let pipe = smoothstep(width, width - 0.01, abs(uv.y - y));
  let highlight = smoothstep(0.0, width * 0.3, uv.y - y + width * 0.2) * 0.3;
  return pipe * (0.7 + highlight);
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  let uv = input.uv;
  let time = uniforms.time;

  // Base industrial metal color
  let darkMetal = vec3f(0.12, 0.1, 0.08);
  let copperBrown = vec3f(0.45, 0.28, 0.15);
  let brass = vec3f(0.7, 0.55, 0.3);

  // Metal plate background
  let metalTex = metalTexture(uv, 0.1);
  var color = mix(darkMetal, copperBrown * 0.4, metalTex);

  // Decorative gears in corners
  let gear1 = gear(uv, vec2f(0.1, 0.1), 0.08, 12.0, time * 0.3);
  let gear2 = gear(uv, vec2f(0.9, 0.9), 0.1, 16.0, -time * 0.2);
  let gear3 = gear(uv, vec2f(0.85, 0.15), 0.06, 8.0, time * 0.5);
  let gear4 = gear(uv, vec2f(0.15, 0.85), 0.07, 10.0, -time * 0.4);

  color = mix(color, brass * 0.8, gear1 * 0.6);
  color = mix(color, brass * 0.7, gear2 * 0.5);
  color = mix(color, copperBrown, gear3 * 0.5);
  color = mix(color, copperBrown * 0.9, gear4 * 0.5);

  // Edge rivets
  let edgeRivets = rivets(vec2f(uv.x * 0.5, 0.0), 8.0) * step(0.95, uv.y);
  let bottomRivets = rivets(vec2f(uv.x * 0.5, 0.0), 8.0) * step(uv.y, 0.05);
  color = mix(color, brass * 0.9, edgeRivets + bottomRivets);

  // Steam pipes at edges
  let pipeTop = steamPipe(uv, 0.98, 0.02);
  let pipeBottom = steamPipe(uv, 0.02, 0.02);
  color = mix(color, copperBrown * 0.7, (pipeTop + pipeBottom) * 0.4);

  // Warm industrial lighting
  let lightPos = vec2f(0.5 + sin(time * 0.3) * 0.1, 0.3);
  let lightDist = length(uv - lightPos);
  let warmLight = smoothstep(0.8, 0.0, lightDist) * 0.15;
  color += vec3f(1.0, 0.8, 0.4) * warmLight;

  // Vignette
  let vignette = smoothstep(0.0, 0.4, min(min(uv.x, 1.0 - uv.x), min(uv.y, 1.0 - uv.y)));
  color *= 0.7 + vignette * 0.3;

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
    // Spark - bright metallic spark
    let spark = smoothstep(0.5, 0.0, dist);
    let core = smoothstep(0.15, 0.0, dist);
    alpha *= spark;
    color = mix(color, vec3f(1.0, 1.0, 0.9), core);

    // Flicker
    let flicker = sin(uniforms.time * 20.0 + dist * 15.0) * 0.2 + 0.8;
    alpha *= flicker;

  } else if (pType == 1) {
    // Rotate effect - circular motion trail
    let angle = atan2(centered.y, centered.x) + uniforms.time * 3.0;
    let ring = smoothstep(0.1, 0.0, abs(dist - 0.35));
    let spiral = pow(abs(sin(angle * 4.0)), 2.0);
    alpha *= ring * (0.5 + spiral * 0.5);

    color = mix(color, vec3f(0.9, 0.8, 0.5), ring * 0.3);

  } else if (pType == 2) {
    // Victory - gear-shaped celebration
    let angle = atan2(centered.y, centered.x) + uniforms.time * 2.0;
    let teeth = step(0.5, fract(angle * 8.0 / 6.28));
    let glow = smoothstep(0.5, 0.0, dist);
    alpha *= glow * (0.6 + teeth * 0.4);

    // Golden shimmer
    let shimmer = sin(uniforms.time * 8.0 + angle * 3.0) * 0.5 + 0.5;
    color = mix(color, vec3f(1.0, 0.85, 0.4), shimmer * 0.4);

  } else if (pType == 3) {
    // Ambient - floating dust/soot
    let dust = smoothstep(0.5, 0.2, dist);
    alpha *= dust * 0.3;

    // Gentle drift
    let drift = sin(uniforms.time * 1.5 + dist * 5.0) * 0.15 + 0.85;
    alpha *= drift;

  } else if (pType == 4) {
    // Steam - wispy cloud
    let cloud = smoothstep(0.5, 0.0, dist) * 0.6;
    alpha *= cloud;

    // Billow motion
    let billow = noise2D(uv + uniforms.time * 0.2);
    alpha *= 0.7 + billow * 0.3;
  }

  // Life-based fade
  let lifeFade = smoothstep(0.0, 0.2, input.life) * smoothstep(1.0, 0.7, input.life);
  alpha *= lifeFade;

  return vec4f(color, alpha);
}

fn noise2D(p: vec2f) -> f32 {
  return fract(sin(dot(p, vec2f(12.9898, 78.233))) * 43758.5453);
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

  // Rotating gear burst
  let gearAngle = angle + time * 2.0;
  let teeth = step(0.5, fract(gearAngle * 12.0 / 6.28));
  let gearRays = smoothstep(0.6, 0.2, dist) * (0.5 + teeth * 0.5);

  // Expanding brass rings
  var rings = 0.0;
  for (var i = 0; i < 3; i++) {
    let idx = f32(i);
    let ringRadius = fract(time * 0.4 + idx * 0.33) * 0.6;
    let ring = smoothstep(0.05, 0.0, abs(dist - ringRadius)) * (1.0 - ringRadius);
    rings += ring;
  }

  // Steampunk colors
  let brass = vec3f(0.85, 0.7, 0.35);
  let copper = vec3f(0.75, 0.45, 0.25);
  let steam = vec3f(0.9, 0.9, 0.85);

  var color = mix(brass, copper, gearRays);
  color = mix(color, steam, rings * 0.4);

  let totalGlow = (gearRays + rings * 0.5) * intensity;

  // Center flash
  let centerFlash = smoothstep(0.2, 0.0, dist) * intensity * 0.6;
  color = mix(color, vec3f(1.0, 0.95, 0.8), centerFlash);

  // Flying sparks
  for (var i = 0; i < 8; i++) {
    let idx = f32(i);
    let sparkAngle = idx * 0.785 + time * 4.0;
    let sparkDist = fract(time * 0.5 + idx * 0.125) * 0.5;
    let sparkPos = center + vec2f(cos(sparkAngle), sin(sparkAngle)) * sparkDist;
    let sparkGlow = smoothstep(0.015, 0.0, length(uv - sparkPos)) * (1.0 - sparkDist * 2.0);
    color += vec3f(1.0, 0.9, 0.6) * sparkGlow * intensity;
  }

  return vec4f(color * totalGlow, totalGlow * 0.75);
}
`;
