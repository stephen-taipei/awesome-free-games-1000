/**
 * WGSL Shaders - Word Search
 * Ancient Scrolls Theme
 * Game #030
 */

// Background Shader - Aged Parchment
export const backgroundShader = /* wgsl */ `
  struct Uniforms {
    time: f32,
    aspectRatio: f32,
    reserved1: f32,
    reserved2: f32,
  }

  @group(0) @binding(0) var<uniform> uniforms: Uniforms;

  struct VertexOutput {
    @builtin(position) position: vec4f,
    @location(0) uv: vec2f,
  }

  @vertex
  fn vertexMain(@builtin(vertex_index) vertexIndex: u32) -> VertexOutput {
    var pos = array<vec2f, 6>(
      vec2f(-1.0, -1.0),
      vec2f(1.0, -1.0),
      vec2f(-1.0, 1.0),
      vec2f(-1.0, 1.0),
      vec2f(1.0, -1.0),
      vec2f(1.0, 1.0)
    );

    var output: VertexOutput;
    output.position = vec4f(pos[vertexIndex], 0.0, 1.0);
    output.uv = pos[vertexIndex] * 0.5 + 0.5;
    return output;
  }

  fn hash(p: vec2f) -> f32 {
    return fract(sin(dot(p, vec2f(127.1, 311.7))) * 43758.5453);
  }

  fn noise(p: vec2f) -> f32 {
    let i = floor(p);
    let f = fract(p);
    let u = f * f * (3.0 - 2.0 * f);

    let a = hash(i);
    let b = hash(i + vec2f(1.0, 0.0));
    let c = hash(i + vec2f(0.0, 1.0));
    let d = hash(i + vec2f(1.0, 1.0));

    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
  }

  fn fbm(p: vec2f) -> f32 {
    var value = 0.0;
    var amplitude = 0.5;
    var frequency = 1.0;
    var pos = p;

    for (var i = 0; i < 4; i++) {
      value += amplitude * noise(pos * frequency);
      amplitude *= 0.5;
      frequency *= 2.0;
    }
    return value;
  }

  @fragment
  fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
    let uv = input.uv;
    let t = uniforms.time;

    // Base parchment color
    let parchmentLight = vec3f(0.96, 0.92, 0.82);
    let parchmentDark = vec3f(0.85, 0.78, 0.65);

    // Aged paper texture
    let paperNoise = fbm(uv * 15.0);
    var color = mix(parchmentLight, parchmentDark, paperNoise * 0.4);

    // Edge darkening (aged corners)
    let edgeDist = min(min(uv.x, 1.0 - uv.x), min(uv.y, 1.0 - uv.y));
    let edgeDark = smoothstep(0.0, 0.2, edgeDist);
    color *= 0.7 + edgeDark * 0.3;

    // Coffee stains / age spots
    let stain1 = smoothstep(0.15, 0.0, length(uv - vec2f(0.2, 0.3)) * 2.0);
    let stain2 = smoothstep(0.1, 0.0, length(uv - vec2f(0.8, 0.7)) * 2.5);
    color -= vec3f(0.08, 0.05, 0.02) * (stain1 + stain2 * 0.5);

    // Subtle fiber texture
    let fiberX = sin(uv.x * 200.0 + noise(uv * 50.0) * 5.0) * 0.5 + 0.5;
    let fiberY = sin(uv.y * 150.0 + noise(uv * 40.0) * 4.0) * 0.5 + 0.5;
    let fiber = fiberX * fiberY;
    color += vec3f(0.02) * fiber;

    // Ink splatters
    let splatterGrid = 8.0;
    let splatterUV = fract(uv * splatterGrid);
    let splatterId = floor(uv * splatterGrid);
    let splatterRand = hash(splatterId);
    let splatterVis = step(0.9, splatterRand);
    let splatterDist = length(splatterUV - vec2f(0.5));
    let splatter = smoothstep(0.2, 0.0, splatterDist) * splatterVis;
    color -= vec3f(0.15, 0.1, 0.05) * splatter * 0.3;

    // Candlelight flicker simulation
    let flicker = sin(t * 3.0) * 0.02 + sin(t * 7.0) * 0.01;
    color += vec3f(0.02, 0.01, 0.0) * flicker;

    // Vignette
    let vignetteDist = length((uv - 0.5) * 1.5);
    let vignette = 1.0 - smoothstep(0.5, 1.2, vignetteDist);
    color *= vignette * 0.3 + 0.7;

    return vec4f(color, 1.0);
  }
`;

