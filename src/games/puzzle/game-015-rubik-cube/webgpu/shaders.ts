/**
 * WGSL Shaders - Rubik Cube
 * Neon Matrix Cube Theme
 * Game #015
 */

/**
 * Background shader - Matrix-style digital rain with 3D grid
 */
export const backgroundShader = /* wgsl */ `
struct Uniforms {
  time: f32,
  aspectRatio: f32,
  pad0: f32,
  pad1: f32,
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

fn hash(p: vec2f) -> f32 {
  return fract(sin(dot(p, vec2f(127.1, 311.7))) * 43758.5453);
}

fn matrixRain(uv: vec2f, time: f32) -> f32 {
  let cols = 40.0;
  let col = floor(uv.x * cols);
  let offset = hash(vec2f(col, 0.0));
  let speed = 0.3 + hash(vec2f(col, 1.0)) * 0.4;

  let y = fract(uv.y + time * speed + offset);
  let fade = smoothstep(0.0, 0.3, y) * smoothstep(1.0, 0.5, y);

  let charY = floor(y * 20.0);
  let charRand = hash(vec2f(col, charY + floor(time * 2.0)));

  return fade * step(0.7, charRand) * 0.15;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  let uv = input.uv;
  let time = uniforms.time;

  // Deep space background
  var color = vec3f(0.02, 0.01, 0.05);

  // Matrix rain effect
  let rain = matrixRain(uv, time);
  color += vec3f(0.0, rain, rain * 0.5);

  // 3D grid perspective
  let gridUV = (uv - 0.5) * 2.0;
  let perspective = 1.0 / (1.0 + abs(gridUV.y) * 0.5);
  let gridX = fract(gridUV.x * 10.0 * perspective);
  let gridY = fract((gridUV.y + time * 0.05) * 10.0);

  let gridLineX = smoothstep(0.02, 0.0, abs(gridX - 0.5) - 0.48);
  let gridLineY = smoothstep(0.02, 0.0, abs(gridY - 0.5) - 0.48);
  let grid = max(gridLineX, gridLineY) * 0.1 * (1.0 - abs(gridUV.y));

  color += vec3f(0.0, grid * 0.8, grid);

  // Radial glow
  let dist = length(uv - 0.5);
  let glow = exp(-dist * 2.0) * 0.15;
  color += vec3f(glow * 0.3, glow * 0.5, glow);

  // Scan lines
  let scanLine = sin(uv.y * 400.0 + time * 2.0) * 0.02 + 0.98;
  color *= scanLine;

  return vec4f(color, 1.0);
}
`;

/**
 * Cubie shader - Individual cube pieces with neon edges
 */
