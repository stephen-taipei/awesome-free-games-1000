/**
 * WebGPU Particle System - Ring Toss
 * Carnival / Fairground / Colorful and Festive Theme
 * Game #165
 */

import { randomRange, getRandomRingColor, getRandomConfettiColor, getPegColor, CARNIVAL_COLORS, easeOutCubic, easeOutBounce } from './math';

export type ParticleType = 'throw' | 'land' | 'bounce' | 'score' | 'confetti' | 'gameOver';

export interface Particle {
  position: [number, number];
  velocity: [number, number];
  color: [number, number, number, number];
  size: number;
  life: number;
  maxLife: number;
  particleType: number;
  gravity: number;
  friction: number;
  rotationSpeed: number;
}

const PARTICLE_TYPE_MAP: Record<ParticleType, number> = {
  throw: 0,
  land: 1,
  bounce: 2,
  score: 3,
  confetti: 4,
  gameOver: 5
};

export class ParticleSystem {
  private particles: Particle[] = [];
  private maxParticles = 800;

  update(delta: number) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= delta;

      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      // Apply velocity
      p.position[0] += p.velocity[0] * delta;
      p.position[1] += p.velocity[1] * delta;

      // Apply gravity
      p.velocity[1] += p.gravity * delta;

      // Apply friction
      p.velocity[0] *= 1 - p.friction * delta;
      p.velocity[1] *= 1 - p.friction * delta;

      // Type-specific behavior
      const lifeRatio = p.life / p.maxLife;

