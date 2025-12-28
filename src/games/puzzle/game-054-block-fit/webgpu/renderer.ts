/**
 * WebGPU Renderer - Block Fit
 * Architect's Blueprint / Construction Site Theme
 * Game #054
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
    // Background pipeline
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

    // Particle pipeline
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
              { shaderLocation: 0, offset: 0, format: 'float32x2' },   // position
              { shaderLocation: 1, offset: 8, format: 'float32' },    // size
              { shaderLocation: 2, offset: 12, format: 'float32x4' }, // color
              { shaderLocation: 3, offset: 28, format: 'float32' },   // rotation
              { shaderLocation: 4, offset: 32, format: 'float32' },   // type
              { shaderLocation: 5, offset: 36, format: 'float32' },   // life
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
    // Uniform buffer for time and resolution
    this.uniformBuffer = this.device.createBuffer({
      size: 16,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    // Particle instance buffer
    this.particleBuffer = this.device.createBuffer({
      size: 40 * 400, // 40 bytes per particle, max 400 particles
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });

    // Create bind groups
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
      dust: 0,
      place: 1,
      rotate: 2,
      blueprint: 3,
      grid: 4,
      victory: 5,
    };
    return types[type] ?? 0;
  }

  render(): void {
    const currentTime = (performance.now() - this.startTime) / 1000;

    // Update uniforms
    const uniformData = new Float32Array([
      currentTime,
      this.canvasWidth,
      this.canvasHeight,
      0, // padding
    ]);
    this.device.queue.writeBuffer(this.uniformBuffer, 0, uniformData);

    // Update particles
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

    // Render
    const commandEncoder = this.device.createCommandEncoder();
    const textureView = this.context.getCurrentTexture().createView();

    const renderPass = commandEncoder.beginRenderPass({
      colorAttachments: [
        {
          view: textureView,
          clearValue: { r: 0.07, g: 0.11, b: 0.18, a: 1 },
          loadOp: 'clear',
          storeOp: 'store',
        },
      ],
    });

    // Draw background
    renderPass.setPipeline(this.bgPipeline);
    renderPass.setBindGroup(0, this.bgBindGroup);
    renderPass.draw(4);

    // Draw particles
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
  emitPlace(x: number, y: number): void {
    this.particleSystem.emit(x, y, 'place', 15);
    this.particleSystem.emit(x, y, 'dust', 8);
    this.particleSystem.emit(x, y, 'grid', 6);
  }

  emitRotate(x: number, y: number): void {
    this.particleSystem.emit(x, y, 'rotate', 12);
    this.particleSystem.emit(x, y, 'blueprint', 4);
  }

  emitDrag(x: number, y: number): void {
    this.particleSystem.emit(x, y, 'blueprint', 3);
  }

  emitSnap(x: number, y: number): void {
    this.particleSystem.emit(x, y, 'grid', 10);
    this.particleSystem.emit(x, y, 'place', 6);
  }

  emitClear(y: number): void {
    // Line clear effect
    for (let x = 0; x < this.canvasWidth; x += 30) {
      this.particleSystem.emit(x, y, 'place', 2);
      this.particleSystem.emit(x, y, 'blueprint', 1);
    }
  }

  emitVictory(): void {
    const centerX = this.canvasWidth / 2;
    const centerY = this.canvasHeight / 2;

    for (let i = 0; i < 5; i++) {
      setTimeout(() => {
        const x = centerX + (Math.random() - 0.5) * 200;
        const y = centerY + (Math.random() - 0.5) * 100;
        this.particleSystem.emit(x, y, 'victory', 25);
        this.particleSystem.emit(x, y, 'place', 10);
        this.particleSystem.emit(x, y, 'dust', 8);
      }, i * 150);
    }
  }

  destroy(): void {
    this.particleSystem.clear();
    if (this.uniformBuffer) this.uniformBuffer.destroy();
    if (this.particleBuffer) this.particleBuffer.destroy();
  }
}
