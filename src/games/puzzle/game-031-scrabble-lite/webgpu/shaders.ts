/**
 * WebGPU Shaders - Scrabble Lite
 * Vintage Letterpress Theme
 * Game #031
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

  // Noise functions for wood grain
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

  // Wood grain pattern
  fn woodGrain(uv: vec2f) -> f32 {
    let grain = sin(uv.x * 50.0 + fbm(uv * 8.0) * 5.0) * 0.5 + 0.5;
    let knots = fbm(uv * 3.0);
    return mix(grain, knots, 0.3);
  }

  @fragment
  fn fragmentMain(in: VertexOutput) -> @location(0) vec4f {
    let uv = in.uv;
    let time = uniforms.time;

    // Rich mahogany base color
    let baseColor = vec3f(0.25, 0.12, 0.08);
    let lightColor = vec3f(0.45, 0.25, 0.15);

    // Wood grain texture
    let grain = woodGrain(uv * vec2f(2.0, 4.0));
    var color = mix(baseColor, lightColor, grain * 0.6);

    // Subtle vignette (desk lamp effect)
    let center = vec2f(0.5, 0.3);
    let dist = distance(uv, center);
    let vignette = 1.0 - smoothstep(0.3, 0.9, dist);

    // Warm desk lamp glow
    let lampGlow = vec3f(0.95, 0.85, 0.6);
    color = mix(color, color + lampGlow * 0.15, vignette * 0.5);

    // Subtle dust particles in light
    let dustNoise = fbm(uv * 20.0 + time * 0.1);
    let dustGlow = smoothstep(0.6, 0.8, dustNoise) * vignette * 0.1;
    color += vec3f(dustGlow * 0.8, dustGlow * 0.7, dustGlow * 0.5);

    // Leather edge trim effect
    let edgeDist = min(min(uv.x, 1.0 - uv.x), min(uv.y, 1.0 - uv.y));
    if (edgeDist < 0.02) {
      let leatherColor = vec3f(0.15, 0.08, 0.05);
      color = mix(leatherColor, color, smoothstep(0.0, 0.02, edgeDist));
    }

    // Brass corner accents
    let cornerDist = min(
      min(distance(uv, vec2f(0.02, 0.02)), distance(uv, vec2f(0.98, 0.02))),
      min(distance(uv, vec2f(0.02, 0.98)), distance(uv, vec2f(0.98, 0.98)))
    );
    if (cornerDist < 0.03) {
      let brass = vec3f(0.85, 0.65, 0.25);
      let brassShine = brass + vec3f(0.15) * (sin(time * 2.0) * 0.3 + 0.7);
      color = mix(brassShine, color, smoothstep(0.02, 0.03, cornerDist));
    }

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
  }

  @vertex
  fn vertexMain(@builtin(vertex_index) vIdx: u32, @builtin(instance_index) iIdx: u32) -> VertexOutput {
    var quad = array<vec2f, 6>(
      vec2f(-1, -1), vec2f(1, -1), vec2f(-1, 1),
      vec2f(-1, 1), vec2f(1, -1), vec2f(1, 1)
    );

    let p = particles[iIdx];
    let size = p.size;
    let pos = quad[vIdx] * size + vec2f(p.x * 2.0 - 1.0, 1.0 - p.y * 2.0);

    var out: VertexOutput;
    out.position = vec4f(pos.x / uniforms.aspect, pos.y, 0, 1);
    out.uv = quad[vIdx];
    out.color = vec4f(p.r, p.g, p.b, p.a);
    out.pType = p.pType;
    return out;
  }

  @fragment
  fn fragmentMain(in: VertexOutput) -> @location(0) vec4f {
    let dist = length(in.uv);
    let pType = i32(in.pType);
    var alpha = in.color.a;
    var color = in.color.rgb;

    if (pType == 0) {
      // Place - ink splatter
      let inkShape = 1.0 - smoothstep(0.3, 0.8, dist);
      let inkSpatter = step(0.5, fract(sin(dot(in.uv * 10.0, vec2f(12.9898, 78.233))) * 43758.5453));
      alpha *= inkShape * mix(1.0, inkSpatter, 0.3);
    } else if (pType == 1) {
      // Drag - paper dust
      alpha *= 1.0 - smoothstep(0.0, 1.0, dist);
      alpha *= 0.6;
    } else if (pType == 2) {
      // Score - golden stamp effect
      let stamp = 1.0 - smoothstep(0.5, 0.7, dist);
      let shine = pow(1.0 - dist, 3.0);
      color += vec3f(shine * 0.3);
      alpha *= stamp;
    } else {
      // Ambient dust motes
      alpha *= 1.0 - smoothstep(0.0, 1.0, dist);
      alpha *= 0.4;
    }

    if (alpha < 0.01) {
      discard;
    }

    return vec4f(color, alpha);
  }
`;

export const tileGlowShader = /* wgsl */`
  struct Uniforms {
    time: f32,
    intensity: f32,
    tileX: f32,
    tileY: f32,
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
    let tilePos = vec2f(uniforms.tileX, uniforms.tileY);

    let dist = distance(uv, tilePos);

    // Vintage brass glow
    let glow = exp(-dist * 15.0) * intensity;
    let pulse = sin(time * 3.0) * 0.2 + 0.8;

    // Warm amber color
    let glowColor = vec3f(0.9, 0.7, 0.3) * glow * pulse;

    return vec4f(glowColor, glow * 0.6);
  }
`;

export const scoreShader = /* wgsl */`
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

    // Letterpress stamp burst
    let center = vec2f(0.5, 0.5);
    let dist = distance(uv, center);

    // Expanding ring
    let ringRadius = intensity * 0.8;
    let ring = 1.0 - smoothstep(ringRadius - 0.05, ringRadius, dist);
    let innerClear = smoothstep(ringRadius - 0.15, ringRadius - 0.05, dist);
    let stampRing = ring * innerClear;

    // Ink color - deep black/navy
    let inkColor = vec3f(0.1, 0.08, 0.15);

    // Gold foil accents
    let goldAccent = vec3f(0.85, 0.65, 0.2);
    let shimmer = sin(dist * 30.0 - time * 5.0) * 0.5 + 0.5;

    let finalColor = mix(inkColor, goldAccent, shimmer * 0.4);

    return vec4f(finalColor, stampRing * intensity * 0.5);
  }
`;
