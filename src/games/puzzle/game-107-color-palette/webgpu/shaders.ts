/**
 * WebGPU Shaders - Color Palette
 * Artist Studio / Creative Theme
 * Game #107
 */

export const BACKGROUND_SHADER = /* wgsl */`
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
      vec2f(-1, -1), vec2f(1, -1), vec2f(-1, 1),
      vec2f(-1, 1), vec2f(1, -1), vec2f(1, 1)
    );

    var output: VertexOutput;
    output.position = vec4f(positions[vertexIndex], 0, 1);
    output.uv = positions[vertexIndex] * 0.5 + 0.5;
    return output;
  }

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

  // Canvas texture - artistic fabric weave
  fn canvasWeave(uv: vec2f) -> f32 {
    let scale = 80.0;
    let p = uv * scale;
    let weaveH = sin(p.x * 3.14159) * 0.5 + 0.5;
    let weaveV = sin(p.y * 3.14159) * 0.5 + 0.5;
    return 0.9 + weaveH * weaveV * 0.1;
  }

  // Easel wood frame
  fn easelFrame(uv: vec2f) -> vec3f {
    let frameWidth = 0.03;
    let edge = min(min(uv.x, 1.0 - uv.x), min(uv.y, 1.0 - uv.y));

    if (edge < frameWidth) {
      let woodGrain = noise(uv * vec2f(5.0, 50.0)) * 0.2;
      return vec3f(0.45 + woodGrain, 0.30 + woodGrain, 0.15 + woodGrain);
    }
    return vec3f(0.0);
  }

  // Paint palette in corner
  fn paintPalette(uv: vec2f, time: f32) -> vec3f {
    let center = vec2f(0.12, 0.88);
    let dist = distance(uv, center);

    if (dist > 0.1) {
      return vec3f(0.0);
    }

    // Wooden palette base
    let wood = vec3f(0.6, 0.45, 0.25);

    // Paint blobs on palette
    let colors = array<vec3f, 6>(
      vec3f(0.9, 0.2, 0.2),   // Red
      vec3f(0.2, 0.5, 0.9),   // Blue
      vec3f(0.95, 0.85, 0.2), // Yellow
      vec3f(0.2, 0.8, 0.3),   // Green
      vec3f(0.8, 0.4, 0.9),   // Purple
      vec3f(0.95, 0.6, 0.2)   // Orange
    );

    var paletteColor = wood;
    for (var i = 0u; i < 6u; i++) {
      let angle = f32(i) * 1.047 + 0.5;
      let blobCenter = center + vec2f(cos(angle), sin(angle)) * 0.06;
      let blobDist = distance(uv, blobCenter);
      let blobSize = 0.015 + sin(time + f32(i)) * 0.003;
      if (blobDist < blobSize) {
        paletteColor = colors[i];
      }
    }

    // Palette edge
    let edgeFade = smoothstep(0.09, 0.1, dist);
    return paletteColor * (1.0 - edgeFade);
  }

  // Color wheel decoration
  fn colorWheel(uv: vec2f, time: f32) -> vec3f {
    let center = vec2f(0.88, 0.12);
    let dist = distance(uv, center);

    if (dist < 0.04 || dist > 0.08) {
      return vec3f(0.0);
    }

    let angle = atan2(uv.y - center.y, uv.x - center.x) + time * 0.5;
    let hue = (angle / 6.283 + 1.0) % 1.0;

    // HSL to RGB
    let h = hue * 6.0;
    let x = 1.0 - abs(h % 2.0 - 1.0);
    var rgb: vec3f;
    if (h < 1.0) { rgb = vec3f(1.0, x, 0.0); }
    else if (h < 2.0) { rgb = vec3f(x, 1.0, 0.0); }
    else if (h < 3.0) { rgb = vec3f(0.0, 1.0, x); }
    else if (h < 4.0) { rgb = vec3f(0.0, x, 1.0); }
    else if (h < 5.0) { rgb = vec3f(x, 0.0, 1.0); }
    else { rgb = vec3f(1.0, 0.0, x); }

    return rgb * 0.8;
  }

  // Paint splatters
  fn paintSplatter(uv: vec2f, time: f32) -> vec3f {
    var splatter = vec3f(0.0);

    // Fixed splatter positions
    let splatters = array<vec2f, 5>(
      vec2f(0.15, 0.25),
      vec2f(0.82, 0.75),
      vec2f(0.7, 0.2),
      vec2f(0.25, 0.8),
      vec2f(0.5, 0.15)
    );

    let colors = array<vec3f, 5>(
      vec3f(0.9, 0.3, 0.4),
      vec3f(0.3, 0.6, 0.9),
      vec3f(0.9, 0.8, 0.2),
      vec3f(0.4, 0.8, 0.5),
      vec3f(0.7, 0.4, 0.8)
    );

    for (var i = 0u; i < 5u; i++) {
      let center = splatters[i];
      let dist = distance(uv, center);
      let angle = atan2(uv.y - center.y, uv.x - center.x);
      let radius = 0.03 + sin(angle * 7.0 + f32(i)) * 0.01;

      if (dist < radius) {
        splatter = colors[i] * 0.15;
      }
    }

    return splatter;
  }

  @fragment
  fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
    let uv = input.uv;
    let time = uniforms.time;

    // White canvas base with texture
    let canvasTex = canvasWeave(uv);
    var color = vec3f(0.98, 0.97, 0.95) * canvasTex;

    // Subtle gradient
    color *= 0.95 + uv.y * 0.05;

    // Add paint splatters
    color += paintSplatter(uv, time);

    // Color wheel
    color += colorWheel(uv, time);

    // Paint palette
    let palette = paintPalette(uv, time);
    if (length(palette) > 0.1) {
      color = palette;
    }

    // Frame overlay
    let frame = easelFrame(uv);
    if (length(frame) > 0.1) {
      color = frame;
    }

    // Vignette
    let vignetteStrength = 1.0 - length(uv - 0.5) * 0.3;
    color *= vignetteStrength;

    return vec4f(color, 0.9);
  }
`;

