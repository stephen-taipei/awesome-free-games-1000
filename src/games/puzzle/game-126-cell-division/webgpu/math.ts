/**
 * WebGPU Math Utilities - Cell Division
 * Biology / Microbiology Theme
 * Game #126
 */

export const COLORS = {
  // Microscope field
  fieldDark: [0.02, 0.05, 0.03],
  fieldMedium: [0.03, 0.08, 0.05],
  fieldLight: [0.05, 0.12, 0.08],

  // Player cells (green)
  playerCore: [0.2, 0.8, 0.3],
  playerMembrane: [0.3, 0.9, 0.4],
  playerGlow: [0.4, 1.0, 0.5],

  // Enemy cells (red/pink)
  enemyCore: [0.9, 0.2, 0.3],
  enemyMembrane: [1.0, 0.3, 0.4],
  enemyGlow: [1.0, 0.4, 0.5],

  // Neutral/empty cells
  emptyCore: [0.3, 0.4, 0.5],
  emptyMembrane: [0.4, 0.5, 0.6],

  // Energy (yellow/gold)
  energyCore: [1.0, 0.9, 0.2],
  energyGlow: [1.0, 1.0, 0.5],

  // Mitosis (cyan/teal)
  mitosisCore: [0.2, 0.9, 0.9],
  mitosisTrail: [0.4, 1.0, 1.0],

  // Nucleus (purple)
  nucleusCore: [0.6, 0.3, 0.9],
  nucleusGlow: [0.7, 0.4, 1.0],

  // Organelles
  organelleA: [0.9, 0.6, 0.2],
  organelleB: [0.3, 0.7, 0.9],
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

export function easeInOutQuad(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
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
