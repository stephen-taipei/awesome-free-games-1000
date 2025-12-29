/**
 * Math Utilities - Dig Site
 * Archaeological / Desert / Earth / Discovery Theme
 * Game #147
 */

export const EARTH_COLORS = {
  // Sand and dirt layers
  lightSand: [0.82, 0.71, 0.55, 1.0] as const,
  tan: [0.77, 0.66, 0.51, 1.0] as const,
  lightBrown: [0.63, 0.51, 0.43, 1.0] as const,
  brown: [0.55, 0.45, 0.33, 1.0] as const,
  darkBrown: [0.42, 0.27, 0.14, 1.0] as const,
  deepEarth: [0.29, 0.22, 0.16, 1.0] as const,

  // Discovery and treasure
  gold: [0.85, 0.65, 0.13, 1.0] as const,
  treasureGlow: [1.0, 0.84, 0.0, 1.0] as const,
  ancientBronze: [0.80, 0.50, 0.20, 1.0] as const,

  // Effects
  dustCloud: [0.75, 0.65, 0.50, 0.6] as const,
  sandPuff: [0.85, 0.75, 0.60, 0.5] as const,
  earthParticle: [0.55, 0.40, 0.25, 0.8] as const,
} as const;

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

export function easeOutQuad(t: number): number {
  return 1 - (1 - t) * (1 - t);
}

export function easeOutBack(t: number): number {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

export function colorLerp(
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
