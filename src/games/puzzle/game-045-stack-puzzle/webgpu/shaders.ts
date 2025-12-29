/**
 * WebGPU Shaders - Stack Puzzle
 * Building Construction / Skyscraper Theme
 * Game #045
 */

export const backgroundShader = /* wgsl */ `
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
  fn vertexMain(@builtin(vertex_index) vertexIndex: u32) -> VertexOutput {
    var positions = array<vec2f, 6>(
      vec2f(-1.0, -1.0), vec2f(1.0, -1.0), vec2f(-1.0, 1.0),
      vec2f(-1.0, 1.0), vec2f(1.0, -1.0), vec2f(1.0, 1.0)
    );

    var output: VertexOutput;
    output.position = vec4f(positions[vertexIndex], 0.0, 1.0);
    output.uv = positions[vertexIndex] * 0.5 + 0.5;
    return output;
  }

  fn hash(p: vec2f) -> f32 {
    var p3 = fract(vec3f(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
  }

  // City skyline silhouette
  fn building(uv: vec2f, x: f32, width: f32, height: f32) -> f32 {
    let inX = step(x - width / 2.0, uv.x) * step(uv.x, x + width / 2.0);
    let inY = step(1.0 - height, uv.y);
    return inX * inY;
  }

  // Building windows
  fn windows(uv: vec2f, buildingX: f32, buildingWidth: f32, buildingHeight: f32, time: f32) -> f32 {
    let localX = (uv.x - buildingX + buildingWidth / 2.0) / buildingWidth;
    let localY = (uv.y - (1.0 - buildingHeight)) / buildingHeight;

    if (localX < 0.0 || localX > 1.0 || localY < 0.0 || localY > 1.0) {
      return 0.0;
    }

    let gridX = floor(localX * 6.0);
    let gridY = floor(localY * 12.0);
    let windowX = fract(localX * 6.0);
    let windowY = fract(localY * 12.0);

    let isWindow = step(0.15, windowX) * step(windowX, 0.85) *
                   step(0.2, windowY) * step(windowY, 0.8);

    // Random window lights
    let lightOn = step(0.4, hash(vec2f(gridX + buildingX * 10.0, gridY)));
    // Some windows flicker
    let flicker = step(0.95, hash(vec2f(gridX, gridY + floor(time * 2.0))));

    return isWindow * (lightOn + flicker * 0.5);
  }

  // Construction crane
  fn crane(uv: vec2f, pos: vec2f, time: f32) -> f32 {
    // Tower
    let tower = step(abs(uv.x - pos.x), 0.008) * step(pos.y, uv.y) * step(uv.y, 0.95);

    // Arm (swinging slightly)
    let armAngle = sin(time * 0.3) * 0.1;
    let armY = 0.92;
    let armLength = 0.15;
    let armEndX = pos.x + armLength * cos(armAngle);

    let armDist = abs(uv.y - armY);
    let inArmX = step(pos.x - 0.01, uv.x) * step(uv.x, armEndX + 0.01);
    let arm = step(armDist, 0.006) * inArmX;

    // Cable
    let cableX = pos.x + armLength * 0.7 * cos(armAngle);
    let cable = step(abs(uv.x - cableX), 0.003) * step(pos.y + 0.1, uv.y) * step(uv.y, armY);

    return max(tower, max(arm, cable));
  }

  // Steel beam pattern
  fn steelBeams(uv: vec2f) -> f32 {
    let diagonal1 = abs(fract(uv.x * 5.0 + uv.y * 5.0) - 0.5);
    let diagonal2 = abs(fract(uv.x * 5.0 - uv.y * 5.0) - 0.5);
    let beams = step(diagonal1, 0.03) + step(diagonal2, 0.03);
    return min(beams, 1.0);
  }

  // Sunset/dusk gradient
  fn duskSky(uv: vec2f) -> vec3f {
    let t = uv.y;

    // Deep blue at top
    let skyTop = vec3f(0.05, 0.1, 0.25);
    // Orange/pink at horizon
    let horizon = vec3f(0.9, 0.4, 0.2);
    // Dark at bottom
    let ground = vec3f(0.02, 0.02, 0.05);

    var color: vec3f;
    if (t > 0.6) {
      color = mix(horizon, skyTop, (t - 0.6) / 0.4);
    } else {
      color = mix(ground, horizon, t / 0.6);
    }

    return color;
  }

  @fragment
  fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
    var uv = input.uv;
    uv.x *= uniforms.aspect;
    let time = uniforms.time;

    // Dusk sky background
    var color = duskSky(input.uv);

    // Sun/moon
    let sunPos = vec2f(0.8 * uniforms.aspect, 0.75);
    let sunDist = length(uv - sunPos);
    let sun = smoothstep(0.08, 0.0, sunDist);
    let sunGlow = smoothstep(0.25, 0.0, sunDist) * 0.4;
    color = mix(color, vec3f(1.0, 0.7, 0.3), sun);
    color += vec3f(1.0, 0.5, 0.2) * sunGlow;

    // Distant city skyline
    let buildingColor = vec3f(0.02, 0.02, 0.05);
    let windowColor = vec3f(1.0, 0.9, 0.6);

    // Multiple buildings at different positions
    let buildings = array<vec4f, 8>(
      vec4f(0.1, 0.04, 0.25, 0.0),   // x, width, height, unused
      vec4f(0.2, 0.05, 0.35, 0.0),
      vec4f(0.32, 0.06, 0.45, 0.0),
      vec4f(0.45, 0.04, 0.30, 0.0),
      vec4f(0.55, 0.07, 0.55, 0.0),
      vec4f(0.68, 0.05, 0.40, 0.0),
      vec4f(0.78, 0.04, 0.28, 0.0),
      vec4f(0.9, 0.06, 0.38, 0.0)
    );

    for (var i = 0; i < 8; i++) {
      let b = buildings[i];
      let bx = b.x * uniforms.aspect;
      let bw = b.y * uniforms.aspect;
      let bh = b.z;

      let inBuilding = building(uv, bx, bw, bh);
      if (inBuilding > 0.5) {
        color = buildingColor;

        // Add windows
        let win = windows(uv, bx, bw, bh, time);
        color = mix(color, windowColor, win * 0.8);
      }
    }

    // Construction crane
    let cranePos = vec2f(0.4 * uniforms.aspect, 0.4);
    let craneShape = crane(uv, cranePos, time);
    color = mix(color, vec3f(0.6, 0.4, 0.1), craneShape);

    // Steel beam overlay (subtle)
    let beams = steelBeams(uv * 2.0);
    color = mix(color, color * 0.9, beams * 0.05);

    // Atmospheric haze at bottom
    let haze = smoothstep(0.3, 0.0, input.uv.y) * 0.3;
    color = mix(color, vec3f(0.15, 0.1, 0.2), haze);

    return vec4f(color, 1.0);
  }
`;

