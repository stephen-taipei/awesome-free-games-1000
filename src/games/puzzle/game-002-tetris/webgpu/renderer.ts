/**
 * WebGPU 3D 渲染引擎 - 俄羅斯方塊
 * 3A 級視覺效果核心
 */

import { shaders } from './shaders';
import { ParticleSystem } from './particles';
import { mat4, vec3 } from './math';
import type { TetrominoType } from '../game';

export interface BlockData {
  x: number;
  y: number;
  type: TetrominoType;
  isGhost?: boolean;
  isCurrent?: boolean;
  isClearing?: boolean;
  clearProgress?: number;
}

export interface CameraState {
  position: vec3;
  target: vec3;
  fov: number;
  aspect: number;
}

// 方塊顏色 - 霓虹發光風格
const BLOCK_COLORS: Record<TetrominoType, [number, number, number, number]> = {
  I: [0.0, 0.94, 0.94, 1.0],  // 青色
  O: [0.94, 0.94, 0.0, 1.0],  // 黃色
  T: [0.63, 0.0, 0.94, 1.0],  // 紫色
  S: [0.0, 0.94, 0.0, 1.0],   // 綠色
  Z: [0.94, 0.0, 0.0, 1.0],   // 紅色
  J: [0.0, 0.0, 0.94, 1.0],   // 藍色
  L: [0.94, 0.63, 0.0, 1.0],  // 橘色
};

export class WebGPURenderer {
  private device!: GPUDevice;
  private context!: GPUCanvasContext;
  private canvas: HTMLCanvasElement;

  // 渲染管線
  private blockPipeline!: GPURenderPipeline;
  private gridPipeline!: GPURenderPipeline;
  private glowPipeline!: GPURenderPipeline;

  // 緩衝區
  private blockVertexBuffer!: GPUBuffer;
  private blockIndexBuffer!: GPUBuffer;
  private instanceBuffer!: GPUBuffer;
  private uniformBuffer!: GPUBuffer;
  private gridVertexBuffer!: GPUBuffer;

  // 紋理
  private depthTexture!: GPUTexture;
  private glowTexture!: GPUTexture;

  // 綁定組
  private uniformBindGroup!: GPUBindGroup;

  // 粒子系統
  private particleSystem!: ParticleSystem;

  // 相機
  private camera: CameraState = {
    position: [5, 12, 18],
    target: [5, 10, 0],
    fov: Math.PI / 5,
    aspect: 1
  };

  // 狀態
  private time = 0;
  private blocks: BlockData[] = [];
  private clearingRows: Set<number> = new Set();
  private cameraShake = { x: 0, y: 0, intensity: 0 };

