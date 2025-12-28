/**
 * WebGPU Math Utilities - Map Puzzle
 * Cartography / Explorer Theme
 * Game #120
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

// Cartography color palette
export const COLORS = {
  // Map colors
  parchment: [0.96, 0.91, 0.76],
  sepia: [0.44, 0.26, 0.08],
  ink: [0.15, 0.10, 0.05],

  // Land types
  land: [0.76, 0.70, 0.50],
  water: [0.30, 0.55, 0.75],
  mountain: [0.55, 0.50, 0.45],
  forest: [0.25, 0.50, 0.25],
  desert: [0.90, 0.78, 0.55],

  // Compass
  compassGold: [0.85, 0.65, 0.13],
  compassRed: [0.80, 0.20, 0.15],

  // Explorer
  trail: [0.60, 0.40, 0.20],
  discovery: [1.0, 0.85, 0.40],
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

export function compassNeedle(angle: number, wobble: number = 0): number {
  return angle + Math.sin(wobble * 8) * 0.1;
}
