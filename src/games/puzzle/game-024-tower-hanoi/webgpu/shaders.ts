/**
 * WGSL Shaders - Tower of Hanoi
 * Arcane Dimensional Theme
 * Game #024
 */

// Background Shader - Mystical Arcane Dimension
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
    return fract(sin(dot(p, vec2f(12.9898, 78.233))) * 43758.5453);
  }

  @fragment
  fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
    let uv = input.uv;
    let t = uniforms.time;

    // Deep arcane background
    var color = vec3f(0.04, 0.02, 0.08);

    // Mystical swirling pattern
    let center = vec2f(0.5, 0.5);
    let toCenter = uv - center;
    let dist = length(toCenter);
    let angle = atan2(toCenter.y, toCenter.x);

    // Arcane spiral
    let spiral = sin(angle * 4.0 - dist * 10.0 + t * 0.5) * 0.5 + 0.5;
    color += vec3f(0.4, 0.1, 0.6) * spiral * 0.1 * (1.0 - dist);

    // Dimensional rift rings
    let ringDist = abs(fract(dist * 5.0 - t * 0.2) - 0.5);
    let ring = smoothstep(0.1, 0.0, ringDist);
    color += vec3f(0.6, 0.3, 0.8) * ring * 0.1;

    // Floating runes/particles
    let runeX = floor(uv.x * 8.0);
    let runeY = floor(uv.y * 6.0);
    let runeOffset = hash(vec2f(runeX, runeY));
    let runePhase = fract(t * 0.3 + runeOffset);
    let runeAlpha = sin(runePhase * 3.14159) * 0.3;
    color += vec3f(1.0, 0.8, 0.3) * runeAlpha * hash(vec2f(runeX + 0.5, runeY));

    // Corner vignette
    color *= 1.0 - dist * 0.6;

    // Base platform glow
    let baseGlow = smoothstep(0.3, 0.0, uv.y) * 0.15;
    color += vec3f(0.5, 0.2, 0.7) * baseGlow;

    return vec4f(color, 1.0);
  }
`;

// Pole Shader - Arcane Tower Poles
export const poleShader = /* wgsl */ `
  struct Uniforms {
    time: f32,
    poleCount: f32,
    canvasWidth: f32,
    canvasHeight: f32,
  }

  struct PoleData {
    x: f32,
    y: f32,
    width: f32,
    height: f32,
    selected: f32,
    reserved1: f32,
    reserved2: f32,
    reserved3: f32,
  }

  @group(0) @binding(0) var<uniform> uniforms: Uniforms;
  @group(0) @binding(1) var<storage, read> poles: array<PoleData>;

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
    let pole = poles[instanceIndex];

    var localPos = array<vec2f, 6>(
      vec2f(0.0, 0.0),
      vec2f(1.0, 0.0),
      vec2f(0.0, 1.0),
      vec2f(0.0, 1.0),
      vec2f(1.0, 0.0),
      vec2f(1.0, 1.0)
    );

    let local = localPos[vertexIndex];
    let worldX = pole.x + local.x * pole.width;
    let worldY = pole.y + local.y * pole.height;

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
    let pole = poles[input.instanceId];
    let uv = input.uv;
    let t = uniforms.time;
    let selected = pole.selected > 0.5;

    // Arcane crystal pole
    var color = vec3f(0.3, 0.2, 0.4);

    // Vertical gradient
    color += vec3f(0.2, 0.1, 0.3) * (1.0 - uv.y);

    // Crystal facets
    let facet = sin(uv.y * 20.0) * 0.5 + 0.5;
    color += vec3f(0.1, 0.05, 0.15) * facet;

    // Edge glow
    let edgeDist = min(uv.x, 1.0 - uv.x);
    let edgeGlow = smoothstep(0.3, 0.0, edgeDist);
    color += vec3f(0.5, 0.3, 0.8) * edgeGlow * 0.3;

    // Selection aura
    if (selected) {
      let pulse = sin(t * 5.0) * 0.5 + 0.5;
      color += vec3f(1.0, 0.8, 0.3) * pulse * 0.3;
      color += vec3f(1.0, 0.6, 0.2) * edgeGlow * 0.5;
    }

    // Energy flow up the pole
    let flow = fract(uv.y * 3.0 - t * 2.0);
    let flowGlow = smoothstep(0.1, 0.0, flow) * smoothstep(0.3, 0.1, flow);
    color += vec3f(0.8, 0.5, 1.0) * flowGlow * 0.2;

    return vec4f(color, 1.0);
  }
