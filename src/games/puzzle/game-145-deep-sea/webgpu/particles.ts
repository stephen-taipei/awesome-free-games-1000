/**
 * Particle System - Deep Sea
 * Deep Ocean / Bioluminescent / Abyssal Theme
 * Game #145
 */

import { randomRange, OCEAN_COLORS, randomBiolumColor } from './math';

export type ParticleType =
  | 'bubbleRise'      // 0 - rising bubbles
  | 'treasureSparkle' // 1 - treasure collection sparkle
  | 'oxygenBurst'     // 2 - oxygen tank pickup
  | 'depthPressure'   // 3 - pressure wave effect
  | 'bioluminescent'  // 4 - ambient bioluminescence
  | 'dangerFlash';    // 5 - shark danger flash

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
  bubbleRise: 0,
  treasureSparkle: 1,
  oxygenBurst: 2,
  depthPressure: 3,
  bioluminescent: 4,
  dangerFlash: 5,
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
    }> = {}
  ) {
    const typeIndex = PARTICLE_TYPE_MAP[type];

    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) {
        this.particles.shift();
      }

      let color = options.color || this.getDefaultColor(type);
      let size = randomRange(
        options.sizeRange?.[0] ?? 0.5,
        options.sizeRange?.[1] ?? 1.2
      );
      let life = randomRange(
        options.lifeRange?.[0] ?? 1.0,
        options.lifeRange?.[1] ?? 2.0
      );
      let vx = randomRange(
        options.velocityRange?.[0] ?? -0.01,
        options.velocityRange?.[1] ?? 0.01
      );
      let vy = randomRange(
        options.velocityRange?.[2] ?? -0.01,
        options.velocityRange?.[3] ?? 0.01
      );

      // Type-specific defaults
      switch (type) {
        case 'bubbleRise':
          size = randomRange(0.3, 0.8);
          life = randomRange(2.0, 4.0);
          vx = randomRange(-0.005, 0.005);
          vy = randomRange(0.02, 0.04);
          color = [0.4, 0.8, 1.0, 0.5];
          break;
        case 'treasureSparkle':
          size = randomRange(0.4, 0.9);
          life = randomRange(0.6, 1.2);
          const tAngle = randomRange(0, Math.PI * 2);
          const tSpeed = randomRange(0.02, 0.05);
          vx = Math.cos(tAngle) * tSpeed;
          vy = Math.sin(tAngle) * tSpeed;
          color = [...OCEAN_COLORS.treasureGold] as [number, number, number, number];
          break;
        case 'oxygenBurst':
          size = randomRange(0.6, 1.2);
          life = randomRange(0.8, 1.5);
          const oAngle = randomRange(0, Math.PI * 2);
          const oSpeed = randomRange(0.03, 0.06);
          vx = Math.cos(oAngle) * oSpeed;
          vy = Math.sin(oAngle) * oSpeed;
          color = [...OCEAN_COLORS.oxygenBlue] as [number, number, number, number];
          break;
        case 'depthPressure':
          size = randomRange(1.5, 2.5);
          life = randomRange(1.0, 2.0);
          vx = randomRange(-0.002, 0.002);
          vy = randomRange(-0.002, 0.002);
          color = [0.15, 0.25, 0.45, 0.3];
          break;
        case 'bioluminescent':
          size = randomRange(0.4, 1.0);
          life = randomRange(3.0, 6.0);
          vx = randomRange(-0.003, 0.003);
          vy = randomRange(-0.005, 0.005);
          color = [...randomBiolumColor()] as [number, number, number, number];
          color[3] = 0.6;
          break;
        case 'dangerFlash':
          size = randomRange(0.8, 1.5);
          life = randomRange(0.5, 1.0);
          const dAngle = randomRange(0, Math.PI * 2);
          const dSpeed = randomRange(0.02, 0.04);
          vx = Math.cos(dAngle) * dSpeed;
          vy = Math.sin(dAngle) * dSpeed;
          color = [...OCEAN_COLORS.dangerRed] as [number, number, number, number];
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

  private getDefaultColor(type: ParticleType): readonly [number, number, number, number] {
    switch (type) {
      case 'bubbleRise':
        return [0.4, 0.8, 1.0, 0.5];
      case 'treasureSparkle':
        return OCEAN_COLORS.treasureGold;
      case 'oxygenBurst':
        return OCEAN_COLORS.oxygenBlue;
      case 'depthPressure':
        return [0.15, 0.25, 0.45, 0.3];
      case 'bioluminescent':
        return OCEAN_COLORS.biolumCyan;
      case 'dangerFlash':
        return OCEAN_COLORS.dangerRed;
      default:
        return OCEAN_COLORS.lightBlue;
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
      if (type === 0) { // bubbleRise - wobble while rising
        p.velocity[0] += Math.sin(p.life * 8) * 0.0003;
        p.velocity[1] *= 0.995;
      } else if (type === 4) { // bioluminescent - gentle drift
        p.velocity[0] += Math.sin(p.life * 2) * 0.0001;
        p.velocity[1] += Math.cos(p.life * 1.5) * 0.0001;
      } else if (type === 1 || type === 2) { // sparkle/burst - slow down
        p.velocity[0] *= 0.96;
        p.velocity[1] *= 0.96;
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
