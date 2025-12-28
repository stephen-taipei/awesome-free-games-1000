/**
 * WebGPU Renderer - Claw Machine
 * Arcade / UFO Catcher / Purple and Neon Theme
 * Game #164
 */

import { BACKGROUND_SHADER, PARTICLE_SHADER } from './shaders';
import { ParticleSystem } from './particles';

export class WebGPURenderer {
  private canvas: HTMLCanvasElement;
  private device!: GPUDevice;
  private context!: GPUCanvasContext;
  private format!: GPUTextureFormat;

  private bgPipeline!: GPURenderPipeline;
  private particlePipeline!: GPURenderPipeline;
  private uniformBuffer!: GPUBuffer;
  private uniformBindGroup!: GPUBindGroup;
  private particleBuffer!: GPUBuffer;
  private particleBindGroup!: GPUBindGroup;

  private particleSystem: ParticleSystem;
  private time = 0;
  private level = 1;
  private initialized = false;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.particleSystem = new ParticleSystem();
  }

  async initialize(): Promise<boolean> {
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
      this.context = this.canvas.getContext('webgpu') as GPUCanvasContext;
      this.format = navigator.gpu.getPreferredCanvasFormat();

      this.context.configure({
        device: this.device,
        format: this.format,
        alphaMode: 'premultiplied',
      });

      this.createPipelines();
      this.createBuffers();
      this.initialized = true;
      return true;
    } catch (e) {
      console.warn('WebGPU initialization failed:', e);
      return false;
    }
  }

  private createPipelines() {
    // Background pipeline
    const bgShaderModule = this.device.createShaderModule({
      code: BACKGROUND_SHADER
    });

    this.bgPipeline = this.device.createRenderPipeline({
      layout: 'auto',
      vertex: {
        module: bgShaderModule,
        entryPoint: 'vertexMain',
      },
      fragment: {
        module: bgShaderModule,
        entryPoint: 'fragmentMain',
        targets: [{ format: this.format }],
      },
      primitive: { topology: 'triangle-list' },
    });

    // Particle pipeline
    const particleShaderModule = this.device.createShaderModule({
      code: PARTICLE_SHADER
    });

    this.particlePipeline = this.device.createRenderPipeline({
      layout: 'auto',
      vertex: {
        module: particleShaderModule,
        entryPoint: 'vertexMain',
      },
      fragment: {
        module: particleShaderModule,
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
      primitive: { topology: 'triangle-list' },
    });
  }

  private createBuffers() {
    // Uniform buffer
    this.uniformBuffer = this.device.createBuffer({
      size: 16,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    this.uniformBindGroup = this.device.createBindGroup({
      layout: this.bgPipeline.getBindGroupLayout(0),
      entries: [{
        binding: 0,
        resource: { buffer: this.uniformBuffer }
      }]
    });

    // Particle buffer
    this.particleBuffer = this.device.createBuffer({
      size: 12 * 4 * 800, // 12 floats per particle, max 800
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });

    this.particleBindGroup = this.device.createBindGroup({
      layout: this.particlePipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: this.uniformBuffer } },
        { binding: 1, resource: { buffer: this.particleBuffer } }
      ]
    });
  }

  render(delta: number) {
    if (!this.initialized) return;

    this.time += delta;
    this.particleSystem.update(delta);

    // Update uniforms
    const uniformData = new Float32Array([
      this.time,
      this.canvas.width,
      this.canvas.height,
      this.level
    ]);
    this.device.queue.writeBuffer(this.uniformBuffer, 0, uniformData);

    // Update particles
    const particleData = this.particleSystem.getData();
    if (particleData.length > 0) {
      this.device.queue.writeBuffer(this.particleBuffer, 0, particleData);
    }

    const commandEncoder = this.device.createCommandEncoder();
    const textureView = this.context.getCurrentTexture().createView();

    const renderPass = commandEncoder.beginRenderPass({
      colorAttachments: [{
        view: textureView,
        clearValue: { r: 0.08, g: 0.05, b: 0.12, a: 1.0 },
        loadOp: 'clear',
        storeOp: 'store',
      }]
    });

    // Draw background
    renderPass.setPipeline(this.bgPipeline);
    renderPass.setBindGroup(0, this.uniformBindGroup);
    renderPass.draw(6);

    // Draw particles
    const particleCount = this.particleSystem.getCount();
    if (particleCount > 0) {
      renderPass.setPipeline(this.particlePipeline);
      renderPass.setBindGroup(0, this.particleBindGroup);
      renderPass.draw(6, particleCount);
    }

    renderPass.end();
    this.device.queue.submit([commandEncoder.finish()]);
  }

  setLevel(level: number) {
    this.level = level;
  }

  resize(width: number, height: number) {
    this.canvas.width = width;
    this.canvas.height = height;
  }

  // Particle emission methods
  emitClawDrop(x: number, y: number) {
    this.particleSystem.emitClawDrop(x, y);
  }

  emitGrab(x: number, y: number, success: boolean) {
    this.particleSystem.emitGrab(x, y, success);
  }

  emitSparkle(x: number, y: number, prizeType: string) {
    this.particleSystem.emitSparkle(x, y, prizeType);
  }

  emitSuccess(x: number, y: number, points: number) {
    this.particleSystem.emitSuccess(x, y, points);
  }

  emitFail(x: number, y: number) {
    this.particleSystem.emitFail(x, y);
  }

  emitGameOver(x: number, y: number, victory: boolean) {
    this.particleSystem.emitGameOver(x, y, victory);
  }

  clear() {
    this.particleSystem.clear();
  }
}
