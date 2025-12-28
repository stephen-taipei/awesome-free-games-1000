/**
 * Particle System - Magic Circle
 * Arcane Mystical / Ancient Magic Theme
 * Game #062
 */

export type ParticleType = 'rune' | 'spark' | 'glow' | 'arcane' | 'portal' | 'victory';

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

// Magical color palette
const COLORS = {
  rune: [
    { r: 0.95, g: 0.77, b: 0.06 },  // Gold
    { r: 1.00, g: 0.85, b: 0.30 },  // Bright gold
    { r: 0.85, g: 0.65, b: 0.12 },  // Dark gold
  ],
  spark: [
    { r: 0.90, g: 0.80, b: 1.00 },  // Lavender spark
    { r: 1.00, g: 0.95, b: 1.00 },  // White spark
    { r: 0.75, g: 0.60, b: 1.00 },  // Purple spark
  ],
  glow: [
    { r: 0.61, g: 0.35, b: 0.71 },  // Purple
    { r: 0.56, g: 0.27, b: 0.68 },  // Dark purple
    { r: 0.70, g: 0.45, b: 0.80 },  // Light purple
  ],
  arcane: [
    { r: 0.20, g: 0.60, b: 0.86 },  // Arcane blue
    { r: 0.10, g: 0.50, b: 0.80 },  // Deep blue
    { r: 0.40, g: 0.75, b: 0.95 },  // Light blue
  ],
  portal: [
    { r: 0.55, g: 0.25, b: 0.75 },  // Portal purple
    { r: 0.30, g: 0.50, b: 0.90 },  // Portal blue
    { r: 0.70, g: 0.30, b: 0.85 },  // Vibrant purple
  ],
  victory: [
    { r: 0.95, g: 0.77, b: 0.06 },  // Gold
    { r: 0.61, g: 0.35, b: 0.71 },  // Purple
    { r: 0.20, g: 0.60, b: 0.86 },  // Blue
    { r: 1.00, g: 1.00, b: 1.00 },  // White
    { r: 0.10, g: 0.80, b: 0.60 },  // Teal
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
      case 'rune':
        // Mystical rune symbol floating
        return {
          x: x + (Math.random() - 0.5) * 30,
          y: y + (Math.random() - 0.5) * 30,
          vx: (Math.random() - 0.5) * 0.5,
          vy: -Math.random() * 1 - 0.5,
          life: 1,
          maxLife: 1,
          size: Math.random() * 20 + 15,
          type,
          color,
          alpha: 0.9,
          rotation: Math.random() * Math.PI * 2,
          rotationSpeed: (Math.random() - 0.5) * 0.08,
        };

      case 'spark':
        // Magical energy spark
        const sparkSpeed = Math.random() * 4 + 2;
        return {
          x: x + (Math.random() - 0.5) * 15,
          y: y + (Math.random() - 0.5) * 15,
          vx: Math.cos(angle) * sparkSpeed,
          vy: Math.sin(angle) * sparkSpeed,
          life: 1,
          maxLife: 1,
          size: Math.random() * 6 + 3,
          type,
          color,
          alpha: 1,
          rotation: angle,
          rotationSpeed: 0,
        };

      case 'glow':
        // Soft ethereal glow
        return {
          x,
          y,
          vx: (Math.random() - 0.5) * 0.3,
          vy: (Math.random() - 0.5) * 0.3,
          life: 1,
          maxLife: 1,
          size: Math.random() * 25 + 20,
          type,
          color,
          alpha: 0.6,
          rotation: 0,
          rotationSpeed: 0,
        };

      case 'arcane':
        // Mystical energy pattern
        const arcaneAngle = (Math.PI * 2 / 8) * Math.floor(Math.random() * 8);
        const arcaneSpeed = Math.random() * 2 + 1;
        return {
          x: x + Math.cos(arcaneAngle) * 10,
          y: y + Math.sin(arcaneAngle) * 10,
          vx: Math.cos(arcaneAngle) * arcaneSpeed,
          vy: Math.sin(arcaneAngle) * arcaneSpeed,
          life: 1,
          maxLife: 1,
          size: Math.random() * 12 + 8,
          type,
          color,
          alpha: 0.85,
          rotation: arcaneAngle,
          rotationSpeed: (Math.random() - 0.5) * 0.1,
        };

      case 'portal':
        // Rippling portal effect
        return {
          x,
          y,
          vx: 0,
          vy: 0,
          life: 1,
          maxLife: 1,
          size: 10,
          type,
          color,
          alpha: 0.7,
          rotation: 0,
          rotationSpeed: 0.05,
        };

      case 'victory':
        // Celebration sparkles
        const victorySpeed = Math.random() * 6 + 3;
        const victoryAngle = -Math.PI / 2 + (Math.random() - 0.5) * 1.2;
        return {
          x: x + (Math.random() - 0.5) * 100,
          y: y + Math.random() * 30,
          vx: Math.cos(victoryAngle) * victorySpeed * 0.4,
          vy: Math.sin(victoryAngle) * victorySpeed,
          life: 1,
          maxLife: 1,
          size: Math.random() * 12 + 6,
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
        case 'rune':
          p.vx *= 0.98;
          p.vy *= 0.98;
          p.life -= 0.012 * dt;
          p.alpha = Math.sin(p.life * Math.PI) * 0.9;
          p.size += 0.1 * dt;
          break;

        case 'spark':
          p.vx *= 0.94;
          p.vy *= 0.94;
          p.life -= 0.035 * dt;
          p.alpha = p.life;
          p.size *= 0.96;
          break;

        case 'glow':
          p.size += 0.5 * dt;
          p.life -= 0.018 * dt;
          p.alpha = Math.sin(p.life * Math.PI) * 0.6;
          break;

        case 'arcane':
          p.vx *= 0.96;
          p.vy *= 0.96;
          p.life -= 0.025 * dt;
          p.alpha = p.life * 0.85;
          p.size += 0.15 * dt;
          break;

        case 'portal':
          p.life -= 0.02 * dt;
          p.size += 4 * dt;
          p.alpha = p.life * 0.7;
          break;

        case 'victory':
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
