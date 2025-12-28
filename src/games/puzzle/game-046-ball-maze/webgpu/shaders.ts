/**
 * WebGPU Shaders - Ball Maze
 * Classic Wooden Labyrinth / Vintage Tilting Maze Theme
 * Game #046
 */

export const backgroundShader = /* wgsl */ `
  struct Uniforms {
    time: f32,
    aspect: f32,
    tiltX: f32,
    tiltY: f32,
  }

  @group(0) @binding(0) var<uniform> uniforms: Uniforms;

  struct VertexOutput {
    @builtin(position) position: vec4f,
    @location(0) uv: vec2f,
  }

  @vertex
  fn vertexMain(@builtin(vertex_index) vertexIndex: u32) -> VertexOutput {
    var positions = array<vec2f, 6>(
      vec2f(-1.0, -1.0), vec2f(1.0, -1.0), vec2f(-1.0, 1.0),
      vec2f(-1.0, 1.0), vec2f(1.0, -1.0), vec2f(1.0, 1.0)
    );

    var output: VertexOutput;
    output.position = vec4f(positions[vertexIndex], 0.0, 1.0);
    output.uv = positions[vertexIndex] * 0.5 + 0.5;
    return output;
  }

  fn hash(p: vec2f) -> f32 {
    var p3 = fract(vec3f(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
  }

  fn noise(p: vec2f) -> f32 {
    let i = floor(p);
    let f = fract(p);
    let u = f * f * (3.0 - 2.0 * f);

    return mix(
      mix(hash(i + vec2f(0.0, 0.0)), hash(i + vec2f(1.0, 0.0)), u.x),
      mix(hash(i + vec2f(0.0, 1.0)), hash(i + vec2f(1.0, 1.0)), u.x),
      u.y
    );
  }

  // Wood grain pattern
  fn woodGrain(uv: vec2f, scale: f32) -> f32 {
    let p = uv * scale;

    // Create wood ring pattern
    let rings = sin(p.x * 0.5 + noise(p * 0.2) * 3.0) * 0.5 + 0.5;

    // Add fine grain detail
    let grain = noise(p * vec2f(1.0, 8.0)) * 0.15;

    // Combine
    return rings * 0.8 + grain;
  }

  // Wood knot
  fn woodKnot(uv: vec2f, center: vec2f, size: f32) -> f32 {
    let dist = length(uv - center);
    if (dist > size) { return 0.0; }

    let t = 1.0 - dist / size;
    let rings = sin(dist * 30.0) * 0.5 + 0.5;
    return t * t * rings * 0.3;
  }

  // Vintage vignette
  fn vignette(uv: vec2f) -> f32 {
    let center = vec2f(0.5, 0.5);
    let dist = length(uv - center);
    return 1.0 - smoothstep(0.3, 0.8, dist) * 0.4;
  }

  // Brass corner decoration
  fn brassCorner(uv: vec2f, corner: vec2f, size: f32) -> f32 {
    let d = length(uv - corner);
    let arc = smoothstep(size, size - 0.02, d) * smoothstep(size - 0.05, size - 0.03, d);
    return arc;
  }

  @fragment
  fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
    var uv = input.uv;
    uv.x *= uniforms.aspect;
    let time = uniforms.time;

    // Apply subtle tilt perspective
    let tiltOffset = vec2f(uniforms.tiltX, uniforms.tiltY) * 0.02;
    uv += tiltOffset * (uv - 0.5);

    // Wood base colors
    let woodLight = vec3f(0.76, 0.60, 0.42);
    let woodDark = vec3f(0.55, 0.38, 0.22);
    let woodAccent = vec3f(0.65, 0.45, 0.28);

    // Wood grain pattern
    let grain = woodGrain(input.uv, 15.0);
    var color = mix(woodDark, woodLight, grain);

    // Add wood knots at fixed positions
    let knot1 = woodKnot(input.uv, vec2f(0.15, 0.25), 0.08);
    let knot2 = woodKnot(input.uv, vec2f(0.85, 0.75), 0.06);
    let knot3 = woodKnot(input.uv, vec2f(0.7, 0.2), 0.05);
    color = mix(color, woodDark * 0.7, knot1 + knot2 + knot3);

    // Frame border
    let border = 0.03;
    let frameOuter = step(border, input.uv.x) * step(input.uv.x, 1.0 - border) *
                     step(border, input.uv.y) * step(input.uv.y, 1.0 - border);
    let frameColor = vec3f(0.45, 0.32, 0.18);
    color = mix(frameColor, color, frameOuter);

    // Inner dark play area
    let playBorder = 0.06;
    let playArea = step(playBorder, input.uv.x) * step(input.uv.x, 1.0 - playBorder) *
                   step(playBorder, input.uv.y) * step(input.uv.y, 1.0 - playBorder);
    let playColor = vec3f(0.15, 0.12, 0.08);
    color = mix(color, playColor, playArea * 0.3);

    // Brass corner decorations
    let cornerSize = 0.08;
    let brass = vec3f(0.8, 0.65, 0.3);
    let c1 = brassCorner(input.uv, vec2f(0.0, 0.0), cornerSize);
    let c2 = brassCorner(input.uv, vec2f(1.0, 0.0), cornerSize);
    let c3 = brassCorner(input.uv, vec2f(0.0, 1.0), cornerSize);
    let c4 = brassCorner(input.uv, vec2f(1.0, 1.0), cornerSize);
    let corners = c1 + c2 + c3 + c4;

    // Brass shine
    let brassShine = brass + vec3f(0.2) * sin(time * 2.0 + input.uv.x * 10.0) * 0.3;
    color = mix(color, brassShine, corners);

    // Subtle light reflection based on tilt
    let lightDir = normalize(vec2f(-uniforms.tiltX, -uniforms.tiltY) + vec2f(0.3, -0.5));
    let surfacePos = input.uv - 0.5;
    let reflection = dot(normalize(surfacePos), lightDir) * 0.5 + 0.5;
    color += vec3f(0.1, 0.08, 0.05) * reflection * 0.3;

    // Vignette
    color *= vignette(input.uv);

    // Warm ambient light
    color = mix(color, color * vec3f(1.1, 1.0, 0.9), 0.2);

    return vec4f(color, 1.0);
  }
`;

