/**
 * WebGPU Renderer - Scrabble Lite
 * Vintage Letterpress Theme
 * Game #031
 */

import { ParticleSystem, Particle } from './particles';
import { backgroundShader, particleShader, scoreShader } from './shaders';

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

  private scorePipeline!: GPURenderPipeline;
  private scoreUniformBuffer!: GPUBuffer;
  private scoreBindGroup!: GPUBindGroup;

  private particleSystem: ParticleSystem;
  private startTime: number;
  private scoreIntensity: number = 0;
  private maxParticles = 300;

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
    this.createScorePipeline();

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
            color: { srcFactor: 'src-alpha', dstFactor: 'one-minus-src-alpha', operation: 'add' },
            alpha: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' },
          },
        }],
      },
      primitive: { topology: 'triangle-list' },
    });
  }

  private createScorePipeline(): void {
    const module = this.device.createShaderModule({
      label: 'Score Shader',
      code: scoreShader,
    });

    this.scoreUniformBuffer = this.device.createBuffer({
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

    this.scoreBindGroup = this.device.createBindGroup({
      layout: bindGroupLayout,
      entries: [{
        binding: 0,
        resource: { buffer: this.scoreUniformBuffer },
      }],
    });

    this.scorePipeline = this.device.createRenderPipeline({
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

  emitPlace(x: number, y: number): void {
    this.particleSystem.emitPlace(x, y);
  }

  emitDrag(x: number, y: number): void {
    this.particleSystem.emitDrag(x, y);
  }

  emitScore(x: number, y: number, points: number): void {
    this.scoreIntensity = 1.0;
    this.particleSystem.emitScore(x, y, points);
  }

  render(): void {
    const time = (performance.now() - this.startTime) / 1000;
    const deltaTime = 16.67;

    this.particleSystem.update(deltaTime);
    this.particleSystem.emitAmbient();

    // Fade score effect
    this.scoreIntensity *= 0.97;

    const commandEncoder = this.device.createCommandEncoder();
    const textureView = this.context.getCurrentTexture().createView();

    // Background pass
    {
      const pass = commandEncoder.beginRenderPass({
        colorAttachments: [{
          view: textureView,
          clearValue: { r: 0.25, g: 0.15, b: 0.1, a: 1 },
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
        'drag': 1,
        'score': 2,
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

    // Score overlay
    if (this.scoreIntensity > 0.01) {
      const pass = commandEncoder.beginRenderPass({
        colorAttachments: [{
          view: textureView,
          loadOp: 'load',
          storeOp: 'store',
        }],
      });

      this.device.queue.writeBuffer(
        this.scoreUniformBuffer,
        0,
        new Float32Array([time, this.scoreIntensity, 0, 0])
      );

      pass.setPipeline(this.scorePipeline);
      pass.setBindGroup(0, this.scoreBindGroup);
      pass.draw(6);
      pass.end();
    }

    this.device.queue.submit([commandEncoder.finish()]);
  }

  destroy(): void {
    this.backgroundUniformBuffer?.destroy();
    this.particleUniformBuffer?.destroy();
    this.particleStorageBuffer?.destroy();
    this.scoreUniformBuffer?.destroy();
  }
}
