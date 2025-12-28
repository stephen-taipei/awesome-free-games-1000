/**
 * Particle System - Yin Yang Balance
 * Cosmic Duality / Balance Energy Theme
 * Game #074
 */

import { randomRange, getYinColor, getYangColor, lerp } from './math';

export type ParticleType = 'energy' | 'flow' | 'balance' | 'spark' | 'harmony' | 'wave';

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

// Color palettes for yin (dark) and yang (light)
const YIN_COLORS = [
  { r: 0.1, g: 0.1, b: 0.18 },     // Deep dark
  { r: 0.2, g: 0.15, b: 0.3 },     // Dark purple
  { r: 0.15, g: 0.15, b: 0.25 },   // Midnight
];

const YANG_COLORS = [
  { r: 0.95, g: 0.95, b: 0.9 },    // Pure white
  { r: 1.0, g: 0.95, b: 0.8 },     // Warm white
  { r: 0.9, g: 0.85, b: 0.7 },     // Cream
];

const BALANCE_COLORS = [
  { r: 0.95, g: 0.77, b: 0.25 },   // Gold
  { r: 0.56, g: 0.35, b: 0.68 },   // Purple
  { r: 0.4, g: 0.7, b: 0.5 },      // Sage green
];

export class ParticleSystem {
  private particles: Particle[] = [];
  private maxParticles: number = 400;

  emit(
    x: number,
    y: number,
    type: ParticleType,
    count: number = 5,
    isYin: boolean = true
  ): void {
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) {
        this.particles.shift();
      }

      const particle = this.createParticle(x, y, type, isYin);
      this.particles.push(particle);
    }
  }

  private createParticle(
    x: number,
    y: number,
    type: ParticleType,
    isYin: boolean
  ): Particle {
    let vx = 0;
    let vy = 0;
    let size = 10;
    let life = 1.5;
    let rotationSpeed = 0;
    let color: { r: number; g: number; b: number };

    switch (type) {
      case 'energy':
        const energyAngle = Math.random() * Math.PI * 2;
        const energySpeed = randomRange(20, 60);
        vx = Math.cos(energyAngle) * energySpeed;
        vy = Math.sin(energyAngle) * energySpeed;
        size = randomRange(15, 30);
        life = randomRange(1.0, 2.0);
        rotationSpeed = randomRange(-2, 2);
        color = isYin
          ? YIN_COLORS[Math.floor(Math.random() * YIN_COLORS.length)]
          : YANG_COLORS[Math.floor(Math.random() * YANG_COLORS.length)];
        break;

      case 'flow':
        const flowAngle = randomRange(-0.3, 0.3) + (isYin ? Math.PI : 0);
        vx = Math.cos(flowAngle) * randomRange(30, 60);
        vy = Math.sin(flowAngle) * randomRange(10, 30) - 20;
        size = randomRange(8, 18);
        life = randomRange(1.5, 2.5);
        color = isYin
          ? YIN_COLORS[Math.floor(Math.random() * YIN_COLORS.length)]
          : YANG_COLORS[Math.floor(Math.random() * YANG_COLORS.length)];
        break;

      case 'balance':
        const balanceAngle = Math.random() * Math.PI * 2;
        vx = Math.cos(balanceAngle) * randomRange(10, 30);
        vy = Math.sin(balanceAngle) * randomRange(10, 30);
        size = randomRange(12, 24);
        life = randomRange(1.5, 2.5);
        rotationSpeed = randomRange(1, 3);
        color = BALANCE_COLORS[Math.floor(Math.random() * BALANCE_COLORS.length)];
        break;

      case 'spark':
        const sparkAngle = Math.random() * Math.PI * 2;
        const sparkSpeed = randomRange(50, 100);
        vx = Math.cos(sparkAngle) * sparkSpeed;
        vy = Math.sin(sparkAngle) * sparkSpeed;
        size = randomRange(4, 10);
        life = randomRange(0.5, 1.0);
        color = { r: 1.0, g: 0.95, b: 0.7 };
        break;

      case 'harmony':
        vx = randomRange(-10, 10);
        vy = randomRange(-30, -10);
        size = randomRange(30, 50);
        life = randomRange(1.5, 2.5);
        rotationSpeed = randomRange(0.5, 1.5);
        color = { r: 0.95, g: 0.77, b: 0.25 }; // Golden
        break;

      case 'wave':
        const waveAngle = Math.random() * Math.PI * 2;
        vx = Math.cos(waveAngle) * randomRange(5, 15);
        vy = Math.sin(waveAngle) * randomRange(5, 15);
        size = randomRange(25, 45);
        life = randomRange(1.0, 1.8);
        color = isYin
          ? { r: 0.3, g: 0.25, b: 0.5 }
          : { r: 0.8, g: 0.75, b: 0.6 };
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
        case 'energy':
          p.vx *= 0.98;
          p.vy *= 0.98;
          p.size *= 0.995;
          break;

        case 'flow':
          p.vy -= 15 * deltaTime; // Float upward
          p.vx += Math.sin(p.life * 5) * 20 * deltaTime;
          break;

        case 'balance':
          // Gentle orbit-like motion
          const t = (p.maxLife - p.life) * 3;
          p.vx = Math.cos(t) * 20;
          p.vy = Math.sin(t) * 20 - 10;
          break;

        case 'spark':
          p.vx *= 0.95;
          p.vy *= 0.95;
          p.vy += 50 * deltaTime; // Gravity
          break;

        case 'harmony':
          p.size += 20 * deltaTime; // Expand
          p.vy -= 5 * deltaTime;
          break;

        case 'wave':
          p.size += 30 * deltaTime; // Expand
          p.vx *= 0.98;
          p.vy *= 0.98;
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
