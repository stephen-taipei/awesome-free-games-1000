/**
 * WebGPU Math Utilities - Dart Throw
 * Pub / Darts / Red and Green Theme
 * Game #167
 */

export const DART_COLORS = {
  // Dartboard colors
  boardRed: [0.9, 0.23, 0.19, 1.0],
  boardGreen: [0.18, 0.8, 0.44, 1.0],
  boardBlack: [0.17, 0.24, 0.31, 1.0],
  boardWhite: [0.93, 0.94, 0.95, 1.0],
  boardGold: [1.0, 0.84, 0.0, 1.0],

  // Dart colors
  dartSilver: [0.75, 0.75, 0.8, 1.0],
  dartRed: [0.9, 0.23, 0.19, 1.0],
  dartBlue: [0.2, 0.4, 0.8, 1.0],

  // Pub atmosphere
  pubBrown: [0.4, 0.26, 0.13, 1.0],
  pubWarm: [0.6, 0.4, 0.2, 1.0],
  pubLight: [1.0, 0.9, 0.7, 1.0],
  pubDark: [0.15, 0.1, 0.08, 1.0],

  // Effect colors
  scoreGold: [1.0, 0.85, 0.2, 1.0],
  bullseyeGold: [1.0, 0.8, 0.0, 1.0],
  sparkWhite: [1.0, 1.0, 1.0, 1.0],
  missGray: [0.5, 0.5, 0.5, 1.0],

  // Confetti
  confettiRed: [0.9, 0.23, 0.19, 1.0],
  confettiGreen: [0.18, 0.8, 0.44, 1.0],
  confettiGold: [1.0, 0.84, 0.0, 1.0],
  confettiWhite: [1.0, 1.0, 1.0, 1.0],
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

export function randomRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function easeOutQuad(t: number): number {
  return 1 - (1 - t) * (1 - t);
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

export function vec2Length(x: number, y: number): number {
  return Math.sqrt(x * x + y * y);
}

export function normalize2D(x: number, y: number): [number, number] {
  const len = vec2Length(x, y);
  if (len === 0) return [0, 0];
  return [x / len, y / len];
}

export function getRandomDartColor(): number[] {
  const colors = [
    DART_COLORS.dartRed,
    DART_COLORS.dartBlue,
    DART_COLORS.dartSilver,
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

export function getRandomConfettiColor(): number[] {
  const colors = [
    DART_COLORS.confettiRed,
    DART_COLORS.confettiGreen,
    DART_COLORS.confettiGold,
    DART_COLORS.confettiWhite,
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

export function getScoreColor(score: number): number[] {
  if (score >= 50) return DART_COLORS.bullseyeGold;
  if (score >= 25) return DART_COLORS.scoreGold;
  if (score >= 15) return DART_COLORS.boardGreen;
  return DART_COLORS.boardWhite;
}
