/**
 * WebGPU Shaders - Robot Program
 * Cyber / Robot / Programming / Circuit Theme
 * Game #095
 */

export const BACKGROUND_SHADER = /* wgsl */ `
struct Uniforms {
  time: f32,
  width: f32,
  height: f32,
  level: f32,
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

// Hash function
fn hash(p: vec2f) -> f32 {
  return fract(sin(dot(p, vec2f(127.1, 311.7))) * 43758.5453);
}

// Circuit board pattern
fn circuitBoard(uv: vec2f, time: f32) -> vec3f {
  let scale = 25.0;
  let gridPos = floor(uv * scale);
  let gridUV = fract(uv * scale);

  // Junction points
  let isJunction = (i32(gridPos.x + gridPos.y) % 4 == 0);

  // Traces (horizontal and vertical lines)
  let hTrace = smoothstep(0.02, 0.0, abs(gridUV.y - 0.5)) * 0.5;
  let vTrace = smoothstep(0.02, 0.0, abs(gridUV.x - 0.5)) * 0.5;

  // Random trace connections
  let rnd = hash(gridPos);
  var trace = 0.0;
  if (rnd > 0.7) {
    trace = hTrace;
  } else if (rnd > 0.4) {
    trace = vTrace;
  }

  // Junction dots
  let junctionDot = smoothstep(0.15, 0.1, length(gridUV - 0.5));

  // Combine
  var intensity = trace;
  if (isJunction) {
    intensity = max(intensity, junctionDot * 0.6);
  }

  // Animated pulse along traces
  let pulse = sin(gridPos.x * 0.5 + gridPos.y * 0.3 - time * 2.0) * 0.5 + 0.5;
  intensity *= 0.5 + pulse * 0.5;

  return vec3f(0.0, 0.85, 1.0) * intensity;
}

// Binary rain effect
fn binaryRain(uv: vec2f, time: f32) -> f32 {
  let col = floor(uv.x * 40.0);
  let speed = hash(vec2f(col, 0.0)) * 0.5 + 0.5;
  let offset = hash(vec2f(col, 1.0));

  let y = fract(uv.y + time * speed * 0.3 + offset);
  let fade = smoothstep(0.0, 0.3, y) * smoothstep(1.0, 0.7, y);

  let charPos = floor(y * 20.0);
  let charRnd = hash(vec2f(col, charPos + floor(time * 2.0)));

  return fade * step(0.7, charRnd) * 0.08;
}

// Hexagonal grid
fn hexGrid(uv: vec2f, time: f32) -> f32 {
  let scale = 10.0;
  var p = uv * scale;

  // Hex coordinates
  let s = vec2f(1.0, 1.732);
  let a = p - s * floor((p + 0.5) / s);
  let b = p - s * floor(p / s) - s * 0.5;

  let hex = min(length(a), length(b));
  let edge = smoothstep(0.05, 0.0, abs(hex - 0.5));

  let pulse = sin(length(uv - 0.5) * 10.0 - time * 2.0) * 0.5 + 0.5;

  return edge * 0.1 * pulse;
}

// Data stream visualization
fn dataStream(uv: vec2f, time: f32) -> vec3f {
  var stream = vec3f(0.0);

  for (var i = 0; i < 3; i++) {
    let fi = f32(i);
    let y = 0.2 + fi * 0.3;
    let dist = abs(uv.y - y);

    if (dist < 0.02) {
      let flow = fract(uv.x * 5.0 - time * (1.0 + fi * 0.5));
      let packet = smoothstep(0.1, 0.0, abs(flow - 0.5)) * 0.5;

      let colors = array<vec3f, 3>(
        vec3f(0.0, 0.85, 1.0),   // Cyan
        vec3f(0.65, 0.45, 1.0),  // Purple
        vec3f(0.18, 1.0, 0.42)   // Green
      );

      stream += colors[i] * packet * smoothstep(0.02, 0.0, dist);
    }
  }

  return stream;
}

// Tech grid background
fn techBackground(uv: vec2f) -> vec3f {
  let dist = length(uv - 0.5);

  // Dark tech gradient
  let base = vec3f(0.08, 0.08, 0.15) * (1.0 - dist * 0.3);

  // Subtle radial pattern
  let radial = smoothstep(0.6, 0.0, dist) * 0.05;

  return base + vec3f(0.0, 0.1, 0.15) * radial;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  let uv = input.uv;
  let time = uniforms.time;

  // Base tech background
  var color = techBackground(uv);

  // Circuit board pattern
  color += circuitBoard(uv, time) * 0.15;

  // Binary rain
  color += vec3f(0.0, 0.85, 1.0) * binaryRain(uv, time);

  // Hex grid
  color += vec3f(0.0, 0.6, 0.8) * hexGrid(uv, time);

  // Data streams
  color += dataStream(uv, time) * 0.2;

  // Vignette
  let vignette = 1.0 - length(uv - 0.5) * 0.6;
  color *= vignette;

  // Scanlines
  let scanline = sin(uv.y * uniforms.height * 2.0) * 0.02 + 0.98;
  color *= scanline;

  return vec4f(color, 1.0);
}
`;

