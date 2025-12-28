/**
 * WGSL Shaders - Bejeweled
 * Game #011 - Crystal Kingdom Cyberpunk Theme
 */

// 背景著色器 - 水晶洞穴主題
export const backgroundShader = /* wgsl */`
struct Uniforms {
  resolution: vec2f,
  time: f32,
  gridSize: f32,
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

fn crystalPattern(uv: vec2f, time: f32) -> f32 {
  var p = uv * 10.0;
  var val = 0.0;
  var amp = 1.0;

  for (var i = 0; i < 4; i++) {
    val += noise(p + time * 0.1) * amp;
    p *= 2.0;
    amp *= 0.5;
  }

  return val * 0.25;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  let uv = input.uv;
  let time = uniforms.time;

  // 深紫色水晶洞穴背景
  let baseColor1 = vec3f(0.08, 0.02, 0.15);
  let baseColor2 = vec3f(0.15, 0.05, 0.25);

  // 漸層背景
  var color = mix(baseColor1, baseColor2, uv.y + sin(uv.x * 3.0 + time * 0.5) * 0.1);

  // 水晶紋理
  let crystal = crystalPattern(uv, time);
  color += vec3f(0.1, 0.05, 0.15) * crystal;

  // 閃爍光點
  let sparkle1 = smoothstep(0.98, 1.0, noise(uv * 50.0 + time * 2.0));
  let sparkle2 = smoothstep(0.97, 1.0, noise(uv * 30.0 - time * 1.5));
  color += vec3f(1.0, 0.8, 1.0) * sparkle1 * 0.5;
  color += vec3f(0.8, 0.6, 1.0) * sparkle2 * 0.3;

  // 邊緣光暈
  let vignetteRadius = length(uv - 0.5) * 1.5;
  let vignette = 1.0 - smoothstep(0.3, 1.2, vignetteRadius);
  color *= vignette * 0.8 + 0.2;

  // 頂部光源
  let topLight = smoothstep(0.8, 0.0, uv.y) * 0.15;
  color += vec3f(0.6, 0.4, 0.8) * topLight;

  // 彩虹折射
  let rainbow = sin(uv.x * 20.0 + time) * sin(uv.y * 15.0 - time * 0.7);
  color += vec3f(0.1, 0.05, 0.15) * rainbow * 0.1;

  return vec4f(color, 1.0);
}
`;

