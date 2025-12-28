/**
 * Particle System - Traffic Sign
 * Urban / Road / Traffic Theme
 * Game #135
 */

import { TRAFFIC_COLORS, randomInRange, lerpColor, getSignColor } from './math';

export type ParticleType =
  | 'roadLine'       // Road marking segment
  | 'trafficCone'    // Orange traffic cone
  | 'carLight'       // Headlight beam
  | 'signGlow'       // Sign glow/flash
  | 'asphaltSparkle' // Road sparkle
  | 'indicator';     // Selection indicator

export interface Particle {
  position: [number, number];
  velocity: [number, number];
  color: [number, number, number, number];
  size: number;
  life: number;
  maxLife: number;
  particleType: number;
  rotation: number;
  rotationSpeed: number;
}

const PARTICLE_TYPE_MAP: Record<ParticleType, number> = {
  roadLine: 0,
  trafficCone: 1,
  carLight: 2,
  signGlow: 3,
  asphaltSparkle: 4,
  indicator: 5,
};

export class ParticleSystem {
  private particles: Particle[] = [];
  private maxParticles = 600;

  update(deltaTime: number) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];

      // Update position
      p.position[0] += p.velocity[0] * deltaTime;
      p.position[1] += p.velocity[1] * deltaTime;

      // Update rotation
      p.rotation += p.rotationSpeed * deltaTime;

      // Apply physics based on type
      switch (p.particleType) {
        case 0: // roadLine - drift down
          p.velocity[1] += 0.05 * deltaTime;
          break;
        case 1: // trafficCone - settle
          p.velocity[0] *= 0.95;
          p.velocity[1] *= 0.95;
          break;
        case 2: // carLight - fade fast
          p.velocity[0] *= 0.9;
          p.velocity[1] *= 0.9;
          break;
        case 3: // signGlow - pulse in place
          p.velocity[0] *= 0.8;
          p.velocity[1] *= 0.8;
          break;
        case 4: // asphaltSparkle - quick fade
          p.velocity[0] *= 0.85;
          p.velocity[1] *= 0.85;
          break;
        case 5: // indicator - orbit
          const angle = Math.atan2(p.velocity[1], p.velocity[0]);
          p.velocity[0] = Math.cos(angle + deltaTime) * 0.05;
          p.velocity[1] = Math.sin(angle + deltaTime) * 0.05;
          break;
      }

      // Update life
      p.life -= deltaTime / p.maxLife;

      // Remove dead particles
      if (p.life <= 0 || p.position[0] < -0.2 || p.position[0] > 1.2 ||
          p.position[1] < -0.2 || p.position[1] > 1.2) {
        this.particles.splice(i, 1);
      }
    }
  }

  emit(
    x: number,
    y: number,
    type: ParticleType,
    count: number = 1,
    options: Partial<{
      color: readonly number[];
      signColor: string;
      spread: number;
      speed: number;
      size: number;
      life: number;
    }> = {}
  ) {
    const baseSpread = options.spread ?? 0.05;
    const baseSpeed = options.speed ?? 0.1;
    const baseSize = options.size ?? 0.02;
    const baseLife = options.life ?? 1.5;

    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) {
        this.particles.shift();
      }

      const angle = Math.random() * Math.PI * 2;
      const speed = randomInRange(baseSpeed * 0.5, baseSpeed);

      let color: number[];
      if (options.color) {
        color = [...options.color] as number[];
      } else if (options.signColor) {
        color = [...getSignColor(options.signColor)] as number[];
      } else {
        color = this.getDefaultColor(type);
      }

      // Add some color variation
      color[0] = Math.min(1, color[0] + randomInRange(-0.08, 0.08));
      color[1] = Math.min(1, color[1] + randomInRange(-0.08, 0.08));
      color[2] = Math.min(1, color[2] + randomInRange(-0.08, 0.08));

      this.particles.push({
        position: [
          x + randomInRange(-baseSpread, baseSpread),
          y + randomInRange(-baseSpread, baseSpread),
        ],
        velocity: [
          Math.cos(angle) * speed,
          Math.sin(angle) * speed,
        ],
        color: color as [number, number, number, number],
        size: randomInRange(baseSize * 0.5, baseSize * 1.5),
        life: 1.0,
        maxLife: randomInRange(baseLife * 0.7, baseLife * 1.3),
        particleType: PARTICLE_TYPE_MAP[type],
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: randomInRange(-2, 2),
      });
    }
  }

  private getDefaultColor(type: ParticleType): number[] {
    switch (type) {
      case 'roadLine':
        return [...TRAFFIC_COLORS.roadLine];
      case 'trafficCone':
        return [...TRAFFIC_COLORS.trafficCone];
      case 'carLight':
        return [...TRAFFIC_COLORS.headlight];
      case 'signGlow':
        return [...TRAFFIC_COLORS.warningYellow];
      case 'asphaltSparkle':
        return [...TRAFFIC_COLORS.whiteMarking];
      case 'indicator':
        return [...TRAFFIC_COLORS.infoBlue];
      default:
        return [1, 1, 1, 1];
    }
  }

  emitSignSelect(x: number, y: number, signColor: string) {
    // Sign glow
    this.emit(x, y, 'signGlow', 10, {
      signColor,
      spread: 0.03,
      speed: 0.08,
      size: 0.03,
      life: 0.8
    });

    // Selection indicator ring
    this.emit(x, y, 'indicator', 6, {
      color: TRAFFIC_COLORS.warningYellow,
      spread: 0.04,
      speed: 0.05,
      size: 0.025,
      life: 1.2
    });
  }

  emitCorrectMatch(x: number, y: number, signColor: string) {
    // Big sign glow burst
    this.emit(x, y, 'signGlow', 15, {
      signColor,
      spread: 0.05,
      speed: 0.15,
      size: 0.035,
      life: 1.0
    });

    // Green success indicators
    this.emit(x, y, 'indicator', 8, {
      color: TRAFFIC_COLORS.goGreen,
      spread: 0.06,
      speed: 0.12,
      size: 0.02,
      life: 0.8
    });

    // Road line celebration
    this.emit(x, y, 'roadLine', 6, {
      color: TRAFFIC_COLORS.roadLine,
      spread: 0.08,
      speed: 0.1,
      size: 0.03,
      life: 1.2
    });
  }

  emitWrongMatch(x: number, y: number) {
    // Red warning flash
    this.emit(x, y, 'signGlow', 8, {
      color: TRAFFIC_COLORS.stopRed,
      spread: 0.04,
      speed: 0.1,
      size: 0.025,
      life: 0.5
    });

    // Traffic cones as error
    this.emit(x, y, 'trafficCone', 4, {
      spread: 0.06,
      speed: 0.08,
      size: 0.02,
      life: 0.6
    });
  }

  emitVictory() {
    // Massive celebration with all sign colors
    for (let i = 0; i < 20; i++) {
      const x = 0.2 + Math.random() * 0.6;
      const y = 0.2 + Math.random() * 0.6;

      // Colorful sign glows
      const colors = [
        TRAFFIC_COLORS.stopRed,
        TRAFFIC_COLORS.warningYellow,
        TRAFFIC_COLORS.infoBlue,
        TRAFFIC_COLORS.goGreen
      ];
      const randColor = colors[Math.floor(Math.random() * colors.length)];

      this.emit(x, y, 'signGlow', 4, {
        color: randColor,
        spread: 0.08,
        speed: 0.15,
        size: 0.035,
        life: 2.0
      });
    }

    // Car headlights beams
    for (let i = 0; i < 10; i++) {
      this.emit(
        0.3 + Math.random() * 0.4,
        0.8 + Math.random() * 0.2,
        'carLight',
        3,
        {
          spread: 0.05,
          speed: 0.2,
          size: 0.04,
          life: 1.5
        }
      );
    }

    // Road line trails
    for (let i = 0; i < 15; i++) {
      const angle = (i / 15) * Math.PI * 2;
      this.emit(
        0.5 + Math.cos(angle) * 0.2,
        0.5 + Math.sin(angle) * 0.2,
        'roadLine',
        2,
        {
          spread: 0.03,
          speed: 0.12,
          size: 0.025,
          life: 1.8
        }
      );
    }

    // Asphalt sparkles
    this.emit(0.5, 0.5, 'asphaltSparkle', 30, {
      spread: 0.25,
      speed: 0.1,
      size: 0.015,
      life: 2.0
    });
  }

  emitAmbient() {
    // Occasional headlight in distance
    if (Math.random() < 0.2) {
      this.emit(
        0.3 + Math.random() * 0.4,
        -0.05,
        'carLight',
        1,
        {
          spread: 0.02,
          speed: 0.03,
          size: 0.02,
          life: 3.0
        }
      );
    }

    // Asphalt sparkles
    if (Math.random() < 0.3) {
      this.emit(
        Math.random(),
        Math.random(),
        'asphaltSparkle',
        1,
        {
          spread: 0.01,
          speed: 0.01,
          size: 0.008,
          life: 0.8
        }
      );
    }

    // Road line segments drifting
    if (Math.random() < 0.1) {
      this.emit(
        0.4 + Math.random() * 0.2,
        -0.05,
        'roadLine',
        1,
        {
          spread: 0.02,
          speed: 0.02,
          size: 0.015,
          life: 4.0
        }
      );
    }
  }

  emitReset() {
    // Traffic cones scattering
    for (let i = 0; i < 12; i++) {
      this.emit(
        0.2 + Math.random() * 0.6,
        0.2 + Math.random() * 0.6,
        'trafficCone',
        2,
        {
          spread: 0.05,
          speed: 0.08,
          size: 0.018,
          life: 1.0
        }
      );
    }
  }

  getData(): Float32Array {
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
      data[offset + 8] = p.size;
      data[offset + 9] = p.life;
      data[offset + 10] = p.particleType;
      data[offset + 11] = p.rotation;
    }

    return data;
  }

  getCount(): number {
    return this.particles.length;
  }

  clear() {
    this.particles = [];
  }
}
