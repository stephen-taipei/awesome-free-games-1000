/**
 * WebGPU Renderer - Hourglass
 * Time / Sands of Time / Ancient Theme
 * Game #140
 */

import { BACKGROUND_SHADER, PARTICLE_SHADER } from './shaders';
import { ParticleSystem } from './particles';
import { HOURGLASS_COLORS, randomRange } from './math';

export class WebGPURenderer {
  private canvas: HTMLCanvasElement;
  private device!: GPUDevice;
  private context!: GPUCanvasContext;
  private format!: GPUTextureFormat;

  private backgroundPipeline!: GPURenderPipeline;
  private particlePipeline!: GPURenderPipeline;
  private uniformBuffer!: GPUBuffer;
  private particleBuffer!: GPUBuffer;
  private backgroundBindGroup!: GPUBindGroup;
  private particleBindGroup!: GPUBindGroup;

  private particleSystem: ParticleSystem;
  private startTime: number;
  private lastTime: number;
  private intensity: number = 1.0;
  private readonly MAX_PARTICLES = 600;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.particleSystem = new ParticleSystem(this.MAX_PARTICLES);
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
      this.context = this.canvas.getContext('webgpu') as GPUCanvasContext;
      this.format = navigator.gpu.getPreferredCanvasFormat();

      this.context.configure({
        device: this.device,
        format: this.format,
        alphaMode: 'premultiplied',
      });

      this.resize(this.canvas.clientWidth, this.canvas.clientHeight);
      this.createResources();
      this.startRenderLoop();

