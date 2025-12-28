/**
 * WGSL Shaders - Balloon Pop
 * Sky / Carnival / Colorful Balloons Theme
 * Game #162
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

fn fbm(p: vec2f) -> f32 {
  var value = 0.0;
  var amplitude = 0.5;
  var frequency = 1.0;
  var pv = p;

  for (var i = 0; i < 4; i++) {
    value += amplitude * noise(pv * frequency);
    amplitude *= 0.5;
    frequency *= 2.0;
  }

  return value;
}

fn cloud(uv: vec2f, time: f32) -> f32 {
  let p = uv * 3.0 + vec2f(time * 0.02, 0.0);
  var c = fbm(p);
  c = smoothstep(0.3, 0.7, c);
  return c;
}

fn drawSun(uv: vec2f, time: f32) -> vec3f {
  let sunPos = vec2f(0.85, 0.85);
  let d = distance(uv, sunPos);

  // Sun core
  var sun = smoothstep(0.12, 0.08, d);

  // Sun glow
  let glow = smoothstep(0.3, 0.0, d) * 0.4;

  // Rays
  let angle = atan2(uv.y - sunPos.y, uv.x - sunPos.x);
  let rays = sin(angle * 12.0 + time * 0.5) * 0.5 + 0.5;
  let rayGlow = smoothstep(0.25, 0.12, d) * rays * 0.3;

  let sunColor = vec3f(1.0, 0.95, 0.7);
  return sunColor * (sun + glow + rayGlow);
}

fn drawBird(uv: vec2f, offset: vec2f, time: f32, scale: f32) -> f32 {
  let p = (uv - offset) / scale;

  // Simple V-shape bird
  let wing1 = smoothstep(0.02, 0.0, abs(p.y - abs(p.x) * 0.3 + sin(time * 3.0 + offset.x * 10.0) * 0.05));
  let body = smoothstep(0.03, 0.0, length(p));

  let inRange = step(abs(p.x), 0.15) * step(abs(p.y), 0.1);
  return wing1 * inRange;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  let uv = input.uv;
  let time = uniforms.time;
  let intensity = uniforms.intensity;

  // Sky gradient - from light blue to deeper blue
  let skyTop = vec3f(0.40, 0.65, 0.92);
  let skyMid = vec3f(0.53, 0.81, 0.92);
  let skyBottom = vec3f(0.69, 0.88, 0.96);

  var skyColor: vec3f;
  if (uv.y > 0.5) {
    skyColor = mix(skyMid, skyTop, (uv.y - 0.5) * 2.0);
  } else {
    skyColor = mix(skyBottom, skyMid, uv.y * 2.0);
  }

  // Add sun
  let sun = drawSun(uv, time);
  skyColor += sun;

  // Clouds
  let cloudLayer1 = cloud(uv + vec2f(time * 0.01, 0.0), time);
  let cloudLayer2 = cloud(uv * 1.5 + vec2f(-time * 0.015, 0.2), time) * 0.7;
  let cloudLayer3 = cloud(uv * 2.0 + vec2f(time * 0.02, -0.1), time) * 0.5;

  let clouds = max(max(cloudLayer1, cloudLayer2), cloudLayer3);
  let cloudColor = vec3f(1.0, 1.0, 1.0);
  skyColor = mix(skyColor, cloudColor, clouds * 0.6 * (0.5 + uv.y * 0.5));

  // Birds in the distance
  var birds = 0.0;
  birds += drawBird(uv, vec2f(0.2 + sin(time * 0.3) * 0.1, 0.75), time, 0.03);
  birds += drawBird(uv, vec2f(0.35 + sin(time * 0.25 + 1.0) * 0.08, 0.8), time, 0.025);
  birds += drawBird(uv, vec2f(0.55 + sin(time * 0.35 + 2.0) * 0.12, 0.7), time, 0.02);

  skyColor = mix(skyColor, vec3f(0.1, 0.1, 0.15), birds * 0.8);

  // Floating balloon silhouettes in background
  let balloonFloat = sin(time * 0.5) * 0.02;
  let balloon1Pos = vec2f(0.1, 0.3 + balloonFloat);
  let balloon2Pos = vec2f(0.9, 0.4 - balloonFloat);

  let b1 = smoothstep(0.08, 0.06, length((uv - balloon1Pos) * vec2f(1.0, 1.3)));
  let b2 = smoothstep(0.06, 0.04, length((uv - balloon2Pos) * vec2f(1.0, 1.3)));

  skyColor = mix(skyColor, vec3f(0.85, 0.3, 0.35) * 0.6, b1 * 0.3);
  skyColor = mix(skyColor, vec3f(0.3, 0.5, 0.85) * 0.6, b2 * 0.3);

  // Carnival atmosphere - subtle colorful tint at edges
  let edgeGlow = smoothstep(0.3, 0.0, min(uv.x, min(1.0 - uv.x, uv.y)));
  let carnivalHue = sin(time * 0.2 + uv.x * 3.0) * 0.5 + 0.5;
  let carnivalColor = mix(vec3f(1.0, 0.7, 0.8), vec3f(0.7, 0.8, 1.0), carnivalHue);
  skyColor = mix(skyColor, carnivalColor, edgeGlow * 0.15);

  // Level-based intensity - more vibrant at higher levels
  let levelBoost = uniforms.level * 0.02;
  skyColor = skyColor * (1.0 + levelBoost);

  // Subtle vignette
  let vignette = 1.0 - smoothstep(0.5, 1.2, length(uv - 0.5) * 1.2);
  skyColor *= 0.85 + vignette * 0.15;

  return vec4f(skyColor, 0.4 + intensity * 0.2);
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

  // Size based on particle type
  var size = particle.size;
  let pType = particle.particleType;

  // 0: pop, 1: shoot, 2: bonusPop, 3: escaped, 4: confetti, 5: gameOver
  if (pType < 0.5) {
    // Pop - expand then shrink
    size *= 1.0 + sin(lifeRatio * 3.14159) * 0.8;
  } else if (pType < 1.5) {
    // Shoot - trail effect
    size *= 0.5 + lifeRatio * 0.5;
  } else if (pType < 2.5) {
    // Bonus pop - sparkle expand
    size *= 1.2 + sin(lifeRatio * 6.28) * 0.4;
  } else if (pType < 3.5) {
    // Escaped - fade up
    size *= 0.8 + (1.0 - lifeRatio) * 0.4;
  } else if (pType < 4.5) {
    // Confetti - tumble
    let tumble = sin(uniforms.time * 8.0 + particle.position.x * 20.0);
    size *= 0.8 + tumble * 0.2;
  } else {
    // Game over - pulse
    size *= 1.0 + sin(uniforms.time * 4.0) * 0.3;
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

  // 0: pop, 1: shoot, 2: bonusPop, 3: escaped, 4: confetti, 5: gameOver
  if (pType < 0.5) {
    // Pop - rubber fragment shape
    let angle = atan2(uv.y, uv.x);
    let wave = sin(angle * 3.0) * 0.2;
    let shape = smoothstep(0.9 + wave, 0.4, dist);
    alpha *= shape * life;
    color *= 1.2;
  } else if (pType < 1.5) {
    // Shoot - dart trail
    let trail = smoothstep(1.0, 0.0, dist);
    let streak = smoothstep(0.8, 0.2, abs(uv.y)) * smoothstep(-0.2, 0.5, uv.x);
    alpha *= trail * streak * life;
    color += vec3f(0.3, 0.2, 0.1) * (1.0 - life);
  } else if (pType < 2.5) {
    // Bonus pop - sparkle star
    let angle = atan2(uv.y, uv.x);
    let star = abs(sin(angle * 4.0)) * 0.3 + 0.7;
    let shape = smoothstep(star, 0.3, dist);
    alpha *= shape;
    color += vec3f(0.3, 0.25, 0.0) * (1.0 - dist);
  } else if (pType < 3.5) {
    // Escaped - fading circle
    let shape = smoothstep(1.0, 0.3, dist);
    alpha *= shape * life * 0.6;
    color *= 0.7;
  } else if (pType < 4.5) {
    // Confetti - rectangular with spin
    let rect = max(abs(uv.x), abs(uv.y));
    let shape = smoothstep(0.9, 0.5, rect);
    alpha *= shape * life;
    color *= 1.0 + sin(uniforms.time * 5.0 + input.color.r * 10.0) * 0.2;
  } else {
    // Game over - glowing orb
    let shape = smoothstep(1.0, 0.0, dist);
    let glow = exp(-dist * 2.0);
    alpha *= shape + glow * 0.5;
    color += vec3f(0.2, 0.15, 0.1) * glow;
  }

  // Fade out
  alpha *= smoothstep(0.0, 0.2, life);

  if (alpha < 0.01) {
    discard;
  }

  return vec4f(color, alpha);
}
`;
