/**
 * WebGPU Particle System - Screw Puzzle
 * Workshop / Industrial / Metallic Theme
 * Game #085
 */

import { randomRange, getMetalColor, getSparkColor, hsvToRgb } from './math';

export type ParticleType = 'spark' | 'metal' | 'twist' | 'glow' | 'burst' | 'shine';

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
      ? getMetalColor(colorIndex)
      : hsvToRgb(Math.random() * 0.15 + 0.05, 0.8, 0.9); // Warm metal tones

    switch (type) {
      case 'spark':
        const sparkAngle = randomRange(0, Math.PI * 2);
        const sparkSpeed = randomRange(4, 8);
        return {
          x,
          y,
          vx: Math.cos(sparkAngle) * sparkSpeed,
          vy: Math.sin(sparkAngle) * sparkSpeed,
          size: randomRange(6, 12),
          color: getSparkColor(),
          alpha: 1,
          rotation: sparkAngle,
          rotationSpeed: randomRange(-0.3, 0.3),
          life: 1,
          decay: randomRange(0.05, 0.08),
          type,
        };

      case 'metal':
        const metalAngle = randomRange(0, Math.PI * 2);
        return {
          x: x + randomRange(-15, 15),
          y: y + randomRange(-15, 15),
          vx: Math.cos(metalAngle) * randomRange(1, 3),
          vy: Math.sin(metalAngle) * randomRange(1, 3) + 1, // Slight gravity
          size: randomRange(8, 15),
          color: baseColor,
          alpha: 0.9,
          rotation: randomRange(0, Math.PI * 2),
          rotationSpeed: randomRange(-0.2, 0.2),
          life: 1,
          decay: randomRange(0.03, 0.05),
          type,
        };

      case 'twist':
        return {
          x,
          y,
          vx: randomRange(-0.5, 0.5),
          vy: randomRange(-1, -0.3),
          size: randomRange(25, 40),
          color: baseColor,
          alpha: 0.7,
          rotation: 0,
          rotationSpeed: randomRange(0.1, 0.3),
          life: 1,
          decay: randomRange(0.02, 0.035),
          type,
        };

      case 'glow':
        return {
          x: x + randomRange(-8, 8),
          y: y + randomRange(-8, 8),
          vx: randomRange(-0.2, 0.2),
          vy: randomRange(-0.2, 0.2),
          size: randomRange(35, 55),
          color: baseColor,
          alpha: 0.5,
          rotation: 0,
          rotationSpeed: 0,
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
          size: randomRange(20, 35),
          color: getSparkColor(),
          alpha: 0.85,
          rotation: burstAngle,
          rotationSpeed: randomRange(-0.1, 0.1),
          life: 1,
          decay: randomRange(0.04, 0.06),
          type,
        };

      case 'shine':
        return {
          x: x + randomRange(-20, 20),
          y: y + randomRange(-20, 20),
          vx: randomRange(-0.3, 0.3),
          vy: randomRange(-0.3, 0.3),
          size: randomRange(12, 20),
          color: { r: 1, g: 1, b: 1 },
          alpha: 1,
          rotation: randomRange(0, Math.PI / 4),
          rotationSpeed: randomRange(-0.05, 0.05),
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
        case 'spark':
          p.vx *= 0.94;
          p.vy *= 0.94;
          p.vy += 0.1; // Light gravity
          break;
        case 'metal':
          p.vy += 0.15; // Heavier gravity
          p.vx *= 0.96;
          break;
        case 'twist':
          p.rotationSpeed *= 1.02; // Accelerating rotation
          p.size *= 0.995;
          break;
        case 'glow':
          p.size *= 1.01;
          break;
        case 'burst':
          p.vx *= 0.9;
          p.vy *= 0.9;
          break;
        case 'shine':
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
