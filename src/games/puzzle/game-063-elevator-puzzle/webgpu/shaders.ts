/**
 * WebGPU Shaders - Elevator Puzzle
 * Modern Building / Urban Elevator Theme
 * Game #063
 */

export const BACKGROUND_SHADER = /* wgsl */`
  struct Uniforms {
    time: f32,
    width: f32,
    height: f32,
    padding: f32,
  }

  @group(0) @binding(0) var<uniform> uniforms: Uniforms;

  struct VertexOutput {
    @builtin(position) position: vec4f,
    @location(0) uv: vec2f,
  }

  @vertex
  fn vertexMain(@builtin(vertex_index) i: u32) -> VertexOutput {
    var pos = array<vec2f, 4>(
      vec2f(-1, -1), vec2f(1, -1), vec2f(-1, 1), vec2f(1, 1)
    );
    var out: VertexOutput;
    out.position = vec4f(pos[i], 0, 1);
    out.uv = pos[i] * 0.5 + 0.5;
    return out;
  }

  // Hash function for randomness
  fn hash(p: vec2f) -> f32 {
    var p3 = fract(vec3f(p.x, p.y, p.x) * 0.13);
    p3 += dot(p3, p3.yzx + 3.333);
    return fract((p3.x + p3.y) * p3.z);
  }

  // Simple noise
  fn noise(p: vec2f) -> f32 {
    let i = floor(p);
    let f = fract(p);
    let u = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash(i), hash(i + vec2f(1, 0)), u.x),
      mix(hash(i + vec2f(0, 1)), hash(i + vec2f(1, 1)), u.x),
      u.y
    );
  }

  // Building window grid
  fn buildingWindows(uv: vec2f, time: f32) -> vec3f {
    let windowsX = 12.0;
    let windowsY = 20.0;
    let scaled = uv * vec2f(windowsX, windowsY);
    let cell = floor(scaled);
    let local = fract(scaled);

    // Window frame
    let margin = 0.15;
    let isWindow = local.x > margin && local.x < 1.0 - margin &&
                   local.y > margin && local.y < 1.0 - margin;

    if (!isWindow) {
      return vec3f(0.12, 0.15, 0.18); // Wall color
    }

    // Window light variation
    let windowId = cell.x + cell.y * windowsX;
    let lightOn = hash(cell) > 0.3;

    if (lightOn) {
      let warmth = hash(cell + 100.0);
      let flicker = sin(time * 2.0 + windowId * 0.5) * 0.05 + 0.95;

      var lightColor = vec3f(0.95, 0.85, 0.6); // Warm light
      if (warmth > 0.7) {
        lightColor = vec3f(0.7, 0.85, 1.0); // Cool light (TV/monitor)
      }

      return lightColor * flicker * 0.6;
    }

    // Dark window with slight reflection
    return vec3f(0.08, 0.10, 0.14);
  }

  // Elevator shaft
  fn elevatorShaft(uv: vec2f, time: f32) -> vec3f {
    // Shaft area (left side of screen)
    let shaftX = 0.15;
    let shaftWidth = 0.12;

    if (uv.x > shaftX && uv.x < shaftX + shaftWidth) {
      // Metal texture
      let metalNoise = noise(uv * 100.0) * 0.05;
      let baseColor = vec3f(0.25, 0.28, 0.32) + metalNoise;

      // Vertical lines (guide rails)
      let rail1 = smoothstep(0.01, 0.0, abs(uv.x - shaftX - 0.02));
      let rail2 = smoothstep(0.01, 0.0, abs(uv.x - shaftX - shaftWidth + 0.02));

      let railColor = vec3f(0.4, 0.42, 0.45);
      return mix(baseColor, railColor, max(rail1, rail2));
    }

    return vec3f(0.0);
  }

  // Floor indicators
  fn floorIndicators(uv: vec2f, time: f32, floors: f32) -> vec3f {
    let indicatorX = 0.92;
    let indicatorWidth = 0.06;

    if (uv.x > indicatorX - indicatorWidth * 0.5 && uv.x < indicatorX + indicatorWidth * 0.5) {
      let floorHeight = 1.0 / (floors + 1.0);

      for (var i = 1.0; i <= floors; i += 1.0) {
        let floorY = i * floorHeight;
        let buttonY = floorY;
        let dist = length(vec2f(uv.x - indicatorX, uv.y - buttonY) * vec2f(1.0, 2.0));

        if (dist < 0.02) {
          // Button glow
          let glow = sin(time * 3.0 + i) * 0.2 + 0.8;
          return vec3f(0.2, 0.6, 0.9) * glow;
        }
      }
    }

    return vec3f(0.0);
  }

  // Ambient city glow
  fn cityGlow(uv: vec2f, time: f32) -> vec3f {
    let gradient = smoothstep(0.0, 0.5, uv.y);
    let pulse = sin(time * 0.5) * 0.1 + 0.9;
    return vec3f(0.02, 0.05, 0.10) * (1.0 - gradient) * pulse;
  }

  // Glass reflection streaks
  fn glassReflection(uv: vec2f, time: f32) -> f32 {
    let streak = sin(uv.x * 20.0 + uv.y * 10.0 + time * 0.3) * 0.5 + 0.5;
    let fade = smoothstep(0.0, 0.3, uv.y) * smoothstep(1.0, 0.7, uv.y);
    return streak * fade * 0.05;
  }

  // Moving lights (cars/traffic below)
  fn trafficLights(uv: vec2f, time: f32) -> vec3f {
    if (uv.y > 0.08) { return vec3f(0.0); }

    var lights = vec3f(0.0);
    for (var i = 0.0; i < 5.0; i += 1.0) {
      let speed = 0.3 + hash(vec2f(i, 0.0)) * 0.4;
      let xPos = fract((time * speed + i * 0.2));
      let dist = abs(uv.x - xPos);

      if (dist < 0.01) {
        let isRed = hash(vec2f(i, 1.0)) > 0.5;
        let color = select(vec3f(1.0, 0.9, 0.7), vec3f(1.0, 0.2, 0.1), isRed);
        lights += color * smoothstep(0.01, 0.0, dist) * 0.3;
      }
    }

    return lights;
  }

  @fragment
  fn fragmentMain(in: VertexOutput) -> @location(0) vec4f {
    let uv = in.uv;
    let time = uniforms.time;

    // Base dark background
    var color = vec3f(0.08, 0.10, 0.14);

    // City ambient glow
    color += cityGlow(uv, time);

    // Building windows (main area)
    if (uv.x > 0.3 && uv.x < 0.85) {
      let windowUV = vec2f((uv.x - 0.3) / 0.55, uv.y);
      color = buildingWindows(windowUV, time);
    }

    // Elevator shaft
    let shaft = elevatorShaft(uv, time);
    if (shaft.r > 0.0) {
      color = shaft;
    }

    // Floor indicators
    let indicators = floorIndicators(uv, time, 8.0);
    color += indicators;

    // Glass reflection overlay
    let reflection = glassReflection(uv, time);
    color += vec3f(0.4, 0.5, 0.6) * reflection;

    // Traffic lights at bottom
    color += trafficLights(uv, time);

    // Subtle vignette
    let center = vec2f(0.5, 0.5);
    let vignette = 1.0 - smoothstep(0.4, 0.9, length(uv - center));
    color *= 0.7 + vignette * 0.3;

    return vec4f(color, 1.0);
  }
`;

