/**
 * WGSL Shaders - Blueprint
 * Architecture / Engineering / Construction Theme
 * Game #136
 */

export const BACKGROUND_SHADER = /* wgsl */ `
struct Uniforms {
  time: f32,
  aspectRatio: f32,
  buildProgress: f32,
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
  return fract(sin(dot(p, vec2f(127.1, 311.7))) * 43758.5453);
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

// Blueprint grid pattern
fn blueprintGrid(uv: vec2f, time: f32) -> vec3f {
  let blueprintBg = vec3f(0.05, 0.15, 0.35);

  // Fine grid
  let fineGrid = 50.0;
  let fineX = abs(sin(uv.x * fineGrid * 3.14159));
  let fineY = abs(sin(uv.y * fineGrid * 3.14159));
  let fine = smoothstep(0.02, 0.0, fineX) + smoothstep(0.02, 0.0, fineY);

  // Major grid
  let majorGrid = 10.0;
  let majorX = abs(sin(uv.x * majorGrid * 3.14159));
  let majorY = abs(sin(uv.y * majorGrid * 3.14159));
  let major = smoothstep(0.03, 0.0, majorX) + smoothstep(0.03, 0.0, majorY);

  let gridColor = vec3f(0.20, 0.45, 0.75);
  let fineColor = vec3f(0.12, 0.30, 0.55);

  var color = blueprintBg;
  color = mix(color, fineColor, fine * 0.3);
  color = mix(color, gridColor, major * 0.5);

  return color;
}

// Technical drawing lines
fn technicalLines(uv: vec2f, time: f32) -> f32 {
  var lines = 0.0;

  // Dimension lines
  let dimY1 = smoothstep(0.003, 0.0, abs(uv.y - 0.15));
  let dimY2 = smoothstep(0.003, 0.0, abs(uv.y - 0.85));

  // Animated measurement
  let measureX = fract(uv.x * 3.0 - time * 0.1);
  let dashPattern = step(0.5, measureX);

  lines += dimY1 * dashPattern * 0.4;
  lines += dimY2 * dashPattern * 0.4;

  // Cross-section lines
  let angle = 0.785; // 45 degrees
  let diagonal = uv.x * cos(angle) + uv.y * sin(angle);
  let hatch = smoothstep(0.01, 0.0, abs(fract(diagonal * 20.0) - 0.5) - 0.45);

  // Only show hatching in certain areas
  let hatchMask = smoothstep(0.3, 0.35, uv.x) * smoothstep(0.7, 0.65, uv.x);
  hatchMask *= smoothstep(0.3, 0.35, uv.y) * smoothstep(0.7, 0.65, uv.y);

  lines += hatch * hatchMask * 0.2;

  return lines;
}

// Construction corner markers
fn cornerMarkers(uv: vec2f, time: f32) -> f32 {
  var markers = 0.0;
  let corners = array<vec2f, 4>(
    vec2f(0.1, 0.1),
    vec2f(0.9, 0.1),
    vec2f(0.1, 0.9),
    vec2f(0.9, 0.9)
  );

  for (var i = 0u; i < 4u; i++) {
    let corner = corners[i];
    let d = distance(uv, corner);

    // L-shaped marker
    let toCorner = uv - corner;
    let signX = select(-1.0, 1.0, f32(i % 2u) < 0.5);
    let signY = select(-1.0, 1.0, f32(i / 2u) < 0.5);

    let armH = smoothstep(0.003, 0.0, abs(toCorner.y)) *
               step(0.0, toCorner.x * signX) * step(toCorner.x * signX, 0.05);
    let armV = smoothstep(0.003, 0.0, abs(toCorner.x)) *
               step(0.0, toCorner.y * signY) * step(toCorner.y * signY, 0.05);

    let pulse = 0.7 + 0.3 * sin(time * 2.0 + f32(i) * 1.57);
    markers += (armH + armV) * pulse;
  }

  return markers;
}

// Building outline sketch effect
fn buildingSketch(uv: vec2f, time: f32, progress: f32) -> f32 {
  var sketch = 0.0;

  // Simple building outline
  let buildCenter = vec2f(0.5, 0.5);
  let buildSize = vec2f(0.25, 0.35);

  let toCenter = abs(uv - buildCenter);

  // Building rectangle outline
  let nearX = smoothstep(0.005, 0.0, abs(toCenter.x - buildSize.x));
  let nearY = smoothstep(0.005, 0.0, abs(toCenter.y - buildSize.y));
  let inBoundsX = step(toCenter.x, buildSize.x);
  let inBoundsY = step(toCenter.y, buildSize.y);

  // Animated drawing effect
  let drawProgress = fract(time * 0.15);
  let uvAngle = atan2(uv.y - 0.5, uv.x - 0.5) / 6.28318 + 0.5;
  let drawing = smoothstep(drawProgress - 0.1, drawProgress, uvAngle) *
                smoothstep(drawProgress + 0.1, drawProgress, uvAngle);

  sketch = (nearX * inBoundsY + nearY * inBoundsX) * (0.3 + 0.2 * drawing);

  // Progress-based fill
  let fillArea = inBoundsX * inBoundsY;
  let fillLevel = step(1.0 - uv.y, progress * 0.7 + 0.15);
  sketch += fillArea * fillLevel * 0.05 * progress;

  return sketch;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  let uv = input.uv;
  let time = uniforms.time;
  let progress = uniforms.buildProgress;

  // Base blueprint grid
  var color = blueprintGrid(uv, time);

  // Technical drawing lines
  let techLines = technicalLines(uv, time);
  color += vec3f(0.7, 0.85, 1.0) * techLines;

  // Corner markers
  let markers = cornerMarkers(uv, time);
  color += vec3f(0.9, 0.3, 0.2) * markers;

  // Building sketch
  let sketch = buildingSketch(uv, time, progress);
  color += vec3f(0.95, 0.97, 1.0) * sketch;

  // Paper texture
  let paperNoise = noise(uv * 200.0) * 0.03;
  color += vec3f(paperNoise);

  // Vignette
  let vignette = 1.0 - length(uv - 0.5) * 0.4;
  color *= vignette;

  // Slight blue tint for blueprint feel
  color = mix(color, vec3f(0.1, 0.3, 0.6), 0.1);

  return vec4f(color, 1.0);
}
`;

