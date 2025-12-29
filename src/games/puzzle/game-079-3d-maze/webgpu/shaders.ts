/**
 * WebGPU Shaders - 3D Maze
 * Sci-Fi Corridor / Cyberpunk Dungeon Theme
 * Game #079
 */

export const BACKGROUND_SHADER = /* wgsl */ `
  struct Uniforms {
    time: f32,
    width: f32,
    height: f32,
    playerAngle: f32,
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

  fn gridPattern(uv: vec2f, time: f32) -> f32 {
    let gridSize = 30.0;
    let gridUV = uv * vec2f(uniforms.width, uniforms.height) / gridSize;
    let cell = fract(gridUV);

    let lines = smoothstep(0.02, 0.0, abs(cell.x - 0.5)) +
                smoothstep(0.02, 0.0, abs(cell.y - 0.5));

    let pulse = sin(floor(gridUV.x) * 0.5 + floor(gridUV.y) * 0.5 + time * 2.0) * 0.5 + 0.5;

    return lines * 0.15 * (0.5 + pulse * 0.5);
  }

  fn corridorDepth(uv: vec2f, time: f32) -> f32 {
    let centered = uv - 0.5;
    let dist = length(centered);
    let depth = 1.0 - dist * 1.5;

    let rings = sin(dist * 30.0 - time * 2.0) * 0.5 + 0.5;
    return depth * (0.8 + rings * 0.2);
  }

  fn scanlines(uv: vec2f, time: f32) -> f32 {
    let scan = sin(uv.y * uniforms.height * 1.5 + time * 0.5) * 0.5 + 0.5;
    return 0.95 + scan * 0.05;
  }

  fn fogEffect(uv: vec2f, time: f32) -> f32 {
    let n1 = noise(uv * 5.0 + vec2f(time * 0.1, 0));
    let n2 = noise(uv * 10.0 - vec2f(0, time * 0.15));
    return (n1 + n2) * 0.5 * 0.15;
  }

  @fragment
  fn fragmentMain(in: VertexOutput) -> @location(0) vec4f {
    let uv = in.uv;
    let t = uniforms.time;

    // Dark sci-fi base
    var color = vec3f(0.02, 0.03, 0.08);

    // Corridor depth effect
    let depth = corridorDepth(uv, t);
    color += vec3f(0.1, 0.15, 0.3) * depth;

    // Grid pattern
    let grid = gridPattern(uv, t);
    color += vec3f(0.0, 0.8, 1.0) * grid;

    // Fog overlay
    let fog = fogEffect(uv, t);
    color += vec3f(0.3, 0.4, 0.6) * fog;

    // Scanline effect
    let scan = scanlines(uv, t);
    color *= scan;

    // Edge vignette
    let vignette = 1.0 - pow(length(uv - 0.5) * 1.2, 2.0);
    color *= max(0.3, vignette);

    // Chromatic aberration hint at edges
    let distFromCenter = length(uv - 0.5);
    let aberration = smoothstep(0.3, 0.5, distFromCenter) * 0.1;
    color.r += aberration * 0.3;
    color.b += aberration * 0.2;

    return vec4f(color, 1.0);
  }
`;

export const PARTICLE_SHADER = /* wgsl */ `
  struct Uniforms {
    time: f32,
    width: f32,
    height: f32,
    playerAngle: f32,
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

  fn fogShape(uv: vec2f, time: f32) -> f32 {
    let dist = length(uv - 0.5);
    let noise = sin(uv.x * 10.0 + time) * sin(uv.y * 10.0 - time) * 0.2;
    return smoothstep(0.5, 0.0, dist + noise) * 0.5;
  }

  fn portalShape(uv: vec2f, time: f32) -> f32 {
    let centered = uv - 0.5;
    let dist = length(centered);
    let angle = atan2(centered.y, centered.x);

    let ring1 = smoothstep(0.4, 0.35, dist) - smoothstep(0.35, 0.25, dist);
    let ring2 = smoothstep(0.25, 0.2, dist) - smoothstep(0.2, 0.1, dist);

    let rotation = angle + time * 2.0;
    let pattern = sin(rotation * 6.0) * 0.5 + 0.5;

    return (ring1 + ring2 * 0.7) * (0.5 + pattern * 0.5);
  }

  fn sparkShape(uv: vec2f, time: f32) -> f32 {
    let centered = uv - 0.5;
    let dist = length(centered);
    let angle = atan2(centered.y, centered.x);
    let rays = pow(abs(cos(angle * 3.0 + time * 4.0)), 6.0);
    return rays * smoothstep(0.5, 0.0, dist);
  }

  fn dustShape(uv: vec2f) -> f32 {
    let dist = length(uv - 0.5);
    return smoothstep(0.4, 0.1, dist) * 0.4;
  }

  fn glowShape(uv: vec2f, time: f32) -> f32 {
    let dist = length(uv - 0.5);
    let pulse = sin(time * 3.0) * 0.2 + 0.8;
    return smoothstep(0.5, 0.0, dist) * pulse;
  }

  fn trailShape(uv: vec2f) -> f32 {
    let centered = uv - 0.5;
    let dist = abs(centered.y) * 2.0 + abs(centered.x) * 0.5;
    return smoothstep(0.5, 0.1, dist);
  }

  @fragment
  fn fragmentMain(in: VertexOutput) -> @location(0) vec4f {
    let uv = in.uv;
    let t = uniforms.time;
    var alpha: f32;
    var color = in.color.rgb;

    let pType = i32(in.particleType);

    switch(pType) {
      case 0: { // fog
        alpha = fogShape(uv, t);
        color = mix(color, vec3f(0.3, 0.4, 0.6), 0.3);
      }
      case 1: { // portal
        alpha = portalShape(uv, t);
        color = mix(color, vec3f(0.0, 1.0, 0.8), 0.5);
      }
      case 2: { // spark
        alpha = sparkShape(uv, t);
        color = mix(color, vec3f(1.0, 0.9, 0.5), 0.5);
      }
      case 3: { // dust
        alpha = dustShape(uv);
      }
      case 4: { // glow
        alpha = glowShape(uv, t);
      }
      case 5: { // trail
        alpha = trailShape(uv);
        color = mix(color, vec3f(0.0, 0.8, 1.0), 0.3);
      }
      default: {
        alpha = 1.0 - length(uv - 0.5) * 2.0;
      }
    }

    alpha *= in.color.a * in.life;
    return vec4f(color, alpha);
  }
`;
