/**
 * WebGPU Shaders - Puzzle Challenge
 * Glass Workshop / Crystal Mosaic Theme
 * Game #038
 */

export const backgroundShader = /* wgsl */`
struct Uniforms {
  time: f32,
  aspect: f32,
  pad1: f32,
  pad2: f32,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;

struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) uv: vec2f,
}

@vertex
fn vertexMain(@builtin(vertex_index) vertexIndex: u32) -> VertexOutput {
  var pos = array<vec2f, 6>(
    vec2f(-1, -1), vec2f(1, -1), vec2f(-1, 1),
    vec2f(-1, 1), vec2f(1, -1), vec2f(1, 1)
  );

  var output: VertexOutput;
  output.position = vec4f(pos[vertexIndex], 0, 1);
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
    mix(hash(i), hash(i + vec2f(1, 0)), u.x),
    mix(hash(i + vec2f(0, 1)), hash(i + vec2f(1, 1)), u.x),
    u.y
  );
}

fn voronoi(p: vec2f) -> vec2f {
  let n = floor(p);
  let f = fract(p);

  var minDist = 8.0;
  var minDist2 = 8.0;

  for (var j = -1; j <= 1; j++) {
    for (var i = -1; i <= 1; i++) {
      let g = vec2f(f32(i), f32(j));
      let o = vec2f(hash(n + g), hash(n + g + vec2f(100.0)));
      let r = g + o - f;
      let d = dot(r, r);

      if (d < minDist) {
        minDist2 = minDist;
        minDist = d;
      } else if (d < minDist2) {
        minDist2 = d;
      }
    }
  }

  return vec2f(sqrt(minDist), sqrt(minDist2));
}

fn glassFacet(uv: vec2f, time: f32) -> f32 {
  let v = voronoi(uv * 6.0);
  let edge = smoothstep(0.02, 0.08, v.y - v.x);
  let shimmer = noise(uv * 20.0 + time * 0.3) * 0.3;
  return edge + shimmer * (1.0 - edge);
}

fn lightRay(uv: vec2f, time: f32) -> f32 {
  let angle = time * 0.2;
  let rayDir = vec2f(cos(angle), sin(angle));
  let rayDist = dot(uv - 0.5, rayDir);
  let ray = smoothstep(0.4, 0.0, abs(rayDist));
  return ray * 0.3;
}

fn frostedGlass(uv: vec2f, time: f32) -> f32 {
  var frost = 0.0;
  frost += noise(uv * 30.0) * 0.5;
  frost += noise(uv * 60.0 + time * 0.1) * 0.25;
  frost += noise(uv * 120.0) * 0.125;
  return frost;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  let uv = input.uv;
  let time = uniforms.time;

  // Base glass colors
  let glassBlue = vec3f(0.7, 0.85, 0.95);
  let glassTint = vec3f(0.85, 0.9, 1.0);
  let shadowBlue = vec3f(0.3, 0.4, 0.55);

  // Frosted base
  let frost = frostedGlass(uv, time);
  var color = mix(shadowBlue, glassBlue, frost);

  // Glass facets
  let facets = glassFacet(uv, time);
  color = mix(color, glassTint, facets * 0.4);

  // Light reflection spots
  let spots = voronoi(uv * 12.0 + time * 0.1);
  let sparkle = smoothstep(0.15, 0.1, spots.x) * (sin(time * 5.0 + spots.x * 20.0) * 0.5 + 0.5);
  color += vec3f(1.0, 1.0, 0.95) * sparkle * 0.5;

  // Ambient light rays
  let rays = lightRay(uv, time);
  color += vec3f(1.0, 0.95, 0.85) * rays;

  // Color bands (like stained glass sections)
  let band = sin(uv.x * 6.0 + uv.y * 4.0 + time * 0.3) * 0.5 + 0.5;
  let bandColor = mix(vec3f(0.6, 0.8, 0.95), vec3f(0.95, 0.85, 0.7), band);
  color = mix(color, bandColor, 0.2);

  // Edge gradient for depth
  let edgeDist = min(min(uv.x, 1.0 - uv.x), min(uv.y, 1.0 - uv.y));
  let edgeGlow = smoothstep(0.1, 0.3, edgeDist);
  color = mix(shadowBlue * 0.7, color, edgeGlow);

  // Subtle vignette
  let vignette = smoothstep(0.0, 0.5, length(uv - 0.5));
  color *= 1.0 - vignette * 0.2;

  return vec4f(color, 1.0);
}
`;

