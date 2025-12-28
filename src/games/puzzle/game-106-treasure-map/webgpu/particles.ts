/**
 * WebGPU Particle System - Treasure Map
 * Pirate Adventure / Nautical Theme
 * Game #106
 */

export type ParticleType = 'sparkle' | 'compass' | 'scroll' | 'wave' | 'discover' | 'treasure';

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  type: ParticleType;
  param1: number;
  param2: number;
}

const PARTICLE_TYPE_MAP: Record<ParticleType, number> = {
  sparkle: 0,
  compass: 1,
  scroll: 2,
  wave: 3,
  discover: 4,
  treasure: 5,
};

export class ParticleSystem {
  private particles: Particle[] = [];
  private width: number;
  private height: number;
  private maxParticles: number = 500;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
  }

  public resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
  }

  public update(deltaTime: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= deltaTime;

      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      p.x += p.vx * deltaTime;
      p.y += p.vy * deltaTime;

      switch (p.type) {
        case 'sparkle':
          p.size = p.param1 * (0.5 + 0.5 * Math.sin(p.life * 10));
          break;
        case 'compass':
          const angle = p.param2 + p.life * 2;
          p.vx = Math.cos(angle) * 30;
          p.vy = Math.sin(angle) * 30;
          break;
        case 'scroll':
          p.vx += (Math.random() - 0.5) * 20 * deltaTime;
          p.vy += 30 * deltaTime;
          p.size *= 0.99;
          break;
        case 'wave':
          p.vx += Math.sin(p.life * 3) * 20 * deltaTime;
          p.vy -= 20 * deltaTime;
          p.size *= 0.98;
          break;
        case 'discover':
          const burstAngle = p.param2 * Math.PI * 2;
          p.vx = Math.cos(burstAngle) * 80 * (p.life / p.maxLife);
          p.vy = Math.sin(burstAngle) * 80 * (p.life / p.maxLife);
          break;
        case 'treasure':
          p.vy += 100 * deltaTime;
          p.vx *= 0.99;
          break;
      }
    }
  }

  private emit(type: ParticleType, x: number, y: number, options: Partial<Particle> = {}): void {
    if (this.particles.length >= this.maxParticles) return;

    this.particles.push({
      x,
      y,
      vx: options.vx ?? 0,
      vy: options.vy ?? 0,
      life: options.life ?? 1,
      maxLife: options.maxLife ?? options.life ?? 1,
      size: options.size ?? 10,
      type,
      param1: options.param1 ?? Math.random(),
      param2: options.param2 ?? Math.random(),
    });
  }

  public emitAmbient(): void {
    // Occasional sparkles on map
    if (Math.random() > 0.97) {
      this.emit('sparkle', Math.random() * this.width, Math.random() * this.height * 0.8, {
        life: 1 + Math.random(),
        size: 6 + Math.random() * 8,
        param1: 6 + Math.random() * 8,
        param2: Math.random(),
      });
    }

    // Ocean waves at bottom
    if (Math.random() > 0.96) {
      this.emit('wave', Math.random() * this.width, this.height - 20 + Math.random() * 30, {
        vx: 20 + Math.random() * 20,
        vy: -10,
        life: 1.5 + Math.random(),
        size: 8 + Math.random() * 10,
      });
    }
  }

  // Tile click effect
  public emitClick(x: number, y: number): void {
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      this.emit('scroll', x, y, {
        vx: Math.cos(angle) * 40,
        vy: Math.sin(angle) * 40,
        life: 0.6 + Math.random() * 0.3,
        size: 6 + Math.random() * 6,
      });
    }
  }

  // Correct clue found
  public emitDiscover(x: number, y: number): void {
    for (let i = 0; i < 15; i++) {
      this.emit('discover', x, y, {
        vx: 0,
        vy: 0,
        life: 0.8 + Math.random() * 0.4,
        size: 10 + Math.random() * 8,
        param2: i / 15,
      });
    }

    // Add sparkles
    for (let i = 0; i < 10; i++) {
      this.emit('sparkle', x + (Math.random() - 0.5) * 60, y + (Math.random() - 0.5) * 60, {
        life: 1 + Math.random() * 0.5,
        size: 8 + Math.random() * 6,
        param1: 8 + Math.random() * 6,
        param2: Math.random() < 0.7 ? 0 : 1,
      });
    }
  }

  // Reset - compass spin
  public emitReset(): void {
    const centerX = this.width / 2;
    const centerY = this.height / 2;

    for (let i = 0; i < 20; i++) {
      const angle = (i / 20) * Math.PI * 2;
      this.emit('compass', centerX, centerY, {
        vx: Math.cos(angle) * 60,
        vy: Math.sin(angle) * 60,
        life: 1.2 + Math.random() * 0.5,
        size: 8 + Math.random() * 6,
        param2: angle,
      });
    }

    // Scroll particles
    for (let i = 0; i < 15; i++) {
      this.emit('scroll', centerX + (Math.random() - 0.5) * 200, centerY + (Math.random() - 0.5) * 100, {
        vx: (Math.random() - 0.5) * 80,
        vy: -30 - Math.random() * 40,
        life: 1 + Math.random() * 0.5,
        size: 8 + Math.random() * 10,
      });
    }
  }

  // Victory - treasure found!
  public emitVictory(): void {
    const centerX = this.width / 2;
    const centerY = this.height / 2;

    // Gold shower
    for (let i = 0; i < 50; i++) {
      this.emit('treasure', centerX + (Math.random() - 0.5) * 300, -20 - Math.random() * 100, {
        vx: (Math.random() - 0.5) * 100,
        vy: 50 + Math.random() * 50,
        life: 3 + Math.random() * 2,
        size: 10 + Math.random() * 10,
        param1: Math.random(),
        param2: Math.random() < 0.8 ? 0 : Math.random(),
      });
    }

    // Sparkle explosion
    for (let i = 0; i < 30; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 80 + Math.random() * 80;
      this.emit('sparkle', centerX, centerY, {
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1.5 + Math.random(),
        size: 12 + Math.random() * 10,
        param1: 12 + Math.random() * 10,
        param2: 0,
      });
    }
  }

  // Level start
  public emitLevelStart(): void {
    const centerX = this.width / 2;

    for (let i = 0; i < 12; i++) {
      this.emit('compass', centerX, this.height * 0.3, {
        vx: (Math.random() - 0.5) * 80,
        vy: (Math.random() - 0.5) * 80,
        life: 1.2 + Math.random() * 0.5,
        size: 10 + Math.random() * 6,
        param2: Math.random() * Math.PI * 2,
      });
    }

    for (let i = 0; i < 8; i++) {
      this.emit('sparkle', Math.random() * this.width, Math.random() * this.height * 0.6, {
        life: 1.5 + Math.random(),
        size: 8 + Math.random() * 8,
        param1: 8 + Math.random() * 8,
        param2: 0,
      });
    }
  }

  public clear(): void {
    this.particles = [];
  }

  public getParticleCount(): number {
    return this.particles.length;
  }

  public getParticleData(): Float32Array {
    const data = new Float32Array(this.maxParticles * 10);
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      const offset = i * 10;
      data[offset] = p.x;
      data[offset + 1] = p.y;
      data[offset + 2] = p.vx;
      data[offset + 3] = p.vy;
      data[offset + 4] = p.life;
      data[offset + 5] = p.maxLife;
      data[offset + 6] = p.size;
      data[offset + 7] = PARTICLE_TYPE_MAP[p.type];
      data[offset + 8] = p.param1;
      data[offset + 9] = p.param2;
    }
    return data;
  }
}
