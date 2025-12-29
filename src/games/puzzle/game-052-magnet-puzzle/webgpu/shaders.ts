/**
 * WGSL Shaders - Magnet Puzzle
 * Plasma Physics Lab / Electromagnetic Field Theme
 * Game #052
 */

export const backgroundShader = /* wgsl */ `
struct Uniforms {
  time: f32,
  aspect: f32,
  fieldActive: f32,
  _pad: f32,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;

struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) uv: vec2f,
}

@vertex
fn vertexMain(@builtin(vertex_index) vertexIndex: u32) -> VertexOutput {
  var pos = array<vec2f, 6>(
    vec2f(-1.0, -1.0), vec2f(1.0, -1.0), vec2f(-1.0, 1.0),
    vec2f(-1.0, 1.0), vec2f(1.0, -1.0), vec2f(1.0, 1.0)
  );

  var output: VertexOutput;
  output.position = vec4f(pos[vertexIndex], 0.0, 1.0);
  output.uv = pos[vertexIndex] * 0.5 + 0.5;
  return output;
}

// Hash function for noise
fn hash(p: vec2f) -> f32 {
  let k = vec2f(0.3183099, 0.3678794);
  var q = p * k + k.yx;
  return fract(16.0 * k.x * fract(q.x * q.y * (q.x + q.y)));
}

// Value noise
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

// FBM for plasma clouds
fn fbm(p: vec2f) -> f32 {
  var value = 0.0;
  var amplitude = 0.5;
  var frequency = 1.0;
  var pos = p;

  for (var i = 0; i < 4; i++) {
    value += amplitude * noise(pos * frequency);
    amplitude *= 0.5;
    frequency *= 2.0;
    pos = pos * 1.1 + vec2f(0.1, 0.15);
  }
  return value;
}

// Lab grid pattern
fn labGrid(uv: vec2f, time: f32) -> f32 {
  let gridSize = 0.05;
  let lineWidth = 0.001;

  let gx = abs(fract(uv.x / gridSize) - 0.5) * 2.0;
  let gy = abs(fract(uv.y / gridSize) - 0.5) * 2.0;

  let lineX = smoothstep(1.0 - lineWidth * 20.0, 1.0, gx);
  let lineY = smoothstep(1.0 - lineWidth * 20.0, 1.0, gy);

  // Grid flicker
  let flicker = 0.3 + 0.1 * sin(time * 2.0 + uv.x * 10.0);

  return (lineX + lineY) * flicker;
}

// Electromagnetic field lines
fn fieldLines(uv: vec2f, time: f32, centers: array<vec4f, 4>) -> f32 {
  var field = 0.0;
  let aspect = vec2f(uniforms.aspect, 1.0);

  for (var i = 0; i < 4; i++) {
    let center = centers[i];
    if (center.w == 0.0) { continue; }

    let pos = center.xy;
    let polarity = center.z; // 1.0 for N, -1.0 for S

    let delta = (uv - pos) * aspect;
    let dist = length(delta);

    if (dist < 0.01) { continue; }

    // Field strength (inverse square)
    let strength = 0.02 / (dist * dist);

    // Field line pattern
    let angle = atan2(delta.y, delta.x);
    let linePattern = sin(angle * 8.0 + dist * 30.0 - time * polarity * 2.0);

    field += strength * (linePattern * 0.5 + 0.5) * center.w;
  }

  return clamp(field, 0.0, 1.0);
}

// Plasma glow effect
fn plasmaGlow(uv: vec2f, time: f32) -> vec3f {
  // Animated plasma clouds
  let plasma1 = fbm(uv * 3.0 + time * 0.1);
  let plasma2 = fbm(uv * 5.0 - time * 0.15 + vec2f(5.0, 3.0));
  let plasma3 = fbm(uv * 2.0 + time * 0.08 + vec2f(10.0, 7.0));

  let combined = plasma1 * 0.5 + plasma2 * 0.3 + plasma3 * 0.2;

  // Purple-cyan plasma colors
  let purple = vec3f(0.4, 0.1, 0.6);
  let cyan = vec3f(0.1, 0.5, 0.7);
  let blue = vec3f(0.1, 0.2, 0.5);

  var color = mix(blue, purple, combined);
  color = mix(color, cyan, plasma2 * 0.5);

  return color * 0.3;
}

// Energy containment ring
fn containmentRing(uv: vec2f, time: f32) -> f32 {
  let center = vec2f(0.5, 0.5);
  let dist = length((uv - center) * vec2f(uniforms.aspect, 1.0));

  // Multiple containment rings
  var rings = 0.0;
  for (var i = 0; i < 3; i++) {
    let radius = 0.3 + f32(i) * 0.1;
    let ring = smoothstep(0.01, 0.0, abs(dist - radius));
    let pulse = sin(time * 3.0 + f32(i) * 2.0) * 0.3 + 0.7;
    rings += ring * pulse;
  }

  return rings * uniforms.fieldActive * 0.3;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  let uv = input.uv;
  let time = uniforms.time;

  // Deep lab background
  let bgDark = vec3f(0.02, 0.03, 0.08);
  let bgLight = vec3f(0.05, 0.08, 0.15);

  // Vignette
  let vignette = 1.0 - length(uv - 0.5) * 0.8;
  var color = mix(bgDark, bgLight, vignette);

  // Add plasma glow
  color += plasmaGlow(uv, time);

  // Lab grid
  let grid = labGrid(uv, time);
  let gridColor = vec3f(0.1, 0.3, 0.5);
  color = mix(color, gridColor, grid * 0.2);

  // Sample field centers (static for background, actual positions handled in game)
  var centers: array<vec4f, 4>;
  centers[0] = vec4f(0.3, 0.3, 1.0, 0.5);  // N pole
  centers[1] = vec4f(0.7, 0.7, -1.0, 0.5); // S pole
  centers[2] = vec4f(0.3, 0.7, -1.0, 0.3);
  centers[3] = vec4f(0.7, 0.3, 1.0, 0.3);

  // Field lines visualization
  let field = fieldLines(uv, time, centers);
  let fieldColorN = vec3f(0.8, 0.2, 0.3); // Red for N
  let fieldColorS = vec3f(0.2, 0.4, 0.9); // Blue for S
  let fieldMix = sin(time + uv.x * 10.0) * 0.5 + 0.5;
  let fieldColor = mix(fieldColorS, fieldColorN, fieldMix);
  color += fieldColor * field * 0.4;

  // Containment rings
  let rings = containmentRing(uv, time);
  color += vec3f(0.3, 0.8, 1.0) * rings;

  // Corner glow (equipment indicators)
  let cornerDist = min(
    min(length(uv), length(uv - vec2f(1.0, 0.0))),
    min(length(uv - vec2f(0.0, 1.0)), length(uv - vec2f(1.0, 1.0)))
  );
  let cornerGlow = exp(-cornerDist * 8.0) * 0.15;
  color += vec3f(0.2, 0.6, 0.8) * cornerGlow * (sin(time * 2.0) * 0.3 + 0.7);

  // Scanline effect
  let scanline = sin(uv.y * 400.0) * 0.02 + 0.98;
  color *= scanline;

  return vec4f(color, 1.0);
}
`;

