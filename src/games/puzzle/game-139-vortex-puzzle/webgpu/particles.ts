/**
 * Particle System - Vortex Puzzle
 * Cosmic Vortex / Wormhole / Space Portal Theme
 * Game #139
 */

import { randomRange, VORTEX_COLORS, lerpColor } from './math';

export type ParticleType =
  | 'vortexSpiral'   // 0: Swirling particles around vortex
  | 'orbGlow'        // 1: Glow effect around orbs
  | 'ringPulse'      // 2: Pulsing energy on rings
  | 'gapBeam'        // 3: Beam of light at gap positions
  | 'starDust'       // 4: Ambient space dust
  | 'portalFlash';   // 5: Flash when orb moves inward

const PARTICLE_TYPE_MAP: Record<ParticleType, number> = {
  vortexSpiral: 0,
  orbGlow: 1,
  ringPulse: 2,
  gapBeam: 3,
  starDust: 4,
  portalFlash: 5,
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
        case 'vortexSpiral':
          // Spiral inward
          const dx = 0.5 - p.x;
          const dy = 0.5 - p.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist > 0.01) {
            const angle = Math.atan2(dy, dx) + 0.1;
            p.vx = Math.cos(angle) * 0.02 + dx * 0.01;
            p.vy = Math.sin(angle) * 0.02 + dy * 0.01;
          }
          break;
        case 'orbGlow':
          // Orbit around center
          p.size *= 0.99;
          break;
        case 'ringPulse':
          p.size *= 1.02;
          break;
        case 'gapBeam':
          p.y -= 0.02 * deltaTime;
          break;
        case 'starDust':
          // Gentle drift
          p.vx += Math.sin(Date.now() * 0.001 + p.seed * 5) * 0.0001;
          p.vy += Math.cos(Date.now() * 0.001 + p.seed * 5) * 0.0001;
          break;
        case 'portalFlash':
          p.size += deltaTime * 0.1;
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
    }> = {}
  ): void {
    const {
      color = this.getDefaultColor(type),
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

  private getDefaultColor(type: ParticleType): [number, number, number, number] {
    switch (type) {
      case 'vortexSpiral':
        return [...VORTEX_COLORS.vortexPurple] as [number, number, number, number];
      case 'orbGlow':
        return [...VORTEX_COLORS.energyYellow] as [number, number, number, number];
      case 'ringPulse':
        return [...VORTEX_COLORS.vortexBlue] as [number, number, number, number];
      case 'gapBeam':
        return [...VORTEX_COLORS.portalGreen] as [number, number, number, number];
      case 'starDust':
        return [...VORTEX_COLORS.starBlue] as [number, number, number, number];
      case 'portalFlash':
        return [...VORTEX_COLORS.energyWhite] as [number, number, number, number];
      default:
        return [...VORTEX_COLORS.energyWhite] as [number, number, number, number];
    }
  }

  private getDefaultSize(type: ParticleType): number {
    switch (type) {
      case 'vortexSpiral': return 0.02;
      case 'orbGlow': return 0.04;
      case 'ringPulse': return 0.03;
      case 'gapBeam': return 0.025;
      case 'starDust': return 0.01;
      case 'portalFlash': return 0.05;
      default: return 0.02;
    }
  }

  private getDefaultLife(type: ParticleType): number {
    switch (type) {
      case 'vortexSpiral': return 3.0;
      case 'orbGlow': return 1.5;
      case 'ringPulse': return 1.0;
      case 'gapBeam': return 0.8;
      case 'starDust': return 4.0;
      case 'portalFlash': return 0.5;
      default: return 1.0;
    }
  }

  private getDefaultSpeed(type: ParticleType): number {
    switch (type) {
      case 'vortexSpiral': return 0.02;
      case 'orbGlow': return 0.0;
      case 'ringPulse': return 0.0;
      case 'gapBeam': return 0.02;
      case 'starDust': return 0.005;
      case 'portalFlash': return 0.0;
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
