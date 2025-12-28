/**
 * Math Utilities - Volcano Puzzle
 * Volcanic / Molten / Magma / Fire Theme
 * Game #146
 */

export const VOLCANO_COLORS = {
  // Core magma colors
  magmaCore: [1.0, 0.35, 0.0, 1.0] as const,
  magmaOrange: [1.0, 0.55, 0.0, 1.0] as const,
  magmaYellow: [1.0, 0.85, 0.2, 1.0] as const,
  lavaRed: [0.85, 0.15, 0.05, 1.0] as const,

  // Rock and ash
  volcanicBlack: [0.12, 0.10, 0.08, 1.0] as const,
  ashGray: [0.35, 0.32, 0.30, 1.0] as const,
  obsidianPurple: [0.25, 0.12, 0.20, 1.0] as const,

  // Heat effects
  heatWhite: [1.0, 0.95, 0.85, 1.0] as const,
  emberGlow: [1.0, 0.45, 0.15, 1.0] as const,
  smokeGray: [0.4, 0.38, 0.36, 0.6] as const,
} as const;

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

export function randomRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

export function easeOutExpo(t: number): number {
  return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
}

export function easeInQuad(t: number): number {
  return t * t;
}

export function colorLerp(
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
