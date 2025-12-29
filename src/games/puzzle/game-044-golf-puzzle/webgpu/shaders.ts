/**
 * WebGPU Shaders - Golf Puzzle
 * Lush Golf Course / Country Club Theme
 * Game #044
 */

export const backgroundShader = /* wgsl */ `
  struct Uniforms {
    time: f32,
    aspect: f32,
    pad1: f32,
    pad2: f32,
  }

  @group(0) @binding(0) var<uniform> uniforms: Uniforms;

  struct VertexOutput {
    @builtin(position) position: vec4f,
    @location(0) uv: vec2f,
  }

  @vertex
  fn vertexMain(@builtin(vertex_index) vertexIndex: u32) -> VertexOutput {
    var positions = array<vec2f, 6>(
      vec2f(-1.0, -1.0), vec2f(1.0, -1.0), vec2f(-1.0, 1.0),
      vec2f(-1.0, 1.0), vec2f(1.0, -1.0), vec2f(1.0, 1.0)
    );

    var output: VertexOutput;
    output.position = vec4f(positions[vertexIndex], 0.0, 1.0);
    output.uv = positions[vertexIndex] * 0.5 + 0.5;
    return output;
  }

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
      mix(hash(i + vec2f(0.0, 0.0)), hash(i + vec2f(1.0, 0.0)), u.x),
      mix(hash(i + vec2f(0.0, 1.0)), hash(i + vec2f(1.0, 1.0)), u.x),
      u.y
    );
  }

  // Grass pattern
  fn grassPattern(uv: vec2f, time: f32) -> f32 {
    let scale = 80.0;
    var p = uv * scale;

    // Wind sway
    let windOffset = sin(uv.x * 10.0 + time * 2.0) * 0.1;
    p.y += windOffset;

    // Grass blade pattern
    let blade = fract(p.x);
    let bladeHeight = noise(floor(p) * 0.1) * 0.5 + 0.5;
    let grassMask = smoothstep(bladeHeight, bladeHeight - 0.3, fract(p.y));

    // Tip highlighting
    let tip = smoothstep(bladeHeight - 0.1, bladeHeight, fract(p.y));

    return grassMask * (0.8 + tip * 0.4);
  }

  // Cloud pattern
  fn cloud(uv: vec2f, center: vec2f, size: vec2f, time: f32) -> f32 {
    let drift = vec2f(time * 0.02, 0.0);
    let p = (uv - center - drift) / size;

    // Multiple cloud puffs
    var c = 0.0;
    c += smoothstep(1.0, 0.0, length(p)) * 0.5;
    c += smoothstep(1.0, 0.0, length(p - vec2f(0.3, 0.1))) * 0.4;
    c += smoothstep(1.0, 0.0, length(p + vec2f(0.25, 0.05))) * 0.35;
    c += smoothstep(1.0, 0.0, length(p - vec2f(-0.2, -0.1))) * 0.3;

    return clamp(c, 0.0, 1.0);
  }

  // Sun rays
  fn sunRays(uv: vec2f, sunPos: vec2f, time: f32) -> f32 {
    let toSun = uv - sunPos;
    let angle = atan2(toSun.y, toSun.x);
    let dist = length(toSun);

    let rays = sin(angle * 12.0 + time * 0.5) * 0.5 + 0.5;
    let fade = smoothstep(0.8, 0.0, dist);

    return rays * fade * 0.15;
  }

  // Tree silhouette
  fn tree(uv: vec2f, pos: vec2f, size: f32, time: f32) -> f32 {
    let p = (uv - pos) / size;

    // Sway with wind
    let sway = sin(time * 1.5 + pos.x * 10.0) * 0.05;
    let swayedP = vec2f(p.x - sway * (1.0 - p.y), p.y);

    // Trunk
    let trunk = step(abs(swayedP.x), 0.05) * step(swayedP.y, 0.0) * step(-0.3, swayedP.y);

    // Foliage (triangular)
    let foliage = step(swayedP.y, 0.0) * step(0.0, swayedP.y + 0.5);
    let foliageShape = step(abs(swayedP.x), (swayedP.y + 0.5) * 0.5);

    return trunk * 0.3 + foliage * foliageShape * 0.4;
  }

  // Golf course fairway pattern
  fn fairwayStripes(uv: vec2f) -> f32 {
    let stripe = sin(uv.x * 30.0) * 0.5 + 0.5;
    return mix(0.9, 1.0, stripe);
  }

  @fragment
  fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
    var uv = input.uv;
    uv.x *= uniforms.aspect;
    let time = uniforms.time;

    // Sky gradient
    let skyTop = vec3f(0.4, 0.7, 1.0);
    let skyBottom = vec3f(0.7, 0.85, 0.95);
    let horizon = 0.4;

    var color: vec3f;

    if (uv.y > horizon) {
      // Sky
      let skyT = (uv.y - horizon) / (1.0 - horizon);
      color = mix(skyBottom, skyTop, skyT);

      // Sun
      let sunPos = vec2f(0.8 * uniforms.aspect, 0.85);
      let sunDist = length(uv - sunPos);
      let sun = smoothstep(0.08, 0.0, sunDist);
      let sunGlow = smoothstep(0.25, 0.0, sunDist) * 0.5;
      color = mix(color, vec3f(1.0, 0.95, 0.8), sun + sunGlow);

      // Sun rays
      color += vec3f(1.0, 0.9, 0.7) * sunRays(uv, sunPos, time);

      // Clouds
      color = mix(color, vec3f(1.0, 1.0, 1.0), cloud(uv, vec2f(0.3 * uniforms.aspect, 0.75), vec2f(0.15, 0.06), time));
      color = mix(color, vec3f(1.0, 1.0, 1.0), cloud(uv, vec2f(0.6 * uniforms.aspect, 0.8), vec2f(0.12, 0.05), time * 0.8));
      color = mix(color, vec3f(1.0, 1.0, 1.0), cloud(uv, vec2f(0.9 * uniforms.aspect, 0.7), vec2f(0.1, 0.04), time * 1.2));
    } else {
      // Ground/grass
      let grassGreen = vec3f(0.2, 0.5, 0.15);
      let grassLight = vec3f(0.35, 0.65, 0.25);

      // Base grass color with fairway stripes
      let stripes = fairwayStripes(uv);
      color = mix(grassGreen, grassLight, stripes * 0.3);

      // Grass texture
      let grass = grassPattern(uv, time);
      color = mix(color * 0.85, color * 1.1, grass);

      // Distance fade (atmospheric perspective)
      let distFade = smoothstep(horizon, horizon - 0.15, uv.y);
      color = mix(color, skyBottom * 0.8, distFade * 0.5);
    }

    // Distant trees
    let treeLine = horizon - 0.02;
    if (uv.y > treeLine - 0.08 && uv.y < treeLine + 0.02) {
      let treeColor = vec3f(0.1, 0.25, 0.1);
      var trees = 0.0;

      for (var i = 0; i < 8; i++) {
        let treeX = (f32(i) + 0.5) / 8.0 * uniforms.aspect;
        let treeSize = 0.05 + hash(vec2f(f32(i), 0.0)) * 0.03;
        trees = max(trees, tree(uv, vec2f(treeX, treeLine), treeSize, time));
      }

      color = mix(color, treeColor, trees);
    }

    // Subtle vignette
    let center = vec2f(0.5 * uniforms.aspect, 0.5);
    let vignette = 1.0 - length(uv - center) * 0.3;
    color *= vignette;

    return vec4f(color, 1.0);
  }
`;

