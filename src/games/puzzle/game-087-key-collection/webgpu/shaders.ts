/**
 * WebGPU Shaders - Key Collection
 * Dungeon / Golden / Mystery Theme
 * Game #087
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

  fn stoneTexture(uv: vec2f) -> f32 {
    var stone = noise(uv * 20.0) * 0.3;
    stone += noise(uv * 50.0) * 0.15;
    stone += noise(uv * 100.0) * 0.05;
    return stone;
  }

  fn torchLight(uv: vec2f, pos: vec2f, time: f32) -> f32 {
    let dist = length(uv - pos);
    let flicker = sin(time * 8.0 + pos.x * 10.0) * 0.1 + 0.9;
    let intensity = 0.05 / (dist * dist + 0.02) * flicker;
    return intensity;
  }

  fn dungeonGradient(uv: vec2f) -> vec3f {
    let top = vec3f(0.08, 0.06, 0.10);    // Deep purple-black
    let mid = vec3f(0.12, 0.10, 0.14);    // Dark stone
    let bottom = vec3f(0.06, 0.05, 0.08); // Shadow

    let y = uv.y;
    if (y > 0.5) {
      return mix(mid, top, (y - 0.5) * 2.0);
    } else {
      return mix(bottom, mid, y * 2.0);
    }
  }

  fn mysteryGlow(uv: vec2f, time: f32) -> vec3f {
    let center = vec2f(0.5, 0.5);
    let dist = length(uv - center);

    let pulse = sin(time * 2.0) * 0.3 + 0.7;
    let glow = 0.03 / (dist + 0.1) * pulse;

    // Golden mysterious glow
    return vec3f(0.95, 0.77, 0.06) * glow * 0.3;
  }

  @fragment
  fn fragmentMain(in: VertexOutput) -> @location(0) vec4f {
    let uv = in.uv;
    let t = uniforms.time;

    // Base dungeon gradient
    var color = dungeonGradient(uv);

    // Stone texture
    let stone = stoneTexture(uv);
    color += vec3f(stone) * 0.15;

    // Torch lights at corners
    let torch1 = torchLight(uv, vec2f(0.1, 0.1), t);
    let torch2 = torchLight(uv, vec2f(0.9, 0.1), t);
    let torch3 = torchLight(uv, vec2f(0.1, 0.9), t);
    let torch4 = torchLight(uv, vec2f(0.9, 0.9), t);

    let torchColor = vec3f(1.0, 0.6, 0.2);
    color += torchColor * (torch1 + torch2 + torch3 + torch4);

    // Mystery glow
    color += mysteryGlow(uv, t);

    // Activity golden pulse
    if (uniforms.activity > 0.3) {
      let pulse = sin(t * 6.0) * 0.05;
      color += vec3f(0.95, 0.77, 0.06) * pulse * uniforms.activity;
    }

    // Vignette
    let vignette = 1.0 - pow(length(uv - 0.5) * 1.1, 2.0);
    color *= max(0.4, vignette);

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
    let pulse = sin(time * 4.0) * 0.1 + 0.9;
    return smoothstep(0.5, 0.0, dist) * pulse;
  }

  fn sparkShape(uv: vec2f, time: f32) -> f32 {
    let centered = uv - 0.5;
    let dist = length(centered);
    let angle = atan2(centered.y, centered.x);

    // 6-pointed star spark
    let star = pow(abs(sin(angle * 3.0)), 2.0) * 0.4 + 0.3;
    let flicker = sin(time * 20.0 + angle * 5.0) * 0.2 + 0.8;

    return smoothstep(star * flicker, 0.0, dist);
  }

  fn trailShape(uv: vec2f, time: f32) -> f32 {
    let centered = uv - 0.5;

    // Comet trail
    let stretch = vec2f(centered.x * 0.6, centered.y * 1.4);
    let dist = length(stretch);

    return smoothstep(0.5, 0.0, dist);
  }

  fn shimmerShape(uv: vec2f, time: f32) -> f32 {
    let centered = uv - 0.5;
    let dist = length(centered);

    // Diamond shimmer
    let diamond = abs(centered.x) + abs(centered.y);
    let shimmer = sin(time * 10.0 + diamond * 10.0) * 0.2 + 0.8;

    return smoothstep(0.5, 0.2, diamond) * shimmer;
  }

  fn burstShape(uv: vec2f, time: f32) -> f32 {
    let centered = uv - 0.5;
    let dist = length(centered);
    let angle = atan2(centered.y, centered.x);

    // Radial burst
    let rays = pow(abs(sin(angle * 6.0 + time * 3.0)), 3.0) * 0.35 + 0.35;
    return smoothstep(rays, 0.0, dist);
  }

  fn dustShape(uv: vec2f, time: f32) -> f32 {
    let dist = length(uv - 0.5);
    let wobble = sin(time * 3.0 + dist * 10.0) * 0.1 + 0.9;
    return smoothstep(0.4, 0.0, dist) * wobble * 0.7;
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
        color = mix(color, vec3f(1.0, 0.9, 0.6), 0.3);
      }
      case 1: { // spark
        alpha = sparkShape(uv, t);
        color = mix(color, vec3f(1.0, 1.0, 0.8), 0.5);
      }
      case 2: { // trail
        alpha = trailShape(uv, t);
        color = mix(color, vec3f(1.0, 0.85, 0.5), 0.3);
      }
      case 3: { // shimmer
        alpha = shimmerShape(uv, t);
        color = mix(color, vec3f(1.0, 0.95, 0.7), 0.4);
      }
      case 4: { // burst
        alpha = burstShape(uv, t);
        color = mix(color, vec3f(1.0, 0.8, 0.4), 0.4);
      }
      case 5: { // dust
        alpha = dustShape(uv, t);
        color = mix(color, vec3f(0.8, 0.7, 0.5), 0.2);
      }
      default: {
        alpha = 1.0 - length(uv - 0.5) * 2.0;
      }
    }

    alpha *= in.color.a * in.life;
    return vec4f(color, alpha);
  }
`;
