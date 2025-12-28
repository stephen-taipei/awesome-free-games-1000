/**
 * 粒子特效系統 - 泡泡射擊
 * Particle effects for Bubble Shooter
 */

export type ParticleType =
  | 'pop'       // 泡泡爆破
  | 'sparkle'   // 光點閃爍
  | 'star'      // 星星
  | 'ring'      // 彩虹環
  | 'trail'     // 軌跡
  | 'cascade'   // 連鎖掉落
  | 'shoot';    // 發射效果

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

export class ParticleSystem {
  private particles: Particle[] = [];
  private readonly maxParticles = 2000;

  // 泡泡顏色
  private readonly bubbleColors: [number, number, number, number][] = [
    [0.91, 0.30, 0.24, 1.0],  // 紅
    [0.90, 0.49, 0.13, 1.0],  // 橙
    [0.95, 0.77, 0.06, 1.0],  // 黃
    [0.18, 0.80, 0.44, 1.0],  // 綠
    [0.20, 0.60, 0.86, 1.0],  // 藍
    [0.61, 0.35, 0.71, 1.0],  // 紫
  ];

  update(deltaTime: number): void {
    const dt = deltaTime * 0.001;

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
        case 'pop':
          p.vx *= 0.95;
          p.vy *= 0.95;
          p.size *= 0.98;
          break;

        case 'sparkle':
          p.size *= 0.96;
          break;

        case 'star':
          p.vx *= 0.98;
          p.vy *= 0.98;
          break;

        case 'ring':
          p.size *= 1.02;  // 擴張
          break;

        case 'trail':
          p.size *= 0.92;
          break;

        case 'cascade':
          p.vx *= 0.95;
          break;

        case 'shoot':
          p.size *= 0.9;
          break;
      }

