/**
 * Math Utilities - Snake
 * Reptile / Jungle / Neon Green Theme
 * Game #151
 */

export type Vec2 = [number, number];
export type Vec3 = [number, number, number];
export type Vec4 = [number, number, number, number];

export const SNAKE_COLORS = {
  // Snake colors
  snakeHead: [0.0, 0.72, 0.58, 1.0] as const,
  snakeBody: [0.0, 0.81, 0.69, 1.0] as const,
  snakeTail: [0.0, 0.62, 0.49, 1.0] as const,
  snakeGlow: [0.0, 1.0, 0.75, 0.6] as const,

  // Food colors
  appleRed: [0.91, 0.30, 0.24, 1.0] as const,
  appleGlow: [1.0, 0.35, 0.30, 0.6] as const,

  // Jungle colors
  leafGreen: [0.18, 0.55, 0.34, 1.0] as const,
  darkGreen: [0.08, 0.35, 0.22, 1.0] as const,
  mossGreen: [0.40, 0.60, 0.20, 1.0] as const,

  // Environment
  jungleDark: [0.08, 0.12, 0.08, 1.0] as const,
  jungleGlow: [0.0, 0.50, 0.30, 0.3] as const,

  // Effects
  neonGreen: [0.22, 1.0, 0.08, 1.0] as const,
  electricGreen: [0.0, 1.0, 0.55, 1.0] as const,
  scaleShimmer: [0.5, 1.0, 0.7, 0.4] as const,
} as const;

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function lerpVec4(a: Readonly<Vec4>, b: Readonly<Vec4>, t: number): Vec4 {
  return [
    lerp(a[0], b[0], t),
    lerp(a[1], b[1], t),
    lerp(a[2], b[2], t),
    lerp(a[3], b[3], t),
  ];
}

export function randomRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function normalize(v: Vec2): Vec2 {
  const len = Math.sqrt(v[0] * v[0] + v[1] * v[1]);
  if (len === 0) return [0, 0];
  return [v[0] / len, v[1] / len];
}

export function distance(a: Vec2, b: Vec2): number {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  return Math.sqrt(dx * dx + dy * dy);
}
