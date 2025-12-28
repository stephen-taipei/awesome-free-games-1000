/**
 * 粒子特效系統 - 華容道
 * Particle effects for Klotski puzzle game
 */

export type ParticleType =
  | 'moveDust'      // 方塊移動塵土
  | 'selection'     // 選中方塊閃爍
  | 'victory'       // 勝利慶祝
  | 'exitGlow'      // 出口發光
  | 'trail'         // 移動軌跡
  | 'spark';        // 碰撞火花

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
}

export class ParticleSystem {
  private particles: Particle[] = [];
  private readonly maxParticles = 2000;

  // 顏色配置
  private readonly colors = {
    caocao: [1.0, 0.2, 0.1, 1.0] as [number, number, number, number],      // 紅色
    general: [0.0, 0.8, 0.8, 1.0] as [number, number, number, number],     // 青色
    guanyu: [1.0, 0.85, 0.0, 1.0] as [number, number, number, number],     // 金色
    soldier: [0.2, 0.6, 1.0, 1.0] as [number, number, number, number],     // 藍色
    dust: [0.6, 0.5, 0.3, 0.8] as [number, number, number, number],        // 土色
    exit: [0.0, 1.0, 0.5, 1.0] as [number, number, number, number],        // 綠色
    gold: [1.0, 0.85, 0.0, 1.0] as [number, number, number, number],       // 金色
    white: [1.0, 1.0, 1.0, 1.0] as [number, number, number, number],       // 白色
  };

  update(deltaTime: number): void {
    const dt = deltaTime * 0.001; // 轉換為秒

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];

      // 更新生命週期
      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      // 更新位置
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;

      // 更新旋轉
      p.rotation += p.rotationSpeed * dt;

      // 根據類型應用不同物理效果
      switch (p.type) {
        case 'moveDust':
          // 灰塵受重力影響並減速
          p.vy -= 2.0 * dt;
          p.vx *= 0.95;
          p.vz *= 0.95;
          break;

        case 'selection':
          // 選中粒子緩慢上升並螺旋
          p.vy += 0.5 * dt;
          p.vx = Math.cos(p.rotation * 3) * 0.5;
          p.vz = Math.sin(p.rotation * 3) * 0.5;
          break;

        case 'victory':
          // 勝利粒子先上升後下落
          p.vy -= 3.0 * dt;
          p.vx *= 0.98;
          p.vz *= 0.98;
          break;

        case 'exitGlow':
          // 出口粒子緩慢螺旋上升
          p.vy += 0.3 * dt;
          const angle = p.rotation * 2;
          p.vx = Math.cos(angle) * 0.3;
          p.vz = Math.sin(angle) * 0.3;
          break;

        case 'trail':
          // 軌跡粒子快速消失
          p.size *= 0.95;
          break;

        case 'spark':
          // 火花快速移動並減速
          p.vy -= 5.0 * dt;
          p.vx *= 0.9;
          p.vz *= 0.9;
          break;
      }

