/**
 * WebGPU Renderer - Stained Glass
 * Cathedral / Light Through Glass Theme
 * Game #143
 */

import { ParticleSystem } from './particles';
import { BACKGROUND_SHADER, PARTICLE_SHADER } from './shaders';
import { GLASS_COLORS, getGlassColor, randomRange } from './math';

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
              dstFactor: 'one',
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
        clearValue: { r: 0.08, g: 0.06, b: 0.14, a: 1 },
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

  emitColorSelect(x: number, y: number, colorIndex: number = 0) {
    const color = getGlassColor(colorIndex);
    this.particleSystem.emit(x, y, 'glassShimmer', 5, {
      spread: 0.03,
      color,
    });
  }

  emitRegionFill(x: number, y: number, colorIndex: number = 0) {
    this.uniforms.eventType = 1;
    this.uniforms.intensity = 1;
    this.eventDecay = 1;

    const color = getGlassColor(colorIndex);
    this.particleSystem.emit(x, y, 'colorFill', 12, {
      spread: 0.08,
      speed: 1.5,
      color,
    });
    this.particleSystem.emit(x, y, 'glassShimmer', 8, {
      spread: 0.05,
      color,
    });
  }

  emitValidColoring(x: number, y: number) {
    this.uniforms.eventType = 2;
    this.uniforms.intensity = 0.8;
    this.eventDecay = 0.8;

    this.particleSystem.emit(x, y, 'prismSparkle', 15, {
      spread: 0.1,
      speed: 1.0,
    });
    this.particleSystem.emit(x, y, 'glowPulse', 5, {
      spread: 0.03,
      size: 1.5,
    });
  }

  emitAmbient() {
    // Light rays from top
    if (Math.random() < 0.15) {
      const x = randomRange(0.2, 0.8);
      this.particleSystem.emit(x, 0.1, 'lightRay', 1, {
        spread: 0.05,
        size: 1.2,
        life: 1.5,
      });
    }

    // Floating dust motes
    if (Math.random() < 0.25) {
      const x = randomRange(0.1, 0.9);
      const y = randomRange(0.2, 0.8);
      this.particleSystem.emit(x, y, 'dustMote', 1, {
        spread: 0.02,
        speed: 0.3,
      });
    }

    // Glass shimmer
    if (Math.random() < 0.1) {
      const x = randomRange(0.2, 0.8);
      const y = randomRange(0.2, 0.8);
      const colorIndex = Math.floor(Math.random() * 5);
      this.particleSystem.emit(x, y, 'glassShimmer', 1, {
        spread: 0.01,
        size: 0.8,
        colorIndex,
      });
    }
  }

  emitLevelStart() {
    // Cathedral light entering
    for (let i = 0; i < 5; i++) {
      setTimeout(() => {
        const x = randomRange(0.2, 0.8);
        this.particleSystem.emit(x, 0.1, 'lightRay', 3, {
          spread: 0.1,
          size: 1.5,
        });
        this.particleSystem.emit(x, 0.3, 'dustMote', 5, {
          spread: 0.15,
        });
      }, i * 100);
    }
  }

  emitReset() {
    // Colors fading
    for (let i = 0; i < 10; i++) {
      const x = randomRange(0.2, 0.8);
      const y = randomRange(0.2, 0.8);
      const colorIndex = i % 5;
      this.particleSystem.emit(x, y, 'glassShimmer', 2, {
        spread: 0.1,
        colorIndex,
        life: 0.5,
      });
    }
  }

  emitLevelComplete() {
    this.uniforms.eventType = 3;
    this.uniforms.intensity = 1;
    this.eventDecay = 2;

    // Radiant celebration
    for (let i = 0; i < 6; i++) {
      setTimeout(() => {
        const angle = (i / 6) * Math.PI * 2;
        const x = 0.5 + Math.cos(angle) * 0.15;
        const y = 0.5 + Math.sin(angle) * 0.15;

        this.particleSystem.emit(x, y, 'prismSparkle', 12, {
          spread: 0.08,
          speed: 1.2,
        });
        this.particleSystem.emit(x, y, 'glowPulse', 4, {
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

    // Grand cathedral glory
    for (let i = 0; i < 12; i++) {
      setTimeout(() => {
        const x = randomRange(0.1, 0.9);
        const y = randomRange(0.1, 0.9);

        this.particleSystem.emit(x, y, 'prismSparkle', 15, {
          spread: 0.1,
          speed: 1.5,
        });
        this.particleSystem.emit(x, y, 'lightRay', 3, {
          spread: 0.05,
          size: 2,
        });
        this.particleSystem.emit(x, y, 'glowPulse', 5, {
          spread: 0.03,
          size: 2.5,
        });
      }, i * 100);
    }
  }

  destroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    this.particleSystem.clear();
  }
}
