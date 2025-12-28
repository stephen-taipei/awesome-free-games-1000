/**
 * Math Utilities - Pinball
 * Arcade / Neon / Chrome-Silver-Orange Theme
 * Game #160
 */

export const PINBALL_COLORS = {
  // Metallic ball
  chromeSilver: [0.8, 0.82, 0.85, 1.0] as const,
  chromeHighlight: [1.0, 1.0, 1.0, 1.0] as const,
  chromeShadow: [0.4, 0.42, 0.45, 1.0] as const,

  // Bumper colors
  bumperOrange: [1.0, 0.6, 0.15, 1.0] as const,
  bumperYellow: [1.0, 0.85, 0.2, 1.0] as const,
  bumperRed: [1.0, 0.25, 0.15, 1.0] as const,

  // Neon glow
  neonPink: [1.0, 0.2, 0.6, 1.0] as const,
  neonCyan: [0.2, 0.9, 1.0, 1.0] as const,
  neonPurple: [0.7, 0.3, 1.0, 1.0] as const,
  neonGreen: [0.3, 1.0, 0.4, 1.0] as const,

  // Flipper colors
  flipperRed: [0.9, 0.2, 0.15, 1.0] as const,
  flipperOrange: [1.0, 0.4, 0.1, 1.0] as const,

  // Target colors
  targetLit: [0.2, 0.9, 0.4, 1.0] as const,
  targetUnlit: [0.9, 0.25, 0.2, 1.0] as const,

  // Launch effects
  launchWhite: [1.0, 1.0, 1.0, 1.0] as const,
  launchBlue: [0.4, 0.6, 1.0, 1.0] as const,

  // Environment
  tableBlue: [0.1, 0.1, 0.2, 1.0] as const,
  tablePurple: [0.15, 0.1, 0.25, 1.0] as const,
  borderGold: [0.85, 0.7, 0.3, 1.0] as const,

  // Spark effects
  sparkYellow: [1.0, 0.95, 0.5, 1.0] as const,
  sparkOrange: [1.0, 0.7, 0.2, 1.0] as const,
  sparkWhite: [1.0, 1.0, 0.95, 1.0] as const,
} as const;

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function lerpColor(
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

export function randomRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

export function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

export function easeOutQuad(t: number): number {
  return 1 - (1 - t) * (1 - t);
}

export function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export function easeOutElastic(t: number): number {
  const c4 = (2 * Math.PI) / 3;
  return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
}

export function vec2Length(x: number, y: number): number {
  return Math.sqrt(x * x + y * y);
}

export function normalize2D(x: number, y: number): [number, number] {
  const len = vec2Length(x, y);
  if (len === 0) return [0, 0];
  return [x / len, y / len];
}
