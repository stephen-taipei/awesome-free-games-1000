/**
 * WebGPU 3D 渲染器 - 推箱子遊戲
 * Main renderer for Sokoban
 */

import { mat4, vec3 } from './math';
import { shaders } from './shaders';
import { ParticleSystem, Particle } from './particles';

export interface TileState {
  x: number;
  y: number;
  type: number;  // 0=floor, 1=wall, 2=target
}

export interface BoxState {
  x: number;
  y: number;
  onTarget: boolean;
  animProgress: number;
}

export interface PlayerState {
  x: number;
  y: number;
  direction: number;  // 0=up, 1=right, 2=down, 3=left
  bobPhase: number;
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
  private canvas: HTMLCanvasElement;
  private device!: GPUDevice;
  private context!: GPUCanvasContext;
  private format!: GPUTextureFormat;

  // Pipelines
  private floorPipeline!: GPURenderPipeline;
  private wallPipeline!: GPURenderPipeline;
  private boxPipeline!: GPURenderPipeline;
  private playerPipeline!: GPURenderPipeline;
  private particlePipeline!: GPURenderPipeline;
  private victoryPipeline!: GPURenderPipeline;

  // Buffers
  private quadVertexBuffer!: GPUBuffer;
  private cubeVertexBuffer!: GPUBuffer;
  private sphereVertexBuffer!: GPUBuffer;
  private sphereVertexCount: number = 0;
  private particleVertexBuffer!: GPUBuffer;

  // Uniform Buffers
  private cameraUniformBuffer!: GPUBuffer;
  private tileUniformBuffer!: GPUBuffer;
  private wallUniformBuffer!: GPUBuffer;
  private boxUniformBuffer!: GPUBuffer;
  private playerUniformBuffer!: GPUBuffer;
  private particleUniformBuffer!: GPUBuffer;
  private victoryUniformBuffer!: GPUBuffer;

  // Bind Group Layouts
  private floorBindGroupLayout!: GPUBindGroupLayout;
  private wallBindGroupLayout!: GPUBindGroupLayout;
  private boxBindGroupLayout!: GPUBindGroupLayout;
  private playerBindGroupLayout!: GPUBindGroupLayout;
  private particleBindGroupLayout!: GPUBindGroupLayout;
  private victoryBindGroupLayout!: GPUBindGroupLayout;

  // Depth Texture
  private depthTexture!: GPUTexture;
  private depthTextureView!: GPUTextureView;

  // Particle System
  public particleSystem: ParticleSystem;

