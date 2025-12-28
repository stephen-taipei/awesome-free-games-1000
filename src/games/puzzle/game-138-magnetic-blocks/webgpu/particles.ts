/**
 * Particle System - Magnetic Blocks
 * Electromagnetic / Physics / Magnet Theme
 * Game #138
 */

import { randomRange, MAGNETIC_COLORS, lerpColor } from './math';

export type ParticleType =
  | 'fieldLine'      // 0: Magnetic field line
  | 'magneticPulse'  // 1: Pulsing energy ring
  | 'attractionSpark'// 2: Spark when attracting
  | 'repulsionWave'  // 3: Wave when repelling
  | 'plasmaOrb'      // 4: Floating plasma orb
  | 'polarityFlicker';// 5: Polarity indicator

const PARTICLE_TYPE_MAP: Record<ParticleType, number> = {
  fieldLine: 0,
  magneticPulse: 1,
  attractionSpark: 2,
  repulsionWave: 3,
  plasmaOrb: 4,
  polarityFlicker: 5,
};

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: [number, number, number, number];
  size: number;
  life: number;
  maxLife: number;
  type: ParticleType;
  seed: number;
}

export class ParticleSystem {
  private particles: Particle[] = [];
  private maxParticles: number = 400;

  public update(deltaTime: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];

      p.x += p.vx * deltaTime;
      p.y += p.vy * deltaTime;
      p.life -= deltaTime / p.maxLife;

      // Type-specific behavior
      switch (p.type) {
        case 'fieldLine':
          p.vx += Math.sin(p.y * 10 + p.seed) * 0.0005;
          p.vy *= 0.98;
          break;
        case 'magneticPulse':
          p.size += deltaTime * 0.02;
          break;
        case 'attractionSpark':
          p.vx *= 0.92;
          p.vy *= 0.92;
          p.size *= 0.97;
          break;
        case 'repulsionWave':
          p.size += deltaTime * 0.05;
          p.vx *= 0.95;
          p.vy *= 0.95;
          break;
        case 'plasmaOrb':
          p.vx += Math.sin(Date.now() * 0.001 + p.seed * 5) * 0.0002;
          p.vy += Math.cos(Date.now() * 0.001 + p.seed * 5) * 0.0002;
          break;
        case 'polarityFlicker':
          // Stays in place, just flickers
          break;
      }

      if (p.life <= 0 || p.x < -0.1 || p.x > 1.1 || p.y < -0.1 || p.y > 1.1) {
        this.particles.splice(i, 1);
      }
    }
  }

  public emit(
    x: number,
    y: number,
    type: ParticleType,
    count: number = 1,
    options: Partial<{
      color: [number, number, number, number];
      size: number;
      life: number;
      speed: number;
      spread: number;
      isPositive: boolean;
    }> = {}
  ): void {
    const {
      color = this.getDefaultColor(type, options.isPositive),
      size = this.getDefaultSize(type),
      life = this.getDefaultLife(type),
      speed = this.getDefaultSpeed(type),
      spread = Math.PI * 2,
    } = options;

    for (let i = 0; i < count && this.particles.length < this.maxParticles; i++) {
      const angle = Math.random() * spread - spread / 2;
      const velocity = speed * (0.5 + Math.random() * 0.5);

      this.particles.push({
        x: x + randomRange(-0.02, 0.02),
        y: y + randomRange(-0.02, 0.02),
        vx: Math.cos(angle) * velocity,
        vy: Math.sin(angle) * velocity,
        color: [...color] as [number, number, number, number],
        size: size * randomRange(0.8, 1.2),
        life: 1,
        maxLife: life * randomRange(0.8, 1.2),
        type,
        seed: Math.random(),
      });
    }
  }

  private getDefaultColor(type: ParticleType, isPositive?: boolean): [number, number, number, number] {
    switch (type) {
      case 'fieldLine':
        return [...MAGNETIC_COLORS.fieldPurple] as [number, number, number, number];
      case 'magneticPulse':
        return isPositive
          ? [...MAGNETIC_COLORS.positiveRed] as [number, number, number, number]
          : [...MAGNETIC_COLORS.negativeBlue] as [number, number, number, number];
      case 'attractionSpark':
        return [...MAGNETIC_COLORS.sparkYellow] as [number, number, number, number];
      case 'repulsionWave':
        return [...MAGNETIC_COLORS.repelLine] as [number, number, number, number];
      case 'plasmaOrb':
        return [...MAGNETIC_COLORS.plasmaMagenta] as [number, number, number, number];
      case 'polarityFlicker':
        return isPositive
          ? [...MAGNETIC_COLORS.positiveRed] as [number, number, number, number]
          : [...MAGNETIC_COLORS.negativeBlue] as [number, number, number, number];
      default:
        return [...MAGNETIC_COLORS.sparkWhite] as [number, number, number, number];
    }
  }

  private getDefaultSize(type: ParticleType): number {
    switch (type) {
      case 'fieldLine': return 0.04;
      case 'magneticPulse': return 0.05;
      case 'attractionSpark': return 0.025;
      case 'repulsionWave': return 0.06;
      case 'plasmaOrb': return 0.02;
      case 'polarityFlicker': return 0.015;
      default: return 0.02;
    }
  }

  private getDefaultLife(type: ParticleType): number {
    switch (type) {
      case 'fieldLine': return 2.0;
      case 'magneticPulse': return 1.5;
      case 'attractionSpark': return 0.6;
      case 'repulsionWave': return 0.8;
      case 'plasmaOrb': return 3.0;
      case 'polarityFlicker': return 0.5;
      default: return 1.0;
    }
  }

  private getDefaultSpeed(type: ParticleType): number {
    switch (type) {
      case 'fieldLine': return 0.03;
      case 'magneticPulse': return 0.0;
      case 'attractionSpark': return 0.08;
      case 'repulsionWave': return 0.04;
      case 'plasmaOrb': return 0.01;
      case 'polarityFlicker': return 0.0;
      default: return 0.02;
    }
  }

  public getParticleData(): Float32Array {
    const data = new Float32Array(this.maxParticles * 12);

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      const offset = i * 12;

      data[offset + 0] = p.x;
      data[offset + 1] = p.y;
      data[offset + 2] = p.vx;
      data[offset + 3] = p.vy;
      data[offset + 4] = p.color[0];
      data[offset + 5] = p.color[1];
      data[offset + 6] = p.color[2];
      data[offset + 7] = p.color[3];
      data[offset + 8] = p.size;
      data[offset + 9] = Math.max(0, p.life);
      data[offset + 10] = PARTICLE_TYPE_MAP[p.type];
      data[offset + 11] = p.seed;
    }

    return data;
  }

  public getParticleCount(): number {
    return this.particles.length;
  }

  public clear(): void {
    this.particles = [];
  }
}
