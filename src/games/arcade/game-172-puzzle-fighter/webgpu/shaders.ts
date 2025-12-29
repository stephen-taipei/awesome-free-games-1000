/**
 * Puzzle Fighter WebGPU Shaders
 * Game #172 - VS Battle Arena Theme
 */

export const backgroundShader = /* wgsl */ `
  struct Uniforms {
    time: f32,
    resolution: vec2f,
    intensity: f32,
  }

  @group(0) @binding(0) var<uniform> uniforms: Uniforms;

  struct VertexOutput {
    @builtin(position) position: vec4f,
    @location(0) uv: vec2f,
  }

  @vertex
  fn vertexMain(@builtin(vertex_index) vertexIndex: u32) -> VertexOutput {
    var pos = array<vec2f, 4>(
      vec2f(-1.0, -1.0),
      vec2f(1.0, -1.0),
      vec2f(-1.0, 1.0),
      vec2f(1.0, 1.0)
    );

    var output: VertexOutput;
    output.position = vec4f(pos[vertexIndex], 0.0, 1.0);
    output.uv = pos[vertexIndex] * 0.5 + 0.5;
    return output;
  }

  fn hash(p: vec2f) -> f32 {
    let h = dot(p, vec2f(127.1, 311.7));
    return fract(sin(h) * 43758.5453);
  }

  fn noise(p: vec2f) -> f32 {
    let i = floor(p);
    let f = fract(p);
    let u = f * f * (3.0 - 2.0 * f);

    return mix(
      mix(hash(i), hash(i + vec2f(1.0, 0.0)), u.x),
      mix(hash(i + vec2f(0.0, 1.0)), hash(i + vec2f(1.0, 1.0)), u.x),
      u.y
    );
  }

  fn fbm(p: vec2f) -> f32 {
    var value = 0.0;
    var amplitude = 0.5;
    var pos = p;

    for (var i = 0; i < 4; i++) {
      value += amplitude * noise(pos);
      pos *= 2.0;
      amplitude *= 0.5;
    }
    return value;
  }

  // Battle arena grid pattern
  fn arenaGrid(uv: vec2f, time: f32) -> f32 {
    let gridSize = 20.0;
    let grid = uv * gridSize;

    let lineX = smoothstep(0.0, 0.05, abs(fract(grid.x) - 0.5));
    let lineY = smoothstep(0.0, 0.05, abs(fract(grid.y) - 0.5));

    let pulse = sin(time * 2.0) * 0.5 + 0.5;
    return (1.0 - lineX * lineY) * 0.3 * (0.5 + pulse * 0.2);
  }

  // Energy waves emanating from center
  fn energyWave(uv: vec2f, time: f32) -> f32 {
    let center = vec2f(0.5, 0.5);
    let dist = length(uv - center);

    let wave1 = sin(dist * 30.0 - time * 3.0) * 0.5 + 0.5;
    let wave2 = sin(dist * 20.0 - time * 2.0 + 1.57) * 0.5 + 0.5;

    let fade = 1.0 - smoothstep(0.1, 0.5, dist);
    return (wave1 * 0.5 + wave2 * 0.5) * fade * 0.2;
  }

  // VS divider line
  fn vsDivider(uv: vec2f, time: f32) -> vec3f {
    let centerX = 0.5;
    let dist = abs(uv.x - centerX);

    // Main line
    let line = smoothstep(0.01, 0.005, dist);

    // Energy glow
    let glow = exp(-dist * 50.0) * (sin(time * 5.0) * 0.3 + 0.7);

    // Spark particles along line
    let sparkY = fract(uv.y * 8.0 - time * 2.0);
    let spark = smoothstep(0.1, 0.0, abs(sparkY - 0.5)) * smoothstep(0.015, 0.01, dist);

    let color = vec3f(0.8, 0.2, 0.9);
    return color * (line * 0.5 + glow * 0.8 + spark * 1.5);
  }

  // Player side aura
  fn playerAura(uv: vec2f, time: f32) -> vec3f {
    let leftArea = smoothstep(0.5, 0.0, uv.x);
    let noise = fbm(uv * 3.0 + vec2f(0.0, time * 0.5)) * leftArea;
    return vec3f(0.2, 0.6, 0.86) * noise * 0.15;
  }

  // CPU side aura
  fn cpuAura(uv: vec2f, time: f32) -> vec3f {
    let rightArea = smoothstep(0.5, 1.0, uv.x);
    let noise = fbm(uv * 3.0 + vec2f(time * 0.3, 0.0)) * rightArea;
    return vec3f(0.91, 0.3, 0.24) * noise * 0.15;
  }

  // Corner energy
  fn cornerEnergy(uv: vec2f, time: f32) -> f32 {
    let corners = array<vec2f, 4>(
      vec2f(0.0, 0.0),
      vec2f(1.0, 0.0),
      vec2f(0.0, 1.0),
      vec2f(1.0, 1.0)
    );

    var energy = 0.0;
    for (var i = 0; i < 4; i++) {
      let dist = length(uv - corners[i]);
      let pulse = sin(time * 3.0 + f32(i) * 1.57) * 0.5 + 0.5;
      energy += exp(-dist * 8.0) * pulse * 0.3;
    }
    return energy;
  }

  @fragment
  fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
    let uv = input.uv;
    let time = uniforms.time;
    let intensity = uniforms.intensity;

    // Base arena color
    var color = vec3f(0.06, 0.06, 0.12);

    // Add grid pattern
    let grid = arenaGrid(uv, time);
    color += vec3f(0.2, 0.1, 0.3) * grid;

    // Add energy waves
    let waves = energyWave(uv, time);
    color += vec3f(0.8, 0.2, 0.9) * waves * intensity;

    // Add player/CPU auras
    color += playerAura(uv, time) * intensity;
    color += cpuAura(uv, time) * intensity;

    // Add VS divider
    color += vsDivider(uv, time) * intensity;

    // Add corner energy
    let corners = cornerEnergy(uv, time);
    color += vec3f(1.0, 0.5, 0.0) * corners * intensity;

    // Subtle vignette
    let vignette = 1.0 - length(uv - 0.5) * 0.5;
    color *= vignette;

    return vec4f(color, 1.0);
  }
`;

