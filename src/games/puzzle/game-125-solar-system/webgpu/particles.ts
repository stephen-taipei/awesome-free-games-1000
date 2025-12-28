/**
 * WebGPU Particle System - Solar System
 * Space / Cosmos Theme
 * Game #125
 */

import { randomRange, COLORS, easeOutCubic } from './math';

export type ParticleType = 'star' | 'comet' | 'nebula' | 'orbit' | 'flare' | 'alignment';

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
  star: 0,
  comet: 1,
  nebula: 2,
  orbit: 3,
  flare: 4,
  alignment: 5,
};

export class ParticleSystem {
  private particles: Particle[] = [];
  private maxParticles: number = 500;

  update(deltaTime: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];

      p.life -= deltaTime;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      p.x += p.vx * deltaTime;
      p.y += p.vy * deltaTime;

      // Type-specific behaviors
      switch (p.type) {
        case 'star':
          // Gentle drift with twinkle
          p.vx += (Math.random() - 0.5) * 5 * deltaTime;
          p.vy += (Math.random() - 0.5) * 5 * deltaTime;
          p.vx *= 0.98;
          p.vy *= 0.98;
          break;
        case 'comet':
          // Trail with momentum
          p.vx *= 0.95;
          p.vy *= 0.95;
          break;
        case 'nebula':
          // Slow expansion
          p.vx *= 0.97;
          p.vy *= 0.97;
          break;
        case 'orbit':
          // Circular motion fade
          p.vx *= 0.96;
          p.vy *= 0.96;
          break;
        case 'flare':
          // Outward burst with gravity back
          p.vx *= 0.92;
          p.vy *= 0.92;
          break;
        case 'alignment':
          // Pulse and rise
          p.vy -= 20 * deltaTime;
          p.vx *= 0.95;
          break;
      }
    }
  }

  emit(
    x: number,
    y: number,
    type: ParticleType,
    count: number = 1,
    options: Partial<{
      color: [number, number, number];
      size: number;
      life: number;
      spread: number;
      speed: number;
    }> = {}
  ): void {
    const {
      color = COLORS.starWhite as [number, number, number],
      size = 15,
      life = 1.5,
      spread = 50,
      speed = 50,
    } = options;

    for (let i = 0; i < count && this.particles.length < this.maxParticles; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * spread;

      this.particles.push({
        x: x + Math.cos(angle) * dist,
        y: y + Math.sin(angle) * dist,
        vx: (Math.random() - 0.5) * speed,
        vy: (Math.random() - 0.5) * speed,
        color: [...color, 1],
        size: size * (0.8 + Math.random() * 0.4),
        life: life * (0.8 + Math.random() * 0.4),
        maxLife: life,
        type,
      });
    }
  }

  // Planet clicked - orbital energy burst
  emitPlanetClick(x: number, y: number, planetColor: [number, number, number]): void {
    // Orbit trail
    this.emit(x, y, 'orbit', 8, {
      color: COLORS.orbitGlow as [number, number, number],
      size: 20,
      life: 0.6,
      spread: 30,
      speed: 80,
    });

    // Planet glow
    this.emit(x, y, 'star', 5, {
      color: planetColor,
      size: 15,
      life: 0.4,
      spread: 15,
      speed: 50,
    });
  }

  // Planet aligned to target
  emitAlignment(x: number, y: number): void {
    // Alignment celebration
    this.emit(x, y, 'alignment', 12, {
      color: COLORS.alignment as [number, number, number],
      size: 18,
      life: 1.0,
      spread: 25,
      speed: 100,
    });

    // Stars burst
    this.emit(x, y, 'star', 8, {
      color: COLORS.starYellow as [number, number, number],
      size: 12,
      life: 0.8,
      spread: 20,
      speed: 80,
    });
  }

  // Solar flare from sun
  emitSolarFlare(sunX: number, sunY: number): void {
    const angle = Math.random() * Math.PI * 2;
    const dist = 30;
    const x = sunX + Math.cos(angle) * dist;
    const y = sunY + Math.sin(angle) * dist;

    // Flare particles
    this.emit(x, y, 'flare', 6, {
      color: COLORS.sunGlow as [number, number, number],
      size: 25,
      life: 0.8,
      spread: 15,
      speed: 60,
    });

    // Hot core
    this.emit(x, y, 'star', 3, {
      color: COLORS.sunCore as [number, number, number],
      size: 15,
      life: 0.5,
      spread: 10,
      speed: 40,
    });
  }

  // Victory - cosmic celebration
  emitVictory(width: number, height: number): void {
    const centerX = width / 2;
    const centerY = height / 2;

    // Massive star burst
    for (let i = 0; i < 50; i++) {
      setTimeout(() => {
        this.emit(
          randomRange(width * 0.1, width * 0.9),
          randomRange(height * 0.1, height * 0.9),
          'star',
          2,
          {
            color: [
              COLORS.starWhite,
              COLORS.starYellow,
              COLORS.starBlue,
            ][Math.floor(Math.random() * 3)] as [number, number, number],
            size: 15,
            life: 1.5,
            spread: 20,
            speed: 60,
          }
        );
      }, i * 30);
    }

    // Nebula clouds
    for (let i = 0; i < 20; i++) {
      setTimeout(() => {
        this.emit(
          randomRange(0, width),
          randomRange(0, height),
          'nebula',
          3,
          {
            color: [
              COLORS.nebulaBlue,
              COLORS.nebulaPink,
              COLORS.nebulaPurple,
            ][Math.floor(Math.random() * 3)] as [number, number, number],
            size: 40,
            life: 2.0,
            spread: 50,
            speed: 30,
          }
        );
      }, i * 60);
    }

    // Alignment glow at center
    this.emit(centerX, centerY, 'alignment', 15, {
      color: COLORS.alignment as [number, number, number],
      size: 30,
      life: 1.5,
      spread: 50,
      speed: 60,
    });
  }

  // Level start - planets appear
  emitLevelStart(centerX: number, centerY: number, width: number, height: number): void {
    // Central sun flare
    for (let i = 0; i < 5; i++) {
      this.emit(centerX, centerY, 'flare', 3, {
        color: COLORS.sunCore as [number, number, number],
        size: 20,
        life: 0.8,
        spread: 20,
        speed: 50,
      });
    }

    // Orbit trails appear
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const radius = 60 + i * 25;
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;

      setTimeout(() => {
        this.emit(x, y, 'orbit', 4, {
          color: COLORS.orbitGlow as [number, number, number],
          size: 15,
          life: 1.0,
          spread: 10,
          speed: 30,
        });
      }, i * 100);
    }

    // Stars throughout
    for (let i = 0; i < 15; i++) {
      this.emit(
        randomRange(0, width),
        randomRange(0, height),
        'star',
        1,
        {
          color: COLORS.starWhite as [number, number, number],
          size: 8,
          life: 1.5,
          spread: 0,
          speed: 10,
        }
      );
    }
  }

  // Reset - cosmic reset
  emitReset(width: number, height: number): void {
    const centerX = width / 2;
    const centerY = height / 2;

    // Implosion effect
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      const radius = 100;
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;

      this.emit(x, y, 'comet', 2, {
        color: COLORS.cometTail as [number, number, number],
        size: 15,
        life: 0.6,
        spread: 10,
        speed: 40,
      });
    }

    // Central burst
    this.emit(centerX, centerY, 'star', 10, {
      color: COLORS.starBlue as [number, number, number],
      size: 12,
      life: 0.8,
      spread: 30,
      speed: 80,
    });
  }

  // Ambient cosmic particles
  emitAmbient(width: number, height: number, sunX: number, sunY: number): void {
    // Random shooting star
    if (Math.random() < 0.1) {
      const startX = Math.random() * width;
      const startY = Math.random() * height * 0.3;

      this.emit(startX, startY, 'comet', 1, {
        color: COLORS.starWhite as [number, number, number],
        size: randomRange(6, 12),
        life: randomRange(0.5, 1.0),
        spread: 0,
        speed: 150,
      });
    }

    // Occasional star twinkle
    if (Math.random() < 0.3) {
      this.emit(
        randomRange(0, width),
        randomRange(0, height),
        'star',
        1,
        {
          color: COLORS.starYellow as [number, number, number],
          size: randomRange(4, 8),
          life: randomRange(0.3, 0.6),
          spread: 0,
          speed: 5,
        }
      );
    }

    // Solar activity
    if (Math.random() < 0.15) {
      this.emitSolarFlare(sunX, sunY);
    }

    // Distant nebula wisps
    if (Math.random() < 0.08) {
      this.emit(
        randomRange(0, width),
        randomRange(0, height),
        'nebula',
        1,
        {
          color: [
            COLORS.nebulaBlue,
            COLORS.nebulaPurple,
          ][Math.floor(Math.random() * 2)] as [number, number, number],
          size: randomRange(20, 40),
          life: randomRange(1.5, 2.5),
          spread: 0,
          speed: 10,
        }
      );
    }
  }

  getParticleData(): Float32Array {
    const data = new Float32Array(this.particles.length * 12);

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      const offset = i * 12;

      data[offset] = p.x;
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

  getParticleCount(): number {
    return this.particles.length;
  }

  clear(): void {
    this.particles = [];
  }
}
