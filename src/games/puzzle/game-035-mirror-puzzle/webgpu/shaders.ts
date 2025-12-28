/**
 * WebGPU Shaders - Mirror Puzzle
 * Crystal Palace / Prism Chamber Theme
 * Game #035
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

fn voronoi(p: vec2f) -> f32 {
  let n = floor(p);
  let f = fract(p);
  var md = 8.0;

  for (var j = -1; j <= 1; j++) {
    for (var i = -1; i <= 1; i++) {
      let g = vec2f(f32(i), f32(j));
      let o = vec2f(hash(n + g), hash(n + g + vec2f(12.34, 56.78)));
      let r = g + o - f;
      let d = dot(r, r);
      md = min(md, d);
    }
  }
  return sqrt(md);
}

fn hsl2rgb(h: f32, s: f32, l: f32) -> vec3f {
  let c = (1.0 - abs(2.0 * l - 1.0)) * s;
  let x = c * (1.0 - abs(fract(h * 6.0) * 2.0 - 1.0));
  let m = l - c / 2.0;

  var rgb: vec3f;
  let h6 = h * 6.0;
  if (h6 < 1.0) { rgb = vec3f(c, x, 0.0); }
  else if (h6 < 2.0) { rgb = vec3f(x, c, 0.0); }
  else if (h6 < 3.0) { rgb = vec3f(0.0, c, x); }
  else if (h6 < 4.0) { rgb = vec3f(0.0, x, c); }
  else if (h6 < 5.0) { rgb = vec3f(x, 0.0, c); }
  else { rgb = vec3f(c, 0.0, x); }

  return rgb + m;
}

fn crystalFacet(uv: vec2f, time: f32) -> f32 {
  let v = voronoi(uv * 6.0 + time * 0.1);
  return smoothstep(0.0, 0.15, v) * smoothstep(0.4, 0.15, v);
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  let uv = input.uv;
  let time = uniforms.time;

  // Deep crystal chamber base
  let crystalBlue = vec3f(0.1, 0.15, 0.25);
  let crystalPurple = vec3f(0.15, 0.1, 0.25);
  let crystalTeal = vec3f(0.08, 0.18, 0.22);

  // Base gradient
  var color = mix(crystalBlue, crystalPurple, uv.y);
  color = mix(color, crystalTeal, sin(uv.x * 3.14159) * 0.3);

  // Crystal facet pattern
  let facet1 = crystalFacet(uv, time);
  let facet2 = crystalFacet(uv * 1.5 + vec2f(0.5, 0.3), time * 0.7);
  let facetStrength = facet1 * 0.4 + facet2 * 0.3;

  // Iridescent shimmer on facets
  let hue = fract(time * 0.05 + uv.x * 0.3 + uv.y * 0.2);
  let iridescent = hsl2rgb(hue, 0.6, 0.6);
  color = mix(color, iridescent, facetStrength * 0.3);

  // Prismatic light rays
  let rayAngle = atan2(uv.y - 0.3, uv.x - 0.2);
  let rayDist = length(uv - vec2f(0.2, 0.3));
  let rays = pow(abs(sin(rayAngle * 8.0 + time * 0.5)), 20.0) * smoothstep(0.8, 0.0, rayDist);

  // Rainbow colors for rays
  let rayHue = fract(rayAngle / 6.28318 + time * 0.1);
  let rayColor = hsl2rgb(rayHue, 0.8, 0.7);
  color += rayColor * rays * 0.15;

  // Crystal edge highlights
  let edges = voronoi(uv * 8.0);
  let edgeGlow = smoothstep(0.05, 0.0, edges) * 0.3;
  color += vec3f(0.6, 0.8, 1.0) * edgeGlow;

  // Diamond sparkles
  let sparkleGrid = floor(uv * 30.0);
  let sparklePhase = hash(sparkleGrid) * 6.28318;
  let sparkle = pow(max(0.0, sin(time * 3.0 + sparklePhase)), 30.0);
  let sparklePos = fract(uv * 30.0) - 0.5;
  let sparkleMask = smoothstep(0.3, 0.0, length(sparklePos));
  color += vec3f(1.0, 1.0, 1.0) * sparkle * sparkleMask * 0.5;

  // Ambient glow from center
  let centerGlow = smoothstep(0.8, 0.0, length(uv - 0.5));
  color += vec3f(0.2, 0.3, 0.5) * centerGlow * 0.2;

  // Vignette
  let vignette = 1.0 - length(uv - 0.5) * 0.6;
  color *= vignette;

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

fn hsl2rgb(h: f32, s: f32, l: f32) -> vec3f {
  let c = (1.0 - abs(2.0 * l - 1.0)) * s;
  let x = c * (1.0 - abs(fract(h * 6.0) * 2.0 - 1.0));
  let m = l - c / 2.0;

  var rgb: vec3f;
  let h6 = h * 6.0;
  if (h6 < 1.0) { rgb = vec3f(c, x, 0.0); }
  else if (h6 < 2.0) { rgb = vec3f(x, c, 0.0); }
  else if (h6 < 3.0) { rgb = vec3f(0.0, c, x); }
  else if (h6 < 4.0) { rgb = vec3f(0.0, x, c); }
  else if (h6 < 5.0) { rgb = vec3f(x, 0.0, c); }
  else { rgb = vec3f(c, 0.0, x); }

  return rgb + m;
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
    // Reflect spark - prismatic burst
    let spark = smoothstep(0.5, 0.0, dist);
    let core = smoothstep(0.1, 0.0, dist);

    // Rainbow refraction
    let angle = atan2(centered.y, centered.x);
    let hue = fract(angle / 6.28318 + uniforms.time * 0.5);
    let rainbow = hsl2rgb(hue, 0.9, 0.7);

    color = mix(rainbow, vec3f(1.0), core);
    alpha *= spark;

  } else if (pType == 1) {
    // Mirror drag - crystal dust
    let diamond = max(abs(centered.x), abs(centered.y));
    let shape = smoothstep(0.5, 0.3, diamond);
    alpha *= shape;

    // Shimmer
    let shimmer = sin(uniforms.time * 8.0 + dist * 20.0) * 0.3 + 0.7;
    color *= shimmer;

  } else if (pType == 2) {
    // Victory - rainbow explosion
    let burst = smoothstep(0.5, 0.0, dist);

    // Spinning rainbow
    let angle = atan2(centered.y, centered.x) + uniforms.time * 2.0;
    let hue = fract(angle / 6.28318);
    color = hsl2rgb(hue, 0.9, 0.65);

    alpha *= burst;

  } else if (pType == 3) {
    // Ambient - floating crystal mote
    let mote = smoothstep(0.5, 0.2, dist);
    let twinkle = sin(uniforms.time * 4.0 + input.life * 10.0) * 0.4 + 0.6;
    alpha *= mote * twinkle;

    // Slight color shift
    let hueShift = sin(uniforms.time + input.life * 5.0) * 0.1;
    color = hsl2rgb(0.55 + hueShift, 0.5, 0.7);

  } else if (pType == 4) {
    // Beam hit - light burst
    let glow = smoothstep(0.5, 0.0, dist);
    let rays = pow(abs(sin(atan2(centered.y, centered.x) * 6.0)), 4.0);
    alpha *= glow * (0.5 + rays * 0.5);
    color = mix(color, vec3f(1.0, 1.0, 0.9), glow * 0.5);
  }

  // Life-based fade
  let lifeFade = smoothstep(0.0, 0.2, input.life) * smoothstep(1.0, 0.7, input.life);
  alpha *= lifeFade;

  return vec4f(color, alpha);
}
`;

export const beamGlowShader = /* wgsl */`
struct Uniforms {
  time: f32,
  intensity: f32,
  beamX: f32,
  beamY: f32,
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
  let beamPos = vec2f(uniforms.beamX, uniforms.beamY);
  let dist = length(uv - beamPos);

  // Light source glow
  let glow = smoothstep(0.2, 0.0, dist) * uniforms.intensity;

  // Warm light color
  let glowColor = vec3f(1.0, 0.9, 0.7);

  // Pulse effect
  let pulse = sin(uniforms.time * 3.0) * 0.15 + 0.85;

  return vec4f(glowColor * glow * pulse, glow * 0.5);
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

fn hsl2rgb(h: f32, s: f32, l: f32) -> vec3f {
  let c = (1.0 - abs(2.0 * l - 1.0)) * s;
  let x = c * (1.0 - abs(fract(h * 6.0) * 2.0 - 1.0));
  let m = l - c / 2.0;

  var rgb: vec3f;
  let h6 = h * 6.0;
  if (h6 < 1.0) { rgb = vec3f(c, x, 0.0); }
  else if (h6 < 2.0) { rgb = vec3f(x, c, 0.0); }
  else if (h6 < 3.0) { rgb = vec3f(0.0, c, x); }
  else if (h6 < 4.0) { rgb = vec3f(0.0, x, c); }
  else if (h6 < 5.0) { rgb = vec3f(x, 0.0, c); }
  else { rgb = vec3f(c, 0.0, x); }

  return rgb + m;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  let uv = input.uv;
  let time = uniforms.time;
  let intensity = uniforms.intensity;

  let center = vec2f(0.5, 0.5);
  let dist = length(uv - center);
  let angle = atan2(uv.y - 0.5, uv.x - 0.5);

  // Expanding prismatic ring
  let ringRadius = fract(time * 0.4) * 0.8;
  let ring = smoothstep(0.04, 0.0, abs(dist - ringRadius)) * (1.0 - ringRadius);

  // Rainbow colors around ring
  let ringHue = fract(angle / 6.28318 + time * 0.3);
  let ringColor = hsl2rgb(ringHue, 0.9, 0.65);

  // Crystal ray pattern
  let rays = pow(abs(sin(angle * 8.0 - time * 2.0)), 6.0);
  let rayStrength = smoothstep(0.6, 0.2, dist) * rays;

  // Combine effects
  let totalGlow = (ring + rayStrength * 0.4) * intensity;

  // Bright center flash
  let centerFlash = smoothstep(0.3, 0.0, dist) * intensity * 0.5;
  let flashColor = vec3f(1.0, 0.95, 0.9);

  let finalColor = mix(ringColor, flashColor, centerFlash);

  return vec4f(finalColor * totalGlow, totalGlow * 0.8);
}
`;
