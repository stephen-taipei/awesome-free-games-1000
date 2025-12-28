/**
 * WebGPU Shaders - Combination Lock
 * Vault / Safe-Cracking / Heist Night Theme
 * Game #100
 */

export const BACKGROUND_SHADER = `
struct Uniforms {
  time: f32,
  width: f32,
  height: f32,
  intensity: f32,
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
    vec2f(-1.0, 1.0),
    vec2f(-1.0, 1.0),
    vec2f(1.0, -1.0),
    vec2f(1.0, 1.0)
  );

  var output: VertexOutput;
  output.position = vec4f(positions[vertexIndex], 0.0, 1.0);
  output.uv = positions[vertexIndex] * 0.5 + 0.5;
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

fn vaultDoor(uv: vec2f, time: f32) -> vec3f {
  let aspect = uniforms.width / uniforms.height;
  let p = vec2f((uv.x - 0.5) * aspect, uv.y - 0.5);

  // Vault door circle
  let dist = length(p);
  var color = vec3f(0.12, 0.14, 0.18);

  // Steel texture
  let steelNoise = noise(uv * 30.0) * 0.1;
  color += vec3f(steelNoise);

  // Vault rings
  let ring1 = smoothstep(0.32, 0.31, abs(dist - 0.3));
  let ring2 = smoothstep(0.27, 0.26, abs(dist - 0.25));
  let ring3 = smoothstep(0.22, 0.21, abs(dist - 0.2));

  let goldColor = vec3f(0.84, 0.62, 0.18);
  let chromeColor = vec3f(0.63, 0.68, 0.75);

  color = mix(color, chromeColor, ring1 * 0.5);
  color = mix(color, goldColor, ring2 * 0.6);
  color = mix(color, chromeColor, ring3 * 0.4);

  // Center mechanism
  if (dist < 0.15) {
    let angle = atan2(p.y, p.x);
    let teeth = 12.0;
    let gear = sin(angle * teeth + time * 0.5) * 0.5 + 0.5;
    color = mix(vec3f(0.2, 0.22, 0.28), goldColor, gear * 0.3);

    // Keyhole
    if (dist < 0.03) {
      color = vec3f(0.05, 0.05, 0.08);
    }
  }

  // Shine sweep
  let sweep = sin(time * 0.3) * 0.5 + 0.5;
  let shinePos = uv.x - sweep;
  let shine = exp(-shinePos * shinePos * 20.0) * 0.2;
  color += vec3f(shine);

  return color;
}

fn securityLasers(uv: vec2f, time: f32) -> vec3f {
  var lasers = vec3f(0.0);
  let laserColor = vec3f(0.9, 0.2, 0.2);

  // Multiple horizontal laser beams
  for (var i = 0; i < 3; i++) {
    let phase = time * 1.5 + f32(i) * 2.1;
    let y = sin(phase) * 0.15 + 0.3 + f32(i) * 0.2;
    let dist = abs(uv.y - y);
    let intensity = exp(-dist * 300.0) * 0.6;

    // Beam glow
    let glow = exp(-dist * 50.0) * 0.2;
    lasers += laserColor * (intensity + glow);
  }

  return lasers;
}

fn spotlights(uv: vec2f, time: f32) -> vec3f {
  var light = vec3f(0.0);
  let spotColor = vec3f(0.98, 0.94, 0.54);

  // Two spotlights sweeping
  for (var i = 0; i < 2; i++) {
    let phase = time * 0.4 + f32(i) * 3.14159;
    let cx = 0.5 + sin(phase) * 0.3;
    let cy = 1.0 + f32(i) * 0.2;

    let dx = uv.x - cx;
    let dy = uv.y - cy;
    let angle = 3.14159 * 1.5; // Pointing down

    let dist = length(vec2f(dx, dy));
    let pointAngle = atan2(dy, dx);
    let angleDiff = abs(pointAngle - angle);

    if (angleDiff < 0.4 && dist < 1.0) {
      let intensity = (1.0 - dist) * (1.0 - angleDiff / 0.4) * 0.15;
      light += spotColor * intensity;
    }
  }

  return light;
}

fn dustParticles(uv: vec2f, time: f32) -> f32 {
  var dust = 0.0;

  for (var i = 0; i < 20; i++) {
    let seed = f32(i) * 1.234;
    let x = fract(hash(vec2f(seed, 0.0)) + time * 0.02 * (0.5 + hash(vec2f(seed, 1.0)) * 0.5));
    let y = fract(hash(vec2f(seed, 2.0)) - time * 0.01 * (0.5 + hash(vec2f(seed, 3.0)) * 0.5));

    let dist = length(uv - vec2f(x, y));
    dust += exp(-dist * 500.0) * 0.3;
  }

  return dust;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  let uv = input.uv;
  let time = uniforms.time;

  // Base vault door
  var color = vaultDoor(uv, time);

  // Security lasers
  color += securityLasers(uv, time) * uniforms.intensity;

  // Spotlights
  color += spotlights(uv, time);

  // Dust particles in light
  let dust = dustParticles(uv, time);
  color += vec3f(dust * 0.5);

  // Vignette
  let vignette = 1.0 - length((uv - 0.5) * 1.2);
  color *= smoothstep(0.0, 0.7, vignette);

  // Overall intensity
  color *= uniforms.intensity;

  return vec4f(color, 0.3);
}
`;

