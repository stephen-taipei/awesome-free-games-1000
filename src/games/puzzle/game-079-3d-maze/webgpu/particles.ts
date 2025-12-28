/**
 * WebGPU Particle System - 3D Maze
 * Sci-Fi Corridor / Cyberpunk Dungeon Theme
 * Game #079
 */

import { randomRange, getCyberpunkColor } from './math';

export type ParticleType = 'fog' | 'portal' | 'spark' | 'dust' | 'glow' | 'trail';

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
      ? getCyberpunkColor(colorIndex)
      : { r: 0, g: 0.8, b: 1 };

    switch (type) {
      case 'fog':
        return {
          x: x + randomRange(-50, 50),
          y: y + randomRange(-50, 50),
          vx: randomRange(-0.3, 0.3),
          vy: randomRange(-0.3, 0.3),
          size: randomRange(40, 80),
          color: { r: 0.3, g: 0.4, b: 0.6 },
          alpha: 0.3,
          rotation: randomRange(0, Math.PI * 2),
          rotationSpeed: randomRange(-0.01, 0.01),
          life: 1,
          decay: randomRange(0.005, 0.01),
          type,
        };

      case 'portal':
        return {
          x,
          y,
          vx: randomRange(-0.5, 0.5),
          vy: randomRange(-0.5, 0.5),
          size: randomRange(30, 50),
          color: { r: 0, g: 1, b: 0.8 },
          alpha: 0.8,
          rotation: randomRange(0, Math.PI * 2),
          rotationSpeed: randomRange(-0.05, 0.05),
          life: 1,
          decay: randomRange(0.015, 0.025),
          type,
        };

      case 'spark':
        const sparkAngle = randomRange(0, Math.PI * 2);
        return {
          x,
          y,
          vx: Math.cos(sparkAngle) * randomRange(2, 5),
          vy: Math.sin(sparkAngle) * randomRange(2, 5),
          size: randomRange(8, 15),
          color: { r: 0, g: 0.9, b: 1 },
          alpha: 1,
          rotation: sparkAngle,
          rotationSpeed: randomRange(-0.2, 0.2),
          life: 1,
          decay: randomRange(0.04, 0.07),
          type,
        };

      case 'dust':
        return {
          x: x + randomRange(-30, 30),
          y: y + randomRange(-30, 30),
          vx: randomRange(-0.5, 0.5),
          vy: randomRange(-0.5, 0.5),
          size: randomRange(6, 12),
          color: { r: 0.5, g: 0.5, b: 0.6 },
          alpha: 0.5,
          rotation: 0,
          rotationSpeed: 0,
          life: 1,
          decay: randomRange(0.01, 0.02),
          type,
        };

      case 'glow':
        return {
          x: x + randomRange(-15, 15),
          y: y + randomRange(-15, 15),
          vx: randomRange(-0.2, 0.2),
          vy: randomRange(-0.2, 0.2),
          size: randomRange(25, 45),
          color: baseColor,
          alpha: 0.6,
          rotation: 0,
          rotationSpeed: 0,
          life: 1,
          decay: randomRange(0.01, 0.02),
          type,
        };

      case 'trail':
        return {
          x,
          y,
          vx: randomRange(-1, 1),
          vy: randomRange(-2, -0.5),
          size: randomRange(15, 25),
          color: { r: 0, g: 0.8, b: 1 },
          alpha: 0.7,
          rotation: randomRange(0, Math.PI * 2),
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
        case 'fog':
          p.size *= 1.005;
          p.vx *= 0.99;
          p.vy *= 0.99;
          break;
        case 'portal':
          p.rotation += 0.02;
          break;
        case 'spark':
          p.vx *= 0.92;
          p.vy *= 0.92;
          break;
        case 'dust':
          p.vy -= 0.01;
          break;
        case 'glow':
          p.size *= 1.01;
          break;
        case 'trail':
          p.vy *= 0.95;
          p.alpha *= 0.97;
          break;
      }

      // Decay
      p.life -= p.decay;
      p.alpha = p.life * (p.type === 'glow' || p.type === 'fog' ? 0.5 : 0.9);

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
