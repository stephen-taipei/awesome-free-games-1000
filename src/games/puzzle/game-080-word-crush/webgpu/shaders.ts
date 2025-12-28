/**
 * WebGPU Shaders - Word Crush
 * Literary / Typography Theme
 * Game #080
 */

export const BACKGROUND_SHADER = /* wgsl */ `
  struct Uniforms {
    time: f32,
    width: f32,
    height: f32,
    selectionActive: f32,
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

  fn paperTexture(uv: vec2f) -> f32 {
    let n1 = noise(uv * 50.0) * 0.05;
    let n2 = noise(uv * 100.0) * 0.03;
    let n3 = noise(uv * 200.0) * 0.02;
    return 0.92 + n1 + n2 + n3;
  }

  fn inkStain(uv: vec2f, time: f32) -> f32 {
    let n = noise(uv * 5.0 + vec2f(time * 0.1, 0));
    let blob = smoothstep(0.6, 0.4, n);
    return blob * 0.03;
  }

  fn bookSpine(uv: vec2f) -> f32 {
    let spine = smoothstep(0.02, 0.0, abs(uv.x - 0.05));
    return spine * 0.1;
  }

  fn pageLines(uv: vec2f) -> f32 {
    let lineSpacing = 0.04;
    let lineY = fract(uv.y / lineSpacing);
    let lines = smoothstep(0.02, 0.0, abs(lineY - 0.5)) * 0.03;
    return lines * step(0.1, uv.x) * step(uv.x, 0.9);
  }

  fn letterShadow(uv: vec2f, time: f32) -> f32 {
    let gridSize = 8.0;
    let cell = floor(uv * gridSize);
    let cellUV = fract(uv * gridSize);

    let rand = hash(cell);
    let visible = step(0.7, rand);
    let size = rand * 0.3 + 0.2;

    let dist = length(cellUV - 0.5);
    let letter = smoothstep(size, size - 0.1, dist) * visible * 0.03;

    let float = sin(time * 2.0 + rand * 6.28) * 0.01;
    return letter * (1.0 + float);
  }

  @fragment
  fn fragmentMain(in: VertexOutput) -> @location(0) vec4f {
    let uv = in.uv;
    let t = uniforms.time;

    // Warm paper base color
    var color = vec3f(0.98, 0.95, 0.88);

    // Paper texture
    let paper = paperTexture(uv);
    color *= paper;

    // Subtle ink stains
    let stain = inkStain(uv, t);
    color -= vec3f(stain * 0.3, stain * 0.2, stain * 0.1);

    // Book spine effect
    let spine = bookSpine(uv);
    color -= vec3f(spine * 0.5, spine * 0.3, spine * 0.2);

    // Faint page lines
    let lines = pageLines(uv);
    color -= vec3f(lines * 0.3, lines * 0.35, lines * 0.4);

    // Floating letter shadows
    let letters = letterShadow(uv, t);
    color -= vec3f(letters);

    // Warm gradient overlay
    let warmth = uv.y * 0.03;
    color.r += warmth;
    color.g += warmth * 0.5;

    // Vignette
    let vignette = 1.0 - pow(length(uv - 0.5) * 1.0, 2.0);
    color *= max(0.7, vignette);

    // Selection active glow
    if (uniforms.selectionActive > 0.5) {
      let pulse = sin(t * 4.0) * 0.02 + 0.02;
      color += vec3f(pulse, pulse * 0.6, 0.0);
    }

    return vec4f(color, 1.0);
  }
`;

export const PARTICLE_SHADER = /* wgsl */ `
  struct Uniforms {
    time: f32,
    width: f32,
    height: f32,
    selectionActive: f32,
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

  fn letterShape(uv: vec2f, time: f32) -> f32 {
    let centered = uv - 0.5;
    let dist = length(centered);

    // Letter-like shape with serifs
    let body = smoothstep(0.35, 0.3, dist);
    let serif1 = smoothstep(0.1, 0.0, abs(centered.x)) * step(abs(centered.y), 0.4);
    let serif2 = smoothstep(0.1, 0.0, abs(centered.y - 0.3)) * step(abs(centered.x), 0.2);

    return body * 0.8 + (serif1 + serif2) * 0.2;
  }

  fn inkShape(uv: vec2f, time: f32) -> f32 {
    let centered = uv - 0.5;
    let dist = length(centered);
    let angle = atan2(centered.y, centered.x);

    // Irregular ink blob shape
    let wobble = sin(angle * 5.0 + time * 3.0) * 0.1;
    return smoothstep(0.4 + wobble, 0.2, dist);
  }

  fn sparkShape(uv: vec2f, time: f32) -> f32 {
    let centered = uv - 0.5;
    let dist = length(centered);
    let angle = atan2(centered.y, centered.x);

    let rays = pow(abs(cos(angle * 4.0 + time * 5.0)), 8.0);
    return rays * smoothstep(0.5, 0.0, dist);
  }

  fn trailShape(uv: vec2f) -> f32 {
    let centered = uv - 0.5;
    let dist = length(centered);
    return smoothstep(0.4, 0.0, dist) * 0.8;
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

    let rays = sin(angle * 8.0 + time * 2.0) * 0.15 + 0.35;
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
      case 0: { // letter
        alpha = letterShape(uv, t);
        color = mix(color, vec3f(0.2, 0.15, 0.3), 0.3);
      }
      case 1: { // ink
        alpha = inkShape(uv, t);
        color = mix(color, vec3f(0.1, 0.05, 0.15), 0.5);
      }
      case 2: { // spark
        alpha = sparkShape(uv, t);
        color = mix(color, vec3f(1.0, 0.9, 0.5), 0.5);
      }
      case 3: { // trail
        alpha = trailShape(uv);
      }
      case 4: { // glow
        alpha = glowShape(uv, t);
      }
      case 5: { // burst
        alpha = burstShape(uv, t);
        color = mix(color, vec3f(1.0, 0.7, 0.3), 0.4);
      }
      default: {
        alpha = 1.0 - length(uv - 0.5) * 2.0;
      }
    }

    alpha *= in.color.a * in.life;
    return vec4f(color, alpha);
  }
`;
