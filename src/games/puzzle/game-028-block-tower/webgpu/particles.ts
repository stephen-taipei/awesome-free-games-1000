/**
 * Particle System - Block Tower
 * Neon Skyline Theme
 * Game #028
 */

export type ParticleType =
  | 'landing'    // Block lands
  | 'debris'     // Block falls off
  | 'sparkle'    // Height achievement
  | 'ambient';   // City atmosphere

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

  // Neon skyline colors
  private readonly colors = {
    cyan: [0.0, 0.9, 1.0, 1.0] as [number, number, number, number],
    pink: [1.0, 0.3, 0.6, 1.0] as [number, number, number, number],
    purple: [0.7, 0.3, 1.0, 1.0] as [number, number, number, number],
    yellow: [1.0, 0.9, 0.3, 1.0] as [number, number, number, number],
    orange: [1.0, 0.5, 0.1, 1.0] as [number, number, number, number],
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
        case 'landing':
          p.vx *= 0.92;
          p.vy *= 0.92;
          p.size *= 0.97;
          break;

        case 'debris':
          p.vy += 0.15; // Gravity
          p.vx *= 0.99;
          break;

        case 'sparkle':
          p.vy -= 0.02;
          p.vx += Math.sin(p.life * 5) * 0.002;
          break;

        case 'ambient':
          p.vy += Math.sin(p.life * 2) * 0.001;
          p.vx += Math.cos(p.life * 3) * 0.0005;
          break;
      }

      const lifeRatio = p.life / p.maxLife;
      p.color[3] = lifeRatio;
    }
  }

  /**
   * Block landing impact
   */
  emitLanding(x: number, y: number, blockColor: string): void {
    const count = 20;

    // Convert hex to RGB
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(blockColor);
    let color: [number, number, number, number] = [1, 0.5, 0, 1];
    if (result) {
      color = [
        parseInt(result[1], 16) / 255,
        parseInt(result[2], 16) / 255,
        parseInt(result[3], 16) / 255,
        1.0,
      ];
    }

    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const angle = (i / count) * Math.PI * 2;
      const speed = 0.02 + Math.random() * 0.03;

      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 0.01,
        life: 0.4 + Math.random() * 0.2,
        maxLife: 0.6,
        size: 0.01 + Math.random() * 0.008,
        type: 'landing',
        color: [...color] as [number, number, number, number],
      });
    }
  }

  /**
   * Block falling off / game over
   */
  emitDebris(x: number, y: number, blockColor: string): void {
    const count = 15;

    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(blockColor);
    let color: [number, number, number, number] = [1, 0.3, 0.3, 1];
    if (result) {
      color = [
        parseInt(result[1], 16) / 255,
        parseInt(result[2], 16) / 255,
        parseInt(result[3], 16) / 255,
        1.0,
      ];
    }

    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 0.8;
      const speed = 0.03 + Math.random() * 0.04;

      this.particles.push({
        x: x + (Math.random() - 0.5) * 0.1,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.8 + Math.random() * 0.4,
        maxLife: 1.2,
        size: 0.008 + Math.random() * 0.006,
        type: 'debris',
        color: [...color] as [number, number, number, number],
      });
    }
  }

  /**
   * Height milestone celebration
   */
  emitHeightAchievement(x: number, y: number): void {
    const count = 25;

    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const angle = (i / count) * Math.PI * 2;
      const speed = 0.03 + Math.random() * 0.02;

      const colors = [this.colors.cyan, this.colors.pink, this.colors.yellow, this.colors.white];
      const color = colors[Math.floor(Math.random() * colors.length)];

      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 0.02,
        life: 0.6 + Math.random() * 0.3,
        maxLife: 0.9,
        size: 0.012 + Math.random() * 0.008,
        type: 'sparkle',
        color: [...color] as [number, number, number, number],
      });
    }
  }

  /**
   * Ambient city particles
   */
  emitAmbient(): void {
    if (Math.random() > 0.03) return;
    if (this.particles.length >= this.maxParticles) return;

    const x = Math.random();
    const y = 0.8 + Math.random() * 0.2;

    const colors = [this.colors.cyan, this.colors.purple, this.colors.yellow];
    const color = colors[Math.floor(Math.random() * colors.length)];

    this.particles.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 0.002,
      vy: -0.005 - Math.random() * 0.005,
      life: 2.0 + Math.random() * 1.0,
      maxLife: 3.0,
      size: 0.003 + Math.random() * 0.002,
      type: 'ambient',
      color: [...color] as [number, number, number, number],
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
