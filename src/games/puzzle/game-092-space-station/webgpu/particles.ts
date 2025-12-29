/**
 * Particle System - Space Station
 * Space Station / Nebula / Cosmic Theme
 * Game #092
 */

import { randomRange, randomAngle, orbitPath, thrusterFlame } from './math';

// Particle types: dock, thruster, star, spark, energy, pulse
export type ParticleType = 'dock' | 'thruster' | 'star' | 'spark' | 'energy' | 'pulse';

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
  dock: 0,
  thruster: 1,
  star: 2,
  spark: 3,
  energy: 4,
  pulse: 5,
};

export class ParticleSystem {
  private particles: Particle[] = [];
  private maxParticles: number = 600;

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
      targetX: number;
      targetY: number;
      param1: number;
    }> = {}
  ): void {
    const {
      spread = 0.5,
      speed = 1,
      size = 20,
      life = 1,
      targetX,
      targetY,
      param1 = 0,
    } = options;

    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) {
        this.particles.shift();
      }

      let vx: number, vy: number;

      if (targetX !== undefined && targetY !== undefined) {
        const dx = targetX - x;
        const dy = targetY - y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        vx = (dx / dist) * speed + randomRange(-spread, spread);
        vy = (dy / dist) * speed + randomRange(-spread, spread);
      } else {
        const angle = randomAngle();
        const s = speed * randomRange(0.5, 1.5);
        vx = Math.cos(angle) * s * spread;
        vy = Math.sin(angle) * s * spread;
      }

      const particle: Particle = {
        x: x + randomRange(-5, 5),
        y: y + randomRange(-5, 5),
        vx,
        vy,
        life: life * randomRange(0.8, 1.2),
        maxLife: life * randomRange(0.8, 1.2),
        size: size * randomRange(0.7, 1.3),
        particleType: PARTICLE_TYPE_MAP[type],
        rotation: randomAngle(),
        param1: param1 + randomRange(-0.2, 0.2),
      };

      this.particles.push(particle);
    }
  }

  // Docking connection particles
  public emitDocking(x: number, y: number, stationX: number, stationY: number): void {
    // Connection beam particles
    const dx = stationX - x;
    const dy = stationY - y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const steps = Math.floor(dist / 20);

    for (let i = 0; i < steps; i++) {
      const t = i / steps;
      const px = x + dx * t;
      const py = y + dy * t;

      this.emit(px, py, 'dock', 1, {
        spread: 0.2,
        speed: 0.3,
        size: 15 + t * 10,
        life: 0.6,
        param1: t,
      });
    }

    // Success spark at module
    this.emit(x, y, 'spark', 8, {
      spread: 3,
      speed: 2,
      size: 12,
      life: 0.5,
    });

    // Energy pulse
    this.emit(x, y, 'pulse', 1, {
      size: 80,
      life: 0.8,
      param1: 1, // Green for success
    });
  }

  // Module rotation particles
  public emitRotation(x: number, y: number, moduleSize: number): void {
    // Thruster bursts at corners
    const corners = [
      [-1, -1], [1, -1], [1, 1], [-1, 1]
    ];

    corners.forEach(([cx, cy], i) => {
      const px = x + cx * moduleSize * 0.4;
      const py = y + cy * moduleSize * 0.4;

      // Thruster flame
      this.emit(px, py, 'thruster', 3, {
        spread: 0.8,
        speed: 1.5,
        size: 18,
        life: 0.3,
      });

      // Sparks
      this.emit(px, py, 'spark', 2, {
        spread: 2,
        speed: 3,
        size: 8,
        life: 0.4,
      });
    });

    // Energy field around module
    this.emit(x, y, 'energy', 3, {
      spread: 2,
      speed: 0.5,
      size: moduleSize * 0.8,
      life: 0.5,
      param1: Math.random(),
    });
  }

  // Victory celebration
  public emitVictory(centerX: number, centerY: number): void {
    // Star burst from center
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      const dist = 50;
      const x = centerX + Math.cos(angle) * dist;
      const y = centerY + Math.sin(angle) * dist;

      this.emit(x, y, 'star', 2, {
        spread: 1,
        speed: 3,
        size: 25,
        life: 1.2,
        param1: i / 12,
      });

      this.emit(x, y, 'energy', 1, {
        spread: 2,
        speed: 4,
        size: 40,
        life: 1,
      });
    }

    // Central pulse waves
    for (let i = 0; i < 3; i++) {
      setTimeout(() => {
        this.emit(centerX, centerY, 'pulse', 1, {
          size: 150 + i * 30,
          life: 1,
          param1: 1,
        });
      }, i * 150);
    }

    // Thruster celebration jets
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const x = centerX + Math.cos(angle) * 80;
      const y = centerY + Math.sin(angle) * 80;

      this.emit(x, y, 'thruster', 4, {
        spread: 1.5,
        speed: 3,
        size: 20,
        life: 0.8,
      });
    }
  }

  // Level start animation
  public emitLevelStart(centerX: number, centerY: number): void {
    // Station powering up
    this.emit(centerX, centerY, 'energy', 5, {
      spread: 2,
      speed: 1,
      size: 50,
      life: 1,
    });

    // Stars appearing
    for (let i = 0; i < 10; i++) {
      const angle = (i / 10) * Math.PI * 2;
      const dist = 60 + Math.random() * 40;
      const x = centerX + Math.cos(angle) * dist;
      const y = centerY + Math.sin(angle) * dist;

      this.emit(x, y, 'star', 1, {
        size: 15,
        life: 1.5,
        param1: i / 10,
      });
    }

    // Activation pulse
    this.emit(centerX, centerY, 'pulse', 1, {
      size: 120,
      life: 1,
      param1: 0.5,
    });
  }

  // Reset animation
  public emitReset(): void {
    // Fade out existing particles faster
    this.particles.forEach(p => {
      p.life *= 0.5;
    });
  }

  // Module hover/focus
  public emitHover(x: number, y: number): void {
    this.emit(x, y, 'energy', 2, {
      spread: 1,
      speed: 0.5,
      size: 30,
      life: 0.4,
    });
  }

  // Undock/wrong rotation
  public emitUndock(x: number, y: number): void {
    this.emit(x, y, 'spark', 4, {
      spread: 2,
      speed: 2,
      size: 10,
      life: 0.4,
    });

    this.emit(x, y, 'pulse', 1, {
      size: 50,
      life: 0.5,
      param1: 0, // Blue for normal
    });
  }

  public update(deltaTime: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];

      // Update position
      p.x += p.vx;
      p.y += p.vy;

      // Apply friction
      p.vx *= 0.98;
      p.vy *= 0.98;

      // Update life
      p.life -= deltaTime;

      // Slow rotation
      p.rotation += deltaTime * 0.5;

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
