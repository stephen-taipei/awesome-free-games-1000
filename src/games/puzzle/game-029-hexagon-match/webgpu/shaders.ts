/**
 * WGSL Shaders - Hexagon Match
 * Crystalline Honeycomb Theme
 * Game #029
 */

// Background Shader - Honeycomb Pattern
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

  // Hexagonal distance function
  fn hexDist(p: vec2f) -> f32 {
    let q = abs(p);
    return max(q.x * 0.866025 + q.y * 0.5, q.y);
  }

  fn hexCoord(uv: vec2f, scale: f32) -> vec3f {
    let r = vec2f(1.0, 1.73205);
    let h = r * 0.5;
    let a = (uv * scale) % r - h;
    let b = ((uv * scale) - h) % r - h;

    let gv = select(b, a, length(a) < length(b));
    let id = (uv * scale) - gv;

    return vec3f(gv.x, gv.y, hexDist(gv));
  }

  @fragment
  fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
    let uv = input.uv;
    let t = uniforms.time;

    // Dark amber gradient background
    let gradY = uv.y;
    var color = mix(
      vec3f(0.08, 0.04, 0.02),  // Deep brown at bottom
      vec3f(0.12, 0.06, 0.02),  // Slightly lighter at top
      gradY
    );

    // Honeycomb grid
    let hex1 = hexCoord(uv, 12.0);
    let hex2 = hexCoord(uv + vec2f(0.0, t * 0.02), 8.0);

    // Cell edges with golden glow
    let edge1 = smoothstep(0.45, 0.42, hex1.z);
    let edge2 = smoothstep(0.42, 0.38, hex1.z);
    let cellEdge = edge1 - edge2;

    // Animated golden pulse
    let cellId = hex1.x * 17.0 + hex1.y * 31.0;
    let pulse = sin(t * 2.0 + hash(vec2f(cellId, 0.0)) * 6.28) * 0.5 + 0.5;

    // Golden amber color for honeycomb edges
    let honeyGold = vec3f(1.0, 0.7, 0.2);
    let honeyAmber = vec3f(0.9, 0.5, 0.1);

    color += cellEdge * mix(honeyAmber, honeyGold, pulse) * 0.15;

    // Secondary layer - crystalline shimmer
    let shimmer = smoothstep(0.5, 0.48, hex2.z);
    let shimmerPulse = sin(t * 3.0 + hex2.x * 10.0 + hex2.y * 10.0) * 0.5 + 0.5;
    color += shimmer * vec3f(1.0, 0.9, 0.6) * shimmerPulse * 0.05;

    // Radial vignette with warm glow
    let center = vec2f(0.5, 0.4);
    let dist = length(uv - center);
    let vignette = 1.0 - smoothstep(0.3, 0.8, dist);
    color += vec3f(0.15, 0.08, 0.02) * vignette * 0.3;

    // Floating crystal particles
    let particleGrid = 30.0;
    let particleUV = fract(uv * particleGrid + vec2f(t * 0.1, t * 0.05));
    let particleId = floor(uv * particleGrid);
    let particleRand = hash(particleId);
    let particleVis = step(0.92, particleRand);
    let particleDist = length(particleUV - vec2f(0.5));
    let particle = smoothstep(0.15, 0.0, particleDist) * particleVis;
    let sparkle = sin(t * 5.0 + particleRand * 10.0) * 0.5 + 0.5;
    color += vec3f(1.0, 0.9, 0.5) * particle * sparkle * 0.4;

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
      // Place effect - hexagonal crystalline burst
      let angle = atan2(uv.y, uv.x);
      let hex = cos(angle * 3.0) * 0.2 + 0.8;
      let crystal = exp(-dist * dist * 3.0) * hex;
      let ring = smoothstep(0.02, 0.0, abs(dist - 0.5 * (1.0 - p.life / p.maxLife)));
      alpha *= crystal + ring * 0.5;
    } else if (pType == 1) {
      // Clear effect - dissolving honey
      let wave = sin(dist * 20.0 - t * 10.0) * 0.5 + 0.5;
      let dissolve = exp(-dist * dist * 2.0) * wave;
      alpha *= dissolve;
    } else if (pType == 2) {
      // Drag trail - golden sparkle
      let sparkle = sin(dist * 15.0 + t * 8.0) * 0.5 + 0.5;
      let trail = exp(-dist * dist * 4.0) * sparkle;
      alpha *= trail;
    } else {
      // Ambient crystal dust
      let glow = exp(-dist * dist * 5.0);
      let twinkle = sin(t * 6.0 + p.x * 50.0) * 0.3 + 0.7;
      alpha *= glow * twinkle;
    }

    return vec4f(color, alpha);
  }
