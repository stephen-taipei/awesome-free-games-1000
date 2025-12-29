/**
 * WebGPU Shaders - Number Link
 * Neon Circuit / Cyberpunk Grid Theme
 * Game #043
 */

export const backgroundShader = /* wgsl */ `
  struct Uniforms {
    time: f32,
    aspect: f32,
    pad1: f32,
    pad2: f32,
  }

  @group(0) @binding(0) var<uniform> uniforms: Uniforms;

  struct VertexOutput {
    @builtin(position) position: vec4f,
    @location(0) uv: vec2f,
  }

  @vertex
  fn vertexMain(@builtin(vertex_index) vertexIndex: u32) -> VertexOutput {
    var positions = array<vec2f, 6>(
      vec2f(-1.0, -1.0), vec2f(1.0, -1.0), vec2f(-1.0, 1.0),
      vec2f(-1.0, 1.0), vec2f(1.0, -1.0), vec2f(1.0, 1.0)
    );

    var output: VertexOutput;
    output.position = vec4f(positions[vertexIndex], 0.0, 1.0);
    output.uv = positions[vertexIndex] * 0.5 + 0.5;
    return output;
  }

  fn hash(p: vec2f) -> f32 {
    var p3 = fract(vec3f(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
  }

  // Circuit board pattern
  fn circuitPattern(uv: vec2f, scale: f32) -> f32 {
    let grid = fract(uv * scale);
    let gridId = floor(uv * scale);

    let h = hash(gridId);
    var pattern = 0.0;

    // Horizontal traces
    if (h < 0.3) {
      pattern = step(abs(grid.y - 0.5), 0.08);
    }
    // Vertical traces
    else if (h < 0.6) {
      pattern = step(abs(grid.x - 0.5), 0.08);
    }
    // Corner connections
    else if (h < 0.8) {
      let corner = step(abs(grid.x - 0.5), 0.1) * step(grid.y, 0.5);
      let corner2 = step(abs(grid.y - 0.5), 0.1) * step(grid.x, 0.5);
      pattern = max(corner, corner2);
    }

    return pattern;
  }

  // Chip/node markers
  fn chipNode(uv: vec2f, center: vec2f, size: f32) -> f32 {
    let d = abs(uv - center);
    let box = step(d.x, size) * step(d.y, size);
    let inner = step(d.x, size * 0.6) * step(d.y, size * 0.6);
    return box - inner * 0.5;
  }

  // Data flow pulse along circuit
  fn dataFlow(uv: vec2f, time: f32) -> f32 {
    let flow = fract(uv.x * 8.0 - time * 2.0);
    return smoothstep(0.0, 0.3, flow) * smoothstep(0.6, 0.3, flow);
  }

  // Hex grid background
  fn hexPattern(uv: vec2f) -> f32 {
    let scale = 15.0;
    var p = uv * scale;
    p.x *= 1.1547; // 2/sqrt(3)

    let isOdd = step(1.0, fract(floor(p.x) * 0.5) * 2.0);
    p.y += isOdd * 0.5;

    let gridCell = fract(p) - 0.5;
    let dist = length(gridCell);

    return smoothstep(0.5, 0.45, dist) - smoothstep(0.45, 0.4, dist);
  }

  // Scanline effect
  fn scanlines(uv: vec2f, time: f32) -> f32 {
    let line = sin(uv.y * 200.0 + time * 5.0) * 0.5 + 0.5;
    let scan = fract(uv.y * 50.0 - time * 0.5);
    let scanBright = smoothstep(0.95, 1.0, scan) * 0.3;
    return 1.0 - line * 0.05 + scanBright;
  }

  @fragment
  fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
    var uv = input.uv;
    uv.x *= uniforms.aspect;
    let time = uniforms.time;

    // Deep cyberpunk background
    let bgGradient = mix(
      vec3f(0.02, 0.01, 0.08),  // Deep purple-black
      vec3f(0.05, 0.02, 0.12),  // Dark purple
      uv.y
    );

    // Circuit board traces
    let circuit1 = circuitPattern(uv + vec2f(time * 0.02, 0.0), 12.0);
    let circuit2 = circuitPattern(uv * 0.7 + vec2f(0.0, time * 0.015), 8.0);

    // Data flow animation
    let flow = dataFlow(uv, time) * circuit1;

    // Hex grid overlay
    let hex = hexPattern(uv + vec2f(time * 0.01, time * 0.005));

    // Circuit colors
    let neonCyan = vec3f(0.0, 0.9, 1.0);
    let neonMagenta = vec3f(1.0, 0.0, 0.6);
    let neonPurple = vec3f(0.6, 0.0, 1.0);

    // Combine layers
    var color = bgGradient;

    // Static circuit traces
    color += neonPurple * circuit1 * 0.08;
    color += neonCyan * circuit2 * 0.05;

    // Animated data flow
    color += neonCyan * flow * 0.4;

    // Hex grid
    color += neonMagenta * hex * 0.06;

    // Corner vignette
    let center = vec2f(0.5 * uniforms.aspect, 0.5);
    let vignette = 1.0 - length(uv - center) * 0.6;
    color *= vignette;

    // Scanlines
    color *= scanlines(input.uv, time);

    // CRT-like glow at edges
    let edgeDist = min(min(input.uv.x, 1.0 - input.uv.x), min(input.uv.y, 1.0 - input.uv.y));
    let edgeGlow = smoothstep(0.0, 0.15, edgeDist);
    color = mix(color * 0.3, color, edgeGlow);

    return vec4f(color, 1.0);
  }
`;

