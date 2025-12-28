/**
 * WebGPU Shaders - Treasure Map
 * Pirate Adventure / Nautical Theme
 * Game #106
 */

export const BACKGROUND_SHADER = /* wgsl */`
  struct Uniforms {
    time: f32,
    width: f32,
    height: f32,
    intensity: f32,
  }

  @group(0) @binding(0) var<uniform> uniforms: Uniforms;

  struct VertexOutput {
    @builtin(position) position: vec4f,
    @location(0) uv: vec2f,
  }

  @vertex
  fn vertexMain(@builtin(vertex_index) vertexIndex: u32) -> VertexOutput {
    var positions = array<vec2f, 6>(
      vec2f(-1, -1), vec2f(1, -1), vec2f(-1, 1),
      vec2f(-1, 1), vec2f(1, -1), vec2f(1, 1)
    );

    var output: VertexOutput;
    output.position = vec4f(positions[vertexIndex], 0, 1);
    output.uv = positions[vertexIndex] * 0.5 + 0.5;
    return output;
  }

  fn hash(p: vec2f) -> f32 {
    var p3 = fract(vec3f(p.x, p.y, p.x) * 0.13);
    p3 += dot(p3, p3.yzx + 3.333);
    return fract((p3.x + p3.y) * p3.z);
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

  // Parchment paper texture
  fn parchment(uv: vec2f) -> vec3f {
    let base = vec3f(0.85, 0.75, 0.55);
    let aged = vec3f(0.7, 0.6, 0.45);

    // Paper texture
    let tex1 = noise(uv * 50.0) * 0.1;
    let tex2 = noise(uv * 100.0) * 0.05;

    // Age stains
    let stain = noise(uv * 5.0) * 0.15;

    var color = mix(base, aged, stain);
    color += tex1 + tex2;

    return color;
  }

  // Ocean waves at bottom
  fn oceanWaves(uv: vec2f, time: f32) -> vec3f {
    if (uv.y > 0.15) {
      return vec3f(0.0);
    }

    let waveY = uv.y / 0.15;
    let wave1 = sin(uv.x * 20.0 + time * 2.0) * 0.02;
    let wave2 = sin(uv.x * 15.0 + time * 1.5) * 0.015;

    let deepBlue = vec3f(0.1, 0.3, 0.5);
    let lightBlue = vec3f(0.3, 0.5, 0.7);
    let foam = vec3f(0.9, 0.95, 1.0);

    var water = mix(deepBlue, lightBlue, waveY + wave1 + wave2);

    // Foam caps
    let foamLine = smoothstep(0.13, 0.15, uv.y + wave1);
    water = mix(water, foam, foamLine * 0.5);

    return water;
  }

  // Compass rose decoration
  fn compassRose(uv: vec2f, time: f32) -> f32 {
    let center = vec2f(0.9, 0.1);
    let dist = distance(uv, center);

    if (dist > 0.08) {
      return 0.0;
    }

    let angle = atan2(uv.y - center.y, uv.x - center.x);
    let points = 8.0;
    let star = abs(sin(angle * points)) * (1.0 - dist / 0.08);

    return star * 0.3;
  }

  // Dotted path lines
  fn pathDots(uv: vec2f, time: f32) -> f32 {
    let scale = 30.0;
    let p = uv * scale;
    let dot = fract(p);
    let dist = distance(dot, vec2f(0.5));

    let pattern = smoothstep(0.1, 0.08, dist);
    let fade = sin(floor(p.x) * 0.5 + time) * 0.5 + 0.5;

    return pattern * fade * 0.1;
  }

  @fragment
  fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
    let uv = input.uv;
    let time = uniforms.time;

    // Parchment base
    var color = parchment(uv);

    // Add ocean waves
    color += oceanWaves(uv, time);

    // Compass rose
    let compass = compassRose(uv, time);
    color = mix(color, vec3f(0.4, 0.2, 0.1), compass);

    // Dotted paths
    let dots = pathDots(uv, time);
    color -= vec3f(dots);

    // Burnt edges vignette
    let edgeDist = min(min(uv.x, 1.0 - uv.x), min(uv.y, 1.0 - uv.y));
    let burn = smoothstep(0.0, 0.08, edgeDist);
    color *= 0.7 + burn * 0.3;

    // Edge darkening
    let vignette = 1.0 - length(uv - 0.5) * 0.4;
    color *= vignette;

    return vec4f(color, 0.85);
  }
`;