export const particleShader = /* wgsl */ `
struct Uniforms {
  time: f32,
  aspect: f32,
  _pad1: f32,
  _pad2: f32,
}

struct Particle {
  x: f32,
  y: f32,
  vx: f32,
  vy: f32,
  life: f32,
  maxLife: f32,
  size: f32,
  particleType: f32,
  r: f32,
  g: f32,
  b: f32,
  a: f32,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;
@group(0) @binding(1) var<storage, read> particles: array<Particle>;

struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) uv: vec2f,
  @location(1) color: vec4f,
  @location(2) life: f32,
  @location(3) particleType: f32,
}

@vertex
fn vertexMain(
  @builtin(vertex_index) vertexIndex: u32,
  @builtin(instance_index) instanceIndex: u32
) -> VertexOutput {
  let particle = particles[instanceIndex];

  var corner = array<vec2f, 6>(
    vec2f(-1.0, -1.0), vec2f(1.0, -1.0), vec2f(-1.0, 1.0),
    vec2f(-1.0, 1.0), vec2f(1.0, -1.0), vec2f(1.0, 1.0)
  );

  let lifeRatio = particle.life / particle.maxLife;
  var size = particle.size;

  // Type-specific size modulation
  let pType = u32(particle.particleType);
  if (pType == 0u) { // plasma
    size *= 1.0 + sin(uniforms.time * 10.0 + particle.x * 20.0) * 0.2;
  } else if (pType == 1u) { // field
    size *= 0.8 + lifeRatio * 0.4;
  } else if (pType == 2u) { // arc
    size *= 0.5 + sin(uniforms.time * 30.0) * 0.5;
  } else if (pType == 3u) { // attract
    size *= lifeRatio * 1.2;
  } else if (pType == 4u) { // repel
    size *= 0.8 + (1.0 - lifeRatio) * 0.4;
  } else if (pType == 5u) { // victory
    size *= 1.0 + sin(uniforms.time * 5.0 + particle.y * 10.0) * 0.15;
  }

  let offset = corner[vertexIndex] * size;
  let pos = vec2f(
    (particle.x * 2.0 - 1.0) + offset.x,
    (particle.y * 2.0 - 1.0) + offset.y
  );

  var output: VertexOutput;
  output.position = vec4f(pos.x, pos.y, 0.0, 1.0);
  output.uv = corner[vertexIndex] * 0.5 + 0.5;
  output.color = vec4f(particle.r, particle.g, particle.b, particle.a * lifeRatio);
  output.life = lifeRatio;
  output.particleType = particle.particleType;
  return output;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  let uv = input.uv;
  let center = vec2f(0.5, 0.5);
  let dist = length(uv - center);

  let pType = u32(input.particleType);
  var alpha = 0.0;
  var color = input.color.rgb;

  if (pType == 0u) { // plasma - soft glow
    alpha = exp(-dist * 4.0) * input.color.a;
    // Add plasma shimmer
    let shimmer = sin(uniforms.time * 15.0 + uv.x * 20.0) * 0.2 + 0.8;
    color *= shimmer;

  } else if (pType == 1u) { // field - directional
    let elongation = abs(uv.x - 0.5) * 0.3;
    let fieldDist = length(vec2f((uv.x - 0.5) * 0.7, uv.y - 0.5));
    alpha = exp(-fieldDist * 5.0) * input.color.a;

  } else if (pType == 2u) { // arc - electric discharge
    // Jagged electric pattern
    let noise = sin(uv.y * 50.0 + uniforms.time * 40.0) * 0.1;
    let arcDist = abs(uv.x - 0.5 + noise);
    alpha = exp(-arcDist * 15.0) * input.color.a;
    // Electric flicker
    let flicker = step(0.7, sin(uniforms.time * 60.0 + uv.y * 10.0));
    color += vec3f(0.3, 0.5, 1.0) * flicker * 0.5;

  } else if (pType == 3u) { // attract - converging
    let ring = abs(dist - 0.3 * input.life);
    alpha = exp(-ring * 10.0) * input.color.a;
    alpha += exp(-dist * 4.0) * input.color.a * 0.3;

  } else if (pType == 4u) { // repel - expanding
    let ring = abs(dist - 0.4 * (1.0 - input.life));
    alpha = exp(-ring * 8.0) * input.color.a;
    // Add repulsion burst
    let burst = exp(-dist * 3.0) * (1.0 - input.life);
    alpha += burst * 0.5;

  } else if (pType == 5u) { // victory - sparkle
    // Star shape
    let angle = atan2(uv.y - 0.5, uv.x - 0.5);
    let star = abs(sin(angle * 4.0 + uniforms.time * 3.0));
    let starShape = mix(dist, dist * star, 0.5);
    alpha = exp(-starShape * 5.0) * input.color.a;
    // Rainbow shimmer
    color = mix(color, vec3f(
      sin(uniforms.time * 3.0 + input.life * 10.0) * 0.5 + 0.5,
      sin(uniforms.time * 3.5 + input.life * 10.0 + 2.0) * 0.5 + 0.5,
      sin(uniforms.time * 4.0 + input.life * 10.0 + 4.0) * 0.5 + 0.5
    ), 0.3);

  } else { // ambient
    alpha = exp(-dist * 3.0) * input.color.a;
  }

  // Add glow for all particles
  let glow = exp(-dist * 2.0) * 0.2;
  alpha += glow * input.color.a;

  return vec4f(color, alpha);
}
`;

