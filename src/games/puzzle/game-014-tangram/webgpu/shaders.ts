/**
 * WGSL Shaders - Tangram
 * Holographic Origami Cyberpunk Theme
 * Game #014
 */

// Background shader - Holographic grid pattern
export const backgroundShader = /* wgsl */`
struct Uniforms {
  time: f32,
  aspectRatio: f32,
  _pad1: f32,
  _pad2: f32,
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

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  let uv = input.uv;
  let time = uniforms.time;

  // Deep space hologram background
  let bgDark = vec3f(0.02, 0.01, 0.04);
  let bgMid = vec3f(0.04, 0.02, 0.08);

  // Radial gradient
  let center = vec2f(0.5, 0.5);
  let dist = length(uv - center);
  var color = mix(bgMid, bgDark, dist * 1.3);

  // Holographic grid pattern
  let gridSize = 40.0;
  let gridUV = fract(uv * gridSize);
  let gridLine = smoothstep(0.02, 0.0, min(gridUV.x, gridUV.y)) +
                 smoothstep(0.98, 1.0, max(gridUV.x, gridUV.y));

  // Rainbow holographic shift
  let hueShift = uv.x * 2.0 + uv.y + time * 0.3;
  let holoR = sin(hueShift) * 0.5 + 0.5;
  let holoG = sin(hueShift + 2.094) * 0.5 + 0.5;
  let holoB = sin(hueShift + 4.188) * 0.5 + 0.5;
  let holoColor = vec3f(holoR, holoG, holoB);

  color += holoColor * gridLine * 0.15;

  // Scanning wave
  let scanWave = sin(uv.y * 30.0 - time * 2.0) * 0.5 + 0.5;
  color += vec3f(0.1, 0.0, 0.15) * scanWave * 0.1;

  // Perspective grid floor effect
  let perspY = pow(1.0 - uv.y, 2.0);
  let perspGrid = sin(uv.x * 50.0) * sin((uv.y - time * 0.05) * 100.0 * perspY);
  perspGrid = smoothstep(0.8, 1.0, perspGrid) * perspY;
  color += vec3f(0.2, 0.0, 0.3) * perspGrid * 0.2;

  // Vignette
  let vignette = 1.0 - dist * 0.6;
  color *= vignette;

  return vec4f(color, 1.0);
}
`;

// Target silhouette shader
export const targetShader = /* wgsl */`
struct Uniforms {
  time: f32,
  vertexCount: f32,
  _pad1: f32,
  _pad2: f32,
}

struct Vertex {
  x: f32,
  y: f32,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;
@group(0) @binding(1) var<storage, read> vertices: array<Vertex>;

struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) uv: vec2f,
  @location(1) worldPos: vec2f,
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
  output.worldPos = output.uv;
  return output;
}

// Point in polygon check
fn pointInPolygon(p: vec2f, count: i32) -> bool {
  var inside = false;
  var j = count - 1;

  for (var i = 0; i < count; i = i + 1) {
    let vi = vec2f(vertices[i].x, vertices[i].y);
    let vj = vec2f(vertices[j].x, vertices[j].y);

    if ((vi.y > p.y) != (vj.y > p.y) &&
        p.x < (vj.x - vi.x) * (p.y - vi.y) / (vj.y - vi.y) + vi.x) {
      inside = !inside;
    }
    j = i;
  }
  return inside;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  let uv = input.uv;
  let time = uniforms.time;
  let count = i32(uniforms.vertexCount);

  if (count < 3) {
    discard;
  }

  let inside = pointInPolygon(uv, count);

  if (!inside) {
    discard;
  }

  // Holographic fill effect
  let hueShift = uv.x * 3.0 + uv.y * 2.0 + time * 0.5;
  let r = sin(hueShift) * 0.3 + 0.5;
  let g = sin(hueShift + 2.094) * 0.3 + 0.5;
  let b = sin(hueShift + 4.188) * 0.3 + 0.5;

  var color = vec3f(r, g, b) * 0.3;

  // Scanning lines
  let scanLine = sin(uv.y * 100.0 + time * 3.0) * 0.5 + 0.5;
  color += vec3f(0.2, 0.1, 0.3) * scanLine * 0.2;

  // Edge glow - find distance to edges
  var minDist = 1.0;
  var j = count - 1;
  for (var i = 0; i < count; i = i + 1) {
    let vi = vec2f(vertices[i].x, vertices[i].y);
    let vj = vec2f(vertices[j].x, vertices[j].y);

    let edge = vj - vi;
    let toPoint = uv - vi;
    let t = clamp(dot(toPoint, edge) / dot(edge, edge), 0.0, 1.0);
    let closest = vi + edge * t;
    let d = length(uv - closest);
    minDist = min(minDist, d);
    j = i;
  }

  let edgeGlow = smoothstep(0.02, 0.0, minDist);
  color += vec3f(0.5, 0.3, 0.8) * edgeGlow;

  return vec4f(color, 0.5);
}
`;

