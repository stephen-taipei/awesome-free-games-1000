/**
 * Particle System - Memory Match
 * Neural Sync Theme
 * Game #016
 */

export type ParticleType =
  | 'flip'       // Card flip sparkles
  | 'match'      // Successful match
  | 'neural'     // Neural connection
  | 'win'        // Victory celebration
  | 'ambient';   // Background synapses

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
  private readonly maxParticles = 600;

  // Neural theme colors
  private readonly colors = {
    synapse: [0.4, 0.7, 1.0, 1.0] as [number, number, number, number],
    match: [0.4, 1.0, 0.6, 1.0] as [number, number, number, number],
    pulse: [0.8, 0.5, 1.0, 1.0] as [number, number, number, number],
    gold: [1.0, 0.9, 0.4, 1.0] as [number, number, number, number],
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

      // Update position
      p.x += p.vx * dt;
      p.y += p.vy * dt;

      // Type-specific behavior
      switch (p.type) {
        case 'flip':
          p.vx *= 0.92;
          p.vy *= 0.92;
          p.size *= 0.96;
          break;

        case 'match':
          p.vx *= 0.95;
          p.vy *= 0.95;
          break;

        case 'neural':
          p.vx *= 0.98;
          p.vy *= 0.98;
          p.size *= 0.98;
          break;

        case 'win':
          p.vy -= 0.05 * dt; // Slight gravity
          break;

        case 'ambient':
          // Gentle floating
          p.vx += Math.sin(p.life * 3) * 0.001;
          p.vy += 0.01 * dt;
          break;
      }

      // Update alpha
      const lifeRatio = p.life / p.maxLife;
      p.color[3] = lifeRatio;
    }
  }

  /**
   * Card flip effect - sparkles around flipping card
   */
  emitFlip(x: number, y: number): void {
    const count = 12;

    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const angle = (i / count) * Math.PI * 2;
      const speed = 0.05 + Math.random() * 0.05;

      this.particles.push({
        x: x + (Math.random() - 0.5) * 0.02,
        y: y + (Math.random() - 0.5) * 0.02,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.4 + Math.random() * 0.2,
        maxLife: 0.6,
        size: 0.015 + Math.random() * 0.01,
        type: 'flip',
        color: [...this.colors.synapse] as [number, number, number, number],
      });
    }
  }

  /**
   * Match effect - connection between matched cards
   */
  emitMatch(x1: number, y1: number, x2: number, y2: number): void {
    // Burst at both positions
    for (let pos of [[x1, y1], [x2, y2]]) {
      const count = 15;
      for (let i = 0; i < count; i++) {
        if (this.particles.length >= this.maxParticles) break;

        const angle = (i / count) * Math.PI * 2;
        const speed = 0.08 + Math.random() * 0.04;

        this.particles.push({
          x: pos[0],
          y: pos[1],
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 0.6 + Math.random() * 0.3,
          maxLife: 0.9,
          size: 0.02 + Math.random() * 0.01,
          type: 'match',
          color: [...this.colors.match] as [number, number, number, number],
        });
      }
    }

    // Neural connection between cards
    const steps = 10;
    for (let i = 0; i <= steps; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const t = i / steps;
      const x = x1 + (x2 - x1) * t;
      const y = y1 + (y2 - y1) * t;

      this.particles.push({
        x: x + (Math.random() - 0.5) * 0.02,
        y: y + (Math.random() - 0.5) * 0.02,
        vx: (Math.random() - 0.5) * 0.02,
        vy: (Math.random() - 0.5) * 0.02,
        life: 0.8,
        maxLife: 0.8,
        size: 0.025,
        type: 'neural',
        color: [...this.colors.pulse] as [number, number, number, number],
      });
    }
  }

  /**
   * Mismatch effect - brief red flash
   */
  emitMismatch(x1: number, y1: number, x2: number, y2: number): void {
    for (let pos of [[x1, y1], [x2, y2]]) {
      const count = 6;
      for (let i = 0; i < count; i++) {
        if (this.particles.length >= this.maxParticles) break;

        const angle = (i / count) * Math.PI * 2;

        this.particles.push({
          x: pos[0],
          y: pos[1],
          vx: Math.cos(angle) * 0.03,
          vy: Math.sin(angle) * 0.03,
          life: 0.3,
          maxLife: 0.3,
          size: 0.015,
          type: 'flip',
          color: [1.0, 0.3, 0.3, 1.0],
        });
      }
    }
  }

  /**
   * Victory celebration - full memory sync
   */
  emitWin(centerX: number, centerY: number): void {
    // Rainbow burst
    for (let i = 0; i < 60; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const angle = Math.random() * Math.PI * 2;
      const speed = 0.1 + Math.random() * 0.15;

      const hue = i / 60;
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
        life: 1.5 + Math.random() * 0.5,
        maxLife: 2.0,
        size: 0.025 + Math.random() * 0.015,
        type: 'win',
        color,
      });
    }

    // Memory orbs
    for (let i = 0; i < 16; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const angle = (i / 16) * Math.PI * 2;

      this.particles.push({
        x: centerX + Math.cos(angle) * 0.15,
        y: centerY + Math.sin(angle) * 0.15,
        vx: Math.cos(angle) * 0.05,
        vy: Math.sin(angle) * 0.05,
        life: 1.0,
        maxLife: 1.0,
        size: 0.03,
        type: 'match',
        color: [...this.colors.gold] as [number, number, number, number],
      });
    }
  }

  /**
   * Ambient synaptic activity
   */
  emitAmbient(): void {
    if (Math.random() > 0.03) return;
    if (this.particles.length >= this.maxParticles) return;

    const colors = [this.colors.synapse, this.colors.pulse];
    const color = colors[Math.floor(Math.random() * colors.length)];

    this.particles.push({
      x: Math.random(),
      y: Math.random() * 0.8 + 0.1,
      vx: (Math.random() - 0.5) * 0.01,
      vy: (Math.random() - 0.5) * 0.01,
      life: 3 + Math.random() * 2,
      maxLife: 5,
      size: 0.008 + Math.random() * 0.005,
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
