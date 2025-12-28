/**
 * Math Utilities - Temperature Balance
 * Thermal / Fire & Ice Theme
 * Game #113
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

// Fire flicker effect
export function fireFlicker(time: number, seed: number): number {
  return 0.7 + 0.3 * Math.sin(time * 8 + seed * 5) * Math.sin(time * 12 + seed * 3);
}

// Ice crystallization pattern
export function icePattern(x: number, y: number, time: number): number {
  const angle = Math.atan2(y, x);
  const dist = Math.sqrt(x * x + y * y);
  return Math.sin(angle * 6 + time) * Math.sin(dist * 10 - time * 2);
}

// Heat wave distortion
export function heatWave(y: number, time: number): number {
  return Math.sin(y * 0.1 + time * 3) * 2;
}

// Temperature to color ratio (0 = cold blue, 1 = hot red)
export function tempToRatio(temp: number): number {
  return Math.max(0, Math.min(1, temp / 100));
}

// Steam rise pattern
export function steamRise(time: number, x: number): number {
  return Math.sin(time * 2 + x * 0.5) * 0.5 + 0.5;
}

// Frost spread pattern
export function frostSpread(t: number, angle: number): number {
  return Math.pow(t, 0.5) * (1 + 0.3 * Math.sin(angle * 6));
}

// Ember float path
export function emberPath(time: number, seed: number): { x: number; y: number } {
  const t = time + seed * 10;
  return {
    x: Math.sin(t * 1.5) * 20 + Math.sin(t * 2.3) * 10,
    y: -t * 30 + Math.sin(t * 3) * 5,
  };
}

// Heat transfer flow
export function heatFlow(fromTemp: number, toTemp: number, t: number): number {
  const diff = fromTemp - toTemp;
  return diff * t * 0.1;
}

// Convection current
export function convectionCurrent(y: number, temp: number, time: number): number {
  const speed = temp / 50;
  return Math.sin(y * 0.05 + time * speed) * temp * 0.02;
}

// Linear interpolation
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

// Clamp value
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

// Ease in-out quad
export function easeInOutQuad(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

// Distance between two points
export function distance(x1: number, y1: number, x2: number, y2: number): number {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

// Temperature color interpolation
export function tempColor(temp: number): { r: number; g: number; b: number } {
  const ratio = clamp(temp / 100, 0, 1);
  return {
    r: lerp(0.2, 1.0, ratio),
    g: lerp(0.4, 0.3, Math.abs(ratio - 0.5) * 2),
    b: lerp(1.0, 0.2, ratio),
  };
}

// Thermal gradient noise
export function thermalNoise(x: number, y: number, time: number): number {
  return noise2D(x * 0.02 + time * 0.5, y * 0.02) * 0.5 +
         noise2D(x * 0.05 + time, y * 0.05 + time * 0.3) * 0.3;
}
