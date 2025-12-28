/**
 * WGSL Shaders - Season Change
 * Nature / Seasons Theme
 * Game #119
 */

export const BACKGROUND_SHADER = /* wgsl */`
struct Uniforms {
  time: f32,
  width: f32,
  height: f32,
  season: f32, // 0=spring, 1=summer, 2=autumn, 3=winter
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
    mix(hash(i), hash(i + vec2f(1.0, 0.0)), u.x),
    mix(hash(i + vec2f(0.0, 1.0)), hash(i + vec2f(1.0, 1.0)), u.x),
    u.y
  );
}

// Season sky colors
fn getSeasonSky(season: f32, uv: vec2f) -> vec3f {
  let springTop = vec3f(0.53, 0.81, 0.98);
  let springBottom = vec3f(0.96, 0.87, 0.93);

  let summerTop = vec3f(0.0, 0.75, 1.0);
  let summerBottom = vec3f(0.53, 0.81, 0.92);

  let autumnTop = vec3f(0.87, 0.72, 0.53);
  let autumnBottom = vec3f(0.96, 0.82, 0.59);

  let winterTop = vec3f(0.69, 0.77, 0.87);
  let winterBottom = vec3f(0.88, 0.91, 0.95);

  let y = 1.0 - uv.y;

  if (season < 1.0) {
    let t = season;
    let spring = mix(springTop, springBottom, y);
    let summer = mix(summerTop, summerBottom, y);
    return mix(spring, summer, t);
  } else if (season < 2.0) {
    let t = season - 1.0;
    let summer = mix(summerTop, summerBottom, y);
    let autumn = mix(autumnTop, autumnBottom, y);
    return mix(summer, autumn, t);
  } else if (season < 3.0) {
    let t = season - 2.0;
    let autumn = mix(autumnTop, autumnBottom, y);
    let winter = mix(winterTop, winterBottom, y);
    return mix(autumn, winter, t);
  } else {
    let t = season - 3.0;
    let winter = mix(winterTop, winterBottom, y);
    let spring = mix(springTop, springBottom, y);
    return mix(winter, spring, t);
  }
}

// Floating elements based on season
fn seasonElements(uv: vec2f, time: f32, season: f32) -> vec3f {
  var elements = vec3f(0.0);
  let s = floor(season);

  for (var i = 0; i < 8; i++) {
    let fi = f32(i);
    let seed = fi * 1.618;

    var elemX = fract(seed * 0.7 + time * 0.015 * (0.5 + fi * 0.1));
    var elemY = fract(seed * 1.3 + time * 0.02 * (0.8 + fi * 0.05));

    // Add sway based on season
    if (s == 0.0) {
      // Spring - gentle float
      elemX += sin(time * 2.0 + fi) * 0.02;
    } else if (s == 1.0) {
      // Summer - heat shimmer
      elemY += sin(time * 3.0 + fi) * 0.01;
    } else if (s == 2.0) {
      // Autumn - falling leaves motion
      elemX += sin(time * 1.5 + fi * 3.0) * 0.04;
      elemY = fract(elemY + time * 0.03);
    } else {
      // Winter - slow drift
      elemX += sin(time * 0.8 + fi * 2.0) * 0.02;
      elemY = fract(elemY + time * 0.015);
    }

    let dist = distance(uv, vec2f(elemX, elemY));

    // Different colors per season
    var elemColor: vec3f;
    if (s == 0.0) {
      elemColor = vec3f(1.0, 0.75, 0.85); // Pink petals
    } else if (s == 1.0) {
      elemColor = vec3f(1.0, 0.95, 0.4); // Sunshine sparkles
    } else if (s == 2.0) {
      elemColor = vec3f(1.0, 0.6, 0.2); // Orange leaves
    } else {
      elemColor = vec3f(1.0, 1.0, 1.0); // Snowflakes
    }

    let glow = smoothstep(0.02, 0.0, dist) * 0.3;
    elements += elemColor * glow;
  }

  return elements;
}

// Ground with season variation
fn seasonGround(uv: vec2f, time: f32, season: f32) -> vec3f {
  let groundY = 0.85;
  if (uv.y < groundY) { return vec3f(0.0); }

  let springGround = vec3f(0.56, 0.93, 0.56);
  let summerGround = vec3f(0.13, 0.55, 0.13);
  let autumnGround = vec3f(0.8, 0.52, 0.25);
  let winterGround = vec3f(0.94, 0.97, 1.0);

  var groundColor: vec3f;
  if (season < 1.0) {
    groundColor = mix(springGround, summerGround, season);
  } else if (season < 2.0) {
    groundColor = mix(summerGround, autumnGround, season - 1.0);
  } else if (season < 3.0) {
    groundColor = mix(autumnGround, winterGround, season - 2.0);
  } else {
    groundColor = mix(winterGround, springGround, season - 3.0);
  }

  // Add texture
  let tex = noise(uv * vec2f(50.0, 20.0) + time * 0.1) * 0.1;
  groundColor += vec3f(tex);

  let groundFade = smoothstep(groundY, groundY + 0.05, uv.y);
  return groundColor * groundFade * 0.5;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  let uv = input.uv;
  let time = uniforms.time;
  let season = uniforms.season;

  // Sky gradient based on season
  var color = getSeasonSky(season, uv);

  // Add floating elements
  let elements = seasonElements(uv, time, season);
  color += elements;

  // Add ground
  let ground = seasonGround(uv, time, season);
  color = mix(color, ground, step(0.85, uv.y));

  // Gentle vignette
  let center = vec2f(0.5);
  let vignette = 1.0 - smoothstep(0.4, 1.0, distance(uv, center));
  color *= 0.85 + vignette * 0.15;

  return vec4f(color, 0.2);
}
`;

