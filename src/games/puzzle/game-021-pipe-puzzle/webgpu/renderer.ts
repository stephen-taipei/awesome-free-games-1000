/**
 * WebGPU Renderer - Pipe Puzzle
 * Energy Conduit Theme
 * Game #021
 */

import {
  backgroundShader,
  pipeShader,
  particleShader,
  victoryShader,
} from './shaders';
import { ParticleSystem, type Particle } from './particles';

export interface PipeCellData {
  x: number;
  y: number;
  width: number;
  height: number;
  pipeType: number;  // 0=empty, 1=straight, 2=elbow, 3=t, 4=cross, 5=start, 6=end
  rotation: number;
  active: boolean;
  rotateAnim: number;
}

export class WebGPURenderer {
  private canvas: HTMLCanvasElement;
  private device: GPUDevice | null = null;
  private context: GPUCanvasContext | null = null;
  private format: GPUTextureFormat = 'bgra8unorm';

  // Pipelines
  private backgroundPipeline: GPURenderPipeline | null = null;
  private pipePipeline: GPURenderPipeline | null = null;
  private particlePipeline: GPURenderPipeline | null = null;
  private victoryPipeline: GPURenderPipeline | null = null;

  // Buffers
  private backgroundUniformBuffer: GPUBuffer | null = null;
  private pipeUniformBuffer: GPUBuffer | null = null;
  private pipeStorageBuffer: GPUBuffer | null = null;
  private particleUniformBuffer: GPUBuffer | null = null;
  private particleStorageBuffer: GPUBuffer | null = null;
  private victoryUniformBuffer: GPUBuffer | null = null;

  // Bind Groups
  private backgroundBindGroup: GPUBindGroup | null = null;
  private pipeBindGroup: GPUBindGroup | null = null;
  private particleBindGroup: GPUBindGroup | null = null;
  private victoryBindGroup: GPUBindGroup | null = null;

  // State
  private time = 0;
  private pipes: PipeCellData[] = [];
  private pipeCount = 0;
  private gridCols = 6;
  private gridRows = 6;
  private particleSystem: ParticleSystem;
  private victoryProgress = 0;

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

    // Pipe pipeline
    const pipeModule = this.device.createShaderModule({ code: pipeShader });
    this.pipePipeline = this.device.createRenderPipeline({
      layout: 'auto',
      vertex: { module: pipeModule, entryPoint: 'vertexMain' },
      fragment: {
        module: pipeModule,
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

    // Pipe uniform buffer
    this.pipeUniformBuffer = this.device.createBuffer({
      size: 16,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    // Pipe storage buffer (max 100 cells * 8 floats each)
    this.pipeStorageBuffer = this.device.createBuffer({
      size: 100 * 32,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });

    // Particle uniform buffer
    this.particleUniformBuffer = this.device.createBuffer({
      size: 16,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    // Particle storage buffer
    this.particleStorageBuffer = this.device.createBuffer({
      size: 300 * 48,
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

    this.backgroundBindGroup = this.device.createBindGroup({
      layout: this.backgroundPipeline!.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: this.backgroundUniformBuffer! } },
      ],
    });

    this.pipeBindGroup = this.device.createBindGroup({
      layout: this.pipePipeline!.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: this.pipeUniformBuffer! } },
        { binding: 1, resource: { buffer: this.pipeStorageBuffer! } },
      ],
    });

    this.particleBindGroup = this.device.createBindGroup({
      layout: this.particlePipeline!.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: this.particleUniformBuffer! } },
        { binding: 1, resource: { buffer: this.particleStorageBuffer! } },
      ],
    });

    this.victoryBindGroup = this.device.createBindGroup({
      layout: this.victoryPipeline!.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: this.victoryUniformBuffer! } },
      ],
    });
  }

  setGrid(cols: number, rows: number): void {
    this.gridCols = cols;
    this.gridRows = rows;
  }

  updatePipes(pipes: PipeCellData[]): void {
    this.pipes = pipes;
    this.pipeCount = pipes.length;

    if (!this.device || !this.pipeStorageBuffer || pipes.length === 0) return;

    const data = new Float32Array(pipes.length * 8);

    pipes.forEach((pipe, i) => {
      const offset = i * 8;
      data[offset + 0] = pipe.x;
      data[offset + 1] = pipe.y;
      data[offset + 2] = pipe.width;
      data[offset + 3] = pipe.height;
      data[offset + 4] = pipe.pipeType;
      data[offset + 5] = pipe.rotation;
      data[offset + 6] = pipe.active ? 1.0 : 0.0;
      data[offset + 7] = pipe.rotateAnim;
    });

    this.device.queue.writeBuffer(this.pipeStorageBuffer, 0, data);
  }

  setVictory(progress: number): void {
    this.victoryProgress = progress;
  }

  // Particle effects
  emitRotate(x: number, y: number): void {
    this.particleSystem.emitRotate(x, y);
  }

  emitConnect(x: number, y: number): void {
    this.particleSystem.emitConnect(x, y);
  }

  emitComplete(x: number, y: number): void {
    this.particleSystem.emitComplete(x, y);
  }

  emitFlow(fromX: number, fromY: number, toX: number, toY: number): void {
    this.particleSystem.emitFlow(fromX, fromY, toX, toY);
  }

  clearParticles(): void {
    this.particleSystem.clear();
  }

  render(deltaTime: number): void {
    if (!this.device || !this.context) return;

    this.time += deltaTime * 0.001;

    this.particleSystem.update(deltaTime);
    this.particleSystem.emitAmbient();

    this.updateBuffers();

    const encoder = this.device.createCommandEncoder();
    const textureView = this.context.getCurrentTexture().createView();

    const renderPass = encoder.beginRenderPass({
      colorAttachments: [{
        view: textureView,
        clearValue: { r: 0.02, g: 0.04, b: 0.06, a: 1.0 },
        loadOp: 'clear',
        storeOp: 'store',
      }],
    });

    // 1. Background
    renderPass.setPipeline(this.backgroundPipeline!);
    renderPass.setBindGroup(0, this.backgroundBindGroup!);
    renderPass.draw(6);

    // 2. Pipes
    if (this.pipeCount > 0) {
      renderPass.setPipeline(this.pipePipeline!);
      renderPass.setBindGroup(0, this.pipeBindGroup!);
      renderPass.draw(6, this.pipeCount);
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

    this.device.queue.writeBuffer(
      this.backgroundUniformBuffer!,
      0,
      new Float32Array([this.time, aspectRatio, this.gridCols, this.gridRows])
    );

    this.device.queue.writeBuffer(
      this.pipeUniformBuffer!,
      0,
      new Float32Array([this.time, this.pipeCount, w, h])
    );

    this.device.queue.writeBuffer(
      this.particleUniformBuffer!,
      0,
      new Float32Array([this.time, aspectRatio, 0, 0])
    );

    this.device.queue.writeBuffer(
      this.victoryUniformBuffer!,
      0,
      new Float32Array([this.time, this.victoryProgress, 0.5, 0.5])
    );
  }

  private updateParticleBuffer(particles: Particle[]): void {
    if (!this.device || !this.particleStorageBuffer) return;

    const data = new Float32Array(particles.length * 12);
    const typeMap: Record<string, number> = {
      'rotate': 0,
      'connect': 1,
      'complete': 2,
      'flow': 3,
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
    this.pipeUniformBuffer?.destroy();
    this.pipeStorageBuffer?.destroy();
    this.particleUniformBuffer?.destroy();
    this.particleStorageBuffer?.destroy();
    this.victoryUniformBuffer?.destroy();
  }
}
