/**
 * Particle System - Magnet Puzzle
 * Plasma Physics Lab / Electromagnetic Field Theme
 * Game #052
 */

import { clamp, randomRange } from './math';

// Particle types for plasma lab theme
export type ParticleType =
  | 'plasma'    // Ambient plasma glow
  | 'field'     // Electromagnetic field particles
  | 'arc'       // Electric arc discharge
  | 'attract'   // Attraction effect
  | 'repel'     // Repulsion effect
  | 'victory';  // Victory celebration

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
  plasma: 0,
  field: 1,
  arc: 2,
  attract: 3,
  repel: 4,
  victory: 5,
};

// Plasma lab color palette
const PLASMA_COLORS: [number, number, number][] = [
  [0.6, 0.2, 0.9],   // Purple plasma
  [0.5, 0.3, 0.8],   // Violet
  [0.4, 0.4, 0.9],   // Blue-purple
  [0.3, 0.5, 0.95],  // Light purple
];

const FIELD_COLORS_N: [number, number, number][] = [
  [0.95, 0.3, 0.3],  // N pole red
  [1.0, 0.4, 0.2],   // Orange-red
  [0.9, 0.25, 0.25], // Deep red
  [1.0, 0.5, 0.3],   // Light red
];

const FIELD_COLORS_S: [number, number, number][] = [
  [0.2, 0.5, 0.95],  // S pole blue
  [0.3, 0.6, 1.0],   // Cyan-blue
  [0.15, 0.4, 0.9],  // Deep blue
  [0.4, 0.7, 1.0],   // Light blue
];

const ARC_COLORS: [number, number, number][] = [
  [0.4, 0.7, 1.0],   // Electric blue
  [0.6, 0.8, 1.0],   // Light electric
  [0.2, 0.5, 0.95],  // Deep electric
  [0.8, 0.9, 1.0],   // White-blue
];

const ATTRACT_COLORS: [number, number, number][] = [
  [0.2, 0.9, 0.5],   // Attraction green
  [0.3, 0.95, 0.6],  // Light green
  [0.1, 0.8, 0.4],   // Deep green
  [0.4, 1.0, 0.7],   // Cyan-green
];

const REPEL_COLORS: [number, number, number][] = [
  [1.0, 0.6, 0.2],   // Repulsion orange
  [1.0, 0.5, 0.3],   // Deep orange
  [0.95, 0.7, 0.3],  // Yellow-orange
  [1.0, 0.4, 0.4],   // Red-orange
];

const VICTORY_COLORS: [number, number, number][] = [
  [0.6, 0.2, 0.9],   // Purple
  [0.2, 0.8, 1.0],   // Cyan
  [0.9, 0.3, 0.3],   // Red
  [0.2, 0.5, 0.95],  // Blue
  [1.0, 0.9, 0.3],   // Gold
  [1.0, 1.0, 1.0],   // White
];

export class ParticleSystem {
  private particles: Particle[] = [];
  private maxParticles: number;

  constructor(maxParticles: number = 500) {
    this.maxParticles = maxParticles;
  }

  // Emit ambient plasma particles
  emitPlasma(): void {
    if (this.particles.length >= this.maxParticles) return;
    if (Math.random() > 0.03) return;

    const color = PLASMA_COLORS[Math.floor(Math.random() * PLASMA_COLORS.length)];

    this.particles.push({
      x: Math.random(),
      y: Math.random(),
      vx: randomRange(-0.002, 0.002),
      vy: randomRange(-0.003, 0.001),
      life: randomRange(2.0, 4.0),
      maxLife: randomRange(2.0, 4.0),
      size: randomRange(0.008, 0.015),
      type: 'plasma',
      color: [...color, randomRange(0.3, 0.5)],
    });
  }

