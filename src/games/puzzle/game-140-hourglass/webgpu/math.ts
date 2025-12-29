/**
 * Math Utilities - Hourglass
 * Time / Sands of Time / Ancient Theme
 * Game #140
 */

export const HOURGLASS_COLORS = {
  // Base colors
  deepBronze: [0.15, 0.10, 0.05, 1.0] as const,
  antiqueBrown: [0.25, 0.18, 0.10, 1.0] as const,

  // Sand colors
  sandGold: [0.93, 0.79, 0.44, 1.0] as const,
  sandOrange: [0.95, 0.65, 0.35, 1.0] as const,
  sandLight: [1.0, 0.92, 0.70, 1.0] as const,

  // Accent colors
  bronzeShine: [0.80, 0.60, 0.30, 1.0] as const,
  goldGlow: [1.0, 0.85, 0.40, 1.0] as const,
  timeBlue: [0.30, 0.50, 0.80, 1.0] as const,

  // Star colors
  starYellow: [1.0, 0.95, 0.60, 1.0] as const,
  starWhite: [1.0, 1.0, 0.95, 1.0] as const,

  // Effects
  ancientRed: [0.70, 0.25, 0.15, 1.0] as const,
  mysticPurple: [0.50, 0.30, 0.60, 1.0] as const,
  energyWhite: [1.0, 1.0, 1.0, 1.0] as const,
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

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
