/**
 * WebGPU Particle System - Button Puzzle
 * Arcade / Neon / Retro Theme
 * Game #088
 */

import { randomRange, getNeonColor, getArcadeColor } from './math';

export type ParticleType = 'pulse' | 'glow' | 'flash' | 'ring' | 'spark' | 'beam';

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
      ? getNeonColor(colorIndex)
      : getArcadeColor(Math.random());

    switch (type) {
      case 'pulse':
        return {
          x: x + randomRange(-5, 5),
          y: y + randomRange(-5, 5),
          vx: randomRange(-0.5, 0.5),
          vy: randomRange(-0.5, 0.5),
          size: randomRange(40, 60),
          color: baseColor,
          alpha: 0.8,
          rotation: 0,
          rotationSpeed: 0,
          life: 1,
          decay: randomRange(0.02, 0.04),
          type,
        };

      case 'glow':
        return {
          x: x + randomRange(-10, 10),
          y: y + randomRange(-10, 10),
          vx: randomRange(-0.3, 0.3),
          vy: randomRange(-0.5, 0),
          size: randomRange(30, 50),
          color: baseColor,
          alpha: 0.6,
          rotation: 0,
          rotationSpeed: 0,
          life: 1,
          decay: randomRange(0.015, 0.025),
          type,
        };

      case 'flash':
        return {
          x,
          y,
          vx: 0,
          vy: 0,
          size: randomRange(60, 100),
          color: { r: 1, g: 1, b: 1 },
          alpha: 1,
          rotation: 0,
          rotationSpeed: 0,
          life: 1,
          decay: randomRange(0.08, 0.12),
          type,
        };

      case 'ring':
        return {
          x,
          y,
          vx: 0,
          vy: 0,
          size: randomRange(20, 40),
          color: baseColor,
          alpha: 0.8,
          rotation: randomRange(0, Math.PI * 2),
          rotationSpeed: randomRange(-0.05, 0.05),
          life: 1,
          decay: randomRange(0.02, 0.03),
          type,
        };

      case 'spark':
        const sparkAngle = randomRange(0, Math.PI * 2);
        const sparkSpeed = randomRange(4, 8);
        return {
          x,
          y,
          vx: Math.cos(sparkAngle) * sparkSpeed,
          vy: Math.sin(sparkAngle) * sparkSpeed,
          size: randomRange(8, 15),
          color: baseColor,
          alpha: 1,
          rotation: sparkAngle,
          rotationSpeed: randomRange(-0.2, 0.2),
          life: 1,
          decay: randomRange(0.04, 0.07),
          type,
        };

      case 'beam':
        return {
          x,
          y: y + randomRange(-20, 20),
          vx: 0,
          vy: randomRange(-2, -0.5),
          size: randomRange(15, 25),
          color: baseColor,
          alpha: 0.7,
          rotation: 0,
          rotationSpeed: 0,
          life: 1,
          decay: randomRange(0.03, 0.05),
          type,
        };

      default:
        return {
          x, y,
          vx: randomRange(-1, 1),
          vy: randomRange(-1, 1),
          size: 20,
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
        case 'pulse':
          p.size *= 1.02;
          p.vx *= 0.95;
          p.vy *= 0.95;
          break;
        case 'glow':
          p.vy -= 0.02;
          p.size *= 1.005;
          break;
        case 'flash':
          p.size *= 1.1;
          break;
        case 'ring':
          p.size *= 1.04;
          break;
        case 'spark':
          p.vx *= 0.92;
          p.vy *= 0.92;
          p.vy += 0.1;
          break;
        case 'beam':
          p.vy *= 0.98;
          p.size *= 0.99;
          break;
      }

      // Decay
      p.life -= p.decay;
      p.alpha = p.life * (p.type === 'flash' ? 1.0 : p.type === 'glow' ? 0.6 : 0.9);

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
