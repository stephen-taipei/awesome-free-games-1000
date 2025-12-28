/**
 * WebGPU Math Utilities - Chain Puzzle
 * Chain / Metal / Industrial Theme
 * Game #093
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

// Metal reflection pattern
export function metalReflection(x: number, y: number, angle: number): number {
  const reflected = Math.sin(x * Math.cos(angle) + y * Math.sin(angle));
  return reflected * 0.5 + 0.5;
}

// Chain link shape function
export function chainShape(x: number, y: number, aspect: number): number {
  // Rounded rectangle with hole
  const rx = Math.abs(x) / aspect;
  const ry = Math.abs(y);
  const outer = smoothstep(1.0, 0.9, Math.max(rx, ry));
  const inner = smoothstep(0.4, 0.5, Math.max(rx * 2, ry * 2));
  return outer * inner;
}

// Industrial pattern
export function industrialGrid(x: number, y: number, scale: number): number {
  const gx = Math.abs(Math.sin(x * scale)) * 0.5;
  const gy = Math.abs(Math.sin(y * scale)) * 0.5;
  return (gx + gy) * 0.5;
}

// Spark trail pattern
export function sparkTrail(progress: number, time: number): number {
  const decay = 1 - progress;
  const flicker = Math.sin(time * 30 + progress * 10) * 0.3 + 0.7;
  return decay * flicker;
}

// Get metallic silver color
export function getMetalColor(shine: number): [number, number, number] {
  const base = 0.6 + shine * 0.3;
  return [base, base * 0.98, base * 0.95];
}

// Get chain gold color
export function getChainColor(intensity: number): [number, number, number] {
  return [
    lerp(0.6, 0.9, intensity),
    lerp(0.5, 0.7, intensity),
    lerp(0.2, 0.4, intensity)
  ];
}

// Get lock red color
export function getLockColor(intensity: number): [number, number, number] {
  return [
    lerp(0.7, 1.0, intensity),
    lerp(0.2, 0.4, intensity),
    lerp(0.2, 0.3, intensity)
  ];
}

// Get unlock green color
export function getUnlockColor(intensity: number): [number, number, number] {
  return [
    lerp(0.2, 0.4, intensity),
    lerp(0.7, 1.0, intensity),
    lerp(0.3, 0.5, intensity)
  ];
}

// Pastel chain colors
export function getPastelColor(index: number): [number, number, number] {
  const colors: [number, number, number][] = [
    [0.46, 0.73, 1.0],   // #74b9ff - blue
    [0.99, 0.47, 0.66],  // #fd79a8 - pink
    [0.33, 0.94, 0.77],  // #55efc4 - green
    [1.0, 0.92, 0.65],   // #ffeaa7 - yellow
    [0.64, 0.61, 0.99],  // #a29bfe - purple
  ];
  return colors[index % colors.length];
}

export function randomRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

export function randomAngle(): number {
  return Math.random() * Math.PI * 2;
}

export function distance(x1: number, y1: number, x2: number, y2: number): number {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}
