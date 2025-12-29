/**
 * WGSL Shaders - Volcano Puzzle
 * Volcanic / Molten / Magma / Fire Theme
 * Game #146
 */

export const BACKGROUND_SHADER = /* wgsl */ `
struct Uniforms {
  time: f32,
  resolution: vec2f,
  heatLevel: f32,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;

// Noise functions
fn hash(p: vec2f) -> f32 {
  var p3 = fract(vec3f(p.x, p.y, p.x) * 0.13);
  p3 += dot(p3, p3.yzx + 3.333);
  return fract((p3.x + p3.y) * p3.z);
}

fn noise(p: vec2f) -> f32 {
  let i = floor(p);
  let f = fract(p);
  let u = f * f * (3.0 - 2.0 * f);

  return mix(
    mix(hash(i + vec2f(0.0, 0.0)), hash(i + vec2f(1.0, 0.0)), u.x),
    mix(hash(i + vec2f(0.0, 1.0)), hash(i + vec2f(1.0, 1.0)), u.x),
    u.y
  );
}

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

// Volcanic magma flow
fn magmaFlow(uv: vec2f, time: f32) -> f32 {
  let flow = vec2f(time * 0.1, time * 0.05);
  var magma = fbm(uv * 3.0 + flow);
  magma += fbm(uv * 6.0 - flow * 0.5) * 0.5;
  return smoothstep(0.3, 0.7, magma);
}

// Heat distortion
fn heatDistort(uv: vec2f, time: f32) -> vec2f {
  let distort = vec2f(
    sin(uv.y * 10.0 + time * 2.0) * 0.003,
    cos(uv.x * 8.0 + time * 1.5) * 0.002
  );
  return distort;
}

// Ember particles (procedural)
fn embers(uv: vec2f, time: f32) -> f32 {
  var glow = 0.0;
  for (var i = 0; i < 8; i++) {
    let fi = f32(i);
    let pos = vec2f(
      fract(sin(fi * 127.1) * 43758.5453),
      fract(sin(fi * 269.5) * 73612.1321)
    );
    let rise = fract(time * 0.1 + fi * 0.1);
    let emberPos = vec2f(pos.x, 1.0 - rise);
    let d = distance(uv, emberPos);
    let size = 0.008 + sin(time * 3.0 + fi) * 0.003;
    glow += smoothstep(size, 0.0, d) * (1.0 - rise) * 0.5;
  }
  return glow;
}

@vertex
fn vertexMain(@builtin(vertex_index) vertexIndex: u32) -> @builtin(position) vec4f {
  var pos = array<vec2f, 6>(
    vec2f(-1.0, -1.0), vec2f(1.0, -1.0), vec2f(-1.0, 1.0),
    vec2f(-1.0, 1.0), vec2f(1.0, -1.0), vec2f(1.0, 1.0)
  );
  return vec4f(pos[vertexIndex], 0.0, 1.0);
}

@fragment
fn fragmentMain(@builtin(position) fragCoord: vec4f) -> @location(0) vec4f {
  var uv = fragCoord.xy / uniforms.resolution;
  let time = uniforms.time;
  let heat = uniforms.heatLevel;

  // Apply heat distortion
  uv += heatDistort(uv, time) * heat;

  // Base volcanic rock gradient
  let rockBase = mix(
    vec3f(0.08, 0.06, 0.05),
    vec3f(0.18, 0.15, 0.12),
    uv.y * 0.5 + 0.5
  );

  // Add rock texture
  let rockNoise = fbm(uv * 8.0);
  var color = rockBase * (0.8 + rockNoise * 0.4);

  // Magma veins
  let magma = magmaFlow(uv, time);
  let magmaColor = mix(
    vec3f(0.8, 0.1, 0.0),
    vec3f(1.0, 0.7, 0.1),
    magma
  );

  // Only show magma based on heat level
  let magmaIntensity = magma * smoothstep(0.0, 0.5, heat);
  color = mix(color, magmaColor, magmaIntensity * 0.6);

  // Magma glow
  color += magmaColor * magmaIntensity * 0.3;

  // Rising embers
  let emberGlow = embers(uv, time) * heat;
  color += vec3f(1.0, 0.5, 0.1) * emberGlow;

  // Heat shimmer overlay
  let shimmer = sin(uv.y * 50.0 + time * 5.0) * 0.02 * heat;
  color += vec3f(0.3, 0.1, 0.0) * shimmer;

  // Vignette
  let vignette = 1.0 - length((uv - 0.5) * 1.2);
  color *= smoothstep(0.0, 0.8, vignette);

  // Volcanic ambient glow from bottom
  let bottomGlow = smoothstep(0.5, 0.0, uv.y) * heat * 0.3;
  color += vec3f(1.0, 0.3, 0.0) * bottomGlow;

  return vec4f(color, 1.0);
}
`;

