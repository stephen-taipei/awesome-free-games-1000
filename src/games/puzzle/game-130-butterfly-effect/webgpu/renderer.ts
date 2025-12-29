/**
 * WebGPU Renderer - Butterfly Effect
 * Nature / Butterfly Theme
 * Game #130
 */

import { BACKGROUND_SHADER, PARTICLE_SHADER } from './shaders';
import { ParticleSystem } from './particles';
import { NATURE_COLORS } from './math';

export class WebGPURenderer {
  private canvas: HTMLCanvasElement;
  private device!: GPUDevice;
  private context!: GPUCanvasContext;
  private format!: GPUTextureFormat;

  private bgPipeline!: GPURenderPipeline;
  private particlePipeline!: GPURenderPipeline;
  private bgUniformBuffer!: GPUBuffer;
  private particleUniformBuffer!: GPUBuffer;
  private particleStorageBuffer!: GPUBuffer;
  private bgBindGroup!: GPUBindGroup;
  private particleBindGroup!: GPUBindGroup;

  private particleSystem: ParticleSystem;
  private startTime: number;
  private lastTime: number;
  private animationId: number = 0;

  private gameState: number = 0;
  private chainActive: number = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.particleSystem = new ParticleSystem();
    this.startTime = performance.now();
    this.lastTime = this.startTime;
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
        alphaMode: 'premultiplied'
      });

      this.resize(this.canvas.clientWidth, this.canvas.clientHeight);
      this.createPipelines();
      this.createBuffers();
      this.createBindGroups();
      this.startRenderLoop();

      return true;
    } catch (e) {
      console.error('WebGPU init failed:', e);
      return false;
    }
  }

  private createPipelines(): void {
    // Background pipeline
    const bgShaderModule = this.device.createShaderModule({
      code: BACKGROUND_SHADER
    });

    this.bgPipeline = this.device.createRenderPipeline({
      layout: 'auto',
      vertex: {
        module: bgShaderModule,
        entryPoint: 'vertexMain'
      },
      fragment: {
        module: bgShaderModule,
        entryPoint: 'fragmentMain',
        targets: [{ format: this.format }]
      },
      primitive: { topology: 'triangle-strip' }
    });

    // Particle pipeline
    const particleShaderModule = this.device.createShaderModule({
      code: PARTICLE_SHADER
    });

    this.particlePipeline = this.device.createRenderPipeline({
      layout: 'auto',
      vertex: {
        module: particleShaderModule,
        entryPoint: 'vertexMain'
      },
      fragment: {
        module: particleShaderModule,
        entryPoint: 'fragmentMain',
        targets: [{
          format: this.format,
          blend: {
            color: {
              srcFactor: 'src-alpha',
              dstFactor: 'one-minus-src-alpha',
              operation: 'add'
            },
            alpha: {
              srcFactor: 'one',
              dstFactor: 'one-minus-src-alpha',
              operation: 'add'
            }
          }
        }]
      },
      primitive: { topology: 'triangle-strip' }
    });
  }

  private createBuffers(): void {
    this.bgUniformBuffer = this.device.createBuffer({
      size: 32,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
    });

    this.particleUniformBuffer = this.device.createBuffer({
      size: 16,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
    });

    this.particleStorageBuffer = this.device.createBuffer({
      size: 600 * 12 * 4,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
    });
  }

  private createBindGroups(): void {
    this.bgBindGroup = this.device.createBindGroup({
      layout: this.bgPipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: this.bgUniformBuffer } }
      ]
    });

    this.particleBindGroup = this.device.createBindGroup({
      layout: this.particlePipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: this.particleUniformBuffer } },
        { binding: 1, resource: { buffer: this.particleStorageBuffer } }
      ]
    });
  }

  private render = (): void => {
    const currentTime = performance.now();
    const deltaTime = (currentTime - this.lastTime) / 1000;
    this.lastTime = currentTime;

    const time = (currentTime - this.startTime) / 1000;

    // Update particles
    this.particleSystem.update(deltaTime);

    // Decay chain active
    this.chainActive *= 0.98;

    // Update uniforms
    const bgUniforms = new Float32Array([
      time,
      0,
      this.canvas.width,
      this.canvas.height,
      this.gameState,
      this.chainActive,
      0,
      0
    ]);
    this.device.queue.writeBuffer(this.bgUniformBuffer, 0, bgUniforms);

    const particleUniforms = new Float32Array([time, this.canvas.width, this.canvas.height, this.gameState]);
    this.device.queue.writeBuffer(this.particleUniformBuffer, 0, particleUniforms);

    const particleData = this.particleSystem.getParticleData();
    this.device.queue.writeBuffer(this.particleStorageBuffer, 0, particleData);

    // Render
    const commandEncoder = this.device.createCommandEncoder();
    const textureView = this.context.getCurrentTexture().createView();

    const renderPass = commandEncoder.beginRenderPass({
      colorAttachments: [{
        view: textureView,
        clearValue: { r: 0, g: 0, b: 0, a: 1 },
        loadOp: 'clear',
        storeOp: 'store'
      }]
    });

    // Background
    renderPass.setPipeline(this.bgPipeline);
    renderPass.setBindGroup(0, this.bgBindGroup);
    renderPass.draw(4);

    // Particles
    const particleCount = this.particleSystem.getParticleCount();
    if (particleCount > 0) {
      renderPass.setPipeline(this.particlePipeline);
      renderPass.setBindGroup(0, this.particleBindGroup);
      renderPass.draw(4, particleCount);
    }

    renderPass.end();
    this.device.queue.submit([commandEncoder.finish()]);

    this.animationId = requestAnimationFrame(this.render);
  };

  private startRenderLoop(): void {
    this.render();
  }

  resize(width: number, height: number): void {
    const dpr = Math.min(window.devicePixelRatio, 2);
    this.canvas.width = width * dpr;
    this.canvas.height = height * dpr;
  }

  // Event emitters
  emitButterflyClick(x: number, y: number, color: number[]): void {
    this.chainActive = 1.0;
    this.particleSystem.emitBurst(x, y, 'butterflyWing', 15, color);
    this.particleSystem.emitBurst(x, y, 'sparkle', 10);
  }

  emitChainReaction(fromX: number, fromY: number, toX: number, toY: number, color: number[]): void {
    this.chainActive = 1.0;
    this.particleSystem.emitChainLine(fromX, fromY, toX, toY, 'sparkle', 12, color);
    this.particleSystem.emitBurst(toX, toY, 'bloom', 8, color);
  }

  emitFlowerActivate(x: number, y: number, color: number[]): void {
    this.particleSystem.emitBurst(x, y, 'bloom', 12, color);
    this.particleSystem.emitBurst(x, y, 'pollen', 20);
  }

  emitWindActivate(x: number, y: number): void {
    for (let i = 0; i < 15; i++) {
      this.particleSystem.createParticle(
        x - 0.03 + Math.random() * 0.06,
        y - 0.02 + Math.random() * 0.04,
        'windGust'
      );
    }
    this.particleSystem.emitBurst(x, y, 'leaf', 5);
  }

  emitTargetActivate(x: number, y: number): void {
    this.particleSystem.emitBurst(x, y, 'sparkle', 25);
    this.particleSystem.emitBurst(x, y, 'bloom', 12, NATURE_COLORS.grassGreen);
  }

  emitVictory(): void {
    this.gameState = 1;
    for (let i = 0; i < 60; i++) {
      const x = Math.random();
      const y = Math.random();
      const types = ['butterflyWing', 'bloom', 'sparkle', 'pollen'] as const;
      this.particleSystem.createParticle(x, y, types[i % types.length]);
    }
  }

  emitLevelStart(): void {
    this.gameState = 0;
    this.chainActive = 0;
    this.particleSystem.clear();

    for (let i = 0; i < 20; i++) {
      this.particleSystem.createParticle(
        Math.random(),
        0.8 + Math.random() * 0.2,
        'pollen'
      );
    }
  }

  emitReset(): void {
    this.gameState = 0;
    this.chainActive = 0;
    this.particleSystem.clear();
  }

  emitAmbient(): void {
    if (Math.random() < 0.15) {
      this.particleSystem.createParticle(
        Math.random(),
        0.1 + Math.random() * 0.15,
        'pollen'
      );
    }
    if (Math.random() < 0.08) {
      this.particleSystem.createParticle(
        Math.random(),
        0.05 + Math.random() * 0.1,
        'leaf'
      );
    }
  }

  destroy(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }
}
