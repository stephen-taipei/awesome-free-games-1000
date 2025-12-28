/**
 * WebGPU Renderer - Nonogram
 * Digital Blueprint Theme
 * Game #013
 */

import {
  backgroundShader,
  cellShader,
  gridShader,
  particleShader,
  victoryShader,
} from './shaders';
import { ParticleSystem, type Particle } from './particles';

export interface CellData {
  col: number;
  row: number;
  state: number;     // 0=empty, 1=filled, 2=marked
  highlight: number; // 1.0 for hover
}

export interface HintData {
  x: number;
  y: number;
  value: number;
  completed: number;
}

export class WebGPURenderer {
  private canvas: HTMLCanvasElement;
  private device: GPUDevice | null = null;
  private context: GPUCanvasContext | null = null;
  private format: GPUTextureFormat = 'bgra8unorm';

  // Pipelines
  private backgroundPipeline: GPURenderPipeline | null = null;
  private cellPipeline: GPURenderPipeline | null = null;
  private gridPipeline: GPURenderPipeline | null = null;
  private particlePipeline: GPURenderPipeline | null = null;
  private victoryPipeline: GPURenderPipeline | null = null;

  // Buffers
  private backgroundUniformBuffer: GPUBuffer | null = null;
  private cellUniformBuffer: GPUBuffer | null = null;
  private cellStorageBuffer: GPUBuffer | null = null;
  private gridUniformBuffer: GPUBuffer | null = null;
  private particleUniformBuffer: GPUBuffer | null = null;
  private particleStorageBuffer: GPUBuffer | null = null;
  private victoryUniformBuffer: GPUBuffer | null = null;

  // Bind Groups
  private backgroundBindGroup: GPUBindGroup | null = null;
  private cellBindGroup: GPUBindGroup | null = null;
  private gridBindGroup: GPUBindGroup | null = null;
  private particleBindGroup: GPUBindGroup | null = null;
  private victoryBindGroup: GPUBindGroup | null = null;

  // State
  private time = 0;
  private cells: CellData[] = [];
  private cellCount = 0;
  private particleSystem: ParticleSystem;
  private victoryProgress = 0;
  private victoryCenterX = 0.5;
  private victoryCenterY = 0.5;

