/**
 * Particle System - Ball Maze
 * Classic Wooden Labyrinth / Vintage Tilting Maze Theme
 * Game #046
 */

import { clamp, randomRange } from './math';

// Particle types for wooden labyrinth theme
export type ParticleType =
  | 'dust'      // Wood dust from ball rolling
  | 'sparkle'   // Metallic ball sparkle
  | 'victory'   // Golden confetti
  | 'ambient'   // Floating dust motes
  | 'trail';    // Ball rolling trail

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  type: ParticleType;
  color: [number, number, number, number];
}

const TYPE_MAP: Record<ParticleType, number> = {
  dust: 0,
  sparkle: 1,
  victory: 2,
  ambient: 3,
  trail: 4,
};

// Warm wood and metal color palette
const DUST_COLORS: [number, number, number][] = [
  [0.76, 0.60, 0.42], // Light wood
  [0.65, 0.50, 0.35], // Medium wood
  [0.55, 0.42, 0.28], // Dark wood
  [0.70, 0.55, 0.38], // Warm wood
];

const SPARKLE_COLORS: [number, number, number][] = [
  [0.95, 0.90, 0.85], // Silver white
  [0.85, 0.82, 0.78], // Steel
  [1.0, 0.95, 0.88],  // Bright shine
  [0.9, 0.85, 0.80],  // Matte metal
];

const VICTORY_COLORS: [number, number, number][] = [
  [1.0, 0.85, 0.4],   // Gold
  [0.9, 0.6, 0.3],    // Bronze
  [0.8, 0.65, 0.35],  // Brass
  [1.0, 0.9, 0.5],    // Light gold
  [0.85, 0.55, 0.25], // Copper
];

const TRAIL_COLORS: [number, number, number][] = [
  [0.7, 0.65, 0.6],   // Steel gray
  [0.8, 0.75, 0.7],   // Light metal
  [0.6, 0.58, 0.55],  // Dark steel
];

export class ParticleSystem {
  private particles: Particle[] = [];
  private maxParticles: number;

  constructor(maxParticles: number = 500) {
    this.maxParticles = maxParticles;
  }

