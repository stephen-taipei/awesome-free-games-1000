/**
 * WGSL Shaders - Warehouse Keeper
 * Cargo Teleportation Theme
 * Game #022
 */

// Background Shader - Teleportation Grid
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

  @fragment
  fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
    let uv = input.uv;
    let t = uniforms.time;

    // Deep warehouse background
    var color = vec3f(0.02, 0.03, 0.05);

    // Cargo teleportation grid
    let gridSize = 20.0;
    let gridX = fract(uv.x * gridSize);
    let gridY = fract(uv.y * gridSize);
    let gridLine = smoothstep(0.02, 0.0, min(gridX, gridY)) +
                   smoothstep(0.02, 0.0, min(1.0 - gridX, 1.0 - gridY));
    color += vec3f(0.6, 0.2, 0.0) * gridLine * 0.15;

    // Energy conduits
    let conduitX = sin(uv.x * 30.0 + t * 2.0) * 0.5 + 0.5;
    let conduitY = cos(uv.y * 30.0 - t * 1.5) * 0.5 + 0.5;
    let conduit = smoothstep(0.48, 0.5, conduitX) * smoothstep(0.48, 0.5, conduitY);
    color += vec3f(1.0, 0.4, 0.0) * conduit * 0.1;

    // Central glow
    let dist = length(uv - vec2f(0.5));
    color += vec3f(1.0, 0.5, 0.1) * exp(-dist * 3.0) * 0.08;

    // Scanning beam
    let scanLine = smoothstep(0.002, 0.0, abs(uv.y - fract(t * 0.2)));
    color += vec3f(1.0, 0.6, 0.0) * scanLine * 0.4;

    return vec4f(color, 1.0);
  }
`;

// Tile Shader - Walls and Floor
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
    tileType: f32,  // 0=floor, 1=wall, 2=target
    state: f32,     // for targets: 0=empty, 1=occupied
    reserved1: f32,
    reserved2: f32,
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
    let tileType = i32(tile.tileType);

    var color = vec3f(0.0);
    var alpha = 1.0;

    if (tileType == 0) {
      // Floor - metallic warehouse
      color = vec3f(0.15, 0.12, 0.1);

      // Floor pattern
      let patternX = sin(uv.x * 10.0) * 0.5 + 0.5;
      let patternY = sin(uv.y * 10.0) * 0.5 + 0.5;
      color += vec3f(0.03) * patternX * patternY;

      // Edge highlight
      let edge = smoothstep(0.0, 0.1, uv.x) * smoothstep(0.0, 0.1, uv.y) *
                 smoothstep(0.0, 0.1, 1.0 - uv.x) * smoothstep(0.0, 0.1, 1.0 - uv.y);
      color = mix(vec3f(0.3, 0.15, 0.05), color, edge);
    } else if (tileType == 1) {
      // Wall - industrial barrier
      color = vec3f(0.25, 0.15, 0.1);

      // Brick pattern
      let brickU = fract(uv.x * 2.0);
      let brickRow = floor(uv.y * 3.0);
      let offsetU = select(0.0, 0.5, brickRow % 2.0 == 1.0);
      let brickV = fract(uv.y * 3.0);
      let brick = smoothstep(0.05, 0.08, brickU) * smoothstep(0.05, 0.08, 1.0 - brickU) *
                  smoothstep(0.08, 0.12, brickV) * smoothstep(0.08, 0.12, 1.0 - brickV);
      color *= 0.7 + brick * 0.3;

      // Top edge glow
      let topGlow = smoothstep(0.3, 0.0, uv.y);
      color += vec3f(1.0, 0.4, 0.0) * topGlow * 0.2;
    } else if (tileType == 2) {
      // Target - teleportation pad
      color = vec3f(0.12, 0.1, 0.08);

      // Teleport ring
      let center = vec2f(0.5);
      let dist = length(uv - center);
      let ring = smoothstep(0.02, 0.0, abs(dist - 0.35 + sin(t * 3.0) * 0.05));
      let innerRing = smoothstep(0.02, 0.0, abs(dist - 0.2));

      let occupied = tile.state > 0.5;
      let ringColor = select(vec3f(1.0, 0.3, 0.1), vec3f(0.2, 1.0, 0.4), occupied);
      color += ringColor * (ring + innerRing * 0.5);

      // Center glow
      let centerGlow = exp(-dist * 8.0);
      color += ringColor * centerGlow * (0.3 + sin(t * 4.0) * 0.1);

      // Pulsing when occupied
      if (occupied) {
        color += vec3f(0.2, 1.0, 0.4) * exp(-dist * 5.0) * (0.5 + sin(t * 5.0) * 0.3);
      }
    }

    return vec4f(color, alpha);
  }
`;

