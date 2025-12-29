/**
 * WebGPU Shaders - Mechanism Puzzle
 * Steampunk / Clockwork / Industrial Brass Theme
 * Game #066
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
  fn vertexMain(@builtin(vertex_index) vertexIndex: u32) -> VertexOutput {
    var positions = array<vec2f, 4>(
      vec2f(-1.0, -1.0),
      vec2f(1.0, -1.0),
      vec2f(-1.0, 1.0),
      vec2f(1.0, 1.0)
    );

    var output: VertexOutput;
    output.position = vec4f(positions[vertexIndex], 0.0, 1.0);
    output.uv = positions[vertexIndex] * 0.5 + 0.5;
    return output;
  }

  // Noise function
  fn hash(p: vec2f) -> f32 {
    let k = vec2f(0.3183099, 0.3678794);
    let pp = p * k + k.yx;
    return fract(16.0 * k.x * fract(pp.x * pp.y * (pp.x + pp.y)));
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

  // Rivet pattern
  fn rivetPattern(uv: vec2f, spacing: f32) -> f32 {
    let gridUV = fract(uv * spacing);
    let dist = length(gridUV - 0.5);
    return smoothstep(0.1, 0.08, dist);
  }

  // Metal plate seams
  fn plateSeam(uv: vec2f, size: f32) -> f32 {
    let gridUV = fract(uv * size);
    let seamX = smoothstep(0.02, 0.0, gridUV.x) + smoothstep(0.98, 1.0, gridUV.x);
    let seamY = smoothstep(0.02, 0.0, gridUV.y) + smoothstep(0.98, 1.0, gridUV.y);
    return max(seamX, seamY);
  }

  // Gear pattern
  fn gearPattern(uv: vec2f, center: vec2f, radius: f32, teeth: f32, time: f32) -> f32 {
    let d = uv - center;
    let dist = length(d);
    let angle = atan2(d.y, d.x) + time * 0.5;

    // Outer ring with teeth
    let toothPattern = sin(angle * teeth) * 0.5 + 0.5;
    let innerRadius = radius * 0.6;
    let outerRadius = radius * (0.9 + toothPattern * 0.15);

    let ring = smoothstep(innerRadius - 0.01, innerRadius, dist) *
               smoothstep(outerRadius + 0.01, outerRadius, dist);

    // Center hole
    let hole = 1.0 - smoothstep(radius * 0.15 - 0.01, radius * 0.15, dist);

    return ring * (1.0 - hole);
  }

  // Pipe pattern
  fn pipePattern(uv: vec2f) -> f32 {
    let pipeWidth = 0.02;
    let pipeSpacing = 0.15;

    // Horizontal pipes
    let hPipe = abs(fract(uv.y * (1.0 / pipeSpacing)) - 0.5);
    let hPipeMask = smoothstep(pipeWidth, pipeWidth - 0.005, hPipe);

    // Vertical pipes
    let vPipe = abs(fract(uv.x * (1.0 / pipeSpacing) + 0.5) - 0.5);
    let vPipeMask = smoothstep(pipeWidth, pipeWidth - 0.005, vPipe);

    return max(hPipeMask * 0.3, vPipeMask * 0.2);
  }

  // Steam/smoke effect
  fn steamEffect(uv: vec2f, time: f32) -> f32 {
    var steam = 0.0;

    // Rising steam columns
    for (var i = 0; i < 3; i++) {
      let offset = f32(i) * 0.3;
      let steamX = 0.2 + offset;
      let steamUV = vec2f(
        (uv.x - steamX) * 5.0,
        uv.y * 2.0 - time * 0.3
      );
      let steamNoise = fbm(steamUV + vec2f(f32(i) * 10.0, 0.0));
      let columnMask = exp(-pow((uv.x - steamX) * 8.0, 2.0));
      let heightMask = smoothstep(0.0, 0.3, uv.y) * smoothstep(1.0, 0.6, uv.y);
      steam += steamNoise * columnMask * heightMask * 0.15;
    }

    return steam;
  }

  @fragment
  fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
    let uv = input.uv;
    let time = uniforms.time;
    let aspect = uniforms.width / uniforms.height;

    // Dark industrial base
    var baseColor = vec3f(0.08, 0.07, 0.06);

    // Add subtle warm gradient (furnace glow from bottom)
    let furnaceGlow = (1.0 - uv.y) * 0.15;
    baseColor += vec3f(0.15, 0.05, 0.0) * furnaceGlow;

    // Metal plate texture
    let plateNoise = fbm(uv * 8.0);
    baseColor += vec3f(0.03) * plateNoise;

    // Plate seams
    let seams = plateSeam(uv, 4.0);
    baseColor -= vec3f(0.03) * seams;

    // Rivets along seams
    let rivets = rivetPattern(uv, 20.0);
    let rivetColor = vec3f(0.4, 0.35, 0.25); // Brass rivets
    baseColor = mix(baseColor, rivetColor, rivets * 0.5);

    // Background gears
    var gearLayer = 0.0;
    gearLayer += gearPattern(uv, vec2f(0.15, 0.8), 0.08, 8.0, time);
    gearLayer += gearPattern(uv, vec2f(0.85, 0.75), 0.1, 10.0, -time * 0.8);
    gearLayer += gearPattern(uv, vec2f(0.1, 0.2), 0.06, 6.0, time * 1.2);
    gearLayer += gearPattern(uv, vec2f(0.9, 0.25), 0.07, 8.0, -time * 0.6);

    let gearColor = vec3f(0.25, 0.22, 0.18);
    baseColor = mix(baseColor, gearColor, gearLayer * 0.6);

    // Pipe network
    let pipes = pipePattern(uv);
    let pipeColor = vec3f(0.35, 0.28, 0.2);
    baseColor = mix(baseColor, pipeColor, pipes);

    // Steam effects
    let steam = steamEffect(uv, time);
    baseColor += vec3f(0.6, 0.55, 0.5) * steam;

    // Warm lamp highlights (brass lanterns)
    let lamp1 = exp(-length(uv - vec2f(0.1, 0.1)) * 8.0);
    let lamp2 = exp(-length(uv - vec2f(0.9, 0.1)) * 8.0);
    let lampFlicker = 0.9 + sin(time * 8.0) * 0.1;
    baseColor += vec3f(0.8, 0.5, 0.2) * (lamp1 + lamp2) * 0.2 * lampFlicker;

    // Vignette
    let vignette = 1.0 - length((uv - 0.5) * 1.5) * 0.5;
    baseColor *= vignette;

    // Industrial amber tint
    baseColor = mix(baseColor, baseColor * vec3f(1.1, 0.95, 0.8), 0.3);

    return vec4f(baseColor, 1.0);
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
    @location(0) uv: vec2f,
    @location(1) color: vec4f,
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
    let cos_r = cos(input.rotation);
    let sin_r = sin(input.rotation);
    let rotated = vec2f(
      corner.x * cos_r - corner.y * sin_r,
      corner.x * sin_r + corner.y * cos_r
    );

    let aspect = uniforms.width / uniforms.height;
    let scale = input.size / uniforms.width;
    let pos = input.position + rotated * scale * vec2f(1.0, aspect);

    var output: VertexOutput;
    output.position = vec4f(pos, 0.0, 1.0);
    output.uv = corner * 0.5 + 0.5;
    output.color = input.color;
    output.particleType = input.particleType;
    output.life = input.life;
    return output;
  }

  // Hash for noise
  fn hash(p: vec2f) -> f32 {
    return fract(sin(dot(p, vec2f(127.1, 311.7))) * 43758.5453);
  }

  @fragment
  fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
    let uv = input.uv;
    let center = uv - 0.5;
    let dist = length(center);
    let particleType = i32(input.particleType);
    var alpha = input.color.a;
    var color = input.color.rgb;

    switch (particleType) {
      // Steam particle (type 0)
      case 0: {
        let noise = hash(uv * 10.0 + uniforms.time);
        let cloud = smoothstep(0.5, 0.2, dist) * (0.7 + noise * 0.3);
        alpha *= cloud * input.life;
        // Fade to lighter color as it rises
        color = mix(color, vec3f(0.8, 0.75, 0.7), 1.0 - input.life);
      }

      // Spark particle (type 1)
      case 1: {
        let glow = exp(-dist * 8.0);
        let trail = exp(-abs(center.y + 0.2) * 10.0) * smoothstep(0.0, 0.5, 0.5 - center.x);
        alpha *= (glow + trail * 0.5) * input.life;
        // Hot spark colors
        let heat = 1.0 - dist * 2.0;
        color = mix(color, vec3f(1.0, 0.9, 0.6), heat * 0.5);
      }

      // Cog particle (type 2)
      case 2: {
        let angle = atan2(center.y, center.x);
        let teeth = 6.0;
        let toothPattern = sin(angle * teeth) * 0.5 + 0.5;
        let innerRing = smoothstep(0.3, 0.35, dist) * smoothstep(0.5, 0.45, dist);
        let outerEdge = dist < (0.4 + toothPattern * 0.1);
        let centerHole = 1.0 - smoothstep(0.1, 0.15, dist);
        let cog = innerRing * select(0.0, 1.0, outerEdge) * (1.0 - centerHole);
        alpha *= cog * input.life;
        // Metallic sheen
        let sheen = 0.8 + sin(angle * 2.0) * 0.2;
        color *= sheen;
      }

      // Brass fleck particle (type 3)
      case 3: {
        let rect = step(abs(center.x), 0.4) * step(abs(center.y), 0.2);
        let shimmer = 0.8 + sin(uniforms.time * 10.0 + uv.x * 20.0) * 0.2;
        alpha *= rect * shimmer * input.life;
        // Brass reflection
        color *= vec3f(1.1, 1.0, 0.9);
      }

      // Pressure burst particle (type 4)
      case 4: {
        let ring = abs(dist - 0.35) < 0.08;
        let burst = exp(-dist * 4.0);
        let combined = select(burst, 1.0, ring);
        alpha *= combined * input.life * input.life;
        // Pressure vapor color
        color = mix(color, vec3f(0.9, 0.85, 0.8), 0.5);
      }

      // Victory particle (type 5)
      case 5: {
        let glow = exp(-dist * 4.0);
        let sparkle = sin(uniforms.time * 20.0 + dist * 30.0) * 0.3 + 0.7;
        let rays = abs(sin(atan2(center.y, center.x) * 4.0)) * exp(-dist * 3.0);
        alpha *= (glow + rays * 0.3) * sparkle * input.life;
        // Golden victory
        color *= vec3f(1.2, 1.1, 0.9);
      }

      default: {
        alpha *= smoothstep(0.5, 0.0, dist) * input.life;
      }
    }

    return vec4f(color, alpha);
  }
`;
