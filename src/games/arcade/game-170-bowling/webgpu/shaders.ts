/**
 * Bowling WebGPU Shaders
 * Game #170 - Bowling Alley Theme with wood lane and spotlights
 */

export const backgroundShader = /* wgsl */ `
struct Uniforms {
  time: f32,
  aspectRatio: f32,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;

struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) uv: vec2f,
}

@vertex
fn vertexMain(@builtin(vertex_index) vertexIndex: u32) -> VertexOutput {
  var pos = array<vec2f, 4>(
    vec2f(-1.0, -1.0),
    vec2f(1.0, -1.0),
    vec2f(-1.0, 1.0),
    vec2f(1.0, 1.0)
  );

  var output: VertexOutput;
  output.position = vec4f(pos[vertexIndex], 0.0, 1.0);
  output.uv = pos[vertexIndex] * 0.5 + 0.5;
  return output;
}

// Noise function for wood grain
fn hash(p: vec2f) -> f32 {
  return fract(sin(dot(p, vec2f(127.1, 311.7))) * 43758.5453);
}

fn noise(p: vec2f) -> f32 {
  let i = floor(p);
  let f = fract(p);
  let u = f * f * (3.0 - 2.0 * f);

  return mix(
    mix(hash(i), hash(i + vec2f(1.0, 0.0)), u.x),
    mix(hash(i + vec2f(0.0, 1.0)), hash(i + vec2f(1.0, 1.0)), u.x),
    u.y
  );
}

fn fbm(p: vec2f) -> f32 {
  var value = 0.0;
  var amplitude = 0.5;
  var pos = p;

  for (var i = 0; i < 4; i++) {
    value += amplitude * noise(pos);
    pos *= 2.0;
    amplitude *= 0.5;
  }

  return value;
}

// Wood grain pattern
fn woodGrain(uv: vec2f) -> f32 {
  let grain = fbm(vec2f(uv.x * 2.0, uv.y * 30.0));
  let stripes = sin(uv.x * 50.0 + grain * 5.0) * 0.5 + 0.5;
  return mix(grain, stripes, 0.3);
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  let uv = input.uv;
  let time = uniforms.time;

  // Bowling alley background
  let bgDark = vec3f(0.1, 0.12, 0.15);
  let bgLight = vec3f(0.18, 0.22, 0.28);
  var color = mix(bgDark, bgLight, uv.y);

  // Lane area
  let laneLeft = 0.25;
  let laneRight = 0.75;
  let laneWidth = laneRight - laneLeft;

  if (uv.x > laneLeft && uv.x < laneRight) {
    // Wood color
    let woodLight = vec3f(0.82, 0.68, 0.50);
    let woodDark = vec3f(0.55, 0.42, 0.30);

    // Wood grain
    let laneUV = vec2f((uv.x - laneLeft) / laneWidth, uv.y);
    let grain = woodGrain(laneUV);
    let woodColor = mix(woodDark, woodLight, grain);

    // Lane boards
    let boardIndex = floor(laneUV.x * 8.0);
    let boardEdge = fract(laneUV.x * 8.0);
    let boardLine = smoothstep(0.0, 0.02, boardEdge) * smoothstep(1.0, 0.98, boardEdge);

    color = woodColor * (0.85 + boardLine * 0.15);

    // Arrows on lane
    let arrowY = 0.55;
    let arrowHeight = 0.04;
    if (uv.y > arrowY - arrowHeight && uv.y < arrowY + arrowHeight) {
      for (var i = 0; i < 5; i++) {
        let arrowX = 0.5 + f32(i - 2) * 0.05;
        let dx = uv.x - arrowX;
        let dy = (uv.y - arrowY) / arrowHeight;

        if (abs(dx) < 0.015 * (1.0 - abs(dy)) && dy < 0.8) {
          color = mix(color, vec3f(0.2, 0.2, 0.25), 0.3);
        }
      }
    }

    // Foul line
    let foulLineY = 0.8;
    if (abs(uv.y - foulLineY) < 0.004) {
      color = vec3f(0.9, 0.25, 0.2);
    }
  } else {
    // Gutters
    let gutterColor = vec3f(0.15, 0.18, 0.22);
    color = gutterColor;

    // Gutter edge highlight
    let edgeDist = min(abs(uv.x - laneLeft), abs(uv.x - laneRight));
    if (edgeDist < 0.03) {
      color = mix(color, vec3f(0.25, 0.30, 0.35), 1.0 - edgeDist / 0.03);
    }
  }

  // Spotlights from above
  for (var i = 0; i < 3; i++) {
    let spotX = 0.3 + f32(i) * 0.2;
    let spotY = 0.1;
    let spotPos = vec2f(spotX, spotY);
    let dist = length(uv - spotPos);
    let spotlight = exp(-dist * dist * 20.0) * 0.4;
    let pulse = sin(time * 0.5 + f32(i) * 2.0) * 0.1 + 0.9;
    color += vec3f(1.0, 0.95, 0.85) * spotlight * pulse;
  }

  // Pin area glow
  let pinAreaY = 0.15;
  if (uv.y < 0.25 && uv.x > 0.35 && uv.x < 0.65) {
    let glowIntensity = smoothstep(0.25, 0.1, uv.y) * 0.3;
    let flicker = sin(time * 3.0) * 0.05 + 0.95;
    color += vec3f(1.0, 0.98, 0.9) * glowIntensity * flicker;
  }

  // Vignette
  let vignette = 1.0 - length((uv - 0.5) * vec2f(1.2, 0.8)) * 0.5;
  color *= vignette;

  return vec4f(color, 1.0);
}
`;

