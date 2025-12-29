/**
 * Particle System - Room Escape
 * Mystery Escape Room / Detective Noir Theme
 * Game #060
 */

export type ParticleType = 'dust' | 'spark' | 'glow' | 'unlock' | 'mystery' | 'victory';

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

// Detective noir color palette
const COLORS = {
  dust: [
    { r: 0.85, g: 0.80, b: 0.70 },  // Warm dust
    { r: 0.75, g: 0.72, b: 0.68 },  // Gray dust
    { r: 0.90, g: 0.85, b: 0.75 },  // Light dust
  ],
  spark: [
    { r: 1.00, g: 0.90, b: 0.50 },  // Gold spark
    { r: 1.00, g: 0.95, b: 0.70 },  // Light gold
    { r: 0.95, g: 0.85, b: 0.40 },  // Deep gold
  ],
  glow: [
    { r: 0.95, g: 0.85, b: 0.55 },  // Warm lamp glow
    { r: 0.90, g: 0.75, b: 0.45 },  // Orange glow
    { r: 0.85, g: 0.80, b: 0.60 },  // Amber glow
  ],
  unlock: [
    { r: 0.30, g: 0.85, b: 0.45 },  // Green unlock
    { r: 0.40, g: 0.90, b: 0.55 },  // Light green
    { r: 0.25, g: 0.75, b: 0.40 },  // Deep green
  ],
  mystery: [
    { r: 0.50, g: 0.35, b: 0.70 },  // Purple mystery
    { r: 0.40, g: 0.30, b: 0.60 },  // Dark purple
    { r: 0.60, g: 0.45, b: 0.75 },  // Light purple
  ],
  victory: [
    { r: 1.00, g: 0.85, b: 0.20 },  // Gold
    { r: 0.30, g: 0.85, b: 0.50 },  // Green
    { r: 1.00, g: 1.00, b: 1.00 },  // White
    { r: 0.95, g: 0.70, b: 0.30 },  // Orange
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
        // Floating dust motes
        return {
          x: x + (Math.random() - 0.5) * 100,
          y: y + (Math.random() - 0.5) * 100,
          vx: (Math.random() - 0.5) * 0.3,
          vy: (Math.random() - 0.5) * 0.2 - 0.1,
          life: 1,
          maxLife: 1,
          size: Math.random() * 4 + 2,
          type,
          color,
          alpha: 0.4,
          rotation: Math.random() * Math.PI * 2,
          rotationSpeed: (Math.random() - 0.5) * 0.02,
        };

      case 'spark':
        // Discovery sparkle
        const sparkSpeed = Math.random() * 3 + 2;
        return {
          x: x + (Math.random() - 0.5) * 20,
          y: y + (Math.random() - 0.5) * 20,
          vx: Math.cos(angle) * sparkSpeed,
          vy: Math.sin(angle) * sparkSpeed,
          life: 1,
          maxLife: 1,
          size: Math.random() * 6 + 3,
          type,
          color,
          alpha: 1,
          rotation: angle,
          rotationSpeed: (Math.random() - 0.5) * 0.3,
        };

      case 'glow':
        // Ambient light glow
        return {
          x,
          y,
          vx: (Math.random() - 0.5) * 0.2,
          vy: (Math.random() - 0.5) * 0.2,
          life: 1,
          maxLife: 1,
          size: Math.random() * 25 + 15,
          type,
          color,
          alpha: 0.5,
          rotation: 0,
          rotationSpeed: 0,
        };

      case 'unlock':
        // Lock opening effect - expanding ring
        const unlockAngle = (Math.PI * 2 / 8) * Math.floor(Math.random() * 8);
        return {
          x: x + Math.cos(unlockAngle) * 10,
          y: y + Math.sin(unlockAngle) * 10,
          vx: Math.cos(unlockAngle) * 1.5,
          vy: Math.sin(unlockAngle) * 1.5,
          life: 1,
          maxLife: 1,
          size: Math.random() * 10 + 8,
          type,
          color,
          alpha: 1,
          rotation: unlockAngle,
          rotationSpeed: 0.1,
        };

      case 'mystery':
        // Mysterious aura
        return {
          x: x + (Math.random() - 0.5) * 40,
          y: y + (Math.random() - 0.5) * 40,
          vx: (Math.random() - 0.5) * 0.5,
          vy: (Math.random() - 0.5) * 0.5 - 0.2,
          life: 1,
          maxLife: 1,
          size: Math.random() * 20 + 15,
          type,
          color,
          alpha: 0.4,
          rotation: Math.random() * Math.PI * 2,
          rotationSpeed: (Math.random() - 0.5) * 0.03,
        };

      case 'victory':
        // Escape celebration
        const victorySpeed = Math.random() * 5 + 3;
        const victoryAngle = -Math.PI / 2 + (Math.random() - 0.5) * 1.2;
        return {
          x: x + (Math.random() - 0.5) * 100,
          y: y + Math.random() * 30,
          vx: Math.cos(victoryAngle) * victorySpeed,
          vy: Math.sin(victoryAngle) * victorySpeed,
          life: 1,
          maxLife: 1,
          size: Math.random() * 8 + 4,
          type,
          color,
          alpha: 1,
          rotation: Math.random() * Math.PI * 2,
          rotationSpeed: (Math.random() - 0.5) * 0.4,
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
          // Gentle floating
          p.vx += (Math.random() - 0.5) * 0.01 * dt;
          p.vy += (Math.random() - 0.5) * 0.01 * dt;
          p.vx *= 0.99;
          p.vy *= 0.99;
          p.life -= 0.008 * dt;
          p.alpha = Math.sin(p.life * Math.PI) * 0.4;
          break;

        case 'spark':
          p.vx *= 0.94;
          p.vy *= 0.94;
          p.life -= 0.035 * dt;
          p.alpha = p.life;
          p.size *= 0.98;
          break;

        case 'glow':
          p.size += 0.3 * dt;
          p.life -= 0.015 * dt;
          p.alpha = Math.sin(p.life * Math.PI) * 0.5;
          break;

        case 'unlock':
          p.life -= 0.025 * dt;
          p.alpha = p.life;
          p.size += 0.5 * dt;
          break;

        case 'mystery':
          p.vy -= 0.01 * dt;
          p.life -= 0.012 * dt;
          p.alpha = Math.sin(p.life * Math.PI) * 0.4;
          p.size *= 1.002;
          break;

        case 'victory':
          p.vy += 0.08 * dt;
          p.vx *= 0.99;
          p.life -= 0.015 * dt;
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
