/**
 * WebGPU 3D 渲染器 - 拼圖遊戲
 * Main renderer for Jigsaw puzzle
 */

import { mat4, vec3 } from './math';
import { shaders } from './shaders';
import { ParticleSystem, Particle } from './particles';

export interface PieceState {
  id: number;
  row: number;
  col: number;
  currentX: number;
  currentY: number;
  targetX: number;
  targetY: number;
  width: number;
  height: number;
  uvOffsetX: number;
  uvOffsetY: number;
  uvScaleX: number;
  uvScaleY: number;
  edges: { top: number; right: number; bottom: number; left: number };
  isLocked: boolean;
  isSelected: boolean;
  isHovered: boolean;
}

export interface CameraState {
  rotationX: number;
  rotationY: number;
  zoom: number;
  targetRotationX: number;
  targetRotationY: number;
  targetZoom: number;
}

export class WebGPURenderer {
  private device!: GPUDevice;
  private context!: GPUCanvasContext;
  private format!: GPUTextureFormat;

  // 渲染管線
  private piecePipeline!: GPURenderPipeline;
  private backgroundPipeline!: GPURenderPipeline;
  private particlePipeline!: GPURenderPipeline;
  private victoryPipeline!: GPURenderPipeline;

  // 緩衝區
  private quadVertexBuffer!: GPUBuffer;
  private particleVertexBuffer!: GPUBuffer;

  // Uniform 緩衝區
  private cameraUniformBuffer!: GPUBuffer;
  private pieceUniformBuffer!: GPUBuffer;
  private backgroundUniformBuffer!: GPUBuffer;
  private particleUniformBuffer!: GPUBuffer;
  private victoryUniformBuffer!: GPUBuffer;

  // 紋理
  private puzzleTexture: GPUTexture | null = null;
  private puzzleTextureView: GPUTextureView | null = null;
  private sampler!: GPUSampler;

  // 綁定組佈局
  private pieceBindGroupLayout!: GPUBindGroupLayout;
  private backgroundBindGroupLayout!: GPUBindGroupLayout;
  private particleBindGroupLayout!: GPUBindGroupLayout;
  private victoryBindGroupLayout!: GPUBindGroupLayout;

  // 綁定組
  private backgroundBindGroup!: GPUBindGroup;
  private particleBindGroup!: GPUBindGroup;
  private victoryBindGroup!: GPUBindGroup;

  // 深度紋理
  private depthTexture!: GPUTexture;
  private depthTextureView!: GPUTextureView;

  // 粒子系統
  public particleSystem: ParticleSystem;

  // 狀態
  private pieces: PieceState[] = [];
  private camera: CameraState = {
    rotationX: 0.4,
    rotationY: 0,
    zoom: 1.0,
    targetRotationX: 0.4,
    targetRotationY: 0,
    targetZoom: 1.0,
  };

  private time: number = 0;
  private isVictory: boolean = false;
  private victoryTime: number = 0;
  private gridRows: number = 3;
  private gridCols: number = 3;
  private puzzleWidth: number = 4;
  private puzzleHeight: number = 3;
  private puzzleOffsetX: number = -2;
  private puzzleOffsetZ: number = -1.5;

