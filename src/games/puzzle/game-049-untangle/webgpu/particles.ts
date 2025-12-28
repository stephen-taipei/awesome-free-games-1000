/**
 * Particle System - Untangle
 * Constellation / Star Map Theme
 * Game #049
 */

import { clamp, randomRange } from './math';

// Particle types for constellation theme
export type ParticleType =
  | 'stardust'  // Ambient floating particles
  | 'spark'     // Node interaction
  | 'nova'      // Crossing resolved
  | 'victory'   // Constellation complete
  | 'pulse';    // Connection glow

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
  stardust: 0,
  spark: 1,
  nova: 2,
  victory: 3,
  pulse: 4,
};

// Stellar color palette
const STARDUST_COLORS: [number, number, number][] = [
  [0.9, 0.95, 1.0],    // White-blue
  [1.0, 0.98, 0.9],    // Warm white
  [0.8, 0.85, 1.0],    // Cool blue
  [0.95, 0.9, 1.0],    // Lavender
];

const SPARK_COLORS: [number, number, number][] = [
  [0.4, 0.8, 1.0],     // Cyan
  [0.5, 0.7, 1.0],     // Light blue
  [0.3, 0.9, 0.8],     // Teal
  [0.6, 0.6, 1.0],     // Purple-blue
];

const NOVA_COLORS: [number, number, number][] = [
  [0.0, 0.8, 0.6],     // Teal (resolved)
  [0.2, 1.0, 0.7],     // Mint
  [0.4, 1.0, 0.9],     // Cyan
  [0.0, 1.0, 0.5],     // Green
];

const VICTORY_COLORS: [number, number, number][] = [
  [1.0, 0.9, 0.4],     // Gold
  [0.4, 0.8, 1.0],     // Sky blue
  [1.0, 0.7, 0.9],     // Pink
  [0.6, 1.0, 0.8],     // Mint
  [1.0, 1.0, 1.0],     // White
];

export class ParticleSystem {
  private particles: Particle[] = [];
  private maxParticles: number;

  constructor(maxParticles: number = 500) {
    this.maxParticles = maxParticles;
  }

  // Emit stardust ambient particles
  emitStardust(): void {
    if (this.particles.length >= this.maxParticles) return;
    if (Math.random() > 0.015) return;

    const color = STARDUST_COLORS[Math.floor(Math.random() * STARDUST_COLORS.length)];

    this.particles.push({
      x: Math.random(),
      y: Math.random(),
      vx: randomRange(-0.001, 0.001),
      vy: randomRange(-0.001, 0.001),
      life: randomRange(3.0, 6.0),
      maxLife: randomRange(3.0, 6.0),
      size: randomRange(0.003, 0.008),
      type: 'stardust',
      color: [...color, randomRange(0.3, 0.6)],
    });
  }

  // Emit sparks when node is grabbed
  emitSpark(x: number, y: number): void {
    const count = 8;
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.5;
      const speed = randomRange(0.02, 0.05);
      const color = SPARK_COLORS[Math.floor(Math.random() * SPARK_COLORS.length)];

      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: randomRange(0.3, 0.5),
        maxLife: randomRange(0.3, 0.5),
        size: randomRange(0.01, 0.02),
        type: 'spark',
        color: [...color, 1.0],
      });
    }
  }

  // Emit nova when crossing is resolved
  emitNova(x: number, y: number): void {
    const count = 15;
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const angle = (i / count) * Math.PI * 2;
      const speed = randomRange(0.03, 0.07);
      const color = NOVA_COLORS[Math.floor(Math.random() * NOVA_COLORS.length)];

      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: randomRange(0.4, 0.7),
        maxLife: randomRange(0.4, 0.7),
        size: randomRange(0.015, 0.025),
        type: 'nova',
        color: [...color, 1.0],
      });
    }

    // Central burst
    this.particles.push({
      x,
      y,
      vx: 0,
      vy: 0,
      life: 0.5,
      maxLife: 0.5,
      size: 0.08,
      type: 'nova',
      color: [1.0, 1.0, 1.0, 0.8],
    });
  }

  // Emit trail when node is moving
  emitTrail(x: number, y: number): void {
    if (this.particles.length >= this.maxParticles) return;
    if (Math.random() > 0.3) return;

    const color = SPARK_COLORS[Math.floor(Math.random() * SPARK_COLORS.length)];

    this.particles.push({
      x,
      y,
      vx: randomRange(-0.005, 0.005),
      vy: randomRange(-0.005, 0.005),
      life: randomRange(0.3, 0.6),
      maxLife: randomRange(0.3, 0.6),
      size: randomRange(0.008, 0.015),
      type: 'stardust',
      color: [...color, 0.7],
    });
  }

  // Emit victory constellation celebration
  emitVictory(x: number, y: number): void {
    const count = 50;
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const angle = randomRange(0, Math.PI * 2);
      const speed = randomRange(0.02, 0.1);
      const color = VICTORY_COLORS[Math.floor(Math.random() * VICTORY_COLORS.length)];

      this.particles.push({
        x: x + randomRange(-0.1, 0.1),
        y: y + randomRange(-0.1, 0.1),
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 0.01,
        life: randomRange(1.5, 3.0),
        maxLife: randomRange(1.5, 3.0),
        size: randomRange(0.01, 0.025),
        type: 'victory',
        color: [...color, 1.0],
      });
    }
  }

  // Emit pulse along connection
  emitPulse(x: number, y: number): void {
    if (this.particles.length >= this.maxParticles) return;

    this.particles.push({
      x,
      y,
      vx: 0,
      vy: 0,
      life: 0.6,
      maxLife: 0.6,
      size: 0.1,
      type: 'pulse',
      color: [0.4, 0.8, 1.0, 0.6],
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
        case 'stardust':
          // Gentle drift with slight oscillation
          p.vx += Math.sin(p.life * 3) * 0.00005;
          p.vy += Math.cos(p.life * 2) * 0.00005;
          break;
        case 'spark':
          p.vx *= 0.94;
          p.vy *= 0.94;
          break;
        case 'nova':
          p.vx *= 0.96;
          p.vy *= 0.96;
          break;
        case 'victory':
          p.vy += 0.0005; // Slight gravity
          p.vx *= 0.99;
          // Gentle wobble
          p.vx += Math.sin(p.life * 8) * 0.0002;
          break;
        case 'pulse':
          // Expand
          p.size += dt * 0.15;
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
