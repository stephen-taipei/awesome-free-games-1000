/**
 * Particle System - Pac-Man
 * Retro Arcade / Neon Yellow / Classic Theme
 * Game #152
 */

import { PACMAN_COLORS, randomRange, easeOutCubic, ghostColorByIndex } from './math';

export type ParticleType =
  | 'dotEat'       // 0 - Yellow flash when eating dot
  | 'powerUp'      // 1 - Blue expanding wave for power pellet
  | 'ghostEat'     // 2 - Colorful burst when eating ghost
  | 'pacmanTrail'  // 3 - Trail behind pac-man
  | 'ghostTrail'   // 4 - Trail behind ghosts
  | 'gameOver';    // 5 - Death explosion

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: readonly number[];
  life: number;
  maxLife: number;
  size: number;
  type: ParticleType;
}

const PARTICLE_TYPE_MAP: Record<ParticleType, number> = {
  dotEat: 0,
  powerUp: 1,
  ghostEat: 2,
  pacmanTrail: 3,
  ghostTrail: 4,
  gameOver: 5,
};

export class ParticleSystem {
  private particles: Particle[] = [];
  private maxParticles = 600;

  emit(
    x: number,
    y: number,
    type: ParticleType,
    count: number = 1,
    options: Partial<{
      color: readonly number[];
      spread: number;
      speed: number;
      size: number;
      life: number;
      ghostIndex: number;
    }> = {}
  ) {
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) {
        this.particles.shift();
      }

      const angle = Math.random() * Math.PI * 2;
      const spread = options.spread ?? 1;
      const speed = options.speed ?? 0.5;
      const velocity = randomRange(0.01, 0.03) * speed;

      let color: readonly number[];
      let size: number;
      let life: number;

      switch (type) {
        case 'dotEat':
          color = options.color ?? PACMAN_COLORS.dotYellow;
          size = options.size ?? randomRange(0.3, 0.5);
          life = options.life ?? randomRange(0.2, 0.35);
          break;

        case 'powerUp':
          color = options.color ?? PACMAN_COLORS.powerBlue;
          size = options.size ?? randomRange(0.8, 1.2);
          life = options.life ?? randomRange(0.5, 0.8);
          break;

        case 'ghostEat':
          color = options.ghostIndex !== undefined
            ? ghostColorByIndex(options.ghostIndex)
            : PACMAN_COLORS.ghostScared;
          size = options.size ?? randomRange(0.4, 0.7);
          life = options.life ?? randomRange(0.4, 0.6);
          break;

        case 'pacmanTrail':
          color = options.color ?? PACMAN_COLORS.pacmanGlow;
          size = options.size ?? randomRange(0.2, 0.35);
          life = options.life ?? randomRange(0.15, 0.25);
          break;

        case 'ghostTrail':
          color = options.ghostIndex !== undefined
            ? ghostColorByIndex(options.ghostIndex)
            : PACMAN_COLORS.ghostRed;
          size = options.size ?? randomRange(0.15, 0.25);
          life = options.life ?? randomRange(0.1, 0.2);
          break;

        case 'gameOver':
          color = options.color ?? PACMAN_COLORS.pacmanYellow;
          size = options.size ?? randomRange(0.5, 0.9);
          life = options.life ?? randomRange(0.6, 1.0);
          break;

        default:
          color = PACMAN_COLORS.sparkYellow;
          size = 0.4;
          life = 0.3;
      }

      this.particles.push({
        x: x + (Math.random() - 0.5) * 0.02 * spread,
        y: y + (Math.random() - 0.5) * 0.02 * spread,
        vx: Math.cos(angle) * velocity * spread,
        vy: Math.sin(angle) * velocity * spread,
        color,
        life,
        maxLife: life,
        size,
        type,
      });
    }
  }

  update(deltaTime: number) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];

      // Update position
      p.x += p.vx * deltaTime;
      p.y += p.vy * deltaTime;

      // Apply drag based on type
      const drag = p.type === 'powerUp' ? 0.98 : 0.95;
      p.vx *= drag;
      p.vy *= drag;

      // Power up particles expand outward
      if (p.type === 'powerUp') {
        const lifeRatio = p.life / p.maxLife;
        p.vx *= 1.02;
        p.vy *= 1.02;
      }

      // Update life
      p.life -= deltaTime;

      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  getParticleData(): Float32Array {
    const data = new Float32Array(this.particles.length * 12);

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      const offset = i * 12;
      const lifeRatio = p.life / p.maxLife;

      // Position
      data[offset] = p.x;
      data[offset + 1] = p.y;

      // Velocity
      data[offset + 2] = p.vx;
      data[offset + 3] = p.vy;

      // Color with eased alpha
      data[offset + 4] = p.color[0];
      data[offset + 5] = p.color[1];
      data[offset + 6] = p.color[2];
      data[offset + 7] = p.color[3] * easeOutCubic(lifeRatio);

      // Life
      data[offset + 8] = p.life;
      data[offset + 9] = p.maxLife;

      // Size
      data[offset + 10] = p.size;

      // Type
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
