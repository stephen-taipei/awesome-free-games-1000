/**
 * WGSL 著色器 - 推箱子遊戲
 * WebGPU shaders for Sokoban
 */

export const shaders = {
  // ============================================================================
  // 地板著色器 - Cyberpunk Grid Floor
  // ============================================================================
  floor: /* wgsl */`
    struct Camera {
      viewProjection: mat4x4f,
      eyePosition: vec3f,
      time: f32,
    }

    struct TileData {
      position: vec2f,      // Grid position
      tileType: f32,        // 0=floor, 1=wall, 2=target
      padding: f32,
    }

    @group(0) @binding(0) var<uniform> camera: Camera;
    @group(0) @binding(1) var<uniform> tile: TileData;

    struct VertexOutput {
      @builtin(position) position: vec4f,
      @location(0) worldPos: vec3f,
      @location(1) normal: vec3f,
      @location(2) uv: vec2f,
      @location(3) tileType: f32,
    }

    @vertex
    fn vertexMain(
      @location(0) pos: vec3f,
      @location(1) normal: vec3f,
      @location(2) uv: vec2f
    ) -> VertexOutput {
      var out: VertexOutput;

      let worldPos = vec3f(
        tile.position.x + pos.x,
        pos.y * 0.02,  // Very thin floor
        tile.position.y + pos.z
      );

      out.position = camera.viewProjection * vec4f(worldPos, 1.0);
      out.worldPos = worldPos;
      out.normal = normal;
      out.uv = uv;
      out.tileType = tile.tileType;

      return out;
    }

    @fragment
    fn fragmentMain(in: VertexOutput) -> @location(0) vec4f {
      let time = camera.time;

      // Base color based on tile type
      var color: vec3f;

      if (in.tileType < 0.5) {
        // Floor - dark with grid pattern
        let gridX = fract(in.uv.x * 2.0);
        let gridY = fract(in.uv.y * 2.0);
        let grid = smoothstep(0.02, 0.0, min(gridX, 1.0 - gridX)) +
                   smoothstep(0.02, 0.0, min(gridY, 1.0 - gridY));

        color = vec3f(0.08, 0.08, 0.12) + vec3f(0.0, 0.3, 0.5) * grid * 0.15;

      } else if (in.tileType < 1.5) {
        // Wall - not rendered here (using 3D blocks)
        color = vec3f(0.3, 0.3, 0.35);

      } else {
        // Target - glowing magenta spot
        let dist = length(in.uv - vec2f(0.5));
        let pulse = sin(time * 3.0) * 0.3 + 0.7;

        // Outer ring
        let ring = smoothstep(0.45, 0.4, dist) * smoothstep(0.3, 0.35, dist);
        // Inner glow
        let glow = smoothstep(0.35, 0.0, dist) * 0.5;

        let targetColor = vec3f(1.0, 0.0, 0.8);
        color = vec3f(0.08, 0.08, 0.12) + targetColor * (ring + glow) * pulse;

        // Add cross pattern
        let crossX = smoothstep(0.05, 0.0, abs(in.uv.x - 0.5));
        let crossY = smoothstep(0.05, 0.0, abs(in.uv.y - 0.5));
        let crossDist = smoothstep(0.3, 0.2, dist);
        color += targetColor * (crossX + crossY) * crossDist * 0.3;
      }

      return vec4f(color, 1.0);
    }
  `,

  // ============================================================================
  // 牆壁著色器 - Neon Brick Wall
  // ============================================================================
  wall: /* wgsl */`
    struct Camera {
      viewProjection: mat4x4f,
      eyePosition: vec3f,
      time: f32,
    }

    struct WallData {
      position: vec2f,
      height: f32,
      padding: f32,
    }

    @group(0) @binding(0) var<uniform> camera: Camera;
    @group(0) @binding(1) var<uniform> wall: WallData;

    struct VertexOutput {
      @builtin(position) position: vec4f,
      @location(0) worldPos: vec3f,
      @location(1) normal: vec3f,
      @location(2) uv: vec2f,
    }

    @vertex
    fn vertexMain(
      @location(0) pos: vec3f,
      @location(1) normal: vec3f,
      @location(2) uv: vec2f
    ) -> VertexOutput {
      var out: VertexOutput;

      let worldPos = vec3f(
        wall.position.x + pos.x,
        pos.y * wall.height,
        wall.position.y + pos.z
      );

      out.position = camera.viewProjection * vec4f(worldPos, 1.0);
      out.worldPos = worldPos;
      out.normal = normal;
      out.uv = uv;

      return out;
    }

    @fragment
    fn fragmentMain(in: VertexOutput) -> @location(0) vec4f {
      let time = camera.time;

      // Brick pattern
      var brickUV = in.uv * vec2f(2.0, 4.0);
      let row = floor(brickUV.y);
      if (fract(row * 0.5) > 0.25) {
        brickUV.x += 0.5;
      }
      let brick = fract(brickUV);

      // Mortar lines
      let mortarX = smoothstep(0.05, 0.0, brick.x) + smoothstep(0.95, 1.0, brick.x);
      let mortarY = smoothstep(0.08, 0.0, brick.y) + smoothstep(0.92, 1.0, brick.y);
      let mortar = max(mortarX, mortarY);

      // Base wall color - dark gray with blue tint
      var color = vec3f(0.2, 0.22, 0.28);

      // Add brick variation
      let brickNoise = fract(sin(dot(floor(brickUV), vec2f(12.9898, 78.233))) * 43758.5453);
      color += (brickNoise - 0.5) * 0.05;

      // Mortar is darker
      color = mix(color, vec3f(0.1, 0.1, 0.12), mortar);

      // Edge glow on top
      let topGlow = smoothstep(0.8, 1.0, in.uv.y);
      let edgePulse = sin(time * 2.0 + in.worldPos.x * 3.0) * 0.3 + 0.7;
      color += vec3f(0.0, 0.8, 1.0) * topGlow * 0.2 * edgePulse;

      // Lighting
      let lightDir = normalize(vec3f(0.5, 1.0, 0.3));
      let NdotL = max(dot(in.normal, lightDir), 0.0);
      let ambient = 0.4;
      let diffuse = NdotL * 0.6;

      color *= (ambient + diffuse);

      return vec4f(color, 1.0);
    }
  `,

  // ============================================================================
  // 箱子著色器 - Holographic Crate
  // ============================================================================
  box: /* wgsl */`
    struct Camera {
      viewProjection: mat4x4f,
      eyePosition: vec3f,
      time: f32,
    }

    struct BoxData {
      position: vec3f,       // x, y (height), z
      onTarget: f32,         // 1.0 if on target
      animProgress: f32,     // Animation 0-1
      scale: f32,
      padding: vec2f,
    }

    @group(0) @binding(0) var<uniform> camera: Camera;
    @group(0) @binding(1) var<uniform> box: BoxData;

    struct VertexOutput {
      @builtin(position) position: vec4f,
      @location(0) worldPos: vec3f,
      @location(1) normal: vec3f,
      @location(2) uv: vec2f,
      @location(3) onTarget: f32,
    }

    @vertex
    fn vertexMain(
      @location(0) pos: vec3f,
      @location(1) normal: vec3f,
      @location(2) uv: vec2f
    ) -> VertexOutput {
      var out: VertexOutput;

      // Scale and position
      let s = box.scale * 0.85;
      let offset = (1.0 - s) * 0.5;

      // Bounce animation
      let bounce = sin(box.animProgress * 3.14159) * 0.15;

      let worldPos = vec3f(
        box.position.x + offset + pos.x * s,
        box.position.y + pos.y * s + bounce,
        box.position.z + offset + pos.z * s
      );

      out.position = camera.viewProjection * vec4f(worldPos, 1.0);
      out.worldPos = worldPos;
      out.normal = normal;
      out.uv = uv;
      out.onTarget = box.onTarget;

      return out;
    }

    @fragment
    fn fragmentMain(in: VertexOutput) -> @location(0) vec4f {
      let time = camera.time;

      // Base color - yellow/brown for normal, green for on-target
      var baseColor: vec3f;
      if (in.onTarget > 0.5) {
        baseColor = vec3f(0.2, 1.0, 0.4);  // Bright green
      } else {
        baseColor = vec3f(1.0, 0.75, 0.3); // Golden yellow
      }

      // Wood grain pattern
      let grainFreq = 8.0;
      let grain = sin(in.uv.y * grainFreq + sin(in.uv.x * 3.0) * 0.5);
      let grainPattern = grain * 0.1 + 0.9;

      // Cross straps pattern
      let strap1 = smoothstep(0.15, 0.12, abs(in.uv.x - 0.5));
      let strap2 = smoothstep(0.15, 0.12, abs(in.uv.y - 0.5));
      let straps = max(strap1, strap2);

      // Edge highlight
      let edgeX = smoothstep(0.0, 0.05, in.uv.x) * smoothstep(1.0, 0.95, in.uv.x);
      let edgeY = smoothstep(0.0, 0.05, in.uv.y) * smoothstep(1.0, 0.95, in.uv.y);
      let edge = 1.0 - edgeX * edgeY;

      var color = baseColor * grainPattern;

      // Straps are darker
      let strapColor = baseColor * 0.5;
      color = mix(color, strapColor, straps * 0.7);

      // Edge glow
      let glowColor = select(vec3f(1.0, 0.9, 0.5), vec3f(0.5, 1.0, 0.7), in.onTarget > 0.5);
      let pulse = sin(time * 4.0) * 0.3 + 0.7;
      color += glowColor * edge * 0.3 * pulse;

      // Holographic scan line
      let scanY = fract(in.worldPos.y * 5.0 - time * 2.0);
      let scanLine = smoothstep(0.0, 0.1, scanY) * smoothstep(0.2, 0.1, scanY);
      color += glowColor * scanLine * 0.2;

      // Lighting
      let lightDir = normalize(vec3f(0.5, 1.0, 0.3));
      let NdotL = max(dot(in.normal, lightDir), 0.0);
      let viewDir = normalize(camera.eyePosition - in.worldPos);
      let halfDir = normalize(lightDir + viewDir);
      let NdotH = max(dot(in.normal, halfDir), 0.0);
      let specular = pow(NdotH, 32.0) * 0.5;

      let ambient = 0.3;
      let diffuse = NdotL * 0.5;

      color = color * (ambient + diffuse) + vec3f(1.0) * specular;

      return vec4f(color, 1.0);
    }
  `,

  // ============================================================================
  // 玩家著色器 - Cyber Robot Player
  // ============================================================================
  player: /* wgsl */`
    struct Camera {
      viewProjection: mat4x4f,
      eyePosition: vec3f,
      time: f32,
    }

    struct PlayerData {
      position: vec3f,
      direction: f32,      // 0=up, 1=right, 2=down, 3=left
      bobPhase: f32,       // Walking animation
      scale: f32,
      padding: vec2f,
    }

    @group(0) @binding(0) var<uniform> camera: Camera;
    @group(0) @binding(1) var<uniform> player: PlayerData;

    struct VertexOutput {
      @builtin(position) position: vec4f,
      @location(0) worldPos: vec3f,
      @location(1) normal: vec3f,
      @location(2) uv: vec2f,
      @location(3) localY: f32,
    }

    @vertex
    fn vertexMain(
      @location(0) pos: vec3f,
      @location(1) normal: vec3f,
      @location(2) uv: vec2f
    ) -> VertexOutput {
      var out: VertexOutput;

      // Bob animation
      let bob = sin(player.bobPhase * 10.0) * 0.03;

      // Scale to fit in tile (sphere mesh is unit size)
      let s = player.scale * 0.4;

      let worldPos = vec3f(
        player.position.x + 0.5 + pos.x * s,
        player.position.y + pos.y * s + s + bob,
        player.position.z + 0.5 + pos.z * s
      );

      out.position = camera.viewProjection * vec4f(worldPos, 1.0);
      out.worldPos = worldPos;
      out.normal = normal;
      out.uv = uv;
      out.localY = pos.y;

      return out;
    }

    @fragment
    fn fragmentMain(in: VertexOutput) -> @location(0) vec4f {
      let time = camera.time;

      // Main body color - cyan/blue
      let baseColor = vec3f(0.1, 0.7, 1.0);

      // Eye band
      let eyeY = smoothstep(0.1, 0.2, in.localY) * smoothstep(0.5, 0.4, in.localY);
      let eyeColor = vec3f(1.0, 1.0, 1.0);

      // Pupil
      let pupilX = in.uv.x;
      let isPupil = eyeY > 0.5 && abs(pupilX - 0.3) < 0.08 || abs(pupilX - 0.7) < 0.08;

      var color = baseColor;

      // Eye white band
      color = mix(color, eyeColor, eyeY * 0.9);

      // Black pupils
      if (isPupil && eyeY > 0.5) {
        color = vec3f(0.0, 0.0, 0.0);
      }

      // Circuit pattern glow
      let circuitY = fract(in.worldPos.y * 8.0 - time);
      let circuit = smoothstep(0.0, 0.1, circuitY) * smoothstep(0.15, 0.1, circuitY);
      color += vec3f(0.0, 1.0, 1.0) * circuit * 0.3;

      // Rim lighting
      let viewDir = normalize(camera.eyePosition - in.worldPos);
      let rim = 1.0 - max(dot(viewDir, in.normal), 0.0);
      let rimPower = pow(rim, 3.0);
      color += vec3f(0.0, 0.8, 1.0) * rimPower * 0.5;

      // Main lighting
      let lightDir = normalize(vec3f(0.5, 1.0, 0.3));
      let NdotL = max(dot(in.normal, lightDir), 0.0);
      let halfDir = normalize(lightDir + viewDir);
      let NdotH = max(dot(in.normal, halfDir), 0.0);
      let specular = pow(NdotH, 64.0);

      let ambient = 0.3;
      let diffuse = NdotL * 0.5;

      color = color * (ambient + diffuse) + vec3f(1.0) * specular * 0.4;

      // Breathing glow
      let breath = sin(time * 2.0) * 0.15 + 0.85;
      color *= breath;

      return vec4f(color, 1.0);
    }
  `,

  // ============================================================================
  // 粒子著色器 - Glowing Particles
  // ============================================================================
  particle: /* wgsl */`
    struct Camera {
      viewProjection: mat4x4f,
      eyePosition: vec3f,
      time: f32,
    }

    @group(0) @binding(0) var<uniform> camera: Camera;

    struct VertexInput {
      @location(0) position: vec3f,
      @location(1) color: vec4f,
      @location(2) size: f32,
      @location(3) rotation: f32,
    }

    struct VertexOutput {
      @builtin(position) position: vec4f,
      @location(0) color: vec4f,
      @location(1) uv: vec2f,
    }

    @vertex
    fn vertexMain(
      in: VertexInput,
      @builtin(vertex_index) vertexIndex: u32,
      @builtin(instance_index) instanceIndex: u32
    ) -> VertexOutput {
      var out: VertexOutput;

      // Billboard quad vertices
      let quadPos = array<vec2f, 6>(
        vec2f(-1.0, -1.0),
        vec2f( 1.0, -1.0),
        vec2f( 1.0,  1.0),
        vec2f(-1.0, -1.0),
        vec2f( 1.0,  1.0),
        vec2f(-1.0,  1.0)
      );

      let quadUV = array<vec2f, 6>(
        vec2f(0.0, 0.0),
        vec2f(1.0, 0.0),
        vec2f(1.0, 1.0),
        vec2f(0.0, 0.0),
        vec2f(1.0, 1.0),
        vec2f(0.0, 1.0)
      );

      let localPos = quadPos[vertexIndex];
      out.uv = quadUV[vertexIndex];

      // Rotation
      let c = cos(in.rotation);
      let s = sin(in.rotation);
      let rotatedPos = vec2f(
        localPos.x * c - localPos.y * s,
        localPos.x * s + localPos.y * c
      );

      // Billboard facing camera
      let toCamera = normalize(camera.eyePosition - in.position);
      let right = normalize(cross(vec3f(0.0, 1.0, 0.0), toCamera));
      let up = cross(toCamera, right);

      let worldPos = in.position +
        right * rotatedPos.x * in.size +
        up * rotatedPos.y * in.size;

      out.position = camera.viewProjection * vec4f(worldPos, 1.0);
      out.color = in.color;

      return out;
    }

    @fragment
    fn fragmentMain(in: VertexOutput) -> @location(0) vec4f {
      let dist = length(in.uv - vec2f(0.5)) * 2.0;

      // Soft circular particle
      let alpha = smoothstep(1.0, 0.3, dist) * in.color.a;

      // Center glow
      let glow = exp(-dist * 3.0);

      let color = in.color.rgb + vec3f(1.0) * glow * 0.3;

      return vec4f(color, alpha);
    }
  `,

  // ============================================================================
  // 勝利著色器 - Victory Celebration
  // ============================================================================
  victory: /* wgsl */`
    struct VictoryData {
      time: f32,
      aspect: f32,
      padding: vec2f,
    }

    @group(0) @binding(0) var<uniform> victory: VictoryData;

    struct VertexOutput {
      @builtin(position) position: vec4f,
      @location(0) uv: vec2f,
    }

    @vertex
    fn vertexMain(
      @location(0) pos: vec2f,
      @location(1) uv: vec2f
    ) -> VertexOutput {
      var out: VertexOutput;
      out.position = vec4f(pos, 0.0, 1.0);
      out.uv = uv;
      return out;
    }

    @fragment
    fn fragmentMain(in: VertexOutput) -> @location(0) vec4f {
      let time = victory.time;
      let uv = in.uv;
      let aspect = victory.aspect;

      // Centered UV with aspect correction
      var centeredUV = (uv - vec2f(0.5)) * vec2f(aspect, 1.0);

      // Expanding rings
      let dist = length(centeredUV);
      var color = vec3f(0.0);

      // Multiple expanding rings
      for (var i = 0; i < 5; i++) {
        let ringTime = time - f32(i) * 0.3;
        if (ringTime > 0.0) {
          let ringRadius = ringTime * 0.8;
          let ringWidth = 0.05;
          let ring = smoothstep(ringWidth, 0.0, abs(dist - ringRadius));

          // Rainbow color based on ring index
          let hue = fract(f32(i) * 0.2 + time * 0.5);
          let ringColor = hsvToRgb(vec3f(hue, 1.0, 1.0));

          let fade = max(0.0, 1.0 - ringTime * 0.5);
          color += ringColor * ring * fade;
        }
      }

      // Star burst
      let angle = atan2(centeredUV.y, centeredUV.x);
      let starPoints = 8.0;
      let starPattern = abs(sin(angle * starPoints + time * 3.0));
      let starGlow = exp(-dist * 4.0) * starPattern;
      color += vec3f(1.0, 0.9, 0.5) * starGlow * 0.5;

      // Center flash
      let flash = exp(-dist * 10.0) * (sin(time * 10.0) * 0.3 + 0.7);
      color += vec3f(1.0, 1.0, 1.0) * flash;

      let alpha = min(1.0, (color.r + color.g + color.b) * 0.5);

      return vec4f(color, alpha * 0.7);
    }

    fn hsvToRgb(hsv: vec3f) -> vec3f {
      let h = hsv.x * 6.0;
      let s = hsv.y;
      let v = hsv.z;

      let i = floor(h);
      let f = h - i;
      let p = v * (1.0 - s);
      let q = v * (1.0 - s * f);
      let t = v * (1.0 - s * (1.0 - f));

      let im = i32(i) % 6;

      switch(im) {
        case 0: { return vec3f(v, t, p); }
        case 1: { return vec3f(q, v, p); }
        case 2: { return vec3f(p, v, t); }
        case 3: { return vec3f(p, q, v); }
        case 4: { return vec3f(t, p, v); }
        default: { return vec3f(v, p, q); }
      }
    }
  `,
};
