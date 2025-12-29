/**
 * Particle System - Candy Factory
 * Sweet Factory / Industrial Production Line Theme
 * Game #075
 */

import { randomRange, getCandyColor } from './math';

export type ParticleType = 'candy' | 'spark' | 'steam' | 'gear' | 'sweet' | 'conveyor';

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

// Candy colors
const CANDY_COLORS = [
  { r: 0.91, g: 0.30, b: 0.24 },  // Red
  { r: 0.20, g: 0.60, b: 0.86 },  // Blue
  { r: 0.18, g: 0.80, b: 0.44 },  // Green
  { r: 0.95, g: 0.77, b: 0.06 },  // Yellow
];

// Industrial colors
const INDUSTRIAL_COLORS = [
  { r: 0.50, g: 0.50, b: 0.55 },  // Steel
  { r: 0.40, g: 0.35, b: 0.30 },  // Bronze
  { r: 0.60, g: 0.55, b: 0.50 },  // Light metal
];

export class ParticleSystem {
  private particles: Particle[] = [];
  private maxParticles: number = 400;

  emit(
    x: number,
    y: number,
    type: ParticleType,
    count: number = 5,
    colorIndex: number = 0
  ): void {
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) {
        this.particles.shift();
      }

      const particle = this.createParticle(x, y, type, colorIndex);
      this.particles.push(particle);
    }
  }

  private createParticle(
    x: number,
    y: number,
    type: ParticleType,
    colorIndex: number
  ): Particle {
    let vx = 0;
    let vy = 0;
    let size = 10;
    let life = 1.5;
    let rotationSpeed = 0;
    let color: { r: number; g: number; b: number };

    switch (type) {
      case 'candy':
        const candyAngle = Math.random() * Math.PI * 2;
        const candySpeed = randomRange(30, 60);
        vx = Math.cos(candyAngle) * candySpeed;
        vy = Math.sin(candyAngle) * candySpeed;
        size = randomRange(15, 25);
        life = randomRange(1.0, 1.5);
        rotationSpeed = randomRange(-3, 3);
        color = CANDY_COLORS[colorIndex % CANDY_COLORS.length];
        break;

      case 'spark':
        const sparkAngle = Math.random() * Math.PI * 2;
        const sparkSpeed = randomRange(80, 150);
        vx = Math.cos(sparkAngle) * sparkSpeed;
        vy = Math.sin(sparkAngle) * sparkSpeed;
        size = randomRange(4, 10);
        life = randomRange(0.3, 0.6);
        color = { r: 1.0, g: 0.85, b: 0.4 };
        break;

      case 'steam':
        vx = randomRange(-15, 15);
        vy = randomRange(-40, -20);
        size = randomRange(20, 40);
        life = randomRange(1.5, 2.5);
        color = { r: 0.9, g: 0.9, b: 0.95 };
        break;

      case 'gear':
        const gearAngle = Math.random() * Math.PI * 2;
        vx = Math.cos(gearAngle) * randomRange(10, 30);
        vy = Math.sin(gearAngle) * randomRange(10, 30);
        size = randomRange(12, 20);
        life = randomRange(1.0, 1.8);
        rotationSpeed = randomRange(2, 5) * (Math.random() > 0.5 ? 1 : -1);
        color = INDUSTRIAL_COLORS[Math.floor(Math.random() * INDUSTRIAL_COLORS.length)];
        break;

      case 'sweet':
        const sweetAngle = Math.random() * Math.PI * 2;
        vx = Math.cos(sweetAngle) * randomRange(20, 50);
        vy = Math.sin(sweetAngle) * randomRange(20, 50);
        size = randomRange(6, 12);
        life = randomRange(0.8, 1.2);
        rotationSpeed = randomRange(1, 3);
        color = CANDY_COLORS[Math.floor(Math.random() * CANDY_COLORS.length)];
        break;

      case 'conveyor':
        vx = randomRange(-5, 5);
        vy = randomRange(-10, 10);
        size = randomRange(15, 25);
        life = randomRange(0.8, 1.2);
        color = { r: 0.35, g: 0.35, b: 0.4 };
        break;

      default:
        color = { r: 0.5, g: 0.5, b: 0.5 };
    }

    return {
      x,
      y,
      vx,
      vy,
      size,
      color,
      alpha: 1.0,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed,
      life,
      maxLife: life,
      type,
    };
  }

  update(deltaTime: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];

      // Update position
      p.x += p.vx * deltaTime;
      p.y += p.vy * deltaTime;

      // Update rotation
      p.rotation += p.rotationSpeed * deltaTime;

      // Type-specific behavior
      switch (p.type) {
        case 'candy':
          p.vx *= 0.96;
          p.vy *= 0.96;
          p.vy += 30 * deltaTime; // Gravity
          break;

        case 'spark':
          p.vx *= 0.92;
          p.vy *= 0.92;
          p.vy += 100 * deltaTime; // Gravity
          p.size *= 0.95;
          break;

        case 'steam':
          p.vx += Math.sin(p.life * 5) * 10 * deltaTime;
          p.vy -= 5 * deltaTime; // Rise
          p.size += 10 * deltaTime; // Expand
          break;

        case 'gear':
          p.vx *= 0.98;
          p.vy *= 0.98;
          p.vy += 20 * deltaTime; // Gravity
          break;

        case 'sweet':
          p.vx *= 0.95;
          p.vy *= 0.95;
          p.vy += 40 * deltaTime; // Gravity
          break;

        case 'conveyor':
          p.vx *= 0.97;
          p.vy *= 0.97;
          break;
      }

      // Update life
      p.life -= deltaTime;
      p.alpha = Math.min(1, p.life / (p.maxLife * 0.3));

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
