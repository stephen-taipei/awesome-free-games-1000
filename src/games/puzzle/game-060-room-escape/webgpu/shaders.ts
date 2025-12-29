/**
 * WebGPU Shaders - Room Escape
 * Mystery Escape Room / Detective Noir Theme
 * Game #060
 */

export const BACKGROUND_SHADER = /* wgsl */ `
  struct Uniforms {
    time: f32,
    width: f32,
    height: f32,
    pad: f32,
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
    let p3 = fract(vec3f(p.x, p.y, p.x) * 0.1031);
    let p3b = p3 + dot(p3, p3.yzx + 33.33);
    return fract((p3b.x + p3b.y) * p3b.z);
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
    var freq = 1.0;
    for (var i = 0; i < 4; i++) {
      value += amplitude * noise(p * freq);
      freq *= 2.0;
      amplitude *= 0.5;
    }
    return value;
  }

  // Dust motes floating in light beams
  fn dustMotes(uv: vec2f, time: f32) -> f32 {
    var dust = 0.0;
    for (var i = 0; i < 15; i++) {
      let seed = f32(i) * 7.3;
      let x = fract(hash(vec2f(seed, 0.1)) + time * 0.02 * (0.5 + hash(vec2f(seed, 0.2))));
      let y = fract(hash(vec2f(seed, 0.3)) + time * 0.01 * hash(vec2f(seed, 0.4)));
      let size = 0.003 + hash(vec2f(seed, 0.5)) * 0.005;

      let drift = vec2f(
        sin(time * 0.5 + seed) * 0.02,
        sin(time * 0.3 + seed * 1.5) * 0.015
      );

      let pos = vec2f(x, y) + drift;
      let dist = length(uv - pos);
      let brightness = hash(vec2f(seed, 0.6)) * (0.5 + sin(time * 2.0 + seed) * 0.3);
      dust += smoothstep(size, 0.0, dist) * brightness;
    }
    return dust * 0.5;
  }

  // Light beam from window or lamp
  fn lightBeam(uv: vec2f, origin: vec2f, angle: f32, width: f32, time: f32) -> f32 {
    let dir = vec2f(cos(angle), sin(angle));
    let perp = vec2f(-sin(angle), cos(angle));

    let toPoint = uv - origin;
    let along = dot(toPoint, dir);
    let across = abs(dot(toPoint, perp));

    if along < 0.0 {
      return 0.0;
    }

    let beamWidth = width * (1.0 + along * 0.5);
    let inBeam = smoothstep(beamWidth, beamWidth * 0.5, across);
    let falloff = exp(-along * 1.5);

    // Add dust particles in beam
    let dustNoise = fbm(uv * 20.0 + time * 0.2);
    let flicker = 0.9 + sin(time * 10.0) * 0.05 + sin(time * 23.0) * 0.03;

    return inBeam * falloff * (0.7 + dustNoise * 0.3) * flicker;
  }

  // Vignette for noir atmosphere
  fn noirVignette(uv: vec2f) -> f32 {
    let center = length(uv - 0.5) * 1.8;
    return 1.0 - smoothstep(0.3, 1.2, center) * 0.7;
  }

  // Wall texture
  fn wallTexture(uv: vec2f) -> f32 {
    let brick = step(0.02, fract(uv.x * 10.0)) * step(0.1, fract(uv.y * 5.0 + floor(uv.x * 10.0) * 0.5));
    let noise1 = fbm(uv * 30.0) * 0.1;
    return brick * 0.15 + noise1;
  }

  // Floor wood grain
  fn floorGrain(uv: vec2f) -> f32 {
    let plank = step(0.02, fract(uv.x * 8.0));
    let grain = sin(uv.y * 100.0 + sin(uv.x * 50.0) * 5.0) * 0.5 + 0.5;
    return plank * 0.2 + grain * 0.1;
  }

  // Mysterious fog layer
  fn mysteryFog(uv: vec2f, time: f32) -> f32 {
    var fog = 0.0;
    fog += fbm(uv * 3.0 + time * 0.03) * 0.5;
    fog += fbm(uv * 6.0 - time * 0.02) * 0.3;
    return fog * smoothstep(0.0, 0.3, uv.y) * 0.15;
  }

  @fragment
  fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
    let uv = input.uv;
    let time = uniforms.time;
    let aspect = uniforms.width / uniforms.height;

    // Base room colors - dark noir atmosphere
    let wallColor = vec3f(0.12, 0.10, 0.14);
    let floorColor = vec3f(0.18, 0.12, 0.08);

    // Determine wall vs floor
    let isFloor = uv.y < 0.3;
    var baseColor = select(wallColor, floorColor, isFloor);

    // Add textures
    let wallTex = wallTexture(uv);
    let floorTex = floorGrain(uv);
    let texture = select(wallTex, floorTex, isFloor);
    baseColor += texture;

    // Light beams - dramatic lighting
    let beam1 = lightBeam(uv, vec2f(0.1, 0.9), -0.7, 0.15, time);
    let beam2 = lightBeam(uv, vec2f(0.85, 0.8), -2.3, 0.1, time);

    let beamColor = vec3f(0.95, 0.85, 0.6);
    baseColor += beamColor * beam1 * 0.4;
    baseColor += beamColor * beam2 * 0.25;

    // Dust particles
    let dust = dustMotes(uv, time);
    baseColor += vec3f(0.9, 0.85, 0.7) * dust * (beam1 + beam2 + 0.2);

    // Mystery fog
    let fog = mysteryFog(uv, time);
    baseColor = mix(baseColor, vec3f(0.3, 0.25, 0.35), fog);

    // Noir vignette
    let vignette = noirVignette(uv);
    baseColor *= vignette;

    // Subtle color grade for mystery atmosphere
    baseColor = pow(baseColor, vec3f(0.95, 1.0, 1.05));

    // Film grain
    let grain = (hash(uv * 500.0 + time * 100.0) - 0.5) * 0.03;
    baseColor += grain;

    return vec4f(baseColor, 1.0);
  }
`;

