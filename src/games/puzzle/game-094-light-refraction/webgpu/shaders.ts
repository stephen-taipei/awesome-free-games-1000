/**
 * WebGPU Shaders - Light Refraction
 * Light / Prism / Rainbow / Spectral Theme
 * Game #094
 */

export const BACKGROUND_SHADER = /* wgsl */ `
struct Uniforms {
  time: f32,
  width: f32,
  height: f32,
  level: f32,
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

// Hash function
fn hash(p: vec2f) -> f32 {
  return fract(sin(dot(p, vec2f(127.1, 311.7))) * 43758.5453);
}

// Noise
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

// Subtle light grid
fn lightGrid(uv: vec2f, time: f32) -> f32 {
  let scale = 30.0;
  let grid = fract(uv * scale);

  let lineX = smoothstep(0.02, 0.0, grid.x) + smoothstep(0.98, 1.0, grid.x);
  let lineY = smoothstep(0.02, 0.0, grid.y) + smoothstep(0.98, 1.0, grid.y);

  // Subtle pulse
  let pulse = sin(time * 0.5) * 0.2 + 0.8;

  return (lineX + lineY) * 0.03 * pulse;
}

// Ambient light spots (like distant light sources)
fn ambientLights(uv: vec2f, time: f32) -> vec3f {
  var light = vec3f(0.0);

  // Rainbow colored ambient spots
  let colors = array<vec3f, 5>(
    vec3f(1.0, 0.42, 0.42),   // Red
    vec3f(0.99, 0.89, 0.34),  // Yellow
    vec3f(0.28, 0.86, 0.98),  // Cyan
    vec3f(1.0, 0.62, 0.95),   // Pink
    vec3f(0.33, 0.63, 1.0)    // Blue
  );

  for (var i = 0; i < 5; i++) {
    let fi = f32(i);
    let pos = vec2f(
      0.15 + fi * 0.175 + sin(time * 0.3 + fi) * 0.03,
      0.5 + cos(time * 0.4 + fi * 1.5) * 0.3
    );
    let dist = length(uv - pos);
    let glow = exp(-dist * 15.0) * 0.1;
    light += colors[i] * glow;
  }

  return light;
}

// Prismatic shimmer effect
fn prismaticShimmer(uv: vec2f, time: f32) -> vec3f {
  let n = noise(uv * 10.0 + time * 0.5);

  // Map noise to rainbow
  let hue = n * 0.8;
  let saturation = 0.8;
  let lightness = 0.5;

  // Simple HSL to RGB
  let h = hue * 6.0;
  let c = (1.0 - abs(2.0 * lightness - 1.0)) * saturation;
  let x = c * (1.0 - abs(h % 2.0 - 1.0));

  var rgb: vec3f;
  if (h < 1.0) { rgb = vec3f(c, x, 0.0); }
  else if (h < 2.0) { rgb = vec3f(x, c, 0.0); }
  else if (h < 3.0) { rgb = vec3f(0.0, c, x); }
  else if (h < 4.0) { rgb = vec3f(0.0, x, c); }
  else if (h < 5.0) { rgb = vec3f(x, 0.0, c); }
  else { rgb = vec3f(c, 0.0, x); }

  let m = lightness - c / 2.0;
  return (rgb + m) * 0.05;
}

// Dark void background
fn voidBackground(uv: vec2f) -> vec3f {
  let center = vec2f(0.5, 0.5);
  let dist = length(uv - center);

  // Dark gradient from center
  let darkness = 0.05 + dist * 0.03;

  return vec3f(darkness * 0.5, darkness * 0.5, darkness * 0.8);
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  let uv = input.uv;
  let time = uniforms.time;

  // Base dark background
  var color = voidBackground(uv);

  // Light grid
  color += vec3f(0.3, 0.4, 0.5) * lightGrid(uv, time);

  // Ambient rainbow lights
  color += ambientLights(uv, time);

  // Prismatic shimmer
  color += prismaticShimmer(uv, time);

  // Vignette
  let vignette = 1.0 - length(uv - 0.5) * 0.5;
  color *= vignette;

  return vec4f(color, 1.0);
}
`;

