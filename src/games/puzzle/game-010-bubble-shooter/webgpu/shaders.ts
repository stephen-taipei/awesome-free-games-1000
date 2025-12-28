/**
 * WGSL 著色器 - 泡泡射擊
 * WebGPU Shaders for Bubble Shooter
 */

// 背景效果著色器 - 深海/宇宙風格
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

// 簡化噪聲函數
fn hash(p: vec2<f32>) -> f32 {
  return fract(sin(dot(p, vec2<f32>(127.1, 311.7))) * 43758.5453);
}

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

@fragment
fn fs_main(in: VertexOutput) -> @location(0) vec4<f32> {
  // 深海漸層背景
  var color = mix(
    vec3<f32>(0.02, 0.05, 0.15),  // 深藍
    vec3<f32>(0.05, 0.1, 0.25),   // 稍亮
    in.uv.y
  );

  // 動態波紋
  let wave1 = sin(in.uv.x * 10.0 + u.time * 0.5) * sin(in.uv.y * 8.0 - u.time * 0.3);
  let wave2 = sin(in.uv.x * 15.0 - u.time * 0.7) * sin(in.uv.y * 12.0 + u.time * 0.4);
  color += vec3<f32>(0.0, 0.02, 0.05) * (wave1 + wave2);

  // 浮動泡泡背景
  for (var i = 0; i < 8; i++) {
    let idx = f32(i);
    let bubblePos = vec2<f32>(
      fract(sin(idx * 123.45) * 0.5 + 0.5 + u.time * 0.01 * (1.0 + idx * 0.1)),
      fract(cos(idx * 67.89) * 0.5 + 0.5 + u.time * 0.02 * (1.0 + idx * 0.15))
    );
    let dist = distance(in.uv, bubblePos);
    let bubbleSize = 0.02 + idx * 0.01;
    let bubble = smoothstep(bubbleSize, bubbleSize - 0.01, dist);
    color += vec3<f32>(0.1, 0.3, 0.5) * bubble * 0.1;
  }

  // 光柱效果
  let lightRay = smoothstep(0.3, 0.0, abs(in.uv.x - 0.5 - sin(u.time * 0.2) * 0.1));
  let lightFade = smoothstep(1.0, 0.0, in.uv.y);
  color += vec3<f32>(0.1, 0.2, 0.4) * lightRay * lightFade * 0.3;

  // 粒子點綴
  let sparkle = noise(in.uv * 100.0 + u.time);
  if (sparkle > 0.97) {
    color += vec3<f32>(0.5, 0.8, 1.0) * (sparkle - 0.97) * 30.0;
  }

  // 暗角效果
  let vignette = 1.0 - length(in.uv - 0.5) * 0.8;
  color *= vignette;

  return vec4<f32>(color, 1.0);
}
`;

// 泡泡著色器 - 3D 球體效果
export const bubbleShader = /* wgsl */`
struct Uniforms {
  viewProj: mat4x4<f32>,
  time: f32,
  _pad1: f32,
  _pad2: f32,
  _pad3: f32,
}

struct BubbleInstance {
  position: vec4<f32>,     // xyz: position, w: radius
  color: vec4<f32>,        // rgb: color, a: alpha
  state: vec4<f32>,        // x: selected, y: popping, z: scale, w: type
}

@group(0) @binding(0) var<uniform> u: Uniforms;
@group(0) @binding(1) var<storage, read> bubbles: array<BubbleInstance>;

struct VertexOutput {
  @builtin(position) position: vec4<f32>,
  @location(0) localPos: vec2<f32>,
  @location(1) color: vec4<f32>,
  @location(2) state: vec4<f32>,
}

