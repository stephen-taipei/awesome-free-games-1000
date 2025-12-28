/**
 * Math Utilities - Wind Direction
 * Weather / Atmospheric Theme
 * Game #111
 */

// Wind flow simulation using Perlin-like noise
export function windNoise(x: number, y: number, t: number): { dx: number; dy: number } {
  const angle = Math.sin(x * 0.1 + t) * Math.cos(y * 0.1 + t * 0.7) * Math.PI;
  const magnitude = 0.5 + Math.sin(x * 0.05 + y * 0.05 + t * 0.5) * 0.5;
  return {
    dx: Math.cos(angle) * magnitude,
    dy: Math.sin(angle) * magnitude,
  };
}

// Gust strength oscillation
export function gustStrength(t: number, frequency: number, baseStrength: number): number {
  const gust = Math.sin(t * frequency) * Math.sin(t * frequency * 1.7);
  return baseStrength * (0.5 + Math.abs(gust) * 0.5);
}

// Leaf flutter animation
export function leafFlutter(t: number, frequency: number): { rotation: number; scale: number } {
  const rotation = Math.sin(t * frequency) * 0.3 + Math.sin(t * frequency * 2.3) * 0.1;
  const scale = 1 + Math.sin(t * frequency * 1.5) * 0.1;
  return { rotation, scale };
}

// Cloud drift pattern
export function cloudDrift(t: number, seed: number): { x: number; y: number } {
  const x = Math.sin(t * 0.3 + seed) * 0.5 + Math.cos(t * 0.2 + seed * 2) * 0.3;
  const y = Math.sin(t * 0.15 + seed * 1.5) * 0.2;
  return { x, y };
}

// Arrow bounce animation
export function arrowBounce(t: number): number {
  return Math.sin(t * 4) * 0.1;
}

// Wind streak length based on speed
export function streakLength(speed: number, maxLength: number): number {
  return Math.min(speed * 0.5, maxLength);
}

// Turbulence intensity
export function turbulence(x: number, y: number, t: number, octaves: number): number {
  let value = 0;
  let amplitude = 1;
  let frequency = 1;
  let maxValue = 0;

  for (let i = 0; i < octaves; i++) {
    value += Math.sin(x * frequency * 0.1 + t) * Math.cos(y * frequency * 0.1 + t * 1.3) * amplitude;
    maxValue += amplitude;
    amplitude *= 0.5;
    frequency *= 2;
  }

  return value / maxValue;
}

// Wind direction to angle
export function directionToAngle(direction: string): number {
  const directions: Record<string, number> = {
    'N': -Math.PI / 2,
    'NE': -Math.PI / 4,
    'E': 0,
    'SE': Math.PI / 4,
    'S': Math.PI / 2,
    'SW': (3 * Math.PI) / 4,
    'W': Math.PI,
    'NW': (-3 * Math.PI) / 4,
  };
  return directions[direction] ?? 0;
}

// Atmospheric pressure visualization
export function pressureGradient(x: number, y: number, centerX: number, centerY: number): number {
  const dist = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
  return Math.exp(-dist * 0.01);
}

// Coriolis-like deflection
export function coriolisDeflection(velocity: { x: number; y: number }, latitude: number): { x: number; y: number } {
  const factor = Math.sin(latitude) * 0.1;
  return {
    x: velocity.x - velocity.y * factor,
    y: velocity.y + velocity.x * factor,
  };
}

// Swirl pattern for vortex
export function swirlPattern(x: number, y: number, cx: number, cy: number, t: number): number {
  const dx = x - cx;
  const dy = y - cy;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const angle = Math.atan2(dy, dx);
  return Math.sin(angle * 4 + dist * 0.1 - t * 2) * Math.exp(-dist * 0.02);
}

// Breeze wave pattern
export function breezeWave(x: number, t: number, wavelength: number): number {
  return Math.sin((x / wavelength) * Math.PI * 2 + t) * 0.5 + 0.5;
}

// Wind chill factor (visual intensity)
export function windChillVisual(speed: number, temperature: number): number {
  // Higher speed = more visible wind effects
  return Math.min(1, speed * 0.1 + (1 - temperature) * 0.3);
}
