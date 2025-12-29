/**
 * Particle System - Number Link
 * Neon Circuit / Cyberpunk Grid Theme
 * Game #043
 */

import { randomRange, clamp } from './math';

export type ParticleType = 'data' | 'connection' | 'victory' | 'ambient' | 'electric';

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

// Cyberpunk neon palette
const colors = {
  neonCyan: [0.0, 0.9, 1.0, 1.0] as [number, number, number, number],
  neonMagenta: [1.0, 0.0, 0.6, 1.0] as [number, number, number, number],
  neonPurple: [0.6, 0.2, 1.0, 1.0] as [number, number, number, number],
  neonYellow: [1.0, 0.9, 0.0, 1.0] as [number, number, number, number],
  neonGreen: [0.0, 1.0, 0.4, 1.0] as [number, number, number, number],
  electric: [0.8, 0.9, 1.0, 1.0] as [number, number, number, number],
  dataPulse: [0.3, 0.8, 1.0, 0.8] as [number, number, number, number],
};

const particleTypeMap: Record<ParticleType, number> = {
  data: 0,
  connection: 1,
  victory: 2,
  ambient: 3,
  electric: 4,
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
        case 'data':
          // Data bits move in straight lines, then fade
          p.vx *= 0.98;
          p.vy *= 0.98;
          break;

        case 'connection':
          // Connection particles pulse along a path
          p.vx *= 0.95;
          p.vy *= 0.95;
          // Slight drift
          p.vy += (Math.random() - 0.5) * 0.01;
          break;

        case 'victory':
          // Victory particles spiral outward
          const angle = Math.atan2(p.vy, p.vx) + 0.05;
          const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
          p.vx = Math.cos(angle) * speed * 0.99;
          p.vy = Math.sin(angle) * speed * 0.99;
          p.size *= 1.01;
          break;

        case 'ambient':
          // Floating data particles
          p.vx += (Math.random() - 0.5) * 0.01;
          p.vy += (Math.random() - 0.5) * 0.01;
          p.vx = clamp(p.vx, -0.02, 0.02);
          p.vy = clamp(p.vy, -0.02, 0.02);
          // Digital flicker - random alpha changes
          if (Math.random() < 0.1) {
            p.color[3] = randomRange(0.3, 0.8);
          }
          break;

        case 'electric':
          // Electric sparks - erratic movement
          p.vx += (Math.random() - 0.5) * 0.2;
          p.vy += (Math.random() - 0.5) * 0.2;
          p.vx *= 0.9;
          p.vy *= 0.9;
          p.size *= 0.95;
          break;
      }

      // Keep particles in bounds
      p.x = clamp(p.x, 0, 1);
      p.y = clamp(p.y, 0, 1);
    }
  }

  // Data transfer when connecting cells
  emitData(x: number, y: number, color?: [number, number, number, number]): void {
    const count = 6;
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const angle = (i / count) * Math.PI * 2;
      const speed = randomRange(0.05, 0.12);

      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: randomRange(0.4, 0.7),
        maxLife: 0.7,
        size: randomRange(0.015, 0.025),
        type: 'data',
        color: color || [...colors.neonCyan] as [number, number, number, number],
      });
    }
  }

  // Path connection established
  emitConnection(x: number, y: number, toX: number, toY: number, color?: [number, number, number, number]): void {
    const count = 8;
    const dx = toX - x;
    const dy = toY - y;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len === 0) return;

    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const t = i / count;
      const px = x + dx * t;
      const py = y + dy * t;

      this.particles.push({
        x: px,
        y: py,
        vx: (dx / len) * randomRange(0.08, 0.15),
        vy: (dy / len) * randomRange(0.08, 0.15),
        life: randomRange(0.3, 0.6),
        maxLife: 0.6,
        size: randomRange(0.02, 0.035),
        type: 'connection',
        color: color || [...colors.neonMagenta] as [number, number, number, number],
      });
    }
  }

  // Path completed successfully
  emitComplete(x: number, y: number, color?: [number, number, number, number]): void {
    const count = 15;
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const angle = randomRange(0, Math.PI * 2);
      const speed = randomRange(0.1, 0.25);

      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: randomRange(0.5, 0.9),
        maxLife: 0.9,
        size: randomRange(0.018, 0.03),
        type: 'electric',
        color: color || [...colors.electric] as [number, number, number, number],
      });
    }
  }

  // Victory celebration
  emitVictory(x: number, y: number): void {
    const count = 60;
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const angle = (i / count) * Math.PI * 2 + randomRange(-0.2, 0.2);
      const speed = randomRange(0.15, 0.4);
      const colorOptions = [
        colors.neonCyan,
        colors.neonMagenta,
        colors.neonYellow,
        colors.neonGreen,
        colors.neonPurple,
      ];
      const color = colorOptions[Math.floor(Math.random() * colorOptions.length)];

      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: randomRange(1.2, 2.0),
        maxLife: 2.0,
        size: randomRange(0.025, 0.045),
        type: 'victory',
        color: [...color] as [number, number, number, number],
      });
    }
  }

  // Ambient floating data
  emitAmbient(x: number, y: number): void {
    if (this.particles.length >= this.maxParticles) return;

    const colorOptions = [colors.dataPulse, colors.neonPurple];
    const color = colorOptions[Math.floor(Math.random() * colorOptions.length)];

    this.particles.push({
      x,
      y,
      vx: randomRange(-0.01, 0.01),
      vy: randomRange(-0.01, 0.01),
      life: randomRange(3, 5),
      maxLife: 5,
      size: randomRange(0.008, 0.015),
      type: 'ambient',
      color: [...color] as [number, number, number, number],
    });
  }

  // Electric spark on drag/interaction
  emitSpark(x: number, y: number): void {
    const count = 5;
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const angle = randomRange(0, Math.PI * 2);
      const speed = randomRange(0.15, 0.3);

      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: randomRange(0.15, 0.3),
        maxLife: 0.3,
        size: randomRange(0.01, 0.02),
        type: 'electric',
        color: [...colors.electric] as [number, number, number, number],
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
