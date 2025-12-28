/**
 * WebGPU Shaders - Bridge Builder
 * Industrial Engineering / Civil Construction Theme
 * Game #057
 */

export const BACKGROUND_SHADER = /* wgsl */ `
  struct Uniforms {
    time: f32,
    width: f32,
    height: f32,
    pad: f32,
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
    let p3 = fract(vec3f(p.x, p.y, p.x) * 0.1031);
    let p3b = p3 + dot(p3, p3.yzx + 33.33);
    return fract((p3b.x + p3b.y) * p3b.z);
  }

  fn noise(p: vec2f) -> f32 {
    let i = floor(p);
    let f = fract(p);
    let u = f * f * (3.0 - 2.0 * f);

    return mix(
      mix(hash(i), hash(i + vec2f(1.0, 0.0)), u.x),
      mix(hash(i + vec2f(0.0, 1.0)), hash(i + vec2f(1.0, 1.0)), u.x),
      u.y
    );
  }

  fn cloudLayer(uv: vec2f, time: f32, scale: f32, speed: f32) -> f32 {
    var p = uv * scale + vec2f(time * speed, 0.0);
    var cloud = 0.0;
    var amp = 0.5;
    for (var i = 0; i < 4; i++) {
      cloud += noise(p) * amp;
      p *= 2.0;
      amp *= 0.5;
    }
    return smoothstep(0.3, 0.7, cloud);
  }

  fn gridPattern(uv: vec2f, size: f32) -> f32 {
    let grid = fract(uv * size);
    let line = min(
      smoothstep(0.02, 0.0, grid.x) + smoothstep(0.98, 1.0, grid.x),
      smoothstep(0.02, 0.0, grid.y) + smoothstep(0.98, 1.0, grid.y)
    );
    return line;
  }

  fn steelBeamPattern(uv: vec2f, time: f32) -> f32 {
    // I-beam cross-section hint
    let beam1 = smoothstep(0.03, 0.02, abs(uv.x - 0.1));
    let beam2 = smoothstep(0.03, 0.02, abs(uv.x - 0.9));
    let diagonal = smoothstep(0.02, 0.01, abs(fract(uv.x * 10.0 + uv.y * 5.0) - 0.5));
    return (beam1 + beam2) * 0.3 + diagonal * 0.1;
  }

  fn waterRipple(uv: vec2f, time: f32) -> f32 {
    let center = vec2f(0.5, 0.0);
    let dist = length(uv - center);
    let ripple = sin(dist * 30.0 - time * 2.0) * 0.5 + 0.5;
    return ripple * smoothstep(0.5, 0.0, dist) * 0.3;
  }

  @fragment
  fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
    let uv = input.uv;
    let time = uniforms.time;

    // Color palette - industrial construction
    let skyBlue = vec3f(0.53, 0.81, 0.92);
    let skyLight = vec3f(0.69, 0.88, 0.90);
    let earthBrown = vec3f(0.55, 0.27, 0.07);
    let earthDark = vec3f(0.40, 0.26, 0.13);
    let waterBlue = vec3f(0.29, 0.56, 0.64);
    let steelGray = vec3f(0.45, 0.52, 0.55);
    let rustOrange = vec3f(0.72, 0.40, 0.15);

    var color = vec3f(0.0);

    // Sky gradient (top 60%)
    if uv.y > 0.4 {
      let skyPos = (uv.y - 0.4) / 0.6;
      color = mix(skyLight, skyBlue, skyPos);

      // Clouds
      let cloud1 = cloudLayer(uv, time, 3.0, 0.02);
      let cloud2 = cloudLayer(uv + vec2f(0.5, 0.2), time, 5.0, 0.03);
      let clouds = max(cloud1, cloud2 * 0.7);
      color = mix(color, vec3f(1.0), clouds * 0.4);

      // Subtle construction dust in air
      let dust = noise(uv * 20.0 + time * 0.1) * 0.05;
      color += vec3f(0.8, 0.7, 0.6) * dust * (1.0 - skyPos);
    }
    // Ground and water (bottom 40%)
    else {
      let groundPos = uv.y / 0.4;

      // Water in the gap (center area)
      if uv.x > 0.25 && uv.x < 0.75 && uv.y < 0.35 {
        let waterRip = waterRipple(uv, time);
        color = waterBlue + waterRip * vec3f(0.2, 0.3, 0.4);

        // Water reflection
        let reflection = noise(uv * vec2f(30.0, 5.0) + vec2f(time * 0.5, 0.0));
        color += vec3f(0.1) * reflection;
      }
      // Ground on sides
      else {
        color = mix(earthDark, earthBrown, groundPos);

        // Ground texture
        let groundNoise = noise(uv * 50.0) * 0.1;
        color += vec3f(groundNoise);
      }
    }

    // Grid overlay for engineering feel
    let grid = gridPattern(uv, 20.0);
    color = mix(color, steelGray, grid * 0.1);

    // Steel beam hints at edges
    let beams = steelBeamPattern(uv, time);
    color = mix(color, steelGray, beams * 0.2);

    // Industrial vignette
    let center = length(uv - 0.5) * 1.4;
    let vignette = 1.0 - smoothstep(0.5, 1.2, center) * 0.3;
    color *= vignette;

    // Subtle warm industrial lighting
    color += vec3f(0.05, 0.03, 0.0);

    return vec4f(color, 1.0);
  }
`;

