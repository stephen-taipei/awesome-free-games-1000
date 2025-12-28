/**
 * Particle System - Stack Puzzle
 * Building Construction / Skyscraper Theme
 * Game #045
 */

import { clamp, randomRange } from './math';

// Particle types for construction theme
export type ParticleType =
  | 'dust'      // Concrete dust from block landing
  | 'spark'     // Welding sparks
  | 'victory'   // Hard hat confetti
  | 'ambient'   // Floating debris
  | 'impact';   // Shockwave ring

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
  spark: 1,
  victory: 2,
  ambient: 3,
  impact: 4,
};

// Construction color palette
const DUST_COLORS: [number, number, number][] = [
  [0.75, 0.72, 0.68], // Concrete gray
  [0.82, 0.78, 0.73], // Light concrete
  [0.65, 0.62, 0.58], // Dark concrete
  [0.70, 0.65, 0.55], // Sand
];

const SPARK_COLORS: [number, number, number][] = [
  [1.0, 0.8, 0.2],    // Yellow spark
  [1.0, 0.6, 0.1],    // Orange spark
  [1.0, 1.0, 0.8],    // White hot
  [1.0, 0.4, 0.1],    // Red spark
];

const VICTORY_COLORS: [number, number, number][] = [
  [1.0, 0.6, 0.1],    // Safety orange
  [1.0, 0.9, 0.2],    // Yellow
  [0.2, 0.5, 0.9],    // Blueprint blue
  [0.9, 0.9, 0.9],    // White
  [0.8, 0.7, 0.3],    // Gold
];

const AMBIENT_COLORS: [number, number, number][] = [
  [0.6, 0.55, 0.5],   // Construction dust
  [0.7, 0.65, 0.6],   // Light debris
  [0.5, 0.48, 0.45],  // Dark particle
];

export class ParticleSystem {
  private particles: Particle[] = [];
  private maxParticles: number;

  constructor(maxParticles: number = 500) {
    this.maxParticles = maxParticles;
  }

  // Emit concrete dust when block lands
  emitDust(x: number, y: number, intensity: number = 1): void {
    const count = Math.floor(15 * intensity);
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const angle = (Math.random() * Math.PI) + Math.PI; // Upward spread
      const speed = randomRange(0.02, 0.08) * intensity;
      const color = DUST_COLORS[Math.floor(Math.random() * DUST_COLORS.length)];

      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed * randomRange(0.5, 1.5),
        vy: Math.sin(angle) * speed,
        life: randomRange(0.8, 1.5),
        maxLife: randomRange(0.8, 1.5),
        size: randomRange(0.015, 0.035) * intensity,
        type: 'dust',
        color: [...color, randomRange(0.4, 0.8)],
      });
    }
  }

  // Emit welding sparks
  emitSpark(x: number, y: number): void {
    const count = 12;
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const angle = randomRange(-Math.PI * 0.8, -Math.PI * 0.2); // Downward arc
      const speed = randomRange(0.05, 0.15);
      const color = SPARK_COLORS[Math.floor(Math.random() * SPARK_COLORS.length)];

      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: randomRange(0.3, 0.6),
        maxLife: randomRange(0.3, 0.6),
        size: randomRange(0.008, 0.02),
        type: 'spark',
        color: [...color, 1.0],
      });
    }
  }

  // Emit hard hat confetti for victory
  emitVictory(x: number, y: number): void {
    const count = 50;
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const angle = randomRange(-Math.PI * 0.9, -Math.PI * 0.1);
      const speed = randomRange(0.03, 0.12);
      const color = VICTORY_COLORS[Math.floor(Math.random() * VICTORY_COLORS.length)];

      this.particles.push({
        x: x + randomRange(-0.1, 0.1),
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 0.02,
        life: randomRange(2.0, 4.0),
        maxLife: randomRange(2.0, 4.0),
        size: randomRange(0.015, 0.03),
        type: 'victory',
        color: [...color, 1.0],
      });
    }
  }

  // Emit ambient floating debris
  emitAmbient(canvasWidth: number): void {
    if (this.particles.length >= this.maxParticles) return;
    if (Math.random() > 0.03) return;

    const color = AMBIENT_COLORS[Math.floor(Math.random() * AMBIENT_COLORS.length)];

    this.particles.push({
      x: Math.random(),
      y: 1.1,
      vx: randomRange(-0.002, 0.002),
      vy: randomRange(-0.005, -0.015),
      life: randomRange(3.0, 6.0),
      maxLife: randomRange(3.0, 6.0),
      size: randomRange(0.004, 0.012),
      type: 'ambient',
      color: [...color, randomRange(0.2, 0.4)],
    });
  }

  // Emit impact shockwave
  emitImpact(x: number, y: number): void {
    if (this.particles.length >= this.maxParticles) return;

    this.particles.push({
      x,
      y,
      vx: 0,
      vy: 0,
      life: 0.5,
      maxLife: 0.5,
      size: 0.15,
      type: 'impact',
      color: [1.0, 0.8, 0.4, 0.6],
    });
  }

  update(dt: number): void {
    const gravity = 0.08;

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
        case 'spark':
          p.vy += gravity * dt * 1.5;
          p.vx *= 0.96;
          break;
        case 'victory':
          p.vy += gravity * dt * 0.5;
          p.vx *= 0.995;
          // Tumbling motion
          p.vx += Math.sin(p.life * 10) * 0.001;
          break;
        case 'ambient':
          p.vx += Math.sin(p.life * 2) * 0.0002;
          break;
        case 'impact':
          // Ring expands
          p.size += dt * 0.3;
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
