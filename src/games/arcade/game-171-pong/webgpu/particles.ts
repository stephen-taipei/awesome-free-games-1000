/**
 * Pong Particle System
 * Game #171 - 6 particle types for retro arcade effects
 */

import {
  PONG_COLORS,
  randomInRange,
  lerpColor,
  easeOutCubic,
} from "./math";

export interface Particle {
  position: [number, number];
  velocity: [number, number];
  color: [number, number, number, number];
  size: number;
  life: number;
  maxLife: number;
  particleType: number;
}

export const PARTICLE_STRIDE = 12; // floats per particle
export const MAX_PARTICLES = 2000;

// Particle types
export const ParticleType = {
  WALL_BOUNCE: 0,
  PADDLE_HIT: 1,
  PLAYER_SCORE: 2,
  CPU_SCORE: 3,
  BALL_TRAIL: 4,
  GAME_OVER: 5,
};

export function createParticleData(): Float32Array {
  return new Float32Array(MAX_PARTICLES * PARTICLE_STRIDE);
}

export class ParticleManager {
  private particles: Particle[] = [];

  public update(delta: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= delta;

      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      // Update position
      p.position[0] += p.velocity[0] * delta;
      p.position[1] += p.velocity[1] * delta;

      // Apply drag
      p.velocity[0] *= 0.98;
      p.velocity[1] *= 0.98;
    }
  }

  public writeToBuffer(buffer: Float32Array): number {
    const count = Math.min(this.particles.length, MAX_PARTICLES);

    for (let i = 0; i < count; i++) {
      const p = this.particles[i];
      const offset = i * PARTICLE_STRIDE;

      buffer[offset + 0] = p.position[0];
      buffer[offset + 1] = p.position[1];
      buffer[offset + 2] = p.velocity[0];
      buffer[offset + 3] = p.velocity[1];
      buffer[offset + 4] = p.color[0];
      buffer[offset + 5] = p.color[1];
      buffer[offset + 6] = p.color[2];
      buffer[offset + 7] = p.color[3];
      buffer[offset + 8] = p.size;
      buffer[offset + 9] = p.life;
      buffer[offset + 10] = p.maxLife;
      buffer[offset + 11] = p.particleType;
    }

    return count;
  }

  // Wall bounce sparks
  public emitWallBounce(x: number, y: number, isTop: boolean): void {
    const count = 12;
    for (let i = 0; i < count; i++) {
      const angle = isTop
        ? randomInRange(0.2, Math.PI - 0.2)
        : randomInRange(Math.PI + 0.2, 2 * Math.PI - 0.2);
      const speed = randomInRange(0.1, 0.3);
      const life = randomInRange(0.3, 0.6);

      this.particles.push({
        position: [x, y],
        velocity: [Math.cos(angle) * speed, Math.sin(angle) * speed],
        color: lerpColor(
          PONG_COLORS.neonCyan,
          PONG_COLORS.ballWhite,
          Math.random()
        ),
        size: randomInRange(0.008, 0.015),
        life,
        maxLife: life,
        particleType: ParticleType.WALL_BOUNCE,
      });
    }
  }

  // Paddle hit pixels
  public emitPaddleHit(x: number, y: number, isPlayer: boolean): void {
    const count = 20;
    const baseColor = isPlayer ? PONG_COLORS.playerBright : PONG_COLORS.cpuBright;
    const accentColor = isPlayer ? PONG_COLORS.playerGreen : PONG_COLORS.cpuRed;

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = randomInRange(0.15, 0.4);
      const life = randomInRange(0.4, 0.8);

      this.particles.push({
        position: [x, y],
        velocity: [Math.cos(angle) * speed, Math.sin(angle) * speed],
        color: lerpColor(baseColor, accentColor, Math.random()),
        size: randomInRange(0.01, 0.02),
        life,
        maxLife: life,
        particleType: ParticleType.PADDLE_HIT,
      });
    }
  }

  // Player score celebration
  public emitPlayerScore(x: number, y: number): void {
    const count = 40;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = randomInRange(0.1, 0.4);
      const life = randomInRange(0.8, 1.5);

      this.particles.push({
        position: [x, y + randomInRange(-0.2, 0.2)],
        velocity: [Math.cos(angle) * speed, Math.sin(angle) * speed],
        color: lerpColor(
          PONG_COLORS.playerBright,
          PONG_COLORS.neonCyan,
          Math.random()
        ),
        size: randomInRange(0.015, 0.035),
        life,
        maxLife: life,
        particleType: ParticleType.PLAYER_SCORE,
      });
    }
  }

  // CPU score effect
  public emitCPUScore(x: number, y: number): void {
    const count = 40;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = randomInRange(0.1, 0.4);
      const life = randomInRange(0.8, 1.5);

      this.particles.push({
        position: [x, y + randomInRange(-0.2, 0.2)],
        velocity: [Math.cos(angle) * speed, Math.sin(angle) * speed],
        color: lerpColor(
          PONG_COLORS.cpuBright,
          PONG_COLORS.neonMagenta,
          Math.random()
        ),
        size: randomInRange(0.015, 0.035),
        life,
        maxLife: life,
        particleType: ParticleType.CPU_SCORE,
      });
    }
  }

  // Ball trail
  public emitBallTrail(x: number, y: number): void {
    const life = randomInRange(0.15, 0.25);
    this.particles.push({
      position: [x, y],
      velocity: [randomInRange(-0.01, 0.01), randomInRange(-0.01, 0.01)],
      color: lerpColor(
        PONG_COLORS.ballWhite,
        PONG_COLORS.ballGlow,
        Math.random()
      ),
      size: randomInRange(0.012, 0.018),
      life,
      maxLife: life,
      particleType: ParticleType.BALL_TRAIL,
    });
  }

  // Game over burst
  public emitGameOver(x: number, y: number, playerWon: boolean): void {
    const count = 100;
    const color1 = playerWon ? PONG_COLORS.playerBright : PONG_COLORS.cpuBright;
    const color2 = playerWon ? PONG_COLORS.neonCyan : PONG_COLORS.neonMagenta;

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = randomInRange(0.05, 0.3);
      const life = randomInRange(1.5, 3.0);

      this.particles.push({
        position: [x + randomInRange(-0.05, 0.05), y + randomInRange(-0.05, 0.05)],
        velocity: [Math.cos(angle) * speed, Math.sin(angle) * speed],
        color: lerpColor(color1, color2, Math.random()),
        size: randomInRange(0.02, 0.05),
        life,
        maxLife: life,
        particleType: ParticleType.GAME_OVER,
      });
    }
  }

  public clear(): void {
    this.particles = [];
  }

  public get count(): number {
    return this.particles.length;
  }
}
