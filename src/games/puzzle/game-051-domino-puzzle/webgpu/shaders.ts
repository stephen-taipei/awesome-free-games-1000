/**
 * WGSL Shaders - Domino Puzzle
 * Luxury Casino / Monte Carlo Theme
 * Game #051
 */

export const backgroundShader = /* wgsl */ `
struct Uniforms {
  time: f32,
  aspect: f32,
  _pad0: f32,
  _pad1: f32,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;

struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) uv: vec2f,
}

@vertex
fn vertexMain(@builtin(vertex_index) idx: u32) -> VertexOutput {
  var positions = array<vec2f, 6>(
    vec2f(-1.0, -1.0), vec2f(1.0, -1.0), vec2f(-1.0, 1.0),
    vec2f(-1.0, 1.0), vec2f(1.0, -1.0), vec2f(1.0, 1.0)
  );

  var output: VertexOutput;
  output.position = vec4f(positions[idx], 0.0, 1.0);
  output.uv = positions[idx] * 0.5 + 0.5;
  return output;
}

fn hash(p: vec2f) -> f32 {
  let k = vec2f(0.3183099, 0.3678794);
  let q = p * k + k.yx;
  return fract(16.0 * k.x * fract(q.x * q.y * (q.x + q.y)));
}

fn noise(p: vec2f) -> f32 {
  let i = floor(p);
  let f = fract(p);
  let u = f * f * (3.0 - 2.0 * f);

  return mix(
    mix(hash(i), hash(i + vec2f(1.0, 0.0)), u.x),
    mix(hash(i + vec2f(0.0, 1.0)), hash(i + vec2f(1.0, 1.0)), u.x),
    u.y
  );
}

// Velvet felt texture
fn velvetFelt(uv: vec2f, time: f32) -> vec3f {
  let baseGreen = vec3f(0.12, 0.35, 0.20);
  let deepGreen = vec3f(0.08, 0.25, 0.14);

  // Velvet sheen
  let sheen = noise(uv * 100.0) * 0.1;
  let shimmer = sin(uv.x * 30.0 + time * 0.5) * sin(uv.y * 25.0 - time * 0.3) * 0.02;

  // Soft gradient
  let gradient = smoothstep(0.0, 1.0, uv.y) * 0.1;

  var color = mix(deepGreen, baseGreen, sheen + gradient);
  color += shimmer;

  return color;
}

// Gold trim pattern
fn goldTrim(uv: vec2f, time: f32) -> f32 {
  let edge = 0.03;
  let innerEdge = 0.05;

  let distX = min(uv.x, 1.0 - uv.x);
  let distY = min(uv.y, 1.0 - uv.y);
  let dist = min(distX, distY);

  let outer = smoothstep(edge, edge + 0.005, dist);
  let inner = smoothstep(innerEdge, innerEdge + 0.005, dist);

  return (1.0 - outer) + (outer - inner) * 0.3;
}

// Diamond pattern on felt
fn diamondPattern(uv: vec2f) -> f32 {
  let size = 0.08;
  let px = fract(uv.x / size) - 0.5;
  let py = fract(uv.y / size) - 0.5;

  let d = abs(px) + abs(py);
  return smoothstep(0.3, 0.35, d) * 0.03;
}

// Ambient smoke/dust
fn ambientSmoke(uv: vec2f, time: f32) -> f32 {
  var smoke = 0.0;

  for (var i = 0; i < 5; i++) {
    let seed = f32(i) * 1.7;
    let scale = 3.0 + f32(i) * 2.0;
    let speed = 0.1 + f32(i) * 0.05;

    let offset = vec2f(
      sin(time * speed + seed) * 0.2,
      time * speed * 0.1
    );

    let n = noise((uv + offset) * scale);
    smoke += n * (0.1 / f32(i + 1));
  }

  return smoke * 0.15;
}

// Spotlight effect
fn spotlight(uv: vec2f, time: f32) -> f32 {
  let center = vec2f(0.5 + sin(time * 0.2) * 0.1, 0.5 + cos(time * 0.15) * 0.1);
  let d = length(uv - center);
  return smoothstep(0.6, 0.0, d) * 0.15;
}

// Gold sparkles
fn goldSparkles(uv: vec2f, time: f32) -> f32 {
  var sparkle = 0.0;

  for (var i = 0; i < 15; i++) {
    let seed = hash(vec2f(f32(i), 0.0));
    let x = hash(vec2f(f32(i), 1.0));
    let y = hash(vec2f(f32(i), 2.0));

    let pos = vec2f(x, y);
    let d = length(uv - pos);

    let flash = sin(time * 5.0 + seed * 20.0) * 0.5 + 0.5;
    let intensity = smoothstep(0.01, 0.0, d) * flash * flash * flash;

    sparkle += intensity;
  }

  return sparkle * 0.5;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  let uv = input.uv;
  let time = uniforms.time;

  // Base velvet felt
  var color = velvetFelt(uv, time);

  // Diamond pattern
  color += vec3f(0.0, 0.05, 0.02) * diamondPattern(uv);

  // Ambient smoke
  let smoke = ambientSmoke(uv, time);
  color += vec3f(0.15, 0.12, 0.10) * smoke;

  // Spotlight
  let light = spotlight(uv, time);
  color += vec3f(1.0, 0.95, 0.85) * light;

  // Gold trim
  let gold = goldTrim(uv, time);
  let goldColor = vec3f(0.85, 0.65, 0.20);
  let goldShimmer = 0.8 + 0.2 * sin(time * 3.0 + uv.x * 20.0);
  color = mix(color, goldColor * goldShimmer, gold);

  // Gold sparkles
  let sparkle = goldSparkles(uv, time);
  color += vec3f(1.0, 0.9, 0.5) * sparkle;

  // Vignette
  let vignette = 1.0 - length(uv - 0.5) * 0.5;
  color *= vignette;

  return vec4f(color, 1.0);
}
`;

