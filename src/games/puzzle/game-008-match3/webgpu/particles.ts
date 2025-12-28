/**
 * 粒子特效系統 - 三消遊戲
 * Particle effects for Match-3
 */

export type ParticleType =
  | 'star'      // 星星 (消除)
  | 'explosion' // 爆炸 (連消)
  | 'trail'     // 軌跡 (交換)
  | 'combo'     // 連擊 (多連消)
  | 'sparkle'   // 閃光
  | 'cascade'   // 連鎖
  | 'score';    // 分數飄字

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
  z: number;
  value: number;
  startTime: number;
  duration: number;
  color: [number, number, number, number];
}

// 寶石顏色
const GEM_COLORS: [number, number, number, number][] = [
  [1.0, 0.3, 0.3, 1.0],  // 紅
  [1.0, 0.6, 0.2, 1.0],  // 橙
  [1.0, 0.9, 0.2, 1.0],  // 黃
  [0.3, 0.9, 0.4, 1.0],  // 綠
  [0.3, 0.6, 1.0, 1.0],  // 藍
  [0.7, 0.4, 0.9, 1.0],  // 紫
];

export class ParticleSystem {
  private particles: Particle[] = [];
  private scorePops: ScorePop[] = [];
  private readonly maxParticles = 3000;
  private currentTime = 0;

  update(deltaTime: number): void {
    const dt = deltaTime * 0.001;
    this.currentTime += dt;

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
        case 'star':
          p.vx *= 0.96;
          p.vz *= 0.96;
          p.size *= 0.98;
          break;

        case 'explosion':
          p.vx *= 0.92;
          p.vy *= 0.95;
          p.vz *= 0.92;
          break;

        case 'trail':
          p.size *= 0.9;
          break;

        case 'combo':
          p.vy += 1.5 * dt; // 上升
          p.vx *= 0.98;
          p.vz *= 0.98;
          break;

        case 'sparkle':
          p.size = p.size * (0.9 + Math.sin(p.life * 25) * 0.1);
          break;

        case 'cascade':
          p.vy += 0.5 * dt;
          p.vx *= 0.95;
          p.vz *= 0.95;
          break;
      }

