/**
 * WebGPU WGSL Shaders - Castle Mechanism
 * Medieval Castle / Steampunk Theme
 * Game #122
 */

export const BACKGROUND_SHADER = /* wgsl */ `
struct Uniforms {
  time: f32,
  resolution: vec2<f32>,
  gateProgress: f32,
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

// Brick pattern
fn brickPattern(uv: vec2<f32>) -> f32 {
  let brickSize = vec2<f32>(0.12, 0.06);
  let row = floor(uv.y / brickSize.y);
  var pos = uv;
  pos.x += select(0.0, brickSize.x * 0.5, i32(row) % 2 == 1);

  let brick = fract(pos / brickSize);
  let mortar = smoothstep(0.02, 0.05, brick.x) * smoothstep(0.02, 0.05, brick.y);
  let mortarEdge = smoothstep(0.95, 0.98, brick.x) + smoothstep(0.95, 0.98, brick.y);

  return mortar * (1.0 - mortarEdge);
}

// Gear pattern for decoration
fn gearPattern(uv: vec2<f32>, center: vec2<f32>, radius: f32, teeth: f32, time: f32) -> f32 {
  let p = uv - center;
  let dist = length(p);
  let angle = atan2(p.y, p.x) + time * 0.5;

  let toothPattern = sin(angle * teeth) * 0.5 + 0.5;
  let gearShape = smoothstep(radius + 0.02, radius, dist) * smoothstep(radius * 0.4, radius * 0.5, dist);
  let innerRing = smoothstep(radius * 0.3, radius * 0.25, dist);

  return gearShape * (0.7 + toothPattern * 0.3) + innerRing * 0.3;
}

// Chain pattern
fn chainLink(uv: vec2<f32>, time: f32) -> f32 {
  let chainUV = uv * vec2<f32>(1.0, 8.0);
  let linkY = fract(chainUV.y + time * 0.2);
  let linkX = abs(chainUV.x - 0.5);

  let oval = smoothstep(0.15, 0.1, length(vec2<f32>(linkX * 2.0, linkY - 0.5)));
  return oval;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4<f32> {
  let uv = input.uv;
  let time = uniforms.time;
  let progress = uniforms.gateProgress;

  // Base stone colors
  let stoneDark = vec3<f32>(0.25, 0.24, 0.22);
  let stoneLight = vec3<f32>(0.38, 0.36, 0.34);
  let stoneMid = vec3<f32>(0.32, 0.30, 0.28);

  // Stone texture
  let stoneNoise = noise(uv * 15.0);
  let stoneDetail = noise(uv * 40.0 + time * 0.01);
  var color = mix(stoneDark, stoneLight, stoneNoise * 0.5 + stoneDetail * 0.3);

  // Brick pattern
  let bricks = brickPattern(uv);
  color *= 0.85 + bricks * 0.15;

  // Decorative gears in corners
  let gear1 = gearPattern(uv, vec2<f32>(0.1, 0.9), 0.08, 8.0, time);
  let gear2 = gearPattern(uv, vec2<f32>(0.9, 0.9), 0.06, 6.0, -time);
  let gear3 = gearPattern(uv, vec2<f32>(0.1, 0.1), 0.05, 10.0, time * 1.5);
  let gear4 = gearPattern(uv, vec2<f32>(0.9, 0.1), 0.07, 8.0, -time * 0.8);

  let brass = vec3<f32>(0.71, 0.53, 0.26);
  let gears = gear1 + gear2 + gear3 + gear4;
  color = mix(color, brass, gears * 0.6);

  // Chains on sides
  let leftChain = chainLink(vec2<f32>((uv.x - 0.02) * 10.0, uv.y), time);
  let rightChain = chainLink(vec2<f32>((uv.x - 0.98) * 10.0 + 0.5, uv.y), time);
  let iron = vec3<f32>(0.35, 0.35, 0.38);
  color = mix(color, iron, (leftChain + rightChain) * 0.5);

  // Torch-like flickering light
  let torchPos1 = vec2<f32>(0.15, 0.5);
  let torchPos2 = vec2<f32>(0.85, 0.5);
  let flicker = sin(time * 8.0) * 0.1 + sin(time * 12.0) * 0.05 + 0.85;

  let torch1Dist = length(uv - torchPos1);
  let torch2Dist = length(uv - torchPos2);
  let torchGlow = (1.0 / (1.0 + torch1Dist * 5.0) + 1.0 / (1.0 + torch2Dist * 5.0)) * flicker;

  let fireColor = vec3<f32>(1.0, 0.6, 0.2);
  color += fireColor * torchGlow * 0.15;

  // Gate progress glow
  let centerGlow = 1.0 - length(uv - vec2<f32>(0.5, 0.7));
  let progressGlow = smoothstep(0.0, 1.0, progress) * centerGlow * 0.3;
  let successGreen = vec3<f32>(0.18, 0.80, 0.44);
  color += successGreen * progressGlow;

  // Vignette
  let vignette = 1.0 - length(uv - vec2<f32>(0.5, 0.5)) * 0.5;
  color *= vignette;

  return vec4<f32>(color, 1.0);
}
`;

export const PARTICLE_SHADER = /* wgsl */ `
struct Uniforms {
  time: f32,
  resolution: vec2<f32>,
  gateProgress: f32,
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
    // Type 0: Gear tooth
    case 0: {
      let tooth = 1.0 - smoothstep(0.0, 0.35, abs(uv.x - 0.5) + abs(uv.y - 0.3) * 0.5);
      let body = smoothstep(0.4, 0.35, dist);
      alpha = max(tooth, body) * input.life;
    }

    // Type 1: Steam cloud
    case 1: {
      let cloud = smoothstep(0.5, 0.0, dist);
      let puff = sin(uv.x * 10.0 + time * 5.0) * sin(uv.y * 10.0 + time * 3.0) * 0.3 + 0.7;
      alpha = cloud * puff * input.life * 0.7;
    }

    // Type 2: Metal spark
    case 2: {
      let angle = atan2(uv.y - 0.5, uv.x - 0.5);
      let rays = pow(abs(sin(angle * 3.0 + time * 10.0)), 4.0);
      let core = smoothstep(0.15, 0.0, dist);
      alpha = (rays * smoothstep(0.5, 0.1, dist) * 0.6 + core) * input.life;
    }

    // Type 3: Chain link
    case 3: {
      let ring = smoothstep(0.35, 0.3, dist) - smoothstep(0.25, 0.2, dist);
      alpha = ring * input.life;
    }

    // Type 4: Mechanism glow
    case 4: {
      let glow = smoothstep(0.5, 0.0, dist);
      let pulse = sin(time * 6.0) * 0.15 + 0.85;
      alpha = glow * pulse * input.life;
    }

    // Type 5: Stone dust
    case 5, default: {
      let dust = smoothstep(0.4, 0.0, dist);
      let scatter = sin(dist * 20.0 + time * 3.0) * 0.2 + 0.8;
      alpha = dust * scatter * input.life * 0.6;
    }
  }

  alpha *= input.color.a;

  return vec4<f32>(color, alpha);
}
`;
