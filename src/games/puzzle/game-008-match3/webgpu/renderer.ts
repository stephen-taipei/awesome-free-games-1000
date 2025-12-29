/**
 * WebGPU 渲染器 - 三消遊戲
 * WebGPU Renderer for Match-3
 */

import { mat4, vec3, type Mat4, type Vec3 } from './math';
import { boardShader, gemShader, particleShader, timerBarShader, backgroundShader } from './shaders';
import { ParticleSystem, type Particle } from './particles';

// 寶石顏色
const GEM_COLORS: [number, number, number, number][] = [
  [1.0, 0.3, 0.3, 1.0],  // 紅
  [1.0, 0.6, 0.2, 1.0],  // 橙
  [1.0, 0.9, 0.2, 1.0],  // 黃
  [0.3, 0.9, 0.4, 1.0],  // 綠
  [0.3, 0.6, 1.0, 1.0],  // 藍
  [0.7, 0.4, 0.9, 1.0],  // 紫
];

interface GemData {
  row: number;
  col: number;
  type: number;
  x: number;
  y: number;
  scale: number;
  alpha: number;
  isSelected: boolean;
  isMatched: boolean;
}

export class WebGPURenderer {
  private canvas: HTMLCanvasElement;
  private device!: GPUDevice;
  private context!: GPUCanvasContext;
  private format!: GPUTextureFormat;

  // 管線
  private boardPipeline!: GPURenderPipeline;
  private gemPipeline!: GPURenderPipeline;
  private particlePipeline!: GPURenderPipeline;
  private backgroundPipeline!: GPURenderPipeline;

  // 幾何體
  private quadBuffer!: GPUBuffer;
  private cubeBuffer!: GPUBuffer;
  private cubeIndexBuffer!: GPUBuffer;
  private cubeIndexCount = 0;

  // Uniform buffers
  private boardUniformBuffer!: GPUBuffer;
  private gemUniformBuffer!: GPUBuffer;
  private particleUniformBuffer!: GPUBuffer;
  private backgroundUniformBuffer!: GPUBuffer;

  // 實例緩衝
  private gemInstanceBuffer!: GPUBuffer;
  private particleInstanceBuffer!: GPUBuffer;

  // Bind groups
  private boardBindGroup!: GPUBindGroup;
  private gemBindGroup!: GPUBindGroup;
  private particleBindGroup!: GPUBindGroup;
  private backgroundBindGroup!: GPUBindGroup;

  // 粒子系統
  private particleSystem: ParticleSystem;

  // 相機
  private viewMatrix: Mat4;
  private projMatrix: Mat4;
  private vpMatrix: Mat4;

  // 遊戲狀態
  private time = 0;
  private rows = 8;
  private cols = 8;
  private gems: GemData[] = [];
  private gridSize = 1.0;
  private timeProgress = 1.0;

  private initialized = false;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.particleSystem = new ParticleSystem();

    // 初始化矩陣
    this.viewMatrix = mat4.create();
    this.projMatrix = mat4.create();
    this.vpMatrix = mat4.create();

