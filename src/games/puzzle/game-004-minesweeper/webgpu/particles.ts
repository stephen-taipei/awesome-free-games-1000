/**
 * 粒子系統 - 踩地雷 3D 特效
 * 爆炸、揭開漣漪、勝利煙火
 */

export interface Particle {
  position: [number, number, number];
  velocity: [number, number, number];
  color: [number, number, number, number];
  size: number;
  life: number;
  maxLife: number;
  type: 'explosion' | 'reveal' | 'victory' | 'spark' | 'debris' | 'shockwave';
}

export type ParticleType = Particle['type'];

export class ParticleSystem {
  private particles: Particle[] = [];
  private maxParticles = 2000;

  /**
   * 更新所有粒子
   */
  update(deltaTime: number): void {
    const gravity = -9.8;
    const drag = 0.98;

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];

      // 更新生命
      p.life -= deltaTime;

      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      // 不同粒子類型的物理行為
      switch (p.type) {
        case 'explosion':
          // 爆炸粒子 - 快速擴散然後減速
          p.velocity[0] *= 0.95;
          p.velocity[1] += gravity * deltaTime * 0.3;
          p.velocity[2] *= 0.95;
          break;

        case 'debris':
          // 碎片 - 受重力影響
          p.velocity[1] += gravity * deltaTime;
          break;

        case 'spark':
          // 火花 - 輕微重力，快速消散
          p.velocity[1] += gravity * deltaTime * 0.2;
          p.velocity[0] *= 0.92;
          p.velocity[2] *= 0.92;
          break;

        case 'reveal':
          // 揭開效果 - 向上漂浮
          p.velocity[1] += 2.0 * deltaTime;
          p.velocity[0] *= drag;
          p.velocity[2] *= drag;
          break;

        case 'victory':
          // 勝利粒子 - 煙火效果
          p.velocity[1] += gravity * deltaTime * 0.5;
          p.velocity[0] *= 0.99;
          p.velocity[2] *= 0.99;
          break;

        case 'shockwave':
          // 衝擊波 - 水平擴散
          const len = Math.sqrt(p.velocity[0] ** 2 + p.velocity[2] ** 2);
          if (len > 0) {
            p.velocity[0] = (p.velocity[0] / len) * 8;
            p.velocity[2] = (p.velocity[2] / len) * 8;
          }
          break;
      }

      // 更新位置
      p.position[0] += p.velocity[0] * deltaTime;
      p.position[1] += p.velocity[1] * deltaTime;
      p.position[2] += p.velocity[2] * deltaTime;

      // 地面碰撞
      if (p.position[1] < 0 && p.type !== 'shockwave') {
        p.position[1] = 0;
        p.velocity[1] *= -0.3;
        p.velocity[0] *= 0.8;
        p.velocity[2] *= 0.8;
      }

      // 更新透明度
      const lifeRatio = p.life / p.maxLife;
      p.color[3] = lifeRatio;

