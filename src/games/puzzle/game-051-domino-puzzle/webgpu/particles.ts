/**
 * Particle System - Domino Puzzle
 * Luxury Casino / Monte Carlo Theme
 * Game #051
 */

import { clamp, randomRange } from './math';

// Particle types for casino theme
export type ParticleType =
  | 'dust'      // Ambient velvet dust
  | 'sparkle'   // Gold sparkles
  | 'match'     // Match effect
  | 'victory'   // Victory celebration
  | 'smoke';    // Casino smoke

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
  match: 2,
  victory: 3,
  smoke: 4,
};

// Luxury color palette
const DUST_COLORS: [number, number, number][] = [
  [0.9, 0.85, 0.7],   // Cream
  [0.85, 0.8, 0.65],  // Beige
  [0.8, 0.75, 0.6],   // Tan
  [0.95, 0.9, 0.8],   // Ivory
];

const SPARKLE_COLORS: [number, number, number][] = [
  [1.0, 0.85, 0.3],   // Gold
  [1.0, 0.9, 0.5],    // Light gold
  [0.95, 0.8, 0.2],   // Deep gold
  [1.0, 0.95, 0.7],   // Pale gold
];

const MATCH_COLORS: [number, number, number][] = [
  [1.0, 0.9, 0.4],    // Bright gold
  [0.4, 0.8, 0.4],    // Success green
  [1.0, 0.95, 0.6],   // Light gold
  [0.9, 0.85, 0.3],   // Rich gold
];

const VICTORY_COLORS: [number, number, number][] = [
  [1.0, 0.85, 0.2],   // Gold
  [0.9, 0.3, 0.3],    // Red (chip color)
  [0.2, 0.2, 0.8],    // Blue (chip color)
  [0.2, 0.7, 0.3],    // Green (felt)
  [1.0, 1.0, 1.0],    // White
  [0.1, 0.1, 0.1],    // Black (domino)
];

const SMOKE_COLORS: [number, number, number][] = [
  [0.6, 0.55, 0.5],   // Light smoke
  [0.5, 0.45, 0.4],   // Medium smoke
  [0.7, 0.65, 0.6],   // Pale smoke
];

export class ParticleSystem {
  private particles: Particle[] = [];
  private maxParticles: number;

  constructor(maxParticles: number = 500) {
    this.maxParticles = maxParticles;
  }

  // Emit ambient dust particles
  emitDust(): void {
    if (this.particles.length >= this.maxParticles) return;
    if (Math.random() > 0.02) return;

    const color = DUST_COLORS[Math.floor(Math.random() * DUST_COLORS.length)];

    this.particles.push({
      x: Math.random(),
      y: Math.random(),
      vx: randomRange(-0.001, 0.001),
      vy: randomRange(-0.002, 0.001),
      life: randomRange(3.0, 6.0),
      maxLife: randomRange(3.0, 6.0),
      size: randomRange(0.003, 0.006),
      type: 'dust',
      color: [...color, randomRange(0.2, 0.4)],
    });
  }

  // Emit gold sparkle at position
  emitSparkle(x: number, y: number): void {
    const count = 5;
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const angle = randomRange(0, Math.PI * 2);
      const speed = randomRange(0.01, 0.03);
      const color = SPARKLE_COLORS[Math.floor(Math.random() * SPARKLE_COLORS.length)];

      this.particles.push({
        x: x + randomRange(-0.02, 0.02),
        y: y + randomRange(-0.02, 0.02),
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: randomRange(0.4, 0.7),
        maxLife: randomRange(0.4, 0.7),
        size: randomRange(0.01, 0.018),
        type: 'sparkle',
        color: [...color, 1.0],
      });
    }
  }

  // Emit selection effect
  emitSelect(x: number, y: number): void {
    const count = 8;
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const angle = (i / count) * Math.PI * 2;
      const speed = randomRange(0.02, 0.04);
      const color = SPARKLE_COLORS[0]; // Gold

      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: randomRange(0.3, 0.5),
        maxLife: randomRange(0.3, 0.5),
        size: randomRange(0.012, 0.02),
        type: 'sparkle',
        color: [...color, 1.0],
      });
    }
  }

  // Emit match celebration
  emitMatch(x: number, y: number): void {
    // Ring effect
    this.particles.push({
      x,
      y,
      vx: 0,
      vy: 0,
      life: 0.6,
      maxLife: 0.6,
      size: 0.1,
      type: 'match',
      color: [1.0, 0.9, 0.4, 0.8],
    });

    // Sparkle burst
    const count = 15;
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const angle = (i / count) * Math.PI * 2 + randomRange(-0.2, 0.2);
      const speed = randomRange(0.03, 0.06);
      const color = MATCH_COLORS[Math.floor(Math.random() * MATCH_COLORS.length)];

      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: randomRange(0.5, 0.8),
        maxLife: randomRange(0.5, 0.8),
        size: randomRange(0.015, 0.025),
        type: 'sparkle',
        color: [...color, 1.0],
      });
    }
  }

  // Emit victory celebration
  emitVictory(x: number, y: number): void {
    const count = 60;
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const angle = randomRange(0, Math.PI * 2);
      const speed = randomRange(0.03, 0.1);
      const color = VICTORY_COLORS[Math.floor(Math.random() * VICTORY_COLORS.length)];

      this.particles.push({
        x: x + randomRange(-0.15, 0.15),
        y: y + randomRange(-0.15, 0.15),
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 0.02,
        life: randomRange(1.5, 2.5),
        maxLife: randomRange(1.5, 2.5),
        size: randomRange(0.015, 0.03),
        type: 'victory',
        color: [...color, 1.0],
      });
    }
  }

  // Emit smoke
  emitSmoke(x: number, y: number): void {
    if (this.particles.length >= this.maxParticles) return;

    const color = SMOKE_COLORS[Math.floor(Math.random() * SMOKE_COLORS.length)];

    this.particles.push({
      x,
      y,
      vx: randomRange(-0.005, 0.005),
      vy: randomRange(-0.01, -0.02),
      life: randomRange(2.0, 4.0),
      maxLife: randomRange(2.0, 4.0),
      size: randomRange(0.02, 0.04),
      type: 'smoke',
      color: [...color, 0.3],
    });
  }

  update(dt: number): void {
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
          // Gentle float
          p.vx += Math.sin(p.life * 2) * 0.00002;
          p.vy -= 0.00005; // Slight upward drift
          break;
        case 'sparkle':
          p.vx *= 0.95;
          p.vy *= 0.95;
          break;
        case 'match':
          // Ring expands
          p.size += dt * 0.15;
          break;
        case 'victory':
          p.vy += 0.0008; // Gravity for confetti
          p.vx *= 0.99;
          // Tumbling motion
          p.vx += Math.sin(p.life * 10) * 0.0003;
          break;
        case 'smoke':
          // Expand and rise
          p.size += dt * 0.01;
          p.vy -= 0.0001;
          p.vx += Math.sin(p.life) * 0.0001;
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
