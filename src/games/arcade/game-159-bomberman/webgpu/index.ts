/**
 * WebGPU Module Entry - Bomberman
 * Classic Arcade / Explosive / Orange-Red Fire Theme
 * Game #159
 */

export { WebGPURenderer } from './renderer';
export { ParticleSystem } from './particles';
export type { Particle, ParticleType } from './particles';
export { BOMBER_COLORS, lerp, lerpColor, randomRange, clamp, easeOutQuad, easeOutCubic, vec2Length, normalize2D } from './math';
export { BACKGROUND_SHADER, PARTICLE_SHADER } from './shaders';
