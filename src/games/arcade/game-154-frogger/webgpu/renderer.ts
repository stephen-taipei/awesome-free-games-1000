/**
 * WebGPU Renderer - Frogger
 * Retro Pixel / Pond Nature / Blue-Green Theme
 * Game #154
 */

import { BACKGROUND_SHADER, PARTICLE_SHADER } from './shaders';
import { ParticleSystem } from './particles';

export class WebGPURenderer {
  private canvas: HTMLCanvasElement;
  private device!: GPUDevice;
  private context!: GPUCanvasContext;
  private format!: GPUTextureFormat;

  private backgroundPipeline!: GPURenderPipeline;
  private particlePipeline!: GPURenderPipeline;

  private uniformBuffer!: GPUBuffer;
  private particleBuffer!: GPUBuffer;

  private backgroundBindGroup!: GPUBindGroup;
  private particleBindGroup!: GPUBindGroup;

  private particleSystem: ParticleSystem;
  private startTime: number;
  private lastTime: number;
  private animationId: number | null = null;

  private readonly MAX_PARTICLES = 1000;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.particleSystem = new ParticleSystem(this.MAX_PARTICLES);
    this.startTime = performance.now();
    this.lastTime = this.startTime;
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
      this.context = this.canvas.getContext('webgpu') as GPUCanvasContext;
      this.format = navigator.gpu.getPreferredCanvasFormat();

      this.context.configure({
        device: this.device,
        format: this.format,
        alphaMode: 'premultiplied',
      });

      this.createBuffers();
      this.createPipelines();
      this.resize(this.canvas.clientWidth, this.canvas.clientHeight);
      this.startRenderLoop();

      return true;
    } catch (error) {
      console.warn('WebGPU initialization failed:', error);
      return false;
    }
  }

  private createBuffers() {
    // Uniform buffer: time, resolution, padding
    this.uniformBuffer = this.device.createBuffer({
      size: 16, // 4 floats
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    // Particle buffer
    this.particleBuffer = this.device.createBuffer({
      size: this.MAX_PARTICLES * 12 * 4, // 12 floats per particle
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });
  }

  private createPipelines() {
    // Background pipeline
    const backgroundModule = this.device.createShaderModule({
      code: BACKGROUND_SHADER,
    });

    this.backgroundPipeline = this.device.createRenderPipeline({
      layout: 'auto',
      vertex: {
        module: backgroundModule,
        entryPoint: 'vs_main',
      },
      fragment: {
        module: backgroundModule,
        entryPoint: 'fs_main',
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
      primitive: {
        topology: 'triangle-list',
      },
    });

    this.backgroundBindGroup = this.device.createBindGroup({
      layout: this.backgroundPipeline.getBindGroupLayout(0),
      entries: [{
        binding: 0,
        resource: { buffer: this.uniformBuffer },
      }],
    });

    // Particle pipeline
    const particleModule = this.device.createShaderModule({
      code: PARTICLE_SHADER,
    });

    this.particlePipeline = this.device.createRenderPipeline({
      layout: 'auto',
      vertex: {
        module: particleModule,
        entryPoint: 'vs_main',
      },
      fragment: {
        module: particleModule,
        entryPoint: 'fs_main',
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
      primitive: {
        topology: 'triangle-list',
      },
    });

    this.particleBindGroup = this.device.createBindGroup({
      layout: this.particlePipeline.getBindGroupLayout(0),
      entries: [
        {
          binding: 0,
          resource: { buffer: this.uniformBuffer },
        },
        {
          binding: 1,
          resource: { buffer: this.particleBuffer },
        },
      ],
    });
  }

  resize(width: number, height: number) {
    const dpr = Math.min(window.devicePixelRatio, 2);
    this.canvas.width = width * dpr;
    this.canvas.height = height * dpr;
  }

  private startRenderLoop() {
    const render = () => {
      const now = performance.now();
      const deltaTime = (now - this.lastTime) / 1000;
      this.lastTime = now;

      this.particleSystem.update(deltaTime);
      this.render();

      this.animationId = requestAnimationFrame(render);
    };

    render();
  }

  private render() {
    const time = (performance.now() - this.startTime) / 1000;

    // Update uniforms
    const uniformData = new Float32Array([
      time,
      this.canvas.width,
      this.canvas.height,
      0,
    ]);
    this.device.queue.writeBuffer(this.uniformBuffer, 0, uniformData);

    // Update particles
    const particleData = this.particleSystem.getParticleData();
    this.device.queue.writeBuffer(this.particleBuffer, 0, particleData);

    const commandEncoder = this.device.createCommandEncoder();
    const textureView = this.context.getCurrentTexture().createView();

    const renderPass = commandEncoder.beginRenderPass({
      colorAttachments: [{
        view: textureView,
        clearValue: { r: 0, g: 0, b: 0, a: 0 },
        loadOp: 'clear',
        storeOp: 'store',
      }],
    });

    // Draw background
    renderPass.setPipeline(this.backgroundPipeline);
    renderPass.setBindGroup(0, this.backgroundBindGroup);
    renderPass.draw(6);

    // Draw particles
    const particleCount = this.particleSystem.getParticleCount();
    if (particleCount > 0) {
      renderPass.setPipeline(this.particlePipeline);
      renderPass.setBindGroup(0, this.particleBindGroup);
      renderPass.draw(6, particleCount);
    }

    renderPass.end();
    this.device.queue.submit([commandEncoder.finish()]);
  }

  // Emission methods
  emitFrogHop(x: number, y: number) {
    this.particleSystem.emitFrogHop(x, y);
  }

  emitSplash(x: number, y: number, isDeath: boolean = false) {
    this.particleSystem.emitSplash(x, y, isDeath);
  }

  emitCarHit(x: number, y: number) {
    this.particleSystem.emitCarHit(x, y);
  }

  emitGoalReach(x: number, y: number) {
    this.particleSystem.emitGoalReach(x, y);
  }

  emitLogRide(x: number, y: number) {
    this.particleSystem.emitLogRide(x, y);
  }

  emitGameOver(x: number, y: number) {
    this.particleSystem.emitGameOver(x, y);
  }

  emitGameStart() {
    this.particleSystem.emitGameStart();
  }

  emitVictory() {
    this.particleSystem.emitVictory();
  }

  emitAmbient() {
    this.particleSystem.emitAmbient();
  }

  destroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    this.particleBuffer?.destroy();
    this.uniformBuffer?.destroy();
  }
}
