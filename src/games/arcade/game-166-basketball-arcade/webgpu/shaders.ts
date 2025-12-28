/**
 * WebGPU Shaders - Basketball Arcade
 * Stadium / Basketball / Orange and Purple Theme
 * Game #166
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

fn fbm(p: vec2f) -> f32 {
  var value = 0.0;
  var amplitude = 0.5;
  var pos = p;

  for (var i = 0; i < 4; i++) {
    value += amplitude * noise(pos);
    pos *= 2.0;
    amplitude *= 0.5;
  }
  return value;
}

// Stadium spotlight effect
fn spotlight(uv: vec2f, center: vec2f, radius: f32, intensity: f32) -> f32 {
  let d = distance(uv, center);
  let spot = smoothstep(radius, radius * 0.3, d);
  return spot * intensity;
}

// Court wood grain pattern
fn woodGrain(uv: vec2f) -> f32 {
  let grain = sin(uv.x * 50.0 + noise(uv * 20.0) * 3.0);
  let variation = noise(uv * 10.0) * 0.2;
  return grain * 0.1 + variation + 0.8;
}

// Stadium crowd simulation
fn crowd(uv: vec2f, time: f32) -> f32 {
  let wave = sin(uv.x * 30.0 + time * 2.0) * 0.5 + 0.5;
  let n = noise(uv * vec2f(40.0, 20.0) + time * 0.5);
  return mix(0.2, 0.5, n * wave);
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  let uv = input.uv;
  let time = uniforms.time;
  let level = uniforms.level;

  // Stadium gradient background
  let stadiumTop = vec3f(0.15, 0.1, 0.25);
  let stadiumMid = vec3f(0.1, 0.12, 0.22);
  let stadiumBottom = vec3f(0.08, 0.08, 0.15);

  var bg = mix(stadiumBottom, stadiumMid, smoothstep(0.0, 0.5, uv.y));
  bg = mix(bg, stadiumTop, smoothstep(0.5, 1.0, uv.y));

  // Stadium crowd in background (upper portion)
  if (uv.y > 0.6) {
    let crowdY = (uv.y - 0.6) / 0.4;
    let crowdIntensity = crowd(vec2f(uv.x, crowdY), time);
    let crowdColor = vec3f(0.3, 0.2, 0.4) * crowdIntensity;
    bg = mix(bg, crowdColor, 0.3 * crowdY);

    // Crowd wave effect
    let wave = sin(uv.x * 15.0 - time * 3.0) * 0.5 + 0.5;
    let waveColor = vec3f(1.0, 0.5, 0.0) * wave * 0.1;
    bg += waveColor * crowdY * sin(time * 2.0) * 0.5;
  }

  // Court floor (bottom portion)
  if (uv.y < 0.35) {
    let courtY = uv.y / 0.35;
    let woodColor = vec3f(0.6, 0.4, 0.2) * woodGrain(uv * vec2f(2.0, 1.0));

    // Court lines
    let centerLine = smoothstep(0.01, 0.005, abs(uv.x - 0.5));
    let sideLine = smoothstep(0.01, 0.005, abs(uv.x - 0.1)) +
                   smoothstep(0.01, 0.005, abs(uv.x - 0.9));
    let threePointArc = smoothstep(0.015, 0.01, abs(distance(vec2f(uv.x, uv.y * 2.0), vec2f(0.85, 0.0)) - 0.4));

    let lineColor = vec3f(1.0, 1.0, 1.0);
    let courtFinal = mix(woodColor, lineColor, (centerLine + sideLine + threePointArc) * 0.8);

    // Key/paint area (purple)
    let keyArea = step(0.65, uv.x) * step(uv.y, 0.25);
    let keyColor = vec3f(0.35, 0.15, 0.5);
    let courtWithKey = mix(courtFinal, keyColor, keyArea * 0.6);

    bg = mix(bg, courtWithKey, smoothstep(0.35, 0.3, uv.y));
  }

  // Stadium spotlights
  let spotlightSpeed = 0.5 + level * 0.1;

  // Main spotlight following arc
  let spot1Center = vec2f(
    0.5 + sin(time * spotlightSpeed) * 0.3,
    0.7 + cos(time * spotlightSpeed * 0.7) * 0.15
  );
  let spot1 = spotlight(uv, spot1Center, 0.3, 0.4);

  // Secondary spotlights
  let spot2Center = vec2f(0.2, 0.8);
  let spot2 = spotlight(uv, spot2Center, 0.25, 0.2);

  let spot3Center = vec2f(0.8, 0.8);
  let spot3 = spotlight(uv, spot3Center, 0.25, 0.2);

  // Hoop spotlight
  let hoopSpot = spotlight(uv, vec2f(0.8, 0.5), 0.2, 0.3);

  // Apply spotlights
  let spotlightColor = vec3f(1.0, 0.95, 0.85);
  bg += spotlightColor * (spot1 + spot2 + spot3) * 0.3;
  bg += vec3f(1.0, 0.8, 0.4) * hoopSpot * 0.2;

  // Stadium rim lights
  let rimGlow = smoothstep(0.98, 1.0, uv.y) + smoothstep(0.02, 0.0, uv.y);
  let rimLeft = smoothstep(0.02, 0.0, uv.x);
  let rimRight = smoothstep(0.98, 1.0, uv.x);
  let rimColor = vec3f(1.0, 0.5, 0.0) * (1.0 + sin(time * 3.0) * 0.2);
  bg += rimColor * (rimGlow + rimLeft + rimRight) * 0.15;

  // Scoreboard glow (top center)
  let scoreboardCenter = vec2f(0.5, 0.92);
  let scoreboardDist = distance(uv, scoreboardCenter);
  let scoreboardGlow = smoothstep(0.15, 0.05, scoreboardDist);
  let scoreboardColor = vec3f(1.0, 0.3, 0.0) * (0.8 + sin(time * 5.0) * 0.2);
  bg += scoreboardColor * scoreboardGlow * 0.2;

  // Atmospheric haze
  let haze = fbm(uv * 3.0 + time * 0.1) * 0.08;
  bg += vec3f(0.6, 0.5, 0.7) * haze;

  // Level-based intensity
  let levelIntensity = 0.8 + level * 0.05;
  bg *= levelIntensity;

  // Vignette
  let vignette = 1.0 - length((uv - 0.5) * 1.3) * 0.4;
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
    // Shoot - trail effect
    size *= 0.8 + lifeRatio * 0.4;
  } else if (pType == 1) {
    // Score - expanding burst
    size *= 1.5 - lifeRatio * 0.5;
  } else if (pType == 2) {
    // Rim hit - bounce
    let bounce = abs(sin(lifeRatio * 3.14159 * 3.0));
    size *= 0.7 + bounce * 0.5;
  } else if (pType == 3) {
    // Swish - sparkle
    size *= (0.5 + sin(uniforms.time * 20.0) * 0.5) * lifeRatio;
  } else if (pType == 4) {
    // Miss - fade
    size *= lifeRatio;
  } else if (pType == 5) {
    // Game over - confetti
    size *= 0.8 + sin(uniforms.time * 10.0 + f32(instanceIndex)) * 0.3;
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
    // Shoot - basketball trail
    let circle = smoothstep(0.5, 0.3, dist);
    // Ball lines
    let lineH = smoothstep(0.08, 0.04, abs(uv.y - 0.5));
    let lineV = smoothstep(0.08, 0.04, abs(uv.x - 0.5));
    let lines = max(lineH, lineV) * 0.3;
    color = mix(color, vec3f(0.1, 0.05, 0.0), lines);
    alpha *= circle * input.life;
  } else if (pType == 1) {
    // Score - star burst
    let angle = atan2(uv.y - 0.5, uv.x - 0.5);
    let rays = abs(sin(angle * 6.0));
    let star = smoothstep(0.5, 0.2, dist) * (0.5 + rays * 0.5);
    let glow = smoothstep(0.6, 0.0, dist) * 0.5;
    alpha *= (star + glow) * input.life;
    color += vec3f(0.3, 0.2, 0.0) * glow;
  } else if (pType == 2) {
    // Rim hit - ring
    let ring = smoothstep(0.5, 0.4, dist) - smoothstep(0.35, 0.25, dist);
    let spark = smoothstep(0.3, 0.0, dist) * 0.5;
    alpha *= (ring + spark) * input.life;
  } else if (pType == 3) {
    // Swish - net sparkle
    let sparkle = smoothstep(0.4, 0.0, dist);
    let flicker = 0.5 + sin(uniforms.time * 30.0 + dist * 10.0) * 0.5;
    alpha *= sparkle * flicker * input.life;
    color += vec3f(0.2, 0.3, 0.1) * sparkle;
  } else if (pType == 4) {
    // Miss - fading X
    let xShape = smoothstep(0.15, 0.05, abs(abs(uv.x - 0.5) - abs(uv.y - 0.5)));
    let circle = smoothstep(0.5, 0.3, dist);
    alpha *= xShape * circle * input.life;
  } else if (pType == 5) {
    // Game over - confetti
    let rect = step(abs(uv.x - 0.5), 0.35) * step(abs(uv.y - 0.5), 0.45);
    let rotation = sin(uniforms.time * 5.0 + input.life * 10.0);
    alpha *= rect * (0.7 + rotation * 0.3);
    // Add shimmer
    color += vec3f(0.1) * sin(uniforms.time * 15.0);
  }

  // Common glow effect
  let glow = smoothstep(0.6, 0.0, dist) * 0.2 * input.life;
  color += vec3f(1.0, 0.8, 0.5) * glow;

  return vec4f(color, alpha);
}
`;