      // 更新透明度（根據生命週期）
      const lifeRatio = p.life / p.maxLife;
      p.color[3] = lifeRatio * (p.type === 'trail' ? 0.5 : 1.0);
    }
  }

  /**
   * 方塊移動塵土效果
   */
  emitMoveDust(x: number, y: number, z: number, direction: { dx: number; dz: number }): void {
    const count = 15;

    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const angle = Math.random() * Math.PI * 2;
      const speed = 1 + Math.random() * 2;

      // 塵土主要向移動反方向噴射
      const oppositeX = -direction.dx * speed * 0.5;
      const oppositeZ = -direction.dz * speed * 0.5;

      this.particles.push({
        x: x + (Math.random() - 0.5) * 0.3,
        y: y + Math.random() * 0.1,
        z: z + (Math.random() - 0.5) * 0.3,
        vx: oppositeX + (Math.random() - 0.5) * speed,
        vy: Math.random() * 1.5 + 0.5,
        vz: oppositeZ + (Math.random() - 0.5) * speed,
        life: 0.5 + Math.random() * 0.5,
        maxLife: 1.0,
        size: 0.03 + Math.random() * 0.04,
        type: 'moveDust',
        color: [...this.colors.dust] as [number, number, number, number],
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 4,
      });
    }
  }

  /**
   * 方塊選中閃爍效果
   */
  emitSelection(x: number, y: number, z: number, width: number, height: number, blockType: string): void {
    const count = 8;

    // 根據方塊類型選擇顏色
    let color: [number, number, number, number];
    switch (blockType) {
      case 'CAOCAO':
        color = [...this.colors.caocao] as [number, number, number, number];
        break;
      case 'GENERAL_H':
        color = [...this.colors.guanyu] as [number, number, number, number];
        break;
      case 'GENERAL_V':
        color = [...this.colors.general] as [number, number, number, number];
        break;
      default:
        color = [...this.colors.soldier] as [number, number, number, number];
    }

    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;

      // 在方塊邊緣生成粒子
      const edge = Math.floor(Math.random() * 4);
      let px: number, pz: number;

      switch (edge) {
        case 0: // 上邊
          px = x + Math.random() * width;
          pz = z;
          break;
        case 1: // 下邊
          px = x + Math.random() * width;
          pz = z + height;
          break;
        case 2: // 左邊
          px = x;
          pz = z + Math.random() * height;
          break;
        default: // 右邊
          px = x + width;
          pz = z + Math.random() * height;
      }

      this.particles.push({
        x: px,
        y: y + 0.1,
        z: pz,
        vx: (Math.random() - 0.5) * 0.5,
        vy: 0.5 + Math.random() * 0.5,
        vz: (Math.random() - 0.5) * 0.5,
        life: 0.8 + Math.random() * 0.4,
        maxLife: 1.2,
        size: 0.04 + Math.random() * 0.03,
        type: 'selection',
        color,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 6,
      });
    }
  }

  /**
   * 勝利慶祝效果
   */
  emitVictory(x: number, y: number, z: number): void {
    const count = 150;

    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const angle = Math.random() * Math.PI * 2;
      const speed = 3 + Math.random() * 5;
      const elevation = Math.random() * Math.PI * 0.4 + Math.PI * 0.1; // 向上30-70度

      // 隨機選擇慶祝顏色
      const colorChoice = Math.random();
      let color: [number, number, number, number];
      if (colorChoice < 0.3) {
        color = [...this.colors.gold] as [number, number, number, number];
      } else if (colorChoice < 0.6) {
        color = [...this.colors.caocao] as [number, number, number, number];
      } else if (colorChoice < 0.8) {
        color = [...this.colors.white] as [number, number, number, number];
      } else {
        color = [Math.random(), Math.random(), Math.random(), 1.0];
      }

      this.particles.push({
        x: x + (Math.random() - 0.5) * 0.5,
        y: y,
        z: z + (Math.random() - 0.5) * 0.5,
        vx: Math.cos(angle) * Math.cos(elevation) * speed,
        vy: Math.sin(elevation) * speed + 2,
        vz: Math.sin(angle) * Math.cos(elevation) * speed,
        life: 2.0 + Math.random() * 1.5,
        maxLife: 3.5,
        size: 0.05 + Math.random() * 0.08,
        type: 'victory',
        color,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 8,
      });
    }
  }

  /**
   * 出口發光效果
   */
  emitExitGlow(x: number, y: number, z: number, intensity: number = 1.0): void {
    const count = Math.floor(3 * intensity);

    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * 0.3;

      this.particles.push({
        x: x + Math.cos(angle) * radius,
        y: y,
        z: z + Math.sin(angle) * radius,
        vx: 0,
        vy: 0.5 + Math.random() * 0.5,
        vz: 0,
        life: 1.0 + Math.random() * 0.5,
        maxLife: 1.5,
        size: 0.04 + Math.random() * 0.03,
        type: 'exitGlow',
        color: [...this.colors.exit] as [number, number, number, number],
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 4,
      });
    }
  }

  /**
   * 移動軌跡效果
   */
  emitTrail(x: number, y: number, z: number, blockType: string): void {
    if (this.particles.length >= this.maxParticles) return;

    // 根據方塊類型選擇顏色
    let color: [number, number, number, number];
    switch (blockType) {
      case 'CAOCAO':
        color = [...this.colors.caocao] as [number, number, number, number];
        break;
      case 'GENERAL_H':
        color = [...this.colors.guanyu] as [number, number, number, number];
        break;
      case 'GENERAL_V':
        color = [...this.colors.general] as [number, number, number, number];
        break;
      default:
        color = [...this.colors.soldier] as [number, number, number, number];
    }

    this.particles.push({
      x,
      y: y + 0.05,
      z,
      vx: 0,
      vy: 0,
      vz: 0,
      life: 0.3,
      maxLife: 0.3,
      size: 0.08,
      type: 'trail',
      color,
      rotation: 0,
      rotationSpeed: 0,
    });
  }

  /**
   * 碰撞火花效果
   */
  emitSpark(x: number, y: number, z: number): void {
    const count = 20;

    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 4;

      this.particles.push({
        x,
        y: y + 0.1,
        z,
        vx: Math.cos(angle) * speed,
        vy: 1 + Math.random() * 3,
        vz: Math.sin(angle) * speed,
        life: 0.2 + Math.random() * 0.3,
        maxLife: 0.5,
        size: 0.02 + Math.random() * 0.02,
        type: 'spark',
        color: [...this.colors.gold] as [number, number, number, number],
        rotation: 0,
        rotationSpeed: 0,
      });
    }
  }

  /**
   * 曹操接近出口時的特殊效果
   */
  emitCaocaoNearExit(x: number, y: number, z: number, distance: number): void {
    // 距離越近，效果越強
    const intensity = Math.max(0, 1 - distance / 2);
    if (intensity <= 0) return;

    const count = Math.floor(5 * intensity);

    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const angle = Math.random() * Math.PI * 2;
      const radius = 0.5 + Math.random() * 0.5;

      // 金色和紅色混合效果
      const color = Math.random() > 0.5
        ? [...this.colors.gold] as [number, number, number, number]
        : [...this.colors.caocao] as [number, number, number, number];

      this.particles.push({
        x: x + Math.cos(angle) * radius,
        y: y,
        z: z + Math.sin(angle) * radius,
        vx: Math.cos(angle) * 0.5,
        vy: 1 + Math.random() * 2,
        vz: Math.sin(angle) * 0.5,
        life: 1.0 + Math.random() * 0.5,
        maxLife: 1.5,
        size: 0.05 + Math.random() * 0.05,
        type: 'victory',
        color,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 6,
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
