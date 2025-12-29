/**
 * WebGPU Shaders - Dice Puzzle
 * Casino / Velvet Table / Gold Theme
 * Game #098
 */

export const BACKGROUND_SHADER = /* wgsl */`
  struct Uniforms {
    time: f32,
    width: f32,
    height: f32,
    intensity: f32,
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
      vec2f(1.0, 1.0),
      vec2f(-1.0, -1.0),
      vec2f(1.0, 1.0),
      vec2f(-1.0, 1.0)
    );

    var output: VertexOutput;
    output.position = vec4f(positions[vertexIndex], 0.0, 1.0);
    output.uv = positions[vertexIndex] * 0.5 + 0.5;
    return output;
  }

  // Noise functions
  fn hash(p: vec2f) -> f32 {
    let h = dot(p, vec2f(127.1, 311.7));
    return fract(sin(h) * 43758.5453123);
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

  // Velvet table texture
  fn velvetTexture(uv: vec2f, time: f32) -> f32 {
    let scale = 8.0;
    let n1 = fbm(uv * scale + time * 0.05);
    let n2 = fbm(uv * scale * 2.0 - time * 0.03);
    return 0.3 + n1 * 0.3 + n2 * 0.2;
  }

  // Gold border shimmer
  fn goldShimmer(uv: vec2f, time: f32) -> f32 {
    let edge = 0.02;
    let distFromEdge = min(min(uv.x, 1.0 - uv.x), min(uv.y, 1.0 - uv.y));
    let edgeMask = smoothstep(edge * 2.0, edge, distFromEdge);

    let shimmer = sin(uv.x * 50.0 + uv.y * 30.0 + time * 3.0) * 0.5 + 0.5;
    let wave = sin(uv.x * 20.0 - time * 2.0) * sin(uv.y * 15.0 + time * 1.5);

    return edgeMask * (0.5 + shimmer * 0.3 + wave * 0.2);
  }

  // Subtle table light reflections
  fn tableReflection(uv: vec2f, time: f32) -> f32 {
    let center = vec2f(0.5, 0.3);
    let dist = distance(uv, center);
    let pulse = sin(time * 0.5) * 0.1 + 0.9;
    return smoothstep(0.6, 0.0, dist) * 0.15 * pulse;
  }

  // Wood grain pattern for border
  fn woodGrain(uv: vec2f) -> f32 {
    let grain = sin(uv.y * 100.0 + noise(uv * 20.0) * 5.0) * 0.5 + 0.5;
    return grain * 0.3 + 0.7;
  }

  @fragment
  fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
    let uv = input.uv;
    let aspect = uniforms.width / uniforms.height;
    let time = uniforms.time;

    // Base velvet green
    let velvetGreen = vec3f(0.08, 0.28, 0.18);
    let deepGreen = vec3f(0.04, 0.14, 0.08);

    // Velvet texture
    let velvet = velvetTexture(uv, time);
    var color = mix(deepGreen, velvetGreen, velvet);

    // Table reflection (center light)
    let reflection = tableReflection(uv, time);
    color += vec3f(0.1, 0.15, 0.08) * reflection * uniforms.intensity;

    // Gold border
    let gold = vec3f(0.855, 0.647, 0.125);
    let darkGold = vec3f(0.6, 0.45, 0.1);
    let shimmer = goldShimmer(uv, time);
    let goldColor = mix(darkGold, gold, shimmer);

    let borderDist = min(min(uv.x, 1.0 - uv.x), min(uv.y, 1.0 - uv.y));
    let borderMask = smoothstep(0.015, 0.005, borderDist);
    color = mix(color, goldColor, borderMask * uniforms.intensity);

    // Inner gold line
    let innerBorder = smoothstep(0.04, 0.035, borderDist) * smoothstep(0.025, 0.03, borderDist);
    color += gold * innerBorder * 0.3 * uniforms.intensity;

    // Subtle vignette
    let vignette = 1.0 - dot(uv - 0.5, uv - 0.5) * 0.8;
    color *= vignette;

    // Floating dust particles (subtle)
    let dustUV = uv * 30.0 + vec2f(time * 0.2, time * 0.1);
    let dust = smoothstep(0.95, 1.0, noise(dustUV)) * 0.08;
    color += vec3f(0.9, 0.85, 0.7) * dust * uniforms.intensity;

    return vec4f(color, 0.95);
  }
`;

