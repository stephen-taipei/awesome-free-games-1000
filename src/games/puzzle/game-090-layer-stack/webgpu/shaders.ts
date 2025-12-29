/**
 * WebGPU Shaders - Layer Stack
 * Holographic / Translucent / Layered Theme
 * Game #090
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

  fn holographicGradient(uv: vec2f, time: f32) -> vec3f {
    // Multi-layered holographic effect
    let layer1 = sin(uv.x * 8.0 + time * 2.0) * 0.5 + 0.5;
    let layer2 = sin(uv.y * 6.0 - time * 1.5) * 0.5 + 0.5;
    let layer3 = sin((uv.x + uv.y) * 5.0 + time * 2.5) * 0.5 + 0.5;

    let hue = fract(layer1 * 0.3 + layer2 * 0.3 + layer3 * 0.2 + time * 0.1);
    let sat = 0.4 + layer3 * 0.2;
    let val = 0.12 + layer1 * 0.05;

    return hsvToRgb(hue, sat, val);
  }

  fn translucentLayers(uv: vec2f, time: f32) -> f32 {
    var layers: f32 = 0.0;

    // Multiple translucent layers
    for (var i: i32 = 0; i < 5; i++) {
      let offset = f32(i) * 0.15;
      let phase = time * (0.5 + f32(i) * 0.1) + offset;
      let wave = sin(uv.x * 10.0 + phase) * sin(uv.y * 8.0 + phase * 0.7);
      layers += wave * 0.08 / f32(i + 1);
    }

    return layers;
  }

  fn shimmerEffect(uv: vec2f, time: f32) -> f32 {
    let shimmer1 = sin(uv.x * 30.0 + time * 4.0) * 0.5 + 0.5;
    let shimmer2 = sin(uv.y * 25.0 + time * 3.5) * 0.5 + 0.5;
    let combined = shimmer1 * shimmer2;
    return combined * 0.08;
  }

  fn glassReflection(uv: vec2f, time: f32) -> vec3f {
    let angle = atan2(uv.y - 0.5, uv.x - 0.5);
    let dist = length(uv - 0.5);

    // Glass-like reflection bands
    let reflection = sin(angle * 3.0 + time * 1.5) * 0.5 + 0.5;
    let fade = 1.0 - dist * 1.2;

    let hue = fract(angle / 6.28 + time * 0.15);
    return hsvToRgb(hue, 0.3, 0.15) * reflection * max(0.0, fade);
  }

  fn gridPattern(uv: vec2f, time: f32) -> f32 {
    let gridX = sin(uv.x * 40.0) * 0.5 + 0.5;
    let gridY = sin(uv.y * 40.0) * 0.5 + 0.5;
    let grid = smoothstep(0.95, 1.0, max(gridX, gridY));
    return grid * 0.03 * (sin(time * 2.0) * 0.3 + 0.7);
  }

  @fragment
  fn fragmentMain(in: VertexOutput) -> @location(0) vec4f {
    let uv = in.uv;
    let t = uniforms.time;

    // Base holographic gradient
    var color = holographicGradient(uv, t);

    // Translucent layer effect
    let layers = translucentLayers(uv, t);
    color += vec3f(layers * 0.5, layers * 0.6, layers);

    // Shimmer
    let shimmer = shimmerEffect(uv, t);
    color += vec3f(shimmer);

    // Glass reflection
    color += glassReflection(uv, t);

    // Subtle grid
    let grid = gridPattern(uv, t);
    color += vec3f(grid * 0.5, grid * 0.8, grid);

    // Activity pulse
    if (uniforms.activity > 0.1) {
      let pulse = sin(t * 5.0) * 0.1 + 0.9;
      color += vec3f(0.1, 0.2, 0.3) * pulse * uniforms.activity;
    }

    // Soft vignette
    let vignette = 1.0 - pow(length(uv - 0.5) * 1.2, 2.0);
    color *= max(0.6, vignette);

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

  fn layerShape(uv: vec2f, time: f32) -> f32 {
    let centered = uv - 0.5;
    // Horizontal bar shape
    let barX = smoothstep(0.5, 0.3, abs(centered.x));
    let barY = smoothstep(0.2, 0.1, abs(centered.y));
    return barX * barY;
  }

  fn shiftShape(uv: vec2f, time: f32) -> f32 {
    let centered = uv - 0.5;
    let offset = sin(time * 8.0) * 0.1;
    let shifted = centered + vec2f(offset, 0.0);
    let dist = length(shifted);
    return smoothstep(0.4, 0.1, dist);
  }

  fn glowShape(uv: vec2f, time: f32) -> f32 {
    let dist = length(uv - 0.5);
    let pulse = sin(time * 3.0) * 0.1 + 0.9;
    return smoothstep(0.5, 0.0, dist) * pulse;
  }

  fn shimmerShape(uv: vec2f, time: f32) -> f32 {
    let dist = length(uv - 0.5);
    let sparkle = sin(time * 12.0 + dist * 15.0) * 0.3 + 0.7;
    return smoothstep(0.5, 0.0, dist) * sparkle;
  }

  fn stackShape(uv: vec2f, time: f32) -> f32 {
    let centered = uv - 0.5;
    // Stack of lines effect
    let lines = sin(centered.y * 20.0 + time * 4.0) * 0.5 + 0.5;
    let dist = length(centered);
    return smoothstep(0.5, 0.2, dist) * lines;
  }

  fn pulseShape(uv: vec2f, time: f32) -> f32 {
    let dist = length(uv - 0.5);
    // Expanding ring
    let ring = abs(dist - fract(time * 2.0) * 0.5);
    return smoothstep(0.1, 0.0, ring) * (1.0 - dist * 2.0);
  }

  @fragment
  fn fragmentMain(in: VertexOutput) -> @location(0) vec4f {
    let uv = in.uv;
    let t = uniforms.time;
    var alpha: f32;
    var color = in.color.rgb;

    let pType = i32(in.particleType);

    switch(pType) {
      case 0: { // layer
        alpha = layerShape(uv, t);
        color = mix(color, vec3f(0.8, 0.9, 1.0), 0.3);
      }
      case 1: { // shift
        alpha = shiftShape(uv, t);
        color = mix(color, vec3f(0.7, 0.8, 1.0), 0.4);
      }
      case 2: { // glow
        alpha = glowShape(uv, t);
        color = mix(color, vec3f(1.0, 1.0, 0.9), 0.3);
      }
      case 3: { // shimmer
        alpha = shimmerShape(uv, t);
        color = mix(color, vec3f(1.0, 1.0, 1.0), 0.5);
      }
      case 4: { // stack
        alpha = stackShape(uv, t);
        color = mix(color, vec3f(0.9, 0.95, 1.0), 0.3);
      }
      case 5: { // pulse
        alpha = pulseShape(uv, t);
        color = mix(color, vec3f(0.8, 0.9, 1.0), 0.4);
      }
      default: {
        alpha = 1.0 - length(uv - 0.5) * 2.0;
      }
    }

    alpha *= in.color.a * in.life;
    return vec4f(color, alpha);
  }
`;
