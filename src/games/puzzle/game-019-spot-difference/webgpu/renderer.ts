/**
 * WebGPU Renderer - Spot Difference
 * Quantum Scanner Theme
 * Game #019
 */

import {
  backgroundShader,
  markerShader,
  particleShader,
  victoryShader,
} from './shaders';
import { ParticleSystem, type Particle } from './particles';

export interface MarkerData {
  x: number;
  y: number;
  radius: number;
  state: number;      // 0=hidden, 1=found, 2=hint
  pulsePhase: number;
  foundTime: number;
}

export class WebGPURenderer {
  private canvas: HTMLCanvasElement;
  private device: GPUDevice | null = null;
  private context: GPUCanvasContext | null = null;
  private format: GPUTextureFormat = 'bgra8unorm';

  // Pipelines
  private backgroundPipeline: GPURenderPipeline | null = null;
  private markerPipeline: GPURenderPipeline | null = null;
  private particlePipeline: GPURenderPipeline | null = null;
  private victoryPipeline: GPURenderPipeline | null = null;

  // Buffers
  private backgroundUniformBuffer: GPUBuffer | null = null;
  private markerUniformBuffer: GPUBuffer | null = null;
  private markerStorageBuffer: GPUBuffer | null = null;
  private particleUniformBuffer: GPUBuffer | null = null;
  private particleStorageBuffer: GPUBuffer | null = null;
  private victoryUniformBuffer: GPUBuffer | null = null;

  // Bind Groups
  private backgroundBindGroup: GPUBindGroup | null = null;
  private markerBindGroup: GPUBindGroup | null = null;
  private particleBindGroup: GPUBindGroup | null = null;
  private victoryBindGroup: GPUBindGroup | null = null;

  // State
  private time = 0;
  private markers: MarkerData[] = [];
  private markerCount = 0;
  private scanProgress = 1;
  private alertLevel = 0;
  private particleSystem: ParticleSystem;
  private victoryProgress = 0;
  private victoryCenterX = 0.5;
  private victoryCenterY = 0.5;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.particleSystem = new ParticleSystem();
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
      this.context = this.canvas.getContext('webgpu');

      if (!this.context) {
        console.warn('Failed to get WebGPU context');
        return false;
      }

      this.format = navigator.gpu.getPreferredCanvasFormat();
      this.context.configure({
        device: this.device,
        format: this.format,
        alphaMode: 'premultiplied',
      });

      this.createPipelines();
      this.createBuffers();

