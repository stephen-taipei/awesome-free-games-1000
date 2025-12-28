/**
 * WebGPU Shaders - Traffic Sign
 * Urban / Road / Traffic Theme
 * Game #135
 */

export const BACKGROUND_SHADER = /* wgsl */ `
  struct Uniforms {
    time: f32,
    resolution: vec2f,
    gameState: f32,
    matchProgress: f32,
  }

  @group(0) @binding(0) var<uniform> uniforms: Uniforms;

  // Hash function for noise
  fn hash(p: vec2f) -> f32 {
    let k = vec2f(0.3183099, 0.3678794);
    let q = p * k + k.yx;
    return fract(16.0 * k.x * fract(q.x * q.y * (q.x + q.y)));
  }

  // Value noise
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

  // FBM for asphalt texture
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

  // Road markings pattern
  fn roadMarkings(uv: vec2f, time: f32) -> f32 {
    var intensity = 0.0;

    // Center dashed line (moving down to simulate driving)
    let scroll = time * 0.2;
    let centerX = 0.5;
    let dashPattern = step(0.5, fract(uv.y * 8.0 + scroll));
    let centerLine = smoothstep(0.02, 0.0, abs(uv.x - centerX)) * dashPattern;
    intensity += centerLine * 0.8;

    // Side solid lines
    let leftLine = smoothstep(0.015, 0.0, abs(uv.x - 0.12));
    let rightLine = smoothstep(0.015, 0.0, abs(uv.x - 0.88));
    intensity += (leftLine + rightLine) * 0.6;

    return intensity;
  }

  // Street lights effect
  fn streetLights(uv: vec2f, time: f32) -> vec3f {
    var color = vec3f(0.0);

    for (var i = 0; i < 4; i++) {
      let fi = f32(i);
      let lightY = fract(fi * 0.25 + time * 0.05);
      let lightX = select(0.1, 0.9, i % 2 == 0);

      let dist = length(uv - vec2f(lightX, lightY));
      let glow = exp(-dist * 8.0) * 0.4;

      // Warm street light color
      color += glow * vec3f(1.0, 0.9, 0.6);
    }

    return color;
  }

  // Car headlights in distance
  fn carLights(uv: vec2f, time: f32) -> vec3f {
    var color = vec3f(0.0);

    for (var i = 0; i < 3; i++) {
      let fi = f32(i);
      let carY = fract(fi * 0.33 + time * 0.1 + 0.5);
      let laneX = 0.35 + (fi / 3.0) * 0.1;

      // Twin headlights
      let dist1 = length(uv - vec2f(laneX - 0.02, carY));
      let dist2 = length(uv - vec2f(laneX + 0.02, carY));

      let glow1 = exp(-dist1 * 15.0) * 0.3;
      let glow2 = exp(-dist2 * 15.0) * 0.3;

      // White-yellow headlight color
      color += (glow1 + glow2) * vec3f(1.0, 0.98, 0.85);
    }

    return color;
  }

  // Traffic signal glow
  fn trafficSignal(uv: vec2f, time: f32) -> vec3f {
    let signalPos = vec2f(0.92, 0.3);
    let dist = length(uv - signalPos);

    // Cycle through colors
    let cycle = fract(time * 0.3);
    var signalColor = vec3f(0.0);

    if (cycle < 0.4) {
      signalColor = vec3f(0.2, 0.9, 0.3); // Green
    } else if (cycle < 0.5) {
      signalColor = vec3f(1.0, 0.8, 0.1); // Yellow
    } else {
      signalColor = vec3f(0.95, 0.2, 0.2); // Red
    }

    let glow = exp(-dist * 12.0) * 0.5;
    return glow * signalColor;
  }

  @vertex
  fn vertexMain(@builtin(vertex_index) vertexIndex: u32) -> @builtin(position) vec4f {
    var pos = array<vec2f, 6>(
      vec2f(-1.0, -1.0), vec2f(1.0, -1.0), vec2f(-1.0, 1.0),
      vec2f(-1.0, 1.0), vec2f(1.0, -1.0), vec2f(1.0, 1.0)
    );
    return vec4f(pos[vertexIndex], 0.0, 1.0);
  }

  @fragment
  fn fragmentMain(@builtin(position) fragCoord: vec4f) -> @location(0) vec4f {
    let uv = fragCoord.xy / uniforms.resolution;
    let time = uniforms.time;

    // Base asphalt color with texture
    let asphaltNoise = fbm(uv * 30.0);
    var color = vec3f(0.17, 0.24, 0.31) + asphaltNoise * 0.05;

    // Road markings
    let markings = roadMarkings(uv, time);
    let markingColor = mix(vec3f(0.95, 0.8, 0.2), vec3f(0.95, 0.95, 0.95), step(0.5, uv.x));
    color = mix(color, markingColor, markings);

    // Street lights
    color += streetLights(uv, time);

    // Car headlights
    color += carLights(uv, time);

    // Traffic signal
    color += trafficSignal(uv, time);

    // Night sky gradient at top
    let skyBlend = smoothstep(0.0, 0.15, uv.y);
    let skyColor = mix(vec3f(0.08, 0.12, 0.18), vec3f(0.15, 0.1, 0.2), uv.y);
    color = mix(skyColor, color, skyBlend);

    // Victory state - vibrant city lights
    if (uniforms.gameState > 0.5) {
      let victory_pulse = sin(time * 4.0) * 0.5 + 0.5;
      let neon = vec3f(0.2, 0.8, 0.4) * victory_pulse * 0.2;
      color += neon;
    }

    // Match progress - road gets brighter
    let progress_glow = uniforms.matchProgress * 0.1;
    color += vec3f(0.95, 0.8, 0.2) * progress_glow;

    // Vignette
    let vignette = 1.0 - length((uv - 0.5) * 1.3) * 0.4;
    color *= vignette;

    return vec4f(color, 1.0);
  }
`;

