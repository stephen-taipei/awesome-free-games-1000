/**
 * Particle System - Billiard Puzzle
 * Pool Table / Classic Theme
 * Game #116
 */

export type ParticleType = 'chalk' | 'impact' | 'collision' | 'pocket' | 'trail' | 'sparkle';

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
  chalk: 0,
  impact: 1,
  collision: 2,
  pocket: 3,
  trail: 4,
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

  public update(deltaTime: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];

      p.x += p.vx * deltaTime;
      p.y += p.vy * deltaTime;

      switch (p.type) {
        case 'chalk':
          // Chalk dust floats and spreads
          p.vx *= 0.95;
          p.vy *= 0.95;
          p.vy -= 5 * deltaTime; // Float up slightly
          break;
        case 'impact':
          // Impact expands
          p.vx *= 1.02;
          p.vy *= 1.02;
          break;
        case 'collision':
          // Collision sparks scatter
          p.vx *= 0.92;
          p.vy *= 0.92;
          break;
        case 'pocket':
          // Pocket swirls inward
          const angle = Math.atan2(p.vy, p.vx) + 0.2;
          const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy) * 0.95;
          p.vx = Math.cos(angle) * speed;
          p.vy = Math.sin(angle) * speed;
          break;
        case 'trail':
          // Trail fades in place
          p.vx *= 0.9;
          p.vy *= 0.9;
          break;
        case 'sparkle':
          // Sparkles drift
          p.vx *= 0.98;
          p.vy *= 0.98;
          p.vy += 20 * deltaTime; // Fall slowly
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

  // Cue shot effect (chalk dust)
  public emitCueShot(x: number, y: number, power: number): void {
    const count = Math.floor(8 + power * 8);

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 20 + Math.random() * 30 * power;

      this.emit(x, y, 'chalk', {
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.8 + Math.random() * 0.4,
        size: 8 + Math.random() * 6,
      });
    }
  }

  // Ball collision effect
  public emitCollision(x: number, y: number, impactForce: number): void {
    // Collision sparks
    for (let i = 0; i < 8; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 40 + Math.random() * 40 * impactForce;

      this.emit(x, y, 'collision', {
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.3 + Math.random() * 0.2,
        size: 6 + Math.random() * 4,
      });
    }
  }

  // Ball impact (hitting wall or ball)
  public emitBallImpact(x: number, y: number, colorR: number, colorG: number): void {
    for (let i = 0; i < 6; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 30 + Math.random() * 30;

      this.emit(x, y, 'impact', {
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.4 + Math.random() * 0.2,
        size: 10 + Math.random() * 6,
        param1: colorR,
        param2: colorG,
      });
    }
  }

  // Ball pocketed effect
  public emitPocketed(x: number, y: number): void {
    // Swirl into pocket
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      const radius = 25;

      this.emit(
        x + Math.cos(angle) * radius,
        y + Math.sin(angle) * radius,
        'pocket',
        {
          vx: Math.cos(angle + Math.PI / 2) * 40,
          vy: Math.sin(angle + Math.PI / 2) * 40,
          life: 0.8,
          size: 12,
          param1: i / 12,
        }
      );
    }

    // Central burst
    for (let i = 0; i < 8; i++) {
      const angle = Math.random() * Math.PI * 2;

      this.emit(x, y, 'sparkle', {
        vx: Math.cos(angle) * 50,
        vy: Math.sin(angle) * 50,
        life: 0.6,
        size: 8,
      });
    }
  }

  // Ball trail
  public emitTrail(x: number, y: number, colorR: number, colorG: number): void {
    this.emit(x, y, 'trail', {
      vx: (Math.random() - 0.5) * 5,
      vy: (Math.random() - 0.5) * 5,
      life: 0.3,
      size: 6 + Math.random() * 3,
      param1: colorR,
      param2: colorG,
    });
  }

  // Reset effect
  public emitReset(): void {
    const centerX = this.width / 2;
    const centerY = this.height / 2;

    // Chalk puff
    for (let i = 0; i < 20; i++) {
      const angle = (i / 20) * Math.PI * 2;
      const radius = 100;
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;

      this.emit(x, y, 'chalk', {
        vx: -Math.cos(angle) * 60,
        vy: -Math.sin(angle) * 60,
        life: 0.8,
        size: 12,
      });
    }
  }

  // Victory effect
  public emitVictory(): void {
    const centerX = this.width / 2;
    const centerY = this.height / 2;

    // Sparkle celebration
    for (let wave = 0; wave < 3; wave++) {
      const delay = wave * 200;

      setTimeout(() => {
        for (let i = 0; i < 20; i++) {
          const angle = (i / 20) * Math.PI * 2;
          const radius = 40 + wave * 30;

          this.emit(
            centerX + Math.cos(angle) * radius,
            centerY + Math.sin(angle) * radius,
            'sparkle',
            {
              vx: Math.cos(angle) * 40,
              vy: Math.sin(angle) * 40,
              life: 1.0,
              size: 10,
            }
          );
        }
      }, delay);
    }

    // Central pocket effect
    setTimeout(() => {
      for (let i = 0; i < 16; i++) {
        const angle = Math.random() * Math.PI * 2;

        this.emit(centerX, centerY, 'pocket', {
          vx: Math.cos(angle) * 60,
          vy: Math.sin(angle) * 60,
          life: 1.2,
          size: 14,
        });
      }
    }, 400);
  }

  // Level start effect
  public emitLevelStart(): void {
    const centerX = this.width / 2;
    const centerY = this.height / 2;

    // Rack formation burst
    for (let i = 0; i < 15; i++) {
      const delay = i * 30;
      const angle = (i / 15) * Math.PI * 2;

      setTimeout(() => {
        this.emit(centerX, centerY, 'chalk', {
          vx: Math.cos(angle) * 50,
          vy: Math.sin(angle) * 50,
          life: 0.8,
          size: 10,
        });
      }, delay);
    }
  }

  // Ambient particles
  public emitAmbient(): void {
    // Occasional dust motes
    if (Math.random() < 0.01) {
      this.emit(
        Math.random() * this.width,
        Math.random() * this.height,
        'chalk',
        {
          vx: (Math.random() - 0.5) * 5,
          vy: (Math.random() - 0.5) * 5 - 3,
          life: 2.0 + Math.random() * 1.0,
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
