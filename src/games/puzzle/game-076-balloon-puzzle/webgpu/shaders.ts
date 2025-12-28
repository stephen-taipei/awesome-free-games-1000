/**
 * WebGPU Shaders - Balloon Puzzle
 * Sky / Balloon Physics Theme
 * Game #076
 */

export const BACKGROUND_SHADER = /* wgsl */ `
  struct Uniforms {
    time: f32,
    width: f32,
    height: f32,
    windStrength: f32,
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

  fn hash(p: vec2f) -> f32 {
    return fract(sin(dot(p, vec2f(127.1, 311.7))) * 43758.5453);
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
    var pos = p;
    for (var i = 0; i < 4; i++) {
      value += amplitude * noise(pos);
      pos *= 2.0;
      amplitude *= 0.5;
    }
    return value;
  }

  fn skyGradient(uv: vec2f, time: f32) -> vec3f {
    // Sky gradient from deep blue to light cyan
    let topColor = vec3f(0.4, 0.6, 0.9);
    let bottomColor = vec3f(0.7, 0.9, 1.0);
    let horizonColor = vec3f(1.0, 0.95, 0.9);

    let y = uv.y;
    var sky = mix(bottomColor, topColor, pow(y, 0.5));

    // Add horizon glow
    let horizonFactor = exp(-pow((y - 0.1) * 3.0, 2.0));
    sky = mix(sky, horizonColor, horizonFactor * 0.3);

    return sky;
  }

  fn cloudLayer(uv: vec2f, time: f32, scale: f32, speed: f32) -> f32 {
    let p = uv * scale + vec2f(time * speed, 0.0);
    let cloud = fbm(p);
    return smoothstep(0.4, 0.7, cloud);
  }

  fn windStreaks(uv: vec2f, time: f32, strength: f32) -> f32 {
    let p = uv * vec2f(50.0, 10.0) + vec2f(time * 3.0 * strength, 0.0);
    let streak = noise(p) * noise(p * 0.5 + vec2f(time));
    return streak * strength * 0.3;
  }

  fn sunGlow(uv: vec2f, time: f32) -> vec3f {
    let sunPos = vec2f(0.8, 0.85);
    let dist = distance(uv, sunPos);
    let glow = exp(-dist * 3.0);
    let sunColor = vec3f(1.0, 0.95, 0.8);
    return sunColor * glow * 0.4;
  }

  @fragment
  fn fragmentMain(in: VertexOutput) -> @location(0) vec4f {
    let uv = in.uv;
    let t = uniforms.time * 0.3;
    let windStrength = uniforms.windStrength;

    // Sky gradient
    var color = skyGradient(uv, t);

    // Add sun glow
    color += sunGlow(uv, t);

    // Cloud layers (only in upper portion)
    if (uv.y > 0.3) {
      let cloudAlpha1 = cloudLayer(uv, t, 3.0, 0.1) * smoothstep(0.3, 0.5, uv.y);
      let cloudAlpha2 = cloudLayer(uv + vec2f(0.3, 0.1), t, 5.0, 0.05) * 0.5 * smoothstep(0.4, 0.6, uv.y);

      let cloudColor = vec3f(1.0, 1.0, 1.0);
      color = mix(color, cloudColor, cloudAlpha1 * 0.7);
      color = mix(color, cloudColor * 0.95, cloudAlpha2 * 0.5);
    }

    // Wind effect streaks
    let wind = windStreaks(uv, t, windStrength);
    color += vec3f(wind * 0.5, wind * 0.7, wind);

    // Atmospheric particles
    let particles = noise(uv * 200.0 + vec2f(t * 2.0, 0.0)) * 0.02;
    color += vec3f(particles);

    // Vignette
    let vignette = 1.0 - length(uv - 0.5) * 0.4;
    color *= vignette;

    return vec4f(color, 1.0);
  }
`;