export const PARTICLE_SHADER = /* wgsl */ `
  struct Uniforms {
    time: f32,
    resolution: vec2f,
    gameState: f32,
  }

  struct Particle {
    position: vec2f,
    velocity: vec2f,
    color: vec4f,
    size: f32,
    life: f32,
    particleType: f32,
    rotation: f32,
  }

  @group(0) @binding(0) var<uniform> uniforms: Uniforms;
  @group(0) @binding(1) var<storage, read> particles: array<Particle>;

  struct VertexOutput {
    @builtin(position) position: vec4f,
    @location(0) color: vec4f,
    @location(1) uv: vec2f,
    @location(2) particleType: f32,
    @location(3) life: f32,
  }

  @vertex
  fn vertexMain(
    @builtin(vertex_index) vertexIndex: u32,
    @builtin(instance_index) instanceIndex: u32
  ) -> VertexOutput {
    let particle = particles[instanceIndex];

    var corners = array<vec2f, 6>(
      vec2f(-1.0, -1.0), vec2f(1.0, -1.0), vec2f(-1.0, 1.0),
      vec2f(-1.0, 1.0), vec2f(1.0, -1.0), vec2f(1.0, 1.0)
    );

    let corner = corners[vertexIndex];

    // Rotate corner
    let cos_r = cos(particle.rotation);
    let sin_r = sin(particle.rotation);
    let rotated = vec2f(
      corner.x * cos_r - corner.y * sin_r,
      corner.x * sin_r + corner.y * cos_r
    );

    let aspect = uniforms.resolution.x / uniforms.resolution.y;
    let size = particle.size * particle.life;

    var pos = particle.position + rotated * size;
    pos.x /= aspect;
    pos = pos * 2.0 - 1.0;

    var output: VertexOutput;
    output.position = vec4f(pos, 0.0, 1.0);
    output.color = particle.color;
    output.uv = corner * 0.5 + 0.5;
    output.particleType = particle.particleType;
    output.life = particle.life;

    return output;
  }

  @fragment
  fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
    let uv = input.uv;
    let center = vec2f(0.5, 0.5);
    let dist = length(uv - center);
    let particleType = i32(input.particleType);

    var alpha = 0.0;
    var color = input.color.rgb;

    switch (particleType) {
      // Type 0: Road line segment
      case 0: {
        let line_dist = abs(uv.y - 0.5);
        alpha = smoothstep(0.15, 0.0, line_dist);
        alpha *= smoothstep(0.0, 0.2, uv.x) * smoothstep(1.0, 0.8, uv.x);
      }

      // Type 1: Traffic cone
      case 1: {
        // Triangle cone shape
        let cone_width = 0.3 + uv.y * 0.4;
        let cone_dist = abs(uv.x - 0.5) / cone_width;
        alpha = smoothstep(1.0, 0.8, cone_dist) * step(0.1, uv.y) * step(uv.y, 0.9);

        // Stripes
        let stripe = step(0.5, fract(uv.y * 4.0));
        color = mix(color, vec3f(1.0, 1.0, 1.0), stripe * 0.5);
      }

      // Type 2: Car headlight beam
      case 2: {
        // Cone of light
        let beam_angle = atan2(uv.y - 0.5, uv.x - 0.5);
        let beam_spread = abs(beam_angle) / 0.5;
        alpha = smoothstep(1.0, 0.0, beam_spread) * (1.0 - dist);

        // Bright center
        alpha += smoothstep(0.15, 0.0, dist) * 0.5;
      }

      // Type 3: Sign glow/flash
      case 3: {
        // Octagon/circle glow
        let glow = smoothstep(0.5, 0.0, dist);
        alpha = glow;

        // Pulsing effect
        let pulse = sin(uniforms.time * 5.0) * 0.3 + 0.7;
        alpha *= pulse;
      }

      // Type 4: Asphalt sparkle
      case 4: {
        // Small diamond sparkle
        let diamond = abs(uv.x - 0.5) + abs(uv.y - 0.5);
        alpha = smoothstep(0.4, 0.0, diamond);

        // Twinkling
        let twinkle = sin(uniforms.time * 10.0 + input.life * 20.0) * 0.5 + 0.5;
        alpha *= twinkle;
      }

      // Type 5: Selection indicator
      default: {
        // Ring indicator
        let ring = abs(dist - 0.35);
        alpha = smoothstep(0.1, 0.0, ring);

        // Rotating dash pattern
        let angle = atan2(uv.y - 0.5, uv.x - 0.5);
        let dash = step(0.5, fract(angle / 0.5 + uniforms.time * 2.0));
        alpha *= dash;
      }
    }

    alpha *= input.life;
    alpha *= input.color.a;

    return vec4f(color, alpha);
  }
`;
