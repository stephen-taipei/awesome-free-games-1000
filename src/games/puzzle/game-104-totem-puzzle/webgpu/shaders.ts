/**
 * WebGPU Shaders - Totem Puzzle
 * Ancient Tribal / Spirit Theme
 * Game #104
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

  // Pseudo-random function
  fn hash(p: vec2f) -> f32 {
    var p3 = fract(vec3f(p.x, p.y, p.x) * 0.13);
    p3 += dot(p3, p3.yzx + 3.333);
    return fract((p3.x + p3.y) * p3.z);
  }

  // Value noise
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

  // Fractal brownian motion
  fn fbm(p: vec2f) -> f32 {
    var value = 0.0;
    var amplitude = 0.5;
    var frequency = 1.0;
    var pos = p;
    for (var i = 0; i < 4; i++) {
      value += amplitude * noise(pos * frequency);
      frequency *= 2.0;
      amplitude *= 0.5;
    }
    return value;
  }

  // Tribal pattern
  fn tribalPattern(uv: vec2f, time: f32) -> f32 {
    let scale = 8.0;
    var p = uv * scale;

    // Zigzag pattern
    let zigzag = abs(fract(p.x + sin(p.y * 3.14159) * 0.3) - 0.5) * 2.0;

    // Diamond pattern
    let diamond = abs(fract(p.x) - 0.5) + abs(fract(p.y) - 0.5);

    return mix(zigzag, diamond, 0.5) * 0.15;
  }

  // Fire glow
  fn fireGlow(uv: vec2f, time: f32) -> vec3f {
    let torchPositions = array<vec2f, 2>(
      vec2f(0.1, 0.7),
      vec2f(0.9, 0.7)
    );

    var glow = vec3f(0.0);
    for (var i = 0u; i < 2u; i++) {
      let dist = distance(uv, torchPositions[i]);
      let flicker = 0.8 + 0.2 * sin(time * 10.0 + f32(i) * 3.14);
      let intensity = flicker / (dist * 8.0 + 0.5);
      glow += vec3f(1.0, 0.4, 0.1) * intensity * 0.2;
    }
    return glow;
  }

  // Spirit wisps
  fn spiritWisps(uv: vec2f, time: f32) -> f32 {
    var wisp = 0.0;
    for (var i = 0; i < 5; i++) {
      let fi = f32(i);
      let phase = fi * 1.256;
      let cx = 0.5 + sin(time * 0.3 + phase) * 0.3;
      let cy = 0.3 + cos(time * 0.2 + phase * 1.5) * 0.2 - time * 0.02;
      let wrappedCy = fract(cy);
      let dist = distance(uv, vec2f(cx, wrappedCy));
      wisp += exp(-dist * 30.0) * 0.15;
    }
    return wisp;
  }

  @fragment
  fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
    let uv = input.uv;
    let time = uniforms.time;

    // Base gradient - warm earthy colors
    let topColor = vec3f(0.12, 0.06, 0.04);
    let bottomColor = vec3f(0.25, 0.14, 0.08);
    var color = mix(topColor, bottomColor, uv.y);

    // Add tribal pattern overlay
    let tribal = tribalPattern(uv, time);
    color += vec3f(0.4, 0.25, 0.15) * tribal * uniforms.intensity;

    // Add atmospheric haze
    let haze = fbm(uv * 3.0 + time * 0.05);
    color += vec3f(0.15, 0.08, 0.05) * haze * 0.3;

    // Add fire glow from torches
    color += fireGlow(uv, time) * uniforms.intensity;

    // Add spirit wisps
    let wisps = spiritWisps(uv, time);
    color += vec3f(0.6, 0.8, 1.0) * wisps * uniforms.intensity;

    // Vignette
    let vignette = 1.0 - length(uv - 0.5) * 0.8;
    color *= vignette;

    return vec4f(color, 0.9);
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
      // Spirit orb - ethereal blue/white
      case 0: {
        let glow = exp(-dist * 4.0);
        let core = exp(-dist * 15.0);
        color = mix(vec3f(0.4, 0.6, 1.0), vec3f(1.0, 1.0, 1.0), core);
        alpha = (glow + core * 0.5) * life * 0.8;
      }

      // Fire particle - warm orange/red
      case 1: {
        let flicker = 0.8 + 0.2 * sin(time * 15.0 + input.param1 * 10.0);
        let flame = exp(-dist * 5.0) * flicker;
        let gradient = mix(vec3f(1.0, 0.2, 0.0), vec3f(1.0, 0.8, 0.2), 1.0 - life);
        color = gradient;
        alpha = flame * life * 0.9;
      }

      // Dust/stone particle - earthy brown
      case 2: {
        let grain = exp(-dist * 6.0);
        color = vec3f(0.6, 0.4, 0.25) * (0.8 + input.param1 * 0.4);
        alpha = grain * life * 0.6;
      }

      // Selection glow - golden sacred
      case 3: {
        let pulse = 0.7 + 0.3 * sin(time * 4.0);
        let ring = smoothstep(0.3, 0.4, dist) * smoothstep(0.5, 0.4, dist);
        let glow = exp(-dist * 3.0);
        color = vec3f(1.0, 0.85, 0.4) * pulse;
        alpha = (ring * 0.8 + glow * 0.5) * life;
      }

      // Smoke particle - grey wisps
      case 4: {
        let smoke = exp(-dist * 3.0);
        let turbulence = sin(uv.x * 10.0 + time * 2.0) * cos(uv.y * 10.0 + time * 1.5) * 0.1;
        color = vec3f(0.4, 0.35, 0.3) + turbulence;
        alpha = smoke * life * 0.4;
      }

      // Magic completion - rainbow energy
      case 5: {
        let hue = fract(input.param1 + time * 0.3);
        let h = hue * 6.0;
        let c = 1.0;
        let x_val = c * (1.0 - abs(h % 2.0 - 1.0));
        var rgb: vec3f;
        if (h < 1.0) { rgb = vec3f(c, x_val, 0.0); }
        else if (h < 2.0) { rgb = vec3f(x_val, c, 0.0); }
        else if (h < 3.0) { rgb = vec3f(0.0, c, x_val); }
        else if (h < 4.0) { rgb = vec3f(0.0, x_val, c); }
        else if (h < 5.0) { rgb = vec3f(x_val, 0.0, c); }
        else { rgb = vec3f(c, 0.0, x_val); }
        let burst = exp(-dist * 4.0);
        color = rgb;
        alpha = burst * life;
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