export const particleShader = /* wgsl */ `
struct Uniforms {
  time: f32,
  aspectRatio: f32,
}

struct Particle {
  position: vec2f,
  velocity: vec2f,
  color: vec4f,
  size: f32,
  life: f32,
  maxLife: f32,
  particleType: f32,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;
@group(0) @binding(1) var<storage, read> particles: array<Particle>;

struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) color: vec4f,
  @location(1) uv: vec2f,
  @location(2) particleType: f32,
}

@vertex
fn vertexMain(
  @builtin(vertex_index) vertexIndex: u32,
  @builtin(instance_index) instanceIndex: u32
) -> VertexOutput {
  let particle = particles[instanceIndex];

  var corners = array<vec2f, 4>(
    vec2f(-1.0, -1.0),
    vec2f(1.0, -1.0),
    vec2f(-1.0, 1.0),
    vec2f(1.0, 1.0)
  );

  let corner = corners[vertexIndex];
  let lifeRatio = particle.life / particle.maxLife;
  let size = particle.size * lifeRatio;

  var pos = particle.position + corner * size * vec2f(1.0 / uniforms.aspectRatio, 1.0);
  pos = pos * 2.0 - 1.0;

  var output: VertexOutput;
  output.position = vec4f(pos, 0.0, 1.0);
  output.color = particle.color;
  output.uv = corner * 0.5 + 0.5;
  output.particleType = particle.particleType;
  return output;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  let dist = length(input.uv - 0.5) * 2.0;
  var alpha = input.color.a;
  let pType = i32(input.particleType);

  if (pType == 0) {
    // Ball roll trail - solid circles
    alpha *= smoothstep(1.0, 0.6, dist);
  } else if (pType == 1) {
    // Pin hit sparks - sharp points
    let angle = atan2(input.uv.y - 0.5, input.uv.x - 0.5);
    let star = 0.5 + 0.5 * sin(angle * 6.0);
    alpha *= smoothstep(1.0, 0.3, dist * (0.8 + star * 0.4));
  } else if (pType == 2) {
    // Pin fall - tumbling rectangles
    let rectDist = max(abs(input.uv.x - 0.5), abs(input.uv.y - 0.5)) * 2.0;
    alpha *= smoothstep(1.0, 0.7, rectDist);
  } else if (pType == 3) {
    // Strike - golden burst
    let angle = atan2(input.uv.y - 0.5, input.uv.x - 0.5);
    let rays = pow(0.5 + 0.5 * sin(angle * 12.0), 2.0);
    alpha *= smoothstep(1.0, 0.0, dist) * (0.7 + rays * 0.5);
  } else if (pType == 4) {
    // Spare - blue sparkle
    let sparkle = pow(0.5 + 0.5 * sin(dist * 20.0), 3.0);
    alpha *= smoothstep(1.0, 0.2, dist) * (0.8 + sparkle * 0.4);
  } else {
    // Game over - soft glow
    alpha *= smoothstep(1.0, 0.0, dist * dist);
  }

  return vec4f(input.color.rgb, alpha);
}
`;
