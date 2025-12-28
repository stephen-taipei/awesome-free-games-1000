/**
 * Particle System - Code Puzzle
 * Matrix / Cyberpunk / Hacker Theme
 * Game #069
 */

import { randomRange, clamp } from './math';

export type ParticleType = 'binary' | 'datastream' | 'circuit' | 'decrypt' | 'matrix' | 'hexcode';

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
  binary: {
    size: [8, 15],
    life: [1.0, 2.5],
    speed: [20, 60],
    color: { r: 0.0, g: 1.0, b: 0.4 },
    gravity: 20,
    rotationSpeed: [0, 0],
  },
  datastream: {
    size: [30, 60],
    life: [0.5, 1.0],
    speed: [100, 200],
    color: { r: 0.0, g: 0.8, b: 1.0 },
    gravity: 0,
    rotationSpeed: [0, 0],
  },
  circuit: {
    size: [5, 10],
    life: [0.8, 1.5],
    speed: [60, 120],
    color: { r: 0.0, g: 1.0, b: 0.8 },
    gravity: 0,
    rotationSpeed: [0, 0],
  },
  decrypt: {
    size: [15, 30],
    life: [0.4, 0.8],
    speed: [50, 100],
    color: { r: 0.2, g: 1.0, b: 0.5 },
    gravity: -10,
    rotationSpeed: [2, 5],
  },
  matrix: {
    size: [10, 20],
    life: [2.0, 4.0],
    speed: [30, 80],
    color: { r: 0.0, g: 0.9, b: 0.3 },
    gravity: 50,
    rotationSpeed: [0, 0],
  },
  hexcode: {
    size: [12, 20],
    life: [0.6, 1.2],
    speed: [30, 60],
    color: { r: 1.0, g: 0.8, b: 0.0 },
    gravity: 5,
    rotationSpeed: [0, 0],
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
        case 'binary':
          // Binary bits scatter in grid-like pattern
          vx = (Math.random() > 0.5 ? 1 : -1) * randomRange(20, 50);
          vy = (Math.random() > 0.5 ? 1 : -1) * randomRange(20, 50);
          break;

        case 'datastream':
          // Data streams shoot horizontally
          vx = (Math.random() > 0.5 ? 1 : -1) * speed;
          vy = randomRange(-10, 10);
          break;

        case 'circuit':
          // Circuit pulses move in cardinal directions
          const dir = Math.floor(Math.random() * 4);
          if (dir === 0) { vx = speed; vy = 0; }
          else if (dir === 1) { vx = -speed; vy = 0; }
          else if (dir === 2) { vx = 0; vy = speed; }
          else { vx = 0; vy = -speed; }
          break;

        case 'decrypt':
          // Decrypt sparks burst outward
          vx = Math.cos(angle) * speed;
          vy = Math.sin(angle) * speed - 30;
          break;

        case 'matrix':
          // Matrix drops fall down
          vx = randomRange(-5, 5);
          vy = randomRange(30, 80);
          emitX += randomRange(-30, 30);
          break;

        case 'hexcode':
          // Hex codes float up slightly
          vx = randomRange(-20, 20);
          vy = randomRange(-40, -20);
          break;
      }

      // Color variation
      const colorVar = randomRange(-0.05, 0.05);
      const color = {
        r: clamp(config.color.r + colorVar, 0, 1),
        g: clamp(config.color.g + colorVar, 0, 1),
        b: clamp(config.color.b + colorVar, 0, 1),
      };

      // Special color handling
      if (type === 'binary') {
        // Random between green and cyan
        if (Math.random() > 0.5) {
          color.r = 0;
          color.g = 1.0;
          color.b = randomRange(0.3, 0.6);
        }
      }

      if (type === 'decrypt') {
        // Brighter, more varied
        color.g = randomRange(0.8, 1.0);
        color.b = randomRange(0.3, 0.7);
      }

      this.particles.push({
        x: emitX,
        y: emitY,
        vx,
        vy,
        size: randomRange(config.size[0], config.size[1]),
        rotation: type === 'datastream' ? Math.atan2(vy, vx) : randomRange(0, Math.PI * 2),
        rotationSpeed: randomRange(config.rotationSpeed[0], config.rotationSpeed[1]),
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
        case 'binary':
          // Digital flicker
          p.alpha = lifeRatio * (Math.random() > 0.1 ? 1 : 0.3);
          break;

        case 'datastream':
          // Maintain direction, fade out
          p.alpha = lifeRatio * 0.8;
          p.size *= 1 + deltaTime * 0.5;
          break;

        case 'circuit':
          // Pulse along path
          p.alpha = lifeRatio * (Math.sin(Date.now() * 0.01) * 0.3 + 0.7);
          break;

        case 'decrypt':
          // Spark and fade
          p.alpha = lifeRatio * lifeRatio;
          p.rotationSpeed += deltaTime * 2;
          break;

        case 'matrix':
          // Fade from top
          p.alpha = lifeRatio * 0.9;
          // Slight horizontal drift
          p.vx += (Math.random() - 0.5) * 5 * deltaTime;
          break;

        case 'hexcode':
          // Float and fade
          p.alpha = lifeRatio * 0.85;
          p.vy -= 10 * deltaTime; // Slow rise
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
