/**
 * WebGPU 渲染器 - 泡泡射擊
 * WebGPU Renderer for Bubble Shooter
 */
import { mat4, type Mat4 } from './math';
import { ParticleSystem, type Particle } from './particles';
import {
  backgroundShader,
  bubbleShader,
  aimShader,
  particleShader,
} from './shaders';

export interface BubbleData {
  x: number;
  y: number;
  colorIndex: number;
  selected?: boolean;
  popping?: boolean;
  scale?: number;
}

export interface ProjectileData {
  x: number;
  y: number;
  colorIndex: number;
}

export interface AimData {
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
}

export class WebGPURenderer {
  private canvas: HTMLCanvasElement;
  private device: GPUDevice | null = null;
  private context: GPUCanvasContext | null = null;
  private format: GPUTextureFormat = 'bgra8unorm';

  // Game dimensions
  private gameWidth = 8;
  private gameHeight = 12;
  private bubbleRadius = 0.5;

  // Pipelines
  private backgroundPipeline: GPURenderPipeline | null = null;
  private bubblePipeline: GPURenderPipeline | null = null;
  private aimPipeline: GPURenderPipeline | null = null;
  private particlePipeline: GPURenderPipeline | null = null;

  // Buffers
  private quadBuffer: GPUBuffer | null = null;
  private bubbleQuadBuffer: GPUBuffer | null = null;
  private bubbleInstanceBuffer: GPUBuffer | null = null;
  private aimBuffer: GPUBuffer | null = null;
  private particleQuadBuffer: GPUBuffer | null = null;
  private particleDataBuffer: GPUBuffer | null = null;

  // Uniform buffers
  private backgroundUniformBuffer: GPUBuffer | null = null;
  private bubbleUniformBuffer: GPUBuffer | null = null;
  private aimUniformBuffer: GPUBuffer | null = null;
  private particleUniformBuffer: GPUBuffer | null = null;

  // Bind groups
  private backgroundBindGroup: GPUBindGroup | null = null;
  private bubbleBindGroup: GPUBindGroup | null = null;
  private aimBindGroup: GPUBindGroup | null = null;
  private particleBindGroup: GPUBindGroup | null = null;

  // Depth buffer
  private depthTexture: GPUTexture | null = null;

  // Camera matrices
  private projMatrix: Mat4;
  private viewMatrix: Mat4;
  private viewProjMatrix: Mat4;

  // State
  private time = 0;
  private aimVertexCount = 0;

  // Particle system
  private particles: ParticleSystem;
  private maxParticles = 2000;
  private maxBubbles = 150;

  // Bubble colors (matching game colors)
  private bubbleColors: [number, number, number, number][] = [
    [0.91, 0.30, 0.24, 1.0],  // 紅
    [0.90, 0.49, 0.13, 1.0],  // 橙
    [0.95, 0.77, 0.06, 1.0],  // 黃
    [0.18, 0.80, 0.44, 1.0],  // 綠
    [0.20, 0.60, 0.86, 1.0],  // 藍
    [0.61, 0.35, 0.71, 1.0],  // 紫
  ];

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.projMatrix = mat4.create();
    this.viewMatrix = mat4.create();
    this.viewProjMatrix = mat4.create();
    this.particles = new ParticleSystem();
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
    this.context = this.canvas.getContext('webgpu');
    if (!this.context) {
      console.warn('Failed to get WebGPU context');
      return false;
    }

    this.format = navigator.gpu.getPreferredCanvasFormat();
    this.context.configure({
      device: this.device,
      format: this.format,
      alphaMode: 'premultiplied',
    });

    this.createDepthTexture();
    this.setupCamera();
    this.createGeometry();
    this.createPipelines();
    this.createBindGroups();

    window.addEventListener('resize', () => this.handleResize());

