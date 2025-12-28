/**
 * Particle System - Pinball
 * Arcade / Neon / Chrome-Silver-Orange Theme
 * Game #160
 */

import {
  PINBALL_COLORS,
  lerp,
  lerpColor,
  randomRange,
  clamp,
  easeOutQuad,
  easeOutCubic,
  easeOutElastic,
} from './math';

export type ParticleType =
  | 'bumperHit'
  | 'targetLit'
  | 'launch'
  | 'flipperHit'
  | 'ballLost'
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
  bumperHit: 0,
  targetLit: 1,
  launch: 2,
  flipperHit: 3,
  ballLost: 4,
  gameOver: 5,
};

export class ParticleSystem {
  private particles: Particle[] = [];
  private maxParticles = 600;

  update(delta: number) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= delta;

      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      const lifeRatio = p.life / p.maxLife;

      // Update based on type
      switch (p.type) {
        case 'bumperHit':
          // Expand outward
          p.x += p.vx * delta;
          p.y += p.vy * delta;
          p.vx *= 0.98;
          p.vy *= 0.98;
          break;

        case 'targetLit':
          // Rise and sparkle
          p.x += p.vx * delta;
          p.y += p.vy * delta;
          p.vy -= delta * 0.5;
          p.vx += Math.sin(p.life * 20) * delta * 0.1;
          break;

        case 'launch':
          // Streak upward
          p.x += p.vx * delta;
          p.y += p.vy * delta;
          p.vy *= 0.95;
          break;

        case 'flipperHit':
          // Burst and fade
          p.x += p.vx * delta;
          p.y += p.vy * delta;
          p.vx *= 0.9;
          p.vy *= 0.9;
          break;

        case 'ballLost':
          // Fall and fade
          p.x += p.vx * delta;
          p.y += p.vy * delta;
          p.vy += delta * 0.5;
          break;

        case 'gameOver':
          // Float and scatter
          p.x += p.vx * delta;
          p.y += p.vy * delta;
          p.vx *= 0.99;
          p.vy *= 0.99;
          break;
      }

      // Fade color
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
      speed: 0.3,
      size: 15,
      life: 0.8,
      color: PINBALL_COLORS.bumperOrange,
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

  emitBumperHit(x: number, y: number, points: number) {
    // More particles for higher point bumpers
    const count = 15 + Math.floor(points / 50) * 5;

    // Orange-yellow burst
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const color = lerpColor(
        PINBALL_COLORS.bumperOrange,
        PINBALL_COLORS.bumperYellow,
        Math.random()
      );

      this.emit('bumperHit', x, y, 1, {
        speed: 0.4 + (points / 100) * 0.2,
        size: 12 + Math.random() * 8,
        life: 0.4,
        color,
        direction: angle,
        spread: 0.3,
      });
    }

