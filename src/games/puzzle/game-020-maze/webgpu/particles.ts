/**
 * Particle System - Maze
 * Neural Circuit Theme
 * Game #020
 */

export type ParticleType =
  | 'trail'      // Player movement trail
  | 'bump'       // Wall collision
  | 'complete'   // Maze solved
  | 'signal'     // Neural signal pulse
  | 'ambient';   // Background particles

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

  // Neural circuit colors
  private readonly colors = {
    cyan: [0.0, 1.0, 1.0, 1.0] as [number, number, number, number],
    purple: [0.6, 0.0, 1.0, 1.0] as [number, number, number, number],
    magenta: [1.0, 0.0, 0.8, 1.0] as [number, number, number, number],
    green: [0.0, 1.0, 0.6, 1.0] as [number, number, number, number],
    blue: [0.2, 0.4, 1.0, 1.0] as [number, number, number, number],
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
        case 'trail':
          p.size *= 0.96;
          p.vx *= 0.92;
          p.vy *= 0.92;
          break;

        case 'bump':
          p.size *= 1.02;
          p.vx *= 0.9;
          p.vy *= 0.9;
          break;

        case 'complete':
          p.vx *= 0.97;
          p.vy *= 0.97;
          break;

        case 'signal':
          // Follows a path-like motion
          p.vx += Math.sin(p.life * 5) * 0.001;
          p.vy += Math.cos(p.life * 5) * 0.001;
          break;

        case 'ambient':
          p.vx += Math.sin(p.life * 2) * 0.0001;
          p.vy += Math.cos(p.life * 2) * 0.0001;
          break;
      }

      const lifeRatio = p.life / p.maxLife;
      p.color[3] = lifeRatio;
    }
  }

  /**
   * Player movement trail
   */
  emitTrail(x: number, y: number, direction: string): void {
    const count = 5;
    let dx = 0, dy = 0;

    switch (direction) {
      case 'up': dy = 0.02; break;
      case 'down': dy = -0.02; break;
      case 'left': dx = 0.02; break;
      case 'right': dx = -0.02; break;
    }

    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const spread = 0.01;
      const colors = [this.colors.cyan, this.colors.purple];
      const color = colors[Math.floor(Math.random() * colors.length)];

      this.particles.push({
        x: x + (Math.random() - 0.5) * spread,
        y: y + (Math.random() - 0.5) * spread,
        vx: dx * (0.5 + Math.random() * 0.5) + (Math.random() - 0.5) * 0.01,
        vy: dy * (0.5 + Math.random() * 0.5) + (Math.random() - 0.5) * 0.01,
        life: 0.3 + Math.random() * 0.2,
        maxLife: 0.5,
        size: 0.008 + Math.random() * 0.004,
        type: 'trail',
        color: [...color] as [number, number, number, number],
      });
    }
  }

  /**
   * Wall bump effect
   */
  emitBump(x: number, y: number, direction: string): void {
    const count = 8;

    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const angle = (i / count) * Math.PI * 2;
      const speed = 0.03 + Math.random() * 0.02;

      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.25,
        maxLife: 0.25,
        size: 0.02,
        type: 'bump',
        color: [...this.colors.magenta] as [number, number, number, number],
      });
    }
  }

  /**
   * Maze completed celebration
   */
  emitComplete(x: number, y: number): void {
    // Main burst
    for (let i = 0; i < 40; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const angle = Math.random() * Math.PI * 2;
      const speed = 0.08 + Math.random() * 0.08;

      // Green to cyan gradient
      const t = i / 40;
      const color: [number, number, number, number] = [
        0.0 + t * 0.2,
        0.8 + t * 0.2,
        0.6 + t * 0.4,
        1.0,
      ];

      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1.2 + Math.random() * 0.5,
        maxLife: 1.7,
        size: 0.015 + Math.random() * 0.01,
        type: 'complete',
        color,
      });
    }

    // Outer ring sparkles
    for (let i = 0; i < 16; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const angle = (i / 16) * Math.PI * 2;
      const radius = 0.15;

      this.particles.push({
        x: x + Math.cos(angle) * radius,
        y: y + Math.sin(angle) * radius,
        vx: Math.cos(angle) * 0.05,
        vy: Math.sin(angle) * 0.05,
        life: 0.8,
        maxLife: 0.8,
        size: 0.02,
        type: 'complete',
        color: [...this.colors.white] as [number, number, number, number],
      });
    }
  }

  /**
   * Neural signal pulse between points
   */
  emitSignal(fromX: number, fromY: number, toX: number, toY: number): void {
    const count = 6;
    const dx = toX - fromX;
    const dy = toY - fromY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const t = i / count;
      const speed = 0.02 + Math.random() * 0.01;

      this.particles.push({
        x: fromX + dx * t * 0.3,
        y: fromY + dy * t * 0.3,
        vx: (dx / dist) * speed,
        vy: (dy / dist) * speed,
        life: 0.4 + Math.random() * 0.2,
        maxLife: 0.6,
        size: 0.006 + Math.random() * 0.003,
        type: 'signal',
        color: [...this.colors.blue] as [number, number, number, number],
      });
    }
  }

  /**
   * Ambient neural activity
   */
  emitAmbient(): void {
    if (Math.random() > 0.03) return;
    if (this.particles.length >= this.maxParticles) return;

    const colors = [this.colors.purple, this.colors.blue];
    const color = colors[Math.floor(Math.random() * colors.length)];

    this.particles.push({
      x: Math.random(),
      y: Math.random(),
      vx: (Math.random() - 0.5) * 0.003,
      vy: (Math.random() - 0.5) * 0.003,
      life: 2 + Math.random() * 2,
      maxLife: 4,
      size: 0.004 + Math.random() * 0.003,
      type: 'ambient',
      color: [color[0] * 0.3, color[1] * 0.3, color[2] * 0.3, 0.2],
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