  // State
  private tiles: TileState[] = [];
  private boxes: BoxState[] = [];
  private player: PlayerState = { x: 0, y: 0, direction: 2, bobPhase: 0 };
  private gridWidth: number = 0;
  private gridHeight: number = 0;
  private camera: CameraState = {
    rotationX: 0.6,
    rotationY: 0.3,
    zoom: 1.0,
    targetRotationX: 0.6,
    targetRotationY: 0.3,
    targetZoom: 1.0,
  };
  private time: number = 0;
  private isVictory: boolean = false;
  private victoryTime: number = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.particleSystem = new ParticleSystem();
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
      alphaMode: 'premultiplied',
    });

    this.createBuffers();
    this.createPipelines();
    this.createDepthTexture(this.canvas.width, this.canvas.height);

    return true;
  }

  private createBuffers(): void {
    // Quad (for floor/tiles) - XZ plane
    const quadVertices = new Float32Array([
      // pos(3), normal(3), uv(2)
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

    // Cube (for walls and boxes)
    const cubeVertices = this.createCubeVertices();
    this.cubeVertexBuffer = this.device.createBuffer({
      size: cubeVertices.byteLength,
      usage: GPUBufferUsage.VERTEX,
      mappedAtCreation: true,
    });
    new Float32Array(this.cubeVertexBuffer.getMappedRange()).set(cubeVertices);
    this.cubeVertexBuffer.unmap();

    // Sphere (for player)
    const sphereData = this.createSphereVertices(16, 12);
    this.sphereVertexCount = sphereData.count;
    this.sphereVertexBuffer = this.device.createBuffer({
      size: sphereData.vertices.byteLength,
      usage: GPUBufferUsage.VERTEX,
      mappedAtCreation: true,
    });
    new Float32Array(this.sphereVertexBuffer.getMappedRange()).set(sphereData.vertices);
    this.sphereVertexBuffer.unmap();

    // Particle buffer
    this.particleVertexBuffer = this.device.createBuffer({
      size: 2000 * 36,  // 9 floats per particle * 4 bytes
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });

    // Uniform buffers
    this.cameraUniformBuffer = this.device.createBuffer({
      size: 128,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    this.tileUniformBuffer = this.device.createBuffer({
      size: 32,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    this.wallUniformBuffer = this.device.createBuffer({
      size: 32,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    this.boxUniformBuffer = this.device.createBuffer({
      size: 48,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    this.playerUniformBuffer = this.device.createBuffer({
      size: 48,
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

  private createCubeVertices(): Float32Array {
    const vertices: number[] = [];

    const faces = [
      { normal: [0, 0, 1], verts: [[0,0,1], [1,0,1], [1,1,1], [0,1,1]] },   // Front
      { normal: [0, 0, -1], verts: [[1,0,0], [0,0,0], [0,1,0], [1,1,0]] },  // Back
      { normal: [0, 1, 0], verts: [[0,1,1], [1,1,1], [1,1,0], [0,1,0]] },   // Top
      { normal: [0, -1, 0], verts: [[0,0,0], [1,0,0], [1,0,1], [0,0,1]] },  // Bottom
      { normal: [1, 0, 0], verts: [[1,0,1], [1,0,0], [1,1,0], [1,1,1]] },   // Right
      { normal: [-1, 0, 0], verts: [[0,0,0], [0,0,1], [0,1,1], [0,1,0]] },  // Left
    ];

    const uvs = [[0,0], [1,0], [1,1], [0,1]];
    const indices = [0, 1, 2, 0, 2, 3];

    for (const face of faces) {
      for (const i of indices) {
        vertices.push(
          ...face.verts[i],
          ...face.normal,
          ...uvs[i]
        );
      }
    }

    return new Float32Array(vertices);
  }

  private createSphereVertices(segments: number, rings: number): { vertices: Float32Array; count: number } {
    const vertices: number[] = [];

    for (let ring = 0; ring < rings; ring++) {
      const theta1 = (ring / rings) * Math.PI;
      const theta2 = ((ring + 1) / rings) * Math.PI;

      for (let seg = 0; seg < segments; seg++) {
        const phi1 = (seg / segments) * Math.PI * 2;
        const phi2 = ((seg + 1) / segments) * Math.PI * 2;

        const p1 = [
          Math.sin(theta1) * Math.cos(phi1),
          Math.cos(theta1),
          Math.sin(theta1) * Math.sin(phi1),
        ];
        const p2 = [
          Math.sin(theta1) * Math.cos(phi2),
          Math.cos(theta1),
          Math.sin(theta1) * Math.sin(phi2),
        ];
        const p3 = [
          Math.sin(theta2) * Math.cos(phi2),
          Math.cos(theta2),
          Math.sin(theta2) * Math.sin(phi2),
        ];
        const p4 = [
          Math.sin(theta2) * Math.cos(phi1),
          Math.cos(theta2),
          Math.sin(theta2) * Math.sin(phi1),
        ];

        const uv1 = [seg / segments, ring / rings];
        const uv2 = [(seg + 1) / segments, ring / rings];
        const uv3 = [(seg + 1) / segments, (ring + 1) / rings];
        const uv4 = [seg / segments, (ring + 1) / rings];

        // Triangle 1
        vertices.push(...p1, ...p1, ...uv1);
        vertices.push(...p2, ...p2, ...uv2);
        vertices.push(...p3, ...p3, ...uv3);

        // Triangle 2
        vertices.push(...p1, ...p1, ...uv1);
        vertices.push(...p3, ...p3, ...uv3);
        vertices.push(...p4, ...p4, ...uv4);
      }
    }

    return { vertices: new Float32Array(vertices), count: vertices.length / 8 };
  }

  private createPipelines(): void {
    const vertexLayout: GPUVertexBufferLayout = {
      arrayStride: 32,
      attributes: [
        { shaderLocation: 0, offset: 0, format: 'float32x3' },
        { shaderLocation: 1, offset: 12, format: 'float32x3' },
        { shaderLocation: 2, offset: 24, format: 'float32x2' },
      ],
    };

    // Floor pipeline
    this.floorBindGroupLayout = this.device.createBindGroupLayout({
      entries: [
        { binding: 0, visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT, buffer: { type: 'uniform' } },
        { binding: 1, visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT, buffer: { type: 'uniform' } },
      ],
    });

    const floorModule = this.device.createShaderModule({ code: shaders.floor });
    this.floorPipeline = this.device.createRenderPipeline({
      layout: this.device.createPipelineLayout({ bindGroupLayouts: [this.floorBindGroupLayout] }),
      vertex: { module: floorModule, entryPoint: 'vertexMain', buffers: [vertexLayout] },
      fragment: { module: floorModule, entryPoint: 'fragmentMain', targets: [{ format: this.format }] },
      primitive: { topology: 'triangle-list' },
      depthStencil: { depthWriteEnabled: true, depthCompare: 'less', format: 'depth24plus' },
    });

    // Wall pipeline
    this.wallBindGroupLayout = this.device.createBindGroupLayout({
      entries: [
        { binding: 0, visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT, buffer: { type: 'uniform' } },
        { binding: 1, visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT, buffer: { type: 'uniform' } },
      ],
    });

    const wallModule = this.device.createShaderModule({ code: shaders.wall });
    this.wallPipeline = this.device.createRenderPipeline({
      layout: this.device.createPipelineLayout({ bindGroupLayouts: [this.wallBindGroupLayout] }),
      vertex: { module: wallModule, entryPoint: 'vertexMain', buffers: [vertexLayout] },
      fragment: { module: wallModule, entryPoint: 'fragmentMain', targets: [{ format: this.format }] },
      primitive: { topology: 'triangle-list', cullMode: 'back' },
      depthStencil: { depthWriteEnabled: true, depthCompare: 'less', format: 'depth24plus' },
    });

    // Box pipeline
    this.boxBindGroupLayout = this.device.createBindGroupLayout({
      entries: [
        { binding: 0, visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT, buffer: { type: 'uniform' } },
        { binding: 1, visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT, buffer: { type: 'uniform' } },
      ],
    });

    const boxModule = this.device.createShaderModule({ code: shaders.box });
    this.boxPipeline = this.device.createRenderPipeline({
      layout: this.device.createPipelineLayout({ bindGroupLayouts: [this.boxBindGroupLayout] }),
      vertex: { module: boxModule, entryPoint: 'vertexMain', buffers: [vertexLayout] },
      fragment: { module: boxModule, entryPoint: 'fragmentMain', targets: [{ format: this.format }] },
      primitive: { topology: 'triangle-list', cullMode: 'back' },
      depthStencil: { depthWriteEnabled: true, depthCompare: 'less', format: 'depth24plus' },
    });

    // Player pipeline
    this.playerBindGroupLayout = this.device.createBindGroupLayout({
      entries: [
        { binding: 0, visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT, buffer: { type: 'uniform' } },
        { binding: 1, visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT, buffer: { type: 'uniform' } },
      ],
    });

    const playerModule = this.device.createShaderModule({ code: shaders.player });
    this.playerPipeline = this.device.createRenderPipeline({
      layout: this.device.createPipelineLayout({ bindGroupLayouts: [this.playerBindGroupLayout] }),
      vertex: { module: playerModule, entryPoint: 'vertexMain', buffers: [vertexLayout] },
      fragment: { module: playerModule, entryPoint: 'fragmentMain', targets: [{ format: this.format }] },
      primitive: { topology: 'triangle-list', cullMode: 'back' },
      depthStencil: { depthWriteEnabled: true, depthCompare: 'less', format: 'depth24plus' },
    });

    // Particle pipeline
    this.particleBindGroupLayout = this.device.createBindGroupLayout({
      entries: [
        { binding: 0, visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT, buffer: { type: 'uniform' } },
      ],
    });

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
      depthStencil: { depthWriteEnabled: false, depthCompare: 'less', format: 'depth24plus' },
    });

    // Victory pipeline
    this.victoryBindGroupLayout = this.device.createBindGroupLayout({
      entries: [
        { binding: 0, visibility: GPUShaderStage.FRAGMENT, buffer: { type: 'uniform' } },
      ],
    });

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

  setGrid(width: number, height: number, tiles: number[][]): void {
    this.gridWidth = width;
    this.gridHeight = height;
    this.tiles = [];

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const type = tiles[y]?.[x] ?? 0;
        this.tiles.push({ x, y, type });
      }
    }
  }

  updatePlayer(x: number, y: number, direction: number, bobPhase: number): void {
    this.player = { x, y, direction, bobPhase };
  }

  updateBoxes(boxes: { x: number; y: number; onTarget: boolean }[]): void {
    this.boxes = boxes.map(b => ({
      ...b,
      animProgress: 0,
    }));
  }

  setVictory(value: boolean): void {
    if (value && !this.isVictory) {
      this.victoryTime = this.time;
      const centerX = this.gridWidth / 2;
      const centerZ = this.gridHeight / 2;
      this.particleSystem.emitVictory(centerX, centerZ);
    }
    this.isVictory = value;
  }

  rotateCamera(deltaX: number, deltaY: number): void {
    this.camera.targetRotationY += deltaX;
    this.camera.targetRotationX = Math.max(0.2, Math.min(1.2, this.camera.targetRotationX + deltaY));
  }

  zoomCamera(delta: number): void {
    this.camera.targetZoom = Math.max(0.5, Math.min(2.5, this.camera.targetZoom + delta));
  }

  render(deltaTime: number): void {
    this.time += deltaTime * 0.001;

    // Update camera
    this.camera.rotationX += (this.camera.targetRotationX - this.camera.rotationX) * 0.1;
    this.camera.rotationY += (this.camera.targetRotationY - this.camera.rotationY) * 0.1;
    this.camera.zoom += (this.camera.targetZoom - this.camera.zoom) * 0.1;

    // Update particles
    this.particleSystem.update(deltaTime);

    // Victory sparkles
    if (this.isVictory) {
      this.particleSystem.emitVictorySparkles(this.gridWidth / 2, this.gridHeight / 2, Math.max(this.gridWidth, this.gridHeight) * 0.5);
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

    // Camera setup
    const aspect = this.canvas.width / this.canvas.height;
    const projection = mat4.perspective(Math.PI / 4, aspect, 0.1, 100);

    const centerX = this.gridWidth / 2;
    const centerZ = this.gridHeight / 2;
    const cameraDistance = Math.max(this.gridWidth, this.gridHeight) * 1.2 / this.camera.zoom;

    const eyeX = centerX + Math.sin(this.camera.rotationY) * Math.cos(this.camera.rotationX) * cameraDistance;
    const eyeY = Math.sin(this.camera.rotationX) * cameraDistance + 2;
    const eyeZ = centerZ + Math.cos(this.camera.rotationY) * Math.cos(this.camera.rotationX) * cameraDistance;

    const view = mat4.lookAt([eyeX, eyeY, eyeZ], [centerX, 0, centerZ], [0, 1, 0]);
    const viewProjection = mat4.multiply(projection, view);

    // Update camera uniform
    const cameraData = new Float32Array(24);
    cameraData.set(viewProjection, 0);
    cameraData[16] = eyeX;
    cameraData[17] = eyeY;
    cameraData[18] = eyeZ;
    cameraData[19] = this.time;
    this.device.queue.writeBuffer(this.cameraUniformBuffer, 0, cameraData);

    // Render floors and targets (non-walls)
    renderPass.setPipeline(this.floorPipeline);
    renderPass.setVertexBuffer(0, this.quadVertexBuffer);

    for (const tile of this.tiles) {
      if (tile.type === 1) continue; // Skip walls

      const bindGroup = this.device.createBindGroup({
        layout: this.floorBindGroupLayout,
        entries: [
          { binding: 0, resource: { buffer: this.cameraUniformBuffer } },
          { binding: 1, resource: { buffer: this.tileUniformBuffer } },
        ],
      });

      const tileData = new Float32Array([tile.x, tile.y, tile.type, 0]);
      this.device.queue.writeBuffer(this.tileUniformBuffer, 0, tileData);

      renderPass.setBindGroup(0, bindGroup);
      renderPass.draw(6);
    }

    // Render walls
    renderPass.setPipeline(this.wallPipeline);
    renderPass.setVertexBuffer(0, this.cubeVertexBuffer);

    for (const tile of this.tiles) {
      if (tile.type !== 1) continue;

      const bindGroup = this.device.createBindGroup({
        layout: this.wallBindGroupLayout,
        entries: [
          { binding: 0, resource: { buffer: this.cameraUniformBuffer } },
          { binding: 1, resource: { buffer: this.wallUniformBuffer } },
        ],
      });

      const wallData = new Float32Array([tile.x, tile.y, 1.0, 0]);
      this.device.queue.writeBuffer(this.wallUniformBuffer, 0, wallData);

      renderPass.setBindGroup(0, bindGroup);
      renderPass.draw(36);
    }

    // Render boxes
    renderPass.setPipeline(this.boxPipeline);
    renderPass.setVertexBuffer(0, this.cubeVertexBuffer);

    for (const box of this.boxes) {
      const bindGroup = this.device.createBindGroup({
        layout: this.boxBindGroupLayout,
        entries: [
          { binding: 0, resource: { buffer: this.cameraUniformBuffer } },
          { binding: 1, resource: { buffer: this.boxUniformBuffer } },
        ],
      });

      const boxData = new Float32Array([
        box.x, 0, box.y,
        box.onTarget ? 1.0 : 0.0,
        box.animProgress,
        1.0,
        0, 0,
      ]);
      this.device.queue.writeBuffer(this.boxUniformBuffer, 0, boxData);

      renderPass.setBindGroup(0, bindGroup);
      renderPass.draw(36);
    }

    // Render player
    renderPass.setPipeline(this.playerPipeline);
    renderPass.setVertexBuffer(0, this.sphereVertexBuffer);

    const playerBindGroup = this.device.createBindGroup({
      layout: this.playerBindGroupLayout,
      entries: [
        { binding: 0, resource: { buffer: this.cameraUniformBuffer } },
        { binding: 1, resource: { buffer: this.playerUniformBuffer } },
      ],
    });

    const playerData = new Float32Array([
      this.player.x, 0, this.player.y,
      this.player.direction,
      this.player.bobPhase,
      1.0,
      0, 0,
    ]);
    this.device.queue.writeBuffer(this.playerUniformBuffer, 0, playerData);

    renderPass.setBindGroup(0, playerBindGroup);
    renderPass.draw(this.sphereVertexCount);

    // Render particles
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

      const particleUniform = new Float32Array(24);
      particleUniform.set(viewProjection, 0);
      particleUniform[16] = eyeX;
      particleUniform[17] = eyeY;
      particleUniform[18] = eyeZ;
      particleUniform[19] = this.time;
      this.device.queue.writeBuffer(this.particleUniformBuffer, 0, particleUniform);

      const particleBindGroup = this.device.createBindGroup({
        layout: this.particleBindGroupLayout,
        entries: [
          { binding: 0, resource: { buffer: this.particleUniformBuffer } },
        ],
      });

      renderPass.setPipeline(this.particlePipeline);
      renderPass.setBindGroup(0, particleBindGroup);
      renderPass.setVertexBuffer(0, this.particleVertexBuffer);
      renderPass.draw(6, particles.length);
    }

    renderPass.end();

    // Victory overlay
    if (this.isVictory) {
      const victoryPass = commandEncoder.beginRenderPass({
        colorAttachments: [{
          view: textureView,
          loadOp: 'load',
          storeOp: 'store',
        }],
      });

      const victoryData = new Float32Array([this.time - this.victoryTime, aspect, 0, 0]);
      this.device.queue.writeBuffer(this.victoryUniformBuffer, 0, victoryData);

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

      const victoryBindGroup = this.device.createBindGroup({
        layout: this.victoryBindGroupLayout,
        entries: [
          { binding: 0, resource: { buffer: this.victoryUniformBuffer } },
        ],
      });

      victoryPass.setPipeline(this.victoryPipeline);
      victoryPass.setBindGroup(0, victoryBindGroup);
      victoryPass.setVertexBuffer(0, screenQuadBuffer);
      victoryPass.draw(6);
      victoryPass.end();

      screenQuadBuffer.destroy();
    }

    this.device.queue.submit([commandEncoder.finish()]);
  }

  // Particle effect methods
  emitMoveDust(x: number, z: number): void {
    this.particleSystem.emitMoveDust(x, z);
  }

  emitPushEffect(x: number, z: number, dx: number, dz: number): void {
    this.particleSystem.emitPushEffect(x, z, dx, dz);
  }

  emitTargetReached(x: number, z: number): void {
    this.particleSystem.emitTargetReached(x, z);
  }

  emitTargetLeft(x: number, z: number): void {
    this.particleSystem.emitTargetLeft(x, z);
  }

  emitPlayerTrail(x: number, z: number): void {
    this.particleSystem.emitPlayerTrail(x, z);
  }

  emitBlocked(x: number, z: number, dx: number, dz: number): void {
    this.particleSystem.emitBlocked(x, z, dx, dz);
  }

  destroy(): void {
    this.quadVertexBuffer?.destroy();
    this.cubeVertexBuffer?.destroy();
    this.sphereVertexBuffer?.destroy();
    this.particleVertexBuffer?.destroy();
    this.cameraUniformBuffer?.destroy();
    this.tileUniformBuffer?.destroy();
    this.wallUniformBuffer?.destroy();
    this.boxUniformBuffer?.destroy();
    this.playerUniformBuffer?.destroy();
    this.particleUniformBuffer?.destroy();
    this.victoryUniformBuffer?.destroy();
    this.depthTexture?.destroy();
  }
}
