/**
 * Bowling WebGPU Renderer
 * Game #170 - Bowling alley themed rendering
 */

import { backgroundShader, particleShader } from "./shaders";
import {
  ParticleManager,
  createParticleData,
  PARTICLE_STRIDE,
  MAX_PARTICLES,
} from "./particles";

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

  private particleManager: ParticleManager;
  private particleData: Float32Array;

  private time: number = 0;
  private initialized: boolean = false;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.particleManager = new ParticleManager();
    this.particleData = createParticleData();
  }

  async initialize(): Promise<boolean> {
    if (!navigator.gpu) {
      console.warn("WebGPU not supported");
      return false;
    }

    try {
      const adapter = await navigator.gpu.requestAdapter();
      if (!adapter) {
        console.warn("No GPU adapter found");
        return false;
      }

      this.device = await adapter.requestDevice();
      this.context = this.canvas.getContext("webgpu") as GPUCanvasContext;
      this.format = navigator.gpu.getPreferredCanvasFormat();

      this.context.configure({
        device: this.device,
        format: this.format,
        alphaMode: "premultiplied",
      });

      this.createBuffers();
      this.createPipelines();
      this.createBindGroups();

      this.initialized = true;
      return true;
    } catch (e) {
      console.warn("WebGPU initialization failed:", e);
      return false;
    }
  }

  private createBuffers(): void {
    // Uniform buffer
    this.uniformBuffer = this.device.createBuffer({
      size: 8,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    // Particle buffer
    this.particleBuffer = this.device.createBuffer({
      size: MAX_PARTICLES * PARTICLE_STRIDE * 4,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });
  }

  private createPipelines(): void {
    // Background pipeline
    const backgroundModule = this.device.createShaderModule({
      code: backgroundShader,
    });

    this.backgroundPipeline = this.device.createRenderPipeline({
      layout: "auto",
      vertex: {
        module: backgroundModule,
        entryPoint: "vertexMain",
      },
      fragment: {
        module: backgroundModule,
        entryPoint: "fragmentMain",
        targets: [{ format: this.format }],
      },
      primitive: {
        topology: "triangle-strip",
      },
    });

    // Particle pipeline
    const particleModule = this.device.createShaderModule({
      code: particleShader,
    });

    this.particlePipeline = this.device.createRenderPipeline({
      layout: "auto",
      vertex: {
        module: particleModule,
        entryPoint: "vertexMain",
      },
      fragment: {
        module: particleModule,
        entryPoint: "fragmentMain",
        targets: [
          {
            format: this.format,
            blend: {
              color: {
                srcFactor: "src-alpha",
                dstFactor: "one",
                operation: "add",
              },
              alpha: {
                srcFactor: "one",
                dstFactor: "one",
                operation: "add",
              },
            },
          },
        ],
      },
      primitive: {
        topology: "triangle-strip",
      },
    });
  }

  private createBindGroups(): void {
    this.backgroundBindGroup = this.device.createBindGroup({
      layout: this.backgroundPipeline.getBindGroupLayout(0),
      entries: [
        {
          binding: 0,
          resource: { buffer: this.uniformBuffer },
        },
      ],
    });

    this.particleBindGroup = this.device.createBindGroup({
      layout: this.particlePipeline.getBindGroupLayout(0),
      entries: [
        {
          binding: 0,
          resource: { buffer: this.uniformBuffer },
        },
        {
          binding: 1,
          resource: { buffer: this.particleBuffer },
        },
      ],
    });
  }

  public resize(width: number, height: number): void {
    if (!this.initialized) return;

    this.context.configure({
      device: this.device,
      format: this.format,
      alphaMode: "premultiplied",
    });
  }

  public render(delta: number): void {
    if (!this.initialized) return;

    this.time += delta;
    this.particleManager.update(delta);

    // Update uniforms
    const aspectRatio = this.canvas.width / this.canvas.height;
    const uniformData = new Float32Array([this.time, aspectRatio]);
    this.device.queue.writeBuffer(this.uniformBuffer, 0, uniformData);

    // Update particles
    const particleCount = this.particleManager.writeToBuffer(this.particleData);
    if (particleCount > 0) {
      this.device.queue.writeBuffer(this.particleBuffer, 0, this.particleData);
    }

    // Render
    const commandEncoder = this.device.createCommandEncoder();
    const textureView = this.context.getCurrentTexture().createView();

    const renderPass = commandEncoder.beginRenderPass({
      colorAttachments: [
        {
          view: textureView,
          clearValue: { r: 0.1, g: 0.12, b: 0.15, a: 1.0 },
          loadOp: "clear",
          storeOp: "store",
        },
      ],
    });

    // Draw background
    renderPass.setPipeline(this.backgroundPipeline);
    renderPass.setBindGroup(0, this.backgroundBindGroup);
    renderPass.draw(4);

    // Draw particles
    if (particleCount > 0) {
      renderPass.setPipeline(this.particlePipeline);
      renderPass.setBindGroup(0, this.particleBindGroup);
      renderPass.draw(4, particleCount);
    }

    renderPass.end();
    this.device.queue.submit([commandEncoder.finish()]);
  }

  // Emit functions for game events
  public emitBallRoll(x: number, y: number): void {
    this.particleManager.emitBallRoll(x, y);
  }

  public emitPinHit(x: number, y: number): void {
    this.particleManager.emitPinHit(x, y);
  }

  public emitPinFall(x: number, y: number): void {
    this.particleManager.emitPinFall(x, y);
  }

  public emitStrike(x: number, y: number): void {
    this.particleManager.emitStrike(x, y);
  }

  public emitSpare(x: number, y: number): void {
    this.particleManager.emitSpare(x, y);
  }

  public emitGameOver(x: number, y: number, victory: boolean): void {
    this.particleManager.emitGameOver(x, y, victory);
  }

  public clear(): void {
    this.particleManager.clear();
  }
}
