/**
 * Water Flow - Particle System
 * Aquatic / Underwater Plumbing Theme
 * Game #064
 */

export type ParticleType = 'bubble' | 'droplet' | 'ripple' | 'flow' | 'splash' | 'victory';

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

// Aquatic color palette
const AQUATIC_COLORS = {
  bubble: [
    { r: 0.6, g: 0.85, b: 0.95 },
    { r: 0.7, g: 0.9, b: 1.0 },
    { r: 0.5, g: 0.8, b: 0.9 },
  ],
  droplet: [
    { r: 0.2, g: 0.6, b: 0.9 },
    { r: 0.3, g: 0.7, b: 1.0 },
    { r: 0.15, g: 0.5, b: 0.85 },
  ],
  ripple: [
    { r: 0.4, g: 0.7, b: 0.9 },
    { r: 0.5, g: 0.8, b: 1.0 },
  ],
  flow: [
    { r: 0.2, g: 0.55, b: 0.85 },
    { r: 0.25, g: 0.6, b: 0.9 },
    { r: 0.3, g: 0.65, b: 0.95 },
  ],
  splash: [
    { r: 0.5, g: 0.8, b: 1.0 },
    { r: 0.6, g: 0.85, b: 1.0 },
    { r: 0.4, g: 0.75, b: 0.95 },
  ],
  victory: [
    { r: 0.3, g: 0.8, b: 0.5 },
    { r: 0.4, g: 0.9, b: 0.6 },
    { r: 0.2, g: 0.7, b: 0.4 },
    { r: 0.5, g: 0.85, b: 0.95 },
    { r: 0.35, g: 0.75, b: 0.55 },
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
    const colors = AQUATIC_COLORS[type];
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
      case 'bubble':
        return {
          ...baseConfig,
          vx: (Math.random() - 0.5) * 20,
          vy: -30 - Math.random() * 40,
          size: 6 + Math.random() * 10,
          alpha: 0.5 + Math.random() * 0.3,
          life: 1.5 + Math.random() * 1.5,
          maxLife: 3,
          rotationSpeed: 0,
        };

      case 'droplet':
        const dropAngle = Math.random() * Math.PI * 2;
        const dropSpeed = 40 + Math.random() * 60;
        return {
          ...baseConfig,
          vx: Math.cos(dropAngle) * dropSpeed,
          vy: Math.sin(dropAngle) * dropSpeed - 30,
          size: 4 + Math.random() * 6,
          alpha: 0.7 + Math.random() * 0.3,
          life: 0.8 + Math.random() * 0.5,
          maxLife: 1.3,
          rotation: dropAngle,
          rotationSpeed: 0,
        };

      case 'ripple':
        return {
          ...baseConfig,
          vx: 0,
          vy: 0,
          size: 5,
          alpha: 0.6,
          life: 0.8,
          maxLife: 0.8,
          rotationSpeed: 0,
        };

      case 'flow':
        const flowDir = Math.random() * Math.PI * 2;
        return {
          ...baseConfig,
          vx: Math.cos(flowDir) * (30 + Math.random() * 40),
          vy: Math.sin(flowDir) * (30 + Math.random() * 40),
          size: 3 + Math.random() * 5,
          alpha: 0.6 + Math.random() * 0.3,
          life: 0.6 + Math.random() * 0.4,
          maxLife: 1.0,
          rotation: flowDir,
          rotationSpeed: 0,
        };

      case 'splash':
        const splashAngle = Math.random() * Math.PI * 2;
        const splashSpeed = 60 + Math.random() * 80;
        return {
          ...baseConfig,
          vx: Math.cos(splashAngle) * splashSpeed,
          vy: Math.sin(splashAngle) * splashSpeed,
          size: 5 + Math.random() * 8,
          alpha: 0.8 + Math.random() * 0.2,
          life: 0.5 + Math.random() * 0.3,
          maxLife: 0.8,
          rotationSpeed: (Math.random() - 0.5) * 5,
        };

      case 'victory':
        const victoryAngle = Math.random() * Math.PI * 2;
        const victorySpeed = 80 + Math.random() * 120;
        return {
          ...baseConfig,
          vx: Math.cos(victoryAngle) * victorySpeed,
          vy: Math.sin(victoryAngle) * victorySpeed - 50,
          size: 8 + Math.random() * 15,
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
          size: 5,
          alpha: 0.7,
          life: 1,
          maxLife: 1,
          rotationSpeed: 0,
        };
    }
  }

  update(deltaTime: number): void {
    const gravity = 60;
    const buoyancy = -80; // Upward force for bubbles
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
        case 'bubble':
          // Bubbles rise with wobble
          p.vy += buoyancy * deltaTime;
          p.vx += Math.sin(Date.now() * 0.01 + i) * 20 * deltaTime;
          p.vx *= 0.95;
          break;

        case 'droplet':
          // Droplets fall with gravity
          p.vy += gravity * deltaTime;
          break;

        case 'ripple':
          // Ripples expand outward
          p.size += 60 * deltaTime;
          break;

        case 'flow':
          // Flow particles slow down
          p.vx *= drag;
          p.vy *= drag;
          break;

        case 'splash':
          // Splash particles with gravity
          p.vy += gravity * 0.5 * deltaTime;
          p.vx *= 0.98;
          p.vy *= 0.98;
          break;

        case 'victory':
          // Victory particles with slight float
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
      if (p.type === 'ripple') {
        p.alpha = lifeRatio * 0.6;
      } else if (p.type === 'victory') {
        p.alpha = Math.min(1, lifeRatio * 1.5) * 0.9;
      } else {
        p.alpha = Math.min(1, lifeRatio * 2) * 0.8;
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
