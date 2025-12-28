/**
 * WebGPU Shaders - Air Hockey
 * Arcade / Air Hockey / Blue and Red Neon Theme
 * Game #168
 */

export const BACKGROUND_SHADER = /* wgsl */ `
struct Uniforms {
  time: f32,
  resolution: vec2f,
  level: f32,
  padding: f32,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;

struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) uv: vec2f,
}

@vertex
fn vertexMain(@builtin(vertex_index) vertexIndex: u32) -> VertexOutput {
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
  let kp = p * k + k.yx;
  return fract(16.0 * k.x * fract(kp.x * kp.y * (kp.x + kp.y)));
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

// Air hockey table surface pattern
fn tableSurface(uv: vec2f, time: f32) -> f32 {
  let n1 = noise(uv * 50.0);
  let n2 = noise(uv * 80.0 + 0.5);
  return 0.95 + n1 * 0.03 + n2 * 0.02;
}

// Neon glow effect
fn neonGlow(uv: vec2f, center: vec2f, radius: f32, intensity: f32) -> f32 {
  let d = distance(uv, center);
  return smoothstep(radius, radius * 0.3, d) * intensity;
}

// Pulsing effect
fn pulse(time: f32, speed: f32) -> f32 {
  return 0.8 + sin(time * speed) * 0.2;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  let uv = input.uv;
  let time = uniforms.time;

  // Base table color - dark blue
  let tableBase = vec3f(0.08, 0.15, 0.25);
  let tableLight = vec3f(0.12, 0.25, 0.4);

  // Table surface with texture
  let surface = tableSurface(uv, time);
  var bg = mix(tableBase, tableLight, uv.y * 0.3) * surface;

  // Center line (dashed)
  let centerY = abs(uv.y - 0.5);
  let dash = step(0.5, fract(uv.x * 20.0));
  let centerLine = smoothstep(0.008, 0.003, centerY) * dash;
  bg += vec3f(1.0, 1.0, 1.0) * centerLine * 0.3;

  // Center circle
  let centerDist = distance(uv, vec2f(0.5, 0.5));
  let centerCircle = smoothstep(0.12, 0.11, centerDist) - smoothstep(0.11, 0.10, centerDist);
  bg += vec3f(1.0, 1.0, 1.0) * centerCircle * 0.4;

  // Goal areas glow
  let goalWidth = 0.25;
  let goalLeft = 0.5 - goalWidth / 2.0;
  let goalRight = 0.5 + goalWidth / 2.0;

  // Top goal (CPU)
  if (uv.y > 0.95 && uv.x > goalLeft && uv.x < goalRight) {
    let goalGlow = smoothstep(0.98, 0.95, uv.y);
    bg += vec3f(0.9, 0.3, 0.2) * goalGlow * 0.5;
  }

  // Bottom goal (Player)
  if (uv.y < 0.05 && uv.x > goalLeft && uv.x < goalRight) {
    let goalGlow = smoothstep(0.02, 0.05, uv.y);
    bg += vec3f(0.2, 0.6, 0.9) * goalGlow * 0.5;
  }

  // Goal edge neon lights
  let goalEdgeLeft = smoothstep(0.02, 0.0, abs(uv.x - goalLeft)) *
                     (step(uv.y, 0.05) + step(0.95, uv.y));
  let goalEdgeRight = smoothstep(0.02, 0.0, abs(uv.x - goalRight)) *
                      (step(uv.y, 0.05) + step(0.95, uv.y));
  let edgePulse = pulse(time, 3.0);
  bg += vec3f(1.0, 0.2, 0.4) * (goalEdgeLeft + goalEdgeRight) * 0.6 * edgePulse;

  // Side rail neon glow
  let leftRail = smoothstep(0.02, 0.0, uv.x);
  let rightRail = smoothstep(0.98, 1.0, uv.x);
  let railPulse = pulse(time, 2.0);
  bg += vec3f(0.2, 0.8, 1.0) * (leftRail + rightRail) * 0.3 * railPulse;

  // Corner neon accents
  let corners = array<vec2f, 4>(
    vec2f(0.05, 0.05),
    vec2f(0.95, 0.05),
    vec2f(0.05, 0.95),
    vec2f(0.95, 0.95)
  );

  for (var i = 0; i < 4; i++) {
    let cornerGlow = neonGlow(uv, corners[i], 0.08, 0.4);
    let cornerColor = select(vec3f(0.2, 0.8, 1.0), vec3f(1.0, 0.3, 0.5), i >= 2);
    bg += cornerColor * cornerGlow * pulse(time + f32(i), 2.5);
  }

  // Air hole pattern
  let holeGrid = floor(uv * vec2f(15.0, 20.0));
  let holeFrac = fract(uv * vec2f(15.0, 20.0));
  let holeDist = distance(holeFrac, vec2f(0.5, 0.5));
  let holes = smoothstep(0.1, 0.05, holeDist) * 0.03;
  bg -= vec3f(holes);

  // Atmospheric glow from center
  let atmGlow = smoothstep(0.5, 0.2, centerDist) * 0.08;
  bg += vec3f(0.3, 0.5, 0.8) * atmGlow;

  // Scanline effect (subtle)
  let scanline = sin(uv.y * 400.0) * 0.02;
  bg -= vec3f(scanline);

  // Vignette
  let vignette = 1.0 - length((uv - 0.5) * 1.4) * 0.3;
  bg *= vignette;

  return vec4f(bg, 0.85);
}
`;

