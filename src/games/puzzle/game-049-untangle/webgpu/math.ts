/**
 * Math Utilities - Untangle
 * Constellation / Star Map Theme
 * Game #049
 */

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function randomRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

// Star twinkle effect
export function twinkle(time: number, seed: number, frequency: number = 2): number {
  return (Math.sin(time * frequency + seed * 10) * 0.5 + 0.5) *
         (Math.sin(time * frequency * 1.7 + seed * 7) * 0.3 + 0.7);
}

// Stellar pulse - for active nodes
export function stellarPulse(time: number, speed: number = 3): number {
  return Math.sin(time * speed) * 0.5 + 0.5;
}

// Nebula flow pattern
export function nebulaFlow(x: number, y: number, time: number): number {
  const flow1 = Math.sin(x * 3 + time) * Math.cos(y * 2 - time * 0.7);
  const flow2 = Math.sin(x * 2 - y * 3 + time * 0.5);
  return (flow1 + flow2) * 0.5 + 0.5;
}

// Star connection glow
export function connectionGlow(t: number): number {
  return Math.exp(-t * 3) * Math.sin(t * Math.PI * 2);
}

// Smooth step for transitions
export function smoothStep(edge0: number, edge1: number, x: number): number {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

// Distance between two points
export function distance(x1: number, y1: number, x2: number, y2: number): number {
  return Math.hypot(x2 - x1, y2 - y1);
}

// Angle between two points
export function angle(x1: number, y1: number, x2: number, y2: number): number {
  return Math.atan2(y2 - y1, x2 - x1);
}
