/**
 * 粒子特效系統 - 麻將連連看
 * Particle effects for Mahjong Connect
 */

export type ParticleType =
  | 'mahjong'    // 麻將花紋
  | 'bamboo'     // 竹葉
  | 'sparkle'    // 光點
  | 'trail'      // 路徑軌跡
  | 'match'      // 配對成功
  | 'shuffle'    // 洗牌效果
  | 'victory';   // 勝利慶祝

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

  // 麻將牌顏色主題
  private readonly tileColors: [number, number, number, number][] = [
    [0.9, 0.2, 0.2, 1.0],   // 紅 - 萬
    [0.2, 0.7, 0.3, 1.0],   // 綠 - 條
    [0.2, 0.4, 0.9, 1.0],   // 藍 - 筒
    [0.9, 0.8, 0.2, 1.0],   // 黃 - 字牌
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
        case 'mahjong':
          p.vx *= 0.95;
          p.vz *= 0.95;
          p.rotationSpeed *= 0.98;
          break;

        case 'bamboo':
          // 飄動效果
          p.vx += Math.sin(p.life * 10) * 0.1 * dt;
          p.vz += Math.cos(p.life * 8) * 0.05 * dt;
          break;

        case 'sparkle':
          p.size *= 0.97;
          break;

        case 'trail':
          p.size *= 0.9;
          p.vy += 0.5 * dt;
          break;

        case 'match':
          p.vx *= 0.92;
          p.vz *= 0.92;
          break;

        case 'shuffle':
          p.vx *= 0.95;
          p.vz *= 0.95;
          break;

        case 'victory':
          p.vx *= 0.98;
          p.vz *= 0.98;
          break;
      }

      // 更新透明度
      const lifeRatio = p.life / p.maxLife;
      p.color[3] = lifeRatio;
    }
  }

  /**
   * 配對成功效果
   */
  emitMatch(x1: number, z1: number, x2: number, z2: number, tileType: number): void {
    const count = 25;
    const baseColor = this.tileColors[tileType % this.tileColors.length];

    // 從兩個牌位置發射
    const positions = [[x1, z1], [x2, z2]];

    for (const [px, pz] of positions) {
      for (let i = 0; i < count; i++) {
        if (this.particles.length >= this.maxParticles) break;

        const angle = (i / count) * Math.PI * 2;
        const speed = 1.5 + Math.random() * 1.5;

        this.particles.push({
          x: px,
          y: 0.2,
          z: pz,
          vx: Math.cos(angle) * speed,
          vy: 1.5 + Math.random() * 1.5,
          vz: Math.sin(angle) * speed,
          life: 0.8 + Math.random() * 0.4,
          maxLife: 1.2,
          size: 0.06 + Math.random() * 0.03,
          type: 'match',
          color: [...baseColor] as [number, number, number, number],
          rotation: Math.random() * Math.PI * 2,
          rotationSpeed: (Math.random() - 0.5) * 6,
          gravity: 2.5,
        });
      }

      // 中心閃光
      for (let i = 0; i < 5; i++) {
        if (this.particles.length >= this.maxParticles) break;

        this.particles.push({
          x: px + (Math.random() - 0.5) * 0.2,
          y: 0.3,
          z: pz + (Math.random() - 0.5) * 0.2,
          vx: 0,
          vy: 0.3,
          vz: 0,
          life: 0.3,
          maxLife: 0.3,
          size: 0.12 + Math.random() * 0.06,
          type: 'sparkle',
          color: [1.0, 1.0, 0.8, 1.0],
          rotation: Math.random() * Math.PI * 2,
          rotationSpeed: 0,
          gravity: 0,
        });
      }
    }
  }

  /**
   * 路徑軌跡效果
   */
  emitPathTrail(path: Array<{x: number, z: number}>): void {
    if (path.length < 2) return;

    for (let i = 0; i < path.length - 1; i++) {
      const p1 = path[i];
      const p2 = path[i + 1];
      const segments = 5;

      for (let j = 0; j <= segments; j++) {
        if (this.particles.length >= this.maxParticles) break;

        const t = j / segments;
        const x = p1.x + (p2.x - p1.x) * t;
        const z = p1.z + (p2.z - p1.z) * t;

        this.particles.push({
          x: x + (Math.random() - 0.5) * 0.05,
          y: 0.15,
          z: z + (Math.random() - 0.5) * 0.05,
          vx: (Math.random() - 0.5) * 0.2,
          vy: 0.3 + Math.random() * 0.2,
          vz: (Math.random() - 0.5) * 0.2,
          life: 0.4 + Math.random() * 0.2,
          maxLife: 0.6,
          size: 0.03 + Math.random() * 0.02,
          type: 'trail',
          color: [0.0, 1.0, 0.6, 1.0],
          rotation: 0,
          rotationSpeed: 0,
          gravity: -0.5, // 上升
        });
      }
    }
  }

  /**
   * 選中效果
   */
  emitSelect(x: number, z: number): void {
    const count = 12;

    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const angle = (i / count) * Math.PI * 2;

      this.particles.push({
        x: x + Math.cos(angle) * 0.35,
        y: 0.25,
        z: z + Math.sin(angle) * 0.35,
        vx: Math.cos(angle) * 0.3,
        vy: 0.5,
        vz: Math.sin(angle) * 0.3,
        life: 0.4,
        maxLife: 0.4,
        size: 0.04,
        type: 'sparkle',
        color: [1.0, 0.9, 0.3, 1.0],
        rotation: angle,
        rotationSpeed: 0,
        gravity: 0,
      });
    }
  }

  /**
   * 洗牌效果
   */
  emitShuffle(centerX: number, centerZ: number, width: number, height: number): void {
    const count = 50;

    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const x = centerX + (Math.random() - 0.5) * width;
      const z = centerZ + (Math.random() - 0.5) * height;
      const angle = Math.random() * Math.PI * 2;
      const speed = 1 + Math.random() * 2;

      this.particles.push({
        x,
        y: 0.1,
        z,
        vx: Math.cos(angle) * speed,
        vy: 2 + Math.random() * 2,
        vz: Math.sin(angle) * speed,
        life: 1.0 + Math.random() * 0.5,
        maxLife: 1.5,
        size: 0.08 + Math.random() * 0.04,
        type: 'shuffle',
        color: [0.9, 0.85, 0.7, 1.0],
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 10,
        gravity: 3,
      });
    }

    // 竹葉效果
    for (let i = 0; i < 20; i++) {
      if (this.particles.length >= this.maxParticles) break;

      this.particles.push({
        x: centerX + (Math.random() - 0.5) * width,
        y: 2 + Math.random(),
        z: centerZ + (Math.random() - 0.5) * height,
        vx: (Math.random() - 0.5) * 0.5,
        vy: -0.5 - Math.random() * 0.5,
        vz: (Math.random() - 0.5) * 0.5,
        life: 2 + Math.random(),
        maxLife: 3,
        size: 0.1 + Math.random() * 0.05,
        type: 'bamboo',
        color: [0.3, 0.7, 0.3, 1.0],
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 3,
        gravity: 0.3,
      });
    }
  }

  /**
   * 提示效果
   */
  emitHint(x: number, z: number): void {
    const count = 8;

    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const angle = (i / count) * Math.PI * 2;
      const delay = i * 0.05;

      this.particles.push({
        x: x + Math.cos(angle) * 0.4,
        y: 0.3,
        z: z + Math.sin(angle) * 0.4,
        vx: 0,
        vy: 0.5,
        vz: 0,
        life: 0.8,
        maxLife: 0.8,
        size: 0.05,
        type: 'sparkle',
        color: [1.0, 0.8, 0.0, 1.0],
        rotation: 0,
        rotationSpeed: 0,
        gravity: -0.3,
      });
    }
  }

  /**
   * 勝利慶祝
   */
  emitVictory(centerX: number, centerZ: number): void {
    // 彩色爆炸
    const confettiCount = 100;
    const colors: [number, number, number, number][] = [
      [1.0, 0.3, 0.3, 1.0],
      [0.3, 1.0, 0.3, 1.0],
      [0.3, 0.3, 1.0, 1.0],
      [1.0, 1.0, 0.3, 1.0],
      [1.0, 0.5, 0.0, 1.0],
      [0.8, 0.3, 1.0, 1.0],
    ];

    for (let i = 0; i < confettiCount; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const angle = Math.random() * Math.PI * 2;
      const elevation = Math.random() * Math.PI * 0.4 + 0.2;
      const speed = 3 + Math.random() * 3;
      const colorIdx = Math.floor(Math.random() * colors.length);

      this.particles.push({
        x: centerX,
        y: 0.5,
        z: centerZ,
        vx: Math.cos(angle) * Math.cos(elevation) * speed,
        vy: Math.sin(elevation) * speed + 4,
        vz: Math.sin(angle) * Math.cos(elevation) * speed,
        life: 2.5 + Math.random() * 1.5,
        maxLife: 4,
        size: 0.06 + Math.random() * 0.04,
        type: 'victory',
        color: [...colors[colorIdx]] as [number, number, number, number],
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 10,
        gravity: 2.5,
      });
    }

    // 金色星星
    for (let i = 0; i < 30; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const angle = (i / 30) * Math.PI * 2;
      const speed = 2 + Math.random() * 2;

      this.particles.push({
        x: centerX,
        y: 0.3,
        z: centerZ,
        vx: Math.cos(angle) * speed,
        vy: 4 + Math.random() * 2,
        vz: Math.sin(angle) * speed,
        life: 2 + Math.random(),
        maxLife: 3,
        size: 0.08 + Math.random() * 0.05,
        type: 'sparkle',
        color: [1.0, 0.9, 0.2, 1.0],
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 8,
        gravity: 3,
      });
    }
  }

  /**
   * 遊戲結束效果
   */
  emitGameOver(centerX: number, centerZ: number): void {
    const count = 60;

    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const angle = Math.random() * Math.PI * 2;
      const speed = 1 + Math.random() * 2;

      // 灰暗色調
      const gray = 0.3 + Math.random() * 0.3;

      this.particles.push({
        x: centerX + (Math.random() - 0.5) * 4,
        y: 1 + Math.random() * 2,
        z: centerZ + (Math.random() - 0.5) * 3,
        vx: Math.cos(angle) * speed * 0.3,
        vy: -1 - Math.random(),
        vz: Math.sin(angle) * speed * 0.3,
        life: 2 + Math.random(),
        maxLife: 3,
        size: 0.1 + Math.random() * 0.08,
        type: 'mahjong',
        color: [gray, gray, gray, 1.0],
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 4,
        gravity: 2,
      });
    }
  }

  /**
   * 持續背景效果
   */
  emitAmbient(centerX: number, centerZ: number, width: number, height: number): void {
    if (Math.random() > 0.02) return; // 稀疏觸發
    if (this.particles.length >= this.maxParticles) return;

    // 偶爾的竹葉飄落
    this.particles.push({
      x: centerX + (Math.random() - 0.5) * width,
      y: 3,
      z: centerZ - height * 0.5,
      vx: (Math.random() - 0.5) * 0.3,
      vy: -0.3 - Math.random() * 0.2,
      vz: 0.2 + Math.random() * 0.3,
      life: 4 + Math.random() * 2,
      maxLife: 6,
      size: 0.08 + Math.random() * 0.04,
      type: 'bamboo',
      color: [0.2, 0.6, 0.25, 0.6],
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 2,
      gravity: 0.1,
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
