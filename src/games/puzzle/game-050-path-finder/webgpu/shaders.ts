/**
 * WGSL Shaders - Path Finder
 * Neon Circuit / Electronic Data Flow Theme
 * Game #050
 */

export const backgroundShader = /* wgsl */ `
struct Uniforms {
  time: f32,
  aspect: f32,
  _pad0: f32,
  _pad1: f32,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;

struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) uv: vec2f,
}

@vertex
fn vertexMain(@builtin(vertex_index) idx: u32) -> VertexOutput {
  var positions = array<vec2f, 6>(
    vec2f(-1.0, -1.0), vec2f(1.0, -1.0), vec2f(-1.0, 1.0),
    vec2f(-1.0, 1.0), vec2f(1.0, -1.0), vec2f(1.0, 1.0)
  );

  var output: VertexOutput;
  output.position = vec4f(positions[idx], 0.0, 1.0);
  output.uv = positions[idx] * 0.5 + 0.5;
  return output;
}

fn hash(p: vec2f) -> f32 {
  let k = vec2f(0.3183099, 0.3678794);
  let q = p * k + k.yx;
  return fract(16.0 * k.x * fract(q.x * q.y * (q.x + q.y)));
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

// PCB circuit grid
fn circuitGrid(uv: vec2f, time: f32) -> f32 {
  let gridSize = 0.04;
  let lineWidth = 0.002;

  let gx = abs(fract(uv.x / gridSize) - 0.5) * gridSize;
  let gy = abs(fract(uv.y / gridSize) - 0.5) * gridSize;

  let lines = smoothstep(lineWidth, 0.0, min(gx, gy));

  // Major grid lines
  let majorSize = gridSize * 4.0;
  let mx = abs(fract(uv.x / majorSize) - 0.5) * majorSize;
  let my = abs(fract(uv.y / majorSize) - 0.5) * majorSize;
  let majorLines = smoothstep(lineWidth * 2.0, 0.0, min(mx, my));

  return lines * 0.15 + majorLines * 0.3;
}

// Circuit traces
fn circuitTraces(uv: vec2f, time: f32) -> f32 {
  var trace = 0.0;
  let p = uv * vec2f(uniforms.aspect, 1.0);

  // Horizontal traces
  for (var i = 0; i < 8; i++) {
    let y = hash(vec2f(f32(i), 0.0)) * 0.8 + 0.1;
    let width = 0.003;
    let dist = abs(uv.y - y);

    if (dist < width) {
      let flow = fract(uv.x * 3.0 - time * 0.5 + f32(i) * 0.3);
      trace += smoothstep(width, 0.0, dist) * smoothstep(0.3, 0.0, abs(flow - 0.15));
    }
  }

  // Vertical traces
  for (var i = 0; i < 6; i++) {
    let x = hash(vec2f(f32(i), 1.0)) * 0.8 + 0.1;
    let width = 0.003;
    let dist = abs(uv.x - x);

    if (dist < width) {
      let flow = fract(uv.y * 3.0 - time * 0.4 + f32(i) * 0.4);
      trace += smoothstep(width, 0.0, dist) * smoothstep(0.3, 0.0, abs(flow - 0.15));
    }
  }

  return trace;
}

// Connection nodes
fn connectionNodes(uv: vec2f, time: f32) -> vec3f {
  var color = vec3f(0.0);

  for (var i = 0; i < 12; i++) {
    let seed = hash(vec2f(f32(i), 2.0));
    let x = hash(vec2f(f32(i), 3.0)) * 0.9 + 0.05;
    let y = hash(vec2f(f32(i), 4.0)) * 0.9 + 0.05;

    let d = length(uv - vec2f(x, y));
    let size = 0.008 + seed * 0.005;

    if (d < size * 3.0) {
      let pulse = 0.5 + 0.5 * sin(time * 2.0 + seed * 10.0);
      let glow = smoothstep(size * 3.0, size, d);
      let core = smoothstep(size, size * 0.5, d);

      // Alternate colors
      var nodeColor: vec3f;
      if (i % 3 == 0) {
        nodeColor = vec3f(0.0, 0.8, 1.0); // Cyan
      } else if (i % 3 == 1) {
        nodeColor = vec3f(0.4, 1.0, 0.3); // Green
      } else {
        nodeColor = vec3f(0.8, 0.3, 1.0); // Purple
      }

      color += nodeColor * glow * pulse * 0.5;
      color += vec3f(1.0) * core * pulse;
    }
  }

  return color;
}

// Data flow particles
fn dataParticles(uv: vec2f, time: f32) -> f32 {
  var particles = 0.0;

  for (var i = 0; i < 15; i++) {
    let seed = hash(vec2f(f32(i), 5.0));
    let speed = 0.2 + seed * 0.3;

    var px: f32;
    var py: f32;

    if (i % 2 == 0) {
      // Horizontal movement
      px = fract(time * speed + seed);
      py = hash(vec2f(f32(i), 6.0)) * 0.8 + 0.1;
    } else {
      // Vertical movement
      px = hash(vec2f(f32(i), 7.0)) * 0.8 + 0.1;
      py = fract(time * speed + seed);
    }

    let d = length(uv - vec2f(px, py));
    let size = 0.004;

    if (d < size * 4.0) {
      particles += smoothstep(size * 4.0, 0.0, d) * 0.5;
    }
  }

  return particles;
}

// Electric discharge effect
fn electricDischarge(uv: vec2f, time: f32) -> f32 {
  let n = noise(uv * 50.0 + time * 10.0);
  let threshold = 0.85 + 0.1 * sin(time * 3.0);
  return smoothstep(threshold, 1.0, n) * 0.3;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  let uv = input.uv;
  let time = uniforms.time;

  // Dark PCB base color
  var color = vec3f(0.02, 0.04, 0.06);

  // Subtle gradient
  color += vec3f(0.0, 0.02, 0.04) * (1.0 - uv.y);

  // Circuit grid
  let grid = circuitGrid(uv, time);
  color += vec3f(0.0, 0.15, 0.2) * grid;

  // Circuit traces with data flow
  let traces = circuitTraces(uv, time);
  color += vec3f(0.0, 0.8, 1.0) * traces;

  // Connection nodes
  color += connectionNodes(uv, time);

  // Data particles
  let particles = dataParticles(uv, time);
  color += vec3f(0.3, 0.9, 0.5) * particles;

  // Electric discharge
  let discharge = electricDischarge(uv, time);
  color += vec3f(0.5, 0.8, 1.0) * discharge;

  // Vignette
  let vignette = 1.0 - length(uv - 0.5) * 0.6;
  color *= vignette;

  // Scanline effect
  let scanline = 0.95 + 0.05 * sin(uv.y * 800.0);
  color *= scanline;

  return vec4f(color, 1.0);
}
`;

