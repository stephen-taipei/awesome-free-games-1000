/**
 * WebGPU Shaders - Ring Toss
 * Carnival / Fairground / Colorful and Festive Theme
 * Game #165
 */

export const BACKGROUND_SHADER = /* wgsl */`
struct Uniforms {
  time: f32,
  resolution: vec2f,
  level: f32,
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
    vec2f(-1.0, -1.0),
    vec2f(1.0, -1.0),
    vec2f(-1.0, 1.0),
    vec2f(-1.0, 1.0),
    vec2f(1.0, -1.0),
    vec2f(1.0, 1.0)
  );

  var output: VertexOutput;
  output.position = vec4f(pos[vertexIndex], 0.0, 1.0);
  output.uv = pos[vertexIndex] * 0.5 + 0.5;
  return output;
}

fn hash(p: vec2f) -> f32 {
  let k = vec2f(0.3183099, 0.3678794);
  let x = p * k + k.yx;
  return fract(16.0 * k.x * fract(x.x * x.y * (x.x + x.y)));
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

fn fbm(p: vec2f) -> f32 {
  var value = 0.0;
  var amplitude = 0.5;
  var pos = p;
  for (var i = 0; i < 4; i++) {
    value += amplitude * noise(pos);
    pos *= 2.0;
    amplitude *= 0.5;
  }
  return value;
}

// Carnival stripe pattern
fn carnivalStripes(uv: vec2f, time: f32) -> f32 {
  let angle = 0.1;
  let rotUV = vec2f(
    uv.x * cos(angle) - uv.y * sin(angle),
    uv.x * sin(angle) + uv.y * cos(angle)
  );
  return step(0.5, fract(rotUV.x * 10.0 + time * 0.1));
}

// Bunting/flag pattern
fn bunting(uv: vec2f, time: f32) -> f32 {
  if (uv.y > 0.15) { return 0.0; }

  let flagWidth = 0.08;
  let flagX = fract(uv.x / flagWidth);
  let flagPhase = floor(uv.x / flagWidth);
  let wave = sin(time * 2.0 + flagPhase * 0.5) * 0.01;
  let triangleY = uv.y + wave;
  let triangle = 1.0 - abs(flagX - 0.5) * 3.0;

  return smoothstep(0.0, 0.12, triangleY) * step(triangleY, triangle * 0.12);
}

// Fairground lights
fn fairgroundLights(uv: vec2f, time: f32) -> f32 {
  var lights = 0.0;
  for (var i = 0; i < 10; i++) {
    let fi = f32(i);
    let x = fract(fi * 0.1 + 0.05);
    let y = 0.08;
    let blink = sin(time * 4.0 + fi * 1.2) * 0.5 + 0.5;
    let d = length(uv - vec2f(x, y));
    lights += blink * 0.003 / (d * d + 0.001);
  }
  return lights;
}

// Clouds
fn clouds(uv: vec2f, time: f32) -> f32 {
  let cloudUV = uv * vec2f(3.0, 6.0) + vec2f(time * 0.05, 0.0);
  let cloud = fbm(cloudUV);
  return smoothstep(0.4, 0.7, cloud) * 0.15;
}

// Grass detail
fn grassDetail(uv: vec2f, time: f32) -> f32 {
  if (uv.y < 0.7) { return 0.0; }
  let grassNoise = noise(uv * vec2f(50.0, 10.0) + vec2f(0.0, time * 0.5));
  let grassWave = sin(time * 2.0 + uv.x * 30.0) * 0.005;
  return grassNoise * 0.1 * (1.0 - (uv.y - 0.7) / 0.3);
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  let uv = input.uv;
  let time = uniforms.time;
  let level = uniforms.level;

  // Sky gradient
  let skyTop = vec3f(0.1, 0.32, 0.46);
  let skyBottom = vec3f(0.15, 0.4, 0.55);
  var color = mix(skyTop, skyBottom, uv.y * 0.7);

  // Add clouds
  if (uv.y < 0.5) {
    let cloud = clouds(uv, time);
    color = mix(color, vec3f(1.0, 1.0, 0.98), cloud);
  }

  // Carnival stripes in background (subtle)
  let stripes = carnivalStripes(uv, time);
  let stripeColor = mix(vec3f(0.08, 0.26, 0.38), vec3f(0.12, 0.3, 0.42), stripes);
  color = mix(color, stripeColor, 0.1);

  // Bunting flags at top
  let flags = bunting(uv, time);
  if (flags > 0.5) {
    let flagIdx = floor(uv.x / 0.08);
    let flagColor = vec3f(
      fract(sin(flagIdx * 127.1) * 43758.5) * 0.3 + 0.7,
      fract(sin(flagIdx * 269.5) * 15497.3) * 0.3 + 0.5,
      fract(cos(flagIdx * 534.2) * 8754.1) * 0.3 + 0.3
    );
    color = flagColor;
  }

  // Fairground lights
  let lights = fairgroundLights(uv, time);
  let lightColors = vec3f(
    sin(time * 2.0) * 0.5 + 0.5,
    sin(time * 2.5 + 2.0) * 0.5 + 0.5,
    sin(time * 3.0 + 4.0) * 0.5 + 0.5
  );
  color += lightColors * lights;

  // Grass ground
  if (uv.y > 0.7) {
    let grassBase = mix(vec3f(0.15, 0.68, 0.38), vec3f(0.12, 0.55, 0.3), (uv.y - 0.7) / 0.3);
    let grassHighlight = grassDetail(uv, time);
    color = grassBase + vec3f(grassHighlight);

    // Grass top edge
    if (uv.y < 0.72) {
      color = vec3f(0.18, 0.8, 0.44);
    }
  }

  // Level intensity
  let intensity = 1.0 + level * 0.05;
  color *= intensity;

  // Soft vignette
  let vignette = 1.0 - length((uv - 0.5) * 1.2);
  vignette = smoothstep(0.0, 0.8, vignette);
  color *= vignette * 0.15 + 0.85;

  return vec4f(color, 1.0);
}
`;

