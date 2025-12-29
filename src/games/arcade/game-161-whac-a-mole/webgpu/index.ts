/**
 * WebGPU Module Entry - Whac-A-Mole
 * Carnival / Fair / Grass Green and Brown Theme
 * Game #161
 */

export { WebGPURenderer } from './renderer';
export { ParticleSystem } from './particles';
export type { Particle, ParticleType } from './particles';
export { WHAC_COLORS, lerp, lerpColor, randomRange, clamp, easeOutQuad, easeOutCubic, vec2Length, normalize2D } from './math';
export { BACKGROUND_SHADER, PARTICLE_SHADER } from './shaders';