export const PARTICLE_SHADER = /* wgsl */`
struct Uniforms {
  time: f32,
  width: f32,
  height: f32,
  season: f32,
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
  param1: f32,
  param2: f32,
  param3: f32,
  param4: f32,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;
@group(0) @binding(1) var<storage, read> particles: array<Particle>;

struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) uv: vec2f,
  @location(1) life: f32,
  @location(2) particleType: f32,
  @location(3) param1: f32,
  @location(4) param2: f32,
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

  let particle = particles[instanceIndex];
  let corner = corners[vertexIndex];

  let lifeRatio = particle.life / particle.maxLife;
  let size = particle.size * lifeRatio;

  let x = (particle.x / uniforms.width) * 2.0 - 1.0;
  let y = 1.0 - (particle.y / uniforms.height) * 2.0;

  let sizeX = size / uniforms.width * 2.0;
  let sizeY = size / uniforms.height * 2.0;

  var output: VertexOutput;
  output.position = vec4f(x + corner.x * sizeX, y + corner.y * sizeY, 0.0, 1.0);
  output.uv = corner * 0.5 + 0.5;
  output.life = lifeRatio;
  output.particleType = particle.particleType;
  output.param1 = particle.param1;
  output.param2 = particle.param2;

  return output;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  let uv = input.uv;
  let center = vec2f(0.5);
  let dist = distance(uv, center);
  let life = input.life;
  let pType = i32(input.particleType);
  let time = uniforms.time;

  var color: vec3f;
  var alpha: f32;

  if (pType == 0) {
    // Petal particle - pink/white spring petals
    let petalShape = 1.0 - smoothstep(0.0, 0.45, dist);
    let petalColor = mix(vec3f(1.0, 0.75, 0.85), vec3f(1.0, 0.9, 0.95), input.param1);
    color = petalColor;
    alpha = petalShape * life * 0.9;

  } else if (pType == 1) {
    // Leaf particle - autumn colors
    let leafShape = 1.0 - smoothstep(0.0, 0.4, dist);
    let hue = input.param1;
    if (hue < 0.33) {
      color = vec3f(1.0, 0.55, 0.0); // Orange
    } else if (hue < 0.66) {
      color = vec3f(1.0, 0.39, 0.28); // Red-orange
    } else {
      color = vec3f(1.0, 0.84, 0.0); // Gold
    }
    color *= 0.8 + sin(time * 2.0 + input.param2 * 10.0) * 0.2;
    alpha = leafShape * life * 0.85;

  } else if (pType == 2) {
    // Snowflake particle - white with sparkle
    let snowShape = 1.0 - smoothstep(0.0, 0.35, dist);
    let sparkle = sin(time * 8.0 + input.param1 * 20.0) * 0.3 + 0.7;
    color = vec3f(1.0, 1.0, 1.0) * sparkle;
    alpha = snowShape * life;

  } else if (pType == 3) {
    // Sunshine particle - golden rays
    let sunShape = 1.0 - smoothstep(0.0, 0.4, dist);
    let shimmer = sin(time * 5.0 + input.param1 * 15.0) * 0.2 + 0.8;
    color = vec3f(1.0, 0.92, 0.3) * shimmer;
    alpha = sunShape * life * 0.8;

  } else if (pType == 4) {
    // Sparkle particle - magic transition
    let sparkShape = 1.0 - smoothstep(0.0, 0.3, dist);
    let twinkle = sin(time * 10.0 + input.param1 * 25.0) * 0.4 + 0.6;
    color = vec3f(0.8, 0.9, 1.0) * twinkle;
    alpha = sparkShape * life;

  } else {
    // Glow particle - ambient nature glow
    let glowShape = 1.0 - smoothstep(0.0, 0.5, dist);
    let pulse = sin(time * 2.0 + input.param1 * 5.0) * 0.2 + 0.8;
    color = vec3f(0.8, 1.0, 0.8) * pulse;
    alpha = glowShape * life * 0.5;
  }

  return vec4f(color, alpha);
}
`;