@vertex
fn vs_main(
  @location(0) quadPos: vec2<f32>,
  @builtin(instance_index) instanceIdx: u32
) -> VertexOutput {
  let bubble = bubbles[instanceIdx];
  var out: VertexOutput;

  // 廣告牌效果
  let scale = bubble.state.z * bubble.position.w;
  let right = vec3<f32>(1.0, 0.0, 0.0) * quadPos.x * scale;
  let up = vec3<f32>(0.0, 1.0, 0.0) * quadPos.y * scale;
  let worldPos = bubble.position.xyz + right + up;

  out.position = u.viewProj * vec4<f32>(worldPos, 1.0);
  out.localPos = quadPos;
  out.color = bubble.color;
  out.state = bubble.state;
  return out;
}

@fragment
fn fs_main(in: VertexOutput) -> @location(0) vec4<f32> {
  let dist = length(in.localPos);

  // 圓形裁切
  if (dist > 1.0) {
    discard;
  }

  // 3D 球體效果
  let sphereZ = sqrt(1.0 - dist * dist);
  let normal = normalize(vec3<f32>(in.localPos.x, in.localPos.y, sphereZ));

  // 光照
  let lightDir = normalize(vec3<f32>(0.3, 0.5, 1.0));
  let viewDir = vec3<f32>(0.0, 0.0, 1.0);

  let diff = max(dot(normal, lightDir), 0.0) * 0.6 + 0.4;
  let halfVec = normalize(lightDir + viewDir);
  let spec = pow(max(dot(normal, halfVec), 0.0), 64.0);

  var color = in.color.rgb * diff;

  // 高光
  color += vec3<f32>(1.0) * spec * 0.8;

  // 邊緣發光
  let fresnel = pow(1.0 - sphereZ, 2.0);
  color += in.color.rgb * fresnel * 0.3;

  // 內部反射點
  let reflectPos = vec2<f32>(-0.35, 0.35);
  let reflectDist = distance(in.localPos, reflectPos);
  let reflect = smoothstep(0.25, 0.0, reflectDist) * 0.8;
  color += vec3<f32>(1.0) * reflect;

  // 小反射點
  let reflect2Pos = vec2<f32>(-0.15, 0.5);
  let reflect2Dist = distance(in.localPos, reflect2Pos);
  let reflect2 = smoothstep(0.1, 0.0, reflect2Dist) * 0.4;
  color += vec3<f32>(1.0) * reflect2;

  // 選中效果
  if (in.state.x > 0.5) {
    let pulse = sin(u.time * 8.0) * 0.5 + 0.5;
    let ring = smoothstep(0.9, 1.0, dist);
    color += vec3<f32>(1.0, 1.0, 0.0) * ring * pulse;
    color += in.color.rgb * 0.2 * pulse;
  }

  // 爆破效果
  if (in.state.y > 0.5) {
    let flash = in.state.y;
    color = mix(color, vec3<f32>(1.0), flash * 0.5);
  }

  // 透明度 (考慮氣泡質感)
  let alpha = in.color.a * (0.85 + fresnel * 0.15);

  return vec4<f32>(color, alpha);
}
`;

// 瞄準線著色器
export const aimShader = /* wgsl */`
struct Uniforms {
  viewProj: mat4x4<f32>,
  time: f32,
  _pad1: f32,
  _pad2: f32,
  _pad3: f32,
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
  // 點狀虛線
  let dotPattern = step(0.5, fract(in.progress * 20.0 - u.time * 2.0));

  // 中心亮度
  let centerDist = abs(in.uv.y - 0.5) * 2.0;
  let core = smoothstep(1.0, 0.0, centerDist);

  // 顏色漸變
  let color = mix(
    vec3<f32>(0.0, 1.0, 1.0),   // 青色
    vec3<f32>(1.0, 1.0, 1.0),   // 白色
    core
  );

  // 淡出效果
  let fade = smoothstep(1.0, 0.3, in.progress);

  let alpha = core * dotPattern * fade * 0.8;

  return vec4<f32>(color, alpha);
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
  type_rotation: vec4<f32>,  // x: type, y: rotation, z: rotSpeed, w: maxLife
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

