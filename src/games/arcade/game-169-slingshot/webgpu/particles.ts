/**
 * WebGPU Particle System - Slingshot
 * Arcade / Slingshot / Outdoor Nature Theme
 * Game #169
 */

import {
  SLINGSHOT_COLORS,
  randomRange,
  getRandomConfettiColor,
  getLaunchColor,
  getImpactColor,
  getTargetHitColor,
} from './math';

export type ParticleType =
  | 'launch'
  | 'trail'
  | 'targetHit'
  | 'shatter'
  | 'score'
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
  launch: 0,
  trail: 1,
  targetHit: 2,
  shatter: 3,
  score: 4,
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
      case 'launch':
        return randomRange(0.04, 0.08);
      case 'trail':
        return randomRange(0.005, 0.015);
      case 'targetHit':
        return randomRange(0.08, 0.15);
      case 'shatter':
        return randomRange(0.06, 0.12);
      case 'score':
        return randomRange(0.03, 0.06);
      case 'gameOver':
        return randomRange(0.05, 0.12);
      default:
        return 0.05;
    }
  }

  private getDefaultSize(type: ParticleType): number {
    switch (type) {
      case 'launch':
        return randomRange(1.2, 2.0);
      case 'trail':
        return randomRange(0.4, 0.7);
      case 'targetHit':
        return randomRange(1.5, 2.5);
      case 'shatter':
        return randomRange(0.8, 1.4);
      case 'score':
        return randomRange(0.6, 1.0);
      case 'gameOver':
        return randomRange(0.8, 1.4);
      default:
        return 1.0;
    }
  }

  private getDefaultLife(type: ParticleType): number {
    switch (type) {
      case 'launch':
        return randomRange(0.4, 0.7);
      case 'trail':
        return randomRange(0.15, 0.3);
      case 'targetHit':
        return randomRange(0.5, 0.8);
      case 'shatter':
        return randomRange(0.6, 1.0);
      case 'score':
        return randomRange(0.4, 0.6);
      case 'gameOver':
        return randomRange(2.0, 3.5);
      default:
        return 1.0;
    }
  }

  private getDefaultColor(type: ParticleType): number[] {
    switch (type) {
      case 'launch':
        return getLaunchColor();
      case 'trail':
        return SLINGSHOT_COLORS.trailGray;
      case 'targetHit':
        return getImpactColor();
      case 'shatter':
        return getTargetHitColor();
      case 'score':
        return SLINGSHOT_COLORS.sparkYellow;
      case 'gameOver':
        return getRandomConfettiColor();
      default:
        return SLINGSHOT_COLORS.impactWhite;
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

      // Apply drag and gravity based on type
      const type = p.particleType;
      let drag = 0.97;
      let gravityY = 0;

      if (type === 0) {
        // Launch dust - rises and expands
        drag = 0.94;
        gravityY = -0.02;
      } else if (type === 1) {
        // Trail - fades quickly
        drag = 0.92;
      } else if (type === 3) {
        // Shatter fragments - fall with gravity
        drag = 0.98;
        gravityY = 0.15;
      } else if (type === 5) {
        // Confetti - falls slowly with flutter
        drag = 0.99;
        gravityY = 0.08;
        p.velocity[0] += Math.sin(p.life * 12) * 0.003;
      }

      p.velocity[0] *= drag;
      p.velocity[1] *= drag;
      p.velocity[1] += gravityY * delta;
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
