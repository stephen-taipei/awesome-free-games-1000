/**
 * WebGPU Renderer - Maze
 * Neural Circuit Theme
 * Game #020
 */

import {
  backgroundShader,
  wallShader,
  playerShader,
  exitShader,
  particleShader,
  victoryShader,
} from './shaders';
import { ParticleSystem, type Particle } from './particles';

export interface WallSegment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  intensity: number;
}

export interface MazeData {
  cellSize: number;
  cols: number;
  rows: number;
  walls: WallSegment[];
}

export class WebGPURenderer {
  private canvas: HTMLCanvasElement;
  private device: GPUDevice | null = null;
  private context: GPUCanvasContext | null = null;
  private format: GPUTextureFormat = 'bgra8unorm';

  // Pipelines
  private backgroundPipeline: GPURenderPipeline | null = null;
  private wallPipeline: GPURenderPipeline | null = null;
  private playerPipeline: GPURenderPipeline | null = null;
  private exitPipeline: GPURenderPipeline | null = null;
  private particlePipeline: GPURenderPipeline | null = null;
  private victoryPipeline: GPURenderPipeline | null = null;

  // Buffers
  private backgroundUniformBuffer: GPUBuffer | null = null;
  private wallUniformBuffer: GPUBuffer | null = null;
  private wallStorageBuffer: GPUBuffer | null = null;
  private playerUniformBuffer: GPUBuffer | null = null;
  private exitUniformBuffer: GPUBuffer | null = null;
  private particleUniformBuffer: GPUBuffer | null = null;
  private particleStorageBuffer: GPUBuffer | null = null;
  private victoryUniformBuffer: GPUBuffer | null = null;

  // Bind Groups
  private backgroundBindGroup: GPUBindGroup | null = null;
  private wallBindGroup: GPUBindGroup | null = null;
  private playerBindGroup: GPUBindGroup | null = null;
  private exitBindGroup: GPUBindGroup | null = null;
  private particleBindGroup: GPUBindGroup | null = null;
  private victoryBindGroup: GPUBindGroup | null = null;

  // State
  private time = 0;
  private playerX = 0;
  private playerY = 0;
  private playerRadius = 0.02;
  private exitX = 1;
  private exitY = 1;
  private exitRadius = 0.02;
  private walls: WallSegment[] = [];
  private wallCount = 0;
  private particleSystem: ParticleSystem;
  private victoryProgress = 0;

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

