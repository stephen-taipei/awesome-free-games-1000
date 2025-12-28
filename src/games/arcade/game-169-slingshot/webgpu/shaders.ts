/**
 * WebGPU Shaders - Slingshot
 * Arcade / Slingshot / Outdoor Nature Theme
 * Game #169
 */

export const BACKGROUND_SHADER = /* wgsl */ `
struct Uniforms {
  time: f32,
  resolution: vec2f,
  level: f32,
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
  let k = vec2f(0.3183099, 0.3678794);
  let kp = p * k + k.yx;
  return fract(16.0 * k.x * fract(kp.x * kp.y * (kp.x + kp.y)));
}

fn noise(p: vec2f) -> f32 {
  let i = floor(p);
  let f = fract(p);
  let u = f * f * (3.0 - 2.0 * f);

  return mix(
    mix(hash(i + vec2f(0.0, 0.0)), hash(i + vec2f(1.0, 0.0)), u.x),
    mix(hash(i + vec2f(0.0, 1.0)), hash(i + vec2f(1.0, 1.0)), u.x),
    u.y
  );
}

fn fbm(p: vec2f) -> f32 {
  var value = 0.0;
  var amplitude = 0.5;
  var frequency = 1.0;
  var pp = p;

  for (var i = 0; i < 4; i++) {
    value += amplitude * noise(pp * frequency);
    amplitude *= 0.5;
    frequency *= 2.0;
  }
  return value;
}

// Cloud shape
fn cloud(uv: vec2f, pos: vec2f, scale: f32) -> f32 {
  let d = distance(uv, pos);
  let n = fbm((uv - pos) * 10.0 / scale + uniforms.time * 0.02);
  let shape = smoothstep(scale, scale * 0.3, d + n * scale * 0.3);
  return shape * 0.6;
}

// Grass blade
fn grassBlade(uv: vec2f, baseX: f32, height: f32, time: f32) -> f32 {
  let windOffset = sin(time * 2.0 + baseX * 10.0) * 0.02;
  let bladeX = baseX + windOffset * uv.y;
  let dx = abs(uv.x - bladeX);
  let blade = smoothstep(0.003, 0.001, dx) * step(uv.y, height) * (1.0 - uv.y / height);
  return blade;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  let uv = input.uv;
  let time = uniforms.time;

  // Sky gradient
  let skyTop = vec3f(0.4, 0.7, 0.95);
  let skyBottom = vec3f(0.7, 0.85, 0.95);
  var bg = mix(skyBottom, skyTop, pow(1.0 - uv.y, 0.5));

  // Sun
  let sunPos = vec2f(0.85, 0.85);
  let sunDist = distance(uv, sunPos);
  let sunCore = smoothstep(0.08, 0.02, sunDist);
  let sunGlow = smoothstep(0.25, 0.05, sunDist) * 0.4;
  let sunRays = smoothstep(0.4, 0.1, sunDist) * 0.2;
  bg += vec3f(1.0, 0.95, 0.6) * (sunCore + sunGlow + sunRays);

  // Clouds
  let cloudY = 0.75;
  for (var i = 0; i < 4; i++) {
    let cloudX = fract(f32(i) * 0.27 + time * 0.01);
    let cloudScale = 0.08 + f32(i) * 0.02;
    let cloudAlpha = cloud(uv, vec2f(cloudX, cloudY + f32(i) * 0.05), cloudScale);
    bg = mix(bg, vec3f(1.0), cloudAlpha * 0.7);
  }

  // Distant hills
  let hillHeight1 = 0.55 + fbm(vec2f(uv.x * 3.0, 0.0)) * 0.08;
  if (uv.y < hillHeight1) {
    let hillColor = vec3f(0.25, 0.45, 0.25);
    let hillShade = 1.0 - (hillHeight1 - uv.y) * 2.0;
    bg = mix(bg, hillColor * hillShade, 0.6);
  }

  // Middle hills
  let hillHeight2 = 0.48 + fbm(vec2f(uv.x * 5.0 + 1.0, 0.0)) * 0.06;
  if (uv.y < hillHeight2) {
    let hillColor = vec3f(0.2, 0.4, 0.18);
    bg = hillColor;
  }

  // Main ground
  let groundLevel = 0.4;
  if (uv.y < groundLevel) {
    // Grass base
    let grassBase = vec3f(0.18, 0.38, 0.15);
    let grassHighlight = vec3f(0.35, 0.55, 0.2);
    let grassNoise = fbm(uv * vec2f(30.0, 10.0));
    let grassColor = mix(grassBase, grassHighlight, grassNoise * 0.5);

    // Add grass blade texture
    let bladePattern = 0.0;
    for (var i = 0; i < 10; i++) {
      let bladeX = fract(f32(i) * 0.103 + floor(uv.x * 50.0) / 50.0);
      let bladeHeight = groundLevel * (0.02 + hash(vec2f(f32(i), bladeX)) * 0.03);
      // Simplified grass blade effect
    }

    bg = grassColor;

    // Add some grass variation
    let grassDetail = noise(uv * 100.0) * 0.1;
    bg += vec3f(grassDetail * 0.5, grassDetail, grassDetail * 0.3);
  }

  // Dirt/ground detail at bottom
  if (uv.y < 0.1) {
    let dirtColor = vec3f(0.4, 0.28, 0.18);
    let dirtBlend = smoothstep(0.1, 0.0, uv.y);
    bg = mix(bg, dirtColor, dirtBlend * 0.5);
  }

  // Tree silhouettes in background
  let treeX1 = 0.15;
  let treeX2 = 0.75;
  let treeColor = vec3f(0.12, 0.25, 0.1);

  // Tree 1
  let treeDist1 = abs(uv.x - treeX1);
  let treeHeight1 = 0.55;
  let treeWidth1 = 0.06 - (treeHeight1 - uv.y) * 0.08;
  if (uv.y > 0.35 && uv.y < treeHeight1 && treeDist1 < max(0.01, treeWidth1)) {
    let treeFoliage = noise(uv * 50.0) * 0.3;
    bg = mix(bg, treeColor + vec3f(treeFoliage * 0.1), 0.7);
  }

  // Tree 2
  let treeDist2 = abs(uv.x - treeX2);
  let treeHeight2 = 0.5;
  let treeWidth2 = 0.05 - (treeHeight2 - uv.y) * 0.07;
  if (uv.y > 0.3 && uv.y < treeHeight2 && treeDist2 < max(0.01, treeWidth2)) {
    let treeFoliage = noise(uv * 50.0 + 10.0) * 0.3;
    bg = mix(bg, treeColor + vec3f(treeFoliage * 0.1), 0.6);
  }

  // Atmospheric haze near horizon
  let hazeAmount = smoothstep(0.5, 0.35, uv.y) * 0.15;
  bg = mix(bg, vec3f(0.7, 0.8, 0.9), hazeAmount);

  // Subtle sun rays
  let rayAngle = atan2(uv.y - sunPos.y, uv.x - sunPos.x);
  let rays = sin(rayAngle * 12.0 + time * 0.5) * 0.5 + 0.5;
  let rayIntensity = smoothstep(0.5, 0.1, sunDist) * rays * 0.05;
  bg += vec3f(1.0, 0.95, 0.8) * rayIntensity;

  // Vignette
  let vignette = 1.0 - length((uv - 0.5) * 1.2) * 0.25;
  bg *= vignette;

  return vec4f(bg, 0.85);
}
`;

