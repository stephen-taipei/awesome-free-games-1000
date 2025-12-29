/**
 * WGSL Shaders - Memory Match
 * Neural Sync Theme
 * Game #016
 */

/**
 * Background shader - Neural network visualization
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

fn noise(p: vec2f) -> f32 {
  let i = floor(p);
  let f = fract(p);
  let u = f * f * (3.0 - 2.0 * f);

  return mix(
    mix(hash(i + vec2f(0.0, 0.0)), hash(i + vec2f(1.0, 0.0)), u.x),
    mix(hash(i + vec2f(0.0, 1.0)), hash(i + vec2f(1.0, 1.0)), u.x),
    u.y
  );
}

// Neural node positions
fn neuralNode(uv: vec2f, center: vec2f, time: f32) -> f32 {
  let dist = length(uv - center);
  let pulse = sin(time * 2.0 + center.x * 10.0) * 0.3 + 0.7;
  return smoothstep(0.02, 0.0, dist) * pulse;
}

// Neural connection line
fn neuralConnection(uv: vec2f, p1: vec2f, p2: vec2f, time: f32) -> f32 {
  let d = p2 - p1;
  let t = clamp(dot(uv - p1, d) / dot(d, d), 0.0, 1.0);
  let proj = p1 + t * d;
  let dist = length(uv - proj);

  // Pulse along connection
  let pulse = sin(t * 10.0 - time * 3.0) * 0.3 + 0.7;

  return smoothstep(0.005, 0.0, dist) * pulse * 0.3;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  let uv = input.uv;
  let time = uniforms.time;

  // Deep brain background
  var color = vec3f(0.02, 0.01, 0.04);

  // Subtle organic noise
  let n = noise(uv * 5.0 + time * 0.1) * 0.05;
  color += vec3f(n * 0.3, n * 0.1, n * 0.5);

  // Neural nodes
  let nodes = array<vec2f, 8>(
    vec2f(0.15, 0.2),
    vec2f(0.85, 0.3),
    vec2f(0.25, 0.75),
    vec2f(0.75, 0.8),
    vec2f(0.5, 0.15),
    vec2f(0.5, 0.85),
    vec2f(0.1, 0.5),
    vec2f(0.9, 0.5)
  );

  // Draw connections
  var connections = 0.0;
  for (var i = 0; i < 8; i++) {
    for (var j = i + 1; j < 8; j++) {
      connections += neuralConnection(uv, nodes[i], nodes[j], time + f32(i) * 0.5);
    }
  }
  color += vec3f(0.2, 0.4, 0.8) * connections;

  // Draw nodes
  var nodeGlow = 0.0;
  for (var i = 0; i < 8; i++) {
    nodeGlow += neuralNode(uv, nodes[i], time);
  }
  color += vec3f(0.4, 0.8, 1.0) * nodeGlow;

  // Hex grid pattern
  let hexUV = uv * 15.0;
  let hexGrid = abs(sin(hexUV.x * 1.732) + sin(hexUV.y + hexUV.x * 0.5));
  let hexLine = smoothstep(0.1, 0.0, hexGrid - 1.8) * 0.08;
  color += vec3f(0.3, 0.5, 0.8) * hexLine;

  // Radial vignette
  let dist = length(uv - 0.5);
  color *= 1.0 - dist * 0.5;

  // Pulse wave
  let wave = sin(dist * 20.0 - time * 2.0) * 0.02;
  color += vec3f(0.5, 0.3, 0.8) * max(0.0, wave) * (1.0 - dist);

  return vec4f(color, 1.0);
}
`;

/**
 * Card shader - Individual memory cards
 */
