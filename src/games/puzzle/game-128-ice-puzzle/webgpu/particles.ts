/**
 * Particle System - Ice Puzzle
 * Arctic / Ice Theme
 * Game #128
 */

import { COLORS, randomRange, easeOutQuad, lerpColor } from "./math";

export type ParticleType =
  | "snowflake"
  | "ice"
  | "frost"
  | "crystal"
  | "slide"
  | "aurora";

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  type: ParticleType;
  color: number[];
  rotation: number;
  rotationSpeed: number;
}

const PARTICLE_TYPE_MAP: Record<ParticleType, number> = {
  snowflake: 0,
  ice: 1,
  frost: 2,
  crystal: 3,
  slide: 4,
  aurora: 5,
};

const MAX_PARTICLES = 600;

export class ParticleSystem {
  private particles: Particle[] = [];

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
      p.rotation += p.rotationSpeed * deltaTime;

      // Gravity for snowflakes (gentle fall)
      if (p.type === "snowflake") {
        p.vy += 0.02 * deltaTime;
        p.vx += Math.sin(p.rotation) * 0.01 * deltaTime; // Sway
      }

      // Ice shards fall faster
      if (p.type === "ice") {
        p.vy += 0.5 * deltaTime;
      }

      // Frost drifts gently
      if (p.type === "frost") {
        p.vx *= 0.98;
        p.vy *= 0.98;
      }

      // Slide dust slows down
      if (p.type === "slide") {
        p.vx *= 0.95;
        p.vy *= 0.95;
      }

