/**
 * WGSL Shaders - Mirror World
 * Crystal / Reflection / Dimensional Theme
 * Game #068
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

  // Noise function
  fn hash(p: vec2f) -> f32 {
    var p3 = fract(vec3f(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
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

  // Crystal pattern
  fn crystalPattern(uv: vec2f, time: f32) -> f32 {
    let scale = 8.0;
    var p = uv * scale;

    // Voronoi-like crystal structure
    var minDist = 1.0;
    for (var i = -1; i <= 1; i++) {
      for (var j = -1; j <= 1; j++) {
        let cell = floor(p) + vec2f(f32(i), f32(j));
        let cellCenter = cell + 0.5 + vec2f(
          hash(cell) * 0.6 - 0.3,
          hash(cell.yx) * 0.6 - 0.3
        );
        let dist = length(p - cellCenter);
        minDist = min(minDist, dist);
      }
    }

    return minDist;
  }

  // Mirror line effect
  fn mirrorLine(uv: vec2f, time: f32) -> f32 {
    let centerX = 0.5;
    let dist = abs(uv.x - centerX);
    let glow = exp(-dist * 20.0);
    let pulse = sin(time * 2.0) * 0.3 + 0.7;
    let shimmer = sin(uv.y * 50.0 + time * 5.0) * 0.1 + 0.9;
    return glow * pulse * shimmer;
  }

  // Reflection ripples
  fn reflectionRipple(uv: vec2f, time: f32) -> f32 {
    let center = vec2f(0.5, 0.5);
    let dist = length(uv - center);
    let ripple = sin(dist * 30.0 - time * 3.0) * 0.5 + 0.5;
    return ripple * exp(-dist * 3.0);
  }

  // Prismatic refraction
  fn prismRefraction(uv: vec2f, time: f32) -> vec3f {
    let angle = atan2(uv.y - 0.5, uv.x - 0.5) + time * 0.5;
    let hue = fract(angle / 6.28318);

    // Rainbow colors
    let r = abs(hue * 6.0 - 3.0) - 1.0;
    let g = 2.0 - abs(hue * 6.0 - 2.0);
    let b = 2.0 - abs(hue * 6.0 - 4.0);

    return clamp(vec3f(r, g, b), vec3f(0.0), vec3f(1.0));
  }

  @fragment
  fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
    let uv = input.uv;
    let time = uniforms.time;

    // Determine which side (left or right of mirror)
    let isLeftSide = uv.x < 0.5;

    // Base colors for each side
    let leftColor = vec3f(0.1, 0.2, 0.4);   // Deep blue
    let rightColor = vec3f(0.4, 0.1, 0.2);  // Deep red

    // Crystal gradient
    let crystalBase = crystalPattern(uv, time * 0.3);
    let crystalShine = 1.0 - smoothstep(0.0, 0.3, crystalBase);

    // Background color based on side
    var bgColor: vec3f;
    if (isLeftSide) {
      bgColor = mix(leftColor, vec3f(0.3, 0.5, 0.8), crystalShine * 0.4);
    } else {
      bgColor = mix(rightColor, vec3f(0.8, 0.3, 0.5), crystalShine * 0.4);
    }

    // Add subtle noise texture
    let noiseVal = noise(uv * 100.0 + time * 0.5) * 0.05;
    bgColor += noiseVal;

    // Mirror line glow
    let mirrorGlow = mirrorLine(uv, time);
    let mirrorColor = vec3f(0.9, 0.95, 1.0);
    bgColor = mix(bgColor, mirrorColor, mirrorGlow * 0.6);

    // Add prism effect near mirror
    let distFromMirror = abs(uv.x - 0.5);
    if (distFromMirror < 0.1) {
      let prismIntensity = (0.1 - distFromMirror) / 0.1;
      let prismColor = prismRefraction(uv, time);
      bgColor = mix(bgColor, prismColor, prismIntensity * 0.3);
    }

    // Reflection ripples
    let ripple = reflectionRipple(uv, time);
    bgColor += ripple * 0.1;

    // Crystal sparkles
    let sparkle = pow(hash(uv * 200.0 + fract(time)), 20.0);
    bgColor += sparkle * 0.3;

    // Vignette
    let vignette = 1.0 - length(uv - 0.5) * 0.8;
    bgColor *= vignette;

    return vec4f(bgColor, 1.0);
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
    @location(4) rotation: f32,
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
    let size = input.size / uniforms.width * 2.0;

    // Rotation
    let cos_r = cos(input.rotation);
    let sin_r = sin(input.rotation);
    let rotated = vec2f(
      corner.x * cos_r - corner.y * sin_r,
      corner.x * sin_r + corner.y * cos_r
    );

    var output: VertexOutput;
    output.position = vec4f(input.position + rotated * size, 0.0, 1.0);
    output.uv = corner;
    output.color = input.color;
    output.particleType = input.particleType;
    output.life = input.life;
    output.rotation = input.rotation;
    return output;
  }

  @fragment
  fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
    let uv = input.uv;
    let dist = length(uv);
    let time = uniforms.time;
    let pType = i32(input.particleType);

    var alpha: f32;
    var color = input.color.rgb;

    // Type 0: Mirror shard - angular crystal shape
    if (pType == 0) {
      let angle = atan2(uv.y, uv.x);
      let sides = 6.0;
      let shardDist = cos(floor(0.5 + angle / 6.28318 * sides) * 6.28318 / sides - angle) * dist;
      alpha = 1.0 - smoothstep(0.3, 0.8, shardDist);
      // Crystalline shimmer
      let shimmer = sin(angle * sides + time * 5.0) * 0.3 + 0.7;
      color *= shimmer;
    }
    // Type 1: Light ray - elongated beam
    else if (pType == 1) {
      let beam = exp(-abs(uv.y) * 3.0) * (1.0 - smoothstep(0.0, 1.0, abs(uv.x)));
      alpha = beam;
      color += 0.3; // Extra brightness
    }
    // Type 2: Sparkle - star shape
    else if (pType == 2) {
      let angle = atan2(uv.y, uv.x);
      let star = abs(sin(angle * 4.0 + time * 3.0)) * 0.5 + 0.3;
      let sparkle = star * exp(-dist * 2.5);
      alpha = sparkle;
      color = vec3f(1.0); // Pure white sparkle
    }
    // Type 3: Sync wave - circular pulse
    else if (pType == 3) {
      let ring = abs(dist - 0.5);
      alpha = exp(-ring * 10.0) * (sin(dist * 20.0 - time * 5.0) * 0.5 + 0.5);
    }
    // Type 4: Dimensional rift - swirling portal
    else if (pType == 4) {
      let angle = atan2(uv.y, uv.x) + time * 2.0;
      let spiral = sin(angle * 3.0 + dist * 10.0);
      alpha = (1.0 - dist) * (spiral * 0.3 + 0.7);
      // Color shift
      color = mix(color, vec3f(0.5, 0.0, 1.0), spiral * 0.5 + 0.5);
    }
    // Type 5: Prism - rainbow refraction
    else if (pType == 5) {
      alpha = 1.0 - smoothstep(0.0, 1.0, dist);
      // Rainbow based on angle
      let angle = atan2(uv.y, uv.x) / 6.28318 + 0.5;
      let hue = fract(angle + time * 0.5);
      let r = abs(hue * 6.0 - 3.0) - 1.0;
      let g = 2.0 - abs(hue * 6.0 - 2.0);
      let b = 2.0 - abs(hue * 6.0 - 4.0);
      color = clamp(vec3f(r, g, b), vec3f(0.0), vec3f(1.0));
    }
    // Default: soft glow
    else {
      alpha = 1.0 - smoothstep(0.0, 1.0, dist);
    }

    alpha *= input.color.a * input.life;

    return vec4f(color, alpha);
  }
`;
