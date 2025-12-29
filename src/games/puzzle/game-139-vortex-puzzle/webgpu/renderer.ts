/**
 * WebGPU Renderer - Vortex Puzzle
 * Cosmic Vortex / Wormhole / Space Portal Theme
 * Game #139
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
        clearValue: { r: 0.06, g: 0.06, b: 0.1, a: 1 },
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
  public emitRingRotate(x: number, y: number, ringIndex: number): void {
    this.particleSystem.emit(x, y, 'ringPulse', 6);
    this.particleSystem.emit(x, y, 'vortexSpiral', 4);
  }

  public emitOrbMove(x: number, y: number, color: [number, number, number, number]): void {
    this.particleSystem.emit(x, y, 'orbGlow', 4, { color });
    this.particleSystem.emit(x, y, 'portalFlash', 2);
  }

  public emitGapActivate(x: number, y: number): void {
    this.particleSystem.emit(x, y, 'gapBeam', 5);
  }

  public emitLevelComplete(): void {
    for (let i = 0; i < 10; i++) {
      const angle = (i / 10) * Math.PI * 2;
      const x = 0.5 + Math.cos(angle) * 0.2;
      const y = 0.5 + Math.sin(angle) * 0.2;
      this.particleSystem.emit(x, y, 'portalFlash', 4);
      this.particleSystem.emit(x, y, 'vortexSpiral', 3);
    }
    this.particleSystem.emit(0.5, 0.5, 'orbGlow', 8);
  }

  public emitVictory(): void {
    for (let i = 0; i < 20; i++) {
      const x = Math.random();
      const y = Math.random();
      this.particleSystem.emit(x, y, 'portalFlash', 3);
      this.particleSystem.emit(x, y, 'starDust', 2);
      this.particleSystem.emit(x, y, 'vortexSpiral', 2);
    }
  }

  public emitLevelStart(): void {
    this.particleSystem.emit(0.5, 0.5, 'portalFlash', 6);
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const x = 0.5 + Math.cos(angle) * 0.3;
      const y = 0.5 + Math.sin(angle) * 0.3;
      this.particleSystem.emit(x, y, 'vortexSpiral', 2);
    }
  }

  public emitReset(): void {
    this.particleSystem.emit(0.5, 0.5, 'ringPulse', 10);
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const x = 0.5 + Math.cos(angle) * 0.25;
      const y = 0.5 + Math.sin(angle) * 0.25;
      this.particleSystem.emit(x, y, 'vortexSpiral', 3);
    }
  }

  public emitAmbient(): void {
    if (Math.random() < 0.4) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 0.2 + Math.random() * 0.25;
      const x = 0.5 + Math.cos(angle) * dist;
      const y = 0.5 + Math.sin(angle) * dist;
      this.particleSystem.emit(x, y, 'vortexSpiral', 1);
    }
    if (Math.random() < 0.2) {
      this.particleSystem.emit(
        Math.random(),
        Math.random(),
        'starDust',
        1
      );
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
