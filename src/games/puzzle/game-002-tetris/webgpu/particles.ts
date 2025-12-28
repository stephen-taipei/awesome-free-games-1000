/**
 * WebGPU 粒子系統 - 俄羅斯方塊
 * 消行爆炸、硬降衝擊特效
 */

import { shaders } from './shaders';

interface Particle {
  position: [number, number, number];
  velocity: [number, number, number];
  color: [number, number, number, number];
  size: number;
  life: number;
  maxLife: number;
}

export class ParticleSystem {
  private device: GPUDevice;
  private pipeline!: GPURenderPipeline;
  private vertexBuffer!: GPUBuffer;
  private particles: Particle[] = [];
  private maxParticles = 800;

  constructor(device: GPUDevice) {
    this.device = device;
  }

  async init() {
    const shaderModule = this.device.createShaderModule({
      code: shaders.particle
    });

    this.pipeline = this.device.createRenderPipeline({
      layout: 'auto',
      vertex: {
        module: shaderModule,
        entryPoint: 'vertexMain',
        buffers: [{
          arrayStride: 48,
          stepMode: 'instance',
          attributes: [
            { shaderLocation: 0, offset: 0, format: 'float32x3' },
            { shaderLocation: 1, offset: 12, format: 'float32x3' },
            { shaderLocation: 2, offset: 24, format: 'float32x4' },
            { shaderLocation: 3, offset: 40, format: 'float32' },
            { shaderLocation: 4, offset: 44, format: 'float32' },
          ]
        }]
      },
      fragment: {
        module: shaderModule,
        entryPoint: 'fragmentMain',
        targets: [{
          format: navigator.gpu.getPreferredCanvasFormat(),
          blend: {
            color: {
              srcFactor: 'src-alpha',
              dstFactor: 'one',
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
        topology: 'triangle-strip'
      },
      depthStencil: {
        format: 'depth24plus',
        depthWriteEnabled: false,
        depthCompare: 'less'
      }
    });

    this.vertexBuffer = this.device.createBuffer({
      size: this.maxParticles * 48,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
    });
  }

  emit(
    x: number,
    y: number,
    z: number,
    count: number,
    color: [number, number, number, number]
  ) {
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) {
        this.particles.shift();
      }

      // 爆炸分布
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const speed = 3 + Math.random() * 5;

      const vx = Math.sin(phi) * Math.cos(theta) * speed;
      const vy = Math.abs(Math.sin(phi) * Math.sin(theta)) * speed * 1.5 + 2;
      const vz = Math.cos(phi) * speed * 0.5;

      const life = 0.4 + Math.random() * 0.8;

      // 顏色變化
      const variation = 0.15;
      const r = Math.min(1, Math.max(0, color[0] + (Math.random() - 0.5) * variation));
      const g = Math.min(1, Math.max(0, color[1] + (Math.random() - 0.5) * variation));
      const b = Math.min(1, Math.max(0, color[2] + (Math.random() - 0.5) * variation));

      this.particles.push({
        position: [x, y, z],
        velocity: [vx, vy, vz],
        color: [r, g, b, color[3]],
        size: 0.08 + Math.random() * 0.12,
        life: life,
        maxLife: life
      });
    }
  }

  // 消行爆炸 - 橫向散開
  emitLineClear(y: number, width: number, color: [number, number, number, number]) {
    for (let x = 0; x < width; x++) {
      for (let i = 0; i < 5; i++) {
        if (this.particles.length >= this.maxParticles) {
          this.particles.shift();
        }

        const speed = 2 + Math.random() * 3;
        const angle = (Math.random() - 0.5) * Math.PI * 0.5;

        const vx = Math.cos(angle) * speed * (Math.random() > 0.5 ? 1 : -1);
        const vy = Math.sin(angle) * speed + 1;
        const vz = (Math.random() - 0.5) * speed * 0.5;

        const life = 0.5 + Math.random() * 0.5;

        this.particles.push({
          position: [x + 0.5, y, 0.5],
          velocity: [vx, vy, vz],
          color: [...color],
          size: 0.1 + Math.random() * 0.1,
          life: life,
          maxLife: life
        });
      }
    }
  }

  update(deltaTime: number) {
    const gravity = -12;

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];

      // 更新位置
      p.position[0] += p.velocity[0] * deltaTime;
      p.position[1] += p.velocity[1] * deltaTime;
      p.position[2] += p.velocity[2] * deltaTime;

      // 重力
      p.velocity[1] += gravity * deltaTime;

      // 空氣阻力
      p.velocity[0] *= 0.98;
      p.velocity[2] *= 0.98;

      // 更新生命值
      p.life -= deltaTime;

      // 移除死亡粒子
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  render(renderPass: GPURenderPassEncoder, uniformBindGroup: GPUBindGroup) {
    if (this.particles.length === 0) return;

    const data = new Float32Array(this.particles.length * 12);

    this.particles.forEach((p, i) => {
      const baseIdx = i * 12;
      const lifeRatio = p.life / p.maxLife;

      data[baseIdx] = p.position[0];
      data[baseIdx + 1] = p.position[1];
      data[baseIdx + 2] = p.position[2];
      data[baseIdx + 3] = p.velocity[0];
      data[baseIdx + 4] = p.velocity[1];
      data[baseIdx + 5] = p.velocity[2];
      data[baseIdx + 6] = p.color[0];
      data[baseIdx + 7] = p.color[1];
      data[baseIdx + 8] = p.color[2];
      data[baseIdx + 9] = p.color[3];
      data[baseIdx + 10] = p.size * lifeRatio;
      data[baseIdx + 11] = lifeRatio;
    });

    this.device.queue.writeBuffer(this.vertexBuffer, 0, data);

    renderPass.setPipeline(this.pipeline);
    renderPass.setBindGroup(0, uniformBindGroup);
    renderPass.setVertexBuffer(0, this.vertexBuffer);
    renderPass.draw(4, this.particles.length);
  }

  destroy() {
    this.vertexBuffer?.destroy();
  }
}
