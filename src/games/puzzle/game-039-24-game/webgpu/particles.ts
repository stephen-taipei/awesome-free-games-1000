/**
 * Particle System - 24 Game
 * Mental Math Arena / Calculator Championship Theme
 * Game #039
 */

import { randomRange, clamp } from './math';

export type ParticleType = 'click' | 'operator' | 'victory' | 'ambient' | 'calculate';

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

// Calculator Championship color palette
const colors = {
  displayGreen: [0.0, 0.85, 0.45, 1.0] as [number, number, number, number],
  goldNumber: [1.0, 0.85, 0.3, 1.0] as [number, number, number, number],
  accentBlue: [0.3, 0.6, 1.0, 1.0] as [number, number, number, number],
  operatorPurple: [0.7, 0.4, 1.0, 1.0] as [number, number, number, number],
  resultWhite: [1.0, 1.0, 0.95, 1.0] as [number, number, number, number],
  digitCyan: [0.2, 0.9, 0.9, 1.0] as [number, number, number, number],
  errorRed: [1.0, 0.3, 0.3, 1.0] as [number, number, number, number],
  correctGreen: [0.2, 1.0, 0.5, 1.0] as [number, number, number, number],
};

const particleTypeMap: Record<ParticleType, number> = {
  click: 0,
  operator: 1,
  victory: 2,
  ambient: 3,
  calculate: 4,
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
        case 'click':
          // Digital burst expands and fades
          p.vx *= 0.92;
          p.vy *= 0.92;
          p.size *= 0.97;
          break;

        case 'operator':
          // Math symbol pulses
          p.vx *= 0.95;
          p.vy += 0.1 * deltaTime; // Slight float up
          break;

        case 'victory':
          // Golden celebration bursts upward
          p.vy += 0.5 * deltaTime; // Gravity
          p.vx *= 0.98;
          break;

        case 'ambient':
          // Floating digits drift
          p.vx += (Math.random() - 0.5) * 0.01;
          p.vy += (Math.random() - 0.5) * 0.01;
          p.vx = clamp(p.vx, -0.02, 0.02);
          p.vy = clamp(p.vy, -0.02, 0.02);
          break;

        case 'calculate':
          // Computation sparks travel fast
          p.vx *= 0.96;
          p.vy *= 0.96;
          p.size *= 0.98;
          break;
      }

      // Keep particles in bounds
      p.x = clamp(p.x, 0, 1);
      p.y = clamp(p.y, 0, 1);
    }
  }

  emitClick(x: number, y: number): void {
    const count = 10;
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const angle = (i / count) * Math.PI * 2 + randomRange(-0.2, 0.2);
      const speed = randomRange(0.1, 0.2);
      const colorOptions = [colors.displayGreen, colors.accentBlue, colors.digitCyan];
      const color = colorOptions[Math.floor(Math.random() * colorOptions.length)];

      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: randomRange(0.3, 0.5),
        maxLife: 0.5,
        size: randomRange(0.015, 0.025),
        type: 'click',
        color: [...color] as [number, number, number, number],
      });
    }
  }

  emitOperator(x: number, y: number): void {
    const count = 6;
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const angle = randomRange(0, Math.PI * 2);
      const speed = randomRange(0.05, 0.1);
      const colorOptions = [colors.operatorPurple, colors.accentBlue];
      const color = colorOptions[Math.floor(Math.random() * colorOptions.length)];

      this.particles.push({
        x: x + randomRange(-0.03, 0.03),
        y: y + randomRange(-0.03, 0.03),
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 0.05,
        life: randomRange(0.4, 0.7),
        maxLife: 0.7,
        size: randomRange(0.02, 0.035),
        type: 'operator',
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
        colors.goldNumber,
        colors.correctGreen,
        colors.resultWhite,
        colors.displayGreen,
      ];
      const color = colorOptions[Math.floor(Math.random() * colorOptions.length)];

      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 0.3,
        life: randomRange(1.2, 2.0),
        maxLife: 2.0,
        size: randomRange(0.02, 0.04),
        type: 'victory',
        color: [...color] as [number, number, number, number],
      });
    }
  }

  emitAmbient(x: number, y: number): void {
    if (this.particles.length >= this.maxParticles) return;

    const colorOptions = [colors.digitCyan, colors.displayGreen, colors.accentBlue];
    const color = colorOptions[Math.floor(Math.random() * colorOptions.length)];

    this.particles.push({
      x,
      y,
      vx: randomRange(-0.01, 0.01),
      vy: randomRange(-0.01, 0.01),
      life: randomRange(3, 5),
      maxLife: 5,
      size: randomRange(0.005, 0.01),
      type: 'ambient',
      color: [...color] as [number, number, number, number],
    });
  }

  emitCalculate(x: number, y: number): void {
    const count = 8;
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const angle = randomRange(0, Math.PI * 2);
      const speed = randomRange(0.15, 0.3);
      const colorOptions = [colors.displayGreen, colors.goldNumber, colors.resultWhite];
      const color = colorOptions[Math.floor(Math.random() * colorOptions.length)];

      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: randomRange(0.3, 0.5),
        maxLife: 0.5,
        size: randomRange(0.012, 0.02),
        type: 'calculate',
        color: [...color] as [number, number, number, number],
      });
    }
  }

  emitCorrect(x: number, y: number): void {
    // Special green burst for correct calculation
    const count = 15;
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const angle = (i / count) * Math.PI * 2;
      const speed = randomRange(0.1, 0.2);

      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: randomRange(0.5, 0.8),
        maxLife: 0.8,
        size: randomRange(0.018, 0.028),
        type: 'calculate',
        color: [...colors.correctGreen] as [number, number, number, number],
      });
    }
  }

  emitError(x: number, y: number): void {
    // Red flash for invalid operation
    const count = 6;
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const angle = (i / count) * Math.PI * 2;
      const speed = randomRange(0.08, 0.15);

      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: randomRange(0.3, 0.5),
        maxLife: 0.5,
        size: randomRange(0.015, 0.022),
        type: 'click',
        color: [...colors.errorRed] as [number, number, number, number],
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
