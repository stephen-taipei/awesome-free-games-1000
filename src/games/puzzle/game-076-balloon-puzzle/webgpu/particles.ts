/**
 * WebGPU Particle System - Balloon Puzzle
 * Sky / Balloon Physics Theme
 * Game #076
 */

import { randomRange, getBalloonColor } from './math';

export type ParticleType = 'air' | 'wind' | 'sparkle' | 'pop' | 'cloud' | 'breeze';

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: { r: number; g: number; b: number };
  alpha: number;
  rotation: number;
  rotationSpeed: number;
  life: number;
  decay: number;
  type: ParticleType;
}

export class ParticleSystem {
  private particles: Particle[] = [];
  private maxParticles: number = 400;

  emit(x: number, y: number, type: ParticleType, count: number, colorIndex?: number): void {
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) {
        this.particles.shift();
      }
      this.particles.push(this.createParticle(x, y, type, colorIndex));
    }
  }

  private createParticle(x: number, y: number, type: ParticleType, colorIndex?: number): Particle {
    const baseColor = colorIndex !== undefined
      ? getBalloonColor(colorIndex)
      : { r: 0.8, g: 0.9, b: 1.0 };

    switch (type) {
      case 'air':
        return {
          x, y,
          vx: randomRange(-1, 1),
          vy: randomRange(-2, -0.5),
          size: randomRange(8, 16),
          color: { r: 0.9, g: 0.95, b: 1.0 },
          alpha: 0.6,
          rotation: 0,
          rotationSpeed: 0,
          life: 1,
          decay: randomRange(0.015, 0.025),
          type,
        };

      case 'wind':
        return {
          x, y,
          vx: randomRange(2, 5),
          vy: randomRange(-1, 1),
          size: randomRange(20, 40),
          color: { r: 0.7, g: 0.85, b: 1.0 },
          alpha: 0.4,
          rotation: randomRange(0, Math.PI * 2),
          rotationSpeed: randomRange(-0.1, 0.1),
          life: 1,
          decay: randomRange(0.02, 0.035),
          type,
        };

      case 'sparkle':
        return {
          x: x + randomRange(-30, 30),
          y: y + randomRange(-30, 30),
          vx: randomRange(-0.5, 0.5),
          vy: randomRange(-0.5, 0.5),
          size: randomRange(6, 12),
          color: { r: 1.0, g: 0.95, b: 0.7 },
          alpha: 1,
          rotation: randomRange(0, Math.PI * 2),
          rotationSpeed: randomRange(-0.2, 0.2),
          life: 1,
          decay: randomRange(0.03, 0.05),
          type,
        };

      case 'pop':
        const angle = randomRange(0, Math.PI * 2);
        const speed = randomRange(3, 8);
        return {
          x, y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          size: randomRange(10, 25),
          color: baseColor,
          alpha: 1,
          rotation: angle,
          rotationSpeed: randomRange(-0.3, 0.3),
          life: 1,
          decay: randomRange(0.03, 0.05),
          type,
        };

      case 'cloud':
        return {
          x: x + randomRange(-20, 20),
          y: y + randomRange(-20, 20),
          vx: randomRange(-0.3, 0.3),
          vy: randomRange(-0.5, -0.2),
          size: randomRange(30, 60),
          color: { r: 1.0, g: 1.0, b: 1.0 },
          alpha: 0.6,
          rotation: 0,
          rotationSpeed: 0,
          life: 1,
          decay: randomRange(0.01, 0.02),
          type,
        };

      case 'breeze':
        return {
          x, y,
          vx: randomRange(1, 3),
          vy: randomRange(-0.5, 0.5),
          size: randomRange(40, 80),
          color: { r: 0.8, g: 0.9, b: 1.0 },
          alpha: 0.3,
          rotation: 0,
          rotationSpeed: 0,
          life: 1,
          decay: randomRange(0.02, 0.03),
          type,
        };

      default:
        return {
          x, y,
          vx: randomRange(-1, 1),
          vy: randomRange(-1, 1),
          size: 10,
          color: baseColor,
          alpha: 1,
          rotation: 0,
          rotationSpeed: 0,
          life: 1,
          decay: 0.02,
          type,
        };
    }
  }

  update(deltaTime: number): void {
    const gravity = 0.02;
    const buoyancy = 0.04;

    this.particles = this.particles.filter(p => {
      // Update position
      p.x += p.vx;
      p.y += p.vy;
      p.rotation += p.rotationSpeed;

      // Type-specific physics
      switch (p.type) {
        case 'air':
          p.vy -= buoyancy; // Float up
          p.size *= 1.01; // Expand
          break;
        case 'wind':
          p.vx *= 0.98;
          p.vy *= 0.95;
          break;
        case 'pop':
          p.vy += gravity * 0.5;
          p.vx *= 0.95;
          break;
        case 'cloud':
          p.vy -= buoyancy * 0.5;
          p.size *= 1.005;
          break;
        case 'breeze':
          p.vx *= 0.99;
          break;
      }

      // Decay
      p.life -= p.decay;
      p.alpha = p.life * (p.type === 'sparkle' ? 1 : 0.8);

      return p.life > 0;
    });
  }

  getParticles(): Particle[] {
    return this.particles;
  }

  clear(): void {
    this.particles = [];
  }
}