// 寶石著色器 - 3D 水晶效果
export const gemShader = /* wgsl */`
struct Uniforms {
  viewProjection: mat4x4f,
  time: f32,
  gemSize: f32,
  padding: vec2f,
}

struct GemInstance {
  position: vec2f,
  colorIndex: f32,
  scale: f32,
  rotation: f32,
  selected: f32,
  matched: f32,
  shapeType: f32,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;
@group(0) @binding(1) var<storage, read> gems: array<GemInstance>;

struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) localPos: vec2f,
  @location(1) colorIndex: f32,
  @location(2) selected: f32,
  @location(3) matched: f32,
  @location(4) shapeType: f32,
  @location(5) worldPos: vec2f,
}

@vertex
fn vertexMain(
  @builtin(vertex_index) vertexIndex: u32,
  @builtin(instance_index) instanceIndex: u32
) -> VertexOutput {
  var quad = array<vec2f, 6>(
    vec2f(-0.5, -0.5), vec2f(0.5, -0.5), vec2f(0.5, 0.5),
    vec2f(-0.5, -0.5), vec2f(0.5, 0.5), vec2f(-0.5, 0.5)
  );

  let gem = gems[instanceIndex];
  let localPos = quad[vertexIndex];

  // 旋轉
  let c = cos(gem.rotation);
  let s = sin(gem.rotation);
  let rotated = vec2f(
    localPos.x * c - localPos.y * s,
    localPos.x * s + localPos.y * c
  );

  let size = uniforms.gemSize * gem.scale;
  let worldPos = gem.position + rotated * size;

  var output: VertexOutput;
  output.position = uniforms.viewProjection * vec4f(worldPos, 0.0, 1.0);
  output.localPos = localPos;
  output.colorIndex = gem.colorIndex;
  output.selected = gem.selected;
  output.matched = gem.matched;
  output.shapeType = gem.shapeType;
  output.worldPos = worldPos;

  return output;
}

fn gemColor(index: f32) -> vec3f {
  let colors = array<vec3f, 7>(
    vec3f(0.91, 0.30, 0.24),  // 紅寶石
    vec3f(0.95, 0.55, 0.15),  // 琥珀
    vec3f(0.98, 0.85, 0.15),  // 黃水晶
    vec3f(0.20, 0.85, 0.45),  // 翡翠
    vec3f(0.25, 0.60, 0.95),  // 藍寶石
    vec3f(0.70, 0.35, 0.85),  // 紫水晶
    vec3f(0.95, 0.95, 0.98)   // 鑽石
  );
  return colors[i32(index) % 7];
}

fn sdSquare(p: vec2f, s: f32) -> f32 {
  let d = abs(p) - s;
  return length(max(d, vec2f(0.0))) + min(max(d.x, d.y), 0.0);
}

fn sdCircle(p: vec2f, r: f32) -> f32 {
  return length(p) - r;
}

fn sdDiamond(p: vec2f, s: f32) -> f32 {
  let q = abs(p);
  return (q.x + q.y - s) * 0.707;
}

fn sdTriangle(p: vec2f, s: f32) -> f32 {
  let k = sqrt(3.0);
  var q = p;
  q.x = abs(q.x) - s;
  q.y = q.y + s / k;
  if (q.x + k * q.y > 0.0) {
    q = vec2f(q.x - k * q.y, -k * q.x - q.y) / 2.0;
  }
  q.x -= clamp(q.x, -2.0 * s, 0.0);
  return -length(q) * sign(q.y);
}

fn sdHexagon(p: vec2f, r: f32) -> f32 {
  let k = vec3f(-0.866025404, 0.5, 0.577350269);
  var q = abs(p);
  q = q - 2.0 * min(dot(k.xy, q), 0.0) * k.xy;
  q = q - vec2f(clamp(q.x, -k.z * r, k.z * r), r);
  return length(q) * sign(q.y);
}

fn sdStar5(p: vec2f, r: f32) -> f32 {
  let k1 = vec2f(0.809016994, -0.587785252);
  let k2 = vec2f(-k1.x, k1.y);
  var q = p;
  q.x = abs(q.x);
  q = q - 2.0 * max(dot(k1, q), 0.0) * k1;
  q = q - 2.0 * max(dot(k2, q), 0.0) * k2;
  q.x = abs(q.x);
  q.y -= r;
  let ba = vec2f(-k1.y * r, k1.x * r) - vec2f(0.0, r);
  let h = clamp(dot(q, ba) / dot(ba, ba), 0.0, r);
  return length(q - ba * h) * sign(q.y * ba.x - q.x * ba.y);
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  let p = input.localPos * 2.0;
  let shapeType = i32(input.shapeType);
  let time = uniforms.time;

  // 根據形狀計算 SDF
  var dist: f32;
  if (shapeType == 0) {
    dist = sdSquare(p, 0.7);
  } else if (shapeType == 1) {
    dist = sdCircle(p, 0.4);
  } else if (shapeType == 2) {
    dist = sdDiamond(p, 0.6);
  } else if (shapeType == 3) {
    dist = sdTriangle(p * vec2f(1.0, -1.0), 0.4);
  } else if (shapeType == 4) {
    dist = sdHexagon(p, 0.38);
  } else if (shapeType == 5) {
    dist = sdStar5(p, 0.35);
  } else {
    dist = sdDiamond(p * vec2f(0.7, 1.0), 0.5);
  }

  // 超出形狀則丟棄
  if (dist > 0.02) {
    discard;
  }

  let baseColor = gemColor(input.colorIndex);

  // 3D 水晶效果
  let edgeDist = smoothstep(0.0, -0.15, dist);
  let innerGlow = smoothstep(-0.3, 0.0, dist);

  // 內部折射
  let refract = sin(p.x * 8.0 + time) * cos(p.y * 8.0 - time * 0.7) * 0.15;

  // 高光
  let highlight1 = smoothstep(0.3, 0.0, length(p - vec2f(-0.2, -0.25)));
  let highlight2 = smoothstep(0.5, 0.0, length(p - vec2f(0.15, 0.2)));

  var color = baseColor;

  // 邊緣暗化
  color *= 0.6 + edgeDist * 0.5;

  // 折射色彩
  color += vec3f(0.1, 0.05, 0.15) * refract;

  // 高光
  color += vec3f(1.0) * highlight1 * 0.6;
  color += baseColor * highlight2 * 0.3;

  // 內發光
  color += baseColor * innerGlow * 0.2;

  // 選中效果 - 金色脈動邊框
  if (input.selected > 0.5) {
    let pulse = 0.5 + sin(time * 5.0) * 0.5;
    let edgeGlow = smoothstep(0.0, -0.08, dist) - smoothstep(-0.08, -0.15, dist);
    color += vec3f(1.0, 0.85, 0.3) * edgeGlow * pulse * 2.0;
    color += vec3f(1.0, 0.9, 0.5) * 0.15;
  }

  // 配對消除效果 - 閃白
  if (input.matched > 0.5) {
    let flash = 0.5 + sin(time * 15.0) * 0.5;
    color = mix(color, vec3f(1.0), flash * 0.7);
  }

  // Fresnel 邊緣發光
  let fresnel = pow(1.0 - edgeDist, 3.0);
  color += baseColor * fresnel * 0.4;

  return vec4f(color, 1.0);
}
`;