  // 旋轉
  let rot = p.type_rotation.y;
  let c = cos(rot);
  let s = sin(rot);
  let rotatedQuad = vec2<f32>(
    quadPos.x * c - quadPos.y * s,
    quadPos.x * s + quadPos.y * c
  );

  // 廣告牌
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
    // 爆破泡沫
    let ring = smoothstep(0.8, 1.0, dist) * smoothstep(1.0, 0.9, dist);
    let fill = smoothstep(1.0, 0.0, dist);
    alpha = (ring * 0.8 + fill * 0.3);
  } else if (particleType == 1) {
    // 光點閃爍
    alpha = smoothstep(1.0, 0.0, dist);
    let sparkle = sin(u.time * 20.0 + in.uv.x * 10.0) * 0.5 + 0.5;
    color *= 1.0 + sparkle * 0.5;
  } else if (particleType == 2) {
    // 星星
    let angle = atan2(in.uv.y - 0.5, in.uv.x - 0.5);
    let star = abs(sin(angle * 4.0)) * 0.3 + 0.7;
    alpha = smoothstep(star, 0.0, dist) * 0.8;
  } else if (particleType == 3) {
    // 彩虹環
    alpha = smoothstep(0.6, 0.8, dist) * smoothstep(1.0, 0.9, dist);
  } else {
    // 默認圓形
    alpha = smoothstep(1.0, 0.0, dist);
  }

  alpha *= lifeRatio * in.color.a;

  return vec4<f32>(color, alpha);
}
`;

// 發射器著色器
export const shooterShader = /* wgsl */`
struct Uniforms {
  viewProj: mat4x4<f32>,
  time: f32,
  angle: f32,
  _pad1: f32,
  _pad2: f32,
}

@group(0) @binding(0) var<uniform> u: Uniforms;

struct VertexOutput {
  @builtin(position) position: vec4<f32>,
  @location(0) uv: vec2<f32>,
  @location(1) worldPos: vec3<f32>,
}

@vertex
fn vs_main(
  @location(0) pos: vec3<f32>,
  @location(1) uv: vec2<f32>
) -> VertexOutput {
  var out: VertexOutput;
  out.position = u.viewProj * vec4<f32>(pos, 1.0);
  out.uv = uv;
  out.worldPos = pos;
  return out;
}

@fragment
fn fs_main(in: VertexOutput) -> @location(0) vec4<f32> {
  // 發射器底座 - 金屬質感
  var color = vec3<f32>(0.3, 0.35, 0.4);

  // 金屬漸層
  let metalGrad = in.uv.y * 0.3;
  color += vec3<f32>(metalGrad);

  // 發光環
  let ring = smoothstep(0.4, 0.5, in.uv.y) * smoothstep(0.6, 0.5, in.uv.y);
  let pulse = sin(u.time * 4.0) * 0.5 + 0.5;
  color += vec3<f32>(0.0, 0.8, 1.0) * ring * (0.5 + pulse * 0.5);

  // 邊緣高光
  let edge = smoothstep(0.9, 1.0, max(abs(in.uv.x - 0.5) * 2.0, abs(in.uv.y - 0.5) * 2.0));
  color += vec3<f32>(0.5) * edge;

  return vec4<f32>(color, 1.0);
}
`;

// 下一個泡泡預覽著色器
export const previewShader = /* wgsl */`
struct Uniforms {
  viewProj: mat4x4<f32>,
  time: f32,
  _pad1: f32,
  _pad2: f32,
  _pad3: f32,
}

struct PreviewInstance {
  position: vec4<f32>,
  color: vec4<f32>,
  state: vec4<f32>,
}

@group(0) @binding(0) var<uniform> u: Uniforms;
@group(0) @binding(1) var<storage, read> previews: array<PreviewInstance>;

struct VertexOutput {
  @builtin(position) position: vec4<f32>,
  @location(0) localPos: vec2<f32>,
  @location(1) color: vec4<f32>,
  @location(2) state: vec4<f32>,
}

