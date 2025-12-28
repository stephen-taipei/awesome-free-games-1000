/**
 * Particle System - Paper Plane Puzzle
 * Origami Workshop / Japanese Zen Garden Theme
 * Game #053
 */

import { clamp, randomRange } from './math';

// Particle types for origami theme
export type ParticleType =
  | 'petal'     // Cherry blossom petals
  | 'fold'      // Paper fold crease sparkle
  | 'sparkle'   // Gentle shimmer
  | 'wind'      // Breeze particles
  | 'victory';  // Celebration petals

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
  petal: 0,
  fold: 1,
  sparkle: 2,
  wind: 3,
  victory: 4,
};

// Japanese zen color palette
const PETAL_COLORS: [number, number, number][] = [
  [1.0, 0.85, 0.88],    // Sakura pink
  [1.0, 0.80, 0.85],    // Deep sakura
  [0.98, 0.90, 0.92],   // Light pink
  [1.0, 0.92, 0.94],    // Pale pink
  [1.0, 1.0, 1.0],      // White petal
];

const FOLD_COLORS: [number, number, number][] = [
  [0.95, 0.90, 0.80],   // Paper cream
  [0.98, 0.95, 0.88],   // Warm white
  [0.92, 0.85, 0.75],   // Aged paper
];

const SPARKLE_COLORS: [number, number, number][] = [
  [1.0, 0.98, 0.90],    // Warm white
  [1.0, 0.95, 0.80],    // Gold tint
  [0.95, 0.92, 0.88],   // Pearl
];

const WIND_COLORS: [number, number, number][] = [
  [0.9, 0.92, 0.95],    // Sky mist
  [0.95, 0.95, 0.98],   // Light air
  [0.88, 0.90, 0.95],   // Cool breeze
];

const VICTORY_COLORS: [number, number, number][] = [
  [1.0, 0.85, 0.88],    // Sakura pink
  [1.0, 0.92, 0.70],    // Gold
  [0.95, 0.88, 0.90],   // Blush
  [1.0, 1.0, 0.98],     // White
  [0.98, 0.80, 0.85],   // Deep pink
  [0.90, 0.95, 0.92],   // Pale jade
];

export class ParticleSystem {
  private particles: Particle[] = [];
  private maxParticles: number;

  constructor(maxParticles: number = 500) {
    this.maxParticles = maxParticles;
  }

  // Emit cherry blossom petals
  emitPetal(): void {
    if (this.particles.length >= this.maxParticles) return;
    if (Math.random() > 0.02) return;

    const color = PETAL_COLORS[Math.floor(Math.random() * PETAL_COLORS.length)];

    // Start from edges, primarily top
    const startFromTop = Math.random() > 0.3;
    const x = startFromTop ? Math.random() : (Math.random() > 0.5 ? 0 : 1);
    const y = startFromTop ? 1 : Math.random();

    this.particles.push({
      x,
      y,
      vx: randomRange(-0.003, 0.003) + 0.001, // Slight rightward drift
      vy: randomRange(-0.008, -0.004), // Falling
      life: randomRange(4.0, 8.0),
      maxLife: randomRange(4.0, 8.0),
      size: randomRange(0.015, 0.025),
      type: 'petal',
      color: [...color, randomRange(0.6, 0.9)],
    });
  }

  // Emit fold crease effect
  emitFold(x: number, y: number): void {
    const count = 12;

    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const angle = (i / count) * Math.PI * 2;
      const speed = randomRange(0.01, 0.03);
      const color = FOLD_COLORS[Math.floor(Math.random() * FOLD_COLORS.length)];

      this.particles.push({
        x: x + randomRange(-0.02, 0.02),
        y: y + randomRange(-0.02, 0.02),
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: randomRange(0.3, 0.5),
        maxLife: randomRange(0.3, 0.5),
        size: randomRange(0.008, 0.015),
        type: 'fold',
        color: [...color, 0.9],
      });
    }

