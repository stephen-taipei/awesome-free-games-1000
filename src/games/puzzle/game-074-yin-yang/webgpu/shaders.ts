/**
 * WebGPU Shaders - Yin Yang Balance
 * Cosmic Duality / Balance Energy Theme
 * Game #074
 */

export const BACKGROUND_SHADER = /* wgsl */ `
struct Uniforms {
  time: f32,
  width: f32,
  height: f32,
  balance: f32,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;

struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) uv: vec2f,
}

@vertex
fn vertexMain(@builtin(vertex_index) vertexIndex: u32) -> VertexOutput {
  var positions = array<vec2f, 4>(
    vec2f(-1.0, -1.0),
    vec2f(1.0, -1.0),
    vec2f(-1.0, 1.0),
    vec2f(1.0, 1.0)
  );

  var output: VertexOutput;
  output.position = vec4f(positions[vertexIndex], 0.0, 1.0);
  output.uv = positions[vertexIndex] * 0.5 + 0.5;
  return output;
}

fn hash(p: vec2f) -> f32 {
  var p3 = fract(vec3f(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
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
  var pos = p;

  for (var i = 0; i < 4; i++) {
    value += amplitude * noise(pos);
    pos *= 2.0;
    amplitude *= 0.5;
  }

  return value;
}

// Yin Yang symbol
fn yinYangSymbol(uv: vec2f, center: vec2f, radius: f32, rotation: f32) -> vec3f {
  let p = uv - center;
  let angle = atan2(p.y, p.x) + rotation;
  let dist = length(p);

  if (dist > radius) {
    return vec3f(0.0);
  }

  // Main half division
  let halfDivide = sin(angle) > 0.0;

  // Small circles
  let smallRadius = radius * 0.5;
  let topCenter = center + vec2f(0.0, smallRadius * 0.5) * vec2f(cos(rotation + 1.5708), sin(rotation + 1.5708));
  let bottomCenter = center - vec2f(0.0, smallRadius * 0.5) * vec2f(cos(rotation + 1.5708), sin(rotation + 1.5708));

  // Rotated positions for circles
  let sinR = sin(rotation);
  let cosR = cos(rotation);
  let topPos = center + vec2f(-sinR, cosR) * smallRadius * 0.5;
  let bottomPos = center + vec2f(sinR, -cosR) * smallRadius * 0.5;

  let distTop = length(uv - topPos);
  let distBottom = length(uv - bottomPos);

  var isYin = halfDivide;

  // Override for curved parts
  if (distTop < smallRadius * 0.5) {
    isYin = true;
  }
  if (distBottom < smallRadius * 0.5) {
    isYin = false;
  }

  // Small dots
  let dotRadius = radius * 0.12;
  if (distTop < dotRadius) {
    isYin = false;
  }
  if (distBottom < dotRadius) {
    isYin = true;
  }

  // Edge glow
  let edgeFactor = smoothstep(radius * 0.95, radius, dist);
  let glow = vec3f(0.56, 0.35, 0.68) * edgeFactor * 0.5;

  if (isYin) {
    return vec3f(0.1, 0.1, 0.18) + glow;
  } else {
    return vec3f(0.95, 0.95, 0.9) + glow;
  }
}

// Energy flow lines
fn energyFlow(uv: vec2f, time: f32) -> f32 {
  let flow1 = sin(uv.x * 10.0 + uv.y * 5.0 + time * 2.0) * 0.5 + 0.5;
  let flow2 = sin(uv.x * 8.0 - uv.y * 6.0 - time * 1.5) * 0.5 + 0.5;
  return flow1 * flow2 * 0.15;
}

// Cosmic dust
fn cosmicDust(uv: vec2f, time: f32) -> f32 {
  let pos = uv * 15.0 + vec2f(time * 0.3, time * 0.2);
  let n = fbm(pos);
  return pow(n, 3.0) * 0.3;
}

// Balance indicator glow
fn balanceGlow(uv: vec2f, balance: f32, time: f32) -> vec3f {
  let centerY = 0.85;
  let dist = abs(uv.y - centerY);

  // Horizontal balance indicator
  let indicatorX = 0.5 + balance * 0.3;
  let distToIndicator = length(vec2f(uv.x - indicatorX, (uv.y - centerY) * 3.0));

  let balanced = abs(balance) < 0.1;

  if (balanced) {
    let pulse = sin(time * 3.0) * 0.3 + 0.7;
    let glow = exp(-distToIndicator * 8.0) * pulse;
    return vec3f(0.2, 0.8, 0.4) * glow;
  } else {
    let glow = exp(-distToIndicator * 6.0) * 0.5;
    return vec3f(0.9, 0.3, 0.2) * glow;
  }
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  let uv = input.uv;
  let aspect = uniforms.width / uniforms.height;
  let adjustedUV = vec2f(uv.x * aspect, uv.y);
  let center = vec2f(0.5 * aspect, 0.5);

  // Base gradient - cosmic dark
  let gradient = mix(
    vec3f(0.05, 0.05, 0.12),
    vec3f(0.1, 0.08, 0.18),
    uv.y
  );

  var color = gradient;

  // Add cosmic dust
  let dust = cosmicDust(adjustedUV, uniforms.time);
  color += vec3f(0.3, 0.2, 0.5) * dust;

  // Energy flow
  let flow = energyFlow(adjustedUV, uniforms.time);
  color += vec3f(0.56, 0.35, 0.68) * flow;

  // Yin Yang symbol in background
  let symbolCenter = vec2f(0.5 * aspect, 0.2);
  let symbolRadius = 0.1;
  let rotation = uniforms.time * 0.2;
  let dist = length(adjustedUV - symbolCenter);

  if (dist < symbolRadius * 1.2) {
    let symbol = yinYangSymbol(adjustedUV, symbolCenter, symbolRadius, rotation);
    let alpha = 0.4 * smoothstep(symbolRadius * 1.2, symbolRadius * 0.8, dist);
    color = mix(color, symbol, alpha);
  }

  // Balance glow at bottom
  color += balanceGlow(uv, uniforms.balance, uniforms.time);

  // Subtle vignette
  let vignetteCenter = vec2f(0.5, 0.5);
  let vignette = 1.0 - length(uv - vignetteCenter) * 0.6;
  color *= vignette;

  // Duality shimmer
  let shimmer = sin(uv.x * 50.0 + uniforms.time * 2.0) *
                sin(uv.y * 50.0 - uniforms.time * 1.5) * 0.02;
  color += shimmer;

  return vec4f(color, 1.0);
}
`;

