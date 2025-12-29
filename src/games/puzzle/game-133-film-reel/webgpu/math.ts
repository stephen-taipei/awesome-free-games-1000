/**
 * Math Utilities - Film Reel
 * Cinema / Vintage Film Theme
 * Game #133
 */

export const CINEMA_COLORS = {
  // Film tones
  filmBlack: [0.05, 0.05, 0.08, 1.0] as [number, number, number, number],
  filmWhite: [0.95, 0.93, 0.88, 1.0] as [number, number, number, number],
  sepiaDark: [0.35, 0.25, 0.15, 1.0] as [number, number, number, number],
  sepiaLight: [0.85, 0.75, 0.55, 1.0] as [number, number, number, number],

  // Cinema colors
  cinemaRed: [0.80, 0.15, 0.15, 1.0] as [number, number, number, number],
  cinemaGold: [0.85, 0.65, 0.13, 1.0] as [number, number, number, number],
  curtainRed: [0.55, 0.10, 0.10, 1.0] as [number, number, number, number],
  spotlightYellow: [1.0, 0.95, 0.70, 1.0] as [number, number, number, number],

  // Projector effects
  dustMote: [0.8, 0.75, 0.65, 0.6] as [number, number, number, number],
  filmGrain: [0.4, 0.35, 0.30, 0.4] as [number, number, number, number],
  lensFlare: [1.0, 0.9, 0.7, 0.5] as [number, number, number, number],
};

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0);
  return t * t * (3.0 - 2.0 * t);
}

export function lerpColor(
  a: [number, number, number, number],
  b: [number, number, number, number],
  t: number
): [number, number, number, number] {
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

export function easeOutQuad(t: number): number {
  return 1 - (1 - t) * (1 - t);
}

export function easeInOutQuad(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

export function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export function filmFlicker(): number {
  // Simulate old film projector flicker
  const base = 0.85 + Math.random() * 0.15;
  const flicker = Math.random() > 0.95 ? 0.7 : 1.0;
  return base * flicker;
}
