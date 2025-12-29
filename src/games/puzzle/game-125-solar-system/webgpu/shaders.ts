/**
 * WebGPU WGSL Shaders - Solar System
 * Space / Cosmos Theme
 * Game #125
 */

export const BACKGROUND_SHADER = /* wgsl */ `
struct Uniforms {
  time: f32,
  resolution: vec2<f32>,
  sunX: f32,
  sunY: f32,
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

// Hash function for randomness
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

// Fractal brownian motion
fn fbm(p: vec2<f32>) -> f32 {
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

// Star field
fn starField(uv: vec2<f32>, time: f32) -> f32 {
  var stars = 0.0;
  let scale = 50.0;

  for (var i = 0; i < 3; i++) {
    let fi = f32(i);
    let layer = uv * scale * (1.0 + fi * 0.5);
    let cellId = floor(layer);
    let cellUV = fract(layer);

    let starPos = vec2<f32>(
      hash(cellId + fi * 100.0),
      hash(cellId.yx + fi * 200.0)
    );

    let dist = length(cellUV - starPos);
    let brightness = hash(cellId + fi * 300.0);
    let twinkle = 0.7 + 0.3 * sin(time * 3.0 + brightness * 10.0);
    let size = 0.01 + brightness * 0.015;

    stars += smoothstep(size, 0.0, dist) * brightness * twinkle * (1.0 - fi * 0.2);
  }

  return stars;
}

// Nebula effect
fn nebula(uv: vec2<f32>, time: f32) -> vec3<f32> {
  let nebulaUV = uv * 3.0;
  let offset = vec2<f32>(time * 0.02, time * 0.01);

  let n1 = fbm(nebulaUV + offset);
  let n2 = fbm(nebulaUV * 1.5 - offset * 0.5);
  let n3 = fbm(nebulaUV * 2.0 + offset * 0.3);

  let nebulaMask = smoothstep(0.3, 0.7, n1) * smoothstep(0.4, 0.6, n2);

  let nebulaBlue = vec3<f32>(0.2, 0.4, 0.8);
  let nebulaPurple = vec3<f32>(0.5, 0.2, 0.7);
  let nebulaPink = vec3<f32>(0.8, 0.3, 0.6);

  var nebulaColor = mix(nebulaBlue, nebulaPurple, n2);
  nebulaColor = mix(nebulaColor, nebulaPink, n3 * 0.5);

  return nebulaColor * nebulaMask * 0.15;
}

// Sun glow effect
fn sunGlow(uv: vec2<f32>, sunPos: vec2<f32>, time: f32) -> vec3<f32> {
  let dist = length(uv - sunPos);

  // Corona
  let corona = smoothstep(0.15, 0.0, dist) * 0.8;
  let coronaPulse = 0.9 + 0.1 * sin(time * 2.0);

  // Outer glow
  let glow = 0.05 / (dist + 0.02);

  // Rays
  let angle = atan2(uv.y - sunPos.y, uv.x - sunPos.x);
  let rays = pow(abs(sin(angle * 8.0 + time * 0.5)), 4.0) * 0.1;
  let raysFalloff = smoothstep(0.2, 0.05, dist);

  let sunColor = vec3<f32>(1.0, 0.7, 0.2);
  let glowColor = vec3<f32>(1.0, 0.5, 0.1);

  return sunColor * corona * coronaPulse + glowColor * glow * 0.3 + sunColor * rays * raysFalloff;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4<f32> {
  let uv = input.uv;
  let time = uniforms.time;

  // Normalized sun position
  let sunPos = vec2<f32>(
    uniforms.sunX / uniforms.resolution.x,
    1.0 - uniforms.sunY / uniforms.resolution.y
  );

  // Deep space gradient
  let spaceTop = vec3<f32>(0.04, 0.04, 0.12);
  let spaceBottom = vec3<f32>(0.08, 0.04, 0.15);
  var color = mix(spaceTop, spaceBottom, uv.y);

  // Add nebula
  color += nebula(uv, time);

  // Add stars
  let stars = starField(uv, time);
  color += vec3<f32>(1.0, 0.98, 0.9) * stars;

  // Add sun glow
  color += sunGlow(uv, sunPos, time);

  // Vignette
  let vignette = 1.0 - length(uv - vec2<f32>(0.5)) * 0.4;
  color *= vignette;

  return vec4<f32>(color, 1.0);
}
`;

export const PARTICLE_SHADER = /* wgsl */ `
struct Uniforms {
  time: f32,
  resolution: vec2<f32>,
  sunX: f32,
  sunY: f32,
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
    // Type 0: Star twinkle
    case 0: {
      let twinkle = 0.5 + 0.5 * sin(time * 8.0 + dist * 10.0);
      let core = smoothstep(0.3, 0.0, dist);
      let rays = pow(abs(sin(atan2(uv.y - 0.5, uv.x - 0.5) * 4.0)), 8.0);
      alpha = (core + rays * 0.3 * smoothstep(0.5, 0.2, dist)) * input.life * twinkle;
    }

    // Type 1: Comet tail
    case 1: {
      let tail = smoothstep(0.5, 0.0, dist);
      let stretch = smoothstep(0.0, 1.0, uv.x);
      alpha = tail * stretch * input.life * 0.6;
    }

    // Type 2: Nebula cloud
    case 2: {
      let cloud = smoothstep(0.5, 0.0, dist);
      let noise = sin(uv.x * 20.0 + time) * sin(uv.y * 20.0 - time) * 0.2 + 0.8;
      alpha = cloud * noise * input.life * 0.4;
    }

    // Type 3: Orbit trail
    case 3: {
      let ring = smoothstep(0.35, 0.4, dist) * smoothstep(0.5, 0.45, dist);
      let fade = smoothstep(0.0, 0.5, uv.x);
      alpha = ring * fade * input.life * 0.5;
    }

    // Type 4: Solar flare
    case 4: {
      let flare = smoothstep(0.5, 0.0, dist);
      let pulse = 0.8 + 0.2 * sin(time * 10.0);
      let rays = pow(abs(sin(atan2(uv.y - 0.5, uv.x - 0.5) * 6.0 + time * 3.0)), 3.0);
      alpha = (flare + rays * 0.4 * smoothstep(0.5, 0.2, dist)) * input.life * pulse;
    }

    // Type 5: Alignment glow
    case 5, default: {
      let glow = smoothstep(0.5, 0.0, dist);
      let pulse = 0.7 + 0.3 * sin(time * 5.0);
      let ring = smoothstep(0.3, 0.35, dist) * smoothstep(0.45, 0.4, dist);
      alpha = (glow * 0.5 + ring) * input.life * pulse;
    }
  }

  alpha *= input.color.a;

  return vec4<f32>(color, alpha);
}
`;
