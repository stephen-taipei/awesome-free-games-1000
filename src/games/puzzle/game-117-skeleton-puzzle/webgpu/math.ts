/**
 * Math Utilities - Skeleton Puzzle
 * Archaeology / Museum Theme
 * Game #117
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

// Dust settling motion
export function dustSettle(t: number): number {
  return Math.exp(-t * 2) * Math.cos(t * 5);
}

// Bone shimmer
export function boneShimmer(x: number, y: number, time: number): number {
  return Math.sin(x * 0.1 + time) * Math.cos(y * 0.1 + time * 0.7) * 0.5 + 0.5;
}

// Excavation burst
export function excavationBurst(t: number): number {
  if (t < 0.2) return t / 0.2;
  return Math.pow(1 - (t - 0.2) / 0.8, 2);
}

// Discovery glow
export function discoveryGlow(t: number): number {
  const pulse = Math.sin(t * 10) * 0.3 + 0.7;
  return pulse * Math.max(0, 1 - t);
}

// Ancient pattern
export function ancientPattern(x: number, y: number): number {
  const n1 = noise2D(x * 0.05, y * 0.05);
  const n2 = noise2D(x * 0.1, y * 0.1);
  return n1 * 0.6 + n2 * 0.4;
}

// Stone texture
export function stoneTexture(x: number, y: number): number {
  const grain = noise2D(x * 0.2, y * 0.2);
  const crack = Math.abs(Math.sin(x * 0.03 + grain * 2) * Math.cos(y * 0.03 + grain));
  return grain * 0.7 + crack * 0.3;
}

// Museum spotlight
export function spotlightIntensity(x: number, y: number, spotX: number, spotY: number, radius: number): number {
  const dist = Math.sqrt((x - spotX) ** 2 + (y - spotY) ** 2);
  return Math.max(0, 1 - dist / radius);
}

// Floating dust path
export function dustPath(t: number, seed: number): { x: number; y: number } {
  const angle = t * 2 + seed * Math.PI * 2;
  const radius = 20 + Math.sin(t * 3 + seed) * 10;
  return {
    x: Math.cos(angle) * radius,
    y: Math.sin(angle * 0.7) * radius * 0.5 - t * 30,
  };
}

// Bone age patina
export function bonePatina(x: number, y: number): number {
  const base = noise2D(x * 0.1, y * 0.1);
  const detail = noise2D(x * 0.3, y * 0.3);
  return base * 0.8 + detail * 0.2;
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

// Ease in out quad
export function easeInOutQuad(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

// Distance between two points
export function distance(x1: number, y1: number, x2: number, y2: number): number {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

// Angle between two points
export function angle(x1: number, y1: number, x2: number, y2: number): number {
  return Math.atan2(y2 - y1, x2 - x1);
}

// Amber glow intensity
export function amberGlow(time: number): number {
  return 0.8 + Math.sin(time * 0.5) * 0.1 + Math.sin(time * 1.3) * 0.05;
}

// Crack pattern
export function crackPattern(x: number, y: number): number {
  const nx = Math.floor(x / 50);
  const ny = Math.floor(y / 50);
  const seed = nx * 127 + ny * 311;
  return seededRandom(seed);
}