export const PARTICLE_SHADER = /* wgsl */ `
struct Uniforms {
  time: f32,
  resolution: vec2f,
  level: f32,
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
  let pType = i32(particle.particleType);

  // Type-specific size behavior
  if (pType == 0) {
    // Hit - burst outward
    size *= 1.5 - lifeRatio * 0.5;
  } else if (pType == 1) {
    // Wall bounce - spark
    size *= lifeRatio;
  } else if (pType == 2) {
    // Goal - celebration
    size *= 1.8 - lifeRatio * 0.5;
  } else if (pType == 3) {
    // Puck trail
    size *= lifeRatio * 0.8;
  } else if (pType == 4) {
    // Spark
    size *= 0.5 + lifeRatio * 0.5;
  } else if (pType == 5) {
    // Game over confetti
    size *= 0.8 + sin(uniforms.time * 8.0 + f32(instanceIndex)) * 0.3;
  }

  let worldPos = particle.position + corner * size * 0.02;
  let clipPos = worldPos * 2.0 - 1.0;

  var output: VertexOutput;
  output.position = vec4f(clipPos.x, -clipPos.y, 0.0, 1.0);
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
  let dist = distance(uv, center);
  let pType = i32(input.particleType);

  var alpha = input.color.a;
  var color = input.color.rgb;

  if (pType == 0) {
    // Hit - ring burst
    let ring = smoothstep(0.5, 0.35, dist) - smoothstep(0.3, 0.15, dist);
    let core = smoothstep(0.2, 0.0, dist);
    alpha *= (ring + core * 0.5) * input.life;
    color += vec3f(0.2, 0.2, 0.3) * core;
  } else if (pType == 1) {
    // Wall bounce - electric spark
    let angle = atan2(uv.y - 0.5, uv.x - 0.5);
    let rays = abs(sin(angle * 6.0 + uniforms.time * 10.0));
    let spark = smoothstep(0.5, 0.1, dist) * (0.3 + rays * 0.7);
    alpha *= spark * input.life;
  } else if (pType == 2) {
    // Goal - star burst
    let angle = atan2(uv.y - 0.5, uv.x - 0.5);
    let rays = abs(sin(angle * 8.0));
    let star = smoothstep(0.5, 0.1, dist) * (0.4 + rays * 0.6);
    let glow = smoothstep(0.6, 0.0, dist) * 0.4;
    alpha *= (star + glow) * input.life;
    color += vec3f(0.3, 0.2, 0.0) * glow;
  } else if (pType == 3) {
    // Puck trail - soft circle
    let trail = smoothstep(0.5, 0.0, dist);
    alpha *= trail * input.life * 0.6;
  } else if (pType == 4) {
    // Spark - point with rays
    let spark = smoothstep(0.4, 0.0, dist);
    let flicker = 0.5 + sin(uniforms.time * 20.0 + dist * 15.0) * 0.5;
    alpha *= spark * flicker * input.life;
  } else if (pType == 5) {
    // Game over - confetti
    let rect = step(abs(uv.x - 0.5), 0.35) * step(abs(uv.y - 0.5), 0.4);
    let spin = sin(uniforms.time * 5.0 + input.life * 10.0);
    alpha *= rect * (0.6 + spin * 0.4);
  }

  // Neon glow effect
  let neonGlow = smoothstep(0.6, 0.0, dist) * 0.2 * input.life;
  color += color * neonGlow;

  return vec4f(color, alpha);
}
`;
