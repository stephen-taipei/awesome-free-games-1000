/**
 * WebGPU Shaders - Film Reel
 * Cinema / Vintage Film Theme
 * Game #133
 */

export const BACKGROUND_SHADER = /* wgsl */`
struct Uniforms {
  time: f32,
  aspectRatio: f32,
  frameX: f32,
  frameY: f32,
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

// Film grain noise
fn hash2(p: vec2f) -> f32 {
  return fract(sin(dot(p, vec2f(127.1, 311.7))) * 43758.5453);
}

fn noise(p: vec2f) -> f32 {
  let i = floor(p);
  let f = fract(p);
  let u = f * f * (3.0 - 2.0 * f);

  return mix(
    mix(hash2(i + vec2f(0.0, 0.0)), hash2(i + vec2f(1.0, 0.0)), u.x),
    mix(hash2(i + vec2f(0.0, 1.0)), hash2(i + vec2f(1.0, 1.0)), u.x),
    u.y
  );
}

// Film projector flicker effect
fn projectorFlicker(time: f32) -> f32 {
  let flicker1 = sin(time * 24.0) * 0.02;
  let flicker2 = sin(time * 18.0 + 0.5) * 0.015;
  let randomFlicker = step(0.97, hash2(vec2f(time * 10.0, 0.0))) * 0.1;
  return 1.0 - flicker1 - flicker2 - randomFlicker;
}

// Vignette for old film look
fn filmVignette(uv: vec2f) -> f32 {
  let center = uv - 0.5;
  let dist = length(center) * 1.5;
  return 1.0 - smoothstep(0.4, 1.0, dist);
}

// Film scratches
fn filmScratches(uv: vec2f, time: f32) -> f32 {
  let scratch1 = step(0.997, hash2(vec2f(floor(uv.x * 200.0), time * 5.0)));
  let scratch2 = step(0.998, hash2(vec2f(floor(uv.x * 150.0), time * 3.0 + 100.0)));
  return (scratch1 + scratch2) * 0.3;
}

// Film perforation holes
fn filmPerforations(uv: vec2f) -> f32 {
  let holeSpacing = 0.08;
  let holeWidth = 0.02;
  let holeHeight = 0.015;

  // Left side holes
  let leftHole = step(uv.x, 0.05) *
    (1.0 - smoothstep(0.0, holeWidth, abs(fract(uv.y / holeSpacing + 0.5) - 0.5) * holeSpacing));

  // Right side holes
  let rightHole = step(0.95, uv.x) *
    (1.0 - smoothstep(0.0, holeWidth, abs(fract(uv.y / holeSpacing + 0.5) - 0.5) * holeSpacing));

  return (leftHole + rightHole) * 0.3;
}

// Spotlight cone effect
fn spotlightCone(uv: vec2f, time: f32) -> f32 {
  let spotCenter = vec2f(0.5, -0.2);
  let dir = uv - spotCenter;
  let angle = atan2(dir.x, dir.y);
  let dist = length(dir);

  let coneAngle = 0.4;
  let sway = sin(time * 0.5) * 0.1;
  let inCone = smoothstep(coneAngle, coneAngle * 0.5, abs(angle - sway));
  let fadeout = 1.0 - smoothstep(0.3, 1.0, dist);

  return inCone * fadeout * 0.15;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  let uv = input.uv;
  let time = uniforms.time;

  // Cinema dark blue-black base
  let darkBlue = vec3f(0.10, 0.10, 0.18);
  let darkerBlue = vec3f(0.08, 0.08, 0.15);

  var color = mix(darkBlue, darkerBlue, uv.y);

  // Spotlight effect
  let spotlight = spotlightCone(uv, time);
  color += vec3f(1.0, 0.95, 0.7) * spotlight;

  // Film grain overlay
  let grainScale = 500.0;
  let grain = noise(uv * grainScale + time * 10.0) * 0.08;
  color += vec3f(grain) - 0.04;

  // Film scratches
  let scratches = filmScratches(uv, time);
  color += vec3f(scratches);

  // Film perforations (sprocket holes effect on edges)
  let perfs = filmPerforations(uv);
  color = mix(color, vec3f(0.02), perfs);

  // Projector flicker
  let flicker = projectorFlicker(time);
  color *= flicker;

  // Vignette
  let vignette = filmVignette(uv);
  color *= vignette;

  // Sepia tint
  let sepia = vec3f(
    dot(color, vec3f(0.393, 0.769, 0.189)),
    dot(color, vec3f(0.349, 0.686, 0.168)),
    dot(color, vec3f(0.272, 0.534, 0.131))
  );
  color = mix(color, sepia, 0.2);

  // Film frame highlight
  let frameCenter = vec2f(uniforms.frameX, uniforms.frameY);
  if (frameCenter.x > 0.0) {
    let frameDist = distance(uv, frameCenter);
    let glow = smoothstep(0.15, 0.0, frameDist) * 0.2;
    color += vec3f(0.85, 0.65, 0.13) * glow;
  }

  return vec4f(color, 1.0);
}
`;