  // Emit wood dust when ball rolls
  emitDust(x: number, y: number, intensity: number = 1): void {
    const count = Math.floor(5 * intensity);
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const angle = Math.random() * Math.PI * 2;
      const speed = randomRange(0.01, 0.03) * intensity;
      const color = DUST_COLORS[Math.floor(Math.random() * DUST_COLORS.length)];

      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 0.01,
        life: randomRange(0.5, 1.0),
        maxLife: randomRange(0.5, 1.0),
        size: randomRange(0.008, 0.02) * intensity,
        type: 'dust',
        color: [...color, randomRange(0.3, 0.6)],
      });
    }
  }

  // Emit metallic sparkle from ball
  emitSparkle(x: number, y: number): void {
    const count = 3;
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const angle = randomRange(-Math.PI * 0.7, -Math.PI * 0.3);
      const speed = randomRange(0.02, 0.05);
      const color = SPARKLE_COLORS[Math.floor(Math.random() * SPARKLE_COLORS.length)];

      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: randomRange(0.2, 0.4),
        maxLife: randomRange(0.2, 0.4),
        size: randomRange(0.006, 0.012),
        type: 'sparkle',
        color: [...color, 1.0],
      });
    }
  }

  // Emit golden victory confetti
  emitVictory(x: number, y: number): void {
    const count = 40;
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const angle = randomRange(-Math.PI * 0.9, -Math.PI * 0.1);
      const speed = randomRange(0.03, 0.1);
      const color = VICTORY_COLORS[Math.floor(Math.random() * VICTORY_COLORS.length)];

      this.particles.push({
        x: x + randomRange(-0.1, 0.1),
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 0.02,
        life: randomRange(2.0, 3.5),
        maxLife: randomRange(2.0, 3.5),
        size: randomRange(0.012, 0.025),
        type: 'victory',
        color: [...color, 1.0],
      });
    }
  }

  // Emit ambient floating dust
  emitAmbient(): void {
    if (this.particles.length >= this.maxParticles) return;
    if (Math.random() > 0.02) return;

    const color = DUST_COLORS[Math.floor(Math.random() * DUST_COLORS.length)];

    this.particles.push({
      x: Math.random(),
      y: Math.random(),
      vx: randomRange(-0.001, 0.001),
      vy: randomRange(-0.003, -0.008),
      life: randomRange(3.0, 6.0),
      maxLife: randomRange(3.0, 6.0),
      size: randomRange(0.003, 0.008),
      type: 'ambient',
      color: [...color, randomRange(0.15, 0.3)],
    });
  }

  // Emit ball rolling trail
  emitTrail(x: number, y: number, vx: number, vy: number): void {
    if (this.particles.length >= this.maxParticles) return;

    const speed = Math.sqrt(vx * vx + vy * vy);
    if (speed < 0.5) return;

    const color = TRAIL_COLORS[Math.floor(Math.random() * TRAIL_COLORS.length)];

    this.particles.push({
      x,
      y,
      vx: -vx * 0.02,
      vy: -vy * 0.02,
      life: randomRange(0.2, 0.4),
      maxLife: randomRange(0.2, 0.4),
      size: randomRange(0.015, 0.025) * Math.min(1, speed / 5),
      type: 'trail',
      color: [...color, randomRange(0.3, 0.5)],
    });
  }

  // Emit wall bounce effect
  emitBounce(x: number, y: number): void {
    const count = 8;
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const angle = Math.random() * Math.PI * 2;
      const speed = randomRange(0.02, 0.05);
      const color = DUST_COLORS[Math.floor(Math.random() * DUST_COLORS.length)];

      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: randomRange(0.3, 0.6),
        maxLife: randomRange(0.3, 0.6),
        size: randomRange(0.01, 0.02),
        type: 'dust',
        color: [...color, randomRange(0.4, 0.7)],
      });
    }
  }

  // Emit hole fall effect
  emitHoleFall(x: number, y: number): void {
    const count = 15;
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const angle = Math.random() * Math.PI * 2;
      const speed = randomRange(0.01, 0.03);
      const color = [0.1, 0.1, 0.1] as [number, number, number];

      this.particles.push({
        x: x + Math.cos(angle) * 0.02,
        y: y + Math.sin(angle) * 0.02,
        vx: Math.cos(angle) * speed * 0.5,
        vy: Math.sin(angle) * speed * 0.5 + 0.02,
        life: randomRange(0.5, 0.8),
        maxLife: randomRange(0.5, 0.8),
        size: randomRange(0.01, 0.02),
        type: 'dust',
        color: [...color, 0.6],
      });
    }
  }

  update(dt: number): void {
    const gravity = 0.05;

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;

      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      // Type-specific physics
      switch (p.type) {
        case 'dust':
          p.vy += gravity * dt * 0.3;
          p.vx *= 0.98;
          p.vy *= 0.98;
          break;
        case 'sparkle':
          p.vx *= 0.95;
          p.vy *= 0.95;
          break;
        case 'victory':
          p.vy += gravity * dt * 0.8;
          p.vx *= 0.995;
          // Gentle swaying
          p.vx += Math.sin(p.life * 8) * 0.0005;
          break;
        case 'ambient':
          p.vx += Math.sin(p.life * 3) * 0.00005;
          break;
        case 'trail':
          p.vx *= 0.92;
          p.vy *= 0.92;
          break;
      }

      p.x += p.vx * dt * 60;
      p.y += p.vy * dt * 60;
    }
  }

  getParticleData(): Float32Array {
    const data = new Float32Array(this.maxParticles * 12);

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      const offset = i * 12;

      data[offset] = p.x;
      data[offset + 1] = p.y;
      data[offset + 2] = p.vx;
      data[offset + 3] = p.vy;
      data[offset + 4] = p.life;
      data[offset + 5] = p.maxLife;
      data[offset + 6] = p.size;
      data[offset + 7] = TYPE_MAP[p.type];
      data[offset + 8] = p.color[0];
      data[offset + 9] = p.color[1];
      data[offset + 10] = p.color[2];
      data[offset + 11] = p.color[3];
    }

    return data;
  }

  getParticleCount(): number {
    return this.particles.length;
  }

  clear(): void {
    this.particles = [];
  }
}
