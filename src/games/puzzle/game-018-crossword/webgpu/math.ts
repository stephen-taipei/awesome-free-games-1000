/**
 * Math Utilities - Crossword
 * Cyber Cipher Theme
 * Game #018
 */

export type Vec2 = [number, number];
export type Vec3 = [number, number, number];
export type Vec4 = [number, number, number, number];

/**
 * Linear interpolation
 */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Clamp value between min and max
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Ease out cubic
 */
export function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

/**
 * Ease in out sine
 */
export function easeInOutSine(t: number): number {
  return -(Math.cos(Math.PI * t) - 1) / 2;
}

/**
 * Smooth step
 */
export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

/**
 * Distance between two 2D points
 */
export function distance2D(a: Vec2, b: Vec2): number {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Random float in range
 */
export function randomRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

/**
 * Hash function for pseudo-random values
 */
export function hash(x: number, y: number): number {
  return Math.abs(Math.sin(x * 12.9898 + y * 78.233) * 43758.5453) % 1;
}

/**
 * Convert grid coordinates to normalized [0,1] space
 */
export function gridToNormalized(
  col: number,
  row: number,
  cols: number,
  rows: number
): Vec2 {
  return [(col + 0.5) / cols, (row + 0.5) / rows];
}
