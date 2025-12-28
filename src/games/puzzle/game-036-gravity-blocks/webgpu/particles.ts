/**
 * Particle System - Gravity Blocks
 * Space Station / Zero-G Lab Theme
 * Game #036
 */

export type ParticleType =
  | 'collision' // Block collision spark
  | 'drag'      // Platform drag trail
  | 'victory'   // Level complete
  | 'ambient'   // Floating debris
  | 'landing';  // Block landing on target

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

  // Space station color palette
  private readonly colors = {
    energyBlue: [0.3, 0.6, 1.0, 1.0] as [number, number, number, number],
    energyCyan: [0.3, 0.9, 1.0, 1.0] as [number, number, number, number],
    plasmaPurple: [0.6, 0.3, 1.0, 1.0] as [number, number, number, number],
    warningOrange: [1.0, 0.6, 0.2, 1.0] as [number, number, number, number],
    alertRed: [1.0, 0.3, 0.3, 1.0] as [number, number, number, number],
    successGreen: [0.3, 1.0, 0.5, 1.0] as [number, number, number, number],
    metalGray: [0.6, 0.65, 0.7, 0.8] as [number, number, number, number],
    starWhite: [1.0, 1.0, 0.95, 1.0] as [number, number, number, number],
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
        case 'collision':
          // Energy sparks dissipate
          p.vx *= 0.9;
          p.vy *= 0.9;
          p.size *= 0.96;
          break;

        case 'drag':
          // Plasma trail fades
          p.vx *= 0.95;
          p.vy *= 0.95;
          p.size *= 0.98;
          break;

        case 'victory':
          // Holographic confetti floats
          p.vy -= 0.003; // Slight anti-gravity
          p.vx += Math.sin(p.life * 8) * 0.002;
          break;

        case 'ambient':
          // Zero-G drift
          p.vx += Math.sin(p.life * 1.5) * 0.0002;
          p.vy += Math.cos(p.life * 2) * 0.0002;
          break;

        case 'landing':
          // Shockwave expands
          p.size *= 1.05;
          p.vx *= 0.85;
          p.vy *= 0.85;
          break;
      }

      // Update alpha based on life
      const lifeRatio = p.life / p.maxLife;
      p.color[3] = lifeRatio;
    }
  }

  /**
   * Block collision energy burst
   */
  emitCollision(x: number, y: number): void {
    const count = 10;

    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.3;
      const speed = 0.02 + Math.random() * 0.025;

      const colors = [this.colors.energyBlue, this.colors.energyCyan, this.colors.warningOrange];
      const color = colors[Math.floor(Math.random() * colors.length)];

      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.3 + Math.random() * 0.2,
        maxLife: 0.5,
        size: 0.01 + Math.random() * 0.008,
        type: 'collision',
        color: [...color] as [number, number, number, number],
      });
    }
  }

  /**
   * Platform drag plasma trail
   */
  emitDrag(x: number, y: number): void {
    if (Math.random() > 0.4) return;
    if (this.particles.length >= this.maxParticles) return;

    const color = Math.random() > 0.5 ? this.colors.plasmaPurple : this.colors.energyBlue;

    this.particles.push({
      x: x + (Math.random() - 0.5) * 0.02,
      y: y + (Math.random() - 0.5) * 0.02,
      vx: (Math.random() - 0.5) * 0.008,
      vy: (Math.random() - 0.5) * 0.008,
      life: 0.4 + Math.random() * 0.2,
      maxLife: 0.6,
      size: 0.012 + Math.random() * 0.008,
      type: 'drag',
      color: [...color] as [number, number, number, number],
    });
  }

  /**
   * Victory celebration - holographic confetti
   */
  emitVictory(centerX: number, centerY: number): void {
    const count = 45;

    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const angle = (i / count) * Math.PI * 2;
      const speed = 0.02 + Math.random() * 0.025;

      const colors = [
        this.colors.energyCyan,
        this.colors.successGreen,
        this.colors.energyBlue,
        this.colors.plasmaPurple,
      ];
      const color = colors[Math.floor(Math.random() * colors.length)];

      this.particles.push({
        x: centerX,
        y: centerY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 0.01,
        life: 1.5 + Math.random() * 0.5,
        maxLife: 2.0,
        size: 0.012 + Math.random() * 0.01,
        type: 'victory',
        color: [...color] as [number, number, number, number],
      });
    }

    // Energy burst from center
    for (let i = 0; i < 15; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const angle = (i / 15) * Math.PI * 2;

      this.particles.push({
        x: centerX,
        y: centerY,
        vx: Math.cos(angle) * 0.015,
        vy: Math.sin(angle) * 0.015,
        life: 0.4,
        maxLife: 0.4,
        size: 0.015,
        type: 'landing',
        color: [...this.colors.starWhite] as [number, number, number, number],
      });
    }
  }

  /**
   * Ambient floating debris
   */
  emitAmbient(): void {
    if (Math.random() > 0.015) return;
    if (this.particles.length >= this.maxParticles) return;

    const x = Math.random();
    const y = Math.random();

    const color = Math.random() > 0.7 ? this.colors.starWhite : this.colors.metalGray;

    this.particles.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 0.001,
      vy: (Math.random() - 0.5) * 0.001,
      life: 4.0 + Math.random() * 3.0,
      maxLife: 7.0,
      size: 0.003 + Math.random() * 0.003,
      type: 'ambient',
      color: [...color] as [number, number, number, number],
    });
  }

  /**
   * Block landing shockwave
   */
  emitLanding(x: number, y: number): void {
    const count = 8;

    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const angle = (i / count) * Math.PI * 2;

      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * 0.02,
        vy: Math.sin(angle) * 0.02,
        life: 0.3 + Math.random() * 0.1,
        maxLife: 0.4,
        size: 0.008,
        type: 'landing',
        color: [...this.colors.successGreen] as [number, number, number, number],
      });
    }
  }

  /**
   * Block bounce effect
   */
  emitBounce(x: number, y: number): void {
    const count = 5;

    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const angle = Math.random() * Math.PI * 2;
      const speed = 0.01 + Math.random() * 0.015;

      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.2 + Math.random() * 0.1,
        maxLife: 0.3,
        size: 0.006 + Math.random() * 0.004,
        type: 'collision',
        color: [...this.colors.warningOrange] as [number, number, number, number],
      });
    }
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
