/**
 * Particle System - Matchstick Puzzle
 * Cozy Fireplace / Log Cabin Night Theme
 * Game #040
 */

import { randomRange, clamp } from './math';

export type ParticleType = 'ember' | 'spark' | 'victory' | 'ambient' | 'smoke';

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

// Cozy Fireplace color palette
const colors = {
  emberOrange: [1.0, 0.5, 0.15, 1.0] as [number, number, number, number],
  emberYellow: [1.0, 0.8, 0.3, 1.0] as [number, number, number, number],
  flameRed: [1.0, 0.3, 0.1, 1.0] as [number, number, number, number],
  sparkWhite: [1.0, 0.95, 0.8, 1.0] as [number, number, number, number],
  sparkYellow: [1.0, 0.9, 0.5, 1.0] as [number, number, number, number],
  ashGray: [0.5, 0.45, 0.4, 1.0] as [number, number, number, number],
  smokeGray: [0.3, 0.28, 0.26, 0.6] as [number, number, number, number],
  warmGlow: [1.0, 0.7, 0.4, 1.0] as [number, number, number, number],
};

const particleTypeMap: Record<ParticleType, number> = {
  ember: 0,
  spark: 1,
  victory: 2,
  ambient: 3,
  smoke: 4,
};

export class ParticleSystem {
  private particles: Particle[] = [];
  private maxParticles = 500;

  update(deltaTime: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= deltaTime;

      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      // Update position
      p.x += p.vx * deltaTime;
      p.y += p.vy * deltaTime;

      // Type-specific behavior
      switch (p.type) {
        case 'ember':
          // Hot embers rise and sway
          p.vy -= 0.15 * deltaTime; // Float up
          p.vx += (Math.random() - 0.5) * 0.1 * deltaTime; // Sway
          p.vx *= 0.98;
          p.size *= 0.995;
          break;

        case 'spark':
          // Sparks shoot out quickly then fade
          p.vx *= 0.93;
          p.vy *= 0.93;
          p.vy += 0.3 * deltaTime; // Gravity
          p.size *= 0.96;
          break;

        case 'victory':
          // Celebration fire bursts
          p.vx *= 0.97;
          p.vy += 0.4 * deltaTime; // Gravity
          break;

        case 'ambient':
          // Floating ash drifts gently
          p.vx += (Math.random() - 0.5) * 0.02;
          p.vy += (Math.random() - 0.5) * 0.01 - 0.02; // Slight rise
          p.vx = clamp(p.vx, -0.03, 0.03);
          p.vy = clamp(p.vy, -0.04, 0.02);
          break;

        case 'smoke':
          // Smoke wisps rise and spread
          p.vy -= 0.1 * deltaTime; // Rise
          p.vx += (Math.random() - 0.5) * 0.05 * deltaTime;
          p.size += 0.02 * deltaTime; // Expand
          break;
      }

      // Keep particles in bounds
      p.x = clamp(p.x, 0, 1);
      p.y = clamp(p.y, 0, 1);
    }
  }

  emitEmber(x: number, y: number): void {
    const count = 6;
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const angle = randomRange(-Math.PI / 3, -2 * Math.PI / 3); // Upward spread
      const speed = randomRange(0.1, 0.2);
      const colorOptions = [colors.emberOrange, colors.emberYellow, colors.flameRed];
      const color = colorOptions[Math.floor(Math.random() * colorOptions.length)];

      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed * 0.3,
        vy: Math.sin(angle) * speed,
        life: randomRange(0.8, 1.5),
        maxLife: 1.5,
        size: randomRange(0.012, 0.02),
        type: 'ember',
        color: [...color] as [number, number, number, number],
      });
    }
  }

  emitSpark(x: number, y: number): void {
    const count = 12;
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const angle = (i / count) * Math.PI * 2 + randomRange(-0.3, 0.3);
      const speed = randomRange(0.15, 0.35);
      const colorOptions = [colors.sparkWhite, colors.sparkYellow, colors.warmGlow];
      const color = colorOptions[Math.floor(Math.random() * colorOptions.length)];

      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: randomRange(0.3, 0.6),
        maxLife: 0.6,
        size: randomRange(0.01, 0.018),
        type: 'spark',
        color: [...color] as [number, number, number, number],
      });
    }
  }

  emitVictory(x: number, y: number): void {
    const count = 50;
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const angle = (i / count) * Math.PI * 2 + randomRange(-0.3, 0.3);
      const speed = randomRange(0.2, 0.5);
      const colorOptions = [
        colors.emberOrange,
        colors.emberYellow,
        colors.sparkYellow,
        colors.warmGlow,
        colors.flameRed,
      ];
      const color = colorOptions[Math.floor(Math.random() * colorOptions.length)];

      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 0.2,
        life: randomRange(1.2, 2.0),
        maxLife: 2.0,
        size: randomRange(0.018, 0.035),
        type: 'victory',
        color: [...color] as [number, number, number, number],
      });
    }
  }

  emitAmbient(x: number, y: number): void {
    if (this.particles.length >= this.maxParticles) return;

    const colorOptions = [colors.ashGray, colors.smokeGray];
    const color = colorOptions[Math.floor(Math.random() * colorOptions.length)];

    this.particles.push({
      x,
      y,
      vx: randomRange(-0.01, 0.01),
      vy: randomRange(-0.02, 0),
      life: randomRange(4, 7),
      maxLife: 7,
      size: randomRange(0.005, 0.01),
      type: 'ambient',
      color: [...color] as [number, number, number, number],
    });
  }

  emitSmoke(x: number, y: number): void {
    const count = 3;
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;

      this.particles.push({
        x: x + randomRange(-0.02, 0.02),
        y,
        vx: randomRange(-0.02, 0.02),
        vy: randomRange(-0.08, -0.04),
        life: randomRange(1.0, 2.0),
        maxLife: 2.0,
        size: randomRange(0.02, 0.04),
        type: 'smoke',
        color: [...colors.smokeGray] as [number, number, number, number],
      });
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
      data[offset + 7] = particleTypeMap[p.type];
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
