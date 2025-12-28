/**
 * WGSL Shaders - Block Blast
 * Digital Matrix Theme
 * Game #023
 */

// Background Shader - Digital Matrix Rain
export const backgroundShader = /* wgsl */ `
  struct Uniforms {
    time: f32,
    aspectRatio: f32,
    gridCols: f32,
    gridRows: f32,
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
    return fract(sin(dot(p, vec2f(12.9898, 78.233))) * 43758.5453);
  }

  @fragment
  fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
    let uv = input.uv;
    let t = uniforms.time;

    // Deep digital background
    var color = vec3f(0.01, 0.02, 0.04);

    // Matrix rain effect
    let cols = 20.0;
    let col = floor(uv.x * cols);
    let colFract = fract(uv.x * cols);
    let colCenter = smoothstep(0.4, 0.5, colFract) * smoothstep(0.6, 0.5, colFract);

    let speed = hash(vec2f(col, 0.0)) * 0.3 + 0.2;
    let offset = hash(vec2f(col, 1.0));
    let drop = fract(uv.y + t * speed + offset);

    let dropIntensity = smoothstep(0.0, 0.3, drop) * smoothstep(1.0, 0.7, drop);
    color += vec3f(0.0, 0.8, 0.4) * dropIntensity * colCenter * 0.15;

    // Grid overlay
    let gridX = fract(uv.x * uniforms.gridCols);
    let gridY = fract(uv.y * uniforms.gridRows);
    let gridLine = smoothstep(0.02, 0.0, gridX) + smoothstep(0.02, 0.0, 1.0 - gridX) +
                   smoothstep(0.02, 0.0, gridY) + smoothstep(0.02, 0.0, 1.0 - gridY);
    color += vec3f(0.0, 0.5, 0.3) * gridLine * 0.08;

    // Corner vignette
    let dist = length(uv - vec2f(0.5));
    color *= 1.0 - dist * 0.5;

    // Pulse effect
    let pulse = sin(t * 2.0) * 0.5 + 0.5;
    color += vec3f(0.0, 0.3, 0.2) * pulse * 0.03;

    return vec4f(color, 1.0);
  }
`;

// Block Shader - Grid Cells
export const blockShader = /* wgsl */ `
  struct Uniforms {
    time: f32,
    blockCount: f32,
    canvasWidth: f32,
    canvasHeight: f32,
  }

  struct BlockData {
    x: f32,
    y: f32,
    width: f32,
    height: f32,
    colorR: f32,
    colorG: f32,
    colorB: f32,
    state: f32,  // 0=empty, 1=filled, 2=clearing
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
    let block = blocks[instanceIndex];

    var localPos = array<vec2f, 6>(
      vec2f(0.0, 0.0),
      vec2f(1.0, 0.0),
      vec2f(0.0, 1.0),
      vec2f(0.0, 1.0),
      vec2f(1.0, 0.0),
      vec2f(1.0, 1.0)
    );

    let local = localPos[vertexIndex];
    let worldX = block.x + local.x * block.width;
    let worldY = block.y + local.y * block.height;

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
    let block = blocks[input.instanceId];
    let uv = input.uv;
    let t = uniforms.time;
    let state = i32(block.state);

    var color = vec3f(block.colorR, block.colorG, block.colorB);
    var alpha = 1.0;

    if (state == 0) {
      // Empty cell
      color = vec3f(0.05, 0.08, 0.1);
      alpha = 0.6;

      // Subtle grid pattern
      let pattern = sin(uv.x * 20.0) * sin(uv.y * 20.0) * 0.5 + 0.5;
      color += vec3f(0.0, 0.1, 0.08) * pattern * 0.3;
    } else if (state == 1) {
      // Filled cell
      // 3D bevel effect
      let bevelTop = smoothstep(0.0, 0.15, uv.y);
      let bevelLeft = smoothstep(0.0, 0.15, uv.x);
      let bevelBottom = smoothstep(0.0, 0.15, 1.0 - uv.y);
      let bevelRight = smoothstep(0.0, 0.15, 1.0 - uv.x);

      // Highlight top-left
      color += vec3f(0.3) * (1.0 - bevelTop) * bevelLeft;
      color += vec3f(0.2) * (1.0 - bevelLeft) * bevelTop;

      // Shadow bottom-right
      color *= 0.7 + bevelBottom * 0.3;
      color *= 0.7 + bevelRight * 0.3;

      // Inner glow
      let inner = bevelTop * bevelLeft * bevelBottom * bevelRight;
      color += vec3f(0.1) * inner;

      // Pulse effect
      let pulse = sin(t * 3.0 + block.x * 10.0 + block.y * 10.0) * 0.5 + 0.5;
      color += color * pulse * 0.1;
    } else if (state == 2) {
      // Clearing animation
      let flash = sin(t * 20.0) * 0.5 + 0.5;
      color = mix(color, vec3f(1.0), flash);
      alpha = 1.0 - fract(t * 2.0);
    }

    // Edge glow for filled cells
    if (state == 1) {
      let edgeDist = min(min(uv.x, 1.0 - uv.x), min(uv.y, 1.0 - uv.y));
      let edgeGlow = smoothstep(0.15, 0.0, edgeDist);
      color += vec3f(0.0, 0.5, 0.3) * edgeGlow * 0.3;
    }

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
      // Place - digital square
      let square = max(abs(uv.x), abs(uv.y));
      alpha *= smoothstep(1.0, 0.7, square);
    } else if (pType == 1) {
      // Clear - explosion
      let ring = smoothstep(0.1, 0.0, abs(dist - 0.6));
      let center = smoothstep(0.4, 0.0, dist);
      alpha *= ring + center * 0.5;
    } else if (pType == 2) {
      // Combo - starburst
      let angle = atan2(uv.y, uv.x);
      let star = sin(angle * 6.0 + t * 10.0) * 0.5 + 0.5;
      alpha *= star * smoothstep(1.0, 0.0, dist);
    } else {
      // Ambient - soft glow
      alpha *= exp(-dist * dist * 2.0);
    }

    return vec4f(color, alpha);
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

    // Digital shockwave
    let wave = smoothstep(0.03, 0.0, abs(dist - progress * 1.5));
    let waveColor = vec3f(0.0, 1.0, 0.5) * wave;

    // Matrix glow
    let glow = exp(-dist * 3.0 / max(progress, 0.01)) * progress;
    let glowColor = vec3f(0.0, 0.8, 0.4) * glow * 0.5;

    // Data fragments
    let angle = atan2(uv.y - center.y, uv.x - center.x);
    let frag = sin(angle * 12.0 + t * 8.0 - dist * 15.0) * 0.5 + 0.5;
    let fragments = frag * smoothstep(progress * 1.5, progress * 0.3, dist) * progress;
    let fragColor = vec3f(0.2, 1.0, 0.6) * fragments * 0.3;

    let color = waveColor + glowColor + fragColor;
    let alpha = (wave + glow + fragments * 0.3) * progress;

    return vec4f(color, clamp(alpha, 0.0, 0.8));
  }
`;
