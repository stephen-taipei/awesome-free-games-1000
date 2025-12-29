/**
 * WebGPU Math Utilities - Basketball Arcade
 * Stadium / Basketball / Orange and Purple Theme
 * Game #166
 */

export const BASKETBALL_COLORS = {
  // Ball colors
  ballOrange: [1.0, 0.45, 0.0, 1.0],
  ballLines: [0.15, 0.08, 0.0, 1.0],

  // Court colors
  courtWood: [0.6, 0.4, 0.2, 1.0],
  courtLines: [1.0, 1.0, 1.0, 1.0],
  courtPurple: [0.4, 0.2, 0.6, 1.0],

  // Hoop colors
  rimOrange: [1.0, 0.35, 0.0, 1.0],
  netWhite: [1.0, 1.0, 1.0, 0.9],
  backboard: [1.0, 1.0, 1.0, 0.8],

  // Stadium colors
  stadiumBlue: [0.1, 0.15, 0.3, 1.0],
  stadiumPurple: [0.3, 0.15, 0.4, 1.0],
  spotlightWhite: [1.0, 1.0, 0.95, 1.0],
  spotlightYellow: [1.0, 0.9, 0.5, 1.0],

  // Effect colors
  scoreGold: [1.0, 0.85, 0.2, 1.0],
  swishGreen: [0.2, 1.0, 0.4, 1.0],
  missRed: [1.0, 0.3, 0.2, 1.0],
  sparkWhite: [1.0, 1.0, 1.0, 1.0],

  // Confetti
  confettiOrange: [1.0, 0.5, 0.0, 1.0],
  confettiPurple: [0.6, 0.3, 0.8, 1.0],
  confettiGold: [1.0, 0.85, 0.0, 1.0],
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

export function easeOutElastic(t: number): number {
  const c4 = (2 * Math.PI) / 3;
  return t === 0
    ? 0
    : t === 1
    ? 1
    : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
}

export function vec2Length(x: number, y: number): number {
  return Math.sqrt(x * x + y * y);
}

export function normalize2D(x: number, y: number): [number, number] {
  const len = vec2Length(x, y);
  if (len === 0) return [0, 0];
  return [x / len, y / len];
}

export function getRandomBallColor(): number[] {
  const colors = [
    BASKETBALL_COLORS.ballOrange,
    BASKETBALL_COLORS.scoreGold,
    BASKETBALL_COLORS.confettiOrange,
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

export function getRandomConfettiColor(): number[] {
  const colors = [
    BASKETBALL_COLORS.confettiOrange,
    BASKETBALL_COLORS.confettiPurple,
    BASKETBALL_COLORS.confettiGold,
    BASKETBALL_COLORS.confettiWhite,
    BASKETBALL_COLORS.scoreGold,
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

export function getSpotlightColor(): number[] {
  return Math.random() > 0.5
    ? BASKETBALL_COLORS.spotlightWhite
    : BASKETBALL_COLORS.spotlightYellow;
}
