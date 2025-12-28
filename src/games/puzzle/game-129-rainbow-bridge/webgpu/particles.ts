/**
 * Particle System - Rainbow Bridge
 * Rainbow / Sky Theme
 * Game #129
 */

import { COLORS, randomRange, getRainbowColor, lerpColor } from "./math";

export type ParticleType =
  | "rainbow"
  | "sparkle"
  | "cloud"
  | "prism"
  | "colorOrb"
  | "star";

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
  rainbow: 0,
  sparkle: 1,
  cloud: 2,
  prism: 3,
  colorOrb: 4,
  star: 5,
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

      // Gravity for some types
      if (p.type === "sparkle" || p.type === "star") {
        p.vy += 0.1 * deltaTime;
      }

      // Clouds float up
      if (p.type === "cloud") {
        p.vy -= 0.02 * deltaTime;
        p.vx *= 0.99;
      }

      // Color orbs slow down
      if (p.type === "colorOrb") {
        p.vx *= 0.96;
        p.vy *= 0.96;
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
      color = COLORS.sparkle,
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

  // Color selected from palette
  emitColorSelect(x: number, y: number, color: number[]) {
    // Sparkle burst
    this.emit(x, y, 15, "sparkle", {
      color,
      velocityScale: 0.8,
      sizeRange: [0.008, 0.015],
      lifeRange: [0.4, 0.7],
      spread: Math.PI * 2,
    });

    // Color orb highlight
    this.emit(x, y, 5, "colorOrb", {
      color,
      velocityScale: 0.3,
      sizeRange: [0.015, 0.025],
      lifeRange: [0.3, 0.5],
    });
  }

  // Color placed on bridge
  emitColorPlace(x: number, y: number, color: number[]) {
    // Color explosion
    this.emit(x, y, 25, "colorOrb", {
      color,
      velocityScale: 1.2,
      sizeRange: [0.01, 0.02],
      lifeRange: [0.5, 0.9],
      spread: Math.PI * 2,
    });

    // Rainbow particles
    this.emit(x, y, 10, "rainbow", {
      color,
      velocityScale: 0.5,
      sizeRange: [0.02, 0.035],
      lifeRange: [0.6, 1.0],
      direction: -Math.PI / 2,
      spread: Math.PI / 2,
    });

    // Sparkles
    this.emit(x, y, 15, "sparkle", {
      color: COLORS.sparkle,
      velocityScale: 1.0,
      sizeRange: [0.005, 0.01],
      lifeRange: [0.4, 0.7],
    });
  }

  // Wrong placement
  emitWrongPlace(x: number, y: number) {
    // Cloud puff (indicating error)
    this.emit(x, y, 20, "cloud", {
      color: COLORS.cloudShadow,
      velocityScale: 0.6,
      sizeRange: [0.015, 0.03],
      lifeRange: [0.4, 0.7],
    });
  }

  // Correct sequence / bridge complete
  emitBridgeComplete(bridgeStartX: number, bridgeEndX: number, y: number) {
    const steps = 20;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = bridgeStartX + (bridgeEndX - bridgeStartX) * t;
      const color = getRainbowColor(i % 7);

      // Rainbow arc particles along bridge
      this.emit(x, y, 3, "rainbow", {
        color,
        velocityScale: 0.4,
        sizeRange: [0.02, 0.03],
        lifeRange: [1.0, 1.5],
        direction: -Math.PI / 2,
        spread: Math.PI / 3,
      });
    }
  }

  // Victory celebration
  emitVictory(x: number, y: number) {
    // Massive rainbow explosion
    for (let i = 0; i < 7; i++) {
      const color = getRainbowColor(i);
      const delay = i * 0.05;

      setTimeout(() => {
        this.emit(x, y, 20, "colorOrb", {
          color,
          velocityScale: 2.0,
          sizeRange: [0.015, 0.03],
          lifeRange: [1.0, 2.0],
        });

        this.emit(x, y, 15, "star", {
          color,
          velocityScale: 1.5,
          sizeRange: [0.02, 0.035],
          lifeRange: [1.2, 1.8],
        });
      }, delay * 1000);
    }

    // Prism light burst
    this.emit(x, y, 30, "prism", {
      color: COLORS.prismLight,
      velocityScale: 1.0,
      sizeRange: [0.02, 0.04],
      lifeRange: [1.5, 2.5],
    });

    // Golden sparkles
    this.emit(x, y, 40, "sparkle", {
      color: COLORS.goldGlow,
      velocityScale: 1.8,
      sizeRange: [0.01, 0.02],
      lifeRange: [1.0, 1.5],
    });
  }

  // Level start
  emitLevelStart(x: number, y: number) {
    // Prism light
    this.emit(x, y, 25, "prism", {
      color: COLORS.prismLight,
      velocityScale: 0.8,
      sizeRange: [0.02, 0.035],
      lifeRange: [0.8, 1.2],
    });

    // Clouds forming
    this.emit(x, y, 15, "cloud", {
      color: COLORS.cloudWhite,
      velocityScale: 0.3,
      sizeRange: [0.03, 0.05],
      lifeRange: [1.0, 1.5],
    });
  }

  // Reset
  emitReset(x: number, y: number) {
    this.emit(x, y, 20, "cloud", {
      color: COLORS.cloudWhite,
      velocityScale: 0.5,
      sizeRange: [0.02, 0.04],
      lifeRange: [0.5, 0.8],
    });
  }

  // Ambient particles
  emitAmbient() {
    // Occasional sparkle
    if (Math.random() < 0.2) {
      const x = randomRange(0.1, 0.9);
      const y = randomRange(0.3, 0.7);
      const color = getRainbowColor(Math.floor(Math.random() * 7));

      this.emit(x, y, 1, "sparkle", {
        color,
        velocityScale: 0.1,
        sizeRange: [0.005, 0.01],
        lifeRange: [0.5, 1.0],
      });
    }

    // Floating cloud puffs
    if (Math.random() < 0.1) {
      const x = randomRange(0, 1);
      const y = randomRange(0.5, 0.9);
      this.emit(x, y, 1, "cloud", {
        color: COLORS.cloudWhite,
        velocityScale: 0.1,
        sizeRange: [0.02, 0.04],
        lifeRange: [2.0, 3.0],
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
