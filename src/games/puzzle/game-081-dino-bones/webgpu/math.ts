/**
 * WebGPU Math Utilities - Dino Bones
 * Prehistoric / Excavation Site Theme
 * Game #081
 */

export function dustDrift(x: number, y: number, time: number): number {
  const wave1 = Math.sin(x * 0.05 + time) * 0.5;
  const wave2 = Math.cos(y * 0.03 - time * 0.7) * 0.5;
  return (wave1 + wave2 + 1) * 0.5;
}

export function sandWave(y: number, time: number): number {
  return Math.sin(y * 0.1 + time * 0.5) * 0.05;
}

export function fossilGlow(dist: number, time: number): number {
  const pulse = Math.sin(time * 2) * 0.3 + 0.7;
  return Math.exp(-dist * 0.5) * pulse;
}

export function excavationShake(time: number): number {
  return Math.sin(time * 30) * Math.exp(-time * 5) * 0.02;
}

export function boneCrack(progress: number): number {
  return Math.sin(progress * Math.PI * 3) * (1 - progress);
}

export function dirtTexture(x: number, y: number): number {
  const noise = Math.sin(x * 20) * Math.sin(y * 20) * 0.1;
  return 0.9 + noise;
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

export function getEarthColor(index: number): { r: number; g: number; b: number } {
  const colors = [
    { r: 0.83, g: 0.65, b: 0.45 },  // Sand
    { r: 0.55, g: 0.41, b: 0.08 },  // Brown
    { r: 0.72, g: 0.53, b: 0.35 },  // Terracotta
    { r: 0.65, g: 0.50, b: 0.30 },  // Earth
    { r: 0.85, g: 0.75, b: 0.55 },  // Bone white
  ];
  return colors[index % colors.length];
}

export function getBoneColor(): { r: number; g: number; b: number } {
  return { r: 0.95, g: 0.90, b: 0.80 };
}

export function getDirtColor(): { r: number; g: number; b: number } {
  return { r: 0.55, g: 0.41, b: 0.20 };
}
