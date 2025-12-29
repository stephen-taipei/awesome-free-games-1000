/**
 * Particle System - Puzzle Challenge
 * Glass Workshop / Crystal Mosaic Theme
 * Game #038
 */

import { randomRange, clamp } from './math';

export type ParticleType = 'sparkle' | 'drag' | 'victory' | 'ambient' | 'snap';

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

// Glass Workshop color palette
const colors = {
  glassWhite: [1.0, 1.0, 0.98, 1.0] as [number, number, number, number],
  crystalBlue: [0.7, 0.85, 0.95, 1.0] as [number, number, number, number],
  frostBlue: [0.85, 0.92, 1.0, 1.0] as [number, number, number, number],
  amberGlow: [1.0, 0.85, 0.5, 1.0] as [number, number, number, number],
  crystalGreen: [0.7, 0.95, 0.8, 1.0] as [number, number, number, number],
  prismPink: [1.0, 0.8, 0.9, 1.0] as [number, number, number, number],
  shadowBlue: [0.4, 0.5, 0.65, 1.0] as [number, number, number, number],
  goldHighlight: [1.0, 0.9, 0.6, 1.0] as [number, number, number, number],
};

const particleTypeMap: Record<ParticleType, number> = {
  sparkle: 0,
  drag: 1,
  victory: 2,
  ambient: 3,
  snap: 4,
};

export class ParticleSystem {
  private particles: Particle[] = [];
  private maxParticles = 600;

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
        case 'sparkle':
          // Glass glints twinkle and drift slightly
          p.vx *= 0.95;
          p.vy += 0.05 * deltaTime;
          p.size *= 0.98;
          break;

        case 'drag':
          // Glass dust follows finger movement
          p.vx *= 0.92;
          p.vy *= 0.92;
          p.size *= 0.97;
          break;

        case 'victory':
          // Crystal burst expands outward with gravity
          p.vx *= 0.96;
          p.vy += 0.3 * deltaTime;
          break;

        case 'ambient':
          // Floating glass motes drift gently
          p.vx += (Math.random() - 0.5) * 0.02;
          p.vy += (Math.random() - 0.5) * 0.02;
          p.vx = clamp(p.vx, -0.03, 0.03);
          p.vy = clamp(p.vy, -0.03, 0.03);
          break;

        case 'snap':
          // Placement confirmation ring expands
          p.size += 0.08 * deltaTime;
          p.vx *= 0.9;
          p.vy *= 0.9;
          break;
      }

      // Keep particles in bounds
      p.x = clamp(p.x, 0, 1);
      p.y = clamp(p.y, 0, 1);
    }
  }

  emitSparkle(x: number, y: number): void {
    const count = 8;
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const angle = (i / count) * Math.PI * 2 + randomRange(-0.3, 0.3);
      const speed = randomRange(0.08, 0.15);
      const colorOptions = [colors.glassWhite, colors.crystalBlue, colors.frostBlue, colors.amberGlow];
      const color = colorOptions[Math.floor(Math.random() * colorOptions.length)];

      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: randomRange(0.4, 0.8),
        maxLife: 0.8,
        size: randomRange(0.012, 0.022),
        type: 'sparkle',
        color: [...color] as [number, number, number, number],
      });
    }
  }

  emitDrag(x: number, y: number): void {
    const count = 4;
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const colorOptions = [colors.frostBlue, colors.crystalBlue, colors.shadowBlue];
      const color = colorOptions[Math.floor(Math.random() * colorOptions.length)];

      this.particles.push({
        x: x + randomRange(-0.02, 0.02),
        y: y + randomRange(-0.02, 0.02),
        vx: randomRange(-0.03, 0.03),
        vy: randomRange(-0.03, 0.03),
        life: randomRange(0.3, 0.5),
        maxLife: 0.5,
        size: randomRange(0.008, 0.015),
        type: 'drag',
        color: [...color] as [number, number, number, number],
      });
    }
  }

  emitVictory(x: number, y: number): void {
    const count = 40;
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const angle = (i / count) * Math.PI * 2 + randomRange(-0.2, 0.2);
      const speed = randomRange(0.15, 0.4);
      const colorOptions = [
        colors.glassWhite,
        colors.crystalBlue,
        colors.amberGlow,
        colors.crystalGreen,
        colors.prismPink,
        colors.goldHighlight,
      ];
      const color = colorOptions[Math.floor(Math.random() * colorOptions.length)];

      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 0.2,
        life: randomRange(1.0, 1.8),
        maxLife: 1.8,
        size: randomRange(0.015, 0.03),
        type: 'victory',
        color: [...color] as [number, number, number, number],
      });
    }
  }

  emitAmbient(x: number, y: number): void {
    if (this.particles.length >= this.maxParticles) return;

    const colorOptions = [colors.frostBlue, colors.crystalBlue, colors.glassWhite];
    const color = colorOptions[Math.floor(Math.random() * colorOptions.length)];

    this.particles.push({
      x,
      y,
      vx: randomRange(-0.01, 0.01),
      vy: randomRange(-0.01, 0.01),
      life: randomRange(3, 5),
      maxLife: 5,
      size: randomRange(0.004, 0.008),
      type: 'ambient',
      color: [...color] as [number, number, number, number],
    });
  }

  emitSnap(x: number, y: number): void {
    const count = 12;
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const angle = (i / count) * Math.PI * 2;
      const speed = randomRange(0.02, 0.05);
      const colorOptions = [colors.glassWhite, colors.goldHighlight, colors.crystalBlue];
      const color = colorOptions[Math.floor(Math.random() * colorOptions.length)];

      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: randomRange(0.4, 0.6),
        maxLife: 0.6,
        size: randomRange(0.01, 0.018),
        type: 'snap',
        color: [...color] as [number, number, number, number],
      });
    }

    // Center glow
    this.particles.push({
      x,
      y,
      vx: 0,
      vy: 0,
      life: 0.5,
      maxLife: 0.5,
      size: 0.04,
      type: 'snap',
      color: [...colors.amberGlow] as [number, number, number, number],
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
