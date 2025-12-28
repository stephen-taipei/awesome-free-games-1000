/**
 * Particle System - Chain Puzzle
 * Chain / Metal / Industrial Theme
 * Game #093
 */

import { randomRange, randomAngle } from './math';

// Particle types: link, unlock, rotate, metal, spark, chain
export type ParticleType = 'link' | 'unlock' | 'rotate' | 'metal' | 'spark' | 'chain';

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  particleType: number;
  rotation: number;
  param1: number;
}

const PARTICLE_TYPE_MAP: Record<ParticleType, number> = {
  link: 0,
  unlock: 1,
  rotate: 2,
  metal: 3,
  spark: 4,
  chain: 5,
};

export class ParticleSystem {
  private particles: Particle[] = [];
  private maxParticles: number = 500;

  public emit(
    x: number,
    y: number,
    type: ParticleType,
    count: number = 1,
    options: Partial<{
      spread: number;
      speed: number;
      size: number;
      life: number;
      rotation: number;
      param1: number;
    }> = {}
  ): void {
    const {
      spread = 0.5,
      speed = 1,
      size = 20,
      life = 1,
      rotation = 0,
      param1 = 0,
    } = options;

    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) {
        this.particles.shift();
      }

      const angle = randomAngle();
      const s = speed * randomRange(0.5, 1.5);

      const particle: Particle = {
        x: x + randomRange(-spread * 5, spread * 5),
        y: y + randomRange(-spread * 5, spread * 5),
        vx: Math.cos(angle) * s * spread,
        vy: Math.sin(angle) * s * spread,
        life: life * randomRange(0.8, 1.2),
        maxLife: life * randomRange(0.8, 1.2),
        size: size * randomRange(0.7, 1.3),
        particleType: PARTICLE_TYPE_MAP[type],
        rotation: rotation + randomRange(-0.3, 0.3),
        param1: param1,
      };

      this.particles.push(particle);
    }
  }

  // Link rotation effect
  public emitRotation(x: number, y: number, linkRotation: number): void {
    // Rotation arc
    this.emit(x, y, 'rotate', 3, {
      spread: 0.3,
      speed: 0.2,
      size: 40,
      life: 0.4,
      rotation: linkRotation * Math.PI / 180,
    });

    // Metal debris from turning
    this.emit(x, y, 'metal', 6, {
      spread: 2,
      speed: 3,
      size: 8,
      life: 0.5,
    });

    // Sparks from friction
    this.emit(x, y, 'spark', 4, {
      spread: 3,
      speed: 4,
      size: 6,
      life: 0.3,
    });
  }

  // Unlock success effect
  public emitUnlock(x: number, y: number): void {
    // Unlock burst ring
    this.emit(x, y, 'unlock', 1, {
      size: 80,
      life: 0.6,
    });

    // Green sparks
    for (let i = 0; i < 10; i++) {
      const angle = (i / 10) * Math.PI * 2;
      const dist = 20;
      this.emit(
        x + Math.cos(angle) * dist,
        y + Math.sin(angle) * dist,
        'spark',
        1,
        {
          spread: 1,
          speed: 2,
          size: 10,
          life: 0.5,
        }
      );
    }

    // Metal pieces flying off
    this.emit(x, y, 'metal', 8, {
      spread: 3,
      speed: 4,
      size: 10,
      life: 0.6,
    });
  }

  // Lock/still locked effect
  public emitLocked(x: number, y: number): void {
    // Red flash
    this.emit(x, y, 'chain', 1, {
      size: 60,
      life: 0.3,
      param1: 1, // Locked = red
    });

    // Small sparks
    this.emit(x, y, 'spark', 3, {
      spread: 1,
      speed: 2,
      size: 5,
      life: 0.3,
    });
  }

  // Victory celebration
  public emitVictory(centerX: number, centerY: number): void {
    // Multiple unlock bursts
    for (let ring = 0; ring < 3; ring++) {
      setTimeout(() => {
        this.emit(centerX, centerY, 'unlock', 1, {
          size: 100 + ring * 40,
          life: 0.8,
        });
      }, ring * 150);
    }

    // Lots of sparks
    for (let i = 0; i < 20; i++) {
      const angle = (i / 20) * Math.PI * 2;
      const dist = 60;
      this.emit(
        centerX + Math.cos(angle) * dist,
        centerY + Math.sin(angle) * dist,
        'spark',
        2,
        {
          spread: 2,
          speed: 3,
          size: 12,
          life: 0.8,
        }
      );
    }

    // Metal confetti
    this.emit(centerX, centerY, 'metal', 30, {
      spread: 4,
      speed: 5,
      size: 12,
      life: 1,
    });

    // Chain links flying
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const dist = 40;
      this.emit(
        centerX + Math.cos(angle) * dist,
        centerY + Math.sin(angle) * dist,
        'link',
        1,
        {
          spread: 2,
          speed: 3,
          size: 30,
          life: 0.8,
          rotation: angle,
        }
      );
    }
  }

  // Level start
  public emitLevelStart(centerX: number, centerY: number): void {
    // Chain assembly effect
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const dist = 80;

      setTimeout(() => {
        this.emit(
          centerX + Math.cos(angle) * dist,
          centerY + Math.sin(angle) * dist,
          'link',
          1,
          {
            spread: 0.5,
            speed: 1,
            size: 25,
            life: 0.8,
            rotation: angle,
          }
        );

        this.emit(
          centerX + Math.cos(angle) * dist,
          centerY + Math.sin(angle) * dist,
          'metal',
          2,
          {
            spread: 1,
            speed: 1,
            size: 8,
            life: 0.5,
          }
        );
      }, i * 50);
    }

    // Center spark
    this.emit(centerX, centerY, 'spark', 8, {
      spread: 2,
      speed: 2,
      size: 8,
      life: 0.6,
    });
  }

  // Reset effect
  public emitReset(): void {
    this.particles.forEach(p => {
      p.life *= 0.3;
    });
  }

  public update(deltaTime: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];

      // Update position
      p.x += p.vx;
      p.y += p.vy;

      // Apply gravity for metal particles
      if (p.particleType === PARTICLE_TYPE_MAP.metal) {
        p.vy += 0.15;
      }

      // Apply friction
      p.vx *= 0.96;
      p.vy *= 0.96;

      // Update life
      p.life -= deltaTime;

      // Slow rotation
      p.rotation += deltaTime * 0.3;

      // Remove dead particles
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  public getParticles(): Particle[] {
    return this.particles;
  }

  public clear(): void {
    this.particles = [];
  }
}
