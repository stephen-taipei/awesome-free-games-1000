/**
 * WebGPU Module Entry - Battle City
 * Military / Tank Warfare / Olive Green Theme
 * Game #158
 */

export { WebGPURenderer } from './renderer';
export { ParticleSystem } from './particles';
export type { Particle, ParticleType } from './particles';
export { BATTLE_COLORS, lerp, lerpColor, randomRange, clamp, easeOutQuad, easeOutCubic, vec2Length, normalize2D } from './math';
export { BACKGROUND_SHADER, PARTICLE_SHADER } from './shaders';
