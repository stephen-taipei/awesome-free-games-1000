/**
 * Particle Effects System - OneLine
 * Game #012
 */

export type ParticleType =
  | 'spark'     // 電流火花
  | 'trail'     // 軌跡粒子
  | 'burst'     // 完成爆發
  | 'ambient';  // 環境光點

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
}

export class ParticleSystem {
  private particles: Particle[] = [];
  private readonly maxParticles = 2000;

  // 電路顏色
  private readonly circuitColors: [number, number, number, number][] = [
    [0.0, 0.9, 0.8, 1.0],   // 青色
    [0.2, 1.0, 0.5, 1.0],   // 綠色
    [0.0, 0.7, 1.0, 1.0],   // 藍色
    [0.4, 1.0, 0.8, 1.0],   // 淺青
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

      // 根據類型應用效果
      switch (p.type) {
        case 'spark':
          p.vx *= 0.92;
          p.vy *= 0.92;
          p.size *= 0.95;
          break;

        case 'trail':
          p.size *= 0.9;
          break;

        case 'burst':
          p.vx *= 0.95;
          p.vy *= 0.95;
          p.size *= 0.98;
          break;

        case 'ambient':
          p.vy += 0.01 * dt;
          break;
      }

      // 更新透明度
      const lifeRatio = p.life / p.maxLife;
      p.color[3] = lifeRatio;
    }
  }

  /**
   * 連接節點效果 - 電流火花
   */
  emitConnect(x: number, y: number): void {
    const count = 20;
    const baseColor = this.circuitColors[0];

    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const angle = (i / count) * Math.PI * 2;
      const speed = 0.15 + Math.random() * 0.2;

      this.particles.push({
        x,
        y,
        z: 0.1,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        vz: 0,
        life: 0.3 + Math.random() * 0.2,
        maxLife: 0.5,
        size: 0.015 + Math.random() * 0.01,
        type: 'spark',
        color: [...baseColor] as [number, number, number, number],
      });
    }
  }

  /**
   * 線條軌跡效果
   */
  emitTrail(x: number, y: number): void {
    if (this.particles.length >= this.maxParticles) return;
    if (Math.random() > 0.5) return;

    const baseColor = this.circuitColors[1];

    this.particles.push({
      x: x + (Math.random() - 0.5) * 0.02,
      y: y + (Math.random() - 0.5) * 0.02,
      z: 0,
      vx: (Math.random() - 0.5) * 0.02,
      vy: (Math.random() - 0.5) * 0.02,
      vz: 0,
      life: 0.4,
      maxLife: 0.4,
      size: 0.008,
      type: 'trail',
      color: [...baseColor] as [number, number, number, number],
    });
  }

  /**
   * 選中節點效果
   */
  emitSelect(x: number, y: number): void {
    const count = 12;
    const baseColor = this.circuitColors[2];

    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const angle = (i / count) * Math.PI * 2;

      this.particles.push({
        x: x + Math.cos(angle) * 0.03,
        y: y + Math.sin(angle) * 0.03,
        z: 0.05,
        vx: Math.cos(angle) * 0.08,
        vy: Math.sin(angle) * 0.08,
        vz: 0,
        life: 0.3,
        maxLife: 0.3,
        size: 0.012,
        type: 'spark',
        color: [...baseColor] as [number, number, number, number],
      });
    }
  }

  /**
   * 關卡完成爆發效果
   */
  emitLevelComplete(centerX: number, centerY: number): void {
    // 彩色爆發
    for (let i = 0; i < 60; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const angle = Math.random() * Math.PI * 2;
      const speed = 0.2 + Math.random() * 0.3;
      const colorIdx = i % this.circuitColors.length;
      const baseColor = this.circuitColors[colorIdx];

      this.particles.push({
        x: centerX,
        y: centerY,
        z: 0.1,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        vz: 0,
        life: 1.0 + Math.random() * 0.5,
        maxLife: 1.5,
        size: 0.02 + Math.random() * 0.015,
        type: 'burst',
        color: [...baseColor] as [number, number, number, number],
      });
    }

    // 中心閃光
    for (let i = 0; i < 15; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const angle = (i / 15) * Math.PI * 2;
      const speed = 0.1;

      this.particles.push({
        x: centerX,
        y: centerY,
        z: 0.2,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        vz: 0,
        life: 0.5,
        maxLife: 0.5,
        size: 0.03,
        type: 'spark',
        color: [1.0, 1.0, 1.0, 1.0],
      });
    }
  }

  /**
   * 錯誤/重置效果
   */
  emitReset(centerX: number, centerY: number): void {
    for (let i = 0; i < 30; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * 0.2;

      this.particles.push({
        x: centerX + Math.cos(angle) * dist,
        y: centerY + Math.sin(angle) * dist,
        z: 0,
        vx: (Math.random() - 0.5) * 0.1,
        vy: -0.1 - Math.random() * 0.1,
        vz: 0,
        life: 0.6 + Math.random() * 0.3,
        maxLife: 0.9,
        size: 0.01 + Math.random() * 0.008,
        type: 'trail',
        color: [0.5, 0.5, 0.5, 1.0],
      });
    }
  }

  /**
   * 環境粒子
   */
  emitAmbient(width: number, height: number): void {
    if (Math.random() > 0.02) return;
    if (this.particles.length >= this.maxParticles) return;

    const colorIdx = Math.floor(Math.random() * this.circuitColors.length);
    const baseColor = this.circuitColors[colorIdx];

    this.particles.push({
      x: Math.random() * width,
      y: Math.random() * height,
      z: -0.2,
      vx: (Math.random() - 0.5) * 0.01,
      vy: 0.01 + Math.random() * 0.01,
      vz: 0,
      life: 3 + Math.random() * 2,
      maxLife: 5,
      size: 0.005 + Math.random() * 0.003,
      type: 'ambient',
      color: [baseColor[0] * 0.5, baseColor[1] * 0.5, baseColor[2] * 0.5, 0.3],
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
