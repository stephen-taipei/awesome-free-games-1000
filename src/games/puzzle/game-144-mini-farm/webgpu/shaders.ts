/**
 * WGSL Shaders - Mini Farm
 * Farm / Nature / Pastoral Theme
 * Game #144
 */

export const BACKGROUND_SHADER = /* wgsl */ `
struct Uniforms {
  time: f32,
  resolution: vec2f,
  padding: vec2f,
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
    vec2f(1.0, 1.0),
    vec2f(-1.0, -1.0),
    vec2f(1.0, 1.0),
    vec2f(-1.0, 1.0)
  );

  var output: VertexOutput;
  output.position = vec4f(pos[vertexIndex], 0.0, 1.0);
  output.uv = pos[vertexIndex] * 0.5 + 0.5;
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

fn sunRays(uv: vec2f, time: f32) -> f32 {
  let sunPos = vec2f(0.8, 0.9);
  let dir = uv - sunPos;
  let angle = atan2(dir.y, dir.x);
  let dist = length(dir);

  var rays = 0.0;
  rays += sin(angle * 8.0 + time * 0.5) * 0.5 + 0.5;
  rays += sin(angle * 12.0 - time * 0.3) * 0.3 + 0.3;
  rays *= smoothstep(1.2, 0.0, dist);
  rays *= smoothstep(0.0, 0.3, dist);

  return rays * 0.15;
}

fn grass(uv: vec2f, time: f32) -> f32 {
  let p = uv * vec2f(30.0, 15.0);
  let wind = sin(time * 2.0 + uv.x * 10.0) * 0.02;
  let grassHeight = noise(vec2f(p.x, 0.0)) * 0.3;
  let blade = smoothstep(grassHeight, grassHeight - 0.1, uv.y + wind);
  return blade * step(uv.y, 0.15);
}

fn clouds(uv: vec2f, time: f32) -> f32 {
  let cloudUv = uv * vec2f(2.0, 4.0) + vec2f(time * 0.02, 0.0);
  let cloud = fbm(cloudUv);
  return smoothstep(0.4, 0.6, cloud) * smoothstep(0.5, 0.9, uv.y) * 0.3;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  let uv = input.uv;
  let time = uniforms.time;

  // Sky gradient
  let skyTop = vec3f(0.53, 0.81, 0.92);
  let skyBottom = vec3f(0.85, 0.93, 0.97);
  var color = mix(skyBottom, skyTop, pow(uv.y, 0.8));

  // Sun glow
  let sunPos = vec2f(0.8, 0.85);
  let sunDist = length(uv - sunPos);
  let sunGlow = smoothstep(0.25, 0.0, sunDist);
  color += vec3f(1.0, 0.95, 0.8) * sunGlow * 0.6;

  // Sun rays
  let rays = sunRays(uv, time);
  color += vec3f(1.0, 0.95, 0.7) * rays;

  // Clouds
  let cloud = clouds(uv, time);
  color = mix(color, vec3f(1.0, 1.0, 1.0), cloud);

  // Ground gradient
  let groundStart = 0.35;
  if (uv.y < groundStart) {
    let groundUv = uv.y / groundStart;
    let groundColor1 = vec3f(0.18, 0.35, 0.15);
    let groundColor2 = vec3f(0.35, 0.55, 0.20);

    let soilNoise = fbm(uv * 20.0 + time * 0.1);
    var ground = mix(groundColor1, groundColor2, groundUv + soilNoise * 0.2);

    // Field rows
    let rows = sin(uv.x * 40.0) * 0.5 + 0.5;
    ground = mix(ground, ground * 0.85, rows * 0.15 * (1.0 - groundUv));

    color = ground;
  }

  // Grass tufts at horizon
  let grassEffect = grass(uv, time);
  if (uv.y < 0.4 && uv.y > 0.3) {
    let grassColor = vec3f(0.45, 0.65, 0.25);
    color = mix(color, grassColor, grassEffect * 0.5);
  }

  // Warm sunlight tint
  color = mix(color, color * vec3f(1.05, 1.0, 0.95), 0.2);

  // Subtle vignette
  let vignetteCenter = vec2f(0.5, 0.5);
  let vignetteDist = length(uv - vignetteCenter);
  let vignette = 1.0 - smoothstep(0.4, 0.9, vignetteDist) * 0.15;
  color *= vignette;

  return vec4f(color, 1.0);
}
`;

export const PARTICLE_SHADER = /* wgsl */ `
struct Uniforms {
  time: f32,
  resolution: vec2f,
  padding: f32,
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

  // Type-specific size behavior
  let pType = i32(particle.particleType);
  if (pType == 0) { // cropGrow
    size *= smoothstep(0.0, 0.3, lifeRatio) * (1.0 - pow(1.0 - lifeRatio, 2.0));
  } else if (pType == 1) { // harvestSparkle
    size *= sin(lifeRatio * 3.14159) * (1.0 + sin(uniforms.time * 15.0) * 0.2);
  } else if (pType == 2) { // sunRay
    size *= lifeRatio * 0.5 + 0.5;
  } else if (pType == 3) { // leafFloat
    size *= 0.8 + sin(uniforms.time * 3.0 + particle.position.x * 10.0) * 0.2;
  } else if (pType == 4) { // pollenDrift
    size *= lifeRatio;
  } else if (pType == 5) { // seedBurst
    size *= (1.0 - lifeRatio * 0.5);
  }

  let aspect = uniforms.resolution.x / uniforms.resolution.y;
  var pos = particle.position + corner * size * 0.02;
  pos.x /= aspect;
  pos = pos * 2.0 - 1.0;

  var output: VertexOutput;
  output.position = vec4f(pos, 0.0, 1.0);
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
  let dist = length(uv - center) * 2.0;

  var alpha = input.color.a;
  let pType = i32(input.particleType);

  if (pType == 0) { // cropGrow - sprouting leaf shape
    let leafShape = 1.0 - smoothstep(0.0, 0.6, dist);
    let leafTip = smoothstep(0.3, 0.5, uv.y) * (1.0 - abs(uv.x - 0.5) * 3.0);
    alpha *= max(leafShape, leafTip * 0.7) * input.life;
  } else if (pType == 1) { // harvestSparkle - star sparkle
    let angle = atan2(uv.y - 0.5, uv.x - 0.5);
    let star = (sin(angle * 4.0) * 0.5 + 0.5) * 0.3 + 0.7;
    alpha *= (1.0 - dist * 0.8) * star * input.life;
  } else if (pType == 2) { // sunRay - elongated ray
    let rayShape = exp(-dist * dist * 2.0);
    alpha *= rayShape * input.life * 0.6;
  } else if (pType == 3) { // leafFloat - leaf silhouette
    let leafY = abs(uv.y - 0.5) * 2.0;
    let leafX = abs(uv.x - 0.5) * 2.0;
    let leaf = (1.0 - leafX * leafX) * (1.0 - leafY);
    alpha *= smoothstep(0.0, 0.3, leaf) * input.life;
  } else if (pType == 4) { // pollenDrift - soft dot
    alpha *= (1.0 - smoothstep(0.0, 0.5, dist)) * input.life * 0.7;
  } else if (pType == 5) { // seedBurst - seed shape
    let seedShape = (1.0 - dist * 0.7) * (0.8 + (uv.y - 0.3) * 0.4);
    alpha *= max(0.0, seedShape) * input.life;
  }

  if (alpha < 0.01) {
    discard;
  }

  return vec4f(input.color.rgb, alpha);
}
`;
