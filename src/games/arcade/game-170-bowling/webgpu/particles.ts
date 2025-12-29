/**
 * Bowling Particle System
 * Game #170 - 6 particle types for bowling effects
 */

import {
  BOWLING_COLORS,
  randomInRange,
  lerpColor,
  easeOutCubic,
  easeOutBounce,
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
  BALL_ROLL: 0,
  PIN_HIT: 1,
  PIN_FALL: 2,
  STRIKE: 3,
  SPARE: 4,
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

      // Apply gravity to some types
      if (
        p.particleType === ParticleType.PIN_HIT ||
        p.particleType === ParticleType.PIN_FALL
      ) {
        p.velocity[1] += 0.5 * delta;
      }

      // Apply drag
      p.velocity[0] *= 0.99;
      p.velocity[1] *= 0.99;
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

  // Ball rolling trail
  public emitBallRoll(x: number, y: number): void {
    const count = 2;
    for (let i = 0; i < count; i++) {
      const life = randomInRange(0.3, 0.5);
      this.particles.push({
        position: [x + randomInRange(-0.01, 0.01), y + randomInRange(-0.01, 0.01)],
        velocity: [randomInRange(-0.02, 0.02), randomInRange(0.01, 0.03)],
        color: lerpColor(
          BOWLING_COLORS.ballPurple,
          BOWLING_COLORS.ballDark,
          Math.random()
        ),
        size: randomInRange(0.008, 0.015),
        life,
        maxLife: life,
        particleType: ParticleType.BALL_ROLL,
      });
    }
  }

  // Pin hit sparks
  public emitPinHit(x: number, y: number): void {
    const count = 25;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = randomInRange(0.1, 0.4);
      const life = randomInRange(0.4, 0.8);

      this.particles.push({
        position: [x, y],
        velocity: [Math.cos(angle) * speed, Math.sin(angle) * speed],
        color: lerpColor(
          BOWLING_COLORS.impact,
          BOWLING_COLORS.sparks,
          Math.random()
        ),
        size: randomInRange(0.01, 0.025),
        life,
        maxLife: life,
        particleType: ParticleType.PIN_HIT,
      });
    }
  }

  // Pin falling effect
  public emitPinFall(x: number, y: number): void {
    const count = 8;
    for (let i = 0; i < count; i++) {
      const angle = randomInRange(-Math.PI * 0.75, Math.PI * 0.75);
      const speed = randomInRange(0.05, 0.15);
      const life = randomInRange(0.6, 1.0);

      this.particles.push({
        position: [x, y],
        velocity: [Math.cos(angle) * speed, Math.sin(angle) * speed - 0.1],
        color: lerpColor(
          BOWLING_COLORS.pinWhite,
          BOWLING_COLORS.pinRed,
          Math.random() * 0.3
        ),
        size: randomInRange(0.015, 0.03),
        life,
        maxLife: life,
        particleType: ParticleType.PIN_FALL,
      });
    }
  }

  // Strike celebration
  public emitStrike(x: number, y: number): void {
    const count = 100;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = randomInRange(0.1, 0.5);
      const life = randomInRange(1.0, 2.0);

      this.particles.push({
        position: [x, y],
        velocity: [Math.cos(angle) * speed, Math.sin(angle) * speed],
        color: lerpColor(
          BOWLING_COLORS.strikeGold,
          BOWLING_COLORS.sparks,
          Math.random()
        ),
        size: randomInRange(0.02, 0.05),
        life,
        maxLife: life,
        particleType: ParticleType.STRIKE,
      });
    }
  }

  // Spare celebration
  public emitSpare(x: number, y: number): void {
    const count = 60;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = randomInRange(0.08, 0.35);
      const life = randomInRange(0.8, 1.5);

      this.particles.push({
        position: [x, y],
        velocity: [Math.cos(angle) * speed, Math.sin(angle) * speed],
        color: lerpColor(
          BOWLING_COLORS.spareBlue,
          BOWLING_COLORS.pinWhite,
          Math.random()
        ),
        size: randomInRange(0.015, 0.035),
        life,
        maxLife: life,
        particleType: ParticleType.SPARE,
      });
    }
  }

  // Game over effect
  public emitGameOver(x: number, y: number, victory: boolean): void {
    const count = 80;
    const color1 = victory ? BOWLING_COLORS.strikeGold : BOWLING_COLORS.pinWhite;
    const color2 = victory ? BOWLING_COLORS.sparks : BOWLING_COLORS.gutterBlue;

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = randomInRange(0.05, 0.25);
      const life = randomInRange(1.5, 3.0);

      this.particles.push({
        position: [x + randomInRange(-0.1, 0.1), y + randomInRange(-0.1, 0.1)],
        velocity: [Math.cos(angle) * speed, Math.sin(angle) * speed],
        color: lerpColor(color1, color2, Math.random()),
        size: randomInRange(0.02, 0.045),
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