export const particleShader = /* wgsl */ `
struct Uniforms {
  time: f32,
  aspect: f32,
  _pad0: f32,
  _pad1: f32,
}

struct Particle {
  x: f32,
  y: f32,
  vx: f32,
  vy: f32,
  life: f32,
  maxLife: f32,
  size: f32,
  ptype: f32,
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
  @location(2) ptype: f32,
  @location(3) lifeRatio: f32,
}

@vertex
fn vertexMain(
  @builtin(vertex_index) vertexIdx: u32,
  @builtin(instance_index) instanceIdx: u32
) -> VertexOutput {
  var corners = array<vec2f, 6>(
    vec2f(-1.0, -1.0), vec2f(1.0, -1.0), vec2f(-1.0, 1.0),
    vec2f(-1.0, 1.0), vec2f(1.0, -1.0), vec2f(1.0, 1.0)
  );

  let p = particles[instanceIdx];
  let corner = corners[vertexIdx];

  var size = p.size;
  let lifeRatio = p.life / p.maxLife;

  // Size modulation by type
  if (p.ptype == 0.0) { // dust
    size *= 0.7 + 0.3 * sin(uniforms.time * 2.0 + p.x * 10.0);
  } else if (p.ptype == 1.0) { // sparkle
    size *= lifeRatio;
    size *= 0.5 + 0.5 * sin(uniforms.time * 15.0);
  } else if (p.ptype == 2.0) { // match
    size *= 1.0 + (1.0 - lifeRatio) * 0.5;
  } else if (p.ptype == 3.0) { // victory
    size *= 0.8 + 0.4 * sin(uniforms.time * 8.0 + p.x * 15.0);
  }

  var pos = vec2f(p.x, p.y) * 2.0 - 1.0;
  pos.x *= uniforms.aspect;
  pos += corner * size;
  pos.x /= uniforms.aspect;

  var output: VertexOutput;
  output.position = vec4f(pos, 0.0, 1.0);
  output.uv = corner;
  output.color = vec4f(p.r, p.g, p.b, p.a * lifeRatio);
  output.ptype = p.ptype;
  output.lifeRatio = lifeRatio;
  return output;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  let d = length(input.uv);
  var alpha = 0.0;
  var color = input.color.rgb;

  if (input.ptype == 0.0) {
    // Dust - soft, wispy
    alpha = smoothstep(1.0, 0.0, d) * 0.4;
  } else if (input.ptype == 1.0) {
    // Sparkle - sharp, bright
    let star = max(0.0, 1.0 - d * 2.0);
    let rays = max(
      abs(input.uv.x) < 0.15 ? (1.0 - abs(input.uv.y) * 2.0) : 0.0,
      abs(input.uv.y) < 0.15 ? (1.0 - abs(input.uv.x) * 2.0) : 0.0
    );
    alpha = (star + rays * 0.5);
    color = mix(color, vec3f(1.0), star);
  } else if (input.ptype == 2.0) {
    // Match - expanding ring
    let ring = abs(d - 0.5);
    alpha = smoothstep(0.2, 0.0, ring) * input.lifeRatio;
    color = mix(color, vec3f(1.0, 0.95, 0.8), smoothstep(0.1, 0.0, ring));
  } else if (input.ptype == 3.0) {
    // Victory - confetti-like
    alpha = smoothstep(1.0, 0.3, d);
    let sparkle = sin(uniforms.time * 20.0 + input.uv.x * 5.0) * 0.3 + 0.7;
    color *= sparkle;
  } else {
    // Smoke
    alpha = smoothstep(1.0, 0.0, d) * 0.3;
  }

  return vec4f(color, alpha * input.color.a);
}
`;

