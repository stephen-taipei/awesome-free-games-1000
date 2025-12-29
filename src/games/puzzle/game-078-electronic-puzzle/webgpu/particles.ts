/**
 * WebGPU Particle System - Electronic Puzzle
 * Cyberpunk / Circuit Board Theme
 * Game #078
 */

import { randomRange, getCyberpunkColor } from './math';

export type ParticleType = 'electron' | 'spark' | 'pulse' | 'power' | 'glow' | 'trace';

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
  private maxParticles: number = 500;

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
      ? getCyberpunkColor(colorIndex)
      : { r: 0, g: 1, b: 0.5 };

    switch (type) {
      case 'electron':
        const angle = randomRange(0, Math.PI * 2);
        const speed = randomRange(2, 5);
        return {
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          size: randomRange(8, 14),
          color: { r: 0, g: 1, b: 0.8 },
          alpha: 1,
          rotation: 0,
          rotationSpeed: randomRange(-0.1, 0.1),
          life: 1,
          decay: randomRange(0.02, 0.04),
          type,
        };

      case 'spark':
        const sparkAngle = randomRange(0, Math.PI * 2);
        return {
          x,
          y,
          vx: Math.cos(sparkAngle) * randomRange(3, 8),
          vy: Math.sin(sparkAngle) * randomRange(3, 8),
          size: randomRange(6, 12),
          color: { r: 1, g: 1, b: 0.5 },
          alpha: 1,
          rotation: sparkAngle,
          rotationSpeed: randomRange(-0.3, 0.3),
          life: 1,
          decay: randomRange(0.05, 0.08),
          type,
        };

      case 'pulse':
        return {
          x: x + randomRange(-20, 20),
          y: y + randomRange(-20, 20),
          vx: 0,
          vy: 0,
          size: randomRange(20, 40),
          color: baseColor,
          alpha: 0.8,
          rotation: 0,
          rotationSpeed: 0,
          life: 1,
          decay: randomRange(0.02, 0.035),
          type,
        };

      case 'power':
        return {
          x: x + randomRange(-15, 15),
          y: y + randomRange(-15, 15),
          vx: randomRange(-0.5, 0.5),
          vy: randomRange(-1, -0.5),
          size: randomRange(15, 25),
          color: { r: 1, g: 0.9, b: 0.3 },
          alpha: 0.9,
          rotation: 0,
          rotationSpeed: 0,
          life: 1,
          decay: randomRange(0.015, 0.025),
          type,
        };

      case 'glow':
        return {
          x: x + randomRange(-10, 10),
          y: y + randomRange(-10, 10),
          vx: randomRange(-0.3, 0.3),
          vy: randomRange(-0.3, 0.3),
          size: randomRange(25, 45),
          color: baseColor,
          alpha: 0.6,
          rotation: 0,
          rotationSpeed: 0,
          life: 1,
          decay: randomRange(0.01, 0.02),
          type,
        };

      case 'trace':
        return {
          x,
          y,
          vx: randomRange(-1, 1),
          vy: randomRange(-1, 1),
          size: randomRange(10, 18),
          color: { r: 0, g: 1, b: 0.5 },
          alpha: 0.7,
          rotation: randomRange(0, Math.PI * 2),
          rotationSpeed: 0,
          life: 1,
          decay: randomRange(0.025, 0.04),
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
    this.particles = this.particles.filter(p => {
      // Update position
      p.x += p.vx;
      p.y += p.vy;
      p.rotation += p.rotationSpeed;

      // Type-specific physics
      switch (p.type) {
        case 'electron':
          p.vx *= 0.96;
          p.vy *= 0.96;
          break;
        case 'spark':
          p.vx *= 0.9;
          p.vy *= 0.9;
          break;
        case 'pulse':
          p.size *= 1.02;
          break;
        case 'power':
          p.vy -= 0.02;
          break;
        case 'glow':
          p.size *= 1.01;
          break;
        case 'trace':
          p.vx *= 0.95;
          p.vy *= 0.95;
          break;
      }

      // Decay
      p.life -= p.decay;
      p.alpha = p.life * (p.type === 'glow' ? 0.6 : 0.9);

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
