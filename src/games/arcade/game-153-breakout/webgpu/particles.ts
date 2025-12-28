/**
 * Particle System - Breakout
 * Neon Electric / Purple-Pink / Arcade Theme
 * Game #153
 */

import { BREAKOUT_COLORS, BRICK_COLORS, randomRange, easeOutCubic, hexToRgb } from './math';

export type ParticleType =
  | 'brickBreak'   // 0 - Brick destruction particles
  | 'ballTrail'    // 1 - Ball motion trail
  | 'paddleHit'    // 2 - Paddle impact effect
  | 'wallBounce'   // 3 - Wall bounce sparks
  | 'gameOver'     // 4 - Death explosion
  | 'victoryBurst'; // 5 - Win celebration

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
  brickBreak: 0,
  ballTrail: 1,
  paddleHit: 2,
  wallBounce: 3,
  gameOver: 4,
  victoryBurst: 5,
};

export class ParticleSystem {
  private particles: Particle[] = [];
  private maxParticles = 700;

  emit(
    x: number,
    y: number,
    type: ParticleType,
    count: number = 1,
    options: Partial<{
      color: readonly number[];
      colorHex: string;
      spread: number;
      speed: number;
      size: number;
      life: number;
      brickRow: number;
    }> = {}
  ) {
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) {
        this.particles.shift();
      }

      const angle = Math.random() * Math.PI * 2;
      const spread = options.spread ?? 1;
      const speed = options.speed ?? 0.5;
      const velocity = randomRange(0.01, 0.04) * speed;

      let color: readonly number[];
      let size: number;
      let life: number;

      switch (type) {
        case 'brickBreak':
          // Use brick row color or hex color
          if (options.colorHex) {
            color = hexToRgb(options.colorHex);
          } else if (options.brickRow !== undefined) {
            color = BRICK_COLORS[options.brickRow % BRICK_COLORS.length];
          } else {
            color = options.color ?? BREAKOUT_COLORS.neonPurple;
          }
          size = options.size ?? randomRange(0.4, 0.7);
          life = options.life ?? randomRange(0.4, 0.7);
          break;

        case 'ballTrail':
          color = options.color ?? BREAKOUT_COLORS.ballGlow;
          size = options.size ?? randomRange(0.2, 0.35);
          life = options.life ?? randomRange(0.1, 0.2);
          break;

        case 'paddleHit':
          color = options.color ?? BREAKOUT_COLORS.electricBlue;
          size = options.size ?? randomRange(0.5, 0.8);
          life = options.life ?? randomRange(0.3, 0.5);
          break;

        case 'wallBounce':
          color = options.color ?? BREAKOUT_COLORS.electricCyan;
          size = options.size ?? randomRange(0.3, 0.5);
          life = options.life ?? randomRange(0.2, 0.4);
          break;

        case 'gameOver':
          color = options.color ?? BREAKOUT_COLORS.neonPink;
          size = options.size ?? randomRange(0.5, 0.9);
          life = options.life ?? randomRange(0.6, 1.0);
          break;

        case 'victoryBurst':
          // Rainbow colors
          const hue = Math.random();
          color = [
            Math.sin(hue * Math.PI * 2) * 0.5 + 0.5,
            Math.sin((hue + 0.33) * Math.PI * 2) * 0.5 + 0.5,
            Math.sin((hue + 0.66) * Math.PI * 2) * 0.5 + 0.5,
            1.0,
          ];
          size = options.size ?? randomRange(0.5, 0.9);
          life = options.life ?? randomRange(0.6, 1.0);
          break;

        default:
          color = BREAKOUT_COLORS.spark;
          size = 0.4;
          life = 0.3;
      }

      // Adjust velocity based on type
      let vx = Math.cos(angle) * velocity * spread;
      let vy = Math.sin(angle) * velocity * spread;

      // Brick break - particles go downward more
      if (type === 'brickBreak') {
        vy = Math.abs(vy) * 0.5 + velocity * 0.5;
      }

      // Ball trail - minimal movement
      if (type === 'ballTrail') {
        vx *= 0.2;
        vy *= 0.2;
      }

      this.particles.push({
        x: x + (Math.random() - 0.5) * 0.02 * spread,
        y: y + (Math.random() - 0.5) * 0.02 * spread,
        vx,
        vy,
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

      // Apply gravity for brick break
      if (p.type === 'brickBreak') {
        p.vy += 0.001 * deltaTime;
      }

      // Apply drag
      const drag = p.type === 'paddleHit' ? 0.97 : 0.95;
      p.vx *= drag;
      p.vy *= drag;

      // Paddle hit expands outward
      if (p.type === 'paddleHit') {
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
