/**
 * WebGPU Shaders - Dart Throw
 * Pub / Darts / Red and Green Theme
 * Game #167
 */

export const BACKGROUND_SHADER = /* wgsl */ `
struct Uniforms {
  time: f32,
  resolution: vec2f,
  level: f32,
  padding: f32,
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
    vec2f(1.0, 1.0),
    vec2f(-1.0, -1.0),
    vec2f(1.0, 1.0),
    vec2f(-1.0, 1.0)
  );

  var output: VertexOutput;
  output.position = vec4f(positions[vertexIndex], 0.0, 1.0);
  output.uv = positions[vertexIndex] * 0.5 + 0.5;
  return output;
}

fn hash(p: vec2f) -> f32 {
  let k = vec2f(0.3183099, 0.3678794);
  let kp = p * k + k.yx;
  return fract(16.0 * k.x * fract(kp.x * kp.y * (kp.x + kp.y)));
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

  for (var i = 0; i < 4; i++) {
    value += amplitude * noise(pos);
    pos *= 2.0;
    amplitude *= 0.5;
  }
  return value;
}

// Wood grain pattern
fn woodGrain(uv: vec2f) -> f32 {
  let grain = sin(uv.y * 80.0 + noise(uv * 15.0) * 4.0);
  let knot = smoothstep(0.1, 0.15, noise(uv * 8.0 + 0.5));
  return grain * 0.15 + knot * 0.1 + 0.8;
}

// Pub light effect
fn pubLight(uv: vec2f, center: vec2f, radius: f32, intensity: f32) -> f32 {
  let d = distance(uv, center);
  return smoothstep(radius, radius * 0.3, d) * intensity;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  let uv = input.uv;
  let time = uniforms.time;

  // Base pub wall color - warm brown
  let wallBase = vec3f(0.25, 0.15, 0.1);
  let wallLight = vec3f(0.4, 0.26, 0.15);

  // Wood paneling effect
  let panelY = floor(uv.y * 8.0) / 8.0;
  let panelNoise = noise(vec2f(uv.x * 2.0, panelY * 10.0));
  let woodColor = mix(wallBase, wallLight, panelNoise * 0.3);

  // Add wood grain
  let grain = woodGrain(uv);
  var bg = woodColor * grain;

  // Dart cabinet frame (darker wood border)
  let frameThickness = 0.08;
  let frameInner = step(frameThickness, uv.x) * step(uv.x, 1.0 - frameThickness) *
                   step(frameThickness, uv.y) * step(uv.y, 1.0 - frameThickness);
  let frameColor = vec3f(0.15, 0.08, 0.05);
  bg = mix(frameColor, bg, frameInner);

  // Frame molding highlight
  let moldingDist = abs(uv.x - frameThickness) + abs(uv.y - frameThickness);
  let moldingDist2 = abs(uv.x - (1.0 - frameThickness)) + abs(uv.y - (1.0 - frameThickness));
  let molding = smoothstep(0.02, 0.0, min(moldingDist, moldingDist2) * 0.5);
  bg += vec3f(0.1, 0.08, 0.05) * molding * (1.0 - frameInner);

  // Overhead pub lights
  let light1 = pubLight(uv, vec2f(0.3, 0.1), 0.4, 0.3);
  let light2 = pubLight(uv, vec2f(0.7, 0.1), 0.4, 0.3);
  let lightColor = vec3f(1.0, 0.9, 0.7);
  bg += lightColor * (light1 + light2);

  // Main spotlight on dartboard area
  let spotCenter = vec2f(0.5, 0.5);
  let spotDist = distance(uv, spotCenter);
  let spotlight = smoothstep(0.5, 0.2, spotDist);
  let spotlightColor = vec3f(1.0, 0.95, 0.85);
  bg += spotlightColor * spotlight * 0.25;

  // Flickering lamp effect
  let flicker = 0.95 + sin(time * 8.0) * 0.02 + sin(time * 13.0) * 0.01;
  bg *= flicker;

  // Dartboard backlight glow
  let boardGlow = smoothstep(0.35, 0.2, spotDist);
  let glowPulse = 0.8 + sin(time * 2.0) * 0.1;
  bg += vec3f(0.9, 0.23, 0.19) * boardGlow * 0.1 * glowPulse;

  // Atmospheric smoke/haze
  let haze = fbm(uv * 3.0 + time * 0.05) * 0.06;
  bg += vec3f(0.8, 0.75, 0.6) * haze;

  // Corner shadows (vignette)
  let vignette = 1.0 - length((uv - 0.5) * 1.5) * 0.3;
  bg *= vignette;

  // Warm pub tint
  bg = mix(bg, bg * vec3f(1.1, 0.95, 0.85), 0.2);

  return vec4f(bg, 0.85);
}
`;

