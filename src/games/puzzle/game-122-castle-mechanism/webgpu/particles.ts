/**
 * WebGPU Particle System - Castle Mechanism
 * Medieval Castle / Steampunk Theme
 * Game #122
 */

import { randomRange, COLORS, easeOutCubic } from './math';

export type ParticleType = 'gear' | 'steam' | 'spark' | 'chain' | 'glow' | 'dust';

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
  gear: 0,
  steam: 1,
  spark: 2,
  chain: 3,
  glow: 4,
  dust: 5,
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
        case 'gear':
          // Spinning fall
          p.vy += 50 * deltaTime;
          p.vx *= 0.98;
          break;
        case 'steam':
          // Rising and dispersing
          p.vy -= 30 * deltaTime;
          p.vx += (Math.random() - 0.5) * 20 * deltaTime;
          break;
        case 'spark':
          // Fast fade with gravity
          p.vy += 100 * deltaTime;
          p.vx *= 0.95;
          break;
        case 'chain':
          // Swinging motion
          p.vx = Math.sin(Date.now() * 0.005 + i) * 30;
          p.vy += 20 * deltaTime;
          break;
        case 'glow':
          // Gentle pulse
          p.vx *= 0.98;
          p.vy *= 0.98;
          break;
        case 'dust':
          // Floating dust
          p.vy -= 10 * deltaTime;
          p.vx += Math.sin(Date.now() * 0.003 + i) * 5 * deltaTime;
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
      color = COLORS.brass as [number, number, number],
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

  // Mechanism activated
  emitMechanismActivate(x: number, y: number, mechType: string): void {
    // Gear fragments
    this.emit(x, y, 'gear', 6, {
      color: COLORS.brass as [number, number, number],
      size: 12,
      life: 0.8,
      spread: 30,
      speed: 80,
    });

    // Sparks
    this.emit(x, y, 'spark', 10, {
      color: COLORS.spark as [number, number, number],
      size: 8,
      life: 0.4,
      spread: 20,
      speed: 150,
    });

    // Steam puff
    this.emit(x, y - 20, 'steam', 5, {
      color: COLORS.steam as [number, number, number],
      size: 20,
      life: 1.2,
      spread: 15,
      speed: 30,
    });

    // Glow
    this.emit(x, y, 'glow', 2, {
      color: COLORS.glow as [number, number, number],
      size: 35,
      life: 0.6,
      spread: 5,
      speed: 10,
    });
  }

  // Chain reaction
  emitChainReaction(x: number, y: number): void {
    // Chain links
    this.emit(x, y, 'chain', 4, {
      color: COLORS.iron as [number, number, number],
      size: 10,
      life: 1.0,
      spread: 25,
      speed: 40,
    });

    // More sparks
    this.emit(x, y, 'spark', 8, {
      color: COLORS.brassShiny as [number, number, number],
      size: 6,
      life: 0.5,
      spread: 30,
      speed: 120,
    });
  }

  // Wrong order - reset effect
  emitWrongOrder(width: number, height: number): void {
    const centerX = width / 2;
    const centerY = height / 2;

    // Red sparks
    for (let i = 0; i < 20; i++) {
      setTimeout(() => {
        this.emit(
          randomRange(width * 0.2, width * 0.8),
          randomRange(height * 0.2, height * 0.8),
          'spark',
          3,
          {
            color: COLORS.leverRed as [number, number, number],
            size: 10,
            life: 0.6,
            spread: 20,
            speed: 60,
          }
        );
      }, i * 30);
    }

    // Steam release
    this.emit(centerX, centerY, 'steam', 15, {
      color: COLORS.steam as [number, number, number],
      size: 25,
      life: 1.5,
      spread: 80,
      speed: 50,
    });
  }

  // Gate opening progress
  emitGateProgress(x: number, y: number): void {
    // Stone dust
    this.emit(x, y, 'dust', 10, {
      color: COLORS.stoneLight as [number, number, number],
      size: 8,
      life: 1.5,
      spread: 40,
      speed: 30,
    });

    // Chain movement
    this.emit(x - 40, y, 'chain', 2, {
      color: COLORS.iron as [number, number, number],
      size: 12,
      life: 0.8,
      spread: 10,
      speed: 20,
    });

    this.emit(x + 40, y, 'chain', 2, {
      color: COLORS.iron as [number, number, number],
      size: 12,
      life: 0.8,
      spread: 10,
      speed: 20,
    });
  }

  // Victory - gate fully open
  emitVictory(width: number, height: number): void {
    const centerX = width / 2;
    const centerY = height / 2;

    // Massive gear explosion
    for (let i = 0; i < 30; i++) {
      setTimeout(() => {
        const angle = (i / 30) * Math.PI * 2;
        const radius = 50 + i * 5;
        this.emit(
          centerX + Math.cos(angle) * radius,
          centerY + Math.sin(angle) * radius,
          'gear',
          2,
          {
            color: COLORS.gearGold as [number, number, number],
            size: 15,
            life: 1.5,
            spread: 20,
            speed: 100,
          }
        );
      }, i * 40);
    }

    // Golden sparks
    for (let i = 0; i < 40; i++) {
      setTimeout(() => {
        this.emit(
          randomRange(0, width),
          randomRange(0, height),
          'spark',
          3,
          {
            color: COLORS.spark as [number, number, number],
            size: 10,
            life: 1.0,
            spread: 30,
            speed: 100,
          }
        );
      }, i * 30);
    }

    // Steam celebration
    this.emit(centerX, centerY - 50, 'steam', 20, {
      color: COLORS.steam as [number, number, number],
      size: 30,
      life: 2,
      spread: 60,
      speed: 40,
    });

    // Success glow
    this.emit(centerX, centerY, 'glow', 5, {
      color: COLORS.glow as [number, number, number],
      size: 50,
      life: 2,
      spread: 30,
      speed: 20,
    });
  }

  // Level start
  emitLevelStart(width: number, height: number): void {
    const centerX = width / 2;
    const centerY = height / 2;

    // Mechanism warming up
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const x = centerX + Math.cos(angle) * 100;
      const y = centerY + Math.sin(angle) * 80;

      this.emit(x, y, 'gear', 1, {
        color: COLORS.brass as [number, number, number],
        size: 18,
        life: 1.2,
        spread: 5,
        speed: 20,
      });
    }

    // Light dust
    this.emit(centerX, centerY, 'dust', 10, {
      color: COLORS.stoneDark as [number, number, number],
      size: 6,
      life: 2,
      spread: 100,
      speed: 15,
    });
  }

  // Reset effect
  emitReset(width: number, height: number): void {
    const centerX = width / 2;
    const centerY = height / 2;

    // Mechanisms resetting
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      this.emit(
        centerX + Math.cos(angle) * 60,
        centerY + Math.sin(angle) * 60,
        'steam',
        2,
        {
          color: COLORS.steam as [number, number, number],
          size: 15,
          life: 0.8,
          spread: 10,
          speed: 30,
        }
      );
    }
  }

  // Ambient castle particles
  emitAmbient(width: number, height: number): void {
    if (Math.random() < 0.35) {
      const x = randomRange(0, width);
      const y = randomRange(0, height);

      const types: ParticleType[] = ['dust', 'steam', 'spark'];
      const type = types[Math.floor(Math.random() * types.length)];

      const colors = [COLORS.stoneDark, COLORS.steam, COLORS.brass];
      const color = colors[Math.floor(Math.random() * colors.length)] as [number, number, number];

      this.emit(x, y, type, 1, {
        color,
        size: randomRange(4, 8),
        life: randomRange(1.5, 3),
        spread: 0,
        speed: 10,
      });
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
