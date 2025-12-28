/**
 * WGSL Shaders - Pac-Man
 * Retro Arcade / Neon Yellow / Classic Theme
 * Game #152
 */

export const BACKGROUND_SHADER = /* wgsl */ `
struct Uniforms {
  time: f32,
  aspectRatio: f32,
  powerMode: f32,
  intensity: f32,
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

fn mazePattern(uv: vec2f, time: f32) -> f32 {
  let grid = 15.0;
  let cellUv = fract(uv * grid);
  let cellId = floor(uv * grid);

  // Create maze-like pattern
  let h = hash(cellId);
  var pattern = 0.0;

  // Horizontal or vertical line based on hash
  if (h > 0.5) {
    pattern = smoothstep(0.45, 0.5, abs(cellUv.y - 0.5));
  } else {
    pattern = smoothstep(0.45, 0.5, abs(cellUv.x - 0.5));
  }

  // Add subtle glow animation
  let glow = sin(time * 2.0 + h * 6.28) * 0.5 + 0.5;
  pattern *= 0.3 + glow * 0.2;

  return pattern;
}

fn scanlines(uv: vec2f, time: f32) -> f32 {
  let line = sin(uv.y * 400.0) * 0.5 + 0.5;
  let flicker = sin(time * 30.0) * 0.02 + 0.98;
  return mix(0.85, 1.0, line) * flicker;
}

fn vignette(uv: vec2f) -> f32 {
  let center = uv - 0.5;
  let dist = length(center);
  return 1.0 - smoothstep(0.3, 0.7, dist);
}

fn arcadeGlow(uv: vec2f, time: f32) -> vec3f {
  var glow = vec3f(0.0);

  // Corner glow effects
  let corners = array<vec2f, 4>(
    vec2f(0.0, 0.0),
    vec2f(1.0, 0.0),
    vec2f(0.0, 1.0),
    vec2f(1.0, 1.0)
  );

  for (var i = 0u; i < 4u; i++) {
    let dist = distance(uv, corners[i]);
    let pulse = sin(time * 2.0 + f32(i) * 1.57) * 0.5 + 0.5;
    glow += vec3f(0.04, 0.52, 0.89) * (1.0 - smoothstep(0.0, 0.4, dist)) * pulse * 0.3;
  }

  return glow;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  let uv = input.uv;
  let time = uniforms.time;
  let powerMode = uniforms.powerMode;

  // Base dark background
  var color = vec3f(0.02, 0.02, 0.04);

  // Maze pattern
  let maze = mazePattern(uv, time);
  var mazeColor = vec3f(0.04, 0.52, 0.89); // Blue maze

  // Power mode changes color
  if (powerMode > 0.5) {
    let flash = sin(time * 8.0) * 0.5 + 0.5;
    mazeColor = mix(mazeColor, vec3f(0.2, 0.6, 1.0), flash);
  }

  color += mazeColor * maze * 0.15;

  // Arcade corner glow
  color += arcadeGlow(uv, time);

  // Subtle noise for CRT effect
  let n = noise(uv * 200.0 + time * 10.0);
  color += vec3f(n * 0.02);

  // Scanlines
  color *= scanlines(uv, time);

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
  powerMode: f32,
  intensity: f32,
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

  // Size based on particle type
  var size = particle.size * lifeRatio;
  let pType = u32(particle.particleType);

  // Dot eat particles pop then fade
  if (pType == 0u) {
    size *= 1.0 + (1.0 - lifeRatio) * 0.5;
  }
  // Power up particles expand
  else if (pType == 1u) {
    size *= 1.0 + (1.0 - lifeRatio) * 2.0;
  }
  // Ghost eat particles burst
  else if (pType == 2u) {
    size *= 1.5 - lifeRatio * 0.5;
  }
  // Trail particles shrink
  else if (pType == 3u || pType == 4u) {
    size *= lifeRatio * 0.8;
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

  // Dot eat - bright yellow flash
  if (pType == 0u) {
    alpha *= input.life;
    let glow = 1.0 - smoothstep(0.0, 0.4, dist);
    color += vec3f(1.0, 0.9, 0.3) * glow * 0.5;
  }
  // Power up - expanding blue ring
  else if (pType == 1u) {
    let ring = abs(dist - 0.3) < 0.1;
    alpha = select(alpha * 0.3, alpha, ring) * input.life;
    color = mix(color, vec3f(0.4, 0.8, 1.0), 0.5);
  }
  // Ghost eat - colorful burst
  else if (pType == 2u) {
    alpha *= input.life * 1.2;
    let spark = sin(atan2(center.y, center.x) * 8.0 + uniforms.time * 20.0) * 0.5 + 0.5;
    color += vec3f(spark * 0.3);
  }
  // Pac-Man trail
  else if (pType == 3u) {
    alpha *= input.life * 0.6;
    color = vec3f(1.0, 0.8, 0.2);
  }
  // Ghost trail
  else if (pType == 4u) {
    alpha *= input.life * 0.4;
  }
  // Game over burst
  else if (pType == 5u) {
    alpha *= input.life;
    let flash = sin(uniforms.time * 15.0) * 0.5 + 0.5;
    color = mix(color, vec3f(1.0, 0.3, 0.2), flash);
  }

  // Glow effect for all particles
  let glow = exp(-dist * 4.0) * 0.5;
  color += color * glow;

  alpha *= uniforms.intensity;

  return vec4f(color, alpha * input.color.a);
}
`;
