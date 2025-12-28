/**
 * Math Utilities - Stamp Puzzle
 * Arts & Crafts / Rubber Stamp Theme
 * Game #132
 */

export const STAMP_COLORS = {
  // Ink colors
  inkRed: [0.91, 0.30, 0.24, 1.0] as [number, number, number, number],
  inkBlue: [0.20, 0.60, 0.86, 1.0] as [number, number, number, number],
  inkPurple: [0.61, 0.35, 0.71, 1.0] as [number, number, number, number],
  inkGreen: [0.18, 0.80, 0.44, 1.0] as [number, number, number, number],

  // Paper and craft colors
  paperCream: [1.0, 0.93, 0.82, 1.0] as [number, number, number, number],
  paperWhite: [1.0, 0.98, 0.96, 1.0] as [number, number, number, number],
  woodBrown: [0.55, 0.35, 0.20, 1.0] as [number, number, number, number],
  goldAccent: [0.85, 0.65, 0.13, 1.0] as [number, number, number, number],

  // Special effects
  inkSplatter: [0.15, 0.15, 0.20, 0.8] as [number, number, number, number],
  sealRed: [0.80, 0.15, 0.15, 1.0] as [number, number, number, number],
};

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0);
  return t * t * (3.0 - 2.0 * t);
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

export function easeOutQuad(t: number): number {
  return 1 - (1 - t) * (1 - t);
}

export function easeInQuad(t: number): number {
  return t * t;
}

export function easeOutElastic(t: number): number {
  const c4 = (2 * Math.PI) / 3;
  return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
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

export function hexToRgba(hex: string, alpha: number = 1.0): [number, number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (result) {
    return [
      parseInt(result[1], 16) / 255,
      parseInt(result[2], 16) / 255,
      parseInt(result[3], 16) / 255,
      alpha
    ];
  }
  return [1.0, 1.0, 1.0, alpha];
}
