/**
 * Particle System - Hexagon Match
 * Crystalline Honeycomb Theme
 * Game #029
 */

export type ParticleType =
  | 'place'     // Hex placed
  | 'clear'     // Line cleared
  | 'drag'      // Dragging trail
  | 'ambient';  // Crystal dust

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

  // Crystalline honeycomb colors
  private readonly colors = {
    gold: [1.0, 0.85, 0.3, 1.0] as [number, number, number, number],
    amber: [1.0, 0.65, 0.15, 1.0] as [number, number, number, number],
    honey: [0.9, 0.7, 0.2, 1.0] as [number, number, number, number],
    crystal: [1.0, 0.95, 0.8, 1.0] as [number, number, number, number],
    warm: [1.0, 0.5, 0.2, 1.0] as [number, number, number, number],
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
        case 'place':
          p.vx *= 0.92;
          p.vy *= 0.92;
          p.size *= 0.96;
          break;

        case 'clear':
          p.vy -= 0.01;
          p.vx *= 0.98;
          p.size *= 0.98;
          break;

        case 'drag':
          p.size *= 0.9;
          p.vx *= 0.85;
          p.vy *= 0.85;
          break;

        case 'ambient':
          p.vy += Math.sin(p.life * 3) * 0.0005;
          p.vx += Math.cos(p.life * 2) * 0.0003;
          break;
      }

      const lifeRatio = p.life / p.maxLife;
      p.color[3] = lifeRatio;
    }
  }

  /**
   * Hex placement effect
   */
  emitPlace(x: number, y: number, hexColor: string): void {
    const count = 15;

    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hexColor);
    let color: [number, number, number, number] = this.colors.gold;
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

      // Hexagonal burst pattern
      const angle = (i / 6) * Math.PI * 2 + Math.PI / 6;
      const speed = 0.02 + Math.random() * 0.02;

      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.4 + Math.random() * 0.2,
        maxLife: 0.6,
        size: 0.015 + Math.random() * 0.01,
        type: 'place',
        color: [...color] as [number, number, number, number],
      });
    }
  }

  /**
   * Line clear celebration
   */
  emitClear(x: number, y: number): void {
    const count = 25;

    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const angle = (i / count) * Math.PI * 2;
      const speed = 0.03 + Math.random() * 0.04;

      const colors = [this.colors.gold, this.colors.crystal, this.colors.honey];
      const color = colors[Math.floor(Math.random() * colors.length)];

      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 0.02,
        life: 0.6 + Math.random() * 0.3,
        maxLife: 0.9,
        size: 0.012 + Math.random() * 0.01,
        type: 'clear',
        color: [...color] as [number, number, number, number],
      });
    }
  }

  /**
   * Drag trail sparkle
   */
  emitDragTrail(x: number, y: number): void {
    if (Math.random() > 0.3) return;
    if (this.particles.length >= this.maxParticles) return;

    const color = Math.random() > 0.5 ? this.colors.gold : this.colors.crystal;

    this.particles.push({
      x: x + (Math.random() - 0.5) * 0.02,
      y: y + (Math.random() - 0.5) * 0.02,
      vx: (Math.random() - 0.5) * 0.005,
      vy: (Math.random() - 0.5) * 0.005,
      life: 0.3 + Math.random() * 0.2,
      maxLife: 0.5,
      size: 0.006 + Math.random() * 0.004,
      type: 'drag',
      color: [...color] as [number, number, number, number],
    });
  }

  /**
   * Ambient crystal dust
   */
  emitAmbient(): void {
    if (Math.random() > 0.02) return;
    if (this.particles.length >= this.maxParticles) return;

    const x = Math.random();
    const y = 0.2 + Math.random() * 0.6;

    const colors = [this.colors.gold, this.colors.amber, this.colors.crystal];
    const color = colors[Math.floor(Math.random() * colors.length)];

    this.particles.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 0.002,
      vy: -0.003 - Math.random() * 0.003,
      life: 2.0 + Math.random() * 1.5,
      maxLife: 3.5,
      size: 0.004 + Math.random() * 0.003,
      type: 'ambient',
      color: [...color] as [number, number, number, number],
    });
  }

  /**
   * Game over scatter
   */
  emitGameOver(centerX: number, centerY: number): void {
    const count = 40;

    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const angle = Math.random() * Math.PI * 2;
      const speed = 0.02 + Math.random() * 0.05;

      this.particles.push({
        x: centerX,
        y: centerY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.8 + Math.random() * 0.5,
        maxLife: 1.3,
        size: 0.008 + Math.random() * 0.008,
        type: 'clear',
        color: [...this.colors.warm] as [number, number, number, number],
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
