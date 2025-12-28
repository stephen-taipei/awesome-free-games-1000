/**
 * Particle System - Warehouse Keeper
 * Cargo Teleportation Theme
 * Game #022
 */

export type ParticleType =
  | 'push'      // Crate push effect
  | 'land'      // Crate lands on target
  | 'teleport'  // Teleportation energy
  | 'complete'  // Level complete
  | 'ambient';  // Background particles

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
  private readonly maxParticles = 250;

  // Cargo teleportation colors
  private readonly colors = {
    orange: [1.0, 0.5, 0.0, 1.0] as [number, number, number, number],
    gold: [1.0, 0.8, 0.2, 1.0] as [number, number, number, number],
    green: [0.2, 1.0, 0.4, 1.0] as [number, number, number, number],
    cyan: [0.0, 0.8, 1.0, 1.0] as [number, number, number, number],
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
        case 'push':
          p.vx *= 0.92;
          p.vy *= 0.92;
          p.size *= 0.96;
          break;

        case 'land':
          p.vx *= 0.9;
          p.vy *= 0.9;
          break;

        case 'teleport':
          p.vx *= 0.95;
          p.vy *= 0.95;
          p.size *= 0.98;
          break;

        case 'complete':
          p.vy -= 0.0003;
          p.vx *= 0.98;
          break;

        case 'ambient':
          p.vx += Math.sin(p.life * 2) * 0.0001;
          p.vy += Math.cos(p.life * 2) * 0.0001;
          break;
      }

      const lifeRatio = p.life / p.maxLife;
      p.color[3] = lifeRatio;
    }
  }

  /**
   * Crate push burst
   */
  emitPush(x: number, y: number, dx: number, dy: number): void {
    const count = 8;

    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const spread = 0.4;
      const angle = Math.atan2(dy, dx) + (Math.random() - 0.5) * spread;
      const speed = 0.04 + Math.random() * 0.03;

      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.25 + Math.random() * 0.1,
        maxLife: 0.35,
        size: 0.012 + Math.random() * 0.006,
        type: 'push',
        color: [...this.colors.orange] as [number, number, number, number],
      });
    }
  }

  /**
   * Crate lands on target
   */
  emitLand(x: number, y: number): void {
    const count = 15;

    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const angle = (i / count) * Math.PI * 2;
      const speed = 0.04 + Math.random() * 0.03;

      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.4 + Math.random() * 0.2,
        maxLife: 0.6,
        size: 0.015 + Math.random() * 0.008,
        type: 'land',
        color: [...this.colors.green] as [number, number, number, number],
      });
    }

    // Center sparkle
    for (let i = 0; i < 5; i++) {
      if (this.particles.length >= this.maxParticles) break;

      this.particles.push({
        x: x + (Math.random() - 0.5) * 0.02,
        y: y + (Math.random() - 0.5) * 0.02,
        vx: (Math.random() - 0.5) * 0.02,
        vy: -0.03 - Math.random() * 0.02,
        life: 0.35,
        maxLife: 0.35,
        size: 0.01,
        type: 'land',
        color: [...this.colors.white] as [number, number, number, number],
      });
    }
  }

  /**
   * Player teleportation effect
   */
  emitTeleport(x: number, y: number): void {
    const count = 12;

    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const angle = (i / count) * Math.PI * 2;
      const speed = 0.02 + Math.random() * 0.015;

      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.3 + Math.random() * 0.15,
        maxLife: 0.45,
        size: 0.01 + Math.random() * 0.005,
        type: 'teleport',
        color: [...this.colors.cyan] as [number, number, number, number],
      });
    }
  }

  /**
   * Level complete celebration
   */
  emitComplete(centerX: number, centerY: number): void {
    // Main burst
    for (let i = 0; i < 40; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const angle = Math.random() * Math.PI * 2;
      const speed = 0.06 + Math.random() * 0.06;

      const t = i / 40;
      const color: [number, number, number, number] = [
        1.0 - t * 0.8,
        0.5 + t * 0.5,
        t * 0.4,
        1.0,
      ];

      this.particles.push({
        x: centerX,
        y: centerY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1.0 + Math.random() * 0.5,
        maxLife: 1.5,
        size: 0.018 + Math.random() * 0.01,
        type: 'complete',
        color,
      });
    }

    // Ring of sparkles
    for (let i = 0; i < 12; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const angle = (i / 12) * Math.PI * 2;
      const radius = 0.1;

      this.particles.push({
        x: centerX + Math.cos(angle) * radius,
        y: centerY + Math.sin(angle) * radius,
        vx: Math.cos(angle) * 0.03,
        vy: Math.sin(angle) * 0.03,
        life: 0.7,
        maxLife: 0.7,
        size: 0.015,
        type: 'complete',
        color: [...this.colors.gold] as [number, number, number, number],
      });
    }
  }

  /**
   * Ambient warehouse particles
   */
  emitAmbient(): void {
    if (Math.random() > 0.025) return;
    if (this.particles.length >= this.maxParticles) return;

    const colors = [this.colors.orange, this.colors.gold];
    const color = colors[Math.floor(Math.random() * colors.length)];

    this.particles.push({
      x: Math.random(),
      y: Math.random(),
      vx: (Math.random() - 0.5) * 0.003,
      vy: (Math.random() - 0.5) * 0.003,
      life: 2.0 + Math.random() * 1.5,
      maxLife: 3.5,
      size: 0.004 + Math.random() * 0.003,
      type: 'ambient',
      color: [color[0] * 0.3, color[1] * 0.3, color[2] * 0.3, 0.25],
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
