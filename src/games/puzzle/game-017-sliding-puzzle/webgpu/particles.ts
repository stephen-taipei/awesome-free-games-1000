/**
 * Particle System - Sliding Puzzle
 * Data Fragment Theme
 * Game #017
 */

export type ParticleType =
  | 'slide'      // Tile sliding effect
  | 'shuffle'    // Shuffle randomization
  | 'complete'   // Puzzle solved celebration
  | 'trail'      // Motion trail
  | 'ambient';   // Background data flow

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

export class ParticleSystem {
  private particles: Particle[] = [];
  private readonly maxParticles = 500;

  // Data Fragment theme colors
  private readonly colors = {
    cyan: [0.3, 0.8, 1.0, 1.0] as [number, number, number, number],
    teal: [0.2, 1.0, 0.8, 1.0] as [number, number, number, number],
    blue: [0.3, 0.5, 1.0, 1.0] as [number, number, number, number],
    white: [1.0, 1.0, 1.0, 1.0] as [number, number, number, number],
    gold: [1.0, 0.85, 0.3, 1.0] as [number, number, number, number],
    purple: [0.7, 0.4, 1.0, 1.0] as [number, number, number, number],
  };

  update(deltaTime: number): void {
    const dt = deltaTime * 0.001;

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];

      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      // Update position
      p.x += p.vx * dt;
      p.y += p.vy * dt;

      // Type-specific behavior
      switch (p.type) {
        case 'slide':
          p.vx *= 0.92;
          p.vy *= 0.92;
          p.size *= 0.97;
          break;

        case 'shuffle':
          p.vx *= 0.95;
          p.vy *= 0.95;
          p.size *= 0.98;
          break;

        case 'complete':
          p.vy -= 0.1 * dt; // Slight upward drift
          p.vx *= 0.98;
          p.vy *= 0.98;
          break;

        case 'trail':
          p.size *= 0.9;
          break;

        case 'ambient':
          // Gentle floating
          p.vx += Math.sin(p.life * 2) * 0.0005;
          p.vy += Math.cos(p.life * 2) * 0.0005;
          break;
      }