export const cardShader = /* wgsl */ `
struct Uniforms {
  time: f32,
  cardCount: f32,
  canvasWidth: f32,
  canvasHeight: f32,
}

struct CardData {
  x: f32,
  y: f32,
  width: f32,
  height: f32,
  flipProgress: f32,  // 0 = face down, 1 = face up
  isMatched: f32,
  matchedTime: f32,
  colorIndex: f32,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;
@group(0) @binding(1) var<storage, read> cards: array<CardData>;

struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) uv: vec2f,
  @location(1) @interpolate(flat) cardIndex: u32,
}

@vertex
fn vertexMain(
  @builtin(vertex_index) vertexIndex: u32,
  @builtin(instance_index) instanceIndex: u32
) -> VertexOutput {
  let card = cards[instanceIndex];

  // Quad vertices
  var quadPos = array<vec2f, 6>(
    vec2f(0.0, 0.0),
    vec2f(1.0, 0.0),
    vec2f(0.0, 1.0),
    vec2f(0.0, 1.0),
    vec2f(1.0, 0.0),
    vec2f(1.0, 1.0)
  );

  let localPos = quadPos[vertexIndex];

  // Card flip effect (scale X based on flip progress)
  let flipAngle = card.flipProgress * 3.14159;
  let flipScale = abs(cos(flipAngle));

  // Calculate card position with flip
  let centerX = card.x + card.width * 0.5;
  var worldX = centerX + (localPos.x - 0.5) * card.width * flipScale;
  let worldY = card.y + localPos.y * card.height;

  // Matched cards float up slightly
  var offsetY = 0.0;
  if (card.isMatched > 0.5) {
    offsetY = sin(uniforms.time * 3.0 + card.matchedTime) * 3.0;
  }

  // Convert to clip space
  let clipX = (worldX / uniforms.canvasWidth) * 2.0 - 1.0;
  let clipY = ((worldY + offsetY) / uniforms.canvasHeight) * 2.0 - 1.0;

  var output: VertexOutput;
  output.position = vec4f(clipX, clipY, 0.0, 1.0);
  output.uv = localPos;
  output.cardIndex = instanceIndex;

  return output;
}

// Neural pattern for card back
fn neuralPattern(uv: vec2f, time: f32) -> f32 {
  var pattern = 0.0;

  // Concentric circles
  let dist = length(uv - 0.5);
  pattern += sin(dist * 20.0 - time * 2.0) * 0.3;

  // Cross pattern
  let cross = min(abs(uv.x - 0.5), abs(uv.y - 0.5));
  pattern += smoothstep(0.05, 0.0, cross) * 0.5;

  // Corner nodes
  let corners = array<vec2f, 4>(
    vec2f(0.15, 0.15),
    vec2f(0.85, 0.15),
    vec2f(0.15, 0.85),
    vec2f(0.85, 0.85)
  );

  for (var i = 0; i < 4; i++) {
    let d = length(uv - corners[i]);
    pattern += smoothstep(0.08, 0.0, d);
  }

  return clamp(pattern, 0.0, 1.0);
}

// Symbol for card face
fn symbolPattern(uv: vec2f, symbolId: f32, time: f32) -> vec3f {
  let centered = uv - 0.5;

  // Different symbol shapes based on ID
  let shape = i32(symbolId) % 8;
  var symbol = 0.0;

  switch shape {
    case 0: { // Circle
      let dist = length(centered);
      symbol = smoothstep(0.32, 0.28, dist) * (1.0 - smoothstep(0.25, 0.21, dist));
    }
    case 1: { // Square
      let box = max(abs(centered.x), abs(centered.y));
      symbol = smoothstep(0.32, 0.28, box) * (1.0 - smoothstep(0.25, 0.21, box));
    }
    case 2: { // Diamond
      let diamond = abs(centered.x) + abs(centered.y);
      symbol = smoothstep(0.42, 0.38, diamond) * (1.0 - smoothstep(0.35, 0.31, diamond));
    }
    case 3: { // Triangle
      let tri = max(centered.y * 0.866 + centered.x * 0.5, centered.y * 0.866 - centered.x * 0.5);
      let triMax = max(tri, -centered.y * 0.5);
      symbol = smoothstep(0.28, 0.24, triMax) * (1.0 - smoothstep(0.21, 0.17, triMax));
    }
    case 4: { // Star
      let angle = atan2(centered.y, centered.x);
      let dist = length(centered);
      let star = dist * (1.0 + sin(angle * 5.0) * 0.3);
      symbol = smoothstep(0.35, 0.31, star) * (1.0 - smoothstep(0.28, 0.24, star));
    }
    case 5: { // Hexagon
      let hex = max(abs(centered.x) * 0.866 + abs(centered.y) * 0.5, abs(centered.y));
      symbol = smoothstep(0.32, 0.28, hex) * (1.0 - smoothstep(0.25, 0.21, hex));
    }
    case 6: { // Cross
      let crossX = abs(centered.x);
      let crossY = abs(centered.y);
      let cross = min(crossX, crossY);
      symbol = step(cross, 0.1) * step(max(crossX, crossY), 0.3);
    }
    default: { // Ring
      let dist = length(centered);
      symbol = smoothstep(0.32, 0.28, dist) * smoothstep(0.15, 0.19, dist);
    }
  }

  // Color based on symbol ID
  let hue = symbolId * 0.125;
  let col = vec3f(
    sin(hue * 6.28318 + 0.0) * 0.5 + 0.5,
    sin(hue * 6.28318 + 2.094) * 0.5 + 0.5,
    sin(hue * 6.28318 + 4.188) * 0.5 + 0.5
  );

  return col * symbol;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  let card = cards[input.cardIndex];
  let uv = input.uv;
  let time = uniforms.time;

  let flipAngle = card.flipProgress * 3.14159;
  let showFront = cos(flipAngle) < 0.0;

  var color = vec3f(0.0);

  // Card base with rounded corners
  let cornerDist = length(max(abs(uv - 0.5) - vec2f(0.42, 0.42), vec2f(0.0)));
  if (cornerDist > 0.04) {
    discard;
  }

  // Card edge glow
  let edgeDist = max(abs(uv.x - 0.5), abs(uv.y - 0.5));
  let edgeGlow = smoothstep(0.48, 0.44, edgeDist);

  if (showFront) {
    // Face up - show symbol
    color = vec3f(0.08, 0.05, 0.12); // Dark purple background

    // Symbol
    let symbol = symbolPattern(uv, card.colorIndex, time);
    color += symbol * 1.5;

    // Inner glow
    let innerGlow = smoothstep(0.5, 0.2, length(uv - 0.5));
    color += vec3f(0.1, 0.05, 0.15) * innerGlow;

    // Edge highlight
    color += vec3f(0.4, 0.6, 1.0) * (1.0 - edgeGlow) * 0.3;
  } else {
    // Face down - neural pattern
    color = vec3f(0.05, 0.08, 0.15); // Dark blue background

    // Neural pattern
    let pattern = neuralPattern(uv, time);
    color += vec3f(0.2, 0.5, 0.8) * pattern * 0.4;

    // Pulsing center
    let centerGlow = smoothstep(0.4, 0.0, length(uv - 0.5));
    let pulse = sin(time * 2.0) * 0.3 + 0.7;
    color += vec3f(0.3, 0.6, 1.0) * centerGlow * pulse * 0.2;

    // Edge
    color += vec3f(0.2, 0.4, 0.7) * (1.0 - edgeGlow) * 0.2;
  }

  // Matched effect
  if (card.isMatched > 0.5) {
    let matchPulse = sin(time * 4.0 + card.matchedTime * 10.0) * 0.2 + 0.8;
    color *= matchPulse;
    color += vec3f(0.3, 0.8, 0.5) * 0.2;

    // Connection lines to center
    let toCenter = normalize(vec2f(0.5, 0.5) - uv);
    let linePattern = abs(sin(dot(uv - 0.5, toCenter) * 30.0));
    color += vec3f(0.4, 1.0, 0.6) * smoothstep(0.9, 1.0, linePattern) * 0.3;
  }

  return vec4f(color, 1.0);
}
`;

