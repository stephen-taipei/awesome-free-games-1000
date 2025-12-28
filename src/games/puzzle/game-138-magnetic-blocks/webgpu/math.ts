/**
 * Math Utilities - Magnetic Blocks
 * Electromagnetic / Physics / Magnet Theme
 * Game #138
 */

export const MAGNETIC_COLORS = {
  // Background
  deepSpace: [0.10, 0.10, 0.18, 1.0] as const,
  cosmicPurple: [0.09, 0.13, 0.24, 1.0] as const,

  // Magnetic Poles
  positiveRed: [0.91, 0.30, 0.24, 1.0] as const,
  negativeBlue: [0.20, 0.60, 0.86, 1.0] as const,
  neutralGray: [0.58, 0.65, 0.65, 1.0] as const,

  // Field Effects
  fieldPurple: [0.61, 0.35, 0.71, 1.0] as const,
  plasmaMagenta: [0.78, 0.24, 0.62, 1.0] as const,
  electricCyan: [0.20, 0.85, 0.95, 1.0] as const,

  // Sparks & Glow
  sparkWhite: [1.0, 1.0, 1.0, 1.0] as const,
  sparkYellow: [1.0, 0.95, 0.60, 1.0] as const,
  glowOrange: [1.0, 0.60, 0.20, 1.0] as const,

  // Force Lines
  attractLine: [0.40, 0.80, 0.40, 1.0] as const,
  repelLine: [1.0, 0.40, 0.30, 1.0] as const,
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

export function magneticFieldStrength(distance: number): number {
  // Inverse square law for magnetic field
  return 1.0 / (1.0 + distance * distance);
}

export function waveFunction(x: number, time: number, frequency: number = 1.0): number {
  return Math.sin(x * frequency + time) * 0.5 + 0.5;
}
