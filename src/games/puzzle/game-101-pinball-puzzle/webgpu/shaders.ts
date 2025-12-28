/**
 * WebGPU Shaders - Pinball Puzzle
 * Neon Arcade / Retro Pinball Machine Theme
 * Game #101
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

fn arcadeBackground(uv: vec2f, time: f32) -> vec3f {
  // Deep purple gradient
  var color = mix(
    vec3f(0.10, 0.04, 0.19),
    vec3f(0.18, 0.11, 0.31),
    uv.y
  );

  // Scanlines
  let scanline = sin(uv.y * uniforms.height * 2.0) * 0.5 + 0.5;
  color *= 0.9 + scanline * 0.1;

  // CRT vignette
  let vignette = 1.0 - length((uv - 0.5) * 1.5);
  color *= smoothstep(0.0, 0.8, vignette);

  return color;
}

fn neonGrid(uv: vec2f, time: f32) -> vec3f {
  let gridSize = 20.0;
  let grid = uv * gridSize;

  let lineX = abs(fract(grid.x) - 0.5) * 2.0;
  let lineY = abs(fract(grid.y) - 0.5) * 2.0;

  let gridLine = max(
    smoothstep(0.95, 1.0, lineX),
    smoothstep(0.95, 1.0, lineY)
  );

  let pulse = sin(time * 2.0 + uv.x * 10.0 + uv.y * 10.0) * 0.5 + 0.5;
  let neonColor = mix(
    vec3f(1.0, 0.0, 1.0), // Pink
    vec3f(0.0, 1.0, 1.0), // Cyan
    pulse
  );

  return neonColor * gridLine * 0.3;
}

fn starField(uv: vec2f, time: f32) -> vec3f {
  var stars = vec3f(0.0);

  for (var i = 0; i < 30; i++) {
    let seed = f32(i) * 1.234;
    let x = hash(vec2f(seed, 0.0));
    let y = hash(vec2f(seed, 1.0));
    let brightness = hash(vec2f(seed, 2.0));

    let starPos = vec2f(x, y);
    let dist = length(uv - starPos);

    let twinkle = sin(time * 3.0 + seed * 10.0) * 0.5 + 0.5;
    let starGlow = exp(-dist * 300.0) * brightness * twinkle;

    let starColor = mix(
      vec3f(1.0, 1.0, 1.0),
      vec3f(1.0, 0.8, 0.9),
      hash(vec2f(seed, 3.0))
    );

    stars += starColor * starGlow;
  }

  return stars;
}

fn neonBorder(uv: vec2f, time: f32) -> vec3f {
  let border = 0.02;
  var glow = vec3f(0.0);

  // Top and bottom
  let topDist = uv.y;
  let bottomDist = 1.0 - uv.y;
  let leftDist = uv.x;
  let rightDist = 1.0 - uv.x;

  let minDist = min(min(topDist, bottomDist), min(leftDist, rightDist));

  if (minDist < border * 3.0) {
    let intensity = smoothstep(border * 3.0, 0.0, minDist);
    let pulse = sin(time * 4.0 + uv.x * 20.0 + uv.y * 20.0) * 0.3 + 0.7;
    glow = vec3f(1.0, 0.0, 1.0) * intensity * pulse * 0.5;
  }

  return glow;
}

fn floatingLights(uv: vec2f, time: f32) -> vec3f {
  var lights = vec3f(0.0);

  for (var i = 0; i < 5; i++) {
    let seed = f32(i) * 2.345;
    let speed = 0.3 + hash(vec2f(seed, 0.0)) * 0.2;
    let x = fract(hash(vec2f(seed, 1.0)) + time * speed * 0.1);
    let y = fract(hash(vec2f(seed, 2.0)) + sin(time * speed + seed) * 0.1);

    let dist = length(uv - vec2f(x, y));
    let glow = exp(-dist * 30.0) * 0.3;

    let hue = fract(time * 0.1 + seed);
    let lightColor = mix(
      vec3f(1.0, 0.0, 1.0),
      vec3f(0.0, 1.0, 1.0),
      sin(hue * 6.28) * 0.5 + 0.5
    );

    lights += lightColor * glow;
  }

  return lights;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  let uv = input.uv;
  let time = uniforms.time;

  // Base arcade background
  var color = arcadeBackground(uv, time);

  // Neon grid
  color += neonGrid(uv, time);

  // Stars
  color += starField(uv, time) * 0.5;

  // Neon border glow
  color += neonBorder(uv, time);

  // Floating lights
  color += floatingLights(uv, time);

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

  // Type 0: Ball trail - silver/white sparkle
  if (pType == 0) {
    let glow = 1.0 - dist * 2.0;
    let sparkle = sin(angle * 8.0 + uniforms.time * 10.0) * 0.3 + 0.7;
    alpha = max(0.0, glow) * sparkle * input.life;
    color = vec3f(0.9, 0.9, 1.0);
  }
  // Type 1: Bumper hit - green burst
  else if (pType == 1) {
    let ring = smoothstep(0.5, 0.4, dist) * smoothstep(0.1, 0.2, dist);
    let rays = sin(angle * 6.0 + uniforms.time * 5.0) * 0.5 + 0.5;
    alpha = ring * (0.7 + rays * 0.3) * input.life;
    color = vec3f(0.42, 0.80, 0.47);
  }
  // Type 2: Target hit - yellow burst
  else if (pType == 2) {
    let star = 1.0 - dist * 2.0;
    let points = 5.0;
    let starShape = sin(angle * points + uniforms.time * 3.0) * 0.3 + 0.7;
    alpha = max(0.0, star * starShape) * input.life;
    color = vec3f(1.0, 0.85, 0.24);
  }
  // Type 3: Flipper action - red trail
  else if (pType == 3) {
    let trail = (1.0 - dist * 2.0) * smoothstep(0.0, 0.3, dist);
    alpha = max(0.0, trail) * input.life;
    color = vec3f(1.0, 0.42, 0.42);
  }
  // Type 4: Spark - white flash
  else if (pType == 4) {
    let spark = exp(-dist * 4.0);
    alpha = spark * input.life;
    color = vec3f(1.0, 1.0, 1.0);
  }
  // Type 5: Multiball / Victory - rainbow
  else if (pType == 5) {
    let hue = fract(angle / 6.28 + uniforms.time * 0.5);
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
    let glow = 1.0 - dist * 2.0;
    alpha = max(0.0, glow) * input.life;
  }
  else {
    let glow = 1.0 - dist * 2.0;
    alpha = max(0.0, glow) * input.life;
    color = vec3f(1.0, 0.0, 1.0);
  }

  alpha *= uniforms.intensity;
  return vec4f(color, alpha);
}
`;
