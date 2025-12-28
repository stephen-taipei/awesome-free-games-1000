/**
 * WebGPU Shaders - Word Guess
 * Secret Agent / Spy Decoder Theme
 * Game #048
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

  fn hash2(p: vec2f) -> vec2f {
    let h = vec2f(dot(p, vec2f(127.1, 311.7)), dot(p, vec2f(269.5, 183.3)));
    return fract(sin(h) * 43758.5453);
  }

  // Matrix rain column
  fn matrixRain(uv: vec2f, time: f32, col: f32) -> f32 {
    let columnId = floor(uv.x * 30.0);
    let seed = hash(vec2f(columnId, 0.0));
    let speed = 0.3 + seed * 0.4;
    let offset = seed * 10.0;

    let y = fract(uv.y + time * speed + offset);
    let fade = smoothstep(0.0, 0.3, y) * smoothstep(1.0, 0.5, y);

    // Character cells
    let charY = floor(y * 15.0);
    let charHash = hash(vec2f(columnId, charY + floor(time * 2.0)));
    let isChar = step(0.5, charHash);

    return fade * isChar * col;
  }

  // Radar sweep
  fn radarSweep(uv: vec2f, time: f32) -> f32 {
    let center = vec2f(0.5, 0.5);
    let toCenter = uv - center;
    let dist = length(toCenter);
    let angle = atan2(toCenter.y, toCenter.x);

    let sweepAngle = time * 1.5;
    let angleDiff = angle - sweepAngle;
    let sweep = smoothstep(0.3, 0.0, abs(sin(angleDiff * 0.5)));

    // Radar rings
    let rings = sin(dist * 30.0 - time * 2.0) * 0.5 + 0.5;
    let ringFade = smoothstep(0.5, 0.2, dist);

    return sweep * ringFade * 0.3 + rings * ringFade * 0.1;
  }

  // Grid pattern
  fn grid(uv: vec2f, time: f32) -> f32 {
    let gridUv = uv * vec2f(uniforms.aspect, 1.0);
    let gridSize = 20.0;

    let lineX = smoothstep(0.02, 0.0, abs(fract(gridUv.x * gridSize) - 0.5));
    let lineY = smoothstep(0.02, 0.0, abs(fract(gridUv.y * gridSize) - 0.5));

    // Pulse effect
    let pulse = sin(time * 2.0) * 0.5 + 0.5;

    return (lineX + lineY) * 0.1 * (0.5 + pulse * 0.5);
  }

  // Scanline effect
  fn scanlines(uv: vec2f, time: f32) -> f32 {
    let scanSpeed = time * 0.3;
    let scanY = fract(scanSpeed);
    let dist = abs(uv.y - scanY);
    return exp(-dist * 30.0) * 0.5;
  }

  // Encrypted text background
  fn encryptedBg(uv: vec2f, time: f32) -> f32 {
    let cell = floor(uv * vec2f(40.0, 25.0));
    let cellHash = hash(cell + floor(time * 0.5));
    let flicker = hash(cell + floor(time * 8.0));

    return cellHash * flicker * 0.15;
  }

  @fragment
  fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
    var uv = input.uv;
    let time = uniforms.time;

    // Dark background
    var color = vec3f(0.02, 0.04, 0.06);

    // Grid overlay
    let gridVal = grid(uv, time);
    color += vec3f(0.0, 0.3, 0.2) * gridVal;

    // Matrix rain
    let rain = matrixRain(uv, time, 1.0);
    color += vec3f(0.0, 0.8, 0.4) * rain * 0.3;

    // Radar sweep
    let radar = radarSweep(uv, time);
    color += vec3f(0.0, 0.6, 0.8) * radar;

    // Scanline
    let scan = scanlines(uv, time);
    color += vec3f(0.2, 0.8, 0.6) * scan;

    // Encrypted background text
    let encrypted = encryptedBg(uv, time);
    color += vec3f(0.0, 0.5, 0.3) * encrypted;

    // Vignette
    let center = vec2f(0.5, 0.5);
    let dist = length(uv - center);
    color *= 1.0 - dist * 0.6;

    // CRT glow
    color *= 1.0 + sin(uv.y * 300.0) * 0.02;

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

    // Type 0: Code rain
    if (input.particleType < 0.5) {
      // Vertical streak
      let streak = smoothstep(0.3, 0.0, abs(input.uv.x)) *
                   smoothstep(0.8, 0.2, abs(input.uv.y));
      alpha = streak * input.life;
      // Glow effect
      let glow = exp(-dist * 3.0) * 0.5;
      alpha += glow * input.life;
    }
    // Type 1: Decrypt sparkle
    else if (input.particleType < 1.5) {
      let spark = smoothstep(0.5, 0.0, dist);
      let twinkle = sin(time * 15.0 + dist * 5.0) * 0.5 + 0.5;
      alpha = spark * input.life * (0.7 + twinkle * 0.3);
      // Bright core
      let core = smoothstep(0.2, 0.0, dist);
      color = mix(color, vec3f(1.0, 1.0, 1.0), core * 0.5);
    }
    // Type 2: Victory - data burst
    else if (input.particleType < 2.5) {
      let burst = smoothstep(0.6, 0.0, dist);
      alpha = burst * input.life;
      // Binary pattern
      let pattern = step(0.5, fract(input.uv.x * 4.0 + time * 2.0));
      alpha *= 0.6 + pattern * 0.4;
    }
    // Type 3: Ambient - scanning dots
    else if (input.particleType < 3.5) {
      let dot = smoothstep(0.8, 0.2, dist);
      alpha = dot * input.life * 0.4;
      // Pulse
      alpha *= 0.6 + sin(time * 5.0) * 0.4;
    }
    // Type 4: Pulse wave
    else {
      let ring = smoothstep(0.9, 0.7, dist) * smoothstep(0.5, 0.7, dist);
      alpha = ring * input.life * 0.8;
      // Expand effect
      let expand = 1.0 - input.life;
      alpha *= smoothstep(0.0, 0.3, expand);
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

    // Center burst
    let center = vec2f(0.5, 0.5);
    let toCenter = uv - center;
    let dist = length(toCenter);
    let angle = atan2(toCenter.y, toCenter.x);

    // Data stream rays
    let rays = pow(abs(cos(angle * 8.0 + time * 3.0)), 4.0);
    let rayFade = smoothstep(0.6, 0.0, dist);

    // Binary rings
    let rings = step(0.5, fract(dist * 15.0 - time * 4.0));
    let ringFade = smoothstep(0.5, 0.1, dist);

    // Green/cyan color scheme
    let green = vec3f(0.0, 1.0, 0.5);
    let cyan = vec3f(0.0, 0.8, 1.0);
    let color = mix(green, cyan, sin(angle + time) * 0.5 + 0.5);

    let alpha = (rays * rayFade * 0.4 + rings * ringFade * 0.3) * intensity;

    return vec4f(color, alpha);
  }
`;
