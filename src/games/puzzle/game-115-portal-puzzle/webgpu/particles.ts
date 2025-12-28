/**
 * Particle System - Portal Puzzle
 * Portal / Dimensional Theme
 * Game #115
 */

export type ParticleType = 'vortex' | 'energy' | 'teleport' | 'trail' | 'warp' | 'spark';

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  type: ParticleType;
  param1: number; // Portal color: 0 = orange, 1 = blue
  param2: number;
  param3: number;
  param4: number;
}

const PARTICLE_TYPE_MAP: Record<ParticleType, number> = {
  vortex: 0,
  energy: 1,
  teleport: 2,
  trail: 3,
  warp: 4,
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
        case 'vortex':
          // Vortex spirals inward
          const vAngle = Math.atan2(p.vy, p.vx) + 0.15;
          const vSpeed = Math.sqrt(p.vx * p.vx + p.vy * p.vy) * 0.97;
          p.vx = Math.cos(vAngle) * vSpeed;
          p.vy = Math.sin(vAngle) * vSpeed;
          break;
        case 'energy':
          // Energy floats with slight oscillation
          p.vx += Math.sin(p.life * 8) * 5 * deltaTime;
          p.vy += Math.cos(p.life * 8) * 5 * deltaTime;
          p.vx *= 0.98;
          p.vy *= 0.98;
          break;
        case 'teleport':
          // Teleport expands rapidly then fades
          p.vx *= 1.05;
          p.vy *= 1.05;
          break;
        case 'trail':
          // Trails fade in place
          p.vx *= 0.92;
          p.vy *= 0.92;
          break;
        case 'warp':
          // Warp accelerates along original direction
          p.vx *= 1.03;
          p.vy *= 1.03;
          break;
        case 'spark':
          // Sparks decelerate quickly
          p.vx *= 0.94;
          p.vy *= 0.94;
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
      param1: options.param1 ?? 0,
      param2: options.param2 ?? Math.random(),
      param3: options.param3 ?? 0,
      param4: options.param4 ?? 0,
    });
  }

  // Portal placed effect
  public emitPortalPlaced(x: number, y: number, color: 'orange' | 'blue'): void {
    const colorParam = color === 'orange' ? 0 : 1;

    // Vortex ring
    for (let i = 0; i < 16; i++) {
      const angle = (i / 16) * Math.PI * 2;
      const speed = 50;

      this.emit(x, y, 'vortex', {
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1.0,
        size: 15,
        param1: colorParam,
      });
    }

    // Energy burst
    for (let i = 0; i < 12; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 30 + Math.random() * 40;

      this.emit(x, y, 'energy', {
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.8 + Math.random() * 0.3,
        size: 10 + Math.random() * 6,
        param1: colorParam,
        param2: colorParam,
      });
    }

    // Sparks
    for (let i = 0; i < 8; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 60 + Math.random() * 40;

      this.emit(x, y, 'spark', {
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.4 + Math.random() * 0.2,
        size: 6 + Math.random() * 4,
        param2: colorParam,
      });
    }
  }

  // Teleport effect
  public emitTeleport(fromX: number, fromY: number, toX: number, toY: number): void {
    // Entry flash
    for (let i = 0; i < 20; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 40 + Math.random() * 60;

      this.emit(fromX, fromY, 'teleport', {
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.5 + Math.random() * 0.3,
        size: 12 + Math.random() * 8,
      });
    }

    // Warp trail between portals
    const dx = toX - fromX;
    const dy = toY - fromY;
    const steps = 10;
    for (let i = 0; i < steps; i++) {
      const t = i / steps;
      const x = fromX + dx * t;
      const y = fromY + dy * t;
      const delay = i * 20;

      setTimeout(() => {
        this.emit(x, y, 'warp', {
          vx: dx * 0.1,
          vy: dy * 0.1,
          life: 0.6,
          size: 10,
        });
      }, delay);
    }

    // Exit flash
    setTimeout(() => {
      for (let i = 0; i < 15; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 30 + Math.random() * 50;

        this.emit(toX, toY, 'teleport', {
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 0.4 + Math.random() * 0.2,
          size: 10 + Math.random() * 6,
        });
      }
    }, 200);
  }

  // Player move trail
  public emitPlayerTrail(x: number, y: number): void {
    this.emit(x, y, 'trail', {
      vx: (Math.random() - 0.5) * 10,
      vy: (Math.random() - 0.5) * 10,
      life: 0.4,
      size: 8 + Math.random() * 4,
    });
  }

  // Portal idle effect
  public emitPortalIdle(x: number, y: number, color: 'orange' | 'blue'): void {
    if (Math.random() > 0.1) return;

    const colorParam = color === 'orange' ? 0 : 1;
    const angle = Math.random() * Math.PI * 2;
    const radius = 20 + Math.random() * 10;

    this.emit(
      x + Math.cos(angle) * radius,
      y + Math.sin(angle) * radius,
      'energy',
      {
        vx: Math.cos(angle + Math.PI / 2) * 20,
        vy: Math.sin(angle + Math.PI / 2) * 20,
        life: 0.8,
        size: 8,
        param1: colorParam,
        param2: colorParam,
      }
    );
  }

  // Reset effect
  public emitReset(): void {
    const centerX = this.width / 2;
    const centerY = this.height / 2;

    // Implosion effect
    for (let i = 0; i < 24; i++) {
      const angle = (i / 24) * Math.PI * 2;
      const radius = 120;
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;

      this.emit(x, y, 'warp', {
        vx: -Math.cos(angle) * 80,
        vy: -Math.sin(angle) * 80,
        life: 0.7,
        size: 12,
      });
    }

    // Central burst
    setTimeout(() => {
      for (let i = 0; i < 16; i++) {
        const angle = Math.random() * Math.PI * 2;
        this.emit(centerX, centerY, 'spark', {
          vx: Math.cos(angle) * 70,
          vy: Math.sin(angle) * 70,
          life: 0.5,
          size: 8,
          param2: Math.random(),
        });
      }
    }, 250);
  }

  // Victory effect
  public emitVictory(): void {
    const centerX = this.width / 2;
    const centerY = this.height / 2;

    // Double portal celebration
    for (let ring = 0; ring < 4; ring++) {
      const delay = ring * 150;

      setTimeout(() => {
        for (let i = 0; i < 20; i++) {
          const angle = (i / 20) * Math.PI * 2;
          const radius = 30 + ring * 25;
          const colorParam = i % 2 === 0 ? 0 : 1;

          this.emit(
            centerX + Math.cos(angle) * radius,
            centerY + Math.sin(angle) * radius,
            'vortex',
            {
              vx: Math.cos(angle) * 30,
              vy: Math.sin(angle) * 30,
              life: 1.2,
              size: 14,
              param1: colorParam,
            }
          );
        }
      }, delay);
    }

    // Energy celebration
    for (let i = 0; i < 40; i++) {
      const delay = i * 25;

      setTimeout(() => {
        const angle = Math.random() * Math.PI * 2;
        const speed = 40 + Math.random() * 80;
        const colorParam = Math.random() < 0.5 ? 0 : 1;

        this.emit(centerX, centerY, 'energy', {
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 1.0,
          size: 10 + Math.random() * 6,
          param1: colorParam,
          param2: colorParam,
        });
      }, delay);
    }

    // Final spark burst
    setTimeout(() => {
      for (let i = 0; i < 30; i++) {
        const angle = Math.random() * Math.PI * 2;
        this.emit(centerX, centerY, 'spark', {
          vx: Math.cos(angle) * 100,
          vy: Math.sin(angle) * 100,
          life: 0.8,
          size: 8,
          param2: Math.random(),
        });
      }
    }, 600);
  }

  // Level start effect
  public emitLevelStart(): void {
    const centerX = this.width / 2;
    const centerY = this.height / 2;

    // Portal materialization
    for (let i = 0; i < 16; i++) {
      const delay = i * 30;
      const angle = (i / 16) * Math.PI * 2;

      setTimeout(() => {
        this.emit(centerX, centerY, 'teleport', {
          vx: Math.cos(angle) * 60,
          vy: Math.sin(angle) * 60,
          life: 0.8,
          size: 12,
        });
      }, delay);
    }

    // Dimensional opening
    setTimeout(() => {
      for (let i = 0; i < 12; i++) {
        const angle = Math.random() * Math.PI * 2;
        this.emit(centerX, centerY, 'warp', {
          vx: Math.cos(angle) * 70,
          vy: Math.sin(angle) * 70,
          life: 0.6,
          size: 10,
        });
      }
    }, 400);
  }

  // Ambient particles
  public emitAmbient(): void {
    // Random dimensional sparks
    if (Math.random() < 0.015) {
      this.emit(
        Math.random() * this.width,
        Math.random() * this.height,
        'trail',
        {
          vx: (Math.random() - 0.5) * 10,
          vy: (Math.random() - 0.5) * 10,
          life: 1.5 + Math.random() * 1.5,
          size: 5 + Math.random() * 4,
        }
      );
    }

    // Occasional warp wisps
    if (Math.random() < 0.008) {
      const angle = Math.random() * Math.PI * 2;
      this.emit(
        Math.random() * this.width,
        Math.random() * this.height,
        'warp',
        {
          vx: Math.cos(angle) * 15,
          vy: Math.sin(angle) * 15,
          life: 1.0,
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
