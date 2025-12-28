/**
 * Particle Effects System - Nonogram
 * Digital Blueprint Theme
 * Game #013
 */

export type ParticleType =
  | 'fill'     // Cell fill effect
  | 'mark'     // X mark effect
  | 'complete' // Puzzle complete celebration
  | 'error';   // Wrong answer shake

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
  private readonly maxParticles = 1500;

  // Blueprint colors
  private readonly blueprintColors = {
    cyan: [0.0, 0.8, 1.0, 1.0] as [number, number, number, number],
    blue: [0.0, 0.5, 0.9, 1.0] as [number, number, number, number],
    green: [0.0, 0.9, 0.5, 1.0] as [number, number, number, number],
    red: [1.0, 0.3, 0.3, 1.0] as [number, number, number, number],
    white: [0.9, 0.95, 1.0, 1.0] as [number, number, number, number],
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
        case 'fill':
          p.vx *= 0.95;
          p.vy *= 0.95;
          p.size *= 0.97;
          break;

        case 'mark':
          p.vx *= 0.9;
          p.vy *= 0.9;
          p.vy += 0.1 * dt; // slight gravity
          break;

        case 'complete':
          p.vx *= 0.98;
          p.vy *= 0.98;
          p.size *= 0.99;
          break;

        case 'error':
          p.vx *= 0.85;
          p.vy *= 0.85;
          // Shake effect
          p.x += (Math.random() - 0.5) * 0.01;
          break;
      }

      // Update alpha based on life
      const lifeRatio = p.life / p.maxLife;
      p.color[3] = lifeRatio;
    }
  }

  /**
   * Cell fill effect - expanding cyan particles
   */
  emitFill(x: number, y: number): void {
    const count = 15;
    const baseColor = this.blueprintColors.cyan;

    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const angle = (i / count) * Math.PI * 2;
      const speed = 0.1 + Math.random() * 0.15;

      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.3 + Math.random() * 0.2,
        maxLife: 0.5,
        size: 0.02 + Math.random() * 0.01,
        type: 'fill',
        color: [...baseColor] as [number, number, number, number],
      });
    }

    // Center flash
    this.particles.push({
      x,
      y,
      vx: 0,
      vy: 0,
      life: 0.15,
      maxLife: 0.15,
      size: 0.04,
      type: 'fill',
      color: [...this.blueprintColors.white] as [number, number, number, number],
    });
  }

  /**
   * X mark effect - red sparks
   */
  emitMark(x: number, y: number): void {
    const count = 8;
    const baseColor = this.blueprintColors.red;

    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;

      // Emit in X pattern
      const isFirstLine = i < 4;
      const angle = isFirstLine
        ? Math.PI * 0.25 + (i % 4) * Math.PI * 0.5
        : Math.PI * 0.75 + (i % 4) * Math.PI * 0.5;

      const speed = 0.08 + Math.random() * 0.1;

      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.25 + Math.random() * 0.15,
        maxLife: 0.4,
        size: 0.015 + Math.random() * 0.008,
        type: 'mark',
        color: [...baseColor] as [number, number, number, number],
      });
    }
  }

  /**
   * Clear cell effect - fade out
   */
  emitClear(x: number, y: number): void {
    const count = 6;
    const baseColor = this.blueprintColors.blue;

    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const angle = Math.random() * Math.PI * 2;
      const speed = 0.05 + Math.random() * 0.05;

      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.2,
        maxLife: 0.2,
        size: 0.01,
        type: 'fill',
        color: [baseColor[0], baseColor[1], baseColor[2], 0.5],
      });
    }
  }

  /**
   * Puzzle complete celebration - multi-color burst
   */
  emitComplete(centerX: number, centerY: number): void {
    // Large burst from center
    for (let i = 0; i < 80; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const angle = Math.random() * Math.PI * 2;
      const speed = 0.2 + Math.random() * 0.4;
      const colors = [
        this.blueprintColors.cyan,
        this.blueprintColors.blue,
        this.blueprintColors.green,
        this.blueprintColors.white,
      ];
      const color = colors[i % colors.length];

      this.particles.push({
        x: centerX,
        y: centerY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1.0 + Math.random() * 0.5,
        maxLife: 1.5,
        size: 0.025 + Math.random() * 0.02,
        type: 'complete',
        color: [...color] as [number, number, number, number],
      });
    }

    // Sparkle ring
    for (let i = 0; i < 20; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const angle = (i / 20) * Math.PI * 2;
      const dist = 0.15;

      this.particles.push({
        x: centerX + Math.cos(angle) * dist,
        y: centerY + Math.sin(angle) * dist,
        vx: Math.cos(angle) * 0.1,
        vy: Math.sin(angle) * 0.1,
        life: 0.6,
        maxLife: 0.6,
        size: 0.03,
        type: 'complete',
        color: [...this.blueprintColors.white] as [number, number, number, number],
      });
    }
  }

  /**
   * Error effect - red shake particles
   */
  emitError(centerX: number, centerY: number): void {
    for (let i = 0; i < 30; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const x = centerX + (Math.random() - 0.5) * 0.3;
      const y = centerY + (Math.random() - 0.5) * 0.3;

      this.particles.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 0.15,
        vy: (Math.random() - 0.5) * 0.15,
        life: 0.3 + Math.random() * 0.2,
        maxLife: 0.5,
        size: 0.015 + Math.random() * 0.01,
        type: 'error',
        color: [...this.blueprintColors.red] as [number, number, number, number],
      });
    }
  }

  /**
   * Row/column complete hint effect
   */
  emitHintComplete(x: number, y: number): void {
    const count = 10;
    const baseColor = this.blueprintColors.green;

    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const angle = (i / count) * Math.PI * 2;
      const speed = 0.06;

      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.4,
        maxLife: 0.4,
        size: 0.012,
        type: 'fill',
        color: [...baseColor] as [number, number, number, number],
      });
    }
  }

  /**
   * Ambient floating particles for atmosphere
   */
  emitAmbient(): void {
    if (Math.random() > 0.03) return;
    if (this.particles.length >= this.maxParticles) return;

    const colors = [
      this.blueprintColors.cyan,
      this.blueprintColors.blue,
    ];
    const color = colors[Math.floor(Math.random() * colors.length)];

    this.particles.push({
      x: Math.random(),
      y: Math.random(),
      vx: (Math.random() - 0.5) * 0.01,
      vy: -0.01 - Math.random() * 0.01, // Float upward
      life: 2 + Math.random() * 2,
      maxLife: 4,
      size: 0.005 + Math.random() * 0.003,
      type: 'fill',
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