export const PARTICLE_SHADER = /* wgsl */ `
struct Uniforms {
  time: f32,
  resolution: vec2f,
  level: f32,
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

  var corners = array<vec2f, 6>(
    vec2f(-1.0, -1.0),
    vec2f(1.0, -1.0),
    vec2f(1.0, 1.0),
    vec2f(-1.0, -1.0),
    vec2f(1.0, 1.0),
    vec2f(-1.0, 1.0)
  );

  let corner = corners[vertexIndex];
  let lifeRatio = particle.life / particle.maxLife;

  var size = particle.size;
  let pType = i32(particle.particleType);

  // Type-specific size behavior
  if (pType == 0) {
    // Throw - trail
    size *= 0.6 + lifeRatio * 0.6;
  } else if (pType == 1) {
    // Land - impact ripple
    size *= 1.5 - lifeRatio * 0.5;
  } else if (pType == 2) {
    // Bullseye - expanding star
    size *= 2.0 - lifeRatio;
  } else if (pType == 3) {
    // Score - floating number
    size *= 0.8 + lifeRatio * 0.3;
  } else if (pType == 4) {
    // Miss - fade
    size *= lifeRatio * 0.8;
  } else if (pType == 5) {
    // Game over - confetti
    size *= 0.7 + sin(uniforms.time * 8.0 + f32(instanceIndex)) * 0.3;
  }

  let worldPos = particle.position + corner * size * 0.02;
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

  if (pType == 0) {
    // Throw - dart trail
    let elongate = abs(uv.y - 0.5) * 0.5 + abs(uv.x - 0.5);
    let trail = smoothstep(0.6, 0.2, elongate);
    alpha *= trail * input.life;
  } else if (pType == 1) {
    // Land - impact ring
    let ring = smoothstep(0.5, 0.4, dist) - smoothstep(0.3, 0.2, dist);
    let core = smoothstep(0.25, 0.0, dist);
    alpha *= (ring * 0.7 + core) * input.life;
  } else if (pType == 2) {
    // Bullseye - star burst
    let angle = atan2(uv.y - 0.5, uv.x - 0.5);
    let rays = abs(sin(angle * 8.0));
    let star = smoothstep(0.5, 0.1, dist) * (0.4 + rays * 0.6);
    let glow = smoothstep(0.6, 0.0, dist) * 0.5;
    alpha *= (star + glow) * input.life;
    color += vec3f(0.3, 0.2, 0.0) * glow;
  } else if (pType == 3) {
    // Score - glowing number shape
    let glow = smoothstep(0.5, 0.0, dist);
    alpha *= glow * input.life;
    color += vec3f(0.2, 0.15, 0.0) * glow;
  } else if (pType == 4) {
    // Miss - fading puff
    let puff = smoothstep(0.5, 0.0, dist);
    alpha *= puff * input.life * 0.6;
  } else if (pType == 5) {
    // Game over - confetti rectangles
    let rect = step(abs(uv.x - 0.5), 0.3) * step(abs(uv.y - 0.5), 0.4);
    let spin = sin(uniforms.time * 6.0 + input.life * 8.0);
    alpha *= rect * (0.6 + spin * 0.4);
  }

  // Common warm glow
  let warmGlow = smoothstep(0.6, 0.0, dist) * 0.15 * input.life;
  color += vec3f(1.0, 0.9, 0.7) * warmGlow;

  return vec4f(color, alpha);
}
`;
