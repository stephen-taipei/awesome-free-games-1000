/**
 * WGSL 著色器 - 拼圖遊戲
 * WebGPU Shaders for Jigsaw Puzzle
 */

export const shaders = {
  // 拼圖片著色器 - 帶紋理的 3D 拼圖片
  piece: /* wgsl */`
    struct CameraUniforms {
      viewProjection: mat4x4<f32>,
      cameraPos: vec3<f32>,
      time: f32,
    }

    struct PieceUniforms {
      position: vec2<f32>,      // 當前位置
      targetPos: vec2<f32>,     // 目標位置
      size: vec2<f32>,          // 片大小
      uvOffset: vec2<f32>,      // 紋理偏移
      uvScale: vec2<f32>,       // 紋理縮放
      edges: vec4<f32>,         // top, right, bottom, left (-1, 0, 1)
      isLocked: f32,            // 是否已鎖定
      isSelected: f32,          // 是否被選中
      isHovered: f32,           // 是否懸停
      elevation: f32,           // 高度偏移
    }

    @group(0) @binding(0) var<uniform> camera: CameraUniforms;
    @group(0) @binding(1) var<uniform> piece: PieceUniforms;
    @group(0) @binding(2) var textureSampler: sampler;
    @group(0) @binding(3) var pieceTexture: texture_2d<f32>;

    struct VertexOutput {
      @builtin(position) position: vec4<f32>,
      @location(0) worldPos: vec3<f32>,
      @location(1) normal: vec3<f32>,
      @location(2) uv: vec2<f32>,
      @location(3) localPos: vec2<f32>,
    }

    // 計算拼圖邊緣形狀（凸起/凹陷）
    fn getEdgeOffset(pos: vec2<f32>, size: vec2<f32>, edges: vec4<f32>) -> f32 {
      let tabSize = min(size.x, size.y) * 0.2;
      let tabWidth = min(size.x, size.y) * 0.3;
      var offset = 0.0;

      // 正規化位置
      let nx = pos.x / size.x;
      let ny = pos.y / size.y;

      // 上邊 (y = 0)
      if (edges.x != 0.0 && ny < 0.1) {
        let cx = 0.5;
        let dist = abs(nx - cx);
        if (dist < tabWidth / size.x * 0.5) {
          let t = 1.0 - dist / (tabWidth / size.x * 0.5);
          let bump = t * t * (3.0 - 2.0 * t);
          offset += edges.x * tabSize * bump * (1.0 - ny * 10.0);
        }
      }

      // 下邊 (y = size.y)
      if (edges.z != 0.0 && ny > 0.9) {
        let cx = 0.5;
        let dist = abs(nx - cx);
        if (dist < tabWidth / size.x * 0.5) {
          let t = 1.0 - dist / (tabWidth / size.x * 0.5);
          let bump = t * t * (3.0 - 2.0 * t);
          offset += edges.z * tabSize * bump * ((ny - 0.9) * 10.0);
        }
      }

      // 左邊 (x = 0)
      if (edges.w != 0.0 && nx < 0.1) {
        let cy = 0.5;
        let dist = abs(ny - cy);
        if (dist < tabWidth / size.y * 0.5) {
          let t = 1.0 - dist / (tabWidth / size.y * 0.5);
          let bump = t * t * (3.0 - 2.0 * t);
          offset += edges.w * tabSize * bump * (1.0 - nx * 10.0);
        }
      }

      // 右邊 (x = size.x)
      if (edges.y != 0.0 && nx > 0.9) {
        let cy = 0.5;
        let dist = abs(ny - cy);
        if (dist < tabWidth / size.y * 0.5) {
          let t = 1.0 - dist / (tabWidth / size.y * 0.5);
          let bump = t * t * (3.0 - 2.0 * t);
          offset += edges.y * tabSize * bump * ((nx - 0.9) * 10.0);
        }
      }

      return offset * 0.3;
    }

    @vertex
    fn vertexMain(
      @location(0) vertexPos: vec3<f32>,
      @location(1) normal: vec3<f32>,
      @location(2) uv: vec2<f32>
    ) -> VertexOutput {
      var output: VertexOutput;

      // 計算世界位置
      var worldPos = vertexPos;
      worldPos.x = worldPos.x * piece.size.x + piece.position.x;
      worldPos.z = worldPos.z * piece.size.y + piece.position.y;

      // 計算邊緣偏移
      let localPos = vec2<f32>(vertexPos.x * piece.size.x, vertexPos.z * piece.size.y);
      let edgeOffset = getEdgeOffset(localPos, piece.size, piece.edges);

      // 高度變化
      var height = 0.05; // 基礎厚度
      if (piece.isSelected > 0.5) {
        height = 0.15; // 選中時抬高
      } else if (piece.isLocked > 0.5) {
        height = 0.02; // 鎖定時壓平
      } else if (piece.isHovered > 0.5) {
        height = 0.08; // 懸停時稍微抬高
      }
      height += piece.elevation;

      worldPos.y = vertexPos.y * height + edgeOffset;

      output.position = camera.viewProjection * vec4<f32>(worldPos, 1.0);
      output.worldPos = worldPos;
      output.normal = normal;
      output.uv = uv * piece.uvScale + piece.uvOffset;
      output.localPos = vec2<f32>(vertexPos.x, vertexPos.z);

      return output;
    }

    @fragment
    fn fragmentMain(input: VertexOutput) -> @location(0) vec4<f32> {
      // 採樣紋理
      var texColor = textureSample(pieceTexture, textureSampler, input.uv);

      // PBR 光照
      let lightDir = normalize(vec3<f32>(0.5, 1.0, 0.3));
      let viewDir = normalize(camera.cameraPos - input.worldPos);
      let halfDir = normalize(lightDir + viewDir);

      let ambient = 0.3;
      let diffuse = max(dot(input.normal, lightDir), 0.0) * 0.6;
      let specular = pow(max(dot(input.normal, halfDir), 0.0), 32.0) * 0.3;

      var lighting = ambient + diffuse;

      // 選中效果 - 發光邊緣
      if (piece.isSelected > 0.5) {
        let edge = 1.0 - smoothstep(0.0, 0.1, input.localPos.x) *
                        smoothstep(0.0, 0.1, input.localPos.y) *
                        smoothstep(0.0, 0.1, 1.0 - input.localPos.x) *
                        smoothstep(0.0, 0.1, 1.0 - input.localPos.y);
        let glow = sin(camera.time * 4.0) * 0.3 + 0.7;
        texColor = mix(texColor, vec4<f32>(0.0, 1.0, 1.0, 1.0), edge * glow * 0.5);
        lighting += specular * 2.0;
      }

      // 鎖定效果 - 完美位置的微光
      if (piece.isLocked > 0.5) {
        let shimmer = sin(camera.time * 2.0 + input.localPos.x * 10.0 + input.localPos.y * 10.0) * 0.05 + 0.05;
        texColor.rgb += shimmer;
      }

      // 懸停效果
      if (piece.isHovered > 0.5 && piece.isSelected < 0.5) {
        texColor.rgb *= 1.1;
        lighting += specular;
      }

      // 邊緣深色輪廓
      let edgeDist = min(min(input.localPos.x, 1.0 - input.localPos.x),
                         min(input.localPos.y, 1.0 - input.localPos.y));
      let border = 1.0 - smoothstep(0.0, 0.02, edgeDist);
      texColor.rgb = mix(texColor.rgb, vec3<f32>(0.1, 0.1, 0.1), border * 0.8);

      return vec4<f32>(texColor.rgb * lighting, texColor.a);
    }
  `,

  // 背景/目標區域著色器
  background: /* wgsl */`
    struct CameraUniforms {
      viewProjection: mat4x4<f32>,
      cameraPos: vec3<f32>,
      time: f32,
    }

    struct BackgroundUniforms {
      position: vec2<f32>,
      size: vec2<f32>,
      gridSize: vec2<f32>,
      completionRatio: f32,
      _padding: f32,
    }

    @group(0) @binding(0) var<uniform> camera: CameraUniforms;
    @group(0) @binding(1) var<uniform> bg: BackgroundUniforms;

    struct VertexOutput {
      @builtin(position) position: vec4<f32>,
      @location(0) worldPos: vec3<f32>,
      @location(1) uv: vec2<f32>,
    }

    @vertex
    fn vertexMain(
      @location(0) vertexPos: vec3<f32>,
      @location(1) normal: vec3<f32>,
      @location(2) uv: vec2<f32>
    ) -> VertexOutput {
      var output: VertexOutput;

      var worldPos = vertexPos;
      worldPos.x = worldPos.x * bg.size.x + bg.position.x;
      worldPos.z = worldPos.z * bg.size.y + bg.position.y;
      worldPos.y = -0.01; // 稍微低於拼圖

      output.position = camera.viewProjection * vec4<f32>(worldPos, 1.0);
      output.worldPos = worldPos;
      output.uv = uv;

      return output;
    }

    @fragment
    fn fragmentMain(input: VertexOutput) -> @location(0) vec4<f32> {
      // 網格圖案
      let gridUV = input.uv * bg.gridSize;
      let gridLine = step(0.95, fract(gridUV.x)) + step(0.95, fract(gridUV.y));

      // 基礎顏色 - 深色木紋感
      var baseColor = vec3<f32>(0.15, 0.12, 0.1);

      // 木紋效果
      let woodGrain = sin(input.uv.x * 50.0 + sin(input.uv.y * 20.0) * 2.0) * 0.02;
      baseColor += woodGrain;

      // 網格線
      let gridColor = vec3<f32>(0.08, 0.06, 0.05);
      baseColor = mix(baseColor, gridColor, gridLine * 0.5);

      // 完成度發光效果
      if (bg.completionRatio > 0.0) {
        let pulse = sin(camera.time * 2.0) * 0.1 + 0.1;
        let glow = vec3<f32>(0.0, 0.8, 0.4) * bg.completionRatio * pulse;
        baseColor += glow;
      }

      // 邊緣漸暗
      let edgeFade = smoothstep(0.0, 0.1, input.uv.x) *
                     smoothstep(0.0, 0.1, input.uv.y) *
                     smoothstep(0.0, 0.1, 1.0 - input.uv.x) *
                     smoothstep(0.0, 0.1, 1.0 - input.uv.y);
      baseColor *= 0.7 + edgeFade * 0.3;

      return vec4<f32>(baseColor, 1.0);
    }
  `,

  // 粒子著色器 - 扣合/勝利效果
  particle: /* wgsl */`
    struct ParticleUniforms {
      viewProjection: mat4x4<f32>,
      cameraPos: vec3<f32>,
      time: f32,
    }

    @group(0) @binding(0) var<uniform> uniforms: ParticleUniforms;

    struct VertexInput {
      @location(0) position: vec3<f32>,
      @location(1) color: vec4<f32>,
      @location(2) size: f32,
      @location(3) rotation: f32,
      @location(4) life: f32,
    }

    struct VertexOutput {
      @builtin(position) position: vec4<f32>,
      @location(0) color: vec4<f32>,
      @location(1) uv: vec2<f32>,
      @location(2) life: f32,
    }

    @vertex
    fn vertexMain(
      input: VertexInput,
      @builtin(vertex_index) vertexIndex: u32
    ) -> VertexOutput {
      var output: VertexOutput;

      // Billboard 四邊形頂點
      let corners = array<vec2<f32>, 6>(
        vec2<f32>(-1.0, -1.0),
        vec2<f32>(1.0, -1.0),
        vec2<f32>(1.0, 1.0),
        vec2<f32>(-1.0, -1.0),
        vec2<f32>(1.0, 1.0),
        vec2<f32>(-1.0, 1.0)
      );

      let corner = corners[vertexIndex % 6u];

      // 旋轉
      let c = cos(input.rotation);
      let s = sin(input.rotation);
      let rotatedCorner = vec2<f32>(
        corner.x * c - corner.y * s,
        corner.x * s + corner.y * c
      );

      // Billboard 朝向相機
      let toCamera = normalize(uniforms.cameraPos - input.position);
      let right = normalize(cross(vec3<f32>(0.0, 1.0, 0.0), toCamera));
      let up = normalize(cross(toCamera, right));

      let worldPos = input.position +
                     right * rotatedCorner.x * input.size +
                     up * rotatedCorner.y * input.size;

      output.position = uniforms.viewProjection * vec4<f32>(worldPos, 1.0);
      output.color = input.color;
      output.uv = corner * 0.5 + 0.5;
      output.life = input.life;

      return output;
    }

    @fragment
    fn fragmentMain(input: VertexOutput) -> @location(0) vec4<f32> {
      // 圓形粒子
      let dist = length(input.uv - 0.5) * 2.0;
      let alpha = smoothstep(1.0, 0.3, dist) * input.life;

      // 發光效果
      let glow = exp(-dist * 2.0) * 0.5;

      var color = input.color.rgb + glow;
      return vec4<f32>(color, alpha * input.color.a);
    }
  `,

  // 勝利效果著色器
  victory: /* wgsl */`
    struct VictoryUniforms {
      time: f32,
      aspectRatio: f32,
      _padding: vec2<f32>,
    }

    @group(0) @binding(0) var<uniform> uniforms: VictoryUniforms;

    struct VertexOutput {
      @builtin(position) position: vec4<f32>,
      @location(0) uv: vec2<f32>,
    }

    @vertex
    fn vertexMain(
      @location(0) pos: vec2<f32>,
      @location(1) uv: vec2<f32>
    ) -> VertexOutput {
      var output: VertexOutput;
      output.position = vec4<f32>(pos, 0.0, 1.0);
      output.uv = uv;
      return output;
    }

    @fragment
    fn fragmentMain(input: VertexOutput) -> @location(0) vec4<f32> {
      let center = vec2<f32>(0.5, 0.5);
      var uv = input.uv;
      uv.x = (uv.x - 0.5) * uniforms.aspectRatio + 0.5;

      let dist = distance(uv, center);

      // 擴散光環
      let ringCount = 3.0;
      var rings = 0.0;
      for (var i = 0.0; i < ringCount; i += 1.0) {
        let ringDist = fract(dist * 3.0 - uniforms.time * 0.5 + i / ringCount);
        let ring = smoothstep(0.0, 0.1, ringDist) * smoothstep(0.2, 0.1, ringDist);
        rings += ring;
      }

      // 金色/彩虹效果
      let hue = fract(uniforms.time * 0.2 + dist * 2.0);
      let rainbow = vec3<f32>(
        sin(hue * 6.28318) * 0.5 + 0.5,
        sin((hue + 0.333) * 6.28318) * 0.5 + 0.5,
        sin((hue + 0.666) * 6.28318) * 0.5 + 0.5
      );

      let gold = vec3<f32>(1.0, 0.85, 0.0);
      let color = mix(gold, rainbow, 0.3);

      // 星光閃爍
      let stars = sin(input.uv.x * 30.0 + uniforms.time * 3.0) *
                  sin(input.uv.y * 30.0 + uniforms.time * 2.0);
      let sparkle = step(0.98, stars) * sin(uniforms.time * 10.0 + dist * 20.0);

      let finalColor = color * rings + sparkle;
      let alpha = rings * 0.6 + sparkle * 0.8;

      // 淡入
      let fadeIn = smoothstep(0.0, 1.0, uniforms.time);

      return vec4<f32>(finalColor, alpha * fadeIn);
    }
  `,

  // 預覽圖陰影著色器
  preview: /* wgsl */`
    struct PreviewUniforms {
      viewProjection: mat4x4<f32>,
      position: vec2<f32>,
      size: vec2<f32>,
      opacity: f32,
      time: f32,
      _padding: vec2<f32>,
    }

    @group(0) @binding(0) var<uniform> uniforms: PreviewUniforms;
    @group(0) @binding(1) var textureSampler: sampler;
    @group(0) @binding(2) var previewTexture: texture_2d<f32>;

    struct VertexOutput {
      @builtin(position) position: vec4<f32>,
      @location(0) uv: vec2<f32>,
    }

    @vertex
    fn vertexMain(
      @location(0) vertexPos: vec3<f32>,
      @location(1) normal: vec3<f32>,
      @location(2) uv: vec2<f32>
    ) -> VertexOutput {
      var output: VertexOutput;

      var worldPos = vertexPos;
      worldPos.x = worldPos.x * uniforms.size.x + uniforms.position.x;
      worldPos.z = worldPos.z * uniforms.size.y + uniforms.position.y;
      worldPos.y = -0.02;

      output.position = uniforms.viewProjection * vec4<f32>(worldPos, 1.0);
      output.uv = uv;

      return output;
    }

    @fragment
    fn fragmentMain(input: VertexOutput) -> @location(0) vec4<f32> {
      var texColor = textureSample(previewTexture, textureSampler, input.uv);

      // 脈動邊框效果
      let edge = 1.0 - smoothstep(0.0, 0.02, input.uv.x) *
                       smoothstep(0.0, 0.02, input.uv.y) *
                       smoothstep(0.0, 0.02, 1.0 - input.uv.x) *
                       smoothstep(0.0, 0.02, 1.0 - input.uv.y);
      let borderPulse = sin(uniforms.time * 2.0) * 0.2 + 0.8;
      let borderColor = vec3<f32>(0.0, 0.8, 1.0) * borderPulse;

      texColor.rgb = mix(texColor.rgb, borderColor, edge);
      texColor.a *= uniforms.opacity;

      return texColor;
    }
  `,

  // 拾取提示著色器
  hint: /* wgsl */`
    struct HintUniforms {
      viewProjection: mat4x4<f32>,
      position: vec2<f32>,
      size: vec2<f32>,
      time: f32,
      _padding: vec3<f32>,
    }

    @group(0) @binding(0) var<uniform> uniforms: HintUniforms;

    struct VertexOutput {
      @builtin(position) position: vec4<f32>,
      @location(0) uv: vec2<f32>,
    }

    @vertex
    fn vertexMain(
      @location(0) vertexPos: vec3<f32>,
      @location(1) normal: vec3<f32>,
      @location(2) uv: vec2<f32>
    ) -> VertexOutput {
      var output: VertexOutput;

      var worldPos = vertexPos;
      worldPos.x = worldPos.x * uniforms.size.x + uniforms.position.x;
      worldPos.z = worldPos.z * uniforms.size.y + uniforms.position.y;
      worldPos.y = 0.001;

      output.position = uniforms.viewProjection * vec4<f32>(worldPos, 1.0);
      output.uv = uv;

      return output;
    }

    @fragment
    fn fragmentMain(input: VertexOutput) -> @location(0) vec4<f32> {
      // 發光框效果
      let borderWidth = 0.08;
      let innerBorder = borderWidth + 0.02;

      let edge = step(input.uv.x, borderWidth) + step(1.0 - borderWidth, input.uv.x) +
                 step(input.uv.y, borderWidth) + step(1.0 - borderWidth, input.uv.y);
      let inner = step(input.uv.x, innerBorder) + step(1.0 - innerBorder, input.uv.x) +
                  step(input.uv.y, innerBorder) + step(1.0 - innerBorder, input.uv.y);

      let border = clamp(edge - inner * 0.5, 0.0, 1.0);

      // 脈動
      let pulse = sin(uniforms.time * 3.0) * 0.3 + 0.7;
      let color = vec3<f32>(0.0, 1.0, 0.5) * pulse;

      return vec4<f32>(color, border * 0.6);
    }
  `
};
