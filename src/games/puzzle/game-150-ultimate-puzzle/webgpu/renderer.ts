/**
 * WebGPU Renderer - Ultimate Puzzle
 * Ultimate / Prismatic / Rainbow Theme
 * Game #150 (Milestone!)
 */

import { BACKGROUND_SHADER, PARTICLE_SHADER } from './shaders';
import { ParticleSystem, Particle } from './particles';
import { ULTIMATE_COLORS, rainbowColor } from './math';

export class WebGPURenderer {
  private canvas: HTMLCanvasElement;
  private device!: GPUDevice;
  private context!: GPUCanvasContext;
  private format!: GPUTextureFormat;

  private backgroundPipeline!: GPURenderPipeline;
  private particlePipeline!: GPURenderPipeline;

  private uniformBuffer!: GPUBuffer;
  private uniformBindGroup!: GPUBindGroup;

  private particleBuffer!: GPUBuffer;
  private particleBindGroup!: GPUBindGroup;

  private particleSystem: ParticleSystem;
  private startTime: number;
  private lastTime: number;
  private animationId: number | null = null;

  private phase: number = 0;
  private energy: number = 0.5;

  private readonly MAX_PARTICLES = 600;
  private readonly PARTICLE_STRIDE = 48; // bytes per particle

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.particleSystem = new ParticleSystem(this.MAX_PARTICLES);
    this.startTime = performance.now() / 1000;
    this.lastTime = this.startTime;
  }

  async init(): Promise<boolean> {
    if (!navigator.gpu) {
      console.log('WebGPU not supported');
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
      this.createPipelines();
      this.createBuffers();
      this.startRenderLoop();

      return true;
    } catch (e) {
      console.error('WebGPU init error:', e);
      return false;
    }
  }

  resize(width: number, height: number) {
    const dpr = Math.min(window.devicePixelRatio, 2);
    this.canvas.width = width * dpr;
    this.canvas.height = height * dpr;
  }

  private createPipelines() {
    // Background pipeline
    const bgShaderModule = this.device.createShaderModule({
      code: BACKGROUND_SHADER,
    });

    this.backgroundPipeline = this.device.createRenderPipeline({
      layout: 'auto',
      vertex: {
        module: bgShaderModule,
        entryPoint: 'vertexMain',
      },
      fragment: {
        module: bgShaderModule,
        entryPoint: 'fragmentMain',
        targets: [{ format: this.format }],
      },
      primitive: { topology: 'triangle-strip' },
    });

    // Particle pipeline
    const particleShaderModule = this.device.createShaderModule({
      code: PARTICLE_SHADER,
    });

    this.particlePipeline = this.device.createRenderPipeline({
      layout: 'auto',
      vertex: {
        module: particleShaderModule,
        entryPoint: 'vertexMain',
      },
      fragment: {
        module: particleShaderModule,
        entryPoint: 'fragmentMain',
        targets: [{
          format: this.format,
          blend: {
            color: {
              srcFactor: 'src-alpha',
              dstFactor: 'one',
              operation: 'add',
            },
            alpha: {
              srcFactor: 'one',
              dstFactor: 'one',
              operation: 'add',
            },
          },
        }],
      },
      primitive: { topology: 'triangle-strip' },
    });
  }

  private createBuffers() {
    // Uniform buffer (time, aspectRatio, phase, energy)
    this.uniformBuffer = this.device.createBuffer({
      size: 16,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    this.uniformBindGroup = this.device.createBindGroup({
      layout: this.backgroundPipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: this.uniformBuffer } },
      ],
    });

    // Particle buffer
    this.particleBuffer = this.device.createBuffer({
      size: this.MAX_PARTICLES * this.PARTICLE_STRIDE,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });

    this.particleBindGroup = this.device.createBindGroup({
      layout: this.particlePipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: this.uniformBuffer } },
        { binding: 1, resource: { buffer: this.particleBuffer } },
      ],
    });
  }

  private startRenderLoop() {
    const render = () => {
      const now = performance.now() / 1000;
      const deltaTime = Math.min(now - this.lastTime, 0.1);
      this.lastTime = now;

      this.particleSystem.update(deltaTime);
      this.render(now - this.startTime);
      this.animationId = requestAnimationFrame(render);
    };
    render();
  }

  private render(time: number) {
    const aspectRatio = this.canvas.width / this.canvas.height;

    // Update uniforms
    const uniformData = new Float32Array([time, aspectRatio, this.phase, this.energy]);
    this.device.queue.writeBuffer(this.uniformBuffer, 0, uniformData);

    // Update particle buffer
    const particles = this.particleSystem.getParticles();
    if (particles.length > 0) {
      const particleData = new Float32Array(particles.length * 12);
      particles.forEach((p, i) => {
        const offset = i * 12;
        particleData[offset + 0] = p.position[0];
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
    }

    const commandEncoder = this.device.createCommandEncoder();
    const textureView = this.context.getCurrentTexture().createView();

    const renderPass = commandEncoder.beginRenderPass({
      colorAttachments: [{
        view: textureView,
        clearValue: { r: 0.08, g: 0.10, b: 0.15, a: 1.0 },
        loadOp: 'clear',
        storeOp: 'store',
      }],
    });

    // Draw background
    renderPass.setPipeline(this.backgroundPipeline);
    renderPass.setBindGroup(0, this.uniformBindGroup);
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

  // === Event emission methods ===

  setPhase(phase: number) {
    this.phase = phase;
  }

  setEnergy(energy: number) {
    this.energy = energy;
  }

  emitColorMatch(x: number, y: number, colorHue: number) {
    // Emit sparks in the color's hue
    const color = rainbowColor(colorHue);
    this.particleSystem.emit(x, y, 'prismaticSpark', 15, {
      spread: 0.8,
      sizeRange: [0.8, 1.8],
      lifeRange: [0.5, 1.0],
      color,
    });

    // Rainbow trail
    this.particleSystem.emit(x, y, 'rainbowTrail', 8, {
      spread: 0.5,
      sizeRange: [0.6, 1.2],
      lifeRange: [0.6, 1.2],
    });
  }

  emitColorSelect(x: number, y: number) {
    this.particleSystem.emit(x, y, 'phaseGlow', 10, {
      spread: 0.3,
      sizeRange: [0.5, 1.0],
      lifeRange: [0.4, 0.8],
      phase: 0,
    });
  }

  emitPathRotate(x: number, y: number) {
    // Rotating arc effect
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      this.particleSystem.emit(x, y, 'phaseGlow', 2, {
        baseVelocity: [Math.cos(angle) * 0.5, Math.sin(angle) * 0.5],
        spread: 0.1,
        sizeRange: [0.4, 0.8],
        lifeRange: [0.3, 0.6],
        phase: 0.5,
      });
    }
  }

  emitPathConnect(x: number, y: number) {
    this.particleSystem.emit(x, y, 'prismaticSpark', 12, {
      spread: 0.6,
      sizeRange: [0.6, 1.4],
      lifeRange: [0.5, 1.0],
      color: [...ULTIMATE_COLORS.pathPhase] as [number, number, number, number],
    });
  }

  emitSortSelect(x: number, y: number) {
    this.particleSystem.emit(x, y, 'phaseGlow', 8, {
      spread: 0.2,
      sizeRange: [0.4, 0.9],
      lifeRange: [0.3, 0.7],
      phase: 1.0,
    });
  }

  emitSortSwap(x1: number, y1: number, x2: number, y2: number) {
    // Trail between positions
    const steps = 10;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = x1 + (x2 - x1) * t;
      const y = y1 + (y2 - y1) * t;
      this.particleSystem.emit(x, y, 'rainbowTrail', 2, {
        spread: 0.2,
        sizeRange: [0.4, 0.8],
        lifeRange: [0.4, 0.8],
      });
    }
  }

  emitPhaseComplete() {
    // Celebration burst
    for (let i = 0; i < 20; i++) {
      const angle = (i / 20) * Math.PI * 2;
      this.particleSystem.emit(0.5, 0.5, 'victoryBurst', 3, {
        baseVelocity: [Math.cos(angle) * 0.8, Math.sin(angle) * 0.8],
        spread: 0.2,
        sizeRange: [0.8, 1.5],
        lifeRange: [0.8, 1.5],
      });
    }

    // Rainbow wave
    this.particleSystem.emit(0.5, 0.5, 'transitionWave', 25, {
      spread: 1.2,
      sizeRange: [0.5, 1.2],
      lifeRange: [0.8, 1.4],
    });

    this.energy = 1.0;
    setTimeout(() => { this.energy = 0.5; }, 1000);
  }

  emitPhaseTransition(fromPhase: number, toPhase: number) {
    // Wave of particles transitioning
    for (let i = 0; i < 30; i++) {
      const x = Math.random();
      const y = Math.random();
      this.particleSystem.emit(x, y, 'transitionWave', 2, {
        baseVelocity: [0, 0.3],
        spread: 0.3,
        sizeRange: [0.4, 0.9],
        lifeRange: [0.6, 1.2],
      });
    }

    // Set new phase
    this.phase = toPhase / 3;
  }

  emitAmbient() {
    // Cosmic dust floating
    for (let i = 0; i < 2; i++) {
      this.particleSystem.emit(
        Math.random(),
        Math.random(),
        'cosmicDust',
        1,
        {
          baseVelocity: [(Math.random() - 0.5) * 0.05, (Math.random() - 0.5) * 0.05],
          spread: 0.02,
          sizeRange: [0.2, 0.5],
          lifeRange: [2.0, 4.0],
        }
      );
    }
  }

  emitLevelStart() {
    // Prismatic burst from center
    for (let i = 0; i < 30; i++) {
      const angle = (i / 30) * Math.PI * 2;
      this.particleSystem.emit(0.5, 0.5, 'prismaticSpark', 2, {
        baseVelocity: [Math.cos(angle) * 0.6, Math.sin(angle) * 0.6],
        spread: 0.1,
        sizeRange: [0.5, 1.2],
        lifeRange: [0.6, 1.2],
      });
    }

    this.phase = 0;
    this.energy = 0.8;
    setTimeout(() => { this.energy = 0.5; }, 500);
  }

  emitReset() {
    // Swirl effect
    for (let i = 0; i < 20; i++) {
      const angle = (i / 20) * Math.PI * 2;
      const r = 0.2 + (i / 20) * 0.2;
      this.particleSystem.emit(
        0.5 + Math.cos(angle) * r,
        0.5 + Math.sin(angle) * r,
        'transitionWave',
        2,
        {
          baseVelocity: [Math.sin(angle) * 0.3, -Math.cos(angle) * 0.3],
          spread: 0.1,
          sizeRange: [0.4, 0.8],
          lifeRange: [0.5, 1.0],
        }
      );
    }

    this.phase = 0;
  }

  emitLevelComplete() {
    // Ultimate celebration
    for (let wave = 0; wave < 3; wave++) {
      setTimeout(() => {
        for (let i = 0; i < 25; i++) {
          const angle = (i / 25) * Math.PI * 2;
          this.particleSystem.emit(0.5, 0.5, 'victoryBurst', 3, {
            baseVelocity: [Math.cos(angle) * (0.5 + wave * 0.2), Math.sin(angle) * (0.5 + wave * 0.2)],
            spread: 0.15,
            sizeRange: [0.8, 1.6],
            lifeRange: [0.8, 1.5],
          });
        }
      }, wave * 200);
    }

    this.energy = 1.0;
  }

  emitVictory() {
    // Mega prismatic explosion
    const interval = setInterval(() => {
      for (let i = 0; i < 40; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 0.3 + Math.random() * 0.7;
        const x = 0.3 + Math.random() * 0.4;
        const y = 0.3 + Math.random() * 0.4;
        this.particleSystem.emit(x, y, 'victoryBurst', 2, {
          baseVelocity: [Math.cos(angle) * speed, Math.sin(angle) * speed],
          spread: 0.2,
          sizeRange: [1.0, 2.0],
          lifeRange: [1.0, 2.0],
        });
      }

      // Rainbow waves
      for (let i = 0; i < 15; i++) {
        this.particleSystem.emit(
          Math.random(),
          Math.random(),
          'transitionWave',
          3,
          {
            spread: 0.8,
            sizeRange: [0.6, 1.4],
            lifeRange: [0.8, 1.6],
          }
        );
      }
    }, 100);

    setTimeout(() => clearInterval(interval), 2500);
    this.energy = 1.0;
  }

  destroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    this.particleSystem.clear();
  }
}
