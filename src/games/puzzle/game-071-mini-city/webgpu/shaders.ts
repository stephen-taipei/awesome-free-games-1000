/**
 * WGSL Shaders - Mini City
 * Urban / Night City / Modern Architecture Theme
 * Game #071
 */

export const BACKGROUND_SHADER = /* wgsl */ `
struct Uniforms {
  time: f32,
  width: f32,
  height: f32,
  pad: f32,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;

@vertex
fn vertexMain(@builtin(vertex_index) idx: u32) -> @builtin(position) vec4f {
  var pos = array<vec2f, 4>(
    vec2f(-1, -1), vec2f(1, -1), vec2f(-1, 1), vec2f(1, 1)
  );
  return vec4f(pos[idx], 0, 1);
}

// Night sky gradient
fn nightSky(uv: vec2f, time: f32) -> vec3f {
  let gradient = mix(
    vec3f(0.05, 0.05, 0.15),
    vec3f(0.15, 0.1, 0.25),
    uv.y
  );
  return gradient;
}

// Stars
fn stars(uv: vec2f, time: f32) -> f32 {
  let scaled = uv * 50.0;
  let id = floor(scaled);
  let f = fract(scaled);

  let hash = fract(sin(dot(id, vec2f(12.9898, 78.233))) * 43758.5453);

  if (hash > 0.97) {
    let center = vec2f(hash, fract(hash * 1.5));
    let d = length(f - center);
    let twinkle = sin(time * 3.0 + hash * 100.0) * 0.5 + 0.5;
    return smoothstep(0.1, 0.0, d) * twinkle * 0.8;
  }
  return 0.0;
}

// City skyline silhouette
fn skyline(uv: vec2f, time: f32) -> f32 {
  let x = uv.x * 20.0;
  var height = 0.0;

  // Building heights
  height += sin(x * 0.5) * 0.05;
  height += sin(x * 1.3 + 1.0) * 0.08;
  height += sin(x * 2.7 + 2.0) * 0.03;

  // Tall buildings
  let buildingId = floor(x);
  let buildingHash = fract(sin(buildingId * 45.678) * 12345.6789);
  if (buildingHash > 0.7) {
    let localX = fract(x);
    if (localX > 0.1 && localX < 0.9) {
      height = max(height, buildingHash * 0.2);
    }
  }

  let skylineY = 0.3 + height;
  return smoothstep(skylineY, skylineY + 0.01, uv.y);
}

// Window lights in buildings
fn windowLights(uv: vec2f, time: f32) -> f32 {
  let x = uv.x * 80.0;
  let y = uv.y * 40.0;

  let id = floor(vec2f(x, y));
  let hash = fract(sin(dot(id, vec2f(12.9898, 78.233))) * 43758.5453);

  if (hash > 0.6 && uv.y < 0.35) {
    let f = fract(vec2f(x, y));
    if (f.x > 0.2 && f.x < 0.8 && f.y > 0.2 && f.y < 0.8) {
      let flicker = sin(time * hash * 5.0) * 0.3 + 0.7;
      return flicker * 0.5;
    }
  }
  return 0.0;
}

// Traffic lights on ground
fn trafficLights(uv: vec2f, time: f32) -> vec3f {
  if (uv.y > 0.15) { return vec3f(0.0); }

  let x = uv.x * 30.0;
  let id = floor(x);
  let hash = fract(sin(id * 67.89) * 12345.0);

  if (hash > 0.8) {
    let phase = (time + hash * 10.0) % 3.0;
    let localX = fract(x);

    if (abs(localX - 0.5) < 0.05) {
      if (phase < 1.0) { return vec3f(0.0, 0.8, 0.0) * 0.3; }
      if (phase < 1.3) { return vec3f(1.0, 0.8, 0.0) * 0.3; }
      return vec3f(1.0, 0.0, 0.0) * 0.3;
    }
  }
  return vec3f(0.0);
}

// City glow at horizon
fn cityGlow(uv: vec2f, time: f32) -> vec3f {
  let glowY = 0.3;
  let dist = abs(uv.y - glowY);
  let glow = smoothstep(0.15, 0.0, dist) * 0.3;

  let pulse = sin(time * 0.5) * 0.1 + 0.9;
  return vec3f(1.0, 0.6, 0.3) * glow * pulse;
}

// Moving car headlights
fn carHeadlights(uv: vec2f, time: f32) -> vec3f {
  if (uv.y > 0.12 || uv.y < 0.08) { return vec3f(0.0); }

  let speed = 0.3;
  var carX = fract(time * speed);
  var carX2 = fract(time * speed * 0.7 + 0.5);

  let d1 = abs(uv.x - carX);
  let d2 = abs(uv.x - carX2);

  var light = smoothstep(0.02, 0.0, d1) * 0.5;
  light += smoothstep(0.015, 0.0, d2) * 0.4;

  return vec3f(1.0, 1.0, 0.9) * light;
}

@fragment
fn fragmentMain(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let uv = pos.xy / vec2f(uniforms.width, uniforms.height);
  let time = uniforms.time;

  // Night sky base
  var color = nightSky(uv, time);

  // Stars
  let starLight = stars(uv, time);
  color += vec3f(1.0, 1.0, 0.9) * starLight;

  // City glow at horizon
  color += cityGlow(uv, time);

  // Skyline mask
  let aboveSkyline = skyline(uv, time);
  let skylineColor = vec3f(0.02, 0.02, 0.05);

  // Window lights
  let windows = windowLights(uv, time);
  let windowColor = vec3f(1.0, 0.9, 0.6) * windows;

  // Blend skyline
  color = mix(skylineColor + windowColor, color, aboveSkyline);

  // Traffic lights
  color += trafficLights(uv, time);

  // Car headlights
  color += carHeadlights(uv, time);

  return vec4f(color, 1.0);
}
`;

