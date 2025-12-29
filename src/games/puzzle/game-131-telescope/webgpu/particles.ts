/**
 * Particle System - Telescope
 * Astronomy / Night Sky Theme
 * Game #131
 */

import { randomRange, ASTRO_COLORS } from './math';

export type ParticleType = 'star' | 'nebula' | 'comet' | 'lens' | 'discovery' | 'cosmic';

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
  star: 0,
  nebula: 1,
  comet: 2,
  lens: 3,
  discovery: 4,
  cosmic: 5
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
      case 'star':
        particleColor = color
          ? [color[0], color[1], color[2], 1.0]
          : [...ASTRO_COLORS.starWhite, 1.0] as [number, number, number, number];
        velocity = [randomRange(-0.0005, 0.0005), randomRange(-0.0005, 0.0005)];
        life = randomRange(2.0, 4.0);
        size = randomRange(0.01, 0.02);
        break;

      case 'nebula':
        const nebulaColors = [ASTRO_COLORS.nebulaPurple, ASTRO_COLORS.nebulaPink, ASTRO_COLORS.nebulaBlue];
        const nebulaColor = nebulaColors[Math.floor(Math.random() * nebulaColors.length)];
        particleColor = [...nebulaColor, 0.4] as [number, number, number, number];
        velocity = [randomRange(-0.001, 0.001), randomRange(-0.001, 0.001)];
        life = randomRange(3.0, 5.0);
        size = randomRange(0.04, 0.08);
        break;

      case 'comet':
        particleColor = [...ASTRO_COLORS.cometTail, 0.8] as [number, number, number, number];
        velocity = [randomRange(0.01, 0.02), randomRange(-0.005, 0.005)];
        life = randomRange(1.0, 2.0);
        size = randomRange(0.015, 0.025);
        break;

      case 'lens':
        particleColor = [...ASTRO_COLORS.lensFlare, 0.6] as [number, number, number, number];
        velocity = [0, 0];
        life = randomRange(0.5, 1.0);
        size = randomRange(0.03, 0.05);
        break;

      case 'discovery':
        particleColor = [...ASTRO_COLORS.starGold, 1.0] as [number, number, number, number];
        velocity = [randomRange(-0.01, 0.01), randomRange(-0.01, 0.01)];
        life = randomRange(1.0, 1.5);
        size = randomRange(0.025, 0.04);
        break;

      case 'cosmic':
        particleColor = [...ASTRO_COLORS.starBlue, 0.5] as [number, number, number, number];
        velocity = [randomRange(-0.0005, 0.0005), randomRange(-0.001, -0.0005)];
        life = randomRange(3.0, 6.0);
        size = randomRange(0.005, 0.01);
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
      const spread = randomRange(0.01, 0.05);
      this.createParticle(
        x + Math.cos(angle) * spread,
        y + Math.sin(angle) * spread,
        type,
        color
      );
    }
  }

  emitRing(
    x: number,
    y: number,
    radius: number,
    type: ParticleType,
    count: number,
    color?: number[]
  ): void {
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      this.createParticle(
        x + Math.cos(angle) * radius,
        y + Math.sin(angle) * radius,
        type,
        color
      );
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
      if (type === 2) {
        // Comet - accelerate and fade
        p.velocity[0] *= 1.02;
      } else if (type === 4) {
        // Discovery - decelerate
        p.velocity[0] *= 0.95;
        p.velocity[1] *= 0.95;
      } else if (type === 5) {
        // Cosmic - drift slowly
        p.velocity[0] += Math.sin(Date.now() * 0.001) * 0.00001;
      }

      p.position[0] += p.velocity[0];
      p.position[1] += p.velocity[1];

      // Damping
      p.velocity[0] *= 0.995;
      p.velocity[1] *= 0.995;
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
