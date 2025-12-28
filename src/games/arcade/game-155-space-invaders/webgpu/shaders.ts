/**
 * WGSL Shaders - Space Invaders
 * Retro CRT / Neon Green / Space Arcade Theme
 * Game #155
 */

export const BACKGROUND_SHADER = /* wgsl */ `
struct Uniforms {
  time: f32,
  resolution: vec2f,
  padding: vec2f,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;

struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) uv: vec2f,
}

@vertex
fn vs_main(@builtin(vertex_index) vertexIndex: u32) -> VertexOutput {
  var positions = array<vec2f, 6>(
    vec2f(-1.0, -1.0),
    vec2f(1.0, -1.0),
    vec2f(1.0, 1.0),
    vec2f(-1.0, -1.0),
    vec2f(1.0, 1.0),
    vec2f(-1.0, 1.0)
  );

  var output: VertexOutput;
  output.position = vec4f(positions[vertexIndex], 0.0, 1.0);
  output.uv = positions[vertexIndex] * 0.5 + 0.5;
  return output;
}

fn hash(p: vec2f) -> f32 {
  let k = vec2f(0.3183099, 0.3678794);
  var p2 = p * k + k.yx;
  return fract(16.0 * k.x * fract(p2.x * p2.y * (p2.x + p2.y)));
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

fn starField(uv: vec2f, time: f32, layer: f32) -> f32 {
  var stars = 0.0;
  let scale = 20.0 + layer * 30.0;
  let gridUv = fract(uv * scale);
  let gridId = floor(uv * scale);

  let starPos = vec2f(hash(gridId), hash(gridId + vec2f(7.23, 3.45)));
  let dist = distance(gridUv, starPos);

  // Twinkling based on star position
  let twinkle = sin(time * 3.0 + hash(gridId) * 10.0) * 0.3 + 0.7;
  let size = hash(gridId + vec2f(1.23, 4.56)) * 0.015 + 0.005;

  if (dist < size && hash(gridId + vec2f(2.34, 5.67)) > 0.85) {
    stars = smoothstep(size, size * 0.3, dist) * twinkle;
  }

  return stars;
}

fn scanLines(uv: vec2f, time: f32) -> f32 {
  // Horizontal scan lines
  let scanLine = sin(uv.y * uniforms.resolution.y * 0.5) * 0.5 + 0.5;
  let scanIntensity = 0.95 + scanLine * 0.05;

  // Vertical CRT curve simulation
  let vignette = 1.0 - length((uv - 0.5) * 1.2) * 0.3;

  // Subtle scan line movement
  let scroll = sin(time * 0.5 + uv.y * 3.0) * 0.01;

  return scanIntensity * vignette;
}

fn crtWarp(uv: vec2f) -> vec2f {
  // Barrel distortion for CRT effect
  let center = uv - 0.5;
  let dist = length(center);
  let warp = 1.0 + dist * dist * 0.1;
  return center * warp + 0.5;
}

@fragment
fn fs_main(input: VertexOutput) -> @location(0) vec4f {
  let uv = input.uv;
  let time = uniforms.time;

  // Apply CRT warp
  let warpedUv = crtWarp(uv);

  // Deep space black background
  var color = vec3f(0.0, 0.0, 0.02);

  // Multiple star layers with parallax
  let stars1 = starField(warpedUv + vec2f(0.0, time * 0.02), time, 0.0);
  let stars2 = starField(warpedUv + vec2f(0.0, time * 0.03), time, 1.0);
  let stars3 = starField(warpedUv + vec2f(0.0, time * 0.04), time, 2.0);

  // Add stars with different brightness
  color += vec3f(1.0, 1.0, 1.0) * stars1 * 0.8;
  color += vec3f(0.8, 0.9, 1.0) * stars2 * 0.5;
  color += vec3f(0.6, 0.7, 0.9) * stars3 * 0.3;

  // Nebula glow
  let nebula = noise(warpedUv * 3.0 + vec2f(time * 0.05, 0.0));
  let nebulaColor = vec3f(0.0, 0.1, 0.15) * nebula * 0.3;
  color += nebulaColor;

  // CRT green phosphor glow at edges
  let edgeGlow = smoothstep(0.3, 0.0, abs(warpedUv.x - 0.5)) *
                 smoothstep(0.3, 0.0, abs(warpedUv.y - 0.5));
  color += vec3f(0.0, 0.03, 0.0) * (1.0 - edgeGlow);

  // Apply scan lines
  let scan = scanLines(warpedUv, time);
  color *= scan;

  // CRT flicker
  let flicker = 0.98 + sin(time * 60.0) * 0.02;
  color *= flicker;

  // Vignette
  let vignette = 1.0 - length(uv - 0.5) * 0.5;
  color *= vignette;

  // Check if outside CRT bounds
  if (warpedUv.x < 0.0 || warpedUv.x > 1.0 || warpedUv.y < 0.0 || warpedUv.y > 1.0) {
    color = vec3f(0.0);
  }

  return vec4f(color, 0.9);
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
fn vs_main(
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

  // Size animation based on type
  var sizeMultiplier = 1.0;
  let pType = u32(particle.particleType);

  if (pType == 0u) { // playerShoot - elongated bullet
    sizeMultiplier = 1.0;
  } else if (pType == 1u) { // alienDeath - explosion expand
    sizeMultiplier = 1.0 + (1.0 - lifeRatio) * 2.0;
  } else if (pType == 2u) { // playerHit - dramatic flash
    sizeMultiplier = 1.5 + sin(uniforms.time * 20.0) * 0.3;
  } else if (pType == 3u) { // barrierHit - debris
    sizeMultiplier = lifeRatio;
  } else if (pType == 4u) { // bulletTrail - fading
    sizeMultiplier = lifeRatio * 0.5;
  } else if (pType == 5u) { // gameOver - rain down
    sizeMultiplier = 1.0 + (1.0 - lifeRatio);
  }

  let size = particle.size * sizeMultiplier;
  let aspect = uniforms.resolution.x / uniforms.resolution.y;

  let worldPos = particle.position + corner * size * vec2f(1.0 / aspect, 1.0);
  let clipPos = worldPos * 2.0 - 1.0;

  var output: VertexOutput;
  output.position = vec4f(clipPos.x, clipPos.y, 0.0, 1.0);
  output.color = particle.color;
  output.uv = corner * 0.5 + 0.5;
  output.life = lifeRatio;
  output.particleType = particle.particleType;

  return output;
}

@fragment
fn fs_main(input: VertexOutput) -> @location(0) vec4f {
  let dist = length(input.uv - 0.5) * 2.0;
  let pType = u32(input.particleType);

  var alpha = input.color.a;
  var color = input.color.rgb;

  if (pType == 0u) { // playerShoot - green laser
    let laser = smoothstep(0.3, 0.1, abs(input.uv.x - 0.5));
    let core = smoothstep(0.15, 0.0, abs(input.uv.x - 0.5));
    color = mix(color, vec3f(0.5, 1.0, 0.5), core);
    alpha *= laser * input.life;
  }
  else if (pType == 1u) { // alienDeath - pixel explosion
    let pixelSize = 0.2;
    let pixelUv = floor(input.uv / pixelSize) * pixelSize;
    let pixelDist = length(pixelUv - 0.5) * 2.0;
    let explosion = smoothstep(1.0, 0.0, pixelDist);
    let flash = sin(uniforms.time * 15.0 + pixelDist * 10.0) * 0.3 + 0.7;
    alpha *= explosion * flash * input.life;
  }
  else if (pType == 2u) { // playerHit - danger flash
    let ring = smoothstep(0.5, 0.4, dist) * smoothstep(0.2, 0.3, dist);
    let pulse = sin(uniforms.time * 30.0) * 0.5 + 0.5;
    color = mix(vec3f(1.0, 0.0, 0.0), color, pulse);
    alpha *= (ring + smoothstep(0.4, 0.0, dist) * 0.5) * input.life;
  }
  else if (pType == 3u) { // barrierHit - green debris
    let debris = smoothstep(0.6, 0.3, dist);
    let flicker = sin(uniforms.time * 20.0 + input.uv.x * 10.0) * 0.2 + 0.8;
    alpha *= debris * flicker * input.life;
  }
  else if (pType == 4u) { // bulletTrail - glow trail
    let trail = smoothstep(0.5, 0.0, dist);
    alpha *= trail * input.life * 0.5;
  }
  else if (pType == 5u) { // gameOver - falling debris
    let debris = smoothstep(0.5, 0.2, dist);
    let shimmer = sin(uniforms.time * 10.0 + input.uv.y * 20.0) * 0.2 + 0.8;
    alpha *= debris * shimmer * input.life;
  }
  else { // ambient stars
    let star = smoothstep(0.5, 0.2, dist);
    let twinkle = sin(uniforms.time * 5.0 + dist * 10.0) * 0.3 + 0.7;
    alpha *= star * twinkle * input.life * 0.4;
  }

  // CRT phosphor bloom
  color = color + color * 0.2;

  return vec4f(color, alpha);
}
`;