export const particleShader = /* wgsl */`
struct Uniforms {
  time: f32,
  aspect: f32,
  pad1: f32,
  pad2: f32,
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
  @location(2) particleType: f32,
  @location(3) life: f32,
}

@vertex
fn vertexMain(
  @builtin(vertex_index) vertexIndex: u32,
  @builtin(instance_index) instanceIndex: u32
) -> VertexOutput {
  var quad = array<vec2f, 6>(
    vec2f(-1, -1), vec2f(1, -1), vec2f(-1, 1),
    vec2f(-1, 1), vec2f(1, -1), vec2f(1, 1)
  );

  let p = particles[instanceIndex];
  let size = p.size;
  let pos = quad[vertexIndex] * size + vec2f(p.x * 2.0 - 1.0, 1.0 - p.y * 2.0);

  var output: VertexOutput;
  output.position = vec4f(pos.x / uniforms.aspect, pos.y, 0, 1);
  output.uv = quad[vertexIndex] * 0.5 + 0.5;
  output.color = vec4f(p.r, p.g, p.b, p.a);
  output.particleType = p.particleType;
  output.life = p.life / p.maxLife;
  return output;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  let uv = input.uv;
  let centered = uv - 0.5;
  let dist = length(centered);
  let pType = i32(input.particleType);
  var alpha = input.color.a;
  var color = input.color.rgb;

  if (pType == 0) {
    // Sparkle - glass glint
    let sparkle = smoothstep(0.5, 0.0, dist);
    let core = smoothstep(0.15, 0.0, dist);
    alpha *= sparkle;
    color = mix(color, vec3f(1.0, 1.0, 1.0), core * 0.8);

    // Star shape
    let angle = atan2(centered.y, centered.x);
    let star = pow(abs(cos(angle * 4.0)), 8.0);
    alpha *= 0.5 + star * 0.5;

  } else if (pType == 1) {
    // Drag - glass dust trail
    let dust = smoothstep(0.5, 0.1, dist);
    alpha *= dust * 0.7;

    // Prismatic shimmer
    let shimmer = sin(dist * 30.0 - uniforms.time * 5.0) * 0.3 + 0.7;
    alpha *= shimmer;

  } else if (pType == 2) {
    // Victory - crystal burst
    let angle = atan2(centered.y, centered.x) + uniforms.time * 2.0;
    let facet = abs(sin(angle * 6.0));
    let glow = smoothstep(0.5, 0.0, dist);
    alpha *= glow * (0.5 + facet * 0.5);

    // Rainbow refraction
    let hue = fract(angle / 6.28318 + uniforms.time * 0.5);
    if (hue < 0.33) {
      color = mix(color, vec3f(1.0, 0.7, 0.7), hue * 3.0);
    } else if (hue < 0.66) {
      color = mix(color, vec3f(0.7, 1.0, 0.7), (hue - 0.33) * 3.0);
    } else {
      color = mix(color, vec3f(0.7, 0.7, 1.0), (hue - 0.66) * 3.0);
    }

  } else if (pType == 3) {
    // Ambient - floating glass mote
    let mote = smoothstep(0.5, 0.2, dist);
    alpha *= mote * 0.4;

    // Gentle twinkle
    let twinkle = sin(uniforms.time * 3.0 + dist * 10.0) * 0.3 + 0.7;
    alpha *= twinkle;

  } else if (pType == 4) {
    // Snap - placement confirmation ring
    let ring = smoothstep(0.06, 0.0, abs(dist - 0.35));
    let fill = smoothstep(0.4, 0.0, dist) * 0.4;
    alpha *= ring + fill;

    // Expanding wave
    color = mix(color, vec3f(1.0, 1.0, 0.9), ring);
  }

  // Life-based fade
  let lifeFade = smoothstep(0.0, 0.2, input.life) * smoothstep(1.0, 0.7, input.life);
  alpha *= lifeFade;

  return vec4f(color, alpha);
}
`;

