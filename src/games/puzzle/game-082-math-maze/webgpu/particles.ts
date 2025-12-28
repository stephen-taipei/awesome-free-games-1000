/**
 * WebGPU Particle System - Math Maze
 * Digital / Circuit / Mathematical Theme
 * Game #082
 */

import { randomRange, getNeonColor, getOperatorColor } from './math';

export type ParticleType = 'digit' | 'plus' | 'minus' | 'multiply' | 'glow' | 'burst';

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
      ? getNeonColor(colorIndex)
      : { r: 0.0, g: 0.8, b: 1.0 };

    switch (type) {
      case 'digit':
        const digitAngle = randomRange(0, Math.PI * 2);
        return {
          x: x + randomRange(-20, 20),
          y: y + randomRange(-20, 20),
          vx: Math.cos(digitAngle) * randomRange(1, 3),
          vy: Math.sin(digitAngle) * randomRange(1, 3),
          size: randomRange(15, 25),
          color: baseColor,
          alpha: 0.9,
          rotation: randomRange(0, Math.PI * 2),
          rotationSpeed: randomRange(-0.1, 0.1),
          life: 1,
          decay: randomRange(0.02, 0.035),
          type,
        };

      case 'plus':
        const plusAngle = randomRange(0, Math.PI * 2);
        return {
          x,
          y,
          vx: Math.cos(plusAngle) * randomRange(2, 4),
          vy: Math.sin(plusAngle) * randomRange(2, 4),
          size: randomRange(18, 28),
          color: { r: 0.0, g: 0.85, b: 0.58 },
          alpha: 1,
          rotation: 0,
          rotationSpeed: randomRange(-0.05, 0.05),
          life: 1,
          decay: randomRange(0.025, 0.04),
          type,
        };

      case 'minus':
        const minusAngle = randomRange(0, Math.PI * 2);
        return {
          x,
          y,
          vx: Math.cos(minusAngle) * randomRange(2, 4),
          vy: Math.sin(minusAngle) * randomRange(2, 4),
          size: randomRange(18, 28),
          color: { r: 0.85, g: 0.44, b: 0.33 },
          alpha: 1,
          rotation: 0,
          rotationSpeed: randomRange(-0.05, 0.05),
          life: 1,
          decay: randomRange(0.025, 0.04),
          type,
        };

      case 'multiply':
        const mulAngle = randomRange(0, Math.PI * 2);
        return {
          x,
          y,
          vx: Math.cos(mulAngle) * randomRange(2, 4),
          vy: Math.sin(mulAngle) * randomRange(2, 4),
          size: randomRange(18, 28),
          color: { r: 0.45, g: 0.73, b: 1.0 },
          alpha: 1,
          rotation: 0,
          rotationSpeed: randomRange(-0.08, 0.08),
          life: 1,
          decay: randomRange(0.025, 0.04),
          type,
        };

      case 'glow':
        return {
          x: x + randomRange(-15, 15),
          y: y + randomRange(-15, 15),
          vx: randomRange(-0.3, 0.3),
          vy: randomRange(-0.3, 0.3),
          size: randomRange(30, 50),
          color: baseColor,
          alpha: 0.6,
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
          vx: Math.cos(burstAngle) * randomRange(3, 6),
          vy: Math.sin(burstAngle) * randomRange(3, 6),
          size: randomRange(20, 35),
          color: baseColor,
          alpha: 0.9,
          rotation: burstAngle,
          rotationSpeed: randomRange(-0.1, 0.1),
          life: 1,
          decay: randomRange(0.03, 0.05),
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
        case 'digit':
          p.vx *= 0.96;
          p.vy *= 0.96;
          break;
        case 'plus':
        case 'minus':
        case 'multiply':
          p.vx *= 0.94;
          p.vy *= 0.94;
          break;
        case 'glow':
          p.size *= 1.02;
          break;
        case 'burst':
          p.vx *= 0.92;
          p.vy *= 0.92;
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
