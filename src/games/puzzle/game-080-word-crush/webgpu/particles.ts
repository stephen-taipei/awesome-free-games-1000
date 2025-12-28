/**
 * WebGPU Particle System - Word Crush
 * Literary / Typography Theme
 * Game #080
 */

import { randomRange, getWarmColor } from './math';

export type ParticleType = 'letter' | 'ink' | 'spark' | 'trail' | 'glow' | 'burst';

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
      ? getWarmColor(colorIndex)
      : { r: 1.0, g: 0.5, b: 0.3 };

    switch (type) {
      case 'letter':
        const letterAngle = randomRange(0, Math.PI * 2);
        return {
          x: x + randomRange(-20, 20),
          y: y + randomRange(-20, 20),
          vx: Math.cos(letterAngle) * randomRange(1, 3),
          vy: Math.sin(letterAngle) * randomRange(1, 3) - 1,
          size: randomRange(15, 25),
          color: { r: 0.3, g: 0.2, b: 0.4 },
          alpha: 0.8,
          rotation: randomRange(0, Math.PI * 2),
          rotationSpeed: randomRange(-0.05, 0.05),
          life: 1,
          decay: randomRange(0.015, 0.025),
          type,
        };

      case 'ink':
        return {
          x: x + randomRange(-10, 10),
          y: y + randomRange(-10, 10),
          vx: randomRange(-1, 1),
          vy: randomRange(0.5, 2),
          size: randomRange(20, 40),
          color: { r: 0.15, g: 0.1, b: 0.25 },
          alpha: 0.6,
          rotation: randomRange(0, Math.PI * 2),
          rotationSpeed: randomRange(-0.02, 0.02),
          life: 1,
          decay: randomRange(0.01, 0.02),
          type,
        };

      case 'spark':
        const sparkAngle = randomRange(0, Math.PI * 2);
        return {
          x,
          y,
          vx: Math.cos(sparkAngle) * randomRange(3, 6),
          vy: Math.sin(sparkAngle) * randomRange(3, 6),
          size: randomRange(10, 18),
          color: { r: 1.0, g: 0.8, b: 0.3 },
          alpha: 1,
          rotation: sparkAngle,
          rotationSpeed: randomRange(-0.2, 0.2),
          life: 1,
          decay: randomRange(0.04, 0.07),
          type,
        };

      case 'trail':
        return {
          x,
          y,
          vx: randomRange(-0.5, 0.5),
          vy: randomRange(-0.5, 0.5),
          size: randomRange(12, 20),
          color: baseColor,
          alpha: 0.6,
          rotation: 0,
          rotationSpeed: 0,
          life: 1,
          decay: randomRange(0.03, 0.05),
          type,
        };

      case 'glow':
        return {
          x: x + randomRange(-10, 10),
          y: y + randomRange(-10, 10),
          vx: randomRange(-0.3, 0.3),
          vy: randomRange(-0.3, 0.3),
          size: randomRange(30, 50),
          color: baseColor,
          alpha: 0.5,
          rotation: 0,
          rotationSpeed: 0,
          life: 1,
          decay: randomRange(0.015, 0.025),
          type,
        };

      case 'burst':
        const burstAngle = randomRange(0, Math.PI * 2);
        return {
          x,
          y,
          vx: Math.cos(burstAngle) * randomRange(2, 5),
          vy: Math.sin(burstAngle) * randomRange(2, 5),
          size: randomRange(20, 35),
          color: baseColor,
          alpha: 0.9,
          rotation: burstAngle,
          rotationSpeed: randomRange(-0.1, 0.1),
          life: 1,
          decay: randomRange(0.025, 0.04),
          type,
        };

      default:
        return {
          x, y,
          vx: randomRange(-1, 1),
          vy: randomRange(-1, 1),
          size: 15,
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
        case 'letter':
          p.vy += 0.05; // Gravity
          p.vx *= 0.98;
          p.rotationSpeed *= 0.99;
          break;
        case 'ink':
          p.size *= 1.01;
          p.vy *= 0.98;
          break;
        case 'spark':
          p.vx *= 0.92;
          p.vy *= 0.92;
          break;
        case 'trail':
          p.alpha *= 0.95;
          break;
        case 'glow':
          p.size *= 1.02;
          break;
        case 'burst':
          p.vx *= 0.95;
          p.vy *= 0.95;
          break;
      }

      // Decay
      p.life -= p.decay;
      p.alpha = p.life * (p.type === 'glow' ? 0.5 : 0.9);

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
