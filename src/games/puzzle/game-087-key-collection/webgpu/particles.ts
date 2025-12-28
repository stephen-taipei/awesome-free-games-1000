/**
 * WebGPU Particle System - Key Collection
 * Dungeon / Golden / Mystery Theme
 * Game #087
 */

import { randomRange, getDungeonColor, getGoldenColor, getTorchColor } from './math';

export type ParticleType = 'glow' | 'spark' | 'trail' | 'shimmer' | 'burst' | 'dust';

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
      ? getDungeonColor(colorIndex)
      : getGoldenColor(Math.random());

    switch (type) {
      case 'glow':
        return {
          x: x + randomRange(-8, 8),
          y: y + randomRange(-8, 8),
          vx: randomRange(-0.2, 0.2),
          vy: randomRange(-0.3, 0.1),
          size: randomRange(35, 55),
          color: getGoldenColor(0.8),
          alpha: 0.6,
          rotation: 0,
          rotationSpeed: 0,
          life: 1,
          decay: randomRange(0.015, 0.025),
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
          size: randomRange(6, 12),
          color: { r: 1, g: 0.9, b: 0.4 },
          alpha: 1,
          rotation: sparkAngle,
          rotationSpeed: randomRange(-0.15, 0.15),
          life: 1,
          decay: randomRange(0.05, 0.08),
          type,
        };

      case 'trail':
        return {
          x,
          y,
          vx: randomRange(-0.3, 0.3),
          vy: randomRange(-0.8, -0.2),
          size: randomRange(10, 18),
          color: baseColor,
          alpha: 0.8,
          rotation: randomRange(-0.3, 0.3),
          rotationSpeed: 0,
          life: 1,
          decay: randomRange(0.03, 0.05),
          type,
        };

      case 'shimmer':
        return {
          x: x + randomRange(-15, 15),
          y: y + randomRange(-15, 15),
          vx: randomRange(-0.1, 0.1),
          vy: randomRange(-0.2, 0.1),
          size: randomRange(8, 14),
          color: getGoldenColor(1.0),
          alpha: 1,
          rotation: randomRange(0, Math.PI / 4),
          rotationSpeed: randomRange(-0.08, 0.08),
          life: 1,
          decay: randomRange(0.03, 0.05),
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
          color: getGoldenColor(0.9),
          alpha: 0.85,
          rotation: burstAngle,
          rotationSpeed: randomRange(-0.08, 0.08),
          life: 1,
          decay: randomRange(0.04, 0.06),
          type,
        };

      case 'dust':
        return {
          x: x + randomRange(-20, 20),
          y: y + randomRange(-20, 20),
          vx: randomRange(-0.5, 0.5),
          vy: randomRange(-0.3, 0.3),
          size: randomRange(4, 8),
          color: { r: 0.6, g: 0.5, b: 0.4 },
          alpha: 0.5,
          rotation: randomRange(0, Math.PI * 2),
          rotationSpeed: randomRange(-0.02, 0.02),
          life: 1,
          decay: randomRange(0.01, 0.02),
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
        case 'glow':
          p.vy -= 0.01;
          p.size *= 1.005;
          break;
        case 'spark':
          p.vx *= 0.93;
          p.vy *= 0.93;
          p.vy += 0.08;
          break;
        case 'trail':
          p.vy -= 0.02;
          p.vx *= 0.95;
          p.size *= 0.98;
          break;
        case 'shimmer':
          p.vx *= 0.98;
          p.vy *= 0.98;
          break;
        case 'burst':
          p.vx *= 0.90;
          p.vy *= 0.90;
          break;
        case 'dust':
          p.vx += randomRange(-0.02, 0.02);
          p.vy += randomRange(-0.02, 0.02);
          break;
      }

      // Decay
      p.life -= p.decay;
      p.alpha = p.life * (p.type === 'glow' ? 0.6 : p.type === 'dust' ? 0.4 : 0.9);

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
