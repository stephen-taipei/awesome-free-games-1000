/**
 * Particle System - Block Blast
 * Digital Matrix Theme
 * Game #023
 */

export type ParticleType =
  | 'place'    // Block placement
  | 'clear'    // Line clear
  | 'combo'    // Multi-line combo
  | 'ambient'; // Background particles

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

  // Digital matrix colors
  private readonly colors = {
    green: [0.0, 0.9, 0.4, 1.0] as [number, number, number, number],
    cyan: [0.0, 0.8, 1.0, 1.0] as [number, number, number, number],
    lime: [0.4, 1.0, 0.2, 1.0] as [number, number, number, number],
    white: [1.0, 1.0, 1.0, 1.0] as [number, number, number, number],
    yellow: [1.0, 0.9, 0.2, 1.0] as [number, number, number, number],
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
        case 'place':
          p.vx *= 0.9;
          p.vy *= 0.9;
          p.size *= 0.95;
          break;

        case 'clear':
          p.vx *= 0.95;
          p.vy *= 0.95;
          break;

        case 'combo':
          p.vy -= 0.0002;
          p.vx *= 0.98;
          break;

        case 'ambient':
          p.vy -= 0.00005;
          p.vx += Math.sin(p.life * 3) * 0.00005;
          break;
      }

      const lifeRatio = p.life / p.maxLife;
      p.color[3] = lifeRatio;
    }
  }

  /**
   * Block placement effect
   */
  emitPlace(x: number, y: number, color: [number, number, number]): void {
    const count = 8;

    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const angle = (i / count) * Math.PI * 2;
      const speed = 0.03 + Math.random() * 0.02;

      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.25 + Math.random() * 0.1,
        maxLife: 0.35,
        size: 0.01 + Math.random() * 0.005,
        type: 'place',
        color: [color[0], color[1], color[2], 1.0],
      });
    }
  }

  /**
   * Line clear explosion
   */
  emitClear(cells: { x: number; y: number; color: [number, number, number] }[]): void {
    cells.forEach(cell => {
      const count = 6;

      for (let i = 0; i < count; i++) {
        if (this.particles.length >= this.maxParticles) break;

        const angle = Math.random() * Math.PI * 2;
        const speed = 0.04 + Math.random() * 0.03;

        this.particles.push({
          x: cell.x,
          y: cell.y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 0.4 + Math.random() * 0.2,
          maxLife: 0.6,
          size: 0.012 + Math.random() * 0.008,
          type: 'clear',
          color: [cell.color[0], cell.color[1], cell.color[2], 1.0],
        });
      }
    });

    // Extra white sparkles
    cells.forEach(cell => {
      if (Math.random() > 0.5) return;
      if (this.particles.length >= this.maxParticles) return;

      this.particles.push({
        x: cell.x,
        y: cell.y,
        vx: (Math.random() - 0.5) * 0.02,
        vy: -0.04 - Math.random() * 0.02,
        life: 0.3,
        maxLife: 0.3,
        size: 0.008,
        type: 'clear',
        color: [...this.colors.white] as [number, number, number, number],
      });
    });
  }

  /**
   * Multi-line combo celebration
   */
  emitCombo(centerX: number, centerY: number, comboLevel: number): void {
    const count = 15 + comboLevel * 10;

    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const angle = Math.random() * Math.PI * 2;
      const speed = 0.05 + Math.random() * 0.05;

      const colors = [this.colors.green, this.colors.lime, this.colors.cyan, this.colors.yellow];
      const color = colors[Math.floor(Math.random() * colors.length)];

      this.particles.push({
        x: centerX,
        y: centerY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.8 + Math.random() * 0.4,
        maxLife: 1.2,
        size: 0.015 + Math.random() * 0.01,
        type: 'combo',
        color: [...color] as [number, number, number, number],
      });
    }

    // Outer ring
    for (let i = 0; i < 10; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const angle = (i / 10) * Math.PI * 2;
      const radius = 0.1 + comboLevel * 0.02;

      this.particles.push({
        x: centerX + Math.cos(angle) * radius,
        y: centerY + Math.sin(angle) * radius,
        vx: Math.cos(angle) * 0.03,
        vy: Math.sin(angle) * 0.03,
        life: 0.5,
        maxLife: 0.5,
        size: 0.012,
        type: 'combo',
        color: [...this.colors.white] as [number, number, number, number],
      });
    }
  }

  /**
   * Digital matrix rain
   */
  emitAmbient(): void {
    if (Math.random() > 0.02) return;
    if (this.particles.length >= this.maxParticles) return;

    const x = Math.random();

    this.particles.push({
      x,
      y: 0,
      vx: 0,
      vy: 0.02 + Math.random() * 0.02,
      life: 2.0 + Math.random() * 1.0,
      maxLife: 3.0,
      size: 0.004 + Math.random() * 0.003,
      type: 'ambient',
      color: [0.0, 0.6 + Math.random() * 0.3, 0.3 + Math.random() * 0.2, 0.3],
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
