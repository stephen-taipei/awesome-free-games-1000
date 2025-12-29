/**
 * Math Utilities - Blueprint
 * Architecture / Engineering / Construction Theme
 * Game #136
 */

export const BLUEPRINT_COLORS = {
  // Blueprint paper
  blueprintDark: [0.05, 0.15, 0.35, 1.0] as const,
  blueprintLight: [0.10, 0.25, 0.50, 1.0] as const,
  gridLine: [0.20, 0.45, 0.75, 1.0] as const,
  gridFine: [0.15, 0.35, 0.60, 1.0] as const,

  // Construction materials
  brickRed: [0.75, 0.22, 0.17, 1.0] as const,
  woodBrown: [0.55, 0.27, 0.07, 1.0] as const,
  glassBlue: [0.52, 0.76, 0.91, 1.0] as const,
  metalGray: [0.50, 0.55, 0.55, 1.0] as const,

  // Technical drawing
  whiteInk: [0.95, 0.97, 1.0, 1.0] as const,
  dimensionLine: [0.70, 0.85, 1.0, 1.0] as const,
  constructionYellow: [1.0, 0.85, 0.0, 1.0] as const,

  // Effects
  sparkOrange: [1.0, 0.6, 0.2, 1.0] as const,
  weldGlow: [0.4, 0.7, 1.0, 1.0] as const,
  measureRed: [0.9, 0.3, 0.2, 1.0] as const,
} as const;

export function hexToRGBA(hex: string): [number, number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return [r, g, b, 1.0];
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function lerpColor(
  a: readonly number[],
  b: readonly number[],
  t: number
): [number, number, number, number] {
  return [
    lerp(a[0], b[0], t),
    lerp(a[1], b[1], t),
    lerp(a[2], b[2], t),
    lerp(a[3] ?? 1, b[3] ?? 1, t),
  ];
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

export function random(seed: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

export function noise2D(x: number, y: number): number {
  const i = Math.floor(x);
  const j = Math.floor(y);
  const fx = x - i;
  const fy = y - j;

  const a = random(i + j * 57);
  const b = random(i + 1 + j * 57);
  const c = random(i + (j + 1) * 57);
  const d = random(i + 1 + (j + 1) * 57);

  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);

  return lerp(lerp(a, b, ux), lerp(c, d, ux), uy);
}
