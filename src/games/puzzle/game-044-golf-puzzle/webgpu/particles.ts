/**
 * Particle System - Golf Puzzle
 * Lush Golf Course / Country Club Theme
 * Game #044
 */

import { randomRange, clamp } from './math';

export type ParticleType = 'grass' | 'trail' | 'victory' | 'ambient' | 'impact';

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

// Golf course color palette
const colors = {
  grassGreen: [0.3, 0.6, 0.2, 1.0] as [number, number, number, number],
  grassLight: [0.4, 0.7, 0.3, 1.0] as [number, number, number, number],
  ballWhite: [1.0, 1.0, 1.0, 0.8] as [number, number, number, number],
  gold: [1.0, 0.85, 0.3, 1.0] as [number, number, number, number],
  red: [0.9, 0.2, 0.2, 1.0] as [number, number, number, number],
  blue: [0.2, 0.4, 0.9, 1.0] as [number, number, number, number],
  yellow: [1.0, 0.9, 0.2, 1.0] as [number, number, number, number],
  dirt: [0.55, 0.4, 0.25, 1.0] as [number, number, number, number],
  pollen: [1.0, 0.95, 0.7, 0.5] as [number, number, number, number],
};

const particleTypeMap: Record<ParticleType, number> = {
  grass: 0,
  trail: 1,
  victory: 2,
  ambient: 3,
  impact: 4,
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
        case 'grass':
          // Grass clippings flutter down
          p.vy += 0.3 * deltaTime; // Gravity
          p.vx += (Math.random() - 0.5) * 0.05; // Flutter
          p.vx *= 0.98;
          break;

        case 'trail':
          // Ball trail fades quickly
          p.vx *= 0.95;
          p.vy *= 0.95;
          p.size *= 0.98;
          break;

        case 'victory':
          // Confetti falls with spinning
          p.vy += 0.15 * deltaTime;
          p.vx += (Math.random() - 0.5) * 0.02;
          p.vx *= 0.99;
          break;

        case 'ambient':
          // Pollen/dust drifts gently
          p.vx += (Math.random() - 0.5) * 0.005;
          p.vy += (Math.random() - 0.5) * 0.005;
          p.vx = clamp(p.vx, -0.02, 0.02);
          p.vy = clamp(p.vy, -0.02, 0.02);
          break;

        case 'impact':
          // Dirt spray arcs
          p.vy += 0.5 * deltaTime;
          p.vx *= 0.97;
          p.size *= 0.97;
          break;
      }

      // Keep particles in bounds
      p.x = clamp(p.x, 0, 1);
      p.y = clamp(p.y, 0, 1);
    }
  }

  // Grass kicked up when hitting
  emitGrass(x: number, y: number): void {
    const count = 12;
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const angle = randomRange(-Math.PI, -Math.PI * 0.2);
      const speed = randomRange(0.1, 0.25);
      const colorChoice = Math.random() < 0.5 ? colors.grassGreen : colors.grassLight;

      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: randomRange(0.5, 1.0),
        maxLife: 1.0,
        size: randomRange(0.008, 0.015),
        type: 'grass',
        color: [...colorChoice] as [number, number, number, number],
      });
    }
  }

  // Ball movement trail
  emitTrail(x: number, y: number): void {
    if (this.particles.length >= this.maxParticles) return;

    this.particles.push({
      x,
      y,
      vx: 0,
      vy: 0,
      life: randomRange(0.2, 0.4),
      maxLife: 0.4,
      size: randomRange(0.015, 0.025),
      type: 'trail',
      color: [...colors.ballWhite] as [number, number, number, number],
    });
  }

  // Hole-in effect
  emitHoleIn(x: number, y: number): void {
    const count = 25;
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const angle = (i / count) * Math.PI * 2;
      const speed = randomRange(0.1, 0.2);

      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 0.1,
        life: randomRange(0.6, 1.0),
        maxLife: 1.0,
        size: randomRange(0.02, 0.035),
        type: 'impact',
        color: [...colors.dirt] as [number, number, number, number],
      });
    }
  }

  // Victory celebration
  emitVictory(x: number, y: number): void {
    const count = 50;
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const angle = randomRange(-Math.PI, 0);
      const speed = randomRange(0.15, 0.35);
      const colorOptions = [
        colors.gold,
        colors.red,
        colors.blue,
        colors.yellow,
      ];
      const color = colorOptions[Math.floor(Math.random() * colorOptions.length)];

      this.particles.push({
        x: x + randomRange(-0.1, 0.1),
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: randomRange(1.5, 2.5),
        maxLife: 2.5,
        size: randomRange(0.015, 0.03),
        type: 'victory',
        color: [...color] as [number, number, number, number],
      });
    }
  }

  // Ambient pollen/dust
  emitAmbient(x: number, y: number): void {
    if (this.particles.length >= this.maxParticles) return;

    this.particles.push({
      x,
      y,
      vx: randomRange(-0.01, 0.01),
      vy: randomRange(-0.01, 0.01),
      life: randomRange(4, 6),
      maxLife: 6,
      size: randomRange(0.004, 0.008),
      type: 'ambient',
      color: [...colors.pollen] as [number, number, number, number],
    });
  }

  // Ball impact on ground
  emitImpact(x: number, y: number): void {
    const count = 8;
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const angle = randomRange(-Math.PI, 0);
      const speed = randomRange(0.08, 0.18);

      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: randomRange(0.3, 0.6),
        maxLife: 0.6,
        size: randomRange(0.01, 0.02),
        type: 'impact',
        color: [...colors.dirt] as [number, number, number, number],
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
