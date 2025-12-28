/**
 * WebGPU Particle System - Time Rewind
 * Temporal / Cosmic / Time Vortex Theme
 * Game #072
 */

export type ParticleType = 'temporal' | 'rewind' | 'sparkle' | 'clockwork' | 'vortex' | 'chrono';

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

const COLORS: Record<ParticleType, { r: number; g: number; b: number }[]> = {
  temporal: [
    { r: 0.6, g: 0.4, b: 0.9 },
    { r: 0.5, g: 0.3, b: 0.8 },
    { r: 0.7, g: 0.5, b: 1.0 },
  ],
  rewind: [
    { r: 0.8, g: 0.4, b: 1.0 },
    { r: 0.9, g: 0.5, b: 0.9 },
    { r: 0.7, g: 0.3, b: 0.8 },
  ],
  sparkle: [
    { r: 1.0, g: 0.9, b: 0.7 },
    { r: 0.9, g: 0.8, b: 1.0 },
    { r: 1.0, g: 1.0, b: 0.9 },
  ],
  clockwork: [
    { r: 0.9, g: 0.7, b: 0.4 },
    { r: 0.8, g: 0.6, b: 0.3 },
    { r: 1.0, g: 0.8, b: 0.5 },
  ],
  vortex: [
    { r: 0.5, g: 0.2, b: 0.9 },
    { r: 0.4, g: 0.1, b: 0.8 },
    { r: 0.6, g: 0.3, b: 1.0 },
  ],
  chrono: [
    { r: 0.3, g: 0.6, b: 0.9 },
    { r: 0.4, g: 0.5, b: 0.8 },
    { r: 0.5, g: 0.7, b: 1.0 },
  ],
};

export class ParticleSystem {
  private particles: Particle[] = [];
  private maxParticles = 400;

  emit(x: number, y: number, type: ParticleType, count: number = 5): void {
    const colors = COLORS[type];

    for (let i = 0; i < count && this.particles.length < this.maxParticles; i++) {
      const color = colors[Math.floor(Math.random() * colors.length)];
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
      temporal: 40,
      rewind: 60,
      sparkle: 50,
      clockwork: 20,
      vortex: 70,
      chrono: 30,
    };
    return speeds[type];
  }

  private getSizeForType(type: ParticleType): number {
    const sizes: Record<ParticleType, [number, number]> = {
      temporal: [20, 35],
      rewind: [25, 40],
      sparkle: [8, 15],
      clockwork: [30, 50],
      vortex: [35, 55],
      chrono: [40, 60],
    };
    const [min, max] = sizes[type];
    return min + Math.random() * (max - min);
  }

  private getLifeForType(type: ParticleType): number {
    const lives: Record<ParticleType, number> = {
      temporal: 1.5,
      rewind: 1.2,
      sparkle: 0.8,
      clockwork: 2.0,
      vortex: 1.8,
      chrono: 2.5,
    };
    return lives[type] * (0.8 + Math.random() * 0.4);
  }

  private getRotationForType(type: ParticleType): number {
    const rotations: Record<ParticleType, number> = {
      temporal: 0.5,
      rewind: -2.0, // Reverse rotation for rewind
      sparkle: 1.0,
      clockwork: 0.8,
      vortex: 3.0,
      chrono: 0.3,
    };
    return rotations[type] * (0.5 + Math.random());
  }

  private applyTypeModifiers(p: Particle, type: ParticleType): void {
    switch (type) {
      case 'temporal':
        // Waves expand outward
        p.vx *= 1.2;
        p.vy *= 1.2;
        break;
      case 'rewind':
        // Spiral inward motion
        p.vx += (Math.random() - 0.5) * 30;
        p.vy -= 20;
        break;
      case 'sparkle':
        // Random scatter
        p.vx *= 0.5 + Math.random();
        p.vy *= 0.5 + Math.random();
        break;
      case 'clockwork':
        // Slow, methodical
        p.vx *= 0.5;
        p.vy *= 0.5;
        break;
      case 'vortex':
        // Strong outward burst
        p.vx *= 1.5;
        p.vy *= 1.5;
        break;
      case 'chrono':
        // Expand as rings
        p.vx *= 0.3;
        p.vy *= 0.3;
        p.size *= 0.8;
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
        case 'temporal':
          p.size += deltaTime * 15;
          p.alpha = p.life * 0.7;
          break;
        case 'rewind':
          p.rotationSpeed -= deltaTime * 0.5;
          p.vx *= 0.98;
          break;
        case 'sparkle':
          p.alpha = p.life * (0.5 + Math.sin(Date.now() * 0.01) * 0.5);
          break;
        case 'clockwork':
          p.size *= 1 + deltaTime * 0.1;
          p.alpha = p.life;
          break;
        case 'vortex':
          // Spiral motion
          const angle = Math.atan2(p.vy, p.vx);
          const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
          const newAngle = angle + deltaTime * 2;
          p.vx = Math.cos(newAngle) * speed * 0.98;
          p.vy = Math.sin(newAngle) * speed * 0.98;
          break;
        case 'chrono':
          p.size += deltaTime * 30;
          p.alpha = p.life * 0.5;
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