export const particleShader = /* wgsl */ `
  struct Uniforms {
    time: f32,
    aspect: f32,
    pad1: f32,
    pad2: f32,
  }

  struct Particle {
    x: f32,
    y: f32,
    vx: f32,
    vy: f32,
    life: f32,
    maxLife: f32,
    size: f32,
    particleType: f32,
    r: f32,
    g: f32,
    b: f32,
    a: f32,
  }

  @group(0) @binding(0) var<uniform> uniforms: Uniforms;
  @group(0) @binding(1) var<storage, read> particles: array<Particle>;

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
    @builtin(instance_index) instanceIndex: u32
  ) -> VertexOutput {
    let quad = array<vec2f, 6>(
      vec2f(-1.0, -1.0), vec2f(1.0, -1.0), vec2f(-1.0, 1.0),
      vec2f(-1.0, 1.0), vec2f(1.0, -1.0), vec2f(1.0, 1.0)
    );

    let p = particles[instanceIndex];
    let lifeRatio = p.life / p.maxLife;
    let size = p.size * lifeRatio;

    var pos = quad[vertexIndex] * size;
    pos.x /= uniforms.aspect;
    pos += vec2f(p.x * 2.0 - 1.0, 1.0 - p.y * 2.0);

    var output: VertexOutput;
    output.position = vec4f(pos, 0.0, 1.0);
    output.uv = quad[vertexIndex];
    output.color = vec4f(p.r, p.g, p.b, p.a * lifeRatio);
    output.particleType = p.particleType;
    output.life = lifeRatio;
    return output;
  }

  @fragment
  fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
    let dist = length(input.uv);
    let time = uniforms.time;
    var alpha = 0.0;
    var color = input.color.rgb;

    // Type 0: Wood dust
    if (input.particleType < 0.5) {
      alpha = smoothstep(1.0, 0.0, dist) * input.life * 0.5;
      // Dusty texture
      alpha *= 0.6 + sin(input.uv.x * 15.0 + input.uv.y * 15.0) * 0.4;
    }
    // Type 1: Metallic sparkle
    else if (input.particleType < 1.5) {
      let sparkle = smoothstep(0.3, 0.0, dist);
      let core = smoothstep(0.1, 0.0, dist);
      alpha = sparkle * input.life;
      color = mix(color, vec3f(1.0, 1.0, 0.95), core);
      // Twinkling
      alpha *= 0.5 + sin(time * 20.0 + dist * 10.0) * 0.5;
    }
    // Type 2: Victory - golden confetti
    else if (input.particleType < 2.5) {
      // Square confetti
      let square = step(abs(input.uv.x), 0.6) * step(abs(input.uv.y), 0.4);
      alpha = square * input.life;
      // Tumbling shine
      let shine = sin(time * 6.0 + input.uv.x * 4.0) * 0.5 + 0.5;
      color = mix(color, color * 1.3, shine * 0.3);
    }
    // Type 3: Ambient dust
    else if (input.particleType < 3.5) {
      alpha = smoothstep(1.0, 0.0, dist) * input.life * 0.25;
    }
    // Type 4: Ball trail
    else {
      let ring = smoothstep(0.8, 0.5, dist) * smoothstep(0.3, 0.5, dist);
      alpha = ring * input.life * 0.6;
      // Metallic sheen
      color = mix(color, vec3f(0.9, 0.85, 0.8), ring * 0.3);
    }

    return vec4f(color, alpha * input.color.a);
  }
`;