export const PARTICLE_SHADER = /* wgsl */ `
struct Uniforms {
  time: f32,
  width: f32,
  height: f32,
  pad: f32,
}

struct VertexInput {
  @location(0) position: vec2f,
  @location(1) size: f32,
  @location(2) color: vec4f,
  @location(3) rotation: f32,
  @location(4) particleType: f32,
  @location(5) life: f32,
}

struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) uv: vec2f,
  @location(1) color: vec4f,
  @location(2) particleType: f32,
  @location(3) life: f32,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;

@vertex
fn vertexMain(
  input: VertexInput,
  @builtin(vertex_index) vIdx: u32
) -> VertexOutput {
  var corners = array<vec2f, 4>(
    vec2f(-1, -1), vec2f(1, -1), vec2f(-1, 1), vec2f(1, 1)
  );

  let corner = corners[vIdx];
  let c = cos(input.rotation);
  let s = sin(input.rotation);
  let rotated = vec2f(
    corner.x * c - corner.y * s,
    corner.x * s + corner.y * c
  );

  let aspect = uniforms.width / uniforms.height;
  let pixelSize = input.size / min(uniforms.width, uniforms.height);
  var scale = vec2f(pixelSize, pixelSize * aspect);

  var output: VertexOutput;
  output.position = vec4f(input.position + rotated * scale, 0, 1);
  output.uv = corner * 0.5 + 0.5;
  output.color = input.color;
  output.particleType = input.particleType;
  output.life = input.life;
  return output;
}

// Building rise shape
fn buildingShape(uv: vec2f, life: f32) -> f32 {
  let centered = uv - vec2f(0.5, 1.0);
  let box = max(abs(centered.x) - 0.3, abs(centered.y + 0.5) - 0.5);
  return smoothstep(0.0, -0.05, box) * life;
}

// Traffic trail
fn trafficTrail(uv: vec2f, life: f32) -> f32 {
  let y = abs(uv.y - 0.5);
  let trail = smoothstep(0.2, 0.0, y);
  let fade = uv.x * life;
  return trail * fade;
}

// Sparkle burst
fn sparkleBurst(uv: vec2f, life: f32) -> f32 {
  let centered = uv - 0.5;
  let dist = length(centered);
  let angle = atan2(centered.y, centered.x);

  let spikes = max(0.0, cos(angle * 5.0)) * (1.0 - dist * 2.0);
  let core = smoothstep(0.2, 0.0, dist);

  return max(spikes, core) * life;
}

// Growth ring
fn growthRing(uv: vec2f, life: f32) -> f32 {
  let centered = uv - 0.5;
  let dist = length(centered);

  let ring = smoothstep(0.4, 0.35, dist) * smoothstep(0.25, 0.3, dist);
  let core = smoothstep(0.15, 0.0, dist) * 0.5;

  return (ring + core) * life;
}

// Smoke puff
fn smokePuff(uv: vec2f, time: f32) -> f32 {
  let centered = uv - 0.5;
  let dist = length(centered);

  let noise = sin(centered.x * 10.0 + time) * sin(centered.y * 10.0 + time) * 0.2;
  let puff = smoothstep(0.4 + noise, 0.0, dist);

  return puff * 0.6;
}

// Landmark star
fn landmarkStar(uv: vec2f, time: f32) -> f32 {
  let centered = uv - 0.5;
  let angle = atan2(centered.y, centered.x);
  let dist = length(centered);

  let star = cos(angle * 4.0 + time * 2.0) * 0.5 + 0.5;
  let shape = star * (1.0 - dist * 2.0);
  let glow = smoothstep(0.5, 0.0, dist) * 0.5;

  return max(shape, glow);
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  let uv = input.uv;
  let pType = i32(input.particleType);
  var alpha: f32 = 0.0;
  var color = input.color.rgb;
  let time = uniforms.time;

  switch pType {
    // Building
    case 0: {
      alpha = buildingShape(uv, input.life) * input.color.a;
    }
    // Traffic
    case 1: {
      alpha = trafficTrail(uv, input.life) * input.color.a;
    }
    // Sparkle
    case 2: {
      alpha = sparkleBurst(uv, input.life) * input.color.a;
    }
    // Growth
    case 3: {
      alpha = growthRing(uv, input.life) * input.color.a;
    }
    // Smoke
    case 4: {
      alpha = smokePuff(uv, time) * input.color.a * input.life;
    }
    // Landmark
    case 5: {
      alpha = landmarkStar(uv, time) * input.color.a * input.life;
    }
    default: {
      let dist = length(uv - 0.5);
      alpha = smoothstep(0.5, 0.0, dist) * input.color.a * input.life;
    }
  }

  return vec4f(color, alpha);
}
`;
