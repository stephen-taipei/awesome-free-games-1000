/**
 * Particle System - Block Fit
 * Architect's Blueprint / Construction Site Theme
 * Game #054
 */

export type ParticleType = 'dust' | 'place' | 'rotate' | 'blueprint' | 'grid' | 'victory';

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

// Blueprint blue color palette
const COLORS = {
  dust: [
    { r: 0.76, g: 0.65, b: 0.47 },  // Construction dust tan
    { r: 0.82, g: 0.72, b: 0.55 },  // Light dust
    { r: 0.68, g: 0.58, b: 0.42 },  // Darker dust
  ],
  place: [
    { r: 0.20, g: 0.52, b: 0.80 },  // Blueprint blue
    { r: 0.30, g: 0.62, b: 0.90 },  // Lighter blue
    { r: 0.15, g: 0.42, b: 0.70 },  // Darker blue
  ],
  rotate: [
    { r: 0.95, g: 0.65, b: 0.15 },  // Construction orange
    { r: 1.00, g: 0.75, b: 0.25 },  // Bright orange
    { r: 0.85, g: 0.55, b: 0.10 },  // Deep orange
  ],
  blueprint: [
    { r: 0.25, g: 0.45, b: 0.65 },  // Blueprint line blue
    { r: 0.35, g: 0.55, b: 0.75 },  // Light blueprint
    { r: 0.20, g: 0.40, b: 0.60 },  // Dark blueprint
  ],
  grid: [
    { r: 0.18, g: 0.20, b: 0.25 },  // Grid gray
    { r: 0.28, g: 0.30, b: 0.35 },  // Light grid
    { r: 0.12, g: 0.14, b: 0.18 },  // Dark grid
  ],
  victory: [
    { r: 0.95, g: 0.85, b: 0.25 },  // Gold
    { r: 0.25, g: 0.55, b: 0.85 },  // Blueprint blue
    { r: 0.95, g: 0.65, b: 0.15 },  // Construction orange
    { r: 0.40, g: 0.75, b: 0.35 },  // Safety green
  ],
};

export class ParticleSystem {
  private particles: Particle[] = [];
  private maxParticles = 400;

  emit(x: number, y: number, type: ParticleType, count: number = 10): void {
    const colors = COLORS[type];

    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) {
        // Remove oldest particle
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
        // Construction dust - floats slowly upward
        return {
          x: x + (Math.random() - 0.5) * 60,
          y: y + (Math.random() - 0.5) * 30,
          vx: (Math.random() - 0.5) * 1,
          vy: -Math.random() * 0.8 - 0.2,
          life: 1,
          maxLife: 1,
          size: Math.random() * 4 + 2,
          type,
          color,
          alpha: 0.6,
          rotation: Math.random() * Math.PI * 2,
          rotationSpeed: (Math.random() - 0.5) * 0.02,
        };

      case 'place':
        // Block placement - burst outward, then settle
        const placeSpeed = Math.random() * 3 + 2;
        return {
          x: x + (Math.random() - 0.5) * 20,
          y: y + (Math.random() - 0.5) * 20,
          vx: Math.cos(angle) * placeSpeed,
          vy: Math.sin(angle) * placeSpeed,
          life: 1,
          maxLife: 1,
          size: Math.random() * 6 + 3,
          type,
          color,
          alpha: 0.9,
          rotation: 0,
          rotationSpeed: 0,
        };

      case 'rotate':
        // Rotation effect - circular arc particles
        const rotateAngle = (i: number) => angle + (Math.random() - 0.5) * 0.5;
        const rotateSpeed = Math.random() * 2 + 1;
        return {
          x,
          y,
          vx: Math.cos(rotateAngle(0)) * rotateSpeed,
          vy: Math.sin(rotateAngle(0)) * rotateSpeed,
          life: 1,
          maxLife: 1,
          size: Math.random() * 5 + 2,
          type,
          color,
          alpha: 0.85,
          rotation: angle,
          rotationSpeed: Math.random() * 0.3 + 0.1,
        };

      case 'blueprint':
        // Blueprint lines - structured grid-like particles
        const gridAngle = Math.floor(Math.random() * 4) * (Math.PI / 2);
        return {
          x: x + (Math.random() - 0.5) * 40,
          y: y + (Math.random() - 0.5) * 40,
          vx: Math.cos(gridAngle) * 1.5,
          vy: Math.sin(gridAngle) * 1.5,
          life: 1,
          maxLife: 1,
          size: Math.random() * 3 + 1,
          type,
          color,
          alpha: 0.7,
          rotation: gridAngle,
          rotationSpeed: 0,
        };

      case 'grid':
        // Grid snap effect - aligned to grid
        return {
          x: x + (Math.random() - 0.5) * 30,
          y: y + (Math.random() - 0.5) * 30,
          vx: 0,
          vy: 0,
          life: 1,
          maxLife: 1,
          size: Math.random() * 4 + 2,
          type,
          color,
          alpha: 0.5,
          rotation: 0,
          rotationSpeed: 0,
        };

      case 'victory':
        // Victory celebration - confetti-like with gravity
        const victorySpeed = Math.random() * 6 + 4;
        const victoryAngle = -Math.PI / 2 + (Math.random() - 0.5) * 1.2;
        return {
          x: x + (Math.random() - 0.5) * 100,
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
    const dt = deltaTime * 60; // Normalize to 60fps

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];

      // Update position
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rotation += p.rotationSpeed * dt;

      // Type-specific behavior
      switch (p.type) {
        case 'dust':
          // Float upward with slight drift
          p.vx += (Math.random() - 0.5) * 0.05 * dt;
          p.vy *= 0.99;
          p.life -= 0.015 * dt;
          p.alpha = p.life * 0.6;
          break;

        case 'place':
          // Decelerate and fade
          p.vx *= 0.92;
          p.vy *= 0.92;
          p.life -= 0.03 * dt;
          p.alpha = p.life * 0.9;
          break;

        case 'rotate':
          // Arc motion with fade
          p.vx *= 0.95;
          p.vy *= 0.95;
          p.life -= 0.035 * dt;
          p.alpha = p.life * 0.85;
          p.size *= 0.98;
          break;

        case 'blueprint':
          // Fade in grid pattern
          p.life -= 0.025 * dt;
          p.alpha = Math.sin(p.life * Math.PI) * 0.7;
          break;

        case 'grid':
          // Pulse and fade
          p.life -= 0.04 * dt;
          p.alpha = Math.sin(p.life * Math.PI) * 0.5;
          p.size = (Math.sin(p.life * Math.PI * 2) * 0.5 + 0.5) * 4 + 2;
          break;

        case 'victory':
          // Gravity and confetti behavior
          p.vy += 0.12 * dt;
          p.vx *= 0.99;
          p.life -= 0.012 * dt;
          p.alpha = Math.min(1, p.life * 1.5);
          break;
      }

      // Remove dead particles
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
