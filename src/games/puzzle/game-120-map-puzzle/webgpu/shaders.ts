/**
 * WebGPU WGSL Shaders - Map Puzzle
 * Cartography / Explorer Theme
 * Game #120
 */

export const BACKGROUND_SHADER = /* wgsl */ `
struct Uniforms {
  time: f32,
  resolution: vec2<f32>,
  mapProgress: f32,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;

struct VertexOutput {
  @builtin(position) position: vec4<f32>,
  @location(0) uv: vec2<f32>,
}

@vertex
fn vertexMain(@builtin(vertex_index) vertexIndex: u32) -> VertexOutput {
  var pos = array<vec2<f32>, 4>(
    vec2<f32>(-1.0, -1.0),
    vec2<f32>(1.0, -1.0),
    vec2<f32>(-1.0, 1.0),
    vec2<f32>(1.0, 1.0)
  );

  var output: VertexOutput;
  output.position = vec4<f32>(pos[vertexIndex], 0.0, 1.0);
  output.uv = pos[vertexIndex] * 0.5 + 0.5;
  return output;
}

// Hash function for noise
fn hash(p: vec2<f32>) -> f32 {
  var p3 = fract(vec3<f32>(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

// 2D noise
fn noise(p: vec2<f32>) -> f32 {
  let i = floor(p);
  let f = fract(p);
  let u = f * f * (3.0 - 2.0 * f);

  return mix(
    mix(hash(i + vec2<f32>(0.0, 0.0)), hash(i + vec2<f32>(1.0, 0.0)), u.x),
    mix(hash(i + vec2<f32>(0.0, 1.0)), hash(i + vec2<f32>(1.0, 1.0)), u.x),
    u.y
  );
}

// Fractal noise for parchment texture
fn fbm(p: vec2<f32>) -> f32 {
  var value = 0.0;
  var amplitude = 0.5;
  var frequency = 1.0;
  var pos = p;

  for (var i = 0; i < 5; i++) {
    value += amplitude * noise(pos * frequency);
    amplitude *= 0.5;
    frequency *= 2.0;
  }

  return value;
}

// Compass rose pattern
fn compassRose(uv: vec2<f32>, center: vec2<f32>, size: f32, time: f32) -> f32 {
  let p = uv - center;
  let angle = atan2(p.y, p.x);
  let dist = length(p);

  // Main points (N, S, E, W)
  let mainPoints = abs(sin(angle * 2.0));
  // Sub points (NE, NW, SE, SW)
  let subPoints = abs(sin(angle * 2.0 + 3.14159 * 0.25)) * 0.7;

  let points = max(mainPoints, subPoints);
  let rose = smoothstep(size, size * 0.3, dist) * points;

  // Center circle
  let center_circle = smoothstep(size * 0.15, size * 0.1, dist);

  // Spinning needle effect
  let needleAngle = time * 0.3;
  let needle = smoothstep(0.02, 0.0, abs(sin(angle - needleAngle))) * smoothstep(size * 0.5, size * 0.1, dist);

  return rose * 0.3 + center_circle * 0.5 + needle * 0.4;
}

// Map grid pattern
fn mapGrid(uv: vec2<f32>, gridSize: f32) -> f32 {
  let grid = uv * gridSize;
  let lines = smoothstep(0.02, 0.0, abs(fract(grid.x) - 0.5)) +
              smoothstep(0.02, 0.0, abs(fract(grid.y) - 0.5));
  return lines * 0.15;
}

// Latitude/longitude lines
fn latLongLines(uv: vec2<f32>, time: f32) -> f32 {
  let lat = sin(uv.y * 20.0 + time * 0.1) * 0.5 + 0.5;
  let lon = sin(uv.x * 20.0 - time * 0.1) * 0.5 + 0.5;
  let lines = smoothstep(0.95, 1.0, lat) + smoothstep(0.95, 1.0, lon);
  return lines * 0.2;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4<f32> {
  let uv = input.uv;
  let time = uniforms.time;
  let progress = uniforms.mapProgress;

  // Parchment base colors
  let parchmentLight = vec3<f32>(0.96, 0.91, 0.76);
  let parchmentDark = vec3<f32>(0.85, 0.78, 0.62);
  let sepia = vec3<f32>(0.44, 0.26, 0.08);

  // Parchment texture using fbm
  let parchmentNoise = fbm(uv * 8.0 + time * 0.02);
  let stainNoise = fbm(uv * 3.0 + vec2<f32>(100.0, 50.0));

  // Base parchment color with variation
  var color = mix(parchmentLight, parchmentDark, parchmentNoise * 0.5 + 0.25);

  // Age stains
  let stains = smoothstep(0.4, 0.7, stainNoise) * 0.15;
  color = mix(color, sepia, stains);

  // Edge darkening (aged look)
  let edgeDist = min(min(uv.x, 1.0 - uv.x), min(uv.y, 1.0 - uv.y));
  let edgeDark = smoothstep(0.0, 0.15, edgeDist);
  color *= 0.7 + edgeDark * 0.3;

  // Fold lines
  let foldX = smoothstep(0.01, 0.0, abs(uv.x - 0.5));
  let foldY = smoothstep(0.01, 0.0, abs(uv.y - 0.5));
  color *= 1.0 - (foldX + foldY) * 0.1;

  // Map grid
  let grid = mapGrid(uv, 10.0);
  color = mix(color, sepia, grid);

  // Latitude/longitude decorative lines
  let latLong = latLongLines(uv, time);
  color = mix(color, sepia * 0.7, latLong * (0.5 + progress * 0.5));

  // Compass rose in corner
  let compassPos = vec2<f32>(0.85, 0.15);
  let compass = compassRose(uv, compassPos, 0.1, time);
  let compassGold = vec3<f32>(0.85, 0.65, 0.13);
  color = mix(color, compassGold, compass * 0.6);

  // Discovery glow based on progress
  let glowCenter = vec2<f32>(0.5, 0.5);
  let glowDist = length(uv - glowCenter);
  let discoveryGlow = (1.0 - smoothstep(0.0, 0.5, glowDist)) * progress * 0.2;
  let goldGlow = vec3<f32>(1.0, 0.85, 0.4);
  color += goldGlow * discoveryGlow;

  // Subtle animation - floating dust particles
  let dustNoise = noise(uv * 50.0 + time * 0.5);
  let dust = smoothstep(0.85, 0.9, dustNoise) * 0.1;
  color += vec3<f32>(1.0, 0.95, 0.8) * dust;

  return vec4<f32>(color, 1.0);
}
`;

