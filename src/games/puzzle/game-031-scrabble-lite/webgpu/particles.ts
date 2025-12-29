/**
 * Particle System - Scrabble Lite
 * Vintage Letterpress Theme
 * Game #031
 */

export type ParticleType =
  | 'place'    // Tile placed - ink splatter
  | 'drag'     // Tile dragging - paper dust
  | 'score'    // Points scored - golden stamp
  | 'ambient'; // Floating dust motes

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

  // Vintage letterpress colors
  private readonly colors = {
    ink: [0.1, 0.08, 0.12, 1.0] as [number, number, number, number],
    paper: [0.95, 0.92, 0.85, 1.0] as [number, number, number, number],
    gold: [0.85, 0.65, 0.2, 1.0] as [number, number, number, number],
    brass: [0.75, 0.55, 0.2, 1.0] as [number, number, number, number],
    dust: [0.6, 0.55, 0.45, 1.0] as [number, number, number, number],
    mahogany: [0.35, 0.18, 0.1, 1.0] as [number, number, number, number],
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
          // Ink splatter settles
          p.vy += 0.02;
          p.vx *= 0.92;
          p.size *= 0.97;
          break;

        case 'drag':
          // Paper dust floats
          p.vy -= 0.005;
          p.vx += Math.sin(p.life * 8) * 0.002;
          p.size *= 0.98;
          break;

        case 'score':
          // Golden sparkles rise
          p.vy -= 0.015;
          p.vx += Math.sin(p.life * 5) * 0.003;
          break;

        case 'ambient':
          // Gentle floating
          p.vy += Math.sin(p.life * 2) * 0.0002;
          p.vx += Math.cos(p.life * 1.5) * 0.0001;
          break;
      }

      const lifeRatio = p.life / p.maxLife;
      p.color[3] = lifeRatio;
    }
  }

  /**
   * Tile placed - ink splatter effect
   */
  emitPlace(x: number, y: number): void {
    const count = 12;

    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.3;
      const speed = 0.02 + Math.random() * 0.025;

      const color = Math.random() > 0.3 ? this.colors.ink : this.colors.mahogany;

      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.4 + Math.random() * 0.2,
        maxLife: 0.6,
        size: 0.008 + Math.random() * 0.006,
        type: 'place',
        color: [...color] as [number, number, number, number],
      });
    }
  }

  /**
   * Drag trail - paper dust
   */
  emitDrag(x: number, y: number): void {
    if (Math.random() > 0.5) return;
    if (this.particles.length >= this.maxParticles) return;

    this.particles.push({
      x: x + (Math.random() - 0.5) * 0.03,
      y: y + (Math.random() - 0.5) * 0.03,
      vx: (Math.random() - 0.5) * 0.008,
      vy: (Math.random() - 0.5) * 0.008,
      life: 0.3 + Math.random() * 0.2,
      maxLife: 0.5,
      size: 0.004 + Math.random() * 0.003,
      type: 'drag',
      color: [...this.colors.paper] as [number, number, number, number],
    });
  }

  /**
   * Score celebration - golden stamp burst
   */
  emitScore(x: number, y: number, points: number): void {
    const count = 10 + Math.min(points, 30);

    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const angle = (i / count) * Math.PI * 2;
      const speed = 0.015 + Math.random() * 0.02;

      const color = Math.random() > 0.4 ? this.colors.gold : this.colors.brass;

      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 0.01,
        life: 0.6 + Math.random() * 0.4,
        maxLife: 1.0,
        size: 0.008 + Math.random() * 0.006,
        type: 'score',
        color: [...color] as [number, number, number, number],
      });
    }
  }

  /**
   * Ambient dust motes in lamplight
   */
  emitAmbient(): void {
    if (Math.random() > 0.015) return;
    if (this.particles.length >= this.maxParticles) return;

    // More dust in upper area (lamp light cone)
    const x = Math.random();
    const y = Math.random() * 0.6;

    this.particles.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 0.001,
      vy: 0.001 + Math.random() * 0.002,
      life: 4.0 + Math.random() * 3.0,
      maxLife: 7.0,
      size: 0.002 + Math.random() * 0.002,
      type: 'ambient',
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
