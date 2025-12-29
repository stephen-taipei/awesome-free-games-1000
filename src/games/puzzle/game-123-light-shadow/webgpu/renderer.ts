/**
 * WebGPU Renderer - Light Shadow
 * Light & Shadow / Mystery Theme
 * Game #123
 */

import { BACKGROUND_SHADER, PARTICLE_SHADER } from './shaders';
import { ParticleSystem } from './particles';

export class WebGPURenderer {
  private canvas: HTMLCanvasElement;
  private device: GPUDevice | null = null;
  private context: GPUCanvasContext | null = null;
  private format: GPUTextureFormat = 'bgra8unorm';

  private backgroundPipeline: GPURenderPipeline | null = null;
  private particlePipeline: GPURenderPipeline | null = null;

  private uniformBuffer: GPUBuffer | null = null;
  private particleBuffer: GPUBuffer | null = null;

  private backgroundBindGroup: GPUBindGroup | null = null;
  private particleBindGroup: GPUBindGroup | null = null;

  private particleSystem: ParticleSystem;
  private startTime: number = Date.now();
  private lastTime: number = Date.now();
  private animationId: number = 0;

  private lightX: number = 100;
  private lightY: number = 100;
  private matchProgress: number = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.particleSystem = new ParticleSystem();
  }

  async init(): Promise<boolean> {
    if (!navigator.gpu) {
      console.log('WebGPU not supported');
      return false;
    }

    try {
      const adapter = await navigator.gpu.requestAdapter();
      if (!adapter) {
        console.log('No GPU adapter found');
        return false;
      }

      this.device = await adapter.requestDevice();
      this.context = this.canvas.getContext('webgpu');

      if (!this.context) {
        console.log('Could not get WebGPU context');
        return false;
      }

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
      console.error('WebGPU init error:', e);
      return false;
    }
  }

  private async createPipelines(): Promise<void> {
    if (!this.device) return;

    // Uniform buffer (time, resolution, lightX, lightY, matchProgress)
    this.uniformBuffer = this.device.createBuffer({
      size: 32,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    // Background pipeline
    const bgShaderModule = this.device.createShaderModule({
      code: BACKGROUND_SHADER,
    });

    const bgBindGroupLayout = this.device.createBindGroupLayout({
      entries: [{
        binding: 0,
        visibility: GPUShaderStage.FRAGMENT,
        buffer: { type: 'uniform' },
      }],
    });

    this.backgroundPipeline = this.device.createRenderPipeline({
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
      primitive: { topology: 'triangle-strip' },
    });

    this.backgroundBindGroup = this.device.createBindGroup({
      layout: bgBindGroupLayout,
      entries: [{
        binding: 0,
        resource: { buffer: this.uniformBuffer },
      }],
    });

    // Particle buffer
    this.particleBuffer = this.device.createBuffer({
      size: 500 * 12 * 4,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });

    // Particle pipeline
    const particleShaderModule = this.device.createShaderModule({
      code: PARTICLE_SHADER,
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
              dstFactor: 'one',
              operation: 'add',
            },
            alpha: {
              srcFactor: 'one',
              dstFactor: 'one',
              operation: 'add',
            },
          },
        }],
      },
      primitive: { topology: 'triangle-list' },
    });

    this.particleBindGroup = this.device.createBindGroup({
      layout: particleBindGroupLayout,
      entries: [
        { binding: 0, resource: { buffer: this.uniformBuffer } },
        { binding: 1, resource: { buffer: this.particleBuffer } },
      ],
    });
  }

  resize(width: number, height: number): void {
    const dpr = Math.min(window.devicePixelRatio, 2);
    this.canvas.width = width * dpr;
    this.canvas.height = height * dpr;
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
  }

  private startRenderLoop(): void {
    const render = () => {
      this.render();
      this.animationId = requestAnimationFrame(render);
    };
    render();
  }

  private render(): void {
    if (!this.device || !this.context || !this.backgroundPipeline || !this.particlePipeline) {
      return;
    }

    const now = Date.now();
    const deltaTime = (now - this.lastTime) / 1000;
    this.lastTime = now;

    // Update particles
    this.particleSystem.update(deltaTime);

    // Update uniforms
    const time = (now - this.startTime) / 1000;
    const uniformData = new Float32Array([
      time,
      this.canvas.width,
      this.canvas.height,
      this.lightX * (window.devicePixelRatio || 1),
      this.lightY * (window.devicePixelRatio || 1),
      this.matchProgress,
      0, 0, // padding
    ]);
    this.device.queue.writeBuffer(this.uniformBuffer!, 0, uniformData);

    // Update particle buffer
    const particleData = this.particleSystem.getParticleData();
    if (particleData.length > 0) {
      this.device.queue.writeBuffer(this.particleBuffer!, 0, particleData);
    }

    // Render
    const commandEncoder = this.device.createCommandEncoder();
    const textureView = this.context.getCurrentTexture().createView();

    // Background pass
    const bgPass = commandEncoder.beginRenderPass({
      colorAttachments: [{
        view: textureView,
        clearValue: { r: 0.10, g: 0.10, b: 0.18, a: 1 },
        loadOp: 'clear',
        storeOp: 'store',
      }],
    });

    bgPass.setPipeline(this.backgroundPipeline);
    bgPass.setBindGroup(0, this.backgroundBindGroup!);
    bgPass.draw(4);
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
      particlePass.setBindGroup(0, this.particleBindGroup!);
      particlePass.draw(6, particleCount);
      particlePass.end();
    }

    this.device.queue.submit([commandEncoder.finish()]);
  }

  // Public effect methods
  setLightPosition(x: number, y: number): void {
    this.lightX = x;
    this.lightY = y;
  }

  setMatchProgress(progress: number): void {
    this.matchProgress = progress / 100; // Convert from 0-100 to 0-1
  }

  emitLightMove(x: number, y: number): void {
    this.particleSystem.emitLightMove(x, y);
  }

  emitLightTrail(x: number, y: number): void {
    this.particleSystem.emitLightTrail(x, y);
  }

  emitShadowCast(x: number, y: number): void {
    this.particleSystem.emitShadowCast(x, y);
  }

  emitMatchProgress(x: number, y: number): void {
    this.particleSystem.emitMatchProgress(x, y);
  }

  emitVictory(): void {
    this.particleSystem.emitVictory(this.canvas.width, this.canvas.height);
  }

  emitLevelStart(lightX: number, lightY: number): void {
    this.particleSystem.emitLevelStart(lightX, lightY, this.canvas.width, this.canvas.height);
  }

  emitReset(): void {
    this.particleSystem.emitReset(this.canvas.width, this.canvas.height);
  }

  emitAmbient(): void {
    this.particleSystem.emitAmbient(this.lightX, this.lightY, this.canvas.width, this.canvas.height);
  }

  destroy(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    this.particleSystem.clear();
    this.device?.destroy();
  }
}
