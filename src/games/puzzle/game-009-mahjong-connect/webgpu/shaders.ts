/**
 * WGSL 著色器 - 麻將連連看
 * WebGPU Shaders for Mahjong Connect
 */

// 棋盤背景著色器
export const boardShader = /* wgsl */`
struct Uniforms {
  viewProj: mat4x4<f32>,
  time: f32,
  rows: f32,
  cols: f32,
  _pad: f32,
}

@group(0) @binding(0) var<uniform> u: Uniforms;

struct VertexOutput {
  @builtin(position) position: vec4<f32>,
  @location(0) uv: vec2<f32>,
  @location(1) worldPos: vec3<f32>,
}

@vertex
fn vs_main(@location(0) pos: vec3<f32>, @location(1) uv: vec2<f32>) -> VertexOutput {
  var out: VertexOutput;
  out.position = u.viewProj * vec4<f32>(pos, 1.0);
  out.uv = uv;
  out.worldPos = pos;
  return out;
}

@fragment
fn fs_main(in: VertexOutput) -> @location(0) vec4<f32> {
  // 竹蓆紋理背景
  let bambooU = fract(in.uv.x * u.cols * 2.0);
  let bambooV = fract(in.uv.y * u.rows * 2.0);

  // 竹條顏色
  let bamboo1 = vec3<f32>(0.15, 0.25, 0.12);
  let bamboo2 = vec3<f32>(0.12, 0.2, 0.1);

  let stripe = step(0.5, bambooU);
  var baseColor = mix(bamboo1, bamboo2, stripe);

  // 節點效果
  let nodeY = abs(sin(in.uv.y * u.rows * 6.28)) * 0.3;
  baseColor += vec3<f32>(0.02) * nodeY;

  // 格子邊框
  let cellU = fract(in.uv.x * (u.cols + 2.0));
  let cellV = fract(in.uv.y * (u.rows + 2.0));
  let border = smoothstep(0.02, 0.0, cellU) + smoothstep(0.98, 1.0, cellU) +
               smoothstep(0.02, 0.0, cellV) + smoothstep(0.98, 1.0, cellV);
  baseColor += vec3<f32>(0.0, 0.3, 0.2) * border * 0.3;

  // 霓虹邊緣
  let edgeGlow = smoothstep(0.1, 0.0, in.uv.x) + smoothstep(0.9, 1.0, in.uv.x) +
                 smoothstep(0.1, 0.0, in.uv.y) + smoothstep(0.9, 1.0, in.uv.y);
  baseColor += vec3<f32>(0.0, 1.0, 0.5) * edgeGlow * 0.1;

  return vec4<f32>(baseColor, 1.0);
}
`;

