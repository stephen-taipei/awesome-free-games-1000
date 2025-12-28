/**
 * Particle System - Wind Direction
 * Weather / Atmospheric Theme
 * Game #111
 */

export type ParticleType = 'wind' | 'leaf' | 'gust' | 'cloud' | 'arrow' | 'sparkle';

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
  wind: 0,
  leaf: 1,
  gust: 2,
  cloud: 3,
  arrow: 4,
  sparkle: 5,
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
        case 'wind':
          // Wind streaks just flow
          break;
        case 'leaf':
          // Leaves flutter and drift
          p.vy += Math.sin(p.life * 8) * 20 * deltaTime;
          p.vx += Math.cos(p.life * 5) * 10 * deltaTime;
          break;
        case 'gust':
          // Gusts expand
          p.size += deltaTime * 60;
          break;
        case 'cloud':
          // Clouds drift slowly
          p.vx *= 0.99;
          break;
        case 'arrow':
          // Arrows pulse in place
          p.extra += deltaTime;
          break;
        case 'sparkle':
          // Sparkles drift with wind
          p.vx += (Math.random() - 0.5) * 30 * deltaTime;
          break;
      }

      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  // Ambient wind effects
  public emitAmbient(): void {
    // Random wind streaks
    if (Math.random() < 0.1) {
      this.emit({
        x: 0,
        y: Math.random() * this.height,
        vx: 200 + Math.random() * 100,
        vy: (Math.random() - 0.5) * 30,
        type: 'wind',
        life: 2.0,
        maxLife: 2.0,
        size: 30 + Math.random() * 20,
        color: { r: 0.8, g: 0.9, b: 1.0 },
      });
    }

    // Occasional sparkle
    if (Math.random() < 0.02) {
      this.emit({
        x: Math.random() * this.width,
        y: Math.random() * this.height * 0.7,
        vx: 50 + Math.random() * 50,
        vy: (Math.random() - 0.5) * 20,
        type: 'sparkle',
        life: 1.5,
        maxLife: 1.5,
        size: 10,
        color: { r: 1.0, g: 1.0, b: 0.9 },
      });
    }
  }

  // Wind source click effect
  public emitWindClick(x: number, y: number, angle: number = 0): void {
    // Gust burst
    this.emit({
      x,
      y,
      type: 'gust',
      life: 0.8,
      maxLife: 0.8,
      size: 30,
      color: { r: 0.6, g: 0.8, b: 1.0 },
    });

    // Wind streaks in direction
    for (let i = 0; i < 8; i++) {
      const spreadAngle = angle + (Math.random() - 0.5) * 0.5;
      const speed = 150 + Math.random() * 100;
      this.emit({
        x,
        y,
        vx: Math.cos(spreadAngle) * speed,
        vy: Math.sin(spreadAngle) * speed,
        type: 'wind',
        life: 1.5,
        maxLife: 1.5,
        size: 25 + Math.random() * 15,
        color: { r: 0.7, g: 0.85, b: 1.0 },
      });
    }

    // Direction arrow
    this.emit({
      x: x + Math.cos(angle) * 40,
      y: y + Math.sin(angle) * 40,
      type: 'arrow',
      life: 1.0,
      maxLife: 1.0,
      size: 35,
      color: { r: 0.3, g: 0.6, b: 0.9 },
    });
  }

  // Leaf movement
  public emitLeaf(x: number, y: number): void {
    const leafColors = [
      { r: 0.2, g: 0.5, b: 0.1 },
      { r: 0.5, g: 0.7, b: 0.2 },
      { r: 0.4, g: 0.6, b: 0.15 },
    ];

    this.emit({
      x,
      y,
      vx: 50 + Math.random() * 30,
      vy: (Math.random() - 0.5) * 20,
      type: 'leaf',
      life: 2.0,
      maxLife: 2.0,
      size: 20 + Math.random() * 10,
      color: leafColors[Math.floor(Math.random() * leafColors.length)],
    });
  }

  // Reset effect
  public emitReset(): void {
    // Wind sweep across screen
    for (let i = 0; i < 15; i++) {
      setTimeout(() => {
        this.emit({
          x: 0,
          y: this.height * (0.2 + Math.random() * 0.6),
          vx: 250 + Math.random() * 100,
          vy: (Math.random() - 0.5) * 50,
          type: 'wind',
          life: 1.5,
          maxLife: 1.5,
          size: 40,
          color: { r: 0.7, g: 0.85, b: 1.0 },
        });
      }, i * 50);
    }

    // Scattered leaves
    for (let i = 0; i < 10; i++) {
      setTimeout(() => {
        this.emitLeaf(Math.random() * this.width * 0.3, Math.random() * this.height);
      }, i * 80);
    }
  }

  // Victory celebration
  public emitVictory(): void {
    // Massive wind burst
    for (let i = 0; i < 40; i++) {
      setTimeout(() => {
        const angle = (i / 40) * Math.PI * 2;
        const cx = this.width / 2;
        const cy = this.height / 2;

        this.emit({
          x: cx,
          y: cy,
          vx: Math.cos(angle) * 150,
          vy: Math.sin(angle) * 150,
          type: 'wind',
          life: 2.0,
          maxLife: 2.0,
          size: 35,
          color: { r: 0.8, g: 0.9, b: 1.0 },
        });
      }, i * 25);
    }

    // Celebration gusts
    for (let i = 0; i < 5; i++) {
      setTimeout(() => {
        this.emit({
          x: this.width * (0.2 + Math.random() * 0.6),
          y: this.height * (0.3 + Math.random() * 0.4),
          type: 'gust',
          life: 1.5,
          maxLife: 1.5,
          size: 50,
          color: { r: 0.5, g: 0.8, b: 1.0 },
        });
      }, 500 + i * 200);
    }

    // Leaf shower
    for (let i = 0; i < 30; i++) {
      setTimeout(() => {
        this.emitLeaf(
          Math.random() * this.width,
          Math.random() * this.height * 0.3
        );
      }, 1000 + i * 50);
    }

    // Sparkle celebration
    for (let i = 0; i < 40; i++) {
      setTimeout(() => {
        this.emit({
          x: Math.random() * this.width,
          y: Math.random() * this.height,
          vx: (Math.random() - 0.5) * 60,
          vy: (Math.random() - 0.5) * 60,
          type: 'sparkle',
          life: 2.0,
          maxLife: 2.0,
          size: 15,
          color: { r: 1.0, g: 1.0, b: 0.8 },
        });
      }, 1500 + i * 40);
    }
  }

  // Level start effect
  public emitLevelStart(): void {
    // Gentle breeze introduction
    for (let i = 0; i < 10; i++) {
      setTimeout(() => {
        this.emit({
          x: 0,
          y: this.height * (0.3 + i * 0.04),
          vx: 120 + Math.random() * 60,
          vy: 0,
          type: 'wind',
          life: 2.0,
          maxLife: 2.0,
          size: 30,
          color: { r: 0.8, g: 0.9, b: 1.0 },
        });
      }, i * 100);
    }

    // Starting leaf
    setTimeout(() => {
      this.emitLeaf(this.width * 0.3, this.height * 0.5);
    }, 500);

    // Cloud puffs
    for (let i = 0; i < 3; i++) {
      setTimeout(() => {
        this.emit({
          x: this.width * (0.2 + i * 0.3),
          y: this.height * 0.2,
          vx: 30,
          vy: 0,
          type: 'cloud',
          life: 3.0,
          maxLife: 3.0,
          size: 60,
          color: { r: 0.95, g: 0.97, b: 1.0 },
        });
      }, 800 + i * 150);
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
