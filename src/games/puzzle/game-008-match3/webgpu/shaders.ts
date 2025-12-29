/**
 * WGSL 著色器 - 三消遊戲
 * WebGPU Shaders for Match-3
 */

// 棋盤背景著色器
export const boardShader = /* wgsl */`
struct Uniforms {
  viewProj: mat4x4<f32>,
  time: f32,
  gridSize: f32,
  rows: f32,
  cols: f32,
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
  let cellX = floor(in.uv.x * u.cols);
  let cellY = floor(in.uv.y * u.rows);
  let localUV = fract(vec2<f32>(in.uv.x * u.cols, in.uv.y * u.rows));

  // 基礎顏色 - 深色棋盤格
  let checker = (i32(cellX) + i32(cellY)) % 2;
  var baseColor = select(vec3<f32>(0.08, 0.08, 0.15), vec3<f32>(0.1, 0.1, 0.18), checker == 0);

  // 賽博朋克網格線
  let gridLine = smoothstep(0.02, 0.0, localUV.x) + smoothstep(0.98, 1.0, localUV.x) +
                 smoothstep(0.02, 0.0, localUV.y) + smoothstep(0.98, 1.0, localUV.y);
  let gridGlow = vec3<f32>(0.0, 0.8, 1.0) * gridLine * 0.3;

  // 角落霓虹燈效果
  let cornerDist = min(min(localUV.x, 1.0 - localUV.x), min(localUV.y, 1.0 - localUV.y));
  let cornerGlow = smoothstep(0.15, 0.0, cornerDist) * 0.2;
  let neonColor = vec3<f32>(1.0, 0.0, 0.8) * cornerGlow;

  // 整體發光脈衝
  let pulse = sin(u.time * 2.0 + cellX * 0.5 + cellY * 0.3) * 0.5 + 0.5;
  let ambientGlow = vec3<f32>(0.0, 0.5, 1.0) * pulse * 0.05;

  let finalColor = baseColor + gridGlow + neonColor + ambientGlow;
  return vec4<f32>(finalColor, 1.0);
}
`;

// 寶石著色器 - 3D 立方寶石
export const gemShader = /* wgsl */`
struct Uniforms {
  viewProj: mat4x4<f32>,
  time: f32,
  _pad1: f32,
  _pad2: f32,
  _pad3: f32,
}

struct GemInstance {
  modelMatrix: mat4x4<f32>,
  color: vec4<f32>,
  state: vec4<f32>, // x: selected, y: matched, z: scale, w: alpha
}

@group(0) @binding(0) var<uniform> u: Uniforms;
@group(0) @binding(1) var<storage, read> gems: array<GemInstance>;

struct VertexOutput {
  @builtin(position) position: vec4<f32>,
  @location(0) normal: vec3<f32>,
  @location(1) worldPos: vec3<f32>,
  @location(2) color: vec4<f32>,
  @location(3) state: vec4<f32>,
  @location(4) localPos: vec3<f32>,
}

@vertex
fn vs_main(
  @location(0) pos: vec3<f32>,
  @location(1) normal: vec3<f32>,
  @builtin(instance_index) instanceIdx: u32
) -> VertexOutput {
  let gem = gems[instanceIdx];
  var out: VertexOutput;

  // 應用縮放
  let scaledPos = pos * gem.state.z;
  let worldPos = (gem.modelMatrix * vec4<f32>(scaledPos, 1.0)).xyz;

  out.position = u.viewProj * vec4<f32>(worldPos, 1.0);
  out.normal = (gem.modelMatrix * vec4<f32>(normal, 0.0)).xyz;
  out.worldPos = worldPos;
  out.color = gem.color;
  out.state = gem.state;
  out.localPos = pos;
  return out;
}

@fragment
fn fs_main(in: VertexOutput) -> @location(0) vec4<f32> {
  let n = normalize(in.normal);
  let lightDir = normalize(vec3<f32>(0.5, 1.0, 0.8));
  let viewDir = normalize(vec3<f32>(0.0, 5.0, 8.0) - in.worldPos);

  // 菲涅爾效果
  let fresnel = pow(1.0 - max(dot(n, viewDir), 0.0), 3.0);

  // 漫反射
  let diff = max(dot(n, lightDir), 0.0) * 0.6 + 0.4;

  // 高光
  let halfVec = normalize(lightDir + viewDir);
  let spec = pow(max(dot(n, halfVec), 0.0), 64.0);

  // 基礎顏色
  var color = in.color.rgb * diff;

  // 霓虹發光效果
  let glowIntensity = 0.3 + sin(u.time * 3.0) * 0.1;
  let neonGlow = in.color.rgb * glowIntensity;

  // 選中效果 - 脈衝邊緣發光
  if (in.state.x > 0.5) {
    let pulse = sin(u.time * 8.0) * 0.5 + 0.5;
    let edgeDist = max(abs(in.localPos.x), max(abs(in.localPos.y), abs(in.localPos.z)));
    let edge = smoothstep(0.4, 0.5, edgeDist);
    color += vec3<f32>(1.0, 1.0, 1.0) * edge * pulse * 0.8;
  }

  // 消除效果 - 閃爍
  if (in.state.y > 0.5) {
    let flash = sin(u.time * 20.0) * 0.5 + 0.5;
    color = mix(color, vec3<f32>(1.0, 1.0, 1.0), flash * 0.7);
  }

  // 組合
  color += neonGlow * fresnel;
  color += vec3<f32>(1.0) * spec * 0.5;

  // 邊緣發光
  color += in.color.rgb * fresnel * 0.4;

  return vec4<f32>(color, in.state.w);
}
`;

