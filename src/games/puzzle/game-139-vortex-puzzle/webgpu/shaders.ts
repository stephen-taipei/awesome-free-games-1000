/**
 * WGSL Shaders - Vortex Puzzle
 * Cosmic Vortex / Wormhole / Space Portal Theme
 * Game #139
 */

export const BACKGROUND_SHADER = /* wgsl */ `
struct Uniforms {
  time: f32,
  width: f32,
  height: f32,
  foldProgress: f32,
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

fn hash(p: vec2f) -> f32 {
  let n = sin(dot(p, vec2f(127.1, 311.7)));
  return fract(n * 43758.5453);
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

  for (var i = 0; i < 5; i++) {
    value += amplitude * noise(pos);
    pos *= 2.0;
    amplitude *= 0.5;
  }

  return value;
}

// Vortex spiral pattern
fn vortexSpiral(uv: vec2f, time: f32) -> f32 {
  let center = vec2f(0.5, 0.5);
  let p = uv - center;
  let dist = length(p);
  let angle = atan2(p.y, p.x);

  // Spiral arms
  let spiral = sin(angle * 3.0 - dist * 15.0 + time * 2.0) * 0.5 + 0.5;
  let fade = 1.0 - smoothstep(0.0, 0.45, dist);

  return spiral * fade;
}

// Nebula effect
fn nebula(uv: vec2f, time: f32) -> vec3f {
  let n1 = fbm(uv * 3.0 + vec2f(time * 0.1, 0.0));
  let n2 = fbm(uv * 4.0 - vec2f(0.0, time * 0.08));
  let n3 = fbm(uv * 2.5 + vec2f(time * 0.05, time * 0.05));

  let color1 = vec3f(0.58, 0.30, 0.82); // Purple
  let color2 = vec3f(0.20, 0.60, 0.86); // Blue
  let color3 = vec3f(0.91, 0.40, 0.60); // Pink

  var nebula = color1 * n1 * 0.3;
  nebula += color2 * n2 * 0.25;
  nebula += color3 * n3 * 0.15;

  return nebula;
}

// Stars
fn stars(uv: vec2f, time: f32) -> f32 {
  let starNoise = hash(floor(uv * 50.0));
  let twinkle = sin(time * 3.0 + starNoise * 20.0) * 0.5 + 0.5;

  if (starNoise > 0.97) {
    return (starNoise - 0.97) * 33.0 * twinkle;
  }
  return 0.0;
}

// Wormhole rings
fn wormholeRings(uv: vec2f, time: f32) -> f32 {
  let center = vec2f(0.5, 0.5);
  let dist = distance(uv, center);

  let ring1 = smoothstep(0.02, 0.0, abs(dist - 0.15 - sin(time) * 0.02));
  let ring2 = smoothstep(0.015, 0.0, abs(dist - 0.25 - sin(time * 0.8) * 0.02));
  let ring3 = smoothstep(0.01, 0.0, abs(dist - 0.35 - sin(time * 1.2) * 0.02));

  return (ring1 + ring2 + ring3) * 0.3;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  let uv = input.uv;
  let time = uniforms.time;

  // Deep space background
  let deepSpace = vec3f(0.06, 0.06, 0.10);
  let cosmicDark = vec3f(0.10, 0.08, 0.18);

  // Base gradient
  let center = vec2f(0.5, 0.5);
  let dist = distance(uv, center);
  var color = mix(cosmicDark, deepSpace, dist);

  // Add nebula
  color += nebula(uv, time) * 0.5;

  // Add vortex spiral
  let spiral = vortexSpiral(uv, time);
  let vortexColor = vec3f(0.40, 0.20, 0.70);
  color = mix(color, vortexColor, spiral * 0.4);

  // Add wormhole rings
  let rings = wormholeRings(uv, time);
  let ringColor = vec3f(0.20, 0.85, 0.95); // Cyan
  color += ringColor * rings;

  // Add stars
  let starValue = stars(uv, time);
  color += vec3f(1.0, 1.0, 1.0) * starValue;

  // Center glow (vortex core)
  let coreGlow = 1.0 - smoothstep(0.0, 0.2, dist);
  let coreColor = vec3f(0.18, 0.80, 0.44); // Green
  color += coreColor * coreGlow * 0.3;

  // Outer vignette
  let vignette = 1.0 - length((uv - 0.5) * 1.3);
  color *= smoothstep(0.0, 0.7, vignette);

  return vec4f(color, 1.0);
}
`;

