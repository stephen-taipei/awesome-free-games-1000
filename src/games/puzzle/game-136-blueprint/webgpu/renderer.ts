/**
 * WebGPU Renderer - Blueprint
 * Architecture / Engineering / Construction Theme
 * Game #136
 */

import { BACKGROUND_SHADER, PARTICLE_SHADER } from './shaders';
import { ParticleSystem } from './particles';
import { BLUEPRINT_COLORS, hexToRGBA } from './math';

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
  private animationId: number = 0;

  private buildProgress: number = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.particleSystem = new ParticleSystem(300);
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
      this.resize(this.canvas.clientWidth, this.canvas.clientHeight);
      this.startAnimation();

      return true;
    } catch (e) {
      console.error('WebGPU init failed:', e);
      return false;
    }
  }

  private createBuffers() {
    if (!this.device) return;

    this.uniformBuffer = this.device.createBuffer({
      size: 16,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    this.particleBuffer = this.device.createBuffer({
      size: 300 * 12 * 4,
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
      entries: [{
        binding: 0,
        visibility: GPUShaderStage.FRAGMENT,
        buffer: { type: 'uniform' },
      }],
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
        targets: [{ format: this.format }],
      },
      primitive: { topology: 'triangle-list' },
    });

    this.backgroundBindGroup = this.device.createBindGroup({
      layout: bgBindGroupLayout,
      entries: [{
        binding: 0,
        resource: { buffer: this.uniformBuffer },
      }],
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

  private startAnimation() {
    const animate = () => {
      const now = performance.now();
      const deltaTime = (now - this.lastTime) / 1000;
      this.lastTime = now;

      this.particleSystem.update(deltaTime);
      this.render();

      this.animationId = requestAnimationFrame(animate);
    };
    animate();
  }

  private render() {
    if (!this.device || !this.context || !this.uniformBuffer || !this.particleBuffer) return;
    if (!this.backgroundPipeline || !this.particlePipeline) return;
    if (!this.backgroundBindGroup || !this.particleBindGroup) return;

    const time = (performance.now() - this.startTime) / 1000;
    const aspectRatio = this.canvas.width / this.canvas.height;

    this.device.queue.writeBuffer(
      this.uniformBuffer,
      0,
      new Float32Array([time, aspectRatio, this.buildProgress, 0])
    );

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
        clearValue: { r: 0.05, g: 0.15, b: 0.35, a: 1 },
        loadOp: 'clear',
        storeOp: 'store',
      }],
    });

    // Draw background
    renderPass.setPipeline(this.backgroundPipeline);
    renderPass.setBindGroup(0, this.backgroundBindGroup);
    renderPass.draw(6);

    // Draw particles
    const particleCount = this.particleSystem.getActiveCount();
    if (particleCount > 0) {
      renderPass.setPipeline(this.particlePipeline);
      renderPass.setBindGroup(0, this.particleBindGroup);
      renderPass.draw(6, particleCount);
    }

    renderPass.end();
    this.device.queue.submit([commandEncoder.finish()]);
  }

  resize(width: number, height: number) {
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = width * dpr;
    this.canvas.height = height * dpr;
  }

  // Event emitters
  emitBlockSelect(x: number, y: number, blockColor?: string) {
    const color = blockColor ? hexToRGBA(blockColor) :
      [...BLUEPRINT_COLORS.dimensionLine] as [number, number, number, number];

    this.particleSystem.emit(x, y, 'dimensionMarker', 4, {
      color,
      speed: 0.01,
      spread: Math.PI * 2,
    });

    // Grid dots around selection
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const dist = 0.03;
      this.particleSystem.emit(
        x + Math.cos(angle) * dist,
        y + Math.sin(angle) * dist,
        'gridDot',
        1,
        { speed: 0.005 }
      );
    }
  }

  emitBlockPlace(x: number, y: number, blockColor?: string) {
    const color = blockColor ? hexToRGBA(blockColor) :
      [...BLUEPRINT_COLORS.constructionYellow] as [number, number, number, number];

    // Block placement effect
    this.particleSystem.emit(x, y, 'blockPlace', 1, {
      color,
      size: 0.04,
    });

    // Construction sparks
    this.particleSystem.emit(x, y, 'constructionSpark', 12, {
      speed: 0.04,
      spread: Math.PI * 2,
    });

    // Blueprint trace
    this.particleSystem.emit(x, y, 'blueprintTrace', 6, {
      speed: 0.02,
      spread: Math.PI * 2,
    });
  }

  emitBlockRemove(x: number, y: number) {
    // Measurement lines
    this.particleSystem.emit(x, y, 'measureLine', 4, {
      speed: 0.03,
      spread: Math.PI * 0.5,
      direction: 0,
    });
    this.particleSystem.emit(x, y, 'measureLine', 4, {
      speed: 0.03,
      spread: Math.PI * 0.5,
      direction: Math.PI / 2,
    });
  }

  emitWrongPlace(x: number, y: number) {
    const color = [...BLUEPRINT_COLORS.measureRed] as [number, number, number, number];

    // Red X effect
    this.particleSystem.emit(x, y, 'dimensionMarker', 8, {
      color,
      speed: 0.025,
      spread: Math.PI * 2,
    });
  }

  emitLevelComplete() {
    // Victory celebration
    for (let i = 0; i < 30; i++) {
      const x = 0.3 + Math.random() * 0.4;
      const y = 0.3 + Math.random() * 0.4;

      this.particleSystem.emit(x, y, 'constructionSpark', 3, {
        speed: 0.05,
        spread: Math.PI * 2,
      });

      this.particleSystem.emit(x, y, 'blueprintTrace', 2, {
        speed: 0.03,
        spread: Math.PI * 2,
      });
    }

    // Corner markers
    const corners = [[0.2, 0.2], [0.8, 0.2], [0.2, 0.8], [0.8, 0.8]];
    corners.forEach(([cx, cy]) => {
      this.particleSystem.emit(cx, cy, 'blockPlace', 1, {
        color: [...BLUEPRINT_COLORS.weldGlow] as [number, number, number, number],
        size: 0.05,
      });
    });
  }

  emitVictory() {
    this.emitLevelComplete();

    // Additional grand effects
    for (let i = 0; i < 50; i++) {
      const angle = (i / 50) * Math.PI * 2;
      const x = 0.5 + Math.cos(angle) * 0.3;
      const y = 0.5 + Math.sin(angle) * 0.3;

      setTimeout(() => {
        this.particleSystem.emit(x, y, 'constructionSpark', 5, {
          speed: 0.06,
          spread: Math.PI * 0.5,
          direction: angle + Math.PI,
        });
      }, i * 30);
    }
  }

  emitLevelStart() {
    // Blueprint reveal effect
    for (let i = 0; i < 20; i++) {
      const x = 0.2 + (i % 5) * 0.15;
      const y = 0.2 + Math.floor(i / 5) * 0.15;

      setTimeout(() => {
        this.particleSystem.emit(x, y, 'gridDot', 3, {
          speed: 0.01,
        });
        this.particleSystem.emit(x, y, 'blueprintTrace', 1, {
          speed: 0.02,
        });
      }, i * 50);
    }
  }

  emitReset() {
    // Clear effect
    this.particleSystem.emit(0.5, 0.5, 'measureLine', 8, {
      speed: 0.04,
      spread: Math.PI * 2,
    });

    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      const x = 0.5 + Math.cos(angle) * 0.2;
      const y = 0.5 + Math.sin(angle) * 0.2;
      this.particleSystem.emit(x, y, 'gridDot', 2, {
        speed: 0.02,
        direction: angle,
        spread: Math.PI * 0.3,
      });
    }
  }

  emitAmbient() {
    // Floating grid dots
    if (Math.random() < 0.3) {
      const x = Math.random();
      const y = Math.random();
      this.particleSystem.emit(x, y, 'gridDot', 1, {
        speed: 0.003,
        direction: -Math.PI / 2,
        spread: Math.PI * 0.2,
      });
    }

    // Blueprint traces on edges
    if (Math.random() < 0.15) {
      const edge = Math.floor(Math.random() * 4);
      let x = 0, y = 0, dir = 0;

      switch (edge) {
        case 0: x = Math.random(); y = 0.05; dir = Math.PI / 2; break;
        case 1: x = Math.random(); y = 0.95; dir = -Math.PI / 2; break;
        case 2: x = 0.05; y = Math.random(); dir = 0; break;
        case 3: x = 0.95; y = Math.random(); dir = Math.PI; break;
      }

      this.particleSystem.emit(x, y, 'blueprintTrace', 1, {
        speed: 0.01,
        direction: dir,
        spread: Math.PI * 0.1,
      });
    }
  }

  setBuildProgress(progress: number) {
    this.buildProgress = Math.max(0, Math.min(1, progress));
  }

  destroy() {
    cancelAnimationFrame(this.animationId);
    this.particleSystem.clear();
    this.device?.destroy();
  }
}
