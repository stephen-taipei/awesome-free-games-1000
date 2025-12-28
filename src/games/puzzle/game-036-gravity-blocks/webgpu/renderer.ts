/**
 * WebGPU Renderer - Gravity Blocks
 * Space Station / Zero-G Lab Theme
 * Game #036
 */

import { backgroundShader, particleShader, gravityFieldShader, victoryShader } from './shaders';
import { ParticleSystem, Particle } from './particles';

export class WebGPURenderer {
  private device!: GPUDevice;
  private context!: GPUCanvasContext;
  private format!: GPUTextureFormat;

  private backgroundPipeline!: GPURenderPipeline;
  private particlePipeline!: GPURenderPipeline;
  private gravityFieldPipeline!: GPURenderPipeline;
  private victoryPipeline!: GPURenderPipeline;

  private backgroundUniformBuffer!: GPUBuffer;
  private particleUniformBuffer!: GPUBuffer;
  private particleStorageBuffer!: GPUBuffer;
  private gravityFieldUniformBuffer!: GPUBuffer;
  private victoryUniformBuffer!: GPUBuffer;

  private backgroundBindGroup!: GPUBindGroup;
  private particleBindGroup!: GPUBindGroup;
  private gravityFieldBindGroup!: GPUBindGroup;
  private victoryBindGroup!: GPUBindGroup;

  private particleSystem: ParticleSystem;
  private startTime: number;

  private victoryIntensity = 0;
  private gravityX = 0;
  private gravityY = 1;
  private gravityIntensity = 0;

  constructor(private canvas: HTMLCanvasElement) {
    this.particleSystem = new ParticleSystem();
    this.startTime = performance.now();
  }

  async initialize(): Promise<boolean> {
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

    this.createPipelines();
    this.createBuffers();
    this.createBindGroups();

    return true;
  }