export const PARTICLE_SHADER = /* wgsl */`
  struct Uniforms {
    time: f32,
    width: f32,
    height: f32,
    intensity: f32,
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
    param1: f32,
    param2: f32,
  }

  @group(0) @binding(0) var<uniform> uniforms: Uniforms;
  @group(0) @binding(1) var<storage, read> particles: array<Particle>;

  struct VertexOutput {
    @builtin(position) position: vec4f,
    @location(0) uv: vec2f,
    @location(1) life: f32,
    @location(2) particleType: f32,
    @location(3) param1: f32,
    @location(4) param2: f32,
  }

  @vertex
  fn vertexMain(
    @builtin(vertex_index) vertexIndex: u32,
    @builtin(instance_index) instanceIndex: u32
  ) -> VertexOutput {
    let particle = particles[instanceIndex];

    var corners = array<vec2f, 6>(
      vec2f(-1, -1), vec2f(1, -1), vec2f(-1, 1),
      vec2f(-1, 1), vec2f(1, -1), vec2f(1, 1)
    );

    let corner = corners[vertexIndex];
    let size = particle.size * (0.5 + particle.life / particle.maxLife * 0.5);

    let x = (particle.x / uniforms.width) * 2.0 - 1.0;
    let y = 1.0 - (particle.y / uniforms.height) * 2.0;

    var output: VertexOutput;
    output.position = vec4f(
      x + corner.x * size / uniforms.width,
      y + corner.y * size / uniforms.height,
      0, 1
    );
    output.uv = corner * 0.5 + 0.5;
    output.life = particle.life / particle.maxLife;
    output.particleType = particle.particleType;
    output.param1 = particle.param1;
    output.param2 = particle.param2;

    return output;
  }

  @fragment
  fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
    let uv = input.uv;
    let center = vec2f(0.5, 0.5);
    let dist = distance(uv, center);
    let life = input.life;
    let pType = i32(input.particleType);
    let time = uniforms.time;

    var color: vec3f;
    var alpha: f32;

    switch (pType) {
      // Sparkle - gold/silver treasure glint
      case 0: {
        let twinkle = 0.5 + 0.5 * sin(time * 10.0 + input.param1 * 20.0);
        let star = exp(-dist * 6.0) * twinkle;
        let goldRatio = input.param2;
        let gold = vec3f(1.0, 0.85, 0.3);
        let silver = vec3f(0.9, 0.9, 1.0);
        color = mix(gold, silver, goldRatio);
        alpha = star * life;
      }

      // Compass - directional particles
      case 1: {
        let needle = exp(-dist * 5.0);
        let pulse = 0.7 + 0.3 * sin(time * 3.0);
        color = vec3f(0.6, 0.2, 0.1) * pulse;
        alpha = needle * life * 0.8;
      }

      // Scroll - paper/parchment particles
      case 2: {
        let paper = exp(-dist * 4.0);
        color = vec3f(0.9, 0.82, 0.65);
        alpha = paper * life * 0.6;
      }

      // Wave - ocean water splash
      case 3: {
        let wave = exp(-dist * 5.0);
        let shimmer = 0.8 + 0.2 * sin(time * 5.0 + input.param1 * 10.0);
        color = vec3f(0.3, 0.6, 0.8) * shimmer;
        alpha = wave * life * 0.7;
      }

      // Discover - clue found burst
      case 4: {
        let burst = exp(-dist * 4.0);
        let ring = smoothstep(0.35, 0.4, dist) * smoothstep(0.5, 0.45, dist);
        let flashColor = vec3f(1.0, 0.95, 0.7);
        color = flashColor;
        alpha = (burst + ring * 0.5) * life;
      }

      // Treasure - victory gold shower
      case 5: {
        let coin = exp(-dist * 5.0);
        let shine = 0.7 + 0.3 * sin(time * 8.0 + input.param1 * 15.0);
        let goldColor = vec3f(1.0, 0.85, 0.2);
        let gemColor = vec3f(0.8, 0.2, 0.3);
        color = mix(goldColor, gemColor, input.param2) * shine;
        alpha = coin * life;
      }

      default: {
        color = vec3f(1.0);
        alpha = 0.0;
      }
    }

    if (alpha < 0.01) {
      discard;
    }

    return vec4f(color, alpha * uniforms.intensity);
  }
`;
