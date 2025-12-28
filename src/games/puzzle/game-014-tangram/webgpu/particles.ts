/**
 * Particle Effects System - Tangram
 * Holographic Origami Theme
 * Game #014
 */

export type ParticleType =
  | 'trail'    // Drag trail
  | 'rotate'   // Rotation burst
  | 'snap'     // Snap/place effect
  | 'ambient'; // Holographic dust

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
  private readonly maxParticles = 1200;

  // Holographic colors
  private readonly holoColors = {
    pink: [1.0, 0.4, 0.8, 1.0] as [number, number, number, number],
    purple: [0.7, 0.3, 1.0, 1.0] as [number, number, number, number],
    cyan: [0.3, 0.9, 1.0, 1.0] as [number, number, number, number],
    gold: [1.0, 0.85, 0.4, 1.0] as [number, number, number, number],
    white: [1.0, 0.95, 1.0, 1.0] as [number, number, number, number],
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
        case 'trail':
          p.vx *= 0.92;
          p.vy *= 0.92;
          p.size *= 0.96;
          break;

        case 'rotate':
          p.vx *= 0.88;
          p.vy *= 0.88;
          p.size *= 0.94;
          break;

        case 'snap':
          p.vx *= 0.85;
          p.vy *= 0.85;
          break;

        case 'ambient':
          p.vy += 0.005 * dt;
          p.vx += Math.sin(p.life * 5) * 0.001;
          break;
      }

      // Update alpha based on life
      const lifeRatio = p.life / p.maxLife;
      p.color[3] = lifeRatio;
    }
  }

  /**
   * Drag trail effect - holographic sparkles following piece
   */
  emitTrail(x: number, y: number, color: [number, number, number]): void {
    if (Math.random() > 0.6) return;
    if (this.particles.length >= this.maxParticles) return;

    // Mix piece color with holographic tint
    const holoTint = this.holoColors.purple;
    const mixedColor: [number, number, number, number] = [
      (color[0] + holoTint[0]) * 0.5,
      (color[1] + holoTint[1]) * 0.5,
      (color[2] + holoTint[2]) * 0.5,
      1.0,
    ];

    this.particles.push({
      x: x + (Math.random() - 0.5) * 0.03,
      y: y + (Math.random() - 0.5) * 0.03,
      vx: (Math.random() - 0.5) * 0.02,
      vy: (Math.random() - 0.5) * 0.02,
      life: 0.4 + Math.random() * 0.3,
      maxLife: 0.7,
      size: 0.015 + Math.random() * 0.01,
      type: 'trail',
      color: mixedColor,
    });
  }

  /**
   * Rotation effect - burst when double-tapping
   */
  emitRotate(x: number, y: number, color: [number, number, number]): void {
    const count = 16;

    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const angle = (i / count) * Math.PI * 2;
      const speed = 0.1 + Math.random() * 0.1;

      // Holographic color shift
      const hue = i / count;
      const holoColor: [number, number, number, number] = [
        Math.sin(hue * Math.PI * 2) * 0.3 + color[0],
        Math.sin(hue * Math.PI * 2 + 2.094) * 0.3 + color[1],
        Math.sin(hue * Math.PI * 2 + 4.188) * 0.3 + color[2],
        1.0,
      ];

      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.5 + Math.random() * 0.2,
        maxLife: 0.7,
        size: 0.02 + Math.random() * 0.015,
        type: 'rotate',
        color: holoColor,
      });
    }

    // Center flash
    this.particles.push({
      x,
      y,
      vx: 0,
      vy: 0,
      life: 0.2,
      maxLife: 0.2,
      size: 0.05,
      type: 'rotate',
      color: [...this.holoColors.white] as [number, number, number, number],
    });
  }

  /**
   * Snap/place effect - geometric burst
   */
  emitSnap(x: number, y: number): void {
    const count = 12;

    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const angle = (i / count) * Math.PI * 2;
      const speed = 0.08;

      const colors = [this.holoColors.cyan, this.holoColors.pink, this.holoColors.gold];
      const color = colors[i % colors.length];

      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.4,
        maxLife: 0.4,
        size: 0.018,
        type: 'snap',
        color: [...color] as [number, number, number, number],
      });
    }
  }

  /**
   * Pick up effect - when selecting a piece
   */
  emitPickUp(x: number, y: number, color: [number, number, number]): void {
    const count = 8;

    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const angle = (i / count) * Math.PI * 2;
      const speed = 0.06;

      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.3,
        maxLife: 0.3,
        size: 0.015,
        type: 'trail',
        color: [color[0], color[1], color[2], 1.0],
      });
    }
  }

  /**
   * Victory celebration - multi-color holographic burst
   */
  emitVictory(centerX: number, centerY: number): void {
    for (let i = 0; i < 60; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const angle = Math.random() * Math.PI * 2;
      const speed = 0.15 + Math.random() * 0.25;

      const hue = Math.random();
      const color: [number, number, number, number] = [
        Math.sin(hue * Math.PI * 2) * 0.5 + 0.5,
        Math.sin(hue * Math.PI * 2 + 2.094) * 0.5 + 0.5,
        Math.sin(hue * Math.PI * 2 + 4.188) * 0.5 + 0.5,
        1.0,
      ];

      this.particles.push({
        x: centerX,
        y: centerY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1.0 + Math.random() * 0.5,
        maxLife: 1.5,
        size: 0.025 + Math.random() * 0.02,
        type: 'snap',
        color,
      });
    }

    // Sparkle ring
    for (let i = 0; i < 24; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const angle = (i / 24) * Math.PI * 2;
      const dist = 0.15;

      this.particles.push({
        x: centerX + Math.cos(angle) * dist,
        y: centerY + Math.sin(angle) * dist,
        vx: Math.cos(angle) * 0.08,
        vy: Math.sin(angle) * 0.08,
        life: 0.8,
        maxLife: 0.8,
        size: 0.03,
        type: 'rotate',
        color: [...this.holoColors.white] as [number, number, number, number],
      });
    }
  }

  /**
   * Ambient holographic dust
   */
  emitAmbient(): void {
    if (Math.random() > 0.02) return;
    if (this.particles.length >= this.maxParticles) return;

    const colors = [
      this.holoColors.pink,
      this.holoColors.purple,
      this.holoColors.cyan,
    ];
    const color = colors[Math.floor(Math.random() * colors.length)];

    this.particles.push({
      x: Math.random(),
      y: Math.random(),
      vx: (Math.random() - 0.5) * 0.01,
      vy: -0.005 - Math.random() * 0.01,
      life: 3 + Math.random() * 2,
      maxLife: 5,
      size: 0.006 + Math.random() * 0.004,
      type: 'ambient',
      color: [color[0] * 0.4, color[1] * 0.4, color[2] * 0.4, 0.4],
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