// 麻將牌著色器
export const tileShader = /* wgsl */`
struct Uniforms {
  viewProj: mat4x4<f32>,
  time: f32,
  _pad1: f32,
  _pad2: f32,
  _pad3: f32,
}

struct TileInstance {
  modelMatrix: mat4x4<f32>,
  color: vec4<f32>,       // 牌面主色
  state: vec4<f32>,       // x: selected, y: matched, z: hovered, w: tileType
}

@group(0) @binding(0) var<uniform> u: Uniforms;
@group(0) @binding(1) var<storage, read> tiles: array<TileInstance>;

struct VertexOutput {
  @builtin(position) position: vec4<f32>,
  @location(0) normal: vec3<f32>,
  @location(1) worldPos: vec3<f32>,
  @location(2) localPos: vec3<f32>,
  @location(3) color: vec4<f32>,
  @location(4) state: vec4<f32>,
}

@vertex
fn vs_main(
  @location(0) pos: vec3<f32>,
  @location(1) normal: vec3<f32>,
  @builtin(instance_index) instanceIdx: u32
) -> VertexOutput {
  let tile = tiles[instanceIdx];
  var out: VertexOutput;

  // 選中時輕微上升
  var adjustedPos = pos;
  if (tile.state.x > 0.5) {
    adjustedPos.y += 0.05;
  }

  let worldPos = (tile.modelMatrix * vec4<f32>(adjustedPos, 1.0)).xyz;
  out.position = u.viewProj * vec4<f32>(worldPos, 1.0);
  out.normal = normalize((tile.modelMatrix * vec4<f32>(normal, 0.0)).xyz);
  out.worldPos = worldPos;
  out.localPos = pos;
  out.color = tile.color;
  out.state = tile.state;
  return out;
}

@fragment
fn fs_main(in: VertexOutput) -> @location(0) vec4<f32> {
  let n = normalize(in.normal);
  let lightDir = normalize(vec3<f32>(0.3, 1.0, 0.5));
  let viewDir = normalize(vec3<f32>(0.0, 8.0, 10.0) - in.worldPos);

  // 基礎光照
  let diff = max(dot(n, lightDir), 0.0) * 0.6 + 0.4;

  // 高光
  let halfVec = normalize(lightDir + viewDir);
  let spec = pow(max(dot(n, halfVec), 0.0), 32.0);

  // 麻將牌基礎顏色 - 象牙白
  var baseColor = vec3<f32>(0.95, 0.93, 0.88);

  // 牌面紋理效果
  let faceGlow = smoothstep(0.3, 0.0, abs(in.localPos.y - 0.15));
  baseColor = mix(baseColor, in.color.rgb, faceGlow * 0.3);

  // 邊緣深色
  let edgeDark = max(abs(in.localPos.x), abs(in.localPos.z)) / 0.45;
  baseColor *= 1.0 - edgeDark * 0.1;

  // 漸層陰影 (底部較深)
  baseColor *= 0.9 + in.localPos.y * 0.2;

  // 選中效果 - 金色發光邊緣
  if (in.state.x > 0.5) {
    let pulse = sin(u.time * 6.0) * 0.5 + 0.5;
    let edge = smoothstep(0.35, 0.45, max(abs(in.localPos.x), abs(in.localPos.z)));
    baseColor += vec3<f32>(1.0, 0.8, 0.0) * edge * pulse * 0.5;
    baseColor += vec3<f32>(1.0, 0.9, 0.5) * 0.1;
  }

  // 消除動畫效果
  if (in.state.y > 0.5) {
    let flash = sin(u.time * 20.0) * 0.5 + 0.5;
    baseColor = mix(baseColor, vec3<f32>(1.0, 1.0, 1.0), flash * 0.8);
  }

  // 懸停效果
  if (in.state.z > 0.5) {
    baseColor += vec3<f32>(0.1, 0.15, 0.1);
  }

  // 組合光照
  var color = baseColor * diff;
  color += vec3<f32>(1.0) * spec * 0.3;

  // 菲涅爾邊緣光
  let fresnel = pow(1.0 - max(dot(n, viewDir), 0.0), 3.0);
  color += vec3<f32>(0.5, 0.8, 0.6) * fresnel * 0.2;

  return vec4<f32>(color, 1.0);
}
`;

// 連線路徑著色器
export const pathShader = /* wgsl */`
struct Uniforms {
  viewProj: mat4x4<f32>,
  time: f32,
  pathLength: f32,
  _pad1: f32,
  _pad2: f32,
}

@group(0) @binding(0) var<uniform> u: Uniforms;

struct VertexOutput {
  @builtin(position) position: vec4<f32>,
  @location(0) uv: vec2<f32>,
  @location(1) progress: f32,
}

@vertex
fn vs_main(
  @location(0) pos: vec3<f32>,
  @location(1) uv: vec2<f32>,
  @location(2) progress: f32
) -> VertexOutput {
  var out: VertexOutput;
  out.position = u.viewProj * vec4<f32>(pos, 1.0);
  out.uv = uv;
  out.progress = progress;
  return out;
}

@fragment
fn fs_main(in: VertexOutput) -> @location(0) vec4<f32> {
  // 霓虹發光線
  let centerDist = abs(in.uv.y - 0.5) * 2.0;

  // 核心線
  let core = smoothstep(0.3, 0.0, centerDist);

  // 外層光暈
  let glow = smoothstep(1.0, 0.0, centerDist) * 0.5;

  // 流動動畫
  let flow = sin((in.progress - u.time * 2.0) * 10.0) * 0.5 + 0.5;

  // 顏色 - 青色到綠色
  let color1 = vec3<f32>(0.0, 1.0, 0.8);
  let color2 = vec3<f32>(0.2, 1.0, 0.4);
  let color = mix(color1, color2, flow);

  let alpha = (core + glow) * (0.7 + flow * 0.3);

  // 端點淡出
  let fadeIn = smoothstep(0.0, 0.1, in.progress);
  let fadeOut = smoothstep(1.0, 0.9, in.progress);

  return vec4<f32>(color, alpha * fadeIn * fadeOut);
}
`;