/**
 * Particle shader - Memory sync effects
 */
export const particleShader = /* wgsl */ `
struct Uniforms {
  time: f32,
  aspectRatio: f32,
  pad0: f32,
  pad1: f32,
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
  r: f32,
  g: f32,
  b: f32,
  a: f32,
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

  var quadPos = array<vec2f, 6>(
    vec2f(-1.0, -1.0),
    vec2f(1.0, -1.0),
    vec2f(-1.0, 1.0),
    vec2f(-1.0, 1.0),
    vec2f(1.0, -1.0),
    vec2f(1.0, 1.0)
  );

  let localPos = quadPos[vertexIndex] * particle.size;

  let clipX = particle.x * 2.0 - 1.0 + localPos.x;
  let clipY = particle.y * 2.0 - 1.0 + localPos.y;

  var output: VertexOutput;
  output.position = vec4f(clipX, clipY, 0.0, 1.0);
  output.uv = quadPos[vertexIndex] * 0.5 + 0.5;
  output.color = vec4f(particle.r, particle.g, particle.b, particle.a);
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
    case 0: { // Flip sparkle
      alpha = smoothstep(1.0, 0.0, dist) * input.color.a;
      let sparkle = sin(dist * 10.0 + uniforms.time * 8.0) * 0.3 + 0.7;
      color *= sparkle;
    }
    case 1: { // Match pulse
      let ring = abs(dist - 0.6);
      alpha = smoothstep(0.15, 0.0, ring) * input.color.a;
      color = mix(color, vec3f(0.5, 1.0, 0.7), 0.5);
    }
    case 2: { // Neural connection
      let wave = sin(dist * 15.0 - uniforms.time * 5.0);
      alpha = (1.0 - dist) * max(0.0, wave) * input.color.a;
    }
    case 3: { // Win celebration
      alpha = smoothstep(1.0, 0.0, dist) * input.color.a;
      let rainbow = sin(vec3f(0.0, 2.094, 4.188) + uniforms.time * 4.0 + dist * 6.0) * 0.5 + 0.5;
      color = mix(color, rainbow, 0.7);
    }
    default: { // Ambient synapse
      alpha = smoothstep(1.0, 0.5, dist) * input.color.a * 0.6;
    }
  }

  if (alpha < 0.01) {
    discard;
  }

  return vec4f(color, alpha);
}
`;

