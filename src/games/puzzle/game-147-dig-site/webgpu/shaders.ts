/**
 * WGSL Shaders - Dig Site
 * Archaeological / Desert / Earth / Discovery Theme
 * Game #147
 */

export const BACKGROUND_SHADER = /* wgsl */ `
struct Uniforms {
  time: f32,
  resolution: vec2f,
  currentLayer: f32,
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

// Sand/dirt texture
fn sandTexture(uv: vec2f, scale: f32) -> f32 {
  let n1 = noise(uv * scale);
  let n2 = noise(uv * scale * 3.0 + 42.0);
  return n1 * 0.7 + n2 * 0.3;
}

// Stratified layers
fn layerPattern(uv: vec2f, layer: f32) -> f32 {
  let warp = sin(uv.x * 8.0) * 0.02;
  let yPos = uv.y + warp;
  let layerNoise = fbm(vec2f(uv.x * 4.0, layer * 10.0)) * 0.1;
  return smoothstep(0.4, 0.6, fract(yPos * 3.0 + layerNoise + layer * 0.1));
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
  let uv = fragCoord.xy / uniforms.resolution;
  let time = uniforms.time;
  let layer = uniforms.currentLayer;

  // Layer colors (from top to bottom)
  let sandLight = vec3f(0.82, 0.71, 0.55);
  let sandMid = vec3f(0.70, 0.58, 0.45);
  let brownLight = vec3f(0.60, 0.48, 0.38);
  let brownDark = vec3f(0.45, 0.35, 0.25);
  let earthDeep = vec3f(0.30, 0.22, 0.16);

  // Create base gradient with stratified layers
  var color = mix(sandLight, earthDeep, uv.y);

  // Add sand/dirt texture
  let sandNoise = sandTexture(uv, 50.0);
  color *= 0.9 + sandNoise * 0.2;

  // Layer striations
  let striation1 = layerPattern(uv, 0.0) * 0.1;
  let striation2 = layerPattern(uv + vec2f(0.3, 0.0), 1.0) * 0.08;
  let striation3 = layerPattern(uv + vec2f(0.7, 0.0), 2.0) * 0.06;
  color *= 1.0 - striation1 - striation2 - striation3;

  // Add some rocky bits
  let rocks = step(0.85, fbm(uv * 30.0));
  color = mix(color, brownDark, rocks * 0.3);

  // Subtle dust floating animation
  let dust = noise(uv * 20.0 + vec2f(time * 0.2, 0.0));
  let dustFloat = smoothstep(0.7, 0.9, dust) * (1.0 - uv.y) * 0.1;
  color += vec3f(0.8, 0.7, 0.5) * dustFloat;

  // Ambient light from top
  let topLight = smoothstep(0.5, 0.0, uv.y) * 0.15;
  color += vec3f(1.0, 0.95, 0.85) * topLight;

  // Layer indicator glow (brighter as more layers revealed)
  let layerGlow = layer / 6.0;
  let mysteryGlow = smoothstep(0.7, 1.0, uv.y) * layerGlow * 0.2;
  color += vec3f(0.85, 0.65, 0.13) * mysteryGlow;

  // Vignette
  let vignette = 1.0 - length((uv - 0.5) * 1.4);
  color *= smoothstep(0.0, 0.7, vignette);

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
  currentLayer: f32,
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
  if (pType == 0u) { // dustCloud
    size *= 1.0 + (1.0 - lifeRatio) * 2.0;
  } else if (pType == 1u) { // sandParticle
    size *= lifeRatio;
  } else if (pType == 2u) { // artifactGlimmer
    size *= 0.8 + sin(uniforms.time * 8.0) * 0.4;
  } else if (pType == 3u) { // digImpact
    size *= 1.0 + (1.0 - lifeRatio) * 1.5;
  } else if (pType == 4u) { // earthCrumble
    size *= 0.7 + lifeRatio * 0.5;
  } else if (pType == 5u) { // discoverySparkle
    size *= 1.0 + sin(lifeRatio * 10.0) * 0.3;
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

  if (pType == 0u) { // dustCloud - soft expanding cloud
    let cloud = smoothstep(0.5, 0.1, dist);
    alpha *= cloud * input.life * 0.6;

  } else if (pType == 1u) { // sandParticle - grainy dot
    let grain = smoothstep(0.5, 0.3, dist);
    alpha *= grain * input.life;

  } else if (pType == 2u) { // artifactGlimmer - sparkly glint
    let sparkle = smoothstep(0.5, 0.0, dist);
    alpha *= sparkle * sparkle;
    color += vec3f(0.3, 0.2, 0.0) * sparkle;

  } else if (pType == 3u) { // digImpact - impact splash
    let impact = smoothstep(0.5, 0.2, dist);
    alpha *= impact * input.life;

  } else if (pType == 4u) { // earthCrumble - chunky particle
    let angle = atan2(input.uv.y - 0.5, input.uv.x - 0.5);
    let wobble = 0.4 + sin(angle * 5.0) * 0.1;
    let chunk = smoothstep(wobble, wobble - 0.1, dist);
    alpha *= chunk * input.life;

  } else if (pType == 5u) { // discoverySparkle - star burst
    let star = smoothstep(0.5, 0.0, dist);
    let rays = abs(sin(atan2(input.uv.y - 0.5, input.uv.x - 0.5) * 4.0));
    alpha *= star * (0.6 + rays * 0.4);
    color = mix(color, vec3f(1.0, 0.95, 0.7), star * 0.5);
  }

  return vec4f(color, alpha);
}
`;
