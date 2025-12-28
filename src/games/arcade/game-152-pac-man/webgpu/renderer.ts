/**
 * WebGPU Renderer - Pac-Man
 * Retro Arcade / Neon Yellow / Classic Theme
 * Game #152
 */

import { BACKGROUND_SHADER, PARTICLE_SHADER } from './shaders';
import { ParticleSystem } from './particles';
import { PACMAN_COLORS, randomRange } from './math';

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

  private powerMode = false;
  private intensity = 1.0;

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
    // Uniform buffer: time, aspectRatio, powerMode, intensity
    this.uniformBuffer = this.device.createBuffer({
      size: 16,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    // Particle buffer
    this.particleBuffer = this.device.createBuffer({
      size: 600 * 12 * 4, // maxParticles * floats per particle * bytes per float
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
      new Float32Array([time, aspectRatio, this.powerMode ? 1.0 : 0.0, this.intensity])
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

  emitDotEat(x: number, y: number) {
    this.particleSystem.emit(x, y, 'dotEat', 8, {
      spread: 0.8,
      speed: 0.6,
    });
  }

  emitPowerUp(x: number, y: number) {
    // Big expanding wave
    this.particleSystem.emit(x, y, 'powerUp', 20, {
      spread: 1.5,
      speed: 1.2,
    });
    this.powerMode = true;
  }

  emitPowerEnd() {
    this.powerMode = false;
  }

  emitGhostEat(x: number, y: number, ghostIndex: number = 0) {
    this.particleSystem.emit(x, y, 'ghostEat', 25, {
      spread: 1.2,
      speed: 1.0,
      ghostIndex,
    });
  }

  emitPacmanMove(x: number, y: number) {
    this.particleSystem.emit(x, y, 'pacmanTrail', 2, {
      spread: 0.3,
      speed: 0.2,
    });
  }

  emitGhostMove(x: number, y: number, ghostIndex: number) {
    if (Math.random() < 0.3) {
      this.particleSystem.emit(x, y, 'ghostTrail', 1, {
        spread: 0.2,
        speed: 0.15,
        ghostIndex,
        color: this.powerMode ? PACMAN_COLORS.ghostScared : undefined,
      });
    }
  }

  emitGameOver(x: number, y: number) {
    this.particleSystem.emit(x, y, 'gameOver', 40, {
      spread: 2.0,
      speed: 1.5,
    });
    this.intensity = 0.6;
  }

  emitGameStart() {
    this.particleSystem.clear();
    this.powerMode = false;
    this.intensity = 1.0;

    // Spawn particles around edges
    for (let i = 0; i < 30; i++) {
      const edge = Math.floor(Math.random() * 4);
      let x: number, y: number;
      switch (edge) {
        case 0: x = Math.random(); y = 0; break;
        case 1: x = Math.random(); y = 1; break;
        case 2: x = 0; y = Math.random(); break;
        default: x = 1; y = Math.random(); break;
      }
      this.particleSystem.emit(x, y, 'dotEat', 2, {
        spread: 1.0,
        speed: 0.8,
      });
    }
  }

  emitWin() {
    // Victory celebration
    for (let i = 0; i < 50; i++) {
      const x = Math.random();
      const y = Math.random();
      this.particleSystem.emit(x, y, 'powerUp', 3, {
        spread: 1.5,
        speed: 1.0,
      });
    }
  }

  emitAmbient() {
    // Occasional ambient particles
    if (Math.random() < 0.3) {
      const x = Math.random();
      const y = Math.random();
      this.particleSystem.emit(x, y, 'dotEat', 1, {
        spread: 0.5,
        speed: 0.2,
        size: 0.2,
        life: 0.5,
      });
    }
  }

  destroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }
}
