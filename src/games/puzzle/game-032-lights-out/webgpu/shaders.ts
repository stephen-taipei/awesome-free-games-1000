/**
 * WebGPU Shaders - Lights Out
 * Neon Circuit Theme
 * Game #032
 */

export const backgroundShader = /* wgsl */`
  struct Uniforms {
    time: f32,
    aspect: f32,
    pad1: f32,
    pad2: f32,
  }

  @group(0) @binding(0) var<uniform> uniforms: Uniforms;

  struct VertexOutput {
    @builtin(position) position: vec4f,
    @location(0) uv: vec2f,
  }

  @vertex
  fn vertexMain(@builtin(vertex_index) idx: u32) -> VertexOutput {
    var pos = array<vec2f, 6>(
      vec2f(-1, -1), vec2f(1, -1), vec2f(-1, 1),
      vec2f(-1, 1), vec2f(1, -1), vec2f(1, 1)
    );

    var out: VertexOutput;
    out.position = vec4f(pos[idx], 0, 1);
    out.uv = pos[idx] * 0.5 + 0.5;
    return out;
  }

  fn hash(p: vec2f) -> f32 {
    return fract(sin(dot(p, vec2f(127.1, 311.7))) * 43758.5453);
  }

  fn noise(p: vec2f) -> f32 {
    let i = floor(p);
    let f = fract(p);
    let u = f * f * (3.0 - 2.0 * f);

    return mix(
      mix(hash(i), hash(i + vec2f(1, 0)), u.x),
      mix(hash(i + vec2f(0, 1)), hash(i + vec2f(1, 1)), u.x),
      u.y
    );
  }

  // Circuit trace pattern
  fn circuitPattern(uv: vec2f, time: f32) -> f32 {
    let scale = 20.0;
    let p = uv * scale;
    let cell = floor(p);
    let f = fract(p);

    // Grid lines
    let gridH = smoothstep(0.02, 0.0, abs(f.y - 0.5));
    let gridV = smoothstep(0.02, 0.0, abs(f.x - 0.5));

    // Random connections
    let rnd = hash(cell);
    var circuit = 0.0;

    if (rnd > 0.7) {
      circuit = gridH;
    }
    if (rnd > 0.5 && rnd <= 0.7) {
      circuit = gridV;
    }
    if (rnd > 0.3 && rnd <= 0.5) {
      circuit = max(gridH, gridV);
    }

    // Node points at intersections
    let nodeDist = length(f - 0.5);
    let node = smoothstep(0.12, 0.08, nodeDist);

    // Pulsing energy along traces
    let pulse = sin(time * 2.0 + cell.x * 0.5 + cell.y * 0.3) * 0.5 + 0.5;

    return (circuit + node * 0.5) * (0.3 + pulse * 0.2);
  }

  @fragment
  fn fragmentMain(in: VertexOutput) -> @location(0) vec4f {
    let uv = in.uv;
    let time = uniforms.time;

    // Dark PCB base color
    let baseColor = vec3f(0.02, 0.06, 0.04);
    let traceColor = vec3f(0.0, 0.8, 0.4);

    // Circuit traces
    let circuit = circuitPattern(uv, time);
    var color = baseColor + traceColor * circuit * 0.15;

    // Subtle grid overlay
    let gridX = smoothstep(0.005, 0.0, abs(fract(uv.x * 40.0) - 0.5));
    let gridY = smoothstep(0.005, 0.0, abs(fract(uv.y * 40.0) - 0.5));
    color += vec3f(0.0, 0.15, 0.08) * (gridX + gridY) * 0.1;

    // Energy flow lines
    let flowY = sin(uv.x * 30.0 + time * 3.0) * 0.02;
    let flow = smoothstep(0.01, 0.0, abs(uv.y - 0.5 + flowY));
    color += vec3f(0.0, 1.0, 0.5) * flow * 0.08;

    // Corner vignette
    let dist = distance(uv, vec2f(0.5));
    let vignette = 1.0 - smoothstep(0.3, 0.8, dist);
    color *= 0.7 + vignette * 0.3;

    // Scanline effect
    let scanline = sin(uv.y * 200.0 + time * 10.0) * 0.5 + 0.5;
    color *= 0.95 + scanline * 0.05;

    return vec4f(color, 0.5);
  }
`;

