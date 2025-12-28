/**
 * WebGPU Shaders - Tube Sort
 * Laboratory / Chemistry / Test Tube Theme
 * Game #084
 */

export const BACKGROUND_SHADER = /* wgsl */ `
  struct Uniforms {
    time: f32,
    width: f32,
    height: f32,
    activity: f32,
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

  fn hash(p: vec2f) -> f32 {
    return fract(sin(dot(p, vec2f(127.1, 311.7))) * 43758.5453);
  }

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

  fn labGrid(uv: vec2f, time: f32) -> f32 {
    let gridSize = 40.0;
    let gridX = abs(fract(uv.x * uniforms.width / gridSize) - 0.5);
    let gridY = abs(fract(uv.y * uniforms.height / gridSize) - 0.5);

    let lineWidth = 0.02;
    let lineX = smoothstep(lineWidth, 0.0, gridX);
    let lineY = smoothstep(lineWidth, 0.0, gridY);

    return (lineX + lineY) * 0.1;
  }

  fn moleculePattern(uv: vec2f, time: f32) -> f32 {
    var result = 0.0;

    for (var i = 0; i < 6; i++) {
      let seed = f32(i) * 1.234;
      let cx = fract(seed * 0.7 + time * 0.02);
      let cy = fract(seed * 1.3 + time * 0.015);
      let size = 0.01 + fract(seed * 2.0) * 0.015;

      let dist = length(uv - vec2f(cx, cy));
      result += smoothstep(size, 0.0, dist) * 0.15;
    }

    return result;
  }

  fn bubbles(uv: vec2f, time: f32) -> f32 {
    var result = 0.0;

    for (var i = 0; i < 8; i++) {
      let seed = f32(i) * 2.345;
      let bx = fract(seed * 0.6) * 0.8 + 0.1;
      let speed = 0.15 + fract(seed * 1.2) * 0.2;
      let by = fract((time * speed + seed) * 0.3);
      let size = 0.008 + fract(seed * 1.8) * 0.012;

      let bubble = smoothstep(size, 0.0, length(uv - vec2f(bx, by)));
      result += bubble * 0.12;
    }

    return result;
  }

  fn labGradient(uv: vec2f) -> vec3f {
    // Cool laboratory gradient
    let top = vec3f(0.85, 0.90, 0.95);    // Light blue-white
    let bottom = vec3f(0.65, 0.75, 0.85); // Soft blue-gray

    return mix(bottom, top, uv.y);
  }

  @fragment
  fn fragmentMain(in: VertexOutput) -> @location(0) vec4f {
    let uv = in.uv;
    let t = uniforms.time;

    // Base gradient
    var color = labGradient(uv);

    // Add lab grid
    let grid = labGrid(uv, t);
    color += vec3f(grid) * vec3f(0.1, 0.15, 0.2);

    // Floating molecules
    let molecules = moleculePattern(uv, t);
    color += vec3f(molecules) * vec3f(0.3, 0.5, 0.7);

    // Rising bubbles
    let bubs = bubbles(uv, t);
    color += vec3f(bubs);

    // Activity glow
    if (uniforms.activity > 0.5) {
      let pulse = sin(t * 6.0) * 0.03;
      color += vec3f(0.1, 0.2, 0.3) * pulse;
    }

    // Soft vignette
    let vignette = 1.0 - pow(length(uv - 0.5) * 0.8, 2.0);
    color *= max(0.8, vignette);

    return vec4f(color, 1.0);
  }
`;