  private canvas: HTMLCanvasElement;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.particleSystem = new ParticleSystem();
  }

  async init(): Promise<boolean> {
    return this.initialize(this.canvas);
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
    this.createSampler();
    this.createPipelines();
    this.createDepthTexture(canvas.width, canvas.height);

    return true;
  }

  private createBuffers(): void {
    // 四邊形頂點：位置(3) + 法線(3) + UV(2)
    const quadVertices = new Float32Array([
      0, 0, 0,   0, 1, 0,   0, 0,
      1, 0, 0,   0, 1, 0,   1, 0,
      1, 0, 1,   0, 1, 0,   1, 1,
      0, 0, 0,   0, 1, 0,   0, 0,
      1, 0, 1,   0, 1, 0,   1, 1,
      0, 0, 1,   0, 1, 0,   0, 1,
    ]);

    this.quadVertexBuffer = this.device.createBuffer({
      size: quadVertices.byteLength,
      usage: GPUBufferUsage.VERTEX,
      mappedAtCreation: true,
    });
    new Float32Array(this.quadVertexBuffer.getMappedRange()).set(quadVertices);
    this.quadVertexBuffer.unmap();

    // 粒子頂點緩衝區
    this.particleVertexBuffer = this.device.createBuffer({
      size: 3000 * 20 * 4,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });

    // Uniform 緩衝區
    this.cameraUniformBuffer = this.device.createBuffer({
      size: 128,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    this.pieceUniformBuffer = this.device.createBuffer({
      size: 128,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    this.backgroundUniformBuffer = this.device.createBuffer({
      size: 64,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    this.particleUniformBuffer = this.device.createBuffer({
      size: 128,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    this.victoryUniformBuffer = this.device.createBuffer({
      size: 32,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
  }

  private createSampler(): void {
    this.sampler = this.device.createSampler({
      magFilter: 'linear',
      minFilter: 'linear',
      mipmapFilter: 'linear',
      addressModeU: 'clamp-to-edge',
      addressModeV: 'clamp-to-edge',
    });
  }

  private createPipelines(): void {
    // 綁定組佈局
    this.pieceBindGroupLayout = this.device.createBindGroupLayout({
      entries: [
        { binding: 0, visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT, buffer: { type: 'uniform' } },
        { binding: 1, visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT, buffer: { type: 'uniform' } },
        { binding: 2, visibility: GPUShaderStage.FRAGMENT, sampler: { type: 'filtering' } },
        { binding: 3, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: 'float' } },
      ],
    });

    this.backgroundBindGroupLayout = this.device.createBindGroupLayout({
      entries: [
        { binding: 0, visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT, buffer: { type: 'uniform' } },
        { binding: 1, visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT, buffer: { type: 'uniform' } },
      ],
    });

    this.particleBindGroupLayout = this.device.createBindGroupLayout({
      entries: [
        { binding: 0, visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT, buffer: { type: 'uniform' } },
      ],
    });

    this.victoryBindGroupLayout = this.device.createBindGroupLayout({
      entries: [
        { binding: 0, visibility: GPUShaderStage.FRAGMENT, buffer: { type: 'uniform' } },
      ],
    });

    // 頂點佈局
    const vertexLayout: GPUVertexBufferLayout = {
      arrayStride: 32,
      attributes: [
        { shaderLocation: 0, offset: 0, format: 'float32x3' },
        { shaderLocation: 1, offset: 12, format: 'float32x3' },
        { shaderLocation: 2, offset: 24, format: 'float32x2' },
      ],
    };

    // 拼圖片管線
    const pieceModule = this.device.createShaderModule({ code: shaders.piece });
    this.piecePipeline = this.device.createRenderPipeline({
      layout: this.device.createPipelineLayout({ bindGroupLayouts: [this.pieceBindGroupLayout] }),
      vertex: {
        module: pieceModule,
        entryPoint: 'vertexMain',
        buffers: [vertexLayout],
      },
      fragment: {
        module: pieceModule,
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

    // 背景管線
    const backgroundModule = this.device.createShaderModule({ code: shaders.background });
    this.backgroundPipeline = this.device.createRenderPipeline({
      layout: this.device.createPipelineLayout({ bindGroupLayouts: [this.backgroundBindGroupLayout] }),
      vertex: {
        module: backgroundModule,
        entryPoint: 'vertexMain',
        buffers: [vertexLayout],
      },
      fragment: {
        module: backgroundModule,
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

    // 背景綁定組
    this.backgroundBindGroup = this.device.createBindGroup({
      layout: this.backgroundBindGroupLayout,
      entries: [
        { binding: 0, resource: { buffer: this.cameraUniformBuffer } },
        { binding: 1, resource: { buffer: this.backgroundUniformBuffer } },
      ],
    });

    // 粒子管線
    const particleModule = this.device.createShaderModule({ code: shaders.particle });
    this.particlePipeline = this.device.createRenderPipeline({
      layout: this.device.createPipelineLayout({ bindGroupLayouts: [this.particleBindGroupLayout] }),
      vertex: {
        module: particleModule,
        entryPoint: 'vertexMain',
        buffers: [{
          arrayStride: 36,
          stepMode: 'instance',
          attributes: [
            { shaderLocation: 0, offset: 0, format: 'float32x3' },
            { shaderLocation: 1, offset: 12, format: 'float32x4' },
            { shaderLocation: 2, offset: 28, format: 'float32' },
            { shaderLocation: 3, offset: 32, format: 'float32' },
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
      layout: this.particleBindGroupLayout,
      entries: [
        { binding: 0, resource: { buffer: this.particleUniformBuffer } },
      ],
    });

    // 勝利管線
    const victoryModule = this.device.createShaderModule({ code: shaders.victory });
    this.victoryPipeline = this.device.createRenderPipeline({
      layout: this.device.createPipelineLayout({ bindGroupLayouts: [this.victoryBindGroupLayout] }),
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
      layout: this.victoryBindGroupLayout,
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

  async loadTexture(image: HTMLImageElement): Promise<void> {
    if (this.puzzleTexture) {
      this.puzzleTexture.destroy();
    }

    this.puzzleTexture = this.device.createTexture({
      size: [image.width, image.height],
      format: 'rgba8unorm',
      usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
    });

    this.device.queue.copyExternalImageToTexture(
      { source: image },
      { texture: this.puzzleTexture },
      [image.width, image.height]
    );

    this.puzzleTextureView = this.puzzleTexture.createView();
  }

  resize(width: number, height: number): void {
    this.createDepthTexture(width, height);
  }

  setGrid(rows: number, cols: number, puzzleWidth: number, puzzleHeight: number): void {
    this.gridRows = rows;
    this.gridCols = cols;
    this.puzzleWidth = puzzleWidth;
    this.puzzleHeight = puzzleHeight;
    this.puzzleOffsetX = -puzzleWidth / 2;
    this.puzzleOffsetZ = -puzzleHeight / 2;
  }

  updatePieces(pieces: PieceState[]): void {
    this.pieces = pieces;
  }

  setVictory(value: boolean): void {
    if (value && !this.isVictory) {
      this.victoryTime = this.time;
      this.particleSystem.emitVictory(0, 0);
    }
    this.isVictory = value;
  }

  rotateCamera(deltaX: number, deltaY: number): void {
    this.camera.targetRotationY += deltaX;
    this.camera.targetRotationX = Math.max(-0.2, Math.min(1.2, this.camera.targetRotationX + deltaY));
  }

  zoomCamera(delta: number): void {
    this.camera.targetZoom = Math.max(0.5, Math.min(2.5, this.camera.targetZoom + delta));
  }

  render(deltaTime: number): void {
    if (!this.puzzleTextureView) return;

    this.time += deltaTime * 0.001;

    // 更新相機
    this.camera.rotationX += (this.camera.targetRotationX - this.camera.rotationX) * 0.1;
    this.camera.rotationY += (this.camera.targetRotationY - this.camera.rotationY) * 0.1;
    this.camera.zoom += (this.camera.targetZoom - this.camera.zoom) * 0.1;

    // 更新粒子
    this.particleSystem.update(deltaTime);

    // 勝利時持續發射閃光
    if (this.isVictory) {
      this.particleSystem.emitVictorySparkles(0, 0, this.puzzleWidth * 0.6);
    }

    const commandEncoder = this.device.createCommandEncoder();
    const textureView = this.context.getCurrentTexture().createView();

    const renderPass = commandEncoder.beginRenderPass({
      colorAttachments: [{
        view: textureView,
        clearValue: { r: 0.05, g: 0.05, b: 0.08, a: 1.0 },
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
    const canvas = this.context.canvas as HTMLCanvasElement;
    const aspect = canvas.width / canvas.height;
    const projection = mat4.perspective(Math.PI / 4, aspect, 0.1, 100);

    const cameraDistance = 8 / this.camera.zoom;
    const eyeX = Math.sin(this.camera.rotationY) * Math.cos(this.camera.rotationX) * cameraDistance;
    const eyeY = Math.sin(this.camera.rotationX) * cameraDistance + 2;
    const eyeZ = Math.cos(this.camera.rotationY) * Math.cos(this.camera.rotationX) * cameraDistance;

    const view = mat4.lookAt([eyeX, eyeY, eyeZ], [0, 0, 0], [0, 1, 0]);
    const viewProjection = mat4.multiply(projection, view);

    // 更新相機 uniform
    const cameraData = new Float32Array(24);
    cameraData.set(viewProjection, 0);
    cameraData[16] = eyeX;
    cameraData[17] = eyeY;
    cameraData[18] = eyeZ;
    cameraData[19] = this.time;
    this.device.queue.writeBuffer(this.cameraUniformBuffer, 0, cameraData);

    // 計算完成度
    const lockedCount = this.pieces.filter(p => p.isLocked).length;
    const completionRatio = this.pieces.length > 0 ? lockedCount / this.pieces.length : 0;

    // 渲染背景
    const bgData = new Float32Array([
      this.puzzleOffsetX, this.puzzleOffsetZ,
      this.puzzleWidth, this.puzzleHeight,
      this.gridCols, this.gridRows,
      completionRatio, 0,
    ]);
    this.device.queue.writeBuffer(this.backgroundUniformBuffer, 0, bgData);

    renderPass.setPipeline(this.backgroundPipeline);
    renderPass.setBindGroup(0, this.backgroundBindGroup);
    renderPass.setVertexBuffer(0, this.quadVertexBuffer);
    renderPass.draw(6);

    // 渲染拼圖片（先渲染已鎖定的，再渲染未鎖定的）
    const sortedPieces = [...this.pieces].sort((a, b) => {
      if (a.isLocked && !b.isLocked) return -1;
      if (!a.isLocked && b.isLocked) return 1;
      if (a.isSelected) return 1;
      if (b.isSelected) return -1;
      return 0;
    });

    renderPass.setPipeline(this.piecePipeline);
    renderPass.setVertexBuffer(0, this.quadVertexBuffer);

    for (const piece of sortedPieces) {
      // 創建 piece 綁定組
      const pieceBindGroup = this.device.createBindGroup({
        layout: this.pieceBindGroupLayout,
        entries: [
          { binding: 0, resource: { buffer: this.cameraUniformBuffer } },
          { binding: 1, resource: { buffer: this.pieceUniformBuffer } },
          { binding: 2, resource: this.sampler },
          { binding: 3, resource: this.puzzleTextureView! },
        ],
      });

      // 轉換座標
      const worldX = this.puzzleOffsetX + piece.currentX * (this.puzzleWidth / this.gridCols);
      const worldZ = this.puzzleOffsetZ + piece.currentY * (this.puzzleHeight / this.gridRows);
      const pieceW = this.puzzleWidth / this.gridCols;
      const pieceH = this.puzzleHeight / this.gridRows;

      const targetWorldX = this.puzzleOffsetX + piece.targetX * pieceW;
      const targetWorldZ = this.puzzleOffsetZ + piece.targetY * pieceH;

      // 更新 piece uniform
      const pieceData = new Float32Array(24);
      pieceData[0] = worldX;
      pieceData[1] = worldZ;
      pieceData[2] = targetWorldX;
      pieceData[3] = targetWorldZ;
      pieceData[4] = pieceW;
      pieceData[5] = pieceH;
      pieceData[6] = piece.uvOffsetX;
      pieceData[7] = piece.uvOffsetY;
      pieceData[8] = piece.uvScaleX;
      pieceData[9] = piece.uvScaleY;
      pieceData[10] = piece.edges.top;
      pieceData[11] = piece.edges.right;
      pieceData[12] = piece.edges.bottom;
      pieceData[13] = piece.edges.left;
      pieceData[14] = piece.isLocked ? 1 : 0;
      pieceData[15] = piece.isSelected ? 1 : 0;
      pieceData[16] = piece.isHovered ? 1 : 0;
      pieceData[17] = piece.isSelected ? 0.1 : 0;

      this.device.queue.writeBuffer(this.pieceUniformBuffer, 0, pieceData);

      renderPass.setBindGroup(0, pieceBindGroup);
      renderPass.draw(6);
    }

    // 渲染粒子
    const particles = this.particleSystem.getParticles();
    if (particles.length > 0) {
      const particleData = new Float32Array(particles.length * 9);
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        const offset = i * 9;
        particleData[offset] = p.x;
        particleData[offset + 1] = p.y;
        particleData[offset + 2] = p.z;
        particleData[offset + 3] = p.color[0];
        particleData[offset + 4] = p.color[1];
        particleData[offset + 5] = p.color[2];
        particleData[offset + 6] = p.color[3];
        particleData[offset + 7] = p.size;
        particleData[offset + 8] = p.rotation;
      }
      this.device.queue.writeBuffer(this.particleVertexBuffer, 0, particleData);

      // 更新粒子 uniform
      const particleUniform = new Float32Array(24);
      particleUniform.set(viewProjection, 0);
      particleUniform[16] = eyeX;
      particleUniform[17] = eyeY;
      particleUniform[18] = eyeZ;
      particleUniform[19] = this.time;
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
        aspect,
        0, 0,
      ]);
      this.device.queue.writeBuffer(this.victoryUniformBuffer, 0, victoryData);

      // 全螢幕四邊形
      const screenQuad = new Float32Array([
        -1, -1, 0, 0,
         1, -1, 1, 0,
         1,  1, 1, 1,
        -1, -1, 0, 0,
         1,  1, 1, 1,
        -1,  1, 0, 1,
      ]);
      const screenQuadBuffer = this.device.createBuffer({
        size: screenQuad.byteLength,
        usage: GPUBufferUsage.VERTEX,
        mappedAtCreation: true,
      });
      new Float32Array(screenQuadBuffer.getMappedRange()).set(screenQuad);
      screenQuadBuffer.unmap();

      victoryPass.setPipeline(this.victoryPipeline);
      victoryPass.setBindGroup(0, this.victoryBindGroup);
      victoryPass.setVertexBuffer(0, screenQuadBuffer);
      victoryPass.draw(6);
      victoryPass.end();

      screenQuadBuffer.destroy();
    }

    this.device.queue.submit([commandEncoder.finish()]);
  }

  // 將螢幕座標轉換為世界座標（簡化版）
  screenToWorld(screenX: number, screenY: number, canvasWidth: number, canvasHeight: number): { x: number; z: number } {
    // 簡化的反投影
    const ndcX = (screenX / canvasWidth) * 2 - 1;
    const ndcY = 1 - (screenY / canvasHeight) * 2;

    // 假設拼圖在 y=0 平面上
    const cameraDistance = 8 / this.camera.zoom;
    const fov = Math.PI / 4;

    const worldX = ndcX * cameraDistance * Math.tan(fov) * (canvasWidth / canvasHeight);
    const worldZ = -ndcY * cameraDistance * Math.tan(fov);

    // 旋轉校正
    const cosY = Math.cos(-this.camera.rotationY);
    const sinY = Math.sin(-this.camera.rotationY);
    const rotatedX = worldX * cosY - worldZ * sinY;
    const rotatedZ = worldX * sinY + worldZ * cosY;

    return { x: rotatedX, z: rotatedZ };
  }

  // 粒子效果方法
  emitSnapEffect(x: number, z: number): void {
    this.particleSystem.emitSnap(x, 0.05, z);
  }

  emitPickupEffect(x: number, z: number, width: number, height: number): void {
    const worldW = (width / this.canvas.width) * this.puzzleWidth;
    const worldH = (height / this.canvas.height) * this.puzzleHeight;
    this.particleSystem.emitPickup(x, 0, z, worldW, worldH);
  }

  emitTrailEffect(x: number, z: number): void {
    this.particleSystem.emitTrail(x, 0.02, z);
  }

  emitNearTargetEffect(x: number, z: number): void {
    this.particleSystem.emitNearTarget(x, 0.05, z);
  }

  destroy(): void {
    this.quadVertexBuffer?.destroy();
    this.particleVertexBuffer?.destroy();
    this.cameraUniformBuffer?.destroy();
    this.pieceUniformBuffer?.destroy();
    this.backgroundUniformBuffer?.destroy();
    this.particleUniformBuffer?.destroy();
    this.victoryUniformBuffer?.destroy();
    this.depthTexture?.destroy();
    this.puzzleTexture?.destroy();
  }
}
