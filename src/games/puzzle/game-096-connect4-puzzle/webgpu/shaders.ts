/**
 * WebGPU Shaders - Connect 4 Puzzle
 * Neon / Board Game / Grid / Discs Theme
 * Game #096
 */

export const BACKGROUND_SHADER = /* wgsl */ `
struct Uniforms {
  time: f32,
  width: f32,
  height: f32,
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

fn gridLines(uv: vec2f, gridSize: f32) -> f32 {
  let grid = uv * gridSize;
  let lineX = smoothstep(0.02, 0.0, abs(fract(grid.x) - 0.5) - 0.48);
  let lineY = smoothstep(0.02, 0.0, abs(fract(grid.y) - 0.5) - 0.48);
  return max(lineX, lineY);
}

fn boardSlots(uv: vec2f, time: f32) -> f32 {
  // Create Connect 4 style circular slots
  let cols = 7.0;
  let rows = 6.0;

  // Scale and center
  let aspect = uniforms.width / uniforms.height;
  var p = (uv - 0.5) * vec2f(aspect, 1.0);
  p = p * 3.0 + vec2f(0.0, 0.3);

  // Find nearest slot
  let slotX = floor(p.x * cols / aspect) / cols * aspect;
  let slotY = floor(p.y * rows) / rows;

  let slotCenterX = slotX + 0.5 / cols * aspect;
  let slotCenterY = slotY + 0.5 / rows;

  let dist = length(p - vec2f(slotCenterX, slotCenterY));
  let slotRadius = 0.12;

  let slot = smoothstep(slotRadius + 0.01, slotRadius - 0.01, dist);

  // Pulsing glow
  let pulse = sin(time * 2.0 + slotX * 10.0 + slotY * 7.0) * 0.5 + 0.5;
  let glow = smoothstep(slotRadius + 0.1, slotRadius, dist) * pulse * 0.3;

  return slot * 0.2 + glow;
}

fn fallingDiscs(uv: vec2f, time: f32) -> vec3f {
  var color = vec3f(0.0);

  for (var i = 0u; i < 5u; i++) {
    let fi = f32(i);
    let seed = hash(vec2f(fi * 123.456, fi * 789.012));

    let x = fract(seed * 7.0 + time * 0.05 * (seed - 0.5));
    let y = fract(seed * 11.0 - time * 0.1 * (0.5 + seed * 0.5));

    let dist = length(uv - vec2f(x, y));
    let radius = 0.02 + seed * 0.02;

    if (dist < radius * 2.0) {
      let intensity = smoothstep(radius, 0.0, dist);
      let isRed = seed > 0.5;
      let discColor = select(
        vec3f(0.976, 0.851, 0.137), // Yellow
        vec3f(0.914, 0.271, 0.376), // Red
        isRed
      );
      color += discColor * intensity * 0.3;
    }
  }

  return color;
}

fn neonFrame(uv: vec2f, time: f32) -> vec3f {
  let border = 0.02;
  let glow = 0.08;

  let distX = min(uv.x, 1.0 - uv.x);
  let distY = min(uv.y, 1.0 - uv.y);
  let dist = min(distX, distY);

  let frameIntensity = smoothstep(border + glow, border, dist);
  let pulse = sin(time * 3.0 + uv.x * 10.0 + uv.y * 10.0) * 0.5 + 0.5;

  let color1 = vec3f(0.914, 0.271, 0.376); // Red
  let color2 = vec3f(0.976, 0.851, 0.137); // Yellow
  let color = mix(color1, color2, uv.x + pulse * 0.2);

  return color * frameIntensity * 0.5;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  let uv = input.uv;
  let time = uniforms.time;

  // Deep blue background
  var color = vec3f(0.086, 0.086, 0.180);

  // Subtle noise texture
  let n = noise(uv * 100.0 + time * 0.5) * 0.03;
  color += n;

  // Grid pattern
  let grid = gridLines(uv, 20.0);
  color += vec3f(0.0, 0.2, 0.3) * grid * 0.1;

  // Board slot pattern
  let slots = boardSlots(uv, time);
  color += vec3f(0.2, 0.4, 0.6) * slots;

  // Floating discs
  color += fallingDiscs(uv, time);

  // Neon frame effect
  color += neonFrame(uv, time);

  // Vignette
  let vignette = 1.0 - length((uv - 0.5) * 1.2);
  color *= smoothstep(0.0, 0.7, vignette);

  // Intensity modulation
  color *= 0.7 + uniforms.intensity * 0.3;

  return vec4f(color, 0.6);
}
`;

