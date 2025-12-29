/**
 * Math Utilities - Billiard Puzzle
 * Pool Table / Classic Theme
 * Game #116
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

// Ball rolling motion
export function ballRoll(x: number, y: number, vx: number, vy: number, time: number): number {
  const speed = Math.sqrt(vx * vx + vy * vy);
  return Math.sin(time * speed * 0.5) * 0.5 + 0.5;
}

// Chalk dust spread
export function chalkSpread(t: number): number {
  return Math.pow(t, 0.3) * (1 - t);
}

// Collision impulse
export function collisionImpulse(t: number): number {
  if (t < 0.1) return t / 0.1;
  return Math.exp(-t * 10);
}

// Pocket swirl
export function pocketSwirl(angle: number, t: number): { x: number; y: number } {
  const spiralAngle = angle + t * 10;
  const radius = 15 * (1 - t);
  return {
    x: Math.cos(spiralAngle) * radius,
    y: Math.sin(spiralAngle) * radius,
  };
}

// Cue stick swing
export function cueSwing(t: number, power: number): number {
  if (t < 0.2) return t / 0.2 * power;
  if (t < 0.4) return power;
  return power * (1 - (t - 0.4) / 0.6);
}

// Ball trail fade
export function trailFade(t: number): number {
  return Math.pow(1 - t, 2);
}

// Felt texture pattern
export function feltPattern(x: number, y: number): number {
  const n1 = noise2D(x * 0.1, y * 0.1);
  const n2 = noise2D(x * 0.3, y * 0.3);
  return n1 * 0.7 + n2 * 0.3;
}

// Wood grain pattern
export function woodGrain(x: number, y: number): number {
  const angle = Math.atan2(y - 0.5, x - 0.5);
  const dist = Math.sqrt((x - 0.5) ** 2 + (y - 0.5) ** 2);
  return (Math.sin(dist * 50 + angle * 3) * 0.5 + 0.5) * 0.3;
}

// Ball shine
export function ballShine(angle: number, lightAngle: number): number {
  const diff = Math.abs(angle - lightAngle);
  return Math.pow(Math.cos(diff), 8);
}

// Pocket glow
export function pocketGlow(dist: number, time: number): number {
  const pulse = Math.sin(time * 3) * 0.2 + 0.8;
  return Math.max(0, 1 - dist / 30) * pulse * 0.5;
}

// Linear interpolation
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

// Clamp value
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

// Ease out quad
export function easeOutQuad(t: number): number {
  return 1 - (1 - t) * (1 - t);
}

// Ease in quad
export function easeInQuad(t: number): number {
  return t * t;
}

// Distance between two points
export function distance(x1: number, y1: number, x2: number, y2: number): number {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

// Angle between two points
export function angle(x1: number, y1: number, x2: number, y2: number): number {
  return Math.atan2(y2 - y1, x2 - x1);
}

// Bounce damping
export function bounceDamping(velocity: number, damping: number = 0.8): number {
  return velocity * damping;
}

// Power to color gradient
export function powerColor(power: number): { r: number; g: number; b: number } {
  if (power < 0.5) {
    // Green to yellow
    return {
      r: power * 2,
      g: 0.9,
      b: 0.3 * (1 - power * 2),
    };
  } else {
    // Yellow to red
    return {
      r: 0.9,
      g: 0.9 - (power - 0.5) * 1.4,
      b: 0.1,
    };
  }
}
