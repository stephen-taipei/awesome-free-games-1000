/**
 * Particle System - Space Invaders
 * Retro CRT / Neon Green / Space Arcade Theme
 * Game #155
 */

import { Vec2, Vec4, randomRange, INVADERS_COLORS, lerpColor } from './math';

export type ParticleType =
  | 'playerShoot'   // Player bullet effect
  | 'alienDeath'    // Alien explosion
  | 'playerHit'     // Player takes damage
  | 'barrierHit'    // Barrier damage
  | 'bulletTrail'   // Bullet trails
  | 'gameOver'      // Game over effect
  | 'ambient';      // Background stars

const PARTICLE_TYPE_MAP: Record<ParticleType, number> = {
  playerShoot: 0,
  alienDeath: 1,
  playerHit: 2,
  barrierHit: 3,
  bulletTrail: 4,
  gameOver: 5,
  ambient: 6,
};

export interface Particle {
  position: Vec2;
  velocity: Vec2;
  color: Vec4;
  life: number;
  maxLife: number;
  size: number;
  type: ParticleType;
}

export class ParticleSystem {
  private particles: Particle[] = [];
  private maxParticles: number;

  constructor(maxParticles: number = 1000) {
    this.maxParticles = maxParticles;
  }

  emit(config: {
    position: Vec2;
    count: number;
    type: ParticleType;
    color?: Vec4;
    speed?: number;
    size?: number;
    life?: number;
    spread?: number;
    direction?: Vec2;
  }) {
    const {
      position,
      count,
      type,
      color = [...INVADERS_COLORS.white] as Vec4,
      speed = 0.02,
      size = 0.02,
      life = 1.0,
      spread = Math.PI * 2,
      direction = [0, 1],
    } = config;

    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) {
        this.particles.shift();
      }

      const baseAngle = Math.atan2(direction[1], direction[0]);
      const angle = baseAngle + (Math.random() - 0.5) * spread;
      const velocity = speed * (0.5 + Math.random() * 0.5);

      const colorVariation: Vec4 = [
        color[0] + (Math.random() - 0.5) * 0.1,
        color[1] + (Math.random() - 0.5) * 0.1,
        color[2] + (Math.random() - 0.5) * 0.1,
        color[3],
      ];

