/**
 * WebGPU Shaders - Candy Factory
 * Sweet Factory / Industrial Production Line Theme
 * Game #075
 */

export const BACKGROUND_SHADER = /* wgsl */ `
struct Uniforms {
  time: f32,
  width: f32,
  height: f32,
  isRunning: f32,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;

struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) uv: vec2f,
}

@vertex
fn vertexMain(@builtin(vertex_index) vertexIndex: u32) -> VertexOutput {
  var positions = array<vec2f, 4>(
    vec2f(-1.0, -1.0),
    vec2f(1.0, -1.0),
    vec2f(-1.0, 1.0),
    vec2f(1.0, 1.0)
  );

  var output: VertexOutput;
  output.position = vec4f(positions[vertexIndex], 0.0, 1.0);
  output.uv = positions[vertexIndex] * 0.5 + 0.5;
  return output;
}

fn hash(p: vec2f) -> f32 {
  var p3 = fract(vec3f(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
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

// Conveyor belt pattern
fn conveyorBelt(uv: vec2f, time: f32) -> f32 {
  let stripeWidth = 0.02;
  let speed = 2.0;
  let stripe = fract((uv.x + time * speed) * 20.0);
  return step(0.7, stripe) * 0.3;
}

// Steam/smoke effect
fn steamEffect(uv: vec2f, time: f32) -> f32 {
  let pos = uv * 5.0 + vec2f(0.0, -time * 0.5);
  let n = noise(pos) * noise(pos * 2.0 + time);
  let fade = smoothstep(0.8, 0.2, uv.y);
  return n * fade * 0.15;
}

// Gear pattern
fn gearPattern(uv: vec2f, center: vec2f, radius: f32, time: f32) -> f32 {
  let p = uv - center;
  let dist = length(p);
  let angle = atan2(p.y, p.x) + time;
  let teeth = sin(angle * 8.0) * 0.5 + 0.5;

  if (dist < radius * 0.3) {
    return 0.4;
  }
  if (dist < radius && dist > radius * 0.6) {
    return teeth * 0.5;
  }
  return 0.0;
}

// Industrial lighting
fn industrialLight(uv: vec2f, time: f32) -> vec3f {
  // Multiple overhead lights
  var light = vec3f(0.0);

  for (var i = 0; i < 3; i++) {
    let lightX = 0.25 + f32(i) * 0.25;
    let dist = length(uv - vec2f(lightX, 0.1));
    let flicker = sin(time * 20.0 + f32(i) * 2.0) * 0.03 + 0.97;
    let intensity = exp(-dist * 4.0) * flicker;
    light += vec3f(1.0, 0.9, 0.7) * intensity * 0.3;
  }

  return light;
}

// Candy wrapper shine
fn candyShine(uv: vec2f, time: f32) -> f32 {
  let shine = sin(uv.x * 50.0 + time * 3.0) * sin(uv.y * 50.0 - time * 2.0);
  return max(0.0, shine) * 0.1;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  let uv = input.uv;
  let aspect = uniforms.width / uniforms.height;

  // Base industrial gradient
  let baseColor = mix(
    vec3f(0.12, 0.16, 0.2),
    vec3f(0.17, 0.24, 0.31),
    uv.y
  );

  var color = baseColor;

  // Add conveyor belt pattern if running
  if (uniforms.isRunning > 0.5) {
    let conveyor = conveyorBelt(uv, uniforms.time);
    color += vec3f(0.3, 0.3, 0.35) * conveyor;
  }

  // Add gear patterns
  let gear1 = gearPattern(uv, vec2f(0.1, 0.9), 0.08, uniforms.time);
  let gear2 = gearPattern(uv, vec2f(0.9, 0.9), 0.06, -uniforms.time * 1.2);
  color += vec3f(0.4, 0.35, 0.3) * (gear1 + gear2);

  // Industrial lighting
  color += industrialLight(uv, uniforms.time);

  // Steam effect at top
  let steam = steamEffect(uv, uniforms.time);
  color += vec3f(0.8, 0.8, 0.85) * steam;

  // Candy wrapper shine
  let shine = candyShine(uv, uniforms.time);
  color += vec3f(1.0, 0.95, 0.9) * shine;

  // Factory edge shadows
  let shadowLeft = smoothstep(0.0, 0.15, uv.x);
  let shadowRight = smoothstep(1.0, 0.85, uv.x);
  let shadowTop = smoothstep(0.0, 0.1, uv.y);
  let shadowBottom = smoothstep(1.0, 0.9, uv.y);
  color *= shadowLeft * shadowRight * shadowTop * shadowBottom;

  // Machine pulse when running
  if (uniforms.isRunning > 0.5) {
    let pulse = sin(uniforms.time * 10.0) * 0.02 + 1.0;
    color *= pulse;
  }

  // Slight warm tint
  color = mix(color, color * vec3f(1.1, 1.0, 0.9), 0.2);

  return vec4f(color, 1.0);
}
`;

