/**
 * WebGPU Renderer - Balloon Pop
 * Sky / Carnival / Colorful Balloons Theme
 * Game #162
 */

import { ParticleSystem } from './particles';
import { BACKGROUND_SHADER, PARTICLE_SHADER } from './shaders';
import { getRandomBalloonColor, getRandomConfettiColor, BALLOON_COLORS } from './math';

export class WebGPURenderer {
  private canvas: HTMLCanvasElement;
  private device: GPUDevice | null = null;
  private context: GPUCanvasContext | null = null;
  private format: GPUTextureFormat = 'bgra8unorm';

  private backgroundPipeline: GPURenderPipeline | null = null;
  private particlePipeline: GPURenderPipeline | null = null;

  private uniformBuffer: GPUBuffer | null = null;
  private particleBuffer: GPUBuffer | null = null;

  private backgroundBindGroup: GPUBindGroup | null = null;
  private particleBindGroup: GPUBindGroup | null = null;

  private particleSystem: ParticleSystem;
  private time: number = 0;
  private level: number = 1;
  private intensity: number = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.particleSystem = new ParticleSystem();
  }

  async initialize(): Promise<boolean> {
    if (!navigator.gpu) {
      console.log('WebGPU not supported');
      return false;
    }

    try {
      const adapter = await navigator.gpu.requestAdapter();
      if (!adapter) {
        console.log('No GPU adapter found');
        return false;
      }

      this.device = await adapter.requestDevice();
      this.context = this.canvas.getContext('webgpu');

      if (!this.context) {
        console.log('Failed to get WebGPU context');
        return false;
      }

      this.format = navigator.gpu.getPreferredCanvasFormat();
      this.context.configure({
        device: this.device,
        format: this.format,
        alphaMode: 'premultiplied',
      });

      this.createBuffers();
      this.createPipelines();

      return true;
    } catch (e) {
      console.log('WebGPU initialization error:', e);
      return false;
    }
  }

  private createBuffers() {
    if (!this.device) return;

    // Uniform buffer
    this.uniformBuffer = this.device.createBuffer({
      size: 16,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    // Particle buffer
    const maxParticles = 600;
    const floatsPerParticle = 12;
    this.particleBuffer = this.device.createBuffer({
      size: maxParticles * floatsPerParticle * 4,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });
  }

  private createPipelines() {
    if (!this.device || !this.uniformBuffer || !this.particleBuffer) return;

    // Background pipeline
    const bgShaderModule = this.device.createShaderModule({
      code: BACKGROUND_SHADER,
    });

    const bgBindGroupLayout = this.device.createBindGroupLayout({
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.FRAGMENT,
          buffer: { type: 'uniform' },
        },
      ],
    });

    this.backgroundPipeline = this.device.createRenderPipeline({
      layout: this.device.createPipelineLayout({
        bindGroupLayouts: [bgBindGroupLayout],
      }),
      vertex: {
        module: bgShaderModule,
        entryPoint: 'vertexMain',
      },
      fragment: {
        module: bgShaderModule,
        entryPoint: 'fragmentMain',
        targets: [
          {
            format: this.format,
            blend: {
              color: {
                srcFactor: 'src-alpha',
                dstFactor: 'one-minus-src-alpha',
                operation: 'add',
              },
              alpha: {
                srcFactor: 'one',
                dstFactor: 'one-minus-src-alpha',
                operation: 'add',
              },
            },
          },
        ],
      },
      primitive: { topology: 'triangle-list' },
    });

    this.backgroundBindGroup = this.device.createBindGroup({
      layout: bgBindGroupLayout,
      entries: [
        { binding: 0, resource: { buffer: this.uniformBuffer } },
      ],
    });

    // Particle pipeline
    const particleShaderModule = this.device.createShaderModule({
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

    this.particlePipeline = this.device.createRenderPipeline({
      layout: this.device.createPipelineLayout({
        bindGroupLayouts: [particleBindGroupLayout],
      }),
      vertex: {
        module: particleShaderModule,
        entryPoint: 'vertexMain',
      },
      fragment: {
        module: particleShaderModule,
        entryPoint: 'fragmentMain',
        targets: [
          {
            format: this.format,
            blend: {
              color: {
                srcFactor: 'src-alpha',
                dstFactor: 'one',
                operation: 'add',
              },
              alpha: {
                srcFactor: 'one',
                dstFactor: 'one',
                operation: 'add',
              },
            },
          },
        ],
      },
      primitive: { topology: 'triangle-list' },
    });

    this.particleBindGroup = this.device.createBindGroup({
      layout: particleBindGroupLayout,
      entries: [
        { binding: 0, resource: { buffer: this.uniformBuffer } },
        { binding: 1, resource: { buffer: this.particleBuffer } },
      ],
    });
  }

  resize(width: number, height: number) {
    this.canvas.width = width;
    this.canvas.height = height;
  }

  setLevel(level: number) {
    this.level = level;
  }

  // Emission methods
  emitPop(x: number, y: number, color?: [number, number, number, number]) {
    this.particleSystem.emit('pop', x, y, { color: color ?? getRandomBalloonColor() });
    this.intensity = Math.min(1.0, this.intensity + 0.15);
  }

  emitShoot(x: number, y: number) {
    this.particleSystem.emit('shoot', x, y, { color: BALLOON_COLORS.dartSilver });
  }

  emitBonusPop(x: number, y: number) {
    this.particleSystem.emit('bonusPop', x, y, { color: BALLOON_COLORS.bonusGold });
    // Add extra confetti for bonus
    this.particleSystem.emit('confetti', x, y, { count: 15 });
    this.intensity = Math.min(1.0, this.intensity + 0.25);
  }

  emitEscaped(x: number, y: number) {
    this.particleSystem.emit('escaped', x, y);
  }

  emitConfetti(x: number, y: number) {
    for (let i = 0; i < 3; i++) {
      this.particleSystem.emit('confetti', x + (Math.random() - 0.5) * 0.1, y, {
        color: getRandomConfettiColor(),
        count: 8,
      });
    }
  }

  emitGameOver(x: number, y: number, isVictory: boolean) {
    const color = isVictory ? BALLOON_COLORS.bonusGold : BALLOON_COLORS.balloonRed;
    this.particleSystem.emit('gameOver', x, y, { color, count: 50 });

    if (isVictory) {
      // Victory celebration with lots of confetti
      for (let i = 0; i < 8; i++) {
        setTimeout(() => {
          this.particleSystem.emit('confetti', Math.random(), Math.random() * 0.5, {
            count: 25,
            color: getRandomConfettiColor(),
          });
        }, i * 100);
      }
    }

    this.intensity = 1.0;
  }

  render(deltaTime: number) {
    if (!this.device || !this.context || !this.uniformBuffer || !this.particleBuffer) {
      return;
    }

    this.time += deltaTime;
    this.intensity *= 0.96;
    this.particleSystem.update(deltaTime);

    // Update uniforms
    const uniformData = new Float32Array([
      this.time,
      this.canvas.width / this.canvas.height,
      this.level,
      this.intensity,
    ]);
    this.device.queue.writeBuffer(this.uniformBuffer, 0, uniformData);

    // Update particles
    const particleData = this.particleSystem.getData();
    this.device.queue.writeBuffer(this.particleBuffer, 0, particleData);

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
    if (this.backgroundPipeline && this.backgroundBindGroup) {
      renderPass.setPipeline(this.backgroundPipeline);
      renderPass.setBindGroup(0, this.backgroundBindGroup);
      renderPass.draw(6);
    }

    // Draw particles
    const particleCount = this.particleSystem.getCount();
    if (particleCount > 0 && this.particlePipeline && this.particleBindGroup) {
      renderPass.setPipeline(this.particlePipeline);
      renderPass.setBindGroup(0, this.particleBindGroup);
      renderPass.draw(6, particleCount);
    }

    renderPass.end();
    this.device.queue.submit([commandEncoder.finish()]);
  }

  clear() {
    this.particleSystem.clear();
    this.intensity = 0;
  }
}
