/**
 * WebGPU Renderer - Tower of Hanoi
 * Arcane Dimensional Theme
 * Game #024
 */

import {
  backgroundShader,
  poleShader,
  diskShader,
  baseShader,
  particleShader,
  victoryShader,
} from './shaders';
import { ParticleSystem, type Particle } from './particles';
import { hexToRgb } from './math';

export interface PoleData {
  x: number;
  y: number;
  width: number;
  height: number;
  selected: boolean;
}

export interface DiskData {
  x: number;
  y: number;
  width: number;
  height: number;
  color: [number, number, number];
  selected: boolean;
  size: number;
  animProgress: number;
}

export interface BaseData {
  x: number;
  y: number;
  width: number;
  height: number;
}

export class WebGPURenderer {
  private canvas: HTMLCanvasElement;
  private device: GPUDevice | null = null;
  private context: GPUCanvasContext | null = null;
  private format: GPUTextureFormat = 'bgra8unorm';

  // Pipelines
  private backgroundPipeline: GPURenderPipeline | null = null;
  private polePipeline: GPURenderPipeline | null = null;
  private diskPipeline: GPURenderPipeline | null = null;
  private basePipeline: GPURenderPipeline | null = null;
  private particlePipeline: GPURenderPipeline | null = null;
  private victoryPipeline: GPURenderPipeline | null = null;

  // Buffers
  private backgroundUniformBuffer: GPUBuffer | null = null;
  private poleUniformBuffer: GPUBuffer | null = null;
  private poleStorageBuffer: GPUBuffer | null = null;
  private diskUniformBuffer: GPUBuffer | null = null;
  private diskStorageBuffer: GPUBuffer | null = null;
  private baseUniformBuffer: GPUBuffer | null = null;
  private baseStorageBuffer: GPUBuffer | null = null;
  private particleUniformBuffer: GPUBuffer | null = null;
  private particleStorageBuffer: GPUBuffer | null = null;
  private victoryUniformBuffer: GPUBuffer | null = null;

  // Bind Groups
  private backgroundBindGroup: GPUBindGroup | null = null;
  private poleBindGroup: GPUBindGroup | null = null;
  private diskBindGroup: GPUBindGroup | null = null;
  private baseBindGroup: GPUBindGroup | null = null;
  private particleBindGroup: GPUBindGroup | null = null;
  private victoryBindGroup: GPUBindGroup | null = null;

  // State
  private time = 0;
  private poles: PoleData[] = [];
  private disks: DiskData[] = [];
  private bases: BaseData[] = [];
  private poleCount = 0;
  private diskCount = 0;
  private baseCount = 0;
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

