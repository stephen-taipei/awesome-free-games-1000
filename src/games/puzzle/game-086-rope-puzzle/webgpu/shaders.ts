/**
 * WebGPU Shaders - Rope Puzzle
 * Neon / String / Glow Theme
 * Game #086
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

  fn neonGrid(uv: vec2f, time: f32) -> f32 {
    let gridSize = 50.0;
    let gridX = abs(fract(uv.x * uniforms.width / gridSize) - 0.5);
    let gridY = abs(fract(uv.y * uniforms.height / gridSize) - 0.5);

    let lineWidth = 0.02;
    let lineX = smoothstep(lineWidth, 0.0, gridX);
    let lineY = smoothstep(lineWidth, 0.0, gridY);

    let pulse = sin(time * 2.0) * 0.3 + 0.7;
    return (lineX + lineY) * 0.1 * pulse;
  }

  fn glowOrbs(uv: vec2f, time: f32) -> vec3f {
    var glow = vec3f(0.0);

    for (var i = 0; i < 5; i++) {
      let fi = f32(i);
      let angle = fi * 1.2566 + time * 0.3;
      let radius = 0.25 + fi * 0.05;
      let orbPos = vec2f(
        0.5 + cos(angle) * radius,
        0.5 + sin(angle) * radius
      );

      let dist = length(uv - orbPos);
      let intensity = 0.015 / (dist * dist + 0.01);

      // Different colors for each orb
      let hue = fract(fi * 0.2 + time * 0.1);
      let color = vec3f(
        0.4 + 0.5 * cos(hue * 6.28 + 0.0),
        0.4 + 0.5 * cos(hue * 6.28 + 2.09),
        0.4 + 0.5 * cos(hue * 6.28 + 4.19)
      );

      glow += color * intensity;
    }

    return glow;
  }

  fn darkGradient(uv: vec2f) -> vec3f {
    let center = vec3f(0.18, 0.18, 0.27); // Dark purple-blue
    let edge = vec3f(0.10, 0.10, 0.18);   // Darker edge

    let dist = length(uv - 0.5);
    return mix(center, edge, dist * 1.5);
  }

  @fragment
  fn fragmentMain(in: VertexOutput) -> @location(0) vec4f {
    let uv = in.uv;
    let t = uniforms.time;

    // Base dark gradient
    var color = darkGradient(uv);

    // Subtle noise texture
    let noiseVal = noise(uv * 5.0 + t * 0.1) * 0.03;
    color += vec3f(noiseVal);

    // Neon grid
    let grid = neonGrid(uv, t);
    color += vec3f(0.4, 0.3, 0.6) * grid;

    // Floating glow orbs
    let orbs = glowOrbs(uv, t);
    color += orbs * 0.3;

    // Activity pulse
    if (uniforms.activity > 0.3) {
      let pulse = sin(t * 8.0) * 0.02;
      color += vec3f(0.5, 0.3, 0.8) * pulse * uniforms.activity;
    }

    // Vignette
    let vignette = 1.0 - pow(length(uv - 0.5) * 1.2, 2.0);
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

  fn glowShape(uv: vec2f, time: f32) -> f32 {
    let dist = length(uv - 0.5);
    let pulse = sin(time * 5.0) * 0.1 + 0.9;
    return smoothstep(0.5, 0.0, dist) * pulse;
  }

  fn sparkShape(uv: vec2f, time: f32) -> f32 {
    let centered = uv - 0.5;
    let dist = length(centered);
    let angle = atan2(centered.y, centered.x);

    // 4-pointed star spark
    let star = pow(abs(sin(angle * 2.0)), 3.0) * 0.4 + 0.3;
    let flicker = sin(time * 15.0 + angle * 3.0) * 0.2 + 0.8;

    return smoothstep(star * flicker, 0.0, dist);
  }

  fn trailShape(uv: vec2f, time: f32) -> f32 {
    let centered = uv - 0.5;

    // Elongated trail
    let stretch = vec2f(centered.x * 0.5, centered.y * 1.5);
    let dist = length(stretch);

    return smoothstep(0.5, 0.0, dist);
  }

  fn knotShape(uv: vec2f, time: f32) -> f32 {
    let centered = uv - 0.5;
    let dist = length(centered);
    let angle = atan2(centered.y, centered.x);

    // Twisted knot pattern
    let twist = sin(dist * 20.0 - time * 8.0 + angle * 2.0);
    let ring = smoothstep(0.5, 0.3, dist) * smoothstep(0.1, 0.2, dist);

    return ring * (twist * 0.3 + 0.7);
  }

  fn burstShape(uv: vec2f, time: f32) -> f32 {
    let centered = uv - 0.5;
    let dist = length(centered);
    let angle = atan2(centered.y, centered.x);

    // Radial burst with rays
    let rays = pow(abs(sin(angle * 8.0 + time * 4.0)), 2.0) * 0.4 + 0.3;
    return smoothstep(rays, 0.0, dist);
  }

  fn waveShape(uv: vec2f, time: f32) -> f32 {
    let centered = uv - 0.5;
    let dist = length(centered);

    // Expanding wave rings
    let wave = sin(dist * 25.0 - time * 6.0) * 0.5 + 0.5;
    let fade = smoothstep(0.5, 0.0, dist);

    return wave * fade;
  }

  @fragment
  fn fragmentMain(in: VertexOutput) -> @location(0) vec4f {
    let uv = in.uv;
    let t = uniforms.time;
    var alpha: f32;
    var color = in.color.rgb;

    let pType = i32(in.particleType);

    switch(pType) {
      case 0: { // glow
        alpha = glowShape(uv, t);
        // Add bloom effect
        color = mix(color, vec3f(1.0), 0.3);
      }
      case 1: { // spark
        alpha = sparkShape(uv, t);
        color = mix(color, vec3f(1.0, 1.0, 0.9), 0.5);
      }
      case 2: { // trail
        alpha = trailShape(uv, t);
        color = mix(color, vec3f(0.9, 0.8, 1.0), 0.2);
      }
      case 3: { // knot
        alpha = knotShape(uv, t);
      }
      case 4: { // burst
        alpha = burstShape(uv, t);
        color = mix(color, vec3f(1.0, 0.9, 0.8), 0.4);
      }
      case 5: { // wave
        alpha = waveShape(uv, t);
        color = mix(color, vec3f(0.8, 0.9, 1.0), 0.3);
      }
      default: {
        alpha = 1.0 - length(uv - 0.5) * 2.0;
      }
    }

    alpha *= in.color.a * in.life;
    return vec4f(color, alpha);
  }
`;
