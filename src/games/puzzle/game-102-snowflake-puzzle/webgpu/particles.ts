/**
 * Particle System - Snowflake Puzzle
 * Winter Wonderland / Frozen Crystal Theme
 * Game #102
 */

export type ParticleType = 'crystal' | 'snow' | 'frost' | 'shimmer' | 'match' | 'burst';

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  rotation: number;
  rotationSpeed: number;
  type: ParticleType;
  extra: number;
}

const PARTICLE_TYPE_MAP: Record<ParticleType, number> = {
  crystal: 0,
  snow: 1,
  frost: 2,
  shimmer: 3,
  match: 4,
  burst: 5,
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
      p.rotation += p.rotationSpeed * deltaTime;

      // Type-specific behavior
      switch (p.type) {
        case 'crystal':
          p.rotationSpeed *= 0.98;
          p.vx *= 0.95;
          p.vy *= 0.95;
          break;
        case 'snow':
          p.vy += 10 * deltaTime; // Light gravity
          p.vx += Math.sin(p.life * 5) * 5 * deltaTime; // Drift
          break;
        case 'frost':
          p.size *= 1.02; // Expand
          p.vx *= 0.9;
          p.vy *= 0.9;
          break;
        case 'shimmer':
          p.vx *= 0.9;
          p.vy *= 0.9;
          break;
        case 'match':
          p.size *= 1.01;
          p.vx *= 0.95;
          p.vy *= 0.95;
          break;
        case 'burst':
          p.vy += 15 * deltaTime;
          p.rotationSpeed *= 0.99;
          break;
      }
    }
  }

  private emit(config: Partial<Particle> & { type: ParticleType }): void {
    if (this.particles.length >= this.maxParticles) return;

    const particle: Particle = {
      x: config.x ?? this.width / 2,
      y: config.y ?? this.height / 2,
      vx: config.vx ?? 0,
      vy: config.vy ?? 0,
      life: config.life ?? 1,
      maxLife: config.maxLife ?? config.life ?? 1,
      size: config.size ?? 20,
      rotation: config.rotation ?? Math.random() * Math.PI * 2,
      rotationSpeed: config.rotationSpeed ?? 0,
      type: config.type,
      extra: config.extra ?? 0,
    };

    this.particles.push(particle);
  }

  // Cell toggle effect
  public emitToggle(x: number, y: number, isActive: boolean): void {
    if (isActive) {
      // Crystal activation
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        const speed = 40 + Math.random() * 30;
        this.emit({
          type: 'crystal',
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          size: 15 + Math.random() * 10,
          life: 0.6 + Math.random() * 0.3,
          rotationSpeed: (Math.random() - 0.5) * 4,
        });
      }
      // Central shimmer
      this.emit({
        type: 'shimmer',
        x,
        y,
        size: 30,
        life: 0.3,
        extra: Math.random() * 10,
      });
    } else {
      // Frost dissipation
      for (let i = 0; i < 5; i++) {
        this.emit({
          type: 'frost',
          x: x + (Math.random() - 0.5) * 20,
          y: y + (Math.random() - 0.5) * 20,
          vx: (Math.random() - 0.5) * 30,
          vy: (Math.random() - 0.5) * 30,
          size: 10 + Math.random() * 8,
          life: 0.4 + Math.random() * 0.2,
        });
      }
    }
  }

  // Rotate effect
  public emitRotate(centerX: number, centerY: number, radius: number): void {
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      const r = radius * 0.5;
      this.emit({
        type: 'snow',
        x: centerX + Math.cos(angle) * r,
        y: centerY + Math.sin(angle) * r,
        vx: Math.cos(angle + Math.PI / 2) * 60,
        vy: Math.sin(angle + Math.PI / 2) * 60,
        size: 12 + Math.random() * 8,
        life: 0.5 + Math.random() * 0.3,
        rotationSpeed: 3,
      });
    }
  }

  // Clear effect
  public emitClear(centerX: number, centerY: number): void {
    // Inward frost collapse
    for (let i = 0; i < 20; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 100 + Math.random() * 50;
      const startX = centerX + Math.cos(angle) * dist;
      const startY = centerY + Math.sin(angle) * dist;
      this.emit({
        type: 'frost',
        x: startX,
        y: startY,
        vx: -Math.cos(angle) * 80,
        vy: -Math.sin(angle) * 80,
        size: 8 + Math.random() * 6,
        life: 0.5,
      });
    }
  }

  // Match correct cell
  public emitMatch(x: number, y: number): void {
    this.emit({
      type: 'match',
      x,
      y,
      size: 25,
      life: 0.5,
    });
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      this.emit({
        type: 'shimmer',
        x: x + Math.cos(angle) * 15,
        y: y + Math.sin(angle) * 15,
        vx: Math.cos(angle) * 20,
        vy: Math.sin(angle) * 20,
        size: 8,
        life: 0.4,
        extra: i,
      });
    }
  }

  // Victory effect
  public emitVictory(): void {
    const cx = this.width / 2;
    const cy = this.height / 2;

    // Snowflake explosion
    for (let i = 0; i < 40; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 80 + Math.random() * 100;
      this.emit({
        type: 'burst',
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 20 + Math.random() * 15,
        life: 1.5 + Math.random() * 0.5,
        rotationSpeed: (Math.random() - 0.5) * 8,
      });
    }

    // Shimmer cascade
    for (let i = 0; i < 30; i++) {
      setTimeout(() => {
        this.emit({
          type: 'shimmer',
          x: Math.random() * this.width,
          y: Math.random() * this.height,
          size: 15 + Math.random() * 10,
          life: 0.8 + Math.random() * 0.4,
          extra: Math.random() * 10,
        });
      }, i * 30);
    }
  }

  // Level start effect
  public emitLevelStart(): void {
    const cx = this.width / 2;
    const cy = this.height / 2;

    // Crystal formation
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2 - Math.PI / 2;
      for (let j = 0; j < 3; j++) {
        const dist = 30 + j * 25;
        setTimeout(() => {
          this.emit({
            type: 'crystal',
            x: cx + Math.cos(angle) * dist,
            y: cy + Math.sin(angle) * dist,
            vx: Math.cos(angle) * 20,
            vy: Math.sin(angle) * 20,
            size: 18 - j * 4,
            life: 0.8,
            rotationSpeed: 2,
          });
        }, j * 100);
      }
    }

    // Snow shower
    for (let i = 0; i < 15; i++) {
      this.emit({
        type: 'snow',
        x: Math.random() * this.width,
        y: -20,
        vx: (Math.random() - 0.5) * 20,
        vy: 30 + Math.random() * 20,
        size: 10 + Math.random() * 8,
        life: 1.0 + Math.random() * 0.5,
        rotationSpeed: (Math.random() - 0.5) * 2,
      });
    }
  }

  // Reset effect
  public emitReset(): void {
    const cx = this.width / 2;
    const cy = this.height / 2;

    // Inward collapse
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      const dist = 80;
      this.emit({
        type: 'frost',
        x: cx + Math.cos(angle) * dist,
        y: cy + Math.sin(angle) * dist,
        vx: -Math.cos(angle) * 60,
        vy: -Math.sin(angle) * 60,
        size: 15,
        life: 0.5,
      });
    }
  }

  // Ambient snow
  public emitAmbientSnow(): void {
    if (Math.random() > 0.1) return;

    this.emit({
      type: 'snow',
      x: Math.random() * this.width,
      y: -10,
      vx: (Math.random() - 0.5) * 15,
      vy: 15 + Math.random() * 10,
      size: 6 + Math.random() * 6,
      life: 3.0 + Math.random() * 2,
      rotationSpeed: (Math.random() - 0.5) * 1,
    });
  }

  public getParticleData(): Float32Array {
    const data = new Float32Array(this.maxParticles * 10);

    for (let i = 0; i < this.particles.length && i < this.maxParticles; i++) {
      const p = this.particles[i];
      const offset = i * 10;

      data[offset + 0] = p.x;
      data[offset + 1] = p.y;
      data[offset + 2] = p.vx;
      data[offset + 3] = p.vy;
      data[offset + 4] = p.life;
      data[offset + 5] = p.maxLife;
      data[offset + 6] = p.size;
      data[offset + 7] = p.rotation;
      data[offset + 8] = PARTICLE_TYPE_MAP[p.type];
      data[offset + 9] = p.extra;
    }

    return data;
  }

  public getParticleCount(): number {
    return Math.min(this.particles.length, this.maxParticles);
  }

  public clear(): void {
    this.particles = [];
  }
}
