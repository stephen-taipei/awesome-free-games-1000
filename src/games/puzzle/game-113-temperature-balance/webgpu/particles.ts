/**
 * Particle System - Temperature Balance
 * Thermal / Fire & Ice Theme
 * Game #113
 */

export type ParticleType = 'flame' | 'ice' | 'heat' | 'frost' | 'spark' | 'steam';

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
  flame: 0,
  ice: 1,
  heat: 2,
  frost: 3,
  spark: 4,
  steam: 5,
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
        case 'flame':
          // Flames rise with turbulence
          p.vy -= 80 * deltaTime;
          p.vx += Math.sin(p.life * 10) * 30 * deltaTime;
          break;
        case 'ice':
          // Ice crystals drift slowly
          p.vy += 5 * deltaTime;
          p.vx = Math.sin(p.life * 3 + p.param1) * 15;
          break;
        case 'heat':
          // Heat waves rise and spread
          p.vy -= 40 * deltaTime;
          p.vx *= 0.98;
          break;
        case 'frost':
          // Frost falls gently
          p.vy += 15 * deltaTime;
          p.vx = Math.sin(p.life * 2 + p.param1) * 10;
          break;
        case 'spark':
          // Sparks fly up fast then fall
          p.vy += 60 * deltaTime;
          p.vx *= 0.95;
          break;
        case 'steam':
          // Steam rises and disperses
          p.vy -= 30 * deltaTime;
          p.vx += (Math.random() - 0.5) * 20 * deltaTime;
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

  // Hot zone click - fire burst
  public emitHot(x: number, y: number): void {
    // Flame burst
    for (let i = 0; i < 20; i++) {
      const angle = (Math.random() - 0.5) * Math.PI * 0.8 - Math.PI / 2;
      const speed = 60 + Math.random() * 80;

      this.emit(x, y, 'flame', {
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.8 + Math.random() * 0.5,
        size: 12 + Math.random() * 10,
        param1: Math.random(),
      });
    }

    // Sparks
    for (let i = 0; i < 12; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 80 + Math.random() * 60;

      this.emit(x, y, 'spark', {
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 50,
        life: 0.4 + Math.random() * 0.3,
        size: 4 + Math.random() * 4,
        param1: Math.random(),
      });
    }
  }

  // Cold zone click - ice burst
  public emitCold(x: number, y: number): void {
    // Ice crystals
    for (let i = 0; i < 15; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 30 + Math.random() * 50;

      this.emit(x, y, 'ice', {
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1.2 + Math.random() * 0.6,
        size: 10 + Math.random() * 8,
        param1: Math.random() * Math.PI * 2,
      });
    }

    // Frost particles
    for (let i = 0; i < 20; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 20 + Math.random() * 40;

      this.emit(x, y, 'frost', {
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1.0 + Math.random() * 0.5,
        size: 6 + Math.random() * 5,
        param1: Math.random() * 10,
      });
    }
  }

  // Heat transfer effect
  public emitTransfer(fromX: number, fromY: number, toX: number, toY: number, isHotToCol: boolean): void {
    const dx = toX - fromX;
    const dy = toY - fromY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const steps = Math.floor(dist / 20);

    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = fromX + dx * t;
      const y = fromY + dy * t;

      if (isHotToCol) {
        // Heat flowing to cold - heat waves
        this.emit(x, y, 'heat', {
          vx: dx * 0.5,
          vy: dy * 0.5 - 20,
          life: 0.6 + Math.random() * 0.3,
          size: 15 + Math.random() * 10,
          param1: t,
        });
      } else {
        // Cold flowing to hot - frost
        this.emit(x, y, 'frost', {
          vx: dx * 0.3,
          vy: dy * 0.3,
          life: 0.8 + Math.random() * 0.3,
          size: 8 + Math.random() * 6,
          param1: t,
        });
      }
    }

    // Steam at collision point
    const midX = (fromX + toX) / 2;
    const midY = (fromY + toY) / 2;

    for (let i = 0; i < 10; i++) {
      this.emit(midX, midY, 'steam', {
        vx: (Math.random() - 0.5) * 40,
        vy: -30 - Math.random() * 30,
        life: 1.0 + Math.random() * 0.5,
        size: 12 + Math.random() * 8,
        param1: Math.random(),
      });
    }
  }

  // Reset effect
  public emitReset(): void {
    const centerX = this.width / 2;
    const centerY = this.height / 2;

    // Mixed fire and ice
    for (let i = 0; i < 25; i++) {
      const angle = (i / 25) * Math.PI * 2;
      const radius = 50 + Math.random() * 50;
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;

      if (i % 2 === 0) {
        this.emit(x, y, 'flame', {
          vx: Math.cos(angle) * 60,
          vy: Math.sin(angle) * 60 - 30,
          life: 0.8,
          size: 15,
        });
      } else {
        this.emit(x, y, 'frost', {
          vx: Math.cos(angle) * 40,
          vy: Math.sin(angle) * 40,
          life: 1.0,
          size: 10,
        });
      }
    }

    // Central steam burst
    for (let i = 0; i < 15; i++) {
      const angle = Math.random() * Math.PI * 2;
      this.emit(centerX, centerY, 'steam', {
        vx: Math.cos(angle) * 50,
        vy: Math.sin(angle) * 50 - 40,
        life: 1.2,
        size: 15,
      });
    }
  }

  // Victory - balanced temperature celebration
  public emitVictory(): void {
    const centerX = this.width / 2;
    const centerY = this.height / 2;

    // Spiral of balanced particles
    for (let i = 0; i < 40; i++) {
      const delay = i * 50;
      const angle = (i / 40) * Math.PI * 6;
      const radius = 30 + i * 3;

      setTimeout(() => {
        const x = centerX + Math.cos(angle) * radius;
        const y = centerY + Math.sin(angle) * radius;

        // Alternating flame and ice
        if (i % 2 === 0) {
          this.emit(x, y, 'flame', {
            vx: Math.cos(angle + Math.PI / 2) * 30,
            vy: Math.sin(angle + Math.PI / 2) * 30 - 20,
            life: 1.2,
            size: 12,
          });
        } else {
          this.emit(x, y, 'ice', {
            vx: Math.cos(angle + Math.PI / 2) * 25,
            vy: Math.sin(angle + Math.PI / 2) * 25,
            life: 1.4,
            size: 10,
          });
        }

        // Sparks
        this.emit(x, y, 'spark', {
          vx: 0,
          vy: -50,
          life: 0.6,
          size: 5,
        });
      }, delay);
    }

    // Final steam celebration
    setTimeout(() => {
      for (let i = 0; i < 30; i++) {
        const angle = (i / 30) * Math.PI * 2;
        this.emit(centerX, centerY, 'steam', {
          vx: Math.cos(angle) * 80,
          vy: Math.sin(angle) * 80 - 30,
          life: 1.5,
          size: 18,
        });
      }
    }, 1500);
  }

  // Level start - temperature gauge effect
  public emitLevelStart(): void {
    const centerX = this.width / 2;
    const centerY = this.height / 2;

    // Hot side flames
    for (let i = 0; i < 10; i++) {
      setTimeout(() => {
        this.emit(centerX - 100, centerY + Math.random() * 100 - 50, 'flame', {
          vx: 30,
          vy: -40,
          life: 1.0,
          size: 15,
        });
      }, i * 100);
    }

    // Cold side ice
    for (let i = 0; i < 10; i++) {
      setTimeout(() => {
        this.emit(centerX + 100, centerY + Math.random() * 100 - 50, 'ice', {
          vx: -30,
          vy: 10,
          life: 1.2,
          size: 12,
        });
      }, i * 100);
    }

    // Center steam
    setTimeout(() => {
      for (let i = 0; i < 8; i++) {
        this.emit(centerX, centerY, 'steam', {
          vx: (Math.random() - 0.5) * 40,
          vy: -50,
          life: 1.0,
          size: 14,
        });
      }
    }, 800);
  }

  // Ambient particles
  public emitAmbient(): void {
    // Random embers on hot side
    if (Math.random() < 0.02) {
      this.emit(
        Math.random() * this.width * 0.4,
        this.height + 10,
        'spark',
        {
          vx: (Math.random() - 0.5) * 20,
          vy: -60 - Math.random() * 40,
          life: 1.5 + Math.random(),
          size: 4 + Math.random() * 3,
        }
      );
    }

    // Random frost on cold side
    if (Math.random() < 0.02) {
      this.emit(
        this.width * 0.6 + Math.random() * this.width * 0.4,
        -10,
        'frost',
        {
          vx: (Math.random() - 0.5) * 15,
          vy: 20 + Math.random() * 30,
          life: 2 + Math.random(),
          size: 5 + Math.random() * 4,
        }
      );
    }

    // Occasional heat shimmer
    if (Math.random() < 0.01) {
      this.emit(
        Math.random() * this.width * 0.5,
        Math.random() * this.height,
        'heat',
        {
          vx: 0,
          vy: -20,
          life: 0.8,
          size: 20,
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