`;

// Hex Glow Shader
export const hexGlowShader = /* wgsl */ `
  struct Uniforms {
    time: f32,
    numHexes: f32,
    centerX: f32,
    centerY: f32,
  }

  struct HexData {
    x: f32,
    y: f32,
    size: f32,
    filled: f32,
    colorR: f32,
    colorG: f32,
    colorB: f32,
    highlight: f32,
  }

  @group(0) @binding(0) var<uniform> uniforms: Uniforms;
  @group(0) @binding(1) var<storage, read> hexes: array<HexData>;

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
    let h = hexes[instanceIndex];

    // Expand for glow
    let padding = 0.02;
    let size = h.size + padding;

    var localPos = array<vec2f, 6>(
      vec2f(-1.0, -1.0),
      vec2f(1.0, -1.0),
      vec2f(-1.0, 1.0),
      vec2f(-1.0, 1.0),
      vec2f(1.0, -1.0),
      vec2f(1.0, 1.0)
    );

    let local = localPos[vertexIndex];
    let worldX = h.x + local.x * size;
    let worldY = h.y + local.y * size;

    let clipX = worldX * 2.0 - 1.0;
    let clipY = 1.0 - worldY * 2.0;

    var output: VertexOutput;
    output.position = vec4f(clipX, clipY, 0.0, 1.0);
    output.uv = local;
    output.instanceId = instanceIndex;
    return output;
  }

  fn hexSDF(p: vec2f) -> f32 {
    let q = abs(p);
    return max(q.x * 0.866025 + q.y * 0.5, q.y);
  }

  @fragment
  fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
    let h = hexes[input.instanceId];
    let uv = input.uv;
    let t = uniforms.time;

    let color = vec3f(h.colorR, h.colorG, h.colorB);

    // Hexagonal shape
    let hexDist = hexSDF(uv * 0.9);
    let inside = smoothstep(0.5, 0.45, hexDist);

    // Crystal facet effect
    let facet = abs(sin(atan2(uv.y, uv.x) * 3.0 + t)) * 0.1;

    // Edge glow
    let edgeGlow = smoothstep(0.5, 0.35, hexDist) - inside * 0.5;

    // Highlight for valid placement
    let highlight = h.highlight * sin(t * 4.0) * 0.3 + h.highlight * 0.7;

    // Filled vs empty
    var baseAlpha = select(0.3, 0.85, h.filled > 0.5);
    baseAlpha += edgeGlow * 0.4;
    baseAlpha += facet * h.filled;
    baseAlpha += highlight * 0.3;

    let finalColor = color + vec3f(0.2, 0.15, 0.05) * edgeGlow;

    return vec4f(finalColor, inside * baseAlpha);
  }
`;

// Line Clear Shader
export const lineClearShader = /* wgsl */ `
  struct Uniforms {
    time: f32,
    intensity: f32,
    centerX: f32,
    centerY: f32,
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

    let center = vec2f(uniforms.centerX, uniforms.centerY);
    let dist = length(uv - center);

    // Golden burst wave
    let wave = smoothstep(0.02, 0.0, abs(dist - intensity * 0.8));

    // Honey glow
    let glow = exp(-dist * dist * 3.0) * intensity;

    let color = vec3f(1.0, 0.8, 0.3);
    let alpha = (wave * 0.6 + glow * 0.3) * intensity;

    return vec4f(color, alpha);
  }
`;