export const fieldShader = /* wgsl */ `
struct Uniforms {
  time: f32,
  intensity: f32,
  polarityN: f32,
  polarityS: f32,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;

struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) uv: vec2f,
}

@vertex
fn vertexMain(@builtin(vertex_index) vertexIndex: u32) -> VertexOutput {
  var pos = array<vec2f, 6>(
    vec2f(-1.0, -1.0), vec2f(1.0, -1.0), vec2f(-1.0, 1.0),
    vec2f(-1.0, 1.0), vec2f(1.0, -1.0), vec2f(1.0, 1.0)
  );

  var output: VertexOutput;
  output.position = vec4f(pos[vertexIndex], 0.0, 1.0);
  output.uv = pos[vertexIndex] * 0.5 + 0.5;
  return output;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  let uv = input.uv;
  let time = uniforms.time;
  let intensity = uniforms.intensity;

  if (intensity <= 0.0) {
    return vec4f(0.0, 0.0, 0.0, 0.0);
  }

  // Active field visualization
  let center = vec2f(0.5, 0.5);
  let dist = length(uv - center);

  // Pulsing field rings
  let ring1 = sin(dist * 30.0 - time * 5.0) * 0.5 + 0.5;
  let ring2 = sin(dist * 20.0 - time * 3.0) * 0.5 + 0.5;

  // Field line pattern
  let angle = atan2(uv.y - 0.5, uv.x - 0.5);
  let fieldLine = pow(abs(sin(angle * 8.0)), 10.0);

  // Combine effects
  let effect = (ring1 * 0.5 + ring2 * 0.5) * fieldLine;

  // N polarity color (red/orange)
  let colorN = vec3f(0.9, 0.3, 0.2) * uniforms.polarityN;
  // S polarity color (blue/cyan)
  let colorS = vec3f(0.2, 0.5, 0.9) * uniforms.polarityS;

  let color = colorN + colorS;
  let alpha = effect * intensity * 0.4 * exp(-dist * 2.0);

  return vec4f(color, alpha);
}
`;

