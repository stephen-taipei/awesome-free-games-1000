/**
 * WebGPU Math Utilities - Pyramid Puzzle
 * Ancient Egypt / Desert Mystique Theme
 * Game #105
 */

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

// Sand dune wave pattern
export function sandDune(x: number, y: number, time: number): number {
  const wave1 = Math.sin(x * 0.02 + time * 0.3) * 0.5;
  const wave2 = Math.sin(x * 0.01 + y * 0.015 + time * 0.2) * 0.3;
  const wave3 = Math.sin(x * 0.005 + time * 0.1) * 0.2;
  return wave1 + wave2 + wave3;
}

// Star twinkle effect
export function starTwinkle(time: number, seed: number): number {
  const phase = seed * 6.283;
  const speed = 1 + (seed * 3);
  return 0.5 + 0.5 * Math.sin(time * speed + phase);
}

// Hieroglyph pattern
export function hieroglyphPattern(x: number, y: number, scale: number = 30): number {
  const px = Math.floor(x / scale);
  const py = Math.floor(y / scale);
  const hash = Math.sin(px * 12.9898 + py * 78.233) * 43758.5453;
  return (hash - Math.floor(hash)) > 0.7 ? 1 : 0;
}

// Moonlight glow
export function moonGlow(x: number, y: number, moonX: number, moonY: number, radius: number): number {
  const dist = Math.sqrt((x - moonX) ** 2 + (y - moonY) ** 2);
  return Math.exp(-dist / (radius * 2));
}

// Sacred golden energy pulse
export function sacredPulse(time: number, centerDistance: number): number {
  const wave = Math.sin(time * 3 - centerDistance * 0.05);
  const decay = Math.exp(-centerDistance * 0.01);
  return Math.max(0, wave) * decay;
}

// Desert wind drift
export function windDrift(time: number, seed: number): { x: number; y: number } {
  const t = time + seed;
  return {
    x: Math.sin(t * 0.8) * 30 + Math.sin(t * 1.5) * 15,
    y: Math.cos(t * 0.6) * 5 + Math.sin(t * 1.2) * 3
  };
}

// Pyramid ray (light beam)
export function pyramidRay(x: number, y: number, apexX: number, apexY: number, angle: number): number {
  const dx = x - apexX;
  const dy = y - apexY;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const currentAngle = Math.atan2(dy, dx);
  const angleDiff = Math.abs(currentAngle - angle);
  const beam = Math.exp(-angleDiff * 10);
  return beam * Math.exp(-dist * 0.005);
}

// Triangle flip animation
export function flipTransform(progress: number): { scale: number; rotation: number } {
  // Flip animation: scale x to 0, then back, while rotating
  const halfProgress = progress < 0.5 ? progress * 2 : 2 - progress * 2;
  return {
    scale: 1 - Math.sin(progress * Math.PI) * 0.3,
    rotation: progress * Math.PI
  };
}

// Scarab movement pattern
export function scarabPath(time: number, index: number): { x: number; y: number } {
  const phase = index * Math.PI * 0.5;
  const t = time + phase;
  return {
    x: Math.sin(t * 2) * 50 + Math.cos(t * 0.7) * 30,
    y: Math.cos(t * 1.5) * 40 + Math.sin(t * 0.5) * 20
  };
}

// Eye of Horus glow pattern
export function horusEye(x: number, y: number, centerX: number, centerY: number): number {
  const dx = x - centerX;
  const dy = y - centerY;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const angle = Math.atan2(dy, dx);
  const eyeShape = Math.exp(-dist * 0.1) * (1 + 0.3 * Math.cos(angle * 2));
  return clamp(eyeShape, 0, 1);
}
