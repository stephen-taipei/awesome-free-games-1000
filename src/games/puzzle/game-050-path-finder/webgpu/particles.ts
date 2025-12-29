/**
 * Particle System - Path Finder
 * Neon Circuit / Electronic Data Flow Theme
 * Game #050
 */

import { clamp, randomRange } from './math';

// Particle types for circuit theme
export type ParticleType =
  | 'signal'    // Data signal moving
  | 'route'     // Path trace effect
  | 'pulse'     // Connection pulse
  | 'victory'   // Victory celebration
  | 'ambient';  // Background circuit activity

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
  signal: 0,
  route: 1,
  pulse: 2,
  victory: 3,
  ambient: 4,
};

// Neon circuit color palette
const SIGNAL_COLORS: [number, number, number][] = [
  [0.0, 0.9, 1.0],    // Cyan
  [0.2, 0.8, 1.0],    // Light cyan
  [0.0, 1.0, 0.8],    // Teal
  [0.3, 0.7, 1.0],    // Sky blue
];

const ROUTE_COLORS: [number, number, number][] = [
  [0.3, 1.0, 0.4],    // Neon green
  [0.4, 0.9, 0.5],    // Light green
  [0.2, 0.8, 0.3],    // Emerald
  [0.5, 1.0, 0.6],    // Mint
];

const PULSE_COLORS: [number, number, number][] = [
  [0.6, 0.4, 1.0],    // Purple
  [0.5, 0.3, 0.9],    // Violet
  [0.7, 0.5, 1.0],    // Lavender
  [0.4, 0.2, 0.8],    // Deep purple
];

const VICTORY_COLORS: [number, number, number][] = [
  [1.0, 0.9, 0.3],    // Gold
  [0.0, 1.0, 0.9],    // Cyan
  [0.5, 1.0, 0.5],    // Green
  [1.0, 0.5, 0.8],    // Pink
  [1.0, 1.0, 1.0],    // White
];

const AMBIENT_COLORS: [number, number, number][] = [
  [0.0, 0.5, 0.6],    // Dark cyan
  [0.2, 0.4, 0.5],    // Steel blue
  [0.1, 0.3, 0.4],    // Dark teal
  [0.3, 0.5, 0.6],    // Slate
];

export class ParticleSystem {
  private particles: Particle[] = [];
  private maxParticles: number;

  constructor(maxParticles: number = 500) {
    this.maxParticles = maxParticles;
  }

  // Emit ambient circuit activity
  emitAmbient(): void {
    if (this.particles.length >= this.maxParticles) return;
    if (Math.random() > 0.02) return;

    const color = AMBIENT_COLORS[Math.floor(Math.random() * AMBIENT_COLORS.length)];

    this.particles.push({
      x: Math.random(),
      y: Math.random(),
      vx: randomRange(-0.002, 0.002),
      vy: randomRange(-0.002, 0.002),
      life: randomRange(2.0, 4.0),
      maxLife: randomRange(2.0, 4.0),
      size: randomRange(0.004, 0.008),
      type: 'ambient',
      color: [...color, randomRange(0.3, 0.5)],
    });
  }

  // Emit signal at point
  emitSignal(x: number, y: number): void {
    const count = 6;
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.3;
      const speed = randomRange(0.03, 0.06);
      const color = SIGNAL_COLORS[Math.floor(Math.random() * SIGNAL_COLORS.length)];

      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: randomRange(0.3, 0.5),
        maxLife: randomRange(0.3, 0.5),
        size: randomRange(0.012, 0.02),
        type: 'signal',
        color: [...color, 1.0],
      });
    }
  }

  // Emit route trace when path is drawn
  emitRoute(x: number, y: number): void {
    if (this.particles.length >= this.maxParticles) return;
    if (Math.random() > 0.4) return;

    const color = ROUTE_COLORS[Math.floor(Math.random() * ROUTE_COLORS.length)];

    this.particles.push({
      x,
      y,
      vx: randomRange(-0.008, 0.008),
      vy: randomRange(-0.008, 0.008),
      life: randomRange(0.4, 0.7),
      maxLife: randomRange(0.4, 0.7),
      size: randomRange(0.01, 0.018),
      type: 'route',
      color: [...color, 0.9],
    });
  }

  // Emit pulse when path advances
  emitPulse(x: number, y: number): void {
    if (this.particles.length >= this.maxParticles) return;

    const color = PULSE_COLORS[Math.floor(Math.random() * PULSE_COLORS.length)];

    this.particles.push({
      x,
      y,
      vx: 0,
      vy: 0,
      life: 0.5,
      maxLife: 0.5,
      size: 0.08,
      type: 'pulse',
      color: [...color, 0.8],
    });
  }

  // Emit goal reached effect
  emitGoal(x: number, y: number): void {
    const count = 12;
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const angle = (i / count) * Math.PI * 2;
      const speed = randomRange(0.04, 0.08);
      const color = ROUTE_COLORS[Math.floor(Math.random() * ROUTE_COLORS.length)];

      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: randomRange(0.5, 0.8),
        maxLife: randomRange(0.5, 0.8),
        size: randomRange(0.015, 0.025),
        type: 'signal',
        color: [...color, 1.0],
      });
    }

    // Central pulse
    this.particles.push({
      x,
      y,
      vx: 0,
      vy: 0,
      life: 0.6,
      maxLife: 0.6,
      size: 0.12,
      type: 'pulse',
      color: [0.3, 1.0, 0.5, 1.0],
    });
  }

  // Emit victory celebration
  emitVictory(x: number, y: number): void {
    const count = 60;
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const angle = randomRange(0, Math.PI * 2);
      const speed = randomRange(0.03, 0.12);
      const color = VICTORY_COLORS[Math.floor(Math.random() * VICTORY_COLORS.length)];

      this.particles.push({
        x: x + randomRange(-0.1, 0.1),
        y: y + randomRange(-0.1, 0.1),
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: randomRange(1.5, 2.5),
        maxLife: randomRange(1.5, 2.5),
        size: randomRange(0.012, 0.025),
        type: 'victory',
        color: [...color, 1.0],
      });
    }
  }

  // Emit start point highlight
  emitStart(x: number, y: number): void {
    const count = 8;
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const angle = (i / count) * Math.PI * 2;
      const speed = randomRange(0.02, 0.04);
      const color = ROUTE_COLORS[0]; // Green

      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: randomRange(0.4, 0.6),
        maxLife: randomRange(0.4, 0.6),
        size: randomRange(0.01, 0.018),
        type: 'signal',
        color: [...color, 1.0],
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
        case 'signal':
          p.vx *= 0.92;
          p.vy *= 0.92;
          // Electric jitter
          p.vx += (Math.random() - 0.5) * 0.002;
          p.vy += (Math.random() - 0.5) * 0.002;
          break;
        case 'route':
          p.vx *= 0.95;
          p.vy *= 0.95;
          break;
        case 'pulse':
          // Pulse expands
          p.size += dt * 0.2;
          break;
        case 'victory':
          p.vy += 0.0003; // Slight gravity
          p.vx *= 0.99;
          // Electric flicker movement
          p.vx += Math.sin(p.life * 15) * 0.0003;
          break;
        case 'ambient':
          // Gentle drift with circuit-like movement
          if (Math.random() < 0.05) {
            // Random direction change (circuit routing)
            if (Math.random() < 0.5) {
              p.vx = randomRange(-0.003, 0.003);
              p.vy = 0;
            } else {
              p.vx = 0;
              p.vy = randomRange(-0.003, 0.003);
            }
          }
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
