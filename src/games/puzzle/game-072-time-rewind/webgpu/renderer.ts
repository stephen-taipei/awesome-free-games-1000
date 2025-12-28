/**
 * WebGPU Renderer - Time Rewind
 * Temporal / Cosmic / Time Vortex Theme
 * Game #072
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
  private particleBindGroup!: GPUBindGroup;

  private particles: ParticleSystem;
  private startTime: number;
  private lastTime: number = 0;
  private maxParticles = 400;
  private floatsPerParticle = 12;
  private isRewinding: boolean = false;

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
      size: 16, // time, width, height, rewinding
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

    this.particleBindGroup = this.device.createBindGroup({
      layout: this.particlePipeline.getBindGroupLayout(0),
      entries: [{ binding: 0, resource: { buffer: this.uniformBuffer } }],
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
      'temporal': 0,
      'rewind': 1,
      'sparkle': 2,
      'clockwork': 3,
      'vortex': 4,
      'chrono': 5,
    };
    return types[type] ?? 0;
  }

  setRewinding(value: boolean): void {
    this.isRewinding = value;
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
      new Float32Array([time, this.canvas.width, this.canvas.height, this.isRewinding ? 1.0 : 0.0])
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
        clearValue: { r: 0.05, g: 0.02, b: 0.1, a: 1 },
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
      renderPass.setBindGroup(0, this.particleBindGroup);
      renderPass.setVertexBuffer(0, this.particleBuffer);
      renderPass.draw(4, particleList.length);
    }

    renderPass.end();
    this.device.queue.submit([commandEncoder.finish()]);
  }

  // Player moved
  emitPlayerMove(x: number, y: number): void {
    this.particles.emit(x, y, 'temporal', 3);
    this.particles.emit(x, y, 'sparkle', 2);
  }

  // Rewind started
  emitRewindStart(x: number, y: number): void {
    this.particles.emit(x, y, 'rewind', 8);
    this.particles.emit(x, y, 'vortex', 3);
  }

  // Rewind in progress
  emitRewindPulse(x: number, y: number): void {
    this.particles.emit(x, y, 'rewind', 2);
    this.particles.emit(x, y, 'chrono', 1);
  }

  // Rewind ended
  emitRewindEnd(x: number, y: number): void {
    this.particles.emit(x, y, 'temporal', 6);
    this.particles.emit(x, y, 'sparkle', 5);
  }

  // Key collected
  emitKeyCollect(x: number, y: number): void {
    this.particles.emit(x, y, 'clockwork', 5);
    this.particles.emit(x, y, 'sparkle', 8);
  }

  // Door opened
  emitDoorOpen(x: number, y: number): void {
    this.particles.emit(x, y, 'vortex', 4);
    this.particles.emit(x, y, 'temporal', 3);
  }

  // Hit spike (death)
  emitSpikeDeath(x: number, y: number): void {
    this.particles.emit(x, y, 'chrono', 4);
    this.particles.emit(x, y, 'rewind', 6);
  }

  // Level complete victory
  emitVictory(): void {
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;

    // Time celebration burst
    for (let i = 0; i < 5; i++) {
      setTimeout(() => {
        const x = centerX + (Math.random() - 0.5) * 200;
        const y = centerY + (Math.random() - 0.5) * 100;
        this.particles.emit(x, y, 'sparkle', 12);
        this.particles.emit(x, y, 'clockwork', 3);
      }, i * 150);
    }

    // Central vortex
    setTimeout(() => {
      this.particles.emit(centerX, centerY, 'vortex', 6);
    }, 400);

    // Chrono rings
    setTimeout(() => {
      this.particles.emit(centerX, centerY, 'chrono', 4);
    }, 600);
  }

  // Level start
  emitLevelStart(): void {
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;

    this.particles.emit(centerX, centerY, 'temporal', 6);
    this.particles.emit(centerX, centerY, 'clockwork', 4);

    // Sparkle burst
    for (let i = 0; i < 3; i++) {
      setTimeout(() => {
        const angle = (i / 3) * Math.PI * 2;
        const x = centerX + Math.cos(angle) * 80;
        const y = centerY + Math.sin(angle) * 80;
        this.particles.emit(x, y, 'sparkle', 4);
      }, i * 100);
    }
  }

  // Reset puzzle
  emitReset(): void {
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;
    this.particles.emit(centerX, centerY, 'rewind', 8);
    this.particles.emit(centerX, centerY, 'chrono', 3);
  }

  // Game complete
  emitGameComplete(): void {
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;

    // Massive time celebration
    for (let wave = 0; wave < 4; wave++) {
      setTimeout(() => {
        for (let i = 0; i < 8; i++) {
          const angle = (i / 8) * Math.PI * 2;
          const dist = 70 + wave * 25;
          const x = centerX + Math.cos(angle) * dist;
          const y = centerY + Math.sin(angle) * dist;
          this.particles.emit(x, y, 'sparkle', 8);
          this.particles.emit(x, y, 'temporal', 2);
        }
      }, wave * 200);
    }

    // Clockwork finale
    setTimeout(() => {
      this.particles.emit(centerX, centerY, 'clockwork', 6);
      this.particles.emit(centerX, centerY, 'vortex', 4);
    }, 700);
  }

  destroy(): void {
    this.particles.clear();
  }
}
