/**
 * WebGPU Particle System - Color Palette
 * Artist Studio / Creative Theme
 * Game #107
 */

export type ParticleType = 'droplet' | 'brush' | 'sparkle' | 'blend' | 'splash' | 'spectrum';

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
  droplet: 0,
  brush: 1,
  sparkle: 2,
  blend: 3,
  splash: 4,
  spectrum: 5,
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
        case 'droplet':
          // Paint drips down
          p.vy += 80 * deltaTime;
          p.vx *= 0.98;
          p.size *= 0.995;
          break;
        case 'brush':
          // Brush strokes slow down
          p.vx *= 0.95;
          p.vy *= 0.95;
          break;
        case 'sparkle':
          // Twinkle effect
          p.size = p.param2 * (0.5 + 0.5 * Math.sin(p.life * 15));
          break;
        case 'blend':
          // Swirling motion
          const angle = p.life * 5;
          p.vx = Math.cos(angle) * 30;
          p.vy = Math.sin(angle) * 30;
          break;
        case 'splash':
          // Splatter expands then fades
          p.vx *= 0.92;
          p.vy += 50 * deltaTime;
          break;
        case 'spectrum':
          // Rainbow floats upward
          p.vy -= 20 * deltaTime;
          p.vx += Math.sin(p.life * 3) * 10 * deltaTime;
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
    // Occasional sparkles on canvas
    if (Math.random() > 0.97) {
      this.emit('sparkle',
        this.width * 0.15 + Math.random() * this.width * 0.7,
        this.height * 0.15 + Math.random() * this.height * 0.7,
        {
          life: 1.5 + Math.random(),
          size: 6 + Math.random() * 6,
          param1: Math.random(),
          param2: 6 + Math.random() * 6,
        }
      );
    }

    // Rainbow particles near color wheel
    if (Math.random() > 0.98) {
      this.emit('spectrum',
        this.width * 0.85 + (Math.random() - 0.5) * 40,
        this.height * 0.15 + (Math.random() - 0.5) * 40,
        {
          life: 2 + Math.random(),
          size: 8 + Math.random() * 6,
          param1: Math.random(),
        }
      );
    }
  }

  // Color selection click
  public emitSelect(x: number, y: number, hue: number = Math.random()): void {
    // Paint droplets burst
    for (let i = 0; i < 10; i++) {
      const angle = (i / 10) * Math.PI * 2;
      const speed = 40 + Math.random() * 30;
      this.emit('droplet', x, y, {
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.8 + Math.random() * 0.4,
        size: 8 + Math.random() * 8,
        param1: hue,
      });
    }

    // Sparkle highlight
    for (let i = 0; i < 5; i++) {
      this.emit('sparkle',
        x + (Math.random() - 0.5) * 40,
        y + (Math.random() - 0.5) * 40,
        {
          life: 0.6 + Math.random() * 0.3,
          size: 10 + Math.random() * 8,
          param1: Math.random(),
          param2: 10 + Math.random() * 8,
        }
      );
    }
  }

  // Color mix effect
  public emitMix(x: number, y: number, hue1: number, hue2: number): void {
    // Blending swirls
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      this.emit('blend', x, y, {
        vx: Math.cos(angle) * 50,
        vy: Math.sin(angle) * 50,
        life: 1.2 + Math.random() * 0.5,
        size: 12 + Math.random() * 8,
        param1: hue1,
        param2: hue2,
      });
    }

    // Brush strokes
    for (let i = 0; i < 6; i++) {
      const angle = Math.random() * Math.PI * 2;
      this.emit('brush',
        x + (Math.random() - 0.5) * 60,
        y + (Math.random() - 0.5) * 60,
        {
          vx: Math.cos(angle) * 30,
          vy: Math.sin(angle) * 30,
          life: 0.8 + Math.random() * 0.4,
          size: 15 + Math.random() * 10,
          param1: (hue1 + hue2) / 2,
        }
      );
    }
  }

  // Reset - splash effect
  public emitReset(): void {
    const centerX = this.width / 2;
    const centerY = this.height / 2;

    // Large splash
    for (let i = 0; i < 20; i++) {
      const angle = (i / 20) * Math.PI * 2;
      const speed = 80 + Math.random() * 40;
      this.emit('splash', centerX, centerY, {
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1 + Math.random() * 0.5,
        size: 12 + Math.random() * 10,
        param1: Math.random(),
      });
    }

    // Brush strokes clearing
    for (let i = 0; i < 10; i++) {
      this.emit('brush',
        centerX + (Math.random() - 0.5) * 200,
        centerY + (Math.random() - 0.5) * 150,
        {
          vx: (Math.random() - 0.5) * 100,
          vy: (Math.random() - 0.5) * 100,
          life: 0.8 + Math.random() * 0.4,
          size: 20 + Math.random() * 15,
          param1: 0.1, // Gray
        }
      );
    }
  }

  // Victory - rainbow celebration
  public emitVictory(): void {
    const centerX = this.width / 2;
    const centerY = this.height / 2;

    // Rainbow spectrum explosion
    for (let i = 0; i < 40; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 80 + Math.random() * 80;
      this.emit('spectrum',
        centerX + (Math.random() - 0.5) * 100,
        centerY + (Math.random() - 0.5) * 100,
        {
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 50,
          life: 2 + Math.random(),
          size: 14 + Math.random() * 12,
          param1: i / 40, // Full spectrum
        }
      );
    }

    // Paint droplets shower
    for (let i = 0; i < 30; i++) {
      this.emit('droplet',
        Math.random() * this.width,
        -20,
        {
          vx: (Math.random() - 0.5) * 50,
          vy: 50 + Math.random() * 50,
          life: 2.5 + Math.random(),
          size: 10 + Math.random() * 12,
          param1: Math.random(),
        }
      );
    }

    // Sparkle burst
    for (let i = 0; i < 25; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * 150;
      this.emit('sparkle',
        centerX + Math.cos(angle) * dist,
        centerY + Math.sin(angle) * dist,
        {
          life: 1.5 + Math.random(),
          size: 12 + Math.random() * 10,
          param1: Math.random(),
          param2: 12 + Math.random() * 10,
        }
      );
    }
  }

  // Level start - palette ready
  public emitLevelStart(): void {
    const centerX = this.width / 2;
    const centerY = this.height / 2;

    // Color wheel spectrum
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      const radius = 80;
      this.emit('spectrum',
        centerX + Math.cos(angle) * radius,
        centerY + Math.sin(angle) * radius,
        {
          vx: Math.cos(angle) * 20,
          vy: Math.sin(angle) * 20,
          life: 1.5 + Math.random() * 0.5,
          size: 12 + Math.random() * 8,
          param1: i / 12,
        }
      );
    }

    // Brush strokes radiate out
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      this.emit('brush',
        centerX + Math.cos(angle) * 30,
        centerY + Math.sin(angle) * 30,
        {
          vx: Math.cos(angle) * 60,
          vy: Math.sin(angle) * 60,
          life: 1 + Math.random() * 0.5,
          size: 15 + Math.random() * 10,
          param1: Math.random(),
        }
      );
    }

    // Sparkles
    for (let i = 0; i < 10; i++) {
      this.emit('sparkle',
        centerX + (Math.random() - 0.5) * 150,
        centerY + (Math.random() - 0.5) * 150,
        {
          life: 1.2 + Math.random(),
          size: 8 + Math.random() * 8,
          param1: Math.random(),
          param2: 8 + Math.random() * 8,
        }
      );
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
