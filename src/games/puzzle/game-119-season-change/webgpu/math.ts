/**
 * Math Utilities - Season Change
 * Nature / Seasons Theme
 * Game #119
 */

// Simple seeded random
export function seededRandom(seed: number): number {
  const x = Math.sin(seed * 12.9898 + seed * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

// Smooth noise function
export function noise2D(x: number, y: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;

  const smoothFx = fx * fx * (3 - 2 * fx);
  const smoothFy = fy * fy * (3 - 2 * fy);

  const n00 = seededRandom(ix + iy * 57);
  const n10 = seededRandom(ix + 1 + iy * 57);
  const n01 = seededRandom(ix + (iy + 1) * 57);
  const n11 = seededRandom(ix + 1 + (iy + 1) * 57);

  const nx0 = n00 * (1 - smoothFx) + n10 * smoothFx;
  const nx1 = n01 * (1 - smoothFx) + n11 * smoothFx;

  return nx0 * (1 - smoothFy) + nx1 * smoothFy;
}

// Petal fall motion
export function petalFall(t: number, seed: number): { x: number; y: number } {
  const swayAmount = 0.3 + seededRandom(seed) * 0.4;
  return {
    x: Math.sin(t * 2 + seed * 10) * swayAmount,
    y: t * 0.5 + Math.sin(t * 3 + seed) * 0.1,
  };
}

// Leaf spiral fall
export function leafSpiral(t: number, seed: number): { x: number; y: number; rotation: number } {
  const spiralSpeed = 1.5 + seededRandom(seed) * 0.5;
  return {
    x: Math.sin(t * spiralSpeed) * 0.5,
    y: t * 0.4,
    rotation: t * 3 + seed * Math.PI * 2,
  };
}

// Snowflake drift
export function snowflakeDrift(t: number, seed: number): { x: number; y: number } {
  const driftSpeed = 0.5 + seededRandom(seed) * 0.3;
  return {
    x: Math.sin(t * driftSpeed + seed * 5) * 0.3 + Math.cos(t * 0.7 + seed) * 0.1,
    y: t * 0.3,
  };
}

// Sun ray shimmer
export function sunShimmer(t: number): number {
  return Math.sin(t * 4) * 0.3 + 0.7 + Math.sin(t * 7) * 0.1;
}

// Season transition wave
export function seasonWave(t: number): number {
  return Math.sin(t * 2) * 0.5 + 0.5;
}

// Wind gust
export function windGust(t: number, strength: number): number {
  return Math.sin(t * 3) * strength + Math.sin(t * 7) * strength * 0.3;
}

// Color blend for season transitions
export function seasonColorBlend(from: number[], to: number[], t: number): number[] {
  return from.map((c, i) => c + (to[i] - c) * t);
}

// Linear interpolation
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

// Clamp value
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

// Ease out cubic
export function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

// Ease in out sine
export function easeInOutSine(t: number): number {
  return -(Math.cos(Math.PI * t) - 1) / 2;
}

// Distance between two points
export function distance(x1: number, y1: number, x2: number, y2: number): number {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

// Angle between two points
export function angle(x1: number, y1: number, x2: number, y2: number): number {
  return Math.atan2(y2 - y1, x2 - x1);
}

// Nature spiral (fibonacci-like)
export function natureSpiral(t: number): { x: number; y: number } {
  const golden = 1.618033988749895;
  const angle = t * golden * Math.PI * 2;
  const radius = Math.sqrt(t) * 0.5;
  return {
    x: Math.cos(angle) * radius,
    y: Math.sin(angle) * radius,
  };
}

// Season color palette
export const SEASON_COLORS = {
  spring: { primary: [0.96, 0.76, 0.86], secondary: [0.56, 0.93, 0.56] },
  summer: { primary: [1.0, 0.92, 0.3], secondary: [0.13, 0.55, 0.13] },
  autumn: { primary: [1.0, 0.55, 0.0], secondary: [0.8, 0.52, 0.25] },
  winter: { primary: [0.94, 0.97, 1.0], secondary: [0.69, 0.77, 0.87] },
};
