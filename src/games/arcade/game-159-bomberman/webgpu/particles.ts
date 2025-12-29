/**
 * Particle System - Bomberman
 * Classic Arcade / Explosive / Orange-Red Fire Theme
 * Game #159
 */

import { BOMBER_COLORS, randomRange, lerpColor } from './math';

export type ParticleType =
  | 'bombPlace'
  | 'explosion'
  | 'brickDestroy'
  | 'playerHit'
  | 'powerUp'
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
  bombPlace: 0,
  explosion: 1,
  brickDestroy: 2,
  playerHit: 3,
  powerUp: 4,
  gameOver: 5
};

export class ParticleSystem {
  private particles: Particle[] = [];
  private maxParticles = 1500;

  emit(type: ParticleType, x: number, y: number, options: {
    power?: number;
    powerUpType?: 'bomb' | 'power' | 'speed';
    isVictory?: boolean;
  } = {}) {
    const typeIndex = PARTICLE_TYPE_MAP[type];

    switch (type) {
      case 'bombPlace':
        this.emitBombPlace(x, y, typeIndex);
        break;
      case 'explosion':
        this.emitExplosion(x, y, typeIndex, options.power || 1);
        break;
      case 'brickDestroy':
        this.emitBrickDestroy(x, y, typeIndex);
        break;
      case 'playerHit':
        this.emitPlayerHit(x, y, typeIndex);
        break;
      case 'powerUp':
        this.emitPowerUp(x, y, typeIndex, options.powerUpType || 'bomb');
        break;
      case 'gameOver':
        this.emitGameOver(x, y, typeIndex, options.isVictory || false);
        break;
    }
  }

  private emitBombPlace(x: number, y: number, type: number) {
    // Smoke puff
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const speed = randomRange(0.002, 0.005);
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 0.002,
        color: [...BOMBER_COLORS.smokeGray] as [number, number, number, number],
        size: randomRange(6, 10),
        life: 0.3,
        maxLife: 0.3,
        type
      });
    }

    // Fuse sparks
    for (let i = 0; i < 5; i++) {
      this.particles.push({
        x, y: y - 0.02,
        vx: randomRange(-0.003, 0.003),
        vy: randomRange(-0.008, -0.003),
        color: [...BOMBER_COLORS.bombSpark] as [number, number, number, number],
        size: randomRange(3, 5),
        life: 0.2,
        maxLife: 0.2,
        type
      });
    }
  }

  private emitExplosion(x: number, y: number, type: number, power: number) {
    const baseCount = 20 + power * 5;

    // Main explosion
    for (let i = 0; i < baseCount; i++) {
      const angle = (i / baseCount) * Math.PI * 2;
      const speed = randomRange(0.008, 0.02);
      const colors = [
        BOMBER_COLORS.explosionOrange,
        BOMBER_COLORS.explosionYellow,
        BOMBER_COLORS.explosionRed,
        BOMBER_COLORS.explosionWhite
      ];
      const color = colors[Math.floor(Math.random() * colors.length)];

      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: [...color] as [number, number, number, number],
        size: randomRange(10, 18),
        life: 0.5,
        maxLife: 0.5,
        type
      });
    }

    // Smoke
    for (let i = 0; i < 12; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = randomRange(0.003, 0.008);
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 0.004,
        color: [...BOMBER_COLORS.smokeGray] as [number, number, number, number],
        size: randomRange(12, 20),
        life: 0.7,
        maxLife: 0.7,
        type: 0 // smoke type
      });
    }

    // Sparks
    for (let i = 0; i < 15; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = randomRange(0.015, 0.025);
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: [...BOMBER_COLORS.sparkYellow] as [number, number, number, number],
        size: randomRange(3, 6),
        life: 0.4,
        maxLife: 0.4,
        type
      });
    }
  }

  private emitBrickDestroy(x: number, y: number, type: number) {
    // Brick chunks
    for (let i = 0; i < 10; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = randomRange(0.008, 0.015);
      const color = Math.random() > 0.5
        ? BOMBER_COLORS.brickBrown
        : BOMBER_COLORS.brickDebris;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: [...color] as [number, number, number, number],
        size: randomRange(5, 10),
        life: 0.5,
        maxLife: 0.5,
        type
      });
    }

    // Dust
    for (let i = 0; i < 8; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = randomRange(0.003, 0.006);
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 0.002,
        color: [...BOMBER_COLORS.brickDust] as [number, number, number, number],
        size: randomRange(8, 14),
        life: 0.6,
        maxLife: 0.6,
        type: 0
      });
    }
  }

  private emitPlayerHit(x: number, y: number, type: number) {
    // Impact ring
    for (let i = 0; i < 20; i++) {
      const angle = (i / 20) * Math.PI * 2;
      const speed = randomRange(0.01, 0.018);
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: [...BOMBER_COLORS.playerWhite] as [number, number, number, number],
        size: randomRange(6, 12),
        life: 0.4,
        maxLife: 0.4,
        type
      });
    }

    // Fire burst
    for (let i = 0; i < 12; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = randomRange(0.005, 0.012);
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: [...BOMBER_COLORS.explosionOrange] as [number, number, number, number],
        size: randomRange(8, 14),
        life: 0.35,
        maxLife: 0.35,
        type: 1
      });
    }
  }

  private emitPowerUp(x: number, y: number, type: number, powerType: 'bomb' | 'power' | 'speed') {
    const colorMap = {
      bomb: BOMBER_COLORS.powerBomb,
      power: BOMBER_COLORS.powerFlame,
      speed: BOMBER_COLORS.powerSpeed
    };
    const color = colorMap[powerType];

    // Sparkle burst
    for (let i = 0; i < 15; i++) {
      const angle = (i / 15) * Math.PI * 2;
      const speed = randomRange(0.006, 0.012);
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: [...color] as [number, number, number, number],
        size: randomRange(5, 10),
        life: 0.4,
        maxLife: 0.4,
        type
      });
    }

    // Rising sparkles
    for (let i = 0; i < 8; i++) {
      this.particles.push({
        x: x + randomRange(-0.02, 0.02),
        y,
        vx: randomRange(-0.002, 0.002),
        vy: randomRange(-0.01, -0.005),
        color: [...BOMBER_COLORS.sparkYellow] as [number, number, number, number],
        size: randomRange(4, 7),
        life: 0.5,
        maxLife: 0.5,
        type
      });
    }
  }

  private emitGameOver(x: number, y: number, type: number, isVictory: boolean) {
    const count = isVictory ? 50 : 35;

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const speed = randomRange(0.01, 0.02);

      let color: readonly [number, number, number, number];
      if (isVictory) {
        const colors = [
          BOMBER_COLORS.sparkYellow,
          BOMBER_COLORS.playerWhite,
          BOMBER_COLORS.powerBomb
        ];
        color = colors[Math.floor(Math.random() * colors.length)];
      } else {
        const colors = [
          BOMBER_COLORS.explosionOrange,
          BOMBER_COLORS.explosionRed,
          BOMBER_COLORS.smokeGray
        ];
        color = colors[Math.floor(Math.random() * colors.length)];
      }

      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: [...color] as [number, number, number, number],
        size: randomRange(8, 16),
        life: 1.0,
        maxLife: 1.0,
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

      // Gravity for debris
      if (p.type === 2) {
        p.vy += 0.0002;
      }

      // Slow down
      p.vx *= 0.96;
      p.vy *= 0.96;
    }

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
