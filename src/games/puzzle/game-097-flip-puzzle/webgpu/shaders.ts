/**
 * WebGPU Shaders - Flip Puzzle
 * Binary / Toggle / Neon Tiles Theme
 * Game #097
 */

export const BACKGROUND_SHADER = /* wgsl */ `
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
  var p3 = fract(vec3f(p.xyx) * 0.1031);
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

fn binaryMatrix(uv: vec2f, time: f32) -> f32 {
  // Falling binary digits
  let col = floor(uv.x * 20.0);
  let row = floor(uv.y * 30.0 - time * 3.0);

  let digit = hash(vec2f(col, row));
  let isBinary = step(0.7, digit);

  let cellUV = fract(vec2f(uv.x * 20.0, uv.y * 30.0 - time * 3.0));
  let digitShape = step(0.2, cellUV.x) * step(cellUV.x, 0.8) *
                   step(0.2, cellUV.y) * step(cellUV.y, 0.8);

  return isBinary * digitShape * 0.3;
}

fn tileGrid(uv: vec2f, time: f32) -> f32 {
  let gridSize = 8.0;
  let grid = uv * gridSize;
  let cell = floor(grid);
  let cellUV = fract(grid);

  // Animated tile borders
  let border = 0.05;
  let isEdge = step(cellUV.x, border) + step(1.0 - border, cellUV.x) +
               step(cellUV.y, border) + step(1.0 - border, cellUV.y);

  // Random tile states
  let state = step(0.5, hash(cell + floor(time * 0.5)));

  let glow = smoothstep(0.5, 0.0, length(cellUV - 0.5)) * state;

  return min(isEdge, 1.0) * 0.2 + glow * 0.15;
}

fn circuitLines(uv: vec2f, time: f32) -> f32 {
  var lines: f32 = 0.0;

  // Horizontal circuit traces
  for (var i = 0u; i < 5u; i++) {
    let fi = f32(i);
    let y = hash(vec2f(fi, 0.0)) + sin(time * 0.5 + fi) * 0.05;
    let lineY = smoothstep(0.01, 0.0, abs(uv.y - y));

    // Animated segments
    let segX = fract(uv.x * 10.0 - time * 0.3 * (hash(vec2f(fi, 1.0)) + 0.5));
    let segment = step(0.3, segX) * step(segX, 0.7);

    lines += lineY * segment * 0.3;
  }

  // Vertical circuit traces
  for (var i = 0u; i < 4u; i++) {
    let fi = f32(i);
    let x = hash(vec2f(fi, 10.0)) + sin(time * 0.3 + fi) * 0.05;
    let lineX = smoothstep(0.01, 0.0, abs(uv.x - x));

    let segY = fract(uv.y * 8.0 + time * 0.2 * (hash(vec2f(fi, 11.0)) + 0.5));
    let segment = step(0.4, segY) * step(segY, 0.6);

    lines += lineX * segment * 0.3;
  }

  return lines;
}

fn pulsingNodes(uv: vec2f, time: f32) -> vec3f {
  var color = vec3f(0.0);

  for (var i = 0u; i < 6u; i++) {
    let fi = f32(i);
    let pos = vec2f(
      hash(vec2f(fi, 100.0)),
      hash(vec2f(fi, 200.0))
    );

    let dist = length(uv - pos);
    let pulse = sin(time * 2.0 + fi * 1.5) * 0.5 + 0.5;
    let glow = smoothstep(0.1, 0.0, dist) * pulse;

    // Alternate between on (teal) and off (coral) colors
    let isOn = step(0.5, hash(vec2f(fi, floor(time * 0.5))));
    let nodeColor = mix(
      vec3f(0.91, 0.45, 0.45), // coral
      vec3f(0.306, 0.8, 0.639), // teal
      isOn
    );

    color += nodeColor * glow;
  }

  return color;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  let uv = input.uv;
  let time = uniforms.time;

  // Deep blue base
  var color = vec3f(0.05, 0.08, 0.15);

  // Binary matrix rain
  let binary = binaryMatrix(uv, time);
  color += vec3f(0.0, 0.6, 0.8) * binary;

  // Tile grid pattern
  let tiles = tileGrid(uv, time);
  color += vec3f(0.306, 0.8, 0.639) * tiles;

  // Circuit lines
  let circuits = circuitLines(uv, time);
  color += vec3f(0.0, 0.831, 1.0) * circuits;

  // Pulsing nodes
  color += pulsingNodes(uv, time);

  // Subtle noise
  let n = noise(uv * 200.0 + time) * 0.02;
  color += n;

  // Vignette
  let vignette = 1.0 - length((uv - 0.5) * 1.3);
  color *= smoothstep(0.0, 0.6, vignette);

  // Intensity
  color *= 0.7 + uniforms.intensity * 0.3;

  return vec4f(color, 0.6);
}
`;

