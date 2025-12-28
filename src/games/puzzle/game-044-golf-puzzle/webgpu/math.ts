/**
 * Math Utilities - Golf Puzzle
 * Lush Golf Course / Country Club Theme
 * Game #044
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

// Wind sway calculation for grass/trees
export function windSway(x: number, time: number, frequency: number, amplitude: number): number {
  return Math.sin(x * frequency + time) * amplitude;
}

// Smooth curve for arcs
export function easeOutQuad(t: number): number {
  return t * (2 - t);
}

// Ball trajectory curve
export function parabola(t: number, height: number): number {
  return 4 * height * t * (1 - t);
}
