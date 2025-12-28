/**
 * WebGPU Math Utilities - Galaga
 * Retro Arcade / Neon Space / Classic Galaga Theme
 * Game #156
 */

export const GALAGA_COLORS = {
  // Player
  playerGreen: [0.0, 1.0, 0.0, 1.0] as const,
  playerCyan: [0.0, 1.0, 1.0, 1.0] as const,
  engineOrange: [1.0, 0.4, 0.0, 1.0] as const,

  // Enemies
  bossRed: [1.0, 0.0, 0.0, 1.0] as const,
  bossYellow: [1.0, 1.0, 0.0, 1.0] as const,
  enemyCyan: [0.0, 1.0, 1.0, 1.0] as const,
  enemyBlue: [0.0, 0.53, 1.0, 1.0] as const,

  // Bullets
  playerBullet: [1.0, 1.0, 0.0, 1.0] as const,
  enemyBullet: [1.0, 0.42, 0.42, 1.0] as const,

  // Effects
  explosionOuter: [1.0, 0.4, 0.0, 1.0] as const,
  explosionCore: [1.0, 1.0, 0.0, 1.0] as const,
  explosionWhite: [1.0, 1.0, 1.0, 1.0] as const,

  // Space
  spaceBlack: [0.0, 0.0, 0.0, 1.0] as const,
  starWhite: [1.0, 1.0, 1.0, 1.0] as const,
  nebulaPurple: [0.4, 0.1, 0.6, 0.3] as const,
  nebulaPink: [0.8, 0.2, 0.5, 0.2] as const,

  // Dive trail
  diveTrailRed: [1.0, 0.3, 0.3, 0.8] as const,
  diveTrailOrange: [1.0, 0.6, 0.2, 0.6] as const
} as const;

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function lerpColor(
  c1: readonly [number, number, number, number],
  c2: readonly [number, number, number, number],
  t: number
): [number, number, number, number] {
  return [
    lerp(c1[0], c2[0], t),
    lerp(c1[1], c2[1], t),
    lerp(c1[2], c2[2], t),
    lerp(c1[3], c2[3], t)
  ];
}

export function randomRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function easeOutQuad(t: number): number {
  return 1 - (1 - t) * (1 - t);
}

export function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export function easeInQuad(t: number): number {
  return t * t;
}

export function vec2Length(x: number, y: number): number {
  return Math.sqrt(x * x + y * y);
}

export function normalize2D(x: number, y: number): [number, number] {
  const len = vec2Length(x, y);
  if (len === 0) return [0, 0];
  return [x / len, y / len];
}
