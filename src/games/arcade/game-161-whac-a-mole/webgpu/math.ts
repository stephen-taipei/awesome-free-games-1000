/**
 * Math Utilities - Whac-A-Mole
 * Carnival / Fair / Grass Green and Brown Theme
 * Game #161
 */

export const WHAC_COLORS = {
  // Mole colors
  moleBrown: [0.55, 0.27, 0.07, 1.0] as const,
  moleFace: [0.87, 0.72, 0.53, 1.0] as const,
  molePink: [1.0, 0.41, 0.71, 1.0] as const,

  // Golden mole
  goldenYellow: [1.0, 0.84, 0.0, 1.0] as const,
  goldenOrange: [1.0, 0.55, 0.0, 1.0] as const,
  goldenSparkle: [1.0, 1.0, 0.8, 1.0] as const,

  // Bomb
  bombBlack: [0.17, 0.24, 0.31, 1.0] as const,
  bombRed: [0.9, 0.3, 0.24, 1.0] as const,
  bombSpark: [1.0, 0.6, 0.1, 1.0] as const,

  // Grass and earth
  grassGreen: [0.49, 0.78, 0.31, 1.0] as const,
  grassDark: [0.35, 0.61, 0.2, 1.0] as const,
  dirtBrown: [0.55, 0.27, 0.07, 1.0] as const,
  dirtDark: [0.18, 0.09, 0.06, 1.0] as const,

  // Hit effects
  whackWhite: [1.0, 1.0, 1.0, 1.0] as const,
  whackYellow: [1.0, 0.95, 0.5, 1.0] as const,
  starYellow: [1.0, 0.9, 0.3, 1.0] as const,

  // Carnival colors
  carnivalRed: [0.9, 0.2, 0.2, 1.0] as const,
  carnivalBlue: [0.2, 0.5, 0.9, 1.0] as const,
  carnivalPink: [1.0, 0.5, 0.7, 1.0] as const,
  carnivalPurple: [0.6, 0.3, 0.8, 1.0] as const,
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

export function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

export function easeOutQuad(t: number): number {
  return 1 - (1 - t) * (1 - t);
}

export function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export function easeOutBounce(t: number): number {
  const n1 = 7.5625;
  const d1 = 2.75;

  if (t < 1 / d1) {
    return n1 * t * t;
  } else if (t < 2 / d1) {
    return n1 * (t -= 1.5 / d1) * t + 0.75;
  } else if (t < 2.5 / d1) {
    return n1 * (t -= 2.25 / d1) * t + 0.9375;
  } else {
    return n1 * (t -= 2.625 / d1) * t + 0.984375;
  }
}

export function vec2Length(x: number, y: number): number {
  return Math.sqrt(x * x + y * y);
}

export function normalize2D(x: number, y: number): [number, number] {
  const len = vec2Length(x, y);
  if (len === 0) return [0, 0];
  return [x / len, y / len];
}