// 粒子著色器
export const particleShader = /* wgsl */`
struct Uniforms {
  viewProj: mat4x4<f32>,
  time: f32,
  _pad1: f32,
  _pad2: f32,
  _pad3: f32,
}

struct Particle {
  position: vec3<f32>,
  life: f32,
  velocity: vec3<f32>,
  size: f32,
  color: vec4<f32>,
  type_rotation: vec4<f32>,
}

@group(0) @binding(0) var<uniform> u: Uniforms;
@group(0) @binding(1) var<storage, read> particles: array<Particle>;

struct VertexOutput {
  @builtin(position) position: vec4<f32>,
  @location(0) uv: vec2<f32>,
  @location(1) color: vec4<f32>,
  @location(2) type_life: vec2<f32>,
}

@vertex
fn vs_main(
  @location(0) quadPos: vec2<f32>,
  @builtin(instance_index) instanceIdx: u32
) -> VertexOutput {
  let p = particles[instanceIdx];
  var out: VertexOutput;

  // 廣告牌旋轉
  let rot = p.type_rotation.y;
  let c = cos(rot);
  let s = sin(rot);
  let rotatedQuad = vec2<f32>(
    quadPos.x * c - quadPos.y * s,
    quadPos.x * s + quadPos.y * c
  );

  let right = vec3<f32>(1.0, 0.0, 0.0) * rotatedQuad.x * p.size;
  let up = vec3<f32>(0.0, 1.0, 0.0) * rotatedQuad.y * p.size;
  let worldPos = p.position + right + up;

  out.position = u.viewProj * vec4<f32>(worldPos, 1.0);
  out.uv = quadPos * 0.5 + 0.5;
  out.color = p.color;
  out.type_life = vec2<f32>(p.type_rotation.x, p.life / p.type_rotation.w);
  return out;
}

@fragment
fn fs_main(in: VertexOutput) -> @location(0) vec4<f32> {
  let center = vec2<f32>(0.5);
  let dist = distance(in.uv, center) * 2.0;
  let particleType = i32(in.type_life.x);
  let lifeRatio = in.type_life.y;

  var alpha = 0.0;
  var color = in.color.rgb;

  if (particleType == 0) {
    // 麻將花紋粒子
    let pattern = sin(in.uv.x * 20.0) * sin(in.uv.y * 20.0);
    alpha = smoothstep(1.0, 0.3, dist) * (0.5 + pattern * 0.5);
  } else if (particleType == 1) {
    // 竹葉粒子
    let leaf = smoothstep(0.5, 0.0, abs(in.uv.x - 0.5)) *
               smoothstep(1.0, 0.5, dist);
    alpha = leaf;
    color = vec3<f32>(0.2, 0.8, 0.3);
  } else if (particleType == 2) {
    // 光點
    alpha = smoothstep(1.0, 0.0, dist);
    color *= 1.0 + (1.0 - dist) * 0.5;
  } else {
    // 默認圓形
    alpha = smoothstep(1.0, 0.0, dist);
  }

  alpha *= lifeRatio * in.color.a;

  return vec4<f32>(color, alpha);
}
`;

// 時間條著色器
export const timerShader = /* wgsl */`
struct Uniforms {
  viewProj: mat4x4<f32>,
  time: f32,
  progress: f32,
  _pad1: f32,
  _pad2: f32,
}

@group(0) @binding(0) var<uniform> u: Uniforms;

struct VertexOutput {
  @builtin(position) position: vec4<f32>,
  @location(0) uv: vec2<f32>,
}

@vertex
fn vs_main(@location(0) pos: vec3<f32>, @location(1) uv: vec2<f32>) -> VertexOutput {
  var out: VertexOutput;
  out.position = u.viewProj * vec4<f32>(pos, 1.0);
  out.uv = uv;
  return out;
}

@fragment
fn fs_main(in: VertexOutput) -> @location(0) vec4<f32> {
  let bgColor = vec3<f32>(0.1, 0.15, 0.1);
  let filled = step(in.uv.x, u.progress);

  // 顏色漸變
  let hue = u.progress * 0.35;
  let barColor = vec3<f32>(
    1.0 - u.progress,
    u.progress,
    0.3
  );

  // 低時間脈衝
  var pulse = 1.0;
  if (u.progress < 0.2) {
    pulse = 0.6 + sin(u.time * 12.0) * 0.4;
  }

  // 流動光條
  let scanline = sin((in.uv.x - u.time * 0.3) * 40.0) * 0.1 + 0.9;

  var color = mix(bgColor, barColor * pulse * scanline, filled);

  // 邊框
  let border = smoothstep(0.05, 0.0, in.uv.y) + smoothstep(0.95, 1.0, in.uv.y);
  color += vec3<f32>(0.0, 0.8, 0.4) * border * 0.4;

  return vec4<f32>(color, 1.0);
}
`;

