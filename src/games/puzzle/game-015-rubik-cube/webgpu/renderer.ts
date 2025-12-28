/**
 * WebGPU Renderer - Rubik Cube
 * Neon Matrix Cube Theme
 * Game #015
 */

import {
  backgroundShader,
  cubieShader,
  particleShader,
  victoryShader,
} from './shaders';
import { ParticleSystem, type Particle } from './particles';
import {
  mat4Identity,
  mat4Perspective,
  mat4Multiply,
  mat4RotateX,
  mat4RotateY,
  type Mat4,
  type Vec3,
} from './math';

export interface CubieData {
  position: Vec3;           // Grid position (-1, 0, 1)
  transform: Mat4;          // Full transform matrix
  faceColors: string[];     // 6 face colors (hex)
  isRotating: boolean;
  rotationProgress: number;
}

// Face color mapping: Front, Back, Right, Left, Top, Bottom
const FACE_COLOR_MAP: Record<string, [number, number, number, number]> = {
  'red': [1.0, 0.2, 0.2, 1.0],
  'orange': [1.0, 0.5, 0.0, 1.0],
  'blue': [0.2, 0.4, 1.0, 1.0],
  'green': [0.2, 0.8, 0.2, 1.0],
  'white': [1.0, 1.0, 1.0, 1.0],
  'yellow': [1.0, 0.9, 0.0, 1.0],
  'black': [0.05, 0.05, 0.08, 1.0],
};

export class WebGPURenderer {
  private canvas: HTMLCanvasElement;
  private device: GPUDevice | null = null;
  private context: GPUCanvasContext | null = null;
  private format: GPUTextureFormat = 'bgra8unorm';

  // Pipelines
  private backgroundPipeline: GPURenderPipeline | null = null;
  private cubiePipeline: GPURenderPipeline | null = null;
  private particlePipeline: GPURenderPipeline | null = null;
  private victoryPipeline: GPURenderPipeline | null = null;

  // Buffers
  private backgroundUniformBuffer: GPUBuffer | null = null;
  private cubieUniformBuffer: GPUBuffer | null = null;
  private cubieStorageBuffer: GPUBuffer | null = null;
  private particleUniformBuffer: GPUBuffer | null = null;
  private particleStorageBuffer: GPUBuffer | null = null;
  private victoryUniformBuffer: GPUBuffer | null = null;

  // Bind Groups
  private backgroundBindGroup: GPUBindGroup | null = null;
  private cubieBindGroup: GPUBindGroup | null = null;
  private particleBindGroup: GPUBindGroup | null = null;
  private victoryBindGroup: GPUBindGroup | null = null;

  // Depth texture
  private depthTexture: GPUTexture | null = null;

  // State
  private time = 0;
  private cubies: CubieData[] = [];
  private cubieCount = 0;
  private particleSystem: ParticleSystem;
  private victoryProgress = 0;

  // View state
  private rotationX = -0.4;
  private rotationY = 0.5;

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
      this.createPipelines();
      this.createBuffers();