// Polygon piece shader - for rendering tangram pieces
export const pieceShader = /* wgsl */`
struct Uniforms {
  time: f32,
  pieceCount: f32,
  canvasWidth: f32,
  canvasHeight: f32,
}

struct PieceData {
  // Vertex positions (max 4 vertices per piece)
  v0x: f32, v0y: f32,
  v1x: f32, v1y: f32,
  v2x: f32, v2y: f32,
  v3x: f32, v3y: f32,
  // Piece properties
  colorR: f32, colorG: f32, colorB: f32,
  vertexCount: f32,
  isDragging: f32,
  centerX: f32, centerY: f32,
  _pad: f32,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;
@group(0) @binding(1) var<storage, read> pieces: array<PieceData>;

struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) localUV: vec2f,
  @location(1) color: vec3f,
  @location(2) isDragging: f32,
  @location(3) pieceIdx: f32,
}

@vertex
fn vertexMain(
  @builtin(vertex_index) vertexIndex: u32,
  @builtin(instance_index) instanceIndex: u32
) -> VertexOutput {
  // We'll render each piece as a bounding quad and use fragment shader for shape
  let piece = pieces[instanceIndex];

  // Find bounding box
  var minX = min(min(piece.v0x, piece.v1x), min(piece.v2x, piece.v3x));
  var maxX = max(max(piece.v0x, piece.v1x), max(piece.v2x, piece.v3x));
  var minY = min(min(piece.v0y, piece.v1y), min(piece.v2y, piece.v3y));
  var maxY = max(max(piece.v0y, piece.v1y), max(piece.v2y, piece.v3y));

  // Add padding for glow
  let pad = 20.0;
  minX -= pad;
  maxX += pad;
  minY -= pad;
  maxY += pad;

  var corners = array<vec2f, 6>(
    vec2f(minX, minY),
    vec2f(maxX, minY),
    vec2f(minX, maxY),
    vec2f(minX, maxY),
    vec2f(maxX, minY),
    vec2f(maxX, maxY)
  );

  var uvs = array<vec2f, 6>(
    vec2f(0.0, 0.0),
    vec2f(1.0, 0.0),
    vec2f(0.0, 1.0),
    vec2f(0.0, 1.0),
    vec2f(1.0, 0.0),
    vec2f(1.0, 1.0)
  );

  let corner = corners[vertexIndex];

  // Convert to clip space
  let x = corner.x / uniforms.canvasWidth * 2.0 - 1.0;
  let y = 1.0 - corner.y / uniforms.canvasHeight * 2.0;

  var output: VertexOutput;
  output.position = vec4f(x, y, 0.0, 1.0);
  output.localUV = uvs[vertexIndex];
  output.color = vec3f(piece.colorR, piece.colorG, piece.colorB);
  output.isDragging = piece.isDragging;
  output.pieceIdx = f32(instanceIndex);
  return output;
}

// Cross product for triangle winding
fn cross2d(a: vec2f, b: vec2f) -> f32 {
  return a.x * b.y - a.y * b.x;
}

// Point in triangle
fn pointInTriangle(p: vec2f, a: vec2f, b: vec2f, c: vec2f) -> bool {
  let v0 = c - a;
  let v1 = b - a;
  let v2 = p - a;

  let dot00 = dot(v0, v0);
  let dot01 = dot(v0, v1);
  let dot02 = dot(v0, v2);
  let dot11 = dot(v1, v1);
  let dot12 = dot(v1, v2);

  let invDenom = 1.0 / (dot00 * dot11 - dot01 * dot01);
  let u = (dot11 * dot02 - dot01 * dot12) * invDenom;
  let v = (dot00 * dot12 - dot01 * dot02) * invDenom;

  return (u >= 0.0) && (v >= 0.0) && (u + v <= 1.0);
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  let time = uniforms.time;
  let baseColor = input.color;
  let isDragging = input.isDragging;
  let pieceIdx = i32(input.pieceIdx);
  let piece = pieces[pieceIdx];

  // Get pixel position in canvas space
  let pixelX = input.position.x;
  let pixelY = uniforms.canvasHeight - input.position.y;

  let p = vec2f(pixelX, pixelY);

  // Get vertices
  let v0 = vec2f(piece.v0x, piece.v0y);
  let v1 = vec2f(piece.v1x, piece.v1y);
  let v2 = vec2f(piece.v2x, piece.v2y);
  let v3 = vec2f(piece.v3x, piece.v3y);
  let vertCount = i32(piece.vertexCount);

  // Check if point is inside polygon
  var inside = false;
  if (vertCount == 3) {
    inside = pointInTriangle(p, v0, v1, v2);
  } else if (vertCount == 4) {
    // Split quad into two triangles
    inside = pointInTriangle(p, v0, v1, v2) || pointInTriangle(p, v0, v2, v3);
  }

  // Calculate distance to edges for glow
  var minDist = 1000.0;
  let verts = array<vec2f, 4>(v0, v1, v2, v3);

  for (var i = 0; i < vertCount; i = i + 1) {
    let j = (i + 1) % vertCount;
    let edge = verts[j] - verts[i];
    let toPoint = p - verts[i];
    let t = clamp(dot(toPoint, edge) / dot(edge, edge), 0.0, 1.0);
    let closest = verts[i] + edge * t;
    let d = length(p - closest);
    minDist = min(minDist, d);
  }

  if (!inside && minDist > 15.0) {
    discard;
  }

  // Holographic piece coloring
  let hueShift = f32(pieceIdx) * 0.5 + time * 0.3;
  let holoR = sin(hueShift) * 0.15 + 0.85;
  let holoG = sin(hueShift + 2.094) * 0.15 + 0.85;
  let holoB = sin(hueShift + 4.188) * 0.15 + 0.85;

  var color = baseColor * vec3f(holoR, holoG, holoB);
  var alpha = 0.9;

  if (inside) {
    // Inner scanlines
    let scanLine = sin(p.y * 0.5 + time * 2.0) * 0.1 + 0.9;
    color *= scanLine;

    // Edge highlight
    let edgeHighlight = smoothstep(10.0, 0.0, minDist);
    color += vec3f(0.3, 0.2, 0.4) * edgeHighlight;

    // Dragging effect
    if (isDragging > 0.5) {
      let pulse = sin(time * 8.0) * 0.2 + 0.8;
      color += vec3f(0.2, 0.1, 0.3) * pulse;
      color += baseColor * 0.2;
    }
  } else {
    // Outer glow
    let glowIntensity = smoothstep(15.0, 0.0, minDist);
    color = baseColor * glowIntensity;

    if (isDragging > 0.5) {
      color += vec3f(0.3, 0.2, 0.5) * glowIntensity;
    }

    alpha = glowIntensity * 0.6;
  }

  return vec4f(color, alpha);
}
`;

