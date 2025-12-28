/**
 * WGSL Shaders - Block Tower
 * Neon Skyline Theme
 * Game #028
 */

// Background Shader - Night City Skyline
export const backgroundShader = /* wgsl */ `
  struct Uniforms {
    time: f32,
    aspectRatio: f32,
    cameraY: f32,
    reserved: f32,
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

  fn hash(p: f32) -> f32 {
    return fract(sin(p * 127.1) * 43758.5453);
  }

  @fragment
  fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
    let uv = input.uv;
    let t = uniforms.time;

    // Night sky gradient
    let skyGrad = mix(
      vec3f(0.0, 0.02, 0.08),  // Deep blue at bottom
      vec3f(0.02, 0.0, 0.05),  // Purple at top
      uv.y
    );
    var color = skyGrad;

    // Stars
    let starGrid = 50.0;
    let starUV = fract(uv * starGrid);
    let starId = floor(uv * starGrid);
    let starHash = hash(starId.x * 100.0 + starId.y);
    let starVisible = step(0.95, starHash);
    let starTwinkle = sin(t * 3.0 + starHash * 10.0) * 0.5 + 0.5;
    let starDist = length(starUV - vec2f(0.5));
    let star = smoothstep(0.1, 0.0, starDist) * starVisible * starTwinkle;
    color += vec3f(1.0, 1.0, 0.9) * star * 0.5;

    // City silhouette in background
    let cityX = uv.x * 20.0;
    let cityHeight = 0.1 + 0.1 * hash(floor(cityX));
    let citySilhouette = step(uv.y, cityHeight);
    color = mix(color, vec3f(0.01, 0.01, 0.02), citySilhouette);

    // Windows in buildings
    if (citySilhouette > 0.5) {
      let winX = fract(cityX * 4.0);
      let winY = fract(uv.y * 40.0);
      let winOn = step(0.7, hash(floor(cityX * 4.0) + floor(uv.y * 40.0) * 100.0 + floor(t * 0.5)));
      let winGlow = smoothstep(0.4, 0.3, abs(winX - 0.5)) * smoothstep(0.4, 0.3, abs(winY - 0.5));
      color += vec3f(1.0, 0.8, 0.4) * winGlow * winOn * 0.3;
    }

    // Ambient glow from below
    let groundGlow = smoothstep(0.3, 0.0, uv.y);
    color += vec3f(0.1, 0.0, 0.15) * groundGlow * 0.3;

    // Scanning line effect
    let scanY = fract(t * 0.1 + uv.y);
    let scanLine = smoothstep(0.01, 0.0, abs(uv.y - scanY)) * 0.1;
    color += vec3f(0.0, 0.5, 1.0) * scanLine;

    return vec4f(color, 1.0);
  }
`;

// Particle Shader
export const particleShader = /* wgsl */ `
  struct Uniforms {
    time: f32,
    aspectRatio: f32,
    cameraY: f32,
    reserved: f32,
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
      // Landing impact - burst
      let burst = exp(-dist * dist * 3.0);
      let ring = smoothstep(0.02, 0.0, abs(dist - 0.6));
      alpha *= burst + ring * 0.5;
    } else if (pType == 1) {
      // Fall debris
      let square = max(
        smoothstep(0.5, 0.4, abs(uv.x)),
        smoothstep(0.5, 0.4, abs(uv.y))
      ) * min(
        smoothstep(0.5, 0.4, abs(uv.x)),
        smoothstep(0.5, 0.4, abs(uv.y))
      );
      alpha *= square;
    } else if (pType == 2) {
      // Height achievement sparkle
      let sparkle = sin(dist * 20.0 - t * 10.0) * 0.5 + 0.5;
      let star = max(
        exp(-pow(abs(uv.x), 0.5) * 3.0) * exp(-pow(abs(uv.y), 2.0) * 8.0),
        exp(-pow(abs(uv.y), 0.5) * 3.0) * exp(-pow(abs(uv.x), 2.0) * 8.0)
      );
      alpha *= (sparkle * 0.3 + star * 0.7) * exp(-dist * dist);
    } else {
      // Ambient city particles
      let glow = exp(-dist * dist * 4.0);
      let flicker = sin(t * 10.0 + p.x * 50.0) * 0.2 + 0.8;
      alpha *= glow * flicker;
    }

    return vec4f(color, alpha);
  }
`;

// Block Glow Shader
export const blockGlowShader = /* wgsl */ `
  struct Uniforms {
    time: f32,
    numBlocks: f32,
    cameraY: f32,
    reserved: f32,
  }

  struct BlockData {
    x: f32,
    y: f32,
    w: f32,
    h: f32,
    colorR: f32,
    colorG: f32,
    colorB: f32,
    isStatic: f32,
  }

  @group(0) @binding(0) var<uniform> uniforms: Uniforms;
  @group(0) @binding(1) var<storage, read> blocks: array<BlockData>;

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
    let b = blocks[instanceIndex];

    // Expand for glow
    let padding = 0.03;

    var localPos = array<vec2f, 6>(
      vec2f(0.0 - padding, 0.0 - padding),
      vec2f(1.0 + padding, 0.0 - padding),
      vec2f(0.0 - padding, 1.0 + padding),
      vec2f(0.0 - padding, 1.0 + padding),
      vec2f(1.0 + padding, 0.0 - padding),
      vec2f(1.0 + padding, 1.0 + padding)
    );

    let local = localPos[vertexIndex];

    // Convert block position to normalized coords
    let worldX = b.x + local.x * b.w;
    let worldY = (b.y + uniforms.cameraY) + local.y * b.h;

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
    let b = blocks[input.instanceId];
    let uv = input.uv;
    let t = uniforms.time;

    let color = vec3f(b.colorR, b.colorG, b.colorB);

    // Check if inside block
    let inside = step(0.0, uv.x) * step(uv.x, 1.0) * step(0.0, uv.y) * step(uv.y, 1.0);

    // Edge glow
    let edgeX = min(uv.x, 1.0 - uv.x);
    let edgeY = min(uv.y, 1.0 - uv.y);
    let edge = min(edgeX, edgeY);
    let edgeGlow = smoothstep(0.1, 0.0, edge);

    // Outer glow
    let distFromCenter = max(abs(uv.x - 0.5) - 0.5, abs(uv.y - 0.5) - 0.5);
    let outerGlow = smoothstep(0.03, 0.0, distFromCenter);

    // Static blocks have softer glow
    let glowIntensity = select(0.8, 0.3, b.isStatic > 0.5);

    // Pulse for moving block
    let pulse = select(sin(t * 5.0) * 0.2 + 0.8, 1.0, b.isStatic > 0.5);

    let alpha = (inside * 0.9 + edgeGlow * 0.6 + outerGlow * glowIntensity) * pulse;

    return vec4f(color * 1.2, alpha);
  }
`;

// Game Over Shader
export const gameOverShader = /* wgsl */ `
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

    // Red danger vignette
    let dist = length(uv - vec2f(0.5));
    let vignette = smoothstep(0.3, 0.8, dist);

    // Shake effect simulated by warped color
    let shake = sin(t * 30.0) * 0.1;

    let color = vec3f(1.0, 0.1, 0.1);
    let alpha = vignette * intensity * 0.5;

    return vec4f(color, alpha);
  }
`;