export const PARTICLE_SHADER = /* wgsl */`
  struct Uniforms {
    time: f32,
    width: f32,
    height: f32,
    padding: f32,
  }

  @group(0) @binding(0) var<uniform> uniforms: Uniforms;

  struct VertexOutput {
    @builtin(position) position: vec4f,
    @location(0) localPos: vec2f,
    @location(1) color: vec4f,
    @location(2) particleType: f32,
    @location(3) life: f32,
  }

  struct VertexInput {
    @location(0) pos: vec2f,
    @location(1) size: f32,
    @location(2) color: vec4f,
    @location(3) rotation: f32,
    @location(4) particleType: f32,
    @location(5) life: f32,
  }

  @vertex
  fn vertexMain(
    @builtin(vertex_index) vi: u32,
    input: VertexInput,
  ) -> VertexOutput {
    var corner = array<vec2f, 4>(
      vec2f(-1, -1), vec2f(1, -1), vec2f(-1, 1), vec2f(1, 1)
    );

    let c = corner[vi];
    let cosR = cos(input.rotation);
    let sinR = sin(input.rotation);
    let rotated = vec2f(
      c.x * cosR - c.y * sinR,
      c.x * sinR + c.y * cosR
    );

    let aspect = uniforms.width / uniforms.height;
    let size = input.size / uniforms.height;

    var out: VertexOutput;
    out.position = vec4f(
      input.pos.x + rotated.x * size,
      input.pos.y + rotated.y * size * aspect,
      0, 1
    );
    out.localPos = c;
    out.color = input.color;
    out.particleType = input.particleType;
    out.life = input.life;

    return out;
  }

  @fragment
  fn fragmentMain(in: VertexOutput) -> @location(0) vec4f {
    let d = length(in.localPos);
    let pType = i32(in.particleType);
    var alpha = in.color.a;
    var color = in.color.rgb;
    let time = uniforms.time;

    // Type 0: Spark - electrical/mechanical spark
    if (pType == 0) {
      let streak = smoothstep(0.8, 0.0, abs(in.localPos.y)) *
                   smoothstep(1.0, 0.2, abs(in.localPos.x));
      let core = smoothstep(0.4, 0.0, d);
      alpha *= (streak + core) * in.life;
      color = mix(color, vec3f(1.0, 1.0, 1.0), core * 0.7);
    }
    // Type 1: Glow - button/indicator glow
    else if (pType == 1) {
      let glow = smoothstep(1.0, 0.0, d);
      let pulse = sin(time * 4.0 + in.life * 8.0) * 0.15 + 0.85;
      alpha *= glow * glow * pulse * in.life;
    }
    // Type 2: Ding - arrival notification ring
    else if (pType == 2) {
      let ring = smoothstep(0.1, 0.0, abs(d - 0.7));
      let fade = smoothstep(1.0, 0.3, d);
      alpha *= ring * fade * in.life;
    }
    // Type 3: Confetti - celebration particles
    else if (pType == 3) {
      let rect = smoothstep(0.8, 0.6, abs(in.localPos.x)) *
                 smoothstep(0.5, 0.3, abs(in.localPos.y));
      alpha *= rect * in.life;
    }
    // Type 4: Trail - movement trail
    else if (pType == 4) {
      let trail = smoothstep(1.0, 0.0, abs(in.localPos.x)) *
                  smoothstep(0.5, 0.0, abs(in.localPos.y));
      alpha *= trail * in.life * 0.6;
    }
    // Type 5: Victory - star burst
    else if (pType == 5) {
      let star = max(
        smoothstep(0.15, 0.0, abs(in.localPos.x)) * smoothstep(0.9, 0.0, abs(in.localPos.y)),
        smoothstep(0.15, 0.0, abs(in.localPos.y)) * smoothstep(0.9, 0.0, abs(in.localPos.x))
      );
      let glow = smoothstep(1.0, 0.0, d) * 0.4;
      alpha *= (star + glow) * in.life;
      color = mix(color, vec3f(1.0), star * 0.4);
    }
    else {
      alpha *= smoothstep(1.0, 0.0, d) * in.life;
    }

    return vec4f(color, alpha);
  }
`;
