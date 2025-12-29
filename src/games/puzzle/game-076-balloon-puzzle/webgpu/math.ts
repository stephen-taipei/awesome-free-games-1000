/**
 * WebGPU Math Utilities - Balloon Puzzle
 * Sky / Balloon Physics Theme
 * Game #076
 */

export function floatWave(time: number, frequency: number = 1, amplitude: number = 1): number {
  return Math.sin(time * frequency) * amplitude;
}

export function cloudDrift(x: number, time: number, speed: number = 0.5): number {
  return Math.sin(x * 0.01 + time * speed) * 20 + Math.sin(x * 0.02 - time * 0.3) * 10;
}

export function windFlow(y: number, time: number): number {
  return Math.sin(y * 0.05 + time * 2) * Math.cos(time * 0.7);
}

export function balloonBounce(time: number, elasticity: number = 0.8): number {
  const t = time % 2;
  return Math.abs(Math.sin(t * Math.PI)) * elasticity;
}

export function airPressure(x: number, y: number, time: number): number {
  return (Math.sin(x * 0.02 + time) + Math.cos(y * 0.015 - time * 0.5)) * 0.5 + 0.5;
}

export function skyGradient(y: number, height: number): { r: number; g: number; b: number } {
  const t = y / height;
  // Sky blue to light cyan
  return {
    r: 0.53 + t * 0.35,
    g: 0.81 + t * 0.16,
    b: 0.92 + t * 0.06,
  };
}

export function windTrail(t: number): number {
  return Math.exp(-t * 2) * Math.sin(t * 10);
}

export function buoyancyWave(time: number): number {
  return Math.sin(time * 1.5) * 0.3 + Math.sin(time * 2.3) * 0.2;
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

export function randomRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

export function getBalloonColor(colorIndex: number): { r: number; g: number; b: number } {
  const colors = [
    { r: 1.0, g: 0.42, b: 0.42 },   // Red balloon
    { r: 0.35, g: 0.78, b: 1.0 },   // Sky blue balloon
    { r: 0.55, g: 0.89, b: 0.47 },  // Green balloon
    { r: 1.0, g: 0.85, b: 0.35 },   // Yellow balloon
    { r: 0.8, g: 0.5, b: 0.9 },     // Purple balloon
    { r: 1.0, g: 0.6, b: 0.3 },     // Orange balloon
  ];
  return colors[colorIndex % colors.length];
}
