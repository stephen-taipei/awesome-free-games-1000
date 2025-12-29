/**
 * Particle System - Season Change
 * Nature / Seasons Theme
 * Game #119
 */

export type ParticleType = 'petal' | 'leaf' | 'snowflake' | 'sunshine' | 'sparkle' | 'glow';

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
  petal: 0,
  leaf: 1,
  snowflake: 2,
  sunshine: 3,
  sparkle: 4,
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
        case 'petal':
          // Petals sway and float down gently
          p.vx += Math.sin(p.life * 5 + p.param1 * 10) * 20 * deltaTime;
          p.vy += 15 * deltaTime;
          p.vx *= 0.98;
          break;
        case 'leaf':
          // Leaves spiral down with rotation
          p.vx += Math.sin(p.life * 3 + p.param1 * 5) * 30 * deltaTime;
          p.vy += 25 * deltaTime;
          p.vx *= 0.96;
          p.param3 += deltaTime * 3; // Rotation
          break;
        case 'snowflake':
          // Snowflakes drift slowly
          p.vx += Math.sin(p.life * 2 + p.param1 * 8) * 10 * deltaTime;
          p.vy += 10 * deltaTime;
          p.vx *= 0.99;
          break;
        case 'sunshine':
          // Sunshine rises and sparkles
          p.vx *= 0.95;
          p.vy *= 0.95;
          p.vy -= 5 * deltaTime;
          break;
        case 'sparkle':
          // Sparkles burst and fade
          p.vx *= 0.92;
          p.vy *= 0.92;
          break;
        case 'glow':
          // Glow floats gently
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

  // Season change effect
  public emitSeasonChange(season: 'spring' | 'summer' | 'autumn' | 'winter'): void {
    const centerX = this.width / 2;
    const centerY = this.height / 2;

    // Sparkle burst
    for (let i = 0; i < 25; i++) {
      const angle = (i / 25) * Math.PI * 2;
      const speed = 50 + Math.random() * 30;

      this.emit(centerX, centerY, 'sparkle', {
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.8 + Math.random() * 0.4,
        size: 10 + Math.random() * 6,
      });
    }

    // Season-specific particles
    for (let i = 0; i < 30; i++) {
      const x = Math.random() * this.width;
      const y = Math.random() * this.height * 0.5;
      const delay = i * 30;

      setTimeout(() => {
        if (season === 'spring') {
          this.emit(x, y, 'petal', {
            vx: (Math.random() - 0.5) * 20,
            vy: Math.random() * 10,
            life: 2.5 + Math.random() * 1.5,
            size: 8 + Math.random() * 4,
          });
        } else if (season === 'summer') {
          this.emit(x, y, 'sunshine', {
            vx: (Math.random() - 0.5) * 15,
            vy: -10 - Math.random() * 10,
            life: 1.5 + Math.random(),
            size: 10 + Math.random() * 5,
          });
        } else if (season === 'autumn') {
          this.emit(x, y, 'leaf', {
            vx: (Math.random() - 0.5) * 30,
            vy: Math.random() * 15,
            life: 3 + Math.random() * 2,
            size: 10 + Math.random() * 6,
          });
        } else {
          this.emit(x, y, 'snowflake', {
            vx: (Math.random() - 0.5) * 15,
            vy: Math.random() * 5,
            life: 3.5 + Math.random() * 2,
            size: 6 + Math.random() * 4,
          });
        }
      }, delay);
    }
  }

  // Player move effect
  public emitPlayerMove(x: number, y: number, season: 'spring' | 'summer' | 'autumn' | 'winter'): void {
    const type: ParticleType = season === 'spring' ? 'petal' :
      season === 'summer' ? 'sunshine' :
      season === 'autumn' ? 'leaf' : 'snowflake';

    for (let i = 0; i < 5; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 15 + Math.random() * 10;

      this.emit(x, y, type, {
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.5 + Math.random() * 0.3,
        size: 6 + Math.random() * 3,
      });
    }

    // Small glow
    this.emit(x, y, 'glow', {
      vx: 0,
      vy: 0,
      life: 0.4,
      size: 15,
    });
  }

  // Goal reached effect
  public emitGoalReached(x: number, y: number): void {
    // Celebratory sparkles
    for (let i = 0; i < 20; i++) {
      const angle = (i / 20) * Math.PI * 2;
      const speed = 40 + Math.random() * 20;

      this.emit(x, y, 'sparkle', {
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1.0 + Math.random() * 0.5,
        size: 12 + Math.random() * 6,
      });
    }

    // Central glow
    this.emit(x, y, 'glow', {
      vx: 0,
      vy: 0,
      life: 1.5,
      size: 40,
    });
  }

  // Reset effect
  public emitReset(): void {
    const centerX = this.width / 2;
    const centerY = this.height / 2;

    for (let i = 0; i < 15; i++) {
      const angle = (i / 15) * Math.PI * 2;
      const radius = 80;
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;

      this.emit(x, y, 'sparkle', {
        vx: -Math.cos(angle) * 30,
        vy: -Math.sin(angle) * 30,
        life: 0.7,
        size: 8,
      });
    }
  }

  // Victory effect
  public emitVictory(): void {
    const centerX = this.width / 2;
    const centerY = this.height * 0.4;

    // All seasons burst
    for (let wave = 0; wave < 4; wave++) {
      const delay = wave * 200;

      setTimeout(() => {
        const types: ParticleType[] = ['petal', 'sunshine', 'leaf', 'snowflake'];
        const type = types[wave];

        for (let i = 0; i < 20; i++) {
          const angle = (i / 20) * Math.PI * 2;
          const speed = 50 + wave * 10;

          this.emit(centerX, centerY, type, {
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: 1.5,
            size: 12,
          });
        }
      }, delay);
    }

    // Final sparkle burst
    setTimeout(() => {
      for (let i = 0; i < 30; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 60 + Math.random() * 40;

        this.emit(centerX, centerY, 'sparkle', {
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 20,
          life: 1.2,
          size: 10,
        });
      }
    }, 800);
  }

  // Level start effect
  public emitLevelStart(): void {
    const centerX = this.width / 2;
    const centerY = this.height / 2;

    for (let i = 0; i < 12; i++) {
      const delay = i * 40;
      const angle = (i / 12) * Math.PI * 2;

      setTimeout(() => {
        this.emit(
          centerX + Math.cos(angle) * 60,
          centerY + Math.sin(angle) * 40,
          'glow',
          {
            vx: Math.cos(angle) * 20,
            vy: Math.sin(angle) * 15,
            life: 0.8,
            size: 14,
          }
        );
      }, delay);
    }
  }

  // Ambient particles based on season
  public emitAmbient(season: 'spring' | 'summer' | 'autumn' | 'winter'): void {
    const chance = season === 'winter' ? 0.02 : 0.012;

    if (Math.random() < chance) {
      const x = Math.random() * this.width;
      const y = -10;

      if (season === 'spring') {
        this.emit(x, y, 'petal', {
          vx: (Math.random() - 0.5) * 15,
          vy: 10 + Math.random() * 10,
          life: 4 + Math.random() * 2,
          size: 6 + Math.random() * 4,
        });
      } else if (season === 'summer') {
        this.emit(x, Math.random() * this.height * 0.5, 'sunshine', {
          vx: (Math.random() - 0.5) * 10,
          vy: (Math.random() - 0.5) * 5,
          life: 2 + Math.random(),
          size: 5 + Math.random() * 3,
        });
      } else if (season === 'autumn') {
        this.emit(x, y, 'leaf', {
          vx: (Math.random() - 0.5) * 25,
          vy: 15 + Math.random() * 15,
          life: 5 + Math.random() * 3,
          size: 8 + Math.random() * 5,
        });
      } else {
        this.emit(x, y, 'snowflake', {
          vx: (Math.random() - 0.5) * 10,
          vy: 5 + Math.random() * 10,
          life: 6 + Math.random() * 3,
          size: 4 + Math.random() * 3,
        });
      }
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
