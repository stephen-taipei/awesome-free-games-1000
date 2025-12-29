/**
 * WebGPU Shaders - Screw Puzzle
 * Workshop / Industrial / Metallic Theme
 * Game #085
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

  fn metalTexture(uv: vec2f, time: f32) -> f32 {
    // Brushed metal effect
    let brushed = noise(vec2f(uv.x * 200.0, uv.y * 5.0)) * 0.15;

    // Subtle scratches
    let scratch1 = noise(uv * 50.0 + time * 0.01) * 0.05;
    let scratch2 = noise(uv * 100.0 - time * 0.005) * 0.03;

    return brushed + scratch1 + scratch2;
  }

  fn gridPattern(uv: vec2f) -> f32 {
    let gridSize = 30.0;
    let gridX = abs(fract(uv.x * uniforms.width / gridSize) - 0.5);
    let gridY = abs(fract(uv.y * uniforms.height / gridSize) - 0.5);

    let lineWidth = 0.03;
    let lineX = smoothstep(lineWidth, 0.0, gridX);
    let lineY = smoothstep(lineWidth, 0.0, gridY);

    return (lineX + lineY) * 0.08;
  }

  fn rivets(uv: vec2f) -> f32 {
    var result = 0.0;

    // Add rivets at corners
    let positions = array<vec2f, 4>(
      vec2f(0.05, 0.05),
      vec2f(0.95, 0.05),
      vec2f(0.05, 0.95),
      vec2f(0.95, 0.95)
    );

    for (var i = 0; i < 4; i++) {
      let dist = length(uv - positions[i]);
      result += smoothstep(0.02, 0.0, dist) * 0.3;
    }

    return result;
  }

  fn industrialGradient(uv: vec2f) -> vec3f {
    let top = vec3f(0.70, 0.73, 0.78);    // Light steel
    let mid = vec3f(0.50, 0.52, 0.55);    // Medium metal
    let bottom = vec3f(0.30, 0.32, 0.35); // Dark metal

    let y = uv.y;
    if (y > 0.5) {
      return mix(mid, top, (y - 0.5) * 2.0);
    } else {
      return mix(bottom, mid, y * 2.0);
    }
  }

  @fragment
  fn fragmentMain(in: VertexOutput) -> @location(0) vec4f {
    let uv = in.uv;
    let t = uniforms.time;

    // Base industrial gradient
    var color = industrialGradient(uv);

    // Metal texture
    let metal = metalTexture(uv, t);
    color += vec3f(metal) * 0.5;

    // Grid pattern
    let grid = gridPattern(uv);
    color += vec3f(grid) * vec3f(0.6, 0.65, 0.7);

    // Rivets
    let rivet = rivets(uv);
    color += vec3f(rivet);

    // Activity glow
    if (uniforms.activity > 0.5) {
      let pulse = sin(t * 5.0) * 0.03;
      color += vec3f(0.8, 0.6, 0.2) * pulse;
    }

    // Ambient light from top
    let ambient = smoothstep(0.0, 1.0, uv.y) * 0.15;
    color += vec3f(ambient);

    // Vignette
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

  fn sparkShape(uv: vec2f, time: f32) -> f32 {
    let centered = uv - 0.5;
    let dist = length(centered);

    // Elongated spark
    let angle = atan2(centered.y, centered.x);
    let elongation = 1.0 + abs(cos(angle * 2.0)) * 0.5;
    let spark = smoothstep(0.5 / elongation, 0.0, dist);

    // Flickering
    let flicker = sin(time * 20.0 + angle * 3.0) * 0.2 + 0.8;

    return spark * flicker;
  }

  fn metalChipShape(uv: vec2f, time: f32) -> f32 {
    let centered = uv - 0.5;

    // Irregular metal chip shape
    let angle = atan2(centered.y, centered.x);
    let noise = sin(angle * 5.0 + time) * 0.15;
    let dist = length(centered);

    return smoothstep(0.4 + noise, 0.2, dist);
  }

  fn twistShape(uv: vec2f, time: f32) -> f32 {
    let centered = uv - 0.5;
    let dist = length(centered);
    let angle = atan2(centered.y, centered.x);

    // Spiral pattern
    let spiral = sin(dist * 15.0 - angle * 2.0 - time * 5.0);
    let ring = smoothstep(0.5, 0.3, dist) * smoothstep(0.1, 0.2, dist);

    return ring * (spiral * 0.3 + 0.7);
  }

  fn glowShape(uv: vec2f, time: f32) -> f32 {
    let dist = length(uv - 0.5);
    let pulse = sin(time * 3.0) * 0.1 + 0.9;
    return smoothstep(0.5, 0.0, dist) * pulse;
  }

  fn burstShape(uv: vec2f, time: f32) -> f32 {
    let centered = uv - 0.5;
    let dist = length(centered);
    let angle = atan2(centered.y, centered.x);

    // Explosive burst with rays
    let rays = pow(abs(sin(angle * 6.0 + time * 3.0)), 3.0) * 0.3 + 0.3;
    return smoothstep(rays, 0.0, dist);
  }

  fn shineShape(uv: vec2f, time: f32) -> f32 {
    let centered = uv - 0.5;
    let dist = length(centered);
    let angle = atan2(centered.y, centered.x);

    // 4-pointed star shine
    let star = pow(abs(sin(angle * 2.0)), 4.0);
    let size = 0.35 / (star * 0.6 + 0.4);

    return smoothstep(size, 0.0, dist);
  }

  @fragment
  fn fragmentMain(in: VertexOutput) -> @location(0) vec4f {
    let uv = in.uv;
    let t = uniforms.time;
    var alpha: f32;
    var color = in.color.rgb;

    let pType = i32(in.particleType);

    switch(pType) {
      case 0: { // spark
        alpha = sparkShape(uv, t);
        color = mix(color, vec3f(1.0, 1.0, 0.8), 0.5);
      }
      case 1: { // metal
        alpha = metalChipShape(uv, t);
        color = mix(color, vec3f(0.8, 0.8, 0.85), 0.3);
      }
      case 2: { // twist
        alpha = twistShape(uv, t);
        color = mix(color, vec3f(0.9, 0.85, 0.7), 0.2);
      }
      case 3: { // glow
        alpha = glowShape(uv, t);
      }
      case 4: { // burst
        alpha = burstShape(uv, t);
        color = mix(color, vec3f(1.0, 0.9, 0.5), 0.4);
      }
      case 5: { // shine
        alpha = shineShape(uv, t);
        color = mix(color, vec3f(1.0, 1.0, 1.0), 0.6);
      }
      default: {
        alpha = 1.0 - length(uv - 0.5) * 2.0;
      }
    }

    alpha *= in.color.a * in.life;
    return vec4f(color, alpha);
  }
`;
