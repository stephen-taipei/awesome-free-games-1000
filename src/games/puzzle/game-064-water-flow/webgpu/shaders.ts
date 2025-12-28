/**
 * Water Flow - WGSL Shaders
 * Aquatic / Underwater Plumbing Theme
 * Game #064
 */

export const BACKGROUND_SHADER = /* wgsl */ `
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

  // Noise functions for water effects
  fn hash(p: vec2f) -> f32 {
    return fract(sin(dot(p, vec2f(127.1, 311.7))) * 43758.5453);
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

  // Water caustics effect
  fn caustics(uv: vec2f, time: f32) -> f32 {
    let p1 = sin(uv.x * 8.0 + time * 0.7) * cos(uv.y * 6.0 + time * 0.5);
    let p2 = cos(uv.x * 7.0 + time * 0.6) * sin(uv.y * 8.0 + time * 0.8);
    let p3 = sin((uv.x + uv.y) * 5.0 + time * 0.9);
    return (p1 + p2 + p3) / 6.0 + 0.5;
  }

  // Water ripple
  fn ripple(uv: vec2f, center: vec2f, time: f32, frequency: f32) -> f32 {
    let dist = length(uv - center);
    return sin(dist * frequency - time * 4.0) * exp(-dist * 3.0);
  }

  // Bubble effect
  fn bubbles(uv: vec2f, time: f32) -> f32 {
    var total = 0.0;
    for (var i = 0; i < 5; i++) {
      let phase = f32(i) * 1.256;
      let x = 0.2 + f32(i) * 0.15;
      let y = fract(time * 0.1 + phase);
      let wobble = sin(time * 3.0 + phase) * 0.02;
      let bubblePos = vec2f(x + wobble, 1.0 - y);
      let dist = length(uv - bubblePos);
      let size = 0.01 + f32(i % 3) * 0.005;
      total += smoothstep(size + 0.005, size, dist) * 0.3;
    }
    return total;
  }

  // Underwater fog/depth effect
  fn underwaterFog(uv: vec2f) -> f32 {
    let depth = 1.0 - uv.y;
    return depth * depth * 0.4;
  }

  // Seaweed sway
  fn seaweed(uv: vec2f, time: f32) -> f32 {
    if (uv.y > 0.2) { return 0.0; }

    var total = 0.0;
    for (var i = 0; i < 4; i++) {
      let baseX = 0.15 + f32(i) * 0.25;
      let sway = sin(time * 1.5 + f32(i) * 0.5) * 0.03 * (0.2 - uv.y) / 0.2;
      let x = baseX + sway;
      let width = 0.015;
      let height = 0.12 + f32(i % 3) * 0.04;

      if (uv.y < height && abs(uv.x - x) < width) {
        let gradient = uv.y / height;
        total += (1.0 - gradient) * 0.3;
      }
    }
    return total;
  }

  // Wave pattern at top
  fn surfaceWave(uv: vec2f, time: f32) -> f32 {
    if (uv.y < 0.85) { return 0.0; }

    let wave = sin(uv.x * 15.0 + time * 2.0) * 0.01;
    let wave2 = sin(uv.x * 8.0 - time * 1.5) * 0.015;
    let surface = 0.87 + wave + wave2;

    if (uv.y > surface) {
      return 0.3 * smoothstep(surface, surface + 0.05, uv.y);
    }
    return 0.0;
  }

  @fragment
  fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
    let uv = input.uv;
    let time = uniforms.time;

    // Base deep water color
    let deepBlue = vec3f(0.05, 0.15, 0.35);
    let midBlue = vec3f(0.1, 0.3, 0.5);
    let shallowBlue = vec3f(0.15, 0.45, 0.65);

    // Depth gradient
    let depthGradient = uv.y;
    var waterColor = mix(deepBlue, midBlue, depthGradient);
    waterColor = mix(waterColor, shallowBlue, depthGradient * depthGradient);

    // Add caustics light pattern
    let causticsValue = caustics(uv, time);
    let causticsColor = vec3f(0.2, 0.5, 0.7) * causticsValue * 0.3;
    waterColor += causticsColor * (1.0 - depthGradient * 0.5);

    // Add subtle noise texture
    let noiseValue = fbm(uv * 5.0 + time * 0.1);
    waterColor += vec3f(noiseValue * 0.05);

    // Add ripples
    let ripple1 = ripple(uv, vec2f(0.3, 0.6), time, 20.0);
    let ripple2 = ripple(uv, vec2f(0.7, 0.4), time + 1.0, 15.0);
    waterColor += vec3f(0.1, 0.2, 0.3) * (ripple1 + ripple2) * 0.15;

    // Add bubbles
    let bubbleValue = bubbles(uv, time);
    waterColor = mix(waterColor, vec3f(0.6, 0.8, 0.9), bubbleValue);

    // Add underwater fog
    let fog = underwaterFog(uv);
    waterColor = mix(waterColor, deepBlue * 0.7, fog);

    // Add seaweed
    let seaweedValue = seaweed(uv, time);
    let seaweedColor = vec3f(0.1, 0.35, 0.15);
    waterColor = mix(waterColor, seaweedColor, seaweedValue);

    // Add surface wave highlight
    let surface = surfaceWave(uv, time);
    waterColor = mix(waterColor, vec3f(0.7, 0.85, 0.95), surface);

    // Light rays from top
    let rayAngle = sin(uv.x * 3.0 + time * 0.3) * 0.5 + 0.5;
    let rayIntensity = (1.0 - uv.y) * rayAngle * 0.08;
    waterColor += vec3f(0.2, 0.4, 0.5) * rayIntensity;

    // Vignette
    let vignette = 1.0 - length((uv - 0.5) * 1.3);
    waterColor *= vignette * 0.3 + 0.7;

    return vec4f(waterColor, 1.0);
  }
`;