  private createPipelines(): void {
    // Background pipeline
    const backgroundModule = this.device.createShaderModule({
      label: 'Background Shader',
      code: backgroundShader,
    });

    this.backgroundPipeline = this.device.createRenderPipeline({
      label: 'Background Pipeline',
      layout: 'auto',
      vertex: {
        module: backgroundModule,
        entryPoint: 'vertexMain',
      },
      fragment: {
        module: backgroundModule,
        entryPoint: 'fragmentMain',
        targets: [{ format: this.format }],
      },
    });

    // Particle pipeline
    const particleModule = this.device.createShaderModule({
      label: 'Particle Shader',
      code: particleShader,
    });

    this.particlePipeline = this.device.createRenderPipeline({
      label: 'Particle Pipeline',
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
              srcFactor: 'src-alpha',
              dstFactor: 'one',
              operation: 'add',
            },
          },
        }],
      },
    });

    // Gravity field pipeline
    const gravityFieldModule = this.device.createShaderModule({
      label: 'Gravity Field Shader',
      code: gravityFieldShader,
    });

    this.gravityFieldPipeline = this.device.createRenderPipeline({
      label: 'Gravity Field Pipeline',
      layout: 'auto',
      vertex: {
        module: gravityFieldModule,
        entryPoint: 'vertexMain',
      },
      fragment: {
        module: gravityFieldModule,
        entryPoint: 'fragmentMain',
        targets: [{
          format: this.format,
          blend: {
            color: {
              srcFactor: 'src-alpha',
              dstFactor: 'one-minus-src-alpha',
              operation: 'add',
            },
            alpha: {
              srcFactor: 'src-alpha',
              dstFactor: 'one-minus-src-alpha',
              operation: 'add',
            },
          },
        }],
      },
    });

    // Victory pipeline
    const victoryModule = this.device.createShaderModule({
      label: 'Victory Shader',
      code: victoryShader,
    });

    this.victoryPipeline = this.device.createRenderPipeline({
      label: 'Victory Pipeline',
      layout: 'auto',
      vertex: {
        module: victoryModule,
        entryPoint: 'vertexMain',
      },
      fragment: {
        module: victoryModule,
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
              srcFactor: 'src-alpha',
              dstFactor: 'one',
              operation: 'add',
            },
          },
        }],
      },
    });
  }

  private createBuffers(): void {
    // Background uniforms
    this.backgroundUniformBuffer = this.device.createBuffer({
      size: 16,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    // Particle uniforms
    this.particleUniformBuffer = this.device.createBuffer({
      size: 16,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    // Particle storage
    this.particleStorageBuffer = this.device.createBuffer({
      size: 48 * 300, // 48 bytes per particle, max 300
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });

    // Gravity field uniforms
    this.gravityFieldUniformBuffer = this.device.createBuffer({
      size: 16,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    // Victory uniforms
    this.victoryUniformBuffer = this.device.createBuffer({
      size: 16,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
  }

  private createBindGroups(): void {
    this.backgroundBindGroup = this.device.createBindGroup({
      layout: this.backgroundPipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: this.backgroundUniformBuffer } },
      ],
    });

    this.particleBindGroup = this.device.createBindGroup({
      layout: this.particlePipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: this.particleUniformBuffer } },
        { binding: 1, resource: { buffer: this.particleStorageBuffer } },
      ],
    });

    this.gravityFieldBindGroup = this.device.createBindGroup({
      layout: this.gravityFieldPipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: this.gravityFieldUniformBuffer } },
      ],
    });

    this.victoryBindGroup = this.device.createBindGroup({
      layout: this.victoryPipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: this.victoryUniformBuffer } },
      ],
    });
  }

  private particleTypeToFloat(type: string): number {
    const types: Record<string, number> = {
      'collision': 0,
      'drag': 1,
      'victory': 2,
      'ambient': 3,
      'landing': 4,
    };
    return types[type] ?? 0;
  }

  render(): void {
    const now = performance.now();
    const time = (now - this.startTime) / 1000;
    const aspect = this.canvas.width / this.canvas.height;

    // Update particle system
    this.particleSystem.update(16.67);
    this.particleSystem.emitAmbient();

    // Update uniforms
    this.device.queue.writeBuffer(
      this.backgroundUniformBuffer,
      0,
      new Float32Array([time, aspect, 0, 0])
    );

    this.device.queue.writeBuffer(
      this.particleUniformBuffer,
      0,
      new Float32Array([time, aspect, 0, 0])
    );

    this.device.queue.writeBuffer(
      this.gravityFieldUniformBuffer,
      0,
      new Float32Array([time, this.gravityX, this.gravityY, this.gravityIntensity])
    );

    this.device.queue.writeBuffer(
      this.victoryUniformBuffer,
      0,
      new Float32Array([time, this.victoryIntensity, 0, 0])
    );

    // Update particle storage
    const particles = this.particleSystem.getParticles();
    const particleData = new Float32Array(particles.length * 12);

    particles.forEach((p, i) => {
      const offset = i * 12;
      particleData[offset + 0] = p.x;
      particleData[offset + 1] = p.y;
      particleData[offset + 2] = p.vx;
      particleData[offset + 3] = p.vy;
      particleData[offset + 4] = p.life;
      particleData[offset + 5] = p.maxLife;
      particleData[offset + 6] = p.size;
      particleData[offset + 7] = this.particleTypeToFloat(p.type);
      particleData[offset + 8] = p.color[0];
      particleData[offset + 9] = p.color[1];
      particleData[offset + 10] = p.color[2];
      particleData[offset + 11] = p.color[3];
    });

    this.device.queue.writeBuffer(this.particleStorageBuffer, 0, particleData);

    // Render
    const commandEncoder = this.device.createCommandEncoder();
    const textureView = this.context.getCurrentTexture().createView();

    const renderPass = commandEncoder.beginRenderPass({
      colorAttachments: [{
        view: textureView,
        clearValue: { r: 0.02, g: 0.02, b: 0.05, a: 1 },
        loadOp: 'clear',
        storeOp: 'store',
      }],
    });

    // Background
    renderPass.setPipeline(this.backgroundPipeline);
    renderPass.setBindGroup(0, this.backgroundBindGroup);
    renderPass.draw(6);

    // Gravity field overlay
    if (this.gravityIntensity > 0) {
      renderPass.setPipeline(this.gravityFieldPipeline);
      renderPass.setBindGroup(0, this.gravityFieldBindGroup);
      renderPass.draw(6);
    }

    // Particles
    if (particles.length > 0) {
      renderPass.setPipeline(this.particlePipeline);
      renderPass.setBindGroup(0, this.particleBindGroup);
      renderPass.draw(6, particles.length);
    }

    // Victory overlay
    if (this.victoryIntensity > 0) {
      renderPass.setPipeline(this.victoryPipeline);
      renderPass.setBindGroup(0, this.victoryBindGroup);
      renderPass.draw(6);
    }

    renderPass.end();
    this.device.queue.submit([commandEncoder.finish()]);

    // Fade victory intensity
    if (this.victoryIntensity > 0) {
      this.victoryIntensity *= 0.98;
      if (this.victoryIntensity < 0.01) {
        this.victoryIntensity = 0;
      }
    }

    // Fade gravity intensity
    if (this.gravityIntensity > 0) {
      this.gravityIntensity *= 0.95;
      if (this.gravityIntensity < 0.01) {
        this.gravityIntensity = 0;
      }
    }
  }

  // Block collision effect
  emitCollision(x: number, y: number): void {
    this.particleSystem.emitCollision(x, y);
  }

  // Platform drag effect
  emitDrag(x: number, y: number): void {
    this.particleSystem.emitDrag(x, y);
  }

  // Block landing on target
  emitLanding(x: number, y: number): void {
    this.particleSystem.emitLanding(x, y);
  }

  // Block bounce effect
  emitBounce(x: number, y: number): void {
    this.particleSystem.emitBounce(x, y);
  }

  // Victory celebration
  triggerVictory(): void {
    this.victoryIntensity = 1.0;
    this.particleSystem.emitVictory(0.5, 0.5);
  }

  // Set gravity direction for visual effect
  setGravity(x: number, y: number): void {
    this.gravityX = x;
    this.gravityY = y;
    this.gravityIntensity = 0.5;
  }

  resize(width: number, height: number): void {
    this.canvas.width = width;
    this.canvas.height = height;
  }

  destroy(): void {
    this.backgroundUniformBuffer?.destroy();
    this.particleUniformBuffer?.destroy();
    this.particleStorageBuffer?.destroy();
    this.gravityFieldUniformBuffer?.destroy();
    this.victoryUniformBuffer?.destroy();
  }
}
