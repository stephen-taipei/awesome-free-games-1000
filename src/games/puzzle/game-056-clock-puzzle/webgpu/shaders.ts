/**
 * WebGPU Shaders - Clock Puzzle
 * Elegant Clock Tower / Victorian Timekeeper Theme
 * Game #056
 */

export const BACKGROUND_SHADER = /* wgsl */ `
  struct Uniforms {
    time: f32,
    width: f32,
    height: f32,
    pad: f32,
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
    let p3 = fract(vec3f(p.x, p.y, p.x) * 0.1031);
    let p3b = p3 + dot(p3, p3.yzx + 33.33);
    return fract((p3b.x + p3b.y) * p3b.z);
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

  fn gearPattern(uv: vec2f, center: vec2f, radius: f32, teeth: f32, time: f32, direction: f32) -> f32 {
    let d = length(uv - center);
    let angle = atan2(uv.y - center.y, uv.x - center.x) + time * 0.5 * direction;
    let tooth = sin(angle * teeth) * 0.5 + 0.5;
    let ring = smoothstep(radius + 0.01, radius, d) * smoothstep(radius - 0.02, radius - 0.01, d);
    let inner = smoothstep(radius * 0.3, radius * 0.25, d);
    return (ring * tooth + inner) * smoothstep(radius + 0.02, radius, d);
  }

  fn pendulum(uv: vec2f, time: f32) -> f32 {
    let swing = sin(time * 2.0) * 0.15;
    let pendulumCenter = vec2f(0.5 + swing, 0.85);
    let d = length(uv - pendulumCenter);
    let bob = smoothstep(0.03, 0.02, d);

    // Rod
    let rodStart = vec2f(0.5, 0.5);
    let rodEnd = pendulumCenter;
    let rod = uv - rodStart;
    let rodDir = normalize(rodEnd - rodStart);
    let proj = dot(rod, rodDir);
    let perpDist = length(rod - rodDir * proj);
    let onRod = step(0.0, proj) * step(proj, length(rodEnd - rodStart));
    let rodShape = smoothstep(0.003, 0.001, perpDist) * onRod;

    return max(bob, rodShape) * 0.6;
  }

  fn clockFaceHint(uv: vec2f, time: f32) -> f32 {
    let center = vec2f(0.5, 0.35);
    let d = length(uv - center);

    // Clock circle outline
    let circle = smoothstep(0.18, 0.175, d) * smoothstep(0.16, 0.165, d);

    // Hour marks
    var marks = 0.0;
    for (var i = 0u; i < 12u; i++) {
      let angle = f32(i) * 3.14159 * 2.0 / 12.0 - 3.14159 / 2.0;
      let markPos = center + vec2f(cos(angle), sin(angle)) * 0.15;
      let markDist = length(uv - markPos);
      marks += smoothstep(0.008, 0.004, markDist);
    }

    return (circle + marks * 0.5) * 0.3;
  }

  fn victorianFrame(uv: vec2f) -> f32 {
    // Ornate border pattern
    let borderDist = min(min(uv.x, 1.0 - uv.x), min(uv.y, 1.0 - uv.y));
    let border = smoothstep(0.05, 0.03, borderDist);

    // Decorative corners
    let cornerPattern = sin(uv.x * 50.0) * sin(uv.y * 50.0);
    let corners = smoothstep(0.1, 0.05, length(uv)) +
                  smoothstep(0.1, 0.05, length(uv - vec2f(1.0, 0.0))) +
                  smoothstep(0.1, 0.05, length(uv - vec2f(0.0, 1.0))) +
                  smoothstep(0.1, 0.05, length(uv - vec2f(1.0, 1.0)));

    return border * 0.3 + corners * cornerPattern * 0.1;
  }

  fn dustParticles(uv: vec2f, time: f32) -> f32 {
    var dust = 0.0;
    for (var i = 0u; i < 8u; i++) {
      let seed = f32(i) * 1.234;
      let x = fract(seed * 7.891 + time * 0.02);
      let y = fract(seed * 5.432 + time * 0.015);
      let d = length(uv - vec2f(x, y));
      let flicker = sin(time * 10.0 + seed * 100.0) * 0.5 + 0.5;
      dust += smoothstep(0.01, 0.005, d) * flicker * 0.3;
    }
    return dust;
  }

  @fragment
  fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
    let uv = input.uv;
    let time = uniforms.time;

    // Rich mahogany and brass color palette
    let mahogany = vec3f(0.25, 0.10, 0.05);
    let darkMahogany = vec3f(0.12, 0.05, 0.02);
    let brass = vec3f(0.72, 0.53, 0.25);
    let gold = vec3f(0.85, 0.70, 0.30);
    let cream = vec3f(0.95, 0.92, 0.85);

    // Base wood gradient
    let woodGrain = noise(uv * vec2f(3.0, 30.0)) * 0.3;
    var color = mix(darkMahogany, mahogany, woodGrain + uv.y * 0.3);

    // Victorian ornate frame
    let frame = victorianFrame(uv);
    color = mix(color, brass, frame);

    // Animated gears (background clockwork)
    let gear1 = gearPattern(uv, vec2f(0.15, 0.25), 0.08, 8.0, time, 1.0);
    let gear2 = gearPattern(uv, vec2f(0.85, 0.75), 0.06, 6.0, time, -1.0);
    let gear3 = gearPattern(uv, vec2f(0.1, 0.8), 0.05, 10.0, time, 1.0);
    let gear4 = gearPattern(uv, vec2f(0.9, 0.2), 0.04, 7.0, time, -0.7);
    color = mix(color, brass * 0.7, (gear1 + gear2 + gear3 + gear4) * 0.5);

    // Pendulum shadow
    let pendulumShadow = pendulum(uv, time);
    color = mix(color, gold * 0.4, pendulumShadow);

    // Subtle clock face hint in background
    let clockHint = clockFaceHint(uv, time);
    color = mix(color, cream * 0.5, clockHint);

    // Floating dust particles
    let dust = dustParticles(uv, time);
    color = mix(color, cream, dust);

    // Warm candlelight vignette
    let center = length(uv - 0.5);
    let vignette = 1.0 - smoothstep(0.3, 0.8, center) * 0.5;
    color *= vignette;

    // Warm glow from center
    let glow = exp(-center * 3.0) * 0.1;
    color += gold * glow;

    return vec4f(color, 1.0);
  }
`;

