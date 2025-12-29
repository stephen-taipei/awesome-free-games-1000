/**
 * WebGPU Renderer - Archaeology
 * Ancient Ruins / Archaeological Dig Site Theme
 * Game #077
 */

import { ParticleSystem, Particle, ParticleType } from './particles';
import { BACKGROUND_SHADER, PARTICLE_SHADER } from './shaders';
import { randomRange } from './math';

export class WebGPURenderer {
  private canvas: HTMLCanvasElement;
  private device!: GPUDevice;
  private context!: GPUCanvasContext;
  private format!: GPUTextureFormat;

  private backgroundPipeline!: GPURenderPipeline;
  private particlePipeline!: GPURenderPipeline;
  private uniformBuffer!: GPUBuffer;
  private uniformBindGroup!: GPUBindGroup;
  private particleBuffer!: GPUBuffer;

  private particleSystem: ParticleSystem;
  private startTime: number;
  private animationId: number = 0;
  private digProgress: number = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.particleSystem = new ParticleSystem();
    this.startTime = performance.now();
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

      this.createPipelines();
      this.createBuffers();
      this.startRenderLoop();

      return true;
    } catch (e) {
      console.warn('WebGPU init failed:', e);
      return false;
    }
  }

  private createPipelines(): void {
    // Background pipeline
    const bgModule = this.device.createShaderModule({
      code: BACKGROUND_SHADER,
    });

    this.backgroundPipeline = this.device.createRenderPipeline({
      layout: 'auto',
      vertex: {
        module: bgModule,
        entryPoint: 'vertexMain',
      },
      fragment: {
        module: bgModule,
        entryPoint: 'fragmentMain',
        targets: [{ format: this.format }],
      },
      primitive: { topology: 'triangle-strip' },
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
        buffers: [
          {
            arrayStride: 32,
            stepMode: 'instance',
            attributes: [
              { shaderLocation: 0, offset: 0, format: 'float32x2' },
              { shaderLocation: 1, offset: 8, format: 'float32' },
              { shaderLocation: 2, offset: 12, format: 'float32x4' },
              { shaderLocation: 3, offset: 28, format: 'float32' },
            ],
          },
          {
            arrayStride: 8,
            stepMode: 'instance',
            attributes: [
              { shaderLocation: 4, offset: 0, format: 'float32' },
              { shaderLocation: 5, offset: 4, format: 'float32' },
            ],
          },
        ],
      },
      fragment: {
        module: particleModule,
        entryPoint: 'fragmentMain',
        targets: [
          {
            format: this.format,
            blend: {
              color: { srcFactor: 'src-alpha', dstFactor: 'one', operation: 'add' },
              alpha: { srcFactor: 'one', dstFactor: 'one', operation: 'add' },
            },
          },
        ],
      },
      primitive: { topology: 'triangle-strip' },
    });
  }

  private createBuffers(): void {
    this.uniformBuffer = this.device.createBuffer({
      size: 16,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    this.uniformBindGroup = this.device.createBindGroup({
      layout: this.backgroundPipeline.getBindGroupLayout(0),
      entries: [{ binding: 0, resource: { buffer: this.uniformBuffer } }],
    });

    this.particleBuffer = this.device.createBuffer({
      size: 40 * 500,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });
  }

  private startRenderLoop(): void {
    const render = () => {
      this.animationId = requestAnimationFrame(render);
      this.particleSystem.update(16);
      this.render();
    };
    render();
  }

  private render(): void {
    const time = (performance.now() - this.startTime) / 1000;
    const { width, height } = this.canvas;

    this.device.queue.writeBuffer(
      this.uniformBuffer,
      0,
      new Float32Array([time, width, height, this.digProgress])
    );

    const particles = this.particleSystem.getParticles();
    if (particles.length > 0) {
      const particleData = new Float32Array(particles.length * 10);
      const typeMap: Record<ParticleType, number> = {
        dust: 0,
        sand: 1,
        spark: 2,
        debris: 3,
        glow: 4,
        ancient: 5,
      };

      particles.forEach((p, i) => {
        const idx = i * 10;
        particleData[idx] = (p.x / width) * 2 - 1;
        particleData[idx + 1] = 1 - (p.y / height) * 2;
        particleData[idx + 2] = p.size;
        particleData[idx + 3] = p.color.r;
        particleData[idx + 4] = p.color.g;
        particleData[idx + 5] = p.color.b;
        particleData[idx + 6] = p.alpha;
        particleData[idx + 7] = p.rotation;
        particleData[idx + 8] = typeMap[p.type];
        particleData[idx + 9] = p.life;
      });

      this.device.queue.writeBuffer(this.particleBuffer, 0, particleData);
    }

    const commandEncoder = this.device.createCommandEncoder();
    const textureView = this.context.getCurrentTexture().createView();

    const renderPass = commandEncoder.beginRenderPass({
      colorAttachments: [
        {
          view: textureView,
          clearValue: { r: 0.35, g: 0.28, b: 0.2, a: 1 },
          loadOp: 'clear',
          storeOp: 'store',
        },
      ],
    });

    // Draw background
    renderPass.setPipeline(this.backgroundPipeline);
    renderPass.setBindGroup(0, this.uniformBindGroup);
    renderPass.draw(4);

    // Draw particles
    if (particles.length > 0) {
      renderPass.setPipeline(this.particlePipeline);
      renderPass.setBindGroup(0, this.uniformBindGroup);
      renderPass.setVertexBuffer(0, this.particleBuffer, 0);
      renderPass.setVertexBuffer(1, this.particleBuffer, 32);
      renderPass.draw(4, particles.length);
    }

    renderPass.end();
    this.device.queue.submit([commandEncoder.finish()]);
  }

  // Effect methods for game events
  emitBrushDig(x: number, y: number): void {
    this.particleSystem.emit(x, y, 'dust', 8);
    this.particleSystem.emit(x, y, 'sand', 5);
    this.digProgress = Math.min(1, this.digProgress + 0.01);
  }

  emitPickDig(x: number, y: number): void {
    this.particleSystem.emit(x, y, 'debris', 12);
    this.particleSystem.emit(x, y, 'spark', 6);
    this.particleSystem.emit(x, y, 'dust', 5);
    this.digProgress = Math.min(1, this.digProgress + 0.02);
  }

  emitArtifactReveal(x: number, y: number, artifactType?: string): void {
    this.particleSystem.emit(x, y, 'glow', 15, artifactType);
    this.particleSystem.emit(x, y, 'ancient', 8);
    this.particleSystem.emit(x, y, 'spark', 10);
  }

  emitArtifactDamage(x: number, y: number): void {
    this.particleSystem.emit(x, y, 'debris', 20);
    this.particleSystem.emit(x, y, 'dust', 15);
    for (let i = 0; i < 5; i++) {
      setTimeout(() => {
        this.particleSystem.emit(
          x + randomRange(-30, 30),
          y + randomRange(-30, 30),
          'spark',
          3
        );
      }, i * 50);
    }
  }

  emitDiscovery(x: number, y: number, artifactType?: string): void {
    this.particleSystem.emit(x, y, 'glow', 25, artifactType);
    this.particleSystem.emit(x, y, 'ancient', 15);
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const distance = 60;
      setTimeout(() => {
        this.particleSystem.emit(
          x + Math.cos(angle) * distance,
          y + Math.sin(angle) * distance,
          'spark',
          4
        );
      }, i * 80);
    }
  }

  emitVictory(): void {
    const { width, height } = this.canvas;
    for (let i = 0; i < 12; i++) {
      setTimeout(() => {
        const x = randomRange(width * 0.2, width * 0.8);
        const y = randomRange(height * 0.2, height * 0.8);
        this.particleSystem.emit(x, y, 'ancient', 10);
        this.particleSystem.emit(x, y, 'glow', 15, 'coin');
        this.particleSystem.emit(x, y, 'spark', 8);
      }, i * 100);
    }
  }

  emitLevelStart(): void {
    const { width, height } = this.canvas;
    this.digProgress = 0;
    for (let i = 0; i < 20; i++) {
      this.particleSystem.emit(
        randomRange(0, width),
        randomRange(0, height),
        'dust',
        2
      );
    }
  }

  emitReset(): void {
    this.particleSystem.clear();
    this.digProgress = 0;
    const { width, height } = this.canvas;
    for (let i = 0; i < 15; i++) {
      this.particleSystem.emit(
        randomRange(0, width),
        randomRange(0, height),
        'sand',
        3
      );
    }
  }

  resize(width: number, height: number): void {
    this.canvas.width = width;
    this.canvas.height = height;
    this.context.configure({
      device: this.device,
      format: this.format,
      alphaMode: 'premultiplied',
    });
  }

  destroy(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    this.particleSystem.clear();
  }
}
