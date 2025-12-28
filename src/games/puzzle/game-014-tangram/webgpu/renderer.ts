/**
 * WebGPU Renderer - Tangram
 * Holographic Origami Theme
 * Game #014
 */

import {
  backgroundShader,
  pieceShader,
  particleShader,
  victoryShader,
} from './shaders';
import { ParticleSystem, type Particle } from './particles';
import { hexToRgb } from './math';

export interface PieceData {
  id: number;
  points: { x: number; y: number }[]; // Transformed world points (max 4)
  color: string;
  isDragging: boolean;
  centerX: number;
  centerY: number;
}

export interface TargetData {
  points: { x: number; y: number }[];
}

export class WebGPURenderer {
  private canvas: HTMLCanvasElement;
  private device: GPUDevice | null = null;
  private context: GPUCanvasContext | null = null;
  private format: GPUTextureFormat = 'bgra8unorm';

  // Pipelines
  private backgroundPipeline: GPURenderPipeline | null = null;
  private piecePipeline: GPURenderPipeline | null = null;
  private particlePipeline: GPURenderPipeline | null = null;
  private victoryPipeline: GPURenderPipeline | null = null;

  // Buffers
  private backgroundUniformBuffer: GPUBuffer | null = null;
  private pieceUniformBuffer: GPUBuffer | null = null;
  private pieceStorageBuffer: GPUBuffer | null = null;
  private particleUniformBuffer: GPUBuffer | null = null;
  private particleStorageBuffer: GPUBuffer | null = null;
  private victoryUniformBuffer: GPUBuffer | null = null;

  // Bind Groups
  private backgroundBindGroup: GPUBindGroup | null = null;
  private pieceBindGroup: GPUBindGroup | null = null;
  private particleBindGroup: GPUBindGroup | null = null;
  private victoryBindGroup: GPUBindGroup | null = null;

  // State
  private time = 0;
  private pieces: PieceData[] = [];
  private pieceCount = 0;
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

    // Piece pipeline
    const pieceModule = this.device.createShaderModule({ code: pieceShader });
    this.piecePipeline = this.device.createRenderPipeline({
      layout: 'auto',
      vertex: { module: pieceModule, entryPoint: 'vertexMain' },
      fragment: {
        module: pieceModule,
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

    // Piece uniform buffer
    this.pieceUniformBuffer = this.device.createBuffer({
      size: 16,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    // Piece storage buffer (7 pieces * 16 floats each)
    this.pieceStorageBuffer = this.device.createBuffer({
      size: 7 * 64, // 16 floats * 4 bytes
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });

    // Particle uniform buffer
    this.particleUniformBuffer = this.device.createBuffer({
      size: 16,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    // Particle storage buffer
    this.particleStorageBuffer = this.device.createBuffer({
      size: 1200 * 48, // 12 floats per particle
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

    // Background bind group
    this.backgroundBindGroup = this.device.createBindGroup({
      layout: this.backgroundPipeline!.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: this.backgroundUniformBuffer! } },
      ],
    });

    // Piece bind group
    this.pieceBindGroup = this.device.createBindGroup({
      layout: this.piecePipeline!.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: this.pieceUniformBuffer! } },
        { binding: 1, resource: { buffer: this.pieceStorageBuffer! } },
      ],
    });

    // Particle bind group
    this.particleBindGroup = this.device.createBindGroup({
      layout: this.particlePipeline!.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: this.particleUniformBuffer! } },
        { binding: 1, resource: { buffer: this.particleStorageBuffer! } },
      ],
    });

