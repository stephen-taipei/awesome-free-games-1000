/**
 * WebGPU 3D 渲染器 - 華容道
 * Main renderer for Klotski puzzle game
 */

import { mat4, vec3 } from './math';
import { shaders } from './shaders';
import { ParticleSystem, Particle } from './particles';

export interface BlockState {
  id: string;
  type: 'CAOCAO' | 'GENERAL_V' | 'GENERAL_H' | 'SOLDIER';
  x: number;
  y: number;
  width: number;
  height: number;
  selected: boolean;
  animX?: number;  // 動畫中的 X 位置
  animY?: number;  // 動畫中的 Y 位置
}

export interface CameraState {
  rotationY: number;
  targetRotationY: number;
  zoom: number;
  targetZoom: number;
  shake: number;
  shakeDecay: number;
}

export class WebGPURenderer {
  private device!: GPUDevice;
  private context!: GPUCanvasContext;
  private format!: GPUTextureFormat;

  // 渲染管線
  private blockPipeline!: GPURenderPipeline;
  private boardPipeline!: GPURenderPipeline;
  private exitPipeline!: GPURenderPipeline;
  private particlePipeline!: GPURenderPipeline;
  private victoryPipeline!: GPURenderPipeline;

  // 緩衝區
  private blockVertexBuffer!: GPUBuffer;
  private blockIndexBuffer!: GPUBuffer;
  private boardVertexBuffer!: GPUBuffer;
  private boardIndexBuffer!: GPUBuffer;
  private particleVertexBuffer!: GPUBuffer;
  private quadVertexBuffer!: GPUBuffer;

  // Uniform 緩衝區
  private cameraUniformBuffer!: GPUBuffer;
  private blockUniformBuffer!: GPUBuffer;
  private boardUniformBuffer!: GPUBuffer;
  private exitUniformBuffer!: GPUBuffer;
  private particleUniformBuffer!: GPUBuffer;
  private victoryUniformBuffer!: GPUBuffer;

  // 綁定組
  private blockBindGroup!: GPUBindGroup;
  private boardBindGroup!: GPUBindGroup;
  private exitBindGroup!: GPUBindGroup;
  private particleBindGroup!: GPUBindGroup;
  private victoryBindGroup!: GPUBindGroup;

  // 深度紋理
  private depthTexture!: GPUTexture;
  private depthTextureView!: GPUTextureView;

  // 粒子系統
  public particleSystem: ParticleSystem;

  // 狀態
  private blocks: BlockState[] = [];
  private camera: CameraState = {
    rotationY: 0,
    targetRotationY: 0,
    zoom: 1.0,
    targetZoom: 1.0,
    shake: 0,
    shakeDecay: 0.9,
  };

  private time: number = 0;
  private isVictory: boolean = false;
  private victoryTime: number = 0;

  // 棋盤尺寸（4列 x 5行）
  private readonly boardWidth = 4;
  private readonly boardHeight = 5;
  private readonly cellSize = 1.0;

  constructor() {
    this.particleSystem = new ParticleSystem();
  }

  async initialize(canvas: HTMLCanvasElement): Promise<boolean> {
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
    this.context = canvas.getContext('webgpu') as GPUCanvasContext;
    this.format = navigator.gpu.getPreferredCanvasFormat();

    this.context.configure({
      device: this.device,
      format: this.format,
      alphaMode: 'premultiplied',
    });

    this.createBuffers();
    this.createPipelines();
    this.createDepthTexture(canvas.width, canvas.height);

    return true;
  }

