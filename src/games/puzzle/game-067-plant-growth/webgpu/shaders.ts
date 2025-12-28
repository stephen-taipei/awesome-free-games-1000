/**
 * WebGPU Shaders - Plant Growth
 * Botanical Garden / Lush Nature / Verdant Theme
 * Game #067
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

  // Grass blade pattern
  fn grassBlade(uv: vec2f, x: f32, height: f32, time: f32) -> f32 {
    let bladeX = uv.x - x;
    let sway = sin(time * 2.0 + x * 10.0) * 0.02 * (1.0 - uv.y);
    let adjustedX = bladeX - sway;

    let width = 0.003 * (1.0 - uv.y * 0.5);
    let blade = smoothstep(width, 0.0, abs(adjustedX));

    let heightMask = step(uv.y, 1.0 - height);
    return blade * heightMask;
  }

  // Sunbeam effect
  fn sunbeam(uv: vec2f, time: f32) -> f32 {
    let sunPos = vec2f(0.8, 0.1);
    let dir = normalize(uv - sunPos);
    let angle = atan2(dir.y, dir.x);

    var rays = 0.0;
    for (var i = 0; i < 5; i++) {
      let rayAngle = f32(i) * 0.5 + time * 0.1;
      let ray = pow(max(0.0, cos((angle - rayAngle) * 8.0)), 20.0);
      rays += ray * 0.1;
    }

    let dist = length(uv - sunPos);
    let falloff = exp(-dist * 2.0);
    return rays * falloff;
  }

  // Flower petal pattern
  fn flowerPattern(uv: vec2f, center: vec2f, size: f32, petals: f32, time: f32) -> f32 {
    let d = uv - center;
    let dist = length(d);
    let angle = atan2(d.y, d.x) + time * 0.2;

    let petalPattern = sin(angle * petals) * 0.5 + 0.5;
    let flower = smoothstep(size, size - 0.01, dist * (1.0 - petalPattern * 0.3));

    return flower;
  }

  // Floating pollen
  fn pollenDots(uv: vec2f, time: f32) -> f32 {
    var pollen = 0.0;

    for (var i = 0; i < 8; i++) {
      let seed = f32(i) * 1.618;
      let baseX = fract(seed * 0.7);
      let baseY = fract(seed * 0.3);

      let x = baseX + sin(time * 0.3 + seed) * 0.1;
      let y = fract(baseY + time * 0.05 + seed * 0.1);

      let dist = length(uv - vec2f(x, y));
      pollen += smoothstep(0.008, 0.004, dist) * 0.3;
    }

    return pollen;
  }

  @fragment
  fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
    let uv = input.uv;
    let time = uniforms.time;

    // Sky gradient (top to bottom: light blue to soft green)
    let skyTop = vec3f(0.53, 0.81, 0.92);    // Light sky blue
    let skyBottom = vec3f(0.76, 0.90, 0.80); // Soft green-blue
    var color = mix(skyTop, skyBottom, uv.y);

    // Sun glow
    let sunPos = vec2f(0.85, 0.1);
    let sunDist = length(uv - sunPos);
    let sunGlow = exp(-sunDist * 5.0) * 0.6;
    color += vec3f(1.0, 0.95, 0.8) * sunGlow;

    // Sunbeams
    let rays = sunbeam(uv, time);
    color += vec3f(1.0, 0.98, 0.9) * rays * 0.3;

    // Ground/grass area (bottom portion)
    let groundLevel = 0.75;
    if (uv.y > groundLevel) {
      let groundY = (uv.y - groundLevel) / (1.0 - groundLevel);

      // Soil gradient
      let soilTop = vec3f(0.45, 0.65, 0.35);  // Grass green
      let soilBottom = vec3f(0.35, 0.25, 0.15); // Soil brown
      let groundColor = mix(soilTop, soilBottom, groundY);

      // Add grass texture
      let grassNoise = fbm(uv * 30.0 + time * 0.1);
      groundColor += vec3f(0.0, 0.05, 0.0) * grassNoise;

      color = groundColor;
    }

    // Grass blades at ground level
    if (uv.y > groundLevel - 0.1 && uv.y < groundLevel + 0.05) {
      var grass = 0.0;
      for (var i = 0; i < 20; i++) {
        let x = f32(i) / 20.0;
        let height = 0.04 + hash(vec2f(x, 0.0)) * 0.03;
        grass += grassBlade(vec2f(uv.x, 1.0 - uv.y), x, height, time);
      }
      let grassColor = vec3f(0.2, 0.6, 0.2);
      color = mix(color, grassColor, min(1.0, grass));
    }

    // Floating pollen particles
    let pollen = pollenDots(uv, time);
    color += vec3f(1.0, 0.95, 0.7) * pollen;

    // Decorative flowers in background
    let flower1 = flowerPattern(uv, vec2f(0.1, 0.82), 0.025, 5.0, time);
    let flower2 = flowerPattern(uv, vec2f(0.9, 0.85), 0.02, 6.0, -time);
    let flower3 = flowerPattern(uv, vec2f(0.5, 0.8), 0.018, 5.0, time * 0.5);

    color = mix(color, vec3f(1.0, 0.6, 0.7), flower1 * 0.5);
    color = mix(color, vec3f(0.9, 0.7, 1.0), flower2 * 0.4);
    color = mix(color, vec3f(1.0, 0.9, 0.5), flower3 * 0.4);

    // Soft vignette
    let vignette = 1.0 - length((uv - 0.5) * 0.8) * 0.3;
    color *= vignette;

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

  @fragment
  fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
    let uv = input.uv;
    let center = uv - 0.5;
    let dist = length(center);
    let particleType = i32(input.particleType);
    var alpha = input.color.a;
    var color = input.color.rgb;

    switch (particleType) {
      // Leaf particle (type 0)
      case 0: {
        // Leaf shape
        let leafShape = 1.0 - smoothstep(0.0, 0.5, abs(center.y) / (0.5 - abs(center.x) * 0.8 + 0.1));
        let vein = exp(-abs(center.x) * 20.0) * 0.3;
        alpha *= leafShape * input.life;
        color += vec3f(0.0, 0.1, 0.0) * vein;
      }

      // Pollen particle (type 1)
      case 1: {
        let glow = exp(-dist * 6.0);
        let shimmer = sin(uniforms.time * 10.0 + dist * 20.0) * 0.2 + 0.8;
        alpha *= glow * shimmer * input.life;
      }

      // Sprout particle (type 2)
      case 2: {
        // Small sprout shape
        let stem = exp(-abs(center.x) * 15.0) * smoothstep(0.0, 0.3, uv.y);
        let leafL = smoothstep(0.4, 0.35, length(center - vec2f(-0.15, 0.2)));
        let leafR = smoothstep(0.4, 0.35, length(center - vec2f(0.15, 0.2)));
        alpha *= (stem + leafL * 0.5 + leafR * 0.5) * input.life;
      }

      // Water droplet particle (type 3)
      case 3: {
        // Teardrop shape
        let dropY = center.y + 0.1;
        let dropShape = 1.0 - smoothstep(0.0, 0.4, dist + dropY * 0.3);
        let highlight = exp(-length(center - vec2f(-0.1, -0.1)) * 10.0) * 0.5;
        alpha *= dropShape * input.life;
        color += vec3f(0.3, 0.3, 0.4) * highlight;
      }

      // Sunbeam particle (type 4)
      case 4: {
        let ray = exp(-abs(center.x) * 8.0);
        let fade = smoothstep(0.5, 0.0, abs(center.y));
        alpha *= ray * fade * input.life * 0.5;
      }

      // Bloom particle (type 5)
      case 5: {
        let angle = atan2(center.y, center.x);
        let petals = 5.0;
        let petalShape = sin(angle * petals) * 0.5 + 0.5;
        let flower = smoothstep(0.5, 0.3, dist / (0.8 + petalShape * 0.2));
        let centerDot = smoothstep(0.15, 0.1, dist);
        alpha *= (flower + centerDot * 0.5) * input.life;
        // Yellow center
        color = mix(color, vec3f(1.0, 0.9, 0.3), centerDot);
      }

      default: {
        alpha *= smoothstep(0.5, 0.0, dist) * input.life;
      }
    }

    return vec4f(color, alpha);
  }
`;
