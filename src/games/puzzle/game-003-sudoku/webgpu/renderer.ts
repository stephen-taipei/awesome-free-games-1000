/**
 * WebGPU 3D 渲染器 - 數獨
 * 玻璃質感格子、霓虹數字、粒子特效
 */

import { shaders } from './shaders';
import { mat4, vec3, type mat4 as Mat4Type } from './math';
import { ParticleSystem } from './particles';

export interface CellData {
  row: number;
  col: number;
  value: number | null;
  isFixed: boolean;
  isSelected: boolean;
  isHighlighted: boolean;
  isError: boolean;
  notes: Set<number>;
}

export interface CameraState {
  position: [number, number, number];
  target: [number, number, number];
  shake: number;
}

export class WebGPURenderer {
  private canvas: HTMLCanvasElement;
  private device!: GPUDevice;
  private context!: GPUCanvasContext;
  private format!: GPUTextureFormat;

  // 渲染管線
  private cellPipeline!: GPURenderPipeline;
  private gridPipeline!: GPURenderPipeline;

  // 緩衝區
  private cellVertexBuffer!: GPUBuffer;
  private cellIndexBuffer!: GPUBuffer;
  private cellInstanceBuffer!: GPUBuffer;
  private gridVertexBuffer!: GPUBuffer;
  private gridIndexBuffer!: GPUBuffer;
  private uniformBuffer!: GPUBuffer;
  private uniformBindGroup!: GPUBindGroup;

  // 深度緩衝
  private depthTexture!: GPUTexture;
  private depthView!: GPUTextureView;

  // 粒子系統
  private particleSystem!: ParticleSystem;

  // 相機
  private camera: CameraState = {
    position: [4.5, 12, 14],
    target: [4.5, 0, 4.5],
    shake: 0
  };

  // 動畫
  private time = 0;
  private cellAnimations: Map<string, { scale: number; targetScale: number }> = new Map();

