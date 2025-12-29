/**
 * Particle System - Donkey Kong
 * Classic Arcade / Steel Girder / Construction Theme
 * Game #157
 */

import { DK_COLORS, randomRange, lerpColor } from './math';

export type ParticleType =
  | 'playerJump'
  | 'barrelSpark'
  | 'playerHit'
  | 'kongThrow'
  | 'princessSparkle'
  | 'gameOver';

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: [number, number, number, number];
  size: number;
  life: number;
  maxLife: number;
  type: number;
}

const PARTICLE_TYPE_MAP: Record<ParticleType, number> = {
  playerJump: 0,
  barrelSpark: 1,
  playerHit: 2,
  kongThrow: 3,
  princessSparkle: 4,
  gameOver: 5
};

export class ParticleSystem {
  private particles: Particle[] = [];
  private maxParticles = 1200;

  emit(type: ParticleType, x: number, y: number, options: {
    count?: number;
    isVictory?: boolean;
  } = {}) {
    const typeIndex = PARTICLE_TYPE_MAP[type];

    switch (type) {
      case 'playerJump':
        this.emitPlayerJump(x, y, typeIndex);
        break;
      case 'barrelSpark':
        this.emitBarrelSpark(x, y, typeIndex);
        break;
      case 'playerHit':
        this.emitPlayerHit(x, y, typeIndex);
        break;
      case 'kongThrow':
        this.emitKongThrow(x, y, typeIndex);
        break;
      case 'princessSparkle':
        this.emitPrincessSparkle(x, y, typeIndex);
        break;
      case 'gameOver':
        this.emitGameOver(x, y, typeIndex, options.isVictory || false);
        break;
    }
  }

  private emitPlayerJump(x: number, y: number, type: number) {
    // Dust cloud when jumping/landing
    for (let i = 0; i < 10; i++) {
      const angle = Math.PI + randomRange(-0.5, 0.5);
      const speed = randomRange(0.002, 0.006);
      this.particles.push({
        x: x + randomRange(-0.02, 0.02),
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 0.001,
        color: [...DK_COLORS.dustBrown] as [number, number, number, number],
        size: randomRange(6, 12),
        life: 0.4,
        maxLife: 0.4,
        type
      });
    }
  }

  private emitBarrelSpark(x: number, y: number, type: number) {
    // Sparks when barrel rolls
    for (let i = 0; i < 5; i++) {
      const angle = randomRange(-Math.PI * 0.3, Math.PI * 0.3);
      const speed = randomRange(0.003, 0.008);
      const color = Math.random() > 0.5
        ? DK_COLORS.sparkYellow
        : DK_COLORS.sparkOrange;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: -Math.sin(angle) * speed - 0.002,
        color: [...color] as [number, number, number, number],
        size: randomRange(3, 6),
        life: 0.3,
        maxLife: 0.3,
        type
      });
    }
  }

  private emitPlayerHit(x: number, y: number, type: number) {
    // Stars when hit
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const speed = randomRange(0.005, 0.012);
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: [...DK_COLORS.starWhite] as [number, number, number, number],
        size: randomRange(8, 14),
        life: 0.6,
        maxLife: 0.6,
        type
      });
    }

    // Explosion burst
    for (let i = 0; i < 15; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = randomRange(0.008, 0.015);
      const color = Math.random() > 0.5
        ? DK_COLORS.marioRed
        : DK_COLORS.sparkOrange;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: [...color] as [number, number, number, number],
        size: randomRange(6, 10),
        life: 0.5,
        maxLife: 0.5,
        type
      });
    }
  }

  private emitKongThrow(x: number, y: number, type: number) {
    // Kong's barrel throw effect
    for (let i = 0; i < 12; i++) {
      const angle = randomRange(0, Math.PI * 0.5);
      const speed = randomRange(0.004, 0.01);
      const color = Math.random() > 0.5
        ? DK_COLORS.kongBrown
        : DK_COLORS.barrelBrown;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed * 0.5,
        color: [...color] as [number, number, number, number],
        size: randomRange(5, 10),
        life: 0.4,
        maxLife: 0.4,
        type
      });
    }

    // Wood chips
    for (let i = 0; i < 8; i++) {
      const angle = randomRange(-0.2, 0.8);
      const speed = randomRange(0.003, 0.007);
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: [...DK_COLORS.barrelLight] as [number, number, number, number],
        size: randomRange(3, 6),
        life: 0.35,
        maxLife: 0.35,
        type
      });
    }
  }

  private emitPrincessSparkle(x: number, y: number, type: number) {
    // Princess sparkle/glow
    for (let i = 0; i < 4; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = randomRange(0.001, 0.004);
      const color = Math.random() > 0.5
        ? DK_COLORS.princessPink
        : DK_COLORS.princessGold;
      this.particles.push({
        x: x + randomRange(-0.03, 0.03),
        y: y + randomRange(-0.03, 0.03),
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 0.002,
        color: [...color] as [number, number, number, number],
        size: randomRange(4, 8),
        life: 0.5,
        maxLife: 0.5,
        type
      });
    }
  }

  private emitGameOver(x: number, y: number, type: number, isVictory: boolean) {
    const count = isVictory ? 60 : 40;

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const speed = randomRange(0.006, 0.015);

      let color: readonly [number, number, number, number];
      if (isVictory) {
        const colors = [
          DK_COLORS.princessPink,
          DK_COLORS.princessGold,
          DK_COLORS.starWhite,
          DK_COLORS.marioRed
        ];
        color = colors[Math.floor(Math.random() * colors.length)];
      } else {
        const colors = [
          DK_COLORS.sparkOrange,
          DK_COLORS.marioRed,
          DK_COLORS.barrelBrown
        ];
        color = colors[Math.floor(Math.random() * colors.length)];
      }

      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: [...color] as [number, number, number, number],
        size: randomRange(8, 15),
        life: 1.0,
        maxLife: 1.0,
        type
      });
    }

    // Central flash
    for (let i = 0; i < 15; i++) {
      this.particles.push({
        x: x + randomRange(-0.03, 0.03),
        y: y + randomRange(-0.03, 0.03),
        vx: randomRange(-0.002, 0.002),
        vy: randomRange(-0.002, 0.002),
        color: [...DK_COLORS.starWhite] as [number, number, number, number],
        size: randomRange(10, 18),
        life: 0.5,
        maxLife: 0.5,
        type
      });
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

      p.x += p.vx;
      p.y += p.vy;

      // Gravity for some types
      if (p.type === 0 || p.type === 1 || p.type === 2) {
        p.vy += 0.00008;
      }

      // Slow down
      p.vx *= 0.97;
      p.vy *= 0.97;
    }

    // Limit particles
    if (this.particles.length > this.maxParticles) {
      this.particles = this.particles.slice(-this.maxParticles);
    }
  }

  getParticles(): Particle[] {
    return this.particles;
  }

  clear() {
    this.particles = [];
  }
}
