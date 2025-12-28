/**
 * Particle System - Snake
 * Reptile / Jungle / Neon Green Theme
 * Game #151
 */

import { Vec4, SNAKE_COLORS, randomRange } from './math';

export type ParticleType =
  | 'snakeTrail'    // 0 - glowing trail behind snake
  | 'foodEat'       // 1 - burst when eating food
  | 'scaleShimmer'  // 2 - shimmer on snake scales
  | 'leafFloat'     // 3 - floating jungle leaves
  | 'gameOverBurst' // 4 - explosion on game over
  | 'growPulse';    // 5 - pulse when snake grows

export interface Particle {
  position: [number, number];
  velocity: [number, number];
  color: Vec4;
  size: number;
  life: number;
  maxLife: number;
  particleType: number;
}

const PARTICLE_TYPE_MAP: Record<ParticleType, number> = {
  snakeTrail: 0,
  foodEat: 1,
  scaleShimmer: 2,
  leafFloat: 3,
  gameOverBurst: 4,
  growPulse: 5,
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
      baseVelocity: [number, number];
      spread: number;
      sizeRange: [number, number];
      lifeRange: [number, number];
      color: Vec4;
    }> = {}
  ) {
    const typeIndex = PARTICLE_TYPE_MAP[type];
    const {
      baseVelocity = [0, 0],
      spread = 0.5,
      sizeRange = [0.5, 1.5],
      lifeRange = [0.5, 1.5],
      color,
    } = options;

    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) {
        this.particles.shift();
      }

      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * spread;

      let particleColor: Vec4;
      if (color) {
        particleColor = [...color] as Vec4;
      } else {
        particleColor = this.getDefaultColor(type);
      }

      const particle: Particle = {
        position: [x, y],
        velocity: [
          baseVelocity[0] + Math.cos(angle) * speed,
          baseVelocity[1] + Math.sin(angle) * speed,
        ],
        color: particleColor,
        size: randomRange(sizeRange[0], sizeRange[1]),
        life: randomRange(lifeRange[0], lifeRange[1]),
        maxLife: randomRange(lifeRange[0], lifeRange[1]),
        particleType: typeIndex,
      };

      particle.maxLife = particle.life;
      this.particles.push(particle);
    }
  }

  private getDefaultColor(type: ParticleType): Vec4 {
    switch (type) {
      case 'snakeTrail':
        return [...SNAKE_COLORS.snakeGlow] as Vec4;
      case 'foodEat':
        return [...SNAKE_COLORS.appleGlow] as Vec4;
      case 'scaleShimmer':
        return [...SNAKE_COLORS.scaleShimmer] as Vec4;
      case 'leafFloat':
        return [...SNAKE_COLORS.leafGreen] as Vec4;
      case 'gameOverBurst':
        return [...SNAKE_COLORS.appleRed] as Vec4;
      case 'growPulse':
        return [...SNAKE_COLORS.neonGreen] as Vec4;
      default:
        return [...SNAKE_COLORS.snakeBody] as Vec4;
    }
  }

  update(deltaTime: number) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];

      p.position[0] += p.velocity[0] * deltaTime;
      p.position[1] += p.velocity[1] * deltaTime;

      switch (p.particleType) {
        case 0: // snakeTrail
          p.velocity[0] *= 0.92;
          p.velocity[1] *= 0.92;
          break;
        case 1: // foodEat
          p.velocity[0] *= 0.95;
          p.velocity[1] *= 0.95;
          break;
        case 2: // scaleShimmer
          p.velocity[0] *= 0.98;
          p.velocity[1] *= 0.98;
          break;
        case 3: // leafFloat
          p.velocity[0] += (Math.random() - 0.5) * 0.02;
          p.velocity[1] -= 0.01; // Gentle fall
          p.velocity[0] *= 0.99;
          break;
        case 4: // gameOverBurst
          p.velocity[0] *= 0.94;
          p.velocity[1] *= 0.94;
          break;
        case 5: // growPulse
          p.velocity[0] *= 0.9;
          p.velocity[1] *= 0.9;
          break;
      }

      p.life -= deltaTime;

      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  getParticles(): Particle[] {
    return this.particles;
  }

  clear() {
    this.particles = [];
  }

  getParticleCount(): number {
    return this.particles.length;
  }
}
