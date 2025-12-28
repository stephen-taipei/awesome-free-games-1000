/**
 * Particle System - Chemistry Puzzle
 * Science Lab / Chemistry Laboratory Theme
 * Game #058
 */

export type ParticleType = 'bubble' | 'element' | 'reaction' | 'glow' | 'smoke' | 'victory';

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

// Chemistry lab color palette
const COLORS = {
  bubble: [
    { r: 0.40, g: 0.70, b: 0.95 },  // Light blue
    { r: 0.50, g: 0.80, b: 1.00 },  // Sky blue
    { r: 0.60, g: 0.85, b: 0.95 },  // Pale cyan
  ],
  element: [
    { r: 0.20, g: 0.70, b: 0.40 },  // Green (nonmetal)
    { r: 0.20, g: 0.60, b: 0.85 },  // Blue (metal)
    { r: 0.60, g: 0.35, b: 0.70 },  // Purple (noble)
    { r: 0.95, g: 0.60, b: 0.10 },  // Orange (reactive)
  ],
  reaction: [
    { r: 1.00, g: 0.90, b: 0.30 },  // Yellow flash
    { r: 1.00, g: 0.70, b: 0.20 },  // Orange spark
    { r: 1.00, g: 1.00, b: 0.80 },  // White hot
  ],
  glow: [
    { r: 0.40, g: 0.90, b: 0.50 },  // Green glow
    { r: 0.50, g: 0.60, b: 0.95 },  // Blue glow
    { r: 0.90, g: 0.50, b: 0.80 },  // Pink glow
  ],
  smoke: [
    { r: 0.60, g: 0.65, b: 0.70 },  // Light gray
    { r: 0.50, g: 0.55, b: 0.60 },  // Medium gray
    { r: 0.70, g: 0.70, b: 0.75 },  // Silver
  ],
  victory: [
    { r: 0.60, g: 0.35, b: 0.70 },  // Purple
    { r: 0.20, g: 0.70, b: 0.40 },  // Green
    { r: 0.20, g: 0.60, b: 0.85 },  // Blue
    { r: 0.95, g: 0.75, b: 0.10 },  // Gold
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
      case 'bubble':
        // Rising bubbles with wobble
        return {
          x: x + (Math.random() - 0.5) * 30,
          y: y + Math.random() * 20,
          vx: (Math.random() - 0.5) * 0.5,
          vy: -Math.random() * 2 - 1,
          life: 1,
          maxLife: 1,
          size: Math.random() * 8 + 4,
          type,
          color,
          alpha: 0.7,
          rotation: 0,
          rotationSpeed: 0,
        };

      case 'element':
        // Element atom particle
        const elemSpeed = Math.random() * 4 + 2;
        return {
          x: x + (Math.random() - 0.5) * 20,
          y: y + (Math.random() - 0.5) * 20,
          vx: Math.cos(angle) * elemSpeed,
          vy: Math.sin(angle) * elemSpeed,
          life: 1,
          maxLife: 1,
          size: Math.random() * 10 + 6,
          type,
          color,
          alpha: 0.9,
          rotation: 0,
          rotationSpeed: (Math.random() - 0.5) * 0.1,
        };

      case 'reaction':
        // Chemical reaction sparks
        const reactionSpeed = Math.random() * 8 + 4;
        return {
          x: x + (Math.random() - 0.5) * 15,
          y: y + (Math.random() - 0.5) * 15,
          vx: Math.cos(angle) * reactionSpeed,
          vy: Math.sin(angle) * reactionSpeed - 2,
          life: 1,
          maxLife: 1,
          size: Math.random() * 4 + 2,
          type,
          color,
          alpha: 1,
          rotation: angle,
          rotationSpeed: 0,
        };

      case 'glow':
        // Soft ambient glow
        return {
          x,
          y,
          vx: (Math.random() - 0.5) * 0.5,
          vy: (Math.random() - 0.5) * 0.5,
          life: 1,
          maxLife: 1,
          size: Math.random() * 15 + 10,
          type,
          color,
          alpha: 0.5,
          rotation: 0,
          rotationSpeed: 0,
        };

      case 'smoke':
        // Reaction smoke rising
        return {
          x: x + (Math.random() - 0.5) * 30,
          y: y + (Math.random() - 0.5) * 10,
          vx: (Math.random() - 0.5) * 1,
          vy: -Math.random() * 1.5 - 0.5,
          life: 1,
          maxLife: 1,
          size: Math.random() * 12 + 6,
          type,
          color,
          alpha: 0.4,
          rotation: Math.random() * Math.PI * 2,
          rotationSpeed: (Math.random() - 0.5) * 0.05,
        };

      case 'victory':
        // Victory confetti
        const victorySpeed = Math.random() * 6 + 3;
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
        case 'bubble':
          p.vx += Math.sin(p.life * 10) * 0.02 * dt; // Wobble
          p.vy *= 0.99;
          p.life -= 0.012 * dt;
          p.alpha = p.life * 0.7;
          p.size *= 1.002;
          break;

        case 'element':
          p.vx *= 0.95;
          p.vy *= 0.95;
          p.life -= 0.03 * dt;
          p.alpha = p.life * 0.9;
          break;

        case 'reaction':
          p.vy += 0.15 * dt;
          p.vx *= 0.96;
          p.life -= 0.05 * dt;
          p.alpha = p.life;
          p.size *= 0.97;
          break;

        case 'glow':
          p.size += 0.2 * dt;
          p.life -= 0.025 * dt;
          p.alpha = Math.sin(p.life * Math.PI) * 0.5;
          break;

        case 'smoke':
          p.vx += (Math.random() - 0.5) * 0.1 * dt;
          p.life -= 0.015 * dt;
          p.alpha = Math.sin(p.life * Math.PI) * 0.4;
          p.size *= 1.008;
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
