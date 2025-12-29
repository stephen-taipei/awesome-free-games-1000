/**
 * Math Utilities - Mirror World
 * Crystal / Reflection / Dimensional Theme
 * Game #068
 */

export function randomRange(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export function easeInOutQuad(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

// Mirror reflection oscillation
export function mirrorPulse(time: number, phase: number = 0): number {
  return Math.sin(time * 3 + phase) * 0.5 + 0.5;
}

// Crystal shimmer effect
export function crystalShimmer(time: number, seed: number = 0): number {
  const t = time * 2 + seed;
  return (Math.sin(t) + Math.sin(t * 1.3) + Math.sin(t * 1.7)) / 3 * 0.5 + 0.5;
}

// Light refraction through crystal
export function refractionAngle(inAngle: number, refractiveIndex: number = 1.5): number {
  const sinAngle = Math.sin(inAngle);
  const sinRefracted = sinAngle / refractiveIndex;
  return Math.asin(clamp(sinRefracted, -1, 1));
}

// Dimensional rift wave
export function riftWave(x: number, y: number, time: number): number {
  const dist = Math.sqrt(x * x + y * y);
  return Math.sin(dist * 0.1 - time * 2) * Math.exp(-dist * 0.01);
}

// Synchronized pulse for mirror elements
export function syncPulse(time: number, offset: number = 0): { left: number; right: number } {
  const base = Math.sin(time * 2 + offset);
  return {
    left: base * 0.5 + 0.5,
    right: -base * 0.5 + 0.5, // Opposite phase
  };
}

// Prismatic color shift
export function prismColor(progress: number): { r: number; g: number; b: number } {
  const hue = progress * 360;
  // HSL to RGB conversion
  const c = 1;
  const x = c * (1 - Math.abs((hue / 60) % 2 - 1));
  const m = 0;

  let r = 0, g = 0, b = 0;
  if (hue < 60) { r = c; g = x; b = 0; }
  else if (hue < 120) { r = x; g = c; b = 0; }
  else if (hue < 180) { r = 0; g = c; b = x; }
  else if (hue < 240) { r = 0; g = x; b = c; }
  else if (hue < 300) { r = x; g = 0; b = c; }
  else { r = c; g = 0; b = x; }

  return { r: r + m, g: g + m, b: b + m };
}

// Mirror shard rotation
export function shardRotation(time: number, seed: number): number {
  return time * (1 + seed * 0.5) + seed * Math.PI * 2;
}

// Dimensional portal spiral
export function portalSpiral(angle: number, time: number, speed: number = 1): { x: number; y: number } {
  const spiralAngle = angle + time * speed;
  const radius = 0.5 + Math.sin(spiralAngle * 3) * 0.2;
  return {
    x: Math.cos(spiralAngle) * radius,
    y: Math.sin(spiralAngle) * radius,
  };
}

// Light ray trajectory
export function lightRay(
  startX: number,
  startY: number,
  angle: number,
  distance: number,
  time: number
): { x: number; y: number; alpha: number } {
  const flickerIntensity = 0.8 + Math.sin(time * 10) * 0.2;
  return {
    x: startX + Math.cos(angle) * distance,
    y: startY + Math.sin(angle) * distance,
    alpha: flickerIntensity * (1 - distance / 100),
  };
}

// Reflection bounce
export function reflectionBounce(progress: number): number {
  if (progress < 0.5) {
    return progress * 2;
  }
  return 1 - (progress - 0.5) * 2;
}

// Glass distortion
export function glassDistortion(x: number, y: number, time: number): { dx: number; dy: number } {
  const frequency = 0.05;
  const amplitude = 3;
  return {
    dx: Math.sin(y * frequency + time * 2) * amplitude,
    dy: Math.cos(x * frequency + time * 2) * amplitude,
  };
}