`;

// Disk Shader - Arcane Power Rings
export const diskShader = /* wgsl */ `
  struct Uniforms {
    time: f32,
    diskCount: f32,
    canvasWidth: f32,
    canvasHeight: f32,
  }

  struct DiskData {
    x: f32,
    y: f32,
    width: f32,
    height: f32,
    colorR: f32,
    colorG: f32,
    colorB: f32,
    selected: f32,
    size: f32,
    animProgress: f32,
    reserved1: f32,
    reserved2: f32,
  }

  @group(0) @binding(0) var<uniform> uniforms: Uniforms;
  @group(0) @binding(1) var<storage, read> disks: array<DiskData>;

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
    let disk = disks[instanceIndex];

    var localPos = array<vec2f, 6>(
      vec2f(0.0, 0.0),
      vec2f(1.0, 0.0),
      vec2f(0.0, 1.0),
      vec2f(0.0, 1.0),
      vec2f(1.0, 0.0),
      vec2f(1.0, 1.0)
    );

    let local = localPos[vertexIndex];
    let worldX = disk.x + local.x * disk.width;
    let worldY = disk.y + local.y * disk.height;

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
    let disk = disks[input.instanceId];
    let uv = input.uv;
    let t = uniforms.time;

    var color = vec3f(disk.colorR, disk.colorG, disk.colorB);
    let selected = disk.selected > 0.5;

    // Rounded rectangle shape
    let center = uv - vec2f(0.5);
    let rounded = length(max(abs(center) - vec2f(0.4, 0.3), vec2f(0.0)));
    if (rounded > 0.15) {
      discard;
    }

    // 3D bevel effect
    let bevelTop = smoothstep(0.0, 0.2, uv.y);
    let bevelBottom = smoothstep(0.0, 0.2, 1.0 - uv.y);
    let bevelLeft = smoothstep(0.0, 0.15, uv.x);
    let bevelRight = smoothstep(0.0, 0.15, 1.0 - uv.x);

    // Highlight top
    color += vec3f(0.3) * (1.0 - bevelTop);
    // Shadow bottom
    color *= 0.7 + bevelBottom * 0.3;

    // Inner glow based on size
    let innerGlow = bevelTop * bevelBottom * bevelLeft * bevelRight;
    color += vec3f(0.2) * innerGlow;

    // Arcane runes on disk
    let runeX = floor(uv.x * 4.0);
    let runePhase = sin(t * 2.0 + runeX * 1.5 + disk.size) * 0.5 + 0.5;
    color += vec3f(1.0, 0.8, 0.5) * runePhase * 0.1 * innerGlow;

    // Selection effect
    if (selected) {
      let pulse = sin(t * 6.0) * 0.5 + 0.5;
      color += vec3f(1.0, 0.9, 0.5) * pulse * 0.3;

      // Floating aura
      let aura = smoothstep(0.15, 0.0, rounded);
      color += vec3f(1.0, 0.8, 0.3) * aura * 0.4;
    }

    // Edge shimmer
    let edge = smoothstep(0.1, 0.0, rounded);
    color += vec3f(0.8, 0.6, 1.0) * edge * 0.2;

    return vec4f(color, 1.0);
  }