      return true;
    } catch (e) {
      console.warn('WebGPU init failed:', e);
      return false;
    }
  }

  private createPipelines(): void {
    if (!this.device) return;

    // Background pipeline
    const bgModule = this.device.createShaderModule({ code: backgroundShader });
    this.backgroundPipeline = this.device.createRenderPipeline({
      layout: 'auto',
      vertex: { module: bgModule, entryPoint: 'vertexMain' },
      fragment: {
        module: bgModule,
        entryPoint: 'fragmentMain',
        targets: [{ format: this.format }],
      },
      primitive: { topology: 'triangle-list' },
    });

    // Marker pipeline
    const markerModule = this.device.createShaderModule({ code: markerShader });
    this.markerPipeline = this.device.createRenderPipeline({
      layout: 'auto',
      vertex: { module: markerModule, entryPoint: 'vertexMain' },
      fragment: {
        module: markerModule,
        entryPoint: 'fragmentMain',
        targets: [{
          format: this.format,
          blend: {
            color: { srcFactor: 'src-alpha', dstFactor: 'one', operation: 'add' },
            alpha: { srcFactor: 'one', dstFactor: 'one', operation: 'add' },
          },
        }],
      },
      primitive: { topology: 'triangle-list' },
    });

    // Particle pipeline
    const particleModule = this.device.createShaderModule({ code: particleShader });
    this.particlePipeline = this.device.createRenderPipeline({
      layout: 'auto',
      vertex: { module: particleModule, entryPoint: 'vertexMain' },
      fragment: {
        module: particleModule,
        entryPoint: 'fragmentMain',
        targets: [{
          format: this.format,
          blend: {
            color: { srcFactor: 'src-alpha', dstFactor: 'one', operation: 'add' },
            alpha: { srcFactor: 'one', dstFactor: 'one', operation: 'add' },
          },
        }],
      },
      primitive: { topology: 'triangle-list' },
    });

    // Victory pipeline
    const victoryModule = this.device.createShaderModule({ code: victoryShader });
    this.victoryPipeline = this.device.createRenderPipeline({
      layout: 'auto',
      vertex: { module: victoryModule, entryPoint: 'vertexMain' },
      fragment: {
        module: victoryModule,
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
  }

  private createBuffers(): void {
    if (!this.device) return;

    // Background uniform buffer
    this.backgroundUniformBuffer = this.device.createBuffer({
      size: 16,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    // Marker uniform buffer
    this.markerUniformBuffer = this.device.createBuffer({
      size: 16,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    // Marker storage buffer (max 10 markers * 8 floats each)
    this.markerStorageBuffer = this.device.createBuffer({
      size: 10 * 32,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });

    // Particle uniform buffer
    this.particleUniformBuffer = this.device.createBuffer({
      size: 16,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    // Particle storage buffer
    this.particleStorageBuffer = this.device.createBuffer({
      size: 400 * 48,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });

    // Victory uniform buffer
    this.victoryUniformBuffer = this.device.createBuffer({
      size: 16,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    this.createBindGroups();
  }

  private createBindGroups(): void {
    if (!this.device) return;

    this.backgroundBindGroup = this.device.createBindGroup({
      layout: this.backgroundPipeline!.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: this.backgroundUniformBuffer! } },
      ],
    });

    this.markerBindGroup = this.device.createBindGroup({
      layout: this.markerPipeline!.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: this.markerUniformBuffer! } },
        { binding: 1, resource: { buffer: this.markerStorageBuffer! } },
      ],
    });

    this.particleBindGroup = this.device.createBindGroup({
      layout: this.particlePipeline!.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: this.particleUniformBuffer! } },
        { binding: 1, resource: { buffer: this.particleStorageBuffer! } },
      ],
    });

    this.victoryBindGroup = this.device.createBindGroup({
      layout: this.victoryPipeline!.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: this.victoryUniformBuffer! } },
      ],
    });
  }

  updateMarkers(markers: MarkerData[]): void {
    this.markers = markers;
    this.markerCount = markers.length;

    if (!this.device || !this.markerStorageBuffer || markers.length === 0) return;

    const data = new Float32Array(markers.length * 8);

    markers.forEach((marker, i) => {
      const offset = i * 8;
      data[offset + 0] = marker.x;
      data[offset + 1] = marker.y;
      data[offset + 2] = marker.radius;
      data[offset + 3] = marker.state;
      data[offset + 4] = marker.pulsePhase;
      data[offset + 5] = marker.foundTime;
      data[offset + 6] = 0; // padding
      data[offset + 7] = 0; // padding
    });

    this.device.queue.writeBuffer(this.markerStorageBuffer, 0, data);
  }

  setScanProgress(progress: number): void {
    this.scanProgress = progress;
  }

  setAlertLevel(level: number): void {
    this.alertLevel = level;
  }

  // Particle effects
  emitClick(x: number, y: number): void {
    this.particleSystem.emitClick(x, y);
  }

  emitFound(x: number, y: number): void {
    this.particleSystem.emitFound(x, y);
  }

  emitMiss(x: number, y: number): void {
    this.particleSystem.emitMiss(x, y);
  }

  emitComplete(): void {
    this.particleSystem.emitComplete(0.5, 0.5);
  }

  setVictory(progress: number, centerX: number, centerY: number): void {
    this.victoryProgress = progress;
    this.victoryCenterX = centerX;
    this.victoryCenterY = centerY;
  }

  clearParticles(): void {
    this.particleSystem.clear();
  }

  render(deltaTime: number): void {
    if (!this.device || !this.context) return;

    this.time += deltaTime * 0.001;

    this.particleSystem.update(deltaTime);
    this.particleSystem.emitAmbient();

    this.updateBuffers();

    const encoder = this.device.createCommandEncoder();
    const textureView = this.context.getCurrentTexture().createView();

    const renderPass = encoder.beginRenderPass({
      colorAttachments: [{
        view: textureView,
        clearValue: { r: 0.01, g: 0.02, b: 0.04, a: 1.0 },
        loadOp: 'clear',
        storeOp: 'store',
      }],
    });

    // 1. Background
    renderPass.setPipeline(this.backgroundPipeline!);
    renderPass.setBindGroup(0, this.backgroundBindGroup!);
    renderPass.draw(6);

    // 2. Markers
    if (this.markerCount > 0) {
      renderPass.setPipeline(this.markerPipeline!);
      renderPass.setBindGroup(0, this.markerBindGroup!);
      renderPass.draw(6, this.markerCount);
    }

    // 3. Particles
    const particles = this.particleSystem.getParticles();
    if (particles.length > 0) {
      this.updateParticleBuffer(particles);
      renderPass.setPipeline(this.particlePipeline!);
      renderPass.setBindGroup(0, this.particleBindGroup!);
      renderPass.draw(6, particles.length);
    }

    // 4. Victory effect
    if (this.victoryProgress > 0) {
      renderPass.setPipeline(this.victoryPipeline!);
      renderPass.setBindGroup(0, this.victoryBindGroup!);
      renderPass.draw(6);
    }

    renderPass.end();
    this.device.queue.submit([encoder.finish()]);
  }

  private updateBuffers(): void {
    if (!this.device) return;

    const w = this.canvas.width;
    const h = this.canvas.height;
    const aspectRatio = w / h;

    this.device.queue.writeBuffer(
      this.backgroundUniformBuffer!,
      0,
      new Float32Array([this.time, aspectRatio, this.scanProgress, this.alertLevel])
    );

    this.device.queue.writeBuffer(
      this.markerUniformBuffer!,
      0,
      new Float32Array([this.time, this.markerCount, w, h])
    );

    this.device.queue.writeBuffer(
      this.particleUniformBuffer!,
      0,
      new Float32Array([this.time, aspectRatio, 0, 0])
    );

    this.device.queue.writeBuffer(
      this.victoryUniformBuffer!,
      0,
      new Float32Array([this.time, this.victoryProgress, this.victoryCenterX, this.victoryCenterY])
    );
  }

  private updateParticleBuffer(particles: Particle[]): void {
    if (!this.device || !this.particleStorageBuffer) return;

    const data = new Float32Array(particles.length * 12);
    const typeMap: Record<string, number> = {
      'click': 0,
      'found': 1,
      'miss': 2,
      'complete': 3,
      'ambient': 4,
    };

    particles.forEach((p, i) => {
      data[i * 12 + 0] = p.x;
      data[i * 12 + 1] = p.y;
      data[i * 12 + 2] = p.vx;
      data[i * 12 + 3] = p.vy;
      data[i * 12 + 4] = p.life;
      data[i * 12 + 5] = p.maxLife;
      data[i * 12 + 6] = p.size;
      data[i * 12 + 7] = typeMap[p.type] ?? 0;
      data[i * 12 + 8] = p.color[0];
      data[i * 12 + 9] = p.color[1];
      data[i * 12 + 10] = p.color[2];
      data[i * 12 + 11] = p.color[3];
    });

    this.device.queue.writeBuffer(this.particleStorageBuffer, 0, data);
  }

  destroy(): void {
    this.backgroundUniformBuffer?.destroy();
    this.markerUniformBuffer?.destroy();
    this.markerStorageBuffer?.destroy();
    this.particleUniformBuffer?.destroy();
    this.particleStorageBuffer?.destroy();
    this.victoryUniformBuffer?.destroy();
  }
}