  // Emit field line particles from a magnet position
  emitField(x: number, y: number, polarity: 'N' | 'S'): void {
    const count = 6;
    const colors = polarity === 'N' ? FIELD_COLORS_N : FIELD_COLORS_S;
    const direction = polarity === 'N' ? 1 : -1;

    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const angle = (i / count) * Math.PI * 2;
      const speed = randomRange(0.02, 0.04) * direction;
      const color = colors[Math.floor(Math.random() * colors.length)];

      this.particles.push({
        x: x + randomRange(-0.02, 0.02),
        y: y + randomRange(-0.02, 0.02),
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: randomRange(0.6, 1.0),
        maxLife: randomRange(0.6, 1.0),
        size: randomRange(0.01, 0.018),
        type: 'field',
        color: [...color, 0.9],
      });
    }
  }

  // Emit electric arc between two points
  emitArc(x1: number, y1: number, x2: number, y2: number): void {
    const count = 10;
    const color = ARC_COLORS[Math.floor(Math.random() * ARC_COLORS.length)];

    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const t = i / count;
      const x = x1 + (x2 - x1) * t + randomRange(-0.02, 0.02);
      const y = y1 + (y2 - y1) * t + randomRange(-0.02, 0.02);

      const perpX = -(y2 - y1);
      const perpY = x2 - x1;
      const jitter = randomRange(-0.01, 0.01);

      this.particles.push({
        x: x + perpX * jitter,
        y: y + perpY * jitter,
        vx: randomRange(-0.01, 0.01),
        vy: randomRange(-0.01, 0.01),
        life: randomRange(0.1, 0.2),
        maxLife: randomRange(0.1, 0.2),
        size: randomRange(0.008, 0.015),
        type: 'arc',
        color: [...color, 1.0],
      });
    }
  }

  // Emit attraction effect (pieces coming together)
  emitAttract(x: number, y: number): void {
    const count = 12;

    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const angle = (i / count) * Math.PI * 2;
      const radius = randomRange(0.1, 0.15);
      const color = ATTRACT_COLORS[Math.floor(Math.random() * ATTRACT_COLORS.length)];

      // Start outside, move toward center
      this.particles.push({
        x: x + Math.cos(angle) * radius,
        y: y + Math.sin(angle) * radius,
        vx: -Math.cos(angle) * 0.08,
        vy: -Math.sin(angle) * 0.08,
        life: randomRange(0.4, 0.6),
        maxLife: randomRange(0.4, 0.6),
        size: randomRange(0.012, 0.02),
        type: 'attract',
        color: [...color, 1.0],
      });
    }

    // Central glow
    this.particles.push({
      x,
      y,
      vx: 0,
      vy: 0,
      life: 0.5,
      maxLife: 0.5,
      size: 0.08,
      type: 'attract',
      color: [0.2, 1.0, 0.6, 0.6],
    });
  }

  // Emit repulsion effect (pieces pushing apart)
  emitRepel(x: number, y: number): void {
    const count = 15;

    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const angle = (i / count) * Math.PI * 2 + randomRange(-0.2, 0.2);
      const speed = randomRange(0.06, 0.12);
      const color = REPEL_COLORS[Math.floor(Math.random() * REPEL_COLORS.length)];

      // Start at center, move outward
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: randomRange(0.3, 0.5),
        maxLife: randomRange(0.3, 0.5),
        size: randomRange(0.015, 0.025),
        type: 'repel',
        color: [...color, 1.0],
      });
    }

    // Shockwave ring
    this.particles.push({
      x,
      y,
      vx: 0,
      vy: 0,
      life: 0.4,
      maxLife: 0.4,
      size: 0.15,
      type: 'repel',
      color: [1.0, 0.5, 0.2, 0.7],
    });
  }

  // Emit activation burst when magnet is clicked
  emitActivate(x: number, y: number, polarity: 'N' | 'S'): void {
    const count = 20;
    const colors = polarity === 'N' ? FIELD_COLORS_N : FIELD_COLORS_S;

    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const angle = randomRange(0, Math.PI * 2);
      const speed = randomRange(0.03, 0.07);
      const color = colors[Math.floor(Math.random() * colors.length)];

      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: randomRange(0.4, 0.7),
        maxLife: randomRange(0.4, 0.7),
        size: randomRange(0.015, 0.025),
        type: 'field',
        color: [...color, 1.0],
      });
    }

    // Central activation flash
    this.particles.push({
      x,
      y,
      vx: 0,
      vy: 0,
      life: 0.3,
      maxLife: 0.3,
      size: 0.12,
      type: 'arc',
      color: [1.0, 1.0, 1.0, 0.8],
    });
  }

  // Emit goal reached effect
  emitGoal(x: number, y: number): void {
    const count = 15;

    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const angle = (i / count) * Math.PI * 2;
      const speed = randomRange(0.02, 0.05);
      const color = ATTRACT_COLORS[Math.floor(Math.random() * ATTRACT_COLORS.length)];

      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: randomRange(0.5, 0.8),
        maxLife: randomRange(0.5, 0.8),
        size: randomRange(0.02, 0.03),
        type: 'attract',
        color: [...color, 1.0],
      });
    }
  }

  // Emit victory celebration
  emitVictory(x: number, y: number): void {
    const count = 60;

    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const angle = randomRange(0, Math.PI * 2);
      const speed = randomRange(0.03, 0.1);
      const color = VICTORY_COLORS[Math.floor(Math.random() * VICTORY_COLORS.length)];

      this.particles.push({
        x: x + randomRange(-0.1, 0.1),
        y: y + randomRange(-0.1, 0.1),
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 0.02,
        life: randomRange(1.5, 2.5),
        maxLife: randomRange(1.5, 2.5),
        size: randomRange(0.015, 0.03),
        type: 'victory',
        color: [...color, 1.0],
      });
    }

    // Additional plasma burst
    for (let i = 0; i < 20; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const angle = randomRange(0, Math.PI * 2);
      const speed = randomRange(0.05, 0.08);
      const color = PLASMA_COLORS[Math.floor(Math.random() * PLASMA_COLORS.length)];

      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: randomRange(0.8, 1.2),
        maxLife: randomRange(0.8, 1.2),
        size: randomRange(0.02, 0.04),
        type: 'plasma',
        color: [...color, 0.8],
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
        case 'plasma':
          // Gentle float with plasma turbulence
          p.vx += Math.sin(p.life * 3 + p.y * 10) * 0.00005;
          p.vy -= 0.00008;
          p.vx *= 0.99;
          p.vy *= 0.99;
          break;

        case 'field':
          // Field lines curve based on velocity
          const fieldAngle = Math.atan2(p.vy, p.vx);
          p.vx += Math.cos(fieldAngle + Math.PI / 4) * 0.0001;
          p.vy += Math.sin(fieldAngle + Math.PI / 4) * 0.0001;
          p.vx *= 0.98;
          p.vy *= 0.98;
          break;

        case 'arc':
          // Jittery electric motion
          p.vx += randomRange(-0.005, 0.005);
          p.vy += randomRange(-0.005, 0.005);
          p.vx *= 0.9;
          p.vy *= 0.9;
          break;

        case 'attract':
          // Accelerate toward original direction
          p.vx *= 1.05;
          p.vy *= 1.05;
          break;

        case 'repel':
          // Decelerate as it expands
          p.vx *= 0.95;
          p.vy *= 0.95;
          // Slight upward drift
          p.vy -= 0.0003;
          break;

        case 'victory':
          // Gravity and sparkle motion
          p.vy += 0.001;
          p.vx *= 0.99;
          // Twinkle motion
          p.vx += Math.sin(p.life * 15) * 0.0002;
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
