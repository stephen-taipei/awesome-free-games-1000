/**
 * Particle System - 3D Puzzle
 * Holographic / Geometric / Futuristic Theme
 * Game #070
 */

import { randomRange, clamp } from './math';

export type ParticleType = 'wireframe' | 'hologram' | 'sparkle' | 'assembly' | 'cube' | 'prism';

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
  wireframe: {
    size: [15, 30],
    life: [1.0, 2.0],
    speed: [20, 50],
    color: { r: 0.0, g: 0.9, b: 1.0 },
    gravity: 0,
    rotationSpeed: [0.5, 2.0],
  },
  hologram: {
    size: [25, 50],
    life: [0.8, 1.5],
    speed: [10, 30],
    color: { r: 0.3, g: 0.8, b: 1.0 },
    gravity: -5,
    rotationSpeed: [0, 0.5],
  },
  sparkle: {
    size: [8, 15],
    life: [0.4, 0.8],
    speed: [50, 100],
    color: { r: 1.0, g: 1.0, b: 1.0 },
    gravity: 0,
    rotationSpeed: [2, 5],
  },
  assembly: {
    size: [40, 80],
    life: [0.3, 0.6],
    speed: [0, 10],
    color: { r: 0.2, g: 1.0, b: 0.8 },
    gravity: 0,
    rotationSpeed: [0, 0],
  },
  cube: {
    size: [12, 25],
    life: [1.5, 3.0],
    speed: [15, 40],
    color: { r: 0.8, g: 0.4, b: 1.0 },
    gravity: 10,
    rotationSpeed: [1, 3],
  },
  prism: {
    size: [15, 30],
    life: [1.0, 2.0],
    speed: [20, 50],
    color: { r: 1.0, g: 0.5, b: 0.8 },
    gravity: -3,
    rotationSpeed: [0.5, 1.5],
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
        case 'wireframe':
          // Grid-aligned movement
          const gridDir = Math.floor(Math.random() * 4);
          vx = [1, -1, 0, 0][gridDir] * speed;
          vy = [0, 0, 1, -1][gridDir] * speed;
          break;

        case 'hologram':
          // Float upward with slight drift
          vx = randomRange(-15, 15);
          vy = randomRange(-40, -20);
          break;

        case 'sparkle':
          // Radial burst
          vx = Math.cos(angle) * speed;
          vy = Math.sin(angle) * speed;
          break;

        case 'assembly':
          // Converge to center
          vx = 0;
          vy = 0;
          break;

        case 'cube':
          // Scatter with rotation
          vx = Math.cos(angle) * speed * 0.7;
          vy = Math.sin(angle) * speed;
          emitX += randomRange(-20, 20);
          emitY += randomRange(-20, 20);
          break;

        case 'prism':
          // Spiral outward
          vx = Math.cos(angle) * speed;
          vy = Math.sin(angle) * speed - 20;
          break;
      }

      // Color variation
      const colorVar = randomRange(-0.1, 0.1);
      const color = {
        r: clamp(config.color.r + colorVar, 0, 1),
        g: clamp(config.color.g + colorVar, 0, 1),
        b: clamp(config.color.b + colorVar, 0, 1),
      };

      // Special color handling
      if (type === 'sparkle') {
        // White with slight color tint
        const tint = Math.random();
        color.r = 0.9 + tint * 0.1;
        color.g = 0.9 + (1 - tint) * 0.1;
        color.b = 1.0;
      }

      if (type === 'prism') {
        // Rainbow colors
        const hue = Math.random() * Math.PI * 2;
        color.r = Math.sin(hue) * 0.5 + 0.5;
        color.g = Math.sin(hue + 2.094) * 0.5 + 0.5;
        color.b = Math.sin(hue + 4.188) * 0.5 + 0.5;
      }

      this.particles.push({
        x: emitX,
        y: emitY,
        vx,
        vy,
        size: randomRange(config.size[0], config.size[1]),
        rotation: randomRange(0, Math.PI * 2),
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
        case 'wireframe':
          // Digital flicker
          p.alpha = lifeRatio * (Math.random() > 0.05 ? 1 : 0.2);
          break;

        case 'hologram':
          // Scan line effect
          const scanFlicker = Math.sin(Date.now() * 0.02 + p.y * 0.1) * 0.2 + 0.8;
          p.alpha = lifeRatio * scanFlicker;
          break;

        case 'sparkle':
          // Quick burst and fade
          p.alpha = lifeRatio * lifeRatio;
          p.size *= 1 - deltaTime * 2;
          break;

        case 'assembly':
          // Expand then fade
          p.alpha = Math.sin(lifeRatio * Math.PI);
          p.size *= 1 + deltaTime * 3;
          break;

        case 'cube':
          // Steady fade with rotation
          p.alpha = lifeRatio * 0.9;
          p.rotationSpeed *= 1 + deltaTime * 0.5;
          break;

        case 'prism':
          // Shimmer effect
          const shimmer = Math.sin(Date.now() * 0.01 + p.rotation * 3) * 0.3 + 0.7;
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