@vertex
fn vs_main(
  @location(0) quadPos: vec2<f32>,
  @builtin(instance_index) instanceIdx: u32
) -> VertexOutput {
  let preview = previews[instanceIdx];
  var out: VertexOutput;

  let scale = preview.position.w * preview.state.z;
  let worldPos = preview.position.xyz + vec3<f32>(quadPos * scale, 0.0);

  out.position = u.viewProj * vec4<f32>(worldPos, 1.0);
  out.localPos = quadPos;
  out.color = preview.color;
  out.state = preview.state;
  return out;
}

@fragment
fn fs_main(in: VertexOutput) -> @location(0) vec4<f32> {
  let dist = length(in.localPos);
  if (dist > 1.0) {
    discard;
  }

  // 簡化的球體效果
  let sphereZ = sqrt(1.0 - dist * dist);
  let normal = normalize(vec3<f32>(in.localPos.x, in.localPos.y, sphereZ));
  let lightDir = normalize(vec3<f32>(0.3, 0.5, 1.0));

  let diff = max(dot(normal, lightDir), 0.0) * 0.5 + 0.5;
  var color = in.color.rgb * diff;

  // 反射點
  let reflectDist = distance(in.localPos, vec2<f32>(-0.3, 0.3));
  let reflect = smoothstep(0.2, 0.0, reflectDist) * 0.6;
  color += vec3<f32>(1.0) * reflect;

  // 脈衝效果 (待發射)
  if (in.state.x > 0.5) {
    let pulse = sin(u.time * 5.0) * 0.5 + 0.5;
    let glow = smoothstep(1.0, 0.5, dist);
    color += in.color.rgb * glow * pulse * 0.3;
  }

  return vec4<f32>(color, in.color.a * in.state.y);
}
`;

// 分數彈出著色器
export const scorePopShader = /* wgsl */`
struct Uniforms {
  viewProj: mat4x4<f32>,
  time: f32,
  _pad1: f32,
  _pad2: f32,
  _pad3: f32,
}

struct ScorePop {
  position: vec4<f32>,   // xyz: pos, w: scale
  color: vec4<f32>,
  state: vec4<f32>,      // x: life, y: maxLife, z: value, w: type
}

@group(0) @binding(0) var<uniform> u: Uniforms;
@group(0) @binding(1) var<storage, read> scores: array<ScorePop>;

struct VertexOutput {
  @builtin(position) position: vec4<f32>,
  @location(0) uv: vec2<f32>,
  @location(1) color: vec4<f32>,
  @location(2) state: vec4<f32>,
}

@vertex
fn vs_main(
  @location(0) quadPos: vec2<f32>,
  @builtin(instance_index) instanceIdx: u32
) -> VertexOutput {
  let score = scores[instanceIdx];
  var out: VertexOutput;

  let scale = score.position.w;
  let lifeRatio = score.state.x / score.state.y;
  let yOffset = (1.0 - lifeRatio) * 2.0;  // 上升

  let worldPos = score.position.xyz + vec3<f32>(quadPos.x * scale, quadPos.y * scale + yOffset, 0.0);

  out.position = u.viewProj * vec4<f32>(worldPos, 1.0);
  out.uv = quadPos * 0.5 + 0.5;
  out.color = score.color;
  out.state = score.state;
  return out;
}

@fragment
fn fs_main(in: VertexOutput) -> @location(0) vec4<f32> {
  let lifeRatio = in.state.x / in.state.y;

  // 數字紋理 (簡化為發光圓形)
  let dist = length(in.uv - 0.5) * 2.0;
  let glow = smoothstep(1.0, 0.0, dist);

  var color = in.color.rgb * (1.0 + glow * 0.5);
  let alpha = glow * lifeRatio * in.color.a;

  return vec4<f32>(color, alpha);
}
`;
