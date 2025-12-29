/**
 * WebGPU Renderer - Stamp Puzzle
 * Arts & Crafts / Rubber Stamp Theme
 * Game #132
 */

import { BACKGROUND_SHADER, PARTICLE_SHADER } from './shaders';
import { ParticleSystem } from './particles';
import { STAMP_COLORS, hexToRgba } from './math';

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

  private stampX: number = 0;
  private stampY: number = 0;

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

    // Uniform buffer: time, aspectRatio, stampX, stampY
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
      new Float32Array([time, aspectRatio, this.stampX, this.stampY])
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
  emitStampSelect(x: number, y: number, colorHex: string) {
    this.stampX = x;
    this.stampY = y;
    const color = hexToRgba(colorHex);

    // Ink drops around stamp
    for (let i = 0; i < 8; i++) {
      this.particleSystem.emit(x, y, 'inkDrop', 1, {
        color,
        speedMin: 0.02,
        speedMax: 0.06,
        sizeMin: 0.8,
        sizeMax: 1.5,
        lifeMin: 0.5,
        lifeMax: 1.0,
      });
    }

    // Sparkles
    this.particleSystem.emit(x, y, 'sparkle', 5, {
      color: STAMP_COLORS.goldAccent,
      speedMin: 0.01,
      speedMax: 0.04,
      sizeMin: 0.4,
      sizeMax: 0.8,
      lifeMin: 0.3,
      lifeMax: 0.7,
    });
  }

  emitStampPlace(x: number, y: number, colorHex: string) {
    const color = hexToRgba(colorHex);

    // Stamp press effect
    for (let i = 0; i < 12; i++) {
      this.particleSystem.emit(x, y, 'stampPress', 1, {
        color,
        speedMin: 0.03,
        speedMax: 0.08,
        sizeMin: 1.0,
        sizeMax: 2.0,
        lifeMin: 0.6,
        lifeMax: 1.2,
      });
    }

    // Ink splash
    this.particleSystem.emit(x, y, 'inkSplash', 8, {
      color: [...color.slice(0, 3), 0.6] as [number, number, number, number],
      speedMin: 0.04,
      speedMax: 0.1,
      sizeMin: 0.6,
      sizeMax: 1.2,
      lifeMin: 0.4,
      lifeMax: 0.8,
    });

    // Paper fibers flying
    this.particleSystem.emit(x, y, 'paperFiber', 6, {
      color: STAMP_COLORS.paperCream,
      speedMin: 0.01,
      speedMax: 0.03,
      sizeMin: 0.3,
      sizeMax: 0.6,
      lifeMin: 0.5,
      lifeMax: 1.0,
    });

    this.stampX = 0;
    this.stampY = 0;
  }

  emitWrongPlace(x: number, y: number) {
    // Red ink splatter for wrong placement
    for (let i = 0; i < 10; i++) {
      this.particleSystem.emit(x, y, 'inkDrop', 1, {
        color: STAMP_COLORS.inkRed,
        speedMin: 0.03,
        speedMax: 0.08,
        sizeMin: 0.5,
        sizeMax: 1.0,
        lifeMin: 0.3,
        lifeMax: 0.6,
      });
    }
  }

  emitVictory() {
    // Celebratory seal marks and sparkles
    for (let i = 0; i < 5; i++) {
      const x = 0.2 + Math.random() * 0.6;
      const y = 0.2 + Math.random() * 0.6;

      this.particleSystem.emit(x, y, 'sealMark', 1, {
        color: STAMP_COLORS.sealRed,
        speedMin: 0.01,
        speedMax: 0.02,
        sizeMin: 2.0,
        sizeMax: 3.0,
        lifeMin: 1.5,
        lifeMax: 2.5,
      });

      this.particleSystem.emit(x, y, 'sparkle', 8, {
        color: STAMP_COLORS.goldAccent,
        speedMin: 0.03,
        speedMax: 0.08,
        sizeMin: 0.5,
        sizeMax: 1.2,
        lifeMin: 0.8,
        lifeMax: 1.5,
      });
    }
  }

  emitLose() {
    // Sad ink splatter
    for (let i = 0; i < 20; i++) {
      const x = 0.3 + Math.random() * 0.4;
      const y = 0.3 + Math.random() * 0.4;

      this.particleSystem.emit(x, y, 'inkDrop', 1, {
        color: STAMP_COLORS.inkSplatter,
        speedMin: 0.02,
        speedMax: 0.05,
        sizeMin: 0.8,
        sizeMax: 1.5,
        lifeMin: 0.8,
        lifeMax: 1.5,
      });
    }
  }

  emitLevelStart() {
    // Paper fibers and sparkles
    for (let i = 0; i < 15; i++) {
      const x = Math.random();
      const y = Math.random();

      this.particleSystem.emit(x, y, 'paperFiber', 1, {
        speedMin: 0.005,
        speedMax: 0.02,
        sizeMin: 0.3,
        sizeMax: 0.6,
        lifeMin: 1.0,
        lifeMax: 2.0,
      });
    }

    for (let i = 0; i < 10; i++) {
      const x = Math.random();
      const y = Math.random();

      this.particleSystem.emit(x, y, 'sparkle', 1, {
        color: STAMP_COLORS.goldAccent,
        speedMin: 0.01,
        speedMax: 0.03,
        sizeMin: 0.4,
        sizeMax: 0.8,
        lifeMin: 0.5,
        lifeMax: 1.0,
      });
    }
  }

  emitReset() {
    this.particleSystem.clear();
    this.stampX = 0;
    this.stampY = 0;

    // Gentle paper fiber scatter
    for (let i = 0; i < 10; i++) {
      this.particleSystem.emit(0.5, 0.5, 'paperFiber', 1, {
        speedMin: 0.02,
        speedMax: 0.05,
        sizeMin: 0.3,
        sizeMax: 0.5,
        lifeMin: 0.5,
        lifeMax: 1.0,
      });
    }
  }

  emitAmbient() {
    // Occasional floating dust/fibers
    if (Math.random() > 0.7) {
      const x = Math.random();
      const y = Math.random() * 0.3;

      this.particleSystem.emit(x, y, 'paperFiber', 1, {
        speedMin: 0.002,
        speedMax: 0.008,
        sizeMin: 0.2,
        sizeMax: 0.4,
        lifeMin: 2.0,
        lifeMax: 4.0,
        direction: Math.PI / 2,
        spread: 0.5,
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
