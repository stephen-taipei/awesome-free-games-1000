/**
 * WGSL Shaders - Spider Web
 * Spider / Night Theme
 * Game #112
 */

export const BACKGROUND_SHADER = /* wgsl */`
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

// Night sky with gradient
fn nightSky(uv: vec2f) -> vec3f {
  let skyTop = vec3f(0.02, 0.02, 0.08);
  let skyBottom = vec3f(0.1, 0.08, 0.15);
  return mix(skyBottom, skyTop, uv.y);
}

// Twinkling stars
fn stars(uv: vec2f, time: f32) -> f32 {
  var brightness = 0.0;
  let scale = 40.0;
  let cell = floor(uv * scale);
  let cellUv = fract(uv * scale);

  let starPos = vec2f(hash(cell), hash(cell + 100.0));
  let dist = distance(cellUv, starPos);

  if (dist < 0.15) {
    let twinkle = sin(time * (2.0 + hash(cell) * 3.0) + hash(cell) * 6.28) * 0.5 + 0.5;
    brightness = (1.0 - dist / 0.15) * (0.3 + twinkle * 0.7);
    brightness *= step(0.7, hash(cell + 50.0));
  }

  return brightness;
}

// Moon with glow
fn moon(uv: vec2f, time: f32) -> vec4f {
  let moonPos = vec2f(0.85, 0.85);
  let moonRadius = 0.08;
  let dist = distance(uv, moonPos);

  // Moon body
  let moonMask = smoothstep(moonRadius, moonRadius - 0.005, dist);
  let moonColor = vec3f(0.95, 0.95, 0.8) * moonMask;

  // Moon glow
  let glowRadius = 0.25;
  let glow = smoothstep(glowRadius, 0.0, dist) * 0.3;
  let glowColor = vec3f(0.8, 0.8, 0.6) * glow;

  // Slight flicker
  let flicker = 0.95 + sin(time * 0.3) * 0.05;

  return vec4f(moonColor + glowColor, moonMask + glow) * flicker;
}

// Atmospheric fog/mist
fn mist(uv: vec2f, time: f32) -> f32 {
  let mistNoise = fbm(uv * 3.0 + vec2f(time * 0.02, 0.0));
  let mistAmount = mistNoise * 0.15 * (1.0 - uv.y);
  return mistAmount;
}

// Subtle web shimmer in background
fn webShimmer(uv: vec2f, time: f32) -> f32 {
  let center = vec2f(0.5, 0.55);
  let dist = distance(uv, center);

  // Radial lines
  let angle = atan2(uv.y - center.y, uv.x - center.x);
  let radial = sin(angle * 12.0 + time * 0.5) * 0.5 + 0.5;

  // Concentric rings
  let rings = sin(dist * 40.0 - time * 1.0) * 0.5 + 0.5;

  // Combine with distance falloff
  let falloff = smoothstep(0.45, 0.1, dist);

  return radial * rings * falloff * 0.03;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  let uv = input.uv;
  let time = uniforms.time;
  let intensity = uniforms.intensity;

  // Night sky base
  var color = nightSky(uv);

  // Add stars
  let starBrightness = stars(uv, time);
  color += vec3f(starBrightness);

  // Add moon
  let moonEffect = moon(uv, time);
  color = mix(color, moonEffect.rgb, moonEffect.a);

  // Add mist
  let mistEffect = mist(uv, time);
  color += vec3f(0.6, 0.6, 0.7) * mistEffect;

  // Add subtle web shimmer
  let shimmer = webShimmer(uv, time) * intensity;
  color += vec3f(0.8, 0.8, 1.0) * shimmer;

  // Vignette effect
  let vignette = 1.0 - smoothstep(0.3, 0.9, distance(uv, vec2f(0.5)));
  color *= 0.7 + vignette * 0.3;

  return vec4f(color, 0.25);
}
`;

