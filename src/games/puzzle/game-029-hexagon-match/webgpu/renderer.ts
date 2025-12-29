/**
 * WebGPU Renderer - Hexagon Match
 * Crystalline Honeycomb Theme
 * Game #029
 */

import { ParticleSystem, Particle } from './particles';
import { backgroundShader, particleShader, lineClearShader } from './shaders';

export class WebGPURenderer {
  private canvas: HTMLCanvasElement;
  private device!: GPUDevice;
  private context!: GPUCanvasContext;
  private format!: GPUTextureFormat;

  private backgroundPipeline!: GPURenderPipeline;
  private backgroundUniformBuffer!: GPUBuffer;
  private backgroundBindGroup!: GPUBindGroup;

  private particlePipeline!: GPURenderPipeline;
  private particleUniformBuffer!: GPUBuffer;
  private particleStorageBuffer!: GPUBuffer;
  private particleBindGroup!: GPUBindGroup;

  private lineClearPipeline!: GPURenderPipeline;
  private lineClearUniformBuffer!: GPUBuffer;
  private lineClearBindGroup!: GPUBindGroup;

  private particleSystem: ParticleSystem;
  private startTime: number;
  private lineClearIntensity: number = 0;
  private lineClearCenter: { x: number; y: number } = { x: 0.5, y: 0.4 };
  private maxParticles = 400;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.particleSystem = new ParticleSystem();
    this.startTime = performance.now();
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

    this.createBackgroundPipeline();
    this.createParticlePipeline();
    this.createLineClearPipeline();

