/**
 * WebGPU Renderer - Path Finder
 * Neon Circuit / Electronic Data Flow Theme
 * Game #050
 */

import { backgroundShader, particleShader, victoryShader } from './shaders';
import { ParticleSystem } from './particles';

export class WebGPURenderer {
  private canvas: HTMLCanvasElement;
  private context: GPUCanvasContext | null = null;
  private device: GPUDevice | null = null;
  private format: GPUTextureFormat = 'bgra8unorm';

  // Pipelines
  private bgPipeline: GPURenderPipeline | null = null;
  private particlePipeline: GPURenderPipeline | null = null;
  private victoryPipeline: GPURenderPipeline | null = null;

  // Buffers
  private bgUniformBuffer: GPUBuffer | null = null;
  private particleUniformBuffer: GPUBuffer | null = null;
  private particleStorageBuffer: GPUBuffer | null = null;
  private victoryUniformBuffer: GPUBuffer | null = null;

  // Bind groups
  private bgBindGroup: GPUBindGroup | null = null;
  private particleBindGroup: GPUBindGroup | null = null;
  private victoryBindGroup: GPUBindGroup | null = null;

  // Systems
  private particles: ParticleSystem;
  private startTime: number;
  private victoryIntensity: number = 0;
  private victoryStartTime: number = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.particles = new ParticleSystem(500);
    this.startTime = performance.now();
  }

  async initialize(): Promise<boolean> {
    if (!navigator.gpu) {
      console.warn('WebGPU not supported');
      return false;
    }

    try {
      const adapter = await navigator.gpu.requestAdapter();
      if (!adapter) return false;

      this.device = await adapter.requestDevice();
      this.context = this.canvas.getContext('webgpu');
      if (!this.context) return false;

      this.format = navigator.gpu.getPreferredCanvasFormat();
      this.context.configure({
        device: this.device,
        format: this.format,
        alphaMode: 'premultiplied',
      });

      await this.createPipelines();
      return true;
    } catch (e) {
      console.error('WebGPU init failed:', e);
      return false;
    }
  }

  private async createPipelines(): Promise<void> {
    if (!this.device) return;

    // Background pipeline
    const bgModule = this.device.createShaderModule({ code: backgroundShader });
    this.bgPipeline = this.device.createRenderPipeline({
      layout: 'auto',
      vertex: { module: bgModule, entryPoint: 'vertexMain' },
      fragment: {
        module: bgModule,
        entryPoint: 'fragmentMain',
        targets: [{ format: this.format }],
      },
      primitive: { topology: 'triangle-list' },
    });

    this.bgUniformBuffer = this.device.createBuffer({
      size: 16,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    this.bgBindGroup = this.device.createBindGroup({
      layout: this.bgPipeline.getBindGroupLayout(0),
      entries: [{ binding: 0, resource: { buffer: this.bgUniformBuffer } }],
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

    this.particleUniformBuffer = this.device.createBuffer({
      size: 16,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    this.particleStorageBuffer = this.device.createBuffer({
      size: 500 * 12 * 4,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });

    this.particleBindGroup = this.device.createBindGroup({
      layout: this.particlePipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: this.particleUniformBuffer } },
        { binding: 1, resource: { buffer: this.particleStorageBuffer } },
      ],
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
            color: { srcFactor: 'src-alpha', dstFactor: 'one', operation: 'add' },
            alpha: { srcFactor: 'one', dstFactor: 'one', operation: 'add' },
          },
        }],
      },
      primitive: { topology: 'triangle-list' },
    });

    this.victoryUniformBuffer = this.device.createBuffer({
      size: 16,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    this.victoryBindGroup = this.device.createBindGroup({
      layout: this.victoryPipeline.getBindGroupLayout(0),
      entries: [{ binding: 0, resource: { buffer: this.victoryUniformBuffer } }],
    });
  }

  render(): void {
    if (!this.device || !this.context || !this.bgPipeline) return;

    const now = performance.now();
    const time = (now - this.startTime) / 1000;
    const dt = 1 / 60;

    // Update particles
    this.particles.emitAmbient();
    this.particles.update(dt);

    // Update victory intensity
    if (this.victoryIntensity > 0) {
      const elapsed = (now - this.victoryStartTime) / 1000;
      this.victoryIntensity = Math.max(0, 1 - elapsed / 3);
    }

    const aspect = this.canvas.width / this.canvas.height;

    // Update uniforms
    this.device.queue.writeBuffer(
      this.bgUniformBuffer!,
      0,
      new Float32Array([time, aspect, 0, 0])
    );

    this.device.queue.writeBuffer(
      this.particleUniformBuffer!,
      0,
      new Float32Array([time, aspect, 0, 0])
    );

    this.device.queue.writeBuffer(
      this.particleStorageBuffer!,
      0,
      this.particles.getParticleData()
    );

    this.device.queue.writeBuffer(
      this.victoryUniformBuffer!,
      0,
      new Float32Array([time, this.victoryIntensity, 0, 0])
    );

    const encoder = this.device.createCommandEncoder();
    const textureView = this.context.getCurrentTexture().createView();

    // Background pass
    const bgPass = encoder.beginRenderPass({
      colorAttachments: [{
        view: textureView,
        clearValue: { r: 0.02, g: 0.04, b: 0.06, a: 1 },
        loadOp: 'clear',
        storeOp: 'store',
      }],
    });
    bgPass.setPipeline(this.bgPipeline);
    bgPass.setBindGroup(0, this.bgBindGroup!);
    bgPass.draw(6);
    bgPass.end();

    // Victory pass
    if (this.victoryIntensity > 0) {
      const victoryPass = encoder.beginRenderPass({
        colorAttachments: [{
          view: textureView,
          loadOp: 'load',
          storeOp: 'store',
        }],
      });
      victoryPass.setPipeline(this.victoryPipeline!);
      victoryPass.setBindGroup(0, this.victoryBindGroup!);
      victoryPass.draw(6);
      victoryPass.end();
    }

    // Particle pass
    const particleCount = this.particles.getParticleCount();
    if (particleCount > 0) {
      const particlePass = encoder.beginRenderPass({
        colorAttachments: [{
          view: textureView,
          loadOp: 'load',
          storeOp: 'store',
        }],
      });
      particlePass.setPipeline(this.particlePipeline!);
      particlePass.setBindGroup(0, this.particleBindGroup!);
      particlePass.draw(6, particleCount);
      particlePass.end();
    }

    this.device.queue.submit([encoder.finish()]);
  }

  // Emit signal when starting path
  emitSignal(x: number, y: number): void {
    this.particles.emitSignal(x, y);
  }

  // Emit route particles when drawing path
  emitRoute(x: number, y: number): void {
    this.particles.emitRoute(x, y);
  }

  // Emit pulse when path advances
  emitPulse(x: number, y: number): void {
    this.particles.emitPulse(x, y);
  }

  // Emit goal reached effect
  emitGoal(x: number, y: number): void {
    this.particles.emitGoal(x, y);
  }

  // Emit start point highlight
  emitStart(x: number, y: number): void {
    this.particles.emitStart(x, y);
  }

  // Emit victory celebration
  emitVictory(x: number, y: number): void {
    this.particles.emitVictory(x, y);
    this.victoryIntensity = 1;
    this.victoryStartTime = performance.now();
  }

  destroy(): void {
    this.bgUniformBuffer?.destroy();
    this.particleUniformBuffer?.destroy();
    this.particleStorageBuffer?.destroy();
    this.victoryUniformBuffer?.destroy();
    this.particles.clear();
  }
}
