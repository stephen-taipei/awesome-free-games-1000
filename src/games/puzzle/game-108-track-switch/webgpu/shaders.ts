/**
 * WebGPU Shaders - Track Switch
 * Railway / Industrial Theme
 * Game #108
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

  // Countryside grass
  fn grass(uv: vec2f, time: f32) -> vec3f {
    let grassBase = vec3f(0.2, 0.45, 0.15);
    let grassLight = vec3f(0.35, 0.6, 0.25);

    let windWave = sin(uv.x * 20.0 + time * 2.0) * 0.5 + 0.5;
    let grassNoise = noise(uv * 50.0) * 0.3;

    return mix(grassBase, grassLight, windWave * 0.3 + grassNoise);
  }

  // Rolling hills in background
  fn hills(uv: vec2f, time: f32) -> vec3f {
    let hillLine = 0.7 + sin(uv.x * 3.0) * 0.08 + sin(uv.x * 7.0 + 1.0) * 0.03;

    if (uv.y > hillLine) {
      // Sky
      let skyTop = vec3f(0.4, 0.6, 0.9);
      let skyBottom = vec3f(0.7, 0.8, 1.0);
      return mix(skyBottom, skyTop, (uv.y - hillLine) / (1.0 - hillLine));
    }

    let hillColor = vec3f(0.25, 0.5, 0.2);
    return hillColor * (0.9 + noise(uv * 30.0) * 0.2);
  }

  // Railway track pattern
  fn railTrack(uv: vec2f, time: f32) -> vec3f {
    let trackY = 0.15;
    let trackWidth = 0.06;

    if (abs(uv.y - trackY) > trackWidth) {
      return vec3f(0.0);
    }

    // Sleepers (cross ties)
    let sleeperSpacing = 0.03;
    let sleeperWidth = 0.008;
    let sleeperPos = uv.x % sleeperSpacing;
    if (sleeperPos < sleeperWidth) {
      return vec3f(0.35, 0.25, 0.15); // Brown wood
    }

    // Rails
    let railY1 = trackY - trackWidth * 0.6;
    let railY2 = trackY + trackWidth * 0.6;
    let railWidth = 0.006;

    if (abs(uv.y - railY1) < railWidth || abs(uv.y - railY2) < railWidth) {
      let shine = 0.7 + sin(uv.x * 100.0 + time) * 0.1;
      return vec3f(0.5, 0.5, 0.55) * shine; // Steel rails
    }

    // Gravel
    let gravelNoise = noise(uv * 200.0);
    return vec3f(0.45, 0.4, 0.35) * (0.7 + gravelNoise * 0.3);
  }

  // Signal light
  fn signalLight(uv: vec2f, time: f32) -> vec3f {
    let signalPos = vec2f(0.9, 0.25);
    let dist = distance(uv, signalPos);

    if (dist > 0.03) {
      return vec3f(0.0);
    }

    // Pole
    if (abs(uv.x - signalPos.x) < 0.005 && uv.y < signalPos.y) {
      return vec3f(0.3, 0.3, 0.3);
    }

    // Light
    let blink = sin(time * 3.0) > 0.0;
    if (dist < 0.015 && blink) {
      let glow = exp(-dist * 100.0);
      return vec3f(0.0, 1.0, 0.3) * glow;
    }

    return vec3f(0.2, 0.2, 0.2);
  }

  // Steam/smoke clouds in sky
  fn steamClouds(uv: vec2f, time: f32) -> vec3f {
    if (uv.y < 0.6) {
      return vec3f(0.0);
    }

    var cloud = 0.0;
    for (var i = 0u; i < 3u; i++) {
      let offset = f32(i) * 0.3;
      let cloudX = (uv.x + time * 0.05 + offset) % 1.0;
      let cloudNoise = noise(vec2f(cloudX * 10.0, uv.y * 5.0 + f32(i)));
      cloud += cloudNoise * 0.15;
    }

    return vec3f(0.9, 0.9, 0.95) * cloud;
  }

  @fragment
  fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
    let uv = input.uv;
    let time = uniforms.time;

    // Layer composition
    var color = hills(uv, time);

    // Add grass in foreground
    if (uv.y < 0.5) {
      color = grass(uv, time);
    }

    // Add track
    let track = railTrack(uv, time);
    if (length(track) > 0.1) {
      color = track;
    }

    // Signal light
    color += signalLight(uv, time);

    // Steam clouds
    color += steamClouds(uv, time);

    // Vignette
    let vignette = 1.0 - length(uv - 0.5) * 0.3;
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
      // Steam - white fluffy puffs
      case 0: {
        let puff = exp(-dist * 3.0);
        let billow = noise2D(uv * 5.0 + time);
        color = vec3f(0.95, 0.95, 1.0);
        alpha = puff * life * (0.7 + billow * 0.3);
      }

      // Spark - bright orange/yellow
      case 1: {
        let spark = exp(-dist * 8.0);
        let flicker = 0.7 + 0.3 * sin(time * 20.0 + input.param1 * 30.0);
        color = mix(vec3f(1.0, 0.6, 0.1), vec3f(1.0, 0.9, 0.3), input.param2);
        alpha = spark * life * flicker;
      }

      // Signal - glowing light
      case 2: {
        let glow = exp(-dist * 5.0);
        let greenRed = input.param1;
        color = mix(vec3f(1.0, 0.2, 0.1), vec3f(0.1, 1.0, 0.3), greenRed);
        alpha = glow * life;
      }

      // Smoke - dark billowing
      case 3: {
        let smoke = exp(-dist * 2.5);
        let gray = 0.3 + input.param1 * 0.2;
        color = vec3f(gray);
        alpha = smoke * life * 0.6;
      }

      // Arrival - celebration sparkle
      case 4: {
        let star = exp(-dist * 6.0);
        let twinkle = 0.5 + 0.5 * sin(time * 15.0 + input.param1 * 20.0);
        color = vec3f(1.0, 0.9, 0.4) * twinkle;
        alpha = star * life;
      }

      // Coal ember - glowing red/orange
      case 5: {
        let ember = exp(-dist * 5.0);
        let glow = 0.6 + 0.4 * sin(time * 8.0 + input.param1 * 15.0);
        color = mix(vec3f(0.8, 0.2, 0.0), vec3f(1.0, 0.5, 0.1), glow);
        alpha = ember * life;
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

  fn noise2D(p: vec2f) -> f32 {
    return fract(sin(dot(p, vec2f(12.9898, 78.233))) * 43758.5453);
  }
`;
