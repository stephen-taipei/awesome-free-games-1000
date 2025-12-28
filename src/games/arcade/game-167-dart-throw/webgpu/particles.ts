/**
 * WebGPU Particle System - Dart Throw
 * Pub / Darts / Red and Green Theme
 * Game #167
 */

import {
  DART_COLORS,
  randomRange,
  getRandomConfettiColor,
  getRandomDartColor,
  getScoreColor,
} from './math';

export type ParticleType =
  | 'throw'
  | 'land'
  | 'bullseye'
  | 'score'
  | 'miss'
  | 'gameOver';

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
  throw: 0,
  land: 1,
  bullseye: 2,
  score: 3,
  miss: 4,
  gameOver: 5,
};

export class ParticleSystem {
  private particles: Particle[] = [];
  private maxParticles: number = 1000;

  emit(
    x: number,
    y: number,
    type: ParticleType,
    count: number = 1,
    options: Partial<{
      color: number[];
      size: number;
      life: number;
      spread: number;
      speed: number;
      direction: [number, number];
    }> = {}
  ) {
    const typeIndex = PARTICLE_TYPE_MAP[type];

    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) {
        this.particles.shift();
      }

      const spread = options.spread ?? Math.PI * 2;
      const baseAngle = options.direction
        ? Math.atan2(options.direction[1], options.direction[0])
        : 0;
      const angle = baseAngle + randomRange(-spread / 2, spread / 2);
      const speed = options.speed ?? this.getDefaultSpeed(type);

      let color: number[];
      if (options.color) {
        color = options.color;
      } else {
        color = this.getDefaultColor(type);
      }

      const particle: Particle = {
        position: [x + randomRange(-0.01, 0.01), y + randomRange(-0.01, 0.01)],
        velocity: [Math.cos(angle) * speed, Math.sin(angle) * speed],
        color: color as [number, number, number, number],
        size: options.size ?? this.getDefaultSize(type),
        life: options.life ?? this.getDefaultLife(type),
        maxLife: options.life ?? this.getDefaultLife(type),
        particleType: typeIndex,
      };

      this.particles.push(particle);
    }
  }

  private getDefaultSpeed(type: ParticleType): number {
    switch (type) {
      case 'throw':
        return randomRange(0.01, 0.02);
      case 'land':
        return randomRange(0.03, 0.06);
      case 'bullseye':
        return randomRange(0.05, 0.1);
      case 'score':
        return randomRange(0.01, 0.02);
      case 'miss':
        return randomRange(0.02, 0.04);
      case 'gameOver':
        return randomRange(0.04, 0.1);
      default:
        return 0.05;
    }
  }

  private getDefaultSize(type: ParticleType): number {
    switch (type) {
      case 'throw':
        return randomRange(0.5, 0.8);
      case 'land':
        return randomRange(1.0, 1.5);
      case 'bullseye':
        return randomRange(2.0, 3.0);
      case 'score':
        return randomRange(1.0, 1.5);
      case 'miss':
        return randomRange(0.6, 1.0);
      case 'gameOver':
        return randomRange(0.8, 1.4);
      default:
        return 1.0;
    }
  }

  private getDefaultLife(type: ParticleType): number {
    switch (type) {
      case 'throw':
        return randomRange(0.15, 0.25);
      case 'land':
        return randomRange(0.4, 0.6);
      case 'bullseye':
        return randomRange(0.8, 1.2);
      case 'score':
        return randomRange(0.8, 1.2);
      case 'miss':
        return randomRange(0.4, 0.6);
      case 'gameOver':
        return randomRange(2.0, 3.5);
      default:
        return 1.0;
    }
  }

  private getDefaultColor(type: ParticleType): number[] {
    switch (type) {
      case 'throw':
        return getRandomDartColor();
      case 'land':
        return DART_COLORS.sparkWhite;
      case 'bullseye':
        return DART_COLORS.bullseyeGold;
      case 'score':
        return DART_COLORS.scoreGold;
      case 'miss':
        return DART_COLORS.missGray;
      case 'gameOver':
        return getRandomConfettiColor();
      default:
        return DART_COLORS.sparkWhite;
    }
  }

  update(delta: number) {
    const gravity = 0.12;

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];

      // Update life
      p.life -= delta;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      // Update position
      p.position[0] += p.velocity[0] * delta;
      p.position[1] += p.velocity[1] * delta;

      // Apply gravity to certain types
      const type = p.particleType;
      if (type === 1 || type === 5) {
        // land, gameOver
        p.velocity[1] += gravity * delta;
      }

      // Apply drag
      const drag = type === 3 ? 0.97 : 0.99; // score floats slowly
      p.velocity[0] *= drag;
      p.velocity[1] *= drag;

      // Type-specific behaviors
      if (type === 2) {
        // Bullseye - sparkle rotation
        p.velocity[0] += Math.sin(p.life * 15) * 0.001;
      } else if (type === 3) {
        // Score - float upward
        p.velocity[1] -= 0.002;
      } else if (type === 5) {
        // Game over - flutter
        p.velocity[0] += Math.sin(p.life * 8) * 0.002;
      }
    }
  }

  getParticleData(): Float32Array {
    const floatsPerParticle = 12;
    const data = new Float32Array(this.particles.length * floatsPerParticle);

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      const offset = i * floatsPerParticle;

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