export const particleShader = /* wgsl */ `
  struct Uniforms {
    time: f32,
    aspect: f32,
    pad1: f32,
    pad2: f32,
  }

  struct Particle {
    x: f32,
    y: f32,
    vx: f32,
    vy: f32,
    life: f32,
    maxLife: f32,
    size: f32,
    particleType: f32,
    r: f32,
    g: f32,
    b: f32,
    a: f32,
  }

  @group(0) @binding(0) var<uniform> uniforms: Uniforms;
  @group(0) @binding(1) var<storage, read> particles: array<Particle>;

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
    @builtin(instance_index) instanceIndex: u32
  ) -> VertexOutput {
    let quad = array<vec2f, 6>(
      vec2f(-1.0, -1.0), vec2f(1.0, -1.0), vec2f(-1.0, 1.0),
      vec2f(-1.0, 1.0), vec2f(1.0, -1.0), vec2f(1.0, 1.0)
    );

    let p = particles[instanceIndex];
    let lifeRatio = p.life / p.maxLife;
    let size = p.size * lifeRatio;

    var pos = quad[vertexIndex] * size;
    pos.x /= uniforms.aspect;
    pos += vec2f(p.x * 2.0 - 1.0, 1.0 - p.y * 2.0);

    var output: VertexOutput;
    output.position = vec4f(pos, 0.0, 1.0);
    output.uv = quad[vertexIndex];
    output.color = vec4f(p.r, p.g, p.b, p.a * lifeRatio);
    output.particleType = p.particleType;
    output.life = lifeRatio;
    return output;
  }

  @fragment
  fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
    let dist = length(input.uv);
    let time = uniforms.time;
    var alpha = 0.0;
    var color = input.color.rgb;

    // Type 0: Data bit - square with glow
    if (input.particleType < 0.5) {
      let square = step(max(abs(input.uv.x), abs(input.uv.y)), 0.6);
      let innerSquare = step(max(abs(input.uv.x), abs(input.uv.y)), 0.3);
      alpha = square * (0.8 + innerSquare * 0.2);
      alpha *= input.life;
      // Digital flicker
      alpha *= 0.8 + sin(time * 20.0 + input.uv.x * 10.0) * 0.2;
    }
    // Type 1: Connection - line segment
    else if (input.particleType < 1.5) {
      let line = smoothstep(0.2, 0.0, abs(input.uv.y)) * smoothstep(1.0, 0.0, abs(input.uv.x));
      alpha = line * input.life;
      // Pulse along line
      let pulse = sin(input.uv.x * 6.28 - time * 8.0) * 0.5 + 0.5;
      color = mix(color, color * 1.5, pulse * 0.5);
    }
    // Type 2: Victory - expanding ring
    else if (input.particleType < 2.5) {
      let ring = smoothstep(0.7, 0.5, dist) * smoothstep(0.3, 0.5, dist);
      alpha = ring * input.life;
      // Rainbow shift
      let hueShift = time * 2.0 + dist * 3.0;
      color = vec3f(
        sin(hueShift) * 0.5 + 0.5,
        sin(hueShift + 2.094) * 0.5 + 0.5,
        sin(hueShift + 4.189) * 0.5 + 0.5
      );
    }
    // Type 3: Ambient - floating data
    else if (input.particleType < 3.5) {
      let flicker = step(0.5, fract(time * 5.0 + dist * 2.0));
      alpha = smoothstep(1.0, 0.0, dist) * input.life * 0.4 * (0.7 + flicker * 0.3);
    }
    // Type 4: Electric - spark
    else {
      let spark = smoothstep(0.5, 0.0, dist);
      let core = smoothstep(0.2, 0.0, dist);
      alpha = spark * input.life;
      color = mix(color, vec3f(1.0, 1.0, 1.0), core);
      // Jitter
      alpha *= 0.6 + sin(time * 50.0 + input.uv.x * 30.0) * 0.4;
    }

    return vec4f(color, alpha * input.color.a);
  }
`;

