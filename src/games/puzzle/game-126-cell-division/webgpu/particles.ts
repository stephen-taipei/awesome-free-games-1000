/**
 * Particle System - Cell Division
 * Biology / Microbiology Theme
 * Game #126
 */

import { COLORS, randomRange, randomColor, lerp, easeOutElastic } from "./math";

export type ParticleType =
  | "cell"
  | "membrane"
  | "nucleus"
  | "mitosis"
  | "energy"
  | "attack";

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
  cell: 0,
  membrane: 1,
  nucleus: 2,
  mitosis: 3,
  energy: 4,
  attack: 5,
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
        case "cell":
          color = options.color ?? randomColor(COLORS.playerCore, 0.15);
          size = options.size ?? randomRange(0.025, 0.04);
          speed = options.speed ?? randomRange(0.002, 0.008);
          life = options.life ?? randomRange(1.5, 2.5);
          break;

        case "membrane":
          color = options.color ?? randomColor(COLORS.playerMembrane, 0.1);
          size = options.size ?? randomRange(0.03, 0.05);
          speed = options.speed ?? randomRange(0.001, 0.003);
          life = options.life ?? randomRange(0.8, 1.2);
          break;

        case "nucleus":
          color = options.color ?? randomColor(COLORS.nucleusCore, 0.1);
          size = options.size ?? randomRange(0.015, 0.025);
          speed = options.speed ?? randomRange(0.001, 0.004);
          life = options.life ?? randomRange(1.0, 1.8);
          break;

        case "mitosis":
          color = options.color ?? randomColor(COLORS.mitosisCore, 0.1);
          size = options.size ?? randomRange(0.04, 0.06);
          speed = options.speed ?? randomRange(0.005, 0.015);
          life = options.life ?? randomRange(1.2, 1.8);
          break;

        case "energy":
          color = options.color ?? randomColor(COLORS.energyCore, 0.15);
          size = options.size ?? randomRange(0.01, 0.02);
          speed = options.speed ?? randomRange(0.003, 0.01);
          life = options.life ?? randomRange(0.8, 1.4);
          break;

        case "attack":
          color = options.color ?? randomColor(COLORS.enemyCore, 0.15);
          size = options.size ?? randomRange(0.02, 0.035);
          speed = options.speed ?? randomRange(0.015, 0.03);
          life = options.life ?? randomRange(0.5, 0.9);
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

  // Cell selected - highlight effect
  emitCellSelect(x: number, y: number, isPlayer: boolean) {
    const color = isPlayer
      ? randomColor(COLORS.playerGlow, 0.1)
      : randomColor(COLORS.emptyMembrane, 0.1);

    // Ring of membrane particles
    for (let i = 0; i < 16; i++) {
      const angle = (i / 16) * Math.PI * 2;
      const dist = 0.02;
      this.emit(x + Math.cos(angle) * dist, y + Math.sin(angle) * dist, "membrane", 1, {
        color,
        size: 0.015,
        speed: 0.002,
        life: 0.6,
        direction: angle,
        spread: 0.3,
      });
    }

    // Central glow
    this.emit(x, y, "nucleus", 3, {
      color: isPlayer ? COLORS.playerCore : COLORS.emptyCore,
      size: 0.02,
      speed: 0.001,
      life: 0.5,
    });
  }

  // Cell division animation
  emitCellDivide(
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
    isPlayer: boolean
  ) {
    const color = isPlayer ? COLORS.playerCore : COLORS.enemyCore;
    const midX = (fromX + toX) / 2;
    const midY = (fromY + toY) / 2;

    // Main mitosis particles
    this.emit(midX, midY, "mitosis", 5, {
      color: COLORS.mitosisCore,
      size: 0.04,
      life: 1.5,
    });

    // Cell trail from source
    const dx = toX - fromX;
    const dy = toY - fromY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const steps = Math.floor(dist / 0.02);

    for (let i = 0; i < steps; i++) {
      const t = i / steps;
      const px = lerp(fromX, toX, t);
      const py = lerp(fromY, toY, t);

      setTimeout(() => {
        this.emit(px, py, "cell", 2, {
          color,
          size: 0.015,
          speed: 0.003,
          life: 0.8,
        });
      }, i * 30);
    }

    // Membrane burst at destination
    setTimeout(() => {
      for (let i = 0; i < 12; i++) {
        const angle = (i / 12) * Math.PI * 2;
        this.emit(toX, toY, "membrane", 1, {
          color: isPlayer ? COLORS.playerMembrane : COLORS.enemyMembrane,
          direction: angle,
          spread: 0.4,
          size: 0.025,
          life: 0.7,
        });
      }
    }, steps * 30);
  }

  // Cell attack animation
  emitCellAttack(
    fromX: number,
    fromY: number,
    toX: number,
    toY: number
  ) {
    const dx = toX - fromX;
    const dy = toY - fromY;
    const angle = Math.atan2(dy, dx);

    // Aggressive burst toward target
    this.emit(fromX, fromY, "attack", 8, {
      color: COLORS.enemyGlow,
      direction: angle,
      spread: 0.5,
      size: 0.025,
      speed: 0.025,
      life: 0.6,
    });

    // Impact at target
    setTimeout(() => {
      this.emit(toX, toY, "attack", 15, {
        color: COLORS.enemyCore,
        spread: Math.PI * 2,
        size: 0.02,
        speed: 0.02,
        life: 0.5,
      });

      // Membrane rupture
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        this.emit(toX, toY, "membrane", 1, {
          color: COLORS.playerMembrane,
          direction: a,
          spread: 0.2,
          size: 0.02,
          speed: 0.015,
          life: 0.6,
        });
      }
    }, 200);
  }

  // Cell gains energy
  emitCellGrow(x: number, y: number, energyLevel: number) {
    const intensity = Math.min(energyLevel / 4, 1);

    // Energy particles orbiting
    for (let i = 0; i < 6 + energyLevel * 2; i++) {
      const angle = (i / (6 + energyLevel * 2)) * Math.PI * 2;
      this.emit(x, y, "energy", 1, {
        color: COLORS.energyCore,
        direction: angle,
        spread: 0.3,
        size: 0.012 + intensity * 0.008,
        speed: 0.005,
        life: 0.8,
      });
    }

    // Core glow
    this.emit(x, y, "nucleus", 2, {
      color: COLORS.energyGlow,
      size: 0.02 + intensity * 0.015,
      speed: 0.001,
      life: 0.6,
    });
  }

  // Enemy makes a move
  emitEnemyMove(fromX: number, fromY: number, toX: number, toY: number) {
    // Ominous red particles
    this.emit(fromX, fromY, "cell", 5, {
      color: COLORS.enemyCore,
      size: 0.02,
      speed: 0.008,
      life: 1.0,
    });

    // Trail to new position
    const dx = toX - fromX;
    const dy = toY - fromY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx);

    for (let i = 0; i < 5; i++) {
      const t = i / 5;
      const px = lerp(fromX, toX, t);
      const py = lerp(fromY, toY, t);

      setTimeout(() => {
        this.emit(px, py, "membrane", 2, {
          color: COLORS.enemyMembrane,
          direction: angle,
          spread: 0.5,
          size: 0.015,
          life: 0.6,
        });
      }, i * 50);
    }
  }

  // Victory celebration
  emitVictory(centerX: number, centerY: number) {
    // Massive cell burst
    for (let wave = 0; wave < 3; wave++) {
      setTimeout(() => {
        for (let i = 0; i < 24; i++) {
          const angle = (i / 24) * Math.PI * 2;
          const dist = 0.05 * (wave + 1);
          const px = centerX + Math.cos(angle) * dist;
          const py = centerY + Math.sin(angle) * dist;

          this.emit(px, py, "cell", 2, {
            color: COLORS.playerGlow,
            direction: angle,
            spread: 0.4,
            size: 0.03,
            speed: 0.01 + wave * 0.005,
            life: 1.5,
          });
        }
      }, wave * 200);
    }

    // Energy burst
    setTimeout(() => {
      this.emit(centerX, centerY, "energy", 30, {
        color: COLORS.energyCore,
        size: 0.015,
        speed: 0.015,
        life: 1.2,
      });
    }, 400);

    // Nucleus celebration
    setTimeout(() => {
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        const dist = 0.1;
        this.emit(
          centerX + Math.cos(angle) * dist,
          centerY + Math.sin(angle) * dist,
          "nucleus",
          3,
          {
            color: COLORS.nucleusGlow,
            size: 0.025,
            speed: 0.005,
            life: 1.5,
          }
        );
      }
    }, 600);
  }

  // Level start
  emitLevelStart(centerX: number, centerY: number) {
    // Cells awakening
    for (let i = 0; i < 20; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * 0.2;
      const px = centerX + Math.cos(angle) * dist;
      const py = centerY + Math.sin(angle) * dist;

      setTimeout(() => {
        this.emit(px, py, "cell", 2, {
          color: COLORS.playerCore,
          size: 0.02,
          speed: 0.005,
          life: 1.2,
        });
      }, i * 50);
    }

    // Central formation
    setTimeout(() => {
      this.emit(centerX, centerY, "mitosis", 5, {
        color: COLORS.mitosisCore,
        size: 0.035,
        life: 1.5,
      });
    }, 300);
  }

  // Reset effect
  emitReset(centerX: number, centerY: number) {
    // Dissolving cells
    for (let i = 0; i < 30; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * 0.15;
      const px = centerX + Math.cos(angle) * dist;
      const py = centerY + Math.sin(angle) * dist;

      this.emit(px, py, "membrane", 2, {
        color: randomColor(COLORS.emptyMembrane, 0.2),
        direction: angle,
        spread: 0.5,
        size: 0.018,
        speed: 0.01,
        life: 0.8,
      });
    }
  }

  // Ambient particles (floating organelles)
  emitAmbient() {
    if (this.particles.length > this.maxParticles * 0.8) return;

    const x = Math.random();
    const y = Math.random();
    const types: ParticleType[] = ["cell", "membrane", "nucleus"];
    const type = types[Math.floor(Math.random() * types.length)];

    const colors = [
      COLORS.fieldLight,
      COLORS.organelleA,
      COLORS.organelleB,
    ];
    const color = randomColor(
      colors[Math.floor(Math.random() * colors.length)],
      0.1
    );

    this.emit(x, y, type, 1, {
      color,
      size: randomRange(0.005, 0.012),
      speed: randomRange(0.0005, 0.002),
      life: randomRange(3, 5),
    });
  }

  update(deltaTime: number) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];

      // Update position
      p.x += p.vx;
      p.y += p.vy;

      // Organic movement - slight wobble
      const wobble = Math.sin(Date.now() * 0.003 + i) * 0.0003;
      p.x += wobble;
      p.y += Math.cos(Date.now() * 0.002 + i * 1.5) * 0.0002;

      // Slight drag in medium
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
