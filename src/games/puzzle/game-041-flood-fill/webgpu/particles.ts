/**
 * Particle System - Flood Fill
 * Ink Spill / Watercolor Studio Theme
 * Game #041
 */

import { randomRange, clamp, hexToRgb } from './math';

export type ParticleType = 'splash' | 'spread' | 'victory' | 'ambient' | 'ripple';

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

// Watercolor palette
const colors = {
  inkRed: [0.9, 0.3, 0.35, 1.0] as [number, number, number, number],
  inkBlue: [0.3, 0.5, 0.9, 1.0] as [number, number, number, number],
  inkGreen: [0.3, 0.8, 0.5, 1.0] as [number, number, number, number],
  inkYellow: [0.95, 0.85, 0.3, 1.0] as [number, number, number, number],
  inkPurple: [0.6, 0.3, 0.8, 1.0] as [number, number, number, number],
  inkOrange: [0.95, 0.55, 0.2, 1.0] as [number, number, number, number],
  waterWhite: [0.95, 0.95, 0.92, 0.6] as [number, number, number, number],
  dropletGray: [0.5, 0.52, 0.55, 0.4] as [number, number, number, number],
};

const particleTypeMap: Record<ParticleType, number> = {
  splash: 0,
  spread: 1,
  victory: 2,
  ambient: 3,
  ripple: 4,
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
        case 'splash':
          // Ink splashes outward then settles
          p.vx *= 0.94;
          p.vy *= 0.94;
          p.vy += 0.15 * deltaTime; // Slight drip
          p.size *= 0.99;
          break;

        case 'spread':
          // Watercolor spread - slow diffusion
          p.vx *= 0.97;
          p.vy *= 0.97;
          p.vx += (Math.random() - 0.5) * 0.02;
          p.vy += (Math.random() - 0.5) * 0.02;
          p.size += 0.01 * deltaTime; // Slowly expand
          break;

        case 'victory':
          // Celebration burst
          p.vx *= 0.96;
          p.vy *= 0.96;
          p.vy += 0.25 * deltaTime; // Gravity
          break;

        case 'ambient':
          // Floating ink droplets
          p.vx += (Math.random() - 0.5) * 0.01;
          p.vy += (Math.random() - 0.5) * 0.01 - 0.015; // Gentle rise
          p.vx = clamp(p.vx, -0.02, 0.02);
          p.vy = clamp(p.vy, -0.03, 0.02);
          break;

        case 'ripple':
          // Water ripple expands
          p.size += 0.15 * deltaTime;
          p.vx = 0;
          p.vy = 0;
          // Alpha fades in color
          p.color[3] = Math.max(0, p.color[3] - 0.5 * deltaTime);
          break;
      }

      // Keep particles in bounds
      p.x = clamp(p.x, 0, 1);
      p.y = clamp(p.y, 0, 1);
    }
  }

  // Ink splash when selecting a color
  emitSplash(x: number, y: number, colorHex: string): void {
    const count = 15;
    const [r, g, b] = hexToRgb(colorHex);

    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const angle = (i / count) * Math.PI * 2 + randomRange(-0.3, 0.3);
      const speed = randomRange(0.15, 0.35);

      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: randomRange(0.5, 0.9),
        maxLife: 0.9,
        size: randomRange(0.02, 0.04),
        type: 'splash',
        color: [r, g, b, 0.9],
      });
    }
  }

  // Color spread effect during flood fill
  emitSpread(x: number, y: number, colorHex: string): void {
    const count = 8;
    const [r, g, b] = hexToRgb(colorHex);

    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const angle = randomRange(0, Math.PI * 2);
      const speed = randomRange(0.05, 0.12);

      this.particles.push({
        x: x + randomRange(-0.02, 0.02),
        y: y + randomRange(-0.02, 0.02),
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: randomRange(0.8, 1.4),
        maxLife: 1.4,
        size: randomRange(0.015, 0.03),
        type: 'spread',
        color: [r, g, b, 0.7],
      });
    }
  }

  // Victory celebration with rainbow colors
  emitVictory(x: number, y: number): void {
    const count = 60;
    const allColors = [
      colors.inkRed,
      colors.inkBlue,
      colors.inkGreen,
      colors.inkYellow,
      colors.inkPurple,
      colors.inkOrange,
    ];

    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const angle = (i / count) * Math.PI * 2 + randomRange(-0.2, 0.2);
      const speed = randomRange(0.2, 0.5);
      const color = allColors[Math.floor(Math.random() * allColors.length)];

      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 0.15,
        life: randomRange(1.2, 2.0),
        maxLife: 2.0,
        size: randomRange(0.02, 0.045),
        type: 'victory',
        color: [...color] as [number, number, number, number],
      });
    }
  }

  // Ambient floating droplets
  emitAmbient(x: number, y: number): void {
    if (this.particles.length >= this.maxParticles) return;

    const colorOptions = [colors.waterWhite, colors.dropletGray];
    const color = colorOptions[Math.floor(Math.random() * colorOptions.length)];

    this.particles.push({
      x,
      y,
      vx: randomRange(-0.01, 0.01),
      vy: randomRange(-0.02, 0),
      life: randomRange(4, 6),
      maxLife: 6,
      size: randomRange(0.005, 0.012),
      type: 'ambient',
      color: [...color] as [number, number, number, number],
    });
  }

  // Water ripple effect
  emitRipple(x: number, y: number, colorHex: string): void {
    if (this.particles.length >= this.maxParticles) return;

    const [r, g, b] = hexToRgb(colorHex);

    this.particles.push({
      x,
      y,
      vx: 0,
      vy: 0,
      life: 1.2,
      maxLife: 1.2,
      size: 0.02,
      type: 'ripple',
      color: [r, g, b, 0.6],
    });
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
