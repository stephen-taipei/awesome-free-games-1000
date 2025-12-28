/**
 * Particle System - Logic Gates
 * Digital Circuit Theme
 * Game #027
 */

export type ParticleType =
  | 'electron'    // Flowing signal
  | 'pulse'       // Signal activation
  | 'spark'       // Connection spark
  | 'data';       // Ambient circuit data

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

  // Circuit theme colors
  private readonly colors = {
    green: [0.0, 1.0, 0.5, 1.0] as [number, number, number, number],
    cyan: [0.0, 0.8, 1.0, 1.0] as [number, number, number, number],
    blue: [0.2, 0.5, 1.0, 1.0] as [number, number, number, number],
    yellow: [1.0, 0.9, 0.2, 1.0] as [number, number, number, number],
    orange: [1.0, 0.6, 0.0, 1.0] as [number, number, number, number],
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
        case 'electron':
          // Keep velocity, slight drift
          p.vx *= 0.99;
          p.vy *= 0.99;
          break;

        case 'pulse':
          // Expand and fade
          p.size += dt * 0.05;
          break;

        case 'spark':
          // Quick fade
          p.vx *= 0.9;
          p.vy *= 0.9;
          break;

        case 'data':
          // Gentle float
          p.vy += 0.002;
          p.vx += Math.sin(p.life * 3) * 0.0002;
          break;
      }

      const lifeRatio = p.life / p.maxLife;
      p.color[3] = lifeRatio;
    }
  }

  /**
   * Signal flow along wire
   */
  emitSignalFlow(fromX: number, fromY: number, toX: number, toY: number): void {
    const count = 8;
    const dx = toX - fromX;
    const dy = toY - fromY;
    const len = Math.sqrt(dx * dx + dy * dy);
    const nx = dx / len;
    const ny = dy / len;

    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const t = i / count;
      const x = fromX + dx * t;
      const y = fromY + dy * t;

      this.particles.push({
        x,
        y,
        vx: nx * 0.02 + (Math.random() - 0.5) * 0.005,
        vy: ny * 0.02 + (Math.random() - 0.5) * 0.005,
        life: 0.4 + Math.random() * 0.2,
        maxLife: 0.6,
        size: 0.006 + Math.random() * 0.003,
        type: 'electron',
        color: [...this.colors.green] as [number, number, number, number],
      });
    }
  }

  /**
   * Gate activation pulse
   */
  emitGateActivation(x: number, y: number, isHigh: boolean): void {
    if (this.particles.length >= this.maxParticles) return;

    const color = isHigh ? this.colors.yellow : this.colors.blue;

    // Central pulse
    this.particles.push({
      x,
      y,
      vx: 0,
      vy: 0,
      life: 0.5,
      maxLife: 0.5,
      size: 0.01,
      type: 'pulse',
      color: [...color] as [number, number, number, number],
    });

    // Radiating sparks
    const sparkCount = 6;
    for (let i = 0; i < sparkCount; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const angle = (i / sparkCount) * Math.PI * 2;
      const speed = 0.03 + Math.random() * 0.02;

      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.3 + Math.random() * 0.1,
        maxLife: 0.4,
        size: 0.008 + Math.random() * 0.004,
        type: 'spark',
        color: [...color] as [number, number, number, number],
      });
    }
  }

  /**
   * Connection made between gates
   */
  emitConnection(x: number, y: number): void {
    const count = 15;

    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const angle = Math.random() * Math.PI * 2;
      const speed = 0.02 + Math.random() * 0.03;

      const colors = [this.colors.cyan, this.colors.green, this.colors.white];
      const color = colors[Math.floor(Math.random() * colors.length)];

      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.5 + Math.random() * 0.3,
        maxLife: 0.8,
        size: 0.01 + Math.random() * 0.005,
        type: 'spark',
        color: [...color] as [number, number, number, number],
      });
    }
  }

  /**
   * Circuit complete celebration
   */
  emitComplete(centerX: number, centerY: number): void {
    const count = 40;

    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const angle = (i / count) * Math.PI * 2;
      const speed = 0.04 + Math.random() * 0.04;

      const colors = [this.colors.green, this.colors.cyan, this.colors.yellow, this.colors.white];
      const color = colors[Math.floor(Math.random() * colors.length)];

      this.particles.push({
        x: centerX,
        y: centerY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1.0 + Math.random() * 0.5,
        maxLife: 1.5,
        size: 0.015 + Math.random() * 0.01,
        type: 'electron',
        color: [...color] as [number, number, number, number],
      });
    }
  }

  /**
   * Ambient circuit activity
   */
  emitAmbient(): void {
    if (Math.random() > 0.02) return;
    if (this.particles.length >= this.maxParticles) return;

    const x = Math.random();
    const y = Math.random();

    this.particles.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 0.003,
      vy: 0.008 + Math.random() * 0.005,
      life: 1.5 + Math.random() * 0.5,
      maxLife: 2.0,
      size: 0.003 + Math.random() * 0.002,
      type: 'data',
      color: [0.0, 0.6 + Math.random() * 0.3, 0.4 + Math.random() * 0.3, 0.4],
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
