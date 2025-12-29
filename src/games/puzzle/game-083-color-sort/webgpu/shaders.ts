/**
 * WebGPU Shaders - Color Sort
 * Bubbly / Liquid / Glass Theme
 * Game #083
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

  fn bubbles(uv: vec2f, time: f32) -> f32 {
    var result = 0.0;
    for (var i = 0; i < 8; i++) {
      let seed = f32(i) * 1.234;
      let bx = fract(seed * 0.7) * 0.8 + 0.1;
      let speed = 0.3 + fract(seed * 1.5) * 0.4;
      let by = fract((uv.y + time * speed + seed) * 0.5);
      let size = 0.02 + fract(seed * 2.0) * 0.03;

      let bubble = smoothstep(size, 0.0, length(vec2f(uv.x - bx, by - 0.5)));
      result += bubble * 0.15;
    }
    return result;
  }

  fn liquidGradient(uv: vec2f, time: f32) -> vec3f {
    let wave = sin(uv.x * 4.0 + time) * 0.02;
    let y = uv.y + wave;

    // Rainbow gradient
    let hue = fract(uv.x * 0.3 + time * 0.05);
    let r = 0.5 + 0.5 * sin(hue * 6.28318 + 0.0);
    let g = 0.5 + 0.5 * sin(hue * 6.28318 + 2.094);
    let b = 0.5 + 0.5 * sin(hue * 6.28318 + 4.188);

    return vec3f(r, g, b) * 0.3;
  }

  fn glassShine(uv: vec2f, time: f32) -> f32 {
    let angle = atan2(uv.y - 0.5, uv.x - 0.5);
    let dist = length(uv - 0.5);

    let shine = sin(angle * 3.0 + time * 0.5) * 0.5 + 0.5;
    return shine * smoothstep(0.6, 0.2, dist) * 0.1;
  }

  fn softGradient(uv: vec2f) -> vec3f {
    // Soft purple gradient
    let top = vec3f(0.64, 0.61, 0.99);    // Light purple
    let bottom = vec3f(0.42, 0.36, 0.91); // Darker purple

    return mix(bottom, top, uv.y);
  }

  @fragment
  fn fragmentMain(in: VertexOutput) -> @location(0) vec4f {
    let uv = in.uv;
    let t = uniforms.time;

    // Base gradient
    var color = softGradient(uv);

    // Add subtle liquid effect
    let liquid = liquidGradient(uv, t);
    color += liquid * 0.2;

    // Floating bubbles
    let bubs = bubbles(uv, t);
    color += vec3f(bubs);

    // Glass shine
    let shine = glassShine(uv, t);
    color += vec3f(shine);

    // Activity pulse
    if (uniforms.activity > 0.5) {
      let pulse = sin(t * 8.0) * 0.05;
      color += vec3f(pulse, pulse * 0.5, pulse);
    }

    // Soft vignette
    let vignette = 1.0 - pow(length(uv - 0.5) * 0.9, 2.0);
    color *= max(0.7, vignette);

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

    // Rim
    let rim = smoothstep(0.5, 0.45, dist) * smoothstep(0.35, 0.4, dist);

    return bubble * 0.6 + highlight * 0.5 + rim * 0.3;
  }

  fn dropletShape(uv: vec2f, time: f32) -> f32 {
    let centered = uv - 0.5;

    // Teardrop shape
    let y = centered.y + 0.1;
    let x = centered.x;
    let shape = length(vec2f(x, y * 1.5)) + y * 0.5;

    return smoothstep(0.4, 0.2, shape);
  }

  fn splashShape(uv: vec2f, time: f32) -> f32 {
    let centered = uv - 0.5;
    let dist = length(centered);
    let angle = atan2(centered.y, centered.x);

    // Splash ring with droplets
    let ring = smoothstep(0.4, 0.35, dist) * smoothstep(0.2, 0.25, dist);
    let droplets = pow(abs(sin(angle * 8.0 + time * 5.0)), 4.0);

    return ring + droplets * smoothstep(0.5, 0.3, dist) * 0.4;
  }

  fn glowShape(uv: vec2f, time: f32) -> f32 {
    let dist = length(uv - 0.5);
    let pulse = sin(time * 2.0) * 0.1 + 0.9;
    return smoothstep(0.5, 0.0, dist) * pulse;
  }

  fn sparkleShape(uv: vec2f, time: f32) -> f32 {
    let centered = uv - 0.5;
    let dist = length(centered);
    let angle = atan2(centered.y, centered.x);

    // 4-pointed star
    let star = abs(sin(angle * 2.0));
    let size = 0.3 / (star * 0.5 + 0.5);

    return smoothstep(size, 0.0, dist);
  }

  fn burstShape(uv: vec2f, time: f32) -> f32 {
    let centered = uv - 0.5;
    let dist = length(centered);
    let angle = atan2(centered.y, centered.x);

    let rays = sin(angle * 6.0 + time * 4.0) * 0.15 + 0.35;
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
      case 0: { // bubble
        alpha = bubbleShape(uv, t);
        color = mix(color, vec3f(1.0, 1.0, 1.0), 0.4);
      }
      case 1: { // droplet
        alpha = dropletShape(uv, t);
        color = mix(color, vec3f(0.9, 0.95, 1.0), 0.2);
      }
      case 2: { // splash
        alpha = splashShape(uv, t);
        color = mix(color, vec3f(1.0, 1.0, 1.0), 0.3);
      }
      case 3: { // glow
        alpha = glowShape(uv, t);
      }
      case 4: { // sparkle
        alpha = sparkleShape(uv, t);
        color = mix(color, vec3f(1.0, 1.0, 1.0), 0.5);
      }
      case 5: { // burst
        alpha = burstShape(uv, t);
      }
      default: {
        alpha = 1.0 - length(uv - 0.5) * 2.0;
      }
    }

    alpha *= in.color.a * in.life;
    return vec4f(color, alpha);
  }
`;