export const PARTICLE_SHADER = /* wgsl */ `
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
    let size = input.size / uniforms.width;
    let aspect = uniforms.width / uniforms.height;

    // Rotation
    let c = cos(input.rotation);
    let s = sin(input.rotation);
    let rotated = vec2f(
      corner.x * c - corner.y * s,
      corner.x * s + corner.y * c
    );

    var pos = input.position + rotated * vec2f(size, size * aspect);

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
    let center = vec2f(0.5, 0.5);
    let dist = length(uv - center) * 2.0;
    let pType = i32(input.particleType);
    let time = uniforms.time;

    var alpha = 0.0;
    var color = input.color.rgb;

    // Type 0: Bubble
    if (pType == 0) {
      let ring = smoothstep(0.9, 0.95, dist) - smoothstep(0.95, 1.0, dist);
      let inner = 1.0 - smoothstep(0.0, 0.9, dist);
      let highlight = smoothstep(0.6, 0.3, length(uv - vec2f(0.35, 0.35)));
      alpha = (ring * 0.8 + inner * 0.15 + highlight * 0.4) * input.color.a;
      color = mix(color, vec3f(1.0), highlight * 0.5);
    }
    // Type 1: Droplet
    else if (pType == 1) {
      let dropShape = 1.0 - smoothstep(0.0, 1.0, dist);
      let teardrop = dropShape * (1.0 + (uv.y - 0.5) * 0.5);
      alpha = teardrop * input.color.a;
    }
    // Type 2: Ripple ring
    else if (pType == 2) {
      let ring = abs(dist - 0.7) < 0.15 ? 1.0 : 0.0;
      let fade = 1.0 - dist;
      alpha = ring * fade * input.color.a;
    }
    // Type 3: Flow particle
    else if (pType == 3) {
      let streak = 1.0 - smoothstep(0.0, 0.3, abs(uv.y - 0.5));
      let taper = smoothstep(0.0, 0.2, uv.x) * smoothstep(1.0, 0.7, uv.x);
      alpha = streak * taper * input.color.a;
    }
    // Type 4: Splash
    else if (pType == 4) {
      let splash = 1.0 - smoothstep(0.0, 0.8, dist);
      let sparkle = sin(dist * 20.0 + time * 10.0) * 0.5 + 0.5;
      alpha = splash * (0.7 + sparkle * 0.3) * input.color.a;
    }
    // Type 5: Victory wave
    else if (pType == 5) {
      let wave = sin(dist * 10.0 - time * 5.0) * 0.5 + 0.5;
      let glow = 1.0 - smoothstep(0.0, 1.0, dist);
      alpha = glow * wave * input.color.a;
      color = mix(color, vec3f(0.5, 0.8, 1.0), wave * 0.5);
    }
    // Default: Simple glow
    else {
      alpha = (1.0 - smoothstep(0.0, 1.0, dist)) * input.color.a;
    }

    return vec4f(color, alpha);
  }
`;
