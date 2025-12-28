/**
 * WebGPU Shaders - Island Connect
 * Tropical Ocean / Island Paradise Theme
 * Game #109
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

  // Noise functions for ocean
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

  // Ocean waves
  fn oceanWaves(uv: vec2f, time: f32) -> f32 {
    var waves = 0.0;
    waves += sin(uv.x * 15.0 + time * 2.0) * 0.3;
    waves += sin(uv.y * 12.0 + time * 1.5) * 0.25;
    waves += sin((uv.x + uv.y) * 10.0 + time * 1.8) * 0.2;
    waves += sin((uv.x - uv.y) * 8.0 + time * 2.2) * 0.15;
    return waves * 0.1;
  }

  // Water caustics
  fn caustics(uv: vec2f, time: f32) -> f32 {
    let c1 = sin(uv.x * 30.0 + time * 3.0) * cos(uv.y * 25.0 + time * 2.5);
    let c2 = sin((uv.x + uv.y) * 20.0 + time * 2.0);
    return abs(c1 + c2) * 0.15;
  }

  // Island shape
  fn island(uv: vec2f, center: vec2f, size: vec2f) -> f32 {
    let d = (uv - center) / size;
    let dist = pow(abs(d.x), 2.5) + pow(abs(d.y), 2.5);
    return smoothstep(1.0, 0.6, dist);
  }

  // Palm tree silhouette
  fn palmTree(uv: vec2f, base: vec2f, time: f32) -> f32 {
    // Trunk
    let trunk = uv - base;
    let trunkWidth = 0.008 - trunk.y * 0.003;
    let sway = sin(time * 1.5 + trunk.y * 5.0) * 0.01 * trunk.y;
    let trunkDist = abs(trunk.x - sway) - trunkWidth;
    let trunkMask = step(trunkDist, 0.0) * step(0.0, trunk.y) * step(trunk.y, 0.08);

    // Fronds
    let frondBase = base + vec2f(0.0, 0.08);
    var fronds = 0.0;
    for (var i = 0; i < 5; i++) {
      let angle = f32(i) * 0.7 - 1.4 + sin(time * 1.2 + f32(i)) * 0.1;
      let frondDir = vec2f(cos(angle), sin(angle) * 0.5 + 0.5);
      let frondUV = uv - frondBase;
      let proj = dot(frondUV, frondDir);
      let perp = length(frondUV - frondDir * proj);
      let frondWidth = 0.015 * (1.0 - proj * 8.0);
      if (proj > 0.0 && proj < 0.12 && perp < frondWidth) {
        fronds = 1.0;
      }
    }

    return max(trunkMask, fronds);
  }

  // Clouds
  fn clouds(uv: vec2f, time: f32) -> f32 {
    let cloudUV = uv + vec2f(time * 0.02, 0.0);
    var cloud = 0.0;
    cloud += smoothstep(0.4, 0.6, noise(cloudUV * 3.0)) * 0.6;
    cloud += smoothstep(0.5, 0.7, noise(cloudUV * 5.0 + 10.0)) * 0.3;
    cloud *= step(0.65, uv.y); // Only in sky
    return cloud;
  }

  @fragment
  fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
    let uv = input.uv;
    let time = uniforms.time;
    let intensity = uniforms.intensity;

    // Sky gradient
    let skyTop = vec3f(0.4, 0.7, 0.95);
    let skyBottom = vec3f(0.7, 0.85, 0.95);
    let horizonLine = 0.65;

    var color = vec3f(0.0);

    if (uv.y > horizonLine) {
      // Sky
      let skyT = (uv.y - horizonLine) / (1.0 - horizonLine);
      color = mix(skyBottom, skyTop, skyT);

      // Clouds
      let cloudAmount = clouds(uv, time);
      color = mix(color, vec3f(1.0, 1.0, 1.0), cloudAmount * 0.7);

      // Sun glow
      let sunPos = vec2f(0.8, 0.85);
      let sunDist = length(uv - sunPos);
      let sunGlow = exp(-sunDist * 8.0) * 0.4;
      color += vec3f(1.0, 0.95, 0.8) * sunGlow;

    } else {
      // Ocean
      let oceanT = uv.y / horizonLine;
      let shallowColor = vec3f(0.25, 0.88, 0.82); // Turquoise
      let deepColor = vec3f(0.13, 0.45, 0.75);    // Deep blue
      color = mix(deepColor, shallowColor, oceanT);

      // Wave distortion
      let waveOffset = oceanWaves(uv, time);
      color += vec3f(0.1, 0.15, 0.2) * waveOffset;

      // Caustics
      let causticsVal = caustics(uv, time);
      color += vec3f(0.2, 0.3, 0.35) * causticsVal * oceanT;

      // Foam lines
      let foamLine1 = smoothstep(0.002, 0.0, abs(sin(uv.x * 50.0 + time * 2.0 + uv.y * 30.0) * 0.02 + uv.y - 0.3));
      let foamLine2 = smoothstep(0.002, 0.0, abs(sin(uv.x * 40.0 - time * 1.5 + uv.y * 25.0) * 0.015 + uv.y - 0.45));
      color = mix(color, vec3f(0.95, 0.98, 1.0), (foamLine1 + foamLine2) * 0.3);
    }

    // Islands (simplified silhouettes)
    let island1 = island(uv, vec2f(0.2, 0.6), vec2f(0.08, 0.04));
    let island2 = island(uv, vec2f(0.5, 0.55), vec2f(0.1, 0.05));
    let island3 = island(uv, vec2f(0.8, 0.58), vec2f(0.07, 0.035));

    let islandMask = max(max(island1, island2), island3);
    let sandColor = vec3f(0.96, 0.87, 0.7);
    let grassColor = vec3f(0.3, 0.65, 0.35);

    if (islandMask > 0.0) {
      let islandColor = mix(sandColor, grassColor, smoothstep(0.3, 0.7, islandMask));
      color = mix(color, islandColor, islandMask);
    }

    // Palm trees on islands
    let palm1 = palmTree(uv, vec2f(0.18, 0.62), time);
    let palm2 = palmTree(uv, vec2f(0.52, 0.57), time);
    let palm3 = palmTree(uv, vec2f(0.48, 0.56), time);
    let palm4 = palmTree(uv, vec2f(0.79, 0.595), time);

    let palmMask = max(max(max(palm1, palm2), palm3), palm4);
    color = mix(color, vec3f(0.15, 0.35, 0.15), palmMask);

    // Intensity effect
    color *= 0.85 + intensity * 0.15;

    // Subtle vignette
    let vignette = 1.0 - length(uv - 0.5) * 0.3;
    color *= vignette;

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

    // Type 0: Wave - ripple effect
    if (particleType == 0) {
      let ripple = sin(dist * 15.0 - time * 5.0) * 0.5 + 0.5;
      let ring = smoothstep(0.8, 0.6, dist) * smoothstep(0.2, 0.4, dist);
      alpha *= ring * ripple;
      color = mix(color, vec3f(0.8, 0.95, 1.0), 0.3);
    }
    // Type 1: Splash - water droplet
    else if (particleType == 1) {
      let droplet = 1.0 - smoothstep(0.0, 0.5, dist);
      let highlight = smoothstep(0.6, 0.3, length(uv - vec2f(0.35, 0.35)));
      alpha *= droplet;
      color += vec3f(0.3) * highlight;
    }
    // Type 2: Sand - grainy particle
    else if (particleType == 2) {
      let grain = fract(sin(dot(uv * 10.0, vec2f(12.9898, 78.233))) * 43758.5453);
      alpha *= (1.0 - smoothstep(0.3, 0.5, dist)) * (0.7 + grain * 0.3);
    }
    // Type 3: Sparkle - star twinkle
    else if (particleType == 3) {
      let angle = atan2(uv.y - 0.5, uv.x - 0.5);
      let rays = abs(sin(angle * 4.0 + time * 3.0));
      let core = 1.0 - smoothstep(0.0, 0.3, dist);
      let glow = (1.0 - smoothstep(0.0, 0.5, dist)) * rays;
      alpha *= max(core, glow * 0.5);
      color = vec3f(1.0, 0.98, 0.9);
    }
    // Type 4: Bridge - construction glow
    else if (particleType == 4) {
      let beam = 1.0 - smoothstep(0.0, 0.4, dist);
      let pulse = sin(time * 6.0 + dist * 10.0) * 0.3 + 0.7;
      alpha *= beam * pulse;
      color = mix(vec3f(0.9, 0.7, 0.4), vec3f(1.0, 0.9, 0.6), pulse);
    }
    // Type 5: Palm - leaf fragment
    else if (particleType == 5) {
      let leaf = (1.0 - smoothstep(0.0, 0.4, abs(uv.x - 0.5))) *
                 (1.0 - smoothstep(0.0, 0.5, abs(uv.y - 0.5) * 1.5));
      alpha *= leaf;
      color = vec3f(0.2, 0.5 + sin(time) * 0.1, 0.2);
    }
    else {
      alpha *= 1.0 - smoothstep(0.3, 0.5, dist);
    }

    alpha *= uniforms.intensity;
    return vec4f(color, alpha);
  }
`;
