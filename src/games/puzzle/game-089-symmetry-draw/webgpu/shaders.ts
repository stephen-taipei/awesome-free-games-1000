/**
 * WebGPU Shaders - Symmetry Draw
 * Kaleidoscope / Rainbow / Prismatic Theme
 * Game #089
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

  fn hsvToRgb(h: f32, s: f32, v: f32) -> vec3f {
    let c = v * s;
    let x = c * (1.0 - abs(fract(h * 6.0) * 2.0 - 1.0));
    let m = v - c;

    var rgb: vec3f;
    let hi = i32(h * 6.0) % 6;
    switch(hi) {
      case 0: { rgb = vec3f(c, x, 0.0); }
      case 1: { rgb = vec3f(x, c, 0.0); }
      case 2: { rgb = vec3f(0.0, c, x); }
      case 3: { rgb = vec3f(0.0, x, c); }
      case 4: { rgb = vec3f(x, 0.0, c); }
      default: { rgb = vec3f(c, 0.0, x); }
    }
    return rgb + m;
  }

  fn kaleidoscopePattern(uv: vec2f, time: f32) -> f32 {
    let centered = uv - 0.5;
    let angle = atan2(centered.y, centered.x);
    let dist = length(centered);

    let segments = 8.0;
    let segAngle = abs(sin(angle * segments + time * 0.5)) * 0.5 + 0.5;

    let rings = sin(dist * 20.0 - time * 2.0) * 0.5 + 0.5;

    return segAngle * rings * 0.2;
  }

  fn prismGradient(uv: vec2f, time: f32) -> vec3f {
    let centered = uv - 0.5;
    let angle = atan2(centered.y, centered.x);
    let dist = length(centered);

    // Rainbow hue based on angle
    let hue = fract((angle / 6.28) + time * 0.1);
    let sat = 0.5 + dist * 0.3;
    let val = 0.15 + dist * 0.1;

    return hsvToRgb(hue, sat, val);
  }

  fn shimmerEffect(uv: vec2f, time: f32) -> f32 {
    let wave1 = sin(uv.x * 30.0 + time * 3.0) * 0.5 + 0.5;
    let wave2 = sin(uv.y * 25.0 + time * 2.5) * 0.5 + 0.5;
    let combined = wave1 * wave2;
    return combined * 0.1;
  }

  fn centerGlow(uv: vec2f, time: f32) -> vec3f {
    let dist = length(uv - 0.5);
    let pulse = sin(time * 2.0) * 0.2 + 0.8;
    let glow = 0.04 / (dist + 0.1) * pulse;

    // Shifting rainbow color
    let hue = fract(time * 0.15);
    return hsvToRgb(hue, 0.6, 1.0) * glow * 0.4;
  }

  @fragment
  fn fragmentMain(in: VertexOutput) -> @location(0) vec4f {
    let uv = in.uv;
    let t = uniforms.time;

    // Base prismatic gradient
    var color = prismGradient(uv, t);

    // Kaleidoscope pattern
    let kaleidoscope = kaleidoscopePattern(uv, t);
    color += vec3f(kaleidoscope) * 0.3;

    // Shimmer
    let shimmer = shimmerEffect(uv, t);
    color += vec3f(shimmer);

    // Center glow
    color += centerGlow(uv, t);

    // Activity rainbow pulse
    if (uniforms.activity > 0.1) {
      let pulse = sin(t * 6.0) * 0.15;
      let hue = fract(t * 0.3);
      color += hsvToRgb(hue, 0.8, 1.0) * pulse * uniforms.activity;
    }

    // Soft vignette
    let vignette = 1.0 - pow(length(uv - 0.5) * 1.0, 2.0);
    color *= max(0.5, vignette);

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

  fn shimmerShape(uv: vec2f, time: f32) -> f32 {
    let dist = length(uv - 0.5);
    let sparkle = sin(time * 15.0 + dist * 20.0) * 0.3 + 0.7;
    return smoothstep(0.5, 0.0, dist) * sparkle;
  }

  fn trailShape(uv: vec2f, time: f32) -> f32 {
    let centered = uv - 0.5;
    let stretch = vec2f(centered.x * 0.5, centered.y * 1.5);
    let dist = length(stretch);
    return smoothstep(0.5, 0.0, dist);
  }

  fn glowShape(uv: vec2f, time: f32) -> f32 {
    let dist = length(uv - 0.5);
    let pulse = sin(time * 4.0) * 0.1 + 0.9;
    return smoothstep(0.5, 0.0, dist) * pulse;
  }

  fn prismShape(uv: vec2f, time: f32) -> f32 {
    let centered = uv - 0.5;
    let dist = length(centered);

    // Diamond/crystal shape
    let diamond = abs(centered.x) + abs(centered.y);
    let facets = pow(abs(sin(atan2(centered.y, centered.x) * 4.0 + time * 2.0)), 2.0) * 0.2 + 0.8;

    return smoothstep(0.5, 0.2, diamond) * facets;
  }

  fn sparkShape(uv: vec2f, time: f32) -> f32 {
    let centered = uv - 0.5;
    let dist = length(centered);
    let angle = atan2(centered.y, centered.x);

    // 4-point star spark
    let star = pow(abs(sin(angle * 2.0 + time * 5.0)), 4.0) * 0.4 + 0.3;
    let flicker = sin(time * 20.0) * 0.2 + 0.8;

    return smoothstep(star * flicker, 0.0, dist);
  }

  fn waveShape(uv: vec2f, time: f32) -> f32 {
    let centered = uv - 0.5;
    let dist = length(centered);

    // Concentric waves
    let wave = sin(dist * 25.0 - time * 8.0) * 0.5 + 0.5;
    let fade = smoothstep(0.5, 0.0, dist);

    return wave * fade * 0.8;
  }

  @fragment
  fn fragmentMain(in: VertexOutput) -> @location(0) vec4f {
    let uv = in.uv;
    let t = uniforms.time;
    var alpha: f32;
    var color = in.color.rgb;

    let pType = i32(in.particleType);

    switch(pType) {
      case 0: { // shimmer
        alpha = shimmerShape(uv, t);
        color = mix(color, vec3f(1.0, 1.0, 1.0), 0.4);
      }
      case 1: { // trail
        alpha = trailShape(uv, t);
        color = mix(color, vec3f(1.0, 0.9, 1.0), 0.2);
      }
      case 2: { // glow
        alpha = glowShape(uv, t);
        color = mix(color, vec3f(1.0, 1.0, 0.9), 0.3);
      }
      case 3: { // prism
        alpha = prismShape(uv, t);
        color = mix(color, vec3f(1.0, 1.0, 1.0), 0.5);
      }
      case 4: { // spark
        alpha = sparkShape(uv, t);
        color = mix(color, vec3f(1.0, 0.95, 0.8), 0.4);
      }
      case 5: { // wave
        alpha = waveShape(uv, t);
        color = mix(color, vec3f(0.9, 0.95, 1.0), 0.3);
      }
      default: {
        alpha = 1.0 - length(uv - 0.5) * 2.0;
      }
    }

    alpha *= in.color.a * in.life;
    return vec4f(color, alpha);
  }
`;
