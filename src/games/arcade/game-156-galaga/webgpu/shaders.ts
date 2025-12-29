/**
 * WebGPU Shaders - Galaga
 * Retro Arcade / Neon Space / Classic Galaga Theme
 * Game #156
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

// Hash functions for stars
fn hash21(p: vec2f) -> f32 {
  var p3 = fract(vec3f(p.x, p.y, p.x) * 0.1031);
  p3 = p3 + dot(p3, vec3f(p3.y + 33.33, p3.z + 33.33, p3.x + 33.33));
  return fract((p3.x + p3.y) * p3.z);
}

fn hash22(p: vec2f) -> vec2f {
  let n = sin(dot(p, vec2f(41.0, 289.0)));
  return fract(vec2f(262144.0, 32768.0) * n);
}

// Noise for nebula
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

fn fbm(p: vec2f) -> f32 {
  var value = 0.0;
  var amplitude = 0.5;
  var frequency = 1.0;
  var pos = p;

  for (var i = 0; i < 4; i++) {
    value += amplitude * noise(pos * frequency);
    amplitude *= 0.5;
    frequency *= 2.0;
    pos = pos * 1.1 + vec2f(3.14, 2.71);
  }

  return value;
}

// Starfield layer
fn starField(uv: vec2f, density: f32, size: f32, speed: f32) -> f32 {
  let scrolledUv = vec2f(uv.x, uv.y + uniforms.time * speed);
  let gridSize = 1.0 / density;
  let cell = floor(scrolledUv / gridSize);
  let cellUv = fract(scrolledUv / gridSize);

  let starPos = hash22(cell);
  let dist = length(cellUv - starPos);
  let starSize = hash21(cell) * size;

  let brightness = smoothstep(starSize, 0.0, dist);
  let twinkle = sin(uniforms.time * 3.0 + hash21(cell) * 6.28) * 0.3 + 0.7;

  return brightness * twinkle;
}

// Nebula effect
fn nebula(uv: vec2f) -> vec3f {
  let slowTime = uniforms.time * 0.02;

  // Purple nebula
  let n1 = fbm(uv * 2.0 + vec2f(slowTime, slowTime * 0.5));
  let purple = vec3f(0.4, 0.1, 0.6) * n1 * 0.15;

  // Pink nebula
  let n2 = fbm(uv * 3.0 - vec2f(slowTime * 0.7, slowTime * 0.3));
  let pink = vec3f(0.8, 0.2, 0.5) * n2 * 0.1;

  // Blue nebula
  let n3 = fbm(uv * 1.5 + vec2f(slowTime * 0.4, -slowTime * 0.2));
  let blue = vec3f(0.1, 0.3, 0.8) * n3 * 0.12;

  return purple + pink + blue;
}

// Scan line effect (classic arcade CRT)
fn scanLines(uv: vec2f) -> f32 {
  let line = sin(uv.y * uniforms.resolution.y * 1.5) * 0.5 + 0.5;
  return mix(0.92, 1.0, line);
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  let uv = input.uv;

  // Deep space background
  var color = vec3f(0.0, 0.0, 0.02);

  // Add nebula
  color += nebula(uv);

  // Multiple star layers (parallax scrolling)
  let stars1 = starField(uv, 30.0, 0.02, 0.03);
  let stars2 = starField(uv * 1.5, 20.0, 0.015, 0.05);
  let stars3 = starField(uv * 0.8, 15.0, 0.025, 0.02);

  color += vec3f(1.0, 1.0, 1.0) * stars1 * 0.8;
  color += vec3f(0.9, 0.9, 1.0) * stars2 * 0.5;
  color += vec3f(1.0, 0.95, 0.9) * stars3 * 0.6;

  // Add some bright colored stars
  let colorStar1 = starField(uv + 0.5, 50.0, 0.018, 0.04);
  let colorStar2 = starField(uv + 0.3, 45.0, 0.016, 0.035);
  color += vec3f(1.0, 0.5, 0.3) * colorStar1 * 0.4;
  color += vec3f(0.3, 0.7, 1.0) * colorStar2 * 0.4;

  // CRT scan lines
  color *= scanLines(uv);

  // Vignette
  let vignette = 1.0 - length((uv - 0.5) * 1.3);
  color *= smoothstep(0.0, 0.7, vignette);

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

  // Type 0: Player bullet - laser beam
  if (particleType == 0) {
    let beam = 1.0 - abs(input.uv.x - 0.5) * 2.0;
    let core = smoothstep(0.3, 0.0, abs(input.uv.x - 0.5));
    alpha *= beam * (0.6 + core * 0.4);
    if (beam < 0.1) { discard; }
  }
  // Type 1: Enemy death explosion
  else if (particleType == 1) {
    let explosion = 1.0 - smoothstep(0.0, 0.5, dist);
    let sparks = max(0.0, sin(atan2(input.uv.y - 0.5, input.uv.x - 0.5) * 8.0 + input.lifeRatio * 10.0));
    alpha *= explosion * (1.0 + sparks * 0.3 * (1.0 - input.lifeRatio));
    if (explosion < 0.05) { discard; }
  }
  // Type 2: Player hit
  else if (particleType == 2) {
    let ring = abs(dist - 0.6 * (1.0 - input.lifeRatio));
    let ringAlpha = 1.0 - smoothstep(0.0, 0.15, ring);
    let flash = smoothstep(0.8, 1.0, input.lifeRatio) * (1.0 - dist);
    alpha *= max(ringAlpha, flash);
    if (alpha < 0.05) { discard; }
  }
  // Type 3: Enemy diving trail
  else if (particleType == 3) {
    let trail = 1.0 - dist;
    let flicker = sin(input.lifeRatio * 20.0 + uniforms.time * 10.0) * 0.2 + 0.8;
    alpha *= trail * flicker * 0.7;
    if (trail < 0.1) { discard; }
  }
  // Type 4: Bullet trail spark
  else if (particleType == 4) {
    let spark = 1.0 - smoothstep(0.0, 0.4, dist);
    alpha *= spark * 0.8;
    if (spark < 0.1) { discard; }
  }
  // Type 5: Game over / Level complete
  else if (particleType == 5) {
    let star = 1.0 - dist;
    let pulse = sin(uniforms.time * 5.0 + dist * 10.0) * 0.3 + 0.7;
    alpha *= star * pulse;
    if (star < 0.1) { discard; }
  }
  // Default: circular particle
  else {
    let circle = 1.0 - smoothstep(0.3, 0.5, dist);
    alpha *= circle;
    if (circle < 0.1) { discard; }
  }

  return vec4f(input.color.rgb, alpha);
}
`;
