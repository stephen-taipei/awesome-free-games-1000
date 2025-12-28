/**
 * Puzzle Fighter Particle System
 * Game #172 - VS Battle Arena Theme
 */

import { PUZZLE_COLORS, randomInRange, randomColor, easeOutQuad } from "./math";

export const PARTICLE_TYPES = {
  BLOCK_CLEAR: 0,
  GARBAGE_SEND: 1,
  GARBAGE_RECEIVE: 2,
  COMBO: 3,
  PIECE_LOCK: 4,
  GAME_OVER: 5,
};

export interface Particle {
  position: [number, number];
  velocity: [number, number];
  color: [number, number, number, number];
  life: number;
  maxLife: number;
  size: number;
  type: number;
  rotation: number;
  rotationSpeed: number;
}

export class ParticleSystem {
  public particles: Particle[] = [];
  private maxParticles: number = 2000;

  public update(deltaTime: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];

      // Update life
      p.life -= deltaTime / p.maxLife;

      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      // Update position
      p.position[0] += p.velocity[0] * deltaTime;
      p.position[1] += p.velocity[1] * deltaTime;

      // Update rotation
      p.rotation += p.rotationSpeed * deltaTime;

      // Apply gravity for some types
      if (p.type === PARTICLE_TYPES.BLOCK_CLEAR || p.type === PARTICLE_TYPES.GAME_OVER) {
        p.velocity[1] += 0.5 * deltaTime;
      }

