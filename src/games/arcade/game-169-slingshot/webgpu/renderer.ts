/**
 * WebGPU Renderer - Slingshot
 * Arcade / Slingshot / Outdoor Nature Theme
 * Game #169
 */

import { ParticleSystem } from './particles';
import { BACKGROUND_SHADER, PARTICLE_SHADER } from './shaders';
import { SLINGSHOT_COLORS, randomRange, getRandomConfettiColor, getTargetHitColor } from './math';

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
  emitLaunch(x: number, y: number) {
    // Dust cloud from slingshot release
    this.particleSystem.emit(x, y, 'launch', 15, {
      color: SLINGSHOT_COLORS.dustBrown,
      spread: Math.PI * 0.8,
      direction: [0, 1],
      speed: randomRange(0.04, 0.08),
    });

    // Ground dust
    this.particleSystem.emit(x, y + 0.02, 'launch', 8, {
      color: SLINGSHOT_COLORS.grassLight,
      spread: Math.PI * 0.6,
      direction: [0, 1],
      speed: randomRange(0.02, 0.05),
    });
  }

  emitTrail(x: number, y: number) {
    this.particleSystem.emit(x, y, 'trail', 1, {
      color: SLINGSHOT_COLORS.trailGray,
      speed: randomRange(0.003, 0.008),
    });
  }

  emitTargetHit(x: number, y: number, targetColor?: number[]) {
    // Impact burst
    this.particleSystem.emit(x, y, 'targetHit', 20, {
      color: targetColor || getTargetHitColor(),
      spread: Math.PI * 2,
      speed: randomRange(0.08, 0.15),
    });

    // White flash
    this.particleSystem.emit(x, y, 'targetHit', 10, {
      color: SLINGSHOT_COLORS.impactWhite,
      spread: Math.PI * 2,
      speed: randomRange(0.05, 0.1),
    });

    // Shatter fragments
    this.particleSystem.emit(x, y, 'shatter', 12, {
      color: targetColor || getTargetHitColor(),
      spread: Math.PI * 2,
      speed: randomRange(0.06, 0.12),
    });
  }

  emitScore(x: number, y: number) {
    // Score sparkles
    this.particleSystem.emit(x, y, 'score', 8, {
      color: SLINGSHOT_COLORS.sparkYellow,
      spread: Math.PI * 2,
      speed: randomRange(0.03, 0.06),
    });

    // Golden stars rising
    for (let i = 0; i < 5; i++) {
      this.particleSystem.emit(
        x + randomRange(-0.03, 0.03),
        y + randomRange(-0.02, 0.02),
        'score',
        1,
        {
          color: SLINGSHOT_COLORS.sunGold,
          direction: [0, -1],
          spread: Math.PI * 0.4,
          speed: randomRange(0.02, 0.04),
        }
      );
    }
  }

  emitMiss(x: number, y: number) {
    // Ground impact dust
    this.particleSystem.emit(x, y, 'launch', 10, {
      color: SLINGSHOT_COLORS.dirtBrown,
      spread: Math.PI,
      direction: [0, -1],
      speed: randomRange(0.03, 0.06),
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

      // Golden burst from center
      this.particleSystem.emit(0.5, 0.5, 'score', 30, {
        color: SLINGSHOT_COLORS.sunGold,
        spread: Math.PI * 2,
        speed: randomRange(0.08, 0.15),
      });
    } else {
      // Game over - dust settles
      for (let i = 0; i < 20; i++) {
        this.particleSystem.emit(
          randomRange(0.2, 0.8),
          randomRange(0.6, 0.8),
          'launch',
          1,
          {
            color: SLINGSHOT_COLORS.dustBrown,
            direction: [0, -1],
            spread: Math.PI * 0.3,
            speed: randomRange(0.02, 0.04),
          }
        );
      }
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