export const PARTICLE_SHADER = /* wgsl */`
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
    param1: f32,
    param2: f32,
  }

  @group(0) @binding(0) var<uniform> uniforms: Uniforms;
  @group(0) @binding(1) var<storage, read> particles: array<Particle>;

  struct VertexOutput {
    @builtin(position) position: vec4f,
    @location(0) uv: vec2f,
    @location(1) life: f32,
    @location(2) particleType: f32,
    @location(3) param1: f32,
    @location(4) param2: f32,
  }

  @vertex
  fn vertexMain(
    @builtin(vertex_index) vertexIndex: u32,
    @builtin(instance_index) instanceIndex: u32
  ) -> VertexOutput {
    let particle = particles[instanceIndex];

    var corners = array<vec2f, 6>(
      vec2f(-1, -1), vec2f(1, -1), vec2f(-1, 1),
      vec2f(-1, 1), vec2f(1, -1), vec2f(1, 1)
    );

    let corner = corners[vertexIndex];
    let size = particle.size * (0.5 + particle.life / particle.maxLife * 0.5);

    let x = (particle.x / uniforms.width) * 2.0 - 1.0;
    let y = 1.0 - (particle.y / uniforms.height) * 2.0;

    var output: VertexOutput;
    output.position = vec4f(
      x + corner.x * size / uniforms.width,
      y + corner.y * size / uniforms.height,
      0, 1
    );
    output.uv = corner * 0.5 + 0.5;
    output.life = particle.life / particle.maxLife;
    output.particleType = particle.particleType;
    output.param1 = particle.param1;
    output.param2 = particle.param2;

    return output;
  }

  fn hsl2rgb(h: f32, s: f32, l: f32) -> vec3f {
    let hue = h * 6.0;
    let x = 1.0 - abs(hue % 2.0 - 1.0);
    var rgb: vec3f;
    if (hue < 1.0) { rgb = vec3f(1.0, x, 0.0); }
    else if (hue < 2.0) { rgb = vec3f(x, 1.0, 0.0); }
    else if (hue < 3.0) { rgb = vec3f(0.0, 1.0, x); }
    else if (hue < 4.0) { rgb = vec3f(0.0, x, 1.0); }
    else if (hue < 5.0) { rgb = vec3f(x, 0.0, 1.0); }
    else { rgb = vec3f(1.0, 0.0, x); }

    let gray = vec3f(l);
    return mix(gray, rgb, s);
  }

  @fragment
  fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
    let uv = input.uv;
    let center = vec2f(0.5, 0.5);
    let dist = distance(uv, center);
    let life = input.life;
    let pType = i32(input.particleType);
    let time = uniforms.time;

    var color: vec3f;
    var alpha: f32;

    switch (pType) {
      // Paint droplet - colored paint blob
      case 0: {
        let blob = exp(-dist * 4.0);
        let drip = smoothstep(0.6, 0.4, uv.y) * 0.3;
        let hue = input.param1;
        color = hsl2rgb(hue, 0.8, 0.5);
        alpha = (blob + drip) * life;
      }

      // Brush stroke - elongated paint streak
      case 1: {
        let stretch = vec2f(uv.x - 0.5, (uv.y - 0.5) * 0.3);
        let strokeDist = length(stretch);
        let stroke = exp(-strokeDist * 3.0);
        let hue = input.param1;
        color = hsl2rgb(hue, 0.7, 0.55);
        alpha = stroke * life * 0.8;
      }

      // Sparkle - white highlight
      case 2: {
        let twinkle = 0.5 + 0.5 * sin(time * 12.0 + input.param1 * 20.0);
        let star = exp(-dist * 8.0) * twinkle;
        color = vec3f(1.0, 1.0, 0.95);
        alpha = star * life;
      }

      // Blend - color mixing swirl
      case 3: {
        let swirl = exp(-dist * 5.0);
        let rotation = sin(time * 3.0 + dist * 10.0) * 0.2;
        let hue1 = input.param1;
        let hue2 = input.param2;
        let blendHue = mix(hue1, hue2, 0.5 + rotation);
        color = hsl2rgb(blendHue, 0.75, 0.5);
        alpha = swirl * life * 0.9;
      }

      // Splash - paint splatter
      case 4: {
        let angle = atan2(uv.y - 0.5, uv.x - 0.5);
        let irregularity = 1.0 + sin(angle * 7.0) * 0.3;
        let splash = exp(-dist * irregularity * 4.0);
        let hue = input.param1;
        color = hsl2rgb(hue, 0.85, 0.45);
        alpha = splash * life;
      }

      // Spectrum - rainbow particle
      case 5: {
        let rainbow = exp(-dist * 5.0);
        let hue = (input.param1 + time * 0.3) % 1.0;
        color = hsl2rgb(hue, 1.0, 0.55);
        alpha = rainbow * life;
      }

      default: {
        color = vec3f(1.0);
        alpha = 0.0;
      }
    }

    if (alpha < 0.01) {
      discard;
    }

    return vec4f(color, alpha * uniforms.intensity);
  }
`;
