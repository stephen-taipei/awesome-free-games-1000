/**
 * WebGPU Renderer - Mirror World
 * Crystal / Reflection / Dimensional Theme
 * Game #068
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
      'shard': 0,
      'lightray': 1,
      'sparkle': 2,
      'syncwave': 3,
      'rift': 4,
      'prism': 5,
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
        clearValue: { r: 0.1, g: 0.15, b: 0.3, a: 1 },
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

  // Player movement with mirror sync
  emitPlayerMove(leftX: number, leftY: number, rightX: number, rightY: number): void {
    // Left player trail (blue)
    this.particles.emit(leftX, leftY, 'sparkle', 3);
    // Right player trail (red/pink)
    this.particles.emit(rightX, rightY, 'sparkle', 3);
    // Sync wave at mirror center
    const mirrorX = (leftX + rightX) / 2;
    const mirrorY = (leftY + rightY) / 2;
    this.particles.emit(mirrorX, mirrorY, 'syncwave', 1);
  }

  // Player blocked by wall
  emitWallBlock(x: number, y: number): void {
    this.particles.emit(x, y, 'shard', 4);
  }

  // Goal reached
  emitGoalReached(x: number, y: number): void {
    this.particles.emit(x, y, 'prism', 10);
    this.particles.emit(x, y, 'lightray', 5);
    this.particles.emit(x, y, 'sparkle', 8);
  }

  // Victory - both goals reached
  emitVictory(): void {
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;

    // Dimensional rift at mirror line
    for (let i = 0; i < 6; i++) {
      setTimeout(() => {
        const y = centerY + (Math.random() - 0.5) * 300;
        this.particles.emit(centerX, y, 'rift', 3);
        this.particles.emit(centerX, y, 'prism', 5);
      }, i * 120);
    }

    // Light rays burst
    for (let i = 0; i < 10; i++) {
      setTimeout(() => {
        const x = Math.random() * this.canvas.width;
        const y = Math.random() * this.canvas.height;
        this.particles.emit(x, y, 'lightray', 3);
        this.particles.emit(x, y, 'sparkle', 5);
      }, i * 80);
    }

    // Final prism explosion
    setTimeout(() => {
      this.particles.emit(centerX, centerY, 'prism', 20);
      this.particles.emit(centerX, centerY, 'shard', 15);
    }, 1000);
  }

  // Level start - ambient particles
  emitLevelStart(): void {
    // Sparkles around the mirror line
    const centerX = this.canvas.width / 2;
    for (let i = 0; i < 10; i++) {
      const y = Math.random() * this.canvas.height;
      this.particles.emit(centerX, y, 'sparkle', 2);
    }
    // Subtle shards on both sides
    for (let i = 0; i < 5; i++) {
      const leftX = Math.random() * this.canvas.width * 0.4;
      const rightX = this.canvas.width * 0.6 + Math.random() * this.canvas.width * 0.4;
      const y = Math.random() * this.canvas.height;
      this.particles.emit(leftX, y, 'shard', 1);
      this.particles.emit(rightX, y, 'shard', 1);
    }
  }

  // Mirror pulse effect
  emitMirrorPulse(): void {
    const centerX = this.canvas.width / 2;
    for (let i = 0; i < 5; i++) {
      const y = Math.random() * this.canvas.height;
      this.particles.emit(centerX, y, 'lightray', 2);
    }
  }

  // Reset effect
  emitReset(): void {
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;
    this.particles.emit(centerX, centerY, 'rift', 5);
    this.particles.emit(centerX, centerY, 'sparkle', 10);
  }

  destroy(): void {
    this.particles.clear();
  }
}
