/**
 * WebGPU Shaders - Cell Division
 * Biology / Microbiology Theme
 * Game #126
 */

export const BACKGROUND_SHADER = /* wgsl */ `
struct Uniforms {
  time: f32,
  aspectRatio: f32,
  focusX: f32,
  focusY: f32,
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

// Hash functions for noise
fn hash2(p: vec2f) -> f32 {
  var p3 = fract(vec3f(p.x, p.y, p.x) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

fn hash22(p: vec2f) -> vec2f {
  var p3 = fract(vec3f(p.x, p.y, p.x) * vec3f(0.1031, 0.1030, 0.0973));
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.xx + p3.yz) * p3.zy);
}

// Value noise
fn noise(p: vec2f) -> f32 {
  let i = floor(p);
  let f = fract(p);
  let u = f * f * (3.0 - 2.0 * f);

  return mix(
    mix(hash2(i + vec2f(0.0, 0.0)), hash2(i + vec2f(1.0, 0.0)), u.x),
    mix(hash2(i + vec2f(0.0, 1.0)), hash2(i + vec2f(1.0, 1.0)), u.x),
    u.y
  );
}

// FBM for organic patterns
fn fbm(p: vec2f) -> f32 {
  var value = 0.0;
  var amplitude = 0.5;
  var frequency = 1.0;
  var pos = p;

  for (var i = 0; i < 5; i++) {
    value += amplitude * noise(pos * frequency);
    amplitude *= 0.5;
    frequency *= 2.0;
    pos = pos * 1.1 + vec2f(0.3, 0.7);
  }

  return value;
}

// Voronoi for cell-like patterns
fn voronoi(p: vec2f) -> vec2f {
  let n = floor(p);
  let f = fract(p);

  var md = 8.0;
  var mr = vec2f(0.0);

  for (var j = -1; j <= 1; j++) {
    for (var i = -1; i <= 1; i++) {
      let g = vec2f(f32(i), f32(j));
      let o = hash22(n + g);
      let r = g + o - f;
      let d = dot(r, r);

      if (d < md) {
        md = d;
        mr = r;
      }
    }
  }

  return vec2f(sqrt(md), hash2(n + mr));
}

// Microscope vignette
fn vignette(uv: vec2f, intensity: f32) -> f32 {
  let center = vec2f(0.5, 0.5);
  let dist = distance(uv, center);

  // Circular microscope aperture
  let aperture = 1.0 - smoothstep(0.3, 0.55, dist);

  // Soft edge glow
  let edge = smoothstep(0.4, 0.5, dist) * (1.0 - smoothstep(0.5, 0.55, dist));

  return aperture + edge * 0.3 * intensity;
}

// Floating organelles
fn organelles(uv: vec2f, time: f32) -> f32 {
  var result = 0.0;

  for (var i = 0; i < 6; i++) {
    let fi = f32(i);
    let offset = vec2f(
      sin(time * 0.3 + fi * 1.5) * 0.2,
      cos(time * 0.4 + fi * 1.2) * 0.15
    );
    let pos = uv + offset + hash22(vec2f(fi, fi * 2.0)) * 0.6;
    let size = 0.02 + hash2(vec2f(fi * 3.0, fi)) * 0.02;
    let d = length(fract(pos * 3.0) - 0.5) / 3.0;
    result += smoothstep(size, size * 0.5, d) * 0.3;
  }

  return result;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  var uv = input.uv;
  uv.x *= uniforms.aspectRatio;

  let time = uniforms.time;

  // Slow drift in the medium
  let drift = vec2f(
    sin(time * 0.1) * 0.02,
    cos(time * 0.08) * 0.015
  );
  let driftUV = uv + drift;

  // Base color - dark green microscope field
  var color = vec3f(0.02, 0.06, 0.04);

  // Voronoi cells for background texture
  let cellScale = 4.0;
  let vor = voronoi(driftUV * cellScale + time * 0.05);
  let cellPattern = smoothstep(0.1, 0.0, vor.x);
  let cellShade = vor.y;

  // Add subtle cell membrane patterns
  color += vec3f(0.02, 0.04, 0.03) * cellPattern;
  color += vec3f(0.01, 0.02, 0.015) * cellShade * (1.0 - cellPattern);

  // Organic noise layer
  let organic = fbm(driftUV * 3.0 + time * 0.02);
  color += vec3f(0.015, 0.03, 0.02) * organic;

  // Floating particles in medium
  let particles = fbm(driftUV * 8.0 - time * 0.1);
  let particleHighlight = smoothstep(0.6, 0.8, particles);
  color += vec3f(0.03, 0.06, 0.04) * particleHighlight;

  // Tiny organelles floating
  let org = organelles(driftUV, time);
  color += vec3f(0.08, 0.12, 0.06) * org;

  // Subtle color variations (like staining)
  let stain = fbm(uv * 2.0 + 10.0);
  color.r += stain * 0.015;
  color.b += (1.0 - stain) * 0.01;

  // Microscope illumination - brighter in center
  let illumination = 1.0 - length(uv - vec2f(0.5 * uniforms.aspectRatio, 0.5)) * 0.6;
  color *= illumination;

  // Chromatic aberration at edges
  let center = vec2f(0.5 * uniforms.aspectRatio, 0.5);
  let dist = length(uv - center);
  let aberration = dist * 0.02;
  color.r *= 1.0 + aberration;
  color.b *= 1.0 - aberration * 0.5;

  // Microscope vignette
  let vig = vignette(input.uv, 0.5 + sin(time * 0.5) * 0.1);
  color *= 0.6 + vig * 0.6;

  // Subtle pulsing (like living tissue)
  let pulse = 1.0 + sin(time * 2.0) * 0.02;
  color *= pulse;

  // Depth of field blur simulation (color bleeding)
  let dof = smoothstep(0.3, 0.5, dist);
  color = mix(color, color * vec3f(1.0, 0.98, 0.96), dof * 0.3);

  return vec4f(color, 1.0);
}
`;

