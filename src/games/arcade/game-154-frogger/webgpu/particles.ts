/**
 * Particle System - Frogger
 * Retro Pixel / Pond Nature / Blue-Green Theme
 * Game #154
 */

import { Vec2, Vec4, randomRange, FROGGER_COLORS, lerpColor } from './math';

export type ParticleType =
  | 'frogHop'      // When frog jumps
  | 'splash'       // When frog enters water / dies in water
  | 'carHit'       // When hit by car
  | 'goalReach'    // When reaching goal
  | 'logRide'      // Trail when riding log
  | 'gameOver'     // Game over effect
  | 'ambient';     // Background water bubbles

const PARTICLE_TYPE_MAP: Record<ParticleType, number> = {
  frogHop: 0,
  splash: 1,
  carHit: 2,
  goalReach: 3,
  logRide: 4,
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
      color = [...FROGGER_COLORS.white] as Vec4,
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

  emitFrogHop(x: number, y: number) {
    // Green hop effect
    this.emit({
      position: [x, y],
      count: 8,
      type: 'frogHop',
      color: [...FROGGER_COLORS.frogLight] as Vec4,
      speed: 0.015,
      size: 0.015,
      life: 0.4,
      spread: Math.PI * 2,
    });

    // Small dust/grass particles
    this.emit({
      position: [x, y],
      count: 5,
      type: 'frogHop',
      color: [...FROGGER_COLORS.lilyPad] as Vec4,
      speed: 0.02,
      size: 0.008,
      life: 0.3,
      spread: Math.PI,
      direction: [0, 1],
    });
  }

  emitSplash(x: number, y: number, isDeath: boolean = false) {
    const baseColor = isDeath
      ? [...FROGGER_COLORS.danger] as Vec4
      : [...FROGGER_COLORS.splash] as Vec4;

    // Main splash ring
    this.emit({
      position: [x, y],
      count: isDeath ? 25 : 15,
      type: 'splash',
      color: baseColor,
      speed: 0.04,
      size: 0.025,
      life: isDeath ? 1.2 : 0.8,
      spread: Math.PI * 2,
    });

    // Water droplets going up
    this.emit({
      position: [x, y],
      count: 10,
      type: 'splash',
      color: [...FROGGER_COLORS.waterLight] as Vec4,
      speed: 0.06,
      size: 0.012,
      life: 0.6,
      spread: Math.PI * 0.5,
      direction: [0, 1],
    });
  }

  emitCarHit(x: number, y: number) {
    // Danger flash
    this.emit({
      position: [x, y],
      count: 20,
      type: 'carHit',
      color: [...FROGGER_COLORS.danger] as Vec4,
      speed: 0.05,
      size: 0.03,
      life: 0.6,
      spread: Math.PI * 2,
    });

    // Impact sparks
    this.emit({
      position: [x, y],
      count: 15,
      type: 'carHit',
      color: [...FROGGER_COLORS.roadMark] as Vec4,
      speed: 0.08,
      size: 0.015,
      life: 0.4,
      spread: Math.PI * 2,
    });
  }

  emitGoalReach(x: number, y: number) {
    // Golden celebration burst
    this.emit({
      position: [x, y],
      count: 30,
      type: 'goalReach',
      color: [...FROGGER_COLORS.goalGold] as Vec4,
      speed: 0.06,
      size: 0.03,
      life: 1.5,
      spread: Math.PI * 2,
    });

    // White sparkles
    this.emit({
      position: [x, y],
      count: 20,
      type: 'goalReach',
      color: [...FROGGER_COLORS.goalGlow] as Vec4,
      speed: 0.08,
      size: 0.015,
      life: 1.0,
      spread: Math.PI * 2,
    });

    // Upward celebration
    this.emit({
      position: [x, y],
      count: 15,
      type: 'goalReach',
      color: [...FROGGER_COLORS.frogGreen] as Vec4,
      speed: 0.05,
      size: 0.02,
      life: 1.2,
      spread: Math.PI * 0.6,
      direction: [0, 1],
    });
  }

  emitLogRide(x: number, y: number) {
    // Subtle water ripple behind frog on log
    this.emit({
      position: [x, y],
      count: 3,
      type: 'logRide',
      color: [...FROGGER_COLORS.logLight] as Vec4,
      speed: 0.01,
      size: 0.015,
      life: 0.5,
      spread: Math.PI * 0.3,
      direction: [0, -1],
    });
  }

  emitGameOver(x: number, y: number) {
    // Dramatic death effect
    for (let wave = 0; wave < 3; wave++) {
      setTimeout(() => {
        this.emit({
          position: [x, y],
          count: 25,
          type: 'gameOver',
          color: [...FROGGER_COLORS.danger] as Vec4,
          speed: 0.04 + wave * 0.02,
          size: 0.04,
          life: 1.5,
          spread: Math.PI * 2,
        });
      }, wave * 150);
    }

    // Dark particles
    this.emit({
      position: [x, y],
      count: 20,
      type: 'gameOver',
      color: [...FROGGER_COLORS.black] as Vec4,
      speed: 0.03,
      size: 0.025,
      life: 2.0,
      spread: Math.PI * 2,
    });
  }

  emitGameStart() {
    // Burst from center
    for (let i = 0; i < 5; i++) {
      const angle = (i / 5) * Math.PI * 2;
      const x = 0.5 + Math.cos(angle) * 0.2;
      const y = 0.5 + Math.sin(angle) * 0.2;

      this.emit({
        position: [x, y],
        count: 15,
        type: 'goalReach',
        color: [...FROGGER_COLORS.frogGreen] as Vec4,
        speed: 0.04,
        size: 0.02,
        life: 1.0,
        spread: Math.PI,
        direction: [Math.cos(angle), Math.sin(angle)],
      });
    }
  }

  emitVictory() {
    // Full screen celebration
    for (let i = 0; i < 5; i++) {
      setTimeout(() => {
        const x = 0.1 + i * 0.2;
        this.emitGoalReach(x, 0.95);
      }, i * 100);
    }

    // Rain of particles
    for (let i = 0; i < 20; i++) {
      setTimeout(() => {
        const x = Math.random();
        this.emit({
          position: [x, 1.0],
          count: 5,
          type: 'goalReach',
          color: lerpColor(FROGGER_COLORS.goalGold, FROGGER_COLORS.frogGreen, Math.random()) as Vec4,
          speed: 0.03,
          size: 0.015,
          life: 2.0,
          spread: Math.PI * 0.3,
          direction: [0, -1],
        });
      }, i * 50);
    }
  }

  emitAmbient() {
    // Random water bubbles in water zone
    if (Math.random() > 0.3) {
      const x = Math.random();
      const y = 0.5 + Math.random() * 0.35;

      this.emit({
        position: [x, y],
        count: 1,
        type: 'ambient',
        color: [...FROGGER_COLORS.waterLight] as Vec4,
        speed: 0.008,
        size: 0.008,
        life: 2.0,
        spread: Math.PI * 0.2,
        direction: [0, 1],
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
        case 'splash':
          // Gravity for water droplets
          p.velocity[1] -= 0.001 * deltaTime * 60;
          break;
        case 'carHit':
          // Quick decay
          p.velocity[0] *= 0.95;
          p.velocity[1] *= 0.95;
          break;
        case 'goalReach':
          // Slow rise
          p.velocity[1] *= 0.98;
          break;
        case 'gameOver':
          // Swirl effect
          const swirl = 0.1 * deltaTime * 60;
          const temp = p.velocity[0];
          p.velocity[0] += p.velocity[1] * swirl;
          p.velocity[1] -= temp * swirl;
          break;
        case 'ambient':
          // Gentle float
          p.velocity[0] += (Math.random() - 0.5) * 0.0002;
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
