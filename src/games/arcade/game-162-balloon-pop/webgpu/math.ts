/**
 * Math Utilities - Balloon Pop
 * Sky / Carnival / Colorful Balloons Theme
 * Game #162
 */

export const BALLOON_COLORS = {
  // Sky colors
  skyBlue: [0.53, 0.81, 0.92, 1.0] as [number, number, number, number],
  skyLight: [0.69, 0.88, 0.96, 1.0] as [number, number, number, number],
  cloudWhite: [1.0, 1.0, 1.0, 0.9] as [number, number, number, number],

  // Balloon colors
  balloonRed: [0.91, 0.22, 0.27, 1.0] as [number, number, number, number],
  balloonBlue: [0.20, 0.55, 0.87, 1.0] as [number, number, number, number],
  balloonYellow: [0.98, 0.84, 0.16, 1.0] as [number, number, number, number],
  balloonGreen: [0.30, 0.78, 0.35, 1.0] as [number, number, number, number],
  balloonPink: [1.0, 0.41, 0.71, 1.0] as [number, number, number, number],
  balloonPurple: [0.61, 0.35, 0.82, 1.0] as [number, number, number, number],
  balloonOrange: [1.0, 0.55, 0.0, 1.0] as [number, number, number, number],

  // Special
  bonusGold: [1.0, 0.84, 0.0, 1.0] as [number, number, number, number],
  bonusGlow: [1.0, 0.93, 0.55, 1.0] as [number, number, number, number],
  dartSilver: [0.75, 0.75, 0.80, 1.0] as [number, number, number, number],
  dartTip: [0.85, 0.35, 0.20, 1.0] as [number, number, number, number],

  // Confetti
  confettiRed: [0.95, 0.20, 0.30, 1.0] as [number, number, number, number],
  confettiBlue: [0.20, 0.40, 0.95, 1.0] as [number, number, number, number],
  confettiGold: [1.0, 0.80, 0.20, 1.0] as [number, number, number, number],
  confettiGreen: [0.20, 0.85, 0.40, 1.0] as [number, number, number, number],
  confettiPink: [1.0, 0.50, 0.75, 1.0] as [number, number, number, number],
};

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function lerpColor(
  a: [number, number, number, number],
  b: [number, number, number, number],
  t: number
): [number, number, number, number] {
  return [
    lerp(a[0], b[0], t),
    lerp(a[1], b[1], t),
    lerp(a[2], b[2], t),
    lerp(a[3], b[3], t),
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

export function getRandomBalloonColor(): [number, number, number, number] {
  const colors = [
    BALLOON_COLORS.balloonRed,
    BALLOON_COLORS.balloonBlue,
    BALLOON_COLORS.balloonYellow,
    BALLOON_COLORS.balloonGreen,
    BALLOON_COLORS.balloonPink,
    BALLOON_COLORS.balloonPurple,
    BALLOON_COLORS.balloonOrange,
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

export function getRandomConfettiColor(): [number, number, number, number] {
  const colors = [
    BALLOON_COLORS.confettiRed,
    BALLOON_COLORS.confettiBlue,
    BALLOON_COLORS.confettiGold,
    BALLOON_COLORS.confettiGreen,
    BALLOON_COLORS.confettiPink,
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}
