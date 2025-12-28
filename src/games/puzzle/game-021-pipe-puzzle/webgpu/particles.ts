/**
 * Particle System - Pipe Puzzle
 * Energy Conduit Theme
 * Game #021
 */

export type ParticleType =
  | 'rotate'    // Pipe rotation effect
  | 'connect'   // Connection established
  | 'complete'  // Puzzle solved
  | 'flow'      // Energy flow particles
  | 'ambient';  // Background particles

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
  private readonly maxParticles = 300;

  // Energy conduit colors
  private readonly colors = {
    cyan: [0.0, 0.9, 1.0, 1.0] as [number, number, number, number],
    blue: [0.2, 0.6, 1.0, 1.0] as [number, number, number, number],
    teal: [0.0, 0.8, 0.7, 1.0] as [number, number, number, number],
    orange: [1.0, 0.5, 0.0, 1.0] as [number, number, number, number],
    green: [0.2, 1.0, 0.5, 1.0] as [number, number, number, number],
    white: [1.0, 1.0, 1.0, 1.0] as [number, number, number, number],
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

      p.x += p.vx * dt;
      p.y += p.vy * dt;

      switch (p.type) {
        case 'rotate':
          p.vx *= 0.95;
          p.vy *= 0.95;
          p.size *= 0.97;
          break;

        case 'connect':
          p.vx *= 0.92;
          p.vy *= 0.92;
          break;

        case 'complete':
          p.vx *= 0.96;
          p.vy *= 0.96;
          break;

        case 'flow':
          // Flow follows a path
          p.size *= 0.98;
          break;

        case 'ambient':
          p.vx += Math.sin(p.life * 3) * 0.0002;
          p.vy += Math.cos(p.life * 3) * 0.0002;
          break;
      }

      const lifeRatio = p.life / p.maxLife;
      p.color[3] = lifeRatio;
    }
  }

  /**
   * Pipe rotation burst
   */
  emitRotate(x: number, y: number): void {
    const count = 10;

    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.3;
      const speed = 0.04 + Math.random() * 0.02;

      const colors = [this.colors.cyan, this.colors.blue];
      const color = colors[Math.floor(Math.random() * colors.length)];

      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.3 + Math.random() * 0.15,
        maxLife: 0.45,
        size: 0.012 + Math.random() * 0.006,
        type: 'rotate',
        color: [...color] as [number, number, number, number],
      });
    }
  }

  /**
   * Connection established spark
   */
  emitConnect(x: number, y: number): void {
    const count = 15;

    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const angle = (i / count) * Math.PI * 2;
      const speed = 0.05 + Math.random() * 0.03;

      const colors = [this.colors.cyan, this.colors.teal, this.colors.green];
      const color = colors[Math.floor(Math.random() * colors.length)];

      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.5 + Math.random() * 0.2,
        maxLife: 0.7,
        size: 0.015 + Math.random() * 0.008,
        type: 'connect',
        color: [...color] as [number, number, number, number],
      });
    }

    // Central sparkle
    for (let i = 0; i < 6; i++) {
      if (this.particles.length >= this.maxParticles) break;

      this.particles.push({
        x: x + (Math.random() - 0.5) * 0.02,
        y: y + (Math.random() - 0.5) * 0.02,
        vx: (Math.random() - 0.5) * 0.02,
        vy: -0.04 - Math.random() * 0.02,
        life: 0.4,
        maxLife: 0.4,
        size: 0.01,
        type: 'connect',
        color: [...this.colors.white] as [number, number, number, number],
      });
    }
  }

  /**
   * Puzzle complete celebration
   */
  emitComplete(centerX: number, centerY: number): void {
    // Main burst
    for (let i = 0; i < 40; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const angle = Math.random() * Math.PI * 2;
      const speed = 0.08 + Math.random() * 0.08;

      // Cyan to green gradient
      const t = i / 40;
      const color: [number, number, number, number] = [
        0.0 + t * 0.2,
        0.7 + t * 0.3,
        1.0 - t * 0.3,
        1.0,
      ];

      this.particles.push({
        x: centerX,
        y: centerY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1.2 + Math.random() * 0.4,
        maxLife: 1.6,
        size: 0.018 + Math.random() * 0.012,
        type: 'complete',
        color,
      });
    }

    // Ring of sparkles
    for (let i = 0; i < 12; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const angle = (i / 12) * Math.PI * 2;
      const radius = 0.12;

      this.particles.push({
        x: centerX + Math.cos(angle) * radius,
        y: centerY + Math.sin(angle) * radius,
        vx: Math.cos(angle) * 0.04,
        vy: Math.sin(angle) * 0.04,
        life: 0.8,
        maxLife: 0.8,
        size: 0.02,
        type: 'complete',
        color: [...this.colors.white] as [number, number, number, number],
      });
    }
  }

  /**
   * Energy flow along pipe
   */
  emitFlow(fromX: number, fromY: number, toX: number, toY: number): void {
    const count = 4;
    const dx = toX - fromX;
    const dy = toY - fromY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const t = i / count;
      const speed = 0.03 + Math.random() * 0.02;

      this.particles.push({
        x: fromX + dx * t * 0.5,
        y: fromY + dy * t * 0.5,
        vx: (dx / dist) * speed,
        vy: (dy / dist) * speed,
        life: 0.3 + Math.random() * 0.15,
        maxLife: 0.45,
        size: 0.006 + Math.random() * 0.004,
        type: 'flow',
        color: [...this.colors.cyan] as [number, number, number, number],
      });
    }
  }

  /**
   * Ambient energy particles
   */
  emitAmbient(): void {
    if (Math.random() > 0.03) return;
    if (this.particles.length >= this.maxParticles) return;

    const colors = [this.colors.cyan, this.colors.blue];
    const color = colors[Math.floor(Math.random() * colors.length)];

    this.particles.push({
      x: Math.random(),
      y: Math.random(),
      vx: (Math.random() - 0.5) * 0.004,
      vy: (Math.random() - 0.5) * 0.004,
      life: 2.5 + Math.random() * 1.5,
      maxLife: 4,
      size: 0.005 + Math.random() * 0.003,
      type: 'ambient',
      color: [color[0] * 0.4, color[1] * 0.4, color[2] * 0.4, 0.3],
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