// Particle shader
export const particleShader = /* wgsl */`
struct Uniforms {
  time: f32,
  aspectRatio: f32,
  _pad1: f32,
  _pad2: f32,
}

struct Particle {
  x: f32,
  y: f32,
  vx: f32,
  vy: f32,
  life: f32,
  maxLife: f32,
  size: f32,
  type: f32,
  colorR: f32,
  colorG: f32,
  colorB: f32,
  colorA: f32,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;
@group(0) @binding(1) var<storage, read> particles: array<Particle>;

struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) localUV: vec2f,
  @location(1) life: f32,
  @location(2) color: vec4f,
  @location(3) particleType: f32,
}

@vertex
fn vertexMain(
  @builtin(vertex_index) vertexIndex: u32,
  @builtin(instance_index) instanceIndex: u32
) -> VertexOutput {
  var corners = array<vec2f, 6>(
    vec2f(-1.0, -1.0),
    vec2f(1.0, -1.0),
    vec2f(-1.0, 1.0),
    vec2f(-1.0, 1.0),
    vec2f(1.0, -1.0),
    vec2f(1.0, 1.0)
  );

  let p = particles[instanceIndex];
  let corner = corners[vertexIndex];

  let x = p.x * 2.0 - 1.0 + corner.x * p.size;
  let y = 1.0 - p.y * 2.0 + corner.y * p.size * uniforms.aspectRatio;

  var output: VertexOutput;
  output.position = vec4f(x, y, 0.0, 1.0);
  output.localUV = corner;
  output.life = p.life / p.maxLife;
  output.color = vec4f(p.colorR, p.colorG, p.colorB, p.colorA);
  output.particleType = p.type;
  return output;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  let uv = input.localUV;
  let life = input.life;
  let baseColor = input.color;
  let pType = input.particleType;
  let time = uniforms.time;

  let dist = length(uv);
  var alpha = 0.0;
  var color = baseColor.rgb;

  if (pType < 0.5) {
    // Drag trail - holographic sparkle
    let angle = atan2(uv.y, uv.x);
    let star = abs(sin(angle * 3.0 + time * 5.0)) * 0.3 + 0.7;
    alpha = (1.0 - dist * star) * life;
    alpha = max(0.0, alpha);

    // Rainbow shimmer
    let hue = time * 2.0 + life * 6.28;
    color.r += sin(hue) * 0.2;
    color.g += sin(hue + 2.094) * 0.2;
    color.b += sin(hue + 4.188) * 0.2;
  } else if (pType < 1.5) {
    // Rotation burst - expanding ring
    let ring = abs(dist - 0.5 * (1.0 - life));
    alpha = (1.0 - smoothstep(0.0, 0.15, ring)) * life;
  } else if (pType < 2.5) {
    // Snap effect - geometric
    let sqDist = max(abs(uv.x), abs(uv.y));
    alpha = (1.0 - sqDist) * life;
    alpha = pow(alpha, 1.5);
  } else {
    // Ambient hologram dust
    alpha = (1.0 - dist) * life * 0.5;
  }

  alpha *= baseColor.a;

  return vec4f(color, alpha);
}
`;