      return true;
    } catch (e) {
      console.warn('WebGPU init failed:', e);
      return false;
    }
  }

  private createDepthTexture(): void {
    if (!this.device) return;

    this.depthTexture = this.device.createTexture({
      size: {
        width: this.canvas.width,
        height: this.canvas.height,
      },
      format: 'depth24plus',
      usage: GPUTextureUsage.RENDER_ATTACHMENT,
    });
  }

  private createPipelines(): void {
    if (!this.device) return;

    // Background pipeline (no depth)
    const bgModule = this.device.createShaderModule({ code: backgroundShader });
    this.backgroundPipeline = this.device.createRenderPipeline({
      layout: 'auto',
      vertex: { module: bgModule, entryPoint: 'vertexMain' },
      fragment: {
        module: bgModule,
        entryPoint: 'fragmentMain',
        targets: [{ format: this.format }],
      },
      primitive: { topology: 'triangle-list' },
    });

    // Cubie pipeline (with depth)
    const cubieModule = this.device.createShaderModule({ code: cubieShader });
    this.cubiePipeline = this.device.createRenderPipeline({
      layout: 'auto',
      vertex: { module: cubieModule, entryPoint: 'vertexMain' },
      fragment: {
        module: cubieModule,
        entryPoint: 'fragmentMain',
        targets: [{
          format: this.format,
          blend: {
            color: { srcFactor: 'src-alpha', dstFactor: 'one-minus-src-alpha', operation: 'add' },
            alpha: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' },
          },
        }],
      },
      primitive: {
        topology: 'triangle-list',
        cullMode: 'back',
      },
      depthStencil: {
        format: 'depth24plus',
        depthWriteEnabled: true,
        depthCompare: 'less',
      },
    });

    // Particle pipeline (with depth read, no write)
    const particleModule = this.device.createShaderModule({ code: particleShader });
    this.particlePipeline = this.device.createRenderPipeline({
      layout: 'auto',
      vertex: { module: particleModule, entryPoint: 'vertexMain' },
      fragment: {
        module: particleModule,
        entryPoint: 'fragmentMain',
        targets: [{
          format: this.format,
          blend: {
            color: { srcFactor: 'src-alpha', dstFactor: 'one', operation: 'add' },
            alpha: { srcFactor: 'one', dstFactor: 'one', operation: 'add' },
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

    // Victory pipeline (overlay, no depth)
    const victoryModule = this.device.createShaderModule({ code: victoryShader });
    this.victoryPipeline = this.device.createRenderPipeline({
      layout: 'auto',
      vertex: { module: victoryModule, entryPoint: 'vertexMain' },
      fragment: {
        module: victoryModule,
        entryPoint: 'fragmentMain',
        targets: [{
          format: this.format,
          blend: {
            color: { srcFactor: 'src-alpha', dstFactor: 'one-minus-src-alpha', operation: 'add' },
            alpha: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' },
          },
        }],
      },
      primitive: { topology: 'triangle-list' },
    });
  }

  private createBuffers(): void {
    if (!this.device) return;

    // Background uniform buffer
    this.backgroundUniformBuffer = this.device.createBuffer({
      size: 16,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    // Cubie uniform buffer (viewProjection mat4 + time, count, pad, pad)
    this.cubieUniformBuffer = this.device.createBuffer({
      size: 64 + 16, // mat4x4 + 4 floats
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    // Cubie storage buffer (27 cubies * data)
    // Each cubie: mat4x4 transform (64 bytes) + 6 face colors (96 bytes) + 4 floats (16 bytes) = 176 bytes
    // Round up to 192 for alignment
    this.cubieStorageBuffer = this.device.createBuffer({
      size: 27 * 192,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });

    // Particle uniform buffer
    this.particleUniformBuffer = this.device.createBuffer({
      size: 64 + 16, // mat4x4 + 4 floats
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    // Particle storage buffer (16 floats per particle)
    this.particleStorageBuffer = this.device.createBuffer({
      size: 800 * 64,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });

    // Victory uniform buffer
    this.victoryUniformBuffer = this.device.createBuffer({
      size: 16,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    this.createBindGroups();
  }

  private createBindGroups(): void {
    if (!this.device) return;

    // Background bind group
    this.backgroundBindGroup = this.device.createBindGroup({
      layout: this.backgroundPipeline!.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: this.backgroundUniformBuffer! } },
      ],
    });

    // Cubie bind group
    this.cubieBindGroup = this.device.createBindGroup({
      layout: this.cubiePipeline!.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: this.cubieUniformBuffer! } },
        { binding: 1, resource: { buffer: this.cubieStorageBuffer! } },
      ],
    });

    // Particle bind group
    this.particleBindGroup = this.device.createBindGroup({
      layout: this.particlePipeline!.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: this.particleUniformBuffer! } },
        { binding: 1, resource: { buffer: this.particleStorageBuffer! } },
      ],
    });

    // Victory bind group
    this.victoryBindGroup = this.device.createBindGroup({
      layout: this.victoryPipeline!.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: this.victoryUniformBuffer! } },
      ],
    });
  }

  setViewRotation(rotX: number, rotY: number): void {
    this.rotationX = rotX;
    this.rotationY = rotY;
  }

  updateCubies(cubies: CubieData[]): void {
    this.cubies = cubies;
    this.cubieCount = cubies.length;

    if (!this.device || !this.cubieStorageBuffer || cubies.length === 0) return;

    // Pack cubie data: transform (16 floats) + 6 face colors (24 floats) + flags (4 floats) = 44 floats
    // Padded to 48 floats (192 bytes) for alignment
    const data = new Float32Array(cubies.length * 48);

    cubies.forEach((cubie, i) => {
      const offset = i * 48;

      // Transform matrix (16 floats)
      for (let j = 0; j < 16; j++) {
        data[offset + j] = cubie.transform[j];
      }

      // Face colors (6 * 4 = 24 floats)
      for (let f = 0; f < 6; f++) {
        const colorName = cubie.faceColors[f] || 'black';
        const color = FACE_COLOR_MAP[colorName] || FACE_COLOR_MAP['black'];
        data[offset + 16 + f * 4 + 0] = color[0];
        data[offset + 16 + f * 4 + 1] = color[1];
        data[offset + 16 + f * 4 + 2] = color[2];
        data[offset + 16 + f * 4 + 3] = color[3];
      }

      // Flags (4 floats)
      data[offset + 40] = cubie.isRotating ? 1.0 : 0.0;
      data[offset + 41] = cubie.rotationProgress;
      data[offset + 42] = 0;
      data[offset + 43] = 0;

      // Padding (4 floats)
      data[offset + 44] = 0;
      data[offset + 45] = 0;
      data[offset + 46] = 0;
      data[offset + 47] = 0;
    });

    this.device.queue.writeBuffer(this.cubieStorageBuffer, 0, data);
  }

  // Particle effects
  emitRotation(axis: 'x' | 'y' | 'z', layer: number, faceColor: [number, number, number]): void {
    this.particleSystem.emitRotation(axis, layer, faceColor);
  }

  emitScramble(): void {
    this.particleSystem.emitScramble();
  }

  emitComplete(): void {
    this.particleSystem.emitComplete();
  }

  emitTrail(x: number, y: number, z: number): void {
    this.particleSystem.emitTrail(x, y, z);
  }

  setVictory(progress: number): void {
    this.victoryProgress = progress;
  }

  clearParticles(): void {
    this.particleSystem.clear();
  }

  render(deltaTime: number): void {
    if (!this.device || !this.context || !this.depthTexture) return;

    this.time += deltaTime * 0.001;

    // Update particles
    this.particleSystem.update(deltaTime);
    this.particleSystem.emitAmbient();

    // Calculate view-projection matrix
    const aspect = this.canvas.width / this.canvas.height;
    const projection = mat4Perspective(Math.PI / 4, aspect, 0.1, 100);

    // View rotation
    const rotX = mat4RotateX(this.rotationX);
    const rotY = mat4RotateY(this.rotationY);
    const viewRotation = mat4Multiply(rotX, rotY);

    // Camera position
    const cameraDistance = 8;
    const view = mat4Identity();
    view[14] = -cameraDistance; // Translate back

    const viewRotated = mat4Multiply(view, viewRotation);
    const viewProjection = mat4Multiply(projection, viewRotated);

    // Update buffers
    this.updateBuffers(viewProjection);

    // Render
    const encoder = this.device.createCommandEncoder();
    const textureView = this.context.getCurrentTexture().createView();
    const depthView = this.depthTexture.createView();

    // Main render pass
    const renderPass = encoder.beginRenderPass({
      colorAttachments: [{
        view: textureView,
        clearValue: { r: 0.02, g: 0.01, b: 0.05, a: 1.0 },
        loadOp: 'clear',
        storeOp: 'store',
      }],
      depthStencilAttachment: {
        view: depthView,
        depthClearValue: 1.0,
        depthLoadOp: 'clear',
        depthStoreOp: 'store',
      },
    });

    // 1. Background
    renderPass.setPipeline(this.backgroundPipeline!);
    renderPass.setBindGroup(0, this.backgroundBindGroup!);
    renderPass.draw(6);

    // 2. Cubies
    if (this.cubieCount > 0) {
      renderPass.setPipeline(this.cubiePipeline!);
      renderPass.setBindGroup(0, this.cubieBindGroup!);
      renderPass.draw(36, this.cubieCount); // 6 faces * 6 vertices
    }

    // 3. Particles
    const particles = this.particleSystem.getParticles();
    if (particles.length > 0) {
      this.updateParticleBuffer(particles, viewProjection);
      renderPass.setPipeline(this.particlePipeline!);
      renderPass.setBindGroup(0, this.particleBindGroup!);
      renderPass.draw(6, particles.length);
    }

    renderPass.end();

    // Victory overlay pass (separate, no depth)
    if (this.victoryProgress > 0) {
      const victoryPass = encoder.beginRenderPass({
        colorAttachments: [{
          view: textureView,
          loadOp: 'load',
          storeOp: 'store',
        }],
      });

      victoryPass.setPipeline(this.victoryPipeline!);
      victoryPass.setBindGroup(0, this.victoryBindGroup!);
      victoryPass.draw(6);
      victoryPass.end();
    }

    this.device.queue.submit([encoder.finish()]);
  }

  private updateBuffers(viewProjection: Mat4): void {
    if (!this.device) return;

    const aspect = this.canvas.width / this.canvas.height;

    // Background uniforms
    this.device.queue.writeBuffer(
      this.backgroundUniformBuffer!,
      0,
      new Float32Array([this.time, aspect, 0, 0])
    );

    // Cubie uniforms (viewProjection + time, count)
    const cubieUniforms = new Float32Array(20);
    cubieUniforms.set(viewProjection, 0);
    cubieUniforms[16] = this.time;
    cubieUniforms[17] = this.cubieCount;
    cubieUniforms[18] = 0;
    cubieUniforms[19] = 0;
    this.device.queue.writeBuffer(this.cubieUniformBuffer!, 0, cubieUniforms);

    // Victory uniforms
    this.device.queue.writeBuffer(
      this.victoryUniformBuffer!,
      0,
      new Float32Array([this.time, this.victoryProgress, 0, 0])
    );
  }

  private updateParticleBuffer(particles: Particle[], viewProjection: Mat4): void {
    if (!this.device || !this.particleStorageBuffer || !this.particleUniformBuffer) return;

    // Particle uniforms
    const particleUniforms = new Float32Array(20);
    particleUniforms.set(viewProjection, 0);
    particleUniforms[16] = this.time;
    particleUniforms[17] = particles.length;
    particleUniforms[18] = 0;
    particleUniforms[19] = 0;
    this.device.queue.writeBuffer(this.particleUniformBuffer, 0, particleUniforms);

    // Particle data (16 floats per particle)
    const data = new Float32Array(particles.length * 16);
    const typeMap: Record<string, number> = {
      'rotation': 0,
      'scramble': 1,
      'complete': 2,
      'trail': 3,
      'ambient': 4,
    };

    particles.forEach((p, i) => {
      const offset = i * 16;
      data[offset + 0] = p.position[0];
      data[offset + 1] = p.position[1];
      data[offset + 2] = p.position[2];
      data[offset + 3] = p.size;
      data[offset + 4] = p.velocity[0];
      data[offset + 5] = p.velocity[1];
      data[offset + 6] = p.velocity[2];
      data[offset + 7] = p.life;
      data[offset + 8] = p.color[0];
      data[offset + 9] = p.color[1];
      data[offset + 10] = p.color[2];
      data[offset + 11] = p.color[3];
      data[offset + 12] = typeMap[p.type] ?? 0;
      data[offset + 13] = p.maxLife;
      data[offset + 14] = 0;
      data[offset + 15] = 0;
    });

    this.device.queue.writeBuffer(this.particleStorageBuffer, 0, data);
  }

  destroy(): void {
    this.backgroundUniformBuffer?.destroy();
    this.cubieUniformBuffer?.destroy();
    this.cubieStorageBuffer?.destroy();
    this.particleUniformBuffer?.destroy();
    this.particleStorageBuffer?.destroy();
    this.victoryUniformBuffer?.destroy();
    this.depthTexture?.destroy();
  }
}