  // Grid layout
  private gridOffsetX = 0;
  private gridOffsetY = 0;
  private cellSize = 0;
  private rows = 0;
  private cols = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.particleSystem = new ParticleSystem();
  }

  async init(): Promise<boolean> {
    if (!navigator.gpu) {
      console.warn('WebGPU not supported');
      return false;
    }

    try {
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

      this.createPipelines();
      this.createBuffers();

      return true;
    } catch (e) {
      console.warn('WebGPU init failed:', e);
      return false;
    }
  }

  private createPipelines(): void {
    if (!this.device) return;

    // Background pipeline
    const bgModule = this.device.createShaderModule({ code: backgroundShader });
    this.backgroundPipeline = this.device.createRenderPipeline({
      layout: 'auto',
      vertex: { module: bgModule, entryPoint: 'vertexMain' },
      fragment: {
        module: bgModule,
        entryPoint: 'fragmentMain',
        targets: [{ format: this.format }],
      },
      primitive: { topology: 'triangle-list' },
    });

    // Cell pipeline
    const cellModule = this.device.createShaderModule({ code: cellShader });
    this.cellPipeline = this.device.createRenderPipeline({
      layout: 'auto',
      vertex: { module: cellModule, entryPoint: 'vertexMain' },
      fragment: {
        module: cellModule,
        entryPoint: 'fragmentMain',
        targets: [{
          format: this.format,
          blend: {
            color: { srcFactor: 'src-alpha', dstFactor: 'one-minus-src-alpha', operation: 'add' },
            alpha: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' },
          },
        }],
      },
      primitive: { topology: 'triangle-list' },
    });

    // Grid pipeline
    const gridModule = this.device.createShaderModule({ code: gridShader });
    this.gridPipeline = this.device.createRenderPipeline({
      layout: 'auto',
      vertex: { module: gridModule, entryPoint: 'vertexMain' },
      fragment: {
        module: gridModule,
        entryPoint: 'fragmentMain',
        targets: [{
          format: this.format,
          blend: {
            color: { srcFactor: 'src-alpha', dstFactor: 'one-minus-src-alpha', operation: 'add' },
            alpha: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' },
          },
        }],
      },
      primitive: { topology: 'triangle-list' },
    });

    // Particle pipeline
    const particleModule = this.device.createShaderModule({ code: particleShader });
    this.particlePipeline = this.device.createRenderPipeline({
      layout: 'auto',
      vertex: { module: particleModule, entryPoint: 'vertexMain' },
      fragment: {
        module: particleModule,
        entryPoint: 'fragmentMain',
        targets: [{
          format: this.format,
          blend: {
            color: { srcFactor: 'src-alpha', dstFactor: 'one', operation: 'add' },
            alpha: { srcFactor: 'one', dstFactor: 'one', operation: 'add' },
          },
        }],
      },
      primitive: { topology: 'triangle-list' },
    });

    // Victory pipeline
    const victoryModule = this.device.createShaderModule({ code: victoryShader });
    this.victoryPipeline = this.device.createRenderPipeline({
      layout: 'auto',
      vertex: { module: victoryModule, entryPoint: 'vertexMain' },
      fragment: {
        module: victoryModule,
        entryPoint: 'fragmentMain',
        targets: [{
          format: this.format,
          blend: {
            color: { srcFactor: 'src-alpha', dstFactor: 'one-minus-src-alpha', operation: 'add' },
            alpha: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' },
          },
        }],
      },
      primitive: { topology: 'triangle-list' },
    });
  }

  private createBuffers(): void {
    if (!this.device) return;

    // Background uniform buffer
    this.backgroundUniformBuffer = this.device.createBuffer({
      size: 32,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    // Cell uniform buffer
    this.cellUniformBuffer = this.device.createBuffer({
      size: 16,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    // Cell storage buffer (max 400 cells for 20x20)
    this.cellStorageBuffer = this.device.createBuffer({
      size: 400 * 16, // 4 floats per cell
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });

    // Grid uniform buffer
    this.gridUniformBuffer = this.device.createBuffer({
      size: 32,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    // Particle uniform buffer
    this.particleUniformBuffer = this.device.createBuffer({
      size: 16,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    // Particle storage buffer
    this.particleStorageBuffer = this.device.createBuffer({
      size: 1500 * 48, // 12 floats per particle
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });

    // Victory uniform buffer
    this.victoryUniformBuffer = this.device.createBuffer({
      size: 16,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    this.createBindGroups();
  }

  private createBindGroups(): void {
    if (!this.device) return;

    // Background bind group
    this.backgroundBindGroup = this.device.createBindGroup({
      layout: this.backgroundPipeline!.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: this.backgroundUniformBuffer! } },
      ],
    });

    // Cell bind group
    this.cellBindGroup = this.device.createBindGroup({
      layout: this.cellPipeline!.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: this.cellUniformBuffer! } },
        { binding: 1, resource: { buffer: this.cellStorageBuffer! } },
      ],
    });

    // Grid bind group
    this.gridBindGroup = this.device.createBindGroup({
      layout: this.gridPipeline!.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: this.gridUniformBuffer! } },
      ],
    });

    // Particle bind group
    this.particleBindGroup = this.device.createBindGroup({
      layout: this.particlePipeline!.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: this.particleUniformBuffer! } },
        { binding: 1, resource: { buffer: this.particleStorageBuffer! } },
      ],
    });

    // Victory bind group
    this.victoryBindGroup = this.device.createBindGroup({
      layout: this.victoryPipeline!.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: this.victoryUniformBuffer! } },
      ],
    });
  }

  setGridLayout(
    offsetX: number,
    offsetY: number,
    cellSize: number,
    rows: number,
    cols: number
  ): void {
    this.gridOffsetX = offsetX;
    this.gridOffsetY = offsetY;
    this.cellSize = cellSize;
    this.rows = rows;
    this.cols = cols;
  }

  updateCells(cells: CellData[]): void {
    this.cells = cells;
    this.cellCount = cells.length;

    if (!this.device || !this.cellStorageBuffer || cells.length === 0) return;

    const data = new Float32Array(cells.length * 4);
    cells.forEach((cell, i) => {
      data[i * 4 + 0] = cell.col;
      data[i * 4 + 1] = cell.row;
      data[i * 4 + 2] = cell.state;
      data[i * 4 + 3] = cell.highlight;
    });

    this.device.queue.writeBuffer(this.cellStorageBuffer, 0, data);
  }

  // Particle effects
  emitFill(x: number, y: number): void {
    this.particleSystem.emitFill(x, y);
  }

  emitMark(x: number, y: number): void {
    this.particleSystem.emitMark(x, y);
  }

  emitClear(x: number, y: number): void {
    this.particleSystem.emitClear(x, y);
  }

  emitComplete(centerX: number, centerY: number): void {
    this.particleSystem.emitComplete(centerX, centerY);
  }

  emitError(centerX: number, centerY: number): void {
    this.particleSystem.emitError(centerX, centerY);
  }

  emitHintComplete(x: number, y: number): void {
    this.particleSystem.emitHintComplete(x, y);
  }

  setVictory(progress: number, centerX: number, centerY: number): void {
    this.victoryProgress = progress;
    this.victoryCenterX = centerX;
    this.victoryCenterY = centerY;
  }

  clearParticles(): void {
    this.particleSystem.clear();
  }

  render(deltaTime: number): void {
    if (!this.device || !this.context) return;

    this.time += deltaTime * 0.001;

    // Update particles
    this.particleSystem.update(deltaTime);
    this.particleSystem.emitAmbient();

    // Update buffers
    this.updateBuffers();

    // Render
    const encoder = this.device.createCommandEncoder();
    const textureView = this.context.getCurrentTexture().createView();

    const renderPass = encoder.beginRenderPass({
      colorAttachments: [{
        view: textureView,
        clearValue: { r: 0.01, g: 0.03, b: 0.08, a: 1.0 },
        loadOp: 'clear',
        storeOp: 'store',
      }],
    });

    // 1. Background
    renderPass.setPipeline(this.backgroundPipeline!);
    renderPass.setBindGroup(0, this.backgroundBindGroup!);
    renderPass.draw(6);

    // 2. Cells
    if (this.cellCount > 0) {
      renderPass.setPipeline(this.cellPipeline!);
      renderPass.setBindGroup(0, this.cellBindGroup!);
      renderPass.draw(6, this.cellCount);
    }

    // 3. Grid lines
    if (this.rows > 0 && this.cols > 0) {
      renderPass.setPipeline(this.gridPipeline!);
      renderPass.setBindGroup(0, this.gridBindGroup!);
      renderPass.draw(6);
    }

    // 4. Particles
    const particles = this.particleSystem.getParticles();
    if (particles.length > 0) {
      this.updateParticleBuffer(particles);
      renderPass.setPipeline(this.particlePipeline!);
      renderPass.setBindGroup(0, this.particleBindGroup!);
      renderPass.draw(6, particles.length);
    }

    // 5. Victory effect
    if (this.victoryProgress > 0) {
      renderPass.setPipeline(this.victoryPipeline!);
      renderPass.setBindGroup(0, this.victoryBindGroup!);
      renderPass.draw(6);
    }

    renderPass.end();
    this.device.queue.submit([encoder.finish()]);
  }

  private updateBuffers(): void {
    if (!this.device) return;

    const w = this.canvas.width;
    const h = this.canvas.height;
    const aspectRatio = w / h;

    // Normalized coordinates (0-1)
    const normOffsetX = this.gridOffsetX / w;
    const normOffsetY = this.gridOffsetY / h;
    const normCellSize = this.cellSize / w;

    // Background uniforms
    this.device.queue.writeBuffer(
      this.backgroundUniformBuffer!,
      0,
      new Float32Array([
        this.time,
        aspectRatio,
        normOffsetX,
        normOffsetY,
        this.cols * normCellSize,
        this.rows * normCellSize,
        0, 0, // padding
      ])
    );

    // Cell uniforms
    this.device.queue.writeBuffer(
      this.cellUniformBuffer!,
      0,
      new Float32Array([this.time, normCellSize, normOffsetX, normOffsetY])
    );

    // Grid uniforms
    this.device.queue.writeBuffer(
      this.gridUniformBuffer!,
      0,
      new Float32Array([
        this.time,
        normCellSize,
        normOffsetX,
        normOffsetY,
        this.rows,
        this.cols,
        0, 0, // padding
      ])
    );

    // Particle uniforms
    this.device.queue.writeBuffer(
      this.particleUniformBuffer!,
      0,
      new Float32Array([this.time, aspectRatio, 0, 0])
    );

    // Victory uniforms
    this.device.queue.writeBuffer(
      this.victoryUniformBuffer!,
      0,
      new Float32Array([this.time, this.victoryProgress, this.victoryCenterX, this.victoryCenterY])
    );
  }

  private updateParticleBuffer(particles: Particle[]): void {
    if (!this.device || !this.particleStorageBuffer) return;

    const data = new Float32Array(particles.length * 12);
    const typeMap: Record<string, number> = {
      'fill': 0,
      'mark': 1,
      'complete': 2,
      'error': 3,
    };

    particles.forEach((p, i) => {
      data[i * 12 + 0] = p.x;
      data[i * 12 + 1] = p.y;
      data[i * 12 + 2] = p.vx;
      data[i * 12 + 3] = p.vy;
      data[i * 12 + 4] = p.life;
      data[i * 12 + 5] = p.maxLife;
      data[i * 12 + 6] = p.size;
      data[i * 12 + 7] = typeMap[p.type] ?? 0;
      data[i * 12 + 8] = p.color[0];
      data[i * 12 + 9] = p.color[1];
      data[i * 12 + 10] = p.color[2];
      data[i * 12 + 11] = p.color[3];
    });

    this.device.queue.writeBuffer(this.particleStorageBuffer, 0, data);
  }

  destroy(): void {
    this.backgroundUniformBuffer?.destroy();
    this.cellUniformBuffer?.destroy();
    this.cellStorageBuffer?.destroy();
    this.gridUniformBuffer?.destroy();
    this.particleUniformBuffer?.destroy();
    this.particleStorageBuffer?.destroy();
    this.victoryUniformBuffer?.destroy();
  }
}
