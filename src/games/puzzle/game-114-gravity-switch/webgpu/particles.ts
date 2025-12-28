/**
 * Particle System - Gravity Switch
 * Space / Cosmic Theme
 * Game #114
 */

export type ParticleType = 'star' | 'energy' | 'warp' | 'trail' | 'portal' | 'spark';

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
  star: 0,
  energy: 1,
  warp: 2,
  trail: 3,
  portal: 4,
  spark: 5,
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
        case 'star':
          // Stars drift slowly
          p.vx *= 0.99;
          p.vy *= 0.99;
          break;
        case 'energy':
          // Energy orbits slightly
          p.vx += Math.sin(p.life * 5) * 10 * deltaTime;
          p.vy += Math.cos(p.life * 5) * 10 * deltaTime;
          break;
        case 'warp':
          // Warp accelerates outward
          p.vx *= 1.02;
          p.vy *= 1.02;
          break;
        case 'trail':
          // Trails fade in place
          p.vx *= 0.9;
          p.vy *= 0.9;
          break;
        case 'portal':
          // Portal particles spiral
          const angle = Math.atan2(p.vy, p.vx) + 0.1;
          const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy) * 0.98;
          p.vx = Math.cos(angle) * speed;
          p.vy = Math.sin(angle) * speed;
          break;
        case 'spark':
          // Sparks fade quickly
          p.vx *= 0.95;
          p.vy *= 0.95;
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

  // Gravity switch effect
  public emitGravitySwitch(x: number, y: number, direction: string): void {
    // Energy burst at player
    for (let i = 0; i < 15; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 40 + Math.random() * 60;

      this.emit(x, y, 'energy', {
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.6 + Math.random() * 0.3,
        size: 8 + Math.random() * 6,
        param1: Math.random(),
      });
    }

    // Directional warp particles
    let dirAngle = 0;
    switch (direction) {
      case 'up': dirAngle = -Math.PI / 2; break;
      case 'down': dirAngle = Math.PI / 2; break;
      case 'left': dirAngle = Math.PI; break;
      case 'right': dirAngle = 0; break;
    }

    for (let i = 0; i < 12; i++) {
      const spread = (Math.random() - 0.5) * 0.8;
      const angle = dirAngle + spread;
      const speed = 80 + Math.random() * 50;

      this.emit(x, y, 'warp', {
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.5 + Math.random() * 0.3,
        size: 10 + Math.random() * 8,
        param1: Math.random(),
      });
    }

    // Sparks
    for (let i = 0; i < 8; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 60 + Math.random() * 40;

      this.emit(x, y, 'spark', {
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.3 + Math.random() * 0.2,
        size: 5 + Math.random() * 3,
        param1: Math.random(),
      });
    }
  }

  // Player trail
  public emitPlayerTrail(x: number, y: number): void {
    this.emit(x, y, 'trail', {
      vx: (Math.random() - 0.5) * 10,
      vy: (Math.random() - 0.5) * 10,
      life: 0.4,
      size: 6 + Math.random() * 4,
      param1: Math.random(),
    });
  }

  // Portal/goal effect
  public emitPortal(x: number, y: number): void {
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const radius = 30;

      this.emit(
        x + Math.cos(angle) * radius,
        y + Math.sin(angle) * radius,
        'portal',
        {
          vx: Math.cos(angle + Math.PI / 2) * 40,
          vy: Math.sin(angle + Math.PI / 2) * 40,
          life: 0.8,
          size: 10,
          param1: i / 8,
        }
      );
    }
  }

  // Reset effect
  public emitReset(): void {
    const centerX = this.width / 2;
    const centerY = this.height / 2;

    // Implosion effect
    for (let i = 0; i < 30; i++) {
      const angle = (i / 30) * Math.PI * 2;
      const radius = 150;
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;

      this.emit(x, y, 'energy', {
        vx: -Math.cos(angle) * 100,
        vy: -Math.sin(angle) * 100,
        life: 0.8,
        size: 10,
        param1: i / 30,
      });
    }

    // Central burst
    setTimeout(() => {
      for (let i = 0; i < 20; i++) {
        const angle = Math.random() * Math.PI * 2;
        this.emit(centerX, centerY, 'spark', {
          vx: Math.cos(angle) * 80,
          vy: Math.sin(angle) * 80,
          life: 0.5,
          size: 6,
        });
      }
    }, 300);
  }

  // Victory effect
  public emitVictory(): void {
    const centerX = this.width / 2;
    const centerY = this.height / 2;

    // Expanding portal rings
    for (let ring = 0; ring < 4; ring++) {
      const delay = ring * 200;

      setTimeout(() => {
        for (let i = 0; i < 16; i++) {
          const angle = (i / 16) * Math.PI * 2;
          const radius = 20 + ring * 30;

          this.emit(
            centerX + Math.cos(angle) * radius,
            centerY + Math.sin(angle) * radius,
            'portal',
            {
              vx: Math.cos(angle) * 40,
              vy: Math.sin(angle) * 40,
              life: 1.2,
              size: 12,
              param1: i / 16,
            }
          );
        }
      }, delay);
    }

    // Star burst
    for (let i = 0; i < 40; i++) {
      const delay = i * 30;

      setTimeout(() => {
        const angle = Math.random() * Math.PI * 2;
        const speed = 50 + Math.random() * 100;

        this.emit(centerX, centerY, 'star', {
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 1.5,
          size: 6 + Math.random() * 4,
        });
      }, delay);
    }

    // Energy celebration
    setTimeout(() => {
      for (let i = 0; i < 30; i++) {
        const angle = Math.random() * Math.PI * 2;
        this.emit(centerX, centerY, 'energy', {
          vx: Math.cos(angle) * 60,
          vy: Math.sin(angle) * 60,
          life: 1.0,
          size: 10,
        });
      }
    }, 800);
  }

  // Level start effect
  public emitLevelStart(): void {
    const centerX = this.width / 2;
    const centerY = this.height / 2;

    // Materialization effect
    for (let i = 0; i < 20; i++) {
      const delay = i * 40;
      const angle = (i / 20) * Math.PI * 2;

      setTimeout(() => {
        this.emit(centerX, centerY, 'energy', {
          vx: Math.cos(angle) * 50,
          vy: Math.sin(angle) * 50,
          life: 0.8,
          size: 10,
          param1: i / 20,
        });
      }, delay);
    }

    // Central warp
    setTimeout(() => {
      for (let i = 0; i < 12; i++) {
        const angle = Math.random() * Math.PI * 2;
        this.emit(centerX, centerY, 'warp', {
          vx: Math.cos(angle) * 80,
          vy: Math.sin(angle) * 80,
          life: 0.6,
          size: 12,
        });
      }
    }, 500);
  }

  // Ambient particles
  public emitAmbient(): void {
    // Random stars
    if (Math.random() < 0.02) {
      this.emit(
        Math.random() * this.width,
        Math.random() * this.height,
        'star',
        {
          vx: (Math.random() - 0.5) * 5,
          vy: (Math.random() - 0.5) * 5,
          life: 2 + Math.random() * 2,
          size: 3 + Math.random() * 3,
        }
      );
    }

    // Occasional energy wisps
    if (Math.random() < 0.008) {
      this.emit(
        Math.random() * this.width,
        Math.random() * this.height,
        'energy',
        {
          vx: (Math.random() - 0.5) * 20,
          vy: (Math.random() - 0.5) * 20,
          life: 1.5,
          size: 8,
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
