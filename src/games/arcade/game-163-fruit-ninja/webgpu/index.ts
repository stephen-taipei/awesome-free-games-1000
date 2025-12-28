/**
 * WebGPU Module Entry - Fruit Ninja
 * Ninja / Dojo / Dark Red and Black Theme
 * Game #163
 */

export { WebGPURenderer } from './renderer';
export { ParticleSystem } from './particles';
export type { Particle, ParticleType } from './particles';
export { NINJA_COLORS, lerp, lerpColor, randomRange, clamp, easeOutQuad, easeOutCubic, easeOutExpo, vec2Length, normalize2D, getRandomJuiceColor, getFruitColor } from './math';
export { BACKGROUND_SHADER, PARTICLE_SHADER } from './shaders';
