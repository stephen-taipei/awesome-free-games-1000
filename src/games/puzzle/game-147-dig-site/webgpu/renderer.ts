/**
 * WebGPU Renderer - Dig Site
 * Archaeological / Desert / Earth / Discovery Theme
 * Game #147
 */

import { BACKGROUND_SHADER, PARTICLE_SHADER } from './shaders';
import { ParticleSystem } from './particles';

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

  private particles: ParticleSystem;
  private startTime = performance.now();
  private animationId: number | null = null;
  private currentLayer = 1;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.particles = new ParticleSystem();
  }

  async init(): Promise<boolean> {
    if (!navigator.gpu) return false;

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
      await this.createPipelines();
      this.startRenderLoop();

      return true;
    } catch (e) {
      console.warn('WebGPU init failed:', e);
      return false;
    }
  }

  private async createPipelines() {
    // Background pipeline
    const bgModule = this.device.createShaderModule({ code: BACKGROUND_SHADER });
    this.bgPipeline = this.device.createRenderPipeline({
      layout: 'auto',
      vertex: { module: bgModule, entryPoint: 'vertexMain' },
      fragment: {
        module: bgModule,
        entryPoint: 'fragmentMain',
        targets: [{ format: this.format }],
      },
      primitive: { topology: 'triangle-list' },
    });

    this.bgUniformBuffer = this.device.createBuffer({
      size: 16,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    this.bgBindGroup = this.device.createBindGroup({
      layout: this.bgPipeline.getBindGroupLayout(0),
      entries: [{ binding: 0, resource: { buffer: this.bgUniformBuffer } }],
    });

    // Particle pipeline
    const particleModule = this.device.createShaderModule({ code: PARTICLE_SHADER });
    this.particlePipeline = this.device.createRenderPipeline({
      layout: 'auto',
      vertex: { module: particleModule, entryPoint: 'vertexMain' },
      fragment: {
        module: particleModule,
        entryPoint: 'fragmentMain',
        targets: [{
          format: this.format,
          blend: {
            color: { srcFactor: 'src-alpha', dstFactor: 'one-minus-src-alpha', operation: 'add' },
            alpha: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' },
          },
        }],
      },
      primitive: { topology: 'triangle-list' },
    });

    this.particleUniformBuffer = this.device.createBuffer({
      size: 16,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    this.particleStorageBuffer = this.device.createBuffer({
      size: 600 * 12 * 4,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });

    this.particleBindGroup = this.device.createBindGroup({
      layout: this.particlePipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: this.particleUniformBuffer } },
        { binding: 1, resource: { buffer: this.particleStorageBuffer } },
      ],
    });
  }

  resize(width: number, height: number) {
    const dpr = Math.min(window.devicePixelRatio, 2);
    this.canvas.width = width * dpr;
    this.canvas.height = height * dpr;
  }

  private startRenderLoop() {
    let lastTime = performance.now();

    const render = () => {
      const now = performance.now();
      const dt = (now - lastTime) / 1000;
      lastTime = now;

      this.particles.update(dt);
      this.render();
      this.animationId = requestAnimationFrame(render);
    };

    render();
  }

  private render() {
    const time = (performance.now() - this.startTime) / 1000;

    // Update background uniforms
    const bgData = new Float32Array([
      time,
      this.canvas.width,
      this.canvas.height,
      this.currentLayer,
    ]);
    this.device.queue.writeBuffer(this.bgUniformBuffer, 0, bgData);

    // Update particle uniforms
    const particleData = new Float32Array([
      time,
      this.canvas.width,
      this.canvas.height,
      this.currentLayer,
    ]);
    this.device.queue.writeBuffer(this.particleUniformBuffer, 0, particleData);

    // Update particle storage
    const particles = this.particles.getParticleData();
    if (particles.length > 0) {
      this.device.queue.writeBuffer(this.particleStorageBuffer, 0, particles);
    }

    const encoder = this.device.createCommandEncoder();
    const textureView = this.context.getCurrentTexture().createView();

    // Background pass
    const bgPass = encoder.beginRenderPass({
      colorAttachments: [{
        view: textureView,
        clearValue: { r: 0.82, g: 0.71, b: 0.55, a: 1 },
        loadOp: 'clear',
        storeOp: 'store',
      }],
    });

    bgPass.setPipeline(this.bgPipeline);
    bgPass.setBindGroup(0, this.bgBindGroup);
    bgPass.draw(6);
    bgPass.end();

    // Particle pass
    const particleCount = this.particles.getParticleCount();
    if (particleCount > 0) {
      const particlePass = encoder.beginRenderPass({
        colorAttachments: [{
          view: textureView,
          loadOp: 'load',
          storeOp: 'store',
        }],
      });

      particlePass.setPipeline(this.particlePipeline);
      particlePass.setBindGroup(0, this.particleBindGroup);
      particlePass.draw(6, particleCount);
      particlePass.end();
    }

    this.device.queue.submit([encoder.finish()]);
  }

  setCurrentLayer(layer: number) {
    this.currentLayer = layer;
  }

  // Event emitters
  emitDig(x: number, y: number) {
    this.particles.emit('dustCloud', x, y, 6, {
      spread: 0.03,
      speed: 0.08,
      sizeMin: 0.02,
      sizeMax: 0.05,
      lifeMin: 0.6,
      lifeMax: 1.2,
    });
    this.particles.emit('sandParticle', x, y, 10, {
      spread: 0.04,
      speed: 0.15,
      sizeMin: 0.008,
      sizeMax: 0.02,
      lifeMin: 0.3,
      lifeMax: 0.8,
    });
    this.particles.emit('earthCrumble', x, y, 5, {
      spread: 0.02,
      speed: 0.1,
      sizeMin: 0.01,
      sizeMax: 0.025,
      lifeMin: 0.4,
      lifeMax: 0.9,
    });
  }

  emitDigImpact(x: number, y: number) {
    this.particles.emit('digImpact', x, y, 15, {
      spread: 0.02,
      speed: 0.2,
      sizeMin: 0.015,
      sizeMax: 0.035,
      lifeMin: 0.3,
      lifeMax: 0.7,
    });
    this.particles.emit('dustCloud', x, y, 8, {
      spread: 0.05,
      speed: 0.05,
      sizeMin: 0.03,
      sizeMax: 0.07,
      lifeMin: 0.8,
      lifeMax: 1.5,
    });
  }

  emitArtifactReveal(x: number, y: number) {
    this.particles.emit('artifactGlimmer', x, y, 12, {
      spread: 0.05,
      speed: 0.05,
      sizeMin: 0.01,
      sizeMax: 0.025,
      lifeMin: 0.8,
      lifeMax: 1.5,
    });
  }

  emitArtifactFound(x: number, y: number) {
    this.particles.emit('discoverySparkle', x, y, 25, {
      spread: 0.03,
      speed: 0.2,
      sizeMin: 0.015,
      sizeMax: 0.04,
      lifeMin: 1.0,
      lifeMax: 2.0,
    });
    this.particles.emit('artifactGlimmer', x, y, 15, {
      spread: 0.06,
      speed: 0.1,
      sizeMin: 0.02,
      sizeMax: 0.035,
      lifeMin: 0.8,
      lifeMax: 1.5,
    });
  }

  emitAmbient() {
    // Random dust particles
    if (Math.random() > 0.8) {
      const x = Math.random();
      const y = Math.random();
      this.particles.emit('dustCloud', x, y, 1, {
        spread: 0.01,
        speed: 0.02,
        sizeMin: 0.015,
        sizeMax: 0.03,
        lifeMin: 2.0,
        lifeMax: 4.0,
      });
    }

    // Occasional sand grain
    if (Math.random() > 0.9) {
      const x = Math.random();
      const y = 0.1 + Math.random() * 0.3;
      this.particles.emit('sandParticle', x, y, 1, {
        spread: 0.01,
        speed: 0.01,
        sizeMin: 0.005,
        sizeMax: 0.012,
        lifeMin: 1.5,
        lifeMax: 3.0,
      });
    }
  }

  emitLevelStart() {
    // Dust settles reveal
    for (let i = 0; i < 5; i++) {
      const x = 0.2 + Math.random() * 0.6;
      const y = 0.2 + Math.random() * 0.6;
      this.particles.emit('dustCloud', x, y, 8, {
        spread: 0.08,
        speed: 0.05,
        sizeMin: 0.02,
        sizeMax: 0.05,
        lifeMin: 1.0,
        lifeMax: 2.0,
      });
    }
  }

  emitReset() {
    // Lots of earth covering
    for (let i = 0; i < 8; i++) {
      const x = Math.random();
      const y = Math.random();
      this.particles.emit('earthCrumble', x, y, 10, {
        spread: 0.1,
        speed: 0.08,
        sizeMin: 0.015,
        sizeMax: 0.04,
        lifeMin: 0.8,
        lifeMax: 1.5,
      });
    }
  }

  emitLevelComplete() {
    // Discovery celebration
    const centerX = 0.5;
    const centerY = 0.5;

    this.particles.emit('discoverySparkle', centerX, centerY, 40, {
      spread: 0.08,
      speed: 0.25,
      sizeMin: 0.02,
      sizeMax: 0.05,
      lifeMin: 1.0,
      lifeMax: 2.0,
    });

    this.particles.emit('artifactGlimmer', centerX, centerY, 25, {
      spread: 0.15,
      speed: 0.15,
      sizeMin: 0.02,
      sizeMax: 0.04,
      lifeMin: 1.2,
      lifeMax: 2.5,
    });
  }

  emitVictory() {
    // Grand archaeological discovery
    for (let i = 0; i < 10; i++) {
      setTimeout(() => {
        const x = 0.2 + Math.random() * 0.6;
        const y = 0.2 + Math.random() * 0.6;

        this.particles.emit('discoverySparkle', x, y, 30, {
          spread: 0.06,
          speed: 0.3,
          sizeMin: 0.025,
          sizeMax: 0.06,
          lifeMin: 1.2,
          lifeMax: 2.5,
        });

        this.particles.emit('artifactGlimmer', x, y, 20, {
          spread: 0.1,
          speed: 0.15,
          sizeMin: 0.02,
          sizeMax: 0.045,
          lifeMin: 1.0,
          lifeMax: 2.0,
        });
      }, i * 120);
    }
  }

  destroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    this.particles.clear();
  }
}
