/**
 * Shadow Match - Particle System
 * Noir / Shadow Art / Silhouette Theme
 * Game #065
 */

export type ParticleType = 'spotlight' | 'dust' | 'shadow' | 'spark' | 'reveal' | 'victory';

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: { r: number; g: number; b: number };
  alpha: number;
  rotation: number;
  rotationSpeed: number;
  life: number;
  maxLife: number;
  type: ParticleType;
}

// Noir color palette
const NOIR_COLORS = {
  spotlight: [
    { r: 0.95, g: 0.85, b: 0.5 },
    { r: 1.0, g: 0.9, b: 0.6 },
    { r: 0.9, g: 0.8, b: 0.45 },
  ],
  dust: [
    { r: 0.8, g: 0.75, b: 0.6 },
    { r: 0.7, g: 0.65, b: 0.5 },
    { r: 0.85, g: 0.8, b: 0.65 },
  ],
  shadow: [
    { r: 0.15, g: 0.12, b: 0.18 },
    { r: 0.1, g: 0.08, b: 0.12 },
    { r: 0.2, g: 0.18, b: 0.22 },
  ],
  spark: [
    { r: 1.0, g: 0.9, b: 0.4 },
    { r: 1.0, g: 0.95, b: 0.6 },
    { r: 0.95, g: 0.85, b: 0.35 },
  ],
  reveal: [
    { r: 0.9, g: 0.85, b: 0.7 },
    { r: 1.0, g: 0.95, b: 0.8 },
    { r: 0.85, g: 0.8, b: 0.65 },
  ],
  victory: [
    { r: 0.3, g: 0.85, b: 0.5 },
    { r: 0.4, g: 0.9, b: 0.55 },
    { r: 0.25, g: 0.8, b: 0.45 },
    { r: 0.95, g: 0.85, b: 0.4 },
    { r: 0.35, g: 0.88, b: 0.52 },
  ],
};

export class ParticleSystem {
  private particles: Particle[] = [];
  private maxParticles = 400;

  emit(x: number, y: number, type: ParticleType, count: number = 1): void {
    for (let i = 0; i < count && this.particles.length < this.maxParticles; i++) {
      this.particles.push(this.createParticle(x, y, type));
    }
  }

  private createParticle(x: number, y: number, type: ParticleType): Particle {
    const colors = NOIR_COLORS[type];
    const color = colors[Math.floor(Math.random() * colors.length)];

    const baseConfig = {
      x,
      y,
      color,
      rotation: 0,
      rotationSpeed: 0,
      type,
    };

    switch (type) {
      case 'spotlight':
        return {
          ...baseConfig,
          vx: (Math.random() - 0.5) * 10,
          vy: Math.random() * -20 - 10,
          size: 20 + Math.random() * 30,
          alpha: 0.4 + Math.random() * 0.3,
          life: 1.0 + Math.random() * 0.5,
          maxLife: 1.5,
          rotationSpeed: 0,
        };

      case 'dust':
        return {
          ...baseConfig,
          vx: (Math.random() - 0.5) * 15,
          vy: -10 - Math.random() * 15,
          size: 3 + Math.random() * 5,
          alpha: 0.3 + Math.random() * 0.3,
          life: 2.0 + Math.random() * 2.0,
          maxLife: 4.0,
          rotationSpeed: (Math.random() - 0.5) * 2,
        };

      case 'shadow':
        const shadowAngle = Math.random() * Math.PI * 2;
        const shadowSpeed = 20 + Math.random() * 30;
        return {
          ...baseConfig,
          vx: Math.cos(shadowAngle) * shadowSpeed,
          vy: Math.sin(shadowAngle) * shadowSpeed,
          size: 15 + Math.random() * 25,
          alpha: 0.5 + Math.random() * 0.3,
          life: 1.0 + Math.random() * 0.5,
          maxLife: 1.5,
          rotationSpeed: (Math.random() - 0.5) * 3,
        };

      case 'spark':
        const sparkAngle = Math.random() * Math.PI * 2;
        const sparkSpeed = 60 + Math.random() * 80;
        return {
          ...baseConfig,
          vx: Math.cos(sparkAngle) * sparkSpeed,
          vy: Math.sin(sparkAngle) * sparkSpeed - 30,
          size: 4 + Math.random() * 6,
          alpha: 0.9,
          life: 0.4 + Math.random() * 0.3,
          maxLife: 0.7,
          rotationSpeed: (Math.random() - 0.5) * 10,
        };

      case 'reveal':
        return {
          ...baseConfig,
          vx: (Math.random() - 0.5) * 30,
          vy: (Math.random() - 0.5) * 30,
          size: 25 + Math.random() * 35,
          alpha: 0.6,
          life: 0.6 + Math.random() * 0.4,
          maxLife: 1.0,
          rotationSpeed: 0,
        };

      case 'victory':
        const victoryAngle = Math.random() * Math.PI * 2;
        const victorySpeed = 70 + Math.random() * 100;
        return {
          ...baseConfig,
          vx: Math.cos(victoryAngle) * victorySpeed,
          vy: Math.sin(victoryAngle) * victorySpeed - 40,
          size: 10 + Math.random() * 18,
          alpha: 0.9,
          life: 1.5 + Math.random() * 1.0,
          maxLife: 2.5,
          rotationSpeed: (Math.random() - 0.5) * 4,
        };

      default:
        return {
          ...baseConfig,
          vx: (Math.random() - 0.5) * 50,
          vy: (Math.random() - 0.5) * 50,
          size: 8,
          alpha: 0.7,
          life: 1,
          maxLife: 1,
          rotationSpeed: 0,
        };
    }
  }

  update(deltaTime: number): void {
    const gravity = 30;
    const drag = 0.98;

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];

      // Update life
      p.life -= deltaTime;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      // Type-specific physics
      switch (p.type) {
        case 'spotlight':
          // Spotlight particles rise and fade
          p.vy -= 30 * deltaTime;
          p.vx *= 0.95;
          p.size += 20 * deltaTime;
          break;

        case 'dust':
          // Dust motes float with slight turbulence
          p.vx += (Math.random() - 0.5) * 50 * deltaTime;
          p.vy -= 5 * deltaTime;
          p.vx *= drag;
          p.vy *= drag;
          break;

        case 'shadow':
          // Shadow wisps dissipate
          p.vx *= 0.96;
          p.vy *= 0.96;
          p.size += 15 * deltaTime;
          break;

        case 'spark':
          // Sparks fall with gravity
          p.vy += gravity * 2 * deltaTime;
          p.vx *= 0.97;
          break;

        case 'reveal':
          // Reveal expands outward
          p.size += 50 * deltaTime;
          p.vx *= 0.92;
          p.vy *= 0.92;
          break;

        case 'victory':
          // Victory particles with gentle float
          p.vy += gravity * 0.3 * deltaTime;
          p.vx *= 0.99;
          p.vy *= 0.99;
          break;
      }

      // Update position
      p.x += p.vx * deltaTime;
      p.y += p.vy * deltaTime;
      p.rotation += p.rotationSpeed * deltaTime;

      // Update alpha based on life
      const lifeRatio = p.life / p.maxLife;
      if (p.type === 'spotlight' || p.type === 'reveal') {
        p.alpha = lifeRatio * 0.5;
      } else if (p.type === 'shadow') {
        p.alpha = lifeRatio * 0.4;
      } else if (p.type === 'victory') {
        p.alpha = Math.min(1, lifeRatio * 1.5) * 0.9;
      } else {
        p.alpha = Math.min(1, lifeRatio * 2) * 0.7;
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
