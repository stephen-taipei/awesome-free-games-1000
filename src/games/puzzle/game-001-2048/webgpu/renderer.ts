/**
 * WebGPU 3D 渲染引擎
 * 2048 遊戲 3A 級視覺效果核心
 */

import { shaders } from './shaders';
import { ParticleSystem } from './particles';
import { mat4, vec3 } from './math';

export interface TileRenderData {
  id: number;
  value: number;
  row: number;
  col: number;
  isNew: boolean;
  isMerged: boolean;
  animationProgress: number;
}

export interface CameraState {
  position: vec3;
  target: vec3;
  fov: number;
  aspect: number;
  near: number;
  far: number;
}

export class WebGPURenderer {
  private device!: GPUDevice;
  private context!: GPUCanvasContext;
  private canvas: HTMLCanvasElement;

  // 渲染管線
  private tilePipeline!: GPURenderPipeline;
  private gridPipeline!: GPURenderPipeline;
  private bloomPipeline!: GPURenderPipeline;
  private compositePipeline!: GPURenderPipeline;

  // 緩衝區
  private tileVertexBuffer!: GPUBuffer;
  private tileIndexBuffer!: GPUBuffer;
  private tileInstanceBuffer!: GPUBuffer;
  private uniformBuffer!: GPUBuffer;
  private gridVertexBuffer!: GPUBuffer;

  // 紋理
  private depthTexture!: GPUTexture;
  private bloomTexture!: GPUTexture;
  private sceneTexture!: GPUTexture;

  // 綁定組
  private uniformBindGroup!: GPUBindGroup;
  private bloomBindGroup!: GPUBindGroup;

  // 粒子系統
  private particleSystem!: ParticleSystem;

  // 相機
  private camera: CameraState = {
    position: [0, 12, 8],
    target: [0, 0, 0],
    fov: Math.PI / 4,
    aspect: 1,
    near: 0.1,
    far: 100
  };

  // 動畫狀態
  private time = 0;
  private tiles: TileRenderData[] = [];
  private cameraShake = { x: 0, y: 0, z: 0, intensity: 0 };