export const PARTICLE_SHADER = /* wgsl */ `
struct Uniforms {
  time: f32,
  width: f32,
  height: f32,
  isRunning: f32,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;

struct VertexInput {
  @location(0) position: vec2f,
  @location(1) size: f32,
  @location(2) color: vec4f,
  @location(3) rotation: f32,
  @location(4) particleType: f32,
  @location(5) life: f32,
}

struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) uv: vec2f,
  @location(1) color: vec4f,
  @location(2) particleType: f32,
  @location(3) life: f32,
}

@vertex
fn vertexMain(
  input: VertexInput,
  @builtin(vertex_index) vertexIndex: u32
) -> VertexOutput {
  var corners = array<vec2f, 4>(
    vec2f(-1.0, -1.0),
    vec2f(1.0, -1.0),
    vec2f(-1.0, 1.0),
    vec2f(1.0, 1.0)
  );

  let corner = corners[vertexIndex];
  let size = input.size / max(uniforms.width, uniforms.height);

  let cos_r = cos(input.rotation);
  let sin_r = sin(input.rotation);
  let rotated = vec2f(
    corner.x * cos_r - corner.y * sin_r,
    corner.x * sin_r + corner.y * cos_r
  );

  var output: VertexOutput;
  output.position = vec4f(
    input.position + rotated * size,
    0.0,
    1.0
  );
  output.uv = corner;
  output.color = input.color;
  output.particleType = input.particleType;
  output.life = input.life;
  return output;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  let uv = input.uv;
  let dist = length(uv);
  let pType = i32(input.particleType);

  var alpha = 0.0;
  var color = input.color.rgb;

  // Type 0: candy - round glossy candy
  if (pType == 0) {
    let core = smoothstep(1.0, 0.5, dist);
    let highlight = smoothstep(0.5, 0.2, length(uv - vec2f(-0.3, -0.3)));
    alpha = core * input.color.a;
    color = mix(color, vec3f(1.0), highlight * 0.4);
  }
  // Type 1: spark - mechanical spark
  else if (pType == 1) {
    let star = max(
      exp(-abs(uv.x) * 10.0) * exp(-abs(uv.y) * 3.0),
      exp(-abs(uv.x) * 3.0) * exp(-abs(uv.y) * 10.0)
    );
    let twinkle = sin(uniforms.time * 15.0 + input.life * 20.0) * 0.3 + 0.7;
    alpha = star * twinkle * input.color.a;
    color = mix(color, vec3f(1.0, 0.9, 0.6), 0.5);
  }
  // Type 2: steam - rising steam
  else if (pType == 2) {
    let cloud = exp(-dist * 1.5);
    let drift = sin(uv.x * 3.0 + uniforms.time * 2.0) * 0.1;
    alpha = cloud * (0.5 + drift) * input.color.a;
    color = vec3f(0.9, 0.9, 0.95);
  }
  // Type 3: gear - small gear cog
  else if (pType == 3) {
    let angle = atan2(uv.y, uv.x) + uniforms.time * 3.0;
    let teeth = sin(angle * 6.0) * 0.5 + 0.5;
    let ring = abs(dist - 0.6);
    let center = smoothstep(0.25, 0.2, dist);
    let gearShape = smoothstep(0.15, 0.0, ring) * teeth + center;
    alpha = gearShape * input.color.a;
    color = vec3f(0.5, 0.45, 0.4);
  }
  // Type 4: sweet - sugar crystal
  else if (pType == 4) {
    let crystal = max(
      abs(uv.x) + abs(uv.y),
      max(abs(uv.x), abs(uv.y)) * 1.4
    );
    let shape = smoothstep(1.0, 0.7, crystal);
    let sparkle = sin(uniforms.time * 8.0 + input.life * 15.0) * 0.3 + 0.7;
    alpha = shape * sparkle * input.color.a;
    color = mix(color, vec3f(1.0), 0.6);
  }
  // Type 5: conveyor - moving belt segment
  else if (pType == 5) {
    let stripe = sin((uv.x + uniforms.time * 5.0) * 8.0) * 0.5 + 0.5;
    let belt = smoothstep(1.0, 0.5, abs(uv.y) * 2.0);
    alpha = belt * (0.7 + stripe * 0.3) * input.color.a;
    color = vec3f(0.35, 0.35, 0.4);
  }

  // Life fade
  let lifeFade = smoothstep(0.0, 0.2, input.life);
  alpha *= lifeFade;

  if (alpha < 0.01) {
    discard;
  }

  return vec4f(color, alpha);
}
`;