// 網格著色器
export const gridShader = /* wgsl */`
struct Uniforms {
  viewProjection: mat4x4f,
  time: f32,
  gridSize: f32,
  rows: f32,
  cols: f32,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;

struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) uv: vec2f,
}

@vertex
fn vertexMain(@builtin(vertex_index) vertexIndex: u32) -> VertexOutput {
  let rows = uniforms.rows;
  let cols = uniforms.cols;
  let size = uniforms.gridSize;

  var quad = array<vec2f, 6>(
    vec2f(0.0, 0.0), vec2f(cols, 0.0), vec2f(cols, rows),
    vec2f(0.0, 0.0), vec2f(cols, rows), vec2f(0.0, rows)
  );

  let pos = quad[vertexIndex] * size;

  var output: VertexOutput;
  output.position = uniforms.viewProjection * vec4f(pos, -0.1, 1.0);
  output.uv = quad[vertexIndex] / vec2f(cols, rows);
  return output;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  let uv = input.uv;
  let time = uniforms.time;

  // 格子線
  let gridUV = fract(uv * vec2f(uniforms.cols, uniforms.rows));
  let lineWidth = 0.03;
  let lineX = smoothstep(lineWidth, 0.0, gridUV.x) + smoothstep(1.0 - lineWidth, 1.0, gridUV.x);
  let lineY = smoothstep(lineWidth, 0.0, gridUV.y) + smoothstep(1.0 - lineWidth, 1.0, gridUV.y);
  let line = max(lineX, lineY);

  // 漸變顏色的格線
  let lineColor = vec3f(0.4, 0.2, 0.6) + vec3f(0.1, 0.05, 0.1) * sin(time * 2.0);

  // 格子底色 (半透明深紫)
  let cellColor = vec3f(0.05, 0.02, 0.1);

  let color = mix(cellColor, lineColor, line * 0.5);

  // 邊緣發光
  let edgeDist = min(min(uv.x, 1.0 - uv.x), min(uv.y, 1.0 - uv.y));
  let edgeGlow = smoothstep(0.1, 0.0, edgeDist);
  color += vec3f(0.5, 0.3, 0.7) * edgeGlow * 0.3;

  return vec4f(color, 0.6);
}
`;

