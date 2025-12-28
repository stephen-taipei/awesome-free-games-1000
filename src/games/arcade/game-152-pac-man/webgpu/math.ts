/**
 * Math Utilities - Pac-Man
 * Retro Arcade / Neon Yellow / Classic Theme
 * Game #152
 */

export const PACMAN_COLORS = {
  // Pac-Man colors
  pacmanYellow: [0.99, 0.80, 0.43, 1.0] as const,
  pacmanGlow: [1.0, 0.85, 0.0, 0.7] as const,

  // Dot colors
  dotYellow: [0.95, 0.61, 0.07, 1.0] as const,
  dotGlow: [1.0, 0.75, 0.2, 0.6] as const,

  // Power pellet
  powerBlue: [0.2, 0.6, 0.9, 1.0] as const,
  powerGlow: [0.4, 0.8, 1.0, 0.7] as const,

  // Ghost colors
  ghostRed: [0.91, 0.30, 0.24, 1.0] as const,
  ghostPink: [0.91, 0.12, 0.39, 1.0] as const,
  ghostCyan: [0.0, 0.74, 0.83, 1.0] as const,
  ghostOrange: [1.0, 0.60, 0.0, 1.0] as const,
  ghostScared: [0.20, 0.60, 0.86, 1.0] as const,

  // Maze colors
  mazeBlue: [0.04, 0.52, 0.89, 1.0] as const,
  mazeGlow: [0.1, 0.6, 1.0, 0.5] as const,

  // Background
  bgBlack: [0.0, 0.0, 0.0, 1.0] as const,
  bgDark: [0.05, 0.05, 0.08, 1.0] as const,

  // Effects
  sparkYellow: [1.0, 0.9, 0.3, 1.0] as const,
  sparkWhite: [1.0, 1.0, 1.0, 1.0] as const,
  trailGlow: [1.0, 0.8, 0.2, 0.4] as const,
} as const;

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function randomRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

export function randomColor(colors: readonly (readonly number[])[]): readonly number[] {
  return colors[Math.floor(Math.random() * colors.length)];
}

export function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export function easeOutQuad(t: number): number {
  return 1 - (1 - t) * (1 - t);
}

export function easeInOutQuad(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

export function ghostColorByIndex(index: number): readonly number[] {
  const colors = [
    PACMAN_COLORS.ghostRed,
    PACMAN_COLORS.ghostPink,
    PACMAN_COLORS.ghostCyan,
    PACMAN_COLORS.ghostOrange,
  ];
  return colors[index % colors.length];
}

export function pulseValue(time: number, speed: number = 1, min: number = 0.5, max: number = 1): number {
  return lerp(min, max, (Math.sin(time * speed) + 1) / 2);
}
