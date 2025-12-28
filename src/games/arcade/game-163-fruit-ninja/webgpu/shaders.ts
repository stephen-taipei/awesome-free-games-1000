/**
 * WGSL Shaders - Fruit Ninja
 * Ninja / Dojo / Dark Red and Black Theme
 * Game #163
 */

export const BACKGROUND_SHADER = /* wgsl */ `
struct Uniforms {
  time: f32,
  aspectRatio: f32,
  level: f32,
  intensity: f32,
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
  var p3 = fract(vec3f(p.x, p.y, p.x) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
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

fn woodGrain(uv: vec2f, time: f32) -> f32 {
  let p = uv * 8.0;
  var grain = 0.0;
  grain += sin(p.y * 20.0 + noise(p * 2.0) * 5.0) * 0.1;
  grain += sin(p.y * 40.0 + noise(p * 4.0) * 3.0) * 0.05;
  grain += noise(p * 10.0) * 0.1;
  return grain * 0.5 + 0.5;
}

fn bambooPattern(uv: vec2f) -> f32 {
  let segments = 8.0;
  let x = uv.x * segments;
  let segment = floor(x);
  let fx = fract(x);

  // Bamboo stalk
  let stalk = smoothstep(0.35, 0.4, fx) * (1.0 - smoothstep(0.6, 0.65, fx));

  // Joints
  let jointY = fract(uv.y * 4.0 + segment * 0.3);
  let joint = smoothstep(0.0, 0.05, jointY) * (1.0 - smoothstep(0.08, 0.13, jointY));

  return stalk * (1.0 - joint * 0.3);
}

fn kanji(uv: vec2f, time: f32) -> f32 {
  // Abstract kanji-like pattern
  let scale = 6.0;
  let p = uv * scale;
  let cell = floor(p);
  let f = fract(p);

  let h = hash(cell);

  // Simple strokes
  var stroke = 0.0;
  if (h > 0.7) {
    // Horizontal stroke
    stroke = smoothstep(0.45, 0.48, f.y) * (1.0 - smoothstep(0.52, 0.55, f.y));
  } else if (h > 0.4) {
    // Vertical stroke
    stroke = smoothstep(0.45, 0.48, f.x) * (1.0 - smoothstep(0.52, 0.55, f.x));
  } else if (h > 0.2) {
    // Diagonal
    let diag = abs(f.x - f.y);
    stroke = smoothstep(0.08, 0.05, diag);
  }

  return stroke * 0.15;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  let uv = input.uv;
  let time = uniforms.time;
  let intensity = uniforms.intensity;

  // Dark dojo background gradient
  let bgTop = vec3f(0.10, 0.10, 0.18);
  let bgMid = vec3f(0.09, 0.13, 0.24);
  let bgBot = vec3f(0.12, 0.10, 0.15);

  var bgColor: vec3f;
  if (uv.y > 0.5) {
    bgColor = mix(bgMid, bgTop, (uv.y - 0.5) * 2.0);
  } else {
    bgColor = mix(bgBot, bgMid, uv.y * 2.0);
  }

  // Wood floor at bottom
  let woodArea = smoothstep(0.25, 0.15, uv.y);
  let woodColor = vec3f(0.36, 0.25, 0.18);
  let grain = woodGrain(uv, time);
  let woodWithGrain = woodColor * (0.8 + grain * 0.4);
  bgColor = mix(bgColor, woodWithGrain, woodArea);

  // Bamboo wall pattern (subtle)
  let bamboo = bambooPattern(uv);
  let bambooColor = vec3f(0.25, 0.35, 0.20);
  let wallArea = (1.0 - woodArea) * 0.3;
  bgColor = mix(bgColor, bambooColor, bamboo * wallArea * 0.4);

  // Floating kanji characters
  let kanjiValue = kanji(uv + vec2f(time * 0.01, 0.0), time);
  bgColor += vec3f(0.8, 0.2, 0.2) * kanjiValue;

  // Subtle red accents - ninja theme
  let redGlow = smoothstep(0.7, 0.0, length(uv - vec2f(0.5, 0.5)));
  bgColor += vec3f(0.4, 0.05, 0.05) * redGlow * 0.15 * (1.0 + sin(time * 0.5) * 0.2);

  // Edge shadows
  let vignette = smoothstep(0.0, 0.5, min(uv.x, min(1.0 - uv.x, min(uv.y, 1.0 - uv.y))));
  bgColor *= 0.6 + vignette * 0.4;

  // Intensity pulse (when slicing)
  bgColor *= 1.0 + intensity * 0.3;
  bgColor += vec3f(0.8, 0.1, 0.1) * intensity * 0.1;

  return vec4f(bgColor, 0.4 + intensity * 0.2);
}
`;

