/**
 * Particle System - Lights Out
 * Neon Circuit Theme
 * Game #032
 */

export type ParticleType =
  | 'toggle'    // Light toggled - electric spark
  | 'chain'     // Chain reaction effect
  | 'victory'   // All lights off celebration
  | 'ambient';  // Circuit energy flow

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  type: ParticleType;
  color: [number, number, number, number];
}

export class ParticleSystem {
  private particles: Particle[] = [];
  private readonly maxParticles = 300;

  // Neon circuit colors
  private readonly colors = {
    neonGreen: [0.2, 1.0, 0.4, 1.0] as [number, number, number, number],
    neonYellow: [1.0, 0.95, 0.3, 1.0] as [number, number, number, number],
    neonCyan: [0.0, 0.9, 1.0, 1.0] as [number, number, number, number],
    electric: [0.4, 0.8, 1.0, 1.0] as [number, number, number, number],
    spark: [1.0, 1.0, 0.8, 1.0] as [number, number, number, number],
    circuit: [0.0, 0.5, 0.3, 1.0] as [number, number, number, number],
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

      p.x += p.vx * dt;
      p.y += p.vy * dt;

      switch (p.type) {
        case 'toggle':
          // Electric sparks - erratic movement
          p.vx += (Math.random() - 0.5) * 0.1;
          p.vy += (Math.random() - 0.5) * 0.1;
          p.vx *= 0.92;
          p.vy *= 0.92;
          break;

        case 'chain':
          // Expanding ring - slow down
          p.vx *= 0.96;
          p.vy *= 0.96;
          p.size *= 1.02;
          break;

        case 'victory':
          // Rise and spread
          p.vy -= 0.02;
          p.vx += Math.sin(p.life * 10) * 0.005;
          break;

        case 'ambient':
          // Gentle flow along circuits
          p.vx += Math.sin(p.life * 3) * 0.0005;
          p.vy += Math.cos(p.life * 2) * 0.0003;
          break;
      }

      const lifeRatio = p.life / p.maxLife;
      p.color[3] = lifeRatio;
    }
  }

  /**
   * Light toggle - electric spark burst
   */
  emitToggle(x: number, y: number, isOn: boolean): void {
    const count = 12;

    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.5;
      const speed = 0.02 + Math.random() * 0.03;

      const color = isOn ? this.colors.neonYellow : this.colors.electric;

      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.3 + Math.random() * 0.2,
        maxLife: 0.5,
        size: 0.008 + Math.random() * 0.006,
        type: 'toggle',
        color: [...color] as [number, number, number, number],
      });
    }
  }

  /**
   * Chain reaction - ripple to adjacent cells
   */
  emitChain(x: number, y: number): void {
    if (this.particles.length >= this.maxParticles) return;

    // Expanding ring
    this.particles.push({
      x,
      y,
      vx: 0,
      vy: 0,
      life: 0.4,
      maxLife: 0.4,
      size: 0.02,
      type: 'chain',
      color: [...this.colors.neonCyan] as [number, number, number, number],
    });

    // Small sparks
    for (let i = 0; i < 4; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const angle = (i / 4) * Math.PI * 2;
      const speed = 0.04;

      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.25,
        maxLife: 0.25,
        size: 0.005,
        type: 'toggle',
        color: [...this.colors.spark] as [number, number, number, number],
      });
    }
  }

  /**
   * Victory - all lights off, power down celebration
   */
  emitVictory(centerX: number, centerY: number): void {
    const count = 50;

    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const angle = (i / count) * Math.PI * 2;
      const speed = 0.01 + Math.random() * 0.02;

      const colors = [this.colors.neonGreen, this.colors.neonCyan, this.colors.electric];
      const color = colors[Math.floor(Math.random() * colors.length)];

      this.particles.push({
        x: centerX,
        y: centerY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 0.02,
        life: 0.8 + Math.random() * 0.5,
        maxLife: 1.3,
        size: 0.01 + Math.random() * 0.008,
        type: 'victory',
        color: [...color] as [number, number, number, number],
      });
    }
  }

  /**
   * Ambient circuit energy
   */
  emitAmbient(): void {
    if (Math.random() > 0.02) return;
    if (this.particles.length >= this.maxParticles) return;

    const edge = Math.floor(Math.random() * 4);
    let x: number, y: number, vx: number, vy: number;

    switch (edge) {
      case 0: // Top
        x = Math.random();
        y = 0;
        vx = (Math.random() - 0.5) * 0.002;
        vy = 0.003;
        break;
      case 1: // Right
        x = 1;
        y = Math.random();
        vx = -0.003;
        vy = (Math.random() - 0.5) * 0.002;
        break;
      case 2: // Bottom
        x = Math.random();
        y = 1;
        vx = (Math.random() - 0.5) * 0.002;
        vy = -0.003;
        break;
      default: // Left
        x = 0;
        y = Math.random();
        vx = 0.003;
        vy = (Math.random() - 0.5) * 0.002;
    }

    this.particles.push({
      x,
      y,
      vx,
      vy,
      life: 3.0 + Math.random() * 2.0,
      maxLife: 5.0,
      size: 0.003 + Math.random() * 0.002,
      type: 'ambient',
      color: [...this.colors.circuit] as [number, number, number, number],
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
