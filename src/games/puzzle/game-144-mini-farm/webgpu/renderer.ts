/**
 * WebGPU Renderer - Mini Farm
 * Farm / Nature / Pastoral Theme
 * Game #144
 */

import { BACKGROUND_SHADER, PARTICLE_SHADER } from './shaders';
import { ParticleSystem } from './particles';

export class WebGPURenderer {
  private canvas: HTMLCanvasElement;
  private device!: GPUDevice;
  private context!: GPUCanvasContext;
  private format!: GPUTextureFormat;

  private bgPipeline!: GPURenderPipeline;
  private bgUniformBuffer!: GPUBuffer;
  private bgBindGroup!: GPUBindGroup;

  private particlePipeline!: GPURenderPipeline;
  private particleUniformBuffer!: GPUBuffer;
  private particleStorageBuffer!: GPUBuffer;
  private particleBindGroup!: GPUBindGroup;

  private particleSystem: ParticleSystem;
  private startTime: number;
  private lastTime: number;
  private animationId: number = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.particleSystem = new ParticleSystem(1500);
    this.startTime = performance.now() / 1000;
    this.lastTime = this.startTime;
  }

  async init(): Promise<boolean> {
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

      this.resize(this.canvas.clientWidth, this.canvas.clientHeight);
      await this.createPipelines();
      this.startRenderLoop();

      return true;
    } catch (e) {
      console.warn('WebGPU initialization failed:', e);
      return false;
    }
  }

  resize(width: number, height: number) {
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = width * dpr;
    this.canvas.height = height * dpr;
  }

  private async createPipelines() {
    // Background pipeline
    const bgShaderModule = this.device.createShaderModule({
      code: BACKGROUND_SHADER,
    });

    this.bgUniformBuffer = this.device.createBuffer({
      size: 16,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    const bgBindGroupLayout = this.device.createBindGroupLayout({
      entries: [{
        binding: 0,
        visibility: GPUShaderStage.FRAGMENT | GPUShaderStage.VERTEX,
        buffer: { type: 'uniform' },
      }],
    });

    this.bgBindGroup = this.device.createBindGroup({
      layout: bgBindGroupLayout,
      entries: [{
        binding: 0,
        resource: { buffer: this.bgUniformBuffer },
      }],
    });

    this.bgPipeline = this.device.createRenderPipeline({
      layout: this.device.createPipelineLayout({
        bindGroupLayouts: [bgBindGroupLayout],
      }),
      vertex: {
        module: bgShaderModule,
        entryPoint: 'vertexMain',
      },
      fragment: {
        module: bgShaderModule,
        entryPoint: 'fragmentMain',
        targets: [{ format: this.format }],
      },
      primitive: { topology: 'triangle-list' },
    });

    // Particle pipeline
    const particleShaderModule = this.device.createShaderModule({
      code: PARTICLE_SHADER,
    });

    this.particleUniformBuffer = this.device.createBuffer({
      size: 16,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    this.particleStorageBuffer = this.device.createBuffer({
      size: 1500 * 12 * 4,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });

    const particleBindGroupLayout = this.device.createBindGroupLayout({
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
          buffer: { type: 'uniform' },
        },
        {
          binding: 1,
          visibility: GPUShaderStage.VERTEX,
          buffer: { type: 'read-only-storage' },
        },
      ],
    });

    this.particleBindGroup = this.device.createBindGroup({
      layout: particleBindGroupLayout,
      entries: [
        { binding: 0, resource: { buffer: this.particleUniformBuffer } },
        { binding: 1, resource: { buffer: this.particleStorageBuffer } },
      ],
    });

    this.particlePipeline = this.device.createRenderPipeline({
      layout: this.device.createPipelineLayout({
        bindGroupLayouts: [particleBindGroupLayout],
      }),
      vertex: {
        module: particleShaderModule,
        entryPoint: 'vertexMain',
      },
      fragment: {
        module: particleShaderModule,
        entryPoint: 'fragmentMain',
        targets: [{
          format: this.format,
          blend: {
            color: {
              srcFactor: 'src-alpha',
              dstFactor: 'one-minus-src-alpha',
              operation: 'add',
            },
            alpha: {
              srcFactor: 'one',
              dstFactor: 'one-minus-src-alpha',
              operation: 'add',
            },
          },
        }],
      },
      primitive: { topology: 'triangle-list' },
    });
  }

  private startRenderLoop() {
    const render = () => {
      const currentTime = performance.now() / 1000;
      const deltaTime = Math.min(currentTime - this.lastTime, 0.1);
      this.lastTime = currentTime;

      this.particleSystem.update(deltaTime);
      this.renderFrame(currentTime - this.startTime);
      this.animationId = requestAnimationFrame(render);
    };
    render();
  }

  private renderFrame(time: number) {
    const uniformData = new Float32Array([
      time,
      this.canvas.width,
      this.canvas.height,
      0,
    ]);

    this.device.queue.writeBuffer(this.bgUniformBuffer, 0, uniformData);
    this.device.queue.writeBuffer(this.particleUniformBuffer, 0, uniformData);

    const particleData = this.particleSystem.getParticleData();
    if (particleData.length > 0) {
      this.device.queue.writeBuffer(this.particleStorageBuffer, 0, particleData);
    }

    const commandEncoder = this.device.createCommandEncoder();
    const textureView = this.context.getCurrentTexture().createView();

    // Background pass
    const bgPass = commandEncoder.beginRenderPass({
      colorAttachments: [{
        view: textureView,
        clearValue: { r: 0.18, g: 0.35, b: 0.15, a: 1 },
        loadOp: 'clear',
        storeOp: 'store',
      }],
    });
    bgPass.setPipeline(this.bgPipeline);
    bgPass.setBindGroup(0, this.bgBindGroup);
    bgPass.draw(6);
    bgPass.end();

    // Particle pass
    const particleCount = this.particleSystem.getParticleCount();
    if (particleCount > 0) {
      const particlePass = commandEncoder.beginRenderPass({
        colorAttachments: [{
          view: textureView,
          loadOp: 'load',
          storeOp: 'store',
        }],
      });
      particlePass.setPipeline(this.particlePipeline);
      particlePass.setBindGroup(0, this.particleBindGroup);
      particlePass.draw(6, particleCount);
      particlePass.end();
    }

    this.device.queue.submit([commandEncoder.finish()]);
  }

  // Emission methods for game events
  emitCropPlace(x: number, y: number, cropIndex: number) {
    this.particleSystem.emit('cropGrow', x, y, 8, { cropIndex });
    this.particleSystem.emit('harvestSparkle', x, y, 5);
  }

  emitCropRemove(x: number, y: number) {
    this.particleSystem.emit('pollenDrift', x, y, 6);
  }

  emitValidPlacement(x: number, y: number) {
    this.particleSystem.emit('harvestSparkle', x, y, 12);
    this.particleSystem.emit('sunRay', x, y - 0.1, 3);
  }

  emitInvalidPlacement(x: number, y: number) {
    this.particleSystem.emit('pollenDrift', x, y, 4);
  }

  emitAmbient() {
    // Sun rays from top-right
    if (Math.random() < 0.3) {
      const x = 0.7 + Math.random() * 0.3;
      const y = 0.8 + Math.random() * 0.2;
      this.particleSystem.emit('sunRay', x, y, 1);
    }

    // Floating leaves
    if (Math.random() < 0.15) {
      const x = Math.random();
      const y = 0.9 + Math.random() * 0.1;
      this.particleSystem.emit('leafFloat', x, y, 1);
    }

    // Pollen drift
    if (Math.random() < 0.2) {
      const x = Math.random();
      const y = 0.3 + Math.random() * 0.5;
      this.particleSystem.emit('pollenDrift', x, y, 2);
    }
  }

  emitLevelStart() {
    for (let i = 0; i < 20; i++) {
      const x = 0.2 + Math.random() * 0.6;
      const y = 0.3 + Math.random() * 0.4;
      this.particleSystem.emit('cropGrow', x, y, 1);
    }
    for (let i = 0; i < 15; i++) {
      const x = Math.random();
      const y = 0.8 + Math.random() * 0.2;
      this.particleSystem.emit('sunRay', x, y, 1);
    }
  }

  emitReset() {
    for (let i = 0; i < 25; i++) {
      const x = 0.2 + Math.random() * 0.6;
      const y = 0.3 + Math.random() * 0.4;
      this.particleSystem.emit('leafFloat', x, y, 1);
    }
    for (let i = 0; i < 15; i++) {
      const x = 0.2 + Math.random() * 0.6;
      const y = 0.3 + Math.random() * 0.4;
      this.particleSystem.emit('pollenDrift', x, y, 1);
    }
  }

  emitLevelComplete() {
    for (let i = 0; i < 40; i++) {
      const x = 0.3 + Math.random() * 0.4;
      const y = 0.4 + Math.random() * 0.3;
      this.particleSystem.emit('harvestSparkle', x, y, 1);
    }
    for (let i = 0; i < 25; i++) {
      const x = 0.3 + Math.random() * 0.4;
      const y = 0.4 + Math.random() * 0.3;
      this.particleSystem.emit('seedBurst', x, y, 1, { cropIndex: Math.floor(Math.random() * 4) });
    }
  }

  emitVictory() {
    // Grand harvest celebration
    for (let i = 0; i < 60; i++) {
      const x = Math.random();
      const y = Math.random();
      this.particleSystem.emit('harvestSparkle', x, y, 1);
    }
    for (let i = 0; i < 40; i++) {
      const x = 0.5;
      const y = 0.5;
      this.particleSystem.emit('seedBurst', x, y, 1, { cropIndex: Math.floor(Math.random() * 4) });
    }
    for (let i = 0; i < 30; i++) {
      const x = Math.random();
      const y = 0.8 + Math.random() * 0.2;
      this.particleSystem.emit('sunRay', x, y, 1);
    }
  }

  destroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    this.particleSystem.clear();
  }
}
