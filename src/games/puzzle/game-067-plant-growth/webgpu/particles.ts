/**
 * Particle System - Plant Growth
 * Botanical Garden / Lush Nature / Verdant Theme
 * Game #067
 */

import { randomRange, clamp } from './math';

export type ParticleType = 'leaf' | 'pollen' | 'sprout' | 'water' | 'sunbeam' | 'bloom';

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
  leaf: {
    size: [15, 30],
    life: [2.0, 4.0],
    speed: [20, 50],
    color: { r: 0.3, g: 0.7, b: 0.2 },
    gravity: 15,
    rotationSpeed: [-2, 2],
  },
  pollen: {
    size: [4, 8],
    life: [2.0, 4.0],
    speed: [10, 25],
    color: { r: 1.0, g: 0.9, b: 0.5 },
    gravity: -5,
    rotationSpeed: [0, 0],
  },
  sprout: {
    size: [10, 18],
    life: [0.6, 1.2],
    speed: [30, 60],
    color: { r: 0.4, g: 0.8, b: 0.3 },
    gravity: -40,
    rotationSpeed: [-1, 1],
  },
  water: {
    size: [8, 15],
    life: [0.5, 1.0],
    speed: [40, 80],
    color: { r: 0.4, g: 0.7, b: 0.95 },
    gravity: 100,
    rotationSpeed: [0, 0],
  },
  sunbeam: {
    size: [20, 40],
    life: [0.8, 1.5],
    speed: [20, 40],
    color: { r: 1.0, g: 0.95, b: 0.7 },
    gravity: 10,
    rotationSpeed: [0, 0],
  },
  bloom: {
    size: [15, 30],
    life: [1.0, 2.0],
    speed: [40, 100],
    color: { r: 1.0, g: 0.6, b: 0.7 },
    gravity: -15,
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
        case 'leaf':
          // Leaves flutter down from above
          vx = randomRange(-30, 30);
          vy = randomRange(-10, 20);
          emitX += randomRange(-20, 20);
          break;

        case 'pollen':
          // Pollen drifts gently
          vx = randomRange(-15, 15);
          vy = randomRange(-20, -5);
          emitX += randomRange(-30, 30);
          break;

        case 'sprout':
          // Sprouts burst upward
          vx = randomRange(-20, 20);
          vy = randomRange(-80, -40);
          break;

        case 'water':
          // Water splashes outward
          vx = Math.cos(angle) * speed;
          vy = Math.sin(angle) * speed - 30;
          break;

        case 'sunbeam':
          // Sunbeams descend diagonally
          vx = randomRange(10, 30);
          vy = randomRange(20, 40);
          break;

        case 'bloom':
          // Bloom particles expand outward
          vx = Math.cos(angle) * speed * 0.8;
          vy = Math.sin(angle) * speed * 0.8 - 20;
          break;
      }

      // Add color variation
      const colorVar = randomRange(-0.1, 0.1);
      const color = {
        r: clamp(config.color.r + colorVar, 0, 1),
        g: clamp(config.color.g + colorVar, 0, 1),
        b: clamp(config.color.b + colorVar * 0.5, 0, 1),
      };

      // Special colors for bloom particles
      if (type === 'bloom') {
        const hue = randomRange(0, 1);
        if (hue < 0.3) {
          color.r = 1.0; color.g = 0.5 + randomRange(0, 0.3); color.b = 0.6;
        } else if (hue < 0.6) {
          color.r = 0.9; color.g = 0.5; color.b = 1.0;
        } else {
          color.r = 1.0; color.g = 0.8; color.b = 0.4;
        }
      }

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
        case 'leaf':
          // Sway side to side while falling
          p.vx += Math.sin(Date.now() * 0.003 + i) * 2 * deltaTime;
          p.vx *= 0.99;
          p.alpha = lifeRatio;
          break;

        case 'pollen':
          // Gentle drift
          p.vx += (Math.random() - 0.5) * 10 * deltaTime;
          p.vy += (Math.random() - 0.5) * 5 * deltaTime;
          p.alpha = lifeRatio * 0.8;
          break;

        case 'sprout':
          // Quick burst then fade
          p.alpha = lifeRatio * lifeRatio;
          p.size *= 1 + deltaTime * 0.5;
          break;

        case 'water':
          // Shrink as it falls
          p.size *= 0.99;
          p.alpha = lifeRatio;
          break;

        case 'sunbeam':
          // Fade gracefully
          p.alpha = lifeRatio * 0.6;
          p.size *= 1 + deltaTime * 0.3;
          break;

        case 'bloom':
          // Petals flutter
          p.rotationSpeed += (Math.random() - 0.5) * deltaTime;
          p.alpha = lifeRatio;
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
