/**
 * Puzzle Fighter WebGPU Math Utilities
 * Game #172 - VS Battle Arena Theme
 */

export const PUZZLE_COLORS = {
  // Block colors
  red: [0.91, 0.30, 0.24],
  blue: [0.20, 0.60, 0.86],
  green: [0.18, 0.80, 0.44],
  yellow: [0.95, 0.77, 0.06],

  // Battle theme
  arenaFloor: [0.10, 0.10, 0.18],
  arenaDark: [0.06, 0.06, 0.12],
  energy: [0.80, 0.20, 0.90],
  spark: [1.0, 0.95, 0.40],

  // Player/CPU
  playerAura: [0.20, 0.60, 0.86],
  cpuAura: [0.91, 0.30, 0.24],

  // Effects
  combo: [1.0, 0.50, 0.0],
  garbage: [0.50, 0.55, 0.60],
  victory: [1.0, 0.84, 0.0],
  defeat: [0.30, 0.30, 0.40],
};

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

export function easeOutQuad(t: number): number {
  return 1 - (1 - t) * (1 - t);
}

export function easeOutElastic(t: number): number {
  const c4 = (2 * Math.PI) / 3;
  return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
}

export function easeOutBack(t: number): number {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

export function randomInRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

export function randomColor(): number[] {
  const colors = [PUZZLE_COLORS.red, PUZZLE_COLORS.blue, PUZZLE_COLORS.green, PUZZLE_COLORS.yellow];
  return colors[Math.floor(Math.random() * colors.length)];
}
