/**
 * WGSL Shaders - OneLine
 * Game #012 - Neon Circuit Cyberpunk Theme
 */

// 背景著色器 - 電路板主題
export const backgroundShader = /* wgsl */`
struct Uniforms {
  resolution: vec2f,
  time: f32,
  padding: f32,
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

fn circuitPattern(uv: vec2f, time: f32) -> f32 {
  let grid = 20.0;
  let cell = floor(uv * grid);
  let local = fract(uv * grid);

  // 隨機線條方向
  let h = hash(cell);

  var line = 0.0;

  // 水平或垂直線
  if (h < 0.3) {
    line = smoothstep(0.48, 0.5, local.y) * smoothstep(0.52, 0.5, local.y);
  } else if (h < 0.6) {
    line = smoothstep(0.48, 0.5, local.x) * smoothstep(0.52, 0.5, local.x);
  } else if (h < 0.75) {
    // L型轉角
    let corner = min(
      smoothstep(0.48, 0.5, local.y) * step(local.x, 0.5),
      smoothstep(0.48, 0.5, local.x) * step(0.5, local.y)
    );
    line = max(
      smoothstep(0.48, 0.5, local.y) * smoothstep(0.52, 0.5, local.y) * step(local.x, 0.52),
      smoothstep(0.48, 0.5, local.x) * smoothstep(0.52, 0.5, local.x) * step(0.48, local.y)
    );
  }

  // 脈動效果
  let pulse = sin(time * 2.0 + cell.x * 0.5 + cell.y * 0.3) * 0.5 + 0.5;

  return line * (0.1 + pulse * 0.05);
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  let uv = input.uv;
  let time = uniforms.time;

  // 深色電路板背景
  let baseColor = vec3f(0.02, 0.05, 0.08);

  var color = baseColor;

  // 電路圖案
  let circuit = circuitPattern(uv, time);
  color += vec3f(0.0, 0.8, 0.6) * circuit;

  // 徑向漸變
  let center = vec2f(0.5, 0.5);
  let dist = length(uv - center);
  let vignette = 1.0 - smoothstep(0.3, 0.8, dist) * 0.5;
  color *= vignette;

  // 掃描線
  let scanline = sin(uv.y * 200.0 + time * 2.0) * 0.5 + 0.5;
  color *= 0.95 + scanline * 0.05;

  // 四角光暈
  let cornerGlow = smoothstep(0.7, 0.0, length(uv - vec2f(0.0, 0.0))) * 0.15 +
                   smoothstep(0.7, 0.0, length(uv - vec2f(1.0, 0.0))) * 0.15 +
                   smoothstep(0.7, 0.0, length(uv - vec2f(0.0, 1.0))) * 0.15 +
                   smoothstep(0.7, 0.0, length(uv - vec2f(1.0, 1.0))) * 0.15;
  color += vec3f(0.0, 0.5, 0.8) * cornerGlow;

  return vec4f(color, 1.0);
}
`;

// 邊線著色器 - 未走過的邊
export const edgeShader = /* wgsl */`
struct Uniforms {
  viewProjection: mat4x4f,
  time: f32,
  lineWidth: f32,
  padding: vec2f,
}

struct EdgeInstance {
  start: vec2f,
  end: vec2f,
  visited: f32,
  padding: vec3f,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;
@group(0) @binding(1) var<storage, read> edges: array<EdgeInstance>;

struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) localPos: vec2f,
  @location(1) visited: f32,
  @location(2) edgeLength: f32,
}

@vertex
fn vertexMain(
  @builtin(vertex_index) vertexIndex: u32,
  @builtin(instance_index) instanceIndex: u32
) -> VertexOutput {
  let edge = edges[instanceIndex];

  // 計算邊的方向和法向量
  let dir = normalize(edge.end - edge.start);
  let normal = vec2f(-dir.y, dir.x);
  let len = length(edge.end - edge.start);

  // 膠囊形狀的頂點 (兩端圓角)
  var localQuad = array<vec2f, 6>(
    vec2f(0.0, -0.5), vec2f(1.0, -0.5), vec2f(1.0, 0.5),
    vec2f(0.0, -0.5), vec2f(1.0, 0.5), vec2f(0.0, 0.5)
  );

  let local = localQuad[vertexIndex];
  let width = uniforms.lineWidth;

  // 沿邊方向展開
  let worldPos = edge.start + dir * local.x * len + normal * local.y * width;

  var output: VertexOutput;
  output.position = uniforms.viewProjection * vec4f(worldPos, 0.0, 1.0);
  output.localPos = local;
  output.visited = edge.visited;
  output.edgeLength = len;

  return output;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  let local = input.localPos;
  let time = uniforms.time;

  // 計算到線中心的距離
  let distFromCenter = abs(local.y) * 2.0;

  // 邊緣柔化
  let alpha = smoothstep(1.0, 0.7, distFromCenter);

  if (input.visited > 0.5) {
    // 已走過 - 霓虹藍綠色
    let glow = 0.7 + sin(time * 3.0 + local.x * 10.0) * 0.3;
    let neonColor = vec3f(0.0, 0.9, 0.8);

    // 流動電流效果
    let flow = sin(local.x * 20.0 - time * 5.0) * 0.5 + 0.5;
    let flowColor = vec3f(0.2, 1.0, 0.9) * flow * 0.3;

    let color = neonColor * glow + flowColor;

    // 中心高亮
    let centerGlow = smoothstep(0.5, 0.0, distFromCenter);
    color += vec3f(0.3, 0.5, 0.3) * centerGlow;

    return vec4f(color, alpha);
  } else {
    // 未走過 - 暗灰色虛線
    let dash = step(0.5, fract(local.x * 10.0));
    let baseColor = vec3f(0.3, 0.35, 0.4);

    // 微弱發光
    let pulse = 0.7 + sin(time * 2.0) * 0.15;
    let color = baseColor * pulse;

    return vec4f(color, alpha * 0.6 * dash);
  }
}
`;

