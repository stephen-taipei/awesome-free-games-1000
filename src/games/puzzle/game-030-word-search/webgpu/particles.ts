/**
 * Particle System - Word Search
 * Ancient Scrolls Theme
 * Game #030
 */

export type ParticleType =
  | 'found'     // Word found - ink splash
  | 'select'    // Selection highlight
  | 'victory'   // All words found
  | 'dust';     // Ambient dust motes

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

  // Ancient scroll colors
  private readonly colors = {
    ink: [0.1, 0.05, 0.0, 1.0] as [number, number, number, number],
    sepia: [0.4, 0.25, 0.1, 1.0] as [number, number, number, number],
    gold: [0.9, 0.75, 0.3, 1.0] as [number, number, number, number],
    parchment: [0.85, 0.78, 0.65, 1.0] as [number, number, number, number],
    dust: [0.7, 0.6, 0.45, 1.0] as [number, number, number, number],
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
        case 'found':
          p.vy += 0.01; // Ink drips down
          p.vx *= 0.95;
          p.size *= 0.98;
          break;

        case 'select':
          p.vx *= 0.9;
          p.vy *= 0.9;
          p.size *= 0.95;
          break;

        case 'victory':
          p.vy -= 0.005;
          p.vx += Math.sin(p.life * 5) * 0.001;
          break;

        case 'dust':
          p.vy += Math.sin(p.life * 2) * 0.0003;
          p.vx += Math.cos(p.life * 1.5) * 0.0002;
          break;
      }

      const lifeRatio = p.life / p.maxLife;
      p.color[3] = lifeRatio;
    }
  }

  /**
   * Word found celebration
   */
  emitFound(x: number, y: number): void {
    const count = 15;

    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const angle = (i / count) * Math.PI * 2;
      const speed = 0.015 + Math.random() * 0.02;

      const color = Math.random() > 0.3 ? this.colors.ink : this.colors.sepia;

      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.5 + Math.random() * 0.3,
        maxLife: 0.8,
        size: 0.01 + Math.random() * 0.008,
        type: 'found',
        color: [...color] as [number, number, number, number],
      });
    }
  }

  /**
   * Selection trail
   */
  emitSelect(x: number, y: number): void {
    if (Math.random() > 0.4) return;
    if (this.particles.length >= this.maxParticles) return;

    this.particles.push({
      x: x + (Math.random() - 0.5) * 0.02,
      y: y + (Math.random() - 0.5) * 0.02,
      vx: (Math.random() - 0.5) * 0.005,
      vy: (Math.random() - 0.5) * 0.005,
      life: 0.3 + Math.random() * 0.2,
      maxLife: 0.5,
      size: 0.005 + Math.random() * 0.003,
      type: 'select',
      color: [...this.colors.sepia] as [number, number, number, number],
    });
  }

  /**
   * Victory celebration - golden illumination
   */
  emitVictory(centerX: number, centerY: number): void {
    const count = 40;

    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const angle = (i / count) * Math.PI * 2;
      const speed = 0.02 + Math.random() * 0.03;

      this.particles.push({
        x: centerX,
        y: centerY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 0.01,
        life: 0.8 + Math.random() * 0.5,
        maxLife: 1.3,
        size: 0.01 + Math.random() * 0.008,
        type: 'victory',
        color: [...this.colors.gold] as [number, number, number, number],
      });
    }
  }

  /**
   * Ambient dust motes
   */
  emitDust(): void {
    if (Math.random() > 0.02) return;
    if (this.particles.length >= this.maxParticles) return;

    const x = Math.random();
    const y = Math.random();

    this.particles.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 0.001,
      vy: -0.002 - Math.random() * 0.002,
      life: 3.0 + Math.random() * 2.0,
      maxLife: 5.0,
      size: 0.003 + Math.random() * 0.002,
      type: 'dust',
      color: [...this.colors.dust] as [number, number, number, number],
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