export const PARTICLE_SHADER = /* wgsl */ `
  struct Uniforms {
    time: f32,
    width: f32,
    height: f32,
    windStrength: f32,
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
    @builtin(vertex_index) vertexIndex: u32,
    input: VertexInput
  ) -> VertexOutput {
    var corners = array<vec2f, 4>(
      vec2f(-1, -1), vec2f(1, -1), vec2f(-1, 1), vec2f(1, 1)
    );

    let corner = corners[vertexIndex];
    let c = cos(input.rotation);
    let s = sin(input.rotation);
    let rotated = vec2f(
      corner.x * c - corner.y * s,
      corner.x * s + corner.y * c
    );

    let size = input.size / vec2f(uniforms.width, uniforms.height);
    let pos = input.position + rotated * size;

    var out: VertexOutput;
    out.position = vec4f(pos, 0, 1);
    out.uv = corner * 0.5 + 0.5;
    out.color = input.color;
    out.particleType = input.particleType;
    out.life = input.life;
    return out;
  }

  fn airBubble(uv: vec2f) -> f32 {
    let dist = length(uv - 0.5);
    let bubble = smoothstep(0.5, 0.4, dist);
    let highlight = smoothstep(0.3, 0.1, length(uv - vec2f(0.35, 0.35)));
    return bubble * 0.6 + highlight * 0.4;
  }

  fn windSwirl(uv: vec2f, time: f32) -> f32 {
    let centered = uv - 0.5;
    let angle = atan2(centered.y, centered.x) + time * 3.0;
    let dist = length(centered);
    let swirl = sin(angle * 3.0 + dist * 10.0) * 0.5 + 0.5;
    return swirl * smoothstep(0.5, 0.2, dist);
  }

  fn sparkleShape(uv: vec2f, time: f32) -> f32 {
    let centered = uv - 0.5;
    let dist = length(centered);
    let angle = atan2(centered.y, centered.x);
    let star = pow(cos(angle * 4.0 + time * 5.0), 2.0);
    return star * smoothstep(0.5, 0.0, dist);
  }

  fn popBurst(uv: vec2f, life: f32) -> f32 {
    let dist = length(uv - 0.5);
    let ring = smoothstep(0.4 * life, 0.3 * life, dist) - smoothstep(0.3 * life, 0.2 * life, dist);
    let scatter = smoothstep(0.5, 0.0, dist) * (1.0 - life);
    return ring + scatter * 0.5;
  }

  fn cloudPuff(uv: vec2f) -> f32 {
    let d1 = length(uv - vec2f(0.5, 0.5));
    let d2 = length(uv - vec2f(0.3, 0.45));
    let d3 = length(uv - vec2f(0.7, 0.48));
    let puff = smoothstep(0.35, 0.2, d1) + smoothstep(0.25, 0.15, d2) * 0.6 + smoothstep(0.25, 0.15, d3) * 0.6;
    return min(puff, 1.0);
  }

  fn breezeWave(uv: vec2f, time: f32) -> f32 {
    let wave = sin((uv.x + time) * 10.0) * 0.5 + 0.5;
    let fade = smoothstep(0.0, 0.3, uv.y) * smoothstep(1.0, 0.7, uv.y);
    return wave * fade * smoothstep(0.0, 0.2, uv.x) * smoothstep(1.0, 0.8, uv.x);
  }

  @fragment
  fn fragmentMain(in: VertexOutput) -> @location(0) vec4f {
    let uv = in.uv;
    let t = uniforms.time;
    var alpha: f32;
    var color = in.color.rgb;

    let pType = i32(in.particleType);

    switch(pType) {
      case 0: { // air bubble
        alpha = airBubble(uv);
        color = mix(color, vec3f(1.0), 0.3);
      }
      case 1: { // wind swirl
        alpha = windSwirl(uv, t);
      }
      case 2: { // sparkle
        alpha = sparkleShape(uv, t);
        color = mix(color, vec3f(1.0), 0.5);
      }
      case 3: { // pop burst
        alpha = popBurst(uv, in.life);
        color = mix(vec3f(1.0, 0.5, 0.5), color, in.life);
      }
      case 4: { // cloud puff
        alpha = cloudPuff(uv);
        color = vec3f(1.0, 1.0, 1.0);
      }
      case 5: { // breeze wave
        alpha = breezeWave(uv, t);
        color = mix(vec3f(0.8, 0.9, 1.0), color, 0.3);
      }
      default: {
        alpha = 1.0 - length(uv - 0.5) * 2.0;
      }
    }

    alpha *= in.color.a * in.life;
    return vec4f(color, alpha);
  }
`;
