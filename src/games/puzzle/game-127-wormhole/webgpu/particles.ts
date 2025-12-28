/**
 * Particle System - Wormhole
 * Space / Wormhole Theme
 * Game #127
 */

import { COLORS, randomRange, randomColor, lerp } from "./math";

export type ParticleType =
  | "star"
  | "wormhole"
  | "energy"
  | "teleport"
  | "trail"
  | "cosmic";

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

const PARTICLE_TYPE_INDEX: Record<ParticleType, number> = {
  star: 0,
  wormhole: 1,
  energy: 2,
  teleport: 3,
  trail: 4,
  cosmic: 5,
};

export class ParticleSystem {
  private particles: Particle[] = [];
  private maxParticles: number = 600;

  emit(
    x: number,
    y: number,
    type: ParticleType,
    count: number = 1,
    options: Partial<{
      color: number[];
      size: number;
      speed: number;
      life: number;
      spread: number;
      direction: number;
    }> = {}
  ) {
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) {
        this.particles.shift();
      }

      let color: number[];
      let size: number;
      let speed: number;
      let life: number;

      const spread = options.spread ?? Math.PI * 2;
      const baseDir = options.direction ?? Math.random() * Math.PI * 2;
      const angle = baseDir + (Math.random() - 0.5) * spread;

