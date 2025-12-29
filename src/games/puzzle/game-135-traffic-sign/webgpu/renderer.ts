/**
 * WebGPU Renderer - Traffic Sign
 * Urban / Road / Traffic Theme
 * Game #135
 */

import { ParticleSystem } from './particles';
import { BACKGROUND_SHADER, PARTICLE_SHADER } from './shaders';

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
  private startTime: number = 0;
  private lastTime: number = 0;
  private animationId: number = 0;

  private gameState: number = 0;
  private matchProgress: number = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.particleSystem = new ParticleSystem();
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
      this.context = this.canvas.getContext('webgpu');
      if (!this.context) return false;

      this.format = navigator.gpu.getPreferredCanvasFormat();
      this.context.configure({
        device: this.device,
        format: this.format,
        alphaMode: 'premultiplied',
      });

      this.resize(this.canvas.clientWidth, this.canvas.clientHeight);
      await this.createPipelines();
      this.createBuffers();

      this.startTime = performance.now();
      this.lastTime = this.startTime;
      this.animate();

      return true;
    } catch (e) {
      console.error('WebGPU init failed:', e);
      return false;
    }
  }

  private async createPipelines() {
    if (!this.device) return;

    // Background pipeline
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
      primitive: { topology: 'triangle-list' },
    });

    // Particle pipeline
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
              dstFactor: 'one-minus-src-alpha',
              operation: 'add',
            },
          },
        }],
      },
      primitive: { topology: 'triangle-list' },
    });
  }

  private createBuffers() {
    if (!this.device) return;

    // Uniform buffer (time, resolution, gameState, matchProgress)
    this.uniformBuffer = this.device.createBuffer({
      size: 32,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    // Particle buffer
    this.particleBuffer = this.device.createBuffer({
      size: 600 * 12 * 4,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });

    this.updateBindGroups();
  }

  private updateBindGroups() {
    if (!this.device || !this.uniformBuffer || !this.particleBuffer) return;

    if (this.backgroundPipeline) {
      this.backgroundBindGroup = this.device.createBindGroup({
        layout: this.backgroundPipeline.getBindGroupLayout(0),
        entries: [
          { binding: 0, resource: { buffer: this.uniformBuffer } },
        ],
      });
    }

    if (this.particlePipeline) {
      this.particleBindGroup = this.device.createBindGroup({
        layout: this.particlePipeline.getBindGroupLayout(0),
        entries: [
          { binding: 0, resource: { buffer: this.uniformBuffer } },
          { binding: 1, resource: { buffer: this.particleBuffer } },
        ],
      });
    }
  }

  private animate = () => {
    const currentTime = performance.now();
    const deltaTime = Math.min((currentTime - this.lastTime) / 1000, 0.1);
    this.lastTime = currentTime;

    this.particleSystem.update(deltaTime);
    this.render();

    this.animationId = requestAnimationFrame(this.animate);
  };

  private render() {
    if (!this.device || !this.context || !this.uniformBuffer || !this.particleBuffer) return;

    const time = (performance.now() - this.startTime) / 1000;

    // Update uniforms
    const uniformData = new Float32Array([
      time,
      this.canvas.width,
      this.canvas.height,
      this.gameState,
      this.matchProgress,
      0, 0, 0, // padding
    ]);
    this.device.queue.writeBuffer(this.uniformBuffer, 0, uniformData);

    // Update particles
    const particleData = this.particleSystem.getData();
    if (particleData.length > 0) {
      this.device.queue.writeBuffer(this.particleBuffer, 0, particleData);
    }

    const commandEncoder = this.device.createCommandEncoder();
    const textureView = this.context.getCurrentTexture().createView();

    const renderPass = commandEncoder.beginRenderPass({
      colorAttachments: [{
        view: textureView,
        clearValue: { r: 0.17, g: 0.24, b: 0.31, a: 1 },
        loadOp: 'clear',
        storeOp: 'store',
      }],
    });

    // Draw background
    if (this.backgroundPipeline && this.backgroundBindGroup) {
      renderPass.setPipeline(this.backgroundPipeline);
      renderPass.setBindGroup(0, this.backgroundBindGroup);
      renderPass.draw(6);
    }

    // Draw particles
    const particleCount = this.particleSystem.getCount();
    if (particleCount > 0 && this.particlePipeline && this.particleBindGroup) {
      renderPass.setPipeline(this.particlePipeline);
      renderPass.setBindGroup(0, this.particleBindGroup);
      renderPass.draw(6, particleCount);
    }

    renderPass.end();
    this.device.queue.submit([commandEncoder.finish()]);
  }

  resize(width: number, height: number) {
    const dpr = Math.min(window.devicePixelRatio, 2);
    this.canvas.width = Math.floor(width * dpr);
    this.canvas.height = Math.floor(height * dpr);
  }

  // Game event methods
  emitSignSelect(x: number, y: number, signColor: string) {
    this.particleSystem.emitSignSelect(x, y, signColor);
  }

  emitCorrectMatch(x: number, y: number, signColor: string) {
    this.particleSystem.emitCorrectMatch(x, y, signColor);
  }

  emitWrongMatch(x: number, y: number) {
    this.particleSystem.emitWrongMatch(x, y);
  }

  emitVictory() {
    this.gameState = 1;
    this.particleSystem.emitVictory();
  }

  emitLevelStart() {
    this.gameState = 0;
    this.matchProgress = 0;
    this.particleSystem.clear();
  }

  emitReset() {
    this.gameState = 0;
    this.matchProgress = 0;
    this.particleSystem.emitReset();
  }

  emitAmbient() {
    this.particleSystem.emitAmbient();
  }

  setMatchProgress(progress: number) {
    this.matchProgress = progress;
  }

  destroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    this.particleSystem.clear();
    this.device?.destroy();
  }
}
