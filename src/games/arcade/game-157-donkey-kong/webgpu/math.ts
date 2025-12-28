/**
 * WebGPU Math Utilities - Donkey Kong
 * Classic Arcade / Steel Girder / Construction Theme
 * Game #157
 */

export const DK_COLORS = {
  // Player (Mario)
  marioRed: [0.91, 0.30, 0.24, 1.0] as const,
  marioBlue: [0.20, 0.60, 0.86, 1.0] as const,
  marioSkin: [1.0, 0.89, 0.77, 1.0] as const,

  // Kong
  kongBrown: [0.55, 0.27, 0.08, 1.0] as const,
  kongTan: [0.82, 0.41, 0.12, 1.0] as const,

  // Princess
  princessPink: [1.0, 0.41, 0.71, 1.0] as const,
  princessGold: [1.0, 0.84, 0.0, 1.0] as const,

  // Girders & Platforms
  girderRed: [0.91, 0.30, 0.24, 1.0] as const,
  girderDark: [0.75, 0.22, 0.17, 1.0] as const,
  steelGray: [0.5, 0.5, 0.55, 1.0] as const,

  // Barrels
  barrelBrown: [0.55, 0.27, 0.08, 1.0] as const,
  barrelLight: [0.82, 0.41, 0.12, 1.0] as const,

  // Ladders
  ladderBlue: [0.20, 0.60, 0.86, 1.0] as const,

  // Effects
  sparkYellow: [1.0, 1.0, 0.0, 1.0] as const,
  sparkOrange: [1.0, 0.6, 0.0, 1.0] as const,
  dustBrown: [0.6, 0.5, 0.4, 0.7] as const,
  starWhite: [1.0, 1.0, 1.0, 1.0] as const,

  // Background
  constructionBlack: [0.05, 0.05, 0.08, 1.0] as const,
  warningYellow: [1.0, 0.85, 0.0, 1.0] as const
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
