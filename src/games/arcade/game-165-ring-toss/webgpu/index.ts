/**
 * WebGPU Module Entry - Ring Toss
 * Carnival / Fairground / Colorful and Festive Theme
 * Game #165
 */

export { WebGPURenderer } from './renderer';
export { ParticleSystem } from './particles';
export type { Particle, ParticleType } from './particles';
export { CARNIVAL_COLORS, lerp, lerpColor, randomRange, clamp, easeOutQuad, easeOutCubic, easeOutBounce, vec2Length, normalize2D, getRandomRingColor, getRandomConfettiColor, getPegColor } from './math';
export { BACKGROUND_SHADER, PARTICLE_SHADER } from './shaders';
