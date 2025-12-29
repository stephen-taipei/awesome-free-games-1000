/**
 * WebGPU 渲染器 - 麻將連連看
 * WebGPU Renderer for Mahjong Connect
 */
import { mat4, vec3, type Mat4, type Vec3 } from './math';
import { ParticleSystem, type Particle } from './particles';
import {
  boardShader,
  tileShader,
  pathShader,
  particleShader,
  timerShader,
  backgroundShader,
  hintShader,
} from './shaders';

export interface TileData {
  row: number;
  col: number;
  type: number;
  visible: boolean;
  selected: boolean;
  matched: boolean;
  hovered: boolean;
}

export interface PathPoint {
  r: number;
  c: number;
}

export class WebGPURenderer {
  private canvas: HTMLCanvasElement;
  private device: GPUDevice | null = null;
  private context: GPUCanvasContext | null = null;
  private format: GPUTextureFormat = 'bgra8unorm';

  // Grid config
  private rows = 8;
  private cols = 14;

  // Pipelines
  private backgroundPipeline: GPURenderPipeline | null = null;
  private boardPipeline: GPURenderPipeline | null = null;
  private tilePipeline: GPURenderPipeline | null = null;
  private pathPipeline: GPURenderPipeline | null = null;
  private particlePipeline: GPURenderPipeline | null = null;
  private timerPipeline: GPURenderPipeline | null = null;
  private hintPipeline: GPURenderPipeline | null = null;

  // Buffers
  private quadBuffer: GPUBuffer | null = null;
  private boardBuffer: GPUBuffer | null = null;
  private tileBuffer: GPUBuffer | null = null;
  private tileInstanceBuffer: GPUBuffer | null = null;
  private pathBuffer: GPUBuffer | null = null;
  private particleQuadBuffer: GPUBuffer | null = null;
  private particleDataBuffer: GPUBuffer | null = null;
  private timerBuffer: GPUBuffer | null = null;
  private hintPlaneBuffer: GPUBuffer | null = null;
  private hintDataBuffer: GPUBuffer | null = null;

  // Uniform buffers
  private backgroundUniformBuffer: GPUBuffer | null = null;
  private boardUniformBuffer: GPUBuffer | null = null;
  private tileUniformBuffer: GPUBuffer | null = null;
  private pathUniformBuffer: GPUBuffer | null = null;
  private particleUniformBuffer: GPUBuffer | null = null;
  private timerUniformBuffer: GPUBuffer | null = null;
  private hintUniformBuffer: GPUBuffer | null = null;

  // Bind groups
  private backgroundBindGroup: GPUBindGroup | null = null;
  private boardBindGroup: GPUBindGroup | null = null;
  private tileBindGroup: GPUBindGroup | null = null;
  private pathBindGroup: GPUBindGroup | null = null;
  private particleBindGroup: GPUBindGroup | null = null;
  private timerBindGroup: GPUBindGroup | null = null;
  private hintBindGroup: GPUBindGroup | null = null;

  // Depth buffer
  private depthTexture: GPUTexture | null = null;

  // Camera matrices
  private projMatrix: Mat4;
  private viewMatrix: Mat4;
  private viewProjMatrix: Mat4;

  // State
  private time = 0;
  private timeProgress = 1.0;
  private currentPath: PathPoint[] = [];
  private pathVertexCount = 0;
  private hintPositions: Array<{x: number, z: number}> = [];

  // Particle system
  private particles: ParticleSystem;
  private maxParticles = 2000;
  private maxTiles = 150;

  // Tile colors for each type
  private tileColors: [number, number, number, number][] = [];

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.projMatrix = mat4.create();
    this.viewMatrix = mat4.create();
    this.viewProjMatrix = mat4.create();
    this.particles = new ParticleSystem();

