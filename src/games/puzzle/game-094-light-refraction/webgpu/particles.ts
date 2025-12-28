/**
 * Particle System - Light Refraction
 * Light / Prism / Rainbow / Spectral Theme
 * Game #094
 */

import { randomRange, randomAngle } from './math';

// Particle types: beam, prism, spectrum, spark, glow, refract
export type ParticleType = 'beam' | 'prism' | 'spectrum' | 'spark' | 'glow' | 'refract';

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
  beam: 0,
  prism: 1,
  spectrum: 2,
  spark: 3,
  glow: 4,
  refract: 5,
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
      directionX: number;
      directionY: number;
    }> = {}
  ): void {
    const {
      spread = 0.5,
      speed = 1,
      size = 20,
      life = 1,
      rotation = 0,
      param1 = 0,
      directionX,
      directionY,
    } = options;

    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) {
        this.particles.shift();
      }

      let vx: number, vy: number;

      if (directionX !== undefined && directionY !== undefined) {
        vx = directionX * speed + randomRange(-spread, spread);
        vy = directionY * speed + randomRange(-spread, spread);
      } else {
        const angle = randomAngle();
        const s = speed * randomRange(0.5, 1.5);
        vx = Math.cos(angle) * s * spread;
        vy = Math.sin(angle) * s * spread;
      }

      const particle: Particle = {
        x: x + randomRange(-3, 3),
        y: y + randomRange(-3, 3),
        vx,
        vy,
        life: life * randomRange(0.8, 1.2),
        maxLife: life * randomRange(0.8, 1.2),
        size: size * randomRange(0.8, 1.2),
        particleType: PARTICLE_TYPE_MAP[type],
        rotation: rotation + randomRange(-0.2, 0.2),
        param1: param1 + randomRange(-0.1, 0.1),
      };

      this.particles.push(particle);
    }
  }

  // Light beam along path
  public emitBeamPath(
    x1: number, y1: number,
    x2: number, y2: number,
    colorIndex: number
  ): void {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const steps = Math.floor(dist / 15);

    for (let i = 0; i < steps; i++) {
      const t = i / steps;
      const x = x1 + dx * t;
      const y = y1 + dy * t;

      this.emit(x, y, 'beam', 1, {
        size: 12,
        life: 0.4,
        param1: colorIndex / 5,
      });
    }
  }

  // Prism hit effect
  public emitPrismHit(x: number, y: number, prismRotation: number): void {
    // Prism glow
    this.emit(x, y, 'prism', 1, {
      size: 50,
      life: 0.5,
      rotation: prismRotation,
    });

    // Spectrum dispersion
    this.emit(x, y, 'spectrum', 1, {
      size: 80,
      life: 0.6,
      rotation: prismRotation,
    });

    // Sparks at refraction point
    for (let i = 0; i < 5; i++) {
      this.emit(x, y, 'spark', 1, {
        spread: 2,
        speed: 3,
        size: 10,
        life: 0.4,
        param1: i / 5,
      });
    }

    // Refraction ring
    this.emit(x, y, 'refract', 1, {
      size: 60,
      life: 0.5,
      param1: Math.random(),
    });
  }

  // Target hit celebration
  public emitTargetHit(x: number, y: number): void {
    // Bright glow at target
    this.emit(x, y, 'glow', 3, {
      size: 40,
      life: 0.8,
      param1: 0.3, // Yellow-ish
    });

    // Rainbow sparks
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      this.emit(x, y, 'spark', 1, {
        directionX: Math.cos(angle),
        directionY: Math.sin(angle),
        speed: 4,
        size: 12,
        life: 0.6,
        param1: i / 12,
      });
    }

    // Refraction burst
    this.emit(x, y, 'refract', 2, {
      size: 80,
      life: 0.7,
    });
  }

  // Victory celebration
  public emitVictory(centerX: number, centerY: number): void {
    // Multiple rainbow rings
    for (let ring = 0; ring < 4; ring++) {
      setTimeout(() => {
        this.emit(centerX, centerY, 'refract', 1, {
          size: 100 + ring * 40,
          life: 0.8,
          param1: ring / 4,
        });
      }, ring * 100);
    }

    // Lots of spectrum effects
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const dist = 60;
      this.emit(
        centerX + Math.cos(angle) * dist,
        centerY + Math.sin(angle) * dist,
        'spectrum',
        1,
        {
          size: 50,
          life: 0.8,
          rotation: angle,
        }
      );
    }

    // Sparkle explosion
    for (let i = 0; i < 20; i++) {
      this.emit(centerX, centerY, 'spark', 1, {
        spread: 4,
        speed: 5,
        size: 15,
        life: 1,
        param1: i / 20,
      });
    }

    // Glows
    for (let i = 0; i < 10; i++) {
      const angle = (i / 10) * Math.PI * 2;
      const dist = 80;
      this.emit(
        centerX + Math.cos(angle) * dist,
        centerY + Math.sin(angle) * dist,
        'glow',
        1,
        {
          size: 30,
          life: 1,
          param1: i / 10,
        }
      );
    }
  }

  // Level start
  public emitLevelStart(sourceX: number, sourceY: number): void {
    // Source glow
    this.emit(sourceX, sourceY, 'glow', 3, {
      size: 50,
      life: 1,
      param1: 0.4, // Green-ish
    });

    // Light beam initializing
    for (let i = 0; i < 5; i++) {
      setTimeout(() => {
        this.emit(sourceX, sourceY, 'beam', 2, {
          spread: 1,
          speed: 2,
          size: 15,
          life: 0.5,
          param1: i / 5,
        });
      }, i * 50);
    }

    // Sparkles
    this.emit(sourceX, sourceY, 'spark', 6, {
      spread: 2,
      speed: 3,
      size: 10,
      life: 0.6,
    });
  }

  // Prism drag/rotate
  public emitPrismMove(x: number, y: number, rotation: number): void {
    this.emit(x, y, 'glow', 1, {
      size: 30,
      life: 0.3,
      param1: Math.random(),
    });

    this.emit(x, y, 'spark', 2, {
      spread: 1,
      speed: 1,
      size: 8,
      life: 0.3,
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

      // Apply friction
      p.vx *= 0.97;
      p.vy *= 0.97;

      // Update life
      p.life -= deltaTime;

      // Slow rotation for some types
      if (p.particleType === PARTICLE_TYPE_MAP.prism) {
        p.rotation += deltaTime * 0.2;
      }

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
