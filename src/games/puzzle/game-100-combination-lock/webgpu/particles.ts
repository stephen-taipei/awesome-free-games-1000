/**
 * Particle System - Combination Lock
 * Vault / Safe-Cracking / Heist Night Theme
 * Game #100
 */

export type ParticleType = 'dial' | 'click' | 'correct' | 'wrong' | 'unlock' | 'gear';

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
  dial: 0,
  click: 1,
  correct: 2,
  wrong: 3,
  unlock: 4,
  gear: 5,
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
        case 'dial':
          p.vx *= 0.95;
          p.vy *= 0.95;
          p.rotationSpeed *= 0.98;
          break;
        case 'click':
          p.vy += 80 * deltaTime; // Gravity
          p.vx *= 0.98;
          break;
        case 'correct':
          p.vx *= 0.92;
          p.vy *= 0.92;
          p.size *= 1.01;
          break;
        case 'wrong':
          p.vx *= 0.95;
          p.vy *= 0.95;
          break;
        case 'unlock':
          p.vy -= 20 * deltaTime; // Float up
          p.vx *= 0.98;
          break;
        case 'gear':
          p.vy += 40 * deltaTime;
          p.rotationSpeed += deltaTime * 2;
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

  // Dial rotation click
  public emitDialClick(x: number, y: number, direction: number): void {
    // Gear rotation effect
    for (let i = 0; i < 3; i++) {
      const angle = (i / 3) * Math.PI * 2 + Math.random() * 0.3;
      this.emit({
        type: 'dial',
        x: x + Math.cos(angle) * 15,
        y: y + Math.sin(angle) * 15,
        vx: Math.cos(angle) * 30 * direction,
        vy: Math.sin(angle) * 30,
        size: 25 + Math.random() * 10,
        life: 0.4,
        rotationSpeed: direction * 8,
      });
    }

    // Metallic sparks
    for (let i = 0; i < 5; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 60 + Math.random() * 40;
      this.emit({
        type: 'click',
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 30,
        size: 8 + Math.random() * 6,
        life: 0.5 + Math.random() * 0.3,
      });
    }
  }

  // Correct digit feedback
  public emitCorrect(x: number, y: number): void {
    // Green burst
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      const speed = 80 + Math.random() * 40;
      this.emit({
        type: 'correct',
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 30 + Math.random() * 15,
        life: 0.6 + Math.random() * 0.2,
      });
    }

    // Central flash
    this.emit({
      type: 'correct',
      x,
      y,
      vx: 0,
      vy: 0,
      size: 60,
      life: 0.4,
    });
  }

  // Wrong guess feedback
  public emitWrong(x: number, y: number): void {
    // Red X particles
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const speed = 50 + Math.random() * 30;
      this.emit({
        type: 'wrong',
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 25 + Math.random() * 10,
        life: 0.5 + Math.random() * 0.2,
      });
    }
  }

  // Lock unlocked - victory explosion
  public emitUnlock(x: number, y: number): void {
    // Golden explosion
    for (let i = 0; i < 40; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 100 + Math.random() * 150;
      this.emit({
        type: 'unlock',
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 20 + Math.random() * 30,
        life: 1.0 + Math.random() * 0.5,
      });
    }

    // Floating gears
    for (let i = 0; i < 15; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 40 + Math.random() * 60;
      this.emit({
        type: 'gear',
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 50,
        size: 15 + Math.random() * 20,
        life: 1.2 + Math.random() * 0.4,
        rotationSpeed: (Math.random() - 0.5) * 10,
      });
    }
  }

  // Victory celebration
  public emitVictory(): void {
    const cx = this.width / 2;
    const cy = this.height / 2;

    // Central unlock burst
    this.emitUnlock(cx, cy);

    // Additional corner bursts
    for (let i = 0; i < 4; i++) {
      setTimeout(() => {
        const x = (i % 2) * this.width * 0.8 + this.width * 0.1;
        const y = Math.floor(i / 2) * this.height * 0.6 + this.height * 0.2;

        for (let j = 0; j < 15; j++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = 60 + Math.random() * 80;
          this.emit({
            type: 'unlock',
            x,
            y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            size: 15 + Math.random() * 20,
            life: 0.8 + Math.random() * 0.4,
          });
        }
      }, i * 100);
    }
  }

  // Level start
  public emitLevelStart(): void {
    const cx = this.width / 2;
    const cy = this.height / 2;

    // Gear assembly effect
    for (let i = 0; i < 20; i++) {
      const angle = (i / 20) * Math.PI * 2;
      const radius = 100 + Math.random() * 50;
      this.emit({
        type: 'gear',
        x: cx + Math.cos(angle) * radius,
        y: cy + Math.sin(angle) * radius,
        vx: -Math.cos(angle) * 40,
        vy: -Math.sin(angle) * 40,
        size: 20 + Math.random() * 15,
        life: 0.8 + Math.random() * 0.3,
        rotationSpeed: (Math.random() - 0.5) * 6,
      });
    }

    // Central dial effect
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      this.emit({
        type: 'dial',
        x: cx,
        y: cy,
        vx: Math.cos(angle) * 60,
        vy: Math.sin(angle) * 60,
        size: 35,
        life: 0.6,
        rotationSpeed: 5,
      });
    }
  }

  // Reset effect
  public emitReset(): void {
    const cx = this.width / 2;
    const cy = this.height / 2;

    // Dials resetting
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      this.emit({
        type: 'dial',
        x: cx + Math.cos(angle) * 40,
        y: cy + Math.sin(angle) * 40,
        vx: Math.cos(angle + Math.PI) * 30,
        vy: Math.sin(angle + Math.PI) * 30,
        size: 30,
        life: 0.5,
        rotationSpeed: -8,
      });
    }
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