// Player Shader - Teleportation Worker
export const playerShader = /* wgsl */ `
  struct Uniforms {
    time: f32,
    x: f32,
    y: f32,
    size: f32,
  }

  @group(0) @binding(0) var<uniform> uniforms: Uniforms;

  struct VertexOutput {
    @builtin(position) position: vec4f,
    @location(0) uv: vec2f,
  }

  @vertex
  fn vertexMain(@builtin(vertex_index) vertexIndex: u32) -> VertexOutput {
    var localPos = array<vec2f, 6>(
      vec2f(0.0, 0.0),
      vec2f(1.0, 0.0),
      vec2f(0.0, 1.0),
      vec2f(0.0, 1.0),
      vec2f(1.0, 0.0),
      vec2f(1.0, 1.0)
    );

    let local = localPos[vertexIndex];
    let worldX = uniforms.x + local.x * uniforms.size;
    let worldY = uniforms.y + local.y * uniforms.size;

    let clipX = worldX * 2.0 - 1.0;
    let clipY = 1.0 - worldY * 2.0;

    var output: VertexOutput;
    output.position = vec4f(clipX, clipY, 0.0, 1.0);
    output.uv = local;
    return output;
  }

  @fragment
  fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
    let uv = input.uv;
    let t = uniforms.time;
    let center = vec2f(0.5);
    let dist = length(uv - center);

    // Player body
    let body = smoothstep(0.38, 0.35, dist);
    var color = vec3f(0.0, 0.7, 1.0) * body;

    // Inner core
    let core = smoothstep(0.2, 0.15, dist);
    color += vec3f(1.0, 1.0, 1.0) * core * 0.6;

    // Energy rings
    let ring1 = smoothstep(0.02, 0.0, abs(dist - 0.42 + sin(t * 4.0) * 0.03));
    let ring2 = smoothstep(0.015, 0.0, abs(dist - 0.48 + cos(t * 3.0) * 0.02));
    color += vec3f(0.0, 0.8, 1.0) * ring1 * 0.8;
    color += vec3f(0.4, 0.9, 1.0) * ring2 * 0.5;

    // Teleport glow
    let glow = exp(-dist * 4.0) * (0.3 + sin(t * 5.0) * 0.1);
    color += vec3f(0.0, 0.6, 1.0) * glow;

    let alpha = body + ring1 + ring2 + glow * 0.5;
    return vec4f(color, clamp(alpha, 0.0, 1.0));
  }
`;