    // Wall pipeline
    const wallModule = this.device.createShaderModule({ code: wallShader });
    this.wallPipeline = this.device.createRenderPipeline({
      layout: 'auto',
      vertex: { module: wallModule, entryPoint: 'vertexMain' },
      fragment: {
        module: wallModule,
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

    // Player pipeline
    const playerModule = this.device.createShaderModule({ code: playerShader });
    this.playerPipeline = this.device.createRenderPipeline({
      layout: 'auto',
      vertex: { module: playerModule, entryPoint: 'vertexMain' },
      fragment: {
        module: playerModule,
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

    // Exit pipeline
    const exitModule = this.device.createShaderModule({ code: exitShader });
    this.exitPipeline = this.device.createRenderPipeline({
      layout: 'auto',
      vertex: { module: exitModule, entryPoint: 'vertexMain' },
      fragment: {
        module: exitModule,
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

    // Wall uniform buffer
    this.wallUniformBuffer = this.device.createBuffer({
      size: 16,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    // Wall storage buffer (max 2000 wall segments * 8 floats each)
    this.wallStorageBuffer = this.device.createBuffer({
      size: 2000 * 32,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });

    // Player uniform buffer
    this.playerUniformBuffer = this.device.createBuffer({
      size: 16,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    // Exit uniform buffer
    this.exitUniformBuffer = this.device.createBuffer({
      size: 16,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    // Particle uniform buffer
    this.particleUniformBuffer = this.device.createBuffer({
      size: 16,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    // Particle storage buffer
    this.particleStorageBuffer = this.device.createBuffer({
      size: 300 * 48,
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

    this.wallBindGroup = this.device.createBindGroup({
      layout: this.wallPipeline!.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: this.wallUniformBuffer! } },
        { binding: 1, resource: { buffer: this.wallStorageBuffer! } },
      ],
    });

    this.playerBindGroup = this.device.createBindGroup({
      layout: this.playerPipeline!.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: this.playerUniformBuffer! } },
      ],
    });

    this.exitBindGroup = this.device.createBindGroup({
      layout: this.exitPipeline!.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: this.exitUniformBuffer! } },
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

  updateMaze(data: MazeData): void {
    this.walls = data.walls;
    this.wallCount = data.walls.length;

    if (!this.device || !this.wallStorageBuffer || data.walls.length === 0) return;

    const wallData = new Float32Array(data.walls.length * 8);

    data.walls.forEach((wall, i) => {
      const offset = i * 8;
      wallData[offset + 0] = wall.x1;
      wallData[offset + 1] = wall.y1;
      wallData[offset + 2] = wall.x2;
      wallData[offset + 3] = wall.y2;
      wallData[offset + 4] = wall.intensity;
      wallData[offset + 5] = 0; // padding
      wallData[offset + 6] = 0; // padding
      wallData[offset + 7] = 0; // padding
    });

    this.device.queue.writeBuffer(this.wallStorageBuffer, 0, wallData);
  }

  setPlayer(x: number, y: number, radius: number): void {
    this.playerX = x;
    this.playerY = y;
    this.playerRadius = radius;
  }

  setExit(x: number, y: number, radius: number): void {
    this.exitX = x;
    this.exitY = y;
    this.exitRadius = radius;
  }

  setVictory(progress: number): void {
    this.victoryProgress = progress;
  }

  // Particle effects
  emitTrail(x: number, y: number, direction: string): void {
    this.particleSystem.emitTrail(x, y, direction);
  }

  emitBump(x: number, y: number, direction: string): void {
    this.particleSystem.emitBump(x, y, direction);
  }

  emitComplete(x: number, y: number): void {
    this.particleSystem.emitComplete(x, y);
  }

  emitSignal(fromX: number, fromY: number, toX: number, toY: number): void {
    this.particleSystem.emitSignal(fromX, fromY, toX, toY);
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
        clearValue: { r: 0.02, g: 0.03, b: 0.06, a: 1.0 },
        loadOp: 'clear',
        storeOp: 'store',
      }],
    });

    // 1. Background
    renderPass.setPipeline(this.backgroundPipeline!);
    renderPass.setBindGroup(0, this.backgroundBindGroup!);
    renderPass.draw(6);

    // 2. Walls
    if (this.wallCount > 0) {
      renderPass.setPipeline(this.wallPipeline!);
      renderPass.setBindGroup(0, this.wallBindGroup!);
      renderPass.draw(6, this.wallCount);
    }

    // 3. Exit
    renderPass.setPipeline(this.exitPipeline!);
    renderPass.setBindGroup(0, this.exitBindGroup!);
    renderPass.draw(6);

    // 4. Player
    renderPass.setPipeline(this.playerPipeline!);
    renderPass.setBindGroup(0, this.playerBindGroup!);
    renderPass.draw(6);

    // 5. Particles
    const particles = this.particleSystem.getParticles();
    if (particles.length > 0) {
      this.updateParticleBuffer(particles);
      renderPass.setPipeline(this.particlePipeline!);
      renderPass.setBindGroup(0, this.particleBindGroup!);
      renderPass.draw(6, particles.length);
    }

    // 6. Victory effect
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
      new Float32Array([this.time, aspectRatio, this.playerX, this.playerY])
    );

    this.device.queue.writeBuffer(
      this.wallUniformBuffer!,
      0,
      new Float32Array([this.time, 0.02, 0, 0])
    );

    this.device.queue.writeBuffer(
      this.playerUniformBuffer!,
      0,
      new Float32Array([this.time, this.playerX, this.playerY, this.playerRadius])
    );

    this.device.queue.writeBuffer(
      this.exitUniformBuffer!,
      0,
      new Float32Array([this.time, this.exitX, this.exitY, this.exitRadius])
    );

    this.device.queue.writeBuffer(
      this.particleUniformBuffer!,
      0,
      new Float32Array([this.time, aspectRatio, 0, 0])
    );

    this.device.queue.writeBuffer(
      this.victoryUniformBuffer!,
      0,
      new Float32Array([this.time, this.victoryProgress, this.exitX, this.exitY])
    );
  }

  private updateParticleBuffer(particles: Particle[]): void {
    if (!this.device || !this.particleStorageBuffer) return;

    const data = new Float32Array(particles.length * 12);
    const typeMap: Record<string, number> = {
      'trail': 0,
      'bump': 1,
      'complete': 2,
      'signal': 3,
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
    this.wallUniformBuffer?.destroy();
    this.wallStorageBuffer?.destroy();
    this.playerUniformBuffer?.destroy();
    this.exitUniformBuffer?.destroy();
    this.particleUniformBuffer?.destroy();
    this.particleStorageBuffer?.destroy();
    this.victoryUniformBuffer?.destroy();
  }
}