export const PARTICLE_SHADER = /* wgsl */`
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
  param1: f32,
  param2: f32,
  param3: f32,
  param4: f32,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;
@group(0) @binding(1) var<storage, read> particles: array<Particle>;

struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) uv: vec2f,
  @location(1) life: f32,
  @location(2) particleType: f32,
  @location(3) param1: f32,
  @location(4) param2: f32,
}

@vertex
fn vertexMain(
  @builtin(vertex_index) vertexIndex: u32,
  @builtin(instance_index) instanceIndex: u32
) -> VertexOutput {
  var corners = array<vec2f, 6>(
    vec2f(-1.0, -1.0),
    vec2f(1.0, -1.0),
    vec2f(-1.0, 1.0),
    vec2f(-1.0, 1.0),
    vec2f(1.0, -1.0),
    vec2f(1.0, 1.0)
  );

  let particle = particles[instanceIndex];
  let corner = corners[vertexIndex];

  let lifeRatio = particle.life / particle.maxLife;
  let size = particle.size * lifeRatio;

  let x = (particle.x / uniforms.width) * 2.0 - 1.0;
  let y = 1.0 - (particle.y / uniforms.height) * 2.0;

  let sizeX = size / uniforms.width * 2.0;
  let sizeY = size / uniforms.height * 2.0;

  var output: VertexOutput;
  output.position = vec4f(x + corner.x * sizeX, y + corner.y * sizeY, 0.0, 1.0);
  output.uv = corner * 0.5 + 0.5;
  output.life = lifeRatio;
  output.particleType = particle.particleType;
  output.param1 = particle.param1;
  output.param2 = particle.param2;

  return output;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  let uv = input.uv;
  let center = vec2f(0.5);
  let dist = distance(uv, center);
  let life = input.life;
  let pType = i32(input.particleType);
  let time = uniforms.time;

  var color: vec3f;
  var alpha: f32;

  if (pType == 0) {
    // Silk thread particle - silvery white
    let thread = 1.0 - abs(uv.y - 0.5) * 2.0;
    let shimmer = sin(uv.x * 20.0 + time * 5.0) * 0.2 + 0.8;
    color = vec3f(0.9, 0.9, 1.0) * shimmer;
    alpha = thread * life * 0.8;

  } else if (pType == 1) {
    // Dewdrop - crystal clear with refraction
    let sphere = 1.0 - smoothstep(0.0, 0.5, dist);
    let highlight = smoothstep(0.3, 0.1, distance(uv, vec2f(0.35, 0.35)));
    let shimmer = sin(time * 3.0 + input.param1 * 10.0) * 0.15 + 0.85;
    color = vec3f(0.8, 0.9, 1.0) * shimmer + vec3f(1.0) * highlight * 0.5;
    alpha = sphere * life * 0.9;

  } else if (pType == 2) {
    // Sparkle - point light
    let core = 1.0 - smoothstep(0.0, 0.2, dist);
    let rays = 1.0 - smoothstep(0.0, 0.5, dist);
    let twinkle = sin(time * 8.0 + input.param1 * 5.0) * 0.5 + 0.5;
    color = vec3f(1.0, 0.98, 0.9);
    alpha = (core + rays * 0.3) * life * twinkle;

  } else if (pType == 3) {
    // Web fragment - geometric
    let webLine = abs(sin(uv.x * 10.0) * sin(uv.y * 10.0));
    let fade = 1.0 - dist * 2.0;
    color = vec3f(0.85, 0.85, 0.9);
    alpha = webLine * fade * life * 0.6;

  } else if (pType == 4) {
    // Spider silhouette - dark
    let body = 1.0 - smoothstep(0.0, 0.4, dist);
    color = vec3f(0.1, 0.1, 0.12);
    alpha = body * life * 0.9;

  } else {
    // Glow - soft ambient
    let glow = 1.0 - smoothstep(0.0, 0.5, dist);
    let pulse = sin(time * 2.0 + input.param1) * 0.2 + 0.8;
    color = vec3f(0.6, 0.5, 0.8) * pulse;
    alpha = glow * life * 0.4;
  }

  alpha *= uniforms.intensity;

  return vec4f(color, alpha);
}
`;
