/**
 * WebGPU Math Utilities - Solar System
 * Space / Cosmos Theme
 * Game #125
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

export function distance(x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}

// Space / Cosmos color palette
export const COLORS = {
  // Deep space
  spaceBlack: [0.04, 0.04, 0.08],
  spaceDeep: [0.06, 0.06, 0.15],
  spacePurple: [0.15, 0.08, 0.25],

  // Stars
  starWhite: [1.0, 1.0, 1.0],
  starYellow: [1.0, 0.95, 0.8],
  starBlue: [0.7, 0.85, 1.0],
  starRed: [1.0, 0.7, 0.6],

  // Sun
  sunCore: [1.0, 0.85, 0.2],
  sunGlow: [1.0, 0.6, 0.1],
  sunCorona: [1.0, 0.4, 0.0],

  // Planets
  mercuryBrown: [0.63, 0.32, 0.18],
  venusGold: [0.85, 0.65, 0.13],
  earthBlue: [0.25, 0.41, 0.88],
  marsRed: [0.8, 0.36, 0.36],
  jupiterOrange: [0.82, 0.41, 0.12],
  saturnTan: [0.96, 0.64, 0.38],

  // Effects
  nebulaBlue: [0.2, 0.4, 0.8],
  nebulaPink: [0.8, 0.3, 0.6],
  nebulaPurple: [0.5, 0.2, 0.7],
  cometTail: [0.6, 0.8, 1.0],
  alignment: [0.3, 0.69, 0.31],
  orbitGlow: [0.4, 0.6, 0.9],
} as const;

export function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\\d]{2})([a-f\\d]{2})([a-f\\d]{2})$/i.exec(hex);
  if (result) {
    return [
      parseInt(result[1], 16) / 255,
      parseInt(result[2], 16) / 255,
      parseInt(result[3], 16) / 255,
    ];
  }
  return [1, 1, 1];
}

export function easeOutQuad(t: number): number {
  return 1 - (1 - t) * (1 - t);
}

export function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export function easeInOutSine(t: number): number {
  return -(Math.cos(Math.PI * t) - 1) / 2;
}

export function orbitPosition(
  centerX: number,
  centerY: number,
  radius: number,
  angle: number
): { x: number; y: number } {
  return {
    x: centerX + Math.cos(angle) * radius,
    y: centerY + Math.sin(angle) * radius,
  };
}
