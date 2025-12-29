/**
 * WebGPU Renderer - Mechanism Puzzle
 * Steampunk / Clockwork / Industrial Brass Theme
 * Game #066
 */

import { BACKGROUND_SHADER, PARTICLE_SHADER } from './shaders';
import { ParticleSystem, Particle } from './particles';

export class WebGPURenderer {
  private canvas!: HTMLCanvasElement;
  private context!: GPUCanvasContext;
  private device!: GPUDevice;
  private format!: GPUTextureFormat;

  private backgroundPipeline!: GPURenderPipeline;
  private particlePipeline!: GPURenderPipeline;
  private uniformBuffer!: GPUBuffer;
  private uniformBindGroup!: GPUBindGroup;
  private particleBuffer!: GPUBuffer;

  private particles: ParticleSystem;
  private startTime: number;
  private lastTime: number = 0;
  private maxParticles = 400;
  private floatsPerParticle = 12;

  constructor() {
    this.particles = new ParticleSystem();
    this.startTime = performance.now() / 1000;
  }

  async initialize(canvas: HTMLCanvasElement): Promise<boolean> {
    if (!navigator.gpu) {
      console.warn('WebGPU not supported');
      return false;
    }

    try {
      const adapter = await navigator.gpu.requestAdapter();
      if (!adapter) return false;

      this.device = await adapter.requestDevice();
      this.canvas = canvas;
      this.context = canvas.getContext('webgpu') as GPUCanvasContext;
      this.format = navigator.gpu.getPreferredCanvasFormat();

      this.context.configure({
        device: this.device,
        format: this.format,
        alphaMode: 'premultiplied',
      });

      this.setupPipelines();
      this.setupBuffers();
      this.resize();

      window.addEventListener('resize', () => this.resize());

      return true;
    } catch (e) {
      console.warn('WebGPU initialization failed:', e);
      return false;
    }
  }