      switch (p.particleType) {
        case 0: // throw - trail follows arc
          p.color[3] = lifeRatio;
          break;
        case 1: // land - expand outward
          p.velocity[0] *= 1.01;
          p.velocity[1] *= 1.01;
          break;
        case 2: // bounce - quick spark
          break;
        case 3: // score - float up with sparkle
          p.velocity[1] -= 0.3 * delta;
          break;
        case 4: // confetti - flutter down
          p.velocity[0] += Math.sin(p.life * 10 + p.position[0] * 50) * 0.2 * delta;
          break;
        case 5: // gameOver - firework spread
          break;
      }
    }
  }

  emit(x: number, y: number, type: ParticleType, count: number, options: Partial<{
    color: number[];
    spread: number;
    speed: number;
    size: number;
    life: number;
    gravity: number;
  }> = {}) {
    const pType = PARTICLE_TYPE_MAP[type];

    for (let i = 0; i < count && this.particles.length < this.maxParticles; i++) {
      const angle = randomRange(0, Math.PI * 2);
      const spread = options.spread ?? 1;
      const speed = (options.speed ?? 0.3) * randomRange(0.5, 1.5);

      let color: number[];
      let gravity = options.gravity ?? 0.3;
      let size = options.size ?? 1;
      let life = options.life ?? 1;
      let friction = 1;

      switch (type) {
        case 'throw':
          // Ring throw trail
          color = options.color ?? getRandomRingColor();
          color[3] = 0.8;
          size = randomRange(0.3, 0.6);
          life = randomRange(0.3, 0.5);
          gravity = 0.5;
          friction = 3;
          break;

        case 'land':
          // Ring landed on peg - success burst
          color = options.color ?? [...CARNIVAL_COLORS.starGold];
          color[3] = 0.9;
          size = randomRange(0.6, 1.0);
          life = randomRange(0.4, 0.7);
          gravity = 0;
          friction = 0;
          break;

        case 'bounce':
          // Ring bounced off peg
          color = options.color ?? [...CARNIVAL_COLORS.burstWhite];
          color[3] = 0.7;
          size = randomRange(0.3, 0.5);
          life = randomRange(0.2, 0.4);
          gravity = 0.8;
          friction = 2;
          break;

        case 'score':
          // Score earned - stars
          color = [...CARNIVAL_COLORS.starGold];
          color[3] = 1.0;
          size = randomRange(0.5, 0.9);
          life = randomRange(0.8, 1.3);
          gravity = -0.5;
          friction = 2;
          break;

        case 'confetti':
          // Celebration confetti
          color = getRandomConfettiColor();
          color[3] = 1.0;
          size = randomRange(0.4, 0.8);
          life = randomRange(1.5, 2.5);
          gravity = 0.3;
          friction = 1;
          break;

        case 'gameOver':
          // Game over celebration
          color = getRandomConfettiColor();
          color[3] = 1.0;
          size = randomRange(0.5, 1.0);
          life = randomRange(1.0, 2.0);
          gravity = 0.2;
          friction = 1;
          break;

        default:
          color = [1, 1, 1, 1];
      }

      this.particles.push({
        position: [x, y],
        velocity: [
          Math.cos(angle) * speed * spread,
          Math.sin(angle) * speed * spread
        ],
        color: color as [number, number, number, number],
        size,
        life,
        maxLife: life,
        particleType: pType,
        gravity,
        friction,
        rotationSpeed: randomRange(-5, 5)
      });
    }
  }

  // Ring throw trail
  emitThrow(x: number, y: number, ringColor: string) {
    const colorMap: Record<string, number[]> = {
      '#e74c3c': [...CARNIVAL_COLORS.ringRed],
      '#3498db': [...CARNIVAL_COLORS.ringBlue],
      '#2ecc71': [...CARNIVAL_COLORS.ringGreen],
      '#f39c12': [...CARNIVAL_COLORS.ringOrange],
      '#9b59b6': [...CARNIVAL_COLORS.ringPurple]
    };
    const color = colorMap[ringColor] ?? getRandomRingColor();

    this.emit(x, y, 'throw', 5, {
      spread: 0.3,
      speed: 0.15,
      color
    });
  }

  // Ring landed on peg
  emitLand(x: number, y: number, points: number) {
    const color = getPegColor(points);

    // Success ring burst
    this.emit(x, y, 'land', 20, {
      spread: 0.8,
      speed: 0.4,
      color
    });

    // Score stars
    this.emit(x, y, 'score', 10 + Math.floor(points / 10), {
      spread: 0.5,
      speed: 0.25
    });
  }

  // Ring bounced off
  emitBounce(x: number, y: number) {
    this.emit(x, y, 'bounce', 8, {
      spread: 0.6,
      speed: 0.3
    });
  }

  // Score display
  emitScore(x: number, y: number, points: number) {
    this.emit(x, y, 'score', Math.floor(points / 5), {
      spread: 0.4,
      speed: 0.2
    });
  }

  // Confetti celebration
  emitConfetti(x: number, y: number) {
    this.emit(x, y, 'confetti', 30, {
      spread: 1.5,
      speed: 0.5
    });
  }

  // Game over
  emitGameOver(x: number, y: number, victory: boolean) {
    if (victory) {
      // Victory fireworks
      for (let i = 0; i < 5; i++) {
        const offsetX = x + randomRange(-0.3, 0.3);
        const offsetY = y + randomRange(-0.2, 0.2);
        setTimeout(() => {
          this.emit(offsetX, offsetY, 'gameOver', 40, {
            spread: 2,
            speed: 0.6
          });
          this.emit(offsetX, offsetY, 'confetti', 30, {
            spread: 1.5,
            speed: 0.4
          });
        }, i * 200);
      }
    } else {
      // Game over - gentle confetti
      this.emit(x, y, 'confetti', 25, {
        spread: 1,
        speed: 0.3
      });
    }
  }

  getData(): Float32Array {
    const data = new Float32Array(this.particles.length * 12);

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      const offset = i * 12;

      data[offset] = p.position[0];
      data[offset + 1] = p.position[1];
      data[offset + 2] = p.velocity[0];
      data[offset + 3] = p.velocity[1];
      data[offset + 4] = p.color[0];
      data[offset + 5] = p.color[1];
      data[offset + 6] = p.color[2];
      data[offset + 7] = p.color[3];
      data[offset + 8] = p.size;
      data[offset + 9] = p.life;
      data[offset + 10] = p.maxLife;
      data[offset + 11] = p.particleType;
    }

    return data;
  }

  getCount(): number {
    return this.particles.length;
  }

  clear() {
    this.particles = [];
  }
}
