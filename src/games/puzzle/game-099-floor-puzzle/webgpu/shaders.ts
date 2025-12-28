/**
 * WebGPU Shaders - Floor Puzzle
 * Urban Building / Neon Tower Theme
 * Game #099
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

  // Building windows
  fn windowGrid(uv: vec2f, time: f32) -> f32 {
    let gridSize = vec2f(20.0, 12.0);
    let cell = floor(uv * gridSize);
    let cellUV = fract(uv * gridSize);

    // Window shape (smaller rectangles in each cell)
    let windowInset = 0.2;
    let isWindow = step(windowInset, cellUV.x) * step(cellUV.x, 1.0 - windowInset) *
                   step(windowInset, cellUV.y) * step(cellUV.y, 1.0 - windowInset);

    // Random light on/off per window
    let cellId = cell.x + cell.y * gridSize.x;
    let flickerSpeed = 0.3 + hash(cell) * 0.5;
    let lightOn = step(0.4, hash(cell + floor(time * flickerSpeed) * 0.1));

    return isWindow * lightOn;
  }

  // Stars in night sky
  fn stars(uv: vec2f, time: f32) -> f32 {
    let gridSize = 50.0;
    let cell = floor(uv * gridSize);
    let cellUV = fract(uv * gridSize);

    let starPos = vec2f(hash(cell), hash(cell + vec2f(1.0, 0.0)));
    let dist = distance(cellUV, starPos);

    let twinkle = sin(time * 3.0 + hash(cell) * 6.28) * 0.5 + 0.5;
    let starIntensity = step(0.85, hash(cell * 1.3)) * smoothstep(0.05, 0.0, dist) * (0.5 + twinkle * 0.5);

    return starIntensity;
  }

  // City skyline silhouette
  fn cityline(x: f32) -> f32 {
    let scale = 8.0;
    let height = hash(vec2f(floor(x * scale), 0.0)) * 0.15 + 0.05;
    let width = fract(x * scale);
    let building = step(0.1, width) * step(width, 0.9) * height;
    return building;
  }

  // Neon sign glow
  fn neonSign(uv: vec2f, time: f32) -> vec3f {
    let pos = vec2f(0.85, 0.75);
    let dist = distance(uv, pos);
    let glow = smoothstep(0.15, 0.0, dist);
    let pulse = sin(time * 4.0) * 0.3 + 0.7;

    let cyan = vec3f(0.0, 0.9, 1.0);
    return cyan * glow * pulse * 0.5;
  }

  @fragment
  fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
    let uv = input.uv;
    let time = uniforms.time;

    // Night sky gradient
    let skyTop = vec3f(0.02, 0.04, 0.08);
    let skyBottom = vec3f(0.08, 0.10, 0.18);
    var color = mix(skyBottom, skyTop, uv.y);

    // Stars (only in upper portion)
    let starArea = smoothstep(0.5, 0.8, uv.y);
    color += vec3f(1.0, 0.95, 0.9) * stars(uv, time) * starArea * uniforms.intensity;

    // Distant buildings silhouette
    let distantBuildings = cityline(uv.x * 2.0 + 0.5);
    let distantMask = step(uv.y, distantBuildings + 0.3);
    color = mix(color, vec3f(0.05, 0.06, 0.1), distantMask * 0.7);

    // Main building area (darker)
    let buildingArea = step(uv.y, 0.85) * step(0.1, uv.x) * step(uv.x, 0.9);
    let buildingColor = vec3f(0.12, 0.15, 0.22);
    color = mix(color, buildingColor, buildingArea * 0.6);

    // Building windows
    let windowUV = uv * vec2f(1.0, 1.5) - vec2f(0.0, 0.1);
    let windows = windowGrid(windowUV, time);
    let windowColor = vec3f(1.0, 0.85, 0.5); // Warm yellow light
    color += windowColor * windows * buildingArea * 0.4 * uniforms.intensity;

    // Elevator shaft glow (subtle vertical line)
    let shaftX = 0.75;
    let shaftGlow = smoothstep(0.03, 0.0, abs(uv.x - shaftX)) * step(uv.y, 0.8);
    color += vec3f(0.95, 0.6, 0.1) * shaftGlow * 0.2 * uniforms.intensity;

    // Neon sign accent
    color += neonSign(uv, time) * uniforms.intensity;

    // Fog/haze at bottom
    let fog = smoothstep(0.3, 0.0, uv.y) * 0.15;
    color = mix(color, vec3f(0.15, 0.18, 0.25), fog);

    // Vignette
    let vignette = 1.0 - dot(uv - 0.5, uv - 0.5) * 0.5;
    color *= vignette;

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
    let size = particle.size * (0.3 + lifeRatio * 0.7);

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

  fn sdBox(p: vec2f, b: vec2f) -> f32 {
    let d = abs(p) - b;
    return length(max(d, vec2f(0.0))) + min(max(d.x, d.y), 0.0);
  }

  @fragment
  fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
    let uv = input.uv;
    let dist = length(uv);
    let life = input.life;

    var color: vec3f;
    var alpha: f32 = 0.0;

    // Particle type: 0=elevator, 1=passenger, 2=floor, 3=spark, 4=ding, 5=arrival
    switch input.particleType {
      // Elevator - rectangular with glow
      case 0u: {
        let boxDist = sdBox(uv, vec2f(0.6, 0.8));
        let shape = smoothstep(0.1, 0.0, boxDist);
        let glow = smoothstep(0.4, 0.0, boxDist) * 0.5;

        color = vec3f(0.95, 0.6, 0.07); // Orange
        alpha = (shape + glow) * life;
      }
      // Passenger - circular person shape
      case 1u: {
        // Head
        let headDist = length(uv - vec2f(0.0, 0.3)) - 0.25;
        let head = smoothstep(0.05, 0.0, headDist);

        // Body
        let bodyDist = length(uv * vec2f(1.0, 0.7) - vec2f(0.0, -0.2)) - 0.35;
        let body = smoothstep(0.05, 0.0, bodyDist);

        let isUp = input.value > 0.5;
        color = select(vec3f(0.2, 0.6, 0.85), vec3f(0.2, 0.8, 0.45), isUp);
        alpha = max(head, body) * life;
      }
      // Floor - horizontal line glow
      case 2u: {
        let lineShape = smoothstep(0.15, 0.0, abs(uv.y));
        let fade = 1.0 - abs(uv.x);

        color = vec3f(0.4, 0.45, 0.55);
        alpha = lineShape * fade * life * 0.6;
      }
      // Spark - bright point
      case 3u: {
        let core = smoothstep(0.3, 0.0, dist);
        let glow = smoothstep(1.0, 0.0, dist) * 0.4;

        color = vec3f(1.0, 0.9, 0.6);
        alpha = (core + glow) * life;
      }
      // Ding - expanding ring
      case 4u: {
        let ring = abs(dist - 0.6) < 0.1;
        let ringShape = smoothstep(0.12, 0.0, abs(dist - 0.6));

        color = vec3f(0.0, 0.9, 1.0); // Cyan
        alpha = ringShape * life * 0.8;
      }
      // Arrival - celebration burst
      case 5u: {
        let angle = atan2(uv.y, uv.x);
        let rays = abs(sin(angle * 6.0 + uniforms.time * 5.0));
        let star = smoothstep(1.0, 0.0, dist) * (0.5 + rays * 0.5);

        color = vec3f(0.18, 0.8, 0.44); // Green
        alpha = star * life;
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
