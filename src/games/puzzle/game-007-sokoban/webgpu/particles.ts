/**
 * 粒子特效系統 - 推箱子遊戲
 * Particle effects for Sokoban
 */

export type ParticleType =
  | 'dust'       // 移動塵土
  | 'push'       // 推箱子效果
  | 'target'     // 箱子到達目標
  | 'victory'    // 勝利慶祝
  | 'sparkle'    // 閃光
  | 'trail';     // 移動軌跡

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

  // 顏色配置
  private readonly colors = {
    dust: [0.6, 0.5, 0.4, 0.8] as [number, number, number, number],
    push: [1.0, 0.8, 0.3, 1.0] as [number, number, number, number],
    target: [0.3, 1.0, 0.5, 1.0] as [number, number, number, number],
    victory: [1.0, 0.9, 0.0, 1.0] as [number, number, number, number],
    sparkle: [1.0, 1.0, 1.0, 1.0] as [number, number, number, number],
    trail: [0.0, 0.8, 1.0, 0.6] as [number, number, number, number],
    player: [0.0, 0.7, 1.0, 0.8] as [number, number, number, number],
  };

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
        case 'dust':
          p.vx *= 0.95;
          p.vz *= 0.95;
          p.size *= 0.98;
          break;

        case 'push':
          p.vx *= 0.92;
          p.vz *= 0.92;
          p.size *= 0.97;
          break;

        case 'target':
          p.vy += 2.0 * dt; // 上升
          p.vx *= 0.95;
          p.vz *= 0.95;
          break;

        case 'victory':
          p.vx *= 0.98;
          p.vz *= 0.98;
          break;

        case 'sparkle':
          p.size = p.size * (0.9 + Math.sin(p.life * 20) * 0.1);
          break;

        case 'trail':
          p.size *= 0.9;
          break;
      }

      // 更新透明度
      const lifeRatio = p.life / p.maxLife;
      p.color[3] = lifeRatio;
    }
  }

  /**
   * 玩家移動塵土效果
   */
  emitMoveDust(x: number, z: number): void {
    const count = 8;

    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const angle = Math.random() * Math.PI * 2;
      const speed = 0.5 + Math.random() * 0.5;

      this.particles.push({
        x: x + 0.5 + (Math.random() - 0.5) * 0.3,
        y: 0.02,
        z: z + 0.5 + (Math.random() - 0.5) * 0.3,
        vx: Math.cos(angle) * speed,
        vy: Math.random() * 0.5,
        vz: Math.sin(angle) * speed,
        life: 0.4 + Math.random() * 0.2,
        maxLife: 0.6,
        size: 0.03 + Math.random() * 0.02,
        type: 'dust',
        color: [...this.colors.dust] as [number, number, number, number],
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 3,
        gravity: 0.5,
      });
    }
  }

  /**
   * 推箱子效果
   */
  emitPushEffect(x: number, z: number, dx: number, dz: number): void {
    const count = 15;

    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;

      // 從推的方向發射
      const spreadAngle = (Math.random() - 0.5) * Math.PI * 0.5;
      const pushAngle = Math.atan2(dz, dx) + spreadAngle;
      const speed = 1.5 + Math.random() * 1.0;

      this.particles.push({
        x: x + 0.5 - dx * 0.3,
        y: 0.2 + Math.random() * 0.3,
        z: z + 0.5 - dz * 0.3,
        vx: Math.cos(pushAngle) * speed,
        vy: Math.random() * 1.5,
        vz: Math.sin(pushAngle) * speed,
        life: 0.5 + Math.random() * 0.3,
        maxLife: 0.8,
        size: 0.04 + Math.random() * 0.03,
        type: 'push',
        color: [...this.colors.push] as [number, number, number, number],
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 6,
        gravity: 3,
      });
    }

    // 閃光
    for (let i = 0; i < 5; i++) {
      if (this.particles.length >= this.maxParticles) break;

      this.particles.push({
        x: x + 0.5 + (Math.random() - 0.5) * 0.5,
        y: 0.3 + Math.random() * 0.2,
        z: z + 0.5 + (Math.random() - 0.5) * 0.5,
        vx: 0,
        vy: 0,
        vz: 0,
        life: 0.2,
        maxLife: 0.2,
        size: 0.08 + Math.random() * 0.04,
        type: 'sparkle',
        color: [...this.colors.sparkle] as [number, number, number, number],
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: 0,
        gravity: 0,
      });
    }
  }

  /**
   * 箱子到達目標效果
   */
  emitTargetReached(x: number, z: number): void {
    const count = 25;

    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const angle = (i / count) * Math.PI * 2;
      const speed = 1.0 + Math.random() * 0.5;

      this.particles.push({
        x: x + 0.5,
        y: 0.1,
        z: z + 0.5,
        vx: Math.cos(angle) * speed * 0.5,
        vy: 2 + Math.random() * 1.5,
        vz: Math.sin(angle) * speed * 0.5,
        life: 0.8 + Math.random() * 0.4,
        maxLife: 1.2,
        size: 0.05 + Math.random() * 0.03,
        type: 'target',
        color: [...this.colors.target] as [number, number, number, number],
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 5,
        gravity: -1.5, // 負重力 = 上升
      });
    }

    // 中心閃光
    for (let i = 0; i < 8; i++) {
      if (this.particles.length >= this.maxParticles) break;

      this.particles.push({
        x: x + 0.5 + (Math.random() - 0.5) * 0.3,
        y: 0.3,
        z: z + 0.5 + (Math.random() - 0.5) * 0.3,
        vx: 0,
        vy: 0.5,
        vz: 0,
        life: 0.4,
        maxLife: 0.4,
        size: 0.1 + Math.random() * 0.05,
        type: 'sparkle',
        color: [0.3, 1.0, 0.5, 1.0] as [number, number, number, number],
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: 0,
        gravity: 0,
      });
    }
  }

  /**
   * 箱子離開目標效果
   */
  emitTargetLeft(x: number, z: number): void {
    const count = 10;

    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const angle = Math.random() * Math.PI * 2;

      this.particles.push({
        x: x + 0.5 + Math.cos(angle) * 0.3,
        y: 0.05,
        z: z + 0.5 + Math.sin(angle) * 0.3,
        vx: Math.cos(angle) * 0.5,
        vy: 0.3,
        vz: Math.sin(angle) * 0.5,
        life: 0.3,
        maxLife: 0.3,
        size: 0.04,
        type: 'sparkle',
        color: [1.0, 0.3, 0.5, 0.8] as [number, number, number, number],
        rotation: 0,
        rotationSpeed: 0,
        gravity: 1,
      });
    }
  }

  /**
   * 玩家移動軌跡
   */
  emitPlayerTrail(x: number, z: number): void {
    if (Math.random() > 0.3) return;
    if (this.particles.length >= this.maxParticles) return;

    this.particles.push({
      x: x + 0.5 + (Math.random() - 0.5) * 0.2,
      y: 0.3,
      z: z + 0.5 + (Math.random() - 0.5) * 0.2,
      vx: 0,
      vy: 0.2,
      vz: 0,
      life: 0.3,
      maxLife: 0.3,
      size: 0.05,
      type: 'trail',
      color: [...this.colors.trail] as [number, number, number, number],
      rotation: 0,
      rotationSpeed: 0,
      gravity: 0,
    });
  }

  /**
   * 勝利慶祝效果
   */
  emitVictory(centerX: number, centerZ: number): void {
    // 彩紙爆炸
    const confettiCount = 80;
    const confettiColors = [
      [1.0, 0.3, 0.4, 1.0],  // 紅
      [0.3, 0.8, 1.0, 1.0],  // 藍
      [1.0, 0.9, 0.2, 1.0],  // 黃
      [0.4, 1.0, 0.5, 1.0],  // 綠
      [1.0, 0.5, 1.0, 1.0],  // 粉紫
      [1.0, 0.6, 0.2, 1.0],  // 橙
    ];

    for (let i = 0; i < confettiCount; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const angle = Math.random() * Math.PI * 2;
      const elevation = Math.random() * Math.PI * 0.4 + 0.2;
      const speed = 3 + Math.random() * 3;
      const colorIdx = Math.floor(Math.random() * confettiColors.length);

      this.particles.push({
        x: centerX,
        y: 0.5,
        z: centerZ,
        vx: Math.cos(angle) * Math.cos(elevation) * speed,
        vy: Math.sin(elevation) * speed + 3,
        vz: Math.sin(angle) * Math.cos(elevation) * speed,
        life: 2.5 + Math.random() * 1.5,
        maxLife: 4,
        size: 0.05 + Math.random() * 0.04,
        type: 'victory',
        color: [...confettiColors[colorIdx]] as [number, number, number, number],
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 10,
        gravity: 2.5,
      });
    }

    // 金色星星
    const starCount = 30;
    for (let i = 0; i < starCount; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const angle = (i / starCount) * Math.PI * 2;
      const speed = 2 + Math.random() * 2;

      this.particles.push({
        x: centerX,
        y: 0.3,
        z: centerZ,
        vx: Math.cos(angle) * speed,
        vy: 4 + Math.random() * 2,
        vz: Math.sin(angle) * speed,
        life: 2 + Math.random() * 1,
        maxLife: 3,
        size: 0.08 + Math.random() * 0.05,
        type: 'sparkle',
        color: [...this.colors.victory] as [number, number, number, number],
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 8,
        gravity: 3,
      });
    }
  }

  /**
   * 持續的勝利閃光
   */
  emitVictorySparkles(centerX: number, centerZ: number, radius: number): void {
    if (Math.random() > 0.2) return;
    if (this.particles.length >= this.maxParticles) return;

    const angle = Math.random() * Math.PI * 2;
    const r = Math.random() * radius;

    this.particles.push({
      x: centerX + Math.cos(angle) * r,
      y: Math.random() * 1.0,
      z: centerZ + Math.sin(angle) * r,
      vx: 0,
      vy: 0.5 + Math.random() * 0.5,
      vz: 0,
      life: 0.8 + Math.random() * 0.4,
      maxLife: 1.2,
      size: 0.06 + Math.random() * 0.04,
      type: 'sparkle',
      color: Math.random() > 0.5
        ? [...this.colors.victory] as [number, number, number, number]
        : [...this.colors.sparkle] as [number, number, number, number],
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 4,
      gravity: -0.3,
    });
  }

  /**
   * 無效移動效果（撞牆）
   */
  emitBlocked(x: number, z: number, dx: number, dz: number): void {
    const count = 5;

    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;

      this.particles.push({
        x: x + 0.5 + dx * 0.5 + (Math.random() - 0.5) * 0.2,
        y: 0.3 + Math.random() * 0.3,
        z: z + 0.5 + dz * 0.5 + (Math.random() - 0.5) * 0.2,
        vx: -dx * 0.5,
        vy: 0.5,
        vz: -dz * 0.5,
        life: 0.2,
        maxLife: 0.2,
        size: 0.04,
        type: 'sparkle',
        color: [1.0, 0.3, 0.2, 0.8] as [number, number, number, number],
        rotation: 0,
        rotationSpeed: 0,
        gravity: 2,
      });
    }
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
