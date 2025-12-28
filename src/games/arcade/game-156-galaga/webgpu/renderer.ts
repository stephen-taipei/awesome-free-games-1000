/**
 * WebGPU Renderer - Galaga
 * Retro Arcade / Neon Space / Classic Galaga Theme
 * Game #156
 */

import { BACKGROUND_SHADER, PARTICLE_SHADER } from './shaders';
import { ParticleSystem, type Particle } from './particles';

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
  private startTime: number;
  private lastTime: number;
  private animationId: number | null = null;
  private initialized = false;

  private readonly MAX_PARTICLES = 1500;
  private readonly PARTICLE_SIZE = 48; // bytes per particle

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.particleSystem = new ParticleSystem();
    this.startTime = performance.now();
    this.lastTime = this.startTime;
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

      this.resize(this.canvas.clientWidth, this.canvas.clientHeight);
      this.createBackgroundPipeline();
      this.createParticlePipeline();

      this.initialized = true;
      this.startRenderLoop();
      return true;
    } catch (error) {
      console.error('WebGPU initialization failed:', error);
      return false;
    }
  }

  private createBackgroundPipeline() {
    const shaderModule = this.device.createShaderModule({
      code: BACKGROUND_SHADER
    });

    this.bgUniformBuffer = this.device.createBuffer({
      size: 16,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
    });

    const bindGroupLayout = this.device.createBindGroupLayout({
      entries: [{
        binding: 0,
        visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
        buffer: { type: 'uniform' }
      }]
    });

    this.bgBindGroup = this.device.createBindGroup({
      layout: bindGroupLayout,
      entries: [{
        binding: 0,
        resource: { buffer: this.bgUniformBuffer }
      }]
    });

    this.bgPipeline = this.device.createRenderPipeline({
      layout: this.device.createPipelineLayout({
        bindGroupLayouts: [bindGroupLayout]
      }),
      vertex: {
        module: shaderModule,
        entryPoint: 'vertexMain'
      },
      fragment: {
        module: shaderModule,
        entryPoint: 'fragmentMain',
        targets: [{ format: this.format }]
      },
      primitive: { topology: 'triangle-list' }
    });
  }

  private createParticlePipeline() {
    const shaderModule = this.device.createShaderModule({
      code: PARTICLE_SHADER
    });

    this.particleUniformBuffer = this.device.createBuffer({
      size: 16,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
    });

    this.particleStorageBuffer = this.device.createBuffer({
      size: this.MAX_PARTICLES * this.PARTICLE_SIZE,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
    });

    const bindGroupLayout = this.device.createBindGroupLayout({
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
          buffer: { type: 'uniform' }
        },
        {
          binding: 1,
          visibility: GPUShaderStage.VERTEX,
          buffer: { type: 'read-only-storage' }
        }
      ]
    });

    this.particleBindGroup = this.device.createBindGroup({
      layout: bindGroupLayout,
      entries: [
        { binding: 0, resource: { buffer: this.particleUniformBuffer } },
        { binding: 1, resource: { buffer: this.particleStorageBuffer } }
      ]
    });

    this.particlePipeline = this.device.createRenderPipeline({
      layout: this.device.createPipelineLayout({
        bindGroupLayouts: [bindGroupLayout]
      }),
      vertex: {
        module: shaderModule,
        entryPoint: 'vertexMain'
      },
      fragment: {
        module: shaderModule,
        entryPoint: 'fragmentMain',
        targets: [{
          format: this.format,
          blend: {
            color: {
              srcFactor: 'src-alpha',
              dstFactor: 'one',
              operation: 'add'
            },
            alpha: {
              srcFactor: 'one',
              dstFactor: 'one',
              operation: 'add'
            }
          }
        }]
      },
      primitive: { topology: 'triangle-list' }
    });
  }

  resize(width: number, height: number) {
    const dpr = Math.min(window.devicePixelRatio, 2);
    this.canvas.width = width * dpr;
    this.canvas.height = height * dpr;
  }

  private startRenderLoop() {
    const render = () => {
      if (!this.initialized) return;

      const now = performance.now();
      const deltaTime = (now - this.lastTime) / 1000;
      this.lastTime = now;
      const time = (now - this.startTime) / 1000;

      this.particleSystem.update(deltaTime);
      this.render(time);

      this.animationId = requestAnimationFrame(render);
    };
    render();
  }

  private render(time: number) {
    const uniformData = new Float32Array([
      this.canvas.width,
      this.canvas.height,
      time,
      0
    ]);
    this.device.queue.writeBuffer(this.bgUniformBuffer, 0, uniformData);
    this.device.queue.writeBuffer(this.particleUniformBuffer, 0, uniformData);

    // Update particle buffer
    const particles = this.particleSystem.getParticles();
    if (particles.length > 0) {
      const particleData = new Float32Array(particles.length * 12);
      particles.forEach((p, i) => {
        const offset = i * 12;
        particleData[offset] = p.x;
        particleData[offset + 1] = p.y;
        particleData[offset + 2] = p.vx;
        particleData[offset + 3] = p.vy;
        particleData[offset + 4] = p.color[0];
        particleData[offset + 5] = p.color[1];
        particleData[offset + 6] = p.color[2];
        particleData[offset + 7] = p.color[3];
        particleData[offset + 8] = p.size;
        particleData[offset + 9] = p.life;
        particleData[offset + 10] = p.maxLife;
        particleData[offset + 11] = p.type;
      });
      this.device.queue.writeBuffer(this.particleStorageBuffer, 0, particleData);
    }

    const encoder = this.device.createCommandEncoder();
    const textureView = this.context.getCurrentTexture().createView();

    // Background pass
    const bgPass = encoder.beginRenderPass({
      colorAttachments: [{
        view: textureView,
        clearValue: { r: 0, g: 0, b: 0.02, a: 1 },
        loadOp: 'clear',
        storeOp: 'store'
      }]
    });
    bgPass.setPipeline(this.bgPipeline);
    bgPass.setBindGroup(0, this.bgBindGroup);
    bgPass.draw(6);
    bgPass.end();

    // Particle pass
    if (particles.length > 0) {
      const particlePass = encoder.beginRenderPass({
        colorAttachments: [{
          view: textureView,
          loadOp: 'load',
          storeOp: 'store'
        }]
      });
      particlePass.setPipeline(this.particlePipeline);
      particlePass.setBindGroup(0, this.particleBindGroup);
      particlePass.draw(6, particles.length);
      particlePass.end();
    }

    this.device.queue.submit([encoder.finish()]);
  }

  // Emission methods
  emitPlayerShoot(x: number, y: number) {
    this.particleSystem.emit('playerShoot', x, y);
  }

  emitEnemyDeath(x: number, y: number, enemyType: number) {
    this.particleSystem.emit('enemyDeath', x, y, { enemyType });
  }

  emitPlayerHit(x: number, y: number) {
    this.particleSystem.emit('playerHit', x, y);
  }

  emitDivingTrail(x: number, y: number) {
    this.particleSystem.emit('divingTrail', x, y);
  }

  emitBulletTrail(x: number, y: number, isEnemy: boolean) {
    this.particleSystem.emit('bulletTrail', x, y, { isEnemy });
  }

  emitGameOver(x: number, y: number) {
    this.particleSystem.emit('gameOver', x, y, { isVictory: false });
  }

  emitLevelComplete() {
    this.particleSystem.emit('gameOver', 0.5, 0.5, { isVictory: true });
  }

  emitGameStart() {
    // Central burst at start
    for (let i = 0; i < 30; i++) {
      const angle = (i / 30) * Math.PI * 2;
      const x = 0.5 + Math.cos(angle) * 0.1;
      const y = 0.5 + Math.sin(angle) * 0.1;
      this.particleSystem.emit('bulletTrail', x, y, { isEnemy: false });
    }
  }

  emitAmbient() {
    // Occasional ambient sparkle
    if (Math.random() > 0.7) {
      const x = Math.random();
      const y = Math.random();
      this.particleSystem.emit('bulletTrail', x, y, { isEnemy: Math.random() > 0.5 });
    }
  }

  destroy() {
    this.initialized = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    this.particleSystem.clear();
  }
}
