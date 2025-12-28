/**
 * Particle System - Mirror Puzzle
 * Crystal Palace / Prism Chamber Theme
 * Game #035
 */

export type ParticleType =
  | 'reflect'  // Light beam reflection spark
  | 'drag'     // Crystal dust while dragging mirror
  | 'victory'  // Rainbow explosion
  | 'ambient'  // Floating crystal motes
  | 'beamHit'; // Light hitting target

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

  // Crystal/prism color palette
  private readonly colors = {
    prismRed: [1.0, 0.3, 0.3, 1.0] as [number, number, number, number],
    prismOrange: [1.0, 0.6, 0.2, 1.0] as [number, number, number, number],
    prismYellow: [1.0, 0.95, 0.4, 1.0] as [number, number, number, number],
    prismGreen: [0.3, 1.0, 0.5, 1.0] as [number, number, number, number],
    prismCyan: [0.3, 0.9, 1.0, 1.0] as [number, number, number, number],
    prismBlue: [0.4, 0.5, 1.0, 1.0] as [number, number, number, number],
    prismPurple: [0.7, 0.4, 1.0, 1.0] as [number, number, number, number],
    crystalWhite: [0.95, 0.98, 1.0, 1.0] as [number, number, number, number],
    crystalIce: [0.8, 0.92, 1.0, 0.8] as [number, number, number, number],
    diamondSparkle: [1.0, 1.0, 1.0, 1.0] as [number, number, number, number],
  };

  private readonly rainbowColors: [number, number, number, number][];

  constructor() {
    this.rainbowColors = [
      this.colors.prismRed,
      this.colors.prismOrange,
      this.colors.prismYellow,
      this.colors.prismGreen,
      this.colors.prismCyan,
      this.colors.prismBlue,
      this.colors.prismPurple,
    ];
  }

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
        case 'reflect':
          // Prismatic burst spreads then fades
          p.vx *= 0.92;
          p.vy *= 0.92;
          p.size *= 0.97;
          break;

        case 'drag':
          // Crystal dust floats gently
          p.vy -= 0.003; // Slight rise
          p.vx += Math.sin(p.life * 8) * 0.001;
          p.size *= 0.99;
          break;

        case 'victory':
          // Rainbow burst expands
          p.vy -= 0.005; // Rise slightly
          p.vx *= 0.98;
          break;

        case 'ambient':
          // Gentle floating
          p.vx += Math.sin(p.life * 2) * 0.0003;
          p.vy += Math.cos(p.life * 1.5) * 0.0002;
          break;

        case 'beamHit':
          // Quick bright flash
          p.vx *= 0.85;
          p.vy *= 0.85;
          p.size *= 0.94;
          break;
      }

      // Update alpha based on life
      const lifeRatio = p.life / p.maxLife;
      p.color[3] = lifeRatio;
    }
  }

  /**
   * Light beam reflection effect - prismatic spark
   */
  emitReflect(x: number, y: number): void {
    const count = 12;

    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const angle = (i / count) * Math.PI * 2;
      const speed = 0.02 + Math.random() * 0.025;

      // Rainbow colors
      const color = this.rainbowColors[i % this.rainbowColors.length];

      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.4 + Math.random() * 0.2,
        maxLife: 0.6,
        size: 0.01 + Math.random() * 0.008,
        type: 'reflect',
        color: [...color] as [number, number, number, number],
      });
    }
  }

  /**
   * Crystal dust while dragging mirror
   */
  emitDrag(x: number, y: number): void {
    if (Math.random() > 0.35) return;
    if (this.particles.length >= this.maxParticles) return;

    const color = Math.random() > 0.5 ? this.colors.crystalWhite : this.colors.crystalIce;

    this.particles.push({
      x: x + (Math.random() - 0.5) * 0.03,
      y: y + (Math.random() - 0.5) * 0.03,
      vx: (Math.random() - 0.5) * 0.008,
      vy: -0.005 - Math.random() * 0.005,
      life: 0.5 + Math.random() * 0.3,
      maxLife: 0.8,
      size: 0.008 + Math.random() * 0.006,
      type: 'drag',
      color: [...color] as [number, number, number, number],
    });
  }

  /**
   * Victory celebration - rainbow explosion
   */
  emitVictory(centerX: number, centerY: number): void {
    const count = 50;

    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const angle = (i / count) * Math.PI * 2;
      const speed = 0.02 + Math.random() * 0.03;

      // Full rainbow spectrum
      const color = this.rainbowColors[i % this.rainbowColors.length];

      this.particles.push({
        x: centerX,
        y: centerY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 0.01,
        life: 1.5 + Math.random() * 0.5,
        maxLife: 2.0,
        size: 0.015 + Math.random() * 0.01,
        type: 'victory',
        color: [...color] as [number, number, number, number],
      });
    }

    // Diamond sparkle burst
    for (let i = 0; i < 20; i++) {
      if (this.particles.length >= this.maxParticles) break;

      this.particles.push({
        x: centerX + (Math.random() - 0.5) * 0.15,
        y: centerY + (Math.random() - 0.5) * 0.15,
        vx: (Math.random() - 0.5) * 0.025,
        vy: -0.015 - Math.random() * 0.02,
        life: 1.0 + Math.random() * 0.5,
        maxLife: 1.5,
        size: 0.008 + Math.random() * 0.006,
        type: 'victory',
        color: [...this.colors.diamondSparkle] as [number, number, number, number],
      });
    }
  }

  /**
   * Ambient floating crystal motes
   */
  emitAmbient(): void {
    if (Math.random() > 0.02) return;
    if (this.particles.length >= this.maxParticles) return;

    const x = Math.random();
    const y = Math.random();

    const colors = [this.colors.crystalIce, this.colors.prismCyan, this.colors.prismBlue];
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
   * Beam hitting target
   */
  emitBeamHit(x: number, y: number): void {
    const count = 8;

    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.3;
      const speed = 0.015 + Math.random() * 0.02;

      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.3 + Math.random() * 0.15,
        maxLife: 0.45,
        size: 0.012 + Math.random() * 0.008,
        type: 'beamHit',
        color: [...this.colors.prismYellow] as [number, number, number, number],
      });
    }
  }

  /**
   * Mirror rotation effect
   */
  emitRotate(x: number, y: number): void {
    const count = 6;

    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const angle = (i / count) * Math.PI * 2;
      const color = this.rainbowColors[i % this.rainbowColors.length];

      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * 0.015,
        vy: Math.sin(angle) * 0.015,
        life: 0.3,
        maxLife: 0.3,
        size: 0.008,
        type: 'reflect',
        color: [...color] as [number, number, number, number],
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
