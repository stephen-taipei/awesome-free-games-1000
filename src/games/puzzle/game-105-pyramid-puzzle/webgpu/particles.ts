/**
 * WebGPU Particle System - Pyramid Puzzle
 * Ancient Egypt / Desert Mystique Theme
 * Game #105
 */

export type ParticleType = 'sand' | 'star' | 'sacred' | 'flip' | 'dust' | 'pharaoh';

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
  sand: 0,
  star: 1,
  sacred: 2,
  flip: 3,
  dust: 4,
  pharaoh: 5,
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
        case 'sand':
          p.vx += (Math.random() - 0.5) * 30 * deltaTime;
          p.vy += 25 * deltaTime;
          break;
        case 'star':
          // Stars just twinkle in place
          p.size = p.param2 * (0.5 + 0.5 * Math.sin(p.life * 5 + p.param1 * 10));
          break;
        case 'sacred':
          const angle = p.life * 3 + p.param1 * Math.PI * 2;
          p.vx = Math.cos(angle) * 20;
          p.vy = Math.sin(angle) * 20;
          break;
        case 'flip':
          p.size *= 0.98;
          const burstAngle = p.param2 * Math.PI * 2;
          p.vx = Math.cos(burstAngle) * 60 * (p.life / p.maxLife);
          p.vy = Math.sin(burstAngle) * 60 * (p.life / p.maxLife);
          break;
        case 'dust':
          p.vx += Math.sin(p.life * 2) * 20 * deltaTime;
          p.vy -= 5 * deltaTime;
          break;
        case 'pharaoh':
          p.vx *= 0.98;
          p.vy *= 0.98;
          p.size *= 1.01;
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

  // Ambient desert atmosphere
  public emitAmbient(): void {
    // Occasional sand particles
    if (Math.random() > 0.95) {
      this.emit('sand', Math.random() * this.width, 0, {
        vx: 20 + Math.random() * 30,
        vy: 10 + Math.random() * 20,
        life: 3 + Math.random() * 2,
        size: 4 + Math.random() * 6,
      });
    }

    // Desert dust
    if (Math.random() > 0.97) {
      this.emit('dust', -20, this.height - 100 + Math.random() * 80, {
        vx: 30 + Math.random() * 40,
        vy: -5 + Math.random() * 10,
        life: 4 + Math.random() * 2,
        size: 8 + Math.random() * 12,
      });
    }

    // Twinkling stars in sky area
    if (Math.random() > 0.98) {
      this.emit('star', Math.random() * this.width, Math.random() * this.height * 0.5, {
        vx: 0,
        vy: 0,
        life: 3 + Math.random() * 4,
        size: 3 + Math.random() * 5,
        param2: 3 + Math.random() * 5,
      });
    }
  }

  // Triangle flip effect
  public emitFlip(x: number, y: number, colorHue: number): void {
    for (let i = 0; i < 15; i++) {
      const angle = (i / 15) * Math.PI * 2;
      this.emit('flip', x, y, {
        vx: Math.cos(angle) * 80,
        vy: Math.sin(angle) * 80,
        life: 0.6 + Math.random() * 0.3,
        size: 8 + Math.random() * 6,
        param1: colorHue,
        param2: i / 15,
      });
    }

    // Sacred energy on flip
    for (let i = 0; i < 8; i++) {
      this.emit('sacred', x, y, {
        vx: (Math.random() - 0.5) * 60,
        vy: (Math.random() - 0.5) * 60,
        life: 1 + Math.random() * 0.5,
        size: 12 + Math.random() * 10,
        param1: i / 8,
      });
    }
  }

  // Reset sandstorm
  public emitReset(): void {
    const centerX = this.width / 2;
    const centerY = this.height / 2;

    for (let i = 0; i < 40; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 80 + Math.random() * 100;
      this.emit('sand', centerX, centerY, {
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1.5 + Math.random() * 0.5,
        size: 6 + Math.random() * 8,
      });
    }

    for (let i = 0; i < 25; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 60 + Math.random() * 60;
      this.emit('dust', centerX, centerY, {
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 2 + Math.random(),
        size: 12 + Math.random() * 15,
      });
    }
  }

  // Victory - Pharaoh's blessing
  public emitVictory(): void {
    const centerX = this.width / 2;
    const centerY = this.height / 2;

    // Golden hieroglyphic burst
    for (let i = 0; i < 50; i++) {
      const angle = (i / 50) * Math.PI * 2;
      const radius = 50 + Math.random() * 100;
      this.emit('pharaoh', centerX + Math.cos(angle) * radius, centerY + Math.sin(angle) * radius, {
        vx: Math.cos(angle) * 80,
        vy: Math.sin(angle) * 80,
        life: 2.5 + Math.random(),
        size: 15 + Math.random() * 10,
        param1: i / 50,
      });
    }

    // Sacred energy spiral
    for (let i = 0; i < 30; i++) {
      const angle = (i / 30) * Math.PI * 6;
      const radius = i * 5;
      this.emit('sacred', centerX + Math.cos(angle) * radius, centerY + Math.sin(angle) * radius, {
        vx: 0,
        vy: 0,
        life: 2 + Math.random(),
        size: 10 + Math.random() * 8,
        param1: i / 30,
      });
    }

    // Shooting stars
    for (let i = 0; i < 15; i++) {
      this.emit('star', Math.random() * this.width, Math.random() * this.height * 0.4, {
        vx: 0,
        vy: 0,
        life: 3 + Math.random() * 2,
        size: 6 + Math.random() * 8,
        param2: 6 + Math.random() * 8,
      });
    }
  }

  // Level start - awakening the pyramid
  public emitLevelStart(): void {
    for (let i = 0; i < 20; i++) {
      this.emit('sacred', this.width / 2, this.height / 2, {
        vx: (Math.random() - 0.5) * 100,
        vy: (Math.random() - 0.5) * 100 - 30,
        life: 1.5 + Math.random(),
        size: 10 + Math.random() * 8,
        param1: i / 20,
      });
    }

    // Rising sand dust
    for (let i = 0; i < 15; i++) {
      this.emit('sand', this.width / 2 + (Math.random() - 0.5) * 200, this.height - 50, {
        vx: (Math.random() - 0.5) * 40,
        vy: -40 - Math.random() * 30,
        life: 1 + Math.random() * 0.5,
        size: 5 + Math.random() * 6,
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
