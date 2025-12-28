/**
 * Math Utilities - Stack Puzzle
 * Building Construction / Skyscraper Theme
 * Game #045
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

// Building sway for skyscrapers
export function buildingSway(height: number, time: number): number {
  return Math.sin(time * 0.5 + height * 0.01) * height * 0.001;
}

// Bounce effect for block landing
export function bounce(t: number, bounces: number = 3): number {
  const decay = Math.pow(0.5, bounces * t);
  return Math.abs(Math.sin(t * Math.PI * bounces)) * decay;
}
