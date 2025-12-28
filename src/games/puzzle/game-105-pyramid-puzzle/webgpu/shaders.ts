/**
 * WebGPU Shaders - Pyramid Puzzle
 * Ancient Egypt / Desert Mystique Theme
 * Game #105
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

  // Hash function for stars
  fn hash(p: vec2f) -> f32 {
    var p3 = fract(vec3f(p.x, p.y, p.x) * 0.13);
    p3 += dot(p3, p3.yzx + 3.333);
    return fract((p3.x + p3.y) * p3.z);
  }

  // Noise function
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

  // Night sky with stars
  fn nightSky(uv: vec2f, time: f32) -> vec3f {
    let skyTop = vec3f(0.05, 0.05, 0.15);
    let skyBottom = vec3f(0.1, 0.08, 0.2);
    var sky = mix(skyBottom, skyTop, uv.y);

    // Stars
    for (var i = 0; i < 50; i++) {
      let fi = f32(i);
      let starPos = vec2f(
        fract(sin(fi * 12.9898) * 43758.5453),
        fract(cos(fi * 78.233) * 43758.5453) * 0.6 + 0.3
      );
      let dist = distance(uv, starPos);
      let twinkle = 0.5 + 0.5 * sin(time * (2.0 + fi * 0.3) + fi);
      let brightness = exp(-dist * 200.0) * twinkle;
      sky += vec3f(1.0, 0.98, 0.9) * brightness * 0.5;
    }

    return sky;
  }

  // Moon
  fn moon(uv: vec2f) -> vec3f {
    let moonPos = vec2f(0.85, 0.85);
    let moonRadius = 0.05;
    let dist = distance(uv, moonPos);

    if (dist < moonRadius) {
      let shadowDist = distance(uv, moonPos + vec2f(0.02, -0.01));
      if (shadowDist > moonRadius * 0.85) {
        return vec3f(0.0);
      }
      return vec3f(0.95, 0.93, 0.85);
    }

    // Moon glow
    let glow = exp(-dist * 15.0) * 0.3;
    return vec3f(0.95, 0.9, 0.8) * glow;
  }

  // Sand dunes
  fn sandDunes(uv: vec2f, time: f32) -> vec3f {
    if (uv.y > 0.25) {
      return vec3f(0.0);
    }

    let sandTop = vec3f(0.85, 0.7, 0.45);
    let sandBottom = vec3f(0.65, 0.5, 0.35);
    let sandColor = mix(sandBottom, sandTop, uv.y / 0.25);

    // Dune waves
    let duneWave = sin(uv.x * 15.0 + time * 0.1) * 0.02;
    let dusty = noise(uv * 50.0) * 0.1;

    return sandColor * (1.0 + duneWave + dusty);
  }

  // Hieroglyphic pattern overlay
  fn hieroglyphs(uv: vec2f, time: f32) -> f32 {
    let scale = 30.0;
    let gridX = floor(uv.x * scale);
    let gridY = floor(uv.y * scale);
    let rand = hash(vec2f(gridX, gridY));

    if (rand > 0.92) {
      let pulse = 0.5 + 0.5 * sin(time * 2.0 + rand * 6.28);
      return pulse * 0.15;
    }
    return 0.0;
  }

  @fragment
  fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
    let uv = input.uv;
    let time = uniforms.time;

    // Night sky
    var color = nightSky(uv, time);

    // Add moon
    color += moon(uv);

    // Add sand dunes
    color += sandDunes(uv, time);

    // Add subtle hieroglyph glow
    let hieroglyph = hieroglyphs(uv, time);
    color += vec3f(0.9, 0.7, 0.3) * hieroglyph * uniforms.intensity;

    // Vignette
    let vignette = 1.0 - length(uv - 0.5) * 0.6;
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
      // Sand particle - warm tan/gold
      case 0: {
        let grain = exp(-dist * 6.0);
        let colorVar = 0.8 + input.param1 * 0.4;
        color = vec3f(0.85, 0.7, 0.45) * colorVar;
        alpha = grain * life * 0.7;
      }

      // Star particle - twinkling white/gold
      case 1: {
        let twinkle = 0.6 + 0.4 * sin(time * 5.0 + input.param1 * 10.0);
        let star = exp(-dist * 8.0) * twinkle;
        color = mix(vec3f(1.0, 1.0, 0.9), vec3f(1.0, 0.9, 0.6), input.param2);
        alpha = star * life;
      }

      // Sacred golden energy
      case 2: {
        let pulse = 0.7 + 0.3 * sin(time * 4.0 + input.param1 * 6.28);
        let glow = exp(-dist * 4.0) * pulse;
        let ring = smoothstep(0.35, 0.4, dist) * smoothstep(0.5, 0.45, dist);
        color = vec3f(1.0, 0.85, 0.3);
        alpha = (glow + ring * 0.6) * life;
      }

      // Flip effect - color transition burst
      case 3: {
        let burst = exp(-dist * 5.0);
        let wave = sin(dist * 15.0 - time * 10.0) * 0.5 + 0.5;
        // Color based on param1
        let hue = input.param1;
        let c = 1.0;
        let x_val = c * (1.0 - abs((hue * 6.0) % 2.0 - 1.0));
        var rgb: vec3f;
        let h = hue * 6.0;
        if (h < 1.0) { rgb = vec3f(c, x_val, 0.0); }
        else if (h < 2.0) { rgb = vec3f(x_val, c, 0.0); }
        else if (h < 3.0) { rgb = vec3f(0.0, c, x_val); }
        else if (h < 4.0) { rgb = vec3f(0.0, x_val, c); }
        else if (h < 5.0) { rgb = vec3f(x_val, 0.0, c); }
        else { rgb = vec3f(c, 0.0, x_val); }
        color = rgb;
        alpha = burst * wave * life * 0.8;
      }

      // Desert dust - brownish particles
      case 4: {
        let dust = exp(-dist * 5.0);
        let drift = 0.8 + 0.2 * sin(time * 3.0 + input.param1 * 5.0);
        color = vec3f(0.6, 0.5, 0.35) * drift;
        alpha = dust * life * 0.5;
      }

      // Pharaoh victory - golden hieroglyphic burst
      case 5: {
        let hieroglyph = exp(-dist * 3.0);
        let shimmer = 0.7 + 0.3 * sin(time * 8.0 + input.param1 * 10.0);
        let goldShift = mix(vec3f(1.0, 0.85, 0.3), vec3f(1.0, 0.95, 0.7), shimmer);
        color = goldShift * hieroglyph;
        alpha = hieroglyph * life;
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