export const cubieShader = /* wgsl */ `
struct Uniforms {
  viewProjection: mat4x4f,
  time: f32,
  cubieCount: f32,
  pad0: f32,
  pad1: f32,
}

struct CubieData {
  transform: mat4x4f,    // 4x4 transform matrix
  faceColors: array<vec4f, 6>, // 6 face colors (RGBA)
  isRotating: f32,
  rotationProgress: f32,
  pad0: f32,
  pad1: f32,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;
@group(0) @binding(1) var<storage, read> cubies: array<CubieData>;

struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) worldPos: vec3f,
  @location(1) normal: vec3f,
  @location(2) @interpolate(flat) faceIndex: u32,
  @location(3) @interpolate(flat) instanceId: u32,
  @location(4) localPos: vec3f,
}

// Cube vertices and normals for 6 faces (36 vertices total)
fn getCubeVertex(vertexId: u32) -> vec3f {
  // Each face is 2 triangles = 6 vertices
  let faceId = vertexId / 6u;
  let localId = vertexId % 6u;

  // Triangle indices for a quad
  var quadIndices = array<u32, 6>(0u, 1u, 2u, 2u, 1u, 3u);
  let quadVertex = quadIndices[localId];

  let size = 0.45;

  // Generate vertices based on face
  switch faceId {
    case 0u: { // Front (+Z)
      let x = select(-size, size, (quadVertex & 1u) != 0u);
      let y = select(-size, size, (quadVertex & 2u) != 0u);
      return vec3f(x, y, size);
    }
    case 1u: { // Back (-Z)
      let x = select(size, -size, (quadVertex & 1u) != 0u);
      let y = select(-size, size, (quadVertex & 2u) != 0u);
      return vec3f(x, y, -size);
    }
    case 2u: { // Right (+X)
      let z = select(size, -size, (quadVertex & 1u) != 0u);
      let y = select(-size, size, (quadVertex & 2u) != 0u);
      return vec3f(size, y, z);
    }
    case 3u: { // Left (-X)
      let z = select(-size, size, (quadVertex & 1u) != 0u);
      let y = select(-size, size, (quadVertex & 2u) != 0u);
      return vec3f(-size, y, z);
    }
    case 4u: { // Top (+Y)
      let x = select(-size, size, (quadVertex & 1u) != 0u);
      let z = select(size, -size, (quadVertex & 2u) != 0u);
      return vec3f(x, size, z);
    }
    default: { // Bottom (-Y)
      let x = select(-size, size, (quadVertex & 1u) != 0u);
      let z = select(-size, size, (quadVertex & 2u) != 0u);
      return vec3f(x, -size, z);
    }
  }
}

fn getFaceNormal(faceId: u32) -> vec3f {
  switch faceId {
    case 0u: { return vec3f(0.0, 0.0, 1.0); }  // Front
    case 1u: { return vec3f(0.0, 0.0, -1.0); } // Back
    case 2u: { return vec3f(1.0, 0.0, 0.0); }  // Right
    case 3u: { return vec3f(-1.0, 0.0, 0.0); } // Left
    case 4u: { return vec3f(0.0, 1.0, 0.0); }  // Top
    default: { return vec3f(0.0, -1.0, 0.0); } // Bottom
  }
}

@vertex
fn vertexMain(
  @builtin(vertex_index) vertexIndex: u32,
  @builtin(instance_index) instanceIndex: u32
) -> VertexOutput {
  let cubie = cubies[instanceIndex];
  let faceIndex = vertexIndex / 6u;

  let localPos = getCubeVertex(vertexIndex);
  let normal = getFaceNormal(faceIndex);

  // Apply cubie transform
  let worldPos4 = cubie.transform * vec4f(localPos, 1.0);
  let worldNormal = normalize((cubie.transform * vec4f(normal, 0.0)).xyz);

  var output: VertexOutput;
  output.position = uniforms.viewProjection * worldPos4;
  output.worldPos = worldPos4.xyz;
  output.normal = worldNormal;
  output.faceIndex = faceIndex;
  output.instanceId = instanceIndex;
  output.localPos = localPos;

  return output;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  let cubie = cubies[input.instanceId];
  let faceColor = cubie.faceColors[input.faceIndex];
  let time = uniforms.time;

  // Skip rendering if face is black (internal face)
  if (faceColor.r < 0.1 && faceColor.g < 0.1 && faceColor.b < 0.1) {
    return vec4f(0.05, 0.05, 0.08, 1.0);
  }

  // Basic lighting
  let lightDir = normalize(vec3f(0.5, 1.0, 0.8));
  let ambient = 0.3;
  let diffuse = max(dot(input.normal, lightDir), 0.0) * 0.6;
  let lighting = ambient + diffuse;

  // Face color with lighting
  var color = faceColor.rgb * lighting;

  // Neon edge glow
  let edgeDist = min(
    min(abs(abs(input.localPos.x) - 0.45), abs(abs(input.localPos.y) - 0.45)),
    abs(abs(input.localPos.z) - 0.45)
  );
  let edgeGlow = smoothstep(0.05, 0.0, edgeDist);

  // Pulsing edge effect
  let pulse = sin(time * 3.0) * 0.3 + 0.7;
  color += faceColor.rgb * edgeGlow * pulse * 0.8;

  // Rotating piece highlight
  if (cubie.isRotating > 0.5) {
    let rotateGlow = sin(cubie.rotationProgress * 3.14159) * 0.3;
    color += vec3f(0.2, 0.8, 1.0) * rotateGlow;
  }

  // Specular highlight
  let viewDir = normalize(-input.worldPos);
  let halfDir = normalize(lightDir + viewDir);
  let specular = pow(max(dot(input.normal, halfDir), 0.0), 32.0) * 0.4;
  color += vec3f(1.0) * specular;

  return vec4f(color, 1.0);
}
`;

/**
 * Particle shader - 3D particles for effects
 */
