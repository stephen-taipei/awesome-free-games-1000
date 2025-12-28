/**
 * Particle System - Crossword
 * Cyber Cipher Theme
 * Game #018
 */

export type ParticleType =
  | 'input'     // Letter input spark
  | 'correct'   // Correct letter
  | 'wrong'     // Wrong letter
  | 'complete'  // Puzzle solved
  | 'ambient';  // Background code

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
  private readonly maxParticles = 400;

  // Cyber cipher colors
  private readonly colors = {
    green: [0.0, 0.9, 0.5, 1.0] as [number, number, number, number],
    cyan: [0.0, 0.8, 0.7, 1.0] as [number, number, number, number],
    lime: [0.4, 1.0, 0.2, 1.0] as [number, number, number, number],
    red: [1.0, 0.3, 0.2, 1.0] as [number, number, number, number],
    white: [1.0, 1.0, 1.0, 1.0] as [number, number, number, number],
    gold: [1.0, 0.85, 0.3, 1.0] as [number, number, number, number],
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
        case 'input':
          p.vx *= 0.9;
          p.vy *= 0.9;
          p.size *= 0.95;
          break;

        case 'correct':
          p.vy -= 0.05 * dt;
          p.vx *= 0.98;
          p.vy *= 0.98;
          break;

        case 'wrong':
          p.vx += (Math.random() - 0.5) * 0.1;
          p.vy += (Math.random() - 0.5) * 0.1;
          p.size *= 0.97;
          break;

        case 'complete':
          p.vx *= 0.98;
          p.vy *= 0.98;
          break;

        case 'ambient':
          p.vy += 0.02 * dt;
          p.vx += Math.sin(p.life * 3) * 0.001;
          break;
      }

      const lifeRatio = p.life / p.maxLife;
      p.color[3] = lifeRatio;
    }
  }

  /**
   * Letter input effect
   */
  emitInput(x: number, y: number): void {
    const count = 8;

    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.3;
      const speed = 0.03 + Math.random() * 0.03;

      this.particles.push({
        x: x + (Math.random() - 0.5) * 0.02,
        y: y + (Math.random() - 0.5) * 0.02,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.3 + Math.random() * 0.2,
        maxLife: 0.5,
        size: 0.012 + Math.random() * 0.008,
        type: 'input',
        color: [...this.colors.green] as [number, number, number, number],
      });
    }
  }

  /**
   * Correct letter effect
   */
  emitCorrect(x: number, y: number): void {
    const count = 15;

    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const angle = (i / count) * Math.PI * 2;
      const speed = 0.05 + Math.random() * 0.03;

      const colors = [this.colors.green, this.colors.lime, this.colors.cyan];
      const color = colors[Math.floor(Math.random() * colors.length)];

      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.6 + Math.random() * 0.3,
        maxLife: 0.9,
        size: 0.018 + Math.random() * 0.01,
        type: 'correct',
        color: [...color] as [number, number, number, number],
      });
    }

    // Rising sparkles
    for (let i = 0; i < 5; i++) {
      if (this.particles.length >= this.maxParticles) break;

      this.particles.push({
        x: x + (Math.random() - 0.5) * 0.03,
        y,
        vx: (Math.random() - 0.5) * 0.02,
        vy: -0.08 - Math.random() * 0.04,
        life: 0.5,
        maxLife: 0.5,
        size: 0.015,
        type: 'correct',
        color: [...this.colors.white] as [number, number, number, number],
      });
    }
  }

  /**
   * Wrong letter effect
   */
  emitWrong(x: number, y: number): void {
    const count = 10;

    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const angle = Math.random() * Math.PI * 2;
      const speed = 0.04 + Math.random() * 0.03;

      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.4 + Math.random() * 0.2,
        maxLife: 0.6,
        size: 0.015 + Math.random() * 0.01,
        type: 'wrong',
        color: [...this.colors.red] as [number, number, number, number],
      });
    }
  }

  /**
   * Puzzle complete - decryption success
   */
  emitComplete(centerX: number, centerY: number): void {
    // Rainbow burst
    for (let i = 0; i < 50; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const angle = Math.random() * Math.PI * 2;
      const speed = 0.1 + Math.random() * 0.12;

      // Green-themed rainbow
      const hue = i / 50;
      const color: [number, number, number, number] = [
        0.2 + Math.sin(hue * Math.PI * 2) * 0.3,
        0.7 + Math.sin(hue * Math.PI * 2 + 2.094) * 0.3,
        0.4 + Math.sin(hue * Math.PI * 2 + 4.188) * 0.3,
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

    // Gold sparkles
    for (let i = 0; i < 15; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const angle = (i / 15) * Math.PI * 2;
      const radius = 0.15;

      this.particles.push({
        x: centerX + Math.cos(angle) * radius,
        y: centerY + Math.sin(angle) * radius,
        vx: Math.cos(angle) * 0.05,
        vy: Math.sin(angle) * 0.05,
        life: 1.0,
        maxLife: 1.0,
        size: 0.03,
        type: 'complete',
        color: [...this.colors.gold] as [number, number, number, number],
      });
    }
  }

  /**
   * Ambient code particles
   */
  emitAmbient(): void {
    if (Math.random() > 0.02) return;
    if (this.particles.length >= this.maxParticles) return;

    const colors = [this.colors.green, this.colors.cyan];
    const color = colors[Math.floor(Math.random() * colors.length)];

    this.particles.push({
      x: Math.random(),
      y: -0.05,
      vx: (Math.random() - 0.5) * 0.005,
      vy: 0.02 + Math.random() * 0.02,
      life: 4 + Math.random() * 2,
      maxLife: 6,
      size: 0.006 + Math.random() * 0.004,
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