// 背景效果著色器
export const backgroundShader = /* wgsl */`
struct Uniforms {
  resolution: vec2<f32>,
  time: f32,
  _pad: f32,
}

@group(0) @binding(0) var<uniform> u: Uniforms;

struct VertexOutput {
  @builtin(position) position: vec4<f32>,
  @location(0) uv: vec2<f32>,
}

@vertex
fn vs_main(@location(0) pos: vec2<f32>) -> VertexOutput {
  var out: VertexOutput;
  out.position = vec4<f32>(pos, 0.0, 1.0);
  out.uv = pos * 0.5 + 0.5;
  return out;
}

@fragment
fn fs_main(in: VertexOutput) -> @location(0) vec4<f32> {
  // 東方風格深色背景
  var color = vec3<f32>(0.03, 0.05, 0.04);

  // 霧氣效果
  let noise1 = sin(in.uv.x * 5.0 + u.time * 0.2) * sin(in.uv.y * 3.0 - u.time * 0.15);
  let noise2 = sin(in.uv.x * 8.0 - u.time * 0.3) * sin(in.uv.y * 6.0 + u.time * 0.25);
  let fog = (noise1 + noise2) * 0.02 + 0.02;
  color += vec3<f32>(0.0, 0.1, 0.05) * fog;

  // 竹影
  let bambooShadow = sin(in.uv.x * 30.0 + sin(u.time * 0.5) * 2.0) * 0.5 + 0.5;
  let bambooMask = smoothstep(0.7, 1.0, in.uv.y);
  color += vec3<f32>(0.0, 0.03, 0.01) * bambooShadow * bambooMask;

  // 月光效果
  let moonPos = vec2<f32>(0.8, 0.85);
  let moonDist = distance(in.uv, moonPos);
  let moonGlow = smoothstep(0.3, 0.0, moonDist) * 0.1;
  color += vec3<f32>(0.8, 0.9, 0.7) * moonGlow;

  // 暗角
  let vignette = 1.0 - length(in.uv - 0.5) * 0.6;
  color *= vignette;

  return vec4<f32>(color, 1.0);
}
`;

// 提示效果著色器
export const hintShader = /* wgsl */`
struct Uniforms {
  viewProj: mat4x4<f32>,
  time: f32,
  _pad1: f32,
  _pad2: f32,
  _pad3: f32,
}

struct HintInstance {
  position: vec4<f32>,
  size: vec4<f32>,
}

@group(0) @binding(0) var<uniform> u: Uniforms;
@group(0) @binding(1) var<storage, read> hints: array<HintInstance>;

struct VertexOutput {
  @builtin(position) position: vec4<f32>,
  @location(0) uv: vec2<f32>,
}

@vertex
fn vs_main(
  @location(0) pos: vec3<f32>,
  @builtin(instance_index) instanceIdx: u32
) -> VertexOutput {
  let hint = hints[instanceIdx];
  var out: VertexOutput;

  let worldPos = pos * hint.size.xyz + hint.position.xyz;
  out.position = u.viewProj * vec4<f32>(worldPos, 1.0);
  out.uv = pos.xz + 0.5;
  return out;
}

@fragment
fn fs_main(in: VertexOutput) -> @location(0) vec4<f32> {
  let dist = distance(in.uv, vec2<f32>(0.5));

  // 脈衝環
  let ringRadius = fract(u.time * 0.8) * 0.5;
  let ring = smoothstep(ringRadius + 0.05, ringRadius, dist) *
             smoothstep(ringRadius - 0.1, ringRadius, dist);

  // 中心發光
  let glow = smoothstep(0.5, 0.0, dist) * 0.3;

  let alpha = (ring + glow) * 0.8;
  let color = vec3<f32>(1.0, 0.8, 0.0);

  return vec4<f32>(color, alpha);
}
`;
