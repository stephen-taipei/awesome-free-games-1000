/**
 * WebGPU Shaders - Ice Puzzle
 * Arctic / Ice Theme
 * Game #128
 */

export const BACKGROUND_SHADER = /* wgsl */ `
struct Uniforms {
  time: f32,
  aspectRatio: f32,
  playerX: f32,
  playerY: f32,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;

struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) uv: vec2f,
}

@vertex
fn vertexMain(@builtin(vertex_index) vertexIndex: u32) -> VertexOutput {
  var positions = array<vec2f, 4>(
    vec2f(-1.0, -1.0),
    vec2f(1.0, -1.0),
    vec2f(-1.0, 1.0),
    vec2f(1.0, 1.0)
  );

  var output: VertexOutput;
  output.position = vec4f(positions[vertexIndex], 0.0, 1.0);
  output.uv = positions[vertexIndex] * 0.5 + 0.5;
  return output;
}

// Hash function for noise
fn hash(p: vec2f) -> f32 {
  var p3 = fract(vec3f(p.x, p.y, p.x) * 0.13);
  p3 += dot(p3, p3.yzx + 3.333);
  return fract((p3.x + p3.y) * p3.z);
}

// Smooth noise
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

// FBM for ice texture
fn fbm(p: vec2f) -> f32 {
  var value = 0.0;
  var amplitude = 0.5;
  var frequency = 1.0;
  var pp = p;

  for (var i = 0; i < 5; i++) {
    value += amplitude * noise(pp * frequency);
    amplitude *= 0.5;
    frequency *= 2.0;
  }

  return value;
}

// Ice crystal pattern
fn iceCrystal(uv: vec2f, time: f32) -> f32 {
  let scale = 8.0;
  let p = uv * scale;

  // Hexagonal pattern for ice crystals
  let angle1 = 0.0;
  let angle2 = 3.14159 / 3.0;
  let angle3 = 2.0 * 3.14159 / 3.0;

  let d1 = abs(dot(fract(p) - 0.5, vec2f(cos(angle1), sin(angle1))));
  let d2 = abs(dot(fract(p) - 0.5, vec2f(cos(angle2), sin(angle2))));
  let d3 = abs(dot(fract(p) - 0.5, vec2f(cos(angle3), sin(angle3))));

  let crystal = min(min(d1, d2), d3);
  return smoothstep(0.05, 0.0, crystal) * 0.3;
}

// Frost pattern
fn frostPattern(uv: vec2f, time: f32) -> f32 {
  let n1 = fbm(uv * 4.0 + time * 0.02);
  let n2 = fbm(uv * 8.0 - time * 0.03);
  let n3 = fbm(uv * 2.0 + vec2f(time * 0.01, 0.0));

  return n1 * 0.5 + n2 * 0.3 + n3 * 0.2;
}

// Aurora effect
fn aurora(uv: vec2f, time: f32) -> vec3f {
  let y = uv.y;

  // Aurora waves
  let wave1 = sin(uv.x * 3.0 + time * 0.5) * 0.1;
  let wave2 = sin(uv.x * 5.0 - time * 0.3) * 0.05;
  let wave3 = sin(uv.x * 2.0 + time * 0.2) * 0.15;

  let auroraY = 0.75 + wave1 + wave2 + wave3;
  let auroraIntensity = smoothstep(0.3, 0.0, abs(y - auroraY)) * 0.3;

  // Aurora colors
  let color1 = vec3f(0.2, 0.9, 0.4);
  let color2 = vec3f(0.4, 0.6, 0.9);
  let color3 = vec3f(0.8, 0.3, 0.6);

  let t = sin(time * 0.3 + uv.x * 2.0) * 0.5 + 0.5;
  var auroraColor = mix(color1, color2, t);
  auroraColor = mix(auroraColor, color3, sin(time * 0.2 + uv.x) * 0.5 + 0.5);

  return auroraColor * auroraIntensity;
}

// Snow particles in background
fn snowParticles(uv: vec2f, time: f32) -> f32 {
  var snow = 0.0;

  for (var i = 0; i < 3; i++) {
    let layer = f32(i);
    let speed = 0.1 + layer * 0.05;
    let scale = 20.0 + layer * 10.0;

    var p = uv * scale;
    p.y -= time * speed;
    p.x += sin(time * 0.2 + layer) * 0.5;

    let cellId = floor(p);
    let cellUv = fract(p);

    let randOffset = vec2f(hash(cellId), hash(cellId + 100.0));
    let snowPos = randOffset * 0.6 + 0.2;

    let d = length(cellUv - snowPos);
    let size = 0.02 + hash(cellId + 200.0) * 0.02;
    snow += smoothstep(size, 0.0, d) * (0.3 + layer * 0.2);
  }

  return snow;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  let uv = input.uv;
  let time = uniforms.time;

  // Base arctic sky gradient
  let skyTop = vec3f(0.1, 0.15, 0.25);
  let skyMid = vec3f(0.3, 0.5, 0.65);
  let skyBottom = vec3f(0.7, 0.85, 0.95);

  var color: vec3f;
  if (uv.y > 0.5) {
    color = mix(skyMid, skyTop, (uv.y - 0.5) * 2.0);
  } else {
    color = mix(skyBottom, skyMid, uv.y * 2.0);
  }

  // Add aurora in sky
  if (uv.y > 0.6) {
    color += aurora(uv, time);
  }

  // Ice/frozen ground effect in lower area
  if (uv.y < 0.4) {
    let groundBlend = 1.0 - uv.y / 0.4;
    let iceColor = vec3f(0.85, 0.93, 0.98);

    // Ice crystal texture
    let crystal = iceCrystal(uv, time);
    let frost = frostPattern(uv, time);

    let groundColor = iceColor + vec3f(crystal * 0.3) + vec3f(frost * 0.1);
    color = mix(color, groundColor, groundBlend * 0.7);
  }

  // Frost vignette
  let frostEdge = fbm(uv * 3.0 + vec2f(time * 0.01, 0.0));
  let edgeDist = min(min(uv.x, 1.0 - uv.x), min(uv.y, 1.0 - uv.y));
  let frostVignette = smoothstep(0.15, 0.0, edgeDist + frostEdge * 0.1);
  color = mix(color, vec3f(0.95, 0.98, 1.0), frostVignette * 0.4);

  // Falling snow
  let snow = snowParticles(uv, time);
  color += vec3f(snow);

  // Player proximity glow (ice cracking effect)
  let playerPos = vec2f(uniforms.playerX, uniforms.playerY);
  let distToPlayer = length(uv - playerPos);
  let playerGlow = exp(-distToPlayer * 5.0) * 0.1;
  color += vec3f(0.6, 0.85, 1.0) * playerGlow;

  // Subtle shimmer
  let shimmer = sin(uv.x * 50.0 + time * 2.0) * sin(uv.y * 50.0 + time * 1.5) * 0.02;
  color += vec3f(shimmer);

  return vec4f(color, 1.0);
}
`;

