/**
 * WebGPU Math Utilities - Light Shadow
 * Light & Shadow / Mystery Theme
 * Game #123
 */

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

export function distance(x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}

// Light & Shadow color palette
export const COLORS = {
  // Light
  lightBright: [1.0, 1.0, 0.62],
  lightWarm: [1.0, 0.85, 0.40],
  lightSoft: [1.0, 0.95, 0.80],
  lightWhite: [1.0, 1.0, 1.0],

  // Shadow
  shadowDeep: [0.05, 0.05, 0.12],
  shadowMid: [0.10, 0.10, 0.18],
  shadowSoft: [0.15, 0.15, 0.25],

  // Glow effects
  glowYellow: [1.0, 0.95, 0.55],
  glowOrange: [1.0, 0.65, 0.30],
  glowPurple: [0.55, 0.35, 0.70],

  // Objects (purple theme)
  objectPurple: [0.56, 0.27, 0.68],
  objectPurpleLight: [0.61, 0.35, 0.71],

  // Environment
  bgDark: [0.10, 0.10, 0.18],
  wallDark: [0.18, 0.18, 0.27],

  // Particles
  spark: [1.0, 0.92, 0.55],
  beam: [1.0, 1.0, 0.80],
  dust: [0.60, 0.55, 0.45],
  success: [0.18, 0.80, 0.44],
} as const;

export function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\\d]{2})([a-f\\d]{2})([a-f\\d]{2})$/i.exec(hex);
  if (result) {
    return [
      parseInt(result[1], 16) / 255,
      parseInt(result[2], 16) / 255,
      parseInt(result[3], 16) / 255,
    ];
  }
  return [1, 1, 1];
}

export function easeOutQuad(t: number): number {
  return 1 - (1 - t) * (1 - t);
}

export function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export function easeInOutSine(t: number): number {
  return -(Math.cos(Math.PI * t) - 1) / 2;
}

export function pulseWave(t: number, speed: number = 1): number {
  return (Math.sin(t * speed) + 1) / 2;
}
