/**
 * WebGPU Renderer - Block Tower
 * Neon Skyline Theme
 * Game #028
 */

import { ParticleSystem, Particle } from './particles';
import { backgroundShader, particleShader, blockGlowShader, gameOverShader } from './shaders';

export interface BlockData {
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  isStatic: boolean;
}

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

  private blockPipeline!: GPURenderPipeline;
  private blockUniformBuffer!: GPUBuffer;
  private blockStorageBuffer!: GPUBuffer;
  private blockBindGroup!: GPUBindGroup;

  private gameOverPipeline!: GPURenderPipeline;
  private gameOverUniformBuffer!: GPUBuffer;
  private gameOverBindGroup!: GPUBindGroup;

  private particleSystem: ParticleSystem;
  private startTime: number;
  private cameraY: number = 0;
  private gameOverIntensity: number = 0;
  private maxBlocks = 100;
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
    this.createBlockPipeline();
    this.createGameOverPipeline();

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

  private createBlockPipeline(): void {
    const module = this.device.createShaderModule({
      label: 'Block Glow Shader',
      code: blockGlowShader,
    });

    this.blockUniformBuffer = this.device.createBuffer({
      size: 16,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    this.blockStorageBuffer = this.device.createBuffer({
      size: this.maxBlocks * 32,
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

    this.blockBindGroup = this.device.createBindGroup({
      layout: bindGroupLayout,
      entries: [
        { binding: 0, resource: { buffer: this.blockUniformBuffer } },
        { binding: 1, resource: { buffer: this.blockStorageBuffer } },
      ],
    });

    this.blockPipeline = this.device.createRenderPipeline({
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

  private createGameOverPipeline(): void {
    const module = this.device.createShaderModule({
      label: 'Game Over Shader',
      code: gameOverShader,
    });

    this.gameOverUniformBuffer = this.device.createBuffer({
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

    this.gameOverBindGroup = this.device.createBindGroup({
      layout: bindGroupLayout,
      entries: [{
        binding: 0,
        resource: { buffer: this.gameOverUniformBuffer },
      }],
    });

    this.gameOverPipeline = this.device.createRenderPipeline({
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

  private hexToRgb(hex: string): [number, number, number] {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (result) {
      return [
        parseInt(result[1], 16) / 255,
        parseInt(result[2], 16) / 255,
        parseInt(result[3], 16) / 255,
      ];
    }
    return [1, 0.5, 0];
  }

  setCameraY(y: number): void {
    this.cameraY = y;
  }

  emitLanding(x: number, y: number, color: string): void {
    this.particleSystem.emitLanding(x, y, color);
  }

  emitDebris(x: number, y: number, color: string): void {
    this.particleSystem.emitDebris(x, y, color);
  }

  emitHeightAchievement(x: number, y: number): void {
    this.particleSystem.emitHeightAchievement(x, y);
  }

  triggerGameOver(): void {
    this.gameOverIntensity = 1.0;
  }

  render(blocks: BlockData[]): void {
    const time = (performance.now() - this.startTime) / 1000;
    const deltaTime = 16.67;

    this.particleSystem.update(deltaTime);
    this.particleSystem.emitAmbient();

    // Fade game over effect
    this.gameOverIntensity *= 0.98;

    const commandEncoder = this.device.createCommandEncoder();
    const textureView = this.context.getCurrentTexture().createView();

    // Background pass
    {
      const pass = commandEncoder.beginRenderPass({
        colorAttachments: [{
          view: textureView,
          clearValue: { r: 0.01, g: 0.02, b: 0.04, a: 1 },
          loadOp: 'clear',
          storeOp: 'store',
        }],
      });

      this.device.queue.writeBuffer(
        this.backgroundUniformBuffer,
        0,
        new Float32Array([time, this.canvas.width / this.canvas.height, this.cameraY, 0])
      );

      pass.setPipeline(this.backgroundPipeline);
      pass.setBindGroup(0, this.backgroundBindGroup);
      pass.draw(6);
      pass.end();
    }

    // Blocks pass
    if (blocks.length > 0) {
      const pass = commandEncoder.beginRenderPass({
        colorAttachments: [{
          view: textureView,
          loadOp: 'load',
          storeOp: 'store',
        }],
      });

      this.device.queue.writeBuffer(
        this.blockUniformBuffer,
        0,
        new Float32Array([time, blocks.length, this.cameraY, 0])
      );

      const blockData = new Float32Array(blocks.length * 8);
      blocks.forEach((block, i) => {
        const rgb = this.hexToRgb(block.color);
        blockData[i * 8] = block.x;
        blockData[i * 8 + 1] = block.y;
        blockData[i * 8 + 2] = block.width;
        blockData[i * 8 + 3] = block.height;
        blockData[i * 8 + 4] = rgb[0];
        blockData[i * 8 + 5] = rgb[1];
        blockData[i * 8 + 6] = rgb[2];
        blockData[i * 8 + 7] = block.isStatic ? 1.0 : 0.0;
      });

      this.device.queue.writeBuffer(this.blockStorageBuffer, 0, blockData);

      pass.setPipeline(this.blockPipeline);
      pass.setBindGroup(0, this.blockBindGroup);
      pass.draw(6, blocks.length);
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
        new Float32Array([time, this.canvas.width / this.canvas.height, this.cameraY, 0])
      );

      const typeMap: Record<string, number> = {
        'landing': 0,
        'debris': 1,
        'sparkle': 2,
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

    // Game over pass
    if (this.gameOverIntensity > 0.01) {
      const pass = commandEncoder.beginRenderPass({
        colorAttachments: [{
          view: textureView,
          loadOp: 'load',
          storeOp: 'store',
        }],
      });

      this.device.queue.writeBuffer(
        this.gameOverUniformBuffer,
        0,
        new Float32Array([time, this.gameOverIntensity, 0, 0])
      );

      pass.setPipeline(this.gameOverPipeline);
      pass.setBindGroup(0, this.gameOverBindGroup);
      pass.draw(6);
      pass.end();
    }

    this.device.queue.submit([commandEncoder.finish()]);
  }

  destroy(): void {
    this.backgroundUniformBuffer?.destroy();
    this.particleUniformBuffer?.destroy();
    this.particleStorageBuffer?.destroy();
    this.blockUniformBuffer?.destroy();
    this.blockStorageBuffer?.destroy();
    this.gameOverUniformBuffer?.destroy();
  }
}