export const particleShader = /* wgsl */ `
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
    @location(3) life: f32,
  }

  @vertex
  fn vertexMain(
    @builtin(vertex_index) vertexIndex: u32,
    @builtin(instance_index) instanceIndex: u32
  ) -> VertexOutput {
    let quad = array<vec2f, 6>(
      vec2f(-1.0, -1.0), vec2f(1.0, -1.0), vec2f(-1.0, 1.0),
      vec2f(-1.0, 1.0), vec2f(1.0, -1.0), vec2f(1.0, 1.0)
    );

    let p = particles[instanceIndex];
    let lifeRatio = p.life / p.maxLife;
    let size = p.size * lifeRatio;

    var pos = quad[vertexIndex] * size;
    pos.x /= uniforms.aspect;
    pos += vec2f(p.x * 2.0 - 1.0, 1.0 - p.y * 2.0);

    var output: VertexOutput;
    output.position = vec4f(pos, 0.0, 1.0);
    output.uv = quad[vertexIndex];
    output.color = vec4f(p.r, p.g, p.b, p.a * lifeRatio);
    output.particleType = p.particleType;
    output.life = lifeRatio;
    return output;
  }

  @fragment
  fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
    let dist = length(input.uv);
    let time = uniforms.time;
    var alpha = 0.0;
    var color = input.color.rgb;

    // Type 0: Concrete dust
    if (input.particleType < 0.5) {
      alpha = smoothstep(1.0, 0.0, dist) * input.life * 0.6;
      // Dusty appearance
      alpha *= 0.7 + sin(input.uv.x * 10.0 + input.uv.y * 10.0) * 0.3;
    }
    // Type 1: Sparks (welding)
    else if (input.particleType < 1.5) {
      let spark = smoothstep(0.5, 0.0, dist);
      let core = smoothstep(0.2, 0.0, dist);
      alpha = spark * input.life;
      color = mix(color, vec3f(1.0, 1.0, 0.9), core);
      // Flickering
      alpha *= 0.6 + sin(time * 30.0 + dist * 20.0) * 0.4;
    }
    // Type 2: Victory - hard hat confetti
    else if (input.particleType < 2.5) {
      // Rectangular confetti
      let rect = step(abs(input.uv.x), 0.6) * step(abs(input.uv.y), 0.4);
      alpha = rect * input.life;
      // Tumbling effect
      let tumble = sin(time * 8.0 + input.uv.x * 5.0) * 0.5 + 0.5;
      alpha *= 0.7 + tumble * 0.3;
    }
    // Type 3: Ambient - floating debris
    else if (input.particleType < 3.5) {
      alpha = smoothstep(1.0, 0.0, dist) * input.life * 0.3;
    }
    // Type 4: Impact - shockwave
    else {
      let ring = smoothstep(0.8, 0.6, dist) * smoothstep(0.4, 0.6, dist);
      alpha = ring * input.life;
    }

    return vec4f(color, alpha * input.color.a);
  }
`;

export const victoryShader = /* wgsl */ `
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
  fn vertexMain(@builtin(vertex_index) vertexIndex: u32) -> VertexOutput {
    var positions = array<vec2f, 6>(
      vec2f(-1.0, -1.0), vec2f(1.0, -1.0), vec2f(-1.0, 1.0),
      vec2f(-1.0, 1.0), vec2f(1.0, -1.0), vec2f(1.0, 1.0)
    );

    var output: VertexOutput;
    output.position = vec4f(positions[vertexIndex], 0.0, 1.0);
    output.uv = positions[vertexIndex] * 0.5 + 0.5;
    return output;
  }

  @fragment
  fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
    let time = uniforms.time;
    let intensity = uniforms.intensity;
    let uv = input.uv;

    // Upward burst effect (building rising)
    let center = vec2f(0.5, 0.8);
    let toCenter = uv - center;
    let dist = length(toCenter);
    let angle = atan2(toCenter.y, toCenter.x);

    // Rising lines
    let lines = sin(angle * 20.0 + time * 5.0) * 0.5 + 0.5;
    let lineFade = smoothstep(0.6, 0.0, dist);

    // Horizontal bands (floor levels)
    let bands = sin(uv.y * 40.0 - time * 10.0) * 0.5 + 0.5;
    let bandFade = smoothstep(0.3, 0.8, uv.y);

    // Construction orange/yellow
    let orange = vec3f(1.0, 0.6, 0.1);
    let yellow = vec3f(1.0, 0.9, 0.3);
    let color = mix(orange, yellow, lines);

    let alpha = (lines * lineFade * 0.3 + bands * bandFade * 0.2) * intensity;

    return vec4f(color, alpha);
  }
`;
