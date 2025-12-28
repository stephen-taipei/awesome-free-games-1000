/**
 * Math Utilities - Ultimate Puzzle
 * Ultimate / Prismatic / Rainbow Theme
 * Game #150 (Milestone!)
 */

export type Vec2 = [number, number];
export type Vec3 = [number, number, number];
export type Vec4 = [number, number, number, number];

export const ULTIMATE_COLORS = {
  // Rainbow spectrum
  rainbowRed: [1.0, 0.27, 0.27, 1.0] as const,
  rainbowOrange: [1.0, 0.60, 0.25, 1.0] as const,
  rainbowYellow: [0.99, 0.85, 0.28, 1.0] as const,
  rainbowGreen: [0.18, 0.80, 0.44, 1.0] as const,
  rainbowCyan: [0.0, 0.81, 0.82, 1.0] as const,
  rainbowBlue: [0.20, 0.51, 0.88, 1.0] as const,
  rainbowPurple: [0.61, 0.35, 0.71, 1.0] as const,
  rainbowPink: [0.91, 0.36, 0.57, 1.0] as const,

  // Prismatic effects
  prismaticWhite: [1.0, 1.0, 1.0, 1.0] as const,
  prismaticGold: [1.0, 0.84, 0.0, 1.0] as const,
  prismaticSilver: [0.75, 0.75, 0.78, 1.0] as const,

  // Phase colors
  colorPhase: [0.91, 0.30, 0.24, 1.0] as const,
  pathPhase: [0.0, 0.72, 0.58, 1.0] as const,
  sortPhase: [0.42, 0.36, 0.91, 1.0] as const,

  // Background
  cosmicDark: [0.12, 0.15, 0.21, 1.0] as const,
  cosmicDeep: [0.18, 0.20, 0.31, 1.0] as const,

  // Particles
  sparkCore: [1.0, 1.0, 1.0, 1.0] as const,
  sparkGlow: [1.0, 0.95, 0.75, 0.8] as const,
} as const;

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function lerpVec4(a: Readonly<Vec4>, b: Readonly<Vec4>, t: number): Vec4 {
  return [
    lerp(a[0], b[0], t),
    lerp(a[1], b[1], t),
    lerp(a[2], b[2], t),
    lerp(a[3], b[3], t),
  ];
}

export function hslToRgb(h: number, s: number, l: number): Vec3 {
  let r: number, g: number, b: number;

  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  return [r, g, b];
}

export function rainbowColor(t: number): Vec4 {
  const [r, g, b] = hslToRgb(t, 0.85, 0.6);
  return [r, g, b, 1.0];
}

export function randomRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function normalize(v: Vec2): Vec2 {
  const len = Math.sqrt(v[0] * v[0] + v[1] * v[1]);
  if (len === 0) return [0, 0];
  return [v[0] / len, v[1] / len];
}