      // 更新透明度
      const lifeRatio = p.life / p.maxLife;
      p.color[3] = lifeRatio;
    }

    // 更新分數飄字
    for (let i = this.scorePops.length - 1; i >= 0; i--) {
      const pop = this.scorePops[i];
      const elapsed = this.currentTime - pop.startTime;
      if (elapsed > pop.duration) {
        this.scorePops.splice(i, 1);
      }
    }
  }

  /**
   * 消除效果 - 星星爆炸
   */
  emitMatch(x: number, y: number, z: number, gemType: number): void {
    const count = 20;
    const baseColor = GEM_COLORS[gemType] || GEM_COLORS[0];

    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const angle = (i / count) * Math.PI * 2;
      const elevation = (Math.random() - 0.5) * Math.PI * 0.5;
      const speed = 2.5 + Math.random() * 2.0;

      this.particles.push({
        x: x,
        y: y,
        z: z,
        vx: Math.cos(angle) * Math.cos(elevation) * speed,
        vy: Math.sin(elevation) * speed + 1.5,
        vz: Math.sin(angle) * Math.cos(elevation) * speed,
        life: 0.6 + Math.random() * 0.4,
        maxLife: 1.0,
        size: 0.08 + Math.random() * 0.04,
        type: 'star',
        color: [...baseColor] as [number, number, number, number],
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 8,
        gravity: 3,
      });
    }

    // 中心閃光
    for (let i = 0; i < 5; i++) {
      if (this.particles.length >= this.maxParticles) break;

      this.particles.push({
        x: x + (Math.random() - 0.5) * 0.2,
        y: y + (Math.random() - 0.5) * 0.2,
        z: z,
        vx: 0,
        vy: 0,
        vz: 0,
        life: 0.2,
        maxLife: 0.2,
        size: 0.15 + Math.random() * 0.1,
        type: 'sparkle',
        color: [1.0, 1.0, 1.0, 1.0],
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: 0,
        gravity: 0,
      });
    }
  }

  /**
   * 交換軌跡效果
   */
  emitSwapTrail(fromX: number, fromY: number, toX: number, toY: number, gemType: number): void {
    const count = 15;
    const baseColor = GEM_COLORS[gemType] || GEM_COLORS[0];

    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const t = i / count;
      const x = fromX + (toX - fromX) * t;
      const y = fromY + (toY - fromY) * t;

      this.particles.push({
        x: x + (Math.random() - 0.5) * 0.1,
        y: y + (Math.random() - 0.5) * 0.1,
        z: 0.1,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        vz: 0,
        life: 0.3 + Math.random() * 0.2,
        maxLife: 0.5,
        size: 0.04 + Math.random() * 0.02,
        type: 'trail',
        color: [...baseColor] as [number, number, number, number],
        rotation: 0,
        rotationSpeed: 0,
        gravity: 0,
      });
    }
  }

  /**
   * 連消/連鎖效果
   */
  emitCascade(x: number, y: number, z: number, cascadeLevel: number): void {
    const count = 15 + cascadeLevel * 5;
    const hue = cascadeLevel * 0.15;

    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const angle = Math.random() * Math.PI * 2;
      const speed = 1.5 + Math.random() * 1.5;

      // 彩虹色
      const r = Math.sin(hue * Math.PI * 2) * 0.5 + 0.5;
      const g = Math.sin(hue * Math.PI * 2 + 2.09) * 0.5 + 0.5;
      const b = Math.sin(hue * Math.PI * 2 + 4.18) * 0.5 + 0.5;

      this.particles.push({
        x: x,
        y: y,
        z: z,
        vx: Math.cos(angle) * speed,
        vy: 2 + Math.random() * 2,
        vz: Math.sin(angle) * speed * 0.3,
        life: 0.8 + Math.random() * 0.4,
        maxLife: 1.2,
        size: 0.06 + Math.random() * 0.04,
        type: 'cascade',
        color: [r, g, b, 1.0],
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 6,
        gravity: -1, // 負重力，上升
      });
    }
  }

  /**
   * 連擊效果
   */
  emitCombo(centerX: number, centerY: number, comboCount: number): void {
    const count = 30 + comboCount * 10;

    // 彩虹爆炸
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const angle = (i / count) * Math.PI * 2;
      const speed = 3 + Math.random() * 2;

      // 彩虹色
      const hue = i / count;
      const r = Math.sin(hue * Math.PI * 2) * 0.5 + 0.5;
      const g = Math.sin(hue * Math.PI * 2 + 2.09) * 0.5 + 0.5;
      const b = Math.sin(hue * Math.PI * 2 + 4.18) * 0.5 + 0.5;

      this.particles.push({
        x: centerX,
        y: centerY,
        z: 0.2,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed + 2,
        vz: (Math.random() - 0.5) * 2,
        life: 1.0 + Math.random() * 0.5,
        maxLife: 1.5,
        size: 0.08 + Math.random() * 0.05,
        type: 'combo',
        color: [r, g, b, 1.0],
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 10,
        gravity: 2,
      });
    }

    // 大型閃光
    for (let i = 0; i < 8; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const angle = (i / 8) * Math.PI * 2;

      this.particles.push({
        x: centerX + Math.cos(angle) * 0.5,
        y: centerY + Math.sin(angle) * 0.5,
        z: 0.3,
        vx: Math.cos(angle) * 0.5,
        vy: Math.sin(angle) * 0.5,
        vz: 0,
        life: 0.4,
        maxLife: 0.4,
        size: 0.2 + comboCount * 0.02,
        type: 'sparkle',
        color: [1.0, 1.0, 1.0, 1.0],
        rotation: angle,
        rotationSpeed: 0,
        gravity: 0,
      });
    }
  }

  /**
   * 選中效果
   */
  emitSelect(x: number, y: number, gemType: number): void {
    const count = 8;
    const baseColor = GEM_COLORS[gemType] || GEM_COLORS[0];

    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const angle = (i / count) * Math.PI * 2;

      this.particles.push({
        x: x + Math.cos(angle) * 0.4,
        y: y + Math.sin(angle) * 0.4,
        z: 0.1,
        vx: Math.cos(angle) * 0.3,
        vy: Math.sin(angle) * 0.3,
        vz: 0,
        life: 0.3,
        maxLife: 0.3,
        size: 0.05,
        type: 'sparkle',
        color: [...baseColor] as [number, number, number, number],
        rotation: angle,
        rotationSpeed: 0,
        gravity: 0,
      });
    }
  }

  /**
   * 寶石掉落效果
   */
  emitFall(x: number, y: number, gemType: number): void {
    const count = 5;
    const baseColor = GEM_COLORS[gemType] || GEM_COLORS[0];

    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;

      this.particles.push({
        x: x + (Math.random() - 0.5) * 0.3,
        y: y - 0.3,
        z: 0.05,
        vx: (Math.random() - 0.5) * 1.0,
        vy: -0.5 - Math.random() * 0.5,
        vz: 0,
        life: 0.3,
        maxLife: 0.3,
        size: 0.03 + Math.random() * 0.02,
        type: 'trail',
        color: [...baseColor] as [number, number, number, number],
        rotation: 0,
        rotationSpeed: 0,
        gravity: 5,
      });
    }
  }

  /**
   * 遊戲結束效果
   */
  emitGameOver(centerX: number, centerY: number): void {
    const count = 100;

    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 4;

      // 灰暗顏色
      const gray = 0.3 + Math.random() * 0.3;

      this.particles.push({
        x: centerX + (Math.random() - 0.5) * 4,
        y: centerY + (Math.random() - 0.5) * 4,
        z: Math.random() * 0.5,
        vx: Math.cos(angle) * speed * 0.3,
        vy: -1 - Math.random() * 2,
        vz: Math.sin(angle) * speed * 0.1,
        life: 1.5 + Math.random() * 1.0,
        maxLife: 2.5,
        size: 0.1 + Math.random() * 0.1,
        type: 'explosion',
        color: [gray, gray, gray, 1.0],
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 5,
        gravity: 3,
      });
    }
  }

  /**
   * 新高分效果
   */
  emitHighScore(centerX: number, centerY: number): void {
    // 金色爆炸
    const count = 60;

    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const angle = (i / count) * Math.PI * 2;
      const speed = 4 + Math.random() * 3;

      this.particles.push({
        x: centerX,
        y: centerY,
        z: 0.3,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed + 3,
        vz: (Math.random() - 0.5) * 2,
        life: 1.5 + Math.random() * 1.0,
        maxLife: 2.5,
        size: 0.1 + Math.random() * 0.06,
        type: 'star',
        color: [1.0, 0.85, 0.0, 1.0],
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 8,
        gravity: 2,
      });
    }

    // 閃光
    for (let i = 0; i < 15; i++) {
      if (this.particles.length >= this.maxParticles) break;

      this.particles.push({
        x: centerX + (Math.random() - 0.5) * 2,
        y: centerY + (Math.random() - 0.5) * 2,
        z: 0.5,
        vx: 0,
        vy: 0,
        vz: 0,
        life: 0.5 + Math.random() * 0.3,
        maxLife: 0.8,
        size: 0.2 + Math.random() * 0.15,
        type: 'sparkle',
        color: [1.0, 1.0, 0.8, 1.0],
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: 0,
        gravity: 0,
      });
    }
  }

  /**
   * 添加分數飄字
   */
  addScorePop(x: number, y: number, z: number, value: number, color?: [number, number, number, number]): void {
    this.scorePops.push({
      x,
      y,
      z,
      value,
      startTime: this.currentTime,
      duration: 1.0,
      color: color || [1.0, 1.0, 0.0, 1.0],
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

  getCount(): number {
    return this.particles.length;
  }

  getCurrentTime(): number {
    return this.currentTime;
  }
}