      // Aurora floats up
      if (p.type === "aurora") {
        p.vy -= 0.05 * deltaTime;
      }
    }
  }

  private emit(
    x: number,
    y: number,
    count: number,
    type: ParticleType,
    config: Partial<{
      color: number[];
      velocityScale: number;
      sizeRange: [number, number];
      lifeRange: [number, number];
      spread: number;
      direction: number;
    }> = {}
  ) {
    const {
      color = COLORS.iceWhite,
      velocityScale = 1,
      sizeRange = [0.01, 0.02],
      lifeRange = [0.5, 1.0],
      spread = Math.PI * 2,
      direction = 0,
    } = config;

    for (let i = 0; i < count && this.particles.length < MAX_PARTICLES; i++) {
      const angle = direction + (Math.random() - 0.5) * spread;
      const speed = randomRange(0.05, 0.15) * velocityScale;

      this.particles.push({
        x: x + randomRange(-0.02, 0.02),
        y: y + randomRange(-0.02, 0.02),
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: randomRange(lifeRange[0], lifeRange[1]),
        maxLife: lifeRange[1],
        size: randomRange(sizeRange[0], sizeRange[1]),
        type,
        color: [...color],
        rotation: randomRange(0, Math.PI * 2),
        rotationSpeed: randomRange(-2, 2),
      });
    }
  }

  // Player starts sliding
  emitSlideStart(x: number, y: number) {
    // Initial burst of ice dust
    this.emit(x, y, 20, "frost", {
      color: COLORS.frostWhite,
      velocityScale: 0.8,
      sizeRange: [0.008, 0.015],
      lifeRange: [0.3, 0.6],
      spread: Math.PI * 2,
    });

    // Some ice shards
    this.emit(x, y, 5, "ice", {
      color: COLORS.iceBlue,
      velocityScale: 1.5,
      sizeRange: [0.005, 0.01],
      lifeRange: [0.5, 0.8],
    });
  }

  // Trail while sliding
  emitSlideTrail(fromX: number, fromY: number, toX: number, toY: number) {
    const dx = toX - fromX;
    const dy = toY - fromY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const steps = Math.ceil(dist * 50);

    for (let i = 0; i < steps; i++) {
      const t = i / steps;
      const x = fromX + dx * t;
      const y = fromY + dy * t;

      // Ice dust particles
      this.emit(x, y, 1, "slide", {
        color: lerpColor(COLORS.iceBlue, COLORS.frostWhite, Math.random()),
        velocityScale: 0.3,
        sizeRange: [0.005, 0.012],
        lifeRange: [0.4, 0.8],
      });
    }
  }

  // Hit wall/stop
  emitSlideStop(x: number, y: number) {
    // Impact burst
    this.emit(x, y, 30, "frost", {
      color: COLORS.frostWhite,
      velocityScale: 1.2,
      sizeRange: [0.01, 0.02],
      lifeRange: [0.4, 0.7],
      spread: Math.PI * 2,
    });

    // Ice shards fly out
    this.emit(x, y, 8, "ice", {
      color: COLORS.iceBlue,
      velocityScale: 2.0,
      sizeRange: [0.008, 0.015],
      lifeRange: [0.6, 1.0],
    });

    // Crystal sparkles
    this.emit(x, y, 15, "crystal", {
      color: COLORS.sparkle,
      velocityScale: 0.5,
      sizeRange: [0.003, 0.008],
      lifeRange: [0.3, 0.6],
    });
  }

  // Reach goal
  emitGoalReached(x: number, y: number) {
    // Green celebratory burst
    this.emit(x, y, 40, "crystal", {
      color: COLORS.goalGlow,
      velocityScale: 1.5,
      sizeRange: [0.01, 0.025],
      lifeRange: [0.8, 1.5],
    });

    // Snowflake celebration
    this.emit(x, y, 25, "snowflake", {
      color: COLORS.iceWhite,
      velocityScale: 0.8,
      sizeRange: [0.015, 0.025],
      lifeRange: [1.0, 2.0],
    });

    // Aurora particles
    this.emit(x, y, 15, "aurora", {
      color: COLORS.aurora,
      velocityScale: 0.4,
      sizeRange: [0.02, 0.04],
      lifeRange: [1.0, 1.8],
    });
  }

  // Victory effect
  emitVictory(x: number, y: number) {
    // Massive celebration
    for (let ring = 0; ring < 3; ring++) {
      const delay = ring * 0.1;
      setTimeout(() => {
        this.emit(x, y, 50, "snowflake", {
          color: COLORS.iceWhite,
          velocityScale: 1.5 + ring * 0.5,
          sizeRange: [0.015, 0.03],
          lifeRange: [1.5, 2.5],
        });

        this.emit(x, y, 30, "crystal", {
          color: lerpColor(COLORS.goalGlow, COLORS.aurora, ring / 2),
          velocityScale: 2.0,
          sizeRange: [0.01, 0.02],
          lifeRange: [1.0, 2.0],
        });
      }, delay * 1000);
    }
  }

  // Level start effect
  emitLevelStart(x: number, y: number) {
    // Frost spreading out
    this.emit(x, y, 35, "frost", {
      color: COLORS.frostBlue,
      velocityScale: 1.0,
      sizeRange: [0.01, 0.02],
      lifeRange: [0.8, 1.5],
    });

    // Snowflakes falling
    for (let i = 0; i < 20; i++) {
      const px = randomRange(0.1, 0.9);
      const py = randomRange(0, 0.3);
      this.emit(px, py, 1, "snowflake", {
        color: COLORS.iceWhite,
        velocityScale: 0.2,
        sizeRange: [0.01, 0.02],
        lifeRange: [2.0, 3.0],
      });
    }
  }

  // Reset effect
  emitReset(x: number, y: number) {
    // Ice crystals reforming
    this.emit(x, y, 25, "ice", {
      color: COLORS.iceCyan,
      velocityScale: 0.8,
      sizeRange: [0.01, 0.02],
      lifeRange: [0.6, 1.0],
    });
  }

  // Ambient snowfall
  emitAmbient() {
    // Gentle snowfall
    if (Math.random() < 0.3) {
      const x = randomRange(0, 1);
      const y = randomRange(-0.1, 0);
      this.emit(x, y, 1, "snowflake", {
        color: COLORS.iceWhite,
        velocityScale: 0.1,
        sizeRange: [0.008, 0.015],
        lifeRange: [3.0, 5.0],
      });
    }

    // Occasional frost sparkle
    if (Math.random() < 0.1) {
      const x = randomRange(0.1, 0.9);
      const y = randomRange(0.1, 0.9);
      this.emit(x, y, 1, "crystal", {
        color: COLORS.sparkle,
        velocityScale: 0.05,
        sizeRange: [0.003, 0.006],
        lifeRange: [0.3, 0.5],
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
      data[offset + 4] = p.life;
      data[offset + 5] = p.maxLife;
      data[offset + 6] = p.size;
      data[offset + 7] = PARTICLE_TYPE_MAP[p.type];
      data[offset + 8] = p.color[0];
      data[offset + 9] = p.color[1];
      data[offset + 10] = p.color[2];
      data[offset + 11] = p.rotation;
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
