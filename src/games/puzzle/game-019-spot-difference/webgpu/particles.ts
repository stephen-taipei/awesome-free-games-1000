/**
 * Particle System - Spot Difference
 * Quantum Scanner Theme
 * Game #019
 */

export type ParticleType =
  | 'click'     // Detection pulse
  | 'found'     // Anomaly found burst
  | 'miss'      // Wrong click ripple
  | 'complete'  // All found celebration
  | 'ambient';  // Scanner particles

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

  // Quantum scanner colors
  private readonly colors = {
    cyan: [0.0, 0.9, 1.0, 1.0] as [number, number, number, number],
    teal: [0.0, 1.0, 0.7, 1.0] as [number, number, number, number],
    green: [0.3, 1.0, 0.5, 1.0] as [number, number, number, number],
    orange: [1.0, 0.6, 0.0, 1.0] as [number, number, number, number],
    red: [1.0, 0.3, 0.2, 1.0] as [number, number, number, number],
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
        case 'click':
          p.size *= 1.02;
          p.vx *= 0.95;
          p.vy *= 0.95;
          break;

        case 'found':
          p.vx *= 0.96;
          p.vy *= 0.96;
          p.vy -= 0.02 * dt;
          break;

        case 'miss':
          p.size *= 1.03;
          break;

        case 'complete':
          p.vx *= 0.98;
          p.vy *= 0.98;
          break;

        case 'ambient':
          p.vx += Math.sin(p.life * 2) * 0.0002;
          p.vy += Math.cos(p.life * 2) * 0.0002;
          break;
      }

      const lifeRatio = p.life / p.maxLife;
      p.color[3] = lifeRatio;
    }
  }

  /**
   * Click detection pulse
   */
  emitClick(x: number, y: number): void {
    const count = 12;

    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const angle = (i / count) * Math.PI * 2;
      const speed = 0.03;

      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.4,
        maxLife: 0.4,
        size: 0.02,
        type: 'click',
        color: [...this.colors.cyan] as [number, number, number, number],
      });
    }
  }

  /**
   * Anomaly found celebration
   */
  emitFound(x: number, y: number): void {
    const count = 25;

    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.3;
      const speed = 0.05 + Math.random() * 0.05;

      const colors = [this.colors.cyan, this.colors.teal, this.colors.green];
      const color = colors[Math.floor(Math.random() * colors.length)];

      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.8 + Math.random() * 0.3,
        maxLife: 1.1,
        size: 0.018 + Math.random() * 0.012,
        type: 'found',
        color: [...color] as [number, number, number, number],
      });
    }

    // Rising sparkles
    for (let i = 0; i < 8; i++) {
      if (this.particles.length >= this.maxParticles) break;

      this.particles.push({
        x: x + (Math.random() - 0.5) * 0.05,
        y,
        vx: (Math.random() - 0.5) * 0.02,
        vy: -0.08 - Math.random() * 0.04,
        life: 0.6,
        maxLife: 0.6,
        size: 0.015,
        type: 'found',
        color: [...this.colors.white] as [number, number, number, number],
      });
    }
  }

  /**
   * Wrong click - error ripple
   */
  emitMiss(x: number, y: number): void {
    const count = 8;

    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const angle = (i / count) * Math.PI * 2;
      const speed = 0.02;

      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.3,
        maxLife: 0.3,
        size: 0.03,
        type: 'miss',
        color: [...this.colors.red] as [number, number, number, number],
      });
    }
  }

  /**
   * All anomalies detected - victory celebration
   */
  emitComplete(centerX: number, centerY: number): void {
    // Rainbow burst
    for (let i = 0; i < 50; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const angle = Math.random() * Math.PI * 2;
      const speed = 0.08 + Math.random() * 0.1;

      // Cyan to green gradient
      const hue = i / 50;
      const color: [number, number, number, number] = [
        0.0 + hue * 0.3,
        0.7 + hue * 0.3,
        1.0 - hue * 0.3,
        1.0,
      ];

      this.particles.push({
        x: centerX,
        y: centerY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1.5 + Math.random() * 0.5,
        maxLife: 2.0,
        size: 0.02 + Math.random() * 0.015,
        type: 'complete',
        color,
      });
    }

    // Outer ring of sparkles
    for (let i = 0; i < 16; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const angle = (i / 16) * Math.PI * 2;
      const radius = 0.15;

      this.particles.push({
        x: centerX + Math.cos(angle) * radius,
        y: centerY + Math.sin(angle) * radius,
        vx: Math.cos(angle) * 0.04,
        vy: Math.sin(angle) * 0.04,
        life: 1.0,
        maxLife: 1.0,
        size: 0.025,
        type: 'complete',
        color: [...this.colors.white] as [number, number, number, number],
      });
    }
  }

  /**
   * Ambient scanner particles
   */
  emitAmbient(): void {
    if (Math.random() > 0.02) return;
    if (this.particles.length >= this.maxParticles) return;

    const colors = [this.colors.cyan, this.colors.teal];
    const color = colors[Math.floor(Math.random() * colors.length)];

    this.particles.push({
      x: Math.random(),
      y: Math.random(),
      vx: (Math.random() - 0.5) * 0.005,
      vy: (Math.random() - 0.5) * 0.005,
      life: 3 + Math.random() * 2,
      maxLife: 5,
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
