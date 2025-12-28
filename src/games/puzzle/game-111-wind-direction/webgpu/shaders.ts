/**
 * WebGPU Shaders - Wind Direction
 * Weather / Atmospheric Theme
 * Game #111
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

  fn noise(p: vec2f) -> f32 {
    let i = floor(p);
    let f = fract(p);
    let u = f * f * (3.0 - 2.0 * f);

    return mix(
      mix(hash(i + vec2f(0.0, 0.0)), hash(i + vec2f(1.0, 0.0)), u.x),
      mix(hash(i + vec2f(0.0, 1.0)), hash(i + vec2f(1.0, 1.0)), u.x),
      u.y
    );
  }

  // Wind flow lines
  fn windLines(uv: vec2f, time: f32) -> f32 {
    var lines = 0.0;
    for (var i = 0; i < 5; i++) {
      let offset = f32(i) * 0.15;
      let speed = 1.0 + f32(i) * 0.3;
      let y = fract(uv.y * 8.0 + offset);
      let x = fract(uv.x + time * speed * 0.1);
      let line = smoothstep(0.1, 0.0, abs(y - 0.5)) * x * (1.0 - x) * 4.0;
      lines += line * 0.2;
    }
    return lines;
  }

  // Cloud shapes
  fn cloud(uv: vec2f, center: vec2f, size: vec2f, time: f32) -> f32 {
    let drift = vec2f(time * 0.02, sin(time * 0.3) * 0.01);
    let p = (uv - center - drift) / size;

    // Multiple overlapping circles for cloud shape
    var cloudShape = 0.0;
    cloudShape += smoothstep(1.0, 0.5, length(p));
    cloudShape += smoothstep(1.0, 0.5, length(p - vec2f(0.3, 0.1))) * 0.8;
    cloudShape += smoothstep(1.0, 0.5, length(p + vec2f(0.25, 0.05))) * 0.7;
    cloudShape += smoothstep(1.0, 0.5, length(p - vec2f(-0.15, 0.15))) * 0.6;

    return min(cloudShape, 1.0);
  }

  // Atmospheric gradient
  fn atmosphere(y: f32, time: f32) -> vec3f {
    let skyTop = vec3f(0.4, 0.7, 1.0);     // Deep sky blue
    let skyBottom = vec3f(0.7, 0.9, 1.0);  // Light sky blue
    let horizon = vec3f(0.95, 0.95, 0.98); // Misty white

    let t = y;
    var color = mix(horizon, skyBottom, smoothstep(0.0, 0.3, t));
    color = mix(color, skyTop, smoothstep(0.3, 1.0, t));

    // Subtle atmospheric shimmer
    let shimmer = sin(y * 20.0 + time * 2.0) * 0.02;
    color += vec3f(shimmer);

    return color;
  }

  // Grass/ground sway
  fn grassSway(uv: vec2f, time: f32) -> f32 {
    if (uv.y > 0.15) { return 0.0; }

    let grassHeight = 0.15 - uv.y;
    let sway = sin(uv.x * 30.0 + time * 3.0) * 0.02 * grassHeight * 10.0;
    let grassPattern = sin((uv.x + sway) * 80.0) * 0.5 + 0.5;

    return grassPattern * grassHeight * 3.0;
  }

  @fragment
  fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
    let uv = input.uv;
    let time = uniforms.time;
    let intensity = uniforms.intensity;

    // Base atmosphere
    var color = atmosphere(uv.y, time);

    // Wind flow visualization
    let windFlow = windLines(uv, time);
    color += vec3f(0.1, 0.2, 0.3) * windFlow * intensity;

    // Clouds
    let cloud1 = cloud(uv, vec2f(0.2, 0.8), vec2f(0.15, 0.08), time);
    let cloud2 = cloud(uv, vec2f(0.6, 0.75), vec2f(0.12, 0.06), time * 0.8);
    let cloud3 = cloud(uv, vec2f(0.85, 0.85), vec2f(0.1, 0.05), time * 1.2);

    let cloudMask = max(max(cloud1, cloud2), cloud3);
    color = mix(color, vec3f(1.0, 1.0, 1.0), cloudMask * 0.7);

    // Ground/grass area
    if (uv.y < 0.15) {
      let grassBase = vec3f(0.3, 0.6, 0.2);
      let grassDark = vec3f(0.2, 0.4, 0.15);
      let grass = grassSway(uv, time);
      let groundColor = mix(grassDark, grassBase, grass);
      color = mix(groundColor, color, smoothstep(0.0, 0.15, uv.y));
    }

    // Subtle dust/particles in the wind
    let dustNoise = noise(uv * 50.0 + vec2f(time * 2.0, 0.0));
    if (dustNoise > 0.95) {
      color += vec3f(0.2) * (dustNoise - 0.95) * 20.0;
    }

    // Sun glow
    let sunPos = vec2f(0.85, 0.9);
    let sunDist = length(uv - sunPos);
    let sunGlow = exp(-sunDist * 5.0) * 0.3;
    color += vec3f(1.0, 0.95, 0.8) * sunGlow;

    // Vignette
    let vignette = 1.0 - length(uv - 0.5) * 0.4;
    color *= vignette;

    // Intensity adjustment
    color *= 0.9 + intensity * 0.1;

    return vec4f(color, 0.35);
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

    // Type 0: Wind - streak/line effect
    if (particleType == 0) {
      let streak = 1.0 - smoothstep(0.0, 0.15, abs(uv.y - 0.5));
      let fade = uv.x * (1.0 - uv.x) * 4.0;
      alpha *= streak * fade;
      color = vec3f(0.8, 0.9, 1.0);
    }
    // Type 1: Leaf - leaf shape
    else if (particleType == 1) {
      let leafX = (uv.x - 0.5) * 2.0;
      let leafY = (uv.y - 0.5) * 2.0;
      let leafShape = (1.0 - abs(leafX)) * (1.0 - leafY * leafY * 2.0);
      alpha *= smoothstep(0.0, 0.3, leafShape);
      color = mix(vec3f(0.2, 0.5, 0.1), vec3f(0.5, 0.7, 0.2), uv.y);
    }
    // Type 2: Gust - burst effect
    else if (particleType == 2) {
      let angle = atan2(uv.y - 0.5, uv.x - 0.5);
      let rays = (sin(angle * 6.0 + time * 5.0) + 1.0) * 0.5;
      let ring = smoothstep(0.8, 0.5, dist) * smoothstep(0.2, 0.4, dist);
      alpha *= ring * rays;
    }
    // Type 3: Cloud - fluffy shape
    else if (particleType == 3) {
      let fluff = 1.0 - smoothstep(0.0, 0.5, dist);
      let noise = sin(uv.x * 20.0 + time) * sin(uv.y * 20.0) * 0.1;
      alpha *= fluff + noise;
      color = vec3f(0.95, 0.97, 1.0);
    }
    // Type 4: Arrow - directional indicator
    else if (particleType == 4) {
      let arrowX = (uv.x - 0.5) * 2.0;
      let arrowY = (uv.y - 0.5) * 2.0;
      // Arrow head
      let headShape = step(abs(arrowY), 0.5 - abs(arrowX) * 0.8) * step(arrowX, 0.3);
      // Arrow tail
      let tailShape = step(abs(arrowY), 0.15) * step(-arrowX, 0.5);
      alpha *= max(headShape, tailShape);
      color = vec3f(0.3, 0.6, 0.9);
    }
    // Type 5: Sparkle - atmospheric glitter
    else if (particleType == 5) {
      let angle = atan2(uv.y - 0.5, uv.x - 0.5);
      let rays = abs(sin(angle * 4.0 + time * 4.0));
      let core = 1.0 - smoothstep(0.0, 0.2, dist);
      let glow = (1.0 - smoothstep(0.0, 0.5, dist)) * rays;
      alpha *= max(core, glow * 0.5);
      color = vec3f(1.0, 1.0, 0.9);
    }
    else {
      alpha *= 1.0 - smoothstep(0.3, 0.5, dist);
    }

    alpha *= uniforms.intensity;
    return vec4f(color, alpha);
  }
`;
