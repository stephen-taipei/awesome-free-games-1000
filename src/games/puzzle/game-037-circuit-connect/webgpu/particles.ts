/**
 * Particle System - Circuit Connect
 * Neon Circuit Board / Cyberpunk Electronics Theme
 * Game #037
 */

export type ParticleType =
  | 'spark'    // Electric spark on rotation
  | 'rotate'   // Rotation trail
  | 'victory'  // Level complete
  | 'ambient'  // Floating data motes
  | 'power';   // Power connection pulse

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

  // Cyberpunk circuit color palette
  private readonly colors = {
    neonCyan: [0.0, 1.0, 0.8, 1.0] as [number, number, number, number],
    electricYellow: [1.0, 0.9, 0.0, 1.0] as [number, number, number, number],
    powerRed: [1.0, 0.2, 0.2, 1.0] as [number, number, number, number],
    dataGreen: [0.0, 1.0, 0.4, 1.0] as [number, number, number, number],
    copperOrange: [1.0, 0.6, 0.2, 1.0] as [number, number, number, number],
    circuitBlue: [0.2, 0.5, 1.0, 1.0] as [number, number, number, number],
    white: [1.0, 1.0, 1.0, 1.0] as [number, number, number, number],
    digitalPurple: [0.6, 0.2, 1.0, 1.0] as [number, number, number, number],
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
        case 'spark':
          // Electric dissipation
          p.vx *= 0.88;
          p.vy *= 0.88;
          p.size *= 0.95;
          break;

        case 'rotate':
          // Circular fade
          p.vx *= 0.92;
          p.vy *= 0.92;
          p.size *= 0.97;
          break;

        case 'victory':
          // Data burst expansion
          p.vy -= 0.002; // Slight upward drift
          p.vx += Math.sin(p.life * 10) * 0.001;
          break;

        case 'ambient':
          // Digital drift
          p.vx += Math.sin(p.life * 2) * 0.0001;
          p.vy += Math.cos(p.life * 1.5) * 0.0001;
          break;

        case 'power':
          // Energy expansion
          p.size *= 1.03;
          p.vx *= 0.9;
          p.vy *= 0.9;
          break;
      }

      // Update alpha based on life
      const lifeRatio = p.life / p.maxLife;
      p.color[3] = lifeRatio;
    }
  }

  /**
   * Electric spark on wire rotation
   */
  emitSpark(x: number, y: number): void {
    const count = 12;

    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.4;
      const speed = 0.02 + Math.random() * 0.025;

      const colors = [this.colors.neonCyan, this.colors.electricYellow, this.colors.white];
      const color = colors[Math.floor(Math.random() * colors.length)];

      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.25 + Math.random() * 0.15,
        maxLife: 0.4,
        size: 0.01 + Math.random() * 0.008,
        type: 'spark',
        color: [...color] as [number, number, number, number],
      });
    }
  }

  /**
   * Wire rotation effect
   */
  emitRotate(x: number, y: number): void {
    const count = 8;

    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const angle = (i / count) * Math.PI * 2;
      const speed = 0.015;

      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.3 + Math.random() * 0.1,
        maxLife: 0.4,
        size: 0.012 + Math.random() * 0.006,
        type: 'rotate',
        color: [...this.colors.circuitBlue] as [number, number, number, number],
      });
    }
  }

  /**
   * Power connection established
   */
  emitPower(x: number, y: number): void {
    const count = 6;

    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const angle = (i / count) * Math.PI * 2;
      const speed = 0.012;

      const color = Math.random() > 0.5 ? this.colors.electricYellow : this.colors.powerRed;

      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.4 + Math.random() * 0.2,
        maxLife: 0.6,
        size: 0.015,
        type: 'power',
        color: [...color] as [number, number, number, number],
      });
    }
  }

  /**
   * Victory celebration - data burst
   */
  emitVictory(centerX: number, centerY: number): void {
    const count = 50;

    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const angle = (i / count) * Math.PI * 2;
      const speed = 0.02 + Math.random() * 0.03;

      const colors = [
        this.colors.neonCyan,
        this.colors.electricYellow,
        this.colors.dataGreen,
        this.colors.digitalPurple,
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

    // Central energy burst
    for (let i = 0; i < 12; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const angle = (i / 12) * Math.PI * 2;

      this.particles.push({
        x: centerX,
        y: centerY,
        vx: Math.cos(angle) * 0.018,
        vy: Math.sin(angle) * 0.018,
        life: 0.4,
        maxLife: 0.4,
        size: 0.018,
        type: 'power',
        color: [...this.colors.white] as [number, number, number, number],
      });
    }
  }

  /**
   * Ambient floating data motes
   */
  emitAmbient(): void {
    if (Math.random() > 0.02) return;
    if (this.particles.length >= this.maxParticles) return;

    const x = Math.random();
    const y = Math.random();

    const colors = [this.colors.neonCyan, this.colors.dataGreen, this.colors.circuitBlue];
    const color = colors[Math.floor(Math.random() * colors.length)];

    this.particles.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 0.001,
      vy: (Math.random() - 0.5) * 0.001,
      life: 3.0 + Math.random() * 2.0,
      maxLife: 5.0,
      size: 0.004 + Math.random() * 0.003,
      type: 'ambient',
      color: [...color] as [number, number, number, number],
    });
  }

  /**
   * Connection spark trail
   */
  emitConnectionTrail(x: number, y: number): void {
    if (Math.random() > 0.3) return;
    if (this.particles.length >= this.maxParticles) return;

    this.particles.push({
      x: x + (Math.random() - 0.5) * 0.02,
      y: y + (Math.random() - 0.5) * 0.02,
      vx: (Math.random() - 0.5) * 0.005,
      vy: (Math.random() - 0.5) * 0.005,
      life: 0.3 + Math.random() * 0.2,
      maxLife: 0.5,
      size: 0.008 + Math.random() * 0.005,
      type: 'spark',
      color: [...this.colors.electricYellow] as [number, number, number, number],
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
