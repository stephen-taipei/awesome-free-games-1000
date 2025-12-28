/**
 * Particle System - Dice Puzzle
 * Casino / Velvet Table / Gold Theme
 * Game #098
 */

export type ParticleType = 'dice' | 'roll' | 'dot' | 'spark' | 'victory' | 'path';

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  type: ParticleType;
  rotation: number;
  rotationSpeed: number;
  value: number; // For dice dots (1-6)
}

const PARTICLE_TYPE_MAP: Record<ParticleType, number> = {
  dice: 0,
  roll: 1,
  dot: 2,
  spark: 3,
  victory: 4,
  path: 5,
};

export class ParticleSystem {
  private particles: Particle[] = [];
  private maxParticles = 500;
  private width: number;
  private height: number;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
  }

  public resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
  }

  private addParticle(particle: Particle): void {
    if (this.particles.length < this.maxParticles) {
      this.particles.push(particle);
    }
  }

  public update(deltaTime: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];

      p.x += p.vx * deltaTime;
      p.y += p.vy * deltaTime;
      p.life -= deltaTime;
      p.rotation += p.rotationSpeed * deltaTime;

      // Gravity for dice particles
      if (p.type === 'dice' || p.type === 'dot') {
        p.vy += 150 * deltaTime;
      }

      // Friction for roll trails
      if (p.type === 'roll') {
        p.vx *= 0.95;
        p.vy *= 0.95;
      }

      // Sparks float up
      if (p.type === 'spark') {
        p.vy -= 50 * deltaTime;
        p.vx *= 0.98;
      }

      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  // Dice roll effect - called when dice moves
  public emitDiceRoll(x: number, y: number, direction: string): void {
    // Roll trail particles
    for (let i = 0; i < 8; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 30 + Math.random() * 50;

      this.addParticle({
        x: x + (Math.random() - 0.5) * 20,
        y: y + (Math.random() - 0.5) * 20,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.4 + Math.random() * 0.3,
        maxLife: 0.7,
        size: 8 + Math.random() * 12,
        type: 'roll',
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 3,
        value: 0,
      });
    }

    // Sparks from friction
    for (let i = 0; i < 5; i++) {
      this.addParticle({
        x: x + (Math.random() - 0.5) * 30,
        y: y + (Math.random() - 0.5) * 30,
        vx: (Math.random() - 0.5) * 100,
        vy: (Math.random() - 0.5) * 100 - 50,
        life: 0.3 + Math.random() * 0.3,
        maxLife: 0.6,
        size: 3 + Math.random() * 5,
        type: 'spark',
        rotation: 0,
        rotationSpeed: 0,
        value: 0,
      });
    }
  }

  // Dice lands on cell
  public emitDiceLand(x: number, y: number, topValue: number): void {
    // Small dice bounce effect
    this.addParticle({
      x,
      y,
      vx: 0,
      vy: -30,
      life: 0.5,
      maxLife: 0.5,
      size: 35,
      type: 'dice',
      rotation: 0,
      rotationSpeed: 0,
      value: topValue,
    });

    // Scatter dots representing dice value
    for (let i = 0; i < topValue; i++) {
      const angle = (Math.PI * 2 * i) / topValue;
      const speed = 80 + Math.random() * 40;

      this.addParticle({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 50,
        life: 0.6 + Math.random() * 0.3,
        maxLife: 0.9,
        size: 8 + Math.random() * 4,
        type: 'dot',
        rotation: 0,
        rotationSpeed: Math.random() * 5,
        value: topValue,
      });
    }
  }

  // Blocked cell collision
  public emitBlocked(x: number, y: number): void {
    for (let i = 0; i < 12; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 100 + Math.random() * 80;

      this.addParticle({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.4 + Math.random() * 0.2,
        maxLife: 0.6,
        size: 4 + Math.random() * 6,
        type: 'spark',
        rotation: 0,
        rotationSpeed: 0,
        value: 0,
      });
    }
  }

  // Goal reached with correct value
  public emitVictory(): void {
    const cx = this.width / 2;
    const cy = this.height / 2;

    // Victory stars burst
    for (let i = 0; i < 30; i++) {
      const angle = (Math.PI * 2 * i) / 30;
      const speed = 150 + Math.random() * 100;

      this.addParticle({
        x: cx + (Math.random() - 0.5) * 100,
        y: cy + (Math.random() - 0.5) * 100,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1.5 + Math.random() * 0.5,
        maxLife: 2.0,
        size: 15 + Math.random() * 20,
        type: 'victory',
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 4,
        value: 0,
      });
    }

    // Golden sparks everywhere
    for (let i = 0; i < 50; i++) {
      this.addParticle({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        vx: (Math.random() - 0.5) * 200,
        vy: (Math.random() - 0.5) * 200 - 100,
        life: 1.0 + Math.random() * 1.0,
        maxLife: 2.0,
        size: 5 + Math.random() * 10,
        type: 'spark',
        rotation: 0,
        rotationSpeed: 0,
        value: 0,
      });
    }
  }

  // Level start effect
  public emitLevelStart(): void {
    const cx = this.width / 2;
    const cy = this.height / 2;

    // Expanding ring of particles
    for (let i = 0; i < 24; i++) {
      const angle = (Math.PI * 2 * i) / 24;
      const speed = 100 + Math.random() * 50;

      this.addParticle({
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.8 + Math.random() * 0.3,
        maxLife: 1.1,
        size: 10 + Math.random() * 8,
        type: 'path',
        rotation: angle,
        rotationSpeed: 0,
        value: 0,
      });
    }
  }

  // Reset effect
  public emitReset(): void {
    // Particles converge to center
    for (let i = 0; i < 15; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 100 + Math.random() * 100;
      const x = this.width / 2 + Math.cos(angle) * dist;
      const y = this.height / 2 + Math.sin(angle) * dist;

      this.addParticle({
        x,
        y,
        vx: -Math.cos(angle) * 80,
        vy: -Math.sin(angle) * 80,
        life: 0.6,
        maxLife: 0.6,
        size: 8 + Math.random() * 8,
        type: 'roll',
        rotation: angle,
        rotationSpeed: 2,
        value: 0,
      });
    }
  }

  // Path highlight effect
  public emitPathHighlight(x: number, y: number): void {
    for (let i = 0; i < 5; i++) {
      this.addParticle({
        x: x + (Math.random() - 0.5) * 20,
        y: y + (Math.random() - 0.5) * 20,
        vx: (Math.random() - 0.5) * 30,
        vy: -20 - Math.random() * 30,
        life: 0.5 + Math.random() * 0.3,
        maxLife: 0.8,
        size: 10 + Math.random() * 10,
        type: 'path',
        rotation: 0,
        rotationSpeed: 0,
        value: 0,
      });
    }
  }

  public clear(): void {
    this.particles = [];
  }

  public getParticleCount(): number {
    return this.particles.length;
  }

  public getParticleData(): Float32Array {
    const data = new Float32Array(this.maxParticles * 10);

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      const offset = i * 10;

      data[offset + 0] = p.x;
      data[offset + 1] = p.y;
      data[offset + 2] = p.vx;
      data[offset + 3] = p.vy;
      data[offset + 4] = p.life;
      data[offset + 5] = p.maxLife;
      data[offset + 6] = p.size;
      data[offset + 7] = PARTICLE_TYPE_MAP[p.type];
      data[offset + 8] = p.rotation;
      data[offset + 9] = p.value;
    }

    return data;
  }
}
