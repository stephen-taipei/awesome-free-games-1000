/**
 * WebGPU Renderer - Lego Build
 * Colorful Toys / Construction / Playful Blocks Theme
 * Game #142
 */

import { ParticleSystem } from './particles';
import { BACKGROUND_SHADER, PARTICLE_SHADER } from './shaders';
import { LEGO_COLORS, getLegoColor, randomRange } from './math';

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
  private animationId: number = 0;

  private uniforms = {
    time: 0,
    aspect: 1,
    intensity: 0,
    eventType: 0,
  };

  private eventDecay = 0;

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

      this.createBuffers();
      this.createPipelines();
      this.resize(this.canvas.clientWidth, this.canvas.clientHeight);
      this.render();

      return true;
    } catch (error) {
      console.warn('WebGPU initialization failed:', error);
      return false;
    }
  }

  private createBuffers() {
    this.uniformBuffer = this.device.createBuffer({
      size: 16,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    this.particleBuffer = this.device.createBuffer({
      size: 800 * 12 * 4,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });
  }

  private createPipelines() {
    const uniformBindGroupLayout = this.device.createBindGroupLayout({
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
          buffer: { type: 'uniform' },
        },
      ],
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

    // Background pipeline
    const backgroundModule = this.device.createShaderModule({
      code: BACKGROUND_SHADER,
    });

    this.backgroundPipeline = this.device.createRenderPipeline({
      layout: this.device.createPipelineLayout({
        bindGroupLayouts: [uniformBindGroupLayout],
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

    // Particle pipeline
    const particleModule = this.device.createShaderModule({
      code: PARTICLE_SHADER,
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

    // Bind groups
    this.backgroundBindGroup = this.device.createBindGroup({
      layout: uniformBindGroupLayout,
      entries: [{ binding: 0, resource: { buffer: this.uniformBuffer } }],
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
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = width * dpr;
    this.canvas.height = height * dpr;
    this.uniforms.aspect = width / height;
  }

  private render = () => {
    const now = performance.now();
    const deltaTime = (now - this.lastTime) / 1000;
    this.lastTime = now;

    this.uniforms.time = (now - this.startTime) / 1000;

    // Decay event intensity
    if (this.eventDecay > 0) {
      this.eventDecay -= deltaTime * 2;
      this.uniforms.intensity = Math.max(0, this.eventDecay);
      if (this.eventDecay <= 0) {
        this.uniforms.eventType = 0;
      }
    }

    this.particleSystem.update(deltaTime);

    // Update uniforms
    this.device.queue.writeBuffer(
      this.uniformBuffer,
      0,
      new Float32Array([
        this.uniforms.time,
        this.uniforms.aspect,
        this.uniforms.intensity,
        this.uniforms.eventType,
      ])
    );

    // Update particles
    this.device.queue.writeBuffer(
      this.particleBuffer,
      0,
      this.particleSystem.getParticleData()
    );

    const commandEncoder = this.device.createCommandEncoder();
    const textureView = this.context.getCurrentTexture().createView();

    const renderPass = commandEncoder.beginRenderPass({
      colorAttachments: [{
        view: textureView,
        clearValue: { r: 0.1, g: 0.15, b: 0.3, a: 1 },
        loadOp: 'clear',
        storeOp: 'store',
      }],
    });

    // Draw background
    renderPass.setPipeline(this.backgroundPipeline);
    renderPass.setBindGroup(0, this.backgroundBindGroup);
    renderPass.draw(4);

    // Draw particles
    const particleCount = this.particleSystem.getParticleCount();
    if (particleCount > 0) {
      renderPass.setPipeline(this.particlePipeline);
      renderPass.setBindGroup(0, this.particleBindGroup);
      renderPass.draw(4, particleCount);
    }

    renderPass.end();
    this.device.queue.submit([commandEncoder.finish()]);

    this.animationId = requestAnimationFrame(this.render);
  };

  // === Event Emitters ===

  emitBlockPickup(x: number, y: number, colorIndex: number = 0) {
    const color = getLegoColor(colorIndex);
    this.particleSystem.emit(x, y, 'blockGlow', 8, {
      spread: 0.06,
      color,
      speed: 0.3,
    });
    this.particleSystem.emit(x, y, 'plasticDust', 5, {
      spread: 0.04,
      colorIndex,
    });
  }

  emitBlockPlace(x: number, y: number, colorIndex: number = 0) {
    this.uniforms.eventType = 1;
    this.uniforms.intensity = 1;
    this.eventDecay = 1;

    const color = getLegoColor(colorIndex);
    this.particleSystem.emit(x, y, 'placeSpark', 15, {
      spread: 0.08,
      speed: 1.2,
      color,
    });
    this.particleSystem.emit(x, y, 'snapFlash', 3, {
      spread: 0.02,
      size: 1.5,
    });
    this.particleSystem.emit(x, y, 'studShine', 6, {
      spread: 0.05,
    });
  }

  emitBlockRotate(x: number, y: number, colorIndex: number = 0) {
    this.uniforms.eventType = 2;
    this.uniforms.intensity = 0.8;
    this.eventDecay = 0.8;

    const color = getLegoColor(colorIndex);
    this.particleSystem.emit(x, y, 'rotatePop', 12, {
      spread: 0.06,
      speed: 0.8,
      color,
    });
    this.particleSystem.emit(x, y, 'plasticDust', 8, {
      spread: 0.1,
      colorIndex,
    });
  }

  emitBlockSnap(x: number, y: number) {
    this.particleSystem.emit(x, y, 'snapFlash', 5, {
      spread: 0.03,
      size: 1.2,
      speed: 1.5,
    });
    this.particleSystem.emit(x, y, 'studShine', 8, {
      spread: 0.06,
    });
  }

  emitAmbient() {
    // Occasional floating plastic dust
    if (Math.random() < 0.3) {
      const x = randomRange(0.1, 0.9);
      const y = randomRange(0.1, 0.5);
      this.particleSystem.emit(x, y, 'plasticDust', 1, {
        spread: 0.02,
        speed: 0.2,
        life: 1.5,
      });
    }

    // Subtle stud shines
    if (Math.random() < 0.2) {
      const x = randomRange(0.2, 0.8);
      const y = randomRange(0.2, 0.8);
      this.particleSystem.emit(x, y, 'studShine', 1, {
        spread: 0.01,
        size: 0.6,
      });
    }
  }

  emitLevelStart() {
    for (let i = 0; i < 5; i++) {
      setTimeout(() => {
        const x = randomRange(0.2, 0.8);
        const y = randomRange(0.3, 0.7);
        const colorIndex = i % 5;
        this.particleSystem.emit(x, y, 'placeSpark', 10, {
          spread: 0.1,
          colorIndex,
          speed: 0.8,
        });
        this.particleSystem.emit(x, y, 'blockGlow', 5, {
          spread: 0.05,
          colorIndex,
        });
      }, i * 100);
    }
  }

  emitReset() {
    // Scatter particles
    for (let i = 0; i < 20; i++) {
      const x = randomRange(0.2, 0.8);
      const y = randomRange(0.3, 0.7);
      const colorIndex = Math.floor(Math.random() * 5);
      this.particleSystem.emit(x, y, 'plasticDust', 3, {
        spread: 0.15,
        speed: 0.6,
        colorIndex,
      });
    }
  }

  emitLevelComplete() {
    this.uniforms.eventType = 3;
    this.uniforms.intensity = 1;
    this.eventDecay = 2;

    // Celebration burst
    for (let i = 0; i < 6; i++) {
      setTimeout(() => {
        const angle = (i / 6) * Math.PI * 2;
        const x = 0.5 + Math.cos(angle) * 0.15;
        const y = 0.5 + Math.sin(angle) * 0.15;
        const colorIndex = i % 5;

        this.particleSystem.emit(x, y, 'placeSpark', 15, {
          spread: 0.1,
          speed: 1.5,
          colorIndex,
        });
        this.particleSystem.emit(x, y, 'snapFlash', 3, {
          spread: 0.02,
          size: 2,
        });
      }, i * 80);
    }
  }

  emitVictory() {
    this.uniforms.eventType = 4;
    this.uniforms.intensity = 1;
    this.eventDecay = 3;

    // Grand celebration
    for (let i = 0; i < 10; i++) {
      setTimeout(() => {
        const x = randomRange(0.1, 0.9);
        const y = randomRange(0.2, 0.8);
        const colorIndex = i % 5;

        this.particleSystem.emit(x, y, 'placeSpark', 20, {
          spread: 0.12,
          speed: 2,
          colorIndex,
        });
        this.particleSystem.emit(x, y, 'blockGlow', 8, {
          spread: 0.08,
          size: 1.5,
          colorIndex,
        });
        this.particleSystem.emit(x, y, 'snapFlash', 4, {
          spread: 0.03,
          size: 2.5,
        });
      }, i * 120);
    }
  }

  destroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    this.particleSystem.clear();
  }
}