/**
 * Victory shader - Full brain activation
 */
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

  let center = vec2f(uniforms.centerX, uniforms.centerY);
  let dist = length(uv - center);

  // Expanding brain waves
  var waves = 0.0;
  for (var i = 0; i < 6; i++) {
    let waveDist = f32(i) * 0.12 + time * 0.4;
    let wave = abs(dist - fract(waveDist));
    waves += smoothstep(0.04, 0.0, wave) * (1.0 - f32(i) * 0.12);
  }

  // Neural network activation
  let angle = atan2(uv.y - center.y, uv.x - center.x);
  let branches = abs(sin(angle * 6.0 + dist * 10.0 - time * 2.0));
  let neural = smoothstep(0.7, 1.0, branches) * (1.0 - dist * 1.5) * progress;

  // Synapse colors
  let syncColor = vec3f(
    0.4 + sin(time * 2.0) * 0.2,
    0.7 + sin(time * 3.0) * 0.2,
    1.0
  );

  // Memory orbs
  let orbAngle = time * 0.5;
  var orbs = 0.0;
  for (var i = 0; i < 8; i++) {
    let a = orbAngle + f32(i) * 0.785;
    let orbPos = center + vec2f(cos(a), sin(a)) * 0.3 * progress;
    orbs += smoothstep(0.05, 0.0, length(uv - orbPos));
  }

  var color = syncColor * waves * 0.6;
  color += vec3f(0.3, 0.8, 0.6) * neural;
  color += vec3f(1.0, 0.9, 0.5) * orbs;

  // Center burst
  let burst = smoothstep(0.3, 0.0, dist) * sin(progress * 3.14159);
  color += vec3f(1.0) * burst * 0.4;

  let alpha = (waves * 0.5 + neural * 0.3 + burst * 0.2 + orbs * 0.3) * progress;

  return vec4f(color, alpha * 0.8);
}
`;
