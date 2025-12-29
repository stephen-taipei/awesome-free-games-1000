/**
 * WebGPU 著色器集合 - 數獨
 * WGSL 實現玻璃質感、霓虹發光、數字渲染
 */

export const shaders = {
  // 3D 格子著色器 - 玻璃質感
  cell: /* wgsl */`
    struct Uniforms {
      viewProj: mat4x4<f32>,
      view: mat4x4<f32>,
      cameraPos: vec3<f32>,
      time: f32,
      lightPos: vec3<f32>,
      _pad1: f32,
      lightColor: vec3<f32>,
      _pad2: f32,
    };

    @group(0) @binding(0) var<uniform> uniforms: Uniforms;

    struct VertexInput {
      @location(0) position: vec3<f32>,
      @location(1) normal: vec3<f32>,
      @location(2) uv: vec2<f32>,
    };

    struct InstanceInput {
      @location(3) instancePos: vec3<f32>,
      @location(4) color: vec4<f32>,
      @location(5) state: f32,      // 0=normal, 1=selected, 2=highlighted, 3=error
      @location(6) glow: f32,
      @location(7) alpha: f32,
    };

    struct VertexOutput {
      @builtin(position) position: vec4<f32>,
      @location(0) worldPos: vec3<f32>,
      @location(1) normal: vec3<f32>,
      @location(2) uv: vec2<f32>,
      @location(3) color: vec4<f32>,
      @location(4) state: f32,
      @location(5) glow: f32,
      @location(6) alpha: f32,
    };

    @vertex
    fn vertexMain(
      vertex: VertexInput,
      instance: InstanceInput
    ) -> VertexOutput {
      var output: VertexOutput;

      let worldPos = vertex.position + instance.instancePos;

      output.position = uniforms.viewProj * vec4<f32>(worldPos, 1.0);
      output.worldPos = worldPos;
      output.normal = vertex.normal;
      output.uv = vertex.uv;
      output.color = instance.color;
      output.state = instance.state;
      output.glow = instance.glow;
      output.alpha = instance.alpha;

      return output;
    }

    @fragment
    fn fragmentMain(input: VertexOutput) -> @location(0) vec4<f32> {
      let N = normalize(input.normal);
      let V = normalize(uniforms.cameraPos - input.worldPos);
      let L = normalize(uniforms.lightPos - input.worldPos);
      let H = normalize(V + L);

      var baseColor = input.color.rgb;

      // 根據狀態調整顏色
      if (input.state > 2.5) {
        // 錯誤 - 紅色脈動
        let pulse = sin(uniforms.time * 8.0) * 0.3 + 0.7;
        baseColor = vec3<f32>(1.0, 0.2, 0.2) * pulse;
      } else if (input.state > 1.5) {
        // 高亮 - 金色微光
        baseColor = mix(baseColor, vec3<f32>(1.0, 0.9, 0.5), 0.3);
      } else if (input.state > 0.5) {
        // 選中 - 青色發光
        let pulse = sin(uniforms.time * 3.0) * 0.15 + 0.85;
        baseColor = vec3<f32>(0.2, 0.8, 1.0) * pulse;
      }

      // 玻璃質感 - 高反射
      let metallic = 0.1;
      let roughness = 0.2;

      // 漫反射
      let NdotL = max(dot(N, L), 0.0);
      let diffuse = baseColor * NdotL * 0.6;

      // 鏡面反射 (Blinn-Phong)
      let NdotH = max(dot(N, H), 0.0);
      let specular = pow(NdotH, 64.0) * 0.8;

      // 菲涅爾邊緣光
      let fresnel = pow(1.0 - max(dot(N, V), 0.0), 3.0);
      let rimLight = baseColor * fresnel * input.glow * 1.5;

      // 環境光
      let ambient = baseColor * 0.15;

      // 3x3 宮格邊界發光
      let gridX = fract(input.worldPos.x / 3.0);
      let gridZ = fract(input.worldPos.z / 3.0);
      var gridGlow = 0.0;
      if (gridX < 0.05 || gridX > 0.95 || gridZ < 0.05 || gridZ > 0.95) {
        gridGlow = 0.3;
      }

      var finalColor = ambient + diffuse + specular + rimLight;
      finalColor += vec3<f32>(0.3, 0.5, 1.0) * gridGlow;

      // 色調映射
      finalColor = finalColor / (finalColor + vec3<f32>(1.0));
      finalColor = pow(finalColor, vec3<f32>(1.0 / 2.2));

      return vec4<f32>(finalColor, input.alpha);
    }
  `,

  // 數字著色器 - 發光數字
  number: /* wgsl */`
    struct Uniforms {
      viewProj: mat4x4<f32>,
      view: mat4x4<f32>,
      cameraPos: vec3<f32>,
      time: f32,
    };

    @group(0) @binding(0) var<uniform> uniforms: Uniforms;

    struct VertexInput {
      @location(0) position: vec3<f32>,
      @location(1) uv: vec2<f32>,
    };

    struct InstanceInput {
      @location(2) instancePos: vec3<f32>,
      @location(3) color: vec4<f32>,
      @location(4) digit: f32,
      @location(5) isFixed: f32,
      @location(6) scale: f32,
    };

    struct VertexOutput {
      @builtin(position) position: vec4<f32>,
      @location(0) uv: vec2<f32>,
      @location(1) color: vec4<f32>,
      @location(2) digit: f32,
      @location(3) isFixed: f32,
    };

    @vertex
    fn vertexMain(
      vertex: VertexInput,
      instance: InstanceInput
    ) -> VertexOutput {
      var output: VertexOutput;

      // Billboard - 面向相機
      let right = vec3<f32>(uniforms.view[0][0], uniforms.view[1][0], uniforms.view[2][0]);
      let up = vec3<f32>(uniforms.view[0][1], uniforms.view[1][1], uniforms.view[2][1]);

      let scaledPos = vertex.position * instance.scale;
      let worldPos = instance.instancePos +
        right * scaledPos.x +
        up * scaledPos.y;

      output.position = uniforms.viewProj * vec4<f32>(worldPos, 1.0);
      output.uv = vertex.uv;
      output.color = instance.color;
      output.digit = instance.digit;
      output.isFixed = instance.isFixed;

      return output;
    }

    // 7-segment 數字渲染
    fn drawDigit(uv: vec2<f32>, digit: i32) -> f32 {
      // 標準化 UV 到 0-1
      let u = uv.x;
      let v = uv.y;

      // 線段寬度
      let w = 0.15;
      let g = 0.08; // 間隙

      // 各段定義 (a=top, b=topRight, c=bottomRight, d=bottom, e=bottomLeft, f=topLeft, g=middle)
      // 數字編碼: 0=abcdef, 1=bc, 2=abdeg, 3=abcdg, 4=bcfg, 5=acdfg, 6=acdefg, 7=abc, 8=abcdefg, 9=abcdfg
      let segments = array<i32, 10>(
        0x3F, 0x06, 0x5B, 0x4F, 0x66, 0x6D, 0x7D, 0x07, 0x7F, 0x6F
      );

      let seg = segments[digit];
      var alpha = 0.0;

      // a - 頂部水平
      if ((seg & 1) != 0) {
        if (v > 0.85 - w && v < 0.85 + w && u > g && u < 1.0 - g) {
          alpha = max(alpha, 1.0);
        }
      }

      // b - 右上垂直
      if ((seg & 2) != 0) {
        if (u > 0.85 - w && u < 0.85 + w && v > 0.5 + g && v < 0.85 - g) {
          alpha = max(alpha, 1.0);
        }
      }

      // c - 右下垂直
      if ((seg & 4) != 0) {
        if (u > 0.85 - w && u < 0.85 + w && v > 0.15 + g && v < 0.5 - g) {
          alpha = max(alpha, 1.0);
        }
      }

      // d - 底部水平
      if ((seg & 8) != 0) {
        if (v > 0.15 - w && v < 0.15 + w && u > g && u < 1.0 - g) {
          alpha = max(alpha, 1.0);
        }
      }

      // e - 左下垂直
      if ((seg & 16) != 0) {
        if (u > 0.15 - w && u < 0.15 + w && v > 0.15 + g && v < 0.5 - g) {
          alpha = max(alpha, 1.0);
        }
      }

      // f - 左上垂直
      if ((seg & 32) != 0) {
        if (u > 0.15 - w && u < 0.15 + w && v > 0.5 + g && v < 0.85 - g) {
          alpha = max(alpha, 1.0);
        }
      }

      // g - 中間水平
      if ((seg & 64) != 0) {
        if (v > 0.5 - w && v < 0.5 + w && u > g && u < 1.0 - g) {
          alpha = max(alpha, 1.0);
        }
      }

      return alpha;
    }

    @fragment
    fn fragmentMain(input: VertexOutput) -> @location(0) vec4<f32> {
      let digit = i32(input.digit);

      if (digit < 1 || digit > 9) {
        discard;
      }

      let alpha = drawDigit(input.uv, digit);

      if (alpha < 0.1) {
        discard;
      }

      var color = input.color.rgb;

      // 固定數字使用白色，玩家輸入使用青色
      if (input.isFixed > 0.5) {
        color = vec3<f32>(0.95, 0.95, 1.0);
      } else {
        color = vec3<f32>(0.3, 0.9, 1.0);
      }

      // 發光效果
      let glow = exp(-length(input.uv - vec2<f32>(0.5)) * 2.0) * 0.5;
      color += color * glow;

      return vec4<f32>(color, alpha * input.color.a);
    }
  `,

  // 背景網格著色器
  grid: /* wgsl */`
    struct Uniforms {
      viewProj: mat4x4<f32>,
      view: mat4x4<f32>,
      cameraPos: vec3<f32>,
      time: f32,
    };

    @group(0) @binding(0) var<uniform> uniforms: Uniforms;

    struct VertexInput {
      @location(0) position: vec3<f32>,
      @location(1) normal: vec3<f32>,
    };

    struct VertexOutput {
      @builtin(position) position: vec4<f32>,
      @location(0) worldPos: vec3<f32>,
      @location(1) normal: vec3<f32>,
    };

    @vertex
    fn vertexMain(input: VertexInput) -> VertexOutput {
      var output: VertexOutput;
      output.position = uniforms.viewProj * vec4<f32>(input.position, 1.0);
      output.worldPos = input.position;
      output.normal = input.normal;
      return output;
    }

    @fragment
    fn fragmentMain(input: VertexOutput) -> @location(0) vec4<f32> {
      let N = normalize(input.normal);
      let V = normalize(uniforms.cameraPos - input.worldPos);

      // 深色金屬底座
      var baseColor = vec3<f32>(0.03, 0.03, 0.06);

      // 細網格線
      let gridX = fract(input.worldPos.x);
      let gridZ = fract(input.worldPos.z);
      let lineWidth = 0.02;

      if (gridX < lineWidth || gridX > 1.0 - lineWidth ||
          gridZ < lineWidth || gridZ > 1.0 - lineWidth) {
        baseColor = vec3<f32>(0.08, 0.08, 0.12);
      }

      // 3x3 宮格粗線
      let boxX = fract(input.worldPos.x / 3.0);
      let boxZ = fract(input.worldPos.z / 3.0);
      let thickLine = 0.02;

      if (boxX < thickLine || boxX > 1.0 - thickLine ||
          boxZ < thickLine || boxZ > 1.0 - thickLine) {
        baseColor = vec3<f32>(0.2, 0.3, 0.5);
      }

      // 邊緣發光
      let fresnel = pow(1.0 - max(dot(N, V), 0.0), 4.0);
      let rimLight = vec3<f32>(0.1, 0.15, 0.3) * fresnel;

      var finalColor = baseColor + rimLight;
      finalColor = pow(finalColor, vec3<f32>(1.0 / 2.2));

      return vec4<f32>(finalColor, 1.0);
    }
  `,

  // 粒子著色器 - 正確填入特效
  particle: /* wgsl */`
    struct Uniforms {
      viewProj: mat4x4<f32>,
      view: mat4x4<f32>,
      cameraPos: vec3<f32>,
      time: f32,
    };

    @group(0) @binding(0) var<uniform> uniforms: Uniforms;

    struct VertexInput {
      @location(0) position: vec3<f32>,
      @location(1) velocity: vec3<f32>,
      @location(2) color: vec4<f32>,
      @location(3) size: f32,
      @location(4) life: f32,
    };

    struct VertexOutput {
      @builtin(position) position: vec4<f32>,
      @location(0) color: vec4<f32>,
      @location(1) uv: vec2<f32>,
    };

    @vertex
    fn vertexMain(
      input: VertexInput,
      @builtin(vertex_index) vertexIndex: u32
    ) -> VertexOutput {
      var output: VertexOutput;

      let offsets = array<vec2<f32>, 4>(
        vec2<f32>(-1.0, -1.0),
        vec2<f32>(1.0, -1.0),
        vec2<f32>(-1.0, 1.0),
        vec2<f32>(1.0, 1.0)
      );

      let offset = offsets[vertexIndex % 4u];

      let right = vec3<f32>(uniforms.view[0][0], uniforms.view[1][0], uniforms.view[2][0]);
      let up = vec3<f32>(uniforms.view[0][1], uniforms.view[1][1], uniforms.view[2][1]);

      let worldPos = input.position +
        right * offset.x * input.size +
        up * offset.y * input.size;

      output.position = uniforms.viewProj * vec4<f32>(worldPos, 1.0);
      output.color = vec4<f32>(input.color.rgb, input.color.a * input.life);
      output.uv = offset * 0.5 + 0.5;

      return output;
    }

    @fragment
    fn fragmentMain(input: VertexOutput) -> @location(0) vec4<f32> {
      let center = vec2<f32>(0.5);
      let dist = length(input.uv - center);

      if (dist > 0.5) {
        discard;
      }

      let alpha = input.color.a * (1.0 - dist * 2.0);
      let glow = exp(-dist * 4.0) * 1.2;
      let finalColor = input.color.rgb * (1.0 + glow);

      return vec4<f32>(finalColor, alpha);
    }
  `,

  // 勝利特效著色器
  victory: /* wgsl */`
    struct Uniforms {
      viewProj: mat4x4<f32>,
      view: mat4x4<f32>,
      cameraPos: vec3<f32>,
      time: f32,
    };

    @group(0) @binding(0) var<uniform> uniforms: Uniforms;

    struct VertexInput {
      @location(0) position: vec3<f32>,
    };

    struct VertexOutput {
      @builtin(position) position: vec4<f32>,
      @location(0) worldPos: vec3<f32>,
    };

    @vertex
    fn vertexMain(input: VertexInput) -> VertexOutput {
      var output: VertexOutput;
      output.position = uniforms.viewProj * vec4<f32>(input.position, 1.0);
      output.worldPos = input.position;
      return output;
    }

    @fragment
    fn fragmentMain(input: VertexOutput) -> @location(0) vec4<f32> {
      // 彩虹波動
      let wave = sin(input.worldPos.x * 2.0 + uniforms.time * 3.0) * 0.5 + 0.5;
      let wave2 = sin(input.worldPos.z * 2.0 + uniforms.time * 2.5) * 0.5 + 0.5;

      let r = sin(uniforms.time * 2.0 + input.worldPos.x) * 0.5 + 0.5;
      let g = sin(uniforms.time * 2.0 + input.worldPos.z + 2.094) * 0.5 + 0.5;
      let b = sin(uniforms.time * 2.0 + input.worldPos.x + input.worldPos.z + 4.188) * 0.5 + 0.5;

      let color = vec3<f32>(r, g, b) * wave * wave2;
      let alpha = 0.3 + wave * 0.2;

      return vec4<f32>(color, alpha);
    }
  `
};
