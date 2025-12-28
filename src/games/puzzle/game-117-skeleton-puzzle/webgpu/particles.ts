/**
 * Particle System - Skeleton Puzzle
 * Archaeology / Museum Theme
 * Game #117
 */

export type ParticleType = 'dust' | 'shimmer' | 'discovery' | 'trail' | 'excavate' | 'magic';

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
  dust: 0,
  shimmer: 1,
  discovery: 2,
  trail: 3,
  excavate: 4,
  magic: 5,
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
        case 'dust':
          // Dust floats and drifts
          p.vx *= 0.98;
          p.vy *= 0.98;
          p.vy -= 8 * deltaTime; // Float up
          p.vx += Math.sin(p.param1 + p.life * 2) * 5 * deltaTime;
          break;
        case 'shimmer':
          // Shimmer stays in place with slight movement
          p.vx *= 0.9;
          p.vy *= 0.9;
          break;
        case 'discovery':
          // Discovery bursts outward then fades
          p.vx *= 0.95;
          p.vy *= 0.95;
          break;
        case 'trail':
          // Trail fades in place
          p.vx *= 0.92;
          p.vy *= 0.92;
          break;
        case 'excavate':
          // Excavate scatters then settles
          p.vx *= 0.94;
          p.vy *= 0.94;
          p.vy += 30 * deltaTime; // Fall with gravity
          break;
        case 'magic':
          // Magic swirls gently
          p.vx *= 0.96;
          p.vy *= 0.96;
          const angle = Math.atan2(p.vy, p.vx) + 0.1;
          const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
          p.vx = Math.cos(angle) * speed;
          p.vy = Math.sin(angle) * speed;
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

  // Bone pickup effect
  public emitBonePickup(x: number, y: number): void {
    // Dust puff when picking up bone
    for (let i = 0; i < 8; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 20 + Math.random() * 20;

      this.emit(x, y, 'dust', {
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.6 + Math.random() * 0.3,
        size: 8 + Math.random() * 6,
      });
    }

    // Shimmer effect
    for (let i = 0; i < 4; i++) {
      this.emit(
        x + (Math.random() - 0.5) * 30,
        y + (Math.random() - 0.5) * 30,
        'shimmer',
        {
          vx: (Math.random() - 0.5) * 10,
          vy: (Math.random() - 0.5) * 10,
          life: 0.5,
          size: 12 + Math.random() * 8,
        }
      );
    }
  }

  // Bone placed correctly effect
  public emitBonePlaced(x: number, y: number): void {
    // Discovery burst
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      const speed = 40 + Math.random() * 20;

      this.emit(x, y, 'discovery', {
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.6 + Math.random() * 0.2,
        size: 10 + Math.random() * 6,
      });
    }

    // Magic glow
    for (let i = 0; i < 8; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * 20;

      this.emit(
        x + Math.cos(angle) * radius,
        y + Math.sin(angle) * radius,
        'magic',
        {
          vx: Math.cos(angle) * 15,
          vy: Math.sin(angle) * 15,
          life: 0.8,
          size: 14,
        }
      );
    }
  }

  // Bone drag trail
  public emitDragTrail(x: number, y: number): void {
    this.emit(x, y, 'trail', {
      vx: (Math.random() - 0.5) * 5,
      vy: (Math.random() - 0.5) * 5 - 5,
      life: 0.3,
      size: 6 + Math.random() * 4,
    });
  }

  // Wrong placement - excavate effect
  public emitExcavate(x: number, y: number): void {
    for (let i = 0; i < 10; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 30 + Math.random() * 30;

      this.emit(x, y, 'excavate', {
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 20,
        life: 0.5 + Math.random() * 0.3,
        size: 6 + Math.random() * 6,
      });
    }
  }

  // Reset effect
  public emitReset(): void {
    const centerX = this.width / 2;
    const centerY = this.height * 0.35;

    // Dust cloud
    for (let i = 0; i < 20; i++) {
      const angle = (i / 20) * Math.PI * 2;
      const radius = 80;
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius * 0.5;

      this.emit(x, y, 'dust', {
        vx: -Math.cos(angle) * 30,
        vy: -Math.sin(angle) * 20,
        life: 1.0,
        size: 10,
      });
    }
  }

  // Victory - skeleton complete
  public emitVictory(): void {
    const centerX = this.width / 2;
    const centerY = this.height * 0.35;

    // Magic celebration waves
    for (let wave = 0; wave < 3; wave++) {
      const delay = wave * 200;

      setTimeout(() => {
        for (let i = 0; i < 16; i++) {
          const angle = (i / 16) * Math.PI * 2;
          const radius = 50 + wave * 40;

          this.emit(
            centerX + Math.cos(angle) * radius * 0.3,
            centerY + Math.sin(angle) * radius * 0.2,
            'magic',
            {
              vx: Math.cos(angle) * 50,
              vy: Math.sin(angle) * 40,
              life: 1.2,
              size: 14,
            }
          );
        }
      }, delay);
    }

    // Discovery burst
    setTimeout(() => {
      for (let i = 0; i < 24; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 60 + Math.random() * 40;

        this.emit(centerX, centerY, 'discovery', {
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed * 0.7,
          life: 1.0,
          size: 12,
        });
      }
    }, 400);

    // Floating dust
    setTimeout(() => {
      for (let i = 0; i < 30; i++) {
        const x = Math.random() * this.width;
        const y = this.height * 0.2 + Math.random() * this.height * 0.4;

        this.emit(x, y, 'dust', {
          vx: (Math.random() - 0.5) * 20,
          vy: -10 - Math.random() * 20,
          life: 2.0,
          size: 8 + Math.random() * 6,
        });
      }
    }, 300);
  }

  // Level start effect
  public emitLevelStart(): void {
    const centerX = this.width / 2;
    const centerY = this.height * 0.4;

    // Shimmer reveal
    for (let i = 0; i < 15; i++) {
      const delay = i * 40;
      const angle = (i / 15) * Math.PI * 2;

      setTimeout(() => {
        this.emit(
          centerX + Math.cos(angle) * 60,
          centerY + Math.sin(angle) * 40,
          'shimmer',
          {
            vx: Math.cos(angle) * 20,
            vy: Math.sin(angle) * 15,
            life: 0.8,
            size: 12,
          }
        );
      }, delay);
    }

    // Dust settling
    for (let i = 0; i < 10; i++) {
      this.emit(
        50 + Math.random() * (this.width - 100),
        this.height * 0.7 + Math.random() * 30,
        'dust',
        {
          vx: (Math.random() - 0.5) * 15,
          vy: -15 - Math.random() * 10,
          life: 1.5,
          size: 8,
        }
      );
    }
  }

  // Ambient dust motes
  public emitAmbient(): void {
    if (Math.random() < 0.02) {
      this.emit(
        Math.random() * this.width,
        Math.random() * this.height * 0.7,
        'dust',
        {
          vx: (Math.random() - 0.5) * 5,
          vy: (Math.random() - 0.5) * 3 - 5,
          life: 3.0 + Math.random() * 2.0,
          size: 3 + Math.random() * 3,
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
