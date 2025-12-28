/**
 * Math Utilities - Bookshelf
 * Library / Study / Warm Wood Theme
 * Game #149
 */

export const LIBRARY_COLORS = {
  // Wood tones
  oakWood: [0.55, 0.35, 0.22, 1.0] as const,
  mahogany: [0.44, 0.22, 0.14, 1.0] as const,
  walnut: [0.36, 0.24, 0.17, 1.0] as const,
  cherryWood: [0.60, 0.30, 0.20, 1.0] as const,
  darkWood: [0.25, 0.15, 0.10, 1.0] as const,

  // Warm lighting
  warmGold: [0.85, 0.65, 0.13, 1.0] as const,
  candleLight: [1.0, 0.85, 0.55, 1.0] as const,
  sunbeam: [1.0, 0.95, 0.80, 1.0] as const,
  lampGlow: [0.95, 0.80, 0.50, 1.0] as const,

  // Paper and books
  cream: [0.96, 0.94, 0.88, 1.0] as const,
  parchment: [0.95, 0.90, 0.78, 1.0] as const,
  oldPage: [0.90, 0.85, 0.72, 1.0] as const,
  dusty: [0.80, 0.75, 0.65, 0.5] as const,

  // Effects
  dustMote: [0.85, 0.80, 0.70, 0.4] as const,
  selectionGlow: [1.0, 0.85, 0.40, 0.8] as const,
  sparkle: [1.0, 0.95, 0.70, 1.0] as const,
} as const;

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function randomRange(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

export function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export function easeOutQuad(t: number): number {
  return 1 - (1 - t) * (1 - t);
}

export function easeInOutQuad(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

export function gentleSway(time: number, frequency: number = 1): number {
  return Math.sin(time * frequency) * 0.5 + 0.5;
}

export function flickerEffect(time: number): number {
  return 0.9 + Math.sin(time * 12) * 0.05 + Math.sin(time * 7.3) * 0.03;
}

export function colorToVec4(color: readonly [number, number, number, number]): Float32Array {
  return new Float32Array(color);
}

export function lerpColor(
  a: readonly [number, number, number, number],
  b: readonly [number, number, number, number],
  t: number
): [number, number, number, number] {
  return [
    lerp(a[0], b[0], t),
    lerp(a[1], b[1], t),
    lerp(a[2], b[2], t),
    lerp(a[3], b[3], t),
  ];
}
