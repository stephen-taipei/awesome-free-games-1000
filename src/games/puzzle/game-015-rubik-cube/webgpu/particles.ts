/**
 * 3D Particle System - Rubik Cube
 * Neon Matrix Cube Theme
 * Game #015
 */

import type { Vec3 } from './math';

export type ParticleType =
  | 'rotation'   // Layer rotation sparkles
  | 'scramble'   // Scramble burst
  | 'complete'   // Victory celebration
  | 'trail'      // Movement trail
  | 'ambient';   // Background particles

export interface Particle {
  position: Vec3;
  velocity: Vec3;
  life: number;
  maxLife: number;
  size: number;
  type: ParticleType;
  color: [number, number, number, number];
}

export class ParticleSystem {
  private particles: Particle[] = [];
  private readonly maxParticles = 800;

  // Neon cube colors
  private readonly colors = {
    cyan: [0.0, 1.0, 1.0, 1.0] as [number, number, number, number],
    magenta: [1.0, 0.0, 1.0, 1.0] as [number, number, number, number],
    green: [0.0, 1.0, 0.5, 1.0] as [number, number, number, number],
    gold: [1.0, 0.85, 0.0, 1.0] as [number, number, number, number],
    white: [1.0, 1.0, 1.0, 1.0] as [number, number, number, number],
    red: [1.0, 0.2, 0.2, 1.0] as [number, number, number, number],
    orange: [1.0, 0.5, 0.0, 1.0] as [number, number, number, number],
    blue: [0.2, 0.4, 1.0, 1.0] as [number, number, number, number],
  };

  update(deltaTime: number): void {
    const dt = deltaTime * 0.001;

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];

      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      // Update position
      p.position[0] += p.velocity[0] * dt;
      p.position[1] += p.velocity[1] * dt;
      p.position[2] += p.velocity[2] * dt;

      // Type-specific behavior
      switch (p.type) {
        case 'rotation':
          p.velocity[0] *= 0.95;
          p.velocity[1] *= 0.95;
          p.velocity[2] *= 0.95;
          p.size *= 0.98;
          break;

        case 'scramble':
          p.velocity[1] -= 2.0 * dt; // Gravity
          p.size *= 0.96;
          break;

        case 'complete':
          p.velocity[0] *= 0.98;
          p.velocity[1] *= 0.98;
          p.velocity[2] *= 0.98;
          break;

        case 'trail':
          p.velocity[0] *= 0.9;
          p.velocity[1] *= 0.9;
          p.velocity[2] *= 0.9;
          p.size *= 0.95;
          break;

        case 'ambient':
          // Gentle floating motion
          p.velocity[0] += Math.sin(p.life * 3) * 0.1 * dt;
          p.velocity[1] += 0.2 * dt;
          break;
      }

