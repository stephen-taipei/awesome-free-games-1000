/**
 * Particle System - Battle City
 * Military / Tank Warfare / Olive Green Theme
 * Game #158
 */

import { BATTLE_COLORS, randomRange, lerpColor } from './math';

export type ParticleType =
  | 'muzzleFlash'
  | 'tankExplosion'
  | 'playerHit'
  | 'brickDebris'
  | 'smoke'
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
  muzzleFlash: 0,
  tankExplosion: 1,
  playerHit: 2,
  brickDebris: 3,
  smoke: 4,
  gameOver: 5
};

export class ParticleSystem {
  private particles: Particle[] = [];
  private maxParticles = 1500;

  emit(type: ParticleType, x: number, y: number, options: {
    direction?: 'up' | 'down' | 'left' | 'right';
    tankType?: string;
    isVictory?: boolean;
  } = {}) {
    const typeIndex = PARTICLE_TYPE_MAP[type];

    switch (type) {
      case 'muzzleFlash':
        this.emitMuzzleFlash(x, y, typeIndex, options.direction || 'up');
        break;
      case 'tankExplosion':
        this.emitTankExplosion(x, y, typeIndex, options.tankType);
        break;
      case 'playerHit':
        this.emitPlayerHit(x, y, typeIndex);
        break;
      case 'brickDebris':
        this.emitBrickDebris(x, y, typeIndex);
        break;
      case 'smoke':
        this.emitSmoke(x, y, typeIndex);
        break;
      case 'gameOver':
        this.emitGameOver(x, y, typeIndex, options.isVictory || false);
        break;
    }
  }

  private emitMuzzleFlash(x: number, y: number, type: number, direction: string) {
    let dx = 0, dy = 0;
    switch (direction) {
      case 'up': dy = -1; break;
      case 'down': dy = 1; break;
      case 'left': dx = -1; break;
      case 'right': dx = 1; break;
    }

    // Flash
    for (let i = 0; i < 8; i++) {
      const spread = randomRange(-0.3, 0.3);
      const speed = randomRange(0.004, 0.01);
      this.particles.push({
        x, y,
        vx: dx * speed + (dy !== 0 ? spread * speed : 0),
        vy: dy * speed + (dx !== 0 ? spread * speed : 0),
        color: [...BATTLE_COLORS.muzzleFlash] as [number, number, number, number],
        size: randomRange(5, 10),
        life: 0.15,
        maxLife: 0.15,
        type
      });
    }

    // Bullet trail
    for (let i = 0; i < 5; i++) {
      this.particles.push({
        x: x + dx * 0.02 * i,
        y: y + dy * 0.02 * i,
        vx: dx * 0.008,
        vy: dy * 0.008,
        color: [...BATTLE_COLORS.bulletTrail] as [number, number, number, number],
        size: randomRange(3, 5),
        life: 0.1,
        maxLife: 0.1,
        type
      });
    }
  }

  private emitTankExplosion(x: number, y: number, type: number, tankType?: string) {
    // Main explosion
    for (let i = 0; i < 25; i++) {
      const angle = (i / 25) * Math.PI * 2;
      const speed = randomRange(0.005, 0.015);
      const color = Math.random() > 0.5
        ? BATTLE_COLORS.explosionOrange
        : BATTLE_COLORS.explosionYellow;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: [...color] as [number, number, number, number],
        size: randomRange(8, 14),
        life: 0.5,
        maxLife: 0.5,
        type
      });
    }

    // Smoke
    for (let i = 0; i < 15; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = randomRange(0.002, 0.006);
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 0.003,
        color: [...BATTLE_COLORS.smokeGray] as [number, number, number, number],
        size: randomRange(10, 18),
        life: 0.8,
        maxLife: 0.8,
        type: 4 // smoke type
      });
    }

    // Debris
    for (let i = 0; i < 10; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = randomRange(0.008, 0.015);
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: [...BATTLE_COLORS.enemyGray] as [number, number, number, number],
        size: randomRange(4, 8),
        life: 0.6,
        maxLife: 0.6,
        type: 3 // debris type
      });
    }
  }

  private emitPlayerHit(x: number, y: number, type: number) {
    // Impact ring
    for (let i = 0; i < 20; i++) {
      const angle = (i / 20) * Math.PI * 2;
      const speed = randomRange(0.008, 0.015);
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: [...BATTLE_COLORS.playerGreen] as [number, number, number, number],
        size: randomRange(6, 12),
        life: 0.5,
        maxLife: 0.5,
        type
      });
    }

    // Flash
    for (let i = 0; i < 10; i++) {
      this.particles.push({
        x: x + randomRange(-0.02, 0.02),
        y: y + randomRange(-0.02, 0.02),
        vx: randomRange(-0.003, 0.003),
        vy: randomRange(-0.003, 0.003),
        color: [...BATTLE_COLORS.explosionYellow] as [number, number, number, number],
        size: randomRange(8, 14),
        life: 0.3,
        maxLife: 0.3,
        type
      });
    }
  }

  private emitBrickDebris(x: number, y: number, type: number) {
    // Brick chunks
    for (let i = 0; i < 8; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = randomRange(0.005, 0.012);
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: [...BATTLE_COLORS.brickBrown] as [number, number, number, number],
        size: randomRange(4, 8),
        life: 0.4,
        maxLife: 0.4,
        type
      });
    }

    // Dust
    for (let i = 0; i < 6; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = randomRange(0.002, 0.005);
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 0.002,
        color: [...BATTLE_COLORS.debrisBrown] as [number, number, number, number],
        size: randomRange(6, 10),
        life: 0.5,
        maxLife: 0.5,
        type: 4
      });
    }
  }

  private emitSmoke(x: number, y: number, type: number) {
    for (let i = 0; i < 5; i++) {
      this.particles.push({
        x: x + randomRange(-0.01, 0.01),
        y: y + randomRange(-0.01, 0.01),
        vx: randomRange(-0.001, 0.001),
        vy: randomRange(-0.004, -0.001),
        color: [...BATTLE_COLORS.smokeGray] as [number, number, number, number],
        size: randomRange(8, 14),
        life: 0.6,
        maxLife: 0.6,
        type
      });
    }
  }

  private emitGameOver(x: number, y: number, type: number, isVictory: boolean) {
    const count = isVictory ? 60 : 40;

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const speed = randomRange(0.008, 0.018);

      let color: readonly [number, number, number, number];
      if (isVictory) {
        const colors = [
          BATTLE_COLORS.playerGreen,
          BATTLE_COLORS.baseGold,
          BATTLE_COLORS.muzzleFlash
        ];
        color = colors[Math.floor(Math.random() * colors.length)];
      } else {
        const colors = [
          BATTLE_COLORS.explosionOrange,
          BATTLE_COLORS.explosionYellow,
          BATTLE_COLORS.enemyPower
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
      if (p.type === 3) {
        p.vy += 0.0001;
      }

      // Slow down
      p.vx *= 0.97;
      p.vy *= 0.97;
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
