/**
 * Math Utilities - Deep Sea
 * Deep Ocean / Bioluminescent / Abyssal Theme
 * Game #145
 */

export const OCEAN_COLORS = {
  abyssBlack: [0.01, 0.03, 0.06, 1.0] as const,
  deepBlue: [0.04, 0.09, 0.16, 1.0] as const,
  oceanBlue: [0.20, 0.40, 0.70, 1.0] as const,
  lightBlue: [0.20, 0.60, 0.86, 1.0] as const,
  cyan: [0.25, 0.88, 0.95, 1.0] as const,
  biolumCyan: [0.30, 1.0, 0.95, 1.0] as const,
  biolumGreen: [0.20, 1.0, 0.60, 1.0] as const,
  biolumPurple: [0.60, 0.30, 1.0, 1.0] as const,
  treasureGold: [1.0, 0.84, 0.0, 1.0] as const,
  oxygenBlue: [0.40, 0.80, 1.0, 1.0] as const,
  dangerRed: [1.0, 0.25, 0.20, 1.0] as const,
  white: [1.0, 1.0, 1.0, 1.0] as const,
  subYellow: [0.95, 0.77, 0.06, 1.0] as const,
} as const;

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

export function randomRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

export function randomBiolumColor(): readonly [number, number, number, number] {
  const colors = [
    OCEAN_COLORS.biolumCyan,
    OCEAN_COLORS.biolumGreen,
    OCEAN_COLORS.biolumPurple,
    OCEAN_COLORS.cyan,
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

export function hexToRgba(hex: string, alpha: number = 1): readonly [number, number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return [r, g, b, alpha] as const;
}
