/**
 * WebGPU Shaders - Stained Glass
 * Cathedral / Light Through Glass Theme
 * Game #143
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

  fn lightRays(p: vec2f, time: f32) -> f32 {
    let angle = atan2(p.y - 0.2, p.x - 0.5);
    let rays = sin(angle * 8.0 + time * 0.3) * 0.5 + 0.5;
    let dist = length(p - vec2f(0.5, 0.2));
    let falloff = smoothstep(1.0, 0.0, dist);
    return rays * falloff * 0.15;
  }

  fn dustMotes(p: vec2f, time: f32) -> f32 {
    var dust = 0.0;
    for (var i = 0; i < 5; i++) {
      let fi = f32(i);
      let offset = vec2f(
        sin(time * 0.2 + fi * 1.7) * 0.3,
        cos(time * 0.15 + fi * 2.1) * 0.2 - time * 0.02
      );
      let pos = fract(p * (3.0 + fi) + offset);
      let d = length(pos - 0.5) * 2.0;
      dust += smoothstep(0.1, 0.0, d) * 0.1;
    }
    return dust;
  }

  fn glassPattern(p: vec2f, time: f32) -> vec3f {
    // Deep cathedral background
    var color = vec3f(0.08, 0.06, 0.14);

    // Subtle stained glass color zones
    let zone1 = smoothstep(0.6, 0.3, length(p - vec2f(0.3, 0.4)));
    let zone2 = smoothstep(0.5, 0.2, length(p - vec2f(0.7, 0.6)));
    let zone3 = smoothstep(0.4, 0.1, length(p - vec2f(0.5, 0.3)));

    color += vec3f(0.15, 0.05, 0.20) * zone1 * 0.3;
    color += vec3f(0.05, 0.10, 0.25) * zone2 * 0.3;
    color += vec3f(0.20, 0.15, 0.05) * zone3 * 0.2;

    // Light rays from top
    let rays = lightRays(p, time);
    color += vec3f(1.0, 0.98, 0.90) * rays;

    // Floating dust motes
    let dust = dustMotes(p, time);
    color += vec3f(1.0, 0.95, 0.80) * dust;

    // Lead frame grid hints
    let grid = abs(sin(p.x * 20.0)) * abs(sin(p.y * 20.0));
    color += vec3f(0.15, 0.18, 0.22) * smoothstep(0.98, 1.0, grid) * 0.1;

    return color;
  }

  @fragment
  fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
    var uv = input.uv;
    uv.x *= uniforms.aspect;

    let time = uniforms.time;
    var color = glassPattern(uv, time);

    // Event effects
    if (uniforms.eventType > 0.5 && uniforms.eventType < 1.5) {
      // Fill event - color spreading
      let dist = length(uv - vec2f(0.5 * uniforms.aspect, 0.5));
      let wave = sin(dist * 15.0 - time * 5.0) * exp(-dist * 2.0);
      color += vec3f(0.6, 0.35, 0.71) * wave * uniforms.intensity * 0.4;
    } else if (uniforms.eventType > 1.5 && uniforms.eventType < 2.5) {
      // Complete region - prism effect
      let prism = sin(uv.x * 30.0 + time * 2.0) * 0.5 + 0.5;
      let rainbow = vec3f(
        sin(prism * 6.28) * 0.5 + 0.5,
        sin(prism * 6.28 + 2.09) * 0.5 + 0.5,
        sin(prism * 6.28 + 4.19) * 0.5 + 0.5
      );
      color += rainbow * uniforms.intensity * 0.2;
    } else if (uniforms.eventType > 2.5 && uniforms.eventType < 3.5) {
      // Level complete - radiant light
      let center = vec2f(0.5 * uniforms.aspect, 0.5);
      let dist = length(uv - center);
      let glow = exp(-dist * 2.0) * (sin(time * 5.0) * 0.3 + 0.7);
      color += vec3f(1.0, 0.95, 0.85) * glow * uniforms.intensity * 0.4;
    } else if (uniforms.eventType > 3.5) {
      // Victory - cathedral glory
      let rays = sin(atan2(uv.y - 0.5, uv.x - 0.5 * uniforms.aspect) * 12.0 + time * 2.0);
      let glory = rays * 0.5 + 0.5;
      color += vec3f(1.0, 0.9, 0.7) * glory * uniforms.intensity * 0.3;
    }

    // Vignette for depth
    let vignetteCenter = vec2f(0.5 * uniforms.aspect, 0.5);
    let vignette = 1.0 - smoothstep(0.3, 1.0, length(uv - vignetteCenter) * 0.7);
    color *= vignette * 0.4 + 0.6;

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

    var size = particle.size;
    let pType = particle.particleType;

    if (pType < 0.5) {
      // glassShimmer - gentle pulse
      size *= 0.8 + sin(uniforms.time * 3.0 + particle.position.x * 20.0) * 0.2;
    } else if (pType < 1.5) {
      // colorFill - expand then fade
      size *= smoothstep(0.0, 0.3, lifeRatio) * (1.0 - lifeRatio * 0.5);
    } else if (pType < 2.5) {
      // lightRay - elongate vertically
      size *= lifeRatio;
    } else if (pType < 3.5) {
      // dustMote - float gently
      size *= 0.6 + lifeRatio * 0.4;
    } else if (pType < 4.5) {
      // prismSparkle - twinkle
      let twinkle = sin(uniforms.time * 10.0 + particle.position.y * 30.0) * 0.5 + 0.5;
      size *= twinkle * lifeRatio;
    } else {
      // glowPulse - radiant pulse
      size *= (sin(uniforms.time * 4.0) * 0.3 + 0.7) * lifeRatio;
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
      // glassShimmer - diamond shape
      let diamond = abs(uv.x - 0.5) + abs(uv.y - 0.5);
      alpha = smoothstep(0.7, 0.3, diamond) * input.life * 0.5;
      color = mix(color, vec3f(1.0), 0.3);
    } else if (pType < 1.5) {
      // colorFill - soft circle with color
      alpha = smoothstep(1.0, 0.3, dist) * input.life * 0.7;
    } else if (pType < 2.5) {
      // lightRay - vertical beam
      let beamX = smoothstep(0.3, 0.0, abs(uv.x - 0.5));
      let beamY = smoothstep(1.0, 0.0, abs(uv.y - 0.5));
      alpha = beamX * beamY * input.life * 0.4;
      color = vec3f(1.0, 0.98, 0.90);
    } else if (pType < 3.5) {
      // dustMote - tiny soft dot
      alpha = smoothstep(1.0, 0.0, dist) * input.life * 0.5;
      color = vec3f(1.0, 0.95, 0.80);
    } else if (pType < 4.5) {
      // prismSparkle - star with rainbow
      let angle = atan2(uv.y - 0.5, uv.x - 0.5);
      let star = abs(sin(angle * 3.0));
      let starDist = dist * (0.6 + star * 0.4);
      alpha = smoothstep(1.0, 0.0, starDist) * input.life;
      // Rainbow tint
      let rainbow = (angle + 3.14159) / 6.28318;
      color = vec3f(
        sin(rainbow * 6.28) * 0.5 + 0.5,
        sin(rainbow * 6.28 + 2.09) * 0.5 + 0.5,
        sin(rainbow * 6.28 + 4.19) * 0.5 + 0.5
      );
    } else {
      // glowPulse - soft radial glow
      alpha = smoothstep(1.0, 0.0, dist) * input.life * 0.6;
      color = mix(color, vec3f(1.0, 0.95, 0.85), 0.4);
    }

    return vec4f(color, alpha * input.color.a);
  }
`;