export const victoryShader = /* wgsl */ `
struct Uniforms {
  time: f32,
  intensity: f32,
  _pad0: f32,
  _pad1: f32,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;

struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) uv: vec2f,
}

@vertex
fn vertexMain(@builtin(vertex_index) idx: u32) -> VertexOutput {
  var positions = array<vec2f, 6>(
    vec2f(-1.0, -1.0), vec2f(1.0, -1.0), vec2f(-1.0, 1.0),
    vec2f(-1.0, 1.0), vec2f(1.0, -1.0), vec2f(1.0, 1.0)
  );

  var output: VertexOutput;
  output.position = vec4f(positions[idx], 0.0, 1.0);
  output.uv = positions[idx] * 0.5 + 0.5;
  return output;
}

fn hash(p: vec2f) -> f32 {
  let k = vec2f(0.3183099, 0.3678794);
  let q = p * k + k.yx;
  return fract(16.0 * k.x * fract(q.x * q.y * (q.x + q.y)));
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  if (uniforms.intensity <= 0.0) {
    return vec4f(0.0);
  }

  let uv = input.uv;
  let time = uniforms.time;
  let intensity = uniforms.intensity;

  var color = vec3f(0.0);

  // Golden radial burst
  let center = vec2f(0.5);
  let d = length(uv - center);

  // Gold rays
  let angle = atan2(uv.y - 0.5, uv.x - 0.5);
  let rayCount = 16.0;
  let ray = pow(abs(sin(angle * rayCount + time * 2.0)), 8.0);
  let rayFade = smoothstep(0.5, 0.0, d);
  color += vec3f(1.0, 0.85, 0.4) * ray * rayFade * 0.5;

  // Expanding golden rings
  for (var i = 0; i < 3; i++) {
    let ringD = fract(d * 2.0 - time * 0.5 + f32(i) * 0.33);
    let ring = smoothstep(0.1, 0.0, abs(ringD - 0.5) - 0.4);
    color += vec3f(1.0, 0.9, 0.5) * ring * 0.2;
  }

  // Sparkle overlay
  for (var i = 0; i < 20; i++) {
    let seed = hash(vec2f(f32(i), 0.0));
    let x = hash(vec2f(f32(i), 1.0));
    let y = hash(vec2f(f32(i), 2.0));

    let pos = vec2f(x, y);
    let sd = length(uv - pos);

    let flash = pow(sin(time * 8.0 + seed * 30.0) * 0.5 + 0.5, 4.0);
    color += vec3f(1.0, 0.95, 0.8) * smoothstep(0.02, 0.0, sd) * flash;
  }

  // Central glow
  let glow = smoothstep(0.4, 0.0, d);
  color += vec3f(1.0, 0.9, 0.6) * glow * 0.3;

  return vec4f(color * intensity, intensity * 0.5);
}
`;
