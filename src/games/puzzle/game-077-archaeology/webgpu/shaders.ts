/**
 * WebGPU Shaders - Archaeology
 * Ancient Ruins / Archaeological Dig Site Theme
 * Game #077
 */

export const BACKGROUND_SHADER = /* wgsl */ `
  struct Uniforms {
    time: f32,
    width: f32,
    height: f32,
    digProgress: f32,
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

  fn fbm(p: vec2f) -> f32 {
    var value = 0.0;
    var amplitude = 0.5;
    var pos = p;
    for (var i = 0; i < 5; i++) {
      value += amplitude * noise(pos);
      pos *= 2.0;
      amplitude *= 0.5;
    }
    return value;
  }

  fn stoneTexture(uv: vec2f, time: f32) -> vec3f {
    let stone = fbm(uv * 10.0);
    let base = vec3f(0.55, 0.45, 0.35);
    let variation = vec3f(0.1, 0.08, 0.06) * (stone - 0.5);
    return base + variation;
  }

  fn dirtLayer(uv: vec2f, time: f32) -> vec3f {
    let dirt = fbm(uv * 20.0 + vec2f(time * 0.01, 0.0));
    let base = vec3f(0.45, 0.35, 0.25);
    let darker = vec3f(0.35, 0.28, 0.18);
    return mix(base, darker, dirt);
  }

  fn ancientPatterns(uv: vec2f, time: f32) -> f32 {
    // Hieroglyphic-like patterns
    let p = uv * 30.0;
    let cell = floor(p);
    let cellHash = hash(cell);

    if (cellHash > 0.85) {
      let localUV = fract(p) - 0.5;
      let dist = length(localUV);
      let ring = smoothstep(0.35, 0.3, dist) - smoothstep(0.25, 0.2, dist);
      let glow = sin(time * 2.0 + cellHash * 10.0) * 0.5 + 0.5;
      return ring * glow * 0.3;
    }
    return 0.0;
  }

  fn dustMotes(uv: vec2f, time: f32) -> f32 {
    var dust = 0.0;
    for (var i = 0; i < 5; i++) {
      let offset = vec2f(f32(i) * 0.17, f32(i) * 0.23);
      let p = uv * 50.0 + offset + vec2f(time * 0.5, time * 0.3 * f32(i + 1));
      let h = hash(floor(p));
      if (h > 0.97) {
        let fade = sin(time * 3.0 + h * 10.0) * 0.5 + 0.5;
        dust += fade * 0.1;
      }
    }
    return dust;
  }

  @fragment
  fn fragmentMain(in: VertexOutput) -> @location(0) vec4f {
    let uv = in.uv;
    let t = uniforms.time * 0.5;

    // Base stone layer
    var color = stoneTexture(uv, t);

    // Dirt overlay
    let dirtMix = 0.6 - uniforms.digProgress * 0.3;
    let dirt = dirtLayer(uv, t);
    color = mix(color, dirt, dirtMix);

    // Ancient patterns (revealed as progress increases)
    let patterns = ancientPatterns(uv, t);
    color += vec3f(0.9, 0.75, 0.4) * patterns * uniforms.digProgress;

    // Floating dust particles
    let dust = dustMotes(uv, t);
    color += vec3f(0.9, 0.85, 0.7) * dust;

    // Subtle excavation glow at edges
    let edgeGlow = smoothstep(0.0, 0.1, uv.x) * smoothstep(1.0, 0.9, uv.x) *
                   smoothstep(0.0, 0.1, uv.y) * smoothstep(1.0, 0.9, uv.y);
    color *= 0.8 + edgeGlow * 0.2;

    // Vignette
    let vignette = 1.0 - length(uv - 0.5) * 0.5;
    color *= vignette;

    return vec4f(color, 1.0);
  }
`;

export const PARTICLE_SHADER = /* wgsl */ `
  struct Uniforms {
    time: f32,
    width: f32,
    height: f32,
    digProgress: f32,
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

  fn dustShape(uv: vec2f) -> f32 {
    let dist = length(uv - 0.5);
    return smoothstep(0.5, 0.2, dist) * 0.6;
  }

  fn sandGrain(uv: vec2f) -> f32 {
    let dist = length(uv - 0.5);
    let grain = smoothstep(0.4, 0.3, dist);
    let highlight = smoothstep(0.25, 0.15, length(uv - vec2f(0.35, 0.35)));
    return grain + highlight * 0.3;
  }

  fn sparkShape(uv: vec2f, time: f32) -> f32 {
    let centered = uv - 0.5;
    let dist = length(centered);
    let angle = atan2(centered.y, centered.x);
    let star = pow(abs(cos(angle * 4.0 + time * 3.0)), 8.0);
    return star * smoothstep(0.5, 0.0, dist);
  }

  fn debrisChunk(uv: vec2f) -> f32 {
    let centered = uv - 0.5;
    // Irregular rocky shape
    let angle = atan2(centered.y, centered.x);
    let radius = 0.3 + sin(angle * 3.0) * 0.1 + sin(angle * 7.0) * 0.05;
    let dist = length(centered);
    return smoothstep(radius + 0.05, radius, dist);
  }

  fn glowOrb(uv: vec2f, time: f32) -> f32 {
    let dist = length(uv - 0.5);
    let pulse = sin(time * 3.0) * 0.1 + 0.9;
    return smoothstep(0.5, 0.0, dist) * pulse;
  }

  fn ancientRune(uv: vec2f, time: f32) -> f32 {
    let centered = uv - 0.5;
    let dist = length(centered);

    // Ring with ancient symbols
    let ring = smoothstep(0.4, 0.35, dist) - smoothstep(0.3, 0.25, dist);
    let angle = atan2(centered.y, centered.x) + time;
    let symbols = step(0.7, sin(angle * 6.0));

    return ring + symbols * smoothstep(0.35, 0.25, dist) * 0.5;
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
        alpha = dustShape(uv);
      }
      case 1: { // sand
        alpha = sandGrain(uv);
      }
      case 2: { // spark
        alpha = sparkShape(uv, t);
        color = mix(color, vec3f(1.0, 0.9, 0.6), 0.5);
      }
      case 3: { // debris
        alpha = debrisChunk(uv);
      }
      case 4: { // glow
        alpha = glowOrb(uv, t);
        color = mix(color, vec3f(1.0, 0.85, 0.4), 0.3);
      }
      case 5: { // ancient
        alpha = ancientRune(uv, t);
        color = vec3f(0.9, 0.75, 0.4);
      }
      default: {
        alpha = 1.0 - length(uv - 0.5) * 2.0;
      }
    }

    alpha *= in.color.a * in.life;
    return vec4f(color, alpha);
  }
`;