export const timerShader = /* wgsl */`
struct Uniforms {
  time: f32,
  progress: f32,
  urgency: f32,
  pad: f32,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;

struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) uv: vec2f,
}

@vertex
fn vertexMain(@builtin(vertex_index) vertexIndex: u32) -> VertexOutput {
  var pos = array<vec2f, 6>(
    vec2f(-1, -1), vec2f(1, -1), vec2f(-1, 1),
    vec2f(-1, 1), vec2f(1, -1), vec2f(1, 1)
  );

  var output: VertexOutput;
  output.position = vec4f(pos[vertexIndex], 0, 1);
  output.uv = pos[vertexIndex] * 0.5 + 0.5;
  return output;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  let uv = input.uv;
  let time = uniforms.time;
  let progress = uniforms.progress;
  let urgency = uniforms.urgency;

  // Timer pulse effect when urgent
  let pulse = 1.0 + sin(time * 8.0) * urgency * 0.3;

  // Edge warning glow
  let edgeDist = min(min(uv.x, 1.0 - uv.x), min(uv.y, 1.0 - uv.y));
  let edgeGlow = smoothstep(0.1, 0.0, edgeDist) * urgency;

  // Warning color
  let warningColor = mix(
    vec3f(1.0, 0.8, 0.3),
    vec3f(1.0, 0.3, 0.2),
    urgency
  );

  return vec4f(warningColor * edgeGlow * pulse, edgeGlow * 0.4 * urgency);
}
`;

export const victoryShader = /* wgsl */`
struct Uniforms {
  time: f32,
  intensity: f32,
  pad1: f32,
  pad2: f32,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;

struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) uv: vec2f,
}

@vertex
fn vertexMain(@builtin(vertex_index) vertexIndex: u32) -> VertexOutput {
  var pos = array<vec2f, 6>(
    vec2f(-1, -1), vec2f(1, -1), vec2f(-1, 1),
    vec2f(-1, 1), vec2f(1, -1), vec2f(1, 1)
  );

  var output: VertexOutput;
  output.position = vec4f(pos[vertexIndex], 0, 1);
  output.uv = pos[vertexIndex] * 0.5 + 0.5;
  return output;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  let uv = input.uv;
  let time = uniforms.time;
  let intensity = uniforms.intensity;

  let center = vec2f(0.5, 0.5);
  let dist = length(uv - center);
  let angle = atan2(uv.y - 0.5, uv.x - 0.5);

  // Expanding crystal ring
  let ringRadius = fract(time * 0.4) * 0.8;
  let ring = smoothstep(0.05, 0.0, abs(dist - ringRadius)) * (1.0 - ringRadius);

  // Faceted light rays
  let facets = 8.0;
  let rays = pow(abs(sin(angle * facets - time * 2.0)), 6.0);
  let rayStrength = smoothstep(0.6, 0.1, dist) * rays;

  // Crystal color palette
  let crystalWhite = vec3f(1.0, 1.0, 0.98);
  let crystalBlue = vec3f(0.7, 0.9, 1.0);
  let crystalGold = vec3f(1.0, 0.9, 0.6);

  var color = mix(crystalBlue, crystalWhite, rayStrength);
  color = mix(color, crystalGold, ring);

  let totalGlow = (ring + rayStrength * 0.5) * intensity;

  // Center flash
  let centerFlash = smoothstep(0.25, 0.0, dist) * intensity * 0.6;
  color = mix(color, vec3f(1.0), centerFlash);

  return vec4f(color * totalGlow, totalGlow * 0.8);
}
`;
