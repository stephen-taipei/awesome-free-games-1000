/**
 * Particle System - Hourglass
 * Time / Sands of Time / Ancient Theme
 * Game #140
 */

import { HOURGLASS_COLORS, randomRange, lerpColor, easeOutQuad } from './math';

export type ParticleType =
  | 'sandGrain'      // 0 - falling sand particles
  | 'starGlow'       // 1 - glowing star particles
  | 'timeRipple'     // 2 - ripples when time flows
  | 'flipSpark'      // 3 - sparks when hourglass is flipped
  | 'goldenDust'     // 4 - ambient golden dust
  | 'collectBurst';  // 5 - burst when star is collected

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
  sandGrain: 0,
  starGlow: 1,
  timeRipple: 2,
  flipSpark: 3,
  goldenDust: 4,
  collectBurst: 5,
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
    options: {
      color?: [number, number, number, number];
      sizeRange?: [number, number];
      lifeRange?: [number, number];
      velocityRange?: { x: [number, number]; y: [number, number] };
      spread?: number;
    } = {}
  ) {
    const typeIndex = PARTICLE_TYPE_MAP[type];

    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) {
        this.particles.shift();
      }

      const spread = options.spread ?? 0.02;
      const sizeRange = options.sizeRange ?? this.getDefaultSizeRange(type);
      const lifeRange = options.lifeRange ?? this.getDefaultLifeRange(type);
      const velocityRange = options.velocityRange ?? this.getDefaultVelocityRange(type);
      const color = options.color ?? this.getDefaultColor(type);

      const particle: Particle = {
        position: [
          x + randomRange(-spread, spread),
          y + randomRange(-spread, spread),
        ],
        velocity: [
          randomRange(velocityRange.x[0], velocityRange.x[1]),
          randomRange(velocityRange.y[0], velocityRange.y[1]),
        ],
        color: [...color],
        size: randomRange(sizeRange[0], sizeRange[1]),
        life: randomRange(lifeRange[0], lifeRange[1]),
        maxLife: lifeRange[1],
        particleType: typeIndex,
      };

      this.particles.push(particle);
    }
  }

  private getDefaultColor(type: ParticleType): [number, number, number, number] {
    switch (type) {
      case 'sandGrain':
        return Math.random() > 0.5
          ? [...HOURGLASS_COLORS.sandGold]
          : [...HOURGLASS_COLORS.sandOrange];
      case 'starGlow':
        return Math.random() > 0.5
          ? [...HOURGLASS_COLORS.starYellow]
          : [...HOURGLASS_COLORS.starWhite];
      case 'timeRipple':
        return [...HOURGLASS_COLORS.timeBlue];
      case 'flipSpark':
        return Math.random() > 0.5
          ? [...HOURGLASS_COLORS.goldGlow]
          : [...HOURGLASS_COLORS.bronzeShine];
      case 'goldenDust':
        return [...HOURGLASS_COLORS.sandLight];
      case 'collectBurst':
        return [...HOURGLASS_COLORS.starYellow];
      default:
        return [...HOURGLASS_COLORS.sandGold];
    }
  }

  private getDefaultSizeRange(type: ParticleType): [number, number] {
    switch (type) {
      case 'sandGrain':
        return [0.3, 0.8];
      case 'starGlow':
        return [1.0, 1.8];
      case 'timeRipple':
        return [1.5, 2.5];
      case 'flipSpark':
        return [0.5, 1.2];
      case 'goldenDust':
        return [0.2, 0.5];
      case 'collectBurst':
        return [0.8, 1.5];
      default:
        return [0.5, 1.0];
    }
  }

  private getDefaultLifeRange(type: ParticleType): [number, number] {
    switch (type) {
      case 'sandGrain':
        return [0.5, 1.2];
      case 'starGlow':
        return [0.8, 1.5];
      case 'timeRipple':
        return [0.6, 1.0];
      case 'flipSpark':
        return [0.3, 0.6];
      case 'goldenDust':
        return [1.5, 3.0];
      case 'collectBurst':
        return [0.4, 0.8];
      default:
        return [0.5, 1.0];
    }
  }

  private getDefaultVelocityRange(type: ParticleType): { x: [number, number]; y: [number, number] } {
    switch (type) {
      case 'sandGrain':
        return { x: [-0.02, 0.02], y: [-0.15, -0.05] };
      case 'starGlow':
        return { x: [-0.01, 0.01], y: [-0.01, 0.01] };
      case 'timeRipple':
        return { x: [-0.02, 0.02], y: [-0.02, 0.02] };
      case 'flipSpark':
        return { x: [-0.2, 0.2], y: [-0.2, 0.2] };
      case 'goldenDust':
        return { x: [-0.01, 0.01], y: [0.005, 0.02] };
      case 'collectBurst':
        return { x: [-0.15, 0.15], y: [-0.15, 0.15] };
      default:
        return { x: [-0.05, 0.05], y: [-0.05, 0.05] };
    }
  }

  update(deltaTime: number) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];

      p.life -= deltaTime;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      // Apply velocity
      p.position[0] += p.velocity[0] * deltaTime;
      p.position[1] += p.velocity[1] * deltaTime;

      // Apply gravity to sand grains
      if (p.particleType === 0) {
        p.velocity[1] -= 0.3 * deltaTime;
      }

      // Apply drag
      const drag = 0.98;
      p.velocity[0] *= drag;
      p.velocity[1] *= drag;

      // Fade out
      const lifeRatio = p.life / p.maxLife;
      p.color[3] = easeOutQuad(lifeRatio);
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
