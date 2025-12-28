/**
 * Particle System - Robot Program
 * Cyber / Robot / Programming / Circuit Theme
 * Game #095
 */

import { randomRange, randomAngle } from './math';

// Particle types: circuit, spark, robot, pulse, beam, data
export type ParticleType = 'circuit' | 'spark' | 'robot' | 'pulse' | 'beam' | 'data';

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  particleType: number;
  rotation: number;
  param1: number;
}

const PARTICLE_TYPE_MAP: Record<ParticleType, number> = {
  circuit: 0,
  spark: 1,
  robot: 2,
  pulse: 3,
  beam: 4,
  data: 5,
};

// Direction to rotation mapping
const DIRECTION_ROTATION: Record<string, number> = {
  up: -Math.PI / 2,
  down: Math.PI / 2,
  left: Math.PI,
  right: 0,
};

// Direction to param mapping for colors
const DIRECTION_PARAM: Record<string, number> = {
  up: 0,
  down: 0.33,
  left: 0.66,
  right: 1,
};

export class ParticleSystem {
  private particles: Particle[] = [];
  private maxParticles: number = 500;

  public emit(
    x: number,
    y: number,
    type: ParticleType,
    count: number = 1,
    options: Partial<{
      spread: number;
      speed: number;
      size: number;
      life: number;
      rotation: number;
      param1: number;
      directionX: number;
      directionY: number;
    }> = {}
  ): void {
    const {
      spread = 0.5,
      speed = 1,
      size = 20,
      life = 1,
      rotation = 0,
      param1 = 0,
      directionX,
      directionY,
    } = options;

    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) {
        this.particles.shift();
      }

      let vx: number, vy: number;

      if (directionX !== undefined && directionY !== undefined) {
        vx = directionX * speed + randomRange(-spread, spread);
        vy = directionY * speed + randomRange(-spread, spread);
      } else {
        const angle = randomAngle();
        const s = speed * randomRange(0.5, 1.5);
        vx = Math.cos(angle) * s * spread;
        vy = Math.sin(angle) * s * spread;
      }

      const particle: Particle = {
        x: x + randomRange(-3, 3),
        y: y + randomRange(-3, 3),
        vx,
        vy,
        life: life * randomRange(0.8, 1.2),
        maxLife: life * randomRange(0.8, 1.2),
        size: size * randomRange(0.8, 1.2),
        particleType: PARTICLE_TYPE_MAP[type],
        rotation: rotation + randomRange(-0.2, 0.2),
        param1: param1 + randomRange(-0.1, 0.1),
      };

