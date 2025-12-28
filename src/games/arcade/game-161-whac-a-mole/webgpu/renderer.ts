/**
 * WebGPU Renderer - Whac-A-Mole
 * Carnival / Fair / Grass Green and Brown Theme
 * Game #161
 */

import { BACKGROUND_SHADER, PARTICLE_SHADER } from './shaders';
import { ParticleSystem } from './particles';

export class WebGPURenderer {
  private canvas: HTMLCanvasElement;
  private device: GPUDevice | null = null;
  private context: GPUCanvasContext | null = null;
  private format: GPUTextureFormat = 'bgra8unorm';

  private bgPipeline: GPURenderPipeline | null = null;
  private particlePipeline: GPURenderPipeline | null = null;

  private uniformBuffer: GPUBuffer | null = null;
  private bgBindGroup: GPUBindGroup | null = null;
  private particleBindGroup: GPUBindGroup | null = null;
  private particleBuffer: GPUBuffer | null = null;

  private particleSystem: ParticleSystem;
  private time = 0;
  private level = 1;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.particleSystem = new ParticleSystem();
  }

  async initialize(): Promise<boolean> {
    if (!navigator.gpu) return false;

    try {
      const adapter = await navigator.gpu.requestAdapter();
      if (!adapter) return false;

      this.device = await adapter.requestDevice();
      this.context = this.canvas.getContext('webgpu');
      if (!this.context) return false;

      this.format = navigator.gpu.getPreferredCanvasFormat();
      this.context.configure({
        device: this.device,
        format: this.format,
        alphaMode: 'premultiplied',
      });

      this.createResources();
      return true;
    } catch {
      return false;
    }
  }

  private createResources() {
    if (!this.device) return;

    // Uniform buffer
    this.uniformBuffer = this.device.createBuffer({
      size: 16,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    // Background pipeline
    const bgModule = this.device.createShaderModule({
      code: BACKGROUND_SHADER,
    });

    this.bgPipeline = this.device.createRenderPipeline({
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
      primitive: { topology: 'triangle-list' },
    });

    // Particle buffer
    this.particleBuffer = this.device.createBuffer({
      size: 12 * 4 * 500,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });

    // Particle pipeline
    const particleModule = this.device.createShaderModule({
      code: PARTICLE_SHADER,
    });

    this.particlePipeline = this.device.createRenderPipeline({
      layout: 'auto',
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
      primitive: { topology: 'triangle-list' },
    });

    // Bind groups
    this.bgBindGroup = this.device.createBindGroup({
      layout: this.bgPipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: this.uniformBuffer } },
      ],
    });

    this.particleBindGroup = this.device.createBindGroup({
      layout: this.particlePipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: this.uniformBuffer } },
        { binding: 1, resource: { buffer: this.particleBuffer } },
      ],
    });
  }

  render(delta: number) {
    if (!this.device || !this.context || !this.bgPipeline || !this.particlePipeline) return;

    this.time += delta;
    this.particleSystem.update(delta);

    // Update uniforms
    const uniformData = new Float32Array([
      this.time,
      this.canvas.width,
      this.canvas.height,
      this.level,
    ]);
    this.device.queue.writeBuffer(this.uniformBuffer!, 0, uniformData);

    // Update particles
    const particleData = this.particleSystem.getParticleData();
    if (particleData.length > 0) {
      this.device.queue.writeBuffer(this.particleBuffer!, 0, particleData);
    }

    const encoder = this.device.createCommandEncoder();
    const textureView = this.context.getCurrentTexture().createView();

    const renderPass = encoder.beginRenderPass({
      colorAttachments: [{
        view: textureView,
        clearValue: { r: 0, g: 0, b: 0, a: 0 },
        loadOp: 'clear',
        storeOp: 'store',
      }],
    });

    // Draw background
    renderPass.setPipeline(this.bgPipeline);
    renderPass.setBindGroup(0, this.bgBindGroup!);
    renderPass.draw(6);

    // Draw particles
    const particleCount = this.particleSystem.getParticleCount();
    if (particleCount > 0) {
      renderPass.setPipeline(this.particlePipeline);
      renderPass.setBindGroup(0, this.particleBindGroup!);
      renderPass.draw(6, particleCount);
    }

    renderPass.end();
    this.device.queue.submit([encoder.finish()]);
  }

  resize(width: number, height: number) {
    this.canvas.width = width;
    this.canvas.height = height;

    if (this.context && this.device) {
      this.context.configure({
        device: this.device,
        format: this.format,
        alphaMode: 'premultiplied',
      });
    }
  }

  setLevel(level: number) {
    this.level = level;
  }

  emitWhack(x: number, y: number) {
    this.particleSystem.emitWhack(x, y);
  }

  emitBombHit(x: number, y: number) {
    this.particleSystem.emitBombHit(x, y);
  }

  emitGoldenHit(x: number, y: number) {
    this.particleSystem.emitGoldenHit(x, y);
  }

  emitMolePopup(x: number, y: number) {
    this.particleSystem.emitMolePopup(x, y);
  }

  emitMiss(x: number, y: number) {
    this.particleSystem.emitMiss(x, y);
  }

  emitGameOver(x: number, y: number, isVictory: boolean) {
    this.particleSystem.emitGameOver(x, y, isVictory);
  }

  clear() {
    this.particleSystem.clear();
  }
}
