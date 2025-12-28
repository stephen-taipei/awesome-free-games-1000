/**
 * Math Utilities - Flip Puzzle
 * Binary / Toggle / Neon Tiles Theme
 * Game #097
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

export function easeOutBack(t: number): number {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export function binaryPattern(x: number, y: number, time: number): number {
  const bx = Math.floor(x * 8) % 2;
  const by = Math.floor(y * 8 + time) % 2;
  return bx ^ by;
}

export function tileGlow(x: number, y: number, cx: number, cy: number, radius: number): number {
  const dx = x - cx;
  const dy = y - cy;
  const dist = Math.sqrt(dx * dx + dy * dy);
  return smoothstep(radius, 0, dist);
}

export function flipAnimation(t: number): { scaleX: number; brightness: number } {
  // Flip effect: scale X goes from 1 -> 0 -> 1
  const scaleX = Math.abs(Math.cos(t * Math.PI));
  const brightness = 1 + Math.sin(t * Math.PI) * 0.5;
  return { scaleX, brightness };
}

export function pulseWave(time: number, frequency: number = 1): number {
  return (Math.sin(time * frequency * Math.PI * 2) * 0.5 + 0.5);
}

export function getOnColor(): [number, number, number] {
  return [0.306, 0.800, 0.639]; // #4ecca3 (teal/green)
}

export function getOffColor(): [number, number, number] {
  return [0.157, 0.204, 0.376]; // #283760 (dark blue)
}

export function getAccentColor(): [number, number, number] {
  return [0.910, 0.451, 0.451]; // #e87373 (coral)
}

export function getPrimaryGlow(): [number, number, number] {
  return [0.0, 0.831, 1.0]; // #00d4ff (cyan)
}

export function randomInRange(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

export function randomAngle(): number {
  return Math.random() * Math.PI * 2;
}

export function polarToCartesian(angle: number, radius: number): [number, number] {
  return [Math.cos(angle) * radius, Math.sin(angle) * radius];
}

export function gridIndex(row: number, col: number, size: number): number {
  return row * size + col;
}
