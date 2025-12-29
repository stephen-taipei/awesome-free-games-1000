/**
 * WebGPU Particle System - Track Switch
 * Railway / Industrial Theme
 * Game #108
 */

export type ParticleType = 'steam' | 'spark' | 'signal' | 'smoke' | 'arrival' | 'coal';

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
}

const PARTICLE_TYPE_MAP: Record<ParticleType, number> = {
  steam: 0,
  spark: 1,
  signal: 2,
  smoke: 3,
  arrival: 4,
  coal: 5,
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
      p.life -= deltaTime;

      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      p.x += p.vx * deltaTime;
      p.y += p.vy * deltaTime;

      switch (p.type) {
        case 'steam':
          // Steam rises and expands
          p.vy -= 30 * deltaTime;
          p.vx += (Math.random() - 0.5) * 20 * deltaTime;
          p.size *= 1.01;
          break;
        case 'spark':
          // Sparks fall with gravity
          p.vy += 150 * deltaTime;
          p.vx *= 0.98;
          p.size *= 0.97;
          break;
        case 'signal':
          // Signals stay in place, just pulse
          p.vx = 0;
          p.vy = 0;
          break;
        case 'smoke':
          // Smoke drifts and fades
          p.vy -= 20 * deltaTime;
          p.vx += Math.sin(p.life * 3) * 10 * deltaTime;
          p.size *= 1.02;
          break;
        case 'arrival':
          // Celebration particles float up
          p.vy -= 40 * deltaTime;
          p.vx *= 0.95;
          break;
        case 'coal':
          // Coal embers fall slowly
          p.vy += 50 * deltaTime;
          p.vx += (Math.random() - 0.5) * 10 * deltaTime;
          break;
      }
    }
  }

  private emit(type: ParticleType, x: number, y: number, options: Partial<Particle> = {}): void {
    if (this.particles.length >= this.maxParticles) return;

    this.particles.push({
      x,
      y,
      vx: options.vx ?? 0,
      vy: options.vy ?? 0,
      life: options.life ?? 1,
      maxLife: options.maxLife ?? options.life ?? 1,
      size: options.size ?? 10,
      type,
      param1: options.param1 ?? Math.random(),
      param2: options.param2 ?? Math.random(),
    });
  }

  public emitAmbient(): void {
    // Occasional steam puffs
    if (Math.random() > 0.96) {
      this.emit('steam',
        Math.random() * this.width * 0.3,
        this.height * 0.6 + Math.random() * 50,
        {
          vx: 10 + Math.random() * 20,
          vy: -30 - Math.random() * 20,
          life: 2 + Math.random(),
          size: 15 + Math.random() * 15,
        }
      );
    }

    // Signal blinks
    if (Math.random() > 0.98) {
      this.emit('signal',
        this.width * 0.9,
        this.height * 0.25,
        {
          life: 0.5,
          size: 12,
          param1: Math.random() > 0.5 ? 1 : 0,
        }
      );
    }
  }

  // Switch toggle click effect
  public emitSwitch(x: number, y: number): void {
    // Sparks from switch mechanism
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2 + Math.random() * 0.3;
      const speed = 40 + Math.random() * 30;
      this.emit('spark', x, y, {
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 20,
        life: 0.5 + Math.random() * 0.3,
        size: 4 + Math.random() * 4,
        param1: Math.random(),
        param2: Math.random(),
      });
    }

    // Metal click signal
    this.emit('signal', x, y, {
      life: 0.3,
      size: 20,
      param1: 0.5,
    });
  }

  // Train moving effect
  public emitTrain(x: number, y: number): void {
    // Steam from locomotive
    for (let i = 0; i < 3; i++) {
      this.emit('steam', x, y - 20, {
        vx: 30 + Math.random() * 20,
        vy: -40 - Math.random() * 30,
        life: 1.5 + Math.random(),
        size: 20 + Math.random() * 15,
      });
    }

    // Smoke trail
    this.emit('smoke', x - 10, y - 30, {
      vx: 20 + Math.random() * 10,
      vy: -50 - Math.random() * 20,
      life: 2 + Math.random(),
      size: 25 + Math.random() * 20,
      param1: 0.3 + Math.random() * 0.3,
    });
  }

  // Crash effect
  public emitCrash(x: number, y: number): void {
    // Explosion of sparks
    for (let i = 0; i < 25; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 80 + Math.random() * 60;
      this.emit('spark', x, y, {
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1 + Math.random() * 0.5,
        size: 6 + Math.random() * 8,
        param1: Math.random(),
        param2: Math.random(),
      });
    }

    // Smoke cloud
    for (let i = 0; i < 15; i++) {
      this.emit('smoke',
        x + (Math.random() - 0.5) * 60,
        y + (Math.random() - 0.5) * 60,
        {
          vx: (Math.random() - 0.5) * 40,
          vy: -30 - Math.random() * 30,
          life: 2 + Math.random(),
          size: 30 + Math.random() * 25,
          param1: 0.2 + Math.random() * 0.2,
        }
      );
    }

    // Coal embers
    for (let i = 0; i < 10; i++) {
      this.emit('coal',
        x + (Math.random() - 0.5) * 40,
        y + (Math.random() - 0.5) * 40,
        {
          vx: (Math.random() - 0.5) * 60,
          vy: -50 + Math.random() * 30,
          life: 1.5 + Math.random(),
          size: 8 + Math.random() * 6,
          param1: Math.random(),
        }
      );
    }
  }

  // Reset - signal change
  public emitReset(): void {
    const centerX = this.width / 2;
    const centerY = this.height / 2;

    // Signal flashes across track
    for (let i = 0; i < 10; i++) {
      this.emit('signal',
        this.width * 0.1 + (i / 10) * this.width * 0.8,
        centerY,
        {
          life: 0.8,
          size: 15,
          param1: 0, // Red
        }
      );
    }

    // Steam clearing
    for (let i = 0; i < 8; i++) {
      this.emit('steam',
        centerX + (Math.random() - 0.5) * 200,
        centerY + (Math.random() - 0.5) * 100,
        {
          vx: (Math.random() - 0.5) * 40,
          vy: -50 - Math.random() * 30,
          life: 1.5 + Math.random(),
          size: 25 + Math.random() * 20,
        }
      );
    }
  }

  // Victory - all trains arrived
  public emitVictory(): void {
    const centerX = this.width / 2;
    const centerY = this.height / 2;

    // Celebration sparkles
    for (let i = 0; i < 40; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 60 + Math.random() * 60;
      this.emit('arrival',
        centerX + (Math.random() - 0.5) * 100,
        centerY + (Math.random() - 0.5) * 100,
        {
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 30,
          life: 2 + Math.random(),
          size: 10 + Math.random() * 10,
          param1: Math.random(),
        }
      );
    }

    // Green signals everywhere
    for (let i = 0; i < 15; i++) {
      this.emit('signal',
        Math.random() * this.width,
        this.height * 0.2 + Math.random() * this.height * 0.6,
        {
          life: 1.5,
          size: 18,
          param1: 1, // Green
        }
      );
    }

    // Triumphant steam
    for (let i = 0; i < 20; i++) {
      this.emit('steam',
        centerX + (Math.random() - 0.5) * 200,
        this.height,
        {
          vx: (Math.random() - 0.5) * 30,
          vy: -80 - Math.random() * 50,
          life: 2.5 + Math.random(),
          size: 30 + Math.random() * 25,
        }
      );
    }
  }

  // Level start - clear the tracks
  public emitLevelStart(): void {
    const centerX = this.width / 2;

    // Steam whistle effect
    for (let i = 0; i < 10; i++) {
      this.emit('steam',
        this.width * 0.1,
        this.height * 0.6,
        {
          vx: 40 + Math.random() * 20,
          vy: -60 - Math.random() * 40,
          life: 2 + Math.random(),
          size: 25 + Math.random() * 20,
        }
      );
    }

    // Signals turn green
    for (let i = 0; i < 6; i++) {
      setTimeout(() => {
        this.emit('signal',
          this.width * 0.2 + (i / 6) * this.width * 0.6,
          this.height * 0.25,
          {
            life: 1.2,
            size: 15,
            param1: 1, // Green
          }
        );
      }, i * 100);
    }

    // Sparks from tracks
    for (let i = 0; i < 8; i++) {
      this.emit('spark',
        centerX + (Math.random() - 0.5) * 150,
        this.height * 0.85,
        {
          vx: (Math.random() - 0.5) * 30,
          vy: -30 - Math.random() * 20,
          life: 0.6 + Math.random() * 0.3,
          size: 5 + Math.random() * 4,
          param1: Math.random(),
          param2: Math.random(),
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
    const data = new Float32Array(this.maxParticles * 10);
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      const offset = i * 10;
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
    }
    return data;
  }
}
