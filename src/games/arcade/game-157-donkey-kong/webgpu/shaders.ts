/**
 * WebGPU Shaders - Donkey Kong
 * Classic Arcade / Steel Girder / Construction Theme
 * Game #157
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

// Hash for procedural elements
fn hash21(p: vec2f) -> f32 {
  var p3 = fract(vec3f(p.x, p.y, p.x) * 0.1031);
  p3 = p3 + dot(p3, vec3f(p3.y + 33.33, p3.z + 33.33, p3.x + 33.33));
  return fract((p3.x + p3.y) * p3.z);
}

// Noise for grunge
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

// Riveted steel plate pattern
fn steelPlate(uv: vec2f) -> f32 {
  let grid = fract(uv * 10.0);
  let rivet = smoothstep(0.1, 0.08, length(grid - 0.5));
  return rivet * 0.3;
}

// Warning stripes (construction site)
fn warningStripes(uv: vec2f, time: f32) -> f32 {
  let stripe = sin((uv.x - uv.y) * 20.0 + time * 2.0);
  return smoothstep(0.0, 0.1, stripe) * 0.15;
}

// Girder cross-hatching
fn girderPattern(uv: vec2f) -> f32 {
  let diag1 = sin(uv.x * 30.0 + uv.y * 30.0);
  let diag2 = sin(uv.x * 30.0 - uv.y * 30.0);
  let cross = max(smoothstep(0.9, 1.0, diag1), smoothstep(0.9, 1.0, diag2));
  return cross * 0.2;
}

// Blinking warning lights
fn warningLight(uv: vec2f, time: f32, pos: vec2f) -> f32 {
  let dist = length(uv - pos);
  let blink = sin(time * 3.0 + pos.x * 10.0) * 0.5 + 0.5;
  let light = smoothstep(0.03, 0.0, dist) * blink;
  return light;
}

// Ambient glow from below
fn lavaGlow(uv: vec2f, time: f32) -> f32 {
  let n = noise(vec2f(uv.x * 5.0, time * 0.5));
  let glow = (1.0 - uv.y) * 0.3 * (0.5 + n * 0.5);
  return glow * smoothstep(0.3, 0.0, uv.y);
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  let uv = input.uv;
  let time = uniforms.time;

  // Dark construction site background
  var color = vec3f(0.05, 0.05, 0.08);

  // Add subtle steel texture
  let steel = noise(uv * 50.0) * 0.05;
  color += vec3f(steel);

  // Add girder cross-hatch hints
  let girder = girderPattern(uv) * (1.0 - uv.y * 0.5);
  color += vec3f(0.15, 0.08, 0.05) * girder;

  // Warning stripes at edges
  let leftStripe = warningStripes(uv, time) * smoothstep(0.1, 0.0, uv.x);
  let rightStripe = warningStripes(uv, time) * smoothstep(0.9, 1.0, uv.x);
  color += vec3f(1.0, 0.85, 0.0) * (leftStripe + rightStripe);

  // Blinking warning lights
  let light1 = warningLight(uv, time, vec2f(0.05, 0.2));
  let light2 = warningLight(uv, time + 1.5, vec2f(0.95, 0.4));
  let light3 = warningLight(uv, time + 3.0, vec2f(0.05, 0.6));
  let light4 = warningLight(uv, time + 4.5, vec2f(0.95, 0.8));
  color += vec3f(1.0, 0.3, 0.0) * (light1 + light2 + light3 + light4);

  // Ambient orange glow from oil drums/fires
  let fireGlow = lavaGlow(uv, time);
  color += vec3f(1.0, 0.4, 0.1) * fireGlow * 0.3;

  // Steel rivets in corners
  let cornerRivets = steelPlate(uv) * (1.0 - smoothstep(0.0, 0.15, uv.y));
  color += vec3f(0.3, 0.3, 0.35) * cornerRivets;

  // Vignette
  let vignette = 1.0 - length((uv - 0.5) * 1.5);
  color *= smoothstep(0.0, 0.7, vignette);

  // CRT-like scan lines
  let scanLine = sin(uv.y * uniforms.resolution.y * 0.8) * 0.5 + 0.5;
  color *= 0.95 + scanLine * 0.05;

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

  // Type 0: Jump dust puff
  if (particleType == 0) {
    let cloud = 1.0 - smoothstep(0.0, 0.5, dist);
    let noise = sin(input.uv.x * 20.0 + input.uv.y * 20.0 + uniforms.time * 5.0) * 0.2 + 0.8;
    alpha *= cloud * noise * 0.6;
    if (cloud < 0.1) { discard; }
  }
  // Type 1: Barrel roll sparks
  else if (particleType == 1) {
    let spark = 1.0 - dist;
    let flicker = sin(uniforms.time * 30.0 + input.lifeRatio * 20.0) * 0.3 + 0.7;
    alpha *= spark * flicker;
    if (spark < 0.2) { discard; }
  }
  // Type 2: Player hit stars
  else if (particleType == 2) {
    // Star shape
    let angle = atan2(input.uv.y - 0.5, input.uv.x - 0.5);
    let star = cos(angle * 5.0) * 0.3 + 0.7;
    let starShape = smoothstep(star * 0.5, star * 0.4, dist);
    alpha *= starShape;
    if (starShape < 0.1) { discard; }
  }
  // Type 3: Kong throw
  else if (particleType == 3) {
    let burst = 1.0 - smoothstep(0.0, 0.4, dist);
    let ring = 1.0 - abs(dist - 0.3) * 5.0;
    alpha *= max(burst, ring * 0.5) * 0.8;
    if (burst < 0.1 && ring < 0.1) { discard; }
  }
  // Type 4: Princess sparkle
  else if (particleType == 4) {
    let sparkle = 1.0 - dist;
    let twinkle = sin(uniforms.time * 10.0 + dist * 15.0) * 0.4 + 0.6;
    alpha *= sparkle * twinkle;
    if (sparkle < 0.1) { discard; }
  }
  // Type 5: Victory / Game over
  else if (particleType == 5) {
    let circle = 1.0 - smoothstep(0.3, 0.5, dist);
    let pulse = sin(uniforms.time * 8.0 + dist * 10.0) * 0.2 + 0.8;
    alpha *= circle * pulse;
    if (circle < 0.1) { discard; }
  }
  // Default: circular
  else {
    let circle = 1.0 - smoothstep(0.3, 0.5, dist);
    alpha *= circle;
    if (circle < 0.1) { discard; }
  }

  return vec4f(input.color.rgb, alpha);
}
`;
