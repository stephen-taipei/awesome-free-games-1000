/**
 * WebGPU WGSL Shaders - Sound Puzzle
 * Music / Sound Waves / Audio Visualization Theme
 * Game #073
 */

export const BACKGROUND_SHADER = /* wgsl */ `
struct Uniforms {
  time: f32,
  width: f32,
  height: f32,
  activeNote: f32,
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

fn waveform(uv: vec2f, time: f32) -> f32 {
  var wave = 0.0;
  for (var i = 1; i <= 5; i++) {
    let fi = f32(i);
    let freq = fi * 2.0;
    let amp = 1.0 / fi;
    let phase = time * (1.0 + fi * 0.3);
    wave += sin(uv.x * 20.0 * freq + phase) * amp * 0.02;
  }
  let dist = abs(uv.y - 0.5 - wave);
  return smoothstep(0.02, 0.0, dist);
}

fn spectrumBars(uv: vec2f, time: f32) -> f32 {
  let bars = 20.0;
  let barIndex = floor(uv.x * bars);
  let barX = fract(uv.x * bars);

  let freq = 1.0 + barIndex * 0.2;
  let height = (sin(time * freq + barIndex * 0.5) + 1.0) * 0.25 + 0.1;

  let inBar = step(0.15, barX) * step(barX, 0.85);
  let inHeight = step(uv.y, height);

  // Color gradient based on height
  let t = uv.y / height;

  return inBar * inHeight * t;
}

fn circularWaves(uv: vec2f, center: vec2f, time: f32) -> f32 {
  let d = length(uv - center);
  let wave = sin(d * 30.0 - time * 5.0) * 0.5 + 0.5;
  let fade = exp(-d * 4.0);
  return wave * fade;
}

fn noteColors(noteId: f32) -> vec3f {
  let colors = array<vec3f, 4>(
    vec3f(0.9, 0.3, 0.3),  // Red
    vec3f(0.2, 0.6, 0.9),  // Blue
    vec3f(0.2, 0.8, 0.4),  // Green
    vec3f(0.95, 0.6, 0.1)  // Orange/Yellow
  );
  let idx = i32(noteId) % 4;
  return colors[idx];
}

@fragment
fn fragmentMain(@builtin(position) fragPos: vec4f) -> @location(0) vec4f {
  let uv = fragPos.xy / vec2f(u.width, u.height);
  let time = u.time;

  // Dark audio studio background
  var col = vec3f(0.05, 0.05, 0.1);

  // Subtle noise texture
  let n = noise(uv * 100.0 + time * 0.5) * 0.05;
  col += vec3f(n);

  // Spectrum bars at bottom
  let spectrumUV = vec2f(uv.x, uv.y * 3.0);
  if (uv.y < 0.15) {
    let spec = spectrumBars(spectrumUV, time);
    let specColor = mix(vec3f(0.1, 0.3, 0.8), vec3f(0.8, 0.2, 0.5), uv.x);
    col += specColor * spec * 0.5;
  }

  // Central waveform
  let waveformY = uv.y * 0.5 + 0.25;
  let wave = waveform(vec2f(uv.x, waveformY), time);
  col += vec3f(0.3, 0.6, 0.9) * wave * 0.3;

  // Circular waves when note is active
  if (u.activeNote >= 0.0) {
    let noteId = u.activeNote;
    let angle = noteId * 1.5708; // PI/2 per note
    let noteCenter = vec2f(
      0.3 + cos(angle) * 0.2,
      0.5 + sin(angle) * 0.2
    );
    let waves = circularWaves(uv, noteCenter, time);
    col += noteColors(noteId) * waves * 0.6;
  }

  // Beat pulse glow
  let beatPhase = fract(time * 2.0);
  let beatPulse = exp(-beatPhase * 5.0);
  let centerGlow = exp(-length(uv - 0.5) * 3.0);
  col += vec3f(0.95, 0.6, 0.1) * centerGlow * beatPulse * 0.2;

  // Corner accents
  let corner1 = exp(-length(uv) * 5.0);
  let corner2 = exp(-length(uv - vec2f(1.0, 0.0)) * 5.0);
  let corner3 = exp(-length(uv - vec2f(0.0, 1.0)) * 5.0);
  let corner4 = exp(-length(uv - 1.0) * 5.0);
  col += vec3f(0.95, 0.6, 0.1) * (corner1 + corner2 + corner3 + corner4) * 0.1;

  // Vignette
  let vignette = 1.0 - length(uv - 0.5) * 0.6;
  col *= vignette;

  return vec4f(col, 1.0);
}
`;

