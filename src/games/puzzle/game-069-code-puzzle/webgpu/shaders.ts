/**
 * WGSL Shaders - Code Puzzle
 * Matrix / Cyberpunk / Hacker Theme
 * Game #069
 */

export const BACKGROUND_SHADER = /* wgsl */ `
  struct Uniforms {
    time: f32,
    width: f32,
    height: f32,
    padding: f32,
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

  // Hash function
  fn hash(p: vec2f) -> f32 {
    var p3 = fract(vec3f(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
  }

  // Matrix rain character
  fn matrixChar(uv: vec2f, time: f32) -> f32 {
    let cellSize = 0.03;
    let cell = floor(uv / cellSize);
    let cellUV = fract(uv / cellSize);

    // Random drop speed per column
    let dropSpeed = 0.5 + hash(vec2f(cell.x, 0.0)) * 1.5;
    let dropOffset = hash(vec2f(cell.x, 1.0)) * 10.0;

    // Calculate drop position
    let dropY = fract(time * dropSpeed * 0.3 + dropOffset);
    let charY = fract(cell.y * 0.05 + time * dropSpeed * 0.1);

    // Brightness based on position in trail
    let trailPos = fract(dropY - uv.y);
    let brightness = smoothstep(0.3, 0.0, trailPos) * step(trailPos, 0.3);

    // Random character flicker
    let charFlicker = step(0.7, hash(cell + floor(time * 5.0)));

    return brightness * (0.5 + charFlicker * 0.5);
  }

  // Grid pattern
  fn gridPattern(uv: vec2f) -> f32 {
    let gridSize = 0.02;
    let gridUV = fract(uv / gridSize);
    let gridLine = step(0.95, gridUV.x) + step(0.95, gridUV.y);
    return gridLine * 0.1;
  }

  // Scan line effect
  fn scanLines(uv: vec2f, time: f32) -> f32 {
    let scanFreq = 200.0;
    let scan = sin(uv.y * scanFreq + time * 2.0) * 0.5 + 0.5;
    return 0.95 + scan * 0.05;
  }

  // Data stream horizontal
  fn dataStream(uv: vec2f, time: f32) -> f32 {
    let streamCount = 8.0;
    var total = 0.0;

    for (var i = 0.0; i < streamCount; i += 1.0) {
      let y = (i + 0.5) / streamCount;
      let dist = abs(uv.y - y);
      let speed = 0.5 + hash(vec2f(i, 0.0)) * 0.5;
      let offset = hash(vec2f(i, 1.0));

      // Moving pulse
      let pulse = fract(uv.x + time * speed + offset);
      let pulseWidth = 0.02 + hash(vec2f(i, 2.0)) * 0.03;
      let pulseBright = smoothstep(pulseWidth, 0.0, abs(pulse - 0.5) * 2.0);

      let lineBright = exp(-dist * 50.0);
      total += lineBright * pulseBright * 0.3;
    }

    return total;
  }

  // Circuit board pattern
  fn circuitBoard(uv: vec2f, time: f32) -> f32 {
    let cellSize = 0.08;
    let cell = floor(uv / cellSize);
    let cellUV = fract(uv / cellSize);

    // Node at intersections
    let nodeDist = length(cellUV - 0.5);
    let node = smoothstep(0.15, 0.1, nodeDist);

    // Traces
    let traceH = step(0.45, cellUV.y) * step(cellUV.y, 0.55);
    let traceV = step(0.45, cellUV.x) * step(cellUV.x, 0.55);

    // Animate trace glow
    let traceGlow = sin(time * 2.0 + cell.x + cell.y) * 0.5 + 0.5;

    return (node + (traceH + traceV) * 0.3) * (0.1 + traceGlow * 0.2);
  }

  @fragment
  fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
    let uv = input.uv;
    let time = uniforms.time;

    // Dark base
    var color = vec3f(0.02, 0.04, 0.08);

    // Add circuit board pattern
    let circuit = circuitBoard(uv, time);
    color += vec3f(0.0, 0.1, 0.15) * circuit;

    // Add grid
    let grid = gridPattern(uv);
    color += vec3f(0.0, 0.3, 0.4) * grid;

    // Add matrix rain
    let matrix = matrixChar(uv, time);
    color += vec3f(0.0, 1.0, 0.4) * matrix * 0.3;

    // Add data streams
    let streams = dataStream(uv, time);
    color += vec3f(0.0, 0.8, 1.0) * streams;

    // Apply scan lines
    color *= scanLines(uv, time);

    // Subtle vignette
    let vignette = 1.0 - length(uv - 0.5) * 0.5;
    color *= vignette;

    // CRT curvature effect
    let curveDist = length((uv - 0.5) * vec2f(1.0, 0.8));
    let crtEdge = smoothstep(0.6, 0.5, curveDist);
    color *= crtEdge * 0.3 + 0.7;

    return vec4f(color, 1.0);
  }
`;

