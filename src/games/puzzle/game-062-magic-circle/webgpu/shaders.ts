/**
 * WebGPU Shaders - Magic Circle
 * Arcane Mystical / Ancient Magic Theme
 * Game #062
 */

export const BACKGROUND_SHADER = /* wgsl */`
  struct Uniforms {
    time: f32,
    width: f32,
    height: f32,
    padding: f32,
  }

  @group(0) @binding(0) var<uniform> uniforms: Uniforms;

  struct VertexOutput {
    @builtin(position) position: vec4f,
    @location(0) uv: vec2f,
  }

  @vertex
  fn vertexMain(@builtin(vertex_index) i: u32) -> VertexOutput {
    var pos = array<vec2f, 4>(
      vec2f(-1, -1), vec2f(1, -1), vec2f(-1, 1), vec2f(1, 1)
    );
    var out: VertexOutput;
    out.position = vec4f(pos[i], 0, 1);
    out.uv = pos[i] * 0.5 + 0.5;
    return out;
  }

  // Noise functions
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

  fn fbm(p: vec2f) -> f32 {
    var value = 0.0;
    var amplitude = 0.5;
    var frequency = 1.0;
    var pos = p;
    for (var i = 0; i < 5; i++) {
      value += amplitude * noise(pos * frequency);
      amplitude *= 0.5;
      frequency *= 2.0;
    }
    return value;
  }

  // Magic swirl pattern
  fn magicSwirl(uv: vec2f, time: f32) -> f32 {
    let center = vec2f(0.5, 0.5);
    let d = uv - center;
    let dist = length(d);
    let angle = atan2(d.y, d.x);

    let swirl = sin(angle * 5.0 + dist * 8.0 - time * 1.5) * 0.5 + 0.5;
    let fade = smoothstep(0.5, 0.0, dist);

    return swirl * fade;
  }

  // Arcane rings
  fn arcaneRings(uv: vec2f, time: f32) -> f32 {
    let center = vec2f(0.5, 0.5);
    let dist = length(uv - center);

    var rings = 0.0;
    for (var i = 0; i < 4; i++) {
      let r = 0.1 + f32(i) * 0.1;
      let thickness = 0.008;
      let pulse = sin(time * 2.0 + f32(i) * 1.5) * 0.003;
      let ringDist = abs(dist - r - pulse);
      rings += smoothstep(thickness, 0.0, ringDist) * 0.4;
    }

    return rings;
  }

  // Mystical rune patterns
  fn runePattern(uv: vec2f, time: f32) -> f32 {
    let scaled = uv * 8.0;
    let cell = floor(scaled);
    let local = fract(scaled);

    let rand = hash(cell);
    if (rand < 0.15) {
      let center = vec2f(0.5, 0.5);
      let d = local - center;
      let dist = length(d);
      let angle = atan2(d.y, d.x);

      // Create rune-like cross patterns
      let cross = max(
        smoothstep(0.1, 0.0, abs(d.x)),
        smoothstep(0.1, 0.0, abs(d.y))
      ) * smoothstep(0.4, 0.2, dist);

      let glow = sin(time * 2.0 + rand * 6.28) * 0.5 + 0.5;
      return cross * glow * 0.3;
    }

    return 0.0;
  }

  // Magical energy particles
  fn magicParticles(uv: vec2f, time: f32) -> f32 {
    var particles = 0.0;
    let center = vec2f(0.5, 0.5);

    for (var i = 0; i < 30; i++) {
      let fi = f32(i);
      let angle = fi * 0.618 * 6.28 + time * 0.3;
      let radius = 0.15 + fi * 0.01 + sin(time + fi) * 0.05;

      let pos = center + vec2f(cos(angle), sin(angle)) * radius;
      let d = length(uv - pos);
      let size = 0.008 + sin(time * 3.0 + fi) * 0.003;

      particles += smoothstep(size, 0.0, d) * 0.6;
    }

    return particles;
  }

  // Portal vortex effect
  fn portalVortex(uv: vec2f, time: f32) -> vec3f {
    let center = vec2f(0.5, 0.5);
    let d = uv - center;
    let dist = length(d);
    let angle = atan2(d.y, d.x);

    // Spiral distortion
    let spiral = angle + dist * 5.0 - time * 0.8;
    let vortex = sin(spiral * 3.0) * 0.5 + 0.5;

    // Color gradient
    let purple = vec3f(0.61, 0.35, 0.71);
    let blue = vec3f(0.20, 0.60, 0.86);
    let gold = vec3f(0.95, 0.77, 0.06);

    var color = mix(purple, blue, vortex);
    color = mix(color, gold, smoothstep(0.4, 0.0, dist) * 0.3);

    let intensity = smoothstep(0.5, 0.1, dist) * vortex * 0.3;
    return color * intensity;
  }

  // Mystical fog
  fn mysticalFog(uv: vec2f, time: f32) -> f32 {
    var fog = 0.0;
    fog += fbm(uv * 3.0 + time * 0.1) * 0.4;
    fog += fbm(uv * 5.0 - time * 0.15) * 0.3;
    fog += fbm(uv * 8.0 + vec2f(time * 0.08, -time * 0.05)) * 0.2;
    return fog * 0.4;
  }

  @fragment
  fn fragmentMain(in: VertexOutput) -> @location(0) vec4f {
    let uv = in.uv;
    let time = uniforms.time;

    // Base mystical dark background
    let darkPurple = vec3f(0.10, 0.04, 0.18);
    let deepPurple = vec3f(0.18, 0.11, 0.31);
    var color = mix(darkPurple, deepPurple, uv.y);

    // Mystical fog layer
    let fog = mysticalFog(uv, time);
    color = mix(color, vec3f(0.3, 0.2, 0.5), fog * 0.3);

    // Portal vortex at center
    let vortex = portalVortex(uv, time);
    color += vortex;

    // Magic swirl energy
    let swirl = magicSwirl(uv, time);
    let swirlColor = vec3f(0.61, 0.35, 0.71) * swirl * 0.15;
    color += swirlColor;

    // Arcane ring patterns
    let rings = arcaneRings(uv, time);
    let ringColor = vec3f(0.20, 0.60, 0.86) * rings;
    color += ringColor;

    // Floating rune patterns
    let runes = runePattern(uv, time);
    let runeColor = vec3f(0.95, 0.77, 0.06) * runes;
    color += runeColor;

    // Magic particles
    let particles = magicParticles(uv, time);
    let particleColor = vec3f(0.9, 0.85, 1.0) * particles;
    color += particleColor;

    // Center gem glow
    let center = vec2f(0.5, 0.5);
    let gemDist = length(uv - center);
    let gemGlow = smoothstep(0.15, 0.0, gemDist) * (sin(time * 2.0) * 0.2 + 0.8);
    color += vec3f(0.61, 0.35, 0.71) * gemGlow * 0.4;

    // Outer vignette
    let vignette = 1.0 - smoothstep(0.3, 0.8, gemDist);
    color *= 0.6 + vignette * 0.4;

    // Subtle color pulse
    let pulse = sin(time * 1.5) * 0.05 + 1.0;
    color *= pulse;

    return vec4f(color, 1.0);
  }
`;