// Crate Shader - Teleportation Cargo
export const crateShader = /* wgsl */ `
  struct Uniforms {
    time: f32,
    crateCount: f32,
    reserved1: f32,
    reserved2: f32,
  }

  struct CrateData {
    x: f32,
    y: f32,
    width: f32,
    height: f32,
    onTarget: f32,
    pushAnim: f32,
    reserved1: f32,
    reserved2: f32,
  }

  @group(0) @binding(0) var<uniform> uniforms: Uniforms;
  @group(0) @binding(1) var<storage, read> crates: array<CrateData>;

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
    let crate = crates[instanceIndex];

    var localPos = array<vec2f, 6>(
      vec2f(0.0, 0.0),
      vec2f(1.0, 0.0),
      vec2f(0.0, 1.0),
      vec2f(0.0, 1.0),
      vec2f(1.0, 0.0),
      vec2f(1.0, 1.0)
    );

    let local = localPos[vertexIndex];

    // Shrink slightly
    let margin = 0.08;
    let x = crate.x + margin * crate.width + local.x * crate.width * (1.0 - margin * 2.0);
    let y = crate.y + margin * crate.height + local.y * crate.height * (1.0 - margin * 2.0);

    let clipX = x * 2.0 - 1.0;
    let clipY = 1.0 - y * 2.0;

    var output: VertexOutput;
    output.position = vec4f(clipX, clipY, 0.0, 1.0);
    output.uv = local;
    output.instanceId = instanceIndex;
    return output;
  }

  @fragment
  fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
    let crate = crates[input.instanceId];
    let uv = input.uv;
    let t = uniforms.time;
    let onTarget = crate.onTarget > 0.5;

    // Base color
    var baseColor = select(vec3f(1.0, 0.6, 0.0), vec3f(0.2, 1.0, 0.4), onTarget);
    var color = baseColor * 0.8;

    // Box shape with beveled edges
    let bevel = 0.12;
    let edgeX = smoothstep(0.0, bevel, uv.x) * smoothstep(0.0, bevel, 1.0 - uv.x);
    let edgeY = smoothstep(0.0, bevel, uv.y) * smoothstep(0.0, bevel, 1.0 - uv.y);
    let edge = edgeX * edgeY;
    color *= 0.6 + edge * 0.4;

    // Cross pattern
    let crossH = smoothstep(0.03, 0.0, abs(uv.y - 0.5));
    let crossV = smoothstep(0.03, 0.0, abs(uv.x - 0.5));
    color += baseColor * (crossH + crossV) * 0.3;

    // Highlight on top-left
    let highlight = smoothstep(0.5, 0.0, uv.x + uv.y - 0.3);
    color += vec3f(1.0) * highlight * 0.15;

    // Shadow on bottom-right
    let shadow = smoothstep(0.5, 0.0, (1.0 - uv.x) + (1.0 - uv.y) - 0.3);
    color *= 1.0 - shadow * 0.3;

    // Glow when on target
    if (onTarget) {
      let dist = length(uv - vec2f(0.5));
      let glow = exp(-dist * 4.0) * (0.5 + sin(t * 4.0) * 0.2);
      color += vec3f(0.2, 1.0, 0.4) * glow;
    }

    // Push animation effect
    if (crate.pushAnim > 0.0) {
      let pulse = sin(crate.pushAnim * 3.14159);
      color += baseColor * pulse * 0.3;
    }

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
      // Push - burst effect
      let spark = smoothstep(0.8, 0.0, dist);
      alpha *= spark;
    } else if (pType == 1) {
      // Land - impact ripple
      let ring = smoothstep(0.1, 0.0, abs(dist - 0.6));
      let inner = smoothstep(0.4, 0.0, dist);
      alpha *= ring + inner;
    } else if (pType == 2) {
      // Teleport - energy spiral
      let angle = atan2(uv.y, uv.x);
      let spiral = sin(angle * 4.0 + t * 10.0 - dist * 8.0) * 0.5 + 0.5;
      alpha *= smoothstep(1.0, 0.3, dist) * spiral;
    } else if (pType == 3) {
      // Complete - celebration
      let star = max(
        smoothstep(0.3, 0.0, abs(uv.x)),
        smoothstep(0.3, 0.0, abs(uv.y))
      );
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

    // Teleportation completion wave
    let wave = smoothstep(0.02, 0.0, abs(dist - progress * 1.5));
    let waveColor = vec3f(0.2, 1.0, 0.4) * wave;

    // Inner glow
    let glow = exp(-dist * 4.0 / max(progress, 0.01)) * progress;
    let glowColor = vec3f(1.0, 0.8, 0.2) * glow * 0.5;

    // Golden particles
    let angle = atan2(uv.y - center.y, uv.x - center.x);
    let spiral = sin(angle * 8.0 + t * 5.0 - dist * 10.0) * 0.5 + 0.5;
    let particles = spiral * smoothstep(progress * 1.5, progress * 0.5, dist) * progress;
    let particleColor = vec3f(1.0, 0.6, 0.0) * particles * 0.4;

    let color = waveColor + glowColor + particleColor;
    let alpha = (wave + glow + particles * 0.3) * progress;

    return vec4f(color, clamp(alpha, 0.0, 0.8));
  }
`;