export const PARTICLE_SHADER = /* wgsl */ `
struct Uniforms {
  time: f32,
  resolution: vec2<f32>,
  mapProgress: f32,
}

struct Particle {
  position: vec2<f32>,
  velocity: vec2<f32>,
  color: vec4<f32>,
  size: f32,
  life: f32,
  maxLife: f32,
  particleType: f32,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;
@group(0) @binding(1) var<storage, read> particles: array<Particle>;

struct VertexOutput {
  @builtin(position) position: vec4<f32>,
  @location(0) color: vec4<f32>,
  @location(1) uv: vec2<f32>,
  @location(2) particleType: f32,
  @location(3) life: f32,
}

@vertex
fn vertexMain(
  @builtin(vertex_index) vertexIndex: u32,
  @builtin(instance_index) instanceIndex: u32
) -> VertexOutput {
  let particle = particles[instanceIndex];

  var quadPos = array<vec2<f32>, 6>(
    vec2<f32>(-1.0, -1.0),
    vec2<f32>(1.0, -1.0),
    vec2<f32>(-1.0, 1.0),
    vec2<f32>(1.0, -1.0),
    vec2<f32>(1.0, 1.0),
    vec2<f32>(-1.0, 1.0)
  );

  let quad = quadPos[vertexIndex];
  let lifeRatio = particle.life / particle.maxLife;
  let size = particle.size * lifeRatio;

  let worldPos = particle.position + quad * size;
  let clipPos = vec2<f32>(
    (worldPos.x / uniforms.resolution.x) * 2.0 - 1.0,
    1.0 - (worldPos.y / uniforms.resolution.y) * 2.0
  );

  var output: VertexOutput;
  output.position = vec4<f32>(clipPos, 0.0, 1.0);
  output.color = particle.color;
  output.uv = quad * 0.5 + 0.5;
  output.particleType = particle.particleType;
  output.life = lifeRatio;
  return output;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4<f32> {
  let uv = input.uv;
  let center = vec2<f32>(0.5, 0.5);
  let dist = length(uv - center);
  let particleType = i32(input.particleType);
  let time = uniforms.time;

  var alpha = 0.0;
  var color = input.color.rgb;

  switch (particleType) {
    // Type 0: Compass needle
    case 0: {
      let angle = atan2(uv.y - 0.5, uv.x - 0.5);
      let needleShape = smoothstep(0.1, 0.0, abs(sin(angle * 2.0))) * smoothstep(0.5, 0.1, dist);
      let compassCircle = smoothstep(0.12, 0.08, dist) - smoothstep(0.08, 0.04, dist);
      alpha = (needleShape + compassCircle) * input.life;
    }

    // Type 1: Terrain marker
    case 1: {
      let triangle = 1.0 - smoothstep(0.0, 0.4, abs(uv.x - 0.5) + abs(uv.y - 0.3) * 0.8);
      let base = smoothstep(0.1, 0.0, abs(uv.y - 0.8)) * step(0.3, uv.x) * step(uv.x, 0.7);
      alpha = max(triangle, base) * input.life;
    }

    // Type 2: Explorer footprint
    case 2: {
      let footL = smoothstep(0.15, 0.1, length(uv - vec2<f32>(0.35, 0.5)));
      let footR = smoothstep(0.15, 0.1, length(uv - vec2<f32>(0.65, 0.5)));
      let trail = (footL + footR) * 0.8;
      alpha = trail * input.life;
    }

    // Type 3: Trail dust
    case 3: {
      let dustCore = smoothstep(0.3, 0.0, dist);
      let dustOuter = smoothstep(0.5, 0.3, dist) * 0.3;
      let wobble = sin(time * 10.0 + dist * 20.0) * 0.1 + 0.9;
      alpha = (dustCore + dustOuter) * wobble * input.life;
    }

    // Type 4: Sparkle (discovery)
    case 4: {
      let angle = atan2(uv.y - 0.5, uv.x - 0.5);
      let rays = abs(sin(angle * 4.0 + time * 3.0));
      let sparkle = rays * smoothstep(0.5, 0.0, dist);
      let core = smoothstep(0.15, 0.0, dist);
      alpha = (sparkle * 0.6 + core) * input.life;
    }

    // Type 5: Glow orb
    case 5, default: {
      let glow = smoothstep(0.5, 0.0, dist);
      let pulse = sin(time * 4.0) * 0.2 + 0.8;
      alpha = glow * pulse * input.life;
    }
  }

  alpha *= input.color.a;

  return vec4<f32>(color, alpha);
}
`;
