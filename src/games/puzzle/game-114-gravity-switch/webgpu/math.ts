/**
 * Math Utilities - Gravity Switch
 * Space / Cosmic Theme
 * Game #114
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

// Gravity field distortion
export function gravityField(x: number, y: number, cx: number, cy: number, strength: number): { fx: number; fy: number } {
  const dx = cx - x;
  const dy = cy - y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const force = strength / (dist * dist + 1);
  return {
    fx: (dx / dist) * force || 0,
    fy: (dy / dist) * force || 0,
  };
}

// Direction to angle
export function directionToAngle(direction: string): number {
  switch (direction) {
    case 'up': return -Math.PI / 2;
    case 'down': return Math.PI / 2;
    case 'left': return Math.PI;
    case 'right': return 0;
    default: return Math.PI / 2;
  }
}

// Warp tunnel effect
export function warpTunnel(t: number, time: number): number {
  return Math.sin(t * 10 + time * 5) * 0.1 + 0.9;
}

// Star twinkle
export function starTwinkle(seed: number, time: number): number {
  const phase = seededRandom(seed) * Math.PI * 2;
  const speed = 1 + seededRandom(seed + 1) * 2;
  return 0.3 + 0.7 * Math.pow(Math.sin(time * speed + phase) * 0.5 + 0.5, 2);
}

// Energy pulse
export function energyPulse(time: number, freq: number = 2): number {
  return 0.5 + 0.5 * Math.sin(time * freq * Math.PI);
}

// Spiral motion for particles
export function spiralMotion(t: number, radius: number, speed: number): { x: number; y: number } {
  const angle = t * speed;
  const r = radius * (1 - t * 0.5);
  return {
    x: Math.cos(angle) * r,
    y: Math.sin(angle) * r,
  };
}

// Portal vortex
export function portalVortex(angle: number, time: number): number {
  return Math.sin(angle * 6 + time * 3) * 0.2;
}

// Anti-gravity float effect
export function antigravFloat(time: number, seed: number): number {
  return Math.sin(time * 2 + seed) * 3;
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

// Cosmic color shift
export function cosmicColor(t: number): { r: number; g: number; b: number } {
  return {
    r: 0.0 + 0.3 * Math.sin(t),
    g: 0.5 + 0.3 * Math.sin(t + 2),
    b: 1.0 - 0.2 * Math.sin(t + 4),
  };
}

// Nebula cloud pattern
export function nebulaPattern(x: number, y: number, time: number): number {
  const n1 = noise2D(x * 0.02 + time * 0.1, y * 0.02);
  const n2 = noise2D(x * 0.05 - time * 0.05, y * 0.05 + time * 0.05);
  return n1 * 0.6 + n2 * 0.4;
}
