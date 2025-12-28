/**
 * WebGPU Shaders - Molecule Connect
 * Science Lab / Chemistry Theme
 * Game #103
 */

export const BACKGROUND_SHADER = `
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
  return fract(sin(dot(p, vec2f(127.1, 311.7))) * 43758.5453);
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

fn labBackground(uv: vec2f, time: f32) -> vec3f {
  // Deep blue lab background
  var color = mix(
    vec3f(0.05, 0.08, 0.15),
    vec3f(0.08, 0.12, 0.22),
    uv.y
  );

  // Subtle gradient variations
  let pulse = sin(time * 0.5 + uv.x * 3.0) * 0.02;
  color += vec3f(0.0, pulse, pulse * 1.5);

  return color;
}

fn hexGrid(uv: vec2f, time: f32) -> f32 {
  let scale = 15.0;
  let p = uv * scale;

  // Hexagonal grid
  let s = vec2f(1.732, 1.0);
  let h = s * 0.5;

  let a = (p % s) - h;
  let b = ((p - h) % s) - h;

  var d: f32;
  if (length(a) < length(b)) {
    d = length(a);
  } else {
    d = length(b);
  }

  // Animated pulse
  let pulse = sin(time * 2.0 + (uv.x + uv.y) * 10.0) * 0.1 + 0.9;

  return smoothstep(0.35, 0.38, d) * pulse * 0.1;
}

fn floatingMolecules(uv: vec2f, time: f32) -> vec3f {
  var molecules = vec3f(0.0);

  for (var i = 0; i < 6; i++) {
    let seed = f32(i) * 1.234;
    let x = fract(hash(vec2f(seed, 0.0)) + time * 0.02);
    let y = fract(hash(vec2f(seed, 1.0)) + sin(time * 0.3 + seed) * 0.1);

    let dist = length(uv - vec2f(x, y));
    let glow = exp(-dist * 40.0) * 0.15;

    // Atom color based on type
    let colorSeed = hash(vec2f(seed, 2.0));
    var atomColor: vec3f;
    if (colorSeed < 0.25) {
      atomColor = vec3f(0.4, 0.4, 0.4); // Carbon
    } else if (colorSeed < 0.5) {
      atomColor = vec3f(1.0, 0.3, 0.3); // Oxygen
    } else if (colorSeed < 0.75) {
      atomColor = vec3f(0.3, 0.3, 1.0); // Nitrogen
    } else {
      atomColor = vec3f(0.9, 0.9, 0.9); // Hydrogen
    }

    molecules += atomColor * glow;
  }

  return molecules;
}

fn electronTrails(uv: vec2f, time: f32) -> f32 {
  var trails = 0.0;

  for (var i = 0; i < 8; i++) {
    let seed = f32(i) * 2.345;
    let cx = hash(vec2f(seed, 0.0)) * 0.6 + 0.2;
    let cy = hash(vec2f(seed, 1.0)) * 0.6 + 0.2;
    let radius = 0.05 + hash(vec2f(seed, 2.0)) * 0.03;
    let speed = 2.0 + hash(vec2f(seed, 3.0)) * 2.0;
    let phase = hash(vec2f(seed, 4.0)) * 6.28318;

    let ex = cx + cos(time * speed + phase) * radius;
    let ey = cy + sin(time * speed + phase) * radius;

    let dist = length(uv - vec2f(ex, ey));
    trails += exp(-dist * 150.0) * 0.3;
  }

  return trails;
}

fn bondLines(uv: vec2f, time: f32) -> f32 {
  var bonds = 0.0;

  for (var i = 0; i < 4; i++) {
    let seed = f32(i) * 3.456;
    let x1 = hash(vec2f(seed, 0.0)) * 0.6 + 0.2;
    let y1 = hash(vec2f(seed, 1.0)) * 0.6 + 0.2;
    let x2 = hash(vec2f(seed, 2.0)) * 0.6 + 0.2;
    let y2 = hash(vec2f(seed, 3.0)) * 0.6 + 0.2;

    // Line distance
    let pa = uv - vec2f(x1, y1);
    let ba = vec2f(x2, y2) - vec2f(x1, y1);
    let h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
    let d = length(pa - ba * h);

    let pulse = sin(time * 3.0 + h * 10.0) * 0.5 + 0.5;
    bonds += smoothstep(0.01, 0.005, d) * pulse * 0.1;
  }

  return bonds;
}

fn labEquipment(uv: vec2f, time: f32) -> f32 {
  // Bubbling beaker effect at bottom
  if (uv.y < 0.15) {
    let bubble = sin(uv.x * 50.0 + time * 5.0) * sin(uv.x * 30.0 - time * 3.0);
    return bubble * 0.1 * (0.15 - uv.y) * 5.0;
  }
  return 0.0;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  let uv = input.uv;
  let time = uniforms.time;

  // Lab background
  var color = labBackground(uv, time);

  // Hexagonal grid
  color += vec3f(0.0, 0.5, 0.3) * hexGrid(uv, time);

  // Floating molecules
  color += floatingMolecules(uv, time);

  // Electron trails
  let electrons = electronTrails(uv, time);
  color += vec3f(0.0, 0.8, 1.0) * electrons;

  // Bond lines
  let bonds = bondLines(uv, time);
  color += vec3f(0.0, 1.0, 0.5) * bonds;

  // Lab bubbles
  let bubbles = labEquipment(uv, time);
  color += vec3f(0.2, 0.8, 0.6) * bubbles;

  // Overall intensity
  color *= uniforms.intensity;

  return vec4f(color, 0.25);
}
`;

