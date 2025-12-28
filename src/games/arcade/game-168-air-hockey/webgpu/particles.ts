/**
 * WebGPU Particle System - Air Hockey
 * Arcade / Air Hockey / Blue and Red Neon Theme
 * Game #168
 */

import {
  HOCKEY_COLORS,
  randomRange,
  getRandomConfettiColor,
  getPlayerHitColor,
  getCpuHitColor,
  getSparkColor,
} from './math';

export type ParticleType =
  | 'hit'
  | 'wallBounce'
  | 'goal'
  | 'puckTrail'
  | 'spark'
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
  hit: 0,
  wallBounce: 1,
  goal: 2,
  puckTrail: 3,
  spark: 4,
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
      case 'hit':
        return randomRange(0.05, 0.1);
      case 'wallBounce':
        return randomRange(0.03, 0.06);
      case 'goal':
        return randomRange(0.08, 0.15);
      case 'puckTrail':
        return randomRange(0.005, 0.01);
      case 'spark':
        return randomRange(0.04, 0.08);
      case 'gameOver':
        return randomRange(0.05, 0.12);
      default:
        return 0.05;
    }
  }

  private getDefaultSize(type: ParticleType): number {
    switch (type) {
      case 'hit':
        return randomRange(1.2, 1.8);
      case 'wallBounce':
        return randomRange(0.6, 1.0);
      case 'goal':
        return randomRange(1.5, 2.5);
      case 'puckTrail':
        return randomRange(0.4, 0.6);
      case 'spark':
        return randomRange(0.4, 0.7);
      case 'gameOver':
        return randomRange(0.8, 1.4);
      default:
        return 1.0;
    }
  }

  private getDefaultLife(type: ParticleType): number {
    switch (type) {
      case 'hit':
        return randomRange(0.3, 0.5);
      case 'wallBounce':
        return randomRange(0.2, 0.4);
      case 'goal':
        return randomRange(0.6, 1.0);
      case 'puckTrail':
        return randomRange(0.1, 0.2);
      case 'spark':
        return randomRange(0.2, 0.4);
      case 'gameOver':
        return randomRange(2.0, 3.5);
      default:
        return 1.0;
    }
  }

  private getDefaultColor(type: ParticleType): number[] {
    switch (type) {
      case 'hit':
        return getSparkColor();
      case 'wallBounce':
        return HOCKEY_COLORS.wallSpark;
      case 'goal':
        return HOCKEY_COLORS.goalGold;
      case 'puckTrail':
        return HOCKEY_COLORS.trailCyan;
      case 'spark':
        return getSparkColor();
      case 'gameOver':
        return getRandomConfettiColor();
      default:
        return HOCKEY_COLORS.hitSpark;
    }
  }

  update(delta: number) {
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

      // Apply drag
      const type = p.particleType;
      let drag = 0.98;
      if (type === 3) drag = 0.95; // puckTrail fades faster
      if (type === 5) drag = 0.99; // confetti falls slower

      p.velocity[0] *= drag;
      p.velocity[1] *= drag;

      // Gravity for confetti
      if (type === 5) {
        p.velocity[1] += 0.1 * delta;
        // Flutter effect
        p.velocity[0] += Math.sin(p.life * 10) * 0.002;
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
