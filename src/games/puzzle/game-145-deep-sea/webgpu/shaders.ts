/**
 * WGSL Shaders - Deep Sea
 * Deep Ocean / Bioluminescent / Abyssal Theme
 * Game #145
 */

export const BACKGROUND_SHADER = /* wgsl */ `
struct Uniforms {
  time: f32,
  resolution: vec2f,
  depth: f32,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;

struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) uv: vec2f,
}

@vertex
fn vertexMain(@builtin(vertex_index) vertexIndex: u32) -> VertexOutput {
  var pos = array<vec2f, 6>(
    vec2f(-1.0, -1.0),
    vec2f(1.0, -1.0),
    vec2f(1.0, 1.0),
    vec2f(-1.0, -1.0),
    vec2f(1.0, 1.0),
    vec2f(-1.0, 1.0)
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

fn caustics(uv: vec2f, time: f32) -> f32 {
  let p1 = uv * 8.0 + vec2f(time * 0.3, time * 0.2);
  let p2 = uv * 6.0 - vec2f(time * 0.2, time * 0.3);
  let c1 = sin(noise(p1) * 6.28);
  let c2 = sin(noise(p2) * 6.28);
  return (c1 * c2 + 1.0) * 0.5;
}

fn bioluminescence(uv: vec2f, time: f32) -> vec3f {
  var glow = vec3f(0.0);

  for (var i = 0; i < 5; i++) {
    let fi = f32(i);
    let center = vec2f(
      0.5 + sin(time * 0.5 + fi * 1.2) * 0.3,
      0.3 + cos(time * 0.3 + fi * 0.8) * 0.2 + fi * 0.12
    );
    let dist = length(uv - center);
    let intensity = smoothstep(0.15, 0.0, dist) * (0.3 + sin(time * 2.0 + fi) * 0.2);

    var color = vec3f(0.3, 1.0, 0.9);
    if (i % 3 == 1) {
      color = vec3f(0.2, 1.0, 0.6);
    } else if (i % 3 == 2) {
      color = vec3f(0.6, 0.3, 1.0);
    }
    glow += color * intensity;
  }

  return glow;
}

fn particles(uv: vec2f, time: f32) -> f32 {
  var value = 0.0;

  for (var i = 0; i < 15; i++) {
    let fi = f32(i);
    let seed = vec2f(fi * 127.1, fi * 311.7);
    let pos = vec2f(
      fract(hash(seed) + time * 0.02),
      fract(hash(seed + 1.0) - time * 0.03 * (0.5 + hash(seed + 2.0) * 0.5))
    );
    let dist = length(uv - pos);
    let size = 0.003 + hash(seed + 3.0) * 0.004;
    let flicker = 0.5 + sin(time * 3.0 + fi * 2.0) * 0.5;
    value += smoothstep(size, 0.0, dist) * flicker;
  }

  return value;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  let uv = input.uv;
  let time = uniforms.time;
  let depthFactor = clamp(uniforms.depth / 100.0, 0.0, 1.0);

  // Deep ocean gradient (darker at bottom)
  let surfaceColor = vec3f(0.04, 0.12, 0.25);
  let abyssColor = vec3f(0.01, 0.02, 0.04);
  var color = mix(surfaceColor, abyssColor, uv.y + depthFactor * 0.3);

  // Subtle water movement
  let waterNoise = fbm(uv * 3.0 + vec2f(time * 0.1, time * 0.05));
  color += vec3f(0.0, 0.02, 0.04) * waterNoise;

  // Caustics at surface (fade with depth)
  let causticIntensity = caustics(uv, time) * smoothstep(0.6, 0.0, uv.y) * (1.0 - depthFactor * 0.8);
  color += vec3f(0.1, 0.2, 0.3) * causticIntensity * 0.3;

  // Light rays from above (fade with depth)
  let rayAngle = atan2(uv.y - 0.0, uv.x - 0.5);
  let ray = pow(abs(sin(rayAngle * 5.0 + time * 0.2)), 8.0);
  let rayFade = smoothstep(0.8, 0.0, uv.y) * (1.0 - depthFactor);
  color += vec3f(0.1, 0.2, 0.4) * ray * rayFade * 0.15;

  // Bioluminescence (increases with depth)
  let biolum = bioluminescence(uv, time);
  color += biolum * (0.2 + depthFactor * 0.5);

  // Floating particles/plankton
  let particleGlow = particles(uv, time);
  color += vec3f(0.3, 0.8, 1.0) * particleGlow * 0.4;

  // Pressure effect (subtle red tint at edges when deep)
  let pressureVignette = length(uv - 0.5) * depthFactor;
  color = mix(color, color * vec3f(1.0, 0.9, 0.95), pressureVignette * 0.3);

  // Underwater fog
  let fog = fbm(uv * 2.0 + time * 0.05);
  color = mix(color, vec3f(0.05, 0.1, 0.15), fog * 0.1);

  // Overall vignette
  let vignette = 1.0 - length(uv - 0.5) * 0.8;
  color *= vignette;

  return vec4f(color, 1.0);
}
`;

