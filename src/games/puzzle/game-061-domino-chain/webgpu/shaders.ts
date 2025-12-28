/**
 * WebGPU Shaders - Domino Chain
 * Wooden Board Game / Classic Domino Theme
 * Game #061
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

  // Wood grain texture
  fn woodGrain(uv: vec2f, scale: f32) -> f32 {
    let p = uv * scale;

    // Ring pattern
    let ring = sin(p.x * 8.0 + sin(p.y * 2.0) * 3.0) * 0.5 + 0.5;

    // Fine grain lines
    let grain = noise(p * vec2f(2.0, 20.0)) * 0.3;

    // Knot variations
    let knotNoise = noise(p * 0.5);

    return ring * 0.4 + grain + knotNoise * 0.2;
  }

  // Wood plank pattern
  fn plankPattern(uv: vec2f) -> f32 {
    let plankWidth = 0.2;
    let gap = 0.005;

    let plankX = fract(uv.x / plankWidth);
    let plankId = floor(uv.x / plankWidth);

    // Offset alternating planks
    let offsetY = fract(plankId * 0.3);
    let adjustedY = uv.y + offsetY;

    // Gap between planks
    let gapX = smoothstep(0.0, gap, plankX) * smoothstep(1.0, 1.0 - gap, plankX);
    let gapY = smoothstep(0.0, gap * 2.0, fract(adjustedY)) * smoothstep(1.0, 1.0 - gap * 2.0, fract(adjustedY));

    return gapX * gapY;
  }

  // Varnish shine effect
  fn varnishShine(uv: vec2f, time: f32) -> f32 {
    let center = vec2f(0.3 + sin(time * 0.2) * 0.1, 0.3);
    let dist = length(uv - center);
    let shine = smoothstep(0.5, 0.0, dist) * 0.15;
    return shine;
  }

  // Ambient dust particles
  fn dustParticles(uv: vec2f, time: f32) -> f32 {
    var dust = 0.0;
    for (var i = 0; i < 8; i++) {
      let seed = f32(i) * 5.7;
      let x = fract(hash(vec2f(seed, 0.1)) + time * 0.01);
      let y = fract(hash(vec2f(seed, 0.2)) + time * 0.005);
      let size = 0.002 + hash(vec2f(seed, 0.3)) * 0.003;

      let pos = vec2f(x, y);
      let dist = length(uv - pos);
      let brightness = hash(vec2f(seed, 0.4)) * 0.5;
      dust += smoothstep(size, 0.0, dist) * brightness;
    }
    return dust * 0.3;
  }

  // Board edge shadow
  fn edgeShadow(uv: vec2f) -> f32 {
    let edgeX = min(uv.x, 1.0 - uv.x);
    let edgeY = min(uv.y, 1.0 - uv.y);
    let edge = min(edgeX, edgeY);
    return smoothstep(0.0, 0.08, edge);
  }

  @fragment
  fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
    let uv = input.uv;
    let time = uniforms.time;

    // Base wood colors
    let woodDark = vec3f(0.45, 0.28, 0.15);  // Dark mahogany
    let woodLight = vec3f(0.65, 0.45, 0.25); // Light oak

    // Wood grain and texture
    let grain = woodGrain(uv, 5.0);
    let plank = plankPattern(uv);

    // Mix wood colors based on grain
    var color = mix(woodDark, woodLight, grain);

    // Apply plank gaps
    color *= 0.85 + plank * 0.15;

    // Add subtle color variation per plank
    let plankId = floor(uv.x / 0.2);
    let plankTint = hash(vec2f(plankId, 0.5)) * 0.1;
    color += vec3f(plankTint * 0.5, plankTint * 0.3, 0.0);

    // Varnish shine
    let shine = varnishShine(uv, time);
    color += vec3f(shine);

    // Dust particles
    let dust = dustParticles(uv, time);
    color += vec3f(0.9, 0.85, 0.7) * dust;

    // Edge shadow for depth
    let edge = edgeShadow(uv);
    color *= 0.7 + edge * 0.3;

    // Subtle ambient occlusion at edges
    let ao = smoothstep(0.0, 0.15, min(uv.x, min(1.0 - uv.x, min(uv.y, 1.0 - uv.y))));
    color *= 0.85 + ao * 0.15;

    // Film grain for texture
    let filmGrain = (hash(uv * 500.0 + time * 50.0) - 0.5) * 0.02;
    color += filmGrain;

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

    // 0: dust - impact dust cloud
    if pType == 0 {
      let soft = 1.0 - smoothstep(0.0, 1.0, dist);
      let wispy = soft * (0.7 + sin(dist * 5.0 + time * 2.0) * 0.3);
      color.a *= wispy * 0.5;
    }
    // 1: spark - collision spark
    else if pType == 1 {
      let spark = 1.0 - dist;
      let flicker = sin(time * 20.0 + input.life * 30.0) * 0.3 + 0.7;
      color.a *= spark * spark * flicker;
    }
    // 2: glow - target glow
    else if pType == 2 {
      let soft = 1.0 - smoothstep(0.0, 1.0, dist);
      let pulse = sin(time * 3.0) * 0.2 + 0.8;
      color.a *= soft * soft * 0.6 * pulse;
    }
    // 3: impact - collision impact
    else if pType == 3 {
      let ring = abs(dist - 0.5) < 0.15;
      let fade = 1.0 - dist;
      color.a *= (f32(ring) + fade * 0.5) * input.life;
    }
    // 4: ripple - shockwave ripple
    else if pType == 4 {
      let ringWidth = 0.1;
      let ring = 1.0 - smoothstep(0.0, ringWidth, abs(dist - (1.0 - input.life)));
      color.a *= ring * input.life;
    }
    // 5: victory - celebration particle
    else if pType == 5 {
      // Confetti shape
      let rect = max(abs(input.localPos.x), abs(input.localPos.y)) < 0.8;
      let shimmer = sin(time * 10.0 + input.life * 20.0) * 0.2 + 0.8;
      color.a *= f32(rect) * shimmer;
    }

    if color.a < 0.01 {
      discard;
    }

    return color;
  }
`;