export const PARTICLE_SHADER = /* wgsl */ `
  struct Uniforms {
    time: f32,
    width: f32,
    height: f32,
    activity: f32,
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
    @location(0) uv: vec2f,
    @location(1) color: vec4f,
    @location(2) particleType: f32,
    @location(3) life: f32,
  }

  @vertex
  fn vertexMain(
    @builtin(vertex_index) vertexIndex: u32,
    input: VertexInput
  ) -> VertexOutput {
    var corners = array<vec2f, 4>(
      vec2f(-1, -1), vec2f(1, -1), vec2f(-1, 1), vec2f(1, 1)
    );

    let corner = corners[vertexIndex];
    let c = cos(input.rotation);
    let s = sin(input.rotation);
    let rotated = vec2f(
      corner.x * c - corner.y * s,
      corner.x * s + corner.y * c
    );

    let size = input.size / vec2f(uniforms.width, uniforms.height);
    let pos = input.position + rotated * size;

    var out: VertexOutput;
    out.position = vec4f(pos, 0, 1);
    out.uv = corner * 0.5 + 0.5;
    out.color = input.color;
    out.particleType = input.particleType;
    out.life = input.life;
    return out;
  }

  fn bubbleShape(uv: vec2f, time: f32) -> f32 {
    let dist = length(uv - 0.5);

    // Main bubble
    let bubble = smoothstep(0.5, 0.35, dist);

    // Highlight
    let highlight = smoothstep(0.15, 0.0, length(uv - vec2f(0.35, 0.35)));

    // Rim shine
    let rim = smoothstep(0.5, 0.45, dist) * smoothstep(0.35, 0.4, dist);

    return bubble * 0.5 + highlight * 0.5 + rim * 0.25;
  }

  fn dropShape(uv: vec2f, time: f32) -> f32 {
    let centered = uv - 0.5;

    // Teardrop shape
    let y = centered.y + 0.15;
    let x = centered.x;
    let shape = length(vec2f(x * 1.2, y * 1.6)) + y * 0.4;

    return smoothstep(0.4, 0.15, shape);
  }

  fn splashShape(uv: vec2f, time: f32) -> f32 {
    let centered = uv - 0.5;
    let dist = length(centered);
    let angle = atan2(centered.y, centered.x);

    // Splash with ripples
    let ripple = sin(dist * 20.0 - time * 5.0) * 0.1;
    let ring = smoothstep(0.4 + ripple, 0.3, dist) * smoothstep(0.15, 0.2, dist);

    return ring;
  }

  fn vapourShape(uv: vec2f, time: f32) -> f32 {
    let centered = uv - 0.5;
    let dist = length(centered);

    // Wispy vapour
    let angle = atan2(centered.y, centered.x);
    let wisp = sin(angle * 3.0 + time * 2.0) * 0.1;
    let cloud = smoothstep(0.5 + wisp, 0.0, dist);

    return cloud * 0.6;
  }

  fn glowShape(uv: vec2f, time: f32) -> f32 {
    let dist = length(uv - 0.5);
    let pulse = sin(time * 3.0) * 0.1 + 0.9;
    return smoothstep(0.5, 0.0, dist) * pulse;
  }

  fn sparkleShape(uv: vec2f, time: f32) -> f32 {
    let centered = uv - 0.5;
    let dist = length(centered);
    let angle = atan2(centered.y, centered.x);

    // 4-pointed star
    let star = abs(sin(angle * 2.0));
    let size = 0.3 / (star * 0.6 + 0.4);

    return smoothstep(size, 0.0, dist);
  }

  @fragment
  fn fragmentMain(in: VertexOutput) -> @location(0) vec4f {
    let uv = in.uv;
    let t = uniforms.time;
    var alpha: f32;
    var color = in.color.rgb;

    let pType = i32(in.particleType);

    switch(pType) {
      case 0: { // bubble
        alpha = bubbleShape(uv, t);
        color = mix(color, vec3f(1.0, 1.0, 1.0), 0.4);
      }
      case 1: { // drop
        alpha = dropShape(uv, t);
        color = mix(color, vec3f(0.9, 0.95, 1.0), 0.2);
      }
      case 2: { // splash
        alpha = splashShape(uv, t);
        color = mix(color, vec3f(1.0, 1.0, 1.0), 0.3);
      }
      case 3: { // vapour
        alpha = vapourShape(uv, t);
        color = mix(color, vec3f(1.0, 1.0, 1.0), 0.5);
      }
      case 4: { // glow
        alpha = glowShape(uv, t);
      }
      case 5: { // sparkle
        alpha = sparkleShape(uv, t);
        color = mix(color, vec3f(1.0, 1.0, 1.0), 0.6);
      }
      default: {
        alpha = 1.0 - length(uv - 0.5) * 2.0;
      }
    }

    alpha *= in.color.a * in.life;
    return vec4f(color, alpha);
  }
`;