export const PARTICLE_SHADER = /* wgsl */ `
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

  var size = particle.size;
  let pType = i32(particle.particleType);

  // Type-specific size behavior
  if (pType == 0) {
    // Launch dust - expands then fades
    size *= 1.5 - lifeRatio * 0.5;
  } else if (pType == 1) {
    // Stone trail - shrinks
    size *= lifeRatio * 0.8;
  } else if (pType == 2) {
    // Target hit - burst
    size *= 1.8 - lifeRatio * 0.8;
  } else if (pType == 3) {
    // Target shatter - fragments
    size *= 0.8 + lifeRatio * 0.4;
  } else if (pType == 4) {
    // Score spark - flickers
    size *= 0.6 + sin(uniforms.time * 20.0) * 0.3;
  } else if (pType == 5) {
    // Game over confetti
    size *= 0.8 + sin(uniforms.time * 8.0 + f32(instanceIndex)) * 0.3;
  }

  let worldPos = particle.position + corner * size * 0.02;
  let clipPos = worldPos * 2.0 - 1.0;

  var output: VertexOutput;
  output.position = vec4f(clipPos.x, -clipPos.y, 0.0, 1.0);
  output.color = particle.color;
  output.uv = corner * 0.5 + 0.5;
  output.particleType = particle.particleType;
  output.life = lifeRatio;
  return output;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  let uv = input.uv;
  let center = vec2f(0.5, 0.5);
  let dist = distance(uv, center);
  let pType = i32(input.particleType);

  var alpha = input.color.a;
  var color = input.color.rgb;

  if (pType == 0) {
    // Launch dust - soft cloud
    let cloud = smoothstep(0.5, 0.1, dist);
    let noise = sin(uv.x * 20.0 + uniforms.time * 5.0) * sin(uv.y * 20.0) * 0.2;
    alpha *= cloud * input.life * (0.8 + noise);
  } else if (pType == 1) {
    // Stone trail - round dot
    let trail = smoothstep(0.5, 0.0, dist);
    alpha *= trail * input.life * 0.5;
  } else if (pType == 2) {
    // Target hit - ring burst
    let ring = smoothstep(0.5, 0.35, dist) - smoothstep(0.3, 0.15, dist);
    let core = smoothstep(0.2, 0.0, dist) * 0.6;
    alpha *= (ring + core) * input.life;
    color += vec3f(0.2) * core;
  } else if (pType == 3) {
    // Target shatter - fragments
    let fragment = step(0.4, 1.0 - dist);
    let angle = atan2(uv.y - 0.5, uv.x - 0.5);
    let shatter = step(0.5, fract(angle * 3.0 / 3.14159));
    alpha *= fragment * shatter * input.life;
  } else if (pType == 4) {
    // Score spark - star shape
    let angle = atan2(uv.y - 0.5, uv.x - 0.5);
    let star = 0.3 + abs(sin(angle * 4.0)) * 0.2;
    let spark = smoothstep(star, 0.0, dist);
    alpha *= spark * input.life;
    color += vec3f(0.3, 0.2, 0.0) * spark;
  } else if (pType == 5) {
    // Game over confetti - rectangles
    let rect = step(abs(uv.x - 0.5), 0.35) * step(abs(uv.y - 0.5), 0.4);
    let spin = sin(uniforms.time * 5.0 + input.life * 10.0);
    alpha *= rect * (0.7 + spin * 0.3);
  }

  // Add glow effect for all particles
  let glow = smoothstep(0.6, 0.0, dist) * 0.15 * input.life;
  color += color * glow;

  return vec4f(color, alpha);
}
`;
