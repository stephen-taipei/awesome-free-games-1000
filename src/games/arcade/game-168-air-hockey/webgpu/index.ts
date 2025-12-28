/**
 * WebGPU Module Entry - Air Hockey
 * Arcade / Air Hockey / Blue and Red Neon Theme
 * Game #168
 */

export { WebGPURenderer } from './renderer';
export { ParticleSystem } from './particles';
export type { Particle, ParticleType } from './particles';
export { HOCKEY_COLORS, lerp, lerpColor, randomRange, clamp, easeOutQuad, easeOutCubic, easeOutElastic, vec2Length, normalize2D, getPlayerHitColor, getCpuHitColor, getRandomConfettiColor, getSparkColor } from './math';
export { BACKGROUND_SHADER, PARTICLE_SHADER } from './shaders';
