/**
 * WebGPU Math Utilities - Claw Machine
 * Arcade / UFO Catcher / Purple and Neon Theme
 * Game #164
 */

export const CLAW_COLORS = {
  // Arcade machine
  arcadePurple: [0.58, 0.2, 0.8, 1.0],
  arcadeDeepPurple: [0.35, 0.1, 0.55, 1.0],
  arcadeDark: [0.12, 0.08, 0.18, 1.0],
  arcadeBlack: [0.08, 0.05, 0.12, 1.0],

  // Neon colors
  neonPink: [1.0, 0.2, 0.6, 1.0],
  neonCyan: [0.2, 1.0, 0.9, 1.0],
  neonYellow: [1.0, 0.95, 0.3, 1.0],
  neonGreen: [0.3, 1.0, 0.4, 1.0],
  neonOrange: [1.0, 0.5, 0.2, 1.0],

  // Claw colors
  clawRed: [0.9, 0.25, 0.2, 1.0],
  clawSilver: [0.75, 0.78, 0.82, 1.0],
  clawGlow: [1.0, 0.4, 0.3, 1.0],

  // Prize colors
  prizeBear: [0.55, 0.27, 0.08, 1.0],
  prizeBunny: [1.0, 1.0, 1.0, 1.0],
  prizeStar: [1.0, 0.84, 0.0, 1.0],
  prizeBall: [0.9, 0.3, 0.24, 1.0],
  prizeDiamond: [0.2, 0.6, 0.85, 1.0],

  // Effects
  sparkleWhite: [1.0, 1.0, 1.0, 1.0],
  sparkleGold: [1.0, 0.9, 0.5, 1.0],
  successGreen: [0.3, 1.0, 0.5, 1.0],
  failRed: [1.0, 0.3, 0.3, 1.0],
  coinGold: [1.0, 0.85, 0.3, 1.0]
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

export function easeOutExpo(t: number): number {
  return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
}

export function easeOutElastic(t: number): number {
  const c4 = (2 * Math.PI) / 3;
  return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
}

export function easeInBack(t: number): number {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return c3 * t * t * t - c1 * t * t;
}

export function vec2Length(x: number, y: number): number {
  return Math.sqrt(x * x + y * y);
}

export function normalize2D(x: number, y: number): [number, number] {
  const len = vec2Length(x, y);
  if (len === 0) return [0, 0];
  return [x / len, y / len];
}

export function getRandomNeonColor(): number[] {
  const neonColors = [
    CLAW_COLORS.neonPink,
    CLAW_COLORS.neonCyan,
    CLAW_COLORS.neonYellow,
    CLAW_COLORS.neonGreen,
    CLAW_COLORS.neonOrange
  ];
  return [...neonColors[Math.floor(Math.random() * neonColors.length)]];
}

export function getPrizeColor(prizeType: string): number[] {
  switch (prizeType) {
    case 'bear': return [...CLAW_COLORS.prizeBear];
    case 'bunny': return [...CLAW_COLORS.prizeBunny];
    case 'star': return [...CLAW_COLORS.prizeStar];
    case 'ball': return [...CLAW_COLORS.prizeBall];
    case 'diamond': return [...CLAW_COLORS.prizeDiamond];
    default: return [...CLAW_COLORS.neonPink];
  }
}
