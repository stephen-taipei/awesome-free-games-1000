/**
 * WebGPU Shaders - Locksmith
 * Vintage Locksmith Workshop / Steampunk Theme
 * Game #055
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

  fn metalTexture(uv: vec2f, time: f32) -> f32 {
    let brushed = sin(uv.x * 200.0 + noise(uv * 50.0) * 5.0) * 0.5 + 0.5;
    let scratch = smoothstep(0.7, 1.0, noise(uv * 100.0 + time * 0.1));
    return brushed * 0.3 + scratch * 0.1;
  }

  fn woodGrain(uv: vec2f) -> f32 {
    let ring = sin(length(uv - vec2f(0.5)) * 50.0 + uv.y * 20.0);
    let grain = noise(uv * vec2f(5.0, 50.0));
    return ring * 0.3 + grain * 0.2 + 0.5;
  }

  fn gearPattern(uv: vec2f, time: f32) -> f32 {
    let center = vec2f(0.85, 0.15);
    let d = length(uv - center);
    let angle = atan2(uv.y - center.y, uv.x - center.x) + time * 0.5;
    let teeth = 12.0;
    let tooth = sin(angle * teeth) * 0.5 + 0.5;
    let ring = smoothstep(0.08, 0.06, abs(d - 0.1));
    let inner = smoothstep(0.04, 0.03, d);
    return (ring * tooth + inner) * smoothstep(0.15, 0.12, d);
  }

  fn vintageVignette(uv: vec2f) -> f32 {
    let center = uv - 0.5;
    let dist = length(center);
    return 1.0 - smoothstep(0.3, 0.8, dist) * 0.6;
  }

  fn candleFlicker(time: f32) -> f32 {
    return 0.85 + sin(time * 15.0) * 0.05 + sin(time * 23.0) * 0.03 + sin(time * 7.0) * 0.07;
  }

  @fragment
  fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
    let uv = input.uv;
    let time = uniforms.time;

    // Workshop background colors
    let woodColor = vec3f(0.25, 0.15, 0.08);
    let darkWood = vec3f(0.12, 0.07, 0.04);
    let brassColor = vec3f(0.72, 0.53, 0.25);
    let warmLight = vec3f(1.0, 0.85, 0.6);

    // Base workshop wood
    let wood = woodGrain(uv);
    var color = mix(darkWood, woodColor, wood);

    // Metal workbench surface at bottom
    if uv.y < 0.25 {
      let metal = metalTexture(uv, time);
      let metalColor = vec3f(0.3, 0.32, 0.35) + metal * 0.15;
      color = mix(color, metalColor, smoothstep(0.25, 0.2, uv.y));
    }

    // Brass decorative border
    let borderDist = min(min(uv.x, 1.0 - uv.x), min(uv.y, 1.0 - uv.y));
    if borderDist < 0.02 {
      let brassTex = 0.8 + metalTexture(uv * 10.0, time) * 0.2;
      color = mix(color, brassColor * brassTex, smoothstep(0.02, 0.01, borderDist));
    }

    // Gear decoration
    let gear = gearPattern(uv, time);
    color = mix(color, brassColor * 0.8, gear * 0.6);

    // Second gear
    let uv2 = uv - vec2f(0.1, 0.2);
    let gear2 = gearPattern(uv2 + vec2f(0.75, -0.05), -time * 0.7);
    color = mix(color, brassColor * 0.7, gear2 * 0.5);

    // Warm candlelight ambient
    let flicker = candleFlicker(time);
    let ambient = warmLight * flicker * 0.2;
    color += ambient * (1.0 - uv.y * 0.5);

    // Vintage vignette
    color *= vintageVignette(uv);

    // Slight sepia tone
    let sepia = vec3f(
      dot(color, vec3f(0.393, 0.769, 0.189)),
      dot(color, vec3f(0.349, 0.686, 0.168)),
      dot(color, vec3f(0.272, 0.534, 0.131))
    );
    color = mix(color, sepia, 0.15);

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

    // 0: spark - sharp metallic sparkle
    if pType == 0 {
      let star = max(
        1.0 - abs(input.localPos.x) * 2.0,
        1.0 - abs(input.localPos.y) * 2.0
      );
      let sparkle = smoothstep(0.0, 0.3, star) * (1.0 - dist);
      color.a *= sparkle * (0.8 + sin(time * 30.0) * 0.2);
    }
    // 1: pin - solid cylinder shape
    else if pType == 1 {
      let pinShape = smoothstep(0.8, 0.5, abs(input.localPos.x));
      let rounded = smoothstep(1.0, 0.7, abs(input.localPos.y));
      color.a *= pinShape * rounded;
    }
    // 2: click - ring pulse
    else if pType == 2 {
      let ring = abs(dist - 0.6);
      let pulse = smoothstep(0.2, 0.0, ring) * (1.0 - dist);
      color.a *= pulse;
    }
    // 3: oil - glossy droplet
    else if pType == 3 {
      let droplet = smoothstep(1.0, 0.3, dist);
      let highlight = smoothstep(0.4, 0.2, length(input.localPos - vec2f(-0.2, -0.2)));
      color = mix(color, vec4f(1.0, 1.0, 0.9, color.a), highlight * 0.5);
      color.a *= droplet;
    }
    // 4: unlock - golden burst
    else if pType == 4 {
      let rays = sin(atan2(input.localPos.y, input.localPos.x) * 8.0 + time * 5.0) * 0.5 + 0.5;
      let glow = (1.0 - dist) * (0.5 + rays * 0.5);
      color.a *= glow;
    }
    // 5: victory - golden confetti
    else if pType == 5 {
      let rect = max(abs(input.localPos.x), abs(input.localPos.y));
      color.a *= smoothstep(1.0, 0.7, rect);
    }

    if color.a < 0.01 {
      discard;
    }

    return color;
  }
`;
