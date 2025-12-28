/**
 * Particle System - Balloon Pop
 * Sky / Carnival / Colorful Balloons Theme
 * Game #162
 */

import {
  BALLOON_COLORS,
  randomRange,
  getRandomBalloonColor,
  getRandomConfettiColor,
  easeOutQuad,
  easeOutBounce,
} from './math';

export type ParticleType = 'pop' | 'shoot' | 'bonusPop' | 'escaped' | 'confetti' | 'gameOver';

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
  pop: 0,
  shoot: 1,
  bonusPop: 2,
  escaped: 3,
  confetti: 4,
  gameOver: 5,
};

export class ParticleSystem {
  private particles: Particle[] = [];
  private maxParticles: number = 600;

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
    }> = {}
  ) {
    const count = options.count ?? this.getDefaultCount(type);
    const spread = options.spread ?? this.getDefaultSpread(type);
    const speed = options.speed ?? this.getDefaultSpeed(type);
    const baseSize = options.size ?? this.getDefaultSize(type);
    const life = options.life ?? this.getDefaultLife(type);

    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) {
        this.particles.shift();
      }

      const angle = Math.random() * Math.PI * 2;
      const velocity = speed * (0.5 + Math.random() * 0.5);
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
      case 'pop': return 15;
      case 'shoot': return 6;
      case 'bonusPop': return 25;
      case 'escaped': return 8;
      case 'confetti': return 20;
      case 'gameOver': return 40;
    }
  }

  private getDefaultSpread(type: ParticleType): number {
    switch (type) {
      case 'pop': return 0.03;
      case 'shoot': return 0.01;
      case 'bonusPop': return 0.04;
      case 'escaped': return 0.02;
      case 'confetti': return 0.1;
      case 'gameOver': return 0.15;
    }
  }

  private getDefaultSpeed(type: ParticleType): number {
    switch (type) {
      case 'pop': return 0.15;
      case 'shoot': return 0.08;
      case 'bonusPop': return 0.2;
      case 'escaped': return 0.05;
      case 'confetti': return 0.12;
      case 'gameOver': return 0.1;
    }
  }

  private getDefaultSize(type: ParticleType): number {
    switch (type) {
      case 'pop': return 0.8;
      case 'shoot': return 0.4;
      case 'bonusPop': return 1.0;
      case 'escaped': return 0.6;
      case 'confetti': return 0.7;
      case 'gameOver': return 1.2;
    }
  }

  private getDefaultLife(type: ParticleType): number {
    switch (type) {
      case 'pop': return 0.6;
      case 'shoot': return 0.3;
      case 'bonusPop': return 0.9;
      case 'escaped': return 1.0;
      case 'confetti': return 1.5;
      case 'gameOver': return 2.0;
    }
  }

  private getDefaultColor(type: ParticleType): [number, number, number, number] {
    switch (type) {
      case 'pop': return getRandomBalloonColor();
      case 'shoot': return BALLOON_COLORS.dartSilver;
      case 'bonusPop': return BALLOON_COLORS.bonusGold;
      case 'escaped': return [...BALLOON_COLORS.skyBlue] as [number, number, number, number];
      case 'confetti': return getRandomConfettiColor();
      case 'gameOver': return getRandomBalloonColor();
    }
  }

  private getGravityOffset(type: ParticleType): number {
    switch (type) {
      case 'pop': return -0.02;
      case 'shoot': return 0;
      case 'bonusPop': return -0.03;
      case 'escaped': return 0.02;
      case 'confetti': return -0.05;
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

      // Apply velocity
      p.x += p.vx * deltaTime;
      p.y += p.vy * deltaTime;

      // Type-specific physics
      switch (p.type) {
        case 'pop':
          // Rubber fragments slow down and fall
          p.vx *= 0.96;
          p.vy += deltaTime * 0.15;
          break;
        case 'shoot':
          // Trail fades quickly
          p.vx *= 0.9;
          p.vy *= 0.9;
          break;
        case 'bonusPop':
          // Sparkles float up slightly
          p.vy -= deltaTime * 0.05;
          p.vx *= 0.98;
          break;
        case 'escaped':
          // Float upward
          p.vy -= deltaTime * 0.08;
          p.vx *= 0.99;
          break;
        case 'confetti':
          // Flutter down with wobble
          p.vy += deltaTime * 0.2;
          p.vx += Math.sin(p.life * 10 + p.x * 20) * deltaTime * 0.1;
          break;
        case 'gameOver':
          // Spiral outward
          const angle = Math.atan2(p.vy, p.vx);
          p.vx += Math.cos(angle + 0.5) * deltaTime * 0.1;
          p.vy += Math.sin(angle + 0.5) * deltaTime * 0.1;
          p.vx *= 0.98;
          p.vy *= 0.98;
          break;
      }

      // Update alpha based on life
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
