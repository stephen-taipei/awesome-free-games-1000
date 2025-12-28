/**
 * Particle System - Ancient Script
 * Ancient Runes / Mystical Scrolls / Archaeology Theme
 * Game #141
 */

import { ANCIENT_COLORS, randomRange, lerpColor, easeOutQuad } from './math';

export type ParticleType =
  | 'runeGlow'        // 0 - mystical glow around runes
  | 'decodeSparkle'   // 1 - sparkles when letter is decoded
  | 'ancientDust'     // 2 - ancient mystical dust
  | 'scrollFlame'     // 3 - torch/candle flame particles
  | 'inkDrip'         // 4 - ink particles on parchment
  | 'revealFlash';    // 5 - flash when answer revealed

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
  runeGlow: 0,
  decodeSparkle: 1,
  ancientDust: 2,
  scrollFlame: 3,
  inkDrip: 4,
  revealFlash: 5,
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
      case 'runeGlow':
        return Math.random() > 0.5
          ? [...ANCIENT_COLORS.runeGold]
          : [...ANCIENT_COLORS.runeBronze];
      case 'decodeSparkle':
        return Math.random() > 0.5
          ? [...ANCIENT_COLORS.runeGold]
          : [...ANCIENT_COLORS.revealWhite];
      case 'ancientDust':
        return [...ANCIENT_COLORS.runeCopper];
      case 'scrollFlame':
        return Math.random() > 0.5
          ? [...ANCIENT_COLORS.torchOrange]
          : [...ANCIENT_COLORS.torchYellow];
      case 'inkDrip':
        return [...ANCIENT_COLORS.inkBlack];
      case 'revealFlash':
        return [...ANCIENT_COLORS.successGreen];
      default:
        return [...ANCIENT_COLORS.runeGold];
    }
  }

  private getDefaultSizeRange(type: ParticleType): [number, number] {
    switch (type) {
      case 'runeGlow':
        return [0.8, 1.5];
      case 'decodeSparkle':
        return [0.5, 1.2];
      case 'ancientDust':
        return [0.2, 0.5];
      case 'scrollFlame':
        return [0.4, 0.9];
      case 'inkDrip':
        return [0.3, 0.7];
      case 'revealFlash':
        return [1.5, 2.5];
      default:
        return [0.5, 1.0];
    }
  }

  private getDefaultLifeRange(type: ParticleType): [number, number] {
    switch (type) {
      case 'runeGlow':
        return [0.8, 1.5];
      case 'decodeSparkle':
        return [0.4, 0.8];
      case 'ancientDust':
        return [2.0, 4.0];
      case 'scrollFlame':
        return [0.3, 0.6];
      case 'inkDrip':
        return [0.5, 1.0];
      case 'revealFlash':
        return [0.5, 1.0];
      default:
        return [0.5, 1.0];
    }
  }

  private getDefaultVelocityRange(type: ParticleType): { x: [number, number]; y: [number, number] } {
    switch (type) {
      case 'runeGlow':
        return { x: [-0.02, 0.02], y: [-0.02, 0.02] };
      case 'decodeSparkle':
        return { x: [-0.15, 0.15], y: [-0.15, 0.15] };
      case 'ancientDust':
        return { x: [-0.01, 0.01], y: [0.005, 0.02] };
      case 'scrollFlame':
        return { x: [-0.03, 0.03], y: [0.05, 0.15] };
      case 'inkDrip':
        return { x: [-0.01, 0.01], y: [-0.08, -0.03] };
      case 'revealFlash':
        return { x: [-0.1, 0.1], y: [-0.1, 0.1] };
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

      // Apply slight upward drift for flames
      if (p.particleType === 3) {
        p.velocity[1] += 0.1 * deltaTime;
      }

      // Apply gravity for ink drips
      if (p.particleType === 4) {
        p.velocity[1] -= 0.2 * deltaTime;
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