  // 常量
  private readonly CELL_SIZE = 0.95;
  private readonly CELL_HEIGHT = 0.3;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
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
      alphaMode: 'premultiplied'
    });

    await this.createResources();
    return true;
  }

  private async createResources() {
    // 創建格子幾何體 (圓角立方體簡化為立方體)
    const { vertices: cellVerts, indices: cellIndices } = this.createRoundedCube();

    this.cellVertexBuffer = this.device.createBuffer({
      size: cellVerts.byteLength,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
    });
    this.device.queue.writeBuffer(this.cellVertexBuffer, 0, cellVerts);

    this.cellIndexBuffer = this.device.createBuffer({
      size: cellIndices.byteLength,
      usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST
    });
    this.device.queue.writeBuffer(this.cellIndexBuffer, 0, cellIndices);

    // 實例緩衝區 (81個格子)
    this.cellInstanceBuffer = this.device.createBuffer({
      size: 81 * 32, // position(3) + color(4) + state(1) + glow(1) + alpha(1) = 10 floats = 40 bytes, 對齊到32
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
    });

    // 背景網格
    const { vertices: gridVerts, indices: gridIndices } = this.createGridMesh();

    this.gridVertexBuffer = this.device.createBuffer({
      size: gridVerts.byteLength,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
    });
    this.device.queue.writeBuffer(this.gridVertexBuffer, 0, gridVerts);

    this.gridIndexBuffer = this.device.createBuffer({
      size: gridIndices.byteLength,
      usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST
    });
    this.device.queue.writeBuffer(this.gridIndexBuffer, 0, gridIndices);

    // Uniform 緩衝區
    this.uniformBuffer = this.device.createBuffer({
      size: 256,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
    });

    // 創建渲染管線
    await this.createPipelines();

    // 創建深度緩衝
    this.createDepthBuffer();

    // 初始化粒子系統
    this.particleSystem = new ParticleSystem(this.device);
    await this.particleSystem.init();
  }

  private createRoundedCube(): { vertices: Float32Array; indices: Uint16Array } {
    const s = this.CELL_SIZE / 2;
    const h = this.CELL_HEIGHT;

    // 簡化的立方體頂點 (position, normal, uv)
    const vertices = new Float32Array([
      // 頂面
      -s, h, -s,  0, 1, 0,  0, 0,
       s, h, -s,  0, 1, 0,  1, 0,
       s, h,  s,  0, 1, 0,  1, 1,
      -s, h,  s,  0, 1, 0,  0, 1,
      // 前面
      -s, 0,  s,  0, 0, 1,  0, 0,
       s, 0,  s,  0, 0, 1,  1, 0,
       s, h,  s,  0, 0, 1,  1, 1,
      -s, h,  s,  0, 0, 1,  0, 1,
      // 後面
       s, 0, -s,  0, 0, -1,  0, 0,
      -s, 0, -s,  0, 0, -1,  1, 0,
      -s, h, -s,  0, 0, -1,  1, 1,
       s, h, -s,  0, 0, -1,  0, 1,
      // 左面
      -s, 0, -s,  -1, 0, 0,  0, 0,
      -s, 0,  s,  -1, 0, 0,  1, 0,
      -s, h,  s,  -1, 0, 0,  1, 1,
      -s, h, -s,  -1, 0, 0,  0, 1,
      // 右面
       s, 0,  s,  1, 0, 0,  0, 0,
       s, 0, -s,  1, 0, 0,  1, 0,
       s, h, -s,  1, 0, 0,  1, 1,
       s, h,  s,  1, 0, 0,  0, 1,
    ]);

    const indices = new Uint16Array([
      0, 1, 2, 0, 2, 3,       // 頂面
      4, 5, 6, 4, 6, 7,       // 前面
      8, 9, 10, 8, 10, 11,    // 後面
      12, 13, 14, 12, 14, 15, // 左面
      16, 17, 18, 16, 18, 19, // 右面
    ]);

    return { vertices, indices };
  }

  private createGridMesh(): { vertices: Float32Array; indices: Uint16Array } {
    // 9x9 底板
    const size = 9;
    const y = -0.05;

    const vertices = new Float32Array([
      0, y, 0,      0, 1, 0,
      size, y, 0,   0, 1, 0,
      size, y, size, 0, 1, 0,
      0, y, size,   0, 1, 0,
    ]);

    const indices = new Uint16Array([0, 1, 2, 0, 2, 3]);

    return { vertices, indices };
  }

  private async createPipelines() {
    // 格子著色器
    const cellShaderModule = this.device.createShaderModule({
      code: shaders.cell
    });

    // 網格著色器
    const gridShaderModule = this.device.createShaderModule({
      code: shaders.grid
    });

    // 綁定組布局
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

    // 格子管線
    this.cellPipeline = this.device.createRenderPipeline({
      layout: pipelineLayout,
      vertex: {
        module: cellShaderModule,
        entryPoint: 'vertexMain',
        buffers: [
          {
            arrayStride: 32,
            stepMode: 'vertex',
            attributes: [
              { shaderLocation: 0, offset: 0, format: 'float32x3' },  // position
              { shaderLocation: 1, offset: 12, format: 'float32x3' }, // normal
              { shaderLocation: 2, offset: 24, format: 'float32x2' }, // uv
            ]
          },
          {
            arrayStride: 40,
            stepMode: 'instance',
            attributes: [
              { shaderLocation: 3, offset: 0, format: 'float32x3' },  // instancePos
              { shaderLocation: 4, offset: 12, format: 'float32x4' }, // color
              { shaderLocation: 5, offset: 28, format: 'float32' },   // state
              { shaderLocation: 6, offset: 32, format: 'float32' },   // glow
              { shaderLocation: 7, offset: 36, format: 'float32' },   // alpha
            ]
          }
        ]
      },
      fragment: {
        module: cellShaderModule,
        entryPoint: 'fragmentMain',
        targets: [{
          format: this.format,
          blend: {
            color: {
              srcFactor: 'src-alpha',
              dstFactor: 'one-minus-src-alpha',
              operation: 'add'
            },
            alpha: {
              srcFactor: 'one',
              dstFactor: 'one-minus-src-alpha',
              operation: 'add'
            }
          }
        }]
      },
      primitive: {
        topology: 'triangle-list',
        cullMode: 'back'
      },
      depthStencil: {
        format: 'depth24plus',
        depthWriteEnabled: true,
        depthCompare: 'less'
      }
    });

    // 網格管線
    this.gridPipeline = this.device.createRenderPipeline({
      layout: pipelineLayout,
      vertex: {
        module: gridShaderModule,
        entryPoint: 'vertexMain',
        buffers: [{
          arrayStride: 24,
          stepMode: 'vertex',
          attributes: [
            { shaderLocation: 0, offset: 0, format: 'float32x3' },
            { shaderLocation: 1, offset: 12, format: 'float32x3' },
          ]
        }]
      },
      fragment: {
        module: gridShaderModule,
        entryPoint: 'fragmentMain',
        targets: [{ format: this.format }]
      },
      primitive: {
        topology: 'triangle-list',
        cullMode: 'back'
      },
      depthStencil: {
        format: 'depth24plus',
        depthWriteEnabled: true,
        depthCompare: 'less'
      }
    });

    // 創建綁定組
    this.uniformBindGroup = this.device.createBindGroup({
      layout: bindGroupLayout,
      entries: [{
        binding: 0,
        resource: { buffer: this.uniformBuffer }
      }]
    });
  }

  private createDepthBuffer() {
    if (this.depthTexture) {
      this.depthTexture.destroy();
    }

    this.depthTexture = this.device.createTexture({
      size: {
        width: this.canvas.width,
        height: this.canvas.height
      },
      format: 'depth24plus',
      usage: GPUTextureUsage.RENDER_ATTACHMENT
    });

    this.depthView = this.depthTexture.createView();
  }

  resize(width: number, height: number) {
    this.canvas.width = width;
    this.canvas.height = height;
    this.createDepthBuffer();
  }

  /**
   * 觸發正確填入特效
   */
  emitCorrectEffect(row: number, col: number) {
    const x = col + 0.5;
    const z = row + 0.5;
    const color: [number, number, number, number] = [0.2, 0.9, 1.0, 1.0];
    this.particleSystem.emitCorrect(x, this.CELL_HEIGHT, z, color);

    // 格子彈跳動畫
    const key = `${row}-${col}`;
    this.cellAnimations.set(key, { scale: 1.2, targetScale: 1.0 });
  }

  /**
   * 觸發提示特效
   */
  emitHintEffect(row: number, col: number) {
    const x = col + 0.5;
    const z = row + 0.5;
    this.particleSystem.emitHint(x, this.CELL_HEIGHT, z);
  }

  /**
   * 觸發錯誤特效
   */
  emitErrorEffect(row: number, col: number) {
    const x = col + 0.5;
    const z = row + 0.5;
    this.particleSystem.emitError(x, this.CELL_HEIGHT, z);
    this.camera.shake = 0.3;
  }

  /**
   * 觸發勝利特效
   */
  emitVictoryEffect() {
    this.particleSystem.emitVictory(4.5, 4.5);
  }

  /**
   * 相機震動
   */
  shakeCamera(intensity: number) {
    this.camera.shake = intensity;
  }

  render(cells: CellData[][], deltaTime: number) {
    this.time += deltaTime;

    // 更新相機震動
    if (this.camera.shake > 0) {
      this.camera.shake *= 0.9;
      if (this.camera.shake < 0.01) this.camera.shake = 0;
    }

    // 更新粒子
    this.particleSystem.update(deltaTime);

    // 更新格子動畫
    this.cellAnimations.forEach((anim, key) => {
      anim.scale += (anim.targetScale - anim.scale) * 0.15;
      if (Math.abs(anim.scale - anim.targetScale) < 0.001) {
        this.cellAnimations.delete(key);
      }
    });

    // 準備實例數據
    const instanceData = new Float32Array(81 * 10);
    let idx = 0;

    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        const cell = cells[row][col];
        const key = `${row}-${col}`;
        const anim = this.cellAnimations.get(key);
        const scale = anim ? anim.scale : 1.0;

        // 位置 (中心偏移)
        instanceData[idx++] = col + 0.5;
        instanceData[idx++] = 0;
        instanceData[idx++] = row + 0.5;

        // 顏色 (根據 3x3 宮格交替)
        const boxIdx = Math.floor(row / 3) * 3 + Math.floor(col / 3);
        const isAlternate = boxIdx % 2 === 0;

        if (isAlternate) {
          instanceData[idx++] = 0.15;
          instanceData[idx++] = 0.15;
          instanceData[idx++] = 0.25;
          instanceData[idx++] = 0.9;
        } else {
          instanceData[idx++] = 0.1;
          instanceData[idx++] = 0.1;
          instanceData[idx++] = 0.2;
          instanceData[idx++] = 0.9;
        }

        // 狀態
        let state = 0;
        if (cell.isSelected) state = 1;
        else if (cell.isHighlighted) state = 2;
        if (cell.isError) state = 3;
        instanceData[idx++] = state;

        // 發光強度
        const glow = cell.isSelected ? 1.5 : (cell.isHighlighted ? 0.8 : 0.3);
        instanceData[idx++] = glow;

        // 透明度
        instanceData[idx++] = 0.95;
      }
    }

    this.device.queue.writeBuffer(this.cellInstanceBuffer, 0, instanceData);

    // 更新 Uniform
    const aspect = this.canvas.width / this.canvas.height;
    const projection = mat4.perspective(Math.PI / 4, aspect, 0.1, 100);

    // 相機位置 + 震動
    const shakeX = (Math.random() - 0.5) * this.camera.shake;
    const shakeY = (Math.random() - 0.5) * this.camera.shake;
    const camPos: [number, number, number] = [
      this.camera.position[0] + shakeX,
      this.camera.position[1] + shakeY,
      this.camera.position[2]
    ];

    const view = mat4.lookAt(camPos, this.camera.target, [0, 1, 0]);
    const viewProj = mat4.multiply(projection, view);

    const uniformData = new Float32Array(64);
    uniformData.set(viewProj, 0);
    uniformData.set(view, 16);
    uniformData.set(camPos, 32);
    uniformData[35] = this.time;

    // 光源
    uniformData[36] = 4.5;
    uniformData[37] = 10;
    uniformData[38] = 10;
    uniformData[40] = 1.0;
    uniformData[41] = 0.95;
    uniformData[42] = 0.9;

    this.device.queue.writeBuffer(this.uniformBuffer, 0, uniformData);

    // 渲染
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

    // 渲染背景網格
    renderPass.setPipeline(this.gridPipeline);
    renderPass.setBindGroup(0, this.uniformBindGroup);
    renderPass.setVertexBuffer(0, this.gridVertexBuffer);
    renderPass.setIndexBuffer(this.gridIndexBuffer, 'uint16');
    renderPass.drawIndexed(6);

    // 渲染格子
    renderPass.setPipeline(this.cellPipeline);
    renderPass.setBindGroup(0, this.uniformBindGroup);
    renderPass.setVertexBuffer(0, this.cellVertexBuffer);
    renderPass.setVertexBuffer(1, this.cellInstanceBuffer);
    renderPass.setIndexBuffer(this.cellIndexBuffer, 'uint16');
    renderPass.drawIndexed(30, 81);

    // 渲染粒子
    this.particleSystem.render(renderPass, this.uniformBindGroup);

    renderPass.end();
    this.device.queue.submit([commandEncoder.finish()]);
  }

  destroy() {
    this.cellVertexBuffer?.destroy();
    this.cellIndexBuffer?.destroy();
    this.cellInstanceBuffer?.destroy();
    this.gridVertexBuffer?.destroy();
    this.gridIndexBuffer?.destroy();
    this.uniformBuffer?.destroy();
    this.depthTexture?.destroy();
    this.particleSystem?.destroy();
  }
}
