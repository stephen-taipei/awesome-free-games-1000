/**
 * WebGPU Shaders - Lego Build
 * Colorful Toys / Construction / Playful Blocks Theme
 * Game #142
 */

export const BACKGROUND_SHADER = /* wgsl */ `
  struct Uniforms {
    time: f32,
    aspect: f32,
    intensity: f32,
    eventType: f32,
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

  fn hash2(p: vec2f) -> vec2f {
    let k = vec2f(0.3183099, 0.3678794);
    var q = p * k + k.yx;
    return fract(sin(vec2f(dot(q, vec2f(127.1, 311.7)), dot(q, vec2f(269.5, 183.3)))) * 43758.5453);
  }

  fn noise2D(p: vec2f) -> f32 {
    let i = floor(p);
    let f = fract(p);
    let u = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(dot(hash2(i + vec2f(0.0, 0.0)) * 2.0 - 1.0, f - vec2f(0.0, 0.0)),
          dot(hash2(i + vec2f(1.0, 0.0)) * 2.0 - 1.0, f - vec2f(1.0, 0.0)), u.x),
      mix(dot(hash2(i + vec2f(0.0, 1.0)) * 2.0 - 1.0, f - vec2f(0.0, 1.0)),
          dot(hash2(i + vec2f(1.0, 1.0)) * 2.0 - 1.0, f - vec2f(1.0, 1.0)), u.x),
      u.y
    );
  }

  fn studPattern(p: vec2f, size: f32) -> f32 {
    let grid = fract(p / size) - 0.5;
    let dist = length(grid) * 2.0;
    return smoothstep(0.6, 0.4, dist);
  }

  fn plasticShine(p: vec2f, time: f32) -> f32 {
    let angle = atan2(p.y - 0.5, p.x - 0.5);
    let sweep = sin(angle * 2.0 + time * 0.5) * 0.5 + 0.5;
    let dist = length(p - vec2f(0.3, 0.7));
    return sweep * smoothstep(0.8, 0.0, dist) * 0.15;
  }

  fn gridLines(p: vec2f, spacing: f32, thickness: f32) -> f32 {
    let grid = abs(fract(p / spacing - 0.5) - 0.5) * spacing;
    let lines = smoothstep(thickness, 0.0, min(grid.x, grid.y));
    return lines * 0.1;
  }

  fn blockPattern(p: vec2f, time: f32) -> vec3f {
    var color = vec3f(0.08, 0.12, 0.25);

    // Subtle baseplate grid
    let grid = gridLines(p * 20.0, 1.0, 0.05);
    color += vec3f(0.15, 0.40, 0.60) * grid;

    // Floating studs in background
    let studP = p * 15.0 + vec2f(time * 0.1, time * 0.05);
    let stud = studPattern(studP, 1.0) * 0.08;
    color += vec3f(0.2, 0.4, 0.6) * stud;

    // Plastic shine sweep
    let shine = plasticShine(p, time);
    color += vec3f(1.0, 1.0, 1.0) * shine;

    // Subtle color gradient
    let gradientNoise = noise2D(p * 3.0 + time * 0.1) * 0.5 + 0.5;
    color += vec3f(0.1, 0.05, 0.15) * gradientNoise * 0.1;

    return color;
  }

  @fragment
  fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
    var uv = input.uv;
    uv.x *= uniforms.aspect;

    let time = uniforms.time;
    var color = blockPattern(uv, time);

    // Event effects
    if (uniforms.eventType > 0.5 && uniforms.eventType < 1.5) {
      // Place event - ripple from center
      let dist = length(uv - vec2f(0.5 * uniforms.aspect, 0.5));
      let ripple = sin(dist * 20.0 - time * 8.0) * exp(-dist * 3.0);
      color += vec3f(0.3, 0.8, 0.4) * ripple * uniforms.intensity * 0.3;
    } else if (uniforms.eventType > 1.5 && uniforms.eventType < 2.5) {
      // Rotate event - spin effect
      let center = vec2f(0.5 * uniforms.aspect, 0.5);
      let toCenter = uv - center;
      let angle = atan2(toCenter.y, toCenter.x);
      let spin = sin(angle * 6.0 + time * 10.0) * 0.5 + 0.5;
      color += vec3f(0.9, 0.8, 0.2) * spin * uniforms.intensity * 0.2;
    } else if (uniforms.eventType > 2.5 && uniforms.eventType < 3.5) {
      // Level complete - rainbow celebration
      let rainbow = vec3f(
        sin(uv.x * 10.0 + time * 3.0) * 0.5 + 0.5,
        sin(uv.x * 10.0 + time * 3.0 + 2.094) * 0.5 + 0.5,
        sin(uv.x * 10.0 + time * 3.0 + 4.189) * 0.5 + 0.5
      );
      color += rainbow * uniforms.intensity * 0.25;
    } else if (uniforms.eventType > 3.5) {
      // Victory - golden celebration
      let wave = sin(uv.x * 15.0 - time * 4.0) * sin(uv.y * 15.0 - time * 3.0);
      color += vec3f(1.0, 0.85, 0.3) * wave * uniforms.intensity * 0.3;
    }

    // Vignette
    let vignetteCenter = vec2f(0.5 * uniforms.aspect, 0.5);
    let vignette = 1.0 - smoothstep(0.3, 0.9, length(uv - vignetteCenter) * 0.8);
    color *= vignette * 0.3 + 0.7;

    return vec4f(color, 1.0);
  }
`;

