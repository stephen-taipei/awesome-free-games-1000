/**
 * WGSL Shaders - Frogger
 * Retro Pixel / Pond Nature / Blue-Green Theme
 * Game #154
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

fn fbm(p: vec2f) -> f32 {
  var value = 0.0;
  var amplitude = 0.5;
  var p2 = p;

  for (var i = 0; i < 4; i++) {
    value += amplitude * noise(p2);
    p2 *= 2.0;
    amplitude *= 0.5;
  }

  return value;
}

fn waterRipple(uv: vec2f, time: f32) -> f32 {
  var ripple = 0.0;

  // Multiple ripple centers
  for (var i = 0; i < 5; i++) {
    let fi = f32(i);
    let center = vec2f(
      0.2 + fi * 0.15 + sin(time * 0.3 + fi) * 0.05,
      0.3 + sin(time * 0.2 + fi * 2.0) * 0.2
    );
    let dist = distance(uv, center);
    let wave = sin(dist * 30.0 - time * 3.0 + fi * 1.5) * exp(-dist * 3.0);
    ripple += wave * 0.15;
  }

  return ripple;
}

fn lilyPadPattern(uv: vec2f, time: f32) -> f32 {
  var pattern = 0.0;

  // Grid of lily pads
  let gridUv = fract(uv * 6.0);
  let gridId = floor(uv * 6.0);

  let offset = vec2f(
    sin(gridId.y * 3.14 + time * 0.5) * 0.1,
    cos(gridId.x * 2.71 + time * 0.4) * 0.1
  );

  let center = vec2f(0.5, 0.5) + offset;
  let dist = distance(gridUv, center);

  // Only show in "water" zone (upper part of screen)
  if (uv.y > 0.45 && uv.y < 0.85) {
    // Circular lily pad with notch
    let angle = atan2(gridUv.y - center.y, gridUv.x - center.x);
    let notch = smoothstep(-0.1, 0.1, sin(angle * 0.5));

    if (dist < 0.15 * notch && hash(gridId) > 0.6) {
      pattern = smoothstep(0.15, 0.1, dist);
    }
  }

  return pattern;
}

fn roadLines(uv: vec2f, time: f32) -> f32 {
  // Road in the middle-lower section
  if (uv.y < 0.1 || uv.y > 0.45) {
    return 0.0;
  }

  // Moving dashed lines
  let lineY = fract((uv.y - 0.1) * 14.0);
  let isLine = step(0.45, lineY) * step(lineY, 0.55);

  // Dashes moving with traffic
  let dashX = fract(uv.x * 10.0 + time * 0.5);
  let isDash = step(0.3, dashX) * step(dashX, 0.7);

  return isLine * isDash;
}

@fragment
fn fs_main(input: VertexOutput) -> @location(0) vec4f {
  let uv = input.uv;
  let time = uniforms.time;

  // Base colors for different zones
  let waterColor = vec3f(0.10, 0.45, 0.68);
  let waterLight = vec3f(0.25, 0.58, 0.78);
  let grassColor = vec3f(0.15, 0.55, 0.34);
  let roadColor = vec3f(0.15, 0.17, 0.18);
  let safeColor = vec3f(0.18, 0.60, 0.40);

  var color = vec3f(0.0);

  // Goal zone (top)
  if (uv.y > 0.92) {
    let glow = sin(time * 2.0) * 0.1 + 0.9;
    color = grassColor * glow;

    // Goal spots
    let goalX = fract(uv.x * 5.0);
    let goalDist = distance(vec2f(goalX, (uv.y - 0.92) * 12.5), vec2f(0.5, 0.5));
    if (goalDist < 0.35) {
      let pulse = sin(time * 3.0 + uv.x * 10.0) * 0.15 + 0.85;
      color = vec3f(0.95, 0.77, 0.06) * pulse;
    }
  }
  // Water zone (upper middle)
  else if (uv.y > 0.45) {
    // Animated water with ripples
    let ripple = waterRipple(uv, time);
    let waterNoise = fbm(uv * 5.0 + vec2f(time * 0.2, 0.0));

    color = mix(waterColor, waterLight, waterNoise * 0.5 + ripple);

    // Add subtle wave lines
    let waveLine = sin(uv.x * 40.0 + time * 2.0 + uv.y * 20.0) * 0.5 + 0.5;
    color += vec3f(0.1, 0.15, 0.2) * waveLine * 0.1;

    // Lily pads
    let lilyPad = lilyPadPattern(uv, time);
    if (lilyPad > 0.0) {
      let lilyColor = vec3f(0.15, 0.50, 0.28);
      let lilyHighlight = vec3f(0.22, 0.62, 0.38);
      color = mix(color, mix(lilyColor, lilyHighlight, lilyPad), lilyPad * 0.8);
    }
  }
  // Safe zone (middle)
  else if (uv.y > 0.40 && uv.y < 0.45) {
    let grassNoise = noise(uv * 30.0);
    color = mix(safeColor, safeColor * 1.2, grassNoise * 0.3);
  }
  // Road zone (lower middle)
  else if (uv.y > 0.08) {
    color = roadColor;

    // Road noise/texture
    let roadNoise = noise(uv * 50.0) * 0.1;
    color += vec3f(roadNoise);

    // Yellow dashed lines
    let lines = roadLines(uv, time);
    color = mix(color, vec3f(0.95, 0.77, 0.06), lines * 0.8);
  }
  // Start zone (bottom)
  else {
    let grassNoise = noise(uv * 20.0 + vec2f(time * 0.1, 0.0));
    color = mix(grassColor, grassColor * 1.3, grassNoise * 0.2);

    // Some grass texture
    let grassDetail = noise(uv * 100.0);
    color *= 0.9 + grassDetail * 0.2;
  }

  // Ambient glow from water
  let waterGlow = smoothstep(0.85, 0.45, uv.y) * smoothstep(0.08, 0.45, uv.y);
  color += vec3f(0.02, 0.08, 0.12) * waterGlow * (sin(time) * 0.2 + 0.8);

  // Subtle vignette
  let vignette = 1.0 - length(uv - 0.5) * 0.5;
  color *= vignette;

  return vec4f(color, 0.85);
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

  if (pType == 0u) { // frogHop - bounce effect
    sizeMultiplier = 1.0 + sin(lifeRatio * 3.14159) * 0.5;
  } else if (pType == 1u) { // splash - expand then fade
    sizeMultiplier = 1.0 + (1.0 - lifeRatio) * 2.0;
  } else if (pType == 2u) { // carHit - flash
    sizeMultiplier = 1.0 + sin(lifeRatio * 6.28) * 0.3;
  } else if (pType == 3u) { // goalReach - expand celebration
    sizeMultiplier = lifeRatio * 2.0 + 0.5;
  } else if (pType == 4u) { // logRide - subtle ripple
    sizeMultiplier = 0.8 + sin(uniforms.time * 5.0) * 0.2;
  } else if (pType == 5u) { // gameOver - dramatic
    sizeMultiplier = 1.0 + (1.0 - lifeRatio) * 3.0;
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

  if (pType == 0u) { // frogHop - frog feet prints
    let footprint = smoothstep(0.6, 0.4, dist);
    alpha *= footprint * input.life;
  }
  else if (pType == 1u) { // splash - water ring
    let ring = smoothstep(0.5, 0.45, dist) * smoothstep(0.3, 0.35, dist);
    let ripple = sin(dist * 15.0 - uniforms.time * 8.0) * 0.5 + 0.5;
    alpha *= (ring + ripple * 0.3) * input.life;
  }
  else if (pType == 2u) { // carHit - danger flash
    let flash = smoothstep(0.7, 0.0, dist);
    let pulse = sin(uniforms.time * 20.0) * 0.5 + 0.5;
    color = mix(color, vec3f(1.0, 0.3, 0.2), pulse);
    alpha *= flash * input.life;
  }
  else if (pType == 3u) { // goalReach - star burst
    let angle = atan2(input.uv.y - 0.5, input.uv.x - 0.5);
    let star = abs(sin(angle * 5.0)) * 0.3 + 0.7;
    let glow = smoothstep(0.6, 0.2, dist * star);
    color += vec3f(0.3, 0.2, 0.0) * (1.0 - input.life);
    alpha *= glow * input.life;
  }
  else if (pType == 4u) { // logRide - wood grain effect
    let grain = sin(input.uv.x * 20.0 + input.uv.y * 5.0) * 0.1 + 0.9;
    alpha *= smoothstep(0.6, 0.4, dist) * grain * input.life;
  }
  else if (pType == 5u) { // gameOver - skull/danger
    let skull = smoothstep(0.6, 0.3, dist);
    let pulse = sin(uniforms.time * 8.0) * 0.3 + 0.7;
    color = mix(color, vec3f(0.1, 0.1, 0.1), 1.0 - input.life);
    alpha *= skull * pulse * input.life;
  }
  else { // ambient bubbles
    let bubble = smoothstep(0.5, 0.3, dist);
    let shimmer = sin(uniforms.time * 3.0 + dist * 10.0) * 0.2 + 0.8;
    alpha *= bubble * shimmer * input.life * 0.5;
  }

  return vec4f(color, alpha);
}
`;