export const particleShader = /* wgsl */ `
struct Uniforms {
  time: f32,
  aspect: f32,
  _pad0: f32,
  _pad1: f32,
}

struct Particle {
  x: f32,
  y: f32,
  vx: f32,
  vy: f32,
  life: f32,
  maxLife: f32,
  size: f32,
  ptype: f32,
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
  @location(2) ptype: f32,
  @location(3) lifeRatio: f32,
}

@vertex
fn vertexMain(
  @builtin(vertex_index) vertexIdx: u32,
  @builtin(instance_index) instanceIdx: u32
) -> VertexOutput {
  var corners = array<vec2f, 6>(
    vec2f(-1.0, -1.0), vec2f(1.0, -1.0), vec2f(-1.0, 1.0),
    vec2f(-1.0, 1.0), vec2f(1.0, -1.0), vec2f(1.0, 1.0)
  );

  let p = particles[instanceIdx];
  let corner = corners[vertexIdx];

  var size = p.size;
  let lifeRatio = p.life / p.maxLife;

  // Size modulation by type
  if (p.ptype == 0.0) { // signal
    size *= 0.8 + 0.2 * sin(uniforms.time * 20.0);
  } else if (p.ptype == 1.0) { // route
    size *= lifeRatio;
  } else if (p.ptype == 2.0) { // pulse
    size *= 1.0 + (1.0 - lifeRatio) * 2.0;
  } else if (p.ptype == 3.0) { // victory
    size *= 0.8 + 0.4 * sin(uniforms.time * 10.0 + p.x * 20.0);
  }

  var pos = vec2f(p.x, p.y) * 2.0 - 1.0;
  pos.x *= uniforms.aspect;
  pos += corner * size;
  pos.x /= uniforms.aspect;

  var output: VertexOutput;
  output.position = vec4f(pos, 0.0, 1.0);
  output.uv = corner;
  output.color = vec4f(p.r, p.g, p.b, p.a * lifeRatio);
  output.ptype = p.ptype;
  output.lifeRatio = lifeRatio;
  return output;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  let d = length(input.uv);
  var alpha = 0.0;
  var color = input.color.rgb;

  if (input.ptype == 0.0) {
    // Signal - sharp core with glow
    alpha = smoothstep(1.0, 0.3, d);
    let core = smoothstep(0.4, 0.1, d);
    color = mix(color, vec3f(1.0), core);
  } else if (input.ptype == 1.0) {
    // Route - flowing line segment
    alpha = smoothstep(1.0, 0.0, d) * 0.8;
    let inner = smoothstep(0.5, 0.2, d);
    color = mix(color * 0.6, color, inner);
  } else if (input.ptype == 2.0) {
    // Pulse - expanding ring
    let ring = abs(d - 0.6);
    alpha = smoothstep(0.3, 0.0, ring) * input.lifeRatio;
    color = mix(color, vec3f(1.0), smoothstep(0.15, 0.0, ring));
  } else if (input.ptype == 3.0) {
    // Victory - electric spark
    let spark = smoothstep(1.0, 0.0, d);
    let flicker = 0.8 + 0.2 * sin(uniforms.time * 30.0 + input.uv.x * 10.0);
    alpha = spark * flicker;
    color = mix(color, vec3f(1.0, 1.0, 0.8), smoothstep(0.5, 0.0, d));
  } else {
    // Ambient - soft glow
    alpha = smoothstep(1.0, 0.0, d) * 0.5;
  }

  return vec4f(color, alpha * input.color.a);
}
`;

