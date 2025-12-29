/**
 * WebGPU Shaders - Chain Puzzle
 * Chain / Metal / Industrial Theme
 * Game #093
 */

export const BACKGROUND_SHADER = /* wgsl */ `
struct Uniforms {
  time: f32,
  width: f32,
  height: f32,
  level: f32,
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
    vec2f(1.0, 1.0),
    vec2f(-1.0, -1.0),
    vec2f(1.0, 1.0),
    vec2f(-1.0, 1.0)
  );

  var output: VertexOutput;
  output.position = vec4f(positions[vertexIndex], 0.0, 1.0);
  output.uv = positions[vertexIndex] * 0.5 + 0.5;
  return output;
}

// Hash function
fn hash(p: vec2f) -> f32 {
  return fract(sin(dot(p, vec2f(127.1, 311.7))) * 43758.5453);
}

// Noise function
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

// Industrial metal texture
fn metalTexture(uv: vec2f, time: f32) -> f32 {
  let n1 = noise(uv * 20.0);
  let n2 = noise(uv * 40.0 + time * 0.1) * 0.5;
  let scratches = noise(uv * vec2f(100.0, 5.0)) * 0.2;
  return n1 * 0.5 + n2 * 0.3 + scratches;
}

// Industrial grid pattern
fn industrialGrid(uv: vec2f, scale: f32) -> f32 {
  let grid = fract(uv * scale);
  let lineX = smoothstep(0.02, 0.0, grid.x) + smoothstep(0.98, 1.0, grid.x);
  let lineY = smoothstep(0.02, 0.0, grid.y) + smoothstep(0.98, 1.0, grid.y);
  return (lineX + lineY) * 0.15;
}

// Bolts/rivets pattern
fn rivetPattern(uv: vec2f, scale: f32) -> f32 {
  let cell = floor(uv * scale);
  let localUV = fract(uv * scale);
  let center = vec2f(0.5, 0.5);
  let dist = length(localUV - center);

  let isRivet = step(0.9, hash(cell));
  let rivet = smoothstep(0.2, 0.15, dist) * isRivet;

  return rivet;
}

// Metal gradient background
fn metalBackground(uv: vec2f, time: f32) -> vec3f {
  // Base dark metal color
  var color = vec3f(0.18, 0.2, 0.22);

  // Brushed metal effect
  let brushed = metalTexture(uv, time);
  color += brushed * 0.08;

  // Subtle gradient
  let gradient = uv.y * 0.15 + 0.1;
  color *= 1.0 + gradient;

  // Industrial grid
  let grid = industrialGrid(uv, 12.0);
  color += vec3f(0.3, 0.32, 0.35) * grid;

  // Rivets
  let rivets = rivetPattern(uv, 8.0);
  color += vec3f(0.4, 0.42, 0.45) * rivets;

  return color;
}

// Ambient light spots
fn lightSpots(uv: vec2f, time: f32) -> f32 {
  var light = 0.0;

  // Multiple light spots
  for (var i = 0; i < 3; i++) {
    let fi = f32(i);
    let pos = vec2f(
      0.5 + sin(time * 0.3 + fi * 2.0) * 0.3,
      0.5 + cos(time * 0.4 + fi * 2.5) * 0.3
    );
    let dist = length(uv - pos);
    light += exp(-dist * 8.0) * 0.15;
  }

  return light;
}

// Chain shadow hint
fn chainShadow(uv: vec2f) -> f32 {
  let center = vec2f(0.5, 0.5);
  let dist = length(uv - center);
  return smoothstep(0.6, 0.2, dist) * 0.1;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  let uv = input.uv;
  let time = uniforms.time;

  // Metal background
  var color = metalBackground(uv, time);

  // Add ambient light
  let light = lightSpots(uv, time);
  color += vec3f(0.5, 0.55, 0.6) * light;

  // Chain area shadow
  color *= 1.0 - chainShadow(uv);

  // Vignette
  let vignette = 1.0 - length(uv - 0.5) * 0.6;
  color *= vignette;

  // Slight color grading
  color = pow(color, vec3f(0.95));

  return vec4f(color, 1.0);
}
`;