  private createBuffers(): void {
    // 方塊頂點數據（立方體）
    const blockVertices = this.createCubeVertices();
    this.blockVertexBuffer = this.device.createBuffer({
      size: blockVertices.byteLength,
      usage: GPUBufferUsage.VERTEX,
      mappedAtCreation: true,
    });
    new Float32Array(this.blockVertexBuffer.getMappedRange()).set(blockVertices);
    this.blockVertexBuffer.unmap();

    // 方塊索引
    const blockIndices = this.createCubeIndices();
    this.blockIndexBuffer = this.device.createBuffer({
      size: blockIndices.byteLength,
      usage: GPUBufferUsage.INDEX,
      mappedAtCreation: true,
    });
    new Uint16Array(this.blockIndexBuffer.getMappedRange()).set(blockIndices);
    this.blockIndexBuffer.unmap();

    // 棋盤頂點
    const boardVertices = this.createBoardVertices();
    this.boardVertexBuffer = this.device.createBuffer({
      size: boardVertices.byteLength,
      usage: GPUBufferUsage.VERTEX,
      mappedAtCreation: true,
    });
    new Float32Array(this.boardVertexBuffer.getMappedRange()).set(boardVertices);
    this.boardVertexBuffer.unmap();

    // 棋盤索引
    const boardIndices = new Uint16Array([0, 1, 2, 2, 3, 0]);
    this.boardIndexBuffer = this.device.createBuffer({
      size: boardIndices.byteLength,
      usage: GPUBufferUsage.INDEX,
      mappedAtCreation: true,
    });
    new Uint16Array(this.boardIndexBuffer.getMappedRange()).set(boardIndices);
    this.boardIndexBuffer.unmap();

    // 粒子頂點緩衝區（動態）
    this.particleVertexBuffer = this.device.createBuffer({
      size: 2000 * 10 * 4, // 最多2000個粒子，每個10個float
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });

    // 四邊形頂點（用於全螢幕效果）
    const quadVertices = new Float32Array([
      -1, -1, 0, 0,
       1, -1, 1, 0,
       1,  1, 1, 1,
      -1, -1, 0, 0,
       1,  1, 1, 1,
      -1,  1, 0, 1,
    ]);
    this.quadVertexBuffer = this.device.createBuffer({
      size: quadVertices.byteLength,
      usage: GPUBufferUsage.VERTEX,
      mappedAtCreation: true,
    });
    new Float32Array(this.quadVertexBuffer.getMappedRange()).set(quadVertices);
    this.quadVertexBuffer.unmap();

    // Uniform 緩衝區
    this.cameraUniformBuffer = this.device.createBuffer({
      size: 256,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    this.blockUniformBuffer = this.device.createBuffer({
      size: 256,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    this.boardUniformBuffer = this.device.createBuffer({
      size: 64,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    this.exitUniformBuffer = this.device.createBuffer({
      size: 80,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    this.particleUniformBuffer = this.device.createBuffer({
      size: 144,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    this.victoryUniformBuffer = this.device.createBuffer({
      size: 32,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
  }

  private createCubeVertices(): Float32Array {
    // 每個頂點：位置(3) + 法線(3) = 6 floats
    const vertices: number[] = [];

    // 定義立方體的6個面
    const faces = [
      { normal: [0, 1, 0], vertices: [[-0.5, 0.5, -0.5], [0.5, 0.5, -0.5], [0.5, 0.5, 0.5], [-0.5, 0.5, 0.5]] },  // 上
      { normal: [0, -1, 0], vertices: [[-0.5, -0.5, 0.5], [0.5, -0.5, 0.5], [0.5, -0.5, -0.5], [-0.5, -0.5, -0.5]] }, // 下
      { normal: [0, 0, 1], vertices: [[-0.5, -0.5, 0.5], [-0.5, 0.5, 0.5], [0.5, 0.5, 0.5], [0.5, -0.5, 0.5]] },   // 前
      { normal: [0, 0, -1], vertices: [[0.5, -0.5, -0.5], [0.5, 0.5, -0.5], [-0.5, 0.5, -0.5], [-0.5, -0.5, -0.5]] }, // 後
      { normal: [1, 0, 0], vertices: [[0.5, -0.5, 0.5], [0.5, 0.5, 0.5], [0.5, 0.5, -0.5], [0.5, -0.5, -0.5]] },   // 右
      { normal: [-1, 0, 0], vertices: [[-0.5, -0.5, -0.5], [-0.5, 0.5, -0.5], [-0.5, 0.5, 0.5], [-0.5, -0.5, 0.5]] }, // 左
    ];

    for (const face of faces) {
      for (const v of face.vertices) {
        vertices.push(...v, ...face.normal);
      }
    }

    return new Float32Array(vertices);
  }

  private createCubeIndices(): Uint16Array {
    const indices: number[] = [];
    for (let face = 0; face < 6; face++) {
      const offset = face * 4;
      indices.push(
        offset, offset + 1, offset + 2,
        offset, offset + 2, offset + 3
      );
    }
    return new Uint16Array(indices);
  }

  private createBoardVertices(): Float32Array {
    const w = this.boardWidth * this.cellSize;
    const h = this.boardHeight * this.cellSize;
    // 位置(3) + 法線(3) + UV(2)
    return new Float32Array([
      0, 0, 0,    0, 1, 0,    0, 0,
      w, 0, 0,    0, 1, 0,    1, 0,
      w, 0, h,    0, 1, 0,    1, 1,
      0, 0, h,    0, 1, 0,    0, 1,
    ]);
  }

  private createPipelines(): void {
    // 方塊管線
    const blockModule = this.device.createShaderModule({
      code: shaders.block,
    });

    const blockBindGroupLayout = this.device.createBindGroupLayout({
      entries: [
        { binding: 0, visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT, buffer: { type: 'uniform' } },
        { binding: 1, visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT, buffer: { type: 'uniform' } },
      ],
    });

    this.blockPipeline = this.device.createRenderPipeline({
      layout: this.device.createPipelineLayout({ bindGroupLayouts: [blockBindGroupLayout] }),
      vertex: {
        module: blockModule,
        entryPoint: 'vertexMain',
        buffers: [{
          arrayStride: 24,
          attributes: [
            { shaderLocation: 0, offset: 0, format: 'float32x3' },
            { shaderLocation: 1, offset: 12, format: 'float32x3' },
          ],
        }],
      },
      fragment: {
        module: blockModule,
        entryPoint: 'fragmentMain',
        targets: [{ format: this.format }],
      },
      primitive: { topology: 'triangle-list', cullMode: 'back' },
      depthStencil: {
        depthWriteEnabled: true,
        depthCompare: 'less',
        format: 'depth24plus',
      },
    });

    this.blockBindGroup = this.device.createBindGroup({
      layout: blockBindGroupLayout,
      entries: [
        { binding: 0, resource: { buffer: this.cameraUniformBuffer } },
        { binding: 1, resource: { buffer: this.blockUniformBuffer } },
      ],
    });

    // 棋盤管線
    const boardModule = this.device.createShaderModule({
      code: shaders.board,
    });

    const boardBindGroupLayout = this.device.createBindGroupLayout({
      entries: [
        { binding: 0, visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT, buffer: { type: 'uniform' } },
        { binding: 1, visibility: GPUShaderStage.FRAGMENT, buffer: { type: 'uniform' } },
      ],
    });

    this.boardPipeline = this.device.createRenderPipeline({
      layout: this.device.createPipelineLayout({ bindGroupLayouts: [boardBindGroupLayout] }),
      vertex: {
        module: boardModule,
        entryPoint: 'vertexMain',
        buffers: [{
          arrayStride: 32,
          attributes: [
            { shaderLocation: 0, offset: 0, format: 'float32x3' },
            { shaderLocation: 1, offset: 12, format: 'float32x3' },
            { shaderLocation: 2, offset: 24, format: 'float32x2' },
          ],
        }],
      },
      fragment: {
        module: boardModule,
        entryPoint: 'fragmentMain',
        targets: [{ format: this.format }],
      },
      primitive: { topology: 'triangle-list' },
      depthStencil: {
        depthWriteEnabled: true,
        depthCompare: 'less',
        format: 'depth24plus',
      },
    });

    this.boardBindGroup = this.device.createBindGroup({
      layout: boardBindGroupLayout,
      entries: [
        { binding: 0, resource: { buffer: this.cameraUniformBuffer } },
        { binding: 1, resource: { buffer: this.boardUniformBuffer } },
      ],
    });

    // 出口指示器管線
    const exitModule = this.device.createShaderModule({
      code: shaders.exitIndicator,
    });

    const exitBindGroupLayout = this.device.createBindGroupLayout({
      entries: [
        { binding: 0, visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT, buffer: { type: 'uniform' } },
        { binding: 1, visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT, buffer: { type: 'uniform' } },
      ],
    });

    this.exitPipeline = this.device.createRenderPipeline({
      layout: this.device.createPipelineLayout({ bindGroupLayouts: [exitBindGroupLayout] }),
      vertex: {
        module: exitModule,
        entryPoint: 'vertexMain',
        buffers: [{
          arrayStride: 16,
          attributes: [
            { shaderLocation: 0, offset: 0, format: 'float32x2' },
            { shaderLocation: 1, offset: 8, format: 'float32x2' },
          ],
        }],
      },
      fragment: {
        module: exitModule,
        entryPoint: 'fragmentMain',
        targets: [{
          format: this.format,
          blend: {
            color: { srcFactor: 'src-alpha', dstFactor: 'one-minus-src-alpha' },
            alpha: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha' },
          },
        }],
      },
      primitive: { topology: 'triangle-list' },
      depthStencil: {
        depthWriteEnabled: false,
        depthCompare: 'less',
        format: 'depth24plus',
      },
    });

    this.exitBindGroup = this.device.createBindGroup({
      layout: exitBindGroupLayout,
      entries: [
        { binding: 0, resource: { buffer: this.cameraUniformBuffer } },
        { binding: 1, resource: { buffer: this.exitUniformBuffer } },
      ],
    });

    // 粒子管線
    const particleModule = this.device.createShaderModule({
      code: shaders.particle,
    });

    const particleBindGroupLayout = this.device.createBindGroupLayout({
      entries: [
        { binding: 0, visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT, buffer: { type: 'uniform' } },
      ],
    });

    this.particlePipeline = this.device.createRenderPipeline({
      layout: this.device.createPipelineLayout({ bindGroupLayouts: [particleBindGroupLayout] }),
      vertex: {
        module: particleModule,
        entryPoint: 'vertexMain',
        buffers: [{
          arrayStride: 40,
          stepMode: 'instance',
          attributes: [
            { shaderLocation: 0, offset: 0, format: 'float32x3' },  // position
            { shaderLocation: 1, offset: 12, format: 'float32x4' }, // color
            { shaderLocation: 2, offset: 28, format: 'float32' },   // size
            { shaderLocation: 3, offset: 32, format: 'float32' },   // rotation
            { shaderLocation: 4, offset: 36, format: 'float32' },   // life
          ],
        }],
      },
      fragment: {
        module: particleModule,
        entryPoint: 'fragmentMain',
        targets: [{
          format: this.format,
          blend: {
            color: { srcFactor: 'src-alpha', dstFactor: 'one' },
            alpha: { srcFactor: 'one', dstFactor: 'one' },
          },
        }],
      },
      primitive: { topology: 'triangle-list' },
      depthStencil: {
        depthWriteEnabled: false,
        depthCompare: 'less',
        format: 'depth24plus',
      },
    });

    this.particleBindGroup = this.device.createBindGroup({
      layout: particleBindGroupLayout,
      entries: [
        { binding: 0, resource: { buffer: this.particleUniformBuffer } },
      ],
    });

    // 勝利效果管線
    const victoryModule = this.device.createShaderModule({
      code: shaders.victory,
    });

    const victoryBindGroupLayout = this.device.createBindGroupLayout({
      entries: [
        { binding: 0, visibility: GPUShaderStage.FRAGMENT, buffer: { type: 'uniform' } },
      ],
    });

    this.victoryPipeline = this.device.createRenderPipeline({
      layout: this.device.createPipelineLayout({ bindGroupLayouts: [victoryBindGroupLayout] }),
      vertex: {
        module: victoryModule,
        entryPoint: 'vertexMain',
        buffers: [{
          arrayStride: 16,
          attributes: [
            { shaderLocation: 0, offset: 0, format: 'float32x2' },
            { shaderLocation: 1, offset: 8, format: 'float32x2' },
          ],
        }],
      },
      fragment: {
        module: victoryModule,
        entryPoint: 'fragmentMain',
        targets: [{
          format: this.format,
          blend: {
            color: { srcFactor: 'src-alpha', dstFactor: 'one-minus-src-alpha' },
            alpha: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha' },
          },
        }],
      },
      primitive: { topology: 'triangle-list' },
    });

    this.victoryBindGroup = this.device.createBindGroup({
      layout: victoryBindGroupLayout,
      entries: [
        { binding: 0, resource: { buffer: this.victoryUniformBuffer } },
      ],
    });
  }

  private createDepthTexture(width: number, height: number): void {
    if (this.depthTexture) {
      this.depthTexture.destroy();
    }

    this.depthTexture = this.device.createTexture({
      size: [width, height],
      format: 'depth24plus',
      usage: GPUTextureUsage.RENDER_ATTACHMENT,
    });

    this.depthTextureView = this.depthTexture.createView();
  }

  resize(width: number, height: number): void {
    this.createDepthTexture(width, height);
  }

  updateBlocks(blocks: BlockState[]): void {
    this.blocks = blocks;
  }

  setVictory(value: boolean): void {
    if (value && !this.isVictory) {
      this.victoryTime = this.time;
      // 在曹操位置發射勝利粒子
      const caocao = this.blocks.find(b => b.type === 'CAOCAO');
      if (caocao) {
        const x = (caocao.animX ?? caocao.x) * this.cellSize + this.cellSize;
        const z = (caocao.animY ?? caocao.y) * this.cellSize + this.cellSize;
        this.particleSystem.emitVictory(x, 0.5, z);
      }
    }
    this.isVictory = value;
  }

  shakeCamera(intensity: number): void {
    this.camera.shake = intensity;
  }

  rotateCamera(delta: number): void {
    this.camera.targetRotationY += delta;
  }

  zoomCamera(delta: number): void {
    this.camera.targetZoom = Math.max(0.5, Math.min(2.0, this.camera.targetZoom + delta));
  }

  render(deltaTime: number): void {
    this.time += deltaTime * 0.001;

    // 更新相機
    this.camera.rotationY += (this.camera.targetRotationY - this.camera.rotationY) * 0.1;
    this.camera.zoom += (this.camera.targetZoom - this.camera.zoom) * 0.1;
    this.camera.shake *= this.camera.shakeDecay;

    // 更新粒子
    this.particleSystem.update(deltaTime);

    // 持續發射出口光效
    this.particleSystem.emitExitGlow(
      1.5 * this.cellSize,
      0,
      this.boardHeight * this.cellSize + 0.3,
      0.5
    );

    // 檢查曹操是否接近出口
    const caocao = this.blocks.find(b => b.type === 'CAOCAO');
    if (caocao && !this.isVictory) {
      const targetY = 3; // 出口位置
      const distance = Math.abs((caocao.animY ?? caocao.y) - targetY);
      if (distance < 2) {
        const x = (caocao.animX ?? caocao.x) * this.cellSize + this.cellSize;
        const z = (caocao.animY ?? caocao.y) * this.cellSize + this.cellSize;
        this.particleSystem.emitCaocaoNearExit(x, 0, z, distance);
      }
    }

    const commandEncoder = this.device.createCommandEncoder();
    const textureView = this.context.getCurrentTexture().createView();

    const renderPass = commandEncoder.beginRenderPass({
      colorAttachments: [{
        view: textureView,
        clearValue: { r: 0.02, g: 0.02, b: 0.05, a: 1.0 },
        loadOp: 'clear',
        storeOp: 'store',
      }],
      depthStencilAttachment: {
        view: this.depthTextureView,
        depthClearValue: 1.0,
        depthLoadOp: 'clear',
        depthStoreOp: 'store',
      },
    });

    // 計算相機矩陣
    const aspect = this.context.canvas.width / this.context.canvas.height;
    const projection = mat4.perspective(Math.PI / 4, aspect, 0.1, 100);

    // 相機位置
    const cameraDistance = 10 / this.camera.zoom;
    const cameraHeight = 8 / this.camera.zoom;
    const shakeX = (Math.random() - 0.5) * this.camera.shake * 0.2;
    const shakeY = (Math.random() - 0.5) * this.camera.shake * 0.2;

    const eyeX = Math.sin(this.camera.rotationY) * cameraDistance + this.boardWidth * this.cellSize * 0.5 + shakeX;
    const eyeZ = Math.cos(this.camera.rotationY) * cameraDistance + this.boardHeight * this.cellSize * 0.5 + shakeY;

    const view = mat4.lookAt(
      [eyeX, cameraHeight, eyeZ],
      [this.boardWidth * this.cellSize * 0.5, 0, this.boardHeight * this.cellSize * 0.5],
      [0, 1, 0]
    );

    const viewProjection = mat4.multiply(projection, view);

    // 更新相機 uniform
    const cameraData = new Float32Array(32);
    cameraData.set(viewProjection, 0);
    cameraData.set([eyeX, cameraHeight, eyeZ], 16);
    cameraData[19] = this.time;
    this.device.queue.writeBuffer(this.cameraUniformBuffer, 0, cameraData);

    // 渲染棋盤
    const boardData = new Float32Array([this.time, 0, 0, 0]);
    this.device.queue.writeBuffer(this.boardUniformBuffer, 0, boardData);

    renderPass.setPipeline(this.boardPipeline);
    renderPass.setBindGroup(0, this.boardBindGroup);
    renderPass.setVertexBuffer(0, this.boardVertexBuffer);
    renderPass.setIndexBuffer(this.boardIndexBuffer, 'uint16');
    renderPass.drawIndexed(6);

    // 渲染出口指示器
    const exitData = new Float32Array([
      this.cellSize, this.boardHeight * this.cellSize, // position
      2 * this.cellSize, 0.8, // size
      this.time, 0, 0, 0,
    ]);
    this.device.queue.writeBuffer(this.exitUniformBuffer, 0, exitData);

    // 創建出口四邊形頂點
    const exitQuad = new Float32Array([
      -1, -1, 0, 0,
       1, -1, 1, 0,
       1,  1, 1, 1,
      -1, -1, 0, 0,
       1,  1, 1, 1,
      -1,  1, 0, 1,
    ]);
    const exitVertexBuffer = this.device.createBuffer({
      size: exitQuad.byteLength,
      usage: GPUBufferUsage.VERTEX,
      mappedAtCreation: true,
    });
    new Float32Array(exitVertexBuffer.getMappedRange()).set(exitQuad);
    exitVertexBuffer.unmap();

    renderPass.setPipeline(this.exitPipeline);
    renderPass.setBindGroup(0, this.exitBindGroup);
    renderPass.setVertexBuffer(0, exitVertexBuffer);
    renderPass.draw(6);

    // 渲染方塊
    renderPass.setPipeline(this.blockPipeline);
    renderPass.setBindGroup(0, this.blockBindGroup);
    renderPass.setVertexBuffer(0, this.blockVertexBuffer);
    renderPass.setIndexBuffer(this.blockIndexBuffer, 'uint16');

    for (const block of this.blocks) {
      const blockData = new Float32Array(16);

      // 位置和尺寸
      const x = (block.animX ?? block.x) * this.cellSize;
      const z = (block.animY ?? block.y) * this.cellSize;
      blockData[0] = x;
      blockData[1] = 0;
      blockData[2] = z;
      blockData[3] = block.width * this.cellSize;

      blockData[4] = 0.6; // 高度
      blockData[5] = block.height * this.cellSize;

      // 方塊類型
      let typeIndex = 0;
      switch (block.type) {
        case 'CAOCAO': typeIndex = 0; break;
        case 'GENERAL_V': typeIndex = 1; break;
        case 'GENERAL_H': typeIndex = 2; break;
        case 'SOLDIER': typeIndex = 3; break;
      }
      blockData[6] = typeIndex;

      // 選中狀態和時間
      blockData[7] = block.selected ? 1.0 : 0.0;
      blockData[8] = this.time;

      this.device.queue.writeBuffer(this.blockUniformBuffer, 0, blockData);
      renderPass.drawIndexed(36);

      // 選中的方塊發射粒子
      if (block.selected) {
        this.particleSystem.emitSelection(
          x, 0, z,
          block.width * this.cellSize,
          block.height * this.cellSize,
          block.type
        );
      }
    }

    // 渲染粒子
    const particles = this.particleSystem.getParticles();
    if (particles.length > 0) {
      const particleData = new Float32Array(particles.length * 10);
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        const offset = i * 10;
        particleData[offset] = p.x;
        particleData[offset + 1] = p.y;
        particleData[offset + 2] = p.z;
        particleData[offset + 3] = p.color[0];
        particleData[offset + 4] = p.color[1];
        particleData[offset + 5] = p.color[2];
        particleData[offset + 6] = p.color[3];
        particleData[offset + 7] = p.size;
        particleData[offset + 8] = p.rotation;
        particleData[offset + 9] = p.life / p.maxLife;
      }
      this.device.queue.writeBuffer(this.particleVertexBuffer, 0, particleData);

      // 粒子 uniform
      const particleUniform = new Float32Array(36);
      particleUniform.set(viewProjection, 0);
      particleUniform[32] = eyeX;
      particleUniform[33] = cameraHeight;
      particleUniform[34] = eyeZ;
      particleUniform[35] = this.time;
      this.device.queue.writeBuffer(this.particleUniformBuffer, 0, particleUniform);

      renderPass.setPipeline(this.particlePipeline);
      renderPass.setBindGroup(0, this.particleBindGroup);
      renderPass.setVertexBuffer(0, this.particleVertexBuffer);
      renderPass.draw(6, particles.length);
    }

    renderPass.end();

    // 勝利效果（後處理）
    if (this.isVictory) {
      const victoryPass = commandEncoder.beginRenderPass({
        colorAttachments: [{
          view: textureView,
          loadOp: 'load',
          storeOp: 'store',
        }],
      });

      const victoryData = new Float32Array([
        this.time - this.victoryTime,
        this.context.canvas.width / this.context.canvas.height,
        0, 0,
      ]);
      this.device.queue.writeBuffer(this.victoryUniformBuffer, 0, victoryData);

      victoryPass.setPipeline(this.victoryPipeline);
      victoryPass.setBindGroup(0, this.victoryBindGroup);
      victoryPass.setVertexBuffer(0, this.quadVertexBuffer);
      victoryPass.draw(6);
      victoryPass.end();
    }

    this.device.queue.submit([commandEncoder.finish()]);

    // 清理臨時緩衝區
    exitVertexBuffer.destroy();
  }

  destroy(): void {
    this.blockVertexBuffer?.destroy();
    this.blockIndexBuffer?.destroy();
    this.boardVertexBuffer?.destroy();
    this.boardIndexBuffer?.destroy();
    this.particleVertexBuffer?.destroy();
    this.quadVertexBuffer?.destroy();
    this.cameraUniformBuffer?.destroy();
    this.blockUniformBuffer?.destroy();
    this.boardUniformBuffer?.destroy();
    this.exitUniformBuffer?.destroy();
    this.particleUniformBuffer?.destroy();
    this.victoryUniformBuffer?.destroy();
    this.depthTexture?.destroy();
  }
}
