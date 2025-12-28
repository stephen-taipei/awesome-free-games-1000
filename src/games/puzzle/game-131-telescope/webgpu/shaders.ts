/**
 * WGSL Shaders - Telescope
 * Astronomy / Night Sky Theme
 * Game #131
 */

export const BACKGROUND_SHADER = /* wgsl */ `
struct Uniforms {
  time: f32,
  resolution: vec2f,
  gameState: f32,
  telescopeX: f32,
  telescopeY: f32,
  viewRadius: f32,
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
  return fract(sin(dot(p, vec2f(127.1, 311.7))) * 43758.5453);
}

fn hash2(p: vec2f) -> vec2f {
  return vec2f(
    fract(sin(dot(p, vec2f(127.1, 311.7))) * 43758.5453),
    fract(sin(dot(p, vec2f(269.5, 183.3))) * 43758.5453)
  );
}

fn noise(p: vec2f) -> f32 {
  let i = floor(p);
  let f = fract(p);
  let u = f * f * (3.0 - 2.0 * f);

  return mix(
    mix(hash(i + vec2f(0.0, 0.0)), hash(i + vec2f(1.0, 0.0)), u.x),
    mix(hash(i + vec2f(0.0, 1.0)), hash(i + vec2f(1.0, 1.0)), u.x),
    u.y
  );
}

fn fbm(p: vec2f) -> f32 {
  var value = 0.0;
  var amplitude = 0.5;
  var pos = p;

  for (var i = 0; i < 6; i++) {
    value += amplitude * noise(pos);
    pos *= 2.0;
    amplitude *= 0.5;
  }

  return value;
}

// Star field
fn starField(uv: vec2f, time: f32, density: f32) -> f32 {
  let grid = floor(uv * density);
  let gridUV = fract(uv * density);

  let starPos = hash2(grid) * 0.8 + 0.1;
  let dist = distance(gridUV, starPos);

  let twinkle = sin(time * 3.0 + hash(grid) * 6.28) * 0.4 + 0.6;
  let starSize = hash(grid + vec2f(100.0, 200.0)) * 0.02 + 0.005;

  return smoothstep(starSize, starSize * 0.3, dist) * twinkle;
}

// Nebula cloud
fn nebula(uv: vec2f, time: f32) -> vec3f {
  let n1 = fbm(uv * 3.0 + vec2f(time * 0.02, 0.0));
  let n2 = fbm(uv * 4.0 + vec2f(0.0, time * 0.015));
  let n3 = fbm(uv * 2.5 + vec2f(time * 0.01, time * 0.008));

  let purple = vec3f(0.58, 0.44, 0.86);
  let pink = vec3f(0.94, 0.50, 0.80);
  let blue = vec3f(0.25, 0.41, 0.88);

  var color = mix(purple, pink, n1);
  color = mix(color, blue, n2 * 0.6);

  let intensity = smoothstep(0.3, 0.7, n3) * 0.15;
  return color * intensity;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  let uv = input.uv;
  let time = uniforms.time;

  // Deep space gradient
  let deepSpace = vec3f(0.02, 0.02, 0.08);
  let darkBlue = vec3f(0.05, 0.05, 0.15);
  let midBlue = vec3f(0.08, 0.08, 0.22);

  var color = mix(deepSpace, darkBlue, uv.y * 0.5);
  color = mix(color, midBlue, smoothstep(0.3, 0.7, uv.y) * 0.3);

  // Add subtle nebula clouds
  color += nebula(uv, time);

  // Multiple layers of stars
  let stars1 = starField(uv, time, 30.0);
  let stars2 = starField(uv + vec2f(0.5, 0.3), time * 0.8, 50.0) * 0.7;
  let stars3 = starField(uv + vec2f(0.2, 0.7), time * 0.6, 80.0) * 0.4;

  // Star colors
  let starColor1 = vec3f(1.0, 1.0, 0.95);
  let starColor2 = vec3f(0.9, 0.95, 1.0);
  let starColor3 = vec3f(1.0, 0.9, 0.85);

  color += starColor1 * stars1;
  color += starColor2 * stars2;
  color += starColor3 * stars3;

  // Telescope lens effect
  let telescopePos = vec2f(uniforms.telescopeX, 1.0 - uniforms.telescopeY);
  let telescopeDist = distance(uv, telescopePos);
  let viewRadius = uniforms.viewRadius / uniforms.resolution.x;

  // Lens glow
  let lensGlow = exp(-telescopeDist * 8.0 / viewRadius) * 0.15;
  color += vec3f(0.39, 0.58, 0.93) * lensGlow;

  // Inner lens highlight
  let innerGlow = smoothstep(viewRadius * 0.6, viewRadius * 0.2, telescopeDist);
  color += vec3f(0.2, 0.3, 0.5) * innerGlow * 0.1;

  // Victory cosmic explosion
  if (uniforms.gameState > 0.5) {
    let burstCenter = vec2f(0.5, 0.5);
    let burstDist = distance(uv, burstCenter);
    let burstRing = smoothstep(0.3, 0.2, abs(burstDist - fract(time * 0.5) * 0.5));
    let burstGlow = exp(-burstDist * 3.0) * 0.4;

    color += vec3f(1.0, 0.84, 0.0) * (burstRing * 0.3 + burstGlow);

    // Extra victory stars
    let victoryStars = starField(uv, time * 2.0, 100.0);
    color += vec3f(1.0, 1.0, 0.8) * victoryStars * 0.5;
  }

  // Shooting star / comet (random)
  let cometTime = floor(time * 0.1);
  let cometPos = hash2(vec2f(cometTime, 0.0));
  let cometDir = normalize(vec2f(1.0, -0.5));
  let cometProgress = fract(time * 0.3);
  let cometCurrent = cometPos + cometDir * cometProgress * 0.5;
  let cometDist = distance(uv, cometCurrent);

  if (cometProgress < 0.8) {
    let comet = smoothstep(0.02, 0.0, cometDist);
    let tail = smoothstep(0.15, 0.0, cometDist - cometProgress * 0.1) * 0.5;
    color += vec3f(0.8, 0.9, 1.0) * (comet + tail * 0.3);
  }

  return vec4f(color, 1.0);
}
`;

