/**
 * WebGPU Renderer - Space Station
 * Space Station / Nebula / Cosmic Theme
 * Game #092
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
  private startTime: number = performance.now();
  private animationId: number = 0;
  private currentLevel: number = 0;

  private readonly MAX_PARTICLES = 600;

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
    } catch (e) {
      console.warn('WebGPU initialization failed:', e);
      return false;
    }
  }

  private createBuffers(): void {
    // Uniform buffer: time, width, height, level
    this.uniformBuffer = this.device.createBuffer({
      size: 16,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    // Particle buffer
    const particleStride = 10 * 4; // 10 floats per particle
    this.particleBuffer = this.device.createBuffer({
      size: this.MAX_PARTICLES * particleStride,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });
  }

  private createPipelines(): void {
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

    this.backgroundBindGroup = this.device.createBindGroup({
      layout: backgroundBindGroupLayout,
      entries: [
        { binding: 0, resource: { buffer: this.uniformBuffer } },
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
      primitive: { topology: 'triangle-list' },
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

    this.particleBindGroup = this.device.createBindGroup({
      layout: particleBindGroupLayout,
      entries: [
        { binding: 0, resource: { buffer: this.uniformBuffer } },
        { binding: 1, resource: { buffer: this.particleBuffer } },
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
              dstFactor: 'one-minus-src-alpha',
              operation: 'add',
            },
          },
        }],
      },
      primitive: { topology: 'triangle-list' },
    });
  }

  private startRenderLoop(): void {
    const render = () => {
      this.update();
      this.render();
      this.animationId = requestAnimationFrame(render);
    };
    this.animationId = requestAnimationFrame(render);
  }

  private update(): void {
    this.particleSystem.update(0.016);
  }

  private render(): void {
    const time = (performance.now() - this.startTime) / 1000;

    // Update uniforms
    const uniforms = new Float32Array([
      time,
      this.canvas.width,
      this.canvas.height,
      this.currentLevel,
    ]);
    this.device.queue.writeBuffer(this.uniformBuffer, 0, uniforms);

    // Update particles
    const particles = this.particleSystem.getParticles();
    const particleData = new Float32Array(this.MAX_PARTICLES * 10);

    particles.forEach((p, i) => {
      const offset = i * 10;
      particleData[offset] = p.x;
      particleData[offset + 1] = p.y;
      particleData[offset + 2] = p.vx;
      particleData[offset + 3] = p.vy;
      particleData[offset + 4] = p.life;
      particleData[offset + 5] = p.maxLife;
      particleData[offset + 6] = p.size;
      particleData[offset + 7] = p.particleType;
      particleData[offset + 8] = p.rotation;
      particleData[offset + 9] = p.param1;
    });

    this.device.queue.writeBuffer(this.particleBuffer, 0, particleData);

    // Render
    const commandEncoder = this.device.createCommandEncoder();
    const textureView = this.context.getCurrentTexture().createView();

    const renderPass = commandEncoder.beginRenderPass({
      colorAttachments: [{
        view: textureView,
        clearValue: { r: 0, g: 0, b: 0, a: 0 },
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
      renderPass.draw(6, particles.length);
    }

    renderPass.end();
    this.device.queue.submit([commandEncoder.finish()]);
  }

  // Effect methods
  public emitRotation(x: number, y: number, moduleSize: number = 60): void {
    this.particleSystem.emitRotation(x, y, moduleSize);
  }

  public emitDocking(moduleX: number, moduleY: number, stationX: number, stationY: number): void {
    this.particleSystem.emitDocking(moduleX, moduleY, stationX, stationY);
  }

  public emitUndock(x: number, y: number): void {
    this.particleSystem.emitUndock(x, y);
  }

  public emitVictory(): void {
    const cx = this.canvas.width / 2;
    const cy = this.canvas.height / 2;
    this.particleSystem.emitVictory(cx, cy);
  }

  public emitLevelStart(centerX: number, centerY: number): void {
    this.particleSystem.emitLevelStart(centerX, centerY);
    this.currentLevel++;
  }

  public emitReset(): void {
    this.particleSystem.emitReset();
  }

  public emitHover(x: number, y: number): void {
    this.particleSystem.emitHover(x, y);
  }

  public resize(width: number, height: number): void {
    this.canvas.width = width;
    this.canvas.height = height;
  }

  public destroy(): void {
    cancelAnimationFrame(this.animationId);
    this.particleSystem.clear();
  }
}
