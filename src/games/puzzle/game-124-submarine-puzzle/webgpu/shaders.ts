/**
 * WebGPU WGSL Shaders - Submarine Puzzle
 * Underwater Ocean / Deep Sea Theme
 * Game #124
 */

export const BACKGROUND_SHADER = /* wgsl */ `
struct Uniforms {
  time: f32,
  resolution: vec2<f32>,
  scrollX: f32,
  submarineDepth: f32,
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

// Water caustics pattern
fn caustics(uv: vec2<f32>, time: f32) -> f32 {
  let scale = 8.0;
  let causticUV = uv * scale;
  let offset1 = vec2<f32>(time * 0.1, time * 0.05);
  let offset2 = vec2<f32>(time * -0.08, time * 0.12);

  let c1 = noise(causticUV + offset1);
  let c2 = noise(causticUV * 1.5 + offset2);
  let c3 = noise(causticUV * 2.0 + offset1 * 0.5);

  return (c1 * c2 + c3) * 0.5;
}

// Light rays from surface
fn lightRays(uv: vec2<f32>, time: f32) -> f32 {
  let rayCount = 5.0;
  let rayX = fract(uv.x * rayCount + time * 0.1);
  let ray = smoothstep(0.45, 0.5, rayX) * smoothstep(0.55, 0.5, rayX);
  let depth = 1.0 - uv.y;
  return ray * depth * 0.3;
}

// Bubble particles in background
fn backgroundBubbles(uv: vec2<f32>, time: f32, scrollX: f32) -> f32 {
  var bubbles = 0.0;
  for (var i = 0; i < 8; i++) {
    let fi = f32(i);
    let bubbleX = fract(fi * 0.13 + scrollX * 0.0001 + 0.5);
    let bubbleY = fract(time * 0.05 * (0.5 + fi * 0.1) + fi * 0.25);
    let bubblePos = vec2<f32>(bubbleX, 1.0 - bubbleY);
    let size = 0.008 + fi * 0.002;
    let dist = length(uv - bubblePos);
    bubbles += smoothstep(size, size * 0.5, dist) * 0.15;
  }
  return bubbles;
}

// Water current flow lines
fn currentLines(uv: vec2<f32>, time: f32) -> f32 {
  let flowUV = vec2<f32>(uv.x * 3.0 + time * 0.2, uv.y * 10.0);
  let wave = sin(flowUV.x + flowUV.y * 0.5) * 0.5 + 0.5;
  return wave * 0.05 * (1.0 - abs(uv.y - 0.5) * 2.0);
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4<f32> {
  let uv = input.uv;
  let time = uniforms.time;
  let scrollX = uniforms.scrollX;

  // Ocean depth gradient
  let oceanSurface = vec3<f32>(0.0, 0.47, 0.75);
  let oceanMid = vec3<f32>(0.0, 0.35, 0.55);
  let oceanDeep = vec3<f32>(0.0, 0.15, 0.35);

  // Create gradient based on depth
  var color: vec3<f32>;
  if (uv.y < 0.3) {
    color = mix(oceanSurface, oceanMid, uv.y / 0.3);
  } else if (uv.y < 0.7) {
    color = mix(oceanMid, oceanDeep, (uv.y - 0.3) / 0.4);
  } else {
    color = mix(oceanDeep, oceanDeep * 0.7, (uv.y - 0.7) / 0.3);
  }

  // Add water noise texture
  let waterNoise = noise(uv * 20.0 + vec2<f32>(time * 0.1, 0.0));
  color += waterNoise * 0.02;

  // Light rays from surface
  let rays = lightRays(uv, time);
  color += vec3<f32>(0.8, 0.9, 1.0) * rays;

  // Caustics effect
  let causticsVal = caustics(uv, time);
  let causticsColor = vec3<f32>(0.3, 0.6, 0.8);
  color += causticsColor * causticsVal * (1.0 - uv.y) * 0.3;

  // Background bubbles
  let bubbles = backgroundBubbles(uv, time, scrollX);
  color += vec3<f32>(0.8, 0.9, 1.0) * bubbles;

  // Current flow lines
  let currents = currentLines(uv, time);
  color += vec3<f32>(0.4, 0.7, 0.95) * currents;

  // Depth fog at bottom
  let bottomFog = smoothstep(0.7, 1.0, uv.y);
  color = mix(color, oceanDeep * 0.5, bottomFog * 0.3);

  // Subtle wave distortion at top
  let waveDistort = sin(uv.x * 20.0 + time * 2.0) * 0.005 * (1.0 - uv.y);
  color += vec3<f32>(0.5, 0.7, 0.9) * waveDistort;

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
  scrollX: f32,
  submarineDepth: f32,
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
    // Type 0: Bubble
    case 0: {
      let ring = smoothstep(0.35, 0.4, dist) * smoothstep(0.5, 0.45, dist);
      let fill = smoothstep(0.4, 0.0, dist) * 0.3;
      let highlight = smoothstep(0.15, 0.1, length(uv - vec2<f32>(0.35, 0.35)));
      alpha = (ring + fill + highlight * 0.5) * input.life;
    }

    // Type 1: Water wave/current
    case 1: {
      let wave = sin(uv.x * 10.0 + time * 5.0) * 0.1 + 0.5;
      let stream = smoothstep(0.0, 0.3, abs(uv.y - wave));
      alpha = (1.0 - stream) * input.life * 0.5;
    }

    // Type 2: Oxygen sparkle
    case 2: {
      let angle = atan2(uv.y - 0.5, uv.x - 0.5);
      let rays = pow(abs(sin(angle * 4.0 + time * 8.0)), 6.0);
      let core = smoothstep(0.2, 0.0, dist);
      alpha = (rays * smoothstep(0.5, 0.2, dist) * 0.6 + core) * input.life;
    }

    // Type 3: Submarine trail/propeller wash
    case 3: {
      let trail = smoothstep(0.5, 0.0, dist);
      let swirl = sin(atan2(uv.y - 0.5, uv.x - 0.5) * 3.0 + time * 10.0 - dist * 20.0) * 0.3 + 0.7;
      alpha = trail * swirl * input.life * 0.6;
    }

    // Type 4: Debris/sediment
    case 4: {
      let debris = smoothstep(0.3, 0.0, dist);
      let scatter = sin(dist * 30.0 + time * 2.0) * 0.2 + 0.8;
      alpha = debris * scatter * input.life * 0.5;
    }

    // Type 5: Danger glow
    case 5, default: {
      let glow = smoothstep(0.5, 0.0, dist);
      let pulse = sin(time * 8.0) * 0.3 + 0.7;
      alpha = glow * pulse * input.life;
    }
  }

  alpha *= input.color.a;

  return vec4<f32>(color, alpha);
}
`;
