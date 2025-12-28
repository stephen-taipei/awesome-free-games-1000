/**
 * WebGPU 粒子系統 - 數獨
 * 正確填入、提示使用、完成遊戲特效
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
  private maxParticles = 500;

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
            { shaderLocation: 0, offset: 0, format: 'float32x3' },  // position
            { shaderLocation: 1, offset: 12, format: 'float32x3' }, // velocity
            { shaderLocation: 2, offset: 24, format: 'float32x4' }, // color
            { shaderLocation: 3, offset: 40, format: 'float32' },   // size
            { shaderLocation: 4, offset: 44, format: 'float32' },   // life
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

  /**
   * 正確填入數字特效 - 向上噴發
   */
  emitCorrect(x: number, y: number, z: number, color: [number, number, number, number]) {
    const count = 15;

    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) {
        this.particles.shift();
      }

      const angle = Math.random() * Math.PI * 2;
      const speed = 1 + Math.random() * 2;

      const vx = Math.cos(angle) * speed * 0.3;
      const vy = 2 + Math.random() * 3;
      const vz = Math.sin(angle) * speed * 0.3;

      const life = 0.6 + Math.random() * 0.4;

      this.particles.push({
        position: [x, y, z],
        velocity: [vx, vy, vz],
        color: [...color],
        size: 0.05 + Math.random() * 0.08,
        life: life,
        maxLife: life
      });
    }
  }

  /**
   * 使用提示特效 - 星光閃爍
   */
  emitHint(x: number, y: number, z: number) {
    const count = 20;
    const color: [number, number, number, number] = [1.0, 0.8, 0.2, 1.0];

    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) {
        this.particles.shift();
      }

      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const speed = 2 + Math.random() * 2;

      const vx = Math.sin(phi) * Math.cos(theta) * speed;
      const vy = Math.sin(phi) * Math.sin(theta) * speed + 1;
      const vz = Math.cos(phi) * speed * 0.5;

      const life = 0.5 + Math.random() * 0.3;

      this.particles.push({
        position: [x, y + 0.3, z],
        velocity: [vx, vy, vz],
        color: color,
        size: 0.06 + Math.random() * 0.06,
        life: life,
        maxLife: life
      });
    }
  }

  /**
   * 完成遊戲特效 - 全場慶祝
   */
  emitVictory(centerX: number, centerZ: number) {
    const count = 100;
    const colors: [number, number, number, number][] = [
      [0.2, 0.8, 1.0, 1.0],  // 青色
      [1.0, 0.8, 0.2, 1.0],  // 金色
      [0.8, 0.2, 1.0, 1.0],  // 紫色
      [0.2, 1.0, 0.5, 1.0],  // 綠色
      [1.0, 0.4, 0.6, 1.0],  // 粉色
    ];

    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) {
        this.particles.shift();
      }

      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * 4;
      const x = centerX + Math.cos(angle) * radius;
      const z = centerZ + Math.sin(angle) * radius;

      const speed = 3 + Math.random() * 4;
      const vx = (Math.random() - 0.5) * 2;
      const vy = speed;
      const vz = (Math.random() - 0.5) * 2;

      const life = 1.0 + Math.random() * 0.5;
      const color = colors[Math.floor(Math.random() * colors.length)];

      this.particles.push({
        position: [x, 0, z],
        velocity: [vx, vy, vz],
        color: [...color],
        size: 0.08 + Math.random() * 0.1,
        life: life,
        maxLife: life
      });
    }
  }

  /**
   * 錯誤輸入特效 - 紅色警告
   */
  emitError(x: number, y: number, z: number) {
    const count = 10;
    const color: [number, number, number, number] = [1.0, 0.2, 0.2, 1.0];

    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) {
        this.particles.shift();
      }

      const angle = Math.random() * Math.PI * 2;
      const speed = 1 + Math.random() * 1.5;

      const vx = Math.cos(angle) * speed;
      const vy = Math.random() * 0.5;
      const vz = Math.sin(angle) * speed;

      const life = 0.3 + Math.random() * 0.2;

      this.particles.push({
        position: [x, y + 0.3, z],
        velocity: [vx, vy, vz],
        color: color,
        size: 0.04 + Math.random() * 0.05,
        life: life,
        maxLife: life
      });
    }
  }

  update(deltaTime: number) {
    const gravity = -8;

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];

      // 更新位置
      p.position[0] += p.velocity[0] * deltaTime;
      p.position[1] += p.velocity[1] * deltaTime;
      p.position[2] += p.velocity[2] * deltaTime;

      // 重力
      p.velocity[1] += gravity * deltaTime;

      // 阻力
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