export const particleShader = /* wgsl */ `
struct Uniforms {
  viewProjection: mat4x4f,
  time: f32,
  particleCount: f32,
  pad0: f32,
  pad1: f32,
}

struct Particle {
  position: vec3f,
  size: f32,
  velocity: vec3f,
  life: f32,
  color: vec4f,
  particleType: f32,
  maxLife: f32,
  pad0: f32,
  pad1: f32,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;
@group(0) @binding(1) var<storage, read> particles: array<Particle>;

struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) uv: vec2f,
  @location(1) color: vec4f,
  @location(2) particleType: f32,
}

@vertex
fn vertexMain(
  @builtin(vertex_index) vertexIndex: u32,
  @builtin(instance_index) instanceIndex: u32
) -> VertexOutput {
  let particle = particles[instanceIndex];

  // Billboard quad
  var quadPos = array<vec2f, 6>(
    vec2f(-1.0, -1.0),
    vec2f(1.0, -1.0),
    vec2f(-1.0, 1.0),
    vec2f(-1.0, 1.0),
    vec2f(1.0, -1.0),
    vec2f(1.0, 1.0)
  );

  let localOffset = quadPos[vertexIndex] * particle.size;

  // Billboard in view space
  let worldPos = vec4f(particle.position, 1.0);
  var clipPos = uniforms.viewProjection * worldPos;
  clipPos.x += localOffset.x * 0.1;
  clipPos.y += localOffset.y * 0.1;

  var output: VertexOutput;
  output.position = clipPos;
  output.uv = quadPos[vertexIndex] * 0.5 + 0.5;
  output.color = particle.color;
  output.particleType = particle.particleType;

  return output;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  let uv = input.uv;
  let dist = length(uv - 0.5) * 2.0;

  var alpha = 0.0;
  var color = input.color.rgb;

  let pType = i32(input.particleType);

  switch pType {
    case 0: { // Rotation sparkle
      alpha = smoothstep(1.0, 0.3, dist) * input.color.a;
      let sparkle = sin(dist * 10.0 + uniforms.time * 5.0) * 0.3 + 0.7;
      color *= sparkle;
    }
    case 1: { // Scramble burst
      let ring = abs(dist - 0.6);
      alpha = smoothstep(0.15, 0.0, ring) * input.color.a;
      color = mix(color, vec3f(1.0), smoothstep(0.1, 0.0, ring));
    }
    case 2: { // Complete celebration
      alpha = smoothstep(1.0, 0.0, dist) * input.color.a;
      let rainbow = sin(vec3f(0.0, 2.094, 4.188) + uniforms.time * 3.0 + dist * 5.0) * 0.5 + 0.5;
      color = mix(color, rainbow, 0.5);
    }
    case 3: { // Trail particle
      alpha = (1.0 - dist * dist) * input.color.a;
    }
    default: { // Ambient
      alpha = smoothstep(1.0, 0.5, dist) * input.color.a * 0.5;
    }
  }

  if (alpha < 0.01) {
    discard;
  }

  return vec4f(color, alpha);
}
`;

/**
 * Victory shader - Full-screen celebration effect
 */
export const victoryShader = /* wgsl */ `
struct Uniforms {
  time: f32,
  progress: f32,
  pad0: f32,
  pad1: f32,
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

  if (progress < 0.01) {
    discard;
  }

  let center = vec2f(0.5, 0.5);
  let dist = length(uv - center);

  // Expanding rings
  var rings = 0.0;
  for (var i = 0; i < 5; i++) {
    let ringDist = f32(i) * 0.15 + time * 0.3;
    let ring = abs(dist - fract(ringDist));
    rings += smoothstep(0.03, 0.0, ring) * (1.0 - f32(i) * 0.15);
  }

  // Rainbow colors
  let angle = atan2(uv.y - 0.5, uv.x - 0.5);
  let hue = (angle / 6.28318 + 0.5 + time * 0.2);
  let rainbow = vec3f(
    sin(hue * 6.28318) * 0.5 + 0.5,
    sin(hue * 6.28318 + 2.094) * 0.5 + 0.5,
    sin(hue * 6.28318 + 4.188) * 0.5 + 0.5
  );

  // Cube grid pattern
  let gridUV = fract(uv * 6.0);
  let gridLine = smoothstep(0.05, 0.0, min(gridUV.x, gridUV.y));

  // Combine effects
  var color = rainbow * rings;
  color += vec3f(0.0, 1.0, 1.0) * gridLine * 0.2;

  // Center burst
  let burst = smoothstep(0.5, 0.0, dist) * sin(progress * 3.14159);
  color += vec3f(1.0, 1.0, 1.0) * burst * 0.5;

  let alpha = (rings * 0.6 + burst * 0.4 + gridLine * 0.1) * progress;

  return vec4f(color, alpha * 0.7);
}
`;