// Particle Shader
export const particleShader = /* wgsl */ `
  struct Uniforms {
    time: f32,
    aspectRatio: f32,
    reserved1: f32,
    reserved2: f32,
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
    colorR: f32,
    colorG: f32,
    colorB: f32,
    colorA: f32,
  }

  @group(0) @binding(0) var<uniform> uniforms: Uniforms;
  @group(0) @binding(1) var<storage, read> particles: array<Particle>;

  struct VertexOutput {
    @builtin(position) position: vec4f,
    @location(0) uv: vec2f,
    @location(1) @interpolate(flat) instanceId: u32,
  }

  @vertex
  fn vertexMain(
    @builtin(vertex_index) vertexIndex: u32,
    @builtin(instance_index) instanceIndex: u32
  ) -> VertexOutput {
    let p = particles[instanceIndex];

    var localPos = array<vec2f, 6>(
      vec2f(-1.0, -1.0),
      vec2f(1.0, -1.0),
      vec2f(-1.0, 1.0),
      vec2f(-1.0, 1.0),
      vec2f(1.0, -1.0),
      vec2f(1.0, 1.0)
    );

    let local = localPos[vertexIndex];
    let worldX = p.x + local.x * p.size;
    let worldY = p.y + local.y * p.size;

    let clipX = worldX * 2.0 - 1.0;
    let clipY = 1.0 - worldY * 2.0;

    var output: VertexOutput;
    output.position = vec4f(clipX, clipY, 0.0, 1.0);
    output.uv = local;
    output.instanceId = instanceIndex;
    return output;
  }

  @fragment
  fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
    let p = particles[input.instanceId];
    let uv = input.uv;
    let dist = length(uv);
    let t = uniforms.time;
    let pType = i32(p.particleType);

    var color = vec3f(p.colorR, p.colorG, p.colorB);
    var alpha = p.colorA;

    if (pType == 0) {
      // Found word - ink splatter
      let splat = exp(-dist * dist * 3.0);
      let drip = max(0.0, 1.0 - abs(uv.x) * 3.0) * step(0.0, uv.y);
      alpha *= splat + drip * 0.3;
    } else if (pType == 1) {
      // Selection trail - quill stroke
      let stroke = exp(-pow(abs(uv.y), 1.5) * 5.0) * exp(-dist * 2.0);
      alpha *= stroke;
    } else if (pType == 2) {
      // Victory - golden sparkle
      let sparkle = sin(dist * 15.0 - t * 8.0) * 0.5 + 0.5;
      let star = exp(-dist * dist * 4.0) * sparkle;
      alpha *= star;
    } else {
      // Dust motes
      let glow = exp(-dist * dist * 5.0);
      let drift = sin(t * 2.0 + p.x * 20.0) * 0.2 + 0.8;
      alpha *= glow * drift;
    }

    return vec4f(color, alpha);
  }
`;

// Victory Shader - Illuminated Manuscript
export const victoryShader = /* wgsl */ `
  struct Uniforms {
    time: f32,
    intensity: f32,
    reserved1: f32,
    reserved2: f32,
  }

  @group(0) @binding(0) var<uniform> uniforms: Uniforms;

  struct VertexOutput {
    @builtin(position) position: vec4f,
    @location(0) uv: vec2f,
  }

  @vertex
  fn vertexMain(@builtin(vertex_index) vertexIndex: u32) -> VertexOutput {
    var pos = array<vec2f, 6>(
      vec2f(-1.0, -1.0),
      vec2f(1.0, -1.0),
      vec2f(-1.0, 1.0),
      vec2f(-1.0, 1.0),
      vec2f(1.0, -1.0),
      vec2f(1.0, 1.0)
    );

    var output: VertexOutput;
    output.position = vec4f(pos[vertexIndex], 0.0, 1.0);
    output.uv = pos[vertexIndex] * 0.5 + 0.5;
    return output;
  }

  @fragment
  fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
    let uv = input.uv;
    let t = uniforms.time;
    let intensity = uniforms.intensity;

    if (intensity < 0.01) {
      discard;
    }

    let center = vec2f(0.5, 0.5);
    let dist = length(uv - center);

    // Golden illumination burst
    let burst = exp(-dist * dist * 3.0) * intensity;

    // Decorative border glow
    let borderDist = min(min(uv.x, 1.0 - uv.x), min(uv.y, 1.0 - uv.y));
    let border = smoothstep(0.05, 0.0, borderDist) * sin(t * 5.0 + uv.x * 20.0 + uv.y * 20.0) * 0.5 + 0.5;

    let gold = vec3f(1.0, 0.85, 0.4);
    let alpha = (burst * 0.5 + border * 0.3) * intensity;

    return vec4f(gold, alpha);
  }
`;
