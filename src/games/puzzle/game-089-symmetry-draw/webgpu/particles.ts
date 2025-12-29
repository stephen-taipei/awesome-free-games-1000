/**
 * WebGPU Particle System - Symmetry Draw
 * Kaleidoscope / Rainbow / Prismatic Theme
 * Game #089
 */

import { randomRange, getRainbowColor, getPrismaticColor } from './math';

export type ParticleType = 'shimmer' | 'trail' | 'glow' | 'prism' | 'spark' | 'wave';

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
  private maxParticles: number = 600;
  private hueOffset: number = 0;

  emit(x: number, y: number, type: ParticleType, count: number, colorIndex?: number): void {
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) {
        this.particles.shift();
      }
      this.particles.push(this.createParticle(x, y, type, colorIndex));
    }
  }

  private createParticle(x: number, y: number, type: ParticleType, colorIndex?: number): Particle {
    // Use rainbow cycling color or specific color
    const baseColor = colorIndex !== undefined
      ? getPrismaticColor(colorIndex)
      : getRainbowColor((this.hueOffset + Math.random() * 0.1) % 1);

    this.hueOffset = (this.hueOffset + 0.01) % 1;

    switch (type) {
      case 'shimmer':
        return {
          x: x + randomRange(-10, 10),
          y: y + randomRange(-10, 10),
          vx: randomRange(-0.5, 0.5),
          vy: randomRange(-0.5, 0.5),
          size: randomRange(12, 20),
          color: baseColor,
          alpha: 1,
          rotation: randomRange(0, Math.PI * 2),
          rotationSpeed: randomRange(-0.1, 0.1),
          life: 1,
          decay: randomRange(0.02, 0.04),
          type,
        };

      case 'trail':
        return {
          x,
          y,
          vx: randomRange(-0.3, 0.3),
          vy: randomRange(-1, -0.3),
          size: randomRange(15, 25),
          color: baseColor,
          alpha: 0.8,
          rotation: randomRange(-0.3, 0.3),
          rotationSpeed: 0,
          life: 1,
          decay: randomRange(0.025, 0.04),
          type,
        };

      case 'glow':
        return {
          x: x + randomRange(-8, 8),
          y: y + randomRange(-8, 8),
          vx: randomRange(-0.2, 0.2),
          vy: randomRange(-0.3, 0.1),
          size: randomRange(35, 55),
          color: baseColor,
          alpha: 0.6,
          rotation: 0,
          rotationSpeed: 0,
          life: 1,
          decay: randomRange(0.015, 0.025),
          type,
        };

      case 'prism':
        return {
          x: x + randomRange(-5, 5),
          y: y + randomRange(-5, 5),
          vx: randomRange(-0.4, 0.4),
          vy: randomRange(-0.4, 0.4),
          size: randomRange(20, 35),
          color: baseColor,
          alpha: 0.9,
          rotation: randomRange(0, Math.PI / 4),
          rotationSpeed: randomRange(-0.08, 0.08),
          life: 1,
          decay: randomRange(0.02, 0.035),
          type,
        };

      case 'spark':
        const sparkAngle = randomRange(0, Math.PI * 2);
        const sparkSpeed = randomRange(3, 7);
        return {
          x,
          y,
          vx: Math.cos(sparkAngle) * sparkSpeed,
          vy: Math.sin(sparkAngle) * sparkSpeed,
          size: randomRange(8, 14),
          color: baseColor,
          alpha: 1,
          rotation: sparkAngle,
          rotationSpeed: randomRange(-0.15, 0.15),
          life: 1,
          decay: randomRange(0.04, 0.07),
          type,
        };

      case 'wave':
        return {
          x,
          y,
          vx: 0,
          vy: 0,
          size: randomRange(30, 50),
          color: baseColor,
          alpha: 0.7,
          rotation: 0,
          rotationSpeed: randomRange(-0.02, 0.02),
          life: 1,
          decay: randomRange(0.02, 0.03),
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
        case 'shimmer':
          p.vx += randomRange(-0.03, 0.03);
          p.vy += randomRange(-0.03, 0.03);
          break;
        case 'trail':
          p.vy -= 0.02;
          p.vx *= 0.95;
          p.size *= 0.98;
          break;
        case 'glow':
          p.vy -= 0.01;
          p.size *= 1.005;
          break;
        case 'prism':
          p.vx *= 0.97;
          p.vy *= 0.97;
          break;
        case 'spark':
          p.vx *= 0.92;
          p.vy *= 0.92;
          p.vy += 0.08;
          break;
        case 'wave':
          p.size *= 1.03;
          break;
      }

      // Decay
      p.life -= p.decay;
      p.alpha = p.life * (p.type === 'glow' ? 0.6 : p.type === 'wave' ? 0.5 : 0.9);

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