    // Victory bind group
    this.victoryBindGroup = this.device.createBindGroup({
      layout: this.victoryPipeline!.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: this.victoryUniformBuffer! } },
      ],
    });
  }

  updatePieces(pieces: PieceData[]): void {
    this.pieces = pieces;
    this.pieceCount = pieces.length;

    if (!this.device || !this.pieceStorageBuffer || pieces.length === 0) return;

    // Pack piece data: v0x,v0y, v1x,v1y, v2x,v2y, v3x,v3y, r,g,b, vertCount, isDragging, cx,cy, pad
    const data = new Float32Array(pieces.length * 16);

    pieces.forEach((piece, i) => {
      const offset = i * 16;
      const rgb = hexToRgb(piece.color);

      // Vertices (max 4)
      for (let j = 0; j < 4; j++) {
        if (j < piece.points.length) {
          data[offset + j * 2 + 0] = piece.points[j].x;
          data[offset + j * 2 + 1] = piece.points[j].y;
        } else {
          // Pad with last vertex
          const last = piece.points[piece.points.length - 1];
          data[offset + j * 2 + 0] = last?.x ?? 0;
          data[offset + j * 2 + 1] = last?.y ?? 0;
        }
      }

      // Color
      data[offset + 8] = rgb[0];
      data[offset + 9] = rgb[1];
      data[offset + 10] = rgb[2];

      // Vertex count
      data[offset + 11] = piece.points.length;

      // Is dragging
      data[offset + 12] = piece.isDragging ? 1.0 : 0.0;

      // Center
      data[offset + 13] = piece.centerX;
      data[offset + 14] = piece.centerY;

      // Padding
      data[offset + 15] = 0;
    });

    this.device.queue.writeBuffer(this.pieceStorageBuffer, 0, data);
  }

  // Particle effects
  emitTrail(x: number, y: number, color: string): void {
    const rgb = hexToRgb(color);
    this.particleSystem.emitTrail(x, y, rgb);
  }

  emitRotate(x: number, y: number, color: string): void {
    const rgb = hexToRgb(color);
    this.particleSystem.emitRotate(x, y, rgb);
  }

  emitSnap(x: number, y: number): void {
    this.particleSystem.emitSnap(x, y);
  }

  emitPickUp(x: number, y: number, color: string): void {
    const rgb = hexToRgb(color);
    this.particleSystem.emitPickUp(x, y, rgb);
  }

  emitVictory(centerX: number, centerY: number): void {
    this.particleSystem.emitVictory(centerX, centerY);
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

    // Update particles
    this.particleSystem.update(deltaTime);
    this.particleSystem.emitAmbient();

    // Update buffers
    this.updateBuffers();

    // Render
    const encoder = this.device.createCommandEncoder();
    const textureView = this.context.getCurrentTexture().createView();

    const renderPass = encoder.beginRenderPass({
      colorAttachments: [{
        view: textureView,
        clearValue: { r: 0.02, g: 0.01, b: 0.04, a: 1.0 },
        loadOp: 'clear',
        storeOp: 'store',
      }],
    });

    // 1. Background
    renderPass.setPipeline(this.backgroundPipeline!);
    renderPass.setBindGroup(0, this.backgroundBindGroup!);
    renderPass.draw(6);

    // 2. Pieces
    if (this.pieceCount > 0) {
      renderPass.setPipeline(this.piecePipeline!);
      renderPass.setBindGroup(0, this.pieceBindGroup!);
      renderPass.draw(6, this.pieceCount);
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

    // Background uniforms
    this.device.queue.writeBuffer(
      this.backgroundUniformBuffer!,
      0,
      new Float32Array([this.time, aspectRatio, 0, 0])
    );

    // Piece uniforms
    this.device.queue.writeBuffer(
      this.pieceUniformBuffer!,
      0,
      new Float32Array([this.time, this.pieceCount, w, h])
    );

    // Particle uniforms
    this.device.queue.writeBuffer(
      this.particleUniformBuffer!,
      0,
      new Float32Array([this.time, aspectRatio, 0, 0])
    );

    // Victory uniforms
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
      'trail': 0,
      'rotate': 1,
      'snap': 2,
      'ambient': 3,
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
    this.pieceUniformBuffer?.destroy();
    this.pieceStorageBuffer?.destroy();
    this.particleUniformBuffer?.destroy();
    this.particleStorageBuffer?.destroy();
    this.victoryUniformBuffer?.destroy();
  }
}