      switch (type) {
        case "star":
          color = options.color ?? randomColor(COLORS.starWhite, 0.1);
          size = options.size ?? randomRange(0.008, 0.015);
          speed = options.speed ?? randomRange(0.001, 0.003);
          life = options.life ?? randomRange(2.0, 3.5);
          break;

        case "wormhole":
          color = options.color ?? randomColor(COLORS.wormholeBlue, 0.2);
          size = options.size ?? randomRange(0.02, 0.04);
          speed = options.speed ?? randomRange(0.003, 0.008);
          life = options.life ?? randomRange(1.0, 1.8);
          break;

        case "energy":
          color = options.color ?? randomColor(COLORS.playerGlow, 0.15);
          size = options.size ?? randomRange(0.01, 0.02);
          speed = options.speed ?? randomRange(0.005, 0.015);
          life = options.life ?? randomRange(0.8, 1.5);
          break;

        case "teleport":
          color = options.color ?? randomColor(COLORS.teleportCore, 0.1);
          size = options.size ?? randomRange(0.03, 0.05);
          speed = options.speed ?? randomRange(0.001, 0.005);
          life = options.life ?? randomRange(0.6, 1.0);
          break;

        case "trail":
          color = options.color ?? randomColor(COLORS.energyTrail, 0.1);
          size = options.size ?? randomRange(0.008, 0.015);
          speed = options.speed ?? randomRange(0.001, 0.003);
          life = options.life ?? randomRange(0.5, 1.0);
          break;

        case "cosmic":
          color = options.color ?? randomColor(COLORS.cosmicDust, 0.15);
          size = options.size ?? randomRange(0.005, 0.012);
          speed = options.speed ?? randomRange(0.0005, 0.002);
          life = options.life ?? randomRange(3.0, 5.0);
          break;

        default:
          color = [1, 1, 1];
          size = 0.02;
          speed = 0.005;
          life = 1.0;
      }

      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: [...color, 1] as [number, number, number, number],
        size,
        life,
        maxLife: life,
        type,
      });
    }
  }

  // Player move - leave trail
  emitPlayerMove(fromX: number, fromY: number, toX: number, toY: number) {
    const dx = toX - fromX;
    const dy = toY - fromY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const steps = Math.floor(dist / 0.02) + 1;

    for (let i = 0; i < steps; i++) {
      const t = i / steps;
      const px = lerp(fromX, toX, t);
      const py = lerp(fromY, toY, t);

      this.emit(px, py, "trail", 2, {
        color: COLORS.energyTrail,
        size: 0.01,
        speed: 0.002,
        life: 0.8,
      });
    }

    // Arrival burst
    this.emit(toX, toY, "energy", 8, {
      color: COLORS.playerGlow,
      size: 0.015,
      speed: 0.01,
      life: 0.6,
    });
  }

  // Teleport through wormhole
  emitTeleport(
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
    wormholeColor: number[]
  ) {
    // Entry vortex
    for (let i = 0; i < 20; i++) {
      const angle = (i / 20) * Math.PI * 2;
      const dist = 0.02 + Math.random() * 0.03;
      const px = fromX + Math.cos(angle) * dist;
      const py = fromY + Math.sin(angle) * dist;

      this.emit(px, py, "wormhole", 1, {
        color: wormholeColor,
        direction: angle + Math.PI,
        spread: 0.3,
        size: 0.02,
        speed: 0.015,
        life: 0.8,
      });
    }

    // Teleport wave at source
    this.emit(fromX, fromY, "teleport", 5, {
      color: COLORS.teleportCore,
      size: 0.04,
      speed: 0.002,
      life: 0.7,
    });

    // Exit burst at destination
    setTimeout(() => {
      for (let i = 0; i < 25; i++) {
        const angle = (i / 25) * Math.PI * 2;
        this.emit(toX, toY, "wormhole", 1, {
          color: wormholeColor,
          direction: angle,
          spread: 0.4,
          size: 0.025,
          speed: 0.02,
          life: 0.7,
        });
      }

      this.emit(toX, toY, "teleport", 5, {
        color: COLORS.teleportGlow,
        size: 0.05,
        speed: 0.003,
        life: 0.8,
      });

      this.emit(toX, toY, "energy", 15, {
        color: wormholeColor,
        size: 0.015,
        speed: 0.015,
        life: 0.6,
      });
    }, 200);
  }

  // Wormhole idle animation
  emitWormholeIdle(x: number, y: number, color: number[]) {
    const angle = Math.random() * Math.PI * 2;
    const dist = 0.015 + Math.random() * 0.01;

    this.emit(x + Math.cos(angle) * dist, y + Math.sin(angle) * dist, "wormhole", 1, {
      color,
      direction: angle + Math.PI * 0.5,
      spread: 0.5,
      size: 0.015,
      speed: 0.005,
      life: 1.2,
    });
  }

  // Goal reached
  emitGoalReached(x: number, y: number) {
    // Golden star burst
    for (let wave = 0; wave < 3; wave++) {
      setTimeout(() => {
        for (let i = 0; i < 20; i++) {
          const angle = (i / 20) * Math.PI * 2;
          this.emit(x, y, "star", 1, {
            color: COLORS.goalGlow,
            direction: angle,
            spread: 0.2,
            size: 0.015 + wave * 0.005,
            speed: 0.015 + wave * 0.005,
            life: 1.2,
          });
        }
      }, wave * 150);
    }

    // Energy explosion
    setTimeout(() => {
      this.emit(x, y, "energy", 30, {
        color: COLORS.goalCore,
        size: 0.02,
        speed: 0.02,
        life: 1.0,
      });
    }, 300);
  }

  // Victory
  emitVictory(centerX: number, centerY: number) {
    // Multiple waves of stars
    for (let wave = 0; wave < 4; wave++) {
      setTimeout(() => {
        for (let i = 0; i < 30; i++) {
          const angle = (i / 30) * Math.PI * 2;
          const dist = 0.05 * (wave + 1);
          const px = centerX + Math.cos(angle) * dist * 0.3;
          const py = centerY + Math.sin(angle) * dist * 0.3;

          this.emit(px, py, "star", 1, {
            color: randomColor(COLORS.starYellow, 0.2),
            direction: angle,
            spread: 0.3,
            size: 0.012,
            speed: 0.01 + wave * 0.003,
            life: 1.5,
          });
        }
      }, wave * 200);
    }

    // Central teleport wave
    setTimeout(() => {
      this.emit(centerX, centerY, "teleport", 8, {
        color: COLORS.teleportCore,
        size: 0.06,
        speed: 0.003,
        life: 1.2,
      });
    }, 500);

    // Golden energy
    setTimeout(() => {
      this.emit(centerX, centerY, "energy", 40, {
        color: COLORS.goalGlow,
        size: 0.018,
        speed: 0.02,
        life: 1.2,
      });
    }, 700);
  }

  // Level start
  emitLevelStart(centerX: number, centerY: number) {
    // Stars converging to center
    for (let i = 0; i < 25; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 0.2 + Math.random() * 0.1;
      const px = centerX + Math.cos(angle) * dist;
      const py = centerY + Math.sin(angle) * dist;

      setTimeout(() => {
        this.emit(px, py, "star", 2, {
          color: COLORS.starBlue,
          direction: angle + Math.PI,
          spread: 0.3,
          size: 0.01,
          speed: 0.008,
          life: 1.0,
        });
      }, i * 40);
    }

    // Central formation
    setTimeout(() => {
      this.emit(centerX, centerY, "energy", 15, {
        color: COLORS.playerGlow,
        size: 0.02,
        speed: 0.01,
        life: 0.8,
      });
    }, 400);
  }

  // Reset
  emitReset(centerX: number, centerY: number) {
    // Dissolving cosmic dust
    for (let i = 0; i < 30; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * 0.15;
      const px = centerX + Math.cos(angle) * dist;
      const py = centerY + Math.sin(angle) * dist;

      this.emit(px, py, "cosmic", 2, {
        color: randomColor(COLORS.cosmicDust, 0.2),
        direction: angle,
        spread: 0.5,
        size: 0.012,
        speed: 0.008,
        life: 0.8,
      });
    }
  }

  // Ambient particles
  emitAmbient() {
    if (this.particles.length > this.maxParticles * 0.8) return;

    const x = Math.random();
    const y = Math.random();

    if (Math.random() < 0.3) {
      // Star
      this.emit(x, y, "star", 1, {
        color: randomColor(Math.random() < 0.5 ? COLORS.starWhite : COLORS.starBlue, 0.1),
        size: randomRange(0.004, 0.01),
        speed: randomRange(0.0003, 0.001),
        life: randomRange(4, 6),
      });
    } else {
      // Cosmic dust
      this.emit(x, y, "cosmic", 1, {
        color: randomColor(COLORS.cosmicDust, 0.15),
        size: randomRange(0.003, 0.008),
        speed: randomRange(0.0002, 0.0008),
        life: randomRange(5, 8),
      });
    }
  }

  update(deltaTime: number) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];

      // Update position
      p.x += p.vx;
      p.y += p.vy;

      // Gentle drift for space feel
      p.x += Math.sin(Date.now() * 0.001 + i) * 0.0001;
      p.y += Math.cos(Date.now() * 0.0008 + i * 1.5) * 0.00008;

      // Slight drag
      p.vx *= 0.995;
      p.vy *= 0.995;

      // Update life
      p.life -= deltaTime;

      // Fade alpha
      const lifeRatio = p.life / p.maxLife;
      p.color[3] = Math.min(1, lifeRatio * 2) * Math.min(1, p.life * 3);

      // Remove dead particles
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  getParticleData(): Float32Array {
    const data = new Float32Array(this.particles.length * 12);

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      const offset = i * 12;

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
      data[offset + 11] = PARTICLE_TYPE_INDEX[p.type];
    }

    return data;
  }

  getParticleCount(): number {
    return this.particles.length;
  }

  clear() {
    this.particles = [];
  }
}
