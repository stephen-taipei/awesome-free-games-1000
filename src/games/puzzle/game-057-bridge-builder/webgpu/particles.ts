/**
 * Particle System - Bridge Builder
 * Industrial Engineering / Civil Construction Theme
 * Game #057
 */

export type ParticleType = 'spark' | 'beam' | 'bolt' | 'dust' | 'stress' | 'victory';

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
  alpha: number;
  rotation: number;
  rotationSpeed: number;
}

// Industrial construction color palette
const COLORS = {
  spark: [
    { r: 1.00, g: 0.80, b: 0.20 },  // Yellow spark
    { r: 1.00, g: 0.60, b: 0.10 },  // Orange spark
    { r: 1.00, g: 0.90, b: 0.50 },  // White-hot
  ],
  beam: [
    { r: 0.55, g: 0.27, b: 0.07 },  // Wood brown
    { r: 0.45, g: 0.52, b: 0.55 },  // Steel gray
    { r: 0.72, g: 0.40, b: 0.15 },  // Rust
  ],
  bolt: [
    { r: 0.50, g: 0.55, b: 0.58 },  // Steel
    { r: 0.60, g: 0.65, b: 0.68 },  // Light steel
    { r: 0.40, g: 0.42, b: 0.45 },  // Dark steel
  ],
  dust: [
    { r: 0.75, g: 0.65, b: 0.50 },  // Light dust
    { r: 0.60, g: 0.50, b: 0.40 },  // Medium dust
    { r: 0.50, g: 0.42, b: 0.32 },  // Dark dust
  ],
  stress: [
    { r: 0.90, g: 0.20, b: 0.10 },  // Danger red
    { r: 0.90, g: 0.50, b: 0.10 },  // Warning orange
    { r: 1.00, g: 0.80, b: 0.20 },  // Caution yellow
  ],
  victory: [
    { r: 0.16, g: 0.68, b: 0.38 },  // Success green
    { r: 0.90, g: 0.50, b: 0.13 },  // Construction orange
    { r: 0.20, g: 0.60, b: 0.86 },  // Safety blue
    { r: 1.00, g: 0.84, b: 0.00 },  // Gold
  ],
};

export class ParticleSystem {
  private particles: Particle[] = [];
  private maxParticles = 400;

  emit(x: number, y: number, type: ParticleType, count: number = 10): void {
    const colors = COLORS[type];

    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) {
        this.particles.shift();
      }

      const color = colors[Math.floor(Math.random() * colors.length)];
      const particle = this.createParticle(x, y, type, color);
      this.particles.push(particle);
    }
  }

  private createParticle(
    x: number,
    y: number,
    type: ParticleType,
    color: { r: number; g: number; b: number }
  ): Particle {
    const angle = Math.random() * Math.PI * 2;

    switch (type) {
      case 'spark':
        // Welding/construction sparks
        const sparkSpeed = Math.random() * 6 + 4;
        const sparkAngle = angle;
        return {
          x: x + (Math.random() - 0.5) * 10,
          y: y + (Math.random() - 0.5) * 10,
          vx: Math.cos(sparkAngle) * sparkSpeed,
          vy: Math.sin(sparkAngle) * sparkSpeed - 2,
          life: 1,
          maxLife: 1,
          size: Math.random() * 3 + 1,
          type,
          color,
          alpha: 1,
          rotation: angle,
          rotationSpeed: 0,
        };

      case 'beam':
        // Structural beam placement
        const beamSpeed = Math.random() * 2 + 1;
        return {
          x: x + (Math.random() - 0.5) * 20,
          y: y + (Math.random() - 0.5) * 20,
          vx: Math.cos(angle) * beamSpeed,
          vy: Math.sin(angle) * beamSpeed,
          life: 1,
          maxLife: 1,
          size: Math.random() * 8 + 4,
          type,
          color,
          alpha: 0.8,
          rotation: Math.random() * Math.PI,
          rotationSpeed: (Math.random() - 0.5) * 0.1,
        };

      case 'bolt':
        // Rivet/bolt connection
        const boltSpeed = Math.random() * 3 + 2;
        return {
          x: x + (Math.random() - 0.5) * 15,
          y: y + (Math.random() - 0.5) * 15,
          vx: Math.cos(angle) * boltSpeed,
          vy: Math.sin(angle) * boltSpeed,
          life: 1,
          maxLife: 1,
          size: Math.random() * 5 + 3,
          type,
          color,
          alpha: 0.9,
          rotation: 0,
          rotationSpeed: (Math.random() - 0.5) * 0.2,
        };

      case 'dust':
        // Construction dust
        return {
          x: x + (Math.random() - 0.5) * 40,
          y: y + (Math.random() - 0.5) * 20,
          vx: (Math.random() - 0.5) * 1,
          vy: -Math.random() * 1 - 0.5,
          life: 1,
          maxLife: 1,
          size: Math.random() * 6 + 3,
          type,
          color,
          alpha: 0.4,
          rotation: 0,
          rotationSpeed: 0,
        };

      case 'stress':
        // Structural stress warning
        return {
          x,
          y,
          vx: Math.cos(angle) * 0.5,
          vy: Math.sin(angle) * 0.5,
          life: 1,
          maxLife: 1,
          size: Math.random() * 10 + 8,
          type,
          color,
          alpha: 0.8,
          rotation: 0,
          rotationSpeed: 0,
        };

      case 'victory':
        // Success celebration
        const victorySpeed = Math.random() * 6 + 4;
        const victoryAngle = -Math.PI / 2 + (Math.random() - 0.5) * 1.5;
        return {
          x: x + (Math.random() - 0.5) * 150,
          y: y + Math.random() * 50,
          vx: Math.cos(victoryAngle) * victorySpeed,
          vy: Math.sin(victoryAngle) * victorySpeed,
          life: 1,
          maxLife: 1,
          size: Math.random() * 8 + 4,
          type,
          color,
          alpha: 1,
          rotation: Math.random() * Math.PI * 2,
          rotationSpeed: (Math.random() - 0.5) * 0.3,
        };

      default:
        return {
          x,
          y,
          vx: 0,
          vy: 0,
          life: 1,
          maxLife: 1,
          size: 3,
          type,
          color,
          alpha: 1,
          rotation: 0,
          rotationSpeed: 0,
        };
    }
  }

  update(deltaTime: number): void {
    const dt = deltaTime * 60;

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];

      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rotation += p.rotationSpeed * dt;

      switch (p.type) {
        case 'spark':
          p.vy += 0.2 * dt;
          p.vx *= 0.95;
          p.life -= 0.05 * dt;
          p.alpha = p.life;
          p.size *= 0.97;
          break;

        case 'beam':
          p.vx *= 0.92;
          p.vy *= 0.92;
          p.life -= 0.03 * dt;
          p.alpha = p.life * 0.8;
          break;

        case 'bolt':
          p.vy += 0.1 * dt;
          p.vx *= 0.95;
          p.life -= 0.035 * dt;
          p.alpha = p.life * 0.9;
          break;

        case 'dust':
          p.vx += (Math.random() - 0.5) * 0.05 * dt;
          p.life -= 0.015 * dt;
          p.alpha = Math.sin(p.life * Math.PI) * 0.4;
          p.size *= 1.005;
          break;

        case 'stress':
          p.size += 0.3 * dt;
          p.life -= 0.04 * dt;
          p.alpha = p.life * 0.8;
          break;

        case 'victory':
          p.vy += 0.12 * dt;
          p.vx *= 0.99;
          p.life -= 0.012 * dt;
          p.alpha = Math.min(1, p.life * 1.5);
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
