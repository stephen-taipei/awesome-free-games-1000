/**
 * WebGPU 3D 渲染器 - 踩地雷
 * 3D 方塊網格、地雷、旗幟和特效渲染
 */

import { mat4, vec3 } from './math';
import { shaders } from './shaders';
import { ParticleSystem } from './particles';

export interface CellState {
  isMine: boolean;
  isRevealed: boolean;
  isFlagged: boolean;
  adjacentMines: number;
  isExploded?: boolean;
}

export interface CameraState {
  distance: number;
  rotationX: number;
  rotationY: number;
  targetX: number;
  targetZ: number;
  shake: number;
}

export class WebGPURenderer {
  private device!: GPUDevice;
  private context!: GPUCanvasContext;
  private format!: GPUTextureFormat;

  // 渲染管線
  private cellPipeline!: GPURenderPipeline;
  private minePipeline!: GPURenderPipeline;
  private flagPipeline!: GPURenderPipeline;
  private numberPipeline!: GPURenderPipeline;
  private gridPipeline!: GPURenderPipeline;
  private particlePipeline!: GPURenderPipeline;
  private victoryPipeline!: GPURenderPipeline;
  private shockwavePipeline!: GPURenderPipeline;

  // 緩衝區
  private uniformBuffer!: GPUBuffer;
  private cellInstanceBuffer!: GPUBuffer;
  private mineInstanceBuffer!: GPUBuffer;
  private flagInstanceBuffer!: GPUBuffer;
  private numberInstanceBuffer!: GPUBuffer;
  private particleInstanceBuffer!: GPUBuffer;
  private shockwaveUniformBuffer!: GPUBuffer;
  private victoryUniformBuffer!: GPUBuffer;

  // 綁定組
  private cellBindGroup!: GPUBindGroup;
  private mineBindGroup!: GPUBindGroup;
  private flagBindGroup!: GPUBindGroup;
  private numberBindGroup!: GPUBindGroup;
  private gridBindGroup!: GPUBindGroup;
  private particleBindGroup!: GPUBindGroup;
  private victoryBindGroup!: GPUBindGroup;
  private shockwaveBindGroup!: GPUBindGroup;

  // 深度緩衝
  private depthTexture!: GPUTexture;
  private depthView!: GPUTextureView;

  // 狀態
  private gridWidth = 9;
  private gridHeight = 9;
  private cells: CellState[][] = [];
  private revealProgress: number[][] = [];
  private hoverCell: { row: number; col: number } | null = null;
  private time = 0;
  private isVictory = false;
  private victoryProgress = 0;
  private shockwaveCenter: [number, number, number] | null = null;
  private shockwaveProgress = 0;

  // 粒子系統
  public particleSystem = new ParticleSystem();

  // 相機
  private camera: CameraState = {
    distance: 12,
    rotationX: 0.8,
    rotationY: 0,
    targetX: 0,
    targetZ: 0,
    shake: 0
  };

  async initialize(canvas: HTMLCanvasElement): Promise<boolean> {
    try {
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
        alphaMode: 'premultiplied'
      });

      this.createDepthBuffer(canvas.width, canvas.height);
      this.createBuffers();
      this.createPipelines();
      this.createBindGroups();

