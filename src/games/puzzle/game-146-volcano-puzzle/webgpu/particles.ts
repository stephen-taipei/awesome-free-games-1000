/**
 * Particle System - Volcano Puzzle
 * Volcanic / Molten / Magma / Fire Theme
 * Game #146
 */

import { VOLCANO_COLORS, randomRange, easeOutExpo, colorLerp } from './math';

export type ParticleType =
  | 'lavaFlow'
  | 'magmaSparkle'
  | 'emberRise'
  | 'heatWave'
  | 'ashFloat'
  | 'eruptionBurst';

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
  lavaFlow: 0,
  magmaSparkle: 1,
  emberRise: 2,
  heatWave: 3,
  ashFloat: 4,
  eruptionBurst: 5,
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
        case 'lavaFlow':
          // Slow flowing motion
          p.vx += Math.sin(p.y * 10 + p.x * 5) * 0.01;
          p.vy *= 0.99;
          break;

        case 'magmaSparkle':
          // Bright flash decay
          p.vy -= 0.1 * dt;
          break;

        case 'emberRise':
          // Rising with drift
          p.vx += Math.sin(p.life * 5) * 0.02;
          p.vy -= 0.3 * dt; // Rise up
          break;

        case 'heatWave':
          // Expanding ring
          const angle = Math.atan2(p.vy, p.vx);
          const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
          p.vx = Math.cos(angle) * speed * 1.02;
          p.vy = Math.sin(angle) * speed * 1.02;
          break;

        case 'ashFloat':
          // Gentle floating
          p.vx += Math.sin(p.life * 3 + p.x * 10) * 0.05;
          p.vy += 0.05 * dt; // Slow fall
          break;

        case 'eruptionBurst':
          // Explosive with gravity
          p.vy += 0.5 * dt;
          p.vx *= 0.98;
          break;
      }

      // Fade out
      const lifeRatio = p.life / p.maxLife;
      p.color[3] = lifeRatio * (p.type === 'heatWave' ? 0.3 : 1.0);
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
        case 'lavaFlow':
          color = [...VOLCANO_COLORS.magmaOrange] as [number, number, number, number];
          if (Math.random() > 0.5) {
            color = colorLerp(VOLCANO_COLORS.magmaOrange, VOLCANO_COLORS.lavaRed, Math.random());
          }
          break;

        case 'magmaSparkle':
          color = [...VOLCANO_COLORS.magmaYellow] as [number, number, number, number];
          break;

        case 'emberRise':
          color = colorLerp(VOLCANO_COLORS.emberGlow, VOLCANO_COLORS.magmaOrange, Math.random());
          vy = -Math.abs(vy) - 0.1; // Always rise
          break;

        case 'heatWave':
          color = [...VOLCANO_COLORS.heatWhite] as [number, number, number, number];
          color[3] = 0.3;
          break;

        case 'ashFloat':
          color = colorLerp(VOLCANO_COLORS.ashGray, VOLCANO_COLORS.smokeGray, Math.random());
          vy = -0.02 - Math.random() * 0.03;
          break;

        case 'eruptionBurst':
          color = colorLerp(VOLCANO_COLORS.magmaCore, VOLCANO_COLORS.magmaYellow, Math.random());
          const burstAngle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 0.6;
          const burstSpeed = vel * 3;
          vx = Math.cos(burstAngle) * burstSpeed;
          vy = Math.sin(burstAngle) * burstSpeed;
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
