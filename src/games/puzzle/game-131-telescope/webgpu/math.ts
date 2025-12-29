/**
 * Math utilities for WebGPU - Telescope
 * Astronomy / Night Sky Theme
 * Game #131
 */

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

export function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export function easeOutExpo(t: number): number {
  return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
}

// Astronomy/Night Sky color palette
export const ASTRO_COLORS = {
  starWhite: [1.0, 1.0, 0.95],
  starGold: [1.0, 0.84, 0.0],
  starBlue: [0.53, 0.81, 0.98],
  nebulaPurple: [0.58, 0.44, 0.86],
  nebulaPink: [0.94, 0.50, 0.80],
  nebulaBlue: [0.25, 0.41, 0.88],
  cometTail: [0.68, 0.85, 0.90],
  deepSpace: [0.04, 0.04, 0.12],
  darkBlue: [0.10, 0.10, 0.25],
  lensFlare: [0.39, 0.58, 0.93]
};

export function hexToRgb(hex: string): number[] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? [
        parseInt(result[1], 16) / 255,
        parseInt(result[2], 16) / 255,
        parseInt(result[3], 16) / 255
      ]
    : [1, 1, 1];
}
