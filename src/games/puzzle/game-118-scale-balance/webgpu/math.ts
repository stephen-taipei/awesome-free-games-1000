/**
 * Math Utilities - Scale Balance
 * Physics / Equilibrium Theme
 * Game #118
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

// Pendulum swing motion
export function pendulumSwing(angle: number, time: number, damping: number = 0.95): number {
  return angle * Math.cos(time * 3) * Math.pow(damping, time);
}

// Balance wave
export function balanceWave(t: number): number {
  return Math.sin(t * 4) * 0.5 * (1 - t) + 0.5;
}

// Weight drop impact
export function weightImpact(t: number): number {
  if (t < 0.1) return t / 0.1;
  return Math.pow(Math.cos((t - 0.1) * 8), 2) * Math.exp(-t * 5);
}

// Equilibrium pulse
export function equilibriumPulse(t: number): number {
  return Math.sin(t * 10) * 0.3 + 0.7;
}

// Metal shine
export function metalShine(x: number, y: number, time: number): number {
  const angle = Math.atan2(y - 0.5, x - 0.5);
  return Math.pow(Math.cos(angle + time * 0.5), 4) * 0.5;
}

// Brass texture
export function brassTexture(x: number, y: number): number {
  const n1 = noise2D(x * 0.2, y * 0.2);
  const n2 = noise2D(x * 0.5, y * 0.5);
  return n1 * 0.6 + n2 * 0.4;
}

// Tilt motion
export function tiltMotion(angle: number, t: number): number {
  const decay = Math.exp(-t * 2);
  return angle * decay * Math.cos(t * 6);
}

// Scale position
export function scalePosition(position: number, armLength: number): number {
  return position * (armLength / 3);
}

// Torque visualization
export function torqueVisualization(torque: number): number {
  return Math.min(1, Math.abs(torque) / 20);
}

// Linear interpolation
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

// Clamp value
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

// Ease out elastic
export function easeOutElastic(t: number): number {
  const c4 = (2 * Math.PI) / 3;
  if (t === 0) return 0;
  if (t === 1) return 1;
  return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
}

// Ease in out sine
export function easeInOutSine(t: number): number {
  return -(Math.cos(Math.PI * t) - 1) / 2;
}

// Distance between two points
export function distance(x1: number, y1: number, x2: number, y2: number): number {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

// Angle between two points
export function angle(x1: number, y1: number, x2: number, y2: number): number {
  return Math.atan2(y2 - y1, x2 - x1);
}

// Golden ratio patterns
export function goldenSpiral(t: number): { x: number; y: number } {
  const phi = 1.618033988749895;
  const angle = t * Math.PI * 2 * phi;
  const radius = Math.pow(phi, t / Math.PI);
  return {
    x: Math.cos(angle) * radius,
    y: Math.sin(angle) * radius,
  };
}

// Weight color intensity
export function weightIntensity(value: number, maxValue: number = 5): number {
  return clamp(value / maxValue, 0.3, 1);
}
