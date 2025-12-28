/**
 * WebGPU Shaders - DNA Match
 * Biology / Science / DNA Helix Theme
 * Game #134
 */

export const BACKGROUND_SHADER = /* wgsl */ `
  struct Uniforms {
    time: f32,
    resolution: vec2f,
    gameState: f32,
    matchProgress: f32,
  }

  @group(0) @binding(0) var<uniform> uniforms: Uniforms;

  // Hash function for noise
  fn hash(p: vec2f) -> f32 {
    let k = vec2f(0.3183099, 0.3678794);
    let q = p * k + k.yx;
    return fract(16.0 * k.x * fract(q.x * q.y * (q.x + q.y)));
  }

  // Value noise
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

  // FBM for organic texture
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

  // DNA double helix pattern
  fn dnaHelix(uv: vec2f, time: f32) -> f32 {
    var intensity = 0.0;

    // Create two helical strands
    for (var strand = 0; strand < 2; strand++) {
      let phase = f32(strand) * 3.14159;
      let y_offset = uv.y * 8.0 + time * 0.5;

      // Sinusoidal helix path
      let helix_x = sin(y_offset + phase) * 0.15;
      let helix_z = cos(y_offset + phase);

      // Distance from strand
      let dist = abs(uv.x - 0.5 - helix_x);

      // Strand visibility based on z-depth
      let depth_factor = helix_z * 0.5 + 0.5;
      let strand_intensity = smoothstep(0.02, 0.0, dist) * depth_factor;

      intensity += strand_intensity * 0.5;
    }

    // Base pair rungs
    let rung_y = fract(uv.y * 4.0 + time * 0.25);
    let rung_vis = smoothstep(0.45, 0.5, rung_y) * smoothstep(0.55, 0.5, rung_y);
    let center_dist = abs(uv.x - 0.5);
    let rung_intensity = rung_vis * smoothstep(0.15, 0.0, center_dist) * 0.3;

    intensity += rung_intensity;

    return intensity;
  }

  // Molecular grid pattern
  fn molecularGrid(uv: vec2f, time: f32) -> f32 {
    let grid_size = 0.08;
    let grid_uv = fract(uv / grid_size);

    // Hexagonal-like molecular grid
    let hex_offset = step(0.5, fract(uv.y / grid_size * 0.5)) * 0.5;
    let adjusted_x = fract((uv.x + hex_offset * grid_size) / grid_size);

    // Node points
    let node_dist = length(vec2f(adjusted_x, grid_uv.y) - 0.5);
    let node = smoothstep(0.15, 0.1, node_dist);

    // Connecting bonds
    let bond_h = smoothstep(0.02, 0.0, abs(grid_uv.y - 0.5)) * step(0.1, adjusted_x) * step(adjusted_x, 0.9);
    let bond_v = smoothstep(0.02, 0.0, abs(adjusted_x - 0.5)) * step(0.1, grid_uv.y) * step(grid_uv.y, 0.9);

    // Pulse animation
    let pulse = sin(time * 2.0 + uv.x * 10.0 + uv.y * 10.0) * 0.5 + 0.5;

    return (node * 0.4 + (bond_h + bond_v) * 0.15) * (0.3 + pulse * 0.2);
  }

  // Floating molecules
  fn floatingMolecules(uv: vec2f, time: f32) -> vec3f {
    var color = vec3f(0.0);

    for (var i = 0; i < 6; i++) {
      let fi = f32(i);
      let center = vec2f(
        fract(sin(fi * 123.456) * 0.5 + 0.5 + time * 0.02 * (0.5 + fi * 0.1)),
        fract(cos(fi * 789.012) * 0.5 + 0.5 + time * 0.015 * (0.3 + fi * 0.1))
      );

      let dist = length(uv - center);
      let glow = exp(-dist * 15.0) * 0.3;

      // Color based on molecule type
      let hue = fract(fi * 0.15 + time * 0.05);
      let mol_color = vec3f(
        0.3 + 0.7 * sin(hue * 6.28),
        0.5 + 0.5 * sin(hue * 6.28 + 2.09),
        0.4 + 0.6 * sin(hue * 6.28 + 4.18)
      );

      color += glow * mol_color;
    }

    return color;
  }

  // Lab equipment ambient glow
  fn labGlow(uv: vec2f, time: f32) -> vec3f {
    // Bottom equipment glow
    let bottom_glow = exp(-uv.y * 3.0) * 0.2;
    let glow_pulse = sin(time * 1.5) * 0.5 + 0.5;

    // Science blue-green color
    let glow_color = mix(
      vec3f(0.2, 0.4, 0.8),
      vec3f(0.3, 0.9, 0.6),
      glow_pulse
    );

    return glow_color * bottom_glow;
  }

  @vertex
  fn vertexMain(@builtin(vertex_index) vertexIndex: u32) -> @builtin(position) vec4f {
    var pos = array<vec2f, 6>(
      vec2f(-1.0, -1.0), vec2f(1.0, -1.0), vec2f(-1.0, 1.0),
      vec2f(-1.0, 1.0), vec2f(1.0, -1.0), vec2f(1.0, 1.0)
    );
    return vec4f(pos[vertexIndex], 0.0, 1.0);
  }

  @fragment
  fn fragmentMain(@builtin(position) fragCoord: vec4f) -> @location(0) vec4f {
    let uv = fragCoord.xy / uniforms.resolution;
    let time = uniforms.time;

    // Base dark lab background
    var color = vec3f(0.08, 0.1, 0.15);

    // Add subtle noise texture
    let bio_noise = fbm(uv * 8.0 + time * 0.1);
    color += bio_noise * 0.03;

    // DNA helix in background
    let helix_uv = vec2f(uv.x + 0.3, uv.y);
    let helix = dnaHelix(helix_uv, time);
    let helix_color = mix(
      vec3f(0.2, 0.4, 0.8),
      vec3f(0.3, 0.7, 0.5),
      sin(uv.y * 10.0 + time) * 0.5 + 0.5
    );
    color += helix * helix_color * 0.15;

    // Molecular grid
    let grid = molecularGrid(uv, time);
    color += grid * vec3f(0.3, 0.5, 0.7) * 0.3;

    // Floating molecules
    color += floatingMolecules(uv, time) * 0.4;

    // Lab ambient glow
    color += labGlow(uv, time);

    // Victory state - bioluminescent surge
    if (uniforms.gameState > 0.5) {
      let victory_pulse = sin(time * 4.0) * 0.5 + 0.5;
      let bio_glow = vec3f(0.3, 0.9, 0.6) * victory_pulse * 0.3;
      color += bio_glow;
    }

    // Match progress indicator - subtle glow increase
    let progress_glow = uniforms.matchProgress * 0.15;
    color += vec3f(0.2, 0.6, 0.4) * progress_glow;

    // Vignette
    let vignette = 1.0 - length((uv - 0.5) * 1.2) * 0.5;
    color *= vignette;

    return vec4f(color, 1.0);
  }
`;

