/**
 * WGSL Shaders - Magnetic Blocks
 * Electromagnetic / Physics / Magnet Theme
 * Game #138
 */

export const BACKGROUND_SHADER = /* wgsl */ `
struct Uniforms {
  time: f32,
  width: f32,
  height: f32,
  foldProgress: f32,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;

struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) uv: vec2f,
}

@vertex
fn vertexMain(@builtin(vertex_index) vertexIndex: u32) -> VertexOutput {
  var pos = array<vec2f, 4>(
    vec2f(-1.0, -1.0),
    vec2f(1.0, -1.0),
    vec2f(-1.0, 1.0),
    vec2f(1.0, 1.0)
  );

  var output: VertexOutput;
  output.position = vec4f(pos[vertexIndex], 0.0, 1.0);
  output.uv = pos[vertexIndex] * 0.5 + 0.5;
  return output;
}

fn hash(p: vec2f) -> f32 {
  let n = sin(dot(p, vec2f(127.1, 311.7)));
  return fract(n * 43758.5453);
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

// Magnetic field line pattern
fn magneticField(uv: vec2f, time: f32) -> f32 {
  let center1 = vec2f(0.3, 0.4);
  let center2 = vec2f(0.7, 0.6);

  let d1 = distance(uv, center1);
  let d2 = distance(uv, center2);

  // Field lines flowing between poles
  let angle = atan2(uv.y - 0.5, uv.x - 0.5);
  let fieldLine = sin(angle * 8.0 + time * 0.5) * 0.5 + 0.5;

  let strength1 = 1.0 / (1.0 + d1 * d1 * 8.0);
  let strength2 = 1.0 / (1.0 + d2 * d2 * 8.0);

  return fieldLine * (strength1 + strength2) * 0.3;
}

// Plasma effect
fn plasma(uv: vec2f, time: f32) -> f32 {
  let p = uv * 4.0;
  var v = 0.0;

  v += sin(p.x + time);
  v += sin(p.y + time * 0.5);
  v += sin((p.x + p.y) + time * 0.3);
  v += sin(sqrt(p.x * p.x + p.y * p.y) + time * 0.7);

  return v * 0.25 + 0.5;
}

// Electric arc pattern
fn electricArc(uv: vec2f, time: f32) -> f32 {
  let y = uv.y - 0.5;
  let arc = sin(uv.x * 20.0 + time * 5.0) * 0.02;
  arc += sin(uv.x * 40.0 - time * 3.0) * 0.01;

  let dist = abs(y - arc);
  return smoothstep(0.02, 0.0, dist) * step(0.2, uv.x) * step(uv.x, 0.8);
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  let uv = input.uv;
  let time = uniforms.time;

  // Deep space background
  let deepSpace = vec3f(0.10, 0.10, 0.18);
  let cosmicPurple = vec3f(0.09, 0.13, 0.24);

  // Animated gradient
  let gradientNoise = fbm(uv * 3.0 + time * 0.1);
  var color = mix(deepSpace, cosmicPurple, gradientNoise);

  // Magnetic field lines
  let field = magneticField(uv, time);
  let fieldColor = vec3f(0.61, 0.35, 0.71); // Purple field
  color = mix(color, fieldColor, field * 0.4);

  // Plasma effect in background
  let plasmaValue = plasma(uv, time * 0.5);
  let plasmaColor = vec3f(0.20, 0.15, 0.30);
  color = mix(color, plasmaColor, plasmaValue * 0.15);

  // Floating magnetic particles
  let particleNoise = noise(uv * 30.0 + time);
  if (particleNoise > 0.92) {
    let sparkle = (particleNoise - 0.92) * 12.5;
    let sparkColor = vec3f(0.78, 0.24, 0.62); // Magenta spark
    color += sparkColor * sparkle * 0.5;
  }

  // Subtle electric arcs
  let arc = electricArc(uv, time);
  let arcColor = vec3f(0.20, 0.85, 0.95); // Cyan arc
  color += arcColor * arc * 0.3;

  // Radial magnetic force visualization
  let center = vec2f(0.5, 0.5);
  let dist = distance(uv, center);
  let rings = sin(dist * 30.0 - time * 2.0) * 0.5 + 0.5;
  let ringFade = 1.0 - smoothstep(0.2, 0.5, dist);
  color += vec3f(0.61, 0.35, 0.71) * rings * ringFade * 0.05;

  // Vignette
  let vignette = 1.0 - length((uv - 0.5) * 1.2);
  color *= smoothstep(0.0, 0.8, vignette);

  return vec4f(color, 1.0);
}
`;

