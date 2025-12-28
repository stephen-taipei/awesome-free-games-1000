/**
 * WebGPU WGSL Shaders - Time Rewind
 * Temporal / Cosmic / Time Vortex Theme
 * Game #072
 */

export const BACKGROUND_SHADER = /* wgsl */ `
struct Uniforms {
  time: f32,
  width: f32,
  height: f32,
  rewinding: f32,
}

@group(0) @binding(0) var<uniform> u: Uniforms;

@vertex
fn vertexMain(@builtin(vertex_index) i: u32) -> @builtin(position) vec4f {
  var pos = array<vec2f, 4>(
    vec2f(-1, -1), vec2f(1, -1), vec2f(-1, 1), vec2f(1, 1)
  );
  return vec4f(pos[i], 0, 1);
}

fn hash(p: vec2f) -> f32 {
  let n = sin(dot(p, vec2f(127.1, 311.7)));
  return fract(n * 43758.5453);
}

fn noise(p: vec2f) -> f32 {
  let i = floor(p);
  let f = fract(p);
  let u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i), hash(i + vec2f(1, 0)), u.x),
    mix(hash(i + vec2f(0, 1)), hash(i + vec2f(1, 1)), u.x),
    u.y
  );
}

fn fbm(p: vec2f) -> f32 {
  var val = 0.0;
  var amp = 0.5;
  var pos = p;
  for (var i = 0; i < 4; i++) {
    val += amp * noise(pos);
    pos *= 2.0;
    amp *= 0.5;
  }
  return val;
}

fn vortex(uv: vec2f, time: f32) -> f32 {
  let center = vec2f(0.5, 0.5);
  let d = uv - center;
  let dist = length(d);
  let angle = atan2(d.y, d.x);

  let spiral = sin(angle * 5.0 + dist * 15.0 - time * 3.0);
  let fade = exp(-dist * 3.0);

  return spiral * fade * 0.3;
}

fn clockHands(uv: vec2f, time: f32) -> f32 {
  let center = vec2f(0.5, 0.5);
  let d = uv - center;
  let angle = atan2(d.y, d.x);
  let dist = length(d);

  // Hour hand
  let hourAngle = time * 0.1;
  let hourDiff = abs(sin((angle - hourAngle) * 0.5));
  let hourHand = smoothstep(0.02, 0.0, hourDiff) * step(dist, 0.2);

  // Minute hand
  let minAngle = time * 0.5;
  let minDiff = abs(sin((angle - minAngle) * 0.5));
  let minHand = smoothstep(0.015, 0.0, minDiff) * step(dist, 0.3);

  // Second hand (rewinds when rewinding)
  let secAngle = select(time * 2.0, -time * 4.0, u.rewinding > 0.5);
  let secDiff = abs(sin((angle - secAngle) * 0.5));
  let secHand = smoothstep(0.01, 0.0, secDiff) * step(dist, 0.35);

  return max(max(hourHand, minHand), secHand) * 0.4;
}

fn stars(uv: vec2f, time: f32) -> f32 {
  var starLight = 0.0;
  for (var i = 0; i < 30; i++) {
    let fi = f32(i);
    let starPos = vec2f(
      fract(sin(fi * 127.1) * 43758.5453),
      fract(sin(fi * 311.7) * 43758.5453)
    );
    let d = distance(uv, starPos);
    let twinkle = sin(time * 2.0 + fi * 1.5) * 0.5 + 0.5;
    starLight += smoothstep(0.015, 0.0, d) * twinkle;
  }
  return starLight;
}

fn temporalRipples(uv: vec2f, time: f32) -> f32 {
  let center = vec2f(0.5, 0.5);
  let dist = length(uv - center);

  var ripple = 0.0;
  for (var i = 0; i < 4; i++) {
    let fi = f32(i);
    let phase = time * 2.0 - fi * 0.5;
    let ring = sin(dist * 20.0 - phase) * 0.5 + 0.5;
    let fade = exp(-dist * (3.0 + fi));
    ripple += ring * fade * 0.2;
  }

  return ripple;
}

@fragment
fn fragmentMain(@builtin(position) fragPos: vec4f) -> @location(0) vec4f {
  let uv = fragPos.xy / vec2f(u.width, u.height);
  let time = u.time;
  let isRewinding = u.rewinding > 0.5;

  // Deep cosmic background
  var col = vec3f(0.05, 0.02, 0.1);

  // Nebula clouds
  let nebula = fbm(uv * 3.0 + time * 0.1);
  let nebulaColor = mix(
    vec3f(0.1, 0.05, 0.2),
    vec3f(0.3, 0.1, 0.4),
    nebula
  );
  col = mix(col, nebulaColor, 0.3);

  // Stars
  let starBright = stars(uv, time);
  col += vec3f(1.0, 0.95, 0.9) * starBright;

  // Time vortex
  let vort = vortex(uv, select(time, -time * 2.0, isRewinding));
  let vortexColor = select(
    vec3f(0.4, 0.2, 0.8),
    vec3f(0.8, 0.3, 0.9),
    isRewinding
  );
  col += vortexColor * (vort + 0.1);

  // Clock hands overlay
  let clock = clockHands(uv, time);
  let clockColor = vec3f(0.8, 0.6, 1.0);
  col += clockColor * clock;

  // Temporal ripples (stronger when rewinding)
  let ripples = temporalRipples(uv, time);
  let rippleIntensity = select(0.5, 1.5, isRewinding);
  col += vec3f(0.6, 0.4, 0.9) * ripples * rippleIntensity;

  // Rewind chromatic effect
  if (isRewinding) {
    let shift = sin(time * 10.0) * 0.02;
    let r = fbm(uv * 2.0 + vec2f(shift, 0.0) + time);
    let b = fbm(uv * 2.0 - vec2f(shift, 0.0) + time);
    col.r += r * 0.1;
    col.b += b * 0.1;
  }

  // Vignette
  let center = vec2f(0.5, 0.5);
  let vignette = 1.0 - length(uv - center) * 0.8;
  col *= vignette;

  return vec4f(col, 1.0);
}
`;

