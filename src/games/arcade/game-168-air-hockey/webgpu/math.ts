/**
 * WebGPU Math Utilities - Air Hockey
 * Arcade / Air Hockey / Blue and Red Neon Theme
 * Game #168
 */

export const HOCKEY_COLORS = {
  // Table colors
  tableBlue: [0.12, 0.37, 0.54, 1.0],
  tableDark: [0.05, 0.12, 0.2, 1.0],
  tableLines: [1.0, 1.0, 1.0, 0.3],

  // Player colors
  playerBlue: [0.2, 0.6, 0.86, 1.0],
  playerGlow: [0.4, 0.7, 1.0, 1.0],

  // CPU colors
  cpuRed: [0.9, 0.3, 0.24, 1.0],
  cpuGlow: [1.0, 0.4, 0.3, 1.0],

  // Puck colors
  puckDark: [0.17, 0.24, 0.31, 1.0],
  puckGlow: [0.3, 0.35, 0.4, 1.0],

  // Effect colors
  hitSpark: [1.0, 1.0, 1.0, 1.0],
  goalGold: [1.0, 0.85, 0.2, 1.0],
  wallSpark: [0.6, 0.8, 1.0, 1.0],
  trailCyan: [0.4, 0.9, 1.0, 0.6],

  // Neon accent
  neonPink: [1.0, 0.2, 0.6, 1.0],
  neonCyan: [0.2, 1.0, 0.9, 1.0],
  neonPurple: [0.6, 0.2, 1.0, 1.0],

  // Confetti
  confettiBlue: [0.2, 0.6, 0.86, 1.0],
  confettiRed: [0.9, 0.3, 0.24, 1.0],
  confettiGold: [1.0, 0.85, 0.2, 1.0],
  confettiWhite: [1.0, 1.0, 1.0, 1.0],
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

export function randomRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function easeOutQuad(t: number): number {
  return 1 - (1 - t) * (1 - t);
}

export function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export function easeOutElastic(t: number): number {
  const c4 = (2 * Math.PI) / 3;
  return t === 0
    ? 0
    : t === 1
    ? 1
    : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
}

export function vec2Length(x: number, y: number): number {
  return Math.sqrt(x * x + y * y);
}

export function normalize2D(x: number, y: number): [number, number] {
  const len = vec2Length(x, y);
  if (len === 0) return [0, 0];
  return [x / len, y / len];
}

export function getPlayerHitColor(): number[] {
  return Math.random() > 0.5
    ? HOCKEY_COLORS.playerGlow
    : HOCKEY_COLORS.neonCyan;
}

export function getCpuHitColor(): number[] {
  return Math.random() > 0.5
    ? HOCKEY_COLORS.cpuGlow
    : HOCKEY_COLORS.neonPink;
}

export function getRandomConfettiColor(): number[] {
  const colors = [
    HOCKEY_COLORS.confettiBlue,
    HOCKEY_COLORS.confettiRed,
    HOCKEY_COLORS.confettiGold,
    HOCKEY_COLORS.confettiWhite,
    HOCKEY_COLORS.neonCyan,
    HOCKEY_COLORS.neonPink,
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

export function getSparkColor(): number[] {
  const colors = [
    HOCKEY_COLORS.hitSpark,
    HOCKEY_COLORS.neonCyan,
    HOCKEY_COLORS.neonPink,
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}