export const PARTICLE_SHADER = `
struct Uniforms {
  time: f32,
  width: f32,
  height: f32,
  intensity: f32,
}

struct Particle {
  x: f32,
  y: f32,
  vx: f32,
  vy: f32,
  life: f32,
  maxLife: f32,
  size: f32,
  rotation: f32,
  particleType: f32,
  extra: f32,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;
@group(0) @binding(1) var<storage, read> particles: array<Particle>;

struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) uv: vec2f,
  @location(1) life: f32,
  @location(2) particleType: f32,
  @location(3) rotation: f32,
  @location(4) extra: f32,
}

@vertex
fn vertexMain(
  @builtin(vertex_index) vertexIndex: u32,
  @builtin(instance_index) instanceIndex: u32
) -> VertexOutput {
  let particle = particles[instanceIndex];

  var corners = array<vec2f, 6>(
    vec2f(-0.5, -0.5),
    vec2f(0.5, -0.5),
    vec2f(-0.5, 0.5),
    vec2f(-0.5, 0.5),
    vec2f(0.5, -0.5),
    vec2f(0.5, 0.5)
  );

  let corner = corners[vertexIndex];
  let cos_r = cos(particle.rotation);
  let sin_r = sin(particle.rotation);
  let rotated = vec2f(
    corner.x * cos_r - corner.y * sin_r,
    corner.x * sin_r + corner.y * cos_r
  );

  let lifeRatio = particle.life / particle.maxLife;
  let size = particle.size * (0.5 + lifeRatio * 0.5);

  let worldPos = vec2f(particle.x, particle.y) + rotated * size;
  let clipPos = vec2f(
    (worldPos.x / uniforms.width) * 2.0 - 1.0,
    1.0 - (worldPos.y / uniforms.height) * 2.0
  );

  var output: VertexOutput;
  output.position = vec4f(clipPos, 0.0, 1.0);
  output.uv = corner + 0.5;
  output.life = lifeRatio;
  output.particleType = particle.particleType;
  output.rotation = particle.rotation;
  output.extra = particle.extra;
  return output;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  let uv = input.uv;
  let center = uv - 0.5;
  let dist = length(center);
  let angle = atan2(center.y, center.x);
  let pType = i32(input.particleType);

  var color: vec3f;
  var alpha: f32;

  // Type 0: Dial click - rotating gear tooth
  if (pType == 0) {
    let teeth = 8.0;
    let tooth = sin(angle * teeth + input.rotation * 2.0) * 0.5 + 0.5;
    let ring = smoothstep(0.5, 0.4, dist) * smoothstep(0.15, 0.25, dist);
    alpha = ring * tooth * input.life;
    color = mix(vec3f(0.63, 0.68, 0.75), vec3f(0.84, 0.62, 0.18), tooth);
  }
  // Type 1: Click feedback - metallic spark
  else if (pType == 1) {
    let spark = (1.0 - dist * 2.0) * smoothstep(0.0, 0.3, dist);
    alpha = max(0.0, spark) * input.life;
    color = vec3f(0.93, 0.79, 0.35);
  }
  // Type 2: Correct guess - green checkmark burst
  else if (pType == 2) {
    let ring = smoothstep(0.5, 0.4, dist) * smoothstep(0.1, 0.2, dist);
    let rays = sin(angle * 6.0) * 0.5 + 0.5;
    alpha = ring * (0.7 + rays * 0.3) * input.life;
    color = vec3f(0.28, 0.73, 0.47);
  }
  // Type 3: Wrong guess - red X burst
  else if (pType == 3) {
    let xShape = min(
      smoothstep(0.1, 0.0, abs(center.x - center.y)),
      smoothstep(0.1, 0.0, abs(center.x + center.y))
    );
    alpha = xShape * input.life * 0.8;
    color = vec3f(0.96, 0.40, 0.40);
  }
  // Type 4: Unlock - golden explosion
  else if (pType == 4) {
    let star = 1.0 - dist * 2.0;
    let points = 5.0;
    let starShape = sin(angle * points + uniforms.time * 3.0) * 0.3 + 0.7;
    alpha = max(0.0, star * starShape) * input.life;
    color = mix(vec3f(0.84, 0.62, 0.18), vec3f(0.93, 0.79, 0.35), input.life);
  }
  // Type 5: Gear particle - mechanical
  else if (pType == 5) {
    let teeth = 6.0;
    let gear = sin(angle * teeth + input.rotation) * 0.5 + 0.5;
    let circle = smoothstep(0.5, 0.35, dist);
    let hole = 1.0 - smoothstep(0.1, 0.15, dist);
    alpha = circle * gear * (1.0 - hole) * input.life;
    color = vec3f(0.4, 0.45, 0.52);
  }
  else {
    let glow = 1.0 - dist * 2.0;
    alpha = max(0.0, glow) * input.life;
    color = vec3f(0.84, 0.62, 0.18);
  }

  alpha *= uniforms.intensity;
  return vec4f(color, alpha);
}
`;
