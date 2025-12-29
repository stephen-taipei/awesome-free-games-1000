/**
 * Math Utilities - Spider Web
 * Spider / Night Theme
 * Game #112
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

// Catenary curve for web strands
export function catenaryCurve(t: number, sag: number): number {
  return sag * (Math.cosh((t - 0.5) * 2) - 1);
}

// Web strand vibration
export function webVibration(t: number, time: number, freq: number = 3): number {
  const decay = Math.exp(-time * 2);
  return Math.sin(t * Math.PI) * Math.sin(time * freq * Math.PI * 2) * decay * 0.05;
}

// Dewdrop shimmer
export function dewdropShimmer(time: number, seed: number): number {
  return 0.6 + 0.4 * Math.sin(time * 2 + seed * 10);
}

// Spider leg movement
export function spiderLegPhase(legIndex: number, time: number): number {
  const phase = legIndex * Math.PI / 4;
  return Math.sin(time * 3 + phase) * 0.2;
}

// Moonlight flicker
export function moonlightFlicker(time: number): number {
  return 0.9 + 0.1 * Math.sin(time * 0.5);
}

// Web tension calculation
export function webTension(distance: number, maxDistance: number): number {
  const normalized = distance / maxDistance;
  return Math.pow(1 - normalized, 2);
}

// Silk strand wave
export function silkWave(position: number, time: number): number {
  return Math.sin(position * 10 + time * 4) * 0.003;
}

// Night sky star twinkle
export function starTwinkle(seed: number, time: number): number {
  const phase = seededRandom(seed) * Math.PI * 2;
  const speed = 1 + seededRandom(seed + 1) * 2;
  return 0.3 + 0.7 * Math.pow(Math.sin(time * speed + phase) * 0.5 + 0.5, 2);
}

// Spiral web pattern
export function webSpiralAngle(ringIndex: number, time: number): number {
  return ringIndex * 0.15 + time * 0.1;
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

// Convert polar to cartesian
export function polarToCartesian(angle: number, radius: number): { x: number; y: number } {
  return {
    x: Math.cos(angle) * radius,
    y: Math.sin(angle) * radius,
  };
}

// Web strand elastic bounce
export function elasticBounce(t: number): number {
  const c4 = (2 * Math.PI) / 3;
  return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
}
