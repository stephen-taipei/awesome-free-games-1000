/**
 * WebGPU Particle System - Radar Puzzle
 * Radar / Sonar / Military Theme
 * Game #091
 */

import { randomRange, getRadarColor, getSonarColor } from './math';

export type ParticleType = 'sweep' | 'blip' | 'ping' | 'glow' | 'scan' | 'wave';

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
  private intensityOffset: number = 0;

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
      ? getSonarColor(colorIndex)
      : getRadarColor(0.8 + this.intensityOffset * 0.2);

    this.intensityOffset = (this.intensityOffset + 0.05) % 1;

    switch (type) {
      case 'sweep':
        return {
          x: x + randomRange(-30, 30),
          y: y + randomRange(-30, 30),
          vx: randomRange(-0.5, 0.5),
          vy: randomRange(-0.5, 0.5),
          size: randomRange(40, 70),
          color: baseColor,
          alpha: 0.7,
          rotation: randomRange(0, Math.PI * 2),
          rotationSpeed: randomRange(-0.02, 0.02),
          life: 1,
          decay: randomRange(0.015, 0.025),
          type,
        };

      case 'blip':
        return {
          x,
          y,
          vx: 0,
          vy: 0,
          size: randomRange(15, 25),
          color: baseColor,
          alpha: 1,
          rotation: 0,
          rotationSpeed: 0,
          life: 1,
          decay: randomRange(0.02, 0.035),
          type,
        };

      case 'ping':
        return {
          x,
          y,
          vx: 0,
          vy: 0,
          size: randomRange(20, 35),
          color: baseColor,
          alpha: 0.8,
          rotation: 0,
          rotationSpeed: 0,
          life: 1,
          decay: randomRange(0.018, 0.028),
          type,
        };

      case 'glow':
        return {
          x: x + randomRange(-10, 10),
          y: y + randomRange(-10, 10),
          vx: randomRange(-0.2, 0.2),
          vy: randomRange(-0.3, 0.1),
          size: randomRange(30, 50),
          color: baseColor,
          alpha: 0.6,
          rotation: 0,
          rotationSpeed: 0,
          life: 1,
          decay: randomRange(0.015, 0.025),
          type,
        };

      case 'scan':
        return {
          x: x + randomRange(-40, 40),
          y,
          vx: 0,
          vy: randomRange(-1, -0.3),
          size: randomRange(50, 80),
          color: baseColor,
          alpha: 0.7,
          rotation: 0,
          rotationSpeed: 0,
          life: 1,
          decay: randomRange(0.02, 0.03),
          type,
        };

      case 'wave':
        return {
          x,
          y,
          vx: 0,
          vy: 0,
          size: randomRange(25, 40),
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
        case 'sweep':
          p.vx *= 0.98;
          p.vy *= 0.98;
          p.rotation += 0.01;
          break;
        case 'blip':
          // Stationary pulsing blip
          break;
        case 'ping':
          p.size *= 1.04;
          break;
        case 'glow':
          p.size *= 1.005;
          p.vy -= 0.01;
          break;
        case 'scan':
          p.vy *= 0.97;
          break;
        case 'wave':
          p.size *= 1.03;
          break;
      }

      // Decay
      p.life -= p.decay;
      p.alpha = p.life * (p.type === 'glow' ? 0.6 : p.type === 'wave' ? 0.5 : 0.85);

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
