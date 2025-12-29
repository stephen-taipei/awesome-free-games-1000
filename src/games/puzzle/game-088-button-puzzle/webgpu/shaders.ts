/**
 * WebGPU Shaders - Button Puzzle
 * Arcade / Neon / Retro Theme
 * Game #088
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

  fn neonGrid(uv: vec2f, time: f32) -> f32 {
    let gridSize = 30.0;
    let lineWidth = 0.02;

    let gridX = abs(fract(uv.x * gridSize) - 0.5);
    let gridY = abs(fract(uv.y * gridSize) - 0.5);

    let lineX = smoothstep(lineWidth, 0.0, gridX);
    let lineY = smoothstep(lineWidth, 0.0, gridY);

    let pulse = sin(time * 2.0) * 0.2 + 0.8;
    return (lineX + lineY) * 0.15 * pulse;
  }

  fn scanlines(uv: vec2f, time: f32) -> f32 {
    let scanY = sin(uv.y * 200.0 + time * 5.0) * 0.5 + 0.5;
    return 0.95 + scanY * 0.05;
  }

  fn retroGradient(uv: vec2f) -> vec3f {
    let top = vec3f(0.1, 0.0, 0.2);     // Dark purple
    let mid = vec3f(0.15, 0.05, 0.25);   // Purple
    let bottom = vec3f(0.05, 0.0, 0.1);  // Deep purple

    let y = uv.y;
    if (y > 0.5) {
      return mix(mid, top, (y - 0.5) * 2.0);
    } else {
      return mix(bottom, mid, y * 2.0);
    }
  }

  fn arcadeGlow(uv: vec2f, time: f32) -> vec3f {
    // Multiple pulsing glow points
    var glow = vec3f(0.0);

    for (var i = 0; i < 4; i++) {
      let fi = f32(i);
      let angle = fi * 1.57 + time * 0.5;
      let center = vec2f(0.5 + cos(angle) * 0.3, 0.5 + sin(angle) * 0.3);
      let dist = length(uv - center);

      let pulse = sin(time * 3.0 + fi * 1.5) * 0.3 + 0.7;
      let intensity = 0.02 / (dist + 0.1) * pulse;

      // Cycle through neon colors
      let hue = fract(fi * 0.25 + time * 0.1);
      let color = vec3f(
        sin(hue * 6.28) * 0.5 + 0.5,
        sin(hue * 6.28 + 2.09) * 0.5 + 0.5,
        sin(hue * 6.28 + 4.19) * 0.5 + 0.5
      );

      glow += color * intensity * 0.3;
    }

    return glow;
  }

  @fragment
  fn fragmentMain(in: VertexOutput) -> @location(0) vec4f {
    let uv = in.uv;
    let t = uniforms.time;

    // Base retro gradient
    var color = retroGradient(uv);

    // Neon grid
    let grid = neonGrid(uv, t);
    color += vec3f(0.4, 0.1, 0.8) * grid;

    // Arcade glow orbs
    color += arcadeGlow(uv, t);

    // Activity pulse
    if (uniforms.activity > 0.1) {
      let pulse = sin(t * 8.0) * 0.1 + 0.1;
      color += vec3f(0.8, 0.3, 1.0) * pulse * uniforms.activity;
    }

    // Scanlines
    color *= scanlines(uv, t);

    // Vignette
    let vignette = 1.0 - pow(length(uv - 0.5) * 1.2, 2.5);
    color *= max(0.3, vignette);

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

  fn pulseShape(uv: vec2f, time: f32) -> f32 {
    let dist = length(uv - 0.5);
    let pulse = sin(time * 10.0) * 0.15 + 0.85;
    return smoothstep(0.5, 0.0, dist) * pulse;
  }

  fn glowShape(uv: vec2f, time: f32) -> f32 {
    let dist = length(uv - 0.5);
    let pulse = sin(time * 4.0) * 0.1 + 0.9;
    return smoothstep(0.5, 0.0, dist) * pulse;
  }

  fn flashShape(uv: vec2f, time: f32) -> f32 {
    let dist = length(uv - 0.5);
    let flash = pow(sin(time * 15.0) * 0.5 + 0.5, 3.0);
    return smoothstep(0.4, 0.0, dist) * flash;
  }

  fn ringShape(uv: vec2f, time: f32) -> f32 {
    let dist = length(uv - 0.5);
    let ringRadius = 0.3;
    let ringWidth = 0.08;
    let ring = 1.0 - abs(dist - ringRadius) / ringWidth;
    return max(0.0, ring);
  }

  fn sparkShape(uv: vec2f, time: f32) -> f32 {
    let centered = uv - 0.5;
    let dist = length(centered);
    let angle = atan2(centered.y, centered.x);

    // 6-point star
    let star = pow(abs(sin(angle * 3.0)), 4.0) * 0.4 + 0.2;
    let flicker = sin(time * 20.0 + angle * 3.0) * 0.2 + 0.8;

    return smoothstep(star * flicker, 0.0, dist);
  }

  fn beamShape(uv: vec2f, time: f32) -> f32 {
    let centered = uv - 0.5;

    // Vertical beam
    let beamWidth = 0.1;
    let beam = smoothstep(beamWidth, 0.0, abs(centered.x));
    let fade = 1.0 - abs(centered.y) * 2.0;

    return beam * max(0.0, fade);
  }

  @fragment
  fn fragmentMain(in: VertexOutput) -> @location(0) vec4f {
    let uv = in.uv;
    let t = uniforms.time;
    var alpha: f32;
    var color = in.color.rgb;

    let pType = i32(in.particleType);

    switch(pType) {
      case 0: { // pulse
        alpha = pulseShape(uv, t);
        color = mix(color, vec3f(1.0, 1.0, 1.0), 0.3);
      }
      case 1: { // glow
        alpha = glowShape(uv, t);
        color = mix(color, vec3f(1.0, 0.9, 1.0), 0.2);
      }
      case 2: { // flash
        alpha = flashShape(uv, t);
        color = mix(color, vec3f(1.0, 1.0, 1.0), 0.6);
      }
      case 3: { // ring
        alpha = ringShape(uv, t);
        color = mix(color, vec3f(1.0, 0.8, 1.0), 0.3);
      }
      case 4: { // spark
        alpha = sparkShape(uv, t);
        color = mix(color, vec3f(1.0, 0.95, 0.8), 0.5);
      }
      case 5: { // beam
        alpha = beamShape(uv, t);
        color = mix(color, vec3f(0.9, 0.8, 1.0), 0.4);
      }
      default: {
        alpha = 1.0 - length(uv - 0.5) * 2.0;
      }
    }

    alpha *= in.color.a * in.life;
    return vec4f(color, alpha);
  }
`;
