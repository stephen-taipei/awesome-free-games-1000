/**
 * WebGPU Shaders - Hourglass
 * Time / Sands of Time / Ancient Theme
 * Game #140
 */

export const BACKGROUND_SHADER = /* wgsl */ `
struct Uniforms {
  time: f32,
  aspectRatio: f32,
  intensity: f32,
  padding: f32,
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

fn hash(p: vec2f) -> f32 {
  let k = vec2f(0.3183099, 0.3678794);
  let x = p * k + k.yx;
  return fract(16.0 * k.x * fract(x.x * x.y * (x.x + x.y)));
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
  for (var i = 0; i < 5; i++) {
    value += amplitude * noise(pos);
    pos *= 2.0;
    amplitude *= 0.5;
  }
  return value;
}

// Hourglass shape SDF
fn hourglassSDF(p: vec2f) -> f32 {
  let q = abs(p);
  let pinch = 0.15 + 0.35 * q.y;
  return q.x - pinch;
}

// Sand texture
fn sandTexture(p: vec2f, time: f32) -> f32 {
  var sand = 0.0;
  sand += fbm(p * 8.0 + time * 0.1) * 0.5;
  sand += fbm(p * 16.0 - time * 0.15) * 0.3;
  sand += noise(p * 32.0) * 0.2;
  return sand;
}

// Flowing sand effect
fn flowingSand(uv: vec2f, time: f32) -> f32 {
  let center = vec2f(0.5, 0.5);
  let p = uv - center;

  // Hourglass area
  let hg = hourglassSDF(p * 2.0);
  if (hg > 0.0) { return 0.0; }

  // Sand flow in center
  let centerDist = abs(p.x) * 4.0;
  let flowStrength = smoothstep(0.3, 0.0, centerDist);

  var flow = 0.0;
  for (var i = 0; i < 8; i++) {
    let offset = f32(i) * 0.125;
    let y = fract(p.y * 3.0 + time * 0.5 + offset);
    let grain = smoothstep(0.05, 0.0, abs(y - 0.5));
    flow += grain * flowStrength * 0.2;
  }

  return flow;
}

// Ancient pattern
fn ancientPattern(uv: vec2f, time: f32) -> f32 {
  let p = uv * 6.0;
  let pattern = sin(p.x + time * 0.2) * sin(p.y - time * 0.15);
  return smoothstep(0.7, 1.0, pattern) * 0.3;
}

// Time ripple effect
fn timeRipple(uv: vec2f, time: f32) -> f32 {
  let center = vec2f(0.5, 0.5);
  let dist = length(uv - center);
  let ripple = sin(dist * 20.0 - time * 3.0) * 0.5 + 0.5;
  return ripple * smoothstep(0.5, 0.3, dist) * 0.2;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  let uv = input.uv;
  let time = uniforms.time;
  let intensity = uniforms.intensity;

  // Deep bronze base
  var color = vec3f(0.12, 0.08, 0.04);

  // Ancient wood texture
  let woodGrain = fbm(vec2f(uv.x * 2.0, uv.y * 8.0) + time * 0.02);
  color += vec3f(0.08, 0.05, 0.02) * woodGrain;

  // Hourglass frame glow
  let center = vec2f(0.5, 0.5);
  let p = uv - center;
  let hg = hourglassSDF(p * 2.0);
  let frameGlow = smoothstep(0.05, 0.0, abs(hg)) * 0.4;
  color += vec3f(0.6, 0.45, 0.2) * frameGlow;

  // Sand inside hourglass
  if (hg < 0.0) {
    let sandTex = sandTexture(uv, time);
    let sandColor = mix(
      vec3f(0.8, 0.65, 0.35),
      vec3f(0.95, 0.82, 0.5),
      sandTex
    );
    color = mix(color, sandColor, 0.6 * intensity);

    // Flowing sand particles
    let flow = flowingSand(uv, time);
    color += vec3f(1.0, 0.9, 0.6) * flow * intensity;
  }

  // Ancient decorative pattern
  let pattern = ancientPattern(uv, time);
  color += vec3f(0.5, 0.35, 0.15) * pattern * intensity;

  // Time ripple effect
  let ripple = timeRipple(uv, time);
  color += vec3f(0.3, 0.45, 0.7) * ripple * intensity;

  // Bronze corner ornaments
  let cornerDist = min(
    min(length(uv), length(uv - vec2f(1.0, 0.0))),
    min(length(uv - vec2f(0.0, 1.0)), length(uv - vec2f(1.0, 1.0)))
  );
  let ornament = smoothstep(0.15, 0.1, cornerDist);
  color += vec3f(0.7, 0.5, 0.25) * ornament * 0.3;

  // Vignette
  let vignette = 1.0 - length(p) * 0.8;
  color *= vignette;

  // Golden ambient glow
  let ambientGlow = sin(time * 0.5) * 0.5 + 0.5;
  color += vec3f(0.1, 0.08, 0.03) * ambientGlow * intensity;

  return vec4f(color, 1.0);
}
`;

