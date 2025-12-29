/**
 * WGSL Shaders - Logic Gates
 * Digital Circuit Theme
 * Game #027
 */

// Background Shader - Circuit Board Pattern
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

  @fragment
  fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
    let uv = input.uv;
    let t = uniforms.time;

    // Deep PCB green/blue background
    var color = vec3f(0.01, 0.04, 0.06);

    // Circuit trace grid
    let gridSize = 20.0;
    let gridUV = fract(uv * gridSize);
    let gridId = floor(uv * gridSize);

    // Horizontal and vertical traces
    let hTrace = smoothstep(0.03, 0.0, abs(gridUV.y - 0.5));
    let vTrace = smoothstep(0.03, 0.0, abs(gridUV.x - 0.5));

    // Random trace activation based on grid cell
    let cellHash = hash(gridId);
    let hActive = step(0.6, cellHash);
    let vActive = step(0.4, fract(cellHash * 7.123));

    color += vec3f(0.0, 0.15, 0.1) * hTrace * hActive;
    color += vec3f(0.0, 0.1, 0.15) * vTrace * vActive;

    // Junction nodes at intersections
    let junctionDist = length(gridUV - vec2f(0.5, 0.5));
    let junction = smoothstep(0.08, 0.02, junctionDist);
    let junctionActive = step(0.5, hash(gridId + vec2f(100.0, 0.0)));
    color += vec3f(0.0, 0.3, 0.2) * junction * junctionActive;

    // Data flow pulses along traces
    let pulseH = fract(gridId.x * 0.1 + t * 0.5);
    let pulseV = fract(gridId.y * 0.1 - t * 0.3);
    let hPulse = smoothstep(0.1, 0.0, abs(gridUV.x - pulseH)) * hTrace * hActive;
    let vPulse = smoothstep(0.1, 0.0, abs(gridUV.y - pulseV)) * vTrace * vActive;

    color += vec3f(0.0, 1.0, 0.5) * hPulse * 0.3;
    color += vec3f(0.0, 0.5, 1.0) * vPulse * 0.3;

    // Via holes (through-board connections)
    let viaPattern = step(0.85, hash(gridId * 3.14));
    let viaDist = length(gridUV - vec2f(0.5));
    let via = smoothstep(0.1, 0.05, viaDist) * viaPattern;
    let viaRing = smoothstep(0.02, 0.0, abs(viaDist - 0.12)) * viaPattern;
    color += vec3f(0.1, 0.05, 0.0) * via;
    color += vec3f(0.3, 0.2, 0.1) * viaRing;

    // Ambient glow
    let centerDist = length(uv - vec2f(0.5));
    color *= 1.0 + (0.5 - centerDist) * 0.3;

    return vec4f(color, 1.0);
  }
`;

// Particle Shader - Electrons and signals
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
      // Electron - glowing orb
      let glow = exp(-dist * dist * 3.0);
      let core = smoothstep(0.3, 0.0, dist);
      alpha *= glow + core * 0.5;
    } else if (pType == 1) {
      // Signal pulse - expanding ring
      let ring = smoothstep(0.03, 0.0, abs(dist - 0.5));
      let fade = 1.0 - dist;
      alpha *= ring * fade;
    } else if (pType == 2) {
      // Connection spark
      let spark = exp(-dist * dist * 4.0);
      let flicker = sin(t * 30.0 + p.x * 100.0) * 0.3 + 0.7;
      alpha *= spark * flicker;
    } else {
      // Ambient circuit data
      let data = exp(-dist * dist * 5.0);
      alpha *= data;
    }

    return vec4f(color, alpha);
  }
`;

// Gate Glow Shader - For highlighting active gates
export const gateGlowShader = /* wgsl */ `
  struct Uniforms {
    time: f32,
    numGates: f32,
    reserved1: f32,
    reserved2: f32,
  }

  struct GateData {
    x: f32,
    y: f32,
    active: f32,
    gateType: f32,
  }

  @group(0) @binding(0) var<uniform> uniforms: Uniforms;
  @group(0) @binding(1) var<storage, read> gates: array<GateData>;

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
    let g = gates[instanceIndex];

    let size = 0.08; // Glow radius

    var localPos = array<vec2f, 6>(
      vec2f(-1.0, -1.0),
      vec2f(1.0, -1.0),
      vec2f(-1.0, 1.0),
      vec2f(-1.0, 1.0),
      vec2f(1.0, -1.0),
      vec2f(1.0, 1.0)
    );

    let local = localPos[vertexIndex];
    let worldX = g.x + local.x * size;
    let worldY = g.y + local.y * size;

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
    let g = gates[input.instanceId];
    let uv = input.uv;
    let dist = length(uv);
    let t = uniforms.time;

    if (g.active < 0.5) {
      discard;
    }

    // Active gate glow
    let pulse = sin(t * 4.0) * 0.2 + 0.8;
    let glow = exp(-dist * dist * 2.0) * pulse;

    // Color based on gate type
    var color = vec3f(0.0, 1.0, 0.5); // Default green
    let gType = i32(g.gateType);

    if (gType == 1) { // AND
      color = vec3f(0.0, 0.8, 1.0); // Cyan
    } else if (gType == 2) { // OR
      color = vec3f(1.0, 0.6, 0.0); // Orange
    } else if (gType == 3) { // NOT
      color = vec3f(1.0, 0.3, 0.5); // Pink
    }

    return vec4f(color, glow * 0.6);
  }
`;

// Victory Shader
export const victoryShader = /* wgsl */ `
  struct Uniforms {
    time: f32,
    progress: f32,
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
    let progress = uniforms.progress;
    let center = vec2f(uniforms.centerX, uniforms.centerY);

    let dist = length(uv - center);

    // Circuit completion wave
    let wave = smoothstep(0.02, 0.0, abs(dist - progress * 1.5));
    let waveColor = vec3f(0.0, 1.0, 0.5) * wave;

    // Power surge glow
    let surge = exp(-dist * 2.0 / max(progress, 0.01)) * progress;
    let surgeColor = vec3f(0.0, 0.8, 0.3) * surge * 0.5;

    // Binary rain effect
    let gridY = floor(uv.y * 30.0);
    let rain = step(progress, fract(uv.y * 30.0 - t * 5.0 + gridY * 0.1));
    let rainAlpha = rain * smoothstep(progress * 1.5, progress * 0.5, dist) * 0.3;
    let rainColor = vec3f(0.0, 1.0, 0.4) * rainAlpha;

    let color = waveColor + surgeColor + rainColor;
    let alpha = (wave + surge * 0.5 + rainAlpha) * progress;

    return vec4f(color, clamp(alpha, 0.0, 0.7));
  }
`;
