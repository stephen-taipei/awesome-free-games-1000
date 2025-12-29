/**
 * Math Utilities - Breakout
 * Neon Electric / Purple-Pink / Arcade Theme
 * Game #153
 */

export const BREAKOUT_COLORS = {
  // Neon purples
  neonPurple: [0.42, 0.36, 0.91, 1.0] as const,
  neonViolet: [0.64, 0.61, 1.0, 1.0] as const,
  deepPurple: [0.3, 0.25, 0.6, 1.0] as const,

  // Neon pinks
  neonPink: [0.99, 0.47, 0.66, 1.0] as const,
  hotPink: [1.0, 0.3, 0.5, 1.0] as const,
  softPink: [1.0, 0.6, 0.8, 1.0] as const,

  // Brick colors (matching game colors)
  brickRed: [0.91, 0.30, 0.24, 1.0] as const,
  brickOrange: [0.90, 0.49, 0.13, 1.0] as const,
  brickYellow: [0.95, 0.77, 0.06, 1.0] as const,
  brickGreen: [0.18, 0.80, 0.44, 1.0] as const,
  brickBlue: [0.20, 0.60, 0.86, 1.0] as const,
  brickPurple: [0.61, 0.35, 0.71, 1.0] as const,

  // Ball and paddle
  ballWhite: [1.0, 1.0, 1.0, 1.0] as const,
  ballGlow: [0.8, 0.9, 1.0, 0.8] as const,
  paddleGray: [0.87, 0.90, 0.91, 1.0] as const,
  paddleGlow: [0.7, 0.75, 0.8, 0.6] as const,

  // Electric effects
  electricBlue: [0.3, 0.7, 1.0, 1.0] as const,
  electricCyan: [0.0, 1.0, 1.0, 1.0] as const,
  spark: [1.0, 1.0, 0.8, 1.0] as const,

  // Background
  bgDark: [0.12, 0.15, 0.18, 1.0] as const,
} as const;

export const BRICK_COLORS = [
  BREAKOUT_COLORS.brickRed,
  BREAKOUT_COLORS.brickOrange,
  BREAKOUT_COLORS.brickYellow,
  BREAKOUT_COLORS.brickGreen,
  BREAKOUT_COLORS.brickBlue,
  BREAKOUT_COLORS.brickPurple,
];

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function randomRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

export function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export function easeOutQuad(t: number): number {
  return 1 - (1 - t) * (1 - t);
}

export function easeOutElastic(t: number): number {
  const c4 = (2 * Math.PI) / 3;
  return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
}

export function getBrickColor(row: number): readonly number[] {
  return BRICK_COLORS[row % BRICK_COLORS.length];
}

export function hexToRgb(hex: string): readonly number[] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (result) {
    return [
      parseInt(result[1], 16) / 255,
      parseInt(result[2], 16) / 255,
      parseInt(result[3], 16) / 255,
      1.0,
    ];
  }
  return BREAKOUT_COLORS.neonPurple;
}

export function pulseValue(time: number, speed: number = 1, min: number = 0.5, max: number = 1): number {
  return lerp(min, max, (Math.sin(time * speed) + 1) / 2);
}