// 粒子著色器
export const particleShader = /* wgsl */`
struct Uniforms {
  viewProjection: mat4x4f,
  time: f32,
  padding: vec3f,
}

struct Particle {
  position: vec3f,
  life: f32,
  velocity: vec3f,
  maxLife: f32,
  color: vec4f,
  size: f32,
  particleType: f32,
  rotation: f32,
  padding: f32,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;
@group(0) @binding(1) var<storage, read> particles: array<Particle>;

struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) uv: vec2f,
  @location(1) color: vec4f,
  @location(2) particleType: f32,
}

@vertex
fn vertexMain(
  @builtin(vertex_index) vertexIndex: u32,
  @builtin(instance_index) instanceIndex: u32
) -> VertexOutput {
  var quad = array<vec2f, 6>(
    vec2f(-0.5, -0.5), vec2f(0.5, -0.5), vec2f(0.5, 0.5),
    vec2f(-0.5, -0.5), vec2f(0.5, 0.5), vec2f(-0.5, 0.5)
  );

  let p = particles[instanceIndex];
  let localPos = quad[vertexIndex];

  // 旋轉
  let c = cos(p.rotation);
  let s = sin(p.rotation);
  let rotated = vec2f(
    localPos.x * c - localPos.y * s,
    localPos.x * s + localPos.y * c
  );

  let worldPos = p.position.xy + rotated * p.size;
  let lifeRatio = p.life / p.maxLife;

  var output: VertexOutput;
  output.position = uniforms.viewProjection * vec4f(worldPos, p.position.z, 1.0);
  output.uv = localPos + 0.5;
  output.color = vec4f(p.color.rgb, p.color.a * lifeRatio);
  output.particleType = p.particleType;

  return output;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  let uv = input.uv;
  let center = uv - 0.5;
  let dist = length(center);
  let pType = i32(input.particleType);

  var alpha = input.color.a;
  var color = input.color.rgb;

  if (pType == 0) {
    // 水晶碎片
    let facet = abs(sin(atan2(center.y, center.x) * 4.0));
    alpha *= smoothstep(0.5, 0.2, dist) * (0.7 + facet * 0.3);
  } else if (pType == 1) {
    // 閃光星
    let star = max(
      smoothstep(0.5, 0.0, abs(center.x) + abs(center.y) * 5.0),
      smoothstep(0.5, 0.0, abs(center.y) + abs(center.x) * 5.0)
    );
    alpha *= star;
    color += vec3f(0.3);
  } else if (pType == 2) {
    // 圓形光點
    alpha *= smoothstep(0.5, 0.0, dist);
    color += vec3f(0.2) * (1.0 - dist * 2.0);
  } else if (pType == 3) {
    // 彩虹環
    let ring = smoothstep(0.5, 0.4, dist) - smoothstep(0.4, 0.3, dist);
    alpha *= ring;
  } else {
    // 軌跡
    alpha *= smoothstep(0.5, 0.0, dist) * 0.6;
  }

  if (alpha < 0.01) {
    discard;
  }

  return vec4f(color, alpha);
}
`;

// 進度條著色器
export const progressShader = /* wgsl */`
struct Uniforms {
  viewProjection: mat4x4f,
  progress: f32,
  time: f32,
  padding: vec2f,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;

struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) uv: vec2f,
}

@vertex
fn vertexMain(@builtin(vertex_index) vertexIndex: u32) -> VertexOutput {
  var quad = array<vec2f, 6>(
    vec2f(0.0, 0.0), vec2f(1.0, 0.0), vec2f(1.0, 1.0),
    vec2f(0.0, 0.0), vec2f(1.0, 1.0), vec2f(0.0, 1.0)
  );

  let pos = quad[vertexIndex];

  var output: VertexOutput;
  output.position = uniforms.viewProjection * vec4f(pos.x * 8.0, -0.8 + pos.y * 0.3, 0.0, 1.0);
  output.uv = pos;
  return output;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  let uv = input.uv;
  let progress = uniforms.progress;
  let time = uniforms.time;

  // 背景
  var color = vec3f(0.1, 0.05, 0.15);

  // 進度條
  if (uv.x < progress) {
    // 金色漸變
    let gold1 = vec3f(1.0, 0.85, 0.2);
    let gold2 = vec3f(0.95, 0.6, 0.1);
    color = mix(gold2, gold1, uv.y);

    // 流動光效
    let flow = sin(uv.x * 20.0 - time * 5.0) * 0.5 + 0.5;
    color += vec3f(0.2, 0.15, 0.0) * flow * uv.y;

    // 邊緣高光
    let edgeY = smoothstep(0.0, 0.2, uv.y) * smoothstep(1.0, 0.8, uv.y);
    color += vec3f(0.3) * (1.0 - edgeY) * 0.3;
  }

  // 邊框
  let border = 0.05;
  let inBorder = uv.x < border || uv.x > 1.0 - border || uv.y < border || uv.y > 1.0 - border;
  if (inBorder) {
    color = vec3f(0.5, 0.3, 0.6);
  }

  return vec4f(color, 0.9);
}
`;

