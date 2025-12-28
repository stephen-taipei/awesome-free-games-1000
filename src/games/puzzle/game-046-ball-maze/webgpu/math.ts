/**
 * Math Utilities - Ball Maze
 * Classic Wooden Labyrinth / Vintage Tilting Maze Theme
 * Game #046
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

// Wood grain pattern intensity
export function woodGrain(x: number, y: number, scale: number = 10): number {
  const noise = Math.sin(x * scale) * Math.cos(y * scale * 0.5);
  return 0.5 + noise * 0.3;
}

// Metallic shine effect
export function metallicShine(angle: number, time: number): number {
  return Math.pow(Math.cos(angle - time * 0.5), 4);
}

// Smooth tilting easing
export function tiltEase(t: number): number {
  return t < 0.5
    ? 4 * t * t * t
    : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

// Ball rolling speed factor
export function rollFactor(velocity: number): number {
  return Math.min(1, Math.abs(velocity) / 8);
}
