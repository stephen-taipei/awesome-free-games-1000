/**
 * Particle System - 15 Puzzle
 * Holographic Interface Theme
 * Game #025
 */

export type ParticleType =
  | 'slide'     // Tile sliding
  | 'correct'   // Tile in correct position
  | 'complete'  // Puzzle solved
  | 'ambient';  // Background data

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

  // Holographic theme colors
  private readonly colors = {
    cyan: [0.0, 0.8, 1.0, 1.0] as [number, number, number, number],
    teal: [0.0, 0.6, 0.6, 1.0] as [number, number, number, number],
    blue: [0.2, 0.4, 0.9, 1.0] as [number, number, number, number],
    white: [1.0, 1.0, 1.0, 1.0] as [number, number, number, number],
    green: [0.0, 1.0, 0.6, 1.0] as [number, number, number, number],
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
        case 'slide':
          p.vx *= 0.92;
          p.vy *= 0.92;
          p.size *= 0.96;
          break;

        case 'correct':
          p.vy -= 0.03;
          p.vx *= 0.98;
          break;

        case 'complete':
          p.vy -= 0.01;
          p.vx += Math.sin(p.life * 4) * 0.001;
          break;

        case 'ambient':
          p.vy += 0.005;
          p.vx += Math.sin(p.life * 2) * 0.0003;
          break;
      }

      const lifeRatio = p.life / p.maxLife;
      p.color[3] = lifeRatio;
    }
  }

  /**
   * Tile slide effect
   */
  emitSlide(fromX: number, fromY: number, toX: number, toY: number): void {
    const count = 10;
    const dx = toX - fromX;
    const dy = toY - fromY;

    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const t = i / count;
      const x = fromX + dx * t;
      const y = fromY + dy * t;

      this.particles.push({
        x,
        y,
        vx: dx * 0.1 + (Math.random() - 0.5) * 0.02,
        vy: dy * 0.1 + (Math.random() - 0.5) * 0.02,
        life: 0.3 + Math.random() * 0.1,
        maxLife: 0.4,
        size: 0.008 + Math.random() * 0.004,
        type: 'slide',
        color: [...this.colors.cyan] as [number, number, number, number],
      });
    }
  }

  /**
   * Tile in correct position
   */
  emitCorrect(x: number, y: number): void {
    const count = 15;

    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const angle = (i / count) * Math.PI * 2;
      const speed = 0.03 + Math.random() * 0.02;

      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.5 + Math.random() * 0.2,
        maxLife: 0.7,
        size: 0.01 + Math.random() * 0.005,
        type: 'correct',
        color: [...this.colors.green] as [number, number, number, number],
      });
    }

    // Sparkle ring
    for (let i = 0; i < 8; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const angle = (i / 8) * Math.PI * 2;
      const radius = 0.04;

      this.particles.push({
        x: x + Math.cos(angle) * radius,
        y: y + Math.sin(angle) * radius,
        vx: Math.cos(angle) * 0.02,
        vy: Math.sin(angle) * 0.02,
        life: 0.4,
        maxLife: 0.4,
        size: 0.006,
        type: 'correct',
        color: [...this.colors.white] as [number, number, number, number],
      });
    }
  }

  /**
   * Puzzle complete celebration
   */
  emitComplete(centerX: number, centerY: number): void {
    const count = 50;

    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const angle = (i / count) * Math.PI * 2;
      const speed = 0.05 + Math.random() * 0.05;

      const colors = [this.colors.cyan, this.colors.teal, this.colors.green, this.colors.white];
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

    // Holographic ring burst
    for (let i = 0; i < 20; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const angle = (i / 20) * Math.PI * 2;
      const radius = 0.1;

      this.particles.push({
        x: centerX + Math.cos(angle) * radius,
        y: centerY + Math.sin(angle) * radius,
        vx: Math.cos(angle) * 0.04,
        vy: Math.sin(angle) * 0.04,
        life: 0.8,
        maxLife: 0.8,
        size: 0.01,
        type: 'complete',
        color: [...this.colors.cyan] as [number, number, number, number],
      });
    }
  }

  /**
   * Ambient holographic data
   */
  emitAmbient(): void {
    if (Math.random() > 0.02) return;
    if (this.particles.length >= this.maxParticles) return;

    const x = Math.random();
    const y = 0;

    this.particles.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 0.002,
      vy: 0.015 + Math.random() * 0.01,
      life: 2.0 + Math.random() * 1.0,
      maxLife: 3.0,
      size: 0.003 + Math.random() * 0.002,
      type: 'ambient',
      color: [0.0, 0.5 + Math.random() * 0.3, 0.7 + Math.random() * 0.3, 0.3],
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