export const PARTICLE_SHADER = /* wgsl */ `
struct Uniforms {
  time: f32,
  width: f32,
  height: f32,
  rewinding: f32,
}

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
  @location(0) color: vec4f,
  @location(1) uv: vec2f,
  @location(2) particleType: f32,
  @location(3) life: f32,
  @location(4) time: f32,
}

@group(0) @binding(0) var<uniform> u: Uniforms;

@vertex
fn vertexMain(
  input: VertexInput,
  @builtin(vertex_index) vi: u32
) -> VertexOutput {
  var quadPos = array<vec2f, 4>(
    vec2f(-1, -1), vec2f(1, -1), vec2f(-1, 1), vec2f(1, 1)
  );

  let corner = quadPos[vi];
  let cos_r = cos(input.rotation);
  let sin_r = sin(input.rotation);
  let rotated = vec2f(
    corner.x * cos_r - corner.y * sin_r,
    corner.x * sin_r + corner.y * cos_r
  );

  let aspect = u.width / u.height;
  let size = input.size / u.width * 2.0;
  let pos = input.position + rotated * size * vec2f(1.0, aspect);

  var output: VertexOutput;
  output.position = vec4f(pos, 0.0, 1.0);
  output.color = input.color;
  output.uv = corner * 0.5 + 0.5;
  output.particleType = input.particleType;
  output.life = input.life;
  output.time = u.time;
  return output;
}

fn temporalWave(uv: vec2f, time: f32) -> f32 {
  let d = length(uv - 0.5) * 2.0;
  let wave = sin(d * 8.0 - time * 5.0) * 0.5 + 0.5;
  let fade = 1.0 - smoothstep(0.0, 1.0, d);
  return wave * fade;
}

fn rewindSpiral(uv: vec2f, time: f32) -> f32 {
  let center = uv - 0.5;
  let angle = atan2(center.y, center.x);
  let dist = length(center) * 2.0;

  let spiral = sin(angle * 3.0 - dist * 10.0 + time * 8.0);
  let fade = 1.0 - smoothstep(0.3, 1.0, dist);

  return max(0.0, spiral) * fade;
}

fn clockworkGear(uv: vec2f, time: f32) -> f32 {
  let center = uv - 0.5;
  let angle = atan2(center.y, center.x);
  let dist = length(center) * 2.0;

  // Gear teeth
  let teeth = 8.0;
  let gear = step(0.5, fract(angle * teeth / 6.28318));
  let innerRing = step(0.3, dist) * step(dist, 0.7);
  let outerRing = step(0.7, dist) * step(dist, 0.95);

  // Rotating
  let rotAngle = angle + time * 2.0;
  let rotGear = step(0.5, fract(rotAngle * teeth / 6.28318));

  return (rotGear * innerRing + outerRing) * (1.0 - smoothstep(0.9, 1.0, dist));
}

fn vortexPortal(uv: vec2f, time: f32) -> f32 {
  let center = uv - 0.5;
  let dist = length(center) * 2.0;
  let angle = atan2(center.y, center.x);

  let arms = 5.0;
  let spiral = sin(angle * arms + dist * 5.0 - time * 4.0) * 0.5 + 0.5;
  let glow = 1.0 - smoothstep(0.0, 0.8, dist);
  let ring = smoothstep(0.3, 0.4, dist) * smoothstep(0.6, 0.5, dist);

  return (spiral * glow + ring) * glow;
}

fn sparkleTime(uv: vec2f, time: f32) -> f32 {
  let center = uv - 0.5;
  let dist = length(center) * 2.0;

  // Four-pointed star
  let angle = atan2(center.y, center.x);
  let star = abs(cos(angle * 2.0)) * 0.5 + 0.5;
  let spike = pow(star, 4.0);

  let core = 1.0 - smoothstep(0.0, 0.3, dist);
  let glow = spike * (1.0 - smoothstep(0.0, 0.8, dist));

  return core + glow * 0.6;
}

fn chronoRing(uv: vec2f, time: f32) -> f32 {
  let center = uv - 0.5;
  let dist = length(center) * 2.0;

  let ring1 = smoothstep(0.6, 0.65, dist) * smoothstep(0.75, 0.7, dist);
  let ring2 = smoothstep(0.8, 0.85, dist) * smoothstep(0.95, 0.9, dist);

  let pulse = sin(time * 5.0) * 0.5 + 0.5;

  return (ring1 + ring2 * pulse) * (1.0 - smoothstep(0.9, 1.0, dist));
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  let uv = input.uv;
  let pType = i32(input.particleType);
  var alpha = 0.0;
  var col = input.color.rgb;

  switch pType {
    case 0: { // temporal - time distortion
      alpha = temporalWave(uv, input.time);
      let pulse = sin(input.time * 3.0) * 0.2 + 0.8;
      col *= pulse;
    }
    case 1: { // rewind - spiral effect
      alpha = rewindSpiral(uv, input.time);
      col = mix(col, vec3f(0.8, 0.4, 1.0), 0.3);
    }
    case 2: { // sparkle - time sparkles
      alpha = sparkleTime(uv, input.time);
    }
    case 3: { // clockwork - gear shapes
      alpha = clockworkGear(uv, input.time);
      col = mix(col, vec3f(0.9, 0.8, 0.5), 0.2);
    }
    case 4: { // vortex - portal swirl
      alpha = vortexPortal(uv, input.time);
      col = mix(col, vec3f(0.5, 0.2, 0.9), 0.4);
    }
    case 5: { // chrono - expanding rings
      alpha = chronoRing(uv, input.time);
    }
    default: {
      let d = length(uv - 0.5) * 2.0;
      alpha = 1.0 - smoothstep(0.0, 1.0, d);
    }
  }

  alpha *= input.color.a * input.life;
  return vec4f(col, alpha);
}
`;