export const PARTICLE_SHADER = /* wgsl */`
struct Uniforms {
  time: f32,
  aspectRatio: f32,
  frameX: f32,
  frameY: f32,
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

  let lifeRatio = particle.life / particle.maxLife;
  var size = particle.size;

  // Size animation based on type
  let pType = i32(particle.particleType);
  if (pType == 0) { // filmGrain
    size *= 0.5 + lifeRatio * 0.5;
  } else if (pType == 1) { // projectorDust
    size *= lifeRatio;
  } else if (pType == 2) { // filmFlicker
    size *= sin(uniforms.time * 20.0 + particle.position.x * 10.0) * 0.3 + 0.7;
  } else if (pType == 3) { // spotlight
    size *= smoothstep(0.0, 0.3, lifeRatio) * smoothstep(1.0, 0.7, lifeRatio);
  } else if (pType == 4) { // reel
    size *= 1.0;
  } else if (pType == 5) { // clapboard
    size *= easeOutBounce(1.0 - lifeRatio);
  }

  let corner = corners[vertexIndex];
  var pos = particle.position + corner * size * 0.02;
  pos.x /= uniforms.aspectRatio;

  var output: VertexOutput;
  output.position = vec4f(pos * 2.0 - 1.0, 0.0, 1.0);
  output.color = particle.color;
  output.uv = corner;
  output.particleType = particle.particleType;
  output.life = lifeRatio;

  return output;
}

fn easeOutBounce(t: f32) -> f32 {
  let n1 = 7.5625;
  let d1 = 2.75;
  var x = t;
  if (x < 1.0 / d1) {
    return n1 * x * x;
  } else if (x < 2.0 / d1) {
    x = x - 1.5 / d1;
    return n1 * x * x + 0.75;
  } else if (x < 2.5 / d1) {
    x = x - 2.25 / d1;
    return n1 * x * x + 0.9375;
  } else {
    x = x - 2.625 / d1;
    return n1 * x * x + 0.984375;
  }
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  let uv = input.uv;
  let dist = length(uv);
  let pType = i32(input.particleType);

  var alpha = input.color.a;
  var color = input.color.rgb;

  if (pType == 0) { // filmGrain - irregular grain
    let noise = sin(uv.x * 30.0 + uv.y * 30.0 + uniforms.time * 100.0) * 0.5 + 0.5;
    alpha *= (1.0 - smoothstep(0.3, 0.7, dist)) * noise * input.life;
  } else if (pType == 1) { // projectorDust - soft dust motes
    let softness = 1.0 - smoothstep(0.0, 1.0, dist);
    alpha *= softness * softness * input.life;
  } else if (pType == 2) { // filmFlicker - flashing rectangles
    let rect = max(abs(uv.x), abs(uv.y));
    alpha *= (1.0 - smoothstep(0.6, 0.9, rect)) * input.life;
  } else if (pType == 3) { // spotlight - soft cone
    alpha *= (1.0 - dist) * input.life * 0.5;
  } else if (pType == 4) { // reel - sprocket hole shape
    let ring = abs(dist - 0.5);
    let hole = smoothstep(0.15, 0.1, ring) * smoothstep(0.0, 0.3, dist);
    alpha *= hole * input.life;
  } else if (pType == 5) { // clapboard - stripe pattern
    let stripes = step(0.5, fract(uv.x * 3.0 + uv.y * 3.0));
    alpha *= (1.0 - smoothstep(0.7, 1.0, dist)) * (0.7 + stripes * 0.3) * input.life;
  }

  if (alpha < 0.01) {
    discard;
  }

  return vec4f(color, alpha);
}
`;
