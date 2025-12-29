/**
 * WebGPU Renderer - Dart Throw
 * Pub / Darts / Red and Green Theme
 * Game #167
 */

import { ParticleSystem } from './particles';
import { BACKGROUND_SHADER, PARTICLE_SHADER } from './shaders';
import { DART_COLORS, randomRange, getRandomConfettiColor, getScoreColor } from './math';

export class WebGPURenderer {
  private canvas: HTMLCanvasElement;
  private device!: GPUDevice;
  private context!: GPUCanvasContext;
  private format!: GPUTextureFormat;

  private bgPipeline!: GPURenderPipeline;
  private bgUniformBuffer!: GPUBuffer;
  private bgBindGroup!: GPUBindGroup;

  private particlePipeline!: GPURenderPipeline;
  private particleUniformBuffer!: GPUBuffer;
  private particleStorageBuffer!: GPUBuffer;
  private particleBindGroup!: GPUBindGroup;

  private particleSystem: ParticleSystem;
  private time: number = 0;
  private level: number = 1;
  private initialized: boolean = false;

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

      await this.createBackgroundPipeline();
      await this.createParticlePipeline();

      this.initialized = true;
      return true;
    } catch (e) {
      console.error('WebGPU initialization failed:', e);
      return false;
    }
  }

  private async createBackgroundPipeline() {
    const shaderModule = this.device.createShaderModule({
      code: BACKGROUND_SHADER,
    });

    this.bgUniformBuffer = this.device.createBuffer({
      size: 16,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    const bindGroupLayout = this.device.createBindGroupLayout({
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.FRAGMENT,
          buffer: { type: 'uniform' },
        },
      ],
    });

    this.bgBindGroup = this.device.createBindGroup({
      layout: bindGroupLayout,
      entries: [
        {
          binding: 0,
          resource: { buffer: this.bgUniformBuffer },
        },
      ],
    });

    this.bgPipeline = this.device.createRenderPipeline({
      layout: this.device.createPipelineLayout({
        bindGroupLayouts: [bindGroupLayout],
      }),
      vertex: {
        module: shaderModule,
        entryPoint: 'vertexMain',
      },
      fragment: {
        module: shaderModule,
        entryPoint: 'fragmentMain',
        targets: [
          {
            format: this.format,
            blend: {
              color: {
                srcFactor: 'src-alpha',
                dstFactor: 'one-minus-src-alpha',
              },
              alpha: {
                srcFactor: 'one',
                dstFactor: 'one-minus-src-alpha',
              },
            },
          },
        ],
      },
      primitive: {
        topology: 'triangle-list',
      },
    });
  }

  private async createParticlePipeline() {
    const shaderModule = this.device.createShaderModule({
      code: PARTICLE_SHADER,
    });

    this.particleUniformBuffer = this.device.createBuffer({
      size: 16,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    this.particleStorageBuffer = this.device.createBuffer({
      size: 1000 * 48,
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
          visibility: GPUShaderStage.VERTEX,
          buffer: { type: 'read-only-storage' },
        },
      ],
    });

    this.particleBindGroup = this.device.createBindGroup({
      layout: bindGroupLayout,
      entries: [
        {
          binding: 0,
          resource: { buffer: this.particleUniformBuffer },
        },
        {
          binding: 1,
          resource: { buffer: this.particleStorageBuffer },
        },
      ],
    });

    this.particlePipeline = this.device.createRenderPipeline({
      layout: this.device.createPipelineLayout({
        bindGroupLayouts: [bindGroupLayout],
      }),
      vertex: {
        module: shaderModule,
        entryPoint: 'vertexMain',
      },
      fragment: {
        module: shaderModule,
        entryPoint: 'fragmentMain',
        targets: [
          {
            format: this.format,
            blend: {
              color: {
                srcFactor: 'src-alpha',
                dstFactor: 'one',
              },
              alpha: {
                srcFactor: 'one',
                dstFactor: 'one',
              },
            },
          },
        ],
      },
      primitive: {
        topology: 'triangle-list',
      },
    });
  }

  setLevel(level: number) {
    this.level = level;
  }

  // Emission methods
  emitThrow(x: number, y: number) {
    // Trail behind dart
    this.particleSystem.emit(x, y, 'throw', 3, {
      direction: [0, 1],
      spread: 0.5,
      speed: randomRange(0.01, 0.02),
    });
  }

  emitLand(x: number, y: number, score: number) {
    // Impact effect
    this.particleSystem.emit(x, y, 'land', 8, {
      spread: Math.PI * 2,
      speed: randomRange(0.03, 0.06),
      color: getScoreColor(score),
    });

    // Score popup
    this.particleSystem.emit(x, y - 0.03, 'score', 5, {
      direction: [0, -1],
      spread: 0.5,
      speed: randomRange(0.02, 0.03),
      color: getScoreColor(score),
    });
  }

  emitBullseye(x: number, y: number) {
    // Big celebration for bullseye
    this.particleSystem.emit(x, y, 'bullseye', 20, {
      spread: Math.PI * 2,
      speed: randomRange(0.06, 0.12),
    });

    // Extra golden sparkles
    for (let i = 0; i < 15; i++) {
      this.particleSystem.emit(
        x + randomRange(-0.05, 0.05),
        y + randomRange(-0.05, 0.05),
        'score',
        1,
        {
          spread: Math.PI * 2,
          speed: randomRange(0.02, 0.05),
          color: DART_COLORS.bullseyeGold,
        }
      );
    }
  }

  emitMiss(x: number, y: number) {
    this.particleSystem.emit(x, y, 'miss', 5, {
      spread: Math.PI * 2,
      speed: randomRange(0.02, 0.04),
    });
  }

  emitGameOver(x: number, y: number, victory: boolean) {
    if (victory) {
      // Victory confetti
      for (let i = 0; i < 60; i++) {
        const px = randomRange(0.1, 0.9);
        const py = randomRange(-0.1, 0.3);
        this.particleSystem.emit(px, py, 'gameOver', 1, {
          color: getRandomConfettiColor(),
          direction: [0, 1],
          spread: Math.PI * 0.5,
          speed: randomRange(0.03, 0.08),
        });
      }
      // Golden burst
      this.particleSystem.emit(0.5, 0.5, 'bullseye', 25, {
        color: DART_COLORS.scoreGold,
        spread: Math.PI * 2,
        speed: randomRange(0.08, 0.15),
      });
    } else {
      // Game over effect
      this.particleSystem.emit(x, y, 'miss', 15, {
        spread: Math.PI * 2,
        speed: randomRange(0.03, 0.05),
      });
    }
  }

  render(delta: number) {
    if (!this.initialized) return;

    this.time += delta;
    this.particleSystem.update(delta);

    // Update uniforms
    const bgUniforms = new Float32Array([
      this.time,
      this.canvas.width,
      this.canvas.height,
      this.level,
    ]);
    this.device.queue.writeBuffer(this.bgUniformBuffer, 0, bgUniforms);

    const particleUniforms = new Float32Array([
      this.time,
      this.canvas.width,
      this.canvas.height,
      this.level,
    ]);
    this.device.queue.writeBuffer(
      this.particleUniformBuffer,
      0,
      particleUniforms
    );

    // Update particle data
    const particleData = this.particleSystem.getParticleData();
    if (particleData.length > 0) {
      this.device.queue.writeBuffer(this.particleStorageBuffer, 0, particleData);
    }

    const commandEncoder = this.device.createCommandEncoder();
    const textureView = this.context.getCurrentTexture().createView();

    const renderPass = commandEncoder.beginRenderPass({
      colorAttachments: [
        {
          view: textureView,
          clearValue: { r: 0, g: 0, b: 0, a: 0 },
          loadOp: 'clear',
          storeOp: 'store',
        },
      ],
    });

    // Draw background
    renderPass.setPipeline(this.bgPipeline);
    renderPass.setBindGroup(0, this.bgBindGroup);
    renderPass.draw(6);

    // Draw particles
    const particleCount = this.particleSystem.getParticleCount();
    if (particleCount > 0) {
      renderPass.setPipeline(this.particlePipeline);
      renderPass.setBindGroup(0, this.particleBindGroup);
      renderPass.draw(6, particleCount);
    }

    renderPass.end();
    this.device.queue.submit([commandEncoder.finish()]);
  }

  resize(width: number, height: number) {
    this.canvas.width = width;
    this.canvas.height = height;
  }

  clear() {
    this.particleSystem.clear();
    this.time = 0;
  }
}
