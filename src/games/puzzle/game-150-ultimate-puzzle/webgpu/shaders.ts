/**
 * WGSL Shaders - Ultimate Puzzle
 * Ultimate / Prismatic / Rainbow Theme
 * Game #150 (Milestone!)
 */

export const BACKGROUND_SHADER = /* wgsl */ `
struct Uniforms {
  time: f32,
  aspectRatio: f32,
  phase: f32,
  energy: f32,
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

// Hash functions for noise
fn hash21(p: vec2f) -> f32 {
  var p3 = fract(vec3f(p.x, p.y, p.x) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

fn hash22(p: vec2f) -> vec2f {
  let n = sin(dot(p, vec2f(41.0, 289.0)));
  return fract(vec2f(262144.0, 32768.0) * n);
}

// Smooth noise
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

// FBM for cosmic background
fn fbm(p: vec2f) -> f32 {
  var value = 0.0;
  var amplitude = 0.5;
  var pos = p;

  for (var i = 0; i < 5; i++) {
    value += amplitude * noise(pos);
    pos *= 2.0;
    amplitude *= 0.5;
  }

  return value;
}

// Rainbow color from hue
fn rainbow(t: f32) -> vec3f {
  let r = sin(t * 6.28318 + 0.0) * 0.5 + 0.5;
  let g = sin(t * 6.28318 + 2.094) * 0.5 + 0.5;
  let b = sin(t * 6.28318 + 4.189) * 0.5 + 0.5;
  return vec3f(r, g, b);
}

// Phase-specific color
fn phaseColor(phase: f32) -> vec3f {
  if (phase < 0.33) {
    return vec3f(0.91, 0.30, 0.24); // Red for colors phase
  } else if (phase < 0.66) {
    return vec3f(0.0, 0.72, 0.58); // Teal for paths phase
  } else {
    return vec3f(0.42, 0.36, 0.91); // Purple for sort phase
  }
}

// Star field
fn stars(uv: vec2f, time: f32) -> f32 {
  var starValue = 0.0;
  for (var i = 0; i < 3; i++) {
    let scale = 30.0 + f32(i) * 20.0;
    let cell = floor(uv * scale);
    let cellUv = fract(uv * scale);
    let rnd = hash22(cell);

    if (rnd.x > 0.97) {
      let starPos = rnd;
      let dist = length(cellUv - starPos);
      let twinkle = sin(time * 3.0 + rnd.y * 10.0) * 0.5 + 0.5;
      starValue += smoothstep(0.08, 0.0, dist) * (0.5 + 0.5 * twinkle);
    }
  }
  return starValue;
}

// Prismatic lens flare
fn lensFlare(uv: vec2f, center: vec2f, time: f32) -> vec3f {
  let d = length(uv - center);
  var flare = vec3f(0.0);

  // Rainbow ring
  let ring = smoothstep(0.3, 0.28, d) * smoothstep(0.2, 0.25, d);
  flare += rainbow(d * 2.0 + time * 0.1) * ring * 0.5;

  // Inner glow
  let glow = exp(-d * 4.0) * 0.3;
  flare += vec3f(1.0, 0.95, 0.9) * glow;

  return flare;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  var uv = input.uv;
  uv.x *= uniforms.aspectRatio;
  let time = uniforms.time;

  // Cosmic background
  var color = vec3f(0.08, 0.10, 0.15);

  // Animated nebula
  let nebula1 = fbm(uv * 3.0 + time * 0.05);
  let nebula2 = fbm(uv * 2.0 - time * 0.03);

  let phaseCol = phaseColor(uniforms.phase);
  color += phaseCol * nebula1 * 0.15;
  color += rainbow(nebula2 + time * 0.05) * nebula2 * 0.1;

  // Star field
  let starVal = stars(uv, time);
  color += vec3f(1.0, 0.98, 0.95) * starVal;

  // Prismatic energy waves
  let wave1 = sin(uv.x * 15.0 + time * 2.0 + uv.y * 5.0) * 0.5 + 0.5;
  let wave2 = sin(uv.y * 12.0 - time * 1.5 + uv.x * 6.0) * 0.5 + 0.5;
  let waveColor = rainbow(wave1 * wave2 + time * 0.1);
  color += waveColor * wave1 * wave2 * 0.08 * uniforms.energy;

  // Center lens flare (moves based on phase)
  let flareCenter = vec2f(
    0.5 * uniforms.aspectRatio + sin(time * 0.3) * 0.1,
    0.5 + cos(time * 0.2) * 0.1
  );
  color += lensFlare(uv, flareCenter, time) * uniforms.energy;

  // Phase-based gradient overlay
  let gradientAngle = time * 0.1 + uniforms.phase * 3.14159;
  let gradient = sin(uv.x * cos(gradientAngle) + uv.y * sin(gradientAngle) + time) * 0.5 + 0.5;
  color += phaseCol * gradient * 0.05;

  // Rainbow border for ultimate effect
  let edgeDist = min(min(uv.x, 1.0 - uv.x / uniforms.aspectRatio), min(input.uv.y, 1.0 - input.uv.y));
  let borderGlow = smoothstep(0.1, 0.0, edgeDist);
  color += rainbow(edgeDist * 10.0 + time * 0.5) * borderGlow * 0.3 * uniforms.energy;

  // Vignette
  let center = vec2f(0.5 * uniforms.aspectRatio, 0.5);
  let vignette = 1.0 - smoothstep(0.3, 0.8, length(uv - center));
  color *= 0.7 + vignette * 0.3;

  return vec4f(color, 1.0);
}
`;

