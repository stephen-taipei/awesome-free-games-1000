/**
 * Pong WebGPU Math Utilities
 * Game #171 - Retro Arcade Theme
 */

export const PONG_COLORS = {
  // Background
  bgBlack: [0.0, 0.0, 0.0, 1.0],
  bgDark: [0.05, 0.05, 0.08, 1.0],

  // Player (green)
  playerGreen: [0.15, 0.68, 0.38, 1.0],
  playerBright: [0.3, 0.9, 0.5, 1.0],

  // CPU (red)
  cpuRed: [0.75, 0.22, 0.17, 1.0],
  cpuBright: [1.0, 0.4, 0.35, 1.0],

  // Ball
  ballWhite: [1.0, 1.0, 1.0, 1.0],
  ballGlow: [0.9, 0.95, 1.0, 1.0],

  // Accents
  neonCyan: [0.0, 1.0, 1.0, 1.0],
  neonMagenta: [1.0, 0.0, 1.0, 1.0],
  neonYellow: [1.0, 1.0, 0.0, 1.0],

  // Effects
  scanline: [0.1, 0.1, 0.12, 0.3],
  crtGlow: [0.2, 0.3, 0.4, 0.1],
};

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function lerpColor(
  c1: number[],
  c2: number[],
  t: number
): [number, number, number, number] {
  return [
    lerp(c1[0], c2[0], t),
    lerp(c1[1], c2[1], t),
    lerp(c1[2], c2[2], t),
    lerp(c1[3], c2[3], t),
  ];
}

export function randomInRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

export function randomColor(colors: number[][]): number[] {
  return colors[Math.floor(Math.random() * colors.length)];
}

export function easeOutQuad(t: number): number {
  return t * (2 - t);
}

export function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export function easeInOutSine(t: number): number {
  return -(Math.cos(Math.PI * t) - 1) / 2;
}
