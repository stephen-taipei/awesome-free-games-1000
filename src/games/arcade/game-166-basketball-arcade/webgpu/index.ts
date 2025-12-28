/**
 * WebGPU Module Entry - Basketball Arcade
 * Stadium / Basketball / Orange and Purple Theme
 * Game #166
 */

export { WebGPURenderer } from './renderer';
export { ParticleSystem } from './particles';
export type { Particle, ParticleType } from './particles';
export { BASKETBALL_COLORS, lerp, lerpColor, randomRange, clamp, easeOutQuad, easeOutCubic, easeOutBounce, easeOutElastic, vec2Length, normalize2D, getRandomBallColor, getRandomConfettiColor, getSpotlightColor } from './math';
export { BACKGROUND_SHADER, PARTICLE_SHADER } from './shaders';