export const PARTICLE_SHADER = /* wgsl */ `
struct Uniforms {
  time: f32,
  resolution: vec2f,
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

  var corners = array<vec2f, 6>(
    vec2f(-1.0, -1.0),
    vec2f(1.0, -1.0),
    vec2f(1.0, 1.0),
    vec2f(-1.0, -1.0),
    vec2f(1.0, 1.0),
    vec2f(-1.0, 1.0)
  );

  let corner = corners[vertexIndex];
  let lifeRatio = particle.life / particle.maxLife;

  var size = particle.size;

  // Type-specific size behavior
  let pType = i32(particle.particleType);
  if (pType == 0) { // bubbleRise
    size *= (0.8 + sin(uniforms.time * 10.0 + particle.position.x * 20.0) * 0.2) * lifeRatio;
  } else if (pType == 1) { // treasureSparkle
    size *= sin(lifeRatio * 3.14159) * (1.0 + sin(uniforms.time * 15.0) * 0.3);
  } else if (pType == 2) { // oxygenBurst
    size *= smoothstep(0.0, 0.3, lifeRatio) * (1.0 - lifeRatio * 0.3);
  } else if (pType == 3) { // depthPressure
    size *= lifeRatio * 0.6 + 0.4;
  } else if (pType == 4) { // bioluminescent
    size *= 0.7 + sin(uniforms.time * 3.0 + particle.position.y * 10.0) * 0.3;
  } else if (pType == 5) { // dangerFlash
    size *= (1.0 - lifeRatio * 0.4) * (0.8 + sin(uniforms.time * 20.0) * 0.4);
  }

  let aspect = uniforms.resolution.x / uniforms.resolution.y;
  var pos = particle.position + corner * size * 0.02;
  pos.x /= aspect;
  pos = pos * 2.0 - 1.0;

  var output: VertexOutput;
  output.position = vec4f(pos, 0.0, 1.0);
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
  let dist = length(uv - center) * 2.0;

  var alpha = input.color.a;
  let pType = i32(input.particleType);

  if (pType == 0) { // bubbleRise - bubble with highlight
    let bubble = smoothstep(1.0, 0.7, dist);
    let highlight = smoothstep(0.5, 0.2, length(uv - vec2f(0.35, 0.35)));
    alpha *= (bubble * 0.5 + highlight * 0.3) * input.life;
  } else if (pType == 1) { // treasureSparkle - star sparkle
    let angle = atan2(uv.y - 0.5, uv.x - 0.5);
    let star = (sin(angle * 6.0) * 0.5 + 0.5) * 0.4 + 0.6;
    alpha *= (1.0 - dist * 0.7) * star * input.life;
  } else if (pType == 2) { // oxygenBurst - expanding ring
    let ring = smoothstep(0.3, 0.4, dist) * smoothstep(0.6, 0.5, dist);
    let center_glow = 1.0 - dist;
    alpha *= (ring + center_glow * 0.5) * input.life;
  } else if (pType == 3) { // depthPressure - ripple wave
    let ripple = sin(dist * 10.0 - uniforms.time * 5.0) * 0.5 + 0.5;
    alpha *= (1.0 - dist * 0.8) * ripple * input.life * 0.7;
  } else if (pType == 4) { // bioluminescent - soft glow
    let glow = exp(-dist * dist * 3.0);
    alpha *= glow * input.life * 0.8;
  } else if (pType == 5) { // dangerFlash - pulsing danger
    let pulse = 0.5 + sin(uniforms.time * 15.0) * 0.5;
    alpha *= (1.0 - dist * 0.6) * pulse * input.life;
  }

  if (alpha < 0.01) {
    discard;
  }

  return vec4f(input.color.rgb, alpha);
}
`;
