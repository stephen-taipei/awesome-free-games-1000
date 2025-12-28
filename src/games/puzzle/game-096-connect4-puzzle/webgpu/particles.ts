/**
 * Particle System - Connect 4 Puzzle
 * Neon / Board Game / Grid / Discs Theme
 * Game #096
 */

import { lerp, randomInRange, randomAngle, easeOutBounce } from './math';

export type ParticleType = 'disc' | 'drop' | 'connect' | 'spark' | 'glow' | 'pulse';

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  type: ParticleType;
  rotation: number;
  extra: number; // 0-1, >0.5 = red, <=0.5 = yellow
}

const PARTICLE_TYPE_MAP: Record<ParticleType, number> = {
  disc: 0,
  drop: 1,
  connect: 2,
  spark: 3,
  glow: 4,
  pulse: 5,
};

export class ParticleSystem {
  private particles: Particle[] = [];
  private maxParticles: number = 500;
  private width: number;
  private height: number;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
  }

  public resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
  }

  public update(deltaTime: number): void {
    const dt = Math.min(deltaTime, 0.05);
    const gravity = 400;

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];

      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      // Type-specific physics
      switch (p.type) {
        case 'disc':
          // Falling disc with gravity and bounce
          p.vy += gravity * dt;
          p.rotation += p.vx * 0.01;
          break;
        case 'drop':
          // Expanding splash - no movement
          break;
        case 'connect':
          // Static connection line
          break;
        case 'spark':
          // Floating sparks
          p.vy -= 30 * dt; // Float upward
          p.vx *= 0.98;
          p.rotation += dt * 5;
          break;
        case 'glow':
          // Slowly fading glow
          p.vy -= 10 * dt;
          break;
        case 'pulse':
          // Expanding pulse rings - static
          break;
      }

      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
  }

  public getParticleData(): Float32Array {
    const data = new Float32Array(this.maxParticles * 10);

    for (let i = 0; i < this.particles.length && i < this.maxParticles; i++) {
      const p = this.particles[i];
      const offset = i * 10;

      data[offset + 0] = p.x;
      data[offset + 1] = p.y;
      data[offset + 2] = p.vx;
      data[offset + 3] = p.vy;
      data[offset + 4] = p.life;
      data[offset + 5] = p.maxLife;
      data[offset + 6] = p.size;
      data[offset + 7] = PARTICLE_TYPE_MAP[p.type];
      data[offset + 8] = p.rotation;
      data[offset + 9] = p.extra;
    }

    return data;
  }

  public getParticleCount(): number {
    return Math.min(this.particles.length, this.maxParticles);
  }

  private addParticle(particle: Particle): void {
    if (this.particles.length < this.maxParticles) {
      this.particles.push(particle);
    }
  }

  // Piece drop animation
  public emitPieceDrop(x: number, startY: number, endY: number, isRed: boolean): void {
    // Main disc falling
    this.addParticle({
      x,
      y: startY,
      vx: randomInRange(-5, 5),
      vy: 0,
      life: 1.5,
      maxLife: 1.5,
      size: 25,
      type: 'disc',
      rotation: 0,
      extra: isRed ? 0.8 : 0.2,
    });

    // Trail particles
    for (let i = 0; i < 8; i++) {
      const delay = i * 0.05;
      setTimeout(() => {
        this.addParticle({
          x: x + randomInRange(-10, 10),
          y: startY + i * 20,
          vx: randomInRange(-20, 20),
          vy: randomInRange(50, 150),
          life: 0.5,
          maxLife: 0.5,
          size: 8 + Math.random() * 8,
          type: 'glow',
          rotation: 0,
          extra: isRed ? 0.8 : 0.2,
        });
      }, delay * 1000);
    }
  }

  // Landing splash
  public emitPieceLand(x: number, y: number, isRed: boolean): void {
    // Splash ring
    this.addParticle({
      x,
      y,
      vx: 0,
      vy: 0,
      life: 0.5,
      maxLife: 0.5,
      size: 40,
      type: 'drop',
      rotation: 0,
      extra: isRed ? 0.8 : 0.2,
    });

    // Splash sparks
    for (let i = 0; i < 10; i++) {
      const angle = (i / 10) * Math.PI * 2;
      const speed = randomInRange(80, 150);
      this.addParticle({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 50,
        life: randomInRange(0.4, 0.8),
        maxLife: 0.8,
        size: randomInRange(4, 8),
        type: 'spark',
        rotation: randomAngle(),
        extra: isRed ? 0.8 : 0.2,
      });
    }
  }

  // Winning connection line
  public emitWinConnection(cells: [number, number][], cellSize: number, offsetX: number, offsetY: number): void {
    if (cells.length < 2) return;

    // Calculate line direction
    const firstCell = cells[0];
    const lastCell = cells[cells.length - 1];

    const x1 = offsetX + firstCell[1] * cellSize + cellSize / 2;
    const y1 = offsetY + firstCell[0] * cellSize + cellSize / 2;
    const x2 = offsetX + lastCell[1] * cellSize + cellSize / 2;
    const y2 = offsetY + lastCell[0] * cellSize + cellSize / 2;

    const centerX = (x1 + x2) / 2;
    const centerY = (y1 + y2) / 2;
    const angle = Math.atan2(y2 - y1, x2 - x1);
    const length = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);

    // Connection line
    this.addParticle({
      x: centerX,
      y: centerY,
      vx: 0,
      vy: 0,
      life: 2.0,
      maxLife: 2.0,
      size: length / 2 + 20,
      type: 'connect',
      rotation: angle,
      extra: 0.5,
    });

    // Highlight each winning cell
    cells.forEach(([row, col], index) => {
      const cx = offsetX + col * cellSize + cellSize / 2;
      const cy = offsetY + row * cellSize + cellSize / 2;

      setTimeout(() => {
        this.addParticle({
          x: cx,
          y: cy,
          vx: 0,
          vy: 0,
          life: 1.5,
          maxLife: 1.5,
          size: 30,
          type: 'pulse',
          rotation: 0,
          extra: 0.5,
        });
      }, index * 100);
    });
  }

  // Victory celebration
  public emitVictory(centerX: number, centerY: number): void {
    // Big burst of sparks
    for (let i = 0; i < 50; i++) {
      const angle = randomAngle();
      const speed = randomInRange(100, 300);
      const delay = Math.random() * 0.5;

      setTimeout(() => {
        this.addParticle({
          x: centerX + randomInRange(-50, 50),
          y: centerY + randomInRange(-50, 50),
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: randomInRange(1.0, 2.0),
          maxLife: 2.0,
          size: randomInRange(8, 20),
          type: 'spark',
          rotation: randomAngle(),
          extra: Math.random(),
        });
      }, delay * 1000);
    }

    // Victory pulse rings
    for (let i = 0; i < 5; i++) {
      setTimeout(() => {
        this.addParticle({
          x: centerX,
          y: centerY,
          vx: 0,
          vy: 0,
          life: 1.5,
          maxLife: 1.5,
          size: 60 + i * 20,
          type: 'pulse',
          rotation: 0,
          extra: 0.5,
        });
      }, i * 200);
    }

    // Floating discs
    for (let i = 0; i < 20; i++) {
      const angle = randomAngle();
      const radius = randomInRange(100, 200);

      this.addParticle({
        x: centerX + Math.cos(angle) * radius,
        y: centerY + Math.sin(angle) * radius,
        vx: Math.cos(angle) * 30,
        vy: Math.sin(angle) * 30 - 50,
        life: randomInRange(1.5, 2.5),
        maxLife: 2.5,
        size: randomInRange(15, 25),
        type: 'disc',
        rotation: randomAngle(),
        extra: Math.random() > 0.5 ? 0.8 : 0.2,
      });
    }
  }

  // Hint highlight
  public emitHint(x: number, y: number): void {
    // Pulsing glow at hint position
    for (let i = 0; i < 3; i++) {
      setTimeout(() => {
        this.addParticle({
          x,
          y,
          vx: 0,
          vy: 0,
          life: 1.0,
          maxLife: 1.0,
          size: 30 + i * 10,
          type: 'pulse',
          rotation: 0,
          extra: 0.5,
        });
      }, i * 200);
    }
  }

  // Undo effect
  public emitUndo(x: number, y: number, isRed: boolean): void {
    // Piece dissolving
    for (let i = 0; i < 15; i++) {
      const angle = randomAngle();
      const speed = randomInRange(50, 120);

      this.addParticle({
        x: x + randomInRange(-15, 15),
        y: y + randomInRange(-15, 15),
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 30,
        life: randomInRange(0.5, 1.0),
        maxLife: 1.0,
        size: randomInRange(6, 12),
        type: 'glow',
        rotation: randomAngle(),
        extra: isRed ? 0.8 : 0.2,
      });
    }
  }

  // Reset effect
  public emitReset(): void {
    // Clear burst from center
    const centerX = this.width / 2;
    const centerY = this.height / 2;

    for (let i = 0; i < 30; i++) {
      const angle = (i / 30) * Math.PI * 2;
      const speed = randomInRange(150, 250);

      this.addParticle({
        x: centerX,
        y: centerY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.8,
        maxLife: 0.8,
        size: randomInRange(8, 15),
        type: 'spark',
        rotation: randomAngle(),
        extra: Math.random(),
      });
    }
  }

  // Level start effect
  public emitLevelStart(): void {
    const centerX = this.width / 2;
    const centerY = this.height / 2;

    // Welcome burst
    for (let i = 0; i < 20; i++) {
      const angle = randomAngle();
      const radius = randomInRange(50, 150);

      this.addParticle({
        x: centerX + Math.cos(angle) * radius,
        y: centerY + Math.sin(angle) * radius,
        vx: Math.cos(angle) * 50,
        vy: -Math.abs(Math.sin(angle) * 80) - 30,
        life: randomInRange(1.0, 1.5),
        maxLife: 1.5,
        size: randomInRange(10, 18),
        type: 'disc',
        rotation: randomAngle(),
        extra: Math.random() > 0.5 ? 0.8 : 0.2,
      });
    }
  }

  // Switch piece effect
  public emitSwitchPiece(x: number, y: number, toRed: boolean): void {
    for (let i = 0; i < 10; i++) {
      const angle = randomAngle();

      this.addParticle({
        x: x + Math.cos(angle) * 20,
        y: y + Math.sin(angle) * 20,
        vx: Math.cos(angle) * 40,
        vy: Math.sin(angle) * 40,
        life: 0.6,
        maxLife: 0.6,
        size: randomInRange(6, 12),
        type: 'spark',
        rotation: randomAngle(),
        extra: toRed ? 0.8 : 0.2,
      });
    }
  }

  public clear(): void {
    this.particles = [];
  }
}