export const PARTICLE_SHADER = /* wgsl */ `
  struct Uniforms {
    time: f32,
    resolution: vec2f,
    gameState: f32,
  }

  struct Particle {
    position: vec2f,
    velocity: vec2f,
    color: vec4f,
    size: f32,
    life: f32,
    particleType: f32,
    rotation: f32,
  }

  @group(0) @binding(0) var<uniform> uniforms: Uniforms;
  @group(0) @binding(1) var<storage, read> particles: array<Particle>;

  struct VertexOutput {
    @builtin(position) position: vec4f,
    @location(0) color: vec4f,
    @location(1) uv: vec2f,
    @location(2) particleType: f32,
    @location(3) life: f32,
  }

  @vertex
  fn vertexMain(
    @builtin(vertex_index) vertexIndex: u32,
    @builtin(instance_index) instanceIndex: u32
  ) -> VertexOutput {
    let particle = particles[instanceIndex];

    var corners = array<vec2f, 6>(
      vec2f(-1.0, -1.0), vec2f(1.0, -1.0), vec2f(-1.0, 1.0),
      vec2f(-1.0, 1.0), vec2f(1.0, -1.0), vec2f(1.0, 1.0)
    );

    let corner = corners[vertexIndex];

    // Rotate corner
    let cos_r = cos(particle.rotation);
    let sin_r = sin(particle.rotation);
    let rotated = vec2f(
      corner.x * cos_r - corner.y * sin_r,
      corner.x * sin_r + corner.y * cos_r
    );

    let aspect = uniforms.resolution.x / uniforms.resolution.y;
    let size = particle.size * particle.life;

    var pos = particle.position + rotated * size;
    pos.x /= aspect;
    pos = pos * 2.0 - 1.0;

    var output: VertexOutput;
    output.position = vec4f(pos, 0.0, 1.0);
    output.color = particle.color;
    output.uv = corner * 0.5 + 0.5;
    output.particleType = particle.particleType;
    output.life = particle.life;

    return output;
  }

  @fragment
  fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
    let uv = input.uv;
    let center = vec2f(0.5, 0.5);
    let dist = length(uv - center);
    let particleType = i32(input.particleType);

    var alpha = 0.0;
    var color = input.color.rgb;

    switch (particleType) {
      // Type 0: Helix strand
      case 0: {
        let twist = sin(uv.y * 6.28 + uniforms.time * 3.0) * 0.2;
        let strand_dist = abs(uv.x - 0.5 - twist);
        alpha = smoothstep(0.15, 0.0, strand_dist);
        alpha *= smoothstep(0.0, 0.2, uv.y) * smoothstep(1.0, 0.8, uv.y);
      }

      // Type 1: Nucleotide base
      case 1: {
        // Pentagon/hexagon shape for base
        let angle = atan2(uv.y - 0.5, uv.x - 0.5);
        let sides = 5.0;
        let r = 0.35 / cos(3.14159 / sides - (angle % (6.28 / sides)));
        alpha = smoothstep(r + 0.05, r, dist);

        // Inner glow
        let inner = smoothstep(0.2, 0.0, dist) * 0.5;
        alpha = max(alpha, inner);
      }

      // Type 2: Bond connection
      case 2: {
        // Elongated bond shape
        let bond_dist = abs(uv.y - 0.5);
        let bond_length = smoothstep(0.0, 0.2, uv.x) * smoothstep(1.0, 0.8, uv.x);
        alpha = smoothstep(0.08, 0.0, bond_dist) * bond_length;

        // Energy pulse along bond
        let pulse = sin(uv.x * 10.0 - uniforms.time * 5.0) * 0.5 + 0.5;
        color = mix(color, vec3f(1.0), pulse * 0.3);
      }

      // Type 3: Energy spark
      case 3: {
        // Star burst
        let angle = atan2(uv.y - 0.5, uv.x - 0.5);
        let rays = 6.0;
        let ray_pattern = abs(sin(angle * rays + uniforms.time * 3.0));
        let ray_dist = dist / (0.3 + ray_pattern * 0.2);
        alpha = smoothstep(1.0, 0.0, ray_dist);

        // Bright core
        alpha += smoothstep(0.15, 0.0, dist) * 0.8;
      }

      // Type 4: Molecule cluster
      case 4: {
        // Central atom
        alpha = smoothstep(0.2, 0.1, dist);

        // Orbiting electrons
        for (var i = 0; i < 3; i++) {
          let orbit_angle = f32(i) * 2.09 + uniforms.time * 2.0;
          let electron_pos = center + vec2f(cos(orbit_angle), sin(orbit_angle)) * 0.3;
          let e_dist = length(uv - electron_pos);
          alpha += smoothstep(0.08, 0.0, e_dist) * 0.7;
        }
      }

      // Type 5: DNA strand segment
      default: {
        // Double helix cross-section
        let offset1 = vec2f(0.3, 0.5);
        let offset2 = vec2f(0.7, 0.5);
        let d1 = length(uv - offset1);
        let d2 = length(uv - offset2);

        alpha = smoothstep(0.15, 0.05, d1) + smoothstep(0.15, 0.05, d2);

        // Connecting bar
        if (uv.x > 0.3 && uv.x < 0.7) {
          let bar = smoothstep(0.08, 0.0, abs(uv.y - 0.5));
          alpha = max(alpha, bar * 0.6);
        }
      }
    }

    alpha *= input.life;
    alpha *= input.color.a;

    return vec4f(color, alpha);
  }
`;
