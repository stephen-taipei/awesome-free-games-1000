/**
 * WebGPU Particle System - Claw Machine
 * Arcade / UFO Catcher / Purple and Neon Theme
 * Game #164
 */

import { randomRange, getRandomNeonColor, getPrizeColor, CLAW_COLORS, easeOutCubic, easeOutQuad } from './math';

export type ParticleType = 'clawDrop' | 'grab' | 'sparkle' | 'success' | 'fail' | 'gameOver';

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
  clawDrop: 0,
  grab: 1,
  sparkle: 2,
  success: 3,
  fail: 4,
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
        case 0: // clawDrop - sparks fall and fade
          p.velocity[0] += Math.sin(p.life * 20) * 0.1 * delta;
          break;
        case 1: // grab - ring expands outward
          p.velocity[0] *= 1.02;
          p.velocity[1] *= 1.02;
          break;
        case 2: // sparkle - gentle floating
          p.velocity[0] += Math.sin(p.life * 10 + p.position[1] * 50) * 0.05 * delta;
          p.velocity[1] += Math.cos(p.life * 8) * 0.02 * delta;
          break;
        case 3: // success - confetti falls with rotation
          p.velocity[0] += Math.sin(p.life * 15) * 0.15 * delta;
          break;
        case 4: // fail - sink down sadly
          p.color[3] = lifeRatio * 0.6;
          break;
        case 5: // gameOver - dramatic burst
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
        case 'clawDrop':
          // Electric sparks from claw
          color = options.color ?? getRandomNeonColor();
          color[3] = 0.9;
          size = randomRange(0.4, 0.8);
          life = randomRange(0.3, 0.6);
          gravity = 2;
          friction = 2;
          break;

        case 'grab':
          // Ring effect when grabbing
          color = [...CLAW_COLORS.clawGlow];
          color[3] = 0.8;
          size = randomRange(0.8, 1.2);
          life = randomRange(0.3, 0.5);
          gravity = 0;
          friction = 0;
          break;

        case 'sparkle':
          // Prize sparkles
          color = options.color ?? [...CLAW_COLORS.sparkleGold];
          color[3] = 0.9;
          size = randomRange(0.3, 0.6);
          life = randomRange(0.8, 1.5);
          gravity = -0.2;
          friction = 3;
          break;

        case 'success':
          // Prize collected - confetti
          color = getRandomNeonColor();
          color[3] = 1.0;
          size = randomRange(0.5, 1.0);
          life = randomRange(1.0, 2.0);
          gravity = 0.5;
          friction = 1;
          break;

        case 'fail':
          // Failed grab - sad particles
          color = [...CLAW_COLORS.failRed];
          color[3] = 0.7;
          size = randomRange(0.3, 0.6);
          life = randomRange(0.5, 0.8);
          gravity = 0.8;
          friction = 2;
          break;

        case 'gameOver':
          // Game over explosion
          color = getRandomNeonColor();
          color[3] = 1.0;
          size = randomRange(0.6, 1.2);
          life = randomRange(1.0, 2.0);
          gravity = 0.3;
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

  // Claw dropping sparks
  emitClawDrop(x: number, y: number) {
    this.emit(x, y, 'clawDrop', 12, {
      spread: 0.5,
      speed: 0.4
    });
  }

  // Grab attempt ring
  emitGrab(x: number, y: number, success: boolean) {
    this.emit(x, y, 'grab', 16, {
      spread: 0.3,
      speed: 0.5
    });

    if (success) {
      this.emit(x, y, 'sparkle', 20, {
        spread: 0.8,
        speed: 0.3,
        color: [...CLAW_COLORS.successGreen]
      });
    }
  }

  // Prize sparkle
  emitSparkle(x: number, y: number, prizeType: string) {
    const color = getPrizeColor(prizeType);
    this.emit(x, y, 'sparkle', 8, {
      spread: 0.6,
      speed: 0.2,
      color
    });
  }

  // Prize collected success
  emitSuccess(x: number, y: number, points: number) {
    // Confetti burst
    this.emit(x, y, 'success', 30 + Math.floor(points / 10), {
      spread: 1.5,
      speed: 0.5
    });

    // Gold sparkles
    this.emit(x, y, 'sparkle', 15, {
      spread: 1,
      speed: 0.4,
      color: [...CLAW_COLORS.coinGold]
    });
  }

  // Failed grab
  emitFail(x: number, y: number) {
    this.emit(x, y, 'fail', 15, {
      spread: 0.6,
      speed: 0.25
    });
  }

  // Game over
  emitGameOver(x: number, y: number, victory: boolean) {
    if (victory) {
      // Victory fireworks
      for (let i = 0; i < 5; i++) {
        const offsetX = x + randomRange(-0.2, 0.2);
        const offsetY = y + randomRange(-0.2, 0.2);
        setTimeout(() => {
          this.emit(offsetX, offsetY, 'gameOver', 40, {
            spread: 2,
            speed: 0.6
          });
          this.emit(offsetX, offsetY, 'success', 30, {
            spread: 1.5,
            speed: 0.5
          });
        }, i * 150);
      }
    } else {
      // Game over - dramatic fall
      this.emit(x, y, 'gameOver', 50, {
        spread: 1.5,
        speed: 0.4
      });
      this.emit(x, y, 'fail', 30, {
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
