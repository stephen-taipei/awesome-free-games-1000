/**
 * WebGPU Math Utilities - Battle City
 * Military / Tank Warfare / Olive Green Theme
 * Game #158
 */

export const BATTLE_COLORS = {
  // Player tank
  playerGreen: [0.15, 0.68, 0.38, 1.0] as const,
  playerLight: [0.18, 0.80, 0.44, 1.0] as const,

  // Enemy tanks
  enemyGray: [0.50, 0.55, 0.60, 1.0] as const,
  enemyFast: [0.61, 0.35, 0.71, 1.0] as const,
  enemyPower: [0.91, 0.30, 0.24, 1.0] as const,
  enemyArmor: [0.20, 0.29, 0.37, 1.0] as const,

  // Terrain
  brickBrown: [0.71, 0.40, 0.11, 1.0] as const,
  steelGray: [0.75, 0.75, 0.75, 1.0] as const,
  waterBlue: [0.12, 0.56, 1.0, 1.0] as const,
  forestGreen: [0.13, 0.55, 0.13, 1.0] as const,
  iceCyan: [0.68, 0.85, 0.90, 1.0] as const,

  // Base
  baseGold: [1.0, 0.84, 0.0, 1.0] as const,
  baseDestroyed: [0.33, 0.33, 0.33, 1.0] as const,

  // Effects
  muzzleFlash: [1.0, 0.9, 0.5, 1.0] as const,
  bulletTrail: [1.0, 0.8, 0.3, 1.0] as const,
  explosionOrange: [1.0, 0.5, 0.0, 1.0] as const,
  explosionYellow: [1.0, 1.0, 0.0, 1.0] as const,
  smokeGray: [0.4, 0.4, 0.4, 0.6] as const,
  debrisBrown: [0.5, 0.35, 0.2, 1.0] as const,

  // Background
  bgBlack: [0.0, 0.0, 0.0, 1.0] as const,
  gridLine: [0.1, 0.1, 0.1, 0.5] as const
} as const;

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function lerpColor(
  c1: readonly [number, number, number, number],
  c2: readonly [number, number, number, number],
  t: number
): [number, number, number, number] {
  return [
    lerp(c1[0], c2[0], t),
    lerp(c1[1], c2[1], t),
    lerp(c1[2], c2[2], t),
    lerp(c1[3], c2[3], t)
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

export function vec2Length(x: number, y: number): number {
  return Math.sqrt(x * x + y * y);
}

export function normalize2D(x: number, y: number): [number, number] {
  const len = vec2Length(x, y);
  if (len === 0) return [0, 0];
  return [x / len, y / len];
}
