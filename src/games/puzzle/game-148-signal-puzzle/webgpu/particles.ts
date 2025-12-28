/**
 * Particle System - Signal Puzzle
 * Radio / Telecommunications / Electromagnetic Theme
 * Game #148
 */

import { SIGNAL_COLORS, randomRange, easeOutCubic } from './math';

export type ParticleType =
  | 'signalWave'
  | 'dataPulse'
  | 'electromagneticBurst'
  | 'radioStatic'
  | 'frequencyRipple'
  | 'transmissionGlow';

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
  signalWave: 0,
  dataPulse: 1,
  electromagneticBurst: 2,
  radioStatic: 3,
  frequencyRipple: 4,
  transmissionGlow: 5,
};

export class ParticleSystem {
  private particles: Particle[] = [];
  private maxParticles: number;

  constructor(maxParticles: number = 600) {
    this.maxParticles = maxParticles;
  }

  emit(
    x: number,
    y: number,
    type: ParticleType,
    count: number = 1,
    options: Partial<{
      speed: number;
      size: number;
      life: number;
      spread: number;
      color: readonly [number, number, number, number];
      direction: number;
    }> = {}
  ) {
    const {
      speed = 0.02,
      size = 15,
      life = 1.0,
      spread = Math.PI * 2,
      color,
      direction,
    } = options;

    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) {
        this.particles.shift();
      }

      const baseAngle = direction !== undefined ? direction : Math.random() * Math.PI * 2;
      const angle = baseAngle + (Math.random() - 0.5) * spread;
      const spd = speed * (0.5 + Math.random() * 0.5);

      let particleColor: [number, number, number, number];
      if (color) {
        particleColor = [...color] as [number, number, number, number];
      } else {
        particleColor = this.getDefaultColor(type);
      }

      this.particles.push({
        position: [x + (Math.random() - 0.5) * 0.02, y + (Math.random() - 0.5) * 0.02],
        velocity: [Math.cos(angle) * spd, Math.sin(angle) * spd],
        color: particleColor,
        size: size * (0.7 + Math.random() * 0.6),
        life: life * (0.8 + Math.random() * 0.4),
        maxLife: life * (0.8 + Math.random() * 0.4),
        particleType: PARTICLE_TYPE_MAP[type],
      });
    }
  }

  private getDefaultColor(type: ParticleType): [number, number, number, number] {
    switch (type) {
      case 'signalWave':
        return [...SIGNAL_COLORS.signalCyan] as [number, number, number, number];
      case 'dataPulse':
        return [...SIGNAL_COLORS.dataStream] as [number, number, number, number];
      case 'electromagneticBurst':
        return [...SIGNAL_COLORS.powerYellow] as [number, number, number, number];
      case 'radioStatic':
        return [...SIGNAL_COLORS.staticWhite] as [number, number, number, number];
      case 'frequencyRipple':
        return [...SIGNAL_COLORS.radioWave] as [number, number, number, number];
      case 'transmissionGlow':
        return [...SIGNAL_COLORS.signalTeal] as [number, number, number, number];
    }
  }

  update(deltaTime: number) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];

      // Update position
      p.position[0] += p.velocity[0] * deltaTime;
      p.position[1] += p.velocity[1] * deltaTime;

      // Type-specific behavior
      const pType = p.particleType;

      if (pType === 0) { // signalWave - expand outward
        p.velocity[0] *= 1.01;
        p.velocity[1] *= 1.01;
      } else if (pType === 1) { // dataPulse - maintain direction
        // Keep constant speed
      } else if (pType === 2) { // electromagneticBurst - decelerate
        p.velocity[0] *= 0.95;
        p.velocity[1] *= 0.95;
      } else if (pType === 3) { // radioStatic - jitter
        p.velocity[0] += (Math.random() - 0.5) * 0.005;
        p.velocity[1] += (Math.random() - 0.5) * 0.005;
      } else if (pType === 4) { // frequencyRipple - expand slowly
        p.velocity[0] *= 0.98;
        p.velocity[1] *= 0.98;
      } else if (pType === 5) { // transmissionGlow - gentle float
        p.velocity[1] -= 0.0002; // Float up slightly
      }

      // Update life
      p.life -= deltaTime;

      // Fade out
      const lifeRatio = p.life / p.maxLife;
      p.color[3] = easeOutCubic(lifeRatio) * (pType === 3 ? 0.6 : 1.0);

      // Remove dead particles
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  getParticleData(): Float32Array {
    const data = new Float32Array(this.maxParticles * 12);

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      const offset = i * 12;

      data[offset] = p.position[0];
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
