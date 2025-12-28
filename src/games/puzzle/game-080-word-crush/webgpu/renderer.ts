/**
 * WebGPU Renderer - Word Crush
 * Literary / Typography Theme
 * Game #080
 */

import { ParticleSystem, Particle, ParticleType } from './particles';
import { BACKGROUND_SHADER, PARTICLE_SHADER } from './shaders';

export class WebGPURenderer {
  private canvas: HTMLCanvasElement;
  private device!: GPUDevice;
  private context!: GPUCanvasContext;
  private format!: GPUTextureFormat;

  private backgroundPipeline!: GPURenderPipeline;
  private particlePipeline!: GPURenderPipeline;
  private uniformBuffer!: GPUBuffer;
  private uniformBindGroup!: GPUBindGroup;

  private particleSystem: ParticleSystem;
  private particleBuffer!: GPUBuffer;
  private maxParticles = 400;

  private startTime: number = performance.now();
  private animationId: number = 0;
  private selectionActive: number = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.particleSystem = new ParticleSystem();
  }

  async init(): Promise<boolean> {
    if (!navigator.gpu) {
      console.warn('WebGPU not supported');
      return false;
    }

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
    this.startRenderLoop();

    return true;
  }

  private createBuffers(): void {
    this.uniformBuffer = this.device.createBuffer({
      size: 16,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    this.particleBuffer = this.device.createBuffer({
      size: this.maxParticles * 32,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });
  }

  private createPipelines(): void {
    const uniformBindGroupLayout = this.device.createBindGroupLayout({
      entries: [{
        binding: 0,
        visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
        buffer: { type: 'uniform' },
      }],
    });

    this.uniformBindGroup = this.device.createBindGroup({
      layout: uniformBindGroupLayout,
      entries: [{
        binding: 0,
        resource: { buffer: this.uniformBuffer },
      }],
    });

    const pipelineLayout = this.device.createPipelineLayout({
      bindGroupLayouts: [uniformBindGroupLayout],
    });

    // Background pipeline
    this.backgroundPipeline = this.device.createRenderPipeline({
      layout: pipelineLayout,
      vertex: {
        module: this.device.createShaderModule({ code: BACKGROUND_SHADER }),
        entryPoint: 'vertexMain',
      },
      fragment: {
        module: this.device.createShaderModule({ code: BACKGROUND_SHADER }),
        entryPoint: 'fragmentMain',
        targets: [{ format: this.format }],
      },
      primitive: { topology: 'triangle-strip' },
    });

    // Particle pipeline with storage buffer
    const particleBindGroupLayout = this.device.createBindGroupLayout({
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
          buffer: { type: 'uniform' },
        },
      ],
    });

    this.particlePipeline = this.device.createRenderPipeline({
      layout: this.device.createPipelineLayout({
        bindGroupLayouts: [particleBindGroupLayout],
      }),
      vertex: {
        module: this.device.createShaderModule({ code: PARTICLE_SHADER }),
        entryPoint: 'vertexMain',
        buffers: [{
          arrayStride: 32,
          stepMode: 'instance',
          attributes: [
            { shaderLocation: 0, offset: 0, format: 'float32x2' },
            { shaderLocation: 1, offset: 8, format: 'float32' },
            { shaderLocation: 2, offset: 12, format: 'float32x4' },
            { shaderLocation: 3, offset: 28, format: 'float32' },
            { shaderLocation: 4, offset: 28, format: 'float32' },
            { shaderLocation: 5, offset: 28, format: 'float32' },
          ],
        }],
      },
      fragment: {
        module: this.device.createShaderModule({ code: PARTICLE_SHADER }),
        entryPoint: 'fragmentMain',
        targets: [{
          format: this.format,
          blend: {
            color: { srcFactor: 'src-alpha', dstFactor: 'one-minus-src-alpha', operation: 'add' },
            alpha: { srcFactor: 'one', dstFactor: 'one', operation: 'add' },
          },
        }],
      },
      primitive: { topology: 'triangle-strip' },
    });
  }

  private startRenderLoop(): void {
    const render = () => {
      this.renderFrame();
      this.animationId = requestAnimationFrame(render);
    };
    render();
  }

  private renderFrame(): void {
    const time = (performance.now() - this.startTime) / 1000;
    const width = this.canvas.width;
    const height = this.canvas.height;

    // Update uniforms
    const uniformData = new Float32Array([time, width, height, this.selectionActive]);
    this.device.queue.writeBuffer(this.uniformBuffer, 0, uniformData);

    // Update particles
    this.particleSystem.update(1 / 60);

    // Write particle data
    const particles = this.particleSystem.getParticles();
    const particleData = new Float32Array(this.maxParticles * 8);

    particles.forEach((p, i) => {
      if (i >= this.maxParticles) return;
      const offset = i * 8;
      particleData[offset] = (p.x / width) * 2 - 1;
      particleData[offset + 1] = 1 - (p.y / height) * 2;
      particleData[offset + 2] = p.size;
      particleData[offset + 3] = p.color.r;
      particleData[offset + 4] = p.color.g;
      particleData[offset + 5] = p.color.b;
      particleData[offset + 6] = p.alpha;
      particleData[offset + 7] = this.getParticleTypeIndex(p.type) + p.rotation / 100 + p.life / 1000;
    });

    this.device.queue.writeBuffer(this.particleBuffer, 0, particleData);

    // Render
    const commandEncoder = this.device.createCommandEncoder();
    const textureView = this.context.getCurrentTexture().createView();

    const renderPass = commandEncoder.beginRenderPass({
      colorAttachments: [{
        view: textureView,
        clearValue: { r: 0.98, g: 0.95, b: 0.88, a: 1 },
        loadOp: 'clear',
        storeOp: 'store',
      }],
    });

    // Draw background
    renderPass.setPipeline(this.backgroundPipeline);
    renderPass.setBindGroup(0, this.uniformBindGroup);
    renderPass.draw(4);

    // Draw particles
    if (particles.length > 0) {
      renderPass.setPipeline(this.particlePipeline);
      renderPass.setBindGroup(0, this.uniformBindGroup);
      renderPass.setVertexBuffer(0, this.particleBuffer);
      renderPass.draw(4, particles.length);
    }

    renderPass.end();
    this.device.queue.submit([commandEncoder.finish()]);
  }

  private getParticleTypeIndex(type: ParticleType): number {
    const types: ParticleType[] = ['letter', 'ink', 'spark', 'trail', 'glow', 'burst'];
    return types.indexOf(type);
  }

  // Effect methods for game events
  emitSelect(x: number, y: number): void {
    this.selectionActive = 1;
    this.particleSystem.emit(x, y, 'trail', 2);
    this.particleSystem.emit(x, y, 'glow', 1, 1);
  }

  emitContinue(x: number, y: number): void {
    this.particleSystem.emit(x, y, 'trail', 1);
  }

  emitValidWord(x: number, y: number, wordLength: number): void {
    // Burst of particles based on word length
    const burstCount = Math.min(wordLength * 3, 15);
    for (let i = 0; i < burstCount; i++) {
      const angle = (i / burstCount) * Math.PI * 2;
      const px = x + Math.cos(angle) * 30;
      const py = y + Math.sin(angle) * 30;
      this.particleSystem.emit(px, py, 'spark', 2, i % 5);
      this.particleSystem.emit(px, py, 'burst', 1, i % 5);
    }
    this.particleSystem.emit(x, y, 'glow', 5, 2);
  }

  emitInvalidWord(x: number, y: number): void {
    this.particleSystem.emit(x, y, 'ink', 3);
  }

  emitLetterRemove(x: number, y: number): void {
    this.particleSystem.emit(x, y, 'letter', 2);
    this.particleSystem.emit(x, y, 'spark', 1, 3);
  }

  emitNewLetter(x: number, y: number): void {
    this.particleSystem.emit(x, y, 'glow', 2, 0);
  }

  emitSelectionEnd(): void {
    this.selectionActive = 0;
  }

  emitVictory(x: number, y: number): void {
    for (let wave = 0; wave < 3; wave++) {
      setTimeout(() => {
        for (let i = 0; i < 16; i++) {
          const angle = (i / 16) * Math.PI * 2;
          const radius = 50 + wave * 40;
          const px = x + Math.cos(angle) * radius;
          const py = y + Math.sin(angle) * radius;
          this.particleSystem.emit(px, py, 'burst', 2, i % 5);
          this.particleSystem.emit(px, py, 'spark', 2, i % 5);
        }
        this.particleSystem.emit(x, y, 'glow', 8, wave);
      }, wave * 200);
    }
  }

  emitGameStart(x: number, y: number): void {
    this.particleSystem.clear();
    for (let i = 0; i < 20; i++) {
      const px = Math.random() * this.canvas.width;
      const py = Math.random() * this.canvas.height;
      this.particleSystem.emit(px, py, 'letter', 1);
    }
    this.particleSystem.emit(x, y, 'glow', 5, 0);
  }

  emitReset(): void {
    const cx = this.canvas.width / 2;
    const cy = this.canvas.height / 2;
    this.particleSystem.clear();
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      const px = cx + Math.cos(angle) * 60;
      const py = cy + Math.sin(angle) * 60;
      this.particleSystem.emit(px, py, 'letter', 2);
    }
    this.selectionActive = 0;
  }

  setSelectionActive(active: boolean): void {
    this.selectionActive = active ? 1 : 0;
  }

  resize(width: number, height: number): void {
    this.canvas.width = width;
    this.canvas.height = height;
  }

  destroy(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    this.particleSystem.clear();
  }
}
