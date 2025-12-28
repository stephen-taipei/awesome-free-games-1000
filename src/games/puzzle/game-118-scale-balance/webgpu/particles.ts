/**
 * Particle System - Scale Balance
 * Physics / Equilibrium Theme
 * Game #118
 */

export type ParticleType = 'weight' | 'balance' | 'tilt' | 'trail' | 'spark' | 'glow';

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
  weight: 0,
  balance: 1,
  tilt: 2,
  trail: 3,
  spark: 4,
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

      p.x += p.vx * deltaTime;
      p.y += p.vy * deltaTime;

      switch (p.type) {
        case 'weight':
          // Weight falls with gravity
          p.vy += 80 * deltaTime;
          p.vx *= 0.98;
          break;
        case 'balance':
          // Balance floats gently
          p.vx *= 0.95;
          p.vy *= 0.95;
          p.vy -= 10 * deltaTime;
          break;
        case 'tilt':
          // Tilt scatters quickly
          p.vx *= 0.92;
          p.vy *= 0.92;
          break;
        case 'trail':
          // Trail fades in place
          p.vx *= 0.9;
          p.vy *= 0.9;
          break;
        case 'spark':
          // Spark rises and fades
          p.vx *= 0.96;
          p.vy *= 0.96;
          p.vy -= 15 * deltaTime;
          break;
        case 'glow':
          // Glow pulses gently
          p.vx *= 0.98;
          p.vy *= 0.98;
          break;
      }

      p.life -= deltaTime;

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

  // Weight pickup effect
  public emitWeightPickup(x: number, y: number): void {
    // Sparkle burst
    for (let i = 0; i < 8; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 30 + Math.random() * 20;

      this.emit(x, y, 'spark', {
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.4 + Math.random() * 0.2,
        size: 8 + Math.random() * 4,
      });
    }

    // Glow
    this.emit(x, y, 'glow', {
      vx: 0,
      vy: 0,
      life: 0.5,
      size: 20,
    });
  }

  // Weight placed effect
  public emitWeightPlaced(x: number, y: number, value: number): void {
    // Weight impact
    const count = 4 + value * 2;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 20 + Math.random() * 25 * value;

      this.emit(x, y, 'weight', {
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 20,
        life: 0.5 + Math.random() * 0.3,
        size: 6 + value * 2,
      });
    }

    // Impact glow
    this.emit(x, y, 'glow', {
      vx: 0,
      vy: 0,
      life: 0.6,
      size: 15 + value * 3,
    });
  }

  // Scale balanced effect
  public emitBalanced(pivotX: number, pivotY: number): void {
    // Balance celebration
    for (let i = 0; i < 16; i++) {
      const angle = (i / 16) * Math.PI * 2;
      const speed = 40;

      this.emit(pivotX, pivotY, 'balance', {
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.8 + Math.random() * 0.3,
        size: 12,
      });
    }

    // Central glow
    this.emit(pivotX, pivotY, 'glow', {
      vx: 0,
      vy: 0,
      life: 1.0,
      size: 30,
    });
  }

  // Scale tilting effect
  public emitTilt(pivotX: number, pivotY: number, direction: number): void {
    const dirX = direction > 0 ? 1 : -1;

    for (let i = 0; i < 6; i++) {
      const angle = (Math.random() - 0.5) * Math.PI * 0.5 + (dirX > 0 ? 0 : Math.PI);
      const speed = 30 + Math.random() * 20;

      this.emit(pivotX, pivotY, 'tilt', {
        vx: Math.cos(angle) * speed * dirX,
        vy: Math.sin(angle) * speed,
        life: 0.4 + Math.random() * 0.2,
        size: 8 + Math.random() * 4,
      });
    }
  }

  // Weight drag trail
  public emitDragTrail(x: number, y: number): void {
    this.emit(x, y, 'trail', {
      vx: (Math.random() - 0.5) * 5,
      vy: (Math.random() - 0.5) * 5,
      life: 0.25,
      size: 6 + Math.random() * 3,
    });
  }

  // Reset effect
  public emitReset(): void {
    const centerX = this.width / 2;
    const centerY = this.height * 0.4;

    // Scatter effect
    for (let i = 0; i < 20; i++) {
      const angle = (i / 20) * Math.PI * 2;
      const radius = 60;
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius * 0.5;

      this.emit(x, y, 'spark', {
        vx: -Math.cos(angle) * 40,
        vy: -Math.sin(angle) * 30,
        life: 0.8,
        size: 8,
      });
    }
  }

  // Victory effect
  public emitVictory(): void {
    const centerX = this.width / 2;
    const centerY = this.height * 0.4;

    // Balance celebration waves
    for (let wave = 0; wave < 3; wave++) {
      const delay = wave * 200;

      setTimeout(() => {
        for (let i = 0; i < 20; i++) {
          const angle = (i / 20) * Math.PI * 2;
          const radius = 30 + wave * 25;

          this.emit(
            centerX + Math.cos(angle) * radius * 0.3,
            centerY + Math.sin(angle) * radius * 0.2,
            'balance',
            {
              vx: Math.cos(angle) * 50,
              vy: Math.sin(angle) * 40,
              life: 1.0,
              size: 12,
            }
          );
        }
      }, delay);
    }

    // Golden sparks
    setTimeout(() => {
      for (let i = 0; i < 30; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 50 + Math.random() * 40;

        this.emit(centerX, centerY, 'spark', {
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed * 0.7 - 20,
          life: 1.2,
          size: 10,
        });
      }
    }, 400);
  }

  // Level start effect
  public emitLevelStart(): void {
    const centerX = this.width / 2;
    const centerY = this.height * 0.4;

    // Scale activation
    for (let i = 0; i < 12; i++) {
      const delay = i * 30;
      const angle = (i / 12) * Math.PI * 2;

      setTimeout(() => {
        this.emit(
          centerX + Math.cos(angle) * 50,
          centerY + Math.sin(angle) * 30,
          'glow',
          {
            vx: Math.cos(angle) * 15,
            vy: Math.sin(angle) * 10,
            life: 0.8,
            size: 14,
          }
        );
      }, delay);
    }
  }

  // Ambient particles
  public emitAmbient(): void {
    if (Math.random() < 0.015) {
      this.emit(
        Math.random() * this.width,
        Math.random() * this.height * 0.7,
        'glow',
        {
          vx: (Math.random() - 0.5) * 5,
          vy: (Math.random() - 0.5) * 3,
          life: 2.5 + Math.random() * 1.5,
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
