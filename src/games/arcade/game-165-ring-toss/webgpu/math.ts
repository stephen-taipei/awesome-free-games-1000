/**
 * WebGPU Math Utilities - Ring Toss
 * Carnival / Fairground / Colorful and Festive Theme
 * Game #165
 */

export const CARNIVAL_COLORS = {
  // Carnival background
  skyBlue: [0.1, 0.32, 0.46, 1.0],
  skyDeep: [0.08, 0.26, 0.38, 1.0],
  grassGreen: [0.15, 0.68, 0.38, 1.0],
  grassLight: [0.18, 0.8, 0.44, 1.0],

  // Ring colors
  ringRed: [0.9, 0.29, 0.24, 1.0],
  ringBlue: [0.2, 0.6, 0.86, 1.0],
  ringGreen: [0.18, 0.8, 0.44, 1.0],
  ringOrange: [0.95, 0.61, 0.07, 1.0],
  ringPurple: [0.61, 0.35, 0.71, 1.0],

  // Peg colors
  pegGold: [1.0, 0.84, 0.0, 1.0],
  pegSilver: [0.75, 0.75, 0.75, 1.0],
  pegBronze: [0.8, 0.5, 0.2, 1.0],

  // Effects
  sparkleWhite: [1.0, 1.0, 1.0, 1.0],
  confettiRed: [1.0, 0.2, 0.2, 1.0],
  confettiBlue: [0.2, 0.6, 1.0, 1.0],
  confettiYellow: [1.0, 0.95, 0.3, 1.0],
  confettiPink: [1.0, 0.5, 0.7, 1.0],
  confettiGreen: [0.3, 1.0, 0.5, 1.0],

  // Celebration
  starGold: [1.0, 0.85, 0.3, 1.0],
  burstWhite: [1.0, 1.0, 0.95, 1.0]
};

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function lerpColor(a: number[], b: number[], t: number): number[] {
  return a.map((v, i) => lerp(v, b[i], t));
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

export function getRandomRingColor(): number[] {
  const colors = [
    CARNIVAL_COLORS.ringRed,
    CARNIVAL_COLORS.ringBlue,
    CARNIVAL_COLORS.ringGreen,
    CARNIVAL_COLORS.ringOrange,
    CARNIVAL_COLORS.ringPurple
  ];
  return [...colors[Math.floor(Math.random() * colors.length)]];
}

export function getRandomConfettiColor(): number[] {
  const colors = [
    CARNIVAL_COLORS.confettiRed,
    CARNIVAL_COLORS.confettiBlue,
    CARNIVAL_COLORS.confettiYellow,
    CARNIVAL_COLORS.confettiPink,
    CARNIVAL_COLORS.confettiGreen
  ];
  return [...colors[Math.floor(Math.random() * colors.length)]];
}

export function getPegColor(points: number): number[] {
  if (points >= 100) return [...CARNIVAL_COLORS.pegGold];
  if (points >= 40) return [...CARNIVAL_COLORS.pegSilver];
  return [...CARNIVAL_COLORS.pegBronze];
}