export const victoryShader = /* wgsl */ `
struct Uniforms {
  time: f32,
  intensity: f32,
  _pad1: f32,
  _pad2: f32,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;

struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) uv: vec2f,
}

@vertex
fn vertexMain(@builtin(vertex_index) vertexIndex: u32) -> VertexOutput {
  var pos = array<vec2f, 6>(
    vec2f(-1.0, -1.0), vec2f(1.0, -1.0), vec2f(-1.0, 1.0),
    vec2f(-1.0, 1.0), vec2f(1.0, -1.0), vec2f(1.0, 1.0)
  );

  var output: VertexOutput;
  output.position = vec4f(pos[vertexIndex], 0.0, 1.0);
  output.uv = pos[vertexIndex] * 0.5 + 0.5;
  return output;
}

fn hash(p: vec2f) -> f32 {
  return fract(sin(dot(p, vec2f(127.1, 311.7))) * 43758.5453);
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  let uv = input.uv;
  let time = uniforms.time;
  let intensity = uniforms.intensity;

  if (intensity <= 0.0) {
    return vec4f(0.0, 0.0, 0.0, 0.0);
  }

  let center = vec2f(0.5, 0.5);
  let dist = length(uv - center);
  let angle = atan2(uv.y - 0.5, uv.x - 0.5);

  // Victory energy burst
  let burst = exp(-dist * 3.0 * (1.0 - intensity * 0.5));

  // Rotating energy beams
  let beamCount = 12.0;
  let beam = pow(abs(sin(angle * beamCount + time * 2.0)), 8.0);
  let beamFade = exp(-dist * 2.0);

  // Plasma celebration
  let plasma1 = sin(uv.x * 20.0 + time * 5.0) * sin(uv.y * 20.0 + time * 4.0);
  let plasma2 = sin(dist * 15.0 - time * 6.0);

  // Color gradient (purple -> cyan -> white)
  let t = sin(time * 2.0 + dist * 5.0) * 0.5 + 0.5;
  let purple = vec3f(0.6, 0.2, 0.9);
  let cyan = vec3f(0.2, 0.8, 1.0);
  let white = vec3f(1.0, 1.0, 1.0);

  var color = mix(purple, cyan, t);
  color = mix(color, white, burst * 0.5);

  // Add energy effects
  color += vec3f(0.3, 0.5, 0.8) * beam * beamFade * 0.5;
  color += vec3f(0.5, 0.3, 0.8) * plasma1 * 0.1;

  // Sparkle overlay
  let sparkle = hash(uv * 100.0 + time);
  if (sparkle > 0.97) {
    color += vec3f(1.0, 1.0, 1.0) * 0.5;
  }

  let alpha = (burst + beam * beamFade * 0.3 + plasma2 * 0.1) * intensity;

  return vec4f(color, clamp(alpha, 0.0, 0.8));
}
`;
