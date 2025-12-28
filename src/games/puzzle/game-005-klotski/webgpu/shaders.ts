/**
 * WebGPU WGSL 著色器 - 華容道 3D 渲染
 * 包含方塊、棋盤、出口和粒子特效
 */

export const shaders = {
  // 3D 方塊著色器 (曹操、將軍、士兵)
  block: /* wgsl */ `
    struct Uniforms {
      viewProjection: mat4x4<f32>,
      time: f32,
      cameraPos: vec3<f32>,
    }

    struct BlockInstance {
      @location(3) position: vec3<f32>,
      @location(4) size: vec2<f32>,        // width, height
      @location(5) blockType: f32,         // 0=caocao, 1=general_v, 2=general_h, 3=soldier
      @location(6) selected: f32,
      @location(7) moveProgress: vec2<f32>, // dx, dy for animation
      @location(8) hoverIntensity: f32,
    }

    struct VertexOutput {
      @builtin(position) position: vec4<f32>,
      @location(0) worldPos: vec3<f32>,
      @location(1) normal: vec3<f32>,
      @location(2) uv: vec2<f32>,
      @location(3) blockType: f32,
      @location(4) selected: f32,
      @location(5) hoverIntensity: f32,
      @location(6) localPos: vec3<f32>,
    }

    @group(0) @binding(0) var<uniform> uniforms: Uniforms;

    // 立方體頂點
    const positions = array<vec3<f32>, 36>(
      // Front
      vec3(-0.5, -0.5,  0.5), vec3( 0.5, -0.5,  0.5), vec3( 0.5,  0.5,  0.5),
      vec3(-0.5, -0.5,  0.5), vec3( 0.5,  0.5,  0.5), vec3(-0.5,  0.5,  0.5),
      // Back
      vec3( 0.5, -0.5, -0.5), vec3(-0.5, -0.5, -0.5), vec3(-0.5,  0.5, -0.5),
      vec3( 0.5, -0.5, -0.5), vec3(-0.5,  0.5, -0.5), vec3( 0.5,  0.5, -0.5),
      // Top
      vec3(-0.5,  0.5,  0.5), vec3( 0.5,  0.5,  0.5), vec3( 0.5,  0.5, -0.5),
      vec3(-0.5,  0.5,  0.5), vec3( 0.5,  0.5, -0.5), vec3(-0.5,  0.5, -0.5),
      // Bottom
      vec3(-0.5, -0.5, -0.5), vec3( 0.5, -0.5, -0.5), vec3( 0.5, -0.5,  0.5),
      vec3(-0.5, -0.5, -0.5), vec3( 0.5, -0.5,  0.5), vec3(-0.5, -0.5,  0.5),
      // Right
      vec3( 0.5, -0.5,  0.5), vec3( 0.5, -0.5, -0.5), vec3( 0.5,  0.5, -0.5),
      vec3( 0.5, -0.5,  0.5), vec3( 0.5,  0.5, -0.5), vec3( 0.5,  0.5,  0.5),
      // Left
      vec3(-0.5, -0.5, -0.5), vec3(-0.5, -0.5,  0.5), vec3(-0.5,  0.5,  0.5),
      vec3(-0.5, -0.5, -0.5), vec3(-0.5,  0.5,  0.5), vec3(-0.5,  0.5, -0.5),
    );

    const normals = array<vec3<f32>, 36>(
      vec3(0, 0, 1), vec3(0, 0, 1), vec3(0, 0, 1),
      vec3(0, 0, 1), vec3(0, 0, 1), vec3(0, 0, 1),
      vec3(0, 0, -1), vec3(0, 0, -1), vec3(0, 0, -1),
      vec3(0, 0, -1), vec3(0, 0, -1), vec3(0, 0, -1),
      vec3(0, 1, 0), vec3(0, 1, 0), vec3(0, 1, 0),
      vec3(0, 1, 0), vec3(0, 1, 0), vec3(0, 1, 0),
      vec3(0, -1, 0), vec3(0, -1, 0), vec3(0, -1, 0),
      vec3(0, -1, 0), vec3(0, -1, 0), vec3(0, -1, 0),
      vec3(1, 0, 0), vec3(1, 0, 0), vec3(1, 0, 0),
      vec3(1, 0, 0), vec3(1, 0, 0), vec3(1, 0, 0),
      vec3(-1, 0, 0), vec3(-1, 0, 0), vec3(-1, 0, 0),
      vec3(-1, 0, 0), vec3(-1, 0, 0), vec3(-1, 0, 0),
    );

    @vertex
    fn vertexMain(
      @builtin(vertex_index) vertexIndex: u32,
      instance: BlockInstance
    ) -> VertexOutput {
      var output: VertexOutput;

      let pos = positions[vertexIndex];
      let normal = normals[vertexIndex];

      // 根據方塊大小縮放
      let blockHeight = 0.5;
      var scaledPos = vec3(
        pos.x * instance.size.x * 0.95,
        pos.y * blockHeight + blockHeight * 0.5,
        pos.z * instance.size.y * 0.95
      );

      // 移動動畫
      let animOffset = vec3(
        instance.moveProgress.x,
        0.0,
        instance.moveProgress.y
      );

      // 選中時浮起
      var yOffset = 0.0;
      if (instance.selected > 0.5) {
        yOffset = 0.15 + sin(uniforms.time * 4.0) * 0.03;
      }

      // 懸停效果
      yOffset += instance.hoverIntensity * 0.1;

      let worldPos = vec3(
        instance.position.x + scaledPos.x + animOffset.x,
        instance.position.y + scaledPos.y + yOffset,
        instance.position.z + scaledPos.z + animOffset.y
      );

      output.position = uniforms.viewProjection * vec4(worldPos, 1.0);
      output.worldPos = worldPos;
      output.normal = normal;
      output.uv = vec2((pos.x + 0.5), (pos.z + 0.5));
      output.blockType = instance.blockType;
      output.selected = instance.selected;
      output.hoverIntensity = instance.hoverIntensity;
      output.localPos = pos;

      return output;
    }

    // PBR 光照
    fn ggxDistribution(NdotH: f32, roughness: f32) -> f32 {
      let a = roughness * roughness;
      let a2 = a * a;
      let NdotH2 = NdotH * NdotH;
      let denom = NdotH2 * (a2 - 1.0) + 1.0;
      return a2 / (3.14159 * denom * denom);
    }

    fn fresnelSchlick(cosTheta: f32, F0: vec3<f32>) -> vec3<f32> {
      return F0 + (1.0 - F0) * pow(1.0 - cosTheta, 5.0);
    }

    fn smithGeometry(NdotV: f32, NdotL: f32, roughness: f32) -> f32 {
      let r = roughness + 1.0;
      let k = (r * r) / 8.0;
      let ggx1 = NdotV / (NdotV * (1.0 - k) + k);
      let ggx2 = NdotL / (NdotL * (1.0 - k) + k);
      return ggx1 * ggx2;
    }

    @fragment
    fn fragmentMain(input: VertexOutput) -> @location(0) vec4<f32> {
      let N = normalize(input.normal);
      let V = normalize(uniforms.cameraPos - input.worldPos);
      let L = normalize(vec3(3.0, 5.0, 2.0));
      let H = normalize(V + L);

      let NdotL = max(dot(N, L), 0.0);
      let NdotV = max(dot(N, V), 0.0);
      let NdotH = max(dot(N, H), 0.0);

      var baseColor: vec3<f32>;
      var roughness = 0.35;
      var metallic = 0.2;
      var emissive = vec3(0.0);

      // 根據方塊類型選擇顏色
      if (input.blockType < 0.5) {
        // 曹操 - 紅色金屬
        baseColor = vec3(0.9, 0.2, 0.15);
        metallic = 0.6;
        roughness = 0.25;
        // 金色邊緣裝飾
        let edge = min(
          min(abs(input.localPos.x) - 0.4, abs(input.localPos.z) - 0.4),
          abs(input.localPos.y) - 0.4
        );
        if (edge > 0.0) {
          baseColor = mix(baseColor, vec3(1.0, 0.8, 0.3), 0.5);
          metallic = 0.8;
        }
        // 脈動發光
        let pulse = sin(uniforms.time * 2.0) * 0.2 + 0.8;
        emissive = vec3(0.3, 0.05, 0.0) * pulse;
      } else if (input.blockType < 1.5) {
        // 垂直將軍 - 青綠色
        baseColor = vec3(0.15, 0.65, 0.55);
        metallic = 0.4;
        // 紋理條紋
        let stripe = sin(input.localPos.y * 20.0) * 0.5 + 0.5;
        baseColor = mix(baseColor, baseColor * 1.2, stripe * 0.2);
      } else if (input.blockType < 2.5) {
        // 水平將軍 (關羽) - 金色
        baseColor = vec3(0.9, 0.75, 0.35);
        metallic = 0.7;
        roughness = 0.2;
        emissive = vec3(0.15, 0.1, 0.0);
      } else {
        // 士兵 - 藍色
        baseColor = vec3(0.25, 0.45, 0.65);
        metallic = 0.3;
        roughness = 0.4;
      }

      // 選中高亮
      if (input.selected > 0.5) {
        emissive += vec3(0.2, 0.3, 0.4);
        let pulse = sin(uniforms.time * 5.0) * 0.5 + 0.5;
        emissive *= pulse * 0.5 + 0.5;
      }

      // 懸停發光
      emissive += vec3(0.1, 0.15, 0.2) * input.hoverIntensity;

      // PBR 計算
      let F0 = mix(vec3(0.04), baseColor, metallic);
      let D = ggxDistribution(NdotH, roughness);
      let G = smithGeometry(NdotV, NdotL, roughness);
      let F = fresnelSchlick(max(dot(H, V), 0.0), F0);

      let specular = (D * G * F) / max(4.0 * NdotV * NdotL, 0.001);
      let kD = (1.0 - F) * (1.0 - metallic);
      let diffuse = kD * baseColor / 3.14159;

      let ambient = vec3(0.05) * baseColor;
      var color = ambient + (diffuse + specular) * NdotL * vec3(1.0, 0.95, 0.9) + emissive;

      // 邊緣發光
      let rim = pow(1.0 - NdotV, 3.0);
      if (input.selected > 0.5) {
        color += rim * vec3(0.3, 0.5, 0.8) * 0.5;
      } else {
        color += rim * vec3(0.1, 0.1, 0.15) * 0.3;
      }

      // 色調映射
      color = color / (color + vec3(1.0));
      color = pow(color, vec3(1.0 / 2.2));

      return vec4(color, 1.0);
    }
  `,

  // 棋盤著色器
  board: /* wgsl */ `
    struct Uniforms {
      viewProjection: mat4x4<f32>,
      time: f32,
      cameraPos: vec3<f32>,
    }

    struct VertexOutput {
      @builtin(position) position: vec4<f32>,
      @location(0) worldPos: vec3<f32>,
      @location(1) normal: vec3<f32>,
      @location(2) uv: vec2<f32>,
    }

    @group(0) @binding(0) var<uniform> uniforms: Uniforms;

    @vertex
    fn vertexMain(@builtin(vertex_index) vertexIndex: u32) -> VertexOutput {
      var output: VertexOutput;

      // 棋盤 4x5 + 邊框
      let boardWidth = 4.0;
      let boardHeight = 5.0;
      let border = 0.3;
      let depth = 0.3;

      // 頂面和側面頂點
      let verts = array<vec3<f32>, 30>(
        // 頂面
        vec3(-border, 0.0, -border),
        vec3(boardWidth + border, 0.0, -border),
        vec3(boardWidth + border, 0.0, boardHeight + border),
        vec3(-border, 0.0, -border),
        vec3(boardWidth + border, 0.0, boardHeight + border),
        vec3(-border, 0.0, boardHeight + border),
        // 前面
        vec3(-border, 0.0, boardHeight + border),
        vec3(boardWidth + border, 0.0, boardHeight + border),
        vec3(boardWidth + border, -depth, boardHeight + border),
        vec3(-border, 0.0, boardHeight + border),
        vec3(boardWidth + border, -depth, boardHeight + border),
        vec3(-border, -depth, boardHeight + border),
        // 右面
        vec3(boardWidth + border, 0.0, boardHeight + border),
        vec3(boardWidth + border, 0.0, -border),
        vec3(boardWidth + border, -depth, -border),
        vec3(boardWidth + border, 0.0, boardHeight + border),
        vec3(boardWidth + border, -depth, -border),
        vec3(boardWidth + border, -depth, boardHeight + border),
        // 後面
        vec3(boardWidth + border, 0.0, -border),
        vec3(-border, 0.0, -border),
        vec3(-border, -depth, -border),
        vec3(boardWidth + border, 0.0, -border),
        vec3(-border, -depth, -border),
        vec3(boardWidth + border, -depth, -border),
        // 左面
        vec3(-border, 0.0, -border),
        vec3(-border, 0.0, boardHeight + border),
        vec3(-border, -depth, boardHeight + border),
        vec3(-border, 0.0, -border),
        vec3(-border, -depth, boardHeight + border),
        vec3(-border, -depth, -border),
      );

      let normalsList = array<vec3<f32>, 30>(
        vec3(0, 1, 0), vec3(0, 1, 0), vec3(0, 1, 0),
        vec3(0, 1, 0), vec3(0, 1, 0), vec3(0, 1, 0),
        vec3(0, 0, 1), vec3(0, 0, 1), vec3(0, 0, 1),
        vec3(0, 0, 1), vec3(0, 0, 1), vec3(0, 0, 1),
        vec3(1, 0, 0), vec3(1, 0, 0), vec3(1, 0, 0),
        vec3(1, 0, 0), vec3(1, 0, 0), vec3(1, 0, 0),
        vec3(0, 0, -1), vec3(0, 0, -1), vec3(0, 0, -1),
        vec3(0, 0, -1), vec3(0, 0, -1), vec3(0, 0, -1),
        vec3(-1, 0, 0), vec3(-1, 0, 0), vec3(-1, 0, 0),
        vec3(-1, 0, 0), vec3(-1, 0, 0), vec3(-1, 0, 0),
      );

      let worldPos = verts[vertexIndex];
      output.position = uniforms.viewProjection * vec4(worldPos, 1.0);
      output.worldPos = worldPos;
      output.normal = normalsList[vertexIndex];
      output.uv = vec2(worldPos.x / 4.0, worldPos.z / 5.0);

      return output;
    }

    @fragment
    fn fragmentMain(input: VertexOutput) -> @location(0) vec4<f32> {
      let N = normalize(input.normal);
      let V = normalize(uniforms.cameraPos - input.worldPos);
      let L = normalize(vec3(3.0, 5.0, 2.0));

      let NdotL = max(dot(N, L), 0.0);
      let NdotV = max(dot(N, V), 0.0);

      // 木紋棋盤顏色
      var baseColor = vec3(0.35, 0.22, 0.12);

      // 只在頂面顯示格子
      if (N.y > 0.5) {
        // 格子效果
        let gridX = floor(input.worldPos.x);
        let gridZ = floor(input.worldPos.z);

        // 檢查是否在棋盤範圍內
        if (gridX >= 0.0 && gridX < 4.0 && gridZ >= 0.0 && gridZ < 5.0) {
          // 交替顏色
          let checker = (gridX + gridZ) % 2.0;
          let darkWood = vec3(0.25, 0.15, 0.08);
          let lightWood = vec3(0.4, 0.28, 0.15);
          baseColor = mix(darkWood, lightWood, checker);

          // 格子內發光邊緣
          let cellX = fract(input.worldPos.x);
          let cellZ = fract(input.worldPos.z);
          let edgeDist = min(min(cellX, 1.0 - cellX), min(cellZ, 1.0 - cellZ));
          let edgeGlow = smoothstep(0.05, 0.0, edgeDist);
          baseColor += vec3(0.0, 0.2, 0.25) * edgeGlow * 0.3;
        }

        // 出口區域 (底部中間 2 格)
        if (gridX >= 1.0 && gridX < 3.0 && gridZ >= 4.5) {
          baseColor = vec3(0.1, 0.35, 0.2);
          // 發光效果
          let pulse = sin(uniforms.time * 3.0) * 0.3 + 0.7;
          baseColor += vec3(0.0, 0.2, 0.1) * pulse;
        }
      } else {
        // 側面 - 較深的木色
        baseColor = vec3(0.25, 0.15, 0.08);
      }

      // 簡單光照
      let ambient = vec3(0.1) * baseColor;
      let diffuse = baseColor * NdotL;
      let specular = pow(max(dot(reflect(-L, N), V), 0.0), 32.0) * vec3(0.2);

      var color = ambient + diffuse + specular;

      // 邊緣暗化
      let rim = pow(1.0 - NdotV, 2.0);
      color = mix(color, color * 0.7, rim * 0.3);

      // 色調映射
      color = color / (color + vec3(1.0));
      color = pow(color, vec3(1.0 / 2.2));

      return vec4(color, 1.0);
    }
  `,

  // 出口指示器著色器
  exitIndicator: /* wgsl */ `
    struct Uniforms {
      viewProjection: mat4x4<f32>,
      time: f32,
    }

    struct VertexOutput {
      @builtin(position) position: vec4<f32>,
      @location(0) uv: vec2<f32>,
    }

    @group(0) @binding(0) var<uniform> uniforms: Uniforms;

    @vertex
    fn vertexMain(@builtin(vertex_index) vertexIndex: u32) -> VertexOutput {
      var output: VertexOutput;

      // 出口區域 (底部中間)
      let verts = array<vec3<f32>, 6>(
        vec3(1.0, 0.01, 5.0),
        vec3(3.0, 0.01, 5.0),
        vec3(3.0, 0.01, 5.5),
        vec3(1.0, 0.01, 5.0),
        vec3(3.0, 0.01, 5.5),
        vec3(1.0, 0.01, 5.5),
      );

      let uvs = array<vec2<f32>, 6>(
        vec2(0.0, 0.0),
        vec2(1.0, 0.0),
        vec2(1.0, 1.0),
        vec2(0.0, 0.0),
        vec2(1.0, 1.0),
        vec2(0.0, 1.0),
      );

      output.position = uniforms.viewProjection * vec4(verts[vertexIndex], 1.0);
      output.uv = uvs[vertexIndex];

      return output;
    }

    @fragment
    fn fragmentMain(input: VertexOutput) -> @location(0) vec4<f32> {
      // 箭頭圖案
      let center = vec2(0.5, 0.5);
      let p = input.uv - center;

      // 向下箭頭
      let arrowBody = abs(p.x) < 0.15 && p.y > -0.2 && p.y < 0.3;
      let arrowHead = p.y < -0.1 && abs(p.x) < 0.3 - (p.y + 0.4) * 0.5;

      let isArrow = arrowBody || arrowHead;

      if (!isArrow) {
        discard;
      }

      // 發光綠色
      let pulse = sin(uniforms.time * 4.0) * 0.3 + 0.7;
      let color = vec3(0.2, 0.9, 0.4) * pulse;

      // 邊緣發光
      let edge = smoothstep(0.0, 0.1, abs(p.x)) + smoothstep(0.0, 0.1, abs(p.y + 0.1));
      let glow = 1.0 - edge * 0.3;

      return vec4(color * glow, 0.9);
    }
  `,

  // 粒子著色器
  particle: /* wgsl */ `
    struct Uniforms {
      viewProjection: mat4x4<f32>,
      time: f32,
      cameraPos: vec3<f32>,
    }

    struct ParticleInstance {
      @location(3) position: vec3<f32>,
      @location(4) velocity: vec3<f32>,
      @location(5) color: vec4<f32>,
      @location(6) size: f32,
      @location(7) life: f32,
    }

    struct VertexOutput {
      @builtin(position) position: vec4<f32>,
      @location(0) uv: vec2<f32>,
      @location(1) color: vec4<f32>,
      @location(2) life: f32,
    }

    @group(0) @binding(0) var<uniform> uniforms: Uniforms;

    @vertex
    fn vertexMain(
      @builtin(vertex_index) vertexIndex: u32,
      instance: ParticleInstance
    ) -> VertexOutput {
      var output: VertexOutput;

      let verts = array<vec2<f32>, 6>(
        vec2(-0.5, -0.5), vec2(0.5, -0.5), vec2(0.5, 0.5),
        vec2(-0.5, -0.5), vec2(0.5, 0.5), vec2(-0.5, 0.5),
      );

      let vert = verts[vertexIndex];

      // 面向相機
      let toCamera = normalize(uniforms.cameraPos - instance.position);
      let right = normalize(cross(vec3(0.0, 1.0, 0.0), toCamera));
      let up = cross(toCamera, right);

      let size = instance.size * instance.life;
      let worldPos = instance.position +
        right * vert.x * size +
        up * vert.y * size;

      output.position = uniforms.viewProjection * vec4(worldPos, 1.0);
      output.uv = vert + 0.5;
      output.color = instance.color;
      output.life = instance.life;

      return output;
    }

    @fragment
    fn fragmentMain(input: VertexOutput) -> @location(0) vec4<f32> {
      let dist = length(input.uv - 0.5) * 2.0;

      if (dist > 1.0) {
        discard;
      }

      let alpha = smoothstep(1.0, 0.3, dist) * input.life;
      let glow = exp(-dist * 2.0);
      var color = input.color.rgb * (1.0 + glow * 0.5);

      return vec4(color, alpha * input.color.a);
    }
  `,

  // 勝利特效著色器
  victory: /* wgsl */ `
    struct Uniforms {
      viewProjection: mat4x4<f32>,
      time: f32,
      progress: f32,
    }

    struct VertexOutput {
      @builtin(position) position: vec4<f32>,
      @location(0) uv: vec2<f32>,
    }

    @group(0) @binding(0) var<uniform> uniforms: Uniforms;

    @vertex
    fn vertexMain(@builtin(vertex_index) vertexIndex: u32) -> VertexOutput {
      var output: VertexOutput;

      let verts = array<vec2<f32>, 6>(
        vec2(-1.0, -1.0), vec2(1.0, -1.0), vec2(1.0, 1.0),
        vec2(-1.0, -1.0), vec2(1.0, 1.0), vec2(-1.0, 1.0),
      );

      output.position = vec4(verts[vertexIndex], 0.0, 1.0);
      output.uv = verts[vertexIndex] * 0.5 + 0.5;

      return output;
    }

    @fragment
    fn fragmentMain(input: VertexOutput) -> @location(0) vec4<f32> {
      let center = vec2(0.5, 0.5);
      let dist = length(input.uv - center);

      // 金色光環
      let ringRadius = uniforms.progress * 0.8;
      let ringWidth = 0.12;
      let ring = smoothstep(ringWidth, 0.0, abs(dist - ringRadius));

      // 顏色
      let gold = vec3(1.0, 0.85, 0.3);
      let red = vec3(1.0, 0.3, 0.2);
      let color = mix(red, gold, uniforms.progress);

      // 星芒
      let angle = atan2(input.uv.y - 0.5, input.uv.x - 0.5);
      let rays = abs(sin(angle * 6.0 + uniforms.time * 3.0));
      let rayGlow = rays * exp(-dist * 3.0) * uniforms.progress;

      let finalColor = color * (ring + rayGlow * 0.5);
      let alpha = max(ring, rayGlow) * 0.7 * (1.0 - uniforms.progress * 0.3);

      return vec4(finalColor, alpha);
    }
  `,

  // 移動軌跡著色器
  moveTrail: /* wgsl */ `
    struct Uniforms {
      viewProjection: mat4x4<f32>,
      time: f32,
    }

    struct TrailInstance {
      @location(3) startPos: vec3<f32>,
      @location(4) endPos: vec3<f32>,
      @location(5) progress: f32,
      @location(6) color: vec3<f32>,
    }

    struct VertexOutput {
      @builtin(position) position: vec4<f32>,
      @location(0) alpha: f32,
    }

    @group(0) @binding(0) var<uniform> uniforms: Uniforms;

    @vertex
    fn vertexMain(
      @builtin(vertex_index) vertexIndex: u32,
      instance: TrailInstance
    ) -> VertexOutput {
      var output: VertexOutput;

      let t = f32(vertexIndex % 2u);
      let pos = mix(instance.startPos, instance.endPos, t * instance.progress);

      output.position = uniforms.viewProjection * vec4(pos + vec3(0.0, 0.02, 0.0), 1.0);
      output.alpha = (1.0 - t) * instance.progress;

      return output;
    }

    @fragment
    fn fragmentMain(input: VertexOutput) -> @location(0) vec4<f32> {
      let color = vec3(0.3, 0.6, 0.9);
      return vec4(color, input.alpha * 0.5);
    }
  `,
};
