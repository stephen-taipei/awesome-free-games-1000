/**
 * WebGPU Shaders - Battle City
 * Military / Tank Warfare / Olive Green Theme
 * Game #158
 */

export const BACKGROUND_SHADER = /* wgsl */ `
struct Uniforms {
  resolution: vec2f,
  time: f32,
  _pad: f32,
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
  output.uv = (positions[vertexIndex] + 1.0) * 0.5;
  return output;
}

fn hash21(p: vec2f) -> f32 {
  var p3 = fract(vec3f(p.x, p.y, p.x) * 0.1031);
  p3 = p3 + dot(p3, vec3f(p3.y + 33.33, p3.z + 33.33, p3.x + 33.33));
  return fract((p3.x + p3.y) * p3.z);
}

fn noise(p: vec2f) -> f32 {
  let i = floor(p);
  let f = fract(p);
  let u = f * f * (3.0 - 2.0 * f);

  return mix(
    mix(hash21(i + vec2f(0.0, 0.0)), hash21(i + vec2f(1.0, 0.0)), u.x),
    mix(hash21(i + vec2f(0.0, 1.0)), hash21(i + vec2f(1.0, 1.0)), u.x),
    u.y
  );
}

// Grid pattern (battlefield)
fn grid(uv: vec2f) -> f32 {
  let gridSize = 26.0;
  let grid = fract(uv * gridSize);
  let lineX = smoothstep(0.02, 0.0, grid.x) + smoothstep(0.98, 1.0, grid.x);
  let lineY = smoothstep(0.02, 0.0, grid.y) + smoothstep(0.98, 1.0, grid.y);
  return (lineX + lineY) * 0.15;
}

// Military radar sweep
fn radarSweep(uv: vec2f, time: f32) -> f32 {
  let center = vec2f(0.5, 0.5);
  let dir = uv - center;
  let angle = atan2(dir.y, dir.x);
  let sweepAngle = time * 0.5;
  let diff = mod(angle - sweepAngle + 3.14159, 6.28318) - 3.14159;
  let sweep = smoothstep(0.3, 0.0, abs(diff));
  let dist = length(dir);
  return sweep * smoothstep(0.5, 0.1, dist) * 0.1;
}

// Ground texture
fn groundTexture(uv: vec2f) -> f32 {
  let n1 = noise(uv * 30.0);
  let n2 = noise(uv * 60.0) * 0.5;
  return (n1 + n2) * 0.1;
}

// Tank track marks (subtle)
fn trackMarks(uv: vec2f, time: f32) -> f32 {
  let n = noise(vec2f(uv.x * 50.0, uv.y * 10.0 + time * 0.1));
  let lines = sin(uv.y * 100.0) * 0.5 + 0.5;
  return lines * n * 0.05 * (1.0 - uv.y);
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  let uv = input.uv;
  let time = uniforms.time;

  // Base dark background
  var color = vec3f(0.02, 0.02, 0.03);

  // Add ground texture
  let ground = groundTexture(uv);
  color += vec3f(ground * 0.3, ground * 0.25, ground * 0.2);

  // Add grid
  let gridLines = grid(uv);
  color += vec3f(0.1, 0.15, 0.1) * gridLines;

  // Radar sweep effect
  let radar = radarSweep(uv, time);
  color += vec3f(0.0, 0.5, 0.0) * radar;

  // Track marks
  let tracks = trackMarks(uv, time);
  color += vec3f(0.1, 0.08, 0.05) * tracks;

  // Subtle vignette
  let vignette = 1.0 - length((uv - 0.5) * 1.2);
  color *= smoothstep(0.0, 0.8, vignette);

  // Military amber tint at edges
  let edge = 1.0 - smoothstep(0.3, 0.5, length((uv - 0.5) * vec2f(1.5, 1.5)));
  color = mix(color, color * vec3f(1.0, 0.9, 0.7), edge * 0.2);

  return vec4f(color, 1.0);
}
`;

export const PARTICLE_SHADER = /* wgsl */ `
struct Uniforms {
  resolution: vec2f,
  time: f32,
  _pad: f32,
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
  @location(3) lifeRatio: f32,
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

  let worldPos = particle.position + corner * size / uniforms.resolution;
  let clipPos = worldPos * 2.0 - 1.0;

  var output: VertexOutput;
  output.position = vec4f(clipPos.x, -clipPos.y, 0.0, 1.0);
  output.color = particle.color;
  output.uv = corner * 0.5 + 0.5;
  output.particleType = particle.particleType;
  output.lifeRatio = lifeRatio;

  return output;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  let dist = length(input.uv - 0.5) * 2.0;
  let particleType = i32(input.particleType);
  var alpha = input.color.a * input.lifeRatio;

  // Type 0: Muzzle flash
  if (particleType == 0) {
    let flash = 1.0 - smoothstep(0.0, 0.5, dist);
    let rays = max(0.0, sin(atan2(input.uv.y - 0.5, input.uv.x - 0.5) * 6.0));
    alpha *= flash * (1.0 + rays * 0.3);
    if (flash < 0.1) { discard; }
  }
  // Type 1: Tank explosion
  else if (particleType == 1) {
    let explosion = 1.0 - smoothstep(0.0, 0.5, dist);
    let noise = sin(input.uv.x * 20.0 + input.uv.y * 20.0 + uniforms.time * 10.0) * 0.2 + 0.8;
    alpha *= explosion * noise;
    if (explosion < 0.1) { discard; }
  }
  // Type 2: Player hit flash
  else if (particleType == 2) {
    let ring = 1.0 - abs(dist - 0.5 * (1.0 - input.lifeRatio)) * 4.0;
    alpha *= max(0.0, ring);
    if (ring < 0.1) { discard; }
  }
  // Type 3: Brick debris
  else if (particleType == 3) {
    let square = max(abs(input.uv.x - 0.5), abs(input.uv.y - 0.5));
    let debris = 1.0 - smoothstep(0.3, 0.5, square);
    alpha *= debris;
    if (debris < 0.1) { discard; }
  }
  // Type 4: Smoke
  else if (particleType == 4) {
    let smoke = 1.0 - smoothstep(0.0, 0.5, dist);
    let turbulence = sin(input.uv.x * 15.0 + uniforms.time * 3.0) * sin(input.uv.y * 15.0) * 0.2 + 0.8;
    alpha *= smoke * turbulence * 0.5;
    if (smoke < 0.05) { discard; }
  }
  // Type 5: Base destruction / Victory
  else if (particleType == 5) {
    let burst = 1.0 - dist;
    let flare = sin(uniforms.time * 10.0 + dist * 20.0) * 0.3 + 0.7;
    alpha *= burst * flare;
    if (burst < 0.1) { discard; }
  }
  // Default
  else {
    let circle = 1.0 - smoothstep(0.3, 0.5, dist);
    alpha *= circle;
    if (circle < 0.1) { discard; }
  }

  return vec4f(input.color.rgb, alpha);
}
`;