export const PARTICLE_SHADER = /* wgsl */`
  struct Uniforms {
    time: f32,
    width: f32,
    height: f32,
    intensity: f32,
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
    rotation: f32,
    value: f32,
  }

  @group(0) @binding(0) var<uniform> uniforms: Uniforms;
  @group(0) @binding(1) var<storage, read> particles: array<Particle>;

  struct VertexOutput {
    @builtin(position) position: vec4f,
    @location(0) uv: vec2f,
    @location(1) life: f32,
    @location(2) @interpolate(flat) particleType: u32,
    @location(3) size: f32,
    @location(4) rotation: f32,
    @location(5) value: f32,
  }

  @vertex
  fn vertexMain(
    @builtin(vertex_index) vertexIndex: u32,
    @builtin(instance_index) instanceIndex: u32
  ) -> VertexOutput {
    var corners = array<vec2f, 6>(
      vec2f(-1.0, -1.0),
      vec2f(1.0, -1.0),
      vec2f(1.0, 1.0),
      vec2f(-1.0, -1.0),
      vec2f(1.0, 1.0),
      vec2f(-1.0, 1.0)
    );

    let particle = particles[instanceIndex];
    let corner = corners[vertexIndex];

    let lifeRatio = particle.life / particle.maxLife;
    let size = particle.size * (0.5 + lifeRatio * 0.5);

    // Apply rotation
    let c = cos(particle.rotation);
    let s = sin(particle.rotation);
    let rotatedCorner = vec2f(
      corner.x * c - corner.y * s,
      corner.x * s + corner.y * c
    );

    let worldPos = vec2f(particle.x, particle.y) + rotatedCorner * size;
    let clipPos = vec2f(
      (worldPos.x / uniforms.width) * 2.0 - 1.0,
      1.0 - (worldPos.y / uniforms.height) * 2.0
    );

    var output: VertexOutput;
    output.position = vec4f(clipPos, 0.0, 1.0);
    output.uv = corner;
    output.life = lifeRatio;
    output.particleType = u32(particle.particleType);
    output.size = particle.size;
    output.rotation = particle.rotation;
    output.value = particle.value;
    return output;
  }

  fn sdRoundedBox(p: vec2f, b: vec2f, r: f32) -> f32 {
    let q = abs(p) - b + r;
    return length(max(q, vec2f(0.0))) + min(max(q.x, q.y), 0.0) - r;
  }

  @fragment
  fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
    let uv = input.uv;
    let dist = length(uv);
    let life = input.life;

    var color: vec3f;
    var alpha: f32 = 0.0;

    // Particle type: 0=dice, 1=roll, 2=dot, 3=spark, 4=victory, 5=path
    switch input.particleType {
      // Dice - rotating cube outline
      case 0u: {
        let boxDist = sdRoundedBox(uv, vec2f(0.7, 0.7), 0.15);
        let outline = smoothstep(0.08, 0.0, abs(boxDist));
        let fill = smoothstep(0.0, -0.1, boxDist) * 0.3;

        color = vec3f(0.98, 0.96, 0.90); // Ivory
        alpha = (outline + fill) * life;
      }
      // Roll - motion blur trail
      case 1u: {
        let trail = 1.0 - abs(uv.x);
        let shape = smoothstep(1.0, 0.3, dist);

        color = mix(
          vec3f(0.855, 0.647, 0.125), // Gold
          vec3f(0.98, 0.96, 0.90), // Ivory
          uv.x * 0.5 + 0.5
        );
        alpha = shape * trail * life * 0.6;
      }
      // Dot - small circle (dice pip)
      case 2u: {
        let dotShape = smoothstep(0.6, 0.3, dist);
        color = vec3f(0.1, 0.1, 0.12); // Dark dot color
        alpha = dotShape * life;
      }
      // Spark - bright point with glow
      case 3u: {
        let core = smoothstep(0.3, 0.0, dist);
        let glow = smoothstep(1.0, 0.0, dist) * 0.5;

        color = vec3f(1.0, 0.9, 0.6); // Warm spark
        alpha = (core + glow) * life;
      }
      // Victory - golden star burst
      case 4u: {
        let angle = atan2(uv.y, uv.x);
        let rays = abs(sin(angle * 5.0 + uniforms.time * 3.0));
        let star = smoothstep(1.0, 0.2, dist) * (0.5 + rays * 0.5);

        let gold = vec3f(0.855, 0.647, 0.125);
        let brightGold = vec3f(1.0, 0.9, 0.5);
        color = mix(gold, brightGold, rays);
        alpha = star * life;
      }
      // Path - subtle trail glow
      case 5u: {
        let pathGlow = smoothstep(1.0, 0.0, dist);
        color = vec3f(0.306, 0.800, 0.639); // Goal green
        alpha = pathGlow * life * 0.4;
      }
      default: {
        color = vec3f(1.0);
        alpha = smoothstep(1.0, 0.0, dist) * life;
      }
    }

    alpha *= uniforms.intensity;
    return vec4f(color * alpha, alpha);
  }
`;
