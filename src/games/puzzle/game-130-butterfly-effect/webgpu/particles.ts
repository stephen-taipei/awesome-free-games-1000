/**
 * Particle System - Butterfly Effect
 * Nature / Butterfly Theme
 * Game #130
 */

import { randomRange, NATURE_COLORS } from './math';

export type ParticleType = 'butterflyWing' | 'pollen' | 'windGust' | 'sparkle' | 'leaf' | 'bloom';

export interface Particle {
  position: [number, number];
  velocity: [number, number];
  color: [number, number, number, number];
  life: number;
  maxLife: number;
  size: number;
  particleType: number;
}

const PARTICLE_TYPE_MAP: Record<ParticleType, number> = {
  butterflyWing: 0,
  pollen: 1,
  windGust: 2,
  sparkle: 3,
  leaf: 4,
  bloom: 5
};

export class ParticleSystem {
  private particles: Particle[] = [];
  private maxParticles: number = 600;

  createParticle(
    x: number,
    y: number,
    type: ParticleType,
    color?: number[]
  ): void {
    if (this.particles.length >= this.maxParticles) {
      this.particles.shift();
    }

    let particleColor: [number, number, number, number];
    let velocity: [number, number];
    let life: number;
    let size: number;

    switch (type) {
      case 'butterflyWing':
        particleColor = color
          ? [color[0], color[1], color[2], 0.9]
          : [...NATURE_COLORS.butterflyPink, 0.9] as [number, number, number, number];
        velocity = [randomRange(-0.002, 0.002), randomRange(-0.003, 0.003)];
        life = randomRange(1.5, 2.5);
        size = randomRange(0.03, 0.05);
        break;

      case 'pollen':
        particleColor = [...NATURE_COLORS.flowerGold, 0.7] as [number, number, number, number];
        velocity = [randomRange(-0.001, 0.001), randomRange(-0.002, -0.001)];
        life = randomRange(2.0, 3.5);
        size = randomRange(0.008, 0.015);
        break;

      case 'windGust':
        particleColor = [1.0, 1.0, 1.0, 0.4];
        velocity = [randomRange(0.005, 0.015), randomRange(-0.002, 0.002)];
        life = randomRange(0.8, 1.5);
        size = randomRange(0.02, 0.04);
        break;

      case 'sparkle':
        particleColor = [...NATURE_COLORS.butterflyYellow, 1.0] as [number, number, number, number];
        velocity = [randomRange(-0.003, 0.003), randomRange(-0.004, 0.002)];
        life = randomRange(0.5, 1.0);
        size = randomRange(0.01, 0.02);
        break;

      case 'leaf':
        particleColor = [...NATURE_COLORS.leafGreen, 0.8] as [number, number, number, number];
        velocity = [randomRange(-0.003, 0.003), randomRange(0.001, 0.003)];
        life = randomRange(2.5, 4.0);
        size = randomRange(0.015, 0.025);
        break;

      case 'bloom':
        particleColor = color
          ? [color[0], color[1], color[2], 0.85]
          : [...NATURE_COLORS.flowerPink, 0.85] as [number, number, number, number];
        velocity = [randomRange(-0.005, 0.005), randomRange(-0.005, 0.005)];
        life = randomRange(1.0, 1.8);
        size = randomRange(0.025, 0.04);
        break;

      default:
        particleColor = [1, 1, 1, 1];
        velocity = [0, 0];
        life = 1;
        size = 0.02;
    }

    this.particles.push({
      position: [x, y],
      velocity,
      color: particleColor,
      life,
      maxLife: life,
      size,
      particleType: PARTICLE_TYPE_MAP[type]
    });
  }

  emitBurst(
    x: number,
    y: number,
    type: ParticleType,
    count: number,
    color?: number[]
  ): void {
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const spread = randomRange(0.01, 0.04);
      this.createParticle(
        x + Math.cos(angle) * spread,
        y + Math.sin(angle) * spread,
        type,
        color
      );
    }
  }

  emitChainLine(
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    type: ParticleType,
    count: number,
    color?: number[]
  ): void {
    for (let i = 0; i < count; i++) {
      const t = i / (count - 1);
      const x = startX + (endX - startX) * t;
      const y = startY + (endY - startY) * t;
      this.createParticle(x + randomRange(-0.01, 0.01), y + randomRange(-0.01, 0.01), type, color);
    }
  }

  update(deltaTime: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= deltaTime;

      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      // Type-specific movement
      const type = p.particleType;
      if (type === 0) {
        // Butterfly wing - flutter motion
        p.velocity[0] += Math.sin(Date.now() * 0.01 + p.position[1] * 10) * 0.0001;
        p.velocity[1] += Math.cos(Date.now() * 0.008) * 0.00005;
      } else if (type === 2) {
        // Wind gust - accelerate horizontally
        p.velocity[0] *= 1.01;
      } else if (type === 4) {
        // Leaf - sway and fall
        p.velocity[0] = Math.sin(Date.now() * 0.003 + p.position[0] * 5) * 0.003;
        p.velocity[1] += 0.00002; // gravity
      }

      p.position[0] += p.velocity[0];
      p.position[1] += p.velocity[1];

      // Damping
      p.velocity[0] *= 0.99;
      p.velocity[1] *= 0.99;
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
      data[offset + 8] = p.life;
      data[offset + 9] = p.maxLife;
      data[offset + 10] = p.size;
      data[offset + 11] = p.particleType;
    }

    return data;
  }

  getParticleCount(): number {
    return this.particles.length;
  }

  clear(): void {
    this.particles = [];
  }
}
