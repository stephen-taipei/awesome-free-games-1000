/**
 * Particle System - Island Connect
 * Tropical Ocean / Island Paradise Theme
 * Game #109
 */

export type ParticleType = 'wave' | 'splash' | 'sand' | 'sparkle' | 'bridge' | 'palm';

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  type: ParticleType;
  color: { r: number; g: number; b: number };
  extra: number;
}

const PARTICLE_TYPE_MAP: Record<ParticleType, number> = {
  wave: 0,
  splash: 1,
  sand: 2,
  sparkle: 3,
  bridge: 4,
  palm: 5,
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

  private emit(config: Partial<Particle> & { x: number; y: number; type: ParticleType }): void {
    if (this.particles.length >= this.maxParticles) {
      this.particles.shift();
    }

    const defaults: Particle = {
      x: config.x,
      y: config.y,
      vx: config.vx ?? 0,
      vy: config.vy ?? 0,
      life: config.life ?? 1,
      maxLife: config.maxLife ?? config.life ?? 1,
      size: config.size ?? 20,
      type: config.type,
      color: config.color ?? { r: 1, g: 1, b: 1 },
      extra: config.extra ?? 0,
    };

    this.particles.push(defaults);
  }

  public update(deltaTime: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= deltaTime;
      p.x += p.vx * deltaTime;
      p.y += p.vy * deltaTime;

      // Type-specific physics
      switch (p.type) {
        case 'wave':
          p.size += deltaTime * 40; // Expanding ripple
          break;
        case 'splash':
          p.vy += 150 * deltaTime; // Gravity
          break;
        case 'sand':
          p.vy += 80 * deltaTime;
          p.vx *= 0.98;
          break;
        case 'sparkle':
          p.vy -= 20 * deltaTime; // Float up
          break;
        case 'bridge':
          p.vx += (Math.random() - 0.5) * 50 * deltaTime;
          break;
        case 'palm':
          p.vx += Math.sin(p.life * 5) * 30 * deltaTime;
          p.vy += 40 * deltaTime;
          break;
      }

      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  // Ambient ocean effects
  public emitAmbient(): void {
    if (Math.random() < 0.03) {
      // Random wave ripples
      this.emit({
        x: Math.random() * this.width,
        y: this.height * (0.3 + Math.random() * 0.5),
        type: 'wave',
        life: 1.5,
        maxLife: 1.5,
        size: 5,
        color: { r: 0.6, g: 0.9, b: 1.0 },
      });
    }
    if (Math.random() < 0.02) {
      // Floating sparkles on water
      this.emit({
        x: Math.random() * this.width,
        y: this.height * (0.35 + Math.random() * 0.3),
        type: 'sparkle',
        life: 2,
        maxLife: 2,
        size: 8,
        vx: (Math.random() - 0.5) * 10,
        vy: -10,
        color: { r: 1.0, g: 1.0, b: 0.9 },
      });
    }
  }

  // Island click effect
  public emitIslandClick(x: number, y: number): void {
    // Sand particles
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      const speed = 60 + Math.random() * 40;
      this.emit({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 50,
        type: 'sand',
        life: 1.2,
        maxLife: 1.2,
        size: 6 + Math.random() * 4,
        color: { r: 0.96, g: 0.87, b: 0.7 },
      });
    }
    // Central sparkle
    this.emit({
      x,
      y,
      type: 'sparkle',
      life: 0.8,
      maxLife: 0.8,
      size: 30,
      color: { r: 1.0, g: 0.95, b: 0.8 },
    });
  }

  // Bridge building effect
  public emitBridge(x1: number, y1: number, x2: number, y2: number): void {
    const dist = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
    const steps = Math.ceil(dist / 20);

    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = x1 + (x2 - x1) * t;
      const y = y1 + (y2 - y1) * t;

      setTimeout(() => {
        this.emit({
          x,
          y,
          type: 'bridge',
          life: 1.0,
          maxLife: 1.0,
          size: 15,
          color: { r: 0.9, g: 0.7, b: 0.4 },
        });
        // Sparkle accent
        this.emit({
          x,
          y,
          vx: (Math.random() - 0.5) * 40,
          vy: -40 - Math.random() * 20,
          type: 'sparkle',
          life: 0.6,
          maxLife: 0.6,
          size: 10,
          color: { r: 1.0, g: 0.9, b: 0.6 },
        });
      }, i * 30);
    }
  }

  // Water splash
  public emitSplash(x: number, y: number): void {
    // Wave ripple
    this.emit({
      x,
      y,
      type: 'wave',
      life: 1.5,
      maxLife: 1.5,
      size: 10,
      color: { r: 0.7, g: 0.95, b: 1.0 },
    });

    // Splash droplets
    for (let i = 0; i < 15; i++) {
      const angle = (Math.random() - 0.5) * Math.PI;
      const speed = 100 + Math.random() * 80;
      this.emit({
        x,
        y,
        vx: Math.cos(angle) * speed * 0.5,
        vy: Math.sin(angle) * speed - 80,
        type: 'splash',
        life: 1.0,
        maxLife: 1.0,
        size: 8 + Math.random() * 6,
        color: { r: 0.8, g: 0.95, b: 1.0 },
      });
    }
  }

  // Reset effect
  public emitReset(): void {
    // Wave wash across screen
    for (let i = 0; i < 20; i++) {
      setTimeout(() => {
        this.emit({
          x: 0,
          y: this.height * (0.3 + Math.random() * 0.5),
          vx: 200 + Math.random() * 100,
          vy: (Math.random() - 0.5) * 30,
          type: 'wave',
          life: 2.0,
          maxLife: 2.0,
          size: 30,
          color: { r: 0.5, g: 0.85, b: 0.95 },
        });
      }, i * 50);
    }
  }

  // Victory celebration
  public emitVictory(): void {
    // Massive splash celebration
    for (let i = 0; i < 50; i++) {
      setTimeout(() => {
        const x = this.width * (0.2 + Math.random() * 0.6);
        const y = this.height * (0.4 + Math.random() * 0.4);

        // Splash
        this.emit({
          x,
          y,
          vx: (Math.random() - 0.5) * 100,
          vy: -100 - Math.random() * 80,
          type: 'splash',
          life: 1.5,
          maxLife: 1.5,
          size: 12,
          color: { r: 0.9, g: 0.98, b: 1.0 },
        });

        // Golden sparkles
        this.emit({
          x,
          y,
          vx: (Math.random() - 0.5) * 80,
          vy: -60 - Math.random() * 40,
          type: 'sparkle',
          life: 2.0,
          maxLife: 2.0,
          size: 15,
          color: { r: 1.0, g: 0.85, b: 0.3 },
        });
      }, i * 40);
    }

    // Palm frond celebration
    for (let i = 0; i < 20; i++) {
      setTimeout(() => {
        this.emit({
          x: Math.random() * this.width,
          y: 0,
          vx: (Math.random() - 0.5) * 60,
          vy: 50 + Math.random() * 30,
          type: 'palm',
          life: 3.0,
          maxLife: 3.0,
          size: 20,
          color: { r: 0.3, g: 0.6, b: 0.25 },
        });
      }, 500 + i * 80);
    }
  }

  // Level start effect
  public emitLevelStart(): void {
    // Sunrise sparkle burst
    const centerX = this.width * 0.8;
    const centerY = this.height * 0.15;

    for (let i = 0; i < 25; i++) {
      const angle = (i / 25) * Math.PI * 2;
      const speed = 80 + Math.random() * 40;
      setTimeout(() => {
        this.emit({
          x: centerX,
          y: centerY,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          type: 'sparkle',
          life: 1.5,
          maxLife: 1.5,
          size: 12,
          color: { r: 1.0, g: 0.9, b: 0.6 },
        });
      }, i * 20);
    }

    // Wave greeting
    for (let i = 0; i < 8; i++) {
      setTimeout(() => {
        this.emit({
          x: this.width * (0.1 + i * 0.1),
          y: this.height * 0.5,
          type: 'wave',
          life: 2.0,
          maxLife: 2.0,
          size: 15,
          color: { r: 0.6, g: 0.9, b: 1.0 },
        });
      }, 300 + i * 100);
    }
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
      data[offset + 8] = p.color.r;
      data[offset + 9] = p.color.g;
      data[offset + 10] = p.color.b;
      data[offset + 11] = p.extra;
    }

    return data;
  }

  public getParticleCount(): number {
    return this.particles.length;
  }

  public clear(): void {
    this.particles = [];
  }
}
