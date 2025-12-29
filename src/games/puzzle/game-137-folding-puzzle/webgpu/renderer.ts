/**
 * WebGPU Renderer - Folding Puzzle
 * Paper / Origami / Japanese Aesthetic Theme
 * Game #137
 */

import { BACKGROUND_SHADER, PARTICLE_SHADER } from './shaders';
import { ParticleSystem } from './particles';
import { ORIGAMI_COLORS } from './math';

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

  private foldProgress: number = 0;

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
      new Float32Array([time, aspectRatio, this.foldProgress, 0])
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
        clearValue: { r: 0.95, g: 0.92, b: 0.88, a: 1 },
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
  emitFoldStart(x: number, y: number, isHorizontal: boolean) {
    // Fold line highlight
    this.particleSystem.emit(x, y, 'foldCrease', 8, {
      speed: 0.02,
      spread: isHorizontal ? Math.PI * 0.2 : Math.PI * 0.2,
      direction: isHorizontal ? 0 : Math.PI / 2,
    });

    // Paper dust
    this.particleSystem.emit(x, y, 'paperDust', 5, {
      speed: 0.01,
      spread: Math.PI * 2,
    });
  }

  emitFoldComplete(x: number, y: number, paperColor?: string) {
    // Paper fold effect
    this.particleSystem.emit(x, y, 'paperFold', 1, {
      size: 0.05,
    });

    // Crease particles
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const dist = 0.03;
      this.particleSystem.emit(
        x + Math.cos(angle) * dist,
        y + Math.sin(angle) * dist,
        'foldCrease',
        1,
        { speed: 0.015 }
      );
    }

    // Gold dust celebration
    this.particleSystem.emit(x, y, 'goldDust', 8, {
      speed: 0.02,
      spread: Math.PI * 2,
    });
  }

  emitLayerCreated(x: number, y: number, layerCount: number) {
    // Layer indicator
    this.particleSystem.emit(x, y, 'layerIndicator', 1, {
      size: 0.04,
    });

    // Paper effect based on layer count
    for (let i = 0; i < layerCount; i++) {
      setTimeout(() => {
        this.particleSystem.emit(x, y, 'paperDust', 3, {
          speed: 0.015 + i * 0.005,
          spread: Math.PI * 2,
        });
      }, i * 50);
    }
  }

  emitUndo(x: number, y: number) {
    // Unfold effect
    this.particleSystem.emit(x, y, 'paperFold', 6, {
      speed: 0.03,
      spread: Math.PI * 2,
    });

    // Paper dust
    this.particleSystem.emit(x, y, 'paperDust', 10, {
      speed: 0.02,
      spread: Math.PI * 2,
    });
  }

  emitLevelComplete() {
    // Sakura petal celebration
    for (let i = 0; i < 15; i++) {
      const x = 0.2 + Math.random() * 0.6;
      const y = Math.random() * 0.3;
      setTimeout(() => {
        this.particleSystem.emit(x, y, 'sakuraPetal', 1, {
          speed: 0.01,
          direction: Math.PI / 2,
          spread: Math.PI * 0.3,
        });
      }, i * 100);
    }

    // Gold dust celebration
    for (let i = 0; i < 20; i++) {
      const x = Math.random();
      const y = Math.random();
      setTimeout(() => {
        this.particleSystem.emit(x, y, 'goldDust', 2, {
          speed: 0.015,
        });
      }, i * 50);
    }
  }

  emitVictory() {
    this.emitLevelComplete();

    // Extra sakura petals
    for (let i = 0; i < 30; i++) {
      const x = Math.random();
      const y = Math.random() * 0.5;

      setTimeout(() => {
        this.particleSystem.emit(x, y, 'sakuraPetal', 1, {
          speed: 0.008,
          direction: Math.PI / 2 + (Math.random() - 0.5) * 0.5,
          spread: Math.PI * 0.2,
        });
      }, i * 80);
    }

    // Paper fold celebration
    const corners = [[0.3, 0.3], [0.7, 0.3], [0.3, 0.7], [0.7, 0.7]];
    corners.forEach(([cx, cy], index) => {
      setTimeout(() => {
        this.particleSystem.emit(cx, cy, 'paperFold', 1, {
          size: 0.06,
        });
      }, index * 150);
    });
  }

  emitLevelStart() {
    // Paper unfold effect
    this.particleSystem.emit(0.5, 0.5, 'paperFold', 1, {
      size: 0.08,
    });

    // Corners dust
    const corners = [[0.2, 0.2], [0.8, 0.2], [0.2, 0.8], [0.8, 0.8]];
    corners.forEach(([x, y], i) => {
      setTimeout(() => {
        this.particleSystem.emit(x, y, 'paperDust', 4, {
          speed: 0.01,
        });
      }, i * 100);
    });
  }

  emitReset() {
    // Clear effect
    this.particleSystem.emit(0.5, 0.5, 'paperFold', 8, {
      speed: 0.04,
      spread: Math.PI * 2,
    });

    // Paper dust burst
    this.particleSystem.emit(0.5, 0.5, 'paperDust', 15, {
      speed: 0.03,
      spread: Math.PI * 2,
    });
  }

  emitAmbient() {
    // Floating sakura petals
    if (Math.random() < 0.15) {
      const x = Math.random();
      this.particleSystem.emit(x, 0, 'sakuraPetal', 1, {
        speed: 0.005,
        direction: Math.PI / 2,
        spread: Math.PI * 0.3,
      });
    }

    // Paper dust floating
    if (Math.random() < 0.2) {
      const x = Math.random();
      const y = Math.random();
      this.particleSystem.emit(x, y, 'paperDust', 1, {
        speed: 0.003,
        direction: -Math.PI / 2,
        spread: Math.PI * 0.3,
      });
    }

    // Gold dust sparkle
    if (Math.random() < 0.1) {
      const x = 0.3 + Math.random() * 0.4;
      const y = 0.3 + Math.random() * 0.4;
      this.particleSystem.emit(x, y, 'goldDust', 1, {
        speed: 0.002,
      });
    }
  }

  setFoldProgress(progress: number) {
    this.foldProgress = Math.max(0, Math.min(1, progress));
  }

  destroy() {
    cancelAnimationFrame(this.animationId);
    this.particleSystem.clear();
    this.device?.destroy();
  }
}
