/**
 * WebGPU Shaders - Untangle
 * Constellation / Star Map Theme
 * Game #049
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

  fn fbm(p: vec2f) -> f32 {
    var value = 0.0;
    var amplitude = 0.5;
    var freq = 1.0;
    var pos = p;

    for (var i = 0; i < 5; i++) {
      value += amplitude * noise(pos * freq);
      freq *= 2.0;
      amplitude *= 0.5;
    }

    return value;
  }

  // Nebula color layers
  fn nebula(uv: vec2f, time: f32) -> vec3f {
    let p = uv * vec2f(uniforms.aspect, 1.0);

    // Slow drift
    let drift = vec2f(time * 0.02, time * 0.015);

    // Multiple noise layers
    let n1 = fbm(p * 2.0 + drift);
    let n2 = fbm(p * 3.0 - drift * 0.7);
    let n3 = fbm(p * 5.0 + drift * 1.3);

    // Color palette
    let purple = vec3f(0.3, 0.1, 0.5);
    let blue = vec3f(0.1, 0.2, 0.5);
    let cyan = vec3f(0.1, 0.4, 0.5);
    let pink = vec3f(0.4, 0.15, 0.35);

    var color = vec3f(0.0);
    color = mix(color, purple, n1 * 0.5);
    color = mix(color, blue, n2 * 0.4);
    color = mix(color, cyan, n3 * 0.3);
    color = mix(color, pink, smoothstep(0.4, 0.6, n1 * n2) * 0.4);

    return color;
  }

  // Distant stars
  fn stars(uv: vec2f, time: f32, density: f32) -> f32 {
    let p = floor(uv * density);
    let f = fract(uv * density);

    let center = vec2f(hash(p), hash(p + vec2f(1.0, 0.0)));
    let dist = length(f - center);

    let brightness = hash(p + vec2f(0.0, 1.0));
    let twinkle = sin(time * 3.0 + brightness * 20.0) * 0.5 + 0.5;

    return smoothstep(0.08, 0.0, dist) * brightness * (0.5 + twinkle * 0.5);
  }

  // Aurora effect
  fn aurora(uv: vec2f, time: f32) -> vec3f {
    let y = uv.y;
    let x = uv.x * uniforms.aspect;

    // Wave pattern
    let wave = sin(x * 3.0 + time * 0.5) * 0.1 +
               sin(x * 5.0 - time * 0.7) * 0.05;

    let auroraY = 0.7 + wave;
    let intensity = smoothstep(0.15, 0.0, abs(y - auroraY));

    // Color shift
    let hue = x * 0.3 + time * 0.2;
    let color = vec3f(
      0.2 + sin(hue) * 0.3,
      0.6 + sin(hue + 2.0) * 0.2,
      0.8 + sin(hue + 4.0) * 0.2
    );

    return color * intensity * 0.3;
  }

  @fragment
  fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
    var uv = input.uv;
    let time = uniforms.time;

    // Deep space background
    var color = vec3f(0.02, 0.02, 0.05);

    // Add nebula
    color += nebula(uv, time) * 0.4;

    // Add distant stars (multiple layers)
    let starLayer1 = stars(uv * vec2f(uniforms.aspect, 1.0), time, 30.0);
    let starLayer2 = stars(uv * vec2f(uniforms.aspect, 1.0) + vec2f(0.5, 0.3), time * 0.8, 50.0);
    let starLayer3 = stars(uv * vec2f(uniforms.aspect, 1.0) + vec2f(0.2, 0.7), time * 1.2, 80.0);

    color += vec3f(1.0, 0.95, 0.9) * starLayer1 * 0.8;
    color += vec3f(0.9, 0.95, 1.0) * starLayer2 * 0.5;
    color += vec3f(0.95, 0.9, 1.0) * starLayer3 * 0.3;

    // Add aurora
    color += aurora(uv, time);

    // Vignette
    let center = vec2f(0.5, 0.5);
    let dist = length(uv - center);
    color *= 1.0 - dist * 0.5;

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

    // Type 0: Stardust
    if (input.particleType < 0.5) {
      let twinkle = sin(time * 8.0 + dist * 5.0) * 0.5 + 0.5;
      alpha = smoothstep(1.0, 0.0, dist) * input.life * (0.6 + twinkle * 0.4);
    }
    // Type 1: Spark (node interaction)
    else if (input.particleType < 1.5) {
      let spark = smoothstep(0.5, 0.0, dist);
      let rays = abs(sin(atan2(input.uv.y, input.uv.x) * 4.0)) * 0.5 + 0.5;
      alpha = spark * input.life * (0.7 + rays * 0.3);
    }
    // Type 2: Nova (crossing resolved)
    else if (input.particleType < 2.5) {
      let ring = smoothstep(0.8, 0.6, dist) * smoothstep(0.4, 0.6, dist);
      let burst = smoothstep(0.4, 0.0, dist);
      alpha = (ring + burst * 0.5) * input.life;
      color = mix(color, vec3f(1.0, 1.0, 1.0), burst * 0.5);
    }
    // Type 3: Victory - constellation glow
    else if (input.particleType < 3.5) {
      let starShape = smoothstep(0.6, 0.0, dist);
      let rays = pow(abs(cos(atan2(input.uv.y, input.uv.x) * 3.0)), 4.0);
      alpha = starShape * input.life * (0.6 + rays * 0.4);
      // Color shift
      let hue = time * 2.0;
      color = mix(color, vec3f(
        sin(hue) * 0.3 + 0.7,
        sin(hue + 2.0) * 0.3 + 0.7,
        sin(hue + 4.0) * 0.3 + 0.7
      ), 0.3);
    }
    // Type 4: Pulse (connection glow)
    else {
      let pulse = smoothstep(1.0, 0.3, dist) * smoothstep(0.0, 0.2, dist);
      alpha = pulse * input.life * 0.6;
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

    let center = vec2f(0.5, 0.5);
    let toCenter = uv - center;
    let dist = length(toCenter);
    let angle = atan2(toCenter.y, toCenter.x);

    // Star burst rays
    let rays = pow(abs(cos(angle * 6.0 + time * 2.0)), 6.0);
    let rayFade = smoothstep(0.6, 0.0, dist);

    // Expanding rings
    let rings = sin(dist * 25.0 - time * 6.0) * 0.5 + 0.5;
    let ringFade = smoothstep(0.5, 0.1, dist);

    // Constellation colors
    let blue = vec3f(0.3, 0.6, 1.0);
    let gold = vec3f(1.0, 0.9, 0.5);
    let color = mix(blue, gold, sin(angle + time) * 0.5 + 0.5);

    let alpha = (rays * rayFade * 0.5 + rings * ringFade * 0.3) * intensity;

    return vec4f(color, alpha);
  }
`;