export const PARTICLE_SHADER = /* wgsl */ `
struct Uniforms {
  time: f32,
  width: f32,
  height: f32,
  balance: f32,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;

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

@vertex
fn vertexMain(
  input: VertexInput,
  @builtin(vertex_index) vertexIndex: u32
) -> VertexOutput {
  var corners = array<vec2f, 4>(
    vec2f(-1.0, -1.0),
    vec2f(1.0, -1.0),
    vec2f(-1.0, 1.0),
    vec2f(1.0, 1.0)
  );

  let corner = corners[vertexIndex];
  let size = input.size / max(uniforms.width, uniforms.height);

  let cos_r = cos(input.rotation);
  let sin_r = sin(input.rotation);
  let rotated = vec2f(
    corner.x * cos_r - corner.y * sin_r,
    corner.x * sin_r + corner.y * cos_r
  );

  var output: VertexOutput;
  output.position = vec4f(
    input.position + rotated * size,
    0.0,
    1.0
  );
  output.uv = corner;
  output.color = input.color;
  output.particleType = input.particleType;
  output.life = input.life;
  return output;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  let uv = input.uv;
  let dist = length(uv);
  let pType = i32(input.particleType);

  var alpha = 0.0;
  var color = input.color.rgb;

  // Type 0: energy - soft glowing orb
  if (pType == 0) {
    alpha = exp(-dist * 2.0) * input.color.a;
    let pulse = sin(uniforms.time * 4.0 + input.life * 10.0) * 0.2 + 0.8;
    color *= pulse;
  }
  // Type 1: flow - flowing stream
  else if (pType == 1) {
    let flow = sin(uv.x * 3.0 + uniforms.time * 5.0) * 0.3 + 0.7;
    let core = smoothstep(1.0, 0.3, dist);
    alpha = core * flow * input.color.a;
  }
  // Type 2: balance - yin yang mini symbol
  else if (pType == 2) {
    let angle = atan2(uv.y, uv.x);
    let halfSide = sin(angle + uniforms.time * 2.0) > 0.0;
    let core = smoothstep(1.0, 0.5, dist);

    if (halfSide) {
      color = vec3f(0.1, 0.1, 0.15);
    } else {
      color = vec3f(0.95, 0.95, 0.9);
    }

    alpha = core * input.color.a;
  }
  // Type 3: spark - bright sparkle
  else if (pType == 3) {
    let star = max(
      exp(-abs(uv.x) * 8.0) * exp(-abs(uv.y) * 2.0),
      exp(-abs(uv.x) * 2.0) * exp(-abs(uv.y) * 8.0)
    );
    let twinkle = sin(uniforms.time * 10.0 + input.life * 20.0) * 0.3 + 0.7;
    alpha = star * twinkle * input.color.a;
    color = mix(color, vec3f(1.0), 0.3);
  }
  // Type 4: harmony - pulsing ring
  else if (pType == 4) {
    let ring = abs(dist - 0.6);
    let ringAlpha = smoothstep(0.15, 0.0, ring);
    let pulse = sin(uniforms.time * 3.0) * 0.3 + 0.7;
    alpha = ringAlpha * pulse * input.color.a;

    // Golden color for harmony
    color = mix(color, vec3f(1.0, 0.85, 0.3), 0.5);
  }
  // Type 5: wave - expanding ripple
  else if (pType == 5) {
    let wave = sin(dist * 15.0 - uniforms.time * 8.0) * 0.5 + 0.5;
    let fade = exp(-dist * 2.0);
    alpha = wave * fade * input.color.a;
  }

  // Life fade
  let lifeFade = smoothstep(0.0, 0.2, input.life);
  alpha *= lifeFade;

  if (alpha < 0.01) {
    discard;
  }

  return vec4f(color, alpha);
}
`;