export const PARTICLE_SHADER = /* wgsl */ `
  struct Uniforms {
    time: f32,
    width: f32,
    height: f32,
    pad: f32,
  }

  @group(0) @binding(0) var<uniform> uniforms: Uniforms;

  struct VertexInput {
    @location(0) position: vec2f,
    @location(1) size: f32,
    @location(2) color: vec4f,
    @location(3) rotation: f32,
    @location(4) particleType: f32,
    @location(5) life: f32,
  }

  struct VertexOutput {
    @builtin(position) position: vec4f,
    @location(0) color: vec4f,
    @location(1) localPos: vec2f,
    @location(2) particleType: f32,
    @location(3) life: f32,
  }

  @vertex
  fn vertexMain(
    input: VertexInput,
    @builtin(vertex_index) vertexIndex: u32
  ) -> VertexOutput {
    var corners = array<vec2f, 4>(
      vec2f(-1.0, -1.0),
      vec2f(1.0, -1.0),
      vec2f(-1.0, 1.0),
      vec2f(1.0, 1.0)
    );

    let corner = corners[vertexIndex];
    let cosR = cos(input.rotation);
    let sinR = sin(input.rotation);
    let rotated = vec2f(
      corner.x * cosR - corner.y * sinR,
      corner.x * sinR + corner.y * cosR
    );

    let aspect = uniforms.width / uniforms.height;
    let size = input.size / uniforms.width * 2.0;
    let pos = input.position + rotated * size;

    var output: VertexOutput;
    output.position = vec4f(pos.x, pos.y * aspect, 0.0, 1.0);
    output.color = input.color;
    output.localPos = corner;
    output.particleType = input.particleType;
    output.life = input.life;
    return output;
  }

  @fragment
  fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
    let dist = length(input.localPos);
    var color = input.color;
    let pType = i32(input.particleType);
    let time = uniforms.time;

    // 0: spark - welding/construction spark
    if pType == 0 {
      let star = max(
        1.0 - abs(input.localPos.x) * 3.0,
        1.0 - abs(input.localPos.y) * 3.0
      );
      let flare = smoothstep(0.0, 0.5, star) * (1.0 - dist * 0.5);
      color.a *= flare;
      color.r = min(1.0, color.r + 0.3);
    }
    // 1: beam - structural beam piece
    else if pType == 1 {
      let rect = max(abs(input.localPos.x), abs(input.localPos.y) * 3.0);
      color.a *= smoothstep(1.0, 0.8, rect);
    }
    // 2: bolt - rivet/bolt
    else if pType == 2 {
      let circle = smoothstep(1.0, 0.6, dist);
      let shine = smoothstep(0.4, 0.2, length(input.localPos - vec2f(-0.2, -0.2)));
      color = mix(color, vec4f(1.0, 1.0, 0.9, color.a), shine * 0.4);
      color.a *= circle;
    }
    // 3: dust - construction dust
    else if pType == 3 {
      let soft = 1.0 - smoothstep(0.0, 1.0, dist);
      color.a *= soft * 0.5;
    }
    // 4: stress - structural stress indicator
    else if pType == 4 {
      let ring = abs(dist - 0.6);
      let pulse = smoothstep(0.15, 0.0, ring) * sin(time * 10.0) * 0.5 + 0.5;
      color.a *= pulse * (1.0 - dist);
    }
    // 5: victory - success confetti
    else if pType == 5 {
      let rect = max(abs(input.localPos.x), abs(input.localPos.y));
      color.a *= smoothstep(1.0, 0.6, rect);
    }

    if color.a < 0.01 {
      discard;
    }

    return color;
  }
`;