export const particleShader = /* wgsl */ `
  struct Uniforms {
    time: f32,
    aspect: f32,
    pad1: f32,
    pad2: f32,
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
    a: f32,
  }

  @group(0) @binding(0) var<uniform> uniforms: Uniforms;
  @group(0) @binding(1) var<storage, read> particles: array<Particle>;

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
    @builtin(instance_index) instanceIndex: u32
  ) -> VertexOutput {
    let quad = array<vec2f, 6>(
      vec2f(-1.0, -1.0), vec2f(1.0, -1.0), vec2f(-1.0, 1.0),
      vec2f(-1.0, 1.0), vec2f(1.0, -1.0), vec2f(1.0, 1.0)
    );

    let p = particles[instanceIndex];
    let lifeRatio = p.life / p.maxLife;
    let size = p.size * lifeRatio;

    var pos = quad[vertexIndex] * size;
    pos.x /= uniforms.aspect;
    pos += vec2f(p.x * 2.0 - 1.0, 1.0 - p.y * 2.0);

    var output: VertexOutput;
    output.position = vec4f(pos, 0.0, 1.0);
    output.uv = quad[vertexIndex];
    output.color = vec4f(p.r, p.g, p.b, p.a * lifeRatio);
    output.particleType = p.particleType;
    output.life = lifeRatio;
    return output;
  }

  @fragment
  fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
    let dist = length(input.uv);
    let time = uniforms.time;
    var alpha = 0.0;
    var color = input.color.rgb;

    // Type 0: Grass clipping - small green bits
    if (input.particleType < 0.5) {
      let blade = step(abs(input.uv.x), 0.15) * step(abs(input.uv.y), 0.5);
      alpha = blade * input.life;
    }
    // Type 1: Ball trail - white blur
    else if (input.particleType < 1.5) {
      alpha = smoothstep(1.0, 0.0, dist) * input.life * 0.6;
      color = vec3f(1.0, 1.0, 1.0);
    }
    // Type 2: Victory - confetti
    else if (input.particleType < 2.5) {
      let rect = step(abs(input.uv.x), 0.4) * step(abs(input.uv.y), 0.6);
      alpha = rect * input.life;
      // Spinning effect
      let spin = sin(time * 10.0 + input.uv.x * 5.0) * 0.5 + 0.5;
      alpha *= 0.7 + spin * 0.3;
    }
    // Type 3: Ambient - pollen/dust
    else if (input.particleType < 3.5) {
      alpha = smoothstep(1.0, 0.0, dist) * input.life * 0.3;
      // Gentle sparkle
      alpha *= 0.8 + sin(time * 5.0 + dist * 3.0) * 0.2;
    }
    // Type 4: Impact - dirt splash
    else {
      let splash = smoothstep(0.8, 0.0, dist);
      alpha = splash * input.life;
      // Add some grit texture
      alpha *= 0.7 + sin(input.uv.x * 20.0) * 0.3;
    }

    return vec4f(color, alpha * input.color.a);
  }
`;

