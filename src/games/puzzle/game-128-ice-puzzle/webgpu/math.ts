/**
 * WebGPU Math Utilities - Ice Puzzle
 * Arctic / Ice Theme
 * Game #128
 */

// Ice color palette
export const COLORS = {
  // Ice colors
  iceWhite: [1.0, 1.0, 1.0],
  icePale: [0.9, 0.97, 1.0],
  iceBlue: [0.56, 0.79, 0.98],
  iceCyan: [0.0, 0.74, 0.83],
  iceDeep: [0.17, 0.24, 0.31],

  // Frost colors
  frostWhite: [0.95, 0.98, 1.0],
  frostBlue: [0.7, 0.88, 0.95],
  frostCrystal: [0.8, 0.92, 1.0],

  // Player (penguin)
  penguinDark: [0.15, 0.17, 0.2],
  penguinBelly: [0.93, 0.94, 0.95],
  penguinBeak: [1.0, 0.6, 0.0],

  // Goal
  goalGreen: [0.3, 0.69, 0.31],
  goalGlow: [0.5, 0.85, 0.5],

  // Effects
  slideTrail: [0.56, 0.79, 0.98],
  sparkle: [1.0, 1.0, 1.0],
  aurora: [0.4, 0.9, 0.7],
};

// Easing functions
export function easeOutQuad(t: number): number {
  return 1 - (1 - t) * (1 - t);
}

export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export function easeOutElastic(t: number): number {
  const c4 = (2 * Math.PI) / 3;
  return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
}

// Utility functions
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function randomRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

export function lerpColor(a: number[], b: number[], t: number): number[] {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
}