export const particleShader = /* wgsl */ `
  struct Uniforms {
    time: f32,
    resolution: vec2f,
    intensity: f32,
  }

  struct Particle {
    position: vec2f,
    velocity: vec2f,
    color: vec4f,
    life: f32,
    size: f32,
    particleType: f32,
    rotation: f32,
  }

  @group(0) @binding(0) var<uniform> uniforms: Uniforms;
  @group(0) @binding(1) var<storage, read> particles: array<Particle>;

  struct VertexOutput {
    @builtin(position) position: vec4f,
    @location(0) color: vec4f,
    @location(1) uv: vec2f,
    @location(2) life: f32,
    @location(3) particleType: f32,
  }

  @vertex
  fn vertexMain(
    @builtin(vertex_index) vertexIndex: u32,
    @builtin(instance_index) instanceIndex: u32
  ) -> VertexOutput {
    let particle = particles[instanceIndex];

    var corners = array<vec2f, 4>(
      vec2f(-1.0, -1.0),
      vec2f(1.0, -1.0),
      vec2f(-1.0, 1.0),
      vec2f(1.0, 1.0)
    );

    let corner = corners[vertexIndex];
    let size = particle.size * particle.life;

    // Apply rotation
    let cos_r = cos(particle.rotation);
    let sin_r = sin(particle.rotation);
    let rotated = vec2f(
      corner.x * cos_r - corner.y * sin_r,
      corner.x * sin_r + corner.y * cos_r
    );

    let worldPos = particle.position + rotated * size;
    let clipPos = worldPos * 2.0 - 1.0;

    var output: VertexOutput;
    output.position = vec4f(clipPos.x, -clipPos.y, 0.0, 1.0);
    output.color = particle.color;
    output.uv = corner * 0.5 + 0.5;
    output.life = particle.life;
    output.particleType = particle.particleType;
    return output;
  }

  @fragment
  fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
    let uv = input.uv;
    let center = vec2f(0.5, 0.5);
    let dist = length(uv - center);
    let pType = i32(input.particleType);

    var alpha = 0.0;
    var color = input.color.rgb;

    // Type 0: Block clear - gem shard
    if (pType == 0) {
      let diamond = abs(uv.x - 0.5) + abs(uv.y - 0.5);
      alpha = smoothstep(0.5, 0.3, diamond) * input.life;
      color *= 1.0 + (1.0 - input.life) * 0.5;
    }
    // Type 1: Garbage send - energy bolt
    else if (pType == 1) {
      let bolt = abs(uv.y - 0.5) * 2.0;
      let zigzag = sin(uv.x * 20.0) * 0.1;
      alpha = smoothstep(0.3 + zigzag, 0.0, bolt) * input.life;
      color = mix(color, vec3f(1.0, 0.5, 0.0), 0.5);
    }
    // Type 2: Garbage receive - impact
    else if (pType == 2) {
      let ring = abs(dist - 0.3) * 5.0;
      alpha = smoothstep(1.0, 0.0, ring) * input.life;
      color = vec3f(0.5, 0.55, 0.6);
    }
    // Type 3: Combo - burst star
    else if (pType == 3) {
      let angle = atan2(uv.y - 0.5, uv.x - 0.5);
      let star = sin(angle * 6.0) * 0.2 + 0.3;
      alpha = smoothstep(star, star - 0.1, dist) * input.life;
      color = mix(vec3f(1.0, 0.5, 0.0), vec3f(1.0, 1.0, 0.0), input.life);
    }
    // Type 4: Piece lock - flash
    else if (pType == 4) {
      let square = max(abs(uv.x - 0.5), abs(uv.y - 0.5));
      alpha = smoothstep(0.5, 0.3, square) * input.life * input.life;
      color = vec3f(1.0, 1.0, 1.0);
    }
    // Type 5: Game over - explosion/confetti
    else if (pType == 5) {
      alpha = smoothstep(0.5, 0.0, dist) * input.life;
      color *= 1.5;
    }

    return vec4f(color, alpha * input.color.a);
  }
`;
