/**
 * WebGPU Renderer - OneLine
 * Game #012
 */

import { mat4 } from './math';
import { ParticleSystem, type Particle } from './particles';
import {
  backgroundShader,
  edgeShader,
  nodeShader,
  dragLineShader,
  particleShader,
  victoryShader,
} from './shaders';

export interface EdgeData {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  visited: boolean;
}

export interface NodeData {
  x: number;
  y: number;
  state: 'normal' | 'visited' | 'current' | 'start';
  index: number;
}

export interface DragLine {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

export class WebGPURenderer {
  private canvas: HTMLCanvasElement;
  private device!: GPUDevice;
  private context!: GPUCanvasContext;
  private format!: GPUTextureFormat;

  // Pipelines
  private backgroundPipeline!: GPURenderPipeline;
  private edgePipeline!: GPURenderPipeline;
  private nodePipeline!: GPURenderPipeline;
  private dragLinePipeline!: GPURenderPipeline;
  private particlePipeline!: GPURenderPipeline;
  private victoryPipeline!: GPURenderPipeline;

  // Buffers
  private backgroundUniformBuffer!: GPUBuffer;
  private edgeUniformBuffer!: GPUBuffer;
  private edgeInstanceBuffer!: GPUBuffer;
  private nodeUniformBuffer!: GPUBuffer;
  private nodeInstanceBuffer!: GPUBuffer;
  private dragLineUniformBuffer!: GPUBuffer;
  private particleUniformBuffer!: GPUBuffer;
  private particleInstanceBuffer!: GPUBuffer;
  private victoryUniformBuffer!: GPUBuffer;

  // Bind Groups
  private backgroundBindGroup!: GPUBindGroup;
  private edgeBindGroup!: GPUBindGroup;
  private nodeBindGroup!: GPUBindGroup;
  private dragLineBindGroup!: GPUBindGroup;
  private particleBindGroup!: GPUBindGroup;
  private victoryBindGroup!: GPUBindGroup;

  // State
  private time = 0;
  private edgeCount = 0;
  private nodeCount = 0;
  private particleCount = 0;
  private dragLineActive = false;
  private dragLine: DragLine = { startX: 0, startY: 0, endX: 0, endY: 0 };
  private victoryProgress = 0;
  private victoryCenter = { x: 0.5, y: 0.5 };

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

