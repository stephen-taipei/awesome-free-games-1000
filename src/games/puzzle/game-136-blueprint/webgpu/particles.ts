/**
 * Particle System - Blueprint
 * Architecture / Engineering / Construction Theme
 * Game #136
 */

import { BLUEPRINT_COLORS, lerp, lerpColor } from './math';

export type ParticleType =
  | 'gridDot'
  | 'dimensionMarker'
  | 'constructionSpark'
  | 'blueprintTrace'
  | 'blockPlace'
  | 'measureLine';

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
}

const PARTICLE_TYPE_MAP: Record<ParticleType, number> = {
  gridDot: 0,
  dimensionMarker: 1,
  constructionSpark: 2,
  blueprintTrace: 3,
  blockPlace: 4,
  measureLine: 5,
};

export class ParticleSystem {
  private particles: Particle[] = [];
  private maxParticles: number;

  constructor(maxParticles: number = 300) {
    this.maxParticles = maxParticles;
  }

  emit(
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
      direction: number;
    }> = {}
  ) {
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) {
        this.particles.shift();
      }

      const angle = (options.direction ?? Math.random() * Math.PI * 2) +
                    (Math.random() - 0.5) * (options.spread ?? Math.PI * 2);
      const speed = (options.speed ?? 0.02) * (0.5 + Math.random() * 0.5);

      let color: [number, number, number, number];
      switch (type) {
        case 'gridDot':
          color = [...BLUEPRINT_COLORS.gridLine] as [number, number, number, number];
          break;
        case 'dimensionMarker':
          color = [...BLUEPRINT_COLORS.dimensionLine] as [number, number, number, number];
          break;
        case 'constructionSpark':
          color = [...BLUEPRINT_COLORS.sparkOrange] as [number, number, number, number];
          break;
        case 'blueprintTrace':
          color = [...BLUEPRINT_COLORS.whiteInk] as [number, number, number, number];
          break;
        case 'blockPlace':
          color = options.color ?? [...BLUEPRINT_COLORS.constructionYellow] as [number, number, number, number];
          break;
        case 'measureLine':
          color = [...BLUEPRINT_COLORS.measureRed] as [number, number, number, number];
          break;
        default:
          color = [...BLUEPRINT_COLORS.gridLine] as [number, number, number, number];
      }

      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color,
        size: options.size ?? this.getDefaultSize(type),
        life: options.life ?? this.getDefaultLife(type),
        maxLife: options.life ?? this.getDefaultLife(type),
        type,
      });
    }
  }

  private getDefaultSize(type: ParticleType): number {
    switch (type) {
      case 'gridDot': return 0.004;
      case 'dimensionMarker': return 0.012;
      case 'constructionSpark': return 0.008;
      case 'blueprintTrace': return 0.006;
      case 'blockPlace': return 0.025;
      case 'measureLine': return 0.015;
      default: return 0.008;
    }
  }

  private getDefaultLife(type: ParticleType): number {
    switch (type) {
      case 'gridDot': return 2.5;
      case 'dimensionMarker': return 1.5;
      case 'constructionSpark': return 0.6;
      case 'blueprintTrace': return 1.8;
      case 'blockPlace': return 0.8;
      case 'measureLine': return 1.2;
      default: return 1.0;
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

      // Type-specific behavior
      switch (p.type) {
        case 'gridDot':
          // Gentle float
          p.vx *= 0.99;
          p.vy *= 0.99;
          p.vy -= 0.0001; // Slight upward drift
          break;
        case 'dimensionMarker':
          // Slow expansion
          p.vx *= 0.95;
          p.vy *= 0.95;
          break;
        case 'constructionSpark':
          // Gravity and friction
          p.vy += 0.002;
          p.vx *= 0.97;
          p.vy *= 0.97;
          break;
        case 'blueprintTrace':
          // Technical precision movement
          p.vx *= 0.98;
          p.vy *= 0.98;
          break;
        case 'blockPlace':
          // Expand outward
          p.vx *= 0.92;
          p.vy *= 0.92;
          break;
        case 'measureLine':
          // Linear movement
          p.vx *= 0.995;
          p.vy *= 0.995;
          break;
      }

      p.x += p.vx * deltaTime * 60;
      p.y += p.vy * deltaTime * 60;
    }
  }

  getParticleData(): Float32Array {
    const data = new Float32Array(this.maxParticles * 12);

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      const offset = i * 12;

      data[offset] = p.x;
      data[offset + 1] = p.y;
      data[offset + 2] = p.vx;
      data[offset + 3] = p.vy;
      data[offset + 4] = p.color[0];
      data[offset + 5] = p.color[1];
      data[offset + 6] = p.color[2];
      data[offset + 7] = p.color[3];
      data[offset + 8] = p.size;
      data[offset + 9] = p.life;
      data[offset + 10] = p.maxLife;
      data[offset + 11] = PARTICLE_TYPE_MAP[p.type];
    }

    return data;
  }

  getActiveCount(): number {
    return this.particles.length;
  }

  clear() {
    this.particles = [];
  }
}
