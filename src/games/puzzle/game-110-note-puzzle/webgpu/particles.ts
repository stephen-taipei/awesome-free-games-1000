/**
 * Particle System - Note Puzzle
 * Music / Concert Hall Theme
 * Game #110
 */

export type ParticleType = 'note' | 'staff' | 'sparkle' | 'wave' | 'chord' | 'glow';

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  type: ParticleType;
  color: { r: number; g: number; b: number };
  extra: number;
}

const PARTICLE_TYPE_MAP: Record<ParticleType, number> = {
  note: 0,
  staff: 1,
  sparkle: 2,
  wave: 3,
  chord: 4,
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

  private emit(config: Partial<Particle> & { x: number; y: number; type: ParticleType }): void {
    if (this.particles.length >= this.maxParticles) {
      this.particles.shift();
    }

    const defaults: Particle = {
      x: config.x,
      y: config.y,
      vx: config.vx ?? 0,
      vy: config.vy ?? 0,
      life: config.life ?? 1,
      maxLife: config.maxLife ?? config.life ?? 1,
      size: config.size ?? 20,
      type: config.type,
      color: config.color ?? { r: 1, g: 1, b: 1 },
      extra: config.extra ?? 0,
    };

    this.particles.push(defaults);
  }

  public update(deltaTime: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= deltaTime;
      p.x += p.vx * deltaTime;
      p.y += p.vy * deltaTime;

      // Type-specific physics
      switch (p.type) {
        case 'note':
          p.vy += Math.sin(p.life * 5) * 20 * deltaTime; // Float up with wobble
          break;
        case 'staff':
          p.size += deltaTime * 100; // Expand horizontally
          break;
        case 'sparkle':
          p.vy -= 30 * deltaTime; // Float up
          break;
        case 'wave':
          p.size += deltaTime * 80; // Expanding ring
          break;
        case 'chord':
          p.vy -= 20 * deltaTime;
          break;
        case 'glow':
          // Stay in place with gentle pulse
          break;
      }

      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  // Ambient musical atmosphere
  public emitAmbient(): void {
    if (Math.random() < 0.02) {
      // Floating sparkle
      this.emit({
        x: Math.random() * this.width,
        y: this.height * (0.3 + Math.random() * 0.5),
        type: 'sparkle',
        life: 2.0,
        maxLife: 2.0,
        size: 10,
        vx: (Math.random() - 0.5) * 20,
        vy: -20,
        color: { r: 1.0, g: 0.9, b: 0.7 },
      });
    }
  }

  // Note click effect
  public emitNoteClick(x: number, y: number, pitch: number = 0): void {
    // Main note particle
    const hue = (pitch % 12) / 12;
    const color = this.hslToRgb(hue, 0.8, 0.6);

    this.emit({
      x,
      y,
      type: 'note',
      life: 1.5,
      maxLife: 1.5,
      size: 40,
      vx: 0,
      vy: -30,
      color,
    });

    // Sound wave ring
    this.emit({
      x,
      y,
      type: 'wave',
      life: 1.0,
      maxLife: 1.0,
      size: 20,
      color: { r: 0.6, g: 0.8, b: 1.0 },
    });

    // Sparkle burst
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      this.emit({
        x,
        y,
        vx: Math.cos(angle) * 60,
        vy: Math.sin(angle) * 60,
        type: 'sparkle',
        life: 0.8,
        maxLife: 0.8,
        size: 12,
        color: { r: 1.0, g: 0.95, b: 0.7 },
      });
    }
  }

  // Playing melody effect
  public emitMelody(x: number, y: number): void {
    // Glow effect
    this.emit({
      x,
      y,
      type: 'glow',
      life: 0.5,
      maxLife: 0.5,
      size: 50,
      color: { r: 0.8, g: 0.6, b: 1.0 },
    });

    // Rising notes
    for (let i = 0; i < 3; i++) {
      setTimeout(() => {
        this.emit({
          x: x + (Math.random() - 0.5) * 30,
          y,
          vx: (Math.random() - 0.5) * 20,
          vy: -50 - Math.random() * 30,
          type: 'note',
          life: 1.5,
          maxLife: 1.5,
          size: 25,
          color: { r: 0.9, g: 0.7, b: 1.0 },
        });
      }, i * 100);
    }
  }

  // Chord played effect
  public emitChord(x: number, y: number): void {
    this.emit({
      x,
      y,
      type: 'chord',
      life: 1.2,
      maxLife: 1.2,
      size: 60,
      color: { r: 0.7, g: 0.9, b: 1.0 },
    });

    // Multiple wave rings
    for (let i = 0; i < 3; i++) {
      setTimeout(() => {
        this.emit({
          x,
          y,
          type: 'wave',
          life: 1.5,
          maxLife: 1.5,
          size: 15 + i * 10,
          color: { r: 0.5 + i * 0.15, g: 0.7, b: 1.0 },
        });
      }, i * 80);
    }
  }

  // Reset effect
  public emitReset(): void {
    // Staff lines sweep
    for (let i = 0; i < 5; i++) {
      const y = this.height * (0.35 + i * 0.075);
      this.emit({
        x: 0,
        y,
        vx: 300,
        vy: 0,
        type: 'staff',
        life: 1.5,
        maxLife: 1.5,
        size: 10,
        color: { r: 0.8, g: 0.7, b: 0.9 },
      });
    }
  }

  // Victory celebration
  public emitVictory(): void {
    // Musical note fountain
    for (let i = 0; i < 40; i++) {
      setTimeout(() => {
        const x = this.width * (0.3 + Math.random() * 0.4);
        const hue = Math.random();
        const color = this.hslToRgb(hue, 0.8, 0.6);

        this.emit({
          x,
          y: this.height,
          vx: (Math.random() - 0.5) * 100,
          vy: -150 - Math.random() * 100,
          type: 'note',
          life: 2.5,
          maxLife: 2.5,
          size: 30 + Math.random() * 20,
          color,
        });
      }, i * 50);
    }

    // Grand chord
    setTimeout(() => {
      this.emit({
        x: this.width / 2,
        y: this.height / 2,
        type: 'chord',
        life: 2.0,
        maxLife: 2.0,
        size: 100,
        color: { r: 1.0, g: 0.85, b: 0.5 },
      });
    }, 500);

    // Sparkle shower
    for (let i = 0; i < 50; i++) {
      setTimeout(() => {
        this.emit({
          x: Math.random() * this.width,
          y: 0,
          vx: (Math.random() - 0.5) * 40,
          vy: 80 + Math.random() * 40,
          type: 'sparkle',
          life: 2.0,
          maxLife: 2.0,
          size: 15,
          color: { r: 1.0, g: 0.9, b: 0.6 },
        });
      }, 1000 + i * 40);
    }
  }

  // Level start effect
  public emitLevelStart(): void {
    // Center glow
    this.emit({
      x: this.width / 2,
      y: this.height / 2,
      type: 'glow',
      life: 1.5,
      maxLife: 1.5,
      size: 100,
      color: { r: 0.6, g: 0.4, b: 0.9 },
    });

    // Staff lines appear
    for (let i = 0; i < 5; i++) {
      setTimeout(() => {
        const y = this.height * (0.35 + i * 0.075);
        this.emit({
          x: this.width / 2,
          y,
          type: 'staff',
          life: 2.0,
          maxLife: 2.0,
          size: 5,
          color: { r: 0.9, g: 0.8, b: 1.0 },
        });
      }, i * 100);
    }

    // Welcoming sparkles
    for (let i = 0; i < 15; i++) {
      setTimeout(() => {
        const angle = (i / 15) * Math.PI * 2;
        const radius = 100;
        this.emit({
          x: this.width / 2 + Math.cos(angle) * radius,
          y: this.height / 2 + Math.sin(angle) * radius,
          vx: Math.cos(angle) * 40,
          vy: Math.sin(angle) * 40,
          type: 'sparkle',
          life: 1.0,
          maxLife: 1.0,
          size: 15,
          color: { r: 1.0, g: 0.9, b: 0.7 },
        });
      }, 500 + i * 30);
    }
  }

  private hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs((h * 6) % 2 - 1));
    const m = l - c / 2;

    let r = 0, g = 0, b = 0;
    if (h < 1/6) { r = c; g = x; }
    else if (h < 2/6) { r = x; g = c; }
    else if (h < 3/6) { g = c; b = x; }
    else if (h < 4/6) { g = x; b = c; }
    else if (h < 5/6) { r = x; b = c; }
    else { r = c; b = x; }

    return { r: r + m, g: g + m, b: b + m };
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
      data[offset + 8] = p.color.r;
      data[offset + 9] = p.color.g;
      data[offset + 10] = p.color.b;
      data[offset + 11] = p.extra;
    }

    return data;
  }

  public getParticleCount(): number {
    return this.particles.length;
  }

  public clear(): void {
    this.particles = [];
  }
}
