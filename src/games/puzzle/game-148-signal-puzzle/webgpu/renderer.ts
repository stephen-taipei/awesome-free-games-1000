/**
 * WebGPU Renderer - Signal Puzzle
 * Radio / Telecommunications / Electromagnetic Theme
 * Game #148
 */

import { ParticleSystem } from './particles';
import { BACKGROUND_SHADER, PARTICLE_SHADER } from './shaders';
import { SIGNAL_COLORS, randomRange } from './math';

export class WebGPURenderer {
  private canvas: HTMLCanvasElement;
  private context: GPUCanvasContext | null = null;
  private device: GPUDevice | null = null;
  private format: GPUTextureFormat = 'bgra8unorm';

  private backgroundPipeline: GPURenderPipeline | null = null;
  private particlePipeline: GPURenderPipeline | null = null;

  private uniformBuffer: GPUBuffer | null = null;
  private particleBuffer: GPUBuffer | null = null;

  private backgroundBindGroup: GPUBindGroup | null = null;
  private particleBindGroup: GPUBindGroup | null = null;

  private particleSystem: ParticleSystem;
  private startTime: number = performance.now();
  private lastTime: number = performance.now();
  private animationId: number | null = null;

  private signalStrength: number = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.particleSystem = new ParticleSystem(600);
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
      this.context = this.canvas.getContext('webgpu');
      if (!this.context) return false;

      this.format = navigator.gpu.getPreferredCanvasFormat();
      this.context.configure({
        device: this.device,
        format: this.format,
        alphaMode: 'premultiplied',
      });

      this.createBuffers();
      this.createPipelines();
      this.startRenderLoop();