  // 顏色映射
  private tileColors: Map<number, [number, number, number, number]> = new Map([
    [2, [0.93, 0.89, 0.85, 1.0]],
    [4, [0.93, 0.88, 0.78, 1.0]],
    [8, [0.95, 0.69, 0.47, 1.0]],
    [16, [0.96, 0.58, 0.39, 1.0]],
    [32, [0.96, 0.49, 0.37, 1.0]],
    [64, [0.96, 0.37, 0.23, 1.0]],
    [128, [0.93, 0.81, 0.45, 1.0]],
    [256, [0.93, 0.80, 0.38, 1.0]],
    [512, [0.93, 0.78, 0.31, 1.0]],
    [1024, [0.93, 0.77, 0.25, 1.0]],
    [2048, [0.93, 0.76, 0.18, 1.0]],
  ]);

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
  }

  async init(): Promise<boolean> {
    // 檢查 WebGPU 支援
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

    this.device = await adapter.requestDevice({
      requiredFeatures: [],
      requiredLimits: {}
    });

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
    // 主要方塊渲染管線 - 3D 立體方塊 + PBR 光照
    const tileShaderModule = this.device.createShaderModule({
      code: shaders.tile
    });

    this.tilePipeline = this.device.createRenderPipeline({
      layout: 'auto',
      vertex: {
        module: tileShaderModule,
        entryPoint: 'vertexMain',
        buffers: [
          // 頂點資料
          {
            arrayStride: 32,
            stepMode: 'vertex',
            attributes: [
              { shaderLocation: 0, offset: 0, format: 'float32x3' },  // position
              { shaderLocation: 1, offset: 12, format: 'float32x3' }, // normal
              { shaderLocation: 2, offset: 24, format: 'float32x2' }, // uv
            ]
          },
          // 實例資料
          {
            arrayStride: 48,
            stepMode: 'instance',
            attributes: [
              { shaderLocation: 3, offset: 0, format: 'float32x3' },  // position
              { shaderLocation: 4, offset: 12, format: 'float32x4' }, // color
              { shaderLocation: 5, offset: 28, format: 'float32' },   // scale
              { shaderLocation: 6, offset: 32, format: 'float32' },   // glow
              { shaderLocation: 7, offset: 36, format: 'float32' },   // value
              { shaderLocation: 8, offset: 40, format: 'float32' },   // animProgress
            ]
          }
        ]
      },
      fragment: {
        module: tileShaderModule,
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
        cullMode: 'back',
        frontFace: 'ccw'
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
    // 立體方塊頂點資料 (位置 + 法線 + UV)
    const cubeVertices = this.generateRoundedCubeVertices(0.45, 0.08, 8);
    this.tileVertexBuffer = this.device.createBuffer({
      size: cubeVertices.byteLength,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
      mappedAtCreation: true
    });
    new Float32Array(this.tileVertexBuffer.getMappedRange()).set(cubeVertices);
    this.tileVertexBuffer.unmap();

    // 索引緩衝區
    const cubeIndices = this.generateRoundedCubeIndices(8);
    this.tileIndexBuffer = this.device.createBuffer({
      size: cubeIndices.byteLength,
      usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
      mappedAtCreation: true
    });
    new Uint16Array(this.tileIndexBuffer.getMappedRange()).set(cubeIndices);
    this.tileIndexBuffer.unmap();

    // 實例緩衝區 (最多 16 個方塊)
    this.tileInstanceBuffer = this.device.createBuffer({
      size: 16 * 48, // 48 bytes per instance
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
    });

    // Uniform 緩衝區
    this.uniformBuffer = this.device.createBuffer({
      size: 256, // 對齊到 256 bytes
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

  private generateRoundedCubeVertices(size: number, radius: number, segments: number): Float32Array {
    const vertices: number[] = [];

    // 為了簡化，使用標準立方體加上圓角效果
    const faces = [
      { normal: [0, 1, 0], up: [0, 0, -1], right: [1, 0, 0] },   // top
      { normal: [0, -1, 0], up: [0, 0, 1], right: [1, 0, 0] },   // bottom
      { normal: [1, 0, 0], up: [0, 1, 0], right: [0, 0, -1] },   // right
      { normal: [-1, 0, 0], up: [0, 1, 0], right: [0, 0, 1] },   // left
      { normal: [0, 0, 1], up: [0, 1, 0], right: [1, 0, 0] },    // front
      { normal: [0, 0, -1], up: [0, 1, 0], right: [-1, 0, 0] },  // back
    ];

    const h = size * 0.5; // 調整高度使方塊略扁

    for (const face of faces) {
      const [nx, ny, nz] = face.normal;
      const [ux, uy, uz] = face.up;
      const [rx, ry, rz] = face.right;

      for (let i = 0; i <= segments; i++) {
        for (let j = 0; j <= segments; j++) {
          const u = i / segments;
          const v = j / segments;

          const x = (u - 0.5) * 2 * size;
          const y = (v - 0.5) * 2 * size;

          // 位置
          const px = nx * h + ux * y + rx * x;
          const py = ny * h + uy * y + ry * x;
          const pz = nz * h + uz * y + rz * x;

          vertices.push(px, py, pz);
          vertices.push(nx, ny, nz);
          vertices.push(u, v);
        }
      }
    }

    return new Float32Array(vertices);
  }

  private generateRoundedCubeIndices(segments: number): Uint16Array {
    const indices: number[] = [];
    const vertsPerFace = (segments + 1) * (segments + 1);

    for (let face = 0; face < 6; face++) {
      const offset = face * vertsPerFace;

      for (let i = 0; i < segments; i++) {
        for (let j = 0; j < segments; j++) {
          const a = offset + i * (segments + 1) + j;
          const b = a + 1;
          const c = a + segments + 1;
          const d = c + 1;

          indices.push(a, c, b);
          indices.push(b, c, d);
        }
      }
    }

    return new Uint16Array(indices);
  }

  private generateGridVertices(): Float32Array {
    const vertices: number[] = [];
    const gridSize = 4;
    const cellSize = 1.1;
    const offset = (gridSize - 1) * cellSize / 2;
    const height = -0.5;
    const depth = 0.3;

    // 底板
    const w = gridSize * cellSize + 0.4;
    const hw = w / 2;

    // 底面
    vertices.push(-hw, height - depth, -hw, 0, -1, 0);
    vertices.push(hw, height - depth, -hw, 0, -1, 0);
    vertices.push(hw, height - depth, hw, 0, -1, 0);
    vertices.push(-hw, height - depth, -hw, 0, -1, 0);
    vertices.push(hw, height - depth, hw, 0, -1, 0);
    vertices.push(-hw, height - depth, hw, 0, -1, 0);

    // 頂面
    vertices.push(-hw, height, hw, 0, 1, 0);
    vertices.push(hw, height, hw, 0, 1, 0);
    vertices.push(hw, height, -hw, 0, 1, 0);
    vertices.push(-hw, height, hw, 0, 1, 0);
    vertices.push(hw, height, -hw, 0, 1, 0);
    vertices.push(-hw, height, -hw, 0, 1, 0);

    // 側面
    const addSide = (x1: number, z1: number, x2: number, z2: number, nx: number, nz: number) => {
      vertices.push(x1, height, z1, nx, 0, nz);
      vertices.push(x2, height, z2, nx, 0, nz);
      vertices.push(x2, height - depth, z2, nx, 0, nz);
      vertices.push(x1, height, z1, nx, 0, nz);
      vertices.push(x2, height - depth, z2, nx, 0, nz);
      vertices.push(x1, height - depth, z1, nx, 0, nz);
    };

    addSide(-hw, -hw, hw, -hw, 0, -1);
    addSide(hw, -hw, hw, hw, 1, 0);
    addSide(hw, hw, -hw, hw, 0, 1);
    addSide(-hw, hw, -hw, -hw, -1, 0);

    // 格子凹槽
    for (let i = 0; i < gridSize; i++) {
      for (let j = 0; j < gridSize; j++) {
        const cx = i * cellSize - offset;
        const cz = j * cellSize - offset;
        const s = cellSize * 0.45;
        const d = 0.08;
        const y = height;

        // 凹槽底部
        vertices.push(cx - s, y - d, cz + s, 0, 1, 0);
        vertices.push(cx + s, y - d, cz + s, 0, 1, 0);
        vertices.push(cx + s, y - d, cz - s, 0, 1, 0);
        vertices.push(cx - s, y - d, cz + s, 0, 1, 0);
        vertices.push(cx + s, y - d, cz - s, 0, 1, 0);
        vertices.push(cx - s, y - d, cz - s, 0, 1, 0);
      }
    }

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
      layout: this.tilePipeline.getBindGroupLayout(0),
      entries: [{
        binding: 0,
        resource: { buffer: this.uniformBuffer }
      }]
    });
  }

  updateTiles(tiles: TileRenderData[]) {
    this.tiles = tiles;
  }

  triggerMergeEffect(row: number, col: number, value: number) {
    const cellSize = 1.1;
    const offset = 1.5 * cellSize;
    const x = col * cellSize - offset;
    const z = row * cellSize - offset;

    // 產生粒子爆炸
    const color = this.tileColors.get(value) || [1, 1, 1, 1];
    this.particleSystem.emit(x, 0.5, z, 50, color);

    // 相機震動
    this.cameraShake.intensity = Math.min(value / 512, 1) * 0.15;
  }

  triggerNewTileEffect(row: number, col: number) {
    const cellSize = 1.1;
    const offset = 1.5 * cellSize;
    const x = col * cellSize - offset;
    const z = row * cellSize - offset;

    this.particleSystem.emit(x, 0, z, 15, [1, 1, 1, 0.5]);
  }

  render(deltaTime: number) {
    this.time += deltaTime;

    // 更新相機震動
    if (this.cameraShake.intensity > 0) {
      this.cameraShake.x = (Math.random() - 0.5) * this.cameraShake.intensity;
      this.cameraShake.y = (Math.random() - 0.5) * this.cameraShake.intensity;
      this.cameraShake.z = (Math.random() - 0.5) * this.cameraShake.intensity;
      this.cameraShake.intensity *= 0.9;
    }

    // 更新粒子
    this.particleSystem.update(deltaTime);

    // 更新 uniform
    this.updateUniforms();

    // 更新實例資料
    this.updateInstanceData();

    // 開始渲染
    const commandEncoder = this.device.createCommandEncoder();
    const textureView = this.context.getCurrentTexture().createView();

    const renderPass = commandEncoder.beginRenderPass({
      colorAttachments: [{
        view: textureView,
        clearValue: { r: 0.05, g: 0.05, b: 0.08, a: 1 },
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
    renderPass.draw(12 + 24 + 16 * 6); // 底板 + 側面 + 格子

    // 渲染方塊
    if (this.tiles.length > 0) {
      renderPass.setPipeline(this.tilePipeline);
      renderPass.setBindGroup(0, this.uniformBindGroup);
      renderPass.setVertexBuffer(0, this.tileVertexBuffer);
      renderPass.setVertexBuffer(1, this.tileInstanceBuffer);
      renderPass.setIndexBuffer(this.tileIndexBuffer, 'uint16');

      const indexCount = 6 * 8 * 8 * 6; // 6 faces * segments^2 * 2 tris * 3 indices
      renderPass.drawIndexed(indexCount, this.tiles.length);
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
      this.camera.position[2] + this.cameraShake.z
    ];

    const view = mat4.lookAt(camPos, this.camera.target, [0, 1, 0]);
    const proj = mat4.perspective(
      this.camera.fov,
      this.camera.aspect,
      this.camera.near,
      this.camera.far
    );
    const viewProj = mat4.multiply(proj, view);

    const data = new Float32Array(64);
    data.set(viewProj, 0);
    data.set(view, 16);
    data.set(camPos, 32);
    data[35] = this.time;

    // 光源資訊
    data.set([5, 10, 5], 36); // 主光源位置
    data.set([1.0, 0.95, 0.9], 40); // 主光源顏色
    data.set([-3, 5, -3], 44); // 補光位置
    data.set([0.3, 0.4, 0.6], 48); // 補光顏色（冷色調）

    this.device.queue.writeBuffer(this.uniformBuffer, 0, data);
  }

  private updateInstanceData() {
    if (this.tiles.length === 0) return;

    const cellSize = 1.1;
    const offset = 1.5 * cellSize;
    const data = new Float32Array(this.tiles.length * 12);

    this.tiles.forEach((tile, i) => {
      const baseIdx = i * 12;

      // 位置
      data[baseIdx] = tile.col * cellSize - offset;
      data[baseIdx + 1] = 0;
      data[baseIdx + 2] = tile.row * cellSize - offset;

      // 顏色
      const color = this.tileColors.get(tile.value) || [0.2, 0.2, 0.2, 1];
      data[baseIdx + 3] = color[0];
      data[baseIdx + 4] = color[1];
      data[baseIdx + 5] = color[2];
      data[baseIdx + 6] = color[3];

      // 縮放 (新方塊彈入動畫)
      let scale = 1.0;
      if (tile.isNew && tile.animationProgress < 1) {
        scale = this.easeOutBack(tile.animationProgress);
      } else if (tile.isMerged && tile.animationProgress < 1) {
        scale = 1 + Math.sin(tile.animationProgress * Math.PI) * 0.2;
      }
      data[baseIdx + 7] = scale;

      // 發光強度 (高數值方塊發光更強)
      const glowIntensity = Math.log2(tile.value) / 11;
      data[baseIdx + 8] = glowIntensity;

      // 數值 (用於著色器特效)
      data[baseIdx + 9] = tile.value;

      // 動畫進度
      data[baseIdx + 10] = tile.animationProgress;
    });

    this.device.queue.writeBuffer(this.tileInstanceBuffer, 0, data);
  }

  private easeOutBack(t: number): number {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  }

  resize(width: number, height: number) {
    this.canvas.width = width;
    this.canvas.height = height;
    this.camera.aspect = width / height;

    // 重建深度紋理
    this.depthTexture.destroy();
    this.depthTexture = this.device.createTexture({
      size: { width, height },
      format: 'depth24plus',
      usage: GPUTextureUsage.RENDER_ATTACHMENT
    });
  }

  destroy() {
    this.tileVertexBuffer?.destroy();
    this.tileIndexBuffer?.destroy();
    this.tileInstanceBuffer?.destroy();
    this.uniformBuffer?.destroy();
    this.gridVertexBuffer?.destroy();
    this.depthTexture?.destroy();
    this.particleSystem?.destroy();
  }
}
