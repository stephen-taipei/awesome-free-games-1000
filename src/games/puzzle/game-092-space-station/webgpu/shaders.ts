/**
 * WebGPU Shaders - Space Station
 * Space Station / Nebula / Cosmic Theme
 * Game #092
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

// Hash for procedural generation
fn hash(p: vec2f) -> f32 {
  let k = vec2f(0.3183099, 0.3678794);
  let q = p * k + k.yx;
  return fract(sin(dot(q, vec2f(127.1, 311.7))) * 43758.5453);
}

// Value noise
fn noise(p: vec2f) -> f32 {
  let i = floor(p);
  let f = fract(p);
  let u = f * f * (3.0 - 2.0 * f);

  let a = hash(i);
  let b = hash(i + vec2f(1.0, 0.0));
  let c = hash(i + vec2f(0.0, 1.0));
  let d = hash(i + vec2f(1.0, 1.0));

  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

// Fractal brownian motion for nebula
fn fbm(p: vec2f, octaves: i32) -> f32 {
  var value = 0.0;
  var amplitude = 0.5;
  var frequency = 1.0;
  var pos = p;

  for (var i = 0; i < octaves; i++) {
    value += amplitude * noise(pos * frequency);
    amplitude *= 0.5;
    frequency *= 2.0;
  }

  return value;
}

// Deep space background
fn deepSpace(uv: vec2f, time: f32) -> vec3f {
  // Base dark space color
  var color = vec3f(0.02, 0.02, 0.06);

  // Subtle nebula clouds
  let nebula1 = fbm(uv * 3.0 + time * 0.02, 4);
  let nebula2 = fbm(uv * 2.0 - time * 0.015 + vec2f(5.0, 3.0), 4);

  // Purple/blue nebula
  let nebulaColor1 = vec3f(0.2, 0.1, 0.4) * nebula1 * 0.3;
  let nebulaColor2 = vec3f(0.1, 0.15, 0.3) * nebula2 * 0.2;

  color += nebulaColor1 + nebulaColor2;

  return color;
}

// Star field
fn starField(uv: vec2f, time: f32, density: f32) -> f32 {
  let grid = floor(uv * density);
  let gridUV = fract(uv * density);

  let starHash = hash(grid);
  let starPos = vec2f(hash(grid + 0.5), hash(grid + 1.5));
  let starDist = length(gridUV - starPos);

  // Star visibility threshold
  let isVisible = step(0.85, starHash);

  // Star twinkle
  let twinkle = sin(time * (2.0 + starHash * 4.0) + starHash * 100.0) * 0.3 + 0.7;

  // Star brightness
  let brightness = smoothstep(0.05, 0.0, starDist) * isVisible * twinkle;

  return brightness;
}

// Station glow effect
fn stationGlow(uv: vec2f, time: f32) -> vec3f {
  let center = vec2f(0.5, 0.5);
  let dist = length(uv - center);

  // Pulsing glow
  let pulse = sin(time * 2.0) * 0.1 + 0.9;
  let glow = exp(-dist * 6.0) * 0.15 * pulse;

  // Station blue color
  return vec3f(0.45, 0.73, 1.0) * glow;
}

// Orbital ring effect
fn orbitalRing(uv: vec2f, time: f32, radius: f32) -> f32 {
  let center = vec2f(0.5, 0.5);
  let dist = length(uv - center);

  let ringWidth = 0.005;
  let ring = smoothstep(ringWidth, 0.0, abs(dist - radius));

  // Rotating highlight
  let angle = atan2(uv.y - center.y, uv.x - center.x);
  let highlight = sin(angle * 2.0 - time * 1.5) * 0.5 + 0.5;

  return ring * highlight * 0.3;
}

// Grid overlay for sci-fi feel
fn scifiGrid(uv: vec2f, time: f32) -> f32 {
  let gridSize = 20.0;
  let grid = fract(uv * gridSize);

  let lineX = smoothstep(0.02, 0.0, grid.x) + smoothstep(0.98, 1.0, grid.x);
  let lineY = smoothstep(0.02, 0.0, grid.y) + smoothstep(0.98, 1.0, grid.y);

  // Pulse effect
  let pulse = sin(time + uv.x * 10.0 + uv.y * 10.0) * 0.5 + 0.5;

  return (lineX + lineY) * 0.03 * pulse;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  let uv = input.uv;
  let time = uniforms.time;

  // Deep space background
  var color = deepSpace(uv, time);

  // Multiple star layers
  let stars1 = starField(uv, time, 30.0);
  let stars2 = starField(uv + vec2f(0.5, 0.3), time * 0.7, 50.0) * 0.7;
  let stars3 = starField(uv + vec2f(0.2, 0.7), time * 0.5, 80.0) * 0.4;

  color += vec3f(stars1 + stars2 + stars3);

  // Station glow at center
  color += stationGlow(uv, time);

  // Orbital rings
  color += vec3f(0.45, 0.73, 1.0) * orbitalRing(uv, time, 0.2);
  color += vec3f(0.3, 0.5, 0.8) * orbitalRing(uv, time * 0.8, 0.35);

  // Subtle sci-fi grid
  color += vec3f(0.3, 0.5, 0.8) * scifiGrid(uv, time);

  // Vignette
  let vignette = 1.0 - length(uv - 0.5) * 0.8;
  color *= vignette;

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

// Docking connection beam
fn dockShape(uv: vec2f, time: f32, param: f32) -> vec4f {
  let center = vec2f(0.5, 0.5);
  let dist = length(uv - center);

  // Energy beam effect
  let beam = smoothstep(0.4, 0.0, dist);
  let pulse = sin(dist * 20.0 - time * 8.0 + param) * 0.5 + 0.5;

  // Green docking color
  let color = vec3f(0.18, 0.8, 0.44) * beam * (0.7 + pulse * 0.3);
  let alpha = beam * 0.8;

  return vec4f(color, alpha);
}

// Thruster flame
fn thrusterShape(uv: vec2f, time: f32, life: f32) -> vec4f {
  let center = vec2f(0.5, 0.5);
  let toCenter = uv - center;
  let dist = length(toCenter);

  // Flame shape - elongated
  let angle = atan2(toCenter.y, toCenter.x);
  let flame = smoothstep(0.5, 0.1, dist);

  // Flicker effect
  let flicker = sin(time * 20.0 + angle * 4.0) * 0.2 + 0.8;

  // Hot core to cool outer
  let heat = 1.0 - dist * 2.0;
  var color: vec3f;
  if (heat > 0.6) {
    color = vec3f(1.0, 1.0, 0.9); // White core
  } else if (heat > 0.3) {
    color = vec3f(1.0, 0.7, 0.3); // Orange
  } else {
    color = vec3f(0.8, 0.3, 0.1); // Red outer
  }

  let alpha = flame * flicker * life;

  return vec4f(color, alpha);
}

// Star sparkle
fn starShape(uv: vec2f, time: f32, param: f32) -> vec4f {
  let center = vec2f(0.5, 0.5);
  let toCenter = uv - center;
  let dist = length(toCenter);

  // Star rays
  let angle = atan2(toCenter.y, toCenter.x);
  let rays = abs(sin(angle * 4.0 + param));

  // Core glow
  let core = smoothstep(0.3, 0.0, dist);
  let rayGlow = smoothstep(0.5, 0.0, dist) * rays * 0.5;

  // Twinkle
  let twinkle = sin(time * 5.0 + param * 10.0) * 0.3 + 0.7;

  let brightness = (core + rayGlow) * twinkle;
  let color = vec3f(1.0, 0.98, 0.9) * brightness;
  let alpha = brightness;

  return vec4f(color, alpha);
}

// Energy spark
fn sparkShape(uv: vec2f, time: f32, life: f32) -> vec4f {
  let center = vec2f(0.5, 0.5);
  let dist = length(uv - center);

  // Sharp spark
  let spark = smoothstep(0.3, 0.0, dist);
  let sparkle = sin(time * 15.0) * 0.3 + 0.7;

  // Electric blue color
  let color = vec3f(0.4, 0.7, 1.0) * spark * sparkle;
  let alpha = spark * life;

  return vec4f(color, alpha);
}

// Energy field
fn energyShape(uv: vec2f, time: f32, param: f32) -> vec4f {
  let center = vec2f(0.5, 0.5);
  let dist = length(uv - center);

  // Ripple rings
  let ripple = sin(dist * 30.0 - time * 5.0 + param) * 0.5 + 0.5;
  let field = smoothstep(0.5, 0.2, dist) * ripple;

  // Cyan energy color
  let color = vec3f(0.3, 0.8, 1.0) * field;
  let alpha = field * 0.7;

  return vec4f(color, alpha);
}

// Pulse wave
fn pulseShape(uv: vec2f, time: f32, life: f32, param: f32) -> vec4f {
  let center = vec2f(0.5, 0.5);
  let dist = length(uv - center);

  // Expanding ring
  let ringPos = (1.0 - life) * 0.5;
  let ring = smoothstep(0.08, 0.0, abs(dist - ringPos));

  // Color based on param
  var color: vec3f;
  if (param > 0.5) {
    color = vec3f(0.18, 0.8, 0.44); // Green for success
  } else {
    color = vec3f(0.45, 0.73, 1.0); // Blue for normal
  }

  let alpha = ring * life;

  return vec4f(color, alpha);
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  let uv = input.uv;
  let pType = i32(input.particleType);
  let time = uniforms.time;

  var color: vec4f;

  switch(pType) {
    case 0: { // dock
      color = dockShape(uv, time, input.param1);
    }
    case 1: { // thruster
      color = thrusterShape(uv, time, input.life);
    }
    case 2: { // star
      color = starShape(uv, time, input.param1);
    }
    case 3: { // spark
      color = sparkShape(uv, time, input.life);
    }
    case 4: { // energy
      color = energyShape(uv, time, input.param1);
    }
    case 5: { // pulse
      color = pulseShape(uv, time, input.life, input.param1);
    }
    default: {
      color = vec4f(1.0, 1.0, 1.0, input.life);
    }
  }

  color.a *= input.life;

  return color;
}
`;
