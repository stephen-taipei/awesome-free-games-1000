/**
 * Math Utilities - Pipe Puzzle
 * Energy Conduit Theme
 * Game #021
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
 * Clamp value
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
 * Ease out elastic
 */
export function easeOutElastic(t: number): number {
  const c4 = (2 * Math.PI) / 3;
  return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
}

/**
 * Ease out bounce
 */
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
 * Smooth step
 */
export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

/**
 * Hash function
 */
export function hash(x: number, y: number): number {
  return Math.abs(Math.sin(x * 12.9898 + y * 78.233) * 43758.5453) % 1;
}
