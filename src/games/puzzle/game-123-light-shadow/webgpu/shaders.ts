/**
 * WebGPU WGSL Shaders - Light Shadow
 * Light & Shadow / Mystery Theme
 * Game #123
 */

export const BACKGROUND_SHADER = /* wgsl */ `
struct Uniforms {
  time: f32,
  resolution: vec2<f32>,
  lightX: f32,
  lightY: f32,
  matchProgress: f32,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;

struct VertexOutput {
  @builtin(position) position: vec4<f32>,
  @location(0) uv: vec2<f32>,
}

@vertex
fn vertexMain(@builtin(vertex_index) vertexIndex: u32) -> VertexOutput {
  var pos = array<vec2<f32>, 4>(
    vec2<f32>(-1.0, -1.0),
    vec2<f32>(1.0, -1.0),
    vec2<f32>(-1.0, 1.0),
    vec2<f32>(1.0, 1.0)
  );

  var output: VertexOutput;
  output.position = vec4<f32>(pos[vertexIndex], 0.0, 1.0);
  output.uv = pos[vertexIndex] * 0.5 + 0.5;
  return output;
}

// Hash function
fn hash(p: vec2<f32>) -> f32 {
  var p3 = fract(vec3<f32>(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

// 2D noise
fn noise(p: vec2<f32>) -> f32 {
  let i = floor(p);
  let f = fract(p);
  let u = f * f * (3.0 - 2.0 * f);

  return mix(
    mix(hash(i + vec2<f32>(0.0, 0.0)), hash(i + vec2<f32>(1.0, 0.0)), u.x),
    mix(hash(i + vec2<f32>(0.0, 1.0)), hash(i + vec2<f32>(1.0, 1.0)), u.x),
    u.y
  );
}

// Light ray pattern
fn lightRays(uv: vec2<f32>, lightPos: vec2<f32>, time: f32) -> f32 {
  let dir = uv - lightPos;
  let dist = length(dir);
  let angle = atan2(dir.y, dir.x);

  let rays = sin(angle * 16.0 + time * 2.0) * 0.5 + 0.5;
  let falloff = 1.0 / (1.0 + dist * 3.0);
  let flicker = sin(time * 10.0) * 0.05 + 0.95;

  return rays * falloff * flicker;
}

// Shadow tendrils
fn shadowTendrils(uv: vec2<f32>, time: f32) -> f32 {
  let tendrilUV = uv * 8.0 + vec2<f32>(time * 0.1, 0.0);
  let tendril = noise(tendrilUV) * noise(tendrilUV * 2.0 + vec2<f32>(time * 0.2, 0.0));
  return tendril * 0.3;
}

// Dust motes floating in light
fn dustMotes(uv: vec2<f32>, time: f32) -> f32 {
  var dust = 0.0;
  for (var i = 0; i < 5; i++) {
    let offset = vec2<f32>(f32(i) * 0.3, f32(i) * 0.7);
    let moteUV = uv * 15.0 + offset;
    let motePos = fract(moteUV + vec2<f32>(time * 0.1 * f32(i + 1), sin(time + f32(i)) * 0.2));
    let mote = smoothstep(0.03, 0.0, length(motePos - vec2<f32>(0.5)));
    dust += mote * 0.15;
  }
  return dust;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4<f32> {
  let uv = input.uv;
  let time = uniforms.time;
  let lightPos = vec2<f32>(uniforms.lightX / uniforms.resolution.x, 1.0 - uniforms.lightY / uniforms.resolution.y);
  let matchProgress = uniforms.matchProgress;

  // Base dark background
  let bgDark = vec3<f32>(0.10, 0.10, 0.18);
  let bgSlightlyLighter = vec3<f32>(0.12, 0.12, 0.20);

  // Gradient from top to bottom
  var color = mix(bgSlightlyLighter, bgDark, uv.y);

  // Add subtle noise texture
  let bgNoise = noise(uv * 30.0 + time * 0.05);
  color += bgNoise * 0.02;

  // Shadow tendrils at bottom
  let tendrils = shadowTendrils(vec2<f32>(uv.x, uv.y + 0.5), time);
  let shadowColor = vec3<f32>(0.05, 0.05, 0.10);
  color = mix(color, shadowColor, tendrils * (1.0 - uv.y));

  // Light rays from light source
  let rays = lightRays(uv, lightPos, time);
  let lightColor = vec3<f32>(1.0, 0.95, 0.65);
  color += lightColor * rays * 0.3;

  // Light source glow
  let lightDist = length(uv - lightPos);
  let glowInner = smoothstep(0.15, 0.0, lightDist);
  let glowOuter = smoothstep(0.4, 0.1, lightDist);
  let glowColor = vec3<f32>(1.0, 0.95, 0.55);
  color += glowColor * glowInner * 0.4;
  color += glowColor * glowOuter * 0.15;

  // Floating dust motes (visible in light)
  let dust = dustMotes(uv, time);
  let dustVisibility = smoothstep(0.5, 0.1, lightDist);
  color += vec3<f32>(1.0, 0.98, 0.85) * dust * dustVisibility;

  // Wall area (lower portion) with different shading
  let wallY = 0.12; // Lower portion is wall
  if (uv.y < wallY) {
    let wallColor = vec3<f32>(0.18, 0.18, 0.27);
    let wallNoise = noise(vec2<f32>(uv.x * 20.0, uv.y * 5.0));
    color = mix(wallColor, wallColor * 1.1, wallNoise * 0.3);

    // Light on wall
    let wallLight = lightRays(vec2<f32>(uv.x, uv.y * 0.5 + 0.5), lightPos, time);
    color += lightColor * wallLight * 0.1;
  }

  // Success glow when matched
  if (matchProgress > 0.9) {
    let successGlow = smoothstep(0.9, 1.0, matchProgress);
    let successColor = vec3<f32>(0.18, 0.80, 0.44);
    let pulse = sin(time * 5.0) * 0.2 + 0.8;
    color += successColor * successGlow * pulse * 0.15;
  }

  // Vignette effect
  let vignette = 1.0 - length(uv - vec2<f32>(0.5)) * 0.6;
  color *= vignette;

  return vec4<f32>(color, 1.0);
}
`;