    // Central glow
    this.particles.push({
      x,
      y,
      vx: 0,
      vy: 0,
      life: 0.4,
      maxLife: 0.4,
      size: 0.06,
      type: 'fold',
      color: [1.0, 0.98, 0.92, 0.7],
    });
  }

  // Emit gentle sparkle on paper
  emitSparkle(x: number, y: number): void {
    const count = 5;

    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const color = SPARKLE_COLORS[Math.floor(Math.random() * SPARKLE_COLORS.length)];

      this.particles.push({
        x: x + randomRange(-0.05, 0.05),
        y: y + randomRange(-0.05, 0.05),
        vx: randomRange(-0.002, 0.002),
        vy: randomRange(-0.002, 0.002),
        life: randomRange(0.5, 0.8),
        maxLife: randomRange(0.5, 0.8),
        size: randomRange(0.008, 0.012),
        type: 'sparkle',
        color: [...color, 0.8],
      });
    }
  }

  // Emit wind/breeze particles
  emitWind(): void {
    if (this.particles.length >= this.maxParticles) return;
    if (Math.random() > 0.05) return;

    const color = WIND_COLORS[Math.floor(Math.random() * WIND_COLORS.length)];

    this.particles.push({
      x: 0,
      y: randomRange(0.3, 0.8),
      vx: randomRange(0.01, 0.02),
      vy: randomRange(-0.002, 0.002),
      life: randomRange(2.0, 4.0),
      maxLife: randomRange(2.0, 4.0),
      size: randomRange(0.02, 0.04),
      type: 'wind',
      color: [...color, randomRange(0.2, 0.4)],
    });
  }

  // Emit paper plane launch effect
  emitLaunch(x: number, y: number): void {
    const count = 20;

    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const angle = randomRange(-Math.PI / 4, Math.PI / 4) - Math.PI / 6; // Upward right
      const speed = randomRange(0.03, 0.06);
      const color = PETAL_COLORS[Math.floor(Math.random() * PETAL_COLORS.length)];

      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: randomRange(0.8, 1.2),
        maxLife: randomRange(0.8, 1.2),
        size: randomRange(0.012, 0.02),
        type: 'petal',
        color: [...color, 0.9],
      });
    }
  }

  // Emit victory celebration
  emitVictory(x: number, y: number): void {
    const count = 50;

    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const angle = randomRange(0, Math.PI * 2);
      const speed = randomRange(0.02, 0.08);
      const color = VICTORY_COLORS[Math.floor(Math.random() * VICTORY_COLORS.length)];

      this.particles.push({
        x: x + randomRange(-0.1, 0.1),
        y: y + randomRange(-0.1, 0.1),
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 0.01,
        life: randomRange(2.0, 3.5),
        maxLife: randomRange(2.0, 3.5),
        size: randomRange(0.015, 0.03),
        type: 'victory',
        color: [...color, 0.9],
      });
    }

    // Extra petals burst
    for (let i = 0; i < 30; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const angle = randomRange(0, Math.PI * 2);
      const speed = randomRange(0.03, 0.06);
      const color = PETAL_COLORS[Math.floor(Math.random() * PETAL_COLORS.length)];

      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: randomRange(1.5, 2.5),
        maxLife: randomRange(1.5, 2.5),
        size: randomRange(0.02, 0.035),
        type: 'petal',
        color: [...color, 0.9],
      });
    }
  }

  // Emit undo effect
  emitUndo(x: number, y: number): void {
    const count = 8;

    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const angle = (i / count) * Math.PI * 2;
      const speed = randomRange(0.02, 0.04);

      // Converging particles (reverse effect)
      this.particles.push({
        x: x + Math.cos(angle) * 0.08,
        y: y + Math.sin(angle) * 0.08,
        vx: -Math.cos(angle) * speed,
        vy: -Math.sin(angle) * speed,
        life: randomRange(0.3, 0.5),
        maxLife: randomRange(0.3, 0.5),
        size: randomRange(0.01, 0.015),
        type: 'fold',
        color: [0.9, 0.85, 0.8, 0.8],
      });
    }
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
        case 'petal':
          // Gentle falling with sway
          p.vx += Math.sin(p.life * 3 + p.x * 10) * 0.00008;
          p.vy += 0.00002; // Slight downward acceleration
          p.vx *= 0.995;
          p.vy *= 0.995;
          break;

        case 'fold':
          // Quick fade and slow
          p.vx *= 0.92;
          p.vy *= 0.92;
          break;

        case 'sparkle':
          // Gentle float
          p.vx += Math.sin(p.life * 5) * 0.00003;
          p.vy += Math.cos(p.life * 4) * 0.00003;
          p.vx *= 0.98;
          p.vy *= 0.98;
          break;

        case 'wind':
          // Horizontal drift with wave
          p.vy += Math.sin(p.life * 2 + p.x * 10) * 0.0001;
          p.vx *= 0.995;
          break;

        case 'victory':
          // Gentle gravity and flutter
          p.vy += 0.0005;
          p.vx *= 0.99;
          p.vx += Math.sin(p.life * 8) * 0.0002;
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
