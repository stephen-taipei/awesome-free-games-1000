/**
 * WebGPU Shaders - Dino Bones
 * Prehistoric / Excavation Site Theme
 * Game #081
 */

export const BACKGROUND_SHADER = /* wgsl */ `
  struct Uniforms {
    time: f32,
    width: f32,
    height: f32,
    digging: f32,
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

  fn sandTexture(uv: vec2f) -> f32 {
    let n1 = noise(uv * 30.0) * 0.08;
    let n2 = noise(uv * 60.0) * 0.04;
    let n3 = noise(uv * 120.0) * 0.02;
    return 0.88 + n1 + n2 + n3;
  }

  fn excavationGrid(uv: vec2f, time: f32) -> f32 {
    let gridSize = 50.0;
    let gridUV = uv * vec2f(uniforms.width, uniforms.height) / gridSize;
    let cell = fract(gridUV);

    let lines = smoothstep(0.02, 0.0, abs(cell.x - 0.5)) +
                smoothstep(0.02, 0.0, abs(cell.y - 0.5));

    return lines * 0.08;
  }

  fn fossilHint(uv: vec2f, time: f32) -> f32 {
    let centered = uv - vec2f(0.6, 0.4);
    let dist = length(centered);
    let pulse = sin(time * 1.5) * 0.5 + 0.5;
    return smoothstep(0.3, 0.1, dist) * 0.05 * pulse;
  }

  fn dirtLayers(uv: vec2f) -> vec3f {
    let layer1 = smoothstep(0.0, 0.3, uv.y);
    let layer2 = smoothstep(0.3, 0.6, uv.y);
    let layer3 = smoothstep(0.6, 1.0, uv.y);

    let color1 = vec3f(0.45, 0.32, 0.18); // Dark dirt
    let color2 = vec3f(0.65, 0.50, 0.30); // Medium dirt
    let color3 = vec3f(0.85, 0.75, 0.55); // Light sand

    return mix(mix(color1, color2, layer1), color3, layer2);
  }

  fn rocks(uv: vec2f) -> f32 {
    let n = noise(uv * 8.0);
    let rock = smoothstep(0.65, 0.7, n) * 0.1;
    return rock;
  }

  @fragment
  fn fragmentMain(in: VertexOutput) -> @location(0) vec4f {
    let uv = in.uv;
    let t = uniforms.time;

    // Base dirt layers
    var color = dirtLayers(uv);

    // Sand texture
    let sand = sandTexture(uv);
    color *= sand;

    // Excavation grid
    let grid = excavationGrid(uv, t);
    color -= vec3f(grid * 0.3, grid * 0.25, grid * 0.15);

    // Fossil hint glow
    let hint = fossilHint(uv, t);
    color += vec3f(hint, hint * 0.8, hint * 0.4);

    // Random rocks/pebbles
    let rock = rocks(uv);
    color -= vec3f(rock);

    // Vignette
    let vignette = 1.0 - pow(length(uv - 0.5) * 0.9, 2.0);
    color *= max(0.6, vignette);

    // Digging effect - screen shake simulation
    if (uniforms.digging > 0.5) {
      let shake = sin(t * 30.0) * 0.01;
      color.r += shake;
      color.g += shake * 0.8;
    }

    return vec4f(color, 1.0);
  }
`;

export const PARTICLE_SHADER = /* wgsl */ `
  struct Uniforms {
    time: f32,
    width: f32,
    height: f32,
    digging: f32,
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

  fn dustShape(uv: vec2f, time: f32) -> f32 {
    let dist = length(uv - 0.5);
    let noise = sin(uv.x * 8.0 + time) * sin(uv.y * 8.0 - time) * 0.1;
    return smoothstep(0.5 + noise, 0.1, dist) * 0.6;
  }

  fn boneShape(uv: vec2f) -> f32 {
    let centered = uv - 0.5;
    let dist = length(centered);

    // Bone fragment shape
    let fragment = smoothstep(0.4, 0.3, dist);
    let crack = abs(sin(atan2(centered.y, centered.x) * 3.0)) * 0.1;
    return fragment * (1.0 - crack);
  }

  fn sparkShape(uv: vec2f, time: f32) -> f32 {
    let centered = uv - 0.5;
    let dist = length(centered);
    let angle = atan2(centered.y, centered.x);

    let rays = pow(abs(cos(angle * 4.0 + time * 4.0)), 6.0);
    return rays * smoothstep(0.5, 0.0, dist);
  }

  fn dirtShape(uv: vec2f) -> f32 {
    let dist = length(uv - 0.5);
    return smoothstep(0.4, 0.2, dist) * 0.7;
  }

  fn glowShape(uv: vec2f, time: f32) -> f32 {
    let dist = length(uv - 0.5);
    let pulse = sin(time * 2.0) * 0.15 + 0.85;
    return smoothstep(0.5, 0.0, dist) * pulse;
  }

  fn burstShape(uv: vec2f, time: f32) -> f32 {
    let centered = uv - 0.5;
    let dist = length(centered);
    let angle = atan2(centered.y, centered.x);

    let rays = sin(angle * 6.0 + time * 3.0) * 0.15 + 0.35;
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
      case 0: { // dust
        alpha = dustShape(uv, t);
        color = mix(color, vec3f(0.7, 0.55, 0.35), 0.3);
      }
      case 1: { // bone
        alpha = boneShape(uv);
        color = mix(color, vec3f(0.95, 0.90, 0.80), 0.5);
      }
      case 2: { // spark
        alpha = sparkShape(uv, t);
        color = mix(color, vec3f(1.0, 0.85, 0.5), 0.5);
      }
      case 3: { // dirt
        alpha = dirtShape(uv);
        color = mix(color, vec3f(0.55, 0.41, 0.20), 0.4);
      }
      case 4: { // glow
        alpha = glowShape(uv, t);
      }
      case 5: { // burst
        alpha = burstShape(uv, t);
        color = mix(color, vec3f(0.9, 0.75, 0.5), 0.3);
      }
      default: {
        alpha = 1.0 - length(uv - 0.5) * 2.0;
      }
    }

    alpha *= in.color.a * in.life;
    return vec4f(color, alpha);
  }
`;
