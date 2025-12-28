/**
 * WebGPU Module Entry - Claw Machine
 * Arcade / UFO Catcher / Purple and Neon Theme
 * Game #164
 */

export { WebGPURenderer } from './renderer';
export { ParticleSystem } from './particles';
export type { Particle, ParticleType } from './particles';
export { CLAW_COLORS, lerp, lerpColor, randomRange, clamp, easeOutQuad, easeOutCubic, easeOutExpo, easeOutElastic, easeInBack, vec2Length, normalize2D, getRandomNeonColor, getPrizeColor } from './math';
export { BACKGROUND_SHADER, PARTICLE_SHADER } from './shaders';