      return true;
    } catch (e) {
      console.warn('WebGPU initialization failed:', e);
      return false;
    }
  }

  private createBuffers() {
    if (!this.device) return;

    // Uniform buffer: time, resolution(2), signalStrength
    this.uniformBuffer = this.device.createBuffer({
      size: 16,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    // Particle buffer
    this.particleBuffer = this.device.createBuffer({
      size: 600 * 12 * 4,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });
  }

  private createPipelines() {
    if (!this.device) return;

    // Background pipeline
    const backgroundModule = this.device.createShaderModule({
      code: BACKGROUND_SHADER,
    });

    this.backgroundPipeline = this.device.createRenderPipeline({
      layout: 'auto',
      vertex: {
        module: backgroundModule,
        entryPoint: 'vertexMain',
      },
      fragment: {
        module: backgroundModule,
        entryPoint: 'fragmentMain',
        targets: [{ format: this.format }],
      },
      primitive: {
        topology: 'triangle-strip',
      },
    });

    // Particle pipeline
    const particleModule = this.device.createShaderModule({
      code: PARTICLE_SHADER,
    });

    this.particlePipeline = this.device.createRenderPipeline({
      layout: 'auto',
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
      primitive: {
        topology: 'triangle-strip',
      },
    });

    // Create bind groups
    this.backgroundBindGroup = this.device.createBindGroup({
      layout: this.backgroundPipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: this.uniformBuffer! } },
      ],
    });

    this.particleBindGroup = this.device.createBindGroup({
      layout: this.particlePipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: this.uniformBuffer! } },
        { binding: 1, resource: { buffer: this.particleBuffer! } },
      ],
    });
  }

  private startRenderLoop() {
    const render = () => {
      const currentTime = performance.now();
      const deltaTime = (currentTime - this.lastTime) / 1000;
      this.lastTime = currentTime;

      this.particleSystem.update(deltaTime);
      this.render();

      this.animationId = requestAnimationFrame(render);
    };
    render();
  }

  private render() {
    if (!this.device || !this.context || !this.uniformBuffer || !this.particleBuffer) return;

    const time = (performance.now() - this.startTime) / 1000;

    // Update uniforms
    const uniformData = new Float32Array([
      time,
      this.canvas.width,
      this.canvas.height,
      this.signalStrength / 100,
    ]);
    this.device.queue.writeBuffer(this.uniformBuffer, 0, uniformData);

    // Update particles
    const particleData = this.particleSystem.getParticleData();
    this.device.queue.writeBuffer(this.particleBuffer, 0, particleData);

    const commandEncoder = this.device.createCommandEncoder();
    const textureView = this.context.getCurrentTexture().createView();

    const renderPass = commandEncoder.beginRenderPass({
      colorAttachments: [{
        view: textureView,
        clearValue: { r: 0.12, g: 0.15, b: 0.18, a: 1 },
        loadOp: 'clear',
        storeOp: 'store',
      }],
    });

    // Render background
    if (this.backgroundPipeline && this.backgroundBindGroup) {
      renderPass.setPipeline(this.backgroundPipeline);
      renderPass.setBindGroup(0, this.backgroundBindGroup);
      renderPass.draw(4);
    }

    // Render particles
    const particleCount = this.particleSystem.getParticleCount();
    if (particleCount > 0 && this.particlePipeline && this.particleBindGroup) {
      renderPass.setPipeline(this.particlePipeline);
      renderPass.setBindGroup(0, this.particleBindGroup);
      renderPass.draw(4, particleCount);
    }

    renderPass.end();
    this.device.queue.submit([commandEncoder.finish()]);
  }

  resize(width: number, height: number) {
    if (!this.context || !this.device) return;

    this.canvas.width = width * window.devicePixelRatio;
    this.canvas.height = height * window.devicePixelRatio;

    this.context.configure({
      device: this.device,
      format: this.format,
      alphaMode: 'premultiplied',
    });
  }

  setSignalStrength(strength: number) {
    this.signalStrength = strength;
  }

  // Tower rotation - signal waves expand
  emitTowerRotate(x: number, y: number) {
    this.particleSystem.emit(x, y, 'signalWave', 3, {
      speed: 0.04,
      size: 25,
      life: 0.8,
      spread: Math.PI * 2,
    });

    this.particleSystem.emit(x, y, 'radioStatic', 8, {
      speed: 0.03,
      size: 6,
      life: 0.4,
      spread: Math.PI * 2,
    });
  }

  // Signal connection established
  emitSignalConnect(x: number, y: number) {
    this.particleSystem.emit(x, y, 'electromagneticBurst', 12, {
      speed: 0.06,
      size: 18,
      life: 0.6,
      spread: Math.PI * 2,
      color: SIGNAL_COLORS.signalCyan,
    });

    this.particleSystem.emit(x, y, 'frequencyRipple', 4, {
      speed: 0.02,
      size: 30,
      life: 1.0,
    });

    this.particleSystem.emit(x, y, 'transmissionGlow', 6, {
      speed: 0.01,
      size: 20,
      life: 1.2,
    });
  }

  // Data pulse traveling along beam
  emitDataPulse(x: number, y: number, direction: number) {
    this.particleSystem.emit(x, y, 'dataPulse', 3, {
      speed: 0.08,
      size: 10,
      life: 0.6,
      spread: 0.3,
      direction: direction,
      color: SIGNAL_COLORS.dataStream,
    });
  }

  // Signal disconnection
  emitSignalDisconnect(x: number, y: number) {
    this.particleSystem.emit(x, y, 'radioStatic', 15, {
      speed: 0.04,
      size: 8,
      life: 0.5,
      spread: Math.PI * 2,
      color: SIGNAL_COLORS.transmitOrange,
    });
  }

  // Ambient electromagnetic field
  emitAmbient() {
    // Random static across the field
    const x = Math.random();
    const y = Math.random();

    this.particleSystem.emit(x, y, 'radioStatic', 1, {
      speed: 0.005,
      size: 4,
      life: 0.8,
    });

    // Occasional frequency ripples
    if (Math.random() < 0.1) {
      this.particleSystem.emit(
        randomRange(0.2, 0.8),
        randomRange(0.2, 0.8),
        'frequencyRipple',
        1,
        { speed: 0.01, size: 20, life: 1.2 }
      );
    }
  }

  emitLevelStart() {
    // Startup signal burst
    for (let i = 0; i < 5; i++) {
      setTimeout(() => {
        this.particleSystem.emit(0.1, 0.5, 'signalWave', 2, {
          speed: 0.05,
          size: 30,
          life: 1.2,
        });

        this.particleSystem.emit(0.1, 0.5, 'transmissionGlow', 5, {
          speed: 0.02,
          size: 15,
          life: 1.0,
        });
      }, i * 100);
    }
  }

  emitReset() {
    // Static discharge
    for (let i = 0; i < 30; i++) {
      this.particleSystem.emit(
        randomRange(0.2, 0.8),
        randomRange(0.2, 0.8),
        'radioStatic',
        1,
        { speed: 0.03, size: 6, life: 0.6 }
      );
    }
  }

  emitLevelComplete() {
    // Success signal cascade
    const centers = [
      [0.3, 0.3], [0.5, 0.5], [0.7, 0.3],
      [0.3, 0.7], [0.7, 0.7]
    ];

    centers.forEach(([cx, cy], i) => {
      setTimeout(() => {
        this.particleSystem.emit(cx, cy, 'signalWave', 3, {
          speed: 0.04,
          size: 35,
          life: 1.0,
          color: SIGNAL_COLORS.activeGreen,
        });

        this.particleSystem.emit(cx, cy, 'electromagneticBurst', 10, {
          speed: 0.05,
          size: 15,
          life: 0.8,
          color: SIGNAL_COLORS.signalCyan,
        });
      }, i * 120);
    });
  }

  emitVictory() {
    // Full network activation
    for (let i = 0; i < 8; i++) {
      setTimeout(() => {
        const angle = (i / 8) * Math.PI * 2;
        const x = 0.5 + Math.cos(angle) * 0.3;
        const y = 0.5 + Math.sin(angle) * 0.3;

        this.particleSystem.emit(x, y, 'signalWave', 4, {
          speed: 0.05,
          size: 40,
          life: 1.5,
          color: SIGNAL_COLORS.dataStream,
        });

        this.particleSystem.emit(x, y, 'electromagneticBurst', 15, {
          speed: 0.07,
          size: 20,
          life: 1.0,
        });

        this.particleSystem.emit(x, y, 'frequencyRipple', 5, {
          speed: 0.02,
          size: 35,
          life: 1.5,
        });
      }, i * 150);
    }

    // Center finale
    setTimeout(() => {
      this.particleSystem.emit(0.5, 0.5, 'transmissionGlow', 30, {
        speed: 0.03,
        size: 25,
        life: 2.0,
        color: SIGNAL_COLORS.activeGreen,
      });
    }, 1200);
  }

  destroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    this.particleSystem.clear();
    this.device?.destroy();
  }
}
