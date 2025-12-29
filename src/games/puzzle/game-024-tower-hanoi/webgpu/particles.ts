/**
 * Particle System - Tower of Hanoi
 * Arcane Dimensional Theme
 * Game #024
 */

export type ParticleType =
  | 'pickup'    // Disk picked up
  | 'drop'      // Disk dropped
  | 'trail'     // Movement trail
  | 'complete'  // Puzzle solved
  | 'ambient';  // Background magic

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

  // Arcane theme colors
  private readonly colors = {
    purple: [0.6, 0.3, 0.9, 1.0] as [number, number, number, number],
    gold: [1.0, 0.8, 0.3, 1.0] as [number, number, number, number],
    magenta: [0.9, 0.3, 0.6, 1.0] as [number, number, number, number],
    cyan: [0.3, 0.8, 1.0, 1.0] as [number, number, number, number],
    white: [1.0, 1.0, 1.0, 1.0] as [number, number, number, number],
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
        case 'pickup':
          p.vy -= 0.05; // Float upward
          p.vx *= 0.98;
          p.size *= 0.98;
          break;

        case 'drop':
          p.vx *= 0.92;
          p.vy *= 0.92;
          break;

        case 'trail':
          p.vx *= 0.95;
          p.vy *= 0.95;
          p.size *= 0.97;
          break;

        case 'complete':
          p.vy -= 0.02;
          p.vx += Math.sin(p.life * 5) * 0.001;
          break;

        case 'ambient':
          p.vy -= 0.001;
          p.vx += Math.sin(p.life * 2) * 0.0005;
          break;
      }

      const lifeRatio = p.life / p.maxLife;
      p.color[3] = lifeRatio;
    }
  }

  /**
   * Disk pickup effect
   */
  emitPickup(x: number, y: number, diskColor: [number, number, number]): void {
    const count = 12;

    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const angle = (i / count) * Math.PI * 2;
      const speed = 0.02 + Math.random() * 0.02;

      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 0.03,
        life: 0.4 + Math.random() * 0.2,
        maxLife: 0.6,
        size: 0.01 + Math.random() * 0.005,
        type: 'pickup',
        color: [diskColor[0], diskColor[1], diskColor[2], 1.0],
      });
    }

    // Add gold sparkles
    for (let i = 0; i < 5; i++) {
      if (this.particles.length >= this.maxParticles) break;

      this.particles.push({
        x: x + (Math.random() - 0.5) * 0.05,
        y,
        vx: (Math.random() - 0.5) * 0.01,
        vy: -0.04 - Math.random() * 0.02,
        life: 0.5,
        maxLife: 0.5,
        size: 0.006,
        type: 'pickup',
        color: [...this.colors.gold] as [number, number, number, number],
      });
    }
  }

  /**
   * Disk drop effect
   */
  emitDrop(x: number, y: number, diskColor: [number, number, number]): void {
    const count = 15;

    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const angle = Math.random() * Math.PI * 2;
      const speed = 0.03 + Math.random() * 0.03;

      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed * 0.5,
        life: 0.3 + Math.random() * 0.2,
        maxLife: 0.5,
        size: 0.012 + Math.random() * 0.008,
        type: 'drop',
        color: [diskColor[0], diskColor[1], diskColor[2], 1.0],
      });
    }

    // Impact ring
    for (let i = 0; i < 8; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const angle = (i / 8) * Math.PI * 2;

      this.particles.push({
        x: x + Math.cos(angle) * 0.03,
        y: y + Math.sin(angle) * 0.01,
        vx: Math.cos(angle) * 0.02,
        vy: Math.sin(angle) * 0.005,
        life: 0.25,
        maxLife: 0.25,
        size: 0.008,
        type: 'drop',
        color: [...this.colors.purple] as [number, number, number, number],
      });
    }
  }

  /**
   * Movement trail
   */
  emitTrail(x: number, y: number): void {
    if (Math.random() > 0.3) return;
    if (this.particles.length >= this.maxParticles) return;

    const colors = [this.colors.purple, this.colors.gold, this.colors.magenta];
    const color = colors[Math.floor(Math.random() * colors.length)];

    this.particles.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 0.005,
      vy: (Math.random() - 0.5) * 0.005,
      life: 0.3 + Math.random() * 0.2,
      maxLife: 0.5,
      size: 0.008 + Math.random() * 0.004,
      type: 'trail',
      color: [...color] as [number, number, number, number],
    });
  }

  /**
   * Puzzle complete celebration
   */
  emitComplete(centerX: number, centerY: number): void {
    const count = 40;

    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const angle = (i / count) * Math.PI * 2;
      const speed = 0.05 + Math.random() * 0.05;

      const colors = [this.colors.gold, this.colors.purple, this.colors.magenta, this.colors.white];
      const color = colors[Math.floor(Math.random() * colors.length)];

      this.particles.push({
        x: centerX,
        y: centerY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1.0 + Math.random() * 0.5,
        maxLife: 1.5,
        size: 0.015 + Math.random() * 0.01,
        type: 'complete',
        color: [...color] as [number, number, number, number],
      });
    }

    // Outer ring burst
    for (let i = 0; i < 15; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const angle = (i / 15) * Math.PI * 2;

      this.particles.push({
        x: centerX + Math.cos(angle) * 0.15,
        y: centerY + Math.sin(angle) * 0.1,
        vx: Math.cos(angle) * 0.04,
        vy: Math.sin(angle) * 0.03,
        life: 0.8,
        maxLife: 0.8,
        size: 0.012,
        type: 'complete',
        color: [...this.colors.gold] as [number, number, number, number],
      });
    }
  }

  /**
   * Ambient arcane particles
   */
  emitAmbient(): void {
    if (Math.random() > 0.03) return;
    if (this.particles.length >= this.maxParticles) return;

    const x = Math.random();
    const y = 0.7 + Math.random() * 0.3;

    this.particles.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 0.002,
      vy: -0.01 - Math.random() * 0.01,
      life: 2.0 + Math.random() * 1.0,
      maxLife: 3.0,
      size: 0.004 + Math.random() * 0.003,
      type: 'ambient',
      color: [0.5 + Math.random() * 0.3, 0.2 + Math.random() * 0.2, 0.7 + Math.random() * 0.3, 0.4],
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
