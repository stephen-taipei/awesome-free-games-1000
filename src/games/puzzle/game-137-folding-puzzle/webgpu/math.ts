/**
 * Math Utilities - Folding Puzzle
 * Paper / Origami / Japanese Aesthetic Theme
 * Game #137
 */

export const ORIGAMI_COLORS = {
  // Paper colors
  paperCream: [1.0, 0.96, 0.90, 1.0] as const,
  paperPink: [1.0, 0.90, 0.90, 1.0] as const,
  paperBlue: [0.90, 0.95, 1.0, 1.0] as const,
  paperGreen: [0.90, 1.0, 0.90, 1.0] as const,
  paperLavender: [1.0, 0.94, 0.96, 1.0] as const,

  // Fold and crease
  foldLine: [0.91, 0.30, 0.24, 1.0] as const,
  crease: [0.85, 0.80, 0.75, 1.0] as const,
  shadow: [0.2, 0.15, 0.10, 0.5] as const,

  // Japanese aesthetics
  sakuraPink: [1.0, 0.75, 0.80, 1.0] as const,
  bambooGreen: [0.45, 0.65, 0.35, 1.0] as const,
  inkBlack: [0.15, 0.12, 0.10, 1.0] as const,
  washi: [0.95, 0.92, 0.88, 1.0] as const,

  // Effects
  glowWhite: [1.0, 1.0, 1.0, 0.8] as const,
  dustGold: [0.95, 0.85, 0.60, 1.0] as const,
} as const;

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function lerpColor(
  a: readonly number[],
  b: readonly number[],
  t: number
): [number, number, number, number] {
  return [
    lerp(a[0], b[0], t),
    lerp(a[1], b[1], t),
    lerp(a[2], b[2], t),
    lerp(a[3] ?? 1, b[3] ?? 1, t),
  ];
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

export function random(seed: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

export function noise2D(x: number, y: number): number {
  const i = Math.floor(x);
  const j = Math.floor(y);
  const fx = x - i;
  const fy = y - j;

  const a = random(i + j * 57);
  const b = random(i + 1 + j * 57);
  const c = random(i + (j + 1) * 57);
  const d = random(i + 1 + (j + 1) * 57);

  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);

  return lerp(lerp(a, b, ux), lerp(c, d, ux), uy);
}