export const PARTICLE_SHADER = /* wgsl */ `
struct Particle {
  position: vec2f,
  velocity: vec2f,
  color: vec4f,
  life: f32,
  maxLife: f32,
  size: f32,
  particleType: f32,
}

struct Uniforms {
  time: f32,
  resolution: vec2f,
  heatLevel: f32,
}

struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) color: vec4f,
  @location(1) uv: vec2f,
  @location(2) life: f32,
  @location(3) particleType: f32,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;
@group(0) @binding(1) var<storage, read> particles: array<Particle>;

@vertex
fn vertexMain(
  @builtin(vertex_index) vertexIndex: u32,
  @builtin(instance_index) instanceIndex: u32
) -> VertexOutput {
  let particle = particles[instanceIndex];

  let corners = array<vec2f, 6>(
    vec2f(-1.0, -1.0), vec2f(1.0, -1.0), vec2f(-1.0, 1.0),
    vec2f(-1.0, 1.0), vec2f(1.0, -1.0), vec2f(1.0, 1.0)
  );

  let corner = corners[vertexIndex];
  let lifeRatio = particle.life / particle.maxLife;

  var size = particle.size;
  let pType = u32(particle.particleType);

  // Size behavior by type
  if (pType == 0u) { // lavaFlow
    size *= 0.8 + sin(uniforms.time * 3.0) * 0.2;
  } else if (pType == 1u) { // magmaSparkle
    size *= 1.0 + (1.0 - lifeRatio) * 0.5;
  } else if (pType == 2u) { // emberRise
    size *= lifeRatio;
  } else if (pType == 3u) { // heatWave
    size *= 1.0 + sin(lifeRatio * 3.14159) * 0.3;
  } else if (pType == 4u) { // ashFloat
    size *= 0.7 + lifeRatio * 0.3;
  } else if (pType == 5u) { // eruptionBurst
    size *= 1.0 + (1.0 - lifeRatio) * 2.0;
  }

  let worldPos = particle.position + corner * size;
  let clipPos = worldPos * 2.0 - 1.0;

  var output: VertexOutput;
  output.position = vec4f(clipPos.x, -clipPos.y, 0.0, 1.0);
  output.color = particle.color;
  output.uv = corner * 0.5 + 0.5;
  output.life = lifeRatio;
  output.particleType = particle.particleType;

  return output;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  let dist = length(input.uv - vec2f(0.5));
  let pType = u32(input.particleType);

  var alpha = input.color.a;
  var color = input.color.rgb;

  if (pType == 0u) { // lavaFlow - molten blob
    let molten = smoothstep(0.5, 0.2, dist);
    let core = smoothstep(0.3, 0.0, dist);
    alpha *= molten;
    color = mix(color, vec3f(1.0, 0.9, 0.5), core);

  } else if (pType == 1u) { // magmaSparkle - bright flash
    let sparkle = smoothstep(0.5, 0.0, dist);
    alpha *= sparkle * sparkle;
    color += vec3f(0.5, 0.3, 0.1) * sparkle;

  } else if (pType == 2u) { // emberRise - glowing ember
    let ember = smoothstep(0.5, 0.1, dist);
    let glow = smoothstep(0.3, 0.0, dist);
    alpha *= ember * input.life;
    color = mix(color, vec3f(1.0, 0.8, 0.3), glow);

  } else if (pType == 3u) { // heatWave - distortion ring
    let ring = abs(dist - 0.35);
    let wave = smoothstep(0.15, 0.0, ring);
    alpha *= wave * 0.4;

  } else if (pType == 4u) { // ashFloat - soft ash particle
    let ash = smoothstep(0.5, 0.2, dist);
    alpha *= ash * 0.7;
    color *= 0.8 + dist * 0.2;

  } else if (pType == 5u) { // eruptionBurst - explosive
    let burst = smoothstep(0.5, 0.0, dist);
    let core = smoothstep(0.2, 0.0, dist);
    alpha *= burst * input.life;
    color = mix(color, vec3f(1.0, 1.0, 0.7), core);
  }

  return vec4f(color, alpha);
}
`;