export const PARTICLE_SHADER = /* wgsl */ `
struct Uniforms {
  time: f32,
  aspectRatio: f32,
  playerX: f32,
  playerY: f32,
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
  colorR: f32,
  colorG: f32,
  colorB: f32,
  rotation: f32,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;
@group(0) @binding(1) var<storage, read> particles: array<Particle>;

struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) uv: vec2f,
  @location(1) color: vec3f,
  @location(2) life: f32,
  @location(3) particleType: f32,
  @location(4) rotation: f32,
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

  let corner = corners[vertexIndex];
  let lifeRatio = particle.life / particle.maxLife;
  let size = particle.size * lifeRatio;

  // Apply rotation for snowflakes
  let rot = particle.rotation + uniforms.time * 0.5;
  let cosR = cos(rot);
  let sinR = sin(rot);
  let rotatedCorner = vec2f(
    corner.x * cosR - corner.y * sinR,
    corner.x * sinR + corner.y * cosR
  );

  var pos = vec2f(particle.x, particle.y);
  pos += rotatedCorner * size;
  pos.x = pos.x * 2.0 - 1.0;
  pos.y = 1.0 - pos.y * 2.0;
  pos.x /= uniforms.aspectRatio;

  var output: VertexOutput;
  output.position = vec4f(pos, 0.0, 1.0);
  output.uv = corner * 0.5 + 0.5;
  output.color = vec3f(particle.colorR, particle.colorG, particle.colorB);
  output.life = lifeRatio;
  output.particleType = particle.particleType;
  output.rotation = particle.rotation;
  return output;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  let uv = input.uv;
  let center = vec2f(0.5, 0.5);
  let dist = length(uv - center) * 2.0;

  var alpha = 0.0;
  var color = input.color;
  let pType = i32(input.particleType);

  if (pType == 0) {
    // Snowflake - hexagonal crystal pattern
    let angle = atan2(uv.y - 0.5, uv.x - 0.5);
    let hexAngle = abs(((angle + 3.14159) / 3.14159 * 3.0) % 1.0 - 0.5) * 2.0;
    let crystal = smoothstep(0.4, 0.3, dist * (0.8 + hexAngle * 0.3));
    let branches = smoothstep(0.15, 0.0, abs(sin(angle * 3.0)) * dist * 0.5);
    alpha = max(crystal, branches) * input.life;
    color = mix(color, vec3f(1.0), 0.3);
  } else if (pType == 1) {
    // Ice shard - elongated crystal
    let elongated = vec2f((uv.x - 0.5) * 0.5, uv.y - 0.5);
    let shardDist = length(elongated) * 2.0;
    alpha = smoothstep(0.5, 0.2, shardDist) * input.life;
    color = mix(color, vec3f(0.8, 0.95, 1.0), 0.4);
  } else if (pType == 2) {
    // Frost particle - soft fuzzy
    alpha = smoothstep(1.0, 0.0, dist) * input.life * 0.7;
    let shimmer = sin(input.rotation * 10.0 + dist * 5.0) * 0.2 + 0.8;
    color *= shimmer;
  } else if (pType == 3) {
    // Crystal sparkle - bright point
    let sparkle = exp(-dist * 5.0);
    let rays = sin(atan2(uv.y - 0.5, uv.x - 0.5) * 4.0) * 0.5 + 0.5;
    alpha = sparkle * (0.7 + rays * 0.3) * input.life;
    color = vec3f(1.0);
  } else if (pType == 4) {
    // Slide trail - ice dust
    let trail = smoothstep(1.0, 0.3, dist);
    let dust = sin(dist * 10.0 + input.rotation) * 0.3 + 0.7;
    alpha = trail * dust * input.life * 0.6;
  } else if (pType == 5) {
    // Aurora particle - ethereal glow
    let aurora = smoothstep(1.0, 0.0, dist) * 0.5;
    let wave = sin(uv.x * 6.28 + input.rotation) * 0.2 + 0.8;
    alpha = aurora * wave * input.life;
  }

  return vec4f(color, alpha);
}
`;
