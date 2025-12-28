/**
 * WebGPU Renderer - Air Hockey
 * Arcade / Air Hockey / Blue and Red Neon Theme
 * Game #168
 */

import { ParticleSystem } from './particles';
import { BACKGROUND_SHADER, PARTICLE_SHADER } from './shaders';
import { HOCKEY_COLORS, randomRange, getRandomConfettiColor, getPlayerHitColor, getCpuHitColor } from './math';

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
  emitPlayerHit(x: number, y: number) {
    this.particleSystem.emit(x, y, 'hit', 12, {
      color: getPlayerHitColor(),
      spread: Math.PI * 2,
      speed: randomRange(0.05, 0.1),
    });

    // Extra sparks
    this.particleSystem.emit(x, y, 'spark', 6, {
      color: HOCKEY_COLORS.neonCyan,
      spread: Math.PI * 2,
      speed: randomRange(0.08, 0.12),
    });
  }

  emitCpuHit(x: number, y: number) {
    this.particleSystem.emit(x, y, 'hit', 12, {
      color: getCpuHitColor(),
      spread: Math.PI * 2,
      speed: randomRange(0.05, 0.1),
    });

    // Extra sparks
    this.particleSystem.emit(x, y, 'spark', 6, {
      color: HOCKEY_COLORS.neonPink,
      spread: Math.PI * 2,
      speed: randomRange(0.08, 0.12),
    });
  }

  emitWallBounce(x: number, y: number, nx: number, ny: number) {
    this.particleSystem.emit(x, y, 'wallBounce', 8, {
      direction: [nx, ny],
      spread: Math.PI * 0.5,
      speed: randomRange(0.03, 0.06),
    });
  }

  emitGoal(x: number, y: number, isPlayer: boolean) {
    // Big celebration burst
    const color = isPlayer
      ? HOCKEY_COLORS.playerGlow
      : HOCKEY_COLORS.cpuGlow;

    this.particleSystem.emit(x, y, 'goal', 25, {
      color: color,
      spread: Math.PI * 2,
      speed: randomRange(0.08, 0.15),
    });

    // Golden stars
    this.particleSystem.emit(x, y, 'goal', 15, {
      color: HOCKEY_COLORS.goalGold,
      spread: Math.PI * 2,
      speed: randomRange(0.05, 0.1),
    });
  }

  emitPuckTrail(x: number, y: number) {
    this.particleSystem.emit(x, y, 'puckTrail', 1, {
      speed: randomRange(0.002, 0.005),
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
      // Blue celebration burst
      this.particleSystem.emit(0.5, 0.5, 'goal', 30, {
        color: HOCKEY_COLORS.playerGlow,
        spread: Math.PI * 2,
        speed: randomRange(0.1, 0.18),
      });
    } else {
      // Loss effect - red burst
      this.particleSystem.emit(x, y, 'hit', 20, {
        color: HOCKEY_COLORS.cpuGlow,
        spread: Math.PI * 2,
        speed: randomRange(0.04, 0.08),
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
