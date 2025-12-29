/**
 * WGSL Shaders - Color Match
 * Neon Synapse Theme
 * Game #026
 */

// Background Shader - Neural Network with Synapses
export const backgroundShader = /* wgsl */ `
  struct Uniforms {
    time: f32,
    aspectRatio: f32,
    pulse: f32,
    shakeX: f32,
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
    var uv = input.uv;
    let t = uniforms.time;
    let pulse = uniforms.pulse;
    let shake = uniforms.shakeX;

    // Apply shake
    uv.x += sin(t * 50.0) * shake * 0.02;

    // Deep neural background
    var color = vec3f(0.02, 0.02, 0.06);

    // Neural nodes grid
    let nodeGrid = 8.0;
    let nodeUV = fract(uv * nodeGrid);
    let nodeId = floor(uv * nodeGrid);

    // Create nodes at intersections
    let nodeCenter = vec2f(0.5, 0.5);
    let nodeDist = length(nodeUV - nodeCenter);
    let nodePhase = hash(nodeId) * 6.28;
    let nodePulse = sin(t * 2.0 + nodePhase) * 0.5 + 0.5;
    let nodeGlow = smoothstep(0.15, 0.0, nodeDist) * nodePulse * 0.3;

    // Node color based on position
    let nodeHue = hash(nodeId + vec2f(100.0, 200.0));
    var nodeColor = vec3f(0.0);
    if (nodeHue < 0.33) {
      nodeColor = vec3f(1.0, 0.3, 0.5); // Pink
    } else if (nodeHue < 0.66) {
      nodeColor = vec3f(0.3, 1.0, 0.8); // Cyan
    } else {
      nodeColor = vec3f(0.8, 0.5, 1.0); // Purple
    }
    color += nodeColor * nodeGlow;

    // Synapse connections (lines between nodes)
    let lineUV = nodeUV;
    let hLine = smoothstep(0.02, 0.0, abs(lineUV.y - 0.5));
    let vLine = smoothstep(0.02, 0.0, abs(lineUV.x - 0.5));

    // Pulse traveling along connections
    let hPulsePos = fract(t * 0.3 + hash(nodeId) * 10.0);
    let hPulseDist = abs(lineUV.x - hPulsePos);
    let hPulse = smoothstep(0.1, 0.0, hPulseDist) * hLine;

    let vPulsePos = fract(t * 0.25 + hash(nodeId + vec2f(50.0, 0.0)) * 10.0);
    let vPulseDist = abs(lineUV.y - vPulsePos);
    let vPulse = smoothstep(0.1, 0.0, vPulseDist) * vLine;

    color += vec3f(0.0, 0.8, 1.0) * (hPulse + vPulse) * 0.4;
    color += vec3f(0.3, 0.2, 0.5) * (hLine + vLine) * 0.1;

    // Central pulse on correct answer
    let centerDist = length(uv - vec2f(0.5));
    let centralPulse = smoothstep(pulse * 0.8, pulse * 0.6, centerDist);
    color += vec3f(0.0, 1.0, 0.5) * centralPulse * pulse * 0.5;

    // Ambient shimmer
    let shimmer = sin(uv.x * 30.0 + t) * sin(uv.y * 30.0 - t * 0.7) * 0.5 + 0.5;
    color += vec3f(0.1, 0.05, 0.15) * shimmer * 0.1;

    // Vignette
    color *= 1.0 - centerDist * 0.5;

    return vec4f(color, 1.0);
  }
`;

// Text Glow Shader - Color burst around text
export const textGlowShader = /* wgsl */ `
  struct Uniforms {
    time: f32,
    colorR: f32,
    colorG: f32,
    colorB: f32,
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
    let targetColor = vec3f(uniforms.colorR, uniforms.colorG, uniforms.colorB);

    // Text area glow (center)
    let center = vec2f(0.5, 0.5);
    let dist = length(uv - center);

    // Pulsing glow
    let pulse = sin(t * 3.0) * 0.1 + 0.9;
    let glow = smoothstep(0.4 * pulse, 0.1, dist);

    // Color rays
    let angle = atan2(uv.y - 0.5, uv.x - 0.5);
    let rays = sin(angle * 8.0 + t * 2.0) * 0.5 + 0.5;

    var color = targetColor * glow * 0.3;
    color += targetColor * rays * smoothstep(0.5, 0.2, dist) * 0.2;

    let alpha = glow * 0.4;

    return vec4f(color, alpha);
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
      // Correct - sparkle burst
      let sparkle = sin(dist * 20.0 - t * 10.0) * 0.5 + 0.5;
      let star = max(
        exp(-pow(abs(uv.x), 0.5) * 3.0) * exp(-pow(abs(uv.y), 2.0) * 10.0),
        exp(-pow(abs(uv.y), 0.5) * 3.0) * exp(-pow(abs(uv.x), 2.0) * 10.0)
      );
      alpha *= (sparkle * 0.5 + star * 0.5) * exp(-dist * dist);
    } else if (pType == 1) {
      // Wrong - shake fragment
      let frag = step(0.7, sin(uv.x * 30.0) * sin(uv.y * 30.0 + t * 20.0));
      alpha *= frag * exp(-dist * 2.0);
    } else if (pType == 2) {
      // Synapse pulse
      let pulse = exp(-dist * dist * 3.0);
      let ring = smoothstep(0.02, 0.0, abs(dist - 0.6));
      alpha *= (pulse + ring * 0.5);
    } else {
      // Neural spark
      let spark = exp(-dist * dist * 4.0);
      let flicker = sin(t * 20.0 + p.x * 50.0) * 0.3 + 0.7;
      alpha *= spark * flicker;
    }

    return vec4f(color, alpha);
  }
`;

// Feedback Overlay Shader
export const feedbackShader = /* wgsl */ `
  struct Uniforms {
    time: f32,
    feedbackType: f32,
    intensity: f32,
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

  @fragment
  fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
    let uv = input.uv;
    let t = uniforms.time;
    let feedbackType = i32(uniforms.feedbackType);
    let intensity = uniforms.intensity;

    let dist = length(uv - vec2f(0.5));

    if (intensity <= 0.0) {
      discard;
    }

    var color = vec3f(0.0);
    var alpha = 0.0;

    if (feedbackType == 0) {
      // Correct - green pulse from center
      let wave = smoothstep(intensity * 1.5, intensity * 0.5, dist);
      let ring = smoothstep(0.03, 0.0, abs(dist - intensity * 1.2));
      color = vec3f(0.0, 1.0, 0.5);
      alpha = (wave * 0.3 + ring * 0.5) * intensity;
    } else {
      // Wrong - red shake vignette
      let vignette = smoothstep(0.3, 0.7, dist);
      let flash = sin(t * 40.0) * 0.5 + 0.5;
      color = vec3f(1.0, 0.2, 0.2);
      alpha = vignette * flash * intensity * 0.6;
    }

    return vec4f(color, alpha);
  }
`;