// 寶石形狀著色器 - 多面體
export const gemFacetShader = /* wgsl */`
struct Uniforms {
  viewProj: mat4x4<f32>,
  time: f32,
  _pad1: f32,
  _pad2: f32,
  _pad3: f32,
}

struct GemInstance {
  modelMatrix: mat4x4<f32>,
  color: vec4<f32>,
  state: vec4<f32>,
}

@group(0) @binding(0) var<uniform> u: Uniforms;
@group(0) @binding(1) var<storage, read> gems: array<GemInstance>;

struct VertexOutput {
  @builtin(position) position: vec4<f32>,
  @location(0) normal: vec3<f32>,
  @location(1) worldPos: vec3<f32>,
  @location(2) color: vec4<f32>,
  @location(3) state: vec4<f32>,
  @location(4) facetNormal: vec3<f32>,
}

@vertex
fn vs_main(
  @location(0) pos: vec3<f32>,
  @location(1) normal: vec3<f32>,
  @builtin(instance_index) instanceIdx: u32
) -> VertexOutput {
  let gem = gems[instanceIdx];
  var out: VertexOutput;

  let scaledPos = pos * gem.state.z;
  let worldPos = (gem.modelMatrix * vec4<f32>(scaledPos, 1.0)).xyz;

  out.position = u.viewProj * vec4<f32>(worldPos, 1.0);
  out.normal = normalize((gem.modelMatrix * vec4<f32>(normal, 0.0)).xyz);
  out.worldPos = worldPos;
  out.color = gem.color;
  out.state = gem.state;
  out.facetNormal = normal;
  return out;
}

@fragment
fn fs_main(in: VertexOutput) -> @location(0) vec4<f32> {
  let n = normalize(in.normal);
  let lightDir = normalize(vec3<f32>(0.3, 1.0, 0.5));
  let viewDir = normalize(vec3<f32>(0.0, 5.0, 8.0) - in.worldPos);

  // 多重光源
  let light2 = normalize(vec3<f32>(-0.5, 0.5, 0.3));
  let light3 = normalize(vec3<f32>(0.0, -0.3, 1.0));

  // 漫反射
  let diff1 = max(dot(n, lightDir), 0.0);
  let diff2 = max(dot(n, light2), 0.0) * 0.3;
  let diff3 = max(dot(n, light3), 0.0) * 0.2;
  let diff = diff1 + diff2 + diff3;

  // 高光
  let halfVec = normalize(lightDir + viewDir);
  let spec = pow(max(dot(n, halfVec), 0.0), 128.0);

  // 折射/彩虹效果
  let facetAngle = dot(in.facetNormal, vec3<f32>(1.0, 1.0, 1.0));
  let rainbow = sin(facetAngle * 10.0 + u.time * 2.0) * 0.1;

  // 基礎顏色
  var color = in.color.rgb * (0.4 + diff * 0.6);

  // 折射彩虹
  color += vec3<f32>(rainbow, rainbow * 0.5, -rainbow) * 0.3;

  // 高光
  color += vec3<f32>(1.0) * spec * 0.8;

  // 邊緣發光
  let fresnel = pow(1.0 - max(dot(n, viewDir), 0.0), 4.0);
  color += in.color.rgb * fresnel * 0.5;

  // 選中狀態
  if (in.state.x > 0.5) {
    let pulse = sin(u.time * 6.0) * 0.5 + 0.5;
    color += vec3<f32>(1.0, 1.0, 1.0) * pulse * 0.3;
  }

  // 消除閃爍
  if (in.state.y > 0.5) {
    let flash = sin(u.time * 15.0) * 0.5 + 0.5;
    color = mix(color, vec3<f32>(1.0), flash * 0.8);
  }

  return vec4<f32>(color, in.state.w);
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
  type_rotation: vec4<f32>, // x: type, y: rotation, z: rotSpeed, w: maxLife
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

  // 廣告牌效果
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

  // 不同粒子類型
  if (particleType == 0) {
    // 星星粒子
    let angle = atan2(in.uv.y - 0.5, in.uv.x - 0.5);
    let star = abs(sin(angle * 4.0 + u.time * 5.0));
    alpha = smoothstep(1.0, 0.3, dist) * star;
    color *= 1.0 + star * 0.5;
  } else if (particleType == 1) {
    // 爆炸粒子
    alpha = smoothstep(1.0, 0.0, dist);
    let ring = smoothstep(0.6, 0.5, dist) * smoothstep(0.3, 0.4, dist);
    color += ring * vec3<f32>(1.0, 0.5, 0.0);
  } else if (particleType == 2) {
    // 軌跡粒子
    let trail = smoothstep(1.0, 0.0, dist) * lifeRatio;
    alpha = trail;
  } else if (particleType == 3) {
    // 連擊粒子
    let flash = sin(u.time * 20.0) * 0.5 + 0.5;
    alpha = smoothstep(1.0, 0.0, dist) * (0.7 + flash * 0.3);
    color = mix(color, vec3<f32>(1.0), flash * 0.5);
  } else {
    // 默認圓形
    alpha = smoothstep(1.0, 0.0, dist);
  }

  alpha *= lifeRatio * in.color.a;

  return vec4<f32>(color, alpha);
}
`;

