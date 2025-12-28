/**
 * Particle System - Mini Farm
 * Farm / Nature / Pastoral Theme
 * Game #144
 */

import { randomRange, FARM_COLORS, getCropColor } from './math';

export type ParticleType =
  | 'cropGrow'      // 0 - sprouting particles when placing
  | 'harvestSparkle' // 1 - golden sparkles for valid placement
  | 'sunRay'        // 2 - ambient sunlight rays
  | 'leafFloat'     // 3 - floating leaves
  | 'pollenDrift'   // 4 - pollen in the air
  | 'seedBurst';    // 5 - burst when completing level

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
  cropGrow: 0,
  harvestSparkle: 1,
  sunRay: 2,
  leafFloat: 3,
  pollenDrift: 4,
  seedBurst: 5,
};

export class ParticleSystem {
  private particles: Particle[] = [];
  private maxParticles: number;

  constructor(maxParticles: number = 1500) {
    this.maxParticles = maxParticles;
  }

  emit(
    type: ParticleType,
    x: number,
    y: number,
    count: number,
    options: Partial<{
      color: readonly [number, number, number, number];
      sizeRange: [number, number];
      lifeRange: [number, number];
      velocityRange: [number, number, number, number];
      cropIndex: number;
    }> = {}
  ) {
    const typeIndex = PARTICLE_TYPE_MAP[type];

    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) {
        this.particles.shift();
      }

      let color = options.color || this.getDefaultColor(type, options.cropIndex);
      let size = randomRange(
        options.sizeRange?.[0] ?? 0.8,
        options.sizeRange?.[1] ?? 1.5
      );
      let life = randomRange(
        options.lifeRange?.[0] ?? 1.0,
        options.lifeRange?.[1] ?? 2.0
      );
      let vx = randomRange(
        options.velocityRange?.[0] ?? -0.02,
        options.velocityRange?.[1] ?? 0.02
      );
      let vy = randomRange(
        options.velocityRange?.[2] ?? -0.02,
        options.velocityRange?.[3] ?? 0.02
      );

      // Type-specific defaults
      switch (type) {
        case 'cropGrow':
          size = randomRange(0.6, 1.2);
          life = randomRange(0.8, 1.4);
          vx = randomRange(-0.01, 0.01);
          vy = randomRange(0.02, 0.05);
          break;
        case 'harvestSparkle':
          size = randomRange(0.4, 0.9);
          life = randomRange(0.6, 1.2);
          vx = randomRange(-0.03, 0.03);
          vy = randomRange(-0.03, 0.03);
          color = [...FARM_COLORS.goldenAmber] as [number, number, number, number];
          break;
        case 'sunRay':
          size = randomRange(1.5, 3.0);
          life = randomRange(2.0, 4.0);
          vx = randomRange(-0.002, 0.002);
          vy = randomRange(-0.01, -0.005);
          color = [1.0, 0.95, 0.7, 0.3];
          break;
        case 'leafFloat':
          size = randomRange(0.5, 1.0);
          life = randomRange(3.0, 5.0);
          vx = randomRange(-0.01, 0.02);
          vy = randomRange(-0.015, -0.005);
          color = [...FARM_COLORS.leafGreen] as [number, number, number, number];
          break;
        case 'pollenDrift':
          size = randomRange(0.2, 0.5);
          life = randomRange(2.0, 4.0);
          vx = randomRange(-0.005, 0.01);
          vy = randomRange(-0.003, 0.003);
          color = [1.0, 1.0, 0.8, 0.5];
          break;
        case 'seedBurst':
          const angle = randomRange(0, Math.PI * 2);
          const speed = randomRange(0.05, 0.12);
          size = randomRange(0.4, 0.8);
          life = randomRange(0.8, 1.5);
          vx = Math.cos(angle) * speed;
          vy = Math.sin(angle) * speed;
          break;
      }

      this.particles.push({
        position: [x + randomRange(-0.02, 0.02), y + randomRange(-0.02, 0.02)],
        velocity: [vx, vy],
        color: [...color] as [number, number, number, number],
        size,
        life,
        maxLife: life,
        particleType: typeIndex,
      });
    }
  }

  private getDefaultColor(type: ParticleType, cropIndex?: number): readonly [number, number, number, number] {
    if (cropIndex !== undefined && (type === 'cropGrow' || type === 'seedBurst')) {
      return getCropColor(cropIndex);
    }

    switch (type) {
      case 'cropGrow':
        return FARM_COLORS.grassGreen;
      case 'harvestSparkle':
        return FARM_COLORS.goldenAmber;
      case 'sunRay':
        return [1.0, 0.95, 0.7, 0.3];
      case 'leafFloat':
        return FARM_COLORS.leafGreen;
      case 'pollenDrift':
        return [1.0, 1.0, 0.8, 0.5];
      case 'seedBurst':
        return FARM_COLORS.sunYellow;
      default:
        return FARM_COLORS.grassGreen;
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

      const type = p.particleType;

      // Type-specific physics
      if (type === 3) { // leafFloat - swaying motion
        p.velocity[0] += Math.sin(p.life * 5) * 0.0005;
        p.velocity[1] *= 0.998;
      } else if (type === 4) { // pollenDrift - gentle drift
        p.velocity[0] += Math.sin(p.life * 3) * 0.0002;
        p.velocity[1] += Math.cos(p.life * 2) * 0.0001;
      } else if (type === 0) { // cropGrow - upward with deceleration
        p.velocity[1] *= 0.98;
      } else if (type === 5) { // seedBurst - gravity
        p.velocity[1] -= 0.002;
      }

      p.position[0] += p.velocity[0] * deltaTime;
      p.position[1] += p.velocity[1] * deltaTime;

      // Fade out
      const lifeRatio = p.life / p.maxLife;
      p.color[3] = Math.min(p.color[3], lifeRatio);
    }
  }

  getParticleData(): Float32Array {
    const data = new Float32Array(this.particles.length * 12);

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      const offset = i * 12;

      data[offset + 0] = p.position[0];
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
