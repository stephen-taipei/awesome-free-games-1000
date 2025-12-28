/**
 * WebGPU Math Utilities - Floor Puzzle
 * Urban Building / Neon Tower Theme
 * Game #099
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

export function easeOutElastic(t: number): number {
  const c4 = (2 * Math.PI) / 3;
  return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
}

export function easeOutQuad(t: number): number {
  return 1 - (1 - t) * (1 - t);
}

export function elevatorMotion(t: number): number {
  // Smooth elevator movement with acceleration/deceleration
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

export function windowFlicker(x: number, y: number, time: number): number {
  // Random window lights flickering
  const seed = Math.floor(x * 7.3 + y * 11.7);
  const flickerSpeed = 0.5 + (seed % 10) * 0.1;
  const phase = seed * 0.7;
  return Math.sin(time * flickerSpeed + phase) * 0.5 + 0.5;
}

export function neonGlow(t: number): number {
  // Pulsing neon effect
  return 0.7 + Math.sin(t * 3) * 0.15 + Math.sin(t * 7) * 0.05;
}

export function buildingPattern(x: number, y: number): number {
  // Grid pattern for building structure
  const gridX = Math.abs(Math.sin(x * 0.1)) > 0.9 ? 1 : 0;
  const gridY = Math.abs(Math.sin(y * 0.1)) > 0.9 ? 1 : 0;
  return Math.max(gridX, gridY);
}

// Urban theme colors
export function getBuildingGray(): [number, number, number] {
  return [0.2, 0.25, 0.32]; // Steel blue gray
}

export function getElevatorOrange(): [number, number, number] {
  return [0.953, 0.612, 0.071]; // #f39c12 Elevator orange
}

export function getPassengerBlue(): [number, number, number] {
  return [0.204, 0.596, 0.859]; // #3498db Passenger blue
}

export function getPassengerGreen(): [number, number, number] {
  return [0.180, 0.800, 0.443]; // #2ecc71 Riding green
}

export function getWindowYellow(): [number, number, number] {
  return [1.0, 0.85, 0.4]; // Warm window light
}

export function getNeonCyan(): [number, number, number] {
  return [0.0, 0.85, 1.0]; // Neon cyan accent
}

export function getNightSky(): [number, number, number] {
  return [0.06, 0.08, 0.12]; // Dark night sky
}
