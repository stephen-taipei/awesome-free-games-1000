/**
 * Particle System - Flip Puzzle
 * Binary / Toggle / Neon Tiles Theme
 * Game #097
 */

import { randomInRange, randomAngle } from './math';

export type ParticleType = 'flip' | 'glow' | 'toggle' | 'spark' | 'pulse' | 'match';

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
  extra: number; // > 0.5 = on state, <= 0.5 = off state
}

const PARTICLE_TYPE_MAP: Record<ParticleType, number> = {
  flip: 0,
  glow: 1,
  toggle: 2,
  spark: 3,
  pulse: 4,
  match: 5,
};

export class ParticleSystem {
  private particles: Particle[] = [];
  private maxParticles: number = 500;
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

  public update(deltaTime: number): void {
    const dt = Math.min(deltaTime, 0.05);

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];

      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      // Type-specific physics
      switch (p.type) {
        case 'flip':
          // Tile flip stays in place
          p.rotation += dt * 5;
          break;
        case 'glow':
          // Gentle float
          p.vy -= 5 * dt;
          break;
        case 'toggle':
          // Expanding ring - static
          break;
        case 'spark':
          // Float upward with drift
          p.vy -= 50 * dt;
          p.vx *= 0.98;
          p.rotation += dt * 3;
          break;
        case 'pulse':
          // Expanding - static
          break;
        case 'match':
          // Pulsing in place
          break;
      }

      p.x += p.vx * dt;
      p.y += p.vy * dt;
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
      data[offset + 7] = PARTICLE_TYPE_MAP[p.type];
      data[offset + 8] = p.rotation;
      data[offset + 9] = p.extra;
    }

    return data;
  }

  public getParticleCount(): number {
    return Math.min(this.particles.length, this.maxParticles);
  }

  private addParticle(particle: Particle): void {
    if (this.particles.length < this.maxParticles) {
      this.particles.push(particle);
    }
  }

  // Tile flip effect
  public emitFlip(x: number, y: number, tileSize: number, toOn: boolean): void {
    // Main flip effect
    this.addParticle({
      x,
      y,
      vx: 0,
      vy: 0,
      life: 0.5,
      maxLife: 0.5,
      size: tileSize * 0.5,
      type: 'flip',
      rotation: 0,
      extra: toOn ? 0.8 : 0.2,
    });

    // Toggle rings for affected tiles
    this.addParticle({
      x,
      y,
      vx: 0,
      vy: 0,
      life: 0.4,
      maxLife: 0.4,
      size: tileSize * 0.6,
      type: 'toggle',
      rotation: 0,
      extra: toOn ? 0.8 : 0.2,
    });

    // Sparks
    for (let i = 0; i < 6; i++) {
      const angle = randomAngle();
      const speed = randomInRange(40, 80);

      this.addParticle({
        x: x + randomInRange(-10, 10),
        y: y + randomInRange(-10, 10),
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: randomInRange(0.4, 0.7),
        maxLife: 0.7,
        size: randomInRange(4, 8),
        type: 'spark',
        rotation: randomAngle(),
        extra: toOn ? 0.8 : 0.2,
      });
    }
  }

  // Adjacent tile flip
  public emitAdjacentFlip(x: number, y: number, tileSize: number, toOn: boolean): void {
    // Toggle effect
    this.addParticle({
      x,
      y,
      vx: 0,
      vy: 0,
      life: 0.3,
      maxLife: 0.3,
      size: tileSize * 0.4,
      type: 'toggle',
      rotation: 0,
      extra: toOn ? 0.8 : 0.2,
    });

    // Glow
    this.addParticle({
      x,
      y,
      vx: 0,
      vy: 0,
      life: 0.4,
      maxLife: 0.4,
      size: tileSize * 0.5,
      type: 'glow',
      rotation: 0,
      extra: toOn ? 0.8 : 0.2,
    });
  }

  // Hint effect
  public emitHint(x: number, y: number, tileSize: number): void {
    // Pulsing highlight
    for (let i = 0; i < 3; i++) {
      setTimeout(() => {
        this.addParticle({
          x,
          y,
          vx: 0,
          vy: 0,
          life: 0.8,
          maxLife: 0.8,
          size: tileSize * 0.5 + i * 8,
          type: 'pulse',
          rotation: 0,
          extra: 0.5,
        });
      }, i * 150);
    }
  }

  // Victory celebration
  public emitVictory(): void {
    const centerX = this.width / 2;
    const centerY = this.height / 2;

    // Big spark burst
    for (let i = 0; i < 50; i++) {
      const angle = randomAngle();
      const speed = randomInRange(100, 250);
      const delay = Math.random() * 0.5;

      setTimeout(() => {
        this.addParticle({
          x: centerX + randomInRange(-100, 100),
          y: centerY + randomInRange(-100, 100),
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 50,
          life: randomInRange(1.0, 2.0),
          maxLife: 2.0,
          size: randomInRange(8, 18),
          type: 'spark',
          rotation: randomAngle(),
          extra: Math.random(),
        });
      }, delay * 1000);
    }

    // Victory pulse rings
    for (let i = 0; i < 5; i++) {
      setTimeout(() => {
        this.addParticle({
          x: centerX,
          y: centerY,
          vx: 0,
          vy: 0,
          life: 1.2,
          maxLife: 1.2,
          size: 50 + i * 25,
          type: 'pulse',
          rotation: 0,
          extra: 0.8,
        });
      }, i * 150);
    }

    // Match effects
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const radius = 80;

      this.addParticle({
        x: centerX + Math.cos(angle) * radius,
        y: centerY + Math.sin(angle) * radius,
        vx: 0,
        vy: 0,
        life: 1.5,
        maxLife: 1.5,
        size: 30,
        type: 'match',
        rotation: angle,
        extra: 0.8,
      });
    }
  }

  // Level start effect
  public emitLevelStart(): void {
    const centerX = this.width / 2;
    const centerY = this.height / 2;

    // Radiating pulses
    for (let i = 0; i < 4; i++) {
      setTimeout(() => {
        this.addParticle({
          x: centerX,
          y: centerY,
          vx: 0,
          vy: 0,
          life: 1.0,
          maxLife: 1.0,
          size: 40 + i * 20,
          type: 'pulse',
          rotation: 0,
          extra: 0.8,
        });
      }, i * 100);
    }

    // Scattered glows
    for (let i = 0; i < 15; i++) {
      const angle = randomAngle();
      const radius = randomInRange(50, 150);

      this.addParticle({
        x: centerX + Math.cos(angle) * radius,
        y: centerY + Math.sin(angle) * radius,
        vx: Math.cos(angle) * 20,
        vy: Math.sin(angle) * 20 - 30,
        life: randomInRange(0.8, 1.2),
        maxLife: 1.2,
        size: randomInRange(15, 25),
        type: 'glow',
        rotation: 0,
        extra: Math.random() > 0.5 ? 0.8 : 0.2,
      });
    }
  }

  // Reset effect
  public emitReset(): void {
    const centerX = this.width / 2;
    const centerY = this.height / 2;

    // Quick burst
    for (let i = 0; i < 20; i++) {
      const angle = (i / 20) * Math.PI * 2;
      const speed = randomInRange(80, 150);

      this.addParticle({
        x: centerX,
        y: centerY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.6,
        maxLife: 0.6,
        size: randomInRange(8, 14),
        type: 'spark',
        rotation: randomAngle(),
        extra: 0.2,
      });
    }
  }

  public clear(): void {
    this.particles = [];
  }
}
