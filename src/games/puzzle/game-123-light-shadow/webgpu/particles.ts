/**
 * WebGPU Particle System - Light Shadow
 * Light & Shadow / Mystery Theme
 * Game #123
 */

import { randomRange, COLORS, easeOutCubic } from './math';

export type ParticleType = 'light' | 'shadow' | 'spark' | 'glow' | 'dust' | 'beam';

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
  light: 0,
  shadow: 1,
  spark: 2,
  glow: 3,
  dust: 4,
  beam: 5,
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
        case 'light':
          // Gentle float upward
          p.vy -= 15 * deltaTime;
          p.vx *= 0.98;
          break;
        case 'shadow':
          // Sink downward and spread
          p.vy += 10 * deltaTime;
          p.vx += (Math.random() - 0.5) * 20 * deltaTime;
          break;
        case 'spark':
          // Fast fade with slight gravity
          p.vy += 30 * deltaTime;
          p.vx *= 0.96;
          break;
        case 'glow':
          // Gentle pulse in place
          p.vx *= 0.95;
          p.vy *= 0.95;
          break;
        case 'dust':
          // Float gently
          p.vy -= 5 * deltaTime;
          p.vx += Math.sin(Date.now() * 0.003 + i) * 8 * deltaTime;
          break;
        case 'beam':
          // Move in ray direction
          p.vx *= 0.99;
          p.vy *= 0.99;
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
      color = COLORS.lightBright as [number, number, number],
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

  // Light moved - emit light particles
  emitLightMove(x: number, y: number): void {
    // Light orbs
    this.emit(x, y, 'light', 3, {
      color: COLORS.lightBright as [number, number, number],
      size: 12,
      life: 0.6,
      spread: 15,
      speed: 40,
    });

    // Sparks
    this.emit(x, y, 'spark', 2, {
      color: COLORS.spark as [number, number, number],
      size: 8,
      life: 0.3,
      spread: 10,
      speed: 80,
    });
  }

  // Light dragging - trail effect
  emitLightTrail(x: number, y: number): void {
    // Glow trail
    this.emit(x, y, 'glow', 1, {
      color: COLORS.glowYellow as [number, number, number],
      size: 18,
      life: 0.4,
      spread: 5,
      speed: 10,
    });

    // Light dust
    this.emit(x, y, 'dust', 1, {
      color: COLORS.lightSoft as [number, number, number],
      size: 6,
      life: 0.8,
      spread: 8,
      speed: 15,
    });
  }

  // Shadow cast - particles where shadow forms
  emitShadowCast(x: number, y: number): void {
    // Shadow wisps
    this.emit(x, y, 'shadow', 5, {
      color: COLORS.shadowDeep as [number, number, number],
      size: 20,
      life: 1.0,
      spread: 30,
      speed: 20,
    });

    // Dark dust
    this.emit(x, y, 'dust', 3, {
      color: COLORS.shadowMid as [number, number, number],
      size: 10,
      life: 0.8,
      spread: 25,
      speed: 15,
    });
  }

  // Match improving - success particles
  emitMatchProgress(x: number, y: number): void {
    // Glow
    this.emit(x, y, 'glow', 4, {
      color: COLORS.success as [number, number, number],
      size: 15,
      life: 0.8,
      spread: 20,
      speed: 30,
    });

    // Sparks
    this.emit(x, y, 'spark', 6, {
      color: COLORS.lightWarm as [number, number, number],
      size: 8,
      life: 0.5,
      spread: 15,
      speed: 60,
    });
  }

  // Victory - light explosion
  emitVictory(width: number, height: number): void {
    const centerX = width / 2;
    const centerY = height / 2;

    // Massive light burst
    for (let i = 0; i < 40; i++) {
      setTimeout(() => {
        const angle = (i / 40) * Math.PI * 2;
        const radius = 30 + i * 3;
        this.emit(
          centerX + Math.cos(angle) * radius,
          centerY + Math.sin(angle) * radius,
          'light',
          2,
          {
            color: COLORS.lightBright as [number, number, number],
            size: 18,
            life: 1.5,
            spread: 20,
            speed: 100,
          }
        );
      }, i * 30);
    }

    // Golden sparks
    for (let i = 0; i < 50; i++) {
      setTimeout(() => {
        this.emit(
          randomRange(0, width),
          randomRange(0, height),
          'spark',
          2,
          {
            color: COLORS.spark as [number, number, number],
            size: 10,
            life: 1.0,
            spread: 25,
            speed: 80,
          }
        );
      }, i * 25);
    }

    // Success glow
    this.emit(centerX, centerY, 'glow', 8, {
      color: COLORS.success as [number, number, number],
      size: 40,
      life: 2.0,
      spread: 40,
      speed: 30,
    });

    // Light beams radiating out
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      this.emit(
        centerX + Math.cos(angle) * 50,
        centerY + Math.sin(angle) * 50,
        'beam',
        3,
        {
          color: COLORS.beam as [number, number, number],
          size: 25,
          life: 1.5,
          spread: 10,
          speed: 50,
        }
      );
    }
  }

  // Level start - light awakening
  emitLevelStart(lightX: number, lightY: number, width: number, height: number): void {
    // Light source awakens
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      this.emit(
        lightX + Math.cos(angle) * 30,
        lightY + Math.sin(angle) * 30,
        'light',
        1,
        {
          color: COLORS.lightBright as [number, number, number],
          size: 15,
          life: 1.0,
          spread: 5,
          speed: 25,
        }
      );
    }

    // Gentle glow
    this.emit(lightX, lightY, 'glow', 3, {
      color: COLORS.glowYellow as [number, number, number],
      size: 30,
      life: 1.2,
      spread: 10,
      speed: 15,
    });

    // Shadows retreating at bottom
    for (let i = 0; i < 5; i++) {
      this.emit(
        randomRange(width * 0.2, width * 0.8),
        height - 50,
        'shadow',
        2,
        {
          color: COLORS.shadowDeep as [number, number, number],
          size: 15,
          life: 1.0,
          spread: 20,
          speed: 20,
        }
      );
    }
  }

  // Reset - shadows return
  emitReset(width: number, height: number): void {
    const centerX = width / 2;
    const centerY = height / 2;

    // Shadows spreading
    for (let i = 0; i < 15; i++) {
      const angle = (i / 15) * Math.PI * 2;
      this.emit(
        centerX + Math.cos(angle) * 80,
        centerY + Math.sin(angle) * 60,
        'shadow',
        2,
        {
          color: COLORS.shadowMid as [number, number, number],
          size: 18,
          life: 0.8,
          spread: 15,
          speed: 30,
        }
      );
    }

    // Light dimming
    this.emit(centerX, centerY - 50, 'light', 5, {
      color: COLORS.lightSoft as [number, number, number],
      size: 12,
      life: 0.6,
      spread: 30,
      speed: 25,
    });
  }

  // Ambient floating particles
  emitAmbient(lightX: number, lightY: number, width: number, height: number): void {
    if (Math.random() < 0.4) {
      // Dust motes in light
      const distFromLight = Math.random() * 150;
      const angle = Math.random() * Math.PI * 2;
      const x = lightX + Math.cos(angle) * distFromLight;
      const y = lightY + Math.sin(angle) * distFromLight;

      if (x > 0 && x < width && y > 0 && y < height * 0.85) {
        this.emit(x, y, 'dust', 1, {
          color: COLORS.dust as [number, number, number],
          size: randomRange(4, 8),
          life: randomRange(2, 4),
          spread: 0,
          speed: 8,
        });
      }
    }

    // Occasional shadow wisp at bottom
    if (Math.random() < 0.15) {
      this.emit(
        randomRange(width * 0.1, width * 0.9),
        height - randomRange(20, 60),
        'shadow',
        1,
        {
          color: COLORS.shadowSoft as [number, number, number],
          size: randomRange(8, 15),
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
