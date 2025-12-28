/**
 * Particle System - Gear Puzzle
 * Victorian Steampunk Workshop Theme
 * Game #034
 */

export type ParticleType =
  | 'mesh'     // Gear meshing spark
  | 'drag'     // Steam trail while dragging
  | 'victory'  // Brass confetti celebration
  | 'ambient'  // Oil drops and dust
  | 'steam';   // Steam burst

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

  // Steampunk color palette
  private readonly colors = {
    spark: [1.0, 0.7, 0.2, 1.0] as [number, number, number, number],
    sparkBright: [1.0, 0.9, 0.5, 1.0] as [number, number, number, number],
    brass: [0.71, 0.55, 0.25, 1.0] as [number, number, number, number],
    copper: [0.72, 0.45, 0.20, 1.0] as [number, number, number, number],
    bronze: [0.8, 0.5, 0.2, 1.0] as [number, number, number, number],
    steam: [0.9, 0.88, 0.85, 0.6] as [number, number, number, number],
    steamDark: [0.7, 0.68, 0.65, 0.4] as [number, number, number, number],
    oil: [0.15, 0.12, 0.1, 0.8] as [number, number, number, number],
    dust: [0.5, 0.45, 0.35, 0.4] as [number, number, number, number],
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
        case 'mesh':
          // Sparks fly outward then fall
          p.vy += 0.02; // Gravity
          p.vx *= 0.95;
          p.size *= 0.97;
          break;

        case 'drag':
          // Steam rises and dissipates
          p.vy -= 0.005; // Rise
          p.vx *= 0.98;
          p.size *= 1.02; // Expand
          break;

        case 'victory':
          // Confetti flutters down
          p.vy += 0.008; // Gravity
          p.vx += Math.sin(p.life * 10) * 0.002; // Flutter
          p.vx *= 0.99;
          break;

        case 'ambient':
          // Slow drift
          p.vx += Math.sin(p.life * 2) * 0.0002;
          p.vy += Math.cos(p.life * 1.5) * 0.0001;
          break;

        case 'steam':
          // Large steam cloud rises
          p.vy -= 0.01;
          p.vx += Math.sin(p.life * 5) * 0.002;
          p.size *= 1.01;
          break;
      }

      // Update alpha based on life
      const lifeRatio = p.life / p.maxLife;
      p.color[3] = lifeRatio * (p.type === 'steam' ? 0.5 : 1.0);
    }
  }

  /**
   * Gear meshing spark effect
   */
  emitMesh(x: number, y: number): void {
    const count = 8;

    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.5;
      const speed = 0.02 + Math.random() * 0.03;

      const color = Math.random() > 0.3 ? this.colors.spark : this.colors.sparkBright;

      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 0.02,
        life: 0.3 + Math.random() * 0.2,
        maxLife: 0.5,
        size: 0.008 + Math.random() * 0.006,
        type: 'mesh',
        color: [...color] as [number, number, number, number],
      });
    }
  }

  /**
   * Steam trail while dragging gear
   */
  emitDrag(x: number, y: number): void {
    if (Math.random() > 0.3) return;
    if (this.particles.length >= this.maxParticles) return;

    const color = Math.random() > 0.5 ? this.colors.steam : this.colors.steamDark;

    this.particles.push({
      x: x + (Math.random() - 0.5) * 0.02,
      y: y + (Math.random() - 0.5) * 0.02,
      vx: (Math.random() - 0.5) * 0.005,
      vy: -0.005 - Math.random() * 0.005,
      life: 0.5 + Math.random() * 0.3,
      maxLife: 0.8,
      size: 0.015 + Math.random() * 0.01,
      type: 'drag',
      color: [...color] as [number, number, number, number],
    });
  }

  /**
   * Victory celebration - brass confetti
   */
  emitVictory(centerX: number, centerY: number): void {
    const count = 40;

    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const angle = (i / count) * Math.PI * 2;
      const speed = 0.02 + Math.random() * 0.025;

      const colors = [this.colors.brass, this.colors.copper, this.colors.bronze, this.colors.sparkBright];
      const color = colors[Math.floor(Math.random() * colors.length)];

      this.particles.push({
        x: centerX,
        y: centerY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 0.02,
        life: 1.5 + Math.random() * 0.5,
        maxLife: 2.0,
        size: 0.012 + Math.random() * 0.008,
        type: 'victory',
        color: [...color] as [number, number, number, number],
      });
    }

    // Steam burst
    for (let i = 0; i < 15; i++) {
      if (this.particles.length >= this.maxParticles) break;

      this.particles.push({
        x: centerX + (Math.random() - 0.5) * 0.1,
        y: centerY + (Math.random() - 0.5) * 0.1,
        vx: (Math.random() - 0.5) * 0.02,
        vy: -0.02 - Math.random() * 0.02,
        life: 1.0 + Math.random() * 0.5,
        maxLife: 1.5,
        size: 0.03 + Math.random() * 0.02,
        type: 'steam',
        color: [...this.colors.steam] as [number, number, number, number],
      });
    }
  }

  /**
   * Ambient oil drops and dust
   */
  emitAmbient(): void {
    if (Math.random() > 0.015) return;
    if (this.particles.length >= this.maxParticles) return;

    const x = Math.random();
    const y = Math.random();

    const isOil = Math.random() > 0.7;
    const color = isOil ? this.colors.oil : this.colors.dust;

    this.particles.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 0.001,
      vy: isOil ? 0.002 : (Math.random() - 0.5) * 0.001,
      life: 3.0 + Math.random() * 2.0,
      maxLife: 5.0,
      size: 0.003 + Math.random() * 0.003,
      type: 'ambient',
      color: [...color] as [number, number, number, number],
    });
  }

  /**
   * Connection made steam burst
   */
  emitConnection(x: number, y: number): void {
    const count = 5;

    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.3;

      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * 0.01,
        vy: Math.sin(angle) * 0.01 - 0.01,
        life: 0.6 + Math.random() * 0.3,
        maxLife: 0.9,
        size: 0.02 + Math.random() * 0.015,
        type: 'steam',
        color: [...this.colors.steam] as [number, number, number, number],
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
