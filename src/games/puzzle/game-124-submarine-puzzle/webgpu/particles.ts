/**
 * WebGPU Particle System - Submarine Puzzle
 * Underwater Ocean / Deep Sea Theme
 * Game #124
 */

import { randomRange, COLORS, easeOutCubic } from './math';

export type ParticleType = 'bubble' | 'wave' | 'sparkle' | 'trail' | 'debris' | 'danger';

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: [number, number, number, number];
  size: number;
  life: number;
  maxLife: number;
  type: ParticleType;
}

const PARTICLE_TYPE_MAP: Record<ParticleType, number> = {
  bubble: 0,
  wave: 1,
  sparkle: 2,
  trail: 3,
  debris: 4,
  danger: 5,
};

export class ParticleSystem {
  private particles: Particle[] = [];
  private maxParticles: number = 500;

  update(deltaTime: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];

      p.life -= deltaTime;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      p.x += p.vx * deltaTime;
      p.y += p.vy * deltaTime;

      // Type-specific behaviors
      switch (p.type) {
        case 'bubble':
          // Rise upward with wobble
          p.vy -= 30 * deltaTime;
          p.vx += Math.sin(Date.now() * 0.005 + i) * 15 * deltaTime;
          break;
        case 'wave':
          // Horizontal flow with sine motion
          p.vy = Math.sin(Date.now() * 0.003 + p.x * 0.01) * 20;
          p.vx *= 0.98;
          break;
        case 'sparkle':
          // Float gently with sparkle
          p.vy -= 5 * deltaTime;
          p.vx *= 0.97;
          break;
        case 'trail':
          // Submarine propeller wash - spread out
          p.vx -= 40 * deltaTime;
          p.vy *= 0.95;
          break;
        case 'debris':
          // Slowly sink
          p.vy += 8 * deltaTime;
          p.vx *= 0.98;
          break;
        case 'danger':
          // Pulse in place
          p.vx *= 0.9;
          p.vy *= 0.9;
          break;
      }
    }
  }

  emit(
    x: number,
    y: number,
    type: ParticleType,
    count: number = 1,
    options: Partial<{
      color: [number, number, number];
      size: number;
      life: number;
      spread: number;
      speed: number;
    }> = {}
  ): void {
    const {
      color = COLORS.bubbleWhite as [number, number, number],
      size = 15,
      life = 1.5,
      spread = 50,
      speed = 50,
    } = options;

    for (let i = 0; i < count && this.particles.length < this.maxParticles; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * spread;

      this.particles.push({
        x: x + Math.cos(angle) * dist,
        y: y + Math.sin(angle) * dist,
        vx: (Math.random() - 0.5) * speed,
        vy: (Math.random() - 0.5) * speed,
        color: [...color, 1],
        size: size * (0.8 + Math.random() * 0.4),
        life: life * (0.8 + Math.random() * 0.4),
        maxLife: life,
        type,
      });
    }
  }

  // Submarine moving - propeller bubbles
  emitSubmarineTrail(x: number, y: number): void {
    // Propeller wash
    this.emit(x - 40, y, 'trail', 2, {
      color: COLORS.bubbleBlue as [number, number, number],
      size: 12,
      life: 0.5,
      spread: 10,
      speed: 30,
    });

    // Bubbles
    this.emit(x - 35, y, 'bubble', 1, {
      color: COLORS.bubbleWhite as [number, number, number],
      size: 8,
      life: 1.2,
      spread: 8,
      speed: 20,
    });
  }

  // Submarine depth change
  emitDepthChange(x: number, y: number, direction: number): void {
    // Bubbles from movement
    for (let i = 0; i < 5; i++) {
      this.emit(x + i * 10, y, 'bubble', 1, {
        color: COLORS.bubbleWhite as [number, number, number],
        size: 10,
        life: 1.0,
        spread: 15,
        speed: 40,
      });
    }

    // Wave disturbance
    this.emit(x, y, 'wave', 3, {
      color: COLORS.currentBlue as [number, number, number],
      size: 20,
      life: 0.6,
      spread: 25,
      speed: 50,
    });
  }

  // Oxygen collected
  emitOxygenCollect(x: number, y: number): void {
    // Cyan sparkles
    this.emit(x, y, 'sparkle', 8, {
      color: COLORS.oxygenCyan as [number, number, number],
      size: 12,
      life: 0.8,
      spread: 20,
      speed: 80,
    });

    // Rising bubbles
    this.emit(x, y, 'bubble', 5, {
      color: COLORS.bubbleBlue as [number, number, number],
      size: 10,
      life: 1.5,
      spread: 15,
      speed: 50,
    });
  }

  // Star collected
  emitStarCollect(x: number, y: number): void {
    // Golden sparkles
    this.emit(x, y, 'sparkle', 12, {
      color: COLORS.starGold as [number, number, number],
      size: 14,
      life: 1.0,
      spread: 25,
      speed: 100,
    });

    // Light burst
    this.emit(x, y, 'sparkle', 4, {
      color: COLORS.sparkle as [number, number, number],
      size: 20,
      life: 0.6,
      spread: 10,
      speed: 60,
    });
  }

  // Collision/danger
  emitCollision(x: number, y: number): void {
    // Danger particles
    this.emit(x, y, 'danger', 8, {
      color: COLORS.dangerRed as [number, number, number],
      size: 20,
      life: 0.8,
      spread: 30,
      speed: 60,
    });

    // Debris
    this.emit(x, y, 'debris', 10, {
      color: COLORS.rockGray as [number, number, number],
      size: 8,
      life: 1.2,
      spread: 40,
      speed: 80,
    });

    // Bubbles from impact
    this.emit(x, y, 'bubble', 15, {
      color: COLORS.bubbleWhite as [number, number, number],
      size: 10,
      life: 1.5,
      spread: 50,
      speed: 100,
    });
  }

  // Victory
  emitVictory(width: number, height: number): void {
    const centerX = width / 2;
    const centerY = height / 2;

    // Massive bubble celebration
    for (let i = 0; i < 40; i++) {
      setTimeout(() => {
        this.emit(
          randomRange(width * 0.1, width * 0.9),
          randomRange(height * 0.3, height * 0.9),
          'bubble',
          3,
          {
            color: COLORS.bubbleWhite as [number, number, number],
            size: 15,
            life: 2.0,
            spread: 20,
            speed: 60,
          }
        );
      }, i * 40);
    }

    // Golden sparkles
    for (let i = 0; i < 30; i++) {
      setTimeout(() => {
        this.emit(
          randomRange(0, width),
          randomRange(0, height),
          'sparkle',
          2,
          {
            color: COLORS.starGold as [number, number, number],
            size: 12,
            life: 1.5,
            spread: 30,
            speed: 80,
          }
        );
      }, i * 50);
    }

    // Success glow at center
    this.emit(centerX, centerY, 'sparkle', 10, {
      color: COLORS.success as [number, number, number],
      size: 25,
      life: 1.5,
      spread: 40,
      speed: 50,
    });
  }

  // Level start
  emitLevelStart(x: number, y: number, width: number, height: number): void {
    // Submarine startup bubbles
    for (let i = 0; i < 8; i++) {
      this.emit(x - 30, y, 'bubble', 2, {
        color: COLORS.bubbleWhite as [number, number, number],
        size: 10,
        life: 1.2,
        spread: 15,
        speed: 40,
      });
    }

    // Wave effect
    this.emit(x, y, 'wave', 5, {
      color: COLORS.currentBlue as [number, number, number],
      size: 25,
      life: 1.0,
      spread: 30,
      speed: 40,
    });

    // Ambient bubbles throughout
    for (let i = 0; i < 10; i++) {
      this.emit(
        randomRange(0, width),
        randomRange(height * 0.5, height),
        'bubble',
        1,
        {
          color: COLORS.bubbleBlue as [number, number, number],
          size: 6,
          life: 2.0,
          spread: 0,
          speed: 15,
        }
      );
    }
  }

  // Reset
  emitReset(width: number, height: number): void {
    // Bubbles dispersing
    for (let i = 0; i < 20; i++) {
      this.emit(
        randomRange(width * 0.2, width * 0.8),
        randomRange(height * 0.3, height * 0.7),
        'bubble',
        1,
        {
          color: COLORS.bubbleWhite as [number, number, number],
          size: 8,
          life: 1.0,
          spread: 20,
          speed: 50,
        }
      );
    }

    // Current waves
    this.emit(width / 2, height / 2, 'wave', 8, {
      color: COLORS.currentBlue as [number, number, number],
      size: 18,
      life: 0.8,
      spread: 60,
      speed: 40,
    });
  }

  // Ambient underwater particles
  emitAmbient(width: number, height: number): void {
    // Random bubbles rising
    if (Math.random() < 0.4) {
      this.emit(
        randomRange(0, width),
        height - randomRange(0, 50),
        'bubble',
        1,
        {
          color: COLORS.bubbleBlue as [number, number, number],
          size: randomRange(4, 10),
          life: randomRange(2, 4),
          spread: 0,
          speed: 15,
        }
      );
    }

    // Occasional debris/sediment
    if (Math.random() < 0.15) {
      this.emit(
        randomRange(0, width),
        randomRange(0, height * 0.3),
        'debris',
        1,
        {
          color: COLORS.rockGray as [number, number, number],
          size: randomRange(3, 6),
          life: randomRange(2, 3),
          spread: 0,
          speed: 8,
        }
      );
    }

    // Light sparkles in water
    if (Math.random() < 0.2) {
      this.emit(
        randomRange(0, width),
        randomRange(0, height * 0.5),
        'sparkle',
        1,
        {
          color: COLORS.sparkle as [number, number, number],
          size: randomRange(4, 8),
          life: randomRange(0.5, 1.0),
          spread: 0,
          speed: 5,
        }
      );
    }
  }

  getParticleData(): Float32Array {
    const data = new Float32Array(this.particles.length * 12);

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      const offset = i * 12;

      data[offset] = p.x;
      data[offset + 1] = p.y;
      data[offset + 2] = p.vx;
      data[offset + 3] = p.vy;
      data[offset + 4] = p.color[0];
      data[offset + 5] = p.color[1];
      data[offset + 6] = p.color[2];
      data[offset + 7] = p.color[3];
      data[offset + 8] = p.size;
      data[offset + 9] = p.life;
      data[offset + 10] = p.maxLife;
      data[offset + 11] = PARTICLE_TYPE_MAP[p.type];
    }

    return data;
  }

  getParticleCount(): number {
    return this.particles.length;
  }

  clear(): void {
    this.particles = [];
  }
}
