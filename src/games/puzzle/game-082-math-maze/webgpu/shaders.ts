/**
 * WebGPU Shaders - Math Maze
 * Digital / Circuit / Mathematical Theme
 * Game #082
 */

export const BACKGROUND_SHADER = /* wgsl */ `
  struct Uniforms {
    time: f32,
    width: f32,
    height: f32,
    pulse: f32,
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

  fn circuitGrid(uv: vec2f, time: f32) -> f32 {
    let gridSize = 40.0;
    let gridUV = uv * vec2f(uniforms.width, uniforms.height) / gridSize;
    let cell = fract(gridUV);

    // Main grid lines
    let lineX = smoothstep(0.02, 0.0, abs(cell.x - 0.5));
    let lineY = smoothstep(0.02, 0.0, abs(cell.y - 0.5));

    // Data flow effect along lines
    let flow = sin(gridUV.x * 2.0 + time * 3.0) * 0.5 + 0.5;
    let flowY = sin(gridUV.y * 2.0 - time * 2.0) * 0.5 + 0.5;

    return (lineX * flow + lineY * flowY) * 0.3;
  }

  fn digitalNoise(uv: vec2f, time: f32) -> f32 {
    let n = noise(uv * 50.0 + time);
    let flicker = step(0.97, n);
    return flicker * 0.15;
  }

  fn dataStream(uv: vec2f, time: f32) -> f32 {
    let streamY = fract(uv.y * 20.0 - time * 2.0);
    let streamX = step(0.85, fract(uv.x * 30.0));
    return streamX * smoothstep(0.0, 0.3, streamY) * smoothstep(1.0, 0.7, streamY) * 0.1;
  }

  fn hexPattern(uv: vec2f) -> f32 {
    let scale = 15.0;
    let p = uv * scale;
    let h = vec2f(1.0, sqrt(3.0));
    let a = (p / h) % 2.0 - 1.0;
    let b = ((p + h * 0.5) / h) % 2.0 - 1.0;
    let d = min(dot(a, a), dot(b, b));
    return smoothstep(0.0, 0.05, d) * 0.05;
  }

  @fragment
  fn fragmentMain(in: VertexOutput) -> @location(0) vec4f {
    let uv = in.uv;
    let t = uniforms.time;

    // Dark digital background
    var color = vec3f(0.08, 0.08, 0.15);

    // Circuit grid with neon glow
    let grid = circuitGrid(uv, t);
    let neonCyan = vec3f(0.0, 0.8, 1.0);
    let neonPurple = vec3f(0.5, 0.2, 0.8);
    let gridColor = mix(neonCyan, neonPurple, sin(t * 0.5) * 0.5 + 0.5);
    color += grid * gridColor;

    // Digital noise
    let noise = digitalNoise(uv, t);
    color += vec3f(noise);

    // Data streams
    let stream = dataStream(uv, t);
    color += vec3f(0.0, stream, stream * 1.5);

    // Hexagonal pattern
    let hex = hexPattern(uv);
    color += vec3f(hex * 0.3, hex * 0.5, hex);

    // Pulse effect when collecting
    if (uniforms.pulse > 0.5) {
      let pulseWave = sin(length(uv - 0.5) * 20.0 - t * 10.0);
      color += vec3f(0.1, 0.3, 0.1) * max(0.0, pulseWave) * 0.3;
    }

    // Vignette
    let vignette = 1.0 - pow(length(uv - 0.5) * 1.2, 2.0);
    color *= max(0.4, vignette);

    // Scanlines
    let scanline = sin(uv.y * uniforms.height * 1.5) * 0.03;
    color -= vec3f(scanline);

    return vec4f(color, 1.0);
  }
`;

