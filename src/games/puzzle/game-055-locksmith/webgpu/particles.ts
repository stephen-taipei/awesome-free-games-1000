/**
 * Particle System - Locksmith
 * Vintage Locksmith Workshop / Steampunk Theme
 * Game #055
 */

export type ParticleType = 'spark' | 'pin' | 'click' | 'oil' | 'unlock' | 'victory';

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

// Vintage brass and metal color palette
const COLORS = {
  spark: [
    { r: 1.00, g: 0.85, b: 0.40 },  // Bright spark
    { r: 1.00, g: 0.70, b: 0.30 },  // Orange spark
    { r: 1.00, g: 0.95, b: 0.70 },  // White-hot
  ],
  pin: [
    { r: 0.72, g: 0.53, b: 0.25 },  // Brass
    { r: 0.80, g: 0.60, b: 0.30 },  // Light brass
    { r: 0.60, g: 0.45, b: 0.20 },  // Dark brass
  ],
  click: [
    { r: 0.20, g: 0.80, b: 0.45 },  // Success green
    { r: 0.30, g: 0.90, b: 0.55 },  // Bright green
    { r: 0.72, g: 0.53, b: 0.25 },  // Brass accent
  ],
  oil: [
    { r: 0.15, g: 0.12, b: 0.08 },  // Dark oil
    { r: 0.25, g: 0.20, b: 0.12 },  // Medium oil
    { r: 0.35, g: 0.30, b: 0.18 },  // Light oil
  ],
  unlock: [
    { r: 1.00, g: 0.84, b: 0.00 },  // Pure gold
    { r: 1.00, g: 0.75, b: 0.20 },  // Warm gold
    { r: 0.95, g: 0.90, b: 0.50 },  // Light gold
  ],
  victory: [
    { r: 1.00, g: 0.84, b: 0.00 },  // Gold
    { r: 0.72, g: 0.53, b: 0.25 },  // Brass
    { r: 0.85, g: 0.65, b: 0.15 },  // Amber
    { r: 0.60, g: 0.55, b: 0.50 },  // Silver
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
        // Metal sparks - fast, short-lived
        const sparkSpeed = Math.random() * 5 + 3;
        const sparkAngle = angle;
        return {
          x: x + (Math.random() - 0.5) * 10,
          y: y + (Math.random() - 0.5) * 10,
          vx: Math.cos(sparkAngle) * sparkSpeed,
          vy: Math.sin(sparkAngle) * sparkSpeed,
          life: 1,
          maxLife: 1,
          size: Math.random() * 3 + 1,
          type,
          color,
          alpha: 1,
          rotation: angle,
          rotationSpeed: 0,
        };

      case 'pin':
        // Pin movement - vertical, mechanical
        return {
          x: x + (Math.random() - 0.5) * 5,
          y,
          vx: 0,
          vy: Math.random() * 2 - 1,
          life: 1,
          maxLife: 1,
          size: Math.random() * 6 + 4,
          type,
          color,
          alpha: 0.8,
          rotation: 0,
          rotationSpeed: 0,
        };

      case 'click':
        // Satisfying click - expanding rings
        return {
          x,
          y,
          vx: Math.cos(angle) * 0.5,
          vy: Math.sin(angle) * 0.5,
          life: 1,
          maxLife: 1,
          size: Math.random() * 8 + 6,
          type,
          color,
          alpha: 0.9,
          rotation: 0,
          rotationSpeed: 0,
        };

      case 'oil':
        // Oil drops - slow, dripping
        return {
          x: x + (Math.random() - 0.5) * 15,
          y: y + (Math.random() - 0.5) * 5,
          vx: (Math.random() - 0.5) * 0.3,
          vy: Math.random() * 0.5 + 0.2,
          life: 1,
          maxLife: 1,
          size: Math.random() * 4 + 2,
          type,
          color,
          alpha: 0.7,
          rotation: 0,
          rotationSpeed: 0,
        };

      case 'unlock':
        // Unlock burst - radial golden rays
        const unlockSpeed = Math.random() * 4 + 2;
        return {
          x,
          y,
          vx: Math.cos(angle) * unlockSpeed,
          vy: Math.sin(angle) * unlockSpeed,
          life: 1,
          maxLife: 1,
          size: Math.random() * 10 + 5,
          type,
          color,
          alpha: 1,
          rotation: angle,
          rotationSpeed: 0.05,
        };

      case 'victory':
        // Victory confetti - falling golden pieces
        const victorySpeed = Math.random() * 5 + 3;
        const victoryAngle = -Math.PI / 2 + (Math.random() - 0.5) * 1.5;
        return {
          x: x + (Math.random() - 0.5) * 120,
          y: y + Math.random() * 40,
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
          // Rapid fade with gravity
          p.vy += 0.15 * dt;
          p.vx *= 0.95;
          p.life -= 0.06 * dt;
          p.alpha = p.life;
          p.size *= 0.97;
          break;

        case 'pin':
          // Spring back effect
          p.vx *= 0.9;
          p.vy *= 0.85;
          p.life -= 0.04 * dt;
          p.alpha = p.life * 0.8;
          break;

        case 'click':
          // Expand and fade
          p.size += 0.5 * dt;
          p.life -= 0.05 * dt;
          p.alpha = p.life * 0.9;
          break;

        case 'oil':
          // Slow drip with gravity
          p.vy += 0.02 * dt;
          p.life -= 0.02 * dt;
          p.alpha = p.life * 0.7;
          break;

        case 'unlock':
          // Golden burst decay
          p.vx *= 0.93;
          p.vy *= 0.93;
          p.life -= 0.025 * dt;
          p.alpha = p.life;
          p.size *= 0.98;
          break;

        case 'victory':
          // Confetti with gravity
          p.vy += 0.1 * dt;
          p.vx *= 0.99;
          p.life -= 0.01 * dt;
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
