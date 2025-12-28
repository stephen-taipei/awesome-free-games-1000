/**
 * Particle System - Color Match
 * Neon Synapse Theme
 * Game #026
 */

export type ParticleType =
  | 'correct'   // Correct answer sparkles
  | 'wrong'     // Wrong answer fragments
  | 'synapse'   // Neural pulse
  | 'spark';    // Background neural sparks

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

  // Neon synapse colors
  private readonly colors = {
    green: [0.0, 1.0, 0.5, 1.0] as [number, number, number, number],
    cyan: [0.3, 1.0, 0.9, 1.0] as [number, number, number, number],
    pink: [1.0, 0.4, 0.6, 1.0] as [number, number, number, number],
    purple: [0.7, 0.4, 1.0, 1.0] as [number, number, number, number],
    red: [1.0, 0.3, 0.3, 1.0] as [number, number, number, number],
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
        case 'correct':
          p.vx *= 0.95;
          p.vy *= 0.95;
          p.size *= 0.98;
          break;

        case 'wrong':
          p.vy += 0.1;
          p.vx *= 0.98;
          p.size *= 0.97;
          break;

        case 'synapse':
          p.size *= 0.96;
          break;

        case 'spark':
          p.vx += Math.sin(p.life * 5) * 0.001;
          p.vy += Math.cos(p.life * 5) * 0.001;
          break;
      }

      const lifeRatio = p.life / p.maxLife;
      p.color[3] = lifeRatio;
    }
  }

  /**
   * Correct answer celebration
   */
  emitCorrect(x: number, y: number): void {
    const count = 30;

    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const angle = (i / count) * Math.PI * 2;
      const speed = 0.05 + Math.random() * 0.05;

      const colors = [this.colors.green, this.colors.cyan, this.colors.white];
      const color = colors[Math.floor(Math.random() * colors.length)];

      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.6 + Math.random() * 0.3,
        maxLife: 0.9,
        size: 0.015 + Math.random() * 0.01,
        type: 'correct',
        color: [...color] as [number, number, number, number],
      });
    }

    // Synapse ring
    for (let i = 0; i < 12; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const angle = (i / 12) * Math.PI * 2;
      const radius = 0.1;

      this.particles.push({
        x: x + Math.cos(angle) * radius,
        y: y + Math.sin(angle) * radius,
        vx: Math.cos(angle) * 0.03,
        vy: Math.sin(angle) * 0.03,
        life: 0.5,
        maxLife: 0.5,
        size: 0.02,
        type: 'synapse',
        color: [...this.colors.green] as [number, number, number, number],
      });
    }
  }

  /**
   * Wrong answer effect
   */
  emitWrong(x: number, y: number): void {
    const count = 20;

    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const angle = Math.random() * Math.PI * 2;
      const speed = 0.02 + Math.random() * 0.03;

      this.particles.push({
        x: x + (Math.random() - 0.5) * 0.2,
        y: y + (Math.random() - 0.5) * 0.1,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 0.02,
        life: 0.4 + Math.random() * 0.2,
        maxLife: 0.6,
        size: 0.01 + Math.random() * 0.008,
        type: 'wrong',
        color: [...this.colors.red] as [number, number, number, number],
      });
    }
  }

  /**
   * Color-specific burst
   */
  emitColorBurst(x: number, y: number, hexColor: string): void {
    const count = 15;

    // Convert hex to RGB
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hexColor);
    let color: [number, number, number, number] = [1, 1, 1, 1];
    if (result) {
      color = [
        parseInt(result[1], 16) / 255,
        parseInt(result[2], 16) / 255,
        parseInt(result[3], 16) / 255,
        1.0,
      ];
    }

    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const angle = (i / count) * Math.PI * 2;
      const speed = 0.02 + Math.random() * 0.02;

      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.4 + Math.random() * 0.2,
        maxLife: 0.6,
        size: 0.012 + Math.random() * 0.006,
        type: 'synapse',
        color: [...color] as [number, number, number, number],
      });
    }
  }

  /**
   * Background neural sparks
   */
  emitAmbient(): void {
    if (Math.random() > 0.03) return;
    if (this.particles.length >= this.maxParticles) return;

    const x = Math.random();
    const y = Math.random();

    const colors = [this.colors.cyan, this.colors.purple, this.colors.pink];
    const color = colors[Math.floor(Math.random() * colors.length)];

    this.particles.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 0.005,
      vy: (Math.random() - 0.5) * 0.005,
      life: 1.0 + Math.random() * 0.5,
      maxLife: 1.5,
      size: 0.004 + Math.random() * 0.003,
      type: 'spark',
      color: [...color] as [number, number, number, number],
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
