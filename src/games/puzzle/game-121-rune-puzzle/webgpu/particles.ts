/**
 * WebGPU Particle System - Rune Puzzle
 * Mystical / Ancient Runes Theme
 * Game #121
 */

import { randomRange, COLORS, easeOutCubic, spiralPosition } from './math';

export type ParticleType = 'rune' | 'crystal' | 'energy' | 'sparkle' | 'arcane' | 'glow';

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
  rune: 0,
  crystal: 1,
  energy: 2,
  sparkle: 3,
  arcane: 4,
  glow: 5,
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
        case 'rune':
          // Slow rotation drift
          const angle = Date.now() * 0.002 + i;
          p.vx += Math.cos(angle) * 5 * deltaTime;
          p.vy += Math.sin(angle) * 5 * deltaTime;
          p.vx *= 0.98;
          p.vy *= 0.98;
          break;
        case 'crystal':
          // Falling with slight sway
          p.vy += 30 * deltaTime;
          p.vx = Math.sin(Date.now() * 0.005 + i) * 20;
          break;
        case 'energy':
          // Spiral motion
          const spiralAngle = Date.now() * 0.003 + i * 0.5;
          p.vx = Math.cos(spiralAngle) * 40;
          p.vy = Math.sin(spiralAngle) * 40;
          break;
        case 'sparkle':
          // Twinkling float
          p.vy -= 20 * deltaTime;
          p.vx *= 0.95;
          break;
        case 'arcane':
          // Rising flame
          p.vy -= 40 * deltaTime;
          p.vx += (Math.random() - 0.5) * 30 * deltaTime;
          break;
        case 'glow':
          // Gentle float
          p.vx *= 0.98;
          p.vy *= 0.98;
          p.vx += Math.sin(Date.now() * 0.002 + i) * 3 * deltaTime;
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
      color = COLORS.purple as [number, number, number],
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

  // Rune clicked - rotation effect
  emitRuneRotate(x: number, y: number, runeColor: string): void {
    const colorMap: Record<string, [number, number, number]> = {
      '#9b59b6': COLORS.runePurple as [number, number, number],
      '#3498db': COLORS.runeBlue as [number, number, number],
      '#e74c3c': COLORS.runeRed as [number, number, number],
      '#2ecc71': COLORS.runeGreen as [number, number, number],
      '#f39c12': COLORS.runeOrange as [number, number, number],
      '#1abc9c': COLORS.runeTeal as [number, number, number],
    };

    const color = colorMap[runeColor] || COLORS.purple as [number, number, number];

    // Rotating rune particles
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      this.emit(
        x + Math.cos(angle) * 35,
        y + Math.sin(angle) * 35,
        'rune',
        1,
        {
          color,
          size: 15,
          life: 0.6,
          spread: 5,
          speed: 30,
        }
      );
    }

    // Center sparkles
    this.emit(x, y, 'sparkle', 5, {
      color,
      size: 12,
      life: 0.5,
      spread: 20,
      speed: 60,
    });
  }

  // Rune aligned - success effect
  emitRuneAligned(x: number, y: number): void {
    // Energy burst
    this.emit(x, y, 'energy', 10, {
      color: COLORS.energy as [number, number, number],
      size: 20,
      life: 1.0,
      spread: 30,
      speed: 80,
    });

    // Crystal shards
    this.emit(x, y, 'crystal', 6, {
      color: COLORS.crystal as [number, number, number],
      size: 12,
      life: 0.8,
      spread: 25,
      speed: 50,
    });

    // Glow
    this.emit(x, y, 'glow', 3, {
      color: COLORS.energyGlow as [number, number, number],
      size: 30,
      life: 1.2,
      spread: 10,
      speed: 10,
    });
  }

  // All runes aligned - victory
  emitVictory(width: number, height: number): void {
    const centerX = width / 2;
    const centerY = height / 2;

    // Massive energy explosion
    for (let i = 0; i < 40; i++) {
      setTimeout(() => {
        const angle = (i / 40) * Math.PI * 2;
        const radius = 50 + i * 3;
        this.emit(
          centerX + Math.cos(angle) * radius,
          centerY + Math.sin(angle) * radius,
          'energy',
          3,
          {
            color: COLORS.energyGlow as [number, number, number],
            size: 25,
            life: 1.5,
            spread: 20,
            speed: 100,
          }
        );
      }, i * 30);
    }

    // Crystal shower
    for (let i = 0; i < 30; i++) {
      setTimeout(() => {
        this.emit(
          randomRange(0, width),
          randomRange(0, height * 0.3),
          'crystal',
          2,
          {
            color: COLORS.crystalGlow as [number, number, number],
            size: 15,
            life: 2,
            spread: 30,
            speed: 40,
          }
        );
      }, i * 50);
    }

    // Arcane flames at center
    this.emit(centerX, centerY, 'arcane', 15, {
      color: COLORS.energy as [number, number, number],
      size: 25,
      life: 2,
      spread: 50,
      speed: 60,
    });

    // Sparkle burst
    this.emit(centerX, centerY, 'sparkle', 20, {
      color: COLORS.light as [number, number, number],
      size: 18,
      life: 1.5,
      spread: 100,
      speed: 120,
    });
  }

  // Level start
  emitLevelStart(width: number, height: number): void {
    const centerX = width / 2;
    const centerY = height / 2;

    // Magic circle activation
    for (let i = 0; i < 16; i++) {
      const angle = (i / 16) * Math.PI * 2;
      const radius = 100;
      this.emit(
        centerX + Math.cos(angle) * radius,
        centerY + Math.sin(angle) * radius,
        'rune',
        1,
        {
          color: COLORS.purple as [number, number, number],
          size: 18,
          life: 1.2,
          spread: 5,
          speed: 20,
        }
      );
    }

    // Center glow
    this.emit(centerX, centerY, 'glow', 5, {
      color: COLORS.crystal as [number, number, number],
      size: 30,
      life: 1.5,
      spread: 30,
      speed: 20,
    });
  }

  // Reset effect
  emitReset(width: number, height: number): void {
    const centerX = width / 2;
    const centerY = height / 2;

    // Arcane dispersion
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      this.emit(
        centerX + Math.cos(angle) * 60,
        centerY + Math.sin(angle) * 60,
        'arcane',
        2,
        {
          color: COLORS.arcaneFire as [number, number, number],
          size: 15,
          life: 0.8,
          spread: 15,
          speed: 50,
        }
      );
    }
  }

  // Ambient mystical particles
  emitAmbient(width: number, height: number): void {
    if (Math.random() < 0.4) {
      const x = randomRange(0, width);
      const y = randomRange(0, height);

      const types: ParticleType[] = ['sparkle', 'glow', 'energy'];
      const type = types[Math.floor(Math.random() * types.length)];

      const colors = [COLORS.purple, COLORS.crystal, COLORS.arcane];
      const color = colors[Math.floor(Math.random() * colors.length)] as [number, number, number];

      this.emit(x, y, type, 1, {
        color,
        size: randomRange(5, 10),
        life: randomRange(2, 4),
        spread: 0,
        speed: 15,
      });
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
