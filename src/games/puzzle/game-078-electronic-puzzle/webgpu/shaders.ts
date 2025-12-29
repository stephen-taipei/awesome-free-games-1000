/**
 * WebGPU Shaders - Electronic Puzzle
 * Cyberpunk / Circuit Board Theme
 * Game #078
 */

export const BACKGROUND_SHADER = /* wgsl */ `
  struct Uniforms {
    time: f32,
    width: f32,
    height: f32,
    powered: f32,
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

  fn circuitPattern(uv: vec2f, time: f32) -> f32 {
    let gridSize = 40.0;
    let gridUV = uv * vec2f(uniforms.width, uniforms.height) / gridSize;
    let cell = floor(gridUV);
    let localUV = fract(gridUV);

    // Main grid lines
    let gridLines = smoothstep(0.02, 0.0, abs(localUV.x - 0.5)) +
                    smoothstep(0.02, 0.0, abs(localUV.y - 0.5));

    // Sub-grid
    let subGrid = smoothstep(0.01, 0.0, abs(localUV.x)) +
                  smoothstep(0.01, 0.0, abs(localUV.y));

    return gridLines * 0.3 + subGrid * 0.1;
  }

  fn dataStream(uv: vec2f, time: f32) -> f32 {
    var stream = 0.0;
    for (var i = 0; i < 5; i++) {
      let offset = f32(i) * 0.2;
      let x = uv.x + offset;
      let speed = 0.5 + f32(i) * 0.1;
      let pos = fract(uv.y * 10.0 + time * speed + hash(vec2f(x * 10.0, f32(i))));
      let brightness = smoothstep(0.1, 0.0, abs(fract(x * 20.0) - 0.5));
      stream += brightness * smoothstep(0.2, 0.0, abs(pos - 0.5)) * 0.15;
    }
    return stream;
  }

  fn scanline(uv: vec2f, time: f32) -> f32 {
    let scan = sin(uv.y * uniforms.height * 2.0) * 0.5 + 0.5;
    return scan * 0.03;
  }

  fn energyPulse(uv: vec2f, time: f32) -> f32 {
    let center = vec2f(0.5, 0.5);
    let dist = length(uv - center);
    let pulse = sin(dist * 20.0 - time * 3.0) * 0.5 + 0.5;
    return pulse * smoothstep(0.5, 0.0, dist) * 0.2;
  }

  @fragment
  fn fragmentMain(in: VertexOutput) -> @location(0) vec4f {
    let uv = in.uv;
    let t = uniforms.time;

    // Dark circuit board base
    var color = vec3f(0.02, 0.02, 0.05);

    // Circuit pattern
    let circuit = circuitPattern(uv, t);
    color += vec3f(0.0, 0.3, 0.2) * circuit;

    // Data streams
    let streams = dataStream(uv, t);
    color += vec3f(0.0, 1.0, 0.5) * streams * uniforms.powered;

    // Energy pulse when powered
    if (uniforms.powered > 0.5) {
      let pulse = energyPulse(uv, t);
      color += vec3f(0.0, 1.0, 0.6) * pulse;
    }

    // Scanlines for CRT effect
    let scan = scanline(uv, t);
    color *= 1.0 - scan;

    // Vignette
    let vignette = 1.0 - length(uv - 0.5) * 0.8;
    color *= vignette;

    // Subtle noise
    let n = noise(uv * 200.0 + t * 10.0) * 0.02;
    color += n;

    return vec4f(color, 1.0);
  }
`;

export const PARTICLE_SHADER = /* wgsl */ `
  struct Uniforms {
    time: f32,
    width: f32,
    height: f32,
    powered: f32,
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

  fn electronShape(uv: vec2f, time: f32) -> f32 {
    let dist = length(uv - 0.5);
    let core = smoothstep(0.3, 0.0, dist);
    let ring = smoothstep(0.45, 0.4, dist) - smoothstep(0.4, 0.35, dist);
    let pulse = sin(time * 10.0) * 0.5 + 0.5;
    return core + ring * pulse * 0.5;
  }

  fn sparkShape(uv: vec2f, time: f32) -> f32 {
    let centered = uv - 0.5;
    let angle = atan2(centered.y, centered.x);
    let dist = length(centered);
    let rays = pow(abs(cos(angle * 4.0 + time * 5.0)), 8.0);
    return rays * smoothstep(0.5, 0.0, dist);
  }

  fn pulseShape(uv: vec2f, time: f32) -> f32 {
    let dist = length(uv - 0.5);
    let ring = smoothstep(0.4, 0.35, dist) - smoothstep(0.35, 0.25, dist);
    let pulse = sin(time * 8.0) * 0.5 + 0.5;
    return ring * (0.5 + pulse * 0.5);
  }

  fn powerShape(uv: vec2f) -> f32 {
    let dist = length(uv - 0.5);
    return smoothstep(0.5, 0.1, dist);
  }

  fn glowShape(uv: vec2f, time: f32) -> f32 {
    let dist = length(uv - 0.5);
    let pulse = sin(time * 4.0) * 0.2 + 0.8;
    return smoothstep(0.5, 0.0, dist) * pulse;
  }

  fn traceShape(uv: vec2f) -> f32 {
    let centered = uv - 0.5;
    // Elongated horizontal shape
    let dist = abs(centered.y) * 3.0 + abs(centered.x) * 0.3;
    return smoothstep(0.5, 0.2, dist);
  }

  @fragment
  fn fragmentMain(in: VertexOutput) -> @location(0) vec4f {
    let uv = in.uv;
    let t = uniforms.time;
    var alpha: f32;
    var color = in.color.rgb;

    let pType = i32(in.particleType);

    switch(pType) {
      case 0: { // electron
        alpha = electronShape(uv, t);
        color = mix(color, vec3f(0.0, 1.0, 1.0), 0.3);
      }
      case 1: { // spark
        alpha = sparkShape(uv, t);
        color = mix(color, vec3f(1.0, 1.0, 0.5), 0.5);
      }
      case 2: { // pulse
        alpha = pulseShape(uv, t);
        color = mix(color, vec3f(0.0, 1.0, 0.8), 0.3);
      }
      case 3: { // power
        alpha = powerShape(uv);
        color = mix(color, vec3f(1.0, 0.9, 0.3), 0.4);
      }
      case 4: { // glow
        alpha = glowShape(uv, t);
      }
      case 5: { // trace
        alpha = traceShape(uv);
        color = mix(color, vec3f(0.0, 1.0, 0.5), 0.2);
      }
      default: {
        alpha = 1.0 - length(uv - 0.5) * 2.0;
      }
    }

    alpha *= in.color.a * in.life;
    return vec4f(color, alpha);
  }
`;