`;

// Base Shader - Platform
export const baseShader = /* wgsl */ `
  struct Uniforms {
    time: f32,
    aspectRatio: f32,
    reserved1: f32,
    reserved2: f32,
  }

  struct BaseData {
    x: f32,
    y: f32,
    width: f32,
    height: f32,
  }

  @group(0) @binding(0) var<uniform> uniforms: Uniforms;
  @group(0) @binding(1) var<storage, read> bases: array<BaseData>;

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
    let base = bases[instanceIndex];

    var localPos = array<vec2f, 6>(
      vec2f(0.0, 0.0),
      vec2f(1.0, 0.0),
      vec2f(0.0, 1.0),
      vec2f(0.0, 1.0),
      vec2f(1.0, 0.0),
      vec2f(1.0, 1.0)
    );

    let local = localPos[vertexIndex];
    let worldX = base.x + local.x * base.width;
    let worldY = base.y + local.y * base.height;

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
    let uv = input.uv;
    let t = uniforms.time;

    // Stone platform with arcane markings
    var color = vec3f(0.25, 0.2, 0.3);

    // Surface texture
    let noise = sin(uv.x * 30.0) * sin(uv.y * 30.0) * 0.5 + 0.5;
    color += vec3f(0.05) * noise;

    // Edge bevel
    let edgeY = smoothstep(0.0, 0.3, uv.y) * smoothstep(0.0, 0.3, 1.0 - uv.y);
    let edgeX = smoothstep(0.0, 0.1, uv.x) * smoothstep(0.0, 0.1, 1.0 - uv.x);
    color += vec3f(0.1) * (1.0 - edgeY);

    // Glowing rune pattern
    let runeGlow = sin(uv.x * 10.0 + t) * 0.5 + 0.5;
    color += vec3f(0.5, 0.3, 0.7) * runeGlow * 0.1 * edgeX;

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
      // Pickup - rising sparkle
      let sparkle = sin(dist * 10.0 - t * 5.0) * 0.5 + 0.5;
      alpha *= sparkle * exp(-dist * dist * 3.0);
    } else if (pType == 1) {
      // Drop - impact burst
      let ring = smoothstep(0.1, 0.0, abs(dist - 0.5));
      let center = exp(-dist * dist * 4.0);
      alpha *= ring + center;
    } else if (pType == 2) {
      // Trail - arcane wisp
      let wisp = exp(-dist * dist * 2.0);
      let swirl = sin(atan2(uv.y, uv.x) * 3.0 + t * 3.0) * 0.5 + 0.5;
      alpha *= wisp * (0.5 + swirl * 0.5);
    } else if (pType == 3) {
      // Complete - celebration
      let angle = atan2(uv.y, uv.x);
      let star = sin(angle * 5.0 + t * 4.0) * 0.5 + 0.5;
      alpha *= star * exp(-dist * dist * 2.0);
    } else {
      // Ambient - floating rune
      let rune = exp(-dist * dist * 3.0);
      let flicker = sin(t * 3.0 + p.x * 10.0) * 0.3 + 0.7;
      alpha *= rune * flicker;
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
    let angle = atan2(uv.y - center.y, uv.x - center.x);

    // Arcane explosion
    let wave = smoothstep(0.02, 0.0, abs(dist - progress * 1.2));
    let waveColor = vec3f(1.0, 0.8, 0.3) * wave;

    // Mystical glow
    let glow = exp(-dist * 2.5 / max(progress, 0.01)) * progress;
    let glowColor = vec3f(0.6, 0.3, 0.9) * glow * 0.6;

    // Rotating runes
    let runeAngle = angle + t * 2.0;
    let runes = sin(runeAngle * 8.0) * 0.5 + 0.5;
    let runeRing = smoothstep(0.02, 0.0, abs(dist - progress * 0.8));
    let runeColor = vec3f(1.0, 0.9, 0.5) * runes * runeRing * 0.5;

    let color = waveColor + glowColor + runeColor;
    let alpha = (wave + glow + runes * runeRing * 0.5) * progress;

    return vec4f(color, clamp(alpha, 0.0, 0.8));
  }
`;
