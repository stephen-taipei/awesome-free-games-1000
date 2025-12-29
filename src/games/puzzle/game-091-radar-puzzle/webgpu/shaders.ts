/**
 * WebGPU Shaders - Radar Puzzle
 * Radar / Sonar / Military Theme
 * Game #091
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

  fn radarGrid(uv: vec2f, time: f32) -> f32 {
    let centered = uv - 0.5;
    let dist = length(centered);
    let angle = atan2(centered.y, centered.x);

    // Concentric circles
    let circles = smoothstep(0.02, 0.0, abs(fract(dist * 4.0) - 0.5) - 0.48);

    // Radial lines
    let lines = smoothstep(0.02, 0.0, abs(fract(angle / 0.785398) - 0.5) - 0.48);

    return (circles + lines * 0.5) * 0.15;
  }

  fn radarSweep(uv: vec2f, time: f32) -> f32 {
    let centered = uv - 0.5;
    let dist = length(centered);
    let angle = atan2(centered.y, centered.x);

    // Radar sweep angle
    let sweepAngle = time * 2.0;
    var angleDiff = angle - sweepAngle;
    angleDiff = angleDiff - floor(angleDiff / 6.28318) * 6.28318;

    // Fade trail
    let trail = smoothstep(0.8, 0.0, angleDiff / 1.5);

    // Mask to circle
    let circleMask = smoothstep(0.5, 0.48, dist);

    return trail * circleMask * 0.4;
  }

  fn scanRings(uv: vec2f, time: f32) -> f32 {
    let centered = uv - 0.5;
    let dist = length(centered);

    // Expanding rings
    let ring1 = smoothstep(0.03, 0.0, abs(dist - fract(time * 0.5) * 0.6));
    let ring2 = smoothstep(0.02, 0.0, abs(dist - fract(time * 0.5 + 0.3) * 0.6));

    return (ring1 + ring2 * 0.5) * 0.2;
  }

  fn staticNoise(uv: vec2f, time: f32) -> f32 {
    let noise = hash(uv * 100.0 + time * 10.0);
    return noise * 0.03;
  }

  fn centerGlow(uv: vec2f, time: f32) -> f32 {
    let dist = length(uv - 0.5);
    let pulse = sin(time * 3.0) * 0.1 + 0.9;
    return (0.02 / (dist + 0.05)) * pulse * 0.3;
  }

  @fragment
  fn fragmentMain(in: VertexOutput) -> @location(0) vec4f {
    let uv = in.uv;
    let t = uniforms.time;

    // Base dark background
    var color = vec3f(0.02, 0.04, 0.03);

    // Radar grid
    let grid = radarGrid(uv, t);
    color += vec3f(0.1, 0.8, 0.4) * grid;

    // Radar sweep
    let sweep = radarSweep(uv, t);
    color += vec3f(0.2, 0.9, 0.4) * sweep;

    // Scan rings
    let rings = scanRings(uv, t);
    color += vec3f(0.15, 0.7, 0.35) * rings;

    // Static noise
    let noise = staticNoise(uv, t);
    color += vec3f(noise * 0.5, noise, noise * 0.6);

    // Center glow
    let glow = centerGlow(uv, t);
    color += vec3f(0.2, 0.9, 0.5) * glow;

    // Activity boost
    if (uniforms.activity > 0.1) {
      let pulse = sin(t * 6.0) * 0.1 + 0.9;
      color += vec3f(0.1, 0.4, 0.2) * pulse * uniforms.activity;
    }

    // Circular vignette (radar screen edge)
    let dist = length(uv - 0.5);
    let vignette = smoothstep(0.5, 0.3, dist);
    color *= vignette;

    // Edge glow
    let edge = smoothstep(0.48, 0.5, dist) * smoothstep(0.52, 0.5, dist);
    color += vec3f(0.1, 0.5, 0.3) * edge * 2.0;

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

  fn sweepShape(uv: vec2f, time: f32) -> f32 {
    let centered = uv - 0.5;
    let angle = atan2(centered.y, centered.x);
    let dist = length(centered);

    // Arc shape
    let arc = smoothstep(0.5, 0.3, dist);
    let fade = smoothstep(0.2, 0.0, abs(angle));

    return arc * fade;
  }

  fn blipShape(uv: vec2f, time: f32) -> f32 {
    let dist = length(uv - 0.5);
    let pulse = sin(time * 8.0) * 0.15 + 0.85;
    return smoothstep(0.5, 0.0, dist) * pulse;
  }

  fn pingShape(uv: vec2f, time: f32) -> f32 {
    let dist = length(uv - 0.5);
    // Expanding ring
    let ring = abs(dist - fract(time * 3.0) * 0.5);
    return smoothstep(0.1, 0.0, ring) * (1.0 - dist * 2.0);
  }

  fn glowShape(uv: vec2f, time: f32) -> f32 {
    let dist = length(uv - 0.5);
    let pulse = sin(time * 4.0) * 0.1 + 0.9;
    return smoothstep(0.5, 0.0, dist) * pulse;
  }

  fn scanShape(uv: vec2f, time: f32) -> f32 {
    let centered = uv - 0.5;
    let dist = length(centered);

    // Horizontal scan line
    let scanY = fract(time * 2.0) - 0.5;
    let line = smoothstep(0.05, 0.0, abs(centered.y - scanY * 0.8));

    return line * smoothstep(0.5, 0.3, dist);
  }

  fn waveShape(uv: vec2f, time: f32) -> f32 {
    let dist = length(uv - 0.5);
    // Concentric waves
    let wave = sin(dist * 20.0 - time * 6.0) * 0.5 + 0.5;
    return wave * smoothstep(0.5, 0.0, dist) * 0.7;
  }

  @fragment
  fn fragmentMain(in: VertexOutput) -> @location(0) vec4f {
    let uv = in.uv;
    let t = uniforms.time;
    var alpha: f32;
    var color = in.color.rgb;

    let pType = i32(in.particleType);

    switch(pType) {
      case 0: { // sweep
        alpha = sweepShape(uv, t);
        color = mix(color, vec3f(0.3, 1.0, 0.5), 0.3);
      }
      case 1: { // blip
        alpha = blipShape(uv, t);
        color = mix(color, vec3f(0.4, 1.0, 0.6), 0.4);
      }
      case 2: { // ping
        alpha = pingShape(uv, t);
        color = mix(color, vec3f(0.3, 0.9, 0.5), 0.3);
      }
      case 3: { // glow
        alpha = glowShape(uv, t);
        color = mix(color, vec3f(0.4, 1.0, 0.6), 0.3);
      }
      case 4: { // scan
        alpha = scanShape(uv, t);
        color = mix(color, vec3f(0.3, 0.95, 0.55), 0.4);
      }
      case 5: { // wave
        alpha = waveShape(uv, t);
        color = mix(color, vec3f(0.25, 0.85, 0.5), 0.3);
      }
      default: {
        alpha = 1.0 - length(uv - 0.5) * 2.0;
      }
    }

    alpha *= in.color.a * in.life;
    return vec4f(color, alpha);
  }
`;
