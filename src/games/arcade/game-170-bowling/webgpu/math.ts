/**
 * Bowling WebGPU Math Utilities
 * Game #170 - Bowling Alley Theme
 */

export const BOWLING_COLORS = {
  // Lane colors
  laneWood: [0.76, 0.60, 0.42, 1.0],
  laneDark: [0.63, 0.49, 0.35, 1.0],
  gutterBlue: [0.17, 0.24, 0.31, 1.0],

  // Ball colors
  ballPurple: [0.61, 0.35, 0.71, 1.0],
  ballDark: [0.42, 0.20, 0.51, 1.0],

  // Pin colors
  pinWhite: [0.93, 0.94, 0.95, 1.0],
  pinRed: [0.91, 0.30, 0.24, 1.0],

  // Ambient
  ambient: [0.22, 0.28, 0.35, 1.0],
  spotlight: [1.0, 0.97, 0.85, 1.0],

  // Accent colors
  strikeGold: [1.0, 0.84, 0.0, 1.0],
  spareBlue: [0.20, 0.60, 0.86, 1.0],

  // Effects
  impact: [1.0, 1.0, 1.0, 1.0],
  sparks: [1.0, 0.90, 0.70, 1.0],
};

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function lerpColor(
  c1: number[],
  c2: number[],
  t: number
): [number, number, number, number] {
  return [
    lerp(c1[0], c2[0], t),
    lerp(c1[1], c2[1], t),
    lerp(c1[2], c2[2], t),
    lerp(c1[3], c2[3], t),
  ];
}

export function randomInRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

export function randomColor(colors: number[][]): number[] {
  return colors[Math.floor(Math.random() * colors.length)];
}

export function easeOutQuad(t: number): number {
  return t * (2 - t);
}

export function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export function easeOutBounce(t: number): number {
  const n1 = 7.5625;
  const d1 = 2.75;
  if (t < 1 / d1) {
    return n1 * t * t;
  } else if (t < 2 / d1) {
    return n1 * (t -= 1.5 / d1) * t + 0.75;
  } else if (t < 2.5 / d1) {
    return n1 * (t -= 2.25 / d1) * t + 0.9375;
  } else {
    return n1 * (t -= 2.625 / d1) * t + 0.984375;
  }
}