export const PARTICLE_SHADER = /* wgsl */ `
struct Uniforms {
  time: f32,
  width: f32,
  height: f32,
  level: f32,
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
  param1: f32,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;
@group(0) @binding(1) var<storage, read> particles: array<Particle>;

struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) uv: vec2f,
  @location(1) life: f32,
  @location(2) particleType: f32,
  @location(3) rotation: f32,
  @location(4) param1: f32,
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

  // Rotate corner
  let cos_r = cos(particle.rotation);
  let sin_r = sin(particle.rotation);
  let rotatedCorner = vec2f(
    corner.x * cos_r - corner.y * sin_r,
    corner.x * sin_r + corner.y * cos_r
  );

  let size = particle.size * lifeRatio;
  let x = (particle.x / uniforms.width) * 2.0 - 1.0;
  let y = 1.0 - (particle.y / uniforms.height) * 2.0;

  let aspectX = size / uniforms.width * 2.0;
  let aspectY = size / uniforms.height * 2.0;

  var output: VertexOutput;
  output.position = vec4f(
    x + rotatedCorner.x * aspectX,
    y + rotatedCorner.y * aspectY,
    0.0, 1.0
  );
  output.uv = corner * 0.5 + 0.5;
  output.life = lifeRatio;
  output.particleType = particle.particleType;
  output.rotation = particle.rotation;
  output.param1 = particle.param1;

  return output;
}

// Cyber colors
fn cyberColor(t: f32) -> vec3f {
  let colors = array<vec3f, 5>(
    vec3f(0.0, 0.85, 1.0),   // Cyan
    vec3f(0.18, 1.0, 0.42),  // Green
    vec3f(1.0, 0.84, 0.0),   // Yellow
    vec3f(1.0, 0.29, 0.29),  // Red
    vec3f(0.65, 0.45, 1.0)   // Purple
  );

  let idx = t * 4.0;
  let i = i32(floor(idx));
  let f = fract(idx);

  let i0 = clamp(i, 0, 4);
  let i1 = clamp(i + 1, 0, 4);

  return mix(colors[i0], colors[i1], f);
}

// Circuit trace particle
fn circuitShape(uv: vec2f, time: f32, param: f32) -> vec4f {
  let center = vec2f(0.5, 0.5);

  // L-shaped circuit trace
  let hLine = smoothstep(0.08, 0.0, abs(uv.y - 0.5)) * step(uv.x, 0.5);
  let vLine = smoothstep(0.08, 0.0, abs(uv.x - 0.5)) * step(0.5, uv.y);
  let trace = max(hLine, vLine);

  // Junction dot
  let junction = smoothstep(0.15, 0.1, length(uv - 0.5));

  let intensity = max(trace, junction);
  let pulse = sin(time * 5.0 + param * 10.0) * 0.3 + 0.7;

  let color = vec3f(0.0, 0.85, 1.0) * intensity * pulse;

  return vec4f(color, intensity);
}

// Electric spark
fn sparkShape(uv: vec2f, time: f32, param: f32) -> vec4f {
  let center = vec2f(0.5, 0.5);
  let dist = length(uv - center);

  // Spark core
  let core = smoothstep(0.2, 0.0, dist);
  let flicker = sin(time * 30.0 + param * 50.0) * 0.4 + 0.6;

  // Electric tendrils
  let angle = atan2(uv.y - 0.5, uv.x - 0.5);
  let tendril = sin(angle * 6.0 + time * 10.0) * 0.1;
  let tendrilMask = smoothstep(0.3, 0.1, dist + tendril);

  let intensity = max(core, tendrilMask * 0.5) * flicker;
  let color = mix(vec3f(1.0, 1.0, 1.0), vec3f(0.0, 0.85, 1.0), dist);

  return vec4f(color * intensity, intensity);
}

// Robot glow
fn robotShape(uv: vec2f, time: f32, param: f32) -> vec4f {
  let center = vec2f(0.5, 0.5);

  // Square robot body
  let box = max(abs(uv.x - 0.5), abs(uv.y - 0.5));
  let body = smoothstep(0.35, 0.3, box);

  // Eyes
  let eye1 = smoothstep(0.1, 0.05, length(uv - vec2f(0.35, 0.4)));
  let eye2 = smoothstep(0.1, 0.05, length(uv - vec2f(0.65, 0.4)));

  // Antenna pulse
  let antenna = smoothstep(0.08, 0.0, abs(uv.x - 0.5)) * step(uv.y, 0.2);
  let antennaPulse = sin(time * 5.0) * 0.5 + 0.5;

  let intensity = body + (eye1 + eye2) * 0.8 + antenna * antennaPulse;
  let color = vec3f(0.0, 0.85, 1.0);

  return vec4f(color * intensity, intensity);
}

// Data pulse
fn pulseShape(uv: vec2f, time: f32, life: f32, param: f32) -> vec4f {
  let center = vec2f(0.5, 0.5);
  let dist = length(uv - center);

  // Expanding ring
  let ringPos = (1.0 - life) * 0.4;
  let ring = smoothstep(0.08, 0.0, abs(dist - ringPos));

  // Core glow
  let core = exp(-dist * 8.0) * life;

  let color = cyberColor(param);
  let intensity = ring + core * 0.5;

  return vec4f(color * intensity, intensity * life);
}

// Command beam
fn beamShape(uv: vec2f, time: f32, rotation: f32, param: f32) -> vec4f {
  // Rotated beam
  let cos_r = cos(-rotation);
  let sin_r = sin(-rotation);
  let local = vec2f(
    (uv.x - 0.5) * cos_r - (uv.y - 0.5) * sin_r,
    (uv.x - 0.5) * sin_r + (uv.y - 0.5) * cos_r
  );

  // Arrow shape
  let beam = smoothstep(0.1, 0.0, abs(local.y)) * step(-0.3, local.x);
  let arrowHead = smoothstep(0.0, -0.2, local.x - abs(local.y) * 2.0) * step(0.2, local.x);

  let intensity = max(beam, arrowHead);
  let pulse = sin(time * 8.0 + param * 5.0) * 0.3 + 0.7;

  // Direction colors
  let colors = array<vec3f, 4>(
    vec3f(0.18, 1.0, 0.42),  // Up - Green
    vec3f(1.0, 0.29, 0.29),  // Down - Red
    vec3f(0.65, 0.45, 1.0),  // Left - Purple
    vec3f(1.0, 0.84, 0.0)    // Right - Yellow
  );
  let colorIdx = i32(param * 3.99);
  let color = colors[colorIdx];

  return vec4f(color * intensity * pulse, intensity);
}

// Data packet
fn dataShape(uv: vec2f, time: f32, param: f32) -> vec4f {
  let center = vec2f(0.5, 0.5);

  // Hexagonal data packet
  let p = (uv - center) * 2.0;
  let hex = max(abs(p.x) * 0.866 + abs(p.y) * 0.5, abs(p.y));
  let packet = smoothstep(0.5, 0.4, hex);

  // Inner pattern
  let inner = smoothstep(0.3, 0.25, hex) - smoothstep(0.25, 0.2, hex);

  // Binary flicker
  let flicker = step(0.5, sin(time * 10.0 + param * 20.0));

  let color = vec3f(0.65, 0.45, 1.0) * (packet + inner * flicker * 0.5);

  return vec4f(color, packet);
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  let uv = input.uv;
  let pType = i32(input.particleType);
  let time = uniforms.time;

  var color: vec4f;

  switch(pType) {
    case 0: { // circuit
      color = circuitShape(uv, time, input.param1);
    }
    case 1: { // spark
      color = sparkShape(uv, time, input.param1);
    }
    case 2: { // robot
      color = robotShape(uv, time, input.param1);
    }
    case 3: { // pulse
      color = pulseShape(uv, time, input.life, input.param1);
    }
    case 4: { // beam
      color = beamShape(uv, time, input.rotation, input.param1);
    }
    case 5: { // data
      color = dataShape(uv, time, input.param1);
    }
    default: {
      color = vec4f(0.0, 0.85, 1.0, input.life);
    }
  }

  color.a *= input.life;

  return color;
}
`;
