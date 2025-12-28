/**
 * Math Utilities - Portal Puzzle
 * Portal / Dimensional Theme
 * Game #115
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

// Portal vortex motion
export function vortexMotion(t: number, radius: number, speed: number): { x: number; y: number } {
  const angle = t * speed;
  const spiralRadius = radius * (1 - t * 0.3);
  return {
    x: Math.cos(angle) * spiralRadius,
    y: Math.sin(angle) * spiralRadius,
  };
}

// Dimensional warp effect
export function dimensionalWarp(x: number, y: number, time: number): { dx: number; dy: number } {
  const warp = Math.sin(x * 0.05 + time) * Math.cos(y * 0.05 - time * 0.7);
  return {
    dx: warp * 5,
    dy: warp * 5 * Math.cos(time * 0.5),
  };
}

// Portal pulse
export function portalPulse(time: number, frequency: number = 2): number {
  return 0.7 + 0.3 * Math.sin(time * frequency * Math.PI);
}

// Teleport flash
export function teleportFlash(t: number): number {
  if (t < 0.1) return t / 0.1;
  if (t < 0.3) return 1;
  return Math.max(0, 1 - (t - 0.3) / 0.7);
}

// Orange portal color
export function orangePortalColor(t: number): { r: number; g: number; b: number } {
  const pulse = 0.8 + 0.2 * Math.sin(t * 5);
  return {
    r: 1.0 * pulse,
    g: 0.42 * pulse,
    b: 0.21 * pulse,
  };
}

// Blue portal color
export function bluePortalColor(t: number): { r: number; g: number; b: number } {
  const pulse = 0.8 + 0.2 * Math.sin(t * 5 + Math.PI);
  return {
    r: 0.0 * pulse,
    g: 0.71 * pulse,
    b: 0.85 * pulse,
  };
}

// Energy arc between portals
export function energyArc(t: number, startX: number, startY: number, endX: number, endY: number): { x: number; y: number } {
  const dx = endX - startX;
  const dy = endY - startY;
  const midX = (startX + endX) / 2;
  const midY = (startY + endY) / 2;

  // Perpendicular offset
  const length = Math.sqrt(dx * dx + dy * dy);
  const perpX = -dy / length;
  const perpY = dx / length;

  const arcHeight = length * 0.3 * Math.sin(t * 3);

  return {
    x: midX + perpX * arcHeight,
    y: midY + perpY * arcHeight,
  };
}

// Rift distortion
export function riftDistortion(x: number, y: number, time: number): number {
  return noise2D(x * 0.03 + time * 0.5, y * 0.03 - time * 0.3) * 0.5;
}

// Warp tunnel effect
export function warpTunnel(dist: number, time: number): number {
  return Math.sin(dist * 10 - time * 5) * Math.exp(-dist * 2);
}

// Particle spiral for teleport
export function teleportSpiral(t: number, index: number, total: number): { x: number; y: number } {
  const angle = (index / total) * Math.PI * 2 + t * 10;
  const radius = 50 * (1 - t);
  return {
    x: Math.cos(angle) * radius,
    y: Math.sin(angle) * radius,
  };
}

// Linear interpolation
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

// Clamp value
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

// Ease in-out cubic
export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

// Distance between two points
export function distance(x1: number, y1: number, x2: number, y2: number): number {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

// Dimensional flicker
export function dimensionalFlicker(time: number, seed: number): number {
  const base = Math.sin(time * 3 + seed) * 0.5 + 0.5;
  const rapid = Math.sin(time * 30 + seed * 2) * 0.1;
  return clamp(base + rapid, 0, 1);
}

// Portal connection line
export function connectionLine(t: number, x1: number, y1: number, x2: number, y2: number): { x: number; y: number } {
  const wave = Math.sin(t * 10) * 10;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const perpX = -dy / Math.sqrt(dx * dx + dy * dy);
  const perpY = dx / Math.sqrt(dx * dx + dy * dy);

  return {
    x: lerp(x1, x2, t) + perpX * wave * Math.sin(t * Math.PI),
    y: lerp(y1, y2, t) + perpY * wave * Math.sin(t * Math.PI),
  };
}
