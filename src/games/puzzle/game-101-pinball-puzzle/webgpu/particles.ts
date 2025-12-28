/**
 * Particle System - Pinball Puzzle
 * Neon Arcade / Retro Pinball Machine Theme
 * Game #101
 */

export type ParticleType = 'ball' | 'bumper' | 'target' | 'flipper' | 'spark' | 'multiball';

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  rotation: number;
  rotationSpeed: number;
  type: ParticleType;
  extra: number;
}

const PARTICLE_TYPE_MAP: Record<ParticleType, number> = {
  ball: 0,
  bumper: 1,
  target: 2,
  flipper: 3,
  spark: 4,
  multiball: 5,
};

export class ParticleSystem {
  private particles: Particle[] = [];
  private width: number;
  private height: number;
  private maxParticles: number = 500;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
  }

  public resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
  }

  public update(deltaTime: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];

      p.life -= deltaTime;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      p.x += p.vx * deltaTime;
      p.y += p.vy * deltaTime;
      p.rotation += p.rotationSpeed * deltaTime;

      // Type-specific behavior
      switch (p.type) {
        case 'ball':
          p.vy += 50 * deltaTime; // Light gravity
          p.vx *= 0.98;
          break;
        case 'bumper':
          p.vx *= 0.95;
          p.vy *= 0.95;
          p.size *= 1.02;
          break;
        case 'target':
          p.vy -= 30 * deltaTime; // Float up
          p.vx *= 0.97;
          break;
        case 'flipper':
          p.vy += 30 * deltaTime;
          p.size *= 0.98;
          break;
        case 'spark':
          p.vx *= 0.9;
          p.vy *= 0.9;
          break;
        case 'multiball':
          p.vy += 20 * deltaTime;
          p.rotationSpeed *= 0.99;
          break;
      }
    }
  }

  private emit(config: Partial<Particle> & { type: ParticleType }): void {
    if (this.particles.length >= this.maxParticles) return;

    const particle: Particle = {
      x: config.x ?? this.width / 2,
      y: config.y ?? this.height / 2,
      vx: config.vx ?? 0,
      vy: config.vy ?? 0,
      life: config.life ?? 1,
      maxLife: config.maxLife ?? config.life ?? 1,
      size: config.size ?? 20,
      rotation: config.rotation ?? Math.random() * Math.PI * 2,
      rotationSpeed: config.rotationSpeed ?? 0,
      type: config.type,
      extra: config.extra ?? 0,
    };

    this.particles.push(particle);
  }

  // Ball movement trail
  public emitBallTrail(x: number, y: number, vx: number, vy: number): void {
    const speed = Math.sqrt(vx * vx + vy * vy);
    if (speed < 2) return;

    for (let i = 0; i < 2; i++) {
      this.emit({
        type: 'ball',
        x: x + (Math.random() - 0.5) * 10,
        y: y + (Math.random() - 0.5) * 10,
        vx: -vx * 0.1 + (Math.random() - 0.5) * 20,
        vy: -vy * 0.1 + (Math.random() - 0.5) * 20,
        size: 8 + Math.random() * 6,
        life: 0.3 + Math.random() * 0.2,
      });
    }
  }

  // Bumper hit effect
  public emitBumperHit(x: number, y: number): void {
    // Green burst
    for (let i = 0; i < 15; i++) {
      const angle = (i / 15) * Math.PI * 2;
      const speed = 80 + Math.random() * 50;
      this.emit({
        type: 'bumper',
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 20 + Math.random() * 15,
        life: 0.5 + Math.random() * 0.2,
      });
    }

    // Central flash
    this.emit({
      type: 'spark',
      x,
      y,
      vx: 0,
      vy: 0,
      size: 40,
      life: 0.2,
    });
  }

  // Target hit effect
  public emitTargetHit(x: number, y: number, points: number): void {
    // Yellow burst
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      const speed = 60 + Math.random() * 40;
      this.emit({
        type: 'target',
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 20,
        size: 15 + Math.random() * 10,
        life: 0.6 + Math.random() * 0.3,
        extra: points,
      });
    }

    // Score sparks
    for (let i = 0; i < 6; i++) {
      this.emit({
        type: 'spark',
        x: x + (Math.random() - 0.5) * 20,
        y: y + (Math.random() - 0.5) * 20,
        vx: (Math.random() - 0.5) * 100,
        vy: -50 - Math.random() * 50,
        size: 10 + Math.random() * 8,
        life: 0.4 + Math.random() * 0.2,
      });
    }
  }

  // Flipper action effect
  public emitFlipperAction(x: number, y: number, endX: number, endY: number): void {
    // Trail along flipper
    const steps = 5;
    for (let i = 0; i < steps; i++) {
      const t = i / (steps - 1);
      const px = x + (endX - x) * t;
      const py = y + (endY - y) * t;

      this.emit({
        type: 'flipper',
        x: px,
        y: py,
        vx: (Math.random() - 0.5) * 50,
        vy: -30 - Math.random() * 30,
        size: 12 + Math.random() * 8,
        life: 0.3 + Math.random() * 0.2,
      });
    }
  }

  // Ball launch effect
  public emitLaunch(x: number, y: number): void {
    // Launch burst
    for (let i = 0; i < 10; i++) {
      const angle = Math.PI + (Math.random() - 0.5) * 0.5;
      const speed = 100 + Math.random() * 80;
      this.emit({
        type: 'spark',
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 15 + Math.random() * 10,
        life: 0.4 + Math.random() * 0.2,
      });
    }
  }

  // Ball lost effect
  public emitBallLost(x: number, y: number): void {
    // Explosion
    for (let i = 0; i < 20; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 50 + Math.random() * 80;
      this.emit({
        type: 'spark',
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 10 + Math.random() * 15,
        life: 0.5 + Math.random() * 0.3,
      });
    }
  }

  // Victory celebration
  public emitVictory(): void {
    const cx = this.width / 2;
    const cy = this.height / 2;

    // Rainbow explosion
    for (let i = 0; i < 50; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 100 + Math.random() * 150;
      this.emit({
        type: 'multiball',
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 15 + Math.random() * 25,
        life: 1.5 + Math.random() * 0.5,
        rotationSpeed: (Math.random() - 0.5) * 10,
      });
    }

    // Additional bursts
    for (let i = 0; i < 4; i++) {
      setTimeout(() => {
        const x = Math.random() * this.width;
        const y = Math.random() * this.height * 0.6;

        for (let j = 0; j < 15; j++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = 60 + Math.random() * 80;
          this.emit({
            type: 'multiball',
            x,
            y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            size: 12 + Math.random() * 18,
            life: 1.0 + Math.random() * 0.5,
            rotationSpeed: (Math.random() - 0.5) * 8,
          });
        }
      }, i * 150);
    }
  }

  // Level start effect
  public emitLevelStart(): void {
    const cx = this.width / 2;
    const cy = this.height / 2;

    // Expanding ring
    for (let i = 0; i < 24; i++) {
      const angle = (i / 24) * Math.PI * 2;
      const speed = 80;
      this.emit({
        type: 'multiball',
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 20,
        life: 0.8,
      });
    }
  }

  // Reset effect
  public emitReset(): void {
    const cx = this.width / 2;
    const cy = this.height / 2;

    for (let i = 0; i < 15; i++) {
      const angle = (i / 15) * Math.PI * 2;
      this.emit({
        type: 'spark',
        x: cx + Math.cos(angle) * 50,
        y: cy + Math.sin(angle) * 50,
        vx: -Math.cos(angle) * 40,
        vy: -Math.sin(angle) * 40,
        size: 15,
        life: 0.5,
      });
    }
  }

  public getParticleData(): Float32Array {
    const data = new Float32Array(this.maxParticles * 10);

    for (let i = 0; i < this.particles.length && i < this.maxParticles; i++) {
      const p = this.particles[i];
      const offset = i * 10;

      data[offset + 0] = p.x;
      data[offset + 1] = p.y;
      data[offset + 2] = p.vx;
      data[offset + 3] = p.vy;
      data[offset + 4] = p.life;
      data[offset + 5] = p.maxLife;
      data[offset + 6] = p.size;
      data[offset + 7] = p.rotation;
      data[offset + 8] = PARTICLE_TYPE_MAP[p.type];
      data[offset + 9] = p.extra;
    }

    return data;
  }

  public getParticleCount(): number {
    return Math.min(this.particles.length, this.maxParticles);
  }

  public clear(): void {
    this.particles = [];
  }
}