export const victoryShader = /* wgsl */ `
struct Uniforms {
  time: f32,
  intensity: f32,
  _pad0: f32,
  _pad1: f32,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;

struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) uv: vec2f,
}

@vertex
fn vertexMain(@builtin(vertex_index) idx: u32) -> VertexOutput {
  var positions = array<vec2f, 6>(
    vec2f(-1.0, -1.0), vec2f(1.0, -1.0), vec2f(-1.0, 1.0),
    vec2f(-1.0, 1.0), vec2f(1.0, -1.0), vec2f(1.0, 1.0)
  );

  var output: VertexOutput;
  output.position = vec4f(positions[idx], 0.0, 1.0);
  output.uv = positions[idx] * 0.5 + 0.5;
  return output;
}

fn hash(p: vec2f) -> f32 {
  let k = vec2f(0.3183099, 0.3678794);
  let q = p * k + k.yx;
  return fract(16.0 * k.x * fract(q.x * q.y * (q.x + q.y)));
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  if (uniforms.intensity <= 0.0) {
    return vec4f(0.0);
  }

  let uv = input.uv;
  let time = uniforms.time;
  let intensity = uniforms.intensity;

  var color = vec3f(0.0);

  // Circuit surge effect
  let surge = sin(time * 15.0) * 0.5 + 0.5;

  // Radial electric waves
  let center = vec2f(0.5);
  let d = length(uv - center);

  for (var i = 0; i < 5; i++) {
    let wave = fract(d * 3.0 - time * 2.0 + f32(i) * 0.2);
    let ring = smoothstep(0.1, 0.0, abs(wave - 0.5) - 0.4);

    var waveColor: vec3f;
    if (i % 3 == 0) {
      waveColor = vec3f(0.0, 0.9, 1.0); // Cyan
    } else if (i % 3 == 1) {
      waveColor = vec3f(0.3, 1.0, 0.4); // Green
    } else {
      waveColor = vec3f(0.6, 0.4, 1.0); // Purple
    }

    color += waveColor * ring * 0.3;
  }

  // Lightning bolts
  for (var i = 0; i < 8; i++) {
    let angle = f32(i) / 8.0 * 6.28318 + time * 0.5;
    let dir = vec2f(cos(angle), sin(angle));
    let p = uv - center;

    let proj = dot(p, dir);
    let perp = length(p - dir * proj);

    if (proj > 0.0 && proj < 0.5) {
      let bolt = smoothstep(0.02, 0.0, perp);
      let flicker = hash(vec2f(time * 10.0, f32(i)));
      color += vec3f(0.8, 0.9, 1.0) * bolt * flicker * surge;
    }
  }

  // Central glow
  let centerGlow = smoothstep(0.4, 0.0, d);
  color += vec3f(0.3, 0.8, 1.0) * centerGlow * surge;

  return vec4f(color * intensity, intensity * 0.6);
}
`;
