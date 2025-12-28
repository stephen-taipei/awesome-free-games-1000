/**
 * WebGPU Shaders - Note Puzzle
 * Music / Concert Hall Theme
 * Game #110
 */

export const BACKGROUND_SHADER = /* wgsl */ `
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
      vec2f(-1.0, -1.0),
      vec2f(1.0, -1.0),
      vec2f(-1.0, 1.0),
      vec2f(-1.0, 1.0),
      vec2f(1.0, -1.0),
      vec2f(1.0, 1.0)
    );

    var output: VertexOutput;
    output.position = vec4f(positions[vertexIndex], 0.0, 1.0);
    output.uv = positions[vertexIndex] * 0.5 + 0.5;
    return output;
  }

  fn hash(p: vec2f) -> f32 {
    return fract(sin(dot(p, vec2f(127.1, 311.7))) * 43758.5453);
  }

  // Musical staff lines
  fn staffLines(uv: vec2f, time: f32) -> f32 {
    var staff = 0.0;
    let staffY = 0.5;
    let lineSpacing = 0.03;

    for (var i = -2; i <= 2; i++) {
      let lineY = staffY + f32(i) * lineSpacing;
      let wobble = sin(uv.x * 20.0 + time + f32(i) * 0.5) * 0.002;
      let line = smoothstep(0.002, 0.001, abs(uv.y - lineY - wobble));
      staff += line * 0.4;
    }
    return staff;
  }

  // Floating musical notes
  fn musicalNote(uv: vec2f, center: vec2f, time: f32) -> f32 {
    let d = uv - center;

    // Note head (ellipse)
    let headSize = vec2f(0.02, 0.015);
    let head = length(d / headSize);
    let headShape = smoothstep(1.0, 0.8, head);

    // Note stem
    let stemX = center.x + 0.015;
    let stemHeight = 0.08;
    let stem = step(abs(d.x - 0.015), 0.003) * step(0.0, d.y) * step(d.y, stemHeight);

    return max(headShape, stem * 0.7);
  }

  // Sound wave visualization
  fn soundWaves(uv: vec2f, time: f32) -> f32 {
    var wave = 0.0;
    for (var i = 0; i < 3; i++) {
      let freq = 10.0 + f32(i) * 5.0;
      let amp = 0.02 / (f32(i) + 1.0);
      let phase = time * (1.5 + f32(i) * 0.3);
      wave += sin(uv.x * freq + phase) * amp;
    }
    let waveY = 0.5 + wave;
    return smoothstep(0.01, 0.005, abs(uv.y - waveY)) * 0.2;
  }

  // Treble clef silhouette
  fn trebleClef(uv: vec2f, center: vec2f) -> f32 {
    let d = (uv - center) * vec2f(1.0, 0.6);

    // Simplified treble clef shape using circles
    let mainCurve = length(d - vec2f(0.0, 0.02)) - 0.04;
    let innerCurve = length(d - vec2f(0.01, -0.01)) - 0.02;
    let bottomCurl = length(d - vec2f(-0.01, -0.06)) - 0.02;

    let shape = min(mainCurve, min(innerCurve, bottomCurl));
    return smoothstep(0.005, 0.002, abs(shape)) * 0.3;
  }

  // Concert hall spotlight
  fn spotlight(uv: vec2f, pos: vec2f, radius: f32, time: f32) -> f32 {
    let d = length(uv - pos);
    let flicker = 0.95 + sin(time * 3.0 + pos.x * 10.0) * 0.05;
    return exp(-d * d / (radius * radius)) * flicker;
  }

  @fragment
  fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
    let uv = input.uv;
    let time = uniforms.time;
    let intensity = uniforms.intensity;

    // Concert hall background gradient
    let bgTop = vec3f(0.1, 0.05, 0.15);     // Deep purple
    let bgBottom = vec3f(0.05, 0.02, 0.08); // Almost black
    var color = mix(bgBottom, bgTop, uv.y);

    // Stage floor reflection
    if (uv.y < 0.2) {
      let reflection = (0.2 - uv.y) / 0.2;
      color += vec3f(0.1, 0.05, 0.15) * reflection * 0.3;
    }

    // Spotlights
    let spot1 = spotlight(uv, vec2f(0.2, 0.9), 0.4, time);
    let spot2 = spotlight(uv, vec2f(0.8, 0.85), 0.35, time * 1.1);
    let spot3 = spotlight(uv, vec2f(0.5, 0.95), 0.45, time * 0.9);

    color += vec3f(0.6, 0.4, 0.8) * spot1 * 0.15;
    color += vec3f(0.4, 0.6, 0.9) * spot2 * 0.12;
    color += vec3f(0.8, 0.5, 0.6) * spot3 * 0.1;

    // Musical staff
    let staff = staffLines(uv, time);
    color += vec3f(0.8, 0.7, 0.9) * staff;

    // Sound waves
    let waves = soundWaves(uv, time);
    color += vec3f(0.5, 0.8, 1.0) * waves * intensity;

    // Floating notes (decorative)
    for (var i = 0; i < 4; i++) {
      let noteX = fract(f32(i) * 0.25 + time * 0.05);
      let noteY = 0.4 + sin(time + f32(i) * 1.5) * 0.15;
      let note = musicalNote(uv, vec2f(noteX, noteY), time);
      let noteColor = vec3f(
        0.7 + sin(f32(i) * 1.2) * 0.3,
        0.5 + sin(f32(i) * 0.8 + 1.0) * 0.3,
        0.9
      );
      color += noteColor * note * 0.5;
    }

    // Treble clef
    let clef = trebleClef(uv, vec2f(0.1, 0.5));
    color += vec3f(0.9, 0.8, 1.0) * clef;

    // Subtle stars/sparkles
    let starField = hash(floor(uv * 50.0));
    if (starField > 0.98) {
      let twinkle = sin(time * 5.0 + starField * 100.0) * 0.5 + 0.5;
      color += vec3f(1.0, 0.95, 0.8) * twinkle * 0.5;
    }

    // Vignette
    let vignette = 1.0 - length(uv - 0.5) * 0.6;
    color *= vignette;

    // Intensity boost
    color *= 0.8 + intensity * 0.2;

    return vec4f(color, 0.4);
  }
`;

