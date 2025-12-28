/**
 * WebGPU Shaders - Constellation
 * Celestial Night Sky / Observatory Astronomy Theme
 * Game #059
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

  fn fbm(p: vec2f) -> f32 {
    var value = 0.0;
    var amplitude = 0.5;
    var freq = 1.0;
    for (var i = 0; i < 5; i++) {
      value += amplitude * noise(p * freq);
      freq *= 2.0;
      amplitude *= 0.5;
    }
    return value;
  }

  fn starField(uv: vec2f, density: f32, time: f32) -> f32 {
    let grid = floor(uv * density);
    let gridUV = fract(uv * density) - 0.5;

    let rand = hash(grid);
    if rand < 0.85 {
      return 0.0;
    }

    let starPos = vec2f(hash(grid + 0.1) - 0.5, hash(grid + 0.2) - 0.5) * 0.8;
    let dist = length(gridUV - starPos);
    let size = 0.02 + hash(grid + 0.3) * 0.03;

    let twinkle = sin(time * (2.0 + rand * 3.0) + rand * 6.28) * 0.3 + 0.7;
    let star = smoothstep(size, 0.0, dist) * twinkle;

    return star * (0.5 + rand * 0.5);
  }

  fn nebula(uv: vec2f, time: f32, color: vec3f) -> vec3f {
    var p = uv * 3.0;
    p += vec2f(time * 0.02, time * 0.015);

    let n = fbm(p) * fbm(p + 5.0);
    let intensity = smoothstep(0.1, 0.5, n) * 0.3;

    return color * intensity;
  }

  fn milkyWay(uv: vec2f, time: f32) -> f32 {
    // Diagonal band across the sky
    let angle = 0.3;
    let rotated = vec2f(
      uv.x * cos(angle) - uv.y * sin(angle),
      uv.x * sin(angle) + uv.y * cos(angle)
    );

    let band = smoothstep(0.3, 0.5, 1.0 - abs(rotated.y - 0.5) * 2.0);
    let noise1 = fbm(rotated * 5.0 + time * 0.01);
    let noise2 = fbm(rotated * 10.0 - time * 0.02) * 0.5;

    return band * (noise1 + noise2) * 0.4;
  }

  fn shootingStar(uv: vec2f, time: f32, seed: f32) -> f32 {
    let period = 5.0 + seed * 3.0;
    let t = fract(time / period + seed);

    if t > 0.2 {
      return 0.0;
    }

    let startX = 0.2 + hash(vec2f(seed, 0.1)) * 0.6;
    let startY = 0.7 + hash(vec2f(seed, 0.2)) * 0.2;
    let angle = 0.7 + hash(vec2f(seed, 0.3)) * 0.3;

    let progress = t / 0.2;
    let headX = startX + cos(angle) * progress * 0.4;
    let headY = startY - sin(angle) * progress * 0.2;

    let toHead = uv - vec2f(headX, headY);
    let alongTrail = dot(toHead, vec2f(-cos(angle), sin(angle)));
    let perpTrail = abs(dot(toHead, vec2f(sin(angle), cos(angle))));

    if alongTrail < 0.0 || alongTrail > 0.15 {
      return 0.0;
    }

    let trailWidth = 0.003 * (1.0 - alongTrail / 0.15);
    let trail = smoothstep(trailWidth, 0.0, perpTrail) * (1.0 - alongTrail / 0.15);

    return trail;
  }

  @fragment
  fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
    let uv = input.uv;
    let time = uniforms.time;

    // Deep space gradient
    let spaceBottom = vec3f(0.02, 0.02, 0.06);
    let spaceTop = vec3f(0.05, 0.03, 0.12);
    var color = mix(spaceBottom, spaceTop, uv.y);

    // Milky Way band
    let milky = milkyWay(uv, time);
    color += vec3f(0.6, 0.65, 0.8) * milky;

    // Nebula clouds
    let nebula1 = nebula(uv + vec2f(0.3, 0.2), time, vec3f(0.5, 0.2, 0.6));
    let nebula2 = nebula(uv - vec2f(0.2, 0.1), time * 0.8, vec3f(0.2, 0.4, 0.6));
    color += nebula1 + nebula2;

    // Star layers (parallax effect)
    let stars1 = starField(uv, 30.0, time);
    let stars2 = starField(uv * 1.2 + 0.5, 50.0, time * 1.1);
    let stars3 = starField(uv * 0.8 + 0.3, 20.0, time * 0.9);

    color += vec3f(1.0, 1.0, 0.95) * stars1;
    color += vec3f(0.9, 0.95, 1.0) * stars2 * 0.6;
    color += vec3f(1.0, 0.9, 0.8) * stars3 * 0.4;

    // Shooting stars
    for (var i = 0; i < 3; i++) {
      let shoot = shootingStar(uv, time, f32(i) * 1.7);
      color += vec3f(1.0, 1.0, 0.9) * shoot;
    }

    // Subtle atmospheric glow at horizon
    let horizon = smoothstep(0.0, 0.2, uv.y) * smoothstep(0.3, 0.1, uv.y);
    color += vec3f(0.1, 0.15, 0.25) * horizon;

    // Vignette for observatory dome feel
    let center = length(uv - 0.5) * 1.5;
    let vignette = 1.0 - smoothstep(0.5, 1.2, center) * 0.5;
    color *= vignette;

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

    // 0: star - twinkling star
    if pType == 0 {
      let rays = max(
        1.0 - abs(input.localPos.x) * 2.5,
        1.0 - abs(input.localPos.y) * 2.5
      );
      let core = smoothstep(0.4, 0.0, dist);
      let glow = smoothstep(1.0, 0.3, dist) * 0.5;
      let twinkle = sin(time * 5.0 + input.life * 10.0) * 0.2 + 0.8;
      color.a *= (core + rays * 0.5 + glow) * twinkle;
    }
    // 1: spark - connection spark
    else if pType == 1 {
      let spark = 1.0 - dist;
      let flicker = sin(time * 15.0 + input.life * 20.0) * 0.3 + 0.7;
      color.a *= spark * spark * flicker;
    }
    // 2: glow - soft ambient glow
    else if pType == 2 {
      let soft = 1.0 - smoothstep(0.0, 1.0, dist);
      let pulse = sin(time * 2.0) * 0.15 + 0.85;
      color.a *= soft * soft * 0.4 * pulse;
    }
    // 3: nebula - nebula cloud
    else if pType == 3 {
      let cloud = 1.0 - smoothstep(0.0, 1.0, dist);
      let wispy = cloud * (0.7 + sin(dist * 5.0 + time) * 0.3);
      color.a *= wispy * 0.3;
    }
    // 4: shooting - shooting star trail
    else if pType == 4 {
      let trail = smoothstep(1.0, 0.0, abs(input.localPos.y) * 2.0);
      let head = smoothstep(0.5, -0.5, input.localPos.x);
      color.a *= trail * head * (1.0 - dist * 0.5);
    }
    // 5: victory - celebration sparkle
    else if pType == 5 {
      let sparkle = max(
        1.0 - abs(input.localPos.x) * 3.0,
        1.0 - abs(input.localPos.y) * 3.0
      );
      let core = smoothstep(0.5, 0.0, dist);
      color.a *= max(sparkle, core);
    }

    if color.a < 0.01 {
      discard;
    }

    return color;
  }
`;