export const PARTICLE_SHADER = /* wgsl */ `
struct Uniforms {
  time: f32,
  width: f32,
  height: f32,
  level: f32,
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
  rotation: f32,
  param1: f32,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;
@group(0) @binding(1) var<storage, read> particles: array<Particle>;

struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) uv: vec2f,
  @location(1) life: f32,
  @location(2) particleType: f32,
  @location(3) rotation: f32,
  @location(4) param1: f32,
}

@vertex
fn vertexMain(
  @builtin(vertex_index) vertexIndex: u32,
  @builtin(instance_index) instanceIndex: u32
) -> VertexOutput {
  let particle = particles[instanceIndex];

  var corners = array<vec2f, 6>(
    vec2f(-1.0, -1.0),
    vec2f(1.0, -1.0),
    vec2f(1.0, 1.0),
    vec2f(-1.0, -1.0),
    vec2f(1.0, 1.0),
    vec2f(-1.0, 1.0)
  );

  let corner = corners[vertexIndex];
  let lifeRatio = particle.life / particle.maxLife;

  // Rotate corner
  let cos_r = cos(particle.rotation);
  let sin_r = sin(particle.rotation);
  let rotatedCorner = vec2f(
    corner.x * cos_r - corner.y * sin_r,
    corner.x * sin_r + corner.y * cos_r
  );

  let size = particle.size * lifeRatio;
  let x = (particle.x / uniforms.width) * 2.0 - 1.0;
  let y = 1.0 - (particle.y / uniforms.height) * 2.0;

  let aspectX = size / uniforms.width * 2.0;
  let aspectY = size / uniforms.height * 2.0;

  var output: VertexOutput;
  output.position = vec4f(
    x + rotatedCorner.x * aspectX,
    y + rotatedCorner.y * aspectY,
    0.0, 1.0
  );
  output.uv = corner * 0.5 + 0.5;
  output.life = lifeRatio;
  output.particleType = particle.particleType;
  output.rotation = particle.rotation;
  output.param1 = particle.param1;

  return output;
}

// Chain link shape
fn linkShape(uv: vec2f, time: f32) -> vec4f {
  let center = vec2f(0.5, 0.5);
  let toCenter = (uv - center) * 2.0;

  // Rounded rectangle outer
  let rx = abs(toCenter.x);
  let ry = abs(toCenter.y);
  let outer = smoothstep(0.9, 0.7, max(rx, ry * 1.5));

  // Inner hole
  let inner = 1.0 - smoothstep(0.3, 0.4, max(rx * 2.0, ry * 3.0));

  // Metallic color
  let shine = sin(time * 3.0) * 0.1 + 0.9;
  let color = vec3f(0.7, 0.65, 0.5) * outer * inner * shine;
  let alpha = outer * inner;

  return vec4f(color, alpha);
}

// Unlock burst
fn unlockShape(uv: vec2f, time: f32, life: f32) -> vec4f {
  let center = vec2f(0.5, 0.5);
  let dist = length(uv - center);

  // Expanding ring
  let ringPos = (1.0 - life) * 0.5;
  let ring = smoothstep(0.1, 0.0, abs(dist - ringPos));

  // Green unlock color
  let color = vec3f(0.3, 0.9, 0.5) * ring;
  let alpha = ring * life;

  return vec4f(color, alpha);
}

// Rotation arc
fn rotateShape(uv: vec2f, time: f32, rotation: f32) -> vec4f {
  let center = vec2f(0.5, 0.5);
  let toCenter = uv - center;
  let dist = length(toCenter);
  let angle = atan2(toCenter.y, toCenter.x);

  // Arc segment
  let arcStart = rotation;
  let arcEnd = rotation + 3.14159 * 0.5;

  let inArc = step(arcStart, angle) * step(angle, arcEnd);
  let arc = smoothstep(0.45, 0.35, abs(dist - 0.4)) * inArc;

  // Metallic color with motion blur
  let color = vec3f(0.6, 0.65, 0.7) * arc;
  let alpha = arc * 0.7;

  return vec4f(color, alpha);
}

// Metal particle
fn metalShape(uv: vec2f, time: f32, life: f32) -> vec4f {
  let center = vec2f(0.5, 0.5);
  let dist = length(uv - center);

  // Metallic shard
  let shard = smoothstep(0.4, 0.0, dist);

  // Shine effect
  let shine = sin(time * 10.0 + dist * 5.0) * 0.3 + 0.7;

  let color = vec3f(0.75, 0.73, 0.7) * shard * shine;
  let alpha = shard * life;

  return vec4f(color, alpha);
}

// Spark particle
fn sparkShape(uv: vec2f, time: f32, life: f32) -> vec4f {
  let center = vec2f(0.5, 0.5);
  let dist = length(uv - center);

  // Bright spark
  let spark = smoothstep(0.3, 0.0, dist);
  let flicker = sin(time * 30.0) * 0.3 + 0.7;

  // Hot metal color (orange to yellow)
  let heat = spark * flicker;
  let color = vec3f(1.0, 0.7 + heat * 0.3, 0.3);
  let alpha = spark * life * flicker;

  return vec4f(color, alpha);
}

// Chain connection
fn chainShape(uv: vec2f, time: f32, param: f32) -> vec4f {
  let center = vec2f(0.5, 0.5);
  let toCenter = uv - center;
  let dist = length(toCenter);

  // Segment line
  let segment = smoothstep(0.15, 0.0, abs(toCenter.y));
  let fade = smoothstep(0.5, 0.0, abs(toCenter.x));

  // Color based on param (locked = red, unlocked = green)
  var color: vec3f;
  if (param > 0.5) {
    color = vec3f(0.9, 0.3, 0.3); // Locked red
  } else {
    color = vec3f(0.3, 0.8, 0.4); // Unlocked green
  }

  let alpha = segment * fade * 0.6;

  return vec4f(color, alpha);
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  let uv = input.uv;
  let pType = i32(input.particleType);
  let time = uniforms.time;

  var color: vec4f;

  switch(pType) {
    case 0: { // link
      color = linkShape(uv, time);
    }
    case 1: { // unlock
      color = unlockShape(uv, time, input.life);
    }
    case 2: { // rotate
      color = rotateShape(uv, time, input.rotation);
    }
    case 3: { // metal
      color = metalShape(uv, time, input.life);
    }
    case 4: { // spark
      color = sparkShape(uv, time, input.life);
    }
    case 5: { // chain
      color = chainShape(uv, time, input.param1);
    }
    default: {
      color = vec4f(1.0, 1.0, 1.0, input.life);
    }
  }

  color.a *= input.life;

  return color;
}
`;
