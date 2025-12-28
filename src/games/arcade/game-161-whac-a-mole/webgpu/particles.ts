/**
 * Particle System - Whac-A-Mole
 * Carnival / Fair / Grass Green and Brown Theme
 * Game #161
 */

import {
  WHAC_COLORS,
  lerp,
  lerpColor,
  randomRange,
  clamp,
  easeOutQuad,
  easeOutCubic,
  easeOutBounce,
} from './math';

export type ParticleType =
  | 'whack'
  | 'bombHit'
  | 'goldenHit'
  | 'molePopup'
  | 'miss'
  | 'gameOver';

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  type: ParticleType;
  color: [number, number, number, number];
}

const PARTICLE_TYPE_MAP: Record<ParticleType, number> = {
  whack: 0,
  bombHit: 1,
  goldenHit: 2,
  molePopup: 3,
  miss: 4,
  gameOver: 5,
};

export class ParticleSystem {
  private particles: Particle[] = [];
  private maxParticles = 500;

  update(delta: number) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= delta;

      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      const lifeRatio = p.life / p.maxLife;

      switch (p.type) {
        case 'whack':
          // Stars burst outward
          p.x += p.vx * delta;
          p.y += p.vy * delta;
          p.vx *= 0.95;
          p.vy *= 0.95;
          break;

        case 'bombHit':
          // Explosion expands
          p.x += p.vx * delta;
          p.y += p.vy * delta;
          p.vx *= 0.92;
          p.vy *= 0.92;
          break;

        case 'goldenHit':
          // Sparkles float up
          p.x += p.vx * delta;
          p.y += p.vy * delta;
          p.vy -= delta * 0.3;
          p.vx += Math.sin(p.life * 15) * delta * 0.2;
          break;

        case 'molePopup':
          // Dirt falls down
          p.x += p.vx * delta;
          p.y += p.vy * delta;
          p.vy += delta * 0.8;
          break;

        case 'miss':
          // Dust settles
          p.x += p.vx * delta;
          p.y += p.vy * delta;
          p.vy += delta * 0.2;
          p.vx *= 0.98;
          break;

        case 'gameOver':
          // Confetti falls with flutter
          p.x += p.vx * delta;
          p.y += p.vy * delta;
          p.vy += delta * 0.3;
          p.vx += Math.sin(p.life * 10 + p.x * 5) * delta * 0.3;
          break;
      }