export const PARTICLE_SHADER = /* wgsl */ `
struct Uniforms {
  time: f32,
  aspectRatio: f32,
  focusX: f32,
  focusY: f32,
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
  @location(3) life: f32,
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

  // Size varies by particle type
  var size = particle.size;
  let pType = u32(particle.particleType);

  // 0: cell - pulsing organic
  // 1: membrane - ring effect
  // 2: nucleus - dense center
  // 3: mitosis - splitting animation
  // 4: energy - glowing orbs
  // 5: attack - aggressive burst

  if (pType == 0u) {
    // Cell - organic pulsing
    size *= 0.8 + sin(uniforms.time * 5.0 + particle.position.x * 10.0) * 0.2;
    size *= smoothstep(0.0, 0.3, lifeRatio) * smoothstep(1.0, 0.7, lifeRatio);
  } else if (pType == 1u) {
    // Membrane - expanding ring
    size *= 0.5 + lifeRatio * 1.5;
    size *= smoothstep(0.0, 0.1, lifeRatio) * smoothstep(1.0, 0.3, lifeRatio);
  } else if (pType == 2u) {
    // Nucleus - stays dense
    size *= 0.6 + sin(uniforms.time * 3.0) * 0.1;
    size *= smoothstep(0.0, 0.2, lifeRatio) * smoothstep(1.0, 0.5, lifeRatio);
  } else if (pType == 3u) {
    // Mitosis - splitting
    let split = sin(lifeRatio * 3.14159);
    size *= 0.5 + split * 0.8;
  } else if (pType == 4u) {
    // Energy - bright and pulsing
    size *= 0.7 + sin(uniforms.time * 8.0 + particle.position.y * 15.0) * 0.3;
    size *= smoothstep(0.0, 0.2, lifeRatio) * smoothstep(1.0, 0.6, lifeRatio);
  } else if (pType == 5u) {
    // Attack - explosive expansion
    size *= 0.3 + (1.0 - lifeRatio) * 1.2;
    size *= smoothstep(0.0, 0.05, lifeRatio) * smoothstep(1.0, 0.4, lifeRatio);
  }

  var pos = particle.position + corner * size;
  pos.x /= uniforms.aspectRatio;

  var output: VertexOutput;
  output.position = vec4f(pos * 2.0 - 1.0, 0.0, 1.0);
  output.color = particle.color;
  output.uv = corner;
  output.particleType = particle.particleType;
  output.life = lifeRatio;

  return output;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  let dist = length(input.uv);
  let pType = u32(input.particleType);

  var alpha = 0.0;
  var color = input.color.rgb;

  if (pType == 0u) {
    // Cell - organic blob with membrane
    let core = smoothstep(0.8, 0.3, dist);
    let membrane = smoothstep(1.0, 0.9, dist) * smoothstep(0.7, 0.8, dist);
    alpha = core * 0.7 + membrane * 0.4;

    // Internal texture
    let internal = sin(dist * 10.0 + input.life * 5.0) * 0.1;
    color += vec3f(internal);
  } else if (pType == 1u) {
    // Membrane - ring
    let ring = smoothstep(1.0, 0.8, dist) * smoothstep(0.5, 0.7, dist);
    alpha = ring * 0.6;

    // Undulating edge
    let wave = sin(atan2(input.uv.y, input.uv.x) * 8.0 + uniforms.time * 3.0) * 0.05;
    alpha *= 1.0 + wave;
  } else if (pType == 2u) {
    // Nucleus - dense glowing center
    let core = smoothstep(0.6, 0.0, dist);
    let glow = smoothstep(1.0, 0.4, dist) * 0.3;
    alpha = core + glow;

    // Chromatin texture
    let chromatin = sin(dist * 15.0) * sin(input.uv.x * 20.0) * 0.1;
    color += vec3f(chromatin * 0.5, chromatin, chromatin * 0.8);
  } else if (pType == 3u) {
    // Mitosis - splitting cell effect
    let offset = (input.life - 0.5) * 0.3;
    let d1 = length(input.uv - vec2f(offset, 0.0));
    let d2 = length(input.uv + vec2f(offset, 0.0));
    let cell1 = smoothstep(0.7, 0.2, d1);
    let cell2 = smoothstep(0.7, 0.2, d2);
    alpha = max(cell1, cell2) * 0.8;

    // Connection strand
    if (input.life < 0.7) {
      let strand = smoothstep(0.15, 0.0, abs(input.uv.y)) *
                   step(abs(input.uv.x), abs(offset) + 0.1);
      alpha = max(alpha, strand * 0.4);
      color = mix(color, vec3f(0.2, 0.9, 0.9), strand * 0.3);
    }
  } else if (pType == 4u) {
    // Energy - glowing orb
    let glow = smoothstep(1.0, 0.0, dist);
    let core = smoothstep(0.4, 0.0, dist);
    alpha = glow * 0.5 + core * 0.7;

    // Sparkle
    let sparkle = sin(dist * 20.0 + uniforms.time * 10.0) * 0.2;
    color += vec3f(sparkle);
  } else if (pType == 5u) {
    // Attack - aggressive burst with spikes
    let angle = atan2(input.uv.y, input.uv.x);
    let spikes = sin(angle * 6.0 + uniforms.time * 5.0) * 0.2 + 0.8;
    let burst = smoothstep(spikes, spikes * 0.3, dist);
    alpha = burst * 0.8;

    // Hot center
    let hot = smoothstep(0.3, 0.0, dist);
    color = mix(color, vec3f(1.0, 1.0, 0.8), hot * 0.5);
  }

  alpha *= input.color.a;

  // Fade at edges
  alpha *= smoothstep(1.2, 0.8, dist);

  return vec4f(color, alpha);
}
`;
