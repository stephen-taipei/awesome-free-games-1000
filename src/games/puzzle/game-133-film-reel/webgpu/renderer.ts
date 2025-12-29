/**
 * WebGPU Renderer - Film Reel
 * Cinema / Vintage Film Theme
 * Game #133
 */

import { BACKGROUND_SHADER, PARTICLE_SHADER } from './shaders';
import { ParticleSystem } from './particles';
import { CINEMA_COLORS } from './math';

export class WebGPURenderer {
  private canvas: HTMLCanvasElement;
  private context: GPUCanvasContext | null = null;
  private device: GPUDevice | null = null;
  private format: GPUTextureFormat = 'bgra8unorm';

  private backgroundPipeline: GPURenderPipeline | null = null;
  private particlePipeline: GPURenderPipeline | null = null;

  private uniformBuffer: GPUBuffer | null = null;
  private particleBuffer: GPUBuffer | null = null;

  private backgroundBindGroup: GPUBindGroup | null = null;
  private particleBindGroup: GPUBindGroup | null = null;

  private particleSystem: ParticleSystem;
  private startTime: number = 0;
  private lastTime: number = 0;
  private animationId: number = 0;

  private frameX: number = 0;
  private frameY: number = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.particleSystem = new ParticleSystem(1000);
  }

  async init(): Promise<boolean> {
    if (!navigator.gpu) {
      console.log('WebGPU not supported');
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

      this.createBuffers();
      this.createPipelines();

      this.startTime = performance.now();
      this.lastTime = this.startTime;
      this.animate();

      return true;
    } catch (e) {
      console.error('WebGPU init failed:', e);
      return false;
    }
  }

  private createBuffers() {
    if (!this.device) return;

    // Uniform buffer: time, aspectRatio, frameX, frameY
    this.uniformBuffer = this.device.createBuffer({
      size: 16,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    // Particle buffer
    this.particleBuffer = this.device.createBuffer({
      size: 1000 * 12 * 4,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });
  }

  private createPipelines() {
    if (!this.device) return;

    // Background pipeline
    const backgroundModule = this.device.createShaderModule({
      code: BACKGROUND_SHADER,
    });

    const uniformBindGroupLayout = this.device.createBindGroupLayout({
      entries: [{
        binding: 0,
        visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
        buffer: { type: 'uniform' },
      }],
    });

    this.backgroundPipeline = this.device.createRenderPipeline({
      layout: this.device.createPipelineLayout({
        bindGroupLayouts: [uniformBindGroupLayout],
      }),
      vertex: {
        module: backgroundModule,
        entryPoint: 'vertexMain',
      },
      fragment: {
        module: backgroundModule,
        entryPoint: 'fragmentMain',
        targets: [{ format: this.format }],
      },
      primitive: { topology: 'triangle-strip' },
    });

    this.backgroundBindGroup = this.device.createBindGroup({
      layout: uniformBindGroupLayout,
      entries: [{
        binding: 0,
        resource: { buffer: this.uniformBuffer! },
      }],
    });

    // Particle pipeline
    const particleModule = this.device.createShaderModule({
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
        module: particleModule,
        entryPoint: 'vertexMain',
      },
      fragment: {
        module: particleModule,
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
      primitive: { topology: 'triangle-strip' },
    });

    this.particleBindGroup = this.device.createBindGroup({
      layout: particleBindGroupLayout,
      entries: [
        { binding: 0, resource: { buffer: this.uniformBuffer! } },
        { binding: 1, resource: { buffer: this.particleBuffer! } },
      ],
    });
  }

  private animate = () => {
    const now = performance.now();
    const deltaTime = (now - this.lastTime) / 1000;
    this.lastTime = now;

    this.particleSystem.update(deltaTime);
    this.render();

    this.animationId = requestAnimationFrame(this.animate);
  };

  private render() {
    if (!this.device || !this.context) return;

    const time = (performance.now() - this.startTime) / 1000;
    const aspectRatio = this.canvas.width / this.canvas.height;

    // Update uniforms
    this.device.queue.writeBuffer(
      this.uniformBuffer!,
      0,
      new Float32Array([time, aspectRatio, this.frameX, this.frameY])
    );

    // Update particles
    this.device.queue.writeBuffer(
      this.particleBuffer!,
      0,
      this.particleSystem.getParticleData()
    );

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
    renderPass.setPipeline(this.backgroundPipeline!);
    renderPass.setBindGroup(0, this.backgroundBindGroup!);
    renderPass.draw(4);

    // Draw particles
    const particleCount = this.particleSystem.getParticleCount();
    if (particleCount > 0) {
      renderPass.setPipeline(this.particlePipeline!);
      renderPass.setBindGroup(0, this.particleBindGroup!);
      renderPass.draw(4, particleCount);
    }

    renderPass.end();
    this.device.queue.submit([commandEncoder.finish()]);
  }

  // Event emitters
  emitFrameSelect(x: number, y: number) {
    this.frameX = x;
    this.frameY = y;

    // Spotlight effect
    this.particleSystem.emit(x, y, 'spotlight', 8, {
      color: CINEMA_COLORS.spotlightYellow,
      speedMin: 0.02,
      speedMax: 0.05,
      sizeMin: 1.0,
      sizeMax: 2.0,
      lifeMin: 0.4,
      lifeMax: 0.8,
    });

    // Film grain burst
    this.particleSystem.emit(x, y, 'filmGrain', 15, {
      speedMin: 0.03,
      speedMax: 0.08,
      sizeMin: 0.3,
      sizeMax: 0.6,
      lifeMin: 0.3,
      lifeMax: 0.6,
    });
  }

  emitFrameSwap(fromX: number, fromY: number, toX: number, toY: number) {
    // Reel effects at both positions
    this.particleSystem.emit(fromX, fromY, 'reel', 5, {
      color: CINEMA_COLORS.sepiaDark,
      speedMin: 0.02,
      speedMax: 0.05,
      sizeMin: 0.8,
      sizeMax: 1.5,
      lifeMin: 0.5,
      lifeMax: 1.0,
    });

    this.particleSystem.emit(toX, toY, 'reel', 5, {
      color: CINEMA_COLORS.sepiaDark,
      speedMin: 0.02,
      speedMax: 0.05,
      sizeMin: 0.8,
      sizeMax: 1.5,
      lifeMin: 0.5,
      lifeMax: 1.0,
    });

    // Projector dust trail
    const midX = (fromX + toX) / 2;
    const midY = (fromY + toY) / 2;
    this.particleSystem.emit(midX, midY, 'projectorDust', 10, {
      speedMin: 0.01,
      speedMax: 0.03,
      sizeMin: 0.4,
      sizeMax: 0.8,
      lifeMin: 0.8,
      lifeMax: 1.5,
    });

    this.frameX = 0;
    this.frameY = 0;
  }

  emitFrameCorrect(x: number, y: number) {
    // Golden sparkle for correct placement
    this.particleSystem.emit(x, y, 'spotlight', 12, {
      color: CINEMA_COLORS.cinemaGold,
      speedMin: 0.04,
      speedMax: 0.1,
      sizeMin: 0.6,
      sizeMax: 1.2,
      lifeMin: 0.5,
      lifeMax: 1.0,
    });

    // Film flicker celebration
    this.particleSystem.emit(x, y, 'filmFlicker', 8, {
      color: CINEMA_COLORS.filmWhite,
      speedMin: 0.02,
      speedMax: 0.06,
      sizeMin: 0.5,
      sizeMax: 1.0,
      lifeMin: 0.3,
      lifeMax: 0.6,
    });
  }

  emitVictory() {
    // Clapboard celebration
    for (let i = 0; i < 5; i++) {
      const x = 0.2 + Math.random() * 0.6;
      const y = 0.3 + Math.random() * 0.4;

      this.particleSystem.emit(x, y, 'clapboard', 3, {
        speedMin: 0.02,
        speedMax: 0.05,
        sizeMin: 1.5,
        sizeMax: 2.5,
        lifeMin: 1.0,
        lifeMax: 2.0,
      });

      this.particleSystem.emit(x, y, 'spotlight', 10, {
        color: CINEMA_COLORS.cinemaGold,
        speedMin: 0.05,
        speedMax: 0.12,
        sizeMin: 0.5,
        sizeMax: 1.5,
        lifeMin: 0.8,
        lifeMax: 1.5,
      });
    }

    // Cinema gold rain
    for (let i = 0; i < 20; i++) {
      const x = Math.random();
      this.particleSystem.emit(x, 0, 'filmFlicker', 1, {
        color: CINEMA_COLORS.cinemaGold,
        speedMin: 0.02,
        speedMax: 0.05,
        sizeMin: 0.4,
        sizeMax: 0.8,
        lifeMin: 1.5,
        lifeMax: 2.5,
        direction: Math.PI / 2,
        spread: 0.3,
      });
    }
  }

  emitLevelStart() {
    // Projector beam startup
    for (let i = 0; i < 20; i++) {
      const x = 0.3 + Math.random() * 0.4;
      const y = Math.random() * 0.5;

      this.particleSystem.emit(x, y, 'projectorDust', 1, {
        speedMin: 0.005,
        speedMax: 0.015,
        sizeMin: 0.3,
        sizeMax: 0.6,
        lifeMin: 1.5,
        lifeMax: 3.0,
      });
    }

    // Film grain scatter
    for (let i = 0; i < 15; i++) {
      const x = Math.random();
      const y = Math.random();

      this.particleSystem.emit(x, y, 'filmGrain', 1, {
        speedMin: 0.01,
        speedMax: 0.02,
        sizeMin: 0.2,
        sizeMax: 0.4,
        lifeMin: 0.5,
        lifeMax: 1.0,
      });
    }
  }

  emitReset() {
    this.particleSystem.clear();
    this.frameX = 0;
    this.frameY = 0;

    // Reel spin reset effect
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const x = 0.5 + Math.cos(angle) * 0.2;
      const y = 0.5 + Math.sin(angle) * 0.2;

      this.particleSystem.emit(x, y, 'reel', 1, {
        speedMin: 0.02,
        speedMax: 0.04,
        sizeMin: 0.6,
        sizeMax: 1.0,
        lifeMin: 0.5,
        lifeMax: 1.0,
        direction: angle,
        spread: 0.3,
      });
    }
  }

  emitAmbient() {
    // Floating dust in projector beam
    if (Math.random() > 0.6) {
      const x = 0.3 + Math.random() * 0.4;
      const y = Math.random() * 0.8;

      this.particleSystem.emit(x, y, 'projectorDust', 1, {
        speedMin: 0.002,
        speedMax: 0.008,
        sizeMin: 0.2,
        sizeMax: 0.4,
        lifeMin: 2.0,
        lifeMax: 4.0,
        direction: -Math.PI / 2,
        spread: 0.5,
      });
    }

    // Occasional film grain flicker
    if (Math.random() > 0.9) {
      const x = Math.random();
      const y = Math.random();

      this.particleSystem.emit(x, y, 'filmGrain', 1, {
        speedMin: 0.005,
        speedMax: 0.01,
        sizeMin: 0.2,
        sizeMax: 0.3,
        lifeMin: 0.2,
        lifeMax: 0.4,
      });
    }
  }

  resize(width: number, height: number) {
    this.canvas.width = width;
    this.canvas.height = height;

    if (this.context && this.device) {
      this.context.configure({
        device: this.device,
        format: this.format,
        alphaMode: 'premultiplied',
      });
    }
  }

  destroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    this.particleSystem.clear();
  }
}
