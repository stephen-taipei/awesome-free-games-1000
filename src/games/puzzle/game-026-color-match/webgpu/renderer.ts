/**
 * WebGPU Renderer - Color Match
 * Neon Synapse Theme
 * Game #026
 */

import {
  backgroundShader,
  textGlowShader,
  particleShader,
  feedbackShader,
} from './shaders';
import { ParticleSystem, type Particle } from './particles';
import { hexToRgb } from './math';

export class WebGPURenderer {
  private canvas: HTMLCanvasElement;
  private device: GPUDevice | null = null;
  private context: GPUCanvasContext | null = null;
  private format: GPUTextureFormat = 'bgra8unorm';

  // Pipelines
  private backgroundPipeline: GPURenderPipeline | null = null;
  private textGlowPipeline: GPURenderPipeline | null = null;
  private particlePipeline: GPURenderPipeline | null = null;
  private feedbackPipeline: GPURenderPipeline | null = null;

  // Buffers
  private backgroundUniformBuffer: GPUBuffer | null = null;
  private textGlowUniformBuffer: GPUBuffer | null = null;
  private particleUniformBuffer: GPUBuffer | null = null;
  private particleStorageBuffer: GPUBuffer | null = null;
  private feedbackUniformBuffer: GPUBuffer | null = null;

  // Bind Groups
  private backgroundBindGroup: GPUBindGroup | null = null;
  private textGlowBindGroup: GPUBindGroup | null = null;
  private particleBindGroup: GPUBindGroup | null = null;
  private feedbackBindGroup: GPUBindGroup | null = null;

