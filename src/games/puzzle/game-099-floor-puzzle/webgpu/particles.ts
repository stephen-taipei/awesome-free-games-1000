/**
 * Particle System - Floor Puzzle
 * Urban Building / Neon Tower Theme
 * Game #099
 */

export type ParticleType = 'elevator' | 'passenger' | 'floor' | 'spark' | 'ding' | 'arrival';

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  type: ParticleType;
  rotation: number;
  rotationSpeed: number;
  value: number; // 0 = waiting/down, 1 = riding/up
}

const PARTICLE_TYPE_MAP: Record<ParticleType, number> = {
  elevator: 0,
  passenger: 1,
  floor: 2,
  spark: 3,
  ding: 4,
  arrival: 5,
};

export class ParticleSystem {
  private particles: Particle[] = [];
  private maxParticles = 500;
  private width: number;
  private height: number;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
  }

  public resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
  }

  private addParticle(particle: Particle): void {
    if (this.particles.length < this.maxParticles) {
      this.particles.push(particle);
    }
  }

  public update(deltaTime: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];

      p.x += p.vx * deltaTime;
      p.y += p.vy * deltaTime;
      p.life -= deltaTime;
      p.rotation += p.rotationSpeed * deltaTime;

      // Gravity for sparks
      if (p.type === 'spark') {
        p.vy += 200 * deltaTime;
        p.vx *= 0.98;
      }

      // Ding rings expand
      if (p.type === 'ding') {
        p.size += 60 * deltaTime;
      }

      // Arrival particles float up
      if (p.type === 'arrival') {
        p.vy -= 30 * deltaTime;
      }

      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  // Elevator moving
  public emitElevatorMove(x: number, y: number, direction: 'up' | 'down'): void {
    const velY = direction === 'up' ? -80 : 80;

    // Trail particles
    for (let i = 0; i < 5; i++) {
      this.addParticle({
        x: x + (Math.random() - 0.5) * 30,
        y: y + (direction === 'up' ? 20 : -20),
        vx: (Math.random() - 0.5) * 30,
        vy: velY * 0.3,
        life: 0.4 + Math.random() * 0.2,
        maxLife: 0.6,
        size: 10 + Math.random() * 10,
        type: 'elevator',
        rotation: 0,
        rotationSpeed: 0,
        value: 0,
      });
    }

    // Sparks from friction
    for (let i = 0; i < 3; i++) {
      this.addParticle({
        x: x + (Math.random() > 0.5 ? 25 : -25),
        y: y,
        vx: (Math.random() - 0.5) * 60,
        vy: -Math.random() * 50 - 30,
        life: 0.3 + Math.random() * 0.2,
        maxLife: 0.5,
        size: 3 + Math.random() * 4,
        type: 'spark',
        rotation: 0,
        rotationSpeed: 0,
        value: 0,
      });
    }
  }

  // Elevator arrives at floor
  public emitElevatorArrive(x: number, y: number): void {
    // Ding effect
    this.addParticle({
      x,
      y,
      vx: 0,
      vy: 0,
      life: 0.6,
      maxLife: 0.6,
      size: 10,
      type: 'ding',
      rotation: 0,
      rotationSpeed: 0,
      value: 0,
    });

    // Floor highlight
    this.addParticle({
      x,
      y,
      vx: 0,
      vy: 0,
      life: 0.5,
      maxLife: 0.5,
      size: 60,
      type: 'floor',
      rotation: 0,
      rotationSpeed: 0,
      value: 0,
    });
  }

  // Passenger boards
  public emitPassengerBoard(x: number, y: number): void {
    for (let i = 0; i < 3; i++) {
      this.addParticle({
        x: x - 40 + i * 20,
        y: y + (Math.random() - 0.5) * 10,
        vx: 30 + Math.random() * 20,
        vy: (Math.random() - 0.5) * 20,
        life: 0.5,
        maxLife: 0.5,
        size: 12 + Math.random() * 6,
        type: 'passenger',
        rotation: 0,
        rotationSpeed: 0,
        value: 1, // Riding (green)
      });
    }
  }

  // Passenger exits
  public emitPassengerExit(x: number, y: number): void {
    // Arrival celebration
    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI * 2 * i) / 8;
      const speed = 60 + Math.random() * 40;

      this.addParticle({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.8 + Math.random() * 0.3,
        maxLife: 1.1,
        size: 12 + Math.random() * 8,
        type: 'arrival',
        rotation: angle,
        rotationSpeed: (Math.random() - 0.5) * 3,
        value: 0,
      });
    }

    // Sparks
    for (let i = 0; i < 5; i++) {
      this.addParticle({
        x: x + (Math.random() - 0.5) * 20,
        y: y + (Math.random() - 0.5) * 20,
        vx: (Math.random() - 0.5) * 80,
        vy: -Math.random() * 60 - 30,
        life: 0.4 + Math.random() * 0.3,
        maxLife: 0.7,
        size: 4 + Math.random() * 4,
        type: 'spark',
        rotation: 0,
        rotationSpeed: 0,
        value: 0,
      });
    }
  }

  // All passengers delivered
  public emitVictory(): void {
    const cx = this.width / 2;
    const cy = this.height / 2;

    // Big celebration burst
    for (let i = 0; i < 40; i++) {
      const angle = (Math.PI * 2 * i) / 40 + Math.random() * 0.3;
      const speed = 100 + Math.random() * 150;

      this.addParticle({
        x: cx + (Math.random() - 0.5) * 80,
        y: cy + (Math.random() - 0.5) * 80,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1.5 + Math.random() * 0.5,
        maxLife: 2.0,
        size: 15 + Math.random() * 15,
        type: 'arrival',
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 4,
        value: 0,
      });
    }

    // Ding rings
    for (let i = 0; i < 3; i++) {
      setTimeout(() => {
        this.addParticle({
          x: cx,
          y: cy,
          vx: 0,
          vy: 0,
          life: 1.0,
          maxLife: 1.0,
          size: 20,
          type: 'ding',
          rotation: 0,
          rotationSpeed: 0,
          value: 0,
        });
      }, i * 200);
    }

    // Sparks everywhere
    for (let i = 0; i < 30; i++) {
      this.addParticle({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        vx: (Math.random() - 0.5) * 150,
        vy: -Math.random() * 100 - 50,
        life: 0.8 + Math.random() * 0.5,
        maxLife: 1.3,
        size: 5 + Math.random() * 6,
        type: 'spark',
        rotation: 0,
        rotationSpeed: 0,
        value: 0,
      });
    }
  }

  // Level start
  public emitLevelStart(): void {
    const cx = this.width / 2;
    const cy = this.height / 2;

    // Elevator appears
    for (let i = 0; i < 12; i++) {
      const angle = (Math.PI * 2 * i) / 12;
      const speed = 60 + Math.random() * 40;

      this.addParticle({
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.6 + Math.random() * 0.2,
        maxLife: 0.8,
        size: 15 + Math.random() * 10,
        type: 'elevator',
        rotation: angle,
        rotationSpeed: 0,
        value: 0,
      });
    }
  }

  // Reset
  public emitReset(): void {
    for (let i = 0; i < 10; i++) {
      this.addParticle({
        x: this.width / 2 + (Math.random() - 0.5) * 100,
        y: this.height / 2 + (Math.random() - 0.5) * 100,
        vx: (Math.random() - 0.5) * 60,
        vy: 30 + Math.random() * 40,
        life: 0.5,
        maxLife: 0.5,
        size: 8 + Math.random() * 8,
        type: 'floor',
        rotation: Math.random() * Math.PI,
        rotationSpeed: (Math.random() - 0.5) * 2,
        value: 0,
      });
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

      data[offset + 0] = p.x;
      data[offset + 1] = p.y;
      data[offset + 2] = p.vx;
      data[offset + 3] = p.vy;
      data[offset + 4] = p.life;
      data[offset + 5] = p.maxLife;
      data[offset + 6] = p.size;
      data[offset + 7] = PARTICLE_TYPE_MAP[p.type];
      data[offset + 8] = p.rotation;
      data[offset + 9] = p.value;
    }

    return data;
  }
}
