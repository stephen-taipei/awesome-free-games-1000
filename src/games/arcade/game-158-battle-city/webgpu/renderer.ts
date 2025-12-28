/**
 * WebGPU Renderer - Battle City
 * Military / Tank Warfare / Olive Green Theme
 * Game #158
 */

import { BACKGROUND_SHADER, PARTICLE_SHADER } from './shaders';
import { ParticleSystem, Particle } from './particles';

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
  private maxParticles = 1500;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.particleSystem = new ParticleSystem();
    this.startTime = performance.now();
  }

  async initialize(): Promise<boolean> {
    if (!navigator.gpu) {
      console.warn('WebGPU not supported');
      return false;
    }

    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) {
      console.warn('No GPU adapter found');
      return false;
    }

    this.device = await adapter.requestDevice();
    this.context = this.canvas.getContext('webgpu') as GPUCanvasContext;

    if (!this.context) {
      console.warn('Could not get WebGPU context');
      return false;
    }

    this.format = navigator.gpu.getPreferredCanvasFormat();
    this.context.configure({
      device: this.device,
      format: this.format,
      alphaMode: 'premultiplied',
    });

    this.createBuffers();
    this.createPipelines();

    return true;
  }

  private createBuffers() {
    this.uniformBuffer = this.device.createBuffer({
      size: 16,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    this.particleBuffer = this.device.createBuffer({
      size: this.maxParticles * 48,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });
  }

  private createPipelines() {
    // Background pipeline
    const backgroundModule = this.device.createShaderModule({
      code: BACKGROUND_SHADER,
    });

    const backgroundBindGroupLayout = this.device.createBindGroupLayout({
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
          buffer: { type: 'uniform' },
        },
      ],
    });

    this.backgroundPipeline = this.device.createRenderPipeline({
      layout: this.device.createPipelineLayout({
        bindGroupLayouts: [backgroundBindGroupLayout],
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
      primitive: {
        topology: 'triangle-list',
      },
    });

    this.backgroundBindGroup = this.device.createBindGroup({
      layout: backgroundBindGroupLayout,
      entries: [
        { binding: 0, resource: { buffer: this.uniformBuffer } },
      ],
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
      layout: particleBindGroupLayout,
      entries: [
        { binding: 0, resource: { buffer: this.uniformBuffer } },
        { binding: 1, resource: { buffer: this.particleBuffer } },
      ],
    });
  }

  // Emission methods
  emitMuzzleFlash(x: number, y: number, direction: 'up' | 'down' | 'left' | 'right' = 'up') {
    this.particleSystem.emit('muzzleFlash', x, y, { direction });
  }

  emitTankExplosion(x: number, y: number, tankType?: string) {
    this.particleSystem.emit('tankExplosion', x, y, { tankType });
  }

  emitPlayerHit(x: number, y: number) {
    this.particleSystem.emit('playerHit', x, y);
  }

  emitBrickDebris(x: number, y: number) {
    this.particleSystem.emit('brickDebris', x, y);
  }

  emitSmoke(x: number, y: number) {
    this.particleSystem.emit('smoke', x, y);
  }

  emitGameOver(x: number, y: number, isVictory: boolean = false) {
    this.particleSystem.emit('gameOver', x, y, { isVictory });
  }

  emitVictory(x: number, y: number) {
    this.particleSystem.emit('gameOver', x, y, { isVictory: true });
  }

  render(deltaTime: number = 0.016) {
    this.particleSystem.update(deltaTime);

    const time = (performance.now() - this.startTime) / 1000;

    // Update uniforms
    const uniformData = new Float32Array([
      this.canvas.width,
      this.canvas.height,
      time,
      0,
    ]);
    this.device.queue.writeBuffer(this.uniformBuffer, 0, uniformData);

    // Update particle buffer
    const particles = this.particleSystem.getParticles();
    const particleData = new Float32Array(this.maxParticles * 12);

    for (let i = 0; i < particles.length && i < this.maxParticles; i++) {
      const p = particles[i];
      const offset = i * 12;
      particleData[offset] = p.x;
      particleData[offset + 1] = p.y;
      particleData[offset + 2] = p.vx;
      particleData[offset + 3] = p.vy;
      particleData[offset + 4] = p.color[0];
      particleData[offset + 5] = p.color[1];
      particleData[offset + 6] = p.color[2];
      particleData[offset + 7] = p.color[3];
      particleData[offset + 8] = p.size;
      particleData[offset + 9] = p.life;
      particleData[offset + 10] = p.maxLife;
      particleData[offset + 11] = p.type;
    }

    this.device.queue.writeBuffer(this.particleBuffer, 0, particleData);

    // Render
    const commandEncoder = this.device.createCommandEncoder();
    const textureView = this.context.getCurrentTexture().createView();

    const renderPass = commandEncoder.beginRenderPass({
      colorAttachments: [{
        view: textureView,
        clearValue: { r: 0, g: 0, b: 0, a: 1 },
        loadOp: 'clear',
        storeOp: 'store',
      }],
    });

    // Draw background
    renderPass.setPipeline(this.backgroundPipeline);
    renderPass.setBindGroup(0, this.backgroundBindGroup);
    renderPass.draw(6);

    // Draw particles
    if (particles.length > 0) {
      renderPass.setPipeline(this.particlePipeline);
      renderPass.setBindGroup(0, this.particleBindGroup);
      renderPass.draw(6, Math.min(particles.length, this.maxParticles));
    }

    renderPass.end();
    this.device.queue.submit([commandEncoder.finish()]);
  }

  resize(width: number, height: number) {
    this.canvas.width = width;
    this.canvas.height = height;
  }

  clear() {
    this.particleSystem.clear();
  }

  destroy() {
    this.particleBuffer?.destroy();
    this.uniformBuffer?.destroy();
  }
}