      // 更新大小
      if (p.type === 'explosion' || p.type === 'spark') {
        p.size *= 0.98;
      } else if (p.type === 'shockwave') {
        p.size *= 1.05;
      }
    }
  }

  /**
   * 爆炸效果 - 地雷爆炸
   */
  emitExplosion(x: number, y: number, z: number): void {
    // 主爆炸粒子
    const explosionCount = 80;
    for (let i = 0; i < explosionCount; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      const speed = 3 + Math.random() * 5;

      const vx = Math.sin(phi) * Math.cos(theta) * speed;
      const vy = Math.cos(phi) * speed * 0.8 + 2;
      const vz = Math.sin(phi) * Math.sin(theta) * speed;

      // 顏色從橙到紅
      const t = Math.random();
      const r = 1.0;
      const g = 0.3 + t * 0.4;
      const b = 0.0;

      this.particles.push({
        position: [x, y + 0.3, z],
        velocity: [vx, vy, vz],
        color: [r, g, b, 1.0],
        size: 0.15 + Math.random() * 0.15,
        life: 0.8 + Math.random() * 0.5,
        maxLife: 1.3,
        type: 'explosion'
      });
    }

    // 火花
    const sparkCount = 50;
    for (let i = 0; i < sparkCount; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const theta = Math.random() * Math.PI * 2;
      const speed = 5 + Math.random() * 8;

      this.particles.push({
        position: [x, y + 0.3, z],
        velocity: [
          Math.cos(theta) * speed,
          3 + Math.random() * 4,
          Math.sin(theta) * speed
        ],
        color: [1.0, 0.8, 0.2, 1.0],
        size: 0.05 + Math.random() * 0.08,
        life: 0.3 + Math.random() * 0.4,
        maxLife: 0.7,
        type: 'spark'
      });
    }

    // 碎片
    const debrisCount = 30;
    for (let i = 0; i < debrisCount; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const theta = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 4;

      this.particles.push({
        position: [x, y + 0.2, z],
        velocity: [
          Math.cos(theta) * speed,
          4 + Math.random() * 3,
          Math.sin(theta) * speed
        ],
        color: [0.3, 0.3, 0.35, 1.0],
        size: 0.08 + Math.random() * 0.1,
        life: 1.0 + Math.random() * 0.5,
        maxLife: 1.5,
        type: 'debris'
      });
    }

    // 衝擊波
    const shockwaveCount = 24;
    for (let i = 0; i < shockwaveCount; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const theta = (i / shockwaveCount) * Math.PI * 2;

      this.particles.push({
        position: [x, 0.05, z],
        velocity: [Math.cos(theta), 0, Math.sin(theta)],
        color: [1.0, 0.4, 0.1, 0.8],
        size: 0.3,
        life: 0.5,
        maxLife: 0.5,
        type: 'shockwave'
      });
    }
  }

  /**
   * 揭開效果 - 方塊被揭開時
   */
  emitReveal(x: number, y: number, z: number, adjacentMines: number): void {
    const count = 15 + adjacentMines * 3;

    // 根據周圍地雷數選擇顏色
    let baseColor: [number, number, number];
    switch (adjacentMines) {
      case 0: baseColor = [0.2, 0.8, 0.9]; break;  // 青色 - 安全
      case 1: baseColor = [0.2, 0.5, 1.0]; break;  // 藍色
      case 2: baseColor = [0.2, 0.9, 0.4]; break;  // 綠色
      case 3: baseColor = [1.0, 0.4, 0.3]; break;  // 紅色
      case 4: baseColor = [0.4, 0.3, 0.9]; break;  // 紫色
      case 5: baseColor = [0.9, 0.3, 0.3]; break;  // 深紅
      case 6: baseColor = [0.3, 0.9, 0.9]; break;  // 青綠
      case 7: baseColor = [0.5, 0.5, 0.5]; break;  // 灰色
      default: baseColor = [0.7, 0.7, 0.7]; break; // 淺灰
    }

    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const theta = Math.random() * Math.PI * 2;
      const speed = 0.5 + Math.random() * 1.5;

      // 稍微變化顏色
      const colorVariation = 0.2;
      const r = Math.min(1, baseColor[0] + (Math.random() - 0.5) * colorVariation);
      const g = Math.min(1, baseColor[1] + (Math.random() - 0.5) * colorVariation);
      const b = Math.min(1, baseColor[2] + (Math.random() - 0.5) * colorVariation);

      this.particles.push({
        position: [x, y + 0.5, z],
        velocity: [
          Math.cos(theta) * speed * 0.5,
          1 + Math.random() * 2,
          Math.sin(theta) * speed * 0.5
        ],
        color: [r, g, b, 1.0],
        size: 0.08 + Math.random() * 0.08,
        life: 0.6 + Math.random() * 0.4,
        maxLife: 1.0,
        type: 'reveal'
      });
    }
  }

  /**
   * 連鎖揭開效果 - 空白區域擴散
   */
  emitCascade(x: number, y: number, z: number, delay: number): void {
    // 延遲效果通過減少初始速度模擬
    const speedMult = Math.max(0.3, 1 - delay * 0.5);
    const count = 8;

    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const theta = (i / count) * Math.PI * 2;

      this.particles.push({
        position: [x, y + 0.3, z],
        velocity: [
          Math.cos(theta) * 2 * speedMult,
          0.5 + Math.random() * speedMult,
          Math.sin(theta) * 2 * speedMult
        ],
        color: [0.1, 0.9, 1.0, 0.8],
        size: 0.1,
        life: 0.4,
        maxLife: 0.4,
        type: 'reveal'
      });
    }
  }

  /**
   * 旗幟放置效果
   */
  emitFlag(x: number, y: number, z: number): void {
    const count = 20;

    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const theta = Math.random() * Math.PI * 2;

      this.particles.push({
        position: [x, y + 0.6, z],
        velocity: [
          Math.cos(theta) * 1.5,
          2 + Math.random() * 2,
          Math.sin(theta) * 1.5
        ],
        color: [1.0, 0.5, 0.1, 1.0],
        size: 0.06 + Math.random() * 0.06,
        life: 0.5 + Math.random() * 0.3,
        maxLife: 0.8,
        type: 'reveal'
      });
    }
  }

  /**
   * 勝利煙火效果
   */
  emitVictory(centerX: number, centerZ: number, gridWidth: number, gridHeight: number): void {
    // 多個煙火點
    const fireworkCount = 5;

    for (let f = 0; f < fireworkCount; f++) {
      const fx = centerX + (Math.random() - 0.5) * gridWidth;
      const fz = centerZ + (Math.random() - 0.5) * gridHeight;
      const fy = 3 + Math.random() * 2;

      // 隨機煙火顏色
      const colors: [number, number, number][] = [
        [1.0, 0.8, 0.2],  // 金色
        [0.2, 0.8, 1.0],  // 青色
        [1.0, 0.3, 0.5],  // 粉紅
        [0.5, 1.0, 0.3],  // 綠色
        [0.8, 0.4, 1.0],  // 紫色
      ];
      const color = colors[Math.floor(Math.random() * colors.length)];

      const particleCount = 60;
      for (let i = 0; i < particleCount; i++) {
        if (this.particles.length >= this.maxParticles) break;

        const theta = Math.random() * Math.PI * 2;
        const phi = Math.random() * Math.PI;
        const speed = 2 + Math.random() * 4;

        this.particles.push({
          position: [fx, fy, fz],
          velocity: [
            Math.sin(phi) * Math.cos(theta) * speed,
            Math.cos(phi) * speed,
            Math.sin(phi) * Math.sin(theta) * speed
          ],
          color: [...color, 1.0],
          size: 0.1 + Math.random() * 0.1,
          life: 1.0 + Math.random() * 0.5,
          maxLife: 1.5,
          type: 'victory'
        });
      }

      // 閃爍尾跡
      const trailCount = 30;
      for (let i = 0; i < trailCount; i++) {
        if (this.particles.length >= this.maxParticles) break;

        const theta = Math.random() * Math.PI * 2;
        const speed = 1 + Math.random() * 2;

        this.particles.push({
          position: [fx, fy, fz],
          velocity: [
            Math.cos(theta) * speed,
            -1 + Math.random() * 2,
            Math.sin(theta) * speed
          ],
          color: [1.0, 1.0, 0.8, 1.0],
          size: 0.04 + Math.random() * 0.04,
          life: 0.3 + Math.random() * 0.3,
          maxLife: 0.6,
          type: 'spark'
        });
      }
    }
  }

  /**
   * 失敗效果 - 所有地雷顯示
   */
  emitGameOver(minePositions: Array<{ x: number; y: number; z: number }>): void {
    // 每個地雷位置發出紅色脈衝
    for (const pos of minePositions) {
      const count = 15;
      for (let i = 0; i < count; i++) {
        if (this.particles.length >= this.maxParticles) break;

        const theta = (i / count) * Math.PI * 2;

        this.particles.push({
          position: [pos.x, pos.y + 0.3, pos.z],
          velocity: [
            Math.cos(theta) * 2,
            0.5,
            Math.sin(theta) * 2
          ],
          color: [1.0, 0.2, 0.1, 0.8],
          size: 0.12,
          life: 0.6,
          maxLife: 0.6,
          type: 'reveal'
        });
      }
    }
  }

  /**
   * 獲取所有活動粒子
   */
  getParticles(): Particle[] {
    return this.particles;
  }

  /**
   * 獲取粒子數量
   */
  getParticleCount(): number {
    return this.particles.length;
  }

  /**
   * 清除所有粒子
   */
  clear(): void {
    this.particles = [];
  }

  /**
   * 獲取實例數據用於 GPU
   */
  getInstanceData(): Float32Array {
    const data = new Float32Array(this.particles.length * 12);

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      const offset = i * 12;

      // position (3)
      data[offset] = p.position[0];
      data[offset + 1] = p.position[1];
      data[offset + 2] = p.position[2];

      // velocity (3)
      data[offset + 3] = p.velocity[0];
      data[offset + 4] = p.velocity[1];
      data[offset + 5] = p.velocity[2];

      // color (4)
      data[offset + 6] = p.color[0];
      data[offset + 7] = p.color[1];
      data[offset + 8] = p.color[2];
      data[offset + 9] = p.color[3];

      // size (1)
      data[offset + 10] = p.size;

      // life (1)
      data[offset + 11] = p.life / p.maxLife;
    }

    return data;
  }
}
