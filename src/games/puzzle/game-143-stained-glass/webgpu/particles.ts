/**
 * Particle System - Stained Glass
 * Cathedral / Light Through Glass Theme
 * Game #143
 */

import { randomRange, lerp, getGlassColor, getRainbowColor, GLASS_COLORS } from './math';

export type ParticleType =
  | 'glassShimmer'    // 0 - light shimmer on glass
  | 'colorFill'       // 1 - color spreading when filling
  | 'lightRay'        // 2 - rays of light through glass
  | 'dustMote'        // 3 - floating dust in light beams
  | 'prismSparkle'    // 4 - rainbow prism effects
  | 'glowPulse';      // 5 - glowing pulses on valid coloring

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
  glassShimmer: 0,
  colorFill: 1,
  lightRay: 2,
  dustMote: 3,
  prismSparkle: 4,
  glowPulse: 5,
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
      const velocity = randomRange(0.01, 0.05) * speed;
      const offsetX = (Math.random() - 0.5) * spread;
      const offsetY = (Math.random() - 0.5) * spread;

      let particleColor: readonly [number, number, number, number];

      if (color) {
        particleColor = color;
      } else if (colorIndex !== undefined) {
        particleColor = getGlassColor(colorIndex);
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
      case 'glassShimmer':
        return GLASS_COLORS.opal;
      case 'colorFill':
        return GLASS_COLORS.amethyst;
      case 'lightRay':
        return GLASS_COLORS.lightBeam;
      case 'dustMote':
        return GLASS_COLORS.dustGold;
      case 'prismSparkle':
        return GLASS_COLORS.prismRainbow;
      case 'glowPulse':
        return GLASS_COLORS.lightBeam;
      default:
        return GLASS_COLORS.opal;
    }
  }

  private getBaseLife(type: ParticleType): number {
    switch (type) {
      case 'glassShimmer': return 2.0;
      case 'colorFill': return 0.8;
      case 'lightRay': return 2.5;
      case 'dustMote': return 4.0;
      case 'prismSparkle': return 1.2;
      case 'glowPulse': return 1.5;
      default: return 1.0;
    }
  }

  private getBaseSize(type: ParticleType): number {
    switch (type) {
      case 'glassShimmer': return 1.2;
      case 'colorFill': return 2.5;
      case 'lightRay': return 3.0;
      case 'dustMote': return 0.5;
      case 'prismSparkle': return 1.0;
      case 'glowPulse': return 2.0;
      default: return 1.0;
    }
  }

  private getVelocityMultiplier(type: ParticleType): number {
    switch (type) {
      case 'glassShimmer': return 0.1;
      case 'colorFill': return 1.2;
      case 'lightRay': return 0.05;
      case 'dustMote': return 0.2;
      case 'prismSparkle': return 0.8;
      case 'glowPulse': return 0.3;
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
        case 'glassShimmer':
          // Gentle floating
          p.vx += Math.sin(Date.now() * 0.002 + p.y * 10) * 0.00002;
          p.vy += Math.cos(Date.now() * 0.002 + p.x * 10) * 0.00002;
          break;
        case 'colorFill':
          // Expand outward then slow
          p.vx *= 0.92;
          p.vy *= 0.92;
          break;
        case 'lightRay':
          // Drift slowly downward
          p.vy += 0.00005;
          p.vx *= 0.99;
          break;
        case 'dustMote':
          // Gentle floating with drift
          p.vx += (Math.random() - 0.5) * 0.0001;
          p.vy += 0.00003; // Slight downward drift
          break;
        case 'prismSparkle':
          // Burst then slow
          p.vx *= 0.95;
          p.vy *= 0.95;
          break;
        case 'glowPulse':
          // Radiate outward slowly
          p.vx *= 0.97;
          p.vy *= 0.97;
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