export const victoryShader = /* wgsl */ `
  struct Uniforms {
    time: f32,
    intensity: f32,
    pad1: f32,
    pad2: f32,
  }

  @group(0) @binding(0) var<uniform> uniforms: Uniforms;

  struct VertexOutput {
    @builtin(position) position: vec4f,
    @location(0) uv: vec2f,
  }

  @vertex
  fn vertexMain(@builtin(vertex_index) vertexIndex: u32) -> VertexOutput {
    var positions = array<vec2f, 6>(
      vec2f(-1.0, -1.0), vec2f(1.0, -1.0), vec2f(-1.0, 1.0),
      vec2f(-1.0, 1.0), vec2f(1.0, -1.0), vec2f(1.0, 1.0)
    );

    var output: VertexOutput;
    output.position = vec4f(positions[vertexIndex], 0.0, 1.0);
    output.uv = positions[vertexIndex] * 0.5 + 0.5;
    return output;
  }

  @fragment
  fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
    let time = uniforms.time;
    let intensity = uniforms.intensity;
    let uv = input.uv;

    // Radial burst from hole position (center-bottom)
    let center = vec2f(0.5, 0.7);
    let dist = length(uv - center);

    // Golden rays
    let angle = atan2(uv.y - center.y, uv.x - center.x);
    let rays = sin(angle * 16.0 + time * 3.0) * 0.5 + 0.5;
    let rayFade = smoothstep(0.8, 0.0, dist);

    // Expanding rings
    let ring = sin(dist * 20.0 - time * 8.0) * 0.5 + 0.5;
    let ringFade = smoothstep(0.6, 0.0, dist);

    // Golden color
    let gold = vec3f(1.0, 0.85, 0.3);
    let white = vec3f(1.0, 1.0, 0.9);

    let color = mix(gold, white, rays * 0.5);

    let alpha = (rays * rayFade * 0.4 + ring * ringFade * 0.3) * intensity;

    return vec4f(color, alpha);
  }
`;