export const PARTICLE_SHADER = /* wgsl */ `
  struct Uniforms {
    time: f32,
    width: f32,
    height: f32,
    pad: f32,
  }

  @group(0) @binding(0) var<uniform> uniforms: Uniforms;

  struct VertexInput {
    @location(0) position: vec2f,
    @location(1) size: f32,
    @location(2) color: vec4f,
    @location(3) rotation: f32,
    @location(4) particleType: f32,
    @location(5) life: f32,
  }

  struct VertexOutput {
    @builtin(position) position: vec4f,
    @location(0) color: vec4f,
    @location(1) localPos: vec2f,
    @location(2) particleType: f32,
    @location(3) life: f32,
  }

  @vertex
  fn vertexMain(
    input: VertexInput,
    @builtin(vertex_index) vertexIndex: u32
  ) -> VertexOutput {
    var corners = array<vec2f, 4>(
      vec2f(-1.0, -1.0),
      vec2f(1.0, -1.0),
      vec2f(-1.0, 1.0),
      vec2f(1.0, 1.0)
    );

    let corner = corners[vertexIndex];
    let cosR = cos(input.rotation);
    let sinR = sin(input.rotation);
    let rotated = vec2f(
      corner.x * cosR - corner.y * sinR,
      corner.x * sinR + corner.y * cosR
    );

    let aspect = uniforms.width / uniforms.height;
    let size = input.size / uniforms.width * 2.0;
    let pos = input.position + rotated * size;

    var output: VertexOutput;
    output.position = vec4f(pos.x, pos.y * aspect, 0.0, 1.0);
    output.color = input.color;
    output.localPos = corner;
    output.particleType = input.particleType;
    output.life = input.life;
    return output;
  }

  @fragment
  fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
    let dist = length(input.localPos);
    var color = input.color;
    let pType = i32(input.particleType);
    let time = uniforms.time;

    // 0: tick - clock hand movement spark
    if pType == 0 {
      let spark = 1.0 - dist;
      let flicker = sin(time * 40.0) * 0.3 + 0.7;
      color.a *= spark * flicker;
    }
    // 1: chime - bell ring wave
    else if pType == 1 {
      let ring = abs(dist - 0.5);
      let wave = smoothstep(0.15, 0.0, ring);
      color.a *= wave * (1.0 - dist);
    }
    // 2: gear - cog particle
    else if pType == 2 {
      let teeth = sin(atan2(input.localPos.y, input.localPos.x) * 6.0) * 0.5 + 0.5;
      let circle = smoothstep(1.0, 0.6, dist);
      color.a *= circle * (0.7 + teeth * 0.3);
    }
    // 3: dust - floating mote
    else if pType == 3 {
      let soft = 1.0 - smoothstep(0.0, 1.0, dist);
      color.a *= soft * 0.6;
    }
    // 4: correct - success glow
    else if pType == 4 {
      let glow = exp(-dist * 2.0);
      let pulse = sin(time * 5.0) * 0.2 + 0.8;
      color.a *= glow * pulse;
    }
    // 5: victory - golden confetti
    else if pType == 5 {
      let rect = max(abs(input.localPos.x), abs(input.localPos.y));
      color.a *= smoothstep(1.0, 0.6, rect);
    }

    if color.a < 0.01 {
      discard;
    }

    return color;
  }
`;
