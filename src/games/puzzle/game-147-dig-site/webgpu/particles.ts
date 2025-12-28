/**
 * Particle System - Dig Site
 * Archaeological / Desert / Earth / Discovery Theme
 * Game #147
 */

import { EARTH_COLORS, randomRange, colorLerp } from './math';

export type ParticleType =
  | 'dustCloud'
  | 'sandParticle'
  | 'artifactGlimmer'
  | 'digImpact'
  | 'earthCrumble'
  | 'discoverySparkle';

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: [number, number, number, number];
  life: number;
  maxLife: number;
  size: number;
  type: ParticleType;
}

const PARTICLE_TYPE_INDEX: Record<ParticleType, number> = {
  dustCloud: 0,
  sandParticle: 1,
  artifactGlimmer: 2,
  digImpact: 3,
  earthCrumble: 4,
  discoverySparkle: 5,
};

export class ParticleSystem {
  private particles: Particle[] = [];
  private maxParticles = 600;

  update(dt: number) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;

      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      // Update position
      p.x += p.vx * dt;
      p.y += p.vy * dt;

      // Type-specific behavior
      switch (p.type) {
        case 'dustCloud':
          // Slow expansion and rise
          p.vy -= 0.05 * dt;
          p.vx *= 0.98;
          p.vy *= 0.98;
          break;

        case 'sandParticle':
          // Gravity fall
          p.vy += 0.8 * dt;
          p.vx *= 0.99;
          break;

        case 'artifactGlimmer':
          // Subtle float
          p.vx += Math.sin(p.life * 5) * 0.01;
          p.vy += Math.cos(p.life * 4) * 0.01;
          break;

        case 'digImpact':
          // Explosive outward then settle
          p.vy += 0.3 * dt;
          p.vx *= 0.95;
          p.vy *= 0.95;
          break;

        case 'earthCrumble':
          // Chunky fall with tumble
          p.vy += 0.6 * dt;
          p.vx += Math.sin(p.life * 10) * 0.02;
          break;

        case 'discoverySparkle':
          // Float up and outward
          p.vy -= 0.1 * dt;
          const angle = Math.atan2(p.vy, p.vx);
          p.vx = Math.cos(angle) * 0.08;
          p.vy = Math.sin(angle) * 0.08 - 0.02;
          break;
      }

      // Fade out
      const lifeRatio = p.life / p.maxLife;
      p.color[3] = lifeRatio * (p.type === 'dustCloud' ? 0.6 : 1.0);
    }
  }

  emit(
    type: ParticleType,
    x: number,
    y: number,
    count: number = 1,
    options: Partial<{
      spread: number;
      speed: number;
      sizeMin: number;
      sizeMax: number;
      lifeMin: number;
      lifeMax: number;
    }> = {}
  ) {
    const {
      spread = 0.1,
      speed = 0.1,
      sizeMin = 0.01,
      sizeMax = 0.03,
      lifeMin = 0.5,
      lifeMax = 1.5,
    } = options;

    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * spread;
      const vel = speed * (0.5 + Math.random() * 0.5);

      let color: [number, number, number, number];
      let vx = Math.cos(angle) * vel;
      let vy = Math.sin(angle) * vel;

      switch (type) {
        case 'dustCloud':
          color = [...EARTH_COLORS.dustCloud] as [number, number, number, number];
          vy = -Math.abs(vy) * 0.5; // Rise up
          break;

        case 'sandParticle':
          color = colorLerp(EARTH_COLORS.lightSand, EARTH_COLORS.tan, Math.random());
          break;

        case 'artifactGlimmer':
          color = colorLerp(EARTH_COLORS.gold, EARTH_COLORS.treasureGlow, Math.random());
          break;

        case 'digImpact':
          color = colorLerp(EARTH_COLORS.brown, EARTH_COLORS.lightBrown, Math.random());
          // Upward spray
          vy = -Math.abs(vy) * 1.5;
          break;

        case 'earthCrumble':
          color = colorLerp(EARTH_COLORS.darkBrown, EARTH_COLORS.earthParticle, Math.random());
          break;

        case 'discoverySparkle':
          color = colorLerp(EARTH_COLORS.treasureGlow, EARTH_COLORS.gold, Math.random());
          // Radial outward from center
          const sparkleAngle = Math.random() * Math.PI * 2;
          vx = Math.cos(sparkleAngle) * vel * 1.5;
          vy = Math.sin(sparkleAngle) * vel * 1.5 - 0.05;
          break;

        default:
          color = [1, 1, 1, 1];
      }

      this.particles.push({
        x: x + Math.cos(angle) * dist,
        y: y + Math.sin(angle) * dist,
        vx,
        vy,
        color,
        life: randomRange(lifeMin, lifeMax),
        maxLife: lifeMax,
        size: randomRange(sizeMin, sizeMax),
        type,
      });
    }
  }

  getParticleData(): Float32Array {
    const data = new Float32Array(this.particles.length * 12);

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
      data[offset + 8] = p.life;
      data[offset + 9] = p.maxLife;
      data[offset + 10] = p.size;
      data[offset + 11] = PARTICLE_TYPE_INDEX[p.type];
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