export const PARTICLE_SHADER = /* wgsl */`
  struct Uniforms {
    time: f32,
    width: f32,
    height: f32,
    padding: f32,
  }

  @group(0) @binding(0) var<uniform> uniforms: Uniforms;

  struct VertexOutput {
    @builtin(position) position: vec4f,
    @location(0) localPos: vec2f,
    @location(1) color: vec4f,
    @location(2) particleType: f32,
    @location(3) life: f32,
  }

  struct VertexInput {
    @location(0) pos: vec2f,
    @location(1) size: f32,
    @location(2) color: vec4f,
    @location(3) rotation: f32,
    @location(4) particleType: f32,
    @location(5) life: f32,
  }

  @vertex
  fn vertexMain(
    @builtin(vertex_index) vi: u32,
    input: VertexInput,
  ) -> VertexOutput {
    var corner = array<vec2f, 4>(
      vec2f(-1, -1), vec2f(1, -1), vec2f(-1, 1), vec2f(1, 1)
    );

    let c = corner[vi];
    let cosR = cos(input.rotation);
    let sinR = sin(input.rotation);
    let rotated = vec2f(
      c.x * cosR - c.y * sinR,
      c.x * sinR + c.y * cosR
    );

    let aspect = uniforms.width / uniforms.height;
    let size = input.size / uniforms.height;

    var out: VertexOutput;
    out.position = vec4f(
      input.pos.x + rotated.x * size,
      input.pos.y + rotated.y * size * aspect,
      0, 1
    );
    out.localPos = c;
    out.color = input.color;
    out.particleType = input.particleType;
    out.life = input.life;

    return out;
  }

  @fragment
  fn fragmentMain(in: VertexOutput) -> @location(0) vec4f {
    let d = length(in.localPos);
    let pType = i32(in.particleType);
    var alpha = in.color.a;
    var color = in.color.rgb;
    let time = uniforms.time;

    // Type 0: Rune - mystical symbol glow
    if (pType == 0) {
      let cross = max(
        smoothstep(0.3, 0.0, abs(in.localPos.x)),
        smoothstep(0.3, 0.0, abs(in.localPos.y))
      );
      let ring = smoothstep(0.1, 0.0, abs(d - 0.6));
      let shape = max(cross, ring) * smoothstep(1.0, 0.7, d);
      let glow = smoothstep(1.0, 0.0, d) * 0.5;
      alpha *= (shape + glow) * in.life;
    }
    // Type 1: Spark - magical energy spark
    else if (pType == 1) {
      let streak = smoothstep(0.8, 0.0, abs(in.localPos.y)) *
                   smoothstep(1.0, 0.3, abs(in.localPos.x));
      let core = smoothstep(0.5, 0.0, d);
      alpha *= (streak + core) * in.life;
      color = mix(color, vec3f(1.0, 1.0, 1.0), core * 0.6);
    }
    // Type 2: Glow - soft ethereal glow
    else if (pType == 2) {
      let glow = smoothstep(1.0, 0.0, d);
      let pulse = sin(time * 5.0 + in.life * 10.0) * 0.2 + 0.8;
      alpha *= glow * glow * pulse * in.life;
    }
    // Type 3: Arcane - mystical energy pattern
    else if (pType == 3) {
      let angle = atan2(in.localPos.y, in.localPos.x);
      let rays = sin(angle * 6.0 + time * 3.0) * 0.5 + 0.5;
      let ring = smoothstep(0.15, 0.0, abs(d - 0.5));
      let core = smoothstep(0.4, 0.0, d);
      alpha *= (ring * rays + core) * in.life;
      color = mix(color, vec3f(1.0, 0.95, 0.8), core * 0.4);
    }
    // Type 4: Portal - rippling portal effect
    else if (pType == 4) {
      let rings = sin(d * 15.0 - time * 5.0) * 0.5 + 0.5;
      let fade = smoothstep(1.0, 0.2, d);
      alpha *= rings * fade * in.life;
    }
    // Type 5: Victory - celebration sparkle
    else if (pType == 5) {
      let star = max(
        smoothstep(0.2, 0.0, abs(in.localPos.x)) * smoothstep(0.8, 0.0, abs(in.localPos.y)),
        smoothstep(0.2, 0.0, abs(in.localPos.y)) * smoothstep(0.8, 0.0, abs(in.localPos.x))
      );
      let diag1 = smoothstep(0.15, 0.0, abs(in.localPos.x - in.localPos.y)) *
                  smoothstep(1.2, 0.0, d);
      let diag2 = smoothstep(0.15, 0.0, abs(in.localPos.x + in.localPos.y)) *
                  smoothstep(1.2, 0.0, d);
      let sparkle = max(star, max(diag1, diag2));
      let glow = smoothstep(1.0, 0.0, d) * 0.4;
      alpha *= (sparkle + glow) * in.life;
      color = mix(color, vec3f(1.0), sparkle * 0.5);
    }
    else {
      alpha *= smoothstep(1.0, 0.0, d) * in.life;
    }

    return vec4f(color, alpha);
  }
`;
