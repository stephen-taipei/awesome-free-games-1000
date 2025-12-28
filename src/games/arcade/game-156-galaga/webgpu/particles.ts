/**
 * Particle System - Galaga
 * Retro Arcade / Neon Space / Classic Galaga Theme
 * Game #156
 */

import { GALAGA_COLORS, randomRange, lerpColor, easeOutQuad, normalize2D } from './math';

export type ParticleType =
  | 'playerShoot'
  | 'enemyDeath'
  | 'playerHit'
  | 'divingTrail'
  | 'bulletTrail'
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
  playerShoot: 0,
  enemyDeath: 1,
  playerHit: 2,
  divingTrail: 3,
  bulletTrail: 4,
  gameOver: 5
};

export class ParticleSystem {
  private particles: Particle[] = [];
  private maxParticles = 1500;

  emit(type: ParticleType, x: number, y: number, options: {
    count?: number;
    enemyType?: number;
    isEnemy?: boolean;
    isVictory?: boolean;
  } = {}) {
    const typeIndex = PARTICLE_TYPE_MAP[type];

    switch (type) {
      case 'playerShoot':
        this.emitPlayerShoot(x, y, typeIndex);
        break;
      case 'enemyDeath':
        this.emitEnemyDeath(x, y, typeIndex, options.enemyType || 0);
        break;
      case 'playerHit':
        this.emitPlayerHit(x, y, typeIndex);
        break;
      case 'divingTrail':
        this.emitDivingTrail(x, y, typeIndex);
        break;
      case 'bulletTrail':
        this.emitBulletTrail(x, y, typeIndex, options.isEnemy || false);
        break;
      case 'gameOver':
        this.emitGameOver(x, y, typeIndex, options.isVictory || false);
        break;
    }
  }

  private emitPlayerShoot(x: number, y: number, type: number) {
    // Muzzle flash
    for (let i = 0; i < 8; i++) {
      const angle = randomRange(-0.5, 0.5);
      const speed = randomRange(0.002, 0.006);
      this.particles.push({
        x, y,
        vx: Math.sin(angle) * speed,
        vy: -Math.cos(angle) * speed - 0.003,
        color: [...GALAGA_COLORS.playerBullet] as [number, number, number, number],
        size: randomRange(3, 6),
        life: 0.2,
        maxLife: 0.2,
        type
      });
    }

    // Core flash
    for (let i = 0; i < 4; i++) {
      this.particles.push({
        x, y,
        vx: randomRange(-0.001, 0.001),
        vy: randomRange(-0.004, -0.001),
        color: [...GALAGA_COLORS.explosionWhite] as [number, number, number, number],
        size: randomRange(4, 8),
        life: 0.15,
        maxLife: 0.15,
        type
      });
    }
  }

