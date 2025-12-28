/**
 * Particle System - Mechanism Puzzle
 * Steampunk / Clockwork / Industrial Brass Theme
 * Game #066
 */

import { randomRange, lerp, clamp } from './math';

export type ParticleType = 'steam' | 'spark' | 'cog' | 'brass' | 'pressure' | 'victory';

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
  steam: {
    size: [20, 45],
    life: [1.5, 3.0],
    speed: [10, 30],
    color: { r: 0.7, g: 0.68, b: 0.65 },
    gravity: -25, // Rises
    rotationSpeed: [-0.5, 0.5],
  },
  spark: {
    size: [4, 10],
    life: [0.3, 0.8],
    speed: [80, 200],
    color: { r: 1.0, g: 0.7, b: 0.2 },
    gravity: 150,
    rotationSpeed: [2, 6],
  },
  cog: {
    size: [12, 25],
    life: [0.8, 1.5],
    speed: [30, 80],
    color: { r: 0.45, g: 0.4, b: 0.35 },
    gravity: 80,
    rotationSpeed: [3, 8],
  },
  brass: {
    size: [5, 12],
    life: [0.5, 1.2],
    speed: [40, 100],
    color: { r: 0.85, g: 0.65, b: 0.25 },
    gravity: 120,
    rotationSpeed: [4, 10],
  },
  pressure: {
    size: [15, 35],
    life: [0.4, 0.8],
    speed: [100, 200],
    color: { r: 0.8, g: 0.75, b: 0.7 },
    gravity: -30,
    rotationSpeed: [0, 0],
  },
  victory: {
    size: [15, 35],
    life: [1.0, 2.0],
    speed: [50, 150],
    color: { r: 0.95, g: 0.75, b: 0.2 },
    gravity: -20,
    rotationSpeed: [1, 3],
  },
};

export class ParticleSystem {
  private particles: Particle[] = [];
  private maxParticles = 400;

  emit(x: number, y: number, type: ParticleType, count: number = 1): void {
    const config = PARTICLE_CONFIGS[type];

    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) {
        // Remove oldest particle
        this.particles.shift();
      }

      const angle = randomRange(0, Math.PI * 2);
      const speed = randomRange(config.speed[0], config.speed[1]);
      const life = randomRange(config.life[0], config.life[1]);

      // Type-specific emission patterns
      let vx = Math.cos(angle) * speed;
      let vy = Math.sin(angle) * speed;
      let emitX = x;
      let emitY = y;

      switch (type) {
        case 'steam':
          // Steam rises upward with slight spread
          vx = randomRange(-20, 20);
          vy = randomRange(-50, -100);
          emitX += randomRange(-10, 10);
          break;

        case 'spark':
          // Sparks fly in all directions from gears
          vx = Math.cos(angle) * speed * randomRange(0.5, 1.5);
          vy = Math.sin(angle) * speed * 0.8 - 30;
          break;

        case 'cog':
          // Cogs fly outward
          vx = Math.cos(angle) * speed * 0.8;
          vy = Math.sin(angle) * speed * 0.8 - 20;
          break;

        case 'brass':
          // Brass flecks scatter
          vx = Math.cos(angle) * speed;
          vy = Math.sin(angle) * speed - 40;
          break;

        case 'pressure':
          // Pressure bursts outward rapidly
          const burstAngle = randomRange(0, Math.PI * 2);
          vx = Math.cos(burstAngle) * speed;
          vy = Math.sin(burstAngle) * speed;
          break;

        case 'victory':
          // Victory particles rise upward
          vx = Math.cos(angle) * speed * 0.6;
          vy = -Math.abs(Math.sin(angle) * speed) - 40;
          break;
      }

      // Add color variation
      const colorVar = randomRange(-0.1, 0.1);
      const color = {
        r: clamp(config.color.r + colorVar, 0, 1),
        g: clamp(config.color.g + colorVar * 0.8, 0, 1),
        b: clamp(config.color.b + colorVar * 0.5, 0, 1),
      };

      this.particles.push({
        x: emitX,
        y: emitY,
        vx,
        vy,
        size: randomRange(config.size[0], config.size[1]),
        rotation: randomRange(0, Math.PI * 2),
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

      // Update life
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

      // Type-specific behaviors
      const lifeRatio = p.life / p.maxLife;

      switch (p.type) {
        case 'steam':
          // Steam spreads as it rises
          p.vx += (Math.random() - 0.5) * 30 * deltaTime;
          p.size *= 1 + deltaTime * 0.5;
          p.alpha = lifeRatio * 0.6;
          break;

        case 'spark':
          // Sparks fade quickly
          p.alpha = Math.pow(lifeRatio, 2);
          p.size *= 0.98;
          // Add trail effect by reducing velocity slowly
          p.vx *= 0.99;
          p.vy *= 0.99;
          break;

        case 'cog':
          // Cogs slow rotation as they fall
          p.rotationSpeed *= 0.995;
          p.alpha = lifeRatio;
          break;

        case 'brass':
          // Brass flecks tumble
          p.rotationSpeed += (Math.random() - 0.5) * 2 * deltaTime;
          p.alpha = lifeRatio * 0.9;
          break;

        case 'pressure':
          // Pressure burst expands and fades
          p.size *= 1 + deltaTime * 2;
          p.alpha = lifeRatio * lifeRatio;
          p.vx *= 0.95;
          p.vy *= 0.95;
          break;

        case 'victory':
          // Victory particles shimmer
          p.alpha = lifeRatio * (0.8 + Math.sin(Date.now() * 0.01 + i) * 0.2);
          p.size *= 1 + deltaTime * 0.2;
          break;
      }

      // Apply drag
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