// 節點著色器 - 發光圓點
export const nodeShader = /* wgsl */`
struct Uniforms {
  viewProjection: mat4x4f,
  time: f32,
  nodeRadius: f32,
  padding: vec2f,
}

struct NodeInstance {
  position: vec2f,
  state: f32,  // 0=normal, 1=visited, 2=current, 3=start
  index: f32,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;
@group(0) @binding(1) var<storage, read> nodes: array<NodeInstance>;

struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) localPos: vec2f,
  @location(1) state: f32,
  @location(2) nodeIndex: f32,
}

@vertex
fn vertexMain(
  @builtin(vertex_index) vertexIndex: u32,
  @builtin(instance_index) instanceIndex: u32
) -> VertexOutput {
  var quad = array<vec2f, 6>(
    vec2f(-1.0, -1.0), vec2f(1.0, -1.0), vec2f(1.0, 1.0),
    vec2f(-1.0, -1.0), vec2f(1.0, 1.0), vec2f(-1.0, 1.0)
  );

  let node = nodes[instanceIndex];
  let size = uniforms.nodeRadius * select(1.0, 1.3, node.state > 1.5);

  let localPos = quad[vertexIndex];
  let worldPos = node.position + localPos * size;

  var output: VertexOutput;
  output.position = uniforms.viewProjection * vec4f(worldPos, 0.1, 1.0);
  output.localPos = localPos;
  output.state = node.state;
  output.nodeIndex = node.index;

  return output;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  let p = input.localPos;
  let dist = length(p);
  let time = uniforms.time;
  let state = i32(input.state);

  // 圓形遮罩
  if (dist > 1.0) {
    discard;
  }

  var color: vec3f;
  var alpha: f32;

  if (state == 0) {
    // 普通節點 - 暗灰
    color = vec3f(0.4, 0.45, 0.5);
    alpha = smoothstep(1.0, 0.7, dist);

    // 內圈
    let inner = smoothstep(0.5, 0.3, dist);
    color = mix(color, vec3f(0.3, 0.35, 0.4), inner);
  } else if (state == 1) {
    // 已訪問 - 藍綠
    color = vec3f(0.0, 0.7, 0.6);
    alpha = smoothstep(1.0, 0.5, dist);

    // 發光效果
    let glow = 0.8 + sin(time * 3.0 + input.nodeIndex) * 0.2;
    color *= glow;

    // 高亮中心
    let center = smoothstep(0.4, 0.0, dist);
    color += vec3f(0.2, 0.4, 0.3) * center;
  } else if (state == 2) {
    // 當前節點 - 亮綠色脈動
    let pulse = 0.8 + sin(time * 5.0) * 0.2;
    color = vec3f(0.2, 1.0, 0.4) * pulse;
    alpha = smoothstep(1.0, 0.3, dist);

    // 光環
    let ring = smoothstep(0.9, 0.7, dist) - smoothstep(0.7, 0.5, dist);
    color += vec3f(0.3, 0.8, 0.5) * ring * pulse;

    // 中心高亮
    let center = smoothstep(0.3, 0.0, dist);
    color += vec3f(0.5, 1.0, 0.7) * center;
  } else {
    // 起點標記 - 金色
    let pulse = 0.8 + sin(time * 4.0) * 0.2;
    color = vec3f(1.0, 0.8, 0.2) * pulse;
    alpha = smoothstep(1.0, 0.3, dist);

    // 外環
    let ring = smoothstep(0.95, 0.75, dist) - smoothstep(0.75, 0.55, dist);
    color += vec3f(1.0, 0.9, 0.4) * ring;
  }

  return vec4f(color, alpha);
}
`;