export const PARTICLE_SHADER = /* wgsl */ `
  struct Uniforms {
    time: f32,
    aspect: f32,
    intensity: f32,
    eventType: f32,
  }

  struct Particle {
    position: vec2f,
    velocity: vec2f,
    color: vec4f,
    size: f32,
    life: f32,
    maxLife: f32,
    particleType: f32,
  }

  @group(0) @binding(0) var<uniform> uniforms: Uniforms;
  @group(0) @binding(1) var<storage, read> particles: array<Particle>;

  struct VertexOutput {
    @builtin(position) position: vec4f,
    @location(0) color: vec4f,
    @location(1) uv: vec2f,
    @location(2) particleType: f32,
    @location(3) life: f32,
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
    let lifeRatio = particle.life / particle.maxLife;

    // Size animation based on particle type
    var size = particle.size;
    let pType = particle.particleType;

    if (pType < 0.5) {
      // blockGlow - pulse
      size *= 1.0 + sin(uniforms.time * 4.0) * 0.2;
    } else if (pType < 1.5) {
      // placeSpark - burst then fade
      size *= smoothstep(0.0, 0.2, lifeRatio) * smoothstep(1.0, 0.3, lifeRatio);
    } else if (pType < 2.5) {
      // rotatePop - pop out then shrink
      let pop = 1.0 - pow(1.0 - lifeRatio, 3.0);
      size *= pop * (0.5 + lifeRatio * 0.5);
    } else if (pType < 3.5) {
      // studShine - sparkle
      size *= (sin(uniforms.time * 8.0 + particle.position.x * 10.0) * 0.5 + 0.5) * lifeRatio;
    } else if (pType < 4.5) {
      // plasticDust - float down gently
      size *= lifeRatio * 0.8 + 0.2;
    } else {
      // snapFlash - quick flash
      size *= smoothstep(0.0, 0.3, lifeRatio) * smoothstep(1.0, 0.5, lifeRatio) * 1.5;
    }

    var pos = particle.position + corner * size * 0.02;
    pos.x = pos.x * 2.0 - 1.0;
    pos.y = pos.y * 2.0 - 1.0;
    pos.x /= uniforms.aspect;

    var output: VertexOutput;
    output.position = vec4f(pos, 0.0, 1.0);
    output.color = particle.color;
    output.uv = corner * 0.5 + 0.5;
    output.particleType = particle.particleType;
    output.life = lifeRatio;
    return output;
  }

  @fragment
  fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
    let uv = input.uv;
    let center = vec2f(0.5, 0.5);
    let dist = length(uv - center) * 2.0;
    let pType = input.particleType;

    var alpha: f32;
    var color = input.color.rgb;

    if (pType < 0.5) {
      // blockGlow - soft rounded rectangle glow
      let boxDist = max(abs(uv.x - 0.5), abs(uv.y - 0.5)) * 2.0;
      alpha = smoothstep(1.0, 0.5, boxDist) * input.life * 0.6;
    } else if (pType < 1.5) {
      // placeSpark - star shape
      let angle = atan2(uv.y - 0.5, uv.x - 0.5);
      let star = abs(sin(angle * 4.0));
      let starDist = dist * (0.7 + star * 0.3);
      alpha = smoothstep(1.0, 0.0, starDist) * input.life;
      color = mix(color, vec3f(1.0, 1.0, 1.0), 0.3);
    } else if (pType < 2.5) {
      // rotatePop - spinning ring
      let ring = abs(dist - 0.6);
      alpha = smoothstep(0.3, 0.0, ring) * input.life;
      let spin = sin(atan2(uv.y - 0.5, uv.x - 0.5) * 3.0 + uniforms.time * 10.0) * 0.5 + 0.5;
      alpha *= spin;
    } else if (pType < 3.5) {
      // studShine - circular stud shape
      let studDist = dist;
      let highlight = smoothstep(0.8, 0.2, studDist);
      let edge = smoothstep(0.5, 0.6, studDist) * smoothstep(0.8, 0.7, studDist);
      alpha = (highlight * 0.6 + edge * 0.8) * input.life;
      color = mix(color, vec3f(1.0), 0.5);
    } else if (pType < 4.5) {
      // plasticDust - small colored dots
      alpha = smoothstep(1.0, 0.2, dist) * input.life * 0.7;
    } else {
      // snapFlash - bright flash
      alpha = smoothstep(1.0, 0.0, dist) * input.life;
      color = mix(color, vec3f(1.0, 1.0, 0.8), 0.6);
    }

    return vec4f(color, alpha * input.color.a);
  }
`;
