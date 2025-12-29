/**
 * WebGPU Particle System - Sound Puzzle
 * Music / Sound Waves / Audio Visualization Theme
 * Game #073
 */

export type ParticleType = 'wave' | 'pulse' | 'sparkle' | 'note' | 'harmony' | 'echo';

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  life: number;
  maxLife: number;
  color: { r: number; g: number; b: number };
  alpha: number;
  rotation: number;
  rotationSpeed: number;
  type: ParticleType;
}

// Note-themed colors matching the 4 game buttons
const NOTE_COLORS = [
  { r: 0.9, g: 0.3, b: 0.3 },   // Red (C4)
  { r: 0.2, g: 0.6, b: 0.9 },   // Blue (E4)
  { r: 0.2, g: 0.8, b: 0.4 },   // Green (G4)
  { r: 0.95, g: 0.6, b: 0.1 },  // Orange (C5)
];

const COLORS: Record<ParticleType, { r: number; g: number; b: number }[]> = {
  wave: [
    { r: 0.3, g: 0.6, b: 0.9 },
    { r: 0.4, g: 0.7, b: 1.0 },
    { r: 0.2, g: 0.5, b: 0.8 },
  ],
  pulse: [
    { r: 0.95, g: 0.6, b: 0.1 },
    { r: 1.0, g: 0.7, b: 0.2 },
    { r: 0.9, g: 0.5, b: 0.0 },
  ],
  sparkle: [
    { r: 1.0, g: 1.0, b: 0.9 },
    { r: 1.0, g: 0.9, b: 0.7 },
    { r: 0.9, g: 1.0, b: 1.0 },
  ],
  note: NOTE_COLORS,
  harmony: [
    { r: 0.8, g: 0.4, b: 0.9 },
    { r: 0.6, g: 0.3, b: 0.8 },
    { r: 0.9, g: 0.5, b: 1.0 },
  ],
  echo: [
    { r: 0.5, g: 0.5, b: 0.7 },
    { r: 0.4, g: 0.4, b: 0.6 },
    { r: 0.6, g: 0.6, b: 0.8 },
  ],
};

export class ParticleSystem {
  private particles: Particle[] = [];
  private maxParticles = 400;

  emit(x: number, y: number, type: ParticleType, count: number = 5, noteIndex?: number): void {
    const colors = COLORS[type];

    for (let i = 0; i < count && this.particles.length < this.maxParticles; i++) {
      let color: { r: number; g: number; b: number };

      // Use specific note color if provided
      if (type === 'note' && noteIndex !== undefined && noteIndex >= 0 && noteIndex < 4) {
        color = NOTE_COLORS[noteIndex];
      } else {
        color = colors[Math.floor(Math.random() * colors.length)];
      }

      const angle = Math.random() * Math.PI * 2;
      const speed = this.getSpeedForType(type);

      const particle: Particle = {
        x,
        y,
        vx: Math.cos(angle) * speed * (0.5 + Math.random()),
        vy: Math.sin(angle) * speed * (0.5 + Math.random()),
        size: this.getSizeForType(type),
        life: 1,
        maxLife: this.getLifeForType(type),
        color,
        alpha: 0.8 + Math.random() * 0.2,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: this.getRotationForType(type),
        type,
      };

      this.applyTypeModifiers(particle, type);
      this.particles.push(particle);
    }
  }

  private getSpeedForType(type: ParticleType): number {
    const speeds: Record<ParticleType, number> = {
      wave: 30,
      pulse: 80,
      sparkle: 60,
      note: 25,
      harmony: 20,
      echo: 40,
    };
    return speeds[type];
  }

  private getSizeForType(type: ParticleType): number {
    const sizes: Record<ParticleType, [number, number]> = {
      wave: [40, 60],
      pulse: [50, 80],
      sparkle: [10, 20],
      note: [25, 40],
      harmony: [60, 90],
      echo: [30, 50],
    };
    const [min, max] = sizes[type];
    return min + Math.random() * (max - min);
  }

  private getLifeForType(type: ParticleType): number {
    const lives: Record<ParticleType, number> = {
      wave: 1.2,
      pulse: 0.8,
      sparkle: 0.6,
      note: 1.5,
      harmony: 2.0,
      echo: 1.0,
    };
    return lives[type] * (0.8 + Math.random() * 0.4);
  }

  private getRotationForType(type: ParticleType): number {
    const rotations: Record<ParticleType, number> = {
      wave: 0.0,
      pulse: 0.2,
      sparkle: 2.0,
      note: 0.3,
      harmony: 0.5,
      echo: 0.0,
    };
    return rotations[type] * (0.5 + Math.random());
  }

  private applyTypeModifiers(p: Particle, type: ParticleType): void {
    switch (type) {
      case 'wave':
        // Expand outward
        p.vx *= 0.5;
        p.vy *= 0.5;
        break;
      case 'pulse':
        // Strong outward burst
        p.vx *= 1.5;
        p.vy *= 1.5;
        break;
      case 'sparkle':
        // Random scatter with upward bias
        p.vy -= 30;
        break;
      case 'note':
        // Float upward gently
        p.vy = -20 - Math.random() * 20;
        p.vx = (Math.random() - 0.5) * 40;
        break;
      case 'harmony':
        // Slow expansion
        p.vx *= 0.3;
        p.vy *= 0.3;
        break;
      case 'echo':
        // Ripple outward
        const angle = Math.random() * Math.PI * 2;
        p.vx = Math.cos(angle) * 40;
        p.vy = Math.sin(angle) * 40;
        break;
    }
  }

  update(deltaTime: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];

      p.x += p.vx * deltaTime;
      p.y += p.vy * deltaTime;
      p.rotation += p.rotationSpeed * deltaTime;
      p.life -= deltaTime / p.maxLife;

      // Type-specific updates
      switch (p.type) {
        case 'wave':
          p.size += deltaTime * 40;
          p.alpha = p.life * 0.6;
          break;
        case 'pulse':
          p.size += deltaTime * 60;
          p.alpha = p.life;
          p.vx *= 0.95;
          p.vy *= 0.95;
          break;
        case 'sparkle':
          p.alpha = p.life * (0.5 + Math.sin(Date.now() * 0.02) * 0.5);
          p.vy += deltaTime * 20; // Slight gravity
          break;
        case 'note':
          p.alpha = p.life * 0.8;
          p.x += Math.sin(Date.now() * 0.003 + p.rotation) * deltaTime * 10;
          break;
        case 'harmony':
          p.size += deltaTime * 25;
          p.alpha = p.life * 0.5;
          break;
        case 'echo':
          p.size += deltaTime * 20;
          p.alpha = p.life * 0.4;
          p.vx *= 0.98;
          p.vy *= 0.98;
          break;
      }

      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  getParticles(): Particle[] {
    return this.particles;
  }

  clear(): void {
    this.particles = [];
  }
}
