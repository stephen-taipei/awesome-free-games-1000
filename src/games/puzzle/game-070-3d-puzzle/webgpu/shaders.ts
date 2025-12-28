/**
 * WGSL Shaders - 3D Puzzle
 * Holographic / Geometric / Futuristic Theme
 * Game #070
 */

export const BACKGROUND_SHADER = /* wgsl */ `
struct Uniforms {
  time: f32,
  width: f32,
  height: f32,
  pad: f32,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;

@vertex
fn vertexMain(@builtin(vertex_index) idx: u32) -> @builtin(position) vec4f {
  var pos = array<vec2f, 4>(
    vec2f(-1, -1), vec2f(1, -1), vec2f(-1, 1), vec2f(1, 1)
  );
  return vec4f(pos[idx], 0, 1);
}

// Holographic grid pattern
fn holoGrid(uv: vec2f, time: f32) -> f32 {
  let gridSize = 40.0;
  let lineWidth = 0.03;

  let gx = abs(fract(uv.x * gridSize) - 0.5);
  let gy = abs(fract(uv.y * gridSize) - 0.5);

  let lineX = smoothstep(lineWidth, 0.0, gx);
  let lineY = smoothstep(lineWidth, 0.0, gy);

  // Pulse effect
  let pulse = sin(time * 2.0 + (uv.x + uv.y) * 10.0) * 0.3 + 0.7;

  return max(lineX, lineY) * pulse * 0.3;
}

// Perspective grid (floor effect)
fn perspectiveGrid(uv: vec2f, time: f32) -> f32 {
  let centered = uv - vec2f(0.5, 0.7);
  let perspective = centered.y + 0.3;

  if (perspective <= 0.0) { return 0.0; }

  let gridU = centered.x / perspective * 2.0;
  let gridV = 1.0 / perspective * 0.5 - time * 0.2;

  let gridSize = 8.0;
  let gx = abs(fract(gridU * gridSize) - 0.5);
  let gv = abs(fract(gridV * gridSize) - 0.5);

  let lineX = smoothstep(0.05, 0.0, gx);
  let lineV = smoothstep(0.05, 0.0, gv);

  let fade = smoothstep(0.0, 0.3, perspective);
  return max(lineX, lineV) * fade * 0.4;
}

// Hexagon pattern
fn hexPattern(uv: vec2f, time: f32) -> f32 {
  let scale = 15.0;
  let p = uv * scale;

  let h = vec2f(1.0, 1.732);
  let a = p - h * floor(p / h);
  let b = p - h * (floor(p / h) + 0.5);

  let da = length(a - h * 0.5);
  let db = length(b - h * 0.5);
  let d = min(da, db);

  let pulse = sin(time + d * 2.0) * 0.5 + 0.5;
  return smoothstep(0.5, 0.4, d) * pulse * 0.2;
}

// Scanning line
fn scanLine(uv: vec2f, time: f32) -> f32 {
  let scanPos = fract(time * 0.3);
  let scanDist = abs(uv.y - scanPos);
  return smoothstep(0.02, 0.0, scanDist) * 0.5;
}

// Holographic interference
fn interference(uv: vec2f, time: f32) -> vec3f {
  let wave1 = sin(uv.x * 50.0 + time * 3.0);
  let wave2 = sin(uv.y * 50.0 - time * 2.0);
  let wave3 = sin((uv.x + uv.y) * 30.0 + time);

  let pattern = (wave1 + wave2 + wave3) / 3.0;

  // Rainbow shift
  let r = sin(pattern + time) * 0.5 + 0.5;
  let g = sin(pattern + time + 2.094) * 0.5 + 0.5;
  let b = sin(pattern + time + 4.188) * 0.5 + 0.5;

  return vec3f(r, g, b) * 0.15;
}

@fragment
fn fragmentMain(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let uv = pos.xy / vec2f(uniforms.width, uniforms.height);
  let time = uniforms.time;

  // Deep space base
  var color = vec3f(0.02, 0.04, 0.08);

  // Radial gradient
  let center = vec2f(0.5, 0.5);
  let dist = length(uv - center);
  let vignette = 1.0 - dist * 0.6;
  color *= vignette;

  // Holographic grid
  let grid = holoGrid(uv, time);
  color += vec3f(0.0, 0.8, 1.0) * grid;

  // Perspective floor grid
  let floor = perspectiveGrid(uv, time);
  color += vec3f(0.4, 0.2, 0.8) * floor;

  // Hexagon overlay
  let hex = hexPattern(uv, time);
  color += vec3f(0.0, 1.0, 0.8) * hex;

  // Scan line
  let scan = scanLine(uv, time);
  color += vec3f(1.0, 0.3, 0.8) * scan;

  // Holographic interference
  color += interference(uv, time);

  // Corner glow
  let cornerDist = min(
    min(length(uv), length(uv - vec2f(1.0, 0.0))),
    min(length(uv - vec2f(0.0, 1.0)), length(uv - vec2f(1.0, 1.0)))
  );
  let cornerGlow = smoothstep(0.3, 0.0, cornerDist) * 0.3;
  color += vec3f(0.8, 0.3, 1.0) * cornerGlow;

  return vec4f(color, 1.0);
}
`;

