/**
 * Particle System - Film Reel
 * Cinema / Vintage Film Theme
 * Game #133
 */

import { CINEMA_COLORS, randomRange, lerpColor } from './math';

export type ParticleType = 'filmGrain' | 'projectorDust' | 'filmFlicker' | 'spotlight' | 'reel' | 'clapboard';

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
  filmGrain: 0,
  projectorDust: 1,
  filmFlicker: 2,
  spotlight: 3,
  reel: 4,
  clapboard: 5,
};

export class ParticleSystem {
  private particles: Particle[] = [];
  private maxParticles: number;

  constructor(maxParticles: number = 1000) {
    this.maxParticles = maxParticles;
  }

  emit(
    x: number,
    y: number,
    type: ParticleType,
    count: number = 1,
    options: Partial<{
      color: [number, number, number, number];
      speedMin: number;
      speedMax: number;
      sizeMin: number;
      sizeMax: number;
      lifeMin: number;
      lifeMax: number;
      spread: number;
      direction: number;
    }> = {}
  ) {
    const {
      color,
      speedMin = 0.01,
      speedMax = 0.05,
      sizeMin = 0.5,
      sizeMax = 1.5,
      lifeMin = 0.5,
      lifeMax = 1.5,
      spread = Math.PI * 2,
      direction = 0,
    } = options;

    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) {
        this.particles.shift();
      }

      const angle = direction + (Math.random() - 0.5) * spread;
      const speed = randomRange(speedMin, speedMax);
      const life = randomRange(lifeMin, lifeMax);

      let particleColor = color || this.getDefaultColor(type);

      this.particles.push({
        position: [x, y],
        velocity: [Math.cos(angle) * speed, Math.sin(angle) * speed],
        color: particleColor,
        size: randomRange(sizeMin, sizeMax),
        life,
        maxLife: life,
        particleType: PARTICLE_TYPE_MAP[type],
      });
    }
  }

  private getDefaultColor(type: ParticleType): [number, number, number, number] {
    switch (type) {
      case 'filmGrain':
        return CINEMA_COLORS.filmGrain;
      case 'projectorDust':
        return CINEMA_COLORS.dustMote;
      case 'filmFlicker':
        return CINEMA_COLORS.filmWhite;
      case 'spotlight':
        return CINEMA_COLORS.spotlightYellow;
      case 'reel':
        return CINEMA_COLORS.sepiaDark;
      case 'clapboard':
        return CINEMA_COLORS.filmBlack;
      default:
        return [1, 1, 1, 1];
    }
  }

  update(deltaTime: number) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];

      // Update position
      p.position[0] += p.velocity[0] * deltaTime;
      p.position[1] += p.velocity[1] * deltaTime;

      // Type-specific behavior
      const type = p.particleType;
      if (type === 0) { // filmGrain
        p.velocity[0] += (Math.random() - 0.5) * 0.02;
        p.velocity[1] += (Math.random() - 0.5) * 0.02;
      } else if (type === 1) { // projectorDust
        p.velocity[1] += 0.005 * deltaTime; // slight gravity
        p.velocity[0] *= 0.99;
      } else if (type === 2) { // filmFlicker
        p.velocity[0] *= 0.95;
        p.velocity[1] *= 0.95;
      } else if (type === 3) { // spotlight
        p.velocity[0] *= 0.98;
        p.velocity[1] *= 0.98;
      } else if (type === 4) { // reel
        // Spin effect
        const angle = Math.atan2(p.velocity[1], p.velocity[0]) + 0.1 * deltaTime;
        const speed = Math.sqrt(p.velocity[0] * p.velocity[0] + p.velocity[1] * p.velocity[1]);
        p.velocity[0] = Math.cos(angle) * speed * 0.98;
        p.velocity[1] = Math.sin(angle) * speed * 0.98;
      } else if (type === 5) { // clapboard
        p.velocity[1] += 0.02 * deltaTime;
        p.velocity[0] *= 0.97;
      }

      // Update life
      p.life -= deltaTime;

      // Remove dead particles
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  getParticles(): Particle[] {
    return this.particles;
  }

  getParticleData(): Float32Array {
    const data = new Float32Array(this.maxParticles * 12);

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      const offset = i * 12;

      data[offset + 0] = p.position[0];
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
