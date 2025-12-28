/**
 * Particle System - Mirror World
 * Crystal / Reflection / Dimensional Theme
 * Game #068
 */

import { randomRange, clamp } from './math';

export type ParticleType = 'shard' | 'lightray' | 'sparkle' | 'syncwave' | 'rift' | 'prism';

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
  shard: {
    size: [10, 25],
    life: [1.0, 2.5],
    speed: [30, 80],
    color: { r: 0.8, g: 0.9, b: 1.0 },
    gravity: 30,
    rotationSpeed: [-4, 4],
  },
  lightray: {
    size: [20, 50],
    life: [0.4, 0.8],
    speed: [100, 200],
    color: { r: 1.0, g: 1.0, b: 0.9 },
    gravity: 0,
    rotationSpeed: [0, 0],
  },
  sparkle: {
    size: [5, 12],
    life: [0.5, 1.5],
    speed: [10, 30],
    color: { r: 1.0, g: 1.0, b: 1.0 },
    gravity: -5,
    rotationSpeed: [2, 5],
  },
  syncwave: {
    size: [30, 60],
    life: [0.6, 1.2],
    speed: [0, 10],
    color: { r: 0.6, g: 0.8, b: 1.0 },
    gravity: 0,
    rotationSpeed: [0, 0],
  },
  rift: {
    size: [25, 45],
    life: [1.0, 2.0],
    speed: [5, 20],
    color: { r: 0.5, g: 0.2, b: 0.9 },
    gravity: 0,
    rotationSpeed: [1, 3],
  },
  prism: {
    size: [15, 30],
    life: [1.0, 2.0],
    speed: [20, 50],
    color: { r: 1.0, g: 0.8, b: 0.9 },
    gravity: 10,
    rotationSpeed: [0.5, 2],
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
        case 'shard':
          // Crystal shards scatter outward
          vx = Math.cos(angle) * speed;
          vy = Math.sin(angle) * speed - 20;
          emitX += randomRange(-15, 15);
          emitY += randomRange(-15, 15);
          break;

        case 'lightray':
          // Light rays shoot in specific directions
          const rayAngle = randomRange(-0.3, 0.3); // Near horizontal
          vx = Math.cos(rayAngle) * speed * (Math.random() > 0.5 ? 1 : -1);
          vy = Math.sin(rayAngle) * speed * 0.3;
          break;

        case 'sparkle':
          // Sparkles drift gently upward
          vx = randomRange(-20, 20);
          vy = randomRange(-30, -10);
          emitX += randomRange(-30, 30);
          emitY += randomRange(-20, 20);
          break;

        case 'syncwave':
          // Sync waves pulse outward from center
          vx = 0;
          vy = 0;
          break;

        case 'rift':
          // Rift particles swirl slowly
          vx = randomRange(-15, 15);
          vy = randomRange(-15, 15);
          break;

        case 'prism':
          // Prism particles scatter in arc
          const prismAngle = randomRange(-Math.PI * 0.7, Math.PI * 0.7);
          vx = Math.cos(prismAngle) * speed;
          vy = Math.sin(prismAngle) * speed * 0.5;
          break;
      }

      // Color variation
      const colorVar = randomRange(-0.1, 0.1);
      const color = {
        r: clamp(config.color.r + colorVar, 0, 1),
        g: clamp(config.color.g + colorVar, 0, 1),
        b: clamp(config.color.b + colorVar, 0, 1),
      };

      // Special colors for certain particle types
      if (type === 'shard') {
        // Crystals can be blue or pink based on side
        if (Math.random() > 0.5) {
          color.r = 0.4; color.g = 0.6; color.b = 1.0;
        } else {
          color.r = 1.0; color.g = 0.4; color.b = 0.6;
        }
      }

      if (type === 'prism') {
        // Rainbow colors
        const hue = Math.random();
        if (hue < 0.16) { color.r = 1.0; color.g = hue * 6; color.b = 0; }
        else if (hue < 0.33) { color.r = 1 - (hue - 0.16) * 6; color.g = 1.0; color.b = 0; }
        else if (hue < 0.5) { color.r = 0; color.g = 1.0; color.b = (hue - 0.33) * 6; }
        else if (hue < 0.66) { color.r = 0; color.g = 1 - (hue - 0.5) * 6; color.b = 1.0; }
        else if (hue < 0.83) { color.r = (hue - 0.66) * 6; color.g = 0; color.b = 1.0; }
        else { color.r = 1.0; color.g = 0; color.b = 1 - (hue - 0.83) * 6; }
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
        case 'shard':
          // Shards tumble and fade
          p.rotationSpeed *= 0.99;
          p.alpha = lifeRatio;
          break;

        case 'lightray':
          // Light rays fade quickly
          p.alpha = lifeRatio * lifeRatio;
          p.size *= 1 + deltaTime;
          break;

        case 'sparkle':
          // Sparkles twinkle
          p.alpha = lifeRatio * (Math.sin(Date.now() * 0.02 + i) * 0.3 + 0.7);
          break;

        case 'syncwave':
          // Sync waves expand and fade
          p.size *= 1 + deltaTime * 3;
          p.alpha = lifeRatio * 0.6;
          break;

        case 'rift':
          // Rifts swirl and pulse
          const swirl = Math.sin(Date.now() * 0.005 + i) * 20;
          p.vx += swirl * deltaTime;
          p.vy += Math.cos(Date.now() * 0.005 + i) * 20 * deltaTime;
          p.alpha = lifeRatio * 0.8;
          break;

        case 'prism':
          // Prisms shimmer with color
          p.alpha = lifeRatio * 0.9;
          break;
      }

      // Drag
      p.vx *= 0.98;
      p.vy *= 0.98;
    }
  }

  getParticles(): Particle[] {
    return this.particles;
  }

  clear(): void {
    this.particles = [];
  }
}
