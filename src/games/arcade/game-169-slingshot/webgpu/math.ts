/**
 * WebGPU Math Utilities - Slingshot
 * Arcade / Slingshot / Outdoor Nature Theme
 * Game #169
 */

export const SLINGSHOT_COLORS = {
  // Sky colors
  skyTop: [0.53, 0.81, 0.92, 1.0],
  skyBottom: [0.29, 0.56, 0.76, 1.0],
  sunGold: [1.0, 0.9, 0.4, 1.0],
  cloudWhite: [1.0, 1.0, 1.0, 0.8],

  // Nature colors
  grassGreen: [0.18, 0.35, 0.15, 1.0],
  grassLight: [0.4, 0.6, 0.2, 1.0],
  treeGreen: [0.2, 0.45, 0.2, 1.0],
  woodBrown: [0.55, 0.27, 0.07, 1.0],
  dirtBrown: [0.4, 0.26, 0.13, 1.0],

  // Stone colors
  stoneGray: [0.5, 0.55, 0.53, 1.0],
  stoneDark: [0.37, 0.41, 0.38, 1.0],

  // Target colors
  targetRed: [0.91, 0.3, 0.24, 1.0],
  targetOrange: [0.95, 0.61, 0.07, 1.0],
  targetPurple: [0.61, 0.35, 0.71, 1.0],
  targetBlue: [0.2, 0.6, 0.86, 1.0],
  targetTeal: [0.1, 0.74, 0.61, 1.0],

  // Effects
  impactWhite: [1.0, 1.0, 1.0, 1.0],
  dustBrown: [0.6, 0.45, 0.3, 0.7],
  sparkYellow: [1.0, 0.95, 0.4, 1.0],
  trailGray: [0.5, 0.5, 0.5, 0.4],

  // Confetti
  confettiRed: [0.91, 0.3, 0.24, 1.0],
  confettiGold: [1.0, 0.84, 0.0, 1.0],
  confettiGreen: [0.3, 0.69, 0.31, 1.0],
  confettiBlue: [0.2, 0.6, 0.86, 1.0],
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

export function getLaunchColor(): number[] {
  const colors = [
    SLINGSHOT_COLORS.dustBrown,
    SLINGSHOT_COLORS.stoneGray,
    SLINGSHOT_COLORS.grassLight,
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

export function getImpactColor(): number[] {
  const colors = [
    SLINGSHOT_COLORS.impactWhite,
    SLINGSHOT_COLORS.sparkYellow,
    SLINGSHOT_COLORS.dustBrown,
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

export function getTargetHitColor(targetColor?: number[]): number[] {
  if (targetColor) return targetColor;
  const colors = [
    SLINGSHOT_COLORS.targetRed,
    SLINGSHOT_COLORS.targetOrange,
    SLINGSHOT_COLORS.targetPurple,
    SLINGSHOT_COLORS.targetBlue,
    SLINGSHOT_COLORS.targetTeal,
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

export function getRandomConfettiColor(): number[] {
  const colors = [
    SLINGSHOT_COLORS.confettiRed,
    SLINGSHOT_COLORS.confettiGold,
    SLINGSHOT_COLORS.confettiGreen,
    SLINGSHOT_COLORS.confettiBlue,
    SLINGSHOT_COLORS.sunGold,
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}
