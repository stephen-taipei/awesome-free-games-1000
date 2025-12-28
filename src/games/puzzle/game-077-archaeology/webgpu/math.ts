/**
 * WebGPU Math Utilities - Archaeology
 * Ancient Ruins / Archaeological Dig Site Theme
 * Game #077
 */

export function dustSwirl(x: number, y: number, time: number): number {
  return Math.sin(x * 0.1 + time) * Math.cos(y * 0.1 - time * 0.7) * 0.5 + 0.5;
}

export function sandfall(y: number, time: number, speed: number = 1): number {
  return (y + time * speed * 50) % 100 / 100;
}

export function stoneTexture(x: number, y: number): number {
  const n1 = Math.sin(x * 0.5) * Math.cos(y * 0.5);
  const n2 = Math.sin(x * 0.2 + y * 0.3) * 0.5;
  return (n1 + n2) * 0.5 + 0.5;
}

export function artifactGlow(time: number, intensity: number = 1): number {
  return (Math.sin(time * 2) * 0.3 + 0.7) * intensity;
}

export function ancientRipple(dist: number, time: number): number {
  return Math.sin(dist * 10 - time * 3) * Math.exp(-dist * 0.5);
}

export function crackPattern(x: number, y: number): number {
  const n = Math.abs(Math.sin(x * 5) + Math.sin(y * 5));
  return n < 0.1 ? 1 : 0;
}

export function erosionNoise(x: number, y: number, time: number): number {
  return (Math.sin(x * 0.3 + time * 0.1) * Math.cos(y * 0.4 - time * 0.05)) * 0.5 + 0.5;
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

export function getArtifactColor(type: string): { r: number; g: number; b: number } {
  const colors: Record<string, { r: number; g: number; b: number }> = {
    vase: { r: 0.85, g: 0.65, b: 0.45 },    // Terra cotta
    coin: { r: 0.85, g: 0.75, b: 0.25 },    // Gold
    bone: { r: 0.95, g: 0.93, b: 0.85 },    // Ivory
    statue: { r: 0.6, g: 0.6, b: 0.55 },    // Stone gray
    jewelry: { r: 0.4, g: 0.8, b: 0.9 },    // Turquoise
  };
  return colors[type] || { r: 0.8, g: 0.7, b: 0.5 };
}

export function getDirtColor(depth: number): { r: number; g: number; b: number } {
  // Lighter near surface, darker deep
  const base = 0.4 - depth * 0.15;
  return {
    r: base + 0.15,
    g: base + 0.05,
    b: base - 0.05,
  };
}
