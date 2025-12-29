/**
 * Particle System - Fruit Ninja
 * Ninja / Dojo / Dark Red and Black Theme
 * Game #163
 */

import {
  NINJA_COLORS,
  randomRange,
  getRandomJuiceColor,
  getFruitColor,
  easeOutQuad,
} from './math';

export type ParticleType = 'slice' | 'juice' | 'explosion' | 'missed' | 'combo' | 'gameOver';

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: [number, number, number, number];
  size: number;
  life: number;
  maxLife: number;
  type: ParticleType;
}

const PARTICLE_TYPE_MAP: Record<ParticleType, number> = {
  slice: 0,
  juice: 1,
  explosion: 2,
  missed: 3,
  combo: 4,
  gameOver: 5,
};

export class ParticleSystem {
  private particles: Particle[] = [];
  private maxParticles: number = 800;

  emit(
    type: ParticleType,
    x: number,
    y: number,
    options: Partial<{
      count: number;
      color: [number, number, number, number];
      spread: number;
      speed: number;
      size: number;
      life: number;
      angle: number;
    }> = {}
  ) {
    const count = options.count ?? this.getDefaultCount(type);
    const spread = options.spread ?? this.getDefaultSpread(type);
    const speed = options.speed ?? this.getDefaultSpeed(type);
    const baseSize = options.size ?? this.getDefaultSize(type);
    const life = options.life ?? this.getDefaultLife(type);
    const baseAngle = options.angle ?? 0;

    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) {
        this.particles.shift();
      }

      let angle: number;
      let velocity: number;

      if (type === 'slice') {
        // Slice particles follow the blade direction
        angle = baseAngle + (Math.random() - 0.5) * 0.3;
        velocity = speed * (0.8 + Math.random() * 0.4);
      } else {
        angle = Math.random() * Math.PI * 2;
        velocity = speed * (0.5 + Math.random() * 0.5);
      }

      const color = options.color ?? this.getDefaultColor(type);

      this.particles.push({
        x: x + (Math.random() - 0.5) * spread,
        y: y + (Math.random() - 0.5) * spread,
        vx: Math.cos(angle) * velocity,
        vy: Math.sin(angle) * velocity + this.getGravityOffset(type),
        color: [...color] as [number, number, number, number],
        size: baseSize * (0.7 + Math.random() * 0.6),
        life: life * (0.8 + Math.random() * 0.4),
        maxLife: life,
        type,
      });
    }
  }

  private getDefaultCount(type: ParticleType): number {
    switch (type) {
      case 'slice': return 8;
      case 'juice': return 20;
      case 'explosion': return 35;
      case 'missed': return 10;
      case 'combo': return 15;
      case 'gameOver': return 50;
    }
  }

  private getDefaultSpread(type: ParticleType): number {
    switch (type) {
      case 'slice': return 0.01;
      case 'juice': return 0.03;
      case 'explosion': return 0.05;
      case 'missed': return 0.02;
      case 'combo': return 0.04;
      case 'gameOver': return 0.15;
    }
  }

  private getDefaultSpeed(type: ParticleType): number {
    switch (type) {
      case 'slice': return 0.25;
      case 'juice': return 0.15;
      case 'explosion': return 0.2;
      case 'missed': return 0.05;
      case 'combo': return 0.18;
      case 'gameOver': return 0.08;
    }
  }

  private getDefaultSize(type: ParticleType): number {
    switch (type) {
      case 'slice': return 1.5;
      case 'juice': return 0.6;
      case 'explosion': return 1.2;
      case 'missed': return 0.8;
      case 'combo': return 1.0;
      case 'gameOver': return 1.5;
    }
  }

  private getDefaultLife(type: ParticleType): number {
    switch (type) {
      case 'slice': return 0.3;
      case 'juice': return 0.8;
      case 'explosion': return 0.7;
      case 'missed': return 1.0;
      case 'combo': return 0.6;
      case 'gameOver': return 2.0;
    }
  }

  private getDefaultColor(type: ParticleType): [number, number, number, number] {
    switch (type) {
      case 'slice': return NINJA_COLORS.bladeSilver;
      case 'juice': return getRandomJuiceColor();
      case 'explosion': return NINJA_COLORS.explosionRed;
      case 'missed': return NINJA_COLORS.ninjaRed;
      case 'combo': return NINJA_COLORS.comboGold;
      case 'gameOver': return NINJA_COLORS.explosionRed;
    }
  }

  private getGravityOffset(type: ParticleType): number {
    switch (type) {
      case 'slice': return 0;
      case 'juice': return -0.02;
      case 'explosion': return 0;
      case 'missed': return 0.03;
      case 'combo': return -0.02;
      case 'gameOver': return 0;
    }
  }

  update(deltaTime: number) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];

      p.life -= deltaTime;

      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      p.x += p.vx * deltaTime;
      p.y += p.vy * deltaTime;

      switch (p.type) {
        case 'slice':
          // Fast fade
          p.vx *= 0.92;
          p.vy *= 0.92;
          break;
        case 'juice':
          // Fall with gravity
          p.vy += deltaTime * 0.4;
          p.vx *= 0.98;
          break;
        case 'explosion':
          // Expand outward then slow
          p.vx *= 0.95;
          p.vy *= 0.95;
          break;
        case 'missed':
          // Drift down sadly
          p.vy += deltaTime * 0.2;
          p.vx *= 0.99;
          break;
        case 'combo':
          // Float upward
          p.vy -= deltaTime * 0.15;
          p.vx *= 0.97;
          break;
        case 'gameOver':
          // Slow spiral
          const angle = Math.atan2(p.vy, p.vx) + deltaTime * 0.5;
          const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy) * 0.98;
          p.vx = Math.cos(angle) * speed;
          p.vy = Math.sin(angle) * speed;
          break;
      }

      const lifeRatio = p.life / p.maxLife;
      p.color[3] = easeOutQuad(lifeRatio);
    }
  }

  getData(): Float32Array {
    const floatsPerParticle = 12;
    const data = new Float32Array(this.maxParticles * floatsPerParticle);

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      const offset = i * floatsPerParticle;

      data[offset + 0] = p.x;
      data[offset + 1] = p.y;
      data[offset + 2] = p.vx;
      data[offset + 3] = p.vy;
      data[offset + 4] = p.color[0];
      data[offset + 5] = p.color[1];
      data[offset + 6] = p.color[2];
      data[offset + 7] = p.color[3];
      data[offset + 8] = p.size;
      data[offset + 9] = p.life;
      data[offset + 10] = p.maxLife;
      data[offset + 11] = PARTICLE_TYPE_MAP[p.type];
    }

    return data;
  }

  getCount(): number {
    return this.particles.length;
  }

  clear() {
    this.particles = [];
  }
}