export const PARTICLE_SHADER = /* wgsl */ `
struct Uniforms {
  time: f32,
  width: f32,
  height: f32,
  foldProgress: f32,
}

struct Particle {
  position: vec2f,
  velocity: vec2f,
  color: vec4f,
  size: f32,
  life: f32,
  particleType: f32,
  seed: f32,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;
@group(0) @binding(1) var<storage, read> particles: array<Particle>;

struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) color: vec4f,
  @location(1) uv: vec2f,
  @location(2) particleType: f32,
  @location(3) life: f32,
  @location(4) seed: f32,
}

@vertex
fn vertexMain(
  @builtin(vertex_index) vertexIndex: u32,
  @builtin(instance_index) instanceIndex: u32
) -> VertexOutput {
  let particle = particles[instanceIndex];

  var corners = array<vec2f, 4>(
    vec2f(-1.0, -1.0),
    vec2f(1.0, -1.0),
    vec2f(-1.0, 1.0),
    vec2f(1.0, 1.0)
  );

  let corner = corners[vertexIndex];
  let size = particle.size * particle.life;

  let aspectRatio = uniforms.width / uniforms.height;
  var offset = corner * size;
  offset.x /= aspectRatio;

  let clipPos = particle.position * 2.0 - 1.0;

  var output: VertexOutput;
  output.position = vec4f(clipPos + offset, 0.0, 1.0);
  output.color = particle.color;
  output.uv = corner * 0.5 + 0.5;
  output.particleType = particle.particleType;
  output.life = particle.life;
  output.seed = particle.seed;

  return output;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  let uv = input.uv;
  let center = vec2f(0.5, 0.5);
  let dist = distance(uv, center);
  let pType = i32(input.particleType);
  let time = uniforms.time;

  var alpha = 0.0;
  var color = input.color.rgb;

  switch (pType) {
    case 0: { // fieldLine - magnetic field line
      let lineWidth = 0.1;
      let wavyLine = abs(uv.y - 0.5 + sin(uv.x * 10.0 + time * 3.0) * 0.1);
      alpha = smoothstep(lineWidth, 0.0, wavyLine);
      alpha *= input.life * 0.6;
    }
    case 1: { // magneticPulse - pulsing energy ring
      let ring = abs(dist - 0.3 - sin(time * 4.0 + input.seed * 6.28) * 0.1);
      alpha = smoothstep(0.1, 0.0, ring);
      alpha *= input.life * 0.7;
      color = mix(color, vec3f(1.0), alpha * 0.3);
    }
    case 2: { // attractionSpark - attraction spark
      let sparkle = 1.0 - dist * 2.0;
      let rays = max(0.0, cos(atan2(uv.y - 0.5, uv.x - 0.5) * 6.0) * 0.5 + 0.5);
      alpha = sparkle * (0.5 + rays * 0.5);
      alpha *= input.life;
      color = mix(color, vec3f(1.0, 1.0, 0.8), 0.4);
    }
    case 3: { // repulsionWave - repulsion wave
      let wave = sin(dist * 20.0 - time * 8.0) * 0.5 + 0.5;
      let fade = 1.0 - smoothstep(0.0, 0.5, dist);
      alpha = wave * fade * input.life * 0.5;
    }
    case 4: { // plasmaOrb - floating plasma
      let core = 1.0 - smoothstep(0.0, 0.3, dist);
      let glow = 1.0 - smoothstep(0.0, 0.5, dist);
      let pulse = sin(time * 5.0 + input.seed * 10.0) * 0.3 + 0.7;
      alpha = (core * 0.8 + glow * 0.3) * pulse * input.life;
      color = mix(color, vec3f(0.78, 0.24, 0.62), core * 0.5);
    }
    case 5: { // polarityFlicker - polarity indicator
      let flicker = sin(time * 10.0 + input.seed * 20.0) * 0.5 + 0.5;
      let shape = 1.0 - smoothstep(0.2, 0.4, dist);
      alpha = shape * flicker * input.life;
      color *= 1.0 + flicker * 0.5;
    }
    default: {
      alpha = (1.0 - dist * 2.0) * input.life;
    }
  }

  alpha = clamp(alpha, 0.0, 1.0);
  return vec4f(color, alpha * input.color.a);
}
`;
