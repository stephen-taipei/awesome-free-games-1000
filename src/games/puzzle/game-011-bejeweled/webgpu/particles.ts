/**
 * Particle Effects System - Bejeweled
 * Game #011
 */

export type ParticleType =
  | 'crystal'    // 水晶碎片
  | 'sparkle'    // 閃光星
  | 'glow'       // 圓形光點
  | 'ring'       // 彩虹環
  | 'trail';     // 軌跡

export interface Particle {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
  size: number;
  type: ParticleType;
  color: [number, number, number, number];
  rotation: number;
  rotationSpeed: number;
  gravity: number;
}

export interface ScorePop {
  x: number;
  y: number;
  value: number;
  life: number;
  maxLife: number;
}

export class ParticleSystem {
  private particles: Particle[] = [];
  private scorePops: ScorePop[] = [];
  private readonly maxParticles = 3000;

  // 寶石顏色
  private readonly gemColors: [number, number, number, number][] = [
    [0.91, 0.30, 0.24, 1.0],  // 紅寶石
    [0.95, 0.55, 0.15, 1.0],  // 琥珀
    [0.98, 0.85, 0.15, 1.0],  // 黃水晶
    [0.20, 0.85, 0.45, 1.0],  // 翡翠
    [0.25, 0.60, 0.95, 1.0],  // 藍寶石
    [0.70, 0.35, 0.85, 1.0],  // 紫水晶
    [0.95, 0.95, 0.98, 1.0],  // 鑽石
  ];

  update(deltaTime: number): void {
    const dt = deltaTime * 0.001;

    // 更新粒子
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];

      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      // 更新位置
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;

      // 重力
      p.vy -= p.gravity * dt;

      // 旋轉
      p.rotation += p.rotationSpeed * dt;

      // 根據類型應用效果
      switch (p.type) {
        case 'crystal':
          p.vx *= 0.96;
          p.vy *= 0.96;
          p.size *= 0.98;
          break;

        case 'sparkle':
          p.size *= 0.94;
          break;

        case 'glow':
          p.size *= 0.97;
          break;

        case 'ring':
          p.size *= 1.03;
          break;

        case 'trail':
          p.size *= 0.9;
          break;
      }

