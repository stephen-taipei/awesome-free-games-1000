/**
 * WGSL Shaders - Folding Puzzle
 * Paper / Origami / Japanese Aesthetic Theme
 * Game #137
 */

export const BACKGROUND_SHADER = /* wgsl */ `
struct Uniforms {
  time: f32,
  aspectRatio: f32,
  foldProgress: f32,
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

// Washi paper texture
fn washiTexture(uv: vec2f, time: f32) -> f32 {
  var texture = 0.0;

  // Fiber pattern
  let fiber1 = noise(uv * 80.0);
  let fiber2 = noise(uv * 120.0 + vec2f(100.0));
  let fiber3 = noise(uv * 200.0);

  texture = fiber1 * 0.5 + fiber2 * 0.3 + fiber3 * 0.2;

  // Subtle grain
  let grain = noise(uv * 400.0) * 0.05;
  texture += grain;

  return texture;
}

// Sakura petals floating
fn sakuraPetals(uv: vec2f, time: f32) -> float {
  var petals = 0.0;

  for (var i = 0u; i < 6u; i++) {
    let seed = f32(i) * 7.3;
    let x = fract(hash(vec2f(seed, 0.0)) + time * 0.03);
    let y = fract(hash(vec2f(seed, 1.0)) - time * 0.02);
    let size = 0.01 + hash(vec2f(seed, 2.0)) * 0.015;

    let d = distance(uv, vec2f(x, y));
    let petal = smoothstep(size, size * 0.3, d);

    // Rotation
    let angle = time * 0.5 + seed;
    let offset = vec2f(cos(angle), sin(angle)) * size * 0.3;
    let d2 = distance(uv, vec2f(x, y) + offset);
    petal += smoothstep(size * 0.7, size * 0.2, d2) * 0.5;

    petals += petal * 0.3;
  }

  return petals;
}

// Origami fold pattern
fn origamiFolds(uv: vec2f, time: f32) -> float {
  var folds = 0.0;

  // Diagonal creases
  let diag1 = abs(uv.x + uv.y - 1.0);
  let diag2 = abs(uv.x - uv.y);

  folds += smoothstep(0.02, 0.0, diag1) * 0.2;
  folds += smoothstep(0.02, 0.0, diag2) * 0.2;

  // Central fold
  let centerV = abs(uv.x - 0.5);
  let centerH = abs(uv.y - 0.5);

  folds += smoothstep(0.015, 0.0, centerV) * 0.15;
  folds += smoothstep(0.015, 0.0, centerH) * 0.15;

  // Animated fold suggestion
  let foldWave = sin(uv.x * 10.0 + time) * 0.5 + 0.5;
  folds += smoothstep(0.02, 0.0, abs(uv.y - 0.3 - foldWave * 0.1)) * 0.1 * (0.5 + 0.5 * sin(time * 2.0));

  return folds;
}

// Japanese pattern (Seigaiha - wave pattern)
fn seigaiha(uv: vec2f, time: f32) -> float {
  var pattern = 0.0;
  let scale = 15.0;

  for (var row = -1; row < 5; row++) {
    for (var col = -1; col < 10; col++) {
      let offset = select(0.0, 0.5, row % 2 != 0);
      let cx = (f32(col) + offset) / scale;
      let cy = f32(row) / scale * 0.866;

      for (var r = 1; r < 4; r++) {
        let radius = f32(r) * 0.02;
        let d = distance(fract(uv * scale) / scale, vec2f(cx, cy));
        let arc = smoothstep(0.003, 0.0, abs(d - radius)) * smoothstep(0.5, 0.0, uv.y - cy);
        pattern += arc * 0.1;
      }
    }
  }

  return pattern * 0.3;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  let uv = input.uv;
  let time = uniforms.time;

  // Base paper color
  var color = vec3f(0.95, 0.92, 0.88);

  // Washi texture
  let washi = washiTexture(uv, time);
  color = mix(color, vec3f(0.90, 0.87, 0.83), washi * 0.3);

  // Subtle seigaiha pattern
  let wave = seigaiha(uv, time);
  color += vec3f(0.80, 0.85, 0.90) * wave;

  // Origami fold lines
  let folds = origamiFolds(uv, time);
  color = mix(color, vec3f(0.85, 0.80, 0.75), folds);

  // Sakura petals
  let petals = sakuraPetals(uv, time);
  color = mix(color, vec3f(1.0, 0.75, 0.80), petals);

  // Soft vignette
  let vignette = 1.0 - length(uv - 0.5) * 0.5;
  color *= vignette;

  // Paper edge effect
  let edgeX = smoothstep(0.0, 0.02, uv.x) * smoothstep(1.0, 0.98, uv.x);
  let edgeY = smoothstep(0.0, 0.02, uv.y) * smoothstep(1.0, 0.98, uv.y);
  color *= edgeX * edgeY * 0.3 + 0.7;

  // Warm tint
  color = mix(color, vec3f(1.0, 0.98, 0.95), 0.1);

  return vec4f(color, 1.0);
}
`;

export const PARTICLE_SHADER = /* wgsl */ `
struct Uniforms {
  time: f32,
  aspectRatio: f32,
  foldProgress: f32,
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
    // Paper dust
    case 0: {
      alpha *= smoothstep(0.5, 0.2, d);
      let sparkle = 0.7 + 0.3 * sin(uniforms.time * 5.0 + d * 20.0);
      alpha *= sparkle;
    }
    // Fold crease
    case 1: {
      let line = smoothstep(0.15, 0.0, abs(uv.y - 0.5));
      alpha *= line;
      color = mix(color, vec3f(0.9, 0.85, 0.8), 0.3);
    }
    // Sakura petal
    case 2: {
      // Petal shape
      let petalD = d + sin(atan2(uv.y - 0.5, uv.x - 0.5) * 5.0) * 0.1;
      alpha *= smoothstep(0.5, 0.3, petalD);
      let innerGlow = exp(-petalD * 5.0);
      color += vec3f(1.0, 0.9, 0.92) * innerGlow * 0.3;
    }
    // Paper fold
    case 3: {
      let fold = smoothstep(0.5, 0.2, d);
      let crease = smoothstep(0.1, 0.0, abs(d - 0.3));
      alpha *= fold;
      color = mix(color, vec3f(0.95, 0.92, 0.88), crease * 0.5);
    }
    // Gold dust
    case 4: {
      let sparkle = smoothstep(0.5, 0.0, d);
      let glitter = 0.5 + 0.5 * sin(uniforms.time * 10.0 + uv.x * 50.0);
      alpha *= sparkle * glitter;
      color += vec3f(0.3, 0.2, 0.0) * glitter;
    }
    // Layer indicator
    case 5: {
      let ring = smoothstep(0.5, 0.4, d) * smoothstep(0.2, 0.3, d);
      let pulse = 0.6 + 0.4 * sin(uniforms.time * 3.0);
      alpha *= ring * pulse;
    }
    default: {
      alpha *= smoothstep(0.5, 0.2, d);
    }
  }

  return vec4f(color, alpha);
}
`;
