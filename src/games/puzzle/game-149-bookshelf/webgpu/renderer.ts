/**
 * WebGPU Renderer - Bookshelf
 * Library / Study / Warm Wood Theme
 * Game #149
 */

import { ParticleSystem } from './particles';
import { BACKGROUND_SHADER, PARTICLE_SHADER } from './shaders';
import { LIBRARY_COLORS, randomRange } from './math';

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
  private startTime: number = performance.now();
  private lastTime: number = performance.now();
  private animationId: number | null = null;

  private warmth: number = 1.0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.particleSystem = new ParticleSystem(500);
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
      this.startRenderLoop();

      return true;
    } catch (e) {
      console.warn('WebGPU initialization failed:', e);
      return false;
    }
  }

  private createBuffers() {
    if (!this.device) return;

    // Uniform buffer: time, resolution(2), warmth
    this.uniformBuffer = this.device.createBuffer({
      size: 16,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    // Particle buffer
    this.particleBuffer = this.device.createBuffer({
      size: 500 * 12 * 4,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });
  }

  private createPipelines() {
    if (!this.device) return;

    // Background pipeline
    const backgroundModule = this.device.createShaderModule({
      code: BACKGROUND_SHADER,
    });

    this.backgroundPipeline = this.device.createRenderPipeline({
      layout: 'auto',
      vertex: {
        module: backgroundModule,
        entryPoint: 'vertexMain',
      },
      fragment: {
        module: backgroundModule,
        entryPoint: 'fragmentMain',
        targets: [{ format: this.format }],
      },
      primitive: {
        topology: 'triangle-strip',
      },
    });

    // Particle pipeline
    const particleModule = this.device.createShaderModule({
      code: PARTICLE_SHADER,
    });

    this.particlePipeline = this.device.createRenderPipeline({
      layout: 'auto',
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
      primitive: {
        topology: 'triangle-strip',
      },
    });

    // Create bind groups
    this.backgroundBindGroup = this.device.createBindGroup({
      layout: this.backgroundPipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: this.uniformBuffer! } },
      ],
    });

    this.particleBindGroup = this.device.createBindGroup({
      layout: this.particlePipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: this.uniformBuffer! } },
        { binding: 1, resource: { buffer: this.particleBuffer! } },
      ],
    });
  }

  private startRenderLoop() {
    const render = () => {
      const currentTime = performance.now();
      const deltaTime = (currentTime - this.lastTime) / 1000;
      this.lastTime = currentTime;

      this.particleSystem.update(deltaTime);
      this.render();

      this.animationId = requestAnimationFrame(render);
    };
    render();
  }

  private render() {
    if (!this.device || !this.context || !this.uniformBuffer || !this.particleBuffer) return;

    const time = (performance.now() - this.startTime) / 1000;

    // Update uniforms
    const uniformData = new Float32Array([
      time,
      this.canvas.width,
      this.canvas.height,
      this.warmth,
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
        clearValue: { r: 0.92, g: 0.88, b: 0.82, a: 1 },
        loadOp: 'clear',
        storeOp: 'store',
      }],
    });

    // Render background
    if (this.backgroundPipeline && this.backgroundBindGroup) {
      renderPass.setPipeline(this.backgroundPipeline);
      renderPass.setBindGroup(0, this.backgroundBindGroup);
      renderPass.draw(4);
    }

    // Render particles
    const particleCount = this.particleSystem.getParticleCount();
    if (particleCount > 0 && this.particlePipeline && this.particleBindGroup) {
      renderPass.setPipeline(this.particlePipeline);
      renderPass.setBindGroup(0, this.particleBindGroup);
      renderPass.draw(4, particleCount);
    }

    renderPass.end();
    this.device.queue.submit([commandEncoder.finish()]);
  }

  resize(width: number, height: number) {
    if (!this.context || !this.device) return;

    this.canvas.width = width * window.devicePixelRatio;
    this.canvas.height = height * window.devicePixelRatio;

    this.context.configure({
      device: this.device,
      format: this.format,
      alphaMode: 'premultiplied',
    });
  }

  setWarmth(warmth: number) {
    this.warmth = warmth;
  }

  // Book selected - warm glow around book
  emitBookSelect(x: number, y: number) {
    this.particleSystem.emit(x, y, 'selectionGlow', 8, {
      speed: 0.008,
      size: 20,
      life: 1.2,
      spread: Math.PI * 2,
    });

    this.particleSystem.emit(x, y, 'dustMote', 5, {
      speed: 0.01,
      size: 6,
      life: 1.5,
    });
  }

  // Book deselected
  emitBookDeselect(x: number, y: number) {
    this.particleSystem.emit(x, y, 'dustMote', 3, {
      speed: 0.005,
      size: 5,
      life: 1.0,
    });
  }

  // Books swapped - motion trail and page flutter
  emitBookSwap(x1: number, y1: number, x2: number, y2: number) {
    // Trail from first book
    this.particleSystem.emit(x1, y1, 'swapTrail', 8, {
      speed: 0.03,
      size: 15,
      life: 0.6,
      direction: Math.atan2(y2 - y1, x2 - x1),
      spread: 0.5,
    });

    // Trail from second book
    this.particleSystem.emit(x2, y2, 'swapTrail', 8, {
      speed: 0.03,
      size: 15,
      life: 0.6,
      direction: Math.atan2(y1 - y2, x1 - x2),
      spread: 0.5,
    });

    // Page flutter at both positions
    this.particleSystem.emit(x1, y1, 'pageFlutter', 4, {
      speed: 0.02,
      size: 10,
      life: 1.0,
    });

    this.particleSystem.emit(x2, y2, 'pageFlutter', 4, {
      speed: 0.02,
      size: 10,
      life: 1.0,
    });
  }

  // Book in correct position
  emitBookCorrect(x: number, y: number) {
    this.particleSystem.emit(x, y, 'completionSparkle', 6, {
      speed: 0.02,
      size: 12,
      life: 0.8,
      color: LIBRARY_COLORS.warmGold,
    });

    this.particleSystem.emit(x, y, 'woodShine', 3, {
      speed: 0.005,
      size: 18,
      life: 1.0,
    });
  }

  // Ambient floating dust
  emitAmbient() {
    // Random dust motes in light beam area
    if (Math.random() < 0.3) {
      const x = randomRange(0.5, 0.9);
      const y = randomRange(0.1, 0.5);

      this.particleSystem.emit(x, y, 'dustMote', 1, {
        speed: 0.003,
        size: 4,
        life: 3.0,
      });
    }

    // Occasional wood shine
    if (Math.random() < 0.05) {
      this.particleSystem.emit(
        randomRange(0.2, 0.8),
        randomRange(0.6, 0.9),
        'woodShine',
        1,
        { speed: 0.002, size: 15, life: 1.5 }
      );
    }
  }

  emitLevelStart() {
    // Dust settling
    for (let i = 0; i < 15; i++) {
      setTimeout(() => {
        this.particleSystem.emit(
          randomRange(0.2, 0.8),
          randomRange(0.3, 0.7),
          'dustMote',
          1,
          { speed: 0.005, size: 5, life: 2.0 }
        );
      }, i * 50);
    }
  }

  emitReset() {
    // Books shuffling - dust and page flutter
    for (let i = 0; i < 20; i++) {
      this.particleSystem.emit(
        randomRange(0.2, 0.8),
        randomRange(0.5, 0.8),
        'dustMote',
        1,
        { speed: 0.015, size: 6, life: 1.2 }
      );

      if (i % 3 === 0) {
        this.particleSystem.emit(
          randomRange(0.2, 0.8),
          randomRange(0.5, 0.8),
          'pageFlutter',
          1,
          { speed: 0.02, size: 8, life: 1.0 }
        );
      }
    }
  }

  emitLevelComplete() {
    // Golden celebration
    for (let i = 0; i < 8; i++) {
      setTimeout(() => {
        const x = 0.2 + (i / 8) * 0.6;
        const y = 0.6;

        this.particleSystem.emit(x, y, 'completionSparkle', 5, {
          speed: 0.025,
          size: 15,
          life: 1.2,
        });

        this.particleSystem.emit(x, y, 'woodShine', 2, {
          speed: 0.01,
          size: 20,
          life: 1.0,
        });
      }, i * 80);
    }
  }

  emitVictory() {
    // Grand library celebration
    for (let i = 0; i < 12; i++) {
      setTimeout(() => {
        const angle = (i / 12) * Math.PI * 2;
        const x = 0.5 + Math.cos(angle) * 0.25;
        const y = 0.5 + Math.sin(angle) * 0.2;

        this.particleSystem.emit(x, y, 'completionSparkle', 8, {
          speed: 0.03,
          size: 18,
          life: 1.5,
          color: LIBRARY_COLORS.warmGold,
        });

        this.particleSystem.emit(x, y, 'pageFlutter', 4, {
          speed: 0.02,
          size: 12,
          life: 1.2,
        });
      }, i * 100);
    }

    // Center burst
    setTimeout(() => {
      this.particleSystem.emit(0.5, 0.5, 'completionSparkle', 20, {
        speed: 0.04,
        size: 20,
        life: 2.0,
        color: LIBRARY_COLORS.sparkle,
      });
    }, 1200);
  }

  destroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    this.particleSystem.clear();
    this.device?.destroy();
  }
}
