/**
 * Particle System - Origami Puzzle
 * Japanese Washi Theme
 * Game #033
 */

export type ParticleType =
  | 'fold'     // Paper fold crease
  | 'sakura'   // Cherry blossom petal
  | 'victory'  // Level complete celebration
  | 'ambient'; // Floating paper fibers

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

  // Japanese color palette
  private readonly colors = {
    sakuraPink: [1.0, 0.75, 0.8, 1.0] as [number, number, number, number],
    sakuraLight: [1.0, 0.9, 0.92, 1.0] as [number, number, number, number],
    gold: [0.9, 0.8, 0.4, 1.0] as [number, number, number, number],
    indigo: [0.25, 0.3, 0.5, 1.0] as [number, number, number, number],
    vermillion: [0.85, 0.35, 0.25, 1.0] as [number, number, number, number],
    cream: [0.95, 0.92, 0.85, 1.0] as [number, number, number, number],
    matcha: [0.5, 0.65, 0.4, 1.0] as [number, number, number, number],
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
        case 'fold':
          // Quick sparkle fade
          p.vx *= 0.9;
          p.vy *= 0.9;
          p.size *= 0.95;
          break;

        case 'sakura':
          // Gentle floating with wind
          p.vy += 0.002; // Slight gravity
          p.vx += Math.sin(p.life * 5) * 0.001; // Sway
          p.vx *= 0.99;
          break;

        case 'victory':
          // Rise and spread
          p.vy -= 0.01;
          p.vx += Math.sin(p.life * 8) * 0.003;
          break;

        case 'ambient':
          // Very gentle drift
          p.vx += Math.sin(p.life * 2) * 0.0002;
          p.vy += Math.cos(p.life * 1.5) * 0.0001;
          break;
      }

      const lifeRatio = p.life / p.maxLife;
      p.color[3] = lifeRatio;
    }
  }

  /**
   * Paper fold crease effect
   */
  emitFold(x: number, y: number): void {
    const count = 10;

    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.3;
      const speed = 0.015 + Math.random() * 0.015;

      const color = Math.random() > 0.5 ? this.colors.cream : this.colors.gold;

      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.3 + Math.random() * 0.2,
        maxLife: 0.5,
        size: 0.006 + Math.random() * 0.004,
        type: 'fold',
        color: [...color] as [number, number, number, number],
      });
    }
  }

  /**
   * Sakura petals floating
   */
  emitSakura(): void {
    if (Math.random() > 0.03) return;
    if (this.particles.length >= this.maxParticles) return;

    const x = Math.random();
    const y = -0.05;

    const color = Math.random() > 0.3 ? this.colors.sakuraPink : this.colors.sakuraLight;

    this.particles.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 0.005,
      vy: 0.003 + Math.random() * 0.003,
      life: 5.0 + Math.random() * 3.0,
      maxLife: 8.0,
      size: 0.008 + Math.random() * 0.006,
      type: 'sakura',
      color: [...color] as [number, number, number, number],
    });
  }

  /**
   * Victory celebration
   */
  emitVictory(centerX: number, centerY: number): void {
    const count = 35;

    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const angle = (i / count) * Math.PI * 2;
      const speed = 0.015 + Math.random() * 0.02;

      const colors = [this.colors.sakuraPink, this.colors.gold, this.colors.vermillion];
      const color = colors[Math.floor(Math.random() * colors.length)];

      this.particles.push({
        x: centerX,
        y: centerY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 0.015,
        life: 1.0 + Math.random() * 0.5,
        maxLife: 1.5,
        size: 0.01 + Math.random() * 0.008,
        type: 'victory',
        color: [...color] as [number, number, number, number],
      });
    }

    // Extra sakura burst
    for (let i = 0; i < 15; i++) {
      if (this.particles.length >= this.maxParticles) break;

      this.particles.push({
        x: centerX + (Math.random() - 0.5) * 0.2,
        y: centerY + (Math.random() - 0.5) * 0.2,
        vx: (Math.random() - 0.5) * 0.02,
        vy: -0.02 - Math.random() * 0.02,
        life: 2.0 + Math.random() * 1.0,
        maxLife: 3.0,
        size: 0.012 + Math.random() * 0.008,
        type: 'sakura',
        color: [...this.colors.sakuraPink] as [number, number, number, number],
      });
    }
  }

  /**
   * Ambient paper fiber float
   */
  emitAmbient(): void {
    if (Math.random() > 0.02) return;
    if (this.particles.length >= this.maxParticles) return;

    const x = Math.random();
    const y = Math.random();

    this.particles.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 0.001,
      vy: (Math.random() - 0.5) * 0.001,
      life: 4.0 + Math.random() * 3.0,
      maxLife: 7.0,
      size: 0.002 + Math.random() * 0.002,
      type: 'ambient',
      color: [...this.colors.cream] as [number, number, number, number],
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
