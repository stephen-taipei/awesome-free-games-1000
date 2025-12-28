/**
 * WebGPU Module Entry - Slingshot
 * Arcade / Slingshot / Outdoor Nature Theme
 * Game #169
 */

export { WebGPURenderer } from './renderer';
export { ParticleSystem } from './particles';
export type { Particle, ParticleType } from './particles';
export { SLINGSHOT_COLORS, lerp, lerpColor, randomRange, clamp, easeOutQuad, easeOutCubic, easeOutElastic, vec2Length, normalize2D, getLaunchColor, getImpactColor, getTargetHitColor, getRandomConfettiColor } from './math';
export { BACKGROUND_SHADER, PARTICLE_SHADER } from './shaders';