      // Update alpha based on life
      const lifeRatio = p.life / p.maxLife;
      p.color[3] = lifeRatio;
    }
  }

  /**
   * Tile slide effect - data transfer particles
   */
  emitSlide(fromX: number, fromY: number, toX: number, toY: number): void {
    const count = 15;
    const dx = toX - fromX;
    const dy = toY - fromY;

    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const t = Math.random();
      const x = fromX + dx * t;
      const y = fromY + dy * t;

      // Perpendicular scatter
      const perpX = -dy * (Math.random() - 0.5) * 0.1;
      const perpY = dx * (Math.random() - 0.5) * 0.1;

      this.particles.push({
        x: x + perpX,
        y: y + perpY,
        vx: dx * 0.5 + perpX * 2,
        vy: dy * 0.5 + perpY * 2,
        life: 0.4 + Math.random() * 0.2,
        maxLife: 0.6,
        size: 0.015 + Math.random() * 0.01,
        type: 'slide',
        color: [...this.colors.cyan] as [number, number, number, number],
      });
    }

    // Trail particles along the path
    for (let i = 0; i < 8; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const t = i / 8;
      this.particles.push({
        x: fromX + dx * t,
        y: fromY + dy * t,
        vx: (Math.random() - 0.5) * 0.02,
        vy: (Math.random() - 0.5) * 0.02,
        life: 0.3,
        maxLife: 0.3,
        size: 0.02,
        type: 'trail',
        color: [...this.colors.teal] as [number, number, number, number],
      });
    }
  }

  /**
   * Shuffle effect - quantum randomization burst
   */
  emitShuffle(centerX: number, centerY: number): void {
    const count = 40;

    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.3;
      const speed = 0.15 + Math.random() * 0.1;
      const radius = Math.random() * 0.1;

      const colors = [this.colors.cyan, this.colors.blue, this.colors.purple];
      const color = colors[Math.floor(Math.random() * colors.length)];

      this.particles.push({
        x: centerX + Math.cos(angle) * radius,
        y: centerY + Math.sin(angle) * radius,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.6 + Math.random() * 0.3,
        maxLife: 0.9,
        size: 0.02 + Math.random() * 0.015,
        type: 'shuffle',
        color: [...color] as [number, number, number, number],
      });
    }

    // Inner ring particles
    for (let i = 0; i < 12; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const angle = (i / 12) * Math.PI * 2;

      this.particles.push({
        x: centerX,
        y: centerY,
        vx: Math.cos(angle) * 0.08,
        vy: Math.sin(angle) * 0.08,
        life: 0.5,
        maxLife: 0.5,
        size: 0.025,
        type: 'shuffle',
        color: [...this.colors.white] as [number, number, number, number],
      });
    }
  }

  /**
   * Puzzle complete - celebration explosion
   */
  emitComplete(centerX: number, centerY: number): void {
    // Rainbow burst
    for (let i = 0; i < 60; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const angle = Math.random() * Math.PI * 2;
      const speed = 0.1 + Math.random() * 0.15;

      // Rainbow color
      const hue = i / 60;
      const color: [number, number, number, number] = [
        Math.sin(hue * Math.PI * 2) * 0.5 + 0.5,
        Math.sin(hue * Math.PI * 2 + 2.094) * 0.5 + 0.5,
        Math.sin(hue * Math.PI * 2 + 4.188) * 0.5 + 0.5,
        1.0,
      ];

      this.particles.push({
        x: centerX,
        y: centerY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1.5 + Math.random() * 0.5,
        maxLife: 2.0,
        size: 0.025 + Math.random() * 0.015,
        type: 'complete',
        color,
      });
    }

    // Golden sparkles
    for (let i = 0; i < 20; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const angle = (i / 20) * Math.PI * 2;
      const radius = 0.15;

      this.particles.push({
        x: centerX + Math.cos(angle) * radius,
        y: centerY + Math.sin(angle) * radius,
        vx: Math.cos(angle) * 0.06,
        vy: Math.sin(angle) * 0.06,
        life: 1.0,
        maxLife: 1.0,
        size: 0.03,
        type: 'complete',
        color: [...this.colors.gold] as [number, number, number, number],
      });
    }

    // Central burst
    for (let i = 0; i < 15; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const angle = Math.random() * Math.PI * 2;
      const speed = 0.05 + Math.random() * 0.05;

      this.particles.push({
        x: centerX,
        y: centerY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.8,
        maxLife: 0.8,
        size: 0.04,
        type: 'complete',
        color: [...this.colors.white] as [number, number, number, number],
      });
    }
  }

  /**
   * Motion trail for sliding tiles
   */
  emitTrail(x: number, y: number, vx: number, vy: number): void {
    if (this.particles.length >= this.maxParticles) return;

    this.particles.push({
      x,
      y,
      vx: vx * 0.1,
      vy: vy * 0.1,
      life: 0.2,
      maxLife: 0.2,
      size: 0.015,
      type: 'trail',
      color: [...this.colors.cyan] as [number, number, number, number],
    });
  }

  /**
   * Ambient background particles - floating data
   */
  emitAmbient(): void {
    if (Math.random() > 0.03) return;
    if (this.particles.length >= this.maxParticles) return;

    const colors = [this.colors.cyan, this.colors.blue, this.colors.teal];
    const color = colors[Math.floor(Math.random() * colors.length)];

    this.particles.push({
      x: Math.random(),
      y: Math.random(),
      vx: (Math.random() - 0.5) * 0.01,
      vy: (Math.random() - 0.5) * 0.01,
      life: 3 + Math.random() * 2,
      maxLife: 5,
      size: 0.008 + Math.random() * 0.005,
      type: 'ambient',
      color: [color[0] * 0.3, color[1] * 0.3, color[2] * 0.3, 0.3],
    });
  }

  getParticles(): Particle[] {
    return this.particles;
  }

  clear(): void {
    this.particles = [];
  }

  getCount(): number {
    return this.particles.length;
  }
}