    return true;
  }

  private handleResize(): void {
    if (!this.device || !this.context) return;

    this.context.configure({
      device: this.device,
      format: this.format,
      alphaMode: 'premultiplied',
    });

    this.createDepthTexture();
    this.setupCamera();
  }

  private createDepthTexture(): void {
    if (!this.device) return;

    if (this.depthTexture) {
      this.depthTexture.destroy();
    }

    this.depthTexture = this.device.createTexture({
      size: {
        width: this.canvas.width,
        height: this.canvas.height,
      },
      format: 'depth24plus',
      usage: GPUTextureUsage.RENDER_ATTACHMENT,
    });
  }

  private setupCamera(): void {
    const aspect = this.canvas.width / this.canvas.height;

    // 使用正交投影
    const halfWidth = this.gameWidth / 2 + 1;
    const halfHeight = halfWidth / aspect;

    mat4.ortho(
      this.projMatrix,
      -halfWidth, halfWidth,
      -halfHeight, halfHeight,
      -10, 10
    );

    mat4.identity(this.viewMatrix);

    mat4.multiply(this.viewProjMatrix, this.projMatrix, this.viewMatrix);
  }

  setGameSize(width: number, height: number): void {
    this.gameWidth = width;
    this.gameHeight = height;
    this.setupCamera();
  }

  private createGeometry(): void {
    if (!this.device) return;

    // Full screen quad for background
    const quadVerts = new Float32Array([
      -1, -1, 1, -1, -1, 1,
      -1, 1, 1, -1, 1, 1,
    ]);
    this.quadBuffer = this.device.createBuffer({
      size: quadVerts.byteLength,
      usage: GPUBufferUsage.VERTEX,
      mappedAtCreation: true,
    });
    new Float32Array(this.quadBuffer.getMappedRange()).set(quadVerts);
    this.quadBuffer.unmap();

    // Bubble quad (for billboarding)
    const bubbleQuad = new Float32Array([
      -1, -1, 1, -1, -1, 1,
      -1, 1, 1, -1, 1, 1,
    ]);
    this.bubbleQuadBuffer = this.device.createBuffer({
      size: bubbleQuad.byteLength,
      usage: GPUBufferUsage.VERTEX,
      mappedAtCreation: true,
    });
    new Float32Array(this.bubbleQuadBuffer.getMappedRange()).set(bubbleQuad);
    this.bubbleQuadBuffer.unmap();

    // Bubble instance buffer
    this.bubbleInstanceBuffer = this.device.createBuffer({
      size: this.maxBubbles * 48, // 3 vec4s per bubble
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });

    // Aim line buffer (dynamic)
    this.aimBuffer = this.device.createBuffer({
      size: 200 * 24, // Max 200 vertices
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });

    // Particle quad
    const particleQuad = new Float32Array([
      -1, -1, 1, -1, -1, 1,
      -1, 1, 1, -1, 1, 1,
    ]);
    this.particleQuadBuffer = this.device.createBuffer({
      size: particleQuad.byteLength,
      usage: GPUBufferUsage.VERTEX,
      mappedAtCreation: true,
    });
    new Float32Array(this.particleQuadBuffer.getMappedRange()).set(particleQuad);
    this.particleQuadBuffer.unmap();

    // Particle data buffer
    this.particleDataBuffer = this.device.createBuffer({
      size: this.maxParticles * 48,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });
  }

  private createPipelines(): void {
    if (!this.device) return;

    // Background pipeline
    this.backgroundPipeline = this.device.createRenderPipeline({
      layout: 'auto',
      vertex: {
        module: this.device.createShaderModule({ code: backgroundShader }),
        entryPoint: 'vs_main',
        buffers: [{
          arrayStride: 8,
          attributes: [{ shaderLocation: 0, offset: 0, format: 'float32x2' }],
        }],
      },
      fragment: {
        module: this.device.createShaderModule({ code: backgroundShader }),
        entryPoint: 'fs_main',
        targets: [{ format: this.format }],
      },
      primitive: { topology: 'triangle-list' },
    });

    // Bubble pipeline
    this.bubblePipeline = this.device.createRenderPipeline({
      layout: 'auto',
      vertex: {
        module: this.device.createShaderModule({ code: bubbleShader }),
        entryPoint: 'vs_main',
        buffers: [{
          arrayStride: 8,
          attributes: [{ shaderLocation: 0, offset: 0, format: 'float32x2' }],
        }],
      },
      fragment: {
        module: this.device.createShaderModule({ code: bubbleShader }),
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
        format: 'depth24plus',
        depthWriteEnabled: true,
        depthCompare: 'less',
      },
    });

    // Aim line pipeline
    this.aimPipeline = this.device.createRenderPipeline({
      layout: 'auto',
      vertex: {
        module: this.device.createShaderModule({ code: aimShader }),
        entryPoint: 'vs_main',
        buffers: [{
          arrayStride: 24,
          attributes: [
            { shaderLocation: 0, offset: 0, format: 'float32x3' },
            { shaderLocation: 1, offset: 12, format: 'float32x2' },
            { shaderLocation: 2, offset: 20, format: 'float32' },
          ],
        }],
      },
      fragment: {
        module: this.device.createShaderModule({ code: aimShader }),
        entryPoint: 'fs_main',
        targets: [{
          format: this.format,
          blend: {
            color: { srcFactor: 'src-alpha', dstFactor: 'one' },
            alpha: { srcFactor: 'one', dstFactor: 'one' },
          },
        }],
      },
      primitive: { topology: 'triangle-strip' },
      depthStencil: {
        format: 'depth24plus',
        depthWriteEnabled: false,
        depthCompare: 'less',
      },
    });

    // Particle pipeline
    this.particlePipeline = this.device.createRenderPipeline({
      layout: 'auto',
      vertex: {
        module: this.device.createShaderModule({ code: particleShader }),
        entryPoint: 'vs_main',
        buffers: [{
          arrayStride: 8,
          attributes: [{ shaderLocation: 0, offset: 0, format: 'float32x2' }],
        }],
      },
      fragment: {
        module: this.device.createShaderModule({ code: particleShader }),
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
        format: 'depth24plus',
        depthWriteEnabled: false,
        depthCompare: 'less',
      },
    });
  }

  private createBindGroups(): void {
    if (!this.device) return;

    // Background uniforms
    this.backgroundUniformBuffer = this.device.createBuffer({
      size: 16,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    this.backgroundBindGroup = this.device.createBindGroup({
      layout: this.backgroundPipeline!.getBindGroupLayout(0),
      entries: [{
        binding: 0,
        resource: { buffer: this.backgroundUniformBuffer },
      }],
    });

    // Bubble uniforms
    this.bubbleUniformBuffer = this.device.createBuffer({
      size: 80,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    this.bubbleBindGroup = this.device.createBindGroup({
      layout: this.bubblePipeline!.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: this.bubbleUniformBuffer } },
        { binding: 1, resource: { buffer: this.bubbleInstanceBuffer! } },
      ],
    });

    // Aim uniforms
    this.aimUniformBuffer = this.device.createBuffer({
      size: 80,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    this.aimBindGroup = this.device.createBindGroup({
      layout: this.aimPipeline!.getBindGroupLayout(0),
      entries: [{
        binding: 0,
        resource: { buffer: this.aimUniformBuffer },
      }],
    });

    // Particle uniforms
    this.particleUniformBuffer = this.device.createBuffer({
      size: 80,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    this.particleBindGroup = this.device.createBindGroup({
      layout: this.particlePipeline!.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: this.particleUniformBuffer } },
        { binding: 1, resource: { buffer: this.particleDataBuffer! } },
      ],
    });
  }

  updateBubbles(bubbles: BubbleData[], projectile: ProjectileData | null): void {
    if (!this.device) return;

    const allBubbles = [...bubbles];
    if (projectile) {
      allBubbles.push({
        x: projectile.x,
        y: projectile.y,
        colorIndex: projectile.colorIndex,
        selected: false,
        popping: false,
        scale: 1,
      });
    }

    const instanceData = new Float32Array(allBubbles.length * 12);

    allBubbles.forEach((bubble, i) => {
      const offset = i * 12;
      const color = this.bubbleColors[bubble.colorIndex % this.bubbleColors.length];

      // Position (xyz) + radius (w)
      instanceData[offset] = bubble.x;
      instanceData[offset + 1] = bubble.y;
      instanceData[offset + 2] = 0;
      instanceData[offset + 3] = this.bubbleRadius;

      // Color (rgba)
      instanceData[offset + 4] = color[0];
      instanceData[offset + 5] = color[1];
      instanceData[offset + 6] = color[2];
      instanceData[offset + 7] = color[3];

      // State (selected, popping, scale, type)
      instanceData[offset + 8] = bubble.selected ? 1 : 0;
      instanceData[offset + 9] = bubble.popping ? 1 : 0;
      instanceData[offset + 10] = bubble.scale ?? 1;
      instanceData[offset + 11] = bubble.colorIndex;
    });

    this.device.queue.writeBuffer(this.bubbleInstanceBuffer!, 0, instanceData);
  }

  updateAimLine(aim: AimData | null): void {
    if (!this.device || !aim) {
      this.aimVertexCount = 0;
      return;
    }

    const lineWidth = 0.05;
    const vertices: number[] = [];

    // 計算方向
    const dx = aim.targetX - aim.startX;
    const dy = aim.targetY - aim.startY;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len < 0.1) {
      this.aimVertexCount = 0;
      return;
    }

    const nx = -dy / len * lineWidth;
    const ny = dx / len * lineWidth;

    // 只延伸到合理範圍
    const maxLen = Math.min(len, 15);
    const segments = 30;

    for (let i = 0; i < segments; i++) {
      const t1 = i / segments;
      const t2 = (i + 1) / segments;

      const x1 = aim.startX + dx * t1 * maxLen / len;
      const y1 = aim.startY + dy * t1 * maxLen / len;
      const x2 = aim.startX + dx * t2 * maxLen / len;
      const y2 = aim.startY + dy * t2 * maxLen / len;

      // pos(3) + uv(2) + progress(1) = 6 floats
      vertices.push(
        x1 - nx, y1 - ny, 0, 0, 0, t1,
        x1 + nx, y1 + ny, 0, 0, 1, t1,
        x2 - nx, y2 - ny, 0, 1, 0, t2,
        x2 + nx, y2 + ny, 0, 1, 1, t2,
      );
    }

    if (vertices.length > 0) {
      this.device.queue.writeBuffer(this.aimBuffer!, 0, new Float32Array(vertices));
      this.aimVertexCount = segments * 4;
    }
  }

  // Particle emission methods
  emitPop(x: number, y: number, colorIndex: number): void {
    this.particles.emitPop(x, y, colorIndex);
  }

  emitChainPop(bubbles: Array<{x: number, y: number, colorIndex: number}>): void {
    this.particles.emitChainPop(bubbles);
  }

  emitCascade(x: number, y: number, colorIndex: number): void {
    this.particles.emitCascade(x, y, colorIndex);
  }

  emitShoot(x: number, y: number, colorIndex: number): void {
    this.particles.emitShoot(x, y, colorIndex);
  }

  emitTrail(x: number, y: number, colorIndex: number): void {
    this.particles.emitTrail(x, y, colorIndex);
  }

  emitBounce(x: number, y: number): void {
    this.particles.emitBounce(x, y);
  }

  emitVictory(): void {
    this.particles.emitVictory(this.gameWidth / 2, this.gameHeight / 2);
  }

  emitGameOver(): void {
    this.particles.emitGameOver(this.gameWidth / 2, this.gameHeight / 2);
  }

  clearParticles(): void {
    this.particles.clear();
  }

  render(deltaTime: number, bubbleCount: number): void {
    if (!this.device || !this.context || !this.depthTexture) return;

    this.time += deltaTime * 0.001;
    this.particles.update(deltaTime);

    // Ambient particles
    this.particles.emitAmbient(this.gameWidth, this.gameHeight);

    // Update uniforms
    this.updateUniforms();

    // Update particle buffer
    this.updateParticleBuffer();

    const commandEncoder = this.device.createCommandEncoder();
    const textureView = this.context.getCurrentTexture().createView();

    const renderPass = commandEncoder.beginRenderPass({
      colorAttachments: [{
        view: textureView,
        clearValue: { r: 0.02, g: 0.05, b: 0.15, a: 1.0 },
        loadOp: 'clear',
        storeOp: 'store',
      }],
      depthStencilAttachment: {
        view: this.depthTexture.createView(),
        depthClearValue: 1.0,
        depthLoadOp: 'clear',
        depthStoreOp: 'store',
      },
    });

    // Background
    if (this.backgroundPipeline && this.quadBuffer) {
      renderPass.setPipeline(this.backgroundPipeline);
      renderPass.setBindGroup(0, this.backgroundBindGroup!);
      renderPass.setVertexBuffer(0, this.quadBuffer);
      renderPass.draw(6);
    }

    // Aim line
    if (this.aimPipeline && this.aimBuffer && this.aimVertexCount > 0) {
      renderPass.setPipeline(this.aimPipeline);
      renderPass.setBindGroup(0, this.aimBindGroup!);
      renderPass.setVertexBuffer(0, this.aimBuffer);
      for (let i = 0; i < this.aimVertexCount / 4; i++) {
        renderPass.draw(4, 1, i * 4);
      }
    }

    // Bubbles
    if (this.bubblePipeline && this.bubbleQuadBuffer && bubbleCount > 0) {
      renderPass.setPipeline(this.bubblePipeline);
      renderPass.setBindGroup(0, this.bubbleBindGroup!);
      renderPass.setVertexBuffer(0, this.bubbleQuadBuffer);
      renderPass.draw(6, bubbleCount);
    }

    // Particles
    const particleCount = this.particles.getCount();
    if (this.particlePipeline && this.particleQuadBuffer && particleCount > 0) {
      renderPass.setPipeline(this.particlePipeline);
      renderPass.setBindGroup(0, this.particleBindGroup!);
      renderPass.setVertexBuffer(0, this.particleQuadBuffer);
      renderPass.draw(6, particleCount);
    }

    renderPass.end();

    this.device.queue.submit([commandEncoder.finish()]);
  }

  private updateUniforms(): void {
    if (!this.device) return;

    // Background uniforms
    const bgUniforms = new Float32Array([
      this.canvas.width, this.canvas.height, this.time, 0,
    ]);
    this.device.queue.writeBuffer(this.backgroundUniformBuffer!, 0, bgUniforms);

    // Bubble uniforms
    const bubbleUniforms = new Float32Array(20);
    bubbleUniforms.set(this.viewProjMatrix, 0);
    bubbleUniforms[16] = this.time;
    this.device.queue.writeBuffer(this.bubbleUniformBuffer!, 0, bubbleUniforms);

    // Aim uniforms
    const aimUniforms = new Float32Array(20);
    aimUniforms.set(this.viewProjMatrix, 0);
    aimUniforms[16] = this.time;
    this.device.queue.writeBuffer(this.aimUniformBuffer!, 0, aimUniforms);

    // Particle uniforms
    const particleUniforms = new Float32Array(20);
    particleUniforms.set(this.viewProjMatrix, 0);
    particleUniforms[16] = this.time;
    this.device.queue.writeBuffer(this.particleUniformBuffer!, 0, particleUniforms);
  }

  private updateParticleBuffer(): void {
    if (!this.device) return;

    const particleList = this.particles.getParticles();
    if (particleList.length === 0) return;

    const data = new Float32Array(particleList.length * 12);

    const typeMap: Record<string, number> = {
      'pop': 0,
      'sparkle': 1,
      'star': 2,
      'ring': 3,
      'trail': 4,
      'cascade': 0,
      'shoot': 4,
    };

    particleList.forEach((p, i) => {
      const offset = i * 12;
      data[offset] = p.x;
      data[offset + 1] = p.y;
      data[offset + 2] = p.z;
      data[offset + 3] = p.life;
      data[offset + 4] = p.vx;
      data[offset + 5] = p.vy;
      data[offset + 6] = p.vz;
      data[offset + 7] = p.size;
      data[offset + 8] = p.color[0];
      data[offset + 9] = p.color[1];
      data[offset + 10] = p.color[2];
      data[offset + 11] = p.color[3];
    });

    this.device.queue.writeBuffer(this.particleDataBuffer!, 0, data);
  }

  destroy(): void {
    this.quadBuffer?.destroy();
    this.bubbleQuadBuffer?.destroy();
    this.bubbleInstanceBuffer?.destroy();
    this.aimBuffer?.destroy();
    this.particleQuadBuffer?.destroy();
    this.particleDataBuffer?.destroy();
    this.backgroundUniformBuffer?.destroy();
    this.bubbleUniformBuffer?.destroy();
    this.aimUniformBuffer?.destroy();
    this.particleUniformBuffer?.destroy();
    this.depthTexture?.destroy();
  }
}
