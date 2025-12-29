/**
 * WebGPU Shaders - Origami Puzzle
 * Japanese Washi Theme
 * Game #033
 */

export const backgroundShader = /* wgsl */`
  struct Uniforms {
    time: f32,
    aspect: f32,
    pad1: f32,
    pad2: f32,
  }

  @group(0) @binding(0) var<uniform> uniforms: Uniforms;

  struct VertexOutput {
    @builtin(position) position: vec4f,
    @location(0) uv: vec2f,
  }

  @vertex
  fn vertexMain(@builtin(vertex_index) idx: u32) -> VertexOutput {
    var pos = array<vec2f, 6>(
      vec2f(-1, -1), vec2f(1, -1), vec2f(-1, 1),
      vec2f(-1, 1), vec2f(1, -1), vec2f(1, 1)
    );

    var out: VertexOutput;
    out.position = vec4f(pos[idx], 0, 1);
    out.uv = pos[idx] * 0.5 + 0.5;
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

  // Washi paper texture
  fn washiTexture(uv: vec2f) -> f32 {
    let coarse = fbm(uv * 30.0);
    let fine = noise(uv * 100.0);
    let fibers = sin(uv.x * 200.0 + noise(uv * 50.0) * 5.0) * 0.5 + 0.5;

    return coarse * 0.3 + fine * 0.2 + fibers * 0.1;
  }

  @fragment
  fn fragmentMain(in: VertexOutput) -> @location(0) vec4f {
    let uv = in.uv;
    let time = uniforms.time;

    // Warm cream base (washi paper color)
    let baseColor = vec3f(0.96, 0.94, 0.88);
    let textureColor = vec3f(0.92, 0.88, 0.80);

    // Apply washi texture
    let tex = washiTexture(uv);
    var color = mix(baseColor, textureColor, tex);

    // Subtle ink wash gradient (top to bottom fade)
    let inkWash = smoothstep(0.0, 0.8, uv.y) * 0.05;
    color -= vec3f(inkWash * 0.5, inkWash * 0.4, inkWash * 0.3);

    // Decorative corner motif (subtle)
    let cornerDist = min(
      min(distance(uv, vec2f(0.05, 0.05)), distance(uv, vec2f(0.95, 0.05))),
      min(distance(uv, vec2f(0.05, 0.95)), distance(uv, vec2f(0.95, 0.95)))
    );
    if (cornerDist < 0.08) {
      let pattern = sin(cornerDist * 50.0) * 0.5 + 0.5;
      let indigo = vec3f(0.2, 0.25, 0.4);
      color = mix(color, indigo, pattern * 0.08 * (1.0 - cornerDist / 0.08));
    }

    // Gentle edge vignette
    let dist = distance(uv, vec2f(0.5));
    let vignette = 1.0 - smoothstep(0.4, 0.75, dist) * 0.15;
    color *= vignette;

    return vec4f(color, 0.4);
  }
`;

export const particleShader = /* wgsl */`
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
    pType: f32,
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
    @location(2) pType: f32,
    @location(3) rotation: f32,
  }

  @vertex
  fn vertexMain(@builtin(vertex_index) vIdx: u32, @builtin(instance_index) iIdx: u32) -> VertexOutput {
    var quad = array<vec2f, 6>(
      vec2f(-1, -1), vec2f(1, -1), vec2f(-1, 1),
      vec2f(-1, 1), vec2f(1, -1), vec2f(1, 1)
    );

    let p = particles[iIdx];
    let size = p.size;

    // Rotation based on life
    let angle = p.life * 3.0 + f32(iIdx) * 0.5;
    let c = cos(angle);
    let s = sin(angle);
    let rotated = vec2f(
      quad[vIdx].x * c - quad[vIdx].y * s,
      quad[vIdx].x * s + quad[vIdx].y * c
    );

    let pos = rotated * size + vec2f(p.x * 2.0 - 1.0, 1.0 - p.y * 2.0);

    var out: VertexOutput;
    out.position = vec4f(pos.x / uniforms.aspect, pos.y, 0, 1);
    out.uv = quad[vIdx];
    out.color = vec4f(p.r, p.g, p.b, p.a);
    out.pType = p.pType;
    out.rotation = angle;
    return out;
  }

  @fragment
  fn fragmentMain(in: VertexOutput) -> @location(0) vec4f {
    let dist = length(in.uv);
    let pType = i32(in.pType);
    var alpha = in.color.a;
    var color = in.color.rgb;

    if (pType == 0) {
      // Fold - paper crease sparkle
      let crease = 1.0 - smoothstep(0.0, 0.5, dist);
      alpha *= crease;
    } else if (pType == 1) {
      // Sakura petal shape
      let petalShape = 1.0 - smoothstep(0.3, 0.8, dist);
      // Heart-like indent
      let indent = smoothstep(0.0, 0.3, abs(in.uv.x)) * smoothstep(0.0, 0.2, in.uv.y);
      alpha *= petalShape * (1.0 - indent * 0.3);
    } else if (pType == 2) {
      // Victory - golden origami crane burst
      let star = 1.0 - smoothstep(0.0, 0.6, dist);
      let rays = sin(atan2(in.uv.y, in.uv.x) * 5.0) * 0.5 + 0.5;
      color += vec3f(rays * 0.2);
      alpha *= star;
    } else {
      // Ambient - floating paper fiber
      alpha *= 1.0 - smoothstep(0.0, 1.0, dist);
      alpha *= 0.3;
    }

    if (alpha < 0.01) {
      discard;
    }

    return vec4f(color, alpha);
  }
`;

