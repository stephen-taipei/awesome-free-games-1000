/**
 * Math Utilities - Ancient Script
 * Ancient Runes / Mystical Scrolls / Archaeology Theme
 * Game #141
 */

export const ANCIENT_COLORS = {
  // Base colors
  deepParchment: [0.10, 0.08, 0.06, 1.0] as const,
  oldPaper: [0.18, 0.14, 0.10, 1.0] as const,

  // Rune colors
  runeGold: [0.83, 0.65, 0.45, 1.0] as const,
  runeBronze: [0.55, 0.40, 0.22, 1.0] as const,
  runeCopper: [0.72, 0.45, 0.20, 1.0] as const,

  // Accent colors
  mysticGreen: [0.15, 0.55, 0.35, 1.0] as const,
  scrollBrown: [0.55, 0.27, 0.07, 1.0] as const,
  inkBlack: [0.12, 0.10, 0.08, 1.0] as const,

  // Effects
  torchOrange: [1.0, 0.55, 0.15, 1.0] as const,
  torchYellow: [1.0, 0.80, 0.30, 1.0] as const,
  revealWhite: [1.0, 0.98, 0.90, 1.0] as const,

  // Success/Error
  successGreen: [0.15, 0.68, 0.38, 1.0] as const,
  errorRed: [0.90, 0.30, 0.24, 1.0] as const,
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
    lerp(c1[3], c2[3], t),
  ];
}

export function randomRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

export function easeOutQuad(t: number): number {
  return 1 - (1 - t) * (1 - t);
}

export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export function easeOutBack(t: number): number {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