      // Slow down garbage bolts
      if (p.type === PARTICLE_TYPES.GARBAGE_SEND) {
        p.velocity[0] *= 0.98;
      }
    }
  }

  public emitBlockClear(x: number, y: number, colorIndex: number): void {
    const colors = [PUZZLE_COLORS.red, PUZZLE_COLORS.blue, PUZZLE_COLORS.green, PUZZLE_COLORS.yellow];
    const color = colorIndex >= 0 && colorIndex < 4 ? colors[colorIndex] : PUZZLE_COLORS.spark;

    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2 + randomInRange(-0.2, 0.2);
      const speed = randomInRange(0.15, 0.35);

      this.addParticle({
        position: [x, y],
        velocity: [Math.cos(angle) * speed, Math.sin(angle) * speed],
        color: [...color, 1.0] as [number, number, number, number],
        life: 1.0,
        maxLife: randomInRange(0.4, 0.7),
        size: randomInRange(0.015, 0.025),
        type: PARTICLE_TYPES.BLOCK_CLEAR,
        rotation: randomInRange(0, Math.PI * 2),
        rotationSpeed: randomInRange(-5, 5),
      });
    }
  }

  public emitGarbageSend(x: number, y: number, isPlayer: boolean): void {
    const targetX = isPlayer ? 0.75 : 0.25;
    const color = isPlayer ? PUZZLE_COLORS.cpuAura : PUZZLE_COLORS.playerAura;

    for (let i = 0; i < 8; i++) {
      const delay = i * 0.05;
      const angle = Math.atan2(0.5 - y, targetX - x);
      const speed = randomInRange(0.8, 1.2);

      this.addParticle({
        position: [x, y],
        velocity: [Math.cos(angle) * speed, Math.sin(angle) * speed],
        color: [...color, 0.9] as [number, number, number, number],
        life: 1.0,
        maxLife: randomInRange(0.3, 0.5),
        size: randomInRange(0.02, 0.035),
        type: PARTICLE_TYPES.GARBAGE_SEND,
        rotation: angle,
        rotationSpeed: 0,
      });
    }
  }

  public emitGarbageReceive(x: number, y: number): void {
    for (let i = 0; i < 15; i++) {
      const angle = (i / 15) * Math.PI * 2;
      const speed = randomInRange(0.1, 0.25);

      this.addParticle({
        position: [x, y],
        velocity: [Math.cos(angle) * speed, Math.sin(angle) * speed],
        color: [...PUZZLE_COLORS.garbage, 0.8] as [number, number, number, number],
        life: 1.0,
        maxLife: randomInRange(0.3, 0.5),
        size: randomInRange(0.025, 0.04),
        type: PARTICLE_TYPES.GARBAGE_RECEIVE,
        rotation: 0,
        rotationSpeed: 0,
      });
    }
  }

  public emitCombo(x: number, y: number, comboCount: number): void {
    const intensity = Math.min(comboCount, 5);
    const particleCount = 8 + intensity * 4;

    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * Math.PI * 2;
      const speed = randomInRange(0.2, 0.4) * (1 + intensity * 0.2);

      this.addParticle({
        position: [x, y],
        velocity: [Math.cos(angle) * speed, Math.sin(angle) * speed],
        color: [...PUZZLE_COLORS.combo, 1.0] as [number, number, number, number],
        life: 1.0,
        maxLife: randomInRange(0.4, 0.6),
        size: randomInRange(0.02, 0.04) * (1 + intensity * 0.1),
        type: PARTICLE_TYPES.COMBO,
        rotation: randomInRange(0, Math.PI * 2),
        rotationSpeed: randomInRange(-3, 3),
      });
    }
  }

  public emitPieceLock(x: number, y: number, colorIndex: number): void {
    const colors = [PUZZLE_COLORS.red, PUZZLE_COLORS.blue, PUZZLE_COLORS.green, PUZZLE_COLORS.yellow];
    const color = colorIndex >= 0 && colorIndex < 4 ? colors[colorIndex] : PUZZLE_COLORS.spark;

    for (let i = 0; i < 4; i++) {
      this.addParticle({
        position: [x + randomInRange(-0.02, 0.02), y + randomInRange(-0.02, 0.02)],
        velocity: [randomInRange(-0.05, 0.05), randomInRange(-0.1, 0.0)],
        color: [...color, 0.8] as [number, number, number, number],
        life: 1.0,
        maxLife: 0.2,
        size: randomInRange(0.02, 0.03),
        type: PARTICLE_TYPES.PIECE_LOCK,
        rotation: 0,
        rotationSpeed: 0,
      });
    }
  }

  public emitGameOver(x: number, y: number, playerWon: boolean): void {
    const color = playerWon ? PUZZLE_COLORS.victory : PUZZLE_COLORS.defeat;
    const particleCount = playerWon ? 60 : 30;

    for (let i = 0; i < particleCount; i++) {
      const angle = randomInRange(0, Math.PI * 2);
      const speed = randomInRange(0.2, 0.6);
      const useColor = playerWon && Math.random() > 0.5 ? randomColor() : color;

      this.addParticle({
        position: [x, y],
        velocity: [Math.cos(angle) * speed, Math.sin(angle) * speed - 0.3],
        color: [...useColor, 1.0] as [number, number, number, number],
        life: 1.0,
        maxLife: randomInRange(0.8, 1.5),
        size: randomInRange(0.015, 0.035),
        type: PARTICLE_TYPES.GAME_OVER,
        rotation: randomInRange(0, Math.PI * 2),
        rotationSpeed: randomInRange(-8, 8),
      });
    }
  }

  private addParticle(particle: Particle): void {
    if (this.particles.length < this.maxParticles) {
      this.particles.push(particle);
    }
  }

  public clear(): void {
    this.particles = [];
  }

  public getParticleData(): Float32Array {
    const data = new Float32Array(this.particles.length * 12);

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      const offset = i * 12;

      data[offset] = p.position[0];
      data[offset + 1] = p.position[1];
      data[offset + 2] = p.velocity[0];
      data[offset + 3] = p.velocity[1];
      data[offset + 4] = p.color[0];
      data[offset + 5] = p.color[1];
      data[offset + 6] = p.color[2];
      data[offset + 7] = p.color[3];
      data[offset + 8] = p.life;
      data[offset + 9] = p.size;
      data[offset + 10] = p.type;
      data[offset + 11] = p.rotation;
    }

    return data;
  }
}