    this.setupCamera();
  }

  private setupCamera(): void {
    // 俯視角度
    const eye: Vec3 = [4, 10, 10];
    const center: Vec3 = [4, 0, 4];
    const up: Vec3 = [0, 1, 0];

    mat4.lookAt(this.viewMatrix, eye, center, up);
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

      this.createGeometry();
      this.createBuffers();
      this.createPipelines();
      this.createBindGroups();

      this.initialized = true;
      return true;
    } catch (e) {
      console.error('WebGPU init failed:', e);
      return false;
    }
  }

  private createGeometry(): void {
    // 四邊形頂點 (position + uv)
    const quadVertices = new Float32Array([
      // pos           uv
      -0.5, -0.5, 0,   0, 1,
       0.5, -0.5, 0,   1, 1,
       0.5,  0.5, 0,   1, 0,
      -0.5, -0.5, 0,   0, 1,
       0.5,  0.5, 0,   1, 0,
      -0.5,  0.5, 0,   0, 0,
    ]);

    this.quadBuffer = this.device.createBuffer({
      size: quadVertices.byteLength,
      usage: GPUBufferUsage.VERTEX,
      mappedAtCreation: true,
    });
    new Float32Array(this.quadBuffer.getMappedRange()).set(quadVertices);
    this.quadBuffer.unmap();

    // 立方體頂點 (position + normal)
    const cubeVertices: number[] = [];
    const cubeIndices: number[] = [];

    // 6個面
    const faces = [
      { normal: [0, 0, 1], positions: [[-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]] },      // 前
      { normal: [0, 0, -1], positions: [[1, -1, -1], [-1, -1, -1], [-1, 1, -1], [1, 1, -1]] }, // 後
      { normal: [0, 1, 0], positions: [[-1, 1, 1], [1, 1, 1], [1, 1, -1], [-1, 1, -1]] },      // 上
      { normal: [0, -1, 0], positions: [[-1, -1, -1], [1, -1, -1], [1, -1, 1], [-1, -1, 1]] }, // 下
      { normal: [1, 0, 0], positions: [[1, -1, 1], [1, -1, -1], [1, 1, -1], [1, 1, 1]] },      // 右
      { normal: [-1, 0, 0], positions: [[-1, -1, -1], [-1, -1, 1], [-1, 1, 1], [-1, 1, -1]] }, // 左
    ];

    let vertexOffset = 0;
    for (const face of faces) {
      for (const pos of face.positions) {
        cubeVertices.push(pos[0] * 0.4, pos[1] * 0.4, pos[2] * 0.4);
        cubeVertices.push(face.normal[0], face.normal[1], face.normal[2]);
      }
      cubeIndices.push(
        vertexOffset, vertexOffset + 1, vertexOffset + 2,
        vertexOffset, vertexOffset + 2, vertexOffset + 3
      );
      vertexOffset += 4;
    }

    this.cubeIndexCount = cubeIndices.length;

    const cubeVertexData = new Float32Array(cubeVertices);
    this.cubeBuffer = this.device.createBuffer({
      size: cubeVertexData.byteLength,
      usage: GPUBufferUsage.VERTEX,
      mappedAtCreation: true,
    });
    new Float32Array(this.cubeBuffer.getMappedRange()).set(cubeVertexData);
    this.cubeBuffer.unmap();

    const cubeIndexData = new Uint16Array(cubeIndices);
    this.cubeIndexBuffer = this.device.createBuffer({
      size: cubeIndexData.byteLength,
      usage: GPUBufferUsage.INDEX,
      mappedAtCreation: true,
    });
    new Uint16Array(this.cubeIndexBuffer.getMappedRange()).set(cubeIndexData);
    this.cubeIndexBuffer.unmap();
  }

  private createBuffers(): void {
    // Uniform buffers
    this.boardUniformBuffer = this.device.createBuffer({
      size: 80, // mat4 + 4 floats
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    this.gemUniformBuffer = this.device.createBuffer({
      size: 80,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    this.particleUniformBuffer = this.device.createBuffer({
      size: 80,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    this.backgroundUniformBuffer = this.device.createBuffer({
      size: 16,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    // 實例緩衝
    const maxGems = 64;
    this.gemInstanceBuffer = this.device.createBuffer({
      size: maxGems * 128, // 每個寶石: mat4 + color + state = 64 + 16 + 16 = 96, 對齊到 128
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });

    const maxParticles = 3000;
    this.particleInstanceBuffer = this.device.createBuffer({
      size: maxParticles * 64,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });
  }

  private createPipelines(): void {
    // 背景管線
    const backgroundModule = this.device.createShaderModule({ code: backgroundShader });
    this.backgroundPipeline = this.device.createRenderPipeline({
      layout: 'auto',
      vertex: {
        module: backgroundModule,
        entryPoint: 'vs_main',
        buffers: [{
          arrayStride: 8,
          attributes: [{ shaderLocation: 0, offset: 0, format: 'float32x2' }],
        }],
      },
      fragment: {
        module: backgroundModule,
        entryPoint: 'fs_main',
        targets: [{ format: this.format }],
      },
      primitive: { topology: 'triangle-list' },
    });

    // 棋盤管線
    const boardModule = this.device.createShaderModule({ code: boardShader });
    this.boardPipeline = this.device.createRenderPipeline({
      layout: 'auto',
      vertex: {
        module: boardModule,
        entryPoint: 'vs_main',
        buffers: [{
          arrayStride: 20,
          attributes: [
            { shaderLocation: 0, offset: 0, format: 'float32x3' },
            { shaderLocation: 1, offset: 12, format: 'float32x2' },
          ],
        }],
      },
      fragment: {
        module: boardModule,
        entryPoint: 'fs_main',
        targets: [{ format: this.format }],
      },
      primitive: { topology: 'triangle-list' },
      depthStencil: {
        depthWriteEnabled: true,
        depthCompare: 'less',
        format: 'depth24plus',
      },
    });

    // 寶石管線
    const gemModule = this.device.createShaderModule({ code: gemShader });
    this.gemPipeline = this.device.createRenderPipeline({
      layout: 'auto',
      vertex: {
        module: gemModule,
        entryPoint: 'vs_main',
        buffers: [{
          arrayStride: 24,
          attributes: [
            { shaderLocation: 0, offset: 0, format: 'float32x3' },
            { shaderLocation: 1, offset: 12, format: 'float32x3' },
          ],
        }],
      },
      fragment: {
        module: gemModule,
        entryPoint: 'fs_main',
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
        depthWriteEnabled: true,
        depthCompare: 'less',
        format: 'depth24plus',
      },
    });

    // 粒子管線
    const particleModule = this.device.createShaderModule({ code: particleShader });
    this.particlePipeline = this.device.createRenderPipeline({
      layout: 'auto',
      vertex: {
        module: particleModule,
        entryPoint: 'vs_main',
        buffers: [{
          arrayStride: 8,
          attributes: [{ shaderLocation: 0, offset: 0, format: 'float32x2' }],
        }],
      },
      fragment: {
        module: particleModule,
        entryPoint: 'fs_main',
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
  }

  private createBindGroups(): void {
    this.boardBindGroup = this.device.createBindGroup({
      layout: this.boardPipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: this.boardUniformBuffer } },
      ],
    });

    this.gemBindGroup = this.device.createBindGroup({
      layout: this.gemPipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: this.gemUniformBuffer } },
        { binding: 1, resource: { buffer: this.gemInstanceBuffer } },
      ],
    });

    this.particleBindGroup = this.device.createBindGroup({
      layout: this.particlePipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: this.particleUniformBuffer } },
        { binding: 1, resource: { buffer: this.particleInstanceBuffer } },
      ],
    });

    this.backgroundBindGroup = this.device.createBindGroup({
      layout: this.backgroundPipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: this.backgroundUniformBuffer } },
      ],
    });
  }

  setGridSize(rows: number, cols: number): void {
    this.rows = rows;
    this.cols = cols;
  }

  updateGems(gems: GemData[]): void {
    this.gems = gems;
  }

  setTimeProgress(progress: number): void {
    this.timeProgress = progress;
  }

  render(deltaTime: number): void {
    if (!this.initialized) return;

    this.time += deltaTime * 0.001;
    this.particleSystem.update(deltaTime);

    // 更新投影矩陣
    const aspect = this.canvas.width / this.canvas.height;
    mat4.perspective(this.projMatrix, Math.PI / 4, aspect, 0.1, 100);
    mat4.multiply(this.vpMatrix, this.projMatrix, this.viewMatrix);

    // 創建深度紋理
    const depthTexture = this.device.createTexture({
      size: [this.canvas.width, this.canvas.height],
      format: 'depth24plus',
      usage: GPUTextureUsage.RENDER_ATTACHMENT,
    });

    const commandEncoder = this.device.createCommandEncoder();
    const textureView = this.context.getCurrentTexture().createView();

    const renderPass = commandEncoder.beginRenderPass({
      colorAttachments: [{
        view: textureView,
        clearValue: { r: 0.02, g: 0.02, b: 0.05, a: 1 },
        loadOp: 'clear',
        storeOp: 'store',
      }],
      depthStencilAttachment: {
        view: depthTexture.createView(),
        depthClearValue: 1.0,
        depthLoadOp: 'clear',
        depthStoreOp: 'store',
      },
    });

    // 渲染背景
    this.renderBackground(renderPass);

    // 渲染棋盤
    this.renderBoard(renderPass);

    // 渲染寶石
    this.renderGems(renderPass);

    // 渲染粒子
    this.renderParticles(renderPass);

    renderPass.end();

    this.device.queue.submit([commandEncoder.finish()]);
    depthTexture.destroy();
  }

  private renderBackground(pass: GPURenderPassEncoder): void {
    // 全屏四邊形
    const fullscreenQuad = new Float32Array([
      -1, -1,  1, -1,  1, 1,
      -1, -1,  1, 1,  -1, 1,
    ]);

    const buffer = this.device.createBuffer({
      size: fullscreenQuad.byteLength,
      usage: GPUBufferUsage.VERTEX,
      mappedAtCreation: true,
    });
    new Float32Array(buffer.getMappedRange()).set(fullscreenQuad);
    buffer.unmap();

    // 更新 uniform
    const uniformData = new Float32Array([this.canvas.width, this.canvas.height, this.time, 0]);
    this.device.queue.writeBuffer(this.backgroundUniformBuffer, 0, uniformData);

    pass.setPipeline(this.backgroundPipeline);
    pass.setBindGroup(0, this.backgroundBindGroup);
    pass.setVertexBuffer(0, buffer);
    pass.draw(6);

    buffer.destroy();
  }

  private renderBoard(pass: GPURenderPassEncoder): void {
    // 創建棋盤頂點
    const boardVertices = new Float32Array([
      // pos                                              uv
      0, 0, 0,                                            0, 0,
      this.cols * this.gridSize, 0, 0,                    1, 0,
      this.cols * this.gridSize, 0, this.rows * this.gridSize, 1, 1,
      0, 0, 0,                                            0, 0,
      this.cols * this.gridSize, 0, this.rows * this.gridSize, 1, 1,
      0, 0, this.rows * this.gridSize,                    0, 1,
    ]);

    const boardBuffer = this.device.createBuffer({
      size: boardVertices.byteLength,
      usage: GPUBufferUsage.VERTEX,
      mappedAtCreation: true,
    });
    new Float32Array(boardBuffer.getMappedRange()).set(boardVertices);
    boardBuffer.unmap();

    // 更新 uniform
    const uniformData = new Float32Array(20);
    uniformData.set(this.vpMatrix, 0);
    uniformData[16] = this.time;
    uniformData[17] = this.gridSize;
    uniformData[18] = this.rows;
    uniformData[19] = this.cols;
    this.device.queue.writeBuffer(this.boardUniformBuffer, 0, uniformData);

    pass.setPipeline(this.boardPipeline);
    pass.setBindGroup(0, this.boardBindGroup);
    pass.setVertexBuffer(0, boardBuffer);
    pass.draw(6);

    boardBuffer.destroy();
  }

  private renderGems(pass: GPURenderPassEncoder): void {
    if (this.gems.length === 0) return;

    // 更新 uniform
    const uniformData = new Float32Array(20);
    uniformData.set(this.vpMatrix, 0);
    uniformData[16] = this.time;
    this.device.queue.writeBuffer(this.gemUniformBuffer, 0, uniformData);

    // 更新實例數據
    const instanceData = new Float32Array(this.gems.length * 32); // 128 bytes per gem

    for (let i = 0; i < this.gems.length; i++) {
      const gem = this.gems[i];
      const offset = i * 32;

      // 模型矩陣
      const modelMatrix = mat4.create();
      mat4.identity(modelMatrix);
      mat4.translate(modelMatrix, modelMatrix, [
        gem.x * this.gridSize + this.gridSize * 0.5,
        0.5,
        gem.y * this.gridSize + this.gridSize * 0.5
      ]);

      instanceData.set(modelMatrix, offset);

      // 顏色
      const color = GEM_COLORS[gem.type] || GEM_COLORS[0];
      instanceData[offset + 16] = color[0];
      instanceData[offset + 17] = color[1];
      instanceData[offset + 18] = color[2];
      instanceData[offset + 19] = color[3];

      // 狀態
      instanceData[offset + 20] = gem.isSelected ? 1.0 : 0.0;
      instanceData[offset + 21] = gem.isMatched ? 1.0 : 0.0;
      instanceData[offset + 22] = gem.scale;
      instanceData[offset + 23] = gem.alpha;
    }

    this.device.queue.writeBuffer(this.gemInstanceBuffer, 0, instanceData);

    pass.setPipeline(this.gemPipeline);
    pass.setBindGroup(0, this.gemBindGroup);
    pass.setVertexBuffer(0, this.cubeBuffer);
    pass.setIndexBuffer(this.cubeIndexBuffer, 'uint16');
    pass.drawIndexed(this.cubeIndexCount, this.gems.length);
  }

  private renderParticles(pass: GPURenderPassEncoder): void {
    const particles = this.particleSystem.getParticles();
    if (particles.length === 0) return;

    // 粒子四邊形
    const particleQuad = new Float32Array([
      -1, -1,  1, -1,  1, 1,
      -1, -1,  1, 1,  -1, 1,
    ]);

    const quadBuffer = this.device.createBuffer({
      size: particleQuad.byteLength,
      usage: GPUBufferUsage.VERTEX,
      mappedAtCreation: true,
    });
    new Float32Array(quadBuffer.getMappedRange()).set(particleQuad);
    quadBuffer.unmap();

    // 更新 uniform
    const uniformData = new Float32Array(20);
    uniformData.set(this.vpMatrix, 0);
    uniformData[16] = this.time;
    this.device.queue.writeBuffer(this.particleUniformBuffer, 0, uniformData);

    // 更新粒子實例
    const typeMap: { [key: string]: number } = {
      'star': 0,
      'explosion': 1,
      'trail': 2,
      'combo': 3,
      'sparkle': 4,
      'cascade': 5,
      'score': 6,
    };

    const instanceData = new Float32Array(particles.length * 16);
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      const offset = i * 16;

      instanceData[offset + 0] = p.x;
      instanceData[offset + 1] = p.y;
      instanceData[offset + 2] = p.z;
      instanceData[offset + 3] = p.life;
      instanceData[offset + 4] = p.vx;
      instanceData[offset + 5] = p.vy;
      instanceData[offset + 6] = p.vz;
      instanceData[offset + 7] = p.size;
      instanceData[offset + 8] = p.color[0];
      instanceData[offset + 9] = p.color[1];
      instanceData[offset + 10] = p.color[2];
      instanceData[offset + 11] = p.color[3];
      instanceData[offset + 12] = typeMap[p.type] || 0;
      instanceData[offset + 13] = p.rotation;
      instanceData[offset + 14] = p.rotationSpeed;
      instanceData[offset + 15] = p.maxLife;
    }

    this.device.queue.writeBuffer(this.particleInstanceBuffer, 0, instanceData);

    pass.setPipeline(this.particlePipeline);
    pass.setBindGroup(0, this.particleBindGroup);
    pass.setVertexBuffer(0, quadBuffer);
    pass.draw(6, particles.length);

    quadBuffer.destroy();
  }

  // 粒子效果接口
  emitMatch(row: number, col: number, gemType: number): void {
    const x = col * this.gridSize + this.gridSize * 0.5;
    const y = 0.5;
    const z = row * this.gridSize + this.gridSize * 0.5;
    this.particleSystem.emitMatch(x, y, z, gemType);
  }

  emitSwapTrail(fromRow: number, fromCol: number, toRow: number, toCol: number, gemType: number): void {
    const fromX = fromCol * this.gridSize + this.gridSize * 0.5;
    const fromY = fromRow * this.gridSize + this.gridSize * 0.5;
    const toX = toCol * this.gridSize + this.gridSize * 0.5;
    const toY = toRow * this.gridSize + this.gridSize * 0.5;
    this.particleSystem.emitSwapTrail(fromX, fromY, toX, toY, gemType);
  }

  emitCascade(row: number, col: number, cascadeLevel: number): void {
    const x = col * this.gridSize + this.gridSize * 0.5;
    const y = 0.5;
    const z = row * this.gridSize + this.gridSize * 0.5;
    this.particleSystem.emitCascade(x, y, z, cascadeLevel);
  }

  emitCombo(comboCount: number): void {
    const centerX = (this.cols / 2) * this.gridSize;
    const centerY = (this.rows / 2) * this.gridSize;
    this.particleSystem.emitCombo(centerX, 0.5, comboCount);
  }

  emitSelect(row: number, col: number, gemType: number): void {
    const x = col * this.gridSize + this.gridSize * 0.5;
    const y = 0.5;
    this.particleSystem.emitSelect(x, y, gemType);
  }

  emitFall(row: number, col: number, gemType: number): void {
    const x = col * this.gridSize + this.gridSize * 0.5;
    const y = 0.5;
    this.particleSystem.emitFall(x, y, gemType);
  }

  emitGameOver(): void {
    const centerX = (this.cols / 2) * this.gridSize;
    const centerY = (this.rows / 2) * this.gridSize;
    this.particleSystem.emitGameOver(centerX, centerY);
  }

  emitHighScore(): void {
    const centerX = (this.cols / 2) * this.gridSize;
    const centerY = (this.rows / 2) * this.gridSize;
    this.particleSystem.emitHighScore(centerX, centerY);
  }

  clearParticles(): void {
    this.particleSystem.clear();
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  destroy(): void {
    if (this.quadBuffer) this.quadBuffer.destroy();
    if (this.cubeBuffer) this.cubeBuffer.destroy();
    if (this.cubeIndexBuffer) this.cubeIndexBuffer.destroy();
    if (this.boardUniformBuffer) this.boardUniformBuffer.destroy();
    if (this.gemUniformBuffer) this.gemUniformBuffer.destroy();
    if (this.particleUniformBuffer) this.particleUniformBuffer.destroy();
    if (this.backgroundUniformBuffer) this.backgroundUniformBuffer.destroy();
    if (this.gemInstanceBuffer) this.gemInstanceBuffer.destroy();
    if (this.particleInstanceBuffer) this.particleInstanceBuffer.destroy();
    this.initialized = false;
  }
}