      // 更新透明度
      const lifeRatio = p.life / p.maxLife;
      p.color[3] = lifeRatio;
    }

    // 更新分數彈出
    for (let i = this.scorePops.length - 1; i >= 0; i--) {
      const s = this.scorePops[i];
      s.life -= dt;
      if (s.life <= 0) {
        this.scorePops.splice(i, 1);
      }
    }
  }

  /**
   * 寶石消除爆破效果
   */
  emitMatch(x: number, y: number, colorIndex: number): void {
    const baseColor = this.gemColors[colorIndex % this.gemColors.length];
    const count = 25;

    // 水晶碎片爆炸
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.5;
      const speed = 2 + Math.random() * 4;

      this.particles.push({
        x,
        y,
        z: 0,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        vz: (Math.random() - 0.5) * 2,
        life: 0.6 + Math.random() * 0.4,
        maxLife: 1.0,
        size: 0.12 + Math.random() * 0.08,
        type: 'crystal',
        color: [...baseColor] as [number, number, number, number],
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 10,
        gravity: 4,
      });
    }

    // 中心閃光
    for (let i = 0; i < 8; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const angle = (i / 8) * Math.PI * 2;

      this.particles.push({
        x,
        y,
        z: 0.1,
        vx: Math.cos(angle) * 1.5,
        vy: Math.sin(angle) * 1.5,
        vz: 0,
        life: 0.25,
        maxLife: 0.25,
        size: 0.2,
        type: 'sparkle',
        color: [1.0, 1.0, 1.0, 1.0],
        rotation: angle,
        rotationSpeed: 0,
        gravity: 0,
      });
    }

    // 擴散環
    this.particles.push({
      x,
      y,
      z: 0,
      vx: 0,
      vy: 0,
      vz: 0,
      life: 0.4,
      maxLife: 0.4,
      size: 0.15,
      type: 'ring',
      color: [baseColor[0], baseColor[1], baseColor[2], 0.6],
      rotation: 0,
      rotationSpeed: 0,
      gravity: 0,
    });
  }

  /**
   * 連鎖消除效果
   */
  emitChainMatch(gems: Array<{x: number, y: number, colorIndex: number}>): void {
    gems.forEach((gem, idx) => {
      setTimeout(() => {
        this.emitMatch(gem.x, gem.y, gem.colorIndex);
      }, idx * 30);
    });

    // 大連鎖額外星星效果
    if (gems.length >= 4) {
      const centerX = gems.reduce((sum, g) => sum + g.x, 0) / gems.length;
      const centerY = gems.reduce((sum, g) => sum + g.y, 0) / gems.length;

      for (let i = 0; i < 15; i++) {
        if (this.particles.length >= this.maxParticles) break;

        const angle = Math.random() * Math.PI * 2;
        const speed = 2 + Math.random() * 3;

        this.particles.push({
          x: centerX,
          y: centerY,
          z: 0.2,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed + 1,
          vz: 0,
          life: 1.0,
          maxLife: 1.0,
          size: 0.18 + Math.random() * 0.1,
          type: 'sparkle',
          color: [1.0, 0.95, 0.4, 1.0],
          rotation: Math.random() * Math.PI * 2,
          rotationSpeed: (Math.random() - 0.5) * 12,
          gravity: 3,
        });
      }
    }
  }

  /**
   * 寶石交換效果
   */
  emitSwap(x1: number, y1: number, x2: number, y2: number): void {
    const midX = (x1 + x2) / 2;
    const midY = (y1 + y2) / 2;

    for (let i = 0; i < 10; i++) {
      if (this.particles.length >= this.maxParticles) break;

      this.particles.push({
        x: midX + (Math.random() - 0.5) * 0.3,
        y: midY + (Math.random() - 0.5) * 0.3,
        z: 0.1,
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 2,
        vz: 0,
        life: 0.3,
        maxLife: 0.3,
        size: 0.1,
        type: 'glow',
        color: [0.8, 0.7, 1.0, 1.0],
        rotation: 0,
        rotationSpeed: 0,
        gravity: 0,
      });
    }
  }

  /**
   * 寶石掉落效果
   */
  emitFall(x: number, y: number, colorIndex: number): void {
    const baseColor = this.gemColors[colorIndex % this.gemColors.length];

    for (let i = 0; i < 5; i++) {
      if (this.particles.length >= this.maxParticles) break;

      this.particles.push({
        x: x + (Math.random() - 0.5) * 0.2,
        y,
        z: -0.1,
        vx: (Math.random() - 0.5) * 0.5,
        vy: -0.5 - Math.random() * 0.5,
        vz: 0,
        life: 0.3,
        maxLife: 0.3,
        size: 0.06,
        type: 'trail',
        color: [baseColor[0] * 0.8, baseColor[1] * 0.8, baseColor[2] * 0.8, 0.6],
        rotation: 0,
        rotationSpeed: 0,
        gravity: 0,
      });
    }
  }

  /**
   * 選中效果
   */
  emitSelect(x: number, y: number): void {
    for (let i = 0; i < 8; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const angle = (i / 8) * Math.PI * 2;

      this.particles.push({
        x: x + Math.cos(angle) * 0.4,
        y: y + Math.sin(angle) * 0.4,
        z: 0.1,
        vx: Math.cos(angle) * 0.5,
        vy: Math.sin(angle) * 0.5,
        vz: 0,
        life: 0.4,
        maxLife: 0.4,
        size: 0.08,
        type: 'sparkle',
        color: [1.0, 0.9, 0.5, 1.0],
        rotation: angle,
        rotationSpeed: 3,
        gravity: 0,
      });
    }
  }

  /**
   * 升級效果
   */
  emitLevelUp(centerX: number, centerY: number): void {
    // 彩虹爆發
    for (let i = 0; i < 80; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const angle = Math.random() * Math.PI * 2;
      const speed = 4 + Math.random() * 5;
      const colorIdx = i % this.gemColors.length;
      const baseColor = this.gemColors[colorIdx];

      this.particles.push({
        x: centerX,
        y: centerY,
        z: 0,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed + 2,
        vz: (Math.random() - 0.5) * 3,
        life: 1.5 + Math.random() * 1,
        maxLife: 2.5,
        size: 0.15 + Math.random() * 0.1,
        type: 'crystal',
        color: [...baseColor] as [number, number, number, number],
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 15,
        gravity: 5,
      });
    }

    // 金色星星
    for (let i = 0; i < 40; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 3;

      this.particles.push({
        x: centerX + (Math.random() - 0.5) * 2,
        y: centerY + (Math.random() - 0.5) * 2,
        z: 0.2,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed + 1,
        vz: 0,
        life: 1.0 + Math.random() * 0.5,
        maxLife: 1.5,
        size: 0.2 + Math.random() * 0.15,
        type: 'sparkle',
        color: [1.0, 0.9, 0.3, 1.0],
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 10,
        gravity: 2,
      });
    }
  }

  /**
   * 遊戲結束效果
   */
  emitGameOver(centerX: number, centerY: number): void {
    // 灰暗碎片掉落
    for (let i = 0; i < 50; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const gray = 0.3 + Math.random() * 0.3;

      this.particles.push({
        x: centerX + (Math.random() - 0.5) * 6,
        y: centerY + Math.random() * 3,
        z: 0,
        vx: (Math.random() - 0.5) * 2,
        vy: -3 - Math.random() * 4,
        vz: 0,
        life: 2.0 + Math.random() * 1,
        maxLife: 3.0,
        size: 0.15 + Math.random() * 0.1,
        type: 'crystal',
        color: [gray, gray, gray * 0.8, 1.0],
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 5,
        gravity: 8,
      });
    }
  }

  /**
   * 添加分數彈出
   */
  addScorePop(x: number, y: number, value: number): void {
    this.scorePops.push({
      x,
      y,
      value,
      life: 1.0,
      maxLife: 1.0,
    });
  }

  /**
   * 環境粒子
   */
  emitAmbient(width: number, height: number): void {
    if (Math.random() > 0.03) return;
    if (this.particles.length >= this.maxParticles) return;

    // 漂浮的光點
    this.particles.push({
      x: Math.random() * width,
      y: Math.random() * height,
      z: -0.5,
      vx: (Math.random() - 0.5) * 0.2,
      vy: 0.2 + Math.random() * 0.3,
      vz: 0,
      life: 4 + Math.random() * 3,
      maxLife: 7,
      size: 0.04 + Math.random() * 0.03,
      type: 'glow',
      color: [0.6, 0.4, 0.8, 0.4],
      rotation: 0,
      rotationSpeed: 0,
      gravity: -0.1,
    });
  }

  getParticles(): Particle[] {
    return this.particles;
  }

  getScorePops(): ScorePop[] {
    return this.scorePops;
  }

  clear(): void {
    this.particles = [];
    this.scorePops = [];
  }

  getParticleCount(): number {
    return this.particles.length;
  }
}