// 拖曳線著色器
export const dragLineShader = /* wgsl */`
struct Uniforms {
  viewProjection: mat4x4f,
  startPos: vec2f,
  endPos: vec2f,
  time: f32,
  active: f32,
  padding: vec2f,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;

struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) localT: f32,
  @location(1) localN: f32,
}

@vertex
fn vertexMain(@builtin(vertex_index) vertexIndex: u32) -> VertexOutput {
  if (uniforms.active < 0.5) {
    var output: VertexOutput;
    output.position = vec4f(-999.0, -999.0, 0.0, 1.0);
    output.localT = 0.0;
    output.localN = 0.0;
    return output;
  }

  let start = uniforms.startPos;
  let end = uniforms.endPos;

  let dir = normalize(end - start);
  let normal = vec2f(-dir.y, dir.x);
  let len = length(end - start);
  let width = 0.015;

  var quad = array<vec2f, 6>(
    vec2f(0.0, -0.5), vec2f(1.0, -0.5), vec2f(1.0, 0.5),
    vec2f(0.0, -0.5), vec2f(1.0, 0.5), vec2f(0.0, 0.5)
  );

  let local = quad[vertexIndex];
  let worldPos = start + dir * local.x * len + normal * local.y * width;

  var output: VertexOutput;
  output.position = uniforms.viewProjection * vec4f(worldPos, 0.2, 1.0);
  output.localT = local.x;
  output.localN = local.y;

  return output;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  let t = input.localT;
  let n = abs(input.localN) * 2.0;
  let time = uniforms.time;

  // 流動虛線
  let dash = step(0.5, fract(t * 15.0 - time * 3.0));

  // 霓虹藍綠
  let baseColor = vec3f(0.0, 0.9, 0.8);

  // 邊緣淡出
  let alpha = smoothstep(1.0, 0.5, n) * 0.6 * dash;

  // 流動發光
  let glow = sin(t * 10.0 - time * 5.0) * 0.5 + 0.5;
  let color = baseColor * (0.8 + glow * 0.4);

  return vec4f(color, alpha);
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
  padding: vec2f,
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
  let worldPos = p.position.xy + localPos * p.size;
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
    // 電流火花
    let spark = smoothstep(0.5, 0.0, dist);
    alpha *= spark;
    color += vec3f(0.2, 0.3, 0.2) * spark;
  } else if (pType == 1) {
    // 軌跡粒子
    alpha *= smoothstep(0.5, 0.1, dist) * 0.7;
  } else if (pType == 2) {
    // 完成爆發
    let ring = smoothstep(0.5, 0.3, dist);
    alpha *= ring;
    color += vec3f(0.3) * ring;
  } else {
    // 環境光點
    alpha *= smoothstep(0.5, 0.0, dist) * 0.5;
  }

  if (alpha < 0.01) {
    discard;
  }

  return vec4f(color, alpha);
}
`;

// 勝利特效著色器
export const victoryShader = /* wgsl */`
struct Uniforms {
  viewProjection: mat4x4f,
  time: f32,
  progress: f32,
  center: vec2f,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;

struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) uv: vec2f,
}

@vertex
fn vertexMain(@builtin(vertex_index) vertexIndex: u32) -> VertexOutput {
  var quad = array<vec2f, 6>(
    vec2f(-1.0, -1.0), vec2f(1.0, -1.0), vec2f(1.0, 1.0),
    vec2f(-1.0, -1.0), vec2f(1.0, 1.0), vec2f(-1.0, 1.0)
  );

  let pos = quad[vertexIndex];

  var output: VertexOutput;
  output.position = uniforms.viewProjection * vec4f(uniforms.center + pos * 0.5, 0.5, 1.0);
  output.uv = pos * 0.5 + 0.5;

  return output;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  let uv = input.uv;
  let time = uniforms.time;
  let progress = uniforms.progress;

  if (progress < 0.01) {
    discard;
  }

  let center = uv - 0.5;
  let dist = length(center);
  let angle = atan2(center.y, center.x);

  // 擴散環
  let ring = smoothstep(progress * 0.5, progress * 0.5 - 0.1, dist) -
             smoothstep(progress * 0.5 - 0.1, progress * 0.5 - 0.2, dist);

  // 旋轉光線
  let rays = sin(angle * 8.0 + time * 3.0) * 0.5 + 0.5;

  // 霓虹綠
  let color = vec3f(0.2, 1.0, 0.5) * ring * (0.5 + rays * 0.5);

  let alpha = ring * progress;

  if (alpha < 0.01) {
    discard;
  }

  return vec4f(color, alpha);
}
`;
