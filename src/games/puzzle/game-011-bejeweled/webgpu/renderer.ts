/**
 * WebGPU Renderer - Bejeweled
 * Game #011
 */

import { mat4 } from './math';
import { ParticleSystem, type Particle, type ScorePop } from './particles';
import {
  backgroundShader,
  gemShader,
  gridShader,
  particleShader,
  progressShader,
  scorePopShader,
  comboShader,
} from './shaders';

export interface GemData {
  x: number;
  y: number;
  colorIndex: number;
  scale: number;
  rotation: number;
  selected: boolean;
  matched: boolean;
  shapeType: number;
}

export class WebGPURenderer {
  private canvas: HTMLCanvasElement;
  private device!: GPUDevice;
  private context!: GPUCanvasContext;
  private format!: GPUTextureFormat;

  // Pipelines
  private backgroundPipeline!: GPURenderPipeline;
  private gemPipeline!: GPURenderPipeline;
  private gridPipeline!: GPURenderPipeline;
  private particlePipeline!: GPURenderPipeline;
  private progressPipeline!: GPURenderPipeline;
  private scorePopPipeline!: GPURenderPipeline;
  private comboPipeline!: GPURenderPipeline;

  // Buffers
  private backgroundUniformBuffer!: GPUBuffer;
  private gemUniformBuffer!: GPUBuffer;
  private gemInstanceBuffer!: GPUBuffer;
  private gridUniformBuffer!: GPUBuffer;
  private particleUniformBuffer!: GPUBuffer;
  private particleInstanceBuffer!: GPUBuffer;
  private progressUniformBuffer!: GPUBuffer;
  private scorePopUniformBuffer!: GPUBuffer;
  private scorePopInstanceBuffer!: GPUBuffer;
  private comboUniformBuffer!: GPUBuffer;

  // Bind Groups
  private backgroundBindGroup!: GPUBindGroup;
  private gemBindGroup!: GPUBindGroup;
  private gridBindGroup!: GPUBindGroup;
  private particleBindGroup!: GPUBindGroup;
  private progressBindGroup!: GPUBindGroup;
  private scorePopBindGroup!: GPUBindGroup;
  private comboBindGroup!: GPUBindGroup;

  // State
  private time = 0;
  private gemCount = 0;
  private particleCount = 0;
  private scorePopCount = 0;
  private gridRows = 8;
  private gridCols = 8;
  private gemSize = 1.0;
  private progress = 0;
  private comboCount = 0;

  // Particle system
  private particleSystem: ParticleSystem;

  // Matrices
  private projectionMatrix = mat4.create();
  private viewMatrix = mat4.create();
  private viewProjectionMatrix = mat4.create();

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
      this.context = this.canvas.getContext('webgpu') as GPUCanvasContext;
      this.format = navigator.gpu.getPreferredCanvasFormat();

      this.context.configure({
        device: this.device,
        format: this.format,
        alphaMode: 'premultiplied',
      });

      this.createBuffers();
      this.createPipelines();
      this.createBindGroups();

