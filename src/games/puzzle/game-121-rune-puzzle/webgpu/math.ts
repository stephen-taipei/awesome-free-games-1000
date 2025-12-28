/**
 * WebGPU Math Utilities - Rune Puzzle
 * Mystical / Ancient Runes Theme
 * Game #121
 */

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

export function distance(x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}

// Mystical color palette
export const COLORS = {
  // Primary mystical
  purple: [0.61, 0.35, 0.71],
  deepPurple: [0.40, 0.20, 0.50],
  violet: [0.54, 0.17, 0.89],

  // Crystal colors
  crystal: [0.58, 0.44, 0.86],
  crystalGlow: [0.73, 0.59, 1.0],

  // Energy
  energy: [0.18, 0.80, 0.44],
  energyGlow: [0.40, 1.0, 0.60],

  // Arcane
  arcane: [0.20, 0.60, 0.86],
  arcaneFire: [0.91, 0.30, 0.24],

  // Rune colors (matching game)
  runePurple: [0.61, 0.35, 0.71],
  runeBlue: [0.20, 0.60, 0.86],
  runeRed: [0.91, 0.30, 0.24],
  runeGreen: [0.18, 0.80, 0.44],
  runeOrange: [0.95, 0.61, 0.07],
  runeTeal: [0.10, 0.74, 0.61],

  // Base
  dark: [0.05, 0.05, 0.10],
  light: [0.95, 0.90, 1.0],
} as const;

export function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (result) {
    return [
      parseInt(result[1], 16) / 255,
      parseInt(result[2], 16) / 255,
      parseInt(result[3], 16) / 255,
    ];
  }
  return [1, 1, 1];
}

export function easeOutQuad(t: number): number {
  return 1 - (1 - t) * (1 - t);
}

export function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export function easeInOutSine(t: number): number {
  return -(Math.cos(Math.PI * t) - 1) / 2;
}

export function spiralPosition(t: number, radius: number): { x: number; y: number } {
  const angle = t * Math.PI * 4;
  const r = radius * (1 - t * 0.5);
  return {
    x: Math.cos(angle) * r,
    y: Math.sin(angle) * r,
  };
}
