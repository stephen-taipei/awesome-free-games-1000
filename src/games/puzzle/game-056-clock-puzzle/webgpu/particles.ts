/**
 * Particle System - Clock Puzzle
 * Elegant Clock Tower / Victorian Timekeeper Theme
 * Game #056
 */

export type ParticleType = 'tick' | 'chime' | 'gear' | 'dust' | 'correct' | 'victory';

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

// Victorian brass and gold palette
const COLORS = {
  tick: [
    { r: 1.00, g: 0.84, b: 0.30 },  // Gold
    { r: 0.95, g: 0.75, b: 0.25 },  // Warm gold
    { r: 1.00, g: 0.90, b: 0.50 },  // Light gold
  ],
  chime: [
    { r: 0.95, g: 0.92, b: 0.85 },  // Cream
    { r: 1.00, g: 0.95, b: 0.80 },  // Ivory
    { r: 0.85, g: 0.70, b: 0.30 },  // Brass
  ],
  gear: [
    { r: 0.72, g: 0.53, b: 0.25 },  // Brass
    { r: 0.60, g: 0.45, b: 0.20 },  // Dark brass
    { r: 0.80, g: 0.60, b: 0.30 },  // Light brass
  ],
  dust: [
    { r: 0.95, g: 0.90, b: 0.80 },  // Light dust
    { r: 0.85, g: 0.80, b: 0.70 },  // Medium dust
    { r: 0.75, g: 0.68, b: 0.55 },  // Dark dust
  ],
  correct: [
    { r: 0.18, g: 0.80, b: 0.44 },  // Green success
    { r: 0.30, g: 0.90, b: 0.55 },  // Bright green
    { r: 0.85, g: 0.70, b: 0.30 },  // Gold accent
  ],
  victory: [
    { r: 1.00, g: 0.84, b: 0.00 },  // Pure gold
    { r: 0.72, g: 0.53, b: 0.25 },  // Brass
    { r: 0.95, g: 0.92, b: 0.85 },  // Cream
    { r: 0.85, g: 0.70, b: 0.30 },  // Amber
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
      case 'tick':
        // Clock hand movement - radial burst
        const tickSpeed = Math.random() * 3 + 2;
        return {
          x: x + (Math.random() - 0.5) * 10,
          y: y + (Math.random() - 0.5) * 10,
          vx: Math.cos(angle) * tickSpeed,
          vy: Math.sin(angle) * tickSpeed,
          life: 1,
          maxLife: 1,
          size: Math.random() * 4 + 2,
          type,
          color,
          alpha: 1,
          rotation: angle,
          rotationSpeed: 0,
        };

      case 'chime':
        // Bell chime - expanding rings
        return {
          x,
          y,
          vx: Math.cos(angle) * 1,
          vy: Math.sin(angle) * 1,
          life: 1,
          maxLife: 1,
          size: Math.random() * 10 + 8,
          type,
          color,
          alpha: 0.8,
          rotation: 0,
          rotationSpeed: 0,
        };

      case 'gear':
        // Mechanical gear - spinning cogs
        const gearSpeed = Math.random() * 2 + 1;
        return {
          x: x + (Math.random() - 0.5) * 20,
          y: y + (Math.random() - 0.5) * 20,
          vx: Math.cos(angle) * gearSpeed,
          vy: Math.sin(angle) * gearSpeed,
          life: 1,
          maxLife: 1,
          size: Math.random() * 6 + 3,
          type,
          color,
          alpha: 0.8,
          rotation: angle,
          rotationSpeed: (Math.random() - 0.5) * 0.2,
        };

      case 'dust':
        // Floating dust motes
        return {
          x: x + (Math.random() - 0.5) * 50,
          y: y + (Math.random() - 0.5) * 50,
          vx: (Math.random() - 0.5) * 0.5,
          vy: -Math.random() * 0.3 - 0.1,
          life: 1,
          maxLife: 1,
          size: Math.random() * 3 + 1,
          type,
          color,
          alpha: 0.5,
          rotation: 0,
          rotationSpeed: 0,
        };

      case 'correct':
        // Correct clock - success glow
        const correctSpeed = Math.random() * 2 + 1;
        return {
          x: x + (Math.random() - 0.5) * 15,
          y: y + (Math.random() - 0.5) * 15,
          vx: Math.cos(angle) * correctSpeed,
          vy: Math.sin(angle) * correctSpeed,
          life: 1,
          maxLife: 1,
          size: Math.random() * 8 + 5,
          type,
          color,
          alpha: 0.9,
          rotation: 0,
          rotationSpeed: 0,
        };

      case 'victory':
        // Victory celebration - golden confetti
        const victorySpeed = Math.random() * 6 + 4;
        const victoryAngle = -Math.PI / 2 + (Math.random() - 0.5) * 1.2;
        return {
          x: x + (Math.random() - 0.5) * 120,
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
        case 'tick':
          p.vx *= 0.92;
          p.vy *= 0.92;
          p.life -= 0.04 * dt;
          p.alpha = p.life;
          break;

        case 'chime':
          p.size += 1 * dt;
          p.life -= 0.03 * dt;
          p.alpha = p.life * 0.8;
          break;

        case 'gear':
          p.vx *= 0.95;
          p.vy *= 0.95;
          p.life -= 0.025 * dt;
          p.alpha = p.life * 0.8;
          break;

        case 'dust':
          p.vx += (Math.random() - 0.5) * 0.02 * dt;
          p.life -= 0.01 * dt;
          p.alpha = Math.sin(p.life * Math.PI) * 0.5;
          break;

        case 'correct':
          p.vx *= 0.9;
          p.vy *= 0.9;
          p.life -= 0.03 * dt;
          p.alpha = p.life * 0.9;
          p.size *= 1.01;
          break;

        case 'victory':
          p.vy += 0.1 * dt;
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