export const PARTICLE_SHADER = /* wgsl */ `
struct Uniforms {
  time: f32,
  width: f32,
  height: f32,
  intensity: f32,
}

struct Particle {
  x: f32,
  y: f32,
  vx: f32,
  vy: f32,
  life: f32,
  maxLife: f32,
  size: f32,
  particleType: f32,
  rotation: f32,
  extra: f32,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;
@group(0) @binding(1) var<storage, read> particles: array<Particle>;

struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) uv: vec2f,
  @location(1) life: f32,
  @location(2) particleType: f32,
  @location(3) rotation: f32,
  @location(4) extra: f32,
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

  // Apply rotation
  let cosR = cos(particle.rotation);
  let sinR = sin(particle.rotation);
  let rotated = vec2f(
    corner.x * cosR - corner.y * sinR,
    corner.x * sinR + corner.y * cosR
  );

  let worldPos = vec2f(particle.x, particle.y) + rotated * size;
  let clipPos = vec2f(
    (worldPos.x / uniforms.width) * 2.0 - 1.0,
    1.0 - (worldPos.y / uniforms.height) * 2.0
  );

  var output: VertexOutput;
  output.position = vec4f(clipPos, 0.0, 1.0);
  output.uv = corner * 0.5 + 0.5;
  output.life = lifeRatio;
  output.particleType = particle.particleType;
  output.rotation = particle.rotation;
  output.extra = particle.extra;
  return output;
}

fn discShape(uv: vec2f) -> f32 {
  let dist = length(uv - 0.5);
  let disc = smoothstep(0.5, 0.4, dist);
  let inner = smoothstep(0.3, 0.35, dist);
  return disc * inner; // Ring shape
}

fn solidDisc(uv: vec2f) -> f32 {
  let dist = length(uv - 0.5);
  return smoothstep(0.5, 0.35, dist);
}

fn dropSplash(uv: vec2f, life: f32) -> f32 {
  let center = vec2f(0.5, 0.5);
  let dist = length(uv - center);
  let expandRadius = (1.0 - life) * 0.5;
  let ring = smoothstep(0.05, 0.0, abs(dist - expandRadius));
  return ring * life;
}

fn connectLine(uv: vec2f, rotation: f32) -> f32 {
  // Rotated line
  let center = uv - 0.5;
  let cosR = cos(rotation);
  let sinR = sin(rotation);
  let rotUV = vec2f(
    center.x * cosR + center.y * sinR,
    -center.x * sinR + center.y * cosR
  );

  let line = smoothstep(0.1, 0.0, abs(rotUV.y));
  let cap = smoothstep(0.5, 0.4, abs(rotUV.x));
  return line * cap;
}

fn sparkShape(uv: vec2f, time: f32) -> f32 {
  let center = uv - 0.5;
  let dist = length(center);
  let angle = atan2(center.y, center.x);

  let rays = 4.0;
  let star = abs(sin(angle * rays + time * 5.0));
  let core = smoothstep(0.5, 0.0, dist);

  return core * (0.5 + star * 0.5);
}

fn glowShape(uv: vec2f) -> f32 {
  let dist = length(uv - 0.5);
  return smoothstep(0.5, 0.0, dist);
}

fn pulseRing(uv: vec2f, life: f32) -> f32 {
  let dist = length(uv - 0.5);
  let radius = 0.3 + (1.0 - life) * 0.2;
  let ring = smoothstep(0.08, 0.0, abs(dist - radius));
  return ring * life;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  let uv = input.uv;
  let life = input.life;
  let pType = i32(input.particleType);
  let time = uniforms.time;

  var alpha: f32 = 0.0;
  var color: vec3f;

  // Red and Yellow piece colors
  let redColor = vec3f(0.914, 0.271, 0.376);
  let yellowColor = vec3f(0.976, 0.851, 0.137);
  let highlightColor = vec3f(0.306, 0.800, 0.639);
  let whiteColor = vec3f(1.0, 1.0, 1.0);

  switch (pType) {
    case 0: { // disc - falling piece
      alpha = solidDisc(uv) * life;
      let isRed = input.extra > 0.5;
      color = select(yellowColor, redColor, isRed);
      // Add shine
      let shine = smoothstep(0.3, 0.2, length(uv - vec2f(0.35, 0.35)));
      color += whiteColor * shine * 0.3;
    }
    case 1: { // drop - landing splash
      alpha = dropSplash(uv, life);
      let isRed = input.extra > 0.5;
      color = select(yellowColor, redColor, isRed);
    }
    case 2: { // connect - winning line
      alpha = connectLine(uv, input.rotation) * life;
      color = highlightColor;
      // Pulsing glow
      let pulse = sin(time * 10.0) * 0.5 + 0.5;
      color += whiteColor * pulse * 0.3;
    }
    case 3: { // spark - celebration
      alpha = sparkShape(uv, time) * life;
      let colorMix = fract(input.extra * 3.0);
      color = mix(redColor, yellowColor, colorMix);
      color = mix(color, highlightColor, fract(input.extra * 7.0));
    }
    case 4: { // glow - ambient effect
      alpha = glowShape(uv) * life * 0.6;
      let isRed = input.extra > 0.5;
      color = select(yellowColor, redColor, isRed);
    }
    case 5: { // pulse - pulsing rings
      alpha = pulseRing(uv, life);
      color = highlightColor;
    }
    default: {
      alpha = solidDisc(uv) * life;
      color = whiteColor;
    }
  }

  // Apply intensity
  alpha *= uniforms.intensity;

  return vec4f(color, alpha);
}
`;