    // Pole pipeline
    const poleModule = this.device.createShaderModule({ code: poleShader });
    this.polePipeline = this.device.createRenderPipeline({
      layout: 'auto',
      vertex: { module: poleModule, entryPoint: 'vertexMain' },
      fragment: {
        module: poleModule,
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

    // Disk pipeline
    const diskModule = this.device.createShaderModule({ code: diskShader });
    this.diskPipeline = this.device.createRenderPipeline({
      layout: 'auto',
      vertex: { module: diskModule, entryPoint: 'vertexMain' },
      fragment: {
        module: diskModule,
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

    // Base pipeline
    const baseModule = this.device.createShaderModule({ code: baseShader });
    this.basePipeline = this.device.createRenderPipeline({
      layout: 'auto',
      vertex: { module: baseModule, entryPoint: 'vertexMain' },
      fragment: {
        module: baseModule,
        entryPoint: 'fragmentMain',
        targets: [{ format: this.format }],
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

    // Pole buffers
    this.poleUniformBuffer = this.device.createBuffer({
      size: 16,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    this.poleStorageBuffer = this.device.createBuffer({
      size: 3 * 32, // 3 poles max
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });

    // Disk buffers
    this.diskUniformBuffer = this.device.createBuffer({
      size: 16,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    this.diskStorageBuffer = this.device.createBuffer({
      size: 10 * 48, // 10 disks max
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });

    // Base buffers
    this.baseUniformBuffer = this.device.createBuffer({
      size: 16,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    this.baseStorageBuffer = this.device.createBuffer({
      size: 3 * 16, // 3 bases
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });

    // Particle buffers
    this.particleUniformBuffer = this.device.createBuffer({
      size: 16,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

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

    this.poleBindGroup = this.device.createBindGroup({
      layout: this.polePipeline!.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: this.poleUniformBuffer! } },
        { binding: 1, resource: { buffer: this.poleStorageBuffer! } },
      ],
    });

    this.diskBindGroup = this.device.createBindGroup({
      layout: this.diskPipeline!.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: this.diskUniformBuffer! } },
        { binding: 1, resource: { buffer: this.diskStorageBuffer! } },
      ],
    });

    this.baseBindGroup = this.device.createBindGroup({
      layout: this.basePipeline!.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: this.baseUniformBuffer! } },
        { binding: 1, resource: { buffer: this.baseStorageBuffer! } },
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

  updatePoles(poles: PoleData[]): void {
    this.poles = poles;
    this.poleCount = poles.length;

    if (!this.device || !this.poleStorageBuffer || poles.length === 0) return;

    const data = new Float32Array(poles.length * 8);
    poles.forEach((pole, i) => {
      const offset = i * 8;
      data[offset + 0] = pole.x;
      data[offset + 1] = pole.y;
      data[offset + 2] = pole.width;
      data[offset + 3] = pole.height;
      data[offset + 4] = pole.selected ? 1.0 : 0.0;
      data[offset + 5] = 0;
      data[offset + 6] = 0;
      data[offset + 7] = 0;
    });

    this.device.queue.writeBuffer(this.poleStorageBuffer, 0, data);
  }

  updateDisks(disks: DiskData[]): void {
    this.disks = disks;
    this.diskCount = disks.length;

    if (!this.device || !this.diskStorageBuffer || disks.length === 0) return;

    const data = new Float32Array(disks.length * 12);
    disks.forEach((disk, i) => {
      const offset = i * 12;
      data[offset + 0] = disk.x;
      data[offset + 1] = disk.y;
      data[offset + 2] = disk.width;
      data[offset + 3] = disk.height;
      data[offset + 4] = disk.color[0];
      data[offset + 5] = disk.color[1];
      data[offset + 6] = disk.color[2];
      data[offset + 7] = disk.selected ? 1.0 : 0.0;
      data[offset + 8] = disk.size;
      data[offset + 9] = disk.animProgress;
      data[offset + 10] = 0;
      data[offset + 11] = 0;
    });

    this.device.queue.writeBuffer(this.diskStorageBuffer, 0, data);
  }

  updateBases(bases: BaseData[]): void {
    this.bases = bases;
    this.baseCount = bases.length;

    if (!this.device || !this.baseStorageBuffer || bases.length === 0) return;

    const data = new Float32Array(bases.length * 4);
    bases.forEach((base, i) => {
      const offset = i * 4;
      data[offset + 0] = base.x;
      data[offset + 1] = base.y;
      data[offset + 2] = base.width;
      data[offset + 3] = base.height;
    });

    this.device.queue.writeBuffer(this.baseStorageBuffer, 0, data);
  }

  setVictory(progress: number): void {
    this.victoryProgress = progress;
  }

  // Particle effects
  emitPickup(x: number, y: number, hexColor: string): void {
    const rgb = hexToRgb(hexColor);
    this.particleSystem.emitPickup(x, y, rgb);
  }

  emitDrop(x: number, y: number, hexColor: string): void {
    const rgb = hexToRgb(hexColor);
    this.particleSystem.emitDrop(x, y, rgb);
  }

  emitTrail(x: number, y: number): void {
    this.particleSystem.emitTrail(x, y);
  }

  emitComplete(centerX: number, centerY: number): void {
    this.particleSystem.emitComplete(centerX, centerY);
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
        clearValue: { r: 0.04, g: 0.02, b: 0.08, a: 1.0 },
        loadOp: 'clear',
        storeOp: 'store',
      }],
    });

    // 1. Background
    renderPass.setPipeline(this.backgroundPipeline!);
    renderPass.setBindGroup(0, this.backgroundBindGroup!);
    renderPass.draw(6);

    // 2. Bases
    if (this.baseCount > 0) {
      renderPass.setPipeline(this.basePipeline!);
      renderPass.setBindGroup(0, this.baseBindGroup!);
      renderPass.draw(6, this.baseCount);
    }

    // 3. Poles
    if (this.poleCount > 0) {
      renderPass.setPipeline(this.polePipeline!);
      renderPass.setBindGroup(0, this.poleBindGroup!);
      renderPass.draw(6, this.poleCount);
    }

    // 4. Disks
    if (this.diskCount > 0) {
      renderPass.setPipeline(this.diskPipeline!);
      renderPass.setBindGroup(0, this.diskBindGroup!);
      renderPass.draw(6, this.diskCount);
    }

    // 5. Particles
    const particles = this.particleSystem.getParticles();
    if (particles.length > 0) {
      this.updateParticleBuffer(particles);
      renderPass.setPipeline(this.particlePipeline!);
      renderPass.setBindGroup(0, this.particleBindGroup!);
      renderPass.draw(6, particles.length);
    }

    // 6. Victory effect
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
      new Float32Array([this.time, aspectRatio, 0, 0])
    );

    this.device.queue.writeBuffer(
      this.poleUniformBuffer!,
      0,
      new Float32Array([this.time, this.poleCount, w, h])
    );

    this.device.queue.writeBuffer(
      this.diskUniformBuffer!,
      0,
      new Float32Array([this.time, this.diskCount, w, h])
    );

    this.device.queue.writeBuffer(
      this.baseUniformBuffer!,
      0,
      new Float32Array([this.time, aspectRatio, 0, 0])
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
      'pickup': 0,
      'drop': 1,
      'trail': 2,
      'complete': 3,
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
    this.poleUniformBuffer?.destroy();
    this.poleStorageBuffer?.destroy();
    this.diskUniformBuffer?.destroy();
    this.diskStorageBuffer?.destroy();
    this.baseUniformBuffer?.destroy();
    this.baseStorageBuffer?.destroy();
    this.particleUniformBuffer?.destroy();
    this.particleStorageBuffer?.destroy();
    this.victoryUniformBuffer?.destroy();
  }
}