      return true;
    } catch (e) {
      console.error('WebGPU init failed:', e);
      return false;
    }
  }

  private createBuffers(): void {
    // Background uniforms
    this.backgroundUniformBuffer = this.device.createBuffer({
      size: 16,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    // Gem uniforms (mat4 + vec4)
    this.gemUniformBuffer = this.device.createBuffer({
      size: 80,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    // Gem instances (max 64 gems)
    this.gemInstanceBuffer = this.device.createBuffer({
      size: 64 * 32,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });

    // Grid uniforms
    this.gridUniformBuffer = this.device.createBuffer({
      size: 80,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    // Particle uniforms
    this.particleUniformBuffer = this.device.createBuffer({
      size: 80,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    // Particle instances (max 3000)
    this.particleInstanceBuffer = this.device.createBuffer({
      size: 3000 * 64,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });

    // Progress uniforms
    this.progressUniformBuffer = this.device.createBuffer({
      size: 80,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    // Score pop uniforms
    this.scorePopUniformBuffer = this.device.createBuffer({
      size: 80,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    // Score pop instances (max 20)
    this.scorePopInstanceBuffer = this.device.createBuffer({
      size: 20 * 32,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });

    // Combo uniforms
    this.comboUniformBuffer = this.device.createBuffer({
      size: 80,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
  }

  private createPipelines(): void {
    // Background pipeline
    this.backgroundPipeline = this.device.createRenderPipeline({
      layout: 'auto',
      vertex: {
        module: this.device.createShaderModule({ code: backgroundShader }),
        entryPoint: 'vertexMain',
      },
      fragment: {
        module: this.device.createShaderModule({ code: backgroundShader }),
        entryPoint: 'fragmentMain',
        targets: [{ format: this.format }],
      },
      primitive: { topology: 'triangle-strip' },
    });

    // Gem pipeline
    this.gemPipeline = this.device.createRenderPipeline({
      layout: 'auto',
      vertex: {
        module: this.device.createShaderModule({ code: gemShader }),
        entryPoint: 'vertexMain',
      },
      fragment: {
        module: this.device.createShaderModule({ code: gemShader }),
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

    // Grid pipeline
    this.gridPipeline = this.device.createRenderPipeline({
      layout: 'auto',
      vertex: {
        module: this.device.createShaderModule({ code: gridShader }),
        entryPoint: 'vertexMain',
      },
      fragment: {
        module: this.device.createShaderModule({ code: gridShader }),
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
    this.particlePipeline = this.device.createRenderPipeline({
      layout: 'auto',
      vertex: {
        module: this.device.createShaderModule({ code: particleShader }),
        entryPoint: 'vertexMain',
      },
      fragment: {
        module: this.device.createShaderModule({ code: particleShader }),
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

    // Progress pipeline
    this.progressPipeline = this.device.createRenderPipeline({
      layout: 'auto',
      vertex: {
        module: this.device.createShaderModule({ code: progressShader }),
        entryPoint: 'vertexMain',
      },
      fragment: {
        module: this.device.createShaderModule({ code: progressShader }),
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

    // Score pop pipeline
    this.scorePopPipeline = this.device.createRenderPipeline({
      layout: 'auto',
      vertex: {
        module: this.device.createShaderModule({ code: scorePopShader }),
        entryPoint: 'vertexMain',
      },
      fragment: {
        module: this.device.createShaderModule({ code: scorePopShader }),
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

    // Combo pipeline
    this.comboPipeline = this.device.createRenderPipeline({
      layout: 'auto',
      vertex: {
        module: this.device.createShaderModule({ code: comboShader }),
        entryPoint: 'vertexMain',
      },
      fragment: {
        module: this.device.createShaderModule({ code: comboShader }),
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
  }

  private createBindGroups(): void {
    this.backgroundBindGroup = this.device.createBindGroup({
      layout: this.backgroundPipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: this.backgroundUniformBuffer } },
      ],
    });

    this.gemBindGroup = this.device.createBindGroup({
      layout: this.gemPipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: this.gemUniformBuffer } },
        { binding: 1, resource: { buffer: this.gemInstanceBuffer } },
      ],
    });

    this.gridBindGroup = this.device.createBindGroup({
      layout: this.gridPipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: this.gridUniformBuffer } },
      ],
    });

    this.particleBindGroup = this.device.createBindGroup({
      layout: this.particlePipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: this.particleUniformBuffer } },
        { binding: 1, resource: { buffer: this.particleInstanceBuffer } },
      ],
    });

    this.progressBindGroup = this.device.createBindGroup({
      layout: this.progressPipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: this.progressUniformBuffer } },
      ],
    });

    this.scorePopBindGroup = this.device.createBindGroup({
      layout: this.scorePopPipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: this.scorePopUniformBuffer } },
        { binding: 1, resource: { buffer: this.scorePopInstanceBuffer } },
      ],
    });

    this.comboBindGroup = this.device.createBindGroup({
      layout: this.comboPipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: this.comboUniformBuffer } },
      ],
    });
  }

  setGameSize(rows: number, cols: number, gemSize: number): void {
    this.gridRows = rows;
    this.gridCols = cols;
    this.gemSize = gemSize;
  }

  setProgress(progress: number): void {
    this.progress = progress / 100;
  }

  setCombo(combo: number): void {
    this.comboCount = combo;
  }

  updateGems(gems: GemData[]): void {
    this.gemCount = gems.length;

    const data = new Float32Array(gems.length * 8);
    gems.forEach((gem, i) => {
      const offset = i * 8;
      data[offset] = gem.x;
      data[offset + 1] = gem.y;
      data[offset + 2] = gem.colorIndex;
      data[offset + 3] = gem.scale;
      data[offset + 4] = gem.rotation;
      data[offset + 5] = gem.selected ? 1 : 0;
      data[offset + 6] = gem.matched ? 1 : 0;
      data[offset + 7] = gem.shapeType;
    });

    this.device.queue.writeBuffer(this.gemInstanceBuffer, 0, data);
  }

  // Particle effects
  emitMatch(x: number, y: number, colorIndex: number): void {
    this.particleSystem.emitMatch(x, y, colorIndex);
  }

  emitChainMatch(gems: Array<{x: number, y: number, colorIndex: number}>): void {
    this.particleSystem.emitChainMatch(gems);
  }

  emitSwap(x1: number, y1: number, x2: number, y2: number): void {
    this.particleSystem.emitSwap(x1, y1, x2, y2);
  }

  emitFall(x: number, y: number, colorIndex: number): void {
    this.particleSystem.emitFall(x, y, colorIndex);
  }

  emitSelect(x: number, y: number): void {
    this.particleSystem.emitSelect(x, y);
  }

  emitLevelUp(): void {
    const centerX = (this.gridCols * this.gemSize) / 2;
    const centerY = (this.gridRows * this.gemSize) / 2;
    this.particleSystem.emitLevelUp(centerX, centerY);
  }

  emitGameOver(): void {
    const centerX = (this.gridCols * this.gemSize) / 2;
    const centerY = (this.gridRows * this.gemSize) / 2;
    this.particleSystem.emitGameOver(centerX, centerY);
  }

  addScorePop(x: number, y: number, value: number): void {
    this.particleSystem.addScorePop(x, y, value);
  }

  clearParticles(): void {
    this.particleSystem.clear();
  }

  render(deltaTime: number): void {
    this.time += deltaTime * 0.001;

    // Update particle system
    this.particleSystem.update(deltaTime);
    this.particleSystem.emitAmbient(this.gridCols * this.gemSize, this.gridRows * this.gemSize);

    // Update matrices
    const width = this.gridCols * this.gemSize;
    const height = this.gridRows * this.gemSize;
    const padding = 1.0;

    mat4.ortho(
      this.projectionMatrix,
      -padding,
      width + padding,
      -padding,
      height + padding,
      -10,
      10
    );
    mat4.identity(this.viewMatrix);
    mat4.multiply(this.viewProjectionMatrix, this.projectionMatrix, this.viewMatrix);

    // Update uniforms
    this.updateUniforms();

    // Render
    const commandEncoder = this.device.createCommandEncoder();
    const textureView = this.context.getCurrentTexture().createView();

    const renderPass = commandEncoder.beginRenderPass({
      colorAttachments: [{
        view: textureView,
        clearValue: { r: 0.05, g: 0.02, b: 0.1, a: 1 },
        loadOp: 'clear',
        storeOp: 'store',
      }],
    });

    // Background
    renderPass.setPipeline(this.backgroundPipeline);
    renderPass.setBindGroup(0, this.backgroundBindGroup);
    renderPass.draw(4);

    // Grid
    renderPass.setPipeline(this.gridPipeline);
    renderPass.setBindGroup(0, this.gridBindGroup);
    renderPass.draw(6);

    // Gems
    if (this.gemCount > 0) {
      renderPass.setPipeline(this.gemPipeline);
      renderPass.setBindGroup(0, this.gemBindGroup);
      renderPass.draw(6, this.gemCount);
    }

    // Particles
    this.updateParticles();
    if (this.particleCount > 0) {
      renderPass.setPipeline(this.particlePipeline);
      renderPass.setBindGroup(0, this.particleBindGroup);
      renderPass.draw(6, this.particleCount);
    }

    // Score pops
    this.updateScorePops();
    if (this.scorePopCount > 0) {
      renderPass.setPipeline(this.scorePopPipeline);
      renderPass.setBindGroup(0, this.scorePopBindGroup);
      renderPass.draw(6, this.scorePopCount);
    }

    // Combo
    if (this.comboCount >= 2) {
      renderPass.setPipeline(this.comboPipeline);
      renderPass.setBindGroup(0, this.comboBindGroup);
      renderPass.draw(6);
    }

    renderPass.end();
    this.device.queue.submit([commandEncoder.finish()]);
  }

  private updateUniforms(): void {
    // Background
    this.device.queue.writeBuffer(
      this.backgroundUniformBuffer,
      0,
      new Float32Array([this.canvas.width, this.canvas.height, this.time, this.gemSize])
    );

    // Gems
    const gemData = new Float32Array(20);
    gemData.set(this.viewProjectionMatrix, 0);
    gemData[16] = this.time;
    gemData[17] = this.gemSize;
    this.device.queue.writeBuffer(this.gemUniformBuffer, 0, gemData);

    // Grid
    const gridData = new Float32Array(20);
    gridData.set(this.viewProjectionMatrix, 0);
    gridData[16] = this.time;
    gridData[17] = this.gemSize;
    gridData[18] = this.gridRows;
    gridData[19] = this.gridCols;
    this.device.queue.writeBuffer(this.gridUniformBuffer, 0, gridData);

    // Particles
    const particleUniforms = new Float32Array(20);
    particleUniforms.set(this.viewProjectionMatrix, 0);
    particleUniforms[16] = this.time;
    this.device.queue.writeBuffer(this.particleUniformBuffer, 0, particleUniforms);

    // Progress
    const progressData = new Float32Array(20);
    progressData.set(this.viewProjectionMatrix, 0);
    progressData[16] = this.progress;
    progressData[17] = this.time;
    this.device.queue.writeBuffer(this.progressUniformBuffer, 0, progressData);

    // Score pops
    const scoreData = new Float32Array(20);
    scoreData.set(this.viewProjectionMatrix, 0);
    scoreData[16] = this.time;
    this.device.queue.writeBuffer(this.scorePopUniformBuffer, 0, scoreData);

    // Combo
    const comboData = new Float32Array(20);
    comboData.set(this.viewProjectionMatrix, 0);
    comboData[16] = this.comboCount;
    comboData[17] = this.time;
    this.device.queue.writeBuffer(this.comboUniformBuffer, 0, comboData);
  }

  private updateParticles(): void {
    const particles = this.particleSystem.getParticles();
    this.particleCount = particles.length;

    if (this.particleCount === 0) return;

    const typeMap: Record<string, number> = {
      'crystal': 0,
      'sparkle': 1,
      'glow': 2,
      'ring': 3,
      'trail': 4,
    };

    const data = new Float32Array(this.particleCount * 16);
    particles.forEach((p, i) => {
      const offset = i * 16;
      data[offset] = p.x;
      data[offset + 1] = p.y;
      data[offset + 2] = p.z;
      data[offset + 3] = p.life;
      data[offset + 4] = p.vx;
      data[offset + 5] = p.vy;
      data[offset + 6] = p.vz;
      data[offset + 7] = p.maxLife;
      data[offset + 8] = p.color[0];
      data[offset + 9] = p.color[1];
      data[offset + 10] = p.color[2];
      data[offset + 11] = p.color[3];
      data[offset + 12] = p.size;
      data[offset + 13] = typeMap[p.type] || 0;
      data[offset + 14] = p.rotation;
      data[offset + 15] = 0;
    });

    this.device.queue.writeBuffer(this.particleInstanceBuffer, 0, data);
  }

  private updateScorePops(): void {
    const pops = this.particleSystem.getScorePops();
    this.scorePopCount = pops.length;

    if (this.scorePopCount === 0) return;

    const data = new Float32Array(this.scorePopCount * 8);
    pops.forEach((p, i) => {
      const offset = i * 8;
      data[offset] = p.x;
      data[offset + 1] = p.y;
      data[offset + 2] = p.value;
      data[offset + 3] = p.life;
      data[offset + 4] = p.maxLife;
    });

    this.device.queue.writeBuffer(this.scorePopInstanceBuffer, 0, data);
  }
}
