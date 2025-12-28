/**
 * Particle System - Mini City
 * Urban / Night City / Modern Architecture Theme
 * Game #071
 */

import { randomRange, clamp } from './math';

export type ParticleType = 'building' | 'traffic' | 'sparkle' | 'growth' | 'smoke' | 'landmark';

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  rotation: number;
  rotationSpeed: number;
  life: number;
  maxLife: number;
  alpha: number;
  type: ParticleType;
  color: { r: number; g: number; b: number };
}

const PARTICLE_CONFIGS: Record<ParticleType, {
  size: [number, number];
  life: [number, number];
  speed: [number, number];
  color: { r: number; g: number; b: number };
  gravity: number;
  rotationSpeed: [number, number];
}> = {
  building: {
    size: [20, 40],
    life: [0.8, 1.2],
    speed: [0, 10],
    color: { r: 0.8, g: 0.6, b: 0.4 },
    gravity: -50,
    rotationSpeed: [0, 0],
  },
  traffic: {
    size: [30, 60],
    life: [0.5, 1.0],
    speed: [80, 150],
    color: { r: 1.0, g: 0.9, b: 0.6 },
    gravity: 0,
    rotationSpeed: [0, 0],
  },
  sparkle: {
    size: [8, 15],
    life: [0.3, 0.6],
    speed: [40, 80],
    color: { r: 1.0, g: 0.95, b: 0.8 },
    gravity: 0,
    rotationSpeed: [2, 5],
  },
  growth: {
    size: [50, 100],
    life: [0.4, 0.7],
    speed: [0, 5],
    color: { r: 0.3, g: 0.9, b: 0.5 },
    gravity: 0,
    rotationSpeed: [0, 0],
  },
  smoke: {
    size: [15, 30],
    life: [1.5, 2.5],
    speed: [10, 25],
    color: { r: 0.5, g: 0.5, b: 0.55 },
    gravity: -15,
    rotationSpeed: [0.5, 1.5],
  },
  landmark: {
    size: [25, 45],
    life: [1.0, 1.5],
    speed: [5, 15],
    color: { r: 1.0, g: 0.85, b: 0.3 },
    gravity: -10,
    rotationSpeed: [0.5, 1.0],
  },
};

export class ParticleSystem {
  private particles: Particle[] = [];
  private maxParticles = 400;

  emit(x: number, y: number, type: ParticleType, count: number = 1): void {
    const config = PARTICLE_CONFIGS[type];

    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) {
        this.particles.shift();
      }

      const angle = randomRange(0, Math.PI * 2);
      const speed = randomRange(config.speed[0], config.speed[1]);
      const life = randomRange(config.life[0], config.life[1]);

      let vx = Math.cos(angle) * speed;
      let vy = Math.sin(angle) * speed;
      let emitX = x;
      let emitY = y;

      // Type-specific emission patterns
      switch (type) {
        case 'building':
          // Rise upward
          vx = randomRange(-5, 5);
          vy = randomRange(-60, -40);
          break;

        case 'traffic':
          // Horizontal movement
          vx = (Math.random() > 0.5 ? 1 : -1) * speed;
          vy = randomRange(-5, 5);
          break;

        case 'sparkle':
          // Radial burst
          vx = Math.cos(angle) * speed;
          vy = Math.sin(angle) * speed;
          break;

        case 'growth':
          // Expand outward slowly
          vx = Math.cos(angle) * speed * 0.3;
          vy = Math.sin(angle) * speed * 0.3;
          break;

        case 'smoke':
          // Rise with drift
          vx = randomRange(-20, 20);
          vy = randomRange(-40, -20);
          emitX += randomRange(-15, 15);
          break;

        case 'landmark':
          // Float upward with sparkle
          vx = randomRange(-15, 15);
          vy = randomRange(-30, -10);
          break;
      }

      // Color variation based on building type
      const colorVar = randomRange(-0.1, 0.1);
      const color = {
        r: clamp(config.color.r + colorVar, 0, 1),
        g: clamp(config.color.g + colorVar, 0, 1),
        b: clamp(config.color.b + colorVar, 0, 1),
      };

      // Special color handling for building types
      if (type === 'building') {
        const buildingColors = [
          { r: 0.9, g: 0.5, b: 0.4 },  // House - warm red
          { r: 0.4, g: 0.7, b: 1.0 },  // Shop - blue
          { r: 0.3, g: 0.85, b: 0.5 }, // Park - green
          { r: 0.6, g: 0.6, b: 0.65 }, // Factory - gray
        ];
        const selected = buildingColors[Math.floor(Math.random() * buildingColors.length)];
        color.r = selected.r;
        color.g = selected.g;
        color.b = selected.b;
      }

      if (type === 'sparkle') {
        // Golden sparkles
        color.r = 1.0;
        color.g = randomRange(0.8, 1.0);
        color.b = randomRange(0.5, 0.7);
      }

      this.particles.push({
        x: emitX,
        y: emitY,
        vx,
        vy,
        size: randomRange(config.size[0], config.size[1]),
        rotation: type === 'traffic' ? Math.atan2(vy, vx) : randomRange(0, Math.PI * 2),
        rotationSpeed: randomRange(config.rotationSpeed[0], config.rotationSpeed[1]) * (Math.random() > 0.5 ? 1 : -1),
        life,
        maxLife: life,
        alpha: 1,
        type,
        color,
      });
    }
  }

  update(deltaTime: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      const config = PARTICLE_CONFIGS[p.type];

      p.life -= deltaTime;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      // Physics
      p.vy += config.gravity * deltaTime;
      p.x += p.vx * deltaTime;
      p.y += p.vy * deltaTime;
      p.rotation += p.rotationSpeed * deltaTime;

      const lifeRatio = p.life / p.maxLife;

      // Type-specific behaviors
      switch (p.type) {
        case 'building':
          // Slow rise, steady fade
          p.alpha = lifeRatio;
          p.vy *= 0.95;
          break;

        case 'traffic':
          // Trail fade
          p.alpha = lifeRatio * 0.8;
          p.size *= 1 + deltaTime;
          break;

        case 'sparkle':
          // Quick burst
          p.alpha = lifeRatio * lifeRatio;
          break;

        case 'growth':
          // Expand and fade
          p.alpha = Math.sin(lifeRatio * Math.PI);
          p.size *= 1 + deltaTime * 2;
          break;

        case 'smoke':
          // Drift and fade
          p.alpha = lifeRatio * 0.6;
          p.vx += (Math.random() - 0.5) * 30 * deltaTime;
          p.size *= 1 + deltaTime * 0.5;
          break;

        case 'landmark':
          // Shimmer effect
          const shimmer = Math.sin(Date.now() * 0.01 + p.rotation * 2) * 0.3 + 0.7;
          p.alpha = lifeRatio * shimmer;
          break;
      }

      // Drag
      p.vx *= 0.99;
      p.vy *= 0.995;
    }
  }

  getParticles(): Particle[] {
    return this.particles;
  }

  clear(): void {
    this.particles = [];
  }
}
