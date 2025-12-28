/**
 * WGSL Shaders - Signal Puzzle
 * Radio / Telecommunications / Electromagnetic Theme
 * Game #148
 */

export const BACKGROUND_SHADER = /* wgsl */ `
struct Uniforms {
  time: f32,
  resolution: vec2f,
  signalStrength: f32,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;

struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) uv: vec2f,
}

@vertex
fn vertexMain(@builtin(vertex_index) vertexIndex: u32) -> VertexOutput {
  var pos = array<vec2f, 4>(
    vec2f(-1.0, -1.0),
    vec2f(1.0, -1.0),
    vec2f(-1.0, 1.0),
    vec2f(1.0, 1.0)
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
    mix(hash(i + vec2f(0.0, 0.0)), hash(i + vec2f(1.0, 0.0)), u.x),
    mix(hash(i + vec2f(0.0, 1.0)), hash(i + vec2f(1.0, 1.0)), u.x),
    u.y
  );
}

fn fbm(p: vec2f) -> f32 {
  var value = 0.0;
  var amplitude = 0.5;
  var frequency = 1.0;
  var pos = p;

  for (var i = 0; i < 4; i++) {
    value += amplitude * noise(pos * frequency);
    amplitude *= 0.5;
    frequency *= 2.0;
  }

  return value;
}

fn signalWave(uv: vec2f, time: f32, center: vec2f, frequency: f32) -> f32 {
  let dist = distance(uv, center);
  let wave = sin(dist * 40.0 - time * frequency) * 0.5 + 0.5;
  let fade = exp(-dist * 3.0);
  return wave * fade;
}

fn gridPattern(uv: vec2f, scale: f32) -> f32 {
  let grid = abs(fract(uv * scale) - 0.5);
  let line = min(grid.x, grid.y);
  return smoothstep(0.0, 0.02, line);
}

fn scanline(uv: vec2f, time: f32) -> f32 {
  let line = sin(uv.y * 200.0 + time * 2.0) * 0.5 + 0.5;
  return mix(0.95, 1.0, line);
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  let uv = input.uv;
  let time = uniforms.time;
  let strength = uniforms.signalStrength;

  // Deep space background
  var color = vec3f(0.12, 0.15, 0.18);

  // Subtle grid
  let grid = gridPattern(uv, 20.0);
  color = mix(color, vec3f(0.18, 0.22, 0.28), (1.0 - grid) * 0.3);

  // Dynamic noise field
  let n = fbm(uv * 3.0 + time * 0.1);
  color = mix(color, vec3f(0.15, 0.18, 0.22), n * 0.15);

  // Signal waves from corners (transmitter zones)
  let wave1 = signalWave(uv, time, vec2f(0.1, 0.5), 5.0);
  let wave2 = signalWave(uv, time, vec2f(0.9, 0.5), 4.0);

  // Cyan signal glow
  let signalColor = vec3f(0.0, 0.81, 0.79);
  color = mix(color, signalColor, wave1 * 0.15 * strength);
  color = mix(color, vec3f(0.18, 0.80, 0.44), wave2 * 0.12 * strength);

  // Electromagnetic interference
  let interference = noise(uv * 50.0 + time * 3.0);
  let staticNoise = hash(uv * 1000.0 + time * 10.0);
  color += vec3f(interference * 0.02 + staticNoise * 0.01);

  // Frequency bars at bottom
  let freqBar = sin(uv.x * 30.0 + time * 2.0) * 0.5 + 0.5;
  let barHeight = freqBar * 0.08 * strength;
  if (uv.y < barHeight) {
    let barColor = mix(vec3f(0.42, 0.36, 0.91), signalColor, uv.x);
    color = mix(color, barColor, 0.4);
  }

  // Scanline effect
  color *= scanline(uv, time);

  // Vignette
  let vignette = 1.0 - length((uv - 0.5) * 1.3);
  color *= smoothstep(0.0, 0.7, vignette);

  // Signal strength glow
  let centerGlow = 1.0 - length(uv - 0.5) * 1.5;
  color += signalColor * centerGlow * 0.05 * strength;

  return vec4f(color, 1.0);
}
`;

export const PARTICLE_SHADER = /* wgsl */ `
struct Uniforms {
  time: f32,
  resolution: vec2f,
  signalStrength: f32,
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

  var corners = array<vec2f, 4>(
    vec2f(-1.0, -1.0),
    vec2f(1.0, -1.0),
    vec2f(-1.0, 1.0),
    vec2f(1.0, 1.0)
  );

  let corner = corners[vertexIndex];
  let lifeRatio = particle.life / particle.maxLife;

  // Size based on type and life
  var size = particle.size;
  let pType = i32(particle.particleType);

  if (pType == 0) { // signalWave
    size *= 1.0 + (1.0 - lifeRatio) * 2.0;
  } else if (pType == 1) { // dataPulse
    size *= 0.8 + sin(uniforms.time * 15.0) * 0.2;
  } else if (pType == 2) { // electromagneticBurst
    size *= lifeRatio;
  } else if (pType == 3) { // radioStatic
    size *= 0.5 + sin(uniforms.time * 30.0 + f32(instanceIndex)) * 0.3;
  } else if (pType == 4) { // frequencyRipple
    size *= 1.0 + (1.0 - lifeRatio) * 1.5;
  } else if (pType == 5) { // transmissionGlow
    size *= 0.9 + sin(uniforms.time * 8.0) * 0.1;
  }

  let worldPos = particle.position + corner * size / uniforms.resolution;
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

  if (pType == 0) { // signalWave - expanding ring
    let ring = abs(dist - 0.35);
    alpha *= smoothstep(0.15, 0.0, ring) * input.life;
    alpha *= 0.6;
  } else if (pType == 1) { // dataPulse - bright dot
    alpha *= smoothstep(0.5, 0.1, dist);
    color = mix(color, vec3f(1.0), 0.3);
  } else if (pType == 2) { // electromagneticBurst - spark
    let spark = max(0.0, 1.0 - dist * 3.0);
    let ray = abs(sin(atan2(uv.y - 0.5, uv.x - 0.5) * 4.0));
    alpha *= spark * (0.5 + ray * 0.5) * input.life;
    color = mix(color, vec3f(1.0, 1.0, 0.8), 0.4);
  } else if (pType == 3) { // radioStatic - noise dot
    alpha *= smoothstep(0.5, 0.2, dist) * 0.7;
  } else if (pType == 4) { // frequencyRipple - concentric rings
    let rings = sin(dist * 25.0) * 0.5 + 0.5;
    alpha *= rings * smoothstep(0.5, 0.3, dist) * input.life;
  } else if (pType == 5) { // transmissionGlow - soft glow
    alpha *= smoothstep(0.5, 0.0, dist) * 0.5;
    color = mix(color, vec3f(0.0, 0.95, 0.88), 0.3);
  }

  if (alpha < 0.01) {
    discard;
  }

  return vec4f(color, alpha);
}
`;
