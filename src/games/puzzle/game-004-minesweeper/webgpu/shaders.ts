/**
 * WebGPU WGSL 著色器 - 踩地雷 3D 渲染
 * 包含方塊、地雷、旗幟、數字和粒子特效
 */

export const shaders = {
  // 頂點和片段著色器 - 3D 方塊 (隱藏/揭開狀態)
  cell: /* wgsl */ `
    struct Uniforms {
      viewProjection: mat4x4<f32>,
      time: f32,
      cameraPos: vec3<f32>,
      gridSize: vec2<f32>,
    }

    struct CellInstance {
      @location(3) position: vec3<f32>,
      @location(4) state: f32,      // 0=hidden, 1=revealed, 2=flagged, 3=mine, 4=exploded
      @location(5) adjacentMines: f32,
      @location(6) revealProgress: f32,
      @location(7) hoverIntensity: f32,
    }

    struct VertexOutput {
      @builtin(position) position: vec4<f32>,
      @location(0) worldPos: vec3<f32>,
      @location(1) normal: vec3<f32>,
      @location(2) uv: vec2<f32>,
      @location(3) state: f32,
      @location(4) adjacentMines: f32,
      @location(5) revealProgress: f32,
      @location(6) hoverIntensity: f32,
      @location(7) localPos: vec3<f32>,
    }

    @group(0) @binding(0) var<uniform> uniforms: Uniforms;

    // 立方體頂點資料
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
      instance: CellInstance
    ) -> VertexOutput {
      var output: VertexOutput;

      let pos = positions[vertexIndex];
      let normal = normals[vertexIndex];

      // 揭開動畫 - 方塊下沉並縮小
      var scale = 0.9;
      var yOffset = 0.0;

      if (instance.state == 1.0 || instance.revealProgress > 0.0) {
        // 揭開後方塊下沉
        let progress = max(instance.revealProgress, select(0.0, 1.0, instance.state == 1.0));
        yOffset = -0.3 * progress;
        scale = 0.9 - 0.2 * progress;
      }

      // 懸停效果 - 方塊浮起
      yOffset += instance.hoverIntensity * 0.15;
      scale += instance.hoverIntensity * 0.05;

      // 爆炸狀態 - 方塊震動
      if (instance.state == 4.0) {
        let shake = sin(uniforms.time * 50.0) * 0.1;
        yOffset += shake;
      }

      let scaledPos = pos * scale;
      let worldPos = vec3(
        instance.position.x + scaledPos.x,
        instance.position.y + scaledPos.y + yOffset,
        instance.position.z + scaledPos.z
      );

      output.position = uniforms.viewProjection * vec4(worldPos, 1.0);
      output.worldPos = worldPos;
      output.normal = normal;
      output.uv = vec2((pos.x + 0.5), (pos.z + 0.5));
      output.state = instance.state;
      output.adjacentMines = instance.adjacentMines;
      output.revealProgress = instance.revealProgress;
      output.hoverIntensity = instance.hoverIntensity;
      output.localPos = pos;

      return output;
    }

    // PBR 光照函數
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
      let L = normalize(vec3(2.0, 5.0, 3.0));
      let H = normalize(V + L);

      let NdotL = max(dot(N, L), 0.0);
      let NdotV = max(dot(N, V), 0.0);
      let NdotH = max(dot(N, H), 0.0);

      var baseColor: vec3<f32>;
      var roughness = 0.4;
      var metallic = 0.1;
      var emissive = vec3(0.0);

      // 根據狀態選擇顏色
      if (input.state == 0.0 || input.revealProgress < 1.0) {
        // 隱藏狀態 - 霓虹青色金屬
        let revealMix = input.revealProgress;
        let hiddenColor = vec3(0.1, 0.8, 0.9);
        let revealedColor = vec3(0.15, 0.15, 0.2);
        baseColor = mix(hiddenColor, revealedColor, revealMix);
        roughness = mix(0.3, 0.6, revealMix);
        metallic = mix(0.7, 0.1, revealMix);

        // 隱藏方塊發光效果
        let glowPulse = sin(uniforms.time * 2.0 + input.worldPos.x * 0.5) * 0.5 + 0.5;
        emissive = vec3(0.0, 0.3, 0.4) * glowPulse * (1.0 - revealMix);
      } else if (input.state == 1.0) {
        // 揭開狀態 - 根據周圍地雷數顯示不同顏色
        if (input.adjacentMines == 0.0) {
          baseColor = vec3(0.1, 0.1, 0.15);
        } else if (input.adjacentMines == 1.0) {
          baseColor = vec3(0.1, 0.3, 0.8);
          emissive = vec3(0.0, 0.1, 0.3);
        } else if (input.adjacentMines == 2.0) {
          baseColor = vec3(0.1, 0.7, 0.3);
          emissive = vec3(0.0, 0.2, 0.1);
        } else if (input.adjacentMines == 3.0) {
          baseColor = vec3(0.9, 0.2, 0.2);
          emissive = vec3(0.3, 0.0, 0.0);
        } else if (input.adjacentMines == 4.0) {
          baseColor = vec3(0.2, 0.2, 0.8);
          emissive = vec3(0.1, 0.0, 0.3);
        } else if (input.adjacentMines == 5.0) {
          baseColor = vec3(0.7, 0.2, 0.2);
          emissive = vec3(0.2, 0.0, 0.0);
        } else if (input.adjacentMines == 6.0) {
          baseColor = vec3(0.2, 0.7, 0.7);
          emissive = vec3(0.0, 0.2, 0.2);
        } else if (input.adjacentMines == 7.0) {
          baseColor = vec3(0.3, 0.3, 0.3);
          emissive = vec3(0.1, 0.1, 0.1);
        } else {
          baseColor = vec3(0.5, 0.5, 0.5);
          emissive = vec3(0.15, 0.15, 0.15);
        }
        roughness = 0.6;
      } else if (input.state == 2.0) {
        // 旗幟狀態 - 橙色警告
        baseColor = vec3(1.0, 0.5, 0.1);
        emissive = vec3(0.4, 0.2, 0.0) * (sin(uniforms.time * 3.0) * 0.3 + 0.7);
        metallic = 0.5;
        roughness = 0.3;
      } else if (input.state == 3.0) {
        // 地雷狀態 - 紅色危險
        baseColor = vec3(0.8, 0.1, 0.1);
        emissive = vec3(0.5, 0.0, 0.0);
        metallic = 0.8;
        roughness = 0.2;
      } else if (input.state == 4.0) {
        // 爆炸狀態 - 亮紅閃爍
        let flash = sin(uniforms.time * 20.0) * 0.5 + 0.5;
        baseColor = vec3(1.0, 0.2, 0.0);
        emissive = vec3(1.0, 0.3, 0.0) * flash;
        metallic = 0.9;
        roughness = 0.1;
      }

      // 懸停高亮
      let hoverGlow = input.hoverIntensity * 0.3;
      emissive += vec3(0.2, 0.5, 0.6) * hoverGlow;

      // PBR 計算
      let F0 = mix(vec3(0.04), baseColor, metallic);
      let D = ggxDistribution(NdotH, roughness);
      let G = smithGeometry(NdotV, NdotL, roughness);
      let F = fresnelSchlick(max(dot(H, V), 0.0), F0);

      let specular = (D * G * F) / max(4.0 * NdotV * NdotL, 0.001);
      let kD = (1.0 - F) * (1.0 - metallic);
      let diffuse = kD * baseColor / 3.14159;

      let ambient = vec3(0.03) * baseColor;
      var color = ambient + (diffuse + specular) * NdotL * vec3(1.0, 0.95, 0.9) + emissive;

      // 邊緣發光
      let rim = pow(1.0 - NdotV, 3.0);
      color += rim * vec3(0.1, 0.3, 0.4) * 0.5;

      // 色調映射
      color = color / (color + vec3(1.0));
      color = pow(color, vec3(1.0 / 2.2));

      return vec4(color, 1.0);
    }
  `,

  // 地雷著色器
  mine: /* wgsl */ `
    struct Uniforms {
      viewProjection: mat4x4<f32>,
      time: f32,
      cameraPos: vec3<f32>,
    }

    struct MineInstance {
      @location(3) position: vec3<f32>,
      @location(4) scale: f32,
      @location(5) exploding: f32,
    }

    struct VertexOutput {
      @builtin(position) position: vec4<f32>,
      @location(0) worldPos: vec3<f32>,
      @location(1) normal: vec3<f32>,
      @location(2) exploding: f32,
      @location(3) localPos: vec3<f32>,
    }

    @group(0) @binding(0) var<uniform> uniforms: Uniforms;

    // 球體頂點生成
    @vertex
    fn vertexMain(
      @builtin(vertex_index) vertexIndex: u32,
      instance: MineInstance
    ) -> VertexOutput {
      var output: VertexOutput;

      // 生成球體頂點 (icosphere 近似)
      let segments = 16u;
      let rings = 12u;

      let faceIndex = vertexIndex / 3u;
      let vertInFace = vertexIndex % 3u;

      let ringIndex = faceIndex / (segments * 2u);
      let segIndex = (faceIndex % (segments * 2u)) / 2u;
      let isUpper = (faceIndex % 2u) == 0u;

      var theta: f32;
      var phi: f32;

      let ringF = f32(ringIndex);
      let segF = f32(segIndex);
      let ringsF = f32(rings);
      let segmentsF = f32(segments);

      if (isUpper) {
        if (vertInFace == 0u) {
          theta = ringF / ringsF * 3.14159;
          phi = segF / segmentsF * 6.28318;
        } else if (vertInFace == 1u) {
          theta = (ringF + 1.0) / ringsF * 3.14159;
          phi = segF / segmentsF * 6.28318;
        } else {
          theta = (ringF + 1.0) / ringsF * 3.14159;
          phi = (segF + 1.0) / segmentsF * 6.28318;
        }
      } else {
        if (vertInFace == 0u) {
          theta = ringF / ringsF * 3.14159;
          phi = segF / segmentsF * 6.28318;
        } else if (vertInFace == 1u) {
          theta = (ringF + 1.0) / ringsF * 3.14159;
          phi = (segF + 1.0) / segmentsF * 6.28318;
        } else {
          theta = ringF / ringsF * 3.14159;
          phi = (segF + 1.0) / segmentsF * 6.28318;
        }
      }

      let localPos = vec3(
        sin(theta) * cos(phi),
        cos(theta),
        sin(theta) * sin(phi)
      );

      // 地雷刺突
      let spikeFreq = 8.0;
      let spike = max(0.0, sin(localPos.x * spikeFreq) * sin(localPos.y * spikeFreq) * sin(localPos.z * spikeFreq));
      let spikeScale = 1.0 + spike * 0.3;

      var scale = instance.scale * 0.35 * spikeScale;

      // 爆炸動畫
      if (instance.exploding > 0.0) {
        scale *= 1.0 + instance.exploding * 2.0;
      }

      // 脈動效果
      let pulse = sin(uniforms.time * 4.0) * 0.05 + 1.0;
      scale *= pulse;

      let worldPos = instance.position + localPos * scale;

      output.position = uniforms.viewProjection * vec4(worldPos, 1.0);
      output.worldPos = worldPos;
      output.normal = localPos;
      output.exploding = instance.exploding;
      output.localPos = localPos;

      return output;
    }

    @fragment
    fn fragmentMain(input: VertexOutput) -> @location(0) vec4<f32> {
      let N = normalize(input.normal);
      let V = normalize(uniforms.cameraPos - input.worldPos);
      let L = normalize(vec3(2.0, 5.0, 3.0));

      let NdotL = max(dot(N, L), 0.0);
      let NdotV = max(dot(N, V), 0.0);

      // 地雷基礎顏色 - 深灰金屬
      var baseColor = vec3(0.15, 0.15, 0.18);
      var emissive = vec3(0.0);

      // 爆炸時變紅發光
      if (input.exploding > 0.0) {
        baseColor = mix(baseColor, vec3(1.0, 0.2, 0.0), input.exploding);
        emissive = vec3(1.0, 0.3, 0.0) * input.exploding * 2.0;
      }

      // 危險警告脈動
      let danger = sin(uniforms.time * 5.0) * 0.5 + 0.5;
      emissive += vec3(0.3, 0.0, 0.0) * danger * 0.3;

      // 簡化光照
      let ambient = vec3(0.05) * baseColor;
      let diffuse = baseColor * NdotL;
      let specular = pow(max(dot(reflect(-L, N), V), 0.0), 32.0) * vec3(0.5);

      var color = ambient + diffuse + specular + emissive;

      // 邊緣發光
      let rim = pow(1.0 - NdotV, 3.0);
      color += rim * vec3(0.5, 0.1, 0.0) * 0.5;

      // 色調映射
      color = color / (color + vec3(1.0));
      color = pow(color, vec3(1.0 / 2.2));

      return vec4(color, 1.0);
    }
  `,

  // 旗幟著色器
  flag: /* wgsl */ `
    struct Uniforms {
      viewProjection: mat4x4<f32>,
      time: f32,
      cameraPos: vec3<f32>,
    }

    struct FlagInstance {
      @location(3) position: vec3<f32>,
      @location(4) scale: f32,
    }

    struct VertexOutput {
      @builtin(position) position: vec4<f32>,
      @location(0) worldPos: vec3<f32>,
      @location(1) normal: vec3<f32>,
      @location(2) uv: vec2<f32>,
      @location(3) partId: f32,
    }

    @group(0) @binding(0) var<uniform> uniforms: Uniforms;

    @vertex
    fn vertexMain(
      @builtin(vertex_index) vertexIndex: u32,
      instance: FlagInstance
    ) -> VertexOutput {
      var output: VertexOutput;

      // 旗幟由旗杆和旗面組成
      var localPos: vec3<f32>;
      var normal: vec3<f32>;
      var uv: vec2<f32>;
      var partId: f32;

      if (vertexIndex < 12u) {
        // 旗杆 (細長圓柱近似為方形)
        let poleVerts = array<vec3<f32>, 12>(
          vec3(-0.02, 0.0, -0.02), vec3(0.02, 0.0, -0.02), vec3(0.02, 0.6, -0.02),
          vec3(-0.02, 0.0, -0.02), vec3(0.02, 0.6, -0.02), vec3(-0.02, 0.6, -0.02),
          vec3(0.02, 0.0, 0.02), vec3(-0.02, 0.0, 0.02), vec3(-0.02, 0.6, 0.02),
          vec3(0.02, 0.0, 0.02), vec3(-0.02, 0.6, 0.02), vec3(0.02, 0.6, 0.02),
        );
        localPos = poleVerts[vertexIndex];
        normal = vec3(0.0, 0.0, 1.0);
        uv = vec2(0.0, localPos.y);
        partId = 0.0;
      } else {
        // 旗面 (三角形)
        let flagVerts = array<vec3<f32>, 6>(
          vec3(0.0, 0.6, 0.0), vec3(0.0, 0.35, 0.0), vec3(0.25, 0.475, 0.0),
          vec3(0.0, 0.6, 0.0), vec3(0.25, 0.475, 0.0), vec3(0.0, 0.35, 0.0),
        );
        let idx = vertexIndex - 12u;
        localPos = flagVerts[idx];

        // 旗幟飄動效果
        let wave = sin(uniforms.time * 4.0 + localPos.x * 10.0) * 0.02;
        localPos.z += wave * localPos.x;

        normal = vec3(0.0, 0.0, 1.0);
        uv = vec2(localPos.x, localPos.y);
        partId = 1.0;
      }

      let worldPos = instance.position + localPos * instance.scale;

      output.position = uniforms.viewProjection * vec4(worldPos, 1.0);
      output.worldPos = worldPos;
      output.normal = normal;
      output.uv = uv;
      output.partId = partId;

      return output;
    }

    @fragment
    fn fragmentMain(input: VertexOutput) -> @location(0) vec4<f32> {
      var color: vec3<f32>;
      var emissive = vec3(0.0);

      if (input.partId < 0.5) {
        // 旗杆 - 金屬銀色
        color = vec3(0.7, 0.7, 0.75);
      } else {
        // 旗面 - 霓虹橙色
        color = vec3(1.0, 0.4, 0.1);
        let pulse = sin(uniforms.time * 3.0) * 0.3 + 0.7;
        emissive = vec3(0.5, 0.2, 0.0) * pulse;
      }

      let N = normalize(input.normal);
      let V = normalize(uniforms.cameraPos - input.worldPos);
      let L = normalize(vec3(2.0, 5.0, 3.0));

      let NdotL = max(dot(N, L), 0.0);

      let ambient = vec3(0.1) * color;
      let diffuse = color * NdotL;

      var finalColor = ambient + diffuse + emissive;

      // 色調映射
      finalColor = finalColor / (finalColor + vec3(1.0));
      finalColor = pow(finalColor, vec3(1.0 / 2.2));

      return vec4(finalColor, 1.0);
    }
  `,

  // 數字著色器 (顯示在揭開的方塊上)
  number: /* wgsl */ `
    struct Uniforms {
      viewProjection: mat4x4<f32>,
      time: f32,
      cameraPos: vec3<f32>,
    }

    struct NumberInstance {
      @location(3) position: vec3<f32>,
      @location(4) number: f32,
      @location(5) scale: f32,
    }

    struct VertexOutput {
      @builtin(position) position: vec4<f32>,
      @location(0) uv: vec2<f32>,
      @location(1) number: f32,
    }

    @group(0) @binding(0) var<uniform> uniforms: Uniforms;

    @vertex
    fn vertexMain(
      @builtin(vertex_index) vertexIndex: u32,
      instance: NumberInstance
    ) -> VertexOutput {
      var output: VertexOutput;

      // 廣告牌四邊形
      let verts = array<vec2<f32>, 6>(
        vec2(-0.5, -0.5), vec2(0.5, -0.5), vec2(0.5, 0.5),
        vec2(-0.5, -0.5), vec2(0.5, 0.5), vec2(-0.5, 0.5),
      );

      let vert = verts[vertexIndex];

      // 面向相機的廣告牌
      let toCamera = normalize(uniforms.cameraPos - instance.position);
      let right = normalize(cross(vec3(0.0, 1.0, 0.0), toCamera));
      let up = vec3(0.0, 1.0, 0.0);

      let worldPos = instance.position +
        right * vert.x * instance.scale * 0.4 +
        up * vert.y * instance.scale * 0.4 +
        vec3(0.0, 0.5, 0.0);

      output.position = uniforms.viewProjection * vec4(worldPos, 1.0);
      output.uv = vert + 0.5;
      output.number = instance.number;

      return output;
    }

    // 7段數字顯示 SDF
    fn digitSDF(uv: vec2<f32>, digit: i32) -> f32 {
      let p = uv * 2.0 - 1.0;

      // 簡化的數字 SDF
      let segments = array<i32, 10>(
        0x7E, // 0: 1111110
        0x30, // 1: 0110000
        0x6D, // 2: 1101101
        0x79, // 3: 1111001
        0x33, // 4: 0110011
        0x5B, // 5: 1011011
        0x5F, // 6: 1011111
        0x70, // 7: 1110000
        0x7F, // 8: 1111111
        0x7B, // 9: 1111011
      );

      let seg = segments[digit];
      var d = 1000.0;

      // 上
      if ((seg & 0x40) != 0) {
        d = min(d, abs(p.y - 0.8) - 0.08 + abs(p.x) * 0.3);
      }
      // 右上
      if ((seg & 0x20) != 0) {
        d = min(d, abs(p.x - 0.4) - 0.08 + abs(p.y - 0.4) * 0.3);
      }
      // 右下
      if ((seg & 0x10) != 0) {
        d = min(d, abs(p.x - 0.4) - 0.08 + abs(p.y + 0.4) * 0.3);
      }
      // 下
      if ((seg & 0x08) != 0) {
        d = min(d, abs(p.y + 0.8) - 0.08 + abs(p.x) * 0.3);
      }
      // 左下
      if ((seg & 0x04) != 0) {
        d = min(d, abs(p.x + 0.4) - 0.08 + abs(p.y + 0.4) * 0.3);
      }
      // 左上
      if ((seg & 0x02) != 0) {
        d = min(d, abs(p.x + 0.4) - 0.08 + abs(p.y - 0.4) * 0.3);
      }
      // 中
      if ((seg & 0x01) != 0) {
        d = min(d, abs(p.y) - 0.08 + abs(p.x) * 0.3);
      }

      return d;
    }

    @fragment
    fn fragmentMain(input: VertexOutput) -> @location(0) vec4<f32> {
      let digit = i32(input.number);

      if (digit < 1 || digit > 8) {
        discard;
      }

      let d = digitSDF(input.uv, digit);

      if (d > 0.15) {
        discard;
      }

      // 數字顏色根據數值變化
      var color: vec3<f32>;
      if (digit == 1) {
        color = vec3(0.2, 0.5, 1.0);
      } else if (digit == 2) {
        color = vec3(0.2, 0.8, 0.3);
      } else if (digit == 3) {
        color = vec3(1.0, 0.3, 0.3);
      } else if (digit == 4) {
        color = vec3(0.3, 0.3, 0.9);
      } else if (digit == 5) {
        color = vec3(0.8, 0.2, 0.2);
      } else if (digit == 6) {
        color = vec3(0.2, 0.8, 0.8);
      } else if (digit == 7) {
        color = vec3(0.1, 0.1, 0.1);
      } else {
        color = vec3(0.5, 0.5, 0.5);
      }

      // 發光效果
      let glow = exp(-d * 10.0) * 0.5;
      color += color * glow;

      let alpha = smoothstep(0.15, 0.1, d);

      return vec4(color, alpha);
    }
  `,

  // 網格著色器
  grid: /* wgsl */ `
    struct Uniforms {
      viewProjection: mat4x4<f32>,
      time: f32,
      gridSize: vec2<f32>,
    }

    struct VertexOutput {
      @builtin(position) position: vec4<f32>,
      @location(0) worldPos: vec3<f32>,
      @location(1) uv: vec2<f32>,
    }

    @group(0) @binding(0) var<uniform> uniforms: Uniforms;

    @vertex
    fn vertexMain(@builtin(vertex_index) vertexIndex: u32) -> VertexOutput {
      var output: VertexOutput;

      let verts = array<vec2<f32>, 6>(
        vec2(-0.5, -0.5), vec2(0.5, -0.5), vec2(0.5, 0.5),
        vec2(-0.5, -0.5), vec2(0.5, 0.5), vec2(-0.5, 0.5),
      );

      let vert = verts[vertexIndex];
      let size = max(uniforms.gridSize.x, uniforms.gridSize.y) + 2.0;

      let worldPos = vec3(vert.x * size, -0.5, vert.y * size);

      output.position = uniforms.viewProjection * vec4(worldPos, 1.0);
      output.worldPos = worldPos;
      output.uv = vert * size;

      return output;
    }

    @fragment
    fn fragmentMain(input: VertexOutput) -> @location(0) vec4<f32> {
      // 網格線
      let gridX = abs(fract(input.uv.x) - 0.5);
      let gridY = abs(fract(input.uv.y) - 0.5);
      let grid = min(gridX, gridY);

      let lineWidth = 0.02;
      let line = smoothstep(lineWidth, lineWidth * 0.5, grid);

      // 網格發光
      let pulse = sin(uniforms.time * 2.0) * 0.2 + 0.8;
      let glowColor = vec3(0.0, 0.4, 0.5) * pulse;

      let baseColor = vec3(0.02, 0.02, 0.03);
      let color = mix(baseColor, glowColor, line * 0.5);

      // 距離衰減
      let dist = length(input.worldPos.xz);
      let fade = 1.0 - smoothstep(5.0, 15.0, dist);

      return vec4(color, fade * 0.8);
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

      // 柔和圓形
      let alpha = smoothstep(1.0, 0.3, dist) * input.life;

      // 發光效果
      let glow = exp(-dist * 2.0);
      var color = input.color.rgb * (1.0 + glow);

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

      // 擴散光環
      let ringRadius = uniforms.progress * 0.8;
      let ringWidth = 0.1;
      let ring = smoothstep(ringWidth, 0.0, abs(dist - ringRadius));

      // 金色勝利光芒
      let color = vec3(1.0, 0.8, 0.2);
      let glow = ring * (1.0 - uniforms.progress * 0.5);

      // 星芒效果
      let angle = atan2(input.uv.y - 0.5, input.uv.x - 0.5);
      let rays = abs(sin(angle * 8.0 + uniforms.time * 2.0));
      let rayGlow = rays * exp(-dist * 3.0) * uniforms.progress;

      let finalColor = color * (glow + rayGlow * 0.5);
      let alpha = max(glow, rayGlow) * 0.8;

      return vec4(finalColor, alpha);
    }
  `,

  // 爆炸衝擊波著色器
  shockwave: /* wgsl */ `
    struct Uniforms {
      viewProjection: mat4x4<f32>,
      time: f32,
      center: vec3<f32>,
      progress: f32,
    }

    struct VertexOutput {
      @builtin(position) position: vec4<f32>,
      @location(0) uv: vec2<f32>,
      @location(1) worldPos: vec3<f32>,
    }

    @group(0) @binding(0) var<uniform> uniforms: Uniforms;

    @vertex
    fn vertexMain(@builtin(vertex_index) vertexIndex: u32) -> VertexOutput {
      var output: VertexOutput;

      let verts = array<vec2<f32>, 6>(
        vec2(-1.0, -1.0), vec2(1.0, -1.0), vec2(1.0, 1.0),
        vec2(-1.0, -1.0), vec2(1.0, 1.0), vec2(-1.0, 1.0),
      );

      let vert = verts[vertexIndex];
      let size = uniforms.progress * 10.0;
      let worldPos = uniforms.center + vec3(vert.x * size, 0.1, vert.y * size);

      output.position = uniforms.viewProjection * vec4(worldPos, 1.0);
      output.uv = vert * 0.5 + 0.5;
      output.worldPos = worldPos;

      return output;
    }

    @fragment
    fn fragmentMain(input: VertexOutput) -> @location(0) vec4<f32> {
      let dist = length(input.uv - 0.5) * 2.0;

      // 衝擊波環
      let ringRadius = uniforms.progress;
      let ringWidth = 0.15 * (1.0 - uniforms.progress);
      let ring = smoothstep(ringWidth, 0.0, abs(dist - ringRadius));

      // 紅色爆炸光
      let color = vec3(1.0, 0.3, 0.0);
      let alpha = ring * (1.0 - uniforms.progress);

      return vec4(color * 2.0, alpha);
    }
  `,
};
