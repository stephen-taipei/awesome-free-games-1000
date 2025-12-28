/**
 * WebGPU Shaders - Whac-A-Mole
 * Carnival / Fair / Grass Green and Brown Theme
 * Game #161
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

fn grassTexture(uv: vec2f, time: f32) -> vec3f {
  let baseGreen = vec3f(0.49, 0.78, 0.31);
  let darkGreen = vec3f(0.35, 0.61, 0.2);

  // Wavy grass
  let wave = sin(uv.x * 30.0 + time * 2.0) * 0.02;
  let n1 = noise(uv * 40.0 + vec2f(time * 0.5, 0.0));
  let n2 = noise(uv * 80.0);

  let grassMix = mix(baseGreen, darkGreen, n1 * 0.5 + wave);
  let detail = n2 * 0.08;

  return grassMix + detail;
}

fn dirtPattern(uv: vec2f, holeCenter: vec2f, radius: f32, time: f32) -> vec3f {
  let dist = length(uv - holeCenter);
  let dirtBrown = vec3f(0.55, 0.27, 0.07);
  let dirtDark = vec3f(0.18, 0.09, 0.06);

  // Dirt ring around hole
  let ring = smoothstep(radius * 1.5, radius * 0.8, dist);
  let n = noise(uv * 60.0);

  let dirtColor = mix(dirtBrown, dirtDark, n * 0.3);
  return dirtColor * ring;
}

fn holePositions(index: u32) -> vec2f {
  let row = index / 3u;
  let col = index % 3u;
  let x = 0.2 + f32(col) * 0.3;
  let y = 0.25 + f32(row) * 0.25;
  return vec2f(x, y);
}

fn carnivalLights(uv: vec2f, time: f32) -> vec3f {
  var lights = vec3f(0.0);

  // Border lights
  let edgeDist = min(min(uv.x, 1.0 - uv.x), min(uv.y, 1.0 - uv.y));
  if (edgeDist < 0.03) {
    let pulse = sin(time * 5.0 + uv.x * 20.0 + uv.y * 20.0) * 0.5 + 0.5;
    let idx = u32((uv.x + uv.y) * 10.0) % 4u;

    var lightColor = vec3f(1.0, 0.2, 0.2);
    if (idx == 1u) {
      lightColor = vec3f(0.2, 0.5, 1.0);
    } else if (idx == 2u) {
      lightColor = vec3f(1.0, 0.9, 0.3);
    } else if (idx == 3u) {
      lightColor = vec3f(1.0, 0.5, 0.7);
    }

    lights = lightColor * pulse * smoothstep(0.03, 0.01, edgeDist) * 0.5;
  }

  return lights;
}

fn sunlight(uv: vec2f, time: f32) -> f32 {
  // Sunbeam effect
  let center = vec2f(0.5, 0.0);
  let dir = normalize(uv - center);
  let angle = atan2(dir.y, dir.x);
  let rays = sin(angle * 8.0 + time * 0.5) * 0.5 + 0.5;
  let falloff = 1.0 - length(uv - center) * 0.5;
  return rays * falloff * 0.1;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  let uv = input.uv;
  let time = uniforms.time;

  // Base grass
  var color = grassTexture(uv, time);

  // Draw dirt around holes
  for (var i = 0u; i < 9u; i++) {
    let holePos = holePositions(i);
    let dirt = dirtPattern(uv, holePos, 0.06, time);
    let dirtMask = length(uv - holePos) < 0.1;
    if (dirtMask) {
      color = mix(color, dirt, smoothstep(0.1, 0.05, length(uv - holePos)));
    }
  }

  // Sunlight
  color += sunlight(uv, time) * vec3f(1.0, 0.95, 0.8);

  // Carnival lights
  color += carnivalLights(uv, time);

  // Level-based intensity
  let intensity = 0.85 + uniforms.level * 0.02;
  color *= intensity;

  // Vignette
  let center = uv - 0.5;
  let vignette = 1.0 - dot(center, center) * 0.4;
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
  if (pType == 0u) { // whack - burst stars
    size *= (1.5 - lifeRatio * 0.5) * lifeRatio;
  } else if (pType == 1u) { // bombHit - explosion
    size *= (2.0 - lifeRatio);
  } else if (pType == 2u) { // goldenHit - sparkle
    size *= (0.5 + sin(uniforms.time * 15.0) * 0.3) * lifeRatio;
  } else if (pType == 3u) { // molePopup - dirt
    size *= lifeRatio * 0.7;
  } else if (pType == 4u) { // miss - dust
    size *= 0.6 + (1.0 - lifeRatio) * 0.4;
  } else if (pType == 5u) { // gameOver - confetti
    size *= 0.8 + sin(uniforms.time * 10.0 + particle.x * 20.0) * 0.2;
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

  if (pType == 0u) { // whack - star shape
    let angle = atan2(center.y, center.x);
    let star = abs(sin(angle * 4.0)) * 0.3 + 0.3;
    let starShape = smoothstep(star, star - 0.1, dist);
    alpha = starShape * input.color.a;
    color = mix(color, vec3f(1.0), starShape * 0.3);
  } else if (pType == 1u) { // bombHit - explosion
    let ring = smoothstep(0.3, 0.35, dist) * smoothstep(0.5, 0.45, dist);
    let core = smoothstep(0.3, 0.0, dist);
    alpha = (ring * 0.6 + core) * input.color.a;
  } else if (pType == 2u) { // goldenHit - sparkle
    let angle = atan2(center.y, center.x);
    let rays = pow(abs(sin(angle * 6.0)), 4.0);
    let sparkle = rays * smoothstep(0.5, 0.1, dist);
    alpha = sparkle * input.color.a;
    color = mix(color, vec3f(1.0, 1.0, 0.8), sparkle * 0.5);
  } else if (pType == 3u) { // molePopup - dirt clump
    let n = fract(sin(dot(uv, vec2f(12.9898, 78.233))) * 43758.5453);
    let clump = smoothstep(0.5, 0.2, dist + n * 0.2);
    alpha = clump * input.color.a;
  } else if (pType == 4u) { // miss - dust
    let dust = smoothstep(0.5, 0.0, dist);
    alpha = dust * input.color.a * 0.6;
  } else if (pType == 5u) { // gameOver - confetti
    // Rectangle confetti
    let rect = smoothstep(0.0, 0.1, abs(center.x)) * smoothstep(0.5, 0.4, abs(center.x)) *
               smoothstep(0.0, 0.1, abs(center.y)) * smoothstep(0.3, 0.2, abs(center.y));
    alpha = rect * input.color.a;
  } else {
    alpha = smoothstep(0.5, 0.0, dist) * input.color.a;
  }

  if (alpha < 0.01) {
    discard;
  }

  return vec4f(color, alpha);
}
`;