// Victory overlay shader
export const victoryShader = /* wgsl */`
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

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  let uv = input.uv;
  let time = uniforms.time;
  let progress = uniforms.progress;
  let center = vec2f(uniforms.centerX, uniforms.centerY);

  if (progress < 0.01) {
    discard;
  }

  let dist = length(uv - center);

  // Expanding holographic ring
  let ringRadius = progress * 1.5;
  let ringWidth = 0.08 + progress * 0.15;
  let ring = 1.0 - smoothstep(ringWidth * 0.5, ringWidth, abs(dist - ringRadius));

  // Rainbow holographic color
  let hue = uv.x * 3.0 + uv.y * 2.0 + time;
  let r = sin(hue) * 0.5 + 0.5;
  let g = sin(hue + 2.094) * 0.5 + 0.5;
  let b = sin(hue + 4.188) * 0.5 + 0.5;
  let holoColor = vec3f(r, g, b);

  // Inner glow
  let innerGlow = 1.0 - smoothstep(0.0, ringRadius, dist);
  innerGlow *= (1.0 - progress);

  // Sparkle pattern
  let sparkle = sin(uv.x * 40.0 + time) * sin(uv.y * 40.0 + time);
  sparkle = smoothstep(0.8, 1.0, sparkle) * innerGlow;

  var color = holoColor * ring;
  color += vec3f(0.5, 0.3, 0.7) * innerGlow * 0.4;
  color += vec3f(1.0, 0.9, 1.0) * sparkle;

  let alpha = ring * 0.8 + innerGlow * 0.3 + sparkle * 0.5;

  if (alpha < 0.01) {
    discard;
  }

  return vec4f(color, alpha * progress);
}
`;