      // 更新透明度
      const lifeRatio = p.life / p.maxLife;
      p.color[3] = lifeRatio;
    }
  }

  /**
   * 泡泡爆破效果
   */
  emitPop(x: number, y: number, colorIndex: number): void {
    const baseColor = this.bubbleColors[colorIndex % this.bubbleColors.length];
    const count = 20;

    // 主要爆破粒子
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const angle = (i / count) * Math.PI * 2;
      const speed = 2 + Math.random() * 3;

      this.particles.push({
        x,
        y,
        z: 0,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        vz: (Math.random() - 0.5) * 2,
        life: 0.5 + Math.random() * 0.3,
        maxLife: 0.8,
        size: 0.15 + Math.random() * 0.1,
        type: 'pop',
        color: [...baseColor] as [number, number, number, number],
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 5,
        gravity: 3,
      });
    }

    // 中心閃光
    for (let i = 0; i < 5; i++) {
      if (this.particles.length >= this.maxParticles) break;

      this.particles.push({
        x: x + (Math.random() - 0.5) * 0.3,
        y: y + (Math.random() - 0.5) * 0.3,
        z: 0.1,
        vx: 0,
        vy: 0.5,
        vz: 0,
        life: 0.2,
        maxLife: 0.2,
        size: 0.25 + Math.random() * 0.1,
        type: 'sparkle',
        color: [1.0, 1.0, 1.0, 1.0],
        rotation: 0,
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
      size: 0.2,
      type: 'ring',
      color: [baseColor[0], baseColor[1], baseColor[2], 0.5],
      rotation: 0,
      rotationSpeed: 0,
      gravity: 0,
    });
  }

  /**
   * 連鎖爆破效果 (多個泡泡)
   */
  emitChainPop(bubbles: Array<{x: number, y: number, colorIndex: number}>): void {
    bubbles.forEach((b, idx) => {
      setTimeout(() => {
        this.emitPop(b.x, b.y, b.colorIndex);
      }, idx * 50);
    });

    // 額外的星星效果
    const centerX = bubbles.reduce((sum, b) => sum + b.x, 0) / bubbles.length;
    const centerY = bubbles.reduce((sum, b) => sum + b.y, 0) / bubbles.length;

    if (bubbles.length >= 4) {
      for (let i = 0; i < 10; i++) {
        if (this.particles.length >= this.maxParticles) break;

        const angle = (i / 10) * Math.PI * 2;
        const speed = 3 + Math.random() * 2;

        this.particles.push({
          x: centerX,
          y: centerY,
          z: 0.2,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          vz: 0,
          life: 0.8,
          maxLife: 0.8,
          size: 0.2 + Math.random() * 0.1,
          type: 'star',
          color: [1.0, 0.9, 0.3, 1.0],
          rotation: Math.random() * Math.PI * 2,
          rotationSpeed: (Math.random() - 0.5) * 8,
          gravity: 2,
        });
      }
    }
  }

  /**
   * 浮空泡泡掉落效果
   */
  emitCascade(x: number, y: number, colorIndex: number): void {
    const baseColor = this.bubbleColors[colorIndex % this.bubbleColors.length];
    const count = 12;

    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;

      this.particles.push({
        x: x + (Math.random() - 0.5) * 0.5,
        y,
        z: 0,
        vx: (Math.random() - 0.5) * 2,
        vy: -1 - Math.random() * 2,
        vz: 0,
        life: 1.0 + Math.random() * 0.5,
        maxLife: 1.5,
        size: 0.1 + Math.random() * 0.08,
        type: 'cascade',
        color: [...baseColor] as [number, number, number, number],
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 4,
        gravity: 8,
      });
    }

    // 閃光
    for (let i = 0; i < 3; i++) {
      if (this.particles.length >= this.maxParticles) break;

      this.particles.push({
        x: x + (Math.random() - 0.5) * 0.3,
        y: y + (Math.random() - 0.5) * 0.3,
        z: 0.1,
        vx: 0,
        vy: 0.3,
        vz: 0,
        life: 0.3,
        maxLife: 0.3,
        size: 0.15,
        type: 'sparkle',
        color: [1.0, 1.0, 0.8, 1.0],
        rotation: 0,
        rotationSpeed: 0,
        gravity: 0,
      });
    }
  }

  /**
   * 發射軌跡效果
   */
  emitShoot(x: number, y: number, colorIndex: number): void {
    const baseColor = this.bubbleColors[colorIndex % this.bubbleColors.length];

    for (let i = 0; i < 8; i++) {
      if (this.particles.length >= this.maxParticles) break;

      this.particles.push({
        x,
        y,
        z: -0.1,
        vx: (Math.random() - 0.5) * 1.5,
        vy: -2 - Math.random() * 1,
        vz: 0,
        life: 0.3 + Math.random() * 0.2,
        maxLife: 0.5,
        size: 0.08 + Math.random() * 0.04,
        type: 'shoot',
        color: [...baseColor] as [number, number, number, number],
        rotation: 0,
        rotationSpeed: 0,
        gravity: -1,
      });
    }
  }

  /**
   * 泡泡飛行軌跡
   */
  emitTrail(x: number, y: number, colorIndex: number): void {
    if (this.particles.length >= this.maxParticles) return;
    if (Math.random() > 0.3) return; // 稀疏軌跡

    const baseColor = this.bubbleColors[colorIndex % this.bubbleColors.length];

    this.particles.push({
      x: x + (Math.random() - 0.5) * 0.1,
      y,
      z: -0.1,
      vx: 0,
      vy: 0,
      vz: 0,
      life: 0.3,
      maxLife: 0.3,
      size: 0.06,
      type: 'trail',
      color: [baseColor[0] * 0.8, baseColor[1] * 0.8, baseColor[2] * 0.8, 0.5],
      rotation: 0,
      rotationSpeed: 0,
      gravity: 0,
    });
  }

  /**
   * 牆壁反彈效果
   */
  emitBounce(x: number, y: number): void {
    for (let i = 0; i < 6; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const angle = Math.PI * 0.5 + (Math.random() - 0.5) * Math.PI * 0.5;
      const speed = 1 + Math.random() * 1.5;

      this.particles.push({
        x,
        y,
        z: 0,
        vx: Math.cos(angle) * speed * (x < 2 ? 1 : -1),
        vy: Math.sin(angle) * speed,
        vz: 0,
        life: 0.3,
        maxLife: 0.3,
        size: 0.08,
        type: 'sparkle',
        color: [0.5, 0.8, 1.0, 1.0],
        rotation: 0,
        rotationSpeed: 0,
        gravity: 0,
      });
    }
  }

  /**
   * 勝利慶祝
   */
  emitVictory(centerX: number, centerY: number): void {
    // 彩虹爆發
    for (let i = 0; i < 60; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const angle = Math.random() * Math.PI * 2;
      const speed = 3 + Math.random() * 4;
      const colorIdx = i % this.bubbleColors.length;
      const baseColor = this.bubbleColors[colorIdx];

      this.particles.push({
        x: centerX,
        y: centerY,
        z: 0,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed + 2,
        vz: (Math.random() - 0.5) * 2,
        life: 1.5 + Math.random() * 1,
        maxLife: 2.5,
        size: 0.12 + Math.random() * 0.08,
        type: 'star',
        color: [...baseColor] as [number, number, number, number],
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 10,
        gravity: 4,
      });
    }

    // 金色閃光
    for (let i = 0; i < 30; i++) {
      if (this.particles.length >= this.maxParticles) break;

      this.particles.push({
        x: centerX + (Math.random() - 0.5) * 4,
        y: centerY + (Math.random() - 0.5) * 3,
        z: 0.2,
        vx: (Math.random() - 0.5) * 2,
        vy: 1 + Math.random() * 2,
        vz: 0,
        life: 0.8 + Math.random() * 0.5,
        maxLife: 1.3,
        size: 0.15 + Math.random() * 0.1,
        type: 'sparkle',
        color: [1.0, 0.9, 0.3, 1.0],
        rotation: 0,
        rotationSpeed: 0,
        gravity: 2,
      });
    }
  }

  /**
   * 遊戲結束效果
   */
  emitGameOver(centerX: number, centerY: number): void {
    // 灰暗掉落
    for (let i = 0; i < 40; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const gray = 0.3 + Math.random() * 0.3;

      this.particles.push({
        x: centerX + (Math.random() - 0.5) * 4,
        y: centerY + Math.random() * 2,
        z: 0,
        vx: (Math.random() - 0.5) * 1,
        vy: -2 - Math.random() * 3,
        vz: 0,
        life: 1.5 + Math.random() * 1,
        maxLife: 2.5,
        size: 0.15 + Math.random() * 0.1,
        type: 'pop',
        color: [gray, gray, gray, 1.0],
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 3,
        gravity: 5,
      });
    }
  }

  /**
   * 環境效果
   */
  emitAmbient(width: number, height: number): void {
    if (Math.random() > 0.02) return;
    if (this.particles.length >= this.maxParticles) return;

    // 偶爾上升的小氣泡
    this.particles.push({
      x: Math.random() * width,
      y: 0,
      z: -0.5,
      vx: (Math.random() - 0.5) * 0.3,
      vy: 0.5 + Math.random() * 0.5,
      vz: 0,
      life: 4 + Math.random() * 2,
      maxLife: 6,
      size: 0.05 + Math.random() * 0.03,
      type: 'sparkle',
      color: [0.5, 0.7, 1.0, 0.3],
      rotation: 0,
      rotationSpeed: 0,
      gravity: -0.2,
    });
  }

  getParticles(): Particle[] {
    return this.particles;
  }

  clear(): void {
    this.particles = [];
  }

  getCount(): number {
    return this.particles.length;
  }
}
