/**
 * WGSL Shaders - 15 Puzzle
 * Holographic Interface Theme
 * Game #025
 */

// Background Shader - Holographic Grid Interface
export const backgroundShader = /* wgsl */ `
  struct Uniforms {
    time: f32,
    aspectRatio: f32,
    gridSize: f32,
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
    let gridSize = uniforms.gridSize;

    // Deep holographic background
    var color = vec3f(0.02, 0.04, 0.08);

    // Holographic grid lines
    let gridX = fract(uv.x * gridSize);
    let gridY = fract(uv.y * gridSize);
    let gridLine = smoothstep(0.02, 0.0, gridX) + smoothstep(0.02, 0.0, 1.0 - gridX) +
                   smoothstep(0.02, 0.0, gridY) + smoothstep(0.02, 0.0, 1.0 - gridY);
    color += vec3f(0.0, 0.5, 0.8) * gridLine * 0.1;

    // Scanning beam effect
    let scanY = fract(t * 0.2);
    let scanBeam = smoothstep(0.05, 0.0, abs(uv.y - scanY));
    color += vec3f(0.0, 0.8, 1.0) * scanBeam * 0.15;

    // Holographic shimmer
    let shimmer = sin(uv.x * 30.0 + t * 2.0) * sin(uv.y * 30.0 - t * 1.5) * 0.5 + 0.5;
    color += vec3f(0.0, 0.3, 0.5) * shimmer * 0.05;

    // Corner accent lights
    let corner1 = smoothstep(0.3, 0.0, length(uv));
    let corner2 = smoothstep(0.3, 0.0, length(uv - vec2f(1.0, 0.0)));
    let corner3 = smoothstep(0.3, 0.0, length(uv - vec2f(0.0, 1.0)));
    let corner4 = smoothstep(0.3, 0.0, length(uv - vec2f(1.0, 1.0)));
    color += vec3f(0.0, 0.6, 1.0) * (corner1 + corner2 + corner3 + corner4) * 0.08;

    // Vignette
    let dist = length(uv - vec2f(0.5));
    color *= 1.0 - dist * 0.4;

    return vec4f(color, 1.0);
  }
`;

// Tile Shader - Holographic Tiles
export const tileShader = /* wgsl */ `
  struct Uniforms {
    time: f32,
    tileCount: f32,
    canvasWidth: f32,
    canvasHeight: f32,
  }

  struct TileData {
    x: f32,
    y: f32,
    width: f32,
    height: f32,
    number: f32,
    correct: f32,
    animProgress: f32,
    reserved: f32,
  }

  @group(0) @binding(0) var<uniform> uniforms: Uniforms;
  @group(0) @binding(1) var<storage, read> tiles: array<TileData>;

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
    let tile = tiles[instanceIndex];

    var localPos = array<vec2f, 6>(
      vec2f(0.0, 0.0),
      vec2f(1.0, 0.0),
      vec2f(0.0, 1.0),
      vec2f(0.0, 1.0),
      vec2f(1.0, 0.0),
      vec2f(1.0, 1.0)
    );

    let local = localPos[vertexIndex];
    let worldX = tile.x + local.x * tile.width;
    let worldY = tile.y + local.y * tile.height;

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
    let tile = tiles[input.instanceId];
    let uv = input.uv;
    let t = uniforms.time;
    let number = i32(tile.number);
    let correct = tile.correct > 0.5;

    // Skip empty tile
    if (number == 0) {
      discard;
    }

    // Base holographic color
    var color: vec3f;
    if (correct) {
      color = vec3f(0.1, 0.6, 0.4); // Teal when correct
    } else {
      color = vec3f(0.1, 0.3, 0.5); // Blue when not
    }

    // 3D bevel effect
    let bevelTop = smoothstep(0.0, 0.15, uv.y);
    let bevelBottom = smoothstep(0.0, 0.15, 1.0 - uv.y);
    let bevelLeft = smoothstep(0.0, 0.15, uv.x);
    let bevelRight = smoothstep(0.0, 0.15, 1.0 - uv.x);

    // Highlight top-left
    color += vec3f(0.2) * (1.0 - bevelTop) * bevelLeft;
    color += vec3f(0.15) * (1.0 - bevelLeft) * bevelTop;

    // Shadow bottom-right
    color *= 0.7 + bevelBottom * 0.3;
    color *= 0.7 + bevelRight * 0.3;

    // Inner holographic surface
    let inner = bevelTop * bevelBottom * bevelLeft * bevelRight;
    color += vec3f(0.1, 0.2, 0.3) * inner;

    // Holographic scan line
    let scan = sin(uv.y * 30.0 - t * 5.0) * 0.5 + 0.5;
    color += vec3f(0.0, 0.3, 0.5) * scan * 0.1 * inner;

    // Number glow based on position
    let numberGlow = f32(number) / 16.0;
    color += vec3f(0.0, 0.4, 0.8) * numberGlow * 0.15 * inner;

    // Correct placement glow
    if (correct) {
      let pulse = sin(t * 3.0) * 0.5 + 0.5;
      color += vec3f(0.0, 0.4, 0.3) * pulse * 0.2;

      // Edge highlight for correct tiles
      let edgeDist = min(min(uv.x, 1.0 - uv.x), min(uv.y, 1.0 - uv.y));
      let edgeGlow = smoothstep(0.1, 0.0, edgeDist);
      color += vec3f(0.0, 1.0, 0.6) * edgeGlow * 0.3;
    }

    // Holographic rainbow shimmer
    let rainbow = sin(uv.x * 10.0 + uv.y * 10.0 + t * 2.0) * 0.5 + 0.5;
    color += vec3f(rainbow * 0.1, rainbow * 0.05, rainbow * 0.15) * inner * 0.3;

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
      // Slide - motion blur
      let blur = exp(-dist * dist * 3.0);
      let trail = smoothstep(1.0, 0.0, abs(uv.x));
      alpha *= blur * trail;
    } else if (pType == 1) {
      // Correct - sparkle
      let sparkle = sin(dist * 15.0 - t * 8.0) * 0.5 + 0.5;
      alpha *= sparkle * exp(-dist * dist * 2.0);
    } else if (pType == 2) {
      // Complete - holographic burst
      let angle = atan2(uv.y, uv.x);
      let star = sin(angle * 6.0 + t * 5.0) * 0.5 + 0.5;
      alpha *= star * exp(-dist * dist * 2.0);
    } else {
      // Ambient - data particle
      let data = exp(-dist * dist * 4.0);
      let flicker = sin(t * 5.0 + p.x * 20.0) * 0.3 + 0.7;
      alpha *= data * flicker;
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

    // Holographic shockwave
    let wave = smoothstep(0.02, 0.0, abs(dist - progress * 1.2));
    let waveColor = vec3f(0.0, 0.8, 1.0) * wave;

    // Data burst
    let glow = exp(-dist * 3.0 / max(progress, 0.01)) * progress;
    let glowColor = vec3f(0.0, 0.5, 0.8) * glow * 0.5;

    // Holographic grid overlay
    let angle = atan2(uv.y - center.y, uv.x - center.x);
    let grid = sin(angle * 16.0 + t * 4.0) * 0.5 + 0.5;
    let gridRing = smoothstep(progress * 1.2, progress * 0.8, dist);
    let gridColor = vec3f(0.0, 1.0, 0.8) * grid * gridRing * progress * 0.3;

    let color = waveColor + glowColor + gridColor;
    let alpha = (wave + glow + grid * gridRing * 0.5) * progress;

    return vec4f(color, clamp(alpha, 0.0, 0.8));
  }
`;
