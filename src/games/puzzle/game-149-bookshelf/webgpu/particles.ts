/**
 * Particle System - Bookshelf
 * Library / Study / Warm Wood Theme
 * Game #149
 */

import { LIBRARY_COLORS, randomRange, easeOutCubic } from './math';

export type ParticleType =
  | 'dustMote'
  | 'pageFlutter'
  | 'woodShine'
  | 'selectionGlow'
  | 'swapTrail'
  | 'completionSparkle';

export interface Particle {
  position: [number, number];
  velocity: [number, number];
  color: [number, number, number, number];
  size: number;
  life: number;
  maxLife: number;
  particleType: number;
}

const PARTICLE_TYPE_MAP: Record<ParticleType, number> = {
  dustMote: 0,
  pageFlutter: 1,
  woodShine: 2,
  selectionGlow: 3,
  swapTrail: 4,
  completionSparkle: 5,
};

export class ParticleSystem {
  private particles: Particle[] = [];
  private maxParticles: number;

  constructor(maxParticles: number = 500) {
    this.maxParticles = maxParticles;
  }

  emit(
    x: number,
    y: number,
    type: ParticleType,
    count: number = 1,
    options: Partial<{
      speed: number;
      size: number;
      life: number;
      spread: number;
      color: readonly [number, number, number, number];
      direction: number;
    }> = {}
  ) {
    const {
      speed = 0.01,
      size = 12,
      life = 1.0,
      spread = Math.PI * 2,
      color,
      direction,
    } = options;

    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) {
        this.particles.shift();
      }

      const baseAngle = direction !== undefined ? direction : Math.random() * Math.PI * 2;
      const angle = baseAngle + (Math.random() - 0.5) * spread;
      const spd = speed * (0.5 + Math.random() * 0.5);

      let particleColor: [number, number, number, number];
      if (color) {
        particleColor = [...color] as [number, number, number, number];
      } else {
        particleColor = this.getDefaultColor(type);
      }

      this.particles.push({
        position: [x + (Math.random() - 0.5) * 0.02, y + (Math.random() - 0.5) * 0.02],
        velocity: [Math.cos(angle) * spd, Math.sin(angle) * spd],
        color: particleColor,
        size: size * (0.7 + Math.random() * 0.6),
        life: life * (0.8 + Math.random() * 0.4),
        maxLife: life * (0.8 + Math.random() * 0.4),
        particleType: PARTICLE_TYPE_MAP[type],
      });
    }
  }

  private getDefaultColor(type: ParticleType): [number, number, number, number] {
    switch (type) {
      case 'dustMote':
        return [...LIBRARY_COLORS.dustMote] as [number, number, number, number];
      case 'pageFlutter':
        return [...LIBRARY_COLORS.cream] as [number, number, number, number];
      case 'woodShine':
        return [...LIBRARY_COLORS.lampGlow] as [number, number, number, number];
      case 'selectionGlow':
        return [...LIBRARY_COLORS.selectionGlow] as [number, number, number, number];
      case 'swapTrail':
        return [...LIBRARY_COLORS.warmGold] as [number, number, number, number];
      case 'completionSparkle':
        return [...LIBRARY_COLORS.sparkle] as [number, number, number, number];
    }
  }

  update(deltaTime: number) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];

      // Update position
      p.position[0] += p.velocity[0] * deltaTime;
      p.position[1] += p.velocity[1] * deltaTime;

      // Type-specific behavior
      const pType = p.particleType;

      if (pType === 0) { // dustMote - gentle float
        p.velocity[0] += (Math.random() - 0.5) * 0.001;
        p.velocity[1] -= 0.0001; // Slight upward drift
        p.velocity[0] *= 0.99;
        p.velocity[1] *= 0.99;
      } else if (pType === 1) { // pageFlutter - flutter down
        p.velocity[0] += Math.sin(p.life * 10) * 0.002;
        p.velocity[1] += 0.0003; // Fall down
      } else if (pType === 2) { // woodShine - stationary shimmer
        p.velocity[0] *= 0.9;
        p.velocity[1] *= 0.9;
      } else if (pType === 3) { // selectionGlow - orbit slightly
        p.velocity[0] += (Math.random() - 0.5) * 0.002;
        p.velocity[1] += (Math.random() - 0.5) * 0.002;
        p.velocity[0] *= 0.95;
        p.velocity[1] *= 0.95;
      } else if (pType === 4) { // swapTrail - fade quickly
        p.velocity[0] *= 0.92;
        p.velocity[1] *= 0.92;
      } else if (pType === 5) { // completionSparkle - rise and spread
        p.velocity[1] -= 0.0002;
        p.velocity[0] *= 0.98;
      }

      // Update life
      p.life -= deltaTime;

      // Fade out
      const lifeRatio = p.life / p.maxLife;
      p.color[3] = easeOutCubic(lifeRatio);

      // Remove dead particles
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  getParticleData(): Float32Array {
    const data = new Float32Array(this.maxParticles * 12);

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      const offset = i * 12;

      data[offset] = p.position[0];
      data[offset + 1] = p.position[1];
      data[offset + 2] = p.velocity[0];
      data[offset + 3] = p.velocity[1];
      data[offset + 4] = p.color[0];
      data[offset + 5] = p.color[1];
      data[offset + 6] = p.color[2];
      data[offset + 7] = p.color[3];
      data[offset + 8] = p.size;
      data[offset + 9] = p.life;
      data[offset + 10] = p.maxLife;
      data[offset + 11] = p.particleType;
    }

    return data;
  }

  getParticleCount(): number {
    return this.particles.length;
  }

  clear() {
    this.particles = [];
  }
}