  private setupPipelines(): void {
    // Background pipeline
    const bgModule = this.device.createShaderModule({
      label: 'Background Shader',
      code: BACKGROUND_SHADER,
    });

    this.backgroundPipeline = this.device.createRenderPipeline({
      label: 'Background Pipeline',
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
      label: 'Particle Shader',
      code: PARTICLE_SHADER,
    });

    this.particlePipeline = this.device.createRenderPipeline({
      label: 'Particle Pipeline',
      layout: 'auto',
      vertex: {
        module: particleModule,
        entryPoint: 'vertexMain',
        buffers: [{
          arrayStride: this.floatsPerParticle * 4,
          stepMode: 'instance',
          attributes: [
            { shaderLocation: 0, offset: 0, format: 'float32x2' },   // position
            { shaderLocation: 1, offset: 8, format: 'float32' },    // size
            { shaderLocation: 2, offset: 12, format: 'float32x4' }, // color
            { shaderLocation: 3, offset: 28, format: 'float32' },   // rotation
            { shaderLocation: 4, offset: 32, format: 'float32' },   // particleType
            { shaderLocation: 5, offset: 36, format: 'float32' },   // life
          ],
        }],
      },
      fragment: {
        module: particleModule,
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
              dstFactor: 'one-minus-src-alpha',
              operation: 'add',
            },
          },
        }],
      },
      primitive: { topology: 'triangle-strip' },
    });
  }

  private setupBuffers(): void {
    this.uniformBuffer = this.device.createBuffer({
      size: 16,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    this.uniformBindGroup = this.device.createBindGroup({
      layout: this.backgroundPipeline.getBindGroupLayout(0),
      entries: [{ binding: 0, resource: { buffer: this.uniformBuffer } }],
    });

    this.particleBuffer = this.device.createBuffer({
      size: this.maxParticles * this.floatsPerParticle * 4,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });
  }

  private resize(): void {
    const dpr = Math.min(window.devicePixelRatio, 2);
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
  }

  private getParticleTypeIndex(type: string): number {
    const types: Record<string, number> = {
      'steam': 0,
      'spark': 1,
      'cog': 2,
      'brass': 3,
      'pressure': 4,
      'victory': 5,
    };
    return types[type] ?? 0;
  }

  render(): void {
    const currentTime = performance.now() / 1000;
    const deltaTime = currentTime - this.lastTime;
    this.lastTime = currentTime;

    this.particles.update(deltaTime);

    const time = currentTime - this.startTime;
    this.device.queue.writeBuffer(
      this.uniformBuffer,
      0,
      new Float32Array([time, this.canvas.width, this.canvas.height, 0])
    );

    // Update particle buffer
    const particleList = this.particles.getParticles();
    const particleData = new Float32Array(particleList.length * this.floatsPerParticle);

    particleList.forEach((p: Particle, i: number) => {
      const offset = i * this.floatsPerParticle;
      const nx = (p.x / this.canvas.width) * 2 - 1;
      const ny = 1 - (p.y / this.canvas.height) * 2;

      particleData[offset] = nx;
      particleData[offset + 1] = ny;
      particleData[offset + 2] = p.size;
      particleData[offset + 3] = p.color.r;
      particleData[offset + 4] = p.color.g;
      particleData[offset + 5] = p.color.b;
      particleData[offset + 6] = p.alpha;
      particleData[offset + 7] = p.rotation;
      particleData[offset + 8] = this.getParticleTypeIndex(p.type);
      particleData[offset + 9] = p.life;
      particleData[offset + 10] = 0;
      particleData[offset + 11] = 0;
    });

    this.device.queue.writeBuffer(this.particleBuffer, 0, particleData);

    const commandEncoder = this.device.createCommandEncoder();
    const textureView = this.context.getCurrentTexture().createView();

    const renderPass = commandEncoder.beginRenderPass({
      colorAttachments: [{
        view: textureView,
        clearValue: { r: 0.08, g: 0.07, b: 0.06, a: 1 },
        loadOp: 'clear',
        storeOp: 'store',
      }],
    });

    // Draw background
    renderPass.setPipeline(this.backgroundPipeline);
    renderPass.setBindGroup(0, this.uniformBindGroup);
    renderPass.draw(4);

    // Draw particles
    if (particleList.length > 0) {
      renderPass.setPipeline(this.particlePipeline);
      renderPass.setBindGroup(0, this.uniformBindGroup);
      renderPass.setVertexBuffer(0, this.particleBuffer);
      renderPass.draw(4, particleList.length);
    }

    renderPass.end();
    this.device.queue.submit([commandEncoder.finish()]);
  }

  // Lever pulled
  emitLeverPull(x: number, y: number): void {
    this.particles.emit(x, y, 'brass', 8);
    this.particles.emit(x, y, 'spark', 3);
  }

  // Button pressed
  emitButtonPress(x: number, y: number): void {
    this.particles.emit(x, y, 'pressure', 5);
    this.particles.emit(x, y, 'steam', 3);
  }

  // Gear rotating
  emitGearRotate(x: number, y: number): void {
    this.particles.emit(x, y, 'cog', 4);
    this.particles.emit(x, y, 'spark', 6);
  }

  // Pulley moving
  emitPulleyMove(x: number, y: number): void {
    this.particles.emit(x, y, 'brass', 5);
    this.particles.emit(x, y, 'steam', 2);
  }

  // Weight dropping
  emitWeightDrop(x: number, y: number): void {
    this.particles.emit(x, y, 'brass', 10);
    this.particles.emit(x, y, 'pressure', 4);
    this.particles.emit(x, y, 'steam', 6);
  }

  // Platform moving
  emitPlatformMove(x: number, y: number): void {
    this.particles.emit(x, y, 'steam', 4);
    this.particles.emit(x, y, 'brass', 3);
  }

  // Spring release
  emitSpringRelease(x: number, y: number): void {
    this.particles.emit(x, y, 'pressure', 8);
    this.particles.emit(x, y, 'spark', 5);
    this.particles.emit(x, y, 'cog', 3);
  }

  // Rope tension
  emitRopeTension(x: number, y: number): void {
    this.particles.emit(x, y, 'brass', 4);
  }

  // Door opening
  emitDoorOpen(x: number, y: number): void {
    this.particles.emit(x, y, 'steam', 8);
    this.particles.emit(x, y, 'brass', 6);
    this.particles.emit(x, y, 'victory', 5);
  }

  // Victory celebration
  emitVictory(): void {
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;

    for (let i = 0; i < 8; i++) {
      setTimeout(() => {
        const x = centerX + (Math.random() - 0.5) * 400;
        const y = centerY + (Math.random() - 0.5) * 250;
        this.particles.emit(x, y, 'victory', 15);
        this.particles.emit(x, y, 'spark', 10);
        this.particles.emit(x, y, 'brass', 8);
      }, i * 100);
    }

    // Steam burst celebration
    setTimeout(() => {
      for (let i = 0; i < 5; i++) {
        const x = this.canvas.width * (0.2 + i * 0.15);
        this.particles.emit(x, this.canvas.height * 0.8, 'steam', 8);
      }
    }, 500);
  }

  // Level start - ambient steam
  emitLevelStart(): void {
    for (let i = 0; i < 15; i++) {
      const x = Math.random() * this.canvas.width;
      const y = this.canvas.height * 0.7 + Math.random() * this.canvas.height * 0.3;
      this.particles.emit(x, y, 'steam', 1);
    }
  }

  // Mechanism click feedback
  emitMechanismClick(x: number, y: number): void {
    this.particles.emit(x, y, 'spark', 4);
    this.particles.emit(x, y, 'brass', 3);
  }

  destroy(): void {
    this.particles.clear();
  }
}
