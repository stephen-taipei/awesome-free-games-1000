/**
 * WebGPU Renderer - Sliding Puzzle
 * Data Fragment Theme
 * Game #017
 */

import {
  backgroundShader,
  tileShader,
  particleShader,
  victoryShader,
} from './shaders';
import { ParticleSystem, type Particle } from './particles';

export interface TileData {
  x: number;
  y: number;
  width: number;
  height: number;
  value: number;
  slideProgress: number;
  fromX: number;
  fromY: number;
}

export class WebGPURenderer {
  private canvas: HTMLCanvasElement;
  private device: GPUDevice | null = null;
  private context: GPUCanvasContext | null = null;
  private format: GPUTextureFormat = 'bgra8unorm';

  // Pipelines
  private backgroundPipeline: GPURenderPipeline | null = null;
  private tilePipeline: GPURenderPipeline | null = null;
  private particlePipeline: GPURenderPipeline | null = null;
  private victoryPipeline: GPURenderPipeline | null = null;

  // Buffers
  private backgroundUniformBuffer: GPUBuffer | null = null;
  private tileUniformBuffer: GPUBuffer | null = null;
  private tileStorageBuffer: GPUBuffer | null = null;
  private particleUniformBuffer: GPUBuffer | null = null;
  private particleStorageBuffer: GPUBuffer | null = null;
  private victoryUniformBuffer: GPUBuffer | null = null;

  // Bind Groups
  private backgroundBindGroup: GPUBindGroup | null = null;
  private tileBindGroup: GPUBindGroup | null = null;
  private particleBindGroup: GPUBindGroup | null = null;
  private victoryBindGroup: GPUBindGroup | null = null;

  // State
  private time = 0;
  private tiles: TileData[] = [];
  private tileCount = 0;
  private particleSystem: ParticleSystem;
  private victoryProgress = 0;
  private victoryCenterX = 0.5;
  private victoryCenterY = 0.5;
  private gridSize = 4;

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

    // Tile pipeline
    const tileModule = this.device.createShaderModule({ code: tileShader });
    this.tilePipeline = this.device.createRenderPipeline({
      layout: 'auto',
      vertex: { module: tileModule, entryPoint: 'vertexMain' },
      fragment: {
        module: tileModule,
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
      size: 16,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    // Tile uniform buffer
    this.tileUniformBuffer = this.device.createBuffer({
      size: 16,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    // Tile storage buffer (max 16 tiles * 8 floats each)
    this.tileStorageBuffer = this.device.createBuffer({
      size: 16 * 32,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });

    // Particle uniform buffer
    this.particleUniformBuffer = this.device.createBuffer({
      size: 16,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    // Particle storage buffer
    this.particleStorageBuffer = this.device.createBuffer({
      size: 500 * 48,
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

    // Tile bind group
    this.tileBindGroup = this.device.createBindGroup({
      layout: this.tilePipeline!.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: this.tileUniformBuffer! } },
        { binding: 1, resource: { buffer: this.tileStorageBuffer! } },
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

  setGridSize(size: number): void {
    this.gridSize = size;
  }

  updateTiles(tiles: TileData[]): void {
    this.tiles = tiles;
    this.tileCount = tiles.length;

    if (!this.device || !this.tileStorageBuffer || tiles.length === 0) return;

    // Pack tile data: x, y, width, height, value, slideProgress, fromX, fromY
    const data = new Float32Array(tiles.length * 8);

    tiles.forEach((tile, i) => {
      const offset = i * 8;
      data[offset + 0] = tile.x;
      data[offset + 1] = tile.y;
      data[offset + 2] = tile.width;
      data[offset + 3] = tile.height;
      data[offset + 4] = tile.value;
      data[offset + 5] = tile.slideProgress;
      data[offset + 6] = tile.fromX;
      data[offset + 7] = tile.fromY;
    });

    this.device.queue.writeBuffer(this.tileStorageBuffer, 0, data);
  }

  // Particle effects
  emitSlide(fromX: number, fromY: number, toX: number, toY: number): void {
    this.particleSystem.emitSlide(fromX, fromY, toX, toY);
  }

  emitShuffle(): void {
    this.particleSystem.emitShuffle(0.5, 0.5);
  }

  emitComplete(): void {
    this.particleSystem.emitComplete(0.5, 0.5);
  }

  emitTrail(x: number, y: number, vx: number, vy: number): void {
    this.particleSystem.emitTrail(x, y, vx, vy);
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
        clearValue: { r: 0.02, g: 0.03, b: 0.08, a: 1.0 },
        loadOp: 'clear',
        storeOp: 'store',
      }],
    });

    // 1. Background
    renderPass.setPipeline(this.backgroundPipeline!);
    renderPass.setBindGroup(0, this.backgroundBindGroup!);
    renderPass.draw(6);

    // 2. Tiles
    if (this.tileCount > 0) {
      renderPass.setPipeline(this.tilePipeline!);
      renderPass.setBindGroup(0, this.tileBindGroup!);
      renderPass.draw(6, this.tileCount);
    }

    // 3. Particles
    const particles = this.particleSystem.getParticles();
    if (particles.length > 0) {
      this.updateParticleBuffer(particles);
      renderPass.setPipeline(this.particlePipeline!);
      renderPass.setBindGroup(0, this.particleBindGroup!);
      renderPass.draw(6, particles.length);
    }

    // 4. Victory effect
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

    // Background uniforms
    this.device.queue.writeBuffer(
      this.backgroundUniformBuffer!,
      0,
      new Float32Array([this.time, aspectRatio, this.gridSize, 0.1])
    );

    // Tile uniforms
    this.device.queue.writeBuffer(
      this.tileUniformBuffer!,
      0,
      new Float32Array([this.time, this.tileCount, w, h])
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
      'slide': 0,
      'shuffle': 1,
      'complete': 2,
      'trail': 3,
      'ambient': 4,
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
    this.tileUniformBuffer?.destroy();
    this.tileStorageBuffer?.destroy();
    this.particleUniformBuffer?.destroy();
    this.particleStorageBuffer?.destroy();
    this.victoryUniformBuffer?.destroy();
  }
}