export const PARTICLE_SHADER = /* wgsl */ `
struct Uniforms {
  time: f32,
  width: f32,
  height: f32,
  activeNote: f32,
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

fn soundWave(uv: vec2f, time: f32) -> f32 {
  let center = uv - 0.5;
  let dist = length(center) * 2.0;

  let wave = sin(dist * 20.0 - time * 8.0) * 0.5 + 0.5;
  let fade = 1.0 - smoothstep(0.0, 1.0, dist);

  return wave * fade;
}

fn beatPulse(uv: vec2f, time: f32) -> f32 {
  let center = uv - 0.5;
  let dist = length(center) * 2.0;

  let pulse = exp(-dist * 3.0);
  let beat = sin(time * 10.0) * 0.5 + 0.5;

  return pulse * (0.5 + beat * 0.5);
}

fn musicalNote(uv: vec2f, time: f32) -> f32 {
  let center = uv - 0.5;
  let dist = length(center) * 2.0;

  // Note head (oval)
  let headDist = length(center * vec2f(1.2, 1.0));
  let head = smoothstep(0.4, 0.35, headDist);

  // Stem
  let stemX = abs(center.x - 0.15);
  let stemY = center.y;
  let stem = step(stemX, 0.03) * step(-0.1, stemY) * step(stemY, 0.5);

  return max(head, stem * 0.8);
}

fn harmonyRing(uv: vec2f, time: f32) -> f32 {
  let center = uv - 0.5;
  let dist = length(center) * 2.0;

  let ring1 = smoothstep(0.3, 0.35, dist) * smoothstep(0.45, 0.4, dist);
  let ring2 = smoothstep(0.6, 0.65, dist) * smoothstep(0.75, 0.7, dist);
  let ring3 = smoothstep(0.85, 0.9, dist) * smoothstep(0.98, 0.95, dist);

  let pulse = sin(time * 5.0) * 0.2 + 0.8;

  return (ring1 + ring2 * 0.7 + ring3 * 0.4) * pulse;
}

fn sparkleNote(uv: vec2f, time: f32) -> f32 {
  let center = uv - 0.5;
  let dist = length(center) * 2.0;

  // Star shape
  let angle = atan2(center.y, center.x);
  let star = abs(cos(angle * 4.0 + time * 2.0)) * 0.5 + 0.5;
  let spike = pow(star, 3.0);

  let core = 1.0 - smoothstep(0.0, 0.3, dist);
  let rays = spike * (1.0 - smoothstep(0.0, 0.8, dist));

  return core + rays * 0.5;
}

fn echoWave(uv: vec2f, time: f32) -> f32 {
  let center = uv - 0.5;
  let dist = length(center) * 2.0;

  var total = 0.0;
  for (var i = 0; i < 3; i++) {
    let fi = f32(i);
    let phase = time * 4.0 - fi * 0.5;
    let ring = sin(dist * 15.0 - phase) * 0.5 + 0.5;
    let fade = exp(-(dist + fi * 0.3) * 2.0);
    total += ring * fade * (1.0 - fi * 0.3);
  }

  return total;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  let uv = input.uv;
  let pType = i32(input.particleType);
  var alpha = 0.0;
  var col = input.color.rgb;

  switch pType {
    case 0: { // wave - sound wave ripples
      alpha = soundWave(uv, input.time);
    }
    case 1: { // pulse - bass pulse
      alpha = beatPulse(uv, input.time);
    }
    case 2: { // sparkle - musical sparkles
      alpha = sparkleNote(uv, input.time);
    }
    case 3: { // note - floating note symbol
      alpha = musicalNote(uv, input.time);
    }
    case 4: { // harmony - harmonic rings
      alpha = harmonyRing(uv, input.time);
    }
    case 5: { // echo - echo waves
      alpha = echoWave(uv, input.time);
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