export const PARTICLE_SHADER = /* wgsl */ `
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
    r: f32,
    g: f32,
    b: f32,
    extra: f32,
  }

  @group(0) @binding(0) var<uniform> uniforms: Uniforms;
  @group(0) @binding(1) var<storage, read> particles: array<Particle>;

  struct VertexOutput {
    @builtin(position) position: vec4f,
    @location(0) color: vec4f,
    @location(1) uv: vec2f,
    @location(2) particleType: f32,
  }

  @vertex
  fn vertexMain(
    @builtin(vertex_index) vertexIndex: u32,
    @builtin(instance_index) instanceIndex: u32
  ) -> VertexOutput {
    let particle = particles[instanceIndex];

    var corners = array<vec2f, 6>(
      vec2f(-1.0, -1.0),
      vec2f(1.0, -1.0),
      vec2f(-1.0, 1.0),
      vec2f(-1.0, 1.0),
      vec2f(1.0, -1.0),
      vec2f(1.0, 1.0)
    );

    let corner = corners[vertexIndex];
    let lifeRatio = particle.life / particle.maxLife;
    let size = particle.size * lifeRatio;

    let x = (particle.x / uniforms.width) * 2.0 - 1.0;
    let y = 1.0 - (particle.y / uniforms.height) * 2.0;

    var output: VertexOutput;
    output.position = vec4f(
      x + corner.x * size / uniforms.width,
      y + corner.y * size / uniforms.height,
      0.0,
      1.0
    );
    output.color = vec4f(particle.r, particle.g, particle.b, lifeRatio);
    output.uv = corner * 0.5 + 0.5;
    output.particleType = particle.particleType;

    return output;
  }

  @fragment
  fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
    let uv = input.uv;
    let center = vec2f(0.5, 0.5);
    let dist = length(uv - center) * 2.0;
    let particleType = i32(input.particleType);
    let time = uniforms.time;

    var alpha = input.color.a;
    var color = input.color.rgb;

    // Type 0: Note - musical note shape
    if (particleType == 0) {
      // Note head
      let headDist = length((uv - vec2f(0.45, 0.6)) * vec2f(1.0, 1.3));
      let head = smoothstep(0.25, 0.15, headDist);

      // Stem
      let stem = step(abs(uv.x - 0.6), 0.05) * step(0.3, uv.y) * step(uv.y, 0.6);

      alpha *= max(head, stem * 0.8);
    }
    // Type 1: Staff - horizontal line
    else if (particleType == 1) {
      let line = smoothstep(0.1, 0.0, abs(uv.y - 0.5));
      alpha *= line * (1.0 - abs(uv.x - 0.5) * 1.5);
    }
    // Type 2: Sparkle - star twinkle
    else if (particleType == 2) {
      let angle = atan2(uv.y - 0.5, uv.x - 0.5);
      let rays = abs(sin(angle * 4.0 + time * 4.0));
      let core = 1.0 - smoothstep(0.0, 0.2, dist);
      let glow = (1.0 - smoothstep(0.0, 0.5, dist)) * rays;
      alpha *= max(core, glow * 0.6);
      color = vec3f(1.0, 0.95, 0.8);
    }
    // Type 3: Wave - sound wave ring
    else if (particleType == 3) {
      let ring = smoothstep(0.8, 0.6, dist) * smoothstep(0.4, 0.6, dist);
      alpha *= ring;
      color = mix(color, vec3f(0.5, 0.8, 1.0), 0.3);
    }
    // Type 4: Chord - multiple note effect
    else if (particleType == 4) {
      let multi = 0.0;
      for (var i = 0; i < 3; i++) {
        let offset = vec2f(f32(i - 1) * 0.2, 0.0);
        let d = length(uv - center + offset);
        multi += 1.0 - smoothstep(0.0, 0.3, d);
      }
      alpha *= min(multi, 1.0);
    }
    // Type 5: Glow - soft radial glow
    else if (particleType == 5) {
      let glow = exp(-dist * dist * 4.0);
      alpha *= glow;
      let pulse = sin(time * 6.0) * 0.2 + 0.8;
      color *= pulse;
    }
    else {
      alpha *= 1.0 - smoothstep(0.3, 0.5, dist);
    }

    alpha *= uniforms.intensity;
    return vec4f(color, alpha);
  }
`;
