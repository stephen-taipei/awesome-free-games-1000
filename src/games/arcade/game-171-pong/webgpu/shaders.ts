/**
 * Pong WebGPU Shaders
 * Game #171 - Retro Arcade with CRT scanlines and neon glow
 */

export const backgroundShader = /* wgsl */ `
struct Uniforms {
  time: f32,
  aspectRatio: f32,
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

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  let uv = input.uv;
  let time = uniforms.time;

  // Base black background
  var color = vec3f(0.02, 0.02, 0.03);

  // Subtle grid pattern
  let gridSize = 40.0;
  let gridX = fract(uv.x * gridSize);
  let gridY = fract(uv.y * gridSize);
  let gridLine = smoothstep(0.0, 0.02, gridX) * smoothstep(1.0, 0.98, gridX)
               * smoothstep(0.0, 0.02, gridY) * smoothstep(1.0, 0.98, gridY);
  color += vec3f(0.03, 0.03, 0.04) * (1.0 - gridLine);

  // Center dashed line
  let centerDist = abs(uv.x - 0.5);
  let dashY = fract(uv.y * 20.0);
  let isDash = step(0.3, dashY) * step(dashY, 0.7);
  let centerLine = smoothstep(0.005, 0.0, centerDist) * isDash;
  color += vec3f(0.15, 0.15, 0.18) * centerLine;

  // Ambient glow from sides
  let leftGlow = exp(-uv.x * 3.0) * 0.1;
  let rightGlow = exp(-(1.0 - uv.x) * 3.0) * 0.1;
  color += vec3f(0.1, 0.4, 0.2) * leftGlow; // Green for player side
  color += vec3f(0.5, 0.15, 0.1) * rightGlow; // Red for CPU side

  // Pulsing corner accents
  let corners = array<vec2f, 4>(
    vec2f(0.0, 0.0),
    vec2f(1.0, 0.0),
    vec2f(0.0, 1.0),
    vec2f(1.0, 1.0)
  );

  for (var i = 0; i < 4; i++) {
    let dist = length(uv - corners[i]);
    let pulse = sin(time * 2.0 + f32(i) * 1.5) * 0.3 + 0.7;
    let glow = exp(-dist * 6.0) * 0.15 * pulse;
    let neonColor = select(
      select(vec3f(1.0, 0.0, 1.0), vec3f(0.0, 1.0, 1.0), i % 2 == 0),
      select(vec3f(1.0, 1.0, 0.0), vec3f(0.0, 1.0, 0.5), i % 2 == 0),
      i < 2
    );
    color += neonColor * glow;
  }

  // CRT scanlines
  let scanlineY = fract(uv.y * 300.0);
  let scanline = smoothstep(0.0, 0.4, scanlineY) * smoothstep(1.0, 0.6, scanlineY);
  color *= 0.85 + scanline * 0.15;

  // Subtle flicker
  let flicker = sin(time * 60.0) * 0.01 + 1.0;
  color *= flicker;

  // CRT vignette
  let vignetteUV = uv * 2.0 - 1.0;
  let vignette = 1.0 - dot(vignetteUV, vignetteUV) * 0.3;
  color *= vignette;

  // Screen curvature effect
  let curveStrength = 0.02;
  let curveDist = length(vignetteUV);
  let curveOffset = curveStrength * curveDist * curveDist;
  color *= 1.0 - curveOffset * 0.5;

  return vec4f(color, 1.0);
}
`;

export const particleShader = /* wgsl */ `
struct Uniforms {
  time: f32,
  aspectRatio: f32,
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

  var pos = particle.position + corner * size * vec2f(1.0 / uniforms.aspectRatio, 1.0);
  pos = pos * 2.0 - 1.0;

  var output: VertexOutput;
  output.position = vec4f(pos, 0.0, 1.0);
  output.color = particle.color;
  output.uv = corner * 0.5 + 0.5;
  output.particleType = particle.particleType;
  return output;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  let dist = length(input.uv - 0.5) * 2.0;
  var alpha = input.color.a;
  let pType = i32(input.particleType);

  if (pType == 0) {
    // Wall bounce - horizontal sparks
    let stretch = abs(input.uv.x - 0.5) * 2.0;
    alpha *= smoothstep(1.0, 0.3, dist) * (1.0 - stretch * 0.5);
  } else if (pType == 1) {
    // Paddle hit - square pixels
    let pixelDist = max(abs(input.uv.x - 0.5), abs(input.uv.y - 0.5)) * 2.0;
    alpha *= smoothstep(1.0, 0.7, pixelDist);
  } else if (pType == 2 || pType == 3) {
    // Score particles - glowing orbs
    alpha *= smoothstep(1.0, 0.0, dist * dist);
  } else if (pType == 4) {
    // Ball trail - soft fade
    alpha *= smoothstep(1.0, 0.2, dist) * 0.6;
  } else {
    // Game over - large burst
    let angle = atan2(input.uv.y - 0.5, input.uv.x - 0.5);
    let rays = pow(0.5 + 0.5 * sin(angle * 8.0), 2.0);
    alpha *= smoothstep(1.0, 0.0, dist) * (0.7 + rays * 0.5);
  }

  return vec4f(input.color.rgb, alpha);
}
`;
