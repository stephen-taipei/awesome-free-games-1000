/**
 * WebGPU Shaders - Bomberman
 * Classic Arcade / Explosive / Orange-Red Fire Theme
 * Game #159
 */

export const BACKGROUND_SHADER = /* wgsl */ `
struct Uniforms {
  resolution: vec2f,
  time: f32,
  _pad: f32,
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
  output.uv = (positions[vertexIndex] + 1.0) * 0.5;
  return output;
}

fn hash21(p: vec2f) -> f32 {
  var p3 = fract(vec3f(p.x, p.y, p.x) * 0.1031);
  p3 = p3 + dot(p3, vec3f(p3.y + 33.33, p3.z + 33.33, p3.x + 33.33));
  return fract((p3.x + p3.y) * p3.z);
}

fn noise(p: vec2f) -> f32 {
  let i = floor(p);
  let f = fract(p);
  let u = f * f * (3.0 - 2.0 * f);

  return mix(
    mix(hash21(i + vec2f(0.0, 0.0)), hash21(i + vec2f(1.0, 0.0)), u.x),
    mix(hash21(i + vec2f(0.0, 1.0)), hash21(i + vec2f(1.0, 1.0)), u.x),
    u.y
  );
}

// Grid pattern
fn grid(uv: vec2f) -> f32 {
  let gridSize = vec2f(15.0, 13.0);
  let grid = fract(uv * gridSize);
  let lineX = smoothstep(0.03, 0.0, grid.x) + smoothstep(0.97, 1.0, grid.x);
  let lineY = smoothstep(0.03, 0.0, grid.y) + smoothstep(0.97, 1.0, grid.y);
  return (lineX + lineY) * 0.2;
}

// Grass texture
fn grassTexture(uv: vec2f, time: f32) -> vec3f {
  let n1 = noise(uv * 40.0 + time * 0.1);
  let n2 = noise(uv * 80.0) * 0.5;
  let base = vec3f(0.24, 0.55, 0.25);
  let variation = vec3f(0.05, 0.1, 0.05) * (n1 + n2);
  return base + variation;
}

// Fire flicker effect at edges
fn fireFlicker(uv: vec2f, time: f32) -> f32 {
  let edge = max(
    max(smoothstep(0.1, 0.0, uv.x), smoothstep(0.9, 1.0, uv.x)),
    max(smoothstep(0.1, 0.0, uv.y), smoothstep(0.9, 1.0, uv.y))
  );
  let flicker = sin(time * 10.0 + uv.x * 20.0) * sin(time * 8.0 + uv.y * 20.0);
  return edge * (0.5 + flicker * 0.3) * 0.3;
}

// Heat distortion effect
fn heatWave(uv: vec2f, time: f32) -> vec2f {
  let wave = sin(uv.y * 30.0 + time * 3.0) * 0.002;
  return vec2f(wave, 0.0);
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  var uv = input.uv;
  let time = uniforms.time;

  // Apply subtle heat distortion
  uv = uv + heatWave(uv, time);

  // Base grass color
  var color = grassTexture(uv, time);

  // Add grid lines
  let gridLines = grid(uv);
  color = mix(color, vec3f(0.18, 0.45, 0.2), gridLines);

  // Add fire flicker at edges
  let fire = fireFlicker(uv, time);
  color = mix(color, vec3f(1.0, 0.5, 0.0), fire);

  // Vignette
  let vignette = 1.0 - length((uv - 0.5) * 1.3);
  color *= smoothstep(0.0, 0.7, vignette);

  // Subtle warm tint
  color = mix(color, color * vec3f(1.05, 0.98, 0.9), 0.2);

  return vec4f(color, 1.0);
}
`;

export const PARTICLE_SHADER = /* wgsl */ `
struct Uniforms {
  resolution: vec2f,
  time: f32,
  _pad: f32,
}

struct Particle {
  position: vec2f,
  velocity: vec2f,
  color: vec4f,
  size: f32,
  life: f32,
  maxLife: f32,
  particleType: f32,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;
@group(0) @binding(1) var<storage, read> particles: array<Particle>;

struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) color: vec4f,
  @location(1) uv: vec2f,
  @location(2) particleType: f32,
  @location(3) lifeRatio: f32,
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
  let size = particle.size * lifeRatio;

  let worldPos = particle.position + corner * size / uniforms.resolution;
  let clipPos = worldPos * 2.0 - 1.0;

  var output: VertexOutput;
  output.position = vec4f(clipPos.x, -clipPos.y, 0.0, 1.0);
  output.color = particle.color;
  output.uv = corner * 0.5 + 0.5;
  output.particleType = particle.particleType;
  output.lifeRatio = lifeRatio;

  return output;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  let dist = length(input.uv - 0.5) * 2.0;
  let particleType = i32(input.particleType);
  var alpha = input.color.a * input.lifeRatio;

  // Type 0: Bomb place puff
  if (particleType == 0) {
    let puff = 1.0 - smoothstep(0.0, 0.5, dist);
    let smoke = sin(input.uv.x * 10.0 + uniforms.time * 5.0) * 0.2 + 0.8;
    alpha *= puff * smoke * 0.7;
    if (puff < 0.1) { discard; }
  }
  // Type 1: Explosion
  else if (particleType == 1) {
    let explosion = 1.0 - smoothstep(0.0, 0.5, dist);
    let turbulence = sin(input.uv.x * 15.0 + input.uv.y * 15.0 + uniforms.time * 15.0) * 0.3 + 0.7;
    alpha *= explosion * turbulence;
    if (explosion < 0.1) { discard; }
  }
  // Type 2: Brick debris
  else if (particleType == 2) {
    let square = max(abs(input.uv.x - 0.5), abs(input.uv.y - 0.5));
    let debris = 1.0 - smoothstep(0.3, 0.5, square);
    alpha *= debris;
    if (debris < 0.1) { discard; }
  }
  // Type 3: Player hit
  else if (particleType == 3) {
    let ring = 1.0 - abs(dist - 0.4 * input.lifeRatio) * 5.0;
    alpha *= max(0.0, ring);
    if (ring < 0.1) { discard; }
  }
  // Type 4: Power-up collect
  else if (particleType == 4) {
    let star = 1.0 - dist;
    let sparkle = sin(uniforms.time * 20.0 + dist * 10.0) * 0.3 + 0.7;
    alpha *= star * sparkle;
    if (star < 0.1) { discard; }
  }
  // Type 5: Game over / Victory
  else if (particleType == 5) {
    let burst = 1.0 - dist;
    let flare = sin(uniforms.time * 8.0 + dist * 15.0) * 0.3 + 0.7;
    alpha *= burst * flare;
    if (burst < 0.1) { discard; }
  }
  // Default
  else {
    let circle = 1.0 - smoothstep(0.3, 0.5, dist);
    alpha *= circle;
    if (circle < 0.1) { discard; }
  }

  return vec4f(input.color.rgb, alpha);
}
`;
