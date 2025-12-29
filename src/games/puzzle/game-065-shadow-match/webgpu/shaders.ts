/**
 * Shadow Match - WGSL Shaders
 * Noir / Shadow Art / Silhouette Theme
 * Game #065
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

  // Hash function for noise
  fn hash(p: vec2f) -> f32 {
    return fract(sin(dot(p, vec2f(127.1, 311.7))) * 43758.5453);
  }

  // Smooth noise
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

  // Film grain effect
  fn filmGrain(uv: vec2f, time: f32) -> f32 {
    let grain = hash(uv * 1000.0 + time);
    return grain * 0.08;
  }

  // Spotlight effect
  fn spotlight(uv: vec2f, lightPos: vec2f, radius: f32, softness: f32) -> f32 {
    let dist = length(uv - lightPos);
    return 1.0 - smoothstep(radius - softness, radius + softness, dist);
  }

  // Light ray (god ray effect)
  fn lightRay(uv: vec2f, rayX: f32, width: f32, angle: f32, time: f32) -> f32 {
    let rotatedX = cos(angle) * (uv.x - rayX) - sin(angle) * (uv.y - 1.0);
    let dist = abs(rotatedX);

    if (dist > width) { return 0.0; }

    let intensity = pow(1.0 - dist / width, 2.0);
    let fade = uv.y;  // Fade toward bottom
    let flicker = 0.8 + sin(time * 2.0 + rayX * 10.0) * 0.2;

    return intensity * fade * flicker * 0.15;
  }

  // Vignette
  fn vignette(uv: vec2f, strength: f32) -> f32 {
    let dist = length((uv - 0.5) * 1.5);
    return 1.0 - smoothstep(0.4, 1.0, dist) * strength;
  }

  // Dust particles
  fn dustParticles(uv: vec2f, time: f32) -> f32 {
    var total = 0.0;
    for (var i = 0; i < 8; i++) {
      let phase = f32(i) * 0.785;
      let x = 0.1 + f32(i) * 0.12 + sin(time * 0.3 + phase) * 0.05;
      let y = fract(time * 0.05 + phase * 0.3);
      let drift = sin(time * 0.5 + phase) * 0.02;
      let pos = vec2f(x + drift, y);
      let dist = length(uv - pos);
      let size = 0.003 + f32(i % 3) * 0.001;
      let brightness = 0.15 + f32(i % 4) * 0.05;
      total += smoothstep(size + 0.002, size, dist) * brightness;
    }
    return total;
  }

  // Shadow edge pattern
  fn shadowPattern(uv: vec2f, time: f32) -> f32 {
    let wave = sin(uv.x * 30.0 + time) * 0.02;
    let edge = smoothstep(0.48 + wave, 0.52 + wave, uv.y);
    return edge;
  }

  @fragment
  fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
    let uv = input.uv;
    let time = uniforms.time;

    // Base noir gradient
    let darkColor = vec3f(0.05, 0.05, 0.08);
    let midColor = vec3f(0.12, 0.11, 0.15);

    // Vertical gradient
    var baseColor = mix(darkColor, midColor, uv.y * 0.5);

    // Add warm noir tint
    let warmTint = vec3f(0.15, 0.1, 0.05);
    baseColor += warmTint * (1.0 - uv.y) * 0.15;

    // Main spotlight from top
    let spotPos = vec2f(0.5 + sin(time * 0.2) * 0.1, 1.1);
    let spot = spotlight(uv, spotPos, 0.6, 0.4);
    let spotColor = vec3f(0.95, 0.8, 0.5);
    baseColor += spotColor * spot * 0.25;

    // Secondary spotlight
    let spot2Pos = vec2f(0.3, 0.9);
    let spot2 = spotlight(uv, spot2Pos, 0.4, 0.3);
    baseColor += spotColor * spot2 * 0.1;

    // Light rays
    let ray1 = lightRay(uv, 0.3, 0.08, 0.2, time);
    let ray2 = lightRay(uv, 0.6, 0.06, -0.15, time);
    let ray3 = lightRay(uv, 0.75, 0.05, 0.1, time);
    let rayColor = vec3f(0.9, 0.75, 0.4);
    baseColor += rayColor * (ray1 + ray2 + ray3);

    // Dust particles in light
    let dust = dustParticles(uv, time);
    baseColor += vec3f(0.8, 0.7, 0.5) * dust * spot;

    // Shadow pattern at bottom
    let shadow = shadowPattern(uv, time);
    baseColor *= mix(0.6, 1.0, shadow);

    // Film grain
    let grain = filmGrain(uv, time);
    baseColor += vec3f(grain) - 0.04;

    // Vignette
    let vig = vignette(uv, 0.6);
    baseColor *= vig;

    // Subtle color aberration at edges
    let edgeDist = length(uv - 0.5) * 2.0;
    if (edgeDist > 0.7) {
      let aberration = (edgeDist - 0.7) * 0.05;
      baseColor.r += aberration;
      baseColor.b -= aberration;
    }

    return vec4f(baseColor, 1.0);
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

    // Type 0: Spotlight glow
    if (pType == 0) {
      let glow = 1.0 - smoothstep(0.0, 1.0, dist);
      let flicker = 0.9 + sin(time * 8.0 + input.life * 10.0) * 0.1;
      alpha = glow * glow * input.color.a * flicker;
      color = mix(color, vec3f(1.0, 0.95, 0.8), glow * 0.3);
    }
    // Type 1: Dust mote
    else if (pType == 1) {
      let mote = 1.0 - smoothstep(0.0, 0.8, dist);
      let twinkle = 0.7 + sin(time * 5.0 + input.life * 20.0) * 0.3;
      alpha = mote * input.color.a * twinkle;
    }
    // Type 2: Shadow wisp
    else if (pType == 2) {
      let wisp = 1.0 - smoothstep(0.0, 1.0, dist);
      let wave = sin(dist * 8.0 - time * 3.0) * 0.3 + 0.7;
      alpha = wisp * wave * input.color.a;
      color *= 0.3;  // Darker for shadow
    }
    // Type 3: Match spark
    else if (pType == 3) {
      let spark = 1.0 - smoothstep(0.0, 0.6, dist);
      let sparkle = sin(dist * 15.0 + time * 10.0) * 0.5 + 0.5;
      alpha = spark * (0.6 + sparkle * 0.4) * input.color.a;
      color = mix(color, vec3f(1.0, 1.0, 0.8), sparkle * 0.5);
    }
    // Type 4: Reveal light
    else if (pType == 4) {
      let reveal = 1.0 - smoothstep(0.0, 0.9, dist);
      let pulse = sin(time * 4.0) * 0.2 + 0.8;
      alpha = reveal * reveal * pulse * input.color.a;
    }
    // Type 5: Victory glow
    else if (pType == 5) {
      let glow = 1.0 - smoothstep(0.0, 1.0, dist);
      let shimmer = sin(dist * 6.0 - time * 4.0) * 0.3 + 0.7;
      alpha = glow * shimmer * input.color.a;
      color = mix(color, vec3f(0.4, 1.0, 0.6), shimmer * 0.4);
    }
    // Default: Simple glow
    else {
      alpha = (1.0 - smoothstep(0.0, 1.0, dist)) * input.color.a;
    }

    return vec4f(color, alpha);
  }
`;