    // White core flash
    this.emit('bumperHit', x, y, 5, {
      speed: 0.1,
      size: 20,
      life: 0.2,
      color: PINBALL_COLORS.chromeHighlight,
      spread: Math.PI * 2,
    });
  }

  emitTargetLit(x: number, y: number) {
    // Green sparkle burst
    for (let i = 0; i < 20; i++) {
      const color = lerpColor(
        PINBALL_COLORS.targetLit,
        PINBALL_COLORS.neonGreen,
        Math.random()
      );

      this.emit('targetLit', x, y, 1, {
        speed: 0.15 + Math.random() * 0.2,
        size: 8 + Math.random() * 6,
        life: 0.6,
        color,
        direction: -Math.PI / 2,
        spread: Math.PI,
      });
    }

    // Star sparkles
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      this.emit('targetLit', x, y, 1, {
        speed: 0.3,
        size: 15,
        life: 0.3,
        color: PINBALL_COLORS.sparkWhite,
        direction: angle,
        spread: 0.1,
      });
    }
  }

  emitLaunch(x: number, y: number, power: number) {
    // Power streak
    const normalizedPower = clamp(power / 30, 0, 1);
    const count = 10 + Math.floor(normalizedPower * 15);

    for (let i = 0; i < count; i++) {
      const color = lerpColor(
        PINBALL_COLORS.launchBlue,
        PINBALL_COLORS.launchWhite,
        normalizedPower * Math.random()
      );

      this.emit('launch', x, y + i * 0.01, 1, {
        speed: 0.2 + normalizedPower * 0.4,
        size: 10 + normalizedPower * 10,
        life: 0.3,
        color,
        direction: -Math.PI / 2,
        spread: 0.3,
      });
    }

    // Spark trail
    for (let i = 0; i < 5; i++) {
      this.emit('launch', x, y, 1, {
        speed: 0.5 + Math.random() * 0.3,
        size: 6,
        life: 0.4,
        color: PINBALL_COLORS.sparkYellow,
        direction: -Math.PI / 2 + (Math.random() - 0.5) * 0.5,
        spread: 0.1,
      });
    }
  }

  emitFlipperHit(x: number, y: number, side: 'left' | 'right') {
    // Directional burst based on flipper side
    const baseAngle = side === 'left' ? -Math.PI / 4 : -Math.PI * 3 / 4;

    for (let i = 0; i < 12; i++) {
      const color = lerpColor(
        PINBALL_COLORS.flipperRed,
        PINBALL_COLORS.flipperOrange,
        Math.random()
      );

      this.emit('flipperHit', x, y, 1, {
        speed: 0.3 + Math.random() * 0.2,
        size: 10 + Math.random() * 8,
        life: 0.25,
        color,
        direction: baseAngle,
        spread: Math.PI / 3,
      });
    }

    // White flash
    this.emit('flipperHit', x, y, 3, {
      speed: 0.1,
      size: 25,
      life: 0.15,
      color: PINBALL_COLORS.chromeHighlight,
      spread: Math.PI * 2,
    });
  }

  emitBallLost(x: number, y: number) {
    // Sad fadeout
    for (let i = 0; i < 25; i++) {
      const color = lerpColor(
        PINBALL_COLORS.chromeSilver,
        PINBALL_COLORS.chromeShadow,
        Math.random()
      );

      this.emit('ballLost', x, y, 1, {
        speed: 0.2 + Math.random() * 0.2,
        size: 8 + Math.random() * 6,
        life: 0.8,
        color,
        direction: Math.PI / 2,
        spread: Math.PI / 2,
      });
    }

    // Red loss indicator
    for (let i = 0; i < 10; i++) {
      this.emit('ballLost', x, y, 1, {
        speed: 0.15,
        size: 12,
        life: 0.6,
        color: PINBALL_COLORS.targetUnlit,
        spread: Math.PI * 2,
      });
    }
  }

  emitGameOver(x: number, y: number, isVictory: boolean) {
    const count = 80;
    const colors = isVictory
      ? [PINBALL_COLORS.neonGreen, PINBALL_COLORS.neonCyan, PINBALL_COLORS.sparkYellow]
      : [PINBALL_COLORS.neonPink, PINBALL_COLORS.neonPurple, PINBALL_COLORS.bumperRed];

    for (let i = 0; i < count; i++) {
      const color = colors[i % colors.length];
      const angle = (i / count) * Math.PI * 2;
      const layer = Math.floor(i / 20);

      this.emit('gameOver', x, y, 1, {
        speed: 0.2 + layer * 0.15,
        size: 15 + Math.random() * 15,
        life: 1.5 + layer * 0.3,
        color,
        direction: angle,
        spread: 0.4,
      });
    }

    // Center glow
    for (let i = 0; i < 10; i++) {
      this.emit('gameOver', x, y, 1, {
        speed: 0.05,
        size: 30,
        life: 1.0,
        color: PINBALL_COLORS.chromeHighlight,
        spread: Math.PI * 2,
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
