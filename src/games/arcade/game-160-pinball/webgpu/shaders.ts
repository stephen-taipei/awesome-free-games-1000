/**
 * WebGPU Shaders - Pinball
 * Arcade / Neon / Chrome-Silver-Orange Theme
 * Game #160
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
  var pos = array<vec2f, 6>(
    vec2f(-1.0, -1.0),
    vec2f(1.0, -1.0),
    vec2f(-1.0, 1.0),
    vec2f(-1.0, 1.0),
    vec2f(1.0, -1.0),
    vec2f(1.0, 1.0)
  );

  var output: VertexOutput;
  output.position = vec4f(pos[vertexIndex], 0.0, 1.0);
  output.uv = pos[vertexIndex] * 0.5 + 0.5;
  return output;
}

fn hash(p: vec2f) -> f32 {
  let h = dot(p, vec2f(127.1, 311.7));
  return fract(sin(h) * 43758.5453);
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

fn metallicSheen(uv: vec2f, time: f32) -> f32 {
  let sweep = sin(time * 0.5 + uv.x * 3.0 + uv.y * 2.0) * 0.5 + 0.5;
  return sweep * sweep * 0.3;
}

fn neonGlow(uv: vec2f, center: vec2f, radius: f32, time: f32) -> f32 {
  let dist = length(uv - center);
  let pulse = sin(time * 3.0) * 0.2 + 0.8;
  let glow = smoothstep(radius, 0.0, dist) * pulse;
  return glow;
}

fn bumperPattern(uv: vec2f, time: f32) -> vec3f {
  var color = vec3f(0.0);

  // Multiple bumper positions
  let bumpers = array<vec2f, 5>(
    vec2f(0.5, 0.25),
    vec2f(0.3, 0.35),
    vec2f(0.7, 0.35),
    vec2f(0.4, 0.45),
    vec2f(0.6, 0.45)
  );

  for (var i = 0u; i < 5u; i++) {
    let phase = f32(i) * 1.256;
    let glow = neonGlow(uv, bumpers[i], 0.08, time + phase);
    let pulse = sin(time * 4.0 + phase) * 0.5 + 0.5;

    // Orange-yellow gradient
    let bumperColor = mix(
      vec3f(1.0, 0.6, 0.1),
      vec3f(1.0, 0.9, 0.3),
      pulse
    );
    color += bumperColor * glow * 0.5;
  }

  return color;
}

fn neonLines(uv: vec2f, time: f32) -> vec3f {
  var color = vec3f(0.0);

  // Horizontal neon lines
  for (var i = 0u; i < 6u; i++) {
    let y = 0.1 + f32(i) * 0.15;
    let dist = abs(uv.y - y);
    let glow = smoothstep(0.01, 0.0, dist);
    let flicker = sin(time * 8.0 + f32(i) * 2.0) * 0.2 + 0.8;

    let lineColor = select(
      vec3f(0.2, 0.9, 1.0),
      vec3f(1.0, 0.2, 0.6),
      i % 2u == 0u
    );

    color += lineColor * glow * flicker * 0.3;
  }

  // Side rails
  let leftRail = smoothstep(0.02, 0.0, abs(uv.x - 0.05));
  let rightRail = smoothstep(0.02, 0.0, abs(uv.x - 0.85));
  let railGlow = (leftRail + rightRail) * (sin(time * 2.0) * 0.3 + 0.7);
  color += vec3f(0.85, 0.7, 0.3) * railGlow * 0.5;

  return color;
}

fn tableReflection(uv: vec2f, time: f32) -> f32 {
  let sweep = sin(time * 0.3 + uv.y * 4.0 + uv.x * 2.0) * 0.5 + 0.5;
  let specular = pow(sweep, 8.0) * 0.15;
  return specular;
}

fn starField(uv: vec2f, time: f32) -> f32 {
  let scaled = uv * 50.0;
  let n = noise(scaled);
  let sparkle = pow(n, 20.0) * (sin(time * 5.0 + n * 100.0) * 0.5 + 0.5);
  return sparkle;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  let uv = input.uv;
  let time = uniforms.time;

  // Base table gradient
  let baseColor = mix(
    vec3f(0.05, 0.05, 0.15),
    vec3f(0.1, 0.08, 0.2),
    uv.y
  );

  var color = baseColor;

  // Metallic table surface
  color += metallicSheen(uv, time) * vec3f(0.3, 0.32, 0.4);

  // Bumper glow effects
  color += bumperPattern(uv, time);

  // Neon decorative lines
  color += neonLines(uv, time);

  // Table reflection
  color += tableReflection(uv, time) * vec3f(1.0, 0.95, 0.9);

  // Star sparkles
  color += starField(uv, time) * vec3f(1.0, 0.9, 0.7);

  // Vignette
  let center = uv - 0.5;
  let vignette = 1.0 - dot(center, center) * 0.8;
  color *= vignette;

  // Level-based intensity
  let intensity = 0.8 + uniforms.level * 0.04;
  color *= intensity;

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
  r: f32,
  g: f32,
  b: f32,
  a: f32,
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
    vec2f(-1.0, 1.0),
    vec2f(-1.0, 1.0),
    vec2f(1.0, -1.0),
    vec2f(1.0, 1.0)
  );

  let corner = corners[vertexIndex];
  let lifeRatio = particle.life / particle.maxLife;

  var size = particle.size;
  let pType = u32(particle.particleType);

  // Size adjustments by type
  if (pType == 0u) { // bumperHit - burst then fade
    size *= (1.0 + (1.0 - lifeRatio) * 2.0) * lifeRatio;
  } else if (pType == 1u) { // targetLit - sparkle
    size *= (0.5 + sin(uniforms.time * 20.0) * 0.5) * lifeRatio;
  } else if (pType == 2u) { // launch - streak
    size *= 1.0 + (1.0 - lifeRatio) * 0.5;
  } else if (pType == 3u) { // flipperHit - flash
    size *= (2.0 - lifeRatio);
  } else if (pType == 4u) { // ballLost - fall
    size *= lifeRatio * 0.8;
  } else if (pType == 5u) { // gameOver - scatter
    size *= 0.5 + lifeRatio * 0.5;
  }

  let worldPos = vec2f(particle.x, particle.y) + corner * size / vec2f(uniforms.width, uniforms.height);

  var output: VertexOutput;
  output.position = vec4f(worldPos * 2.0 - 1.0, 0.0, 1.0);
  output.position.y = -output.position.y;
  output.color = vec4f(particle.r, particle.g, particle.b, particle.a * lifeRatio);
  output.uv = corner * 0.5 + 0.5;
  output.particleType = particle.particleType;
  output.life = lifeRatio;

  return output;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  let uv = input.uv;
  let center = uv - 0.5;
  let dist = length(center);
  let pType = u32(input.particleType);

  var alpha: f32;
  var color = input.color.rgb;

  if (pType == 0u) { // bumperHit - ring burst
    let ring = smoothstep(0.35, 0.4, dist) * smoothstep(0.5, 0.45, dist);
    let core = smoothstep(0.3, 0.0, dist);
    alpha = (ring * 0.8 + core) * input.color.a;
  } else if (pType == 1u) { // targetLit - star sparkle
    let angle = atan2(center.y, center.x);
    let rays = abs(sin(angle * 4.0));
    let star = rays * smoothstep(0.5, 0.1, dist);
    alpha = star * input.color.a;
    color = mix(color, vec3f(1.0), star * 0.3);
  } else if (pType == 2u) { // launch - streak
    let stretch = smoothstep(0.5, 0.0, abs(center.x)) * smoothstep(0.2, 0.0, abs(center.y));
    alpha = stretch * input.color.a;
  } else if (pType == 3u) { // flipperHit - flash
    let flash = smoothstep(0.5, 0.0, dist);
    alpha = flash * input.color.a;
    color = mix(color, vec3f(1.0), flash * 0.5);
  } else if (pType == 4u) { // ballLost - fade
    let fade = smoothstep(0.5, 0.2, dist);
    alpha = fade * input.color.a;
  } else if (pType == 5u) { // gameOver - glow
    let glow = smoothstep(0.5, 0.0, dist);
    alpha = glow * input.color.a;
    // Neon flicker
    color *= 0.8 + sin(input.life * 20.0) * 0.2;
  } else {
    alpha = smoothstep(0.5, 0.0, dist) * input.color.a;
  }

  if (alpha < 0.01) {
    discard;
  }

  return vec4f(color, alpha);
}
`;
