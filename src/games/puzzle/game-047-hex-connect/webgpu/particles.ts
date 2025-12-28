/**
 * Particle System - Hex Connect
 * Crystal Honeycomb / Prismatic Gem Theme
 * Game #047
 */

import { clamp, randomRange } from './math';

// Particle types for crystal theme
export type ParticleType =
  | 'crystal'   // Crystal dust from rotation
  | 'spark'     // Prismatic spark
  | 'victory'   // Gem confetti
  | 'ambient'   // Floating motes
  | 'pulse';    // Energy pulse ring

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
  crystal: 0,
  spark: 1,
  victory: 2,
  ambient: 3,
  pulse: 4,
};

// Prismatic color palette
const CRYSTAL_COLORS: [number, number, number][] = [
  [0.9, 0.7, 1.0],    // Light purple
  [0.7, 0.8, 1.0],    // Light blue
  [0.8, 1.0, 0.9],    // Light cyan
  [1.0, 0.8, 0.9],    // Light pink
];

const SPARK_COLORS: [number, number, number][] = [
  [1.0, 0.4, 0.8],    // Magenta
  [0.4, 0.8, 1.0],    // Cyan
  [0.8, 0.4, 1.0],    // Purple
  [1.0, 0.9, 0.4],    // Yellow
  [0.4, 1.0, 0.7],    // Mint
];

const VICTORY_COLORS: [number, number, number][] = [
  [1.0, 0.3, 0.5],    // Ruby
  [0.3, 0.8, 1.0],    // Sapphire
  [0.4, 1.0, 0.5],    // Emerald
  [1.0, 0.8, 0.2],    // Topaz
  [0.9, 0.5, 1.0],    // Amethyst
  [1.0, 1.0, 0.9],    // Diamond
];

const AMBIENT_COLORS: [number, number, number][] = [
  [0.6, 0.5, 0.8],    // Soft purple
  [0.5, 0.6, 0.8],    // Soft blue
  [0.7, 0.6, 0.9],    // Soft violet
];

export class ParticleSystem {
  private particles: Particle[] = [];
  private maxParticles: number;

  constructor(maxParticles: number = 500) {
    this.maxParticles = maxParticles;
  }

  // Emit crystal dust when hex rotates
  emitCrystal(x: number, y: number): void {
    const count = 8;
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.5;
      const speed = randomRange(0.02, 0.05);
      const color = CRYSTAL_COLORS[Math.floor(Math.random() * CRYSTAL_COLORS.length)];

      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: randomRange(0.4, 0.8),
        maxLife: randomRange(0.4, 0.8),
        size: randomRange(0.015, 0.03),
        type: 'crystal',
        color: [...color, randomRange(0.6, 0.9)],
      });
    }
  }

  // Emit prismatic sparks
  emitSpark(x: number, y: number): void {
    const count = 5;
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const angle = Math.random() * Math.PI * 2;
      const speed = randomRange(0.03, 0.08);
      const color = SPARK_COLORS[Math.floor(Math.random() * SPARK_COLORS.length)];

      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 0.02,
        life: randomRange(0.3, 0.5),
        maxLife: randomRange(0.3, 0.5),
        size: randomRange(0.01, 0.02),
        type: 'spark',
        color: [...color, 1.0],
      });
    }
  }

  // Emit gem confetti for victory
  emitVictory(x: number, y: number): void {
    const count = 45;
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const angle = randomRange(-Math.PI * 0.9, -Math.PI * 0.1);
      const speed = randomRange(0.04, 0.12);
      const color = VICTORY_COLORS[Math.floor(Math.random() * VICTORY_COLORS.length)];

      this.particles.push({
        x: x + randomRange(-0.1, 0.1),
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 0.02,
        life: randomRange(2.0, 3.5),
        maxLife: randomRange(2.0, 3.5),
        size: randomRange(0.015, 0.028),
        type: 'victory',
        color: [...color, 1.0],
      });
    }
  }

  // Emit ambient floating motes
  emitAmbient(): void {
    if (this.particles.length >= this.maxParticles) return;
    if (Math.random() > 0.03) return;

    const color = AMBIENT_COLORS[Math.floor(Math.random() * AMBIENT_COLORS.length)];

    this.particles.push({
      x: Math.random(),
      y: 1.1,
      vx: randomRange(-0.002, 0.002),
      vy: randomRange(-0.008, -0.015),
      life: randomRange(4.0, 7.0),
      maxLife: randomRange(4.0, 7.0),
      size: randomRange(0.005, 0.012),
      type: 'ambient',
      color: [...color, randomRange(0.2, 0.4)],
    });
  }

  // Emit energy pulse ring
  emitPulse(x: number, y: number): void {
    if (this.particles.length >= this.maxParticles) return;

    this.particles.push({
      x,
      y,
      vx: 0,
      vy: 0,
      life: 0.6,
      maxLife: 0.6,
      size: 0.12,
      type: 'pulse',
      color: [0.8, 0.5, 1.0, 0.7],
    });
  }

  // Emit connection made effect
  emitConnection(x: number, y: number): void {
    // Sparks along connection
    const count = 6;
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const angle = Math.random() * Math.PI * 2;
      const speed = randomRange(0.02, 0.04);
      const color = SPARK_COLORS[Math.floor(Math.random() * SPARK_COLORS.length)];

      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: randomRange(0.3, 0.5),
        maxLife: randomRange(0.3, 0.5),
        size: randomRange(0.008, 0.015),
        type: 'spark',
        color: [...color, 0.9],
      });
    }

    // Energy pulse
    this.emitPulse(x, y);
  }

  update(dt: number): void {
    const gravity = 0.03;

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;

      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      // Type-specific physics
      switch (p.type) {
        case 'crystal':
          p.vx *= 0.96;
          p.vy *= 0.96;
          break;
        case 'spark':
          p.vy += gravity * dt * 0.5;
          p.vx *= 0.97;
          break;
        case 'victory':
          p.vy += gravity * dt * 0.8;
          p.vx *= 0.995;
          // Tumbling
          p.vx += Math.sin(p.life * 10) * 0.0003;
          break;
        case 'ambient':
          p.vx += Math.sin(p.life * 2) * 0.00008;
          p.vy += Math.cos(p.life * 3) * 0.00005;
          break;
        case 'pulse':
          // Expand
          p.size += dt * 0.25;
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
