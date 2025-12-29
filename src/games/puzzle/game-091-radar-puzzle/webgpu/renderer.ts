/**
 * WebGPU Renderer - Radar Puzzle
 * Radar / Sonar / Military Theme
 * Game #091
 */

import { ParticleSystem, Particle, ParticleType } from './particles';
import { BACKGROUND_SHADER, PARTICLE_SHADER } from './shaders';

export class WebGPURenderer {
  private canvas: HTMLCanvasElement;
  private device!: GPUDevice;
  private context!: GPUCanvasContext;
  private format!: GPUTextureFormat;

  private backgroundPipeline!: GPURenderPipeline;
  private particlePipeline!: GPURenderPipeline;
  private uniformBuffer!: GPUBuffer;
  private uniformBindGroup!: GPUBindGroup;

  private particleSystem: ParticleSystem;
  private particleBuffer!: GPUBuffer;
  private maxParticles = 500;

  private startTime: number = performance.now();
  private animationId: number = 0;
  private activity: number = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.particleSystem = new ParticleSystem();
  }

  async init(): Promise<boolean> {
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
  }

  private createBuffers(): void {
    this.uniformBuffer = this.device.createBuffer({
      size: 16,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    this.particleBuffer = this.device.createBuffer({
      size: this.maxParticles * 32,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });
  }

  private createPipelines(): void {
    const uniformBindGroupLayout = this.device.createBindGroupLayout({
      entries: [{
        binding: 0,
        visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
        buffer: { type: 'uniform' },
      }],
    });

    this.uniformBindGroup = this.device.createBindGroup({
      layout: uniformBindGroupLayout,
      entries: [{
        binding: 0,
        resource: { buffer: this.uniformBuffer },
      }],
    });

    const pipelineLayout = this.device.createPipelineLayout({
      bindGroupLayouts: [uniformBindGroupLayout],
    });

    // Background pipeline
    this.backgroundPipeline = this.device.createRenderPipeline({
      layout: pipelineLayout,
      vertex: {
        module: this.device.createShaderModule({ code: BACKGROUND_SHADER }),
        entryPoint: 'vertexMain',
      },
      fragment: {
        module: this.device.createShaderModule({ code: BACKGROUND_SHADER }),
        entryPoint: 'fragmentMain',
        targets: [{ format: this.format }],
      },
      primitive: { topology: 'triangle-strip' },
    });

    // Particle pipeline with additive blending
    this.particlePipeline = this.device.createRenderPipeline({
      layout: pipelineLayout,
      vertex: {
        module: this.device.createShaderModule({ code: PARTICLE_SHADER }),
        entryPoint: 'vertexMain',
        buffers: [{
          arrayStride: 32,
          stepMode: 'instance',
          attributes: [
            { shaderLocation: 0, offset: 0, format: 'float32x2' },
            { shaderLocation: 1, offset: 8, format: 'float32' },
            { shaderLocation: 2, offset: 12, format: 'float32x4' },
            { shaderLocation: 3, offset: 28, format: 'float32' },
            { shaderLocation: 4, offset: 28, format: 'float32' },
            { shaderLocation: 5, offset: 28, format: 'float32' },
          ],
        }],
      },
      fragment: {
        module: this.device.createShaderModule({ code: PARTICLE_SHADER }),
        entryPoint: 'fragmentMain',
        targets: [{
          format: this.format,
          blend: {
            color: { srcFactor: 'src-alpha', dstFactor: 'one', operation: 'add' },
            alpha: { srcFactor: 'one', dstFactor: 'one', operation: 'add' },
          },
        }],
      },
      primitive: { topology: 'triangle-strip' },
    });
  }

  private startRenderLoop(): void {
    const render = () => {
      this.renderFrame();
      this.animationId = requestAnimationFrame(render);
    };
    render();
  }

  private renderFrame(): void {
    const time = (performance.now() - this.startTime) / 1000;
    const width = this.canvas.width;
    const height = this.canvas.height;

    // Decay activity
    this.activity *= 0.95;

    // Update uniforms
    const uniformData = new Float32Array([time, width, height, this.activity]);
    this.device.queue.writeBuffer(this.uniformBuffer, 0, uniformData);

    // Update particles
    this.particleSystem.update(1 / 60);

    // Ambient radar blips
    if (Math.random() < 0.02) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 0.2 + Math.random() * 0.3;
      const x = width / 2 + Math.cos(angle) * dist * Math.min(width, height) * 0.5;
      const y = height / 2 + Math.sin(angle) * dist * Math.min(height, height) * 0.5;
      this.particleSystem.emit(x, y, 'blip', 1, Math.floor(Math.random() * 6));
    }

    // Write particle data
    const particles = this.particleSystem.getParticles();
    const particleData = new Float32Array(this.maxParticles * 8);

    particles.forEach((p, i) => {
      if (i >= this.maxParticles) return;
      const offset = i * 8;
      particleData[offset] = (p.x / width) * 2 - 1;
      particleData[offset + 1] = 1 - (p.y / height) * 2;
      particleData[offset + 2] = p.size;
      particleData[offset + 3] = p.color.r;
      particleData[offset + 4] = p.color.g;
      particleData[offset + 5] = p.color.b;
      particleData[offset + 6] = p.alpha;
      particleData[offset + 7] = this.getParticleTypeIndex(p.type) + p.rotation / 100 + p.life / 1000;
    });

    this.device.queue.writeBuffer(this.particleBuffer, 0, particleData);

    // Render
    const commandEncoder = this.device.createCommandEncoder();
    const textureView = this.context.getCurrentTexture().createView();

    const renderPass = commandEncoder.beginRenderPass({
      colorAttachments: [{
        view: textureView,
        clearValue: { r: 0.02, g: 0.04, b: 0.03, a: 1 },
        loadOp: 'clear',
        storeOp: 'store',
      }],
    });

    // Draw background
    renderPass.setPipeline(this.backgroundPipeline);
    renderPass.setBindGroup(0, this.uniformBindGroup);
    renderPass.draw(4);

    // Draw particles
    if (particles.length > 0) {
      renderPass.setPipeline(this.particlePipeline);
      renderPass.setBindGroup(0, this.uniformBindGroup);
      renderPass.setVertexBuffer(0, this.particleBuffer);
      renderPass.draw(4, particles.length);
    }

    renderPass.end();
    this.device.queue.submit([commandEncoder.finish()]);
  }

  private getParticleTypeIndex(type: ParticleType): number {
    const types: ParticleType[] = ['sweep', 'blip', 'ping', 'glow', 'scan', 'wave'];
    return types.indexOf(type);
  }

  // Effect methods
  emitSweep(x: number, y: number, angle?: number): void {
    this.activity = Math.min(this.activity + 0.1, 1);
    this.particleSystem.emit(x, y, 'sweep', 2);
    this.particleSystem.emit(x, y, 'glow', 1);
  }

  emitTargetFound(x: number, y: number): void {
    this.activity = 0.7;
    this.particleSystem.emit(x, y, 'blip', 3);
    this.particleSystem.emit(x, y, 'ping', 2);
    this.particleSystem.emit(x, y, 'glow', 2);
    this.particleSystem.emit(x, y, 'wave', 2);
  }

  emitTargetVisible(x: number, y: number): void {
    this.activity = Math.min(this.activity + 0.15, 1);
    this.particleSystem.emit(x, y, 'blip', 1);
    this.particleSystem.emit(x, y, 'ping', 1);
  }

  emitMiss(x: number, y: number): void {
    this.particleSystem.emit(x, y, 'scan', 2);
    this.particleSystem.emit(x, y, 'wave', 1);
  }

  emitVictory(): void {
    const cx = this.canvas.width / 2;
    const cy = this.canvas.height / 2;
    this.activity = 1;

    // Celebratory radar burst
    for (let i = 0; i < 16; i++) {
      const angle = (i / 16) * Math.PI * 2;
      const radius = 60 + Math.random() * 40;
      const px = cx + Math.cos(angle) * radius;
      const py = cy + Math.sin(angle) * radius;
      this.particleSystem.emit(px, py, 'blip', 2, i % 6);
      this.particleSystem.emit(px, py, 'glow', 2, i % 6);
    }

    // Central ping waves
    for (let i = 0; i < 5; i++) {
      setTimeout(() => {
        this.particleSystem.emit(cx, cy, 'ping', 3);
        this.particleSystem.emit(cx, cy, 'wave', 2);
      }, i * 100);
    }
  }

  emitLevelStart(x: number, y: number): void {
    this.particleSystem.clear();
    this.activity = 0.5;

    // Initial radar scan
    this.particleSystem.emit(x, y, 'scan', 3);
    this.particleSystem.emit(x, y, 'ping', 2);
    this.particleSystem.emit(x, y, 'glow', 2);
  }

  emitReset(): void {
    const cx = this.canvas.width / 2;
    const cy = this.canvas.height / 2;
    this.activity = 0.4;

    // Sweep reset effect
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const radius = 50;
      const px = cx + Math.cos(angle) * radius;
      const py = cy + Math.sin(angle) * radius;
      this.particleSystem.emit(px, py, 'sweep', 1, i % 6);
    }
    this.particleSystem.emit(cx, cy, 'wave', 2);
  }

  resize(width: number, height: number): void {
    this.canvas.width = width;
    this.canvas.height = height;
  }

  destroy(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    this.particleSystem.clear();
  }
}