      // Update alpha
      const lifeRatio = p.life / p.maxLife;
      p.color[3] = lifeRatio;
    }
  }

  /**
   * Layer rotation effect - sparkles around rotating layer
   */
  emitRotation(axis: 'x' | 'y' | 'z', layer: number, faceColor: [number, number, number]): void {
    const count = 20;

    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const angle = (i / count) * Math.PI * 2;
      const radius = 1.5 + Math.random() * 0.5;
      const speed = 2 + Math.random() * 2;

      let position: Vec3;
      let velocity: Vec3;

      const layerOffset = (layer - 1) * 1.0; // -1, 0, or 1

      switch (axis) {
        case 'x':
          position = [layerOffset, Math.cos(angle) * radius, Math.sin(angle) * radius];
          velocity = [0, -Math.sin(angle) * speed, Math.cos(angle) * speed];
          break;
        case 'y':
          position = [Math.cos(angle) * radius, layerOffset, Math.sin(angle) * radius];
          velocity = [-Math.sin(angle) * speed, 0, Math.cos(angle) * speed];
          break;
        default: // z
          position = [Math.cos(angle) * radius, Math.sin(angle) * radius, layerOffset];
          velocity = [-Math.sin(angle) * speed, Math.cos(angle) * speed, 0];
          break;
      }

      this.particles.push({
        position,
        velocity,
        life: 0.4 + Math.random() * 0.2,
        maxLife: 0.6,
        size: 0.08 + Math.random() * 0.04,
        type: 'rotation',
        color: [faceColor[0], faceColor[1], faceColor[2], 1.0],
      });
    }
  }

  /**
   * Scramble effect - burst when scrambling
   */
  emitScramble(): void {
    const count = 30;

    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      const speed = 3 + Math.random() * 4;

      const velocity: Vec3 = [
        Math.sin(phi) * Math.cos(theta) * speed,
        Math.sin(phi) * Math.sin(theta) * speed,
        Math.cos(phi) * speed,
      ];

      const colors = [
        this.colors.red,
        this.colors.orange,
        this.colors.blue,
        this.colors.green,
        this.colors.white,
        this.colors.gold,
      ];
      const color = colors[Math.floor(Math.random() * colors.length)];

      this.particles.push({
        position: [0, 0, 0],
        velocity,
        life: 0.6 + Math.random() * 0.3,
        maxLife: 0.9,
        size: 0.1 + Math.random() * 0.05,
        type: 'scramble',
        color: [...color] as [number, number, number, number],
      });
    }
  }

  /**
   * Victory celebration - massive burst
   */
  emitComplete(): void {
    // Rainbow explosion
    for (let i = 0; i < 100; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      const speed = 2 + Math.random() * 5;

      const velocity: Vec3 = [
        Math.sin(phi) * Math.cos(theta) * speed,
        Math.sin(phi) * Math.sin(theta) * speed,
        Math.cos(phi) * speed,
      ];

      // Rainbow color based on angle
      const hue = theta / (Math.PI * 2);
      const color: [number, number, number, number] = [
        Math.sin(hue * Math.PI * 2) * 0.5 + 0.5,
        Math.sin(hue * Math.PI * 2 + 2.094) * 0.5 + 0.5,
        Math.sin(hue * Math.PI * 2 + 4.188) * 0.5 + 0.5,
        1.0,
      ];

      this.particles.push({
        position: [0, 0, 0],
        velocity,
        life: 1.5 + Math.random() * 1.0,
        maxLife: 2.5,
        size: 0.12 + Math.random() * 0.08,
        type: 'complete',
        color,
      });
    }

    // Golden sparkle ring
    for (let i = 0; i < 30; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const angle = (i / 30) * Math.PI * 2;
      const radius = 2.5;

      this.particles.push({
        position: [Math.cos(angle) * radius, Math.sin(angle) * radius, 0],
        velocity: [Math.cos(angle) * 2, Math.sin(angle) * 2, 0],
        life: 1.0,
        maxLife: 1.0,
        size: 0.15,
        type: 'complete',
        color: [...this.colors.gold] as [number, number, number, number],
      });
    }
  }

  /**
   * Trail effect - when dragging cube
   */
  emitTrail(x: number, y: number, z: number): void {
    if (Math.random() > 0.3) return;
    if (this.particles.length >= this.maxParticles) return;

    this.particles.push({
      position: [x + (Math.random() - 0.5) * 0.5, y + (Math.random() - 0.5) * 0.5, z + (Math.random() - 0.5) * 0.5],
      velocity: [(Math.random() - 0.5) * 0.5, (Math.random() - 0.5) * 0.5, (Math.random() - 0.5) * 0.5],
      life: 0.3 + Math.random() * 0.2,
      maxLife: 0.5,
      size: 0.05 + Math.random() * 0.03,
      type: 'trail',
      color: [...this.colors.cyan] as [number, number, number, number],
    });
  }

  /**
   * Ambient particles - floating in 3D space
   */
  emitAmbient(): void {
    if (Math.random() > 0.03) return;
    if (this.particles.length >= this.maxParticles) return;

    const colors = [this.colors.cyan, this.colors.magenta, this.colors.green];
    const color = colors[Math.floor(Math.random() * colors.length)];

    this.particles.push({
      position: [
        (Math.random() - 0.5) * 8,
        -4,
        (Math.random() - 0.5) * 8,
      ],
      velocity: [
        (Math.random() - 0.5) * 0.2,
        0.3 + Math.random() * 0.3,
        (Math.random() - 0.5) * 0.2,
      ],
      life: 4 + Math.random() * 2,
      maxLife: 6,
      size: 0.03 + Math.random() * 0.02,
      type: 'ambient',
      color: [color[0] * 0.4, color[1] * 0.4, color[2] * 0.4, 0.3],
    });
  }

  getParticles(): Particle[] {
    return this.particles;
  }

  clear(): void {
    this.particles = [];
  }

  getCount(): number {
    return this.particles.length;
  }
}
