/**
 * Math Utilities - Mini City
 * Urban / Night City / Modern Architecture Theme
 * Game #071
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

// City light twinkle effect
export function cityLightTwinkle(time: number, offset: number = 0): number {
  const base = Math.sin(time * 3 + offset) * 0.3 + 0.7;
  const flicker = Math.random() > 0.98 ? 0.5 : 1;
  return base * flicker;
}

// Traffic light pulse
export function trafficPulse(time: number, phase: number): number {
  const cycle = ((time + phase) % 3) / 3;
  if (cycle < 0.4) return 1.0; // Green
  if (cycle < 0.5) return 0.8; // Yellow
  return 0.3; // Red
}

// Building grow animation
export function buildingGrow(progress: number): number {
  // Elastic ease out
  const c4 = (2 * Math.PI) / 3;
  if (progress === 0) return 0;
  if (progress === 1) return 1;
  return Math.pow(2, -10 * progress) * Math.sin((progress * 10 - 0.75) * c4) + 1;
}

// Smoke rise pattern
export function smokeRise(time: number, x: number): { dx: number; dy: number } {
  return {
    dx: Math.sin(time * 2 + x) * 10,
    dy: -30 - Math.sin(time * 3 + x * 0.5) * 10,
  };
}

// Neon glow pulse
export function neonPulse(time: number, frequency: number = 1): number {
  const pulse = Math.sin(time * frequency * Math.PI * 2) * 0.3 + 0.7;
  const flicker = Math.random() > 0.95 ? 0.6 : 1;
  return pulse * flicker;
}

// Skyline silhouette generator
export function skylightHeight(x: number, seed: number = 0): number {
  const noise1 = Math.sin(x * 0.1 + seed) * 30;
  const noise2 = Math.sin(x * 0.05 + seed * 2) * 50;
  const noise3 = Math.sin(x * 0.02 + seed * 3) * 20;
  return 100 + noise1 + noise2 + noise3;
}

// Car headlight trail
export function headlightTrail(time: number, length: number): number {
  const pos = (time * 50) % (length * 2);
  return pos < length ? pos : length * 2 - pos;
}

// Population burst animation
export function populationBurst(progress: number): number {
  // Bounce effect
  if (progress < 0.5) {
    return 4 * progress * progress * progress;
  }
  return 1 - Math.pow(-2 * progress + 2, 3) / 2;
}

// Window light pattern
export function windowLightPattern(x: number, y: number, time: number): boolean {
  const hash = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
  const flickerRate = (hash - Math.floor(hash)) * 10;
  return Math.sin(time * flickerRate) > 0;
}

// Construction crane swing
export function craneSwing(time: number): number {
  return Math.sin(time * 0.5) * 15;
}

// Urban color palette
export function urbanColor(type: 'house' | 'shop' | 'park' | 'factory'): { r: number; g: number; b: number } {
  const colors: Record<string, { r: number; g: number; b: number }> = {
    house: { r: 1.0, g: 0.6, b: 0.4 },
    shop: { r: 0.4, g: 0.7, b: 1.0 },
    park: { r: 0.3, g: 0.9, b: 0.5 },
    factory: { r: 0.7, g: 0.7, b: 0.75 },
  };
  return colors[type] || { r: 1, g: 1, b: 1 };
}
