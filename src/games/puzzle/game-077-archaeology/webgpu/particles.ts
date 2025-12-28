/**
 * WebGPU Particle System - Archaeology
 * Ancient Ruins / Archaeological Dig Site Theme
 * Game #077
 */

import { randomRange, getArtifactColor, getDirtColor } from './math';

export type ParticleType = 'dust' | 'sand' | 'spark' | 'debris' | 'glow' | 'ancient';

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

  emit(x: number, y: number, type: ParticleType, count: number, colorKey?: string): void {
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) {
        this.particles.shift();
      }
      this.particles.push(this.createParticle(x, y, type, colorKey));
    }
  }

  private createParticle(x: number, y: number, type: ParticleType, colorKey?: string): Particle {
    const baseColor = colorKey
      ? getArtifactColor(colorKey)
      : getDirtColor(0.5);

    switch (type) {
      case 'dust':
        return {
          x: x + randomRange(-30, 30),
          y: y + randomRange(-30, 30),
          vx: randomRange(-0.5, 0.5),
          vy: randomRange(-1, -0.3),
          size: randomRange(6, 12),
          color: { r: 0.7, g: 0.6, b: 0.5 },
          alpha: 0.5,
          rotation: 0,
          rotationSpeed: randomRange(-0.05, 0.05),
          life: 1,
          decay: randomRange(0.015, 0.025),
          type,
        };

      case 'sand':
        return {
          x: x + randomRange(-20, 20),
          y,
          vx: randomRange(-1, 1),
          vy: randomRange(1, 3),
          size: randomRange(4, 8),
          color: { r: 0.8, g: 0.7, b: 0.5 },
          alpha: 0.8,
          rotation: randomRange(0, Math.PI * 2),
          rotationSpeed: randomRange(-0.1, 0.1),
          life: 1,
          decay: randomRange(0.02, 0.035),
          type,
        };

      case 'spark':
        const sparkAngle = randomRange(0, Math.PI * 2);
        return {
          x,
          y,
          vx: Math.cos(sparkAngle) * randomRange(1, 3),
          vy: Math.sin(sparkAngle) * randomRange(1, 3),
          size: randomRange(4, 8),
          color: { r: 1.0, g: 0.9, b: 0.6 },
          alpha: 1,
          rotation: sparkAngle,
          rotationSpeed: randomRange(-0.2, 0.2),
          life: 1,
          decay: randomRange(0.04, 0.06),
          type,
        };

      case 'debris':
        const debrisAngle = randomRange(0, Math.PI * 2);
        const debrisSpeed = randomRange(2, 5);
        return {
          x,
          y,
          vx: Math.cos(debrisAngle) * debrisSpeed,
          vy: Math.sin(debrisAngle) * debrisSpeed - 2,
          size: randomRange(8, 16),
          color: { r: 0.5, g: 0.45, b: 0.35 },
          alpha: 1,
          rotation: randomRange(0, Math.PI * 2),
          rotationSpeed: randomRange(-0.3, 0.3),
          life: 1,
          decay: randomRange(0.02, 0.04),
          type,
        };

      case 'glow':
        return {
          x: x + randomRange(-15, 15),
          y: y + randomRange(-15, 15),
          vx: randomRange(-0.3, 0.3),
          vy: randomRange(-0.5, -0.2),
          size: randomRange(15, 30),
          color: baseColor,
          alpha: 0.7,
          rotation: 0,
          rotationSpeed: 0,
          life: 1,
          decay: randomRange(0.01, 0.02),
          type,
        };

      case 'ancient':
        return {
          x,
          y,
          vx: 0,
          vy: randomRange(-0.3, -0.1),
          size: randomRange(25, 40),
          color: { r: 0.9, g: 0.75, b: 0.4 },
          alpha: 0.8,
          rotation: randomRange(0, Math.PI * 2),
          rotationSpeed: randomRange(-0.02, 0.02),
          life: 1,
          decay: randomRange(0.008, 0.015),
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
    const gravity = 0.05;

    this.particles = this.particles.filter(p => {
      // Update position
      p.x += p.vx;
      p.y += p.vy;
      p.rotation += p.rotationSpeed;

      // Type-specific physics
      switch (p.type) {
        case 'dust':
          p.vy -= 0.02; // Float up
          p.vx *= 0.98;
          p.size *= 1.005;
          break;
        case 'sand':
          p.vy += gravity;
          p.vx *= 0.95;
          break;
        case 'debris':
          p.vy += gravity * 0.8;
          p.vx *= 0.98;
          break;
        case 'spark':
          p.vx *= 0.92;
          p.vy *= 0.92;
          break;
        case 'glow':
          p.size *= 1.01;
          break;
        case 'ancient':
          p.rotation += 0.01;
          break;
      }

      // Decay
      p.life -= p.decay;
      p.alpha = p.life * (p.type === 'glow' ? 0.7 : 0.9);

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