export const particleShader = /* wgsl */`
  struct Uniforms {
    time: f32,
    aspect: f32,
    pad1: f32,
    pad2: f32,
  }

  struct Particle {
    x: f32,
    y: f32,
    vx: f32,
    vy: f32,
    life: f32,
    maxLife: f32,
    size: f32,
    pType: f32,
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
    @location(2) pType: f32,
  }

  @vertex
  fn vertexMain(@builtin(vertex_index) vIdx: u32, @builtin(instance_index) iIdx: u32) -> VertexOutput {
    var quad = array<vec2f, 6>(
      vec2f(-1, -1), vec2f(1, -1), vec2f(-1, 1),
      vec2f(-1, 1), vec2f(1, -1), vec2f(1, 1)
    );

    let p = particles[iIdx];
    let size = p.size;
    let pos = quad[vIdx] * size + vec2f(p.x * 2.0 - 1.0, 1.0 - p.y * 2.0);

    var out: VertexOutput;
    out.position = vec4f(pos.x / uniforms.aspect, pos.y, 0, 1);
    out.uv = quad[vIdx];
    out.color = vec4f(p.r, p.g, p.b, p.a);
    out.pType = p.pType;
    return out;
  }

  @fragment
  fn fragmentMain(in: VertexOutput) -> @location(0) vec4f {
    let dist = length(in.uv);
    let pType = i32(in.pType);
    var alpha = in.color.a;
    var color = in.color.rgb;

    if (pType == 0) {
      // Toggle - electric spark
      let spark = 1.0 - smoothstep(0.0, 0.6, dist);
      let core = 1.0 - smoothstep(0.0, 0.2, dist);
      color = mix(color, vec3f(1.0), core * 0.8);
      alpha *= spark;
    } else if (pType == 1) {
      // Chain reaction - energy pulse
      let ring = abs(dist - 0.5);
      let pulse = 1.0 - smoothstep(0.0, 0.15, ring);
      alpha *= pulse;
    } else if (pType == 2) {
      // Victory - bright burst
      let burst = 1.0 - smoothstep(0.0, 1.0, dist);
      let rays = sin(atan2(in.uv.y, in.uv.x) * 8.0) * 0.5 + 0.5;
      color += vec3f(rays * 0.3);
      alpha *= burst;
    } else {
      // Ambient - circuit glow
      alpha *= 1.0 - smoothstep(0.0, 1.0, dist);
      alpha *= 0.4;
    }

    if (alpha < 0.01) {
      discard;
    }

    return vec4f(color, alpha);
  }
`;

export const lightGlowShader = /* wgsl */`
  struct Uniforms {
    time: f32,
    intensity: f32,
    pad1: f32,
    pad2: f32,
  }

  struct Light {
    x: f32,
    y: f32,
    isOn: f32,
    pulse: f32,
  }

  @group(0) @binding(0) var<uniform> uniforms: Uniforms;
  @group(0) @binding(1) var<storage, read> lights: array<Light>;

  struct VertexOutput {
    @builtin(position) position: vec4f,
    @location(0) uv: vec2f,
  }

  @vertex
  fn vertexMain(@builtin(vertex_index) idx: u32) -> VertexOutput {
    var pos = array<vec2f, 6>(
      vec2f(-1, -1), vec2f(1, -1), vec2f(-1, 1),
      vec2f(-1, 1), vec2f(1, -1), vec2f(1, 1)
    );

    var out: VertexOutput;
    out.position = vec4f(pos[idx], 0, 1);
    out.uv = pos[idx] * 0.5 + 0.5;
    return out;
  }

  @fragment
  fn fragmentMain(in: VertexOutput) -> @location(0) vec4f {
    let uv = in.uv;
    let time = uniforms.time;

    var totalGlow = vec3f(0.0);

    // Sample first 25 lights (5x5 grid)
    for (var i = 0u; i < 25u; i++) {
      let light = lights[i];
      if (light.isOn > 0.5) {
        let lightPos = vec2f(light.x, light.y);
        let dist = distance(uv, lightPos);

        let pulse = sin(time * 4.0 + light.pulse) * 0.15 + 0.85;
        let glow = exp(-dist * 12.0) * pulse;

        // Neon yellow-green color
        let glowColor = vec3f(0.9, 1.0, 0.3);
        totalGlow += glowColor * glow * 0.3;
      }
    }

    return vec4f(totalGlow, length(totalGlow) * 0.5);
  }
`;

export const victoryShader = /* wgsl */`
  struct Uniforms {
    time: f32,
    intensity: f32,
    pad1: f32,
    pad2: f32,
  }

  @group(0) @binding(0) var<uniform> uniforms: Uniforms;

  struct VertexOutput {
    @builtin(position) position: vec4f,
    @location(0) uv: vec2f,
  }

  @vertex
  fn vertexMain(@builtin(vertex_index) idx: u32) -> VertexOutput {
    var pos = array<vec2f, 6>(
      vec2f(-1, -1), vec2f(1, -1), vec2f(-1, 1),
      vec2f(-1, 1), vec2f(1, -1), vec2f(1, 1)
    );

    var out: VertexOutput;
    out.position = vec4f(pos[idx], 0, 1);
    out.uv = pos[idx] * 0.5 + 0.5;
    return out;
  }

  @fragment
  fn fragmentMain(in: VertexOutput) -> @location(0) vec4f {
    let uv = in.uv;
    let time = uniforms.time;
    let intensity = uniforms.intensity;

    // Power down wave effect
    let center = vec2f(0.5, 0.5);
    let dist = distance(uv, center);

    // Collapsing rings
    let wavePos = (1.0 - intensity) * 0.7;
    let ring = smoothstep(wavePos - 0.05, wavePos, dist) *
               (1.0 - smoothstep(wavePos, wavePos + 0.05, dist));

    // Dark spreading from center
    let darkness = smoothstep(0.0, wavePos, dist);

    // Electric cyan color for the wave
    let waveColor = vec3f(0.0, 0.8, 1.0) * ring * intensity * 2.0;

    // Add static noise
    let noise = fract(sin(dot(uv * time * 10.0, vec2f(12.9898, 78.233))) * 43758.5453);
    let staticNoise = noise * intensity * 0.1;

    return vec4f(waveColor + staticNoise, (ring + (1.0 - darkness) * 0.3) * intensity);
  }
`;
