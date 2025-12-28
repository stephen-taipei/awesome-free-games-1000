/**
 * Math Utilities - Plant Growth
 * Botanical Garden / Lush Nature / Verdant Theme
 * Game #067
 */

// Leaf flutter in wind
export function leafFlutter(time: number, phase: number = 0): number {
  const primary = Math.sin(time * 2 + phase) * 0.3;
  const secondary = Math.sin(time * 5 + phase * 2) * 0.1;
  return primary + secondary;
}

// Leaf fall trajectory
export function leafFall(
  startY: number,
  time: number,
  swayAmount: number = 30
): { x: number; y: number; rotation: number } {
  const fallSpeed = 40;
  const y = startY + time * fallSpeed;
  const x = Math.sin(time * 2) * swayAmount + Math.sin(time * 0.7) * swayAmount * 0.5;
  const rotation = Math.sin(time * 3) * 0.5;
  return { x, y, rotation };
}

// Pollen drift
export function pollenDrift(time: number, seed: number): { dx: number; dy: number } {
  const angle = seed * Math.PI * 2;
  const drift = Math.sin(time * 0.5 + seed * 10);
  return {
    dx: Math.cos(angle + drift * 0.3) * 0.5,
    dy: Math.sin(angle + drift * 0.3) * 0.3 - 0.2,
  };
}

// Vine growth curve (bezier-like)
export function vineGrowth(t: number, bendAmount: number = 0.2): { x: number; y: number } {
  const curve = Math.sin(t * Math.PI) * bendAmount;
  return {
    x: curve,
    y: t,
  };
}

// Water droplet ripple
export function waterRipple(time: number, radius: number): number {
  const wave = Math.sin(time * 8 - radius * 2) * 0.5 + 0.5;
  const decay = Math.exp(-radius * 0.3);
  return wave * decay;
}

// Sunbeam intensity
export function sunbeamIntensity(y: number, time: number): number {
  const flicker = Math.sin(time * 3) * 0.1 + 0.9;
  const gradient = 1 - y * 0.5;
  return Math.max(0, gradient * flicker);
}

// Flower bloom scale
export function bloomScale(progress: number): number {
  // Eased scale animation
  const eased = 1 - Math.pow(1 - progress, 3);
  // Slight bounce at end
  const bounce = progress > 0.8 ? Math.sin((progress - 0.8) * 25) * 0.1 * (1 - progress) / 0.2 : 0;
  return eased + bounce;
}

// Petal unfurl angle
export function petalUnfurl(progress: number, petalIndex: number, totalPetals: number): number {
  const baseAngle = (petalIndex / totalPetals) * Math.PI * 2;
  const unfurlDelay = petalIndex * 0.1;
  const adjustedProgress = Math.max(0, Math.min(1, (progress - unfurlDelay) / (1 - unfurlDelay)));
  const openAngle = adjustedProgress * 0.3;
  return baseAngle + openAngle;
}

// Growth spurt animation
export function growthSpurt(progress: number): number {
  // Fast start, slow end (organic growth feel)
  return 1 - Math.pow(1 - progress, 2);
}

// Dewdrop shimmer
export function dewdropShimmer(time: number, position: number): number {
  return Math.sin(time * 4 + position * 5) * 0.3 + 0.7;
}

// Grass sway
export function grassSway(time: number, x: number): number {
  const wave1 = Math.sin(time * 1.5 + x * 0.1) * 0.15;
  const wave2 = Math.sin(time * 2.3 + x * 0.15) * 0.08;
  return wave1 + wave2;
}

// Color interpolation for seasons/growth
export function lerpColor(
  color1: { r: number; g: number; b: number },
  color2: { r: number; g: number; b: number },
  t: number
): { r: number; g: number; b: number } {
  return {
    r: color1.r + (color2.r - color1.r) * t,
    g: color1.g + (color2.g - color1.g) * t,
    b: color1.b + (color2.b - color1.b) * t,
  };
}

// Leaf color with variation
export function leafColor(variation: number = 0): { r: number; g: number; b: number } {
  return {
    r: 0.2 + variation * 0.1,
    g: 0.7 + variation * 0.15,
    b: 0.2 + variation * 0.05,
  };
}

// Flower petal color
export function petalColor(hue: number): { r: number; g: number; b: number } {
  // HSL to RGB approximation for flower colors
  const h = hue * 6;
  const x = 1 - Math.abs(h % 2 - 1);
  let r = 0, g = 0, b = 0;

  if (h < 1) { r = 1; g = x; }
  else if (h < 2) { r = x; g = 1; }
  else if (h < 3) { g = 1; b = x; }
  else if (h < 4) { g = x; b = 1; }
  else if (h < 5) { r = x; b = 1; }
  else { r = 1; b = x; }

  // Lighten for pastel flower colors
  return {
    r: 0.5 + r * 0.5,
    g: 0.5 + g * 0.5,
    b: 0.5 + b * 0.5,
  };
}

// Utility functions
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function randomRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

// Noise for organic patterns
export function noise2D(x: number, y: number): number {
  const n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
  return n - Math.floor(n);
}

export function fbm(x: number, y: number, octaves: number = 4): number {
  let value = 0;
  let amplitude = 0.5;
  let frequency = 1;

  for (let i = 0; i < octaves; i++) {
    value += amplitude * noise2D(x * frequency, y * frequency);
    amplitude *= 0.5;
    frequency *= 2;
  }

  return value;
}