    return true;
  }

  private createBackgroundPipeline(): void {
    const module = this.device.createShaderModule({
      label: 'Background Shader',
      code: backgroundShader,
    });

    this.backgroundUniformBuffer = this.device.createBuffer({
      size: 16,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    const bindGroupLayout = this.device.createBindGroupLayout({
      entries: [{
        binding: 0,
        visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
        buffer: { type: 'uniform' },
      }],
    });

    this.backgroundBindGroup = this.device.createBindGroup({
      layout: bindGroupLayout,
      entries: [{
        binding: 0,
        resource: { buffer: this.backgroundUniformBuffer },
      }],
    });

    this.backgroundPipeline = this.device.createRenderPipeline({
      layout: this.device.createPipelineLayout({
        bindGroupLayouts: [bindGroupLayout],
      }),
      vertex: {
        module,
        entryPoint: 'vertexMain',
      },
      fragment: {
        module,
        entryPoint: 'fragmentMain',
        targets: [{ format: this.format }],
      },
      primitive: { topology: 'triangle-list' },
    });
  }

  private createParticlePipeline(): void {
    const module = this.device.createShaderModule({
      label: 'Particle Shader',
      code: particleShader,
    });

    this.particleUniformBuffer = this.device.createBuffer({
      size: 16,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    this.particleStorageBuffer = this.device.createBuffer({
      size: this.maxParticles * 48,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });

    const bindGroupLayout = this.device.createBindGroupLayout({
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
          buffer: { type: 'uniform' },
        },
        {
          binding: 1,
          visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
          buffer: { type: 'read-only-storage' },
        },
      ],
    });

    this.particleBindGroup = this.device.createBindGroup({
      layout: bindGroupLayout,
      entries: [
        { binding: 0, resource: { buffer: this.particleUniformBuffer } },
        { binding: 1, resource: { buffer: this.particleStorageBuffer } },
      ],
    });

    this.particlePipeline = this.device.createRenderPipeline({
      layout: this.device.createPipelineLayout({
        bindGroupLayouts: [bindGroupLayout],
      }),
      vertex: {
        module,
        entryPoint: 'vertexMain',
      },
      fragment: {
        module,
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
  }

  private createLineClearPipeline(): void {
    const module = this.device.createShaderModule({
      label: 'Line Clear Shader',
      code: lineClearShader,
    });

    this.lineClearUniformBuffer = this.device.createBuffer({
      size: 16,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    const bindGroupLayout = this.device.createBindGroupLayout({
      entries: [{
        binding: 0,
        visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
        buffer: { type: 'uniform' },
      }],
    });

    this.lineClearBindGroup = this.device.createBindGroup({
      layout: bindGroupLayout,
      entries: [{
        binding: 0,
        resource: { buffer: this.lineClearUniformBuffer },
      }],
    });

    this.lineClearPipeline = this.device.createRenderPipeline({
      layout: this.device.createPipelineLayout({
        bindGroupLayouts: [bindGroupLayout],
      }),
      vertex: {
        module,
        entryPoint: 'vertexMain',
      },
      fragment: {
        module,
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
  }

  emitPlace(x: number, y: number, color: string): void {
    this.particleSystem.emitPlace(x, y, color);
  }

  emitClear(x: number, y: number): void {
    this.particleSystem.emitClear(x, y);
    this.lineClearIntensity = 1.0;
    this.lineClearCenter = { x, y };
  }

  emitDragTrail(x: number, y: number): void {
    this.particleSystem.emitDragTrail(x, y);
  }

  emitGameOver(x: number, y: number): void {
    this.particleSystem.emitGameOver(x, y);
  }

  render(): void {
    const time = (performance.now() - this.startTime) / 1000;
    const deltaTime = 16.67;

    this.particleSystem.update(deltaTime);
    this.particleSystem.emitAmbient();

    // Fade line clear effect
    this.lineClearIntensity *= 0.95;

    const commandEncoder = this.device.createCommandEncoder();
    const textureView = this.context.getCurrentTexture().createView();

    // Background pass
    {
      const pass = commandEncoder.beginRenderPass({
        colorAttachments: [{
          view: textureView,
          clearValue: { r: 0.05, g: 0.03, b: 0.02, a: 1 },
          loadOp: 'clear',
          storeOp: 'store',
        }],
      });

      this.device.queue.writeBuffer(
        this.backgroundUniformBuffer,
        0,
        new Float32Array([time, this.canvas.width / this.canvas.height, 0, 0])
      );

      pass.setPipeline(this.backgroundPipeline);
      pass.setBindGroup(0, this.backgroundBindGroup);
      pass.draw(6);
      pass.end();
    }

    // Particles pass
    const particles = this.particleSystem.getParticles();
    if (particles.length > 0) {
      const pass = commandEncoder.beginRenderPass({
        colorAttachments: [{
          view: textureView,
          loadOp: 'load',
          storeOp: 'store',
        }],
      });

      this.device.queue.writeBuffer(
        this.particleUniformBuffer,
        0,
        new Float32Array([time, this.canvas.width / this.canvas.height, 0, 0])
      );

      const typeMap: Record<string, number> = {
        'place': 0,
        'clear': 1,
        'drag': 2,
        'ambient': 3,
      };

      const particleData = new Float32Array(particles.length * 12);
      particles.forEach((p, i) => {
        particleData[i * 12] = p.x;
        particleData[i * 12 + 1] = p.y;
        particleData[i * 12 + 2] = p.vx;
        particleData[i * 12 + 3] = p.vy;
        particleData[i * 12 + 4] = p.life;
        particleData[i * 12 + 5] = p.maxLife;
        particleData[i * 12 + 6] = p.size;
        particleData[i * 12 + 7] = typeMap[p.type] || 0;
        particleData[i * 12 + 8] = p.color[0];
        particleData[i * 12 + 9] = p.color[1];
        particleData[i * 12 + 10] = p.color[2];
        particleData[i * 12 + 11] = p.color[3];
      });

      this.device.queue.writeBuffer(this.particleStorageBuffer, 0, particleData);

      pass.setPipeline(this.particlePipeline);
      pass.setBindGroup(0, this.particleBindGroup);
      pass.draw(6, particles.length);
      pass.end();
    }

    // Line clear overlay
    if (this.lineClearIntensity > 0.01) {
      const pass = commandEncoder.beginRenderPass({
        colorAttachments: [{
          view: textureView,
          loadOp: 'load',
          storeOp: 'store',
        }],
      });

      this.device.queue.writeBuffer(
        this.lineClearUniformBuffer,
        0,
        new Float32Array([time, this.lineClearIntensity, this.lineClearCenter.x, this.lineClearCenter.y])
      );

      pass.setPipeline(this.lineClearPipeline);
      pass.setBindGroup(0, this.lineClearBindGroup);
      pass.draw(6);
      pass.end();
    }

    this.device.queue.submit([commandEncoder.finish()]);
  }

  destroy(): void {
    this.backgroundUniformBuffer?.destroy();
    this.particleUniformBuffer?.destroy();
    this.particleStorageBuffer?.destroy();
    this.lineClearUniformBuffer?.destroy();
  }
}