  // State
  private time = 0;
  private particleSystem: ParticleSystem;
  private currentColorRGB: [number, number, number] = [1, 1, 1];
  private pulseIntensity = 0;
  private shakeIntensity = 0;
  private feedbackType = 0; // 0 = correct, 1 = wrong
  private feedbackIntensity = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.particleSystem = new ParticleSystem();
  }

  async init(): Promise<boolean> {
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
      this.context = this.canvas.getContext('webgpu');

      if (!this.context) {
        console.warn('Failed to get WebGPU context');
        return false;
      }

      this.format = navigator.gpu.getPreferredCanvasFormat();
      this.context.configure({
        device: this.device,
        format: this.format,
        alphaMode: 'premultiplied',
      });

      this.createPipelines();
      this.createBuffers();

      return true;
    } catch (e) {
      console.warn('WebGPU init failed:', e);
      return false;
    }
  }

  private createPipelines(): void {
    if (!this.device) return;

    // Background pipeline
    const bgModule = this.device.createShaderModule({ code: backgroundShader });
    this.backgroundPipeline = this.device.createRenderPipeline({
      layout: 'auto',
      vertex: { module: bgModule, entryPoint: 'vertexMain' },
      fragment: {
        module: bgModule,
        entryPoint: 'fragmentMain',
        targets: [{ format: this.format }],
      },
      primitive: { topology: 'triangle-list' },
    });

    // Text glow pipeline
    const textModule = this.device.createShaderModule({ code: textGlowShader });
    this.textGlowPipeline = this.device.createRenderPipeline({
      layout: 'auto',
      vertex: { module: textModule, entryPoint: 'vertexMain' },
      fragment: {
        module: textModule,
        entryPoint: 'fragmentMain',
        targets: [{
          format: this.format,
          blend: {
            color: { srcFactor: 'src-alpha', dstFactor: 'one', operation: 'add' },
            alpha: { srcFactor: 'one', dstFactor: 'one', operation: 'add' },
          },
        }],
      },
      primitive: { topology: 'triangle-list' },
    });

    // Particle pipeline
    const particleModule = this.device.createShaderModule({ code: particleShader });
    this.particlePipeline = this.device.createRenderPipeline({
      layout: 'auto',
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
      primitive: { topology: 'triangle-list' },
    });

    // Feedback pipeline
    const feedbackModule = this.device.createShaderModule({ code: feedbackShader });
    this.feedbackPipeline = this.device.createRenderPipeline({
      layout: 'auto',
      vertex: { module: feedbackModule, entryPoint: 'vertexMain' },
      fragment: {
        module: feedbackModule,
        entryPoint: 'fragmentMain',
        targets: [{
          format: this.format,
          blend: {
            color: { srcFactor: 'src-alpha', dstFactor: 'one-minus-src-alpha', operation: 'add' },
            alpha: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' },
          },
        }],
      },
      primitive: { topology: 'triangle-list' },
    });
  }

  private createBuffers(): void {
    if (!this.device) return;

    // Background uniform buffer
    this.backgroundUniformBuffer = this.device.createBuffer({
      size: 16,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    // Text glow uniform buffer
    this.textGlowUniformBuffer = this.device.createBuffer({
      size: 16,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    // Particle buffers
    this.particleUniformBuffer = this.device.createBuffer({
      size: 16,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    this.particleStorageBuffer = this.device.createBuffer({
      size: 300 * 48,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });

    // Feedback uniform buffer
    this.feedbackUniformBuffer = this.device.createBuffer({
      size: 16,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    this.createBindGroups();
  }

  private createBindGroups(): void {
    if (!this.device) return;

    this.backgroundBindGroup = this.device.createBindGroup({
      layout: this.backgroundPipeline!.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: this.backgroundUniformBuffer! } },
      ],
    });

    this.textGlowBindGroup = this.device.createBindGroup({
      layout: this.textGlowPipeline!.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: this.textGlowUniformBuffer! } },
      ],
    });

    this.particleBindGroup = this.device.createBindGroup({
      layout: this.particlePipeline!.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: this.particleUniformBuffer! } },
        { binding: 1, resource: { buffer: this.particleStorageBuffer! } },
      ],
    });

    this.feedbackBindGroup = this.device.createBindGroup({
      layout: this.feedbackPipeline!.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: this.feedbackUniformBuffer! } },
      ],
    });
  }

  setCurrentColor(hexColor: string): void {
    this.currentColorRGB = hexToRgb(hexColor);
  }

  triggerCorrect(): void {
    this.feedbackType = 0;
    this.feedbackIntensity = 1.0;
    this.pulseIntensity = 1.0;
    this.particleSystem.emitCorrect(0.5, 0.5);
  }

  triggerWrong(): void {
    this.feedbackType = 1;
    this.feedbackIntensity = 1.0;
    this.shakeIntensity = 1.0;
    this.particleSystem.emitWrong(0.5, 0.5);
  }

  emitColorBurst(hexColor: string): void {
    this.particleSystem.emitColorBurst(0.5, 0.5, hexColor);
  }

  clearParticles(): void {
    this.particleSystem.clear();
  }

  render(deltaTime: number): void {
    if (!this.device || !this.context) return;

    this.time += deltaTime * 0.001;

    // Update effects
    this.particleSystem.update(deltaTime);
    this.particleSystem.emitAmbient();

    // Decay feedback
    this.feedbackIntensity *= 0.92;
    this.pulseIntensity *= 0.95;
    this.shakeIntensity *= 0.85;

    if (this.feedbackIntensity < 0.01) this.feedbackIntensity = 0;
    if (this.pulseIntensity < 0.01) this.pulseIntensity = 0;
    if (this.shakeIntensity < 0.01) this.shakeIntensity = 0;

    this.updateBuffers();

    const encoder = this.device.createCommandEncoder();
    const textureView = this.context.getCurrentTexture().createView();

    const renderPass = encoder.beginRenderPass({
      colorAttachments: [{
        view: textureView,
        clearValue: { r: 0.02, g: 0.02, b: 0.06, a: 1.0 },
        loadOp: 'clear',
        storeOp: 'store',
      }],
    });

    // 1. Background with neural network
    renderPass.setPipeline(this.backgroundPipeline!);
    renderPass.setBindGroup(0, this.backgroundBindGroup!);
    renderPass.draw(6);

    // 2. Text glow
    renderPass.setPipeline(this.textGlowPipeline!);
    renderPass.setBindGroup(0, this.textGlowBindGroup!);
    renderPass.draw(6);

    // 3. Particles
    const particles = this.particleSystem.getParticles();
    if (particles.length > 0) {
      this.updateParticleBuffer(particles);
      renderPass.setPipeline(this.particlePipeline!);
      renderPass.setBindGroup(0, this.particleBindGroup!);
      renderPass.draw(6, particles.length);
    }

    // 4. Feedback overlay
    if (this.feedbackIntensity > 0) {
      renderPass.setPipeline(this.feedbackPipeline!);
      renderPass.setBindGroup(0, this.feedbackBindGroup!);
      renderPass.draw(6);
    }

    renderPass.end();
    this.device.queue.submit([encoder.finish()]);
  }

  private updateBuffers(): void {
    if (!this.device) return;

    const w = this.canvas.width;
    const h = this.canvas.height;
    const aspectRatio = w / h;

    this.device.queue.writeBuffer(
      this.backgroundUniformBuffer!,
      0,
      new Float32Array([this.time, aspectRatio, this.pulseIntensity, this.shakeIntensity])
    );

    this.device.queue.writeBuffer(
      this.textGlowUniformBuffer!,
      0,
      new Float32Array([this.time, ...this.currentColorRGB])
    );

    this.device.queue.writeBuffer(
      this.particleUniformBuffer!,
      0,
      new Float32Array([this.time, aspectRatio, 0, 0])
    );

    this.device.queue.writeBuffer(
      this.feedbackUniformBuffer!,
      0,
      new Float32Array([this.time, this.feedbackType, this.feedbackIntensity, 0])
    );
  }

  private updateParticleBuffer(particles: Particle[]): void {
    if (!this.device || !this.particleStorageBuffer) return;

    const data = new Float32Array(particles.length * 12);
    const typeMap: Record<string, number> = {
      'correct': 0,
      'wrong': 1,
      'synapse': 2,
      'spark': 3,
    };

    particles.forEach((p, i) => {
      data[i * 12 + 0] = p.x;
      data[i * 12 + 1] = p.y;
      data[i * 12 + 2] = p.vx;
      data[i * 12 + 3] = p.vy;
      data[i * 12 + 4] = p.life;
      data[i * 12 + 5] = p.maxLife;
      data[i * 12 + 6] = p.size;
      data[i * 12 + 7] = typeMap[p.type] ?? 0;
      data[i * 12 + 8] = p.color[0];
      data[i * 12 + 9] = p.color[1];
      data[i * 12 + 10] = p.color[2];
      data[i * 12 + 11] = p.color[3];
    });

    this.device.queue.writeBuffer(this.particleStorageBuffer, 0, data);
  }

  destroy(): void {
    this.backgroundUniformBuffer?.destroy();
    this.textGlowUniformBuffer?.destroy();
    this.particleUniformBuffer?.destroy();
    this.particleStorageBuffer?.destroy();
    this.feedbackUniformBuffer?.destroy();
  }
}
