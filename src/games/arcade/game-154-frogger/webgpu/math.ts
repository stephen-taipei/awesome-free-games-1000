/**
 * Math Utilities - Frogger
 * Retro Pixel / Pond Nature / Blue-Green Theme
 * Game #154
 */

export type Vec2 = [number, number];
export type Vec3 = [number, number, number];
export type Vec4 = [number, number, number, number];

export const FROGGER_COLORS = {
  // Frog colors
  frogGreen: [0.15, 0.68, 0.38, 1.0] as const,
  frogLight: [0.18, 0.80, 0.44, 1.0] as const,

  // Water colors
  pondBlue: [0.20, 0.60, 0.86, 1.0] as const,
  waterDark: [0.10, 0.45, 0.68, 1.0] as const,
  waterLight: [0.45, 0.78, 0.93, 1.0] as const,

  // Nature colors
  lilyPad: [0.18, 0.55, 0.34, 1.0] as const,
  logBrown: [0.55, 0.27, 0.07, 1.0] as const,
  logLight: [0.73, 0.46, 0.24, 1.0] as const,

  // Road colors
  asphalt: [0.18, 0.20, 0.21, 1.0] as const,
  roadMark: [0.95, 0.77, 0.06, 1.0] as const,

  // Vehicle colors
  carRed: [0.91, 0.30, 0.24, 1.0] as const,
  carBlue: [0.20, 0.60, 0.86, 1.0] as const,
  carYellow: [0.95, 0.61, 0.07, 1.0] as const,

  // Goal colors
  goalGold: [0.95, 0.77, 0.06, 1.0] as const,
  goalGlow: [1.0, 0.92, 0.55, 1.0] as const,

  // Effects
  splash: [0.67, 0.92, 0.98, 1.0] as const,
  danger: [0.91, 0.30, 0.24, 1.0] as const,

  white: [1.0, 1.0, 1.0, 1.0] as const,
  black: [0.0, 0.0, 0.0, 1.0] as const,
} as const;

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

export function vec2(x: number, y: number): Vec2 {
  return [x, y];
}

export function vec3(x: number, y: number, z: number): Vec3 {
  return [x, y, z];
}

export function vec4(x: number, y: number, z: number, w: number): Vec4 {
  return [x, y, z, w];
}

export function randomRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

export function randomVec2(minX: number, maxX: number, minY: number, maxY: number): Vec2 {
  return [randomRange(minX, maxX), randomRange(minY, maxY)];
}

export function lerpColor(a: readonly number[], b: readonly number[], t: number): Vec4 {
  return [
    lerp(a[0], b[0], t),
    lerp(a[1], b[1], t),
    lerp(a[2], b[2], t),
    lerp(a[3] ?? 1, b[3] ?? 1, t),
  ];
}

export function hexToVec4(hex: string, alpha: number = 1.0): Vec4 {
  const h = hex.replace('#', '');
  const r = parseInt(h.substr(0, 2), 16) / 255;
  const g = parseInt(h.substr(2, 2), 16) / 255;
  const b = parseInt(h.substr(4, 2), 16) / 255;
  return [r, g, b, alpha];
}

export function distance(a: Vec2, b: Vec2): number {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  return Math.sqrt(dx * dx + dy * dy);
}

export function normalize2D(v: Vec2): Vec2 {
  const len = Math.sqrt(v[0] * v[0] + v[1] * v[1]);
  if (len === 0) return [0, 0];
  return [v[0] / len, v[1] / len];
}

export function easeOutQuad(t: number): number {
  return t * (2 - t);
}

export function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export function easeOutElastic(t: number): number {
  const p = 0.4;
  return Math.pow(2, -10 * t) * Math.sin((t - p / 4) * (2 * Math.PI) / p) + 1;
}

export function rippleWave(t: number, frequency: number = 3): number {
  return Math.sin(t * Math.PI * 2 * frequency) * Math.exp(-t * 2);
}
