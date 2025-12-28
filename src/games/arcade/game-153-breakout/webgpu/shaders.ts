/**
 * WGSL Shaders - Breakout
 * Neon Electric / Purple-Pink / Arcade Theme
 * Game #153
 */

export const BACKGROUND_SHADER = /* wgsl */ `
struct Uniforms {
  time: f32,
  aspectRatio: f32,
  intensity: f32,
  ballY: f32,
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

fn hash(p: vec2f) -> f32 {
  var p3 = fract(vec3f(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
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

fn neonGrid(uv: vec2f, time: f32) -> f32 {
  let gridSize = 20.0;
  let gridUv = fract(uv * gridSize);

  // Grid lines
  let lineWidth = 0.03;
  let hLine = smoothstep(lineWidth, 0.0, abs(gridUv.y - 0.5) - 0.48);
  let vLine = smoothstep(lineWidth, 0.0, abs(gridUv.x - 0.5) - 0.48);

  let grid = max(hLine, vLine);

  // Pulsing glow
  let cellId = floor(uv * gridSize);
  let pulse = sin(time * 2.0 + hash(cellId) * 6.28) * 0.5 + 0.5;

  return grid * (0.3 + pulse * 0.2);
}

fn electricPulse(uv: vec2f, time: f32, ballY: f32) -> f32 {
  // Horizontal energy waves from ball position
  let waveY = 1.0 - ballY;
  let dist = abs(uv.y - waveY);
  let wave = exp(-dist * 15.0) * sin(uv.x * 30.0 + time * 10.0) * 0.5 + 0.5;

  // Additional ambient waves
  let wave2 = sin(uv.y * 20.0 + time * 3.0) * sin(uv.x * 15.0 - time * 2.0);

  return wave * 0.3 + wave2 * 0.05;
}

fn vignette(uv: vec2f) -> f32 {
  let center = uv - 0.5;
  let dist = length(center);
  return 1.0 - smoothstep(0.3, 0.8, dist);
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  let uv = input.uv;
  let time = uniforms.time;

  // Base gradient (purple to pink)
  var color = mix(
    vec3f(0.42, 0.36, 0.91), // Purple
    vec3f(0.99, 0.47, 0.66), // Pink
    uv.y
  ) * 0.15;

  // Neon grid
  let grid = neonGrid(uv, time);
  color += vec3f(0.64, 0.61, 1.0) * grid * 0.3;

  // Electric pulses
  let electric = electricPulse(uv, time, uniforms.ballY);
  color += vec3f(0.3, 0.7, 1.0) * electric;

  // Subtle noise
  let n = noise(uv * 150.0 + time * 5.0);
  color += vec3f(n * 0.02);

  // Corner glow
  let topGlow = 1.0 - smoothstep(0.0, 0.4, uv.y);
  color += vec3f(0.99, 0.47, 0.66) * topGlow * 0.15;

  // Vignette
  color *= vignette(uv);

  // Overall intensity
  color *= uniforms.intensity;

  return vec4f(color, 1.0);
}
`;

export const PARTICLE_SHADER = /* wgsl */ `
struct Uniforms {
  time: f32,
  aspectRatio: f32,
  intensity: f32,
  ballY: f32,
}

struct Particle {
  position: vec2f,
  velocity: vec2f,
  color: vec4f,
  life: f32,
  maxLife: f32,
  size: f32,
  particleType: f32,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;
@group(0) @binding(1) var<storage, read> particles: array<Particle>;

struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) color: vec4f,
  @location(1) uv: vec2f,
  @location(2) particleType: f32,
  @location(3) life: f32,
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
    vec2f(-1.0, 1.0),
    vec2f(-1.0, 1.0),
    vec2f(1.0, -1.0),
    vec2f(1.0, 1.0)
  );

  let corner = corners[vertexIndex];
  let lifeRatio = particle.life / particle.maxLife;

  var size = particle.size * lifeRatio;
  let pType = u32(particle.particleType);

  // Brick break - exploding shards
  if (pType == 0u) {
    size *= 1.2 - lifeRatio * 0.4;
  }
  // Ball trail - fading trail
  else if (pType == 1u) {
    size *= lifeRatio * 0.7;
  }
  // Paddle hit - expanding ring
  else if (pType == 2u) {
    size *= 1.0 + (1.0 - lifeRatio) * 1.5;
  }
  // Wall bounce - spark
  else if (pType == 3u) {
    size *= lifeRatio;
  }
  // Victory burst
  else if (pType == 5u) {
    size *= 1.5 - lifeRatio * 0.5;
  }

  var pos = particle.position + corner * size * 0.02;
  pos.x /= uniforms.aspectRatio;

  var output: VertexOutput;
  output.position = vec4f(pos * 2.0 - 1.0, 0.0, 1.0);
  output.color = particle.color;
  output.uv = corner * 0.5 + 0.5;
  output.particleType = particle.particleType;
  output.life = lifeRatio;
  return output;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  let uv = input.uv;
  let center = uv - 0.5;
  let dist = length(center);
  let pType = u32(input.particleType);

  var alpha = 1.0 - smoothstep(0.3, 0.5, dist);
  var color = input.color.rgb;

  // Brick break - angular shards
  if (pType == 0u) {
    let angle = atan2(center.y, center.x);
    let shard = step(0.0, sin(angle * 4.0));
    alpha *= input.life * (0.8 + shard * 0.2);
  }
  // Ball trail - soft glow
  else if (pType == 1u) {
    alpha *= input.life * 0.6;
    let glow = exp(-dist * 5.0);
    color += vec3f(0.3, 0.5, 1.0) * glow * 0.3;
  }
  // Paddle hit - ring effect
  else if (pType == 2u) {
    let ring = abs(dist - 0.35) < 0.1;
    alpha = select(alpha * 0.2, alpha, ring) * input.life;
  }
  // Wall bounce - electric spark
  else if (pType == 3u) {
    let spark = sin(atan2(center.y, center.x) * 6.0 + uniforms.time * 30.0);
    alpha *= input.life * (0.7 + spark * 0.3);
    color = mix(color, vec3f(0.3, 0.7, 1.0), 0.3);
  }
  // Game over
  else if (pType == 4u) {
    alpha *= input.life;
    let flash = sin(uniforms.time * 10.0) * 0.5 + 0.5;
    color = mix(color, vec3f(1.0, 0.3, 0.4), flash);
  }
  // Victory burst
  else if (pType == 5u) {
    alpha *= input.life * 1.2;
    let rainbow = sin(atan2(center.y, center.x) * 3.0 + uniforms.time * 5.0) * 0.5 + 0.5;
    color = mix(color, vec3f(rainbow, 0.5, 1.0 - rainbow), 0.4);
  }

  // Neon glow for all
  let glow = exp(-dist * 4.0) * 0.6;
  color += color * glow;

  alpha *= uniforms.intensity;

  return vec4f(color, alpha * input.color.a);
}
`;
