/**
 * Puzzle Fighter WebGPU Renderer
 * Game #172 - VS Battle Arena Theme
 */

import { backgroundShader, particleShader } from "./shaders";
import { ParticleSystem } from "./particles";

export class WebGPURenderer {
  private canvas: HTMLCanvasElement;
  private device: GPUDevice | null = null;
  private context: GPUCanvasContext | null = null;
  private backgroundPipeline: GPURenderPipeline | null = null;
  private particlePipeline: GPURenderPipeline | null = null;
  private uniformBuffer: GPUBuffer | null = null;
  private particleBuffer: GPUBuffer | null = null;
  private backgroundBindGroup: GPUBindGroup | null = null;
  private particleBindGroup: GPUBindGroup | null = null;
  private particleSystem: ParticleSystem;
  private time: number = 0;
  private intensity: number = 1.0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.particleSystem = new ParticleSystem();
  }

  public async initialize(): Promise<boolean> {
    if (!navigator.gpu) {
      return false;
    }

    try {
      const adapter = await navigator.gpu.requestAdapter();
      if (!adapter) return false;

      this.device = await adapter.requestDevice();
      this.context = this.canvas.getContext("webgpu");
      if (!this.context) return false;

      const format = navigator.gpu.getPreferredCanvasFormat();
      this.context.configure({
        device: this.device,
        format,
        alphaMode: "premultiplied",
      });

      this.createBuffers();
      this.createPipelines(format);

      return true;
    } catch {
      return false;
    }
  }

  private createBuffers(): void {
    if (!this.device) return;

    // Uniform buffer
    this.uniformBuffer = this.device.createBuffer({
      size: 32,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    // Particle buffer
    this.particleBuffer = this.device.createBuffer({
      size: 2000 * 12 * 4,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });
  }

  private createPipelines(format: GPUTextureFormat): void {
    if (!this.device || !this.uniformBuffer || !this.particleBuffer) return;

    // Background pipeline
    const bgModule = this.device.createShaderModule({
      code: backgroundShader,
    });

    const bgBindGroupLayout = this.device.createBindGroupLayout({
      entries: [
        { binding: 0, visibility: GPUShaderStage.FRAGMENT, buffer: { type: "uniform" } },
      ],
    });

    this.backgroundPipeline = this.device.createRenderPipeline({
      layout: this.device.createPipelineLayout({
        bindGroupLayouts: [bgBindGroupLayout],
      }),
      vertex: { module: bgModule, entryPoint: "vertexMain" },
      fragment: {
        module: bgModule,
        entryPoint: "fragmentMain",
        targets: [{ format }],
      },
      primitive: { topology: "triangle-strip" },
    });

    this.backgroundBindGroup = this.device.createBindGroup({
      layout: bgBindGroupLayout,
      entries: [{ binding: 0, resource: { buffer: this.uniformBuffer } }],
    });

    // Particle pipeline
    const particleModule = this.device.createShaderModule({
      code: particleShader,
    });

    const particleBindGroupLayout = this.device.createBindGroupLayout({
      entries: [
        { binding: 0, visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT, buffer: { type: "uniform" } },
        { binding: 1, visibility: GPUShaderStage.VERTEX, buffer: { type: "read-only-storage" } },
      ],
    });

    this.particlePipeline = this.device.createRenderPipeline({
      layout: this.device.createPipelineLayout({
        bindGroupLayouts: [particleBindGroupLayout],
      }),
      vertex: { module: particleModule, entryPoint: "vertexMain" },
      fragment: {
        module: particleModule,
        entryPoint: "fragmentMain",
        targets: [{
          format,
          blend: {
            color: { srcFactor: "src-alpha", dstFactor: "one", operation: "add" },
            alpha: { srcFactor: "one", dstFactor: "one", operation: "add" },
          },
        }],
      },
      primitive: { topology: "triangle-strip" },
    });

    this.particleBindGroup = this.device.createBindGroup({
      layout: particleBindGroupLayout,
      entries: [
        { binding: 0, resource: { buffer: this.uniformBuffer } },
        { binding: 1, resource: { buffer: this.particleBuffer } },
      ],
    });
  }

  public resize(width: number, height: number): void {
    // Canvas resize handled externally
  }

  public render(deltaTime: number): void {
    if (!this.device || !this.context || !this.backgroundPipeline || !this.particlePipeline) return;

    this.time += deltaTime;
    this.particleSystem.update(deltaTime);

    // Update uniforms
    const uniformData = new Float32Array([
      this.time,
      0,
      this.canvas.width,
      this.canvas.height,
      this.intensity,
      0, 0, 0,
    ]);
    this.device.queue.writeBuffer(this.uniformBuffer!, 0, uniformData);

    // Update particles
    const particleData = this.particleSystem.getParticleData();
    if (particleData.length > 0) {
      this.device.queue.writeBuffer(this.particleBuffer!, 0, particleData);
    }

    const commandEncoder = this.device.createCommandEncoder();
    const textureView = this.context.getCurrentTexture().createView();

    const renderPass = commandEncoder.beginRenderPass({
      colorAttachments: [{
        view: textureView,
        clearValue: { r: 0.06, g: 0.06, b: 0.12, a: 1 },
        loadOp: "clear",
        storeOp: "store",
      }],
    });

    // Draw background
    renderPass.setPipeline(this.backgroundPipeline);
    renderPass.setBindGroup(0, this.backgroundBindGroup!);
    renderPass.draw(4);

    // Draw particles
    if (this.particleSystem.particles.length > 0) {
      renderPass.setPipeline(this.particlePipeline);
      renderPass.setBindGroup(0, this.particleBindGroup!);
      renderPass.draw(4, this.particleSystem.particles.length);
    }

    renderPass.end();
    this.device.queue.submit([commandEncoder.finish()]);
  }

  // Particle emission methods
  public emitBlockClear(x: number, y: number, colorIndex: number): void {
    this.particleSystem.emitBlockClear(x, y, colorIndex);
  }

  public emitGarbageSend(x: number, y: number, isPlayer: boolean): void {
    this.particleSystem.emitGarbageSend(x, y, isPlayer);
  }

  public emitGarbageReceive(x: number, y: number): void {
    this.particleSystem.emitGarbageReceive(x, y);
  }

  public emitCombo(x: number, y: number, comboCount: number): void {
    this.particleSystem.emitCombo(x, y, comboCount);
  }

  public emitPieceLock(x: number, y: number, colorIndex: number): void {
    this.particleSystem.emitPieceLock(x, y, colorIndex);
  }

  public emitGameOver(x: number, y: number, playerWon: boolean): void {
    this.particleSystem.emitGameOver(x, y, playerWon);
  }

  public clear(): void {
    this.particleSystem.clear();
  }

  public setIntensity(intensity: number): void {
    this.intensity = intensity;
  }
}
