/**
 * WebGPU 著色器集合
 * WGSL 語言實現 PBR 光照、粒子效果、後處理
 */

export const shaders = {
  // 3D 立體方塊著色器 - PBR 光照 + 發光效果
  tile: /* wgsl */`
    struct Uniforms {
      viewProj: mat4x4<f32>,
      view: mat4x4<f32>,
      cameraPos: vec3<f32>,
      time: f32,
      lightPos: vec3<f32>,
      _pad1: f32,
      lightColor: vec3<f32>,
      _pad2: f32,
      fillLightPos: vec3<f32>,
      _pad3: f32,
      fillLightColor: vec3<f32>,
      _pad4: f32,
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
      @location(5) scale: f32,
      @location(6) glow: f32,
      @location(7) value: f32,
      @location(8) animProgress: f32,
    };

    struct VertexOutput {
      @builtin(position) position: vec4<f32>,
      @location(0) worldPos: vec3<f32>,
      @location(1) normal: vec3<f32>,
      @location(2) uv: vec2<f32>,
      @location(3) color: vec4<f32>,
      @location(4) glow: f32,
      @location(5) value: f32,
    };

    @vertex
    fn vertexMain(
      vertex: VertexInput,
      instance: InstanceInput
    ) -> VertexOutput {
      var output: VertexOutput;

      // 應用縮放和位置
      let scaledPos = vertex.position * instance.scale;
      let worldPos = scaledPos + instance.instancePos;

      output.position = uniforms.viewProj * vec4<f32>(worldPos, 1.0);
      output.worldPos = worldPos;
      output.normal = vertex.normal;
      output.uv = vertex.uv;
      output.color = instance.color;
      output.glow = instance.glow;
      output.value = instance.value;

      return output;
    }

    // PBR 函數
    fn distributionGGX(N: vec3<f32>, H: vec3<f32>, roughness: f32) -> f32 {
      let a = roughness * roughness;
      let a2 = a * a;
      let NdotH = max(dot(N, H), 0.0);
      let NdotH2 = NdotH * NdotH;
      let denom = (NdotH2 * (a2 - 1.0) + 1.0);
      return a2 / (3.14159265 * denom * denom);
    }

    fn geometrySchlickGGX(NdotV: f32, roughness: f32) -> f32 {
      let r = roughness + 1.0;
      let k = (r * r) / 8.0;
      return NdotV / (NdotV * (1.0 - k) + k);
    }

    fn geometrySmith(N: vec3<f32>, V: vec3<f32>, L: vec3<f32>, roughness: f32) -> f32 {
      let NdotV = max(dot(N, V), 0.0);
      let NdotL = max(dot(N, L), 0.0);
      let ggx2 = geometrySchlickGGX(NdotV, roughness);
      let ggx1 = geometrySchlickGGX(NdotL, roughness);
      return ggx1 * ggx2;
    }

    fn fresnelSchlick(cosTheta: f32, F0: vec3<f32>) -> vec3<f32> {
      return F0 + (1.0 - F0) * pow(clamp(1.0 - cosTheta, 0.0, 1.0), 5.0);
    }

    @fragment
    fn fragmentMain(input: VertexOutput) -> @location(0) vec4<f32> {
      let N = normalize(input.normal);
      let V = normalize(uniforms.cameraPos - input.worldPos);

      // 材質屬性
      let baseColor = input.color.rgb;
      let metallic = 0.1;
      let roughness = 0.4;

      // F0 for dielectrics
      var F0 = vec3<f32>(0.04);
      F0 = mix(F0, baseColor, metallic);

      var Lo = vec3<f32>(0.0);

      // 主光源
      {
        let L = normalize(uniforms.lightPos - input.worldPos);
        let H = normalize(V + L);
        let distance = length(uniforms.lightPos - input.worldPos);
        let attenuation = 1.0 / (1.0 + 0.05 * distance * distance);
        let radiance = uniforms.lightColor * attenuation * 3.0;

        let NDF = distributionGGX(N, H, roughness);
        let G = geometrySmith(N, V, L, roughness);
        let F = fresnelSchlick(max(dot(H, V), 0.0), F0);

        let numerator = NDF * G * F;
        let denominator = 4.0 * max(dot(N, V), 0.0) * max(dot(N, L), 0.0) + 0.0001;
        let specular = numerator / denominator;

        let kS = F;
        let kD = (vec3<f32>(1.0) - kS) * (1.0 - metallic);

        let NdotL = max(dot(N, L), 0.0);
        Lo += (kD * baseColor / 3.14159265 + specular) * radiance * NdotL;
      }

      // 補光
      {
        let L = normalize(uniforms.fillLightPos - input.worldPos);
        let H = normalize(V + L);
        let distance = length(uniforms.fillLightPos - input.worldPos);
        let attenuation = 1.0 / (1.0 + 0.1 * distance * distance);
        let radiance = uniforms.fillLightColor * attenuation * 1.5;

        let NDF = distributionGGX(N, H, roughness);
        let G = geometrySmith(N, V, L, roughness);
        let F = fresnelSchlick(max(dot(H, V), 0.0), F0);

        let numerator = NDF * G * F;
        let denominator = 4.0 * max(dot(N, V), 0.0) * max(dot(N, L), 0.0) + 0.0001;
        let specular = numerator / denominator;

        let kS = F;
        let kD = (vec3<f32>(1.0) - kS) * (1.0 - metallic);

        let NdotL = max(dot(N, L), 0.0);
        Lo += (kD * baseColor / 3.14159265 + specular) * radiance * NdotL;
      }

      // 環境光
      let ambient = vec3<f32>(0.15, 0.15, 0.2) * baseColor;

      // 邊緣發光 (高數值方塊)
      let fresnel = pow(1.0 - max(dot(N, V), 0.0), 3.0);
      let glowColor = baseColor * input.glow * fresnel * 2.0;

      // 頂部發光效果
      let topGlow = max(0.0, N.y) * input.glow * 0.3 * baseColor;

      var finalColor = ambient + Lo + glowColor + topGlow;

      // 數字紋理效果 (較高數值有微微波紋)
      if (input.value >= 128.0) {
        let wave = sin(input.uv.x * 20.0 + uniforms.time * 2.0) * 0.02;
        finalColor += baseColor * wave * input.glow;
      }

      // 色調映射
      finalColor = finalColor / (finalColor + vec3<f32>(1.0));

      // Gamma 校正
      finalColor = pow(finalColor, vec3<f32>(1.0 / 2.2));

      return vec4<f32>(finalColor, 1.0);
    }
  `,

  // 網格底板著色器
  grid: /* wgsl */`
    struct Uniforms {
      viewProj: mat4x4<f32>,
      view: mat4x4<f32>,
      cameraPos: vec3<f32>,
      time: f32,
      lightPos: vec3<f32>,
      _pad1: f32,
      lightColor: vec3<f32>,
      _pad2: f32,
      fillLightPos: vec3<f32>,
      _pad3: f32,
      fillLightColor: vec3<f32>,
      _pad4: f32,
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

      // 底板顏色 - 深色金屬質感
      let baseColor = vec3<f32>(0.12, 0.11, 0.10);
      let metallic = 0.8;
      let roughness = 0.6;

      // 凹槽區域更暗
      var color = baseColor;
      if (input.worldPos.y > -0.45 && input.worldPos.y < -0.35) {
        color = vec3<f32>(0.08, 0.07, 0.06);
      }

      // 簡化光照
      let L = normalize(uniforms.lightPos - input.worldPos);
      let NdotL = max(dot(N, L), 0.0);

      let diffuse = color * NdotL * 0.6;
      let ambient = color * 0.4;

      // 高光
      let H = normalize(V + L);
      let spec = pow(max(dot(N, H), 0.0), 32.0) * 0.3;

      var finalColor = ambient + diffuse + vec3<f32>(spec);

      // Gamma 校正
      finalColor = pow(finalColor, vec3<f32>(1.0 / 2.2));

      return vec4<f32>(finalColor, 1.0);
    }
  `,

  // 粒子著色器
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

      // Billboard 頂點偏移
      let offsets = array<vec2<f32>, 4>(
        vec2<f32>(-1.0, -1.0),
        vec2<f32>(1.0, -1.0),
        vec2<f32>(-1.0, 1.0),
        vec2<f32>(1.0, 1.0)
      );

      let offset = offsets[vertexIndex % 4u];

      // 計算 billboard 方向
      let right = vec3<f32>(uniforms.view[0][0], uniforms.view[1][0], uniforms.view[2][0]);
      let up = vec3<f32>(uniforms.view[0][1], uniforms.view[1][1], uniforms.view[2][1]);

      let worldPos = input.position +
        right * offset.x * input.size +
        up * offset.y * input.size;

      output.position = uniforms.viewProj * vec4<f32>(worldPos, 1.0);

      // 淡出效果
      var alpha = input.color.a * input.life;
      output.color = vec4<f32>(input.color.rgb, alpha);
      output.uv = offset * 0.5 + 0.5;

      return output;
    }

    @fragment
    fn fragmentMain(input: VertexOutput) -> @location(0) vec4<f32> {
      // 圓形粒子
      let center = vec2<f32>(0.5);
      let dist = length(input.uv - center);

      if (dist > 0.5) {
        discard;
      }

      // 柔和邊緣
      let alpha = input.color.a * (1.0 - dist * 2.0);

      // 發光效果
      let glow = exp(-dist * 4.0) * 0.5;
      let finalColor = input.color.rgb + vec3<f32>(glow);

      return vec4<f32>(finalColor, alpha);
    }
  `,

  // 後處理 - Bloom 效果
  bloom: /* wgsl */`
    @group(0) @binding(0) var inputTexture: texture_2d<f32>;
    @group(0) @binding(1) var inputSampler: sampler;

    struct VertexOutput {
      @builtin(position) position: vec4<f32>,
      @location(0) uv: vec2<f32>,
    };

    @vertex
    fn vertexMain(@builtin(vertex_index) vertexIndex: u32) -> VertexOutput {
      var output: VertexOutput;

      // 全屏三角形
      let positions = array<vec2<f32>, 3>(
        vec2<f32>(-1.0, -1.0),
        vec2<f32>(3.0, -1.0),
        vec2<f32>(-1.0, 3.0)
      );

      let pos = positions[vertexIndex];
      output.position = vec4<f32>(pos, 0.0, 1.0);
      output.uv = pos * 0.5 + 0.5;
      output.uv.y = 1.0 - output.uv.y;

      return output;
    }

    @fragment
    fn fragmentMain(input: VertexOutput) -> @location(0) vec4<f32> {
      let texelSize = vec2<f32>(1.0 / 800.0, 1.0 / 600.0);

      // 高斯模糊
      var color = vec4<f32>(0.0);
      let weights = array<f32, 5>(0.227027, 0.1945946, 0.1216216, 0.054054, 0.016216);

      color += textureSample(inputTexture, inputSampler, input.uv) * weights[0];

      for (var i = 1; i < 5; i++) {
        let offset = texelSize * f32(i) * 2.0;
        color += textureSample(inputTexture, inputSampler, input.uv + vec2<f32>(offset.x, 0.0)) * weights[i];
        color += textureSample(inputTexture, inputSampler, input.uv - vec2<f32>(offset.x, 0.0)) * weights[i];
        color += textureSample(inputTexture, inputSampler, input.uv + vec2<f32>(0.0, offset.y)) * weights[i];
        color += textureSample(inputTexture, inputSampler, input.uv - vec2<f32>(0.0, offset.y)) * weights[i];
      }

      return color;
    }
  `
};
