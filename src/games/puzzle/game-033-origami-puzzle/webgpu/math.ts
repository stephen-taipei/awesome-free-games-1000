/**
 * Math Utilities - Origami Puzzle
 * Japanese Washi Theme
 * Game #033
 */

export function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

export function random(min: number = 0, max: number = 1): number {
  return min + Math.random() * (max - min);
}

export function randomInt(min: number, max: number): number {
  return Math.floor(random(min, max + 1));
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

export function angle(x: number, y: number): number {
  return Math.atan2(y, x);
}