export const victoryShader = /* wgsl */ `
  struct Uniforms {
    time: f32,
    intensity: f32,
    pad1: f32,
    pad2: f32,
  }

  @group(0) @binding(0) var<uniform> uniforms: Uniforms;

  struct VertexOutput {
    @builtin(position) position: vec4f,
    @location(0) uv: vec2f,
  }

  @vertex
  fn vertexMain(@builtin(vertex_index) vertexIndex: u32) -> VertexOutput {
    var positions = array<vec2f, 6>(
      vec2f(-1.0, -1.0), vec2f(1.0, -1.0), vec2f(-1.0, 1.0),
      vec2f(-1.0, 1.0), vec2f(1.0, -1.0), vec2f(1.0, 1.0)
    );

    var output: VertexOutput;
    output.position = vec4f(positions[vertexIndex], 0.0, 1.0);
    output.uv = positions[vertexIndex] * 0.5 + 0.5;
    return output;
  }

  @fragment
  fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
    let time = uniforms.time;
    let intensity = uniforms.intensity;
    let uv = input.uv;

    // Expanding circuit rings
    let center = vec2f(0.5, 0.5);
    let dist = length(uv - center);

    // Multiple expanding rings
    var rings = 0.0;
    for (var i = 0; i < 5; i++) {
      let ringDist = fract(dist * 3.0 - time * 2.0 + f32(i) * 0.2);
      let ring = smoothstep(0.1, 0.0, abs(ringDist - 0.5));
      rings += ring;
    }

    // Neon colors cycling
    let hue = time * 3.0 + dist * 4.0;
    let neonCyan = vec3f(0.0, 0.9, 1.0);
    let neonMagenta = vec3f(1.0, 0.0, 0.6);
    let neonYellow = vec3f(1.0, 0.9, 0.0);

    var color = mix(neonCyan, neonMagenta, sin(hue) * 0.5 + 0.5);
    color = mix(color, neonYellow, sin(hue * 0.7 + 1.0) * 0.3 + 0.3);

    // Grid flash
    let gridX = smoothstep(0.02, 0.0, abs(fract(uv.x * 20.0) - 0.5));
    let gridY = smoothstep(0.02, 0.0, abs(fract(uv.y * 20.0) - 0.5));
    let grid = max(gridX, gridY) * sin(time * 10.0) * 0.5 + 0.5;

    // Combine effects
    let alpha = (rings * 0.4 + grid * 0.2) * intensity;

    return vec4f(color, alpha);
  }
`;
