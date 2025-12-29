/**
 * WebGPU Math Utilities - Math Maze
 * Digital / Circuit / Mathematical Theme
 * Game #082
 */

export function dataFlow(x: number, y: number, time: number): number {
  const wave1 = Math.sin(x * 0.02 + time * 2) * 0.5;
  const wave2 = Math.cos(y * 0.015 + time * 1.5) * 0.5;
  return (wave1 + wave2 + 1) * 0.5;
}

export function circuitPulse(dist: number, time: number): number {
  const pulse = Math.sin(dist * 0.5 - time * 3);
  return Math.max(0, pulse) * Math.exp(-dist * 0.1);
}

export function digitFlicker(time: number, seed: number): number {
  const flicker = Math.sin(time * 10 + seed * 100);
  return flicker > 0.8 ? 1 : 0.7;
}

export function operatorGlow(type: number, time: number): number {
  const phase = type * Math.PI * 0.5;
  return Math.sin(time * 2 + phase) * 0.3 + 0.7;
}

export function gridLine(pos: number, spacing: number): number {
  const mod = pos % spacing;
  return mod < 1 ? 1 : 0;
}

export function equationSpark(progress: number): number {
  return Math.sin(progress * Math.PI) * (1 - progress * 0.5);
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

export function getOperatorColor(operator: number): { r: number; g: number; b: number } {
  const colors = [
    { r: 0.0, g: 0.85, b: 0.58 },  // + Green
    { r: 0.85, g: 0.44, b: 0.33 }, // - Red
    { r: 0.45, g: 0.73, b: 1.0 },  // * Blue
    { r: 0.99, g: 0.80, b: 0.43 }, // / Yellow
    { r: 0.55, g: 0.27, b: 0.68 }, // Purple (result)
  ];
  return colors[operator % colors.length];
}

export function getDigitColor(digit: number): { r: number; g: number; b: number } {
  const hue = (digit / 10) * 0.3 + 0.5; // Cyan to purple range
  return {
    r: 0.3 + hue * 0.4,
    g: 0.7 + Math.sin(hue * Math.PI) * 0.3,
    b: 0.9,
  };
}

export function getNeonColor(index: number): { r: number; g: number; b: number } {
  const neons = [
    { r: 0.0, g: 1.0, b: 1.0 },   // Cyan
    { r: 0.5, g: 0.0, b: 1.0 },   // Purple
    { r: 0.0, g: 1.0, b: 0.5 },   // Green
    { r: 1.0, g: 0.5, b: 0.0 },   // Orange
    { r: 1.0, g: 0.0, b: 0.5 },   // Pink
  ];
  return neons[index % neons.length];
}