export const victoryShader = /* wgsl */ `
  struct Uniforms {
    time: f32,
    intensity: f32,
    pad1: f32,
    pad2: f32,
  }

  @group(0) @binding(0) var<uniform> uniforms: Uniforms;

  struct VertexOutput {
    @builtin(position) position: vec4f,
    @location(0) uv: vec2f,
  }

  @vertex
  fn vertexMain(@builtin(vertex_index) vertexIndex: u32) -> VertexOutput {
    var positions = array<vec2f, 6>(
      vec2f(-1.0, -1.0), vec2f(1.0, -1.0), vec2f(-1.0, 1.0),
      vec2f(-1.0, 1.0), vec2f(1.0, -1.0), vec2f(1.0, 1.0)
    );

    var output: VertexOutput;
    output.position = vec4f(positions[vertexIndex], 0.0, 1.0);
    output.uv = positions[vertexIndex] * 0.5 + 0.5;
    return output;
  }

  @fragment
  fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
    let time = uniforms.time;
    let intensity = uniforms.intensity;
    let uv = input.uv;

    // Golden radial burst
    let center = vec2f(0.5, 0.5);
    let toCenter = uv - center;
    let dist = length(toCenter);
    let angle = atan2(toCenter.y, toCenter.x);

    // Sunburst rays
    let rays = sin(angle * 12.0 + time * 3.0) * 0.5 + 0.5;
    let rayFade = smoothstep(0.6, 0.0, dist);

    // Pulsing glow
    let pulse = sin(time * 4.0) * 0.5 + 0.5;
    let glow = smoothstep(0.4, 0.0, dist) * pulse;

    // Warm golden colors
    let gold = vec3f(1.0, 0.85, 0.4);
    let bronze = vec3f(0.9, 0.6, 0.3);
    let color = mix(bronze, gold, rays);

    let alpha = (rays * rayFade * 0.3 + glow * 0.4) * intensity;

    return vec4f(color, alpha);
  }
`;