      return true;
    } catch (e) {
      console.warn('WebGPU init failed:', e);
      return false;
    }
  }

  resize(width: number, height: number) {
    const dpr = Math.min(window.devicePixelRatio, 2);
    this.canvas.width = width * dpr;
    this.canvas.height = height * dpr;
  }

  private createResources() {
    // Uniform buffer
    this.uniformBuffer = this.device.createBuffer({
      size: 16,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    // Particle buffer
    this.particleBuffer = this.device.createBuffer({
      size: this.MAX_PARTICLES * 48,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });

    // Background pipeline
    const backgroundModule = this.device.createShaderModule({
      code: BACKGROUND_SHADER,
    });

    const backgroundBindGroupLayout = this.device.createBindGroupLayout({
      entries: [
        { binding: 0, visibility: GPUShaderStage.FRAGMENT, buffer: { type: 'uniform' } },
      ],
    });

    this.backgroundPipeline = this.device.createRenderPipeline({
      layout: this.device.createPipelineLayout({
        bindGroupLayouts: [backgroundBindGroupLayout],
      }),
      vertex: {
        module: backgroundModule,
        entryPoint: 'vertexMain',
      },
      fragment: {
        module: backgroundModule,
        entryPoint: 'fragmentMain',
        targets: [{ format: this.format }],
      },
      primitive: { topology: 'triangle-strip' },
    });

    this.backgroundBindGroup = this.device.createBindGroup({
      layout: backgroundBindGroupLayout,
      entries: [
        { binding: 0, resource: { buffer: this.uniformBuffer } },
      ],
    });

    // Particle pipeline
    const particleModule = this.device.createShaderModule({
      code: PARTICLE_SHADER,
    });

    const particleBindGroupLayout = this.device.createBindGroupLayout({
      entries: [
        { binding: 0, visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT, buffer: { type: 'uniform' } },
        { binding: 1, visibility: GPUShaderStage.VERTEX, buffer: { type: 'read-only-storage' } },
      ],
    });

    this.particlePipeline = this.device.createRenderPipeline({
      layout: this.device.createPipelineLayout({
        bindGroupLayouts: [particleBindGroupLayout],
      }),
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
              dstFactor: 'one-minus-src-alpha',
              operation: 'add',
            },
            alpha: {
              srcFactor: 'one',
              dstFactor: 'one-minus-src-alpha',
              operation: 'add',
            },
          },
        }],
      },
      primitive: { topology: 'triangle-strip' },
    });

    this.particleBindGroup = this.device.createBindGroup({
      layout: particleBindGroupLayout,
      entries: [
        { binding: 0, resource: { buffer: this.uniformBuffer } },
        { binding: 1, resource: { buffer: this.particleBuffer } },
      ],
    });
  }

  private startRenderLoop() {
    const render = () => {
      const currentTime = performance.now() / 1000;
      const deltaTime = currentTime - this.lastTime;
      this.lastTime = currentTime;

      this.particleSystem.update(deltaTime);
      this.renderFrame(currentTime - this.startTime);
      requestAnimationFrame(render);
    };
    requestAnimationFrame(render);
  }

  private renderFrame(time: number) {
    const uniforms = new Float32Array([
      time,
      this.canvas.width / this.canvas.height,
      this.intensity,
      0,
    ]);
    this.device.queue.writeBuffer(this.uniformBuffer, 0, uniforms);

    // Update particle buffer
    const particles = this.particleSystem.getParticles();
    const particleData = new Float32Array(this.MAX_PARTICLES * 12);

    particles.forEach((p, i) => {
      const offset = i * 12;
      particleData[offset] = p.position[0];
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

    const commandEncoder = this.device.createCommandEncoder();
    const textureView = this.context.getCurrentTexture().createView();

    const renderPass = commandEncoder.beginRenderPass({
      colorAttachments: [{
        view: textureView,
        clearValue: { r: 0.12, g: 0.08, b: 0.04, a: 1 },
        loadOp: 'clear',
        storeOp: 'store',
      }],
    });

    // Draw background
    renderPass.setPipeline(this.backgroundPipeline);
    renderPass.setBindGroup(0, this.backgroundBindGroup);
    renderPass.draw(4);

    // Draw particles
    if (particles.length > 0) {
      renderPass.setPipeline(this.particlePipeline);
      renderPass.setBindGroup(0, this.particleBindGroup);
      renderPass.draw(4, particles.length);
    }

    renderPass.end();
    this.device.queue.submit([commandEncoder.finish()]);
  }

  // Effect methods
  emitSandFlow(x: number, y: number) {
    this.particleSystem.emit(x, y, 'sandGrain', 8, {
      spread: 0.03,
      velocityRange: { x: [-0.02, 0.02], y: [-0.1, -0.05] },
    });
  }

  emitFlip(x: number, y: number) {
    // Sparks around the flip point
    this.particleSystem.emit(x, y, 'flipSpark', 25, {
      spread: 0.08,
      velocityRange: { x: [-0.25, 0.25], y: [-0.25, 0.25] },
    });

    // Time ripple
    this.particleSystem.emit(x, y, 'timeRipple', 3, {
      spread: 0.02,
      sizeRange: [2.0, 3.0],
    });

    // Sand burst
    this.particleSystem.emit(x, y, 'sandGrain', 30, {
      spread: 0.1,
      velocityRange: { x: [-0.15, 0.15], y: [-0.15, 0.15] },
    });
  }

  emitStarAppear(x: number, y: number) {
    this.particleSystem.emit(x, y, 'starGlow', 5, {
      spread: 0.02,
      sizeRange: [1.2, 1.8],
    });
  }

  emitStarCollect(x: number, y: number) {
    // Collect burst
    this.particleSystem.emit(x, y, 'collectBurst', 20, {
      spread: 0.05,
      velocityRange: { x: [-0.2, 0.2], y: [-0.2, 0.2] },
    });

    // Star particles
    this.particleSystem.emit(x, y, 'starGlow', 8, {
      spread: 0.08,
      velocityRange: { x: [-0.1, 0.1], y: [-0.1, 0.1] },
    });

    // Golden dust
    this.particleSystem.emit(x, y, 'goldenDust', 15, {
      spread: 0.1,
    });
  }

  emitTimeFlow(x: number, y: number) {
    this.particleSystem.emit(x, y, 'timeRipple', 2, {
      spread: 0.02,
    });
    this.particleSystem.emit(x, y, 'sandGrain', 4, {
      spread: 0.02,
    });
  }

  emitAmbient() {
    // Random golden dust
    if (Math.random() < 0.3) {
      this.particleSystem.emit(
        randomRange(0.2, 0.8),
        randomRange(0.2, 0.8),
        'goldenDust',
        1
      );
    }
  }

  emitLevelStart() {
    const cx = 0.5, cy = 0.5;

    // Time ripples
    for (let i = 0; i < 3; i++) {
      setTimeout(() => {
        this.particleSystem.emit(cx, cy, 'timeRipple', 2, {
          sizeRange: [2.0, 3.5],
        });
      }, i * 150);
    }

    // Golden dust burst
    this.particleSystem.emit(cx, cy, 'goldenDust', 20, {
      spread: 0.15,
      velocityRange: { x: [-0.1, 0.1], y: [-0.1, 0.1] },
    });

    // Sand grains
    this.particleSystem.emit(cx, cy, 'sandGrain', 30, {
      spread: 0.2,
      velocityRange: { x: [-0.08, 0.08], y: [-0.1, 0.05] },
    });
  }

  emitReset() {
    const cx = 0.5, cy = 0.5;

    // Time ripple reset effect
    this.particleSystem.emit(cx, cy, 'timeRipple', 4, {
      sizeRange: [2.5, 4.0],
      color: [...HOURGLASS_COLORS.timeBlue],
    });

    // Sand settling
    for (let i = 0; i < 20; i++) {
      const x = randomRange(0.3, 0.7);
      const y = randomRange(0.3, 0.7);
      this.particleSystem.emit(x, y, 'sandGrain', 2);
    }
  }

  emitLevelComplete() {
    const cx = 0.5, cy = 0.5;

    // Star burst
    for (let i = 0; i < 5; i++) {
      const angle = (i / 5) * Math.PI * 2;
      const x = cx + Math.cos(angle) * 0.15;
      const y = cy + Math.sin(angle) * 0.15;

      setTimeout(() => {
        this.particleSystem.emit(x, y, 'starGlow', 6, {
          spread: 0.03,
          sizeRange: [1.5, 2.5],
        });
        this.particleSystem.emit(x, y, 'collectBurst', 10, {
          spread: 0.05,
        });
      }, i * 80);
    }

    // Golden shower
    this.particleSystem.emit(cx, cy, 'goldenDust', 40, {
      spread: 0.2,
      velocityRange: { x: [-0.15, 0.15], y: [-0.15, 0.15] },
    });
  }

  emitVictory() {
    // Grand celebration
    for (let wave = 0; wave < 5; wave++) {
      setTimeout(() => {
        // Star explosions
        for (let i = 0; i < 8; i++) {
          const angle = (i / 8) * Math.PI * 2 + wave * 0.2;
          const radius = 0.1 + wave * 0.05;
          const x = 0.5 + Math.cos(angle) * radius;
          const y = 0.5 + Math.sin(angle) * radius;

          this.particleSystem.emit(x, y, 'starGlow', 4, {
            spread: 0.03,
            sizeRange: [1.5, 2.5],
          });
          this.particleSystem.emit(x, y, 'flipSpark', 6, {
            spread: 0.05,
          });
        }

        // Time ripples
        this.particleSystem.emit(0.5, 0.5, 'timeRipple', 2, {
          sizeRange: [3.0, 5.0],
          color: [...HOURGLASS_COLORS.goldGlow],
        });

        // Collect bursts
        this.particleSystem.emit(0.5, 0.5, 'collectBurst', 15, {
          spread: 0.15,
          velocityRange: { x: [-0.2, 0.2], y: [-0.2, 0.2] },
        });
      }, wave * 200);
    }

    // Continuous golden dust
    for (let i = 0; i < 60; i++) {
      setTimeout(() => {
        this.particleSystem.emit(
          randomRange(0.1, 0.9),
          randomRange(0.1, 0.9),
          'goldenDust',
          2
        );
      }, i * 30);
    }
  }

  setIntensity(value: number) {
    this.intensity = value;
  }

  destroy() {
    this.particleSystem.clear();
  }
}
