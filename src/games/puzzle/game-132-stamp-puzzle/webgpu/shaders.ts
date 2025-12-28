/**
 * WebGPU Shaders - Stamp Puzzle
 * Arts & Crafts / Rubber Stamp Theme
 * Game #132
 */

export const BACKGROUND_SHADER = /* wgsl */`
struct Uniforms {
  time: f32,
  aspectRatio: f32,
  stampX: f32,
  stampY: f32,
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

// Paper texture noise
fn hash2(p: vec2f) -> f32 {
  return fract(sin(dot(p, vec2f(127.1, 311.7))) * 43758.5453);
}

fn noise(p: vec2f) -> f32 {
  let i = floor(p);
  let f = fract(p);
  let u = f * f * (3.0 - 2.0 * f);

  return mix(
    mix(hash2(i + vec2f(0.0, 0.0)), hash2(i + vec2f(1.0, 0.0)), u.x),
    mix(hash2(i + vec2f(0.0, 1.0)), hash2(i + vec2f(1.0, 1.0)), u.x),
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
  }

  return value;
}

// Paper fiber texture
fn paperTexture(uv: vec2f) -> f32 {
  let fiber1 = fbm(uv * 50.0);
  let fiber2 = fbm(uv * 100.0 + vec2f(50.0, 50.0));
  return mix(fiber1, fiber2, 0.5) * 0.1 + 0.9;
}

// Grid pattern for craft background
fn gridPattern(uv: vec2f, scale: f32, thickness: f32) -> f32 {
  let grid = fract(uv * scale);
  let lineX = smoothstep(0.0, thickness, grid.x) * smoothstep(1.0, 1.0 - thickness, grid.x);
  let lineY = smoothstep(0.0, thickness, grid.y) * smoothstep(1.0, 1.0 - thickness, grid.y);
  return 1.0 - (1.0 - lineX) * (1.0 - lineY) * 0.15;
}

// Stamp pad effect
fn stampPadGlow(uv: vec2f, center: vec2f, time: f32) -> f32 {
  let dist = distance(uv, center);
  let pulse = sin(time * 2.0) * 0.1 + 0.9;
  return smoothstep(0.15, 0.0, dist) * pulse * 0.3;
}

// Decorative border
fn borderDecoration(uv: vec2f, time: f32) -> f32 {
  let border = 0.02;
  let edgeDist = min(min(uv.x, 1.0 - uv.x), min(uv.y, 1.0 - uv.y));
  let borderMask = smoothstep(0.0, border, edgeDist);

  // Decorative corner stamps
  let cornerDist = min(
    min(length(uv - vec2f(0.05, 0.05)), length(uv - vec2f(0.95, 0.05))),
    min(length(uv - vec2f(0.05, 0.95)), length(uv - vec2f(0.95, 0.95)))
  );
  let corner = smoothstep(0.04, 0.02, cornerDist) * 0.3;

  return (1.0 - borderMask) * 0.2 + corner;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  let uv = input.uv;
  let time = uniforms.time;

  // Paper cream base
  let paperBase = vec3f(1.0, 0.93, 0.82);
  let paperPink = vec3f(0.99, 0.73, 0.62);

  // Create gradient background
  let gradientT = uv.y;
  var color = mix(paperBase, paperPink, gradientT);

  // Add paper texture
  let paper = paperTexture(uv);
  color *= paper;

  // Add subtle grid pattern
  let grid = gridPattern(uv, 20.0, 0.02);
  color *= grid;

  // Add stamp pad glow if stamp is selected
  let stampCenter = vec2f(uniforms.stampX, uniforms.stampY);
  if (stampCenter.x > 0.0 && stampCenter.y > 0.0) {
    let glow = stampPadGlow(uv, stampCenter, time);
    color += vec3f(0.91, 0.30, 0.24) * glow;
  }

  // Add border decoration
  let border = borderDecoration(uv, time);
  color = mix(color, vec3f(0.55, 0.35, 0.20), border);

  // Floating dust particles
  let dust1 = smoothstep(0.01, 0.0, length(fract(uv * 30.0 + time * 0.1) - 0.5));
  let dust2 = smoothstep(0.01, 0.0, length(fract(uv * 25.0 - time * 0.08 + 0.5) - 0.5));
  color += vec3f(1.0, 0.95, 0.9) * (dust1 + dust2) * 0.05;

  // Vignette
  let vignette = 1.0 - smoothstep(0.4, 0.9, length(uv - 0.5) * 1.2);
  color *= mix(0.8, 1.0, vignette);

  return vec4f(color, 1.0);
}
`;