  private emitEnemyDeath(x: number, y: number, type: number, enemyType: number) {
    // Determine color based on enemy type
    const primaryColor = enemyType === 1
      ? GALAGA_COLORS.bossRed
      : GALAGA_COLORS.enemyCyan;
    const secondaryColor = enemyType === 1
      ? GALAGA_COLORS.bossYellow
      : GALAGA_COLORS.enemyBlue;

    // Main explosion
    for (let i = 0; i < 25; i++) {
      const angle = (i / 25) * Math.PI * 2;
      const speed = randomRange(0.004, 0.012);
      const color = Math.random() > 0.5 ? primaryColor : secondaryColor;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: [...color] as [number, number, number, number],
        size: randomRange(6, 12),
        life: 0.5,
        maxLife: 0.5,
        type
      });
    }

    // Core explosion
    for (let i = 0; i < 12; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = randomRange(0.002, 0.006);
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: [...GALAGA_COLORS.explosionCore] as [number, number, number, number],
        size: randomRange(8, 14),
        life: 0.4,
        maxLife: 0.4,
        type
      });
    }

    // White flash
    for (let i = 0; i < 6; i++) {
      this.particles.push({
        x: x + randomRange(-0.02, 0.02),
        y: y + randomRange(-0.02, 0.02),
        vx: randomRange(-0.002, 0.002),
        vy: randomRange(-0.002, 0.002),
        color: [...GALAGA_COLORS.explosionWhite] as [number, number, number, number],
        size: randomRange(10, 16),
        life: 0.25,
        maxLife: 0.25,
        type
      });
    }
  }

  private emitPlayerHit(x: number, y: number, type: number) {
    // Large explosion ring
    for (let i = 0; i < 40; i++) {
      const angle = (i / 40) * Math.PI * 2;
      const speed = randomRange(0.006, 0.015);
      const color = Math.random() > 0.5
        ? GALAGA_COLORS.playerGreen
        : GALAGA_COLORS.engineOrange;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: [...color] as [number, number, number, number],
        size: randomRange(8, 15),
        life: 0.7,
        maxLife: 0.7,
        type
      });
    }

    // Core flash
    for (let i = 0; i < 15; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = randomRange(0.003, 0.008);
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: [...GALAGA_COLORS.explosionWhite] as [number, number, number, number],
        size: randomRange(10, 18),
        life: 0.5,
        maxLife: 0.5,
        type
      });
    }

    // Debris
    for (let i = 0; i < 20; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = randomRange(0.004, 0.01);
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: [...GALAGA_COLORS.playerCyan] as [number, number, number, number],
        size: randomRange(4, 8),
        life: 0.8,
        maxLife: 0.8,
        type
      });
    }
  }

  private emitDivingTrail(x: number, y: number, type: number) {
    // Trail particles
    for (let i = 0; i < 3; i++) {
      const color = Math.random() > 0.5
        ? GALAGA_COLORS.diveTrailRed
        : GALAGA_COLORS.diveTrailOrange;
      this.particles.push({
        x: x + randomRange(-0.01, 0.01),
        y: y + randomRange(-0.005, 0.005),
        vx: randomRange(-0.001, 0.001),
        vy: randomRange(-0.003, 0.001),
        color: [...color] as [number, number, number, number],
        size: randomRange(4, 8),
        life: 0.3,
        maxLife: 0.3,
        type
      });
    }
  }

  private emitBulletTrail(x: number, y: number, type: number, isEnemy: boolean) {
    const color = isEnemy
      ? GALAGA_COLORS.enemyBullet
      : GALAGA_COLORS.playerBullet;

    for (let i = 0; i < 2; i++) {
      this.particles.push({
        x: x + randomRange(-0.005, 0.005),
        y,
        vx: randomRange(-0.001, 0.001),
        vy: isEnemy ? randomRange(-0.002, 0) : randomRange(0, 0.002),
        color: [...color] as [number, number, number, number],
        size: randomRange(2, 4),
        life: 0.15,
        maxLife: 0.15,
        type
      });
    }
  }

  private emitGameOver(x: number, y: number, type: number, isVictory: boolean) {
    const count = isVictory ? 80 : 60;

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const speed = randomRange(0.008, 0.02);
      const delay = Math.random() * 0.3;

      let color: readonly [number, number, number, number];
      if (isVictory) {
        const colors = [
          GALAGA_COLORS.playerGreen,
          GALAGA_COLORS.playerCyan,
          GALAGA_COLORS.playerBullet,
          GALAGA_COLORS.explosionWhite
        ];
        color = colors[Math.floor(Math.random() * colors.length)];
      } else {
        const colors = [
          GALAGA_COLORS.bossRed,
          GALAGA_COLORS.explosionOuter,
          GALAGA_COLORS.explosionCore
        ];
        color = colors[Math.floor(Math.random() * colors.length)];
      }

      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed * (1 + delay),
        vy: Math.sin(angle) * speed * (1 + delay),
        color: [...color] as [number, number, number, number],
        size: randomRange(8, 16),
        life: 1.2,
        maxLife: 1.2,
        type
      });
    }

    // Central flash
    for (let i = 0; i < 20; i++) {
      this.particles.push({
        x: x + randomRange(-0.05, 0.05),
        y: y + randomRange(-0.05, 0.05),
        vx: randomRange(-0.003, 0.003),
        vy: randomRange(-0.003, 0.003),
        color: [...GALAGA_COLORS.explosionWhite] as [number, number, number, number],
        size: randomRange(12, 20),
        life: 0.6,
        maxLife: 0.6,
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

      // Slight gravity for some types
      if (p.type === 1 || p.type === 2) {
        p.vy += 0.00005;
      }

      // Slow down
      p.vx *= 0.98;
      p.vy *= 0.98;
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