  // 遊戲尺寸
  private boardWidth = 10;
  private boardHeight = 20;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
  }

  async init(): Promise<boolean> {
    if (!navigator.gpu) {
      console.error('WebGPU not supported');
      return false;
    }

    const adapter = await navigator.gpu.requestAdapter({
      powerPreference: 'high-performance'
    });

    if (!adapter) {
      console.error('No GPU adapter found');
      return false;
    }

    this.device = await adapter.requestDevice();

    this.context = this.canvas.getContext('webgpu')!;
    const format = navigator.gpu.getPreferredCanvasFormat();

    this.context.configure({
      device: this.device,
      format,
      alphaMode: 'premultiplied'
    });

    this.camera.aspect = this.canvas.width / this.canvas.height;

    await this.createPipelines(format);
    this.createBuffers();
    this.createTextures();
    this.createBindGroups();

    this.particleSystem = new ParticleSystem(this.device);
    await this.particleSystem.init();

    return true;
  }

  private async createPipelines(format: GPUTextureFormat) {
    // 方塊渲染管線
    const blockShaderModule = this.device.createShaderModule({
      code: shaders.block
    });

    this.blockPipeline = this.device.createRenderPipeline({
      layout: 'auto',
      vertex: {
        module: blockShaderModule,
        entryPoint: 'vertexMain',
        buffers: [
          // 頂點資料
          {
            arrayStride: 32,
            stepMode: 'vertex',
            attributes: [
              { shaderLocation: 0, offset: 0, format: 'float32x3' },
              { shaderLocation: 1, offset: 12, format: 'float32x3' },
              { shaderLocation: 2, offset: 24, format: 'float32x2' },
            ]
          },
          // 實例資料
          {
            arrayStride: 48,
            stepMode: 'instance',
            attributes: [
              { shaderLocation: 3, offset: 0, format: 'float32x3' },   // position
              { shaderLocation: 4, offset: 12, format: 'float32x4' },  // color
              { shaderLocation: 5, offset: 28, format: 'float32' },    // scale
              { shaderLocation: 6, offset: 32, format: 'float32' },    // glow
              { shaderLocation: 7, offset: 36, format: 'float32' },    // alpha
              { shaderLocation: 8, offset: 40, format: 'float32' },    // clearProgress
            ]
          }
        ]
      },
      fragment: {
        module: blockShaderModule,
        entryPoint: 'fragmentMain',
        targets: [{
          format,
          blend: {
            color: { srcFactor: 'src-alpha', dstFactor: 'one-minus-src-alpha', operation: 'add' },
            alpha: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' }
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

    // 網格渲染管線
    const gridShaderModule = this.device.createShaderModule({
      code: shaders.grid
    });

    this.gridPipeline = this.device.createRenderPipeline({
      layout: 'auto',
      vertex: {
        module: gridShaderModule,
        entryPoint: 'vertexMain',
        buffers: [{
          arrayStride: 24,
          attributes: [
            { shaderLocation: 0, offset: 0, format: 'float32x3' },
            { shaderLocation: 1, offset: 12, format: 'float32x3' },
          ]
        }]
      },
      fragment: {
        module: gridShaderModule,
        entryPoint: 'fragmentMain',
        targets: [{
          format,
          blend: {
            color: { srcFactor: 'src-alpha', dstFactor: 'one-minus-src-alpha', operation: 'add' },
            alpha: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' }
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
  }

  private createBuffers() {
    // 立方體頂點 (圓角效果)
    const cubeVertices = this.generateBlockVertices(0.45);
    this.blockVertexBuffer = this.device.createBuffer({
      size: cubeVertices.byteLength,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
      mappedAtCreation: true
    });
    new Float32Array(this.blockVertexBuffer.getMappedRange()).set(cubeVertices);
    this.blockVertexBuffer.unmap();

    // 索引緩衝區
    const cubeIndices = this.generateBlockIndices();
    this.blockIndexBuffer = this.device.createBuffer({
      size: cubeIndices.byteLength,
      usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
      mappedAtCreation: true
    });
    new Uint16Array(this.blockIndexBuffer.getMappedRange()).set(cubeIndices);
    this.blockIndexBuffer.unmap();

    // 實例緩衝區 (最多 200 + 4 個方塊)
    this.instanceBuffer = this.device.createBuffer({
      size: 250 * 48,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
    });

    // Uniform 緩衝區
    this.uniformBuffer = this.device.createBuffer({
      size: 256,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
    });

    // 網格頂點
    const gridVertices = this.generateGridVertices();
    this.gridVertexBuffer = this.device.createBuffer({
      size: gridVertices.byteLength,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
      mappedAtCreation: true
    });
    new Float32Array(this.gridVertexBuffer.getMappedRange()).set(gridVertices);
    this.gridVertexBuffer.unmap();
  }

  private generateBlockVertices(size: number): Float32Array {
    const vertices: number[] = [];
    const h = size;

    // 六個面
    const faces = [
      { normal: [0, 0, 1], verts: [[-h, -h, h], [h, -h, h], [h, h, h], [-h, h, h]] },      // front
      { normal: [0, 0, -1], verts: [[h, -h, -h], [-h, -h, -h], [-h, h, -h], [h, h, -h]] }, // back
      { normal: [0, 1, 0], verts: [[-h, h, h], [h, h, h], [h, h, -h], [-h, h, -h]] },      // top
      { normal: [0, -1, 0], verts: [[-h, -h, -h], [h, -h, -h], [h, -h, h], [-h, -h, h]] }, // bottom
      { normal: [1, 0, 0], verts: [[h, -h, h], [h, -h, -h], [h, h, -h], [h, h, h]] },      // right
      { normal: [-1, 0, 0], verts: [[-h, -h, -h], [-h, -h, h], [-h, h, h], [-h, h, -h]] }, // left
    ];

    const uvs = [[0, 1], [1, 1], [1, 0], [0, 0]];

    for (const face of faces) {
      for (let i = 0; i < 4; i++) {
        vertices.push(...face.verts[i], ...face.normal, ...uvs[i]);
      }
    }

    return new Float32Array(vertices);
  }

  private generateBlockIndices(): Uint16Array {
    const indices: number[] = [];
    for (let face = 0; face < 6; face++) {
      const offset = face * 4;
      indices.push(offset, offset + 1, offset + 2);
      indices.push(offset, offset + 2, offset + 3);
    }
    return new Uint16Array(indices);
  }

  private generateGridVertices(): Float32Array {
    const vertices: number[] = [];
    const w = this.boardWidth;
    const h = this.boardHeight;
    const depth = 0.5;
    const z = -depth;

    // 背板
    vertices.push(0, 0, z, 0, 0, 1);
    vertices.push(w, 0, z, 0, 0, 1);
    vertices.push(w, h, z, 0, 0, 1);
    vertices.push(0, 0, z, 0, 0, 1);
    vertices.push(w, h, z, 0, 0, 1);
    vertices.push(0, h, z, 0, 0, 1);

    // 底板
    vertices.push(0, 0, z, 0, -1, 0);
    vertices.push(w, 0, z, 0, -1, 0);
    vertices.push(w, 0, 0.5, 0, -1, 0);
    vertices.push(0, 0, z, 0, -1, 0);
    vertices.push(w, 0, 0.5, 0, -1, 0);
    vertices.push(0, 0, 0.5, 0, -1, 0);

    // 左牆
    vertices.push(0, 0, z, -1, 0, 0);
    vertices.push(0, 0, 0.5, -1, 0, 0);
    vertices.push(0, h, 0.5, -1, 0, 0);
    vertices.push(0, 0, z, -1, 0, 0);
    vertices.push(0, h, 0.5, -1, 0, 0);
    vertices.push(0, h, z, -1, 0, 0);

    // 右牆
    vertices.push(w, 0, 0.5, 1, 0, 0);
    vertices.push(w, 0, z, 1, 0, 0);
    vertices.push(w, h, z, 1, 0, 0);
    vertices.push(w, 0, 0.5, 1, 0, 0);
    vertices.push(w, h, z, 1, 0, 0);
    vertices.push(w, h, 0.5, 1, 0, 0);

    return new Float32Array(vertices);
  }

  private createTextures() {
    this.depthTexture = this.device.createTexture({
      size: { width: this.canvas.width, height: this.canvas.height },
      format: 'depth24plus',
      usage: GPUTextureUsage.RENDER_ATTACHMENT
    });
  }

  private createBindGroups() {
    this.uniformBindGroup = this.device.createBindGroup({
      layout: this.blockPipeline.getBindGroupLayout(0),
      entries: [{
        binding: 0,
        resource: { buffer: this.uniformBuffer }
      }]
    });
  }

  updateBlocks(blocks: BlockData[]) {
    this.blocks = blocks;
  }

  triggerLineClear(rows: number[]) {
    rows.forEach(row => {
      this.clearingRows.add(row);

      // 產生粒子爆炸
      for (let x = 0; x < this.boardWidth; x++) {
        const block = this.blocks.find(b => b.x === x && b.y === row);
        if (block) {
          const color = BLOCK_COLORS[block.type];
          this.particleSystem.emit(x + 0.5, this.boardHeight - row - 0.5, 0.5, 30, color);
        }
      }
    });

    // 相機震動
    this.cameraShake.intensity = Math.min(rows.length * 0.1, 0.4);

    // 延遲清除
    setTimeout(() => {
      rows.forEach(row => this.clearingRows.delete(row));
    }, 300);
  }

  triggerHardDrop(x: number, y: number, type: TetrominoType) {
    const color = BLOCK_COLORS[type];
    this.particleSystem.emit(x + 0.5, this.boardHeight - y - 0.5, 0.5, 20, color);
    this.cameraShake.intensity = 0.15;
  }

  render(deltaTime: number) {
    this.time += deltaTime;

    // 更新相機震動
    if (this.cameraShake.intensity > 0) {
      this.cameraShake.x = (Math.random() - 0.5) * this.cameraShake.intensity;
      this.cameraShake.y = (Math.random() - 0.5) * this.cameraShake.intensity;
      this.cameraShake.intensity *= 0.9;
    }

    // 更新粒子
    this.particleSystem.update(deltaTime);

    // 更新 uniform
    this.updateUniforms();

    // 更新實例資料
    this.updateInstanceData();

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
        view: this.depthTexture.createView(),
        depthClearValue: 1,
        depthLoadOp: 'clear',
        depthStoreOp: 'store'
      }
    });

    // 渲染網格
    renderPass.setPipeline(this.gridPipeline);
    renderPass.setBindGroup(0, this.uniformBindGroup);
    renderPass.setVertexBuffer(0, this.gridVertexBuffer);
    renderPass.draw(24);

    // 渲染方塊
    if (this.blocks.length > 0) {
      renderPass.setPipeline(this.blockPipeline);
      renderPass.setBindGroup(0, this.uniformBindGroup);
      renderPass.setVertexBuffer(0, this.blockVertexBuffer);
      renderPass.setVertexBuffer(1, this.instanceBuffer);
      renderPass.setIndexBuffer(this.blockIndexBuffer, 'uint16');
      renderPass.drawIndexed(36, this.blocks.length);
    }

    // 渲染粒子
    this.particleSystem.render(renderPass, this.uniformBindGroup);

    renderPass.end();

    this.device.queue.submit([commandEncoder.finish()]);
  }

  private updateUniforms() {
    const camPos: vec3 = [
      this.camera.position[0] + this.cameraShake.x,
      this.camera.position[1] + this.cameraShake.y,
      this.camera.position[2]
    ];

    const view = mat4.lookAt(camPos, this.camera.target, [0, 1, 0]);
    const proj = mat4.perspective(this.camera.fov, this.camera.aspect, 0.1, 100);
    const viewProj = mat4.multiply(proj, view);

    const data = new Float32Array(64);
    data.set(viewProj, 0);
    data.set(view, 16);
    data.set(camPos, 32);
    data[35] = this.time;

    // 光源
    data.set([8, 25, 15], 36);
    data.set([1.0, 0.98, 0.95], 40);
    data.set([-3, 15, 10], 44);
    data.set([0.4, 0.5, 0.7], 48);

    this.device.queue.writeBuffer(this.uniformBuffer, 0, data);
  }

  private updateInstanceData() {
    if (this.blocks.length === 0) return;

    const data = new Float32Array(this.blocks.length * 12);

    this.blocks.forEach((block, i) => {
      const baseIdx = i * 12;
      const color = BLOCK_COLORS[block.type];
      const isClearing = this.clearingRows.has(block.y);

      // 位置 (翻轉 Y 軸以匹配遊戲座標)
      data[baseIdx] = block.x + 0.5;
      data[baseIdx + 1] = this.boardHeight - block.y - 0.5;
      data[baseIdx + 2] = 0;

      // 顏色
      data[baseIdx + 3] = color[0];
      data[baseIdx + 4] = color[1];
      data[baseIdx + 5] = color[2];
      data[baseIdx + 6] = color[3];

      // 縮放
      let scale = 1.0;
      if (isClearing) {
        scale = 1.0 + Math.sin(this.time * 20) * 0.1;
      }
      data[baseIdx + 7] = scale;

      // 發光強度
      let glow = block.isCurrent ? 0.8 : 0.3;
      if (isClearing) glow = 1.5;
      data[baseIdx + 8] = glow;

      // 透明度
      let alpha = block.isGhost ? 0.25 : 1.0;
      if (isClearing) alpha = 1.0 - (block.clearProgress || 0);
      data[baseIdx + 9] = alpha;

      // 消除進度
      data[baseIdx + 10] = isClearing ? 1.0 : 0.0;
    });

    this.device.queue.writeBuffer(this.instanceBuffer, 0, data);
  }

  resize(width: number, height: number) {
    this.canvas.width = width;
    this.canvas.height = height;
    this.camera.aspect = width / height;

    this.depthTexture.destroy();
    this.depthTexture = this.device.createTexture({
      size: { width, height },
      format: 'depth24plus',
      usage: GPUTextureUsage.RENDER_ATTACHMENT
    });
  }

  destroy() {
    this.blockVertexBuffer?.destroy();
    this.blockIndexBuffer?.destroy();
    this.instanceBuffer?.destroy();
    this.uniformBuffer?.destroy();
    this.gridVertexBuffer?.destroy();
    this.depthTexture?.destroy();
    this.particleSystem?.destroy();
  }
}
