/**
 * Math Utilities - Vortex Puzzle
 * Cosmic Vortex / Wormhole / Space Portal Theme
 * Game #139
 */

export const VORTEX_COLORS = {
  // Background
  deepSpace: [0.06, 0.06, 0.10, 1.0] as const,
  cosmicDark: [0.10, 0.08, 0.18, 1.0] as const,

  // Vortex Core
  vortexBlue: [0.20, 0.60, 0.86, 1.0] as const,
  vortexPurple: [0.58, 0.30, 0.82, 1.0] as const,
  vortexCore: [0.40, 0.20, 0.70, 1.0] as const,

  // Nebula Colors
  nebulaRed: [0.91, 0.30, 0.24, 1.0] as const,
  nebulaPink: [0.91, 0.40, 0.60, 1.0] as const,
  nebulaCyan: [0.20, 0.85, 0.95, 1.0] as const,

  // Energy & Glow
  energyWhite: [1.0, 1.0, 1.0, 1.0] as const,
  energyYellow: [1.0, 0.95, 0.60, 1.0] as const,
  portalGreen: [0.18, 0.80, 0.44, 1.0] as const,

  // Stars
  starWhite: [1.0, 1.0, 1.0, 1.0] as const,
  starBlue: [0.60, 0.80, 1.0, 1.0] as const,
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

export function colorToVec4(color: readonly [number, number, number, number]): Float32Array {
  return new Float32Array(color);
}

export function lerpColor(
  a: readonly [number, number, number, number],
  b: readonly [number, number, number, number],
  t: number
): [number, number, number, number] {
  return [
    lerp(a[0], b[0], t),
    lerp(a[1], b[1], t),
    lerp(a[2], b[2], t),
    lerp(a[3], b[3], t),
  ];
}

export function spiralPosition(angle: number, distance: number): { x: number; y: number } {
  return {
    x: Math.cos(angle) * distance,
    y: Math.sin(angle) * distance,
  };
}

export function vortexIntensity(distance: number, time: number): number {
  return Math.sin(distance * 5.0 - time * 2.0) * 0.5 + 0.5;
}
