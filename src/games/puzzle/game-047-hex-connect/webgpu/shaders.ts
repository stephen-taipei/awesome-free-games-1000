/**
 * WebGPU Shaders - Hex Connect
 * Crystal Honeycomb / Prismatic Gem Theme
 * Game #047
 */

export const backgroundShader = /* wgsl */ `
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

  // Hexagonal distance
  fn hexDist(p: vec2f) -> f32 {
    let q = abs(p);
    return max(q.x * 0.866025 + q.y * 0.5, q.y);
  }

  // Hexagonal grid
  fn hexGrid(uv: vec2f, scale: f32) -> vec3f {
    let p = uv * scale;

    // Hex coordinates
    let s = vec2f(1.0, 1.732);
    let h = s / 2.0;

    let a = fract(p) - 0.5;
    let b = fract(p - h) - 0.5;

    let gv: vec2f = select(b, a, length(a) < length(b));
    let id = p - gv;

    return vec3f(gv, hexDist(gv));
  }

  // Prismatic color from angle
  fn prismaticColor(angle: f32, saturation: f32) -> vec3f {
    let r = sin(angle) * 0.5 + 0.5;
    let g = sin(angle + 2.094) * 0.5 + 0.5;
    let b = sin(angle + 4.189) * 0.5 + 0.5;
    return mix(vec3f(0.5), vec3f(r, g, b), saturation);
  }

  // Crystal facet highlight
  fn crystalFacet(uv: vec2f, time: f32) -> f32 {
    let angle = atan2(uv.y - 0.5, uv.x - 0.5);
    let facets = floor(angle / (3.14159 / 3.0) + 0.5);
    let reflection = sin(facets * 2.0 + time * 2.0) * 0.5 + 0.5;
    return reflection;
  }

  // Cosmic nebula background
  fn nebula(uv: vec2f, time: f32) -> vec3f {
    var color = vec3f(0.0);

    // Layer 1 - Deep purple
    let n1 = hash(floor(uv * 8.0) + time * 0.01);
    color += vec3f(0.15, 0.05, 0.25) * n1;

    // Layer 2 - Blue mist
    let n2 = hash(floor(uv * 4.0 + 10.0) + time * 0.02);
    color += vec3f(0.05, 0.1, 0.2) * n2;

    // Layer 3 - Pink highlights
    let n3 = hash(floor(uv * 16.0 + 20.0));
    color += vec3f(0.2, 0.05, 0.15) * n3 * 0.5;

    return color;
  }

  // Floating crystal shards
  fn crystalShard(uv: vec2f, center: vec2f, size: f32, rotation: f32) -> f32 {
    let p = uv - center;
    let s = sin(rotation);
    let c = cos(rotation);
    let rotP = vec2f(p.x * c - p.y * s, p.x * s + p.y * c);

    // Diamond shape
    let d = abs(rotP.x) + abs(rotP.y * 2.0);
    return smoothstep(size, size * 0.8, d);
  }

  @fragment
  fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
    var uv = input.uv;
    uv.x *= uniforms.aspect;
    let time = uniforms.time;

    // Deep cosmic background
    var color = vec3f(0.05, 0.02, 0.1);

    // Add nebula
    color += nebula(uv, time) * 0.8;

    // Hexagonal grid overlay
    let hex = hexGrid(uv, 8.0);
    let hexEdge = smoothstep(0.45, 0.48, hex.z);
    let hexGlow = smoothstep(0.5, 0.3, hex.z);

    // Prismatic hex colors
    let hexAngle = atan2(hex.x, hex.y) + time * 0.5;
    let hexColor = prismaticColor(hexAngle, 0.6);
    color = mix(color, hexColor * 0.3, hexGlow * 0.5);

    // Hex edge glow
    let edgeColor = vec3f(0.6, 0.3, 0.8);
    color = mix(color, edgeColor, hexEdge * 0.3);

    // Floating crystal shards
    for (var i = 0; i < 5; i++) {
      let fi = f32(i);
      let shardCenter = vec2f(
        0.5 * uniforms.aspect + sin(time * 0.3 + fi * 1.5) * 0.3 * uniforms.aspect,
        0.5 + cos(time * 0.2 + fi * 1.2) * 0.3
      );
      let rotation = time * 0.5 + fi * 0.7;
      let shard = crystalShard(uv, shardCenter, 0.03 + fi * 0.01, rotation);

      let shardColor = prismaticColor(fi * 1.2 + time * 0.3, 0.8);
      color = mix(color, shardColor, shard * 0.4);
    }

    // Radial vignette
    let center = vec2f(0.5 * uniforms.aspect, 0.5);
    let dist = length(uv - center) / uniforms.aspect;
    color *= 1.0 - dist * 0.4;

    // Subtle pulse
    color *= 0.95 + sin(time * 2.0) * 0.05;

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

    // Type 0: Crystal dust
    if (input.particleType < 0.5) {
      // Hexagonal shape
      let angle = atan2(input.uv.y, input.uv.x);
      let hexShape = cos(angle * 3.0) * 0.3 + 0.7;
      alpha = smoothstep(hexShape, 0.0, dist) * input.life * 0.7;
    }
    // Type 1: Prismatic spark
    else if (input.particleType < 1.5) {
      let spark = smoothstep(0.4, 0.0, dist);
      let core = smoothstep(0.15, 0.0, dist);
      alpha = spark * input.life;
      // Rainbow shimmer
      let hue = time * 5.0 + dist * 3.0;
      color = mix(color, vec3f(
        sin(hue) * 0.5 + 0.5,
        sin(hue + 2.094) * 0.5 + 0.5,
        sin(hue + 4.189) * 0.5 + 0.5
      ), core * 0.5);
    }
    // Type 2: Victory - gem confetti
    else if (input.particleType < 2.5) {
      // Diamond shape
      let diamond = 1.0 - (abs(input.uv.x) + abs(input.uv.y));
      alpha = step(0.3, diamond) * input.life;
      // Facet shine
      let shine = sin(time * 8.0 + input.uv.x * 6.0) * 0.5 + 0.5;
      color = mix(color, color * 1.5, shine * 0.4);
    }
    // Type 3: Ambient - floating motes
    else if (input.particleType < 3.5) {
      alpha = smoothstep(1.0, 0.0, dist) * input.life * 0.3;
      // Gentle twinkle
      alpha *= 0.7 + sin(time * 4.0 + dist * 10.0) * 0.3;
    }
    // Type 4: Energy pulse
    else {
      let ring = smoothstep(0.8, 0.6, dist) * smoothstep(0.4, 0.6, dist);
      alpha = ring * input.life;
      // Color shift in ring
      color = mix(color, vec3f(0.8, 0.4, 1.0), ring * 0.5);
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

    // Hexagonal burst pattern
    let center = vec2f(0.5, 0.5);
    let toCenter = uv - center;
    let dist = length(toCenter);
    let angle = atan2(toCenter.y, toCenter.x);

    // Six-pointed rays
    let rays = pow(abs(cos(angle * 3.0 + time * 2.0)), 3.0);
    let rayFade = smoothstep(0.6, 0.0, dist);

    // Prismatic rings
    let rings = sin(dist * 20.0 - time * 5.0) * 0.5 + 0.5;
    let ringFade = smoothstep(0.5, 0.1, dist);

    // Rainbow colors
    let hue = angle + time * 2.0;
    let rainbow = vec3f(
      sin(hue) * 0.5 + 0.5,
      sin(hue + 2.094) * 0.5 + 0.5,
      sin(hue + 4.189) * 0.5 + 0.5
    );

    let alpha = (rays * rayFade * 0.4 + rings * ringFade * 0.3) * intensity;

    return vec4f(rainbow, alpha);
  }
`;
