/**
 * WebGPU Renderer - Magnetic Blocks
 * Electromagnetic / Physics / Magnet Theme
 * Game #138
 */

import { ParticleSystem } from './particles';
import { BACKGROUND_SHADER, PARTICLE_SHADER } from './shaders';

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
  private startTime: number = Date.now();
  private lastTime: number = Date.now();
  private animationId: number = 0;
  private initialized: boolean = false;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.particleSystem = new ParticleSystem();
  }

  public async init(): Promise<boolean> {
    if (!navigator.gpu) {
      console.log('WebGPU not supported');
      return false;
    }

    try {
      const adapter = await navigator.gpu.requestAdapter();
      if (!adapter) return false;

      this.device = await adapter.requestDevice();
      this.context = this.canvas.getContext('webgpu')!;
      this.format = navigator.gpu.getPreferredCanvasFormat();

      this.context.configure({
        device: this.device,
        format: this.format,
        alphaMode: 'premultiplied',
      });

      this.createBuffers();
      this.createPipelines();
      this.initialized = true;
      this.startRenderLoop();

      return true;
    } catch (e) {
      console.error('WebGPU init failed:', e);
      return false;
    }
  }

  private createBuffers(): void {
    this.uniformBuffer = this.device.createBuffer({
      size: 16,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    this.particleBuffer = this.device.createBuffer({
      size: 400 * 12 * 4,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });
  }

  private createPipelines(): void {
    const uniformBindGroupLayout = this.device.createBindGroupLayout({
      entries: [
        { binding: 0, visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT, buffer: { type: 'uniform' } },
      ],
    });

    const particleBindGroupLayout = this.device.createBindGroupLayout({
      entries: [
        { binding: 0, visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT, buffer: { type: 'uniform' } },
        { binding: 1, visibility: GPUShaderStage.VERTEX, buffer: { type: 'read-only-storage' } },
      ],
    });

    // Background pipeline
    const backgroundModule = this.device.createShaderModule({ code: BACKGROUND_SHADER });
    this.backgroundPipeline = this.device.createRenderPipeline({
      layout: this.device.createPipelineLayout({ bindGroupLayouts: [uniformBindGroupLayout] }),
      vertex: { module: backgroundModule, entryPoint: 'vertexMain' },
      fragment: {
        module: backgroundModule,
        entryPoint: 'fragmentMain',
        targets: [{ format: this.format }],
      },
      primitive: { topology: 'triangle-strip' },
    });

    // Particle pipeline
    const particleModule = this.device.createShaderModule({ code: PARTICLE_SHADER });
    this.particlePipeline = this.device.createRenderPipeline({
      layout: this.device.createPipelineLayout({ bindGroupLayouts: [particleBindGroupLayout] }),
      vertex: { module: particleModule, entryPoint: 'vertexMain' },
      fragment: {
        module: particleModule,
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

    // Bind groups
    this.backgroundBindGroup = this.device.createBindGroup({
      layout: uniformBindGroupLayout,
      entries: [{ binding: 0, resource: { buffer: this.uniformBuffer } }],
    });

    this.particleBindGroup = this.device.createBindGroup({
      layout: particleBindGroupLayout,
      entries: [
        { binding: 0, resource: { buffer: this.uniformBuffer } },
        { binding: 1, resource: { buffer: this.particleBuffer } },
      ],
    });
  }

  private startRenderLoop(): void {
    const render = () => {
      if (!this.initialized) return;

      const now = Date.now();
      const deltaTime = (now - this.lastTime) / 1000;
      this.lastTime = now;

      this.particleSystem.update(deltaTime);
      this.render();
      this.animationId = requestAnimationFrame(render);
    };
    render();
  }

  private render(): void {
    const time = (Date.now() - this.startTime) / 1000;
    const uniforms = new Float32Array([time, this.canvas.width, this.canvas.height, 0]);
    this.device.queue.writeBuffer(this.uniformBuffer, 0, uniforms);

    const particleData = this.particleSystem.getParticleData();
    this.device.queue.writeBuffer(this.particleBuffer, 0, particleData);

    const commandEncoder = this.device.createCommandEncoder();
    const textureView = this.context.getCurrentTexture().createView();

    const renderPass = commandEncoder.beginRenderPass({
      colorAttachments: [{
        view: textureView,
        clearValue: { r: 0.1, g: 0.1, b: 0.18, a: 1 },
        loadOp: 'clear',
        storeOp: 'store',
      }],
    });

    // Draw background
    renderPass.setPipeline(this.backgroundPipeline);
    renderPass.setBindGroup(0, this.backgroundBindGroup);
    renderPass.draw(4);

    // Draw particles
    const particleCount = this.particleSystem.getParticleCount();
    if (particleCount > 0) {
      renderPass.setPipeline(this.particlePipeline);
      renderPass.setBindGroup(0, this.particleBindGroup);
      renderPass.draw(4, particleCount);
    }

    renderPass.end();
    this.device.queue.submit([commandEncoder.finish()]);
  }

  public resize(width: number, height: number): void {
    if (!this.initialized) return;
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = width * dpr;
    this.canvas.height = height * dpr;
  }

  // Emit events
  public emitBlockMove(x: number, y: number, isPositive: boolean): void {
    this.particleSystem.emit(x, y, 'fieldLine', 5, { isPositive });
    this.particleSystem.emit(x, y, 'polarityFlicker', 3, { isPositive });
  }

  public emitAttraction(x: number, y: number): void {
    this.particleSystem.emit(x, y, 'attractionSpark', 12);
    this.particleSystem.emit(x, y, 'magneticPulse', 2, { isPositive: true });
    this.particleSystem.emit(x, y, 'magneticPulse', 2, { isPositive: false });
  }

  public emitRepulsion(x: number, y: number, isPositive: boolean): void {
    this.particleSystem.emit(x, y, 'repulsionWave', 6, { isPositive });
  }

  public emitLevelComplete(): void {
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const x = 0.5 + Math.cos(angle) * 0.25;
      const y = 0.5 + Math.sin(angle) * 0.25;
      this.particleSystem.emit(x, y, 'attractionSpark', 8);
      this.particleSystem.emit(x, y, 'plasmaOrb', 3);
    }
    this.particleSystem.emit(0.5, 0.5, 'magneticPulse', 5, { isPositive: true });
    this.particleSystem.emit(0.5, 0.5, 'magneticPulse', 5, { isPositive: false });
  }

  public emitVictory(): void {
    for (let i = 0; i < 15; i++) {
      const x = Math.random();
      const y = Math.random();
      this.particleSystem.emit(x, y, 'attractionSpark', 5);
      this.particleSystem.emit(x, y, 'plasmaOrb', 2);
      this.particleSystem.emit(x, y, 'fieldLine', 3, { isPositive: Math.random() > 0.5 });
    }
  }

  public emitLevelStart(): void {
    this.particleSystem.emit(0.5, 0.5, 'magneticPulse', 4, { isPositive: true });
    this.particleSystem.emit(0.5, 0.5, 'magneticPulse', 4, { isPositive: false });
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const x = 0.5 + Math.cos(angle) * 0.3;
      const y = 0.5 + Math.sin(angle) * 0.3;
      this.particleSystem.emit(x, y, 'fieldLine', 3);
    }
  }

  public emitReset(): void {
    this.particleSystem.emit(0.5, 0.5, 'repulsionWave', 8, { isPositive: true });
    this.particleSystem.emit(0.5, 0.5, 'polarityFlicker', 10, { isPositive: false });
  }

  public emitAmbient(): void {
    if (Math.random() < 0.3) {
      this.particleSystem.emit(
        Math.random(),
        Math.random(),
        'plasmaOrb',
        1
      );
    }
    if (Math.random() < 0.2) {
      const edge = Math.floor(Math.random() * 4);
      let x = 0, y = 0;
      switch (edge) {
        case 0: x = Math.random(); y = 0; break;
        case 1: x = Math.random(); y = 1; break;
        case 2: x = 0; y = Math.random(); break;
        case 3: x = 1; y = Math.random(); break;
      }
      this.particleSystem.emit(x, y, 'fieldLine', 1, { isPositive: Math.random() > 0.5 });
    }
  }

  public destroy(): void {
    this.initialized = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    this.particleSystem.clear();
  }
}
