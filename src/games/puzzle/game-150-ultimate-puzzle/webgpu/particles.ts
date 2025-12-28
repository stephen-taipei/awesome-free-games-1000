/**
 * Particle System - Ultimate Puzzle
 * Ultimate / Prismatic / Rainbow Theme
 * Game #150 (Milestone!)
 */

import { Vec4, ULTIMATE_COLORS, randomRange, rainbowColor } from './math';

export type ParticleType =
  | 'prismaticSpark'   // 0 - bright rainbow sparks
  | 'rainbowTrail'     // 1 - flowing rainbow trails
  | 'phaseGlow'        // 2 - phase-specific glow
  | 'cosmicDust'       // 3 - floating background dust
  | 'victoryBurst'     // 4 - celebration explosions
  | 'transitionWave';  // 5 - wave between phases

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
  prismaticSpark: 0,
  rainbowTrail: 1,
  phaseGlow: 2,
  cosmicDust: 3,
  victoryBurst: 4,
  transitionWave: 5,
};

export class ParticleSystem {
  private particles: Particle[] = [];
  private maxParticles: number;

  constructor(maxParticles: number = 600) {
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
      phase: number;
    }> = {}
  ) {
    const typeIndex = PARTICLE_TYPE_MAP[type];
    const {
      baseVelocity = [0, 0],
      spread = 0.5,
      sizeRange = [0.5, 1.5],
      lifeRange = [0.5, 1.5],
      color,
      phase = 0,
    } = options;

    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) {
        // Remove oldest particle
        this.particles.shift();
      }

      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * spread;

      let particleColor: Vec4;
      if (color) {
        particleColor = [...color] as Vec4;
      } else {
        particleColor = this.getDefaultColor(type, phase);
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

  private getDefaultColor(type: ParticleType, phase: number): Vec4 {
    switch (type) {
      case 'prismaticSpark':
        return rainbowColor(Math.random());
      case 'rainbowTrail':
        return rainbowColor(Math.random());
      case 'phaseGlow':
        if (phase < 0.33) {
          return [...ULTIMATE_COLORS.colorPhase] as Vec4;
        } else if (phase < 0.66) {
          return [...ULTIMATE_COLORS.pathPhase] as Vec4;
        } else {
          return [...ULTIMATE_COLORS.sortPhase] as Vec4;
        }
      case 'cosmicDust':
        return [...ULTIMATE_COLORS.prismaticSilver] as Vec4;
      case 'victoryBurst':
        return [...ULTIMATE_COLORS.prismaticGold] as Vec4;
      case 'transitionWave':
        return rainbowColor(Math.random());
      default:
        return [...ULTIMATE_COLORS.prismaticWhite] as Vec4;
    }
  }

  update(deltaTime: number) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];

      // Update position
      p.position[0] += p.velocity[0] * deltaTime;
      p.position[1] += p.velocity[1] * deltaTime;

      // Apply physics based on type
      switch (p.particleType) {
        case 0: // prismaticSpark
          p.velocity[1] -= 0.3 * deltaTime; // Slight gravity
          p.velocity[0] *= 0.98;
          p.velocity[1] *= 0.98;
          break;
        case 1: // rainbowTrail
          p.velocity[0] *= 0.95;
          p.velocity[1] *= 0.95;
          break;
        case 2: // phaseGlow
          p.velocity[0] *= 0.92;
          p.velocity[1] *= 0.92;
          break;
        case 3: // cosmicDust
          // Gentle floating
          p.velocity[0] += (Math.random() - 0.5) * 0.01;
          p.velocity[1] += (Math.random() - 0.5) * 0.01;
          p.velocity[0] *= 0.99;
          p.velocity[1] *= 0.99;
          break;
        case 4: // victoryBurst
          p.velocity[1] -= 0.2 * deltaTime;
          p.velocity[0] *= 0.96;
          p.velocity[1] *= 0.96;
          break;
        case 5: // transitionWave
          p.velocity[0] *= 0.97;
          p.velocity[1] *= 0.97;
          break;
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

  clear() {
    this.particles = [];
  }

  getParticleCount(): number {
    return this.particles.length;
  }
}