      return true;
    } catch (error) {
      console.error('WebGPU initialization failed:', error);
      return false;
    }
  }

  private createDepthBuffer(width: number, height: number): void {
    if (this.depthTexture) {
      this.depthTexture.destroy();
    }

    this.depthTexture = this.device.createTexture({
      size: { width, height },
      format: 'depth24plus',
      usage: GPUTextureUsage.RENDER_ATTACHMENT
    });
    this.depthView = this.depthTexture.createView();
  }

  private createBuffers(): void {
    // Uniform buffer
    this.uniformBuffer = this.device.createBuffer({
      size: 128,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
    });

    // Instance buffers
    const maxCells = 30 * 16; // 最大網格尺寸
    this.cellInstanceBuffer = this.device.createBuffer({
      size: maxCells * 32, // position(3) + state(1) + adjacentMines(1) + revealProgress(1) + hover(1) + padding(1)
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
    });

    this.mineInstanceBuffer = this.device.createBuffer({
      size: maxCells * 24,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
    });

    this.flagInstanceBuffer = this.device.createBuffer({
      size: maxCells * 16,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
    });

    this.numberInstanceBuffer = this.device.createBuffer({
      size: maxCells * 20,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
    });

    this.particleInstanceBuffer = this.device.createBuffer({
      size: 2000 * 48,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
    });

    this.victoryUniformBuffer = this.device.createBuffer({
      size: 80,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
    });

    this.shockwaveUniformBuffer = this.device.createBuffer({
      size: 96,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
    });
  }

  private createPipelines(): void {
    const cellInstanceLayout: GPUVertexBufferLayout = {
      arrayStride: 32,
      stepMode: 'instance',
      attributes: [
        { shaderLocation: 3, offset: 0, format: 'float32x3' },  // position
        { shaderLocation: 4, offset: 12, format: 'float32' },   // state
        { shaderLocation: 5, offset: 16, format: 'float32' },   // adjacentMines
        { shaderLocation: 6, offset: 20, format: 'float32' },   // revealProgress
        { shaderLocation: 7, offset: 24, format: 'float32' },   // hoverIntensity
      ]
    };

    const mineInstanceLayout: GPUVertexBufferLayout = {
      arrayStride: 24,
      stepMode: 'instance',
      attributes: [
        { shaderLocation: 3, offset: 0, format: 'float32x3' },
        { shaderLocation: 4, offset: 12, format: 'float32' },
        { shaderLocation: 5, offset: 16, format: 'float32' },
      ]
    };

    const flagInstanceLayout: GPUVertexBufferLayout = {
      arrayStride: 16,
      stepMode: 'instance',
      attributes: [
        { shaderLocation: 3, offset: 0, format: 'float32x3' },
        { shaderLocation: 4, offset: 12, format: 'float32' },
      ]
    };

    const numberInstanceLayout: GPUVertexBufferLayout = {
      arrayStride: 20,
      stepMode: 'instance',
      attributes: [
        { shaderLocation: 3, offset: 0, format: 'float32x3' },
        { shaderLocation: 4, offset: 12, format: 'float32' },
        { shaderLocation: 5, offset: 16, format: 'float32' },
      ]
    };

    const particleInstanceLayout: GPUVertexBufferLayout = {
      arrayStride: 48,
      stepMode: 'instance',
      attributes: [
        { shaderLocation: 3, offset: 0, format: 'float32x3' },  // position
        { shaderLocation: 4, offset: 12, format: 'float32x3' }, // velocity
        { shaderLocation: 5, offset: 24, format: 'float32x4' }, // color
        { shaderLocation: 6, offset: 40, format: 'float32' },   // size
        { shaderLocation: 7, offset: 44, format: 'float32' },   // life
      ]
    };

    const bindGroupLayout = this.device.createBindGroupLayout({
      entries: [{
        binding: 0,
        visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
        buffer: { type: 'uniform' }
      }]
    });

    const pipelineLayout = this.device.createPipelineLayout({
      bindGroupLayouts: [bindGroupLayout]
    });

    // Cell pipeline
    this.cellPipeline = this.device.createRenderPipeline({
      layout: pipelineLayout,
      vertex: {
        module: this.device.createShaderModule({ code: shaders.cell }),
        entryPoint: 'vertexMain',
        buffers: [cellInstanceLayout]
      },
      fragment: {
        module: this.device.createShaderModule({ code: shaders.cell }),
        entryPoint: 'fragmentMain',
        targets: [{ format: this.format }]
      },
      primitive: { topology: 'triangle-list', cullMode: 'back' },
      depthStencil: {
        depthWriteEnabled: true,
        depthCompare: 'less',
        format: 'depth24plus'
      }
    });

    // Mine pipeline
    this.minePipeline = this.device.createRenderPipeline({
      layout: pipelineLayout,
      vertex: {
        module: this.device.createShaderModule({ code: shaders.mine }),
        entryPoint: 'vertexMain',
        buffers: [mineInstanceLayout]
      },
      fragment: {
        module: this.device.createShaderModule({ code: shaders.mine }),
        entryPoint: 'fragmentMain',
        targets: [{ format: this.format }]
      },
      primitive: { topology: 'triangle-list' },
      depthStencil: {
        depthWriteEnabled: true,
        depthCompare: 'less',
        format: 'depth24plus'
      }
    });

    // Flag pipeline
    this.flagPipeline = this.device.createRenderPipeline({
      layout: pipelineLayout,
      vertex: {
        module: this.device.createShaderModule({ code: shaders.flag }),
        entryPoint: 'vertexMain',
        buffers: [flagInstanceLayout]
      },
      fragment: {
        module: this.device.createShaderModule({ code: shaders.flag }),
        entryPoint: 'fragmentMain',
        targets: [{ format: this.format }]
      },
      primitive: { topology: 'triangle-list' },
      depthStencil: {
        depthWriteEnabled: true,
        depthCompare: 'less',
        format: 'depth24plus'
      }
    });

    // Number pipeline
    this.numberPipeline = this.device.createRenderPipeline({
      layout: pipelineLayout,
      vertex: {
        module: this.device.createShaderModule({ code: shaders.number }),
        entryPoint: 'vertexMain',
        buffers: [numberInstanceLayout]
      },
      fragment: {
        module: this.device.createShaderModule({ code: shaders.number }),
        entryPoint: 'fragmentMain',
        targets: [{
          format: this.format,
          blend: {
            color: { srcFactor: 'src-alpha', dstFactor: 'one-minus-src-alpha' },
            alpha: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha' }
          }
        }]
      },
      primitive: { topology: 'triangle-list' },
      depthStencil: {
        depthWriteEnabled: false,
        depthCompare: 'less',
        format: 'depth24plus'
      }
    });

    // Grid pipeline
    this.gridPipeline = this.device.createRenderPipeline({
      layout: pipelineLayout,
      vertex: {
        module: this.device.createShaderModule({ code: shaders.grid }),
        entryPoint: 'vertexMain'
      },
      fragment: {
        module: this.device.createShaderModule({ code: shaders.grid }),
        entryPoint: 'fragmentMain',
        targets: [{
          format: this.format,
          blend: {
            color: { srcFactor: 'src-alpha', dstFactor: 'one-minus-src-alpha' },
            alpha: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha' }
          }
        }]
      },
      primitive: { topology: 'triangle-list' },
      depthStencil: {
        depthWriteEnabled: false,
        depthCompare: 'less',
        format: 'depth24plus'
      }
    });

    // Particle pipeline
    this.particlePipeline = this.device.createRenderPipeline({
      layout: pipelineLayout,
      vertex: {
        module: this.device.createShaderModule({ code: shaders.particle }),
        entryPoint: 'vertexMain',
        buffers: [particleInstanceLayout]
      },
      fragment: {
        module: this.device.createShaderModule({ code: shaders.particle }),
        entryPoint: 'fragmentMain',
        targets: [{
          format: this.format,
          blend: {
            color: { srcFactor: 'src-alpha', dstFactor: 'one' },
            alpha: { srcFactor: 'one', dstFactor: 'one' }
          }
        }]
      },
      primitive: { topology: 'triangle-list' },
      depthStencil: {
        depthWriteEnabled: false,
        depthCompare: 'less',
        format: 'depth24plus'
      }
    });

    // Victory pipeline
    this.victoryPipeline = this.device.createRenderPipeline({
      layout: pipelineLayout,
      vertex: {
        module: this.device.createShaderModule({ code: shaders.victory }),
        entryPoint: 'vertexMain'
      },
      fragment: {
        module: this.device.createShaderModule({ code: shaders.victory }),
        entryPoint: 'fragmentMain',
        targets: [{
          format: this.format,
          blend: {
            color: { srcFactor: 'src-alpha', dstFactor: 'one' },
            alpha: { srcFactor: 'one', dstFactor: 'one' }
          }
        }]
      },
      primitive: { topology: 'triangle-list' }
    });

    // Shockwave pipeline
    this.shockwavePipeline = this.device.createRenderPipeline({
      layout: pipelineLayout,
      vertex: {
        module: this.device.createShaderModule({ code: shaders.shockwave }),
        entryPoint: 'vertexMain'
      },
      fragment: {
        module: this.device.createShaderModule({ code: shaders.shockwave }),
        entryPoint: 'fragmentMain',
        targets: [{
          format: this.format,
          blend: {
            color: { srcFactor: 'src-alpha', dstFactor: 'one' },
            alpha: { srcFactor: 'one', dstFactor: 'one' }
          }
        }]
      },
      primitive: { topology: 'triangle-list' },
      depthStencil: {
        depthWriteEnabled: false,
        depthCompare: 'less',
        format: 'depth24plus'
      }
    });
  }

  private createBindGroups(): void {
    const bindGroupLayout = this.cellPipeline.getBindGroupLayout(0);

    this.cellBindGroup = this.device.createBindGroup({
      layout: bindGroupLayout,
      entries: [{ binding: 0, resource: { buffer: this.uniformBuffer } }]
    });

    this.mineBindGroup = this.device.createBindGroup({
      layout: bindGroupLayout,
      entries: [{ binding: 0, resource: { buffer: this.uniformBuffer } }]
    });

    this.flagBindGroup = this.device.createBindGroup({
      layout: bindGroupLayout,
      entries: [{ binding: 0, resource: { buffer: this.uniformBuffer } }]
    });

    this.numberBindGroup = this.device.createBindGroup({
      layout: bindGroupLayout,
      entries: [{ binding: 0, resource: { buffer: this.uniformBuffer } }]
    });

    this.gridBindGroup = this.device.createBindGroup({
      layout: bindGroupLayout,
      entries: [{ binding: 0, resource: { buffer: this.uniformBuffer } }]
    });

    this.particleBindGroup = this.device.createBindGroup({
      layout: bindGroupLayout,
      entries: [{ binding: 0, resource: { buffer: this.uniformBuffer } }]
    });

    this.victoryBindGroup = this.device.createBindGroup({
      layout: bindGroupLayout,
      entries: [{ binding: 0, resource: { buffer: this.victoryUniformBuffer } }]
    });

    this.shockwaveBindGroup = this.device.createBindGroup({
      layout: bindGroupLayout,
      entries: [{ binding: 0, resource: { buffer: this.shockwaveUniformBuffer } }]
    });
  }

  setGridSize(width: number, height: number): void {
    this.gridWidth = width;
    this.gridHeight = height;

    // 初始化揭開進度
    this.revealProgress = [];
    for (let row = 0; row < height; row++) {
      this.revealProgress[row] = [];
      for (let col = 0; col < width; col++) {
        this.revealProgress[row][col] = 0;
      }
    }

    // 調整相機
    const maxDim = Math.max(width, height);
    this.camera.distance = maxDim * 1.2 + 5;
    this.camera.targetX = 0;
    this.camera.targetZ = 0;
  }

  updateCells(cells: CellState[][]): void {
    this.cells = cells;
  }

  setHoverCell(row: number | null, col: number | null): void {
    if (row !== null && col !== null) {
      this.hoverCell = { row, col };
    } else {
      this.hoverCell = null;
    }
  }

  triggerReveal(row: number, col: number): void {
    if (this.revealProgress[row]) {
      this.revealProgress[row][col] = 0.01; // 開始揭開動畫
    }

    // 發射揭開粒子
    const x = col - this.gridWidth / 2 + 0.5;
    const z = row - this.gridHeight / 2 + 0.5;
    const adjacentMines = this.cells[row]?.[col]?.adjacentMines || 0;
    this.particleSystem.emitReveal(x, 0, z, adjacentMines);
  }

  triggerCascade(cells: Array<{ row: number; col: number }>, delay: number = 0): void {
    cells.forEach((cell, index) => {
      const x = cell.col - this.gridWidth / 2 + 0.5;
      const z = cell.row - this.gridHeight / 2 + 0.5;
      this.particleSystem.emitCascade(x, 0, z, delay + index * 0.05);
    });
  }

  triggerExplosion(row: number, col: number): void {
    const x = col - this.gridWidth / 2 + 0.5;
    const z = row - this.gridHeight / 2 + 0.5;

    this.particleSystem.emitExplosion(x, 0, z);

    // 衝擊波
    this.shockwaveCenter = [x, 0, z];
    this.shockwaveProgress = 0;

    // 相機震動
    this.camera.shake = 1.0;
  }

  triggerFlag(row: number, col: number): void {
    const x = col - this.gridWidth / 2 + 0.5;
    const z = row - this.gridHeight / 2 + 0.5;
    this.particleSystem.emitFlag(x, 0, z);
  }

  triggerVictory(): void {
    this.isVictory = true;
    this.victoryProgress = 0;
    this.particleSystem.emitVictory(0, 0, this.gridWidth, this.gridHeight);
  }

  triggerGameOver(minePositions: Array<{ row: number; col: number }>): void {
    const positions = minePositions.map(pos => ({
      x: pos.col - this.gridWidth / 2 + 0.5,
      y: 0,
      z: pos.row - this.gridHeight / 2 + 0.5
    }));
    this.particleSystem.emitGameOver(positions);
  }

  render(canvas: HTMLCanvasElement): void {
    const deltaTime = 1 / 60;
    this.time += deltaTime;

    // 更新粒子
    this.particleSystem.update(deltaTime);

    // 更新揭開動畫
    for (let row = 0; row < this.gridHeight; row++) {
      for (let col = 0; col < this.gridWidth; col++) {
        if (this.revealProgress[row] && this.revealProgress[row][col] > 0 && this.revealProgress[row][col] < 1) {
          this.revealProgress[row][col] = Math.min(1, this.revealProgress[row][col] + deltaTime * 3);
        }
      }
    }

    // 更新衝擊波
    if (this.shockwaveProgress < 1 && this.shockwaveCenter) {
      this.shockwaveProgress += deltaTime * 2;
    }

    // 更新勝利動畫
    if (this.isVictory && this.victoryProgress < 1) {
      this.victoryProgress += deltaTime * 0.5;
    }

    // 更新相機震動
    if (this.camera.shake > 0) {
      this.camera.shake *= 0.9;
    }

    // 計算相機位置
    const shakeX = (Math.random() - 0.5) * this.camera.shake * 0.3;
    const shakeY = (Math.random() - 0.5) * this.camera.shake * 0.3;

    const camX = Math.sin(this.camera.rotationY) * Math.cos(this.camera.rotationX) * this.camera.distance + shakeX;
    const camY = Math.sin(this.camera.rotationX) * this.camera.distance + 5;
    const camZ = Math.cos(this.camera.rotationY) * Math.cos(this.camera.rotationX) * this.camera.distance + shakeY;

    const view = mat4.lookAt(
      [camX + this.camera.targetX, camY, camZ + this.camera.targetZ],
      [this.camera.targetX, 0, this.camera.targetZ],
      [0, 1, 0]
    );

    const aspect = canvas.width / canvas.height;
    const projection = mat4.perspective(Math.PI / 4, aspect, 0.1, 100);
    const viewProjection = mat4.multiply(projection, view);

    // 更新 uniform buffer
    const uniformData = new Float32Array(32);
    uniformData.set(viewProjection, 0);
    uniformData[16] = this.time;
    uniformData[17] = camX + this.camera.targetX;
    uniformData[18] = camY;
    uniformData[19] = camZ + this.camera.targetZ;
    uniformData[20] = this.gridWidth;
    uniformData[21] = this.gridHeight;
    this.device.queue.writeBuffer(this.uniformBuffer, 0, uniformData);

    // 更新 cell instance buffer
    const cellData: number[] = [];
    const mineData: number[] = [];
    const flagData: number[] = [];
    const numberData: number[] = [];

    for (let row = 0; row < this.gridHeight; row++) {
      for (let col = 0; col < this.gridWidth; col++) {
        const cell = this.cells[row]?.[col];
        if (!cell) continue;

        const x = col - this.gridWidth / 2 + 0.5;
        const z = row - this.gridHeight / 2 + 0.5;

        // 計算狀態
        let state = 0;
        if (cell.isRevealed) {
          state = cell.isExploded ? 4 : (cell.isMine ? 3 : 1);
        } else if (cell.isFlagged) {
          state = 2;
        }

        const isHovered = this.hoverCell?.row === row && this.hoverCell?.col === col;
        const hoverIntensity = isHovered ? 1 : 0;
        const revealProg = this.revealProgress[row]?.[col] || 0;

        // Cell instance data
        cellData.push(x, 0, z, state, cell.adjacentMines, revealProg, hoverIntensity, 0);

        // Mine (只有揭開的地雷或遊戲結束)
        if (cell.isMine && (cell.isRevealed || cell.isExploded)) {
          const exploding = cell.isExploded ? 1 : 0;
          mineData.push(x, 0.3, z, 1, exploding, 0);
        }

        // Flag
        if (cell.isFlagged && !cell.isRevealed) {
          flagData.push(x, 0.5, z, 1);
        }

        // Number
        if (cell.isRevealed && !cell.isMine && cell.adjacentMines > 0) {
          numberData.push(x, 0.5, z, cell.adjacentMines, 1);
        }
      }
    }

    this.device.queue.writeBuffer(this.cellInstanceBuffer, 0, new Float32Array(cellData));
    this.device.queue.writeBuffer(this.mineInstanceBuffer, 0, new Float32Array(mineData));
    this.device.queue.writeBuffer(this.flagInstanceBuffer, 0, new Float32Array(flagData));
    this.device.queue.writeBuffer(this.numberInstanceBuffer, 0, new Float32Array(numberData));

    // 更新粒子 buffer
    const particleData = this.particleSystem.getInstanceData();
    this.device.queue.writeBuffer(this.particleInstanceBuffer, 0, particleData);

    // 更新勝利 uniform
    if (this.isVictory) {
      const victoryData = new Float32Array(20);
      victoryData.set(viewProjection, 0);
      victoryData[16] = this.time;
      victoryData[17] = this.victoryProgress;
      this.device.queue.writeBuffer(this.victoryUniformBuffer, 0, victoryData);
    }

    // 更新衝擊波 uniform
    if (this.shockwaveCenter && this.shockwaveProgress < 1) {
      const shockData = new Float32Array(24);
      shockData.set(viewProjection, 0);
      shockData[16] = this.time;
      shockData[17] = this.shockwaveCenter[0];
      shockData[18] = this.shockwaveCenter[1];
      shockData[19] = this.shockwaveCenter[2];
      shockData[20] = this.shockwaveProgress;
      this.device.queue.writeBuffer(this.shockwaveUniformBuffer, 0, shockData);
    }

    // 開始渲染
    const commandEncoder = this.device.createCommandEncoder();
    const textureView = this.context.getCurrentTexture().createView();

    const renderPass = commandEncoder.beginRenderPass({
      colorAttachments: [{
        view: textureView,
        clearValue: { r: 0.02, g: 0.02, b: 0.05, a: 1 },
        loadOp: 'clear',
        storeOp: 'store'
      }],
      depthStencilAttachment: {
        view: this.depthView,
        depthClearValue: 1.0,
        depthLoadOp: 'clear',
        depthStoreOp: 'store'
      }
    });

    // 渲染網格
    renderPass.setPipeline(this.gridPipeline);
    renderPass.setBindGroup(0, this.gridBindGroup);
    renderPass.draw(6);

    // 渲染方塊
    const cellCount = cellData.length / 8;
    if (cellCount > 0) {
      renderPass.setPipeline(this.cellPipeline);
      renderPass.setBindGroup(0, this.cellBindGroup);
      renderPass.setVertexBuffer(0, this.cellInstanceBuffer);
      renderPass.draw(36, cellCount);
    }

    // 渲染地雷
    const mineCount = mineData.length / 6;
    if (mineCount > 0) {
      renderPass.setPipeline(this.minePipeline);
      renderPass.setBindGroup(0, this.mineBindGroup);
      renderPass.setVertexBuffer(0, this.mineInstanceBuffer);
      renderPass.draw(16 * 12 * 2 * 3, mineCount);
    }

    // 渲染旗幟
    const flagCount = flagData.length / 4;
    if (flagCount > 0) {
      renderPass.setPipeline(this.flagPipeline);
      renderPass.setBindGroup(0, this.flagBindGroup);
      renderPass.setVertexBuffer(0, this.flagInstanceBuffer);
      renderPass.draw(18, flagCount);
    }

    // 渲染數字
    const numberCount = numberData.length / 5;
    if (numberCount > 0) {
      renderPass.setPipeline(this.numberPipeline);
      renderPass.setBindGroup(0, this.numberBindGroup);
      renderPass.setVertexBuffer(0, this.numberInstanceBuffer);
      renderPass.draw(6, numberCount);
    }

    // 渲染衝擊波
    if (this.shockwaveCenter && this.shockwaveProgress < 1) {
      renderPass.setPipeline(this.shockwavePipeline);
      renderPass.setBindGroup(0, this.shockwaveBindGroup);
      renderPass.draw(6);
    }

    // 渲染粒子
    const particleCount = this.particleSystem.getParticleCount();
    if (particleCount > 0) {
      renderPass.setPipeline(this.particlePipeline);
      renderPass.setBindGroup(0, this.particleBindGroup);
      renderPass.setVertexBuffer(0, this.particleInstanceBuffer);
      renderPass.draw(6, particleCount);
    }

    renderPass.end();

    // 勝利特效 (單獨 pass，無深度)
    if (this.isVictory && this.victoryProgress < 1) {
      const victoryPass = commandEncoder.beginRenderPass({
        colorAttachments: [{
          view: textureView,
          loadOp: 'load',
          storeOp: 'store'
        }]
      });

      victoryPass.setPipeline(this.victoryPipeline);
      victoryPass.setBindGroup(0, this.victoryBindGroup);
      victoryPass.draw(6);
      victoryPass.end();
    }

    this.device.queue.submit([commandEncoder.finish()]);
  }

  resize(width: number, height: number): void {
    this.createDepthBuffer(width, height);
  }

  rotateCamera(deltaX: number, deltaY: number): void {
    this.camera.rotationY += deltaX * 0.01;
    this.camera.rotationX = Math.max(0.3, Math.min(1.3, this.camera.rotationX + deltaY * 0.01));
  }

  zoomCamera(delta: number): void {
    this.camera.distance = Math.max(5, Math.min(30, this.camera.distance + delta));
  }

  reset(): void {
    this.isVictory = false;
    this.victoryProgress = 0;
    this.shockwaveCenter = null;
    this.shockwaveProgress = 0;
    this.camera.shake = 0;
    this.particleSystem.clear();

    // 重置揭開進度
    for (let row = 0; row < this.gridHeight; row++) {
      for (let col = 0; col < this.gridWidth; col++) {
        if (this.revealProgress[row]) {
          this.revealProgress[row][col] = 0;
        }
      }
    }
  }

  destroy(): void {
    this.uniformBuffer?.destroy();
    this.cellInstanceBuffer?.destroy();
    this.mineInstanceBuffer?.destroy();
    this.flagInstanceBuffer?.destroy();
    this.numberInstanceBuffer?.destroy();
    this.particleInstanceBuffer?.destroy();
    this.victoryUniformBuffer?.destroy();
    this.shockwaveUniformBuffer?.destroy();
    this.depthTexture?.destroy();
  }
}