// 分數彈出著色器
export const scorePopShader = /* wgsl */`
struct Uniforms {
  viewProjection: mat4x4f,
  time: f32,
  padding: vec3f,
}

struct ScorePop {
  position: vec2f,
  value: f32,
  life: f32,
  maxLife: f32,
  padding: vec3f,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;
@group(0) @binding(1) var<storage, read> scores: array<ScorePop>;

struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) uv: vec2f,
  @location(1) alpha: f32,
  @location(2) value: f32,
}

@vertex
fn vertexMain(
  @builtin(vertex_index) vertexIndex: u32,
  @builtin(instance_index) instanceIndex: u32
) -> VertexOutput {
  var quad = array<vec2f, 6>(
    vec2f(-0.5, -0.5), vec2f(0.5, -0.5), vec2f(0.5, 0.5),
    vec2f(-0.5, -0.5), vec2f(0.5, 0.5), vec2f(-0.5, 0.5)
  );

  let score = scores[instanceIndex];
  let lifeRatio = score.life / score.maxLife;
  let rise = (1.0 - lifeRatio) * 1.5;
  let size = 0.8 * (0.5 + lifeRatio * 0.5);

  let worldPos = score.position + vec2f(0.0, rise) + quad[vertexIndex] * size;

  var output: VertexOutput;
  output.position = uniforms.viewProjection * vec4f(worldPos, 0.5, 1.0);
  output.uv = quad[vertexIndex] + 0.5;
  output.alpha = lifeRatio;
  output.value = score.value;

  return output;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  let uv = input.uv;
  let center = uv - 0.5;
  let dist = length(center);

  // 圓形光暈
  let glow = smoothstep(0.5, 0.0, dist);

  // 金色發光
  let color = vec3f(1.0, 0.9, 0.3) * glow;

  return vec4f(color, glow * input.alpha);
}
`;

// 連擊特效著色器
export const comboShader = /* wgsl */`
struct Uniforms {
  viewProjection: mat4x4f,
  comboCount: f32,
  time: f32,
  padding: vec2f,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;

struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) uv: vec2f,
}

@vertex
fn vertexMain(@builtin(vertex_index) vertexIndex: u32) -> VertexOutput {
  var quad = array<vec2f, 6>(
    vec2f(-1.0, -0.15), vec2f(1.0, -0.15), vec2f(1.0, 0.15),
    vec2f(-1.0, -0.15), vec2f(1.0, 0.15), vec2f(-1.0, 0.15)
  );

  let pos = quad[vertexIndex];
  let scale = 1.0 + sin(uniforms.time * 5.0) * 0.05;

  var output: VertexOutput;
  output.position = uniforms.viewProjection * vec4f(pos.x * 3.0 * scale + 4.0, pos.y * scale + 4.5, 0.5, 1.0);
  output.uv = pos * 0.5 + 0.5;
  return output;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  let uv = input.uv;
  let time = uniforms.time;
  let combo = uniforms.comboCount;

  if (combo < 2.0) {
    discard;
  }

  // 火焰漸變
  let fireColor1 = vec3f(1.0, 0.3, 0.0);
  let fireColor2 = vec3f(1.0, 0.8, 0.0);
  let fireColor3 = vec3f(1.0, 1.0, 0.8);

  let gradient = uv.y;
  var color = mix(fireColor1, fireColor2, gradient);
  color = mix(color, fireColor3, pow(gradient, 2.0));

  // 邊緣淡出
  let edgeX = smoothstep(0.0, 0.2, uv.x) * smoothstep(1.0, 0.8, uv.x);
  let edgeY = smoothstep(0.0, 0.3, uv.y) * smoothstep(1.0, 0.7, uv.y);
  let alpha = edgeX * edgeY;

  // 連擊越高越亮
  let intensity = min(combo / 10.0, 1.0);
  color *= 0.5 + intensity * 0.5;

  return vec4f(color, alpha * 0.8);
}
`;
