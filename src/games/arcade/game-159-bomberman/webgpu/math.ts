/**
 * WebGPU Math Utilities - Bomberman
 * Classic Arcade / Explosive / Orange-Red Fire Theme
 * Game #159
 */

export const BOMBER_COLORS = {
  // Explosion colors
  explosionOrange: [1.0, 0.5, 0.0, 1.0] as const,
  explosionYellow: [1.0, 0.9, 0.2, 1.0] as const,
  explosionRed: [1.0, 0.2, 0.0, 1.0] as const,
  explosionWhite: [1.0, 1.0, 0.8, 1.0] as const,

  // Bomb colors
  bombBlack: [0.2, 0.2, 0.25, 1.0] as const,
  bombFuse: [0.95, 0.6, 0.1, 1.0] as const,
  bombSpark: [1.0, 0.4, 0.1, 1.0] as const,

  // Brick colors
  brickBrown: [0.7, 0.4, 0.15, 1.0] as const,
  brickDust: [0.8, 0.7, 0.5, 1.0] as const,
  brickDebris: [0.55, 0.3, 0.1, 1.0] as const,

  // Power-up colors
  powerBomb: [0.95, 0.6, 0.1, 1.0] as const,
  powerFlame: [0.9, 0.3, 0.2, 1.0] as const,
  powerSpeed: [0.2, 0.6, 0.9, 1.0] as const,

  // Player
  playerWhite: [1.0, 1.0, 1.0, 1.0] as const,
  playerPink: [1.0, 0.8, 0.8, 1.0] as const,

  // Environment
  grassGreen: [0.24, 0.55, 0.25, 1.0] as const,
  wallGray: [0.4, 0.4, 0.45, 1.0] as const,

  // Effects
  smokeGray: [0.3, 0.3, 0.3, 0.6] as const,
  sparkYellow: [1.0, 1.0, 0.5, 1.0] as const
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

export function vec2Length(x: number, y: number): number {
  return Math.sqrt(x * x + y * y);
}

export function normalize2D(x: number, y: number): [number, number] {
  const len = vec2Length(x, y);
  if (len === 0) return [0, 0];
  return [x / len, y / len];
}
