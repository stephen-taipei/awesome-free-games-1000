/**
 * Math Utilities - Lego Build
 * Colorful Toys / Construction / Playful Blocks Theme
 * Game #142
 */

export const LEGO_COLORS = {
  deepBlue: [0.10, 0.15, 0.30, 1.0] as const,
  brightRed: [0.90, 0.20, 0.15, 1.0] as const,
  brightYellow: [1.0, 0.85, 0.15, 1.0] as const,
  brightGreen: [0.20, 0.75, 0.30, 1.0] as const,
  brightBlue: [0.15, 0.55, 0.95, 1.0] as const,
  brightOrange: [1.0, 0.55, 0.10, 1.0] as const,
  plasticWhite: [0.95, 0.95, 0.95, 1.0] as const,
  plasticBlack: [0.15, 0.15, 0.18, 1.0] as const,
  studShine: [1.0, 1.0, 1.0, 0.8] as const,
  sparkle: [1.0, 0.95, 0.80, 1.0] as const,
  snapGlow: [0.95, 0.95, 0.60, 1.0] as const,
  successGreen: [0.30, 0.85, 0.45, 1.0] as const,
} as const;

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

export function randomRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
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

export function easeOutElastic(t: number): number {
  const c4 = (2 * Math.PI) / 3;
  return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
}

export function easeOutBack(t: number): number {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

export function vec2Length(x: number, y: number): number {
  return Math.sqrt(x * x + y * y);
}

export function vec2Normalize(x: number, y: number): [number, number] {
  const len = vec2Length(x, y);
  if (len === 0) return [0, 0];
  return [x / len, y / len];
}

export function getLegoColor(index: number): readonly [number, number, number, number] {
  const colors = [
    LEGO_COLORS.brightRed,
    LEGO_COLORS.brightYellow,
    LEGO_COLORS.brightGreen,
    LEGO_COLORS.brightBlue,
    LEGO_COLORS.brightOrange,
  ];
  return colors[index % colors.length];
}

export function createRotationMatrix(angle: number): Float32Array {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return new Float32Array([cos, -sin, sin, cos]);
}