export const PARTICLE_SHADER = /* wgsl */ `
struct Uniforms {
  time: f32,
  aspectRatio: f32,
  intensity: f32,
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

  var corners = array<vec2f, 4>(
    vec2f(-1.0, -1.0),
    vec2f(1.0, -1.0),
    vec2f(-1.0, 1.0),
    vec2f(1.0, 1.0)
  );

  let corner = corners[vertexIndex];
  let lifeRatio = particle.life / particle.maxLife;

  // Size varies by particle type
  var size = particle.size;
  let pType = u32(particle.particleType);

  if (pType == 0u) { // sandGrain
    size *= 0.6 + 0.4 * lifeRatio;
  } else if (pType == 1u) { // starGlow
    size *= 0.8 + 0.4 * sin(uniforms.time * 8.0 + particle.position.x * 10.0);
  } else if (pType == 2u) { // timeRipple
    size *= 1.0 + (1.0 - lifeRatio) * 2.0;
  } else if (pType == 3u) { // flipSpark
    size *= lifeRatio * 1.5;
  } else if (pType == 4u) { // goldenDust
    size *= 0.7 + 0.3 * sin(uniforms.time * 4.0);
  } else if (pType == 5u) { // collectBurst
    size *= 0.5 + (1.0 - lifeRatio) * 1.5;
  }

  let worldPos = particle.position * 2.0 - 1.0;
  let offset = corner * size * 0.025;

  var output: VertexOutput;
  output.position = vec4f(
    worldPos.x + offset.x / uniforms.aspectRatio,
    worldPos.y + offset.y,
    0.0,
    1.0
  );
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
  let dist = length(uv - center);
  let pType = u32(input.particleType);
  let life = input.life;

  var alpha = 0.0;
  var color = input.color.rgb;

  if (pType == 0u) { // sandGrain - small dots
    alpha = smoothstep(0.5, 0.2, dist) * life;
    let grain = fract(sin(dot(uv, vec2f(12.9898, 78.233))) * 43758.5453);
    color = mix(color, vec3f(1.0, 0.9, 0.7), grain * 0.3);

  } else if (pType == 1u) { // starGlow - star shape with glow
    let angle = atan2(uv.y - 0.5, uv.x - 0.5);
    let points = 5.0;
    let starShape = 0.3 + 0.2 * cos(angle * points);
    alpha = smoothstep(starShape, starShape * 0.5, dist) * life;
    color += vec3f(0.3, 0.25, 0.1) * (1.0 - dist * 2.0);

  } else if (pType == 2u) { // timeRipple - expanding ring
    let ring = abs(dist - 0.35);
    alpha = smoothstep(0.1, 0.0, ring) * life * 0.6;
    color = mix(color, vec3f(0.4, 0.6, 0.9), 0.5);

  } else if (pType == 3u) { // flipSpark - bright sparks
    alpha = smoothstep(0.5, 0.0, dist) * life;
    let spark = pow(1.0 - dist * 2.0, 3.0);
    color += vec3f(1.0, 0.8, 0.4) * spark;

  } else if (pType == 4u) { // goldenDust - soft particles
    alpha = smoothstep(0.5, 0.1, dist) * life * 0.5;
    let shimmer = sin(uniforms.time * 6.0 + dist * 10.0) * 0.5 + 0.5;
    color = mix(color, vec3f(1.0, 0.95, 0.7), shimmer * 0.4);

  } else if (pType == 5u) { // collectBurst - radial burst
    let rays = 8.0;
    let angle = atan2(uv.y - 0.5, uv.x - 0.5);
    let ray = cos(angle * rays) * 0.5 + 0.5;
    alpha = smoothstep(0.5, 0.0, dist) * ray * life;
    color += vec3f(0.5, 0.4, 0.2) * (1.0 - dist);
  }

  alpha *= input.color.a * uniforms.intensity;

  return vec4f(color, alpha);
}
`;
