/**
 * WGSL Shaders - Bookshelf
 * Library / Study / Warm Wood Theme
 * Game #149
 */

export const BACKGROUND_SHADER = /* wgsl */ `
struct Uniforms {
  time: f32,
  resolution: vec2f,
  warmth: f32,
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
  var p3 = fract(vec3f(p.x, p.y, p.x) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
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

fn woodGrain(uv: vec2f, scale: f32) -> f32 {
  let stretched = vec2f(uv.x * 0.3, uv.y * scale);
  let grain = noise(stretched * 20.0);
  let lines = sin(stretched.y * 50.0 + grain * 5.0) * 0.5 + 0.5;
  return lines * 0.3 + grain * 0.7;
}

fn dustMote(uv: vec2f, time: f32, seed: f32) -> f32 {
  let offset = vec2f(
    sin(time * 0.3 + seed * 6.28) * 0.1,
    cos(time * 0.2 + seed * 3.14) * 0.05 - time * 0.02
  );
  let pos = fract(uv + offset + seed);
  let dist = length(pos - vec2f(0.5));
  return smoothstep(0.02, 0.0, dist) * 0.3;
}

fn lightBeam(uv: vec2f, time: f32) -> f32 {
  // Diagonal light beam from upper right
  let rotated = vec2f(
    uv.x * 0.7 - uv.y * 0.7,
    uv.x * 0.7 + uv.y * 0.7
  );

  let beamCenter = 0.6 + sin(time * 0.5) * 0.05;
  let beam = smoothstep(0.3, 0.0, abs(rotated.x - beamCenter));
  let fade = smoothstep(1.0, 0.0, uv.y);

  return beam * fade * 0.15;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  let uv = input.uv;
  let time = uniforms.time;
  let warmth = uniforms.warmth;

  // Wall background - warm cream
  var color = vec3f(0.92, 0.88, 0.82);

  // Subtle wallpaper pattern
  let pattern = sin(uv.x * 100.0) * sin(uv.y * 100.0) * 0.02;
  color += pattern;

  // Add noise texture
  let wallNoise = noise(uv * 50.0) * 0.03;
  color = mix(color, color * 0.95, wallNoise);

  // Warm light beam from window
  let beam = lightBeam(uv, time);
  color += vec3f(1.0, 0.95, 0.8) * beam * warmth;

  // Floating dust in light
  var dust = 0.0;
  for (var i = 0; i < 5; i++) {
    dust += dustMote(uv * (2.0 + f32(i) * 0.5), time, f32(i) * 0.2);
  }
  color += vec3f(1.0, 0.95, 0.85) * dust * beam * 3.0;

  // Warm ambient glow
  let ambient = 1.0 - length(uv - vec2f(0.8, 0.2)) * 0.5;
  color += vec3f(0.95, 0.85, 0.6) * ambient * 0.08 * warmth;

  // Vignette for cozy feel
  let vignette = 1.0 - length((uv - 0.5) * 1.2);
  color *= smoothstep(0.0, 0.8, vignette);

  // Warm color shift
  color = mix(color, color * vec3f(1.02, 0.98, 0.94), warmth * 0.3);

  return vec4f(color, 1.0);
}
`;

export const PARTICLE_SHADER = /* wgsl */ `
struct Uniforms {
  time: f32,
  resolution: vec2f,
  warmth: f32,
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
  @location(3) life: f32,
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

  var size = particle.size;
  let pType = i32(particle.particleType);

  if (pType == 0) { // dustMote
    size *= 0.8 + sin(uniforms.time * 3.0 + f32(instanceIndex)) * 0.2;
  } else if (pType == 1) { // pageFlutter
    size *= lifeRatio;
  } else if (pType == 2) { // woodShine
    size *= 0.7 + sin(uniforms.time * 5.0) * 0.3;
  } else if (pType == 3) { // selectionGlow
    size *= 1.0 + sin(uniforms.time * 4.0) * 0.15;
  } else if (pType == 4) { // swapTrail
    size *= lifeRatio * 1.2;
  } else if (pType == 5) { // completionSparkle
    size *= 0.8 + sin(uniforms.time * 8.0 + f32(instanceIndex)) * 0.4;
  }

  let worldPos = particle.position + corner * size / uniforms.resolution;
  let clipPos = worldPos * 2.0 - 1.0;

  var output: VertexOutput;
  output.position = vec4f(clipPos.x, -clipPos.y, 0.0, 1.0);
  output.color = particle.color;
  output.uv = corner * 0.5 + 0.5;
  output.particleType = particle.particleType;
  output.life = lifeRatio;

  return output;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  let uv = input.uv;
  let center = vec2f(0.5, 0.5);
  let dist = distance(uv, center);
  let pType = i32(input.particleType);

  var alpha = input.color.a;
  var color = input.color.rgb;

  if (pType == 0) { // dustMote - soft glowing dot
    alpha *= smoothstep(0.5, 0.1, dist) * 0.6;
    color = mix(color, vec3f(1.0, 0.95, 0.85), 0.3);
  } else if (pType == 1) { // pageFlutter - rectangular paper
    let rect = max(abs(uv.x - 0.5), abs(uv.y - 0.5));
    alpha *= smoothstep(0.45, 0.35, rect) * input.life;
  } else if (pType == 2) { // woodShine - elongated highlight
    let stretched = vec2f((uv.x - 0.5) * 2.0, uv.y - 0.5);
    let shimmer = 1.0 - length(stretched);
    alpha *= smoothstep(0.0, 0.5, shimmer) * 0.4;
  } else if (pType == 3) { // selectionGlow - warm aura
    alpha *= smoothstep(0.5, 0.0, dist) * 0.5;
    color = mix(color, vec3f(1.0, 0.9, 0.6), 0.4);
  } else if (pType == 4) { // swapTrail - motion blur
    let trail = 1.0 - dist * 1.5;
    alpha *= smoothstep(0.0, 0.5, trail) * input.life;
  } else if (pType == 5) { // completionSparkle - star burst
    let angle = atan2(uv.y - 0.5, uv.x - 0.5);
    let star = abs(sin(angle * 4.0));
    alpha *= smoothstep(0.5, 0.0, dist) * (0.5 + star * 0.5);
    color = mix(color, vec3f(1.0), 0.3);
  }

  if (alpha < 0.01) {
    discard;
  }

  return vec4f(color, alpha);
}
`;