export const PARTICLE_SHADER = /* wgsl */`
struct Uniforms {
  time: f32,
  aspectRatio: f32,
  stampX: f32,
  stampY: f32,
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

  let lifeRatio = particle.life / particle.maxLife;
  var size = particle.size;

  // Size animation based on particle type
  let pType = i32(particle.particleType);
  if (pType == 0) { // inkDrop - splatter effect
    size *= mix(0.5, 1.5, sin(lifeRatio * 3.14159) * 0.5 + 0.5);
  } else if (pType == 1) { // stampPress - bounce in
    size *= 1.0 - pow(1.0 - lifeRatio, 3.0);
  } else if (pType == 2) { // paperFiber
    size *= lifeRatio;
  } else if (pType == 3) { // sparkle
    size *= sin(uniforms.time * 10.0 + particle.position.x * 20.0) * 0.3 + 0.7;
  } else if (pType == 4) { // inkSplash
    size *= mix(0.3, 1.0, lifeRatio);
  } else if (pType == 5) { // sealMark
    size *= smoothstep(0.0, 0.3, lifeRatio) * smoothstep(1.0, 0.7, lifeRatio);
  }

  let corner = corners[vertexIndex];
  var pos = particle.position + corner * size * 0.02;
  pos.x /= uniforms.aspectRatio;

  var output: VertexOutput;
  output.position = vec4f(pos * 2.0 - 1.0, 0.0, 1.0);
  output.color = particle.color;
  output.uv = corner;
  output.particleType = particle.particleType;
  output.life = lifeRatio;

  return output;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  let uv = input.uv;
  let dist = length(uv);
  let pType = i32(input.particleType);

  var alpha = input.color.a;
  var color = input.color.rgb;

  if (pType == 0) { // inkDrop - irregular splatter
    let splatter = 1.0 - smoothstep(0.6, 0.9, dist + sin(atan2(uv.y, uv.x) * 8.0) * 0.2);
    alpha *= splatter * input.life;
  } else if (pType == 1) { // stampPress - square stamp mark
    let squareDist = max(abs(uv.x), abs(uv.y));
    alpha *= (1.0 - smoothstep(0.7, 0.9, squareDist)) * input.life;
    // Add texture
    let tex = sin(uv.x * 20.0) * sin(uv.y * 20.0) * 0.1 + 0.9;
    color *= tex;
  } else if (pType == 2) { // paperFiber - elongated fiber
    let fiberDist = abs(uv.y) + abs(uv.x) * 0.3;
    alpha *= (1.0 - smoothstep(0.3, 0.6, fiberDist)) * input.life * 0.6;
  } else if (pType == 3) { // sparkle - star shape
    let angle = atan2(uv.y, uv.x);
    let star = 0.5 + 0.5 * cos(angle * 4.0);
    let sparkle = (1.0 - dist) * star;
    alpha *= sparkle * 2.0;
  } else if (pType == 4) { // inkSplash - splash pattern
    let splash = 1.0 - smoothstep(0.4, 0.8, dist);
    let droplets = sin(atan2(uv.y, uv.x) * 6.0 + uniforms.time) * 0.3 + 0.7;
    alpha *= splash * droplets * input.life;
  } else if (pType == 5) { // sealMark - circular seal
    let ring = smoothstep(0.6, 0.7, dist) * (1.0 - smoothstep(0.8, 0.9, dist));
    let fill = 1.0 - smoothstep(0.5, 0.6, dist);
    alpha *= (ring * 0.8 + fill * 0.4) * input.life;
  }

  if (alpha < 0.01) {
    discard;
  }

  return vec4f(color, alpha);
}
`;
