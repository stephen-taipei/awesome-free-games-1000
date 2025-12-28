/**
 * Particle System - Word Guess
 * Secret Agent / Spy Decoder Theme
 * Game #048
 */

import { clamp, randomRange } from './math';

// Particle types for spy theme
export type ParticleType =
  | 'code'      // Matrix rain code
  | 'decrypt'   // Letter decryption sparkle
  | 'victory'   // Mission complete burst
  | 'ambient'   // Scanning dots
  | 'pulse';    // Submit pulse wave

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
  code: 0,
  decrypt: 1,
  victory: 2,
  ambient: 3,
  pulse: 4,
};

// Matrix green color palette
const CODE_COLORS: [number, number, number][] = [
  [0.0, 1.0, 0.4],    // Bright green
  [0.0, 0.8, 0.3],    // Matrix green
  [0.2, 1.0, 0.5],    // Light green
  [0.0, 0.6, 0.2],    // Dark green
];

const DECRYPT_COLORS: [number, number, number][] = [
  [0.0, 1.0, 0.8],    // Cyan
  [0.3, 1.0, 1.0],    // Light cyan
  [0.0, 0.9, 0.6],    // Teal
  [1.0, 1.0, 1.0],    // White flash
];

const VICTORY_COLORS: [number, number, number][] = [
  [0.0, 1.0, 0.5],    // Green
  [0.0, 0.8, 1.0],    // Cyan
  [0.5, 1.0, 0.0],    // Lime
  [0.0, 1.0, 1.0],    // Aqua
  [1.0, 1.0, 0.0],    // Yellow
];

const AMBIENT_COLORS: [number, number, number][] = [
  [0.0, 0.6, 0.4],    // Dark teal
  [0.0, 0.5, 0.3],    // Dark green
  [0.1, 0.4, 0.5],    // Dark cyan
];

export class ParticleSystem {
  private particles: Particle[] = [];
  private maxParticles: number;

  constructor(maxParticles: number = 500) {
    this.maxParticles = maxParticles;
  }

  // Emit code rain particles
  emitCode(x: number, y: number): void {
    const count = 5;
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const color = CODE_COLORS[Math.floor(Math.random() * CODE_COLORS.length)];

      this.particles.push({
        x: x + randomRange(-0.02, 0.02),
        y: y,
        vx: 0,
        vy: randomRange(0.03, 0.06),
        life: randomRange(0.5, 1.0),
        maxLife: randomRange(0.5, 1.0),
        size: randomRange(0.01, 0.02),
        type: 'code',
        color: [...color, randomRange(0.6, 1.0)],
      });
    }
  }

  // Emit decryption sparkle
  emitDecrypt(x: number, y: number): void {
    const count = 12;
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.5;
      const speed = randomRange(0.02, 0.06);
      const color = DECRYPT_COLORS[Math.floor(Math.random() * DECRYPT_COLORS.length)];

      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: randomRange(0.3, 0.6),
        maxLife: randomRange(0.3, 0.6),
        size: randomRange(0.01, 0.025),
        type: 'decrypt',
        color: [...color, 1.0],
      });
    }
  }

  // Emit correct letter reveal
  emitCorrect(x: number, y: number): void {
    const count = 15;
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const angle = (i / count) * Math.PI * 2;
      const speed = randomRange(0.03, 0.08);
      const color = VICTORY_COLORS[Math.floor(Math.random() * VICTORY_COLORS.length)];

      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: randomRange(0.5, 0.8),
        maxLife: randomRange(0.5, 0.8),
        size: randomRange(0.015, 0.03),
        type: 'decrypt',
        color: [...color, 1.0],
      });
    }
  }

  // Emit victory celebration
  emitVictory(x: number, y: number): void {
    const count = 50;
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const angle = randomRange(0, Math.PI * 2);
      const speed = randomRange(0.03, 0.1);
      const color = VICTORY_COLORS[Math.floor(Math.random() * VICTORY_COLORS.length)];

      this.particles.push({
        x: x + randomRange(-0.1, 0.1),
        y: y + randomRange(-0.05, 0.05),
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

  // Emit ambient scanning dots
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
      size: randomRange(0.005, 0.01),
      type: 'ambient',
      color: [...color, randomRange(0.3, 0.5)],
    });
  }

  // Emit submit pulse
  emitPulse(x: number, y: number): void {
    if (this.particles.length >= this.maxParticles) return;

    this.particles.push({
      x,
      y,
      vx: 0,
      vy: 0,
      life: 0.8,
      maxLife: 0.8,
      size: 0.15,
      type: 'pulse',
      color: [0.0, 1.0, 0.5, 0.8],
    });
  }

  // Emit error shake effect
  emitError(x: number, y: number): void {
    const count = 8;
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const angle = (i / count) * Math.PI * 2;
      const speed = randomRange(0.02, 0.04);

      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: randomRange(0.3, 0.5),
        maxLife: randomRange(0.3, 0.5),
        size: randomRange(0.008, 0.015),
        type: 'code',
        color: [1.0, 0.3, 0.2, 0.8],
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
        case 'code':
          // Fall straight down
          p.vx *= 0.98;
          break;
        case 'decrypt':
          p.vx *= 0.95;
          p.vy *= 0.95;
          break;
        case 'victory':
          p.vy += 0.001; // Slight gravity
          p.vx *= 0.99;
          break;
        case 'ambient':
          // Gentle drift
          p.vx += (Math.random() - 0.5) * 0.0001;
          p.vy += (Math.random() - 0.5) * 0.0001;
          break;
        case 'pulse':
          // Expand
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
