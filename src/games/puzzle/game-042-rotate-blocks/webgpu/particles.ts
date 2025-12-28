/**
 * Particle System - Rotate Blocks
 * Mechanical Workshop / Steampunk Factory Theme
 * Game #042
 */

import { randomRange, clamp } from './math';

export type ParticleType = 'spark' | 'rotate' | 'victory' | 'ambient' | 'steam';

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

// Steampunk color palette
const colors = {
  brassGold: [0.85, 0.7, 0.35, 1.0] as [number, number, number, number],
  copperOrange: [0.75, 0.45, 0.25, 1.0] as [number, number, number, number],
  sparkWhite: [1.0, 0.95, 0.8, 1.0] as [number, number, number, number],
  sparkYellow: [1.0, 0.85, 0.4, 1.0] as [number, number, number, number],
  metalGray: [0.5, 0.48, 0.45, 1.0] as [number, number, number, number],
  steamWhite: [0.9, 0.9, 0.85, 0.6] as [number, number, number, number],
  sootBlack: [0.25, 0.22, 0.2, 0.4] as [number, number, number, number],
};

const particleTypeMap: Record<ParticleType, number> = {
  spark: 0,
  rotate: 1,
  victory: 2,
  ambient: 3,
  steam: 4,
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
        case 'spark':
          // Sparks fly out and fall
          p.vx *= 0.95;
          p.vy *= 0.95;
          p.vy += 0.4 * deltaTime; // Gravity
          p.size *= 0.97;
          break;

        case 'rotate':
          // Circular motion trail
          const angle = Math.atan2(p.vy, p.vx);
          const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
          const newAngle = angle + 2 * deltaTime;
          p.vx = Math.cos(newAngle) * speed * 0.98;
          p.vy = Math.sin(newAngle) * speed * 0.98;
          p.size *= 0.98;
          break;

        case 'victory':
          // Celebration burst
          p.vx *= 0.96;
          p.vy *= 0.96;
          p.vy += 0.3 * deltaTime; // Gravity
          break;

        case 'ambient':
          // Floating soot particles
          p.vx += (Math.random() - 0.5) * 0.01;
          p.vy += (Math.random() - 0.5) * 0.01 - 0.01; // Slight rise
          p.vx = clamp(p.vx, -0.02, 0.02);
          p.vy = clamp(p.vy, -0.03, 0.02);
          break;

        case 'steam':
          // Steam rises and spreads
          p.vy -= 0.08 * deltaTime; // Rise
          p.vx += (Math.random() - 0.5) * 0.03 * deltaTime;
          p.size += 0.02 * deltaTime; // Expand
          p.color[3] = Math.max(0, p.color[3] - 0.3 * deltaTime); // Fade
          break;
      }

      // Keep particles in bounds
      p.x = clamp(p.x, 0, 1);
      p.y = clamp(p.y, 0, 1);
    }
  }

  // Metal grinding sparks when dragging
  emitSpark(x: number, y: number): void {
    const count = 8;
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const angle = randomRange(0, Math.PI * 2);
      const speed = randomRange(0.15, 0.35);
      const colorOptions = [colors.sparkWhite, colors.sparkYellow, colors.brassGold];
      const color = colorOptions[Math.floor(Math.random() * colorOptions.length)];

      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: randomRange(0.3, 0.6),
        maxLife: 0.6,
        size: randomRange(0.01, 0.02),
        type: 'spark',
        color: [...color] as [number, number, number, number],
      });
    }
  }

  // Rotation effect when block rotates
  emitRotate(x: number, y: number): void {
    const count = 12;
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const angle = (i / count) * Math.PI * 2;
      const speed = randomRange(0.08, 0.15);
      const colorOptions = [colors.brassGold, colors.copperOrange];
      const color = colorOptions[Math.floor(Math.random() * colorOptions.length)];

      this.particles.push({
        x: x + Math.cos(angle) * 0.03,
        y: y + Math.sin(angle) * 0.03,
        vx: Math.cos(angle + Math.PI / 2) * speed,
        vy: Math.sin(angle + Math.PI / 2) * speed,
        life: randomRange(0.5, 0.8),
        maxLife: 0.8,
        size: randomRange(0.015, 0.025),
        type: 'rotate',
        color: [...color] as [number, number, number, number],
      });
    }
  }

  // Placing block effect
  emitPlace(x: number, y: number): void {
    const count = 10;
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const angle = randomRange(-Math.PI, 0); // Upward spread
      const speed = randomRange(0.1, 0.2);

      this.particles.push({
        x: x + randomRange(-0.02, 0.02),
        y,
        vx: Math.cos(angle) * speed * 0.5,
        vy: Math.sin(angle) * speed,
        life: randomRange(0.4, 0.7),
        maxLife: 0.7,
        size: randomRange(0.012, 0.022),
        type: 'spark',
        color: [...colors.sparkYellow] as [number, number, number, number],
      });
    }
  }

  // Victory celebration
  emitVictory(x: number, y: number): void {
    const count = 50;
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const angle = (i / count) * Math.PI * 2 + randomRange(-0.2, 0.2);
      const speed = randomRange(0.2, 0.5);
      const colorOptions = [
        colors.brassGold,
        colors.copperOrange,
        colors.sparkYellow,
        colors.sparkWhite,
      ];
      const color = colorOptions[Math.floor(Math.random() * colorOptions.length)];

      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 0.1,
        life: randomRange(1.0, 1.8),
        maxLife: 1.8,
        size: randomRange(0.018, 0.04),
        type: 'victory',
        color: [...color] as [number, number, number, number],
      });
    }
  }

  // Ambient floating soot
  emitAmbient(x: number, y: number): void {
    if (this.particles.length >= this.maxParticles) return;

    const colorOptions = [colors.sootBlack, colors.metalGray];
    const color = colorOptions[Math.floor(Math.random() * colorOptions.length)];

    this.particles.push({
      x,
      y,
      vx: randomRange(-0.01, 0.01),
      vy: randomRange(-0.02, 0),
      life: randomRange(4, 6),
      maxLife: 6,
      size: randomRange(0.005, 0.01),
      type: 'ambient',
      color: [...color] as [number, number, number, number],
    });
  }

  // Steam puff
  emitSteam(x: number, y: number): void {
    const count = 5;
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;

      this.particles.push({
        x: x + randomRange(-0.02, 0.02),
        y,
        vx: randomRange(-0.02, 0.02),
        vy: randomRange(-0.06, -0.03),
        life: randomRange(1.0, 1.8),
        maxLife: 1.8,
        size: randomRange(0.025, 0.045),
        type: 'steam',
        color: [...colors.steamWhite] as [number, number, number, number],
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