export const PARTICLE_SHADER = `
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
  rotation: f32,
  particleType: f32,
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
    vec2f(-0.5, -0.5),
    vec2f(0.5, -0.5),
    vec2f(-0.5, 0.5),
    vec2f(-0.5, 0.5),
    vec2f(0.5, -0.5),
    vec2f(0.5, 0.5)
  );

  let corner = corners[vertexIndex];
  let cos_r = cos(particle.rotation);
  let sin_r = sin(particle.rotation);
  let rotated = vec2f(
    corner.x * cos_r - corner.y * sin_r,
    corner.x * sin_r + corner.y * cos_r
  );

  let lifeRatio = particle.life / particle.maxLife;
  let size = particle.size * (0.5 + lifeRatio * 0.5);

  let worldPos = vec2f(particle.x, particle.y) + rotated * size;
  let clipPos = vec2f(
    (worldPos.x / uniforms.width) * 2.0 - 1.0,
    1.0 - (worldPos.y / uniforms.height) * 2.0
  );

  var output: VertexOutput;
  output.position = vec4f(clipPos, 0.0, 1.0);
  output.uv = corner + 0.5;
  output.life = lifeRatio;
  output.particleType = particle.particleType;
  output.rotation = particle.rotation;
  output.extra = particle.extra;
  return output;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  let uv = input.uv;
  let center = uv - 0.5;
  let dist = length(center);
  let angle = atan2(center.y, center.x);
  let pType = i32(input.particleType);

  var color: vec3f;
  var alpha: f32;

  // Type 0: Electron - Orbiting blue dot
  if (pType == 0) {
    let glow = exp(-dist * 4.0);
    let twinkle = sin(uniforms.time * 20.0 + input.extra * 10.0) * 0.3 + 0.7;
    alpha = glow * twinkle * input.life;
    color = vec3f(0.3, 0.7, 1.0);
  }
  // Type 1: Bond - Green bond formation
  else if (pType == 1) {
    let beam = 1.0 - abs(center.y) * 4.0;
    let pulse = sin(center.x * 20.0 - uniforms.time * 10.0) * 0.3 + 0.7;
    alpha = max(0.0, beam * pulse) * input.life;
    color = vec3f(0.0, 1.0, 0.5);
  }
  // Type 2: Correct - Success glow
  else if (pType == 2) {
    let ring = smoothstep(0.5, 0.3, dist) * smoothstep(0.1, 0.25, dist);
    let pulse = sin(uniforms.time * 6.0) * 0.2 + 0.8;
    alpha = ring * pulse * input.life;
    color = vec3f(0.0, 1.0, 0.3);
  }
  // Type 3: Break - Red dissociation
  else if (pType == 3) {
    let spark = exp(-dist * 3.0);
    let flicker = sin(angle * 6.0 + uniforms.time * 15.0) * 0.5 + 0.5;
    alpha = spark * flicker * input.life;
    color = vec3f(1.0, 0.3, 0.2);
  }
  // Type 4: Reaction - Chemical burst
  else if (pType == 4) {
    let burst = 1.0 - dist * 2.0;
    let rays = sin(angle * 8.0 + uniforms.time * 5.0) * 0.3 + 0.7;
    alpha = max(0.0, burst * rays) * input.life;
    // Gradient from green to blue
    color = mix(vec3f(0.0, 1.0, 0.5), vec3f(0.0, 0.5, 1.0), dist);
  }
  // Type 5: Molecule - Victory celebration
  else if (pType == 5) {
    // Atom-like shape
    let core = exp(-dist * 5.0);
    let orbits = sin(angle * 3.0 + input.rotation) * smoothstep(0.4, 0.2, dist);
    alpha = (core + orbits * 0.5) * input.life;
    // Rainbow molecule colors
    let hue = fract(angle / 6.28318 + uniforms.time * 0.5);
    let h = hue * 6.0;
    let i = floor(h);
    let f = h - i;
    var r: f32; var g: f32; var b: f32;
    if (i == 0.0) { r = 1.0; g = f; b = 0.0; }
    else if (i == 1.0) { r = 1.0 - f; g = 1.0; b = 0.0; }
    else if (i == 2.0) { r = 0.0; g = 1.0; b = f; }
    else if (i == 3.0) { r = 0.0; g = 1.0 - f; b = 1.0; }
    else if (i == 4.0) { r = f; g = 0.0; b = 1.0; }
    else { r = 1.0; g = 0.0; b = 1.0 - f; }
    color = vec3f(r, g, b);
  }
  else {
    let glow = 1.0 - dist * 2.0;
    alpha = max(0.0, glow) * input.life;
    color = vec3f(0.0, 0.8, 0.5);
  }

  alpha *= uniforms.intensity;
  return vec4f(color, alpha);
}
`;