export const PARTICLE_SHADER = /* wgsl */ `
struct Uniforms {
  time: f32,
  resolution: vec2f,
  gameState: f32,
}

struct Particle {
  position: vec2f,
  velocity: vec2f,
  color: vec4f,
  life: f32,
  maxLife: f32,
  size: f32,
  particleType: f32,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;
@group(0) @binding(1) var<storage, read> particles: array<Particle>;

struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) color: vec4f,
  @location(1) uv: vec2f,
  @location(2) life: f32,
  @location(3) particleType: f32,
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

  let lifeRatio = particle.life / particle.maxLife;
  var size = particle.size;

  let pType = u32(particle.particleType);
  if (pType == 0u) { // star - twinkle
    size *= 0.7 + 0.5 * abs(sin(uniforms.time * 5.0 + particle.position.x * 20.0));
  } else if (pType == 1u) { // nebula - pulse
    size *= 1.0 + 0.3 * sin(uniforms.time * 2.0);
  } else if (pType == 2u) { // comet - elongate
    size *= 1.0 + (1.0 - lifeRatio) * 0.5;
  } else if (pType == 3u) { // lens - glow
    size *= 0.8 + 0.4 * sin(uniforms.time * 3.0);
  } else if (pType == 4u) { // discovery - burst
    size *= lifeRatio * 1.5;
  }

  let corner = corners[vertexIndex];
  let worldPos = particle.position + corner * size;
  let clipPos = worldPos * 2.0 - 1.0;

  var output: VertexOutput;
  output.position = vec4f(clipPos.x, -clipPos.y, 0.0, 1.0);
  output.color = particle.color;
  output.uv = corner * 0.5 + 0.5;
  output.life = lifeRatio;
  output.particleType = particle.particleType;

  return output;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  let uv = input.uv;
  let center = vec2f(0.5, 0.5);
  let dist = distance(uv, center);
  let pType = u32(input.particleType);

  var alpha = input.color.a * input.life;
  var color = input.color.rgb;

  if (pType == 0u) {
    // Star - 4-point star shape
    let angle = atan2(uv.y - 0.5, uv.x - 0.5);
    let rays = abs(sin(angle * 2.0));
    let starShape = smoothstep(0.5, 0.1, dist * (1.0 + rays * 0.5));
    alpha *= starShape;

    // Core glow
    let core = smoothstep(0.15, 0.0, dist);
    color = mix(color, vec3f(1.0, 1.0, 1.0), core * 0.5);

  } else if (pType == 1u) {
    // Nebula - soft cloud
    let cloudDist = dist + sin(atan2(uv.y - 0.5, uv.x - 0.5) * 5.0) * 0.1;
    alpha *= smoothstep(0.6, 0.2, cloudDist);
    alpha *= 0.5;

  } else if (pType == 2u) {
    // Comet - elongated with tail
    let stretch = abs(uv.x - 0.5) / 0.8;
    let vertical = abs(uv.y - 0.5) / 0.3;
    let cometShape = smoothstep(1.0, 0.0, max(stretch, vertical));
    alpha *= cometShape;

    // Tail fade
    let tailFade = 1.0 - (uv.x - 0.5) * 0.5;
    alpha *= tailFade;

  } else if (pType == 3u) {
    // Lens flare - ring with glow
    let ring = abs(dist - 0.35);
    let ringAlpha = smoothstep(0.1, 0.02, ring);
    let centerGlow = smoothstep(0.5, 0.0, dist);
    alpha *= (ringAlpha * 0.6 + centerGlow * 0.4);

  } else if (pType == 4u) {
    // Discovery - bright burst
    let angle = atan2(uv.y - 0.5, uv.x - 0.5);
    let rays = pow(abs(sin(angle * 6.0)), 3.0) * 0.3;
    let burst = smoothstep(0.5 + rays, 0.0, dist);
    alpha *= burst;
    color = mix(color, vec3f(1.0, 1.0, 0.9), smoothstep(0.2, 0.0, dist));

  } else if (pType == 5u) {
    // Cosmic - soft glow
    alpha *= smoothstep(0.5, 0.0, dist);
    alpha *= 0.6;
  }

  return vec4f(color, alpha);
}
`;