export const PARTICLE_SHADER = /* wgsl */ `
  struct Uniforms {
    time: f32,
    width: f32,
    height: f32,
    pad: f32,
  }

  @group(0) @binding(0) var<uniform> uniforms: Uniforms;

  struct VertexInput {
    @location(0) position: vec2f,
    @location(1) size: f32,
    @location(2) color: vec4f,
    @location(3) rotation: f32,
    @location(4) particleType: f32,
    @location(5) life: f32,
  }

  struct VertexOutput {
    @builtin(position) position: vec4f,
    @location(0) color: vec4f,
    @location(1) localPos: vec2f,
    @location(2) particleType: f32,
    @location(3) life: f32,
  }

  @vertex
  fn vertexMain(
    input: VertexInput,
    @builtin(vertex_index) vertexIndex: u32
  ) -> VertexOutput {
    var corners = array<vec2f, 4>(
      vec2f(-1.0, -1.0),
      vec2f(1.0, -1.0),
      vec2f(-1.0, 1.0),
      vec2f(1.0, 1.0)
    );

    let corner = corners[vertexIndex];
    let cosR = cos(input.rotation);
    let sinR = sin(input.rotation);
    let rotated = vec2f(
      corner.x * cosR - corner.y * sinR,
      corner.x * sinR + corner.y * cosR
    );

    let aspect = uniforms.width / uniforms.height;
    let size = input.size / uniforms.width * 2.0;
    let pos = input.position + rotated * size;

    var output: VertexOutput;
    output.position = vec4f(pos.x, pos.y * aspect, 0.0, 1.0);
    output.color = input.color;
    output.localPos = corner;
    output.particleType = input.particleType;
    output.life = input.life;
    return output;
  }

  @fragment
  fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
    let dist = length(input.localPos);
    var color = input.color;
    let pType = i32(input.particleType);
    let time = uniforms.time;

    // 0: dust - floating dust motes
    if pType == 0 {
      let soft = 1.0 - smoothstep(0.0, 1.0, dist);
      let twinkle = sin(time * 3.0 + input.life * 10.0) * 0.2 + 0.8;
      color.a *= soft * soft * 0.6 * twinkle;
    }
    // 1: spark - discovery sparkle
    else if pType == 1 {
      let rays = max(
        1.0 - abs(input.localPos.x) * 2.0,
        1.0 - abs(input.localPos.y) * 2.0
      );
      let core = smoothstep(0.4, 0.0, dist);
      let sparkle = sin(time * 15.0 + input.life * 20.0) * 0.3 + 0.7;
      color.a *= (core + rays * 0.5) * sparkle;
    }
    // 2: glow - ambient light glow
    else if pType == 2 {
      let soft = 1.0 - smoothstep(0.0, 1.0, dist);
      let pulse = sin(time * 2.0) * 0.15 + 0.85;
      color.a *= soft * soft * 0.4 * pulse;
    }
    // 3: unlock - lock opening effect
    else if pType == 3 {
      let ring = abs(dist - 0.6) < 0.15;
      let glow = smoothstep(1.0, 0.3, dist);
      let spin = sin(input.localPos.x * 3.0 + input.localPos.y * 3.0 + time * 5.0) * 0.5 + 0.5;
      color.a *= (f32(ring) * spin + glow * 0.3);
    }
    // 4: mystery - mysterious aura
    else if pType == 4 {
      let angle = atan2(input.localPos.y, input.localPos.x);
      let wobble = sin(angle * 5.0 + time * 2.0) * 0.1;
      let aura = smoothstep(1.0 + wobble, 0.3, dist);
      let pulse = sin(time * 1.5) * 0.2 + 0.8;
      color.a *= aura * pulse * 0.5;
    }
    // 5: victory - escape celebration
    else if pType == 5 {
      let star = max(
        1.0 - abs(input.localPos.x) * 2.5,
        1.0 - abs(input.localPos.y) * 2.5
      );
      let core = smoothstep(0.5, 0.0, dist);
      let shimmer = sin(time * 8.0 + input.life * 15.0) * 0.25 + 0.75;
      color.a *= max(star, core) * shimmer;
    }

    if color.a < 0.01 {
      discard;
    }

    return color;
  }
`;
