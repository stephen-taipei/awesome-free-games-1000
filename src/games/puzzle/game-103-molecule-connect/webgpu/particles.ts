/**
 * Particle System - Molecule Connect
 * Science Lab / Chemistry Theme
 * Game #103
 */

export type ParticleType = 'electron' | 'bond' | 'correct' | 'break' | 'reaction' | 'molecule';

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
  electron: 0,
  bond: 1,
  correct: 2,
  break: 3,
  reaction: 4,
  molecule: 5,
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
        case 'electron':
          // Orbit behavior
          const centerX = p.extra;
          const angle = p.rotation;
          const radius = 30;
          p.vx = -Math.sin(angle) * radius * 3;
          p.vy = Math.cos(angle) * radius * 3;
          break;
        case 'bond':
          p.vx *= 0.98;
          p.vy *= 0.98;
          break;
        case 'correct':
          p.size *= 1.02;
          p.vx *= 0.9;
          p.vy *= 0.9;
          break;
        case 'break':
          p.vy += 50 * deltaTime;
          p.vx *= 0.95;
          break;
        case 'reaction':
          p.vx *= 0.95;
          p.vy *= 0.95;
          p.size *= 1.01;
          break;
        case 'molecule':
          p.vy += 20 * deltaTime;
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

  // Electron orbit around atom
  public emitElectrons(x: number, y: number): void {
    for (let i = 0; i < 3; i++) {
      const phase = (i / 3) * Math.PI * 2;
      this.emit({
        type: 'electron',
        x: x + Math.cos(phase) * 30,
        y: y + Math.sin(phase) * 30,
        size: 8,
        life: 1.0,
        rotation: phase,
        rotationSpeed: 4,
        extra: x, // Store center X for orbit
      });
    }
  }

  // Bond creation effect
  public emitBondCreate(x1: number, y1: number, x2: number, y2: number): void {
    const steps = 8;
    for (let i = 0; i < steps; i++) {
      const t = i / (steps - 1);
      const x = x1 + (x2 - x1) * t;
      const y = y1 + (y2 - y1) * t;

      this.emit({
        type: 'bond',
        x,
        y,
        vx: (Math.random() - 0.5) * 30,
        vy: (Math.random() - 0.5) * 30,
        size: 12 + Math.random() * 6,
        life: 0.5 + Math.random() * 0.2,
      });
    }

    // Reaction sparks at connection points
    for (let i = 0; i < 6; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 40 + Math.random() * 30;
      this.emit({
        type: 'reaction',
        x: x2,
        y: y2,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 10 + Math.random() * 5,
        life: 0.4 + Math.random() * 0.2,
      });
    }
  }

  // Correct bond match
  public emitCorrectBond(x: number, y: number): void {
    this.emit({
      type: 'correct',
      x,
      y,
      size: 30,
      life: 0.6,
    });

    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      this.emit({
        type: 'electron',
        x: x + Math.cos(angle) * 20,
        y: y + Math.sin(angle) * 20,
        vx: Math.cos(angle) * 30,
        vy: Math.sin(angle) * 30,
        size: 6,
        life: 0.4,
        extra: Math.random() * 10,
      });
    }
  }

  // Bond breaking effect
  public emitBondBreak(x1: number, y1: number, x2: number, y2: number): void {
    const midX = (x1 + x2) / 2;
    const midY = (y1 + y2) / 2;

    for (let i = 0; i < 10; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 60 + Math.random() * 40;
      this.emit({
        type: 'break',
        x: midX + (Math.random() - 0.5) * 20,
        y: midY + (Math.random() - 0.5) * 20,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 8 + Math.random() * 6,
        life: 0.4 + Math.random() * 0.2,
      });
    }
  }

  // Clear all bonds effect
  public emitClearAll(centerX: number, centerY: number): void {
    for (let i = 0; i < 15; i++) {
      const angle = (i / 15) * Math.PI * 2;
      const dist = 50;
      this.emit({
        type: 'break',
        x: centerX + Math.cos(angle) * dist,
        y: centerY + Math.sin(angle) * dist,
        vx: Math.cos(angle) * 80,
        vy: Math.sin(angle) * 80,
        size: 10,
        life: 0.5,
      });
    }
  }

  // Victory effect
  public emitVictory(): void {
    const cx = this.width / 2;
    const cy = this.height / 2;

    // Molecule explosion
    for (let i = 0; i < 35; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 70 + Math.random() * 100;
      this.emit({
        type: 'molecule',
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 18 + Math.random() * 12,
        life: 1.5 + Math.random() * 0.5,
        rotationSpeed: (Math.random() - 0.5) * 6,
      });
    }

    // Chemical reaction cascade
    for (let i = 0; i < 4; i++) {
      setTimeout(() => {
        const x = cx + (Math.random() - 0.5) * 200;
        const y = cy + (Math.random() - 0.5) * 150;

        for (let j = 0; j < 12; j++) {
          const angle = (j / 12) * Math.PI * 2;
          const speed = 50 + Math.random() * 40;
          this.emit({
            type: 'reaction',
            x,
            y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            size: 12 + Math.random() * 8,
            life: 0.8 + Math.random() * 0.3,
          });
        }
      }, i * 150);
    }
  }

  // Level start effect
  public emitLevelStart(): void {
    const cx = this.width / 2;
    const cy = this.height / 2;

    // Expanding electron rings
    for (let ring = 0; ring < 3; ring++) {
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        const delay = ring * 100;

        setTimeout(() => {
          this.emit({
            type: 'electron',
            x: cx,
            y: cy,
            vx: Math.cos(angle) * (40 + ring * 20),
            vy: Math.sin(angle) * (40 + ring * 20),
            size: 10 - ring * 2,
            life: 0.8,
            extra: Math.random() * 10,
          });
        }, delay);
      }
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
        type: 'break',
        x: cx + Math.cos(angle) * dist,
        y: cy + Math.sin(angle) * dist,
        vx: -Math.cos(angle) * 50,
        vy: -Math.sin(angle) * 50,
        size: 12,
        life: 0.5,
      });
    }
  }

  // Ambient electrons
  public emitAmbient(): void {
    if (Math.random() > 0.05) return;

    const x = Math.random() * this.width;
    const y = Math.random() * this.height;

    this.emit({
      type: 'electron',
      x,
      y,
      vx: (Math.random() - 0.5) * 20,
      vy: (Math.random() - 0.5) * 20,
      size: 4 + Math.random() * 4,
      life: 1.0 + Math.random() * 1.0,
      extra: Math.random() * 10,
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
