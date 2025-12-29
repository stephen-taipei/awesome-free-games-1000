/**
 * WebGPU Particle System - Dino Bones
 * Prehistoric / Excavation Site Theme
 * Game #081
 */

import { randomRange, getEarthColor } from './math';

export type ParticleType = 'dust' | 'bone' | 'spark' | 'dirt' | 'glow' | 'burst';

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
      ? getEarthColor(colorIndex)
      : { r: 0.75, g: 0.60, b: 0.40 };

    switch (type) {
      case 'dust':
        return {
          x: x + randomRange(-30, 30),
          y: y + randomRange(-30, 30),
          vx: randomRange(-0.5, 0.5),
          vy: randomRange(-1, -0.3),
          size: randomRange(20, 40),
          color: { r: 0.70, g: 0.55, b: 0.35 },
          alpha: 0.5,
          rotation: randomRange(0, Math.PI * 2),
          rotationSpeed: randomRange(-0.02, 0.02),
          life: 1,
          decay: randomRange(0.01, 0.02),
          type,
        };

      case 'bone':
        const boneAngle = randomRange(0, Math.PI * 2);
        return {
          x,
          y,
          vx: Math.cos(boneAngle) * randomRange(1, 3),
          vy: Math.sin(boneAngle) * randomRange(1, 3),
          size: randomRange(12, 20),
          color: { r: 0.95, g: 0.90, b: 0.80 },
          alpha: 0.9,
          rotation: boneAngle,
          rotationSpeed: randomRange(-0.1, 0.1),
          life: 1,
          decay: randomRange(0.02, 0.04),
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
          color: { r: 1.0, g: 0.85, b: 0.4 },
          alpha: 1,
          rotation: sparkAngle,
          rotationSpeed: randomRange(-0.2, 0.2),
          life: 1,
          decay: randomRange(0.04, 0.07),
          type,
        };

      case 'dirt':
        return {
          x: x + randomRange(-20, 20),
          y: y + randomRange(-20, 20),
          vx: randomRange(-1.5, 1.5),
          vy: randomRange(0.5, 2),
          size: randomRange(10, 18),
          color: { r: 0.55, g: 0.41, b: 0.20 },
          alpha: 0.7,
          rotation: randomRange(0, Math.PI * 2),
          rotationSpeed: randomRange(-0.05, 0.05),
          life: 1,
          decay: randomRange(0.02, 0.035),
          type,
        };

      case 'glow':
        return {
          x: x + randomRange(-15, 15),
          y: y + randomRange(-15, 15),
          vx: randomRange(-0.2, 0.2),
          vy: randomRange(-0.2, 0.2),
          size: randomRange(30, 50),
          color: baseColor,
          alpha: 0.5,
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
          vx: Math.cos(burstAngle) * randomRange(2, 4),
          vy: Math.sin(burstAngle) * randomRange(2, 4),
          size: randomRange(20, 35),
          color: baseColor,
          alpha: 0.8,
          rotation: burstAngle,
          rotationSpeed: randomRange(-0.08, 0.08),
          life: 1,
          decay: randomRange(0.025, 0.04),
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
        case 'dust':
          p.vy *= 0.98;
          p.size *= 1.01;
          break;
        case 'bone':
          p.vy += 0.08; // Gravity
          p.vx *= 0.98;
          break;
        case 'spark':
          p.vx *= 0.92;
          p.vy *= 0.92;
          break;
        case 'dirt':
          p.vy += 0.05; // Light gravity
          p.vx *= 0.97;
          break;
        case 'glow':
          p.size *= 1.02;
          break;
        case 'burst':
          p.vx *= 0.94;
          p.vy *= 0.94;
          break;
      }

      // Decay
      p.life -= p.decay;
      p.alpha = p.life * (p.type === 'glow' || p.type === 'dust' ? 0.5 : 0.9);

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
