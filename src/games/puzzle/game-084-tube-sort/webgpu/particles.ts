/**
 * WebGPU Particle System - Tube Sort
 * Laboratory / Chemistry / Test Tube Theme
 * Game #084
 */

import { randomRange, getLabColor, hsvToRgb, getVapourColor } from './math';

export type ParticleType = 'bubble' | 'drop' | 'splash' | 'vapour' | 'glow' | 'sparkle';

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
      ? getLabColor(colorIndex)
      : hsvToRgb(Math.random(), 0.6, 0.9);

    switch (type) {
      case 'bubble':
        return {
          x: x + randomRange(-25, 25),
          y: y + randomRange(-15, 15),
          vx: randomRange(-0.4, 0.4),
          vy: randomRange(-1.8, -0.8),
          size: randomRange(12, 25),
          color: baseColor,
          alpha: 0.6,
          rotation: 0,
          rotationSpeed: 0,
          life: 1,
          decay: randomRange(0.012, 0.022),
          type,
        };

      case 'drop':
        const dropAngle = randomRange(-Math.PI * 0.4, Math.PI * 0.4) - Math.PI / 2;
        return {
          x,
          y,
          vx: Math.cos(dropAngle) * randomRange(2, 5),
          vy: Math.sin(dropAngle) * randomRange(2, 5),
          size: randomRange(10, 18),
          color: baseColor,
          alpha: 0.85,
          rotation: dropAngle + Math.PI / 2,
          rotationSpeed: 0,
          life: 1,
          decay: randomRange(0.028, 0.045),
          type,
        };

      case 'splash':
        const splashAngle = randomRange(0, Math.PI * 2);
        return {
          x,
          y,
          vx: Math.cos(splashAngle) * randomRange(2, 4),
          vy: Math.sin(splashAngle) * randomRange(2, 4),
          size: randomRange(18, 32),
          color: baseColor,
          alpha: 0.75,
          rotation: splashAngle,
          rotationSpeed: randomRange(-0.08, 0.08),
          life: 1,
          decay: randomRange(0.035, 0.055),
          type,
        };

      case 'vapour':
        return {
          x: x + randomRange(-20, 20),
          y: y + randomRange(-10, 10),
          vx: randomRange(-0.5, 0.5),
          vy: randomRange(-1.5, -0.5),
          size: randomRange(25, 45),
          color: getVapourColor(baseColor),
          alpha: 0.4,
          rotation: randomRange(0, Math.PI * 2),
          rotationSpeed: randomRange(-0.02, 0.02),
          life: 1,
          decay: randomRange(0.01, 0.018),
          type,
        };

      case 'glow':
        return {
          x: x + randomRange(-8, 8),
          y: y + randomRange(-8, 8),
          vx: randomRange(-0.15, 0.15),
          vy: randomRange(-0.15, 0.15),
          size: randomRange(35, 55),
          color: baseColor,
          alpha: 0.5,
          rotation: 0,
          rotationSpeed: 0,
          life: 1,
          decay: randomRange(0.015, 0.025),
          type,
        };

      case 'sparkle':
        const sparkAngle = randomRange(0, Math.PI * 2);
        return {
          x,
          y,
          vx: Math.cos(sparkAngle) * randomRange(1, 3),
          vy: Math.sin(sparkAngle) * randomRange(1, 3),
          size: randomRange(10, 18),
          color: { r: 1, g: 1, b: 1 },
          alpha: 1,
          rotation: randomRange(0, Math.PI * 2),
          rotationSpeed: randomRange(-0.15, 0.15),
          life: 1,
          decay: randomRange(0.04, 0.06),
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
        case 'bubble':
          p.vx += Math.sin(p.y * 0.04) * 0.02; // Wobble
          p.vy *= 0.99;
          p.size *= 1.003;
          break;
        case 'drop':
          p.vy += 0.18; // Gravity
          p.vx *= 0.97;
          break;
        case 'splash':
          p.vx *= 0.92;
          p.vy *= 0.92;
          break;
        case 'vapour':
          p.vx += Math.sin(p.y * 0.02 + p.x * 0.01) * 0.03;
          p.vy *= 0.98;
          p.size *= 1.012;
          break;
        case 'glow':
          p.size *= 1.008;
          break;
        case 'sparkle':
          p.vx *= 0.94;
          p.vy *= 0.94;
          break;
      }

      // Decay
      p.life -= p.decay;
      p.alpha = p.life * (p.type === 'vapour' || p.type === 'glow' ? 0.5 : 0.85);

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
