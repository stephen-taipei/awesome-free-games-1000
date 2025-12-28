/**
 * WebGPU Shaders - Chemistry Puzzle
 * Science Lab / Chemistry Laboratory Theme
 * Game #058
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

  fn bubble(uv: vec2f, center: vec2f, radius: f32, time: f32) -> f32 {
    let dist = length(uv - center);
    let edge = smoothstep(radius, radius - 0.02, dist);
    let shine = smoothstep(0.3, 0.0, length(uv - center - vec2f(-0.02, -0.02)));
    return edge * 0.15 + shine * 0.4;
  }

  fn testTube(uv: vec2f, pos: f32, liquidLevel: f32, color: vec3f) -> vec3f {
    let tubeX = (uv.x - pos) * 15.0;
    let tubeY = uv.y;

    // Tube outline
    if abs(tubeX) < 1.0 && tubeY < 0.7 && tubeY > 0.1 {
      let edge = smoothstep(0.9, 1.0, abs(tubeX));

      // Liquid inside
      if tubeY < liquidLevel && abs(tubeX) < 0.85 {
        let liquidColor = color * (0.7 + 0.3 * (1.0 - (liquidLevel - tubeY) / liquidLevel));
        return mix(liquidColor, vec3f(0.8, 0.85, 0.9), edge * 0.3);
      }

      // Glass reflection
      let glass = smoothstep(0.7, 0.9, abs(tubeX)) * 0.2;
      return vec3f(0.7, 0.75, 0.8) * (0.3 + glass);
    }

    return vec3f(0.0);
  }

  fn hexGrid(uv: vec2f, scale: f32) -> f32 {
    // Hexagonal grid pattern for molecular structure hint
    let p = uv * scale;
    let h = vec2f(1.0, sqrt(3.0));
    let a = (p - h * floor(p / h) - 0.5 * h) * 2.0;
    let b = (p - h * 0.5 - h * floor((p - h * 0.5) / h) - 0.5 * h) * 2.0;
    let c = min(dot(a, a), dot(b, b));
    return smoothstep(0.8, 1.0, c);
  }

  fn labEquipmentSilhouette(uv: vec2f) -> f32 {
    var equipment = 0.0;

    // Beaker shapes at bottom
    let beaker1 = step(0.05, uv.y) * step(uv.y, 0.2) * step(0.1, uv.x) * step(uv.x, 0.25);
    let beaker2 = step(0.05, uv.y) * step(uv.y, 0.18) * step(0.75, uv.x) * step(uv.x, 0.88);

    // Bunsen burner flame hint
    let burnerX = abs(uv.x - 0.5);
    let flame = step(uv.y, 0.15) * step(0.08, uv.y) * step(burnerX, 0.03 + 0.02 * sin(uniforms.time * 10.0));

    equipment = max(beaker1, beaker2) * 0.1 + flame * 0.3;
    return equipment;
  }

  @fragment
  fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
    let uv = input.uv;
    let time = uniforms.time;

    // Dark lab background with blue tint
    let labDark = vec3f(0.08, 0.10, 0.18);
    let labMid = vec3f(0.12, 0.15, 0.25);
    let labLight = vec3f(0.16, 0.20, 0.32);

    // Gradient background
    var color = mix(labDark, labMid, uv.y);

    // Subtle hexagonal molecular pattern
    let hexPattern = hexGrid(uv, 8.0);
    color += vec3f(0.02, 0.04, 0.06) * hexPattern;

    // Floating bubbles
    for (var i = 0; i < 6; i++) {
      let seed = f32(i) * 1.618;
      let bubbleY = fract(time * 0.05 + seed) * 1.2 - 0.1;
      let bubbleX = 0.15 + f32(i) * 0.14 + sin(time * 0.5 + seed) * 0.05;
      let radius = 0.015 + 0.01 * sin(seed * 10.0);
      let b = bubble(uv, vec2f(bubbleX, bubbleY), radius, time);
      color += vec3f(0.4, 0.6, 0.9) * b;
    }

    // Test tubes in background
    let tube1 = testTube(uv, 0.12, 0.35 + sin(time * 0.5) * 0.05, vec3f(0.3, 0.7, 0.4));
    let tube2 = testTube(uv, 0.88, 0.45 + sin(time * 0.7 + 1.0) * 0.05, vec3f(0.7, 0.3, 0.5));
    color = max(color, tube1);
    color = max(color, tube2);

    // Lab equipment silhouettes
    let equipment = labEquipmentSilhouette(uv);
    color = mix(color, vec3f(0.15, 0.2, 0.35), equipment);

    // Ambient glow from bottom (lab lighting)
    let glow = smoothstep(0.3, 0.0, uv.y) * 0.15;
    color += vec3f(0.3, 0.5, 0.7) * glow;

    // Subtle noise texture
    let n = noise(uv * 50.0 + time * 0.1) * 0.02;
    color += vec3f(n);

    // Vignette
    let center = length(uv - 0.5) * 1.3;
    let vignette = 1.0 - smoothstep(0.5, 1.1, center) * 0.4;
    color *= vignette;

    // Chemical glow pulses
    let pulse1 = sin(time * 2.0) * 0.5 + 0.5;
    let pulse2 = sin(time * 2.5 + 1.0) * 0.5 + 0.5;
    let glowPos1 = vec2f(0.3, 0.5);
    let glowPos2 = vec2f(0.7, 0.5);
    color += vec3f(0.2, 0.6, 0.3) * smoothstep(0.3, 0.0, length(uv - glowPos1)) * pulse1 * 0.15;
    color += vec3f(0.6, 0.2, 0.7) * smoothstep(0.3, 0.0, length(uv - glowPos2)) * pulse2 * 0.15;

    return vec4f(color, 1.0);
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

    // 0: bubble - rising bubble
    if pType == 0 {
      let ring = abs(dist - 0.7);
      let bubble = smoothstep(0.15, 0.0, ring);
      let shine = smoothstep(0.4, 0.0, length(input.localPos - vec2f(-0.3, -0.3)));
      color.a *= bubble + shine * 0.5;
      color.rgb = mix(color.rgb, vec3f(1.0), shine * 0.3);
    }
    // 1: element - element atom
    else if pType == 1 {
      let circle = smoothstep(1.0, 0.7, dist);
      let core = smoothstep(0.5, 0.2, dist);
      color.a *= circle;
      color.rgb = mix(color.rgb, vec3f(1.0), core * 0.3);
    }
    // 2: reaction - chemical reaction spark
    else if pType == 2 {
      let star = max(
        1.0 - abs(input.localPos.x) * 2.5,
        1.0 - abs(input.localPos.y) * 2.5
      );
      let flare = smoothstep(0.0, 0.6, star) * (1.0 - dist * 0.6);
      color.a *= flare;
      color.r = min(1.0, color.r + 0.2);
    }
    // 3: glow - soft glow
    else if pType == 3 {
      let soft = 1.0 - smoothstep(0.0, 1.0, dist);
      let pulse = sin(time * 5.0 + input.life * 10.0) * 0.2 + 0.8;
      color.a *= soft * 0.6 * pulse;
    }
    // 4: smoke - reaction smoke
    else if pType == 4 {
      let soft = 1.0 - smoothstep(0.0, 1.0, dist);
      let wispy = soft * (0.6 + noise2D(input.localPos * 3.0 + time) * 0.4);
      color.a *= wispy * 0.4;
    }
    // 5: victory - confetti
    else if pType == 5 {
      let rect = max(abs(input.localPos.x), abs(input.localPos.y) * 0.5);
      color.a *= smoothstep(1.0, 0.5, rect);
    }

    if color.a < 0.01 {
      discard;
    }

    return color;
  }

  fn noise2D(p: vec2f) -> f32 {
    return fract(sin(dot(p, vec2f(12.9898, 78.233))) * 43758.5453);
  }
`;
