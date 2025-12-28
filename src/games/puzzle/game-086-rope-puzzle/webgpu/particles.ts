/**
 * WebGPU Particle System - Rope Puzzle
 * Neon / String / Glow Theme
 * Game #086
 */

import { randomRange, getNeonColor, hsvToRgb } from './math';

export type ParticleType = 'glow' | 'spark' | 'trail' | 'knot' | 'burst' | 'wave';

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
      : hsvToRgb(Math.random() * 0.3 + 0.7, 0.8, 1.0); // Purple-pink range

    switch (type) {
      case 'glow':
        return {
          x: x + randomRange(-10, 10),
          y: y + randomRange(-10, 10),
          vx: randomRange(-0.3, 0.3),
          vy: randomRange(-0.3, 0.3),
          size: randomRange(40, 60),
          color: baseColor,
          alpha: 0.6,
          rotation: 0,
          rotationSpeed: 0,
          life: 1,
          decay: randomRange(0.015, 0.025),
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
          color: { r: 1, g: 0.95, b: 0.8 },
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
          vy: randomRange(-1, 0.5),
          size: randomRange(12, 20),
          color: baseColor,
          alpha: 0.8,
          rotation: randomRange(-0.5, 0.5),
          rotationSpeed: 0,
          life: 1,
          decay: randomRange(0.03, 0.05),
          type,
        };

      case 'knot':
        return {
          x: x + randomRange(-5, 5),
          y: y + randomRange(-5, 5),
          vx: randomRange(-0.2, 0.2),
          vy: randomRange(-0.2, 0.2),
          size: randomRange(30, 45),
          color: baseColor,
          alpha: 0.7,
          rotation: 0,
          rotationSpeed: randomRange(0.05, 0.15),
          life: 1,
          decay: randomRange(0.02, 0.03),
          type,
        };

      case 'burst':
        const burstAngle = randomRange(0, Math.PI * 2);
        return {
          x,
          y,
          vx: Math.cos(burstAngle) * randomRange(3, 6),
          vy: Math.sin(burstAngle) * randomRange(3, 6),
          size: randomRange(25, 40),
          color: baseColor,
          alpha: 0.9,
          rotation: burstAngle,
          rotationSpeed: randomRange(-0.1, 0.1),
          life: 1,
          decay: randomRange(0.035, 0.05),
          type,
        };

      case 'wave':
        return {
          x,
          y,
          vx: 0,
          vy: 0,
          size: randomRange(20, 35),
          color: baseColor,
          alpha: 0.6,
          rotation: 0,
          rotationSpeed: 0,
          life: 1,
          decay: randomRange(0.02, 0.035),
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
        case 'glow':
          p.size *= 1.008;
          p.vx *= 0.98;
          p.vy *= 0.98;
          break;
        case 'spark':
          p.vx *= 0.92;
          p.vy *= 0.92;
          p.vy += 0.05; // Light gravity
          break;
        case 'trail':
          p.vy -= 0.02; // Float up
          p.vx *= 0.95;
          p.size *= 0.99;
          break;
        case 'knot':
          p.rotationSpeed *= 1.01;
          break;
        case 'burst':
          p.vx *= 0.88;
          p.vy *= 0.88;
          p.size *= 0.98;
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