export const PARTICLE_SHADER = /* wgsl */ `
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
  particleType: f32,
  rotation: f32,
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
    vec2f(-1.0, -1.0),
    vec2f(1.0, -1.0),
    vec2f(-1.0, 1.0),
    vec2f(-1.0, 1.0),
    vec2f(1.0, -1.0),
    vec2f(1.0, 1.0)
  );

  let corner = corners[vertexIndex];
  let lifeRatio = particle.life / particle.maxLife;
  let size = particle.size * lifeRatio;

  // Apply rotation
  let cosR = cos(particle.rotation);
  let sinR = sin(particle.rotation);
  let rotated = vec2f(
    corner.x * cosR - corner.y * sinR,
    corner.x * sinR + corner.y * cosR
  );

  let worldPos = vec2f(particle.x, particle.y) + rotated * size;
  let clipPos = vec2f(
    (worldPos.x / uniforms.width) * 2.0 - 1.0,
    1.0 - (worldPos.y / uniforms.height) * 2.0
  );

  var output: VertexOutput;
  output.position = vec4f(clipPos, 0.0, 1.0);
  output.uv = corner * 0.5 + 0.5;
  output.life = lifeRatio;
  output.particleType = particle.particleType;
  output.rotation = particle.rotation;
  output.extra = particle.extra;
  return output;
}

fn tileShape(uv: vec2f) -> f32 {
  let border = 0.1;
  let inner = step(border, uv.x) * step(uv.x, 1.0 - border) *
              step(border, uv.y) * step(uv.y, 1.0 - border);
  return inner;
}

fn flipEffect(uv: vec2f, life: f32) -> f32 {
  // Tile flipping animation
  let scaleX = abs(cos(life * 3.14159));
  let adjustedUV = vec2f((uv.x - 0.5) / max(scaleX, 0.1) + 0.5, uv.y);

  if (adjustedUV.x < 0.0 || adjustedUV.x > 1.0) {
    return 0.0;
  }

  return tileShape(adjustedUV);
}

fn toggleGlow(uv: vec2f, life: f32) -> f32 {
  let dist = length(uv - 0.5);
  return smoothstep(0.5, 0.0, dist) * life;
}

fn sparkShape(uv: vec2f, time: f32) -> f32 {
  let center = uv - 0.5;
  let dist = length(center);
  let angle = atan2(center.y, center.x);

  let rays = 4.0;
  let star = abs(sin(angle * rays + time * 8.0));

  return smoothstep(0.5, 0.0, dist) * (0.5 + star * 0.5);
}

fn pulseRing(uv: vec2f, life: f32) -> f32 {
  let dist = length(uv - 0.5);
  let radius = 0.2 + (1.0 - life) * 0.3;
  return smoothstep(0.08, 0.0, abs(dist - radius)) * life;
}

fn matchEffect(uv: vec2f, life: f32, time: f32) -> f32 {
  let dist = length(uv - 0.5);
  let pulse = sin(time * 10.0) * 0.5 + 0.5;
  return smoothstep(0.5, 0.2, dist) * life * (0.7 + pulse * 0.3);
}

fn binaryDigit(uv: vec2f) -> f32 {
  // Simple 1 or 0 shape
  let dist = length(uv - 0.5);
  return smoothstep(0.4, 0.3, dist);
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  let uv = input.uv;
  let life = input.life;
  let pType = i32(input.particleType);
  let time = uniforms.time;

  var alpha: f32 = 0.0;
  var color: vec3f;

  // Colors
  let onColor = vec3f(0.306, 0.8, 0.639);   // Teal
  let offColor = vec3f(0.157, 0.204, 0.376); // Dark blue
  let accentColor = vec3f(0.91, 0.45, 0.45); // Coral
  let cyanGlow = vec3f(0.0, 0.831, 1.0);
  let white = vec3f(1.0, 1.0, 1.0);

  switch (pType) {
    case 0: { // flip - tile flip effect
      alpha = flipEffect(uv, 1.0 - life) * life;
      let isOn = input.extra > 0.5;
      color = select(offColor, onColor, isOn);
      // Edge highlight
      let edge = smoothstep(0.15, 0.1, min(min(uv.x, 1.0 - uv.x), min(uv.y, 1.0 - uv.y)));
      color += cyanGlow * edge * 0.3;
    }
    case 1: { // glow - ambient tile glow
      alpha = toggleGlow(uv, life) * 0.7;
      let isOn = input.extra > 0.5;
      color = select(accentColor, onColor, isOn);
    }
    case 2: { // toggle - toggle state change
      alpha = pulseRing(uv, life);
      color = cyanGlow;
    }
    case 3: { // spark - celebration sparks
      alpha = sparkShape(uv, time) * life;
      let colorMix = fract(input.extra * 5.0);
      color = mix(onColor, accentColor, colorMix);
    }
    case 4: { // pulse - expanding pulse
      alpha = pulseRing(uv, life);
      color = mix(cyanGlow, onColor, 0.5);
    }
    case 5: { // match - pattern match effect
      alpha = matchEffect(uv, life, time);
      color = onColor + white * 0.3;
    }
    default: {
      alpha = toggleGlow(uv, life);
      color = white;
    }
  }

  alpha *= uniforms.intensity;

  return vec4f(color, alpha);
}
`;
