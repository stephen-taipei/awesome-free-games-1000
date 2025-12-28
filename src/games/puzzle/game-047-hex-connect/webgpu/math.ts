/**
 * Math Utilities - Hex Connect
 * Crystal Honeycomb / Prismatic Gem Theme
 * Game #047
 */

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function randomRange(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

export function distance(x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}

export function normalize(x: number, y: number): [number, number] {
  const len = Math.sqrt(x * x + y * y);
  if (len === 0) return [0, 0];
  return [x / len, y / len];
}

// Hexagonal angle for a given side (0-5)
export function hexAngle(side: number): number {
  return (Math.PI / 3) * side - Math.PI / 6;
}

// Prismatic color shift
export function prismaticShift(hue: number, time: number): number {
  return (hue + time * 0.1) % 1;
}

// Crystal facet reflection
export function crystalReflect(angle: number, time: number): number {
  return Math.pow(Math.abs(Math.cos(angle * 3 + time)), 2);
}

// Smooth rotation easing
export function rotateEase(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}
