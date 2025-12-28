/**
 * WebGPU Particle System - Map Puzzle
 * Cartography / Explorer Theme
 * Game #120
 */

import { randomRange, COLORS, easeOutCubic } from './math';

export type ParticleType = 'compass' | 'terrain' | 'explorer' | 'trail' | 'sparkle' | 'glow';

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
  compass: 0,
  terrain: 1,
  explorer: 2,
  trail: 3,
  sparkle: 4,
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
        case 'compass':
          // Slow spin effect
          p.vx *= 0.98;
          p.vy *= 0.98;
          break;
        case 'terrain':
          // Settle down
          p.vy += 20 * deltaTime;
          p.vx *= 0.95;
          break;
        case 'explorer':
          // Walk pattern
          p.vx *= 0.92;
          p.vy *= 0.92;
          break;
        case 'trail':
          // Dust dispersal
          p.vy -= 15 * deltaTime;
          p.vx *= 0.96;
          break;
        case 'sparkle':
          // Twinkling float
          p.vy += Math.sin(Date.now() * 0.01 + i) * 10 * deltaTime;
          break;
        case 'glow':
          // Gentle drift
          p.vx += Math.sin(Date.now() * 0.002 + i) * 5 * deltaTime;
          p.vy += Math.cos(Date.now() * 0.002 + i * 0.5) * 5 * deltaTime;
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
      color = COLORS.parchment as [number, number, number],
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

  // Piece picked up - compass and terrain particles
  emitPiecePickup(x: number, y: number, landType: string): void {
    const landColors: Record<string, [number, number, number]> = {
      land: COLORS.land as [number, number, number],
      water: COLORS.water as [number, number, number],
      mountain: COLORS.mountain as [number, number, number],
      forest: COLORS.forest as [number, number, number],
      desert: COLORS.desert as [number, number, number],
    };

    const color = landColors[landType] || COLORS.land as [number, number, number];

    // Compass indicator
    this.emit(x, y, 'compass', 1, {
      color: COLORS.compassGold as [number, number, number],
      size: 25,
      life: 0.8,
      spread: 5,
      speed: 20,
    });

    // Terrain particles
    this.emit(x, y, 'terrain', 6, {
      color,
      size: 12,
      life: 0.6,
      spread: 30,
      speed: 40,
    });
  }

  // Piece placed correctly - discovery sparkles
  emitPiecePlaced(x: number, y: number, landType: string): void {
    const landColors: Record<string, [number, number, number]> = {
      land: COLORS.land as [number, number, number],
      water: COLORS.water as [number, number, number],
      mountain: COLORS.mountain as [number, number, number],
      forest: COLORS.forest as [number, number, number],
      desert: COLORS.desert as [number, number, number],
    };

    const color = landColors[landType] || COLORS.land as [number, number, number];

    // Discovery sparkles
    this.emit(x, y, 'sparkle', 8, {
      color: COLORS.discovery as [number, number, number],
      size: 18,
      life: 1.0,
      spread: 40,
      speed: 60,
    });

    // Terrain settling
    this.emit(x, y, 'terrain', 5, {
      color,
      size: 10,
      life: 0.5,
      spread: 25,
      speed: 30,
    });

    // Glow effect
    this.emit(x, y, 'glow', 3, {
      color: COLORS.discovery as [number, number, number],
      size: 30,
      life: 0.8,
      spread: 10,
      speed: 10,
    });
  }

  // Dragging trail
  emitDragTrail(x: number, y: number): void {
    this.emit(x, y, 'trail', 2, {
      color: COLORS.trail as [number, number, number],
      size: 8,
      life: 0.4,
      spread: 5,
      speed: 15,
    });

    // Explorer footprints occasionally
    if (Math.random() < 0.1) {
      this.emit(x, y, 'explorer', 1, {
        color: COLORS.sepia as [number, number, number],
        size: 12,
        life: 0.8,
        spread: 2,
        speed: 5,
      });
    }
  }

  // Ambient cartography particles
  emitAmbient(width: number, height: number): void {
    if (Math.random() < 0.3) {
      const x = randomRange(0, width);
      const y = randomRange(0, height);

      const types: ParticleType[] = ['sparkle', 'glow', 'trail'];
      const type = types[Math.floor(Math.random() * types.length)];

      this.emit(x, y, type, 1, {
        color: COLORS.parchment as [number, number, number],
        size: randomRange(4, 8),
        life: randomRange(1.5, 3),
        spread: 0,
        speed: 10,
      });
    }
  }

  // Victory celebration
  emitVictory(width: number, height: number): void {
    const centerX = width / 2;
    const centerY = height / 2;

    // Large compass burst
    this.emit(centerX, centerY, 'compass', 4, {
      color: COLORS.compassGold as [number, number, number],
      size: 40,
      life: 2,
      spread: 50,
      speed: 100,
    });

    // Discovery sparkles everywhere
    for (let i = 0; i < 30; i++) {
      setTimeout(() => {
        this.emit(
          randomRange(0, width),
          randomRange(0, height),
          'sparkle',
          3,
          {
            color: COLORS.discovery as [number, number, number],
            size: 20,
            life: 1.5,
            spread: 30,
            speed: 80,
          }
        );
      }, i * 50);
    }

    // Terrain celebration
    for (const landType of ['land', 'water', 'mountain', 'forest', 'desert']) {
      const landColors: Record<string, [number, number, number]> = {
        land: COLORS.land as [number, number, number],
        water: COLORS.water as [number, number, number],
        mountain: COLORS.mountain as [number, number, number],
        forest: COLORS.forest as [number, number, number],
        desert: COLORS.desert as [number, number, number],
      };

      this.emit(
        randomRange(width * 0.2, width * 0.8),
        randomRange(height * 0.2, height * 0.8),
        'terrain',
        5,
        {
          color: landColors[landType],
          size: 15,
          life: 1.2,
          spread: 40,
          speed: 60,
        }
      );
    }
  }

  // Level start
  emitLevelStart(width: number, height: number): void {
    const centerX = width / 2;
    const centerY = height / 2;

    // Compass orientation
    this.emit(centerX, centerY, 'compass', 2, {
      color: COLORS.compassGold as [number, number, number],
      size: 35,
      life: 1.5,
      spread: 20,
      speed: 40,
    });

    // Map reveal glow
    this.emit(centerX, centerY, 'glow', 8, {
      color: COLORS.parchment as [number, number, number],
      size: 25,
      life: 1.2,
      spread: 100,
      speed: 50,
    });
  }

  // Reset effect
  emitReset(width: number, height: number): void {
    const centerX = width / 2;
    const centerY = height / 2;

    // Trail dust swirl
    for (let i = 0; i < 20; i++) {
      const angle = (i / 20) * Math.PI * 2;
      this.emit(
        centerX + Math.cos(angle) * 80,
        centerY + Math.sin(angle) * 80,
        'trail',
        2,
        {
          color: COLORS.trail as [number, number, number],
          size: 10,
          life: 0.8,
          spread: 10,
          speed: 40,
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