export const PARTICLE_SHADER = /* wgsl */ `
struct Uniforms {
  time: f32,
  width: f32,
  height: f32,
  pad: f32,
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
  @location(0) uv: vec2f,
  @location(1) color: vec4f,
  @location(2) particleType: f32,
  @location(3) life: f32,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;

@vertex
fn vertexMain(
  input: VertexInput,
  @builtin(vertex_index) vIdx: u32
) -> VertexOutput {
  var corners = array<vec2f, 4>(
    vec2f(-1, -1), vec2f(1, -1), vec2f(-1, 1), vec2f(1, 1)
  );

  let corner = corners[vIdx];
  let c = cos(input.rotation);
  let s = sin(input.rotation);
  let rotated = vec2f(
    corner.x * c - corner.y * s,
    corner.x * s + corner.y * c
  );

  let aspect = uniforms.width / uniforms.height;
  let pixelSize = input.size / min(uniforms.width, uniforms.height);
  var scale = vec2f(pixelSize, pixelSize * aspect);

  var output: VertexOutput;
  output.position = vec4f(input.position + rotated * scale, 0, 1);
  output.uv = corner * 0.5 + 0.5;
  output.color = input.color;
  output.particleType = input.particleType;
  output.life = input.life;
  return output;
}

// Wireframe cube shape
fn wireframeCube(uv: vec2f) -> f32 {
  let edge = 0.1;
  let edgeX = (uv.x < edge || uv.x > 1.0 - edge) ? 1.0 : 0.0;
  let edgeY = (uv.y < edge || uv.y > 1.0 - edge) ? 1.0 : 0.0;
  return max(edgeX, edgeY);
}

// Hologram glow
fn hologramGlow(uv: vec2f, time: f32) -> f32 {
  let centered = uv - 0.5;
  let dist = length(centered);
  let angle = atan2(centered.y, centered.x);

  let rays = sin(angle * 6.0 + time * 3.0) * 0.5 + 0.5;
  let glow = smoothstep(0.5, 0.0, dist) * (0.7 + rays * 0.3);

  // Scan lines
  let scanLine = sin(uv.y * 30.0 + time * 5.0) * 0.3 + 0.7;

  return glow * scanLine;
}

// Sparkle burst
fn sparkleBurst(uv: vec2f, life: f32) -> f32 {
  let centered = uv - 0.5;
  let dist = length(centered);
  let angle = atan2(centered.y, centered.x);

  let spikes = max(0.0, cos(angle * 4.0)) * (1.0 - dist * 2.0);
  let core = smoothstep(0.2, 0.0, dist);

  return max(spikes, core) * life;
}

// Assembly pulse
fn assemblyPulse(uv: vec2f, life: f32) -> f32 {
  let centered = uv - 0.5;
  let dist = length(centered);

  let ring = smoothstep(0.3, 0.25, dist) * smoothstep(0.15, 0.2, dist);
  let core = smoothstep(0.15, 0.0, dist);

  return (ring + core * 0.5) * life;
}

// Cube fragment
fn cubeFragment(uv: vec2f, rotation: f32) -> f32 {
  let c = cos(rotation);
  let s = sin(rotation);
  let centered = uv - 0.5;
  let rotated = vec2f(
    centered.x * c - centered.y * s,
    centered.x * s + centered.y * c
  );

  let box = max(abs(rotated.x), abs(rotated.y));
  let edge = smoothstep(0.4, 0.35, box) * smoothstep(0.25, 0.3, box);
  let face = smoothstep(0.3, 0.0, box) * 0.5;

  return edge + face;
}

// Prism refraction
fn prismShape(uv: vec2f, time: f32) -> f32 {
  let centered = uv - 0.5;

  // Triangle shape
  let angle = atan2(centered.y, centered.x) + 1.5708;
  let triAngle = (angle + 3.14159) / 6.28318 * 3.0;
  let triDist = length(centered) / (cos(fract(triAngle) * 6.28318 / 3.0 - 1.0472) * 0.5 + 0.5);

  let shape = smoothstep(0.4, 0.35, triDist);
  let edge = smoothstep(0.4, 0.38, triDist) * smoothstep(0.32, 0.35, triDist);

  // Rainbow refraction
  let rainbow = sin(time * 3.0 + angle * 2.0) * 0.3 + 0.7;

  return (shape * 0.5 + edge) * rainbow;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  let uv = input.uv;
  let pType = i32(input.particleType);
  var alpha: f32 = 0.0;
  var color = input.color.rgb;
  let time = uniforms.time;

  switch pType {
    // Wireframe
    case 0: {
      alpha = wireframeCube(uv) * input.color.a * input.life;
    }
    // Hologram
    case 1: {
      alpha = hologramGlow(uv, time) * input.color.a;
    }
    // Sparkle
    case 2: {
      alpha = sparkleBurst(uv, input.life) * input.color.a;
    }
    // Assembly
    case 3: {
      alpha = assemblyPulse(uv, input.life) * input.color.a;
    }
    // Cube
    case 4: {
      alpha = cubeFragment(uv, input.rotation) * input.color.a * input.life;
    }
    // Prism
    case 5: {
      alpha = prismShape(uv, time) * input.color.a * input.life;
      // Rainbow color
      let rainbow = sin(time * 2.0 + input.rotation) * 0.5 + 0.5;
      color = mix(color, vec3f(rainbow, 1.0 - rainbow * 0.5, rainbow * 0.8 + 0.2), 0.5);
    }
    default: {
      let dist = length(uv - 0.5);
      alpha = smoothstep(0.5, 0.0, dist) * input.color.a * input.life;
    }
  }

  return vec4f(color, alpha);
}
`;
