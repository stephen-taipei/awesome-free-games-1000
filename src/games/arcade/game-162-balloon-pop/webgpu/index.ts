/**
 * WebGPU Module Entry - Balloon Pop
 * Sky / Carnival / Colorful Balloons Theme
 * Game #162
 */

export { WebGPURenderer } from './renderer';
export { ParticleSystem } from './particles';
export type { Particle, ParticleType } from './particles';
export { BALLOON_COLORS, lerp, lerpColor, randomRange, clamp, easeOutQuad, easeOutCubic, easeOutBounce, vec2Length, normalize2D, getRandomBalloonColor, getRandomConfettiColor } from './math';
export { BACKGROUND_SHADER, PARTICLE_SHADER } from './shaders';