export const PARTICLE_SHADER = /* wgsl */ `
struct Uniforms {
  time: f32,
  resolution: vec2<f32>,
  lightX: f32,
  lightY: f32,
  matchProgress: f32,
}

struct Particle {
  position: vec2<f32>,
  velocity: vec2<f32>,
  color: vec4<f32>,
  size: f32,
  life: f32,
  maxLife: f32,
  particleType: f32,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;
@group(0) @binding(1) var<storage, read> particles: array<Particle>;

struct VertexOutput {
  @builtin(position) position: vec4<f32>,
  @location(0) color: vec4<f32>,
  @location(1) uv: vec2<f32>,
  @location(2) particleType: f32,
  @location(3) life: f32,
}

@vertex
fn vertexMain(
  @builtin(vertex_index) vertexIndex: u32,
  @builtin(instance_index) instanceIndex: u32
) -> VertexOutput {
  let particle = particles[instanceIndex];

  var quadPos = array<vec2<f32>, 6>(
    vec2<f32>(-1.0, -1.0),
    vec2<f32>(1.0, -1.0),
    vec2<f32>(-1.0, 1.0),
    vec2<f32>(1.0, -1.0),
    vec2<f32>(1.0, 1.0),
    vec2<f32>(-1.0, 1.0)
  );

  let quad = quadPos[vertexIndex];
  let lifeRatio = particle.life / particle.maxLife;
  let size = particle.size * lifeRatio;

  let worldPos = particle.position + quad * size;
  let clipPos = vec2<f32>(
    (worldPos.x / uniforms.resolution.x) * 2.0 - 1.0,
    1.0 - (worldPos.y / uniforms.resolution.y) * 2.0
  );

  var output: VertexOutput;
  output.position = vec4<f32>(clipPos, 0.0, 1.0);
  output.color = particle.color;
  output.uv = quad * 0.5 + 0.5;
  output.particleType = particle.particleType;
  output.life = lifeRatio;
  return output;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4<f32> {
  let uv = input.uv;
  let center = vec2<f32>(0.5, 0.5);
  let dist = length(uv - center);
  let particleType = i32(input.particleType);
  let time = uniforms.time;

  var alpha = 0.0;
  var color = input.color.rgb;

  switch (particleType) {
    // Type 0: Light orb
    case 0: {
      let core = smoothstep(0.3, 0.0, dist);
      let glow = smoothstep(0.5, 0.2, dist) * 0.5;
      let pulse = sin(time * 8.0 + dist * 10.0) * 0.1 + 0.9;
      alpha = (core + glow) * input.life * pulse;
    }

    // Type 1: Shadow wisp
    case 1: {
      let wisp = smoothstep(0.5, 0.0, dist);
      let swirl = sin(atan2(uv.y - 0.5, uv.x - 0.5) * 3.0 + time * 5.0) * 0.2 + 0.8;
      alpha = wisp * swirl * input.life * 0.7;
    }

    // Type 2: Light spark
    case 2: {
      let angle = atan2(uv.y - 0.5, uv.x - 0.5);
      let star = pow(abs(sin(angle * 4.0 + time * 10.0)), 8.0);
      let core = smoothstep(0.2, 0.0, dist);
      alpha = (star * smoothstep(0.5, 0.1, dist) + core) * input.life;
    }

    // Type 3: Glow sphere
    case 3: {
      let sphere = smoothstep(0.5, 0.0, dist);
      let rim = smoothstep(0.25, 0.35, dist) * smoothstep(0.5, 0.4, dist);
      alpha = (sphere + rim * 0.5) * input.life;
    }

    // Type 4: Floating dust
    case 4: {
      let dust = smoothstep(0.35, 0.0, dist);
      let shimmer = sin(time * 6.0 + dist * 15.0) * 0.15 + 0.85;
      alpha = dust * shimmer * input.life * 0.6;
    }

    // Type 5: Light beam
    case 5, default: {
      let beamX = smoothstep(0.4, 0.2, abs(uv.x - 0.5));
      let beamY = smoothstep(0.0, 0.5, uv.y) * smoothstep(1.0, 0.5, uv.y);
      let beam = beamX * beamY;
      let sparkle = sin(uv.y * 20.0 + time * 8.0) * 0.2 + 0.8;
      alpha = beam * sparkle * input.life * 0.7;
    }
  }

  alpha *= input.color.a;

  return vec4<f32>(color, alpha);
}
`;
