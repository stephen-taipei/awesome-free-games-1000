/**
 * WebGPU Particle System - Totem Puzzle
 * Ancient Tribal / Spirit Theme
 * Game #104
 */

export type ParticleType = 'spirit' | 'fire' | 'dust' | 'glow' | 'smoke' | 'magic';

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
  spirit: 0,
  fire: 1,
  dust: 2,
  glow: 3,
  smoke: 4,
  magic: 5,
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

      // Type-specific behaviors
      switch (p.type) {
        case 'spirit':
          p.vx += Math.sin(p.life * 3 + p.param1) * 20 * deltaTime;
          p.vy -= 15 * deltaTime;
          break;
        case 'fire':
          p.vy -= 80 * deltaTime;
          p.vx += (Math.random() - 0.5) * 50 * deltaTime;
          p.size *= 0.98;
          break;
        case 'dust':
          p.vx += Math.sin(p.life * 2) * 10 * deltaTime;
          p.vy += 20 * deltaTime;
          break;
        case 'glow':
          p.size = p.param2 * (0.8 + 0.2 * Math.sin(p.life * 8));
          break;
        case 'smoke':
          p.vy -= 30 * deltaTime;
          p.vx += Math.sin(p.life * 1.5) * 15 * deltaTime;
          p.size += 10 * deltaTime;
          break;
        case 'magic':
          const angle = p.life * 5 + p.param1 * Math.PI * 2;
          p.vx = Math.cos(angle) * 100 * (p.life / p.maxLife);
          p.vy = Math.sin(angle) * 100 * (p.life / p.maxLife);
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

  // Ambient spirit orbs floating around
  public emitAmbient(): void {
    if (Math.random() > 0.02) return;

    this.emit('spirit', Math.random() * this.width, this.height + 20, {
      vx: (Math.random() - 0.5) * 30,
      vy: -20 - Math.random() * 30,
      life: 4 + Math.random() * 3,
      size: 8 + Math.random() * 12,
    });

    // Occasional torch fire
    if (Math.random() < 0.3) {
      const torchX = Math.random() < 0.5 ? this.width * 0.1 : this.width * 0.9;
      this.emit('fire', torchX + (Math.random() - 0.5) * 20, this.height * 0.3, {
        vx: (Math.random() - 0.5) * 20,
        vy: -40 - Math.random() * 30,
        life: 0.5 + Math.random() * 0.5,
        size: 10 + Math.random() * 15,
      });
    }
  }

  // Selection glow around selected pole
  public emitSelect(x: number, y: number, height: number): void {
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const radius = 40;
      this.emit('glow', x + Math.cos(angle) * radius, y - height * 0.5, {
        vx: Math.cos(angle) * 5,
        vy: Math.sin(angle) * 5,
        life: 0.8,
        size: 20,
        param2: 20,
      });
    }
  }

  // Block move - dust and smoke
  public emitMove(fromX: number, fromY: number, toX: number, toY: number): void {
    // Dust from lift
    for (let i = 0; i < 8; i++) {
      this.emit('dust', fromX + (Math.random() - 0.5) * 40, fromY, {
        vx: (Math.random() - 0.5) * 60,
        vy: -20 - Math.random() * 40,
        life: 0.6 + Math.random() * 0.4,
        size: 6 + Math.random() * 8,
      });
    }

    // Smoke trail
    for (let i = 0; i < 5; i++) {
      this.emit('smoke', (fromX + toX) / 2 + (Math.random() - 0.5) * 30, (fromY + toY) / 2, {
        vx: (Math.random() - 0.5) * 20,
        vy: -10,
        life: 1 + Math.random() * 0.5,
        size: 15 + Math.random() * 10,
      });
    }

    // Dust from landing
    for (let i = 0; i < 6; i++) {
      this.emit('dust', toX + (Math.random() - 0.5) * 40, toY, {
        vx: (Math.random() - 0.5) * 80,
        vy: 20 + Math.random() * 20,
        life: 0.5 + Math.random() * 0.3,
        size: 5 + Math.random() * 6,
      });
    }
  }

  // Undo effect - reverse spirits
  public emitUndo(x: number, y: number): void {
    for (let i = 0; i < 10; i++) {
      const angle = (i / 10) * Math.PI * 2;
      this.emit('spirit', x, y, {
        vx: Math.cos(angle) * 60,
        vy: Math.sin(angle) * 60,
        life: 0.8 + Math.random() * 0.4,
        size: 10 + Math.random() * 8,
      });
    }
  }

  // Reset explosion
  public emitReset(): void {
    const centerX = this.width / 2;
    const centerY = this.height / 2;

    for (let i = 0; i < 30; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 100 + Math.random() * 100;
      this.emit('smoke', centerX, centerY, {
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1.5 + Math.random() * 0.5,
        size: 20 + Math.random() * 20,
      });
    }

    for (let i = 0; i < 15; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 80 + Math.random() * 80;
      this.emit('dust', centerX, centerY, {
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1 + Math.random() * 0.5,
        size: 8 + Math.random() * 10,
      });
    }
  }

  // Victory - magical tribal celebration
  public emitVictory(): void {
    const centerX = this.width / 2;
    const centerY = this.height / 2;

    // Magic spiral
    for (let i = 0; i < 40; i++) {
      const angle = (i / 40) * Math.PI * 8;
      const radius = i * 3;
      this.emit('magic', centerX + Math.cos(angle) * radius, centerY + Math.sin(angle) * radius, {
        vx: 0,
        vy: 0,
        life: 2 + Math.random(),
        size: 12 + Math.random() * 8,
        param1: i / 40,
      });
    }

    // Spirit celebration
    for (let i = 0; i < 20; i++) {
      const angle = (i / 20) * Math.PI * 2;
      this.emit('spirit', centerX, centerY, {
        vx: Math.cos(angle) * 120,
        vy: Math.sin(angle) * 120,
        life: 2.5 + Math.random(),
        size: 15 + Math.random() * 10,
      });
    }

    // Fire celebration
    for (let i = 0; i < 25; i++) {
      this.emit('fire', centerX + (Math.random() - 0.5) * 200, centerY + (Math.random() - 0.5) * 100, {
        vx: (Math.random() - 0.5) * 40,
        vy: -60 - Math.random() * 80,
        life: 1 + Math.random() * 0.8,
        size: 15 + Math.random() * 15,
      });
    }
  }

  // Level start - awakening effect
  public emitLevelStart(): void {
    for (let i = 0; i < 15; i++) {
      const x = Math.random() * this.width;
      this.emit('spirit', x, this.height, {
        vx: (Math.random() - 0.5) * 30,
        vy: -50 - Math.random() * 40,
        life: 2 + Math.random() * 1.5,
        size: 10 + Math.random() * 12,
      });
    }

    // Ground dust
    for (let i = 0; i < 20; i++) {
      this.emit('dust', Math.random() * this.width, this.height - 40, {
        vx: (Math.random() - 0.5) * 50,
        vy: -30 - Math.random() * 30,
        life: 0.8 + Math.random() * 0.5,
        size: 6 + Math.random() * 8,
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
