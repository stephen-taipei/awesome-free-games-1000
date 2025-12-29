/**
 * Math Utilities - Domino Puzzle
 * Luxury Casino / Monte Carlo Theme
 * Game #051
 */

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function randomRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function smoothStep(edge0: number, edge1: number, x: number): number {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

// Velvet shimmer effect
export function velvetShimmer(time: number, x: number, y: number): number {
  const base = Math.sin(time * 0.5 + x * 5 + y * 3) * 0.5 + 0.5;
  const wave = Math.sin(time * 0.3 + x * 2 - y * 4) * 0.3;
  return clamp(base + wave, 0, 1);
}

// Gold sparkle pattern
export function goldSparkle(time: number, seed: number): number {
  const flash = Math.sin(time * 8 + seed * 20) * 0.5 + 0.5;
  return flash > 0.95 ? 1 : flash * 0.2;
}

// Ambient smoke drift
export function smokeDrift(time: number, offset: number): { x: number; y: number } {
  return {
    x: Math.sin(time * 0.3 + offset * 2) * 0.02,
    y: -0.01 + Math.sin(time * 0.5 + offset) * 0.005,
  };
}

// Casino light flicker
export function casinoFlicker(time: number, frequency: number = 5): number {
  const base = 0.8 + 0.2 * Math.sin(time * frequency);
  const random = Math.sin(time * 23.7) * 0.05;
  return clamp(base + random, 0, 1);
}

// Card fan animation
export function fanAngle(index: number, total: number, spread: number = 0.3): number {
  const center = (total - 1) / 2;
  return (index - center) * spread;
}

// Chip stack wobble
export function chipWobble(time: number, stackId: number): number {
  return Math.sin(time * 3 + stackId * 1.5) * 0.02;
}

// Luxury pulse glow
export function luxuryPulse(time: number, phase: number = 0): number {
  return 0.7 + 0.3 * Math.sin(time * 2 + phase);
}

// Match celebration burst
export function celebrationBurst(time: number, angle: number): { x: number; y: number } {
  const speed = 0.1 * (1 - time * 0.3);
  return {
    x: Math.cos(angle) * speed,
    y: Math.sin(angle) * speed - time * 0.02,
  };
}

// Distance calculation
export function distance(x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}

// Angle calculation
export function angle(x1: number, y1: number, x2: number, y2: number): number {
  return Math.atan2(y2 - y1, x2 - x1);
}

// Ease out expo
export function easeOutExpo(t: number): number {
  return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
}

// Ease in out cubic
export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

// Diamond pattern
export function diamondPattern(x: number, y: number, size: number): number {
  const dx = Math.abs((x % size) - size / 2);
  const dy = Math.abs((y % size) - size / 2);
  return (dx + dy) / size;
}