export const PARTICLE_SHADER = /* wgsl */ `
struct Uniforms {
  time: f32,
  aspectRatio: f32,
  level: f32,
  intensity: f32,
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
  let pType = particle.particleType;

  // 0: slice, 1: juice, 2: explosion, 3: missed, 4: combo, 5: gameOver
  if (pType < 0.5) {
    // Slice - blade trail, fades quickly
    size *= 0.3 + lifeRatio * 0.7;
  } else if (pType < 1.5) {
    // Juice - splatter droplets
    size *= 1.0 + sin(lifeRatio * 3.14159) * 0.3;
  } else if (pType < 2.5) {
    // Explosion - bomb hit
    size *= 1.5 + (1.0 - lifeRatio) * 0.5;
  } else if (pType < 3.5) {
    // Missed - sad fall
    size *= 0.8 + lifeRatio * 0.2;
  } else if (pType < 4.5) {
    // Combo - sparkle burst
    size *= 1.0 + sin(uniforms.time * 10.0 + lifeRatio * 6.28) * 0.3;
  } else {
    // Game over - slow pulse
    size *= 1.2 + sin(uniforms.time * 3.0) * 0.4;
  }

  let aspectCorrection = vec2f(1.0 / uniforms.aspectRatio, 1.0);
  let worldPos = particle.position + corner * size * 0.02 * aspectCorrection;

  var output: VertexOutput;
  output.position = vec4f(worldPos * 2.0 - 1.0, 0.0, 1.0);
  output.color = particle.color;
  output.uv = corner;
  output.particleType = particle.particleType;
  output.life = lifeRatio;

  return output;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  let uv = input.uv;
  let dist = length(uv);
  let pType = input.particleType;
  let life = input.life;

  var alpha = input.color.a;
  var color = input.color.rgb;

  // 0: slice, 1: juice, 2: explosion, 3: missed, 4: combo, 5: gameOver
  if (pType < 0.5) {
    // Slice - sharp blade trail
    let streak = max(0.0, 1.0 - abs(uv.y) * 3.0);
    let fade = smoothstep(1.0, 0.0, abs(uv.x));
    alpha *= streak * fade * life;
    color += vec3f(0.5, 0.5, 0.5) * (1.0 - dist);
  } else if (pType < 1.5) {
    // Juice - liquid droplets
    let shape = smoothstep(1.0, 0.3, dist);
    let wobble = sin(dist * 10.0 + uniforms.time * 5.0) * 0.1;
    alpha *= shape * (1.0 + wobble);
    color *= 1.2;
  } else if (pType < 2.5) {
    // Explosion - fiery burst
    let fireShape = smoothstep(1.0, 0.0, dist);
    let flicker = sin(dist * 15.0 - uniforms.time * 10.0) * 0.3 + 0.7;
    alpha *= fireShape * flicker;
    color = mix(color, vec3f(1.0, 0.5, 0.0), (1.0 - life) * 0.5);
  } else if (pType < 3.5) {
    // Missed - fading circles
    let shape = smoothstep(0.9, 0.6, dist);
    alpha *= shape * life * 0.6;
    color *= 0.7;
  } else if (pType < 4.5) {
    // Combo - star sparkle
    let angle = atan2(uv.y, uv.x);
    let star = abs(sin(angle * 4.0)) * 0.4 + 0.6;
    let shape = smoothstep(star, 0.2, dist);
    alpha *= shape;
    color += vec3f(0.3, 0.2, 0.0) * (1.0 - dist);
  } else {
    // Game over - soft glow
    let shape = exp(-dist * 2.0);
    alpha *= shape;
    color += vec3f(0.2, 0.0, 0.0) * shape;
  }

  // Life fade
  alpha *= smoothstep(0.0, 0.3, life);

  if (alpha < 0.01) {
    discard;
  }

  return vec4f(color, alpha);
}
`;
