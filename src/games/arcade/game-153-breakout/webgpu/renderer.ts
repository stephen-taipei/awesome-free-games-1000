/**
 * WebGPU Renderer - Breakout
 * Neon Electric / Purple-Pink / Arcade Theme
 * Game #153
 */

import { BACKGROUND_SHADER, PARTICLE_SHADER } from './shaders';
import { ParticleSystem } from './particles';
import { BREAKOUT_COLORS } from './math';

export class WebGPURenderer {
  private canvas: HTMLCanvasElement;
  private device!: GPUDevice;
  private context!: GPUCanvasContext;
  private format!: GPUTextureFormat;

  private bgPipeline!: GPURenderPipeline;
  private particlePipeline!: GPURenderPipeline;
  private uniformBuffer!: GPUBuffer;
  private particleBuffer!: GPUBuffer;
  private bgBindGroup!: GPUBindGroup;
  private particleBindGroup!: GPUBindGroup;

  private particleSystem: ParticleSystem;
  private startTime: number;
  private lastTime: number;
  private animationId: number | null = null;

  private intensity = 1.0;
  private ballY = 0.5;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.particleSystem = new ParticleSystem();
    this.startTime = performance.now() / 1000;
    this.lastTime = this.startTime;
  }

  async init(): Promise<boolean> {
    if (!navigator.gpu) {
      console.warn('WebGPU not supported');
      return false;
    }

    try {
      const adapter = await navigator.gpu.requestAdapter();
      if (!adapter) return false;

      this.device = await adapter.requestDevice();
      this.context = this.canvas.getContext('webgpu')!;
      this.format = navigator.gpu.getPreferredCanvasFormat();

      this.context.configure({
        device: this.device,
        format: this.format,
        alphaMode: 'premultiplied',
      });

      this.createBuffers();
      this.createPipelines();
      this.resize(this.canvas.clientWidth, this.canvas.clientHeight);
      this.startRenderLoop();

      return true;
    } catch (e) {
      console.warn('WebGPU init failed:', e);
      return false;
    }
  }

  private createBuffers() {
    // Uniform buffer: time, aspectRatio, intensity, ballY
    this.uniformBuffer = this.device.createBuffer({
      size: 16,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    // Particle buffer
    this.particleBuffer = this.device.createBuffer({
      size: 700 * 12 * 4,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });
  }

  private createPipelines() {
    // Background pipeline
    const bgShaderModule = this.device.createShaderModule({
      code: BACKGROUND_SHADER,
    });

    const bgBindGroupLayout = this.device.createBindGroupLayout({
      entries: [
        { binding: 0, visibility: GPUShaderStage.FRAGMENT, buffer: { type: 'uniform' } },
      ],
    });

    this.bgPipeline = this.device.createRenderPipeline({
      layout: this.device.createPipelineLayout({ bindGroupLayouts: [bgBindGroupLayout] }),
      vertex: {
        module: bgShaderModule,
        entryPoint: 'vertexMain',
      },
      fragment: {
        module: bgShaderModule,
        entryPoint: 'fragmentMain',
        targets: [{ format: this.format }],
      },
      primitive: { topology: 'triangle-list' },
    });

    this.bgBindGroup = this.device.createBindGroup({
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
        { binding: 0, visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT, buffer: { type: 'uniform' } },
        { binding: 1, visibility: GPUShaderStage.VERTEX, buffer: { type: 'read-only-storage' } },
      ],
    });

    this.particlePipeline = this.device.createRenderPipeline({
      layout: this.device.createPipelineLayout({ bindGroupLayouts: [particleBindGroupLayout] }),
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
            color: { srcFactor: 'src-alpha', dstFactor: 'one', operation: 'add' },
            alpha: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' },
          },
        }],
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
    const dpr = Math.min(window.devicePixelRatio, 2);
    this.canvas.width = width * dpr;
    this.canvas.height = height * dpr;
  }

  private startRenderLoop() {
    const render = () => {
      this.render();
      this.animationId = requestAnimationFrame(render);
    };
    render();
  }

  private render() {
    const currentTime = performance.now() / 1000;
    const deltaTime = Math.min(currentTime - this.lastTime, 0.1);
    this.lastTime = currentTime;
    const time = currentTime - this.startTime;

    // Update particles
    this.particleSystem.update(deltaTime);

    // Update uniforms
    const aspectRatio = this.canvas.width / this.canvas.height;
    this.device.queue.writeBuffer(
      this.uniformBuffer,
      0,
      new Float32Array([time, aspectRatio, this.intensity, this.ballY])
    );

    // Update particle buffer
    const particleData = this.particleSystem.getParticleData();
    if (particleData.length > 0) {
      this.device.queue.writeBuffer(this.particleBuffer, 0, particleData);
    }

    // Render
    const commandEncoder = this.device.createCommandEncoder();
    const textureView = this.context.getCurrentTexture().createView();

    const renderPass = commandEncoder.beginRenderPass({
      colorAttachments: [{
        view: textureView,
        clearValue: { r: 0, g: 0, b: 0, a: 0 },
        loadOp: 'clear',
        storeOp: 'store',
      }],
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

  // === Game Events ===

  emitBrickBreak(x: number, y: number, colorHex?: string, brickRow?: number) {
    this.particleSystem.emit(x, y, 'brickBreak', 15, {
      spread: 1.2,
      speed: 1.0,
      colorHex,
      brickRow,
    });
  }

  emitBallTrail(x: number, y: number) {
    this.ballY = y;
    this.particleSystem.emit(x, y, 'ballTrail', 2, {
      spread: 0.3,
      speed: 0.2,
    });
  }

  emitPaddleHit(x: number, y: number) {
    this.particleSystem.emit(x, y, 'paddleHit', 12, {
      spread: 1.0,
      speed: 0.8,
    });
  }

  emitWallBounce(x: number, y: number) {
    this.particleSystem.emit(x, y, 'wallBounce', 8, {
      spread: 0.8,
      speed: 0.6,
    });
  }

  emitGameOver(x: number, y: number) {
    this.particleSystem.emit(x, y, 'gameOver', 40, {
      spread: 2.0,
      speed: 1.5,
    });
    this.intensity = 0.6;
  }

  emitVictory() {
    // Celebration particles across screen
    for (let i = 0; i < 60; i++) {
      const x = Math.random();
      const y = Math.random();
      this.particleSystem.emit(x, y, 'victoryBurst', 3, {
        spread: 1.5,
        speed: 1.0,
      });
    }
  }

  emitGameStart() {
    this.particleSystem.clear();
    this.intensity = 1.0;

    // Starting particles
    for (let i = 0; i < 20; i++) {
      const x = Math.random();
      const y = 0.3 + Math.random() * 0.3;
      this.particleSystem.emit(x, y, 'brickBreak', 2, {
        spread: 0.8,
        speed: 0.5,
        brickRow: i % 6,
      });
    }
  }

  emitAmbient() {
    // Occasional ambient particles
    if (Math.random() < 0.3) {
      const x = Math.random();
      const y = Math.random();
      this.particleSystem.emit(x, y, 'ballTrail', 1, {
        spread: 0.5,
        speed: 0.2,
        size: 0.2,
        life: 0.4,
      });
    }
  }

  destroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }
}