export const PARTICLE_SHADER = /* wgsl */ `
struct Uniforms {
  time: f32,
  width: f32,
  height: f32,
  foldProgress: f32,
}

struct Particle {
  position: vec2f,
  velocity: vec2f,
  color: vec4f,
  size: f32,
  life: f32,
  particleType: f32,
  seed: f32,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;
@group(0) @binding(1) var<storage, read> particles: array<Particle>;

struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) color: vec4f,
  @location(1) uv: vec2f,
  @location(2) particleType: f32,
  @location(3) life: f32,
  @location(4) seed: f32,
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
  let size = particle.size * particle.life;

  let aspectRatio = uniforms.width / uniforms.height;
  var offset = corner * size;
  offset.x /= aspectRatio;

  let clipPos = particle.position * 2.0 - 1.0;

  var output: VertexOutput;
  output.position = vec4f(clipPos + offset, 0.0, 1.0);
  output.color = particle.color;
  output.uv = corner * 0.5 + 0.5;
  output.particleType = particle.particleType;
  output.life = particle.life;
  output.seed = particle.seed;

  return output;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  let uv = input.uv;
  let center = vec2f(0.5, 0.5);
  let dist = distance(uv, center);
  let pType = i32(input.particleType);
  let time = uniforms.time;

  var alpha = 0.0;
  var color = input.color.rgb;

  switch (pType) {
    case 0: { // vortexSpiral - swirling particles
      let angle = atan2(uv.y - 0.5, uv.x - 0.5);
      let spiral = sin(angle * 2.0 + dist * 10.0 - time * 5.0) * 0.5 + 0.5;
      let fade = 1.0 - smoothstep(0.0, 0.5, dist);
      alpha = spiral * fade * input.life * 0.7;
    }
    case 1: { // orbGlow - orb glow effect
      let core = 1.0 - smoothstep(0.0, 0.3, dist);
      let glow = 1.0 - smoothstep(0.0, 0.5, dist);
      let pulse = sin(time * 4.0 + input.seed * 10.0) * 0.2 + 0.8;
      alpha = (core * 0.9 + glow * 0.3) * pulse * input.life;
      color = mix(color, vec3f(1.0), core * 0.4);
    }
    case 2: { // ringPulse - ring energy pulse
      let ring = abs(dist - 0.35);
      let pulse = sin(time * 6.0 + input.seed * 5.0) * 0.5 + 0.5;
      alpha = smoothstep(0.1, 0.0, ring) * pulse * input.life * 0.6;
    }
    case 3: { // gapBeam - beam of light at gaps
      let beam = 1.0 - abs(uv.x - 0.5) * 4.0;
      let fade = 1.0 - dist * 2.0;
      let flicker = sin(time * 8.0 + input.seed * 15.0) * 0.3 + 0.7;
      alpha = max(0.0, beam * fade * flicker * input.life);
    }
    case 4: { // starDust - ambient space dust
      let twinkle = sin(time * 3.0 + input.seed * 20.0) * 0.5 + 0.5;
      let core = 1.0 - smoothstep(0.0, 0.3, dist);
      alpha = core * twinkle * input.life * 0.8;
    }
    case 5: { // portalFlash - flash when orb moves
      let flash = 1.0 - smoothstep(0.0, 0.5, dist);
      let expand = 1.0 - input.life;
      alpha = flash * (1.0 - expand * 0.5) * input.life * 0.9;
      color = mix(color, vec3f(1.0, 1.0, 1.0), 0.5);
    }
    default: {
      alpha = (1.0 - dist * 2.0) * input.life;
    }
  }

  alpha = clamp(alpha, 0.0, 1.0);
  return vec4f(color, alpha * input.color.a);
}
`;
