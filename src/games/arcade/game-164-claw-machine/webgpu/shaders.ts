/**
 * WebGPU Shaders - Claw Machine
 * Arcade / UFO Catcher / Purple and Neon Theme
 * Game #164
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

// Neon glow effect
fn neonGlow(uv: vec2f, center: vec2f, radius: f32, intensity: f32) -> f32 {
  let d = length(uv - center);
  return intensity / (d * d + 0.01) * smoothstep(radius * 2.0, 0.0, d);
}

// Arcade light pattern
fn arcadeLight(uv: vec2f, time: f32) -> f32 {
  let angle = atan2(uv.y - 0.5, uv.x - 0.5);
  let sectors = 12.0;
  let sector = floor((angle + 3.14159) / (6.28318 / sectors));
  let phase = sector / sectors + time * 0.3;
  return (sin(phase * 6.28318) * 0.5 + 0.5) * 0.3;
}

// Star pattern
fn starPattern(uv: vec2f, time: f32) -> f32 {
  var stars = 0.0;
  for (var i = 0; i < 8; i++) {
    let fi = f32(i);
    let pos = vec2f(
      fract(sin(fi * 127.1) * 43758.5453) * 0.8 + 0.1,
      fract(cos(fi * 269.5) * 15497.345) * 0.6 + 0.2
    );
    let twinkle = sin(time * 3.0 + fi * 2.5) * 0.5 + 0.5;
    let d = length(uv - pos);
    stars += twinkle * 0.002 / (d * d + 0.001);
  }
  return stars;
}

// Vertical scan lines
fn scanLines(uv: vec2f, time: f32) -> f32 {
  let line = sin(uv.x * 200.0) * 0.02;
  let flicker = sin(time * 60.0) * 0.005;
  return line + flicker;
}

// Glass reflection
fn glassReflection(uv: vec2f, time: f32) -> f32 {
  let sweep = fract(time * 0.05);
  let pos = (uv.x + uv.y) * 0.5;
  let highlight = smoothstep(sweep - 0.05, sweep, pos) * smoothstep(sweep + 0.15, sweep, pos);
  return highlight * 0.15;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  let uv = input.uv;
  let time = uniforms.time;
  let level = uniforms.level;

  // Base arcade cabinet colors (deep purple gradient)
  let topColor = vec3f(0.12, 0.06, 0.2);
  let bottomColor = vec3f(0.08, 0.04, 0.15);
  var color = mix(topColor, bottomColor, uv.y);

  // Add subtle noise texture
  let noiseVal = fbm(uv * 8.0 + time * 0.1);
  color += vec3f(noiseVal * 0.03);

  // Arcade cabinet light pattern at top
  if (uv.y < 0.15) {
    let lightPattern = arcadeLight(vec2f(uv.x, uv.y * 6.67), time);
    color += vec3f(0.6, 0.2, 0.8) * lightPattern;
  }

  // Side neon strips
  let leftGlow = neonGlow(uv, vec2f(0.02, 0.5), 0.3, 0.015);
  let rightGlow = neonGlow(uv, vec2f(0.98, 0.5), 0.3, 0.015);
  let neonPurple = vec3f(0.8, 0.2, 1.0);
  let neonCyan = vec3f(0.2, 0.9, 1.0);
  color += neonPurple * leftGlow * (sin(time * 2.0) * 0.3 + 0.7);
  color += neonCyan * rightGlow * (cos(time * 2.0) * 0.3 + 0.7);

  // Stars twinkling in background
  let stars = starPattern(uv, time);
  color += vec3f(1.0, 0.95, 0.8) * stars;

  // Glass case reflection
  let glassZone = uv.y > 0.12 && uv.y < 0.75;
  if (glassZone) {
    let reflection = glassReflection(uv, time);
    color += vec3f(0.5, 0.7, 1.0) * reflection;
  }

  // Prize area glow (bottom section)
  if (uv.y > 0.7) {
    let prizeGlow = (1.0 - (uv.y - 0.7) / 0.3) * 0.15;
    let pulseColor = mix(
      vec3f(0.8, 0.3, 1.0),
      vec3f(0.3, 0.8, 1.0),
      sin(time * 1.5) * 0.5 + 0.5
    );
    color += pulseColor * prizeGlow;
  }

  // Level-based intensity
  let levelIntensity = 1.0 + level * 0.08;
  color *= levelIntensity;

  // CRT scanline effect
  let scanline = scanLines(uv, time);
  color += vec3f(scanline);

  // Vignette
  let vignette = 1.0 - length((uv - 0.5) * 1.3);
  vignette = smoothstep(0.0, 0.7, vignette);
  color *= vignette;

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
  particleType: f32, // 0=clawDrop, 1=grab, 2=sparkle, 3=success, 4=fail, 5=gameOver
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

  // Size based on particle type
  var size = particle.size;
  let pType = particle.particleType;

  if (pType == 0.0) {
    // Claw drop - sparks that fade
    size *= mix(1.2, 0.3, 1.0 - lifeRatio);
  } else if (pType == 1.0) {
    // Grab - ring effect
    size *= mix(0.5, 2.0, 1.0 - lifeRatio);
  } else if (pType == 2.0) {
    // Sparkle - twinkle
    size *= 0.5 + sin(uniforms.time * 15.0 + f32(instanceIndex) * 3.0) * 0.3;
  } else if (pType == 3.0) {
    // Success - confetti
    size *= mix(1.2, 0.4, 1.0 - lifeRatio);
  } else if (pType == 4.0) {
    // Fail - sad particles
    size *= mix(1.0, 0.2, 1.0 - lifeRatio);
  } else if (pType == 5.0) {
    // Game over - explosion
    size *= mix(0.8, 0.1, 1.0 - lifeRatio);
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
    // Claw drop - electric sparks
    let spark = 1.0 - smoothstep(0.0, 0.8, d);
    let core = 1.0 - smoothstep(0.0, 0.2, d);
    alpha *= spark * life;
    color = mix(color, vec3f(1.0), core * 0.5);
  } else if (pType == 1.0) {
    // Grab - ring effect
    let ring = abs(d - 0.6);
    let ringAlpha = 1.0 - smoothstep(0.0, 0.15, ring);
    alpha *= ringAlpha * life;
    color *= 1.3;
  } else if (pType == 2.0) {
    // Sparkle - star shape
    let angle = atan2(uv.y - 0.5, uv.x - 0.5);
    let star = 0.5 + 0.5 * cos(angle * 4.0);
    let starShape = (1.0 - d) * (0.5 + star * 0.5);
    alpha *= starShape * life;
    color = mix(color, vec3f(1.0), 0.3);
  } else if (pType == 3.0) {
    // Success - confetti squares
    let squareDist = max(abs(uv.x - 0.5), abs(uv.y - 0.5)) * 2.0;
    let square = 1.0 - smoothstep(0.6, 0.7, squareDist);
    alpha *= square * life;
    color *= 1.2;
  } else if (pType == 4.0) {
    // Fail - fading circles
    let circle = 1.0 - smoothstep(0.4, 0.8, d);
    alpha *= circle * life * 0.6;
    color = mix(color, vec3f(0.3, 0.3, 0.3), 0.3);
  } else if (pType == 5.0) {
    // Game over - firework burst
    let burst = 1.0 - smoothstep(0.0, 1.0, d);
    let core = 1.0 - smoothstep(0.0, 0.3, d);
    alpha *= burst * life;
    color = mix(color, vec3f(1.0, 1.0, 0.8), core * 0.5);
  } else {
    // Default
    let circle = 1.0 - smoothstep(0.4, 0.5, d);
    alpha *= circle * life;
  }

  // Neon glow effect
  color += color * (1.0 - d) * 0.2;

  if (alpha < 0.01) {
    discard;
  }

  return vec4f(color, alpha);
}
`;
