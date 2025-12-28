/**
 * Particle System - Lego Build
 * Colorful Toys / Construction / Playful Blocks Theme
 * Game #142
 */

import { randomRange, lerp, getLegoColor, LEGO_COLORS } from './math';

export type ParticleType =
  | 'blockGlow'      // 0 - glow around blocks
  | 'placeSpark'     // 1 - sparkles when block is placed
  | 'rotatePop'      // 2 - pop effect when rotating
  | 'studShine'      // 3 - shine on the studs
  | 'plasticDust'    // 4 - colorful plastic dust
  | 'snapFlash';     // 5 - flash when blocks snap together

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: readonly [number, number, number, number];
  size: number;
  life: number;
  maxLife: number;
  type: ParticleType;
}

const PARTICLE_TYPE_MAP: Record<ParticleType, number> = {
  blockGlow: 0,
  placeSpark: 1,
  rotatePop: 2,
  studShine: 3,
  plasticDust: 4,
  snapFlash: 5,
};

export class ParticleSystem {
  private particles: Particle[] = [];
  private maxParticles: number = 800;

  emit(
    x: number,
    y: number,
    type: ParticleType,
    count: number = 1,
    options: Partial<{
      spread: number;
      speed: number;
      size: number;
      life: number;
      color: readonly [number, number, number, number];
      colorIndex: number;
    }> = {}
  ) {
    const {
      spread = 0.1,
      speed = 0.5,
      size = 1.0,
      life = 1.0,
      color,
      colorIndex,
    } = options;

    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) {
        this.particles.shift();
      }

      const angle = Math.random() * Math.PI * 2;
      const velocity = randomRange(0.02, 0.08) * speed;
      const offsetX = (Math.random() - 0.5) * spread;
      const offsetY = (Math.random() - 0.5) * spread;

      let particleColor: readonly [number, number, number, number];

      if (color) {
        particleColor = color;
      } else if (colorIndex !== undefined) {
        particleColor = getLegoColor(colorIndex);
      } else {
        particleColor = this.getDefaultColor(type);
      }

      const baseLife = this.getBaseLife(type) * life;
      const baseSize = this.getBaseSize(type) * size;

      this.particles.push({
        x: x + offsetX,
        y: y + offsetY,
        vx: Math.cos(angle) * velocity * this.getVelocityMultiplier(type),
        vy: Math.sin(angle) * velocity * this.getVelocityMultiplier(type),
        color: particleColor,
        size: baseSize * randomRange(0.8, 1.2),
        life: baseLife,
        maxLife: baseLife,
        type,
      });
    }
  }

  private getDefaultColor(type: ParticleType): readonly [number, number, number, number] {
    switch (type) {
      case 'blockGlow':
        return LEGO_COLORS.studShine;
      case 'placeSpark':
        return LEGO_COLORS.sparkle;
      case 'rotatePop':
        return LEGO_COLORS.brightYellow;
      case 'studShine':
        return LEGO_COLORS.plasticWhite;
      case 'plasticDust':
        return getLegoColor(Math.floor(Math.random() * 5));
      case 'snapFlash':
        return LEGO_COLORS.snapGlow;
      default:
        return LEGO_COLORS.plasticWhite;
    }
  }

  private getBaseLife(type: ParticleType): number {
    switch (type) {
      case 'blockGlow': return 1.5;
      case 'placeSpark': return 0.8;
      case 'rotatePop': return 0.6;
      case 'studShine': return 2.0;
      case 'plasticDust': return 2.5;
      case 'snapFlash': return 0.4;
      default: return 1.0;
    }
  }

  private getBaseSize(type: ParticleType): number {
    switch (type) {
      case 'blockGlow': return 2.5;
      case 'placeSpark': return 1.2;
      case 'rotatePop': return 1.8;
      case 'studShine': return 0.8;
      case 'plasticDust': return 0.6;
      case 'snapFlash': return 2.0;
      default: return 1.0;
    }
  }

  private getVelocityMultiplier(type: ParticleType): number {
    switch (type) {
      case 'blockGlow': return 0.2;
      case 'placeSpark': return 1.5;
      case 'rotatePop': return 0.8;
      case 'studShine': return 0.1;
      case 'plasticDust': return 0.4;
      case 'snapFlash': return 2.0;
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

      // Type-specific physics
      switch (p.type) {
        case 'blockGlow':
          // Gentle floating
          p.vy += Math.sin(Date.now() * 0.003 + p.x * 10) * 0.0001;
          break;
        case 'placeSpark':
          // Burst outward then slow
          p.vx *= 0.95;
          p.vy *= 0.95;
          break;
        case 'rotatePop':
          // Circular motion
          const angle = Math.atan2(p.vy, p.vx) + deltaTime * 3;
          const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
          p.vx = Math.cos(angle) * speed;
          p.vy = Math.sin(angle) * speed;
          break;
        case 'studShine':
          // Stay mostly in place with slight shimmer
          p.vx *= 0.9;
          p.vy *= 0.9;
          break;
        case 'plasticDust':
          // Float down with slight drift
          p.vy += 0.0002;
          p.vx += (Math.random() - 0.5) * 0.0001;
          break;
        case 'snapFlash':
          // Rapid expansion
          p.vx *= 0.85;
          p.vy *= 0.85;
          break;
      }

      p.x += p.vx;
      p.y += p.vy;
    }
  }

  getParticleData(): Float32Array {
    const stride = 12;
    const data = new Float32Array(this.maxParticles * stride);

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      const offset = i * stride;

      data[offset + 0] = p.x;
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

  getParticleCount(): number {
    return this.particles.length;
  }

  clear() {
    this.particles = [];
  }
}
