/**
 * Math Utilities - Mini Farm
 * Farm / Nature / Pastoral Theme
 * Game #144
 */

export const FARM_COLORS = {
  deepGreen: [0.18, 0.35, 0.15, 1.0] as const,
  grassGreen: [0.55, 0.76, 0.29, 1.0] as const,
  leafGreen: [0.41, 0.62, 0.22, 1.0] as const,
  sunYellow: [1.0, 0.92, 0.23, 1.0] as const,
  goldenAmber: [0.95, 0.77, 0.06, 1.0] as const,
  carrotOrange: [0.90, 0.49, 0.13, 1.0] as const,
  tomatoRed: [0.91, 0.30, 0.24, 1.0] as const,
  cornYellow: [0.95, 0.77, 0.06, 1.0] as const,
  wheatTan: [0.83, 0.65, 0.45, 1.0] as const,
  skyBlue: [0.53, 0.81, 0.92, 1.0] as const,
  white: [1.0, 1.0, 1.0, 1.0] as const,
  softBrown: [0.55, 0.38, 0.24, 1.0] as const,
} as const;

export const CROP_PALETTE = [
  FARM_COLORS.carrotOrange,
  FARM_COLORS.cornYellow,
  FARM_COLORS.wheatTan,
  FARM_COLORS.tomatoRed,
] as const;

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

export function randomColor(): readonly [number, number, number, number] {
  const colors = [
    FARM_COLORS.grassGreen,
    FARM_COLORS.sunYellow,
    FARM_COLORS.leafGreen,
    FARM_COLORS.goldenAmber,
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

export function getCropColor(index: number): readonly [number, number, number, number] {
  return CROP_PALETTE[index % CROP_PALETTE.length];
}

export function hexToRgba(hex: string, alpha: number = 1): readonly [number, number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return [r, g, b, alpha] as const;
}