      this.particles.push(particle);
    }
  }

  // Command added effect
  public emitAddCommand(x: number, y: number, direction: string): void {
    const rotation = DIRECTION_ROTATION[direction] ?? 0;
    const param = DIRECTION_PARAM[direction] ?? 0;

    // Command beam
    this.emit(x, y, 'beam', 1, {
      size: 40,
      life: 0.6,
      rotation: rotation,
      param1: param,
    });

    // Electric sparks
    this.emit(x, y, 'spark', 3, {
      spread: 2,
      speed: 2,
      size: 15,
      life: 0.4,
    });

    // Data pulse
    this.emit(x, y, 'pulse', 1, {
      size: 50,
      life: 0.5,
      param1: param,
    });
  }

  // Robot move effect
  public emitRobotMove(x: number, y: number, direction: string): void {
    const rotation = DIRECTION_ROTATION[direction] ?? 0;

    // Robot trail glow
    this.emit(x, y, 'robot', 1, {
      size: 35,
      life: 0.4,
      param1: Math.random(),
    });

    // Circuit traces behind
    for (let i = 0; i < 3; i++) {
      this.emit(x, y, 'circuit', 1, {
        size: 20,
        life: 0.5,
        rotation: rotation + randomRange(-0.3, 0.3),
      });
    }

    // Movement sparks
    this.emit(x, y, 'spark', 2, {
      spread: 1,
      speed: 1.5,
      size: 10,
      life: 0.3,
    });
  }

  // Wall hit effect
  public emitWallHit(x: number, y: number): void {
    // Error sparks
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      this.emit(x, y, 'spark', 1, {
        directionX: Math.cos(angle),
        directionY: Math.sin(angle),
        speed: 3,
        size: 15,
        life: 0.5,
        param1: 0.75, // Red-ish
      });
    }

    // Error pulse
    this.emit(x, y, 'pulse', 2, {
      size: 60,
      life: 0.6,
      param1: 0.75,
    });
  }

  // Goal reached effect
  public emitGoalReached(x: number, y: number): void {
    // Success burst
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      this.emit(x, y, 'data', 1, {
        directionX: Math.cos(angle),
        directionY: Math.sin(angle),
        speed: 3,
        size: 25,
        life: 0.7,
        param1: i / 12,
      });
    }

    // Success glow
    this.emit(x, y, 'robot', 2, {
      size: 50,
      life: 0.8,
      param1: 0.25, // Green-ish
    });

    // Circuit celebration
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const dist = 40;
      this.emit(
        x + Math.cos(angle) * dist,
        y + Math.sin(angle) * dist,
        'circuit',
        1,
        {
          size: 30,
          life: 0.6,
          rotation: angle,
        }
      );
    }
  }

  // Victory celebration
  public emitVictory(centerX: number, centerY: number): void {
    // Multiple pulse rings
    for (let ring = 0; ring < 4; ring++) {
      setTimeout(() => {
        this.emit(centerX, centerY, 'pulse', 1, {
          size: 100 + ring * 40,
          life: 0.8,
          param1: ring / 4,
        });
      }, ring * 100);
    }

    // Data explosion
    for (let i = 0; i < 16; i++) {
      const angle = (i / 16) * Math.PI * 2;
      this.emit(centerX, centerY, 'data', 1, {
        directionX: Math.cos(angle),
        directionY: Math.sin(angle),
        speed: 4,
        size: 30,
        life: 1,
        param1: i / 16,
      });
    }

    // Circuit web
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const dist = 80;
      this.emit(
        centerX + Math.cos(angle) * dist,
        centerY + Math.sin(angle) * dist,
        'circuit',
        1,
        {
          size: 40,
          life: 1,
          rotation: angle,
        }
      );
    }

    // Spark shower
    for (let i = 0; i < 20; i++) {
      this.emit(centerX, centerY, 'spark', 1, {
        spread: 4,
        speed: 5,
        size: 15,
        life: 1,
        param1: i / 20,
      });
    }
  }

  // Level start
  public emitLevelStart(robotX: number, robotY: number): void {
    // Robot activation
    this.emit(robotX, robotY, 'robot', 2, {
      size: 45,
      life: 0.8,
    });

    // Boot sequence pulses
    for (let i = 0; i < 3; i++) {
      setTimeout(() => {
        this.emit(robotX, robotY, 'pulse', 1, {
          size: 50 + i * 20,
          life: 0.6,
          param1: i / 3,
        });
      }, i * 100);
    }

    // Initial sparks
    this.emit(robotX, robotY, 'spark', 5, {
      spread: 2,
      speed: 2,
      size: 12,
      life: 0.5,
    });
  }

  // Run program effect
  public emitRunProgram(x: number, y: number): void {
    // Execution pulse
    this.emit(x, y, 'pulse', 2, {
      size: 60,
      life: 0.5,
      param1: 0.25, // Green
    });

    // Data streams
    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2;
      this.emit(x, y, 'data', 1, {
        directionX: Math.cos(angle),
        directionY: Math.sin(angle),
        speed: 2,
        size: 20,
        life: 0.5,
      });
    }
  }

  // Reset effect
  public emitReset(): void {
    this.particles.forEach(p => {
      p.life *= 0.3;
    });
  }

  public update(deltaTime: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];

      // Update position
      p.x += p.vx;
      p.y += p.vy;

      // Apply friction
      p.vx *= 0.96;
      p.vy *= 0.96;

      // Update life
      p.life -= deltaTime;

      // Slow rotation for circuit types
      if (p.particleType === PARTICLE_TYPE_MAP.circuit) {
        p.rotation += deltaTime * 0.1;
      }

      // Remove dead particles
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  public getParticles(): Particle[] {
    return this.particles;
  }

  public clear(): void {
    this.particles = [];
  }
}
