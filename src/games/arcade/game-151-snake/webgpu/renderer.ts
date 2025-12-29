/**
 * WebGPU Renderer - Snake
 * Reptile / Jungle / Neon Green Theme
 * Game #151
 */

import { BACKGROUND_SHADER, PARTICLE_SHADER } from './shaders';
import { ParticleSystem, Particle } from './particles';
import { SNAKE_COLORS } from './math';

export class WebGPURenderer {
  private canvas: HTMLCanvasElement;
  private device!: GPUDevice;
  private context!: GPUCanvasContext;
  private format!: GPUTextureFormat;

  private backgroundPipeline!: GPURenderPipeline;
  private particlePipeline!: GPURenderPipeline;

  private uniformBuffer!: GPUBuffer;
  private uniformBindGroup!: GPUBindGroup;

  private particleBuffer!: GPUBuffer;
  private particleBindGroup!: GPUBindGroup;

  private particleSystem: ParticleSystem;
  private startTime: number;
  private lastTime: number;
  private animationId: number | null = null;

  private snakeLength: number = 3;
  private energy: number = 0.5;

  private readonly MAX_PARTICLES = 500;
  private readonly PARTICLE_STRIDE = 48;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.particleSystem = new ParticleSystem(this.MAX_PARTICLES);
    this.startTime = performance.now() / 1000;
    this.lastTime = this.startTime;
  }

  async init(): Promise<boolean> {
    if (!navigator.gpu) {
      console.log('WebGPU not supported');
      return false;
    }

    try {
      const adapter = await navigator.gpu.requestAdapter();
      if (!adapter) return false;

      this.device = await adapter.requestDevice();
      this.context = this.canvas.getContext('webgpu') as GPUCanvasContext;
      this.format = navigator.gpu.getPreferredCanvasFormat();

      this.context.configure({
        device: this.device,
        format: this.format,
        alphaMode: 'premultiplied',
      });

      this.resize(this.canvas.clientWidth, this.canvas.clientHeight);
      this.createPipelines();
      this.createBuffers();
      this.startRenderLoop();

      return true;
    } catch (e) {
      console.error('WebGPU init error:', e);
      return false;
    }
  }

  resize(width: number, height: number) {
    const dpr = Math.min(window.devicePixelRatio, 2);
    this.canvas.width = width * dpr;
    this.canvas.height = height * dpr;
  }

  private createPipelines() {
    const bgShaderModule = this.device.createShaderModule({
      code: BACKGROUND_SHADER,
    });

    this.backgroundPipeline = this.device.createRenderPipeline({
      layout: 'auto',
      vertex: {
        module: bgShaderModule,
        entryPoint: 'vertexMain',
      },
      fragment: {
        module: bgShaderModule,
        entryPoint: 'fragmentMain',
        targets: [{ format: this.format }],
      },
      primitive: { topology: 'triangle-strip' },
    });

    const particleShaderModule = this.device.createShaderModule({
      code: PARTICLE_SHADER,
    });

    this.particlePipeline = this.device.createRenderPipeline({
      layout: 'auto',
      vertex: {
        module: particleShaderModule,
        entryPoint: 'vertexMain',
      },
      fragment: {
        module: particleShaderModule,
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
              dstFactor: 'one',
              operation: 'add',
            },
          },
        }],
      },
      primitive: { topology: 'triangle-strip' },
    });
  }

  private createBuffers() {
    this.uniformBuffer = this.device.createBuffer({
      size: 16,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    this.uniformBindGroup = this.device.createBindGroup({
      layout: this.backgroundPipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: this.uniformBuffer } },
      ],
    });

    this.particleBuffer = this.device.createBuffer({
      size: this.MAX_PARTICLES * this.PARTICLE_STRIDE,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });

    this.particleBindGroup = this.device.createBindGroup({
      layout: this.particlePipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: this.uniformBuffer } },
        { binding: 1, resource: { buffer: this.particleBuffer } },
      ],
    });
  }

  private startRenderLoop() {
    const render = () => {
      const now = performance.now() / 1000;
      const deltaTime = Math.min(now - this.lastTime, 0.1);
      this.lastTime = now;

      this.particleSystem.update(deltaTime);
      this.render(now - this.startTime);
      this.animationId = requestAnimationFrame(render);
    };
    render();
  }

  private render(time: number) {
    const aspectRatio = this.canvas.width / this.canvas.height;

    const uniformData = new Float32Array([time, aspectRatio, this.snakeLength, this.energy]);
    this.device.queue.writeBuffer(this.uniformBuffer, 0, uniformData);

    const particles = this.particleSystem.getParticles();
    if (particles.length > 0) {
      const particleData = new Float32Array(particles.length * 12);
      particles.forEach((p, i) => {
        const offset = i * 12;
        particleData[offset + 0] = p.position[0];
        particleData[offset + 1] = p.position[1];
        particleData[offset + 2] = p.velocity[0];
        particleData[offset + 3] = p.velocity[1];
        particleData[offset + 4] = p.color[0];
        particleData[offset + 5] = p.color[1];
        particleData[offset + 6] = p.color[2];
        particleData[offset + 7] = p.color[3];
        particleData[offset + 8] = p.size;
        particleData[offset + 9] = p.life;
        particleData[offset + 10] = p.maxLife;
        particleData[offset + 11] = p.particleType;
      });
      this.device.queue.writeBuffer(this.particleBuffer, 0, particleData);
    }

    const commandEncoder = this.device.createCommandEncoder();
    const textureView = this.context.getCurrentTexture().createView();

    const renderPass = commandEncoder.beginRenderPass({
      colorAttachments: [{
        view: textureView,
        clearValue: { r: 0.04, g: 0.08, b: 0.04, a: 1.0 },
        loadOp: 'clear',
        storeOp: 'store',
      }],
    });

    renderPass.setPipeline(this.backgroundPipeline);
    renderPass.setBindGroup(0, this.uniformBindGroup);
    renderPass.draw(4);

    if (particles.length > 0) {
      renderPass.setPipeline(this.particlePipeline);
      renderPass.setBindGroup(0, this.particleBindGroup);
      renderPass.draw(4, particles.length);
    }

    renderPass.end();
    this.device.queue.submit([commandEncoder.finish()]);
  }

  // === Event emission methods ===

  setSnakeLength(length: number) {
    this.snakeLength = length;
  }

  emitSnakeMove(x: number, y: number) {
    this.particleSystem.emit(x, y, 'snakeTrail', 2, {
      spread: 0.1,
      sizeRange: [0.4, 0.8],
      lifeRange: [0.3, 0.6],
    });
  }

  emitFoodEat(x: number, y: number) {
    // Burst of particles when eating
    for (let i = 0; i < 15; i++) {
      const angle = (i / 15) * Math.PI * 2;
      this.particleSystem.emit(x, y, 'foodEat', 1, {
        baseVelocity: [Math.cos(angle) * 0.5, Math.sin(angle) * 0.5],
        spread: 0.2,
        sizeRange: [0.6, 1.2],
        lifeRange: [0.4, 0.8],
      });
    }

    // Growth pulse
    this.particleSystem.emit(x, y, 'growPulse', 5, {
      spread: 0.3,
      sizeRange: [1.0, 1.8],
      lifeRange: [0.3, 0.6],
    });

    this.energy = 1.0;
    setTimeout(() => { this.energy = 0.5; }, 300);
  }

  emitScaleShimmer(x: number, y: number) {
    this.particleSystem.emit(x, y, 'scaleShimmer', 3, {
      spread: 0.15,
      sizeRange: [0.3, 0.6],
      lifeRange: [0.4, 0.8],
    });
  }

  emitGameOver(x: number, y: number, snakePositions: { x: number; y: number }[]) {
    // Explosion at head
    for (let i = 0; i < 20; i++) {
      const angle = (i / 20) * Math.PI * 2;
      this.particleSystem.emit(x, y, 'gameOverBurst', 2, {
        baseVelocity: [Math.cos(angle) * 0.8, Math.sin(angle) * 0.8],
        spread: 0.3,
        sizeRange: [0.8, 1.5],
        lifeRange: [0.6, 1.2],
      });
    }

    // Particles along snake body
    snakePositions.slice(0, 10).forEach((pos, i) => {
      setTimeout(() => {
        this.particleSystem.emit(pos.x, pos.y, 'gameOverBurst', 5, {
          spread: 0.4,
          sizeRange: [0.5, 1.0],
          lifeRange: [0.5, 1.0],
        });
      }, i * 50);
    });

    this.energy = 0.2;
  }

  emitAmbient() {
    // Floating leaves
    if (Math.random() < 0.3) {
      this.particleSystem.emit(
        Math.random(),
        1.1,
        'leafFloat',
        1,
        {
          baseVelocity: [(Math.random() - 0.5) * 0.05, -0.02],
          spread: 0.02,
          sizeRange: [0.3, 0.6],
          lifeRange: [3.0, 5.0],
        }
      );
    }
  }

  emitGameStart() {
    // Snake shimmer effect
    for (let i = 0; i < 10; i++) {
      const angle = (i / 10) * Math.PI * 2;
      this.particleSystem.emit(0.5, 0.5, 'scaleShimmer', 2, {
        baseVelocity: [Math.cos(angle) * 0.4, Math.sin(angle) * 0.4],
        spread: 0.1,
        sizeRange: [0.5, 1.0],
        lifeRange: [0.5, 1.0],
      });
    }

    this.snakeLength = 3;
    this.energy = 0.8;
    setTimeout(() => { this.energy = 0.5; }, 500);
  }

  destroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    this.particleSystem.clear();
  }
}
