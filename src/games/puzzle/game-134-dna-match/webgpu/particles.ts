/**
 * Particle System - DNA Match
 * Biology / Science / DNA Helix Theme
 * Game #134
 */

import { DNA_COLORS, randomInRange, lerpColor, getBaseColor } from './math';

export type ParticleType =
  | 'helix'      // DNA helix strand
  | 'nucleotide' // Base pair nucleotide
  | 'bond'       // Chemical bond
  | 'energy'     // Energy spark
  | 'molecule'   // Molecule cluster
  | 'strand';    // DNA strand segment

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
  helix: 0,
  nucleotide: 1,
  bond: 2,
  energy: 3,
  molecule: 4,
  strand: 5,
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
        case 0: // helix - spiral motion
          p.velocity[0] += Math.sin(p.life * 10) * 0.01;
          break;
        case 1: // nucleotide - slight float
          p.velocity[1] += 0.02 * deltaTime;
          break;
        case 2: // bond - fade in place
          p.velocity[0] *= 0.95;
          p.velocity[1] *= 0.95;
          break;
        case 3: // energy - rapid fade
          p.velocity[0] *= 0.92;
          p.velocity[1] *= 0.92;
          break;
        case 4: // molecule - orbital motion
          const angle = Math.atan2(p.velocity[1], p.velocity[0]);
          p.velocity[0] = Math.cos(angle + deltaTime) * 0.1;
          p.velocity[1] = Math.sin(angle + deltaTime) * 0.1;
          break;
        case 5: // strand - gentle drift
          p.velocity[1] -= 0.01 * deltaTime;
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
      baseType: string;
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
      } else if (options.baseType) {
        color = [...getBaseColor(options.baseType)] as number[];
      } else {
        color = this.getDefaultColor(type);
      }

      // Add some color variation
      color[0] = Math.min(1, color[0] + randomInRange(-0.1, 0.1));
      color[1] = Math.min(1, color[1] + randomInRange(-0.1, 0.1));
      color[2] = Math.min(1, color[2] + randomInRange(-0.1, 0.1));

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
      case 'helix':
        return [...DNA_COLORS.helixBackbone];
      case 'nucleotide':
        const bases = [DNA_COLORS.adenine, DNA_COLORS.thymine, DNA_COLORS.guanine, DNA_COLORS.cytosine];
        return [...bases[Math.floor(Math.random() * bases.length)]];
      case 'bond':
        return [...DNA_COLORS.energyPurple];
      case 'energy':
        return [...DNA_COLORS.bioGlow];
      case 'molecule':
        return [...DNA_COLORS.scienceBlue];
      case 'strand':
        return [...DNA_COLORS.moleculeWhite];
      default:
        return [1, 1, 1, 1];
    }
  }

  emitBaseSelect(x: number, y: number, baseType: string) {
    // Nucleotide highlight
    this.emit(x, y, 'nucleotide', 8, {
      baseType,
      spread: 0.03,
      speed: 0.08,
      size: 0.025,
      life: 0.8
    });

    // Energy sparks around selection
    this.emit(x, y, 'energy', 5, {
      color: DNA_COLORS.bioGlow,
      spread: 0.05,
      speed: 0.15,
      size: 0.015,
      life: 0.5
    });
  }

  emitPairMatch(x: number, y: number, base1: string, base2: string) {
    // Bond formation
    this.emit(x, y, 'bond', 10, {
      color: DNA_COLORS.energyPurple,
      spread: 0.04,
      speed: 0.05,
      size: 0.03,
      life: 1.2
    });

    // Both base colors mixing
    this.emit(x - 0.03, y, 'nucleotide', 6, {
      baseType: base1,
      spread: 0.02,
      speed: 0.1,
      size: 0.02,
      life: 1.0
    });

    this.emit(x + 0.03, y, 'nucleotide', 6, {
      baseType: base2,
      spread: 0.02,
      speed: 0.1,
      size: 0.02,
      life: 1.0
    });

    // Energy burst
    this.emit(x, y, 'energy', 12, {
      color: DNA_COLORS.bioGlow,
      spread: 0.06,
      speed: 0.2,
      size: 0.018,
      life: 0.7
    });
  }

  emitWrongMatch(x: number, y: number) {
    // Error indication - red energy
    this.emit(x, y, 'energy', 8, {
      color: [1.0, 0.3, 0.2, 1.0],
      spread: 0.05,
      speed: 0.15,
      size: 0.02,
      life: 0.5
    });

    // Scattered molecules
    this.emit(x, y, 'molecule', 5, {
      color: [0.6, 0.2, 0.2, 0.8],
      spread: 0.08,
      speed: 0.12,
      size: 0.015,
      life: 0.6
    });
  }

  emitHelixForm(x: number, y: number) {
    // DNA helix strand pieces
    for (let i = 0; i < 5; i++) {
      const offsetY = (i - 2) * 0.03;
      this.emit(x, y + offsetY, 'helix', 3, {
        color: DNA_COLORS.helixBackbone,
        spread: 0.02,
        speed: 0.05,
        size: 0.025,
        life: 1.5
      });
    }

    // Strand segments
    this.emit(x, y, 'strand', 8, {
      spread: 0.08,
      speed: 0.08,
      size: 0.03,
      life: 1.8
    });
  }

  emitVictory() {
    // Massive DNA celebration
    for (let i = 0; i < 15; i++) {
      const x = 0.2 + Math.random() * 0.6;
      const y = 0.2 + Math.random() * 0.6;

      // Full helix formations
      this.emit(x, y, 'helix', 5, {
        color: lerpColor(DNA_COLORS.helixBackbone, DNA_COLORS.bioGlow, Math.random()) as number[],
        spread: 0.1,
        speed: 0.15,
        size: 0.035,
        life: 2.5
      });

      // All base types
      const bases = ['A', 'T', 'G', 'C'];
      this.emit(x, y, 'nucleotide', 4, {
        baseType: bases[i % 4],
        spread: 0.08,
        speed: 0.18,
        size: 0.025,
        life: 2.0
      });
    }

    // Energy explosion
    for (let i = 0; i < 30; i++) {
      const angle = (i / 30) * Math.PI * 2;
      const dist = 0.15 + Math.random() * 0.2;
      this.emit(
        0.5 + Math.cos(angle) * dist,
        0.5 + Math.sin(angle) * dist,
        'energy',
        3,
        {
          color: DNA_COLORS.bioGlow,
          spread: 0.03,
          speed: 0.25,
          size: 0.02,
          life: 1.5
        }
      );
    }

    // Molecule clusters
    this.emit(0.5, 0.5, 'molecule', 20, {
      color: DNA_COLORS.scienceBlue,
      spread: 0.2,
      speed: 0.12,
      size: 0.03,
      life: 2.2
    });
  }

  emitAmbient() {
    // Floating molecules in background
    if (Math.random() < 0.3) {
      const edge = Math.floor(Math.random() * 4);
      let x: number, y: number;

      switch (edge) {
        case 0: x = Math.random(); y = -0.05; break;
        case 1: x = 1.05; y = Math.random(); break;
        case 2: x = Math.random(); y = 1.05; break;
        default: x = -0.05; y = Math.random(); break;
      }

      this.emit(x, y, 'molecule', 1, {
        color: lerpColor(DNA_COLORS.labGlass, DNA_COLORS.scienceBlue, Math.random()) as number[],
        spread: 0.02,
        speed: 0.02,
        size: 0.015,
        life: 4.0
      });
    }

    // Occasional energy flickers
    if (Math.random() < 0.15) {
      this.emit(
        Math.random(),
        Math.random(),
        'energy',
        1,
        {
          color: DNA_COLORS.bioGlow,
          spread: 0.01,
          speed: 0.03,
          size: 0.01,
          life: 0.8
        }
      );
    }
  }

  emitReset() {
    // Dissolve effect
    for (let i = 0; i < 20; i++) {
      this.emit(
        0.2 + Math.random() * 0.6,
        0.2 + Math.random() * 0.6,
        'strand',
        2,
        {
          color: DNA_COLORS.helixBackbone,
          spread: 0.05,
          speed: 0.1,
          size: 0.02,
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