export const foldShader = /* wgsl */`
  struct Uniforms {
    time: f32,
    foldProgress: f32,
    foldX: f32,
    foldY: f32,
  }

  @group(0) @binding(0) var<uniform> uniforms: Uniforms;

  struct VertexOutput {
    @builtin(position) position: vec4f,
    @location(0) uv: vec2f,
  }

  @vertex
  fn vertexMain(@builtin(vertex_index) idx: u32) -> VertexOutput {
    var pos = array<vec2f, 6>(
      vec2f(-1, -1), vec2f(1, -1), vec2f(-1, 1),
      vec2f(-1, 1), vec2f(1, -1), vec2f(1, 1)
    );

    var out: VertexOutput;
    out.position = vec4f(pos[idx], 0, 1);
    out.uv = pos[idx] * 0.5 + 0.5;
    return out;
  }

  @fragment
  fn fragmentMain(in: VertexOutput) -> @location(0) vec4f {
    let uv = in.uv;
    let time = uniforms.time;
    let progress = uniforms.foldProgress;
    let foldPos = vec2f(uniforms.foldX, uniforms.foldY);

    // Crease line glow
    let dist = distance(uv, foldPos);
    let creaseLine = exp(-dist * 20.0) * progress;

    // Paper fold shadow
    let shadow = smoothstep(0.1, 0.0, dist) * progress * 0.3;

    // Golden highlight on fold
    let goldColor = vec3f(0.9, 0.8, 0.5);
    let glowColor = goldColor * creaseLine;

    return vec4f(glowColor, (creaseLine + shadow) * 0.5);
  }
`;

export const victoryShader = /* wgsl */`
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
  fn vertexMain(@builtin(vertex_index) idx: u32) -> VertexOutput {
    var pos = array<vec2f, 6>(
      vec2f(-1, -1), vec2f(1, -1), vec2f(-1, 1),
      vec2f(-1, 1), vec2f(1, -1), vec2f(1, 1)
    );

    var out: VertexOutput;
    out.position = vec4f(pos[idx], 0, 1);
    out.uv = pos[idx] * 0.5 + 0.5;
    return out;
  }

  @fragment
  fn fragmentMain(in: VertexOutput) -> @location(0) vec4f {
    let uv = in.uv;
    let time = uniforms.time;
    let intensity = uniforms.intensity;

    // Radial golden wave
    let center = vec2f(0.5, 0.5);
    let dist = distance(uv, center);

    // Expanding rings
    let wavePhase = dist * 8.0 - time * 3.0;
    let wave = sin(wavePhase) * 0.5 + 0.5;
    let ring = wave * exp(-dist * 3.0) * intensity;

    // Sakura pink and gold
    let pink = vec3f(1.0, 0.8, 0.85);
    let gold = vec3f(0.95, 0.85, 0.5);
    let glowColor = mix(pink, gold, wave);

    return vec4f(glowColor * ring, ring * 0.4);
  }
`;
