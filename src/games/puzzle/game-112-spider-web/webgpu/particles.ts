/**
 * Particle System - Spider Web
 * Spider / Night Theme
 * Game #112
 */

export type ParticleType = 'silk' | 'dewdrop' | 'sparkle' | 'web' | 'spider' | 'glow';

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
  param3: number;
  param4: number;
}

const PARTICLE_TYPE_MAP: Record<ParticleType, number> = {
  silk: 0,
  dewdrop: 1,
  sparkle: 2,
  web: 3,
  spider: 4,
  glow: 5,
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

      // Update position
      p.x += p.vx * deltaTime;
      p.y += p.vy * deltaTime;

      // Apply effects based on type
      switch (p.type) {
        case 'silk':
          // Silk floats gently with wave motion
          p.vx += Math.sin(p.life * 5) * 0.5;
          p.vy *= 0.98;
          break;
        case 'dewdrop':
          // Dewdrops fall slowly
          p.vy += 15 * deltaTime;
          p.vx *= 0.98;
          break;
        case 'sparkle':
          // Sparkles drift and fade
          p.vx *= 0.95;
          p.vy *= 0.95;
          break;
        case 'web':
          // Web fragments flutter down
          p.vx = Math.sin(p.life * 8 + p.param1) * 20;
          p.vy += 10 * deltaTime;
          break;
        case 'spider':
          // Spider moves deliberately
          p.vy += 5 * deltaTime;
          break;
        case 'glow':
          // Glow pulses in place
          p.vx *= 0.9;
          p.vy *= 0.9;
          break;
      }

      // Update life
      p.life -= deltaTime;

      // Remove dead particles
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  private emit(
    x: number,
    y: number,
    type: ParticleType,
    options: Partial<{
      vx: number;
      vy: number;
      life: number;
      size: number;
      param1: number;
      param2: number;
      param3: number;
      param4: number;
    }> = {}
  ): void {
    if (this.particles.length >= this.maxParticles) return;

    this.particles.push({
      x,
      y,
      vx: options.vx ?? 0,
      vy: options.vy ?? 0,
      life: options.life ?? 1,
      maxLife: options.life ?? 1,
      size: options.size ?? 10,
      type,
      param1: options.param1 ?? Math.random(),
      param2: options.param2 ?? Math.random(),
      param3: options.param3 ?? 0,
      param4: options.param4 ?? 0,
    });
  }

  // Thread creation - silk strands
  public emitThread(x1: number, y1: number, x2: number, y2: number): void {
    const dist = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
    const steps = Math.floor(dist / 15);

    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = x1 + (x2 - x1) * t;
      const y = y1 + (y2 - y1) * t;

      // Silk particles along thread
      this.emit(x, y, 'silk', {
        vx: (Math.random() - 0.5) * 30,
        vy: (Math.random() - 0.5) * 30,
        life: 0.8 + Math.random() * 0.4,
        size: 8 + Math.random() * 6,
        param1: t,
      });

      // Occasional sparkle
      if (Math.random() < 0.3) {
        this.emit(x, y, 'sparkle', {
          vx: (Math.random() - 0.5) * 20,
          vy: (Math.random() - 0.5) * 20,
          life: 0.5 + Math.random() * 0.3,
          size: 6 + Math.random() * 4,
        });
      }
    }

    // Dewdrops at connection points
    this.emit(x1, y1, 'dewdrop', {
      vx: 0,
      vy: 5,
      life: 1.5,
      size: 12,
    });
    this.emit(x2, y2, 'dewdrop', {
      vx: 0,
      vy: 5,
      life: 1.5,
      size: 12,
    });
  }

  // Node click - web shimmer
  public emitNodeClick(x: number, y: number): void {
    // Central glow
    this.emit(x, y, 'glow', {
      vx: 0,
      vy: 0,
      life: 0.8,
      size: 40,
    });

    // Radiating sparkles
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      const speed = 60 + Math.random() * 40;

      this.emit(x, y, 'sparkle', {
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.6 + Math.random() * 0.3,
        size: 5 + Math.random() * 4,
        param1: i / 12,
      });
    }

    // Silk wisps
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2 + Math.random() * 0.5;
      this.emit(x, y, 'silk', {
        vx: Math.cos(angle) * 40,
        vy: Math.sin(angle) * 40,
        life: 0.8,
        size: 10 + Math.random() * 5,
      });
    }
  }

  // Reset effect - web dissolves
  public emitReset(): void {
    const centerX = this.width / 2;
    const centerY = this.height / 2;

    // Web fragments flying outward
    for (let i = 0; i < 30; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * 100;
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;

      this.emit(x, y, 'web', {
        vx: Math.cos(angle) * 80,
        vy: Math.sin(angle) * 80 - 30,
        life: 1.2 + Math.random() * 0.6,
        size: 15 + Math.random() * 10,
        param1: Math.random() * Math.PI * 2,
      });
    }

    // Central burst
    for (let i = 0; i < 20; i++) {
      const angle = Math.random() * Math.PI * 2;
      this.emit(centerX, centerY, 'sparkle', {
        vx: Math.cos(angle) * (50 + Math.random() * 50),
        vy: Math.sin(angle) * (50 + Math.random() * 50),
        life: 0.8,
        size: 6 + Math.random() * 4,
      });
    }
  }

  // Victory - completed web celebration
  public emitVictory(): void {
    const centerX = this.width / 2;
    const centerY = this.height / 2;

    // Massive dewdrop shower
    for (let i = 0; i < 40; i++) {
      const x = Math.random() * this.width;
      const delay = i * 50;

      setTimeout(() => {
        this.emit(x, 50, 'dewdrop', {
          vx: (Math.random() - 0.5) * 20,
          vy: 20 + Math.random() * 30,
          life: 2 + Math.random(),
          size: 10 + Math.random() * 8,
        });
      }, delay);
    }

    // Spiral of silk
    for (let i = 0; i < 24; i++) {
      const delay = i * 80;
      const angle = (i / 24) * Math.PI * 4;
      const radius = 50 + i * 5;

      setTimeout(() => {
        const x = centerX + Math.cos(angle) * radius;
        const y = centerY + Math.sin(angle) * radius;

        this.emit(x, y, 'silk', {
          vx: Math.cos(angle + Math.PI / 2) * 30,
          vy: Math.sin(angle + Math.PI / 2) * 30,
          life: 1.5,
          size: 12 + Math.random() * 6,
        });

        this.emit(x, y, 'sparkle', {
          vx: 0,
          vy: -20,
          life: 1.0,
          size: 8,
        });
      }, delay);
    }

    // Celebratory glow bursts
    for (let i = 0; i < 5; i++) {
      const delay = i * 200;

      setTimeout(() => {
        const angle = (i / 5) * Math.PI * 2;
        const x = centerX + Math.cos(angle) * 80;
        const y = centerY + Math.sin(angle) * 80;

        this.emit(x, y, 'glow', {
          life: 1.5,
          size: 50,
        });
      }, delay);
    }
  }

  // Level start - web appears
  public emitLevelStart(): void {
    const centerX = this.width / 2;
    const centerY = this.height / 2;

    // Spider descends
    this.emit(centerX, 0, 'spider', {
      vx: 0,
      vy: 40,
      life: 2,
      size: 25,
    });

    // Trailing silk from spider
    for (let i = 0; i < 10; i++) {
      setTimeout(() => {
        this.emit(centerX, i * 30, 'silk', {
          vx: (Math.random() - 0.5) * 10,
          vy: 0,
          life: 1.5,
          size: 6,
        });
      }, i * 100);
    }

    // Ambient glows appear
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const radius = 120;

      setTimeout(() => {
        this.emit(
          centerX + Math.cos(angle) * radius,
          centerY + Math.sin(angle) * radius,
          'glow',
          {
            life: 2,
            size: 30,
            param1: i,
          }
        );
      }, 500 + i * 100);
    }
  }

  // Ambient particles
  public emitAmbient(): void {
    if (Math.random() < 0.02) {
      // Random dewdrop
      this.emit(
        Math.random() * this.width,
        Math.random() * this.height * 0.3,
        'dewdrop',
        {
          vx: (Math.random() - 0.5) * 10,
          vy: 10 + Math.random() * 20,
          life: 2 + Math.random(),
          size: 6 + Math.random() * 4,
        }
      );
    }

    if (Math.random() < 0.01) {
      // Floating silk strand
      this.emit(
        Math.random() < 0.5 ? 0 : this.width,
        Math.random() * this.height,
        'silk',
        {
          vx: (Math.random() - 0.5) * 30,
          vy: (Math.random() - 0.5) * 10,
          life: 3,
          size: 8,
        }
      );
    }

    if (Math.random() < 0.015) {
      // Random sparkle (moonlight reflection)
      this.emit(
        Math.random() * this.width,
        Math.random() * this.height,
        'sparkle',
        {
          vx: 0,
          vy: 0,
          life: 0.5 + Math.random() * 0.5,
          size: 4 + Math.random() * 3,
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
    const data = new Float32Array(this.maxParticles * 12);

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      const offset = i * 12;

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
      data[offset + 10] = p.param3;
      data[offset + 11] = p.param4;
    }

    return data;
  }
}
