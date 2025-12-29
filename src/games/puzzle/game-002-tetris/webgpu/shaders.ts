/**
 * WebGPU 著色器集合 - 俄羅斯方塊
 * WGSL 實現 PBR 光照、霓虹發光、消行特效
 */

export const shaders = {
  // 3D 方塊著色器 - 霓虹發光 + PBR
  block: /* wgsl */`
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
      @location(7) alpha: f32,
      @location(8) clearProgress: f32,
    };

    struct VertexOutput {
      @builtin(position) position: vec4<f32>,
      @location(0) worldPos: vec3<f32>,
      @location(1) normal: vec3<f32>,
      @location(2) uv: vec2<f32>,
      @location(3) color: vec4<f32>,
      @location(4) glow: f32,
      @location(5) alpha: f32,
      @location(6) clearProgress: f32,
    };

    @vertex
    fn vertexMain(
      vertex: VertexInput,
      instance: InstanceInput
    ) -> VertexOutput {
      var output: VertexOutput;

      let scaledPos = vertex.position * instance.scale;
      let worldPos = scaledPos + instance.instancePos;

      output.position = uniforms.viewProj * vec4<f32>(worldPos, 1.0);
      output.worldPos = worldPos;
      output.normal = vertex.normal;
      output.uv = vertex.uv;
      output.color = instance.color;
      output.glow = instance.glow;
      output.alpha = instance.alpha;
      output.clearProgress = instance.clearProgress;

      return output;
    }

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
      return geometrySchlickGGX(NdotV, roughness) * geometrySchlickGGX(NdotL, roughness);
    }

    fn fresnelSchlick(cosTheta: f32, F0: vec3<f32>) -> vec3<f32> {
      return F0 + (1.0 - F0) * pow(clamp(1.0 - cosTheta, 0.0, 1.0), 5.0);
    }

    @fragment
    fn fragmentMain(input: VertexOutput) -> @location(0) vec4<f32> {
      let N = normalize(input.normal);
      let V = normalize(uniforms.cameraPos - input.worldPos);

      let baseColor = input.color.rgb;
      let metallic = 0.2;
      let roughness = 0.35;

      var F0 = vec3<f32>(0.04);
      F0 = mix(F0, baseColor, metallic);

      var Lo = vec3<f32>(0.0);

      // 主光源
      {
        let L = normalize(uniforms.lightPos - input.worldPos);
        let H = normalize(V + L);
        let distance = length(uniforms.lightPos - input.worldPos);
        let attenuation = 1.0 / (1.0 + 0.02 * distance * distance);
        let radiance = uniforms.lightColor * attenuation * 2.5;

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
        let attenuation = 1.0 / (1.0 + 0.05 * distance * distance);
        let radiance = uniforms.fillLightColor * attenuation * 1.5;

        let NdotL = max(dot(N, L), 0.0);
        Lo += baseColor * radiance * NdotL * 0.5;
      }

      // 環境光
      let ambient = vec3<f32>(0.08, 0.08, 0.12) * baseColor;

      // 霓虹發光效果
      let fresnel = pow(1.0 - max(dot(N, V), 0.0), 3.0);
      let neonGlow = baseColor * fresnel * input.glow * 2.0;

      // 邊緣發光
      let edgeGlow = baseColor * input.glow * 0.5;

      var finalColor = ambient + Lo + neonGlow + edgeGlow;

      // 消除特效
      if (input.clearProgress > 0.0) {
        let flash = sin(uniforms.time * 30.0) * 0.5 + 0.5;
        finalColor = mix(finalColor, vec3<f32>(1.0), flash * input.clearProgress);
      }

      // 色調映射
      finalColor = finalColor / (finalColor + vec3<f32>(1.0));

      // Gamma 校正
      finalColor = pow(finalColor, vec3<f32>(1.0 / 2.2));

      return vec4<f32>(finalColor, input.alpha);
    }
  `,

  // 網格著色器
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

      // 深色金屬質感
      var baseColor = vec3<f32>(0.06, 0.06, 0.08);

      // 網格線效果
      let gridX = fract(input.worldPos.x);
      let gridY = fract(input.worldPos.y);
      let lineWidth = 0.03;

      if (gridX < lineWidth || gridX > 1.0 - lineWidth ||
          gridY < lineWidth || gridY > 1.0 - lineWidth) {
        baseColor = vec3<f32>(0.1, 0.1, 0.15);
      }

      // 簡化光照
      let L = normalize(uniforms.lightPos - input.worldPos);
      let NdotL = max(dot(N, L), 0.0);
      let diffuse = baseColor * NdotL * 0.4;
      let ambient = baseColor * 0.6;

      // 微弱的邊緣發光
      let fresnel = pow(1.0 - max(dot(N, V), 0.0), 4.0);
      let rimLight = vec3<f32>(0.1, 0.1, 0.2) * fresnel;

      var finalColor = ambient + diffuse + rimLight;

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

      var alpha = input.color.a * input.life;
      output.color = vec4<f32>(input.color.rgb, alpha);
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
      let glow = exp(-dist * 3.0) * 0.8;
      let finalColor = input.color.rgb * (1.0 + glow);

      return vec4<f32>(finalColor, alpha);
    }
  `
};