export const PARTICLE_SHADER = /* wgsl */ `
struct Uniforms {
  time: f32,
  aspectRatio: f32,
  phase: f32,
  energy: f32,
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
  let lifeRatio = particle.life / particle.maxLife;

  // Size pulsing based on particle type
  var sizeMod = 1.0;
  let pType = u32(particle.particleType);

  if (pType == 0u) { // prismaticSpark
    sizeMod = 1.0 + sin(uniforms.time * 15.0 + particle.position.x * 10.0) * 0.3;
  } else if (pType == 1u) { // rainbowTrail
    sizeMod = lifeRatio * 1.2;
  } else if (pType == 2u) { // phaseGlow
    sizeMod = 0.8 + sin(uniforms.time * 4.0) * 0.2;
  } else if (pType == 3u) { // cosmicDust
    sizeMod = 0.6 + lifeRatio * 0.4;
  } else if (pType == 4u) { // victoryBurst
    sizeMod = 1.5 - lifeRatio * 0.5;
  } else if (pType == 5u) { // transitionWave
    sizeMod = 1.0 + sin(uniforms.time * 8.0 + particle.position.y * 20.0) * 0.4;
  }

  let size = particle.size * sizeMod * (0.5 + lifeRatio * 0.5);
  var pos = particle.position + corner * size * 0.03;
  pos.x /= uniforms.aspectRatio;

  var output: VertexOutput;
  output.position = vec4f(pos * 2.0 - 1.0, 0.0, 1.0);
  output.color = particle.color * lifeRatio;
  output.uv = corner * 0.5 + 0.5;
  output.particleType = particle.particleType;
  return output;
}

// Rainbow color from value
fn rainbow(t: f32) -> vec3f {
  let r = sin(t * 6.28318 + 0.0) * 0.5 + 0.5;
  let g = sin(t * 6.28318 + 2.094) * 0.5 + 0.5;
  let b = sin(t * 6.28318 + 4.189) * 0.5 + 0.5;
  return vec3f(r, g, b);
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  let dist = length(input.uv - 0.5) * 2.0;
  let pType = u32(input.particleType);
  var alpha = 0.0;
  var color = input.color.rgb;

  if (pType == 0u) { // prismaticSpark - bright rainbow core
    alpha = smoothstep(1.0, 0.0, dist);
    let rainbowShift = rainbow(uniforms.time * 2.0 + dist);
    color = mix(vec3f(1.0), rainbowShift, dist * 0.7);
  } else if (pType == 1u) { // rainbowTrail - flowing rainbow
    alpha = smoothstep(1.0, 0.2, dist) * 0.8;
    color = rainbow(input.uv.x + uniforms.time * 0.5);
  } else if (pType == 2u) { // phaseGlow - phase-colored glow
    alpha = exp(-dist * 2.5) * 0.9;
    color = input.color.rgb * (1.0 + (1.0 - dist) * 0.3);
  } else if (pType == 3u) { // cosmicDust - soft floating dust
    alpha = smoothstep(1.0, 0.3, dist) * 0.5;
    let shimmer = sin(uniforms.time * 5.0 + input.uv.x * 10.0) * 0.3 + 0.7;
    color = input.color.rgb * shimmer;
  } else if (pType == 4u) { // victoryBurst - explosion with rainbow
    alpha = smoothstep(1.0, 0.0, dist);
    color = mix(vec3f(1.0, 0.95, 0.8), rainbow(dist + uniforms.time), 0.5);
  } else if (pType == 5u) { // transitionWave - wave between phases
    let wave = sin(dist * 10.0 - uniforms.time * 5.0) * 0.5 + 0.5;
    alpha = smoothstep(1.0, 0.1, dist) * wave * 0.7;
    color = rainbow(dist * 2.0 + uniforms.time * 0.3);
  }

  alpha *= input.color.a;
  if (alpha < 0.01) {
    discard;
  }

  return vec4f(color, alpha);
}
`;