// 連擊特效著色器
export const comboShader = /* wgsl */`
struct Uniforms {
  viewProj: mat4x4<f32>,
  time: f32,
  comboLevel: f32,
  centerX: f32,
  centerY: f32,
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
  let center = vec2<f32>(u.centerX, u.centerY);
  let dist = distance(in.uv, center);

  // 連擊波紋
  let waveCount = u.comboLevel;
  var totalAlpha = 0.0;
  var color = vec3<f32>(0.0);

  for (var i = 0.0; i < 5.0; i += 1.0) {
    if (i >= waveCount) { break; }
    let waveTime = u.time * (2.0 + i * 0.5);
    let waveRadius = fract(waveTime) * 0.5;
    let waveWidth = 0.05;
    let wave = smoothstep(waveRadius + waveWidth, waveRadius, dist) *
               smoothstep(waveRadius - waveWidth, waveRadius, dist);

    // 彩虹色
    let hue = i / 5.0 + u.time * 0.2;
    let waveColor = vec3<f32>(
      sin(hue * 6.28) * 0.5 + 0.5,
      sin(hue * 6.28 + 2.09) * 0.5 + 0.5,
      sin(hue * 6.28 + 4.18) * 0.5 + 0.5
    );

    color += waveColor * wave;
    totalAlpha += wave;
  }

  return vec4<f32>(color, min(totalAlpha, 1.0) * 0.6);
}
`;