export const PARTICLE_SHADER = /* wgsl */ `
  struct Uniforms {
    time: f32,
    width: f32,
    height: f32,
    pulse: f32,
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

  fn digitShape(uv: vec2f, time: f32) -> f32 {
    let centered = uv - 0.5;
    let dist = length(centered);

    // Digital square with rounded corners
    let box = max(abs(centered.x), abs(centered.y));
    let shape = smoothstep(0.4, 0.3, box);

    // Inner glow
    let inner = smoothstep(0.35, 0.0, box);

    return shape * 0.8 + inner * 0.3;
  }

  fn plusShape(uv: vec2f, time: f32) -> f32 {
    let centered = uv - 0.5;

    // Plus sign
    let h = smoothstep(0.1, 0.08, abs(centered.x)) * smoothstep(0.35, 0.3, abs(centered.y));
    let v = smoothstep(0.1, 0.08, abs(centered.y)) * smoothstep(0.35, 0.3, abs(centered.x));

    let plus = max(h, v);
    let glow = exp(-length(centered) * 3.0);

    return plus + glow * 0.3;
  }

  fn minusShape(uv: vec2f, time: f32) -> f32 {
    let centered = uv - 0.5;

    // Minus sign
    let h = smoothstep(0.1, 0.08, abs(centered.y)) * smoothstep(0.35, 0.3, abs(centered.x));
    let glow = exp(-length(centered) * 3.0);

    return h + glow * 0.3;
  }

  fn multiplyShape(uv: vec2f, time: f32) -> f32 {
    let centered = uv - 0.5;
    let angle = atan2(centered.y, centered.x);

    // X shape (rotated plus)
    let rotated = vec2f(
      centered.x * 0.707 - centered.y * 0.707,
      centered.x * 0.707 + centered.y * 0.707
    );

    let h = smoothstep(0.1, 0.08, abs(rotated.x)) * smoothstep(0.35, 0.3, abs(rotated.y));
    let v = smoothstep(0.1, 0.08, abs(rotated.y)) * smoothstep(0.35, 0.3, abs(rotated.x));

    let x = max(h, v);
    let glow = exp(-length(centered) * 3.0);

    return x + glow * 0.3;
  }

  fn glowShape(uv: vec2f, time: f32) -> f32 {
    let dist = length(uv - 0.5);
    let pulse = sin(time * 3.0) * 0.1 + 0.9;
    return smoothstep(0.5, 0.0, dist) * pulse;
  }

  fn burstShape(uv: vec2f, time: f32) -> f32 {
    let centered = uv - 0.5;
    let dist = length(centered);
    let angle = atan2(centered.y, centered.x);

    // Star burst
    let rays = sin(angle * 8.0 + time * 5.0) * 0.1 + 0.3;
    return smoothstep(rays, 0.0, dist);
  }

  @fragment
  fn fragmentMain(in: VertexOutput) -> @location(0) vec4f {
    let uv = in.uv;
    let t = uniforms.time;
    var alpha: f32;
    var color = in.color.rgb;

    let pType = i32(in.particleType);

    switch(pType) {
      case 0: { // digit
        alpha = digitShape(uv, t);
        // Add digital glow
        color += vec3f(0.2, 0.4, 0.6) * alpha * 0.3;
      }
      case 1: { // plus
        alpha = plusShape(uv, t);
        color = mix(color, vec3f(0.0, 1.0, 0.6), 0.3);
      }
      case 2: { // minus
        alpha = minusShape(uv, t);
        color = mix(color, vec3f(1.0, 0.4, 0.3), 0.3);
      }
      case 3: { // multiply
        alpha = multiplyShape(uv, t);
        color = mix(color, vec3f(0.4, 0.7, 1.0), 0.3);
      }
      case 4: { // glow
        alpha = glowShape(uv, t);
      }
      case 5: { // burst
        alpha = burstShape(uv, t);
        color = mix(color, vec3f(1.0, 0.9, 0.4), 0.3);
      }
      default: {
        alpha = 1.0 - length(uv - 0.5) * 2.0;
      }
    }

    alpha *= in.color.a * in.life;
    return vec4f(color, alpha);
  }
`;
