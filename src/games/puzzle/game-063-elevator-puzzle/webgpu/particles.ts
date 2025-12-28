/**
 * Particle System - Elevator Puzzle
 * Modern Building / Urban Elevator Theme
 * Game #063
 */

export type ParticleType = 'spark' | 'glow' | 'ding' | 'confetti' | 'trail' | 'victory';

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

// Modern building color palette
const COLORS = {
  spark: [
    { r: 1.00, g: 0.95, b: 0.80 },  // Electric white
    { r: 0.95, g: 0.85, b: 0.50 },  // Warm spark
    { r: 0.80, g: 0.90, b: 1.00 },  // Blue spark
  ],
  glow: [
    { r: 0.20, g: 0.60, b: 0.90 },  // Blue indicator
    { r: 0.25, g: 0.80, b: 0.40 },  // Green indicator
    { r: 0.95, g: 0.75, b: 0.10 },  // Yellow indicator
  ],
  ding: [
    { r: 0.95, g: 0.85, b: 0.50 },  // Bell gold
    { r: 1.00, g: 0.95, b: 0.70 },  // Bright gold
    { r: 0.90, g: 0.75, b: 0.40 },  // Warm gold
  ],
  confetti: [
    { r: 0.91, g: 0.30, b: 0.24 },  // Red
    { r: 0.20, g: 0.60, b: 0.86 },  // Blue
    { r: 0.18, g: 0.80, b: 0.44 },  // Green
    { r: 0.95, g: 0.77, b: 0.06 },  // Gold
    { r: 0.61, g: 0.35, b: 0.71 },  // Purple
  ],
  trail: [
    { r: 0.50, g: 0.55, b: 0.60 },  // Steel gray
    { r: 0.40, g: 0.45, b: 0.50 },  // Dark steel
    { r: 0.60, g: 0.65, b: 0.70 },  // Light steel
  ],
  victory: [
    { r: 0.95, g: 0.77, b: 0.06 },  // Gold
    { r: 0.20, g: 0.60, b: 0.86 },  // Blue
    { r: 0.18, g: 0.80, b: 0.44 },  // Green
    { r: 1.00, g: 1.00, b: 1.00 },  // White
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
        // Electrical/mechanical spark
        const sparkSpeed = Math.random() * 3 + 2;
        return {
          x: x + (Math.random() - 0.5) * 10,
          y: y + (Math.random() - 0.5) * 10,
          vx: Math.cos(angle) * sparkSpeed,
          vy: Math.sin(angle) * sparkSpeed,
          life: 1,
          maxLife: 1,
          size: Math.random() * 5 + 3,
          type,
          color,
          alpha: 1,
          rotation: angle,
          rotationSpeed: 0,
        };

      case 'glow':
        // Button/indicator glow
        return {
          x,
          y,
          vx: 0,
          vy: 0,
          life: 1,
          maxLife: 1,
          size: Math.random() * 20 + 15,
          type,
          color,
          alpha: 0.7,
          rotation: 0,
          rotationSpeed: 0,
        };

      case 'ding':
        // Arrival notification ring
        return {
          x,
          y,
          vx: 0,
          vy: 0,
          life: 1,
          maxLife: 1,
          size: 5,
          type,
          color,
          alpha: 0.8,
          rotation: 0,
          rotationSpeed: 0,
        };

      case 'confetti':
        // Celebration confetti
        const confettiSpeed = Math.random() * 4 + 2;
        const confettiAngle = -Math.PI / 2 + (Math.random() - 0.5) * 1.5;
        return {
          x: x + (Math.random() - 0.5) * 80,
          y: y + Math.random() * 20,
          vx: Math.cos(confettiAngle) * confettiSpeed * 0.3,
          vy: Math.sin(confettiAngle) * confettiSpeed,
          life: 1,
          maxLife: 1,
          size: Math.random() * 8 + 4,
          type,
          color,
          alpha: 1,
          rotation: Math.random() * Math.PI * 2,
          rotationSpeed: (Math.random() - 0.5) * 0.4,
        };

      case 'trail':
        // Movement trail
        return {
          x: x + (Math.random() - 0.5) * 15,
          y: y + (Math.random() - 0.5) * 5,
          vx: (Math.random() - 0.5) * 0.3,
          vy: (Math.random() - 0.5) * 0.3,
          life: 1,
          maxLife: 1,
          size: Math.random() * 10 + 8,
          type,
          color,
          alpha: 0.5,
          rotation: 0,
          rotationSpeed: 0,
        };

      case 'victory':
        // Star burst celebration
        const victorySpeed = Math.random() * 5 + 3;
        const victoryAngle = -Math.PI / 2 + (Math.random() - 0.5) * 1.0;
        return {
          x: x + (Math.random() - 0.5) * 120,
          y: y + Math.random() * 30,
          vx: Math.cos(victoryAngle) * victorySpeed * 0.3,
          vy: Math.sin(victoryAngle) * victorySpeed,
          life: 1,
          maxLife: 1,
          size: Math.random() * 10 + 6,
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
          size: 5,
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
          p.vx *= 0.92;
          p.vy *= 0.92;
          p.vy += 0.03 * dt;
          p.life -= 0.04 * dt;
          p.alpha = p.life;
          p.size *= 0.97;
          break;

        case 'glow':
          p.size += 0.3 * dt;
          p.life -= 0.02 * dt;
          p.alpha = Math.sin(p.life * Math.PI) * 0.7;
          break;

        case 'ding':
          p.life -= 0.025 * dt;
          p.size += 3 * dt;
          p.alpha = p.life * 0.8;
          break;

        case 'confetti':
          p.vy += 0.08 * dt;
          p.vx *= 0.99;
          p.life -= 0.012 * dt;
          p.alpha = Math.min(1, p.life * 1.5);
          break;

        case 'trail':
          p.vx *= 0.95;
          p.vy *= 0.95;
          p.life -= 0.03 * dt;
          p.alpha = p.life * 0.5;
          p.size += 0.2 * dt;
          break;

        case 'victory':
          p.vy += 0.1 * dt;
          p.vx *= 0.99;
          p.life -= 0.01 * dt;
          p.alpha = Math.min(1, p.life * 1.4);
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