// 時間條著色器
export const timerBarShader = /* wgsl */`
struct Uniforms {
  viewProj: mat4x4<f32>,
  time: f32,
  progress: f32, // 0-1 剩餘時間比例
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
  // 背景
  let bgColor = vec3<f32>(0.1, 0.1, 0.15);

  // 進度條
  let filled = step(in.uv.x, u.progress);

  // 漸變色 - 綠到紅
  let hue = u.progress * 0.35; // 綠=0.35, 紅=0
  let barColor = vec3<f32>(
    sin(hue * 6.28 + 4.18) * 0.5 + 0.5,
    sin(hue * 6.28 + 2.09) * 0.5 + 0.5,
    sin(hue * 6.28) * 0.5 + 0.5
  );

  // 脈衝效果（低時間時）
  var pulse = 1.0;
  if (u.progress < 0.3) {
    pulse = 0.7 + sin(u.time * 10.0) * 0.3;
  }

  // 發光邊緣
  let edgeGlow = smoothstep(0.0, 0.1, in.uv.y) * smoothstep(1.0, 0.9, in.uv.y);

  // 移動的光條
  let scanline = sin((in.uv.x - u.time * 0.5) * 30.0) * 0.1 + 0.9;

  var color = mix(bgColor, barColor * pulse * scanline, filled);
  color *= edgeGlow;

  // 邊框發光
  let border = smoothstep(0.02, 0.0, in.uv.y) + smoothstep(0.98, 1.0, in.uv.y);
  color += vec3<f32>(0.0, 0.8, 1.0) * border * 0.5;

  return vec4<f32>(color, 1.0);
}
`;

// 分數飄字著色器
export const scorePopShader = /* wgsl */`
struct Uniforms {
  viewProj: mat4x4<f32>,
  time: f32,
  _pad1: f32,
  _pad2: f32,
  _pad3: f32,
}

struct ScorePop {
  position: vec3<f32>,
  value: f32,
  startTime: f32,
  duration: f32,
  color: vec4<f32>,
}

@group(0) @binding(0) var<uniform> u: Uniforms;
@group(0) @binding(1) var<storage, read> pops: array<ScorePop>;

struct VertexOutput {
  @builtin(position) position: vec4<f32>,
  @location(0) uv: vec2<f32>,
  @location(1) color: vec4<f32>,
  @location(2) life: f32,
}

@vertex
fn vs_main(
  @location(0) quadPos: vec2<f32>,
  @builtin(instance_index) instanceIdx: u32
) -> VertexOutput {
  let pop = pops[instanceIdx];
  var out: VertexOutput;

  let elapsed = u.time - pop.startTime;
  let life = 1.0 - elapsed / pop.duration;

  // 上升動畫
  let rise = elapsed * 2.0;
  let pos = pop.position + vec3<f32>(0.0, rise, 0.0);

  // 縮放
  let scale = 0.3 + sin(life * 3.14159) * 0.1;
  let worldPos = pos + vec3<f32>(quadPos * scale, 0.0);

  out.position = u.viewProj * vec4<f32>(worldPos, 1.0);
  out.uv = quadPos * 0.5 + 0.5;
  out.color = pop.color;
  out.life = max(life, 0.0);
  return out;
}

@fragment
fn fs_main(in: VertexOutput) -> @location(0) vec4<f32> {
  // 簡單圓形
  let dist = distance(in.uv, vec2<f32>(0.5));
  let alpha = smoothstep(0.5, 0.3, dist) * in.life;

  // 發光
  let glow = in.color.rgb * (1.0 + (1.0 - in.life) * 0.5);

  return vec4<f32>(glow, alpha * in.color.a);
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
  // 深空背景
  var color = vec3<f32>(0.02, 0.02, 0.05);

  // 移動星星
  let starLayer1 = fract(in.uv * 50.0 + u.time * 0.02);
  let star1 = smoothstep(0.98, 1.0, max(starLayer1.x, starLayer1.y));

  let starLayer2 = fract(in.uv * 80.0 - u.time * 0.01);
  let star2 = smoothstep(0.99, 1.0, max(starLayer2.x, starLayer2.y));

  color += vec3<f32>(1.0, 1.0, 1.0) * star1 * 0.3;
  color += vec3<f32>(0.5, 0.8, 1.0) * star2 * 0.5;

  // 霓虹漸層
  let gradient = sin(in.uv.y * 3.14159 + u.time * 0.5) * 0.5 + 0.5;
  color += vec3<f32>(0.0, 0.1, 0.2) * gradient * 0.3;

  // 邊緣暗角
  let vignette = 1.0 - length(in.uv - 0.5) * 0.8;
  color *= vignette;

  return vec4<f32>(color, 1.0);
}
`;
