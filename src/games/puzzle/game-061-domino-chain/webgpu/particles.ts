/**
 * Particle System - Domino Chain
 * Wooden Board Game / Classic Domino Theme
 * Game #061
 */

export type ParticleType = 'dust' | 'spark' | 'glow' | 'impact' | 'ripple' | 'victory';

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

// Classic domino and wood color palette
const COLORS = {
  dust: [
    { r: 0.75, g: 0.60, b: 0.45 },  // Wood dust
    { r: 0.80, g: 0.65, b: 0.50 },  // Light dust
    { r: 0.70, g: 0.55, b: 0.40 },  // Dark dust
  ],
  spark: [
    { r: 1.00, g: 0.90, b: 0.60 },  // Golden spark
    { r: 1.00, g: 0.95, b: 0.80 },  // White spark
    { r: 0.95, g: 0.80, b: 0.50 },  // Amber spark
  ],
  glow: [
    { r: 0.20, g: 0.80, b: 0.50 },  // Target green
    { r: 0.30, g: 0.90, b: 0.60 },  // Light green
    { r: 0.15, g: 0.70, b: 0.45 },  // Dark green
  ],
  impact: [
    { r: 0.90, g: 0.80, b: 0.60 },  // Impact light
    { r: 0.80, g: 0.70, b: 0.50 },  // Impact mid
    { r: 0.95, g: 0.85, b: 0.65 },  // Impact bright
  ],
  ripple: [
    { r: 0.85, g: 0.75, b: 0.55 },  // Ripple warm
    { r: 0.90, g: 0.80, b: 0.60 },  // Ripple light
  ],
  victory: [
    { r: 0.93, g: 0.78, b: 0.05 },  // Gold
    { r: 0.10, g: 0.75, b: 0.60 },  // Teal
    { r: 0.20, g: 0.80, b: 0.20 },  // Green
    { r: 1.00, g: 1.00, b: 1.00 },  // White
    { r: 0.90, g: 0.45, b: 0.15 },  // Orange
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
      case 'dust':
        // Impact dust cloud
        const dustSpeed = Math.random() * 2 + 1;
        return {
          x: x + (Math.random() - 0.5) * 20,
          y: y + (Math.random() - 0.5) * 10,
          vx: Math.cos(angle) * dustSpeed,
          vy: Math.sin(angle) * dustSpeed - 0.5,
          life: 1,
          maxLife: 1,
          size: Math.random() * 15 + 10,
          type,
          color,
          alpha: 0.6,
          rotation: Math.random() * Math.PI * 2,
          rotationSpeed: (Math.random() - 0.5) * 0.05,
        };

      case 'spark':
        // Collision spark
        const sparkSpeed = Math.random() * 4 + 3;
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
        // Target glow
        return {
          x,
          y,
          vx: (Math.random() - 0.5) * 0.3,
          vy: (Math.random() - 0.5) * 0.3,
          life: 1,
          maxLife: 1,
          size: Math.random() * 20 + 15,
          type,
          color,
          alpha: 0.5,
          rotation: 0,
          rotationSpeed: 0,
        };

      case 'impact':
        // Collision impact ring
        const impactAngle = (Math.PI * 2 / 8) * Math.floor(Math.random() * 8);
        return {
          x: x + Math.cos(impactAngle) * 5,
          y: y + Math.sin(impactAngle) * 5,
          vx: Math.cos(impactAngle) * 2,
          vy: Math.sin(impactAngle) * 2,
          life: 1,
          maxLife: 1,
          size: Math.random() * 8 + 5,
          type,
          color,
          alpha: 0.8,
          rotation: impactAngle,
          rotationSpeed: 0,
        };

      case 'ripple':
        // Shockwave ripple
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
          alpha: 0.6,
          rotation: 0,
          rotationSpeed: 0,
        };

      case 'victory':
        // Celebration confetti
        const victorySpeed = Math.random() * 6 + 4;
        const victoryAngle = -Math.PI / 2 + (Math.random() - 0.5) * 1.5;
        return {
          x: x + (Math.random() - 0.5) * 150,
          y: y + Math.random() * 30,
          vx: Math.cos(victoryAngle) * victorySpeed * 0.3,
          vy: Math.sin(victoryAngle) * victorySpeed,
          life: 1,
          maxLife: 1,
          size: Math.random() * 10 + 5,
          type,
          color,
          alpha: 1,
          rotation: Math.random() * Math.PI * 2,
          rotationSpeed: (Math.random() - 0.5) * 0.5,
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
        case 'dust':
          p.vx *= 0.96;
          p.vy *= 0.96;
          p.vy -= 0.02 * dt;
          p.life -= 0.015 * dt;
          p.alpha = Math.sin(p.life * Math.PI) * 0.6;
          p.size += 0.2 * dt;
          break;

        case 'spark':
          p.vx *= 0.92;
          p.vy *= 0.92;
          p.vy += 0.05 * dt;
          p.life -= 0.04 * dt;
          p.alpha = p.life;
          p.size *= 0.97;
          break;

        case 'glow':
          p.size += 0.3 * dt;
          p.life -= 0.02 * dt;
          p.alpha = Math.sin(p.life * Math.PI) * 0.5;
          break;

        case 'impact':
          p.life -= 0.035 * dt;
          p.alpha = p.life * 0.8;
          p.size += 0.3 * dt;
          break;

        case 'ripple':
          p.life -= 0.025 * dt;
          p.size += 3 * dt;
          p.alpha = p.life * 0.6;
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
