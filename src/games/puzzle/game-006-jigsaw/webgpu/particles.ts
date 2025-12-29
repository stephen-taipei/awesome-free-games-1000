/**
 * 粒子特效系統 - 拼圖遊戲
 * Particle effects for Jigsaw puzzle
 */

export type ParticleType =
  | 'snap'        // 扣合效果
  | 'sparkle'     // 閃光
  | 'confetti'    // 彩紙
  | 'victory'     // 勝利慶祝
  | 'pickup'      // 拾取效果
  | 'trail';      // 拖動軌跡

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
  private readonly maxParticles = 3000;

  // 顏色配置
  private readonly colors = {
    snap: [0.0, 1.0, 0.8, 1.0] as [number, number, number, number],        // 青色
    sparkle: [1.0, 1.0, 1.0, 1.0] as [number, number, number, number],     // 白色
    gold: [1.0, 0.85, 0.0, 1.0] as [number, number, number, number],       // 金色
    confetti: [1.0, 0.4, 0.6, 1.0] as [number, number, number, number],    // 粉色
    victory: [1.0, 0.9, 0.0, 1.0] as [number, number, number, number],     // 亮金
    trail: [0.5, 0.8, 1.0, 0.6] as [number, number, number, number],       // 淡藍
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
        case 'snap':
          p.vx *= 0.92;
          p.vz *= 0.92;
          p.size *= 0.98;
          break;

        case 'sparkle':
          p.vy += 0.5 * dt; // 微微上升
          p.size = p.size * (0.9 + Math.sin(p.life * 20) * 0.1);
          break;

        case 'confetti':
          // 飄落效果
          p.vx += Math.sin(p.life * 5) * 0.5 * dt;
          p.vz += Math.cos(p.life * 5) * 0.5 * dt;
          p.rotationSpeed *= 0.99;
          break;

        case 'victory':
          p.vx *= 0.98;
          p.vz *= 0.98;
          break;

        case 'pickup':
          p.vy += 2.0 * dt; // 上升
          p.vx *= 0.95;
          p.vz *= 0.95;
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
   * 扣合效果 - 拼圖片正確放置時
   */
  emitSnap(x: number, y: number, z: number): void {
    const count = 30;

    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const angle = (i / count) * Math.PI * 2;
      const speed = 2 + Math.random() * 2;

      this.particles.push({
        x,
        y: y + 0.05,
        z,
        vx: Math.cos(angle) * speed,
        vy: Math.random() * 2 + 1,
        vz: Math.sin(angle) * speed,
        life: 0.6 + Math.random() * 0.3,
        maxLife: 0.9,
        size: 0.04 + Math.random() * 0.03,
        type: 'snap',
        color: [...this.colors.snap] as [number, number, number, number],
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 5,
        gravity: 3,
      });
    }

    // 閃光
    for (let i = 0; i < 8; i++) {
      if (this.particles.length >= this.maxParticles) break;

      this.particles.push({
        x: x + (Math.random() - 0.5) * 0.3,
        y: y + 0.1,
        z: z + (Math.random() - 0.5) * 0.3,
        vx: 0,
        vy: 0,
        vz: 0,
        life: 0.3,
        maxLife: 0.3,
        size: 0.08 + Math.random() * 0.05,
        type: 'sparkle',
        color: [...this.colors.sparkle] as [number, number, number, number],
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: 0,
        gravity: 0,
      });
    }
  }

  /**
   * 拾取效果 - 選中拼圖片時
   */
  emitPickup(x: number, y: number, z: number, width: number, height: number): void {
    const count = 12;

    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;

      // 從邊緣發射
      const edge = Math.floor(Math.random() * 4);
      let px: number, pz: number;

      switch (edge) {
        case 0:
          px = x + Math.random() * width;
          pz = z;
          break;
        case 1:
          px = x + width;
          pz = z + Math.random() * height;
          break;
        case 2:
          px = x + Math.random() * width;
          pz = z + height;
          break;
        default:
          px = x;
          pz = z + Math.random() * height;
      }

      const color = Math.random() > 0.5 ? this.colors.snap : this.colors.gold;

      this.particles.push({
        x: px,
        y: y,
        z: pz,
        vx: (Math.random() - 0.5) * 0.5,
        vy: 1 + Math.random() * 1.5,
        vz: (Math.random() - 0.5) * 0.5,
        life: 0.5 + Math.random() * 0.3,
        maxLife: 0.8,
        size: 0.03 + Math.random() * 0.02,
        type: 'pickup',
        color: [...color] as [number, number, number, number],
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 8,
        gravity: -2, // 負重力 = 上升
      });
    }
  }

  /**
   * 拖動軌跡
   */
  emitTrail(x: number, y: number, z: number): void {
    if (this.particles.length >= this.maxParticles) return;

    this.particles.push({
      x,
      y: y + 0.02,
      z,
      vx: 0,
      vy: 0,
      vz: 0,
      life: 0.2,
      maxLife: 0.2,
      size: 0.06,
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
    // 彩紙
    const confettiCount = 100;
    const confettiColors = [
      [1.0, 0.2, 0.4, 1.0],   // 紅
      [0.2, 0.8, 1.0, 1.0],   // 藍
      [1.0, 0.9, 0.0, 1.0],   // 黃
      [0.4, 1.0, 0.4, 1.0],   // 綠
      [1.0, 0.4, 1.0, 1.0],   // 紫
      [1.0, 0.6, 0.2, 1.0],   // 橙
    ];

    for (let i = 0; i < confettiCount; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * 2;
      const colorIdx = Math.floor(Math.random() * confettiColors.length);

      this.particles.push({
        x: centerX + Math.cos(angle) * radius,
        y: 2 + Math.random() * 1,
        z: centerZ + Math.sin(angle) * radius,
        vx: (Math.random() - 0.5) * 3,
        vy: Math.random() * 2,
        vz: (Math.random() - 0.5) * 3,
        life: 3 + Math.random() * 2,
        maxLife: 5,
        size: 0.04 + Math.random() * 0.04,
        type: 'confetti',
        color: [...confettiColors[colorIdx]] as [number, number, number, number],
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 10,
        gravity: 1.5,
      });
    }

    // 金色爆炸
    const burstCount = 50;
    for (let i = 0; i < burstCount; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const angle = Math.random() * Math.PI * 2;
      const elevation = Math.random() * Math.PI * 0.5;
      const speed = 3 + Math.random() * 4;

      this.particles.push({
        x: centerX,
        y: 0.5,
        z: centerZ,
        vx: Math.cos(angle) * Math.cos(elevation) * speed,
        vy: Math.sin(elevation) * speed + 2,
        vz: Math.sin(angle) * Math.cos(elevation) * speed,
        life: 2 + Math.random() * 1,
        maxLife: 3,
        size: 0.06 + Math.random() * 0.04,
        type: 'victory',
        color: [...this.colors.victory] as [number, number, number, number],
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 6,
        gravity: 4,
      });
    }

    // 閃光
    for (let i = 0; i < 20; i++) {
      if (this.particles.length >= this.maxParticles) break;

      this.particles.push({
        x: centerX + (Math.random() - 0.5) * 2,
        y: Math.random() * 1.5,
        z: centerZ + (Math.random() - 0.5) * 2,
        vx: 0,
        vy: 0,
        vz: 0,
        life: 0.5 + Math.random() * 0.5,
        maxLife: 1.0,
        size: 0.1 + Math.random() * 0.1,
        type: 'sparkle',
        color: [...this.colors.sparkle] as [number, number, number, number],
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: 0,
        gravity: 0,
      });
    }
  }

  /**
   * 持續的勝利閃光
   */
  emitVictorySparkles(centerX: number, centerZ: number, radius: number): void {
    if (Math.random() > 0.3) return; // 30% 機率
    if (this.particles.length >= this.maxParticles) return;

    const angle = Math.random() * Math.PI * 2;
    const r = Math.random() * radius;

    this.particles.push({
      x: centerX + Math.cos(angle) * r,
      y: Math.random() * 0.5,
      z: centerZ + Math.sin(angle) * r,
      vx: 0,
      vy: 0.5 + Math.random() * 0.5,
      vz: 0,
      life: 0.8 + Math.random() * 0.4,
      maxLife: 1.2,
      size: 0.05 + Math.random() * 0.03,
      type: 'sparkle',
      color: Math.random() > 0.5
        ? [...this.colors.gold] as [number, number, number, number]
        : [...this.colors.sparkle] as [number, number, number, number],
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 3,
      gravity: -0.5,
    });
  }

  /**
   * 接近正確位置的提示效果
   */
  emitNearTarget(x: number, y: number, z: number): void {
    if (Math.random() > 0.2) return;
    if (this.particles.length >= this.maxParticles) return;

    this.particles.push({
      x: x + (Math.random() - 0.5) * 0.2,
      y: y,
      z: z + (Math.random() - 0.5) * 0.2,
      vx: 0,
      vy: 0.3,
      vz: 0,
      life: 0.4,
      maxLife: 0.4,
      size: 0.03,
      type: 'sparkle',
      color: [0.0, 1.0, 0.5, 0.8] as [number, number, number, number],
      rotation: 0,
      rotationSpeed: 0,
      gravity: 0,
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
