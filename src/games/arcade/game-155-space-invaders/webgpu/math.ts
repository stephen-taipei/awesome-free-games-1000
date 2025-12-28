/**
 * Math Utilities - Space Invaders
 * Retro CRT / Neon Green / Space Arcade Theme
 * Game #155
 */

export type Vec2 = [number, number];
export type Vec3 = [number, number, number];
export type Vec4 = [number, number, number, number];

export const INVADERS_COLORS = {
  // CRT Green phosphor
  crtGreen: [0.0, 1.0, 0.0, 1.0] as const,
  crtBright: [0.4, 1.0, 0.4, 1.0] as const,
  crtDim: [0.0, 0.6, 0.0, 1.0] as const,

  // Alien colors
  alienRed: [1.0, 0.42, 0.42, 1.0] as const,
  alienYellow: [1.0, 0.89, 0.35, 1.0] as const,
  alienCyan: [0.28, 0.86, 0.98, 1.0] as const,

  // Bullets
  playerBullet: [0.0, 1.0, 0.0, 1.0] as const,
  alienBullet: [1.0, 0.0, 0.0, 1.0] as const,

  // Effects
  explosion: [1.0, 0.6, 0.0, 1.0] as const,
  spark: [1.0, 1.0, 0.8, 1.0] as const,

  // Barrier
  barrierGreen: [0.0, 0.8, 0.0, 1.0] as const,

  // Stars
  starWhite: [1.0, 1.0, 1.0, 1.0] as const,
  starDim: [0.5, 0.5, 0.6, 1.0] as const,

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

export function easeOutExpo(t: number): number {
  return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
}

export function scanlineFlicker(t: number): number {
  return 0.95 + Math.sin(t * 60) * 0.05;
}