export const PARTICLE_SHADER = /* wgsl */ `
struct Uniforms {
  time: f32,
  aspectRatio: f32,
  buildProgress: f32,
  padding: f32,
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
  let size = particle.size * lifeRatio;

  var pos = particle.position + corner * size;
  pos.x /= uniforms.aspectRatio;

  var output: VertexOutput;
  output.position = vec4f(pos * 2.0 - 1.0, 0.0, 1.0);
  output.color = vec4f(particle.color.rgb, particle.color.a * lifeRatio);
  output.uv = corner * 0.5 + 0.5;
  output.particleType = particle.particleType;
  return output;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  let uv = input.uv;
  let center = vec2f(0.5, 0.5);
  let d = distance(uv, center);
  let pType = i32(input.particleType);

  var alpha = input.color.a;
  var color = input.color.rgb;

  switch pType {
    // Grid dot
    case 0: {
      alpha *= smoothstep(0.5, 0.3, d);
      alpha *= 0.7 + 0.3 * sin(uniforms.time * 3.0);
    }
    // Dimension marker
    case 1: {
      let cross = min(
        smoothstep(0.15, 0.05, abs(uv.x - 0.5)),
        step(abs(uv.y - 0.5), 0.4)
      ) + min(
        smoothstep(0.15, 0.05, abs(uv.y - 0.5)),
        step(abs(uv.x - 0.5), 0.4)
      );
      alpha *= cross;
    }
    // Construction spark
    case 2: {
      let spark = smoothstep(0.5, 0.0, d);
      let flicker = 0.7 + 0.3 * sin(uniforms.time * 20.0 + d * 10.0);
      alpha *= spark * flicker;
      color += vec3f(0.5, 0.3, 0.0) * spark;
    }
    // Blueprint trace
    case 3: {
      let trace = smoothstep(0.5, 0.2, d);
      let glow = exp(-d * 4.0);
      alpha *= trace;
      color += vec3f(0.2, 0.4, 0.6) * glow;
    }
    // Block place effect
    case 4: {
      let square = max(abs(uv.x - 0.5), abs(uv.y - 0.5));
      let ring = smoothstep(0.5, 0.4, square) * smoothstep(0.3, 0.4, square);
      let pulse = 0.6 + 0.4 * sin(uniforms.time * 5.0);
      alpha *= ring * pulse;
    }
    // Measurement line
    case 5: {
      let line = smoothstep(0.1, 0.0, abs(uv.y - 0.5));
      let dash = step(0.5, fract(uv.x * 4.0));
      alpha *= line * dash;
    }
    default: {
      alpha *= smoothstep(0.5, 0.2, d);
    }
  }

  return vec4f(color, alpha);
}
`;