export const PARTICLE_SHADER = /* wgsl */`
struct Uniforms {
  time: f32,
  resolution: vec2f,
  level: f32,
}

struct Particle {
  position: vec2f,
  velocity: vec2f,
  color: vec4f,
  size: f32,
  life: f32,
  maxLife: f32,
  particleType: f32, // 0=throw, 1=land, 2=bounce, 3=score, 4=confetti, 5=gameOver
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

  var size = particle.size;
  let pType = particle.particleType;

  if (pType == 0.0) {
    // Throw trail
    size *= mix(1.0, 0.3, 1.0 - lifeRatio);
  } else if (pType == 1.0) {
    // Land success - ring burst
    size *= mix(0.5, 2.0, 1.0 - lifeRatio);
  } else if (pType == 2.0) {
    // Bounce - small sparks
    size *= mix(0.8, 0.2, 1.0 - lifeRatio);
  } else if (pType == 3.0) {
    // Score - stars
    size *= 0.8 + sin(uniforms.time * 10.0 + f32(instanceIndex) * 2.0) * 0.2;
  } else if (pType == 4.0) {
    // Confetti - flutter
    size *= mix(1.0, 0.6, 1.0 - lifeRatio);
  } else if (pType == 5.0) {
    // Game over - celebration
    size *= mix(0.8, 0.3, 1.0 - lifeRatio);
  }

  let worldPos = particle.position + corner * size * 0.02;
  let clipPos = worldPos * 2.0 - 1.0;

  var output: VertexOutput;
  output.position = vec4f(clipPos.x, -clipPos.y, 0.0, 1.0);
  output.color = particle.color;
  output.uv = corner * 0.5 + 0.5;
  output.particleType = pType;
  output.life = lifeRatio;
  return output;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  let uv = input.uv;
  let center = vec2f(0.5, 0.5);
  let d = length(uv - center) * 2.0;
  let pType = input.particleType;
  let life = input.life;

  var alpha = input.color.a;
  var color = input.color.rgb;

  if (pType == 0.0) {
    // Throw trail - smooth circle
    let circle = 1.0 - smoothstep(0.3, 0.6, d);
    alpha *= circle * life;
  } else if (pType == 1.0) {
    // Land - expanding ring
    let ring = abs(d - 0.7);
    let ringAlpha = 1.0 - smoothstep(0.0, 0.15, ring);
    alpha *= ringAlpha * life;
    color *= 1.2;
  } else if (pType == 2.0) {
    // Bounce - spark
    let spark = 1.0 - smoothstep(0.0, 0.7, d);
    alpha *= spark * life;
  } else if (pType == 3.0) {
    // Score - star shape
    let angle = atan2(uv.y - 0.5, uv.x - 0.5);
    let star = 0.5 + 0.5 * cos(angle * 5.0);
    let starShape = (1.0 - d) * (0.3 + star * 0.7);
    alpha *= starShape * life;
    color = mix(color, vec3f(1.0, 1.0, 0.8), 0.3);
  } else if (pType == 4.0) {
    // Confetti - rectangle
    let rect = max(abs(uv.x - 0.5), abs(uv.y - 0.5)) * 2.0;
    let rectAlpha = 1.0 - smoothstep(0.5, 0.7, rect);
    alpha *= rectAlpha * life;
    color *= 1.1;
  } else if (pType == 5.0) {
    // Game over - firework
    let burst = 1.0 - smoothstep(0.0, 0.9, d);
    let sparkle = sin(d * 20.0 + uniforms.time * 10.0) * 0.3 + 0.7;
    alpha *= burst * life * sparkle;
    color = mix(color, vec3f(1.0), 0.2);
  } else {
    let circle = 1.0 - smoothstep(0.4, 0.5, d);
    alpha *= circle * life;
  }

  if (alpha < 0.01) {
    discard;
  }

  return vec4f(color, alpha);
}
`;
