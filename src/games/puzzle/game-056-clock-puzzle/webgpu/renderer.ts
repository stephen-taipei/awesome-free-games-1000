/**
 * WebGPU Renderer - Clock Puzzle
 * Elegant Clock Tower / Victorian Timekeeper Theme
 * Game #056
 */

import { ParticleSystem, Particle } from './particles';
import { BACKGROUND_SHADER, PARTICLE_SHADER } from './shaders';

export class WebGPURenderer {
  private device!: GPUDevice;
  private context!: GPUCanvasContext;
  private bgPipeline!: GPURenderPipeline;
  private particlePipeline!: GPURenderPipeline;
  private uniformBuffer!: GPUBuffer;
  private particleBuffer!: GPUBuffer;
  private bgBindGroup!: GPUBindGroup;
  private particleBindGroup!: GPUBindGroup;
  private startTime: number;
  private particleSystem: ParticleSystem;
  private canvasWidth = 0;
  private canvasHeight = 0;

  constructor() {
    this.startTime = performance.now();
    this.particleSystem = new ParticleSystem();
  }

  async initialize(canvas: HTMLCanvasElement): Promise<boolean> {
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
      this.context = canvas.getContext('webgpu') as GPUCanvasContext;

      const format = navigator.gpu.getPreferredCanvasFormat();
      this.context.configure({
        device: this.device,
        format,
        alphaMode: 'premultiplied',
      });

      this.canvasWidth = canvas.width;
      this.canvasHeight = canvas.height;

      await this.createPipelines(format);
      this.createBuffers();

      return true;
    } catch (error) {
      console.error('WebGPU initialization failed:', error);
      return false;
    }
  }

  private async createPipelines(format: GPUTextureFormat): Promise<void> {
    const bgShaderModule = this.device.createShaderModule({
      code: BACKGROUND_SHADER,
    });

    this.bgPipeline = this.device.createRenderPipeline({
      layout: 'auto',
      vertex: {
        module: bgShaderModule,
        entryPoint: 'vertexMain',
      },
      fragment: {
        module: bgShaderModule,
        entryPoint: 'fragmentMain',
        targets: [{ format }],
      },
      primitive: {
        topology: 'triangle-strip',
      },
    });

    const particleShaderModule = this.device.createShaderModule({
      code: PARTICLE_SHADER,
    });

    this.particlePipeline = this.device.createRenderPipeline({
      layout: 'auto',
      vertex: {
        module: particleShaderModule,
        entryPoint: 'vertexMain',
        buffers: [
          {
            arrayStride: 40,
            stepMode: 'instance',
            attributes: [
              { shaderLocation: 0, offset: 0, format: 'float32x2' },
              { shaderLocation: 1, offset: 8, format: 'float32' },
              { shaderLocation: 2, offset: 12, format: 'float32x4' },
              { shaderLocation: 3, offset: 28, format: 'float32' },
              { shaderLocation: 4, offset: 32, format: 'float32' },
              { shaderLocation: 5, offset: 36, format: 'float32' },
            ],
          },
        ],
      },
      fragment: {
        module: particleShaderModule,
        entryPoint: 'fragmentMain',
        targets: [
          {
            format,
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
          },
        ],
      },
      primitive: {
        topology: 'triangle-strip',
      },
    });
  }

  private createBuffers(): void {
    this.uniformBuffer = this.device.createBuffer({
      size: 16,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    this.particleBuffer = this.device.createBuffer({
      size: 40 * 400,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });

    this.bgBindGroup = this.device.createBindGroup({
      layout: this.bgPipeline.getBindGroupLayout(0),
      entries: [
        {
          binding: 0,
          resource: { buffer: this.uniformBuffer },
        },
      ],
    });

    this.particleBindGroup = this.device.createBindGroup({
      layout: this.particlePipeline.getBindGroupLayout(0),
      entries: [
        {
          binding: 0,
          resource: { buffer: this.uniformBuffer },
        },
      ],
    });
  }

  private getParticleTypeIndex(type: string): number {
    const types: Record<string, number> = {
      tick: 0,
      chime: 1,
      gear: 2,
      dust: 3,
      correct: 4,
      victory: 5,
    };
    return types[type] ?? 0;
  }

  render(): void {
    const currentTime = (performance.now() - this.startTime) / 1000;

    const uniformData = new Float32Array([
      currentTime,
      this.canvasWidth,
      this.canvasHeight,
      0,
    ]);
    this.device.queue.writeBuffer(this.uniformBuffer, 0, uniformData);

    this.particleSystem.update(1 / 60);
    const particles = this.particleSystem.getParticles();

    if (particles.length > 0) {
      const particleData = new Float32Array(particles.length * 10);
      particles.forEach((p: Particle, i: number) => {
        const offset = i * 10;
        particleData[offset] = p.x / this.canvasWidth * 2 - 1;
        particleData[offset + 1] = -(p.y / this.canvasHeight * 2 - 1);
        particleData[offset + 2] = p.size;
        particleData[offset + 3] = p.color.r;
        particleData[offset + 4] = p.color.g;
        particleData[offset + 5] = p.color.b;
        particleData[offset + 6] = p.alpha;
        particleData[offset + 7] = p.rotation;
        particleData[offset + 8] = this.getParticleTypeIndex(p.type);
        particleData[offset + 9] = p.life;
      });
      this.device.queue.writeBuffer(this.particleBuffer, 0, particleData);
    }

    const commandEncoder = this.device.createCommandEncoder();
    const textureView = this.context.getCurrentTexture().createView();

    const renderPass = commandEncoder.beginRenderPass({
      colorAttachments: [
        {
          view: textureView,
          clearValue: { r: 0.12, g: 0.05, b: 0.02, a: 1 },
          loadOp: 'clear',
          storeOp: 'store',
        },
      ],
    });

    renderPass.setPipeline(this.bgPipeline);
    renderPass.setBindGroup(0, this.bgBindGroup);
    renderPass.draw(4);

    if (particles.length > 0) {
      renderPass.setPipeline(this.particlePipeline);
      renderPass.setBindGroup(0, this.particleBindGroup);
      renderPass.setVertexBuffer(0, this.particleBuffer);
      renderPass.draw(4, particles.length);
    }

    renderPass.end();
    this.device.queue.submit([commandEncoder.finish()]);
  }

  // Effect methods
  emitTick(x: number, y: number): void {
    this.particleSystem.emit(x, y, 'tick', 8);
    this.particleSystem.emit(x, y, 'gear', 3);
  }

  emitChime(x: number, y: number): void {
    this.particleSystem.emit(x, y, 'chime', 5);
    this.particleSystem.emit(x, y, 'dust', 4);
  }

  emitCorrect(x: number, y: number): void {
    this.particleSystem.emit(x, y, 'correct', 12);
    this.particleSystem.emit(x, y, 'tick', 6);
    this.particleSystem.emit(x, y, 'chime', 3);
  }

  emitGear(x: number, y: number): void {
    this.particleSystem.emit(x, y, 'gear', 5);
  }

  emitVictory(): void {
    const centerX = this.canvasWidth / 2;
    const centerY = this.canvasHeight / 2;

    for (let i = 0; i < 5; i++) {
      setTimeout(() => {
        const x = centerX + (Math.random() - 0.5) * 250;
        const y = centerY + (Math.random() - 0.5) * 100;
        this.particleSystem.emit(x, y, 'victory', 25);
        this.particleSystem.emit(x, y, 'chime', 6);
        this.particleSystem.emit(x, y, 'gear', 8);
      }, i * 150);
    }
  }

  destroy(): void {
    this.particleSystem.clear();
    if (this.uniformBuffer) this.uniformBuffer.destroy();
    if (this.particleBuffer) this.particleBuffer.destroy();
  }
}
