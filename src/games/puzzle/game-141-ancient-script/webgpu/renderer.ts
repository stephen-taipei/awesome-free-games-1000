/**
 * WebGPU Renderer - Ancient Script
 * Ancient Runes / Mystical Scrolls / Archaeology Theme
 * Game #141
 */

import { BACKGROUND_SHADER, PARTICLE_SHADER } from './shaders';
import { ParticleSystem } from './particles';
import { ANCIENT_COLORS, randomRange } from './math';

export class WebGPURenderer {
  private canvas: HTMLCanvasElement;
  private device!: GPUDevice;
  private context!: GPUCanvasContext;
  private format!: GPUTextureFormat;

  private backgroundPipeline!: GPURenderPipeline;
  private particlePipeline!: GPURenderPipeline;
  private uniformBuffer!: GPUBuffer;
  private particleBuffer!: GPUBuffer;
  private backgroundBindGroup!: GPUBindGroup;
  private particleBindGroup!: GPUBindGroup;

  private particleSystem: ParticleSystem;
  private startTime: number;
  private lastTime: number;
  private intensity: number = 1.0;
  private readonly MAX_PARTICLES = 600;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.particleSystem = new ParticleSystem(this.MAX_PARTICLES);
    this.startTime = performance.now() / 1000;
    this.lastTime = this.startTime;
  }

  async init(): Promise<boolean> {
    if (!navigator.gpu) {
      console.warn('WebGPU not supported');
      return false;
    }

    try {
      const adapter = await navigator.gpu.requestAdapter();
      if (!adapter) return false;

      this.device = await adapter.requestDevice();
      this.context = this.canvas.getContext('webgpu') as GPUCanvasContext;
      this.format = navigator.gpu.getPreferredCanvasFormat();

      this.context.configure({
        device: this.device,
        format: this.format,
        alphaMode: 'premultiplied',
      });

      this.resize(this.canvas.clientWidth, this.canvas.clientHeight);
      this.createResources();
      this.startRenderLoop();

      return true;
    } catch (e) {
      console.warn('WebGPU init failed:', e);
      return false;
    }
  }

  resize(width: number, height: number) {
    const dpr = Math.min(window.devicePixelRatio, 2);
    this.canvas.width = width * dpr;
    this.canvas.height = height * dpr;
  }

  private createResources() {
    // Uniform buffer
    this.uniformBuffer = this.device.createBuffer({
      size: 16,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    // Particle buffer
    this.particleBuffer = this.device.createBuffer({
      size: this.MAX_PARTICLES * 48,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });

    // Background pipeline
    const backgroundModule = this.device.createShaderModule({
      code: BACKGROUND_SHADER,
    });

    const backgroundBindGroupLayout = this.device.createBindGroupLayout({
      entries: [
        { binding: 0, visibility: GPUShaderStage.FRAGMENT, buffer: { type: 'uniform' } },
      ],
    });

    this.backgroundPipeline = this.device.createRenderPipeline({
      layout: this.device.createPipelineLayout({
        bindGroupLayouts: [backgroundBindGroupLayout],
      }),
      vertex: {
        module: backgroundModule,
        entryPoint: 'vertexMain',
      },
      fragment: {
        module: backgroundModule,
        entryPoint: 'fragmentMain',
        targets: [{ format: this.format }],
      },
      primitive: { topology: 'triangle-strip' },
    });

    this.backgroundBindGroup = this.device.createBindGroup({
      layout: backgroundBindGroupLayout,
      entries: [
        { binding: 0, resource: { buffer: this.uniformBuffer } },
      ],
    });

    // Particle pipeline
    const particleModule = this.device.createShaderModule({
      code: PARTICLE_SHADER,
    });

    const particleBindGroupLayout = this.device.createBindGroupLayout({
      entries: [
        { binding: 0, visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT, buffer: { type: 'uniform' } },
        { binding: 1, visibility: GPUShaderStage.VERTEX, buffer: { type: 'read-only-storage' } },
      ],
    });

    this.particlePipeline = this.device.createRenderPipeline({
      layout: this.device.createPipelineLayout({
        bindGroupLayouts: [particleBindGroupLayout],
      }),
      vertex: {
        module: particleModule,
        entryPoint: 'vertexMain',
      },
      fragment: {
        module: particleModule,
        entryPoint: 'fragmentMain',
        targets: [{
          format: this.format,
          blend: {
            color: {
              srcFactor: 'src-alpha',
              dstFactor: 'one-minus-src-alpha',
              operation: 'add',
            },
            alpha: {
              srcFactor: 'one',
              dstFactor: 'one-minus-src-alpha',
              operation: 'add',
            },
          },
        }],
      },
      primitive: { topology: 'triangle-strip' },
    });

    this.particleBindGroup = this.device.createBindGroup({
      layout: particleBindGroupLayout,
      entries: [
        { binding: 0, resource: { buffer: this.uniformBuffer } },
        { binding: 1, resource: { buffer: this.particleBuffer } },
      ],
    });
  }

  private startRenderLoop() {
    const render = () => {
      const currentTime = performance.now() / 1000;
      const deltaTime = currentTime - this.lastTime;
      this.lastTime = currentTime;

      this.particleSystem.update(deltaTime);
      this.renderFrame(currentTime - this.startTime);
      requestAnimationFrame(render);
    };
    requestAnimationFrame(render);
  }

  private renderFrame(time: number) {
    const uniforms = new Float32Array([
      time,
      this.canvas.width / this.canvas.height,
      this.intensity,
      0,
    ]);
    this.device.queue.writeBuffer(this.uniformBuffer, 0, uniforms);

    // Update particle buffer
    const particles = this.particleSystem.getParticles();
    const particleData = new Float32Array(this.MAX_PARTICLES * 12);

    particles.forEach((p, i) => {
      const offset = i * 12;
      particleData[offset] = p.position[0];
      particleData[offset + 1] = p.position[1];
      particleData[offset + 2] = p.velocity[0];
      particleData[offset + 3] = p.velocity[1];
      particleData[offset + 4] = p.color[0];
      particleData[offset + 5] = p.color[1];
      particleData[offset + 6] = p.color[2];
      particleData[offset + 7] = p.color[3];
      particleData[offset + 8] = p.size;
      particleData[offset + 9] = p.life;
      particleData[offset + 10] = p.maxLife;
      particleData[offset + 11] = p.particleType;
    });

    this.device.queue.writeBuffer(this.particleBuffer, 0, particleData);

    const commandEncoder = this.device.createCommandEncoder();
    const textureView = this.context.getCurrentTexture().createView();

    const renderPass = commandEncoder.beginRenderPass({
      colorAttachments: [{
        view: textureView,
        clearValue: { r: 0.1, g: 0.08, b: 0.06, a: 1 },
        loadOp: 'clear',
        storeOp: 'store',
      }],
    });

    // Draw background
    renderPass.setPipeline(this.backgroundPipeline);
    renderPass.setBindGroup(0, this.backgroundBindGroup);
    renderPass.draw(4);

    // Draw particles
    if (particles.length > 0) {
      renderPass.setPipeline(this.particlePipeline);
      renderPass.setBindGroup(0, this.particleBindGroup);
      renderPass.draw(4, particles.length);
    }

    renderPass.end();
    this.device.queue.submit([commandEncoder.finish()]);
  }

  // Effect methods
  emitRuneGlow(x: number, y: number) {
    this.particleSystem.emit(x, y, 'runeGlow', 5, {
      spread: 0.03,
    });
  }

  emitDecodeSparkle(x: number, y: number) {
    // Sparkle effect when letter is decoded
    this.particleSystem.emit(x, y, 'decodeSparkle', 15, {
      spread: 0.05,
      velocityRange: { x: [-0.2, 0.2], y: [-0.2, 0.2] },
    });

    // Rune glow
    this.particleSystem.emit(x, y, 'runeGlow', 5, {
      spread: 0.02,
      sizeRange: [1.0, 1.8],
    });
  }

  emitKeyPress(x: number, y: number) {
    // Small sparkle on key press
    this.particleSystem.emit(x, y, 'decodeSparkle', 5, {
      spread: 0.02,
      sizeRange: [0.3, 0.6],
    });
  }

  emitSubmitCorrect(x: number, y: number) {
    // Success reveal flash
    this.particleSystem.emit(x, y, 'revealFlash', 10, {
      spread: 0.1,
      color: [...ANCIENT_COLORS.successGreen],
    });

    // Sparkles
    this.particleSystem.emit(x, y, 'decodeSparkle', 25, {
      spread: 0.15,
      velocityRange: { x: [-0.25, 0.25], y: [-0.25, 0.25] },
    });

    // Rune glows
    for (let i = 0; i < 5; i++) {
      const angle = (i / 5) * Math.PI * 2;
      const rx = x + Math.cos(angle) * 0.1;
      const ry = y + Math.sin(angle) * 0.1;
      this.particleSystem.emit(rx, ry, 'runeGlow', 3, {
        sizeRange: [1.2, 2.0],
      });
    }
  }

  emitSubmitWrong(x: number, y: number) {
    // Error effect
    this.particleSystem.emit(x, y, 'inkDrip', 15, {
      spread: 0.1,
      color: [...ANCIENT_COLORS.errorRed],
    });
  }

  emitAmbient() {
    // Random dust particles
    if (Math.random() < 0.3) {
      this.particleSystem.emit(
        randomRange(0.1, 0.9),
        randomRange(0.1, 0.9),
        'ancientDust',
        1
      );
    }

    // Torch flames in corners
    if (Math.random() < 0.4) {
      const corners = [
        [0.05, 0.05],
        [0.95, 0.05],
        [0.05, 0.95],
        [0.95, 0.95],
      ];
      const corner = corners[Math.floor(Math.random() * corners.length)];
      this.particleSystem.emit(corner[0], corner[1], 'scrollFlame', 2, {
        spread: 0.02,
      });
    }
  }

  emitLevelStart() {
    const cx = 0.5, cy = 0.5;

    // Mystical reveal
    for (let i = 0; i < 4; i++) {
      setTimeout(() => {
        this.particleSystem.emit(cx, cy, 'revealFlash', 3, {
          sizeRange: [2.0, 3.0],
          color: [...ANCIENT_COLORS.runeGold],
        });

        // Rune glows radiating outward
        for (let j = 0; j < 8; j++) {
          const angle = (j / 8) * Math.PI * 2;
          const radius = 0.05 + i * 0.04;
          const rx = cx + Math.cos(angle) * radius;
          const ry = cy + Math.sin(angle) * radius;
          this.particleSystem.emit(rx, ry, 'runeGlow', 2);
        }
      }, i * 100);
    }

    // Dust burst
    this.particleSystem.emit(cx, cy, 'ancientDust', 20, {
      spread: 0.2,
      velocityRange: { x: [-0.08, 0.08], y: [-0.08, 0.08] },
    });
  }

  emitReset() {
    const cx = 0.5, cy = 0.5;

    // Ink drip effect for reset
    this.particleSystem.emit(cx, cy, 'inkDrip', 15, {
      spread: 0.15,
    });

    // Dust settling
    for (let i = 0; i < 10; i++) {
      this.particleSystem.emit(
        randomRange(0.2, 0.8),
        randomRange(0.2, 0.8),
        'ancientDust',
        2
      );
    }
  }

  emitLevelComplete() {
    const cx = 0.5, cy = 0.5;

    // Grand reveal
    for (let wave = 0; wave < 4; wave++) {
      setTimeout(() => {
        // Flash wave
        this.particleSystem.emit(cx, cy, 'revealFlash', 8, {
          spread: 0.1 + wave * 0.03,
          sizeRange: [2.0, 3.5],
          color: [...ANCIENT_COLORS.successGreen],
        });

        // Sparkle ring
        for (let i = 0; i < 12; i++) {
          const angle = (i / 12) * Math.PI * 2;
          const radius = 0.1 + wave * 0.04;
          const x = cx + Math.cos(angle) * radius;
          const y = cy + Math.sin(angle) * radius;

          this.particleSystem.emit(x, y, 'decodeSparkle', 4, {
            spread: 0.02,
          });
        }
      }, wave * 150);
    }

    // Golden dust
    this.particleSystem.emit(cx, cy, 'ancientDust', 30, {
      spread: 0.2,
      velocityRange: { x: [-0.1, 0.1], y: [-0.1, 0.1] },
      color: [...ANCIENT_COLORS.runeGold],
    });
  }

  emitVictory() {
    // Epic victory celebration
    for (let wave = 0; wave < 6; wave++) {
      setTimeout(() => {
        // Massive reveal flash
        this.particleSystem.emit(0.5, 0.5, 'revealFlash', 10, {
          sizeRange: [3.0, 5.0],
          color: [...ANCIENT_COLORS.runeGold],
        });

        // Rune glows everywhere
        for (let i = 0; i < 15; i++) {
          const angle = (i / 15) * Math.PI * 2 + wave * 0.3;
          const radius = 0.1 + wave * 0.05;
          const x = 0.5 + Math.cos(angle) * radius;
          const y = 0.5 + Math.sin(angle) * radius;

          this.particleSystem.emit(x, y, 'runeGlow', 3, {
            spread: 0.02,
            sizeRange: [1.5, 2.5],
          });
          this.particleSystem.emit(x, y, 'decodeSparkle', 5, {
            spread: 0.03,
          });
        }

        // Torch bursts
        const corners = [[0.1, 0.1], [0.9, 0.1], [0.1, 0.9], [0.9, 0.9]];
        corners.forEach(([cx, cy]) => {
          this.particleSystem.emit(cx, cy, 'scrollFlame', 8, {
            spread: 0.04,
            sizeRange: [0.6, 1.2],
          });
        });
      }, wave * 180);
    }

    // Continuous golden dust rain
    for (let i = 0; i < 50; i++) {
      setTimeout(() => {
        this.particleSystem.emit(
          randomRange(0.1, 0.9),
          randomRange(0.1, 0.9),
          'ancientDust',
          3,
          { color: [...ANCIENT_COLORS.runeGold] }
        );
      }, i * 40);
    }
  }

  setIntensity(value: number) {
    this.intensity = value;
  }

  destroy() {
    this.particleSystem.clear();
  }
}