      this.particles.push({
        position: [
          position[0] + (Math.random() - 0.5) * 0.02,
          position[1] + (Math.random() - 0.5) * 0.02,
        ],
        velocity: [
          Math.cos(angle) * velocity,
          Math.sin(angle) * velocity,
        ],
        color: colorVariation,
        life: life * (0.8 + Math.random() * 0.4),
        maxLife: life,
        size: size * (0.7 + Math.random() * 0.6),
        type,
      });
    }
  }

  emitPlayerShoot(x: number, y: number) {
    // Green laser muzzle flash
    this.emit({
      position: [x, y],
      count: 8,
      type: 'playerShoot',
      color: [...INVADERS_COLORS.crtGreen] as Vec4,
      speed: 0.03,
      size: 0.015,
      life: 0.2,
      spread: Math.PI * 0.3,
      direction: [0, 1],
    });

    // Bright core
    this.emit({
      position: [x, y],
      count: 3,
      type: 'playerShoot',
      color: [...INVADERS_COLORS.crtBright] as Vec4,
      speed: 0.05,
      size: 0.01,
      life: 0.15,
      spread: Math.PI * 0.1,
      direction: [0, 1],
    });
  }

  emitAlienDeath(x: number, y: number, alienType: number) {
    // Get alien color
    const colors = [
      INVADERS_COLORS.alienRed,
      INVADERS_COLORS.alienYellow,
      INVADERS_COLORS.alienCyan,
    ];
    const baseColor = colors[alienType] || INVADERS_COLORS.alienRed;

    // Main explosion
    this.emit({
      position: [x, y],
      count: 25,
      type: 'alienDeath',
      color: [...baseColor] as Vec4,
      speed: 0.04,
      size: 0.025,
      life: 0.6,
      spread: Math.PI * 2,
    });

    // White sparks
    this.emit({
      position: [x, y],
      count: 15,
      type: 'alienDeath',
      color: [...INVADERS_COLORS.spark] as Vec4,
      speed: 0.06,
      size: 0.012,
      life: 0.4,
      spread: Math.PI * 2,
    });

    // Pixel debris
    this.emit({
      position: [x, y],
      count: 10,
      type: 'alienDeath',
      color: lerpColor(baseColor, INVADERS_COLORS.black, 0.3) as Vec4,
      speed: 0.03,
      size: 0.02,
      life: 0.8,
      spread: Math.PI * 2,
    });
  }

  emitPlayerHit(x: number, y: number) {
    // Danger flash
    this.emit({
      position: [x, y],
      count: 30,
      type: 'playerHit',
      color: [...INVADERS_COLORS.alienBullet] as Vec4,
      speed: 0.05,
      size: 0.03,
      life: 0.5,
      spread: Math.PI * 2,
    });

    // White flash
    this.emit({
      position: [x, y],
      count: 15,
      type: 'playerHit',
      color: [...INVADERS_COLORS.white] as Vec4,
      speed: 0.08,
      size: 0.02,
      life: 0.3,
      spread: Math.PI * 2,
    });

    // Green sparks (player debris)
    this.emit({
      position: [x, y],
      count: 20,
      type: 'playerHit',
      color: [...INVADERS_COLORS.crtGreen] as Vec4,
      speed: 0.04,
      size: 0.015,
      life: 0.6,
      spread: Math.PI,
      direction: [0, -1],
    });
  }

  emitBarrierHit(x: number, y: number) {
    // Green debris
    this.emit({
      position: [x, y],
      count: 10,
      type: 'barrierHit',
      color: [...INVADERS_COLORS.barrierGreen] as Vec4,
      speed: 0.03,
      size: 0.015,
      life: 0.5,
      spread: Math.PI * 2,
    });

    // Sparks
    this.emit({
      position: [x, y],
      count: 5,
      type: 'barrierHit',
      color: [...INVADERS_COLORS.crtBright] as Vec4,
      speed: 0.04,
      size: 0.008,
      life: 0.3,
      spread: Math.PI * 2,
    });
  }

  emitBulletTrail(x: number, y: number, isPlayer: boolean) {
    const color = isPlayer ? INVADERS_COLORS.crtGreen : INVADERS_COLORS.alienBullet;

    this.emit({
      position: [x, y],
      count: 2,
      type: 'bulletTrail',
      color: [...color] as Vec4,
      speed: 0.005,
      size: 0.008,
      life: 0.2,
      spread: Math.PI * 0.2,
      direction: isPlayer ? [0, -1] : [0, 1],
    });
  }

  emitGameOver(x: number, y: number) {
    // Rain of debris from top
    for (let i = 0; i < 10; i++) {
      setTimeout(() => {
        const rx = Math.random();
        this.emit({
          position: [rx, 1.0],
          count: 5,
          type: 'gameOver',
          color: lerpColor(INVADERS_COLORS.alienRed, INVADERS_COLORS.crtGreen, Math.random()) as Vec4,
          speed: 0.02,
          size: 0.02,
          life: 2.0,
          spread: Math.PI * 0.3,
          direction: [0, -1],
        });
      }, i * 100);
    }

    // Central explosion
    this.emit({
      position: [x, y],
      count: 40,
      type: 'gameOver',
      color: [...INVADERS_COLORS.alienBullet] as Vec4,
      speed: 0.05,
      size: 0.03,
      life: 1.5,
      spread: Math.PI * 2,
    });
  }

  emitGameStart() {
    // Burst from center
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const x = 0.5 + Math.cos(angle) * 0.2;
      const y = 0.5 + Math.sin(angle) * 0.2;

      this.emit({
        position: [x, y],
        count: 10,
        type: 'alienDeath',
        color: [...INVADERS_COLORS.crtGreen] as Vec4,
        speed: 0.04,
        size: 0.015,
        life: 0.8,
        spread: Math.PI * 0.5,
        direction: [Math.cos(angle), Math.sin(angle)],
      });
    }
  }

  emitLevelComplete() {
    // Celebration burst
    for (let i = 0; i < 5; i++) {
      setTimeout(() => {
        const x = 0.2 + i * 0.15;
        this.emit({
          position: [x, 0.3],
          count: 20,
          type: 'alienDeath',
          color: lerpColor(INVADERS_COLORS.alienYellow, INVADERS_COLORS.crtGreen, i / 5) as Vec4,
          speed: 0.05,
          size: 0.02,
          life: 1.0,
          spread: Math.PI * 2,
        });
      }, i * 100);
    }
  }

  emitAmbient() {
    // Occasional shooting star
    if (Math.random() > 0.7) {
      const startX = Math.random();
      this.emit({
        position: [startX, 1.0],
        count: 1,
        type: 'ambient',
        color: [...INVADERS_COLORS.starWhite] as Vec4,
        speed: 0.01,
        size: 0.005,
        life: 2.0,
        spread: Math.PI * 0.1,
        direction: [Math.random() - 0.5, -1],
      });
    }
  }

  update(deltaTime: number) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];

      // Update position
      p.position[0] += p.velocity[0] * deltaTime * 60;
      p.position[1] += p.velocity[1] * deltaTime * 60;

      // Apply effects based on type
      switch (p.type) {
        case 'playerShoot':
          // Upward acceleration
          p.velocity[1] += 0.001 * deltaTime * 60;
          break;
        case 'alienDeath':
          // Gravity and slow down
          p.velocity[1] -= 0.0005 * deltaTime * 60;
          p.velocity[0] *= 0.98;
          p.velocity[1] *= 0.98;
          break;
        case 'playerHit':
          // Slow expansion
          p.velocity[0] *= 0.95;
          p.velocity[1] *= 0.95;
          break;
        case 'barrierHit':
          // Gravity
          p.velocity[1] -= 0.001 * deltaTime * 60;
          break;
        case 'gameOver':
          // Slow fall
          p.velocity[1] -= 0.0003 * deltaTime * 60;
          break;
      }

      // Decay velocity
      p.velocity[0] *= 0.99;
      p.velocity[1] *= 0.99;

      // Update life
      p.life -= deltaTime;

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

      data[offset + 0] = p.position[0];
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
      data[offset + 11] = PARTICLE_TYPE_MAP[p.type];
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
