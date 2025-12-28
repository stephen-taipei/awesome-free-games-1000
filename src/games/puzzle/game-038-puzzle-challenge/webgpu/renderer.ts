/**
 * WebGPU Renderer - Puzzle Challenge
 * Glass Workshop / Crystal Mosaic Theme
 * Game #038
 */

import { backgroundShader, particleShader, timerShader, victoryShader } from './shaders';
import { ParticleSystem } from './particles';

export class WebGPURenderer {
  private canvas: HTMLCanvasElement;
  private device!: GPUDevice;
  private context!: GPUCanvasContext;
  private format!: GPUTextureFormat;

  private backgroundPipeline!: GPURenderPipeline;
  private backgroundUniformBuffer!: GPUBuffer;
  private backgroundBindGroup!: GPUBindGroup;

  private particlePipeline!: GPURenderPipeline;
  private particleUniformBuffer!: GPUBuffer;
  private particleStorageBuffer!: GPUBuffer;
  private particleBindGroup!: GPUBindGroup;

  private timerPipeline!: GPURenderPipeline;
  private timerUniformBuffer!: GPUBuffer;
  private timerBindGroup!: GPUBindGroup;

  private victoryPipeline!: GPURenderPipeline;
  private victoryUniformBuffer!: GPUBuffer;
  private victoryBindGroup!: GPUBindGroup;

  private particleSystem: ParticleSystem;
  private startTime: number;
  private lastTime: number;
  private victoryIntensity = 0;
  private timerProgress = 0;
  private timerUrgency = 0;
  private isInitialized = false;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.particleSystem = new ParticleSystem();
    this.startTime = performance.now();
    this.lastTime = this.startTime;
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
      this.context = this.canvas.getContext('webgpu') as GPUCanvasContext;
      this.format = navigator.gpu.getPreferredCanvasFormat();

      this.context.configure({
        device: this.device,
        format: this.format,
        alphaMode: 'premultiplied',
      });

      this.setupBackgroundPipeline();
      this.setupParticlePipeline();
      this.setupTimerPipeline();
      this.setupVictoryPipeline();