export const PARTICLE_SHADER = /* wgsl */ `
struct Uniforms {
  time: f32,
  width: f32,
  height: f32,
  level: f32,
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
  param1: f32,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;
@group(0) @binding(1) var<storage, read> particles: array<Particle>;

struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) uv: vec2f,
  @location(1) life: f32,
  @location(2) particleType: f32,
  @location(3) rotation: f32,
  @location(4) param1: f32,
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

  // Rotate corner
  let cos_r = cos(particle.rotation);
  let sin_r = sin(particle.rotation);
  let rotatedCorner = vec2f(
    corner.x * cos_r - corner.y * sin_r,
    corner.x * sin_r + corner.y * cos_r
  );

  let size = particle.size * lifeRatio;
  let x = (particle.x / uniforms.width) * 2.0 - 1.0;
  let y = 1.0 - (particle.y / uniforms.height) * 2.0;

  let aspectX = size / uniforms.width * 2.0;
  let aspectY = size / uniforms.height * 2.0;

  var output: VertexOutput;
  output.position = vec4f(
    x + rotatedCorner.x * aspectX,
    y + rotatedCorner.y * aspectY,
    0.0, 1.0
  );
  output.uv = corner * 0.5 + 0.5;
  output.life = lifeRatio;
  output.particleType = particle.particleType;
  output.rotation = particle.rotation;
  output.param1 = particle.param1;

  return output;
}

// Rainbow color from parameter
fn rainbowColor(t: f32) -> vec3f {
  let colors = array<vec3f, 5>(
    vec3f(1.0, 0.42, 0.42),   // Red
    vec3f(0.99, 0.89, 0.34),  // Yellow
    vec3f(0.28, 0.86, 0.98),  // Cyan
    vec3f(1.0, 0.62, 0.95),   // Pink
    vec3f(0.33, 0.63, 1.0)    // Blue
  );

  let idx = t * 4.0;
  let i = i32(floor(idx));
  let f = fract(idx);

  let i0 = clamp(i, 0, 4);
  let i1 = clamp(i + 1, 0, 4);

  return mix(colors[i0], colors[i1], f);
}

// Light beam
fn beamShape(uv: vec2f, time: f32, param: f32) -> vec4f {
  let center = vec2f(0.5, 0.5);
  let dist = length(uv - center);

  // Beam core
  let core = smoothstep(0.3, 0.0, dist);
  let pulse = sin(time * 5.0 + param * 10.0) * 0.2 + 0.8;

  // Rainbow color based on param
  let color = rainbowColor(param) * core * pulse;
  let alpha = core;

  return vec4f(color, alpha);
}

// Prism refraction effect
fn prismShape(uv: vec2f, time: f32, rotation: f32) -> vec4f {
  let center = vec2f(0.5, 0.5);

  // Transform to prism local space
  let cos_r = cos(-rotation);
  let sin_r = sin(-rotation);
  let local = vec2f(
    (uv.x - 0.5) * cos_r - (uv.y - 0.5) * sin_r,
    (uv.x - 0.5) * sin_r + (uv.y - 0.5) * cos_r
  );

  // Triangle shape
  let tri = max(abs(local.x), local.y * 0.8 + local.x * 0.5);
  let shape = smoothstep(0.4, 0.3, tri);

  // Prismatic colors
  let rainbow = rainbowColor(fract(time * 0.5 + local.x + 0.5));
  let shine = sin(time * 3.0) * 0.2 + 0.8;

  let color = mix(vec3f(0.9, 0.95, 1.0), rainbow, 0.3) * shape * shine;
  let alpha = shape * 0.8;

  return vec4f(color, alpha);
}

// Spectrum dispersion
fn spectrumShape(uv: vec2f, time: f32, param: f32) -> vec4f {
  let center = vec2f(0.5, 0.5);
  let toCenter = uv - center;
  let dist = length(toCenter);
  let angle = atan2(toCenter.y, toCenter.x);

  // Spectrum bands
  let band = smoothstep(0.3, 0.0, abs(toCenter.y * 4.0));
  let fade = smoothstep(0.5, 0.0, abs(toCenter.x));

  // Rainbow along x axis
  let rainbowT = uv.x;
  let color = rainbowColor(rainbowT) * band * fade;
  let alpha = band * fade;

  return vec4f(color, alpha);
}

// Light spark
fn sparkShape(uv: vec2f, time: f32, param: f32) -> vec4f {
  let center = vec2f(0.5, 0.5);
  let dist = length(uv - center);

  // Bright spark
  let spark = smoothstep(0.25, 0.0, dist);
  let flicker = sin(time * 20.0 + param * 30.0) * 0.3 + 0.7;

  // White with colored halo
  let core = vec3f(1.0, 1.0, 1.0) * spark;
  let halo = rainbowColor(param) * smoothstep(0.4, 0.1, dist) * 0.5;
  let color = core + halo;
  let alpha = spark * flicker;

  return vec4f(color, alpha);
}

// Glow effect
fn glowShape(uv: vec2f, time: f32, param: f32) -> vec4f {
  let center = vec2f(0.5, 0.5);
  let dist = length(uv - center);

  // Soft glow
  let glow = exp(-dist * 4.0);
  let pulse = sin(time * 2.0 + param * 5.0) * 0.2 + 0.8;

  let color = rainbowColor(param) * glow * pulse;
  let alpha = glow * 0.6;

  return vec4f(color, alpha);
}

// Refraction point
fn refractShape(uv: vec2f, time: f32, life: f32, param: f32) -> vec4f {
  let center = vec2f(0.5, 0.5);
  let dist = length(uv - center);

  // Expanding ring
  let ringPos = (1.0 - life) * 0.4;
  let ring = smoothstep(0.08, 0.0, abs(dist - ringPos));

  // Rainbow ring
  let angle = atan2(uv.y - 0.5, uv.x - 0.5);
  let rainbowT = fract(angle / 6.28318 + param);
  let color = rainbowColor(rainbowT) * ring;
  let alpha = ring * life;

  return vec4f(color, alpha);
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  let uv = input.uv;
  let pType = i32(input.particleType);
  let time = uniforms.time;

  var color: vec4f;

  switch(pType) {
    case 0: { // beam
      color = beamShape(uv, time, input.param1);
    }
    case 1: { // prism
      color = prismShape(uv, time, input.rotation);
    }
    case 2: { // spectrum
      color = spectrumShape(uv, time, input.param1);
    }
    case 3: { // spark
      color = sparkShape(uv, time, input.param1);
    }
    case 4: { // glow
      color = glowShape(uv, time, input.param1);
    }
    case 5: { // refract
      color = refractShape(uv, time, input.life, input.param1);
    }
    default: {
      color = vec4f(1.0, 1.0, 1.0, input.life);
    }
  }

  color.a *= input.life;

  return color;
}
`;
