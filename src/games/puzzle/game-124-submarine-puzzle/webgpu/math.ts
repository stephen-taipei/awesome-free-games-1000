/**
 * WebGPU Math Utilities - Submarine Puzzle
 * Underwater Ocean / Deep Sea Theme
 * Game #124
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

// Underwater Ocean color palette
export const COLORS = {
  // Ocean water
  oceanLight: [0.0, 0.47, 0.75],
  oceanMid: [0.0, 0.35, 0.55],
  oceanDeep: [0.0, 0.20, 0.40],
  oceanDark: [0.0, 0.12, 0.25],

  // Submarine
  subYellow: [1.0, 0.76, 0.03],
  subOrange: [1.0, 0.60, 0.0],
  subWindow: [0.53, 0.81, 0.92],

  // Bubbles
  bubbleWhite: [1.0, 1.0, 1.0],
  bubbleBlue: [0.70, 0.90, 1.0],

  // Collectibles
  oxygenCyan: [0.0, 0.74, 0.83],
  starGold: [1.0, 0.84, 0.0],

  // Obstacles
  rockGray: [0.29, 0.29, 0.29],
  seaweedGreen: [0.18, 0.35, 0.15],
  coralRed: [1.0, 0.42, 0.42],
  mineBlack: [0.20, 0.20, 0.20],

  // Effects
  currentBlue: [0.40, 0.70, 0.95],
  sparkle: [1.0, 1.0, 0.90],
  dangerRed: [1.0, 0.0, 0.0],
  success: [0.30, 0.69, 0.31],
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

export function waveMotion(t: number, amplitude: number = 1, frequency: number = 1): number {
  return Math.sin(t * frequency) * amplitude;
}