      this.isInitialized = true;
      this.startAmbientParticles();
      return true;
    } catch (e) {
      console.error('WebGPU init error:', e);
      return false;
    }
  }

  private setupBackgroundPipeline(): void {
    const shaderModule = this.device.createShaderModule({
      code: backgroundShader,
    });

    this.backgroundUniformBuffer = this.device.createBuffer({
      size: 16,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    const bindGroupLayout = this.device.createBindGroupLayout({
      entries: [
        { binding: 0, visibility: GPUShaderStage.FRAGMENT, buffer: { type: 'uniform' } },
      ],
    });

    this.backgroundBindGroup = this.device.createBindGroup({
      layout: bindGroupLayout,
      entries: [
        { binding: 0, resource: { buffer: this.backgroundUniformBuffer } },
      ],
    });

    this.backgroundPipeline = this.device.createRenderPipeline({
      layout: this.device.createPipelineLayout({ bindGroupLayouts: [bindGroupLayout] }),
      vertex: {
        module: shaderModule,
        entryPoint: 'vertexMain',
      },
      fragment: {
        module: shaderModule,
        entryPoint: 'fragmentMain',
        targets: [{ format: this.format }],
      },
      primitive: { topology: 'triangle-list' },
    });
  }

  private setupParticlePipeline(): void {
    const shaderModule = this.device.createShaderModule({
      code: particleShader,
    });

    this.particleUniformBuffer = this.device.createBuffer({
      size: 16,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    this.particleStorageBuffer = this.device.createBuffer({
      size: 600 * 12 * 4,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });

    const bindGroupLayout = this.device.createBindGroupLayout({
      entries: [
        { binding: 0, visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT, buffer: { type: 'uniform' } },
        { binding: 1, visibility: GPUShaderStage.VERTEX, buffer: { type: 'read-only-storage' } },
      ],
    });

    this.particleBindGroup = this.device.createBindGroup({
      layout: bindGroupLayout,
      entries: [
        { binding: 0, resource: { buffer: this.particleUniformBuffer } },
        { binding: 1, resource: { buffer: this.particleStorageBuffer } },
      ],
    });

    this.particlePipeline = this.device.createRenderPipeline({
      layout: this.device.createPipelineLayout({ bindGroupLayouts: [bindGroupLayout] }),
      vertex: {
        module: shaderModule,
        entryPoint: 'vertexMain',
      },
      fragment: {
        module: shaderModule,
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
  }

  private setupTimerPipeline(): void {
    const shaderModule = this.device.createShaderModule({
      code: timerShader,
    });

    this.timerUniformBuffer = this.device.createBuffer({
      size: 16,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    const bindGroupLayout = this.device.createBindGroupLayout({
      entries: [
        { binding: 0, visibility: GPUShaderStage.FRAGMENT, buffer: { type: 'uniform' } },
      ],
    });

    this.timerBindGroup = this.device.createBindGroup({
      layout: bindGroupLayout,
      entries: [
        { binding: 0, resource: { buffer: this.timerUniformBuffer } },
      ],
    });

    this.timerPipeline = this.device.createRenderPipeline({
      layout: this.device.createPipelineLayout({ bindGroupLayouts: [bindGroupLayout] }),
      vertex: {
        module: shaderModule,
        entryPoint: 'vertexMain',
      },
      fragment: {
        module: shaderModule,
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

  private setupVictoryPipeline(): void {
    const shaderModule = this.device.createShaderModule({
      code: victoryShader,
    });

    this.victoryUniformBuffer = this.device.createBuffer({
      size: 16,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    const bindGroupLayout = this.device.createBindGroupLayout({
      entries: [
        { binding: 0, visibility: GPUShaderStage.FRAGMENT, buffer: { type: 'uniform' } },
      ],
    });

    this.victoryBindGroup = this.device.createBindGroup({
      layout: bindGroupLayout,
      entries: [
        { binding: 0, resource: { buffer: this.victoryUniformBuffer } },
      ],
    });

    this.victoryPipeline = this.device.createRenderPipeline({
      layout: this.device.createPipelineLayout({ bindGroupLayouts: [bindGroupLayout] }),
      vertex: {
        module: shaderModule,
        entryPoint: 'vertexMain',
      },
      fragment: {
        module: shaderModule,
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
  }

  private startAmbientParticles(): void {
    setInterval(() => {
      if (this.isInitialized && this.victoryIntensity < 0.5) {
        this.particleSystem.emitAmbient(
          Math.random(),
          Math.random()
        );
      }
    }, 150);
  }

  render(): void {
    if (!this.isInitialized) return;

    const now = performance.now();
    const deltaTime = (now - this.lastTime) / 1000;
    this.lastTime = now;
    const time = (now - this.startTime) / 1000;

    // Update particles
    this.particleSystem.update(deltaTime);

    // Fade victory effect
    if (this.victoryIntensity > 0) {
      this.victoryIntensity = Math.max(0, this.victoryIntensity - deltaTime * 0.3);
    }

    const aspect = this.canvas.width / this.canvas.height;

    // Update uniforms
    this.device.queue.writeBuffer(
      this.backgroundUniformBuffer,
      0,
      new Float32Array([time, aspect, 0, 0])
    );

    this.device.queue.writeBuffer(
      this.particleUniformBuffer,
      0,
      new Float32Array([time, aspect, 0, 0])
    );

    this.device.queue.writeBuffer(
      this.timerUniformBuffer,
      0,
      new Float32Array([time, this.timerProgress, this.timerUrgency, 0])
    );

    this.device.queue.writeBuffer(
      this.victoryUniformBuffer,
      0,
      new Float32Array([time, this.victoryIntensity, 0, 0])
    );

    this.device.queue.writeBuffer(
      this.particleStorageBuffer,
      0,
      this.particleSystem.getParticleData()
    );

    // Render
    const commandEncoder = this.device.createCommandEncoder();
    const textureView = this.context.getCurrentTexture().createView();

    // Background pass
    const backgroundPass = commandEncoder.beginRenderPass({
      colorAttachments: [{
        view: textureView,
        loadOp: 'clear',
        storeOp: 'store',
        clearValue: { r: 0.3, g: 0.4, b: 0.55, a: 1 },
      }],
    });
    backgroundPass.setPipeline(this.backgroundPipeline);
    backgroundPass.setBindGroup(0, this.backgroundBindGroup);
    backgroundPass.draw(6);
    backgroundPass.end();

    // Particle pass
    const particlePass = commandEncoder.beginRenderPass({
      colorAttachments: [{
        view: textureView,
        loadOp: 'load',
        storeOp: 'store',
      }],
    });
    particlePass.setPipeline(this.particlePipeline);
    particlePass.setBindGroup(0, this.particleBindGroup);
    particlePass.draw(6, this.particleSystem.getParticleCount());
    particlePass.end();

    // Timer overlay pass (only when urgent)
    if (this.timerUrgency > 0.1) {
      const timerPass = commandEncoder.beginRenderPass({
        colorAttachments: [{
          view: textureView,
          loadOp: 'load',
          storeOp: 'store',
        }],
      });
      timerPass.setPipeline(this.timerPipeline);
      timerPass.setBindGroup(0, this.timerBindGroup);
      timerPass.draw(6);
      timerPass.end();
    }

    // Victory pass
    if (this.victoryIntensity > 0.01) {
      const victoryPass = commandEncoder.beginRenderPass({
        colorAttachments: [{
          view: textureView,
          loadOp: 'load',
          storeOp: 'store',
        }],
      });
      victoryPass.setPipeline(this.victoryPipeline);
      victoryPass.setBindGroup(0, this.victoryBindGroup);
      victoryPass.draw(6);
      victoryPass.end();
    }

    this.device.queue.submit([commandEncoder.finish()]);
  }

  // Effect methods
  emitSparkle(x: number, y: number): void {
    this.particleSystem.emitSparkle(x, y);
  }

  emitDrag(x: number, y: number): void {
    this.particleSystem.emitDrag(x, y);
  }

  emitSnap(x: number, y: number): void {
    this.particleSystem.emitSnap(x, y);
  }

  emitVictory(x: number, y: number): void {
    this.particleSystem.emitVictory(x, y);
    this.victoryIntensity = 1.0;
  }

  setTimerState(progress: number, urgency: number): void {
    this.timerProgress = progress;
    this.timerUrgency = urgency;
  }

  destroy(): void {
    this.isInitialized = false;
    this.backgroundUniformBuffer?.destroy();
    this.particleUniformBuffer?.destroy();
    this.particleStorageBuffer?.destroy();
    this.timerUniformBuffer?.destroy();
    this.victoryUniformBuffer?.destroy();
  }
}
