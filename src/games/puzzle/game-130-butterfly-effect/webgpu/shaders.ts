/**
 * WGSL Shaders - Butterfly Effect
 * Nature / Butterfly Theme
 * Game #130
 */

export const BACKGROUND_SHADER = /* wgsl */ `
struct Uniforms {
  time: f32,
  resolution: vec2f,
  gameState: f32,
  chainActive: f32,
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

  for (var i = 0; i < 5; i++) {
    value += amplitude * noise(pos);
    pos *= 2.0;
    amplitude *= 0.5;
  }

  return value;
}

// Flower petal pattern
fn flowerPattern(uv: vec2f, center: vec2f, time: f32) -> f32 {
  let d = distance(uv, center);
  let angle = atan2(uv.y - center.y, uv.x - center.x);
  let petals = 5.0;
  let petal = sin(angle * petals + time) * 0.5 + 0.5;
  return smoothstep(0.08, 0.0, d - 0.03 * petal);
}

// Butterfly wing shape
fn butterflyWing(uv: vec2f, center: vec2f, time: f32) -> f32 {
  let p = uv - center;
  let angle = atan2(p.y, abs(p.x));
  let dist = length(p);

  let wingFlap = sin(time * 6.0) * 0.3;
  let wingShape = sin(angle * 2.0 + wingFlap) * 0.5 + 0.5;

  return smoothstep(0.05, 0.02, dist - 0.03 * wingShape);
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  let uv = input.uv;
  let time = uniforms.time;
  let chainPulse = uniforms.chainActive * sin(time * 8.0) * 0.1;

  // Sky gradient with nature feel
  let skyTop = vec3f(0.35, 0.65, 0.95);
  let skyMid = vec3f(0.53, 0.81, 0.92);
  let horizonGreen = vec3f(0.6, 0.98, 0.6);
  let grassGreen = vec3f(0.13, 0.55, 0.13);

  var color: vec3f;
  if (uv.y > 0.7) {
    color = mix(skyMid, skyTop, (uv.y - 0.7) / 0.3);
  } else if (uv.y > 0.3) {
    color = mix(horizonGreen, skyMid, (uv.y - 0.3) / 0.4);
  } else {
    color = mix(grassGreen, horizonGreen, uv.y / 0.3);
  }

  // Grass texture at bottom
  if (uv.y < 0.15) {
    let grassNoise = fbm(uv * vec2f(30.0, 5.0) + vec2f(time * 0.2, 0.0));
    let grassBlades = sin(uv.x * 100.0 + grassNoise * 5.0) * 0.5 + 0.5;
    let grassHeight = 0.15 - 0.05 * grassBlades * grassNoise;
    if (uv.y < grassHeight) {
      let darkGrass = vec3f(0.1, 0.4, 0.1);
      color = mix(darkGrass, grassGreen, grassNoise);
    }
  }

  // Floating clouds
  let cloudUV = uv * vec2f(2.0, 4.0) + vec2f(time * 0.03, 0.0);
  let cloudNoise = fbm(cloudUV);
  let clouds = smoothstep(0.4, 0.7, cloudNoise) * smoothstep(0.4, 0.9, uv.y);
  color = mix(color, vec3f(1.0, 1.0, 1.0), clouds * 0.4);

  // Scattered flower spots in the grass
  for (var i = 0; i < 8; i++) {
    let seed = f32(i) * 1.234;
    let fx = fract(seed * 7.89) * 0.9 + 0.05;
    let fy = fract(seed * 3.21) * 0.12 + 0.02;
    let flowerCenter = vec2f(fx, fy);
    let flower = flowerPattern(uv, flowerCenter, time + seed);
    let flowerColor = mix(
      vec3f(1.0, 0.41, 0.71),
      vec3f(1.0, 0.92, 0.23),
      fract(seed * 5.67)
    );
    color = mix(color, flowerColor, flower * 0.8);
  }

  // Subtle sun rays
  let sunPos = vec2f(0.85, 0.9);
  let sunDist = distance(uv, sunPos);
  let sunGlow = exp(-sunDist * 3.0) * 0.3;
  let sunRays = sin(atan2(uv.y - sunPos.y, uv.x - sunPos.x) * 12.0 + time) * 0.5 + 0.5;
  color += vec3f(1.0, 0.95, 0.8) * sunGlow * (1.0 + sunRays * 0.3);

  // Chain reaction pulse effect
  if (uniforms.chainActive > 0.0) {
    let pulseWave = sin(time * 10.0) * 0.5 + 0.5;
    let energyGlow = vec3f(1.0, 0.92, 0.23) * pulseWave * 0.15 * uniforms.chainActive;
    color += energyGlow;
  }

  // Victory sparkle overlay
  if (uniforms.gameState > 0.5) {
    let sparkle = fbm(uv * 15.0 + time * 2.0);
    let sparkleIntensity = smoothstep(0.6, 0.8, sparkle) * 0.3;
    color += vec3f(1.0, 1.0, 0.8) * sparkleIntensity;
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

  // Size animation based on particle type
  let pType = u32(particle.particleType);
  if (pType == 0u) { // butterflyWing - flutter size
    size *= 0.8 + 0.4 * sin(uniforms.time * 8.0 + particle.position.x * 10.0);
  } else if (pType == 1u) { // pollen - gentle pulse
    size *= 0.9 + 0.2 * sin(uniforms.time * 4.0);
  } else if (pType == 3u) { // sparkle - twinkle
    size *= 0.5 + 0.8 * abs(sin(uniforms.time * 10.0 + particle.position.y * 20.0));
  } else if (pType == 5u) { // bloom - expand
    size *= 1.0 + (1.0 - lifeRatio) * 0.5;
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
    // Butterfly wing - wing shape with pattern
    let angle = atan2(uv.y - 0.5, abs(uv.x - 0.5));
    let wingDist = length(vec2f(abs(uv.x - 0.5), uv.y - 0.5));
    let wingShape = sin(angle * 2.0) * 0.5 + 0.5;
    let wing = smoothstep(0.4, 0.2, wingDist / (0.3 + 0.2 * wingShape));

    // Wing pattern spots
    let spots = sin(uv.x * 15.0) * sin(uv.y * 15.0);
    color = mix(color, color * 0.7, spots * 0.3);
    alpha *= wing;

  } else if (pType == 1u) {
    // Pollen - soft fuzzy circle
    let fuzz = 0.5 + 0.1 * sin(atan2(uv.y - 0.5, uv.x - 0.5) * 8.0);
    alpha *= smoothstep(0.5 * fuzz, 0.2 * fuzz, dist);
    color = mix(color, vec3f(1.0, 1.0, 0.8), 0.3);

  } else if (pType == 2u) {
    // Wind gust - wispy horizontal
    let windShape = abs(uv.y - 0.5) / 0.5;
    let stretch = abs(uv.x - 0.5) / 0.8;
    alpha *= smoothstep(1.0, 0.0, windShape) * smoothstep(1.0, 0.3, stretch);
    alpha *= 0.6;

  } else if (pType == 3u) {
    // Sparkle - star shape
    let angle = atan2(uv.y - 0.5, uv.x - 0.5);
    let rays = abs(sin(angle * 4.0));
    let star = smoothstep(0.5, 0.1, dist * (1.0 + rays * 0.5));
    alpha *= star;
    color = mix(color, vec3f(1.0, 1.0, 1.0), 0.5);

  } else if (pType == 4u) {
    // Leaf - leaf shape
    let leafShape = abs(uv.x - 0.5) / (0.5 - abs(uv.y - 0.5) * 0.8);
    let vein = abs(sin((uv.y - 0.5) * 20.0)) * 0.1;
    alpha *= smoothstep(0.8, 0.3, leafShape) * smoothstep(0.6, 0.0, dist);
    color = mix(color, color * 0.8, vein);

  } else if (pType == 5u) {
    // Bloom - flower petal burst
    let angle = atan2(uv.y - 0.5, uv.x - 0.5);
    let petals = sin(angle * 5.0) * 0.5 + 0.5;
    let flowerDist = dist / (0.3 + 0.15 * petals);
    alpha *= smoothstep(1.0, 0.3, flowerDist);

    // Center glow
    let centerGlow = smoothstep(0.2, 0.0, dist);
    color = mix(color, vec3f(1.0, 0.9, 0.5), centerGlow);
  }

  return vec4f(color, alpha);
}
`;
