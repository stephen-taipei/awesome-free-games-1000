/**
 * WebGPU Math Utilities - Wormhole
 * Space / Wormhole Theme
 * Game #127
 */

export const COLORS = {
  // Deep space
  spaceBlack: [0.02, 0.01, 0.05],
  spaceDeep: [0.06, 0.04, 0.15],
  spacePurple: [0.12, 0.08, 0.25],

  // Stars
  starWhite: [1.0, 1.0, 1.0],
  starBlue: [0.7, 0.8, 1.0],
  starYellow: [1.0, 0.95, 0.8],

  // Wormhole colors
  wormholeCore: [0.1, 0.0, 0.2],
  wormholeRed: [0.9, 0.3, 0.2],
  wormholeBlue: [0.2, 0.5, 0.9],
  wormholeGreen: [0.2, 0.9, 0.5],
  wormholeOrange: [0.95, 0.6, 0.1],

  // Player
  playerCore: [0.6, 0.35, 0.7],
  playerGlow: [0.8, 0.5, 0.9],

  // Goal
  goalCore: [0.95, 0.8, 0.2],
  goalGlow: [1.0, 0.9, 0.4],

  // Energy / Teleport
  teleportCore: [0.4, 0.8, 1.0],
  teleportGlow: [0.6, 0.9, 1.0],
  energyTrail: [0.5, 0.3, 0.8],

  // Cosmic dust
  cosmicDust: [0.3, 0.2, 0.5],
  nebulaBlue: [0.2, 0.3, 0.8],
  nebulaPink: [0.8, 0.3, 0.6],
};

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

export function easeOutElastic(t: number): number {
  const c4 = (2 * Math.PI) / 3;
  return t === 0
    ? 0
    : t === 1
      ? 1
      : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
}

export function easeInOutQuad(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

export function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export function randomRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

export function randomColor(base: number[], variance: number = 0.1): number[] {
  return base.map((c) =>
    clamp(c + (Math.random() - 0.5) * variance, 0, 1)
  );
}

export function distance(
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}

export function normalize(x: number, y: number): [number, number] {
  const len = Math.sqrt(x * x + y * y);
  if (len === 0) return [0, 0];
  return [x / len, y / len];
}

export function angle(x: number, y: number): number {
  return Math.atan2(y, x);
}
