/**
 * WebGPU Renderer - Cell Division
 * Biology / Microbiology Theme
 * Game #126
 */

import { BACKGROUND_SHADER, PARTICLE_SHADER } from "./shaders";
import { ParticleSystem } from "./particles";

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
  private animationId: number = 0;

  private focusX: number = 0.5;
  private focusY: number = 0.5;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.particleSystem = new ParticleSystem();
    this.startTime = performance.now();
    this.lastTime = this.startTime;
  }

  async init(): Promise<boolean> {
    if (!navigator.gpu) {
      console.log("WebGPU not supported");
      return false;
    }

    try {
      const adapter = await navigator.gpu.requestAdapter();
      if (!adapter) {
        console.log("No GPU adapter found");
        return false;
      }

      this.device = await adapter.requestDevice();
      this.context = this.canvas.getContext("webgpu") as GPUCanvasContext;
      this.format = navigator.gpu.getPreferredCanvasFormat();

      this.context.configure({
        device: this.device,
        format: this.format,
        alphaMode: "premultiplied",
      });

      this.resize(this.canvas.clientWidth, this.canvas.clientHeight);
      this.createResources();
      this.startRenderLoop();

      return true;
    } catch (e) {
      console.error("WebGPU init failed:", e);
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
      size: 600 * 12 * 4,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });

    // Background pipeline
    const backgroundModule = this.device.createShaderModule({
      code: BACKGROUND_SHADER,
    });

    const backgroundBindGroupLayout = this.device.createBindGroupLayout({
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.FRAGMENT,
          buffer: { type: "uniform" },
        },
      ],
    });

    this.backgroundPipeline = this.device.createRenderPipeline({
      layout: this.device.createPipelineLayout({
        bindGroupLayouts: [backgroundBindGroupLayout],
      }),
      vertex: {
        module: backgroundModule,
        entryPoint: "vertexMain",
      },
      fragment: {
        module: backgroundModule,
        entryPoint: "fragmentMain",
        targets: [{ format: this.format }],
      },
      primitive: { topology: "triangle-strip" },
    });

    this.backgroundBindGroup = this.device.createBindGroup({
      layout: backgroundBindGroupLayout,
      entries: [
        {
          binding: 0,
          resource: { buffer: this.uniformBuffer },
        },
      ],
    });

    // Particle pipeline
    const particleModule = this.device.createShaderModule({
      code: PARTICLE_SHADER,
    });

    const particleBindGroupLayout = this.device.createBindGroupLayout({
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.VERTEX,
          buffer: { type: "uniform" },
        },
        {
          binding: 1,
          visibility: GPUShaderStage.VERTEX,
          buffer: { type: "read-only-storage" },
        },
      ],
    });

    this.particlePipeline = this.device.createRenderPipeline({
      layout: this.device.createPipelineLayout({
        bindGroupLayouts: [particleBindGroupLayout],
      }),
      vertex: {
        module: particleModule,
        entryPoint: "vertexMain",
      },
      fragment: {
        module: particleModule,
        entryPoint: "fragmentMain",
        targets: [
          {
            format: this.format,
            blend: {
              color: {
                srcFactor: "src-alpha",
                dstFactor: "one",
                operation: "add",
              },
              alpha: {
                srcFactor: "one",
                dstFactor: "one",
                operation: "add",
              },
            },
          },
        ],
      },
      primitive: { topology: "triangle-strip" },
    });

    this.particleBindGroup = this.device.createBindGroup({
      layout: particleBindGroupLayout,
      entries: [
        {
          binding: 0,
          resource: { buffer: this.uniformBuffer },
        },
        {
          binding: 1,
          resource: { buffer: this.particleBuffer },
        },
      ],
    });
  }

  private startRenderLoop() {
    const render = () => {
      const now = performance.now();
      const deltaTime = (now - this.lastTime) / 1000;
      this.lastTime = now;

      this.particleSystem.update(deltaTime);
      this.render();

      this.animationId = requestAnimationFrame(render);
    };

    render();
  }

  private render() {
    const time = (performance.now() - this.startTime) / 1000;
    const aspectRatio = this.canvas.width / this.canvas.height;

    // Update uniforms
    const uniformData = new Float32Array([
      time,
      aspectRatio,
      this.focusX,
      this.focusY,
    ]);
    this.device.queue.writeBuffer(this.uniformBuffer, 0, uniformData);

    // Update particles
    const particleData = this.particleSystem.getParticleData();
    if (particleData.length > 0) {
      this.device.queue.writeBuffer(this.particleBuffer, 0, particleData);
    }

    const commandEncoder = this.device.createCommandEncoder();
    const textureView = this.context.getCurrentTexture().createView();

    const renderPass = commandEncoder.beginRenderPass({
      colorAttachments: [
        {
          view: textureView,
          clearValue: { r: 0.02, g: 0.05, b: 0.03, a: 1 },
          loadOp: "clear",
          storeOp: "store",
        },
      ],
    });

    // Draw background
    renderPass.setPipeline(this.backgroundPipeline);
    renderPass.setBindGroup(0, this.backgroundBindGroup);
    renderPass.draw(4);

    // Draw particles
    const particleCount = this.particleSystem.getParticleCount();
    if (particleCount > 0) {
      renderPass.setPipeline(this.particlePipeline);
      renderPass.setBindGroup(0, this.particleBindGroup);
      renderPass.draw(4, particleCount);
    }

    renderPass.end();
    this.device.queue.submit([commandEncoder.finish()]);
  }

  setFocusPosition(x: number, y: number) {
    this.focusX = x;
    this.focusY = y;
  }

  // Cell selected
  emitCellSelect(x: number, y: number, isPlayer: boolean) {
    this.particleSystem.emitCellSelect(x, y, isPlayer);
  }

  // Cell division
  emitCellDivide(
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
    isPlayer: boolean
  ) {
    this.particleSystem.emitCellDivide(fromX, fromY, toX, toY, isPlayer);
  }

  // Cell attack
  emitCellAttack(
    fromX: number,
    fromY: number,
    toX: number,
    toY: number
  ) {
    this.particleSystem.emitCellAttack(fromX, fromY, toX, toY);
  }

  // Cell energy growth
  emitCellGrow(x: number, y: number, energyLevel: number) {
    this.particleSystem.emitCellGrow(x, y, energyLevel);
  }

  // Enemy move
  emitEnemyMove(fromX: number, fromY: number, toX: number, toY: number) {
    this.particleSystem.emitEnemyMove(fromX, fromY, toX, toY);
  }

  // Victory
  emitVictory() {
    this.particleSystem.emitVictory(0.5, 0.5);
  }

  // Level start
  emitLevelStart() {
    this.particleSystem.emitLevelStart(0.5, 0.5);
  }

  // Reset
  emitReset() {
    this.particleSystem.emitReset(0.5, 0.5);
  }

  // Ambient particles
  emitAmbient() {
    this.particleSystem.emitAmbient();
  }

  destroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    this.particleSystem.clear();
  }
}
