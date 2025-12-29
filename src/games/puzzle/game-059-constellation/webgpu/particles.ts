/**
 * Particle System - Constellation
 * Celestial Night Sky / Observatory Astronomy Theme
 * Game #059
 */

export type ParticleType = 'star' | 'spark' | 'glow' | 'nebula' | 'shooting' | 'victory';

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

// Celestial color palette
const COLORS = {
  star: [
    { r: 1.00, g: 1.00, b: 0.95 },  // White star
    { r: 1.00, g: 0.95, b: 0.80 },  // Yellow star
    { r: 0.85, g: 0.90, b: 1.00 },  // Blue-white star
  ],
  spark: [
    { r: 1.00, g: 0.85, b: 0.40 },  // Golden spark
    { r: 0.95, g: 0.95, b: 1.00 },  // White spark
    { r: 0.80, g: 0.90, b: 1.00 },  // Blue spark
  ],
  glow: [
    { r: 0.40, g: 0.50, b: 0.90 },  // Blue glow
    { r: 0.60, g: 0.40, b: 0.80 },  // Purple glow
    { r: 0.30, g: 0.60, b: 0.80 },  // Cyan glow
  ],
  nebula: [
    { r: 0.50, g: 0.20, b: 0.60 },  // Purple nebula
    { r: 0.20, g: 0.40, b: 0.60 },  // Blue nebula
    { r: 0.60, g: 0.30, b: 0.40 },  // Red nebula
  ],
  shooting: [
    { r: 1.00, g: 1.00, b: 0.90 },  // White trail
    { r: 1.00, g: 0.90, b: 0.70 },  // Golden trail
    { r: 0.90, g: 0.95, b: 1.00 },  // Blue-white trail
  ],
  victory: [
    { r: 0.95, g: 0.77, b: 0.06 },  // Gold
    { r: 1.00, g: 1.00, b: 1.00 },  // White
    { r: 0.20, g: 0.60, b: 0.86 },  // Blue
    { r: 0.60, g: 0.35, b: 0.70 },  // Purple
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
      case 'star':
        // Twinkling star burst
        const starSpeed = Math.random() * 1 + 0.5;
        return {
          x: x + (Math.random() - 0.5) * 10,
          y: y + (Math.random() - 0.5) * 10,
          vx: Math.cos(angle) * starSpeed,
          vy: Math.sin(angle) * starSpeed,
          life: 1,
          maxLife: 1,
          size: Math.random() * 6 + 4,
          type,
          color,
          alpha: 1,
          rotation: angle,
          rotationSpeed: 0,
        };

      case 'spark':
        // Connection spark
        const sparkSpeed = Math.random() * 3 + 2;
        return {
          x: x + (Math.random() - 0.5) * 15,
          y: y + (Math.random() - 0.5) * 15,
          vx: Math.cos(angle) * sparkSpeed,
          vy: Math.sin(angle) * sparkSpeed,
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

      case 'nebula':
        // Nebula cloud
        return {
          x: x + (Math.random() - 0.5) * 50,
          y: y + (Math.random() - 0.5) * 50,
          vx: (Math.random() - 0.5) * 0.2,
          vy: (Math.random() - 0.5) * 0.2 - 0.1,
          life: 1,
          maxLife: 1,
          size: Math.random() * 30 + 20,
          type,
          color,
          alpha: 0.3,
          rotation: Math.random() * Math.PI * 2,
          rotationSpeed: (Math.random() - 0.5) * 0.02,
        };

      case 'shooting':
        // Shooting star trail
        const shootAngle = Math.PI * 0.75 + (Math.random() - 0.5) * 0.3;
        const shootSpeed = Math.random() * 5 + 8;
        return {
          x: x + (Math.random() - 0.5) * 5,
          y: y + (Math.random() - 0.5) * 5,
          vx: Math.cos(shootAngle) * shootSpeed,
          vy: Math.sin(shootAngle) * shootSpeed,
          life: 1,
          maxLife: 1,
          size: Math.random() * 6 + 3,
          type,
          color,
          alpha: 1,
          rotation: shootAngle,
          rotationSpeed: 0,
        };

      case 'victory':
        // Victory celebration
        const victorySpeed = Math.random() * 5 + 3;
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
        case 'star':
          p.vx *= 0.97;
          p.vy *= 0.97;
          p.life -= 0.025 * dt;
          p.alpha = p.life;
          break;

        case 'spark':
          p.vx *= 0.94;
          p.vy *= 0.94;
          p.life -= 0.04 * dt;
          p.alpha = p.life;
          p.size *= 0.98;
          break;

        case 'glow':
          p.size += 0.2 * dt;
          p.life -= 0.02 * dt;
          p.alpha = Math.sin(p.life * Math.PI) * 0.5;
          break;

        case 'nebula':
          p.life -= 0.01 * dt;
          p.alpha = Math.sin(p.life * Math.PI) * 0.3;
          p.size *= 1.003;
          break;

        case 'shooting':
          p.life -= 0.06 * dt;
          p.alpha = p.life;
          p.size *= 0.95;
          break;

        case 'victory':
          p.vy += 0.08 * dt;
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