export const PARTICLE_SHADER = /* wgsl */ `
  struct Uniforms {
    time: f32,
    width: f32,
    height: f32,
    padding: f32,
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
    @location(0) uv: vec2f,
    @location(1) color: vec4f,
    @location(2) particleType: f32,
    @location(3) life: f32,
    @location(4) rotation: f32,
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
    let size = input.size / uniforms.width * 2.0;

    // Rotation
    let cos_r = cos(input.rotation);
    let sin_r = sin(input.rotation);
    let rotated = vec2f(
      corner.x * cos_r - corner.y * sin_r,
      corner.x * sin_r + corner.y * cos_r
    );

    var output: VertexOutput;
    output.position = vec4f(input.position + rotated * size, 0.0, 1.0);
    output.uv = corner;
    output.color = input.color;
    output.particleType = input.particleType;
    output.life = input.life;
    output.rotation = input.rotation;
    return output;
  }

  // Hash for randomness
  fn hash(p: vec2f) -> f32 {
    var p3 = fract(vec3f(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
  }

  @fragment
  fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
    let uv = input.uv;
    let dist = length(uv);
    let time = uniforms.time;
    let pType = i32(input.particleType);

    var alpha: f32;
    var color = input.color.rgb;

    // Type 0: Binary bit - square with glow
    if (pType == 0) {
      let squareDist = max(abs(uv.x), abs(uv.y));
      alpha = 1.0 - smoothstep(0.3, 0.6, squareDist);
      // Digital flicker
      let flicker = step(0.7, hash(uv + floor(time * 10.0)));
      alpha *= 0.8 + flicker * 0.2;
    }
    // Type 1: Data stream - elongated horizontal
    else if (pType == 1) {
      let streamShape = exp(-abs(uv.y) * 4.0) * (1.0 - smoothstep(0.0, 1.0, abs(uv.x)));
      alpha = streamShape;
      color += 0.2; // Brighter
    }
    // Type 2: Circuit pulse - small dot with trail
    else if (pType == 2) {
      let core = 1.0 - smoothstep(0.0, 0.3, dist);
      let trail = exp(-abs(uv.x + 0.5) * 3.0) * (1.0 - abs(uv.y) * 2.0);
      alpha = max(core, trail * 0.5);
    }
    // Type 3: Decrypt spark - star burst
    else if (pType == 3) {
      let angle = atan2(uv.y, uv.x);
      let rays = abs(sin(angle * 4.0 + time * 5.0));
      let spark = (1.0 - dist) * (0.5 + rays * 0.5);
      alpha = spark;
    }
    // Type 4: Matrix drop - vertical bar
    else if (pType == 4) {
      let barWidth = 0.3;
      let bar = step(-barWidth, uv.x) * step(uv.x, barWidth);
      let fade = 1.0 - (uv.y * 0.5 + 0.5); // Fade from top to bottom
      alpha = bar * fade;
    }
    // Type 5: Hex code - blocky pattern
    else if (pType == 5) {
      let blockSize = 0.4;
      let block = step(-blockSize, uv.x) * step(uv.x, blockSize) *
                  step(-blockSize, uv.y) * step(uv.y, blockSize);
      alpha = block * 0.9;
      // Slight color shift
      color = mix(color, vec3f(0.0, 1.0, 0.5), 0.3);
    }
    // Default: soft glow
    else {
      alpha = 1.0 - smoothstep(0.0, 1.0, dist);
    }

    alpha *= input.color.a * input.life;

    return vec4f(color, alpha);
  }
`;