    // Edge uniforms
    this.edgeUniformBuffer = this.device.createBuffer({
      size: 80,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    // Edge instances (max 50 edges)
    this.edgeInstanceBuffer = this.device.createBuffer({
      size: 50 * 32,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });

    // Node uniforms
    this.nodeUniformBuffer = this.device.createBuffer({
      size: 80,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    // Node instances (max 20 nodes)
    this.nodeInstanceBuffer = this.device.createBuffer({
      size: 20 * 16,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });

    // Drag line uniforms
    this.dragLineUniformBuffer = this.device.createBuffer({
      size: 96,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    // Particle uniforms
    this.particleUniformBuffer = this.device.createBuffer({
      size: 80,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    // Particle instances (max 2000)
    this.particleInstanceBuffer = this.device.createBuffer({
      size: 2000 * 48,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });

    // Victory uniforms
    this.victoryUniformBuffer = this.device.createBuffer({
      size: 80,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
  }

  private createPipelines(): void {
    const blendState = {
      color: { srcFactor: 'src-alpha' as const, dstFactor: 'one-minus-src-alpha' as const, operation: 'add' as const },
      alpha: { srcFactor: 'one' as const, dstFactor: 'one-minus-src-alpha' as const, operation: 'add' as const },
    };

    const additiveBlend = {
      color: { srcFactor: 'src-alpha' as const, dstFactor: 'one' as const, operation: 'add' as const },
      alpha: { srcFactor: 'one' as const, dstFactor: 'one' as const, operation: 'add' as const },
    };

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

    // Edge pipeline
    this.edgePipeline = this.device.createRenderPipeline({
      layout: 'auto',
      vertex: {
        module: this.device.createShaderModule({ code: edgeShader }),
        entryPoint: 'vertexMain',
      },
      fragment: {
        module: this.device.createShaderModule({ code: edgeShader }),
        entryPoint: 'fragmentMain',
        targets: [{ format: this.format, blend: blendState }],
      },
      primitive: { topology: 'triangle-list' },
    });

    // Node pipeline
    this.nodePipeline = this.device.createRenderPipeline({
      layout: 'auto',
      vertex: {
        module: this.device.createShaderModule({ code: nodeShader }),
        entryPoint: 'vertexMain',
      },
      fragment: {
        module: this.device.createShaderModule({ code: nodeShader }),
        entryPoint: 'fragmentMain',
        targets: [{ format: this.format, blend: blendState }],
      },
      primitive: { topology: 'triangle-list' },
    });

    // Drag line pipeline
    this.dragLinePipeline = this.device.createRenderPipeline({
      layout: 'auto',
      vertex: {
        module: this.device.createShaderModule({ code: dragLineShader }),
        entryPoint: 'vertexMain',
      },
      fragment: {
        module: this.device.createShaderModule({ code: dragLineShader }),
        entryPoint: 'fragmentMain',
        targets: [{ format: this.format, blend: blendState }],
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
        targets: [{ format: this.format, blend: additiveBlend }],
      },
      primitive: { topology: 'triangle-list' },
    });

    // Victory pipeline
    this.victoryPipeline = this.device.createRenderPipeline({
      layout: 'auto',
      vertex: {
        module: this.device.createShaderModule({ code: victoryShader }),
        entryPoint: 'vertexMain',
      },
      fragment: {
        module: this.device.createShaderModule({ code: victoryShader }),
        entryPoint: 'fragmentMain',
        targets: [{ format: this.format, blend: additiveBlend }],
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

    this.edgeBindGroup = this.device.createBindGroup({
      layout: this.edgePipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: this.edgeUniformBuffer } },
        { binding: 1, resource: { buffer: this.edgeInstanceBuffer } },
      ],
    });

    this.nodeBindGroup = this.device.createBindGroup({
      layout: this.nodePipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: this.nodeUniformBuffer } },
        { binding: 1, resource: { buffer: this.nodeInstanceBuffer } },
      ],
    });

    this.dragLineBindGroup = this.device.createBindGroup({
      layout: this.dragLinePipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: this.dragLineUniformBuffer } },
      ],
    });

    this.particleBindGroup = this.device.createBindGroup({
      layout: this.particlePipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: this.particleUniformBuffer } },
        { binding: 1, resource: { buffer: this.particleInstanceBuffer } },
      ],
    });

    this.victoryBindGroup = this.device.createBindGroup({
      layout: this.victoryPipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: this.victoryUniformBuffer } },
      ],
    });
  }

  updateEdges(edges: EdgeData[]): void {
    this.edgeCount = edges.length;

    const data = new Float32Array(edges.length * 8);
    edges.forEach((edge, i) => {
      const offset = i * 8;
      data[offset] = edge.startX;
      data[offset + 1] = edge.startY;
      data[offset + 2] = edge.endX;
      data[offset + 3] = edge.endY;
      data[offset + 4] = edge.visited ? 1 : 0;
    });

    this.device.queue.writeBuffer(this.edgeInstanceBuffer, 0, data);
  }

  updateNodes(nodes: NodeData[]): void {
    this.nodeCount = nodes.length;

    const stateMap: Record<string, number> = {
      'normal': 0,
      'visited': 1,
      'current': 2,
      'start': 3,
    };

    const data = new Float32Array(nodes.length * 4);
    nodes.forEach((node, i) => {
      const offset = i * 4;
      data[offset] = node.x;
      data[offset + 1] = node.y;
      data[offset + 2] = stateMap[node.state];
      data[offset + 3] = node.index;
    });

    this.device.queue.writeBuffer(this.nodeInstanceBuffer, 0, data);
  }

  setDragLine(line: DragLine | null): void {
    if (line) {
      this.dragLineActive = true;
      this.dragLine = line;
    } else {
      this.dragLineActive = false;
    }
  }

  setVictory(progress: number, centerX: number, centerY: number): void {
    this.victoryProgress = progress;
    this.victoryCenter = { x: centerX, y: centerY };
  }

  // Particle effects
  emitConnect(x: number, y: number): void {
    this.particleSystem.emitConnect(x, y);
  }

  emitTrail(x: number, y: number): void {
    this.particleSystem.emitTrail(x, y);
  }

  emitSelect(x: number, y: number): void {
    this.particleSystem.emitSelect(x, y);
  }

  emitLevelComplete(centerX: number, centerY: number): void {
    this.particleSystem.emitLevelComplete(centerX, centerY);
  }

  emitReset(centerX: number, centerY: number): void {
    this.particleSystem.emitReset(centerX, centerY);
  }

  clearParticles(): void {
    this.particleSystem.clear();
  }

  render(deltaTime: number): void {
    this.time += deltaTime * 0.001;

    // Update particle system
    this.particleSystem.update(deltaTime);
    this.particleSystem.emitAmbient(1, 1);

    // Update matrices (normalized 0-1 coordinate space)
    mat4.ortho(this.projectionMatrix, 0, 1, 0, 1, -10, 10);
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
        clearValue: { r: 0.02, g: 0.05, b: 0.08, a: 1 },
        loadOp: 'clear',
        storeOp: 'store',
      }],
    });

    // Background
    renderPass.setPipeline(this.backgroundPipeline);
    renderPass.setBindGroup(0, this.backgroundBindGroup);
    renderPass.draw(4);

    // Edges
    if (this.edgeCount > 0) {
      renderPass.setPipeline(this.edgePipeline);
      renderPass.setBindGroup(0, this.edgeBindGroup);
      renderPass.draw(6, this.edgeCount);
    }

    // Drag line
    if (this.dragLineActive) {
      renderPass.setPipeline(this.dragLinePipeline);
      renderPass.setBindGroup(0, this.dragLineBindGroup);
      renderPass.draw(6);
    }

    // Nodes
    if (this.nodeCount > 0) {
      renderPass.setPipeline(this.nodePipeline);
      renderPass.setBindGroup(0, this.nodeBindGroup);
      renderPass.draw(6, this.nodeCount);
    }

    // Particles
    this.updateParticles();
    if (this.particleCount > 0) {
      renderPass.setPipeline(this.particlePipeline);
      renderPass.setBindGroup(0, this.particleBindGroup);
      renderPass.draw(6, this.particleCount);
    }

    // Victory effect
    if (this.victoryProgress > 0) {
      renderPass.setPipeline(this.victoryPipeline);
      renderPass.setBindGroup(0, this.victoryBindGroup);
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
      new Float32Array([this.canvas.width, this.canvas.height, this.time, 0])
    );

    // Edges
    const edgeData = new Float32Array(20);
    edgeData.set(this.viewProjectionMatrix, 0);
    edgeData[16] = this.time;
    edgeData[17] = 0.012; // line width
    this.device.queue.writeBuffer(this.edgeUniformBuffer, 0, edgeData);

    // Nodes
    const nodeData = new Float32Array(20);
    nodeData.set(this.viewProjectionMatrix, 0);
    nodeData[16] = this.time;
    nodeData[17] = 0.025; // node radius
    this.device.queue.writeBuffer(this.nodeUniformBuffer, 0, nodeData);

    // Drag line
    const dragData = new Float32Array(24);
    dragData.set(this.viewProjectionMatrix, 0);
    dragData[16] = this.dragLine.startX;
    dragData[17] = this.dragLine.startY;
    dragData[18] = this.dragLine.endX;
    dragData[19] = this.dragLine.endY;
    dragData[20] = this.time;
    dragData[21] = this.dragLineActive ? 1 : 0;
    this.device.queue.writeBuffer(this.dragLineUniformBuffer, 0, dragData);

    // Particles
    const particleUniforms = new Float32Array(20);
    particleUniforms.set(this.viewProjectionMatrix, 0);
    particleUniforms[16] = this.time;
    this.device.queue.writeBuffer(this.particleUniformBuffer, 0, particleUniforms);

    // Victory
    const victoryData = new Float32Array(20);
    victoryData.set(this.viewProjectionMatrix, 0);
    victoryData[16] = this.time;
    victoryData[17] = this.victoryProgress;
    victoryData[18] = this.victoryCenter.x;
    victoryData[19] = this.victoryCenter.y;
    this.device.queue.writeBuffer(this.victoryUniformBuffer, 0, victoryData);
  }

  private updateParticles(): void {
    const particles = this.particleSystem.getParticles();
    this.particleCount = particles.length;

    if (this.particleCount === 0) return;

    const typeMap: Record<string, number> = {
      'spark': 0,
      'trail': 1,
      'burst': 2,
      'ambient': 3,
    };

    const data = new Float32Array(this.particleCount * 12);
    particles.forEach((p, i) => {
      const offset = i * 12;
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
    });

    // Need to add size and type - expand buffer
    const fullData = new Float32Array(this.particleCount * 16);
    particles.forEach((p, i) => {
      const offset = i * 16;
      fullData[offset] = p.x;
      fullData[offset + 1] = p.y;
      fullData[offset + 2] = p.z;
      fullData[offset + 3] = p.life;
      fullData[offset + 4] = p.vx;
      fullData[offset + 5] = p.vy;
      fullData[offset + 6] = p.vz;
      fullData[offset + 7] = p.maxLife;
      fullData[offset + 8] = p.color[0];
      fullData[offset + 9] = p.color[1];
      fullData[offset + 10] = p.color[2];
      fullData[offset + 11] = p.color[3];
      fullData[offset + 12] = p.size;
      fullData[offset + 13] = typeMap[p.type] || 0;
    });

    this.device.queue.writeBuffer(this.particleInstanceBuffer, 0, fullData);
  }
}