    // Generate tile colors for 25 types
    for (let i = 0; i < 25; i++) {
      const hue = (i / 25) * 360;
      const rgb = this.hslToRgb(hue, 0.7, 0.5);
      this.tileColors.push([rgb[0], rgb[1], rgb[2], 1.0]);
    }
  }

  private hslToRgb(h: number, s: number, l: number): [number, number, number] {
    h /= 360;
    let r, g, b;
    if (s === 0) {
      r = g = b = l;
    } else {
      const hue2rgb = (p: number, q: number, t: number) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1/6) return p + (q - p) * 6 * t;
        if (t < 1/2) return q;
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
      };
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1/3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1/3);
    }
    return [r, g, b];
  }

  async init(): Promise<boolean> {
    if (!navigator.gpu) {
      console.warn('WebGPU not supported');
      return false;
    }

    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) {
      console.warn('No GPU adapter found');
      return false;
    }

    this.device = await adapter.requestDevice();
    this.context = this.canvas.getContext('webgpu');
    if (!this.context) {
      console.warn('Failed to get WebGPU context');
      return false;
    }

    this.format = navigator.gpu.getPreferredCanvasFormat();
    this.context.configure({
      device: this.device,
      format: this.format,
      alphaMode: 'premultiplied',
    });

    this.createDepthTexture();
    this.setupCamera();
    this.createGeometry();
    this.createPipelines();
    this.createBindGroups();

    window.addEventListener('resize', () => this.handleResize());

    return true;
  }

  private handleResize(): void {
    if (!this.device || !this.context) return;

    this.context.configure({
      device: this.device,
      format: this.format,
      alphaMode: 'premultiplied',
    });

    this.createDepthTexture();
    this.setupCamera();
  }

  private createDepthTexture(): void {
    if (!this.device) return;

    if (this.depthTexture) {
      this.depthTexture.destroy();
    }

    this.depthTexture = this.device.createTexture({
      size: {
        width: this.canvas.width,
        height: this.canvas.height,
      },
      format: 'depth24plus',
      usage: GPUTextureUsage.RENDER_ATTACHMENT,
    });
  }

  private setupCamera(): void {
    const aspect = this.canvas.width / this.canvas.height;
    const fovy = Math.PI / 4;

    mat4.perspective(this.projMatrix, fovy, aspect, 0.1, 100);

    // Camera looking at board center
    const boardWidth = this.cols + 2;
    const boardHeight = this.rows + 2;
    const cameraHeight = Math.max(boardWidth, boardHeight) * 0.8;

    mat4.lookAt(
      this.viewMatrix,
      [boardWidth / 2, cameraHeight, boardHeight * 0.7],
      [boardWidth / 2, 0, boardHeight / 2],
      [0, 1, 0]
    );

    mat4.multiply(this.viewProjMatrix, this.projMatrix, this.viewMatrix);
  }

  setGridSize(rows: number, cols: number): void {
    this.rows = rows;
    this.cols = cols;
    this.setupCamera();
  }

  private createGeometry(): void {
    if (!this.device) return;

    // Full screen quad for background
    const quadVerts = new Float32Array([
      -1, -1, 1, -1, -1, 1,
      -1, 1, 1, -1, 1, 1,
    ]);
    this.quadBuffer = this.device.createBuffer({
      size: quadVerts.byteLength,
      usage: GPUBufferUsage.VERTEX,
      mappedAtCreation: true,
    });
    new Float32Array(this.quadBuffer.getMappedRange()).set(quadVerts);
    this.quadBuffer.unmap();

    // Board plane
    const boardWidth = this.cols + 2;
    const boardHeight = this.rows + 2;
    const boardVerts = new Float32Array([
      0, 0, 0, 0, 0,
      boardWidth, 0, 0, 1, 0,
      0, 0, boardHeight, 0, 1,
      boardWidth, 0, boardHeight, 1, 1,
    ]);
    this.boardBuffer = this.device.createBuffer({
      size: boardVerts.byteLength,
      usage: GPUBufferUsage.VERTEX,
      mappedAtCreation: true,
    });
    new Float32Array(this.boardBuffer.getMappedRange()).set(boardVerts);
    this.boardBuffer.unmap();

    // Tile geometry (box)
    this.createTileGeometry();

    // Path buffer (dynamic)
    this.pathBuffer = this.device.createBuffer({
      size: 1000 * 8 * 4, // Max 1000 vertices
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });

    // Particle quad
    const particleQuad = new Float32Array([
      -1, -1, 1, -1, -1, 1,
      -1, 1, 1, -1, 1, 1,
    ]);
    this.particleQuadBuffer = this.device.createBuffer({
      size: particleQuad.byteLength,
      usage: GPUBufferUsage.VERTEX,
      mappedAtCreation: true,
    });
    new Float32Array(this.particleQuadBuffer.getMappedRange()).set(particleQuad);
    this.particleQuadBuffer.unmap();

    // Particle data buffer (storage)
    this.particleDataBuffer = this.device.createBuffer({
      size: this.maxParticles * 48, // Particle struct size
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });

    // Tile instance buffer
    this.tileInstanceBuffer = this.device.createBuffer({
      size: this.maxTiles * 96, // 64 (matrix) + 16 (color) + 16 (state)
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });

    // Timer bar
    const timerVerts = new Float32Array([
      0, 0, 0, 0, 0,
      1, 0, 0, 1, 0,
      0, 0.08, 0, 0, 1,
      1, 0.08, 0, 1, 1,
    ]);
    this.timerBuffer = this.device.createBuffer({
      size: timerVerts.byteLength,
      usage: GPUBufferUsage.VERTEX,
      mappedAtCreation: true,
    });
    new Float32Array(this.timerBuffer.getMappedRange()).set(timerVerts);
    this.timerBuffer.unmap();

    // Hint plane
    const hintVerts = new Float32Array([
      -0.5, 0, -0.5,
      0.5, 0, -0.5,
      -0.5, 0, 0.5,
      0.5, 0, 0.5,
    ]);
    this.hintPlaneBuffer = this.device.createBuffer({
      size: hintVerts.byteLength,
      usage: GPUBufferUsage.VERTEX,
      mappedAtCreation: true,
    });
    new Float32Array(this.hintPlaneBuffer.getMappedRange()).set(hintVerts);
    this.hintPlaneBuffer.unmap();

    // Hint data buffer
    this.hintDataBuffer = this.device.createBuffer({
      size: 10 * 32, // Max 10 hints
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });
  }

  private createTileGeometry(): void {
    if (!this.device) return;

    // Mahjong tile dimensions
    const w = 0.45;  // Width
    const h = 0.3;   // Height
    const d = 0.45;  // Depth

    const positions: number[] = [];
    const normals: number[] = [];

    // Front face
    positions.push(-w, 0, d, w, 0, d, -w, h, d, w, h, d);
    normals.push(0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1);

    // Back face
    positions.push(w, 0, -d, -w, 0, -d, w, h, -d, -w, h, -d);
    normals.push(0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1);

    // Top face
    positions.push(-w, h, -d, w, h, -d, -w, h, d, w, h, d);
    normals.push(0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0);

    // Bottom face
    positions.push(-w, 0, d, w, 0, d, -w, 0, -d, w, 0, -d);
    normals.push(0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0);

    // Right face
    positions.push(w, 0, d, w, 0, -d, w, h, d, w, h, -d);
    normals.push(1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0);

    // Left face
    positions.push(-w, 0, -d, -w, 0, d, -w, h, -d, -w, h, d);
    normals.push(-1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0);

    // Create indices for triangle strip -> triangles
    const indices: number[] = [];
    for (let face = 0; face < 6; face++) {
      const base = face * 4;
      indices.push(base, base + 1, base + 2);
      indices.push(base + 2, base + 1, base + 3);
    }

    // Interleave position and normal
    const vertexData = new Float32Array(positions.length * 2);
    for (let i = 0; i < positions.length / 3; i++) {
      vertexData[i * 6] = positions[i * 3];
      vertexData[i * 6 + 1] = positions[i * 3 + 1];
      vertexData[i * 6 + 2] = positions[i * 3 + 2];
      vertexData[i * 6 + 3] = normals[i * 3];
      vertexData[i * 6 + 4] = normals[i * 3 + 1];
      vertexData[i * 6 + 5] = normals[i * 3 + 2];
    }

    this.tileBuffer = this.device.createBuffer({
      size: vertexData.byteLength + indices.length * 4,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.INDEX,
      mappedAtCreation: true,
    });

    const mapping = this.tileBuffer.getMappedRange();
    new Float32Array(mapping, 0, vertexData.length).set(vertexData);
    new Uint32Array(mapping, vertexData.byteLength, indices.length).set(indices);
    this.tileBuffer.unmap();
  }

  private createPipelines(): void {
    if (!this.device) return;

    // Background pipeline
    this.backgroundPipeline = this.device.createRenderPipeline({
      layout: 'auto',
      vertex: {
        module: this.device.createShaderModule({ code: backgroundShader }),
        entryPoint: 'vs_main',
        buffers: [{
          arrayStride: 8,
          attributes: [{ shaderLocation: 0, offset: 0, format: 'float32x2' }],
        }],
      },
      fragment: {
        module: this.device.createShaderModule({ code: backgroundShader }),
        entryPoint: 'fs_main',
        targets: [{ format: this.format }],
      },
      primitive: { topology: 'triangle-list' },
    });

    // Board pipeline
    this.boardPipeline = this.device.createRenderPipeline({
      layout: 'auto',
      vertex: {
        module: this.device.createShaderModule({ code: boardShader }),
        entryPoint: 'vs_main',
        buffers: [{
          arrayStride: 20,
          attributes: [
            { shaderLocation: 0, offset: 0, format: 'float32x3' },
            { shaderLocation: 1, offset: 12, format: 'float32x2' },
          ],
        }],
      },
      fragment: {
        module: this.device.createShaderModule({ code: boardShader }),
        entryPoint: 'fs_main',
        targets: [{ format: this.format }],
      },
      primitive: { topology: 'triangle-strip' },
      depthStencil: {
        format: 'depth24plus',
        depthWriteEnabled: true,
        depthCompare: 'less',
      },
    });

    // Tile pipeline
    this.tilePipeline = this.device.createRenderPipeline({
      layout: 'auto',
      vertex: {
        module: this.device.createShaderModule({ code: tileShader }),
        entryPoint: 'vs_main',
        buffers: [{
          arrayStride: 24,
          attributes: [
            { shaderLocation: 0, offset: 0, format: 'float32x3' },
            { shaderLocation: 1, offset: 12, format: 'float32x3' },
          ],
        }],
      },
      fragment: {
        module: this.device.createShaderModule({ code: tileShader }),
        entryPoint: 'fs_main',
        targets: [{ format: this.format }],
      },
      primitive: { topology: 'triangle-list' },
      depthStencil: {
        format: 'depth24plus',
        depthWriteEnabled: true,
        depthCompare: 'less',
      },
    });

    // Path pipeline
    this.pathPipeline = this.device.createRenderPipeline({
      layout: 'auto',
      vertex: {
        module: this.device.createShaderModule({ code: pathShader }),
        entryPoint: 'vs_main',
        buffers: [{
          arrayStride: 32,
          attributes: [
            { shaderLocation: 0, offset: 0, format: 'float32x3' },
            { shaderLocation: 1, offset: 12, format: 'float32x2' },
            { shaderLocation: 2, offset: 20, format: 'float32' },
          ],
        }],
      },
      fragment: {
        module: this.device.createShaderModule({ code: pathShader }),
        entryPoint: 'fs_main',
        targets: [{
          format: this.format,
          blend: {
            color: { srcFactor: 'src-alpha', dstFactor: 'one-minus-src-alpha' },
            alpha: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha' },
          },
        }],
      },
      primitive: { topology: 'triangle-strip' },
      depthStencil: {
        format: 'depth24plus',
        depthWriteEnabled: false,
        depthCompare: 'less',
      },
    });

    // Particle pipeline
    this.particlePipeline = this.device.createRenderPipeline({
      layout: 'auto',
      vertex: {
        module: this.device.createShaderModule({ code: particleShader }),
        entryPoint: 'vs_main',
        buffers: [{
          arrayStride: 8,
          attributes: [{ shaderLocation: 0, offset: 0, format: 'float32x2' }],
        }],
      },
      fragment: {
        module: this.device.createShaderModule({ code: particleShader }),
        entryPoint: 'fs_main',
        targets: [{
          format: this.format,
          blend: {
            color: { srcFactor: 'src-alpha', dstFactor: 'one' },
            alpha: { srcFactor: 'one', dstFactor: 'one' },
          },
        }],
      },
      primitive: { topology: 'triangle-list' },
      depthStencil: {
        format: 'depth24plus',
        depthWriteEnabled: false,
        depthCompare: 'less',
      },
    });

    // Timer pipeline
    this.timerPipeline = this.device.createRenderPipeline({
      layout: 'auto',
      vertex: {
        module: this.device.createShaderModule({ code: timerShader }),
        entryPoint: 'vs_main',
        buffers: [{
          arrayStride: 20,
          attributes: [
            { shaderLocation: 0, offset: 0, format: 'float32x3' },
            { shaderLocation: 1, offset: 12, format: 'float32x2' },
          ],
        }],
      },
      fragment: {
        module: this.device.createShaderModule({ code: timerShader }),
        entryPoint: 'fs_main',
        targets: [{ format: this.format }],
      },
      primitive: { topology: 'triangle-strip' },
      depthStencil: {
        format: 'depth24plus',
        depthWriteEnabled: false,
        depthCompare: 'less',
      },
    });

    // Hint pipeline
    this.hintPipeline = this.device.createRenderPipeline({
      layout: 'auto',
      vertex: {
        module: this.device.createShaderModule({ code: hintShader }),
        entryPoint: 'vs_main',
        buffers: [{
          arrayStride: 12,
          attributes: [{ shaderLocation: 0, offset: 0, format: 'float32x3' }],
        }],
      },
      fragment: {
        module: this.device.createShaderModule({ code: hintShader }),
        entryPoint: 'fs_main',
        targets: [{
          format: this.format,
          blend: {
            color: { srcFactor: 'src-alpha', dstFactor: 'one-minus-src-alpha' },
            alpha: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha' },
          },
        }],
      },
      primitive: { topology: 'triangle-strip' },
      depthStencil: {
        format: 'depth24plus',
        depthWriteEnabled: false,
        depthCompare: 'less',
      },
    });
  }

  private createBindGroups(): void {
    if (!this.device) return;

    // Background uniforms
    this.backgroundUniformBuffer = this.device.createBuffer({
      size: 16,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    this.backgroundBindGroup = this.device.createBindGroup({
      layout: this.backgroundPipeline!.getBindGroupLayout(0),
      entries: [{
        binding: 0,
        resource: { buffer: this.backgroundUniformBuffer },
      }],
    });

    // Board uniforms
    this.boardUniformBuffer = this.device.createBuffer({
      size: 80,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    this.boardBindGroup = this.device.createBindGroup({
      layout: this.boardPipeline!.getBindGroupLayout(0),
      entries: [{
        binding: 0,
        resource: { buffer: this.boardUniformBuffer },
      }],
    });

    // Tile uniforms
    this.tileUniformBuffer = this.device.createBuffer({
      size: 80,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    this.tileBindGroup = this.device.createBindGroup({
      layout: this.tilePipeline!.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: this.tileUniformBuffer } },
        { binding: 1, resource: { buffer: this.tileInstanceBuffer! } },
      ],
    });

    // Path uniforms
    this.pathUniformBuffer = this.device.createBuffer({
      size: 80,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    this.pathBindGroup = this.device.createBindGroup({
      layout: this.pathPipeline!.getBindGroupLayout(0),
      entries: [{
        binding: 0,
        resource: { buffer: this.pathUniformBuffer },
      }],
    });

    // Particle uniforms
    this.particleUniformBuffer = this.device.createBuffer({
      size: 80,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    this.particleBindGroup = this.device.createBindGroup({
      layout: this.particlePipeline!.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: this.particleUniformBuffer } },
        { binding: 1, resource: { buffer: this.particleDataBuffer! } },
      ],
    });

    // Timer uniforms
    this.timerUniformBuffer = this.device.createBuffer({
      size: 80,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    this.timerBindGroup = this.device.createBindGroup({
      layout: this.timerPipeline!.getBindGroupLayout(0),
      entries: [{
        binding: 0,
        resource: { buffer: this.timerUniformBuffer },
      }],
    });

    // Hint uniforms
    this.hintUniformBuffer = this.device.createBuffer({
      size: 80,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    this.hintBindGroup = this.device.createBindGroup({
      layout: this.hintPipeline!.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: this.hintUniformBuffer } },
        { binding: 1, resource: { buffer: this.hintDataBuffer! } },
      ],
    });
  }

  setTimeProgress(progress: number): void {
    this.timeProgress = Math.max(0, Math.min(1, progress));
  }

  setPath(path: PathPoint[]): void {
    this.currentPath = path;
    this.updatePathGeometry();
  }

  clearPath(): void {
    this.currentPath = [];
    this.pathVertexCount = 0;
  }

  setHints(positions: Array<{r: number, c: number}>): void {
    this.hintPositions = positions.map(p => ({
      x: p.c + 0.5,
      z: p.r + 0.5,
    }));
  }

  clearHints(): void {
    this.hintPositions = [];
  }

  private updatePathGeometry(): void {
    if (!this.device || this.currentPath.length < 2) {
      this.pathVertexCount = 0;
      return;
    }

    const lineWidth = 0.15;
    const y = 0.35;
    const vertices: number[] = [];

    // Calculate total path length for progress
    let totalLength = 0;
    const segmentLengths: number[] = [0];
    for (let i = 1; i < this.currentPath.length; i++) {
      const dx = this.currentPath[i].c - this.currentPath[i - 1].c;
      const dz = this.currentPath[i].r - this.currentPath[i - 1].r;
      totalLength += Math.sqrt(dx * dx + dz * dz);
      segmentLengths.push(totalLength);
    }

    // Generate ribbon geometry
    for (let i = 0; i < this.currentPath.length - 1; i++) {
      const p1 = this.currentPath[i];
      const p2 = this.currentPath[i + 1];

      const x1 = p1.c + 0.5;
      const z1 = p1.r + 0.5;
      const x2 = p2.c + 0.5;
      const z2 = p2.r + 0.5;

      const dx = x2 - x1;
      const dz = z2 - z1;
      const len = Math.sqrt(dx * dx + dz * dz);
      const nx = -dz / len * lineWidth;
      const nz = dx / len * lineWidth;

      const progress1 = segmentLengths[i] / totalLength;
      const progress2 = segmentLengths[i + 1] / totalLength;

      // pos(3) + uv(2) + progress(1) + padding(2) = 8 floats per vertex
      // Two triangles per segment
      vertices.push(
        x1 - nx, y, z1 - nz, 0, 0, progress1, 0, 0,
        x1 + nx, y, z1 + nz, 0, 1, progress1, 0, 0,
        x2 - nx, y, z2 - nz, 1, 0, progress2, 0, 0,
        x2 + nx, y, z2 + nz, 1, 1, progress2, 0, 0,
      );
    }

    if (vertices.length > 0) {
      this.device.queue.writeBuffer(
        this.pathBuffer!,
        0,
        new Float32Array(vertices)
      );
      this.pathVertexCount = (this.currentPath.length - 1) * 4;
    }
  }

  updateTiles(tiles: TileData[]): void {
    if (!this.device) return;

    const instanceData = new Float32Array(tiles.length * 24); // 24 floats per tile

    tiles.forEach((tile, i) => {
      const offset = i * 24;

      // Model matrix (4x4 = 16 floats)
      const model = mat4.create();
      mat4.identity(model);
      mat4.translate(model, model, [tile.col + 0.5, 0, tile.row + 0.5]);

      for (let j = 0; j < 16; j++) {
        instanceData[offset + j] = model[j];
      }

      // Color (4 floats)
      const color = this.tileColors[tile.type % this.tileColors.length];
      instanceData[offset + 16] = color[0];
      instanceData[offset + 17] = color[1];
      instanceData[offset + 18] = color[2];
      instanceData[offset + 19] = color[3];

      // State (4 floats)
      instanceData[offset + 20] = tile.selected ? 1 : 0;
      instanceData[offset + 21] = tile.matched ? 1 : 0;
      instanceData[offset + 22] = tile.hovered ? 1 : 0;
      instanceData[offset + 23] = tile.type;
    });

    this.device.queue.writeBuffer(this.tileInstanceBuffer!, 0, instanceData);
  }

  // Particle emission methods
  emitMatch(r1: number, c1: number, r2: number, c2: number, tileType: number): void {
    const x1 = c1 + 0.5;
    const z1 = r1 + 0.5;
    const x2 = c2 + 0.5;
    const z2 = r2 + 0.5;
    this.particles.emitMatch(x1, z1, x2, z2, tileType);
  }

  emitPath(path: PathPoint[]): void {
    if (path.length < 2) return;
    const points = path.map(p => ({ x: p.c + 0.5, z: p.r + 0.5 }));
    this.particles.emitPathTrail(points);
  }

  emitSelect(r: number, c: number): void {
    this.particles.emitSelect(c + 0.5, r + 0.5);
  }

  emitShuffle(): void {
    const centerX = (this.cols + 2) / 2;
    const centerZ = (this.rows + 2) / 2;
    this.particles.emitShuffle(centerX, centerZ, this.cols, this.rows);
  }

  emitHint(r: number, c: number): void {
    this.particles.emitHint(c + 0.5, r + 0.5);
  }

  emitVictory(): void {
    const centerX = (this.cols + 2) / 2;
    const centerZ = (this.rows + 2) / 2;
    this.particles.emitVictory(centerX, centerZ);
  }

  emitGameOver(): void {
    const centerX = (this.cols + 2) / 2;
    const centerZ = (this.rows + 2) / 2;
    this.particles.emitGameOver(centerX, centerZ);
  }

  clearParticles(): void {
    this.particles.clear();
  }

  render(deltaTime: number): void {
    if (!this.device || !this.context || !this.depthTexture) return;

    this.time += deltaTime * 0.001;
    this.particles.update(deltaTime);

    // Emit ambient particles occasionally
    const centerX = (this.cols + 2) / 2;
    const centerZ = (this.rows + 2) / 2;
    this.particles.emitAmbient(centerX, centerZ, this.cols, this.rows);

    // Update uniforms
    this.updateUniforms();

    // Update particle buffer
    this.updateParticleBuffer();

    // Update hint buffer
    this.updateHintBuffer();

    const commandEncoder = this.device.createCommandEncoder();
    const textureView = this.context.getCurrentTexture().createView();

    const renderPass = commandEncoder.beginRenderPass({
      colorAttachments: [{
        view: textureView,
        clearValue: { r: 0.02, g: 0.03, b: 0.03, a: 1.0 },
        loadOp: 'clear',
        storeOp: 'store',
      }],
      depthStencilAttachment: {
        view: this.depthTexture.createView(),
        depthClearValue: 1.0,
        depthLoadOp: 'clear',
        depthStoreOp: 'store',
      },
    });

    // Background
    if (this.backgroundPipeline && this.quadBuffer) {
      renderPass.setPipeline(this.backgroundPipeline);
      renderPass.setBindGroup(0, this.backgroundBindGroup!);
      renderPass.setVertexBuffer(0, this.quadBuffer);
      renderPass.draw(6);
    }

    // Board
    if (this.boardPipeline && this.boardBuffer) {
      renderPass.setPipeline(this.boardPipeline);
      renderPass.setBindGroup(0, this.boardBindGroup!);
      renderPass.setVertexBuffer(0, this.boardBuffer);
      renderPass.draw(4);
    }

    // Tiles
    if (this.tilePipeline && this.tileBuffer) {
      renderPass.setPipeline(this.tilePipeline);
      renderPass.setBindGroup(0, this.tileBindGroup!);
      renderPass.setVertexBuffer(0, this.tileBuffer, 0, 24 * 24 * 4);
      renderPass.setIndexBuffer(this.tileBuffer, 'uint32', 24 * 24 * 4);

      // Draw visible tiles
      const tileCount = Math.min(this.maxTiles, this.rows * this.cols);
      renderPass.drawIndexed(36, tileCount);
    }

    // Path
    if (this.pathPipeline && this.pathBuffer && this.pathVertexCount > 0) {
      renderPass.setPipeline(this.pathPipeline);
      renderPass.setBindGroup(0, this.pathBindGroup!);
      renderPass.setVertexBuffer(0, this.pathBuffer);
      for (let i = 0; i < (this.currentPath.length - 1); i++) {
        renderPass.draw(4, 1, i * 4);
      }
    }

    // Hints
    if (this.hintPipeline && this.hintPlaneBuffer && this.hintPositions.length > 0) {
      renderPass.setPipeline(this.hintPipeline);
      renderPass.setBindGroup(0, this.hintBindGroup!);
      renderPass.setVertexBuffer(0, this.hintPlaneBuffer);
      renderPass.draw(4, this.hintPositions.length);
    }

    // Timer
    if (this.timerPipeline && this.timerBuffer) {
      renderPass.setPipeline(this.timerPipeline);
      renderPass.setBindGroup(0, this.timerBindGroup!);
      renderPass.setVertexBuffer(0, this.timerBuffer);
      renderPass.draw(4);
    }

    // Particles
    const particleCount = this.particles.getCount();
    if (this.particlePipeline && this.particleQuadBuffer && particleCount > 0) {
      renderPass.setPipeline(this.particlePipeline);
      renderPass.setBindGroup(0, this.particleBindGroup!);
      renderPass.setVertexBuffer(0, this.particleQuadBuffer);
      renderPass.draw(6, particleCount);
    }

    renderPass.end();

    this.device.queue.submit([commandEncoder.finish()]);
  }

  private updateUniforms(): void {
    if (!this.device) return;

    // Background uniforms
    const bgUniforms = new Float32Array([
      this.canvas.width, this.canvas.height, this.time, 0,
    ]);
    this.device.queue.writeBuffer(this.backgroundUniformBuffer!, 0, bgUniforms);

    // Board uniforms
    const boardUniforms = new Float32Array(20);
    boardUniforms.set(this.viewProjMatrix, 0);
    boardUniforms[16] = this.time;
    boardUniforms[17] = this.rows;
    boardUniforms[18] = this.cols;
    this.device.queue.writeBuffer(this.boardUniformBuffer!, 0, boardUniforms);

    // Tile uniforms
    const tileUniforms = new Float32Array(20);
    tileUniforms.set(this.viewProjMatrix, 0);
    tileUniforms[16] = this.time;
    this.device.queue.writeBuffer(this.tileUniformBuffer!, 0, tileUniforms);

    // Path uniforms
    const pathUniforms = new Float32Array(20);
    pathUniforms.set(this.viewProjMatrix, 0);
    pathUniforms[16] = this.time;
    pathUniforms[17] = this.currentPath.length;
    this.device.queue.writeBuffer(this.pathUniformBuffer!, 0, pathUniforms);

    // Particle uniforms
    const particleUniforms = new Float32Array(20);
    particleUniforms.set(this.viewProjMatrix, 0);
    particleUniforms[16] = this.time;
    this.device.queue.writeBuffer(this.particleUniformBuffer!, 0, particleUniforms);

    // Timer uniforms (use orthographic for 2D overlay)
    const timerView = mat4.create();
    mat4.identity(timerView);
    const boardWidth = this.cols + 2;
    mat4.translate(timerView, timerView, [0.5, 0.01, -0.3]);
    mat4.scale(timerView, timerView, [boardWidth - 1, 1, 1]);

    const timerViewProj = mat4.create();
    mat4.multiply(timerViewProj, this.viewProjMatrix, timerView);

    const timerUniforms = new Float32Array(20);
    timerUniforms.set(timerViewProj, 0);
    timerUniforms[16] = this.time;
    timerUniforms[17] = this.timeProgress;
    this.device.queue.writeBuffer(this.timerUniformBuffer!, 0, timerUniforms);

    // Hint uniforms
    const hintUniforms = new Float32Array(20);
    hintUniforms.set(this.viewProjMatrix, 0);
    hintUniforms[16] = this.time;
    this.device.queue.writeBuffer(this.hintUniformBuffer!, 0, hintUniforms);
  }

  private updateParticleBuffer(): void {
    if (!this.device) return;

    const particleList = this.particles.getParticles();
    if (particleList.length === 0) return;

    const data = new Float32Array(particleList.length * 12);

    particleList.forEach((p, i) => {
      const offset = i * 12;
      data[offset] = p.x;
      data[offset + 1] = p.y;
      data[offset + 2] = p.z;
      data[offset + 3] = p.life;
      data[offset + 4] = p.vx;
      data[offset + 5] = p.vy;
      data[offset + 6] = p.vz;
      data[offset + 7] = p.size;
      data[offset + 8] = p.color[0];
      data[offset + 9] = p.color[1];
      data[offset + 10] = p.color[2];
      data[offset + 11] = p.color[3];
    });

    this.device.queue.writeBuffer(this.particleDataBuffer!, 0, data);
  }

  private updateHintBuffer(): void {
    if (!this.device || this.hintPositions.length === 0) return;

    const data = new Float32Array(this.hintPositions.length * 8);

    this.hintPositions.forEach((pos, i) => {
      const offset = i * 8;
      data[offset] = pos.x;
      data[offset + 1] = 0.35;
      data[offset + 2] = pos.z;
      data[offset + 3] = 0;
      data[offset + 4] = 1.2;
      data[offset + 5] = 1.0;
      data[offset + 6] = 1.2;
      data[offset + 7] = 0;
    });

    this.device.queue.writeBuffer(this.hintDataBuffer!, 0, data);
  }

  destroy(): void {
    this.quadBuffer?.destroy();
    this.boardBuffer?.destroy();
    this.tileBuffer?.destroy();
    this.tileInstanceBuffer?.destroy();
    this.pathBuffer?.destroy();
    this.particleQuadBuffer?.destroy();
    this.particleDataBuffer?.destroy();
    this.timerBuffer?.destroy();
    this.hintPlaneBuffer?.destroy();
    this.hintDataBuffer?.destroy();
    this.backgroundUniformBuffer?.destroy();
    this.boardUniformBuffer?.destroy();
    this.tileUniformBuffer?.destroy();
    this.pathUniformBuffer?.destroy();
    this.particleUniformBuffer?.destroy();
    this.timerUniformBuffer?.destroy();
    this.hintUniformBuffer?.destroy();
    this.depthTexture?.destroy();
  }
}
