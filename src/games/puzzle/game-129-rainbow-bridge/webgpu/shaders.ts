/**
 * WebGPU Shaders - Rainbow Bridge
 * Rainbow / Sky Theme
 * Game #129
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

// FBM for clouds
fn fbm(p: vec2f) -> f32 {
  var value = 0.0;
  var amplitude = 0.5;
  var frequency = 1.0;
  var pp = p;

  for (var i = 0; i < 4; i++) {
    value += amplitude * noise(pp * frequency);
    amplitude *= 0.5;
    frequency *= 2.0;
  }

  return value;
}

// Rainbow arc
fn rainbowArc(uv: vec2f, time: f32) -> vec3f {
  let center = vec2f(0.5, 0.2);
  let dist = length(uv - center);

  // Multiple rainbow bands
  let innerRadius = 0.35;
  let bandWidth = 0.03;

  var rainbow = vec3f(0.0);

  for (var i = 0; i < 7; i++) {
    let radius = innerRadius + f32(i) * bandWidth;
    let bandDist = abs(dist - radius);
    let bandIntensity = smoothstep(bandWidth * 0.8, 0.0, bandDist);

    // Rainbow colors (ROYGBIV)
    var color: vec3f;
    if (i == 0) { color = vec3f(0.91, 0.3, 0.24); }      // Red
    else if (i == 1) { color = vec3f(0.9, 0.49, 0.13); } // Orange
    else if (i == 2) { color = vec3f(0.95, 0.77, 0.06); } // Yellow
    else if (i == 3) { color = vec3f(0.18, 0.8, 0.44); }  // Green
    else if (i == 4) { color = vec3f(0.2, 0.6, 0.86); }   // Blue
    else if (i == 5) { color = vec3f(0.61, 0.35, 0.71); } // Indigo
    else { color = vec3f(0.56, 0.27, 0.68); }             // Violet

    // Only show upper arc
    let angle = atan2(uv.y - center.y, uv.x - center.x);
    let arcMask = smoothstep(-0.1, 0.3, angle) * smoothstep(3.24, 2.84, angle);

    rainbow += color * bandIntensity * arcMask * 0.3;
  }

  // Shimmer effect
  let shimmer = sin(dist * 30.0 - time * 2.0) * 0.1 + 0.9;
  rainbow *= shimmer;

  return rainbow;
}

// Cloud pattern
fn clouds(uv: vec2f, time: f32) -> f32 {
  let scrolledUv = vec2f(uv.x + time * 0.02, uv.y);
  let n = fbm(scrolledUv * 3.0);

  // Cloud shapes
  let cloudThreshold = 0.45;
  let cloud = smoothstep(cloudThreshold, cloudThreshold + 0.2, n);

  return cloud;
}

// Sun glow
fn sunGlow(uv: vec2f, time: f32) -> vec3f {
  let sunPos = vec2f(0.85, 0.85);
  let dist = length(uv - sunPos);

  let core = exp(-dist * 15.0) * 0.8;
  let glow = exp(-dist * 5.0) * 0.4;
  let rays = sin(atan2(uv.y - sunPos.y, uv.x - sunPos.x) * 12.0 + time) * 0.1;

  let sunColor = vec3f(1.0, 0.95, 0.7);
  return sunColor * (core + glow + rays * exp(-dist * 3.0));
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  let uv = input.uv;
  let time = uniforms.time;

  // Sky gradient
  let skyTop = vec3f(0.35, 0.65, 0.9);
  let skyMid = vec3f(0.53, 0.81, 0.92);
  let skyBottom = vec3f(0.88, 0.97, 0.98);

  var color: vec3f;
  if (uv.y > 0.5) {
    color = mix(skyMid, skyTop, (uv.y - 0.5) * 2.0);
  } else {
    color = mix(skyBottom, skyMid, uv.y * 2.0);
  }

  // Add sun
  color += sunGlow(uv, time);

  // Add rainbow arc
  color += rainbowArc(uv, time);

  // Add clouds
  let cloudLayer1 = clouds(uv, time);
  let cloudLayer2 = clouds(uv * 1.5 + vec2f(0.3, 0.1), time * 0.7);
  let totalClouds = max(cloudLayer1, cloudLayer2 * 0.7);

  let cloudColor = vec3f(1.0, 1.0, 1.0);
  let cloudShadow = vec3f(0.9, 0.92, 0.95);
  let finalCloud = mix(cloudShadow, cloudColor, smoothstep(0.0, 0.3, totalClouds));
  color = mix(color, finalCloud, totalClouds * 0.8);

  // Ground gradient (bottom)
  if (uv.y < 0.15) {
    let grassBlend = 1.0 - uv.y / 0.15;
    let grassColor = mix(vec3f(0.4, 0.73, 0.42), vec3f(0.5, 0.8, 0.5), uv.x);
    let grassNoise = noise(uv * 50.0) * 0.1;
    color = mix(color, grassColor + grassNoise, grassBlend);
  }

  // Prismatic sparkles
  let sparkleNoise = hash(floor(uv * 100.0) + time * 0.5);
  if (sparkleNoise > 0.995) {
    let sparkleColor = vec3f(
      sin(time * 3.0 + uv.x * 10.0) * 0.5 + 0.5,
      sin(time * 3.0 + uv.x * 10.0 + 2.094) * 0.5 + 0.5,
      sin(time * 3.0 + uv.x * 10.0 + 4.188) * 0.5 + 0.5
    );
    color += sparkleColor * 0.5;
  }

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
  let size = particle.size * (0.5 + lifeRatio * 0.5);

  // Apply rotation
  let rot = particle.rotation + uniforms.time;
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
    // Rainbow arc particle
    let arc = smoothstep(1.0, 0.7, dist) - smoothstep(0.6, 0.3, dist);
    alpha = arc * input.life;
  } else if (pType == 1) {
    // Sparkle - star shape
    let angle = atan2(uv.y - 0.5, uv.x - 0.5);
    let rays = abs(sin(angle * 4.0 + input.rotation)) * 0.3;
    let core = exp(-dist * 4.0);
    alpha = (core + rays * exp(-dist * 2.0)) * input.life;
    color = vec3f(1.0);
  } else if (pType == 2) {
    // Cloud puff - soft
    alpha = smoothstep(1.0, 0.0, dist) * input.life * 0.6;
    color = mix(color, vec3f(1.0), 0.5);
  } else if (pType == 3) {
    // Prism light - rainbow gradient
    let rainbow = vec3f(
      sin(input.rotation + dist * 6.28) * 0.5 + 0.5,
      sin(input.rotation + dist * 6.28 + 2.094) * 0.5 + 0.5,
      sin(input.rotation + dist * 6.28 + 4.188) * 0.5 + 0.5
    );
    color = rainbow;
    alpha = smoothstep(1.0, 0.0, dist) * input.life * 0.8;
  } else if (pType == 4) {
    // Color orb - solid with glow
    let core = smoothstep(0.5, 0.3, dist);
    let glow = smoothstep(1.0, 0.5, dist) * 0.5;
    alpha = (core + glow) * input.life;
  } else if (pType == 5) {
    // Star burst
    let angle = atan2(uv.y - 0.5, uv.x - 0.5);
    let star = abs(sin(angle * 5.0)) * 0.3 + 0.7;
    let starShape = star * exp(-dist * 3.0);
    alpha = starShape * input.life;
    color = mix(color, vec3f(1.0, 1.0, 0.8), 0.3);
  }

  return vec4f(color, alpha);
}
`;