      p.color[3] = lifeRatio;
    }
  }

  emit(
    type: ParticleType,
    x: number,
    y: number,
    count: number,
    config?: Partial<{
      speed: number;
      size: number;
      life: number;
      color: readonly [number, number, number, number];
      spread: number;
      direction: number;
    }>
  ) {
    const baseConfig = {
      speed: 0.2,
      size: 12,
      life: 0.6,
      color: WHAC_COLORS.whackYellow,
      spread: Math.PI * 2,
      direction: 0,
    };
    const cfg = { ...baseConfig, ...config };

    for (let i = 0; i < count && this.particles.length < this.maxParticles; i++) {
      const angle = cfg.direction + (Math.random() - 0.5) * cfg.spread;
      const speed = cfg.speed * (0.5 + Math.random() * 0.5);

      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: cfg.life * (0.7 + Math.random() * 0.6),
        maxLife: cfg.life,
        size: cfg.size * (0.6 + Math.random() * 0.8),
        type,
        color: [...cfg.color] as [number, number, number, number],
      });
    }
  }

  emitWhack(x: number, y: number) {
    // Star burst
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      const color = lerpColor(
        WHAC_COLORS.whackYellow,
        WHAC_COLORS.starYellow,
        Math.random()
      );

      this.emit('whack', x, y, 1, {
        speed: 0.35,
        size: 15 + Math.random() * 8,
        life: 0.4,
        color,
        direction: angle,
        spread: 0.2,
      });
    }

    // Central flash
    this.emit('whack', x, y, 5, {
      speed: 0.1,
      size: 25,
      life: 0.2,
      color: WHAC_COLORS.whackWhite,
      spread: Math.PI * 2,
    });
  }

  emitBombHit(x: number, y: number) {
    // Explosion burst
    for (let i = 0; i < 20; i++) {
      const angle = (i / 20) * Math.PI * 2;
      const layer = i % 3;
      const color = layer === 0
        ? WHAC_COLORS.bombRed
        : layer === 1
        ? WHAC_COLORS.bombSpark
        : WHAC_COLORS.bombBlack;

      this.emit('bombHit', x, y, 1, {
        speed: 0.3 + layer * 0.1,
        size: 18 + layer * 5,
        life: 0.5,
        color,
        direction: angle,
        spread: 0.3,
      });
    }

    // Smoke
    for (let i = 0; i < 10; i++) {
      this.emit('bombHit', x, y, 1, {
        speed: 0.1,
        size: 25,
        life: 0.8,
        color: [0.3, 0.3, 0.3, 1.0],
        spread: Math.PI * 2,
      });
    }
  }

  emitGoldenHit(x: number, y: number) {
    // Golden sparkles
    for (let i = 0; i < 25; i++) {
      const color = lerpColor(
        WHAC_COLORS.goldenYellow,
        WHAC_COLORS.goldenSparkle,
        Math.random()
      );

      this.emit('goldenHit', x, y, 1, {
        speed: 0.2 + Math.random() * 0.2,
        size: 10 + Math.random() * 10,
        life: 0.8,
        color,
        direction: -Math.PI / 2,
        spread: Math.PI,
      });
    }

    // Coin sparkles
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      this.emit('goldenHit', x, y, 1, {
        speed: 0.4,
        size: 20,
        life: 0.3,
        color: WHAC_COLORS.goldenSparkle,
        direction: angle,
        spread: 0.1,
      });
    }
  }

  emitMolePopup(x: number, y: number) {
    // Dirt particles
    for (let i = 0; i < 8; i++) {
      const color = lerpColor(
        WHAC_COLORS.dirtBrown,
        WHAC_COLORS.dirtDark,
        Math.random()
      );

      this.emit('molePopup', x, y, 1, {
        speed: 0.15 + Math.random() * 0.1,
        size: 8 + Math.random() * 6,
        life: 0.5,
        color,
        direction: -Math.PI / 2,
        spread: Math.PI * 0.8,
      });
    }
  }

  emitMiss(x: number, y: number) {
    // Dust puff
    for (let i = 0; i < 10; i++) {
      const color = lerpColor(
        WHAC_COLORS.dirtBrown,
        WHAC_COLORS.grassDark,
        Math.random()
      );

      this.emit('miss', x, y, 1, {
        speed: 0.1,
        size: 10 + Math.random() * 8,
        life: 0.4,
        color,
        spread: Math.PI * 2,
      });
    }
  }

  emitGameOver(x: number, y: number, isVictory: boolean) {
    const count = 60;
    const colors = isVictory
      ? [WHAC_COLORS.goldenYellow, WHAC_COLORS.carnivalPink, WHAC_COLORS.carnivalBlue]
      : [WHAC_COLORS.carnivalRed, WHAC_COLORS.carnivalPurple, WHAC_COLORS.moleBrown];

    for (let i = 0; i < count; i++) {
      const color = colors[i % colors.length];

      this.emit('gameOver', x + (Math.random() - 0.5) * 0.6, y - 0.2, 1, {
        speed: 0.1 + Math.random() * 0.2,
        size: 12 + Math.random() * 8,
        life: 2.0 + Math.random() * 1.0,
        color,
        direction: Math.PI / 2,
        spread: Math.PI * 0.6,
      });
    }
  }

  getParticleData(): Float32Array {
    const data = new Float32Array(this.particles.length * 12);

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      const offset = i * 12;

      data[offset + 0] = p.x;
      data[offset + 1] = p.y;
      data[offset + 2] = p.vx;
      data[offset + 3] = p.vy;
      data[offset + 4] = p.life;
      data[offset + 5] = p.maxLife;
      data[offset + 6] = p.size;
      data[offset + 7] = PARTICLE_TYPE_MAP[p.type];
      data[offset + 8] = p.color[0];
      data[offset + 9] = p.color[1];
      data[offset + 10] = p.color[2];
      data[offset + 11] = p.color[3];
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
